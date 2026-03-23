/**
 * 挂机修仙 - 数值平衡配置 v3.2
 * 优化版数值配置
 */

const BALANCE_CONFIG = {
  // ==================== 灵石掉落配置 ====================
  stone_drop: {
    // 战斗掉落概率：0.1 -> 0.3 (10% -> 30%)
    battle_win_rate: 0.3,
    // 基础掉落数量
    base_min: 5,
    base_max: 20,
    // 等级加成
    level_bonus: 2, // 每级+2
    // 境界加成
    realm_bonus: 10 // 每阶+10
  },

  // ==================== 灵气获取配置 ====================
  spirit_gain: {
    // 挂机基础速率
    idle_base: 5,
    // 升级加成
    level_bonus: 1, // 每级+1
    // 境界加成
    realm_bonus: 2 // 每阶+2
  },

  // ==================== 副本掉落配置 ====================
  dungeon_drop: {
    // 灵石掉落
    stone_min: 50,
    stone_max: 200,
    // 经验掉落
    exp_min: 100,
    exp_max: 500,
    // 物品掉落概率
    item_rate: 0.2
  },

  // ==================== 每日任务奖励倍率 ====================
  daily_task_multiplier: 3.0, // 3倍奖励

  // ==================== 境界后期封顶 ====================
  realm_cap: {
    // 第99阶后转化道韵
    enabled: true,
    // 转化比例
    daoyun_ratio: 0.1, // 10%溢出转化为道韵
    // 道韵用途
    daoyun_usage: ['artifact_enhance', 'realm_break', 'special_summon']
  }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BALANCE_CONFIG };
}
