/**
 * 认证路由 - /api/auth/*
 */

module.exports = function(app, db, authenticateToken, Logger) {
  
  // 注册
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.json({ success: false, message: '用户名和密码必填' });
      }
      
      const existing = db.prepare('SELECT id FROM player WHERE username = ?').get(username);
      if (existing) {
        return res.json({ success: false, message: '用户名已存在' });
      }
      
      const passwordHash = require('crypto').createHash('sha256').update(password).digest('hex');
      
      const result = db.prepare(`
        INSERT INTO player (username, password_hash, spirit_stones, created_at)
        VALUES (?, ?, 1000, datetime('now'))
      `).run(username, passwordHash);
      
      res.json({ success: true, player_id: result.lastInsertRowid, message: '注册成功' });
    } catch (e) {
      Logger.error('注册失败:', e.message);
      res.json({ success: false, message: '注册失败' });
    }
  });
  
  // 登录
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.json({ success: false, message: '用户名和密码必填' });
      }
      
      const passwordHash = require('crypto').createHash('sha256').update(password).digest('hex');
      const player = db.prepare('SELECT * FROM player WHERE username = ? AND password_hash = ?')
        .get(username, passwordHash);
      
      if (!player) {
        return res.json({ success: false, message: '用户名或密码错误' });
      }
      
      const token = require('crypto').randomBytes(32).toString('hex');
      db.prepare('UPDATE player SET last_login = datetime(\'now\') WHERE id = ?').run(player.id);
      
      res.json({ 
        success: true, 
        token, 
        player_id: player.id,
        username: player.username 
      });
    } catch (e) {
      Logger.error('登录失败:', e.message);
      res.json({ success: false, message: '登录失败' });
    }
  });
  
  // 登出
  app.post('/api/auth/logout', authenticateToken, (req, res) => {
    res.json({ success: true, message: '登出成功' });
  });
  
  // 当前用户
  app.get('/api/auth/me', authenticateToken, (req, res) => {
    const player = db.prepare('SELECT id, username, realm_level FROM player WHERE id = ?')
      .get(req.playerId);
    res.json({ success: true, player });
  });
  
  // 修改密码
  app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      const player = db.prepare('SELECT password_hash FROM player WHERE id = ?')
        .get(req.playerId);
      
      const oldHash = require('crypto').createHash('sha256').update(oldPassword).digest('hex');
      if (player.password_hash !== oldHash) {
        return res.json({ success: false, message: '原密码错误' });
      }
      
      const newHash = require('crypto').createHash('sha256').update(newPassword).digest('hex');
      db.prepare('UPDATE player SET password_hash = ? WHERE id = ?')
        .run(newHash, req.playerId);
      
      res.json({ success: true, message: '密码修改成功' });
    } catch (e) {
      res.json({ success: false, message: '修改失败' });
    }
  });
  
  Logger.info('✓ 认证路由已加载');
};
