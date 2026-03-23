# 🤖 智能体协作开发工作流

## 一、架构设计

```
                    ┌──────────────────────────────────────┐
                    │         📋 Main Agent                │
                    │    (任务分发 + 代码整合 + 对外沟通)    │
                    └──────────────────┬───────────────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           │                           │                           │
           ▼                           ▼                           ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   📋 Planner     │    │   🎨 Frontend    │    │   ⚙️ Backend     │
│  (策划设计)      │    │  (前端开发)       │    │   (后端开发)     │
│                  │    │                  │    │                  │
│ worktree:        │    │ worktree:        │    │ worktree:        │
│ game-planner     │    │ game-frontend   │    │ game-backend    │
└──────────────────┘    └──────────────────┘    └──────────────────┘
           │                           │                           │
           └───────────────────────────┼───────────────────────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │     🔍 QA        │
                              │   (测试 + 验证)   │
                              │  worktree:       │
                              │  game-qa         │
                              └──────────────────┘
```

## 二、工作流程

### 完整流程图

```
用户需求 → Main分析 → 任务拆分 → 分发给Agent → 执行 → 提交 → QA验证 → 合并到Main
```

### 1. 任务分发阶段

```
Main Agent 收到: "添加功法系统"

         ┌─────────────────────────────────────┐
         │         Main 任务分析                │
         └──────────────────┬──────────────────┘
                            │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    ┌─────────┐      ┌─────────┐       ┌─────────┐
    │Planner  │      │Frontend │       │Backend  │
    │设计案   │      │UI实现   │       │API开发  │
    └─────────┘      └─────────┘       └─────────┘
```

### 2. 开发阶段

每个Agent的工作循环：
```
拉取最新 → 创建分支 → 开发 → 提交 → 推送 → 通知Main
```

### 3. 整合阶段

```
Main收到完成通知 → 拉取各分支 → 代码审查 → 合并到main → 部署测试
```

## 三、命令规范

### Main Agent 常用命令

```bash
# 分发任务给子代理
/session_spawn agentId=backend task="实现功法API，参考designs/gongfa-api.md"

# 查询任务状态
git worktree list
git branch -a

# 合并代码
git checkout main
git merge origin/backend --no-ff
```

### 子代理常用命令

```bash
# 同步最新代码
git fetch origin
git rebase origin/main

# 提交代码
git add .
git commit -m "feat: 添加功法API"

# 推送
git push -u origin backend
```

## 四、任务模板

### 任务结构
```json
{
  "task_id": "task_001",
  "title": "添加功法系统",
  "assignee": "backend",
  "priority": "high",
  "description": "实现功法CRUD API",
  "dependencies": ["planner:功法设计案"],
  "deadline": "2026-03-03",
  "status": "pending"
}
```

### 任务类型
| 类型 | Agent | 说明 |
|------|-------|------|
| `design:*` | planner | 策划设计 |
| `feat:*` | backend/frontend | 功能开发 |
| `fix:*` | backend/frontend | 修复bug |
| `test:*` | qa | 测试验证 |
| `docs:*` | planner | 文档编写 |

## 五、状态同步

### 每日同步
- 每天结束时，各Agent提交代码
- Main拉取所有分支，检查状态
- 汇报给用户进度

### 实时通知
- 子代理完成任务 → 通知Main
- Main整合完成 → 通知用户

## 六、配置示例

### Main Agent 任务分发提示词

```
你是一个游戏开发团队的Main Agent，负责协调各专业代理工作。

工作流程：
1. 理解用户需求
2. 将任务拆分为子任务
3. 使用 /spawn 分发给对应的专业代理
4. 等待完成，合并代码
5. 部署测试

当前项目：挂机修仙游戏
技术栈：Node.js + Express + SQLite + 原生JS
```

### 子代理系统提示词

```
你是专业的{role}工程师。

工作规则：
1. 只在分配给你的worktree中工作
2. 每天结束前提交所有代码
3. 完成后通知Main Agent
4. 遇到问题及时报告

你的worktree：/workspace/worktrees/game-{role}
你的分支：{role}
```

## 七、自动化脚本

### 1. 任务分发脚本
```bash
#!/bin/bash
# task-dispatch.sh

TASK=$1
AGENT=$2

echo "📤 分发任务: $TASK → $AGENT"

# 在对应worktree中执行
cd /root/.openclaw/workspace/worktrees/game-$AGENT
git checkout $AGENT
git rebase main

# 通知Agent
echo "任务: $TASK" | message_to_agent $AGENT
```

### 2. 状态检查脚本
```bash
#!/bin/bash
# status-check.sh

echo "=== 📊 开发状态 ==="
cd /root/.openclaw/workspace/game

for branch in planner frontend backend qa; do
    echo -e "\n🌿 $branch:"
    git worktree list | grep $branch
    cd /root/.openclaw/workspace/worktrees/game-$branch
    echo "  状态: $(git status --short)"
    echo "  最近: $(git log -1 --oneline)"
done

cd /root/.openclaw/workspace/game
echo -e "\n📦 main:"
echo "  状态: $(git status --short)"
```

### 3. 代码整合脚本
```bash
#!/bin/bash
# merge-all.sh

cd /root/.openclaw/workspace/game
git checkout main

for branch in backend frontend planner qa; do
    echo "🔀 合并 $branch..."
    git merge origin/$branch --no-ff -m "merge: $branch branch"
done

echo "📤 推送到远程..."
git push origin main
```

## 八、监控面板

```markdown
| 分支    | 状态   | 最后提交 | 提交者 |
|---------|--------|----------|--------|
| main    | ✓      | 10:30    | -      |
| backend | 开发中 | 10:25    | agent  |
| frontend| 待开发 | 09:00    | agent  |
| planner | 待开发 | 昨天     | agent  |
| qa      | 待测试 | -        | -      |
```
