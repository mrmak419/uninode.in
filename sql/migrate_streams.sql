-- Run this script first to upgrade your existing tables!
-- It adds the `stream` column without deleting your existing Engineering data.

-- 1. Add the stream column to existing tables (defaults to 'engineering')
ALTER TABLE colleges ADD COLUMN IF NOT EXISTS stream TEXT NOT NULL DEFAULT 'engineering';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS stream TEXT NOT NULL DEFAULT 'engineering';
ALTER TABLE cutoffs ADD COLUMN IF NOT EXISTS stream TEXT NOT NULL DEFAULT 'engineering';

-- 2. Update the unique constraint on cutoffs to include stream
-- First, drop the old constraint (Supabase usually auto-names it like this)
ALTER TABLE cutoffs DROP CONSTRAINT IF EXISTS cutoffs_college_code_course_name_category_year_round_sea_key;

-- Then add the new constraint
ALTER TABLE cutoffs DROP CONSTRAINT IF EXISTS cutoffs_unique_row;
ALTER TABLE cutoffs ADD CONSTRAINT cutoffs_unique_row UNIQUE (college_code, course_name, category, year, round, seat_type, stream);

-- 3. Drop the old materialized view and latest_rounds view so we can recreate them
DROP MATERIALIZED VIEW IF EXISTS cutoffs_matrix;
DROP VIEW IF EXISTS latest_rounds;
