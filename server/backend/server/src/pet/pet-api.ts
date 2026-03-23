/**
 * 灵兽进化系统 - API路由
 */

import express, { Request, Response } from 'express';
import { petSystem } from './pet-system';
import * as PetModels from './pet-models';

const router = express.Router();

// ========== 中间件：模拟用户认证 ==========
// 实际项目中应该从session/token获取用户ID
const mockAuth = (req: Request, res: Response, next: Function) => {
  // 模拟用户ID，实际从session获取
  const playerId = parseInt(req.headers['x-player-id'] as string) || 1;
  (req as any).playerId = playerId;
  next();
};

// ========== GET /api/pet/list - 获取灵兽列表 ==========
router.get('/list', mockAuth, (req: Request, res: Response) => {
  try {
    const playerId = (req as any).playerId;
    const pets = petSystem.getPetList(playerId);
    
    res.json({
      success: true,
      data: {
        pets: pets.map(pet => ({
          petId: pet.petId,
          templateId: pet.templateId,
          name: pet.name,
          nameCn: pet.nameCn,
          level: pet.level,
          exp: pet.exp,
          form: pet.form,
          talentLevel: pet.talentLevel,
          maxLevel: pet.maxLevel,
          health: pet.health,
          attack: pet.attack,
          defense: pet.defense,
          speed: pet.speed,
          skills: pet.skills,
          innateSkills: pet.innateSkills,
          appearance: pet.appearance
        }))
      }
    });
  } catch (error) {
    console.error('[Pet] 获取灵兽列表失败:', error);
    res.json({
      success: false,
      data: { message: '获取灵兽列表失败' }
    });
  }
});

// ========== GET /api/pet/templates - 获取灵兽模板列表 ==========
router.get('/templates', (req: Request, res: Response) => {
  try {
    const templates = petSystem.getPetTemplates();
    
    res.json({
      success: true,
      data: {
        templates
      }
    });
  } catch (error) {
    console.error('[Pet] 获取灵兽模板列表失败:', error);
    res.json({
      success: false,
      data: { message: '获取灵兽模板列表失败' }
    });
  }
});

// ========== GET /api/pet/evolution-configs - 获取进化配置 ==========
router.get('/evolution-configs', (req: Request, res: Response) => {
  try {
    const configs = petSystem.getEvolutionConfigs();
    
    res.json({
      success: true,
      data: {
        configs
      }
    });
  } catch (error) {
    console.error('[Pet] 获取进化配置失败:', error);
    res.json({
      success: false,
      data: { message: '获取进化配置失败' }
    });
  }
});

// ========== GET /api/pet/talent-configs - 获取资质配置 ==========
router.get('/talent-configs', (req: Request, res: Response) => {
  try {
    const configs = petSystem.getTalentConfigs();
    
    res.json({
      success: true,
      data: {
        configs
      }
    });
  } catch (error) {
    console.error('[Pet] 获取资质配置失败:', error);
    res.json({
      success: false,
      data: { message: '获取资质配置失败' }
    });
  }
});

// ========== GET /api/pet/skills - 获取所有技能 ==========
router.get('/skills', (req: Request, res: Response) => {
  try {
    const skills = petSystem.getAllSkills();
    
    res.json({
      success: true,
      data: {
        skills
      }
    });
  } catch (error) {
    console.error('[Pet] 获取技能列表失败:', error);
    res.json({
      success: false,
      data: { message: '获取技能列表失败' }
    });
  }
});

// ========== GET /api/pet/detail/:petId - 获取单个灵兽详情 ==========
router.get('/detail/:petId', mockAuth, (req: Request, res: Response) => {
  try {
    const playerId = (req as any).playerId;
    const { petId } = req.params;
    
    const pet = petSystem.getPet(petId);
    
    if (!pet) {
      res.json({
        success: false,
        data: { message: '灵兽不存在' }
      });
      return;
    }
    
    if (pet.playerId !== playerId) {
      res.json({
        success: false,
        data: { message: '这不是你的灵兽' }
      });
      return;
    }
    
    res.json({
      success: true,
      data: { pet }
    });
  } catch (error) {
    console.error('[Pet] 获取灵兽详情失败:', error);
    res.json({
      success: false,
      data: { message: '获取灵兽详情失败' }
    });
  }
});

// ========== POST /api/pet/create - 创建灵兽 ==========
router.post('/create', mockAuth, (req: Request, res: Response) => {
  try {
    const playerId = (req as any).playerId;
    const { templateId, name } = req.body;
    
    if (!templateId || !name) {
      res.json({
        success: false,
        data: { message: '缺少必要参数' }
      });
      return;
    }
    
    const result = petSystem.createPet(playerId, templateId, name);
    
    res.json({
      success: result.success,
      data: result.success ? { pet: result.pet } : { message: result.message }
    });
  } catch (error) {
    console.error('[Pet] 创建灵兽失败:', error);
    res.json({
      success: false,
      data: { message: '创建灵兽失败' }
    });
  }
});

// ========== POST /api/pet/evolve - 进化灵兽 ==========
router.post('/evolve', mockAuth, (req: Request, res: Response) => {
  try {
    const playerId = (req as any).playerId;
    const { petId, itemId } = req.body;
    
    if (!petId) {
      res.json({
        success: false,
        data: { message: '缺少灵兽ID' }
      });
      return;
    }
    
    const result = petSystem.evolvePet(playerId, petId, itemId);
    
    res.json({
      success: result.success,
      data: result.success 
        ? { pet: result.pet, message: result.message }
        : { message: result.message }
    });
  } catch (error) {
    console.error('[Pet] 进化灵兽失败:', error);
    res.json({
      success: false,
      data: { message: '进化灵兽失败' }
    });
  }
});

// ========== POST /api/pet/improve-talent - 提升资质 ==========
router.post('/improve-talent', mockAuth, (req: Request, res: Response) => {
  try {
    const playerId = (req as any).playerId;
    const { petId, itemId } = req.body;
    
    if (!petId) {
      res.json({
        success: false,
        data: { message: '缺少灵兽ID' }
      });
      return;
    }
    
    const result = petSystem.improveTalent(playerId, petId, itemId);
    
    res.json({
      success: result.success,
      data: result.success
        ? { pet: result.pet, improved: result.improved, message: result.message }
        : { message: result.message }
    });
  } catch (error) {
    console.error('[Pet] 提升资质失败:', error);
    res.json({
      success: false,
      data: { message: '提升资质失败' }
    });
  }
});

// ========== POST /api/pet/learn-skill - 学习技能 ==========
router.post('/learn-skill', mockAuth, (req: Request, res: Response) => {
  try {
    const playerId = (req as any).playerId;
    const { petId, skillId } = req.body;
    
    if (!petId || !skillId) {
      res.json({
        success: false,
        data: { message: '缺少必要参数' }
      });
      return;
    }
    
    const result = petSystem.learnSkill(playerId, petId, skillId);
    
    res.json({
      success: result.success,
      data: result.success
        ? { pet: result.pet, message: result.message }
        : { message: result.message }
    });
  } catch (error) {
    console.error('[Pet] 学习技能失败:', error);
    res.json({
      success: false,
      data: { message: '学习技能失败' }
    });
  }
});

// ========== GET /api/pet/learnable-skills/:petId - 获取灵兽可学习的技能 ==========
router.get('/learnable-skills/:petId', mockAuth, (req: Request, res: Response) => {
  try {
    const { petId } = req.params;
    
    const skills = petSystem.getLearnableSkills(petId);
    
    res.json({
      success: true,
      data: {
        skills
      }
    });
  } catch (error) {
    console.error('[Pet] 获取可学习技能失败:', error);
    res.json({
      success: false,
      data: { message: '获取可学习技能失败' }
    });
  }
});

// ========== 调试：添加物品到背包 ==========
router.post('/debug/add-item', (req: Request, res: Response) => {
  try {
    const playerId = parseInt(req.body.playerId as string) || 1;
    const { itemId, amount } = req.body;
    
    if (!itemId || !amount) {
      res.json({
        success: false,
        data: { message: '缺少必要参数' }
      });
      return;
    }
    
    petSystem.addItem(playerId, itemId, amount);
    
    res.json({
      success: true,
      data: {
        message: `添加物品成功`,
        itemId,
        amount,
        currentAmount: petSystem.getItemCount(playerId, itemId)
      }
    });
  } catch (error) {
    console.error('[Pet] 添加物品失败:', error);
    res.json({
      success: false,
      data: { message: '添加物品失败' }
    });
  }
});

// ========== 调试：获取背包物品 ==========
router.get('/debug/backpack/:playerId', (req: Request, res: Response) => {
  try {
    const playerId = parseInt(req.params.playerId as string) || 1;
    
    // 这里简单返回，实际应该从背包系统获取
    res.json({
      success: true,
      data: {
        playerId,
        message: '背包数据获取功能开发中'
      }
    });
  } catch (error) {
    console.error('[Pet] 获取背包失败:', error);
    res.json({
      success: false,
      data: { message: '获取背包失败' }
    });
  }
});

// ========== POST /api/pet/upgrade - 灵兽升级（使用经验） ==========
router.post('/upgrade', mockAuth, (req: Request, res: Response) => {
  try {
    const playerId = (req as any).playerId;
    const { petId, expAmount } = req.body;
    
    if (!petId || !expAmount) {
      res.json({
        success: false,
        data: { message: '缺少必要参数' }
      });
      return;
    }
    
    const result = petSystem.upgradePet(playerId, petId, expAmount);
    
    res.json({
      success: result.success,
      data: result.success 
        ? { pet: result.pet, message: result.message }
        : { message: result.message }
    });
  } catch (error) {
    console.error('[Pet] 灵兽升级失败:', error);
    res.json({
      success: false,
      data: { message: '灵兽升级失败' }
    });
  }
});

// ========== POST /api/pet/upgrade-with-item - 灵兽升级（使用道具） ==========
router.post('/upgrade-with-item', mockAuth, (req: Request, res: Response) => {
  try {
    const playerId = (req as any).playerId;
    const { petId, itemId } = req.body;
    
    if (!petId || !itemId) {
      res.json({
        success: false,
        data: { message: '缺少必要参数' }
      });
      return;
    }
    
    const result = petSystem.upgradePetWithItem(playerId, petId, itemId);
    
    res.json({
      success: result.success,
      data: result.success 
        ? { pet: result.pet, message: result.message }
        : { message: result.message }
    });
  } catch (error) {
    console.error('[Pet] 灵兽升级失败:', error);
    res.json({
      success: false,
      data: { message: '灵兽升级失败' }
    });
  }
});

// ========== GET /api/pet/exp-info/:petId - 获取升级所需经验 ==========
router.get('/exp-info/:petId', mockAuth, (req: Request, res: Response) => {
  try {
    const playerId = (req as any).playerId;
    const { petId } = req.params;
    
    const result = petSystem.getExpRequired(playerId, petId);
    
    res.json({
      success: result.success,
      data: result.success 
        ? result.data 
        : { message: result.message }
    });
  } catch (error) {
    console.error('[Pet] 获取经验信息失败:', error);
    res.json({
      success: false,
      data: { message: '获取经验信息失败' }
    });
  }
});

// ========== POST /api/pet/combine - 灵兽合成 ==========
router.post('/combine', mockAuth, (req: Request, res: Response) => {
  try {
    const playerId = (req as any).playerId;
    const { petId1, petId2 } = req.body;
    
    if (!petId1 || !petId2) {
      res.json({
        success: false,
        data: { message: '缺少必要参数' }
      });
      return;
    }
    
    const result = petSystem.combinePets(playerId, petId1, petId2);
    
    res.json({
      success: result.success,
      data: result.success 
        ? { pet: result.pet, message: result.message }
        : { message: result.message }
    });
  } catch (error) {
    console.error('[Pet] 灵兽合成失败:', error);
    res.json({
      success: false,
      data: { message: '灵兽合成失败' }
    });
  }
});

// ========== GET /api/pet/combine-info/:petId - 获取合成信息 ==========
router.get('/combine-info/:petId', mockAuth, (req: Request, res: Response) => {
  try {
    const playerId = (req as any).playerId;
    const { petId } = req.params;
    
    const result = petSystem.getCombineInfo(playerId, petId);
    
    res.json({
      success: result.success,
      data: result.success 
        ? result.data 
        : { message: result.message }
    });
  } catch (error) {
    console.error('[Pet] 获取合成信息失败:', error);
    res.json({
      success: false,
      data: { message: '获取合成信息失败' }
    });
  }
});

// ========== GET /api/pet/types - 获取宠物类型列表 ==========
router.get('/types', (req: Request, res: Response) => {
  try {
    const petTypes = [
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
    
    res.json({
      success: true,
      data: {
        types: petTypes
      }
    });
  } catch (error) {
    console.error('[Pet] 获取宠物类型失败:', error);
    res.json({
      success: false,
      data: { message: '获取宠物类型失败' }
    });
  }
});

export default router;
