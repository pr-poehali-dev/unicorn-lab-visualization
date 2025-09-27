-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
    id SERIAL PRIMARY KEY,
    telegram_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    message_text TEXT,
    message_link TEXT,
    cluster VARCHAR(50),
    tags TEXT[],
    is_forwarded BOOLEAN DEFAULT FALSE,
    is_own BOOLEAN DEFAULT FALSE,
    is_unknown BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_participants_telegram_id ON participants(telegram_id);
CREATE INDEX IF NOT EXISTS idx_participants_cluster ON participants(cluster);
CREATE INDEX IF NOT EXISTS idx_participants_created_at ON participants(created_at);