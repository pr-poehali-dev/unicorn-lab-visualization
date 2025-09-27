import json
import os
import psycopg2
from typing import Dict, Any, List
import openai
import httpx
from datetime import datetime

# Система тегов для предпринимателей
ENTREPRENEUR_TAGS = {
    'industry': [
        'IT/Software', 'E-commerce', 'EdTech', 'FinTech', 'HealthTech',
        'FoodTech', 'PropTech', 'Marketing', 'Консалтинг', 'Производство',
        'Услуги', 'Торговля', 'HoReCa', 'Логистика', 'Строительство',
        'Медиа', 'Развлечения', 'Спорт/Фитнес', 'Красота', 'Образование'
    ],
    'skills': [
        'Продажи', 'Маркетинг', 'SMM', 'Разработка', 'Дизайн',
        'Управление', 'Финансы', 'Юридические вопросы', 'HR', 'PR',
        'Аналитика', 'Стратегия', 'Операции', 'Продукт', 'Data Science'
    ],
    'stage': [
        'Идея', 'MVP', 'Первые клиенты', 'Растущий бизнес',
        'Масштабирование', 'Зрелый бизнес', 'Экзит'
    ],
    'needs': [
        'Инвестиции', 'Партнёры', 'Клиенты', 'Сотрудники', 'Менторство',
        'Экспертиза', 'Подрядчики', 'Соинвесторы', 'Каналы продаж', 'Нетворкинг'
    ],
    'offers': [
        'Инвестирую', 'Менторство', 'Экспертиза', 'Разработка', 'Маркетинг',
        'Продажи B2B', 'Связи', 'Производство', 'Логистика', 'Юридическая помощь'
    ],
    'model': [
        'B2B', 'B2C', 'B2B2C', 'Marketplace', 'SaaS', 'Subscription',
        'Freemium', 'Агентская модель', 'Франшиза'
    ]
}

ALL_TAGS = [tag for category in ENTREPRENEUR_TAGS.values() for tag in category]

def calculate_connection_strength(tags1: List[str], tags2: List[str]) -> float:
    """Рассчитывает силу связи между двумя наборами тегов"""
    max_strength = 0.0
    
    # Прямые совпадения тегов
    common_tags = set(tags1) & set(tags2)
    if common_tags:
        max_strength = max(max_strength, 0.5 + len(common_tags) * 0.1)
    
    # Взаимодополняющие пары
    complementary_pairs = [
        ('Инвестиции', 'Инвестирую'),
        ('Клиенты', 'Продажи B2B'),
        ('Сотрудники', 'HR'),
        ('Подрядчики', 'Разработка'),
        ('Маркетинг', 'SMM'),
        ('Юридические вопросы', 'Юридическая помощь'),
        ('Менторство', 'Идея'),
        ('Экспертиза', 'MVP')
    ]
    
    for tag1, tag2 in complementary_pairs:
        if (tag1 in tags1 and tag2 in tags2) or (tag2 in tags1 and tag1 in tags2):
            max_strength = max(max_strength, 0.9)
    
    # Теги из одной категории
    for category, category_tags in ENTREPRENEUR_TAGS.items():
        tags1_in_cat = [t for t in tags1 if t in category_tags]
        tags2_in_cat = [t for t in tags2 if t in category_tags]
        
        if tags1_in_cat and tags2_in_cat:
            if category == 'industry':
                common = set(tags1_in_cat) & set(tags2_in_cat)
                if common:
                    max_strength = max(max_strength, 0.8)
            else:
                max_strength = max(max_strength, 0.4)
    
    return min(max_strength, 1.0)

def should_connect(tags1: List[str], tags2: List[str]) -> bool:
    """Определяет, должны ли два участника быть связаны"""
    return calculate_connection_strength(tags1, tags2) >= 0.5

def analyze_with_gpt(text: str, existing_tags: List[str] = None) -> Dict[str, Any]:
    """Анализирует текст с помощью GPT и возвращает структурированные данные"""
    # Инициализация клиента с прокси, если задан
    api_key = os.environ.get('OPENAI_API_KEY')
    proxy_url = os.environ.get('OPENAI_HTTP_PROXY')
    
    if proxy_url:
        # Используем httpx клиент с прокси
        import httpx
        http_client = httpx.Client(proxies=proxy_url)
        client = openai.OpenAI(api_key=api_key, http_client=http_client)
    else:
        client = openai.OpenAI(api_key=api_key)
    
    # Формируем список всех доступных тегов
    tags_by_category = "\n".join([
        f"{category}: {', '.join(tags)}"
        for category, tags in ENTREPRENEUR_TAGS.items()
    ])
    
    prompt = f"""Проанализируй пост предпринимателя из сообщества и извлеки информацию.

ДОСТУПНЫЕ ТЕГИ (выбирай ТОЛЬКО из этого списка, от 3 до 15 тегов):
{tags_by_category}

Текст поста:
{text}

Верни JSON с полями:
- name: имя человека
- role: роль/должность (кратко)
- cluster: основная сфера (IT, Маркетинг, Финансы, Производство, Услуги, Консалтинг, E-commerce, EdTech, HealthTech, Other)
- description: краткое описание (1-2 предложения)
- goal: что ищет в сообществе (1 предложение)
- tags: массив тегов СТРОГО из предоставленного списка (3-15 штук)"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Ты помощник для анализа постов предпринимателей. Возвращай только валидный JSON без markdown разметки."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        result = json.loads(response.choices[0].message.content)
        
        # Валидация тегов - оставляем только те, что есть в списке
        if 'tags' in result:
            result['tags'] = [tag for tag in result['tags'] if tag in ALL_TAGS]
        
        return result
    except Exception as e:
        print(f"GPT Error: {str(e)}")
        return {
            "cluster": "Other",
            "description": text[:200] + "..." if len(text) > 200 else text,
            "goal": "",
            "tags": []
        }

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Import Telegram participants with AI analysis and smart connections
    Args: event with participants array
    Returns: HTTP response with import statistics
    '''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': ''
        }
    
    if method == 'POST':
        try:
            body = json.loads(event.get('body', '{}'))
            participants = body.get('participants', [])
            
            if not participants:
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'No participants provided'})
                }
            
            conn = psycopg2.connect(os.environ['DATABASE_URL'])
            cur = conn.cursor()
            
            imported_count = 0
            updated_count = 0
            processed_participants = []
            cluster_count = {}
            
            # Обрабатываем участников
            for participant in participants:
                try:
                    telegram_id = str(participant.get('authorId', ''))
                    post_url = participant.get('messageLink', '')
                    text = participant.get('text', '')
                    
                    # Анализируем текст с помощью GPT
                    gpt_result = analyze_with_gpt(text)
                    
                    name = gpt_result.get('name', participant.get('author', 'Unknown'))
                    role = gpt_result.get('role', '')
                    cluster = gpt_result.get('cluster', 'Other')
                    description = gpt_result.get('description', '')
                    goal = gpt_result.get('goal', '')
                    tags = gpt_result.get('tags', [])
                    
                    cluster_count[cluster] = cluster_count.get(cluster, 0) + 1
                    
                    # Проверяем существование
                    cur.execute(
                        "SELECT id, tags FROM t_p95295728_unicorn_lab_visualiz.entrepreneurs WHERE telegram_id = %s OR post_url = %s",
                        (telegram_id, post_url)
                    )
                    existing = cur.fetchone()
                    
                    if existing:
                        entrepreneur_id = existing[0]
                        cur.execute("""
                            UPDATE t_p95295728_unicorn_lab_visualiz.entrepreneurs 
                            SET name = %s, role = %s, cluster = %s, 
                                description = %s, goal = %s, tags = %s,
                                post_url = %s, updated_at = CURRENT_TIMESTAMP
                            WHERE id = %s
                        """, (name, role, cluster, description, goal, tags, post_url, entrepreneur_id))
                        updated_count += 1
                    else:
                        cur.execute("""
                            INSERT INTO t_p95295728_unicorn_lab_visualiz.entrepreneurs 
                            (telegram_id, name, role, cluster, description, goal, tags, post_url)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            RETURNING id
                        """, (telegram_id, name, role, cluster, description, goal, tags, post_url))
                        entrepreneur_id = cur.fetchone()[0]
                        imported_count += 1
                    
                    processed_participants.append({
                        'id': entrepreneur_id,
                        'tags': tags
                    })
                    
                except Exception as e:
                    print(f"Error processing participant: {str(e)}")
                    continue
            
            # Создаем умные связи между участниками
            connections_created = 0
            for i, p1 in enumerate(processed_participants):
                for p2 in processed_participants[i+1:]:
                    if should_connect(p1['tags'], p2['tags']):
                        weight = calculate_connection_strength(p1['tags'], p2['tags'])
                        
                        # Проверяем, нет ли уже такой связи
                        cur.execute("""
                            SELECT id FROM t_p95295728_unicorn_lab_visualiz.connections 
                            WHERE (source_id = %s AND target_id = %s) 
                               OR (source_id = %s AND target_id = %s)
                        """, (p1['id'], p2['id'], p2['id'], p1['id']))
                        
                        if not cur.fetchone():
                            cur.execute("""
                                INSERT INTO t_p95295728_unicorn_lab_visualiz.connections (source_id, target_id, weight)
                                VALUES (%s, %s, %s)
                            """, (p1['id'], p2['id'], weight))
                            connections_created += 1
            
            conn.commit()
            cur.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'imported': imported_count,
                    'updated': updated_count,
                    'connections_created': connections_created,
                    'clusters': cluster_count
                })
            }
            
        except Exception as e:
            return {
                'statusCode': 500,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': str(e)})
            }
    
    return {
        'statusCode': 405,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'})
    }