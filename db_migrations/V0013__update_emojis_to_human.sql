-- Обновляем существующие эмодзи на человеческие
UPDATE t_p95295728_unicorn_lab_visualiz.entrepreneurs 
SET emoji = CASE
    WHEN emoji = '💰' THEN '👨‍💼'
    WHEN emoji = '💼' THEN '👨‍💼'
    WHEN emoji = '🏢' THEN '👨‍💼'
    WHEN emoji = '🚀' THEN '👨‍💻'
    WHEN emoji = '😊' THEN '😊'
    ELSE '😊'
END
WHERE emoji IS NOT NULL;