/**
 * 玩家路由 - /api/player/*
 */

module.exports = function(app, db, authenticateToken, Logger) {
  
  // 创建玩家
  app.post('/api/player/create', async (req, res) => {
    try {
      const { username, spiritRoot, realm, level } = req.body;
      
      if (!username) {
        return res.status(400).json({ success: false, error: '缺少用户名' });
      }
      
      let player = db.prepare('SELECT id FROM player WHERE username = ?').get(username);
      
      if (player) {
        return res.json({ success: true, data: { playerId: player.id, existed: true } });
      }
      
      const result = db.prepare(
        'INSERT INTO player (username, spirit_stones, level, realm_level, spirit_root) VALUES (?, ?, ?, ?, ?)'
      ).run(username, 1000, level || 1, 0, spiritRoot || '五行杂灵根');
      
      const newPlayerId = result.lastInsertRowid;
      
      db.prepare(`INSERT INTO player_tutorial (player_id, step_id, completed, completed_at, updated_at) VALUES (?, 'step_1', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).run(newPlayerId);
      db.prepare('UPDATE player SET spirit_stones = spirit_stones + 100 WHERE id = ?').run(newPlayerId);
      
      res.json({ success: true, data: { playerId: newPlayerId, existed: false, reward: { spirit_stones: 100 } } });
    } catch (error) {
      Logger.error('创建玩家错误:', error);
      res.status(500).json({ success: false, error: '服务器错误' });
    }
  });
  
  Logger.info('✓ 玩家路由已加载');
};
