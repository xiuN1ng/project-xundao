/**
 * 随机事件系统 v1.0
 * P52-4: 剧情/任务系统扩充 - 随机事件系统 + 委托任务自动刷新
 */

const RANDOM_EVENTS = {
  // ============ 事件类型 ============
  event_types: ['blessing', 'curse', 'discovery', 'encounter', 'test', 'treasure'],

  // ============ 事件池 ============
  events: [
    // ===  blessings (好事) ===
    {
      id: 'blessing_1', type: 'blessing', name: '仙缘降临',
      desc: '天降祥瑞，你感到修为大增！',
      weight: 15,
      duration: 3600, // 秒
      effect: { exp_boost: 0.50, message: '修炼经验+50%（持续1小时）' },
      icon: '✨', color: '#FFD700'
    },
    {
      id: 'blessing_2', type: 'blessing', name: '灵泉涌现',
      desc: '意外发现一处灵泉，灵气充沛！',
      instant: { spirit: 500, hp: 0.3 },
      effect: { spirit_rate_boost: 0.30, message: '灵气获取+30%（持续2小时）' },
      icon: '💧', color: '#00CED1', duration: 7200
    },
    {
      id: 'blessing_3', type: 'blessing', name: '顿悟',
      desc: '一朝顿悟，功法运行如有神助！',
      instant: { exp: 1000 },
      effect: { cultivation_speed: 1.0, message: '修炼速度翻倍（持续30分钟）' },
      icon: '🧘', color: '#9370DB', duration: 1800
    },
    {
      id: 'blessing_4', type: 'blessing', name: '灵兽亲近',
      desc: '一只灵兽主动靠近你，似乎对你颇有好感',
      instant: { pet_charm: 10 },
      effect: { pet_loyalty_boost: 0.20, message: '灵兽好感度+20%（持续3小时）' },
      icon: '🐉', color: '#32CD32', duration: 10800
    },
    {
      id: 'blessing_5', type: 'blessing', name: '炼器成功',
      desc: '今日炼器如有神助，成功率大幅提升！',
      effect: { forge_success_rate: 0.30, message: '锻造成功率+30%（持续2小时）' },
      icon: '🔨', color: '#FF8C00', duration: 7200
    },
    // === curses (坏事) ===
    {
      id: 'curse_1', type: 'curse', name: '心魔入侵',
      desc: '心魔趁虚而入，修为受到干扰...',
      effect: { exp_boost: -0.30, message: '修炼经验-30%（持续1小时）' },
      icon: '👹', color: '#8B0000', duration: 3600
    },
    {
      id: 'curse_2', type: 'curse', name: '灵气逆流',
      desc: '体内灵气紊乱，需要时间调整...',
      effect: { spirit_rate_boost: -0.50, message: '灵气获取-50%（持续2小时）' },
      icon: '🌀', color: '#4B0082', duration: 7200
    },
    {
      id: 'curse_3', type: 'curse', name: '破财消灾',
      desc: '遇到劫修，被迫交出一部分灵石...',
      instant: { stones: -500 },
      effect: null,
      icon: '💸', color: '#B22222', duration: 0
    },
    {
      id: 'curse_4', type: 'curse', name: '装备受损',
      desc: '遭遇意外，装备耐久度下降...',
      instant: { equipment_durability: -20 },
      effect: null,
      icon: '⚠️', color: '#A9A9A9', duration: 0
    },
    // === discoveries (探索发现) ===
    {
      id: 'discovery_1', type: 'discovery', name: '古修遗址',
      desc: '在野外发现一处古代修士的遗址！',
      choices: [
        { id: 'explore', text: '深入探索', outcome: { exp: 2000, chance: { rare_item: 0.15 } }, risk: { damage: 0.2, bad_event: 0.1 } },
        { id: 'safe', text: '安全撤离', outcome: { exp: 300 }, risk: null }
      ],
      icon: '🏛️', color: '#DAA520'
    },
    {
      id: 'discovery_2', type: 'discovery', name: '灵草园',
      desc: '发现一片野生灵草园！',
      choices: [
        { id: 'harvest', text: '采摘灵草', outcome: { items: [{ id: 'spirit_grass', count: 5 }], exp: 500 }, risk: { poison: 0.2 } },
        { id: 'plant', text: '留下一半', outcome: { items: [{ id: 'spirit_grass', count: 2 }], exp: 200, future_blessing: true }, risk: null }
      ],
      icon: '🌿', color: '#228B22'
    },
    {
      id: 'discovery_3', type: 'discovery', name: '陨铁碎片',
      desc: '天空坠落一块陨铁，蕴含奇异能量',
      choices: [
        { id: 'forge', text: '用于锻造', outcome: { atk_boost_temp: 0.15, duration: 3600 }, risk: null },
        { id: 'sell', text: '卖给商人', outcome: { stones: 2000 }, risk: null }
      ],
      icon: '☄️', color: '#FF4500'
    },
    {
      id: 'discovery_4', type: 'discovery', name: '迷途修士',
      desc: '遇到一位迷路的低阶修士，他似乎需要帮助',
      choices: [
        { id: 'guide', text: '指引方向', outcome: { reputation: 50, exp: 800 }, risk: null },
        { id: 'ignore', text: '不予理会', outcome: { reputation: -20 }, risk: null }
      ],
      icon: '🧑‍🎓', color: '#87CEEB'
    },
    // === encounters (遭遇) ===
    {
      id: 'encounter_1', type: 'encounter', name: '神秘商人',
      desc: '一位神秘的行商向你招手，货物看起来颇为不凡',
      choices: [
        { id: 'buy', text: '购买商品', outcome: { items: [{ id: 'mystery_box', count: 1 }], stones: -1000 }, risk: { nothing: 0.3 } },
        { id: 'browse', text: '只是看看', outcome: { info: '获得了市场情报' }, risk: null }
      ],
      icon: '🧙', color: '#9400D3'
    },
    {
      id: 'encounter_2', type: 'encounter', name: '灵兽受伤',
      desc: '一只幼年灵兽倒在路边，似乎受了重伤',
      choices: [
        { id: 'heal', text: '救助灵兽', outcome: { pet_loyalty: 30, exp: 500 }, risk: null },
        { id: 'catch', text: '趁机捕捉', outcome: { chance: { pet: 0.4 } }, risk: { reputation: -50 } }
      ],
      icon: '🐾', color: '#FF69B4'
    },
    {
      id: 'encounter_3', type: 'encounter', name: '天劫云',
      desc: '远处天空聚集起天劫云，似乎有人在渡劫',
      choices: [
        { id: 'observe', text: '远观感悟', outcome: { exp: 1000, cultivation_insight: true }, risk: null },
        { id: 'approach', text: '靠近查看', outcome: { exp: 2000, chance: { tribulation_insight: 0.3 } }, risk: { lightning_damage: 0.15 } }
      ],
      icon: '⛈️', color: '#483D8B'
    },
    {
      id: 'encounter_4', type: 'encounter', name: '宗门招新',
      desc: '路过一个宗门的招新会场，他们正在招揽弟子',
      choices: [
        { id: 'join', text: '加入宗门', outcome: { sect_reputation: 100, exp: 500 }, risk: { current_sect_loyalty: -50 } },
        { id: 'decline', text: '婉言谢绝', outcome: { reputation: 20 }, risk: null }
      ],
      icon: '🏯', color: '#8A2BE2'
    },
    // === tests (试炼) ===
    {
      id: 'test_1', type: 'test', name: '心魔试炼',
      desc: '你的内心出现幻象，必须做出选择...',
      choices: [
        { id: 'face', text: '直面心魔', outcome: { willpower: 20, exp: 1500 }, risk: { spirit: -200 } },
        { id: 'avoid', text: '回避幻象', outcome: { spirit: 100 }, risk: { exp: -500 } }
      ],
      icon: '🌀', color: '#800080', duration: 0
    },
    {
      id: 'test_2', type: 'test', name: '悟道考验',
      desc: '道心考验：面对诱惑，你如何选择？',
      choices: [
        { id: 'resist', text: '坚守道心', outcome: { dao_heart: 30, exp: 2000 }, risk: null },
        { id: 'accept', text: '接受诱惑', outcome: { exp: 500, spirit: 300, dao_heart: -20 }, risk: null }
      ],
      icon: '⚖️', color: '#DAA520', duration: 0
    },
    // === treasures (宝物) ===
    {
      id: 'treasure_1', type: 'treasure', name: '秘境入口',
      desc: '空间波动中，你发现了一个隐秘的秘境入口！',
      choices: [
        { id: 'enter', text: '进入秘境', outcome: { exp: 3000, items: [{ id: 'rare_treasure', chance: 0.5 }] }, risk: { hp_loss: 0.3, trap: 0.2 } },
        { id: 'mark', text: '标记位置', outcome: { location_saved: true, exp: 200 }, risk: null }
      ],
      icon: '🕳️', color: '#006400'
    },
    {
      id: 'treasure_2', type: 'treasure', name: '宝箱',
      desc: '在路边发现一个落满灰尘的宝箱',
      choices: [
        { id: 'open', text: '打开宝箱', outcome: { stones: 1000, chance: { good_item: 0.4, great_item: 0.1 } }, risk: { trap: 0.15 } },
        { id: 'careful', text: '谨慎开启', outcome: { stones: 500 }, risk: null }
      ],
      icon: '📦', color: '#DAA520'
    },
    {
      id: 'treasure_3', type: 'treasure', name: '遗失传承',
      desc: '一处古迹中传来传承波动...',
      choices: [
        { id: 'accept', text: '接受传承', outcome: { skill_fragment: 1, exp: 2500 }, risk: { realm_confusion: 0.1 } },
        { id: 'study', text: '研读碑文', outcome: { exp: 1000, comprehension: 20 }, risk: null }
      ],
      icon: '📜', color: '#8B4513'
    }
  ],

  // ============ 触发概率配置 ============
  trigger: {
    base_chance: 0.05,        // 基础触发概率5%（每次登录/每隔时间）
    min_interval: 300,         // 最小间隔5分钟
    max_per_day: 5,            // 每天最多5个随机事件
    boss_zone_boost: 1.5,     // BOSS区域触发概率+50%
    dungeon_boost: 1.2        // 副本内触发概率+20%
  }
};

// ==================== 委托任务系统 ====================

const COMMISSION_TASKS = {
  // ============ 任务模板 ============
  templates: [
    // 日常委托
    { id: 'c_1', type: 'daily', name: '采集灵草', desc: '采集10株灵草', target: 10, targetType: 'gather', reward: { stones: 200, exp: 100 }, duration: 3600 },
    { id: 'c_2', type: 'daily', name: '击败妖兽', desc: '击败10只妖兽', target: 10, targetType: 'kill_monster', reward: { stones: 300, exp: 150 }, duration: 3600 },
    { id: 'c_3', type: 'daily', name: '炼制丹药', desc: '成功炼制3炉丹药', target: 3, targetType: 'alchemy', reward: { stones: 250, exp: 120 }, duration: 3600 },
    { id: 'c_4', type: 'daily', name: '参加竞技', desc: '参与3场竞技', target: 3, targetType: 'arena', reward: { stones: 200, exp: 100 }, duration: 3600 },
    { id: 'c_5', type: 'daily', name: '宗门任务', desc: '完成5个宗门任务', target: 5, targetType: 'sect_task', reward: { stones: 400, exp: 200 }, duration: 7200 },
    // 挑战委托
    { id: 'c_6', type: 'challenge', name: '通天塔主', desc: '通关20层通天塔', target: 20, targetType: 'tower_floor', reward: { stones: 1000, exp: 500, item: 'tower_key' }, duration: 14400 },
    { id: 'c_7', type: 'challenge', name: '天劫试炼', desc: '成功渡劫1次', target: 1, targetType: 'tribulation', reward: { stones: 800, exp: 400 }, duration: 14400 },
    { id: 'c_8', type: 'challenge', name: '深渊探险', desc: '通关深渊副本3次', target: 3, targetType: 'abyss_dungeon', reward: { stones: 1200, exp: 600, item: 'abyss_key' }, duration: 14400 },
    // 周常委托
    { id: 'c_9', type: 'weekly', name: '副本达人', desc: '通关50次副本', target: 50, targetType: 'dungeon_complete', reward: { stones: 5000, exp: 2000, item: 'rare_box' }, duration: 259200 },
    { id: 'c_10', type: 'weekly', name: '天梯竞技', desc: '参与30场天梯', target: 30, targetType: 'ladder_match', reward: { stones: 4000, exp: 1500 }, duration: 259200 },
    { id: 'c_11', type: 'weekly', name: '炼器大师', desc: '成功锻造20件装备', target: 20, targetType: 'forge', reward: { stones: 3000, exp: 1200, item: 'forge_ticket' }, duration: 259200 }
  ],

  // ============ 自动刷新配置 ============
  auto_refresh: {
    daily: { interval_hours: 24, refresh_time: '04:00', reset_on_refresh: true },
    challenge: { interval_hours: 12, max_challenge: 3 },
    weekly: { interval_hours: 168, day_of_week: 0, reset_on_refresh: true }
  },

  // ============ 刷新规则 ============
  refresh_rules: {
    // 等级区间解锁
    level_unlock: {
      1: ['c_1', 'c_2', 'c_3', 'c_4'],
      10: ['c_5', 'c_6'],
      20: ['c_7', 'c_8'],
      30: ['c_9', 'c_10', 'c_11']
    },
    // 委托数量上限
    max_active: {
      daily: 5,
      challenge: 3,
      weekly: 3
    }
  }
};

// ==================== 核心函数 ====================

/**
 * 触发随机事件
 */
function triggerRandomEvent(playerData) {
  const cfg = RANDOM_EVENTS.trigger;
  const now = new Date();

  // 检查每日上限
  const today = now.toISOString().split('T')[0];
  const todayEvents = (playerData.daily_events || []).filter(e => e.date === today);
  if (todayEvents.length >= cfg.max_per_day) return null;

  // 基础概率（简化版）
  const baseChance = cfg.base_chance;
  if (Math.random() > baseChance) return null;

  // 加权随机选择事件
  const totalWeight = RANDOM_EVENTS.events.reduce((sum, e) => sum + e.weight, 0);
  let r = Math.random() * totalWeight;
  let selected = RANDOM_EVENTS.events[0];

  for (const event of RANDOM_EVENTS.events) {
    r -= event.weight;
    if (r <= 0) { selected = event; break; }
  }

  const eventData = {
    eventId: selected.id,
    name: selected.name,
    desc: selected.desc,
    type: selected.type,
    icon: selected.icon,
    color: selected.color,
    choices: selected.choices || null,
    triggeredAt: now.toISOString(),
    expiresAt: selected.duration ? new Date(now.getTime() + selected.duration * 1000).toISOString() : null,
    completed: false,
    choiceMade: null
  };

  // 记录到玩家数据
  if (!playerData.active_events) playerData.active_events = [];
  playerData.active_events.push(eventData);
  if (!playerData.daily_events) playerData.daily_events = [];
  playerData.daily_events.push({ date: today, eventId: selected.id });

  return eventData;
}

/**
 * 处理事件选择结果
 */
function resolveEventChoice(playerData, eventId, choiceId) {
  const event = (playerData.active_events || []).find(e => e.eventId === eventId && !e.completed);
  if (!event) return { success: false, message: '事件不存在或已完成' };

  const original = RANDOM_EVENTS.events.find(e => e.id === eventId);
  if (!original) return { success: false, message: '事件配置不存在' };

  const choice = original.choices?.find(c => c.id === choiceId);
  if (!choice) return { success: false, message: '无效的选择' };

  // 计算结果
  const outcome = { ...choice.outcome };
  const risk = choice.risk ? { ...choice.risk } : null;
  const result = { outcome, risk, effects: [] };

  // 处理即时效果
  if (original.instant) {
    for (const [key, val] of Object.entries(original.instant)) {
      if (key === 'stones') {
        playerData.stones = (playerData.stones || 0) + val;
        result.effects.push({ type: 'stones', value: val });
      }
      if (key === 'exp') {
        playerData.exp = (playerData.exp || 0) + val;
        result.effects.push({ type: 'exp', value: val });
      }
      if (key === 'spirit') {
        playerData.spirit = (playerData.spirit || 0) + val;
        result.effects.push({ type: 'spirit', value: val });
      }
      if (key === 'hp') {
        const hpChange = Math.floor((playerData.max_hp || 1000) * val);
        playerData.hp = Math.min(playerData.max_hp || 1000, (playerData.hp || 1000) + hpChange);
        result.effects.push({ type: 'hp', value: hpChange });
      }
    }
  }

  // 处理持续效果
  if (original.effect) {
    if (!playerData.active_buffs) playerData.active_buffs = [];
    if (original.effect.exp_boost) {
      playerData.active_buffs.push({
        id: `event_${eventId}`,
        stat: 'exp_boost',
        value: original.effect.exp_boost,
        name: original.name,
        icon: original.icon,
        expiresAt: event.expiresAt
      });
      result.effects.push({ type: 'buff', desc: original.effect.message });
    }
    // ... 其他持续效果类似
  }

  // 风险判定
  if (risk) {
    for (const [riskKey, prob] of Object.entries(risk)) {
      if (Math.random() < prob) {
        // 触发风险
        switch (riskKey) {
          case 'damage': result.effects.push({ type: 'damage', value: Math.floor((playerData.max_hp || 1000) * 0.2) }); break;
          case 'trap': result.effects.push({ type: 'debuff', name: '陷阱', duration: 300 }); break;
          case 'poison': result.effects.push({ type: 'debuff', name: '中毒', duration: 600 }); break;
        }
      }
    }
  }

  event.completed = true;
  event.choiceMade = choiceId;
  event.result = result;

  return { success: true, event, result };
}

/**
 * 生成当日委托任务
 */
function generateDailyCommissions(playerData) {
  const level = playerData.level || 1;
  const cfg = COMMISSION_TASKS;
  const maxDaily = cfg.refresh_rules.max_active.daily;
  
  // 解锁的任务模板
  const unlockedTemplates = [];
  for (const [minLevel, templateIds] of Object.entries(cfg.refresh_rules.level_unlock)) {
    if (level >= parseInt(minLevel)) {
      unlockedTemplates.push(...templateIds);
    }
  }

  // 随机选择
  const selected = [];
  const available = cfg.templates.filter(t => unlockedTemplates.includes(t.id) && t.type === 'daily');
  while (selected.length < maxDaily && available.length > 0) {
    const idx = Math.floor(Math.random() * available.length);
    selected.push({ ...available.splice(idx, 1)[0], progress: 0, completed: false, claimed: false, assignedAt: new Date().toISOString() });
  }

  return selected;
}

/**
 * 检查委托任务进度
 */
function checkCommissionProgress(playerData, taskId, currentProgress) {
  const task = COMMISSION_TASKS.templates.find(t => t.id === taskId);
  if (!task) return { updated: false, completed: false };

  const newProgress = Math.min(task.target, currentProgress + 1);
  const completed = newProgress >= task.target;

  return { updated: true, progress: newProgress, completed };
}

/**
 * 获取委托刷新时间
 */
function getNextCommissionRefresh(playerData, type = 'daily') {
  const cfg = COMMISSION_TASKS.auto_refresh[type];
  if (!cfg) return null;

  const now = new Date();
  const [hour, minute] = cfg.refresh_time.split(':').map(Number);
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  return next.toISOString();
}

module.exports = {
  RANDOM_EVENTS,
  COMMISSION_TASKS,
  triggerRandomEvent,
  resolveEventChoice,
  generateDailyCommissions,
  checkCommissionProgress,
  getNextCommissionRefresh
};
