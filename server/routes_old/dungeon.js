/**
 * 副本路由 - /api/dungeon/* 和 /api/realm-dungeon/*
 */

module.exports = function(app, db, authenticateToken, Logger) {
  
  // 获取副本列表
  app.get('/api/realm-dungeon/list', (req, res) => {
    const { player_id } = req.query;
    
    const dungeons = [
      { id: 'spirit_cave', name: '灵气洞府', difficulty: 1, recommended_realm: 1, rewards: { spirit: 100 } },
      { id: 'fire_domain', name: '火焰领域', difficulty: 3, recommended_realm: 3, rewards: { spirit: 300 } },
      { id: 'thunder_mountain', name: '雷山', difficulty: 5, recommended_realm: 5, rewards: { spirit: 500 } }
    ];
    
    const playerDungeons = player_id ? db.prepare('SELECT * FROM player_dungeons WHERE player_id = ?').all(player_id) : [];
    
    res.json({ success: true, dungeons, playerDungeons });
  });
  
  // 进入副本
  app.post('/api/dungeon/enter', (req, res) => {
    const { player_id, dungeon_id } = req.body;
    
    const dungeon = db.prepare('SELECT * FROM dungeons WHERE id = ?').get(dungeon_id);
    if (!dungeon) return res.json({ success: false, message: '副本不存在' });
    
    db.prepare('INSERT OR REPLACE INTO player_dungeon_state (player_id, dungeon_id, entered_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(player_id, dungeon_id);
    
    res.json({ success: true, message: '进入副本成功' });
  });
  
  // 扫荡副本
  app.post('/api/dungeon/sweep', (req, res) => {
    const { player_id, dungeon_id, times } = req.body;
    
    const dungeon = db.prepare('SELECT * FROM dungeons WHERE id = ?').get(dungeon_id);
    if (!dungeon) return res.json({ success: false, message: '副本不存在' });
    
    const reward = (dungeon.base_reward || 100) * (times || 1);
    db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(reward, player_id);
    
    res.json({ success: true, message: '扫荡成功', rewards: { spirit: reward } });
  });
  
  Logger.info('✓ 副本路由已加载');
};
