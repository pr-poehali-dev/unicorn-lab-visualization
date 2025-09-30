import json
from typing import Dict, Any
from shared_logic import ChatMessage, process_ai_request

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AI Assistant for web chat - finding entrepreneurs
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
        
        # Process AI request using shared logic
        completion_text, related_users_ids, _ = process_ai_request(messages)
        
        # Return response for web
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
        print(f"Error in AI assistant: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'error': f'Assistant error: {str(e)}'
            }, ensure_ascii=False)
        }