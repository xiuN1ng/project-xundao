/**
 * 商店路由 - /api/shop/*
 */

module.exports = function(app, db, authenticateToken, Logger) {
  
  // 获取商店列表
  app.get('/api/shop/list', (req, res) => {
    const { shop_type } = req.query;
    let items = [
      { id: 'spirit_stone_pack', name: '灵石包', price: 100, currency: 'rmb', quantity: 1000 },
      { id: 'vip_card', name: 'VIP月卡', price: 30, currency: 'rmb', benefits: ['每日1000灵石', '经验+10%'] },
      { id: 'growth_fund', name: '成长基金', price: 68, currency: 'rmb',回报: '返还20000灵石' }
    ];
    
    if (shop_type === 'currency') items = items.filter(i => i.currency === 'rmb');
    res.json({ success: true, items });
  });
  
  // 购买商品
  app.post('/api/shop/buy', (req, res) => {
    const { player_id, item_id, quantity } = req.body;
    
    const item = db.prepare('SELECT * FROM shop_items WHERE id = ?').get(item_id);
    if (!item) return res.json({ success: false, message: '商品不存在' });
    
    const totalPrice = item.price * (quantity || 1);
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    
    if (item.currency === 'rmb') {
      // 付费购买
      db.prepare('INSERT INTO player_items (player_id, item_id, quantity) VALUES (?, ?, ?) ON CONFLICT(player_id, item_id) DO UPDATE SET quantity = quantity + ?').run(player_id, item_id, quantity || 1, quantity || 1);
    } else {
      // 灵石购买
      if (player.spirit_stones < totalPrice) return res.json({ success: false, message: '灵石不足' });
      db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(totalPrice, player_id);
      db.prepare('INSERT INTO player_items (player_id, item_id, quantity) VALUES (?, ?, ?) ON CONFLICT(player_id, item_id) DO UPDATE SET quantity = quantity + ?').run(player_id, item_id, quantity || 1, quantity || 1);
    }
    
    res.json({ success: true, message: '购买成功' });
  });
  
  // 获取玩家背包
  app.get('/api/shop/items', (req, res) => {
    const { player_id } = req.query;
    const items = db.prepare('SELECT * FROM player_items WHERE player_id = ?').all(player_id);
    res.json({ success: true, items });
  });
  
  Logger.info('✓ 商店路由已加载');
};
