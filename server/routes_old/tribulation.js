/**
 * 天劫路由 - /api/tribulation/*
 */

module.exports = function(app, db, authenticateToken, Logger) {
  
  // 获取天劫类型
  app.get('/api/tribulation/types', (req, res) => {
    const types = [
      { id: 'spiritual', name: '心魔劫', difficulty: 1, success_rate: 0.8 },
      { id: 'thunder', name: '雷劫', difficulty: 2, success_rate: 0.6 },
      { id: 'fire', name: '火劫', difficulty: 3, success_rate: 0.4 },
      { id: 'chaos', name: '混沌天劫', difficulty: 5, success_rate: 0.1 }
    ];
    res.json({ success: true, types });
  });
  
  // 尝试渡劫
  app.post('/api/tribulation/attempt', (req, res) => {
    const { player_id, tribulation_type } = req.body;
    
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    const tribType = db.prepare('SELECT * FROM tribulation_types WHERE id = ?').get(tribulation_type);
    
    if (!tribType) return res.json({ success: false, message: '天劫类型不存在' });
    
    const realmBonus = 0.1 - (player.realm_level * 0.05);
    const successRate = Math.max(0.1, tribType.success_rate + realmBonus);
    const success = Math.random() < successRate;
    
    if (success) {
      db.prepare('UPDATE player SET realm_level = realm_level + 1 WHERE id = ?').run(player_id);
      res.json({ success: true, message: '渡劫成功', new_realm: player.realm_level + 1 });
    } else {
      const penalty = Math.floor(player.spirit_stones * 0.3);
      db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(penalty, player_id);
      res.json({ success: false, message: '渡劫失败', penalty });
    }
  });
  
  // 预览成功率
  app.get('/api/tribulation/preview', (req, res) => {
    const { player_id, tribulation_type } = req.query;
    
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    const tribType = db.prepare('SELECT * FROM tribulation_types WHERE id = ?').get(tribulation_type);
    
    if (!tribType) return res.json({ success: false });
    
    const realmBonus = 0.1 - (player.realm_level * 0.05);
    const successRate = Math.max(0.1, tribType.success_rate + realmBonus);
    
    res.json({ success: true, success_rate: successRate });
  });
  
  Logger.info('✓ 天劫路由已加载');
};
