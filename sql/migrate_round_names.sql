-- ============================================================
-- KCET Rank Explorer — Add Round Name Mapping
-- Run this in your Supabase SQL editor
-- ============================================================

-- 1. Add round_name column
ALTER TABLE cutoffs ADD COLUMN IF NOT EXISTS round_name TEXT;

-- 2. Backfill existing data
-- If your current rounds are just 1, 2, 3, we map them directly to '1', '2', '3'
UPDATE cutoffs SET round_name = round::TEXT WHERE round_name IS NULL;

-- 3. Replace the create_stream_view function so latest_rounds returns round_name
CREATE OR REPLACE FUNCTION create_stream_view(stream_name TEXT) 
RETURNS void AS $$
DECLARE
  matrix_view_name TEXT := 'cutoffs_matrix_' || stream_name;
  rounds_view_name TEXT := 'latest_rounds_' || stream_name;
BEGIN
  -- Create cutoffs matrix view
  EXECUTE format('
    DROP MATERIALIZED VIEW IF EXISTS %I;
    CREATE MATERIALIZED VIEW %I AS
    SELECT 
      c.college_code, 
      col.college_name,
      col.search_terms,
      c.course_name, 
      c.category, 
      c.seat_type,
      jsonb_object_agg(c.year || ''_R'' || c.round, c.rank) AS rounds,
      MIN(c.rank) as min_rank,
      MAX(c.rank) as max_rank
    FROM cutoffs c
    JOIN colleges col ON c.college_code = col.college_code
    WHERE c.stream = %L
    GROUP BY c.college_code, col.college_name, col.search_terms, c.course_name, c.category, c.seat_type;
    
    CREATE UNIQUE INDEX ON %I (college_code, course_name, category, seat_type);
    CREATE INDEX ON %I (category, seat_type, max_rank, min_rank);
    
    GRANT SELECT ON %I TO public;
  ', matrix_view_name, matrix_view_name, stream_name, matrix_view_name, matrix_view_name, matrix_view_name);

  -- Create latest rounds view
  EXECUTE format('
    DROP MATERIALIZED VIEW IF EXISTS %I;
    CREATE MATERIALIZED VIEW %I AS
    SELECT DISTINCT year, round, round_name, seat_type
    FROM cutoffs
    WHERE stream = %L
    ORDER BY year DESC, round DESC;

    GRANT SELECT ON %I TO public;
  ', rounds_view_name, rounds_view_name, stream_name, rounds_view_name);

END;
$$ LANGUAGE plpgsql;

-- 4. Recreate views to apply changes
SELECT create_stream_view('engineering');
SELECT create_stream_view('architecture');
SELECT create_stream_view('b_pharma');
SELECT create_stream_view('bpt');
SELECT create_stream_view('food_science');
SELECT create_stream_view('nursing');
SELECT create_stream_view('pharma_d');
SELECT create_stream_view('agri_bsc');
SELECT create_stream_view('bpo');
