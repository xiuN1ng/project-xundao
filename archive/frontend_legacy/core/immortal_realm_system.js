/**
 * 仙界境界系统 - 仙人境界体系
 * 包含：真仙、金仙、大罗金仙等仙界境界
 */

// 仙界境界配置
const IMMORTAL_REALM_DATA = {
  // 凡人界境界
  '凡人': {
    name: '凡人',
    order: 0,
    description: '尚未踏入修仙之路的普通人',
    hp_base: 50,
    atk_base: 5,
    def_base: 0,
    spirit_base: 10,
    spirit_rate: 1,
    realm_bonus: 1.0,
    requirements: { level: 1 },
    icon: '🧑',
    color: '#888888'
  },
  '炼气期': {
    name: '炼气期',
    order: 1,
    description: '吸纳天地灵气，炼化入体',
    hp_base: 80,
    atk_base: 10,
    def_base: 2,
    spirit_base: 20,
    spirit_rate: 2,
    realm_bonus: 1.1,
    requirements: { level: 10 },
    icon: '💨',
    color: '#90EE90'
  },
  '筑基期': {
    name: '筑基期',
    order: 2,
    description: '筑就仙道根基，结成道基',
    hp_base: 120,
    atk_base: 18,
    def_base: 5,
    spirit_base: 35,
    spirit_rate: 4,
    realm_bonus: 1.2,
    requirements: { level: 25 },
    icon: '🏠',
    color: '#32CD32'
  },
  '金丹期': {
    name: '金丹期',
    order: 3,
    description: '凝聚金丹，步入大道',
    hp_base: 180,
    atk_base: 28,
    def_base: 10,
    spirit_base: 60,
    spirit_rate: 6,
    realm_bonus: 1.3,
    requirements: { level: 45 },
    icon: '🔮',
    color: '#FFD700'
  },
  '元婴期': {
    name: '元婴期',
    order: 4,
    description: '元婴出窍，神通广大',
    hp_base: 250,
    atk_base: 40,
    def_base: 18,
    spirit_base: 100,
    spirit_rate: 9,
    realm_bonus: 1.4,
    requirements: { level: 65 },
    icon: '👶',
    color: '#FF69B4'
  },
  '化神期': {
    name: '化神期',
    order: 5,
    description: '化神返虚，掌控天地',
    hp_base: 350,
    atk_base: 55,
    def_base: 28,
    spirit_base: 160,
    spirit_rate: 12,
    realm_bonus: 1.5,
    requirements: { level: 85 },
    icon: '🌀',
    color: '#9370DB'
  },
  '炼虚期': {
    name: '炼虚期',
    order: 6,
    description: '炼虚合道返璞归真',
    hp_base: 480,
    atk_base: 75,
    def_base: 40,
    spirit_base: 250,
    spirit_rate: 16,
    realm_bonus: 1.6,
    requirements: { level: 100, realmLevel: 5 },
    icon: '🌟',
    color: '#8A2BE2'
  },
  '合体期': {
    name: '合体期',
    order: 7,
    description: '天人合一，法力无边',
    hp_base: 650,
    atk_base: 100,
    def_base: 55,
    spirit_base: 380,
    spirit_rate: 22,
    realm_bonus: 1.7,
    requirements: { level: 120, realmLevel: 10 },
    icon: '👼',
    color: '#4B0082'
  },
  '大乘期': {
    name: '大乘期',
    order: 8,
    description: '大乘圆满，飞升在即',
    hp_base: 880,
    atk_base: 135,
    def_base: 75,
    spirit_base: 550,
    spirit_rate: 30,
    realm_bonus: 1.8,
    requirements: { level: 150, realmLevel: 15 },
    icon: '🚀',
    color: '#FF4500'
  },
  
  // 仙界境界
  '真仙': {
    name: '真仙',
    order: 9,
    description: '位列仙班，真灵不灭',
    hp_base: 1200,
    atk_base: 180,
    def_base: 100,
    spirit_base: 800,
    spirit_rate: 45,
    realm_bonus: 2.0,
    requirements: { level: 180, realmLevel: 20, task: '飞升考验' },
    icon: '✨',
    color: '#00FFFF',
    isImmortal: true,
    abilities: [
      { name: '真元护体', description: '受到伤害时减免20%', type: 'passive' },
      { name: '灵气化形', description: '攻击时有10%几率造成双倍伤害', type: 'passive' }
    ],
    title: '真仙',
    subtitle: '位列仙班'
  },
  '金仙': {
    name: '金仙',
    order: 10,
    description: '金身不坏，万劫不磨',
    hp_base: 1800,
    atk_base: 250,
    def_base: 140,
    spirit_base: 1200,
    spirit_rate: 65,
    realm_bonus: 2.3,
    requirements: { level: 220, realmLevel: 30, realm: '真仙', task: '金仙劫' },
    icon: '🌟',
    color: '#FFD700',
    isImmortal: true,
    abilities: [
      { name: '金身不坏', description: '生命值低于30%时，防御提升50%', type: 'passive' },
      { name: '金光大道', description: '修炼效率提升30%', type: 'passive' },
      { name: '金仙法则', description: '所有属性提升15%', type: 'passive' }
    ],
    title: '金仙',
    subtitle: '金身不坏'
  },
  '大罗金仙': {
    name: '大罗金仙',
    order: 11,
    description: '大罗天境，超脱轮回',
    hp_base: 2800,
    atk_base: 350,
    def_base: 200,
    spirit_base: 2000,
    spirit_rate: 100,
    realm_bonus: 2.6,
    requirements: { level: 300, realmLevel: 50, realm: '金仙', task: '大罗劫' },
    icon: '👑',
    color: '#FF1493',
    isImmortal: true,
    abilities: [
      { name: '大罗天眼', description: '可以看到敌人弱点，暴击率提升20%', type: 'passive' },
      { name: '轮回不灭', description: '每分钟恢复5%最大生命值', type: 'passive' },
      { name: '法则领域', description: '战斗时降低敌人30%防御', type: 'passive' },
      { name: '大罗果位', description: '所有属性提升30%', type: 'passive' }
    ],
    title: '大罗金仙',
    subtitle: '超脱轮回'
  },
  '准圣': {
    name: '准圣',
    order: 12,
    description: '半步圣人，神通无量',
    hp_base: 4000,
    atk_base: 480,
    def_base: 280,
    spirit_base: 3000,
    spirit_rate: 150,
    realm_bonus: 3.0,
    requirements: { level: 400, realmLevel: 80, realm: '大罗金仙', task: '斩三尸' },
    icon: '⚡',
    color: '#FF0000',
    isImmortal: true,
    abilities: [
      { name: '准圣法则', description: '所有属性提升50%', type: 'passive' },
      { name: '神通无量', description: '技能伤害提升50%', type: 'passive' }
    ],
    title: '准圣',
    subtitle: '半步圣人'
  },
  '圣人': {
    name: '圣人',
    order: 13,
    description: '万劫不灭，天地同寿',
    hp_base: 8000,
    atk_base: 800,
    def_base: 500,
    spirit_base: 6000,
    spirit_rate: 250,
    realm_bonus: 4.0,
    requirements: { level: 500, realmLevel: 100, realm: '准圣', task: '成圣劫' },
    icon: '🏛️',
    color: '#FFFFFF',
    isImmortal: true,
    abilities: [
      { name: '圣人之体', description: '受到的所有伤害减免50%', type: 'passive' },
      { name: '天地同寿', description: '气血上限提升100%', type: 'passive' },
      { name: '言出法随', description: '攻击时100%触发暴击', type: 'passive' }
    ],
    title: '圣人',
    subtitle: '万劫不灭'
  }
};

// 境界提升要求
const REALM_UPGRADE_REQUIREMENTS = {
  '炼气期': { level: 10, spiritStones: 100, task: null },
  '筑基期': { level: 25, spiritStones: 500, task: null },
  '金丹期': { level: 45, spiritStones: 2000, task: '金丹劫' },
  '元婴期': { level: 65, spiritStones: 8000, task: '元婴劫' },
  '化神期': { level: 85, spiritStones: 30000, task: '化神劫' },
  '炼虚期': { level: 100, spiritStones: 100000, task: '炼虚劫', realmLevel: 5 },
  '合体期': { level: 120, spiritStones: 300000, task: '合体劫', realmLevel: 10 },
  '大乘期': { level: 150, spiritStones: 800000, task: '大乘劫', realmLevel: 15 },
  '真仙': { level: 180, spiritStones: 2000000, task: '飞升考验', realmLevel: 20 },
  '金仙': { level: 220, spiritStones: 5000000, task: '金仙劫', realmLevel: 30 },
  '大罗金仙': { level: 300, spiritStones: 10000000, task: '大罗劫', realmLevel: 50 },
  '准圣': { level: 400, spiritStones: 50000000, task: '斩三尸', realmLevel: 80 },
  '圣人': { level: 500, spiritStones: 100000000, task: '成圣劫', realmLevel: 100 }
};

// 仙界境界系统类
class ImmortalRealmSystem {
  constructor() {
    this.playerData = new Map();
  }
  
  // 获取境界数据
  getRealmData(realmName) {
    return IMMORTAL_REALM_DATA[realmName] || IMMORTAL_REALM_DATA['凡人'];
  }
  
  // 获取所有境界列表
  getAllRealms() {
    return Object.values(IMMORTAL_REALM_DATA).sort((a, b) => a.order - b.order);
  }
  
  // 获取玩家当前境界信息
  getPlayerRealmInfo(playerId) {
    try {
      const db = require('./database');
      const player = db.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
      
      if (!player) return null;
      
      const currentRealm = this.getRealmData(player.realm);
      const nextRealm = this.getNextRealm(player.realm);
      
      // 计算境界经验
      const realmExp = player.realm_exp || 0;
      const realmLevel = player.realm_level || 0;
      
      // 计算升级所需经验
      const expToNextLevel = this.getExpToNextLevel(realmLevel);
      
      return {
        realm: player.realm,
        realmLevel: realmLevel,
        realmExp: realmExp,
        expToNextLevel: expToNextLevel,
        currentRealmData: currentRealm,
        nextRealmData: nextRealm,
        isImmortal: currentRealm.isImmortal || false,
        abilities: currentRealm.abilities || [],
        canAdvance: this.canAdvanceRealm(playerId),
        advanceRequirements: nextRealm ? REALM_UPGRADE_REQUIREMENTS[nextRealm.name] : null
      };
    } catch (e) {
      console.error('获取境界信息失败:', e);
      return null;
    }
  }
  
  // 获取下一境界
  getNextRealm(currentRealm) {
    const current = IMMORTAL_REALM_DATA[currentRealm];
    if (!current) return null;
    
    const allRealms = this.getAllRealms();
    const nextIndex = allRealms.findIndex(r => r.name === currentRealm.name) + 1;
    
    return nextIndex < allRealms.length ? allRealms[nextIndex] : null;
  }
  
  // 获取升级到下一级所需经验
  getExpToNextLevel(currentLevel) {
    return Math.floor(100 * Math.pow(1.5, currentLevel));
  }
  
  // 添加境界经验
  addRealmExp(playerId, amount) {
    try {
      const db = require('./database');
      let player = db.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
      
      if (!player) return { success: false, message: '玩家不存在' };
      
      const currentRealmData = this.getRealmData(player.realm);
      const realmExp = (player.realm_exp || 0) + amount;
      let realmLevel = player.realm_level || 0;
      let leveledUp = false;
      let newLevel = realmLevel;
      
      // 检查升级
      while (realmExp >= this.getExpToNextLevel(realmLevel)) {
        realmLevel++;
        newLevel = realmLevel;
        leveledUp = true;
      }
      
      db.prepare('UPDATE player SET realm_exp = ?, realm_level = ? WHERE id = ?')
        .run(realmExp, realmLevel, playerId);
      
      return {
        success: true,
        realmExp: realmExp,
        realmLevel: realmLevel,
        leveledUp: leveledUp,
        expToNextLevel: this.getExpToNextLevel(realmLevel),
        message: leveledUp ? `境界等级提升到${realmLevel}级！` : `获得${amount}点境界经验`
      };
    } catch (e) {
      console.error('添加境界经验失败:', e);
      return { success: false, message: '系统错误' };
    }
  }
  
  // 检查是否可以突破境界
  canAdvanceRealm(playerId) {
    try {
      const db = require('./database');
      const player = db.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
      
      if (!player) return false;
      
      const nextRealm = this.getNextRealm(player.realm);
      if (!nextRealm) return false;
      
      const req = REALM_UPGRADE_REQUIREMENTS[nextRealm.name];
      if (!req) return false;
      
      // 检查等级
      if (player.level < req.level) return false;
      
      // 检查境界等级
      if (req.realmLevel && (player.realm_level || 0) < req.realmLevel) return false;
      
      // 检查灵石
      if (player.spirit_stones < req.spiritStones) return false;
      
      // 检查是否有任务（渡劫）
      if (req.task) {
        // 需要完成对应任务
        return true; // 前端会处理任务检查
      }
      
      return true;
    } catch (e) {
      return false;
    }
  }
  
  // 突破境界
  advanceRealm(playerId) {
    try {
      const db = require('./database');
      const player = db.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
      
      if (!player) return { success: false, message: '玩家不存在' };
      
      const nextRealm = this.getNextRealm(player.realm);
      if (!nextRealm) return { success: false, message: '已达到最高境界' };
      
      const req = REALM_UPGRADE_REQUIREMENTS[nextRealm.name];
      if (!req) return { success: false, message: '境界配置错误' };
      
      // 检查等级
      if (player.level < req.level) {
        return { success: false, message: `需要达到${req.level}级` };
      }
      
      // 检查境界等级
      if (req.realmLevel && (player.realm_level || 0) < req.realmLevel) {
        return { success: false, message: `需要境界等级达到${req.realmLevel}` };
      }
      
      // 检查灵石
      if (player.spirit_stones < req.spiritStones) {
        return { success: false, message: `需要${req.spiritStones}灵石` };
      }
      
      // 扣除灵石
      db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?')
        .run(req.spiritStones, playerId);
      
      // 更新境界
      db.prepare('UPDATE player SET realm = ?, realm_level = 0, realm_exp = 0 WHERE id = ?')
        .run(nextRealm.name, playerId);
      
      return {
        success: true,
        message: `恭喜突破到${nextRealm.name}！`,
        newRealm: nextRealm.name,
        realmData: nextRealm
      };
    } catch (e) {
      console.error('突破境界失败:', e);
      return { success: false, message: '系统错误' };
    }
  }
  
  // 获取仙界境界排行榜
  getRealmRanking(limit = 100) {
    try {
      const db = require('./database');
      const players = db.prepare(`
        SELECT id, username, realm, realm_level, level 
        FROM player 
        ORDER BY 
          (CASE realm 
            WHEN '圣人' THEN 13
            WHEN '准圣' THEN 12
            WHEN '大罗金仙' THEN 11
            WHEN '金仙' THEN 10
            WHEN '真仙' THEN 9
            WHEN '大乘期' THEN 8
            WHEN '合体期' THEN 7
            WHEN '炼虚期' THEN 6
            WHEN '化神期' THEN 5
            WHEN '元婴期' THEN 4
            WHEN '金丹期' THEN 3
            WHEN '筑基期' THEN 2
            WHEN '炼气期' THEN 1
            ELSE 0
          END) DESC, realm_level DESC
        LIMIT ?
      `).all(limit);
      
      return players.map((p, i) => ({
        rank: i + 1,
        playerId: p.id,
        username: p.username,
        realm: p.realm,
        realmLevel: p.realm_level || 0,
        level: p.level,
        realmData: this.getRealmData(p.realm)
      }));
    } catch (e) {
      console.error('获取境界排行榜失败:', e);
      return [];
    }
  }
}

// 导出
module.exports = {
  ImmortalRealmSystem,
  IMMORTAL_REALM_DATA,
  REALM_UPGRADE_REQUIREMENTS
};
