import json
import os
import psycopg2
import httpx
from typing import Dict, List, Any, Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field, ValidationError, validator

# Define allowed values
CLUSTERS = Literal["IT", "Финансы", "Маркетинг", "Производство", "Услуги", "Образование", "Здоровье", "Недвижимость", "Другое"]
ALLOWED_TAGS = [
    "AI/ML", "стартапы", "инвестиции", "продажи", "маркетинг", "разработка", 
    "консалтинг", "производство", "логистика", "финтех", "образование", 
    "медицина", "e-commerce", "B2B", "B2C", "SaaS", "криптовалюты", 
    "недвижимость", "HR", "дизайн", "аналитика", "управление проектами", 
    "автоматизация", "робототехника", "IoT", "блокчейн", "масштабирование",
    "нетворкинг", "коучинг", "франшизы", "экспорт", "импорт", "ритейл"
]

# Pydantic models for structured outputs
class ParsedParticipant(BaseModel):
    """Single parsed participant with clustering"""
    name: str = Field(description="Full name of the participant")
    telegram_id: str = Field(description="Telegram user ID")
    cluster: CLUSTERS = Field(description="Select ONE cluster from: IT, Финансы, Маркетинг, Производство, Услуги, Образование, Здоровье, Недвижимость, Другое")
    summary: str = Field(description="Create a concise 1-2 sentence summary highlighting their main expertise, business/role, and key achievements")
    tags: List[str] = Field(min_items=3, max_items=5, description=f"Select 3-5 tags from: {', '.join(ALLOWED_TAGS)}")
    
    @validator('tags')
    def validate_tags(cls, v):
        for tag in v:
            if tag not in ALLOWED_TAGS:
                raise ValueError(f"Invalid tag: {tag}")
        return v

class BatchResponse(BaseModel):
    """Response for batch processing"""
    participants: List[ParsedParticipant] = Field(description="List of parsed participants")

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


def process_with_structured_output(participants: List[Dict]) -> List[ParsedParticipant]:
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
2. Assign ONE cluster: IT, Финансы, Маркетинг, Производство, Услуги, Образование, Здоровье, Недвижимость, Другое
3. Create a concise 1-2 sentence summary in Russian highlighting their expertise, role, and achievements
4. Select exactly 3-5 tags from this list ONLY: {', '.join(ALLOWED_TAGS)}

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
                            'schema': BatchResponse.model_json_schema(),
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
            batch_response = BatchResponse.model_validate_json(content)
            
            return batch_response.participants
            
    except Exception as e:
        print(f"Error in AI processing: {str(e)}")
        # Fallback to basic processing
        return fallback_process(participants)


def fallback_process(participants: List[Dict]) -> List[ParsedParticipant]:
    """Fallback processing without AI"""
    result = []
    
    for p in participants:
        # Basic cluster detection
        text_lower = p.get('text', '').lower()
        cluster = 'Другое'
        
        if any(word in text_lower for word in ['it', 'программ', 'разработ', 'код', 'software']):
            cluster = 'IT'
        elif any(word in text_lower for word in ['финанс', 'инвест', 'банк', 'деньг']):
            cluster = 'Финансы'
        elif any(word in text_lower for word in ['маркет', 'продаж', 'реклам', 'smm']):
            cluster = 'Маркетинг'
        elif any(word in text_lower for word in ['производ', 'завод', 'фабрик']):
            cluster = 'Производство'
        elif any(word in text_lower for word in ['услуг', 'сервис', 'консалт']):
            cluster = 'Услуги'
        elif any(word in text_lower for word in ['образован', 'обуч', 'курс', 'школ']):
            cluster = 'Образование'
        elif any(word in text_lower for word in ['медиц', 'здоров', 'клиник']):
            cluster = 'Здоровье'
        elif any(word in text_lower for word in ['недвиж', 'квартир', 'дом', 'аренд']):
            cluster = 'Недвижимость'
        
        # Extract basic tags based on keywords
        tags = []
        if any(word in text_lower for word in ['стартап', 'startup', 'основатель']):
            tags.append('стартапы')
        if any(word in text_lower for word in ['ai', 'ml', 'искусственный интеллект']):
            tags.append('AI/ML')
        if any(word in text_lower for word in ['инвест', 'инвестор']):
            tags.append('инвестиции')
        if any(word in text_lower for word in ['продаж', 'sales']):
            tags.append('продажи')
        if any(word in text_lower for word in ['маркетинг', 'marketing']):
            tags.append('маркетинг')
        if any(word in text_lower for word in ['консалт', 'консульт']):
            tags.append('консалтинг')
        if any(word in text_lower for word in ['разработ', 'программ']):
            tags.append('разработка')
            
        # Ensure minimum 3 tags
        if len(tags) < 3:
            if cluster == 'IT' and 'разработка' not in tags:
                tags.append('разработка')
            if 'консалтинг' not in tags:
                tags.append('консалтинг')
            if 'B2B' not in tags:
                tags.append('B2B')
        
        # Create summary
        text = p.get('text', '')
        name = p.get('author', 'Unknown')
        summary = f"{name} - предприниматель в сфере {cluster.lower()}."
        if len(text) > 50:
            # Try to extract first meaningful sentence
            sentences = text.split('.')
            if sentences and len(sentences[0]) > 20:
                summary = sentences[0].strip() + '.'
            
        result.append(ParsedParticipant(
            name=name,
            telegram_id=p.get('authorId', ''),
            cluster=cluster,
            summary=summary[:200],  # Limit summary length
            tags=tags[:5]  # Limit to 5 tags
        ))
    
    return result


def save_to_database(parsed: List[ParsedParticipant], original: List[Dict]) -> Dict[str, Any]:
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
    parsed_lookup = {p.telegram_id: p for p in parsed}
    
    for participant in original:
        try:
            telegram_id = participant.get('authorId', '')
            if not telegram_id:
                continue
            
            # Get parsed data
            parsed_data = parsed_lookup.get(telegram_id)
            if parsed_data:
                cluster = parsed_data.cluster
                tags = parsed_data.tags
                summary = parsed_data.summary
            else:
                cluster = 'Другое'
                tags = []
                summary = participant.get('text', '')[:200]  # First 200 chars as fallback
            
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
                        cluster = %s, tags = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE telegram_id = %s
                """, (
                    participant.get('author', 'Unknown'),
                    summary,  # Use AI-generated summary
                    participant.get('messageLink', ''),
                    cluster,
                    tags,
                    telegram_id
                ))
                updated_count += 1
            else:
                # Insert new
                cur.execute(f"""
                    INSERT INTO {schema}.entrepreneurs (
                        telegram_id, name, description, post_url, 
                        cluster, tags, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, 
                            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, (
                    telegram_id,
                    participant.get('author', 'Unknown'),
                    summary,  # Use AI-generated summary
                    participant.get('messageLink', ''),
                    cluster,
                    tags
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