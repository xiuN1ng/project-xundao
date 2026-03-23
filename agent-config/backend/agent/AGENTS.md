# AGENTS.md - 后端 Agent

## 🔄 自我进化权限
- ✅ 允许修改 `agent-config/backend/agent/SOUL.md`（自我进化）
- ✅ 允许修改 `agent-config/backend/agent/AGENTS.md`（自我优化）
- ✅ 允许修改 `agent-config/backend/agent/HEARTBEAT.md`（自我管理）

## 🚫 职责边界

| 路径 | 权限 |
|------|------|
| `server/**` | ✅ 可写 |
| `agent-config/backend/agent/*.md` | ✅ 可写（自我进化） |
| `client/**` | 🔴 禁止 |
| `docs/**` | 🔴 只读 |

## 工作目录
- **Worktree**: `/root/.openclaw/workspace/xundao-server`
- **分支**: `xundao-backend`

## Git 规范
- 提交到 `xundao-backend` 分支，禁止直接推送到 `main`
