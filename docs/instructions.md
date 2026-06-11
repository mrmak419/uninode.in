# KEA Data Import Instructions

Use the following commands to parse and upload the KEA PDF cutoffs to your Supabase database. 

> **Note:** Replace `path/to/pdf.pdf` with the actual path to your downloaded PDF file for that specific round.

## 1. Engineering
*Note: If `--stream` is omitted, it defaults to engineering.*

**ROK (General / Rest of Karnataka)**
```bash
python scratch/kea_import.py path/to/engineering_rok.pdf --year 2024 --round 1 --seat-type ROK --stream engineering
```

**HK (Kalyana Karnataka / Hyderabad-Karnataka)**
```bash
python scratch/kea_import.py path/to/engineering_hk.pdf --year 2024 --round 1 --seat-type HK --stream engineering
```

---

## 2. Architecture

**ROK**
```bash
python scratch/kea_import.py path/to/architecture_rok.pdf --year 2024 --round 1 --seat-type ROK --stream architecture
```

**HK**
```bash
python scratch/kea_import.py path/to/architecture_hk.pdf --year 2024 --round 1 --seat-type HK --stream architecture
```

---

## 3. B.Pharma

**ROK**
```bash
python scratch/kea_import.py path/to/b_pharma_rok.pdf --year 2024 --round 1 --seat-type ROK --stream b_pharma
```

**HK**
```bash
python scratch/kea_import.py path/to/b_pharma_hk.pdf --year 2024 --round 1 --seat-type HK --stream b_pharma
```

---

## 4. Pharma.D

**ROK**
```bash
python scratch/kea_import.py path/to/pharma_d_rok.pdf --year 2024 --round 1 --seat-type ROK --stream pharma_d
```

**HK**
```bash
python scratch/kea_import.py path/to/pharma_d_hk.pdf --year 2024 --round 1 --seat-type HK --stream pharma_d
```

---

## 5. Agri B.Sc / Farm Sciences

**ROK**
```bash
python scratch/kea_import.py path/to/agri_bsc_rok.pdf --year 2024 --round 1 --seat-type ROK --stream agri_bsc
```

**HK**
```bash
python scratch/kea_import.py path/to/agri_bsc_hk.pdf --year 2024 --round 1 --seat-type HK --stream agri_bsc
```

---

## 6. BPT (Physiotherapy)

**ROK**
```bash
python scratch/kea_import.py path/to/bpt_rok.pdf --year 2024 --round 1 --seat-type ROK --stream bpt
```

**HK**
```bash
python scratch/kea_import.py path/to/bpt_hk.pdf --year 2024 --round 1 --seat-type HK --stream bpt
```

---

## 7. Nursing (B.Sc)

**ROK**
```bash
python scratch/kea_import.py path/to/nursing_rok.pdf --year 2024 --round 1 --seat-type ROK --stream nursing
```

**HK**
```bash
python scratch/kea_import.py path/to/nursing_hk.pdf --year 2024 --round 1 --seat-type HK --stream nursing
```

---

## 8. Food Science

**ROK**
```bash
python scratch/kea_import.py path/to/food_science_rok.pdf --year 2024 --round 1 --seat-type ROK --stream food_science
```

**HK**
```bash
python scratch/kea_import.py path/to/food_science_hk.pdf --year 2024 --round 1 --seat-type HK --stream food_science
```

---

## 9. BPO (Prosthetics and Orthotics)

**ROK**
```bash
python scratch/kea_import.py path/to/bpo_rok.pdf --year 2024 --round 1 --seat-type ROK --stream bpo
```

**HK**
```bash
python scratch/kea_import.py path/to/bpo_hk.pdf --year 2024 --round 1 --seat-type HK --stream bpo
```

---

## Generating the UI Metadata
Once you have finished running the Python script for the streams and PDFs you want, you **must run the frontend build step** to pull the latest data from Supabase and generate the `streams.json` and `meta_*.json` files for the UI!

Run this in your terminal:
```bash
npm run build
```
This will also automatically regenerate your `sitemap.xml`.

---

## ⚡ Using the Interactive Master Importer (Recommended)

Instead of typing out the long manual commands above, you can use the new interactive wizard located in the root folder (`master_import.py`).

1. Open your terminal in the main `kcet-colleges` folder.
2. Run the wizard:
   ```bash
   python master_import.py
   ```
3. The wizard will ask you for:
   * **PDF Path** (e.g. `2024_arch_r1_rok.pdf`)
   * **Year** (e.g. `2024`)
   * **Round** (e.g. `1`)
   * **Seat Type** (Select `1` for ROK, `2` for HK)
   * **Stream** (Select `1` to `9` from the list)
4. It will extract the data and show you the generated CSV file.
5. It will pause and ask if you want to upload it to Supabase. Type `y` to upload instantly.
