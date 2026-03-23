#!/bin/bash
# 代码整合脚本 - 将各分支合并到main

cd /root/.openclaw/workspace/game
echo "🔀 开始整合代码..."

git checkout main

for branch in backend frontend; do
    if git rev-parse --verify origin/$branch >/dev/null 2>&1; then
        echo "🔀 合并 $branch..."
        git merge origin/$branch --no-ff -m "merge: $branch branch" || echo "  ⚠️ 冲突，请手动处理"
    fi
done

echo "📤 推送到远程..."
git push origin main

echo "✅ 整合完成!"
