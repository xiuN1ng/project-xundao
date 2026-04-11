/**
 * 经济系统平衡 v1.0
 * P52-5: 灵石通货膨胀控制 + 稀有材料产出调控 + 交易行价格区间设定
 */

const ECONOMY_BALANCE = {
  // ============ 灵石通货膨胀控制 ============
  lingshi_control: {
    // 每日灵石自然通胀率（产出>消耗时）
    daily_inflation_rate: 0.002,    // 0.2% 每日
    // 通胀阈值：当日产出灵石超过此值时触发控制
    inflation_threshold_daily: 1000000,
    // 消耗补贴：当灵石持有超限时，强制消耗途径
    forced_sinks: {
      repair_equipment: { min_cost: 100, rate: 0.01 },      // 装备维修（1%/件）
      auction_fees: 0.05,                                   // 拍卖手续费5%
      upgrade_fail_cost: { base: 500, scaling: 0.1 },      // 升级失败消耗
      trade_tax: 0.03,                                      // 交易税3%
      guild_donate_min: 1000                                 // 宗门捐献下限
    },
    // 超发控制：每场战斗/副本的基础灵石产出上限
    combat_reward_cap: {
      normal_dungeon: 500,
      hard_dungeon: 2000,
      boss: 10000,
      arena_win: 300,
      ladder_win: 500
    },
    // 每日灵石上限（超出后无法获得）
    daily_lingshi_cap: 50000
  },

  // ============ 稀有材料产出调控 ============
  material_control: {
    // BOSS掉落稀有材料概率上限
    boss_drop_rates: {
      common: 0.40,
      rare: 0.20,
      epic: 0.08,
      legendary: 0.02
    },
    // 每日个人掉落上限
    personal_daily_caps: {
      rare: 10,
      epic: 3,
      legendary: 1
    },
    // 稀有材料合成配方（消耗控制）
    synthesis_recipes: {
      'rare_fragment': { count: 10, output: 'rare_material', rate: 0.8 },
      'epic_fragment': { count: 10, output: 'epic_material', rate: 0.6 },
      'legendary_fragment': { count: 10, output: 'legendary_material', rate: 0.4 }
    },
    // 副本掉落表（按等级区间）
    dungeon_drops_by_level: {
      // level_range: { common_rate, rare_rate, epic_rate, legendary_rate, avg_materials_per_clear }
      '1-20':   { common: 0.8, rare: 0.15, epic: 0.02, legendary: 0, avg: 2 },
      '21-40':  { common: 0.7, rare: 0.25, epic: 0.05, legendary: 0.005, avg: 3 },
      '41-60':  { common: 0.6, rare: 0.30, epic: 0.08, legendary: 0.01, avg: 4 },
      '61-80':  { common: 0.5, rare: 0.35, epic: 0.12, legendary: 0.02, avg: 5 },
      '81-100': { common: 0.4, rare: 0.38, epic: 0.18, legendary: 0.03, avg: 6 }
    },
    // 世界BOSS掉落（全球每日上限）
    worldboss_global_cap: {
      rare: 500,
      epic: 100,
      legendary: 10
    }
  },

  // ============ 交易行价格区间 ============
  market_control: {
    // 基础价格区间（按物品等级）
    price_ranges: {
      // common: { min: 10, max: 500, avg: 50 }
      common: { min: 10, max: 500, avg: 50 },
      rare: { min: 200, max: 5000, avg: 1000 },
      epic: { min: 2000, max: 50000, avg: 15000 },
      legendary: { min: 20000, max: 500000, avg: 100000 },
      artifact: { min: 100000, max: 5000000, avg: 1000000 }
    },
    // 挂单费用（防止刷挂单）
    listing_fee_rate: 0.01,          // 挂单价格1%手续费
    listing_fee_min: 50,
    listing_fee_max: 5000,
    // 交易税
    transaction_tax: 0.05,           // 成交价5%税
    // 价格波动控制（防止炒作）
    price_volatility: {
      daily_change_limit: 0.20,    // 单日价格波动不超过20%
      weekly_change_limit: 0.50,    // 单周价格波动不超过50%
      price_stabilize_threshold: 0.10  // 偏离均价10%内稳定
    },
    // 最低/最高挂单价
    min_listing_price: 10,
    max_listing_price: 10000000,
    // 自动调整机制
    auto_adjust: {
      enabled: true,
      // 当某物品超过X个挂单时，自动调整参考价
      oversupply_threshold: 50,
      // 参考价调整幅度
      reference_adjust_rate: 0.05
    }
  },

  // ============ 灵石产出计算（新版） ============
  // 基于玩家等级和活动的动态产出
  dynamic_rewards: {
    // 副本基础产出（根据玩家等级缩放）
    dungeon_base: {
      exp_mult: 1.0,    // 经验倍率
      lingshi_mult: 1.0, // 灵石倍率（可调控）
      material_mult: 1.0  // 材料倍率
    },
    // 玩家等级修正（高等级玩家获得更多灵石）
    level_scaling: {
      dungeon: { lingshi: 'linear', exp: 'diminishing' },
      pvp: { lingshi: 'slight_increase' },
      quest: { lingshi: 'flat', exp: 'diminishing' }
    },
    // 每周灵石总量控制
    weekly_global_cap: 100000000,   // 全服每周灵石新增上限
    weekly_enforce: true
  }
};

// ==================== 核心函数 ====================

/**
 * 计算副本灵石产出（带通胀控制）
 */
function calculateDungeonReward(playerLevel, dungeonLevel, difficulty, isFirstClear = false) {
  const baseReward = ECONOMY_BALANCE.lingshi_control.combat_reward_cap;
  const dungeonTier = dungeonLevel <= 20 ? 'normal' : dungeonLevel <= 50 ? 'hard' : 'boss';
  
  let reward = baseReward[dungeonTier] || baseReward.normal_dungeon;
  
  // 等级差修正（超出副本等级差过多则减少）
  const levelDiff = playerLevel - dungeonLevel;
  if (levelDiff > 10) {
    reward *= Math.max(0.3, 1 - (levelDiff - 10) * 0.05);
  } else if (levelDiff < -5) {
    reward *= 0.8; // 碾压副本降低奖励
  }
  
  // 难度加成
  const diffMult = { normal: 1, hard: 2.5, nightmare: 5 };
  reward *= (diffMult[difficulty] || 1);
  
  // 首通奖励
  if (isFirstClear) reward *= 3;
  
  // 全服每日cap
  reward = Math.min(reward, ECONOMY_BALANCE.lingshi_control.daily_lingshi_cap);
  
  return Math.floor(reward);
}

/**
 * 计算玩家每日灵石获取上限
 */
function getDailyLingshiCap(playerLevel, vipLevel = 0) {
  const base = ECONOMY_BALANCE.lingshi_control.daily_lingshi_cap;
  const vipBonus = 1 + vipLevel * 0.1;
  const levelBonus = 1 + Math.floor(playerLevel / 10) * 0.05;
  return Math.floor(base * vipBonus * levelBonus);
}

/**
 * 获取物品的建议交易价格
 */
function getSuggestedPrice(itemRarity, itemType, marketData = null) {
  const range = ECONOMY_BALANCE.market_control.price_ranges[itemRarity];
  if (!range) return { min: 10, max: 100, suggested: 50 };

  let suggested = range.avg;

  // 如果有市场数据，基于实际成交价调整
  if (marketData) {
    const { recentAvg, volume } = marketData;
    if (volume > 10) {
      // 加权平均：50%市场数据 + 50%基础
      suggested = suggested * 0.5 + recentAvg * 0.5;
    }
    // 偏离度修正
    const deviation = Math.abs(suggested - recentAvg) / recentAvg;
    if (deviation > ECONOMY_BALANCE.market_control.price_volatility.daily_change_limit) {
      suggested = recentAvg * (1 + Math.sign(suggested - recentAvg) * ECONOMY_BALANCE.market_control.price_volatility.daily_change_limit);
    }
  }

  return {
    min: range.min,
    max: range.max,
    suggested: Math.floor(suggested)
  };
}

/**
 * 验证交易价格是否合法
 */
function validateListingPrice(price, itemRarity) {
  const range = ECONOMY_BALANCE.market_control.price_ranges[itemRarity];
  if (!range) return { valid: false, reason: '未知物品稀有度' };

  if (price < ECONOMY_BALANCE.market_control.min_listing_price) {
    return { valid: false, reason: `价格不能低于${ECONOMY_BALANCE.market_control.min_listing_price}` };
  }
  if (price > ECONOMY_BALANCE.market_control.max_listing_price) {
    return { valid: false, reason: `价格不能超过${ECONOMY_BALANCE.market_control.max_listing_price}` };
  }
  if (price > range.max * 5) {
    return { valid: false, reason: `价格偏离市场价过多，建议不超过${range.max * 3}` };
  }

  return { valid: true };
}

/**
 * 计算挂单手续费
 */
function calculateListingFee(price) {
  const cfg = ECONOMY_BALANCE.market_control;
  const fee = Math.floor(price * cfg.listing_fee_rate);
  return Math.max(cfg.listing_fee_min, Math.min(cfg.listing_fee_max, fee));
}

/**
 * 计算交易税（卖家实收）
 */
function calculateTransactionTax(price) {
  const tax = Math.floor(price * ECONOMY_BALANCE.market_control.transaction_tax);
  return { tax, sellerReceives: price - tax };
}

/**
 * 获取材料掉落数量（带个人cap）
 */
function rollMaterialDrops(playerLevel, dungeonLevel, materialType) {
  const cfg = ECONOMY_BALANCE.material_control;
  
  // 确定等级区间
  let bracket = '1-20';
  if (dungeonLevel > 80) bracket = '81-100';
  else if (dungeonLevel > 60) bracket = '61-80';
  else if (dungeonLevel > 40) bracket = '41-60';
  else if (dungeonLevel > 20) bracket = '21-40';
  
  const dropConfig = cfg.dungeon_drops_by_level[bracket];
  const rates = {
    common: dropConfig.common,
    rare: dropConfig.rare,
    epic: dropConfig.epic,
    legendary: dropConfig.legendary
  };

  const result = { common: 0, rare: 0, epic: 0, legendary: 0 };
  
  // 独立判定每个格子
  const slots = Math.floor(dropConfig.avg);
  for (let i = 0; i < slots; i++) {
    const roll = Math.random();
    let cumulative = 0;
    for (const [rarity, rate] of Object.entries(rates)) {
      cumulative += rate;
      if (roll < cumulative) {
        // 检查个人cap
        const cap = cfg.personal_daily_caps[rarity];
        if (cap) {
          // 需要传入玩家的当日获取量，这里返回上限
          result[rarity]++;
          break;
        } else {
          result[rarity]++;
          break;
        }
      }
    }
  }

  return result;
}

/**
 * 计算灵石通胀指数（用于UI显示）
 */
function calculateInflationIndex(gameState) {
  const totalLingshiInCirculation = gameState.total_lingshi_supply || 0;
  const totalPlayers = gameState.active_players || 1;
  const avgLingshi = totalLingshiInCirculation / totalPlayers;
  
  // 基准线（游戏设计时的平均值）
  const baselineAvg = 50000;
  
  const index = avgLingshi / baselineAvg;
  
  // 指数>1表示通胀，<1表示通缩
  let status = 'normal';
  if (index > 1.5) status = 'high_inflation';
  else if (index > 1.2) status = 'mild_inflation';
  else if (index < 0.5) status = 'deflation';
  else if (index < 0.8) status = 'mild_deflation';
  
  return {
    index: parseFloat(index.toFixed(2)),
    avgLingshi: Math.floor(avgLingshi),
    baselineAvg,
    status,
    description: getInflationDescription(status)
  };
}

function getInflationDescription(status) {
  const desc = {
    high_inflation: '⚠️ 灵石大幅贬值，建议增加消耗途径',
    mild_inflation: '📈 灵石轻微贬值，可适当参与活动',
    normal: '✅ 经济运行平稳',
    mild_deflation: '📉 灵石轻微升值，积累灵石是好时机',
    deflation: '💎 灵石大幅升值，经济偏紧缩'
  };
  return desc[status] || desc.normal;
}

/**
 * 推荐消耗项目（帮助玩家消耗多余灵石）
 */
function getRecommendedSinks(playerLevel, playerLingshi) {
  const cap = getDailyLingshiCap(playerLevel);
  const excess = playerLingshi - cap;
  if (excess <= 0) return [];

  const sinks = [
    { name: '装备强化', desc: '提升战斗力', priority: 1, estimated_cost: Math.min(excess, 5000) },
    { name: '拍卖行', desc: '购买稀有物品', priority: 2, estimated_cost: Math.min(excess, 20000) },
    { name: '宗门捐献', desc: '提升宗门贡献', priority: 3, estimated_cost: Math.min(excess, 10000) },
    { name: '丹药炼制', desc: '提升修炼效率', priority: 4, estimated_cost: Math.min(excess, 3000) },
    { name: '灵兽培养', desc: '提升灵兽战力', priority: 5, estimated_cost: Math.min(excess, 8000) }
  ];

  return sinks.filter(s => s.estimated_cost > 0);
}

module.exports = {
  ECONOMY_BALANCE,
  calculateDungeonReward,
  getDailyLingshiCap,
  getSuggestedPrice,
  validateListingPrice,
  calculateListingFee,
  calculateTransactionTax,
  rollMaterialDrops,
  calculateInflationIndex,
  getRecommendedSinks
};
