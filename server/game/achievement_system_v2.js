/**
 * 挂机修仙 - 成就系统v2
 */

class AchievementSystemV2 {
  constructor() {
    this.achievements = {
      'first_realm': { name: '初入仙途', desc: '首次突破境界', reward: 100 },
      'realm_10': { name: '小有所成', desc: '突破到第10阶', reward: 500 },
      'realm_50': { name: '登堂入室', desc: '突破到第50阶', reward: 2000 },
      'fight_100': { name: '百战百胜', desc: '战斗100次', reward: 300 },
      'kill_1000': { name: '除魔卫道', desc: '击败1000个怪物', reward: 500 },
      'collect_10000': { name: '日进斗金', desc: '累计获得10000灵石', reward: 800 }
    };
  }
  
  getAchievements(player) {
    const achieved = player.achievements || [];
    return Object.entries(this.achievements).map(([id, data]) => ({
      id, ...data, completed: achieved.includes(id)
    }));
  }
  
  checkAndGrant(player) {
    // 自动检查成就
    const achieved = player.achievements || [];
    const newAchievements = [];
    // TODO: 根据玩家状态检查成就
    return newAchievements;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AchievementSystemV2 };
}
