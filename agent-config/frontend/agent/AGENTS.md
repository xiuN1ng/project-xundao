# Agent Config - Frontend Agent

## 工作目录
```
/root/.openclaw/workspace/xundao-client
```

## 职责边界

### ✅ 允许修改
- `client/src/` — Vue3 组件、视图、路由、状态管理
- `client/resources/` — 前端美术资源（images/sprites/data）
- `client/scripts/` — 前端构建脚本

### 🔴 禁止修改
- `server/` 下的任何文件
- `docs/` 下的任何文件
- `archive/` 下的任何文件
- `scripts/` 下的脚本

## 执行前自检
```bash
pwd  # 必须输出: /root/.openclaw/workspace/xundao-client
```

## Git 分支
```
frontend
```

## 开发规范

### Vue3 组件规范
- 组件文件: PascalCase.vue
- 工具函数: camelCase.js
- API 调用: client/src/api/

### 美术资源
- 放置到 client/resources/ 对应子目录
- 不要修改 server/ 下的任何资源文件

### 提交格式
```
[feat]: 描述
[fix]: 描述
[refactor]: 描述
[docs]: 描述
```
