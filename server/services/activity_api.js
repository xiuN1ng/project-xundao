/**
 * 活动系统 API
 */

const express = require('express');
const router = express.Router();

// 中间件：自动加载依赖
router.use((req, res, next) => {
  loadDependencies();
  next();
});

let activityStorage, ACTIVITY_DATA;

function loadDependencies() {
  if (!activityStorage) {
    try {
      const storage = require('./activity_storage');
      activityStorage = storage.activityStorage;
      ACTIVITY_DATA = storage.ACTIVITY_DATA;
    } catch (e) {
      console.error('加载activity_storage失败:', e.message);
    }
  }
  
  return activityStorage;
}

// 获取活动类型列表
router.get('/types', (req, res) => {
  try {
    const types = Object.entries(ACTIVITY_DATA).map(([id, data]) => ({
      id,
      name: data.name,
      type: data.type,
      description: data.description,
      icon: data.icon,
      bonus: data.bonus
    }));
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取所有活动列表
router.get('/list', (req, res) => {
  try {
    const list = activityStorage.getActivityList();
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取当前活动
router.get('/active', async (req, res) => {
  try {
    const { player_id } = req.query;
    const active = await activityStorage.getActiveActivities(player_id);
    res.json({ success: true, data: active });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 开启限时活动
router.post('/start', async (req, res) => {
  try {
    const { activity_id } = req.body;
    
    if (!activity_id) {
      return res.status(400).json({ success: false, error: '缺少活动ID' });
    }
    
    const data = ACTIVITY_DATA[activity_id];
    if (!data || data.type !== 'limited') {
      return res.status(400).json({ success: false, error: '活动不存在或不是限时活动' });
    }
    
    const result = await activityStorage.startActivity(activity_id);
    
    res.json({
      success: true,
      message: `🎉 活动「${data.name}」已开启！`,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 结束限时活动
router.post('/end', async (req, res) => {
  try {
    const { activity_id } = req.body;
    
    if (!activity_id) {
      return res.status(400).json({ success: false, error: '缺少活动ID' });
    }
    
    const result = await activityStorage.endActivity(activity_id);
    
    res.json({
      success: true,
      message: `📢 活动已结束`,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 每日签到
router.post('/sign', async (req, res) => {
  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const result = await activityStorage.dailySign(player_id);
    
    if (result.alreadySigned) {
      return res.status(400).json({ success: false, error: '今日已签到', data: result });
    }
    
    res.json({
      success: true,
      message: `📅 签到成功！连续${result.streak}天`,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取签到信息
router.get('/sign-info', async (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const info = await activityStorage.getSignInfo(player_id);
    res.json({ success: true, data: info });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新任务进度
router.post('/progress', async (req, res) => {
  try {
    const { player_id, activity_id, progress } = req.body;
    
    if (!player_id || !activity_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = await activityStorage.updateProgress(player_id, activity_id, progress || 1);
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取任务进度
router.get('/quest-progress', async (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const progress = await activityStorage.getQuestProgress(player_id);
    res.json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 领取任务奖励
router.post('/claim', async (req, res) => {
  try {
    const { player_id, activity_id } = req.body;
    
    if (!player_id || !activity_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const result = await activityStorage.claimReward(player_id, activity_id);
    
    res.json({
      success: true,
      message: `🎁 领取成功！`,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取活动加成
router.get('/bonus', async (req, res) => {
  try {
    const bonus = await activityStorage.getActivityBonus();
    res.json({ success: true, data: bonus });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 重置日常任务
router.post('/reset-daily', async (req, res) => {
  try {
    const result = await activityStorage.resetDailyActivities();
    res.json({ success: true, message: '每日任务已刷新', data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
