# 挂机修仙 - 游戏主项目规范

## 项目概述

**项目路径**: `/root/.openclaw/workspace/game`
**类型**: 修仙挂机游戏（Node.js + Express + Vue3/SQLite）
**仓库**: https://github.com/xiun1ng/idle-cultivation-client

## 技术栈

| 层 | 技术 |
|---|------|
| 前端（旧） | 原生 HTML/CSS/JS, Python http.server |
| 前端（新）| Vue3 + Vite, idle-cultivation/src-vue/ |
| 后端 | Node.js + Express |
| 数据库 | SQLite (默认) / MySQL (可选) |
| 端口 | 前端 5173, 后端 3001 |

## 目录结构

```
game/
├── frontend/          # 旧版静态HTML前端
├── backend/          # DDD后端架构（参考，不直接修改）
├── idle-cultivation/ # 完整游戏项目
│   ├── src/          # 核心逻辑
│   ├── src-vue/      # Vue3前端
│   ├── backend/      # 游戏后端API
│   ├── server.js     # 服务器入口
│   └── routes/       # 路由文件
└── docs/             # 项目文档
```

## 职责边界

**禁止直接修改 backend/ 目录**（如需修改，通过 Backend Agent）
**禁止直接修改 idle-cultivation/backend/**（如需修改，通过 Backend Agent）

## 编码规范

### API 路由命名
- 文件名：`{feature}_api.js`
- 路由前缀：`/api/{feature}/`
- 示例：`/api/player/`, `/api/cultivation/start`

### 数据存储
- 使用 `*_storage.js` 文件管理数据持久化
- 优先使用 SQLite，复杂查询使用 MySQL

### API 响应格式
```javascript
// 成功
{ code: 0, data: {...} }
// 失败
{ code: 1, error: "错误信息" }
```

## 代码风格

- 使用 ES6+ 语法
- async/await 处理异步
- 使用 `console.log` 调试，完成后移除或替换为结构化日志
- 注释使用中文

## 测试验证

修改 API 后，使用 curl 测试：
```bash
curl http://localhost:3001/api/{feature}/list
```
