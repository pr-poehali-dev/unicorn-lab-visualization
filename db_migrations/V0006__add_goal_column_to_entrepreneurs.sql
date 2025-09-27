-- Add goal column to entrepreneurs table
ALTER TABLE t_p95295728_unicorn_lab_visualiz.entrepreneurs 
ADD COLUMN IF NOT EXISTS goal TEXT;