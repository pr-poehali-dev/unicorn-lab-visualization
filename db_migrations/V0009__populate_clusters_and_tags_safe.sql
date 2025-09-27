-- Заполнение таблиц кластеров и тегов начальными данными с проверкой существования

-- Вставка кластеров
INSERT INTO t_p95295728_unicorn_lab_visualiz.clusters (name, color, display_order) VALUES
('IT', '#3b82f6', 1),
('Маркетинг', '#ec4899', 2),
('Финансы', '#10b981', 3),
('Производство', '#f59e0b', 4),
('Услуги', '#8b5cf6', 5),
('Консалтинг', '#06b6d4', 6),
('E-commerce', '#f43f5e', 7),
('EdTech', '#6366f1', 8),
('HealthTech', '#14b8a6', 9),
('FoodTech', '#f97316', 10),
('PropTech', '#84cc16', 11),
('Other', '#6b7280', 12)
ON CONFLICT (name) DO NOTHING;

-- Вставка категорий тегов
INSERT INTO t_p95295728_unicorn_lab_visualiz.tag_categories (key, name, display_order) VALUES
('industry', 'Отрасли', 1),
('skills', 'Навыки', 2),
('stage', 'Стадия бизнеса', 3),
('needs', 'Что ищут', 4),
('offers', 'Что предлагают', 5),
('model', 'Модель бизнеса', 6)
ON CONFLICT (key) DO NOTHING;

-- Вставка тегов с использованием CTE для получения category_id
WITH category_industry AS (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'industry'),
     category_skills AS (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'skills'),
     category_stage AS (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'stage'),
     category_needs AS (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'needs'),
     category_offers AS (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'offers'),
     category_model AS (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'model')

-- Отрасли
INSERT INTO t_p95295728_unicorn_lab_visualiz.tags (name, category_id, display_order)
SELECT tag, (SELECT id FROM category_industry), row_number() OVER (ORDER BY tag)
FROM unnest(ARRAY[
    'IT/Software', 'E-commerce', 'EdTech', 'FinTech', 'HealthTech',
    'FoodTech', 'PropTech', 'Marketing', 'Консалтинг', 'Производство',
    'Услуги', 'Торговля', 'HoReCa', 'Логистика', 'Строительство'
]) AS tag
ON CONFLICT (name) DO NOTHING;

-- Навыки
WITH category_skills AS (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'skills')
INSERT INTO t_p95295728_unicorn_lab_visualiz.tags (name, category_id, display_order)
SELECT tag, (SELECT id FROM category_skills), row_number() OVER (ORDER BY tag)
FROM unnest(ARRAY[
    'Продажи', 'Маркетинг', 'SMM', 'Разработка', 'Дизайн',
    'Управление', 'Финансы', 'Юридические вопросы', 'HR', 'PR',
    'Аналитика', 'Стратегия', 'Операции', 'Продукт', 'Data Science'
]) AS tag
ON CONFLICT (name) DO NOTHING;

-- Стадия бизнеса
WITH category_stage AS (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'stage')
INSERT INTO t_p95295728_unicorn_lab_visualiz.tags (name, category_id, display_order)
SELECT tag, (SELECT id FROM category_stage), row_number() OVER (ORDER BY tag)
FROM unnest(ARRAY[
    'Идея', 'MVP', 'Первые клиенты', 'Растущий бизнес',
    'Масштабирование', 'Зрелый бизнес', 'Экзит'
]) AS tag
ON CONFLICT (name) DO NOTHING;

-- Что ищут
WITH category_needs AS (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'needs')
INSERT INTO t_p95295728_unicorn_lab_visualiz.tags (name, category_id, display_order)
SELECT tag, (SELECT id FROM category_needs), row_number() OVER (ORDER BY tag)
FROM unnest(ARRAY[
    'Инвестиции', 'Партнёры', 'Клиенты', 'Сотрудники', 'Менторство',
    'Экспертиза', 'Подрядчики', 'Соинвесторы', 'Каналы продаж', 'Нетворкинг'
]) AS tag
ON CONFLICT (name) DO NOTHING;

-- Что предлагают
WITH category_offers AS (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'offers')
INSERT INTO t_p95295728_unicorn_lab_visualiz.tags (name, category_id, display_order)
SELECT tag, (SELECT id FROM category_offers), row_number() OVER (ORDER BY tag)
FROM unnest(ARRAY[
    'Инвестирую', 'Менторство', 'Экспертиза', 'Разработка', 'Маркетинг',
    'Продажи B2B', 'Связи', 'Производство', 'Логистика', 'Юридическая помощь'
]) AS tag
ON CONFLICT (name) DO NOTHING;

-- Модель бизнеса  
WITH category_model AS (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'model')
INSERT INTO t_p95295728_unicorn_lab_visualiz.tags (name, category_id, display_order)
SELECT tag, (SELECT id FROM category_model), row_number() OVER (ORDER BY tag)
FROM unnest(ARRAY[
    'B2B', 'B2C', 'B2B2C', 'Marketplace', 'SaaS',
    'Subscription', 'Freemium', 'Агентская модель', 'Франшиза'
]) AS tag
ON CONFLICT (name) DO NOTHING;