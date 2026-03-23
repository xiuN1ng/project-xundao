/**
 * 境界路由 - /api/realm/* /api/cultivation/*
 */

module.exports = function(app, db, authenticateToken, Logger) {
  
  // 获取境界信息
  app.get('/api/realm/info', (req, res) => {
    const { player_id } = req.query;
    
    const player = db.prepare('SELECT realm_level, cultivation, spirit FROM player WHERE id = ?').get(player_id);
    if (!player) return res.json({ success: false, message: '玩家不存在' });
    
    res.json({ success: true, realm: player });
  });
  
  // 突破境界
  app.post('/api/realm/breakthrough', (req, res) => {
    const { player_id } = req.body;
    
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    if (!player) return res.json({ success: false, message: '玩家不存在' });
    
    // 获取下一境界需求
    const nextRealm = player.realm_level + 1;
    const realmData = db.prepare('SELECT * FROM realm_data WHERE level = ?').get(nextRealm);
    
    if (!realmData) return res.json({ success: false, message: '已达最高境界' });
    
    if (player.spirit < realmData.cultivation_req) {
      return res.json({ success: false, message: '灵气不足' });
    }
    
    db.prepare('UPDATE player SET realm_level = realm_level + 1, spirit = spirit - ? WHERE id = ?').run(realmData.cultivation_req, player_id);
    
    res.json({ success: true, message: '突破成功', new_realm: nextRealm });
  });
  
  // 修炼
  app.post('/api/cultivate', (req, res) => {
    const { player_id, method } = req.body;
    
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    if (!player) return res.json({ success: false, message: '玩家不存在' });
    
    // 计算灵气获取
    const methods = { breathe: 10, meditate: 15, pill: 25 };
    const gain = methods[method] || 10;
    
    db.prepare('UPDATE player SET spirit = spirit + ? WHERE id = ?').run(gain, player_id);
    
    res.json({ success: true, message: '修炼完成', spirit_gained: gain });
  });
  
  // 获取境界列表
  app.get('/api/realm/list', (req, res) => {
    const realms = [
      { level: 0, name: '凡人', cultivation_req: 0 },
      { level: 1, name: '练气期', cultivation_req: 100 },
      { level: 2, name: '筑基期', cultivation_req: 500 },
      { level: 3, name: '金丹期', cultivation_req: 2000 },
      { level: 4, name: '元婴期', cultivation_req: 8000 },
      { level: 5, name: '化神期', cultivation_req: 30000 }
    ];
    res.json({ success: true, realms });
  });
  
  Logger.info('✓ 境界路由已加载');
};
