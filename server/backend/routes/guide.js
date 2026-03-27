/**
 * 引导系统路由
 * 负责新手引导的配置、进度管理、奖励领取等
 */

const express = require('express');
const router = express.Router();

// 引导步骤配置
const GUIDE_STEPS = [
  {
    step: 1,
    id: 'create_character',
    title: '创建角色',
    description: '创建你的修仙角色',
    type: 'auto',
    target: 'character_creation',
    reward: { spirit_stone: 100, exp: 50 }
  },
  {
    step: 2,
    id: 'first_explore',
    title: '初探仙门',
    description: '熟悉游戏界面',
    type: 'explore',
    target: 'main_interface',
    reward: { spirit_stone: 50, exp: 30 }
  },
  {
    step: 3,
    id: 'first_battle',
    title: '初战告捷',
    description: '完成第一次战斗',
    type: 'battle',
    target: 'chapter_1',
    reward: { spirit_stone: 80, exp: 100, item: '疗伤丹×2' }
  },
  {
    step: 4,
    id: 'first_cultivate',
    title: '初次修炼',
    description: '进行第一次功法修炼',
    type: 'cultivate',
    target: 'cultivation_panel',
    reward: { spirit_stone: 60, exp: 80 }
  },
  {
    step: 5,
    id: 'equip_item',
    title: '装备强化',
    description: '强化你的第一件装备',
    type: 'enhance',
    target: 'enhancement_panel',
    reward: { spirit_stone: 100, exp: 120, item: '强化石×5' }
  },
  {
    step: 6,
    id: 'complete_quest',
    title: '完成任务',
    description: '完成第一个任务',
    type: 'quest',
    target: 'quest_panel',
    reward: { spirit_stone: 150, exp: 200 }
  },
  {
    step: 7,
    id: 'visit_shop',
    title: '逛逛商店',
    description: '访问商店了解资源',
    type: 'visit',
    target: 'shop_panel',
    reward: { spirit_stone: 200, exp: 50 }
  },
  {
    step: 8,
    id: 'join_sect',
    title: '加入宗门',
    description: '加入或创建宗门',
    type: 'join',
    target: 'sect_panel',
    reward: { spirit_stone: 300, exp: 300, item: '宗门令牌×1' }
  },
  {
    step: 9,
    id: 'try_dungeon',
    title: '挑战副本',
    description: '尝试挑战副本',
    type: 'dungeon',
    target: 'dungeon_panel',
    reward: { spirit_stone: 500, exp: 500, item: '金丹×1' }
  },
  {
    step: 10,
    id: 'guide_complete',
    title: '引导完成',
    description: '恭喜完成新手引导',
    type: 'complete',
    target: 'rewards',
    reward: { spirit_stone: 1000, exp: 1000, item: '橙色装备×1' }
  }
];

// 玩家引导进度存储 (内存 + 文件持久化)
const fs = require('fs');
const path = require('path');

const PROGRESS_FILE = path.join(__dirname, '../data/guide_progress.json');

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[guide] 加载引导进度失败:', e.message);
  }
  return {};
}

function saveProgress(data) {
  try {
    const dir = path.dirname(PROGRESS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[guide] 保存引导进度失败:', e.message);
  }
}

// 获取引导配置
router.get('/config', (req, res) => {
  try {
    const config = {
      enabled: true,
      steps: GUIDE_STEPS.map(s => ({
        step: s.step,
        id: s.id,
        title: s.title,
        description: s.description,
        type: s.type,
        target: s.target,
        reward: s.reward
      })),
      totalSteps: GUIDE_STEPS.length
    };
    res.json({ code: 0, data: config });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

// 获取玩家引导进度
router.get('/progress/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const allProgress = loadProgress();
    const userProgress = allProgress[userId] || {
      currentStep: 0,
      completedSteps: [],
      claimedRewards: [],
      startTime: null,
      completedTime: null
    };
    res.json({ code: 0, data: userProgress });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

// 推进引导进度
router.post('/advance', (req, res) => {
  try {
    const { userId, stepId } = req.body;
    if (!userId || !stepId) {
      return res.status(400).json({ code: 1, message: '参数不足' });
    }
    
    const step = GUIDE_STEPS.find(s => s.id === stepId);
    if (!step) {
      return res.status(400).json({ code: 1, message: '无效的步骤ID' });
    }
    
    const allProgress = loadProgress();
    if (!allProgress[userId]) {
      allProgress[userId] = {
        currentStep: 0,
        completedSteps: [],
        claimedRewards: [],
        startTime: new Date().toISOString()
      };
    }
    
    const userProgress = allProgress[userId];
    
    // 如果该步骤还未完成，才添加
    if (!userProgress.completedSteps.includes(stepId)) {
      userProgress.completedSteps.push(stepId);
      userProgress.currentStep = Math.max(userProgress.currentStep, step.step);
    }
    
    // 检查是否全部完成
    if (userProgress.completedSteps.length >= GUIDE_STEPS.length) {
      userProgress.completedTime = new Date().toISOString();
    }
    
    allProgress[userId] = userProgress;
    saveProgress(allProgress);
    
    res.json({
      code: 0,
      data: {
        currentStep: userProgress.currentStep,
        completedSteps: userProgress.completedSteps.length,
        totalSteps: GUIDE_STEPS.length,
        isComplete: !!userProgress.completedTime
      }
    });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

// 领取引导奖励
router.post('/claim', (req, res) => {
  try {
    const { userId, stepId } = req.body;
    if (!userId || !stepId) {
      return res.status(400).json({ code: 1, message: '参数不足' });
    }
    
    const step = GUIDE_STEPS.find(s => s.id === stepId);
    if (!step) {
      return res.status(400).json({ code: 1, message: '无效的步骤ID' });
    }
    
    const allProgress = loadProgress();
    const userProgress = allProgress[userId];
    
    if (!userProgress) {
      return res.status(400).json({ code: 1, message: '玩家引导未开始' });
    }
    
    // 检查步骤是否完成
    if (!userProgress.completedSteps.includes(stepId)) {
      return res.status(400).json({ code: 1, message: '该步骤尚未完成' });
    }
    
    // 检查奖励是否已领取
    if (userProgress.claimedRewards.includes(stepId)) {
      return res.status(400).json({ code: 1, message: '奖励已领取' });
    }
    
    userProgress.claimedRewards.push(stepId);
    allProgress[userId] = userProgress;
    saveProgress(allProgress);
    
    res.json({
      code: 0,
      data: {
        stepId,
        reward: step.reward,
        claimed: true
      }
    });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

// 重置玩家引导进度
router.post('/reset', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ code: 1, message: '参数不足' });
    }
    
    const allProgress = loadProgress();
    allProgress[userId] = {
      currentStep: 0,
      completedSteps: [],
      claimedRewards: [],
      startTime: new Date().toISOString(),
      completedTime: null
    };
    saveProgress(allProgress);
    
    res.json({ code: 0, message: '引导进度已重置' });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

// 获取当前引导状态（兼容：优先从 req.userId 获取，fallback 到 path 参数）
router.get('/current/:userId?', (req, res) => {
  try {
    const userId = req.userId || parseInt(req.params.userId) || 1;
    const allProgress = loadProgress();
    const userProgress = allProgress[userId];
    
    if (!userProgress) {
      return res.json({
        code: 0,
        data: {
          inProgress: false,
          currentStep: null,
          nextStep: GUIDE_STEPS[0]
        }
      });
    }
    
    const currentStepNum = userProgress.currentStep;
    const nextStep = GUIDE_STEPS.find(s => s.step === currentStepNum + 1);
    
    res.json({
      code: 0,
      data: {
        inProgress: !userProgress.completedTime,
        currentStep: currentStepNum,
        completedSteps: userProgress.completedSteps.length,
        totalSteps: GUIDE_STEPS.length,
        nextStep: nextStep || null,
        isComplete: !!userProgress.completedTime
      }
    });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

module.exports = router;
