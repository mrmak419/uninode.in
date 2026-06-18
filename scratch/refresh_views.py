import requests
import json
import os

env_path = "C:/Users/mrmak/OneDrive/Desktop/web-apps/kcet-colleges/.env"
key = None
with open(env_path, "r") as f:
    for line in f.readlines():
        if "SUPABASE_KEY" in line:
            key = line.split("=")[1].strip().strip("\"'")
            break

if not key:
    print("Error: SUPABASE_KEY not found in .env")
    exit(1)

# Base Supabase API URL
base_url = "https://rtmyynqiyxfqfqnjdgoq.supabase.co/rest/v1"
headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

# 1. Fetch unique streams dynamically from colleges and branches
print("Fetching all available streams from database...")
streams = set()

# Get streams from colleges
try:
    r_col = requests.get(f"{base_url}/colleges?select=stream", headers=headers)
    if r_col.status_code == 200:
        for row in r_col.json():
            if row.get("stream"):
                streams.add(row["stream"])
except Exception as e:
    print(f"Error fetching colleges: {e}")

# Get streams from branches
try:
    r_br = requests.get(f"{base_url}/branches?select=stream", headers=headers)
    if r_br.status_code == 200:
        for row in r_br.json():
            if row.get("stream"):
                streams.add(row["stream"])
except Exception as e:
    print(f"Error fetching branches: {e}")

if not streams:
    print("No streams found in the database. Exiting.")
    exit(1)

print(f"Found {len(streams)} streams: {', '.join(streams)}\n")

# 2. Refresh materialized views for each stream
rpc_url = f"{base_url}/rpc/refresh_stream_matrix"

for stream in streams:
    try:
        r = requests.post(rpc_url, headers=headers, json={"p_stream": stream})
        if r.status_code in [200, 204]:
            print(f"✅ Refreshed views for: {stream}")
        elif r.status_code == 404:
            print(f"⚠️ No refresh function found for {stream} (may not have cutoffs_matrix view yet)")
        else:
            print(f"❌ Failed to refresh {stream}: {r.status_code} - {r.text}")
    except Exception as e:
        print(f"❌ Error refreshing {stream}: {e}")

print("\nDone refreshing views!")
