/**
 * 灵石消耗系统 API
 * 包含：商店刷新、背包扩展、灵兽加速、传送消耗
 * 使用统一的 gameConfig.js 配置
 */

const express = require('express');
const router = express.Router();

// 延迟加载依赖
let db, playerStorage, sectStorage, beastStorage, gameConfig;

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
      // 使用绝对路径
      const dbPath = '/root/.openclaw/workspace/game/idle-cultivation/data/game.db';
      db = new Database(dbPath);
    }
  }
  
  if (!playerStorage) {
    try {
      const storage = require('./storage');
      playerStorage = storage.playerStorage;
    } catch (e) {
      console.error('加载storage失败:', e.message);
    }
  }
  
  if (!sectStorage) {
    try {
      const storage = require('./sect_storage');
      sectStorage = storage.sectStorage;
    } catch (e) {
      console.error('加载sect_storage失败:', e.message);
    }
  }
  
  if (!beastStorage) {
    try {
      const storage = require('./beast_storage');
      beastStorage = storage;
    } catch (e) {
      console.error('加载beast_storage失败:', e.message);
    }
  }
  
  if (!gameConfig) {
    try {
      gameConfig = require('./core/gameConfig');
    } catch (e) {
      console.error('加载gameConfig失败:', e.message);
    }
  }
  
  return playerStorage;
}

// ============ 灵石消耗日志记录 ============

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

async function getLingshiBalance(playerId) {
  const player = db.prepare('SELECT spirit_stones FROM player WHERE id = ?').get(playerId);
  return player ? player.spirit_stones : 0;
}

// ============ 使用 gameConfig 配置 ============

// 商店刷新配置
const SHOP_REFRESH_CONFIG = {
  baseCost: gameConfig?.SHOP_REFRESH_CONFIG?.baseCost || 10,
  costIncrement: gameConfig?.SHOP_REFRESH_CONFIG?.costIncrement || 10,
  maxCost: gameConfig?.SHOP_REFRESH_CONFIG?.maxCost || 100
};

// 背包扩展配置
const INVENTORY_EXPAND_CONFIG = {
  cost: gameConfig?.INVENTORY_EXPAND_CONFIG?.baseCost || 100,
  slotsPerExpand: gameConfig?.INVENTORY_EXPAND_CONFIG?.slotsPerExpand || 5,
  baseSlots: gameConfig?.INVENTORY_EXPAND_CONFIG?.baseSlots || 20,
  maxSlots: gameConfig?.INVENTORY_EXPAND_CONFIG?.maxSlots || 100
};

// 灵兽加速配置
const BEAST_SPEEDUP_CONFIG = {
  costPerHour: gameConfig?.BEAST_SPEEDUP_CONFIG?.costPerHour || 50,
  maxHours: gameConfig?.BEAST_SPEEDUP_CONFIG?.maxHours || 24
};

// 传送配置
const TELEPORT_CONFIG = gameConfig?.TELEPORT_CONFIG || {
  baseCost: 10,
  maxCost: 100
};

// ============ 辅助函数 ============

// 获取商店刷新费用
function getShopRefreshCost(refreshCount) {
  return gameConfig?.SHOP_REFRESH_CONFIG?.calculateCost(refreshCount) || 
         Math.min(SHOP_REFRESH_CONFIG.baseCost + (refreshCount * SHOP_REFRESH_CONFIG.costIncrement), SHOP_REFRESH_CONFIG.maxCost);
}

// 获取背包扩展费用
function getInventoryExpandCost(currentSlots) {
  const result = gameConfig?.INVENTORY_EXPAND_CONFIG?.calculateCost(currentSlots);
  if (result !== null && result !== undefined) return result;
  
  // 降级处理
  if (currentSlots >= INVENTORY_EXPAND_CONFIG.maxSlots) return null;
  const expandCount = Math.floor((currentSlots - INVENTORY_EXPAND_CONFIG.baseSlots) / INVENTORY_EXPAND_CONFIG.slotsPerExpand);
  return INVENTORY_EXPAND_CONFIG.cost * (expandCount + 1);
}

// 获取灵兽加速费用
function getBeastSpeedupCost(hours) {
  return gameConfig?.BEAST_SPEEDUP_CONFIG?.calculateCost(hours) || 
         (hours * BEAST_SPEEDUP_CONFIG.costPerHour);
}

// 获取传送费用
function getTeleportCost(targetMap) {
  return gameConfig?.TELEPORT_CONFIG?.calculateCost(targetMap) || 
         Math.min(TELEPORT_CONFIG.baseCost * (TELEPORT_CONFIG.difficultyMultipliers?.[targetMap] || 1), TELEPORT_CONFIG.maxCost || 100);
}

// ============ API 路由 ============

// 获取灵石消耗配置信息
router.get('/config', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        shop_refresh: gameConfig?.SHOP_REFRESH_CONFIG || SHOP_REFRESH_CONFIG,
        inventory_expand: gameConfig?.INVENTORY_EXPAND_CONFIG || INVENTORY_EXPAND_CONFIG,
        beast_speedup: gameConfig?.BEAST_SPEEDUP_CONFIG || BEAST_SPEEDUP_CONFIG,
        teleport: gameConfig?.TELEPORT_CONFIG || TELEPORT_CONFIG
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 神秘商店刷新
router.post('/shop/refresh', async (req, res) => {
  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const playerId = parseInt(player_id);
    const player = await playerStorage.getOrCreatePlayer(playerId);
    
    // 获取玩家今日刷新次数
    const today = new Date().toDateString();
    let refreshCount = 0;
    
    if (!player.last_shop_refresh || player.last_shop_refresh !== today) {
      refreshCount = 0;
    } else {
      refreshCount = player.shop_refresh_count || 0;
    }
    
    // 计算刷新费用
    const cost = getShopRefreshCost(refreshCount);
    
    // 获取当前余额
    const balanceBefore = await getLingshiBalance(playerId);
    
    // 检查灵石是否足够
    if (balanceBefore < cost) {
      return res.status(400).json({ 
        success: false, 
        error: `需要 ${cost} 灵石，当前只有 ${balanceBefore} 灵石`,
        code: 'INSUFFICIENT_LINGSHI'
      });
    }
    
    // 扣除灵石
    await playerStorage.updateSpiritStones(playerId, -cost);
    const balanceAfter = await getLingshiBalance(playerId);
    
    // 记录日志
    logLingshiConsume(playerId, 'shop_refresh', cost, balanceBefore, balanceAfter, { refresh_count: refreshCount + 1 });
    
    // 返回新的刷新次数供前端使用
    const newRefreshCount = refreshCount + 1;
    const nextCost = getShopRefreshCost(newRefreshCount);
    
    res.json({
      success: true,
      message: `🔄 商店刷新成功，消耗 ${cost} 灵石`,
      data: {
        cost,
        refresh_count: newRefreshCount,
        next_cost: nextCost,
        reset_time: '次日0点重置',
        balance: balanceAfter
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 背包扩展
router.post('/inventory/expand', async (req, res) => {
  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const playerId = parseInt(player_id);
    const player = await playerStorage.getOrCreatePlayer(playerId);
    
    // 从游戏状态获取当前背包栏位
    const currentSlots = player.inventory_slots || INVENTORY_EXPAND_CONFIG.baseSlots;
    
    // 检查是否已达上限
    if (currentSlots >= INVENTORY_EXPAND_CONFIG.maxSlots) {
      return res.status(400).json({ 
        success: false, 
        error: `背包栏位已达上限 ${INVENTORY_EXPAND_CONFIG.maxSlots} 格`,
        code: 'INVENTORY_MAX'
      });
    }
    
    // 计算扩展费用
    const cost = getInventoryExpandCost(currentSlots);
    
    if (cost === null) {
      return res.status(400).json({ success: false, error: '背包栏位已达上限' });
    }
    
    // 获取当前余额
    const balanceBefore = await getLingshiBalance(playerId);
    
    // 检查灵石是否足够
    if (balanceBefore < cost) {
      return res.status(400).json({ 
        success: false, 
        error: `需要 ${cost} 灵石，当前只有 ${balanceBefore} 灵石`,
        code: 'INSUFFICIENT_LINGSHI'
      });
    }
    
    // 扣除灵石
    await playerStorage.updateSpiritStones(playerId, -cost);
    const balanceAfter = await getLingshiBalance(playerId);
    
    // 记录日志
    logLingshiConsume(playerId, 'inventory_expand', cost, balanceBefore, balanceAfter, { 
      current_slots: currentSlots,
      new_slots: currentSlots + INVENTORY_EXPAND_CONFIG.slotsPerExpand
    });
    
    const newSlots = Math.min(currentSlots + INVENTORY_EXPAND_CONFIG.slotsPerExpand, INVENTORY_EXPAND_CONFIG.maxSlots);
    
    res.json({
      success: true,
      message: `🎒 背包扩展成功，消耗 ${cost} 灵石`,
      data: {
        cost,
        current_slots: currentSlots,
        new_slots: newSlots,
        next_cost: getInventoryExpandCost(newSlots),
        balance: balanceAfter
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 灵兽加速成长
router.post('/beast/speedup', async (req, res) => {
  try {
    const { player_id, beast_index, hours } = req.body;
    
    if (!player_id || beast_index === undefined || !hours) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const playerId = parseInt(player_id);
    const idx = parseInt(beast_index, 10);
    const hoursInt = parseInt(hours, 10);
    
    if (hoursInt <= 0 || hoursInt > BEAST_SPEEDUP_CONFIG.maxHours) {
      return res.status(400).json({ 
        success: false, 
        error: `加速时间必须在1-${BEAST_SPEEDUP_CONFIG.maxHours}小时之间` 
      });
    }
    
    const player = await playerStorage.getOrCreatePlayer(playerId);
    
    // 计算加速费用
    const cost = getBeastSpeedupCost(hoursInt);
    
    // 获取当前余额
    const balanceBefore = await getLingshiBalance(playerId);
    
    // 检查灵石是否足够
    if (balanceBefore < cost) {
      return res.status(400).json({ 
        success: false, 
        error: `需要 ${cost} 灵石，当前只有 ${balanceBefore} 灵石`,
        code: 'INSUFFICIENT_LINGSHI'
      });
    }
    
    // 扣除灵石
    await playerStorage.updateSpiritStones(playerId, -cost);
    const balanceAfter = await getLingshiBalance(playerId);
    
    // 记录日志
    logLingshiConsume(playerId, 'beast_speedup', cost, balanceBefore, balanceAfter, {
      beast_index: idx,
      hours: hoursInt
    });
    
    res.json({
      success: true,
      message: `⚡ 灵兽加速成功，${hoursInt}小时加速消耗 ${cost} 灵石`,
      data: {
        cost,
        hours: hoursInt,
        beast_index: idx,
        balance: balanceAfter
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 跨地图传送
router.post('/teleport', async (req, res) => {
  try {
    const { player_id, target_map, difficulty } = req.body;
    
    if (!player_id || !target_map) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const playerId = parseInt(player_id);
    const player = await playerStorage.getOrCreatePlayer(playerId);
    
    // 计算传送费用
    const cost = getTeleportCost(target_map);
    
    // 获取当前余额
    const balanceBefore = await getLingshiBalance(playerId);
    
    // 检查灵石是否足够
    if (balanceBefore < cost) {
      return res.status(400).json({ 
        success: false, 
        error: `需要 ${cost} 灵石，当前只有 ${balanceBefore} 灵石`,
        code: 'INSUFFICIENT_LINGSHI'
      });
    }
    
    // 扣除灵石
    await playerStorage.updateSpiritStones(playerId, -cost);
    const balanceAfter = await getLingshiBalance(playerId);
    
    // 记录日志
    logLingshiConsume(playerId, 'teleport', cost, balanceBefore, balanceAfter, {
      target_map,
      difficulty: difficulty || 'normal'
    });
    
    res.json({
      success: true,
      message: `🗺️ 传送到 ${target_map} 成功，消耗 ${cost} 灵石`,
      data: {
        cost,
        target_map,
        difficulty: difficulty || 'normal',
        balance: balanceAfter
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
