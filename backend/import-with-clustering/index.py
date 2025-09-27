import json
import os
import psycopg2
import httpx
from typing import Dict, Any, List, Optional

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Import and cluster participants using OpenAI, then save to database
    Args: event with raw participants array in body
    Returns: HTTP response with import statistics and clustering results
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
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
        raw_participants = body_data.get('participants', [])
        
        # Log incoming data
        print(f"Received {len(raw_participants)} participants")
        if raw_participants:
            print(f"First participant sample: {raw_participants[0]}")
        
        if not raw_participants:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No participants provided'})
            }
        
        # Limit participants to avoid timeout (process max 50 at once)
        participants_to_process = raw_participants[:50]
        if len(raw_participants) > 50:
            print(f"WARNING: Processing only first 50 out of {len(raw_participants)} participants to avoid timeout")
        
        # First, cluster participants using OpenAI
        clustered_participants = cluster_participants(participants_to_process)
        
        if not clustered_participants:
            return {
                'statusCode': 500,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Failed to cluster participants'})
            }
        
        # Then, save to database
        import_results = save_to_database(clustered_participants)
        
        # Analyze connections
        connections_created = create_connections(clustered_participants)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'imported': import_results['imported'],
                'updated': import_results['updated'],
                'errors': import_results['errors'],
                'clusters': import_results['clusters'],
                'connections_created': connections_created,
                'total': len(clustered_participants)
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Server error: {str(e)}'})
        }


def cluster_participants(raw_participants: List[Dict]) -> List[Dict]:
    """Cluster participants using OpenAI API"""
    api_key = os.environ.get('OPENAI_API_KEY')
    proxy_url = os.environ.get('OPENAI_HTTP_PROXY')
    
    if not api_key:
        raise Exception('OpenAI API key not configured')
    
    # Process in larger batches to reduce API calls
    batch_size = 20  # Increased for efficiency
    all_results = []
    
    for i in range(0, len(raw_participants), batch_size):
        batch = raw_participants[i:i + batch_size]
        batch_results = process_batch(batch, api_key, proxy_url)
        all_results.extend(batch_results)
    
    return all_results


def process_batch(participants: List[Dict], api_key: str, proxy_url: Optional[str]) -> List[Dict]:
    """Process a batch of participants through OpenAI API"""
    
    # Log for debugging
    print(f"Processing batch of {len(participants)} participants")
    print(f"API key present: {bool(api_key)}")
    print(f"API key length: {len(api_key) if api_key else 0}")
    print(f"Proxy URL: {proxy_url}")
    
    system_prompt = """Ты эксперт по анализу участников предпринимательского сообщества.
    Извлеки структурированную информацию и определи кластер для каждого участника.
    
    Кластеры: IT, E-commerce, Финансы, Образование, Медицина, Производство, Консалтинг, Маркетинг, Другое
    
    Для каждого участника определи:
    - name: полное имя
    - role: краткая роль/должность (до 50 символов)
    - description: описание деятельности (до 200 символов)
    - cluster: один из кластеров
    - tags: массив из 3-7 ключевых тегов
    - telegram_id: ID из authorId
    - post_url: ссылка на сообщение
    - username: извлеки из текста если есть @username
    """
    
    user_prompt = "Проанализируй участников:\n\n"
    for i, p in enumerate(participants):
        user_prompt += f"Участник {i+1}:\n"
        user_prompt += f"authorId: {p.get('authorId', 'unknown')}\n"
        user_prompt += f"messageLink: {p.get('messageLink', '')}\n"
        user_prompt += f"text: {p.get('text', '')[:1000]}\n\n"
    
    user_prompt += "\nВерни JSON массив с полями: telegram_id, post_url, name, username, role, description, cluster, tags"
    
    client_kwargs = {}
    if proxy_url:
        client_kwargs['proxies'] = proxy_url
    
    try:
        with httpx.Client(**client_kwargs) as client:
            response = client.post(
                'https://api.openai.com/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'gpt-4o-mini',  # Using faster model to avoid timeouts
                    'messages': [
                        {'role': 'system', 'content': system_prompt},
                        {'role': 'user', 'content': user_prompt}
                    ],
                    'response_format': {'type': 'json_object'},
                    'max_tokens': 2000  # Limit response size
                },
                timeout=10.0  # Reduced timeout per request
            )
            
            if response.status_code == 403:
                raise Exception(f"OpenAI API access forbidden. Please check if your API key has access to model gpt-4o-mini")
            elif response.status_code != 200:
                raise Exception(f"OpenAI API error: {response.status_code} - {response.text}")
            
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            try:
                parsed = json.loads(content)
                if isinstance(parsed, dict) and 'participants' in parsed:
                    return parsed['participants']
                elif isinstance(parsed, list):
                    return parsed
                else:
                    return [parsed]
            except:
                return []
    except Exception as e:
        print(f"Error in process_batch: {str(e)}")
        raise


def save_to_database(participants: List[Dict]) -> Dict[str, Any]:
    """Save clustered participants to database"""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    imported_count = 0
    updated_count = 0
    errors = []
    clusters = {}
    
    for participant in participants:
        try:
            telegram_id = participant.get('telegram_id')
            post_url = participant.get('post_url')
            username = participant.get('username')
            name = participant.get('name', 'Unknown')
            role = participant.get('role', '')
            cluster = participant.get('cluster', 'Другое')
            description = participant.get('description', '')
            tags = participant.get('tags', [])
            
            # Count clusters
            clusters[cluster] = clusters.get(cluster, 0) + 1
            
            # Check if exists
            cur.execute(
                "SELECT id FROM entrepreneurs WHERE telegram_id = %s OR post_url = %s",
                (telegram_id, post_url)
            )
            existing = cur.fetchone()
            
            if existing:
                cur.execute("""
                    UPDATE entrepreneurs 
                    SET username = %s, name = %s, role = %s, 
                        cluster = %s, description = %s, tags = %s,
                        post_url = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE telegram_id = %s OR post_url = %s
                """, (username, name, role, cluster, description, tags, post_url, telegram_id, post_url))
                updated_count += 1
            else:
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
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'imported': imported_count,
        'updated': updated_count,
        'errors': errors,
        'clusters': clusters
    }


def create_connections(participants: List[Dict]) -> int:
    """Create connections between participants based on clusters and tags"""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    connections_created = 0
    
    # Get all participants with their IDs
    cur.execute("SELECT id, telegram_id, cluster, tags FROM entrepreneurs")
    all_participants = cur.fetchall()
    
    # Create ID mapping
    id_map = {p[1]: p[0] for p in all_participants}
    
    # Create connections based on shared clusters and tags
    for i, p1 in enumerate(all_participants):
        for j, p2 in enumerate(all_participants[i+1:], i+1):
            # Calculate connection strength
            strength = 0
            
            # Same cluster = +5
            if p1[2] == p2[2]:
                strength += 5
            
            # Shared tags = +2 per tag
            if p1[3] and p2[3]:
                shared_tags = set(p1[3]) & set(p2[3])
                strength += len(shared_tags) * 2
            
            # Create connection if strength > 0
            if strength > 0 and strength <= 10:
                try:
                    cur.execute("""
                        INSERT INTO connections (source_id, target_id, connection_type, strength)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (source_id, target_id) DO UPDATE
                        SET strength = EXCLUDED.strength
                    """, (p1[0], p2[0], 'auto_cluster', min(strength, 10)))
                    connections_created += 1
                except:
                    pass
    
    conn.commit()
    cur.close()
    conn.close()
    
    return connections_created