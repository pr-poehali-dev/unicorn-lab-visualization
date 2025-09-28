import json
import os
import psycopg2
from openai import OpenAI
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field

class AssistantResponse(BaseModel):
    """Structured response from AI assistant"""
    completion_text: str = Field(description="Assistant's response text")
    related_users_ids: List[int] = Field(description="IDs of entrepreneurs related to the response", default=[])

class ChatMessage(BaseModel):
    """Chat message structure"""
    role: str = Field(pattern="^(user|assistant)$")
    content: str

def get_all_entrepreneurs() -> List[Dict[str, Any]]:
    """Load all entrepreneurs from database"""
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                e.id,
                e.name,
                e.description,
                e.goal
            FROM t_p95295728_unicorn_lab_visualiz.entrepreneurs e
            ORDER BY e.id
        """)
        
        entrepreneurs = []
        for row in cur.fetchall():
            entrepreneurs.append({
                "id": row[0],
                "name": row[1],
                "description": row[2] or "",
                "goal": row[3] or ""
            })
        
        return entrepreneurs
        
    finally:
        cur.close()
        conn.close()

def create_system_prompt(entrepreneurs: List[Dict[str, Any]]) -> str:
    """Create system prompt with all entrepreneurs data"""
    base_prompt = """Ты - AI ассистент для поиска и анализа участников сообщества предпринимателей.

БАЗА ДАННЫХ УЧАСТНИКОВ:
"""
    
    # Add each entrepreneur
    for e in entrepreneurs:
        base_prompt += f"\nID: {e['id']}\nИмя: {e['name']}\nОписание: {e['description']}\nЦель: {e['goal']}\n---"
    
    base_prompt += """

ТВОИ ЗАДАЧИ:
1. Помогать находить подходящих участников по запросам пользователя
2. Анализировать связи и возможности для сотрудничества
3. Давать рекомендации по нетворкингу

ВАЖНЫЕ ПРАВИЛА:
- ВСЕГДА возвращай ID найденных участников в поле related_users_ids
- Если находишь подходящих участников, обязательно укажи их ID
- Объясняй, почему выбрал именно этих людей
- Можешь предлагать неочевидные связи и синергии
- Если не нашел подходящих - верни пустой список related_users_ids

ФОРМАТ ОТВЕТА:
{
    "completion_text": "Твой текстовый ответ с объяснениями",
    "related_users_ids": [141, 142, 143]  // ID найденных участников
}"""
    
    return base_prompt

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AI Assistant for finding entrepreneurs
    Args: event with httpMethod, body containing messages history
    Returns: HTTP response with assistant's answer and related user IDs
    """
    method: str = event.get('httpMethod', 'POST')
    
    # Handle CORS
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
        # Parse request
        body_data = json.loads(event.get('body', '{}'))
        messages_data = body_data.get('messages', [])
        
        # Validate messages
        messages = [ChatMessage(**msg) for msg in messages_data]
        
        # Get all entrepreneurs
        entrepreneurs = get_all_entrepreneurs()
        if not entrepreneurs:
            raise Exception("No entrepreneurs found in database")
        
        # Create system prompt
        system_prompt = create_system_prompt(entrepreneurs)
        
        # Initialize OpenAI client with proxy configuration
        api_key = os.environ.get('OPENAI_API_KEY')
        proxy_url = os.environ.get('OPENAI_HTTP_PROXY')
        
        http_client = None
        if proxy_url:
            import httpx
            http_client = httpx.Client(proxies=proxy_url)
            print(f"Using proxy: {proxy_url}")
        else:
            print("WARNING: No proxy configured, OpenAI might be blocked")
        
        client = OpenAI(api_key=api_key, http_client=http_client)
        
        # Prepare messages for OpenAI
        openai_messages = [{"role": "system", "content": system_prompt}]
        
        # Add chat history (last 20 messages)
        for msg in messages[-20:]:
            openai_messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Get completion with structured output
        completion = client.beta.chat.completions.parse(
            model="gpt-5-nano",  # Using the same model as import-with-clustering
            messages=openai_messages,
            response_format=AssistantResponse
            # temperature not supported for gpt-5-nano
        )
        
        # Parse response
        assistant_response = completion.choices[0].message.parsed
        
        # Return response
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'completion_text': assistant_response.completion_text,
                'related_users_ids': assistant_response.related_users_ids
            }, ensure_ascii=False)
        }
        
    except Exception as e:
        print(f"Error in AI assistant: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'error': f'Assistant error: {str(e)}'
            }, ensure_ascii=False)
        }