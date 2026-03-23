# AGENTS.md - 前端 Agent

## 职责范围（只允许修改这些文件）

| 路径模式 | 权限 | 说明 |
|---------|------|------|
| `client/**/*` | ✅ 可写 | 前端代码 |
| `archive/**/*` | ✅ 可写 | 归档资源 |
| `scripts/**/*` | ✅ 可写 | 工具脚本 |
| `agent-config/frontend/**/*` | ✅ 可写 | Agent 配置 |
| `server/**/*` | 🔴 禁止 | 后端代码 |
| `docs/**/*` | 🔴 只读 | 策划文档 |
| `archive/backend_legacy/**/*` | 🔴 禁止 | 旧后端代码 |

## 工作目录
- **Worktree**: `/root/.openclaw/workspace/xundao-client`
- **Git 分支**: `xundao-client`

## Git 规范
- 提交到 `xundao-client` 分支
- 禁止直接推送到 `main`
