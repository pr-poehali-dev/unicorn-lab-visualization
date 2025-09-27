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
        
        # Connect to database
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        # Build query
        query = """
            SELECT id, telegram_id, username, name, role, cluster, description, tags, created_at, updated_at
            FROM entrepreneurs
            WHERE 1=1
        """
        query_params = []
        
        if search_query:
            query += " AND (LOWER(name) LIKE LOWER(%s) OR %s = ANY(tags))"
            query_params.extend([f'%{search_query}%', search_query])
        
        if cluster_filter and cluster_filter != 'Все':
            query += " AND cluster = %s"
            query_params.append(cluster_filter)
        
        query += " ORDER BY name"
        
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
                'tags': row[7] or [],
                'created_at': row[8].isoformat() if row[8] else None,
                'updated_at': row[9].isoformat() if row[9] else None
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