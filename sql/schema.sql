-- ============================================================
-- KCET Rank Explorer — Multi-Stream Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Colleges
CREATE TABLE IF NOT EXISTS colleges (
  college_code  TEXT PRIMARY KEY,
  college_name  TEXT NOT NULL,
  stream        TEXT NOT NULL DEFAULT 'engineering',
  search_terms  TEXT
);

-- Parent Branches
CREATE TABLE IF NOT EXISTS parent_branches (
  id         SERIAL PRIMARY KEY,
  name       TEXT UNIQUE NOT NULL,
  alias      TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Specialisations
CREATE TABLE IF NOT EXISTS specialisations (
  id         SERIAL PRIMARY KEY,
  name       TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Branches
CREATE TABLE IF NOT EXISTS branches (
  id                SERIAL PRIMARY KEY,
  raw_name          TEXT UNIQUE NOT NULL,
  stream            TEXT NOT NULL DEFAULT 'engineering',
  parent_id         INTEGER REFERENCES parent_branches(id),
  specialisation_id INTEGER REFERENCES specialisations(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Main cutoffs table
CREATE TABLE IF NOT EXISTS cutoffs (
  id           SERIAL PRIMARY KEY,
  college_code TEXT NOT NULL REFERENCES colleges(college_code),
  course_name  TEXT NOT NULL,
  category     TEXT NOT NULL,
  rank         NUMERIC,          -- NULL means no allotment (--)
  year         SMALLINT NOT NULL,
  round        SMALLINT NOT NULL,
  round_name   TEXT,             -- Display name for the round
  seat_type    TEXT NOT NULL DEFAULT 'ROK',
  stream       TEXT NOT NULL DEFAULT 'engineering', -- Explicit stream for safety
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (college_code, course_name, category, year, round, seat_type, stream)
);

-- Indexes for fast frontend queries
CREATE INDEX IF NOT EXISTS idx_cutoffs_search ON cutoffs (category, year, round, seat_type, stream);
CREATE INDEX IF NOT EXISTS idx_cutoffs_course ON cutoffs (course_name);
CREATE INDEX IF NOT EXISTS idx_cutoffs_college ON cutoffs (college_code);
CREATE INDEX IF NOT EXISTS idx_cutoffs_rank ON cutoffs (rank);

-- ── Row Level Security (read-only public access) ──────────────
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE cutoffs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read colleges" ON colleges FOR SELECT USING (true);
CREATE POLICY "public read parent_branches" ON parent_branches FOR SELECT USING (true);
CREATE POLICY "public read specialisations" ON specialisations FOR SELECT USING (true);
CREATE POLICY "public read branches" ON branches FOR SELECT USING (true);
CREATE POLICY "public read cutoffs" ON cutoffs FOR SELECT USING (true);

-- Allow authenticated users to manage metadata
CREATE POLICY "admin all parent_branches" ON parent_branches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin all specialisations" ON specialisations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin all branches" ON branches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin all colleges" ON colleges FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin all cutoffs" ON cutoffs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Helper view: latest rounds (now materialized per stream) ─────────────────
DROP VIEW IF EXISTS latest_rounds;

-- ============================================================
-- DYNAMIC MATERIALIZED VIEWS PER STREAM
-- ============================================================

-- Function to dynamically create materialized views for a specific stream
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

-- Create views for requested streams
SELECT create_stream_view('engineering');
SELECT create_stream_view('architecture');
SELECT create_stream_view('b_pharma');
SELECT create_stream_view('bpt');
SELECT create_stream_view('food_science');
SELECT create_stream_view('nursing');
SELECT create_stream_view('pharma_d');
SELECT create_stream_view('agri_bsc');
SELECT create_stream_view('bpo');

-- Function to refresh all materialized views via API/Python script
CREATE OR REPLACE FUNCTION refresh_all_cutoffs_matrices()
RETURNS void AS $$
BEGIN
  -- We use dynamic SQL to refresh them silently if they exist
  REFRESH MATERIALIZED VIEW cutoffs_matrix_engineering;
  REFRESH MATERIALIZED VIEW latest_rounds_engineering;

  REFRESH MATERIALIZED VIEW cutoffs_matrix_architecture;
  REFRESH MATERIALIZED VIEW latest_rounds_architecture;

  REFRESH MATERIALIZED VIEW cutoffs_matrix_b_pharma;
  REFRESH MATERIALIZED VIEW latest_rounds_b_pharma;

  REFRESH MATERIALIZED VIEW cutoffs_matrix_bpt;
  REFRESH MATERIALIZED VIEW latest_rounds_bpt;

  REFRESH MATERIALIZED VIEW cutoffs_matrix_food_science;
  REFRESH MATERIALIZED VIEW latest_rounds_food_science;

  REFRESH MATERIALIZED VIEW cutoffs_matrix_nursing;
  REFRESH MATERIALIZED VIEW latest_rounds_nursing;

  REFRESH MATERIALIZED VIEW cutoffs_matrix_pharma_d;
  REFRESH MATERIALIZED VIEW latest_rounds_pharma_d;

  REFRESH MATERIALIZED VIEW cutoffs_matrix_agri_bsc;
  REFRESH MATERIALIZED VIEW latest_rounds_agri_bsc;

  REFRESH MATERIALIZED VIEW cutoffs_matrix_bpo;
  REFRESH MATERIALIZED VIEW latest_rounds_bpo;
END;
$$ LANGUAGE plpgsql;
