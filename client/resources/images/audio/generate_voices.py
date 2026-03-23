#!/usr/bin/env python3
"""
Batch TTS voice generation for 寻道修仙
Reads voice-lines.txt and generates MP3 files
"""
import os
import sys
import json
import base64
import urllib.request
import urllib.error
import time

API_URL = "https://api.minimaxi.com/v1/t2a_v2"
DEFAULT_MODEL = "speech-02-hd"

def generate_tts(text, voice, output_path, model=DEFAULT_MODEL):
    api_key = os.environ.get("MINIMAX_CODING_PLAN_KEY") or os.environ.get("MINIMAX_API_KEY")
    if not api_key:
        print(f"❌ API key not set")
        return False
    
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "text": text,
        "stream": False,
        "voice_setting": {
            "voice_id": voice,
            "speed": 1.0,
            "pitch": 0,
            "volume": 100,
        },
        "audio_setting": {
            "sample_rate": 32000,
            "bitrate": 128000,
            "format": "mp3",
        },
    }
    
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(API_URL, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode("utf-8"))
        
        if result.get("base64"):
            audio_data = base64.b64decode(result["base64"])
            with open(output_path, "wb") as f:
                f.write(audio_data)
            size_kb = len(audio_data) // 1024
            print(f"  ✅ {os.path.basename(output_path)} ({size_kb} KB)")
            return True
        else:
            print(f"  ❌ No audio in response: {result}")
            return False
    except urllib.error.HTTPError as e:
        print(f"  ❌ HTTP {e.code}: {e.read().decode()[:100]}")
        return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    lines_file = os.path.join(script_dir, "voice-lines.txt")
    output_dir = script_dir
    
    if not os.path.exists(lines_file):
        print(f"❌ File not found: {lines_file}")
        sys.exit(1)
    
    with open(lines_file, "r", encoding="utf-8") as f:
        lines = [l.strip() for l in f if l.strip() and not l.startswith("#")]
    
    total = len(lines)
    print(f"🎙️  Generating {total} TTS voice files...")
    print(f"📁 Output: {output_dir}\n")
    
    total_chars = 0
    success = 0
    for i, line in enumerate(lines):
        parts = line.split("|")
        if len(parts) != 3:
            print(f"  ⚠️  Skipping invalid line: {line}")
            continue
        
        text, voice, filename = parts
        output_path = os.path.join(output_dir, f"{filename}.mp3")
        total_chars += len(text)
        
        print(f"[{i+1}/{total}] {text[:40]}... -> {filename}.mp3")
        ok = generate_tts(text, voice, output_path)
        if ok:
            success += 1
        time.sleep(0.5)  # Rate limiting
    
    print(f"\n📊 Complete: {success}/{total} files generated")
    print(f"📝 Total chars used: ~{total_chars}")
    print(f"💰 Remaining daily quota: ~{11000 - total_chars}")

if __name__ == "__main__":
    main()
