#!/bin/bash
# 额度刷新前自动生图脚本 v2
# 特性：断点续传（manifest）+ 避让其他任务

LOCKFILE="/tmp/art-gen-$(date '+%Y%m%d%H')"
MANIFEST="/root/.openclaw/workspace/art-manifest.json"
API_KEY="${MINIMAX_CODING_PLAN_KEY}"

# 检查是否在运行中（防止并发）
if [ -f "/tmp/art-gen-running" ]; then
    echo "上一次生图还在运行中，跳过"
    exit 0
fi

# 解析用量
RESP=$(curl -s --location 'https://www.minimaxi.com/v1/api/openplatform/coding_plan/remains' \
  -H "Authorization: Bearer $API_KEY")
REMAINING=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); m=d.get('model_remains',[]); print(m[0].get('current_interval_usage_count',0) if m else 0)" 2>/dev/null || echo "9999")
REMAINS_HOURS=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); m=d.get('model_remains',[]); print(round(m[0].get('remains_time',0)/(1000*3600),2)) if m else 99" 2>/dev/null || echo "99")

echo "[$(date '+%H:%M:%S')] 剩余: ${REMAINING}次, 刷新倒计时: ${REMAINS_HOURS}h"

# 最后10分钟窗口检查
THRESHOLD=0.17
if (( $(echo "$REMAINS_HOURS > $THRESHOLD" | bc -l) )); then
    echo "未到触发窗口（需<${THRESHOLD}h），跳过"
    exit 0
fi

# 检查本周期是否已触发
if [ -f "$LOCKFILE" ]; then
    echo "本刷新周期已触发，跳过"
    exit 0
fi

# 计算可生成数量
IMAGES=$(($REMAINING / 100))
# 保守策略：至少保留50次给其他任务，生图片数最多=可用-50
SAFE_REMAINING=$(($REMAINING - 50))
if [ "$SAFE_REMAINING" -lt 100 ]; then
    echo "剩余额度需保留给其他任务，跳过"
    exit 0
fi
IMAGES=$(($SAFE_REMAINING / 100))
if [ "$IMAGES" -lt 1 ]; then
    echo "剩余次数不足100，跳过"
    exit 0
fi

echo "🎨 开始生成 ${IMAGES} 张图片（断点续传模式）..."
touch /tmp/art-gen-running
trap "rm -f /tmp/art-gen-running" EXIT

# 初始化 manifest
if [ ! -f "$MANIFEST" ]; then
    echo '{"generated": [], "date": "'$(date '+%Y-%m-%d')'"}' > "$MANIFEST"
fi

cd /root/.openclaw/workspace

PROMPTS=(
    "pixel art spirit beast white fox, Chinese xianxia, glowing purple eyes, nine flowing tails, mystical, hand-drawn style, 16-bit retro sprite, front facing"
    "pixel art xianxia character portrait, immortal cultivator white robes, sword on back, flowing hair, mountain peak, hand-drawn illustration style, NOT thickly painted"
    "pixel art dungeon treasure chest scene, ancient cave, golden treasure glowing, monsters lurking, dramatic lighting, 16-bit retro RPG style"
    "pixel art cultivation pill bottle, golden elixir bottle with glowing pill inside, Chinese fantasy game item, detailed, transparent background, 1:1 square"
    "pixel art spirit sword weapon, golden blade with purple energy, Chinese fantasy weapon, clean icon, transparent background, 1:1 square"
    "pixel art xianxia skill effect, golden sword qi slash, purple lightning strike, water element burst, fire element blast, transparent background, game UI icon"
    "pixel art ancient Chinese scroll, cultivation technique manual, golden characters, mysterious aura, game item icon, transparent background, 1:1 square"
    "pixel art spirit stone gem, purple crystal glowing, Chinese fantasy currency, clean game icon, transparent background, 1:1 square"
)

COUNT=0
for i in $(seq 1 $IMAGES); do
    PROMPT="${PROMPTS[$((i % ${#PROMPTS[@]}))]}"
    echo "生成第 ${i}/${IMAGES} 张..."
    RESULT=$(python scripts/minimax_image.py "$PROMPT" --aspect 1:1 --save --output game/frontend/src/assets 2>&1)
    
    if echo "$RESULT" | grep -q "Saved to"; then
        FILE=$(echo "$RESULT" | grep "Saved to" | sed 's/.*Saved to: //')
        FILENAME=$(basename "$FILE")
        # 追加到 manifest（防重）
        python3 -c "
import json
with open('$MANIFEST') as f:
    m = json.load(f)
if '$FILENAME' not in m['generated']:
    m['generated'].append('$FILENAME')
    with open('$MANIFEST', 'w') as f:
        json.dump(m, f, indent=2, ensure_ascii=False)
print('已记录: $FILENAME')
"
        echo "✅ $FILE"
    else
        echo "❌ 生成失败: $(echo '$RESULT' | grep -i error)"
    fi
    sleep 2
done

touch "$LOCKFILE"
echo "✅ 完成，共生成 $COUNT 张图片"
