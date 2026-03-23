/**
 * 任务路由 - /api/tasks/*
 */

module.exports = function(app, db, authenticateToken, Logger) {
  
  // 获取任务列表
  app.get('/api/tasks', (req, res) => {
    const tasks = [
      { id: 'daily_cultivate', name: '每日修炼', description: '修炼1小时', reward: { spirit: 100 }, type: 'daily' },
      { id: 'realm_break', name: '境界突破', description: '突破一次境界', reward: { spirit: 500 }, type: 'once' },
      { id: 'enhance_equipment', name: '强化装备', description: '强化一次装备', reward: { spirit: 50 }, type: 'daily' }
    ];
    res.json({ success: true, tasks });
  });
  
  // 获取玩家任务
  app.get('/api/tasks/:player_id', (req, res) => {
    const { player_id } = req.params;
    const playerTasks = db.prepare('SELECT * FROM player_tasks WHERE player_id = ?').all(player_id);
    res.json({ success: true, tasks: playerTasks });
  });
  
  // 接受任务
  app.post('/api/tasks/:task_id/accept', (req, res) => {
    const { task_id } = req.params;
    const { player_id } = req.body;
    
    db.prepare('INSERT OR IGNORE INTO player_tasks (player_id, task_id, progress, status) VALUES (?, ?, 0, "active")').run(player_id, task_id);
    res.json({ success: true, message: '任务已接受' });
  });
  
  // 完成任务
  app.post('/api/tasks/:task_id/complete', (req, res) => {
    const { task_id } = req.params;
    const { player_id } = req.body;
    
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task_id);
    if (!task) return res.json({ success: false, message: '任务不存在' });
    
    db.prepare('UPDATE player_tasks SET status = "completed" WHERE player_id = ? AND task_id = ?').run(player_id, task_id);
    db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(task.reward || 100, player_id);
    
    res.json({ success: true, message: '任务完成', reward: task.reward });
  });
  
  // 领取奖励
  app.post('/api/tasks/:task_id/claim', (req, res) => {
    const { task_id } = req.params;
    const { player_id } = req.body;
    
    db.prepare('UPDATE player_tasks SET claimed = 1 WHERE player_id = ? AND task_id = ?').run(player_id, task_id);
    res.json({ success: true, message: '奖励已领取' });
  });
  
  // 更新任务进度
  app.post('/api/tasks/update-progress', (req, res) => {
    const { player_id, task_id, progress } = req.body;
    
    db.prepare('UPDATE player_tasks SET progress = ? WHERE player_id = ? AND task_id = ?').run(progress, player_id, task_id);
    res.json({ success: true });
  });
  
  Logger.info('✓ 任务路由已加载');
};
