/**
 * 会员/月卡系统 HTTP 路由
 * 前端调用 /api/membership/* -> 透传到 welfareStorage 月卡函数
 * 
 * 前端 API:
 *   GET  /api/membership/status    ?player_id=X  -> welfareStorage.getMonthlyCardStatus()
 *   POST /api/membership/purchase  {player_id, type} -> welfareStorage.buyMonthlyCard()
 *   POST /api/membership/claim     {player_id, type} -> welfareStorage.claimMonthlyCardReward()
 */

const express = require('express');
const router = express.Router();
const path = require('path');

// 共享 DB 连接（复用 backend/data/game.db）
// 注意：优先使用 app.locals.db（主服务器共享实例），否则创建独立连接
let sharedDb = null;

function getDb(req) {
  // 优先使用 req.app.locals.db（通过 middleware 注入的主 DB 实例）
  if (req && req.app && req.app.locals && req.app.locals.db) {
    return req.app.locals.db;
  }
  if (sharedDb) return sharedDb;
  try {
    const DATA_DIR = path.join(__dirname, '..', 'data');
    const Database = require('better-sqlite3');
    const dbPath = path.join(DATA_DIR, 'game.db');
    sharedDb = new Database(dbPath);
    sharedDb.pragma('journal_mode=WAL');
    sharedDb.pragma('busy_timeout=5000');
  } catch (e) {
    console.error('[membership] DB初始化失败:', e.message);
  }
  return sharedDb;
}

// 动态加载 welfareStorage（避免循环依赖）
// 注意：welfare_storage 导出 { welfareStorage: {...}, ... }，方法在 welfareStorage 对象上
let _welfareStorage = null;
function getWelfareStorage() {
  if (_welfareStorage) return _welfareStorage;
  try {
    const ws = require('../../game/welfare_storage');
    _welfareStorage = ws.welfareStorage; // 方法在 welfareStorage 对象上
  } catch (e) {
    console.error('[membership] 无法加载 welfare_storage:', e.message);
  }
  return _welfareStorage;
}

// 统一 playerId 提取
function extractPlayerId(req) {
  return parseInt(req.query.player_id || req.body.player_id || req.query.playerId || req.body.playerId || req.headers['x-user-id'] || 1) || 1;
}

// 统一响应
function ok(res, data) {
  res.json({ success: true, data });
}
function fail(res, status, error) {
  res.status(status || 400).json({ success: false, error });
}

// ============================================================
// GET /api/membership/status
// 获取月卡状态
// ============================================================
router.get('/status', (req, res) => {
  try {
    const playerId = extractPlayerId(req);
    const ws = getWelfareStorage();
    if (!ws) return fail(res, 500, '福利系统未加载');

    const cards = ws.getMonthlyCardStatus(playerId);

    // 获取月卡配置供前端展示
    const WELFARE_MONTHLY_CARDS = {
      spirit: {
        id: 'spirit',
        name: '灵石月卡',
        cost: 100,
        costType: 'diamond',
        dailyReward: { type: 'spirit_stones', amount: 500, name: '每日500灵石' },
        description: '购买后每日可领取500灵石，连续30天'
      },
      premium: {
        id: 'premium',
        name: '尊享月卡',
        cost: 300,
        costType: 'diamond',
        dailyReward: { type: 'spirit_stones', amount: 1000, name: '每日1000灵石' },
        bonus: { type: 'exp_bonus', amount: 1.5, name: '修炼经验+50%' },
        description: '购买后每日可领取1000灵石，修炼经验+50%，连续30天'
      }
    };

    res.json({
      success: true,
      data: {
        cards,
        products: Object.entries(WELFARE_MONTHLY_CARDS).map(([key, card]) => ({
          type: key,
          name: card.name,
          cost: card.cost,
          costType: card.costType,
          dailyReward: card.dailyReward,
          bonus: card.bonus,
          description: card.description
        }))
      }
    });
  } catch (error) {
    console.error('[membership/status]', error);
    fail(res, 500, error.message);
  }
});

// ============================================================
// POST /api/membership/purchase
// 购买月卡
// Body: { player_id, type: 'spirit'|'premium' }
// ============================================================
router.post('/purchase', (req, res) => {
  try {
    const playerId = extractPlayerId(req);
    const cardType = req.body.type;

    if (!cardType) return fail(res, 400, '缺少 type 参数 (spirit|premium)');

    const ws = getWelfareStorage();
    if (!ws) return fail(res, 500, '福利系统未加载');

    // 验证月卡类型
    if (!['spirit', 'premium'].includes(cardType)) {
      return fail(res, 400, '无效的月卡类型，可选: spirit, premium');
    }

    // 检查玩家是否存在
    const db = getDb();
    if (!db) return fail(res, 500, '数据库未连接');
    const player = db.prepare('SELECT * FROM Users WHERE id = ?').get(playerId);
    if (!player) return fail(res, 404, '玩家不存在');

    // 执行购买
    const result = ws.buyMonthlyCard(playerId, cardType);
    if (!result.success) return fail(res, 400, result.error);

    res.json({
      success: true,
      message: result.message || '购买成功',
      data: {
        cardType,
        expireTime: result.expireTime,
        remainingDiamonds: player.diamonds
      }
    });
  } catch (error) {
    console.error('[membership/purchase]', error);
    fail(res, 500, error.message);
  }
});

// ============================================================
// POST /api/membership/claim
// 领取月卡每日奖励
// Body: { player_id, type: 'spirit'|'premium' }
// ============================================================
router.post('/claim', (req, res) => {
  try {
    const playerId = extractPlayerId(req);
    const cardType = req.body.type;

    if (!cardType) return fail(res, 400, '缺少 type 参数 (spirit|premium)');

    const ws = getWelfareStorage();
    if (!ws) return fail(res, 500, '福利系统未加载');

    // 验证月卡类型
    if (!['spirit', 'premium'].includes(cardType)) {
      return fail(res, 400, '无效的月卡类型');
    }

    // 执行领取
    const result = ws.claimMonthlyCardReward(playerId, cardType);
    if (!result.success) return fail(res, 400, result.error);

    // 发放灵石奖励到 Users 表
    if (result.reward && result.reward.type === 'spirit_stones') {
      const db = getDb();
      if (db) {
        try {
          db.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(result.reward.amount, playerId);
        } catch (e) {
          console.error('[membership/claim] 灵石发放失败:', e.message);
        }
      }
    }

    res.json({
      success: true,
      message: result.message || '领取成功',
      data: {
        reward: result.reward,
        nextClaimTime: result.nextClaimTime
      }
    });
  } catch (error) {
    console.error('[membership/claim]', error);
    fail(res, 500, error.message);
  }
});

module.exports = router;
