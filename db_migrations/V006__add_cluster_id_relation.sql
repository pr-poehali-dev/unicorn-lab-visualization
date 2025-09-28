-- Добавляем колонку cluster_id в таблицу entrepreneurs
ALTER TABLE t_p95295728_unicorn_lab_visualiz.entrepreneurs 
ADD COLUMN cluster_id INTEGER;

-- Добавляем foreign key constraint
ALTER TABLE t_p95295728_unicorn_lab_visualiz.entrepreneurs
ADD CONSTRAINT fk_entrepreneur_cluster
FOREIGN KEY (cluster_id) REFERENCES t_p95295728_unicorn_lab_visualiz.tags(id);

-- Заполняем cluster_id на основе существующих текстовых значений cluster
UPDATE t_p95295728_unicorn_lab_visualiz.entrepreneurs e
SET cluster_id = t.id
FROM t_p95295728_unicorn_lab_visualiz.tags t
JOIN t_p95295728_unicorn_lab_visualiz.tag_categories tc ON t.category_id = tc.id
WHERE tc.key = 'cluster' 
  AND t.name = e.cluster
  AND e.cluster IS NOT NULL;

-- Создаем индекс для улучшения производительности
CREATE INDEX idx_entrepreneurs_cluster_id 
ON t_p95295728_unicorn_lab_visualiz.entrepreneurs(cluster_id);