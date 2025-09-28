import json
import os
import psycopg2
from typing import Dict, Any, List, Tuple
from collections import defaultdict

def calculate_connection_strength(tags1: List[str], tags2: List[str], tag_connections: Dict[Tuple[str, str], float]) -> float:
    """Calculate connection strength between two participants based on their tags"""
    if not tags1 or not tags2:
        return 0.0
    
    total_weight = 0.0
    connection_count = 0
    
    for tag1 in tags1:
        for tag2 in tags2:
            # Same tag = perfect match
            if tag1 == tag2:
                total_weight += 1.0
                connection_count += 1
            else:
                # Check tag_connections in both directions
                weight = tag_connections.get((tag1, tag2), 0.0)
                if weight == 0.0:
                    weight = tag_connections.get((tag2, tag1), 0.0)
                
                if weight > 0:
                    total_weight += weight
                    connection_count += 1
    
    # Average weight of all connections
    return total_weight / connection_count if connection_count > 0 else 0.0

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Get all participants with dynamically calculated connections
    Args: event with optional query parameters for filtering
    Returns: HTTP response with participants and their connections
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
    
    conn = None
    cur = None
    
    try:
        # Get query parameters
        params = event.get('queryStringParameters', {}) or {}
        search_query = params.get('search', '')
        cluster_filter = params.get('cluster', '')
        
        # Connect to database
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        # Debug: check current schema
        cur.execute("SELECT current_schema()")
        print(f"Current schema: {cur.fetchone()[0]}")
        
        # Build query with full schema names
        query = """
            SELECT e.id, e.telegram_id, e.username, e.name, e.role, e.cluster, e.cluster_id,
                   e.description, e.post_url, e.goal, e.emoji, e.created_at, e.updated_at,
                   COALESCE(array_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') as tags
            FROM t_p95295728_unicorn_lab_visualiz.entrepreneurs e
            LEFT JOIN t_p95295728_unicorn_lab_visualiz.entrepreneur_tags et ON e.id = et.entrepreneur_id
            LEFT JOIN t_p95295728_unicorn_lab_visualiz.tags t ON et.tag_id = t.id
            WHERE 1=1
        """
        query_params = []
        
        if search_query:
            query += """ AND (LOWER(e.name) LIKE LOWER(%s) OR EXISTS (
                SELECT 1 FROM t_p95295728_unicorn_lab_visualiz.entrepreneur_tags et2
                JOIN t_p95295728_unicorn_lab_visualiz.tags t2 ON et2.tag_id = t2.id
                WHERE et2.entrepreneur_id = e.id AND LOWER(t2.name) = LOWER(%s)
            ))"""
            query_params.extend([f'%{search_query}%', search_query])
        
        if cluster_filter and cluster_filter != 'Все':
            query += " AND e.cluster = %s"
            query_params.append(cluster_filter)
        
        query += " GROUP BY e.id, e.telegram_id, e.username, e.name, e.role, e.cluster, e.cluster_id, e.description, e.post_url, e.goal, e.emoji, e.created_at, e.updated_at"
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
                'cluster_id': row[6],
                'description': row[7],
                'tags': row[13] if row[13] != '{}' else [],
                'post_url': row[8],
                'goal': row[9],
                'emoji': row[10] or '😊',
                'created_at': row[11].isoformat() if row[11] else None,
                'updated_at': row[12].isoformat() if row[12] else None
            })
        
        # Load tag connections for dynamic calculation
        cur.execute("""
            SELECT t1.name, t2.name, tc.strength
            FROM t_p95295728_unicorn_lab_visualiz.tag_connections tc
            JOIN t_p95295728_unicorn_lab_visualiz.tags t1 ON tc.tag1_id = t1.id
            JOIN t_p95295728_unicorn_lab_visualiz.tags t2 ON tc.tag2_id = t2.id
            WHERE tc.strength > 0
        """)
        tag_connections = {}
        for row in cur.fetchall():
            tag_connections[(row[0], row[1])] = float(row[2])
        
        # Calculate connections dynamically
        connections = []
        min_strength = 0.3  # Minimum connection strength to include
        
        # For each participant, calculate connections to others
        for i, p1 in enumerate(participants):
            p1_tags = p1['tags']
            if not p1_tags:
                continue
                
            # Store connections for this participant
            participant_connections = []
            
            for j, p2 in enumerate(participants):
                if i >= j:  # Avoid duplicates and self-connections
                    continue
                    
                p2_tags = p2['tags']
                if not p2_tags:
                    continue
                
                # Calculate connection strength
                strength = calculate_connection_strength(p1_tags, p2_tags, tag_connections)
                
                if strength >= min_strength:
                    participant_connections.append({
                        'target_id': p2['id'],
                        'strength': strength
                    })
            
            # Sort by strength and take top connections
            participant_connections.sort(key=lambda x: x['strength'], reverse=True)
            
            # Add to global connections list (limit to top 10 per participant)
            for pc in participant_connections[:10]:
                connections.append({
                    'source': p1['id'],
                    'target': pc['target_id'],
                    'type': 'common_interests',
                    'strength': round(pc['strength'], 2)
                })
        
        if cur:
            cur.close()
        if conn:
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
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error: {str(e)}")
        print(f"Traceback: {error_trace}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Server error: {str(e)}'})
        }