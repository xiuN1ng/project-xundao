/**
 * 技能路由 - /api/skills/*
 */

module.exports = function(app, db, authenticateToken, Logger) {
  
  // 获取技能列表
  app.get('/api/skills', (req, res) => {
    const skills = [
      { id: 'fireball', name: '火球术', type: 'attack', damage: 10, cooldown: 5 },
      { id: 'ice_lance', name: '冰枪术', type: 'attack', damage: 25, cooldown: 8 },
      { id: 'heal', name: '治疗术', type: 'heal', damage: 20, cooldown: 10 }
    ];
    res.json({ success: true, skills });
  });
  
  // 获取玩家技能列表
  app.get('/api/skills/list', (req, res) => {
    const { player_id } = req.query;
    const skills = db.prepare('SELECT * FROM player_skills WHERE player_id = ?').all(player_id);
    res.json({ success: true, skills });
  });
  
  // 获取玩家技能
  app.get('/api/skills/:player_id', (req, res) => {
    const { player_id } = req.params;
    const skills = db.prepare('SELECT * FROM player_skills WHERE player_id = ?').all(player_id);
    res.json({ success: true, skills });
  });
  
  // 学习技能
  app.post('/api/skills/learn', (req, res) => {
    const { player_id, skill_id } = req.body;
    
    const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(skill_id);
    if (!skill) return res.json({ success: false, message: '技能不存在' });
    
    const existing = db.prepare('SELECT * FROM player_skills WHERE player_id = ? AND skill_id = ?').get(player_id, skill_id);
    if (existing) return res.json({ success: false, message: '已学习此技能' });
    
    db.prepare('INSERT INTO player_skills (player_id, skill_id, level) VALUES (?, ?, 1)').run(player_id, skill_id);
    res.json({ success: true, message: '学习成功' });
  });
  
  // 升级技能
  app.post('/api/skills/:skill_id/upgrade', (req, res) => {
    const { skill_id } = req.params;
    const { player_id } = req.body;
    
    const playerSkill = db.prepare('SELECT * FROM player_skills WHERE player_id = ? AND skill_id = ?').get(player_id, skill_id);
    if (!playerSkill) return res.json({ success: false, message: '未学习此技能' });
    
    const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(skill_id);
    if (playerSkill.level >= skill.max_level) return res.json({ success: false, message: '已达最大等级' });
    
    const cost = JSON.parse(skill.upgrade_cost)[playerSkill.level + 1];
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    
    if (player.spirit_stones < cost.spirit_stones) return res.json({ success: false, message: '灵石不足' });
    
    db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(cost.spirit_stones, player_id);
    db.prepare('UPDATE player_skills SET level = level + 1 WHERE player_id = ? AND skill_id = ?').run(player_id, skill_id);
    
    res.json({ success: true, message: '升级成功' });
  });
  
  Logger.info('✓ 技能路由已加载');
};
