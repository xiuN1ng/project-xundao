/**
 * 每日副本系统存储层
 */

// 数据库连接 - 强制使用SQLite，因为服务器使用SQLite
let db;
let pool = null; // 禁用MySQL池

try {
  const server = require('../server');
  db = server.db || server;
} catch {
  const Database = require('better-sqlite3');
  const path = require('path');
  const dbPath = path.join(__dirname, '..', 'data', 'game.db');
  db = new Database(dbPath);
}

// MySQL pool兼容层
const dbPool = {
  execute(sql, params) {
    return new Promise((resolve, reject) => {
      try {
        if (!pool) {
          // 使用SQLite
          if (sql.trim().toUpperCase().startsWith('SELECT')) {
            const stmt = db.prepare(sql);
            const result = params ? stmt.all(...params) : stmt.all();
            resolve([result]);
          } else {
            const stmt = db.prepare(sql);
            const result = params ? stmt.run(...params) : stmt.run();
            resolve([{ affectedRows: result.changes, insertId: result.lastInsertRowid }]);
          }
        } else {
          // 使用MySQL
          pool.execute(sql, params)
            .then(([rows, fields]) => resolve([rows]))
            .catch(reject);
        }
      } catch (e) {
        reject(e);
      }
    });
  }
};

// ============ 每日副本配置数据 ============

const DAILY_DUNGEONS = {
  // 经验副本
  'exp_1': {
    id: 'exp_1',
    type: 'exp',
    name: '灵气漩涡',
    description: '天地灵气汇聚之地，修炼速度倍增',
    icon: '🌀',
    difficulty: 1,
    realm_req: 0,
    level_req: 1,
    stages: 5,
    time_limit: 300,  // 5分钟
    entry_cost: 0,
    rewards: {
      exp: 1000,
      spirit_stones: 100,
      items: []
    },
    monsters: [
      { name: '灵气之灵', base_hp: 200, base_atk: 20, exp: 50, drop_items: [] },
      { name: '灵气漩涡', base_hp: 300, base_atk: 30, exp: 80, drop_items: [] },
      { name: '灵气风暴', base_hp: 500, base_atk: 50, exp: 150, drop_items: [] },
      { name: '灵气龙卷', base_hp: 800, base_atk: 80, exp: 250, drop_items: [] },
      { name: '灵气之源', base_hp: 1200, base_atk: 120, exp: 400, drop_items: [] }
    ]
  },
  'exp_2': {
    id: 'exp_2',
    type: 'exp',
    name: '悟道古地',
    description: '上古大能悟道之所蕴含无上玄机',
    icon: '📚',
    difficulty: 2,
    realm_req: 2,
    level_req: 15,
    stages: 7,
    time_limit: 420,
    entry_cost: 500,
    rewards: {
      exp: 5000,
      spirit_stones: 500,
      items: ['lingshi', 'lingzhi']
    },
    monsters: [
      { name: '道韵之灵', base_hp: 800, base_atk: 80, exp: 200, drop_items: [] },
      { name: '法则碎片', base_hp: 1200, base_atk: 120, exp: 350, drop_items: [] },
      { name: '悟道者残魂', base_hp: 2000, base_atk: 200, exp: 600, drop_items: [] },
      { name: '天道意志', base_hp: 3000, base_atk: 300, exp: 1000, drop_items: [] },
      { name: '大道之音', base_hp: 4000, base_atk: 400, exp: 1500, drop_items: [] },
      { name: '天道化形', base_hp: 6000, base_atk: 600, exp: 2000, drop_items: [] },
      { name: '悟道本源', base_hp: 10000, base_atk: 1000, exp: 3000, drop_items: ['lingshi'] }
    ]
  },
  'exp_3': {
    id: 'exp_3',
    type: 'exp',
    name: '天劫试炼',
    description: '承受天劫洗礼，突破极限',
    icon: '⚡',
    difficulty: 3,
    realm_req: 4,
    level_req: 40,
    stages: 10,
    time_limit: 600,
    entry_cost: 2000,
    rewards: {
      exp: 20000,
      spirit_stones: 3000,
      items: ['renshen', 'tianqi']
    },
    monsters: [
      { name: '劫云', base_hp: 3000, base_atk: 300, exp: 800, drop_items: [] },
      { name: '雷龙', base_hp: 5000, base_atk: 500, exp: 1500, drop_items: [] },
      { name: '天雷', base_hp: 8000, base_atk: 800, exp: 2500, drop_items: [] },
      { name: '雷劫', base_hp: 12000, base_atk: 1200, exp: 4000, drop_items: [] },
      { name: '毁灭雷劫', base_hp: 18000, base_atk: 1800, exp: 6000, drop_items: [] },
      { name: '混沌雷劫', base_hp: 25000, base_atk: 2500, exp: 8000, drop_items: [] },
      { name: '先天雷劫', base_hp: 35000, base_atk: 3500, exp: 10000, drop_items: [] },
      { name: '大道雷劫', base_hp: 50000, base_atk: 5000, exp: 15000, drop_items: [] },
      { name: '无量量劫', base_hp: 80000, base_atk: 8000, exp: 20000, drop_items: [] },
      { name: '最终天劫', base_hp: 150000, base_atk: 15000, exp: 50000, drop_items: ['tianqi'] }
    ]
  },
  
  // 灵石副本
  'spirit_stones_1': {
    id: 'spirit_stones_1',
    type: 'spirit_stones',
    name: '灵石矿脉',
    description: '富含灵石的矿脉，获取大量灵石',
    icon: '⛏️',
    difficulty: 1,
    realm_req: 1,
    level_req: 5,
    stages: 5,
    time_limit: 300,
    entry_cost: 100,
    rewards: {
      exp: 200,
      spirit_stones: 2000,
      items: []
    },
    monsters: [
      { name: '矿妖', base_hp: 300, base_atk: 30, exp: 30, drop_items: [] },
      { name: '灵石精灵', base_hp: 500, base_atk: 50, exp: 60, drop_items: [] },
      { name: '矿脉守护', base_hp: 800, base_atk: 80, exp: 100, drop_items: [] },
      { name: '灵石巨人', base_hp: 1200, base_atk: 120, exp: 180, drop_items: [] },
      { name: '灵石之母', base_hp: 2000, base_atk: 200, exp: 300, drop_items: [] }
    ]
  },
  'spirit_stones_2': {
    id: 'spirit_stones_2',
    type: 'spirit_stones',
    name: '灵晶之穴',
    description: '高品质灵晶产出地',
    icon: '💠',
    difficulty: 2,
    realm_req: 3,
    level_req: 25,
    stages: 7,
    time_limit: 480,
    entry_cost: 1000,
    rewards: {
      exp: 1500,
      spirit_stones: 10000,
      items: ['jade']
    },
    monsters: [
      { name: '晶灵', base_hp: 1500, base_atk: 150, exp: 150, drop_items: [] },
      { name: '晶体怪', base_hp: 2500, base_atk: 250, exp: 300, drop_items: [] },
      { name: '灵晶巨兽', base_hp: 4000, base_atk: 400, exp: 500, drop_items: [] },
      { name: '晶石之王', base_hp: 6000, base_atk: 600, exp: 800, drop_items: [] },
      { name: '灵晶龙', base_hp: 10000, base_atk: 1000, exp: 1500, drop_items: [] },
      { name: '晶帝', base_hp: 15000, base_atk: 1500, exp: 2500, drop_items: [] },
      { name: '灵晶之源', base_hp: 25000, base_atk: 2500, exp: 5000, drop_items: ['jade'] }
    ]
  },
  'spirit_stones_3': {
    id: 'spirit_stones_3',
    type: 'spirit_stones',
    name: '极品灵脉',
    description: '天地极品灵脉，极高收益',
    icon: '🏔️',
    difficulty: 3,
    realm_req: 5,
    level_req: 60,
    stages: 10,
    time_limit: 600,
    entry_cost: 5000,
    rewards: {
      exp: 8000,
      spirit_stones: 50000,
      items: ['longgu', 'fenghuangshi']
    },
    monsters: [
      { name: '脉灵', base_hp: 5000, base_atk: 500, exp: 500, drop_items: [] },
      { name: '灵脉巨蛇', base_hp: 8000, base_atk: 800, exp: 1000, drop_items: [] },
      { name: '地脉守护', base_hp: 15000, base_atk: 1500, exp: 2000, drop_items: [] },
      { name: '山脉巨灵', base_hp: 25000, base_atk: 2500, exp: 4000, drop_items: [] },
      { name: '灵脉真龙', base_hp: 40000, base_atk: 4000, exp: 8000, drop_items: [] },
      { name: '地心炎魔', base_hp: 60000, base_atk: 6000, exp: 12000, drop_items: [] },
      { name: '灵脉之主', base_hp: 100000, base_atk: 10000, exp: 20000, drop_items: [] },
      { name: '天地灵脉', base_hp: 150000, base_atk: 15000, exp: 30000, drop_items: [] },
      { name: '混沌灵脉', base_hp: 250000, base_atk: 25000, exp: 50000, drop_items: [] },
      { name: '极品灵脉核心', base_hp: 500000, base_atk: 50000, exp: 100000, drop_items: ['longgu', 'fenghuangshi'] }
    ]
  },
  
  // 材料副本
  'materials_1': {
    id: 'materials_1',
    type: 'materials',
    name: '灵草园',
    description: '种植灵草的园圃，获取灵草材料',
    icon: '🌿',
    difficulty: 1,
    realm_req: 2,
    level_req: 10,
    stages: 5,
    time_limit: 300,
    entry_cost: 200,
    rewards: {
      exp: 500,
      spirit_stones: 300,
      items: ['lingzhi', 'lingshi']
    },
    monsters: [
      { name: '虫害', base_hp: 200, base_atk: 20, exp: 40, drop_items: [] },
      { name: '守护药童', base_hp: 400, base_atk: 40, exp: 80, drop_items: [] },
      { name: '药园精灵', base_hp: 600, base_atk: 60, exp: 150, drop_items: [] },
      { name: '灵草之灵', base_hp: 1000, base_atk: 100, exp: 250, drop_items: [] },
      { name: '灵草仙君', base_hp: 1500, base_atk: 150, exp: 400, drop_items: ['lingshi'] }
    ]
  },
  'materials_2': {
    id: 'materials_2',
    type: 'materials',
    name: '珍宝洞府',
    description: '收藏珍稀材料的洞府',
    icon: '💰',
    difficulty: 2,
    realm_req: 4,
    level_req: 35,
    stages: 7,
    time_limit: 480,
    entry_cost: 1500,
    rewards: {
      exp: 3000,
      spirit_stones: 2000,
      items: ['tianqi', 'xuanshen', 'longgu']
    },
    monsters: [
      { name: '守护傀儡', base_hp: 2000, base_atk: 200, exp: 200, drop_items: [] },
      { name: '珍宝守卫', base_hp: 3500, base_atk: 350, exp: 400, drop_items: [] },
      { name: '洞府灵兽', base_hp: 5500, base_atk: 550, exp: 700, drop_items: [] },
      { name: '宝藏龙龟', base_hp: 8000, base_atk: 800, exp: 1200, drop_items: [] },
      { name: '珍宝仙鹤', base_hp: 12000, base_atk: 1200, exp: 2000, drop_items: [] },
      { name: '洞天福地灵', base_hp: 18000, base_atk: 1800, exp: 3000, drop_items: [] },
      { name: '珍宝之主', base_hp: 30000, base_atk: 3000, exp: 5000, drop_items: ['tianqi', 'longgu'] }
    ]
  },
  'materials_3': {
    id: 'materials_3',
    type: 'materials',
    name: '神料产地',
    description: '产出神级材料的圣地',
    icon: '🔱',
    difficulty: 3,
    realm_req: 6,
    level_req: 70,
    stages: 10,
    time_limit: 720,
    entry_cost: 10000,
    rewards: {
      exp: 15000,
      spirit_stones: 20000,
      items: ['jiuxiaohua', 'linghuahong', 'immortal_spirit', 'world_frag']
    },
    monsters: [
      { name: '神料守护', base_hp: 10000, base_atk: 1000, exp: 1000, drop_items: [] },
      { name: '神兽白虎', base_hp: 20000, base_atk: 2000, exp: 2500, drop_items: [] },
      { name: '神兽青龙', base_hp: 30000, base_atk: 3000, exp: 5000, drop_items: [] },
      { name: '神兽朱雀', base_hp: 45000, base_atk: 4500, exp: 8000, drop_items: [] },
      { name: '神兽玄武', base_hp: 60000, base_atk: 6000, exp: 12000, drop_items: [] },
      { name: '麒麟瑞兽', base_hp: 80000, base_atk: 8000, exp: 18000, drop_items: [] },
      { name: '鲲鹏巨兽', base_hp: 120000, base_atk: 12000, exp: 25000, drop_items: [] },
      { name: '混沌神魔', base_hp: 180000, base_atk: 18000, exp: 40000, drop_items: [] },
      { name: '创始元灵', base_hp: 300000, base_atk: 30000, exp: 60000, drop_items: [] },
      { name: '神料本源', base_hp: 500000, base_atk: 50000, exp: 100000, drop_items: ['jiuxiaohua', 'linghuahong', 'immortal_spirit', 'world_frag'] }
    ]
  },
  
  // 炼狱副本
  'infernal_1': {
    id: 'infernal_1',
    type: 'infernal',
    name: '炼狱入口',
    description: '通往炼狱的入口，危机四伏',
    icon: '🌋',
    difficulty: 1,
    realm_req: 3,
    level_req: 20,
    stages: 5,
    time_limit: 360,
    entry_cost: 500,
    rewards: {
      exp: 2000,
      spirit_stones: 1500,
      items: ['demon_core', 'leiyuanshi']
    },
    monsters: [
      { name: '地狱犬', base_hp: 1000, base_atk: 100, exp: 150, drop_items: [] },
      { name: '焰魔', base_hp: 1500, base_atk: 150, exp: 300, drop_items: [] },
      { name: '烈火精灵', base_hp: 2500, base_atk: 250, exp: 500, drop_items: [] },
      { name: '炎魔领主', base_hp: 4000, base_atk: 400, exp: 800, drop_items: [] },
      { name: '炼狱守卫', base_hp: 6000, base_atk: 600, exp: 1200, drop_items: ['demon_core'] }
    ]
  },
  'infernal_2': {
    id: 'infernal_2',
    type: 'infernal',
    name: '炼狱深渊',
    description: '深入炼狱，获取极品装备',
    icon: '💀',
    difficulty: 2,
    realm_req: 5,
    level_req: 50,
    stages: 8,
    time_limit: 540,
    entry_cost: 3000,
    rewards: {
      exp: 10000,
      spirit_stones: 8000,
      items: ['fenghuangshi', 'leiyuanshi', 'demon_heart']
    },
    monsters: [
      { name: '深渊恶魔', base_hp: 5000, base_atk: 500, exp: 500, drop_items: [] },
      { name: '炼狱魔龙', base_hp: 8000, base_atk: 800, exp: 1000, drop_items: [] },
      { name: '火焰君主', base_hp: 12000, base_atk: 1200, exp: 2000, drop_items: [] },
      { name: '毁灭之王', base_hp: 20000, base_atk: 2000, exp: 3500, drop_items: [] },
      { name: '炼狱之主', base_hp: 30000, base_atk: 3000, exp: 5000, drop_items: [] },
      { name: '深渊古神', base_hp: 50000, base_atk: 5000, exp: 8000, drop_items: [] },
      { name: '混沌魔尊', base_hp: 80000, base_atk: 8000, exp: 12000, drop_items: [] },
      { name: '炼狱终极', base_hp: 150000, base_atk: 15000, exp: 20000, drop_items: ['fenghuangshi', 'demon_heart'] }
    ]
  },
  'infernal_3': {
    id: 'infernal_3',
    type: 'infernal',
    name: '炼狱之心',
    description: '炼狱核心区域，极品装备产地',
    icon: '👹',
    difficulty: 3,
    realm_req: 7,
    level_req: 80,
    stages: 12,
    time_limit: 900,
    entry_cost: 20000,
    rewards: {
      exp: 50000,
      spirit_stones: 50000,
      items: ['chaos_heart', 'world_frag', 'immortal_spirit', 'demon_crown']
    },
    monsters: [
      { name: '炼狱魔将', base_hp: 20000, base_atk: 2000, exp: 2000, drop_items: [] },
      { name: '深渊巨兽', base_hp: 35000, base_atk: 3500, exp: 4000, drop_items: [] },
      { name: '炼狱三头犬', base_hp: 50000, base_atk: 5000, exp: 7000, drop_items: [] },
      { name: '炎帝', base_hp: 80000, base_atk: 8000, exp: 12000, drop_items: [] },
      { name: '焱帝', base_hp: 120000, base_atk: 12000, exp: 18000, drop_items: [] },
      { name: '炼狱大帝', base_hp: 180000, base_atk: 18000, exp: 28000, drop_items: [] },
      { name: '深渊魔帝', base_hp: 250000, base_atk: 25000, exp: 40000, drop_items: [] },
      { name: '炼狱天魔', base_hp: 350000, base_atk: 35000, exp: 60000, drop_items: [] },
      { name: '混沌魔祖', base_hp: 500000, base_atk: 50000, exp: 80000, drop_items: [] },
      { name: '创始魔尊', base_hp: 800000, base_atk: 80000, exp: 120000, drop_items: [] },
      { name: '无上魔主', base_hp: 1200000, base_atk: 120000, exp: 180000, drop_items: [] },
      { name: '炼狱终极Boss', base_hp: 2000000, base_atk: 200000, exp: 300000, drop_items: ['chaos_heart', 'demon_crown'] }
    ]
  }
};

// 存储操作
const dailyDungeonStorage = {
  // 获取副本列表
  getDungeonList() {
    return Object.values(DAILY_DUNGEONS).map(d => ({
      id: d.id,
      type: d.type,
      name: d.name,
      description: d.description,
      icon: d.icon,
      difficulty: d.difficulty,
      realm_req: d.realm_req,
      level_req: d.level_req,
      stages: d.stages,
      time_limit: d.time_limit,
      entry_cost: d.entry_cost,
      reward_preview: {
        exp: d.rewards.exp,
        spirit_stones: d.rewards.spirit_stones,
        items: d.rewards.items
      }
    }));
  },
  
  // 获取单个副本
  getDungeonById(id) {
    return DAILY_DUNGEONS[id] || null;
  },
  
  // 获取玩家挑战记录
  async getPlayerChallenge(playerId, dungeonId) {
    try {
      const [rows] = await dbPool.execute(
        'SELECT * FROM daily_dungeon_challenges WHERE player_id = ? AND dungeon_id = ? AND status = \'in_progress\' ORDER BY start_time DESC LIMIT 1',
        [playerId, dungeonId]
      );
      return rows[0] || null;
    } catch (e) {
      console.error('获取玩家挑战失败:', e.message);
      return null;
    }
  },
  
  // 根据ID获取挑战记录
  async getChallengeById(challengeId) {
    try {
      const [rows] = await dbPool.execute(
        'SELECT * FROM daily_dungeon_challenges WHERE id = ?',
        [challengeId]
      );
      return rows[0] || null;
    } catch (e) {
      console.error('获取挑战记录失败:', e.message);
      return null;
    }
  },
  
  // 创建挑战
  async createChallenge(playerId, dungeonId, difficulty, maxHp, currentHp, timeLimit) {
    try {
      const [result] = await dbPool.execute(
        `INSERT INTO daily_dungeon_challenges 
         (player_id, dungeon_id, difficulty, current_hp, max_hp, time_limit, status, start_time) 
         VALUES (?, ?, ?, ?, ?, ?, 'in_progress', CURRENT_TIMESTAMP)`,
        [playerId, dungeonId, difficulty, currentHp, maxHp, timeLimit]
      );
      
      return {
        id: result.insertId,
        player_id: playerId,
        dungeon_id: dungeonId,
        difficulty: difficulty,
        current_hp: currentHp,
        max_hp: maxHp,
        time_limit: timeLimit,
        status: 'in_progress',
        start_time: new Date()
      };
    } catch (e) {
      console.error('创建挑战失败:', e.message);
      throw e;
    }
  },
  
  // 更新挑战状态
  async updateChallenge(challengeId, currentStage, currentHp) {
    try {
      await dbPool.execute(
        'UPDATE daily_dungeon_challenges SET current_stage = ?, current_hp = ? WHERE id = ?',
        [currentStage, currentHp, challengeId]
      );
    } catch (e) {
      console.error('更新挑战失败:', e.message);
    }
  },
  
  // 结束挑战
  async endChallenge(challengeId, status, completedStage = null, timeUsed = null) {
    try {
      const updateFields = ['status = ?', 'end_time = CURRENT_TIMESTAMP'];
      const params = [status];
      
      if (completedStage !== null) {
        updateFields.push('completed_stage = ?');
        params.push(completedStage);
      }
      
      if (timeUsed !== null) {
        updateFields.push('time_used = ?');
        params.push(timeUsed);
      }
      
      params.push(challengeId);
      
      await dbPool.execute(
        `UPDATE daily_dungeon_challenges SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );
    } catch (e) {
      console.error('结束挑战失败:', e.message);
    }
  },
  
  // 获取今日通关状态
  async getTodayStatus(playerId, dungeonId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [rows] = await dbPool.execute(
        'SELECT * FROM daily_dungeon_progress WHERE player_id = ? AND dungeon_id = ? AND progress_date = ?',
        [playerId, dungeonId, today]
      );
      return rows[0] || null;
    } catch (e) {
      console.error('获取今日状态失败:', e.message);
      return null;
    }
  },
  
  // 获取玩家今日挑战次数（成功或失败的都算）
  async getTodayChallengeCount(playerId, dungeonId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [rows] = await dbPool.execute(
        `SELECT COUNT(*) as count FROM daily_dungeon_challenges 
         WHERE player_id = ? AND dungeon_id = ? AND DATE(start_time) = ? AND status != 'in_progress'`,
        [playerId, dungeonId, today]
      );
      return rows[0]?.count || 0;
    } catch (e) {
      console.error('获取今日挑战次数失败:', e.message);
      return 0;
    }
  },
  
  // 获取玩家所有今日状态
  async getAllTodayStatus(playerId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [rows] = await dbPool.execute(
        'SELECT * FROM daily_dungeon_progress WHERE player_id = ? AND progress_date = ?',
        [playerId, today]
      );
      return rows;
    } catch (e) {
      console.error('获取所有今日状态失败:', e.message);
      return [];
    }
  },
  
  // 更新今日通关状态
  async updateTodayStatus(playerId, dungeonId, completed, bestTime) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      await dbPool.execute(
        `INSERT INTO daily_dungeon_progress (player_id, dungeon_id, progress_date, completed, best_time, completed_at) 
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP) 
         ON DUPLICATE KEY UPDATE 
           completed = CASE WHEN ? THEN 1 ELSE completed END,
           best_time = LEAST(IFNULL(best_time, 99999), ?),
           completed_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE completed_at END`,
        [playerId, dungeonId, today, completed ? 1 : 0, bestTime, completed ? 1 : 0, bestTime, completed ? 1 : 0]
      );
    } catch (e) {
      console.error('更新今日状态失败:', e.message);
    }
  },
  
  // 标记奖励已领取
  async claimReward(challengeId) {
    try {
      await dbPool.execute(
        'UPDATE daily_dungeon_challenges SET reward_claimed = 1 WHERE id = ?',
        [challengeId]
      );
    } catch (e) {
      console.error('标记奖励失败:', e.message);
    }
  }
};

// 导出
module.exports = {
  dailyDungeonStorage,
  DAILY_DUNGEONS
};
