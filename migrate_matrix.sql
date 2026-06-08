-- ============================================================
-- Migration: fix cutoffs_matrix to include college_name
-- Run this in Supabase SQL editor
-- ============================================================

-- Drop existing materialized views (order matters due to dependency)
DROP MATERIALIZED VIEW IF EXISTS cutoffs_matrix;
DROP MATERIALIZED VIEW IF EXISTS latest_rounds;

-- Recreate latest_rounds
CREATE MATERIALIZED VIEW latest_rounds AS
SELECT DISTINCT year, round, seat_type
FROM cutoffs
ORDER BY year DESC, round DESC
LIMIT 6;

GRANT SELECT ON latest_rounds TO public;

-- Recreate cutoffs_matrix WITH college_name joined in
-- This avoids needing a FK join from the frontend (materialized views don't support it)
CREATE MATERIALIZED VIEW cutoffs_matrix AS
SELECT
  c.college_code,
  col.college_name,
  c.course_name,
  c.category,
  c.seat_type,
  jsonb_object_agg(c.year || '_R' || c.round, c.rank) AS rounds,
  MIN(c.rank) AS min_rank,
  MAX(c.rank) AS max_rank
FROM cutoffs c
JOIN colleges col ON c.college_code = col.college_code
GROUP BY c.college_code, col.college_name, c.course_name, c.category, c.seat_type;

-- Unique index for concurrent refresh + fast lookups
CREATE UNIQUE INDEX idx_cutoffs_matrix_unique
  ON cutoffs_matrix (college_code, course_name, category, seat_type);

-- Search index
CREATE INDEX idx_cutoffs_matrix_search
  ON cutoffs_matrix (category, seat_type, min_rank, max_rank);

-- course_name search index (for ILIKE queries)
CREATE INDEX idx_cutoffs_matrix_course
  ON cutoffs_matrix USING gin (to_tsvector('simple', course_name));

GRANT SELECT ON cutoffs_matrix TO public;

-- Refresh both views now with existing data
SELECT refresh_cutoffs_matrix();
