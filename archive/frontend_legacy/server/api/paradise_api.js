/**
 * 福地系统 API (Paradise/Blessed Land System)
 * 
 * 玩家可以在福地中进行探索，发现随机事件和奖励
 * 
 * 福地类型：
 * - 灵泉福地：灵气充沛
 * - 妖兽福地：有妖兽守护，击败获得奖励
 * - 感悟福地：领悟修炼心得
 * 
 * API路由：
 * - GET  /api/paradise/types         - 获取所有福地类型
 * - GET  /api/paradise/info          - 获取玩家福地信息
 * - POST /api/paradise/explore       - 探索指定福地
 * - GET  /api/paradise/quests        - 获取进行中的任务
 * - POST /api/paradise/claim-reward  - 领取奖励
 * - GET  /api/paradise/history       - 获取探索历史
 */

const express = require('express');
const router = express.Router();

// ============ 福地类型配置 ============

const BLESSED_LAND_TYPES = {
  'spirit_spring': {
    id: 'spirit_spring',
    name: '灵泉福地',
    description: '拥有灵泉的洞天福地，灵气充沛',
    icon: '🌊',
    rarity: 'common',
    exploreCost: 20,          // 探索消耗灵气
    rewards: {
      spirit: { min: 50, max: 200, chance: 0.8 },
      insight: { min: 10, max: 50, chance: 0.5 }
    },
    specialEvents: ['发现灵泉', '灵气充盈', '泉眼开窍']
  },
  'beast_lair': {
    id: 'beast_lair',
    name: '妖兽福地',
    description: '福地中有强大的妖兽守护',
    icon: '🐉',
    rarity: 'rare',
    exploreCost: 50,
    rewards: {
      spirit: { min: 100, max: 500, chance: 0.6 },
      equipment: { min: 1, max: 3, chance: 0.4 },
      beastSoul: { min: 1, max: 5, chance: 0.3 }
    },
    specialEvents: ['遭遇妖兽', '妖兽巢穴', '龙脉之地']
  },
  'insight_cavern': {
    id: 'insight_cavern',
    name: '感悟福地',
    description: '福地灵气让你对境界有了新的领悟',
    icon: '💡',
    rarity: 'epic',
    exploreCost: 80,
    rewards: {
      insight: { min: 30, max: 100, chance: 0.9 },
      spirit: { min: 30, max: 80, chance: 0.4 },
      realmExp: { min: 5, max: 20, chance: 0.5 }
    },
    specialEvents: ['领悟功法', '境界突破', '天机降临']
  },
  'treasure_cave': {
    id: 'treasure_cave',
    name: '宝藏洞窟',
    description: '传说中藏有上古宝物的洞穴',
    icon: '💎',
    rarity: 'legendary',
    exploreCost: 150,
    rewards: {
      treasure: { min: 1, max: 3, chance: 0.7 },
      spirit: { min: 200, max: 800, chance: 0.8 },
      rareItem: { min: 1, max: 1, chance: 0.2 }
    },
    specialEvents: ['发现宝藏', '上古遗迹', '奇遇连连']
  },
  'dragon_shrine': {
    id: 'dragon_shrine',
    name: '龙祠福地',
    description: '龙族祭祀圣地，蕴含无上力量',
    icon: '🏛️',
    rarity: 'mythic',
    exploreCost: 300,
    rewards: {
      dragonPower: { min: 10, max: 50, chance: 0.6 },
      spirit: { min: 500, max: 2000, chance: 0.9 },
      bloodline: { min: 1, max: 1, chance: 0.15 }
    },
    specialEvents: ['龙魂觉醒', '血脉共鸣', '祖龙降临']
  }
};

// 稀有度颜色
const RARITY_COLORS = {
  common: '#9E9E9E',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FF9800',
  mythic: '#F44336'
};

// 稀有度名称
const RARITY_NAMES = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
  mythic: '神话'
};

// ============ 存储访问 ============

let serverStorage = null;
try {
  serverStorage = require('../../../../src/server.storage');
} catch (e) {
  try {
    serverStorage = require('../../../../../src/server.storage');
  } catch (e2) {
    console.warn('[ParadiseAPI] server.storage not available:', e2.message);
  }
}

let db = null;
try {
  const Database = require('better-sqlite3');
  const path = require('path');
  const dataDir = path.join(process.cwd(), 'data');
  if (!require('fs').existsSync(dataDir)) {
    require('fs').mkdirSync(dataDir, { recursive: true });
  }
  db = new Database(path.join(dataDir, 'paradise.db'));
  // 初始化表
  db.exec(`
    CREATE TABLE IF NOT EXISTS paradise_players (
      playerId INTEGER PRIMARY KEY,
      totalExplores INTEGER DEFAULT 0,
      totalRewards INTEGER DEFAULT 0,
      lastExploreAt INTEGER,
      exploreCount INTEGER DEFAULT 0,
      questCount INTEGER DEFAULT 0,
      createdAt INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );
    CREATE TABLE IF NOT EXISTS paradise_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerId INTEGER,
      landId TEXT,
      eventName TEXT,
      rewards TEXT,
      exploredAt INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );
    CREATE TABLE IF NOT EXISTS paradise_quests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerId INTEGER,
      questId TEXT,
      landId TEXT,
      status TEXT DEFAULT 'active',
      startedAt INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      completedAt INTEGER
    );
  `);
} catch (e) {
  console.warn('[ParadiseAPI] SQLite not available:', e.message);
}

// ============ 辅助函数 ============

function getPlayerData(playerId) {
  if (!db) return null;
  try {
    const stmt = db.prepare('SELECT * FROM paradise_players WHERE playerId = ?');
    return stmt.get(playerId);
  } catch (e) {
    return null;
  }
}

function initPlayerData(playerId) {
  if (!db) return null;
  try {
    const existing = getPlayerData(playerId);
    if (existing) return existing;
    const stmt = db.prepare('INSERT INTO paradise_players (playerId) VALUES (?)');
    stmt.run(playerId);
    return getPlayerData(playerId);
  } catch (e) {
    return null;
  }
}

function addHistory(playerId, landId, eventName, rewards) {
  if (!db) return;
  try {
    const stmt = db.prepare(
      'INSERT INTO paradise_history (playerId, landId, eventName, rewards) VALUES (?, ?, ?, ?)'
    );
    stmt.run(playerId, landId, eventName, JSON.stringify(rewards));
  } catch (e) {
    console.error('[ParadiseAPI] addHistory error:', e);
  }
}

function getHistory(playerId, limit = 20) {
  if (!db) return [];
  try {
    const stmt = db.prepare(
      'SELECT * FROM paradise_history WHERE playerId = ? ORDER BY exploredAt DESC LIMIT ?'
    );
    return stmt.all(playerId, limit).map(row => ({
      ...row,
      rewards: JSON.parse(row.rewards || '{}')
    }));
  } catch (e) {
    return [];
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollChance(chance) {
  return Math.random() < chance;
}

function exploreLand(landConfig, playerId) {
  const rewards = {};
  const events = [];
  
  // 选择随机特殊事件
  const eventIdx = Math.floor(Math.random() * landConfig.specialEvents.length);
  events.push(landConfig.specialEvents[eventIdx]);
  
  // 结算每个奖励类型
  for (const [rewardKey, rewardConfig] of Object.entries(landConfig.rewards)) {
    if (rollChance(rewardConfig.chance)) {
      rewards[rewardKey] = randomInt(rewardConfig.min, rewardConfig.max);
    }
  }
  
  // 稀有度加成
  const rarityMultipliers = { common: 1, rare: 1.5, epic: 2, legendary: 3, mythic: 5 };
  const multiplier = rarityMultipliers[landConfig.rarity] || 1;
  
  // 可能有额外奇遇 (5%概率)
  if (Math.random() < 0.05) {
    const bonusEvents = ['天降祥瑞！', '福缘深厚！', '机缘巧合！', '如有神助！'];
    events.push(bonusEvents[Math.floor(Math.random() * bonusEvents.length)]);
    // 额外奖励
    rewards.bonusSpirit = randomInt(50, 200) * multiplier;
    rewards.bonusInsight = randomInt(10, 50) * multiplier;
  }
  
  return { rewards, events, multiplier };
}

// ============ 中间件 ============

function extractPlayerId(req, res, next) {
  req.playerId = parseInt(
    req.headers['x-player-id'] ||
    req.query.playerId ||
    req.body?.playerId ||
    0,
    10
  );
  
  if (!req.playerId) {
    return res.status(401).json({
      success: false,
      error: '未登录，请提供 playerId'
    });
  }
  next();
}

// ============ API 路由 ============

/**
 * GET /api/paradise/types
 * 获取所有福地类型
 */
router.get('/types', (req, res) => {
  try {
    const types = Object.values(BLESSED_LAND_TYPES).map(type => ({
      id: type.id,
      name: type.name,
      description: type.description,
      icon: type.icon,
      rarity: type.rarity,
      rarityName: RARITY_NAMES[type.rarity],
      rarityColor: RARITY_COLORS[type.rarity],
      exploreCost: type.exploreCost,
      rewardTypes: Object.keys(type.rewards)
    }));
    
    res.json({
      success: true,
      data: { types }
    });
  } catch (e) {
    console.error('[ParadiseAPI] /types error:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/paradise/info
 * 获取玩家福地信息
 */
router.get('/info', extractPlayerId, (req, res) => {
  try {
    const playerId = req.playerId;
    const playerData = initPlayerData(playerId);
    
    if (!playerData) {
      return res.json({
        success: true,
        data: {
          playerId,
          totalExplores: 0,
          totalRewards: 0,
          exploreCount: 0,
          unlockedLands: ['spirit_spring'],  // 默认解锁灵泉福地
          favoriteLand: null
        }
      });
    }
    
    // 解锁状态（根据探索次数解锁）
    const unlockedLands = ['spirit_spring'];
    if (playerData.exploreCount >= 5) unlockedLands.push('beast_lair');
    if (playerData.exploreCount >= 15) unlockedLands.push('insight_cavern');
    if (playerData.exploreCount >= 30) unlockedLands.push('treasure_cave');
    if (playerData.exploreCount >= 50) unlockedLands.push('dragon_shrine');
    
    res.json({
      success: true,
      data: {
        playerId,
        totalExplores: playerData.totalExplores || 0,
        totalRewards: playerData.totalRewards || 0,
        exploreCount: playerData.exploreCount || 0,
        unlockedLands,
        lastExploreAt: playerData.lastExploreAt
      }
    });
  } catch (e) {
    console.error('[ParadiseAPI] /info error:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * POST /api/paradise/explore
 * 探索指定福地
 * Body: { playerId, landId }
 */
router.post('/explore', extractPlayerId, (req, res) => {
  try {
    const { landId } = req.body;
    const playerId = req.playerId;
    
    if (!landId) {
      return res.status(400).json({
        success: false,
        error: '请指定要探索的福地ID'
      });
    }
    
    const landConfig = BLESSED_LAND_TYPES[landId];
    if (!landConfig) {
      return res.status(404).json({
        success: false,
        error: '福地类型不存在'
      });
    }
    
    const playerData = initPlayerData(playerId);
    
    // 检查是否解锁
    const unlockedLands = ['spirit_spring'];
    if (playerData && playerData.exploreCount >= 5) unlockedLands.push('beast_lair');
    if (playerData && playerData.exploreCount >= 15) unlockedLands.push('insight_cavern');
    if (playerData && playerData.exploreCount >= 30) unlockedLands.push('treasure_cave');
    if (playerData && playerData.exploreCount >= 50) unlockedLands.push('dragon_shrine');
    
    if (!unlockedLands.includes(landId)) {
      return res.status(403).json({
        success: false,
        error: `该福地尚未解锁，需要探索${landId === 'beast_lair' ? '5' : landId === 'insight_cavern' ? '15' : landId === 'treasure_cave' ? '30' : '50'}次后解锁`
      });
    }
    
    // 探索冷却检查（10秒冷却）
    if (playerData && playerData.lastExploreAt) {
      const cooldown = 10000; // 10秒
      const timePassed = Date.now() - playerData.lastExploreAt;
      if (timePassed < cooldown) {
        return res.status(429).json({
          success: false,
          error: `探索冷却中，请等待 ${Math.ceil((cooldown - timePassed) / 1000)} 秒`,
          retryAfter: Math.ceil((cooldown - timePassed) / 1000)
        });
      }
    }
    
    // 执行探索
    const result = exploreLand(landConfig, playerId);
    
    // 更新玩家数据
    if (db) {
      try {
        const totalSpirit = Object.values(result.rewards).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);
        const stmt = db.prepare(`
          UPDATE paradise_players 
          SET totalExplores = totalExplores + 1,
              exploreCount = exploreCount + 1,
              totalRewards = totalRewards + ?,
              lastExploreAt = ?
          WHERE playerId = ?
        `);
        stmt.run(totalSpirit, Date.now(), playerId);
      } catch (e) {
        console.error('[ParadiseAPI] update player error:', e);
      }
    }
    
    // 记录历史
    addHistory(playerId, landId, result.events[0], result.rewards);
    
    console.log(`[ParadiseAPI] 玩家 ${playerId} 探索 ${landConfig.name}，获得:`, result.rewards);
    
    res.json({
      success: true,
      data: {
        landId,
        landName: landConfig.name,
        icon: landConfig.icon,
        rarity: landConfig.rarity,
        rarityName: RARITY_NAMES[landConfig.rarity],
        events: result.events,
        rewards: result.rewards,
        totalRewardValue: Object.values(result.rewards).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0),
        exploreCost: landConfig.exploreCost,
        cooldownSeconds: 10
      }
    });
  } catch (e) {
    console.error('[ParadiseAPI] /explore error:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/paradise/quests
 * 获取进行中的福地任务
 */
router.get('/quests', extractPlayerId, (req, res) => {
  try {
    const playerId = req.playerId;
    
    if (!db) {
      return res.json({
        success: true,
        data: { quests: [] }
      });
    }
    
    const stmt = db.prepare(
      "SELECT * FROM paradise_quests WHERE playerId = ? AND status = 'active' ORDER BY startedAt DESC"
    );
    const quests = stmt.all(playerId);
    
    // 生成进行中的随机任务
    const activeQuests = quests.map(q => {
      const landConfig = BLESSED_LAND_TYPES[q.landId];
      return {
        questId: q.questId,
        landId: q.landId,
        landName: landConfig?.name || q.landId,
        status: q.status,
        startedAt: q.startedAt
      };
    });
    
    res.json({
      success: true,
      data: { quests: activeQuests }
    });
  } catch (e) {
    console.error('[ParadiseAPI] /quests error:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * POST /api/paradise/claim-reward
 * 领取福地任务奖励
 * Body: { playerId, questId }
 */
router.post('/claim-reward', extractPlayerId, (req, res) => {
  try {
    const { questId } = req.body;
    const playerId = req.playerId;
    
    if (!questId) {
      return res.status(400).json({
        success: false,
        error: '请提供任务ID'
      });
    }
    
    if (!db) {
      return res.status(500).json({
        success: false,
        error: '存储不可用'
      });
    }
    
    const stmt = db.prepare(
      "SELECT * FROM paradise_quests WHERE questId = ? AND playerId = ? AND status = 'active'"
    );
    const quest = stmt.get(questId, playerId);
    
    if (!quest) {
      return res.status(404).json({
        success: false,
        error: '任务不存在或已领取'
      });
    }
    
    // 标记为已完成
    const updateStmt = db.prepare(
      "UPDATE paradise_quests SET status = 'completed', completedAt = ? WHERE questId = ?"
    );
    updateStmt.run(Date.now(), questId);
    
    const landConfig = BLESSED_LAND_TYPES[quest.landId];
    const rewards = {};
    
    // 生成奖励
    if (landConfig) {
      for (const [key, config] of Object.entries(landConfig.rewards)) {
        if (rollChance(config.chance * 1.5)) { // 任务奖励概率更高
          rewards[key] = randomInt(config.min * 2, config.max * 2);
        }
      }
    }
    
    console.log(`[ParadiseAPI] 玩家 ${playerId} 领取任务 ${questId} 奖励:`, rewards);
    
    res.json({
      success: true,
      data: {
        questId,
        landName: landConfig?.name || quest.landId,
        rewards,
        claimedAt: Date.now()
      }
    });
  } catch (e) {
    console.error('[ParadiseAPI] /claim-reward error:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/paradise/history
 * 获取探索历史
 */
router.get('/history', extractPlayerId, (req, res) => {
  try {
    const playerId = req.playerId;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    
    const history = getHistory(playerId, limit);
    
    const formattedHistory = history.map(record => {
      const landConfig = BLESSED_LAND_TYPES[record.landId];
      return {
        id: record.id,
        landId: record.landId,
        landName: landConfig?.name || record.landId,
        landIcon: landConfig?.icon || '🏝️',
        eventName: record.eventName,
        rewards: record.rewards,
        totalValue: Object.values(record.rewards || {}).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0),
        exploredAt: record.exploredAt
      };
    });
    
    res.json({
      success: true,
      data: {
        history: formattedHistory,
        total: formattedHistory.length
      }
    });
  } catch (e) {
    console.error('[ParadiseAPI] /history error:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * GET /api/paradise/stats
 * 获取福地统计
 */
router.get('/stats', extractPlayerId, (req, res) => {
  try {
    const playerId = req.playerId;
    const playerData = getPlayerData(playerId);
    
    // 获取各福地探索次数
    let landStats = {};
    if (db) {
      try {
        const stmt = db.prepare(
          'SELECT landId, COUNT(*) as count FROM paradise_history WHERE playerId = ? GROUP BY landId'
        );
        const rows = stmt.all(playerId);
        rows.forEach(row => {
          const landConfig = BLESSED_LAND_TYPES[row.landId];
          landStats[row.landId] = {
            landName: landConfig?.name || row.landId,
            icon: landConfig?.icon || '🏝️',
            exploreCount: row.count
          };
        });
      } catch (e) {
        // ignore
      }
    }
    
    res.json({
      success: true,
      data: {
        totalExplores: playerData?.totalExplores || 0,
        totalRewards: playerData?.totalRewards || 0,
        landStats,
        unlockedCount: Object.keys(landStats).length,
        totalTypes: Object.keys(BLESSED_LAND_TYPES).length
      }
    });
  } catch (e) {
    console.error('[ParadiseAPI] /stats error:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
