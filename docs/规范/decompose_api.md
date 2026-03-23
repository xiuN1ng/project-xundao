# 装备分解系统 API 文档

## 概述

装备分解系统允许玩家将不需要的装备分解为强化石，用于装备强化。

## 分解规则

| 装备稀有度 | 颜色 | 是否可分解 | 获得强化石数量 |
|------------|------|------------|----------------|
| 普通(1) | 白色 | ❌ 否 | - |
| 优秀(2) | 绿色 | ❌ 否 | - |
| 精良(3) | 蓝色 | ✅ 是 | 3-5个 |
| 史诗(4) | 紫色 | ✅ 是 | 8-12个 |
| 传说(5) | 橙色 | ✅ 是 | 20-30个 |

> 注: 分解已穿戴的装备需要先卸下，绑定装备可以分解。

## API 端点

### 1. 分解单个装备

**POST** `/api/forge/decompose`

**请求参数:**
```json
{
  "player_id": "玩家ID",
  "equipment_id": "装备记录ID"
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "分解成功，获得 5 个强化石",
  "data": {
    "equipment": {
      "id": 123,
      "name": "青虹剑",
      "rarity": 3
    },
    "reward": 5,
    "total_qianghua_stones": 150
  }
}
```

### 2. 批量分解装备

**POST** `/api/forge/batch-decompose`

**请求参数:**
```json
{
  "player_id": "玩家ID",
  "equipment_ids": [1, 2, 3]
}
```

**响应示例:**
```json
{
  "success": true,
  "message": "分解完成，共分解 2 件装备，获得 15 个强化石",
  "data": {
    "decomposed": [
      {
        "id": 1,
        "name": "玄铁甲",
        "rarity": 3,
        "reward": 5
      },
      {
        "id": 2,
        "name": "紫金冠",
        "rarity": 4,
        "reward": 10
      }
    ],
    "failed": [
      {
        "id": 3,
        "name": "布衣",
        "reason": "普通装备无法分解"
      }
    ],
    "total_reward": 15,
    "total_qianghua_stones": 165
  }
}
```

### 3. 获取玩家强化石数量

**GET** `/api/forge/qianghua-stone`

**请求参数:**
```
player_id=玩家ID
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "player_id": "player_001",
    "qianghua_stones": 150
  }
}
```

## 错误码

| 错误码 | 说明 |
|--------|------|
| 400 | 缺少必要参数 |
| 404 | 玩家或装备不存在 |
| 500 | 服务器错误 |

## 示例错误响应

**装备已穿戴无法分解:**
```json
{
  "success": false,
  "error": "已穿戴的装备无法分解"
}
```

**装备无法分解:**
```json
{
  "success": false,
  "error": "普通装备无法分解"
}
```
