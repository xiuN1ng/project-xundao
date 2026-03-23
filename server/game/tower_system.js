/**
 * 挂机修仙 - 无尽塔系统
 */

class TowerSystem {
  constructor() {
    this.maxFloor = 100;
  }
  
  // 获取塔信息
  getTowerInfo(player) {
    const towerData = player.tower || { currentFloor: 1, bestFloor: 1, rewards: {} };
    return {
      currentFloor: towerData.currentFloor,
      bestFloor: towerData.bestFloor,
      totalFloors: this.maxFloor
    };
  }
  
  // 获取指定层怪物
  getFloorMonster(floor) {
    const baseHp = 100 * Math.pow(1.15, floor - 1);
    const baseAtk = 10 * Math.pow(1.12, floor - 1);
    const baseDef = 2 * Math.pow(1.1, floor - 1);
    return {
      name: `第${floor}层守护者`,
      hp: Math.floor(baseHp),
      atk: Math.floor(baseAtk),
      def: Math.floor(baseDef),
      exp: Math.floor(50 * Math.pow(1.1, floor - 1)),
      spiritStones: Math.floor(20 * Math.pow(1.08, floor - 1))
    };
  }
  
  // 首次通关奖励
  getFirstClearReward(floor) {
    return {
      spiritStones: Math.floor(100 * Math.pow(1.5, floor / 10)),
      exp: Math.floor(500 * Math.pow(1.3, floor / 10))
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TowerSystem };
}
