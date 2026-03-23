/**
 * VIP路由 - /api/vip/*
 */

module.exports = function(app, db, authenticateToken, Logger) {
  
  // 获取VIP信息
  app.get('/api/vip/info', (req, res) => {
    const { player_id } = req.query;
    
    const player = db.prepare('SELECT vip_level, vip_points FROM player WHERE id = ?').get(player_id);
    if (!player) return res.json({ success: false, message: '玩家不存在' });
    
    const vipConfig = {
      1: { name: 'VIP1', daily_reward: 100, exp_bonus: 0.05 },
      2: { name: 'VIP2', daily_reward: 300, exp_bonus: 0.10 },
      3: { name: 'VIP3', daily_reward: 500, exp_bonus: 0.15 }
    };
    
    res.json({ success: true, vip: vipConfig[player.vip_level] || null, vip_level: player.vip_level });
  });
  
  // 购买VIP
  app.post('/api/vip/buy', (req, res) => {
    const { player_id, vip_level } = req.body;
    
    const prices = { 1: 100, 2: 500, 3: 1000 };
    const price = prices[vip_level];
    
    if (!price) return res.json({ success: false, message: 'VIP等级不存在' });
    
    db.prepare('UPDATE player SET vip_level = ? WHERE id = ?').run(vip_level, player_id);
    res.json({ success: true, message: `VIP${vip_level}购买成功` });
  });
  
  // 领取每日奖励
  app.post('/api/vip/daily-reward', (req, res) => {
    const { player_id } = req.body;
    
    const player = db.prepare('SELECT vip_level, last_vip_reward FROM player WHERE id = ?').get(player_id);
    if (!player || player.vip_level < 1) return res.json({ success: false, message: 'VIP才能领取' });
    
    const lastReward = new Date(player.last_vip_reward || '2000-01-01');
    const today = new Date();
    
    if (lastReward.toDateString() === today.toDateString()) {
      return res.json({ success: false, message: '今日已领取' });
    }
    
    const rewards = { 1: 100, 2: 300, 3: 500 };
    db.prepare('UPDATE player SET spirit_stones = spirit_stones + ?, last_vip_reward = CURRENT_TIMESTAMP WHERE id = ?').run(rewards[player.vip_level], player_id);
    
    res.json({ success: true, message: '奖励已领取', rewards: rewards[player.vip_level] });
  });
  
  Logger.info('✓ VIP路由已加载');
};
