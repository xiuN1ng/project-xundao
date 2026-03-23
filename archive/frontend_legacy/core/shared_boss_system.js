/**
 * BOSS血量共享系统 - 全服玩家讨伐
 * 所有服务器玩家共同讨伐一个BOSS，伤害累积共享
 */

const SHARED_BOSS_DATA = {
  // 仙界BOSS列表
  'celestial_dragon': {
    name: '苍龙',
    description: '掌控天地的远古神龙',
    quality: 'mythical',
    baseHp: 10000000,
    baseAtk: 50000,
    baseDef: 20000,
    respawnTime: 172800,
    rewards: {
      spiritStones: 1000000,
      exp: 500000,
      realmExp: 10000,
      items: ['龙珠', '龙鳞甲', '苍龙精血']
    },
    icon: '🐉',
    color: '#00CED1'
  },
  'demon_god': {
    name: '蚩尤',
    description: '上古魔帝复苏',
    quality: 'mythical',
    baseHp: 15000000,
    baseAtk: 80000,
    baseDef: 30000,
    respawnTime: 259200,
    rewards: {
      spiritStones: 2000000,
      exp: 800000,
      realmExp: 15000,
      items: ['魔帝之心', '蚩尤战甲', '魔血']
    },
    icon: '👹',
    color: '#FF4500'
  },
  'void_emperor': {
    name: '虚空大帝',
    description: '来自虚空间的至强者',
    quality: 'legendary',
    baseHp: 8000000,
    baseAtk: 40000,
    baseDef: 15000,
    respawnTime: 129600,
    rewards: {
      spiritStones: 800000,
      exp: 400000,
      realmExp: 8000,
      items: ['虚空晶石', '大帝传承', '空间法则']
    },
    icon: '🌀',
    color: '#9400D3'
  },
  'immortal_sage': {
    name: '散仙',
    description: '渡劫失败的强大仙人',
    quality: 'epic',
    baseHp: 3000000,
    baseAtk: 20000,
    baseDef: 8000,
    respawnTime: 86400,
    rewards: {
      spiritStones: 300000,
      exp: 200000,
      realmExp: 3000,
      items: ['散仙遗物', '仙人之血']
    },
    icon: '🧙',
    color: '#FFD700'
  },
  'phoenix_king': {
    name: '凤凰王',
    description: '不死凤凰族的王者',
    quality: 'legendary',
    baseHp: 6000000,
    baseAtk: 35000,
    baseDef: 12000,
    respawnTime: 172800,
    rewards: {
      spiritStones: 600000,
      exp: 300000,
      realmExp: 5000,
      items: ['凤凰羽', '涅槃之火', '凤凰精血']
    },
    icon: '🦅',
    color: '#FF69B4'
  }
};

// BOSS血量共享系统
class SharedBossSystem {
  constructor() {
    this.currentBoss = null;
    this.bossHp = 0;
    this.maxHp = 0;
    this.participants = new Map(); // playerId -> {damage, lastAttack, name}
    this.status = 'dead'; // dead, alive, countdown
    this.spawnTime = 0;
    this.lastKill = null;
    this.countdownTime = 0;
    this.dailyBoss = null;
    this.dailyBossSpawned = false;
  }

  // 召唤BOSS
  summonBoss(bossId) {
    const bossData = SHARED_BOSS_DATA[bossId];
    if (!bossData) {
      return { success: false, message: 'BOSS不存在' };
    }

    // 检查冷却
    if (this.currentBoss === bossId && this.status === 'alive') {
      return { success: false, message: '该BOSS正在被讨伐中' };
    }

    // 检查是否在冷却中
    if (this.lastKill && bossData) {
      const cooldown = (Date.now() - this.lastKill.time) / 1000;
      const respawnTime = bossData.respawnTime || 86400;
      if (cooldown < respawnTime) {
        const remaining = Math.ceil((respawnTime - cooldown) / 3600);
        return { success: false, message: `该BOSS还在休息，${remaining}小时后刷新` };
      }
    }

    this.currentBoss = bossId;
    this.bossHp = bossData.baseHp;
    this.maxHp = bossData.baseHp;
    this.participants.clear();
    this.status = 'alive';
    this.spawnTime = Date.now();

    return {
      success: true,
      message: `⚠️ ${bossData.name} 已降临！全服玩家开始讨伐！`,
      boss: this.getBossInfo()
    };
  }

  // 玩家攻击BOSS
  attackBoss(playerId, playerName, damage) {
    if (this.status !== 'alive') {
      return { success: false, message: '当前没有活跃的BOSS' };
    }

    // 获取或创建玩家参与记录
    let participant = this.participants.get(playerId);
    if (!participant) {
      participant = {
        playerId,
        playerName,
        damage: 0,
        lastAttack: Date.now(),
        attacks: 0
      };
      this.participants.set(playerId, participant);
    }

    // 更新伤害
    participant.damage += damage;
    participant.lastAttack = Date.now();
    participant.attacks++;

    // 扣除BOSS血量
    this.bossHp -= damage;

    // 检查是否击杀
    if (this.bossHp <= 0) {
      return this.killBoss();
    }

    return {
      success: true,
      damage,
      remainingHp: this.bossHp,
      maxHp: this.maxHp,
      progress: ((this.maxHp - this.bossHp) / this.maxHp * 100).toFixed(1),
      participantCount: this.participants.size,
      message: `对BOSS造成 ${damage} 伤害！`
    };
  }

  // 击杀BOSS
  killBoss() {
    const bossData = SHARED_BOSS_DATA[this.currentBoss];
    if (!bossData) {
      this.status = 'dead';
      return { success: false, message: 'BOSS数据异常' };
    }

    // 排序参与者找出伤害最高者
    const sorted = Array.from(this.participants.values())
      .sort((a, b) => b.damage - a.damage);

    const killer = sorted[0];
    const top3 = sorted.slice(0, 3);

    this.status = 'dead';
    this.lastKill = {
      bossId: this.currentBoss,
      killerId: killer.playerId,
      killerName: killer.playerName,
      totalDamage: this.maxHp,
      time: Date.now(),
      participants: sorted.length
    };

    // 计算奖励
    const rewards = {
      killer: this.calculateRewards(bossData.rewards, 1.0),
      top3: top3.map((p, i) => ({
        ...p,
        rewards: this.calculateRewards(bossData.rewards, 0.5 - i * 0.1)
      })),
      participants: sorted.slice(3).map(p => ({
        playerId: p.playerId,
        playerName: p.playerName,
        damage: p.damage,
        rewards: this.calculateRewards(bossData.rewards, Math.min(0.3, p.damage / this.maxHp))
      }))
    };

    this.currentBoss = null;
    this.bossHp = 0;

    return {
      success: true,
      message: `🎉 ${killer.playerName} 击杀了 ${bossData.name}！`,
      killer: {
        playerId: killer.playerId,
        playerName: killer.playerName,
        damage: killer.damage
      },
      rewards,
      boss: bossData
    };
  }

  // 计算奖励
  calculateRewards(baseRewards, multiplier) {
    return {
      spiritStones: Math.floor((baseRewards.spiritStones || 0) * multiplier),
      exp: Math.floor((baseRewards.exp || 0) * multiplier),
      realmExp: Math.floor((baseRewards.realmExp || 0) * multiplier),
      items: baseRewards.items ? baseRewards.items.slice(0, Math.ceil(baseRewards.items.length * multiplier)) : []
    };
  }

  // 获取BOSS信息
  getBossInfo() {
    if (!this.currentBoss) {
      return null;
    }

    const bossData = SHARED_BOSS_DATA[this.currentBoss];
    return {
      bossId: this.currentBoss,
      name: bossData.name,
      description: bossData.description,
      icon: bossData.icon,
      color: bossData.color,
      quality: bossData.quality,
      currentHp: Math.max(0, this.bossHp),
      maxHp: this.maxHp,
      hpPercent: ((Math.max(0, this.bossHp) / this.maxHp * 100)).toFixed(1),
      participantCount: this.participants.size,
      status: this.status,
      spawnTime: this.spawnTime,
      elapsedTime: Math.floor((Date.now() - this.spawnTime) / 1000)
    };
  }

  // 获取玩家排名
  getRanking(limit = 10) {
    const sorted = Array.from(this.participants.values())
      .sort((a, b) => b.damage - a.damage)
      .slice(0, limit);

    return sorted.map((p, i) => ({
      rank: i + 1,
      playerId: p.playerId,
      playerName: p.playerName,
      damage: Math.floor(p.damage),
      damagePercent: (p.damage / this.maxHp * 100).toFixed(2),
      attacks: p.attacks
    }));
  }

  // 获取玩家个人伤害
  getPlayerDamage(playerId) {
    const participant = this.participants.get(playerId);
    if (!participant) {
      return { damage: 0, rank: null, damagePercent: 0 };
    }

    const sorted = Array.from(this.participants.values())
      .sort((a, b) => b.damage - a.damage);
    const rank = sorted.findIndex(p => p.playerId === playerId) + 1;

    return {
      damage: Math.floor(participant.damage),
      rank,
      damagePercent: (participant.damage / this.maxHp * 100).toFixed(2),
      attacks: participant.attacks
    };
  }

  // 获取历史击杀记录
  getKillHistory(limit = 10) {
    // 这里可以从数据库获取历史记录
    return this.lastKill ? [this.lastKill] : [];
  }

  // 召唤每日BOSS
  spawnDailyBoss() {
    if (this.dailyBossSpawned) {
      return { success: false, message: '今日BOSS已召唤' };
    }

    const bossIds = Object.keys(SHARED_BOSS_DATA);
    const randomBoss = bossIds[Math.floor(Math.random() * bossIds.length)];
    
    const result = this.summonBoss(randomBoss);
    if (result.success) {
      this.dailyBoss = randomBoss;
      this.dailyBossSpawned = true;
    }
    
    return result;
  }

  // 检查BOSS状态
  getStatus() {
    return {
      status: this.status,
      currentBoss: this.getBossInfo(),
      hasActiveBoss: this.status === 'alive',
      canSummon: this.status === 'dead'
    };
  }
}

// 创建全局实例
const sharedBossSystem = new SharedBossSystem();

// 导出
module.exports = {
  SharedBossSystem,
  SHARED_BOSS_DATA,
  sharedBossSystem
};
