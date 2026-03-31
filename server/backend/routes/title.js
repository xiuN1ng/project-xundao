const express = require('express');
const router = express.Router();
const path = require('path');
const { TitleSystem, TITLE_DATA, TitleRarity, TitleType } = require('../../game/title_system');

// ==================== 数据库初始化 ====================
let db = null;
const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');

function getDb() {
  if (!db) {
    try {
      const Database = require('better-sqlite3');
      db = new Database(DB_PATH);
      db.pragma('journal_mode = WAL');
      db.pragma('busy_timeout = 5000');
    } catch (e) {
      console.error('[Title] DB init error:', e.message);
      return null;
    }
  }
  return db;
}

function initTitleTables() {
  const database = getDb();
  if (!database) return;
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS player_titles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        title_id TEXT NOT NULL,
        equipped INTEGER DEFAULT 0,
        unlocked_at TEXT DEFAULT (datetime('now')),
        UNIQUE(player_id, title_id)
      );
    `);
  } catch (e) {
    console.error('[Title] init tables error:', e.message);
  }
}

// 启动时初始化
initTitleTables();

// ==================== 工具函数 ====================

/**
 * 获取玩家已解锁的称号列表
 */
function getUnlockedTitleIds(playerId) {
  const database = getDb();
  if (!database) return [];
  try {
    const rows = database.prepare('SELECT title_id FROM player_titles WHERE player_id = ?').all(playerId);
    return rows.map(r => r.title_id);
  } catch (e) {
    return [];
  }
}

/**
 * 检查称号是否自动解锁（基于玩家数据）
 */
function isAutoUnlocked(playerId, titleId, playerData) {
  const title = TITLE_DATA[titleId];
  if (!title) return false;

  switch (title.type) {
    case TitleType.REALM:
      // 境界称号：玩家境界 >= 称号要求境界
      return (playerData.realm || 1) >= (title.requiredRealm || 1);

    case TitleType.ARENA:
      // 竞技场称号：基于排名或胜场
      if (title.requiredArenaRank) {
        return (playerData.arenaRank || 999) <= title.requiredArenaRank;
      }
      return (playerData.arenaWins || 0) >= (title.requiredArenaWins || 0);

    case TitleType.RANK:
      // 爵位称号：基于排行榜名次
      return (playerData.rank || 0) >= (title.requiredRank || 0);

    case TitleType.DUNGEON:
      // 副本称号：基于通关副本数
      return (playerData.dungeonsCompleted || 0) >= (title.requiredDungeons || 0);

    case TitleType.SPECIAL:
      // 特殊称号：基于VIP等级或永久称号
      if (title.requiredVipLevel) {
        return (playerData.vipLevel || 0) >= title.requiredVipLevel;
      }
      return title.isPermanent === true;

    case TitleType.EVENT:
      // 活动称号：默认锁定，由运营手动发放
      return false;

    case TitleType.ACHIEVEMENT:
      // 成就称号：检查对应成就是否完成
      try {
        const row = database.prepare(
          'SELECT completed FROM achievement_progress WHERE user_id = ? AND achievement_id = ?'
        ).get(playerId, title.requiredAchievement);
        return row && row.completed === 1;
      } catch (e) {
        return false;
      }

    default:
      return false;
  }
}

/**
 * 获取玩家的真实数据（用于称号解锁判断）
 */
function getPlayerTitleData(playerId) {
  const database = getDb();
  if (!database) return { realm: 1, level: 1, vipLevel: 0, arenaRank: 999, arenaWins: 0, rank: 0, dungeonsCompleted: 0 };

  try {
    // 获取玩家基本信息
    const user = database.prepare(
      'SELECT realm, level, vipLevel FROM Users WHERE id = ?'
    ).get(playerId) || { realm: 1, level: 1, vipLevel: 0 };

    // 获取竞技场数据
    let arenaRank = 999, arenaWins = 0;
    try {
      const arena = database.prepare(
        'SELECT rank_id, win_count FROM arena_player WHERE player_id = ?'
      ).get(playerId);
      if (arena) {
        arenaRank = arena.rank_id || 999;
        arenaWins = arena.win_count || 0;
      }
    } catch (e) {}

    // 获取副本通关数
    let dungeonsCompleted = 0;
    try {
      const count = database.prepare(
        'SELECT COUNT(*) as cnt FROM dungeon_records WHERE player_id = ?'
      ).get(playerId);
      dungeonsCompleted = count ? count.cnt : 0;
    } catch (e) {}

    return {
      realm: user.realm || 1,
      level: user.level || 1,
      vipLevel: user.vipLevel || 0,
      arenaRank,
      arenaWins,
      rank: 0,
      dungeonsCompleted
    };
  } catch (e) {
    return { realm: 1, level: 1, vipLevel: 0, arenaRank: 999, arenaWins: 0, rank: 0, dungeonsCompleted: 0 };
  }
}

/**
 * 获取玩家已装备的称号
 */
function getEquippedTitleId(playerId) {
  const database = getDb();
  if (!database) return null;
  try {
    const row = database.prepare(
      'SELECT title_id FROM player_titles WHERE player_id = ? AND equipped = 1'
    ).get(playerId);
    return row ? row.title_id : null;
  } catch (e) {
    return null;
  }
}

/**
 * 解锁称号（自动解锁型 + 手动解锁型）
 */
function unlockTitle(playerId, titleId) {
  const database = getDb();
  if (!database) return false;
  try {
    database.prepare(`
      INSERT OR IGNORE INTO player_titles (player_id, title_id, equipped, unlocked_at)
      VALUES (?, ?, 0, datetime('now'))
    `).run(playerId, titleId);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 计算称号属性加成
 */
function calculateTitleBonus(equippedTitleId) {
  if (!equippedTitleId) return {};
  const title = TITLE_DATA[equippedTitleId];
  if (!title || !title.attributes) return {};

  const bonus = {};
  const multiplier = title.rarity ? title.rarity.multiplier : 1.0;

  for (const [attr, value] of Object.entries(title.attributes)) {
    bonus[attr] = Math.round(value * multiplier * 100) / 100;
  }
  return bonus;
}

// ==================== 路由实现 ====================

// 统一用户ID提取
function extractUserId(req) {
  return parseInt(req.params.playerId || req.query.playerId || req.query.userId || req.body.playerId || req.body.userId || req.userId || 1);
}

/**
 * GET /api/title/
 * 获取所有称号列表（带解锁状态）
 */
router.get('/', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();

  if (!database) {
    return res.status(500).json({ success: false, error: '数据库不可用' });
  }

  try {
    // 获取玩家数据
    const playerData = getPlayerTitleData(userId);

    // 获取已解锁的称号
    const unlockedIds = getUnlockedTitleIds(userId);

    // 获取已装备的称号
    const equippedId = getEquippedTitleId(userId);

    // 构建称号列表
    const titles = Object.values(TITLE_DATA).map(title => {
      // 自动判断是否解锁（基于玩家数据）
      const autoUnlocked = isAutoUnlocked(userId, title.id, playerData);
      const manuallyUnlocked = unlockedIds.includes(title.id);
      const unlocked = autoUnlocked || manuallyUnlocked;

      // 如果自动解锁但DB未记录，同步到DB
      if (autoUnlocked && !manuallyUnlocked) {
        unlockTitle(userId, title.id);
      }

      return {
        id: title.id,
        name: title.name,
        type: title.type,
        rarity: title.rarity ? {
          id: title.rarity.id,
          name: title.rarity.name,
          color: title.rarity.color
        } : null,
        description: title.description || '',
        icon: title.icon || '',
        attributes: title.attributes || {},
        unlocked,
        equipped: unlocked && equippedId === title.id,
        isLimited: title.isLimited || false,
        isPermanent: title.isPermanent || false,
        validPeriod: title.validPeriod || null
      };
    });

    // 计算已装备称号的总加成
    const equippedBonus = calculateTitleBonus(equippedId);

    res.json({
      success: true,
      data: {
        titles,
        equippedTitleId: equippedId,
        equippedBonus,
        equippedTitleName: equippedId ? (TITLE_DATA[equippedId]?.name || '') : ''
      }
    });
  } catch (e) {
    console.error('[Title] GET / error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/title/list — 重用 GET / 的逻辑
router.get('/list', (req, res) => {
  // 复用 GET / 的处理器逻辑，避免 router.handle 循环路由
  const userId = parseInt(req.query.playerId || req.query.userId || req.userId) || 1;
  const database = getDb();

  if (!database) {
    return res.status(500).json({ success: false, error: '数据库不可用' });
  }

  try {
    const playerData = getPlayerTitleData(userId);
    const unlockedIds = getUnlockedTitleIds(userId);
    const equippedId = getEquippedTitleId(userId);

    const titles = Object.values(TITLE_DATA).map(title => {
      const autoUnlocked = isAutoUnlocked(userId, title.id, playerData);
      const manuallyUnlocked = unlockedIds.includes(title.id);
      const unlocked = autoUnlocked || manuallyUnlocked;
      if (autoUnlocked && !manuallyUnlocked) unlockTitle(userId, title.id);

      return {
        id: title.id,
        name: title.name,
        type: title.type,
        rarity: title.rarity ? { id: title.rarity.id, name: title.rarity.name, color: title.rarity.color } : null,
        description: title.description || '',
        icon: title.icon || '',
        attributes: title.attributes || {},
        unlocked,
        equipped: unlocked && equippedId === title.id,
        isLimited: title.isLimited || false,
        isPermanent: title.isPermanent || false,
        validPeriod: title.validPeriod || null
      };
    });

    const equippedBonus = calculateTitleBonus(equippedId);

    res.json({
      success: true,
      data: {
        titles,
        equippedTitleId: equippedId,
        equippedBonus,
        equippedTitleName: equippedId ? (TITLE_DATA[equippedId]?.name || '') : ''
      }
    });
  } catch (e) {
    console.error('[Title] GET /list error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/title/player/:playerId — 获取玩家称号详情
router.get('/player/:playerId', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();

  if (!database) {
    return res.status(500).json({ success: false, error: '数据库不可用' });
  }

  try {
    const playerData = getPlayerTitleData(userId);
    const unlockedIds = getUnlockedTitleIds(userId);
    const equippedId = getEquippedTitleId(userId);

    // 获取已解锁的称号详情
    const unlockedTitles = [];

    // 遍历所有称号，找出已解锁的
    for (const titleId of Object.keys(TITLE_DATA)) {
      const autoUnlocked = isAutoUnlocked(userId, titleId, playerData);
      const manuallyUnlocked = unlockedIds.includes(titleId);
      const unlocked = autoUnlocked || manuallyUnlocked;

      if (unlocked) {
        const title = TITLE_DATA[titleId];
        unlockedTitles.push({
          id: title.id,
          name: title.name,
          type: title.type,
          rarity: title.rarity ? {
            id: title.rarity.id,
            name: title.rarity.name,
            color: title.rarity.color
          } : null,
          description: title.description || '',
          icon: title.icon || '',
          attributes: title.attributes || {},
          equipped: equippedId === title.id,
          unlockedAt: manuallyUnlocked ? null : 'auto'
        });
      }
    }

    const equippedBonus = calculateTitleBonus(equippedId);

    // 聚合属性加成（按类型）
    const bonusSummary = {};
    for (const [attr, val] of Object.entries(equippedBonus)) {
      bonusSummary[attr] = val;
    }

    res.json({
      success: true,
      data: {
        playerId: userId,
        playerData: {
          realm: playerData.realm,
          level: playerData.level,
          vipLevel: playerData.vipLevel,
          arenaRank: playerData.arenaRank,
          arenaWins: playerData.arenaWins
        },
        totalTitles: unlockedTitles.length,
        equippedTitleId: equippedId,
        equippedTitleName: equippedId ? (TITLE_DATA[equippedId]?.name || '') : '',
        equippedBonus: bonusSummary,
        titles: unlockedTitles
      }
    });
  } catch (e) {
    console.error('[Title] GET /player/:playerId error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/title/equip — 装备/卸下称号
router.post('/equip', (req, res) => {
  const userId = extractUserId(req);
  const { titleId, equip } = req.body;
  const database = getDb();

  if (!database) {
    return res.status(500).json({ success: false, error: '数据库不可用' });
  }

  if (!titleId) {
    return res.status(400).json({ success: false, error: '缺少 titleId 参数' });
  }

  const title = TITLE_DATA[titleId];
  if (!title) {
    return res.status(404).json({ success: false, error: '称号不存在' });
  }

  try {
    const playerData = getPlayerTitleData(userId);

    // 检查是否满足解锁条件
    const autoUnlocked = isAutoUnlocked(userId, titleId, playerData);
    const unlockedIds = getUnlockedTitleIds(userId);
    const unlocked = autoUnlocked || unlockedIds.includes(titleId);

    if (!unlocked) {
      return res.status(403).json({ success: false, error: '称号未解锁，请先达成条件' });
    }

    if (equip === false || equip === 0) {
      // 卸下称号
      database.prepare(
        'UPDATE player_titles SET equipped = 0 WHERE player_id = ? AND title_id = ?'
      ).run(userId, titleId);
      return res.json({
        success: true,
        message: '称号已卸下',
        equippedTitleId: null,
        equippedTitleName: '',
        equippedBonus: {}
      });
    }

    // 先卸下其他称号
    database.prepare(
      'UPDATE player_titles SET equipped = 0 WHERE player_id = ?'
    ).run(userId);

    // 装备新称号
    // 确保记录存在
    unlockTitle(userId, titleId);
    database.prepare(
      'UPDATE player_titles SET equipped = 1 WHERE player_id = ? AND title_id = ?'
    ).run(userId, titleId);

    const equippedBonus = calculateTitleBonus(titleId);

    res.json({
      success: true,
      message: `已装备称号「${title.name}」`,
      equippedTitleId: titleId,
      equippedTitleName: title.name,
      equippedBonus
    });
  } catch (e) {
    console.error('[Title] POST /equip error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/title/bonuses — 获取玩家当前称号加成
router.get('/bonuses', (req, res) => {
  const userId = extractUserId(req);
  const equippedId = getEquippedTitleId(userId);
  const bonus = calculateTitleBonus(equippedId);
  res.json({
    success: true,
    equippedTitleId: equippedId,
    equippedTitleName: equippedId ? (TITLE_DATA[equippedId]?.name || '') : '',
    bonus
  });
});

module.exports = router;
