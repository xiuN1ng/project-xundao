const express = require('express');
const router = express.Router();
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
} catch (err) {
  db = null;
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

// 初始化月卡表
function initTables() {
  if (!db) return;
  try {
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

// 获取VIP信息
router.get('/', (req, res) => {
  const userId = parseInt(req.query.userId) || 1;
  try {
    let vipLevel = 1, vipPoints = 0;

    if (db) {
      const player = db.prepare('SELECT vip_level, vip_points FROM player WHERE id = ?').get(userId);
      if (player) {
        vipLevel = player.vip_level || 1;
        vipPoints = player.vip_points || 0;
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
    if (db) {
      const player = db.prepare('SELECT * FROM player WHERE id = ?').get(userId);
      if (!player) return res.json({ success: false, error: '玩家不存在' });

      const targetLevel = VIP_LEVELS[level];
      const currentLevel = player.vip_level || 1;

      if (level <= currentLevel) {
        return res.json({ success: false, error: '当前VIP等级已更高' });
      }

      if (player.diamonds < targetLevel.cost) {
        return res.json({ success: false, error: '钻石不足' });
      }

      db.prepare('UPDATE player SET diamonds = diamonds - ?, vip_level = ?, vip_points = vip_points + ? WHERE id = ?')
        .run(targetLevel.cost, level, targetLevel.cost * 10, userId);

      res.json({ success: true, level, vipName: targetLevel.nameCn, message: `恭喜成为${targetLevel.nameCn}！` });
    } else {
      res.json({ success: false, error: '数据库不可用' });
    }
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
    if (db) {
      const player = db.prepare('SELECT * FROM player WHERE id = ?').get(userId);
      if (!player) return res.json({ success: false, error: '玩家不存在' });

      const card = MONTHLY_CARDS[cardType];
      if (player.diamonds < card.cost) {
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

      db.prepare('UPDATE player SET diamonds = diamonds - ? WHERE id = ?').run(card.cost, userId);

      res.json({ success: true, cardType, expireTime, message: `购买成功！月卡有效期至${new Date(expireTime).toLocaleDateString()}` });
    } else {
      res.json({ success: false, error: '数据库不可用' });
    }
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

    if (db) {
      if (reward.type === 'spirit_stones') {
        db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(reward.amount, userId);
      } else if (reward.type === 'diamonds') {
        db.prepare('UPDATE player SET diamonds = diamonds + ? WHERE id = ?').run(reward.amount, userId);
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

module.exports = router;
