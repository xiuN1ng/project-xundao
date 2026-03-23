/**
 * 新手引导系统 API
 */

const express = require('express');
const router = express.Router();

// 中间件：自动加载依赖
router.use((req, res, next) => {
  loadDependencies();
  next();
});

let tutorialStorage;

function loadDependencies() {
  if (!tutorialStorage) {
    try {
      const storage = require('./tutorial_storage');
      tutorialStorage = storage.tutorialStorage;
    } catch (e) {
      console.error('加载tutorial_storage失败:', e.message);
    }
  }
  return tutorialStorage;
}

// 获取玩家新手引导状态
router.get('/status', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const tutorial = tutorialStorage.getPlayerTutorial(player_id);
    res.json({ success: true, data: tutorial });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 完成新手引导步骤
router.post('/complete', (req, res) => {
  try {
    const { player_id, step_type } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    if (!step_type) {
      return res.status(400).json({ success: false, error: '缺少步骤类型' });
    }
    
    const result = tutorialStorage.completeStep(player_id, step_type);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 跳过当前步骤
router.post('/skip', (req, res) => {
  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const result = tutorialStorage.skipStep(player_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 重置新手引导
router.post('/reset', (req, res) => {
  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const result = tutorialStorage.resetTutorial(player_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取新手引导配置
router.get('/config', (req, res) => {
  try {
    const config = tutorialStorage.getTutorialConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 引导步骤类型检查（前端轮询使用）
router.get('/check-step', (req, res) => {
  try {
    const { player_id, step_type } = req.query;
    
    if (!player_id || !step_type) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const tutorial = tutorialStorage.getPlayerTutorial(player_id);
    const currentStep = tutorial.current_step_data;
    
    if (!currentStep) {
      return res.json({ 
        success: true, 
        data: { 
          can_complete: true,
          is_completed: true 
        } 
      });
    }
    
    const canComplete = currentStep.type === step_type && 
      !tutorial.completed_steps.includes(currentStep.id);
    
    res.json({
      success: true,
      data: {
        can_complete: canComplete,
        current_step: currentStep,
        is_completed: tutorial.completed_steps.includes(currentStep.id)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
