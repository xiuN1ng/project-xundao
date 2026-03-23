#!/bin/bash
# 开发状态检查

cd /root/.openclaw/workspace/game

echo "═══════════════════════════════════════"
echo "     📊 游戏开发状态面板"
echo "═══════════════════════════════════════"

echo -e "\n📦 Main 分支:"
git log -1 --oneline
echo "  状态: $(git status --short)"

echo -e "\n🌿 子分支状态:"
for branch in planner frontend backend qa; do
    WORKTREE="/root/.openclaw/workspace/worktrees/game-$branch"
    if [ -d "$WORKTREE" ]; then
        cd "$WORKTREE"
        LAST=$(git log -1 --oneline 2>/dev/null | cut -d' ' -f1-3 || echo "无提交")
        STATUS=$(git status --short 2>/dev/null || echo "?")
        echo "  $branch: $LAST | $STATUS"
    fi
done

cd /root/.openclaw/workspace/game

echo -e "\n📊 代码统计:"
echo "  main:     $(git rev-list --count main) commits"
echo "  backend:  $(git rev-list --count backend 2>/dev/null || echo 0) commits"
echo "  frontend: $(git rev-list --count frontend 2>/dev/null || echo 0) commits"

echo -e "\n═══════════════════════════════════════"
