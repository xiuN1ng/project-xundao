/**
 * 功法路由 - /api/gongfa/*
 */

module.exports = function(app, db, authenticateToken, Logger) {
  
  // 获取功法列表
  app.get('/api/gongfa/list', (req, res) => {
    const { realm, level } = req.query;
    let gongfa = require('./data/gongfa_data');
    
    if (realm) gongfa = gongfa.filter(g => g.realm_req <= parseInt(realm));
    if (level) gongfa = gongfa.filter(g => g.level_req <= parseInt(level));
    
    res.json({ success: true, gongfa });
  });
  
  // 学习功法
  app.post('/api/gongfa/learn', (req, res) => {
    const { player_id, gongfa_id } = req.body;
    
    const gongfa = db.prepare('SELECT * FROM gongfa WHERE id = ?').get(gongfa_id);
    if (!gongfa) return res.json({ success: false, message: '功法不存在' });
    
    const existing = db.prepare('SELECT * FROM player_gongfa WHERE player_id = ? AND gongfa_id = ?').get(player_id, gongfa_id);
    if (existing) return res.json({ success: false, message: '已学习此功法' });
    
    db.prepare('INSERT INTO player_gongfa (player_id, gongfa_id, level) VALUES (?, ?, 1)').run(player_id, gongfa_id);
    res.json({ success: true, message: '学习成功' });
  });
  
  // 卸下功法
  app.post('/api/gongfa/unequip', (req, res) => {
    const { player_id, gongfa_id } = req.body;
    
    db.prepare('UPDATE player_gongfa SET equipped = 0 WHERE player_id = ? AND gongfa_id = ?').run(player_id, gongfa_id);
    res.json({ success: true });
  });
  
  // 升级功法
  app.post('/api/gongfa/upgrade', (req, res) => {
    const { player_id, gongfa_id } = req.body;
    
    const playerGongfa = db.prepare('SELECT * FROM player_gongfa WHERE player_id = ? AND gongfa_id = ?').get(player_id, gongfa_id);
    if (!playerGongfa) return res.json({ success: false, message: '未学习此功法' });
    
    const gongfa = db.prepare('SELECT * FROM gongfa WHERE id = ?').get(gongfa_id);
    if (playerGongfa.level >= gongfa.max_level) return res.json({ success: false, message: '已达最大等级' });
    
    const cost = gongfa.upgrade_cost[playerGongfa.level + 1];
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    
    if (player.spirit_stones < cost.spirit_stones) return res.json({ success: false, message: '灵石不足' });
    
    db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(cost.spirit_stones, player_id);
    db.prepare('UPDATE player_gongfa SET level = level + 1 WHERE player_id = ? AND gongfa_id = ?').run(player_id, gongfa_id);
    
    res.json({ success: true, message: '升级成功' });
  });
  
  // 装备功法
  app.post('/api/gongfa/equip', (req, res) => {
    const { player_id, gongfa_id } = req.body;
    
    db.prepare('UPDATE player_gongfa SET equipped = 1 WHERE player_id = ? AND gongfa_id = ?').run(player_id, gongfa_id);
    res.json({ success: true });
  });
  
  // 获取功法状态
  app.get('/api/gongfa/status', (req, res) => {
    const { player_id } = req.query;
    
    const gongfa = db.prepare('SELECT * FROM player_gongfa WHERE player_id = ?').all(player_id);
    res.json({ success: true, gongfa });
  });
  
  // 获取功法详情
  app.get('/api/gongfa/:id', (req, res) => {
    const { id } = req.params;
    const gongfa = db.prepare('SELECT * FROM gongfa WHERE id = ?').get(id);
    
    if (!gongfa) return res.json({ success: false, message: '功法不存在' });
    res.json({ success: true, gongfa });
  });
  
  Logger.info('✓ 功法路由已加载');
};
