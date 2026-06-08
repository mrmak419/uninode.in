import os
import sys
import json
import requests

MAPPING = {
    "ARCHITECTURE": "DESIGN",
    "AT Automotive Engg.": "AUTOMOTIVE ENGINEERING",
    "B TECH IN AEROSPACE MANUFACTURING": "AERO SPACE ENGINEERING",
    "BA B.Tech(Agri.Engg)": "AGRICULTURE ENGINEERING",
    "BB B Tech in EC": "ELECTRONICS AND COMMUNICATION ENGG",
    "BF B Tech in DS": "DATA SCIENCES",
    "BG B Tech in AD": "ARTIFICIAL INTELLIGENCE",
    "BH B Tech in AI": "ARTIFICIAL INTELLIGENCE",
    "BJ B Tech in EE": "ELECTRICAL & ELECTRONICS ENGINEERING",
    "BK B Tech in EN": "ENVIRONMENTAL ENGINEERING",
    "BL B Tech in AS": "AERO SPACE ENGINEERING",
    "BM Bio Medical": "BIO-MEDICAL ENGINEERING",
    "BN B Tech in BD": "DATA SCIENCES",
    "BO B Tech in BT": "BIO- TECHNOLOGY",
    "BP B Tech in CE": "CIVIL ENGINEERING",
    "BQ B Tech in CG": "Computer Science and Engineering",
    "BR BioMed. and Robotic Engg": "BIO-MEDICAL ENGINEERING",
    "BU B Tech in CI": "Computer Science and Engineering",
    "BV B Tech in CO": "COMPUTER ENGINEERING",
    "BW B Tech in CS": "Computer Science and Engineering",
    "BX B Tech in CY": "CYBER SECURITY",
    "BY B Tech in DO": "DATA SCIENCES",
    "BZ B Tech in DS": "DATA SCIENCES",
    "CB Comp. Sc. and Bus Sys.": "Computer Science and Engineering",
    "CC Computer and Comm. Engg.": "COMPUTER AND COMMUNICATION ENGINEERING",
    "CD Computer Sc. and Design": "COMPUTER SCIENCE AND DESIGN",
    "CF CS(Artificial Intel.)": "ARTIFICIAL INTELLIGENCE",
    "CG Computer Science and Tech": "COMPUTER SCIENCE AND TECHNOLOGY",
    "CK Civil Engg (Kannada)": "CIVIL ENGINEERING",
    "CL B Tech in EO": "ELECTRONICS ENGINEERING",
    "CM B Tech in EV": "AUTOMOBILE ENGINEERING",
    "CN B Tech in IB": "Computer Science and Engineering",
    "CO Computer Engineering": "COMPUTER ENGINEERING",
    "COMPUTER SCIENCE AND ENGG(CYBER SECURITY)": "CYBER SECURITY",
    "COMPUTER SCIENCE AND ENGG(DATA SCIENCE)": "DATA SCIENCES",
    "CQ B Tech in IO": "INDUSTRIAL IOTINDUSTRIAL IOT",
    "CR Ceramics": "CERAMICS & CEMENT ENGINEERING",
    "CT Const. Tech. Mgmt.": "CONSTRUCTION TECHNOLOGY AND MGMT",
    "CU B Tech in IS": "INFORMATION SCIENCE AND ENGINEERING",
    "CV Civil Environment Engg": "CIVIL ENVIRONMENTAL ENGINEERING",
    "CW B Tech in IT": "INFORMATION TECHNOLOGY",
    "CX B Tech in IY": "INFORMATION TECHNOLOGY",
    "CZ B Tech in LC": "ELECTRONICS AND COMMUNICATION ENGG",
    "DA B Tech in MC": "MATHAMATICS AND COMPUTING",
    "DB B Tech in ME": "MECHANICAL ENGINEERING",
    "DC Data Sciences": "DATA SCIENCES",
    "DD B Tech in MS": "MECHANICAL AND SMART MANUFACTURING",
    "DE B Tech in PE": "PRODUCTION ENGINEERING",
    "DF B Tech in RA": "ROBOTICS AND ARTIFICIAL INTELLIGENCE",
    "DG DESIGN": "DESIGN",
    "DH B Tech in RAI": "ROBOTICS AND ARTIFICIAL INTELLIGENCE",
    "DI B Tech in RE": "ROBOTICS ENGINEERING",
    "DJ B Tech in RO": "AUTOMATION AND ROBOTICS",
    "DK B Tech in SS": "Computer Science and Engineering",
    "DL B.TECH IN CS": "Computer Science and Engineering",
    "DM B.TECH IN CS NW": "Computer Science and Engineering",
    "DN B.Tech in VLSI": "VLSI",
    "EA Agriculture Engineering": "AGRICULTURE ENGINEERING",
    "EB EAT": "ELECTRONICS AND TELECOMMUNICATION ENGINEERING",
    "EL Electronics, Instr. Tech.": "ELECTRONICS & INSTRUMENTATION ENGINEERING",
    "ELECTRONICS AND TELECOMMUNICATION ENGINEERING": "ELECTRONICS AND TELECOMMUNICATION ENGINEERING",
    "ER Electrical and Computer": "ELECTRICAL & COMPUTER ENGINEERING",
    "ES Electronics and Computer": "ELECTRONICS & COMPUTER SCIENCE",
    "EV EC Engg(VLSI Design)": "VLSI",
    "EZ ELECTRONICS AND COMPUT": "ELECTRONICS & COMPUTER SCIENCE",
    "IO CS- Internet of Things": "Computer Science and Engineering",
    "IP Ind.Prodn.": "INDUSTRIAL & PRODUCTION ENGINEERING",
    "IZ INFORMATION SCIENCE": "INFORMATION SCIENCE AND ENGINEERING",
    "LA B Plan": "PLANNING",
    "LD B Tech in DS": "DATA SCIENCES",
    "LE B Tech in AIML": "ARTIFICIAL INTELLIGENCE",
    "LF B Tech in CC": "COMPUTER AND COMMUNICATION ENGINEERING",
    "LG B Tech in CS": "Computer Science and Engineering",
    "LH B Tech in IS": "INFORMATION SCIENCE AND ENGINEERING",
    "LJ B Tech in BS": "Computer Science and Engineering",
    "LK B Tech in IOT": "Computer Science and Engineering",
    "MEDICAL ELECTRONICS": "MEDICAL ELECTRONICS ENGINEERING",
    "MI Mining Engineering": "MINING ENGINEERING",
    "MK Mechanical Engg (Kannada)": "MECHANICAL ENGINEERING",
    "MM Mechanical, Smart Manf.": "MECHANICAL AND SMART MANUFACTURING",
    "MT Mechatronics": "MECHATRONICS",
    "OT Industrial IOT": "INDUSTRIAL IOTINDUSTRIAL IOT",
    "PT Polymer Tech.": "POLYMER SCIENCE & TECHNOLOGY",
    "RA Robotics and Automation": "AUTOMATION AND ROBOTICS",
    "RO Auto. And Robot.": "AUTOMATION AND ROBOTICS",
    "SA Smart Agritech": "AGRICULTURE ENGINEERING",
    "TC Telecommn.": "ELECTRONICS AND TELECOMMUNICATION ENGINEERING",
    "UP Planning": "PLANNING",
    "UR Planning": "PLANNING",
    "YA B.TEHIN COM.SCE.ENG(ROBO)": "Computer Science and Engineering",
    "YB B.TECH IN CS.ENG(DAT ANA)": "DATA SCIENCES",
    "YC B.TECH IN EMD. SYS. VLSI": "EMBEDDED SYSTEM AND VLSI",
    "YD B.TECH IN CS AND ARTI INT": "ARTIFICIAL INTELLIGENCE",
    "YE B.TECH IN CIV.CONST.SUST.": "CIVIL CONSTRUCTION AND SUSTAINABILITY ENGINEERING",
    "YF B.TECH IN ELECT ENGG. CS.": "ELECTRICAL & COMPUTER ENGINEERING",
    "YG B.TECH IN EC.ENG.VSLI EMD": "VLSI",
    "YH ENGINEERING DESIGN": "ENGINEERING DESIGN",
    "YI B.TECH IN MECHANICAL": "MECHANICAL ENGINEERING",
    "ZA B TECH IN AERONAUT. ENGG.": "AERONAUTICAL ENGINEERING",
    "ZC CSC": "Computer Science and Engineering",
    "ZH B TECH IN COMP.SC.ART.INT": "ARTIFICIAL INTELLIGENCE",
    "ZL CIVIL ENG. WITH COMP.APPL": "CIVIL ENGINEERING",
    "ZM B.TECH IN COMP.SCI. DESI.": "COMPUTER SCIENCE AND DESIGN",
    "ZN B.TECH IN PHARM. ENGG.": "PHARMACEUTICAL ENGINEERING",
    "ZO B.TECH IN CS.AND BUSI.SYS": "Computer Science and Engineering",
    "ZQ B.TECH IN IN.TCH.DAT.ANAL": "INFORMATION TECHNOLOGY",
    "ZR COMP.SCE.AND ENG(ART.INT)": "ARTIFICIAL INTELLIGENCE",
    "ZT B.TECH. IN MECH.SMAR.MANU": "MECHANICAL AND SMART MANUFACTURING",
    "ZU CYBER SECURITY": "CYBER SECURITY",
    "ZV B.TECH.IN INF.TEC.AUG.REA": "INFORMATION TECHNOLOGY",
    "ZW COMP. SCE. AND ENG (AIML)": "ARTIFICIAL INTELLIGENCE"
}

SUPABASE_URL = "https://wkzdwmtlsfmsipbcmhec.supabase.co"

def main():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    if k not in os.environ:
                        os.environ[k] = v.strip("'\"")

    service_key = os.environ.get("SUPABASE_KEY")
    if not service_key:
        print("ERROR: SUPABASE_KEY not found in .env")
        sys.exit(1)

    headers = {
        "apikey": service_key,
        "Authorization": "Bearer " + service_key,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    print("Fetching parent branches...")
    r = requests.get(f"{SUPABASE_URL}/rest/v1/parent_branches", headers=headers)
    if r.status_code != 200:
        print("Failed to fetch parent branches.")
        sys.exit(1)
        
    parents = r.json()
    parent_map = {p['name']: p['id'] for p in parents}

    print("Applying mappings to database...")
    success = 0
    for raw_name, parent_name in MAPPING.items():
        if parent_name not in parent_map:
            print(f"Skipping {raw_name}: Parent {parent_name} not found in DB")
            continue
            
        pid = parent_map[parent_name]
        
        url = f"{SUPABASE_URL}/rest/v1/branches?raw_name=eq.{raw_name}"
        data = {"parent_id": pid}
        
        r = requests.patch(url, headers=headers, data=json.dumps(data))
        if r.status_code in (200, 204):
            success += 1
        else:
            print(f"Failed to update {raw_name}: {r.status_code} {r.text}")

    print(f"\nSuccessfully mapped {success} out of {len(MAPPING)} branches!")

    # Refresh materialized views
    print("Refreshing cutoffs_matrix view...")
    r = requests.post(
        SUPABASE_URL + "/rest/v1/rpc/refresh_cutoffs_matrix",
        headers=headers,
        data=json.dumps({})
    )
    if r.status_code in (200, 204):
        print("Views refreshed.")
    else:
        print("Warning: could not refresh views: " + str(r.status_code))

if __name__ == "__main__":
    main()
