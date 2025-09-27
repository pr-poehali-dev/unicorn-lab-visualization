-- Добавляем колонку emoji для предпринимателей
ALTER TABLE t_p95295728_unicorn_lab_visualiz.entrepreneurs 
ADD COLUMN emoji VARCHAR(10) DEFAULT '😊';

-- Обновляем существующие записи с дефолтными emoji
UPDATE t_p95295728_unicorn_lab_visualiz.entrepreneurs 
SET emoji = '🚀' 
WHERE emoji IS NULL;