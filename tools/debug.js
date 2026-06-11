import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function debug() {
  console.log("Starting Debug...");

  // 1. Check a single cutoff row
  const { data: cutoff, error: err1 } = await supabase.from('cutoffs').select('*').limit(1);
  console.log("Single Cutoff:", cutoff);

  // 2. Try an INNER JOIN between cutoffs and colleges
  const { data: joinData, error: err2 } = await supabase
    .from('cutoffs')
    .select('college_code, stream, colleges!inner(college_code, stream)')
    .limit(1);
  
  if (err2) {
    console.error("Join Error:", err2);
  } else {
    console.log("Join result count:", joinData ? joinData.length : 0);
    console.log("Join result data:", joinData);
  }

  // 3. See if the materialized view is populated
  const { data: matrixData, error: err3 } = await supabase
    .from('cutoffs_matrix_engineering')
    .select('*')
    .limit(1);

  if (err3) {
    console.error("Matrix Error:", err3);
  } else {
    console.log("Matrix count:", matrixData ? matrixData.length : 0);
  }

}

debug();
