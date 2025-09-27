-- Добавление колонки post_url в таблицу entrepreneurs
ALTER TABLE entrepreneurs 
ADD COLUMN post_url VARCHAR(500) UNIQUE;

-- Добавляем индекс для быстрого поиска по URL
CREATE INDEX idx_entrepreneurs_post_url ON entrepreneurs(post_url);