import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_ANON) {
  console.error('Missing VITE_SUPABASE_ANON_KEY — add it to .env')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)
