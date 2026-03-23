/**
 * 炼器系统 API
 */

const express = require('express');
const router = express.Router();

// 延迟加载依赖
let forgeStorage, playerEquipmentStorage, playerMaterialStorage;
let playerStorage;

function loadDependencies() {
  if (!forgeStorage) {
    try {
      const storage = require('./forge_storage');
      forgeStorage = storage.forgeStorage;
      playerEquipmentStorage = storage.playerEquipmentStorage;
      playerMaterialStorage = storage.playerMaterialStorage;
    } catch (e) {
      console.error('加载forge_storage失败:', e.message);
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
  
  return forgeStorage && playerStorage && playerEquipmentStorage && playerMaterialStorage;
}

// 获取配方列表
router.get('/recipes', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }
    
    const filters = {
      type: req.query.type,
      rarity: req.query.rarity ? parseInt(req.query.rarity) : undefined,
      level_req: req.query.level_req ? parseInt(req.query.level_req) : undefined,
      realm_req: req.query.realm_req ? parseInt(req.query.realm_req) : undefined
    };
    
    const recipes = await forgeStorage.getRecipes(filters);
    res.json({ success: true, data: recipes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单个配方详情
router.get('/recipes/:id', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }
    
    const recipe = await forgeStorage.getRecipeById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ success: false, error: '配方不存在' });
    }
    
    res.json({ success: true, data: recipe });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取强化材料列表
router.get('/materials', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }
    
    const filters = {
      type: req.query.type,
      rarity: req.query.rarity ? parseInt(req.query.rarity) : undefined,
      level_req: req.query.level_req ? parseInt(req.query.level_req) : undefined
    };
    
    const materials = await forgeStorage.getEnhancementMaterials(filters);
    res.json({ success: true, data: materials });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家仓库材料
router.get('/player/materials', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }
    
    const { player_id } = req.query;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const materials = await playerMaterialStorage.getPlayerMaterials(player_id);
    res.json({ success: true, data: materials });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家装备列表
router.get('/player/equipment', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }
    
    const { player_id } = req.query;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const filters = {
      slot: req.query.slot,
      is_equipped: req.query.is_equipped !== undefined ? parseInt(req.query.is_equipped) : undefined
    };
    
    const equipment = await playerEquipmentStorage.getPlayerEquipment(player_id, filters);
    res.json({ success: true, data: equipment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单个装备详情 API
router.get('/equipment/:id', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }
    
    const { player_id } = req.query;
    const equipment_id = parseInt(req.params.id);
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    if (!equipment_id) {
      return res.status(400).json({ success: false, error: '缺少装备ID' });
    }
    
    const equipment = await playerEquipmentStorage.getEquipmentById(player_id, equipment_id);
    if (!equipment) {
      return res.status(404).json({ success: false, error: '装备不存在' });
    }
    
    // 计算装备战力
    const combatPower = calculateEquipmentCombatPower(equipment);
    equipment.combat_power = combatPower;
    
    res.json({ success: true, data: equipment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 计算装备战力
function calculateEquipmentCombatPower(equipment) {
  if (!equipment || !equipment.base_stats) return 0;
  
  const stats = equipment.base_stats;
  const level = equipment.level || 1;
  
  // 基础属性战力计算
  let power = 0;
  
  // 攻击属性
  if (stats.atk) power += stats.atk * level * 1.5;
  if (stats.attack) power += stats.attack * level * 1.5;
  
  // 防御属性
  if (stats.def) power += stats.def * level * 1.2;
  if (stats.defense) power += stats.defense * level * 1.2;
  
  // 生命属性
  if (stats.hp) power += stats.hp * level * 0.5;
  if (stats.health) power += stats.health * level * 0.5;
  
  // 速度属性
  if (stats.speed) power += stats.speed * level * 2;
  
  // 暴击属性
  if (stats.crit) power += stats.crit * level * 3;
  if (stats.crit_rate) power += stats.crit_rate * level * 3;
  
  // 强化等级加成
  power *= (1 + (level - 1) * 0.1);
  
  return Math.floor(power);
}

// 装备炼制 API
router.post('/craft', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }
    
    const { player_id, recipe_id, quantity = 1 } = req.body;
    
    if (!player_id || !recipe_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    // 获取配方
    const recipe = await forgeStorage.getRecipeById(recipe_id);
    if (!recipe) {
      return res.status(404).json({ success: false, error: '配方不存在' });
    }
    
    // 获取玩家信息
    const player = await playerStorage.getOrCreatePlayer(player_id);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    // 检查等级和境界要求
    if (player.level < recipe.level_req) {
      return res.status(400).json({ success: false, error: `角色等级不足，需要${recipe.level_req}级` });
    }
    if (player.realm_level < recipe.realm_req) {
      return res.status(400).json({ success: false, error: `境界不足，需要${recipe.realm_req}重境界` });
    }
    
    // 检查材料是否足够
    const materialsNeeded = recipe.materials;
    const materialsList = Object.entries(materialsNeeded);
    
    for (const [materialId, neededQty] of materialsList) {
      const playerQty = await playerMaterialStorage.getMaterialQuantity(player.id, materialId);
      if (playerQty < neededQty * quantity) {
        const materialInfo = await forgeStorage.getMaterialById(materialId);
        const materialName = materialInfo?.name || materialId;
        return res.status(400).json({ 
          success: false, 
          error: `材料不足，需要${materialName} x${neededQty * quantity}，现有 x${playerQty}` 
        });
      }
    }
    
    // 计算成功率
    const successRoll = Math.random() * 100;
    const isSuccess = successRoll <= recipe.success_rate;
    
    if (isSuccess) {
      // 消耗材料
      for (const [materialId, neededQty] of materialsList) {
        await playerMaterialStorage.consumeMaterial(player.id, materialId, neededQty * quantity);
      }
      
      // 添加装备
      const slot = recipe.type === 'weapon' ? 'weapon' : recipe.type === 'armor' ? 'armor' : 'accessory';
      const equipmentRecordId = await playerEquipmentStorage.addEquipment(player.id, recipe.id, slot);
      
      // 获取完整的装备信息
      const newEquipment = await playerEquipmentStorage.getEquipmentById(player.id, equipmentRecordId);
      
      res.json({
        success: true,
        message: '炼制成功！',
        data: {
          equipment: newEquipment,
          success: true
        }
      });
    } else {
      // 炼制失败，返还一半材料
      for (const [materialId, neededQty] of materialsList) {
        const refundQty = Math.floor(neededQty * quantity * 0.5);
        if (refundQty > 0) {
          await playerMaterialStorage.addMaterial(player.id, materialId, refundQty);
        }
      }
      
      res.json({
        success: true,
        message: '炼制失败，返还了一半材料',
        data: {
          equipment: null,
          success: false,
          refund: true
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 装备强化 API
router.post('/enhance', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }
    
    const { player_id, equipment_id, material_id } = req.body;
    
    if (!player_id || !equipment_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    // 获取玩家信息
    const player = await playerStorage.getOrCreatePlayer(player_id);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    // 获取装备
    const equipment = await playerEquipmentStorage.getEquipmentById(player.id, equipment_id);
    if (!equipment) {
      return res.status(404).json({ success: false, error: '装备不存在' });
    }
    
    // 获取强化材料
    let material = null;
    let materialStatsBonus = {};
    let materialRarity = 1;
    if (material_id) {
      material = await forgeStorage.getMaterialById(material_id);
      if (!material) {
        return res.status(404).json({ success: false, error: '强化材料不存在' });
      }
      materialStatsBonus = material.stats_bonus || {};
      materialRarity = material.rarity;
      
      // 检查材料数量
      const playerQty = await playerMaterialStorage.getMaterialQuantity(player.id, material_id);
      if (playerQty < 1) {
        return res.status(400).json({ success: false, error: '强化材料不足' });
      }
      
      // 消耗材料
      await playerMaterialStorage.consumeMaterial(player.id, material_id, 1);
    }
    
    // 计算强化成功率 (基础80%，每级-5%，高品质材料+10%)
    const baseSuccessRate = 80;
    const levelPenalty = (equipment.level - 1) * 5;
    const materialBonus = material ? (materialRarity - 1) * 5 : 0;
    
    // 获取保底计数器（连续失败次数）
    const failCount = player.enhance_fail_count || 0;
    const guaranteeThreshold = 5; // 连续5次失败后必成功
    const isGuaranteed = failCount >= guaranteeThreshold;
    
    // 保底时100%成功，否则正常计算
    const successRate = isGuaranteed ? 100 : Math.max(10, baseSuccessRate - levelPenalty + materialBonus);
    
    const successRoll = Math.random() * 100;
    const isSuccess = isGuaranteed || successRoll <= successRate;
    
    // 更新保底计数器
    const newFailCount = isSuccess ? 0 : failCount + 1;
    await playerStorage.updatePlayerData(player.id, { enhance_fail_count: newFailCount });
    
    if (isSuccess) {
      // 强化成功
      const newLevel = equipment.level + 1;
      const newExp = equipment.exp + 100;
      
      await playerEquipmentStorage.updateEquipmentLevel(player.id, equipment_id, newLevel, newExp);
      
      // 获取更新后的装备
      const updatedEquipment = await playerEquipmentStorage.getEquipmentById(player.id, equipment_id);
      
      res.json({
        success: true,
        message: isGuaranteed ? `保底成功！装备等级提升至 ${newLevel} 级` : `强化成功！装备等级提升至 ${newLevel} 级`,
        data: {
          equipment: updatedEquipment,
          success: true,
          success_rate: successRate,
          guaranteed: isGuaranteed,
          fail_count: failCount
        }
      });
    } else {
      // 强化失败，可能降级
      const degradeRoll = Math.random();
      let newLevel = equipment.level;
      let newExp = equipment.exp;
      
      if (degradeRoll < 0.3 && equipment.level > 1) {
        // 30%概率降级
        newLevel = Math.max(1, equipment.level - 1);
        newExp = 0;
      }
      
      await playerEquipmentStorage.updateEquipmentLevel(player.id, equipment_id, newLevel, newExp);
      
      const updatedEquipment = await playerEquipmentStorage.getEquipmentById(player.id, equipment_id);
      
      res.json({
        success: true,
        message: newLevel < equipment.level ? '强化失败，装备降级了...' : '强化失败',
        data: {
          equipment: updatedEquipment,
          success: false,
          degraded: newLevel < equipment.level,
          success_rate: successRate
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 废弃装备回收 API
router.post('/recycle', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }
    
    const { player_id, equipment_ids } = req.body;
    
    if (!player_id || !equipment_ids || !Array.isArray(equipment_ids) || equipment_ids.length === 0) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    // 获取玩家信息
    const player = await playerStorage.getOrCreatePlayer(player_id);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    const recycledEquipment = [];
    const failedEquipment = [];
    let totalSpiritStones = 0;
    
    for (const equipmentId of equipment_ids) {
      // 获取装备信息
      const equipment = await playerEquipmentStorage.getEquipmentById(player.id, equipmentId);
      
      if (!equipment) {
        failedEquipment.push({ id: equipmentId, reason: '装备不存在' });
        continue;
      }
      
      if (equipment.is_equipped) {
        failedEquipment.push({ id: equipmentId, reason: '装备已穿戴，无法回收' });
        continue;
      }
      
      // 计算回收价值: 基础价值 * (1 + 等级 * 0.2) * 稀有度加成
      const baseValue = 10;
      const levelBonus = 1 + equipment.level * 0.2;
      const rarityBonus = 1 + (equipment.rarity - 1) * 0.5;
      const recycleValue = Math.floor(baseValue * levelBonus * rarityBonus);
      
      // 添加灵石
      await playerStorage.updateSpiritStones(player.id, recycleValue);
      
      // 删除装备记录
      await playerEquipmentStorage.deleteEquipment(player.id, equipmentId);
      
      totalSpiritStones += recycleValue;
      recycledEquipment.push({
        id: equipmentId,
        name: equipment.name,
        value: recycleValue
      });
    }
    
    res.json({
      success: true,
      message: `回收完成，获得 ${totalSpiritStones} 灵石`,
      data: {
        recycled: recycledEquipment,
        failed: failedEquipment,
        total_spirit_stones: totalSpiritStones
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 装备/卸下装备
router.post('/equip', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }
    
    const { player_id, equipment_id, equip } = req.body;
    
    if (!player_id || !equipment_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    // 获取玩家信息
    const player = await playerStorage.getOrCreatePlayer(player_id);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    // 获取装备
    const equipment = await playerEquipmentStorage.getEquipmentById(player.id, equipment_id);
    if (!equipment) {
      return res.status(404).json({ success: false, error: '装备不存在' });
    }
    
    // 切换装备状态
    const isEquipped = equip ? 1 : 0;
    await playerEquipmentStorage.toggleEquip(player.id, equipment_id, isEquipped);
    
    // 获取更新后的装备列表
    const equippedItems = await playerEquipmentStorage.getEquippedItems(player.id);
    
    res.json({
      success: true,
      message: isEquipped ? '装备成功' : '卸下成功',
      data: {
        equipped_items: equippedItems
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 添加材料到仓库（gm或系统调用）
router.post('/add-material', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }
    
    const { player_id, material_id, quantity } = req.body;
    
    if (!player_id || !material_id || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    // 获取玩家信息
    const player = await playerStorage.getOrCreatePlayer(player_id);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    // 添加材料
    await playerMaterialStorage.addMaterial(player.id, material_id, quantity);
    
    // 获取材料信息
    const material = await forgeStorage.getMaterialById(material_id);
    
    res.json({
      success: true,
      message: `添加 ${material?.name || material_id} x${quantity} 成功`,
      data: {
        material_id,
        material_name: material?.name,
        quantity
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 加载配置模块
let gameConfig;
function loadGameConfig() {
  if (!gameConfig) {
    try {
      gameConfig = require('./gameConfig');
    } catch (e) {
      console.error('加载gameConfig失败:', e.message);
    }
  }
  return gameConfig;
}

// 获取强化石数量
router.get('/qianghua-stone', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '存储系统未就绪' });
    }
    
    const { player_id } = req.query;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const player = await playerStorage.getOrCreatePlayer(player_id);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    // 获取强化石数量 (兼容旧玩家)
    const qianghuaStones = player.qianghua_stones || player.qianghua_stone || 0;
    
    res.json({
      success: true,
      data: {
        player_id: player.id,
        qianghua_stones: qianghuaStones
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 分解单个装备
router.post('/decompose', async (req, res) => {
  try {
    const config = loadGameConfig();
    if (!loadDependencies() || !config) {
      return res.status(500).json({ success: false, error: '系统未就绪' });
    }
    
    const { player_id, equipment_id } = req.body;
    
    if (!player_id || !equipment_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    // 获取玩家信息
    const player = await playerStorage.getOrCreatePlayer(player_id);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    // 获取装备信息
    const equipment = await playerEquipmentStorage.getEquipmentById(player.id, equipment_id);
    if (!equipment) {
      return res.status(404).json({ success: false, error: '装备不存在' });
    }
    
    // 检查是否可以分解
    const { canDecompose, reason } = config.canDecompose(equipment);
    if (!canDecompose) {
      return res.status(400).json({ success: false, error: reason });
    }
    
    // 计算可获得的强化石数量
    const reward = config.getDecomposeReward(equipment.rarity);
    if (reward === null) {
      return res.status(400).json({ success: false, error: `${config.RARITY_NAMES[equipment.rarity] || '普通'}装备无法分解` });
    }
    
    // 添加强化石到玩家账户
    await playerStorage.updateQianghuaStones(player.id, reward);
    
    // 删除装备记录
    await playerEquipmentStorage.deleteEquipment(player.id, equipment_id);
    
    // 获取更新后的强化石数量
    const updatedPlayer = await playerStorage.getOrCreatePlayer(player_id);
    const newQianghuaStones = updatedPlayer.qianghua_stones || updatedPlayer.qianghua_stone || 0;
    
    res.json({
      success: true,
      message: `分解成功，获得 ${reward} 个强化石`,
      data: {
        equipment: {
          id: equipment_id,
          name: equipment.name,
          rarity: equipment.rarity
        },
        reward: reward,
        total_qianghua_stones: newQianghuaStones
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 批量分解装备
router.post('/batch-decompose', async (req, res) => {
  try {
    const config = loadGameConfig();
    if (!loadDependencies() || !config) {
      return res.status(500).json({ success: false, error: '系统未就绪' });
    }
    
    const { player_id, equipment_ids } = req.body;
    
    if (!player_id || !equipment_ids || !Array.isArray(equipment_ids) || equipment_ids.length === 0) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    // 获取玩家信息
    const player = await playerStorage.getOrCreatePlayer(player_id);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    const decomposedEquipment = [];
    const failedEquipment = [];
    let totalReward = 0;
    
    for (const equipmentId of equipment_ids) {
      // 获取装备信息
      const equipment = await playerEquipmentStorage.getEquipmentById(player.id, equipmentId);
      
      if (!equipment) {
        failedEquipment.push({ id: equipmentId, reason: '装备不存在' });
        continue;
      }
      
      // 检查是否可以分解
      const { canDecompose, reason } = config.canDecompose(equipment);
      if (!canDecompose) {
        failedEquipment.push({ id: equipmentId, name: equipment.name, reason });
        continue;
      }
      
      // 计算可获得的强化石数量
      const reward = config.getDecomposeReward(equipment.rarity);
      if (reward === null) {
        failedEquipment.push({ id: equipmentId, name: equipment.name, reason: `${config.RARITY_NAMES[equipment.rarity]}装备无法分解` });
        continue;
      }
      
      // 添加强化石
      await playerStorage.updateQianghuaStones(player.id, reward);
      
      // 删除装备记录
      await playerEquipmentStorage.deleteEquipment(player.id, equipmentId);
      
      totalReward += reward;
      decomposedEquipment.push({
        id: equipmentId,
        name: equipment.name,
        rarity: equipment.rarity,
        reward: reward
      });
    }
    
    // 获取更新后的强化石数量
    const updatedPlayer = await playerStorage.getOrCreatePlayer(player_id);
    const newQianghuaStones = updatedPlayer.qianghua_stones || updatedPlayer.qianghua_stone || 0;
    
    res.json({
      success: true,
      message: `分解完成，共分解 ${decomposedEquipment.length} 件装备，获得 ${totalReward} 个强化石`,
      data: {
        decomposed: decomposedEquipment,
        failed: failedEquipment,
        total_reward: totalReward,
        total_qianghua_stones: newQianghuaStones
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
