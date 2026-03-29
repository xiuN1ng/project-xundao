/**
 * 位面之子 Buff 系统 (buff_api.js)
 * 功能: 玩家离线超过30分钟后，登录时发放"位面之子"BUFF
 * 效果: 攻击+20%~100%, 经验+50%~200%, 持续15~120分钟
 * DB表: player_buffs
 */

const express = require('express');
const router = express.Router();
const path = require('path');

// DB路径: server/services/ → server/backend/data/game.db
const DATA_DIR = path.join(__dirname, '..', 'backend', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('busy_timeout=5000');
  db.pragma('journal_mode=WAL');
} catch (e) {
  console.error('[buff] Failed to load better-sqlite3:', e.message);
}

// ==================== 数据库初始化 ====================

function initBuffTables() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_buffs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        buff_key TEXT NOT NULL,
        buff_name TEXT NOT NULL,
        effect_data TEXT DEFAULT '{}',
        started_at TEXT NOT NULL,
        ends_at TEXT NOT NULL,
        claimed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(player_id, buff_key)
      );
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_player_buffs_player
      ON player_buffs(player_id);
    `);

    // 玩家最后离线时间表
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_offline_log (
        player_id INTEGER PRIMARY KEY,
        last_logout_at TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    console.log('[buff] 表初始化完成');
  } catch (e) {
    console.error('[buff] 表初始化失败:', e.message);
  }
}

// 启动时初始化
initBuffTables();

// ==================== 工具函数 ====================

function getShanghaiDateStr() {
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function getShanghaiDate() {
  return getShanghaiDateStr().slice(0, 10);
}

/**
 * 根据离线时长计算buff效果和持续时间
 * @param {number} offlineMinutes - 离线分钟数
 * @returns {{ atkBonus: number, expBonus: number, durationMinutes: number, tier: string }}
 */
function calcBuffEffect(offlineMinutes) {
  if (offlineMinutes < 30) {
    return { atkBonus: 0, expBonus: 0, durationMinutes: 0, tier: 'none' };
  } else if (offlineMinutes < 60) {
    // 30-60分钟
    const ratio = (offlineMinutes - 30) / 30;
    return {
      atkBonus: Math.round(20 + ratio * 20),   // 20%~40%
      expBonus: Math.round(50 + ratio * 30),   // 50%~80%
      durationMinutes: Math.round(15 + ratio * 15), // 15~30分钟
      tier: 'awakening'
    };
  } else if (offlineMinutes < 180) {
    // 1-3小时
    const ratio = Math.min(1, (offlineMinutes - 60) / 120);
    return {
      atkBonus: Math.round(40 + ratio * 20),   // 40%~60%
      expBonus: Math.round(80 + ratio * 40),   // 80%~120%
      durationMinutes: Math.round(30 + ratio * 30), // 30~60分钟
      tier: 'growth'
    };
  } else if (offlineMinutes < 360) {
    // 3-6小时
    const ratio = (offlineMinutes - 180) / 180;
    return {
      atkBonus: Math.round(60 + ratio * 20),   // 60%~80%
      expBonus: Math.round(120 + ratio * 40),  // 120%~160%
      durationMinutes: Math.round(60 + ratio * 30), // 60~90分钟
      tier: 'blessing'
    };
  } else {
    // 6-24小时
    const ratio = Math.min(1, (offlineMinutes - 360) / 1080);
    return {
      atkBonus: Math.round(80 + ratio * 20),   // 80%~100%
      expBonus: Math.round(160 + ratio * 40), // 160%~200%
      durationMinutes: Math.round(90 + ratio * 30), // 90~120分钟
      tier: 'chosen'
    };
  }
}

/**
 * 记录玩家离线时间（每次服务器认为玩家"离线"时调用）
 * 通常在 cultivation.js 或 player.js 的登出逻辑中调用
 */
function recordLogout(playerId) {
  if (!db) return;
  try {
    const now = getShanghaiDateStr();
    db.prepare(`
      INSERT OR REPLACE INTO player_offline_log (player_id, last_logout_at, updated_at)
      VALUES (?, ?, ?)
    `).run(playerId, now, now);
  } catch (e) {
    console.error('[buff] recordLogout 失败:', e.message);
  }
}

/**
 * 获取玩家离线时长（分钟）
 */
function getOfflineMinutes(playerId) {
  if (!db) return 0;
  try {
    const row = db.prepare(`
      SELECT last_logout_at FROM player_offline_log WHERE player_id = ?
    `).get(playerId);
    if (!row) return 0;

    const logoutTime = new Date(row.last_logout_at.replace(' ', 'T') + 'Z');
    const now = new Date();
    const diffMs = now - logoutTime;
    return Math.floor(diffMs / 60000);
  } catch (e) {
    console.error('[buff] getOfflineMinutes 失败:', e.message);
    return 0;
  }
}

/**
 * 检查并发放位面之子buff（登录时调用）
 * @returns {object|null} 发放的buff信息，如无则返回null
 */
function checkAndGrantBuff(playerId) {
  if (!db) return null;
  try {
    const offlineMinutes = getOfflineMinutes(playerId);
    if (offlineMinutes < 30) return null;

    const effect = calcBuffEffect(offlineMinutes);
    if (effect.tier === 'none') return null;

    // 检查是否已有未过期的同类buff
    const now = getShanghaiDateStr();
    const existing = db.prepare(`
      SELECT * FROM player_buffs
      WHERE player_id = ? AND buff_key = 'buff_plane_chosen'
      AND ends_at > ? AND claimed = 0
    `).get(playerId, now);

    if (existing) {
      // buff未过期，不重复发放
      return null;
    }

    // 删除旧记录
    db.prepare(`DELETE FROM player_buffs WHERE player_id = ? AND buff_key = 'buff_plane_chosen'`).run(playerId);

    const startedAt = now;
    const endsAtMs = Date.now() + effect.durationMinutes * 60000;
    const endsAtDate = new Date(endsAtMs);
    const endsAt = `${endsAtDate.getUTCFullYear()}-${String(endsAtDate.getUTCMonth()+1).padStart(2,'0')}-${String(endsAtDate.getUTCDate()).padStart(2,'0')} ${String(endsAtDate.getUTCHours()).padStart(2,'0')}:${String(endsAtDate.getUTCMinutes()).padStart(2,'0')}:${String(endsAtDate.getUTCSeconds()).padStart(2,'0')}`;

    const effectData = JSON.stringify({
      atkBonus: effect.atkBonus,
      expBonus: effect.expBonus,
      tier: effect.tier,
      offlineMinutes
    });

    db.prepare(`
      INSERT INTO player_buffs (player_id, buff_key, buff_name, effect_data, started_at, ends_at, claimed)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(playerId, 'buff_plane_chosen', '位面之子', effectData, startedAt, endsAt);

    console.log(`[buff] 玩家${playerId}获得位面之子buff: atk+${effect.atkBonus}%, exp+${effect.expBonus}%, 持续${effect.durationMinutes}分钟`);

    return {
      buffKey: 'buff_plane_chosen',
      buffName: '位面之子',
      effectData: JSON.parse(effectData),
      startedAt,
      endsAt,
      durationMinutes: effect.durationMinutes,
      tier: effect.tier
    };
  } catch (e) {
    console.error('[buff] checkAndGrantBuff 失败:', e.message);
    return null;
  }
}

/**
 * 清除过期buff（定时清理）
 */
function clearExpiredBuffs() {
  if (!db) return;
  try {
    const now = getShanghaiDateStr();
    const result = db.prepare(`
      DELETE FROM player_buffs WHERE ends_at <= ? AND claimed = 0
    `).run(now);
    if (result.changes > 0) {
      console.log(`[buff] 清理了${result.changes}个过期buff`);
    }
  } catch (e) {
    console.error('[buff] clearExpiredBuffs 失败:', e.message);
  }
}

// 每次查询时顺便清理过期buff（懒清理）
clearExpiredBuffs();

// ==================== API 端点 ====================

/**
 * GET /api/buff/status
 * 获取玩家当前有效buff列表
 * 查询参数: player_id 或 X-User-Id header
 */
router.get('/status', (req, res) => {
  if (!db) return res.status(500).json({ success: false, message: '数据库未初始化' });

  try {
    const playerId = parseInt(req.query.player_id || req.query.userId || req.query.playerId || req.get('X-User-Id') || 1);
    const now = getShanghaiDateStr();

    const buffs = db.prepare(`
      SELECT * FROM player_buffs
      WHERE player_id = ? AND ends_at > ? AND claimed = 0
      ORDER BY ends_at ASC
    `).all(playerId);

    const activeBuffs = buffs.map(b => {
      let effectData = {};
      try { effectData = JSON.parse(b.effect_data); } catch {}
      const endTime = new Date(b.ends_at.replace(' ', 'T') + 'Z');
      const remainingMs = Math.max(0, endTime - Date.now());
      const remainingMinutes = Math.ceil(remainingMs / 60000);

      return {
        id: b.id,
        buffKey: b.buff_key,
        buffName: b.buff_name,
        effectData,
        startedAt: b.started_at,
        endsAt: b.ends_at,
        remainingMinutes,
        remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000)),
        tier: effectData.tier || 'unknown'
      };
    });

    res.json({
      success: true,
      playerId,
      buffs: activeBuffs,
      count: activeBuffs.length
    });
  } catch (e) {
    console.error('[buff/status] 错误:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * POST /api/buff/claim
 * 玩家领取buff效果（标记为claimed，应用到玩家属性）
 * Body: { player_id, buff_key }
 */
router.post('/claim', (req, res) => {
  if (!db) return res.status(500).json({ success: false, message: '数据库未初始化' });

  try {
    const playerId = parseInt(req.body.player_id || req.body.userId || req.body.playerId || 1);
    const buffKey = req.body.buff_key || 'buff_plane_chosen';
    const now = getShanghaiDateStr();

    // 查询有效buff
    const buff = db.prepare(`
      SELECT * FROM player_buffs
      WHERE player_id = ? AND buff_key = ? AND ends_at > ? AND claimed = 0
    `).get(playerId, buffKey, now);

    if (!buff) {
      return res.json({
        success: false,
        message: '无有效buff可领取或已过期'
      });
    }

    let effectData = {};
    try { effectData = JSON.parse(buff.effect_data); } catch {}

    // 标记为已领取
    db.prepare(`UPDATE player_buffs SET claimed = 1 WHERE id = ?`).run(buff.id);

    // 应用buff效果到玩家属性
    // ATK加成：更新玩家攻击力
    const player = db.prepare(`SELECT * FROM Users WHERE id = ?`).get(playerId);
    if (player && effectData.atkBonus > 0) {
      // 计算加成后的攻击力（临时存储到额外字段或记录到buff_effects表）
      const atkIncrease = Math.floor(player.attack * effectData.atkBonus / 100);
      // 记录buff效果到专门表
      db.prepare(`
        INSERT OR REPLACE INTO player_buffs (player_id, buff_key, buff_name, effect_data, started_at, ends_at, claimed)
        VALUES (?, ?, ?, ?, ?, ?, 2)
      `).run(
        playerId,
        buffKey + '_applied',
        buff.buff_name + '(已激活)',
        JSON.stringify({ ...effectData, atkIncrease, claimedAt: now }),
        buff.started_at,
        buff.ends_at
      );

      // 更新玩家临时属性（用player_buff_stats表记录激活的buff属性加成）
      db.exec(`
        CREATE TABLE IF NOT EXISTS player_buff_stats (
          player_id INTEGER PRIMARY KEY,
          atk_bonus INTEGER DEFAULT 0,
          exp_bonus INTEGER DEFAULT 0,
          updated_at TEXT DEFAULT (datetime('now'))
        );
      `);
      db.prepare(`
        INSERT OR REPLACE INTO player_buff_stats (player_id, atk_bonus, exp_bonus, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(playerId, effectData.atkBonus, effectData.expBonus, now);
    }

    const endTime = new Date(buff.ends_at.replace(' ', 'T') + 'Z');
    const remainingMinutes = Math.ceil(Math.max(0, endTime - Date.now()) / 60000);

    res.json({
      success: true,
      message: `成功激活${buff.buff_name}！`,
      buff: {
        buffKey: buff.buff_key,
        buffName: buff.buff_name,
        effectData,
        remainingMinutes,
        tier: effectData.tier
      },
      rewards: {
        attackBonus: effectData.atkBonus,
        expBonus: effectData.expBonus,
        description: `攻击+${effectData.atkBonus}%，修炼经验+${effectData.expBonus}%`
      }
    });
  } catch (e) {
    console.error('[buff/claim] 错误:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * POST /api/buff/login
 * 登录时自动检查并发放buff（由前端登录流程调用）
 * Body: { player_id }
 */
router.post('/login', (req, res) => {
  try {
    const playerId = parseInt(req.body.player_id || req.body.userId || req.body.playerId || 1);

    // 记录此次登录时间
    const now = getShanghaiDateStr();

    // 检查离线时长
    const offlineMinutes = getOfflineMinutes(playerId);

    // 发放buff
    const granted = checkAndGrantBuff(playerId);

    // 更新最后在线时间
    if (db) {
      try {
        db.prepare(`
          INSERT OR REPLACE INTO player_offline_log (player_id, last_logout_at, updated_at)
          VALUES (?, ?, ?)
        `).run(playerId, now, now);
      } catch (e) {}
    }

    if (granted) {
      res.json({
        success: true,
        offlineMinutes,
        buffGranted: granted,
        message: `离线${Math.floor(offlineMinutes / 60)}小时${offlineMinutes % 60}分钟，获得位面之子庇护！`
      });
    } else if (offlineMinutes > 0 && offlineMinutes < 30) {
      res.json({
        success: true,
        offlineMinutes,
        buffGranted: null,
        message: `离线${offlineMinutes}分钟，还差${30 - offlineMinutes}分钟可获得位面之子庇护`
      });
    } else {
      res.json({
        success: true,
        offlineMinutes,
        buffGranted: null,
        message: '欢迎回来，位面之子！'
      });
    }
  } catch (e) {
    console.error('[buff/login] 错误:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * POST /api/buff/logout
 * 记录玩家离线（前端离开页面时调用）
 * Body: { player_id }
 */
router.post('/logout', (req, res) => {
  try {
    const playerId = parseInt(req.body.player_id || req.body.userId || req.body.playerId || 1);
    recordLogout(playerId);
    res.json({ success: true, message: '离线时间已记录' });
  } catch (e) {
    console.error('[buff/logout] 错误:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * GET /api/buff/effect
 * 获取玩家激活的buff属性加成（供战斗/修炼系统调用）
 * 查询参数: player_id
 * 返回: { atkBonus, expBonus } 供调用方直接使用
 */
router.get('/effect', (req, res) => {
  if (!db) return res.status(500).json({ success: false, message: '数据库未初始化' });

  try {
    const playerId = parseInt(req.query.player_id || req.query.userId || 1);
    const now = getShanghaiDateStr();

    // 查找已激活的buff属性加成
    const stats = db.prepare(`
      SELECT * FROM player_buff_stats WHERE player_id = ?
    `).get(playerId);

    if (!stats) {
      return res.json({ success: true, atkBonus: 0, expBonus: 0 });
    }

    // 检查是否有未过期的激活buff
    const activeApplied = db.prepare(`
      SELECT * FROM player_buffs
      WHERE player_id = ? AND buff_key LIKE 'buff_plane_chosen_%' AND ends_at > ? AND claimed = 2
    `).all(playerId, now);

    if (activeApplied.length === 0) {
      // buff已过期，清除加成
      db.prepare(`DELETE FROM player_buff_stats WHERE player_id = ?`).run(playerId);
      return res.json({ success: true, atkBonus: 0, expBonus: 0 });
    }

    res.json({
      success: true,
      atkBonus: stats.atk_bonus || 0,
      expBonus: stats.exp_bonus || 0,
      description: stats.atk_bonus > 0 ? `攻击+${stats.atk_bonus}%，经验+${stats.exp_bonus}%` : '无激活buff'
    });
  } catch (e) {
    console.error('[buff/effect] 错误:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ==================== 模块导出 ====================

module.exports = router;
module.exports.checkAndGrantBuff = checkAndGrantBuff;
module.exports.recordLogout = recordLogout;
module.exports.calcBuffEffect = calcBuffEffect;
module.exports.getOfflineMinutes = getOfflineMinutes;
