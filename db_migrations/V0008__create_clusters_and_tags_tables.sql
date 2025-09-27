-- Создание таблиц для хранения кластеров и тегов

-- Таблица кластеров
CREATE TABLE IF NOT EXISTS t_p95295728_unicorn_lab_visualiz.clusters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7), -- HEX цвет для визуализации
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица категорий тегов
CREATE TABLE IF NOT EXISTS t_p95295728_unicorn_lab_visualiz.tag_categories (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица тегов
CREATE TABLE IF NOT EXISTS t_p95295728_unicorn_lab_visualiz.tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category_id INTEGER REFERENCES t_p95295728_unicorn_lab_visualiz.tag_categories(id),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица связей между тегами (для умных связей)
CREATE TABLE IF NOT EXISTS t_p95295728_unicorn_lab_visualiz.tag_connections (
    id SERIAL PRIMARY KEY,
    tag1_id INTEGER REFERENCES t_p95295728_unicorn_lab_visualiz.tags(id),
    tag2_id INTEGER REFERENCES t_p95295728_unicorn_lab_visualiz.tags(id),
    strength FLOAT DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
    connection_type VARCHAR(50), -- 'complementary', 'same_category', 'related'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tag1_id, tag2_id)
);

-- Индексы для производительности
CREATE INDEX idx_tags_category ON t_p95295728_unicorn_lab_visualiz.tags(category_id);
CREATE INDEX idx_tag_connections_tags ON t_p95295728_unicorn_lab_visualiz.tag_connections(tag1_id, tag2_id);