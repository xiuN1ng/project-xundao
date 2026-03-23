/**
 * 炼丹系统 v1.0
 * 炼制丹药、灵药
 */

// 丹药类型
const ALCHEMY_PILL_TYPES = {
  PILL: 'pill',      // 丹药
  ELIXIR: 'elixir'   // 灵药
};

// 丹方配置
const FORMULA_DATA = {
  // ========== 丹药 ==========
  'blood_pill': {
    id: 'blood_pill',
    name: '气血丹',
    type: ALCHEMY_PILL_TYPES.PILL,
    description: '恢复100点气血',
    materials: { herb: 2 },
    effect: { type: 'heal_hp', value: 100 },
    successRate: 0.9,
    icon: '🩸'
  },
  'spirit_pill': {
    id: 'spirit_pill',
    name: '灵气丹',
    type: ALCHEMY_PILL_TYPES.PILL,
    description: '恢复200点灵气',
    materials: { herb: 3 },
    effect: { type: 'heal_spirit', value: 200 },
    successRate: 0.8,
    icon: '💨'
  },
  'exp_pill': {
    id: 'exp_pill',
    name: '经验丹',
    type: ALCHEMY_PILL_TYPES.PILL,
    description: '获得1000点经验',
    materials: { herb: 5 },
    effect: { type: 'gain_exp', value: 1000 },
    successRate: 0.7,
    icon: '📈'
  },
  'realm_break_pill': {
    id: 'realm_break_pill',
    name: '突破丹',
    type: ALCHEMY_PILL_TYPES.PILL,
    description: '突破当前境界',
    materials: { herb: 8 },
    effect: { type: 'realm_break', value: 1 },
    successRate: 0.5,
    icon: '⚡'
  },
  
  // ========== 灵药 ==========
  'spirit_elixir': {
    id: 'spirit_elixir',
    name: '灵气灵药',
    type: ALCHEMY_PILL_TYPES.ELIXIR,
    description: '大幅恢复灵气',
    materials: { herb: 10 },
    effect: { type: 'heal_spirit', value: 500 },
    successRate: 0.6,
    icon: '🧪'
  },
  'golden_elixir': {
    id: 'golden_elixir',
    name: '金灵药',
    type: ALCHEMY_PILL_TYPES.ELIXIR,
    description: '获得大量经验',
    materials: { herb: 15 },
    effect: { type: 'gain_exp', value: 5000 },
    successRate: 0.5,
    icon: '✨'
  }
};

/**
 * 炼丹系统类
 */
class AlchemySystem {
  constructor() {
    this.formulas = FORMULA_DATA;
  }

  // 初始化炼丹系统状态
  init() {
    if (!gameState.alchemy) {
      gameState.alchemy = {
        pills: {},           // 玩家拥有的丹药 { pillId: count }
        totalCrafted: 0,     // 累计炼制次数
        totalSuccess: 0,    // 累计成功次数
        totalUsed: 0         // 累计使用次数
      };
    }
  }

  // 获取所有丹方
  getFormulas() {
    return Object.values(this.formulas);
  }

  // 根据类型获取丹方
  getFormulasByType(type) {
    return Object.values(this.formulas).filter(f => f.type === type);
  }

  // 获取单个丹方
  getFormula(pillId) {
    return this.formulas[pillId] || null;
  }

  // 获取玩家拥有的所有丹药
  getPlayerPills() {
    const pills = gameState.alchemy?.pills || {};
    const result = [];
    for (const [pillId, count] of Object.entries(pills)) {
      if (count > 0) {
        const formula = this.getFormula(pillId);
        if (formula) {
          result.push({
            pillId,
            name: formula.name,
            icon: formula.icon,
            description: formula.description,
            count,
            type: formula.type,
            effect: formula.effect
          });
        }
      }
    }
    return result;
  }

  // 检查是否拥有指定丹药
  hasPill(pillId) {
    const pills = gameState.alchemy?.pills || {};
    return (pills[pillId] || 0) > 0;
  }

  // 获取指定丹药数量
  getPillCount(pillId) {
    const pills = gameState.alchemy?.pills || {};
    return pills[pillId] || 0;
  }

  // 检查材料是否足够
  canCraft(pillId) {
    const formula = this.getFormula(pillId);
    if (!formula) {
      return { canCraft: false, message: '丹方不存在' };
    }

    const herbs = gameState.cave?.resources?.herbs || 0;
    const requiredHerbs = formula.materials.herb || 0;

    if (herbs < requiredHerbs) {
      return { 
        canCraft: false, 
        message: `药材不足，需要${requiredHerbs}个药材，当前只有${herbs}个` 
      };
    }

    return { 
      canCraft: true, 
      message: '材料充足，可以炼制',
      materials: formula.materials
    };
  }

  // 炼丹
  craft(pillId) {
    const formula = this.getFormula(pillId);
    if (!formula) {
      return { success: false, message: '丹方不存在' };
    }

    // 检查材料
    const check = this.canCraft(pillId);
    if (!check.canCraft) {
      return { success: false, message: check.message };
    }

    // 消耗材料
    const requiredHerbs = formula.materials.herb || 0;
    gameState.cave.resources.herbs -= requiredHerbs;

    // 记录炼制次数
    gameState.alchemy.totalCrafted = (gameState.alchemy.totalCrafted || 0) + 1;

    // 计算成功率
    const roll = Math.random();
    const success = roll < formula.successRate;

    if (success) {
      // 炼制成功，添加丹药
      if (!gameState.alchemy.pills[pillId]) {
        gameState.alchemy.pills[pillId] = 0;
      }
      gameState.alchemy.pills[pillId] += 1;
      gameState.alchemy.totalSuccess = (gameState.alchemy.totalSuccess || 0) + 1;

      return {
        success: true,
        message: `炼制成功！获得${formula.icon}${formula.name}`,
        pillId,
        pillName: formula.name,
        pillIcon: formula.icon
      };
    } else {
      // 炼制失败
      return {
        success: false,
        message: `炼制失败...消耗了${requiredHerbs}个药材`,
        pillId,
        pillName: formula.name
      };
    }
  }

  // 使用丹药
  usePill(pillId) {
    const formula = this.getFormula(pillId);
    if (!formula) {
      return { success: false, message: '丹药不存在' };
    }

    const pills = gameState.alchemy?.pills || {};
    const count = pills[pillId] || 0;

    if (count <= 0) {
      return { success: false, message: '没有该丹药' };
    }

    const player = gameState.player;
    const effect = formula.effect;
    let effectResult = {};

    // 应用效果
    switch (effect.type) {
      case 'heal_hp':
        const healAmount = Math.min(effect.value, player.maxHp - player.hp);
        player.hp += healAmount;
        effectResult = { type: 'heal_hp', amount: healAmount };
        break;

      case 'heal_spirit':
        const spiritAmount = Math.min(effect.value, player.maxSpirit - player.spirit);
        player.spirit += spiritAmount;
        effectResult = { type: 'heal_spirit', amount: spiritAmount };
        break;

      case 'gain_exp':
        const expAmount = effect.value;
        this._gainExperience(expAmount);
        effectResult = { type: 'gain_exp', amount: expAmount };
        break;

      case 'realm_break':
        // 突破境界
        const breakResult = this._attemptRealmBreak();
        effectResult = breakResult;
        if (!breakResult.success) {
          // 如果突破失败，返还丹药
          return breakResult;
        }
        break;

      default:
        return { success: false, message: '未知效果类型' };
    }

    // 消耗丹药
    gameState.alchemy.pills[pillId] -= 1;
    gameState.alchemy.totalUsed = (gameState.alchemy.totalUsed || 0) + 1;

    return {
      success: true,
      message: `使用${formula.icon}${formula.name}成功！`,
      effect: effectResult,
      pillName: formula.name,
      pillIcon: formula.icon
    };
  }

  // 获得经验（内部方法）
  _gainExperience(amount) {
    const player = gameState.player;
    const stats = this._getPlayerStats();
    
    // 应用经验加成
    const expBonus = 1 + (stats.exp_bonus || 0);
    const finalExp = Math.floor(amount * expBonus);
    
    player.experience += finalExp;
    
    // 境界加成
    const realmBonus = REALM_DATA[player.realm]?.exp_bonus || 1;
    const totalExp = Math.floor(finalExp * realmBonus);
    
    // 检查升级
    while (player.experience >= player.requiredExp) {
      player.experience -= player.requiredExp;
      player.level += 1;
      player.requiredExp = Math.floor(player.requiredExp * 1.2);
      
      // 升级奖励
      const hpBonus = Math.floor(player.level * 5);
      player.maxHp += hpBonus;
      player.hp = Math.min(player.hp + hpBonus, player.maxHp);
      player.atk += 2;
    }
  }

  // 尝试突破境界（内部方法）
  _attemptRealmBreak() {
    const player = gameState.player;
    const realms = Object.keys(REALM_DATA);
    const currentIdx = realms.indexOf(player.realm);
    
    if (currentIdx >= realms.length - 1) {
      return { success: false, message: '已达最高境界' };
    }

    // 检查是否满足突破条件
    const currentRealm = REALM_DATA[player.realm];
    const requiredLevel = currentRealm.break_level || player.level * 2;
    
    if (player.level < requiredLevel) {
      return { 
        success: false, 
        message: `等级不足，需要${requiredLevel}级，当前${player.level}级` 
      };
    }

    // 执行突破
    const nextRealm = realms[currentIdx + 1];
    player.realm = nextRealm;
    player.realmLevel += 1;
    gameState.stats.realmBreaks = (gameState.stats.realmBreaks || 0) + 1;

    // 突破奖励
    const realmData = REALM_DATA[nextRealm];
    player.maxHp = realmData.hp_base;
    player.hp = player.maxHp;
    player.maxSpirit = realmData.spirit_base;
    player.spirit = player.maxSpirit;
    player.atk = realmData.atk_base;
    player.def = realmData.def_base;

    return {
      success: true,
      message: `突破成功！境界提升至${nextRealm}`,
      newRealm: nextRealm
    };
  }

  // 获取玩家属性（内部方法）
  _getPlayerStats() {
    if (window.game && game.calculatePlayerStats) {
      return game.calculatePlayerStats();
    }
    return {};
  }

  // 获取炼丹统计
  getStats() {
    return {
      totalCrafted: gameState.alchemy?.totalCrafted || 0,
      totalSuccess: gameState.alchemy?.totalSuccess || 0,
      totalUsed: gameState.alchemy?.totalUsed || 0,
      successRate: gameState.alchemy?.totalCrafted > 0 
        ? ((gameState.alchemy.totalSuccess / gameState.alchemy.totalCrafted) * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  // 获取丹方列表（供前端显示）
  getFormulaList() {
    return this.getFormulas().map(f => ({
      id: f.id,
      name: f.name,
      type: f.type,
      icon: f.icon,
      description: f.description,
      materials: f.materials,
      successRate: Math.round(f.successRate * 100) + '%',
      effect: f.effect
    }));
  }
}

// 创建全局实例
let alchemySystem;

function getAlchemySystem() {
  if (!alchemySystem) {
    alchemySystem = new AlchemySystem();
  }
  return alchemySystem;
}

// 导出供游戏主类使用
window.AlchemySystem = AlchemySystem;
window.getAlchemySystem = getAlchemySystem;
