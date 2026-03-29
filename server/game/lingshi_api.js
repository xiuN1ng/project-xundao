/**
 * 灵石消耗系统 API
 * 包含：灵石消耗接口、灵石消耗日志查询
 */

const express = require('express');
const router = express.Router();

// 延迟加载依赖
let db, gameConfig, playerStorage;

// 中间件：自动加载依赖
router.use((req, res, next) => {
  loadDependencies();
  next();
});

function loadDependencies() {
  if (!db) {
    try {
      const server = require('../../server');
      db = server.db;
    } catch (e) {
      const Database = require('better-sqlite3');
      const path = require('path');
      const dbPath = path.join(__dirname, '..', '..', 'data', 'game.db');
      db = new Database(dbPath);
    }
  }
  
  if (!gameConfig) {
    try {
      gameConfig = require('./gameConfig');
    } catch (e) {
      console.error('加载gameConfig失败:', e.message);
    }
  }
  
  if (!playerStorage) {
    try {
      const storage = require('../storage');
      playerStorage = storage.playerStorage;
    } catch (e) {
      console.error('加载storage失败:', e.message);
    }
  }
}

// 初始化灵石消耗日志表
function initLingshiLogTable() {
  // Ensure db is initialized before using it
  loadDependencies();
  if (!db) {
    console.log('ℹ️ 灵石日志表初始化跳过: db未就绪');
    return;
  }
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_lingshi_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        consume_type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        balance_before INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        details TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
    // Create index separately (SQLite doesn't support INDEX inside CREATE TABLE)
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_player_lingshi_logs ON player_lingshi_logs(player_id, created_at)`);
    } catch (idxErr) {
      // Index may already exist
    }
    console.log('✅ 灵石消耗日志表初始化完成');
  } catch (e) {
    console.log('ℹ️ 灵石日志表可能已存在:', e.message);
  }
}

// 初始化
initLingshiLogTable();

// ==================== 辅助函数 ====================

// 记录灵石消耗日志
function logLingshiConsume(playerId, type, amount, balanceBefore, balanceAfter, details = {}) {
  try {
    db.prepare(
      'INSERT INTO player_lingshi_logs (player_id, consume_type, amount, balance_before, balance_after, details) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      playerId,
      type,
      amount,
      balanceBefore,
      balanceAfter,
      JSON.stringify(details)
    );
  } catch (e) {
    console.error('记录灵石消耗日志失败:', e.message);
  }
}

// 获取灵石余额
async function getLingshiBalance(playerId) {
  const player = db.prepare('SELECT spirit_stones FROM player WHERE id = ?').get(playerId);
  return player ? player.spirit_stones : 0;
}

// 扣除灵石并记录
async function consumeLingshi(playerId, type, amount, details = {}) {
  const balanceBefore = await getLingshiBalance(playerId);
  
  if (balanceBefore < amount) {
    throw new Error(`灵石不足：需要 ${amount} 灵石，当前只有 ${balanceBefore} 灵石`);
  }
  
  // 扣除灵石
  db.prepare(
    'UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?'
  ).run(amount, playerId);
  
  const balanceAfter = await getLingshiBalance(playerId);
  
  // 记录日志
  logLingshiConsume(playerId, type, amount, balanceBefore, balanceAfter, details);
  
  return { balanceBefore, balanceAfter, amount };
}

// ==================== API 端点 ====================

// 获取灵石余额
router.get('/balance', async (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const balance = await getLingshiBalance(parseInt(player_id));
    
    res.json({
      success: true,
      data: {
        player_id: parseInt(player_id),
        balance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 灵石消耗接口
router.post('/consume-lingshi', async (req, res) => {
  try {
    const { player_id, consume_type, amount, details } = req.body;
    
    if (!player_id || !consume_type || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数：player_id, consume_type, amount' 
      });
    }
    
    const playerId = parseInt(player_id);
    const consumeAmount = parseInt(amount);
    
    if (consumeAmount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: '消耗数量必须大于0' 
      });
    }
    
    // 验证消耗类型
    const validTypes = Object.values(gameConfig.LINGSHI_CONSUME_TYPE);
    if (!validTypes.includes(consume_type)) {
      return res.status(400).json({ 
        success: false, 
        error: `无效的消耗类型: ${consume_type}` 
      });
    }
    
    // 执行灵石消耗
    const result = await consumeLingshi(playerId, consume_type, consumeAmount, details || {});
    
    res.json({
      success: true,
      message: '灵石消耗成功',
      data: {
        player_id: playerId,
        consume_type,
        amount: consumeAmount,
        balance_before: result.balanceBefore,
        balance_after: result.balanceAfter,
        details: details || {}
      }
    });
  } catch (error) {
    if (error.message.includes('灵石不足')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// 灵石消耗日志查询
router.get('/lingshi-log', async (req, res) => {
  try {
    const { player_id, limit = 20, offset = 0 } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const playerId = parseInt(player_id);
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const offsetNum = parseInt(offset) || 0;
    
    // 获取日志
    const logs = db.prepare(
      `SELECT * FROM player_lingshi_logs 
       WHERE player_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`
    ).all(playerId, limitNum, offsetNum);
    
    // 获取总数
    const countResult = db.prepare(
      'SELECT COUNT(*) as total FROM player_lingshi_logs WHERE player_id = ?'
    ).get(playerId);
    
    // 格式化日志
    const formattedLogs = logs.map(log => ({
      id: log.id,
      consume_type: log.consume_type,
      amount: log.amount,
      balance_before: log.balance_before,
      balance_after: log.balance_after,
      details: log.details ? JSON.parse(log.details) : {},
      created_at: log.created_at
    }));
    
    res.json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          total: countResult.total,
          limit: limitNum,
          offset: offsetNum
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取灵石消耗配置
router.get('/config', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        building_upgrade: {
          description: '建筑升级消耗',
          cave_building_types: Object.keys(gameConfig.BUILDING_UPGRADE_CONFIG.caveBuildings)
        },
        teleport: {
          description: '传送消耗',
          regions: Object.keys(gameConfig.TELEPORT_CONFIG.regions)
        },
        shop_refresh: {
          description: '商店刷新消耗',
          base_cost: gameConfig.SHOP_REFRESH_CONFIG.baseCost,
          cost_increment: gameConfig.SHOP_REFRESH_CONFIG.costIncrement,
          max_cost: gameConfig.SHOP_REFRESH_CONFIG.maxCost
        },
        inventory_expand: {
          description: '背包扩展消耗',
          base_slots: gameConfig.INVENTORY_EXPAND_CONFIG.baseSlots,
          max_slots: gameConfig.INVENTORY_EXPAND_CONFIG.maxSlots,
          slots_per_expand: gameConfig.INVENTORY_EXPAND_CONFIG.slotsPerExpand
        },
        beast_speedup: {
          description: '灵兽加速消耗',
          cost_per_hour: gameConfig.BEAST_SPEEDUP_CONFIG.costPerHour,
          max_hours: gameConfig.BEAST_SPEEDUP_CONFIG.maxHours
        },
        consume_types: Object.values(gameConfig.LINGSHI_CONSUME_TYPE)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 计算消耗费用（预览）
router.post('/calculate-cost', (req, res) => {
  try {
    const { consume_type, params } = req.body;
    
    if (!consume_type || !params) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数：consume_type, params' 
      });
    }
    
    const cost = gameConfig.calculateCost(consume_type, params);
    
    if (cost === null || cost === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: '无法计算该类型的消耗费用' 
      });
    }
    
    res.json({
      success: true,
      data: {
        consume_type,
        params,
        cost
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
