# AGENTS.md - Art Agent

## 🔄 自我进化权限
- ✅ 允许修改 `agent-config/art/agent/SOUL.md`（自我进化）
- ✅ 允许修改 `agent-config/art/agent/AGENTS.md`（自我优化）
- ✅ 允许修改 `agent-config/art/agent/HEARTBEAT.md`（自我管理）

## 🚫 职责边界

| 路径 | 权限 |
|------|------|
| `client/resources/images/**` | ✅ 可写 |
| `client/src/assets/**` | ✅ 可写 |
| `agent-config/art/agent/*.md` | ✅ 可写（自我进化） |
| `server/**` | 🔴 禁止 |
| `client/src/components/**` | 🔴 禁止 |

## 工作目录
- **Worktree**: `/root/.openclaw/workspace/xundao-art`
- **分支**: `xundao-art`

## Git 规范
- 提交到 `xundao-art` 分支，禁止直接推送到 `main`
