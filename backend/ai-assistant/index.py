import json
import os
import psycopg2
from openai import OpenAI
from typing import Dict, List, Any, Optional, Tuple
from pydantic import BaseModel, Field

class AssistantResponse(BaseModel):
    """Structured response from AI assistant"""
    completion_text: str = Field(description="Assistant's response text")
    related_users_ids: List[str] = Field(description="IDs of entrepreneurs related to the response", default=[])

class ChatMessage(BaseModel):
    """Chat message structure"""
    role: str = Field(pattern="^(user|assistant)$")
    content: str

class TelegramMessage(BaseModel):
    """Telegram message structure"""
    message_id: int
    text: Optional[str] = None
    chat: Dict[str, Any]
    from_user: Optional[Dict[str, Any]] = Field(None, alias="from")

class TelegramUpdate(BaseModel):
    """Telegram webhook update"""
    update_id: int
    message: Optional[TelegramMessage] = None

def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_all_entrepreneurs() -> List[Dict[str, Any]]:
    """Load all entrepreneurs from database"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT 
                e.id,
                e.name,
                e.description,
                e.goal,
                e.post_url
            FROM t_p95295728_unicorn_lab_visualiz.entrepreneurs e
            ORDER BY e.id
        """)
        
        entrepreneurs = []
        for row in cur.fetchall():
            entrepreneurs.append({
                "id": row[0],
                "name": row[1],
                "description": row[2] or "",
                "goal": row[3] or "",
                "post_url": row[4] or ""
            })
        
        return entrepreneurs
        
    finally:
        cur.close()
        conn.close()

def save_telegram_message(chat_id: int, message_id: int, user_id: Optional[int], role: str, content: str) -> None:
    """Save message to database"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            INSERT INTO t_p95295728_unicorn_lab_visualiz.telegram_messages 
            (chat_id, message_id, user_id, role, content)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (chat_id, message_id) DO NOTHING
        """, (chat_id, message_id, user_id, role, content))
        conn.commit()
    finally:
        cur.close()
        conn.close()

def get_telegram_history(chat_id: int, limit: int = 20) -> List[ChatMessage]:
    """Load chat history from database"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT role, content
            FROM t_p95295728_unicorn_lab_visualiz.telegram_messages
            WHERE chat_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """, (chat_id, limit))
        
        messages = []
        for row in reversed(cur.fetchall()):
            messages.append(ChatMessage(role=row[0], content=row[1]))
        
        return messages
        
    finally:
        cur.close()
        conn.close()

def create_system_prompt(entrepreneurs: List[Dict[str, Any]]) -> str:
    """Create system prompt with all entrepreneurs data"""
    base_prompt = """Ты - AI ассистент для поиска и анализа участников сообщества предпринимателей.

БАЗА ДАННЫХ УЧАСТНИКОВ:
"""
    
    for e in entrepreneurs:
        base_prompt += f"\nID: {str(e['id'])}\nИмя: {e['name']}\nОписание: {e['description']}\nЦель: {e['goal']}\n---"
    
    base_prompt += """

ТВОИ ЗАДАЧИ:
1. Помогать находить подходящих участников по запросам пользователя
2. Анализировать связи и возможности для сотрудничества
3. Давать рекомендации по нетворкингу

ВАЖНЫЕ ПРАВИЛА ОТВЕТА:
- В тексте ответа НИКОГДА не упоминай ID участников - это внутренние технические данные
- Используй ТОЛЬКО имена участников (например: "Александр Иванов", "Мария Петрова")
- Будь дружелюбным и говори простым языком, как личный помощник
- Объясняй, почему именно эти люди подходят под запрос
- Можешь предлагать неочевидные связи и синергии
- Структурируй ответ: сначала кратко, потом детали про каждого

ТЕХНИЧЕСКИЕ ПРАВИЛА (не для текста):
- В поле related_users_ids возвращай ID найденных участников для системы
- Если не нашел подходящих - верни пустой список related_users_ids
- related_users_ids используется только для подсветки на графе, не упоминай это в тексте

ПРИМЕРЫ ХОРОШИХ ОТВЕТОВ:
"Нашел 3 отличных кандидата для вашего AI проекта:

**Иван Сидоров** - разработчик с опытом в машинном обучении, ищет команду для стартапа.

**Елена Козлова** - продакт-менеджер в сфере AI, может помочь с продуктовой стратегией.

**Петр Николаев** - инвестор, активно вкладывается в AI проекты на ранних стадиях."

ФОРМАТ ОТВЕТА:
{
    "completion_text": "Твой текстовый ответ БЕЗ упоминания ID",
    "related_users_ids": ["141", "142", "143"]  // ID для системы, не упоминать в тексте
}"""
    
    return base_prompt

def get_openai_client() -> OpenAI:
    """Initialize OpenAI client with proxy if needed"""
    api_key = os.environ.get('OPENAI_API_KEY')
    proxy_url = os.environ.get('OPENAI_HTTP_PROXY')
    
    http_client = None
    if proxy_url:
        import httpx
        http_client = httpx.Client(proxies=proxy_url)
        print(f"Using proxy: {proxy_url}")
    else:
        print("WARNING: No proxy configured, OpenAI might be blocked")
    
    return OpenAI(api_key=api_key, http_client=http_client)

def process_ai_request(messages: List[ChatMessage]) -> Tuple[str, List[str], List[Dict[str, Any]]]:
    """Core AI processing logic"""
    entrepreneurs = get_all_entrepreneurs()
    if not entrepreneurs:
        raise Exception("No entrepreneurs found in database")
    
    system_prompt = create_system_prompt(entrepreneurs)
    client = get_openai_client()
    
    openai_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages[-20:]:
        openai_messages.append({"role": msg.role, "content": msg.content})
    
    completion = client.beta.chat.completions.parse(
        model="gpt-5",
        messages=openai_messages,
        response_format=AssistantResponse
    )
    
    assistant_response = completion.choices[0].message.parsed
    return (assistant_response.completion_text, assistant_response.related_users_ids, entrepreneurs)

def format_response_for_telegram(
    completion_text: str, 
    related_users_ids: List[str],
    entrepreneurs: List[Dict[str, Any]]
) -> str:
    """Format response for Telegram with hyperlinks"""
    entrepreneurs_map = {str(e['id']): e for e in entrepreneurs}
    formatted_text = completion_text
    
    for user_id in related_users_ids:
        entrepreneur = entrepreneurs_map.get(user_id)
        if entrepreneur and entrepreneur.get('post_url'):
            name = entrepreneur['name']
            post_url = entrepreneur['post_url']
            formatted_text = formatted_text.replace(f"**{name}**", f"[{name}]({post_url})")
            formatted_text = formatted_text.replace(name, f"[{name}]({post_url})")
    
    return formatted_text

def send_telegram_message(chat_id: int, text: str, reply_to_message_id: Optional[int] = None) -> Dict[str, Any]:
    """Send message to Telegram via Bot API"""
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    if not bot_token:
        raise Exception("TELEGRAM_BOT_TOKEN not configured")
    
    import requests
    
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown",
        "disable_web_page_preview": False
    }
    
    if reply_to_message_id:
        payload["reply_to_message_id"] = reply_to_message_id
    
    response = requests.post(url, json=payload)
    
    if not response.ok:
        print(f"Telegram API error: {response.text}")
        raise Exception(f"Failed to send Telegram message: {response.status_code}")
    
    return response.json()

def edit_telegram_message(chat_id: int, message_id: int, text: str) -> None:
    """Edit existing Telegram message"""
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN')
    if not bot_token:
        raise Exception("TELEGRAM_BOT_TOKEN not configured")
    
    import requests
    
    url = f"https://api.telegram.org/bot{bot_token}/editMessageText"
    payload = {
        "chat_id": chat_id,
        "message_id": message_id,
        "text": text,
        "parse_mode": "Markdown",
        "disable_web_page_preview": False
    }
    
    response = requests.post(url, json=payload)
    
    if not response.ok:
        print(f"Telegram edit error: {response.text}")

def handle_telegram_webhook(body_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle Telegram webhook request with animated status messages"""
    import time
    import threading
    
    print(f"Received Telegram update: {json.dumps(body_data)}")
    
    update = TelegramUpdate(**body_data)
    
    if not update.message or not update.message.text:
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'ok': True})
        }
    
    chat_id = update.message.chat['id']
    user_message = update.message.text
    message_id = update.message.message_id
    user_id = update.message.from_user.get('id') if update.message.from_user else None
    
    print(f"Processing Telegram message from chat_id={chat_id}, user_id={user_id}: {user_message}")
    
    save_telegram_message(chat_id, message_id, user_id, 'user', user_message)
    
    loading_texts = [
        "Думаю...",
        "Изучаю участников...",
        "Подождите одну минуту...",
        "Выявляю совпадения...",
        "Формирую кластеры...",
        "Выстраиваю связи...",
        "Формирую ответ...",
    ]
    
    status_message = send_telegram_message(chat_id, loading_texts[0], reply_to_message_id=message_id)
    status_message_id = status_message['result']['message_id']
    
    stop_animation = threading.Event()
    
    def animate_status():
        index = 0
        while not stop_animation.is_set():
            time.sleep(5)
            if not stop_animation.is_set():
                index = (index + 1) % len(loading_texts)
                edit_telegram_message(chat_id, status_message_id, loading_texts[index])
    
    animation_thread = threading.Thread(target=animate_status, daemon=True)
    animation_thread.start()
    
    try:
        history = get_telegram_history(chat_id, limit=20)
        messages = history + [ChatMessage(role="user", content=user_message)]
        
        completion_text, related_users_ids, entrepreneurs = process_ai_request(messages)
        formatted_text = format_response_for_telegram(completion_text, related_users_ids, entrepreneurs)
        
        stop_animation.set()
        time.sleep(0.5)
        
        edit_telegram_message(chat_id, status_message_id, formatted_text)
        
        save_telegram_message(chat_id, status_message_id, None, 'assistant', completion_text)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'ok': True})
        }
        
    except Exception as e:
        stop_animation.set()
        time.sleep(0.5)
        
        error_text = "По вашему запросу ничего не нашёл, попробуйте переформулировать запрос и отправить еще один."
        edit_telegram_message(chat_id, status_message_id, error_text)
        
        save_telegram_message(chat_id, status_message_id, None, 'assistant', error_text)
        
        print(f"Error in Telegram handler: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'ok': False, 'error': str(e)})
        }

def handle_web_chat(body_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle web chat request"""
    try:
        messages_data = body_data.get('messages', [])
        messages = [ChatMessage(**msg) for msg in messages_data]
        
        completion_text, related_users_ids, _ = process_ai_request(messages)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'completion_text': completion_text,
                'related_users_ids': related_users_ids
            }, ensure_ascii=False)
        }
    except Exception as e:
        print(f"Error in web chat handler: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'completion_text': 'По вашему запросу ничего не нашёл, попробуйте переформулировать запрос и отправить еще один.',
                'related_users_ids': []
            }, ensure_ascii=False)
        }

def is_telegram_update(body_data: Dict[str, Any]) -> bool:
    """Check if request is from Telegram webhook"""
    return 'update_id' in body_data and 'message' in body_data

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Universal AI Assistant - handles both web chat and Telegram webhook
    Args: event with httpMethod, body (web: {messages}, telegram: {update_id, message})
    Returns: HTTP response (web: completion + IDs, telegram: ok status)
    """
    method: str = event.get('httpMethod', 'POST')
    
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
        body_data = json.loads(event.get('body', '{}'))
        
        if is_telegram_update(body_data):
            return handle_telegram_webhook(body_data)
        else:
            return handle_web_chat(body_data)
        
    except Exception as e:
        print(f"Error in AI assistant: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Assistant error: {str(e)}'}, ensure_ascii=False)
        }