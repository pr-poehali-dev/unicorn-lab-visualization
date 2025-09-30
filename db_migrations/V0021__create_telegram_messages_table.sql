-- Create table for storing Telegram chat history
CREATE TABLE IF NOT EXISTS t_p95295728_unicorn_lab_visualiz.telegram_messages (
    id SERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    message_id BIGINT NOT NULL,
    user_id BIGINT,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Index for fast retrieval by chat_id
    CONSTRAINT idx_telegram_messages_chat_id_created 
        UNIQUE (chat_id, message_id)
);

-- Create index for efficient history queries
CREATE INDEX idx_telegram_messages_chat_created 
    ON t_p95295728_unicorn_lab_visualiz.telegram_messages(chat_id, created_at DESC);

COMMENT ON TABLE t_p95295728_unicorn_lab_visualiz.telegram_messages IS 'Stores Telegram bot conversation history';
COMMENT ON COLUMN t_p95295728_unicorn_lab_visualiz.telegram_messages.chat_id IS 'Telegram chat ID';
COMMENT ON COLUMN t_p95295728_unicorn_lab_visualiz.telegram_messages.message_id IS 'Telegram message ID';
COMMENT ON COLUMN t_p95295728_unicorn_lab_visualiz.telegram_messages.user_id IS 'Telegram user ID who sent the message';
COMMENT ON COLUMN t_p95295728_unicorn_lab_visualiz.telegram_messages.role IS 'Message role: user or assistant';
COMMENT ON COLUMN t_p95295728_unicorn_lab_visualiz.telegram_messages.content IS 'Message text content';