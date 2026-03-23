#!/bin/bash
# MiniMax Token Plan 用量检查脚本
# API: https://www.minimaxi.com/v1/api/openplatform/coding_plan/remains

API_KEY="${MINIMAX_CODING_PLAN_KEY}"
RESPONSE=$(curl -s --location 'https://www.minimaxi.com/v1/api/openplatform/coding_plan/remains' \
  -H "Authorization: Bearer $API_KEY")

echo "$RESPONSE" | python3 -c "
import sys, json
from datetime import datetime

data = json.load(sys.stdin)
models = data.get('model_remains', [])

# MiniMax-M2.7 已更名为 MiniMax-M*，兼容两种名称
m27 = next((m for m in models if m.get('model_name') in ('MiniMax-M2.7', 'MiniMax-M*')), {})

def calc(data, model_name):
    total = data.get('current_interval_total_count', 0)
    remaining = data.get('current_interval_usage_count', 0)
    used = total - remaining
    pct = (used / total * 100) if total else 0
    remains_time_ms = data.get('remains_time', 0)
    remains_hours = remains_time_ms / (1000 * 60 * 60)
    
    weekly_total = data.get('current_weekly_total_count', 0)
    weekly_remaining = data.get('current_weekly_usage_count', 0)
    weekly_used = weekly_total - weekly_remaining
    weekly_pct = (weekly_used / weekly_total * 100) if weekly_total else 0
    
    print(json.dumps({
        'model': model_name,
        'interval': {'total': total, 'used': used, 'remaining': remaining, 'percent': round(pct, 1), 'remains_hours': round(remains_hours, 2)},
        'weekly': {'total': weekly_total, 'used': weekly_used, 'remaining': weekly_remaining, 'percent': round(weekly_pct, 1)}
    }, ensure_ascii=False))

model_name = m27.get('model_name', 'MiniMax-M2.7') if m27 else 'MiniMax-M2.7'
calc(m27, model_name)
"
