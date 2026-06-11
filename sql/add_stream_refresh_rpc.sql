-- ============================================================
-- Add Targeted Stream Refresh RPC
-- Run this in your Supabase SQL editor
-- ============================================================

-- This function dynamically refreshes ONLY the materialized views 
-- associated with the specific stream that was just uploaded.
-- This prevents API timeouts that occur when refreshing all streams at once.

CREATE OR REPLACE FUNCTION refresh_stream_matrix(p_stream TEXT)
RETURNS void AS $$
BEGIN
  -- We use dynamic SQL because the view names are created dynamically per stream
  EXECUTE format('REFRESH MATERIALIZED VIEW cutoffs_matrix_%I', p_stream);
  EXECUTE format('REFRESH MATERIALIZED VIEW latest_rounds_%I', p_stream);
END;
$$ LANGUAGE plpgsql;
