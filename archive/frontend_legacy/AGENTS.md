# AGENTS.md - 前端 Agent 规范 (MVC 架构)

## 🔴 绝对禁止
- 修改 `/workspace/game/backend/` 任何文件
- 修改 `/workspace/game/docs/`
- 在 src/core/ 外创建业务逻辑
- 修改其他 agent 的文件

## 🟢 目录结构 (MVC)
```
frontend/src/
├── index.html              # 主入口
├── main.js                # 主逻辑
├── storage.js             # 本地存储
├── database.js            # 前端数据库
├── guide.html             # 新手引导
├── checkin.html           # 签到页面
├── core/                  # Model & Controller
│   ├── game.js
│   ├── battle.js
│   ├── realm.js
│   ├── sect.js
│   ├── beast.js
│   ├── artifact.js
│   ├── skill.js
│   ├── task.js
│   └── {其他模块}/
├── components/            # View
│   ├── BattlePanel.js
│   ├── RealmPanel.js
│   └── {其他面板}/
├── server/                # API 服务层
├── css/
└── assets/
```

## ⚠️ 违规
发现违规一次，扣除该 agent 10% Token 配额。
