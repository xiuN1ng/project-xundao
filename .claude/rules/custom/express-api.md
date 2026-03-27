---
paths:
  - "xundao-server/**"
  - "game/backend/**"
---

# Express 后端编码规范

## 数据文件规范（最高优先级）

**所有游戏数值必须从 `server/data/` 目录下的 JSON 文件读取，禁止硬编码！**

```javascript
// ✅ 正确：从 data 文件读取
const Gongfa = require('../data/gongfa')
const baseDamage = Gongfa[skillId].baseDamage * level

// ❌ 绝对禁止：硬编码数值
const baseDamage = 100 * level
const experience = 5000
```

**data 文件夹结构**：
```
server/data/
├── gongfa.json      # 功法配置（51种）
├── meridian.json    # 经脉配置（6分支48穴位）
├── chapter.json     # 副本章节（100章）
├── enemy.json       # 敌人属性
├── reward.json      # 奖励配置
└── realm.json       # 境界配置
```

## API 响应格式

```javascript
// 成功响应
res.json({ code: 0, data: result, message: 'success' })

// 错误响应
res.json({ code: 400, data: null, message: '参数错误' })
res.json({ code: 401, data: null, message: '未登录' })
res.json({ code: 404, data: null, message: '资源不存在' })
res.json({ code: 500, data: null, message: '服务器错误' })
```

## 路由规范

```javascript
// routes/character.js
const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')

// 获取角色列表（需要登录）
router.get('/list', authenticate, async (req, res) => {
  try {
    const characters = await Character.findAll({ where: { userId: req.user.id } })
    res.json({ code: 0, data: characters, message: 'success' })
  } catch (error) {
    console.error('Character list error:', error)
    res.json({ code: 500, data: null, message: '服务器错误' })
  }
})

// 获取单个角色
router.get('/:id', authenticate, async (req, res) => {
  // 先验证角色属于当前用户
  const character = await Character.findOne({
    where: { id: req.params.id, userId: req.user.id }
  })
  if (!character) {
    return res.json({ code: 404, data: null, message: '角色不存在' })
  }
  res.json({ code: 0, data: character, message: 'success' })
})

module.exports = router
```

## 中间件规范

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken')

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.json({ code: 401, data: null, message: '未登录' })
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded // { id: userId, ... }
    next()
  } catch (error) {
    return res.json({ code: 401, data: null, message: 'token无效' })
  }
}

// middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err)
  res.json({ code: 500, data: null, message: '服务器错误' })
}
```

## 模型规范（Sequelize）

```javascript
// models/Character.js
module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Character', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '所属用户ID'
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    cultivationLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: '修炼等级'
    },
    currentHp: {
      type: DataTypes.INTEGER,
      defaultValue: 100
    },
    maxHp: {
      type: DataTypes.INTEGER,
      defaultValue: 100
    }
  }, {
    timestamps: true,
    tableName: 'characters',
    indexes: [
      { fields: ['userId'] }
    ]
  })
}
```

## 业务逻辑规范

```javascript
// services/characterService.js
const Character = require('../models').Character
const Gongfa = require('../data/gongfa')

class CharacterService {
  // 计算角色战斗力
  static calculatePower(character) {
    const { attack, defense, maxHp } = character
    // 从经脉数据获取系数
    const Meridian = require('../data/meridian')
    const meridianBonus = Meridian.getBonus(character.meridianLevel)
    
    return Math.floor(
      (attack * 1.5 + defense * 2 + maxHp * 0.1) * meridianBonus.powerMultiplier
    )
  }
  
  // 执行修炼
  static async cultivate(characterId, duration) {
    const character = await Character.findByPk(characterId)
    if (!character) throw new Error('角色不存在')
    
    // 从游戏数据获取修炼效率
    const Realm = require('../data/realm')
    const realm = Realm[character.realm]
    const efficiency = realm.cultivationEfficiency * (1 + character.gongfaBonus)
    
    // 计算修为
    const expGained = Math.floor(duration * efficiency)
    
    await character.increment('cultivationExp', { by: expGained })
    await character.reload()
    
    // 检查是否突破
    if (character.cultivationExp >= character.nextLevelExp) {
      await this.breakthrough(character)
    }
    
    return { expGained, character }
  }
}

module.exports = CharacterService
```

## 安全规范

1. **禁止从 req.body 解析 userId**，必须使用 `req.user.id`（来自 JWT）
2. **所有数据库操作使用 Sequelize 预编译**，禁止拼接 SQL 字符串
3. **敏感操作需要二次验证**（购买、赠送等）
4. **输入验证**：使用 joi 或 express-validator

```javascript
// ✅ 安全
const userId = req.user.id
const result = await Character.findAll({ where: { userId } })

// ❌ 危险
const userId = req.body.userId
const result = await sequelize.query(`SELECT * FROM characters WHERE userId = ${userId}`)
```
