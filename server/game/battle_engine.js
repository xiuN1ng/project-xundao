/**
 * 战斗引擎 - 寻道修仙
 * 完全自动战斗系统
 * 
 * 使用方法:
 *   const BattleEngine = require('./battle_engine');
 *   const engine = new BattleEngine();
 *   const result = engine.startBattle(player, enemy);
 */

const ELEMENTAL_CHART = {
  metal:  { metal: 1.0, wood: 1.5, water: 1.0, fire: 0.75, earth: 1.0 },
  wood:   { metal: 0.75, wood: 1.0, water: 1.0, fire: 1.0, earth: 1.5 },
  water:  { metal: 1.0, wood: 1.0, water: 1.0, fire: 1.5, earth: 0.75 },
  fire:   { metal: 1.5, wood: 1.0, water: 0.75, fire: 1.0, earth: 1.0 },
  earth:  { metal: 1.0, wood: 0.75, water: 1.5, fire: 1.0, earth: 1.0 }
};

const DEFAULT_SKILLS = {
  normalAttack: {
    id: 'normal_attack',
    name: '普通攻击',
    element: 'metal',
    type: 'attack',
    multiplier: 1.0,
    mpCost: 0,
    cooldown: 0,
    effect: null
  }
};

class BattleEngine {
  constructor(config = {}) {
    this.config = {
      maxRounds: 100,
      speedMultiplier: 1,
      enableReplay: true,
      ...config
    };
  }

  startBattle(player, enemy, options = {}) {
    const battle = this.initBattle(player, enemy, options);
    battle.startTime = Date.now();
    
    while (battle.rounds < this.config.maxRounds) {
      const roundResult = this.executeRound(battle);
      
      if (roundResult.battleEnd) {
        battle.winner = roundResult.winner;
        break;
      }
      
      battle.rounds++;
    }

    if (battle.rounds >= this.config.maxRounds) {
      battle.winner = this.comparePower(battle.player, battle.enemy) > 0 ? 'player' : 'enemy';
      battle.timeout = true;
    }

    battle.rewards = this.calculateRewards(battle);
    
    if (this.config.enableReplay) {
      battle.replay = this.generateReplay(battle);
    }

    return this.formatResult(battle);
  }

  initBattle(player, enemy, options) {
    return {
      player: this.cloneEntity(player),
      enemy: this.cloneEntity(enemy),
      rounds: 1,
      winner: null,
      timeout: false,
      log: [],
      actions: [],
      startTime: Date.now(),
      rewards: null,
      replay: null
    };
  }

  cloneEntity(entity) {
    return {
      id: entity.id || entity.name || 'entity',
      name: entity.name || '角色',
      level: entity.level || 1,
      hp: entity.hp || entity.maxHp || 1000,
      maxHp: entity.maxHp || entity.hp || 1000,
      mp: entity.mp || entity.maxMp || 100,
      maxMp: entity.maxMp || entity.mp || 100,
      atk: entity.atk || 100,
      def: entity.def || 50,
      spd: entity.spd || entity.speed || 50,
      critRate: entity.critRate || 10,
      critDmg: entity.critDmg || 150,
      acc: entity.acc || 90,
      eva: entity.eva || 10,
      element: entity.element || 'metal',
      metalResist: entity.metalResist || 0,
      woodResist: entity.woodResist || 0,
      waterResist: entity.waterResist || 0,
      fireResist: entity.fireResist || 0,
      earthResist: entity.earthResist || 0,
      penetration: entity.penetration || 0,
      skills: entity.skills ? entity.skills.map(s => ({...s, currentCooldown: 0})) : [],
      buffs: [],
      shield: 0,
      stunned: false
    };
  }

  executeRound(battle) {
    const { player, enemy } = battle;
    
    this.refreshBuffs([player, enemy]);
    
    player.mp = Math.min(player.maxMp, player.mp + Math.floor(player.maxMp * 0.05));
    enemy.mp = Math.min(enemy.maxMp, enemy.mp + Math.floor(enemy.maxMp * 0.05));
    
    if (player.skills) player.skills.forEach(s => { if (s.currentCooldown > 0) s.currentCooldown--; });
    if (enemy.skills) enemy.skills.forEach(s => { if (s.currentCooldown > 0) s.currentCooldown--; });
    
    const turnOrder = this.getTurnOrder(player, enemy);
    
    for (const actor of turnOrder) {
      if (actor.hp <= 0) continue;
      if (actor.stunned) {
        battle.log.push({ round: battle.rounds, actor: actor.name, type: 'stun', message: `${actor.name}被眩晕了，跳过本回合` });
        actor.stunned = false;
        continue;
      }
      
      const target = actor === player ? enemy : player;
      const action = this.executeAction(actor, target, battle);
      battle.actions.push(action);
      
      if (target.hp <= 0) {
        return { battleEnd: true, winner: actor === player ? 'player' : 'enemy' };
      }
    }
    
    return { battleEnd: false };
  }

  getTurnOrder(player, enemy) {
    if (player.spd > enemy.spd) return [player, enemy];
    if (enemy.spd > player.spd) return [enemy, player];
    return Math.random() > 0.5 ? [player, enemy] : [enemy, player];
  }

  executeAction(actor, target, battle) {
    const action = {
      round: battle.rounds,
      actor: actor.id,
      actorName: actor.name,
      target: target.id,
      targetName: target.name,
      timestamp: Date.now()
    };

    const skill = this.selectSkill(actor, target, battle);
    action.skill = skill.name;
    action.skillId = skill.id;

    const hitChance = actor.acc - target.eva;
    const isHit = Math.random() * 100 < hitChance;
    
    if (!isHit) {
      action.type = 'miss';
      action.damage = 0;
      action.message = `${actor.name}的攻击被闪避了！`;
      battle.log.push(action);
      return action;
    }

    const damageResult = this.calculateDamage(actor, target, skill);
    action.type = 'damage';
    action.damage = damageResult.damage;
    action.isCrit = damageResult.isCrit;
    action.elementalBonus = damageResult.elementalBonus;
    action.message = this.formatDamageMessage(action, damageResult);
    
    // 处理护盾
    let actualDamage = damageResult.damage;
    if (target.shield > 0) {
      const shieldAbsorb = Math.min(target.shield, actualDamage);
      target.shield -= shieldAbsorb;
      actualDamage -= shieldAbsorb;
      if (shieldAbsorb > 0) {
        battle.log.push({ round: battle.rounds, actor: target.name, type: 'shield', message: `护盾吸收了${shieldAbsorb}伤害` });
      }
    }
    
    target.hp = Math.max(0, target.hp - actualDamage);
    action.damage = actualDamage;
    
    if (skill.effect) {
      this.applyEffect(actor, target, skill.effect, battle);
    }

    battle.log.push(action);
    return action;
  }

  selectSkill(actor, target, battle) {
    const availableSkills = (actor.skills || [])
      .filter(s => s.currentCooldown === 0 && actor.mp >= (s.mpCost || 0));
    
    if (availableSkills.length === 0) {
      return DEFAULT_SKILLS.normalAttack;
    }

    const hpRatio = actor.hp / actor.maxHp;
    const targetHpRatio = target.hp / target.maxHp;

    if (hpRatio < 0.3) {
      const healSkill = availableSkills.find(s => s.type === 'defense' || s.type === 'heal');
      if (healSkill) return healSkill;
    }

    if (targetHpRatio < 0.5) {
      const highDmgSkill = availableSkills
        .filter(s => s.type === 'attack')
        .sort((a, b) => (b.multiplier || 1) - (a.multiplier || 1))[0];
      if (highDmgSkill && highDmgSkill.multiplier >= 1.8) {
        return highDmgSkill;
      }
    }

    const attackSkill = availableSkills
      .filter(s => s.type === 'attack')
      .sort((a, b) => (b.multiplier || 1) - (a.multiplier || 1))[0];
    
    return attackSkill || DEFAULT_SKILLS.normalAttack;
  }

  calculateDamage(attacker, defender, skill) {
    const result = { damage: 0, isCrit: false, elementalBonus: 1.0 };

    const baseDamage = attacker.atk * (skill.multiplier || 1.0);
    const elementalMultiplier = ELEMENTAL_CHART[attacker.element]?.[defender.element] || 1.0;
    result.elementalBonus = elementalMultiplier;

    const resistKey = `${attacker.element}Resist`;
    const resistance = defender[resistKey] || 0;
    const resistMultiplier = 1 - resistance;

    const effectiveDefense = attacker.penetration > 0 
      ? defender.def * (1 - attacker.penetration / 100)
      : defender.def;
    const damageReduction = effectiveDefense / (effectiveDefense + 1000);

    const isCrit = Math.random() * 100 < attacker.critRate;
    const critMultiplier = isCrit ? attacker.critDmg / 100 : 1;
    result.isCrit = isCrit;

    const randomFactor = 0.98 + Math.random() * 0.04;

    result.damage = Math.floor(
      baseDamage 
      * elementalMultiplier 
      * resistMultiplier 
      * (1 - damageReduction) 
      * critMultiplier 
      * randomFactor
    );

    result.damage = Math.max(result.damage, Math.floor(attacker.atk * 0.01));

    return result;
  }

  applyEffect(actor, target, effect, battle) {
    const action = {
      round: battle.rounds,
      actor: actor.id,
      actorName: actor.name,
      target: target.id,
      targetName: target.name,
      type: 'effect'
    };

    if (effect.heal) {
      const healAmount = Math.floor(actor.maxHp * effect.heal);
      actor.hp = Math.min(actor.maxHp, actor.hp + healAmount);
      action.effect = 'heal';
      action.value = healAmount;
      action.message = `${actor.name}恢复了${healAmount}生命`;
    }

    if (effect.shield) {
      const shieldAmount = Math.floor(actor.maxHp * effect.shield);
      actor.shield = (actor.shield || 0) + shieldAmount;
      action.effect = 'shield';
      action.value = shieldAmount;
      action.message = `${actor.name}获得了${shieldAmount}护盾`;
    }

    if (effect.stun) {
      target.stunned = true;
      action.effect = 'stun';
      action.message = `${target.name}被眩晕了！`;
    }

    if (action.message) {
      battle.log.push(action);
    }
  }

  refreshBuffs(entities) {
    entities.forEach(entity => {
      if (entity.buffs) {
        entity.buffs = entity.buffs.filter(buff => {
          buff.duration--;
          return buff.duration > 0;
        });
      }
      if (entity.stunned) entity.stunned = false;
    });
  }

  comparePower(player, enemy) {
    const playerPower = player.atk + player.def * 0.5 + player.hp * 0.1;
    const enemyPower = enemy.atk + enemy.def * 0.5 + enemy.hp * 0.1;
    return playerPower - enemyPower;
  }

  calculateRewards(battle) {
    const { player, enemy, winner } = battle;
    
    if (winner !== 'player') {
      return { exp: 0, gold: 0, items: [] };
    }

    const baseExp = (enemy.level || 1) * 100;
    const baseGold = (enemy.level || 1) * 50;
    const realmBonus = (player.level || 1) > (enemy.level || 1) ? 1 + ((player.level || 1) - (enemy.level || 1)) * 0.1 : 1;
    
    return {
      exp: Math.floor(baseExp * realmBonus),
      gold: Math.floor(baseGold * realmBonus),
      items: []
    };
  }

  generateReplay(battle) {
    return {
      version: '1.0',
      duration: Date.now() - battle.startTime,
      rounds: battle.rounds,
      winner: battle.winner,
      player: { id: battle.player.id, name: battle.player.name, finalHp: battle.player.hp },
      enemy: { id: battle.enemy.id, name: battle.enemy.name, finalHp: battle.enemy.hp },
      actions: battle.actions,
      rewards: battle.rewards
    };
  }

  formatResult(battle) {
    return {
      success: true,
      winner: battle.winner,
      rounds: battle.rounds,
      timeout: battle.timeout,
      player: {
        id: battle.player.id,
        name: battle.player.name,
        hp: battle.player.hp,
        maxHp: battle.player.maxHp,
        hpPercent: Math.floor(battle.player.hp / battle.player.maxHp * 100)
      },
      enemy: {
        id: battle.enemy.id,
        name: battle.enemy.name,
        hp: battle.enemy.hp,
        maxHp: battle.enemy.maxHp,
        hpPercent: Math.floor(battle.enemy.hp / battle.enemy.maxHp * 100)
      },
      rewards: battle.rewards,
      log: battle.log,
      replay: battle.replay
    };
  }

  formatDamageMessage(action, damageResult) {
    let msg = `${action.actorName}使用${action.skill}对${action.targetName}造成${damageResult.damage}伤害`;
    if (damageResult.isCrit) msg += '（暴击！）';
    if (damageResult.elementalBonus > 1) msg += '（五行克制！）';
    else if (damageResult.elementalBonus < 1) msg += '（被五行克制！）';
    return msg;
  }
}

module.exports = BattleEngine;
