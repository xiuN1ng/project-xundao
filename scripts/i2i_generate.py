#!/usr/bin/env python3
"""
MiniMax 图生图 (i2i) 脚本
用法: python i2i_generate.py "<prompt>" <image_path> [output_path]
"""
import os
import sys
import json
import base64
import urllib.request
import urllib.error
import time

API_KEY = os.getenv("MINIMAX_CODING_PLAN_KEY")
if not API_KEY:
    env_file = os.path.expanduser("~/.openclaw/.env")
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                if line.startswith("MINIMAX_CODING_PLAN_KEY="):
                    API_KEY = line.strip().split("=", 1)[1].strip()
                    break

if not API_KEY:
    print("❌ MINIMAX_CODING_PLAN_KEY not found")
    sys.exit(1)

PROMPT = sys.argv[1] if len(sys.argv) > 1 else input("Prompt: ").strip()
IMG_PATH = sys.argv[2] if len(sys.argv) > 2 else input("Image path: ").strip()
OUTPUT = sys.argv[3] if len(sys.argv) > 3 else "/root/.openclaw/workspace/xundao-new/client/resources/images/"

if not os.path.exists(IMG_PATH):
    print(f"❌ Image not found: {IMG_PATH}")
    sys.exit(1)

print(f"Encoding image: {IMG_PATH}")
with open(IMG_PATH, 'rb') as f:
    img_b64 = base64.b64encode(f.read()).decode('utf-8')

data = {
    "model": "image-01",
    "prompt": PROMPT,
    "image_urls": [f"data:image/png;base64,{img_b64}"],
    "n": 1,
    "response_format": "url"
}

print(f"Calling MiniMax i2i API...")
req = urllib.request.Request(
    "https://api.minimaxi.com/v1/image_generation",
    data=json.dumps(data).encode('utf-8'),
    headers={
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {API_KEY}'
    },
    method='POST'
)

try:
    with urllib.request.urlopen(req, timeout=120) as response:
        result = json.loads(response.read().decode('utf-8'))
        img_url = result['data']['image_urls'][0]
        print(f"✅ Generated: {img_url}")

        # Download
        os.makedirs(OUTPUT, exist_ok=True)
        timestamp = int(time.time())
        fname = f"i2i_{timestamp}.png"
        filepath = os.path.join(OUTPUT, fname)
        urllib.request.urlretrieve(img_url, filepath)
        print(f"✅ Saved: {filepath}")
        print(f"FILE:{filepath}")
except urllib.error.HTTPError as e:
    print(f"❌ HTTP {e.code}: {e.read().decode()[:500]}")
except Exception as e:
    print(f"❌ Error: {e}")
