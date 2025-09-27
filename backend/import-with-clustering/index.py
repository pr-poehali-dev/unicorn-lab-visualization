import json
import os
import psycopg2
import httpx
from typing import Dict, List, Any, Optional, Literal, Tuple
from datetime import datetime
from pydantic import BaseModel, Field, ValidationError

def get_tags_and_clusters_from_db() -> Tuple[List[str], List[str]]:
    """Load tags and clusters from database"""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    try:
        # Try to get current schema
        cur.execute("SELECT current_schema()")
        current_schema = cur.fetchone()[0]
        print(f"Current schema: {current_schema}")
        
        # Get all non-cluster tags
        cur.execute("""
            SELECT t.name 
            FROM t_p95295728_unicorn_lab_visualiz.tags t
            LEFT JOIN t_p95295728_unicorn_lab_visualiz.tag_categories tc ON t.category_id = tc.id
            WHERE tc.name != 'cluster' OR tc.name IS NULL
            ORDER BY t.name
        """)
        tags = [row[0] for row in cur.fetchall()]
        
        # Get cluster tags
        cur.execute("""
            SELECT t.name 
            FROM t_p95295728_unicorn_lab_visualiz.tags t
            JOIN t_p95295728_unicorn_lab_visualiz.tag_categories tc ON t.category_id = tc.id
            WHERE tc.name = 'cluster'
            ORDER BY t.name
        """)
        clusters = [row[0] for row in cur.fetchall()]
        
        print(f"Loaded {len(tags)} tags and {len(clusters)} clusters from DB")
        
        # If no clusters found, use default ones
        if not clusters:
            clusters = ["IT", "Финансы", "Маркетинг", "Производство", "Услуги", 
                       "Образование", "Здоровье", "Недвижимость", "Другое"]
            print("Using default clusters")
        
        return tags, clusters
        
    except Exception as e:
        print(f"Error loading tags from DB: {str(e)}")
        # Return defaults on error
        default_tags = [
            "AI/ML", "стартапы", "инвестиции", "продажи", "маркетинг", "разработка", 
            "консалтинг", "производство", "логистика", "финтех", "образование", 
            "медицина", "e-commerce", "B2B", "B2C", "SaaS", "криптовалюты", 
            "недвижимость", "HR", "дизайн", "аналитика", "управление проектами", 
            "автоматизация", "робототехника", "IoT", "блокчейн", "масштабирование",
            "нетворкинг", "коучинг", "франшизы", "экспорт", "импорт", "ритейл"
        ]
        default_clusters = ["IT", "Финансы", "Маркетинг", "Производство", "Услуги", 
                           "Образование", "Здоровье", "Недвижимость", "Другое"]
        return default_tags, default_clusters
    finally:
        cur.close()
        conn.close()


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Import and cluster Telegram participants using OpenAI with tags from DB
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
        
        # Get tags and clusters from database
        allowed_tags, clusters = get_tags_and_clusters_from_db()
        
        print(f"Loaded {len(allowed_tags)} tags and {len(clusters)} clusters from DB")
        
        # Process with AI clustering
        clustered_participants = process_with_structured_output(participants, allowed_tags, clusters)
        
        # Save to database
        result = save_to_database(clustered_participants, participants, allowed_tags, clusters)
        
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


def process_with_structured_output(participants: List[Dict], allowed_tags: List[str], clusters: List[str]) -> List[Dict]:
    """Process participants using OpenAI structured output with DB tags and clusters"""
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
                        "cluster": {"type": "string", "enum": clusters},
                        "summary": {"type": "string"},
                        "goal": {"type": "string"},
                        "emoji": {"type": "string", "minLength": 1, "maxLength": 2},
                        "tags": {
                            "type": "array",
                            "items": {"type": "string", "enum": allowed_tags},
                            "minItems": 3,
                            "maxItems": 10
                        }
                    },
                    "required": ["name", "telegram_id", "cluster", "summary", "goal", "emoji", "tags"],
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
1. Extract participant information in Russian
2. Assign ONE cluster from this list: {', '.join(clusters)}
3. Create a 1-2 sentence summary in Russian highlighting their expertise and achievements
4. Extract their main GOAL - what they want to achieve or find (1 sentence in Russian)
5. Select ONE emoji that best represents this person's profession, industry or personality
6. Select 3-10 tags from the provided list that best describe the person

EMOJI SELECTION:
- Choose ONE single HUMAN emoji that represents the person
- Use ONLY people/face emojis, NO objects or symbols
- Available options:
  * Professional/Business: 👨‍💼, 👩‍💼, 🧑‍💼
  * Tech/IT: 👨‍💻, 👩‍💻, 🧑‍💻
  * Creative: 👨‍🎨, 👩‍🎨, 🧑‍🎨
  * Science: 👨‍🔬, 👩‍🔬, 🧑‍🔬
  * Education: 👨‍🏫, 👩‍🏫, 🧑‍🏫, 👨‍🎓, 👩‍🎓
  * Healthcare: 👨‍⚕️, 👩‍⚕️, 🧑‍⚕️
  * Chef/Food: 👨‍🍳, 👩‍🍳, 🧑‍🍳
  * Worker: 👷‍♂️, 👷‍♀️, 🧑‍🏭
  * Friendly faces: 😊, 🙂, 😄, 😃, 🤗
  * Cool/Confident: 😎, 😏, 🤓
  * Default if unsure: 😊
- Choose based on their description and personality
- Prefer profession-specific emojis when clear from context

AVAILABLE TAGS (use EXACTLY as written, including Russian):
{', '.join(allowed_tags)}

IMPORTANT:
- Use ONLY tags from the provided list above, exactly as written
- Tags are in Russian, match them carefully
- Select 3-10 most relevant tags per person
- If no perfect match, choose the closest relevant tags
- Focus on their skills, industry, business stage, needs'''
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


def save_to_database(parsed: List[Dict], original: List[Dict], allowed_tags: List[str], clusters: List[str]) -> Dict[str, Any]:
    """Save to database with clustering and tag relations"""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    imported_count = 0
    updated_count = 0
    clusters_count = {}
    errors = []
    
    # Get tag IDs mapping
    try:
        cur.execute("SELECT id, name FROM t_p95295728_unicorn_lab_visualiz.tags")
        tag_id_map = {name: id for id, name in cur.fetchall()}
    except:
        print("Warning: Could not load tags mapping from DB")
        tag_id_map = {}
    
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
                emoji = parsed_data.get('emoji', '😊')
            else:
                # Skip participants without AI processing
                continue

            # Count clusters
            clusters_count[cluster] = clusters_count.get(cluster, 0) + 1
            
            # Check if exists
            cur.execute(
                "SELECT id FROM t_p95295728_unicorn_lab_visualiz.entrepreneurs WHERE telegram_id = %s",
                (telegram_id,)
            )
            existing = cur.fetchone()
            
            if existing:
                entrepreneur_id = existing[0]
                # Update existing
                cur.execute("""
                    UPDATE t_p95295728_unicorn_lab_visualiz.entrepreneurs 
                    SET name = %s, description = %s, post_url = %s, 
                        cluster = %s, goal = %s, emoji = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE telegram_id = %s
                    RETURNING id
                """, (
                    participant.get('author', 'Unknown'),
                    summary,  # Use AI-generated summary
                    participant.get('messageLink', ''),
                    cluster,
                    goal,
                    emoji,
                    telegram_id
                ))
                updated_count += 1
            else:
                # Insert new
                cur.execute("""
                    INSERT INTO t_p95295728_unicorn_lab_visualiz.entrepreneurs (
                        telegram_id, name, description, post_url, 
                        cluster, goal, emoji, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s,
                            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING id
                """, (
                    telegram_id,
                    participant.get('author', 'Unknown'),
                    summary,  # Use AI-generated summary
                    participant.get('messageLink', ''),
                    cluster,
                    goal,
                    emoji
                ))
                entrepreneur_id = cur.fetchone()[0]
                imported_count += 1
            
            # Clear existing tags for this entrepreneur
            try:
                cur.execute("DELETE FROM t_p95295728_unicorn_lab_visualiz.entrepreneur_tags WHERE entrepreneur_id = %s", (entrepreneur_id,))
            except:
                print(f"Warning: Could not clear tags for entrepreneur {entrepreneur_id}")
            
            # Insert new tag relations
            for tag_name in tags:
                tag_id = tag_id_map.get(tag_name)
                if tag_id:
                    try:
                        cur.execute("""
                            INSERT INTO t_p95295728_unicorn_lab_visualiz.entrepreneur_tags (entrepreneur_id, tag_id)
                            VALUES (%s, %s)
                            ON CONFLICT (entrepreneur_id, tag_id) DO NOTHING
                        """, (entrepreneur_id, tag_id))
                    except:
                        print(f"Warning: Could not insert tag relation for {tag_name}")
                else:
                    print(f"Warning: Tag '{tag_name}' not found in database")
                
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
        'clusters': clusters_count,
        'total': len(original)
    }