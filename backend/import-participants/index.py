import json
import os
import psycopg2
from typing import Dict, Any, List
from datetime import datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Import participants data from Telegram parser
    Args: event with participants array in body
    Returns: HTTP response with import statistics
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    try:
        # Parse request body
        body_data = json.loads(event.get('body', '{}'))
        participants = body_data.get('participants', [])
        
        if not participants:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No participants provided'})
            }
        
        # Connect to database
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor()
        
        imported_count = 0
        updated_count = 0
        errors = []
        
        for participant in participants:
            try:
                # Prepare data
                telegram_id = participant.get('id')
                username = participant.get('username')
                name = participant.get('name', 'Unknown')
                role = participant.get('role', '')
                cluster = participant.get('cluster', 'Other')
                description = participant.get('description', '')
                tags = participant.get('tags', [])
                post_url = participant.get('post_url')
                
                # Check if participant already exists
                cur.execute(
                    "SELECT id FROM entrepreneurs WHERE telegram_id = %s OR post_url = %s",
                    (telegram_id, post_url)
                )
                existing = cur.fetchone()
                
                if existing:
                    # Update existing participant
                    cur.execute("""
                        UPDATE entrepreneurs 
                        SET username = %s, name = %s, role = %s, 
                            cluster = %s, description = %s, tags = %s,
                            post_url = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE telegram_id = %s OR post_url = %s
                    """, (username, name, role, cluster, description, tags, post_url, telegram_id, post_url))
                    updated_count += 1
                else:
                    # Insert new participant
                    cur.execute("""
                        INSERT INTO entrepreneurs 
                        (telegram_id, username, name, role, cluster, description, tags, post_url)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (telegram_id, username, name, role, cluster, description, tags, post_url))
                    imported_count += 1
                    
            except Exception as e:
                errors.append({
                    'participant': participant.get('name', 'Unknown'),
                    'error': str(e)
                })
        
        # Commit transaction
        conn.commit()
        cur.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'imported': imported_count,
                'updated': updated_count,
                'total': len(participants),
                'errors': errors
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Server error: {str(e)}'})
        }