# Uninode KCET: Platform Features & Architecture Overview

This document serves as a comprehensive overview of the Uninode KCET platform's features, architecture, and data capabilities, spanning from the database layer to the React frontend.

---

## 🏛️ 1. Backend Architecture (Supabase / PostgreSQL)

The backend is built for extreme performance under heavy load (e.g., KCET Results Day traffic spikes).

* **Raw Data Storage (`cutoffs` table)**: Stores the raw, vertically-stacked data extracted directly from the PDFs. Handles hundreds of thousands of rows safely with a massive unique index `(college_code, course_name, category, year, round, seat_type, stream)` to prevent duplicates.
* **Materialized Views (`cutoffs_matrix_*`)**: To avoid pivoting 100,000+ rows on the fly when a user searches the site, the database physically caches flattened "matrix" views for each stream. This trades a negligible amount of storage space (a few MBs) for massive (100x) query speed improvements.
* **RPC Generators**: Automated Postgres functions (e.g., `refresh_stream_matrix`) that instantly rebuild a specific stream's materialized view whenever new PDF data is uploaded.

---

## 📥 2. Automated Data Ingestion Pipeline (Python)

The data pipeline completely removes the manual burden of organizing and uploading KEA PDFs.

* **Zero-Config Structure**: PDFs are dropped into `pdf/<year>/round<round>/<stream>/<seattype>.pdf`. 
* **`master_import.py`**: The unified orchestration script. It scans the `pdf/` folder, presents a list of files, auto-detects all parameters from the folder path, and chooses the correct extraction engine (2024 vs 2025 formats).
* **Cross-Verification Engine**: Before uploading, the script prompts the admin to spot-check random cells against the actual PDF to guarantee zero data-entry errors.
* **Self-Cleaning**: After a successful upload to Supabase, the script automatically deletes the massive PDF while keeping the parsed CSV as a local physical backup.

---

## 💻 3. Frontend Architecture (React + Vite + TailwindCSS)

The frontend is a Progressive Web App (PWA) designed to feel premium, native, and lightning-fast.

* **Static Metadata Generation (`fetch-meta.js`)**: During `npm run build`, the server queries Supabase once to build static JSON files (`meta_engineering.json`, etc.) containing all valid colleges and branches. This eliminates 2 database reads *per page load*, saving hundreds of thousands of queries and preventing the database from crashing during traffic spikes.
* **Dynamic Table Columns**: The `ResultsTable` dynamically reads JSONB keys from the database payload. If a new round (e.g., 2025 Round 4) is uploaded to Supabase, the frontend automatically spawns a new column for it without requiring a code change.
* **Dual Modes**: 
  * **Analyzer Mode**: Predicts eligibility based on a student's actual KCET rank.
  * **Explorer Mode**: Allows students to browse historical cutoffs freely without entering a rank.
* **Visual Matrix Cards**: The homepage dynamically calculates which years and rounds have data available, rendering a sleek visual checkmark matrix so students know exactly what data exists before clicking.

---

## 📚 4. Currently Supported Streams & Branches

The system is fully modular and currently tracks **9 complete educational streams**. 

1. **Engineering** (B.E. / B.Tech)
2. **Architecture** (B.Arch)
3. **Agri B.Sc** (B.Sc Agriculture)
4. **B.Pharma** (Bachelor of Pharmacy)
5. **BPT** (Bachelor of Physiotherapy)
6. **Food Science** (B.Sc Food Science & Technology)
7. **Nursing** (B.Sc Nursing)
8. **Pharma.D** (Doctor of Pharmacy)
9. **BPO** (Bachelor in Prosthetics and Orthotics)

### Engineering Branch Support
The Engineering stream supports dynamic grouping via `parent_branch` and `specialisation` tags in Supabase, allowing students to filter 200+ micro-branches into standard categories like:
* Computer Science & Engineering (Core, AI/ML, Data Science, Cyber Security)
* Electronics & Communication
* Information Science
* Mechanical Engineering
* Civil Engineering
* Aerospace & Aeronautical
* Biotechnology
