/**
 * 宗门系统 API
 */

const express = require('express');
const router = express.Router();

// 延迟加载依赖，确保数据库连接可用
let sectStorage, playerStorage, SECT_DATA, SECT_BUILDINGS, DISCIPLE_CLASS, SECT_TECH, db, gameConfig;

// 中间件：自动加载依赖
router.use((req, res, next) => {
  loadDependencies();
  next();
});

function loadDependencies() {
  if (!sectStorage) {
    try {
      const storage = require('./sect_storage');
      sectStorage = storage.sectStorage;
      SECT_DATA = storage.SECT_DATA;
      SECT_BUILDINGS = storage.SECT_BUILDINGS;
      DISCIPLE_CLASS = storage.DISCIPLE_CLASS;
      SECT_TECH = storage.SECT_TECH;
    } catch (e) {
      console.error('加载sect_storage失败:', e.message);
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

  // 加载数据库
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

  // 加载gameConfig
  if (!gameConfig) {
    try {
      gameConfig = require('./core/gameConfig');
    } catch (e) {
      console.error('加载gameConfig失败:', e.message);
    }
  }
  
  return sectStorage && playerStorage;
}

// ==================== 灵石消耗日志记录 ====================

// 记录灵石消耗日志
function logLingshiConsume(playerId, type, amount, balanceBefore, balanceAfter, details = {}) {
  try {
    if (!db) {
      loadDependencies();
    }
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
  if (!db) {
    loadDependencies();
  }
  const player = db.prepare('SELECT spirit_stones FROM player WHERE id = ?').get(playerId);
  return player ? player.spirit_stones : 0;
}

// 获取宗门类型列表
router.get('/types', (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: 'Failed to load dependencies' });
    }
    const types = sectStorage.getSectTypes();
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取宗门列表（所有可加入的宗门）
router.get('/list', async (req, res) => {
  try {
    const { player_id } = req.query;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    // 获取所有可加入的宗门类型
    const sectTypes = sectStorage.getSectTypes();
    
    // 如果玩家已有宗门，返回玩家宗门信息
    const playerSect = await sectStorage.getSect(player_id);
    
    res.json({
      success: true,
      data: {
        available_sects: sectTypes,
        my_sect: playerSect
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取建筑类型列表
router.get('/buildings', (req, res) => {
  try {
    const buildings = sectStorage.getBuildingTypes();
    res.json({ success: true, data: buildings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取弟子职业列表
router.get('/disciple-classes', (req, res) => {
  try {
    const classes = sectStorage.getDiscipleClasses();
    res.json({ success: true, data: classes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取弟子列表
router.get('/disciples', async (req, res) => {
  try {
    const { player_id } = req.query;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const sect = await sectStorage.getSect(player_id);
    if (!sect) {
      return res.status(400).json({ success: false, error: '没有宗门' });
    }
    
    res.json({
      success: true,
      data: {
        disciples: sect.disciples,
        count: sect.disciples.length,
        capacity: 5 + (sect.buildings.mountain_gate || 0) * 2
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取宗门技能列表
router.get('/techs', (req, res) => {
  try {
    const techs = sectStorage.getTechTypes();
    res.json({ success: true, data: techs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家宗门信息
router.get('/info', async (req, res) => {
  try {
    const { player_id } = req.query;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const sect = await sectStorage.getSect(player_id);
    if (!sect) {
      return res.json({ success: true, data: null, message: '暂无宗门' });
    }
    
    // 获取弟子上限
    const discipleCap = 5 + (sect.buildings.mountain_gate || 0) * 2;
    
    // 获取升级所需经验
    const expNeeded = sect.sect_level * 5000;
    
    // 获取建筑升级费用
    const buildingCosts = {};
    for (const buildingId of Object.keys(SECT_BUILDINGS)) {
      const currentLevel = sect.buildings[buildingId] || 0;
      if (currentLevel < SECT_BUILDINGS[buildingId].max_level) {
        buildingCosts[buildingId] = sectStorage.getBuildingCost(buildingId, currentLevel);
      }
    }
    
    // 获取招收弟子费用
    const recruitCost = Math.floor(500 * Math.pow(1.5, sect.disciples.length));
    
    res.json({
      success: true,
      data: {
        ...sect,
        disciple_cap: discipleCap,
        exp_needed: expNeeded,
        building_costs: buildingCosts,
        recruit_cost: recruitCost
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取宗门加成
router.get('/bonus', async (req, res) => {
  try {
    const { player_id } = req.query;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const bonus = await sectStorage.getSectBonus(player_id);
    res.json({ success: true, data: bonus });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建宗门
router.post('/create', async (req, res) => {
  try {
    const { player_id, sect_type } = req.body;
    
    if (!player_id || !sect_type) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const sectData = SECT_DATA[sect_type];
    if (!sectData) {
      return res.status(400).json({ success: false, error: '宗门类型不存在' });
    }
    
    // 检查玩家是否存在
    const player = await playerStorage.getOrCreatePlayer(player_id);
    
    if (player.spirit_stones < 1000) {
      return res.status(400).json({ success: false, error: '需要 1000 灵石创建宗门' });
    }
    
    // 检查是否已有宗门
    const existing = await sectStorage.getSect(player_id);
    if (existing) {
      return res.status(400).json({ success: false, error: '已有宗门' });
    }
    
    // 扣除灵石
    await playerStorage.updateSpiritStones(player_id, -1000);
    
    // 创建宗门
    const sect = await sectStorage.createSect(player_id, sect_type);
    
    res.json({
      success: true,
      message: `🎉 创建${sectData.name}成功！`,
      data: sect
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 加入宗门
router.post('/join', async (req, res) => {
  try {
    const { player_id, sect_id } = req.body;

    if (!player_id || !sect_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID或宗门ID' });
    }

    const result = await sectStorage.joinSect(player_id, parseInt(sect_id));

    res.json({
      success: true,
      message: `成功加入宗门「${result.sect.name}」！`,
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 升级宗门
router.post('/upgrade', async (req, res) => {
  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const sect = await sectStorage.getSect(player_id);
    if (!sect) {
      return res.status(400).json({ success: false, error: '没有宗门' });
    }
    
    const expNeeded = sect.sect_level * 5000;
    if (sect.sect_exp < expNeeded) {
      return res.status(400).json({ success: false, error: `需要 ${expNeeded} 宗门经验` });
    }
    
    const upgradedSect = await sectStorage.upgradeSect(player_id);
    
    res.json({
      success: true,
      message: `🏰 宗门升级到 Lv.${upgradedSect.sect_level}！`,
      data: upgradedSect
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 升级建筑
router.post('/building/upgrade', async (req, res) => {
  try {
    const { player_id, building_id } = req.body;
    
    if (!player_id || !building_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const sect = await sectStorage.getSect(player_id);
    if (!sect) {
      return res.status(400).json({ success: false, error: '没有宗门' });
    }
    
    const buildingData = SECT_BUILDINGS[building_id];
    if (!buildingData) {
      return res.status(400).json({ success: false, error: '建筑不存在' });
    }
    
    const currentLevel = sect.buildings[building_id] || 0;
    if (currentLevel >= buildingData.max_level) {
      return res.status(400).json({ success: false, error: '已满级' });
    }
    
    const cost = sectStorage.getBuildingCost(building_id, currentLevel);
    
    // 获取当前灵石余额
    const balanceBefore = await getLingshiBalance(player_id);
    
    const player = await playerStorage.getOrCreatePlayer(player_id);
    if (player.spirit_stones < cost) {
      return res.status(400).json({ 
        success: false, 
        error: `灵石不足：需要 ${cost} 灵石，当前只有 ${balanceBefore} 灵石`,
        code: 'INSUFFICIENT_LINGSHI'
      });
    }
    
    // 扣除灵石
    await playerStorage.updateSpiritStones(player_id, -cost);
    const balanceAfter = await getLingshiBalance(player_id);
    
    // 记录灵石消耗日志
    logLingshiConsume(
      player_id,
      'building_upgrade',
      cost,
      balanceBefore,
      balanceAfter,
      {
        building_id,
        building_name: buildingData.name,
        current_level: currentLevel,
        new_level: currentLevel + 1
      }
    );
    
    // 升级建筑
    const result = await sectStorage.upgradeBuilding(player_id, building_id);
    
    res.json({
      success: true,
      message: `🏠 ${buildingData.name} 升级到 Lv.${result.newLevel}，消耗 ${cost} 灵石`,
      data: { 
        cost, 
        newLevel: result.newLevel,
        balance: balanceAfter
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 招收弟子
router.post('/disciple/recruit', async (req, res) => {
  try {
    const { player_id, class_type } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    if (!class_type) {
      return res.status(400).json({ success: false, error: '缺少弟子类型' });
    }
    
    const sect = await sectStorage.getSect(player_id);
    if (!sect) {
      return res.status(400).json({ success: false, error: '没有宗门，请先创建宗门' });
    }
    
    const classData = DISCIPLE_CLASS[class_type];
    if (!classData) {
      return res.status(400).json({ success: false, error: '弟子类型不存在: ' + class_type });
    }
    
    const discipleCap = 5 + (sect.buildings.mountain_gate || 0) * 2;
    if (sect.disciples.length >= discipleCap) {
      return res.status(400).json({ success: false, error: `宗门最多 ${discipleCap} 名弟子` });
    }
    
    const cost = Math.floor(500 * Math.pow(1.5, sect.disciples.length));
    
    // 获取当前灵石余额
    const balanceBefore = await getLingshiBalance(player_id);
    
    const player = await playerStorage.getOrCreatePlayer(player_id);
    if (player.spirit_stones < cost) {
      return res.status(400).json({ 
        success: false, 
        error: `灵石不足：需要 ${cost} 灵石，当前只有 ${balanceBefore} 灵石`,
        code: 'INSUFFICIENT_LINGSHI'
      });
    }
    
    // 扣除灵石
    await playerStorage.updateSpiritStones(player_id, -cost);
    const balanceAfter = await getLingshiBalance(player_id);
    
    // 记录灵石消耗日志
    logLingshiConsume(
      player_id,
      'disciple_recruit',
      cost,
      balanceBefore,
      balanceAfter,
      {
        class_type,
        class_name: classData.name,
        disciple_count: sect.disciples.length
      }
    );
    
    // 招收弟子
    const result = await sectStorage.recruitDisciple(player_id, class_type);
    
    res.json({
      success: true,
      message: `👤 招收 ${classData.name} ${result.disciple.name}，消耗 ${cost} 灵石`,
      data: { 
        cost, 
        disciple: result.disciple,
        balance: balanceAfter
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 弟子修炼
router.post('/disciple/train', async (req, res) => {
  try {
    const { player_id, disciple_index } = req.body;
    const idx = parseInt(disciple_index, 10);
    
    if (!player_id || disciple_index === undefined || isNaN(idx)) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const sect = await sectStorage.getSect(player_id);
    if (!sect) {
      return res.status(400).json({ success: false, error: '没有宗门' });
    }
    
    if (!sect.disciples[idx]) {
      return res.status(400).json({ success: false, error: '弟子不存在' });
    }
    
    const disciple = sect.disciples[idx];
    const result = await sectStorage.trainDisciple(player_id, idx);
    
    res.json({
      success: true,
      message: `${disciple.name} 修炼获得 ${result.expGained} 灵气`,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 学习宗门技能
router.post('/tech/learn', async (req, res) => {
  try {
    const { player_id, tech_id } = req.body;
    
    if (!player_id || !tech_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const sect = await sectStorage.getSect(player_id);
    if (!sect) {
      return res.status(400).json({ success: false, error: '没有宗门' });
    }
    
    const tech = SECT_TECH[tech_id];
    if (!tech) {
      return res.status(400).json({ success: false, error: '技能不存在' });
    }
    
    if (sect.sect_level < tech.req_sect_level) {
      return res.status(400).json({ success: false, error: `需要宗门 Lv.${tech.req_sect_level}` });
    }
    
    if (sect.techs.includes(tech_id)) {
      return res.status(400).json({ success: false, error: '已学会此技能' });
    }
    
    const player = await playerStorage.getOrCreatePlayer(player_id);
    if (player.spirit_stones < tech.cost) {
      return res.status(400).json({ success: false, error: `需要 ${tech.cost} 灵石` });
    }
    
    // 扣除灵石
    await playerStorage.updateSpiritStones(player_id, -tech.cost);
    
    // 学习技能
    await sectStorage.learnTech(player_id, tech_id);
    
    res.json({
      success: true,
      message: `✅ 学会 ${tech.name}！`,
      data: { tech_id, cost: tech.cost }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 捐赠宗门
router.post('/donate', async (req, res) => {
  try {
    const { player_id, amount } = req.body;
    
    if (!player_id || !amount) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const sect = await sectStorage.getSect(player_id);
    if (!sect) {
      return res.status(400).json({ success: false, error: '没有宗门' });
    }
    
    const player = await playerStorage.getOrCreatePlayer(player_id);
    if (player.spirit_stones < amount) {
      return res.status(400).json({ success: false, error: '灵石不足' });
    }
    
    // 扣除灵石
    await playerStorage.updateSpiritStones(player_id, -amount);
    
    // 捐赠
    const result = await sectStorage.donate(player_id, amount);
    
    res.json({
      success: true,
      message: `💰 贡献 ${result.contribution} 宗门贡献度`,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 离开宗门
router.post('/leave', async (req, res) => {
  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const sect = await sectStorage.getSect(player_id);
    if (!sect) {
      return res.status(400).json({ success: false, error: '没有宗门' });
    }
    
    await sectStorage.leaveSect(player_id);
    
    res.json({
      success: true,
      message: '已离开宗门'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 根据玩家ID获取宗门信息 (/api/sect/:id) - 放在最后避免路由冲突
router.get('/:id', async (req, res) => {
  try {
    const player_id = parseInt(req.params.id) || parseInt(req.query.player_id);
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const sect = await sectStorage.getSect(player_id);
    if (!sect) {
      return res.json({ success: true, data: null, message: '该玩家尚未加入宗门' });
    }
    
    res.json({ success: true, data: sect });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

// ============================================================
// DataLoader 批量加载优化 (添加于 2026-03-10)
// ============================================================

// 创建宗门成员 DataLoader
function createSectMemberDataLoader(db) {
  return new (require('./performance').DataLoader)(async (sectIds) => {
    if (!sectIds || sectIds.length === 0) return [];
    
    const placeholders = sectIds.map(() => '?').join(',');
    const [rows] = await db.execute(
      `SELECT * FROM sect_members WHERE sect_id IN (${placeholders})`,
      sectIds
    );
    
    // 按 sect_id 分组
    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.sect_id]) grouped[row.sect_id] = [];
      grouped[row.sect_id].push(row);
    }
    
    // 返回顺序与输入一致
    return sectIds.map(id => grouped[id] || []);
  }, { batchDelayMs: 10, maxBatchSize: 50 });
}

// 创建玩家 DataLoader
function createPlayerDataLoader(db) {
  return new (require('./performance').DataLoader)(async (playerIds) => {
    if (!playerIds || playerIds.length === 0) return [];
    
    const placeholders = playerIds.map(() => '?').join(',');
    const [rows] = await db.execute(
      `SELECT id, username, level, realm, combat_power FROM players WHERE id IN (${placeholders})`,
      playerIds
    );
    
    const map = {};
    for (const row of rows) {
      map[row.id] = row;
    }
    
    return playerIds.map(id => map[id] || null);
  }, { batchDelayMs: 10, maxBatchSize: 100 });
}

console.log('✅ DataLoader 优化已添加到 sect_api');
