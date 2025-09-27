-- Создание таблицы участников
CREATE TABLE IF NOT EXISTS t_p95295728_unicorn_lab_visualiz.entrepreneurs (
    id SERIAL PRIMARY KEY,
    telegram_id VARCHAR(255) UNIQUE,
    username VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    cluster VARCHAR(100),
    description TEXT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы связей между участниками
CREATE TABLE IF NOT EXISTS t_p95295728_unicorn_lab_visualiz.connections (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    connection_type VARCHAR(50) DEFAULT 'collaboration',
    strength INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES t_p95295728_unicorn_lab_visualiz.entrepreneurs(id),
    FOREIGN KEY (target_id) REFERENCES t_p95295728_unicorn_lab_visualiz.entrepreneurs(id),
    UNIQUE(source_id, target_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_entrepreneurs_name ON t_p95295728_unicorn_lab_visualiz.entrepreneurs(name);
CREATE INDEX IF NOT EXISTS idx_entrepreneurs_cluster ON t_p95295728_unicorn_lab_visualiz.entrepreneurs(cluster);
CREATE INDEX IF NOT EXISTS idx_entrepreneurs_tags ON t_p95295728_unicorn_lab_visualiz.entrepreneurs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_connections_source ON t_p95295728_unicorn_lab_visualiz.connections(source_id);
CREATE INDEX IF NOT EXISTS idx_connections_target ON t_p95295728_unicorn_lab_visualiz.connections(target_id);