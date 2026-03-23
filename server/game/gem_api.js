/**
 * 宝石系统 API
 */

const express = require('express');
const router = express.Router();

// 延迟加载依赖
let gemStorage, playerGemStorage, equipmentGemStorage;
let playerStorage;
let GEM_TYPES, GEM_LEVELS;
let gemSystem;
let forgeStorage;
let playerEquipmentStorage;
let gemPool;

function loadDependencies() {
  if (!gemSystem) {
    try {
      gemSystem = require('./core/gem_system');
    } catch (e) {
      console.error('加载gem_system失败:', e.message);
    }
  }
  
  if (!gemStorage) {
    try {
      const storage = require('./gem_storage');
      gemPool = storage.pool;
      gemStorage = storage.gemStorage;
      playerGemStorage = storage.playerGemStorage;
      equipmentGemStorage = storage.equipmentGemStorage;
      GEM_TYPES = storage.GEM_TYPES;
      GEM_LEVELS = storage.GEM_LEVELS;
    } catch (e) {
      console.error('加载gem_storage失败:', e.message);
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
  
  if (!forgeStorage) {
    try {
      const storage = require('./forge_storage');
      forgeStorage = storage.forgeStorage;
      playerEquipmentStorage = storage.playerEquipmentStorage;
    } catch (e) {
      console.error('加载forge_storage失败:', e.message);
    }
  }
  
  // 检查pool是否就绪（允许pool存在但为null的情况）
  return gemPool !== undefined;
}

// 获取宝石类型列表
router.get('/types', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }
    
    const types = Object.values(GEM_TYPES);
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取宝石等级信息
router.get('/levels', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }
    
    res.json({ success: true, data: GEM_LEVELS });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取宝石列表（玩家背包中的宝石）
router.get('/list', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }

    const playerId = req.query.player_id || req.query.playerId;
    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少player_id参数' });
    }

    const gems = await playerGemStorage.getPlayerGems(playerId);
    
    // 转换为前端需要的格式
    const gemList = gems.map(gem => {
      const typeInfo = GEM_TYPES[gem.type];
      const levelInfo = GEM_LEVELS[gem.level];
      return {
        id: gem.id,
        type: gem.type,
        level: gem.level,
        name: `${typeInfo.name}（${levelInfo.name}）`,
        icon: typeInfo.icon,
        color: typeInfo.color,
        stat: typeInfo.stat,
        stat_value: levelInfo.multiplier * 10,
        description: typeInfo.description
      };
    });

    res.json({ success: true, data: gemList });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家的所有宝石（按类型分组）
router.get('/grouped', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }

    const playerId = req.query.player_id || req.query.playerId;
    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少player_id参数' });
    }

    const gems = await playerGemStorage.getPlayerGems(playerId);
    
    // 按类型分组
    const grouped = {};
    for (const typeId of Object.keys(GEM_TYPES)) {
      grouped[typeId] = {
        type: typeId,
        name: GEM_TYPES[typeId].name,
        icon: GEM_TYPES[typeId].icon,
        color: GEM_TYPES[typeId].color,
        gems: []
      };
    }

    gems.forEach(gem => {
      if (grouped[gem.type]) {
        const levelInfo = GEM_LEVELS[gem.level];
        grouped[gem.type].gems.push({
          id: gem.id,
          level: gem.level,
          name: `${GEM_TYPES[gem.type].name}（${levelInfo.name}）`,
          stat_value: levelInfo.multiplier * 10
        });
      }
    });

    res.json({ success: true, data: Object.values(grouped) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 镶嵌宝石
router.post('/embed', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }

    const { player_id, equipment_id, slot, gem_id } = req.body;
    
    if (!player_id || !equipment_id === undefined || slot === undefined || !gem_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 验证槽位是否有效 (1-4)
    if (slot < 1 || slot > 4) {
      return res.status(400).json({ success: false, error: '无效的镶嵌槽位（1-4）' });
    }

    // 获取宝石信息
    const gem = await playerGemStorage.getPlayerGemById(player_id, gem_id);
    if (!gem) {
      return res.status(404).json({ success: false, error: '宝石不存在' });
    }

    // 检查同类型宝石是否已镶嵌
    const embeddedTypes = await equipmentGemStorage.getEmbeddedGemTypes(player_id, equipment_id);
    if (embeddedTypes.includes(gem.type)) {
      return res.status(400).json({ success: false, error: `该装备已有${GEM_TYPES[gem.type].name}，请先取下` });
    }

    // 镶嵌宝石
    const success = await equipmentGemStorage.embedGem(player_id, equipment_id, slot, gem_id);
    if (!success) {
      return res.status(500).json({ success: false, error: '镶嵌失败' });
    }

    const typeInfo = GEM_TYPES[gem.type];
    const levelInfo = GEM_LEVELS[gem.level];

    res.json({
      success: true,
      message: `成功镶嵌${typeInfo.name}（${levelInfo.name}）`,
      data: {
        equipment_id,
        slot,
        gem: {
          id: gem.id,
          type: gem.type,
          level: gem.level,
          name: `${typeInfo.name}（${levelInfo.name}）`,
          icon: typeInfo.icon,
          stat: typeInfo.stat,
          stat_value: levelInfo.multiplier * 10
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 取下宝石
router.post('/remove', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }

    const { player_id, equipment_id, slot } = req.body;
    
    if (!player_id || equipment_id === undefined || slot === undefined) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 取下宝石
    const gemId = await equipmentGemStorage.removeGem(player_id, equipment_id, slot);
    if (!gemId) {
      return res.status(404).json({ success: false, error: '该槽位没有镶嵌宝石' });
    }

    // 获取宝石信息
    const gem = await playerGemStorage.getPlayerGemById(player_id, gemId);
    if (!gem) {
      return res.status(404).json({ success: false, error: '宝石数据异常' });
    }

    const typeInfo = GEM_TYPES[gem.type];
    const levelInfo = GEM_LEVELS[gem.level];

    res.json({
      success: true,
      message: `成功取下${typeInfo.name}（${levelInfo.name}）`,
      data: {
        equipment_id,
        slot,
        gem: {
          id: gem.id,
          type: gem.type,
          level: gem.level,
          name: `${typeInfo.name}（${levelInfo.name}）`,
          icon: typeInfo.icon
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 升级宝石（合成）
router.post('/upgrade', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }

    const { player_id, gem_type, current_level } = req.body;
    
    if (!player_id || !gem_type) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const targetLevel = (current_level || 1) + 1;
    
    // 检查是否达到最高等级
    if (!GEM_LEVELS[targetLevel]) {
      return res.status(400).json({ success: false, error: '宝石已达最高等级' });
    }

    // 查找3个同等级同类型的宝石
    const gemsToUpgrade = await playerGemStorage.findUpgradeableGems(player_id, gem_type, current_level || 1);
    
    if (gemsToUpgrade.length < 3) {
      return res.status(400).json({ 
        success: false, 
        error: `升级需要3个同等级宝石，当前只有${gemsToUpgrade.length}个` 
      });
    }

    // 删除3个旧宝石
    const gemIds = gemsToUpgrade.map(g => g.id);
    await playerGemStorage.deleteGems(player_id, gemIds);

    // 添加1个新宝石（下一等级）
    const newGem = await playerGemStorage.addGem(player_id, gem_type, targetLevel);
    
    if (!newGem) {
      // 回滚
      await playerGemStorage.addGems(player_id, gemsToUpgrade.map(g => ({ type: g.type, level: g.level })));
      return res.status(500).json({ success: false, error: '升级失败，请重试' });
    }

    const typeInfo = GEM_TYPES[gem_type];
    const oldLevelInfo = GEM_LEVELS[current_level || 1];
    const newLevelInfo = GEM_LEVELS[targetLevel];

    res.json({
      success: true,
      message: `成功将3个${oldLevelInfo.name}${typeInfo.name}合成为1个${newLevelInfo.name}${typeInfo.name}`,
      data: {
        old_gems: gemIds,
        new_gem: {
          id: newGem.id,
          type: gem_type,
          level: targetLevel,
          name: `${typeInfo.name}（${newLevelInfo.name}）`,
          icon: typeInfo.icon,
          stat: typeInfo.stat,
          stat_value: newLevelInfo.multiplier * 10
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取装备的镶嵌信息
router.get('/equipment/:equipmentId', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }

    const playerId = req.query.player_id || req.query.playerId;
    const equipmentId = req.params.equipmentId;

    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少player_id参数' });
    }

    const embeddedGems = await equipmentGemStorage.getEquipmentGems(playerId, equipmentId);
    
    // 获取每个镶嵌槽的详细信息
    const slots = [];
    for (let i = 1; i <= 4; i++) {
      const slotData = embeddedGems.find(g => g.slot === i);
      if (slotData) {
        const gem = await playerGemStorage.getPlayerGemById(playerId, slotData.gem_id);
        if (gem) {
          const typeInfo = GEM_TYPES[gem.type];
          const levelInfo = GEM_LEVELS[gem.level];
          slots.push({
            slot: i,
            filled: true,
            gem: {
              id: gem.id,
              type: gem.type,
              level: gem.level,
              name: `${typeInfo.name}（${levelInfo.name}）`,
              icon: typeInfo.icon,
              color: typeInfo.color,
              stat: typeInfo.stat,
              stat_value: levelInfo.multiplier * 10
            }
          });
        } else {
          slots.push({ slot: i, filled: false });
        }
      } else {
        slots.push({ slot: i, filled: false });
      }
    }

    res.json({
      success: true,
      data: {
        equipment_id: equipmentId,
        slots,
        total_slots: 4,
        filled_slots: slots.filter(s => s.filled).length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 添加宝石（GM接口或奖励发放）
router.post('/add', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就就绪' });
    }

    const { player_id, gems } = req.body;
    
    if (!player_id || !gems || !Array.isArray(gems)) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const addedGems = await playerGemStorage.addGems(player_id, gems);
    
    res.json({
      success: true,
      message: `成功添加${addedGems.length}个宝石`,
      data: {
        added_count: addedGems.length,
        gems: addedGems
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 装备镶嵌相关 API ====================

// 获取宝石详情
router.get('/info/:id', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }

    const playerId = req.query.player_id || req.query.playerId;
    const gemId = parseInt(req.params.id);

    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少player_id参数' });
    }

    if (!gemId) {
      return res.status(400).json({ success: false, error: '无效的宝石ID' });
    }

    // 获取宝石信息
    const gem = await playerGemStorage.getPlayerGemById(playerId, gemId);
    if (!gem) {
      return res.status(404).json({ success: false, error: '宝石不存在' });
    }

    // 使用 gemSystem 获取详细信息
    const gemInfo = gemSystem.getGemInfo(gem.type, gem.level);
    
    res.json({
      success: true,
      data: {
        id: gem.id,
        ...gemInfo,
        isEmbedded: false // 可后续检查是否已镶嵌
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 镶嵌宝石到装备
router.post('/inlay', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }

    const { player_id, equipment_id, slot, gem_id } = req.body;
    
    if (!player_id || equipment_id === undefined || slot === undefined || !gem_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 获取装备信息
    const equipment = await playerEquipmentStorage.getEquipmentById(player_id, equipment_id);
    if (!equipment) {
      return res.status(404).json({ success: false, error: '装备不存在' });
    }

    const quality = equipment.rarity || 1;
    
    // 验证槽位数量
    const maxSlots = gemSystem.getSlotsByQuality(quality);
    if (slot < 1 || slot > maxSlots) {
      return res.status(400).json({ success: false, error: `装备只有${maxSlots}个镶嵌槽，有效槽位为1-${maxSlots}` });
    }

    // 获取宝石信息
    const gem = await playerGemStorage.getPlayerGemById(player_id, gem_id);
    if (!gem) {
      return res.status(404).json({ success: false, error: '宝石不存在' });
    }

    // 检查该槽位是否已有宝石
    const embeddedGems = await equipmentGemStorage.getEquipmentGems(player_id, equipment_id);
    const existingGem = embeddedGems.find(g => g.slot === slot);
    if (existingGem) {
      return res.status(400).json({ success: false, error: `槽位${slot}已有宝石，请先取下` });
    }

    // 检查同类型宝石是否已镶嵌
    const embeddedTypes = await equipmentGemStorage.getEmbeddedGemTypes(player_id, equipment_id);
    if (embeddedTypes.includes(gem.type)) {
      const typeInfo = GEM_TYPES[gem.type];
      return res.status(400).json({ success: false, error: `该装备已有${typeInfo.name}，请先取下` });
    }

    // 镶嵌宝石
    const success = await equipmentGemStorage.embedGem(player_id, equipment_id, slot, gem_id);
    if (!success) {
      return res.status(500).json({ success: false, error: '镶嵌失败' });
    }

    const typeInfo = GEM_TYPES[gem.type];
    const levelInfo = GEM_LEVELS[gem.level];
    const statValue = gemSystem.getGemStatValue(gem.type, gem.level);

    res.json({
      success: true,
      message: `成功镶嵌${typeInfo.name}（${levelInfo.name}）`,
      data: {
        equipment_id,
        slot,
        gem: {
          id: gem.id,
          type: gem.type,
          level: gem.level,
          name: `${typeInfo.name}（${levelInfo.name}）`,
          icon: typeInfo.icon,
          color: typeInfo.color,
          stat: typeInfo.stat,
          statValue: statValue
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 从装备取下宝石
router.post('/remove-gem', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }

    const { player_id, equipment_id, slot } = req.body;
    
    if (!player_id || equipment_id === undefined || slot === undefined) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 取下宝石
    const gemId = await equipmentGemStorage.removeGem(player_id, equipment_id, slot);
    if (!gemId) {
      return res.status(404).json({ success: false, error: '该槽位没有镶嵌宝石' });
    }

    // 获取宝石信息
    const gem = await playerGemStorage.getPlayerGemById(player_id, gemId);
    if (!gem) {
      return res.status(404).json({ success: false, error: '宝石数据异常' });
    }

    const typeInfo = GEM_TYPES[gem.type];
    const levelInfo = GEM_LEVELS[gem.level];

    res.json({
      success: true,
      message: `成功取下${typeInfo.name}（${levelInfo.name}）`,
      data: {
        equipment_id,
        slot,
        gem: {
          id: gem.id,
          type: gem.type,
          level: gem.level,
          name: `${typeInfo.name}（${levelInfo.name}）`,
          icon: typeInfo.icon
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取装备槽位信息
router.get('/slots', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }

    const playerId = req.query.player_id || req.query.playerId;
    const equipmentId = req.query.equipment_id || req.query.equipmentId;

    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少player_id参数' });
    }

    if (!equipmentId && equipmentId !== 0) {
      return res.status(400).json({ success: false, error: '缺少equipment_id参数' });
    }

    // 获取装备信息
    const equipment = await playerEquipmentStorage.getEquipmentById(playerId, parseInt(equipmentId));
    if (!equipment) {
      return res.status(404).json({ success: false, error: '装备不存在' });
    }

    const quality = equipment.rarity || 1;
    const totalSlots = gemSystem.getSlotsByQuality(quality);

    // 获取已镶嵌的宝石
    const embeddedGems = await equipmentGemStorage.getEquipmentGems(playerId, equipmentId);
    
    // 构建槽位信息
    const slots = [];
    const existingGems = {};
    
    for (const embedded of embeddedGems) {
      const gem = await playerGemStorage.getPlayerGemById(playerId, embedded.gem_id);
      if (gem) {
        existingGems[embedded.slot] = gem;
        const typeInfo = GEM_TYPES[gem.type];
        const levelInfo = GEM_LEVELS[gem.level];
        const statValue = gemSystem.getGemStatValue(gem.type, gem.level);
        
        slots.push({
          slot: embedded.slot,
          filled: true,
          gem: {
            id: gem.id,
            type: gem.type,
            level: gem.level,
            name: `${typeInfo.name}（${levelInfo.name}）`,
            icon: typeInfo.icon,
            color: typeInfo.color,
            stat: typeInfo.stat,
            statValue: statValue
          }
        });
      }
    }

    // 填充空槽位
    for (let i = 1; i <= totalSlots; i++) {
      if (!slots.find(s => s.slot === i)) {
        slots.push({
          slot: i,
          filled: false,
          gem: null
        });
      }
    }

    // 计算总属性加成
    const allGems = Object.values(existingGems);
    const totalBonus = gemSystem.calculateGemBonuses(allGems);

    res.json({
      success: true,
      data: {
        equipment_id: equipmentId,
        equipment_name: equipment.name,
        quality: quality,
        total_slots: totalSlots,
        filled_slots: slots.filter(s => s.filled).length,
        slots: slots.sort((a, b) => a.slot - b.slot),
        total_bonus: totalBonus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 导出API模块
module.exports = router;
