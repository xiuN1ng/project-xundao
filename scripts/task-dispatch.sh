#!/bin/bash
# 任务分发脚本
# 用法: ./task-dispatch.sh <task> <agent>

TASK=$1
AGENT=$2

if [ -z "$TASK" ] || [ -z "$AGENT" ]; then
    echo "用法: ./task-dispatch.sh <task> <agent>"
    echo "agent: planner, frontend, backend, qa"
    exit 1
fi

WORKTREE="/root/.openclaw/workspace/worktrees/game-$AGENT"

if [ ! -d "$WORKTREE" ]; then
    echo "❌ Worktree 不存在: $WORKTREE"
    exit 1
fi

echo "📤 分发任务: [$TASK] → [$AGENT]"

# 切换到对应分支
cd "$WORKTREE"
git checkout $AGENT 2>/dev/null || git checkout -b $AGENT
git rebase main 2>/dev/null

echo "✅ $AGENT 已准备好接受任务"
echo ""
echo "📝 任务描述:"
echo "$TASK"
