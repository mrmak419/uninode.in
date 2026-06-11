import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function fetchWithPagination(table, selectQuery) {
  let allData = [];
  let start = 0;
  const limit = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select(selectQuery)
      .range(start, start + limit - 1);

    if (error) throw error;
    
    if (data.length > 0) {
      allData = [...allData, ...data];
      start += limit;
    }
    
    if (data.length < limit) {
      hasMore = false;
    }
  }
  return allData;
}

async function count() {
  const streams = ['engineering', 'architecture', 'nursing', 'agri_bsc', 'b_pharma', 'pharma_d', 'bpt', 'food_science', 'bpo'];

  let totalValidCombinations = 0;

  for (const streamName of streams) {
    try {
      const rows = await fetchWithPagination(`cutoffs_matrix_${streamName}`, 'college_name, course_name');
      
      const uniqueCombos = new Set();
      for (const row of rows) {
        if (row.college_name && row.course_name) {
          uniqueCombos.add(`${row.college_name}::${row.course_name}`);
        }
      }
      
      console.log(`${streamName}: ${uniqueCombos.size} valid combinations`);
      totalValidCombinations += uniqueCombos.size;
    } catch (e) {
      console.log(`Skipping ${streamName} (No matrix view or error: ${e.message})`);
    }
  }
  
  console.log(`\nTOTAL VALID COMBINATIONS ACROSS ALL STREAMS: ${totalValidCombinations}`);
}

count();
