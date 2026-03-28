const express = require('express');
const router = express.Router();
const path = require('path');

// 成就触发服务
let achievementTrigger;
try {
  achievementTrigger = require('../../game/achievement_trigger_service');
} catch (e) {
  console.log('[dungeon] 成就触发服务未找到');
  achievementTrigger = null;
}

// 数据库路径
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  // 初始化表
  db.exec(`
    CREATE TABLE IF NOT EXISTS dungeon_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      dungeon_id INTEGER NOT NULL,
      enter_count INTEGER DEFAULT 0,
      cleared INTEGER DEFAULT 0,
      best_time INTEGER,
      enter_date TEXT,
      enter_time TEXT,
      cooldown_end TEXT
    );
  `);
} catch (err) {
  console.log('[dungeon] 数据库连接失败:', err.message);
  db = null;
}

// 副本配置
const dungeons = [
  { id: 1, icon: '🗿', name: '新手副本', reqLevel: 1, progress: 100, unlocked: true, cost: 0, dropChance: 0.5, drops: [
    {itemId: 101, name: '灵气丹', icon: '🧪', count: 1},
    {itemId: 201, name: '铁锭', icon: '🔩', count: [1,3]} // 50%掉率，1-3个
  ] },
  { id: 2, icon: '🌋', name: '火山洞穴', reqLevel: 10, progress: 60, unlocked: true, cost: 50, dropChance: 0.3, drops: [{itemId: 102, name: '火焰精华', icon: '🔥', count: 1}] },
  { id: 3, icon: '❄️', name: '冰霜洞窟', reqLevel: 20, progress: 40, unlocked: true, cost: 100, dropChance: 0.35, drops: [{itemId: 103, name: '寒冰结晶', icon: '❄️', count: 1}] },
  { id: 4, icon: '⚔️', name: '封魔渊', reqLevel: 30, progress: 20, unlocked: false, cost: 150, dropChance: 0.4, drops: [{itemId: 104, name: '封魔令', icon: '📿', count: 1}] },
  { id: 5, icon: '🌙', name: '幽冥地府', reqLevel: 40, progress: 10, unlocked: false, cost: 200, dropChance: 0.45, drops: [{itemId: 105, name: '冥魂珠', icon: '💎', count: 1}] }
];

// 获取副本列表
router.get('/', (req, res) => {
  res.json(dungeons);
});

// 获取副本列表 (GET /list - 等同于 /)
router.get('/list', (req, res) => {
  res.json(dungeons);
});

// 获取副本详情
router.get('/info/:id', (req, res) => {
  const dungeonId = parseInt(req.params.id);
  const userId = parseInt(req.query.userId) || 1;
  
  const dungeon = dungeons.find(d => d.id === dungeonId);
  if (!dungeon) {
    return res.status(404).json({ success: false, error: '副本不存在' });
  }
  
  // 获取玩家进入次数记录
  let timesRemaining = 999;
  let cooldownEnd = null;
  let bestRecord = null;
  
  if (db) {
    try {
      // 获取当日进入次数
      const today = new Date().toISOString().split('T')[0];
      const record = db.prepare(
        'SELECT * FROM dungeon_records WHERE user_id = ? AND dungeon_id = ? AND enter_date = ?'
      ).get(userId, dungeonId, today);
      
      const maxDaily = 3;
      timesRemaining = record ? Math.max(0, maxDaily - record.enter_count) : maxDaily;
      
      // 获取冷却信息
      if (record && record.cooldown_end) {
        cooldownEnd = record.cooldown_end;
      }
      
      // 获取最佳记录
      const best = db.prepare(
        'SELECT * FROM dungeon_records WHERE user_id = ? AND dungeon_id = ? ORDER BY best_time ASC LIMIT 1'
      ).get(userId, dungeonId);
      if (best) {
        bestRecord = { bestTime: best.best_time, clearedAt: best.cleared_at };
      }
    } catch (e) {
      console.log('[dungeon] info查询:', e.message);
    }
  }
  
  res.json({
    success: true,
    dungeon: {
      id: dungeon.id,
      icon: dungeon.icon,
      name: dungeon.name,
      reqLevel: dungeon.reqLevel,
      cost: dungeon.cost,
      dropChance: dungeon.dropChance,
      drops: dungeon.drops,
      unlocked: dungeon.unlocked
    },
    timesRemaining,
    cooldownEnd,
    bestRecord
  });
});

// 进入副本
router.post('/enter', (req, res) => {
  const { userId, dungeonId } = req.body;
  
  const dungeon = dungeons.find(d => d.id === dungeonId);
  if (!dungeon) {
    return res.status(404).json({ success: false, error: '副本不存在' });
  }
  
  if (!dungeon.unlocked) {
    return res.status(403).json({ success: false, error: '副本未解锁' });
  }
  
  // 检查灵石（从 Users.lingshi 读取，权威数据源）
  if (db && dungeon.cost > 0) {
    try {
      const user = db.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
      if (!user || (user.lingshi || 0) < dungeon.cost) {
        return res.status(400).json({ success: false, error: '灵石不足' });
      }
      // 扣除灵石（写入 Users.lingshi，权威数据源）
      db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(dungeon.cost, userId);
    } catch (e) {
      console.log('[dungeon] 进入检查:', e.message);
    }
  }
  
  // 生成战斗ID
  const battleId = Date.now();
  
  res.json({
    success: true,
    battleId,
    dungeon: {
      id: dungeon.id,
      name: dungeon.name,
      cost: dungeon.cost,
      dropChance: dungeon.dropChance,
      drops: dungeon.drops
    }
  });
});

// 副本战斗结算
router.post('/battle/:battleId', (req, res) => {
  const { battleId } = req.params;
  const { userId, dungeonId, won, time } = req.body;
  
  const dungeon = dungeons.find(d => d.id === dungeonId);
  if (!dungeon) {
    return res.status(404).json({ success: false, error: '副本不存在' });
  }
  
  // 计算掉落
  let drops = [];
  let message = '战斗失败';
  
  if (won) {
    message = '战斗胜利';
    
    // 随机掉落（支持多件掉落）
    const totalDropChance = dungeon.dropChance;
    const dropsToGrant = [];
    
    for (const drop of dungeon.drops) {
      // 每件物品独立判定掉率
      const chance = drop.chance !== undefined ? drop.chance : totalDropChance;
      if (Math.random() < chance) {
        // count如果是数组则随机取值
        const count = Array.isArray(drop.count)
          ? Math.floor(Math.random() * (drop.count[1] - drop.count[0] + 1)) + drop.count[0]
          : drop.count;
        dropsToGrant.push({ ...drop, count });
      }
    }
    
    drops = dropsToGrant;
    
    // 写入玩家背包（逐件写入）
    if (db && dropsToGrant.length > 0) {
      try {
        for (const drop of dropsToGrant) {
          // 尝试UPSERT：已有同item则叠加count，否则插入
          const existing = db.prepare(
            'SELECT id, count FROM player_items WHERE user_id = ? AND item_id = ? AND item_type = ?'
          ).get(userId, drop.itemId, 'material');
          if (existing) {
            db.prepare('UPDATE player_items SET count = count + ? WHERE id = ?').run(drop.count, existing.id);
          } else {
            db.prepare(`
              INSERT INTO player_items (user_id, item_id, item_name, item_type, count, icon, source, created_at)
              VALUES (?, ?, ?, 'material', ?, ?, 'dungeon', CURRENT_TIMESTAMP)
            `).run(userId, drop.itemId, drop.name, drop.count, drop.icon);
          }
        }
      } catch (e) {
        console.log('[dungeon] 掉落写入:', e.message);
      }
    }
    
    // 记录通关
    if (db) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const existing = db.prepare(
          'SELECT * FROM dungeon_records WHERE user_id = ? AND dungeon_id = ? AND enter_date = ?'
        ).get(userId, dungeonId, today);
        
        if (existing) {
          db.prepare(
            'UPDATE dungeon_records SET enter_count = enter_count + 1, cleared = 1, best_time = CASE WHEN ? < best_time OR best_time IS NULL THEN ? ELSE best_time END WHERE id = ?'
          ).run(time || 0, time || 0, existing.id);
        } else {
          db.prepare(
            'INSERT INTO dungeon_records (user_id, dungeon_id, enter_count, cleared, best_time, enter_date, enter_time) VALUES (?, ?, 1, 1, ?, ?, CURRENT_TIMESTAMP)'
          ).run(userId, dungeonId, time || 0, today);
        }
      } catch (e) {
        console.log('[dungeon] 记录更新:', e.message);
      }
    }
    
    // 成就触发：副本通关
    if (won && achievementTrigger) {
      try {
        achievementTrigger.triggerAchievement(userId, 'dungeon_clear', dungeonId);
      } catch (e) {
        console.error('[dungeon] 成就触发失败:', e.message);
      }
    }
  }
  
  res.json({
    success: true,
    battleId: parseInt(battleId),
    won,
    message,
    dungeonId,
    drops,
    reward: won ? { spiritStones: dungeon.cost * 0.5, exp: 50 } : null
  });
});

module.exports = router;
