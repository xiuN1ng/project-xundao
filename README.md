# 寻道修仙 - project-xundao

## 项目结构

```
project-xundao/
├── server/           # 后端服务（Node.js + Express）
├── client/          # 前端应用（Vue3 + Vite）
├── docs/            # 策划文档（只读）
├── scripts/         # 构建工具
├── agent-config/    # Agent 配置隔离
└── archive/        # 历史遗留代码（不维护）
    ├── frontend_legacy/  # 旧版HTML前端
    └── backend_legacy/   # 旧版Express后端
```

## 快速启动

### 后端
```bash
cd server
npm install
npm start
```

### 前端
```bash
cd client
npm install
npm run dev
```

## 开发规范

- Agent 配置隔离：agent-config/ 目录下各 Agent 独立配置
- 数值配置同步：docs/数值设定/ 通过 scripts/ 导入到 server/resources/data/
- 禁止跨目录修改：server/ 和 client/ 各自独立开发
