import os
import requests
import json

try:
    with open('.env', 'r') as f:
        lines = f.readlines()
    key = [l.split('=')[1].strip().strip('\"\'') for l in lines if 'SUPABASE_KEY' in l][0]
    headers = {'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}
    
    # 1. Get total cutoffs
    url_total = 'https://rtmyynqiyxfqfqnjdgoq.supabase.co/rest/v1/cutoffs?select=id&limit=1'
    r_total = requests.get(url_total, headers={**headers, 'Prefer': 'count=exact'})
    total_count = r_total.headers.get('content-range', '').split('/')[-1] if 'content-range' in r_total.headers else '0'
    print(f"Total Rows in 'cutoffs' table: {total_count}")

    # 2. Get distinct streams
    # Since Supabase REST doesn't easily do DISTINCT natively without RPC, 
    # we can fetch streams by grouping if we had RPC, but we can also use PostgREST
    url_streams = 'https://rtmyynqiyxfqfqnjdgoq.supabase.co/rest/v1/cutoffs?select=stream'
    # Wait, fetching all is bad. Let's use RPC if possible, or just look at branches
    
    # Instead, we can just use the RPC we have or fetch all distinct streams using standard query params?
    # PostgREST has no distinct. Let's get streams from the colleges table (smaller)
    url_colleges = 'https://rtmyynqiyxfqfqnjdgoq.supabase.co/rest/v1/colleges?select=stream'
    r_colleges = requests.get(url_colleges, headers=headers)
    if r_colleges.status_code == 200:
        streams = list(set([row['stream'] for row in r_colleges.json()]))
        print(f"\nFound Streams: {', '.join(streams)}")
        
        print("\nMaterialized View Row Counts (cutoffs_matrix_STREAM):")
        for stream in streams:
            url_mat = f'https://rtmyynqiyxfqfqnjdgoq.supabase.co/rest/v1/cutoffs_matrix_{stream}?select=college_code&limit=1'
            r_mat = requests.get(url_mat, headers={**headers, 'Prefer': 'count=exact'})
            if r_mat.status_code in (200, 206):
                count = r_mat.headers.get('content-range', '').split('/')[-1] if 'content-range' in r_mat.headers else '0'
                print(f"  - {stream}: {count} grouped rows (matrix view)")
            else:
                print(f"  - {stream}: View might not exist or failed (Status {r_mat.status_code})")
    else:
        print(f"Failed to fetch colleges: {r_colleges.status_code}")
except Exception as e:
    print(f"Error: {e}")
