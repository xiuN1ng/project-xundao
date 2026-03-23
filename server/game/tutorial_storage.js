/**
 * 新手引导存储层
 */

// 获取数据库实例
let db;
function getDb() {
  if (!db) {
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(__dirname, '..', 'data', 'game.db');
    db = new Database(dbPath);
  }
  return db;
}

// 初始化新手引导表
function initTutorialTable() {
  const db = getDb();
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_tutorial (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL UNIQUE,
      current_step INTEGER DEFAULT 0,
      completed_steps TEXT DEFAULT '[]',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      rewards_claimed TEXT DEFAULT '[]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// 新手引导步骤配置
const TUTORIAL_STEPS = [
  {
    id: 1,
    title: '踏入修仙之路',
    description: '欢迎来到修仙世界！首先选择你的第一本功法',
    type: 'learn_gongfa',
    target: 1,
    reward: { spirit_stones: 100 },
    next_step_delay: 0
  },
  {
    id: 2,
    title: '装备功法',
    description: '装备你学习的功法，提升修炼效率',
    type: 'equip_gongfa',
    target: 1,
    reward: { spirit_stones: 150 },
    next_step_delay: 0
  },
  {
    id: 3,
    title: '境界突破',
    description: '尝试突破境界，提升修为',
    type: 'breakthrough',
    target: 1,
    reward: { spirit_stones: 200 },
    next_step_delay: 0
  },
  {
    id: 4,
    title: '挑战副本',
    description: '进入境界副本，挑战更强敌人',
    type: 'enter_dungeon',
    target: 1,
    reward: { spirit_stones: 300 },
    next_step_delay: 0
  },
  {
    id: 5,
    title: '加入宗门',
    description: '加入宗门，与同道中人一起修炼',
    type: 'join_sect',
    target: 1,
    reward: { spirit_stones: 500 },
    next_step_delay: 0
  },
  {
    id: 6,
    title: '渡劫成仙',
    description: '渡天劫，成就无上仙道',
    type: 'tribulation',
    target: 1,
    reward: { spirit_stones: 1000 },
    next_step_delay: 0
  }
];

const tutorialStorage = {
  // 获取玩家的新手引导数据
  getPlayerTutorial(playerId) {
    const db = getDb();
    let tutorial = db.prepare('SELECT * FROM player_tutorial WHERE player_id = ?').get(playerId);
    
    if (!tutorial) {
      // 初始化新玩家的新手引导
      db.prepare(
        'INSERT INTO player_tutorial (player_id, current_step, completed_steps) VALUES (?, ?, ?)'
      ).run(playerId, 1, '[]');
      tutorial = db.prepare('SELECT * FROM player_tutorial WHERE player_id = ?').get(playerId);
    }
    
    // 解析 JSON 字段
    try {
      tutorial.completed_steps = JSON.parse(tutorial.completed_steps || '[]');
      tutorial.rewards_claimed = JSON.parse(tutorial.rewards_claimed || '[]');
    } catch (e) {
      console.error('解析新手引导数据失败:', e.message);
      tutorial.completed_steps = [];
      tutorial.rewards_claimed = [];
    }
    
    // 获取当前步骤详情
    const currentStepData = TUTORIAL_STEPS.find(s => s.id === tutorial.current_step);
    
    return {
      ...tutorial,
      current_step_data: currentStepData,
      total_steps: TUTORIAL_STEPS.length,
      all_steps: TUTORIAL_STEPS
    };
  },

  // 完成引导步骤
  completeStep(playerId, stepType) {
    const db = getDb();
    const tutorial = this.getPlayerTutorial(playerId);
    
    if (!tutorial) {
      return { success: false, error: '新手引导未初始化' };
    }
    
    const currentStep = TUTORIAL_STEPS.find(s => s.id === tutorial.current_step);
    
    if (!currentStep) {
      return { success: false, error: '没有更多步骤' };
    }
    
    // 检查步骤类型是否匹配
    if (currentStep.type !== stepType) {
      return { success: false, error: '步骤类型不匹配' };
    }
    
    // 检查是否已完成
    if (tutorial.completed_steps.includes(currentStep.id)) {
      return { success: false, error: '步骤已完成' };
    }
    
    // 标记为完成
    const completedSteps = [...tutorial.completed_steps, currentStep.id];
    const nextStep = tutorial.current_step + 1;
    const isCompleted = nextStep > TUTORIAL_STEPS.length;
    
    const updateData = {
      completed_steps: JSON.stringify(completedSteps),
      current_step: isCompleted ? tutorial.current_step : nextStep,
      completed_at: isCompleted ? new Date().toISOString() : null
    };
    
    db.prepare(`
      UPDATE player_tutorial 
      SET completed_steps = ?, current_step = ?, completed_at = ?
      WHERE player_id = ?
    `).run(updateData.completed_steps, updateData.current_step, updateData.completed_at, playerId);
    
    // 获取奖励
    let reward = null;
    if (!tutorial.rewards_claimed.includes(currentStep.id)) {
      reward = currentStep.reward;
      
      // 发放奖励
      if (reward.spirit_stones) {
        db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?')
          .run(reward.spirit_stones, playerId);
      }
      
      // 记录已领取奖励
      const rewardsClaimed = [...tutorial.rewards_claimed, currentStep.id];
      db.prepare('UPDATE player_tutorial SET rewards_claimed = ? WHERE player_id = ?')
        .run(JSON.stringify(rewardsClaimed), playerId);
    }
    
    return {
      success: true,
      data: {
        completed_step: currentStep.id,
        next_step: isCompleted ? null : nextStep,
        reward: reward,
        is_completed: isCompleted
      }
    };
  },

  // 跳过当前步骤
  skipStep(playerId) {
    const db = getDb();
    const tutorial = this.getPlayerTutorial(playerId);
    
    if (!tutorial) {
      return { success: false, error: '新手引导未初始化' };
    }
    
    const currentStep = TUTORIAL_STEPS.find(s => s.id === tutorial.current_step);
    
    if (!currentStep) {
      return { success: false, error: '没有更多步骤' };
    }
    
    // 直接完成当前步骤（不奖励）
    const completedSteps = [...tutorial.completed_steps, currentStep.id];
    const nextStep = tutorial.current_step + 1;
    const isCompleted = nextStep > TUTORIAL_STEPS.length;
    
    db.prepare(`
      UPDATE player_tutorial 
      SET completed_steps = ?, current_step = ?, completed_at = ?
      WHERE player_id = ?
    `).run(
      JSON.stringify(completedSteps),
      isCompleted ? tutorial.current_step : nextStep,
      isCompleted ? new Date().toISOString() : null,
      playerId
    );
    
    return {
      success: true,
      data: {
        completed_step: currentStep.id,
        next_step: isCompleted ? null : nextStep,
        is_completed: isCompleted
      }
    };
  },

  // 重置新手引导
  resetTutorial(playerId) {
    const db = getDb();
    
    db.prepare(`
      UPDATE player_tutorial 
      SET current_step = 1, completed_steps = '[]', completed_at = NULL, rewards_claimed = '[]'
      WHERE player_id = ?
    `).run(playerId);
    
    return { success: true };
  },

  // 获取新手引导配置
  getTutorialConfig() {
    return {
      steps: TUTORIAL_STEPS,
      total_steps: TUTORIAL_STEPS.length
    };
  }
};

// 初始化表
initTutorialTable();

module.exports = { tutorialStorage, TUTORIAL_STEPS };
