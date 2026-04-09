/**
 * 奇遇事件路由 (encounter.js)
 * 端点:
 *   POST /api/encounter/trigger    - 触发奇遇检查
 *   GET  /api/encounter/status     - 获取玩家奇遇状态
 *   GET  /api/encounter/history    - 获取历史记录
 *   POST /api/encounter/claim      - 领取奖励
 *   POST /api/encounter/battle     - 战斗结算
 *   GET  /api/encounter/types       - 获取奇遇类型列表
 */

const express = require('express');
const router = express.Router();
const path = require('path');

// DB连接
function getDb(req) {
  if (req.app && req.app.locals && req.app.locals.db) {
    return req.app.locals.db;
  }
  const Database = require('better-sqlite3');
  const dbPath = path.join(__dirname, '..', 'data', 'game.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  return db;
}

const Logger = {
  info: (...args) => console.log('[encounter:api]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[encounter:api:error]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[encounter:api:warn]', new Date().toISOString(), ...args)
};

// 统一 userId 提取
function extractUserId(req) {
  return (
    parseInt(req.userId) ||
    parseInt(req.query.player_id) ||
    parseInt(req.query.userId) ||
    parseInt(req.body.player_id) ||
    parseInt(req.body.userId) ||
    null
  );
}

// 获取玩家境界（用于奇遇概率加成）
function getPlayerRealm(db, playerId) {
  try {
    const player = db.prepare('SELECT realm FROM player WHERE id = ?').get(playerId);
    return player ? player.realm || 1 : 1;
  } catch {
    return 1;
  }
}

// 统一响应格式
function json(res, data) {
  res.json({ success: true, ...data });
}
function error(res, msg, code = 400) {
  res.status(code).json({ success: false, error: msg });
}

// ============ POST /api/encounter/trigger ============
// 触发奇遇检查（修炼/战斗/挂机时调用）
router.post('/trigger', (req, res) => {
  const playerId = extractUserId(req);
  if (!playerId) return error(res, '缺少 player_id');

  const db = getDb(req);
  const encounterService = require('../../services/encounter_service');

  // 获取玩家境界用于概率加成
  const realm = getPlayerRealm(db, playerId);

  const result = encounterService.checkAndTriggerEncounter(db, playerId, { realm });

  if (result.triggered) {
    Logger.info(`玩家${playerId} 触发奇遇: ${result.event.name} (${result.event.rarity})`);
    return json(res, {
      triggered: true,
      event: result.event,
      encounterType: {
        id: result.encounterType.id,
        name: result.encounterType.name,
        icon: result.encounterType.icon,
        color: result.encounterType.color,
        hasBattle: !!result.encounterType.requiresBattle
      }
    });
  }

  if (result.hasActiveEvent) {
    return json(res, {
      triggered: false,
      hasActiveEvent: true,
      activeEvent: result.activeEvent
    });
  }

  return json(res, { triggered: false, hasActiveEvent: false });
});

// ============ GET /api/encounter/status ============
// 获取玩家奇遇状态（冷却/活跃事件/Buff）
router.get('/status', (req, res) => {
  const playerId = extractUserId(req);
  if (!playerId) return error(res, '缺少 player_id');

  const db = getDb(req);
  const encounterService = require('../../services/encounter_service');

  const status = encounterService.getEncounterStatus(db, playerId);
  return json(res, status);
});

// ============ GET /api/encounter/history ============
// 获取历史记录
router.get('/history', (req, res) => {
  const playerId = extractUserId(req);
  if (!playerId) return error(res, '缺少 player_id');

  const db = getDb(req);
  const encounterService = require('../../services/encounter_service');

  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;

  const result = encounterService.getEncounterHistory(db, playerId, page, pageSize);
  return json(res, result);
});

// ============ POST /api/encounter/claim ============
// 领取奖励
router.post('/claim', (req, res) => {
  const playerId = extractUserId(req);
  if (!playerId) return error(res, '缺少 player_id');

  const db = getDb(req);
  const encounterService = require('../../services/encounter_service');

  const result = encounterService.claimRewards(db, playerId);
  if (!result.success) return error(res, result.error);

  Logger.info(`玩家${playerId} 领取奇遇奖励: ${result.event.name}`);

  // 发放奖励到玩家账户
  const rewards = applyRewardsToPlayer(db, playerId, result.rewards, result.event);

  return json(res, {
    claimed: true,
    event: result.event,
    rewards: result.rewards,
    applied: rewards
  });
});

// ============ POST /api/encounter/battle ============
// 战斗结算（魔修伏击/妖兽护宝）
router.post('/battle', (req, res) => {
  const playerId = extractUserId(req);
  if (!playerId) return error(res, '缺少 player_id');

  const { battleWon } = req.body;
  if (typeof battleWon !== 'boolean') return error(res, '缺少 battleWon 参数');

  const db = getDb(req);
  const encounterService = require('../../services/encounter_service');

  const result = encounterService.resolveBattleEvent(db, playerId, battleWon);
  if (!result.success) return error(res, result.error);

  Logger.info(`玩家${playerId} 奇遇战斗结果: ${battleWon ? '胜利' : '失败'} - ${result.event.name}`);

  return json(res, {
    success: true,
    battleResult: battleWon ? 'win' : 'lose',
    event: result.event,
    rewards: result.rewards
  });
});

// ============ GET /api/encounter/types ============
// 获取奇遇类型列表
router.get('/types', (req, res) => {
  const encounterService = require('../../services/encounter_service');
  const types = encounterService.getEncounterTypesList();
  return json(res, { types });
});

// ============ 辅助：应用奖励到玩家账户 ============
function applyRewardsToPlayer(db, playerId, rewards, event) {
  const applied = [];

  for (const reward of rewards) {
    try {
      switch (reward.type) {
        case 'lingshi': {
          db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(reward.amount, playerId);
          applied.push({ type: 'lingshi', amount: reward.amount });
          break;
        }
        case 'cultivation': {
          // 修为加到 Cultivations 表
          const cult = db.prepare('SELECT cultivationPower FROM Cultivations WHERE userId = ?').get(playerId);
          if (cult) {
            db.prepare('UPDATE Cultivations SET cultivationPower = cultivationPower + ? WHERE userId = ?').run(reward.amount, playerId);
          } else {
            db.prepare("INSERT INTO Cultivations (userId, value, realm, cultivationPower, accumulated_power, createdAt, updatedAt) VALUES (?, 0, 1, ?, 0, datetime('now'), datetime('now'))").run(playerId, reward.amount);
          }
          applied.push({ type: 'cultivation', amount: reward.amount });
          break;
        }
        case 'realm_exp': {
          // 境界经验加到 Cultivations 表
          const cult = db.prepare('SELECT accumulated_power FROM Cultivations WHERE userId = ?').get(playerId);
          if (cult) {
            db.prepare('UPDATE Cultivations SET accumulated_power = accumulated_power + ? WHERE userId = ?').run(reward.amount, playerId);
          } else {
            db.prepare("INSERT INTO Cultivations (userId, value, realm, cultivationPower, accumulated_power, createdAt, updatedAt) VALUES (?, 0, 1, 0, ?, datetime('now'), datetime('now'))").run(playerId, reward.amount);
          }
          applied.push({ type: 'realm_exp', amount: reward.amount });
          break;
        }
        case 'elixir_health':
        case 'elixir_cultivation':
        case 'elixir_realm': {
          // 丹药放入背包
          const itemType = reward.type.replace('elixir_', '');
          const elixirName = itemType === 'health' ? '疗伤丹' : itemType === 'cultivation' ? '修炼丹' : '境界丹';
          db.prepare(`
            INSERT INTO player_items (user_id, item_id, item_name, item_type, count, source)
            VALUES (?, 0, ?, 'elixir', ?, 'encounter')
          `).run(playerId, elixirName, reward.amount);
          applied.push({ type: reward.type, amount: reward.amount });
          break;
        }
        case 'buff_blessing':
        case 'buff_curse': {
          const encounterService = require('../../services/encounter_service');
          const buff = encounterService.applyBuff(db, playerId, reward);
          if (buff) applied.push({ type: reward.type, buff });
          break;
        }
        case 'title': {
          // 称号存入 player_titles 表
          const titleName = reward.description.split('：')[1] || reward.description;
          const existingTitle = db.prepare(
            `SELECT id FROM player_titles WHERE player_id = ? AND title_name = ?`
          ).get(playerId, titleName);
          if (!existingTitle) {
            db.prepare(`
              INSERT INTO player_titles (player_id, title_name, title_desc, source, obtained_at)
              VALUES (?, ?, ?, 'encounter', datetime('now'))
            `).run(playerId, titleName, reward.description);
          }
          applied.push({ type: 'title', name: reward.description });
          break;
        }
        default:
          // 其他道具放入背包
          db.prepare(`
            INSERT INTO player_items (user_id, item_id, item_name, item_type, count, source)
            VALUES (?, 0, ?, ?, ?, 'encounter')
          `).run(playerId, reward.description, reward.type, reward.amount);
          applied.push({ type: reward.type, amount: reward.amount });
      }
    } catch (e) {
      Logger.warn(`发放奖励失败 [${reward.type}]: ${e.message}`);
      applied.push({ type: reward.type, error: e.message });
    }
  }

  return applied;
}

module.exports = router;
