/**
 * 挂机修仙 - 阵营系统
 */

class FactionSystem {
  constructor() {
    // 四大阵营
    this.factions = {
      '道': { 
        name: '道', 
        color: '#00bfff',
        bonus: { atk: 0.1, def: 0.05 },
        desc: '天道正统，浩然正气'
      },
      '魔': { 
        name: '魔', 
        color: '#ff4500',
        bonus: { atk: 0.15, def: 0 },
        desc: '逆天改命，战天斗地'
      },
      '妖': { 
        name: '妖', 
        color: '#9370db',
        bonus: { atk: 0.05, def: 0.1 },
        desc: '万物有灵，妖修大道'
      },
      '佛': { 
        name: '佛', 
        color: '#ffd700',
        bonus: { atk: 0, def: 0.15 },
        desc: '慈悲为怀，普度众生'
      }
    };
    
    // 阵营任务
    this.quests = {
      '道': [
        { id: 'dao_1', name: '斩妖除魔', reward: 100, exp: 50 },
        { id: 'dao_2', name: '维护正义', reward: 150, exp: 80 }
      ],
      '魔': [
        { id: 'mo_1', name: '挑战强者', reward: 120, exp: 60 },
        { id: 'mo_2', name: '夺取资源', reward: 180, exp: 100 }
      ],
      '妖': [
        { id: 'yao_1', name: '采集灵草', reward: 80, exp: 40 },
        { id: 'yao_2', name: '驯化灵兽', reward: 160, exp: 90 }
      ],
      '佛': [
        { id: 'fo_1', name: '诵经祈福', reward: 100, exp: 50 },
        { id: 'fo_2', name: '渡化众生', reward: 200, exp: 120 }
      ]
    };
  }
  
  // 选择阵营
  chooseFaction(player, faction) {
    if (this.factions[faction]) {
      player.faction = faction;
      return { success: true, message: `选择阵营: ${faction}` };
    }
    return { success: false, message: '无效阵营' };
  }
  
  // 获取阵营加成
  getFactionBonus(player) {
    const faction = player.faction;
    if (!faction || !this.factions[faction]) return { atk: 0, def: 0 };
    return this.factions[faction].bonus;
  }
  
  // 获取阵营任务
  getFactionQuests(player) {
    const faction = player.faction || '道';
    return this.quests[faction] || [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FactionSystem };
}
