/**
 * 灵兽系统 API 路由 - 完整实现
 * 包含：宠物列表、详情、升级、合成
 */

const express = require('express');
const router = express.Router();

console.log('[Pet API] 正在加载宠物系统API...');

// 获取数据库连接（从全局变量）
function getDb() {
  if (typeof global.db !== 'undefined') {
    return global.db;
  }
  return null;
}

// ========== 中间件：模拟用户认证 ==========
const mockAuth = (req, res, next) => {
  const playerId = parseInt(req.headers['x-player-id']) || 1;
  req.playerId = playerId;
  next();
};

// ========== 宠物类型定义 ==========
const PET_TYPES = [
  {
    type: 'attack',
    name: '攻击型',
    nameCn: '攻击型',
    description: '擅长输出的灵兽，攻击属性较高',
    attributeBonus: { attack: 1.2, health: 0.8, defense: 0.8, speed: 1.0 }
  },
  {
    type: 'defense',
    name: '防御型',
    nameCn: '防御型',
    description: '擅长防御的灵兽，生命和防御属性较高',
    attributeBonus: { attack: 0.8, health: 1.3, defense: 1.3, speed: 0.8 }
  },
  {
    type: 'support',
    name: '辅助型',
    nameCn: '辅助型',
    description: '擅长辅助的灵兽，速度和恢复能力较强',
    attributeBonus: { attack: 0.9, health: 1.0, defense: 0.9, speed: 1.3 }
  }
];

// ========== 进化形态配置 ==========
const EVOLUTION_CONFIGS = [
  { form: 1, name: 'Infant', nameCn: '幼年期', maxLevel: 20, attributeMultiplier: 1.0, appearance: 'infant' },
  { form: 2, name: 'Youth', nameCn: '成长期', maxLevel: 40, attributeMultiplier: 1.5, appearance: 'youth' },
  { form: 3, name: 'Adult', nameCn: '成熟期', maxLevel: 60, attributeMultiplier: 2.0, appearance: 'adult' },
  { form: 4, name: 'Perfect', nameCn: '完全体', maxLevel: 80, attributeMultiplier: 2.5, appearance: 'perfect' },
  { form: 5, name: 'Ultimate', nameCn: '究极体', maxLevel: 100, attributeMultiplier: 3.0, appearance: 'ultimate' }
];

// ========== 资质等级配置 ==========
const TALENT_CONFIGS = {
  normal: { level: 'normal', name: 'Normal', nameCn: '普通', multiplier: 1.0 },
  good: { level: 'good', name: 'Good', nameCn: '优秀', multiplier: 1.25 },
  excellent: { level: 'excellent', name: 'Excellent', nameCn: '卓越', multiplier: 1.5 },
  legendary: { level: 'legendary', name: 'Legendary', nameCn: '传说', multiplier: 2.0 },
  godlike: { level: 'godlike', name: 'Godlike', nameCn: '神品', multiplier: 3.0 }
};

// ========== 升级道具配置 ==========
const UPGRADE_ITEMS = {
  'pet_exp_pill_small': { exp: 100, name: '小经验丹' },
  'pet_exp_pill_medium': { exp: 500, name: '中经验丹' },
  'pet_exp_pill_large': { exp: 2000, name: '大经验丹' },
  'pet_exp_pill_giant': { exp: 10000, name: '巨经验丹' }
};

// 玩家背包（内存模拟）
const playerBackpack = new Map();

// ========== GET /api/pet/types - 获取宠物类型 ==========
router.get('/types', (req, res) => {
  res.json({
    success: true,
    data: { types: PET_TYPES }
  });
});

// ========== GET /api/pet/list - 获取宠物列表 ==========
router.get('/list', mockAuth, (req, res) => {
  try {
    const db = getDb();
    const playerId = req.playerId;
    
    let pets = [];
    if (db) {
      try {
        pets = db.prepare('SELECT * FROM pets WHERE player_id = ? ORDER BY level DESC').all(playerId);
      } catch (e) {
        console.log('[Pet] 查询宠物列表失败:', e.message);
      }
    }
    
    // 解析技能 JSON
    pets = pets.map(pet => ({
      ...pet,
      skills: JSON.parse(pet.skills || '[]'),
      innateSkills: JSON.parse(pet.innate_skills || '[]')
    }));
    
    res.json({
      success: true,
      data: { pets }
    });
  } catch (error) {
    console.error('[Pet] 获取宠物列表失败:', error);
    res.json({ success: false, data: { message: '获取宠物列表失败' } });
  }
});

// ========== GET /api/pet/detail/:petId - 获取宠物详情 ==========
router.get('/detail/:petId', mockAuth, (req, res) => {
  try {
    const db = getDb();
    const playerId = req.playerId;
    const { petId } = req.params;
    
    if (!db) {
      res.json({ success: false, data: { message: '数据库未初始化' } });
      return;
    }
    
    const pet = db.prepare('SELECT * FROM pets WHERE pet_id = ?').get(petId);
    
    if (!pet) {
      res.json({ success: false, data: { message: '灵兽不存在' } });
      return;
    }
    
    if (pet.player_id !== playerId) {
      res.json({ success: false, data: { message: '这不是你的灵兽' } });
      return;
    }
    
    const result = {
      ...pet,
      skills: JSON.parse(pet.skills || '[]'),
      innateSkills: JSON.parse(pet.innate_skills || '[]')
    };
    
    res.json({ success: true, data: { pet: result } });
  } catch (error) {
    console.error('[Pet] 获取灵兽详情失败:', error);
    res.json({ success: false, data: { message: '获取灵兽详情失败' } });
  }
});

// ========== GET /api/pet/templates - 获取宠物模板 ==========
router.get('/templates', (req, res) => {
  try {
    const db = getDb();
    
    let templates = [];
    if (db) {
      try {
        templates = db.prepare('SELECT * FROM pet_templates').all();
      } catch (e) {
        // 表可能不存在
      }
    }
    
    res.json({ success: true, data: { templates } });
  } catch (error) {
    console.error('[Pet] 获取宠物模板失败:', error);
    res.json({ success: false, data: { message: '获取宠物模板失败' } });
  }
});

// ========== POST /api/pet/create - 创建宠物 ==========
router.post('/create', mockAuth, (req, res) => {
  try {
    const db = getDb();
    const playerId = req.playerId;
    const { templateId, name } = req.body;
    
    if (!templateId || !name) {
      res.json({ success: false, data: { message: '缺少必要参数' } });
      return;
    }
    
    if (!db) {
      res.json({ success: false, data: { message: '数据库未初始化' } });
      return;
    }
    
    // 获取模板
    const template = db.prepare('SELECT * FROM pet_templates WHERE template_id = ?').get(templateId);
    if (!template) {
      res.json({ success: false, data: { message: '宠物模板不存在' } });
      return;
    }
    
    // 生成宠物ID
    const petId = `pet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    // 计算初始属性
    const talentLevel = 'normal';
    const talentConfig = TALENT_CONFIGS[talentLevel];
    const formConfig = EVOLUTION_CONFIGS[0];
    
    const health = Math.floor(template.base_health * formConfig.attributeMultiplier * talentConfig.multiplier);
    const attack = Math.floor(template.base_attack * formConfig.attributeMultiplier * talentConfig.multiplier);
    const defense = Math.floor(template.base_defense * formConfig.attributeMultiplier * talentConfig.multiplier);
    const speed = Math.floor(template.base_speed * formConfig.attributeMultiplier * talentConfig.multiplier);
    
    // 解析先天技能
    const innateSkills = JSON.parse(template.innate_skills || '[]');
    
    // 插入数据库
    db.prepare(`
      INSERT INTO pets (pet_id, player_id, template_id, name, name_cn, level, exp, form, talent_level, max_level, health, attack, defense, speed, skills, innate_skills, appearance, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(petId, playerId, templateId, name, template.name_cn || name, 1, 0, 1, talentLevel, formConfig.maxLevel, health, attack, defense, speed, '[]', JSON.stringify(innateSkills), formConfig.appearance, now, now);
    
    const pet = db.prepare('SELECT * FROM pets WHERE pet_id = ?').get(petId);
    
    res.json({
      success: true,
      data: { 
        pet: {
          ...pet,
          skills: [],
          innateSkills: innateSkills
        },
        message: '灵兽创建成功'
      }
    });
  } catch (error) {
    console.error('[Pet] 创建灵兽失败:', error);
    res.json({ success: false, data: { message: '创建灵兽失败' } });
  }
});

// ========== POST /api/pet/upgrade - 宠物升级（使用经验） ==========
router.post('/upgrade', mockAuth, (req, res) => {
  try {
    const db = getDb();
    const playerId = req.playerId;
    const { petId, expAmount } = req.body;
    
    if (!petId || !expAmount) {
      res.json({ success: false, data: { message: '缺少必要参数' } });
      return;
    }
    
    if (!db) {
      res.json({ success: false, data: { message: '数据库未初始化' } });
      return;
    }
    
    const pet = db.prepare('SELECT * FROM pets WHERE pet_id = ?').get(petId);
    if (!pet) {
      res.json({ success: false, data: { message: '灵兽不存在' } });
      return;
    }
    
    if (pet.player_id !== playerId) {
      res.json({ success: false, data: { message: '这不是你的灵兽' } });
      return;
    }
    
    if (pet.level >= pet.max_level) {
      res.json({ success: false, data: { message: `灵兽已达到等级上限${pet.max_level}级` } });
      return;
    }
    
    const newExp = pet.exp + expAmount;
    let newLevel = pet.level;
    let remainingExp = newExp;
    
    // 循环升级
    while (remainingExp >= (newLevel * 100) && newLevel < pet.max_level) {
      remainingExp -= newLevel * 100;
      newLevel++;
    }
    
    if (newLevel === pet.level) {
      res.json({
        success: true,
        data: { 
          pet: pet,
          message: `获得${expAmount}点经验，当前经验 ${pet.exp}/${pet.level * 100}`
        }
      });
      return;
    }
    
    // 计算属性提升 (每级5%)
    const template = db.prepare('SELECT * FROM pet_templates WHERE template_id = ?').get(pet.template_id);
    if (!template) {
      res.json({ success: false, data: { message: '宠物模板不存在' } });
      return;
    }
    
    const formConfig = EVOLUTION_CONFIGS.find(c => c.form === pet.form) || EVOLUTION_CONFIGS[0];
    const talentConfig = TALENT_CONFIGS[pet.talent_level] || TALENT_CONFIGS.normal;
    
    const levelDiff = newLevel - pet.level;
    const healthIncrease = Math.floor(template.base_health * formConfig.attributeMultiplier * 0.05 * talentConfig.multiplier * levelDiff);
    const attackIncrease = Math.floor(template.base_attack * formConfig.attributeMultiplier * 0.05 * talentConfig.multiplier * levelDiff);
    const defenseIncrease = Math.floor(template.base_defense * formConfig.attributeMultiplier * 0.05 * talentConfig.multiplier * levelDiff);
    const speedIncrease = Math.floor(template.base_speed * formConfig.attributeMultiplier * 0.05 * talentConfig.multiplier * levelDiff);
    
    // 更新数据库
    db.prepare(`
      UPDATE pets SET level = ?, exp = ?, health = ?, attack = ?, defense = ?, speed = ?, updated_at = ?
      WHERE pet_id = ?
    `).run(newLevel, remainingExp, pet.health + healthIncrease, pet.attack + attackIncrease, pet.defense + defenseIncrease, pet.speed + speedIncrease, Date.now(), petId);
    
    const updatedPet = db.prepare('SELECT * FROM pets WHERE pet_id = ?').get(petId);
    
    res.json({
      success: true,
      data: { 
        pet: {
          ...updatedPet,
          skills: JSON.parse(updatedPet.skills || '[]'),
          innateSkills: JSON.parse(updatedPet.innate_skills || '[]')
        },
        message: `灵兽升级成功！等级 ${pet.level} → ${newLevel}，属性大幅提升！`
      }
    });
  } catch (error) {
    console.error('[Pet] 灵兽升级失败:', error);
    res.json({ success: false, data: { message: '灵兽升级失败' } });
  }
});

// ========== POST /api/pet/upgrade-with-item - 宠物升级（使用道具） ==========
router.post('/upgrade-with-item', mockAuth, (req, res) => {
  try {
    const playerId = req.playerId;
    const { petId, itemId } = req.body;
    
    if (!petId || !itemId) {
      res.json({ success: false, data: { message: '缺少必要参数' } });
      return;
    }
    
    const itemConfig = UPGRADE_ITEMS[itemId];
    if (!itemConfig) {
      res.json({ success: false, data: { message: '无效的升级道具' } });
      return;
    }
    
    // 模拟消耗道具（实际应该从背包扣除）
    // 这里直接调用升级接口
    req.body.expAmount = itemConfig.exp;
    return router.handle(req, res, (err) => {
      if (err) {
        res.json({ success: false, data: { message: '升级失败' } });
      }
    });
  } catch (error) {
    console.error('[Pet] 使用道具升级失败:', error);
    res.json({ success: false, data: { message: '使用道具升级失败' } });
  }
});

// ========== GET /api/pet/exp-info/:petId - 获取升级所需经验 ==========
router.get('/exp-info/:petId', mockAuth, (req, res) => {
  try {
    const db = getDb();
    const { petId } = req.params;
    
    if (!db) {
      res.json({ success: false, data: { message: '数据库未初始化' } });
      return;
    }
    
    const pet = db.prepare('SELECT * FROM pets WHERE pet_id = ?').get(petId);
    if (!pet) {
      res.json({ success: false, data: { message: '灵兽不存在' } });
      return;
    }
    
    const expToNextLevel = pet.level * 100;
    
    res.json({
      success: true,
      data: {
        currentLevel: pet.level,
        currentExp: pet.exp,
        expToNextLevel: expToNextLevel,
        maxLevel: pet.max_level,
        expProgress: Math.floor((pet.exp / expToNextLevel) * 100)
      }
    });
  } catch (error) {
    console.error('[Pet] 获取经验信息失败:', error);
    res.json({ success: false, data: { message: '获取经验信息失败' } });
  }
});

// ========== POST /api/pet/combine - 宠物合成 ==========
router.post('/combine', mockAuth, (req, res) => {
  try {
    const db = getDb();
    const playerId = req.playerId;
    const { petId1, petId2 } = req.body;
    
    if (!petId1 || !petId2) {
      res.json({ success: false, data: { message: '缺少必要参数' } });
      return;
    }
    
    if (!db) {
      res.json({ success: false, data: { message: '数据库未初始化' } });
      return;
    }
    
    const pet1 = db.prepare('SELECT * FROM pets WHERE pet_id = ?').get(petId1);
    const pet2 = db.prepare('SELECT * FROM pets WHERE pet_id = ?').get(petId2);
    
    if (!pet1 || !pet2) {
      res.json({ success: false, data: { message: '灵兽不存在' } });
      return;
    }
    
    if (pet1.player_id !== playerId || pet2.player_id !== playerId) {
      res.json({ success: false, data: { message: '这两只灵兽不是你的' } });
      return;
    }
    
    if (petId1 === petId2) {
      res.json({ success: false, data: { message: '不能使用同一只灵兽进行合成' } });
      return;
    }
    
    if (pet1.template_id !== pet2.template_id) {
      res.json({ success: false, data: { message: '只能合成相同品种的灵兽' } });
      return;
    }
    
    const minLevel = Math.min(pet1.level, pet2.level);
    if (minLevel < 10) {
      res.json({ success: false, data: { message: '两只灵兽都需要达到10级才能进行合成' } });
      return;
    }
    
    // 计算新的资质
    const talentLevels = ['normal', 'good', 'excellent', 'legendary', 'godlike'];
    const talent1Index = talentLevels.indexOf(pet1.talent_level);
    const talent2Index = talentLevels.indexOf(pet2.talent_level);
    const avgTalentIndex = Math.floor((talent1Index + talent2Index) / 2);
    
    let newTalentLevel = talentLevels[avgTalentIndex];
    if (Math.random() < 0.3 && avgTalentIndex < 4) {
      newTalentLevel = talentLevels[avgTalentIndex + 1];
    }
    
    // 合并技能
    const skills1 = JSON.parse(pet1.skills || '[]');
    const skills2 = JSON.parse(pet2.skills || '[]');
    const innate1 = JSON.parse(pet1.innate_skills || '[]');
    const innate2 = JSON.parse(pet2.innate_skills || '[]');
    const combinedSkills = [...new Set([...skills1, ...skills2, ...innate1, ...innate2])].slice(0, 4);
    
    // 计算新属性
    const formConfig = EVOLUTION_CONFIGS.find(c => c.form === Math.max(pet1.form, pet2.form)) || EVOLUTION_CONFIGS[0];
    const talentConfig = TALENT_CONFIGS[newTalentLevel];
    
    const avgHealth = Math.floor((pet1.health + pet2.health) / 2 * 1.2);
    const avgAttack = Math.floor((pet1.attack + pet2.attack) / 2 * 1.2);
    const avgDefense = Math.floor((pet1.defense + pet2.defense) / 2 * 1.2);
    const avgSpeed = Math.floor((pet1.speed + pet2.speed) / 2 * 1.2);
    
    const newLevel = Math.max(pet1.level, pet2.level);
    const template = db.prepare('SELECT * FROM pet_templates WHERE template_id = ?').get(pet1.template_id);
    
    // 创建新宠物
    const newPetId = `pet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    db.prepare(`
      INSERT INTO pets (pet_id, player_id, template_id, name, name_cn, level, exp, form, talent_level, max_level, health, attack, defense, speed, skills, innate_skills, appearance, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(newPetId, playerId, pet1.template_id, `${pet1.name}+${pet2.name}`, template?.name_cn || '灵兽', newLevel, 0, Math.max(pet1.form, pet2.form), newTalentLevel, formConfig.maxLevel, avgHealth, avgAttack, avgDefense, avgSpeed, JSON.stringify(combinedSkills), '[]', formConfig.appearance, now, now);
    
    // 删除原来的两只宠物
    db.prepare('DELETE FROM pets WHERE pet_id = ?').run(petId1);
    db.prepare('DELETE FROM pets WHERE pet_id = ?').run(petId2);
    
    const newPet = db.prepare('SELECT * FROM pets WHERE pet_id = ?').get(newPetId);
    
    res.json({
      success: true,
      data: { 
        pet: {
          ...newPet,
          skills: JSON.parse(newPet.skills || '[]'),
          innateSkills: JSON.parse(newPet.innate_skills || '[]')
        },
        message: `合成成功！两只灵兽合成为高品质灵兽，资质提升为${TALENT_CONFIGS[newTalentLevel].nameCn}！`
      }
    });
  } catch (error) {
    console.error('[Pet] 灵兽合成失败:', error);
    res.json({ success: false, data: { message: '灵兽合成失败' } });
  }
});

// ========== GET /api/pet/combine-info/:petId - 获取合成信息 ==========
router.get('/combine-info/:petId', mockAuth, (req, res) => {
  try {
    const db = getDb();
    const playerId = req.playerId;
    const { petId } = req.params;
    
    if (!db) {
      res.json({ success: false, data: { message: '数据库未初始化' } });
      return;
    }
    
    const pet = db.prepare('SELECT * FROM pets WHERE pet_id = ?').get(petId);
    if (!pet) {
      res.json({ success: false, data: { message: '灵兽不存在' } });
      return;
    }
    
    if (pet.player_id !== playerId) {
      res.json({ success: false, data: { message: '这不是你的灵兽' } });
      return;
    }
    
    // 获取同模板的宠物
    const sameTemplatePets = db.prepare('SELECT * FROM pets WHERE player_id = ? AND template_id = ? AND pet_id != ? AND level >= 10').all(playerId, pet.template_id, petId);
    
    res.json({
      success: true,
      data: {
        currentPet: {
          petId: pet.pet_id,
          name: pet.name,
          level: pet.level,
          talentLevel: pet.talent_level,
          form: pet.form
        },
        combineablePets: sameTemplatePets.map(p => ({
          petId: p.pet_id,
          name: p.name,
          level: p.level,
          talentLevel: p.talent_level,
          form: p.form
        })),
        requirements: {
          minLevel: 10,
          sameTemplate: true,
          note: '需要两只相同品种且等级≥10的灵兽进行合成'
        }
      }
    });
  } catch (error) {
    console.error('[Pet] 获取合成信息失败:', error);
    res.json({ success: false, data: { message: '获取合成信息失败' } });
  }
});

// ========== GET /api/pet/evolution-configs - 获取进化配置 ==========
router.get('/evolution-configs', (req, res) => {
  res.json({
    success: true,
    data: { configs: EVOLUTION_CONFIGS }
  });
});

// ========== GET /api/pet/talent-configs - 获取资质配置 ==========
router.get('/talent-configs', (req, res) => {
  res.json({
    success: true,
    data: { configs: Object.values(TALENT_CONFIGS) }
  });
});

module.exports = router;
