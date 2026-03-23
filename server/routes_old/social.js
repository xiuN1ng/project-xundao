/**
 * 社交路由 - /api/friend/* /api/chat/*
 */

module.exports = function(app, db, authenticateToken, Logger) {
  
  // 获取好友列表
  app.get('/api/friend/list', (req, res) => {
    const { player_id } = req.query;
    const friends = db.prepare('SELECT * FROM friends WHERE player_id = ? OR friend_id = ?').all(player_id, player_id);
    res.json({ success: true, friends });
  });
  
  // 添加好友
  app.post('/api/friend/add', (req, res) => {
    const { player_id, friend_name } = req.body;
    
    const friend = db.prepare('SELECT id FROM player WHERE username = ?').get(friend_name);
    if (!friend) return res.json({ success: false, message: '玩家不存在' });
    
    db.prepare('INSERT INTO friends (player_id, friend_id, status) VALUES (?, ?, "pending")').run(player_id, friend.id);
    res.json({ success: true, message: '好友请求已发送' });
  });
  
  // 接受好友
  app.post('/api/friend/accept', (req, res) => {
    const { player_id, friend_id } = req.body;
    
    db.prepare('UPDATE friends SET status = "accepted" WHERE player_id = ? AND friend_id = ?').run(friend_id, player_id);
    res.json({ success: true, message: '已成为好友' });
  });
  
  // 发送消息
  app.post('/api/chat/send', (req, res) => {
    const { sender_id, receiver_id, message } = req.body;
    
    db.prepare('INSERT INTO messages (sender_id, receiver_id, message, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(sender_id, receiver_id, message);
    res.json({ success: true, message: '消息已发送' });
  });
  
  // 获取消息
  app.get('/api/chat/messages', (req, res) => {
    const { player_id } = req.query;
    const messages = db.prepare('SELECT * FROM messages WHERE receiver_id = ? ORDER BY created_at DESC LIMIT 50').all(player_id);
    res.json({ success: true, messages });
  });
  
  Logger.info('✓ 社交路由已加载');
};
