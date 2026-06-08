import sys
import re
import argparse
import pdfplumber
import csv
import json
from collections import defaultdict

BRANCH_KEYWORDS = {
    "CSE":     ["COMPUTER SCIENCE AND ENGINEERING", "COMPUTER SCIENCE AND ENGG"],
    "ECE":     ["ELECTRONICS AND COMMUNICATION"],
    "EEE":     ["ELECTRICAL AND ELECTRONICS", "ELECTRICAL & ELECTRONICS"],
    "MECH":    ["MECHANICAL ENGINEERING"],
    "ME":      ["MECHANICAL ENGINEERING"],
    "CE":      ["CIVIL ENGINEERING"],
    "IT":      ["INFORMATION SCIENCE", "INFORMATION TECHNOLOGY"],
    "ISE":     ["INFORMATION SCIENCE"],
    "AIDS":    ["ARTIFICIAL INTELLIGENCE AND DATA SCIENCE", "AI AND DS"],
    "AIML":    ["ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING", "AI AND ML"],
    "CSAIML":  ["COMPUTER SCIENCE AND ENGG(ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING)",
                "COMPUTER SCIENCE AND ENGINEERING(ARTIFICIAL"],
    "CSBS":    ["COMPUTER SCIENCE AND BUSINESS"],
    "BT":      ["BIO-TECHNOLOGY", "BIOTECHNOLOGY"],
    "CH":      ["CHEMICAL ENGINEERING"],
    "AERO":    ["AERO SPACE ENGINEERING", "AERONAUTICAL"],
    "AUTO":    ["AUTOMOBILE"],
    "MINING":  ["MINING"],
    "ENV":     ["ENVIRONMENTAL"],
    "MARINE":  ["MARINE"],
    "TEXTILE": ["TEXTILE", "TEXTILES TECHNOLOGY"],
    "SILK":    ["SILK TECHNOLOGY"],
    "POLYMER": ["POLYMER"],
    "INDUSTRIAL": ["INDUSTRIAL ENGINEERING"],
    "MED":     ["MEDICAL ELECTRONICS"],
    "ETE":     ["ELECTRONICS AND TELECOMMUNICATION", "TELECOMMUNICAT"],
    "EIE":     ["ELECTRONICS AND INSTRUMENTATION"],
}

ALL_CATS = {
    "1G","1K","1R",
    "2AG","2AK","2AR","2BG","2BK","2BR",
    "3AG","3AK","3AR","3BG","3BK","3BR",
    "GM","GMK","GMR",
    "SCG","SCK","SCR",
    "STG","STK","STR",
}

def branch_matches(course_raw, targets):
    course = course_raw.upper().replace("\n", " ")
    for target in targets:
        tu = target.upper()
        keywords = BRANCH_KEYWORDS.get(tu)
        if keywords:
            for kw in keywords:
                if kw in course:
                    return True
        else:
            if tu in course:
                return True
    return False

def extract_ranks(pdf_path, target_branches, target_categories):
    results = []
    want_all_branches = not target_branches
    want_all_cats = not target_categories
    target_cats_norm = {c.upper().strip() for c in target_categories}

    college_code = ""
    college_name = ""

    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        print("[INFO] Opened PDF: " + str(total) + " pages")

        for page_num, page in enumerate(pdf.pages, start=1):
            if page_num % 10 == 0:
                print("  ... scanning page " + str(page_num) + "/" + str(total), flush=True)

            # College headers are in raw text, above each table
            text = page.extract_text() or ""
            # Build a map: approximate y-position -> (college_code, college_name)
            # We use word positions for precise college header detection
            college_positions = []
            for line in text.splitlines():
                m = re.match(r"College:\s*([A-Z]\d{3,4})\s+(.*)", line.strip(), re.IGNORECASE)
                if m:
                    college_code = m.group(1).upper()
                    college_name = m.group(2).strip()
                    college_positions.append((college_code, college_name))

            # Extract tables using lines strategy (confirmed working)
            tables = page.extract_tables({
                "vertical_strategy": "lines",
                "horizontal_strategy": "lines",
            })

            # Pair each table with the right college header
            # Tables appear in order on the page, colleges appear in order too
            college_idx = 0
            current_cc = college_code
            current_cn = college_name

            for table in tables:
                if not table or len(table) < 2:
                    continue

                header = [str(c or "").strip() for c in table[0]]

                # Confirm this is a rank table by checking header
                cat_count = sum(1 for h in header if h.upper() in ALL_CATS)
                if cat_count < 3:
                    continue

                # Assign college: use next college in sequence
                if college_idx < len(college_positions):
                    current_cc, current_cn = college_positions[college_idx]
                    college_idx += 1

                # Map column index -> category name
                cat_col_map = {}
                for i, h in enumerate(header):
                    if h.upper() in ALL_CATS:
                        cat_col_map[i] = h.upper()

                # Process data rows (skip header row at index 0)
                for row in table[1:]:
                    if not row or not row[0]:
                        continue

                    course_raw = str(row[0] or "").strip()
                    if not course_raw:
                        continue
                    # Skip repeated header rows
                    if course_raw.upper() in ("COURSE NAME", "COURSE\nNAME"):
                        continue

                    # Branch filter
                    if not want_all_branches:
                        if not branch_matches(course_raw, target_branches):
                            continue

                    # Clean course name (remove embedded newlines for display)
                    course_clean = course_raw.replace("\n", " ").strip()

                    # Extract category columns
                    for col_idx, cat_name in cat_col_map.items():
                        if not want_all_cats:
                            if cat_name not in target_cats_norm:
                                continue

                        if col_idx >= len(row):
                            continue

                        # Collapse any newlines inside the cell — fractional ranks
                        # like 34096.875 sometimes break across lines as "34096.87\n5"
                        cell = str(row[col_idx] or "").replace("\n", "").strip()
                        rank = cell if cell not in ("--", "-", "", "None", "nan") else "--"

                        results.append({
                            "college_code": current_cc,
                            "college_name": current_cn,
                            "course_name":  course_clean,
                            "category":     cat_name,
                            "rank":         rank,
                            "page":         page_num,
                        })

    return results

def print_results(rows):
    if not rows:
        print("")
        print("No matching rows found.")
        print("Tips:")
        print("  Branch  : CSE, ECE, MECH, CE, IT, EEE, AIDS, AIML, AERO ...")
        print("  Category: GM, 2BG, 2AG, 3AG, 3BG, SCG, STG, GMR ...")
        return

    grouped = defaultdict(lambda: defaultdict(list))
    for r in rows:
        key = r["college_code"] + "  " + r["college_name"]
        grouped[key][r["course_name"]].append(r)

    for college_key, courses in grouped.items():
        print("")
        print("=" * 80)
        print("  " + college_key)
        print("=" * 80)
        for course, course_rows in courses.items():
            print("")
            print("  Course : " + course)
            print("  " + "-" * 40)
            print("  " + "CATEGORY".ljust(10) + "CUT-OFF RANK")
            print("  " + "--------".ljust(10) + "------------")
            for r in sorted(course_rows, key=lambda x: x["category"]):
                rank_str = r["rank"] if r["rank"] != "--" else "(no allotment)"
                print("  " + r["category"].ljust(10) + rank_str)

    print("")
    print("=" * 80)
    print("  Total: " + str(len(rows)) + " records")
    print("=" * 80)

def save_csv(rows, path):
    if not rows:
        return
    fields = ["college_code", "college_name", "course_name", "category", "rank", "page"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    print("Saved CSV: " + path + " (" + str(len(rows)) + " rows)")

def save_json(rows, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)
    print("Saved JSON: " + path + " (" + str(len(rows)) + " rows)")

def main():
    parser = argparse.ArgumentParser(description="KEA UGCET Rank Extractor")
    parser.add_argument("pdf", help="Path to the KEA rank-list PDF")
    parser.add_argument("--branch", nargs="*", default=[],
                        help="Branch(es): CSE ECE MECH CE IT EEE AIDS AIML ...")
    parser.add_argument("--category", nargs="*", default=[],
                        help="Category(s): 2BG GM SCG STG 3AG ...")
    parser.add_argument("--output", default=None,
                        help="Save to .csv or .json")
    args = parser.parse_args()

    print("")
    print("=" * 60)
    print("  KEA UGCET Rank Extractor")
    print("=" * 60)
    print("  PDF      : " + args.pdf)
    print("  Branch   : " + (", ".join(args.branch) if args.branch else "(all)"))
    print("  Category : " + (", ".join(args.category) if args.category else "(all)"))
    if args.output:
        print("  Output   : " + args.output)
    print("=" * 60)
    print("")

    rows = extract_ranks(args.pdf, args.branch, args.category)
    print_results(rows)

    if args.output:
        if args.output.lower().endswith(".json"):
            save_json(rows, args.output)
        else:
            save_csv(rows, args.output)

main()