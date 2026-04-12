/**
 * 成就展柜/荣誉殿堂 API (P88-5)
 * 挂机修仙游戏 - 成就展柜系统
 *
 * API端点:
 * 1. GET  /api/showcase/me              - 获取我的展柜
 * 2. POST /api/showcase/equip          - 装备展柜槽位
 * 3. POST /api/showcase/unequip        - 卸下展柜槽位
 * 4. GET  /api/showcase/player/:playerId - 查看他人展柜
 * 5. GET  /api/showcase/hall            - 荣誉殿堂排行榜
 *
 * 数据库表:
 * - player_showcase: 玩家展柜数据 (player_id, slot_type, slot_id, equipped_at)
 * - showcase_visits: 展柜访问统计 (player_id, visitor_id, visited_at)
 * - showcase_rare_titles: 稀有称号记录 (player_id, title_id, rarity)
 */

const express = require('express');
const router = express.Router();
const path = require('path');

const Logger = {
  info: (...args) => console.log('[showcase]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[showcase:error]', new Date().toISOString(), ...args)
};

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  Logger.info('数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  db = {
    prepare: () => ({ run: () => {}, get: () => null, all: () => [] }),
    exec: () => {}
  };
}

// ============================================================
// 槽位配置
// ============================================================
const SLOT_TYPES = ['achievement', 'title', 'equipment', 'mount', 'wing', 'spirit'];

// 稀有称号配置
const RARE_TITLE_RARITY = {
  legendary: { name: '传说', weight: 100, color: '#ffd700' },
  epic: { name: '史诗', weight: 50, color: '#a855f7' },
  rare: { name: '稀有', weight: 20, color: '#3b82f6' },
  common: { name: '普通', weight: 5, color: '#9ca3af' },
};

// ============================================================
// 数据库初始化
// ============================================================
function initTables() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_showcase (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        slot_type TEXT NOT NULL,
        slot_id TEXT,
        equipped_at TEXT DEFAULT (datetime('now')),
        UNIQUE(player_id, slot_type)
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS showcase_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        visitor_id INTEGER NOT NULL,
        visited_at TEXT DEFAULT (datetime('now')),
        UNIQUE(player_id, visitor_id)
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS showcase_rare_titles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        title_id TEXT NOT NULL,
        rarity TEXT DEFAULT 'common',
        acquired_at TEXT DEFAULT (datetime('now')),
        UNIQUE(player_id, title_id)
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_showcase_player ON player_showcase(player_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_showcase_visits ON showcase_visits(player_id, visited_at DESC)`);
    Logger.info('展柜数据库表初始化完成');
  } catch (e) {
    Logger.error('展柜数据库表初始化失败:', e.message);
  }
}
initTables();

// ============================================================
// 中间件：获取当前玩家
// ============================================================
function getPlayerId(req) {
  // 优先从 auth 中间件设置的 req.userId
  if (req.userId) return req.userId;
  // 其次从 header 或 query 获取
  const query = req.query || {};
  const body = req.body || {};
  return parseInt(query.playerId || body.playerId || req.headers['x-player-id'] || 1);
}

// ============================================================
// 辅助函数：获取玩家展示数据
// ============================================================
function getPlayerShowcase(playerId) {
  const rows = db.prepare('SELECT slot_type, slot_id, equipped_at FROM player_showcase WHERE player_id = ?').all(playerId);
  const slots = {};
  for (const type of SLOT_TYPES) {
    const row = rows.find(r => r.slot_type === type);
    slots[type] = row ? { slotId: row.slot_id, equippedAt: row.equipped_at } : { slotId: null, equippedAt: null };
  }

  const showcase = expandShowcase(playerId, slots);
  return showcase;
}

function expandShowcase(playerId, slots) {
  // player 表（注意是单数）获取玩家基本信息
  const player = db.prepare('SELECT id, level, realm FROM player WHERE id = ?').get(playerId) || {};

  // 成就槽：从 achievement_progress 获取已完成的成就
  let achievementSlot = slots.achievement.slotId;
  if (!achievementSlot) {
    const topAchievement = db.prepare(`
      SELECT achievement_id FROM achievement_progress
      WHERE user_id = ? AND completed = 1
      ORDER BY achievement_id DESC LIMIT 1
    `).get(playerId);
    if (topAchievement) achievementSlot = String(topAchievement.achievement_id);
  }

  // 称号槽：从 player_titles 获取已装备的称号
  let titleSlot = slots.title.slotId;
  if (!titleSlot) {
    const equippedTitle = db.prepare(`
      SELECT title_id FROM player_titles
      WHERE player_id = ? AND equipped = 1
      LIMIT 1
    `).get(playerId);
    if (equippedTitle) titleSlot = equippedTitle.title_id;
  }

  // 装备槽：从 player_beasts 获取已装备的灵兽作为默认
  let equipmentSlot = slots.equipment.slotId;
  if (!equipmentSlot) {
    // 尝试从灵兽槽中取第一个已激活的
    const firstBeast = db.prepare(`
      SELECT id, name, level, quality, attack FROM player_beasts
      WHERE player_id = ? AND is_active = 1
      ORDER BY attack DESC LIMIT 1
    `).get(playerId);
    if (firstBeast) {
      equipmentSlot = { id: firstBeast.id, name: firstBeast.name || '灵兽', level: firstBeast.level, quality: firstBeast.quality, attack: firstBeast.attack };
    }
  }

  // 坐骑槽：从 player_swords 获取已装备的飞剑
  let mountSlot = slots.mount.slotId;
  if (!mountSlot) {
    const sword = db.prepare('SELECT id, sword_type FROM player_swords WHERE player_id = ? AND is_equipped = 1 LIMIT 1').get(playerId);
    if (sword) mountSlot = { id: sword.id, name: sword.sword_type || '飞剑' };
  }

  // 翅膀槽：从 player_spirit_artifacts 获取已装备的法器
  let wingSlot = slots.wing.slotId;
  if (!wingSlot) {
    const artifact = db.prepare('SELECT id, artifact_id FROM player_spirit_artifacts WHERE player_id = ? AND is_equipped = 1 LIMIT 1').get(playerId);
    if (artifact) wingSlot = { id: artifact.id, name: `法器#${artifact.artifact_id}` };
  }

  // 灵兽槽：从 player_beasts 获取已激活灵兽
  let spiritSlot = slots.spirit.slotId;
  if (!spiritSlot) {
    const activeBeast = db.prepare(`
      SELECT id, name, level, quality, attack FROM player_beasts
      WHERE player_id = ? AND is_active = 1
      ORDER BY attack DESC LIMIT 1
    `).get(playerId);
    if (activeBeast) {
      spiritSlot = { id: activeBeast.id, name: activeBeast.name || '灵兽', level: activeBeast.level, quality: activeBeast.quality, attack: activeBeast.attack };
    }
  }

  // 访问统计
  const visitCount = db.prepare('SELECT COUNT(*) as c FROM showcase_visits WHERE player_id = ?').get(playerId)?.c || 0;
  const recentVisitors = db.prepare(`
    SELECT v.visitor_id, v.visited_at
    FROM showcase_visits v
    WHERE v.player_id = ?
    ORDER BY v.visited_at DESC LIMIT 5
  `).all(playerId);

  return {
    playerId,
    playerName: `玩家${playerId}`,
    playerLevel: player.level || 1,
    playerRealm: player.realm || 1,
    slots: {
      achievement: achievementSlot,
      title: titleSlot,
      equipment: equipmentSlot,
      mount: mountSlot,
      wing: wingSlot,
      spirit: spiritSlot,
    },
    visitCount,
    recentVisitors: recentVisitors.map(v => ({
      visitorId: v.visitor_id,
      visitedAt: v.visited_at,
    })),
  };
}

// ============================================================
// 端点 1: GET /api/showcase/me
// 获取我的展柜
// ============================================================
router.get('/me', (req, res) => {
  const playerId = getPlayerId(req);
  const showcase = getPlayerShowcase(playerId);

  // 获取可用的展柜选项
  const availableAchievements = db.prepare(`
    SELECT achievement_id as id, completed, progress FROM achievement_progress
    WHERE user_id = ? AND completed = 1
    ORDER BY achievement_id DESC LIMIT 50
  `).all(playerId).map(r => ({ id: String(r.id), completed: r.completed }));

  const availableTitles = db.prepare(`
    SELECT title_id as id, equipped, unlocked_at FROM player_titles
    WHERE player_id = ?
    ORDER BY unlocked_at DESC LIMIT 50
  `).all(playerId).map(r => ({ id: r.id, equipped: r.equipped }));

  const availableBeasts = db.prepare(`
    SELECT id, name, level, quality, attack FROM player_beasts
    WHERE player_id = ?
    ORDER BY is_active DESC, attack DESC LIMIT 50
  `).all(playerId).map(r => ({ id: r.id, name: r.name || '灵兽', level: r.level, quality: r.quality, attack: r.attack }));

  res.json({
    code: 200,
    data: {
      showcase,
      availableOptions: {
        achievements: availableAchievements,
        titles: availableTitles,
        beasts: availableBeasts,
      },
    }
  });
});

// ============================================================
// 端点 2: POST /api/showcase/equip
// 装备展柜槽位
// ============================================================
router.post('/equip', (req, res) => {
  const { slotType, slotId } = req.body;
  const playerId = getPlayerId(req);

  if (!slotType || slotId === undefined) {
    return res.json({ code: 400, message: '缺少必要参数: slotType, slotId' });
  }

  if (!SLOT_TYPES.includes(slotType)) {
    return res.json({ code: 400, message: `slotType 必须是: ${SLOT_TYPES.join(', ')}` });
  }

  // 验证玩家拥有该展示物品
  let valid = false;
  switch (slotType) {
    case 'achievement':
      valid = !!db.prepare('SELECT 1 FROM achievement_progress WHERE user_id = ? AND achievement_id = ? AND completed = 1').get(playerId, slotId);
      break;
    case 'title':
      valid = !!db.prepare('SELECT 1 FROM player_titles WHERE player_id = ? AND title_id = ?').get(playerId, slotId);
      break;
    case 'equipment':
    case 'spirit':
      valid = !!db.prepare('SELECT 1 FROM player_beasts WHERE player_id = ? AND id = ?').get(playerId, Number(slotId));
      break;
    case 'mount':
      valid = !!db.prepare('SELECT 1 FROM player_swords WHERE player_id = ? AND id = ?').get(playerId, Number(slotId));
      break;
    case 'wing':
      valid = !!db.prepare('SELECT 1 FROM player_spirit_artifacts WHERE player_id = ? AND id = ?').get(playerId, Number(slotId));
      break;
  }

  if (!valid) {
    return res.json({ code: 403, message: '您未拥有该物品，无法展示' });
  }

  // 写入/更新展柜槽位
  const existing = db.prepare('SELECT id FROM player_showcase WHERE player_id = ? AND slot_type = ?').get(playerId, slotType);
  if (existing) {
    db.prepare(`UPDATE player_showcase SET slot_id = ?, equipped_at = datetime('now') WHERE id = ?`).run(String(slotId), existing.id);
  } else {
    db.prepare('INSERT INTO player_showcase (player_id, slot_type, slot_id) VALUES (?, ?, ?)').run(playerId, slotType, String(slotId));
  }

  res.json({
    code: 200,
    data: {
      success: true,
      slotType,
      slotId: String(slotId),
    }
  });
});

// ============================================================
// 端点 3: POST /api/showcase/unequip
// 卸下展柜槽位
// ============================================================
router.post('/unequip', (req, res) => {
  const { slotType } = req.body;
  const playerId = getPlayerId(req);

  if (!slotType) {
    return res.json({ code: 400, message: '缺少必要参数: slotType' });
  }

  if (!SLOT_TYPES.includes(slotType)) {
    return res.json({ code: 400, message: `slotType 必须是: ${SLOT_TYPES.join(', ')}` });
  }

  const existing = db.prepare('SELECT id FROM player_showcase WHERE player_id = ? AND slot_type = ?').get(playerId, slotType);
  if (!existing) {
    return res.json({ code: 404, message: '该槽位没有装备物品' });
  }

  db.prepare('DELETE FROM player_showcase WHERE player_id = ? AND slot_type = ?').run(playerId, slotType);

  res.json({
    code: 200,
    data: { success: true, slotType }
  });
});

// ============================================================
// 端点 4: GET /api/showcase/player/:playerId
// 查看他人展柜
// ============================================================
router.get('/player/:playerId', (req, res) => {
  const { playerId } = req.params;
  const visitorId = getPlayerId(req);

  if (!playerId) {
    return res.json({ code: 400, message: '缺少 playerId 参数' });
  }

  const targetId = parseInt(playerId);

  // 记录访问
  try {
    const existing = db.prepare('SELECT id FROM showcase_visits WHERE player_id = ? AND visitor_id = ?').get(targetId, visitorId);
    if (existing) {
      db.prepare(`UPDATE showcase_visits SET visited_at = datetime('now') WHERE id = ?`).run(existing.id);
    } else {
      db.prepare('INSERT INTO showcase_visits (player_id, visitor_id) VALUES (?, ?)').run(targetId, visitorId);
    }
  } catch (e) { /* ignore duplicate */ }

  const showcase = getPlayerShowcase(targetId);

  res.json({
    code: 200,
    data: { showcase }
  });
});

// ============================================================
// 端点 5: GET /api/showcase/hall
// 荣誉殿堂：成就排行榜 + 稀有称号展示
// ============================================================
router.get('/hall', (req, res) => {
  const playerId = getPlayerId(req);

  // 本服成就总积分排行榜（前20名）
  // 根据 achievement_id 估算积分（achievement_id 越大越稀有）
  const topPlayers = db.prepare(`
    SELECT ap.user_id as player_id, p.level,
      SUM(ap.achievement_id) as total_points,
      COUNT(ap.id) as achievement_count
    FROM achievement_progress ap
    LEFT JOIN player p ON ap.user_id = p.id
    WHERE ap.completed = 1
    GROUP BY ap.user_id
    ORDER BY total_points DESC
    LIMIT 20
  `).all().map((row, index) => ({
    rank: index + 1,
    playerId: row.player_id,
    playerName: `玩家${row.player_id}`,
    playerLevel: row.level || 1,
    totalPoints: row.total_points || 0,
    achievementCount: row.achievement_count || 0,
  }));

  // 稀有称号展示
  const rareTitles = db.prepare(`
    SELECT st.player_id, st.title_id, st.rarity, st.acquired_at,
      CASE st.rarity
        WHEN 'legendary' THEN 4
        WHEN 'epic' THEN 3
        WHEN 'rare' THEN 2
        ELSE 1 END as rarity_order
    FROM showcase_rare_titles st
    WHERE st.rarity IN ('legendary', 'epic')
    ORDER BY rarity_order DESC, st.acquired_at ASC
    LIMIT 30
  `).all().map(row => ({
    playerId: row.player_id,
    playerName: `玩家${row.player_id}`,
    titleId: row.title_id,
    rarity: row.rarity,
    rarityName: RARE_TITLE_RARITY[row.rarity]?.name || row.rarity,
    rarityColor: RARE_TITLE_RARITY[row.rarity]?.color || '#9ca3af',
    acquiredAt: row.acquired_at,
  }));

  // 同步稀有称号
  syncRareTitles();

  res.json({
    code: 200,
    data: {
      topPlayers,
      rareTitles,
      myRank: (() => {
        const myTotal = db.prepare(`
          SELECT COALESCE(SUM(ap.achievement_id), 0) as total
          FROM achievement_progress ap WHERE ap.user_id = ? AND ap.completed = 1
        `).get(playerId)?.total || 0;
        return topPlayers.findIndex(p => p.playerId === playerId) + 1 || null;
      })(),
    }
  });
});

// 同步稀有称号
function syncRareTitles() {
  try {
    // 尝试从 player_titles 中有传说/史诗称号的玩家
    const rareOnes = db.prepare(`
      SELECT pt.player_id, pt.title_id, 'common' as rarity
      FROM player_titles pt
      WHERE pt.title_id LIKE '%legendary%' OR pt.title_id LIKE '%epic%' OR pt.title_id LIKE '%rare%'
    `).all();

    for (const row of rareOnes) {
      let rarity = 'common';
      if (row.title_id.includes('legendary')) rarity = 'legendary';
      else if (row.title_id.includes('epic')) rarity = 'epic';
      else if (row.title_id.includes('rare')) rarity = 'rare';

      const existing = db.prepare('SELECT id FROM showcase_rare_titles WHERE player_id = ? AND title_id = ?').get(row.player_id, row.title_id);
      if (!existing) {
        db.prepare('INSERT OR IGNORE INTO showcase_rare_titles (player_id, title_id, rarity) VALUES (?, ?, ?)').run(row.player_id, row.title_id, rarity);
      }
    }
  } catch (e) { /* ignore */ }
}

module.exports = router;
