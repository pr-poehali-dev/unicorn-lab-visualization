-- Создание таблицы связи между предпринимателями и тегами (многие-ко-многим)
CREATE TABLE entrepreneur_tags (
    id SERIAL PRIMARY KEY,
    entrepreneur_id INTEGER NOT NULL REFERENCES entrepreneurs(id),
    tag_id INTEGER NOT NULL REFERENCES tags(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Уникальное ограничение чтобы избежать дублирования связей
    UNIQUE(entrepreneur_id, tag_id)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_entrepreneur_tags_entrepreneur_id ON entrepreneur_tags(entrepreneur_id);
CREATE INDEX idx_entrepreneur_tags_tag_id ON entrepreneur_tags(tag_id);

-- Добавим комментарии для понимания структуры
COMMENT ON TABLE entrepreneur_tags IS 'Связь многие-ко-многим между предпринимателями и тегами';
COMMENT ON COLUMN entrepreneur_tags.entrepreneur_id IS 'ID предпринимателя';
COMMENT ON COLUMN entrepreneur_tags.tag_id IS 'ID тега';
COMMENT ON COLUMN entrepreneur_tags.created_at IS 'Время создания связи';