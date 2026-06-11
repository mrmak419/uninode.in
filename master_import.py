import os
import sys
import subprocess
import csv
import json
import requests

def main():
    print("="*60)
    print("  KEA MASTER IMPORTER (BULK UPLOAD MODE)")
    print("="*60)
    
    # Download Smart Fallback Mapping
    print("Downloading smart college mapping from database...")
    try:
        with open(".env", "r") as f:
            lines = f.readlines()
        key = [l.split("=")[1].strip().strip("\"'") for l in lines if "SUPABASE_KEY" in l][0]
        url = "https://rtmyynqiyxfqfqnjdgoq.supabase.co/rest/v1/colleges?select=college_code,college_name"
        headers = {"apikey": key, "Authorization": f"Bearer {key}"}
        
        r = requests.get(url, headers=headers)
        if r.status_code == 200:
            import re
            data = r.json()
            mapping = {}
            for row in data:
                # Completely strip spaces, dots, and punctuation for the key
                norm_key = re.sub(r'[^a-z0-9]', '', row["college_name"].lower())
                mapping[norm_key] = row["college_code"]
            
            with open("college_mapping.json", "w", encoding="utf-8") as f:
                json.dump(mapping, f, indent=2)
            print(f"  -> Successfully cached {len(mapping)} colleges for smart fallback.\n")
        else:
            print(f"  -> Warning: Could not download college mapping (Status {r.status_code})\n")
    except Exception as e:
        print(f"  -> Warning: Failed to download college mapping: {e}\n")

    print("Scanning 'pdf' folder for files...")

    pdf_files = []
    for root, dirs, files in os.walk("pdf"):
        if "pdf_backup" in root: continue
        for file in files:
            if file.lower().endswith(".pdf"):
                pdf_files.append(os.path.join(root, file))
                
    if not pdf_files:
        print("\nError: No PDFs found in the 'pdf/' directory.")
        print("Please place your files in the format: pdf/<year>/round<round>/<stream>/<seattype>.pdf")
        sys.exit(1)

    parsed_pdfs = []
    for path in pdf_files:
        norm_path = os.path.normpath(path)
        parts = norm_path.split(os.sep)
        
        if len(parts) >= 5 and parts[0] == "pdf":
            year = parts[1]
            round_folder = parts[2]
            stream = parts[3]
            seat_file = parts[4]
            seat_type = seat_file.replace(".pdf", "").replace(".PDF", "").upper()
            
            round_num = round_folder.lower().replace("round", "")
            if not round_num:
                round_num = "1"
                
            parsed_pdfs.append({
                "path": path,
                "year": year,
                "round": round_num,
                "stream": stream,
                "seat_type": seat_type,
                "display": f"Year: {year} | Round: {round_num} | Stream: {stream.title()} | Seat: {seat_type}"
            })
        else:
            parsed_pdfs.append({
                "path": path,
                "year": "Unknown",
                "round": "Unknown",
                "stream": "Unknown",
                "seat_type": "Unknown",
                "display": f"Uncategorized: {norm_path}"
            })
            
    print(f"\nFound {len(parsed_pdfs)} PDFs ready to process:")
    for idx, p in enumerate(parsed_pdfs, 1):
        print(f"  {idx}) {p['display']}")
        
    print("\n[A] Process ALL PDFs listed above")
    print("[1-N] Process a specific PDF")
    
    choice = input(f"\nEnter a number or 'A' to process all: ").strip().upper()
    
    selected_pdfs = []
    if choice == 'A':
        selected_pdfs = parsed_pdfs
    else:
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(parsed_pdfs):
                selected_pdfs = [parsed_pdfs[idx]]
            else:
                print("Invalid choice.")
                sys.exit(1)
        except ValueError:
            print("Invalid input.")
            sys.exit(1)

    for selected in selected_pdfs:
        if selected["year"] == "Unknown":
            print(f"\nError: File not in the correct folder structure: {selected['path']}")
            print("Please organize it as: pdf/<year>/round<num>/<stream>/<seattype>.pdf")
            sys.exit(1)

    print(f"\n[Step 1] Extracting data for {len(selected_pdfs)} PDF(s)...")
    
    successful_extractions = []
    
    for selected in selected_pdfs:
        year = selected["year"]
        round_num = selected["round"]
        stream = selected["stream"]
        seat_type = selected["seat_type"]
        pdf_path = selected["path"]
        
        base_name = f"{year}_r{round_num}_{stream}_{seat_type}.csv".lower()
        csv_dir = os.path.join("csv", year, f"round{round_num}")
        os.makedirs(csv_dir, exist_ok=True)
        csv_path = os.path.join(csv_dir, base_name)

        print(f"\n  -> Extracting: {pdf_path}")
        try:
            extractor_script = "kea_rank_extractor_2024.py" if year == "2024" else "kea_rank_extractor.py"
            extractor_cmd = [sys.executable, os.path.join("extractors", extractor_script), pdf_path, "--output", csv_path]
            subprocess.run(extractor_cmd, check=True)
            
            if os.path.exists(csv_path):
                successful_extractions.append({
                    "selected": selected,
                    "csv_path": csv_path
                })
            else:
                print(f"  ❌ Error: The extractor finished but did not create the CSV file ({csv_path}).")
        except subprocess.CalledProcessError:
            print(f"  ❌ Extraction failed for {pdf_path}")

    if not successful_extractions:
        print("\nNo PDFs were successfully extracted. Exiting.")
        sys.exit(1)
        
    print(f"\n============================================================")
    print(f"Extraction complete! {len(successful_extractions)} CSV files have been generated.")
    print(f"They are safely saved in the 'csv/' folder.")
    print(f"You may now manually review the CSVs before continuing.")
    print(f"============================================================")

    # --- UPLOAD TO SUPABASE ---
    confirm = input("\nDo you want to bulk upload these CSVs to Supabase now? (y/n): ").strip().lower()
    if confirm in ('y', 'yes'):
        print("\n[Step 2] Uploading to database...")
        
        for item in successful_extractions:
            selected = item["selected"]
            csv_path = item["csv_path"]
            pdf_path = selected["path"]
            
            year = selected["year"]
            round_num = selected["round"]
            stream = selected["stream"]
            seat_type = selected["seat_type"]
            
            print(f"\n  -> Uploading: {csv_path}")
            try:
                importer_cmd = [
                    sys.executable, os.path.join("extractors", "kea_import.py"), csv_path, 
                    "--year", year, 
                    "--round", round_num, 
                    "--seat-type", seat_type, 
                    "--stream", stream
                ]
                subprocess.run(importer_cmd, check=True)
                
                # Cleanup original PDF but leave the CSV
                try:
                    os.remove(pdf_path)
                    print(f"  🗑️  Deleted original PDF: {pdf_path}")
                except Exception as e:
                    print(f"  ⚠️  Could not delete PDF: {e}")
                    
            except subprocess.CalledProcessError:
                print(f"  ❌ Upload failed for {csv_path}")
                
        print("\n✅ All Uploads Complete!")
        print("Remember to run 'npm run build' inside the 'kcet-ranks' folder to update the frontend metadata!")
    else:
        print("\nUpload cancelled. The extracted data is safely saved in the CSV folder.")

if __name__ == "__main__":
    main()
