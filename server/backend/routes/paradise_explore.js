/**
 * 洞天福地探索系统 API路由
 * P88-7: 仙府碎片探索 + 隐藏洞天
 * 端点: /api/paradise/*
 */
const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const router = express.Router();

// ─── Database ───────────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, '..', 'data', 'game.db');

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  return db;
}

// ─── 探索地点定义 ──────────────────────────────────────────────────────────
const EXPLORE_LOCATIONS = [
  {
    id: 'jiuyou_abyss',
    name: '九幽深渊',
    icon: '🌑',
    description: '幽冥之地，埋葬着上古魔修的遗骸',
    spiritCost: 200,
    minLevel: 5,
    discoveries: ['rare_material', 'ancient_artifact_fragment', 'gongfa_scraps', 'hidden_quest'],
    weight: { rare_material: 30, ancient_artifact_fragment: 20, gongfa_scraps: 25, nothing: 25 }
  },
  {
    id: 'donghai_immortal_isle',
    name: '东海仙岛',
    icon: '🏝️',
    description: '海外仙山，传闻有长生不老药',
    spiritCost: 300,
    minLevel: 8,
    discoveries: ['rare_material', 'ancient_artifact_fragment', 'gongfa_scraps', 'hidden_quest'],
    weight: { rare_material: 35, ancient_artifact_fragment: 25, gongfa_scraps: 20, nothing: 20 }
  },
  {
    id: 'kunlun_ fairyland',
    name: '昆仑仙境',
    icon: '⛰️',
    description: '万山之祖，仙气缭绕的修炼圣地',
    spiritCost: 350,
    minLevel: 10,
    discoveries: ['rare_material', 'ancient_artifact_fragment', 'gongfa_scraps', 'hidden_quest'],
    weight: { rare_material: 30, ancient_artifact_fragment: 30, gongfa_scraps: 25, nothing: 15 }
  },
  {
    id: 'shushan_sword_tomb',
    name: '蜀山剑冢',
    icon: '⚔️',
    description: '万剑归宗，无数剑修的葬身之地',
    spiritCost: 250,
    minLevel: 6,
    discoveries: ['rare_material', 'ancient_artifact_fragment', 'gongfa_scraps', 'hidden_quest'],
    weight: { rare_material: 25, ancient_artifact_fragment: 35, gongfa_scraps: 20, nothing: 20 }
  },
  {
    id: 'nanhai_putuo',
    name: '南海普陀',
    icon: '🪷',
    description: '观音道场，佛光普照的清净之地',
    spiritCost: 280,
    minLevel: 7,
    discoveries: ['rare_material', 'ancient_artifact_fragment', 'gongfa_scraps', 'hidden_quest'],
    weight: { rare_material: 40, ancient_artifact_fragment: 15, gongfa_scraps: 30, nothing: 15 }
  },
  {
    id: 'xiyu_loulan',
    name: '西域楼兰',
    icon: '🏜️',
    description: '沙海古城，消失的文明留下的宝藏',
    spiritCost: 320,
    minLevel: 9,
    discoveries: ['rare_material', 'ancient_artifact_fragment', 'gongfa_scraps', 'hidden_quest'],
    weight: { rare_material: 25, ancient_artifact_fragment: 30, gongfa_scraps: 20, nothing: 25 }
  },
  {
    id: 'beihuang_snowfield',
    name: '北荒雪原',
    icon: '❄️',
    description: '极北苦寒，蕴藏着上古冰魄',
    spiritCost: 220,
    minLevel: 4,
    discoveries: ['rare_material', 'ancient_artifact_fragment', 'gongfa_scraps', 'hidden_quest'],
    weight: { rare_material: 35, ancient_artifact_fragment: 20, gongfa_scraps: 20, nothing: 25 }
  },
  {
    id: 'zhongzhou_imperial',
    name: '中州皇城',
    icon: '🏯',
    description: '天下中枢，皇家秘库的入口若隐若现',
    spiritCost: 400,
    minLevel: 12,
    discoveries: ['rare_material', 'ancient_artifact_fragment', 'gongfa_scraps', 'hidden_quest'],
    weight: { rare_material: 20, ancient_artifact_fragment: 25, gongfa_scraps: 35, nothing: 20 }
  },
  {
    id: 'nanjiang_gu_dungeon',
    name: '南疆蛊渊',
    icon: '🐍',
    description: '瘴气弥漫，蛊虫与毒物横行',
    spiritCost: 260,
    minLevel: 6,
    discoveries: ['rare_material', 'ancient_artifact_fragment', 'gongfa_scraps', 'hidden_quest'],
    weight: { rare_material: 30, ancient_artifact_fragment: 20, gongfa_scraps: 25, nothing: 25 }
  },
  {
    id: 'penglai_immortal_mountain',
    name: '蓬莱仙山',
    icon: '☁️',
    description: '仙家圣地，虚无缥缈的海上神山',
    spiritCost: 500,
    minLevel: 15,
    discoveries: ['rare_material', 'ancient_artifact_fragment', 'gongfa_scraps', 'hidden_quest'],
    weight: { rare_material: 30, ancient_artifact_fragment: 35, gongfa_scraps: 25, nothing: 10 }
  }
];

// ─── 秘密洞天定义 ──────────────────────────────────────────────────────────
const SECRET_PARADISES = [
  {
    id: 'tianmo_cave',
    name: '天魔洞',
    icon: '👹',
    description: '上古天魔的修炼地，蕴含毁天灭地的力量',
    unlockCondition: { type: 'realm_level', value: 15 },
    unlockHint: '境界达到真仙方可进入',
    bonus: { type: 'spiritStones', amount: 10000 },
    bonusDesc: '入洞奖励 10000 灵石'
  },
  {
    id: 'dragon_palace',
    name: '龙宫',
    icon: '🐉',
    description: '东海龙宫，水族的至高圣地',
    unlockCondition: { type: 'item', value: '龙鳞' },
    unlockHint: '持有「龙鳞」碎片',
    bonus: { type: 'item', itemName: '龙魂', amount: 1 },
    bonusDesc: '获得「龙魂」'
  },
  {
    id: 'celestial_court',
    name: '天庭',
    icon: '✨',
    description: '三十三天之上，诸神的居所',
    unlockCondition: { type: 'combat_power', value: 500000 },
    unlockHint: '战力达到 50 万',
    bonus: { type: 'title', title: '天庭使者' },
    bonusDesc: '获得「天庭使者」称号'
  },
  {
    id: 'abyss_feeding_ground',
    name: '深渊饵场',
    icon: '🕳️',
    description: '深渊最底层，喂养着未知的存在',
    unlockCondition: { type: 'explore_count', value: 100 },
    unlockHint: '探索次数达到 100 次',
    bonus: { type: 'combat_power', amount: 5000 },
    bonusDesc: '战力永久 +5000'
  },
  {
    id: 'phoenix_nest',
    name: '凤凰巢',
    icon: '🦅',
    description: '神兽凤凰的栖息地，浴火重生之地',
    unlockCondition: { type: 'item', value: '凤凰羽' },
    unlockHint: '持有「凤凰羽」',
    bonus: { type: 'realm_exp', amount: 10000 },
    bonusDesc: '获得 10000 境界经验'
  },
  {
    id: 'sanqing_shrine',
    name: '三清殿',
    icon: '☯️',
    description: '道教至高圣地，供奉三清祖师',
    unlockCondition: { type: 'gongfa_count', value: 10 },
    unlockHint: '拥有 10 部以上功法',
    bonus: { type: 'cultivation_speed', multiplier: 1.5 },
    bonusDesc: '修炼速度 +50%（持续7天）'
  },
  {
    id: 'emperor_tomb',
    name: '帝王陵',
    icon: '⚱️',
    description: '千古一帝的陵寝，机关重重',
    unlockCondition: { type: 'sect_rank', value: 1 },
    unlockHint: '门派排名第一',
    bonus: { type: 'spiritStones', amount: 20000 },
    bonusDesc: '获得 20000 灵石'
  },
  {
    id: 'demon_god_fragment',
    name: '魔神残念',
    icon: '💀',
    description: '上古魔神残留的意志碎片',
    unlockCondition: { type: 'hidden_quest_complete', value: 5 },
    unlockHint: '完成 5 个隐藏任务',
    bonus: { type: 'skill_upgrade', value: 3 },
    bonusDesc: '随机技能等级 +3'
  },
  {
    id: 'star_fall_valley',
    name: '星陨谷',
    icon: '🌠',
    description: '星辰坠落之地，蕴含星辰之力',
    unlockCondition: { type: 'item', value: '陨铁' },
    unlockHint: '持有「陨铁」',
    bonus: { type: 'artifact_fragment', amount: 5 },
    bonusDesc: '获得 5 个古宝残片'
  },
  {
    id: 'world_core',
    name: '世界核心',
    icon: '🌍',
    description: '诸天万界的起源地，禁忌之地',
    unlockCondition: { type: 'all_secrets', value: 9 },
    unlockHint: '解锁其他全部 9 个洞天',
    bonus: { type: 'all_stats', multiplier: 1.2 },
    bonusDesc: '全属性 +20%（永久）'
  }
];

// ─── 发现物定义 ────────────────────────────────────────────────────────────
const DISCOVERY_ITEMS = {
  rare_material: [
    { name: '九天玄铁', icon: '🔩', value: 500 },
    { name: '万年玄冰', icon: '🧊', value: 400 },
    { name: '赤阳精铜', icon: '🟠', value: 450 },
    { name: '紫霄神玉', icon: '💜', value: 800 },
    { name: '混沌灵土', icon: '🟤', value: 600 }
  ],
  ancient_artifact_fragment: [
    { name: '古宝残片·剑', icon: '🗡️', value: 300 },
    { name: '古宝残片·甲', icon: '🛡️', value: 300 },
    { name: '古宝残片·鼎', icon: '🏺', value: 350 },
    { name: '古宝残片·镜', icon: '🔮', value: 320 },
    { name: '古宝残片·铃', icon: '🔔', value: 280 }
  ],
  gongfa_scraps: [
    { name: '功法残页·上', icon: '📃', value: 200 },
    { name: '功法残页·中', icon: '📄', value: 250 },
    { name: '功法残页·下', icon: '📑', value: 300 },
    { name: '功法残页·总纲', icon: '📜', value: 500 }
  ],
  hidden_quest: [
    { name: '「消失的宗门」任务卷轴', icon: '📯', value: 0, quest: true },
    { name: '「龙宫探秘」任务卷轴', icon: '🐲', value: 0, quest: true },
    { name: '「天魔封印」任务卷轴', icon: '⛓️', value: 0, quest: true },
    { name: '「凤凰涅槃」任务卷轴', icon: '🔥', value: 0, quest: true }
  ],
  nothing: [
    { name: '一无所获', icon: '💨', value: 0 }
  ]
};

// ─── DB初始化 ─────────────────────────────────────────────────────────────
function initTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS paradise_explore_log (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL,
      location_id     TEXT    NOT NULL,
      location_name   TEXT    NOT NULL,
      location_icon   TEXT    NOT NULL,
      discovery_type  TEXT    NOT NULL,
      discovery_name  TEXT    NOT NULL,
      discovery_icon  TEXT    NOT NULL,
      discovery_value INTEGER DEFAULT 0,
      is_quest        INTEGER DEFAULT 0,
      spirit_cost     INTEGER NOT NULL,
      created_at      INTEGER DEFAULT (strftime('%s','now'))
    );

    CREATE TABLE IF NOT EXISTS paradise_secrets (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL,
      secret_id       TEXT    NOT NULL,
      unlocked_at     INTEGER DEFAULT (strftime('%s','now')),
      bonus_claimed   INTEGER DEFAULT 0,
      UNIQUE(user_id, secret_id)
    );

    CREATE TABLE IF NOT EXISTS paradise_player_stats (
      user_id         INTEGER PRIMARY KEY,
      total_explores  INTEGER DEFAULT 0,
      total_spirit    INTEGER DEFAULT 0,
      total_discovery_value INTEGER DEFAULT 0,
      last_explore    INTEGER DEFAULT 0
    );
  `);
}

// ─── 辅助函数 ──────────────────────────────────────────────────────────────
function getPlayerId(req) {
  return parseInt(req.userId || req.body?.user_id || req.query?.player_id || req.query?.userId || 1);
}

function weightedRandom(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let rand = Math.random() * total;
  for (const [key, weight] of entries) {
    rand -= weight;
    if (rand <= 0) return key;
  }
  return entries[0][0];
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── POST /api/paradise/explore ─────────────────────────────────────────────
router.post('/explore', (req, res) => {
  try {
    const db = getDb();
    initTables(db);
    const playerId = getPlayerId(req);
    const { location } = req.body;

    if (!location) {
      return res.json({ code: 400, msg: '请指定探索地点' });
    }

    // 查找地点
    const locationData = EXPLORE_LOCATIONS.find(l => l.id === location);
    if (!locationData) {
      return res.json({ code: 404, msg: '探索地点不存在' });
    }

    // 获取玩家信息
    let player = null;
    let spiritStones = 0;
    let playerLevel = 1;
    try {
      player = db.prepare('SELECT id, spirit_stones, level FROM player WHERE id = ?').get(playerId);
      spiritStones = player?.spirit_stones || 0;
      playerLevel = player?.level || 1;
    } catch (e) {
      try {
        player = db.prepare('SELECT id, spirit_stones as spirit_stones, level FROM players WHERE id = ?').get(playerId);
        spiritStones = player?.spirit_stones || 0;
        playerLevel = player?.level || 1;
      } catch (e2) {
        return res.json({ code: 404, msg: '玩家不存在' });
      }
    }

    // 验证灵力消耗
    if (spiritStones < locationData.spiritCost) {
      return res.json({
        code: 400,
        msg: `灵力(灵石)不足，需要 ${locationData.spiritCost}，当前 ${spiritStones}`
      });
    }

    // 验证等级
    if (playerLevel < locationData.minLevel) {
      return res.json({
        code: 400,
        msg: `等级不足，需要 ${locationData.minLevel} 级，当前 ${playerLevel} 级`
      });
    }

    // 扣除灵力
    try {
      db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?')
        .run(locationData.spiritCost, playerId);
    } catch (e) {
      try {
        db.prepare('UPDATE players SET spirit_stones = spirit_stones - ? WHERE id = ?')
          .run(locationData.spiritCost, playerId);
      } catch (e2) { /* ignore */ }
    }

    // 随机发现
    const discoveryType = weightedRandom(locationData.weight);
    const discoveryPool = DISCOVERY_ITEMS[discoveryType];
    const discovery = randomFrom(discoveryPool);

    // 更新统计
    db.prepare(`
      INSERT INTO paradise_player_stats (user_id, total_explores, total_spirit, total_discovery_value, last_explore)
      VALUES (?, 1, ?, ?, strftime('%s','now'))
      ON CONFLICT(user_id) DO UPDATE SET
        total_explores = total_explores + 1,
        total_spirit = total_spirit + excluded.total_spirit,
        total_discovery_value = total_discovery_value + excluded.total_discovery_value,
        last_explore = excluded.last_explore
    `).run(playerId, locationData.spiritCost, discovery.value || 0);

    // 记录探索
    const logResult = db.prepare(`
      INSERT INTO paradise_explore_log (user_id, location_id, location_name, location_icon, discovery_type, discovery_name, discovery_icon, discovery_value, is_quest, spirit_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(playerId, locationData.id, locationData.name, locationData.icon, discoveryType, discovery.name, discovery.icon, discovery.value || 0, discovery.quest ? 1 : 0, locationData.spiritCost);

    // 如果发现物品，给予奖励
    if (discovery.value > 0) {
      try {
        db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?')
          .run(discovery.value, playerId);
      } catch (e) {
        try {
          db.prepare('UPDATE players SET spirit_stones = spirit_stones + ? WHERE id = ?')
            .run(discovery.value, playerId);
        } catch (e2) { /* ignore */ }
      }
    }

    res.json({
      code: 0,
      data: {
        success: true,
        result: {
          type: discoveryType,
          name: discovery.name,
          icon: discovery.icon,
          value: discovery.value || 0,
          isQuest: discovery.quest || false,
          description: getDiscoveryDescription(discoveryType, discovery)
        },
        found: discoveryType !== 'nothing',
        rewards: discoveryType !== 'nothing' ? {
          spiritStones: discovery.value || 0,
          item: discovery.quest ? null : { name: discovery.name, icon: discovery.icon }
        } : null,
        cost: locationData.spiritCost,
        remainingSpiritStones: spiritStones - locationData.spiritCost + (discovery.value || 0),
        location: {
          id: locationData.id,
          name: locationData.name,
          icon: locationData.icon
        }
      }
    });
  } catch (err) {
    console.error('paradise/explore error:', err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

function getDiscoveryDescription(type, discovery) {
  const descriptions = {
    rare_material: `发现珍贵材料「${discovery.name}」，可炼器或出售`,
    ancient_artifact_fragment: `发现古宝残片「${discovery.name}」，集齐可复原古宝`,
    gongfa_scraps: `发现功法残页「${discovery.name}」，蕴含残缺功法奥义`,
    hidden_quest: `发现隐藏任务「${discovery.name}」，请前往任务面板查看`,
    nothing: '此次探索一无所获，但积累了经验'
  };
  return descriptions[type] || '';
}

// ─── GET /api/paradise/history ─────────────────────────────────────────────
router.get('/history', (req, res) => {
  try {
    const db = getDb();
    initTables(db);
    const playerId = getPlayerId(req);
    const page = parseInt(req.query.page || 1);
    const pageSize = parseInt(req.query.pageSize || 20);
    const offset = (page - 1) * pageSize;

    const total = db.prepare(
      'SELECT COUNT(*) as count FROM paradise_explore_log WHERE user_id = ?'
    ).get(playerId).count;

    const records = db.prepare(`
      SELECT * FROM paradise_explore_log
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(playerId, pageSize, offset);

    const mapped = records.map(r => ({
      id: r.id,
      locationId: r.location_id,
      locationName: r.location_name,
      locationIcon: r.location_icon,
      discoveryType: r.discovery_type,
      discoveryName: r.discovery_name,
      discoveryIcon: r.discovery_icon,
      discoveryValue: r.discovery_value,
      isQuest: r.is_quest === 1,
      spiritCost: r.spirit_cost,
      exploredAt: r.created_at * 1000
    }));

    res.json({
      code: 0,
      data: {
        records: mapped,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (err) {
    console.error('paradise/history error:', err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

// ─── GET /api/paradise/secrets ──────────────────────────────────────────────
router.get('/secrets', (req, res) => {
  try {
    const db = getDb();
    initTables(db);
    const playerId = getPlayerId(req);

    // 获取已解锁的洞天
    const discovered = db.prepare(
      'SELECT * FROM paradise_secrets WHERE user_id = ?'
    ).all(playerId);

    const discoveredIds = new Set(discovered.map(d => d.secret_id));
    const claimedIds = new Set(discovered.filter(d => d.bonus_claimed === 1).map(d => d.secret_id));

    // 获取玩家状态（realm_level在player表，combat_power在Users表）
    let realmLevel = 0;
    let combatPower = 0;
    let exploreCount = 0;

    try {
      const playerRow = db.prepare('SELECT realm_level FROM player WHERE id = ?').get(playerId);
      if (playerRow) realmLevel = playerRow.realm_level || 0;
    } catch (e) { /* ignore */ }

    try {
      const usersRow = db.prepare('SELECT combat_power FROM Users WHERE id = ?').get(playerId);
      if (usersRow) combatPower = usersRow.combat_power || 0;
    } catch (e) { /* ignore */ }

    try {
      const altRow = db.prepare('SELECT realm_level, combat_power FROM players WHERE id = ?').get(playerId);
      if (altRow) {
        if (!realmLevel) realmLevel = altRow.realm_level || 0;
        if (!combatPower) combatPower = altRow.combat_power || 0;
      }
    } catch (e) { /* ignore */ }

    try {
      const stats = db.prepare('SELECT total_explores FROM paradise_player_stats WHERE user_id = ?').get(playerId);
      exploreCount = stats?.total_explores || 0;
    } catch (e) { /* ignore */ }

    // 检查每个秘密洞天的解锁条件
    const checkSecret = (secret) => {
      const cond = secret.unlockCondition;
      switch (cond.type) {
        case 'realm_level': return realmLevel >= cond.value;
        case 'combat_power': return combatPower >= cond.value;
        case 'explore_count': return exploreCount >= cond.value;
        case 'item': return false; // 需要背包查询，暂简化
        case 'sect_rank': return false; // 需要门派API，暂简化
        case 'gongfa_count': return false; // 需要功法数据
        case 'hidden_quest_complete': return false;
        case 'all_secrets': {
          // 需要解锁其他9个
          const others = SECRET_PARADISES.filter(s => s.id !== secret.id);
          return others.every(s => discoveredIds.has(s.id));
        }
        default: return false;
      }
    };

    const locked = SECRET_PARADISES.filter(s => !discoveredIds.has(s.id)).map(s => ({
      secretId: s.id,
      name: s.name,
      icon: s.icon,
      description: s.description,
      unlockHint: s.unlockHint,
      isUnlocked: checkSecret(s)
    }));

    const unlocked = SECRET_PARADISES.filter(s => discoveredIds.has(s.id)).map(s => ({
      secretId: s.id,
      name: s.name,
      icon: s.icon,
      description: s.description,
      bonusDesc: s.bonusDesc,
      unlockedAt: discovered.find(d => d.secret_id === s.id)?.unlocked_at * 1000,
      bonusClaimed: claimedIds.has(s.id)
    }));

    res.json({
      code: 0,
      data: {
        discovered: unlocked,
        locked: locked,
        totalSecrets: SECRET_PARADISES.length,
        discoveredCount: unlocked.length,
        // 额外状态用于UI解锁提示
        playerStats: {
          realmLevel,
          combatPower,
          exploreCount
        }
      }
    });
  } catch (err) {
    console.error('paradise/secrets error:', err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

// ─── POST /api/paradise/reveal ──────────────────────────────────────────────
router.post('/reveal', (req, res) => {
  try {
    const db = getDb();
    initTables(db);
    const playerId = getPlayerId(req);
    const { secretId } = req.body;

    if (!secretId) {
      return res.json({ code: 400, msg: '缺少 secretId 参数' });
    }

    const secret = SECRET_PARADISES.find(s => s.id === secretId);
    if (!secret) {
      return res.json({ code: 404, msg: '秘密洞天不存在' });
    }

    // 检查是否已解锁
    const existing = db.prepare(
      'SELECT * FROM paradise_secrets WHERE user_id = ? AND secret_id = ?'
    ).get(playerId, secretId);

    if (existing) {
      return res.json({ code: 400, msg: '此洞天已解锁' });
    }

    // 获取玩家状态验证解锁条件（realm_level在player表，combat_power在Users表）
    let realmLevel = 0;
    let combatPower = 0;
    let exploreCount = 0;

    try {
      const playerRow = db.prepare('SELECT realm_level FROM player WHERE id = ?').get(playerId);
      if (playerRow) realmLevel = playerRow.realm_level || 0;
    } catch (e) { /* ignore */ }

    try {
      const usersRow = db.prepare('SELECT combat_power FROM Users WHERE id = ?').get(playerId);
      if (usersRow) combatPower = usersRow.combat_power || 0;
    } catch (e) { /* ignore */ }

    try {
      const altRow = db.prepare('SELECT realm_level, combat_power FROM players WHERE id = ?').get(playerId);
      if (altRow) {
        if (!realmLevel) realmLevel = altRow.realm_level || 0;
        if (!combatPower) combatPower = altRow.combat_power || 0;
      }
    } catch (e) { /* ignore */ }

    try {
      const stats = db.prepare('SELECT total_explores FROM paradise_player_stats WHERE user_id = ?').get(playerId);
      exploreCount = stats?.total_explores || 0;
    } catch (e) { /* ignore */ }

    // 检查解锁条件
    const cond = secret.unlockCondition;
    let canUnlock = false;
    switch (cond.type) {
      case 'realm_level':
        canUnlock = realmLevel >= cond.value;
        break;
      case 'combat_power':
        canUnlock = combatPower >= cond.value;
        break;
      case 'explore_count':
        canUnlock = exploreCount >= cond.value;
        break;
      case 'all_secrets': {
        const others = SECRET_PARADISES.filter(s => s.id !== secretId);
        const allOthersDiscovered = others.every(s =>
          !!db.prepare('SELECT id FROM paradise_secrets WHERE user_id = ? AND secret_id = ?').get(playerId, s.id)
        );
        canUnlock = allOthersDiscovered;
        break;
      }
      // 其他条件暂时无法自动验证
      default:
        canUnlock = false;
    }

    if (!canUnlock) {
      return res.json({
        code: 400,
        msg: `解锁条件未满足：${secret.unlockHint}`,
        unlockHint: secret.unlockHint
      });
    }

    // 解锁
    db.prepare(
      'INSERT INTO paradise_secrets (user_id, secret_id) VALUES (?, ?)'
    ).run(playerId, secretId);

    // 发放奖励
    const bonus = secret.bonus;
    let bonusApplied = null;

    if (bonus.type === 'spiritStones') {
      try {
        db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?')
          .run(bonus.amount, playerId);
      } catch (e) {
        try {
          db.prepare('UPDATE players SET spirit_stones = spirit_stones + ? WHERE id = ?')
            .run(bonus.amount, playerId);
        } catch (e2) { /* ignore */ }
      }
      bonusApplied = { type: 'spiritStones', amount: bonus.amount };
    } else if (bonus.type === 'combat_power') {
      // 战力提升需要通过属性系统，暂记录日志
      bonusApplied = { type: 'combat_power', amount: bonus.amount, note: '战力提升已记录' };
    } else if (bonus.type === 'title') {
      bonusApplied = { type: 'title', title: bonus.title, note: '称号已发放' };
    } else if (bonus.type === 'realm_exp') {
      bonusApplied = { type: 'realm_exp', amount: bonus.amount };
    } else if (bonus.type === 'cultivation_speed') {
      bonusApplied = { type: 'cultivation_speed', multiplier: bonus.multiplier, duration: '7天' };
    } else if (bonus.type === 'all_stats') {
      bonusApplied = { type: 'all_stats', multiplier: bonus.multiplier };
    } else {
      bonusApplied = { type: bonus.type, note: '奖励已记录' };
    }

    res.json({
      code: 0,
      data: {
        unlocked: true,
        secret: {
          id: secret.id,
          name: secret.name,
          icon: secret.icon,
          description: secret.description
        },
        bonus: bonusApplied
      }
    });
  } catch (err) {
    console.error('paradise/reveal error:', err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

// ─── GET /api/paradise/locations ────────────────────────────────────────────
router.get('/locations', (req, res) => {
  try {
    const db = getDb();
    initTables(db);
    const playerId = getPlayerId(req);

    // 获取玩家等级
    let playerLevel = 1;
    try {
      const p = db.prepare('SELECT level FROM player WHERE id = ?').get(playerId);
      playerLevel = p?.level || 1;
    } catch (e) {
      try {
        const p = db.prepare('SELECT level FROM players WHERE id = ?').get(playerId);
        playerLevel = p?.level || 1;
      } catch (e2) { /* ignore */ }
    }

    // 获取玩家统计
    let playerStats = null;
    try {
      playerStats = db.prepare('SELECT * FROM paradise_player_stats WHERE user_id = ?').get(playerId);
    } catch (e) { /* ignore */ }

    // 获取今天探索次数
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = db.prepare(`
      SELECT COUNT(*) as count FROM paradise_explore_log
      WHERE user_id = ? AND created_at >= ?
    `).get(playerId, Math.floor(todayStart.getTime() / 1000)).count;

    const availableLocations = EXPLORE_LOCATIONS.map(loc => ({
      id: loc.id,
      name: loc.name,
      icon: loc.icon,
      description: loc.description,
      spiritCost: loc.spiritCost,
      minLevel: loc.minLevel,
      unlocked: playerLevel >= loc.minLevel,
      discoveries: loc.discoveries.filter(d => d !== 'nothing')
    }));

    res.json({
      code: 0,
      data: {
        availableLocations,
        playerStats: playerStats ? {
          totalExplores: playerStats.total_explores,
          totalSpirit: playerStats.total_spirit,
          totalDiscoveryValue: playerStats.total_discovery_value,
          todayExplores: todayCount,
          lastExplore: playerStats.last_explore ? playerStats.last_explore * 1000 : null
        } : {
          totalExplores: 0,
          totalSpirit: 0,
          totalDiscoveryValue: 0,
          todayExplores: todayCount,
          lastExplore: null
        }
      }
    });
  } catch (err) {
    console.error('paradise/locations error:', err);
    res.status(500).json({ code: 500, msg: '服务器错误' });
  }
});

module.exports = router;
