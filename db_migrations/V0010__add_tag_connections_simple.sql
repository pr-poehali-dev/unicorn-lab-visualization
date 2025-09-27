-- Добавление умных связей между тегами

-- Взаимодополняющие связи (сильные)
INSERT INTO t_p95295728_unicorn_lab_visualiz.tag_connections (tag1_id, tag2_id, strength, connection_type)
SELECT t1.id, t2.id, 1.0, 'complementary'
FROM t_p95295728_unicorn_lab_visualiz.tags t1, t_p95295728_unicorn_lab_visualiz.tags t2
WHERE t1.name = 'Инвестиции' AND t2.name = 'Инвестирую'
ON CONFLICT DO NOTHING;

INSERT INTO t_p95295728_unicorn_lab_visualiz.tag_connections (tag1_id, tag2_id, strength, connection_type)
SELECT t1.id, t2.id, 0.9, 'complementary'
FROM t_p95295728_unicorn_lab_visualiz.tags t1, t_p95295728_unicorn_lab_visualiz.tags t2
WHERE t1.name = 'Клиенты' AND t2.name = 'Продажи B2B'
ON CONFLICT DO NOTHING;

INSERT INTO t_p95295728_unicorn_lab_visualiz.tag_connections (tag1_id, tag2_id, strength, connection_type)
SELECT t1.id, t2.id, 0.9, 'complementary'
FROM t_p95295728_unicorn_lab_visualiz.tags t1, t_p95295728_unicorn_lab_visualiz.tags t2
WHERE t1.name = 'Сотрудники' AND t2.name = 'HR'
ON CONFLICT DO NOTHING;

INSERT INTO t_p95295728_unicorn_lab_visualiz.tag_connections (tag1_id, tag2_id, strength, connection_type)
SELECT t1.id, t2.id, 0.8, 'complementary'
FROM t_p95295728_unicorn_lab_visualiz.tags t1, t_p95295728_unicorn_lab_visualiz.tags t2
WHERE t1.name = 'Подрядчики' AND t2.name = 'Разработка'
ON CONFLICT DO NOTHING;

INSERT INTO t_p95295728_unicorn_lab_visualiz.tag_connections (tag1_id, tag2_id, strength, connection_type)
SELECT t1.id, t2.id, 0.8, 'complementary'
FROM t_p95295728_unicorn_lab_visualiz.tags t1, t_p95295728_unicorn_lab_visualiz.tags t2
WHERE t1.name = 'Подрядчики' AND t2.name = 'Маркетинг'
ON CONFLICT DO NOTHING;

-- Связи по стадиям
INSERT INTO t_p95295728_unicorn_lab_visualiz.tag_connections (tag1_id, tag2_id, strength, connection_type)
SELECT t1.id, t2.id, 0.8, 'stage_related'
FROM t_p95295728_unicorn_lab_visualiz.tags t1, t_p95295728_unicorn_lab_visualiz.tags t2
WHERE t1.name = 'Идея' AND t2.name = 'Менторство'
ON CONFLICT DO NOTHING;

INSERT INTO t_p95295728_unicorn_lab_visualiz.tag_connections (tag1_id, tag2_id, strength, connection_type)
SELECT t1.id, t2.id, 0.7, 'stage_related'
FROM t_p95295728_unicorn_lab_visualiz.tags t1, t_p95295728_unicorn_lab_visualiz.tags t2
WHERE t1.name = 'MVP' AND t2.name = 'Экспертиза'
ON CONFLICT DO NOTHING;

INSERT INTO t_p95295728_unicorn_lab_visualiz.tag_connections (tag1_id, tag2_id, strength, connection_type)
SELECT t1.id, t2.id, 0.9, 'stage_related'
FROM t_p95295728_unicorn_lab_visualiz.tags t1, t_p95295728_unicorn_lab_visualiz.tags t2
WHERE t1.name = 'Масштабирование' AND t2.name = 'Инвестиции'
ON CONFLICT DO NOTHING;

-- Отраслевые связи
INSERT INTO t_p95295728_unicorn_lab_visualiz.tag_connections (tag1_id, tag2_id, strength, connection_type)
SELECT t1.id, t2.id, 0.7, 'related'
FROM t_p95295728_unicorn_lab_visualiz.tags t1, t_p95295728_unicorn_lab_visualiz.tags t2
WHERE t1.name = 'E-commerce' AND t2.name = 'Логистика'
ON CONFLICT DO NOTHING;

-- Связи по навыкам
INSERT INTO t_p95295728_unicorn_lab_visualiz.tag_connections (tag1_id, tag2_id, strength, connection_type)
SELECT t1.id, t2.id, 0.8, 'related'
FROM t_p95295728_unicorn_lab_visualiz.tags t1, t_p95295728_unicorn_lab_visualiz.tags t2
WHERE t1.name = 'Маркетинг' AND t2.name = 'SMM'
ON CONFLICT DO NOTHING;

INSERT INTO t_p95295728_unicorn_lab_visualiz.tag_connections (tag1_id, tag2_id, strength, connection_type)
SELECT t1.id, t2.id, 0.8, 'related'
FROM t_p95295728_unicorn_lab_visualiz.tags t1, t_p95295728_unicorn_lab_visualiz.tags t2
WHERE t1.name = 'Управление' AND t2.name = 'Стратегия'
ON CONFLICT DO NOTHING;

-- Связи по моделям
INSERT INTO t_p95295728_unicorn_lab_visualiz.tag_connections (tag1_id, tag2_id, strength, connection_type)
SELECT t1.id, t2.id, 0.9, 'related'
FROM t_p95295728_unicorn_lab_visualiz.tags t1, t_p95295728_unicorn_lab_visualiz.tags t2
WHERE t1.name = 'B2B' AND t2.name = 'Продажи B2B'
ON CONFLICT DO NOTHING;