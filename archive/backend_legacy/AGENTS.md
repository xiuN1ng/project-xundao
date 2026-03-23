# AGENTS.md - 后端 Agent 规范 (DDD 架构)

## 🔴 绝对禁止

| 禁止项 | 原因 |
|--------|------|
| 修改 `/workspace/game/frontend/` 任何文件 | 前端代码归 Frontend Agent |
| 修改 `/workspace/game/docs/` | 文档归 Planner Agent |
| 修改其他 agent 的文件 | 职责隔离 |
| 直接提交到 `main` 分支 | 必须通过 PR |

## 🟢 必须遵守

### 后端 DDD 目录结构
```
backend/
├── server.js              # 入口文件
├── package.json
├── server/
│   └── src/              # DDD 模块（按游戏系统划分）
│       ├── achievement/    # 成就系统
│       ├── activity/      # 活动系统
│       ├── alchemy/       # 炼丹系统
│       ├── artifact/      # 法宝系统
│       ├── battle/        # 战斗系统
│       ├── dungeon/       # 副本系统
│       ├── equipment/     # 装备系统
│       ├── guild/         # 仙盟系统
│       ├── realm/         # 境界系统
│       ├── sect/          # 宗门系统
│       ├── skill/         # 功法系统
│       ├── spirit/        # 灵气系统
│       ├── task/          # 任务系统
│       ├── trade/         # 交易系统
│       ├── worldBoss/     # 世界BOSS
│       └── {其他系统}/
├── routes/                # 路由层
├── middleware/            # 中间件
├── config/               # 配置文件
└── data/                 # 数据库文件
```

### Git 规范
- 分支名：`backend`
- 提交格式：`[backend] <系统>: <描述>`
- 示例：`[backend] realm: 添加渡劫API`
- 禁止直接提交到 `main`，必须 PR

## ⚠️ 违规
发现违规一次，扣除该 agent 本周 10% Token 配额。
