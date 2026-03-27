---
name: backend-workflow
description: "寻道修仙游戏后端开发工作流。从任务认领到API上线的标准流程。"
argument-hint: "[功能描述或任务ID]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash, sessions_spawn
---

# 后端工作流

## 流程概述

```
需求理解 → 数据建模 → API设计 → 评审批准 → 实现 → 测试 → 提交
```

## Step 1: 读取项目状态

1. 读取 `/root/.openclaw/workspace/PROJECT_REGISTRY.md` - 确认项目路径
2. 读取 `/root/.openclaw/workspace/AGENT_BULLETIN.md` - 了解其他 agent 动态
3. 检查当前分支状态
```bash
cd /root/.openclaw/workspace/xundao-server
git status
```

## Step 2: 理解需求

- 明确需要的数据模型
- 明确 API 端点和请求/响应格式
- 明确是否需要新的游戏数据文件

## Step 3: 数据建模

如果需要新表或修改表结构：

```markdown
## 数据模型设计

### CharacterCultivation (新表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| characterId | INT | 角色ID，外键 |
| meridianLevel | INT | 经脉等级 |
| gongfaIds | JSON | 已装备功法IDs |
| cultivationExp | INT | 当前修为 |

### 关联关系
Character 1:N CharacterCultivation
```

如果需要新的游戏数据文件：
```json
// server/data/cultivation.json 示例
{
  "realms": [
    { "id": 1, "name": "炼气期", "expRequired": 0, "bonus": 1.0 },
    { "id": 2, "name": "筑基期", "expRequired": 1000, "bonus": 1.5 }
  ]
}
```

## Step 4: API 设计

```markdown
## API 设计

### GET /api/cultivation/status
**描述**: 获取角色修炼状态
**认证**: 需要
**响应**:
```json
{
  "code": 0,
  "data": {
    "realm": "筑基期",
    "level": 15,
    "cultivationExp": 5000,
    "nextLevelExp": 8000,
    "meridianLevel": 3,
    "equippedGongfa": [101, 102, 103]
  }
}
```

### POST /api/cultivation/practice
**描述**: 执行修炼（挂机）
**认证**: 需要
**请求**:
```json
{ "duration": 3600 }
```
**响应**:
```json
{
  "code": 0,
  "data": {
    "expGained": 3600,
    "cultivationExp": 8600,
    "levelUp": false
  }
}
```
```

## Step 5: 获取批准

展示数据模型和 API 设计后，明确询问：
> "设计如上，是否定开始实现？"

## Step 6: 实现

1. 创建/修改 Sequelize 模型
2. 创建/修改游戏数据 JSON
3. 实现 Service 层
4. 实现路由
5. 编写单元测试

**重要规则**：
- 游戏数值必须从 `server/data/` 读取
- 不能硬编码任何游戏数值
- 所有用户数据必须通过 `req.user.id` 获取

## Step 7: 本地测试

```bash
cd /root/.openclaw/workspace/xundao-server
# 启动服务
npm run dev
# 测试 API
curl -X POST http://localhost:3001/api/cultivation/practice \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"duration": 3600}'
```

## Step 8: 提交

```bash
cd /root/.openclaw/workspace/xundao-server
git checkout -b feature/cultivation-api
git add .
git commit -m "feat: add cultivation system API

- Add CharacterCultivation model
- Add GET /api/cultivation/status
- Add POST /api/cultivation/practice
- Add cultivation.json game data

Closes #XX"
git push origin feature/cultivation-api
```

## Step 9: 更新公告

在 AGENT_BULLETIN.md 中记录：
```markdown
| 时间 | Agent | 内容 |
|------|-------|------|
| HH:MM | express-backend-specialist | 完成修炼API，提交到 feature/cultivation-api |

新增 API:
- GET /api/cultivation/status
- POST /api/cultivation/practice
```
