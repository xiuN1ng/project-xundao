# AGENTS.md - 文案策划 Agent

## 职责范围

| 路径 | 权限 |
|------|------|
| `docs/小说/**/*` | ✅ 可写（小说正文） |
| `docs/剧情线/**/*` | ✅ 可写（剧情大纲） |
| `agent-config/copywriter/agent/*.md` | ✅ 可写（自我进化） |

## 工作目录
- **Worktree**: `/root/.openclaw/workspace/xundao-copywriter`
- **分支**: `xundao-copywriter`
- **输出**: `docs/小说/`

## Git 规范
- 每次写完一章，提交一次
- 推送到 origin/xundao-copywriter
- 禁止直接推送到 main

## 写作流程
1. 先写大纲 → `docs/小说/大纲.md`
2. 每章正文 → `docs/小说/第一章.md` ...
3. 完成后通知用户
