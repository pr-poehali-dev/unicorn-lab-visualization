import json
import os
import psycopg2
import httpx
from openai import OpenAI
from typing import Dict, List, Any, Optional, Literal, Tuple
from datetime import datetime
from pydantic import BaseModel, Field, ValidationError, validator

def filter_new_participants(participants: List[Dict]) -> List[Dict]:
    """Filter out participants that already exist in database by post_url"""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    try:
        # Get all existing post_urls
        post_urls = [p.get('messageLink', '') for p in participants if p.get('messageLink')]
        
        if not post_urls:
            # If no post_urls, return all participants
            return participants
        
        # Check which post_urls already exist
        cur.execute("""
            SELECT post_url FROM t_p95295728_unicorn_lab_visualiz.entrepreneurs 
            WHERE post_url = ANY(%s::text[])
        """, (post_urls,))
        
        existing_urls = {row[0] for row in cur.fetchall()}
        
        # Filter out participants with existing post_urls
        new_participants = []
        for p in participants:
            post_url = p.get('messageLink', '')
            if not post_url or post_url not in existing_urls:
                new_participants.append(p)
        
        return new_participants
        
    finally:
        cur.close()
        conn.close()


def get_tags_and_clusters_from_db() -> Tuple[List[str], Dict[str, int]]:
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
        
        # Get clusters from clusters table
        cur.execute("""
            SELECT id, name 
            FROM t_p95295728_unicorn_lab_visualiz.clusters
            ORDER BY display_order, name
        """)
        cluster_rows = cur.fetchall()
        clusters_dict = {name: id for id, name in cluster_rows}
        
        print(f"Loaded {len(tags)} tags and {len(clusters_dict)} clusters from DB")
        
        # If no clusters found, raise error
        if not clusters_dict:
            raise Exception("No clusters found in database")
        
        return tags, clusters_dict
        
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
        # Return empty clusters dict to force error
        return default_tags, {}
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
        allowed_tags, clusters_dict = get_tags_and_clusters_from_db()
        
        print(f"Loaded {len(allowed_tags)} tags and {len(clusters_dict)} clusters from DB")
        
        # Filter out existing participants
        new_participants = filter_new_participants(participants)
        
        if not new_participants:
            print("No new participants to process")
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': True,
                    'imported': 0,
                    'updated': 0,
                    'skipped': len(participants),
                    'errors': [],
                    'clusters': {},
                    'total': len(participants)
                }),
                'isBase64Encoded': False
            }
        
        print(f"Found {len(new_participants)} new participants to process")
        
        # Process only new participants with AI clustering
        clustered_participants = process_with_structured_output(new_participants, allowed_tags, clusters_dict)
        
        # Save to database
        result = save_to_database(clustered_participants, participants, allowed_tags, clusters_dict)
        
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


def process_with_structured_output(participants: List[Dict], allowed_tags: List[str], clusters_dict: Dict[str, int]) -> List[Dict]:
    """Process participants using OpenAI structured output with DB tags and clusters"""
    api_key = os.environ.get('OPENAI_API_KEY', '')
    if not api_key:
        raise Exception("OPENAI_API_KEY not configured")
    
    # Define Pydantic models
    clusters = list(clusters_dict.keys())
    
    class Participant(BaseModel):
        name: str
        telegram_id: str
        cluster: str = Field(..., description=f"Must be one of: {', '.join(clusters)}")
        summary: str
        goal: str
        emoji: str = Field(min_length=1, max_length=2)
        tags: List[str] = Field(min_items=3, max_items=10)
        
        @validator('cluster')
        def validate_cluster(cls, v):
            if v not in clusters:
                raise ValueError(f'cluster must be one of: {", ".join(clusters)}')
            return v
    
    class ParticipantBatch(BaseModel):
        participants: List[Participant]
    
    # Prepare batch text
    batch_text = ""
    for i, p in enumerate(participants):
        batch_text += f"Participant {i+1}:\n"
        batch_text += f"Name: {p.get('author', 'Unknown')}\n"
        batch_text += f"ID: {p.get('authorId', '')}\n"
        batch_text += f"Text: {p.get('text', '')}\n\n"
    
    # Setup proxy if needed
    proxy_url = os.environ.get('OPENAI_HTTP_PROXY', '')
    http_client = None
    if proxy_url:
        http_client = httpx.Client(proxies=proxy_url)
        print(f"Using proxy: {proxy_url} with GPT-5-mini")
    else:
        print("WARNING: No proxy configured, OpenAI might be blocked")
    
    try:
        client = OpenAI(api_key=api_key, http_client=http_client)
        
        completion = client.beta.chat.completions.parse(
            model="gpt-5-nano",
            messages=[
                {
                    'role': 'system',
                    'content': f'''You are analyzing Russian text about entrepreneurs and business professionals.

TASK:
1. Extract participant NAME in Russian
   - PRIORITY: Extract name from the message text itself (not metadata)
   - Look for patterns: "Меня зовут...", "Я - [имя]", "Привет, я [имя]", signatures
   - Extract ONLY clean name: "Имя Фамилия" format (no titles, emojis, or extra text)
   - If English name found, translate to Russian if it has common translation
   - Examples: John → Джон, Mary → Мария, Alexander → Александр
   - If no clear translation exists, keep original: Steve Jobs → Стив Джобс
   - NEVER include: @username, emojis, titles (CEO, директор), company names
   - If no name found in text, use metadata name as last resort
   - Clean format: "Иван Петров" NOT "Иван Петров 🚀 CEO"
2. Assign ONE cluster - MUST BE EXACTLY one from this list (no other values allowed): {', '.join(clusters)}
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
- Focus on their skills, industry, business stage, needs

NAME EXTRACTION EXAMPLES:
- "Привет! Меня зовут Александр Петров, я CEO..." → name: "Александр Петров"
- "Всем привет, Маша из Москвы..." → name: "Мария"
- "John Smith, разработчик из..." → name: "Джон Смит"
- "@ivan_petrov Иван, основатель..." → name: "Иван"
- "...С уважением, Елена Сидорова" → name: "Елена Сидорова"
- No name in text, metadata shows "Alice Cooper 🚀" → name: "Элис Купер"'''
                },
                {
                    'role': 'user',
                    'content': batch_text
                }
            ],
            response_format=ParticipantBatch
        )
        
        # Get parsed result
        batch = completion.choices[0].message.parsed
        
        # Convert to dict list
        return [p.model_dump() for p in batch.participants]
            
    except Exception as e:
        print(f"Error in AI processing: {str(e)}")
        raise Exception(f"Failed to process participants with AI: {str(e)}")


def save_to_database(parsed: List[Dict], all_participants: List[Dict], allowed_tags: List[str], clusters_dict: Dict[str, int]) -> Dict[str, Any]:
    """Save to database with clustering and tag relations
    
    Args:
        parsed: List of participants processed by AI
        all_participants: All participants from original request (including skipped ones)
    """
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    imported_count = 0
    updated_count = 0
    skipped_count = 0
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
    
    # Get all existing post_urls for counting skipped
    existing_post_urls = set()
    try:
        post_urls = [p.get('messageLink', '') for p in all_participants if p.get('messageLink')]
        if post_urls:
            cur.execute("""
                SELECT post_url FROM t_p95295728_unicorn_lab_visualiz.entrepreneurs 
                WHERE post_url = ANY(%s::text[])
            """, (post_urls,))
            existing_post_urls = {row[0] for row in cur.fetchall()}
    except Exception as e:
        print(f"Error checking existing URLs: {e}")
    
    for participant in all_participants:
        try:
            telegram_id = participant.get('authorId', '')
            if not telegram_id:
                continue
            
            # Check if already exists by post_url
            post_url = participant.get('messageLink', '')
            if post_url and post_url in existing_post_urls:
                skipped_count += 1
                continue
            
            # Get parsed data
            parsed_data = parsed_lookup.get(telegram_id)
            if parsed_data:
                cluster_name = parsed_data['cluster']
                cluster_id = clusters_dict.get(cluster_name)
                if not cluster_id:
                    print(f"Warning: Unknown cluster '{cluster_name}', skipping")
                    continue
                tags = parsed_data['tags']
                summary = parsed_data['summary']
                goal = parsed_data['goal']
                emoji = parsed_data.get('emoji', '😊')
            else:
                # Skip participants without AI processing
                continue

            # Count clusters
            clusters_count[cluster_name] = clusters_count.get(cluster_name, 0) + 1
            
            # Check if exists by telegram_id
            cur.execute("""
                SELECT id FROM t_p95295728_unicorn_lab_visualiz.entrepreneurs 
                WHERE telegram_id = %s
            """, (telegram_id,))
            existing = cur.fetchone()
            
            if existing:
                entrepreneur_id = existing[0]
                # Update existing
                cur.execute("""
                    UPDATE t_p95295728_unicorn_lab_visualiz.entrepreneurs 
                    SET name = %s, description = %s, post_url = %s, 
                        cluster = %s, cluster_id = %s, goal = %s, emoji = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE telegram_id = %s
                    RETURNING id
                """, (
                    parsed_data.get('name', participant.get('author', 'Unknown')),  # Use AI-extracted name
                    summary,  # Use AI-generated summary
                    participant.get('messageLink', ''),
                    cluster_name,
                    cluster_id,
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
                        cluster, cluster_id, goal, emoji, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s,
                            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    RETURNING id
                """, (
                    telegram_id,
                    parsed_data.get('name', participant.get('author', 'Unknown')),  # Use AI-extracted name
                    summary,  # Use AI-generated summary
                    participant.get('messageLink', ''),
                    cluster_name,
                    cluster_id,
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
        'skipped': skipped_count,
        'errors': errors,
        'clusters': clusters_count,
        'total': len(all_participants)
    }