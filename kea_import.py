import sys
import csv
import argparse
import requests
import json
import os
from collections import defaultdict

SUPABASE_URL = "https://wkzdwmtlsfmsipbcmhec.supabase.co"

def get_headers(service_key, resolution="merge-duplicates"):
    return {
        "apikey": service_key,
        "Authorization": "Bearer " + service_key,
        "Content-Type": "application/json",
        # merge-duplicates : update existing rows      (colleges, cutoffs)
        # ignore-duplicates: skip if already exists,   (branches — preserve manual tags)
        "Prefer": "resolution=" + resolution,
    }

def upsert(service_key, table, rows, chunk_size=500, resolution="merge-duplicates", on_conflict=None):
    url = SUPABASE_URL + "/rest/v1/" + table
    if on_conflict:
        url += "?on_conflict=" + on_conflict
    headers = get_headers(service_key, resolution)
    total = 0
    for i in range(0, len(rows), chunk_size):
        chunk = rows[i:i+chunk_size]
        r = requests.post(url, headers=headers, data=json.dumps(chunk))
        if r.status_code not in (200, 201):
            print("ERROR on " + table + ": " + str(r.status_code) + " " + r.text[:300])
            sys.exit(1)
        total += len(chunk)
        print("  uploaded " + str(total) + "/" + str(len(rows)) + " rows to " + table, end="\r", flush=True)
    print("")

def load_csv(path):
    rows = []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append(row)
    return rows

def main():
    parser = argparse.ArgumentParser(description="Import validated KEA CSV into Supabase")
    parser.add_argument("csv",         help="Path to validated CSV file")
    parser.add_argument("--year",      type=int, required=True, help="e.g. 2025")
    parser.add_argument("--round",     type=int, required=True, help="e.g. 1, 2, or 3")
    parser.add_argument("--seat-type", default="ROK",
                        help="Seat type code: ROK (Rest of Karnataka), HK (Hyderabad Karnataka), etc.")
    parser.add_argument("--key",       help="Supabase SERVICE ROLE key (or set SUPABASE_KEY env var)")
    args = parser.parse_args()

    # Try to load .env manually to avoid requiring python-dotenv
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    if k not in os.environ:
                        os.environ[k] = v.strip("'\"")

    # Priority: 1. --key arg, 2. SUPABASE_KEY, 3. VITE_SUPABASE_ANON_KEY
    service_key = args.key or os.environ.get("SUPABASE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY", "")
    if not service_key:
        print("ERROR: Provide --key or set SUPABASE_KEY in your .env file")
        print("  Get your SERVICE ROLE key from: Supabase > Settings > API")
        sys.exit(1)

    print("")
    print("=" * 60)
    print("  KEA CSV Importer")
    print("=" * 60)
    print("  File      : " + args.csv)
    print("  Year      : " + str(args.year))
    print("  Round     : " + str(args.round))
    print("  Seat type : " + args.seat_type)
    print("=" * 60)
    print("")

    rows = load_csv(args.csv)
    print("Loaded " + str(len(rows)) + " rows from CSV")

    # ── Build colleges ──────────────────────────────────────────
    colleges_seen = {}
    for r in rows:
        cc = r.get("college_code","").strip()
        cn = r.get("college_name","").strip()
        if cc and cc not in colleges_seen:
            colleges_seen[cc] = cn

    college_rows = [{"college_code": cc, "college_name": cn}
                    for cc, cn in colleges_seen.items()]
    print("Upserting " + str(len(college_rows)) + " colleges...")
    upsert(service_key, "colleges", college_rows, on_conflict="college_code")

    # ── Build branches (unique course names) ───────────────────
    branches_seen = set()
    for r in rows:
        cn = r.get("course_name","").strip()
        if cn:
            branches_seen.add(cn)

    branch_rows = [{"raw_name": name} for name in sorted(branches_seen)]
    print("Upserting " + str(len(branch_rows)) + " branch names...")
    upsert(service_key, "branches", branch_rows, resolution="ignore-duplicates", on_conflict="raw_name")

    # ── Build cutoffs ───────────────────────────────────────────
    cutoff_rows = []
    skipped = 0
    for r in rows:
        cc          = r.get("college_code","").strip()
        course      = r.get("course_name","").strip()
        category    = r.get("category","").strip()
        rank_raw    = r.get("rank","").strip()

        if not cc or not course or not category:
            skipped += 1
            continue

        # Convert rank: "--" or empty -> None (NULL in DB)
        rank = None
        if rank_raw and rank_raw not in ("--", "-", "", "None", "nan"):
            try:
                rank = float(rank_raw)
            except ValueError:
                skipped += 1
                continue

        cutoff_rows.append({
            "college_code": cc,
            "course_name":  course,
            "category":     category,
            "rank":         rank,
            "year":         args.year,
            "round":        args.round,
            "seat_type":    args.seat_type,
        })

    # Deduplicate cutoff_rows to avoid Postgres "ON CONFLICT DO UPDATE command cannot affect row a second time"
    unique_cutoffs = {}
    for row in cutoff_rows:
        key = (row["college_code"], row["course_name"], row["category"], row["year"], row["round"], row["seat_type"])
        # If duplicate, we just overwrite (the last one wins)
        unique_cutoffs[key] = row
    
    cutoff_rows = list(unique_cutoffs.values())

    if skipped:
        print("Skipped " + str(skipped) + " malformed rows")

    print("Upserting " + str(len(cutoff_rows)) + " cut-off records...")
    upsert(service_key, "cutoffs", cutoff_rows, on_conflict="college_code,course_name,category,year,round,seat_type")

    # Refresh materialized views so cutoffs_matrix and latest_rounds reflect new data
    print("Refreshing materialized views...")
    r = requests.post(
        SUPABASE_URL + "/rest/v1/rpc/refresh_cutoffs_matrix",
        headers=get_headers(service_key),
        data=json.dumps({})
    )
    if r.status_code in (200, 204):
        print("Views refreshed.")
    else:
        print("Warning: could not refresh views: " + str(r.status_code))
        print("  Run manually in Supabase SQL editor: SELECT refresh_cutoffs_matrix();")

    print("")
    print("=" * 60)
    print("  Import complete!")
    print("  " + str(len(college_rows)) + " colleges, "
          + str(len(branch_rows)) + " branches, "
          + str(len(cutoff_rows)) + " cutoffs")
    print("=" * 60)
    print("")
    print("Next step: open your Supabase dashboard and tag branch")
    print("  parent_branch + specialisation in the branches table.")
    print("")

main()