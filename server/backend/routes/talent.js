// 天赋系统 - 角色成长天赋体系 REST API
const express = require('express');
const router = express.Router();
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode=WAL');
  db.pragma('busy_timeout=5000');
  initTalentTables();
} catch (err) {
  console.log('[talent] 数据库连接失败:', err.message);
  db = null;
}

// 天赋树配置 (内联，避免TS依赖)
const TALENT_TREES = [
  {
    treeId: 'combat_warrior', name: 'Warrior Path', nameCN: '战斗之道', type: 'combat',
    icon: '⚔️', unlockLevel: 1, maxPoints: 50,
    talents: [
      { talentId: 'combat_power', nameCN: '力量打击', tier: 1, maxLevel: 3, effects: [{ attr: 'attack', value: 5, isPercent: false }], icon: '⚔️' },
      { talentId: 'combat_defense', nameCN: '铁壁防御', tier: 1, maxLevel: 3, effects: [{ attr: 'defense', value: 4, isPercent: false }], icon: '🛡️' },
      { talentId: 'combat_hp', nameCN: '生命强化', tier: 1, maxLevel: 3, effects: [{ attr: 'hp', value: 50, isPercent: false }], icon: '❤️' },
      { talentId: 'combat_crit', nameCN: '暴击精通', tier: 1, maxLevel: 3, effects: [{ attr: 'critRate', value: 2, isPercent: true }], icon: '💥' },
      { talentId: 'combat_armor', nameCN: '护甲穿透', tier: 1, maxLevel: 3, effects: [{ attr: 'armorPen', value: 3, isPercent: false }], icon: '⚡' },
    ]
  },
  {
    treeId: 'cultivation_ascend', name: 'Cultivation Path', nameCN: '修炼之道', type: 'cultivation',
    icon: '🧘', unlockLevel: 1, maxPoints: 50,
    talents: [
      { talentId: 'cultivation_speed', nameCN: '修炼加速', tier: 1, maxLevel: 3, effects: [{ attr: 'cultSpeed', value: 10, isPercent: true }], icon: '⏰' },
      { talentId: 'cultivation_power', nameCN: '灵气容量', tier: 1, maxLevel: 3, effects: [{ attr: 'maxQi', value: 20, isPercent: false }], icon: '💨' },
      { talentId: 'cultivation_reflect', nameCN: '灵气护体', tier: 1, maxLevel: 3, effects: [{ attr: 'qiShield', value: 5, isPercent: false }], icon: '🔮' },
    ]
  },
  {
    treeId: 'support_lucky', name: 'Support Path', nameCN: '福运之道', type: 'support',
    icon: '🍀', unlockLevel: 5, maxPoints: 30,
    talents: [
      { talentId: 'support_luck', nameCN: '福运加成', tier: 1, maxLevel: 3, effects: [{ attr: 'luck', value: 3, isPercent: true }], icon: '🍀' },
      { talentId: 'support_drop', nameCN: '掉落加成', tier: 1, maxLevel: 3, effects: [{ attr: 'dropRate', value: 5, isPercent: true }], icon: '📦' },
      { talentId: 'support_gold', nameCN: '灵石加成', tier: 1, maxLevel: 3, effects: [{ attr: 'goldBonus', value: 5, isPercent: true }], icon: '💰' },
    ]
  },
  {
    treeId: 'special_legendary', name: 'Special Path', nameCN: '通天之道', type: 'special',
    icon: '🌟', unlockLevel: 20, maxPoints: 20,
    talents: [
      { talentId: 'special_double', nameCN: '双倍奖励', tier: 1, maxLevel: 1, effects: [{ attr: 'doubleReward', value: 1, isPercent: false }], icon: '✨' },
      { talentId: 'special_reborn', nameCN: '涅槃重生', tier: 1, maxLevel: 1, effects: [{ attr: 'reborn', value: 1, isPercent: false }], icon: '🔥' },
    ]
  }
];

// 初始化天赋表
function initTalentTables() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_talent_data (
        player_id INTEGER PRIMARY KEY,
        talent_points INTEGER NOT NULL DEFAULT 0,
        used_points INTEGER NOT NULL DEFAULT 0,
        total_points_earned INTEGER NOT NULL DEFAULT 0,
        last_update INTEGER NOT NULL,
        last_free_reset INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS player_talents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        tree_id TEXT NOT NULL,
        talent_id TEXT NOT NULL,
        level INTEGER NOT NULL DEFAULT 1,
        unlock_time INTEGER NOT NULL,
        UNIQUE(player_id, talent_id)
      );

      CREATE TABLE IF NOT EXISTS talent_trees_unlocked (
        player_id INTEGER NOT NULL,
        tree_id TEXT NOT NULL,
        unlock_time INTEGER NOT NULL,
        UNIQUE(player_id, tree_id)
      );
    `);
    console.log('[talent] 数据库表初始化完成');
  } catch (err) {
    console.log('[talent] 表初始化失败:', err.message);
  }
}

function getUserId(req) {
  const body = req.body || {};
  const query = req.query || {};
  return req.userId || body.player_id || body.userId || query.player_id || query.userId || 1;
}

function getPlayerLevel(userId) {
  if (!db) return 1;
  try {
    const user = db.prepare('SELECT level FROM Users WHERE id = ?').get(userId);
    return user ? user.level : 1;
  } catch {
    return 1;
  }
}

function getTalentPoints(playerId) {
  if (!db) return { points: 0, used: 0, totalEarned: 0 };
  try {
    const data = db.prepare('SELECT talent_points, used_points, total_points_earned FROM player_talent_data WHERE player_id = ?').get(playerId);
    return data || { talent_points: 0, used_points: 0, total_points_earned: 0 };
  } catch {
    return { talent_points: 0, used_points: 0, total_points_earned: 0 };
  }
}

function addTalentPoints(playerId, points) {
  if (!db) return;
  try {
    db.prepare(`
      INSERT INTO player_talent_data (player_id, talent_points, used_points, total_points_earned, last_update)
      VALUES (?, ?, 0, ?, ?)
      ON CONFLICT(player_id) DO UPDATE SET
        talent_points = talent_points + excluded.talent_points,
        total_points_earned = total_points_earned + excluded.talent_points,
        last_update = excluded.last_update
    `).run(playerId, points, points, Date.now());
  } catch (err) {
    console.log('[talent] addTalentPoints error:', err.message);
  }
}

function initPlayerTalents(playerId) {
  if (!db) return;
  try {
    const exists = db.prepare('SELECT 1 FROM player_talent_data WHERE player_id = ?').get(playerId);
    if (!exists) {
      // 初始天赋点 = 玩家等级
      const level = getPlayerLevel(playerId);
      db.prepare(`
        INSERT INTO player_talent_data (player_id, talent_points, used_points, total_points_earned, last_update)
        VALUES (?, ?, 0, ?, ?)
      `).run(playerId, level, level, Date.now());
    }
  } catch (err) {
    console.log('[talent] initPlayerTalents error:', err.message);
  }
}

// GET /trees - 获取所有天赋树
router.get('/trees', (req, res) => {
  const userId = getUserId(req);
  initPlayerTalents(userId);

  const playerLevel = getPlayerLevel(userId);

  // 获取已解锁的天赋树
  let unlockedTrees = [];
  if (db) {
    try {
      unlockedTrees = db.prepare('SELECT tree_id FROM talent_trees_unlocked WHERE player_id = ?').all(userId).map(r => r.tree_id);
    } catch {}
  }

  // 获取已激活的天赋
  let playerTalents = [];
  if (db) {
    try {
      playerTalents = db.prepare('SELECT talent_id, level FROM player_talents WHERE player_id = ?').all(userId);
    } catch {}
  }
  const talentMap = {};
  playerTalents.forEach(t => { talentMap[t.talent_id] = t.level; });

  const talentData = getTalentPoints(userId);

  res.json({
    success: true,
    data: {
      trees: TALENT_TREES.map(tree => ({
        treeId: tree.treeId,
        name: tree.name,
        nameCN: tree.nameCN,
        type: tree.type,
        icon: tree.icon,
        unlockLevel: tree.unlockLevel,
        maxPoints: tree.maxPoints,
        isUnlocked: unlockedTrees.includes(tree.treeId),
        canUnlock: playerLevel >= tree.unlockLevel,
        talents: tree.talents.map(t => ({
          talentId: t.talentId,
          nameCN: t.nameCN,
          tier: t.tier,
          maxLevel: t.maxLevel,
          currentLevel: talentMap[t.talentId] || 0,
          effects: t.effects,
          icon: t.icon
        }))
      })),
      talentPoints: talentData.talent_points || 0,
      usedPoints: talentData.used_points || 0,
      totalEarned: talentData.total_points_earned || 0
    }
  });
});

// GET /player/:playerId - 获取玩家天赋数据
router.get('/player/:playerId', (req, res) => {
  const playerId = parseInt(req.params.playerId) || 1;
  initPlayerTalents(playerId);

  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    const data = db.prepare('SELECT talent_points, used_points, total_points_earned FROM player_talent_data WHERE player_id = ?').get(playerId);
    const talents = db.prepare('SELECT tree_id, talent_id, level, unlock_time FROM player_talents WHERE player_id = ?').all(playerId);
    const trees = db.prepare('SELECT tree_id, unlock_time FROM talent_trees_unlocked WHERE player_id = ?').all(playerId);

    // 计算属性加成
    const bonuses = { attack: 0, defense: 0, hp: 0, critRate: 0, cultSpeed: 10, maxQi: 0, luck: 0, dropRate: 0, goldBonus: 0 };
    for (const t of talents) {
      const tree = TALENT_TREES.find(tr => tr.treeId === t.tree_id);
      if (!tree) continue;
      const talentDef = tree.talents.find(tal => tal.talentId === t.talent_id);
      if (!talentDef) continue;
      for (const eff of talentDef.effects) {
        if (bonuses.hasOwnProperty(eff.attr)) {
          bonuses[eff.attr] += eff.value * t.level;
        }
      }
    }

    res.json({
      success: true,
      data: {
        talentPoints: data ? data.talent_points : 0,
        usedPoints: data ? data.used_points : 0,
        totalEarned: data ? data.total_points_earned : 0,
        talents: talents.map(t => ({ treeId: t.tree_id, talentId: t.talent_id, level: t.level, unlockTime: t.unlock_time })),
        unlockedTrees: trees.map(t => ({ treeId: t.tree_id, unlockTime: t.unlock_time })),
        bonuses
      }
    });
  } catch (err) {
    console.log('[talent] GET /player error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// POST /unlock-tree - 解锁天赋树
router.post('/unlock-tree', (req, res) => {
  const userId = getUserId(req);
  const { tree_id } = req.body;

  if (!tree_id) return res.json({ success: false, message: '缺少tree_id' });
  initPlayerTalents(userId);

  const playerLevel = getPlayerLevel(userId);
  const tree = TALENT_TREES.find(t => t.treeId === tree_id);
  if (!tree) return res.json({ success: false, message: '天赋树不存在' });

  if (db) {
    try {
      const existing = db.prepare('SELECT 1 FROM talent_trees_unlocked WHERE player_id = ? AND tree_id = ?').get(userId, tree_id);
      if (existing) return res.json({ success: false, message: '天赋树已解锁' });

      if (playerLevel < tree.unlockLevel) {
        return res.json({ success: false, message: `需要等级${tree.unlockLevel}才能解锁` });
      }

      db.prepare('INSERT INTO talent_trees_unlocked (player_id, tree_id, unlock_time) VALUES (?, ?, ?)').run(userId, tree_id, Date.now());
      res.json({ success: true, data: { treeId: tree_id, message: `天赋树「${tree.nameCN}」已解锁` } });
    } catch (err) {
      res.json({ success: false, message: err.message });
    }
  } else {
    res.json({ success: false, message: '数据库未连接' });
  }
});

// POST /learn - 学习天赋
router.post('/learn', (req, res) => {
  const userId = getUserId(req);
  const { talent_id, tree_id } = req.body;

  if (!talent_id || !tree_id) return res.json({ success: false, message: '缺少talent_id或tree_id' });
  initPlayerTalents(userId);

  const tree = TALENT_TREES.find(t => t.treeId === tree_id);
  if (!tree) return res.json({ success: false, message: '天赋树不存在' });
  const talentDef = tree.talents.find(t => t.talentId === talent_id);
  if (!talentDef) return res.json({ success: false, message: '天赋不存在' });

  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    // 检查天赋树是否已解锁
    const treeUnlocked = db.prepare('SELECT 1 FROM talent_trees_unlocked WHERE player_id = ? AND tree_id = ?').get(userId, tree_id);
    if (!treeUnlocked) return res.json({ success: false, message: '请先解锁天赋树' });

    // 获取当前天赋等级
    const current = db.prepare('SELECT level FROM player_talents WHERE player_id = ? AND talent_id = ?').get(userId, talent_id);
    const currentLevel = current ? current.level : 0;

    if (currentLevel >= talentDef.maxLevel) {
      return res.json({ success: false, message: `天赋已满级(${talentDef.maxLevel}级)` });
    }

    // 检查天赋点
    const talentData = getTalentPoints(userId);
    if ((talentData.talent_points || 0) < 1) {
      return res.json({ success: false, message: '天赋点不足' });
    }

    // 消耗天赋点
    db.prepare('UPDATE player_talent_data SET talent_points = talent_points - 1, used_points = used_points + 1, last_update = ? WHERE player_id = ?').run(Date.now(), userId);

    // 加天赋等级
    if (current) {
      db.prepare('UPDATE player_talents SET level = level + 1 WHERE player_id = ? AND talent_id = ?').run(userId, talent_id);
    } else {
      db.prepare('INSERT INTO player_talents (player_id, tree_id, talent_id, level, unlock_time) VALUES (?, ?, ?, 1, ?)').run(userId, tree_id, talent_id, Date.now());
    }

    // 计算新增的属性加成
    const newBonuses = {};
    for (const eff of talentDef.effects) {
      newBonuses[eff.attr] = eff.value;
    }

    const newData = getTalentPoints(userId);
    res.json({
      success: true,
      data: {
        talentId: talent_id,
        treeId: tree_id,
        newLevel: currentLevel + 1,
        talentPoints: newData.talent_points || 0,
        usedPoints: newData.used_points || 0,
        newBonuses,
        message: `天赋「${talentDef.nameCN}」升至${currentLevel + 1}级`
      }
    });
  } catch (err) {
    console.log('[talent] POST /learn error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// POST /reset - 重置天赋 (每周免费1次)
router.post('/reset', (req, res) => {
  const userId = getUserId(req);
  initPlayerTalents(userId);

  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    const player = db.prepare('SELECT last_free_reset FROM player_talent_data WHERE player_id = ?').get(userId);
    if (!player) return res.json({ success: false, message: '玩家数据不存在' });

    const now = Date.now();
    const oneWeek = 7 * 24 * 3600 * 1000;
    const canFreeReset = !player.last_free_reset || (now - player.last_free_reset) > oneWeek;

    const talents = db.prepare('SELECT talent_id, level FROM player_talents WHERE player_id = ?').all(userId);
    if (talents.length === 0) return res.json({ success: false, message: '没有可重置的天赋' });

    // 统计已用天赋点
    let refundPoints = 0;
    for (const t of talents) {
      refundPoints += t.level;
    }

    if (!canFreeReset) {
      // 非免费重置需要花费灵石 (50灵石/点)
      const cost = refundPoints * 50;
      const userInfo = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(userId);
      if (!userInfo || userInfo.lingshi < cost) {
        return res.json({ success: false, message: `灵石不足，需要${cost}灵石` });
      }
      db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(cost, userId);
    }

    // 删除所有天赋
    db.prepare('DELETE FROM player_talents WHERE player_id = ?').run(userId);
    // 返还天赋点
    db.prepare('UPDATE player_talent_data SET talent_points = talent_points + ?, used_points = 0, last_free_reset = ? WHERE player_id = ?').run(refundPoints, canFreeReset ? now : player.last_free_reset, userId);

    const data = getTalentPoints(userId);
    res.json({
      success: true,
      data: {
        refundedPoints: refundPoints,
        freeReset: canFreeReset,
        cost: canFreeReset ? 0 : refundPoints * 50,
        talentPoints: data.talent_points || 0,
        message: canFreeReset ? `天赋已重置，返还${refundPoints}点（本周免费）` : `天赋已重置，返还${refundPoints}点，花费${refundPoints * 50}灵石`
      }
    });
  } catch (err) {
    console.log('[talent] POST /reset error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// POST /add-points - 给予玩家天赋点 (升级奖励)
router.post('/add-points', (req, res) => {
  const userId = getUserId(req);
  const { points } = req.body;
  const pts = Math.max(1, parseInt(points) || 1);
  initPlayerTalents(userId);
  addTalentPoints(userId, pts);
  const data = getTalentPoints(userId);
  res.json({ success: true, data: { talentPoints: data.talent_points || 0, added: pts } });
});

module.exports = router;
