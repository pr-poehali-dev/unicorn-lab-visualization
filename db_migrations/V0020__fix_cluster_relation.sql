-- Сначала удаляем неправильный constraint
ALTER TABLE t_p95295728_unicorn_lab_visualiz.entrepreneurs 
DROP CONSTRAINT IF EXISTS fk_entrepreneur_cluster;

-- Добавляем недостающие кластеры в таблицу clusters
INSERT INTO t_p95295728_unicorn_lab_visualiz.clusters (name, color, display_order) 
VALUES 
    ('Здоровье', '#ec4899', 13),
    ('Недвижимость', '#f59e0b', 14),
    ('Образование', '#3b82f6', 15)
ON CONFLICT (name) DO NOTHING;

-- Обновляем cluster_id на правильные значения из таблицы clusters
UPDATE t_p95295728_unicorn_lab_visualiz.entrepreneurs e
SET cluster_id = c.id
FROM t_p95295728_unicorn_lab_visualiz.clusters c
WHERE e.cluster = c.name;

-- Добавляем правильный foreign key на таблицу clusters
ALTER TABLE t_p95295728_unicorn_lab_visualiz.entrepreneurs
ADD CONSTRAINT fk_entrepreneur_cluster
FOREIGN KEY (cluster_id) REFERENCES t_p95295728_unicorn_lab_visualiz.clusters(id);