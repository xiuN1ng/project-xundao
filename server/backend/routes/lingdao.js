/**
 * 灵石引导系统 - 缺灵石时推荐获取渠道
 * 触发条件：玩家灵石 < 100
 * 推荐渠道：挂机 / 副本 / 任务 / 商店
 */

const express = require('express');
const path = require('path');
const router = express.Router();

// 数据库路径
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

// 日志记录器
const Logger = {
  info: (...args) => console.log('[灵石引导]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[灵石引导:error]', new Date().toISOString(), ...args)
};

// 初始化数据库连接
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  Logger.info('数据库连接成功');
} catch (e) {
  Logger.error('数据库连接失败:', e.message);
  db = null;
}

// 灵石警告阈值
const LINGSHA_THRESHOLD = 100;

// 渠道配置：每个渠道的预期收益估算
const CHANNEL_CONFIG = {
  idle: {
    name: '挂机修炼',
    icon: '🌙',
    desc: '离线挂机也能获得灵石收益',
    estimatedIncome: '50-500/小时',
    route: '/offline-income',
    action: '挂机离线收益',
    tips: '下线前记得开启挂机模式，离线也能积累灵石'
  },
  tower: {
    name: '无尽塔',
    icon: '🗼',
    desc: '挑战高层怪物获得大量灵石奖励',
    estimatedIncome: '200-2000/层',
    route: '/tower',
    action: '无尽塔挑战',
    tips: '每天通关层数越高，奖励越丰厚'
  },
  abyss: {
    name: '封魔渊',
    icon: '🌑',
    desc: '深渊副本，击败BOSS获得灵石',
    estimatedIncome: '500-5000/次',
    route: '/abyss',
    action: '封魔渊挑战',
    tips: '挑战深渊BOSS，有概率获得大量灵石'
  },
  dailyDungeon: {
    name: '每日副本',
    icon: '📅',
    desc: '每日重置的副本挑战',
    estimatedIncome: '100-800/次',
    route: '/daily-dungeon',
    action: '每日副本',
    tips: '每天重置挑战次数，必做日常'
  },
  dailyQuest: {
    name: '每日任务',
    icon: '✅',
    desc: '完成每日任务获得灵石奖励',
    estimatedIncome: '200-1000/天',
    route: '/dailyQuest',
    action: '每日任务',
    tips: '每天完成任务可获得稳定灵石收入'
  },
  sectQuest: {
    name: '宗门任务',
    icon: '🏯',
    desc: '参与宗门活动获得贡献和灵石',
    estimatedIncome: '300-1500/次',
    route: '/sect',
    action: '宗门任务',
    tips: '加入宗门后完成任务获得灵石和贡献'
  },
  shop: {
    name: '商店兑换',
    icon: '🏪',
    desc: '使用魔晶或其他货币兑换灵石',
    estimatedIncome: '即得',
    route: '/shop',
    action: '灵石商店',
    tips: '魔晶商店支持灵石兑换，每日刷新'
  },
  signIn: {
    name: '每日签到',
    icon: '🎁',
    desc: '每日签到领取灵石和道具',
    estimatedIncome: '100-500/天',
    route: '/welfare',
    action: '每日签到',
    tips: '每日签到稳定领取灵石，连续签到奖励更丰厚'
  },
  arena: {
    name: '竞技场',
    icon: '⚔️',
    desc: '在竞技场挑战其他玩家获取灵石',
    estimatedIncome: '100-800/次',
    route: '/arena',
    action: '竞技场挑战',
    tips: '提升排名可获得更高灵石奖励'
  },
  battle: {
    name: '野外战斗',
    icon: '⚡',
    desc: '野外挂机打怪随机掉落灵石',
    estimatedIncome: '20-200/次',
    route: '/battle',
    action: '野外战斗',
    tips: '高等级地图掉落更多灵石'
  }
};

// 获取玩家灵石数量
function getPlayerLingshi(playerId) {
  if (!db) return 0;
  try {
    // 优先从 Users 表读取（权威数据源），备用 player 表
    const row = db.prepare('SELECT lingshi FROM Users WHERE id = ?').get(playerId);
    if (row) return Number(row.lingshi);
    const playerRow = db.prepare('SELECT spirit_stones FROM player WHERE user_id = ?').get(playerId);
    return playerRow ? Number(playerRow.spirit_stones) : 0;
  } catch (e) {
    Logger.error('获取玩家灵石失败:', e.message);
    return 0;
  }
}

// 获取玩家等级
function getPlayerLevel(playerId) {
  if (!db) return 1;
  try {
    const row = db.prepare('SELECT level FROM player WHERE id = ?').get(playerId);
    return row ? Number(row.level) : 1;
  } catch (e) {
    return 1;
  }
}

// 获取可获得的灵石渠道（根据玩家等级/境界过滤）
function getAvailableChannels(playerId) {
  const level = getPlayerLevel(playerId);
  const channels = [];

  // 所有等级可用
  channels.push(CHANNEL_CONFIG.idle);
  channels.push(CHANNEL_CONFIG.signIn);
  channels.push(CHANNEL_CONFIG.dailyQuest);
  channels.push(CHANNEL_CONFIG.battle);

  // 10级以上
  if (level >= 10) {
    channels.push(CHANNEL_CONFIG.tower);
  }
  // 15级以上
  if (level >= 15) {
    channels.push(CHANNEL_CONFIG.abyss);
    channels.push(CHANNEL_CONFIG.dailyDungeon);
  }
  // 20级以上
  if (level >= 20) {
    channels.push(CHANNEL_CONFIG.sectQuest);
    channels.push(CHANNEL_CONFIG.arena);
  }

  // 商店始终可用
  channels.push(CHANNEL_CONFIG.shop);

  return channels;
}

// GET /api/lingdao/check - 检查是否需要灵石引导
router.get('/check', (req, res) => {
  try {
    const playerId = req.query.player_id || req.query.playerId;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: '缺少玩家ID'
      });
    }

    const lingshi = getPlayerLingshi(playerId);
    const needsGuidance = lingshi < LINGSHA_THRESHOLD;

    if (!needsGuidance) {
      return res.json({
        success: true,
        data: {
          needsGuidance: false,
          currentLingshi: lingshi,
          threshold: LINGSHA_THRESHOLD,
          message: `当前灵石充足（${lingshi}），无需引导`
        }
      });
    }

    const availableChannels = getAvailableChannels(playerId);

    return res.json({
      success: true,
      data: {
        needsGuidance: true,
        currentLingshi: lingshi,
        threshold: LINGSHA_THRESHOLD,
        message: `灵石不足（${lingshi}/${LINGSHA_THRESHOLD}），建议通过以下方式获取`,
        channels: availableChannels,
        urgency: lingshi < 50 ? 'high' : 'normal',
        tips: lingshi < 50
          ? '灵石严重不足！建议优先完成每日任务或签到'
          : '灵石偏低，建议参与副本或任务获取灵石'
      }
    });

  } catch (error) {
    Logger.error('检查失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/lingdao/channels - 获取所有灵石获取渠道
router.get('/channels', (req, res) => {
  try {
    const playerId = req.query.player_id || req.query.playerId;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: '缺少玩家ID'
      });
    }

    const lingshi = getPlayerLingshi(playerId);
    const availableChannels = getAvailableChannels(playerId);

    return res.json({
      success: true,
      data: {
        currentLingshi: lingshi,
        threshold: LINGSHA_THRESHOLD,
        channels: availableChannels
      }
    });

  } catch (error) {
    Logger.error('获取渠道失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/lingdao/config - 获取引导系统配置
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      threshold: LINGSHA_THRESHOLD,
      description: '灵石低于阈值时触发引导系统'
    }
  });
});

module.exports = router;
