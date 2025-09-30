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

def create_system_prompt(entrepreneurs: List[Dict[str, Any]]) -> str:
    """Create system prompt with all entrepreneurs data"""
    base_prompt = """Ты - AI ассистент для поиска и анализа участников сообщества предпринимателей.

БАЗА ДАННЫХ УЧАСТНИКОВ:
"""
    
    # Add each entrepreneur
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
    """
    Core AI processing logic - works for both web chat and Telegram
    
    Args:
        messages: List of chat messages
        
    Returns:
        Tuple of (completion_text, related_users_ids, entrepreneurs_data)
    """
    # Get all entrepreneurs
    entrepreneurs = get_all_entrepreneurs()
    if not entrepreneurs:
        raise Exception("No entrepreneurs found in database")
    
    # Create system prompt
    system_prompt = create_system_prompt(entrepreneurs)
    
    # Initialize OpenAI client
    client = get_openai_client()
    
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
        model="gpt-5",
        messages=openai_messages,
        response_format=AssistantResponse
    )
    
    # Parse response
    assistant_response = completion.choices[0].message.parsed
    
    return (
        assistant_response.completion_text,
        assistant_response.related_users_ids,
        entrepreneurs
    )

def format_response_for_telegram(
    completion_text: str, 
    related_users_ids: List[str],
    entrepreneurs: List[Dict[str, Any]]
) -> str:
    """
    Format response for Telegram with hyperlinks to user profiles
    
    Args:
        completion_text: AI response text
        related_users_ids: IDs of related entrepreneurs
        entrepreneurs: Full list of entrepreneurs data
        
    Returns:
        Formatted text with Telegram markdown hyperlinks
    """
    # Create mapping of entrepreneurs by ID
    entrepreneurs_map = {str(e['id']): e for e in entrepreneurs}
    
    # Replace entrepreneur names with hyperlinks
    formatted_text = completion_text
    
    for user_id in related_users_ids:
        entrepreneur = entrepreneurs_map.get(user_id)
        if entrepreneur and entrepreneur.get('post_url'):
            name = entrepreneur['name']
            post_url = entrepreneur['post_url']
            
            # Replace name with markdown hyperlink [name](url)
            formatted_text = formatted_text.replace(
                f"**{name}**",
                f"[{name}]({post_url})"
            )
            formatted_text = formatted_text.replace(
                name,
                f"[{name}]({post_url})"
            )
    
    return formatted_text