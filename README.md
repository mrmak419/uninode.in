# KCET Rank Explorer

A blazing-fast, Next-gen web platform to explore KCET Cutoff Ranks across multiple streams (Engineering, Agriculture, Medical, Architecture, etc.). Built with React, Vite, TailwindCSS, and Supabase.

---

## 🚀 Architecture Highlights

1. **Pre-Computed Materialized Views**: Instead of running heavy aggregations on 100,000+ cutoff rows per user search, Supabase pivots and caches the data into `cutoffs_matrix_<stream>` views.
2. **Static Metadata Generation**: The `npm run build` process queries Supabase to generate `meta_engineering.json` and a full `sitemap.xml` for SEO. This prevents 2 database reads per page load and ensures instant rendering.
3. **Automated Python Ingestion Pipeline**: Extracts data from poorly-formatted KEA PDFs, dynamically handles different yearly formats (2024 vs 2025), and uploads chunked data into Supabase via REST.

---

## 📥 Data Ingestion Workflow (Zero-Config)

You never have to manually enter Year, Round, Stream, or Seat Type! 

### 1. Place Your PDFs
Place the new KEA PDF into the `pdf/` folder using the following exact structure:
`pdf/<year>/round<round_num>/<stream>/<seat_type>.pdf`

*Example:*
`pdf/2025/round3/agri_bsc/HK.pdf`
`pdf/2024/round1/engineering/ROK.pdf`

### 2. Run the Master Importer
```bash
python master_import.py
```
1. The script will recursively scan the `pdf/` folder.
2. It will present you with a menu of all detected PDFs.
3. Select your PDF. The script will automatically:
   - Determine the correct extractor to use (2024 vs 2025 format).
   - Extract all ranks to a temporary CSV.
   - Allow you to **Cross-Verify** random entries against the actual PDF.
   - Securely upload the data into Supabase (`cutoffs` table).
   - Delete the source PDF (it keeps the CSV as a physical backup in `csv/`).
4. **Important:** The materialized view for that stream is automatically refreshed via the database RPC!

---

## 🖥️ Frontend Management

If you have uploaded a completely **brand new college or branch** that did not exist in any previous rounds, you must rebuild the metadata JSON files so the dropdown menus update.

```bash
cd kcet-ranks
npm run build
```
*(You do not need to do this if the college/branch already existed in the database).*

To run the local development server:
```bash
cd kcet-ranks
npm run dev
```

---

## 🛠️ Supabase Setup (One Time)

1. Open https://supabase.com/dashboard → your project → SQL editor
2. Paste and run the contents of `sql/schema.sql` (Creates base tables and security policies).
3. Paste and run the contents of `sql/add_stream_refresh_rpc.sql` (Creates the automated Materialized View generators).

Create a `.env` file in the root directory for the Python uploaders:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key
```

Create a `.env` file inside `kcet-ranks/`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```
