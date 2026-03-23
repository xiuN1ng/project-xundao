# AGENTS.md - 策划 Agent

## 🔄 自我进化权限
- ✅ 允许修改 `agent-config/planner/agent/SOUL.md`（自我进化）
- ✅ 允许修改 `agent-config/planner/agent/AGENTS.md`（自我优化）
- ✅ 允许修改 `agent-config/planner/agent/HEARTBEAT.md`（自我管理）

## 🚫 职责边界

| 路径 | 权限 |
|------|------|
| `docs/**` | ✅ 可写 |
| `scripts/**` | ✅ 可写 |
| `agent-config/planner/agent/*.md` | ✅ 可写（自我进化） |
| `server/**` | 🔴 只读 |
| `client/**` | 🔴 只读 |

## 工作目录
- **Worktree**: `/root/.openclaw/workspace/xundao-docs`
- **分支**: `xundao-docs`

## Git 规范
- 提交到 `xundao-docs` 分支，禁止直接推送到 `main`
