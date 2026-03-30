/**
 * 器灵系统 API
 */

const express = require('express');
const router = express.Router();

// 加载依赖
let spiritArtifactStorage, RARITY_CONFIG;
function loadDependencies() {
  if (!spiritArtifactStorage) {
    try {
      const mod = require('./spirit_artifact_storage');
      spiritArtifactStorage = mod.spiritArtifactStorage;
      RARITY_CONFIG = mod.RARITY_CONFIG;
    } catch (e) {
      console.error('加载spirit_artifact_storage失败:', e.message);
    }
  }
  return { storage: spiritArtifactStorage, RARITY_CONFIG };
}

// 器灵根路由 - 兼容前端 /api/spirit 调用（转发到 /list 逻辑）
router.get('/', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const deps = loadDependencies();
    const unlocked = deps.storage.getUnlockedArtifacts(parseInt(player_id));
    const owned = deps.storage.getPlayerArtifacts(parseInt(player_id));
    const ownedIds = owned.map(o => o.artifact_id);
    
    const artifacts = unlocked.map(a => ({
      ...a,
      is_owned: ownedIds.includes(a.id),
      rarity_config: deps.RARITY_CONFIG[a.rarity]
    }));
    
    res.json({ success: true, data: artifacts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取所有器灵配置
router.get('/list', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const deps = loadDependencies();
    const unlocked = deps.storage.getUnlockedArtifacts(parseInt(player_id));
    const owned = deps.storage.getPlayerArtifacts(parseInt(player_id));
    const ownedIds = owned.map(o => o.artifact_id);
    
    // 标记哪些已拥有
    const artifacts = unlocked.map(a => ({
      ...a,
      is_owned: ownedIds.includes(a.id),
      rarity_config: deps.RARITY_CONFIG[a.rarity]
    }));
    
    res.json({ success: true, data: artifacts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家器灵
router.get('/my', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const deps = loadDependencies();
    const artifacts = deps.storage.getPlayerArtifacts(parseInt(player_id));
    const equipped = deps.storage.getEquippedArtifacts(parseInt(player_id));
    const totalBonus = deps.storage.getTotalBonus(parseInt(player_id));
    
    res.json({ 
      success: true, 
      data: { 
        artifacts,
        equipped,
        total_bonus: totalBonus
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取已装备器灵
router.get('/equipped', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const deps = loadDependencies();
    const equipped = deps.storage.getEquippedArtifacts(parseInt(player_id));
    const totalBonus = deps.storage.getTotalBonus(parseInt(player_id));
    
    res.json({ 
      success: true, 
      data: { equipped, total_bonus: totalBonus } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 激活器灵
router.post('/acquire', (req, res) => {
  try {
    const { player_id, artifact_id } = req.body;
    
    if (!player_id || !artifact_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const deps = loadDependencies();
    const result = deps.storage.acquireArtifact(parseInt(player_id), parseInt(artifact_id));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 装备器灵
router.post('/equip', (req, res) => {
  try {
    const { player_id, artifact_id, slot } = req.body;
    
    if (!player_id || !artifact_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const deps = loadDependencies();
    const result = deps.storage.equipArtifact(parseInt(player_id), parseInt(artifact_id), slot || 'weapon');
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 卸下器灵
router.post('/unequip', (req, res) => {
  try {
    const { player_id, artifact_id } = req.body;
    
    if (!player_id || !artifact_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const deps = loadDependencies();
    const result = deps.storage.unequipArtifact(parseInt(player_id), parseInt(artifact_id));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 升级器灵
router.post('/upgrade', (req, res) => {
  try {
    const { player_id, artifact_id } = req.body;
    
    if (!player_id || !artifact_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const deps = loadDependencies();
    const result = deps.storage.upgradeArtifact(parseInt(player_id), parseInt(artifact_id));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
