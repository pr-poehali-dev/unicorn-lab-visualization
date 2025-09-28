-- Добавляем теги для искусственного интеллекта

-- Добавляем в категорию "Навыки"
INSERT INTO t_p95295728_unicorn_lab_visualiz.tags (name, category_id)
VALUES 
    ('AI/ML', (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE name = 'Навыки')),
    ('Искусственный интеллект', (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE name = 'Навыки')),
    ('Machine Learning', (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE name = 'Навыки')),
    ('Нейросети', (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE name = 'Навыки')),
    ('ChatGPT/LLM', (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE name = 'Навыки'))
ON CONFLICT (name) DO NOTHING;

-- Добавляем в категорию "Отрасли"  
INSERT INTO t_p95295728_unicorn_lab_visualiz.tags (name, category_id)
VALUES 
    ('AI/ML решения', (SELECT id FROM t_p95295728_unicorn_lab_visualiz.tag_categories WHERE name = 'Отрасли'))
ON CONFLICT (name) DO NOTHING;