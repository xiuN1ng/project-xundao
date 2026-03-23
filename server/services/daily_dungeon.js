/**
 * 每日副本（限时挑战）系统
 */

const express = require('express');
const router = express.Router();

// 存储模块 - 延迟加载
function getDailyStorage() {
  const m = require('./daily_dungeon_storage');
  return m.dailyDungeonStorage;
}

function getPlayerStorage() {
  const m = require('./storage');
  return m.playerStorage;
}

function getGameDataStorage() {
  const m = require('./storage');
  return m.gameDataStorage;
}

// 配置
const DUNGEON_TYPES = {
  'infernal': { id: 'infernal', name: '炼狱副本', description: '高难度挑战，产出稀有装备', icon: '🔥', primary_reward: 'equipment', realm_req: 3 },
  'exp': { id: 'exp', name: '经验副本', description: '快速升级，获取大量经验', icon: '⭐', primary_reward: 'exp', realm_req: 0 },
  'spirit_stones': { id: 'spirit_stones', name: '灵石副本', description: '大量灵石产出', icon: '💎', primary_reward: 'spirit_stones', realm_req: 1 },
  'materials': { id: 'materials', name: '材料副本', description: '稀有材料获取', icon: '🎁', primary_reward: 'materials', realm_req: 2 }
};

const DIFFICULTY_LEVELS = {
  1: { name: '简单', hp_multiplier: 0.5, atk_multiplier: 0.5, reward_multiplier: 0.5 },
  2: { name: '普通', hp_multiplier: 1.0, atk_multiplier: 1.0, reward_multiplier: 1.0 },
  3: { name: '困难', hp_multiplier: 2.0, atk_multiplier: 2.0, reward_multiplier: 2.0 },
  4: { name: '炼狱', hp_multiplier: 4.0, atk_multiplier: 3.0, reward_multiplier: 4.0 }
};

// 每日副本次数限制
const MAX_DAILY_CHALLENGES = 3;

const OPEN_HOURS = [
  { start: 12, end: 14 },
  { start: 18, end: 22 }
];

function getCurrentPeriodInfo() {
  const now = new Date();
  const hour = now.getHours();
  
  for (let i = 0; i < OPEN_HOURS.length; i++) {
    const period = OPEN_HOURS[i];
    if (hour >= period.start && hour < period.end) {
      const endTime = new Date(now);
      endTime.setHours(period.end, 0, 0, 0);
      const remainingMs = endTime - now;
      return { isOpen: true, periodIndex: i, periodName: i === 0 ? '午间时段' : '晚间时段', endHour: period.end, remainingSeconds: Math.floor(remainingMs / 1000) };
    }
  }
  
  let nextPeriod = OPEN_HOURS[0];
  let nextIndex = 0;
  for (let i = 0; i < OPEN_HOURS.length; i++) {
    if (OPEN_HOURS[i].start > hour) { nextPeriod = OPEN_HOURS[i]; nextIndex = i; break; }
  }
  
  const nextTime = new Date(now);
  nextTime.setHours(nextPeriod.start, 0, 0, 0);
  if (hour >= nextPeriod.start) nextTime.setDate(nextTime.getDate() + 1);
  
  const waitMs = nextTime - now;
  return { isOpen: false, periodName: nextIndex === 0 ? '午间时段' : '晚间时段', startHour: nextPeriod.start, waitSeconds: Math.floor(waitMs / 1000) };
}

function getTodayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ============ API 路由 ============

// 错误处理中间件
router.use((err, req, res, next) => {
  console.error('Daily dungeon router error:', err);
  res.status(500).json({ success: false, error: err.message });
});

router.get('/list', async (req, res) => {
  try {
    const dailyStorage = getDailyStorage();
    const gStorage = getGameDataStorage();
    const periodInfo = getCurrentPeriodInfo();
    const dungeons = dailyStorage.getDungeonList();
    
    let playerRealm = 0;
    let todayChallengeCounts = {};
    const { player_id } = req.query;
    if (player_id) {
      try {
        const playerData = await gStorage.getPlayerGameData(player_id);
        if (playerData) playerRealm = playerData.realm_level || 0;
        // 获取每个副本的今日挑战次数
        for (const d of dungeons) {
          todayChallengeCounts[d.id] = await dailyStorage.getTodayChallengeCount(player_id, d.id);
        }
      } catch (e) { console.log('获取玩家境界失败:', e.message); }
    }
    
    const availableDungeons = dungeons.filter(d => d.realm_req <= playerRealm);
    
    res.json({
      success: true,
      data: {
        is_open: periodInfo.isOpen,
        period_info: periodInfo,
        max_daily_challenges: MAX_DAILY_CHALLENGES,
        dungeons: availableDungeons.map(d => ({
          id: d.id, type: d.type, type_name: DUNGEON_TYPES[d.type]?.name, type_icon: DUNGEON_TYPES[d.type]?.icon,
          difficulty: d.difficulty, difficulty_name: DIFFICULTY_LEVELS[d.difficulty]?.name, name: d.name,
          description: d.description, icon: d.icon, realm_req: d.realm_req, time_limit: d.time_limit,
          reward_preview: d.reward_preview, is_available: d.realm_req <= playerRealm,
          today_challenge_count: todayChallengeCounts[d.id] || 0,
          remaining_challenges: Math.max(0, MAX_DAILY_CHALLENGES - (todayChallengeCounts[d.id] || 0))
        }))
      }
    });
  } catch (error) {
    console.error('获取每日副本列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/info/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { player_id } = req.query;
    const dailyStorage = getDailyStorage();
    const dungeon = dailyStorage.getDungeonById(id);
    if (!dungeon) return res.status(404).json({ success: false, error: '副本不存在' });
    
    const periodInfo = getCurrentPeriodInfo();
    let challengeStatus = null, todayStatus = null, todayChallengeCount = 0;
    if (player_id) {
      challengeStatus = await dailyStorage.getPlayerChallenge(player_id, id);
      todayStatus = await dailyStorage.getTodayStatus(player_id, id);
      todayChallengeCount = await dailyStorage.getTodayChallengeCount(player_id, id);
    }
    
    res.json({
      success: true,
      data: { ...dungeon, type_info: DUNGEON_TYPES[dungeon.type], difficulty_info: DIFFICULTY_LEVELS[dungeon.difficulty],
        is_open: periodInfo.isOpen, period_info: periodInfo, challenge_status: challengeStatus,
        today_completed: todayStatus?.completed || false, best_time: todayStatus?.best_time || null,
        today_challenge_count: todayChallengeCount, max_daily_challenges: MAX_DAILY_CHALLENGES,
        remaining_challenges: Math.max(0, MAX_DAILY_CHALLENGES - todayChallengeCount) }
    });
  } catch (error) {
    console.error('获取每日副本详情失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/enter', async (req, res) => {
  try {
    const { player_id, dungeon_id, difficulty } = req.body;
    if (!player_id || !dungeon_id) return res.status(400).json({ success: false, error: '缺少必要参数' });
    
    const periodInfo = getCurrentPeriodInfo();
    if (!periodInfo.isOpen) return res.status(400).json({ success: false, error: '副本未开放', period_info: periodInfo });
    
    const dailyStorage = getDailyStorage();
    const pStorage = getPlayerStorage();
    const gStorage = getGameDataStorage();
    const dungeon = dailyStorage.getDungeonById(dungeon_id);
    if (!dungeon) return res.status(404).json({ success: false, error: '副本不存在' });
    
    const actualDifficulty = difficulty || 1;
    if (!DIFFICULTY_LEVELS[actualDifficulty]) return res.status(400).json({ success: false, error: '无效的难度等级' });
    
    let playerRealm = 0;
    try {
      const playerData = await gStorage.getPlayerGameData(player_id);
      if (playerData) playerRealm = playerData.realm_level || 0;
    } catch (e) {}
    
    // 检查每日挑战次数限制
    const todayChallengeCount = await dailyStorage.getTodayChallengeCount(player_id, dungeon_id);
    if (todayChallengeCount >= MAX_DAILY_CHALLENGES) {
      return res.status(400).json({ success: false, error: `今日挑战次数已用完（${MAX_DAILY_CHALLENGES}次）`, max_challenges: MAX_DAILY_CHALLENGES });
    }
    
    if (playerRealm < dungeon.realm_req) return res.status(400).json({ success: false, error: `需要境界达到 ${dungeon.realm_req} 重才能进入此副本` });
    
    const todayStatus = await dailyStorage.getTodayStatus(player_id, dungeon_id);
    if (todayStatus?.completed) return res.status(400).json({ success: false, error: '今日已完成此副本' });
    
    const existingChallenge = await dailyStorage.getPlayerChallenge(player_id, dungeon_id);
    if (existingChallenge && existingChallenge.status === 'in_progress') return res.status(400).json({ success: false, error: '已有进行中的副本挑战', challenge: existingChallenge });
    
    if (dungeon.entry_cost > 0) {
      const hasEnough = await pStorage.hasEnoughSpiritStones(player_id, dungeon.entry_cost);
      if (!hasEnough) return res.status(400).json({ success: false, error: `需要 ${dungeon.entry_cost} 灵石才能进入` });
      await pStorage.deductSpiritStones(player_id, dungeon.entry_cost);
    }
    
    const difficultyStats = DIFFICULTY_LEVELS[actualDifficulty];
    const monsters = dungeon.monsters.map(m => ({ name: m.name, hp: Math.floor(m.base_hp * difficultyStats.hp_multiplier), atk: Math.floor(m.base_atk * difficultyStats.atk_multiplier), exp: m.exp, drop_items: m.drop_items || [] }));
    
    let playerPower = 1000;
    try {
      const playerData = await gStorage.getPlayerGameData(player_id);
      if (playerData) playerPower = playerData.combat_power || 1000;
    } catch (e) {}
    
    const playerMaxHp = Math.floor(playerPower * 10);
    const challenge = await dailyStorage.createChallenge(player_id, dungeon_id, actualDifficulty, playerMaxHp, playerMaxHp, dungeon.time_limit);
    
    res.json({
      success: true,
      message: `进入 ${dungeon.name}（${DIFFICULTY_LEVELS[actualDifficulty].name}难度）`,
      data: {
        challenge_id: challenge.id, dungeon_id: dungeon.id, dungeon_name: dungeon.name, difficulty: actualDifficulty,
        difficulty_name: DIFFICULTY_LEVELS[actualDifficulty].name, current_stage: 1, total_stages: dungeon.stages,
        current_hp: playerMaxHp, max_hp: playerMaxHp, monster: monsters[0], time_limit: dungeon.time_limit,
        remaining_time: dungeon.time_limit,
        rewards_preview: { exp: Math.floor(dungeon.rewards.exp * difficultyStats.reward_multiplier), spirit_stones: Math.floor(dungeon.rewards.spirit_stones * difficultyStats.reward_multiplier), items: dungeon.rewards.items }
      }
    });
  } catch (error) {
    console.error('进入每日副本失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/battle', async (req, res) => {
  try {
    const { player_id, challenge_id, stage, damage_dealt, time_used } = req.body;
    if (!player_id || !challenge_id) return res.status(400).json({ success: false, error: '缺少必要参数' });
    
    const dailyStorage = getDailyStorage();
    const pStorage = getPlayerStorage();
    const challenge = await dailyStorage.getChallengeById(challenge_id);
    if (!challenge) return res.status(404).json({ success: false, error: '挑战不存在' });
    if (challenge.player_id != player_id) return res.status(403).json({ success: false, error: '无权操作此挑战' });
    if (challenge.status !== 'in_progress') return res.status(400).json({ success: false, error: '挑战已结束' });
    
    const dungeon = dailyStorage.getDungeonById(challenge.dungeon_id);
    if (!dungeon) return res.status(404).json({ success: false, error: '副本不存在' });
    
    const currentStage = stage || challenge.current_stage;
    const difficultyStats = DIFFICULTY_LEVELS[challenge.difficulty];
    const monsters = dungeon.monsters;
    
    // 使用客户端传入的time_used来判断是否超时，如果没有传入则计算
    const timeUsed = time_used !== undefined ? time_used : 0;
    if (timeUsed > challenge.time_limit) {
      await dailyStorage.endChallenge(challenge_id, 'timeout');
      return res.status(400).json({ success: false, error: '挑战超时', data: { result: 'timeout' } });
    }
    
    let newHp = challenge.current_hp;
    let monsterDefeated = false;
    if (monsters[currentStage - 1]) {
      const monsterAtk = Math.floor(monsters[currentStage - 1].base_atk * difficultyStats.atk_multiplier);
      newHp = Math.max(0, newHp - monsterAtk);
    }
    if (damage_dealt) {
      const monsterHp = Math.floor(monsters[currentStage - 1]?.base_hp * difficultyStats.hp_multiplier || 0);
      if (damage_dealt >= monsterHp) monsterDefeated = true;
    }
    
    if (newHp <= 0) {
      await dailyStorage.endChallenge(challenge_id, 'failed');
      return res.json({ success: true, message: '战斗失败！怪物击败了你', data: { result: 'defeated', current_stage: currentStage, current_hp: 0, max_hp: challenge.max_hp, rewards: null } });
    }
    
    if (monsterDefeated && currentStage >= dungeon.stages) {
      const timeUsed = time_used || 0;
      const rewards = { exp: Math.floor(dungeon.rewards.exp * difficultyStats.reward_multiplier), spirit_stones: Math.floor(dungeon.rewards.spirit_stones * difficultyStats.reward_multiplier), items: dungeon.rewards.items || [] };
      if (rewards.exp > 0 || rewards.spirit_stones > 0) await pStorage.addResources(player_id, rewards.spirit_stones, rewards.exp);
      await dailyStorage.endChallenge(challenge_id, 'completed', currentStage, timeUsed);
      await dailyStorage.updateTodayStatus(player_id, challenge.dungeon_id, true, timeUsed);
      return res.json({ success: true, message: '🎉 恭喜通关！', data: { result: 'completed', completed_stage: currentStage, total_stages: dungeon.stages, time_used: timeUsed, current_hp: newHp, max_hp: challenge.max_hp, rewards } });
    }
    
    if (monsterDefeated) {
      await dailyStorage.updateChallenge(challenge_id, currentStage + 1, newHp);
      const nextMonster = monsters[currentStage] || monsters[monsters.length - 1];
      const nextMonsterData = nextMonster ? { name: nextMonster.name, hp: Math.floor(nextMonster.base_hp * difficultyStats.hp_multiplier), atk: Math.floor(nextMonster.base_atk * difficultyStats.atk_multiplier), exp: nextMonster.exp } : null;
      return res.json({ success: true, message: `击败 ${monsters[currentStage - 1]?.name || '怪物'}，进入第 ${currentStage + 1} 关`, data: { result: 'next_stage', completed_stage: currentStage, next_stage: currentStage + 1, total_stages: dungeon.stages, current_hp: newHp, max_hp: challenge.max_hp, monster: nextMonsterData, remaining_time: challenge.time_limit - timeUsed } });
    }
    
    await dailyStorage.updateChallenge(challenge_id, currentStage, newHp);
    res.json({ success: true, message: `正在挑战第 ${currentStage} 关`, data: { result: 'continue', current_stage: currentStage, total_stages: dungeon.stages, current_hp: newHp, max_hp: challenge.max_hp, remaining_time: challenge.time_limit - timeUsed } });
  } catch (error) {
    console.error('每日副本战斗失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/claim-reward', async (req, res) => {
  try {
    const { player_id, challenge_id } = req.body;
    if (!player_id || !challenge_id) return res.status(400).json({ success: false, error: '缺少必要参数' });
    
    const dailyStorage = getDailyStorage();
    const pStorage = getPlayerStorage();
    const challenge = await dailyStorage.getChallengeById(challenge_id);
    if (!challenge) return res.status(404).json({ success: false, error: '挑战不存在' });
    if (challenge.player_id != player_id) return res.status(403).json({ success: false, error: '无权操作此挑战' });
    if (challenge.status !== 'completed') return res.status(400).json({ success: false, error: challenge.status === 'failed' ? '挑战失败，无法领取奖励' : '挑战进行中' });
    if (challenge.reward_claimed) return res.status(400).json({ success: false, error: '奖励已领取' });
    
    const dungeon = dailyStorage.getDungeonById(challenge.dungeon_id);
    if (!dungeon) return res.status(404).json({ success: false, error: '副本不存在' });
    
    const difficultyStats = DIFFICULTY_LEVELS[challenge.difficulty];
    const rewards = { exp: Math.floor(dungeon.rewards.exp * difficultyStats.reward_multiplier), spirit_stones: Math.floor(dungeon.rewards.spirit_stones * difficultyStats.reward_multiplier), items: dungeon.rewards.items || [] };
    if (rewards.exp > 0 || rewards.spirit_stones > 0) await pStorage.addResources(player_id, rewards.spirit_stones, rewards.exp);
    await dailyStorage.claimReward(challenge_id);
    
    res.json({ success: true, message: '奖励已发放到背包', data: { rewards, completed_stage: challenge.completed_stage, time_used: challenge.time_used } });
  } catch (error) {
    console.error('领取奖励失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/status', async (req, res) => {
  try {
    const { player_id } = req.query;
    if (!player_id) return res.status(400).json({ success: false, error: '缺少玩家ID' });
    
    const dailyStorage = getDailyStorage();
    const periodInfo = getCurrentPeriodInfo();
    const allDungeons = dailyStorage.getDungeonList();
    const todayStatuses = await dailyStorage.getAllTodayStatus(player_id);
    
    const statusMap = {};
    todayStatuses.forEach(s => { statusMap[s.dungeon_id] = s; });
    
    const dungeonStatuses = allDungeons.map(d => ({
      dungeon_id: d.id, name: d.name, icon: d.icon, type: d.type, type_name: DUNGEON_TYPES[d.type]?.name,
      difficulty: d.difficulty, difficulty_name: DIFFICULTY_LEVELS[d.difficulty]?.name,
      completed: statusMap[d.id]?.completed || false, best_time: statusMap[d.id]?.best_time || null, completed_at: statusMap[d.id]?.completed_at || null
    }));
    
    const totalCount = allDungeons.length;
    const completedCount = Object.values(statusMap).filter(s => s.completed).length;
    
    res.json({
      success: true,
      data: { date: getTodayDateString(), is_open: periodInfo.isOpen, period_info: periodInfo,
        summary: { total: totalCount, completed: completedCount, remaining: totalCount - completedCount },
        dungeons: dungeonStatuses }
    });
  } catch (error) {
    console.error('获取每日副本状态失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 离开副本
router.post('/leave', async (req, res) => {
  try {
    const { player_id, challenge_id } = req.body;
    if (!player_id || !challenge_id) return res.status(400).json({ success: false, error: '缺少必要参数' });
    
    const dailyStorage = getDailyStorage();
    const challenge = await dailyStorage.getChallengeById(challenge_id);
    if (!challenge) return res.status(404).json({ success: false, error: '挑战不存在' });
    if (challenge.player_id != player_id) return res.status(403).json({ success: false, error: '无权操作此挑战' });
    if (challenge.status !== 'in_progress') return res.status(400).json({ success: false, error: '挑战已结束' });
    
    // 离开副本不算完成，不扣除次数
    await dailyStorage.endChallenge(challenge_id, 'abandoned');
    
    res.json({
      success: true,
      message: '已离开副本，挑战次数已消耗'
    });
  } catch (error) {
    console.error('离开每日副本失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 领取奖励 (GET)
router.get('/rewards', async (req, res) => {
  try {
    const { player_id, challenge_id } = req.query;
    if (!player_id || !challenge_id) return res.status(400).json({ success: false, error: '缺少必要参数' });
    
    const dailyStorage = getDailyStorage();
    const challenge = await dailyStorage.getChallengeById(challenge_id);
    if (!challenge) return res.status(404).json({ success: false, error: '挑战不存在' });
    if (challenge.player_id != player_id) return res.status(403).json({ success: false, error: '无权操作此挑战' });
    
    const dungeon = dailyStorage.getDungeonById(challenge.dungeon_id);
    if (!dungeon) return res.status(404).json({ success: false, error: '副本不存在' });
    
    const difficultyStats = DIFFICULTY_LEVELS[challenge.difficulty];
    const rewards = {
      exp: Math.floor(dungeon.rewards.exp * difficultyStats.reward_multiplier),
      spirit_stones: Math.floor(dungeon.rewards.spirit_stones * difficultyStats.reward_multiplier),
      items: dungeon.rewards.items || []
    };
    
    const status = challenge.status;
    const canClaim = status === 'completed' && !challenge.reward_claimed;
    
    res.json({
      success: true,
      data: {
        challenge_id: challenge.id,
        dungeon_id: challenge.dungeon_id,
        dungeon_name: dungeon.name,
        difficulty: challenge.difficulty,
        difficulty_name: DIFFICULTY_LEVELS[challenge.difficulty]?.name,
        status: status,
        completed_stage: challenge.completed_stage,
        time_used: challenge.time_used,
        reward_claimed: !!challenge.reward_claimed,
        can_claim: canClaim,
        rewards: rewards
      }
    });
  } catch (error) {
    console.error('获取奖励信息失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
