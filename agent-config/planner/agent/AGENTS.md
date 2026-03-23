# AGENTS.md - 策划 Agent

## 职责范围（只允许修改这些文件）

| 路径模式 | 权限 | 说明 |
|---------|------|------|
| `docs/**/*` | ✅ 可写 | 策划文档 |
| `scripts/**/*` | ✅ 可写 | 工具脚本 |
| `agent-config/planner/**/*` | ✅ 可写 | Agent 配置 |
| `server/**/*` | 🔴 只读 | 参考后端实现 |
| `client/**/*` | 🔴 只读 | 参考前端实现 |
| `archive/**/*` | 🔴 只读 | 历史参考 |

## 工作目录
- **Worktree**: `/root/.openclaw/workspace/xundao-docs`
- **Git 分支**: `xundao-docs`

## Git 规范
- 提交到 `xundao-docs` 分支
- 禁止直接推送到 `main`
