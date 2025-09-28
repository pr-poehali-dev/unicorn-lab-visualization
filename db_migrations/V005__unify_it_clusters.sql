-- Унифицируем кластеры IT и IT/Software в единый кластер IT
UPDATE t_p95295728_unicorn_lab_visualiz.entrepreneurs
SET cluster = 'IT'
WHERE cluster = 'IT/Software';