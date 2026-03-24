/**
 * 游戏系统 API 路由
 * 技能升级、技能突破、装备强化、装备精炼、师徒任务
 */

import express, { Request, Response } from 'express';
import { SkillSystem, SKILL_TEMPLATES, Skill } from './skill/skill-system';
import { EquipmentSystem, EQUIPMENT_TEMPLATES, Equipment, EQUIPMENT_STRENGTHEN_CONFIG } from './equipment/equipment-system';
import { MasterDiscipleSystem, MASTER_TASKS } from './social/master-disciple-system';
import { MasterContributionShop, CONTRIBUTION_SHOP_ITEMS } from './social/master-contribution-shop';
import { WingSystem, WING_TEMPLATES } from './wing/wing-system';

const router = express.Router();

// 初始化系统实例
const skillSystem = new SkillSystem();
const equipmentSystem = new EquipmentSystem();
const masterDiscipleSystem = new MasterDiscipleSystem();
const masterContributionShop = new MasterContributionShop(masterDiscipleSystem);
const wingSystem = new WingSystem();

// ==================== 技能系统 API ====================

// GET /api/skill/templates - 获取技能模板列表
router.get('/skill/templates', (req: Request, res: Response) => {
  try {
    const templates = SKILL_TEMPLATES.map(t => ({
      templateId: t.templateId,
      name: t.name,
      nameCN: t.nameCN,
      type: t.type,
      category: t.category,
      description: t.description,
      icon: t.icon,
      require: t.require,
      maxLevel: t.maxLevel,
      maxBreakthrough: t.maxBreakthrough,
      cooldown: t.cooldown,
      upgradeCosts: t.upgradeCosts,
      breakthroughCosts: t.breakthroughCosts,
    }));
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/skill/list - 获取玩家技能列表
router.get('/skill/list', (req: Request, res: Response) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    const skills = skillSystem.getPlayerSkills(player_id as string);
    const playerData = skillSystem.getPlayerData(player_id as string);
    
    res.json({
      success: true,
      data: {
        playerId: player_id,
        skillPoints: playerData.skillPoints,
        totalSkillPoints: playerData.totalSkillPoints,
        skills: skills
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/skill/learn - 学习技能
router.post('/skill/learn', (req: Request, res: Response) => {
  try {
    const { player_id, template_id } = req.body;
    
    if (!player_id || !template_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = skillSystem.learnSkill(player_id, template_id);
    
    res.json({
      success: result.success,
      message: result.message,
      data: result.skill
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/skill/upgrade - 技能升级
router.post('/skill/upgrade', (req: Request, res: Response) => {
  try {
    const { player_id, skill_id } = req.body;
    
    if (!player_id || !skill_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 player_id 和 skill_id' });
    }
    
    const result = skillSystem.upgradeSkill(player_id, skill_id);
    
    // 获取升级后的技能信息
    const playerData = skillSystem.getPlayerData(player_id);
    const upgradedSkill = playerData.skills.get(skill_id);
    
    res.json({
      success: result.success,
      message: result.message,
      data: {
        skill: upgradedSkill,
        newLevel: result.newLevel,
        newExp: result.newExp,
        newEffects: result.newEffects,
        consumeGold: result.consumeGold,
        consumeExp: result.consumeExp,
        consumeItems: result.consumeItems,
        currentGold: skillSystem.getPlayerGold(player_id)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/skill-breakthrough - 技能突破
router.post('/skill-breakthrough', (req: Request, res: Response) => {
  try {
    const { player_id, skill_id } = req.body;
    
    if (!player_id || !skill_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 player_id 和 skill_id' });
    }
    
    const result = skillSystem.breakthroughSkill(player_id, skill_id);
    
    // 获取突破后的技能信息
    const playerData = skillSystem.getPlayerData(player_id);
    const breakthroughSkill = playerData.skills.get(skill_id);
    
    res.json({
      success: result.success,
      message: result.message,
      data: {
        skill: breakthroughSkill,
        newBreakthroughLevel: result.newBreakthroughLevel,
        newEffects: result.newEffects,
        consumeGold: result.consumeGold,
        consumeItems: result.consumeItems,
        currentGold: skillSystem.getPlayerGold(player_id)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/skill/stats - 获取玩家技能总属性
router.get('/skill/stats', (req: Request, res: Response) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    const stats = skillSystem.getSkillTotalAttributes(player_id as string);
    
    res.json({
      success: true,
      data: {
        playerId: player_id,
        attributes: stats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 装备系统 API ====================

// GET /api/equipment/templates - 获取装备模板列表
router.get('/equipment/templates', (req: Request, res: Response) => {
  try {
    const templates = EQUIPMENT_TEMPLATES.map(t => ({
      templateId: t.templateId,
      name: t.name,
      nameCN: t.nameCN,
      type: t.type,
      quality: t.quality,
      level: t.level,
      position: t.position,
      baseAttributes: t.baseAttributes,
    }));
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/equipment/list - 获取玩家装备列表
router.get('/equipment/list', (req: Request, res: Response) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    const equipments = equipmentSystem.getPlayerEquipments(player_id as string);
    
    res.json({
      success: true,
      data: {
        playerId: player_id,
        equipments: equipments
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/equipment/create - 创建装备（测试用）
router.post('/equipment/create', (req: Request, res: Response) => {
  try {
    const { player_id, template_id } = req.body;
    
    if (!player_id || !template_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const equipment = equipmentSystem.createEquipment(player_id, template_id);
    
    if (!equipment) {
      return res.status(400).json({ success: false, error: '装备模板不存在' });
    }
    
    res.json({
      success: true,
      message: '装备创建成功',
      data: equipment
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/equipment/enhance - 获取装备强化信息
router.get('/equipment/enhance', (req: Request, res: Response) => {
  try {
    const { player_id, equipment_id } = req.query;
    
    if (!player_id || !equipment_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 player_id 和 equipment_id' });
    }
    
    const playerData = equipmentSystem.getPlayerData(player_id as string);
    const equipment = playerData.equipments.get(equipment_id as string);
    
    if (!equipment) {
      return res.status(404).json({ success: false, error: '装备不存在' });
    }
    
    const currentLevel = equipment.strengthenLevel;
    const maxLevel = 15;
    
    // 获取当前等级的强化配置
    const costConfig = EQUIPMENT_STRENGTHEN_CONFIG.costs[currentLevel];
    
    // 获取强化属性加成
    const typeAttrs = EQUIPMENT_STRENGTHEN_CONFIG.attrsPerLevel[equipment.type] || {};
    const nextLevelAttrs: Record<string, number> = {};
    for (const [attr, value] of Object.entries(typeAttrs)) {
      nextLevelAttrs[attr] = value * (currentLevel + 1);
    }
    
    res.json({
      success: true,
      data: {
        equipment: {
          equipmentId: equipment.equipmentId,
          name: equipment.name,
          nameCN: equipment.nameCN,
          type: equipment.type,
          strengthenLevel: equipment.strengthenLevel,
          strengthenAttrs: equipment.strengthenAttrs,
        },
        enhanceConfig: {
          currentLevel,
          maxLevel,
          nextLevel: currentLevel < maxLevel ? currentLevel + 1 : null,
          successRate: costConfig ? costConfig.successRate : null,
          goldCost: costConfig ? costConfig.gold : 0,
          stoneCost: costConfig ? costConfig.stone : 0,
          nextLevelAttrs: currentLevel < maxLevel ? nextLevelAttrs : null,
        },
        playerData: {
          gold: playerData.gold,
          strengthenStone: playerData.strengthenStone,
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/equipment/enhance - 装备强化
router.post('/equipment/enhance', (req: Request, res: Response) => {
  try {
    const { player_id, equipment_id, use_protect } = req.body;
    
    if (!player_id || !equipment_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 player_id 和 equipment_id' });
    }
    
    const result = equipmentSystem.strengthenEquipment(player_id, equipment_id, use_protect || false);
    
    // 获取强化后的装备信息
    const playerData = equipmentSystem.getPlayerData(player_id);
    const enhancedEquipment = playerData.equipments.get(equipment_id);
    
    res.json({
      success: result.success,
      message: result.message,
      data: {
        equipment: enhancedEquipment,
        newLevel: result.newLevel,
        newAttrs: result.newAttrs,
        consumeGold: result.consumeGold,
        consumeStone: result.consumeStone,
        playerData: {
          gold: playerData.gold,
          strengthenStone: playerData.strengthenStone
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/equipment/refine - 装备精炼
router.post('/equipment/refine', (req: Request, res: Response) => {
  try {
    const { player_id, equipment_id } = req.body;
    
    if (!player_id || !equipment_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 player_id 和 equipment_id' });
    }
    
    const result = equipmentSystem.refineEquipment(player_id, equipment_id);
    
    // 获取精炼后的装备信息
    const playerData = equipmentSystem.getPlayerData(player_id);
    const refinedEquipment = playerData.equipments.get(equipment_id);
    
    res.json({
      success: result.success,
      message: result.message,
      data: {
        equipment: refinedEquipment,
        newLevel: result.newLevel,
        newAttrs: result.newAttrs,
        consumeGold: result.consumeGold,
        consumeRefineStone: result.consumeRefineStone,
        playerData: {
          gold: playerData.gold,
          refineStone: playerData.refineStone
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/equipment/stats - 获取玩家装备总属性
router.get('/equipment/stats', (req: Request, res: Response) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    const stats = equipmentSystem.getEquipmentTotalAttributes(player_id as string);
    
    res.json({
      success: true,
      data: {
        playerId: player_id,
        attributes: stats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 师徒系统 API ====================

// GET /api/master-disciple/config - 获取师徒系统配置
router.get('/master-disciple/config', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        tasks: MASTER_TASKS,
        config: {
          maxDisciples: 3,
          minMasterLevel: 30,
          minDiscipleLevel: 10,
          contractDays: 30
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/master-disciple/apply - 申请拜师
router.post('/master-disciple/apply', (req: Request, res: Response) => {
  try {
    const { disciple_id, master_id, message } = req.body;
    
    if (!disciple_id || !master_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = masterDiscipleSystem.applyForMaster(disciple_id, master_id, message);
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/master-disciple/accept - 接受拜师申请
router.post('/master-disciple/accept', (req: Request, res: Response) => {
  try {
    const { master_id, disciple_id } = req.body;
    
    if (!master_id || !disciple_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = masterDiscipleSystem.acceptApplication(master_id, disciple_id);
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/master-disciple/applications - 获取拜师申请列表
router.get('/master-disciple/applications', (req: Request, res: Response) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    const applications = masterDiscipleSystem.getApplications(player_id as string);
    
    res.json({
      success: true,
      data: {
        applications: applications
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/master-disciple/relations - 获取师徒关系
router.get('/master-disciple/relations', (req: Request, res: Response) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    const master = masterDiscipleSystem.getDiscipleMaster(player_id as string);
    const disciples = masterDiscipleSystem.getMasterDisciples(player_id as string);
    
    res.json({
      success: true,
      data: {
        asDisciple: master,
        asMaster: disciples
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/master-disciple/task - 获取师徒任务列表
router.get('/master-disciple/task', (req: Request, res: Response) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    const tasks = masterDiscipleSystem.getDailyTasks(player_id as string);
    
    res.json({
      success: true,
      data: {
        playerId: player_id,
        tasks: tasks
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/master-disciple/task/complete - 完成任务
router.post('/master-disciple/task/complete', (req: Request, res: Response) => {
  try {
    const { player_id, task_id } = req.body;
    
    if (!player_id || !task_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = masterDiscipleSystem.completeTask(player_id, task_id);
    
    res.json({
      success: result.success,
      message: result.message,
      data: result.rewards
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/master-disciple/transmit - 传功
router.post('/master-disciple/transmit', (req: Request, res: Response) => {
  try {
    const { relation_id, master_id, exp_amount } = req.body;
    
    if (!relation_id || !master_id || !exp_amount) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = masterDiscipleSystem.transmitPower(relation_id, master_id, exp_amount);
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/master-disciple/break - 解除师徒关系
router.post('/master-disciple/break', (req: Request, res: Response) => {
  try {
    const { relation_id, reason } = req.body;
    
    if (!relation_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = masterDiscipleSystem.breakRelation(relation_id, reason);
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 翅膀系统 API ====================

// GET /api/wing/templates - 获取翅膀模板列表
router.get('/wing/templates', (req: Request, res: Response) => {
  try {
    const templates = WING_TEMPLATES.map(t => ({
      templateId: t.templateId,
      name: t.name,
      nameCN: t.nameCN,
      icon: t.icon,
      description: t.description,
      attributes: t.attributes,
      rarity: t.rarity,
      unlockLevel: t.unlockLevel
    }));
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/wing/list - 获取玩家翅膀列表
router.get('/wing/list', (req: Request, res: Response) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    const wings = wingSystem.getPlayerWings(player_id as string);
    const equippedWing = wingSystem.getEquippedWing(player_id as string);
    const attributes = wingSystem.getWingAttributes(player_id as string);
    
    res.json({
      success: true,
      data: {
        playerId: player_id,
        wings: wings,
        equippedWing: equippedWing,
        totalAttributes: attributes
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/wing/equip - 装备翅膀
router.post('/wing/equip', (req: Request, res: Response) => {
  try {
    const { player_id, wing_id } = req.body;
    
    if (!player_id || !wing_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = wingSystem.equipWing(player_id, wing_id);
    
    if (result.success) {
      const attributes = wingSystem.getWingAttributes(player_id);
      res.json({
        success: true,
        message: result.message,
        data: {
          wing: result.wing,
          totalAttributes: attributes
        }
      });
    } else {
      res.json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/wing/unequip - 卸下翅膀
router.post('/wing/unequip', (req: Request, res: Response) => {
  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    const result = wingSystem.unequipWing(player_id);
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/wing/give - 给予玩家翅膀（GM指令）
router.post('/wing/give', (req: Request, res: Response) => {
  try {
    const { player_id, template_id } = req.body;
    
    if (!player_id || !template_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const wing = wingSystem.giveWing(player_id, template_id);
    
    if (wing) {
      res.json({
        success: true,
        message: '获得翅膀成功',
        data: wing
      });
    } else {
      res.json({
        success: false,
        message: '翅膀已拥有或模板不存在'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
