/**
 * 仙府洞天/家园系统 API
 * backend/routes/home_api.js
 * 端点: /api/home/*
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db = null;

function getDb() {
  if (db) return db;
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode=WAL');
  db.pragma('busy_timeout=5000');
  return db;
}

const { BUILDINGS, FURNITURE_TYPES, CROP_TYPES, HOME_STYLES, calculateHomeBuff } = require('../../game/home_config');

// ========== 数据库初始化 ==========
function initHomeTables(database) {
  const localDb = database || getDb();
  
  localDb.exec(`
    CREATE TABLE IF NOT EXISTS player_home (
      player_id INTEGER PRIMARY KEY,
      style VARCHAR(20) DEFAULT 'xianxia',
      prosperity INT DEFAULT 0,
      aura INT DEFAULT 0,
      aura_capacity INT DEFAULT 100,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  localDb.exec(`
    CREATE TABLE IF NOT EXISTS player_home_buildings (
      player_id INTEGER,
      building_type VARCHAR(50),
      level INT DEFAULT 1,
      exp INT DEFAULT 0,
      PRIMARY KEY(player_id, building_type)
    )
  `);

  localDb.exec(`
    CREATE TABLE IF NOT EXISTS player_home_furniture (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      furniture_type VARCHAR(50) NOT NULL,
      position_x INT DEFAULT 0,
      position_y INT DEFAULT 0,
      placed BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, id)
    )
  `);

  localDb.exec(`
    CREATE TABLE IF NOT EXISTS player_home_farm (
      player_id INTEGER,
      plot_index INT,
      crop_type VARCHAR(50),
      planted_at DATETIME,
      harvest_at DATETIME,
      status VARCHAR(20) DEFAULT 'empty',
      PRIMARY KEY(player_id, plot_index)
    )
  `);

  localDb.exec(`
    CREATE TABLE IF NOT EXISTS player_home_visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      visitor_id INTEGER NOT NULL,
      visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(owner_id, visitor_id)
    )
  `);
}

// ========== 初始化玩家仙府数据 ==========
function ensurePlayerHome(playerId) {
  const localDb = getDb();
  
  // 初始化仙府
  const existing = localDb.prepare('SELECT * FROM player_home WHERE player_id = ?').get(playerId);
  if (!existing) {
    localDb.prepare(`
      INSERT INTO player_home (player_id, style, prosperity, aura, aura_capacity)
      VALUES (?, 'xianxia', 0, 0, 100)
    `).run(playerId);
  }

  // 初始化6块灵田
  for (let i = 0; i < 6; i++) {
    const plot = localDb.prepare('SELECT * FROM player_home_farm WHERE player_id = ? AND plot_index = ?').get(playerId, i);
    if (!plot) {
      localDb.prepare(`
        INSERT INTO player_home_farm (player_id, plot_index, status) VALUES (?, ?, 'empty')
      `).run(playerId, i);
    }
  }
  
  // 初始化6个建筑
  const buildingTypes = ['main', 'alchemy', 'farm', 'forge', 'library', 'pet'];
  for (const btype of buildingTypes) {
    const b = localDb.prepare('SELECT * FROM player_home_buildings WHERE player_id = ? AND building_type = ?').get(playerId, btype);
    if (!b) {
      localDb.prepare(`
        INSERT INTO player_home_buildings (player_id, building_type, level, exp) VALUES (?, ?, 1, 0)
      `).run(playerId, btype);
    }
  }
  
  return localDb.prepare('SELECT * FROM player_home WHERE player_id = ?').get(playerId);
}

// ========== 中间件: 初始化仙府 ==========
function ensureHome(req, res, next) {
  try {
    const playerId = req.userId || req.user?.id || parseInt(req.body?.player_id || req.body?.userId || req.query?.player_id || req.query?.userId || 1) || 1;
    ensurePlayerHome(playerId);
    req.playerId = playerId;
    next();
  } catch (err) {
    console.error('[Home] 初始化仙府失败:', err);
    res.status(500).json({ success: false, error: '仙府初始化失败' });
  }
}

// ========== 仙府基础 API ==========

// GET /api/home/info - 仙府信息
router.get('/info', ensureHome, (req, res) => {
  try {
    const playerId = req.userId || req.user?.id || parseInt(req.body?.player_id || req.body?.userId || req.query?.player_id || req.query?.userId || 1) || 1;
    const localDb = getDb();
    
    const home = localDb.prepare('SELECT * FROM player_home WHERE player_id = ?').get(playerId);
    
    // 获取建筑信息
    const buildings = localDb.prepare('SELECT * FROM player_home_buildings WHERE player_id = ?').all(playerId);
    const buildingMap = {};
    buildings.forEach(b => { buildingMap[b.building_type] = b; });
    
    // 计算BUFF
    const buffs = calculateHomeBuff(buildingMap, home.prosperity, home.style);
    
    // 获取灵田统计
    const farmPlots = localDb.prepare('SELECT * FROM player_home_farm WHERE player_id = ?').all(playerId);
    const growingCount = farmPlots.filter(p => p.status === 'growing').length;
    const readyCount = farmPlots.filter(p => p.status === 'ready').length;
    
    res.json({
      success: true,
      data: {
        style: home.style,
        styleInfo: HOME_STYLES[home.style] || HOME_STYLES.xianxia,
        prosperity: home.prosperity,
        aura: home.aura,
        auraCapacity: home.aura_capacity,
        buildings: buildingMap,
        buffs: buffs,
        farm: {
          totalPlots: 6,
          growing: growingCount,
          ready: readyCount
        }
      }
    });
  } catch (err) {
    console.error('[Home] 获取仙府信息失败:', err);
    res.status(500).json({ success: false, error: '获取仙府信息失败' });
  }
});

// GET /api/home/buildings - 建筑列表及等级
router.get('/buildings', ensureHome, (req, res) => {
  try {
    const playerId = req.userId || req.user?.id || parseInt(req.body?.player_id || req.body?.userId || req.query?.player_id || req.query?.userId || 1) || 1;
    const localDb = getDb();
    
    const buildings = localDb.prepare('SELECT * FROM player_home_buildings WHERE player_id = ?').all(playerId);
    const buildingMap = {};
    buildings.forEach(b => { buildingMap[b.building_type] = b; });
    
    // 填充默认建筑
    const result = {};
    for (const [type, config] of Object.entries(BUILDINGS)) {
      const dbBuilding = buildingMap[type];
      result[type] = {
        type,
        name: config.name,
        description: config.description,
        icon: config.icon,
        level: dbBuilding ? dbBuilding.level : 0,
        exp: dbBuilding ? dbBuilding.exp : 0,
        maxLevel: config.maxLevel,
        effects: dbBuilding ? config.upgradeEffect(dbBuilding.level) : config.upgradeEffect(0),
        nextUpgradeCost: dbBuilding ? config.upgradeCost(dbBuilding.level) : config.upgradeCost(0)
      };
    }
    
    res.json({ success: true, buildings: result });
  } catch (err) {
    console.error('[Home] 获取建筑列表失败:', err);
    res.status(500).json({ success: false, error: '获取建筑列表失败' });
  }
});

// POST /api/home/upgrade/:buildingType - 升级建筑
router.post('/upgrade/:buildingType', ensureHome, (req, res) => {
  try {
        const { buildingType } = req.params;
    const localDb = getDb();
    
    // 验证建筑类型
    const config = BUILDINGS[buildingType];
    if (!config) {
      return res.status(400).json({ success: false, error: '无效的建筑类型' });
    }
    
    // 获取当前建筑等级
    let building = localDb.prepare('SELECT * FROM player_home_buildings WHERE player_id = ? AND building_type = ?').get(playerId, buildingType);
    const currentLevel = building ? building.level : 0;
    
    if (currentLevel >= config.maxLevel) {
      return res.status(400).json({ success: false, error: '建筑已达到最高等级' });
    }
    
    // 计算升级消耗
    const cost = config.upgradeCost(currentLevel);
    
    // 获取玩家灵石
    const player = localDb.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
    if (!player || (player.spirit_stones || 0) < cost.spiritStone) {
      return res.status(400).json({ success: false, error: '灵石不足' });
    }
    
    // 扣除灵石
    localDb.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(cost.spiritStone, playerId);
    
    // 扣除材料
    for (const mat of cost.materials) {
      // 检查背包中的材料数量
      const bagItem = localDb.prepare('SELECT * FROM bag WHERE player_id = ? AND item_id = ?').get(playerId, mat.id);
      if (!bagItem || bagItem.count < mat.count) {
        // 退还灵石并报错
        localDb.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(cost.spiritStone, playerId);
        return res.status(400).json({ success: false, error: `材料不足: ${mat.id}` });
      }
      localDb.prepare('UPDATE bag SET count = count - ? WHERE player_id = ? AND item_id = ?').run(mat.count, playerId, mat.id);
    }
    
    // 执行升级
    if (building) {
      localDb.prepare('UPDATE player_home_buildings SET level = level + 1 WHERE player_id = ? AND building_type = ?').run(playerId, buildingType);
    } else {
      localDb.prepare('INSERT INTO player_home_buildings (player_id, building_type, level) VALUES (?, ?, 1)').run(playerId, buildingType);
    }
    
    // 更新繁荣度
    const effect = config.upgradeEffect(currentLevel + 1);
    localDb.prepare('UPDATE player_home SET prosperity = prosperity + ? WHERE player_id = ?').run(effect.prosperityBonus || 0, playerId);
    
    // 如果是正殿，更新灵气容量
    if (buildingType === 'main' && effect.auraCapacityBonus) {
      localDb.prepare('UPDATE player_home SET aura_capacity = aura_capacity + ? WHERE player_id = ?').run(effect.auraCapacityBonus, playerId);
    }
    
    // 获取新的建筑信息
    building = localDb.prepare('SELECT * FROM player_home_buildings WHERE player_id = ? AND building_type = ?').get(playerId, buildingType);
    
    res.json({
      success: true,
      message: `${config.name} 升级成功！`,
      data: {
        buildingType,
        level: building.level,
        effects: config.upgradeEffect(building.level),
        nextUpgradeCost: building.level < config.maxLevel ? config.upgradeCost(building.level) : null
      }
    });
  } catch (err) {
    console.error('[Home] 升级建筑失败:', err);
    res.status(500).json({ success: false, error: '升级建筑失败' });
  }
});

// GET /api/home/buff - 洞府BUFF效果
router.get('/buff', ensureHome, (req, res) => {
  try {
    const playerId = req.userId || req.user?.id || parseInt(req.body?.player_id || req.body?.userId || req.query?.player_id || req.query?.userId || 1) || 1;
    const localDb = getDb();
    
    const home = localDb.prepare('SELECT * FROM player_home WHERE player_id = ?').get(playerId);
    const buildings = localDb.prepare('SELECT * FROM player_home_buildings WHERE player_id = ?').all(playerId);
    
    const buildingMap = {};
    buildings.forEach(b => { buildingMap[b.building_type] = b; });
    
    const buffs = calculateHomeBuff(buildingMap, home.prosperity, home.style);
    
    res.json({
      success: true,
      buffs: {
        alchemySuccessBonus: buffs.alchemySuccessBonus,
        farmYieldBonus: buffs.farmYieldBonus,
        forgeSuccessBonus: buffs.forgeSuccessBonus,
        skillExpBonus: buffs.skillExpBonus,
        petExpBonus: buffs.petExpBonus,
        auraCapacityBonus: buffs.auraCapacityBonus,
        auraRegenBonus: buffs.auraRegenBonus,
        prosperityFactor: buffs.prosperityFactor
      },
      descriptions: {
        alchemySuccessBonus: `炼丹成功率 +${buffs.alchemySuccessBonus.toFixed(1)}%`,
        farmYieldBonus: `灵田产量 +${buffs.farmYieldBonus.toFixed(1)}%`,
        forgeSuccessBonus: `强化成功率 +${buffs.forgeSuccessBonus.toFixed(1)}%`,
        skillExpBonus: `技能熟练 +${buffs.skillExpBonus.toFixed(1)}%`,
        petExpBonus: `灵宠经验 +${buffs.petExpBonus.toFixed(1)}%`,
        auraCapacityBonus: `灵气容量 +${buffs.auraCapacityBonus}`,
        auraRegenBonus: `灵气回复 ${(buffs.auraRegenBonus * 100).toFixed(0)}%`
      }
    });
  } catch (err) {
    console.error('[Home] 获取BUFF失败:', err);
    res.status(500).json({ success: false, error: '获取BUFF失败' });
  }
});

// POST /api/home/visit/:playerId - 访问他人洞府
router.post('/visit/:playerId', ensureHome, (req, res) => {
  try {
    const visitorId = req.userId || req.user?.id || parseInt(req.body?.player_id || req.body?.userId || req.query?.player_id || req.query?.userId || 1) || 1;
    const ownerId = parseInt(req.params.playerId);
    const localDb = getDb();
    
    if (visitorId === ownerId) {
      return res.status(400).json({ success: false, error: '不能访问自己的洞府' });
    }
    
    // 检查目标玩家是否存在
    const owner = localDb.prepare('SELECT * FROM player_home WHERE player_id = ?').get(ownerId);
    if (!owner) {
      return res.status(404).json({ success: false, error: '该玩家不存在或尚未开启仙府' });
    }
    
    // 检查是否已经是访客记录
    const existingVisit = localDb.prepare('SELECT * FROM player_home_visitors WHERE owner_id = ? AND visitor_id = ?').get(ownerId, visitorId);
    if (!existingVisit) {
      localDb.prepare('INSERT OR IGNORE INTO player_home_visitors (owner_id, visitor_id) VALUES (?, ?)').run(ownerId, visitorId);
    } else {
      localDb.prepare('UPDATE player_home_visitors SET visited_at = CURRENT_TIMESTAMP WHERE owner_id = ? AND visitor_id = ?').run(ownerId, visitorId);
    }
    
    // 获取主人的仙府信息
    const buildings = localDb.prepare('SELECT * FROM player_home_buildings WHERE player_id = ?').all(ownerId);
    const buildingMap = {};
    buildings.forEach(b => { buildingMap[b.building_type] = b; });
    
    const buffs = calculateHomeBuff(buildingMap, owner.prosperity, owner.style);
    
    // 获取主人基本信息
    const ownerPlayer = localDb.prepare('SELECT id, username, level, realm FROM player WHERE id = ?').get(ownerId);
    
    res.json({
      success: true,
      message: `成功访问 ${ownerPlayer.username} 的洞府`,
      data: {
        owner: {
          id: ownerPlayer.id,
          username: ownerPlayer.username,
          level: ownerPlayer.level,
          realm: ownerPlayer.realm
        },
        style: owner.style,
        prosperity: owner.prosperity,
        aura: owner.aura,
        auraCapacity: owner.aura_capacity,
        buffs: buffs,
        visitorCount: localDb.prepare('SELECT COUNT(*) as c FROM player_home_visitors WHERE owner_id = ?').get(ownerId).c
      }
    });
  } catch (err) {
    console.error('[Home] 访问洞府失败:', err);
    res.status(500).json({ success: false, error: '访问洞府失败' });
  }
});

// ========== 家园装饰 API ==========

// GET /api/home/furniture/types - 家具类型列表
router.get('/furniture/types', (req, res) => {
  try {
    const style = req.query.style || 'xianxia';
    
    // 按风格筛选
    const result = {};
    for (const [id, config] of Object.entries(FURNITURE_TYPES)) {
      if (!style || config.style === style) {
        result[id] = {
          id: config.id,
          name: config.name,
          style: config.style,
          category: config.category,
          price: config.price,
          prosperity: config.prosperity,
          icon: config.icon
        };
      }
    }
    
    res.json({ success: true, furnitureTypes: result });
  } catch (err) {
    console.error('[Home] 获取家具类型失败:', err);
    res.status(500).json({ success: false, error: '获取家具类型失败' });
  }
});

// GET /api/home/furniture/owned - 已拥有家具
router.get('/furniture/owned', ensureHome, (req, res) => {
  try {
    const playerId = req.userId || req.user?.id || parseInt(req.body?.player_id || req.body?.userId || req.query?.player_id || req.query?.userId || 1) || 1;
    const localDb = getDb();
    
    const items = localDb.prepare('SELECT * FROM player_home_furniture WHERE player_id = ? ORDER BY created_at DESC').all(playerId);
    
    const result = items.map(item => {
      const config = FURNITURE_TYPES[item.furniture_type] || {};
      return {
        id: item.id,
        furnitureType: item.furniture_type,
        name: config.name || item.furniture_type,
        icon: config.icon || '?',
        positionX: item.position_x,
        positionY: item.position_y,
        placed: !!item.placed,
        prosperity: config.prosperity || 0
      };
    });
    
    res.json({ success: true, furniture: result });
  } catch (err) {
    console.error('[Home] 获取已拥有家具失败:', err);
    res.status(500).json({ success: false, error: '获取家具失败' });
  }
});

// POST /api/home/furniture/buy - 购买家具
router.post('/furniture/buy', ensureHome, (req, res) => {
  try {
    const playerId = req.userId || req.user?.id || parseInt(req.body?.player_id || req.body?.userId || req.query?.player_id || req.query?.userId || 1) || 1;
    const { furnitureType } = req.body;
    const localDb = getDb();
    
    const config = FURNITURE_TYPES[furnitureType];
    if (!config) {
      return res.status(400).json({ success: false, error: '无效的家具类型' });
    }
    
    // 检查灵石
    const player = localDb.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
    if (!player || (player.spirit_stones || 0) < config.price) {
      return res.status(400).json({ success: false, error: '灵石不足' });
    }
    
    // 扣除灵石
    localDb.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(config.price, playerId);
    
    // 添加家具到背包
    localDb.prepare(`
      INSERT INTO player_home_furniture (player_id, furniture_type, placed)
      VALUES (?, ?, FALSE)
    `).run(playerId, furnitureType);
    
    // 更新繁荣度（购买也算一点繁荣度）
    localDb.prepare('UPDATE player_home SET prosperity = prosperity + 1 WHERE player_id = ?').run(playerId);
    
    const newCount = localDb.prepare('SELECT COUNT(*) as c FROM player_home_furniture WHERE player_id = ? AND furniture_type = ?').get(playerId, furnitureType).c;
    
    res.json({
      success: true,
      message: `购买 ${config.name} 成功！`,
      data: {
        furnitureType,
        name: config.name,
        icon: config.icon,
        totalOwned: newCount
      }
    });
  } catch (err) {
    console.error('[Home] 购买家具失败:', err);
    res.status(500).json({ success: false, error: '购买家具失败' });
  }
});

// POST /api/home/furniture/place - 摆放家具
router.post('/furniture/place', ensureHome, (req, res) => {
  try {
    const playerId = req.userId || req.user?.id || parseInt(req.body?.player_id || req.body?.userId || req.query?.player_id || req.query?.userId || 1) || 1;
    const { furnitureId, positionX, positionY } = req.body;
    const localDb = getDb();
    
    if (!furnitureId) {
      return res.status(400).json({ success: false, error: '缺少家具ID' });
    }
    
    // 检查家具是否属于该玩家
    const item = localDb.prepare('SELECT * FROM player_home_furniture WHERE id = ? AND player_id = ?').get(furnitureId, playerId);
    if (!item) {
      return res.status(404).json({ success: false, error: '家具不存在' });
    }
    
    if (item.placed) {
      return res.status(400).json({ success: false, error: '家具已在摆放状态' });
    }
    
    // 放置家具
    localDb.prepare('UPDATE player_home_furniture SET placed = TRUE, position_x = ?, position_y = ? WHERE id = ?').run(
      positionX || 0, positionY || 0, furnitureId
    );
    
    // 增加繁荣度
    const config = FURNITURE_TYPES[item.furniture_type];
    if (config && config.prosperity) {
      localDb.prepare('UPDATE player_home SET prosperity = prosperity + ? WHERE player_id = ?').run(config.prosperity, playerId);
    }
    
    res.json({
      success: true,
      message: `${config?.name || '家具'} 摆放成功！`,
      data: {
        id: furnitureId,
        placed: true,
        positionX: positionX || 0,
        positionY: positionY || 0
      }
    });
  } catch (err) {
    console.error('[Home] 摆放家具失败:', err);
    res.status(500).json({ success: false, error: '摆放家具失败' });
  }
});

// POST /api/home/furniture/remove - 移除家具
router.post('/furniture/remove', ensureHome, (req, res) => {
  try {
    const playerId = req.userId || req.user?.id || parseInt(req.body?.player_id || req.body?.userId || req.query?.player_id || req.query?.userId || 1) || 1;
    const { furnitureId } = req.body;
    const localDb = getDb();
    
    if (!furnitureId) {
      return res.status(400).json({ success: false, error: '缺少家具ID' });
    }
    
    // 检查家具
    const item = localDb.prepare('SELECT * FROM player_home_furniture WHERE id = ? AND player_id = ?').get(furnitureId, playerId);
    if (!item) {
      return res.status(404).json({ success: false, error: '家具不存在' });
    }
    
    // 移回背包（不删除，只是改为未摆放）
    localDb.prepare('UPDATE player_home_furniture SET placed = FALSE WHERE id = ?').run(furnitureId);
    
    res.json({
      success: true,
      message: '家具已移回背包'
    });
  } catch (err) {
    console.error('[Home] 移除家具失败:', err);
    res.status(500).json({ success: false, error: '移除家具失败' });
  }
});

// GET /api/home/style - 家园风格
router.get('/style', ensureHome, (req, res) => {
  try {
    const playerId = req.userId || req.user?.id || parseInt(req.body?.player_id || req.body?.userId || req.query?.player_id || req.query?.userId || 1) || 1;
    const localDb = getDb();
    
    const home = localDb.prepare('SELECT style FROM player_home WHERE player_id = ?').get(playerId);
    
    const currentStyle = home.style;
    const currentConfig = HOME_STYLES[currentStyle] || HOME_STYLES.xianxia;
    
    res.json({
      success: true,
      currentStyle: currentStyle,
      styleInfo: {
        id: currentStyle,
        name: currentConfig.name,
        description: currentConfig.description,
        icon: currentConfig.icon
      },
      availableStyles: HOME_STYLES
    });
  } catch (err) {
    console.error('[Home] 获取家园风格失败:', err);
    res.status(500).json({ success: false, error: '获取家园风格失败' });
  }
});

// POST /api/home/style - 切换风格
router.post('/style', ensureHome, (req, res) => {
  try {
    const playerId = req.userId || req.user?.id || parseInt(req.body?.player_id || req.body?.userId || req.query?.player_id || req.query?.userId || 1) || 1;
    const { style } = req.body;
    const localDb = getDb();
    
    if (!HOME_STYLES[style]) {
      return res.status(400).json({ success: false, error: '无效的家园风格' });
    }
    
    // 切换风格不消耗灵石（或者可以设置冷却/消耗）
    localDb.prepare('UPDATE player_home SET style = ? WHERE player_id = ?').run(style, playerId);
    
    const config = HOME_STYLES[style];
    
    res.json({
      success: true,
      message: `切换为 ${config.name} 成功！`,
      data: {
        style: style,
        styleInfo: {
          id: style,
          name: config.name,
          description: config.description,
          icon: config.icon
        }
      }
    });
  } catch (err) {
    console.error('[Home] 切换风格失败:', err);
    res.status(500).json({ success: false, error: '切换风格失败' });
  }
});

// ========== 灵田种植 API ==========

// GET /api/home/farm/plots - 灵田地块状态
router.get('/farm/plots', ensureHome, (req, res) => {
  try {
    const playerId = req.userId || req.user?.id || parseInt(req.body?.player_id || req.body?.userId || req.query?.player_id || req.query?.userId || 1) || 1;
    const localDb = getDb();
    
    // 确保6块地都存在
    for (let i = 0; i < 6; i++) {
      const plot = localDb.prepare('SELECT * FROM player_home_farm WHERE player_id = ? AND plot_index = ?').get(playerId, i);
      if (!plot) {
        localDb.prepare('INSERT INTO player_home_farm (player_id, plot_index, status) VALUES (?, ?, \'empty\')').run(playerId, i);
      }
    }
    
    const plots = localDb.prepare('SELECT * FROM player_home_farm WHERE player_id = ? ORDER BY plot_index').all(playerId);
    
    const now = Date.now();
    
    const result = plots.map(plot => {
      const config = plot.crop_type ? CROP_TYPES[plot.crop_type] : null;
      let status = plot.status;
      
      // 检查是否成熟
      if (status === 'growing' && plot.harvest_at) {
        const harvestTime = new Date(plot.harvest_at).getTime();
        if (now >= harvestTime) {
          status = 'ready';
          localDb.prepare('UPDATE player_home_farm SET status = \'ready\' WHERE player_id = ? AND plot_index = ?').run(playerId, plot.plot_index);
        }
      }
      
      return {
        plotIndex: plot.plot_index,
        status: status,
        cropType: plot.crop_type,
        cropName: config ? config.name : null,
        cropIcon: config ? config.icon : null,
        plantedAt: plot.planted_at,
        harvestAt: plot.harvest_at,
        growthTime: config ? config.growthTime : 0,
        remainingTime: plot.harvest_at ? Math.max(0, new Date(plot.harvest_at).getTime() - now) : 0
      };
    });
    
    res.json({ success: true, plots: result });
  } catch (err) {
    console.error('[Home] 获取灵田状态失败:', err);
    res.status(500).json({ success: false, error: '获取灵田状态失败' });
  }
});

// POST /api/home/farm/plant - 种植作物
router.post('/farm/plant', ensureHome, (req, res) => {
  try {
    const playerId = req.userId || req.user?.id || parseInt(req.body?.player_id || req.body?.userId || req.query?.player_id || req.query?.userId || 1) || 1;
    const { plotIndex, cropType } = req.body;
    const localDb = getDb();
    
    if (plotIndex === undefined || plotIndex < 0 || plotIndex > 5) {
      return res.status(400).json({ success: false, error: '无效的地块索引（0-5）' });
    }
    
    const cropConfig = CROP_TYPES[cropType];
    if (!cropConfig) {
      return res.status(400).json({ success: false, error: '无效的作物类型' });
    }
    
    // 检查地块状态
    const plot = localDb.prepare('SELECT * FROM player_home_farm WHERE player_id = ? AND plot_index = ?').get(playerId, plotIndex);
    if (!plot) {
      return res.status(404).json({ success: false, error: '地块不存在' });
    }
    
    if (plot.status !== 'empty') {
      return res.status(400).json({ success: false, error: '该地块已有作物' });
    }
    
    // 获取建筑加成
    const buildings = localDb.prepare('SELECT * FROM player_home_buildings WHERE player_id = ? AND building_type = ?').get(playerId, 'farm');
    const farmLevel = buildings ? buildings.level : 0;
    const farmConfig = BUILDINGS.farm;
    const farmBonus = farmConfig ? farmConfig.upgradeEffect(farmLevel).farmYieldBonus / 100 : 0;
    
    // 种植
    const now = new Date();
    const harvestTime = new Date(now.getTime() + cropConfig.growthTime * 1000 * (1 - farmBonus / 100));
    
    localDb.prepare(`
      UPDATE player_home_farm 
      SET crop_type = ?, planted_at = ?, harvest_at = ?, status = 'growing'
      WHERE player_id = ? AND plot_index = ?
    `).run(cropType, now.toISOString(), harvestTime.toISOString(), playerId, plotIndex);
    
    res.json({
      success: true,
      message: `在 ${plotIndex} 号地块种植了 ${cropConfig.name}！`,
      data: {
        plotIndex,
        cropType,
        cropName: cropConfig.name,
        plantedAt: now.toISOString(),
        harvestAt: harvestTime.toISOString(),
        growthTime: cropConfig.growthTime,
        farmBonusPercent: farmBonus.toFixed(1)
      }
    });
  } catch (err) {
    console.error('[Home] 种植失败:', err);
    res.status(500).json({ success: false, error: '种植失败' });
  }
});

// POST /api/home/farm/harvest - 收获作物
router.post('/farm/harvest', ensureHome, (req, res) => {
  try {
    const playerId = req.userId || req.user?.id || parseInt(req.body?.player_id || req.body?.userId || req.query?.player_id || req.query?.userId || 1) || 1;
    const { plotIndex } = req.body;
    const localDb = getDb();
    
    if (plotIndex === undefined || plotIndex < 0 || plotIndex > 5) {
      return res.status(400).json({ success: false, error: '无效的地块索引（0-5）' });
    }
    
    const plot = localDb.prepare('SELECT * FROM player_home_farm WHERE player_id = ? AND plot_index = ?').get(playerId, plotIndex);
    if (!plot) {
      return res.status(404).json({ success: false, error: '地块不存在' });
    }
    
    if (plot.status !== 'ready') {
      const now = Date.now();
      if (plot.harvest_at && now < new Date(plot.harvest_at).getTime()) {
        return res.status(400).json({ success: false, error: '作物尚未成熟' });
      }
      return res.status(400).json({ success: false, error: '该地块没有可收获的作物' });
    }
    
    const cropConfig = CROP_TYPES[plot.crop_type];
    if (!cropConfig) {
      return res.status(500).json({ success: false, error: '作物配置异常' });
    }
    
    // 获取建筑加成
    const buildings = localDb.prepare('SELECT * FROM player_home_buildings WHERE player_id = ? AND building_type = ?').get(playerId, 'farm');
    const farmLevel = buildings ? buildings.level : 0;
    const farmConfig = BUILDINGS.farm;
    const farmBonus = farmConfig ? farmConfig.upgradeEffect(farmLevel).farmYieldBonus / 100 : 0;
    
    // 计算产量
    const baseYield = cropConfig.baseYield;
    const finalYield = Math.floor(baseYield * (1 + farmBonus));
    
    // 添加物品到背包
    const existingItem = localDb.prepare('SELECT * FROM bag WHERE player_id = ? AND item_id = ?').get(playerId, plot.crop_type);
    if (existingItem) {
      localDb.prepare('UPDATE bag SET count = count + ? WHERE player_id = ? AND item_id = ?').run(finalYield, playerId, plot.crop_type);
    } else {
      localDb.prepare('INSERT INTO bag (player_id, item_id, count) VALUES (?, ?, ?)').run(playerId, plot.crop_type, finalYield);
    }
    
    // 清空地块
    localDb.prepare(`
      UPDATE player_home_farm 
      SET crop_type = NULL, planted_at = NULL, harvest_at = NULL, status = 'empty'
      WHERE player_id = ? AND plot_index = ?
    `).run(playerId, plotIndex);
    
    // 增加种植经验
    localDb.prepare('UPDATE player_home SET prosperity = prosperity + 2 WHERE player_id = ?').run(playerId);
    
    res.json({
      success: true,
      message: `收获了 ${finalYield} 个 ${cropConfig.name}！`,
      data: {
        cropType: plot.crop_type,
        cropName: cropConfig.name,
        cropIcon: cropConfig.icon,
        yield: finalYield,
        prosperityGained: 2,
        farmBonusPercent: farmBonus.toFixed(1)
      }
    });
  } catch (err) {
    console.error('[Home] 收获失败:', err);
    res.status(500).json({ success: false, error: '收获失败' });
  }
});

// GET /api/home/farm/crops - 可种植作物
router.get('/farm/crops', (req, res) => {
  try {
    const result = {};
    for (const [id, config] of Object.entries(CROP_TYPES)) {
      result[id] = {
        id: config.id,
        name: config.name,
        description: config.description,
        icon: config.icon,
        growthTime: config.growthTime,
        growthTimeText: formatTime(config.growthTime),
        baseYield: config.baseYield,
        price: config.price,
        exp: config.exp
      };
    }
    
    res.json({ success: true, crops: result });
  } catch (err) {
    console.error('[Home] 获取作物列表失败:', err);
    res.status(500).json({ success: false, error: '获取作物列表失败' });
  }
});

// ========== 工具函数 ==========

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
}

// ========== 初始化 ==========
// 自动初始化表
try {
  const Database = require('better-sqlite3');
  const tempDb = new Database(DB_PATH);
  tempDb.pragma('journal_mode=WAL');
  initHomeTables(tempDb);
  console.log('[Home] 仙府洞天系统表初始化完成');
} catch (err) {
  console.error('[Home] 初始化表失败:', err);
}

module.exports = router;
