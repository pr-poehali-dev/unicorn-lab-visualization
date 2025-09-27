import json
import os
import psycopg2
import httpx
from typing import Dict, List, Any, Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field, ValidationError

# Define allowed values
CLUSTERS = ["IT", "Финансы", "Маркетинг", "Производство", "Услуги", "Образование", "Здоровье", "Недвижимость", "Другое"]
ALLOWED_TAGS = [
    "AI/ML", "стартапы", "инвестиции", "продажи", "маркетинг", "разработка", 
    "консалтинг", "производство", "логистика", "финтех", "образование", 
    "медицина", "e-commerce", "B2B", "B2C", "SaaS", "криптовалюты", 
    "недвижимость", "HR", "дизайн", "аналитика", "управление проектами", 
    "автоматизация", "робототехника", "IoT", "блокчейн", "масштабирование",
    "нетворкинг", "коучинг", "франшизы", "экспорт", "импорт", "ритейл"
]

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Import and cluster Telegram participants using OpenAI structured outputs
    Args: event with participants list
    Returns: Import results with clustering
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
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
        # Parse request
        body = json.loads(event.get('body', '{}'))
        participants = body.get('participants', [])
        
        if not participants:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No participants provided'})
            }
        
        print(f"Received {len(participants)} participants")
        
        # Process with AI clustering
        clustered_participants = process_with_structured_output(participants)
        
        # Save to database
        result = save_to_database(clustered_participants, participants)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(result),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        print(f"Error in handler: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }


def process_with_structured_output(participants: List[Dict]) -> List[Dict]:
    """Process participants using OpenAI structured output"""
    api_key = os.environ.get('OPENAI_API_KEY', '')
    if not api_key:
        raise Exception("OPENAI_API_KEY not configured")
    
    # Prepare batch text
    batch_text = ""
    for i, p in enumerate(participants):
        batch_text += f"Participant {i+1}:\n"
        batch_text += f"Name: {p.get('author', 'Unknown')}\n"
        batch_text += f"ID: {p.get('authorId', '')}\n"
        batch_text += f"Text: {p.get('text', '')}\n\n"
    
    # Setup proxy if needed
    proxy_url = os.environ.get('OPENAI_HTTP_PROXY', '')
    client_kwargs = {}
    if proxy_url:
        client_kwargs['proxies'] = {'http://': proxy_url, 'https://': proxy_url}
        print(f"Using proxy: {proxy_url}")
    else:
        print("WARNING: No proxy configured, OpenAI might be blocked")
    
    # Create JSON schema for structured output
    json_schema = {
        "type": "object",
        "properties": {
            "participants": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "telegram_id": {"type": "string"},
                        "cluster": {"type": "string", "enum": CLUSTERS},
                        "summary": {"type": "string"},
                        "goal": {"type": "string"},
                        "tags": {
                            "type": "array",
                            "items": {"type": "string", "enum": ALLOWED_TAGS},
                            "minItems": 3,
                            "maxItems": 5
                        }
                    },
                    "required": ["name", "telegram_id", "cluster", "summary", "goal", "tags"],
                    "additionalProperties": False
                }
            }
        },
        "required": ["participants"],
        "additionalProperties": False
    }
    
    try:
        with httpx.Client(**client_kwargs) as client:
            response = client.post(
                'https://api.openai.com/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'gpt-4o-mini',
                    'messages': [
                        {
                            'role': 'system',
                            'content': f'''You are analyzing Russian text about entrepreneurs and business professionals.

TASK:
1. Extract participant information
2. Assign ONE cluster: {', '.join(CLUSTERS)}
3. Create a concise 1-2 sentence summary in Russian highlighting their expertise, role, and achievements
4. Extract their main GOAL - what they want to achieve, find, or get from the community (1 sentence in Russian)
5. Select exactly 3-5 tags from this list ONLY: {', '.join(ALLOWED_TAGS)}

IMPORTANT:
- Summary must be a complete, professional description, not just cut text
- Use ONLY tags from the provided list
- Minimum 3 tags per person
- Focus on their professional activities and expertise'''
                        },
                        {
                            'role': 'user',
                            'content': batch_text
                        }
                    ],
                    'response_format': {
                        'type': 'json_schema',
                        'json_schema': {
                            'name': 'batch_response',
                            'schema': json_schema,
                            'strict': True
                        }
                    },
                    'max_tokens': 800,
                    'temperature': 0
                },
                timeout=15.0
            )
            
            if response.status_code != 200:
                raise Exception(f"OpenAI error: {response.status_code} - {response.text}")
            
            # Parse structured response
            result = response.json()
            content = result['choices'][0]['message']['content']
            parsed = json.loads(content)
            
            return parsed['participants']
            
    except Exception as e:
        print(f"Error in AI processing: {str(e)}")
        raise Exception(f"Failed to process participants with AI: {str(e)}")


def save_to_database(parsed: List[Dict], original: List[Dict]) -> Dict[str, Any]:
    """Save to database with clustering"""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    # Schema name
    schema = "t_p95295728_unicorn_lab_visualiz"
    
    imported_count = 0
    updated_count = 0
    clusters = {}
    errors = []
    
    # Create lookup for parsed data
    parsed_lookup = {p['telegram_id']: p for p in parsed}
    
    for participant in original:
        try:
            telegram_id = participant.get('authorId', '')
            if not telegram_id:
                continue
            
            # Get parsed data
            parsed_data = parsed_lookup.get(telegram_id)
            if parsed_data:
                cluster = parsed_data['cluster']
                tags = parsed_data['tags']
                summary = parsed_data['summary']
                goal = parsed_data['goal']
            else:
                # Skip participants without AI processing
                continue

            # Count clusters
            clusters[cluster] = clusters.get(cluster, 0) + 1
            
            # Check if exists
            cur.execute(
                f"SELECT id FROM {schema}.entrepreneurs WHERE telegram_id = %s",
                (telegram_id,)
            )
            existing = cur.fetchone()
            
            if existing:
                # Update existing
                cur.execute(f"""
                    UPDATE {schema}.entrepreneurs 
                    SET name = %s, description = %s, post_url = %s, 
                        cluster = %s, tags = %s, goal = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE telegram_id = %s
                """, (
                    participant.get('author', 'Unknown'),
                    summary,  # Use AI-generated summary
                    participant.get('messageLink', ''),
                    cluster,
                    tags,
                    goal,
                    telegram_id
                ))
                updated_count += 1
            else:
                # Insert new
                cur.execute(f"""
                    INSERT INTO {schema}.entrepreneurs (
                        telegram_id, name, description, post_url, 
                        cluster, tags, goal, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, 
                            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, (
                    telegram_id,
                    participant.get('author', 'Unknown'),
                    summary,  # Use AI-generated summary
                    participant.get('messageLink', ''),
                    cluster,
                    tags,
                    goal
                ))
                imported_count += 1
                
        except Exception as e:
            errors.append(f"Error processing {participant.get('author', 'Unknown')}: {str(e)}")
            print(f"Error: {str(e)}")
    
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'success': True,
        'imported': imported_count,
        'updated': updated_count,
        'errors': errors,
        'clusters': clusters,
        'total': len(original)
    }