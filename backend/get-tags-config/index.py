import json
import os
import psycopg2
from typing import Dict, Any, List

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Get tags, clusters and connections configuration from database
    Args: event - HTTP event
    Returns: HTTP response with tags configuration
    '''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': ''
        }
    
    if method == 'GET':
        try:
            conn = psycopg2.connect(os.environ['DATABASE_URL'])
            cur = conn.cursor()
            
            # Получаем кластеры
            cur.execute("""
                SELECT name, color 
                FROM t_p95295728_unicorn_lab_visualiz.clusters 
                ORDER BY display_order, name
            """)
            clusters = []
            cluster_colors = {}
            for row in cur.fetchall():
                clusters.append(row[0])
                if row[1]:
                    cluster_colors[row[0]] = row[1]
            
            # Получаем категории тегов
            cur.execute("""
                SELECT id, key, name 
                FROM t_p95295728_unicorn_lab_visualiz.tag_categories 
                ORDER BY display_order
            """)
            categories = {row[0]: {'key': row[1], 'name': row[2]} for row in cur.fetchall()}
            
            # Получаем теги с их категориями
            cur.execute("""
                SELECT t.name, t.category_id, tc.key
                FROM t_p95295728_unicorn_lab_visualiz.tags t
                JOIN t_p95295728_unicorn_lab_visualiz.tag_categories tc ON t.category_id = tc.id
                ORDER BY t.category_id, t.display_order, t.name
            """)
            tags_by_category = {}
            all_tags = []
            for tag_name, cat_id, cat_key in cur.fetchall():
                if cat_key not in tags_by_category:
                    tags_by_category[cat_key] = []
                tags_by_category[cat_key].append(tag_name)
                all_tags.append(tag_name)
            
            # Получаем связи между тегами
            cur.execute("""
                SELECT 
                    t1.name as tag1,
                    t2.name as tag2,
                    tc.strength,
                    tc.connection_type
                FROM t_p95295728_unicorn_lab_visualiz.tag_connections tc
                JOIN t_p95295728_unicorn_lab_visualiz.tags t1 ON tc.tag1_id = t1.id
                JOIN t_p95295728_unicorn_lab_visualiz.tags t2 ON tc.tag2_id = t2.id
                WHERE tc.strength >= 0.5
                ORDER BY tc.strength DESC
            """)
            connections = []
            for row in cur.fetchall():
                connections.append({
                    'tag1': row[0],
                    'tag2': row[1],
                    'strength': float(row[2]),
                    'type': row[3]
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
                    'clusters': clusters,
                    'clusterColors': cluster_colors,
                    'categories': list(categories.values()),
                    'tagsByCategory': tags_by_category,
                    'allTags': all_tags,
                    'connections': connections
                })
            }
            
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': str(e)})
            }
    
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }