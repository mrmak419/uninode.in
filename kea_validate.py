import sys
import csv
import json
import argparse
from collections import defaultdict

HELP = """
KEA Rank Data Validator
=======================
Cross-checks your extracted CSV against manually verified spot-check values.

Steps:
1. Run the extractor to get your CSV:
   python kea_rank_extractor.py ranks.pdf --output data.csv

2. Open the original PDF, pick 20-30 random rows, and note them down
   in a JSON file called checks.json (template printed with --template)

3. Run this validator:
   python kea_validate.py --csv data.csv --checks checks.json

4. Fix extractor if anything fails, re-run until all checks pass.
"""

TEMPLATE = """
[
  {
    "college_code": "E001",
    "course_name":  "COMPUTER SCIENCE AND ENGINEERING",
    "category":     "2BG",
    "expected_rank": "8937",
    "note": "Page 1, row 3"
  },
  {
    "college_code": "E001",
    "course_name":  "CIVIL ENGINEERING",
    "category":     "GM",
    "expected_rank": "45486",
    "note": "Page 1, row 2"
  },
  {
    "college_code": "E002",
    "course_name":  "COMPUTER SCIENCE AND ENGINEERING",
    "category":     "2BG",
    "expected_rank": "24262.5",
    "note": "Page 1, row 2 of E002 table - fractional rank"
  },
  {
    "college_code": "E001",
    "course_name":  "MECHANICAL ENGINEERING",
    "category":     "SCG",
    "expected_rank": "--",
    "note": "Example of a -- (no allotment) check"
  }
]
"""

def load_csv(path):
    rows = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows

def normalise(s):
    if s is None:
        return ""
    return " ".join(s.upper().split())

def find_row(data, college_code, course_name, category):
    cc = normalise(college_code)
    cn = normalise(course_name)
    cat = category.upper().strip()
    matches = []
    for row in data:
        if (normalise(row.get("college_code","")) == cc and
            normalise(row.get("course_name","")) == cn and
            row.get("category","").upper().strip() == cat):
            matches.append(row)
    return matches

def validate(csv_path, checks_path):
    print("")
    print("=" * 65)
    print("  KEA Rank Data Validator")
    print("=" * 65)
    print("  CSV    : " + csv_path)
    print("  Checks : " + checks_path)
    print("=" * 65)
    print("")

    data = load_csv(csv_path)
    print("Loaded " + str(len(data)) + " rows from CSV.")
    print("")

    with open(checks_path, encoding="utf-8") as f:
        checks = json.load(f)
    print("Running " + str(len(checks)) + " spot checks...")
    print("")

    passed = 0
    failed = 0
    warnings = []
    failures = []

    for i, check in enumerate(checks):
        college_code  = check.get("college_code", "").strip()
        course_name   = check.get("course_name", "").strip()
        category      = check.get("category", "").strip()
        expected      = str(check.get("expected_rank", "")).strip()
        note          = check.get("note", "")
        label = "[" + str(i+1) + "] " + college_code + " / " + course_name[:35] + " / " + category

        matches = find_row(data, college_code, course_name, category)

        if len(matches) == 0:
            failed += 1
            failures.append({
                "check": label,
                "note": note,
                "problem": "ROW NOT FOUND in CSV",
                "expected": expected,
                "got": "N/A",
            })
            print("  FAIL  " + label)
            print("        Expected : " + expected)
            print("        Got      : ROW NOT FOUND")
            if note:
                print("        Note     : " + note)
            print("")

        elif len(matches) > 1:
            warnings.append(label + " -> DUPLICATE ROWS (" + str(len(matches)) + " found)")
            actual = matches[0].get("rank","").strip()
            if actual == expected:
                passed += 1
                print("  WARN  " + label + " (DUPLICATE rows but rank matches)")
            else:
                failed += 1
                print("  FAIL  " + label + " (DUPLICATE rows + rank mismatch)")
                print("        Expected : " + expected)
                print("        Got      : " + actual + " (first match)")
            if note:
                print("        Note     : " + note)
            print("")

        else:
            actual = matches[0].get("rank","").strip()
            if actual == expected:
                passed += 1
                print("  PASS  " + label)
            else:
                failed += 1
                failures.append({
                    "check": label,
                    "note": note,
                    "problem": "RANK MISMATCH",
                    "expected": expected,
                    "got": actual,
                })
                print("  FAIL  " + label)
                print("        Expected : " + expected)
                print("        Got      : " + actual)
                if note:
                    print("        Note     : " + note)
                print("")

    # Summary
    print("")
    print("=" * 65)
    print("  RESULTS")
    print("=" * 65)
    print("  Passed   : " + str(passed) + " / " + str(len(checks)))
    print("  Failed   : " + str(failed) + " / " + str(len(checks)))
    print("  Warnings : " + str(len(warnings)))
    print("=" * 65)

    # Extra stats on the CSV itself
    print("")
    print("=" * 65)
    print("  CSV HEALTH STATS")
    print("=" * 65)

    total_rows = len(data)
    null_rows  = sum(1 for r in data if r.get("rank","").strip() in ("--","","None","nan"))
    data_rows  = total_rows - null_rows

    colleges  = len(set(r.get("college_code","") for r in data))
    courses   = len(set(r.get("course_name","")  for r in data))
    cats_seen = sorted(set(r.get("category","")   for r in data))

    print("  Total rows        : " + str(total_rows))
    print("  Rows with rank    : " + str(data_rows))
    print("  Rows with '--'    : " + str(null_rows) + " (no allotment)")
    print("  Unique colleges   : " + str(colleges))
    print("  Unique courses    : " + str(courses))
    print("  Categories found  : " + ", ".join(cats_seen))
    print("")

    # Check for unexpected categories (typos / parse errors)
    EXPECTED_CATS = {
        "1G","1K","1R",
        "2AG","2AK","2AR","2BG","2BK","2BR",
        "3AG","3AK","3AR","3BG","3BK","3BR",
        "GM","GMK","GMR",
        "SCG","SCK","SCR",
        "STG","STK","STR",
    }
    unexpected = [c for c in cats_seen if c not in EXPECTED_CATS]
    if unexpected:
        print("  WARNING - Unexpected category values (possible parse errors):")
        for u in unexpected:
            count = sum(1 for r in data if r.get("category","") == u)
            print("    '" + u + "' appears " + str(count) + " times")
        print("")

    # Check for suspiciously short/long rank values
    bad_ranks = []
    for r in data:
        rank = r.get("rank","").strip()
        if rank in ("--","","None","nan"):
            continue
        try:
            val = float(rank)
            if val < 1 or val > 300000:
                bad_ranks.append((r.get("college_code",""), r.get("course_name",""), r.get("category",""), rank))
        except ValueError:
            bad_ranks.append((r.get("college_code",""), r.get("course_name",""), r.get("category",""), rank + " (not a number -- possible newline inside decimal)"))

    if bad_ranks:
        print("  WARNING - Suspicious rank values (out of range or non-numeric):")
        for b in bad_ranks[:20]:
            print("    " + b[0] + " / " + b[1][:30] + " / " + b[2] + " -> " + b[3])
        if len(bad_ranks) > 20:
            print("    ... and " + str(len(bad_ranks)-20) + " more")
        print("")
    else:
        print("  All rank values look numeric and in range. Good.")
        print("")

    # Check for duplicate rows
    seen = defaultdict(int)
    for r in data:
        key = (r.get("college_code",""), r.get("course_name",""), r.get("category",""))
        seen[key] += 1
    dupes = {k:v for k,v in seen.items() if v > 1}
    if dupes:
        print("  WARNING - Duplicate rows found (same college+course+category):")
        for (cc, cn, cat), count in list(dupes.items())[:10]:
            print("    " + cc + " / " + cn[:30] + " / " + cat + " -> " + str(count) + "x")
        if len(dupes) > 10:
            print("    ... and " + str(len(dupes)-10) + " more")
        print("")
    else:
        print("  No duplicate rows found. Good.")
        print("")

    # Per-college row count (helps spot truncated colleges)
    print("  Rows per college (first 15 and last 5):")
    college_counts = defaultdict(int)
    for r in data:
        college_counts[r.get("college_code","UNKNOWN")] += 1
    sorted_colleges = sorted(college_counts.items())
    show = sorted_colleges[:15]
    if len(sorted_colleges) > 20:
        show = sorted_colleges[:15] + [("...", "...")] + sorted_colleges[-5:]
    for cc, count in show:
        print("    " + str(cc).ljust(8) + str(count) + " rows")
    print("")

    print("=" * 65)
    if failed == 0:
        print("  ALL SPOT CHECKS PASSED. Data looks good.")
    else:
        print("  " + str(failed) + " SPOT CHECK(S) FAILED. Fix before importing.")
    print("=" * 65)
    print("")

    return failed == 0


def print_template():
    print("")
    print("Save this as checks.json and fill in values from your PDF:")
    print("")
    print(TEMPLATE)


def main():
    parser = argparse.ArgumentParser(description="KEA rank CSV validator")
    parser.add_argument("--csv",      help="Path to extracted CSV file")
    parser.add_argument("--checks",   help="Path to spot-checks JSON file")
    parser.add_argument("--template", action="store_true",
                        help="Print a checks.json template and exit")
    args = parser.parse_args()

    if args.template:
        print_template()
        return

    if not args.csv or not args.checks:
        print(HELP)
        parser.print_help()
        return

    ok = validate(args.csv, args.checks)
    sys.exit(0 if ok else 1)

main()