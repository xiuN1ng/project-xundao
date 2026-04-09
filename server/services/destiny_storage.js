/**
 * 命格系统存储层
 * 天道轮回·命格系统
 * 
 * 命格类型:
 * - 天煞系(攻击) - 凶星
 * - 地煞系(防御) - 吉星
 * - 人皇系(生命) - 人道
 * - 修罗系(暴击) - 霸道
 * - 天人道(均衡) - 天人合一
 */

const STORAGE_KEY = 'destiny_system';

// 命格稀有度
const RARITY = {
  N: { name: '凡品', color: '#9E9E9E', exp_required: 0, upgrade_multiplier: 1 },
  R: { name: '上品', color: '#4CAF50', exp_required: 0, upgrade_multiplier: 1.2 },
  SR: { name: '极品', color: '#2196F3', exp_required: 0, upgrade_multiplier: 1.5 },
  SSR: { name: '天命', color: '#9C27B0', exp_required: 0, upgrade_multiplier: 2 },
  UR: { name: '太初', color: '#FF5722', exp_required: 0, upgrade_multiplier: 3 }
};

// 命格分类配置
const DESTINY_CATEGORIES = {
  天煞: {
    name: '天煞系',
    desc: '凶星高照，攻击无双',
    color: '#F44336',
    bgColor: 'rgba(244,67,54,0.1)',
    icon: '⚔️',
    main_attr: 'attack',
    attrs: ['attack', 'crit_damage', 'pvp_damage']
  },
  地煞: {
    name: '地煞系',
    desc: '地煞护体，万法不侵',
    color: '#3F51B5',
    bgColor: 'rgba(63,81,181,0.1)',
    icon: '🛡️',
    main_attr: 'defense',
    attrs: ['defense', 'damage_reduction', 'pvp_defense']
  },
  人皇: {
    name: '人皇系',
    desc: '人道昌盛，生生不息',
    color: '#FF9800',
    bgColor: 'rgba(255,152,0,0.1)',
    icon: '👑',
    main_attr: 'hp',
    attrs: ['hp', 'hp_regen', 'defense']
  },
  修罗: {
    name: '修罗系',
    desc: '修罗之道，一击必杀',
    color: '#E91E63',
    bgColor: 'rgba(233,30,99,0.1)',
    icon: '💀',
    main_attr: 'crit_rate',
    attrs: ['crit_rate', 'crit_damage', 'attack']
  },
  天人: {
    name: '天人道',
    desc: '天人合一，道法自然',
    color: '#00BCD4',
    bgColor: 'rgba(0,188,212,0.1)',
    icon: '☯️',
    main_attr: 'all',
    attrs: ['attack', 'defense', 'hp', 'crit_rate']
  }
};

// 命格碎片定义 (可抽取的命格)
const DESTINY_SHARDS = [
  // 天煞系
  { id: 'tiansha_1', name: '破军碎片', category: '天煞', rarity: 'N', icon: '⚔️', desc: '破军星碎片，攻击+50', base_attrs: { attack: 50 }, skills: [] },
  { id: 'tiansha_2', name: '七杀碎片', category: '天煞', rarity: 'R', icon: '⚔️', desc: '七杀星碎片，攻击+150', base_attrs: { attack: 150 }, skills: [] },
  { id: 'tiansha_3', name: '贪狼碎片', category: '天煞', rarity: 'SR', icon: '⚔️', desc: '贪狼星碎片，攻击+400', base_attrs: { attack: 400 }, skills: ['tiansha_passive_1'] },
  { id: 'tiansha_4', name: '天魁碎片', category: '天煞', rarity: 'SSR', icon: '⚔️', desc: '天魁星碎片，攻击+1000', base_attrs: { attack: 1000 }, skills: ['tiansha_passive_1', 'tiansha_passive_2'] },
  { id: 'tiansha_5', name: '天魁天命碎片', category: '天煞', rarity: 'UR', icon: '⚔️', desc: '太古天魁碎片，攻击+3000', base_attrs: { attack: 3000 }, skills: ['tiansha_passive_1', 'tiansha_passive_2', 'tiansha_ultimate'] },
  
  // 地煞系
  { id: 'disha_1', name: '地魁碎片', category: '地煞', rarity: 'N', icon: '🛡️', desc: '地魁星碎片，防御+50', base_attrs: { defense: 50 }, skills: [] },
  { id: 'disha_2', name: '地煞碎片', category: '地煞', rarity: 'R', icon: '🛡️', desc: '地煞星碎片，防御+150', base_attrs: { defense: 150 }, skills: [] },
  { id: 'disha_3', name: '地恶碎片', category: '地煞', rarity: 'SR', icon: '🛡️', desc: '地恶星碎片，防御+400', base_attrs: { defense: 400 }, skills: ['disha_passive_1'] },
  { id: 'disha_4', name: '地魁天命碎片', category: '地煞', rarity: 'SSR', icon: '🛡️', desc: '地魁天命碎片，防御+1000', base_attrs: { defense: 1000 }, skills: ['disha_passive_1', 'disha_passive_2'] },
  { id: 'disha_5', name: '太古地煞碎片', category: '地煞', rarity: 'UR', icon: '🛡️', desc: '太古地煞碎片，防御+3000', base_attrs: { defense: 3000 }, skills: ['disha_passive_1', 'disha_passive_2', 'disha_ultimate'] },
  
  // 人皇系
  { id: 'renhuang_1', name: '人宗碎片', category: '人皇', rarity: 'N', icon: '👑', desc: '人宗碎片，生命+500', base_attrs: { hp: 500 }, skills: [] },
  { id: 'renhuang_2', name: '人王碎片', category: '人皇', rarity: 'R', icon: '👑', desc: '人王碎片，生命+1500', base_attrs: { hp: 1500 }, skills: [] },
  { id: 'renhuang_3', name: '人皇碎片', category: '人皇', rarity: 'SR', icon: '👑', desc: '人皇碎片，生命+4000', base_attrs: { hp: 4000 }, skills: ['renhuang_passive_1'] },
  { id: 'renhuang_4', name: '人皇天命碎片', category: '人皇', rarity: 'SSR', icon: '👑', desc: '人皇天命碎片，生命+10000', base_attrs: { hp: 10000 }, skills: ['renhuang_passive_1', 'renhuang_passive_2'] },
  { id: 'renhuang_5', name: '太古人皇碎片', category: '人皇', rarity: 'UR', icon: '👑', desc: '太古人皇碎片，生命+30000', base_attrs: { hp: 30000 }, skills: ['renhuang_passive_1', 'renhuang_passive_2', 'renhuang_ultimate'] },
  
  // 修罗系
  { id: 'xiulou_1', name: '修罗碎片', category: '修罗', rarity: 'N', icon: '💀', desc: '修罗碎片，暴击+3%', base_attrs: { crit_rate: 3 }, skills: [] },
  { id: 'xiulou_2', name: '罗刹碎片', category: '修罗', rarity: 'R', icon: '💀', desc: '罗刹碎片，暴击+8%', base_attrs: { crit_rate: 8 }, skills: [] },
  { id: 'xiulou_3', name: '夜叉碎片', category: '修罗', rarity: 'SR', icon: '💀', desc: '夜叉碎片，暴击+15%', base_attrs: { crit_rate: 15 }, skills: ['xiulou_passive_1'] },
  { id: 'xiulou_4', name: '修罗天命碎片', category: '修罗', rarity: 'SSR', icon: '💀', desc: '修罗天命碎片，暴击+30%', base_attrs: { crit_rate: 30 }, skills: ['xiulou_passive_1', 'xiulou_passive_2'] },
  { id: 'xiulou_5', name: '太古修罗碎片', category: '修罗', rarity: 'UR', icon: '💀', desc: '太古修罗碎片，暴击+50%', base_attrs: { crit_rate: 50 }, skills: ['xiulou_passive_1', 'xiulou_passive_2', 'xiulou_ultimate'] },
  
  // 天人道
  { id: 'tianren_1', name: '天道碎片', category: '天人', rarity: 'N', icon: '☯️', desc: '天道碎片，全属性+30', base_attrs: { attack: 30, defense: 30, hp: 300 }, skills: [] },
  { id: 'tianren_2', name: '人道碎片', category: '天人', rarity: 'R', icon: '☯️', desc: '人道碎片，全属性+80', base_attrs: { attack: 80, defense: 80, hp: 800 }, skills: [] },
  { id: 'tianren_3', name: '天人碎片', category: '天人', rarity: 'SR', icon: '☯️', desc: '天人碎片，全属性+200', base_attrs: { attack: 200, defense: 200, hp: 2000 }, skills: ['tianren_passive_1'] },
  { id: 'tianren_4', name: '太初碎片', category: '天人', rarity: 'SSR', icon: '☯️', desc: '太初碎片，全属性+500', base_attrs: { attack: 500, defense: 500, hp: 5000 }, skills: ['tianren_passive_1', 'tianren_passive_2'] },
  { id: 'tianren_5', name: '大道碎片', category: '天人', rarity: 'UR', icon: '☯️', desc: '大道碎片，全属性+1500', base_attrs: { attack: 1500, defense: 1500, hp: 15000 }, skills: ['tianren_passive_1', 'tianren_passive_2', 'tianren_ultimate'] }
];

// 命格技能定义
const DESTINY_SKILLS = {
  // 天煞系技能
  tiansha_passive_1: { name: '煞气', desc: '攻击时额外附加5%伤害', type: 'passive' },
  tiansha_passive_2: { name: '灭世', desc: '攻击时10%概率造成双倍伤害', type: 'passive' },
  tiansha_ultimate: { name: '天煞星落', desc: '终极技能：攻击时20%概率引发天煞星落，秒杀低血量敌人', type: 'ultimate' },
  
  // 地煞系技能
  disha_passive_1: { name: '地护', desc: '受到伤害时减少3%', type: 'passive' },
  disha_passive_2: { name: '煞盾', desc: '受到伤害时8%概率免疫该次伤害', type: 'passive' },
  disha_ultimate: { name: '地煞护体', desc: '终极技能：受到致命伤害时，15%概率触发护体，免疫死亡', type: 'ultimate' },
  
  // 人皇系技能
  renhuang_passive_1: { name: '生机', desc: '每5秒恢复1%最大生命值', type: 'passive' },
  renhuang_passive_2: { name: '天命', desc: '生命值低于30%时，自动恢复10%生命', type: 'passive' },
  renhuang_ultimate: { name: '人皇降临', desc: '终极技能：每60秒免疫一次致命伤害，并恢复20%生命', type: 'ultimate' },
  
  // 修罗系技能
  xiulou_passive_1: { name: '修罗', desc: '暴击伤害提升15%', type: 'passive' },
  xiulou_passive_2: { name: '杀意', desc: '击杀敌人后，下一次攻击必暴击', type: 'passive' },
  xiulou_ultimate: { name: '修罗灭世', desc: '终极技能：暴击率提升至80%，持续10秒', type: 'ultimate' },
  
  // 天人系技能
  tianren_passive_1: { name: '天人感应', desc: '所有属性提升5%', type: 'passive' },
  tianren_passive_2: { name: '道法自然', desc: '所有属性提升额外10%', type: 'passive' },
  tianren_ultimate: { name: '大道朝天', desc: '终极技能：全属性翻倍，持续15秒', type: 'ultimate' }
};

// 命格经验升级配置
const UPGRADE_EXP = {
  1: 0, 2: 100, 3: 300, 4: 600, 5: 1000,
  6: 1500, 7: 2200, 8: 3000, 9: 4000, 10: 5200,
  11: 6600, 12: 8200, 13: 10000, 14: 12000, 15: 15000
};

// 装备槽位配置 (6个槽位)
const EQUIP_SLOTS = [
  { slot: 0, name: '命宫', allowed_categories: ['天煞', '地煞', '人皇', '修罗', '天人'] },
  { slot: 1, name: '命宫', allowed_categories: ['天煞', '地煞', '人皇', '修罗', '天人'] },
  { slot: 2, name: '命宫', allowed_categories: ['天煞', '地煞', '人皇', '修罗', '天人'] },
  { slot: 3, name: '命宫', allowed_categories: ['天煞', '地煞', '人皇', '修罗', '天人'] },
  { slot: 4, name: '命宫', allowed_categories: ['天煞', '地煞', '人皇', '修罗', '天人'] },
  { slot: 5, name: '命宫', allowed_categories: ['天煞', '地煞', '人皇', '修罗', '天人'] }
];

// 套装效果 (2件/4件触发)
const SUIT_EFFECTS = {
  天煞: {
    2: { name: '煞气冲天', desc: '攻击+15%', attrs: { attack_percent: 15 } },
    4: { name: '天煞灭世', desc: '攻击+30%，暴击+10%', attrs: { attack_percent: 30, crit_rate: 10 } }
  },
  地煞: {
    2: { name: '地煞护体', desc: '防御+15%', attrs: { defense_percent: 15 } },
    4: { name: '万法不侵', desc: '防御+30%，伤害减免+10%', attrs: { defense_percent: 30, damage_reduction: 10 } }
  },
  人皇: {
    2: { name: '人皇气运', desc: '生命+15%', attrs: { hp_percent: 15 } },
    4: { name: '天命加身', desc: '生命+30%，生命恢复+50%', attrs: { hp_percent: 30, hp_regen: 50 } }
  },
  修罗: {
    2: { name: '修罗杀意', desc: '暴击率+15%', attrs: { crit_rate: 15 } },
    4: { name: '一击必杀', desc: '暴击率+30%，暴击伤害+25%', attrs: { crit_rate: 30, crit_damage: 25 } }
  },
  天人: {
    2: { name: '天人合一', desc: '全属性+10%', attrs: { all_attr_percent: 10 } },
    4: { name: '大道朝天', desc: '全属性+25%', attrs: { all_attr_percent: 25 } }
  }
};

// 抽取概率配置
const GACHA_RATES = {
  N: 0.55,   // 凡品 55%
  R: 0.30,   // 上品 30%
  SR: 0.10,  // 极品 10%
  SSR: 0.04, // 天命 4%
  UR: 0.01   // 太初 1%
};

// 商店商品
const SHOP_ITEMS = [
  { id: 'destiny_ticket_1', name: '命格抽奖券', desc: '单抽一次', price: 280, type: 'ticket', count: 1 },
  { id: 'destiny_ticket_10', name: '命格十连券', desc: '十连抽，必出SR以上', price: 2500, type: 'ticket', count: 10 },
  { id: 'destiny_exp_1', name: '命格经验丹', desc: '命格升级经验+100', price: 50, type: 'exp', count: 100 },
  { id: 'destiny_exp_10', name: '大命格经验丹', desc: '命格升级经验+1200', price: 450, type: 'exp', count: 1200 },
  { id: 'destiny_lock_1', name: '命格锁定符', desc: '锁定命格不被吞噬', price: 100, type: 'lock', count: 1 }
];

class DestinyStorage {
  constructor(db) {
    this.db = db;
    this.initTable();
  }

  initTable() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS player_destiny (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        shard_id TEXT NOT NULL,
        uid TEXT NOT NULL,
        category TEXT NOT NULL,
        rarity TEXT NOT NULL,
        level INTEGER DEFAULT 1,
        exp INTEGER DEFAULT 0,
        is_locked INTEGER DEFAULT 0,
        equipped_slot INTEGER DEFAULT -1,
        obtained_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(uid)
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS player_destiny_meta (
        player_id INTEGER PRIMARY KEY,
        total_draws INTEGER DEFAULT 0,
        currency INTEGER DEFAULT 0,
        last_free_draw TEXT,
        today_draw_count INTEGER DEFAULT 0,
        today_date TEXT
      )
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_destiny_player ON player_destiny(player_id)
    `);
  }

  // 获取玩家所有命格
  getPlayerDestiny(playerId) {
    return this.db.query(
      'SELECT * FROM player_destiny WHERE player_id = ? ORDER BY level DESC, exp DESC',
      [playerId]
    );
  }

  // 获取玩家已装备命格
  getEquippedDestiny(playerId) {
    return this.db.query(
      'SELECT * FROM player_destiny WHERE player_id = ? AND equipped_slot >= 0 ORDER BY equipped_slot',
      [playerId]
    );
  }

  // 获取单个命格
  getDestinyByUid(playerId, uid) {
    const result = this.db.query(
      'SELECT * FROM player_destiny WHERE player_id = ? AND uid = ?',
      [playerId, uid]
    );
    return result.length > 0 ? result[0] : null;
  }

  // 添加命格
  addDestiny(playerId, shardId, uid) {
    const shard = DESTINY_SHARDS.find(s => s.id === shardId);
    if (!shard) return null;

    this.db.run(
      `INSERT INTO player_destiny (player_id, shard_id, uid, category, rarity, level, exp) VALUES (?, ?, ?, ?, ?, 1, 0)`,
      [playerId, shardId, uid, shard.category, shard.rarity]
    );
    return this.getDestinyByUid(playerId, uid);
  }

  // 升级命格
  upgradeDestiny(playerId, uid, exp) {
    const destiny = this.getDestinyByUid(playerId, uid);
    if (!destiny) return null;

    let newExp = destiny.exp + exp;
    let newLevel = destiny.level;

    // 检查升级
    while (newLevel < 15 && newExp >= UPGRADE_EXP[newLevel + 1]) {
      newLevel++;
    }

    this.db.run(
      'UPDATE player_destiny SET exp = ?, level = ? WHERE player_id = ? AND uid = ?',
      [newExp, newLevel, playerId, uid]
    );

    return this.getDestinyByUid(playerId, uid);
  }

  // 装备命格到槽位
  equipDestiny(playerId, uid, slot) {
    // 先卸载该槽位已有的命格
    const current = this.db.query(
      'SELECT uid FROM player_destiny WHERE player_id = ? AND equipped_slot = ?',
      [playerId, slot]
    );
    for (const d of current) {
      this.db.run(
        'UPDATE player_destiny SET equipped_slot = -1 WHERE player_id = ? AND uid = ?',
        [playerId, d.uid]
      );
    }

    // 装备新命格
    this.db.run(
      'UPDATE player_destiny SET equipped_slot = ? WHERE player_id = ? AND uid = ?',
      [slot, playerId, uid]
    );

    return this.getDestinyByUid(playerId, uid);
  }

  // 卸下命格
  unequipDestiny(playerId, uid) {
    this.db.run(
      'UPDATE player_destiny SET equipped_slot = -1 WHERE player_id = ? AND uid = ?',
      [playerId, uid]
    );
    return this.getDestinyByUid(playerId, uid);
  }

  // 锁定/解锁命格
  toggleLock(playerId, uid) {
    const destiny = this.getDestinyByUid(playerId, uid);
    if (!destiny) return null;

    const newLocked = destiny.is_locked ? 0 : 1;
    this.db.run(
      'UPDATE player_destiny SET is_locked = ? WHERE player_id = ? AND uid = ?',
      [newLocked, playerId, uid]
    );

    return this.getDestinyByUid(playerId, uid);
  }

  // 吞噬命格 (升级材料)
  feedDestiny(playerId, targetUid, feedUids) {
    const target = this.getDestinyByUid(playerId, targetUid);
    if (!target) return null;

    let totalExp = 0;
    const locked = [];
    const fed = [];

    for (const feedUid of feedUids) {
      const d = this.getDestinyByUid(playerId, feedUid);
      if (!d) continue;
      if (d.is_locked) {
        locked.push(d.name);
        continue;
      }
      
      // 计算经验: 基础经验 + 等级加成
      const rarityConfig = RARITY[d.rarity];
      const baseExp = { N: 20, R: 50, SR: 150, SSR: 400, UR: 1200 }[d.rarity];
      const levelBonus = (d.level - 1) * 10;
      totalExp += (baseExp + levelBonus) * rarityConfig.upgrade_multiplier;
      
      // 删除被吞噬的命格
      this.db.run('DELETE FROM player_destiny WHERE player_id = ? AND uid = ?', [playerId, feedUid]);
      fed.push(d.shard_id);
    }

    // 升级目标命格
    const upgraded = this.upgradeDestiny(playerId, targetUid, Math.floor(totalExp));

    return { upgraded, total_exp: Math.floor(totalExp), fed, locked_errors: locked };
  }

  // 获取玩家元数据
  getMeta(playerId) {
    const result = this.db.query(
      'SELECT * FROM player_destiny_meta WHERE player_id = ?',
      [playerId]
    );
    if (result.length === 0) {
      this.db.run(
        'INSERT INTO player_destiny_meta (player_id, currency) VALUES (?, 0)',
        [playerId]
      );
      return { player_id: playerId, total_draws: 0, currency: 0, today_draw_count: 0 };
    }
    return result[0];
  }

  // 更新元数据
  updateMeta(playerId, updates) {
    const meta = this.getMeta(playerId);
    const newTotalDraws = updates.total_draws !== undefined ? updates.total_draws : meta.total_draws;
    const newCurrency = updates.currency !== undefined ? updates.currency : meta.currency;
    const today = new Date().toISOString().split('T')[0];
    
    let todayCount = meta.today_draw_count || 0;
    if (meta.today_date !== today) {
      todayCount = 0;
    }
    if (updates.today_draw_count !== undefined) {
      todayCount = updates.today_draw_count;
    }

    this.db.run(
      `INSERT OR REPLACE INTO player_destiny_meta (player_id, total_draws, currency, today_draw_count, today_date) VALUES (?, ?, ?, ?, ?)`,
      [playerId, newTotalDraws, newCurrency, todayCount, today]
    );
  }

  // 累计抽取次数
  incrementDraws(playerId, count) {
    const meta = this.getMeta(playerId);
    this.updateMeta(playerId, { total_draws: meta.total_draws + count });
  }

  // 计算总属性加成
  calculateTotalBonus(playerId) {
    const equipped = this.getEquippedDestiny(playerId);
    const bonus = {
      attack: 0, defense: 0, hp: 0, crit_rate: 0, crit_damage: 0,
      attack_percent: 0, defense_percent: 0, hp_percent: 0,
      damage_reduction: 0, hp_regen: 0, all_attr_percent: 0,
      pvp_damage: 0, pvp_defense: 0
    };

    // 分类统计
    const categoryCount = {};

    for (const d of equipped) {
      const shard = DESTINY_SHARDS.find(s => s.id === d.shard_id);
      if (!shard) continue;

      const rarityMult = RARITY[d.rarity].upgrade_multiplier;
      const levelMult = 1 + (d.level - 1) * 0.1;

      // 基础属性
      for (const [attr, val] of Object.entries(shard.base_attrs)) {
        if (bonus[attr] !== undefined) {
          bonus[attr] += val * rarityMult * levelMult;
        }
      }

      // 统计类别
      if (!categoryCount[d.category]) categoryCount[d.category] = 0;
      categoryCount[d.category]++;
    }

    // 计算套装效果
    for (const [cat, count] of Object.entries(categoryCount)) {
      if (count >= 2 && SUIT_EFFECTS[cat] && SUIT_EFFECTS[cat][2]) {
        const effect = SUIT_EFFECTS[cat][2];
        for (const [attr, val] of Object.entries(effect.attrs)) {
          if (bonus[attr] !== undefined) bonus[attr] += val;
        }
      }
      if (count >= 4 && SUIT_EFFECTS[cat] && SUIT_EFFECTS[cat][4]) {
        const effect = SUIT_EFFECTS[cat][4];
        for (const [attr, val] of Object.entries(effect.attrs)) {
          if (bonus[attr] !== undefined) bonus[attr] += val;
        }
      }
    }

    return bonus;
  }

  // 生成唯一ID
  generateUid() {
    return 'D' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
}

// 抽奖逻辑
function doGacha(count = 1, guaranteedSR = false) {
  const results = [];
  
  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    let rarity = 'N';
    let cumulative = 0;
    
    for (const [r, rate] of Object.entries(GACHA_RATES)) {
      cumulative += rate;
      if (roll < cumulative) {
        rarity = r;
        break;
      }
    }

    // 保底：如果guaranteedSR且抽到N，改成SR
    if (guaranteedSR && rarity === 'N') {
      rarity = 'SR';
    }

    // 从该稀有度中随机选一个碎片
    const candidates = DESTINY_SHARDS.filter(s => s.rarity === rarity);
    const shard = candidates[Math.floor(Math.random() * candidates.length)];
    
    results.push({ ...shard, uid: 'D' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6).toUpperCase() });
  }

  return results;
}

module.exports = {
  DestinyStorage,
  DESTINY_SHARDS,
  DESTINY_CATEGORIES,
  DESTINY_SKILLS,
  RARITY,
  EQUIP_SLOTS,
  SUIT_EFFECTS,
  GACHA_RATES,
  SHOP_ITEMS,
  UPGRADE_EXP,
  doGacha
};
