import json
import os
import sys
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'ai-assistant'))
from shared_logic import ChatMessage, process_ai_request, format_response_for_telegram

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

def send_telegram_message(chat_id: int, text: str, reply_to_message_id: Optional[int] = None) -> None:
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

def get_user_context(chat_id: int, user_id: Optional[int]) -> list:
    """
    Get conversation context for user (in production, load from DB)
    For now, returns empty context - each message is independent
    """
    # TODO: Implement conversation history storage in database
    # Key format: f"tg_chat_{chat_id}_{user_id}"
    return []

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Telegram Bot Webhook handler
    Args: event with httpMethod, body containing Telegram update
    Returns: HTTP response for Telegram
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
        # Parse Telegram update
        body_data = json.loads(event.get('body', '{}'))
        print(f"Received Telegram update: {json.dumps(body_data)}")
        
        # Validate update structure
        update = TelegramUpdate(**body_data)
        
        # Ignore updates without message or text
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
        
        print(f"Processing message from chat_id={chat_id}, user_id={user_id}: {user_message}")
        
        # Get conversation context (for future: load from DB)
        conversation_history = get_user_context(chat_id, user_id)
        
        # Add current user message
        messages = conversation_history + [
            ChatMessage(role="user", content=user_message)
        ]
        
        # Process AI request using shared logic
        completion_text, related_users_ids, entrepreneurs = process_ai_request(messages)
        
        # Format response for Telegram with hyperlinks
        formatted_text = format_response_for_telegram(
            completion_text,
            related_users_ids,
            entrepreneurs
        )
        
        # Send response to Telegram
        send_telegram_message(chat_id, formatted_text, reply_to_message_id=message_id)
        
        # TODO: Save conversation to database for context
        # save_message(chat_id, user_id, "user", user_message)
        # save_message(chat_id, user_id, "assistant", completion_text)
        
        # Return success to Telegram
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'ok': True})
        }
        
    except Exception as e:
        print(f"Error in Telegram webhook: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Try to send error message to user
        try:
            body_data = json.loads(event.get('body', '{}'))
            if body_data.get('message'):
                chat_id = body_data['message']['chat']['id']
                send_telegram_message(
                    chat_id, 
                    "Извините, произошла ошибка при обработке вашего запроса. Попробуйте позже."
                )
        except:
            pass
        
        # Still return 200 to Telegram to avoid retries
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'ok': False, 'error': str(e)})
        }