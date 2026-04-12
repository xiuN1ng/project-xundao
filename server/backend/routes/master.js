/**
 * 师徒系统路由
 * 收徒条件、师徒任务、贡献商店
 */

const express = require('express');
const router = express.Router();

// 模拟玩家数据存储（实际项目中替换为数据库）
const _players = {
  1: { id: 1, name: '修仙者', realmLevel: 5, level: 10, lingshi: 5000, spiritStones: 5000 },
  2: { id: 2, name: '小师弟', realmLevel: 3, level: 6, lingshi: 1000, spiritStones: 1000 },
};

// 师徒关系数据
const masterRelations = {}; // playerId -> { role, masterId, apprentices[], reputation, contribution, teachCount, learnCount, joinedAt, lastTeach, lastLearn }

// 收徒申请
const applications = {}; // masterId -> [{ apprenticeId, apprenticeName, appliedAt }]

// 师徒任务记录
const masterTasks = {}; // playerId -> { dailyTasks: [], lastReset }

// ============ 配置 ============
const MASTER_CONFIG = {
  // 拜师条件
  APPRENTICE_MAX_REALM: 15,          // 徒弟最高可拜师境界
  MAX_APPRENTICES: 5,                 // 师父最多收徒数量
  MASTER_MIN_REALM: 8,                // 师父最低境界要求
  JOIN_COST: 0,                       // 拜师消耗灵石

  // 师徒加成
  BONUS: {
    apprentice: { spirit_rate: 0.2, exp_rate: 0.25, drop_rate: 0.1 },
    master: { spirit_rate: 0.1, exp_rate: 0.15, drop_rate: 0.2 }
  },

  // 传授CD（毫秒）
  TEACH_COOLDOWN: 3600000,            // 1小时
  LEARN_COOLDOWN: 3600000,            // 1小时

  // 传授奖励基础值
  TEACH_EXP: 2000,
  LEARN_EXP: 3000,

  // 传承配置
  INHERITANCE: {
    technique: { name: '功法传承', bonus_exp: 0.3, cost: 5000 },
    realm:     { name: '境界传承', bonus_exp: 0.5, cost: 10000 },
    artifact:  { name: '法宝传承', bonus_exp: 0.2, cost: 3000 },
    spirit:    { name: '灵气传承', bonus_exp: 0.4, cost: 8000 }
  }
};

// 师徒每日任务
const DAILY_TASKS = [
  { id: 'teach', name: '传授功法', desc: '师父传授功法给徒弟', type: 'master', reward_contribution: 10, reward_exp: 500 },
  { id: 'learn', name: '请教功法', desc: '徒弟向师父请教', type: 'apprentice', reward_contribution: 10, reward_exp: 500 },
  { id: 'dungeon', name: '师徒副本', desc: '共同通关一次副本', type: 'both', reward_contribution: 20, reward_exp: 1000 },
  { id: 'chat', name: '师徒交流', desc: '师徒之间发送消息', type: 'both', reward_contribution: 5, reward_exp: 200 },
  { id: 'gift', name: '赠送礼物', desc: '徒弟向师父赠送礼物', type: 'apprentice', reward_contribution: 15, reward_exp: 300 },
];

// 贡献商店物品
const CONTRIBUTION_SHOP = [
  { id: 'exp_book', name: '经验丹', desc: '使用后获得10000经验', cost: 50, type: 'exp', value: 10000 },
  { id: 'spirit_stone_pack', name: '灵石袋', desc: '获得1000灵石', cost: 80, type: 'lingshi', value: 1000 },
  { id: 'rare_skill', name: '秘传功法', desc: '随机获得一本蓝色功法', cost: 200, type: 'skill', quality: 'rare' },
  { id: 'master_title', name: '名师称号', desc: '获得"名师"称号（属性+5%攻击）', cost: 150, type: 'title', value: 'master_teacher' },
  { id: 'apprentice_title', name: '高徒称号', desc: '获得"高徒"称号（属性+5%经验）', cost: 150, type: 'title', value: 'top_apprentice' },
  { id: 'beast_food', name: '灵兽粮', desc: '灵兽饱食度+50', cost: 30, type: 'beast', value: 50 },
  { id: 'realm_pill', name: '境界丹', desc: '境界修炼速度+10%，持续1天', cost: 100, type: 'buff', duration: 86400 },
  { id: 'double_exp_card', name: '双倍经验卡', desc: '1小时内经验翻倍', cost: 60, type: 'buff', duration: 3600 },
  { id: 'apprentice_charm', name: '徒弟魅力+1', desc: '洞府魅力值+1', cost: 40, type: 'charm', value: 1 },
];

// ============ 辅助函数 ============
function getPlayerId(req) {
  return parseInt((req.body && req.body.player_id) || req.query.player_id || 1);
}

function getPlayerData(playerId) {
  return _players[playerId] || null;
}

function getRelation(playerId) {
  if (!masterRelations[playerId]) {
    masterRelations[playerId] = {
      role: null,         // 'master' | 'apprentice'
      masterId: null,
      apprentices: [],    // [playerId, ...]
      reputation: 50,
      contribution: 0,
      teachCount: 0,
      learnCount: 0,
      joinedAt: null,
      lastTeach: 0,
      lastLearn: 0,
      titles: [],
      buffs: [],          // [{ type, value, expiresAt }]
      completedTasks: {}, // { date: 'YYYY-MM-DD', tasks: ['teach', 'learn', ...] }
    };
  }
  return masterRelations[playerId];
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function resetDailyTasks(playerId) {
  const rel = getRelation(playerId);
  const today = getToday();
  if (rel.completedTasks.date !== today) {
    rel.completedTasks = { date: today, tasks: [] };
  }
}

// ============ 查询接口 ============

// 获取师徒信息
router.get('/info', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const rel = getRelation(playerId);
    const player = getPlayerData(playerId);

    res.json({
      success: true,
      data: {
        role: rel.role,
        masterId: rel.masterId,
        masterName: rel.masterId ? (_players[rel.masterId]?.name || '未知') : null,
        apprentices: rel.apprentices.map(id => ({
          id,
          name: _players[id]?.name || '未知',
          realmLevel: _players[id]?.realmLevel || 0,
          level: _players[id]?.level || 0,
        })),
        reputation: rel.reputation,
        contribution: rel.contribution,
        teachCount: rel.teachCount,
        learnCount: rel.learnCount,
        joinedAt: rel.joinedAt,
        bonus: rel.role === 'master' ? MASTER_CONFIG.BONUS.master :
               rel.role === 'apprentice' ? MASTER_CONFIG.BONUS.apprentice : null,
        titles: rel.titles,
        buffs: rel.buffs.filter(b => b.expiresAt > Date.now()),
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 获取可拜师的师父列表
router.get('/masters', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const player = getPlayerData(playerId);
    const myRel = getRelation(playerId);

    if (myRel.role) {
      return res.json({ success: false, message: '你已有师徒关系' });
    }

    // 找出所有可以作为师父的玩家
    const masters = Object.keys(masterRelations)
      .map(id => parseInt(id))
      .filter(masterId => {
        const rel = masterRelations[masterId];
        return rel.role === 'master' && rel.apprentices.length < MASTER_CONFIG.MAX_APPRENTICES;
      })
      .map(masterId => ({
        id: masterId,
        name: _players[masterId]?.name || '未知',
        realmLevel: _players[masterId]?.realmLevel || 0,
        level: _players[masterId]?.level || 0,
        apprenticeCount: masterRelations[masterId].apprentices.length,
        reputation: masterRelations[masterId].reputation,
      }));

    res.json({ success: true, masters });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 获取收徒申请列表（师父视角）
router.get('/applications', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const rel = getRelation(playerId);

    if (rel.role !== 'master') {
      return res.json({ success: false, message: '你不是师父' });
    }

    const apps = applications[playerId] || [];
    res.json({ success: true, applications: apps });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 获取师徒每日任务
router.get('/tasks', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const rel = getRelation(playerId);
    resetDailyTasks(playerId);

    const myTasks = DAILY_TASKS.filter(task => {
      if (task.type === 'both') return !!rel.role;
      if (task.type === 'master') return rel.role === 'master';
      if (task.type === 'apprentice') return rel.role === 'apprentice';
      return false;
    }).map(task => ({
      ...task,
      completed: rel.completedTasks.tasks.includes(task.id),
    }));

    res.json({ success: true, tasks: myTasks, date: getToday() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 获取贡献商店
router.get('/shop', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    res.json({ success: true, items: CONTRIBUTION_SHOP });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 获取传承类型
router.get('/inheritance', (req, res) => {
  try {
    res.json({ success: true, types: MASTER_CONFIG.INHERITANCE });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 获取配置
router.get('/config', (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        APPRENTICE_MAX_REALM: MASTER_CONFIG.APPRENTICE_MAX_REALM,
        MAX_APPRENTICES: MASTER_CONFIG.MAX_APPRENTICES,
        MASTER_MIN_REALM: MASTER_CONFIG.MASTER_MIN_REALM,
        bonus: MASTER_CONFIG.BONUS,
        dailyTasks: DAILY_TASKS,
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ============ 拜师/收徒操作 ============

// 申请拜师
router.post('/apply', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const masterId = parseInt(req.body.master_id);
    const player = getPlayerData(playerId);
    const master = getPlayerData(masterId);
    const myRel = getRelation(playerId);
    const masterRel = getRelation(masterId);

    if (!masterId) return res.json({ success: false, message: '请指定师父ID' });
    if (playerId === masterId) return res.json({ success: false, message: '不能拜自己为师' });
    if (myRel.role) return res.json({ success: false, message: '你已有师徒关系' });

    // 检查徒弟境界
    if (player && player.realmLevel >= MASTER_CONFIG.APPRENTICE_MAX_REALM) {
      return res.json({ success: false, message: `境界达到${MASTER_CONFIG.APPRENTICE_MAX_REALM}阶后无法拜师` });
    }

    // 检查师父是否已达收徒上限
    if (masterRel.apprentices.length >= MASTER_CONFIG.MAX_APPRENTICES) {
      return res.json({ success: false, message: '该师父收徒已达上限' });
    }

    // 添加申请
    if (!applications[masterId]) applications[masterId] = [];
    const exists = applications[masterId].find(a => a.apprenticeId === playerId);
    if (exists) return res.json({ success: false, message: '已提交过申请，请等待' });

    applications[masterId].push({
      apprenticeId: playerId,
      apprenticeName: player?.name || `玩家${playerId}`,
      appliedAt: Date.now(),
    });

    res.json({ success: true, message: '申请已发送，请等待师父回应' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 同意收徒（师父操作）
router.post('/accept', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const apprenticeId = parseInt(req.body.apprentice_id);
    const player = getPlayerData(playerId);
    const apprentice = getPlayerData(apprenticeId);
    const myRel = getRelation(playerId);
    const apprenticeRel = getRelation(apprenticeId);

    if (!apprenticeId) return res.json({ success: false, message: '请指定徒弟ID' });

    // 初始化师父数据
    if (!myRel.role) {
      myRel.role = 'master';
      myRel.joinedAt = Date.now();
    }
    if (myRel.role !== 'master') return res.json({ success: false, message: '你不是师父' });
    if (myRel.apprentices.length >= MASTER_CONFIG.MAX_APPRENTICES) {
      return res.json({ success: false, message: '收徒已达上限' });
    }

    // 建立关系
    myRel.apprentices.push(apprenticeId);
    apprenticeRel.role = 'apprentice';
    apprenticeRel.masterId = playerId;
    apprenticeRel.joinedAt = Date.now();

    // 从申请列表移除
    if (applications[playerId]) {
      applications[playerId] = applications[playerId].filter(a => a.apprenticeId !== apprenticeId);
    }

    res.json({
      success: true,
      message: `成功收 ${apprentice?.name || `玩家${apprenticeId}`} 为徒！`,
      apprentice: { id: apprenticeId, name: apprentice?.name || `玩家${apprenticeId}` },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 拒绝收徒
router.post('/reject', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const apprenticeId = parseInt(req.body.apprentice_id);

    if (!applications[playerId]) {
      return res.json({ success: false, message: '没有待处理的申请' });
    }
    applications[playerId] = applications[playerId].filter(a => a.apprenticeId !== apprenticeId);

    res.json({ success: true, message: '已拒绝申请' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 逐出徒弟
router.post('/expel', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const apprenticeId = parseInt(req.body.apprentice_id);
    const myRel = getRelation(playerId);
    const apprenticeRel = getRelation(apprenticeId);

    if (myRel.role !== 'master') return res.json({ success: false, message: '你不是师父' });

    const idx = myRel.apprentices.indexOf(apprenticeId);
    if (idx < 0) return res.json({ success: false, message: '这不是你的徒弟' });

    myRel.apprentices.splice(idx, 1);
    apprenticeRel.role = null;
    apprenticeRel.masterId = null;

    res.json({ success: true, message: '已逐出徒弟' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 离开师门（徒弟操作）
router.post('/leave', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const myRel = getRelation(playerId);

    if (myRel.role !== 'apprentice' || !myRel.masterId) {
      return res.json({ success: false, message: '你没有师父' });
    }

    const masterRel = getRelation(myRel.masterId);
    if (masterRel) {
      masterRel.apprentices = masterRel.apprentices.filter(id => id !== playerId);
    }

    myRel.role = null;
    myRel.masterId = null;

    res.json({ success: true, message: '已离开师门' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ============ 师徒互动 ============

// 传授功法（师父→徒弟）
router.post('/teach', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const apprenticeId = parseInt(req.body.apprentice_id);
    const myRel = getRelation(playerId);
    const apprenticeRel = getRelation(apprenticeId);

    if (myRel.role !== 'master') return res.json({ success: false, message: '你不是师父' });
    if (!myRel.apprentices.includes(apprenticeId)) return res.json({ success: false, message: '这不是你的徒弟' });

    // 检查CD
    if (Date.now() - myRel.lastTeach < MASTER_CONFIG.TEACH_COOLDOWN) {
      const remaining = Math.ceil((MASTER_CONFIG.TEACH_COOLDOWN - (Date.now() - myRel.lastTeach)) / 60000);
      return res.json({ success: false, message: `还需等待${remaining}分钟才能再次传授` });
    }

    // 执行传授
    myRel.lastTeach = Date.now();
    myRel.teachCount++;
    myRel.reputation = Math.min(100, myRel.reputation + 5);
    apprenticeRel.reputation = Math.min(100, apprenticeRel.reputation + 3);

    // 师徒任务进度
    resetDailyTasks(playerId);
    if (!myRel.completedTasks.tasks.includes('teach')) {
      myRel.completedTasks.tasks.push('teach');
      myRel.contribution += 10;
    }

    const expGain = MASTER_CONFIG.TEACH_EXP;
    res.json({
      success: true,
      message: `传授成功！师父获得 ${expGain} 经验，徒弟获得 ${expGain * 1.5} 经验`,
      expGain,
      reputation: myRel.reputation,
      contribution: myRel.contribution,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 请教功法（徒弟→师父）
router.post('/learn', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const myRel = getRelation(playerId);

    if (myRel.role !== 'apprentice' || !myRel.masterId) {
      return res.json({ success: false, message: '你没有师父' });
    }

    // 检查CD
    if (Date.now() - myRel.lastLearn < MASTER_CONFIG.LEARN_COOLDOWN) {
      const remaining = Math.ceil((MASTER_CONFIG.LEARN_COOLDOWN - (Date.now() - myRel.lastLearn)) / 60000);
      return res.json({ success: false, message: `还需等待${remaining}分钟才能再次请教` });
    }

    // 执行请教
    myRel.lastLearn = Date.now();
    myRel.learnCount++;

    // 师徒任务进度
    resetDailyTasks(playerId);
    if (!myRel.completedTasks.tasks.includes('learn')) {
      myRel.completedTasks.tasks.push('learn');
      myRel.contribution += 10;
    }

    const expGain = MASTER_CONFIG.LEARN_EXP;
    res.json({
      success: true,
      message: `请教成功！获得 ${expGain} 经验和 10 贡献点`,
      expGain,
      contribution: myRel.contribution,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 完成任务（师徒共同副本/交流等）
router.post('/complete-task', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const taskId = req.body.task_id;
    const myRel = getRelation(playerId);

    if (!myRel.role) return res.json({ success: false, message: '你还没有师徒关系' });

    const task = DAILY_TASKS.find(t => t.id === taskId);
    if (!task) return res.json({ success: false, message: '任务不存在' });

    resetDailyTasks(playerId);
    if (myRel.completedTasks.tasks.includes(taskId)) {
      return res.json({ success: false, message: '今日已完成此任务' });
    }

    myRel.completedTasks.tasks.push(taskId);
    myRel.contribution += task.reward_contribution;

    res.json({
      success: true,
      message: `任务完成！获得 ${task.reward_contribution} 贡献点和 ${task.reward_exp} 经验`,
      contribution: myRel.contribution,
      expGain: task.reward_exp,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ============ 师徒任务奖励领取 P85-3 ============

// 领取师徒任务奖励
router.post('/claim-reward', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const taskId = req.body.task_id || req.body.taskId;

    if (!taskId) return res.json({ success: false, message: '缺少 task_id' });

    const myRel = getRelation(playerId);
    const task = DAILY_TASKS.find(t => t.id === taskId);

    if (!task) return res.json({ success: false, message: '任务不存在' });

    // 检查任务是否完成
    resetDailyTasks(playerId);
    if (!myRel.completedTasks.tasks.includes(taskId)) {
      return res.json({ success: false, message: '任务未完成，无法领取奖励' });
    }

    // 检查是否已领取（用奖励key标记）
    const claimedKey = `claimed_${taskId}`;
    if (myRel.completedTasks[claimedKey]) {
      return res.json({ success: false, message: '奖励已领取' });
    }

    // 标记已领取
    myRel.completedTasks[claimedKey] = true;

    // 发放奖励（灵石+贡献点）
    const player = getPlayerData(playerId);
    if (player) {
      player.spiritStones = (player.spiritStones || 1000) + task.reward_contribution;
    }

    // 师徒积分累加
    myRel.contribution = (myRel.contribution || 0) + task.reward_contribution;

    res.json({
      success: true,
      message: `领取成功！获得 ${task.reward_contribution} 贡献点和 ${task.reward_exp} 经验`,
      data: {
        taskId,
        taskName: task.name,
        rewards: {
          contribution: task.reward_contribution,
          lingshi: task.reward_contribution,
          exp: task.reward_exp,
        },
        totalContribution: myRel.contribution,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ============ 传承 ============

// 申请传承（徒弟向师父请求）
router.post('/inherit', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const type = req.body.type;
    const player = getPlayerData(playerId);
    const myRel = getRelation(playerId);

    if (myRel.role !== 'apprentice' || !myRel.masterId) {
      return res.json({ success: false, message: '你没有师父' });
    }

    const inherit = MASTER_CONFIG.INHERITANCE[type];
    if (!inherit) return res.json({ success: false, message: '传承类型不存在' });

    if (player && player.spiritStones < inherit.cost) {
      return res.json({ success: false, message: `需要 ${inherit.cost} 灵石` });
    }

    // 扣除灵石，发放经验
    if (player) player.spiritStones -= inherit.cost;

    const expGain = Math.floor(10000 * inherit.bonus_exp);
    res.json({
      success: true,
      message: `${inherit.name}完成！消耗 ${inherit.cost} 灵石，获得 ${expGain} 经验`,
      expGain,
      cost: inherit.cost,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ============ 贡献商店 ============

// 购买商店物品
router.post('/buy', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const itemId = req.body.item_id;
    const myRel = getRelation(playerId);

    const item = CONTRIBUTION_SHOP.find(i => i.id === itemId);
    if (!item) return res.json({ success: false, message: '物品不存在' });

    if (myRel.contribution < item.cost) {
      return res.json({ success: false, message: `贡献点不足，需要 ${item.cost} 点` });
    }

    myRel.contribution -= item.cost;

    // 根据物品类型发放奖励
    let rewardDesc = '';
    if (item.type === 'title') {
      if (!myRel.titles.includes(item.value)) {
        myRel.titles.push(item.value);
      }
      rewardDesc = `获得称号：${item.name}`;
    } else if (item.type === 'buff') {
      myRel.buffs.push({
        type: item.type,
        value: item.value,
        expiresAt: Date.now() + item.duration * 1000,
      });
      rewardDesc = `获得buff：${item.name}，持续${item.duration / 3600}小时`;
    } else if (item.type === 'exp') {
      rewardDesc = `获得 ${item.value} 经验`;
    } else if (item.type === 'lingshi') {
      const player = getPlayerData(playerId);
      if (player) player.spiritStones += item.value;
      rewardDesc = `获得 ${item.value} 灵石`;
    } else {
      rewardDesc = `购买成功：${item.name}`;
    }

    res.json({
      success: true,
      message: rewardDesc,
      remainingContribution: myRel.contribution,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ============ 辅助接口 ============

// 设置测试玩家数据（开发用）
router.post('/_set-player', (req, res) => {
  try {
    const { player_id, name, realmLevel, level, lingshi, spiritStones } = req.body;
    if (!player_id) return res.json({ success: false, message: '需要 player_id' });

    if (!_players[player_id]) {
      _players[player_id] = { id: player_id };
    }
    _players[player_id] = {
      ..._players[player_id],
      name: name || _players[player_id].name || `玩家${player_id}`,
      realmLevel: realmLevel ?? _players[player_id].realmLevel ?? 1,
      level: level ?? _players[player_id].level ?? 1,
      lingshi: lingshi ?? _players[player_id].lingshi ?? 1000,
      spiritStones: spiritStones ?? _players[player_id].spiritStones ?? 1000,
    };
    res.json({ success: true, player: _players[player_id] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 获取师徒加成
router.get('/bonus', (req, res) => {
  try {
    const playerId = getPlayerId(req);
    const rel = getRelation(playerId);

    let bonus = { spirit_rate: 1, exp_rate: 1, drop_rate: 1 };
    if (rel.role === 'apprentice') {
      const b = MASTER_CONFIG.BONUS.apprentice;
      bonus.spirit_rate = 1 + b.spirit_rate;
      bonus.exp_rate = 1 + b.exp_rate;
      bonus.drop_rate = 1 + b.drop_rate;
    } else if (rel.role === 'master' && rel.apprentices.length > 0) {
      const b = MASTER_CONFIG.BONUS.master;
      const count = Math.min(rel.apprentices.length, 3);
      bonus.spirit_rate = 1 + b.spirit_rate * count;
      bonus.exp_rate = 1 + b.exp_rate * count;
      bonus.drop_rate = 1 + b.drop_rate * count;
    }

    res.json({ success: true, bonus });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
