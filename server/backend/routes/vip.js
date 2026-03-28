const express = require('express');
const router = express.Router();
const path = require('path');

// 玩家内存数据（来自 player.js）
let playerModule;
try {
  playerModule = require('./player');
} catch (e) {
  // 后备：模拟玩家对象
  playerModule = { _player: { id: 1, vipLevel: 1, vipPoints: 0, diamonds: 99999, spirit_stones: 999999999 } };
}

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
} catch (err) {
  db = null;
}

// 获取玩家内存数据
function getPlayerData(userId) {
  if (playerModule._player && playerModule._player.id === userId) {
    return playerModule._player;
  }
  // 遍历查找
  const keys = Object.keys(playerModule).filter(k => k.startsWith('_player'));
  for (const k of keys) {
    if (playerModule[k] && playerModule[k].id === userId) return playerModule[k];
  }
  // 如果只有一个玩家，直接返回
  if (playerModule._player) return playerModule._player;
  return null;
}

// VIP等级配置（来自 vip_system.js）
const VIP_LEVELS = {
  1: { name: 'VIP1', nameCn: '筑基仙人', cost: 6,   dailyBonus: 50,   dropRate: 0.1, benefits: ['每日灵石+50', '掉落概率+10%'] },
  2: { name: 'VIP2', nameCn: '金丹真人', cost: 30,  dailyBonus: 150,  dropRate: 0.2, benefits: ['每日灵石+150', '掉落概率+20%', '专属称号'] },
  3: { name: 'VIP3', nameCn: '元婴老怪', cost: 98,  dailyBonus: 300,  dropRate: 0.3, benefits: ['每日灵石+300', '掉落概率+30%', '专属称号', '经验加成+10%'] },
  4: { name: 'VIP4', nameCn: '化神大能', cost: 298, dailyBonus: 500,  dropRate: 0.4, benefits: ['每日灵石+500', '掉落概率+40%', '专属称号', '经验加成+20%', '副本掉落+1'] },
  5: { name: 'VIP5', nameCn: '炼虚尊者', cost: 648, dailyBonus: 1000, dropRate: 0.5, benefits: ['每日灵石+1000', '掉落概率+50%', '专属称号', '经验加成+30%', '副本掉落+2', '可直接跳过战斗'] },
  6: { name: 'VIP6', nameCn: '合体期大能', cost: 1298, dailyBonus: 2000, dropRate: 0.6, benefits: ['每日灵石+2000', '掉落概率+60%', '专属称号', '经验加成+40%', '副本掉落+3', '跳过战斗', '专属外观'] }
};

// 月卡配置
const MONTHLY_CARDS = {
  gem: {
    id: 'gem',
    name: '灵石月卡',
    cost: 100,       // 钻石价格
    dailyReward: { type: 'spirit_stones', amount: 500 },
    description: '每日可领取500灵石'
  },
  diamond: {
    id: 'diamond',
    name: '钻石月卡',
    cost: 300,
    dailyReward: { type: 'diamonds', amount: 50 },
    description: '每日可领取50钻石'
  }
};

// 内存存储（月卡状态）
const monthlyCardState = new Map(); // userId -> { cardType, purchaseTime, lastClaimTime, expireTime }

// 初始化月卡表 + DB迁移
function initTables() {
  if (!db) return;
  try {
    // 添加 vip_points 列到 Users 表（如不存在）
    try {
      db.exec("ALTER TABLE Users ADD COLUMN vip_points INTEGER DEFAULT 0");
    } catch (e) { /* column may already exist */ }

    db.prepare(`
      CREATE TABLE IF NOT EXISTS vip_monthly_cards (
        user_id INTEGER PRIMARY KEY,
        card_type TEXT NOT NULL,
        purchase_time INTEGER NOT NULL,
        last_claim_time INTEGER,
        expire_time INTEGER NOT NULL
      )
    `).run();
  } catch (e) {}
}
initTables();

// 加载玩家月卡数据
function loadMonthlyCard(userId) {
  if (!db) return monthlyCardState.get(userId) || null;
  try {
    const row = db.prepare('SELECT * FROM vip_monthly_cards WHERE user_id = ?').get(userId);
    if (row) {
      const state = {
        cardType: row.card_type,
        purchaseTime: row.purchase_time,
        lastClaimTime: row.last_claim_time,
        expireTime: row.expire_time
      };
      monthlyCardState.set(userId, state);
      return state;
    }
  } catch (e) {}
  return null;
}

// 保存月卡数据
function saveMonthlyCard(userId, state) {
  monthlyCardState.set(userId, state);
  if (!db) return;
  try {
    const existing = db.prepare('SELECT user_id FROM vip_monthly_cards WHERE user_id = ?').get(userId);
    if (existing) {
      db.prepare(`UPDATE vip_monthly_cards SET card_type=?, purchase_time=?, last_claim_time=?, expire_time=? WHERE user_id=?`)
        .run(state.cardType, state.purchaseTime, state.lastClaimTime || 0, state.expireTime, userId);
    } else {
      db.prepare(`INSERT INTO vip_monthly_cards (user_id, card_type, purchase_time, last_claim_time, expire_time) VALUES (?,?,?,?,?)`)
        .run(userId, state.cardType, state.purchaseTime, state.lastClaimTime || 0, state.expireTime);
    }
  } catch (e) {}
}

// 获取VIP信息（根路由）
router.get('/', (req, res) => {
  // 兼容 player_id / userId / user_id 等多种参数名
  const userId = parseInt(req.query.userId || req.query.player_id || req.query.user_id) || 1;
  try {
    let vipLevel = 0, vipPoints = 0;

    // 优先从 Users 表读取真实 VIP 数据（VIP0 = 普通玩家，无任何特权）
    if (db) {
      const user = db.prepare('SELECT vipLevel, vip_points FROM Users WHERE id = ?').get(userId);
      if (user) {
        vipLevel = user.vipLevel || 0;
        vipPoints = user.vip_points || 0;
      }
    } else {
      // 后备：使用内存中的玩家数据
      const playerData = getPlayerData(userId);
      if (playerData) {
        vipLevel = playerData.vipLevel || playerData.vip_level || 0;
        vipPoints = playerData.vipPoints || playerData.vip_points || 0;
      }
    }

    const card = loadMonthlyCard(userId);
    const now = Date.now();
    const hasActiveCard = card && card.expireTime > now;
    const nextClaimTime = hasActiveCard
      ? card.lastClaimTime
        ? card.lastClaimTime + 86400000
        : now
      : null;

    res.json({
      success: true,
      vip: {
        level: vipLevel,
        points: vipPoints,
        name: VIP_LEVELS[vipLevel]?.nameCn || '普通玩家',
        benefits: VIP_LEVELS[vipLevel]?.benefits || [],
        dailyBonus: VIP_LEVELS[vipLevel]?.dailyBonus || 0,
        dropRate: VIP_LEVELS[vipLevel]?.dropRate || 0
      },
      monthlyCard: hasActiveCard ? {
        type: card.cardType,
        expireTime: card.expireTime,
        nextClaimTime,
        config: MONTHLY_CARDS[card.cardType]
      } : null,
      levels: VIP_LEVELS
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 购买VIP等级
router.post('/buy', (req, res) => {
  const userId = parseInt(req.body.userId) || 1;
  const { level } = req.body;

  if (!level || !VIP_LEVELS[level]) {
    return res.json({ success: false, error: '无效的VIP等级' });
  }

  try {
    // 使用内存中的玩家数据
    const playerData = getPlayerData(userId);
    if (!playerData) return res.json({ success: false, error: '玩家不存在' });

    const targetLevel = VIP_LEVELS[level];
    const currentLevel = playerData.vipLevel || playerData.vip_level || 0;

    if (level <= currentLevel) {
      return res.json({ success: false, error: '当前VIP等级已更高' });
    }

    if ((playerData.diamonds || 0) < targetLevel.cost) {
      return res.json({ success: false, error: '钻石不足' });
    }

    // 更新内存中的玩家数据
    playerData.diamonds = (playerData.diamonds || 0) - targetLevel.cost;
    playerData.vipLevel = level;
    playerData.vipPoints = (playerData.vipPoints || playerData.vip_points || 0) + targetLevel.cost * 10;
    // 同步 vip_level 字段
    playerData.vip_level = level;
    playerData.vip_points = playerData.vipPoints;

    res.json({ success: true, level, vipName: targetLevel.nameCn, message: `恭喜成为${targetLevel.nameCn}！` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 购买月卡
router.post('/buy-month-card', (req, res) => {
  const userId = parseInt(req.body.userId) || 1;
  const { cardType } = req.body;

  if (!cardType || !MONTHLY_CARDS[cardType]) {
    return res.json({ success: false, error: '无效的月卡类型' });
  }

  try {
    const playerData = getPlayerData(userId);
    if (!playerData) return res.json({ success: false, error: '玩家不存在' });

    const card = MONTHLY_CARDS[cardType];
    if ((playerData.diamonds || 0) < card.cost) {
      return res.json({ success: false, error: '钻石不足' });
    }

    const now = Date.now();
    const expireTime = now + 30 * 86400000; // 30天

    const existing = loadMonthlyCard(userId);
    if (existing && existing.expireTime > now) {
      // 续费：追加30天
      const newExpire = Math.max(existing.expireTime, now) + 30 * 86400000;
      saveMonthlyCard(userId, { ...existing, cardType, expireTime: newExpire, lastClaimTime: existing.lastClaimTime });
    } else {
      saveMonthlyCard(userId, { cardType, purchaseTime: now, lastClaimTime: null, expireTime });
    }

    // 更新内存数据
    playerData.diamonds = (playerData.diamonds || 0) - card.cost;

    res.json({ success: true, cardType, expireTime, message: `购买成功！月卡有效期至${new Date(expireTime).toLocaleDateString()}` });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/vip/info - 获取VIP详情（必须在 /:userId 之前，否则 /info 被当作 userId 解析为 NaN）
router.get('/info', (req, res) => {
  const userId = parseInt(req.query.userId || req.query.player_id || req.query.user_id) || 1;
  const playerData = getPlayerData(userId);
  // VIP0 = 普通玩家（不再默认 VIP1），必须通过支付或月卡才能激活 VIP
  const vipLevel = playerData?.vipLevel || playerData?.vip_level || 0;
  const vipPoints = playerData?.vipPoints || playerData?.vip_points || 0;
  const card = loadMonthlyCard(userId);
  const now = Date.now();
  const hasActiveCard = card && card.expireTime > now;
  res.json({
    success: true,
    vip: {
      level: vipLevel,
      points: vipPoints,
      name: VIP_LEVELS[vipLevel]?.nameCn || '普通玩家',
      benefits: VIP_LEVELS[vipLevel]?.benefits || [],
      dailyBonus: VIP_LEVELS[vipLevel]?.dailyBonus || 0,
      nextClaimTime: hasActiveCard ? (card.lastClaimTime ? card.lastClaimTime + 86400000 : now) : null,
    },
    monthlyCard: hasActiveCard ? { type: card.cardType, expireTime: card.expireTime } : null,
    spiritStones: playerData?.spirit_stones || 0,
  });
});

// 获取指定玩家的VIP信息（/:userId 端点）
router.get('/:userId', (req, res) => {
  // 兼容 player_id / userId path 参数
  const userId = parseInt(req.params.userId || req.params.player_id);
  if (!userId) return res.json({ success: false, error: '无效的玩家ID' });

  try {
    // 优先从 Users 表读取真实 VIP 数据
    let vipLevel = 0;
    let vipPoints = 0;
    let nickname = '修仙者';
    let diamonds = 0;
    let lingshi = 0;

    if (db) {
      const user = db.prepare('SELECT vipLevel, vip_points, nickname, diamonds, lingshi FROM Users WHERE id = ?').get(userId);
      if (user) {
        vipLevel = user.vipLevel || 0;
        vipPoints = user.vip_points || 0;
        nickname = user.nickname || '修仙者';
        diamonds = user.diamonds || 0;
        lingshi = Number(user.lingshi) || 0;
      }
    }

    // 月卡状态
    const card = loadMonthlyCard(userId);
    const now = Date.now();
    const hasActiveCard = card && card.expireTime > now;
    const nextClaimTime = hasActiveCard
      ? (card.lastClaimTime ? card.lastClaimTime + 86400000 : now)
      : null;

    res.json({
      success: true,
      vip: {
        level: vipLevel,
        points: vipPoints,
        name: VIP_LEVELS[vipLevel]?.nameCn || '普通玩家',
        benefits: VIP_LEVELS[vipLevel]?.benefits || [],
        dailyBonus: VIP_LEVELS[vipLevel]?.dailyBonus || 0,
        dropRate: VIP_LEVELS[vipLevel]?.dropRate || 0
      },
      monthlyCard: hasActiveCard ? {
        type: card.cardType,
        expireTime: card.expireTime,
        nextClaimTime,
        config: MONTHLY_CARDS[card.cardType]
      } : null,
      levels: VIP_LEVELS,
      // 附加玩家信息
      player: { nickname, diamonds, lingshi }
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 领取每日月卡奖励
router.post('/claim-daily', (req, res) => {
  const userId = parseInt(req.body.userId) || 1;
  const { cardType } = req.body;

  try {
    const now = Date.now();
    const cardState = loadMonthlyCard(userId);

    if (!cardState || cardState.expireTime <= now) {
      return res.json({ success: false, error: '无有效月卡或已过期' });
    }

    const requestedType = cardType || cardState.cardType;
    if (cardState.cardType !== requestedType) {
      return res.json({ success: false, error: '未拥有该类型月卡' });
    }

    // 检查是否已领取（24小时冷却）
    if (cardState.lastClaimTime && (now - cardState.lastClaimTime) < 86400000) {
      const nextClaim = cardState.lastClaimTime + 86400000;
      return res.json({ success: false, error: '今日已领取', nextClaimTime: nextClaim });
    }

    const card = MONTHLY_CARDS[cardState.cardType];
    const reward = card.dailyReward;

    // 更新内存中的玩家数据
    const playerData = getPlayerData(userId);
    if (playerData) {
      if (reward.type === 'spirit_stones') {
        playerData.spirit_stones = (playerData.spirit_stones || 0) + reward.amount;
        playerData.lingshi = playerData.spirit_stones; // 同步
      } else if (reward.type === 'diamonds') {
        playerData.diamonds = (playerData.diamonds || 0) + reward.amount;
      }
    }

    saveMonthlyCard(userId, { ...cardState, lastClaimTime: now });

    res.json({
      success: true,
      reward,
      message: `领取成功！获得${reward.amount}${reward.type === 'spirit_stones' ? '灵石' : '钻石'}`,
      nextClaimTime: now + 86400000
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// VIP每日福利领取
router.post('/benefits', (req, res) => {
  const userId = parseInt(req.body.userId) || parseInt(req.body.player_id) || (req.userId) || 1;

  try {
    if (!db) return res.json({ success: false, error: '数据库不可用' });

    // 确保 vip_daily_claims 表存在
    db.exec(`CREATE TABLE IF NOT EXISTS vip_daily_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      last_claim_time INTEGER,
      claim_date TEXT
    )`);

    // 获取玩家 VIP 等级
    const user = db.prepare('SELECT id, vip_level, vipLevel, lingshi FROM Users WHERE id = ?').get(userId);
    if (!user) return res.json({ success: false, error: '玩家不存在' });

    const vipLevel = user.vip_level || user.vipLevel || 0;
    if (vipLevel < 1) {
      return res.json({ success: false, error: 'VIP等级不足1级，无法领取每日福利' });
    }

    const vipConfig = VIP_LEVELS[vipLevel];
    if (!vipConfig) return res.json({ success: false, error: 'VIP等级配置异常' });

    const now = Date.now();
    // 使用上海时区日期字符串
    const todayStr = new Date(now + 8 * 3600000).toISOString().slice(0, 10);

    // 检查今日是否已领取
    const existing = db.prepare('SELECT claim_date FROM vip_daily_claims WHERE user_id = ?').get(userId);
    if (existing && existing.claim_date === todayStr) {
      const nextReset = new Date(now + 8 * 3600000);
      nextReset.setHours(24, 0, 0, 0);
      const nextResetTime = (nextReset.getTime() - 8 * 3600000);
      return res.json({ success: false, error: '今日已领取VIP福利，请明日再来', nextResetTime });
    }

    // 发放每日灵石福利
    const bonus = vipConfig.dailyBonus || 0;
    const newLingshi = (user.lingshi || 0) + bonus;
    db.prepare('UPDATE Users SET lingshi = ? WHERE id = ?').run(newLingshi, userId);

    // 写入领取记录
    db.prepare(`INSERT OR REPLACE INTO vip_daily_claims (user_id, last_claim_time, claim_date) VALUES (?, ?, ?)`).run(userId, now, todayStr);

    res.json({
      success: true,
      vipLevel,
      bonus,
      totalLingshi: newLingshi,
      message: `VIP${vipLevel}每日福利领取成功！获得${bonus}灵石`,
      benefits: vipConfig.benefits || [],
      nextResetTime: new Date(now + 8 * 3600000).setHours(24, 0, 0, 0) - 8 * 3600000
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
