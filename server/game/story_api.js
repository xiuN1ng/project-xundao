/**
 * 剧情系统 API
 * 支持多章节、多分支、多结局的剧情体验
 */

const express = require('express');
const router = express.Router();

// 加载依赖
let storyStorage;
function loadDependencies() {
  if (!storyStorage) {
    try {
      const storage = require('./story_storage');
      storyStorage = storage.storyStorage;
    } catch (e) {
      console.error('加载story_storage失败:', e.message);
    }
  }
  return storyStorage;
}

// 获取所有可解锁的章节列表
router.get('/chapters', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    loadDependencies();
    const chapters = storyStorage.getUnlockedChapters(playerId);
    
    res.json({ success: true, data: chapters });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取章节详情
router.get('/chapter/:chapterId', (req, res) => {
  try {
    const { chapterId } = req.params;
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    loadDependencies();
    const chapter = storyStorage.getChapter(parseInt(chapterId));
    
    if (!chapter) {
      return res.status(404).json({ success: false, error: '章节不存在' });
    }
    
    // 获取玩家进度
    const progress = storyStorage.getPlayerStoryProgress(playerId, parseInt(chapterId));
    
    res.json({ 
      success: true, 
      data: {
        ...chapter,
        player_progress: progress
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取当前剧情节点
router.get('/current', (req, res) => {
  try {
    const { player_id, chapter_id } = req.query;
    
    if (!player_id || !chapter_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    loadDependencies();
    const node = storyStorage.getCurrentNode(playerId, parseInt(chapter_id));
    
    if (!node) {
      return res.status(404).json({ success: false, error: '剧情节点不存在' });
    }
    
    res.json({ success: true, data: node });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 推进剧情
router.post('/advance', (req, res) => {
  try {
    const { player_id, chapter_id, choice_index } = req.body;
    
    if (!player_id || !chapter_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    loadDependencies();
    const chapterId = Number(chapter_id);
    const result = storyStorage.advanceStory(playerId, chapterId, choice_index);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家所有章节进度概览
router.get('/overview', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    loadDependencies();
    const chapters = storyStorage.getUnlockedChapters(playerId);
    
    const overview = chapters.map(ch => ({
      id: ch.id,
      title: ch.title,
      description: ch.description,
      is_completed: ch.is_completed,
      is_unlocked: ch.is_unlocked
    }));
    
    res.json({ success: true, data: overview });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 重置章节
router.post('/reset', (req, res) => {
  try {
    const { player_id, chapter_id } = req.body;
    
    if (!player_id || !chapter_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    loadDependencies();
    const result = storyStorage.resetChapter(playerId, parseInt(chapter_id));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取章节通关奖励
router.get('/reward/:chapterId', (req, res) => {
  try {
    const { chapterId } = req.params;
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    loadDependencies();
    const reward = storyStorage.getChapterReward(playerId, parseInt(chapterId));
    
    res.json({ success: true, data: reward });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 检查是否有进行中的剧情
router.get('/active', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    loadDependencies();
    const chapters = storyStorage.getUnlockedChapters(playerId);
    
    // 找到第一个未完成的章节
    const activeChapter = chapters.find(ch => !ch.is_completed);
    
    res.json({ 
      success: true, 
      data: activeChapter || null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
