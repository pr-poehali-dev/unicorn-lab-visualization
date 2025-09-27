-- Update existing entrepreneurs with empty tags by re-analyzing their data
-- This is a one-time migration to enrich existing data

-- Since we can't call external APIs from SQL, we'll mark records for re-import
-- by setting a flag that the application can use

-- Add a temporary column to track if record needs re-analysis
ALTER TABLE t_p95295728_unicorn_lab_visualiz.entrepreneurs 
ADD COLUMN IF NOT EXISTS needs_reanalysis BOOLEAN DEFAULT FALSE;

-- Mark all records with empty tags for re-analysis
UPDATE t_p95295728_unicorn_lab_visualiz.entrepreneurs 
SET needs_reanalysis = TRUE
WHERE tags IS NULL OR array_length(tags, 1) IS NULL OR array_length(tags, 1) = 0;