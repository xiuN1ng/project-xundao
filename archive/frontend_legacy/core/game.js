/**
 * 挂机修仙 - 核心游戏引擎 v2.3
 * 集成法宝系统
 */

let gameState = {
  player: {
    name: '无名修士',
    spirit: 0, maxSpirit: 10, spiritRate: 1,
    realm: '凡人', realmLevel: 0,
    level: 1, experience: 0, requiredExp: 100,
    spiritStones: 0, cultivationTime: 0,
    idleMode: true, idleStartTime: 0, totalIdleTime: 0,
    bonuses: {},
    techniques: { cultivation: 'breath', combat: 'strike', defense: 'guard', auxiliary: null },
    techniquePoints: 0,
    skillPoints: 0,
    skillBonuses: { spirit_rate: 0, atk: 0, def: 0, max_hp: 0, hp_regen: 0, heal_bonus: 0, crit_rate: 0, crit_damage: 0, fire_dmg: 0, thunder_dmg: 0, void_dmg: 0, all_stats: 0, exp_rate: 0, drop_rate: 0, damage_reduction: 0 },
    hp: 50, maxHp: 50, atk: 5, def: 0,
    spiritRoot: '五行杂灵根',
    equipment: { weapon: null, armor: null, accessory: null },
    pills: { cooldowns: {} },
    adventure: { active: false, type: null, startTime: 0 }
  },
  cave: { buildings: {}, disciples: {}, resources: { herbs: 0, pills: 0, materials: 0, equipment: 0 }, lastCollect: 0 },
  stats: { totalSpirit: 0, totalSpiritStones: 0, offlineEarnings: 0, realmBreaks: 0, totalOfflineTime: 0, totalIdleGains: 0, techniquesLearned: 0, combatWins: 0, monstersKilled: 0, dungeonsCleared: 0, totalDamage: 0, highestDamage: 0, adventuresCompleted: 0, chancesTriggered: 0 },
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
    let bonus = { atk: 0, def: 0 };
    if (e.weapon && EQUIPMENT_DATA.weapon[e.weapon]) { bonus.atk += EQUIPMENT_DATA.weapon[e.weapon].atk; bonus.def += EQUIPMENT_DATA.weapon[e.weapon].def; }
    if (e.armor && EQUIPMENT_DATA.armor[e.armor]) { bonus.atk += EQUIPMENT_DATA.armor[e.armor].atk; bonus.def += EQUIPMENT_DATA.armor[e.armor].def; }
    if (e.accessory && EQUIPMENT_DATA.accessory[e.accessory]) { bonus.atk += EQUIPMENT_DATA.accessory[e.accessory].atk; bonus.def += EQUIPMENT_DATA.accessory[e.accessory].def; }
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

  getSkillBonus() {
    const p = gameState.player;
    const skill = p.skillBonuses || {};
    return {
      spiritMultiplier: 1 + (skill.spirit_rate || 0),
      atkMultiplier: 1 + (skill.atk || 0) + (skill.all_stats || 0),
      defMultiplier: 1 + (skill.def || 0) + (skill.all_stats || 0),
      hpMultiplier: 1 + (skill.max_hp || 0) + (skill.all_stats || 0),
      expMultiplier: 1 + (skill.exp_rate || 0),
      dropMultiplier: 1 + (skill.drop_rate || 0)
    };
  }

  calculatePlayerStats() {
    const p = gameState.player;
    const r = this.getRealmData(p.realm);
    const root = this.getSpiritRootBonus();
    const equip = this.getEquipmentBonus();
    const tech = this.getTechniqueBonus();
    const cave = this.getCaveBonus();
    const pill = this.getPillBonus();
    const beast = this.getBeastBonus(); // 灵兽加成
    
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
    
    // 灵兽加成
    atk *= beast.atkMultiplier;
    def *= beast.defMultiplier;
    spiritRate *= beast.spiritMultiplier;
    
    // 技能树加成
    const skill = this.getSkillBonus();
    atk *= skill.atkMultiplier;
    def *= skill.defMultiplier;
    hp *= skill.hpMultiplier;
    maxSpirit *= skill.hpMultiplier;
    spiritRate *= skill.spiritMultiplier;
    
    // 时装加成 (从UI层获取)
    let fashionBonus = { atk: 0, def: 0, spirit: 0 };
    try {
      if (typeof getFashionBonus === 'function') {
        fashionBonus = getFashionBonus();
      }
    } catch (e) {}
    atk += fashionBonus.atk;
    def += fashionBonus.def;
    spiritRate += fashionBonus.spirit;
    
    return { hp: Math.floor(hp), maxHp: Math.floor(maxSpirit), atk: Math.floor(atk), def: Math.floor(def), spiritRate: Math.floor(spiritRate), maxSpirit: Math.floor(maxSpirit) };
  }

  // 获取灵兽加成
  getBeastBonus() {
    const p = gameState.player;
    let b = { atkMultiplier: 1, defMultiplier: 1, spiritMultiplier: 1 };
    
    if (p.beasts && p.beasts.length > 0) {
      // 每只灵兽提供基础加成
      const baseBonus = 0.05; // 5% 全属性加成
      const beastCount = p.beasts.length;
      
      b.atkMultiplier += baseBonus * beastCount;
      b.defMultiplier += baseBonus * beastCount;
      b.spiritMultiplier += baseBonus * beastCount;
      
      // 根据灵兽等级提供额外加成
      for (const beast of p.beasts) {
        const levelBonus = Math.floor(beast.level / 10) * 0.02;
        b.atkMultiplier += levelBonus;
        b.defMultiplier += levelBonus;
        b.spiritMultiplier += levelBonus;
        
        // 亲密度加成
        if (beast.affection >= 80) {
          b.atkMultiplier += 0.05;
          b.defMultiplier += 0.05;
        }
      }
    }
    
    return b;
  }

  getTechniqueBonus() {
    const p = gameState.player;
    let b = { spiritMultiplier: 1, atkMultiplier: 1, defMultiplier: 1, stoneMultiplier: 1, expMultiplier: 1 };
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
    this.notifyListeners();
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
    if (!ADVENTURE_DATA.types[type]) { if (typeof showToast === 'function') showToast('历练类型不存在', 'error'); return { success: false, message: '历练类型不存在' }; }
    if (p.adventure.active) { if (typeof showToast === 'function') showToast('已有进行中的历练', 'warning'); return { success: false, message: '已有进行中的历练' }; }
    p.adventure = { active: true, type, startTime: Date.now() };
    if (typeof showToast === 'function') showToast(`开始${type}...`, 'info');
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
    if (!data || !data[item]) { if (typeof showToast === 'function') showToast('装备不存在', 'error'); return { success: false, message: '装备不存在' }; }
    if (p.spiritStones < data[item].cost) { if (typeof showToast === 'function') showToast(`需要 ${data[item].cost} 灵石`, 'error'); return { success: false, message: `需要 ${data[item].cost} 灵石` }; }
    p.spiritStones -= data[item].cost;
    p.equipment[slot] = item;
    const s = this.calculatePlayerStats();
    p.atk = s.atk; p.def = s.def;
    if (typeof showToast === 'function') showToast(`购买 ${data[item].name} 成功!`, 'success');
    return { success: true, message: `购买 ${data[item].name} 成功!` };
  }

  usePill(type, id) {
    const p = gameState.player;
    const data = PILLS_DATA[type];
    if (!data || !data[id]) { if (typeof showToast === 'function') showToast('丹药不存在', 'error'); return { success: false, message: '丹药不存在' }; }
    const pill = data[id];
    const now = Date.now();
    if (p.pills.cooldowns[id] && p.pills.cooldowns[id] > now) { if (typeof showToast === 'function') showToast('冷却中', 'warning'); return { success: false, message: '冷却中' }; }
    if (p.spiritStones < pill.cost) { if (typeof showToast === 'function') showToast(`需要 ${pill.cost} 灵石`, 'error'); return { success: false, message: `需要 ${pill.cost} 灵石` }; }
    p.spiritStones -= pill.cost;
    p.pills.cooldowns[id] = now + pill.cooldown * 1000;
    if (pill.effect === 'spirit') p.spirit = Math.min(p.spirit + pill.value, p.maxSpirit);
    if (pill.effect === 'heal') p.hp = Math.min(p.hp + Math.floor(p.maxHp * pill.value), p.maxHp);
    if (pill.effect === 'exp_boost') { p.experience += pill.value; this.gainExperience(0); }
    if (typeof showToast === 'function') showToast(`使用 ${pill.name} 成功!`, 'success');
    return { success: true, message: `使用 ${pill.name} 成功!` };
  }

  changeSpiritRoot(rootName) {
    const p = gameState.player;
    const data = SPIRIT_ROOT_DATA[rootName];
    if (!data) { if (typeof showToast === 'function') showToast('灵根不存在', 'error'); return { success: false, message: '灵根不存在' }; }
    if (p.realmLevel < data.realm_req) { if (typeof showToast === 'function') showToast('境界不足', 'error'); return { success: false, message: '境界不足' }; }
    p.spiritRoot = rootName;
    const s = this.calculatePlayerStats();
    p.atk = s.atk; p.def = s.def;
    if (typeof showToast === 'function') showToast(`切换为 ${rootName} 成功!`, 'success');
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
    p.experience += amount;
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
      // 技能点奖励：每3级获得1点技能点
      if (p.level % 3 === 0) {
        p.skillPoints = (p.skillPoints || 0) + 1;
        if (typeof showToast === 'function') showToast(`升级奖励：获得 1 点技能点！`, 'info');
      }
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
    if (!m) { if (typeof showToast === 'function') showToast('怪物不存在', 'error'); return { success: false, message: '怪物不存在' }; }
    if (s.hp <= 0) { if (typeof showToast === 'function') showToast('HP不足', 'error'); return { success: false, message: 'HP不足' }; }
    this.currentBattle = { monster: { ...m, currentHp: m.hp }, playerHp: s.hp, maxPlayerHp: s.maxHp };
    if (typeof showToast === 'function') showToast(`⚔️ 遭遇 ${m.name}!`, 'info');
    return { success: true, message: `⚔️ 遭遇 ${m.name}!` };
  }

  attack() {
    if (!this.currentBattle) { if (typeof showToast === 'function') showToast('没有战斗', 'warning'); return { success: false, message: '没有战斗' }; }
    const s = this.calculatePlayerStats();
    const b = this.currentBattle;
    let dmg = Math.max(1, s.atk - b.monster.def * 0.3) * (Math.random() < 0.1 ? 1.5 : 1);
    b.monster.currentHp -= dmg; gameState.stats.totalDamage += dmg; gameState.stats.highestDamage = Math.max(gameState.stats.highestDamage, dmg);
    if (b.monster.currentHp > 0) b.playerHp -= Math.max(1, b.monster.atk - s.def * 0.3);
    if (b.monster.currentHp <= 0) {
      const exp = Math.floor(b.monster.exp * this.getTechniqueBonus().expMultiplier);
      const stones = Math.floor(b.monster.stones * this.getTechniqueBonus().stoneMultiplier);
      gameState.player.experience += exp; gameState.player.spiritStones += stones; gameState.stats.combatWins++; gameState.stats.monstersKilled++; this.gainExperience(0);
      this.currentBattle = null;
      if (typeof showToast === 'function') showToast(`🎉 击败 ${b.monster.name}! +${exp}经验 +${stones}灵石`, 'success');
      return { success: true, message: `🎉 击败 ${b.monster.name}! +${exp}经验 +${stones}灵石`, win: true };
    }
    if (b.playerHp <= 0) { gameState.player.spirit = 0; this.currentBattle = null; if (typeof showToast === 'function') showToast('💀 战败!', 'error'); return { success: true, message: '💀 战败!', win: false }; }
    if (typeof showToast === 'function') showToast(`对${b.monster.name}造成${Math.floor(dmg)}伤害`, 'info');
    return { success: true, message: `对${b.monster.name}造成${Math.floor(dmg)}伤害`, battle: b };
  }

  flee() { 
    if (!this.currentBattle) { if (typeof showToast === 'function') showToast('没有战斗', 'warning'); return { success: false, message: '没有战斗' }; }
    const success = Math.random() > 0.7;
    if (success) {
      this.currentBattle = null;
      if (typeof showToast === 'function') showToast('🏃 逃跑成功', 'info');
      return { success: true, message: '🏃 逃跑成功' };
    } else {
      if (typeof showToast === 'function') showToast('逃跑失败!', 'error');
      return { success: false, message: '逃跑失败!' };
    }
  }

  challengeDungeon(dungeonId) {
    const d = DUNGEON_DATA[dungeonId];
    if (!d) { if (typeof showToast === 'function') showToast('副本不存在', 'error'); return { success: false, message: '副本不存在' }; }
    if (gameState.player.realmLevel < d.min_realm) { if (typeof showToast === 'function') showToast('境界不足', 'error'); return { success: false, message: '境界不足' }; }
    const s = this.calculatePlayerStats();
    let exp = 0, stones = 0, wins = 0;
    for (let i = 0; i < d.waves; i++) {
      const m = MONSTER_DATA[dungeonId]?.monsters.find(x => x.id === d.monster_pool[i % d.monster_pool.length]) || { hp: 100, atk: 10, def: 5, exp: 50, stones: 30 };
      let mhp = m.hp, php = s.hp;
      while (mhp > 0 && php > 0) { mhp -= Math.max(1, s.atk - m.def * 0.3); if (mhp > 0) php -= Math.max(1, m.atk - s.def * 0.3); }
      if (mhp <= 0) { exp += Math.floor(m.exp * this.getTechniqueBonus().expMultiplier); stones += Math.floor(m.stones * this.getTechniqueBonus().stoneMultiplier); wins++; } else break;
    }
    gameState.player.experience += exp; gameState.player.spiritStones += stones;
    if (wins === d.waves) { gameState.stats.dungeonsCleared++; gameState.stats.combatWins++; this.gainExperience(0); if (typeof showToast === 'function') showToast(`🏆 通关${d.name}! +${exp}经验 +${stones}灵石`, 'success'); return { success: true, message: `🏆 通关${d.name}! +${exp}经验 +${stones}灵石` }; }
    if (typeof showToast === 'function') showToast(`挑战失败，击败${wins}/${d.waves}波`, 'warning');
    return { success: true, message: `挑战失败，击败${wins}/${d.waves}波` };
  }

  manualCultivate() { 
    const p = gameState.player; 
    const gain = Math.floor(this.calculatePlayerStats().spiritRate * 5); 
    p.spirit = Math.min(p.spirit + gain, p.maxSpirit); 
    gameState.stats.totalSpirit += gain; 
    this.gainExperience(gain * 0.5 * this.getTechniqueBonus().expMultiplier); 
    // UI反馈
    if (typeof showToast === 'function') showToast(`修炼 +${gain} 灵气`, 'success');
    return gain; 
  }

  breakRealm() {
    const p = gameState.player;
    const realms = Object.keys(REALM_DATA);
    const idx = realms.indexOf(p.realm);
    const next = realms[idx + 1];
    if (!next) { if (typeof showToast === 'function') showToast('已达最高境界!', 'warning'); return { success: false, message: '已达最高境界!' }; }
    if (p.spirit < REALM_DATA[next].cultivation_req) { if (typeof showToast === 'function') showToast(`需要 ${REALM_DATA[next].cultivation_req} 灵气才能突破`, 'error'); return { success: false, message: `需要 ${REALM_DATA[next].cultivation_req} 灵气` }; }
    p.realm = next; p.realmLevel = REALM_DATA[next].level; p.spirit = 0; p.maxSpirit = REALM_DATA[next].spirit_base; p.spiritRate = REALM_DATA[next].spirit_rate; p.maxHp = REALM_DATA[next].hp_base; p.hp = p.maxHp; p.atk = REALM_DATA[next].atk_base; p.def = REALM_DATA[next].def_base; gameState.stats.realmBreaks++;
    if (typeof showToast === 'function') showToast(`🎉 突破到 ${next}!`, 'success');
    return { success: true, message: `🎉 突破到 ${next}!` };
  }

  upgradeSpiritCap() { 
    const p = gameState.player; 
    const cost = Math.floor(10 * Math.pow(1.5, p.level)); 
    if (p.spiritStones < cost) { if (typeof showToast === 'function') showToast(`需要 ${cost} 灵石`, 'error'); return { success: false, message: `需要 ${cost} 灵石` }; } 
    p.spiritStones -= cost; 
    p.maxSpirit = Math.floor(p.maxSpirit * 1.5); 
    if (typeof showToast === 'function') showToast(`灵气上限提升至 ${p.maxSpirit}`, 'success');
    return { success: true, message: `灵气上限 ${p.maxSpirit}` }; 
  }

  upgradeBuilding(id) {
    const p = gameState.player;
    const c = gameState.cave;
    const cfg = BUILDING_DATA[id];
    if (!cfg) { if (typeof showToast === 'function') showToast('建筑不存在', 'error'); return { success: false, message: '建筑不存在' }; }
    const lvl = c.buildings[id] || 0;
    if (lvl >= cfg.max_level) { if (typeof showToast === 'function') showToast('已满级', 'warning'); return { success: false, message: '已满级' }; }
    const cost = Math.floor(cfg.base_cost * Math.pow(cfg.cost_factor, lvl));
    if (p.spiritStones < cost) { if (typeof showToast === 'function') showToast(`需要 ${cost} 灵石`, 'error'); return { success: false, message: `需要 ${cost} 灵石` }; }
    p.spiritStones -= cost; c.buildings[id] = lvl + 1;
    if (typeof showToast === 'function') showToast(`🏠 ${cfg.name} 升级至 Lv.${lvl + 1}`, 'success');
    return { success: true, message: `🏠 ${cfg.name} Lv.${lvl + 1}` };
  }

  recruitDisciple(type) {
    const p = gameState.player;
    const c = gameState.cave;
    const cfg = DISCIPLE_DATA[type];
    if (!cfg) { if (typeof showToast === 'function') showToast('类型不存在', 'error'); return { success: false, message: '类型不存在' }; }
    const cnt = c.disciples[type] || 0;
    if (cnt >= cfg.max_count) { if (typeof showToast === 'function') showToast('已满员', 'warning'); return { success: false, message: '已满员' }; }
    const cost = Math.floor(cfg.base_cost * Math.pow(cfg.cost_factor, cnt));
    if (p.spiritStones < cost) { if (typeof showToast === 'function') showToast(`需要 ${cost} 灵石`, 'error'); return { success: false, message: `需要 ${cost} 灵石` }; }
    p.spiritStones -= cost; c.disciples[type] = cnt + 1;
    if (typeof showToast === 'function') showToast(`👤 成功招募 ${cfg.name}`, 'success');
    return { success: true, message: `👤 招募 ${cfg.name}` };
  }

  collectCaveResources() {
    const c = gameState.cave;
    const v = GAME_BALANCE.economy;
    const total = Math.floor(c.resources.herbs) * v.herb_value + Math.floor(c.resources.pills) * v.pill_value + Math.floor(c.resources.materials) * v.material_value + Math.floor(c.resources.equipment) * v.equipment_value;
    if (total === 0) { if (typeof showToast === 'function') showToast('没有可收集的资源', 'warning'); return { success: false, message: '没有可收集的资源' }; }
    c.resources.herbs = 0; c.resources.pills = 0; c.resources.materials = 0; c.resources.equipment = 0;
    gameState.player.spiritStones += total;
    if (typeof showToast === 'function') showToast(`📦 收集成功 +${total} 灵石`, 'success');
    return { success: true, message: `📦 +${total} 灵石` };
  }

  learnTechnique(cat, id) {
    const p = gameState.player;
    const tech = TECHNIQUE_DATA[cat]?.effects[id];
    if (!tech) { if (typeof showToast === 'function') showToast('功法不存在', 'error'); return { success: false, message: '功法不存在' }; }
    if (p.realmLevel < tech.realm_req) { if (typeof showToast === 'function') showToast('境界不足', 'error'); return { success: false, message: '境界不足' }; }
    if (p.spiritStones < tech.cost) { if (typeof showToast === 'function') showToast(`需要 ${tech.cost} 灵石`, 'error'); return { success: false, message: `需要 ${tech.cost} 灵石` }; }
    p.spiritStones -= tech.cost; p.techniques[cat] = id; gameState.stats.techniquesLearned++;
    if (typeof showToast === 'function') showToast(`✅ 学会 ${tech.name}`, 'success');
    return { success: true, message: `✅ 学会 ${tech.name}` };
  }

  calculateOfflineEarnings(sec) { const r = this.calculatePlayerStats(); let rate = r.spiritRate; if (gameState.player.bonuses.doubleSpirit) rate *= 2; return Math.floor(rate * sec * 0.5); }

  saveGame() {
    try {
      if (gameState.player.idleMode && gameState.player.idleStartTime > 0) {
        gameState.player.totalIdleTime += Math.floor((Date.now() - gameState.player.idleStartTime) / 1000);
        gameState.player.idleStartTime = Date.now();
      }
      // 保存境界副副本数据
      if (typeof saveRealmDungeonData === 'function') {
        saveRealmDungeonData();
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
        // 时装系统初始化
        if (!gameState.player.fashion) gameState.player.fashion = { head: null, body: null, weapon: null, aura: null };
        if (!gameState.player.fashion_inventory) gameState.player.fashion_inventory = {};
        // 宗门系统初始化
        if (!gameState.player.sect) gameState.player.sect = null;
        // 技能树系统初始化
        if (!gameState.player.skillPoints) gameState.player.skillPoints = 0;
        if (!gameState.player.skillBonuses) gameState.player.skillBonuses = { spirit_rate: 0, atk: 0, def: 0, max_hp: 0, hp_regen: 0, heal_bonus: 0, crit_rate: 0, crit_damage: 0, fire_dmg: 0, thunder_dmg: 0, void_dmg: 0, all_stats: 0, exp_rate: 0, drop_rate: 0, damage_reduction: 0 };
        if (!gameState.player.skills) gameState.player.skills = {};
        // 统计数据初始化
        if (!gameState.stats.artifactsForged) { gameState.stats.artifactsForged = 0; gameState.stats.artifactsRecycled = 0; gameState.stats.heavenTreasuresUsed = 0; }
        if (!gameState.stats.beastsCaptured) gameState.stats.beastsCaptured = 0;
        if (!gameState.stats.sectsCreated) gameState.stats.sectsCreated = 0;
        if (!gameState.stats.worldBossKills) gameState.stats.worldBossKills = 0;
        if (!gameState.stats.marketSales) gameState.stats.marketSales = 0;
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
    if (!p.owned_artifacts) { if (typeof showToast === 'function') showToast('没有法宝', 'error'); return { success: false, message: '没有法宝' }; }
    const artifact = p.owned_artifacts.find(a => a.id === artifactId);
    if (!artifact) { if (typeof showToast === 'function') showToast('法宝不存在', 'error'); return { success: false, message: '法宝不存在' }; }
    p.artifact_equipment = p.artifact_equipment || { weapon: null, armor: null, accessory: null, companion: null };
    p.artifact_equipment[slot] = artifact;
    if (typeof showToast === 'function') showToast(`装备 ${artifact.name} 成功`, 'success');
    return { success: true, message: '装备成功' };
  }

  upgradeArtifact(artifactId, materials) {
    const p = gameState.player;
    if (!p.owned_artifacts) { if (typeof showToast === 'function') showToast('没有法宝', 'error'); return { success: false, message: '没有法宝' }; }
    const artifact = p.owned_artifacts.find(a => a.id === artifactId);
    if (!artifact) { if (typeof showToast === 'function') showToast('法宝不存在', 'error'); return { success: false, message: '法宝不存在' }; }
    try {
      const result = upgradeArtifact(artifact, materials || []);
      if (result.success) {
        gameState.stats.artifactsForged = (gameState.stats.artifactsForged || 0) + 1;
        if (typeof showToast === 'function') showToast(`升级 ${artifact.name} 成功!`, 'success');
      } else {
        if (typeof showToast === 'function') showToast(result.message || '升级失败', 'error');
      }
      return result;
    } catch(e) { if (typeof showToast === 'function') showToast('升级失败', 'error'); return { success: false, message: '升级失败' }; }
  }

  recycleArtifact(artifactId) {
    const p = gameState.player;
    if (!p.owned_artifacts) { if (typeof showToast === 'function') showToast('没有法宝', 'error'); return { success: false, message: '没有法宝' }; }
    const idx = p.owned_artifacts.findIndex(a => a.id === artifactId);
    if (idx < 0) { if (typeof showToast === 'function') showToast('法宝不存在', 'error'); return { success: false, message: '法宝不存在' }; }
    const artifact = p.owned_artifacts[idx];
    try {
      const result = recycleArtifact(artifact);
      if (result.success) {
        gameState.stats.artifactsRecycled = (gameState.stats.artifactsRecycled || 0) + 1;
        if (typeof showToast === 'function') showToast(`回收 ${artifact.name} 获得 ${result.value} 材料`, 'success');
      } else {
        if (typeof showToast === 'function') showToast(result.message || '回收失败', 'error');
      }
      return result;
    } catch(e) { if (typeof showToast === 'function') showToast('回收失败', 'error'); return { success: false, message: '回收失败' }; }
  }

  forgeArtifact(recipeId) {
    try {
      const result = forgeArtifact(recipeId);
      if (result.success) {
        gameState.stats.artifactsForged = (gameState.stats.artifactsForged || 0) + 1;
        if (typeof showToast === 'function') showToast(`炼制 ${result.name} 成功!`, 'success');
      } else {
        if (typeof showToast === 'function') showToast(result.message || '炼器失败', 'error');
      }
      return result;
    } catch(e) { if (typeof showToast === 'function') showToast('炼器失败', 'error'); return { success: false, message: '炼器失败' }; }
  }

  useHeavenTreasure(treasureId) {
    try {
      const result = useHeavenTreasure(treasureId);
      if (result.success) {
        gameState.stats.heavenTreasuresUsed = (gameState.stats.heavenTreasuresUsed || 0) + 1;
        if (typeof showToast === 'function') showToast(`使用 ${result.name} 成功!`, 'success');
      } else {
        if (typeof showToast === 'function') showToast(result.message || '使用失败', 'error');
      }
      return result;
    } catch(e) { if (typeof showToast === 'function') showToast('使用失败', 'error'); return { success: false, message: '使用失败' }; }
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
    return { ...gameState, realm: r, nextRealm: REALM_DATA[realms[idx + 1]] || null, currentSpiritRate: this.getSpiritRate(), playerStats: this.calculatePlayerStats(), techniqueBonus: this.getTechniqueBonus(), caveBonus: this.getCaveBonus(), idleGainsThisSession: p.idleMode && p.idleStartTime ? Math.floor((Date.now() - p.idleStartTime) / 1000 * this.getSpiritRate()) : 0, availableMonsters: this.getAvailableMonsters(), availableDungeons: this.getAvailableDungeons() };
  }

  subscribe(cb) { this.listeners.push(cb); }
  notifyListeners() { this.listeners.forEach(cb => cb(this.getState())); }
}

window.CultivationGame = CultivationGame;
