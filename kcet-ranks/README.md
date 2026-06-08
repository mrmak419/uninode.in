# KCET Rank Explorer

Engineering cut-off ranks for Karnataka students. Filter by rank, category, branch across 2024-2025 counselling rounds.

---

## Setup (one time)

### 1. Supabase schema
Open https://supabase.com/dashboard → your project → SQL editor
Paste and run the contents of `schema.sql`

### 2. Import your CSVs
Install requests library:
```
pip install requests
```

Import each validated CSV — pass your Supabase SERVICE ROLE key
(Settings → API → service_role secret):

```
python kea_import.py round1_2025_rok.csv --year 2025 --round 1 --seat-type ROK --key YOUR_SERVICE_ROLE_KEY
python kea_import.py round2_2025_rok.csv --year 2025 --round 2 --seat-type ROK --key YOUR_SERVICE_ROLE_KEY
```

Or set the key as an environment variable so you don't paste it every time:
```
# Windows
set SUPABASE_KEY=your_service_role_key
python kea_import.py round1_2025_rok.csv --year 2025 --round 1 --seat-type ROK

# Mac / Linux
export SUPABASE_KEY=your_service_role_key
python kea_import.py round1_2025_rok.csv --year 2025 --round 1 --seat-type ROK
```

### 3. Set up the frontend
```
cd kcet-ranks
npm install
cp .env.example .env
```
Edit `.env` and paste your Supabase ANON key (not the service role key — this one is safe to expose)

Run locally:
```
npm run dev
```

### 4. Deploy to Cloudflare Pages
1. Push this folder to a GitHub repo
2. Go to https://dash.cloudflare.com → Workers & Pages → Create
3. Connect your GitHub repo
4. Build settings:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
5. Environment variables → add `VITE_SUPABASE_ANON_KEY` = your anon key
6. Deploy

---

## Adding new rounds (every counselling season)

1. Download the new PDF from KEA website
2. Extract: `python kea_rank_extractor.py newfile.pdf --output new_round.csv`
3. Validate: `python kea_validate.py --csv new_round.csv --checks checks.json`
4. Import: `python kea_import.py new_round.csv --year 2026 --round 1 --seat-type ROK`

The website automatically picks up the new data. The "latest 6 rounds" view updates itself.

---

## Seat type codes
- `ROK` — Rest of Karnataka (most students)
- `HK`  — Hyderabad Karnataka (HKR reserved seats)
- `SNQ` — Supernumerary quota (if you have that data)

---

## Tagging branches (for better frontend filtering)
After import, go to Supabase dashboard → Table editor → branches
For each `raw_name`, fill in:
- `parent_branch`: Computer Science / Electronics / Mechanical / Civil / etc.
- `specialisation`: Core / AI & ML / IoT / Cyber Security / etc.

These tags power the branch dropdown grouping in the frontend.
