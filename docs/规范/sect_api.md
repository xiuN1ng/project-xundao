# 宗门系统 API 文档

## 概述

宗门系统是游戏中重要的社交和成长系统，玩家可以创建自己的宗门，招收弟子，升级建筑，学习宗门技能，获得各种属性加成。

## 基础数据

### 宗门类型

| ID | 名称 | 攻击加成 | 防御加成 | 灵气加成 |
|---|---|---|---|---|
| tianjian | 天剑宗 | 20% | 10% | 10% |
| tiandao | 天道宫 | 10% | 20% | 15% |
| buddha | 大佛寺 | 10% | 30% | 5% |
| demon | 魔渊 | 30% | 5% | 10% |
| immortal | 逍遥仙府 | 15% | 15% | 25% |

### 建筑类型

| ID | 名称 | 最大等级 | 效果 |
|---|---|---|---|
| mountain_gate | 山门 | 10 | 弟子容量+2/级 |
| main_hall | 主殿 | 10 | 全属性+5%/级 |
| training_field | 练功场 | 10 | 经验+10%/级 |
| meditation_room | 静修室 | 10 | 灵气+10%/级 |
| treasure_pavilion | 藏宝阁 | 10 | 掉落+15%/级 |
| arena | 竞技场 | 10 | PVP+10%/级 |

### 弟子职业

| ID | 名称 | 攻击系数 | 防御系数 | 灵气系数 |
|---|---|---|---|---|
| sword_disciple | 剑修 | 1.5 | 0.8 | 1.0 |
| dao_disciple | 法修 | 1.2 | 0.7 | 1.5 |
| body_disciple | 体修 | 1.0 | 1.5 | 0.8 |
| healer | 医师 | 0.6 | 1.0 | 1.3 |

### 宗门技能

| ID | 名称 | 类型 | 效果 | 费用 | 需求等级 |
|---|---|---|---|---|---|
| sword_boost | 剑意冲天 | atk | +20%攻击 | 1000 | 3 |
| defense_boost | 铜墙铁壁 | def | +20%防御 | 1000 | 3 |
| spirit_boost | 灵气汇聚 | spirit | +20%灵气 | 1000 | 5 |
| luck_boost | 福源深厚 | luck | +30%掉落 | 2000 | 7 |
| realm_accel | 境界顿悟 | realm_speed | +50%境界速度 | 5000 | 10 |

## API 端点

### 查询类

#### 1. 获取宗门类型列表
```
GET /api/sect/types
```
响应:
```json
{
  "success": true,
  "data": [
    { "id": "tianjian", "name": "天剑宗", "type": "sword", "description": "...", ... }
  ]
}
```

#### 2. 获取建筑类型列表
```
GET /api/sect/buildings
```

#### 3. 获取弟子职业列表
```
GET /api/sect/disciple-classes
```

#### 4. 获取宗门技能列表
```
GET /api/sect/techs
```

#### 5. 获取玩家宗门信息
```
GET /api/sect/info?player_id={player_id}
```
响应:
```json
{
  "success": true,
  "data": {
    "sect_type": "tianjian",
    "sect_name": "天剑宗",
    "sect_level": 1,
    "sect_exp": 0,
    "contribution": 0,
    "buildings": { "mountain_gate": 1 },
    "disciples": [],
    "techs": [],
    "disciple_cap": 7,
    "exp_needed": 5000,
    "recruit_cost": 500
  }
}
```

#### 6. 获取宗门加成
```
GET /api/sect/bonus?player_id={player_id}
```
响应:
```json
{
  "success": true,
  "data": {
    "atk": 1.2,
    "def": 1.1,
    "spirit": 1.1,
    "exp": 1,
    "drop": 1
  }
}
```

### 操作类

#### 7. 创建宗门
```
POST /api/sect/create
Content-Type: application/json

{
  "player_id": 1,
  "sect_type": "tianjian"
}
```
消耗: 1000灵石

#### 8. 升级宗门
```
POST /api/sect/upgrade
Content-Type: application/json

{
  "player_id": 1
}
```
消耗: 宗门等级 * 5000 经验

#### 9. 升级建筑
```
POST /api/sect/building/upgrade
Content-Type: application/json

{
  "player_id": 1,
  "building_id": "mountain_gate"
}
```
消耗: 500 * (cost_factor ^ 当前等级) 灵石

#### 10. 招收弟子
```
POST /api/sect/disciple/recruit
Content-Type: application/json

{
  "player_id": 1,
  "class_type": "sword_disciple"
}
```
消耗: 500 * (1.5 ^ 弟子数量) 灵石

#### 11. 弟子修炼
```
POST /api/sect/disciple/train
Content-Type: application/json

{
  "player_id": 1,
  "disciple_index": 0
}
```
弟子自动修炼，获得灵气和经验

#### 12. 学习宗门技能
```
POST /api/sect/tech/learn
Content-Type: application/json

{
  "player_id": 1,
  "tech_id": "sword_boost"
}
```
消耗: 技能设定费用灵石

#### 13. 捐赠宗门
```
POST /api/sect/donate
Content-Type: application/json

{
  "player_id": 1,
  "amount": 1000
}
```
获得贡献度 = 捐赠金额 / 10

#### 14. 离开宗门
```
POST /api/sect/leave
Content-Type: application/json

{
  "player_id": 1
}
```
注意: 此操作会删除所有宗门相关数据

## 错误响应格式

```json
{
  "success": false,
  "error": "错误信息"
}
```

常见错误码:
- 400: 缺少必要参数
- 400: 灵石不足
- 400: 没有宗门
- 400: 已有宗门
- 400: 建筑/弟子/技能不存在
- 400: 等级/境界不足

## 数据库表

- `sect` - 宗门基本信息
- `sect_buildings` - 宗门建筑
- `sect_disciples` - 宗门弟子
- `sect_techs` - 宗门技能
