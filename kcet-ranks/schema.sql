-- ============================================================
-- KCET Rank Explorer — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Colleges
CREATE TABLE IF NOT EXISTS colleges (
  college_code  TEXT PRIMARY KEY,
  college_name  TEXT NOT NULL
);

-- Parent Branches (e.g. "Computer Science")
CREATE TABLE IF NOT EXISTS parent_branches (
  id         SERIAL PRIMARY KEY,
  name       TEXT UNIQUE NOT NULL,
  alias      TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Specialisations (e.g. "AI/ML")
CREATE TABLE IF NOT EXISTS specialisations (
  id         SERIAL PRIMARY KEY,
  name       TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Branches (populated after import via admin panel)
CREATE TABLE IF NOT EXISTS branches (
  id                SERIAL PRIMARY KEY,
  raw_name          TEXT UNIQUE NOT NULL,
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
  seat_type    TEXT NOT NULL DEFAULT 'ROK',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (college_code, course_name, category, year, round, seat_type)
);

-- Indexes for fast frontend queries
CREATE INDEX IF NOT EXISTS idx_cutoffs_search
  ON cutoffs (category, year, round, seat_type);

CREATE INDEX IF NOT EXISTS idx_cutoffs_course
  ON cutoffs (course_name);

CREATE INDEX IF NOT EXISTS idx_cutoffs_college
  ON cutoffs (college_code);

CREATE INDEX IF NOT EXISTS idx_cutoffs_rank
  ON cutoffs (rank);

-- ── Row Level Security (read-only public access, full authenticated access) ──────────────
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

-- Allow authenticated users (Admin) to manage branches and categories
CREATE POLICY "admin all parent_branches" ON parent_branches FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin all specialisations" ON specialisations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin all branches" ON branches FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Helper view: latest 6 rounds ─────────────────────────────
DROP VIEW IF EXISTS latest_rounds;

CREATE MATERIALIZED VIEW latest_rounds AS
SELECT DISTINCT year, round, seat_type
FROM cutoffs
ORDER BY year DESC, round DESC
LIMIT 6;

GRANT SELECT ON latest_rounds TO public;

-- ── Grouped Materialized View for Matrix UI ────────────────
DROP VIEW IF EXISTS cutoffs_matrix;

CREATE MATERIALIZED VIEW cutoffs_matrix AS
SELECT 
  c.college_code, 
  c.course_name, 
  c.category, 
  c.seat_type,
  jsonb_object_agg(c.year || '_R' || c.round, c.rank) AS rounds,
  MIN(c.rank) as min_rank,
  MAX(c.rank) as max_rank
FROM cutoffs c
GROUP BY c.college_code, c.course_name, c.category, c.seat_type;

-- Unique index for concurrent refreshes and fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_cutoffs_matrix_unique 
  ON cutoffs_matrix (college_code, course_name, category, seat_type);

-- Index to make the frontend search queries lightning fast
CREATE INDEX IF NOT EXISTS idx_cutoffs_matrix_search 
  ON cutoffs_matrix (category, seat_type, max_rank, min_rank);

-- Grant read access to public
GRANT SELECT ON cutoffs_matrix TO public;

-- Function to refresh the materialized view via API/Python script
CREATE OR REPLACE FUNCTION refresh_cutoffs_matrix()
RETURNS void AS $$
BEGIN
  -- Refresh both materialized views
  REFRESH MATERIALIZED VIEW latest_rounds;
  REFRESH MATERIALIZED VIEW cutoffs_matrix;
END;
$$ LANGUAGE plpgsql;
