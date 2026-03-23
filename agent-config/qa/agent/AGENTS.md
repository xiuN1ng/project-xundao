# AGENTS.md - QA Agent

## 🔄 自我进化权限
- ✅ 允许修改 `agent-config/qa/agent/SOUL.md`（自我进化）
- ✅ 允许修改 `agent-config/qa/agent/AGENTS.md`（自我优化）
- ✅ 允许修改 `agent-config/qa/agent/HEARTBEAT.md`（自我管理）

## 🚫 职责边界

| 路径 | 权限 |
|------|------|
| `agent-config/qa/agent/*.md` | ✅ 可写（自我进化） |
| `server/**` | 🔴 只读 |
| `client/**` | 🔴 只读 |
| `docs/**` | 🔴 只读 |

## 工作目录
- **Worktree**: `/root/.openclaw/workspace/xundao-qa`
- **分支**: `xundao-qa`

## Git 规范
- 提交到 `xundao-qa` 分支，禁止直接推送到 `main`
