/**
 * 炼丹系统 API
 */

const express = require('express');
const router = express.Router();

// 延迟加载依赖
let playerStorage, storage;
let alchemyRecipeStorage, alchemyMaterialStorage, alchemyFurnaceStorage, alchemyPillStorage;

function loadDependencies() {
  if (!playerStorage) {
    try {
      const storageModule = require('./storage');
      playerStorage = storageModule.playerStorage;
    } catch (e) {
      console.error('加载storage失败:', e.message);
    }
  }

  if (!alchemyRecipeStorage) {
    try {
      const alchemyStorage = require('./alchemy_storage');
      alchemyRecipeStorage = alchemyStorage.alchemyRecipeStorage;
      alchemyMaterialStorage = alchemyStorage.alchemyMaterialStorage;
      alchemyFurnaceStorage = alchemyStorage.alchemyFurnaceStorage;
      alchemyPillStorage = alchemyStorage.alchemyPillStorage;
    } catch (e) {
      console.error('加载alchemy_storage失败:', e.message);
    }
  }

  return playerStorage && alchemyRecipeStorage;
}

// ========== 整合信息 API ==========

// 获取炼丹系统完整信息（recipes + materials + furnace + pills）
router.get('/', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '系统初始化中...' });
    }

    const { player_id } = req.query;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }

    // 并行获取所有数据
    const [recipes, materials, pills, furnaceData] = await Promise.all([
      alchemyRecipeStorage.getRecipeList({}),
      alchemyMaterialStorage.getPlayerMaterials(parseInt(player_id)),
      alchemyPillStorage.getPlayerPills(parseInt(player_id)),
      alchemyFurnaceStorage.getFurnace(parseInt(player_id))
    ]);

    // 格式化丹方
    const formattedRecipes = recipes.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      rarity: r.rarity,
      realm_req: r.realm_req,
      level_req: r.level_req,
      materials: r.materials ? JSON.parse(r.materials) : {},
      effects: r.effects ? JSON.parse(r.effects) : {},
      exp_bonus: r.exp_bonus || 0,
      success_rate: r.success_rate || 0
    }));

    // 格式化材料
    const formattedMaterials = materials.map(m => ({
      id: m.id,
      name: m.name,
      type: m.type,
      quantity: m.quantity || 0,
      quality: m.quality || 1
    }));

    // 格式化丹药
    const formattedPills = pills.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      rarity: p.rarity,
      quantity: p.quantity || 0,
      effects: p.effects ? JSON.parse(p.effects) : {}
    }));

    // 炉子信息
    const furnaceLevel = furnaceData.furnace_level || 1;
    const furnaceBonus = alchemyFurnaceStorage.getFurnaceBonus(furnaceLevel);

    res.json({
      success: true,
      data: {
        recipes: formattedRecipes,
        materials: formattedMaterials,
        pills: formattedPills,
        furnace: {
          level: furnaceLevel,
          exp: furnaceData.furnace_exp || 0,
          bonus: furnaceBonus
        },
        recipe_count: formattedRecipes.length,
        material_count: formattedMaterials.length,
        pill_count: formattedPills.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 丹方 API ==========

// 获取丹方列表
router.get('/recipes', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '系统初始化中...' });
    }

    const { type, rarity, realm_req, level_req } = req.query;
    const filters = {};
    
    if (type) filters.type = type;
    if (rarity) filters.rarity = parseInt(rarity);
    if (realm_req !== undefined) filters.realm_req = parseInt(realm_req);
    if (level_req !== undefined) filters.level_req = parseInt(level_req);

    const recipes = await alchemyRecipeStorage.getRecipeList(filters);
    
    // 解析JSON字段
    const formattedRecipes = recipes.map(r => ({
      ...r,
      effects: r.effects ? JSON.parse(r.effects) : {},
      materials: r.materials ? JSON.parse(r.materials) : {}
    }));

    res.json({ success: true, data: formattedRecipes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单个丹方详情
router.get('/recipes/:id', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '系统初始化中...' });
    }

    const recipe = await alchemyRecipeStorage.getRecipeById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ success: false, error: '丹方不存在' });
    }

    res.json({
      success: true,
      data: {
        ...recipe,
        effects: recipe.effects ? JSON.parse(recipe.effects) : {},
        materials: recipe.materials ? JSON.parse(recipe.materials) : {}
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 药材 API ==========

// 获取药材列表
router.get('/materials', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '系统初始化中...' });
    }

    const { type, rarity, realm_req } = req.query;
    const filters = {};
    
    if (type) filters.type = type;
    if (rarity) filters.rarity = parseInt(rarity);
    if (realm_req !== undefined) filters.realm_req = parseInt(realm_req);

    const materials = await alchemyMaterialStorage.getMaterialList(filters);
    
    // 解析JSON字段
    const formattedMaterials = materials.map(m => ({
      ...m,
      attributes: m.attributes ? JSON.parse(m.attributes) : {}
    }));

    res.json({ success: true, data: formattedMaterials });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家药材仓库
router.get('/materials/my', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '系统初始化中...' });
    }

    const { player_id } = req.query;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }

    const materials = await alchemyMaterialStorage.getPlayerMaterials(parseInt(player_id));
    
    const formattedMaterials = materials.map(m => ({
      ...m,
      attributes: m.attributes ? JSON.parse(m.attributes) : {}
    }));

    res.json({ success: true, data: formattedMaterials });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 添加药材到仓库 (POST)
router.post('/materials', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '系统初始化中...' });
    }

    const { player_id, material_id, quantity } = req.body;
    
    if (!player_id || !material_id || !quantity) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 验证药材是否存在
    const material = await alchemyMaterialStorage.getMaterialById(material_id);
    if (!material) {
      return res.status(404).json({ success: false, error: '药材不存在' });
    }

    // 添加药材
    await alchemyMaterialStorage.addMaterial(parseInt(player_id), material_id, quantity);

    res.json({
      success: true,
      message: `成功添加 ${quantity} 个 ${material.name}`,
      data: {
        material_id,
        material_name: material.name,
        quantity
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 炼丹 API ==========

// 炼丹
router.post('/craft', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '系统初始化中...' });
    }

    const { player_id, recipe_id } = req.body;
    
    if (!player_id || !recipe_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 获取丹方
    const recipe = await alchemyRecipeStorage.getRecipeById(recipe_id);
    if (!recipe) {
      return res.status(404).json({ success: false, error: '丹方不存在' });
    }

    // 获取玩家信息
    const player = await playerStorage.getOrCreatePlayer(player_id);
    
    // 检查境界和等级要求
    if (player.realm_level < recipe.realm_req) {
      return res.status(400).json({ success: false, error: `需要境界达到 ${recipe.realm_req} 重` });
    }
    if (player.level < recipe.level_req) {
      return res.status(400).json({ success: false, error: `需要等级达到 ${recipe.level_req}` });
    }

    // 解析所需材料
    const materials = JSON.parse(recipe.materials);
    const materialList = Object.entries(materials);

    // 检查并消耗材料
    for (const [materialId, requiredQty] of materialList) {
      const hasEnough = await alchemyMaterialStorage.consumeMaterial(
        parseInt(player_id), 
        materialId, 
        requiredQty
      );
      if (!hasEnough) {
        // 恢复已消耗的材料
        for (const [matId, qty] of materialList) {
          if (matId === materialId) break;
          await alchemyMaterialStorage.addMaterial(parseInt(player_id), matId, qty);
        }
        return res.status(400).json({ success: false, error: `材料不足: ${materialId}` });
      }
    }

    // 获取丹炉信息
    const furnace = await alchemyFurnaceStorage.getFurnace(parseInt(player_id));
    const bonus = alchemyFurnaceStorage.getFurnaceBonus(furnace.furnace_level);

    // 计算成功率
    let successRate = recipe.success_rate + bonus.success_rate_bonus;
    successRate = Math.min(successRate, 100); // 最高100%

    // 随机判定
    const roll = Math.random() * 100;
    const isSuccess = roll <= successRate;

    // 记录炼丹
    await alchemyFurnaceStorage.recordCraft(parseInt(player_id), isSuccess);

    // 获得的经验 (炼丹成功获得更多经验)
    const expGained = isSuccess ? recipe.crafting_time * 10 : recipe.crafting_time * 2;
    await alchemyFurnaceStorage.addExp(parseInt(player_id), expGained);

    let result = {
      success: isSuccess,
      recipe: {
        id: recipe.id,
        name: recipe.name,
        icon: recipe.icon,
        rarity: recipe.rarity
      },
      success_rate: successRate.toFixed(1),
      roll: roll.toFixed(1),
      furnace_exp_gained: expGained,
      furnace_level: furnace.furnace_level,
      furnace_exp: furnace.furnace_exp + expGained
    };

    if (isSuccess) {
      // 计算产出数量
      let yieldQty = recipe.yield_min + Math.floor(Math.random() * (recipe.yield_max - recipe.yield_min + 1));
      yieldQty += bonus.yield_bonus; // 丹炉加成
      
      // 添加丹药到库存
      await alchemyPillStorage.addPill(parseInt(player_id), recipe_id, yieldQty);
      
      result.yield = yieldQty;
      result.message = `🎉 炼丹成功！获得 ${yieldQty} 颗 ${recipe.name}！`;
      result.effects = JSON.parse(recipe.effects);
    } else {
      result.yield = 0;
      result.message = `💨 炼丹失败，材料化为灰烬...`;
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家丹药库存
router.get('/pills', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '系统初始化中...' });
    }

    const { player_id } = req.query;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }

    const pills = await alchemyPillStorage.getPlayerPills(parseInt(player_id));
    
    const formattedPills = pills.map(p => ({
      ...p,
      effects: p.effects ? JSON.parse(p.effects) : {}
    }));

    res.json({ success: true, data: formattedPills });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 丹炉 API ==========

// 获取玩家丹炉信息
router.get('/furnace', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '系统初始化中...' });
    }

    const { player_id } = req.query;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }

    const furnace = await alchemyFurnaceStorage.getFurnace(parseInt(player_id));
    const bonus = alchemyFurnaceStorage.getFurnaceBonus(furnace.furnace_level);
    const nextLevelExp = alchemyFurnaceStorage.getUpgradeExp(furnace.furnace_level + 1);

    // 计算成功率
    const successRate = Math.min(30 + furnace.furnace_level * 5, 95);

    res.json({
      success: true,
      data: {
        ...furnace,
        bonus,
        success_rate: successRate,
        next_level_exp: nextLevelExp,
        exp_needed_for_upgrade: nextLevelExp - furnace.furnace_exp
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 升级丹炉
router.post('/furnace/upgrade', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '系统初始化中...' });
    }

    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }

    const furnace = await alchemyFurnaceStorage.getFurnace(parseInt(player_id));
    const nextLevel = furnace.furnace_level + 1;
    const expNeeded = alchemyFurnaceStorage.getUpgradeExp(nextLevel);

    if (furnace.furnace_exp < expNeeded) {
      return res.status(400).json({ 
        success: false, 
        error: `升级需要 ${expNeeded} 点丹炉经验，当前仅有 ${furnace.furnace_exp} 点`,
        current_exp: furnace.furnace_exp,
        exp_needed: expNeeded,
        shortfall: expNeeded - furnace.furnace_exp
      });
    }

    // 升级丹炉
    const upgradedFurnace = await alchemyFurnaceStorage.upgradeFurnace(parseInt(player_id));
    const bonus = alchemyFurnaceStorage.getFurnaceBonus(upgradedFurnace.furnace_level);

    res.json({
      success: true,
      message: `🔥 丹炉升级成功！等级提升至 ${upgradedFurnace.furnace_level}！`,
      data: {
        ...upgradedFurnace,
        bonus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取丹炉升级信息 (预览)
router.get('/furnace/upgrade-info', async (req, res) => {
  try {
    if (!loadDependencies()) {
      return res.status(500).json({ success: false, error: '系统初始化中...' });
    }

    const { player_id } = req.query;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }

    const furnace = await alchemyFurnaceStorage.getFurnace(parseInt(player_id));
    const nextLevel = furnace.furnace_level + 1;
    const expNeeded = alchemyFurnaceStorage.getUpgradeExp(nextLevel);
    const currentBonus = alchemyFurnaceStorage.getFurnaceBonus(furnace.furnace_level);
    const nextBonus = alchemyFurnaceStorage.getFurnaceBonus(nextLevel);

    res.json({
      success: true,
      data: {
        current_level: furnace.furnace_level,
        current_exp: furnace.furnace_exp,
        next_level,
        exp_needed: expNeeded,
        can_upgrade: furnace.furnace_exp >= expNeeded,
        current_bonus: currentBonus,
        next_bonus: nextBonus,
        bonus_improvement: {
          success_rate_bonus: nextBonus.success_rate_bonus - currentBonus.success_rate_bonus,
          exp_bonus: nextBonus.exp_bonus - currentBonus.exp_bonus,
          yield_bonus: nextBonus.yield_bonus - currentBonus.yield_bonus
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
