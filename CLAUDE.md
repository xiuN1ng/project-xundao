# 寻道修仙 - xundao-server 后端工作室 Agent 架构

基于 Claude Code Game Studios 模板，为挂机修仙游戏定制。

## 技术栈

- **后端**: Express 4.x + Sequelize + MySQL + Redis
- **游戏数据**: JSON 配置文件（server/data/）
- **AI 服务**: MiniMax Token Plan (M2.7 + image-01)

## 项目结构

```
xundao-server/                         # 工作区根目录
└── server/
    ├── routes/                       # API 路由
    │   ├── character.js
    │   ├── cultivation.js
    │   ├── combat.js
    │   └── index.js
    ├── services/                     # 业务逻辑
    ├── models/                      # Sequelize 模型
    ├── data/                        # 游戏配置数据
    │   ├── gongfa.json               # 功法配置（51种）
    │   ├── meridian.json             # 经脉配置（6分支48穴位）
    │   ├── chapter.json              # 副本章节（100章）
    │   ├── realm.json               # 境界配置
    │   └── enemy.json               # 敌人配置
    └── server.js                     # 入口
```

## Agent 架构

| Agent | 职责 | 工作区 |
|-------|------|--------|
| express-backend-specialist | 后端 API 和游戏逻辑 | xundao-server |
| vue-frontend-specialist | 前端 UI 和交互 | xundao-client |
| game-systems-designer | 游戏系统设计和数值平衡 | xundao-docs |
| xundao-art | 美术资源生成 | xundao-art |

## 协作协议

**用户驱动，不是自主执行。**

每个任务遵循：**提问 → 方案 → 决定 → 草稿 → 批准**

- Agent 必须问"是否写入？"
- Agent 必须展示草稿后再执行
- 多文件变更需要完整批准
- 无用户指令不提交

## 关键规则

### 游戏数据规则（最高优先级）

```
所有游戏数值必须从 server/data/*.json 读取
禁止硬编码任何游戏数值！
```

**正确**：
```javascript
const Gongfa = require('../data/gongfa')
const damage = Gongfa[skillId].baseDamage * level
```

**错误**：
```javascript
const damage = 100 * level  // 硬编码！
```

### API 响应格式

```javascript
// 成功
res.json({ code: 0, data: result, message: 'success' })

// 错误
res.json({ code: 400, data: null, message: '参数错误' })
```

### 安全规则

- 所有用户数据通过 `req.user.id` 获取，禁止从请求体解析 userId
- SQL 使用 Sequelize 预编译，禁止拼接字符串
- 敏感操作需要二次验证

### 规则文件

```
.claude/rules/custom/express-api.md    # Express 编码规范
.claude/skills/backend-workflow/      # 后端工作流
.claude/skills/game-feature/          # 游戏功能开发
```

## 启动检查清单

每次会话开始：

1. [ ] 读取 `/root/.openclaw/workspace/PROJECT_REGISTRY.md` — 确认路径
2. [ ] 读取 `/root/.openclaw/workspace/AGENT_BULLETIN.md` — 了解动态
3. [ ] 读取 `/root/.openclaw/workspace/SHARED_RULES.md` — 避免踩坑
4. [ ] 读取 `.claude/rules/custom/express-api.md` — 编码规范

## 协调文件

- `/root/.openclaw/workspace/PROJECT_REGISTRY.md` — 路径真相源
- `/root/.openclaw/workspace/AGENT_BULLETIN.md` — 工作公告板
- `/root/.openclaw/workspace/SHARED_RULES.md` — 常见错误
