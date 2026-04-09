/**
 * 奇遇事件服务 (encounter_service.js)
 * 奇遇随机触发、奖励计算、冷却管理
 */

const Logger = {
  info: (...args) => console.log('[encounter:service]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[encounter:service:error]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[encounter:service:warn]', new Date().toISOString(), ...args),
  debug: (...args) => process.env.DEBUG && console.log('[encounter:service:debug]', ...args)
};

// ===== 奇遇类型定义 =====
const ENCOUNTER_TYPES = {
  // 洞天福地
  blessed_grotto: {
    id: 'blessed_grotto',
    name: '洞天福地',
    icon: '🗺️',
    color: '#52c41a',
    description: '发现了一处洞天福地，灵气浓郁！',
    rarity: 'rare', // common, rare, epic, legendary
    baseChance: 0.03,       // 基础触发概率 (3%)
    rewards: [
      { type: 'cultivation', min: 500, max: 2000, weight: 60 },
      { type: 'lingshi', min: 100, max: 500, weight: 30 },
      { type: 'realm_exp', min: 50, max: 200, weight: 10 }
    ],
    cooldownMinutes: 30
  },

  // 上古遗迹
  ancient_ruins: {
    id: 'ancient_ruins',
    name: '上古遗迹',
    icon: '🏛️',
    color: '#722ed1',
    description: '发现了上古仙人留下的遗迹！',
    rarity: 'epic',
    baseChance: 0.015,
    rewards: [
      { type: 'antique', min: 1, max: 1, weight: 50 },
      { type: 'lingshi', min: 300, max: 1000, weight: 30 },
      { type: 'rare_item', min: 1, max: 1, weight: 20 }
    ],
    cooldownMinutes: 60
  },

  // 仙人指路
  immortal_guidance: {
    id: 'immortal_guidance',
    name: '仙人指路',
    icon: '🧙',
    color: '#1890ff',
    description: '仙人显灵，为你指点迷津！',
    rarity: 'legendary',
    baseChance: 0.008,
    rewards: [
      { type: 'comprehension_boost', min: 1, max: 1, weight: 40 },
      { type: 'skill_fragment', min: 1, max: 1, weight: 35 },
      { type: 'realm_exp', min: 200, max: 800, weight: 25 }
    ],
    cooldownMinutes: 120
  },

  // 魔修伏击
  demon_ambush: {
    id: 'demon_ambush',
    name: '魔修伏击',
    icon: '👹',
    color: '#f5222d',
    description: '遭遇魔修伏击！',
    rarity: 'rare',
    baseChance: 0.025,
    requiresBattle: true,
    battleWinRewards: [
      { type: 'cultivation', min: 800, max: 3000, weight: 50 },
      { type: 'lingshi', min: 200, max: 800, weight: 30 },
      { type: 'epic_item', min: 1, max: 1, weight: 20 }
    ],
    battleLosePenalty: [
      { type: 'cultivation', min: -500, max: -200, weight: 60 },
      { type: 'lingshi', min: -200, max: -50, weight: 40 }
    ],
    cooldownMinutes: 45
  },

  // 妖兽护宝
  beast_guard: {
    id: 'beast_guard',
    name: '妖兽护宝',
    icon: '🐉',
    color: '#fa8c16',
    description: '妖兽守护着稀世珍宝！',
    rarity: 'epic',
    baseChance: 0.018,
    requiresBattle: true,
    battleWinRewards: [
      { type: 'rare_material', min: 1, max: 3, weight: 50 },
      { type: 'lingshi', min: 500, max: 1500, weight: 30 },
      { type: 'legendary_fragment', min: 1, max: 1, weight: 20 }
    ],
    cooldownMinutes: 60
  },

  // 药童赠丹
  elixir_gift: {
    id: 'elixir_gift',
    name: '药童赠丹',
    icon: '🧒',
    color: '#52c41a',
    description: '小药童送来了灵丹妙药！',
    rarity: 'common',
    baseChance: 0.04,
    rewards: [
      { type: 'elixir_health', min: 1, max: 3, weight: 50 },
      { type: 'elixir_cultivation', min: 1, max: 2, weight: 35 },
      { type: 'elixir_realm', min: 1, max: 1, weight: 15 }
    ],
    cooldownMinutes: 20
  },

  // 废墟寻宝
  ruins_treasure: {
    id: 'ruins_treasure',
    name: '废墟寻宝',
    icon: '💎',
    color: '#faad14',
    description: '在废墟中发现了隐藏的宝藏！',
    rarity: 'common',
    baseChance: 0.05,
    rewards: [
      { type: 'lingshi', min: 50, max: 300, weight: 45 },
      { type: 'common_item', min: 1, max: 2, weight: 35 },
      { type: 'cultivation', min: 100, max: 500, weight: 20 }
    ],
    cooldownMinutes: 15
  },

  // 天道感应
  heavenly_inspiration: {
    id: 'heavenly_inspiration',
    name: '天道感应',
    icon: '☀️',
    color: '#ffd700',
    description: '天道垂青，灵感涌现！',
    rarity: 'legendary',
    baseChance: 0.006,
    rewards: [
      { type: 'cultivation', min: 1000, max: 5000, weight: 30 },
      { type: 'title', min: 1, max: 1, weight: 20 },
      { type: 'buff_blessing', min: 1, max: 1, weight: 25 },
      { type: 'buff_curse', min: 1, max: 1, weight: 25 }  // 可能是负面buff
    ],
    cooldownMinutes: 180
  }
};

// ===== 稀有度权重配置 =====
const RARITY_WEIGHTS = {
  common: 50,
  rare: 30,
  epic: 15,
  legendary: 5
};

// ===== Buff效果定义 =====
const BUFF_EFFECTS = {
  blessing_of_heaven: {
    name: '天赐福缘',
    description: '接下来1小时，修炼效率+50%',
    durationMinutes: 60,
    effect: { cultivation_speed: 1.5 }
  },
  swift_wind: {
    name: '风驰电掣',
    description: '接下来30分钟，战斗速度+30%',
    durationMinutes: 30,
    effect: { battle_speed: 1.3 }
  },
  spirit_sight: {
    name: '灵眼开启',
    description: '接下来2小时，掉落率+100%',
    durationMinutes: 120,
    effect: { drop_rate: 2.0 }
  },
  cultivation_disruption: {
    name: '灵气紊乱',
    description: '接下来1小时，修炼效率-30%',
    durationMinutes: 60,
    effect: { cultivation_speed: 0.7 }
  },
  bad_luck: {
    name: '时运不济',
    description: '接下来30分钟，所有收益-20%',
    durationMinutes: 30,
    effect: { all_reward_rate: 0.8 }
  }
};

// ===== 称号定义 =====
const TITLES = [
  { id: 'grotto_explorer', name: '洞天探索者', description: '发现洞天福地，获得天赐福缘' },
  { id: 'ruins_scholar', name: '古迹学者', description: '破解上古遗迹，通晓远古秘闻' },
  { id: 'immortal_blessing', name: '仙缘深厚', description: '得仙人指路，悟性大增' },
  { id: 'demon_slayer', name: '降魔勇士', description: '击败魔修，守护一方安宁' },
  { id: 'beast_breaker', name: '屠龙勇士', description: '斩杀妖兽，威震四方' },
  { id: 'treasure_hunter', name: '寻宝猎人', description: '废墟寻宝，满载而归' },
  { id: 'heaven_favored', name: '天选之人', description: '感应天道，运势加身' }
];

// ===== 辅助函数 =====

// 根据稀有度权重随机选择奇遇类型
function selectEncounterType() {
  const weightedTypes = [];
  for (const typeId of Object.keys(ENCOUNTER_TYPES)) {
    const type = ENCOUNTER_TYPES[typeId];
    const weight = RARITY_WEIGHTS[type.rarity] || 10;
    for (let i = 0; i < weight; i++) {
      weightedTypes.push(typeId);
    }
  }
  return weightedTypes[Math.floor(Math.random() * weightedTypes.length)];
}

// 根据权重随机选择奖励
function selectWeightedReward(rewards) {
  const totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0);
  let random = Math.random() * totalWeight;
  for (const reward of rewards) {
    random -= reward.weight;
    if (random <= 0) return reward;
  }
  return rewards[0];
}

// 计算实际奖励值
function calculateReward(rewardDef) {
  const amount = Math.floor(rewardDef.min + Math.random() * (rewardDef.max - rewardDef.min + 1));
  return { type: rewardDef.type, amount, description: getRewardDescription(rewardDef.type, amount) };
}

// 奖励描述
function getRewardDescription(type, amount) {
  const descriptions = {
    cultivation: `修为 +${amount}`,
    lingshi: `灵石 +${amount}`,
    realm_exp: `境界经验 +${amount}`,
    antique: `古董 x${amount}`,
    rare_item: `稀有道具 x${amount}`,
    comprehension_boost: `顿悟体验 x${amount}`,
    skill_fragment: `功法碎片 x${amount}`,
    elixir_health: `疗伤丹 x${amount}`,
    elixir_cultivation: `修炼丹 x${amount}`,
    elixir_realm: `境界丹 x${amount}`,
    common_item: `普通道具 x${amount}`,
    rare_material: `珍稀材料 x${amount}`,
    legendary_fragment: `传说碎片 x${amount}`,
    epic_item: `史诗道具 x${amount}`,
    title: `称号：${TITLES[Math.floor(Math.random() * TITLES.length)].name}`,
    buff_blessing: '获得天赐buff',
    buff_curse: '获得诅咒debuff'
  };
  return descriptions[type] || `${type} x${amount}`;
}

// ===== 数据库表初始化 =====
function initEncounterTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_encounter_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      event_name TEXT NOT NULL,
      rarity TEXT NOT NULL,
      description TEXT,
      rewards TEXT,
      status TEXT DEFAULT 'pending',
      triggered_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT,
      claimed_at TEXT,
      battle_result TEXT,
      INDEX idx_player_status (player_id, status),
      INDEX idx_player_created (player_id, created_at DESC)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS player_encounter_stats (
      player_id INTEGER PRIMARY KEY,
      total_encounters INTEGER DEFAULT 0,
      legendary_count INTEGER DEFAULT 0,
      epic_count INTEGER DEFAULT 0,
      rare_count INTEGER DEFAULT 0,
      common_count INTEGER DEFAULT 0,
      battle_wins INTEGER DEFAULT 0,
      battle_losses INTEGER DEFAULT 0,
      total_rewards_lingshi INTEGER DEFAULT 0,
      total_rewards_cultivation INTEGER DEFAULT 0,
      last_encounter_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS player_encounter_cooldown (
      player_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      last_triggered_at TEXT NOT NULL,
      PRIMARY KEY (player_id, event_type)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS player_encounter_buffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      buff_key TEXT NOT NULL,
      buff_name TEXT NOT NULL,
      description TEXT,
      effect_data TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      INDEX idx_player_buff (player_id, expires_at)
    )
  `);

  Logger.info('奇遇事件表初始化完成');
}

// ===== 核心业务逻辑 =====

// 检查玩家是否在冷却中
function isOnCooldown(db, playerId, eventType) {
  const row = db.prepare(`
    SELECT last_triggered_at FROM player_encounter_cooldown
    WHERE player_id = ? AND event_type = ?
  `).get(playerId, eventType);

  if (!row) return false;

  const type = ENCOUNTER_TYPES[eventType];
  if (!type) return false;

  const lastTime = new Date(row.last_triggered_at).getTime();
  const cooldownMs = type.cooldownMinutes * 60 * 1000;
  return Date.now() - lastTime < cooldownMs;
}

// 设置冷却
function setCooldown(db, playerId, eventType) {
  db.prepare(`
    INSERT OR REPLACE INTO player_encounter_cooldown (player_id, event_type, last_triggered_at)
    VALUES (?, ?, datetime('now'))
  `).run(playerId, eventType);
}

// 获取或创建玩家奇遇统计
function getOrCreateStats(db, playerId) {
  let stats = db.prepare('SELECT * FROM player_encounter_stats WHERE player_id = ?').get(playerId);
  if (!stats) {
    db.prepare(`
      INSERT INTO player_encounter_stats (player_id) VALUES (?)
    `).run(playerId);
    stats = db.prepare('SELECT * FROM player_encounter_stats WHERE player_id = ?').get(playerId);
  }
  return stats;
}

// 更新统计
function updateStats(db, playerId, eventType, rewards, battleResult) {
  const rarity = ENCOUNTER_TYPES[eventType]?.rarity || 'common';
  const statIncr = `
    UPDATE player_encounter_stats SET
      total_encounters = total_encounters + 1,
      ${rarity}_count = ${rarity}_count + 1,
      last_encounter_at = datetime('now'),
      updated_at = datetime('now')
  `;

  if (battleResult === 'win') {
    db.prepare(statIncr + ', battle_wins = battle_wins + 1').run(playerId);
  } else if (battleResult === 'lose') {
    db.prepare(statIncr + ', battle_losses = battle_losses + 1').run(playerId);
  } else {
    db.prepare(statIncr).run(playerId);
  }

  // 累加奖励
  if (rewards) {
    for (const r of rewards) {
      if (r.type === 'lingshi') {
        db.prepare('UPDATE player_encounter_stats SET total_rewards_lingshi = total_rewards_lingshi + ? WHERE player_id = ?').run(r.amount, playerId);
      }
      if (r.type === 'cultivation') {
        db.prepare('UPDATE player_encounter_stats SET total_rewards_cultivation = total_rewards_cultivation + ? WHERE player_id = ?').run(r.amount, playerId);
      }
    }
  }
}

// 触发奇遇检查
function checkAndTriggerEncounter(db, playerId, triggerContext = {}) {
  const { realm = 1, cultivation_speed = 1, drop_rate = 1, all_reward_rate = 1 } = triggerContext;

  // 查找活跃的待领取奇遇
  const activeEvent = db.prepare(`
    SELECT * FROM player_encounter_events
    WHERE player_id = ? AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > datetime('now'))
    ORDER BY created_at DESC LIMIT 1
  `).get(playerId);

  if (activeEvent) {
    return {
      triggered: false,
      hasActiveEvent: true,
      activeEvent: formatEvent(activeEvent)
    };
  }

  // 计算综合触发概率
  let totalChance = 0;
  const availableTypes = [];

  for (const typeId of Object.keys(ENCOUNTER_TYPES)) {
    const type = ENCOUNTER_TYPES[typeId];
    if (!isOnCooldown(db, playerId, typeId)) {
      // 境界加成：境界越高触发稀有奇遇概率略高
      const realmBonus = 1 + (realm - 1) * 0.05;
      const chance = type.baseChance * realmBonus * (all_reward_rate || 1);
      totalChance += chance;
      availableTypes.push({ typeId, chance, type });
    }
  }

  // 随机判定
  if (Math.random() > totalChance) {
    return { triggered: false, hasActiveEvent: false };
  }

  // 加权选择奇遇类型
  let roll = Math.random() * totalChance;
  let selectedType = availableTypes[0];
  for (const item of availableTypes) {
    roll -= item.chance;
    if (roll <= 0) {
      selectedType = item;
      break;
    }
  }

  const type = selectedType.type;
  const rewards = generateRewards(type, { cultivation_speed, drop_rate });

  // 创建事件记录
  const result = db.prepare(`
    INSERT INTO player_encounter_events
    (player_id, event_type, event_name, rarity, description, rewards, status, triggered_by, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+1 hour'))
  `).run(
    playerId,
    type.id,
    type.name,
    type.rarity,
    type.description,
    JSON.stringify(rewards),
    type.requiresBattle ? 'pending_battle' : 'pending'
  );

  setCooldown(db, playerId, type.id);
  updateStats(db, playerId, type.id, rewards, null);

  const event = db.prepare('SELECT * FROM player_encounter_events WHERE id = ?').get(result.lastInsertRowid);

  return {
    triggered: true,
    hasActiveEvent: false,
    event: formatEvent(event),
    encounterType: type
  };
}

// 生成奖励
function generateRewards(type, context = {}) {
  const rewards = [];
  const { cultivation_speed = 1, drop_rate = 1 } = context;

  const rewardPool = type.rewards || type.battleWinRewards || [];
  for (const rewardDef of rewardPool) {
    const amount = Math.floor(
      (rewardDef.min + Math.random() * (rewardDef.max - rewardDef.min + 1)) *
      (rewardDef.type === 'cultivation' ? cultivation_speed :
       rewardDef.type === 'lingshi' ? drop_rate : 1)
    );
    rewards.push({
      type: rewardDef.type,
      amount,
      description: getRewardDescription(rewardDef.type, amount)
    });
  }

  return rewards;
}

// 格式化事件
function formatEvent(event) {
  if (!event) return null;
  return {
    id: event.id,
    type: event.event_type,
    name: event.event_name,
    rarity: event.rarity,
    description: event.description,
    rewards: event.rewards ? JSON.parse(event.rewards) : [],
    status: event.status,
    battleResult: event.battle_result,
    createdAt: event.created_at,
    expiresAt: event.expires_at
  };
}

// 处理战斗事件结果
function resolveBattleEvent(db, playerId, battleWon) {
  const event = db.prepare(`
    SELECT * FROM player_encounter_events
    WHERE player_id = ? AND status = 'pending_battle'
    AND expires_at > datetime('now')
    ORDER BY created_at DESC LIMIT 1
  `).get(playerId);

  if (!event) {
    return { success: false, error: '没有待战斗的奇遇事件' };
  }

  const type = ENCOUNTER_TYPES[event.event_type];
  let rewards = [];

  if (battleWon) {
    rewards = generateRewards(type, {});
    db.prepare(`UPDATE player_encounter_events SET status = 'pending', battle_result = 'win', rewards = ? WHERE id = ?`)
      .run(JSON.stringify(rewards), event.id);
    updateStats(db, playerId, event.event_type, rewards, 'win');
  } else {
    // 失败惩罚
    rewards = type.battleLosePenalty.map(p => {
      const amount = Math.floor(p.min + Math.random() * (p.max - p.min));
      return { type: p.type, amount, description: getRewardDescription(p.type, amount) };
    });
    db.prepare(`UPDATE player_encounter_events SET status = 'pending', battle_result = 'lose', rewards = ? WHERE id = ?`)
      .run(JSON.stringify(rewards), event.id);
    updateStats(db, playerId, event.event_type, rewards, 'lose');
  }

  return { success: true, event: formatEvent(event), rewards };
}

// 领取奖励
function claimRewards(db, playerId) {
  const event = db.prepare(`
    SELECT * FROM player_encounter_events
    WHERE player_id = ? AND status = 'pending'
    AND expires_at > datetime('now')
    ORDER BY created_at DESC LIMIT 1
  `).get(playerId);

  if (!event) {
    return { success: false, error: '没有可领取的奇遇奖励' };
  }

  db.prepare(`UPDATE player_encounter_events SET status = 'claimed', claimed_at = datetime('now') WHERE id = ?`)
    .run(event.id);

  return {
    success: true,
    event: formatEvent(event),
    rewards: event.rewards ? JSON.parse(event.rewards) : []
  };
}

// 获取玩家奇遇状态
function getEncounterStatus(db, playerId) {
  // 检查活跃事件
  const activeEvent = db.prepare(`
    SELECT * FROM player_encounter_events
    WHERE player_id = ? AND status IN ('pending', 'pending_battle')
    AND expires_at > datetime('now')
    ORDER BY created_at DESC LIMIT 1
  `).get(playerId);

  // 各类型冷却信息
  const cooldowns = {};
  for (const typeId of Object.keys(ENCOUNTER_TYPES)) {
    const row = db.prepare(`
      SELECT last_triggered_at FROM player_encounter_cooldown
      WHERE player_id = ? AND event_type = ?
    `).get(playerId, typeId);

    if (row) {
      const type = ENCOUNTER_TYPES[typeId];
      const elapsed = Date.now() - new Date(row.last_triggered_at).getTime();
      const remaining = Math.max(0, type.cooldownMinutes * 60000 - elapsed);
      cooldowns[typeId] = {
        onCooldown: remaining > 0,
        remainingMs: remaining,
        remainingMinutes: Math.ceil(remaining / 60000)
      };
    } else {
      cooldowns[typeId] = { onCooldown: false, remainingMs: 0, remainingMinutes: 0 };
    }
  }

  // 获取活跃buff
  const buffs = db.prepare(`
    SELECT * FROM player_encounter_buffs
    WHERE player_id = ? AND expires_at > datetime('now')
    ORDER BY created_at DESC
  `).all(playerId);

  return {
    activeEvent: activeEvent ? formatEvent(activeEvent) : null,
    cooldowns,
    buffs: buffs.map(b => ({
      id: b.id,
      key: b.buff_key,
      name: b.buff_name,
      description: b.description,
      expiresAt: b.expires_at
    }))
  };
}

// 获取历史记录
function getEncounterHistory(db, playerId, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;

  const events = db.prepare(`
    SELECT * FROM player_encounter_events
    WHERE player_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(playerId, pageSize, offset);

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM player_encounter_events WHERE player_id = ?
  `).get(playerId).count;

  const stats = getOrCreateStats(db, playerId);

  return {
    events: events.map(formatEvent),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    },
    stats: {
      totalEncunters: stats.total_encounters,
      legendaryCount: stats.legendary_count,
      epicCount: stats.epic_count,
      rareCount: stats.rare_count,
      commonCount: stats.common_count,
      battleWins: stats.battle_wins,
      battleLosses: stats.battle_losses,
      totalLingshi: stats.total_rewards_lingshi,
      totalCultivation: stats.total_rewards_cultivation,
      lastEncounterAt: stats.last_encounter_at
    }
  };
}

// 应用buff效果
function applyBuff(db, playerId, reward) {
  if (reward.type === 'buff_blessing') {
    const buffKeys = ['blessing_of_heaven', 'swift_wind', 'spirit_sight'];
    const key = buffKeys[Math.floor(Math.random() * buffKeys.length)];
    const buff = BUFF_EFFECTS[key];
    db.prepare(`
      INSERT INTO player_encounter_buffs (player_id, buff_key, buff_name, description, effect_data, expires_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', '+' || ? || ' minutes'))
    `).run(playerId, key, buff.name, buff.description, JSON.stringify(buff.effect), buff.durationMinutes);
    return { buffKey: key, ...buff };
  }
  if (reward.type === 'buff_curse') {
    const buffKeys = ['cultivation_disruption', 'bad_luck'];
    const key = buffKeys[Math.floor(Math.random() * buffKeys.length)];
    const buff = BUFF_EFFECTS[key];
    db.prepare(`
      INSERT INTO player_encounter_buffs (player_id, buff_key, buff_name, description, effect_data, expires_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', '+' || ? || ' minutes'))
    `).run(playerId, key, buff.name, buff.description, JSON.stringify(buff.effect), buff.durationMinutes);
    return { buffKey: key, ...buff };
  }
  return null;
}

// 获取可用奇遇类型列表（供前端展示）
function getEncounterTypesList() {
  return Object.values(ENCOUNTER_TYPES).map(type => ({
    id: type.id,
    name: type.name,
    icon: type.icon,
    color: type.color,
    description: type.description,
    rarity: type.rarity,
    cooldownMinutes: type.cooldownMinutes,
    hasBattle: !!type.requiresBattle
  }));
}

module.exports = {
  initEncounterTables,
  checkAndTriggerEncounter,
  resolveBattleEvent,
  claimRewards,
  getEncounterStatus,
  getEncounterHistory,
  getEncounterTypesList,
  applyBuff,
  ENCOUNTER_TYPES,
  BUFF_EFFECTS,
  TITLES
};
