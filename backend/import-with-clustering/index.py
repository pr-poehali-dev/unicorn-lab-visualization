import json
import os
import psycopg2
import httpx
from typing import Dict, List, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ValidationError

# Pydantic models for structured outputs
class ParsedParticipant(BaseModel):
    """Single parsed participant with clustering"""
    name: str = Field(description="Full name of the participant")
    telegram_id: str = Field(description="Telegram user ID")
    cluster: str = Field(description="One of: IT, Финансы, Маркетинг, Производство, Услуги, Другое")
    city: Optional[str] = Field(None, description="City if mentioned")
    tags: List[str] = Field(default_factory=list, description="List of relevant tags")
    experience: Optional[str] = Field(None, description="Brief experience summary")
    contacts: Optional[str] = Field(None, description="Contact information if provided")

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
                            'content': 'Extract participant information and assign to clusters: IT, Финансы, Маркетинг, Производство, Услуги, Другое'
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
        
        result.append(ParsedParticipant(
            name=p.get('author', 'Unknown'),
            telegram_id=p.get('authorId', ''),
            cluster=cluster,
            city=None,
            tags=[],
            experience=None,
            contacts=None
        ))
    
    return result


def save_to_database(parsed: List[ParsedParticipant], original: List[Dict]) -> Dict[str, Any]:
    """Save to database with clustering"""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
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
            else:
                cluster = 'Другое'
                tags = []
            
            # Count clusters
            clusters[cluster] = clusters.get(cluster, 0) + 1
            
            # Check if exists
            cur.execute(
                "SELECT id FROM participants WHERE telegram_id = %s",
                (telegram_id,)
            )
            existing = cur.fetchone()
            
            if existing:
                # Update existing
                cur.execute("""
                    UPDATE participants 
                    SET name = %s, avatar_url = %s, message_text = %s, 
                        message_link = %s, cluster = %s, tags = %s,
                        is_forwarded = %s, is_own = %s, is_unknown = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE telegram_id = %s
                """, (
                    participant.get('author', 'Unknown'),
                    participant.get('avatarUrl', ''),
                    participant.get('text', ''),
                    participant.get('messageLink', ''),
                    cluster,
                    tags,
                    participant.get('isForwarded', False),
                    participant.get('isOwn', False),
                    participant.get('isUnknown', False),
                    telegram_id
                ))
                updated_count += 1
            else:
                # Insert new
                cur.execute("""
                    INSERT INTO participants (
                        telegram_id, name, avatar_url, message_text, 
                        message_link, cluster, tags, is_forwarded, 
                        is_own, is_unknown, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 
                            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, (
                    telegram_id,
                    participant.get('author', 'Unknown'),
                    participant.get('avatarUrl', ''),
                    participant.get('text', ''),
                    participant.get('messageLink', ''),
                    cluster,
                    tags,
                    participant.get('isForwarded', False),
                    participant.get('isOwn', False),
                    participant.get('isUnknown', False)
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