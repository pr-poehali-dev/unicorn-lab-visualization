import json
import os
import httpx
from openai import OpenAI
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Cluster participants using OpenAI API
    Args: event with participants array in body
    Returns: HTTP response with clustered participants
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
        
        if not raw_participants:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No participants provided'})
            }
        
        # Get OpenAI credentials
        api_key = os.environ.get('OPENAI_API_KEY')
        proxy_url = os.environ.get('OPENAI_HTTP_PROXY')
        
        if not api_key:
            return {
                'statusCode': 500,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'OpenAI API key not configured'})
            }
        
        # Process participants in batches
        batch_size = 5
        all_results = []
        
        for i in range(0, len(raw_participants), batch_size):
            batch = raw_participants[i:i + batch_size]
            batch_results = process_batch(batch, api_key, proxy_url)
            all_results.extend(batch_results)
        
        # Analyze clusters
        clusters_summary = analyze_clusters(all_results)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'participants': all_results,
                'clusters': clusters_summary,
                'total': len(all_results)
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Server error: {str(e)}'})
        }


def process_batch(participants: List[Dict], api_key: str, proxy_url: Optional[str]) -> List[Dict]:
    """Process a batch of participants through OpenAI API"""
    
    # Define Pydantic models
    class Participant(BaseModel):
        id: str
        post_url: str
        name: str
        role: str = Field(max_length=50)
        description: str = Field(max_length=200)
        cluster: str
        tags: List[str] = Field(min_items=3, max_items=7)
    
    class ParticipantBatch(BaseModel):
        participants: List[Participant]
    
    # Prepare system prompt
    system_prompt = """Ты эксперт по анализу и кластеризации участников предпринимательского сообщества.
    Твоя задача - извлечь структурированную информацию из текста знакомства и определить кластер.
    
    Возможные кластеры:
    - IT (технологии, разработка, AI, ML, SaaS)
    - E-commerce (маркетплейсы, торговля, продажи)
    - Финансы (финтех, инвестиции, банкинг)
    - Образование (обучение, курсы, EdTech)
    - Медицина (здоровье, биотех, фарма)
    - Производство (промышленность, строительство)
    - Консалтинг (стратегия, HR, юридические услуги)
    - Маркетинг (реклама, PR, SMM)
    - Другое
    
    Из текста извлеки:
    1. Имя (полное имя человека)
    2. Роль (краткое описание должности/роли, до 50 символов)
    3. Описание (основная деятельность, до 200 символов)
    4. Кластер (один из указанных выше)
    5. Теги (массив ключевых навыков/интересов, 3-7 тегов)
    """
    
    # Prepare user prompt with batch
    user_prompt = "Проанализируй следующих участников:\n\n"
    for i, p in enumerate(participants):
        user_prompt += f"Участник {i+1}:\n"
        user_prompt += f"ID: {p.get('authorId', 'unknown')}\n"
        user_prompt += f"Ссылка: {p.get('messageLink', '')}\n"
        user_prompt += f"Текст: {p.get('text', '')}\n\n"
    
    # Setup proxy if needed
    http_client = None
    if proxy_url:
        http_client = httpx.Client(proxies=proxy_url)
    
    try:
        # Create OpenAI client
        client = OpenAI(api_key=api_key, http_client=http_client)
        
        # Make structured output request
        completion = client.beta.chat.completions.parse(
            model="gpt-4o-2024-08-06",
            messages=[
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt}
            ],
            response_format=ParticipantBatch,
            max_tokens=2000,
            temperature=0
        )
        
        # Get parsed result
        batch = completion.choices[0].message.parsed
        
        # Convert to dict list
        return [p.model_dump() for p in batch.participants]
        
    except Exception as e:
        print(f"OpenAI API error: {str(e)}")
        # Return empty result on error
        return []


def analyze_clusters(participants: List[Dict]) -> Dict[str, int]:
    """Analyze and count participants by cluster"""
    clusters = {}
    for p in participants:
        cluster = p.get('cluster', 'Другое')
        clusters[cluster] = clusters.get(cluster, 0) + 1
    return clusters