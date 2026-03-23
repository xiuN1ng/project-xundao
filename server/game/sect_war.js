/**
 * 宗门战系统（跨服挑战）
 * 
 * 规则：
 * - 宗门战以周为单位进行（周六开启，持续24小时）
 * - 宗门成员可以报名参加
 * - 战斗采用自动化方式（无需玩家实时操作）
 * - 战胜获得宗门贡献和奖励
 * - 宗门排名决定领地和资源产出
 */

const express = require('express');
const router = express.Router();

// 延迟加载依赖
let db, sectStorage, playerStorage, gameConfig;

// 中间件：自动加载依赖
router.use((req, res, next) => {
  loadDependencies();
  next();
});

function loadDependencies() {
  // 加载数据库
  if (!db) {
    try {
      const server = require('../../server');
      db = server.db;
    } catch (e) {
      const Database = require('better-sqlite3');
      const path = require('path');
      const dbPath = path.join(__dirname, '..', 'data', 'game.db');
      db = new Database(dbPath);
    }
  }

  // 加载sectStorage
  if (!sectStorage) {
    try {
      const storage = require('./sect_storage');
      sectStorage = storage.sectStorage;
    } catch (e) {
      console.error('加载sect_storage失败:', e.message);
    }
  }

  // 加载playerStorage
  if (!playerStorage) {
    try {
      const storage = require('./storage');
      playerStorage = storage.playerStorage;
    } catch (e) {
      console.error('加载storage失败:', e.message);
    }
  }

  // 加载gameConfig
  if (!gameConfig) {
    try {
      gameConfig = require('./core/gameConfig');
    } catch (e) {
      console.error('加载gameConfig失败:', e.message);
    }
  }

  return db;
}

// 直接从数据库获取玩家宗门信息
function getPlayerSect(playerId) {
  if (!db) {
    loadDependencies();
  }
  try {
    const sect = db.prepare('SELECT * FROM sect WHERE player_id = ?').get(playerId);
    if (!sect) return null;
    
    // 获取建筑
    const buildings = {};
    const buildingRows = db.prepare('SELECT * FROM sect_buildings WHERE player_id = ?').all(playerId);
    buildingRows.forEach(b => { buildings[b.building_id] = b.level; });
    
    // 获取弟子
    const disciples = db.prepare('SELECT * FROM sect_disciples WHERE player_id = ?').all(playerId);
    
    // 获取技能
    const techs = db.prepare('SELECT tech_id FROM sect_techs WHERE player_id = ?').all(playerId);
    
    return {
      player_id: sect.player_id,
      sect_type: sect.sect_type,
      sect_name: sect.name || sect.sect_name,
      sect_level: sect.level || sect.sect_level || 1,
      sect_exp: sect.exp || sect.sect_exp || 0,
      contribution: sect.contribution || 0,
      buildings,
      disciples: disciples.map(d => ({
        disciple_id: d.disciple_id,
        name: d.disciple_name || d.name,
        class: d.disciple_class,
        level: d.disciple_level || d.level || 1,
      })),
      techs: techs.map(t => t.tech_id),
    };
  } catch (e) {
    console.error('获取玩家宗门失败:', e.message);
    return null;
  }
}

// ==================== 数据库初始化 ====================

function initSectWarTables() {
  if (!db) {
    loadDependencies();
  }

  // 宗门战主表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_war (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      war_name TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status TEXT DEFAULT 'pending',
      winner_sect_id INTEGER,
      total_matches INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 宗门战报名表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_war_signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      war_id INTEGER NOT NULL,
      sect_type TEXT NOT NULL,
      sect_name TEXT NOT NULL,
      player_id INTEGER NOT NULL,
      power INTEGER DEFAULT 0,
      status TEXT DEFAULT 'signed',
      signed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (war_id) REFERENCES sect_war(id)
    )
  `);

  // 宗门战对战表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_war_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      war_id INTEGER NOT NULL,
      round_num INTEGER NOT NULL,
      sect_a_id TEXT NOT NULL,
      sect_a_name TEXT NOT NULL,
      sect_b_id TEXT NOT NULL,
      sect_b_name TEXT NOT NULL,
      winner_id TEXT,
      winner_name TEXT,
      sect_a_power INTEGER DEFAULT 0,
      sect_b_power INTEGER DEFAULT 0,
      reward_contribution INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      battle_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (war_id) REFERENCES sect_war(id)
    )
  `);

  // 宗门排名表（领地和资源）
  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_war_ranking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sect_type TEXT UNIQUE NOT NULL,
      sect_name TEXT NOT NULL,
      war_wins INTEGER DEFAULT 0,
      war_losses INTEGER DEFAULT 0,
      total_power INTEGER DEFAULT 0,
      territory_level INTEGER DEFAULT 1,
      daily_resource_bonus INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 宗门战奖励配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_war_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rank INTEGER UNIQUE NOT NULL,
      rank_name TEXT NOT NULL,
      contribution INTEGER NOT NULL,
      spirit_stones INTEGER DEFAULT 0,
      items TEXT,
      description TEXT
    )
  `);

  // 初始化默认奖励配置
  const existingRewards = db.prepare('SELECT COUNT(*) as count FROM sect_war_rewards').get();
  if (existingRewards.count === 0) {
    const defaultRewards = [
      { rank: 1, rank_name: '冠军', contribution: 10000, spirit_stones: 50000, items: JSON.stringify(['legendary_sword', 'rare_herb']), description: '第一宗门，享全部领地加成' },
      { rank: 2, rank_name: '亚军', contribution: 5000, spirit_stones: 25000, items: JSON.stringify(['rare_sword', 'medium_herb']), description: '第二宗门' },
      { rank: 3, rank_name: '季军', contribution: 3000, spirit_stones: 15000, items: JSON.stringify(['good_sword', 'common_herb']), description: '第三宗门' },
      { rank: 4, rank_name: '第四', contribution: 2000, spirit_stones: 10000, items: '[]', description: '' },
      { rank: 5, rank_name: '第五', contribution: 1500, spirit_stones: 8000, items: '[]', description: '' },
      { rank: 6, rank_name: '第六', contribution: 1000, spirit_stones: 5000, items: '[]', description: '' },
      { rank: 7, rank_name: '第七', contribution: 800, spirit_stones: 3000, items: '[]', description: '' },
      { rank: 8, rank_name: '第八', contribution: 500, spirit_stones: 2000, items: '[]', description: '' },
    ];

    const stmt = db.prepare('INSERT INTO sect_war_rewards (rank, rank_name, contribution, spirit_stones, items, description) VALUES (?, ?, ?, ?, ?, ?)');
    for (const reward of defaultRewards) {
      stmt.run(reward.rank, reward.rank_name, reward.contribution, reward.spirit_stones, reward.items, reward.description);
    }
  }

  // 添加索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sect_war_signups_war ON sect_war_signups(war_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sect_war_matches_war ON sect_war_matches(war_id)`);

  console.log('✅ 宗门战数据库表初始化完成');
}

// 初始化表
initSectWarTables();

// ==================== 宗门战配置 ====================

const SECT_WAR_CONFIG = {
  // 每周六 UTC 0点开始，持续24小时
  warDay: 6, // 周六
  duration: 24, // 小时
  signupDeadline: 2, // 报名截止时间（小时）
  maxSects: 16, // 最大参赛宗门数
  minMembers: 3, // 最少成员数
  autoBattle: true, // 自动战斗
};

// 领地资源加成配置
const TERRITORY_BONUS = {
  1: { resource_bonus: 0.05, description: '资源产出+5%' },
  2: { resource_bonus: 0.10, description: '资源产出+10%' },
  3: { resource_bonus: 0.15, description: '资源产出+15%' },
  4: { resource_bonus: 0.20, description: '资源产出+20%' },
  5: { resource_bonus: 0.30, description: '资源产出+30%' },
};

// ==================== 战斗单位类 ====================

class BattleUnit {
  constructor(id, name, role, level, stats = {}) {
    this.id = id;
    this.name = name;
    this.role = role; // 'tank' | 'dps' | 'healer' | 'support'
    this.level = level;
    
    // 基础属性
    this.maxHp = stats.maxHp || level * 100;
    this.currentHp = this.maxHp;
    this.attack = stats.attack || level * 10;
    this.defense = stats.defense || level * 5;
    this.speed = stats.speed || level * 2;
    this.critRate = stats.critRate || 0.1;
    this.critDamage = stats.critDamage || 1.5;
    
    // 战斗状态
    this.morale = 100; // 士气值 0-100
    this.buffs = []; // 当前Buff
    this.isAlive = true;
    this.totalDamage = 0; // 造成的总伤害
    this.totalHealing = 0; // 治疗总量
  }
  
  // 获取实际属性（考虑Buff）
  getEffectiveStats() {
    let attack = this.attack;
    let defense = this.defense;
    let critRate = this.critRate;
    let critDamage = this.critDamage;
    let speed = this.speed;
    let damageReduction = 0;
    
    for (const buff of this.buffs) {
      if (buff.type === 'attack_up') attack *= (1 + buff.value);
      if (buff.type === 'defense_up') defense *= (1 + buff.value);
      if (buff.type === 'crit_up') critRate += buff.value;
      if (buff.type === 'crit_damage_up') critDamage += buff.value;
      if (buff.type === 'speed_up') speed *= (1 + buff.value);
      if (buff.type === 'damage_reduction') damageReduction += buff.value;
    }
    
    return {
      attack: Math.floor(attack),
      defense: Math.floor(defense),
      critRate: Math.min(0.9, critRate), // 最高90%暴击率
      critDamage,
      speed: Math.floor(speed),
      damageReduction: Math.min(0.8, damageReduction), // 最高80%减伤
    };
  }
  
  // 添加Buff
  addBuff(buff) {
    // 检查是否可叠加
    const existing = this.buffs.find(b => b.type === buff.type && b.stackable);
    if (existing) {
      existing.stack = Math.min(existing.maxStack || 3, existing.stack + 1);
      existing.value = existing.baseValue * existing.stack;
    } else {
      this.buffs.push({ ...buff, stack: 1, baseValue: buff.value });
    }
  }
  
  // 移除过期Buff
  removeExpiredBuffs() {
    const now = Date.now();
    this.buffs = this.buffs.filter(buff => {
      if (buff.duration === undefined) return false;
      return now < buff.expireTime;
    });
  }
  
  // 受到伤害
  takeDamage(damage) {
    const stats = this.getEffectiveStats();
    const actualDamage = Math.max(1, Math.floor(damage * (1 - stats.damageReduction)));
    this.currentHp = Math.max(0, this.currentHp - actualDamage);
    
    // 死亡时士气下降
    if (this.currentHp <= 0) {
      this.isAlive = false;
      this.morale = Math.max(0, this.morale - 30);
    } else {
      // 受伤也会降低少量士气
      this.morale = Math.max(0, this.morale - 2);
    }
    
    return actualDamage;
  }
  
  // 造成伤害
  dealDamage(target, damage) {
    const stats = this.getEffectiveStats();
    const isCrit = Math.random() < stats.critRate;
    let finalDamage = damage;
    
    if (isCrit) {
      finalDamage *= stats.critDamage;
      target.morale = Math.max(0, target.morale - 5); // 暴击降低目标士气
    }
    
    // 基础伤害公式：攻击 - 防御
    const actualDamage = Math.max(1, Math.floor(finalDamage - target.getEffectiveStats().defense * 0.5));
    const damageDealt = target.takeDamage(actualDamage);
    
    this.totalDamage += damageDealt;
    return { damage: damageDealt, isCrit };
  }
  
  // 治疗
  heal(amount) {
    const stats = this.getEffectiveStats();
    const healAmount = Math.floor(amount * (1 + stats.attack * 0.01));
    const actualHeal = Math.min(this.maxHp - this.currentHp, healAmount);
    this.currentHp += actualHeal;
    this.totalHealing += actualHeal;
    this.morale = Math.min(100, this.morale + 3);
    return actualHeal;
  }
  
  // 恢复士气
  restoreMorale(amount) {
    this.morale = Math.min(100, this.morale + amount);
  }
}

// ==================== Buff类型定义 ====================

const BUFF_TYPES = {
  // 增益Buff
  attack_up: { name: '攻击提升', stackable: true, maxStack: 3 },
  defense_up: { name: '防御提升', stackable: true, maxStack: 3 },
  crit_up: { name: '暴击提升', stackable: false },
  crit_damage_up: { name: '暴伤提升', stackable: false },
  speed_up: { name: '加速', stackable: true, maxStack: 2 },
  damage_reduction: { name: '减伤', stackable: true, maxStack: 3 },
  hp_regen: { name: '生命恢复', stackable: false },
  morale_up: { name: '士气高涨', stackable: false },
  
  // 减益Buff
  attack_down: { name: '攻击下降', stackable: true, maxStack: 3 },
  defense_down: { name: '防御下降', stackable: true, maxStack: 3 },
  slow: { name: '减速', stackable: true, maxStack: 2 },
  wound: { name: '伤口', stackable: true, maxStack: 3 },
  morale_down: { name: '士气低落', stackable: false },
};

// ==================== 战斗AI策略 ====================

class BattleAI {
  constructor(side, units) {
    this.side = side; // 'A' 或 'B'
    this.units = units.filter(u => u.isAlive);
    this.morale = this.calculateTeamMorale();
  }
  
  calculateTeamMorale() {
    if (this.units.length === 0) return 0;
    const aliveUnits = this.units.filter(u => u.isAlive);
    if (aliveUnits.length === 0) return 0;
    return Math.floor(aliveUnits.reduce((sum, u) => sum + u.morale, 0) / aliveUnits.length);
  }
  
  // 评估双方实力对比
  evaluateEnemyStrength(enemyAI) {
    const myTotalPower = this.getTeamPower();
    const enemyTotalPower = enemyAI.getTeamPower();
    const ratio = myTotalPower / (enemyTotalPower + 1);
    
    if (ratio > 1.5) return 'much_stronger';
    if (ratio > 1.1) return 'stronger';
    if (ratio > 0.9) return 'balanced';
    if (ratio > 0.7) return 'weaker';
    return 'much_weaker';
  }
  
  getTeamPower() {
    return this.units.filter(u => u.isAlive).reduce((sum, u) => {
      const stats = u.getEffectiveStats();
      return sum + stats.attack + stats.defense * 2 + u.currentHp * 0.5;
    }, 0);
  }
  
  // 获取团队状态评估
  getTeamStatus() {
    const aliveUnits = this.units.filter(u => u.isAlive);
    const totalHp = aliveUnits.reduce((sum, u) => sum + u.currentHp, 0);
    const totalMaxHp = aliveUnits.reduce((sum, u) => sum + u.maxHp, 0);
    const hpPercent = totalMaxHp > 0 ? totalHp / totalMaxHp : 0;
    
    const needsHealer = aliveUnits.some(u => u.role === 'healer');
    const hasTank = aliveUnits.some(u => u.role === 'tank');
    const dpsCount = aliveUnits.filter(u => u.role === 'dps').length;
    
    return {
      aliveCount: aliveUnits.length,
      totalUnits: this.units.length,
      hpPercent,
      morale: this.morale,
      needsHealer,
      hasTank,
      dpsCount,
    };
  }
  
  // 选择最佳行动
  decideAction(enemyUnits, round) {
    const status = this.getTeamStatus();
    const action = {
      primaryTarget: null,
      secondaryTargets: [],
      buffs: [],
      heals: [],
      attacks: [],
    };
    
    // 找出存活的敌人
    const aliveEnemies = enemyUnits.filter(u => u.isAlive);
    if (aliveEnemies.length === 0) return action;
    
    // 根据局势选择策略
    const strategy = this.selectStrategy(status);
    
    switch (strategy) {
      case 'aggressive':
        // 激进策略：优先击杀薄弱单位
        action.primaryTarget = this.findWeakestTarget(aliveEnemies);
        action.secondaryTargets = this.findLowHpTargets(aliveEnemies, 2);
        break;
        
      case 'defensive':
        // 防守策略：优先保护自己
        action.buffs = this.getDefensiveBuffs();
        action.primaryTarget = this.findThreatTarget(aliveEnemies);
        break;
      
      case 'balanced':
        // 平衡策略：兼顾攻防
        action.primaryTarget = this.findBestTarget(aliveEnemies);
        action.buffs = this.getBalancedBuffs();
        break;
        
      case 'desperate':
        // 绝境策略：全力一搏
        action.primaryTarget = this.findLowHpTargets(aliveEnemies, 1)[0] || aliveEnemies[0];
        action.buffs = this.getOffensiveBuffs();
        break;
    }
    
    return action;
  }
  
  // 根据局势选择策略
  selectStrategy(status) {
    if (status.hpPercent < 0.2 || status.morale < 30) {
      return 'desperate';
    }
    if (status.hpPercent < 0.4 || status.morale < 50) {
      return 'defensive';
    }
    if (status.hpPercent > 0.7 && status.morale > 70) {
      return 'aggressive';
    }
    return 'balanced';
  }
  
  // 找到最薄弱的目标（低防御/低血量）
  findWeakestTarget(enemies) {
    return enemies.reduce((weakest, enemy) => {
      const enemyStats = enemy.getEffectiveStats();
      const weakScore = enemyStats.defense + enemy.currentHp * 0.1;
      const weakestScore = weakest ? (weakest.getEffectiveStats().defense + weakest.currentHp * 0.1) : Infinity;
      return weakScore < weakestScore ? enemy : weakest;
    }, null);
  }
  
  // 找到血量最低的目标
  findLowHpTargets(enemies, count) {
    return enemies
      .filter(e => e.isAlive)
      .sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp))
      .slice(0, count);
  }
  
  // 找到威胁最大的目标（高攻击）
  findThreatTarget(enemies) {
    return enemies.reduce((mostThreat, enemy) => {
      const enemyStats = enemy.getEffectiveStats();
      const threat = enemyStats.attack;
      const mostThreatScore = mostThreat ? mostThreat.getEffectiveStats().attack : 0;
      return threat > mostThreatScore ? enemy : mostThreat;
    }, null);
  }
  
  // 找到最佳目标（综合评估）
  findBestTarget(enemies) {
    return enemies.reduce((best, enemy) => {
      const enemyStats = enemy.getEffectiveStats();
      const hpPercent = enemy.currentHp / enemy.maxHp;
      // 优先打血量低的，但也考虑攻击力
      const score = hpPercent * 100 - enemyStats.attack * 0.5;
      const bestScore = best ? (best.currentHp / best.maxHp) * 100 - best.getEffectiveStats().attack * 0.5 : Infinity;
      return score < bestScore ? enemy : best;
    }, null);
  }
  
  // 获取防守型Buff
  getDefensiveBuffs() {
    const buffs = [];
    const aliveUnits = this.units.filter(u => u.isAlive);
    
    // 给最低血的单位加防御
    const lowestHp = aliveUnits.reduce((min, u) => 
      u.currentHp / u.maxHp < min.currentHp / min.maxHp ? u : min
    , aliveUnits[0]);
    
    if (lowestHp) {
      buffs.push({ target: lowestHp, buff: { type: 'defense_up', value: 0.2, duration: 2 } });
    }
    
    // 给DPS加攻击
    aliveUnits.filter(u => u.role === 'dps').forEach(dps => {
      buffs.push({ target: dps, buff: { type: 'attack_up', value: 0.15, duration: 2 } });
    });
    
    return buffs;
  }
  
  // 获取平衡型Buff
  getBalancedBuffs() {
    const buffs = [];
    const aliveUnits = this.units.filter(u => u.isAlive);
    
    // 随机给一个单位加攻
    const dpsUnits = aliveUnits.filter(u => u.role === 'dps');
    const randomDps = dpsUnits[Math.floor(Math.random() * dpsUnits.length)];
    if (randomDps) {
      buffs.push({ target: randomDps, buff: { type: 'attack_up', value: 0.1, duration: 2 } });
    }
    
    return buffs;
  }
  
  // 获取进攻型Buff
  getOffensiveBuffs() {
    const buffs = [];
    const aliveUnits = this.units.filter(u => u.isAlive);
    
    // 所有DPS都加攻击
    aliveUnits.filter(u => u.role === 'dps').forEach(dps => {
      buffs.push({ target: dps, buff: { type: 'attack_up', value: 0.25, duration: 2 } });
      buffs.push({ target: dps, buff: { type: 'crit_up', value: 0.1, duration: 2 } });
    });
    
    return buffs;
  }
  
  // 决定治疗目标
  selectHealTargets() {
    const heals = [];
    const healers = this.units.filter(u => u.isAlive && u.role === 'healer');
    const injuredUnits = this.units.filter(u => u.isAlive && u.currentHp < u.maxHp * 0.7);
    
    if (healers.length > 0 && injuredUnits.length > 0) {
      // 优先治疗血量最低的
      const lowestHp = injuredUnits.reduce((min, u) => 
        u.currentHp / u.maxHp < min.currentHp / min.maxHp ? u : min
      , injuredUnits[0]);
      
      heals.push({ healer: healers[0], target: lowestHp });
    }
    
    return heals;
  }
}

// ==================== 战斗模拟器 ====================

class BattleSimulator {
  constructor(sideAUnits, sideBUnits, battleLog = []) {
    this.sideA = new BattleAI('A', sideAUnits);
    this.sideB = new BattleAI('B', sideBUnits);
    this.log = battleLog;
    this.round = 0;
    this.maxRounds = 30;
    this.isFinished = false;
    this.winner = null;
  }
  
  // 初始化战斗
  init() {
    this.log.push({
      type: 'battle_start',
      message: '⚔️ 战斗开始！',
      timestamp: Date.now(),
    });
    
    // 初始士气
    this.sideA.units.forEach(u => {
      u.morale = 80 + Math.floor(Math.random() * 20);
      this.log.push({
        type: 'morale',
        unit: u.name,
        value: u.morale,
        message: `${u.name} 初始士气: ${u.morale}`,
      });
    });
    
    this.sideB.units.forEach(u => {
      u.morale = 80 + Math.floor(Math.random() * 20);
      this.log.push({
        type: 'morale',
        unit: u.name,
        value: u.morale,
        message: `${u.name} 初始士气: ${u.morale}`,
      });
    });
  }
  
  // 执行一回合
  async executeRound() {
    this.round++;
    
    this.log.push({
      type: 'round_start',
      round: this.round,
      message: `=== 第 ${this.round} 回合 ===`,
    });
    
    // 获取所有存活单位并按速度排序
    const allUnits = [
      ...this.sideA.units.filter(u => u.isAlive).map(u => ({ unit: u, side: 'A' })),
      ...this.sideB.units.filter(u => u.isAlive).map(u => ({ unit: u, side: 'B' })),
    ].sort((a, b) => b.unit.getEffectiveStats().speed - a.unit.getEffectiveStats().speed);
    
    // 移除过期Buff
    allUnits.forEach(({ unit }) => unit.removeExpiredBuffs());
    
    // AI决策
    const actionsA = this.sideA.decideAction(this.sideB.units, this.round);
    const actionsB = this.sideB.decideAction(this.sideA.units, this.round);
    
    // 执行治疗
    await this.executeHeals(actionsA.heals, 'A');
    await this.executeHeals(actionsB.heals, 'B');
    
    // 执行Buff
    await this.executeBuffs(actionsA.buffs, 'A');
    await this.executeBuffs(actionsB.buffs, 'B');
    
    // 执行攻击
    for (const { unit, side } of allUnits) {
      if (!unit.isAlive) continue;
      
      const enemySide = side === 'A' ? this.sideB : this.sideA;
      const aliveEnemies = enemySide.units.filter(u => u.isAlive);
      if (aliveEnemies.length === 0) break;
      
      // 士气影响命中率
      const hitChance = this.calculateHitChance(unit);
      
      if (Math.random() > hitChance) {
        this.log.push({
          type: 'miss',
          attacker: unit.name,
          message: `💨 ${unit.name} 攻击Miss！（士气过低）`,
        });
        continue;
      }
      
      // 选择目标
      let target;
      if (side === 'A' && actionsA.primaryTarget) {
        target = actionsA.primaryTarget.isAlive ? actionsA.primaryTarget : aliveEnemies[0];
      } else if (side === 'B' && actionsB.primaryTarget) {
        target = actionsB.primaryTarget.isAlive ? actionsB.primaryTarget : aliveEnemies[0];
      } else {
        target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
      }
      
      // 执行攻击
      const stats = unit.getEffectiveStats();
      const result = unit.dealDamage(target, stats.attack);
      
      this.log.push({
        type: 'attack',
        attacker: unit.name,
        target: target.name,
        damage: result.damage,
        isCrit: result.isCrit,
        attackerHp: unit.currentHp,
        targetHp: target.currentHp,
        message: result.isCrit 
          ? `💥 ${unit.name} 暴击 ${target.name}！造成 ${result.damage} 伤害！（${target.currentHp}/${target.maxHp}）`
          : `⚔️ ${unit.name} 攻击 ${target.name}，造成 ${result.damage} 伤害！（${target.currentHp}/${target.maxHp}）`,
      });
      
      // 目标死亡
      if (!target.isAlive) {
        this.log.push({
          type: 'kill',
          killer: unit.name,
          victim: target.name,
          message: `💀 ${target.name} 被击杀！`,
        });
        
        // 击杀者士气大振
        unit.morale = Math.min(100, unit.morale + 15);
        this.log.push({
          type: 'morale_boost',
          unit: unit.name,
          value: unit.morale,
          message: `${unit.name} 击杀敌人，士气提升至 ${unit.morale}！`,
        });
      }
      
      // 检查是否结束
      const aAlive = this.sideA.units.filter(u => u.isAlive).length;
      const bAlive = this.sideB.units.filter(u => u.isAlive).length;
      
      if (aAlive === 0 || bAlive === 0) {
        this.isFinished = true;
        this.winner = aAlive > 0 ? 'A' : 'B';
        break;
      }
    }
    
    // 更新团队士气
    this.updateTeamMorale();
    
    // 检查回合上限
    if (this.round >= this.maxRounds) {
      this.isFinished = true;
      this.winner = this.determineWinnerByStats();
    }
    
    // 回合结束
    this.log.push({
      type: 'round_end',
      round: this.round,
      message: `--- 第 ${this.round} 回合结束 ---`,
      a_alive: this.sideA.units.filter(u => u.isAlive).length,
      b_alive: this.sideB.units.filter(u => u.isAlive).length,
    });
  }
  
  // 计算命中率（士气影响）
  calculateHitChance(unit) {
    const baseHit = 0.85;
    const moraleFactor = (unit.morale - 50) / 100; // -0.5 到 0.5
    return Math.min(0.98, Math.max(0.5, baseHit + moraleFactor));
  }
  
  // 执行Buff
  async executeBuffs(buffs, side) {
    for (const { target, buff } of buffs) {
      if (!target.isAlive) continue;
      
      target.addBuff({
        ...buff,
        expireTime: Date.now() + buff.duration * 1000,
      });
      
      const buffName = BUFF_TYPES[buff.type]?.name || buff.type;
      this.log.push({
        type: 'buff',
        target: target.name,
        buff: buffName,
        value: buff.value,
        duration: buff.duration,
        message: `✨ ${target.name} 获得 ${buffName} +${Math.round(buff.value * 100)}%`,
      });
    }
  }
  
  // 执行治疗
  async executeHeals(heals, side) {
    for (const { healer, target } of heals) {
      if (!healer.isAlive || !target.isAlive) continue;
      
      const healAmount = healer.heal(healer.getEffectiveStats().attack * 0.8);
      
      this.log.push({
        type: 'heal',
        healer: healer.name,
        target: target.name,
        amount: healAmount,
        targetHp: target.currentHp,
        message: `💚 ${healer.name} 治疗 ${target.name}，恢复 ${healAmount} HP（${target.currentHp}/${target.maxHp}）`,
      });
    }
  }
  
  // 更新团队士气
  updateTeamMorale() {
    // 存活单位士气平均
    const updateSide = (side) => {
      const alive = side.units.filter(u => u.isAlive);
      if (alive.length === 0) return;
      
      const avgMorale = Math.floor(alive.reduce((sum, u) => sum + u.morale, 0) / alive.length);
      side.morale = avgMorale;
    };
    
    updateSide(this.sideA);
    updateSide(this.sideB);
  }
  
  // 根据统计数据判定胜负
  determineWinnerByStats() {
    const aTotalDamage = this.sideA.units.reduce((sum, u) => sum + u.totalDamage, 0);
    const bTotalDamage = this.sideB.units.reduce((sum, u) => sum + u.totalDamage, 0);
    const aTotalHealing = this.sideA.units.reduce((sum, u) => sum + u.totalHealing, 0);
    const bTotalHealing = this.sideB.units.reduce((sum, u) => sum + u.totalHealing, 0);
    const aAlive = this.sideA.units.filter(u => u.isAlive).length;
    const bAlive = this.sideB.units.filter(u => u.isAlive).length;
    
    // 综合评分
    const scoreA = aTotalDamage * 0.4 + aTotalHealing * 0.3 + aAlive * 100 + this.sideA.morale * 2;
    const scoreB = bTotalDamage * 0.4 + bTotalHealing * 0.3 + bAlive * 100 + this.sideB.morale * 2;
    
    this.log.push({
      type: 'score_calculation',
      message: `比分计算 - A方: ${Math.floor(scoreA)} vs B方: ${Math.floor(scoreB)}`,
      score_a: scoreA,
      score_b: scoreB,
    });
    
    return scoreA > scoreB ? 'A' : 'B';
  }
  
  // 获取战斗结果
  getResult() {
    const winnerSide = this.winner === 'A' ? this.sideA : this.sideB;
    const loserSide = this.winner === 'A' ? this.sideB : this.sideA;
    
    // 计算贡献奖励
    const powerA = this.sideA.getTeamPower();
    const powerB = this.sideB.getTeamPower();
    const baseContribution = 100;
    const contribution = Math.floor(baseContribution + Math.abs(powerA - powerB) / 50);
    
    return {
      winner: this.winner,
      winner_name: winnerSide.units[0]?.name?.replace(/_[AB]$/, '') || '未知',
      loser_name: loserSide.units[0]?.name?.replace(/_[AB]$/, '') || '未知',
      contribution,
      rounds: this.round,
      log: this.log,
      stats: {
        side_a: {
          total_damage: this.sideA.units.reduce((sum, u) => sum + u.totalDamage, 0),
          total_healing: this.sideA.units.reduce((sum, u) => sum + u.totalHealing, 0),
          alive_count: this.sideA.units.filter(u => u.isAlive).length,
          morale: this.sideA.morale,
        },
        side_b: {
          total_damage: this.sideB.units.reduce((sum, u) => sum + u.totalDamage, 0),
          total_healing: this.sideB.units.reduce((sum, u) => sum + u.totalHealing, 0),
          alive_count: this.sideB.units.filter(u => u.isAlive).length,
          morale: this.sideB.morale,
        },
      },
    };
  }
}

// ==================== 辅助函数 ====================

// 获取当前宗门战信息
function getCurrentWar() {
  const now = new Date();
  const war = db.prepare(`
    SELECT * FROM sect_war 
    WHERE start_time <= ? AND end_time >= ?
    ORDER BY id DESC LIMIT 1
  `).get(now.toISOString(), now.toISOString());

  return war;
}

// 获取本周宗门战（如果不存在则创建）
function getOrCreateWeeklyWar() {
  const now = new Date();
  
  // 计算本周六
  const dayOfWeek = now.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  const saturday = new Date(now);
  saturday.setDate(now.getDate() + daysUntilSaturday);
  saturday.setHours(0, 0, 0, 0);

  // 检查是否已存在本周的宗门战
  let war = db.prepare(`
    SELECT * FROM sect_war 
    WHERE start_time >= ?
    ORDER BY id ASC LIMIT 1
  `).get(saturday.toISOString());

  if (!war) {
    // 创建新的宗门战
    const endTime = new Date(saturday);
    endTime.setHours(endTime.getHours() + SECT_WAR_CONFIG.duration);

    db.prepare(`
      INSERT INTO sect_war (war_name, start_time, end_time, status)
      VALUES (?, ?, ?, ?)
    `).run(
      `第${saturday.getMonth() + 1}月第${Math.ceil(saturday.getDate() / 7)}周宗门战`,
      saturday.toISOString(),
      endTime.toISOString(),
      'pending'
    );

    war = db.prepare('SELECT * FROM sect_war WHERE id = last_insert_rowid()').get();
  }

  return war;
}

// 计算宗门战力
function calculateSectPower(sect) {
  if (!sect) return 0;
  
  let power = 0;
  
  // 宗门等级基础战力
  power += (sect.sect_level || 1) * 100;
  
  // 建筑加成
  for (const [buildingId, level] of Object.entries(sect.buildings || {})) {
    power += level * 50;
  }
  
  // 弟子战力
  for (const disciple of (sect.disciples || [])) {
    power += (disciple.level || 1) * 20;
  }
  
  // 技能加成
  power += (sect.techs || []).length * 30;
  
  return power;
}

// 生成对战
function generateMatches(signups) {
  const matches = [];
  const shuffled = [...signups].sort(() => Math.random() - 0.5);
  
  // 随机配对
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    matches.push({
      sect_a_id: shuffled[i].sect_type,
      sect_a_name: shuffled[i].sect_name,
      sect_a_power: shuffled[i].power,
      sect_b_id: shuffled[i + 1].sect_type,
      sect_b_name: shuffled[i + 1].sect_name,
      sect_b_power: shuffled[i + 1].power,
    });
  }
  
  return matches;
}

// 创建战斗单位（根据宗门弟子）
function createBattleUnitsFromSect(sect, side) {
  const units = [];
  const disciples = sect.disciples || [];
  
  // 根据弟子数量创建战斗单位，如果没有弟子则创建默认单位
  const battleCount = Math.max(disciples.length, 3);
  
  for (let i = 0; i < battleCount; i++) {
    const disciple = disciples[i] || null;
    const baseLevel = sect.sect_level || 1;
    
    // 分配角色
    let role;
    if (i === 0) role = 'tank';
    else if (i === 1) role = 'dps';
    else if (i === 2) role = 'healer';
    else role = i % 3 === 0 ? 'tank' : 'dps';
    
    const level = disciple ? (disciple.level || baseLevel) : baseLevel;
    const name = disciple ? disciple.name : `${sect.sect_name}_${role}_${side}`;
    
    // 根据角色生成属性
    let stats = {};
    switch (role) {
      case 'tank':
        stats = {
          maxHp: level * 150,
          attack: level * 8,
          defense: level * 12,
          speed: level * 1.5,
          critRate: 0.05,
          critDamage: 1.3,
        };
        break;
      case 'dps':
        stats = {
          maxHp: level * 80,
          attack: level * 15,
          defense: level * 4,
          speed: level * 3,
          critRate: 0.15,
          critDamage: 1.8,
        };
        break;
      case 'healer':
        stats = {
          maxHp: level * 100,
          attack: level * 10,
          defense: level * 6,
          speed: level * 2,
          critRate: 0.1,
          critDamage: 1.5,
        };
        break;
      default:
        stats = {
          maxHp: level * 100,
          attack: level * 10,
          defense: level * 5,
          speed: level * 2,
          critRate: 0.1,
          critDamage: 1.5,
        };
    }
    
    units.push(new BattleUnit(
      `${sect.sect_type}_${i}_${side}`,
      name,
      role,
      level,
      stats
    ));
  }
  
  return units;
}

// 自动战斗计算（使用详细战斗模拟器）
async function calculateBattleResult(sectA, sectB) {
  // 创建战斗单位
  const unitsA = createBattleUnitsFromSect(sectA, 'A');
  const unitsB = createBattleUnitsFromSect(sectB, 'B');
  
  // 创建战斗模拟器
  const battleLog = [];
  const simulator = new BattleSimulator(unitsA, unitsB, battleLog);
  
  // 初始化战斗
  simulator.init();
  
  // 执行战斗直到结束
  while (!simulator.isFinished && simulator.round < simulator.maxRounds) {
    await simulator.executeRound();
  }
  
  // 获取结果
  const result = simulator.getResult();
  
  return {
    winner_id: result.winner === 'A' ? sectA.sect_type : sectB.sect_type,
    winner_name: result.winner === 'A' ? sectA.sect_name : sectB.sect_name,
    contribution: result.contribution,
    power_a: sectA.power || 1,
    power_b: sectB.power || 1,
    rounds: result.rounds,
    battle_log: result.log,
    battle_stats: result.stats,
  };
}

// ==================== API 端点 ====================

// GET /api/sect-war/info - 获取宗门战信息
router.get('/info', async (req, res) => {
  try {
    const { player_id } = req.query;
    
    const now = new Date();
    const war = getCurrentWar();
    
    // 如果没有进行中的战争，获取本周信息
    let weeklyWar = war;
    if (!war) {
      weeklyWar = getOrCreateWeeklyWar();
    }
    
    // 检查报名状态
    let signupStatus = null;
    if (player_id && weeklyWar) {
      const sect = getPlayerSect(player_id);
      if (sect) {
        const signup = db.prepare(`
          SELECT * FROM sect_war_signups 
          WHERE war_id = ? AND sect_type = ?
        `).get(weeklyWar.id, sect.sect_type);
        
        signupStatus = signup ? 'signed' : 'not_signed';
      }
    }
    
    // 获取参赛宗门数
    const signupCount = weeklyWar ? db.prepare(
      'SELECT COUNT(*) as count FROM sect_war_signups WHERE war_id = ?'
    ).get(weeklyWar.id).count : 0;
    
    // 判断当前状态
    let status = 'idle';
    if (war) {
      const remaining = new Date(war.end_time) - now;
      status = remaining > 0 ? 'ongoing' : 'ended';
    } else if (weeklyWar) {
      const timeUntilStart = new Date(weeklyWar.start_time) - now;
      if (timeUntilStart > 0 && timeUntilStart < SECT_WAR_CONFIG.signupDeadline * 3600000) {
        status = 'signup';
      } else if (timeUntilStart > 0) {
        status = 'upcoming';
      }
    }
    
    res.json({
      success: true,
      data: {
        war_id: weeklyWar?.id || null,
        status,
        start_time: weeklyWar?.start_time || null,
        end_time: weeklyWar?.end_time || null,
        signup_count: signupCount,
        max_sects: SECT_WAR_CONFIG.maxSects,
        signup_status: signupStatus,
        remaining_hours: war ? Math.max(0, (new Date(war.end_time) - now) / 3600000) : null,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sect-war/signup - 宗门报名
router.post('/signup', async (req, res) => {
  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    // 获取玩家宗门
    const sect = getPlayerSect(player_id);
    if (!sect) {
      return res.status(400).json({ success: false, error: '没有宗门，无法报名' });
    }
    
    // 检查是否有足够的成员
    if ((sect.disciples || []).length < SECT_WAR_CONFIG.minMembers) {
      return res.status(400).json({ 
        success: false, 
        error: `至少需要 ${SECT_WAR_CONFIG.minMembers} 名弟子才能报名` 
      });
    }
    
    // 获取或创建本周宗门战
    const weeklyWar = getOrCreateWeeklyWar();
    
    // 检查是否已经报名
    const existingSignup = db.prepare(`
      SELECT * FROM sect_war_signups 
      WHERE war_id = ? AND sect_type = ?
    `).get(weeklyWar.id, sect.sect_type);
    
    if (existingSignup) {
      return res.status(400).json({ success: false, error: '该宗门已经报名了' });
    }
    
    // 检查是否达到最大参赛数
    const signupCount = db.prepare(
      'SELECT COUNT(*) as count FROM sect_war_signups WHERE war_id = ?'
    ).get(weeklyWar.id).count;
    
    if (signupCount >= SECT_WAR_CONFIG.maxSects) {
      return res.status(400).json({ success: false, error: '参赛宗门已满' });
    }
    
    // 计算宗门战力
    const power = calculateSectPower(sect);
    
    // 创建报名记录
    db.prepare(`
      INSERT INTO sect_war_signups (war_id, sect_type, sect_name, player_id, power)
      VALUES (?, ?, ?, ?, ?)
    `).run(weeklyWar.id, sect.sect_type, sect.sect_name, player_id, power);
    
    // 如果报名达到足够数量，自动生成对战
    if (signupCount + 1 >= 4) {
      // 检查是否已经生成了对战
      const existingMatches = db.prepare(
        'SELECT COUNT(*) as count FROM sect_war_matches WHERE war_id = ?'
      ).get(weeklyWar.id).count;
      
      if (existingMatches === 0) {
        // 生成第一轮对战
        const signups = db.prepare(`
          SELECT * FROM sect_war_signups WHERE war_id = ?
        `).all(weeklyWar.id);
        
        const matches = generateMatches(signups);
        
        const matchStmt = db.prepare(`
          INSERT INTO sect_war_matches (war_id, round_num, sect_a_id, sect_a_name, sect_b_id, sect_b_name, sect_a_power, sect_b_power, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const match of matches) {
          matchStmt.run(
            weeklyWar.id, 
            1, 
            match.sect_a_id, 
            match.sect_a_name, 
            match.sect_b_id, 
            match.sect_b_name, 
            match.sect_a_power, 
            match.sect_b_power, 
            'ready'
          );
        }
        
        // 更新战争状态
        db.prepare(`
          UPDATE sect_war SET status = 'ongoing' WHERE id = ?
        `).run(weeklyWar.id);
      }
    }
    
    res.json({
      success: true,
      message: `🎉 ${sect.sect_name} 报名成功！战力: ${power}`,
      data: {
        war_id: weeklyWar.id,
        sect_type: sect.sect_type,
        sect_name: sect.sect_name,
        power,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sect-war/matches - 查看对战列表
router.get('/matches', async (req, res) => {
  try {
    const { war_id, round } = req.query;
    
    let targetWarId = war_id ? parseInt(war_id) : null;
    if (!targetWarId) {
      const war = getCurrentWar();
      if (!war) {
        return res.json({ success: true, data: { matches: [], round: 0 } });
      }
      targetWarId = war.id;
    }
    
    let query = 'SELECT * FROM sect_war_matches WHERE war_id = ?';
    const params = [targetWarId];
    
    if (round) {
      query += ' AND round_num = ?';
      params.push(parseInt(round));
    }
    
    query += ' ORDER BY round_num, id';
    
    const matches = db.prepare(query).all(...params);
    
    // 获取当前轮次
    const maxRound = db.prepare(
      'SELECT MAX(round_num) as max_round FROM sect_war_matches WHERE war_id = ?'
    ).get(targetWarId).max_round || 0;
    
    res.json({
      success: true,
      data: {
        war_id: parseInt(targetWarId),
        round: parseInt(round) || maxRound,
        total_rounds: maxRound,
        matches: matches.map(m => ({
          id: m.id,
          sect_a: { id: m.sect_a_id, name: m.sect_a_name, power: m.sect_a_power },
          sect_b: { id: m.sect_b_id, name: m.sect_b_name, power: m.sect_b_power },
          winner: m.winner_id ? { id: m.winner_id, name: m.winner_name } : null,
          reward_contribution: m.reward_contribution,
          status: m.status,
          battle_time: m.battle_time,
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/sect-war/battle - 发起战斗
router.post('/battle', async (req, res) => {
  try {
    const { match_id } = req.body;
    
    if (!match_id) {
      return res.status(400).json({ success: false, error: '缺少对战ID' });
    }
    
    // 获取对战信息
    const match = db.prepare('SELECT * FROM sect_war_matches WHERE id = ?').get(match_id);
    if (!match) {
      return res.status(400).json({ success: false, error: '对战不存在' });
    }
    
    if (match.status !== 'ready') {
      return res.status(400).json({ success: false, error: '对战已结束或未就绪' });
    }
    
    // 执行自动战斗（使用详细战斗模拟器）
    const sectA = { sect_type: match.sect_a_id, sect_name: match.sect_a_name, power: match.sect_a_power };
    const sectB = { sect_type: match.sect_b_id, sect_name: match.sect_b_name, power: match.sect_b_power };
    
    const result = await calculateBattleResult(sectA, sectB);
    
    // 提取简化的日志用于返回（避免日志过长）
    const summaryLogs = result.battle_log ? result.battle_log.filter((log, idx) => {
      // 只保留关键日志：开始、每回合开始、每回合结束、击杀、胜负结果
      return log.type === 'battle_start' || 
             log.type === 'round_start' || 
             log.type === 'round_end' ||
             log.type === 'kill' ||
             log.type === 'score_calculation';
    }).slice(-20) : [];
    
    // 更新对战结果
    db.prepare(`
      UPDATE sect_war_matches 
      SET winner_id = ?, winner_name = ?, reward_contribution = ?, status = 'finished', battle_time = ?
      WHERE id = ?
    `).run(result.winner_id, result.winner_name, result.contribution, new Date().toISOString(), match_id);
    
    // 更新宗门胜负记录
    const loserId = result.winner_id === match.sect_a_id ? match.sect_b_id : match.sect_a_id;
    
    // 更新胜者
    db.prepare(`
      INSERT INTO sect_war_ranking (sect_type, sect_name, war_wins, total_power)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(sect_type) DO UPDATE SET 
        war_wins = war_wins + 1,
        total_power = MAX(total_power, ?)
    `).run(result.winner_id, result.winner_name, result.winner_id === match.sect_a_id ? match.sect_a_power : match.sect_b_power, 
      result.winner_id === match.sect_a_id ? match.sect_a_power : match.sect_b_power);
    
    // 更新败者
    db.prepare(`
      INSERT INTO sect_war_ranking (sect_type, sect_name, war_losses, total_power)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(sect_type) DO UPDATE SET 
        war_losses = war_losses + 1,
        total_power = MAX(total_power, ?)
    `).run(loserId, loserId === match.sect_a_id ? match.sect_a_name : match.sect_b_name, 
      loserId === match.sect_a_id ? match.sect_a_power : match.sect_b_power,
      loserId === match.sect_a_id ? match.sect_a_power : match.sect_b_power);
    
    // 检查是否需要生成下一轮
    const remainingMatches = db.prepare(`
      SELECT COUNT(*) as count FROM sect_war_matches 
      WHERE war_id = ? AND status = 'ready'
    `).get(match.war_id).count;
    
    if (remainingMatches === 0) {
      // 生成下一轮
      const winners = db.prepare(`
        SELECT * FROM sect_war_matches WHERE war_id = ? AND status = 'finished'
      `).all(match.war_id);
      
      if (winners.length > 1) {
        const nextRound = (match.round_num || 1) + 1;
        const nextMatches = generateMatches(winners.map(w => ({
          sect_type: w.winner_id,
          sect_name: w.winner_name,
          power: w.winner_id === w.sect_a_id ? w.sect_a_power : w.sect_b_power,
        })));
        
        const matchStmt = db.prepare(`
          INSERT INTO sect_war_matches (war_id, round_num, sect_a_id, sect_a_name, sect_b_id, sect_b_name, sect_a_power, sect_b_power, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const m of nextMatches) {
          matchStmt.run(
            match.war_id, 
            nextRound, 
            m.sect_a_id, 
            m.sect_a_name, 
            m.sect_b_id, 
            m.sect_b_name, 
            m.sect_a_power, 
            m.sect_b_power, 
            'ready'
          );
        }
      } else if (winners.length === 1) {
        // 决赛结束，更新战争状态
        db.prepare(`
          UPDATE sect_war SET status = 'finished', winner_sect_id = ? WHERE id = ?
        `).run(winners[0].winner_id, match.war_id);
        
        // 发放冠军奖励
        const championReward = db.prepare('SELECT * FROM sect_war_rewards WHERE rank = 1').get();
        if (championReward) {
          // 查找冠军宗门成员
          const championSignups = db.prepare(`
            SELECT * FROM sect_war_signups WHERE war_id = ? AND sect_type = ?
          `).all(match.war_id, winners[0].winner_id);
          
          for (const signup of championSignups) {
            // 更新宗门排名
            db.prepare(`
              UPDATE sect_war_ranking SET territory_level = 5 WHERE sect_type = ?
            `).run(winners[0].winner_id);
          }
        }
      }
    }
    
    res.json({
      success: true,
      message: `⚔️ 战斗结束！${result.winner_name} 获胜！`,
      data: {
        match_id: match.id,
        winner: { id: result.winner_id, name: result.winner_name },
        reward_contribution: result.contribution,
        rounds: result.rounds,
        next_round_ready: remainingMatches === 0,
        battle_summary: summaryLogs.map(l => l.message),
        battle_stats: result.battle_stats,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sect-war/rewards - 奖励配置
router.get('/rewards', (req, res) => {
  try {
    const rewards = db.prepare('SELECT * FROM sect_war_rewards ORDER BY rank').all();
    
    res.json({
      success: true,
      data: rewards.map(r => ({
        rank: r.rank,
        rank_name: r.rank_name,
        contribution: r.contribution,
        spirit_stones: r.spirit_stones,
        items: JSON.parse(r.items || '[]'),
        description: r.description,
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sect-war/ranking - 宗门排名
router.get('/ranking', (req, res) => {
  try {
    const { limit } = req.query;
    const top = parseInt(limit) || 10;
    
    const rankings = db.prepare(`
      SELECT * FROM sect_war_ranking 
      ORDER BY war_wins DESC, total_power DESC
      LIMIT ?
    `).all(top);
    
    // 计算领地加成
    const rankingsWithBonus = rankings.map((r, index) => {
      const territoryBonus = TERRITORY_BONUS[r.territory_level] || TERRITORY_BONUS[1];
      return {
        rank: index + 1,
        sect_type: r.sect_type,
        sect_name: r.sect_name,
        war_wins: r.war_wins,
        war_losses: r.war_losses,
        total_power: r.total_power,
        territory_level: r.territory_level,
        territory_bonus: territoryBonus,
        daily_resource_bonus: r.daily_resource_bonus,
      };
    });
    
    res.json({
      success: true,
      data: rankingsWithBonus
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 自动执行战斗（定时任务用）
router.post('/auto-battle', async (req, res) => {
  try {
    const war = getCurrentWar();
    if (!war) {
      return res.status(400).json({ success: false, error: '当前没有进行中的宗门战' });
    }
    
    const pendingMatches = db.prepare(`
      SELECT * FROM sect_war_matches 
      WHERE war_id = ? AND status = 'ready'
      ORDER BY id
    `).all(war.id);
    
    if (pendingMatches.length === 0) {
      return res.json({ success: true, message: '没有待战斗的对战', data: { battles: 0 } });
    }
    
    const results = [];
    for (const match of pendingMatches) {
      const sectA = { sect_id: match.sect_a_id, sect_name: match.sect_a_name, power: match.sect_a_power };
      const sectB = { sect_id: match.sect_b_id, sect_name: match.sect_b_name, power: match.sect_b_power };
      const result = await calculateBattleResult(sectA, sectB);
      
      db.prepare(`
        UPDATE sect_war_matches 
        SET winner_id = ?, winner_name = ?, reward_contribution = ?, status = 'finished', battle_time = ?
        WHERE id = ?
      `).run(result.winner_id, result.winner_name, result.contribution, new Date().toISOString(), match.id);
      
      results.push({ match_id: match.id, winner: result.winner_name, rounds: result.rounds });
    }
    
    res.json({
      success: true,
      message: `⚔️ 自动完成 ${results.length} 场战斗`,
      data: { battles: results.length, results }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/sect-war/battle/:match_id - 获取战斗详情
router.get('/battle/:match_id', async (req, res) => {
  try {
    const { match_id } = req.params;
    
    // 获取对战信息
    const match = db.prepare('SELECT * FROM sect_war_matches WHERE id = ?').get(match_id);
    if (!match) {
      return res.status(400).json({ success: false, error: '对战不存在' });
    }
    
    // 获取战斗统计
    const stats = db.prepare(`
      SELECT * FROM sect_war_battle_stats WHERE match_id = ?
    `).get(match_id);
    
    res.json({
      success: true,
      data: {
        match: {
          id: match.id,
          round: match.round_num,
          sect_a: { id: match.sect_a_id, name: match.sect_a_name, power: match.sect_a_power },
          sect_b: { id: match.sect_b_id, name: match.sect_b_name, power: match.sect_b_power },
          winner: match.winner_id ? { id: match.winner_id, name: match.winner_name } : null,
          reward_contribution: match.reward_contribution,
          status: match.status,
          battle_time: match.battle_time,
        },
        stats: stats ? JSON.parse(stats.stats_json) : null,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
