import sys
import pdfplumber

def debug_pdf(pdf_path, pages_to_check=(1, 2, 3)):
    print("=" * 70)
    print("KEA PDF Debugger")
    print("File: " + pdf_path)
    print("=" * 70)

    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        print("Total pages: " + str(total))

        for page_num in pages_to_check:
            if page_num > total:
                continue

            page = pdf.pages[page_num - 1]
            print("\n" + "-" * 70)
            print("PAGE " + str(page_num))
            print("-" * 70)

            # 1. Raw text
            text = page.extract_text() or ""
            lines = [l for l in text.splitlines() if l.strip()]
            print("\n[RAW TEXT] First 30 lines:")
            for i, line in enumerate(lines[:30]):
                print("  " + str(i+1) + ": " + repr(line))

            # 2. Table - lines strategy
            print("\n[TABLE - lines strategy]")
            try:
                tables = page.extract_tables({
                    "vertical_strategy": "lines",
                    "horizontal_strategy": "lines",
                })
                print("  Tables found: " + str(len(tables)))
                for ti, tbl in enumerate(tables):
                    print("  Table " + str(ti+1) + ": " + str(len(tbl)) + " rows x " + str(len(tbl[0]) if tbl else 0) + " cols")
                    if tbl:
                        print("  Header: " + str(tbl[0]))
                    if tbl and len(tbl) > 1:
                        print("  Row 2:  " + str(tbl[1]))
                    if tbl and len(tbl) > 2:
                        print("  Row 3:  " + str(tbl[2]))
            except Exception as e:
                print("  Error: " + str(e))

            # 3. Table - text strategy
            print("\n[TABLE - text strategy]")
            try:
                tables = page.extract_tables({
                    "vertical_strategy": "text",
                    "horizontal_strategy": "text",
                })
                print("  Tables found: " + str(len(tables)))
                for ti, tbl in enumerate(tables):
                    print("  Table " + str(ti+1) + ": " + str(len(tbl)) + " rows x " + str(len(tbl[0]) if tbl else 0) + " cols")
                    if tbl:
                        print("  Header: " + str(tbl[0]))
                    if tbl and len(tbl) > 1:
                        print("  Row 2:  " + str(tbl[1]))
            except Exception as e:
                print("  Error: " + str(e))

            # 4. Table - default
            print("\n[TABLE - default strategy]")
            try:
                tables = page.extract_tables()
                print("  Tables found: " + str(len(tables)))
                for ti, tbl in enumerate(tables):
                    print("  Table " + str(ti+1) + ": " + str(len(tbl)) + " rows x " + str(len(tbl[0]) if tbl else 0) + " cols")
                    if tbl:
                        print("  Header: " + str(tbl[0]))
                    if tbl and len(tbl) > 1:
                        print("  Row 2:  " + str(tbl[1]))
            except Exception as e:
                print("  Error: " + str(e))

            # 5. Word bounding boxes
            print("\n[WORDS - first 20]")
            try:
                words = page.extract_words()
                for w in words[:20]:
                    print("  x0=" + str(round(w["x0"],1)) + "  top=" + str(round(w["top"],1)) + "  text=" + repr(w["text"]))
            except Exception as e:
                print("  Error: " + str(e))

            # 6. Lines and rects
            print("\n[LINES & RECTS]")
            print("  Horizontal edges : " + str(len(page.horizontal_edges)))
            print("  Vertical edges   : " + str(len(page.vertical_edges)))
            try:
                print("  Rects            : " + str(len(page.rects)))
            except:
                pass

    print("\n" + "=" * 70)
    print("Debug complete - paste this output back to Claude")
    print("=" * 70)


if len(sys.argv) < 2:
    print("Usage: python kea_debug.py <path_to_pdf>")
    sys.exit(1)

debug_pdf(sys.argv[1], pages_to_check=(1, 2, 3))