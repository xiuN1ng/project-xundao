/**
 * 仙道盛典/节日活动系统 API
 * 寻道修仙 - Festival Events System
 */

const express = require('express');
const router = express.Router();
const path = require('path');

// Logger
const Logger = {
  info: (...args) => console.log('[festival]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[festival:error]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[festival:warn]', new Date().toISOString(), ...args)
};

// 数据库路径
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  Logger.info('数据库连接成功');
} catch (e) {
  Logger.error('数据库连接失败:', e.message);
  db = {
    _data: {}, prepare() { return this; }, get() { return null; },
    all() { return []; }, run() { return { changes: 0 }; }
  };
}

// ==================== 数据库初始化 ====================

function initFestivalTables() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS festival_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        festival_type TEXT NOT NULL DEFAULT 'spring',
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        rewards TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'active',
        config_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS festival_participation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        event_id INTEGER NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        claimed TEXT NOT NULL DEFAULT '[]',
        sign_days TEXT NOT NULL DEFAULT '[]',
        last_sign_date TEXT,
        total_recharge INTEGER DEFAULT 0,
        total_consume INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(player_id, event_id)
      );

      CREATE TABLE IF NOT EXISTS festival_sign_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        event_id INTEGER NOT NULL,
        sign_date TEXT NOT NULL,
        day_index INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(player_id, event_id, sign_date)
      );
    `);
    Logger.info('节日活动表初始化完成');
  } catch (e) {
    Logger.error('初始化 festival_events 表失败:', e.message);
  }
}

// 初始化表
initFestivalTables();

// ==================== 种子数据：春节默认活动 ====================

function seedSpringFestival() {
  if (!db) return;
  try {
    const existing = db.prepare("SELECT id FROM festival_events WHERE festival_type = 'spring' AND type = 'sign' LIMIT 1").get();
    if (existing) {
      Logger.info('春节活动已存在，跳过种子数据');
      return;
    }

    // 春节签到活动 - 永久开启
    const signRewards = JSON.stringify([
      { day: 1, items: [{ id: 1, name: '灵石', count: 1000, icon: '💰' }] },
      { day: 2, items: [{ id: 2, name: '灵气丹', count: 5, icon: '⚗️' }] },
      { day: 3, items: [{ id: 3, name: '经验卷轴', count: 3, icon: '📜' }] },
      { day: 4, items: [{ id: 4, name: '筑基丹', count: 1, icon: '💊' }] },
      { day: 5, items: [{ id: 5, name: '灵石', count: 5000, icon: '💰' }] },
      { day: 6, items: [{ id: 6, name: '灵兽蛋', count: 1, icon: '🥚' }] },
      { day: 7, items: [{ id: 7, name: '橙色装备', count: 1, icon: '⚔️' }] }
    ]);

    db.prepare(`
      INSERT INTO festival_events (name, type, festival_type, start_time, end_time, rewards, status, config_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      '春节庆典·仙道盛典',
      'sign',
      'spring',
      '2024-01-01 00:00:00',
      '2099-12-31 23:59:59',
      signRewards,
      'active',
      JSON.stringify({
        duration: 7,
        canSkip: false,
        resetOnNewYear: false,
        bonusMultiplier: 1.5
      })
    );

    // 春节累计充值活动
    const rechargeRewards = JSON.stringify([
      { threshold: 100, items: [{ id: 1, name: '灵石', count: 1000 }] },
      { threshold: 500, items: [{ id: 2, name: '灵气丹', count: 10 }] },
      { threshold: 1000, items: [{ id: 3, name: '橙色灵兽', count: 1 }] },
      { threshold: 5000, items: [{ id: 4, name: '仙兽蛋', count: 1 }] }
    ]);

    db.prepare(`
      INSERT INTO festival_events (name, type, festival_type, start_time, end_time, rewards, status, config_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      '春节·累计充值豪礼',
      'recharge',
      'spring',
      '2024-01-01 00:00:00',
      '2099-12-31 23:59:59',
      rechargeRewards,
      'active',
      JSON.stringify({ threshold_type: 'cumulative' })
    );

    // 春节累计消费活动
    const consumeRewards = JSON.stringify([
      { threshold: 500, items: [{ id: 1, name: '灵石', count: 800 }] },
      { threshold: 2000, items: [{ id: 2, name: '经验卷轴', count: 10 }] },
      { threshold: 5000, items: [{ id: 3, name: '天魔解体', count: 1 }] }
    ]);

    db.prepare(`
      INSERT INTO festival_events (name, type, festival_type, start_time, end_time, rewards, status, config_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      '春节·消费返利',
      'consume',
      'spring',
      '2024-01-01 00:00:00',
      '2099-12-31 23:59:59',
      consumeRewards,
      'active',
      JSON.stringify({ threshold_type: 'cumulative' })
    );

    // 春节双倍经验活动
    db.prepare(`
      INSERT INTO festival_events (name, type, festival_type, start_time, end_time, rewards, status, config_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      '春节·双倍修炼盛典',
      'double_exp',
      'spring',
      '2024-01-01 00:00:00',
      '2099-12-31 23:59:59',
      JSON.stringify([]),
      'active',
      JSON.stringify({ multiplier: 2.0, buff_type: 'exp', duration_hours: 24 })
    );

    // 春节节日兑换
    const exchangeItems = JSON.stringify([
      { item_id: 101, name: '春节灯笼', cost: 10, exchange_limit: 99 },
      { item_id: 102, name: '红包', cost: 50, exchange_limit: 10 },
      { item_id: 103, name: '烟花', cost: 100, exchange_limit: 5 },
      { item_id: 104, name: '仙桃', cost: 200, exchange_limit: 3 }
    ]);

    db.prepare(`
      INSERT INTO festival_events (name, type, festival_type, start_time, end_time, rewards, status, config_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      '春节·节日兑换商店',
      'exchange',
      'spring',
      '2024-01-01 00:00:00',
      '2099-12-31 23:59:59',
      exchangeItems,
      'active',
      JSON.stringify({ currency_name: '春节积分', currency_icon: '🧧' })
    );

    Logger.info('春节活动种子数据插入完成');
  } catch (e) {
    Logger.error('种子数据插入失败:', e.message);
  }
}

seedSpringFestival();

// ==================== 中间件 ====================

// 获取并验证玩家ID
function getPlayerId(req) {
  const playerId = req.headers['x-player-id'] || req.query.player_id || req.body?.player_id;
  if (!playerId) return null;
  return parseInt(playerId);
}

// 统一的响应格式
function json(res, data, error = null) {
  if (error) {
    return res.status(400).json({ success: false, error });
  }
  return res.json({ success: true, ...data });
}

// ==================== API 路由 ====================

/**
 * GET /api/festival/list
 * 获取节日活动列表（当前/即将/已结束）
 */
router.get('/list', (req, res) => {
  try {
    if (!db) return json(res, { events: [] }, '数据库不可用');

    const now = new Date().toISOString();
    const events = db.prepare(`
      SELECT id, name, type, festival_type, start_time, end_time, rewards, status, config_json
      FROM festival_events
      ORDER BY
        CASE WHEN status = 'active' AND start_time <= ? AND end_time >= ? THEN 0
             WHEN status = 'upcoming' THEN 1
             ELSE 2 END,
        end_time ASC
    `).all(now, now);

    const formattedEvents = events.map(e => {
      const rewards = JSON.parse(e.rewards || '[]');
      const config = JSON.parse(e.config_json || '{}');
      const startTime = new Date(e.start_time);
      const endTime = new Date(e.end_time);
      const nowDate = new Date();

      let state = 'ended';
      if (e.status === 'active' && startTime <= nowDate && endTime >= nowDate) {
        state = 'active';
      } else if (startTime > nowDate) {
        state = 'upcoming';
      } else if (e.status === 'disabled') {
        state = 'disabled';
      }

      // 计算剩余时间
      let remainingMs = 0;
      if (state === 'active') {
        remainingMs = endTime - nowDate;
      } else if (state === 'upcoming') {
        remainingMs = startTime - nowDate;
      }

      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      const days = Math.floor(remainingSeconds / 86400);
      const hours = Math.floor((remainingSeconds % 86400) / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);

      // 活动类型中文名
      const typeNames = {
        sign: '节日签到',
        recharge: '累计充值',
        consume: '累计消费',
        login_gift: '登录送礼',
        limited_boss: '限时副本',
        double_exp: '双倍经验',
        exchange: '节日兑换'
      };

      const festivalTypeNames = {
        spring: '春节',
        dragon_boat: '端午',
        mid_autumn: '中秋',
        qixi: '七夕',
        anniversary: '周年庆',
        halloween: '万圣节',
        christmas: '圣诞节',
        newyear: '元旦'
      };

      return {
        id: e.id,
        name: e.name,
        type: e.type,
        typeName: typeNames[e.type] || e.type,
        festivalType: e.festival_type,
        festivalTypeName: festivalTypeNames[e.festival_type] || e.festival_type,
        startTime: e.start_time,
        endTime: e.end_time,
        state,
        remainingTime: {
          seconds: remainingSeconds,
          days,
          hours,
          minutes,
          formatted: days > 0 ? `${days}天${hours}时` : `${hours}时${minutes}分`
        },
        rewards,
        config,
        status: e.status
      };
    });

    // 按状态分组
    const active = formattedEvents.filter(e => e.state === 'active');
    const upcoming = formattedEvents.filter(e => e.state === 'upcoming');
    const ended = formattedEvents.filter(e => e.state === 'ended');

    json(res, { events: formattedEvents, active, upcoming, ended });
  } catch (e) {
    Logger.error('获取活动列表失败:', e.message);
    json(res, { events: [] }, e.message);
  }
});

/**
 * GET /api/festival/info/:id
 * 获取活动详情
 */
router.get('/info/:id', (req, res) => {
  try {
    if (!db) return json(res, null, '数据库不可用');

    const eventId = parseInt(req.params.id);
    const playerId = getPlayerId(req);

    const event = db.prepare(`
      SELECT * FROM festival_events WHERE id = ?
    `).get(eventId);

    if (!event) return json(res, null, '活动不存在');

    const rewards = JSON.parse(event.rewards || '[]');
    const config = JSON.parse(event.config_json || '{}');

    // 获取玩家参与进度
    let participation = null;
    if (playerId) {
      participation = db.prepare(`
        SELECT * FROM festival_participation WHERE player_id = ? AND event_id = ?
      `).get(playerId, eventId);

      if (participation) {
        participation.claimed = JSON.parse(participation.claimed || '[]');
        participation.sign_days = JSON.parse(participation.sign_days || '[]');
      }
    }

    // 计算活动状态
    const now = new Date();
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    let state = 'ended';
    if (event.status === 'active' && startTime <= now && endTime >= now) state = 'active';
    else if (startTime > now) state = 'upcoming';

    json(res, {
      event: {
        id: event.id,
        name: event.name,
        type: event.type,
        festivalType: event.festival_type,
        startTime: event.start_time,
        endTime: event.end_time,
        state,
        rewards,
        config,
        status: event.status
      },
      participation
    });
  } catch (e) {
    Logger.error('获取活动详情失败:', e.message);
    json(res, null, e.message);
  }
});

/**
 * POST /api/festival/claim/:id
 * 领取活动奖励
 */
router.post('/claim/:id', (req, res) => {
  try {
    if (!db) return json(res, null, '数据库不可用');

    const eventId = parseInt(req.params.id);
    const playerId = getPlayerId(req);
    if (!playerId) return json(res, null, '缺少玩家ID');

    const event = db.prepare(`SELECT * FROM festival_events WHERE id = ?`).get(eventId);
    if (!event) return json(res, null, '活动不存在');

    // 检查活动状态
    const now = new Date();
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    if (startTime > now) return json(res, null, '活动尚未开始');
    if (endTime < now) return json(res, null, '活动已结束');
    if (event.status !== 'active') return json(res, null, '活动已关闭');

    // 获取或创建参与记录
    let participation = db.prepare(`
      SELECT * FROM festival_participation WHERE player_id = ? AND event_id = ?
    `).get(playerId, eventId);

    if (!participation) {
      db.prepare(`
        INSERT INTO festival_participation (player_id, event_id, progress, claimed)
        VALUES (?, ?, 0, '[]')
      `).run(playerId, eventId);
      participation = { claimed: '[]', sign_days: '[]' };
    }

    const claimed = JSON.parse(participation.claimed || '[]');
    const rewards = JSON.parse(event.rewards || '[]');
    const config = JSON.parse(event.config_json || '{}');

    let rewardToClaim = null;
    let rewardIndex = -1;

    switch (event.type) {
      case 'sign': {
        // 签到奖励：按天领取
        const dayIndex = parseInt(req.body?.dayIndex || req.body?.day);
        if (dayIndex === undefined || dayIndex === null) {
          return json(res, null, '缺少签到天数参数');
        }
        if (claimed.includes(dayIndex)) {
          return json(res, null, '今日奖励已领取');
        }
        const signDays = JSON.parse(participation.sign_days || '[]');
        if (!signDays.includes(dayIndex)) {
          return json(res, null, '请先完成签到');
        }
        rewardIndex = dayIndex - 1;
        if (rewardIndex >= 0 && rewardIndex < rewards.length) {
          rewardToClaim = rewards[rewardIndex];
          claimed.push(dayIndex);
        }
        break;
      }
      case 'recharge':
      case 'consume': {
        // 阶梯奖励：领取已达到的未领取阶梯
        const threshold = parseInt(req.body?.threshold);
        if (!threshold) return json(res, null, '缺少阶梯参数');
        if (claimed.includes(threshold)) return json(res, null, '该阶梯奖励已领取');

        const progress = participation.total_recharge || 0;
        const pConsume = participation.total_consume || 0;
        const current = event.type === 'recharge' ? progress : pConsume;

        if (current < threshold) return json(res, null, '未达到领取条件');

        rewardToClaim = rewards.find(r => r.threshold === threshold);
        if (rewardToClaim) {
          claimed.push(threshold);
          rewardIndex = threshold;
        }
        break;
      }
      case 'login_gift': {
        // 每日登录礼包
        const today = new Date().toISOString().split('T')[0];
        if (claimed.includes(today)) return json(res, null, '今日奖励已领取');
        rewardToClaim = rewards[0];
        claimed.push(today);
        break;
      }
      default:
        return json(res, null, '该活动不支持直接领取');
    }

    if (!rewardToClaim) return json(res, null, '奖励配置不存在');

    // 更新领取记录
    db.prepare(`
      UPDATE festival_participation
      SET claimed = ?, updated_at = datetime('now')
      WHERE player_id = ? AND event_id = ?
    `).run(JSON.stringify(claimed), playerId, eventId);

    Logger.info(`[festival] 玩家${playerId}领取活动${eventId}奖励:`, rewardToClaim);

    json(res, {
      claimed: true,
      reward: rewardToClaim,
      allClaimed: claimed
    });
  } catch (e) {
    Logger.error('领取奖励失败:', e.message);
    json(res, null, e.message);
  }
});

/**
 * POST /api/festival/sign
 * 节日签到
 */
router.post('/sign', (req, res) => {
  try {
    if (!db) return json(res, null, '数据库不可用');

    const eventId = parseInt(req.body?.event_id || req.query?.event_id);
    const playerId = getPlayerId(req);
    if (!playerId) return json(res, null, '缺少玩家ID');
    if (!eventId) return json(res, null, '缺少活动ID');

    const event = db.prepare(`SELECT * FROM festival_events WHERE id = ?`).get(eventId);
    if (!event) return json(res, null, '活动不存在');

    if (event.type !== 'sign') return json(res, null, '该活动不是签到类型');

    const now = new Date();
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    if (startTime > now) return json(res, null, '活动尚未开始');
    if (endTime < now) return json(res, null, '活动已结束');

    const today = now.toISOString().split('T')[0];

    // 检查今日是否已签到
    const todayRecord = db.prepare(`
      SELECT id FROM festival_sign_records
      WHERE player_id = ? AND event_id = ? AND sign_date = ?
    `).get(playerId, eventId, today);

    if (todayRecord) return json(res, null, '今日已签到');

    // 获取或创建参与记录
    let participation = db.prepare(`
      SELECT * FROM festival_participation WHERE player_id = ? AND event_id = ?
    `).get(playerId, eventId);

    const signDays = participation ? JSON.parse(participation.sign_days || '[]') : [];
    const newDayIndex = signDays.length + 1;

    if (!participation) {
      db.prepare(`
        INSERT INTO festival_participation (player_id, event_id, progress, sign_days, last_sign_date)
        VALUES (?, ?, ?, ?, ?)
      `).run(playerId, eventId, newDayIndex, JSON.stringify([newDayIndex]), today);
    } else {
      signDays.push(newDayIndex);
      db.prepare(`
        UPDATE festival_participation
        SET progress = ?, sign_days = ?, last_sign_date = ?, updated_at = datetime('now')
        WHERE player_id = ? AND event_id = ?
      `).run(newDayIndex, JSON.stringify(signDays), today, playerId, eventId);
    }

    // 记录签到
    db.prepare(`
      INSERT OR IGNORE INTO festival_sign_records (player_id, event_id, sign_date, day_index)
      VALUES (?, ?, ?, ?)
    `).run(playerId, eventId, today, newDayIndex);

    // 计算奖励
    const rewards = JSON.parse(event.rewards || '[]');
    const todayReward = rewards.find(r => r.day === newDayIndex) || rewards[signDays.length - 1];

    Logger.info(`[festival] 玩家${playerId}签到活动${eventId}第${newDayIndex}天`);

    json(res, {
      signed: true,
      dayIndex: newDayIndex,
      reward: todayReward || null,
      totalDays: newDayIndex,
      continuous: true
    });
  } catch (e) {
    Logger.error('签到失败:', e.message);
    json(res, null, e.message);
  }
});

/**
 * GET /api/festival/rank
 * 活动排行榜（基于累计充值/消费排名）
 */
router.get('/rank', (req, res) => {
  try {
    if (!db) return json(res, { ranks: [] }, '数据库不可用');

    const eventId = parseInt(req.query.event_id || 0);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = parseInt(req.query.offset) || 0;

    if (!eventId) return json(res, { ranks: [] }, '缺少活动ID');

    const event = db.prepare(`SELECT * FROM festival_events WHERE id = ?`).get(eventId);
    if (!event) return json(res, { ranks: [] }, '活动不存在');

    // 查询该活动的参与记录并关联用户
    let rankField = 'total_recharge';
    if (event.type === 'consume') rankField = 'total_consume';

    const ranks = db.prepare(`
      SELECT
        p.player_id,
        u.username,
        u.level,
        u.realm,
        p.${rankField} as score,
        p.progress,
        p.updated_at
      FROM festival_participation p
      LEFT JOIN Users u ON u.id = p.player_id
      WHERE p.event_id = ?
      ORDER BY p.${rankField} DESC
      LIMIT ? OFFSET ?
    `).all(eventId, limit, offset);

    // 获取当前玩家排名
    const playerId = getPlayerId(req);
    let myRank = null;
    if (playerId) {
      const myRecord = db.prepare(`
        SELECT COUNT(*) + 1 as rank
        FROM festival_participation
        WHERE event_id = ? AND ${rankField} > (
          SELECT ${rankField} FROM festival_participation WHERE player_id = ? AND event_id = ?
        )
      `).get(eventId, playerId, eventId);
      myRank = myRecord?.rank || null;
    }

    const formattedRanks = ranks.map((r, idx) => ({
      rank: offset + idx + 1,
      playerId: r.player_id,
      username: r.username || `修士${r.player_id}`,
      level: r.level || 1,
      realm: r.realm || 1,
      score: r.score || 0,
      progress: r.progress || 0
    }));

    json(res, { ranks: formattedRanks, myRank, eventId, eventType: event.type });
  } catch (e) {
    Logger.error('获取排行榜失败:', e.message);
    json(res, { ranks: [], myRank: null }, e.message);
  }
});

/**
 * POST /api/festival/update-progress
 * 更新玩家活动进度（充值/消费触发）
 */
router.post('/update-progress', (req, res) => {
  try {
    if (!db) return json(res, null, '数据库不可用');

    const playerId = getPlayerId(req);
    if (!playerId) return json(res, null, '缺少玩家ID');

    const { type, amount } = req.body;
    if (!type || !amount) return json(res, null, '缺少参数');

    const now = new Date().toISOString();

    // 找出所有活跃的对应类型活动
    const events = db.prepare(`
      SELECT * FROM festival_events
      WHERE type = ? AND status = 'active' AND start_time <= ? AND end_time >= ?
    `).all(type, now, now);

    const updated = [];
    for (const event of events) {
      let participation = db.prepare(`
        SELECT * FROM festival_participation WHERE player_id = ? AND event_id = ?
      `).get(playerId, event.id);

      if (!participation) {
        db.prepare(`
          INSERT INTO festival_participation (player_id, event_id, progress, claimed)
          VALUES (?, ?, 0, '[]')
        `).run(playerId, event.id);
        participation = { total_recharge: 0, total_consume: 0, claimed: '[]' };
      }

      const field = type === 'recharge' ? 'total_recharge' : 'total_consume';
      const newValue = (participation[field] || 0) + parseInt(amount);

      db.prepare(`
        UPDATE festival_participation
        SET ${field} = ?, updated_at = datetime('now')
        WHERE player_id = ? AND event_id = ?
      `).run(newValue, playerId, event.id);

      updated.push({ eventId: event.id, newValue });
    }

    json(res, { updated });
  } catch (e) {
    Logger.error('更新活动进度失败:', e.message);
    json(res, null, e.message);
  }
});

/**
 * POST /api/festival/exchange
 * 节日兑换
 */
router.post('/exchange', (req, res) => {
  try {
    if (!db) return json(res, null, '数据库不可用');

    const eventId = parseInt(req.body?.event_id);
    const itemId = parseInt(req.body?.item_id);
    const playerId = getPlayerId(req);
    if (!playerId) return json(res, null, '缺少玩家ID');
    if (!eventId || !itemId) return json(res, null, '缺少参数');

    const event = db.prepare(`SELECT * FROM festival_events WHERE id = ?`).get(eventId);
    if (!event) return json(res, null, '活动不存在');
    if (event.type !== 'exchange') return json(res, null, '该活动不是兑换类型');

    const now = new Date();
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    if (startTime > now) return json(res, null, '活动尚未开始');
    if (endTime < now) return json(res, null, '活动已结束');

    const rewards = JSON.parse(event.rewards || '[]');
    const exchangeItem = rewards.find(r => r.item_id === itemId);
    if (!exchangeItem) return json(res, null, '兑换物品不存在');

    // 检查玩家积分/代币（暂用progress字段存储代币数量，实际需要额外表字段）
    let participation = db.prepare(`
      SELECT * FROM festival_participation WHERE player_id = ? AND event_id = ?
    `).get(playerId, eventId);

    if (!participation) {
      db.prepare(`INSERT INTO festival_participation (player_id, event_id, progress) VALUES (?, ?, 0)`)
        .run(playerId, eventId);
      participation = { progress: 0, claimed: '[]' };
    }

    // 检查代币是否足够
    if ((participation.progress || 0) < exchangeItem.cost) {
      return json(res, null, `代币不足，需要${exchangeItem.cost}代币`);
    }

    // 检查兑换限制
    const claimed = JSON.parse(participation.claimed || '[]');
    const exchangeKey = `${itemId}`;
    const exchangeCount = claimed.filter(c => c.startsWith(exchangeKey + ':')).length;
    if (exchangeItem.exchange_limit && exchangeCount >= exchangeItem.exchange_limit) {
      return json(res, null, '已达到兑换上限');
    }

    // 扣除代币并记录
    const newProgress = participation.progress - exchangeItem.cost;
    claimed.push(`${itemId}:1`);

    db.prepare(`
      UPDATE festival_participation
      SET progress = ?, claimed = ?, updated_at = datetime('now')
      WHERE player_id = ? AND event_id = ?
    `).run(newProgress, JSON.stringify(claimed), playerId, eventId);

    Logger.info(`[festival] 玩家${playerId}兑换活动${eventId}物品${itemId}`);

    json(res, {
      exchanged: true,
      item: exchangeItem,
      remainingCurrency: newProgress
    });
  } catch (e) {
    Logger.error('兑换失败:', e.message);
    json(res, null, e.message);
  }
});

module.exports = router;
