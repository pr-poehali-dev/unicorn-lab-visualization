import json
import os
import psycopg2
from typing import Dict, Any, List

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Get all participants from database
    Args: event with optional query parameters for filtering
    Returns: HTTP response with participants array
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    try:
        # Get query parameters
        params = event.get('queryStringParameters', {}) or {}
        search_query = params.get('search', '')
        cluster_filter = params.get('cluster', '')
        
        # Connect to database with schema
        db_url = os.environ['DATABASE_URL']
        if '?' in db_url:
            db_url += '&options=-csearch_path%3Dt_p95295728_unicorn_lab_visualiz'
        else:
            db_url += '?options=-csearch_path%3Dt_p95295728_unicorn_lab_visualiz'
        
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # Build query
        query = """
            SELECT e.id, e.telegram_id, e.username, e.name, e.role, e.cluster, 
                   e.description, e.post_url, e.goal, e.created_at, e.updated_at,
                   COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') as tags
            FROM entrepreneurs e
            LEFT JOIN entrepreneur_tags et ON e.id = et.entrepreneur_id
            LEFT JOIN tags t ON et.tag_id = t.id
            WHERE 1=1
        """
        query_params = []
        
        if search_query:
            query += """ AND (LOWER(e.name) LIKE LOWER(%s) OR EXISTS (
                SELECT 1 FROM entrepreneur_tags et2
                JOIN tags t2 ON et2.tag_id = t2.id
                WHERE et2.entrepreneur_id = e.id AND LOWER(t2.name) = LOWER(%s)
            ))"""
            query_params.extend([f'%{search_query}%', search_query])
        
        if cluster_filter and cluster_filter != 'Все':
            query += " AND e.cluster = %s"
            query_params.append(cluster_filter)
        
        query += " GROUP BY e.id, e.telegram_id, e.username, e.name, e.role, e.cluster, e.description, e.post_url, e.goal, e.created_at, e.updated_at"
        query += " ORDER BY e.name"
        
        # Execute query
        cur.execute(query, query_params)
        rows = cur.fetchall()
        
        # Format results
        participants = []
        for row in rows:
            participants.append({
                'id': row[0],
                'telegram_id': row[1],
                'username': row[2],
                'name': row[3],
                'role': row[4],
                'cluster': row[5],
                'description': row[6],
                'tags': row[11] if row[11] != '{}' else [],
                'post_url': row[7],
                'goal': row[8],
                'created_at': row[9].isoformat() if row[9] else None,
                'updated_at': row[10].isoformat() if row[10] else None
            })
        
        # Get connections
        cur.execute("""
            SELECT source_id, target_id, connection_type, strength
            FROM connections
        """)
        connections = []
        for row in cur.fetchall():
            connections.append({
                'source': row[0],
                'target': row[1],
                'type': row[2],
                'strength': row[3]
            })
        
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'participants': participants,
                'connections': connections,
                'total': len(participants)
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Server error: {str(e)}'})
        }