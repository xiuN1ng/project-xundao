/**
 * 竞技场路由 - /api/arena/*
 */

module.exports = function(app, db, authenticateToken, Logger) {
  
  // 获取竞技场列表
  app.get('/api/arena/list', (req, res) => {
    const { player_id } = req.query;
    
    const rankings = db.prepare('SELECT * FROM arena ORDER BY rank ASC LIMIT 100').all();
    const playerRank = player_id ? db.prepare('SELECT * FROM arena WHERE player_id = ?').get(player_id) : null;
    
    res.json({ success: true, rankings, playerRank });
  });
  
  // 挑战对手
  app.post('/api/arena/challenge', (req, res) => {
    const { player_id, target_id } = req.body;
    
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    const target = db.prepare('SELECT * FROM player WHERE id = ?').get(target_id);
    
    if (!target) return res.json({ success: false, message: '对手不存在' });
    
    // 简单战斗逻辑
    const playerPower = player.combat_power || 100;
    const targetPower = target.combat_power || 100;
    const win = playerPower > targetPower;
    
    if (win) {
      const rewards = 50;
      db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(rewards, player_id);
      res.json({ success: true, message: '挑战胜利', rewards });
    } else {
      res.json({ success: false, message: '挑战失败' });
    }
  });
  
  // 获取玩家排名
  app.get('/api/arena/rank', (req, res) => {
    const { player_id } = req.query;
    
    const rank = db.prepare('SELECT * FROM arena WHERE player_id = ?').get(player_id);
    res.json({ success: true, rank });
  });
  
  Logger.info('✓ 竞技场路由已加载');
};
