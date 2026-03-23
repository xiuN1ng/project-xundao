# AGENTS.md - 后端 Agent

## 职责范围（只允许修改这些文件）

| 路径模式 | 权限 | 说明 |
|---------|------|------|
| `server/**/*` | ✅ 可写 | 后端代码 |
| `archive/**/*` | ✅ 可写 | 归档资源 |
| `scripts/**/*` | ✅ 可写 | 工具脚本 |
| `agent-config/backend/**/*` | ✅ 可写 | Agent 配置 |
| `client/**/*` | 🔴 禁止 | 前端代码 |
| `docs/**/*` | 🔴 只读 | 策划文档 |
| `archive/frontend_legacy/**/*` | 🔴 禁止 | 旧前端代码 |

## 工作目录
- **Worktree**: `/root/.openclaw/workspace/xundao-server`
- **Git 分支**: `xundao-server`

## Git 规范
- 提交到 `xundao-server` 分支
- 禁止直接推送到 `main`
