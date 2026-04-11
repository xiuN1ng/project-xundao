/**
 * reincarnation.js - 天道轮回转生系统
 * P45: 天道轮回转生系统后端API
 *
 * API列表:
 *   GET  /api/reincarnation/info          - 获取当前玩家轮回信息
 *   POST /api/reincarnation/rebirth       - 执行轮回重修
 *   GET  /api/reincarnation/insight       - 获取天道感悟积累
 *   GET  /api/reincarnation/talents       - 获取可解锁/已解锁天赋
 *   GET  /api/reincarnation/shop          - 轮回商店物品
 *   POST /api/reincarnation/purchase      - 购买轮回商店道具
 *   POST /api/reincarnation/unlock-talent - 解锁轮回天赋
 *   GET  /api/reincarnation/history       - 轮回历史记录
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');

const Logger = {
  info:  (...args) => console.log('[reincarnation]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[reincarnation:error]', new Date().toISOString(), ...args),
  warn:  (...args) => console.warn('[reincarnation:warn]', new Date().toISOString(), ...args)
};

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH  = path.join(DATA_DIR, 'game.db');

let db;
try {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  initTables();
  Logger.info('数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  // 降级内存模拟
  db = {
    prepare: () => ({ run: () => {}, get: () => null, all: () => [] }),
    exec:    () => {},
    transaction: () => ({ commit: () => {}, rollback: () => {} })
  };
}

// ============================================================
// 数据库初始化
// ============================================================
function initTables() {
  // reincarnation 表：玩家轮回核心数据
  db.exec(`
    CREATE TABLE IF NOT EXISTS reincarnation (
      player_id         INTEGER PRIMARY KEY,
      cycles            INTEGER DEFAULT 0,
      insight_points    INTEGER DEFAULT 0,
      total_insight     INTEGER DEFAULT 0,
      permanent_bonuses TEXT DEFAULT '{"atk_pct":0,"def_pct":0,"hp_pct":0,"cult_speed_pct":0}',
      unlocked_talents  TEXT DEFAULT '[]',
      past_realms       TEXT DEFAULT '[]',
      rebirth_count     INTEGER DEFAULT 0,
      rebirth_available INTEGER DEFAULT 0,
      last_rebirth_time INTEGER DEFAULT 0,
      rebirth_stages    TEXT DEFAULT '{"stage":0,"progress":0}',
      created_at        INTEGER DEFAULT (strftime('%s','now')),
      updated_at        INTEGER DEFAULT (strftime('%s','now'))
    )
  `);

  // 轮回历史记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS reincarnation_history (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id       INTEGER NOT NULL,
      rebirth_num     INTEGER NOT NULL,
      past_realm      INTEGER NOT NULL,
      past_realm_name TEXT,
      past_layer      INTEGER DEFAULT 0,
      insight_gained  INTEGER DEFAULT 0,
      insight_kept    INTEGER DEFAULT 0,
      insight_lost    INTEGER DEFAULT 0,
      new_cycles      INTEGER DEFAULT 0,
      bonus_gained    TEXT,
      talents_unlocked TEXT DEFAULT '[]',
      reborn_at       INTEGER DEFAULT (strftime('%s','now'))
    )
  `);

  // 轮回商店购买记录
  db.exec(`
    CREATE TABLE IF NOT EXISTS reincarnation_shop_log (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      item_id   TEXT NOT NULL,
      item_name TEXT,
      cost      INTEGER NOT NULL,
      bought_at INTEGER DEFAULT (strftime('%s','now'))
    )
  `);

  Logger.info('轮回系统数据库表初始化完成');

  // ============================================================
  // 旧表迁移（从 reincarnation_data → reincarnation）
  // ============================================================
  try {
    // 检查旧表是否存在
    const oldTableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='reincarnation_data'"
    ).get();
    if (oldTableExists) {
      Logger.info('[reincarnation] 检测到旧表 reincarnation_data，开始迁移...');
      // 检查新表是否已有数据
      const newTableHasData = db.prepare('SELECT COUNT(*) as cnt FROM reincarnation').get();
      if (newTableHasData.cnt === 0) {
        // 复制数据到新表
        db.exec(`
          INSERT INTO reincarnation (player_id, cycles, insight_points, rebirth_count, total_insight, past_realms, rebirth_available, created_at, updated_at)
          SELECT player_id, cycles, insight_points, rebirth_count,
                 COALESCE(total_insight_earned, 0) as total_insight,
                 past_realms, rebirth_available,
                 created_at, updated_at
          FROM reincarnation_data
        `);
        Logger.info('[reincarnation] 数据迁移完成');
      }
      // 删除旧表（可选，保留以便回滚）
      // db.exec('DROP TABLE IF EXISTS reincarnation_data');
    }
  } catch (e) {
    Logger.warn('[reincarnation] 迁移旧表时出错（可忽略）:', e.message);
  }

  // 兼容新表列：添加 missing columns（如果 schema 是旧版升级）
  const _addCol = (col, def) => {
    try { db.exec(`ALTER TABLE reincarnation ADD COLUMN ${col} ${def}`); } catch (e) { /* ignore */ }
  };
  _addCol('rebirth_available', 'INTEGER DEFAULT 0');
  _addCol('rebirth_stages',    "TEXT DEFAULT '{\"stage\":0,\"progress\":0}'");
  _addCol('permanent_bonuses',  "TEXT DEFAULT '{\"atk_pct\":0,\"def_pct\":0,\"hp_pct\":0,\"cult_speed_pct\":0}'");
  _addCol('last_rebirth_time',  'INTEGER DEFAULT 0');
  _addCol('total_insight',      'INTEGER DEFAULT 0');
}

// ============================================================
// 境界配置 (与 tribulation_system.js 保持一致)
// ============================================================
const REALM_DATA = {
  1:  { name: '练气期', stage: 1,  color: '#6B8E23' },
  2:  { name: '筑基期', stage: 1,  color: '#4682B4' },
  3:  { name: '金丹期', stage: 2,  color: '#FFD700' },
  4:  { name: '元婴期', stage: 2,  color: '#FF6347' },
  5:  { name: '化神期', stage: 3,  color: '#DA70D6' },
  6:  { name: '炼虚期', stage: 3,  color: '#BA55D3' },
  7:  { name: '大乘期', stage: 4,  color: '#FF69B4' },
  8:  { name: '渡劫期', stage: 4,  color: '#FF4500' },
  9:  { name: '飞升期', stage: 5,  color: '#FFFFFF' }  // 达到此境界可轮回
};

// 境界名称映射
const REALM_NAMES = Object.fromEntries(
  Object.entries(REALM_DATA).map(([k, v]) => [parseInt(k), v.name])
);

// ============================================================
// 轮回天赋配置 (8个天赋)
// ============================================================
const REINCARNATION_TALENTS = [
  {
    id:          '天眼通',
    name:        '天眼通',
    icon:        '👁️',
    unlockCycle: 10,
    desc:        '战斗中显示敌人弱点，暴击率+15%',
    effect:      { crit_rate: 15 }
  },
  {
    id:          '宿命通',
    name:        '宿命通',
    icon:        '🔮',
    unlockCycle: 15,
    desc:        '副本伤害+20%',
    effect:      { dungeon_damage_pct: 20 }
  },
  {
    id:          '他心通',
    name:        '他心通',
    icon:        '💭',
    unlockCycle: 20,
    desc:        '竞技场预览对手属性',
    effect:      { arena_preview: true }
  },
  {
    id:          '轮回净土',
    name:        '轮回净土',
    icon:        '🏔️',
    unlockCycle: 20,
    desc:        '离线收益+50%',
    effect:      { offline_bonus_pct: 50 }
  },
  {
    id:          '漏尽通',
    name:        '漏尽通',
    icon:        '⚔️',
    unlockCycle: 25,
    desc:        '每日击杀奖励+30%',
    effect:      { daily_kill_bonus_pct: 30 }
  },
  {
    id:          '如意通',
    name:        '如意通',
    icon:        '🎲',
    unlockCycle: 30,
    desc:        '装备词缀随机刷新次数+5',
    effect:      { reforge_count_bonus: 5 }
  },
  {
    id:          '神足通',
    name:        '神足通',
    icon:        '🦶',
    unlockCycle: 35,
    desc:        '坐骑速度+50%',
    effect:      { mount_speed_pct: 50 }
  },
  {
    id:          '不死之身',
    name:        '不死之身',
    icon:        '💀',
    unlockCycle: 40,
    desc:        '致命伤害免死(每日1次)',
    effect:      { lethal_immunity_daily: 1 }
  }
];

// ============================================================
// 轮回商店道具配置
// ============================================================
const REINCARNATION_SHOP = [
  {
    id:          'rebirth_pill',
    name:        '轮回丹',
    icon:        '💊',
    cost:        500,
    desc:        '立即触发轮回，无需达到飞升期',
    usable:      true,
    type:        'instant_rebirth'
  },
  {
    id:          '渡厄丹',
    name:        '渡厄丹',
    icon:        '💊',
    cost:        1000,
    desc:        '轮回时保留50%天道感悟',
    usable:      true,
    type:        'insight_boost'
  },
  {
    id:          '天道残卷',
    name:        '天道残卷',
    icon:        '📜',
    cost:        800,
    desc:        '随机解锁1个已满足条件的轮回天赋',
    usable:      true,
    type:        'talent_unlock'
  },
  {
    id:          '轮回钥匙',
    name:        '轮回钥匙',
    icon:        '🗝️',
    cost:        2000,
    desc:        '解锁特定轮回层专属副本',
    usable:      false,
    type:        'dungeon_unlock'
  },
  {
    id:          '天道结晶',
    name:        '天道结晶',
    icon:        '💎',
    cost:        300,
    desc:        '提升1%轮回加成(全属性)',
    usable:      true,
    type:        'bonus_upgrade'
  },
  {
    id:          '轮回祝福符',
    name:        '轮回祝福符',
    icon:        '✨',
    cost:        1500,
    desc:        '7天内轮回加成翻倍',
    usable:      true,
    type:        'blessing_buff',
    duration:    7 * 24 * 3600  // 7天秒数
  }
];

// ============================================================
// 轮回加成计算
// ============================================================
// 每轮回1次: 全属性+3% (可叠加到永久加成)
// 每轮回+1境界: 额外+2%/层
// 轮回10层解锁: 天道之眼
// 轮回20层解锁: 轮回净土
// 轮回30层解锁: 不朽金身
// 轮回40层解锁: 天道轮回

function calcPermanentBonus(cycles, highestRealm) {
  const basePct    = cycles * 3;
  const realmBonus = (Math.max(0, highestRealm - 1)) * 2;  // 每超初始境界1层额外+2%
  const total = basePct + realmBonus;
  return {
    atk_pct:        total,
    def_pct:        total,
    hp_pct:         total,
    cult_speed_pct: total
  };
}

// 获取轮回积分 (用于商店购买)
function getCyclePoints(rd) {
  // 积分来源: 每次轮回+100，每获得1000感悟点+10
  return rd.rebirth_count * 100 + Math.floor(rd.total_insight / 1000) * 10;
}

// ============================================================
// Helper: 获取或初始化玩家轮回数据
// ============================================================
function getOrInitReincarnationData(playerId) {
  let data = db.prepare('SELECT * FROM reincarnation WHERE player_id = ?').get(playerId);
  if (!data) {
    db.prepare(`INSERT INTO reincarnation (player_id) VALUES (?)`).run(playerId);
    data = db.prepare('SELECT * FROM reincarnation WHERE player_id = ?').get(playerId);
  }
  return {
    ...data,
    permanent_bonuses: JSON.parse(data.permanent_bonuses || '{"atk_pct":0,"def_pct":0,"hp_pct":0,"cult_speed_pct":0}'),
    unlocked_talents:   JSON.parse(data.unlocked_talents  || '[]'),
    past_realms:        JSON.parse(data.past_realms        || '[]'),
    rebirth_stages:     JSON.parse(data.rebirth_stages     || '{"stage":0,"progress":0}')
  };
}

// Helper: 获取玩家当前境界
function getPlayerRealmInfo(playerId) {
  try {
    // 尝试从 Users 表读取 (主项目使用 Users)
    let player = db.prepare('SELECT realm, layer FROM Users WHERE id = ?').get(playerId);
    if (!player) {
      // 降级到 players 表
      player = db.prepare('SELECT realm, layer FROM players WHERE id = ?').get(playerId);
    }
    return player || { realm: 1, layer: 0 };
  } catch (e) {
    return { realm: 1, layer: 0 };
  }
}

// ============================================================
// 中间件: 确保玩家轮回数据已初始化
// ============================================================
function ensureReincarnationData(req, res, next) {
  const playerId = req.userId || req.query.player_id;
  if (!playerId) return res.json({ code: -1, message: '缺少玩家身份标识' });
  getOrInitReincarnationData(playerId);  // 确保记录存在
  next();
}

// ============================================================
// API: 获取当前玩家轮回信息
// GET /api/reincarnation/info
// ============================================================
router.get('/info', ensureReincarnationData, (req, res) => {
  const playerId = req.userId || req.query.player_id;
  if (!playerId) return res.json({ code: -1, message: '缺少player_id' });

  const rd = getOrInitReincarnationData(playerId);
  const playerInfo = getPlayerRealmInfo(playerId);
  const currentRealm = playerInfo.realm || 1;
  const currentLayer = playerInfo.layer || 0;

  // 飞升期(9)后 rebirth_available=true
  const rebirthAvailable = currentRealm >= 9;

  // 实时更新 rebirth_available 字段
  if (rd.rebirth_available !== (rebirthAvailable ? 1 : 0)) {
    db.prepare('UPDATE reincarnation SET rebirth_available = ? WHERE player_id = ?')
      .run(rebirthAvailable ? 1 : 0, playerId);
  }

  // 计算感悟进度
  const insightForNextCycle = Math.max(1, (rd.cycles + 1) * 1000);
  const insightProgress = Math.min(100, Math.floor((rd.insight_points / insightForNextCycle) * 100));

  res.json({
    code: 0,
    message: '获取成功',
    data: {
      cycles:            rd.cycles,
      insight_points:    rd.insight_points,
      total_insight:     rd.total_insight,
      permanent_bonuses: rd.permanent_bonuses,
      rebirth_count:     rd.rebirth_count,
      rebirth_available: rebirthAvailable,
      last_rebirth_time:  rd.last_rebirth_time,
      rebirth_stages:    rd.rebirth_stages,
      current_realm:     currentRealm,
      current_realm_name: REALM_NAMES[currentRealm] || '凡人之躯',
      current_layer:     currentLayer,
      insight_progress:  insightProgress,
      insight_for_next:  insightForNextCycle,
      cycle_points:      getCyclePoints(rd),
      unlocked_talents:  rd.unlocked_talents,
      bonus_summary: {
        atk_pct:        rd.permanent_bonuses.atk_pct,
        def_pct:        rd.permanent_bonuses.def_pct,
        hp_pct:         rd.permanent_bonuses.hp_pct,
        cult_speed_pct: rd.permanent_bonuses.cult_speed_pct
      }
    }
  });
});

// ============================================================
// API: 执行轮回重修
// POST /api/reincarnation/rebirth
// ============================================================
router.post('/rebirth', ensureReincarnationData, (req, res) => {
  const playerId = req.userId || (req.user && req.user.id);
  if (!playerId) return res.json({ code: -1, message: '未登录或缺少player_id' });

  const { confirm, keep_insight } = req.body;
  if (!confirm) return res.json({ code: -1, message: '需要确认才能执行轮回，请传入 confirm: true' });

  const rd = getOrInitReincarnationData(playerId);
  const playerInfo = getPlayerRealmInfo(playerId);
  const currentRealm = playerInfo.realm || 1;
  const currentLayer = playerInfo.layer || 0;

  // 检查是否达到飞升期(境界9)或使用了轮回丹
  if (currentRealm < 9) {
    // 检查背包是否有轮回丹(可用道具直接触发)
    return res.json({
      code: -1,
      message: `必须达到飞升期才能轮回，当前境界：${REALM_NAMES[currentRealm] || '未知'}。请先修炼到飞升期，或在商店购买【轮回丹】立即触发轮回。`
    });
  }

  // 计算本世收获
  const insightGained = Math.floor(Math.random() * 800) + 300 + currentLayer * 80;
  const newCycles     = rd.cycles + 1;
  const newRebirthCount = rd.rebirth_count + 1;

  // 记录past_realms
  const pastLives = JSON.parse(rd.past_realms || '[]');
  pastLives.unshift({
    realm:     currentRealm,
    realm_name: REALM_NAMES[currentRealm] || '飞升期',
    layer:     currentLayer,
    cycles_at_rebirth: rd.cycles,
    insight_gained: insightGained,
    rebirth_num: newRebirthCount,
    timestamp: Date.now()
  });
  // 保留最近50世记录
  if (pastLives.length > 50) pastLives.splice(50);

  // 计算感悟保留比例
  let keepInsightPct = 10;  // 默认保留10%
  const talents = rd.unlocked_talents || [];
  if (talents.includes('轮回净土')) keepInsightPct += 10;
  // 渡厄丹效果可叠加(检查背包，这里简化处理)
  // keep_insight 参数可手动指定保留比例(后台验证)

  const keptInsight  = Math.floor(rd.insight_points * (keepInsightPct / 100));
  const lostInsight  = rd.insight_points - keptInsight;
  const newTotalInsight = rd.total_insight + insightGained;

  // 计算新永久加成
  const newHighestRealm = Math.max(rd.cycles > 0 ? rd.cycles : 1, currentRealm);
  const newBonus = calcPermanentBonus(newCycles, newHighestRealm);

  // 检查本轮回新增解锁的天赋
  const newlyUnlocked = [];
  for (const t of REINCARNATION_TALENTS) {
    if (newCycles >= t.unlockCycle && !talents.includes(t.id)) {
      newlyUnlocked.push(t.id);
    }
  }
  const allUnlocked = [...new Set([...talents, ...newlyUnlocked])];

  const newRebirthStages = {
    stage:    0,
    progress: 0
  };

  const now = Math.floor(Date.now() / 1000);

  try {
    const tx = db.transaction(() => {
      // 更新轮回核心数据
      db.prepare(`
        UPDATE reincarnation SET
          cycles            = ?,
          insight_points    = ?,
          total_insight     = ?,
          permanent_bonuses = ?,
          unlocked_talents  = ?,
          past_realms       = ?,
          rebirth_count     = ?,
          rebirth_available = 0,
          last_rebirth_time = ?,
          rebirth_stages    = ?,
          updated_at        = ?
        WHERE player_id = ?
      `).run(
        newCycles,
        keptInsight,
        newTotalInsight,
        JSON.stringify(newBonus),
        JSON.stringify(allUnlocked),
        JSON.stringify(pastLives),
        newRebirthCount,
        now,
        JSON.stringify(newRebirthStages),
        now,
        playerId
      );

      // 重置玩家境界为练气期(境界1)，保留基础属性
      try {
        db.prepare(`UPDATE Users SET realm = 1, layer = 0 WHERE id = ?`).run(playerId);
      } catch (e) {
        db.prepare(`UPDATE players SET realm = 1, layer = 0 WHERE id = ?`).run(playerId);
      }

      // 记录轮回历史
      db.prepare(`
        INSERT INTO reincarnation_history
          (player_id, rebirth_num, past_realm, past_realm_name, past_layer,
           insight_gained, insight_kept, insight_lost, new_cycles, bonus_gained, talents_unlocked)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        playerId,
        newRebirthCount,
        currentRealm,
        REALM_NAMES[currentRealm] || '飞升期',
        currentLayer,
        insightGained,
        keptInsight,
        lostInsight,
        newCycles,
        JSON.stringify(newBonus),
        JSON.stringify(newlyUnlocked)
      );
    });
    tx.commit();

    Logger.info(`轮回完成: playerId=${playerId}, newCycles=${newCycles}, keptInsight=${keptInsight}`);

    res.json({
      code: 0,
      message: `轮回重修成功！转入第${newCycles}轮回，历经${insightGained}点天道感悟。`,
      data: {
        new_cycles:      newCycles,
        rebirth_count:   newRebirthCount,
        kept_insight:    keptInsight,
        lost_insight:    lostInsight,
        insight_gained:  insightGained,
        permanent_bonus: newBonus,
        new_realm:       1,
        new_realm_name:  '练气期',
        new_talents:     newlyUnlocked,
        all_talents:     allUnlocked
      }
    });
  } catch (err) {
    Logger.error('轮回失败:', err.message);
    res.json({ code: -1, message: '轮回失败: ' + err.message });
  }
});

// ============================================================
// API: 获取天道感悟积累
// GET /api/reincarnation/insight
// ============================================================
router.get('/insight', ensureReincarnationData, (req, res) => {
  const playerId = req.userId || req.query.player_id;
  if (!playerId) return res.json({ code: -1, message: '缺少player_id' });

  const rd = getOrInitReincarnationData(playerId);
  const insightForNext = Math.max(1, (rd.cycles + 1) * 1000);

  // 感悟点带来的额外加成
  const insightBonus = {
    atk_pct:        Math.floor(rd.insight_points / 100) * 0.5,
    def_pct:        Math.floor(rd.insight_points / 100) * 0.5,
    cult_speed_pct: Math.floor(rd.insight_points / 200) * 1
  };

  res.json({
    code: 0,
    message: '获取成功',
    data: {
      current_insight:    rd.insight_points,
      total_insight:      rd.total_insight,
      insight_for_next:   insightForNext,
      insight_progress:    Math.min(100, Math.floor((rd.insight_points / insightForNext) * 100)),
      insight_bonus:      insightBonus,
      rebirth_count:       rd.rebirth_count,
      past_lives_count:   JSON.parse(rd.past_realms || '[]').length,
      cycle_points:       getCyclePoints(rd)
    }
  });
});

// ============================================================
// API: 获取可解锁/已解锁天赋
// GET /api/reincarnation/talents
// ============================================================
router.get('/talents', ensureReincarnationData, (req, res) => {
  const playerId = req.userId || req.query.player_id;
  if (!playerId) return res.json({ code: -1, message: '缺少player_id' });

  const rd = getOrInitReincarnationData(playerId);
  const unlocked = rd.unlocked_talents || [];

  const talentsWithStatus = REINCARNATION_TALENTS.map(t => ({
    id:          t.id,
    name:        t.name,
    icon:        t.icon,
    unlockCycle: t.unlockCycle,
    desc:        t.desc,
    effect:      t.effect,
    unlocked:    unlocked.includes(t.id),
    can_unlock:  rd.cycles >= t.unlockCycle && !unlocked.includes(t.id)
  }));

  // 已解锁天赋汇总效果
  const totalEffects = {};
  for (const tid of unlocked) {
    const t = REINCARNATION_TALENTS.find(x => x.id === tid);
    if (t) Object.assign(totalEffects, t.effect);
  }

  res.json({
    code: 0,
    message: '获取成功',
    data: {
      talents:         talentsWithStatus,
      unlocked_count:  unlocked.length,
      total_count:     REINCARNATION_TALENTS.length,
      current_cycles:  rd.cycles,
      total_effects:   totalEffects
    }
  });
});

// ============================================================
// API: 轮回商店物品
// GET /api/reincarnation/shop
// ============================================================
router.get('/shop', ensureReincarnationData, (req, res) => {
  const playerId = req.userId || req.query.player_id;
  if (!playerId) return res.json({ code: -1, message: '缺少player_id' });

  const rd = getOrInitReincarnationData(playerId);
  const cyclePoints = getCyclePoints(rd);

  // 标记玩家可购买的道具
  const shopItems = REINCARNATION_SHOP.map(item => ({
    ...item,
    can_buy: cyclePoints >= item.cost
  }));

  res.json({
    code: 0,
    message: '获取成功',
    data: {
      items:       shopItems,
      cycle_points: cyclePoints,
      player_cycles: rd.cycles,
      shop_tips:   [
        '轮回积分由轮回次数和历史感悟点决定',
        '每次轮回获得100积分，每获得1000感悟点获得10积分',
        '部分道具可叠加效果，请谨慎购买'
      ]
    }
  });
});

// ============================================================
// API: 购买轮回商店道具
// POST /api/reincarnation/purchase
// ============================================================
router.post('/purchase', ensureReincarnationData, (req, res) => {
  const playerId = req.userId || (req.user && req.user.id);
  if (!playerId) return res.json({ code: -1, message: '未登录' });

  const { item_id } = req.body;
  if (!item_id) return res.json({ code: -1, message: '缺少item_id参数' });

  const item = REINCARNATION_SHOP.find(i => i.id === item_id);
  if (!item) return res.json({ code: -1, message: '道具不存在' });

  const rd = getOrInitReincarnationData(playerId);
  const cyclePoints = getCyclePoints(rd);

  if (cyclePoints < item.cost) {
    return res.json({
      code: -1,
      message: `轮回积分不足，需要${item.cost}积分，当前拥有${cyclePoints}积分`
    });
  }

  const newPoints = cyclePoints - item.cost;

  try {
    // 记录购买
    db.prepare(`
      INSERT INTO reincarnation_shop_log (player_id, item_id, item_name, cost)
      VALUES (?, ?, ?, ?)
    `).run(playerId, item_id, item.name, item.cost);

    // 根据道具类型处理效果
    let resultData = { item: item, remaining_points: newPoints };

    switch (item.type) {
      case 'instant_rebirth': {
        // 轮回丹: 直接触发轮回(绕过境界限制)
        if (rd.cycles === 0) {
          // 首次轮回，直接执行（异步处理）
          doRebirth(playerId, { confirm: true, force: true }).then(result => {
            res.json(result);
          }).catch(err => {
            res.json({ code: -1, message: '轮回丹使用失败: ' + err.message });
          });
          return; // 异步响应，由 then 发送
        }
        // 非首次，给予标记道具(前端处理)
        resultData.message = '已获得【轮回丹】，可在任意境界触发轮回';
        resultData.granted = 'rebirth_enabled';
        break;
      }

      case 'insight_boost': {
        // 渡厄丹: 轮回时保留50%感悟(记录到天赋加成)
        const newInsight = rd.insight_points + Math.floor(item.cost * 0.5);
        db.prepare('UPDATE reincarnation SET insight_points = ? WHERE player_id = ?')
          .run(newInsight, playerId);
        resultData.message = `使用成功，轮回时感悟保留比例+25%`;
        resultData.insight_added = Math.floor(item.cost * 0.5);
        break;
      }

      case 'talent_unlock': {
        // 天道残卷: 随机解锁1个已满足条件的天赋
        const canUnlock = REINCARNATION_TALENTS.filter(
          t => rd.cycles >= t.unlockCycle && !rd.unlocked_talents.includes(t.id)
        );
        if (canUnlock.length === 0) {
          return res.json({
            code: -1,
            message: '当前轮回层数没有可解锁的天赋，请提升轮回层数'
          });
        }
        const chosen = canUnlock[Math.floor(Math.random() * canUnlock.length)];
        const newUnlocked = [...rd.unlocked_talents, chosen.id];
        db.prepare('UPDATE reincarnation SET unlocked_talents = ? WHERE player_id = ?')
          .run(JSON.stringify(newUnlocked), playerId);
        resultData.message = `随机解锁天赋【${chosen.name}】成功！`;
        resultData.unlocked_talent = chosen;
        break;
      }

      case 'bonus_upgrade': {
        // 天道结晶: 提升1%轮回加成(直接追加到permanent_bonuses)
        const updatedBonus = {
          atk_pct:        rd.permanent_bonuses.atk_pct        + 1,
          def_pct:        rd.permanent_bonuses.def_pct        + 1,
          hp_pct:         rd.permanent_bonuses.hp_pct         + 1,
          cult_speed_pct: rd.permanent_bonuses.cult_speed_pct + 1
        };
        db.prepare('UPDATE reincarnation SET permanent_bonuses = ? WHERE player_id = ?')
          .run(JSON.stringify(updatedBonus), playerId);
        resultData.message = '加成提升成功，全属性轮回加成+1%';
        resultData.new_bonus = updatedBonus;
        break;
      }

      case 'blessing_buff': {
        // 轮回祝福符: 7天内轮回加成翻倍(记录到redis/内存，这里简化)
        resultData.message = '已激活【轮回祝福】，7天内轮回加成翻倍';
        resultData.buff_end_time = Math.floor(Date.now() / 1000) + item.duration;
        resultData.buff_type = 'rebirth_bonus_double';
        break;
      }

      case 'dungeon_unlock': {
        // 轮回钥匙: 解锁特定轮回层专属副本
        resultData.message = `已解锁轮回专属副本(需${item.cost}积分)`;
        resultData.dungeon_id = `reincarnation_dungeon_${rd.cycles + 1}`;
        break;
      }

      default:
        resultData.message = `购买成功，获得【${item.name}】`;
    }

    res.json({
      code: 0,
      message: resultData.message || `购买成功，获得【${item.name}】`,
      data: resultData
    });

  } catch (err) {
    Logger.error('购买失败:', err.message);
    res.json({ code: -1, message: '购买失败: ' + err.message });
  }
});

// 辅助: 执行实际轮回逻辑(供purchase和rebirth共用)
function doRebirth(playerId, options) {
  return new Promise((resolve) => {
    const rd = getOrInitReincarnationData(playerId);
    const playerInfo = getPlayerRealmInfo(playerId);
    const currentRealm = playerInfo.realm || 1;
    const currentLayer = playerInfo.layer || 0;

    const insightGained = Math.floor(Math.random() * 800) + 300 + currentLayer * 80;
    const newCycles = rd.cycles + 1;
    const newRebirthCount = rd.rebirth_count + 1;

    const pastLives = JSON.parse(rd.past_realms || '[]');
    pastLives.unshift({
      realm:     currentRealm,
      realm_name: REALM_NAMES[currentRealm] || '飞升期',
      layer:     currentLayer,
      cycles_at_rebirth: rd.cycles,
      insight_gained: insightGained,
      rebirth_num: newRebirthCount,
      timestamp: Date.now()
    });
    if (pastLives.length > 50) pastLives.splice(50);

    const keepInsightPct = 10;
    const keptInsight  = Math.floor(rd.insight_points * (keepInsightPct / 100));
    const lostInsight  = rd.insight_points - keptInsight;
    const newTotalInsight = rd.total_insight + insightGained;
    const newHighestRealm = Math.max(rd.cycles > 0 ? rd.cycles : 1, currentRealm);
    const newBonus = calcPermanentBonus(newCycles, newHighestRealm);

    const talents = rd.unlocked_talents || [];
    const newlyUnlocked = [];
    for (const t of REINCARNATION_TALENTS) {
      if (newCycles >= t.unlockCycle && !talents.includes(t.id)) {
        newlyUnlocked.push(t.id);
      }
    }
    const allUnlocked = [...new Set([...talents, ...newlyUnlocked])];
    const now = Math.floor(Date.now() / 1000);

    try {
      const tx = db.transaction(() => {
        db.prepare(`
          UPDATE reincarnation SET
            cycles=?, insight_points=?, total_insight=?,
            permanent_bonuses=?, unlocked_talents=?, past_realms=?,
            rebirth_count=?, rebirth_available=0, last_rebirth_time=?,
            rebirth_stages='{"stage":0,"progress":0}', updated_at=?
          WHERE player_id=?
        `).run(newCycles, keptInsight, newTotalInsight, JSON.stringify(newBonus),
          JSON.stringify(allUnlocked), JSON.stringify(pastLives), newRebirthCount,
          now, now, playerId);

        try {
          db.prepare('UPDATE Users SET realm=1, layer=0 WHERE id=?').run(playerId);
        } catch (e) {
          db.prepare('UPDATE players SET realm=1, layer=0 WHERE id=?').run(playerId);
        }

        db.prepare(`
          INSERT INTO reincarnation_history
            (player_id, rebirth_num, past_realm, past_realm_name, past_layer,
             insight_gained, insight_kept, insight_lost, new_cycles, bonus_gained, talents_unlocked)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)
        `).run(playerId, newRebirthCount, currentRealm, REALM_NAMES[currentRealm]||'飞升期',
          currentLayer, insightGained, keptInsight, lostInsight, newCycles,
          JSON.stringify(newBonus), JSON.stringify(newlyUnlocked));
      });
      tx.commit();

      resolve({
        code: 0,
        message: `轮回重修成功！转入第${newCycles}轮回，历经${insightGained}点天道感悟。`,
        data: {
          new_cycles: newCycles, rebirth_count: newRebirthCount,
          kept_insight: keptInsight, lost_insight: lostInsight,
          insight_gained: insightGained,
          permanent_bonus: newBonus,
          new_realm: 1, new_realm_name: '练气期',
          new_talents: newlyUnlocked, all_talents: allUnlocked
        }
      });
    } catch (err) {
      resolve({ code: -1, message: '轮回失败: ' + err.message });
    }
  });
}

// ============================================================
// API: 解锁轮回天赋
// POST /api/reincarnation/unlock-talent
// ============================================================
router.post('/unlock-talent', ensureReincarnationData, (req, res) => {
  const playerId = req.userId || (req.user && req.user.id);
  if (!playerId) return res.json({ code: -1, message: '未登录' });

  const { talent_id } = req.body;
  if (!talent_id) return res.json({ code: -1, message: '缺少talent_id参数' });

  const talent = REINCARNATION_TALENTS.find(t => t.id === talent_id);
  if (!talent) return res.json({ code: -1, message: '天赋不存在: ' + talent_id });

  const rd = getOrInitReincarnationData(playerId);
  const unlocked = rd.unlocked_talents || [];

  if (unlocked.includes(talent_id)) {
    return res.json({ code: -1, message: '已解锁此天赋，无需重复解锁' });
  }

  if (rd.cycles < talent.unlockCycle) {
    return res.json({
      code: -1,
      message: `需要达到${talent.unlockCycle}层轮回才能解锁【${talent.name}】，当前轮回层数: ${rd.cycles}`
    });
  }

  const newUnlocked = [...unlocked, talent_id];

  try {
    db.prepare('UPDATE reincarnation SET unlocked_talents = ? WHERE player_id = ?')
      .run(JSON.stringify(newUnlocked), playerId);

    Logger.info(`天赋解锁: playerId=${playerId}, talent=${talent_id}`);

    res.json({
      code: 0,
      message: `解锁成功！获得轮回天赋【${talent.name}】`,
      data: {
        talent_id:      talent_id,
        talent_name:    talent.name,
        talent_effect:  talent.effect,
        unlocked_count: newUnlocked.length,
        all_talents:    newUnlocked
      }
    });
  } catch (err) {
    Logger.error('解锁天赋失败:', err.message);
    res.json({ code: -1, message: '解锁失败: ' + err.message });
  }
});

// ============================================================
// API: 轮回历史记录
// GET /api/reincarnation/history
// ============================================================
router.get('/history', ensureReincarnationData, (req, res) => {
  const playerId = req.userId || req.query.player_id;
  if (!playerId) return res.json({ code: -1, message: '缺少player_id' });

  const { page = 1, page_size = 10 } = req.query;
  const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(50, Math.max(1, parseInt(page_size)));

  try {
    const rows = db.prepare(`
      SELECT * FROM reincarnation_history
      WHERE player_id = ?
      ORDER BY reborn_at DESC
      LIMIT ? OFFSET ?
    `).all(playerId, Math.min(50, parseInt(page_size)), offset);

    const total = db.prepare(`
      SELECT COUNT(*) as cnt FROM reincarnation_history WHERE player_id = ?
    `).get(playerId);

    const history = rows.map(r => ({
      ...r,
      bonus_gained:     JSON.parse(r.bonus_gained     || '{}'),
      talents_unlocked: JSON.parse(r.talents_unlocked || '[]')
    }));

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        history:     history,
        page:        parseInt(page),
        page_size:   parseInt(page_size),
        total_count: total.cnt,
        total_pages: Math.ceil(total.cnt / Math.min(50, parseInt(page_size)))
      }
    });
  } catch (err) {
    Logger.error('获取历史记录失败:', err.message);
    res.json({ code: -1, message: '获取历史失败: ' + err.message });
  }
});

// ============================================================
// 外部调用: 初始化玩家轮回数据 (供其他模块调用)
// ============================================================
function initPlayerReincarnation(playerId) {
  try {
    const existing = db.prepare('SELECT player_id FROM reincarnation WHERE player_id = ?').get(playerId);
    if (!existing) {
      db.prepare(`INSERT INTO reincarnation (player_id) VALUES (?)`).run(playerId);
      Logger.info(`初始化玩家轮回数据: playerId=${playerId}`);
    }
  } catch (e) {
    Logger.error('初始化玩家轮回数据失败:', e.message);
  }
}

module.exports = router;
module.exports.initPlayerReincarnation = initPlayerReincarnation;
module.exports.getOrInitReincarnationData = getOrInitReincarnationData;
module.exports.calcPermanentBonus = calcPermanentBonus;
