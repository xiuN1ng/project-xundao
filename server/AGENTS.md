# AGENTS.md - 前端开发代理

## 🔴 绝对禁止（违者立即停止 + 扣减配额）

| 禁止项 | 违规后果 |
|--------|---------|
| 修改 `idle-cultivation/backend/` 下的任何文件 | 立即停止任务，扣 Token |
| 修改 `idle-cultivation/server.js` | 立即停止任务，扣 Token |
| 修改 `backend/` 下的任何文件 | 立即停止任务，扣 Token |
| 修改 `idle-cultivation/src/` 下的共享逻辑文件 | 立即停止任务，扣 Token |
| 直接提交到 `main` 或 `qa` 分支 | 立即停止任务 |

## 🟢 职责范围（只允许修改这些文件）

### Frontend Agent 可写：
```
✅ frontend/                          ← 静态 HTML 前端所有文件
✅ idle-cultivation/src-vue/src/       ← Vue3 前端所有文件
✅ idle-cultivation/src/assets/        ← 游戏美术资源
✅ idle-cultivation/src/core/         ← 前端业务逻辑（API 绑定、UI 状态）
```

### 共享文件（需与 Backend Agent 协调）：
```
⚠️ idle-cultivation/src/              ← 核心共享逻辑（如 sect_api.js），修改前需确认
⚠️ idle-cultivation/data/             ← 游戏配置文件，修改前需确认
```

### 具体文件类型权限：

| 路径模式 | 权限 | 说明 |
|---------|------|------|
| `frontend/**/*.js` | ✅ 可写 | 静态前端 JS |
| `frontend/**/*.vue` | ✅ 可写 | 静态前端 Vue |
| `idle-cultivation/src-vue/**/*` | ✅ 可写 | Vue3 前端 |
| `idle-cultivation/src/assets/**/*` | ✅ 可写 | 美术资源 |
| `idle-cultivation/backend/**/*` | 🔴 禁止 | 后端 API |
| `idle-cultivation/server.js` | 🔴 禁止 | 服务器入口 |
| `backend/**/*` | 🔴 禁止 | DDD 后端代码 |
| `idle-cultivation/src/*.js` | ⚠️ 协商 | 共享核心逻辑 |
| `idle-cultivation/data/*.json` | ⚠️ 协商 | 配置文件 |

## 🟡 跨职责任务处理

如果任务需要修改禁止范围的文件：
1. 停下，告知 main agent
2. 由 main agent 分配给 Backend Agent 执行
3. 前端只负责 UI 绑定和 API 调用

## 📁 Worktree 信息

- **Worktree**: `/root/.openclaw/workspace/worktrees/game-frontend`
- **分支**: `art-requirements-local`
- **Git 远程**: origin (game 项目仓库)

## ✅ Git 提交规范

- 提交到 `frontend` 分支
- 创建 PR 合并到 `main`（由 QA 审核）
- 禁止直接推送到 `main` 或 `qa`

---

## ⚡ 定时任务执行前自检（每次 cron 任务必须执行）

执行任何任务前，先执行以下检查：

```bash
# 1. 确认当前工作目录正确
pwd
# 输出必须是: /root/.openclaw/workspace/worktrees/game-frontend
# 如果不对，立即停止，输出 ERROR: 错误目录

# 2. 确认只修改 [F] 范围的文件
# 可写: frontend/, idle-cultivation/src-vue/src/, idle-cultivation/src/assets/
# 禁止: idle-cultivation/backend/, idle-cultivation/server.js, backend/

# 3. 如果任务涉及禁止范围的文件，停止并报告
```

**任何任务执行前，必须先验证 pwd 输出是否为 `/root/.openclaw/workspace/worktrees/game-frontend`**
