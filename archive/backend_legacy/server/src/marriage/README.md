# 结婚系统 API 文档

## 概述
结婚系统为挂机修仙游戏提供完整的婚姻功能，包括结婚申请、婚礼举办、夫妻技能和离婚处理。

## 婚礼类型

| 类型 | 名称 | 费用(灵石) | 持续时间(天) | 属性加成 |
|------|------|------------|--------------|----------|
| simple | 简约婚礼 | 9,999 | 7 | 10% |
| grand | 豪华婚礼 | 99,999 | 30 | 20% |
| legendary | 传奇婚礼 | 999,999 | 365 | 50% |

## API 接口列表

### 1. 获取婚姻信息
**GET** `/api/marriage/info?player_id={playerId}`

返回玩家的婚姻状态、配偶信息、婚礼类型、剩余天数等。

### 2. 获取婚礼类型
**GET** `/api/marriage/wedding/types`

返回所有可用的婚礼类型及其配置。

### 3. 发送结婚申请
**POST** `/api/marriage/apply`
```json
{
  "player_id": 1,
  "target_id": 2,
  "wedding_type": "simple",
  "message": "愿意与我结为道侣吗？"
}
```

### 4. 获取收到的结婚申请
**GET** `/api/marriage/applications?player_id={playerId}`

### 5. 接受结婚申请
**POST** `/api/marriage/accept`
```json
{
  "player_id": 2,
  "application_id": 1
}
```

### 6. 拒绝结婚申请
**POST** `/api/marriage/reject`
```json
{
  "player_id": 2,
  "application_id": 1
}
```

### 7. 快速结婚（直接结婚）
**POST** `/api/marriage/quick`
```json
{
  "player_id": 1,
  "target_id": 2,
  "wedding_type": "simple"
}
```

### 8. 获取夫妻技能
**GET** `/api/marriage/skills?player_id={playerId}`

返回玩家已解锁的夫妻技能列表。

### 9. 获取婚姻属性加成
**GET** `/api/marriage/bonus?player_id={playerId}`

返回玩家的婚姻属性加成（经验加成、灵石加成等）。

### 10. 申请离婚
**POST** `/api/marriage/divorce`
```json
{
  "player_id": 1
}
```
需要24小时冷静期后才能确认离婚。

### 11. 确认离婚
**POST** `/api/marriage/confirm/divorce`
```json
{
  "player_id": 1
}
```

## 夫妻技能列表

| 技能ID | 名称 | 描述 | 需要婚礼类型 |
|--------|------|------|-------------|
| couple_001 | 同心协力 | 夫妻同时在线修炼经验+10% | 简约 |
| couple_002 | 双修加成 | 双修获得经验+20% | 简约 |
| couple_003 | 灵犀一点 | 战斗支援速度+15% | 豪华 |
| couple_004 | 心有灵犀 | 灵石获取+15% | 豪华 |
| couple_005 | 神仙眷侣 | 全属性加成+20% | 传奇 |
| couple_006 | 天作之合 | 渡劫成功率+10% | 传奇 |

## 结婚条件
- 双方等级需达到婚礼类型要求的最低等级
- 灵石充足（支付婚礼费用）
- 双方均未结婚

## 离婚规则
- 任何一方可以申请离婚
- 申请后需等待24小时冷静期
- 冷静期过后双方确认离婚
- 离婚后夫妻技能将被移除
