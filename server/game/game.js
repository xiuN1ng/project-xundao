/**
 * 挂机修仙 - 核心游戏引擎 v2.3
 * 集成法宝系统
 * 
 * 战斗特效优化 v1.0:
 * - 暴击/闪避/功法效果标识
 * - 预留资源加载器接口
 * - 可替换的图片/音效资源
 */

// ==================== 资源加载器配置 ====================
/**
 * 资源加载器配置
 * TODO: 后续可替换为真实图片资源和音效文件
 * 格式: { emoji: string, image?: string, sound?: string }
 */
const ResourceLoader = {
  // 暴击效果
  critical: {
    emoji: '🔥',
    // image: 'assets/effects/critical.png', // TODO: 替换为真实图片
    // sound: 'assets/sounds/critical.mp3',   // TODO: 替换为真实音效
    get icon() { return this.image || this.emoji; }
  },
  // 闪避效果
  dodge: {
    emoji: '💨',
    // image: 'assets/effects/dodge.png',     // TODO: 替换为真实图片
    // sound: 'assets/sounds/dodge.mp3',     // TODO: 替换为真实音效
    get icon() { return this.image || this.emoji; }
  },
  // 功法效果图标映射
  techniqueEffects: {
    // 攻击功法
    atk: { emoji: '⚔️', name: '攻击强化' },
    // 防御功法
    def: { emoji: '🛡️', name: '防御强化' },
    // 闪避功法
    dodge: { emoji: '💨', name: '闪避' },
    // 暴击功法
    crit: { emoji: '💥', name: '暴击' },
    // 灵气功法
    spirit: { emoji: '🌟', name: '灵气' },
    // 经验功法
    exp: { emoji: '📚', name: '经验' },
    // 灵石功法
    stone: { emoji: '💎', name: '灵石' },
    // HP功法
    hp: { emoji: '❤️', name: '生命' }
  },
  // 通用资源路径
  paths: {
    icons: 'assets/icons/',
    effects: 'assets/effects/',
    sounds: 'assets/sounds/'
  },
  // 加载资源（预留接口）
  load(type) {
    // TODO: 实现真实资源加载逻辑
    const res = this[type];
    if (!res) return null;
    // 优先使用图片资源，否则使用 emoji
    return res.image || res.emoji;
  },
  // 播放音效（预留接口）
  playSound(type) {
    // TODO: 实现真实音效播放
    const res = this[type];
    if (res && res.sound) {
      console.log(`[Sound] Playing: ${res.sound}`);
    }
  }
};

let gameState = {
  player: {
    name: '无名修士',
    spirit: 0, maxSpirit: 10, spiritRate: 1,
    realm: '凡人', realmLevel: 0,
    level: 1, experience: 0, requiredExp: 100,
    spiritStones: 500, cultivationTime: 0,
    idleMode: true, idleStartTime: 0, totalIdleTime: 0,
    bonuses: {},
    techniques: { cultivation: 'breath', combat: 'strike', defense: 'guard', auxiliary: null },
    techniquePoints: 0,
    hp: 50, maxHp: 50, atk: 5, def: 0,
    spiritRoot: '五行杂灵根',
    equipment: { weapon: null, armor: null, accessory: null },
    pills: { cooldowns: {} },
    adventure: { active: false, type: null, startTime: 0 }
  },
  cave: { buildings: {}, disciples: {}, resources: { herbs: 0, pills: 0, materials: 0, equipment: 0 }, lastCollect: 0 },
  stats: { totalSpirit: 0, totalSpiritStones: 0, offlineEarnings: 0, realmBreaks: 0, totalOfflineTime: 0, totalIdleGains: 0, techniquesLearned: 0, combatWins: 0, monstersKilled: 0, dungeonsCleared: 0, totalDamage: 0, highestDamage: 0, adventuresCompleted: 0, chancesTriggered: 0, totalSignins: 0 },
  settings: { autoSave: true, offline收益: true },
  lastSaveTime: Date.now()
};

class CultivationGame {
  constructor() { this.running = false; this.tickInterval = null; this.saveInterval = null; this.listeners = []; this.currentBattle = null; }

  getRealmData(name) { return REALM_DATA[name] || REALM_DATA['凡人']; }

  getSpiritRootBonus() {
    const root = SPIRIT_ROOT_DATA[gameState.player.spiritRoot] || SPIRIT_ROOT_DATA['五行杂灵根'];
    return { spiritRate: root.spirit_rate, atkBonus: root.atk_bonus, defBonus: root.def_bonus };
  }

  getEquipmentBonus() {
    const e = gameState.player.equipment;
    let bonus = { atk: 0, def: 0, hp: 0, crit_rate: 0, spirit_rate: 0 };

    // 原有装备系统
    if (e.weapon && EQUIPMENT_DATA.weapon[e.weapon]) { bonus.atk += EQUIPMENT_DATA.weapon[e.weapon].atk; bonus.def += EQUIPMENT_DATA.weapon[e.weapon].def; }
    if (e.armor && EQUIPMENT_DATA.armor[e.armor]) { bonus.atk += EQUIPMENT_DATA.armor[e.armor].atk; bonus.def += EQUIPMENT_DATA.armor[e.armor].def; }
    if (e.accessory && EQUIPMENT_DATA.accessory[e.accessory]) { bonus.atk += EQUIPMENT_DATA.accessory[e.accessory].atk; bonus.def += EQUIPMENT_DATA.accessory[e.accessory].def; }

    // 炼器系统装备加成
    if (typeof forgeSystem !== 'undefined' && forgeSystem.getEquipmentBonus) {
      const forgeBonus = forgeSystem.getEquipmentBonus();
      bonus.atk += forgeBonus.atk || 0;
      bonus.def += forgeBonus.def || 0;
      bonus.hp += forgeBonus.hp || 0;
      bonus.crit_rate += forgeBonus.crit_rate || 0;
      bonus.spirit_rate += forgeBonus.spirit_rate || 0;
    }

    return bonus;
  }

  getPillBonus() {
    const p = gameState.player.pills;
    const now = Date.now();
    let b = { spiritRate: 1, atk: 1, def: 1, exp: 1 };
    for (const type of Object.values(PILLS_DATA)) {
      for (const [id, pill] of Object.entries(type)) {
        if (p.cooldowns[id] && p.cooldowns[id] > now) {
          if (pill.effect === 'spirit_rate') b.spiritRate *= pill.value;
          if (pill.effect === 'atk') b.atk *= pill.value;
          if (pill.effect === 'def') b.def *= pill.value;
          if (pill.effect === 'exp' || pill.effect === 'exp_boost') b.exp *= pill.value;
        }
      }
    }
    return b;
  }

  calculatePlayerStats() {
    const p = gameState.player;
    const r = this.getRealmData(p.realm);
    const root = this.getSpiritRootBonus();
    const equip = this.getEquipmentBonus();
    const tech = this.getTechniqueBonus();
    const cave = this.getCaveBonus();
    const pill = this.getPillBonus();
    const skill = this.getSkillBonus();
    
    let hp = r.hp_base + LEVEL_DATA.hp_growth(p.level);
    let atk = r.atk_base + LEVEL_DATA.atk_growth(p.level);
    let def = r.def_base + LEVEL_DATA.def_growth(p.level);
    let maxSpirit = r.spirit_base + LEVEL_DATA.hp_growth(p.level) * 2;
    let spiritRate = r.spirit_rate + Math.floor(p.level * 0.5);
    
    spiritRate *= root.spiritRate;
    atk *= root.atkBonus;
    def *= root.defBonus;
    atk += equip.atk;
    def += equip.def;
    atk *= tech.atkMultiplier * cave.allMultiplier;
    def *= tech.defMultiplier * cave.allMultiplier;
    spiritRate *= tech.spiritMultiplier * cave.allMultiplier * pill.spiritRate;
    maxSpirit *= cave.allMultiplier;
    spiritRate *= r.realm_bonus;
    atk *= pill.atk;
    def *= pill.def;
    
    // 功法加成
    hp *= (1 + skill.hp_bonus);
    atk *= (1 + skill.atk_bonus);
    def *= (1 + skill.def_bonus);
    spiritRate *= (1 + skill.spirit_bonus);
    
    return { 
      hp: Math.floor(hp), 
      maxHp: Math.floor(maxSpirit), 
      atk: Math.floor(atk), 
      def: Math.floor(def), 
      spiritRate: Math.floor(spiritRate), 
      maxSpirit: Math.floor(maxSpirit),
      crit_rate: skill.crit_rate || 0,
      dodge_rate: skill.dodge_rate || 0,
      exp_bonus: skill.exp_bonus || 0,
      stone_bonus: skill.stone_bonus || 0
    };
  }

  getTechniqueBonus() {
    const p = gameState.player;
    let b = { spiritMultiplier: 1, atkMultiplier: 1, defMultiplier: 1, stoneMultiplier: 1.5, expMultiplier: 1 };
    for (const cat of Object.keys(p.techniques)) {
      const tech = TECHNIQUE_DATA[cat]?.effects[p.techniques[cat]];
      if (tech && p.realmLevel >= tech.realm_req) {
        if (tech.spirit_bonus) b.spiritMultiplier = tech.spirit_bonus;
        if (tech.atk_bonus) b.atkMultiplier = tech.atk_bonus;
        if (tech.def_bonus) b.defMultiplier = tech.def_bonus;
        if (tech.stone_bonus) b.stoneMultiplier = tech.stone_bonus;
        if (tech.exp_bonus) b.expMultiplier = tech.exp_bonus;
      }
    }
    return b;
  }

  getCaveBonus() {
    const c = gameState.cave;
    let b = { spiritMultiplier: 1, stoneMultiplier: 1, expMultiplier: 1, allMultiplier: 1 };
    for (const [name, lvl] of Object.entries(c.buildings)) {
      const cfg = BUILDING_DATA[name];
      if (!cfg) continue;
      for (const e of cfg.effects) {
        if (e.type === 'spirit_rate') b.spiritMultiplier += e.value * lvl;
        if (e.type === 'stone_rate') b.stoneMultiplier += e.value * lvl;
        if (e.type === 'auto_exp') b.expMultiplier += e.value * lvl;
        if (e.type === 'all_output') b.allMultiplier += e.value * lvl;
      }
    }
    for (const [type, cnt] of Object.entries(c.disciples)) {
      const cfg = DISCIPLE_DATA[type];
      if (!cfg) continue;
      if (cfg.effect.type === 'stone_bonus') b.stoneMultiplier += cfg.effect.value * cnt;
      if (cfg.effect.type === 'spirit_bonus') b.spiritMultiplier += cfg.effect.value * cnt;
      if (cfg.effect.type === 'exp_bonus') b.expMultiplier += cfg.effect.value * cnt;
      if (cfg.effect.type === 'all_bonus') b.allMultiplier += cfg.effect.value * cnt;
    }
    return b;
  }

  // ============ 功法系统方法 ============
  getSkillBonus() {
    const p = gameState.player;
    const skills = p.skills || [];
    const b = {
      hp_bonus: 0,
      atk_bonus: 0,
      def_bonus: 0,
      crit_rate: 0,
      dodge_rate: 0,
      exp_bonus: 0,
      spirit_bonus: 0,
      stone_bonus: 0
    };
    
    for (const playerSkill of skills) {
      if (!playerSkill.unlocked) continue;
      const effect = getSkillEffect(playerSkill.skillId, playerSkill.level);
      for (const [key, value] of Object.entries(effect)) {
        if (b[key] !== undefined) {
          b[key] += value;
        }
      }
    }
    return b;
  }

  learnSkill(skillId) {
    const p = gameState.player;
    if (!p.skills) p.skills = [];
    return learnSkill(p, skillId);
  }

  upgradeSkill(skillId) {
    const p = gameState.player;
    if (!p.skills) p.skills = [];
    return upgradeSkill(p, skillId);
  }

  getPlayerSkills() {
    return getPlayerSkills(gameState.player);
  }

  getAvailableSkills() {
    return getAvailableSkills(gameState.player);
  }

  getSpiritRate() { return Math.floor(this.calculatePlayerStats().spiritRate * (gameState.player.bonuses.doubleSpirit ? 2 : 1)); }

  start() {
    if (this.running) return;
    this.running = true;
    this.loadGame();
    if (!gameState.player.idleStartTime) gameState.player.idleStartTime = Date.now();
    this.tickInterval = setInterval(() => this.tick(), 1000);
    this.saveInterval = setInterval(() => this.saveGame(), 30000);
    const s = this.calculatePlayerStats();
    gameState.player.maxHp = s.maxHp; gameState.player.hp = s.hp; gameState.player.atk = s.atk; gameState.player.def = s.def; gameState.player.maxSpirit = s.maxSpirit; gameState.player.spiritRate = s.spiritRate;
    console.log('🎮 游戏启动 - v2.1');
  }

  stop() {
    this.running = false;
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.saveInterval) clearInterval(this.saveInterval);
    gameState.player.totalIdleTime += Math.floor((Date.now() - gameState.player.idleStartTime) / 1000);
    this.saveGame();
  }

  tick() {
    const p = gameState.player;
    const gain = this.getSpiritRate();
    if (p.adventure.active) this.processAdventure();
    if (p.spirit < p.maxSpirit) p.spirit = Math.min(p.spirit + gain, p.maxSpirit);
    p.cultivationTime++;
    if (p.idleMode) gameState.stats.totalIdleGains += gain;
    gameState.stats.totalSpirit += gain;
    if (Math.random() < 0.1) {
      const sg = Math.floor((1 + p.realmLevel + p.level) * this.getTechniqueBonus().stoneMultiplier * this.getCaveBonus().stoneMultiplier);
      p.spiritStones += sg; gameState.stats.totalSpiritStones += sg;
    }
    this.processCaveResources();
    this.gainExperience(gain * 0.1 * this.getTechniqueBonus().expMultiplier * this.getCaveBonus().expMultiplier * this.getPillBonus().exp);
    this.checkChanceEvent();
    
    // 跨天签到重置检查 (每分钟检查一次)
    if (p.cultivationTime % 60 === 0) {
      this.checkSigninReset();
    }
    
    this.notifyListeners();
  }

  /**
   * 检查并处理跨天签到重置
   */
  checkSigninReset() {
    // 签到系统现在自动处理跨天检查
    // 这里可以添加额外的检查逻辑
  }

  processAdventure() {
    const p = gameState.player;
    const a = p.adventure;
    if (!a.active || !a.type) return;
    const cfg = ADVENTURE_DATA.types[a.type];
    if (!cfg) return;
    const elapsed = (Date.now() - a.startTime) / 1000;
    if (elapsed >= cfg.time) this.finishAdventure();
  }

  finishAdventure() {
    const p = gameState.player;
    const a = p.adventure;
    if (!a.active || !a.type) return;
    const cfg = ADVENTURE_DATA.types[a.type];
    const tech = this.getTechniqueBonus();
    const cave = this.getCaveBonus();
    const spirit = Math.floor(cfg.spirit_gain * this.getSpiritRate() * 10);
    const exp = Math.floor(cfg.exp_gain * 50 * tech.expMultiplier);
    const stones = Math.floor(cfg.stone_gain * 10 * tech.stoneMultiplier);
    p.spirit = Math.min(p.spirit + spirit, p.maxSpirit);
    p.experience += exp;
    p.spiritStones += stones;
    gameState.stats.adventuresCompleted++;
    this.gainExperience(0);
    p.adventure = { active: false, type: null, startTime: 0 };
  }

  startAdventure(type) {
    const p = gameState.player;
    if (!ADVENTURE_DATA.types[type]) return { success: false, message: '历练类型不存在' };
    if (p.adventure.active) return { success: false, message: '已有进行中的历练' };
    p.adventure = { active: true, type, startTime: Date.now() };
    return { success: true, message: `开始${type}...` };
  }

  checkChanceEvent() {
    if (Math.random() > 0.01) return;
    const e = CHANCE_DATA.events[Math.floor(Math.random() * CHANCE_DATA.events.length)];
    const p = gameState.player;
    gameState.stats.chancesTriggered++;
    if (e.stone_bonus) p.spiritStones += e.stone_bonus;
    if (e.exp_bonus) p.experience += e.exp_bonus;
    if (e.hp_damage) p.hp = Math.max(1, p.hp * (1 - e.hp_damage));
    if (e.stone_loss) p.spiritStones = Math.floor(p.spiritStones * (1 - e.stone_loss));
    if (e.realm_break) this.breakRealm();
  }

  buyEquipment(slot, item) {
    const p = gameState.player;
    const data = EQUIPMENT_DATA[slot];
    if (!data || !data[item]) return { success: false, message: '装备不存在' };
    if (p.spiritStones < data[item].cost) return { success: false, message: `需要 ${data[item].cost} 灵石` };
    p.spiritStones -= data[item].cost;
    p.equipment[slot] = item;
    const s = this.calculatePlayerStats();
    p.atk = s.atk; p.def = s.def;
    return { success: true, message: `购买 ${data[item].name} 成功!` };
  }

  usePill(type, id) {
    const p = gameState.player;
    const data = PILLS_DATA[type];
    if (!data || !data[id]) return { success: false, message: '丹药不存在' };
    const pill = data[id];
    const now = Date.now();
    if (p.pills.cooldowns[id] && p.pills.cooldowns[id] > now) return { success: false, message: '冷却中' };
    if (p.spiritStones < pill.cost) return { success: false, message: `需要 ${pill.cost} 灵石` };
    p.spiritStones -= pill.cost;
    p.pills.cooldowns[id] = now + pill.cooldown * 1000;
    if (pill.effect === 'spirit') p.spirit = Math.min(p.spirit + pill.value, p.maxSpirit);
    if (pill.effect === 'heal') p.hp = Math.min(p.hp + Math.floor(p.maxHp * pill.value), p.maxHp);
    if (pill.effect === 'exp_boost') { p.experience += pill.value; this.gainExperience(0); }
    return { success: true, message: `使用 ${pill.name} 成功!` };
  }

  changeSpiritRoot(rootName) {
    const p = gameState.player;
    const data = SPIRIT_ROOT_DATA[rootName];
    if (!data) return { success: false, message: '灵根不存在' };
    if (p.realmLevel < data.realm_req) return { success: false, message: '境界不足' };
    p.spiritRoot = rootName;
    const s = this.calculatePlayerStats();
    p.atk = s.atk; p.def = s.def;
    return { success: true, message: `切换为 ${rootName} 成功!` };
  }

  processCaveResources() {
    const c = gameState.cave;
    const now = Date.now();
    if (c.buildings.灵田 > 0) c.resources.herbs += c.buildings.灵田 * 0.1;
    if (now - c.lastCollect > 10000 && c.buildings.炼丹房 > 0) { c.resources.pills += c.buildings.炼丹房 * 0.5; c.lastCollect = now; }
    if (now - c.lastCollect > 20000 && c.buildings.炼器室 > 0) { c.resources.materials += c.buildings.炼器室 * 0.3; if (Math.random() < 0.1 * c.buildings.炼器室) c.resources.equipment += 1; }
  }

  gainExperience(amount) {
    const p = gameState.player;
    // 功法经验加成
    const skillBonus = this.getSkillBonus();
    const expMultiplier = 1 + (skillBonus.exp_bonus || 0);
    const finalAmount = amount * expMultiplier;
    
    p.experience += finalAmount;
    while (p.experience >= p.requiredExp) {
      p.experience -= p.requiredExp;
      p.level++;
      p.requiredExp = LEVEL_DATA.exp_curve(p.level);
      const r = this.getRealmData(p.realm);
      p.maxHp = r.hp_base + LEVEL_DATA.hp_growth(p.level);
      p.atk = r.atk_base + LEVEL_DATA.atk_growth(p.level);
      p.def = r.def_base + LEVEL_DATA.def_growth(p.level);
      p.maxSpirit = r.spirit_base + LEVEL_DATA.hp_growth(p.level) * 2;
      p.spiritRate = r.spirit_rate + Math.floor(p.level * 0.5);
      if (p.level % 5 === 0) p.techniquePoints++;
    }
    this.checkRealmBreak();
  }

  checkRealmBreak() {
    const p = gameState.player;
    const realms = Object.keys(REALM_DATA);
    const idx = realms.indexOf(p.realm);
    const next = realms[idx + 1];
    if (!next) return;
    if (p.spirit >= REALM_DATA[next].cultivation_req) {
      p.realm = next; p.realmLevel = REALM_DATA[next].level; p.spirit = 0; p.maxSpirit = REALM_DATA[next].spirit_base;
      p.spiritRate = REALM_DATA[next].spirit_rate; p.maxHp = REALM_DATA[next].hp_base; p.hp = p.maxHp;
      p.atk = REALM_DATA[next].atk_base; p.def = REALM_DATA[next].def_base; gameState.stats.realmBreaks++;
    }
  }

  getAvailableMonsters() {
    const m = [];
    for (const [z, d] of Object.entries(MONSTER_DATA)) {
      if (gameState.player.realmLevel >= d.min_realm) m.push(...d.monsters.map(x => ({ ...x, zone: z })));
    }
    return m;
  }

  getAvailableDungeons() {
    const d = [];
    for (const [id, data] of Object.entries(DUNGEON_DATA)) {
      if (gameState.player.realmLevel >= data.min_realm) d.push({ id, ...data });
    }
    return d;
  }

  startBattle(monsterId) {
    const p = gameState.player;
    const s = this.calculatePlayerStats();
    const m = this.getAvailableMonsters().find(x => x.id === monsterId);
    if (!m) return { success: false, message: '怪物不存在' };
    if (s.hp <= 0) return { success: false, message: 'HP不足' };
    this.currentBattle = { monster: { ...m, currentHp: m.hp }, playerHp: s.hp, maxPlayerHp: s.maxHp };
    return { success: true, message: `⚔️ 遭遇 ${m.name}!` };
  }

  attack() {
    if (!this.currentBattle) return { success: false, message: '没有战斗' };
    const s = this.calculatePlayerStats();
    const skill = this.getSkillBonus(); // 获取功法加成
    const b = this.currentBattle;
    
    // 初始化战斗效果标记
    const battleEffect = {
      isCrit: false,
      isDodge: false,
      techniqueEffects: [], // 触发的功法效果
      damage: 0,
      playerDamage: 0
    };
    
    // 闪避判定 (应用闪避功法加成)
    const dodgeChance = skill.dodge_rate || 0;
    if (Math.random() < dodgeChance) {
      battleEffect.isDodge = true;
      // 记录触发的闪避功法效果
      if (skill.dodge_rate > 0) {
        battleEffect.techniqueEffects.push({ type: 'dodge', ...ResourceLoader.techniqueEffects.dodge });
      }
      return { 
        success: true, 
        message: `${ResourceLoader.dodge.icon} 躲避了 ${b.monster.name} 的攻击!`, 
        battle: b, 
        dodged: true,
        battleEffect: battleEffect
      };
    }
    
    // 暴击判定 (应用暴击功法加成)
    const critChance = s.crit_rate || 0;
    const isCrit = Math.random() < critChance;
    battleEffect.isCrit = isCrit;
    
    let dmg = Math.max(1, s.atk - b.monster.def * 0.3) * (isCrit ? 1.5 : 1);
    // 应用攻击功法加成
    const atkBonus = skill.atk_bonus || 0;
    if (atkBonus > 0) {
      dmg *= (1 + atkBonus);
      battleEffect.techniqueEffects.push({ type: 'atk', ...ResourceLoader.techniqueEffects.atk, value: atkBonus });
    }
    
    battleEffect.damage = Math.floor(dmg);
    b.monster.currentHp -= dmg;
    gameState.stats.totalDamage += dmg;
    gameState.stats.highestDamage = Math.max(gameState.stats.highestDamage, dmg);
    
    // 玩家受到伤害 (应用防御功法加成)
    let playerDamage = Math.max(1, b.monster.atk - s.def * 0.3);
    // 防御功法减少伤害
    const defBonus = skill.def_bonus || 0;
    if (defBonus > 0) {
      playerDamage *= (1 - Math.min(0.9, defBonus));
      battleEffect.techniqueEffects.push({ type: 'def', ...ResourceLoader.techniqueEffects.def, value: defBonus });
    }
    
    battleEffect.playerDamage = Math.floor(playerDamage);
    if (b.monster.currentHp > 0) b.playerHp -= playerDamage;
    
    if (b.monster.currentHp <= 0) {
      // 经验获取 (应用经验功法加成)
      const expMultiplier = 1 + (skill.exp_bonus || 0);
      const exp = Math.floor(b.monster.exp * this.getTechniqueBonus().expMultiplier * expMultiplier);
      const stones = Math.floor(b.monster.stones * this.getTechniqueBonus().stoneMultiplier);
      gameState.player.experience += exp;
      gameState.player.spiritStones += stones;
      gameState.stats.combatWins++;
      gameState.stats.monstersKilled++;
      this.gainExperience(0);
      this.currentBattle = null;
      
      // 构建暴击/功法效果消息
      let effectMsg = '';
      if (isCrit) effectMsg += ` ${ResourceLoader.critical.icon}暴击!`;
      if (battleEffect.techniqueEffects.length > 0) {
        const techIcons = battleEffect.techniqueEffects.map(e => e.emoji).join('');
        if (techIcons) effectMsg += ` ${techIcons}`;
      }
      
      return { 
        success: true, 
        message: `🎉 击败 ${b.monster.name}! +${exp}经验 +${stones}灵石${effectMsg}`, 
        win: true,
        battleEffect: battleEffect
      };
    }
    
    if (b.playerHp <= 0) {
      gameState.player.spirit = 0;
      this.currentBattle = null;
      return { success: true, message: '💀 战败!', win: false };
    }
    
    // 构建普通攻击消息
    let effectMsg = '';
    if (isCrit) effectMsg += ` ${ResourceLoader.critical.icon}暴击!`;
    if (battleEffect.techniqueEffects.length > 0) {
      const techIcons = battleEffect.techniqueEffects.map(e => e.emoji).join('');
      if (techIcons) effectMsg += ` ${techIcons}`;
    }
    
    return { 
      success: true, 
      message: `对${b.monster.name}造成${Math.floor(dmg)}伤害${effectMsg}`, 
      battle: b,
      battleEffect: battleEffect
    };
  }

  flee() { if (!this.currentBattle) return { success: false, message: '没有战斗' }; return Math.random() > 0.7 ? { success: false, message: '逃跑失败!' } : (this.currentBattle = null, { success: true, message: '🏃 逃跑成功' }); }

  challengeDungeon(dungeonId) {
    const d = DUNGEON_DATA[dungeonId];
    if (!d) return { success: false, message: '副本不存在' };
    if (gameState.player.realmLevel < d.min_realm) return { success: false, message: '境界不足' };
    const s = this.calculatePlayerStats();
    const skill = this.getSkillBonus(); // 获取功法加成
    let exp = 0, stones = 0, wins = 0;
    for (let i = 0; i < d.waves; i++) {
      const m = MONSTER_DATA[dungeonId]?.monsters.find(x => x.id === d.monster_pool[i % d.monster_pool.length]) || { hp: 100, atk: 10, def: 5, exp: 50, stones: 30 };
      let mhp = m.hp, php = s.hp;
      while (mhp > 0 && php > 0) {
        // 闪避判定
        const dodgeChance = skill.dodge_rate || 0;
        if (Math.random() < dodgeChance) {
          // 躲避成功，不受伤害
        } else {
          // 暴击判定
          const critChance = s.crit_rate || 0;
          const isCrit = Math.random() < critChance;
          
          // 玩家攻击怪物 (应用攻击功法加成)
          let dmg = Math.max(1, s.atk - m.def * 0.3) * (isCrit ? 1.5 : 1);
          dmg *= (1 + (skill.atk_bonus || 0));
          mhp -= dmg;
          
          if (mhp > 0) {
            // 怪物攻击玩家 (应用防御功法加成)
            let playerDmg = Math.max(1, m.atk - s.def * 0.3);
            playerDmg *= (1 - Math.min(0.9, skill.def_bonus || 0));
            php -= playerDmg;
          }
        }
      }
      if (mhp <= 0) {
        // 经验获取 (应用经验功法加成)
        const expMultiplier = 1 + (skill.exp_bonus || 0);
        exp += Math.floor(m.exp * this.getTechniqueBonus().expMultiplier * expMultiplier);
        stones += Math.floor(m.stones * this.getTechniqueBonus().stoneMultiplier);
        wins++;
      } else break;
    }
    gameState.player.experience += exp;
    gameState.player.spiritStones += stones;
    if (wins === d.waves) { gameState.stats.dungeonsCleared++; gameState.stats.combatWins++; this.gainExperience(0); return { success: true, message: `🏆 通关${d.name}! +${exp}经验 +${stones}灵石` }; }
    return { success: true, message: `挑战失败，击败${wins}/${d.waves}波` };
  }

  manualCultivate() { const p = gameState.player; const gain = Math.floor(this.calculatePlayerStats().spiritRate * 5); p.spirit = Math.min(p.spirit + gain, p.maxSpirit); gameState.stats.totalSpirit += gain; this.gainExperience(gain * 0.5 * this.getTechniqueBonus().expMultiplier); return gain; }

  breakRealm() {
    const p = gameState.player;
    const realms = Object.keys(REALM_DATA);
    const idx = realms.indexOf(p.realm);
    const next = realms[idx + 1];
    if (!next) return { success: false, message: '已达最高境界!' };
    if (p.spirit < REALM_DATA[next].cultivation_req) return { success: false, message: `需要 ${REALM_DATA[next].cultivation_req} 灵气` };
    p.realm = next; p.realmLevel = REALM_DATA[next].level; p.spirit = 0; p.maxSpirit = REALM_DATA[next].spirit_base; p.spiritRate = REALM_DATA[next].spirit_rate; p.maxHp = REALM_DATA[next].hp_base; p.hp = p.maxHp; p.atk = REALM_DATA[next].atk_base; p.def = REALM_DATA[next].def_base; gameState.stats.realmBreaks++;
    return { success: true, message: `🎉 突破到 ${next}!` };
  }

  upgradeSpiritCap() { const p = gameState.player; const cost = Math.floor(10 * Math.pow(1.5, p.level)); if (p.spiritStones < cost) return { success: false, message: `需要 ${cost} 灵石` }; p.spiritStones -= cost; p.maxSpirit = Math.floor(p.maxSpirit * 1.5); return { success: true, message: `灵气上限 ${p.maxSpirit}` }; }

  upgradeBuilding(id) {
    const p = gameState.player;
    const c = gameState.cave;
    const cfg = BUILDING_DATA[id];
    if (!cfg) return { success: false, message: '建筑不存在' };
    const lvl = c.buildings[id] || 0;
    if (lvl >= cfg.max_level) return { success: false, message: '已满级' };
    const cost = Math.floor(cfg.base_cost * Math.pow(cfg.cost_factor, lvl));
    if (p.spiritStones < cost) return { success: false, message: `需要 ${cost} 灵石` };
    p.spiritStones -= cost; c.buildings[id] = lvl + 1;
    return { success: true, message: `🏠 ${cfg.name} Lv.${lvl + 1}` };
  }

  recruitDisciple(type) {
    const p = gameState.player;
    const c = gameState.cave;
    const cfg = DISCIPLE_DATA[type];
    if (!cfg) return { success: false, message: '类型不存在' };
    const cnt = c.disciples[type] || 0;
    if (cnt >= cfg.max_count) return { success: false, message: '已满员' };
    const cost = Math.floor(cfg.base_cost * Math.pow(cfg.cost_factor, cnt));
    if (p.spiritStones < cost) return { success: false, message: `需要 ${cost} 灵石` };
    p.spiritStones -= cost; c.disciples[type] = cnt + 1;
    return { success: true, message: `👤 招募 ${cfg.name}` };
  }

  collectCaveResources() {
    const c = gameState.cave;
    const v = GAME_BALANCE.economy;
    const total = Math.floor(c.resources.herbs) * v.herb_value + Math.floor(c.resources.pills) * v.pill_value + Math.floor(c.resources.materials) * v.material_value + Math.floor(c.resources.equipment) * v.equipment_value;
    if (total === 0) return { success: false, message: '没有可收集的资源' };
    c.resources.herbs = 0; c.resources.pills = 0; c.resources.materials = 0; c.resources.equipment = 0;
    gameState.player.spiritStones += total;
    return { success: true, message: `📦 +${total} 灵石` };
  }

  learnTechnique(cat, id) {
    const p = gameState.player;
    const tech = TECHNIQUE_DATA[cat]?.effects[id];
    if (!tech) return { success: false, message: '功法不存在' };
    if (p.realmLevel < tech.realm_req) return { success: false, message: '境界不足' };
    if (p.spiritStones < tech.cost) return { success: false, message: `需要 ${tech.cost} 灵石` };
    p.spiritStones -= tech.cost; p.techniques[cat] = id; gameState.stats.techniquesLearned++;
    return { success: true, message: `✅ 学会 ${tech.name}` };
  }

  calculateOfflineEarnings(sec) { const r = this.calculatePlayerStats(); let rate = r.spiritRate; if (gameState.player.bonuses.doubleSpirit) rate *= 2; return Math.floor(rate * sec * 0.5); }

  saveGame() {
    try {
      if (gameState.player.idleMode && gameState.player.idleStartTime > 0) {
        gameState.player.totalIdleTime += Math.floor((Date.now() - gameState.player.idleStartTime) / 1000);
        gameState.player.idleStartTime = Date.now();
      }
      localStorage.setItem('cultivation_save_v2', JSON.stringify({ gameState, saveTime: Date.now() }));
      gameState.lastSaveTime = Date.now();
    } catch (e) { console.error('存档失败:', e); }
  }

  loadGame() {
    try {
      const data = localStorage.getItem('cultivation_save_v2');
      if (data) {
        const parsed = JSON.parse(data);
        gameState = { ...gameState, ...parsed.gameState };
        if (!gameState.cave) gameState.cave = { buildings: {}, disciples: {}, resources: { herbs: 0, pills: 0, materials: 0, equipment: 0 }, lastCollect: 0 };
        if (!gameState.player.equipment) gameState.player.equipment = { weapon: null, armor: null, accessory: null };
        if (!gameState.player.pills) gameState.player.pills = { cooldowns: {} };
        if (!gameState.player.adventure) gameState.player.adventure = { active: false, type: null, startTime: 0 };
        // 法宝系统初始化
        if (!gameState.player.artifacts_inventory) gameState.player.artifacts_inventory = {};
        if (!gameState.player.owned_artifacts) gameState.player.owned_artifacts = [];
        if (!gameState.player.artifact_equipment) gameState.player.artifact_equipment = { weapon: null, armor: null, accessory: null, companion: null };
        if (!gameState.player.treasure_cooldowns) gameState.player.treasure_cooldowns = {};
        // 灵兽系统初始化
        if (!gameState.player.beasts) gameState.player.beasts = [];
        if (!gameState.player.beast_slots) gameState.player.beast_slots = 5;
        // 宗门系统初始化
        if (!gameState.player.sect) gameState.player.sect = null;
        // 统计数据初始化
        if (!gameState.stats.artifactsForged) { gameState.stats.artifactsForged = 0; gameState.stats.artifactsRecycled = 0; gameState.stats.heavenTreasuresUsed = 0; }
        if (!gameState.stats.beastsCaptured) gameState.stats.beastsCaptured = 0;
        if (!gameState.stats.sectsCreated) gameState.stats.sectsCreated = 0;
        if (!gameState.stats.worldBossKills) gameState.stats.worldBossKills = 0;
        if (!gameState.stats.marketSales) gameState.stats.marketSales = 0;
        // 邮件系统初始化
        if (!gameState.mails) gameState.mails = { list: [], unreadCount: 0 };
        
        // 功法系统初始化
        if (!gameState.player.skills) gameState.player.skills = [];
        
        // 洞天福地系统初始化
        if (typeof mapSystem !== 'undefined') {
          mapSystem.init(gameState);
        }
        
        // 签到系统初始化
        if (typeof signinSystem !== 'undefined') {
          signinSystem.init();
        }

        // 炼器系统初始化
        if (typeof forgeSystem !== 'undefined') {
          forgeSystem.init(gameState);
          
          // 兼容旧版本装备：确保所有装备都有强化等级字段
          if (gameState.forge && gameState.forge.equipment) {
            for (const eq of gameState.forge.equipment) {
              if (eq.strengthenLevel === undefined) {
                eq.strengthenLevel = 0;
              }
              if (eq.bonusStats === undefined) {
                eq.bonusStats = {};
              }
            }
          }
        }
        
        const offline = Math.min((Date.now() - gameState.lastSaveTime) / 1000, 86400);
        if (offline > 60 && gameState.settings.offline收益) {
          const gain = this.calculateOfflineEarnings(offline);
          gameState.player.spirit = Math.min(gameState.player.spirit + gain, gameState.player.maxSpirit);
          gameState.stats.offlineEarnings = gain;
        }
        gameState.player.idleStartTime = Date.now();
        console.log('📂 游戏已加载');
      }
    } catch (e) { console.error('加载失败:', e); }
  }

  // ============ 法宝系统方法 ============
  getArtifactBonus() {
    const p = gameState.player;
    let b = { atk: 1, def: 1, spiritRate: 1 };
    if (!p.artifact_equipment) return b;
    for (const slot of Object.keys(p.artifact_equipment)) {
      const artifact = p.artifact_equipment[slot];
      if (!artifact || !artifact.id) continue;
      try {
        if (typeof calculateArtifactStats === 'function') {
          const stats = calculateArtifactStats(artifact.id, artifact.level || 1, artifact.quality || 'mortal');
          if (stats) {
            b.atk += stats.atk * 0.01;
            b.def += stats.def * 0.01;
          }
        }
      } catch(e) {}
    }
    b.spiritRate *= (1 + (p.bonuses?.heaven_spirit_rate || 0));
    b.atk *= (1 + (p.bonuses?.heaven_atk || 0) + (p.bonuses?.heaven_all || 0));
    b.def *= (1 + (p.bonuses?.heaven_def || 0) + (p.bonuses?.heaven_all || 0));
    return b;
  }

  calculateArtifactStatsWrapper(artifactId, level, quality) {
    try {
      return calculateArtifactStats(artifactId, level, quality);
    } catch(e) { return { atk: 10, def: 10 }; }
  }

  equipArtifact(artifactId, slot) {
    const p = gameState.player;
    if (!p.owned_artifacts) return { success: false, message: '没有法宝' };
    const artifact = p.owned_artifacts.find(a => a.id === artifactId);
    if (!artifact) return { success: false, message: '法宝不存在' };
    p.artifact_equipment = p.artifact_equipment || { weapon: null, armor: null, accessory: null, companion: null };
    p.artifact_equipment[slot] = artifact;
    return { success: true, message: '装备成功' };
  }

  upgradeArtifact(artifactId, materials) {
    const p = gameState.player;
    if (!p.owned_artifacts) return { success: false, message: '没有法宝' };
    const artifact = p.owned_artifacts.find(a => a.id === artifactId);
    if (!artifact) return { success: false, message: '法宝不存在' };
    try {
      const result = upgradeArtifact(artifact, materials || []);
      if (result.success) {
        gameState.stats.artifactsForged = (gameState.stats.artifactsForged || 0) + 1;
      }
      return result;
    } catch(e) { return { success: false, message: '升级失败' }; }
  }

  recycleArtifact(artifactId) {
    const p = gameState.player;
    if (!p.owned_artifacts) return { success: false, message: '没有法宝' };
    const idx = p.owned_artifacts.findIndex(a => a.id === artifactId);
    if (idx < 0) return { success: false, message: '法宝不存在' };
    const artifact = p.owned_artifacts[idx];
    try {
      const result = recycleArtifact(artifact);
      if (result.success) {
        gameState.stats.artifactsRecycled = (gameState.stats.artifactsRecycled || 0) + 1;
      }
      return result;
    } catch(e) { return { success: false, message: '回收失败' }; }
  }

  forgeArtifact(recipeId) {
    try {
      const result = forgeArtifact(recipeId);
      if (result.success) {
        gameState.stats.artifactsForged = (gameState.stats.artifactsForged || 0) + 1;
      }
      return result;
    } catch(e) { return { success: false, message: '炼器失败' }; }
  }

  useHeavenTreasure(treasureId) {
    try {
      const result = useHeavenTreasure(treasureId);
      if (result.success) {
        gameState.stats.heavenTreasuresUsed = (gameState.stats.heavenTreasuresUsed || 0) + 1;
      }
      return result;
    } catch(e) { return { success: false, message: '使用失败' }; }
  }

  addArtifact(artifactId) {
    const p = gameState.player;
    if (!p.owned_artifacts) p.owned_artifacts = [];
    const artifactData = ARTIFACT_DATA[artifactId];
    if (!artifactData) return { success: false, message: '法宝不存在' };
    p.owned_artifacts.push({
      id: artifactId,
      level: 1,
      exp: 0,
      quality: artifactData.quality || 'mortal',
      bound: true,
      obtainedAt: Date.now()
    });
    return { success: true, message: '获得 ' + artifactData.name };
  }

  getState() {
    const p = gameState.player;
    const r = this.getRealmData(p.realm);
    const realms = Object.keys(REALM_DATA);
    const idx = realms.indexOf(p.realm);
    return { 
      ...gameState, 
      realm: r, 
      nextRealm: REALM_DATA[realms[idx + 1]] || null, 
      currentSpiritRate: this.getSpiritRate(), 
      playerStats: this.calculatePlayerStats(), 
      techniqueBonus: this.getTechniqueBonus(), 
      caveBonus: this.getCaveBonus(),
      skillBonus: this.getSkillBonus(),
      playerSkills: this.getPlayerSkills(),
      availableSkills: this.getAvailableSkills(),
      idleGainsThisSession: p.idleMode && p.idleStartTime ? Math.floor((Date.now() - p.idleStartTime) / 1000 * this.getSpiritRate()) : 0, 
      availableMonsters: this.getAvailableMonsters(), 
      availableDungeons: this.getAvailableDungeons(),
      alchemyFormulas: this.getFormulas(),
      playerPills: this.getPlayerPills(),
      alchemyStats: this.getAlchemyStats(),
      forgeRecipes: this.getForgeRecipes(),
      playerEquipment: this.getPlayerEquipment(),
      equippedItems: this.getEquippedItems(),
      forgeStats: this.getForgeStats(),
      strengthenInfo: this.getStrengthenableEquipment(),
      // 洞天福地系统数据
      mapAreas: this.getMapAreas(),
      currentArea: this.getCurrentArea(),
      mapStats: this.getMapStats()
    };
  }

  // ============ 邮件系统方法 ============
  getMailSystem() {
    if (!this.mailSystem) {
      this.mailSystem = new MailSystem(gameState);
    }
    return this.mailSystem;
  }

  // ============ 炼丹系统方法 ============
  getAlchemySystem() {
    if (!this.alchemySystem) {
      this.alchemySystem = new AlchemySystem();
      this.alchemySystem.init();
    }
    return this.alchemySystem;
  }

  /**
   * 获取所有丹方
   */
  getFormulas() {
    return this.getAlchemySystem().getFormulaList();
  }

  /**
   * 检查是否可以炼制指定丹药
   */
  canCraft(pillId) {
    return this.getAlchemySystem().canCraft(pillId);
  }

  /**
   * 炼制丹药
   */
  craftPill(pillId) {
    return this.getAlchemySystem().craft(pillId);
  }

  /**
   * 使用丹药
   */
  usePill(pillId) {
    return this.getAlchemySystem().usePill(pillId);
  }

  /**
   * 获取玩家拥有的丹药
   */
  getPlayerPills() {
    return this.getAlchemySystem().getPlayerPills();
  }

  /**
   * 获取炼丹统计
   */
  getAlchemyStats() {
    return this.getAlchemySystem().getStats();
  }

  /**
   * 获取所有邮件
   */
  getMails(options = {}) {
    return this.getMailSystem().getMails(options);
  }

  /**
   * 获取未读邮件数量
   */
  getUnreadMailCount() {
    return this.getMailSystem().getUnreadCount();
  }

  /**
   * 发送邮件
   */
  sendMail(mailOptions) {
    return this.getMailSystem().sendMail(mailOptions);
  }

  /**
   * 标记邮件为已读
   */
  markMailAsRead(id) {
    return this.getMailSystem().markAsRead(id);
  }

  /**
   * 删除邮件
   */
  deleteMail(id) {
    return this.getMailSystem().deleteMail(id);
  }

  /**
   * 领取邮件附件
   */
  claimMailAttachment(id) {
    return this.getMailSystem().claimAttachment(id);
  }

  /**
   * 一键领取所有可领取附件
   */
  claimAllMailAttachments() {
    return this.getMailSystem().claimAll();
  }

  /**
   * 清理过期邮件
   */
  cleanExpiredMails() {
    return this.getMailSystem().cleanExpired();
  }

  /**
   * 获取邮件详情
   */
  getMailDetail(id) {
    return this.getMailSystem().getMailDetail(id);
  }

  /**
   * 获取邮件统计
   */
  getMailStats() {
    return this.getMailSystem().getMailStats();
  }

  // ============ 自动发送邮件场景 ============
  
  /**
   * 发送签到奖励邮件
   */
  sendDailySignInMail(day, rewards) {
    sendDailySignInMail(gameState, day, rewards);
  }

  /**
   * 发送成就奖励邮件
   */
  sendAchievementMail(achievementName, rewards) {
    sendAchievementMail(gameState, achievementName, rewards);
  }

  /**
   * 发送离线收益邮件
   */
  sendOfflineEarningsMail(offlineSeconds, spiritGained, expGained, stonesGained) {
    sendOfflineEarningsMail(gameState, offlineSeconds, spiritGained, expGained, stonesGained);
  }

  /**
   * 发送系统邮件
   */
  sendSystemMail(title, content) {
    sendSystemMail(gameState, title, content);
  }

  // ============ 签到系统方法 ============
  
  /**
   * 获取签到状态
   */
  getSigninStatus() {
    if (typeof signinSystem !== 'undefined') {
      return signinSystem.getStatus();
    }
    return null;
  }

  /**
   * 检查今天是否可以签到
   */
  canSignin() {
    if (typeof signinSystem !== 'undefined') {
      return signinSystem.canSignin();
    }
    return { canSignin: false, message: '签到系统未加载' };
  }

  /**
   * 执行签到
   */
  doSignin() {
    if (typeof signinSystem !== 'undefined') {
      const result = signinSystem.signin();
      
      // 更新统计
      if (result.success) {
        gameState.stats.totalSignins = (gameState.stats.totalSignins || 0) + 1;
      }
      
      return result;
    }
    return { success: false, message: '签到系统未加载' };
  }

  /**
   * 领取累计签到奖励
   * @param {number} days - 累计天数
   */
  claimCumulativeReward(days) {
    if (typeof signinSystem !== 'undefined') {
      return signinSystem.claimCumulativeReward(days);
    }
    return { success: false, message: '签到系统未加载' };
  }

  /**
   * 获取今日签到奖励配置
   */
  getTodayReward() {
    if (typeof signinSystem !== 'undefined') {
      const status = signinSystem.getStatus();
      return status.dailyRewards[status.currentDay - 1];
    }
    return null;
  }

  /**
   * 获取可领取的累计奖励
   */
  getAvailableCumulativeRewards() {
    if (typeof signinSystem !== 'undefined') {
      return signinSystem.checkCumulativeRewards();
    }
    return [];
  }

  // ============ 炼器系统方法 ============

  /**
   * 获取所有配方
   */
  getForgeRecipes() {
    if (typeof forgeSystem !== 'undefined') {
      return forgeSystem.getRecipes();
    }
    return [];
  }

  /**
   * 按类型获取配方
   */
  getForgeRecipesByType(type) {
    if (typeof forgeSystem !== 'undefined') {
      return forgeSystem.getRecipesByType(type);
    }
    return [];
  }

  /**
   * 检查是否可以打造指定装备
   */
  canForge(recipeId) {
    if (typeof forgeSystem !== 'undefined') {
      return forgeSystem.canForge(recipeId);
    }
    return { success: false, message: '炼器系统未加载' };
  }

  /**
   * 打造装备
   */
  forgeEquipment(recipeId) {
    if (typeof forgeSystem !== 'undefined') {
      const result = forgeSystem.forge(recipeId);
      if (result.success) {
        // 重新计算玩家属性
        const s = this.calculatePlayerStats();
        gameState.player.atk = s.atk;
        gameState.player.def = s.def;
        gameState.player.maxHp = s.maxHp;
        gameState.player.hp = Math.min(gameState.player.hp, s.maxHp);
      }
      return result;
    }
    return { success: false, message: '炼器系统未加载' };
  }

  /**
   * 获取玩家所有装备
   */
  getPlayerEquipment() {
    if (typeof forgeSystem !== 'undefined') {
      return forgeSystem.getPlayerEquipment();
    }
    return [];
  }

  /**
   * 装备物品到槽位
   */
  equipItem(equipmentId) {
    if (typeof forgeSystem !== 'undefined') {
      const result = forgeSystem.equipItem(equipmentId);
      if (result.success) {
        // 重新计算玩家属性
        const s = this.calculatePlayerStats();
        gameState.player.atk = s.atk;
        gameState.player.def = s.def;
        gameState.player.maxHp = s.maxHp;
        gameState.player.hp = Math.min(gameState.player.hp, s.maxHp);
      }
      return result;
    }
    return { success: false, message: '炼器系统未加载' };
  }

  /**
   * 卸下装备
   */
  unequipItem(slot) {
    if (typeof forgeSystem !== 'undefined') {
      const result = forgeSystem.unequipItem(slot);
      if (result.success) {
        // 重新计算玩家属性
        const s = this.calculatePlayerStats();
        gameState.player.atk = s.atk;
        gameState.player.def = s.def;
        gameState.player.maxHp = s.maxHp;
      }
      return result;
    }
    return { success: false, message: '炼器系统未加载' };
  }

  /**
   * 获取当前穿戴的装备
   */
  getEquippedItems() {
    if (typeof forgeSystem !== 'undefined') {
      return forgeSystem.getEquippedItems();
    }
    return {};
  }

  /**
   * 回收装备
   */
  recycleEquipment(equipmentId) {
    if (typeof forgeSystem !== 'undefined') {
      const result = forgeSystem.recycleEquipment(equipmentId);
      if (result.success) {
        // 重新计算玩家属性
        const s = this.calculatePlayerStats();
        gameState.player.atk = s.atk;
        gameState.player.def = s.def;
        gameState.player.maxHp = s.maxHp;
      }
      return result;
    }
    return { success: false, message: '炼器系统未加载' };
  }

  /**
   * 获取炼器系统统计
   */
  getForgeStats() {
    if (typeof forgeSystem !== 'undefined') {
      return forgeSystem.getStats();
    }
    return {};
  }

  /**
   * 获取材料类型
   */
  getMaterialTypes() {
    if (typeof forgeSystem !== 'undefined') {
      return forgeSystem.getMaterialTypes();
    }
    return {};
  }

  // ==================== 装备强化系统方法 ====================

  /**
   * 获取强化消耗
   * @param {number} level - 当前强化等级
   * @returns {object} - 消耗对象
   */
  getStrengthenCost(level) {
    if (typeof forgeSystem !== 'undefined') {
      return forgeSystem.getStrengthenCost(level);
    }
    return { strengthenStones: 0, spiritStones: 0 };
  }

  /**
   * 获取强化成功率
   * @param {number} level - 当前强化等级
   * @returns {number} - 成功率（0-100）
   */
  getStrengthenSuccessRate(level) {
    if (typeof forgeSystem !== 'undefined') {
      return forgeSystem.getStrengthenSuccessRate(level);
    }
    return 0;
  }

  /**
   * 检查是否可以强化装备
   * @param {number} equipmentId - 装备ID
   * @returns {object} - 检查结果
   */
  canStrengthen(equipmentId) {
    if (typeof forgeSystem !== 'undefined') {
      return forgeSystem.canStrengthen(equipmentId);
    }
    return { success: false, message: '炼器系统未加载' };
  }

  /**
   * 执行装备强化
   * @param {number} equipmentId - 装备ID
   * @returns {object} - 强化结果
   */
  strengthenEquipment(equipmentId) {
    if (typeof forgeSystem !== 'undefined') {
      const result = forgeSystem.strengthen(equipmentId);
      if (result.success || result.success === false) {
        // 重新计算玩家属性
        const s = this.calculatePlayerStats();
        gameState.player.atk = s.atk;
        gameState.player.def = s.def;
        gameState.player.maxHp = s.maxHp;
        gameState.player.hp = Math.min(gameState.player.hp, s.maxHp);
      }
      return result;
    }
    return { success: false, message: '炼器系统未加载' };
  }

  /**
   * 获取装备强化信息
   * @param {number} equipmentId - 装备ID
   * @returns {object} - 强化信息
   */
  getStrengthenInfo(equipmentId) {
    if (typeof forgeSystem !== 'undefined') {
      return forgeSystem.getStrengthenInfo(equipmentId);
    }
    return null;
  }

  /**
   * 获取所有可强化的装备列表
   * @returns {array} - 可强化装备列表
   */
  getStrengthenableEquipment() {
    if (typeof forgeSystem !== 'undefined') {
      return forgeSystem.getStrengthenableEquipment();
    }
    return [];
  }

  subscribe(cb) { this.listeners.push(cb); }
  notifyListeners() { this.listeners.forEach(cb => cb(this.getState())); }
}

window.CultivationGame = CultivationGame;
