import sys
import re
import argparse
import pdfplumber
import csv
import json
import difflib
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
    "CSAIML":  ["COMPUTER SCIENCE AND ENGG(ARTIFICIAL INTELLIGENCE",
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
    # ROK (Rest of Karnataka)
    "1G","1K","1R",
    "2AG","2AK","2AR","2BG","2BK","2BR",
    "3AG","3AK","3AR","3BG","3BK","3BR",
    "GM","GMK","GMR","GMP",
    "SCG","SCK","SCR",
    "STG","STK","STR",
    # HK (Hyderabad-Karnataka)
    "1H","1KH","1RH",
    "2AH","2AKH","2ARH","2BH","2BKH","2BRH",
    "3AH","3AKH","3ARH","3BH","3BKH","3BRH",
    "GMH","GMKH","GMRH","GMPH",
    "SCH","SCKH","SCRH",
    "STH","STKH","STRH",
}

# ── 2024 abbreviated course name → canonical full name ───────────────────────
# 2024 PDFs use short codes like "CS Computers", "EC Electronics".
# After replace("\n"," ") and re.sub(r"\s+"," ") + upper(), these are the cleaned keys.
COURSE_NAME_2024_MAP = {
    # Core branches
    "AI ARTIFICIAL INTELLIGENCE":                         "ARTIFICIAL INTELLIGENCE AND DATA SCIENCE",
    "AI ARTIFICIAL INTELLIGENCE AND DATA SCIENCE":        "ARTIFICIAL INTELLIGENCE AND DATA SCIENCE",
    "AI ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING":    "ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING",
    "AD ARTIFICIAL INTEL, DATA SC":                       "ARTIFICIAL INTELLIGENCE AND DATA SCIENCE",
    "AD ARTIFICIAL INTELLIGENCE AND DATA SCIENCE":        "ARTIFICIAL INTELLIGENCE AND DATA SCIENCE",
    "AE AERONAUT.ENGG":                                   "AERO SPACE ENGINEERING",
    "AE AERONAUTICAL ENGG":                               "AERO SPACE ENGINEERING",
    "AE AERONAUTICAL":                                    "AERO SPACE ENGINEERING",
    "AR ARCHITECTURE":                                    "ARCHITECTURE",
    "AS AERO SPACE":                                      "AERO SPACE ENGINEERING",
    "AS AEROSPACE":                                       "AERO SPACE ENGINEERING",
    "AU AUTOMOBILE":                                      "AUTOMOBILE ENGINEERING",
    "BI BIOTECHNOLOGY":                                   "BIO-TECHNOLOGY",
    "BT BIO TECHNOLOGY":                                  "BIO-TECHNOLOGY",
    "BT BIO-TECHNOLOGY":                                  "BIO-TECHNOLOGY",
    "BT BIOTECHNOLOGY":                                   "BIO-TECHNOLOGY",
    "CE CIVIL":                                           "CIVIL ENGINEERING",
    "CH CHEMICAL":                                        "CHEMICAL ENGINEERING",
    "CS COMPUTERS":                                       "COMPUTER SCIENCE AND ENGINEERING",
    "CS COMPUTER SCIENCE":                                "COMPUTER SCIENCE AND ENGINEERING",
    "EC ELECTRONICS":                                     "ELECTRONICS AND COMMUNICATION ENGG",
    "EE ELECTRICAL":                                      "ELECTRICAL & ELECTRONICS ENGINEERING",
    "EI ELEC. INST. ENGG":                                "ELECTRONICS AND INSTRUMENTATION ENGINEERING",
    "EI ELECTRONICS AND INSTRUMENTATION":                 "ELECTRONICS AND INSTRUMENTATION ENGINEERING",
    "EN ENVIRONMENTAL":                                   "ENVIRONMENTAL ENGINEERING",
    "ET ELEC. TELECOMMN. ENGG.":                          "ELECTRONICS AND TELECOMMUNICATION ENGINEERING",
    "ET ELECTRONICS AND TELECOMMUNICATION":               "ELECTRONICS AND TELECOMMUNICATION ENGINEERING",
    "IE INFO.SCIENCE":                                    "INFORMATION SCIENCE AND ENGINEERING",
    "IE INFORMATION SCIENCE":                             "INFORMATION SCIENCE AND ENGINEERING",
    "IM IND. ENGG. MGMT.":                                "INDUSTRIAL ENGINEERING & MANAGEMENT",
    "IM IND. ENGG.":                                      "INDUSTRIAL ENGINEERING & MANAGEMENT",
    "IM INDUSTRIAL":                                      "INDUSTRIAL ENGINEERING & MANAGEMENT",
    "MD MED.ELECT.":                                      "MEDICAL ELECTRONICS",
    "MD MEDICAL ELECTRONICS":                             "MEDICAL ELECTRONICS",
    "ME MECHANICAL":                                      "MECHANICAL ENGINEERING",
    "MN MINING":                                          "MINING ENGINEERING",
    "MR MARINE":                                          "MARINE ENGINEERING",
    "PL POLYMER":                                         "POLYMER SCIENCE & TECHNOLOGY",
    "RI ROBOTICS AND AI":                                 "ROBOTICS AND ARTIFICIAL INTELLIGENCE",
    "SE AERO SPACE ENGG.":                                "AERO SPACE ENGINEERING",
    "SE AERO SPACE":                                      "AERO SPACE ENGINEERING",
    "ST SILK TECH.":                                      "SILK TECHNOLOGY",
    "ST SILK TECHNOLOGY":                                 "SILK TECHNOLOGY",
    "TX TEXTILES":                                        "TEXTILES TECHNOLOGY",
    "TX TEXTILE":                                         "TEXTILES TECHNOLOGY",
    # Specialised CSE variants
    "CA CS (AI, MACHINE LEARNING)":                       "COMPUTER SCIENCE AND ENGG(ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING)",
    "CY CS- CYBER SECURITY":                              "COMPUTER SCIENCE AND ENGG(CYBER SECURITY)",
    "CY CS-CYBER SECURITY":                               "COMPUTER SCIENCE AND ENGG(CYBER SECURITY)",
    "DS COMP. SC. ENGG- DATA SC.":                        "COMPUTER SCIENCE AND ENGG(DATA SCIENCE)",
    "IC CS-IOT, CYBER SECURITY":                          "COMPUTER SCIENCE AND ENGG(INTERNET OF THINGS)",
    # B.Tech variants
    "AM B TECH IN AM":                                    "B TECH IN AEROSPACE MANUFACTURING",
}

def normalise_course_name(raw):
    cleaned = re.sub(r"\s+", " ", raw.upper().strip())
    # 1. Exact match
    if cleaned in COURSE_NAME_2024_MAP:
        return COURSE_NAME_2024_MAP[cleaned]
    # 2. Partial prefix match — handles slight truncation differences
    for key, canonical in COURSE_NAME_2024_MAP.items():
        if cleaned.startswith(key):
            return canonical
    # 3. No match — return cleaned original (2025 full names pass through unchanged)
    return raw.strip()

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

    college_code = ""
    college_name = ""
    course_name = ""

    # Load Smart Mapping
    smart_mapping = {}
    if os.path.exists("college_mapping.json"):
        try:
            with open("college_mapping.json", "r", encoding="utf-8") as f:
                smart_mapping = json.load(f)
        except Exception:
            pass

    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        print("[INFO] Opened PDF: " + str(total) + " pages")

        for page_num, page in enumerate(pdf.pages, start=1):
            if page_num % 10 == 0:
                print("  ... scanning page " + str(page_num) + "/" + str(total), flush=True)

            text = page.extract_text() or ""
            college_positions = []

            for line in text.splitlines():
                # ── 2025 format: "College: E001 Name..." ─────────────────────
                # Modified regex to make college code optional
                m = re.match(r"College:\s*(?:([A-Z]\d{3,4})\s+)?(.*)", line.strip(), re.IGNORECASE)
                
                # ── 2024 format: "1 E001 Name..." (serial number prefix) ─────
                if not m:
                    m = re.match(r"^\d+\s+([A-Z]\d{3,4})\s+(.+)", line.strip())

                # ── Fallback: "E001  Name..." (2+ spaces, no prefix) ──────────
                if not m:
                    m = re.match(r"^([A-Z]\d{3,4})\s{2,}(.+)", line.strip())

                if m:
                    c_code = m.group(1).upper() if m.group(1) else ""
                    c_name = m.group(2).strip()
                    
                    if not c_code:
                        lookup_key = re.sub(r'[^a-z0-9]', '', c_name.lower())
                        if lookup_key in smart_mapping:
                            c_code = smart_mapping[lookup_key]
                        else:
                            # Try fuzzy match
                            matches = difflib.get_close_matches(lookup_key, smart_mapping.keys(), n=1, cutoff=0.85)
                            if matches:
                                c_code = smart_mapping[matches[0]]
                            else:
                                c_code = "UNKNOWN_CODE"
                            
                    college_code = c_code
                    college_name = c_name
                    college_positions.append((college_code, college_name))

            tables = page.extract_tables({
                "vertical_strategy": "lines",
                "horizontal_strategy": "lines",
            })

            college_idx = 0
            current_cc = college_code
            current_cn = college_name

            for table in tables:
                if not table or len(table) < 2:
                    continue

                header = [str(c or "").strip() for c in table[0]]

                # FIX: header[0] is None in 2024 PDFs — guard against None before .upper()
                cat_count = sum(1 for h in header if h and h.upper() in ALL_CATS)
                if cat_count < 3:
                    continue

                if college_idx < len(college_positions):
                    current_cc, current_cn = college_positions[college_idx]
                    college_idx += 1

                cat_col_map = {}
                for i, h in enumerate(header):
                    # FIX: skip None / empty headers
                    if h and h.upper() in ALL_CATS:
                        cat_col_map[i] = h.upper()

                for row in table[1:]:
                    if not row or not row[0]:
                        continue

                    course_raw = str(row[0] or "").strip()
                    if not course_raw:
                        continue
                    if course_raw.upper() in ("COURSE NAME", "COURSE\nNAME"):
                        continue

                    # Normalise 2024 abbreviated names → canonical full names
                    course_clean = normalise_course_name(course_raw.replace("\n", " ").strip())

                    if not want_all_branches:
                        if not branch_matches(course_clean, target_branches):
                            continue

                    for col_idx, cat_name in cat_col_map.items():
                        if not want_all_cats:
                            if cat_name not in target_cats_norm:
                                continue

                        if col_idx >= len(row):
                            continue

                        raw = str(row[col_idx] or "")
                        cell = re.sub(r"\s+", "", raw).strip()

                        if cell in ("--", "-", "", "None", "nan"):
                            rank = "--"
                        else:
                            try:
                                float(cell)
                                rank = cell
                            except ValueError:
                                rank = "ERR:" + cell

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