/**
 * 器灵系统 API
 */

const express = require('express');
const router = express.Router();

// 提取玩家ID：优先从 req.userId（auth中间件）> userId > playerId > user_id > player_id
function extractUserId(req) {
  return parseInt(req.userId || req.body?.userId || req.body?.playerId || req.query?.userId || req.query?.playerId || req.body?.user_id || req.query?.user_id || 1);
}

// 提取器灵ID：支持 artifactId / artifact_id
function extractArtifactId(req) {
  return parseInt(req.body?.artifactId || req.body?.artifact_id || req.query?.artifactId || req.query?.artifact_id || 0);
}

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
    const playerId = extractUserId(req);
    
    const deps = loadDependencies();
    const unlocked = deps.storage.getUnlockedArtifacts(playerId);
    const owned = deps.storage.getPlayerArtifacts(playerId);
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
    const playerId = extractUserId(req);
    
    const deps = loadDependencies();
    const unlocked = deps.storage.getUnlockedArtifacts(playerId);
    const owned = deps.storage.getPlayerArtifacts(playerId);
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
    const playerId = extractUserId(req);
    
    const deps = loadDependencies();
    const artifacts = deps.storage.getPlayerArtifacts(playerId);
    const equipped = deps.storage.getEquippedArtifacts(playerId);
    const totalBonus = deps.storage.getTotalBonus(playerId);
    
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
    const playerId = extractUserId(req);
    
    const deps = loadDependencies();
    const equipped = deps.storage.getEquippedArtifacts(playerId);
    const totalBonus = deps.storage.getTotalBonus(playerId);
    
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
    const playerId = extractUserId(req);
    const artifactId = extractArtifactId(req);
    
    if (!playerId || !artifactId) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const deps = loadDependencies();
    const result = deps.storage.acquireArtifact(playerId, artifactId);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 装备器灵
router.post('/equip', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const artifactId = extractArtifactId(req);
    const slot = req.body?.slot;
    
    if (!playerId || !artifactId) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const deps = loadDependencies();
    const result = deps.storage.equipArtifact(playerId, artifactId, slot || 'weapon');
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 卸下器灵
router.post('/unequip', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const artifactId = extractArtifactId(req);
    
    if (!playerId || !artifactId) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const deps = loadDependencies();
    const result = deps.storage.unequipArtifact(playerId, artifactId);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 升级器灵
router.post('/upgrade', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const artifactId = extractArtifactId(req);
    
    if (!playerId || !artifactId) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const deps = loadDependencies();
    const result = deps.storage.upgradeArtifact(playerId, artifactId);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 炼化器灵
router.post('/refine', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const artifactId = extractArtifactId(req);
    
    if (!playerId || !artifactId) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const deps = loadDependencies();
    const result = deps.storage.refineArtifact ? deps.storage.refineArtifact(playerId, artifactId) : { success: false, error: '功能未开放' };
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取天材地宝
router.get('/materials', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const deps = loadDependencies();
    const materials = deps.storage.getPlayerMaterials ? deps.storage.getPlayerMaterials(playerId) : [];
    res.json({ success: true, data: materials });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 使用天材地宝
router.post('/use-treasure', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const treasureId = parseInt(req.body?.treasureId || req.body?.treasure_id || 0);
    
    if (!playerId || !treasureId) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const deps = loadDependencies();
    const result = deps.storage.useTreasure ? deps.storage.useTreasure(playerId, treasureId) : { success: false, error: '功能未开放' };
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 回收器灵
router.post('/recycle', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const artifactId = extractArtifactId(req);
    
    if (!playerId || !artifactId) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const deps = loadDependencies();
    const result = deps.storage.recycleArtifact ? deps.storage.recycleArtifact(playerId, artifactId) : { success: false, error: '功能未开放' };
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取器灵详情
router.get('/:artifactId', (req, res) => {
  try {
    const playerId = extractUserId(req);
    const artifactId = parseInt(req.params.artifactId);
    
    const deps = loadDependencies();
    const unlocked = deps.storage.getUnlockedArtifacts(playerId);
    const artifact = unlocked.find(a => a.id === artifactId);
    
    if (!artifact) {
      return res.status(404).json({ success: false, error: '器灵不存在' });
    }
    
    const owned = deps.storage.getPlayerArtifacts(playerId);
    const ownedIds = owned.map(o => o.artifact_id);
    
    res.json({ 
      success: true, 
      data: { 
        ...artifact, 
        is_owned: ownedIds.includes(artifactId),
        rarity_config: deps.RARITY_CONFIG[artifact.rarity]
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
