const express = require('express');
const router = express.Router();

// 复用 chapter 路由的数据
let chapterRouter;
try {
  chapterRouter = require('./chapter');
} catch (e) {
  console.log('[story] chapter路由加载失败:', e.message);
}

// 玩家剧情进度数据
const playerProgress = {};

// GET /api/story/chapters - 获取所有章节
router.get('/chapters', (req, res) => {
  const chapters = [];
  const items = chapterRouter ? chapterRouter.__chapters : [];
  if (items && items.length > 0) {
    chapters.push(...items);
  }
  res.json({ data: chapters, total: chapters.length });
});

// GET /api/story/list - 获取所有章节 (等用于 /chapters)
router.get('/list', (req, res) => {
  const chapters = [];
  const items = chapterRouter ? chapterRouter.__chapters : [];
  if (items && items.length > 0) {
    chapters.push(...items);
  }
  res.json({ data: chapters, total: chapters.length });
});

// GET /api/story/chapter/:chapterId - 获取章节详情
router.get('/chapter/:chapterId', (req, res) => {
  const chapterId = parseInt(req.params.chapterId);
  if (chapterRouter && chapterRouter.__chapters) {
    const chapter = chapterRouter.__chapters.find(c => c.id === chapterId);
    if (chapter) {
      return res.json({ data: chapter });
    }
  }
  res.json({ data: null, message: '章节不存在' });
});

// GET /api/story/current - 获取玩家当前进度
router.get('/current', (req, res) => {
  const playerId = req.query.player_id || 1;
  const chapterId = parseInt(req.query.chapter_id) || 1;
  const progress = playerProgress[playerId] || { chapterId, nodeIndex: 0, completed: false };
  res.json({ data: progress });
});

// POST /api/story/advance - 推进剧情
router.post('/advance', (req, res) => {
  const { player_id, chapter_id, node_id } = req.body;
  const playerId = player_id || 1;
  const chapterId = chapter_id || 1;
  
  if (!playerProgress[playerId]) {
    playerProgress[playerId] = { chapterId: 1, nodeIndex: 0, completed: false };
  }
  
  playerProgress[playerId].nodeIndex = node_id || playerProgress[playerId].nodeIndex + 1;
  playerProgress[playerId].chapterId = chapterId;
  
  res.json({ success: true, data: playerProgress[playerId] });
});

// GET /api/story/overview - 获取玩家剧情总览
router.get('/overview', (req, res) => {
  const playerId = req.query.player_id || 1;
  const progress = playerProgress[playerId] || { chapterId: 1, nodeIndex: 0, completed: false };
  
  let totalChapters = 0;
  if (chapterRouter && chapterRouter.__chapters) {
    totalChapters = chapterRouter.__chapters.length;
  }
  
  res.json({
    data: {
      playerId,
      currentChapter: progress.chapterId,
      currentNode: progress.nodeIndex,
      completed: progress.completed,
      totalChapters,
      completedCount: Object.values(playerProgress).filter(p => p.completed).length
    }
  });
});

module.exports = router;
module.exports.__chapterRouter = chapterRouter;
