#!/usr/bin/env python3
"""
MiniMax 文生图脚本
使用 MiniMax Token Plan API 生成图片

用法:
    python minimax_image.py "prompt" [options]
    
选项:
    --model MODEL          模型名称 (image-01, image-01-live)
    --aspect RATIO         宽高比 (1:1, 16:9, 4:3, 3:2, 2:3, 3:4, 9:16, 21:9)
    --width WIDTH          图片宽度 (512-2048, 必须是8的倍数)
    --height HEIGHT        图片高度 (512-2048, 必须是8的倍数)
    --n NUM                生成数量 (1-9)
    --seed SEED            随机种子 (用于复现)
    --output DIR           输出目录
    --prompt-optimizer     启用 prompt 自动优化
    --save                 保存图片到本地
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.error
from datetime import datetime

# API 配置
API_URL = "https://api.minimaxi.com/v1/image_generation"
DEFAULT_MODEL = "image-01"

def get_api_key():
    """获取 API Key"""
    key = os.getenv("MINIMAX_CODING_PLAN_KEY")
    if not key:
        # 尝试从配置文件读取
        env_file = os.path.expanduser("~/.openclaw/.env")
        if os.path.exists(env_file):
            with open(env_file, 'r') as f:
                for line in f:
                    if line.strip().startswith("MINIMAX_CODING_PLAN_KEY="):
                        key = line.split("=", 1)[1].strip()
                        break
    return key

def generate_image(prompt, model=DEFAULT_MODEL, aspect_ratio=None, width=None, height=None, 
                   n=1, seed=None, prompt_optimizer=False, response_format="url"):
    """
    调用 MiniMax API 生成图片
    
    Args:
        prompt: 图片描述
        model: 模型名称
        aspect_ratio: 宽高比
        width: 图片宽度
        height: 图片高度
        n: 生成数量
        seed: 随机种子
        prompt_optimizer: 是否启用 prompt 优化
        response_format: 返回格式 (url 或 base64)
    
    Returns:
        dict: API 返回结果
    """
    api_key = get_api_key()
    if not api_key:
        print("❌ Error: MINIMAX_CODING_PLAN_KEY not found")
        print("   Please set MINIMAX_CODING_PLAN_KEY in ~/.openclaw/.env")
        return None
    
    # 构建请求体
    data = {
        "model": model,
        "prompt": prompt,
        "n": n,
        "response_format": response_format,
        "prompt_optimizer": prompt_optimizer
    }
    
    if aspect_ratio:
        data["aspect_ratio"] = aspect_ratio
    
    if width and height:
        data["width"] = width
        data["height"] = height
    
    if seed is not None:
        data["seed"] = seed
    
    # 发送请求
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(data).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        },
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else ""
        print(f"❌ HTTP Error {e.code}: {e.reason}")
        print(f"   Response: {error_body[:500]}")
        return None
    except urllib.error.URLError as e:
        print(f"❌ Connection Error: {e.reason}")
        return None
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

def print_result(result, saved_paths=None):
    """打印结果"""
    if not result:
        return
    
    if result.get("base_resp", {}).get("status_msg") == "success":
        print("✅ Image generated successfully!")
        print()
        
        data = result.get("data", {})
        image_urls = data.get("image_urls", [])
        
        for i, img_url in enumerate(image_urls):
            print(f"   [{i+1}] {img_url}")
        
        if saved_paths:
            print()
            for path in saved_paths:
                if path:
                    print(f"💾 Saved to: {path}")
    else:
        print(f"❌ Generation failed: {result}")

def save_image(url, output_dir=".", prefix="minimax"):
    """下载并保存图片"""
    if not url.startswith("http"):
        print("⚠️ Cannot save base64 image directly")
        return None
    
    try:
        # 创建输出目录
        os.makedirs(output_dir, exist_ok=True)
        
        # 生成文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{prefix}_{timestamp}.png"
        filepath = os.path.join(output_dir, filename)
        
        # 下载图片
        urllib.request.urlretrieve(url, filepath)
        return filepath
    except Exception as e:
        print(f"❌ Failed to save image: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(
        description="MiniMax 文生图 - 使用 AI 生成图片",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python minimax_image.py "a cute cat"
    python minimax_image.py "pixel art game background" --aspect 16:9
    python minimax_image.py "landscape" --width 1920 --height 1080 --n 4
    python minimax_image.py "mountain" --output ./images --save
        """
    )
    
    parser.add_argument("prompt", nargs="?", help="图片描述文本")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"模型名称 (default: {DEFAULT_MODEL})")
    parser.add_argument("--aspect", help="宽高比 (1:1, 16:9, 4:3, 3:2, 2:3, 3:4, 9:16, 21:9)")
    parser.add_argument("--width", type=int, help="图片宽度 (512-2048)")
    parser.add_argument("--height", type=int, help="图片高度 (512-2048)")
    parser.add_argument("--n", type=int, default=1, help="生成数量 (1-9)")
    parser.add_argument("--seed", type=int, help="随机种子")
    parser.add_argument("--output", "-o", default=".", help="输出目录")
    parser.add_argument("--save", action="store_true", help="保存图片到本地")
    parser.add_argument("--prompt-optimizer", action="store_true", help="启用 prompt 自动优化")
    
    args = parser.parse_args()
    
    # 如果没有提供 prompt，交互式输入
    if not args.prompt:
        print("🎨 MiniMax 文生图")
        print("=" * 40)
        args.prompt = input("请输入图片描述: ").strip()
        if not args.prompt:
            print("❌ Prompt 不能为空")
            sys.exit(1)
    
    print(f"🎨 Generating image...")
    print(f"   Prompt: {args.prompt[:80]}{'...' if len(args.prompt) > 80 else ''}")
    if args.aspect:
        print(f"   Aspect: {args.aspect}")
    if args.width and args.height:
        print(f"   Size: {args.width}x{args.height}")
    print(f"   Model: {args.model}")
    print(f"   Count: {args.n}")
    print()
    
    result = generate_image(
        prompt=args.prompt,
        model=args.model,
        aspect_ratio=args.aspect,
        width=args.width,
        height=args.height,
        n=args.n,
        seed=args.seed,
        prompt_optimizer=args.prompt_optimizer
    )
    
    saved_paths = []
    if result and args.save:
        data = result.get("data", {})
        image_urls = data.get("image_urls", [])
        for img_url in image_urls:
            saved = save_image(img_url, args.output)
            if saved:
                saved_paths.append(saved)
    
    print_result(result, saved_paths)

if __name__ == "__main__":
    main()
