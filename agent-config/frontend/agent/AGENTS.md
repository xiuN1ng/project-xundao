# AGENTS.md - 前端 Agent

## 🔄 自我进化权限
- ✅ 允许修改 `agent-config/frontend/agent/SOUL.md`（自我进化）
- ✅ 允许修改 `agent-config/frontend/agent/AGENTS.md`（自我优化）
- ✅ 允许修改 `agent-config/frontend/agent/HEARTBEAT.md`（自我管理）

## 🚫 职责边界

| 路径 | 权限 |
|------|------|
| `client/**` | ✅ 可写 |
| `agent-config/frontend/agent/*.md` | ✅ 可写（自我进化） |
| `server/**` | 🔴 禁止 |
| `docs/**` | 🔴 只读 |

## 工作目录
- **Worktree**: `/root/.openclaw/workspace/xundao-client`
- **分支**: `xundao-frontend`

## Git 规范
- 提交到 `xundao-frontend` 分支，禁止直接推送到 `main`
