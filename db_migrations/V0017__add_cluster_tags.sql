-- Создаем категорию для кластеров
INSERT INTO t_p95295728_unicorn_lab_visualiz.tag_categories (key, name, display_order)
VALUES ('cluster', 'Кластеры', 7)
ON CONFLICT (key) DO NOTHING;

-- Добавляем теги-кластеры на основе существующих данных
INSERT INTO t_p95295728_unicorn_lab_visualiz.tags (name, category_id)
SELECT DISTINCT cluster, (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'cluster')
FROM t_p95295728_unicorn_lab_visualiz.entrepreneurs
WHERE cluster IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- Добавляем дополнительные кластеры если их нет
INSERT INTO t_p95295728_unicorn_lab_visualiz.tags (name, category_id)
VALUES 
    ('IT', (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'cluster')),
    ('Финансы', (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'cluster')),
    ('Маркетинг', (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'cluster')),
    ('Производство', (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'cluster')),
    ('Услуги', (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'cluster')),
    ('Образование', (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'cluster')),
    ('Здоровье', (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'cluster')),
    ('Недвижимость', (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'cluster')),
    ('Другое', (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE key = 'cluster'))
ON CONFLICT (name) DO NOTHING;