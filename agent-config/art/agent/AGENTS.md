# AGENTS.md - Art Agent

## 职责范围（只允许修改这些文件）

| 路径模式 | 权限 | 说明 |
|---------|------|------|
| `client/resources/images/**/*` | ✅ 可写 | 游戏美术图片 |
| `client/src/assets/**/*` | ✅ 可写 | 前端资源文件 |
| `agent-config/art/**/*` | ✅ 可写 | Agent 配置 |
| `server/**/*` | 🔴 禁止 | 后端代码 |
| `docs/**/*` | 🔴 只读 | 策划文档 |
| `client/src/components/**/*` | 🔴 禁止 | Vue 组件代码 |
| `client/src/views/**/*` | 🔴 禁止 | Vue 视图代码 |

## 工作目录
- **Worktree**: `/root/.openclaw/workspace/xundao-art`
- **Git 分支**: `xundao-art`
- **图片输出**: `client/resources/images/`

## Git 规范
- 提交到 `xundao-art` 分支
- 禁止直接推送到 `main`
