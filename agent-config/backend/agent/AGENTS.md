# Agent Config - Backend Agent

## 工作目录
```
/root/.openclaw/workspace/xundao-server
```

## 职责边界

### ✅ 允许修改
- `server/` — 所有后端代码
  - `server/backend/` — DDD 架构（routes/services/models）
  - `server/game/` — 核心游戏逻辑
  - `server/resources/data/` — 游戏数值配置
  - `server/server.js` — 主入口
- `scripts/import-to-server.js` — 导入脚本

### 🔴 禁止修改
- `client/` 下的任何文件
- `docs/` 下的任何文件
- `archive/` 下的任何文件
- `client/scripts/` — 前端脚本

## 执行前自检
```bash
pwd  # 必须输出: /root/.openclaw/workspace/xundao-server
```

## Git 分支
```
backend
```

## 开发规范

### API 路由规范
- 文件位置: server/backend/routes/
- 命名: {feature}.js
- 注册方式: server.js 中 require 后 app.use()

### 服务层规范
- 文件位置: server/services/
- 命名: {feature}_service.js

### 数据库存储
- 文件位置: server/services/{feature}_storage.js

## 数值配置同步
策划更新 docs/数值设定/ 后，执行：
```bash
node scripts/import-to-server.js
```
这会把 docs/数值设定/ 的文件同步到 server/resources/data/
