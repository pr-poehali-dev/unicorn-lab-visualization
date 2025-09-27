-- Исправляем обрезанные эмодзи
UPDATE t_p95295728_unicorn_lab_visualiz.entrepreneurs 
SET emoji = CASE
    WHEN emoji LIKE '👨‍' THEN '👨‍💼'
    WHEN emoji LIKE '👩‍' THEN '👩‍💼'
    WHEN emoji IS NULL OR emoji = '' THEN '😊'
    ELSE emoji
END
WHERE emoji IS NULL OR emoji = '' OR LENGTH(emoji) < 2;