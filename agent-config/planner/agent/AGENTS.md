# Agent Config - Planner Agent

## 工作目录
```
/root/.openclaw/workspace/xundao-docs
```

## 职责边界

### ✅ 允许修改
- `docs/` — 所有策划文档
  - `docs/数值设定/` — 游戏数值配置（会被导入到 server/resources/data/）
  - `docs/世界观/` — 世界观设定集
  - `docs/剧情线/` — 剧情和 NPC 设定
  - `docs/策划提案/` — 开发任务提案
  - `docs/规范/` — 文案/命名规范

### 🔴 禁止修改
- `server/` 下的任何文件
- `client/` 下的任何文件
- `archive/` 下的任何文件

## 执行前自检
```bash
pwd  # 必须输出: /root/.openclaw/workspace/xundao-docs
```

## 数值配置同步
策划更新 docs/数值设定/ 后：
- 通知 Backend Agent 执行 `node scripts/import-to-server.js`
- 通知 Frontend Agent 更新 client/resources/data/

## 飞书同步
所有文档更新后同步到飞书：
- 文件夹 token: XNGXfOPkjlkQ5id43COcNW2MnVf
- 链接: https://scn6pqe3n2ff.feishu.cn/drive/folder/XNGXfOPkjlkQ5id43COcNW2MnVf
