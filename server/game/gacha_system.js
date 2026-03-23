/**
 * 挂机修仙 - 抽卡/抽奖系统
 */

class GachaSystem {
  constructor() {
    // 卡池
    this.pools = {
      'equipment': {
        name: '装备池',
        cost: 100,
        items: [
          { id: 'weapon_rare', name: '精品武器', rate: 0.05, quality: 'purple' },
          { id: 'weapon_epic', name: '史诗武器', rate: 0.01, quality: 'orange' },
          { id: 'armor_rare', name: '精品防具', rate: 0.08, quality: 'purple' }
        ]
      },
      'spirit': {
        name: '器灵池',
        cost: 200,
        items: [
          { id: 'spirit_rare', name: '精品器灵', rate: 0.03, quality: 'orange' },
          { id: 'spirit_epic', name: '史诗器灵', rate: 0.005, quality: 'red' }
        ]
      },
      'potion': {
        name: '丹药池',
        cost: 50,
        items: [
          { id: 'pill_gold', name: '金色丹药', rate: 0.02 },
          { id: 'pill_purple', name: '紫色丹药', rate: 0.08 }
        ]
      }
    };
  }
  
  // 单抽
  draw(player, poolId, count = 1) {
    const pool = this.pools[poolId];
    if (!pool) return { success: false, message: '无效卡池' };
    const cost = pool.cost * count;
    if (player.spiritStones < cost) return { success: false, message: '灵石不足' };
    
    player.spiritStones -= cost;
    const results = [];
    for (let i = 0; i < count; i++) {
      const rand = Math.random();
      let cumulative = 0;
      for (const item of pool.items) {
        cumulative += item.rate;
        if (rand < cumulative) {
          results.push(item);
          break;
        }
      }
    }
    return { success: true, results };
  }
  
  // 十连抽（保底）
  draw10(player, poolId) {
    const result = this.draw(player, poolId, 10);
    if (!result.success) return result;
    // 保底：至少1个紫色
    const hasPurple = result.results.some(r => r.quality === 'purple' || r.quality === 'orange');
    if (!hasPurple) {
      result.results[0] = pool.items.find(i => i.quality === 'purple') || result.results[0];
    }
    return result;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GachaSystem };
}
