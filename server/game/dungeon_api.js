/**
 * 副本/历练系统 API
 * 包含：副本数据、副本次数API、挑战副本API、副本结算API
 */

const express = require('express');
const router = express.Router();
const { pool } = require('./database');

// 安全解析 JSON（MySQL json列返回对象，静态数据是字符串）
function safeJsonParse(val, fallback) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

// ============ 副本配置数据 ============

const DUNGEON_DATA = {
  // 历练副本 - 基础
  'training_ground': {
    id: 'training_ground',
    name: '历练广场',
    type: 'training',
    description: '新人修士的历练之地，适合磨练技艺',
    difficulty: 1,
    realm_req: 0,
    level_req: 1,
    icon: '🏟️',
    min_players: 1,
    max_players: 1,
    recommended_power: 100,
    entry_cost: { spirit_stones: 0 },
    rewards: {
      exp: 50,
      spirit_stones: 20,
      items: []
    },
    monsters: [
      { name: '野狼', hp: 50, atk: 5, exp: 10 },
      { name: '山贼', hp: 80, atk: 8, exp: 15 }
    ],
    stages: 3,
    time_limit: 300,
    is_available: 1
  },
  
  // 历练副本 - 进阶
  'deep_forest': {
    id: 'deep_forest',
    name: '幽林深处',
    type: 'training',
    description: '深入密林，寻找珍稀药材和灵兽',
    difficulty: 2,
    realm_req: 1,
    level_req: 10,
    icon: '🌲',
    min_players: 1,
    max_players: 1,
    recommended_power: 500,
    entry_cost: { spirit_stones: 50 },
    rewards: {
      exp: 200,
      spirit_stones: 100,
      items: ['lingshi', 'lingzhi']
    },
    monsters: [
      { name: '毒蛇', hp: 150, atk: 15, exp: 30 },
      { name: '妖狼', hp: 200, atk: 20, exp: 40 },
      { name: '树妖', hp: 300, atk: 25, exp: 50 }
    ],
    stages: 5,
    time_limit: 600,
    is_available: 1
  },
  
  // 历练副本 - 精英
  'ancient_ruins': {
    id: 'ancient_ruins',
    name: '上古遗迹',
    type: 'training',
    description: '探索上古修士遗留的遗迹，寻找机缘',
    difficulty: 3,
    realm_req: 2,
    level_req: 25,
    icon: '🏛️',
    min_players: 1,
    max_players: 1,
    recommended_power: 2000,
    entry_cost: { spirit_stones: 200 },
    rewards: {
      exp: 800,
      spirit_stones: 500,
      items: ['renshen', 'gongfa_scratch']
    },
    monsters: [
      { name: '骷髅兵', hp: 500, atk: 40, exp: 100 },
      { name: '亡灵法师', hp: 400, atk: 60, exp: 120 },
      { name: '守护石像', hp: 800, atk: 50, exp: 150 }
    ],
    stages: 7,
    time_limit: 900,
    is_available: 1
  },
  
  // 秘境副本
  'spirit_cave': {
    id: 'spirit_cave',
    name: '灵云洞天',
    type: 'secret',
    description: '天地灵气汇聚的秘境，内有天材地宝',
    difficulty: 4,
    realm_req: 3,
    level_req: 40,
    icon: '☁️',
    min_players: 1,
    max_players: 3,
    recommended_power: 8000,
    entry_cost: { spirit_stones: 1000 },
    rewards: {
      exp: 3000,
      spirit_stones: 2000,
      items: ['tianqi', 'longgu', 'jade']
    },
    monsters: [
      { name: '灵气化形', hp: 1500, atk: 100, exp: 300 },
      { name: '云兽', hp: 2000, atk: 120, exp: 400 },
      { name: '洞天守护', hp: 3000, atk: 150, exp: 500 }
    ],
    stages: 9,
    time_limit: 1200,
    is_available: 1
  },
  
  // 深渊副本
  'demon_abyss': {
    id: 'demon_abyss',
    name: '妖魔深渊',
    type: 'dungeon',
    description: '镇压妖魔的深渊入口，危机四伏',
    difficulty: 5,
    realm_req: 4,
    level_req: 60,
    icon: '🌋',
    min_players: 1,
    max_players: 5,
    recommended_power: 25000,
    entry_cost: { spirit_stones: 5000 },
    rewards: {
      exp: 10000,
      spirit_stones: 8000,
      items: ['fenghuangshi', 'leiyuanshi', 'demon_core']
    },
    monsters: [
      { name: '深渊恶魔', hp: 5000, atk: 300, exp: 1000 },
      { name: '妖魔统领', hp: 8000, atk: 400, exp: 1500 },
      { name: '深渊之主', hp: 15000, atk: 600, exp: 3000 }
    ],
    stages: 12,
    time_limit: 1800,
    is_available: 1
  },
  
  // 仙府副本
  'immortal_temple': {
    id: 'immortal_temple',
    name: '仙府遗迹',
    type: 'secret',
    description: '真仙遗留的洞府，含无上奥秘',
    difficulty: 6,
    realm_req: 6,
    level_req: 80,
    icon: '🏔️',
    min_players: 1,
    max_players: 5,
    recommended_power: 100000,
    entry_cost: { spirit_stones: 20000 },
    rewards: {
      exp: 50000,
      spirit_stones: 50000,
      items: ['jiuxiaohua', 'linghuahong', 'immortal_spirit']
    },
    monsters: [
      { name: '仙灵', hp: 20000, atk: 1000, exp: 5000 },
      { name: '仙兽', hp: 30000, atk: 1500, exp: 8000 },
      { name: '真仙残魂', hp: 50000, atk: 2500, exp: 15000 }
    ],
    stages: 15,
    time_limit: 3600,
    is_available: 1
  }
};

// 副本存储操作
const dungeonStorage = {
  // 获取所有可用副本
  async getAllDungeons() {
    const [rows] = await pool.execute(
      'SELECT * FROM dungeons WHERE is_available = 1 ORDER BY difficulty ASC'
    );
    return rows;
  },

  // 获取单个副本
  async getDungeon(dungeonId) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM dungeons WHERE id = ?',
        [dungeonId]
      );
      if (rows[0]) return rows[0];
    } catch (e) {
      // MySQL dungeons表不存在时，静默降级到静态数据
    }
    // 降级：从 DUNGEON_DATA 查找
    return DUNGEON_DATA[dungeonId] || null;
  },

  // 获取玩家副本次数记录
  async getPlayerDungeonRecords(playerId) {
    const [rows] = await pool.execute(
      `SELECT pdr.*, d.name, d.icon, d.type, d.difficulty 
       FROM player_dungeon_records pdr 
       JOIN dungeons d ON pdr.dungeon_id = d.id 
       WHERE pdr.player_id = ?`,
      [playerId]
    );
    return rows;
  },

  // 获取玩家单个副本记录
  async getPlayerDungeonRecord(playerId, dungeonId) {
    const [rows] = await pool.execute(
      'SELECT * FROM player_dungeon_records WHERE player_id = ? AND dungeon_id = ?',
      [playerId, dungeonId]
    );
    return rows[0] || null;
  },

  // 更新玩家副本次数
  async updatePlayerDungeonRecord(playerId, dungeonId, enterCount, successCount, maxStage, bestTime) {
    await pool.execute(
      `INSERT INTO player_dungeon_records (player_id, dungeon_id, enter_count, success_count, max_stage, best_time, last_enter_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       ON DUPLICATE KEY UPDATE 
         enter_count = enter_count + ?,
         success_count = success_count + ?,
         max_stage = GREATEST(max_stage, ?),
         best_time = LEAST(IFNULL(best_time, 999999), ?),
         last_enter_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP`,
      [playerId, dungeonId, enterCount, successCount, maxStage, bestTime, enterCount, successCount, maxStage, bestTime]
    );
  },

  // 获取玩家当前挑战状态
  async getPlayerChallenge(playerId) {
    const [rows] = await pool.execute(
      'SELECT * FROM player_dungeon_challenges WHERE player_id = ? AND status = "in_progress" ORDER BY start_time DESC LIMIT 1',
      [playerId]
    );
    return rows[0] || null;
  },

  // 开始副本挑战
  async startChallenge(playerId, dungeonId, currentStage, maxHp) {
    // 先结束之前的挑战
    await pool.execute(
      `UPDATE player_dungeon_challenges 
       SET status = "abandoned", end_time = CURRENT_TIMESTAMP 
       WHERE player_id = ? AND status = "in_progress"`,
      [playerId]
    );
    
    // 创建新的挑战
    const [result] = await pool.execute(
      `INSERT INTO player_dungeon_challenges (player_id, dungeon_id, current_stage, current_hp, max_hp, status) 
       VALUES (?, ?, ?, ?, ?, "in_progress")`,
      [playerId, dungeonId, currentStage, maxHp, maxHp]
    );
    return result.insertId;
  },

  // 更新副本挑战状态
  async updateChallenge(playerId, currentStage, currentHp) {
    await pool.execute(
      `UPDATE player_dungeon_challenges 
       SET current_stage = ?, current_hp = ? 
       WHERE player_id = ? AND status = "in_progress"`,
      [currentStage, currentHp, playerId]
    );
  },

  // 结束副本挑战
  async endChallenge(playerId, status) {
    await pool.execute(
      `UPDATE player_dungeon_challenges 
       SET status = ?, end_time = CURRENT_TIMESTAMP 
       WHERE player_id = ? AND status = "in_progress"`,
      [status, playerId]
    );
  }
};

// ============ API 路由 ============

// GET /api/dungeons - 获取副本列表（数据库优先，回退到静态数据）
router.get('/', async (req, res) => {
  try {
    // 尝试从数据库获取副本
    let dungeons;
    try {
      dungeons = await dungeonStorage.getAllDungeons();
    } catch (dbErr) {
      // 数据库表不存在时，使用静态配置数据
      dungeons = [];
    }

    // 如果数据库没有数据，使用静态DUNGEON_DATA
    if (!dungeons || dungeons.length === 0) {
      const staticDungeons = Object.values(DUNGEON_DATA);
      return res.json({
        success: true,
        data: staticDungeons.map(d => ({
          dungeon_id: d.id,
          name: d.name,
          type: d.type,
          description: d.description,
          icon: d.icon,
          difficulty: d.difficulty,
          realm_req: d.realm_req,
          level_req: d.level_req,
          recommended_power: d.recommended_power,
          stages: d.stages,
          time_limit: d.time_limit,
          entry_cost: d.entry_cost,
          rewards: d.rewards,
          monster_count: d.monsters ? d.monsters.length : 0,
          is_available: d.is_available === 1
        }))
      });
    }

    // 转换为更简洁的列表格式
    const result = dungeons.map(dungeon => {
      const rewards = safeJsonParse(dungeon.rewards, {});
      const monsters = safeJsonParse(dungeon.monsters, []);

      return {
        dungeon_id: dungeon.id,
        name: dungeon.name,
        type: dungeon.type,
        description: dungeon.description,
        icon: dungeon.icon,
        difficulty: dungeon.difficulty,
        realm_req: dungeon.realm_req,
        level_req: dungeon.level_req,
        recommended_power: dungeon.recommended_power,
        stages: dungeon.stages,
        time_limit: dungeon.time_limit,
        entry_cost: safeJsonParse(dungeon.entry_cost, {}),
        rewards: {
          exp: rewards.exp || 0,
          spirit_stones: rewards.spirit_stones || 0,
          items: rewards.items || []
        },
        monster_count: monsters.length,
        is_available: dungeon.is_available === 1
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取副本列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取副本列表失败',
      error: error.message
    });
  }
});

// GET /api/dungeons/list - 获取副本列表（静态数据，无需MySQL）
router.get('/list', (req, res) => {
  const staticDungeons = Object.values(DUNGEON_DATA);
  res.json({
    success: true,
    data: staticDungeons.map(d => ({
      dungeon_id: d.id,
      name: d.name,
      type: d.type,
      description: d.description,
      icon: d.icon,
      difficulty: d.difficulty,
      realm_req: d.realm_req,
      level_req: d.level_req,
      recommended_power: d.recommended_power,
      stages: d.stages,
      time_limit: d.time_limit,
      entry_cost: d.entry_cost,
      rewards: d.rewards,
      monster_count: d.monsters ? d.monsters.length : 0,
      is_available: d.is_available === 1
    }))
  });
});

// GET /api/dungeons/:player_id - 获取玩家副本次数
router.get('/:player_id', async (req, res) => {
  try {
    const { player_id } = req.params;
    
    // 获取所有可用副本
    const dungeons = await dungeonStorage.getAllDungeons();
    
    // 获取玩家记录
    const records = await dungeonStorage.getPlayerDungeonRecords(player_id);
    
    // 合并数据
    const result = dungeons.map(dungeon => {
      const record = records.find(r => r.dungeon_id === dungeon.id);
      return {
        dungeon_id: dungeon.id,
        name: dungeon.name,
        icon: dungeon.icon,
        type: dungeon.type,
        difficulty: dungeon.difficulty,
        realm_req: dungeon.realm_req,
        level_req: dungeon.level_req,
        recommended_power: dungeon.recommended_power,
        stages: dungeon.stages,
        enter_count: record ? record.enter_count : 0,
        success_count: record ? record.success_count : 0,
        max_stage: record ? record.max_stage : 0,
        best_time: record ? record.best_time : null,
        last_enter_at: record ? record.last_enter_at : null
      };
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取副本次数失败:', error);
    res.status(500).json({
      success: false,
      message: '获取副本次数失败',
      error: error.message
    });
  }
});

// POST /api/dungeons/:dungeon_id/enter - 挑战副本
router.post('/:dungeon_id/enter', async (req, res) => {
  try {
    const { player_id, player_power } = req.body;
    const { dungeon_id } = req.params;
    
    if (!player_id) {
      return res.status(400).json({
        success: false,
        message: '缺少玩家ID'
      });
    }
    
    // 获取副本信息
    const dungeon = await dungeonStorage.getDungeon(dungeon_id);
    if (!dungeon) {
      return res.status(404).json({
        success: false,
        message: '副本不存在'
      });
    }
    
    // 检查玩家当前是否已有进行中的挑战
    const existingChallenge = await dungeonStorage.getPlayerChallenge(player_id);
    if (existingChallenge) {
      return res.status(400).json({
        success: false,
        message: '您已有进行中的副本挑战',
        challenge: {
          dungeon_id: existingChallenge.dungeon_id,
          current_stage: existingChallenge.current_stage,
          current_hp: existingChallenge.current_hp,
          max_hp: existingChallenge.max_hp
        }
      });
    }
    
    // 获取玩家当前境界和等级（从玩家数据中获取）
    let playerRealm = 0;
    let playerLevel = 1;
    
    try {
      const gameDataStorage = require('./storage').gameDataStorage;
      const playerData = await gameDataStorage.getPlayerGameData(player_id);
      if (playerData) {
        playerRealm = playerData.realm_level || 0;
        playerLevel = playerData.level || 1;
      }
    } catch (e) {
      console.log('获取玩家数据失败，使用默认:', e.message);
    }
    
    // 检查境界和等级要求
    if (playerRealm < dungeon.realm_req) {
      return res.status(400).json({
        success: false,
        message: `需要境界达到 ${dungeon.realm_req} 重才能进入此副本`
      });
    }
    
    if (playerLevel < dungeon.level_req) {
      return res.status(400).json({
        success: false,
        message: `需要等级达到 ${dungeon.level_req} 才能进入此副本`
      });
    }
    
    // 检查进入消耗
    const entryCost = safeJsonParse(dungeon.entry_cost, {});
    if (entryCost.spirit_stones && entryCost.spirit_stones > 0) {
      const playerStorage = require('./storage').playerStorage;
      const hasEnough = await playerStorage.hasEnoughSpiritStones(player_id, entryCost.spirit_stones);
      if (!hasEnough) {
        return res.status(400).json({
          success: false,
          message: `需要 ${entryCost.spirit_stones} 灵石才能进入此副本`
        });
      }
      // 扣除灵石
      await playerStorage.deductSpiritStones(player_id, entryCost.spirit_stones);
    }
    
    // 初始化玩家HP（基于推荐的战斗力）
    const baseHp = dungeon.recommended_power || 100;
    
    // 记录进入次数
    await dungeonStorage.updatePlayerDungeonRecord(player_id, dungeon_id, 1, 0, 0, 999999);
    
    // 创建挑战记录
    await dungeonStorage.startChallenge(player_id, dungeon_id, 1, baseHp);
    
    // 返回副本信息和初始状态
    const monsters = safeJsonParse(dungeon.monsters, []);
    const firstMonster = monsters[0] || { name: '怪物', hp: 100, atk: 10, exp: 10 };
    
    res.json({
      success: true,
      message: `成功进入副本：${dungeon.name}`,
      data: {
        dungeon_id: dungeon.id,
        dungeon_name: dungeon.name,
        dungeon_icon: dungeon.icon,
        difficulty: dungeon.difficulty,
        stages: dungeon.stages,
        current_stage: 1,
        current_hp: baseHp,
        max_hp: baseHp,
        monster: firstMonster,
        rewards: safeJsonParse(dungeon.rewards, {}),
        time_limit: dungeon.time_limit,
        entry_cost: entryCost
      }
    });
  } catch (error) {
    console.error('进入副本失败:', error);
    res.status(500).json({
      success: false,
      message: '进入副本失败',
      error: error.message
    });
  }
});

// GET /api/dungeons/:dungeon_id/reward - 副本结算
router.get('/:dungeon_id/reward', async (req, res) => {
  try {
    const { player_id, stage, success, time_used } = req.query;
    const { dungeon_id } = req.params;
    
    if (!player_id) {
      return res.status(400).json({
        success: false,
        message: '缺少玩家ID'
      });
    }
    
    // 获取副本信息
    const dungeon = await dungeonStorage.getDungeon(dungeon_id);
    if (!dungeon) {
      return res.status(404).json({
        success: false,
        message: '副本不存在'
      });
    }
    
    // 获取当前挑战状态
    const challenge = await dungeonStorage.getPlayerChallenge(player_id);
    if (!challenge || challenge.dungeon_id !== dungeon_id) {
      return res.status(400).json({
        success: false,
        message: '没有进行中的此副本挑战'
      });
    }
    
    const isSuccess = success === 'true' || success === '1';
    const completedStage = parseInt(stage) || challenge.current_stage;
    const timeUsed = parseInt(time_used) || 0;
    
    // 计算奖励
    let rewards = {
      exp: 0,
      spirit_stones: 0,
      items: []
    };
    
    if (isSuccess) {
      const baseRewards = safeJsonParse(dungeon.rewards, {});
      
      // 根据完成的关卡数计算奖励
      const stageMultiplier = completedStage / dungeon.stages;
      
      rewards = {
        exp: Math.floor((baseRewards.exp || 0) * stageMultiplier),
        spirit_stones: Math.floor((baseRewards.spirit_stones || 0) * stageMultiplier),
        items: baseRewards.items || []
      };
      
      // 发放奖励
      if (rewards.exp > 0 || rewards.spirit_stones > 0) {
        const playerStorage = require('./storage').playerStorage;
        await playerStorage.addResources(player_id, rewards.spirit_stones, rewards.exp);
      }
      
      // 更新玩家记录
      await dungeonStorage.updatePlayerDungeonRecord(
        player_id, 
        dungeon_id, 
        0, // 不增加进入次数
        1, // 成功次数+1
        completedStage,
        timeUsed
      );
    }
    
    // 结束挑战
    await dungeonStorage.endChallenge(player_id, isSuccess ? 'completed' : 'failed');
    
    // 获取更新后的记录
    const updatedRecord = await dungeonStorage.getPlayerDungeonRecord(player_id, dungeon_id);
    
    res.json({
      success: true,
      message: isSuccess ? '副本通关成功！' : '副本挑战失败',
      data: {
        dungeon_id: dungeon.id,
        dungeon_name: dungeon.name,
        completed_stage: completedStage,
        total_stages: dungeon.stages,
        success: isSuccess,
        time_used: timeUsed,
        rewards: rewards,
        record: {
          enter_count: updatedRecord ? updatedRecord.enter_count : 0,
          success_count: updatedRecord ? updatedRecord.success_count : 0,
          max_stage: updatedRecord ? updatedRecord.max_stage : 0,
          best_time: updatedRecord ? updatedRecord.best_time : null
        }
      }
    });
  } catch (error) {
    console.error('副本结算失败:', error);
    res.status(500).json({
      success: false,
      message: '副本结算失败',
      error: error.message
    });
  }
});

// POST /api/dungeons/:dungeon_id/battle - 战斗结算 (POST版本)
router.post('/:dungeon_id/battle', async (req, res) => {
  try {
    const { player_id, stage, success, time_used, damage_dealt, monsters_defeated } = req.body;
    const { dungeon_id } = req.params;
    
    if (!player_id) {
      return res.status(400).json({
        success: false,
        message: '缺少玩家ID'
      });
    }
    
    // 获取副本信息
    const dungeon = await dungeonStorage.getDungeon(dungeon_id);
    if (!dungeon) {
      return res.status(404).json({
        success: false,
        message: '副本不存在'
      });
    }
    
    // 获取当前挑战状态
    const challenge = await dungeonStorage.getPlayerChallenge(player_id);
    if (!challenge || challenge.dungeon_id !== dungeon_id) {
      return res.status(400).json({
        success: false,
        message: '没有进行中的此副本挑战'
      });
    }
    
    const isSuccess = success === true || success === 'true' || success === 1 || success === '1';
    const completedStage = parseInt(stage) || challenge.current_stage;
    const timeUsed = parseInt(time_used) || 0;
    const damageDealt = parseInt(damage_dealt) || 0;
    const monstersDefeated = parseInt(monsters_defeated) || 0;
    
    // 计算奖励
    let rewards = {
      exp: 0,
      spirit_stones: 0,
      items: []
    };
    
    if (isSuccess) {
      const baseRewards = safeJsonParse(dungeon.rewards, {});
      
      // 根据完成的关卡数计算奖励
      const stageMultiplier = completedStage / dungeon.stages;
      
      rewards = {
        exp: Math.floor((baseRewards.exp || 0) * stageMultiplier),
        spirit_stones: Math.floor((baseRewards.spirit_stones || 0) * stageMultiplier),
        items: baseRewards.items || []
      };
      
      // 发放奖励
      if (rewards.exp > 0 || rewards.spirit_stones > 0) {
        const playerStorage = require('./storage').playerStorage;
        await playerStorage.addResources(player_id, rewards.spirit_stones, rewards.exp);
      }
      
      // 更新玩家记录
      await dungeonStorage.updatePlayerDungeonRecord(
        player_id, 
        dungeon_id, 
        0, // 不增加进入次数
        1, // 成功次数+1
        completedStage,
        timeUsed
      );
    }
    
    // 结束挑战
    await dungeonStorage.endChallenge(player_id, isSuccess ? 'completed' : 'failed');
    
    // 获取更新后的记录
    const updatedRecord = await dungeonStorage.getPlayerDungeonRecord(player_id, dungeon_id);
    
    res.json({
      success: true,
      message: isSuccess ? '战斗胜利！' : '战斗失败',
      data: {
        dungeon_id: dungeon.id,
        dungeon_name: dungeon.name,
        completed_stage: completedStage,
        total_stages: dungeon.stages,
        success: isSuccess,
        time_used: timeUsed,
        damage_dealt: damageDealt,
        monsters_defeated: monstersDefeated,
        rewards: rewards,
        record: {
          enter_count: updatedRecord ? updatedRecord.enter_count : 0,
          success_count: updatedRecord ? updatedRecord.success_count : 0,
          max_stage: updatedRecord ? updatedRecord.max_stage : 0,
          best_time: updatedRecord ? updatedRecord.best_time : null
        }
      }
    });
  } catch (error) {
    console.error('战斗结算失败:', error);
    res.status(500).json({
      success: false,
      message: '战斗结算失败',
      error: error.message
    });
  }
});

// 种子数据 - 副本数据
async function seedDungeonData() {
  const connection = await pool.getConnection();
  
  try {
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM dungeons');
    if (rows[0].count > 0) return;
    
    for (const [id, dungeon] of Object.entries(DUNGEON_DATA)) {
      await connection.execute(
        `INSERT INTO dungeons (id, name, type, description, difficulty, realm_req, level_req, icon, min_players, max_players, recommended_power, entry_cost, rewards, monsters, stages, time_limit, is_available) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dungeon.id,
          dungeon.name,
          dungeon.type,
          dungeon.description,
          dungeon.difficulty,
          dungeon.realm_req,
          dungeon.level_req,
          dungeon.icon,
          dungeon.min_players,
          dungeon.max_players,
          dungeon.recommended_power,
          JSON.stringify(dungeon.entry_cost),
          JSON.stringify(dungeon.rewards),
          JSON.stringify(dungeon.monsters),
          dungeon.stages,
          dungeon.time_limit,
          dungeon.is_available
        ]
      );
    }
    
    console.log('✅ 副本数据种子完成');
  } catch (error) {
    console.error('❌ 副本数据种子失败:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

// 导出存储和种子函数
module.exports = router;
module.exports.seedDungeonData = seedDungeonData;
module.exports.dungeonStorage = dungeonStorage;
module.exports.DUNGEON_DATA = DUNGEON_DATA;
