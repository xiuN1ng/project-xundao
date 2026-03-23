/**
 * 公会系统 v21
 * 包含：公会创建、成员管理、公会升级、公会技能、公会红包
 */

// ============ 公会配置 ============
export const GUILD_CONFIG = {
  // 公会最大等级
  maxLevel: 10,
  
  // 公会创建条件
  createRequirements: {
    minLevel: 15,           // 最低等级
    costGold: 100000,        // 创建消耗金币
    costItem: null,          // 创建消耗道具 (可选)
  },

  // 公会人数限制
  memberLimits: {
    1: 20,
    2: 30,
    3: 40,
    4: 50,
    5: 60,
    6: 70,
    7: 80,
    8: 90,
    9: 100,
    10: 120,
  },

  // 公会升级经验需求
  levelExp: {
    1: 0,
    2: 10000,
    3: 30000,
    4: 70000,
    5: 150000,
    6: 300000,
    7: 500000,
    8: 800000,
    9: 1200000,
    10: 2000000,
  },

  // 公会职位
  positions: {
    LEADER: 1,      // 会长
    VICE_LEADER: 2, // 副会长
    ELDER: 3,       // 长老
    MEMBER: 4,      // 普通成员
    RECRUIT: 5,     // 入会申请
  },

  // 职位权限
  positionPermissions: {
    1: ['manage', 'kick', 'promote', 'demote', 'notice', 'dismiss', 'redpacket'],
    2: ['manage', 'kick', 'promote', 'demote', 'notice', 'redpacket'],
    3: ['kick', 'notice'],
    4: [],
  },

  // 公会技能配置
  skills: {
    guild_attack: {
      name: '公会攻击',
      maxLevel: 5,
      effects: [5, 10, 15, 20, 25],
      costGold: [10000, 20000, 40000, 80000, 160000],
      description: '增加公会成员攻击力',
    },
    guild_defense: {
      name: '公会防御',
      maxLevel: 5,
      effects: [5, 10, 15, 20, 25],
      costGold: [10000, 20000, 40000, 80000, 160000],
      description: '增加公会成员防御力',
    },
    guild_hp: {
      name: '公会生命',
      maxLevel: 5,
      effects: [5, 10, 15, 20, 25],
      costGold: [10000, 20000, 40000, 80000, 160000],
      description: '增加公会成员生命值',
    },
    guild_exp: {
      name: '修炼加成',
      maxLevel: 5,
      effects: [2, 4, 6, 8, 10],
      costGold: [15000, 30000, 60000, 120000, 240000],
      description: '增加公会成员修炼经验加成',
    },
    guild_drop: {
      name: '掉落加成',
      maxLevel: 5,
      effects: [2, 4, 6, 8, 10],
      costGold: [20000, 40000, 80000, 160000, 320000],
      description: '增加公会成员掉落率',
    },
  },

  // 每日贡献奖励
  dailyContributeRewards: [
    { contribute: 100, exp: 1000, gold: 1000 },
    { contribute: 500, exp: 5000, gold: 5000 },
    { contribute: 1000, exp: 10000, gold: 10000 },
  ],

  // 红包配置
  redPacketConfig: {
    // 红包类型
    types: {
      NORMAL: 1,    // 普通红包
      LUCKY: 2,     // 拼手气红包
      FIXED: 3,     // 专属红包
    },
    // 红包冷却 (毫秒)
    cooldown: 60 * 1000,
    // 红包有效期 (毫秒)
    expireTime: 24 * 60 * 60 * 1000,
    // 最小金额
    minAmount: 100,
    // 最大同时红包数
    maxActivePackets: 10,
    // 红包税率
    taxRate: 0.05,
  },
};

// ============ 公会类 ============
export interface GuildMember {
  playerId: string;
  name: string;
  level: number;
  position: number;
  contribute: number;
  totalContribute: number;
  joinTime: number;
  lastActiveTime: number;
  weeklyContribute: number;
  receivedRedPackets: number;
}

export interface Guild {
  id: string;
  name: string;
  leaderId: string;
  level: number;
  exp: number;
  members: Map<string, GuildMember>;
  notice: string;
  createTime: number;
  skillLevels: Map<string, number>;
  totalContribute: number;
  rank: number;
}

export interface GuildApplication {
  playerId: string;
  guildId: string;
  message: string;
  time: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface RedPacket {
  id: string;
  guildId: string;
  senderId: string;
  senderName: string;
  type: number;
  totalAmount: number;
  count: number;
  remainAmount: number;
  remainCount: number;
  message: string;
  createTime: number;
  expireTime: number;
  receivers: Map<string, number>; // playerId -> amount
}

export class GuildSystem {
  private guilds: Map<string, Guild> = new Map();
  private applications: Map<string, GuildApplication[]> = new Map();
  private redPackets: Map<string, RedPacket> = new Map();

  /**
   * 创建公会
   */
  createGuild(leaderId: string, leaderName: string, leaderLevel: number, guildName: string): { success: boolean; guild?: Guild; error?: string } {
    // 检查创建条件
    if (leaderLevel < GUILD_CONFIG.createRequirements.minLevel) {
      return { success: false, error: `等级不足，需要${GUILD_CONFIG.createRequirements.minLevel}级` };
    }

    // 检查名称长度
    if (guildName.length < 2 || guildName.length > 12) {
      return { success: false, error: '公会名称长度应为2-12个字符' };
    }

    // 检查是否已有公会
    if (this.getPlayerGuild(leaderId)) {
      return { success: false, error: '您已有公会' };
    }

    // 创建公会
    const guild: Guild = {
      id: `guild_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: guildName,
      leaderId,
      level: 1,
      exp: 0,
      members: new Map(),
      notice: '欢迎加入本公会！',
      createTime: Date.now(),
      skillLevels: new Map(),
      totalContribute: 0,
      rank: 0,
    };

    // 添加会长
    const leaderMember: GuildMember = {
      playerId: leaderId,
      name: leaderName,
      level: leaderLevel,
      position: GUILD_CONFIG.positions.LEADER,
      contribute: 0,
      totalContribute: 0,
      joinTime: Date.now(),
      lastActiveTime: Date.now(),
      weeklyContribute: 0,
      receivedRedPackets: 0,
    };
    guild.members.set(leaderId, leaderMember);

    this.guilds.set(guild.id, guild);
    return { success: true, guild };
  }

  /**
   * 获取玩家公会
   */
  getPlayerGuild(playerId: string): Guild | null {
    for (const guild of this.guilds.values()) {
      if (guild.members.has(playerId)) {
        return guild;
      }
    }
    return null;
  }

  /**
   * 申请加入公会
   */
  applyJoinGuild(playerId: string, playerName: string, playerLevel: number, guildId: string, message: string = ''): { success: boolean; error?: string } {
    const guild = this.guilds.get(guildId);
    if (!guild) {
      return { success: false, error: '公会不存在' };
    }

    // 检查是否已有公会
    if (this.getPlayerGuild(playerId)) {
      return { success: false, error: '您已有公会' };
    }

    // 检查公会是否满员
    const maxMembers = GUILD_CONFIG.memberLimits[guild.level as keyof typeof GUILD_CONFIG.memberLimits];
    if (guild.members.size >= maxMembers) {
      return { success: false, error: '公会人数已满' };
    }

    // 添加申请
    const application: GuildApplication = {
      playerId,
      guildId,
      message,
      time: Date.now(),
      status: 'pending',
    };

    const apps = this.applications.get(guildId) || [];
    apps.push(application);
    this.applications.set(guildId, apps);

    return { success: true };
  }

  /**
   * 处理入会申请
   */
  handleApplication(operatorId: string, playerId: string, accept: boolean): { success: boolean; error?: string } {
    const guild = this.getPlayerGuild(operatorId);
    if (!guild) {
      return { success: false, error: '您没有公会' };
    }

    const operator = guild.members.get(operatorId);
    if (!operator) {
      return { success: false, error: '您不是公会成员' };
    }

    // 检查权限
    const perms = GUILD_CONFIG.positionPermissions[operator.position as keyof typeof GUILD_CONFIG.positionPermissions];
    if (!perms.includes('manage')) {
      return { success: false, error: '您没有管理权限' };
    }

    const apps = this.applications.get(guild.id);
    if (!apps) {
      return { success: false, error: '没有申请记录' };
    }

    const appIndex = apps.findIndex(a => a.playerId === playerId && a.status === 'pending');
    if (appIndex === -1) {
      return { success: false, error: '申请不存在' };
    }

    const app = apps[appIndex];
    if (accept) {
      // 检查公会是否满员
      const maxMembers = GUILD_CONFIG.memberLimits[guild.level as keyof typeof GUILD_CONFIG.memberLimits];
      if (guild.members.size >= maxMembers) {
        app.status = 'rejected';
        return { success: false, error: '公会人数已满' };
      }

      // 添加成员
      const member: GuildMember = {
        playerId: app.playerId,
        name: playerName || '新成员',
        level: 1,
        position: GUILD_CONFIG.positions.RECRUIT,
        contribute: 0,
        totalContribute: 0,
        joinTime: Date.now(),
        lastActiveTime: Date.now(),
        weeklyContribute: 0,
        receivedRedPackets: 0,
      };
      guild.members.set(app.playerId, member);
      app.status = 'accepted';
    } else {
      app.status = 'rejected';
    }

    return { success: true };
  }

  /**
   * 踢出成员
   */
  kickMember(operatorId: string, targetId: string): { success: boolean; error?: string } {
    const guild = this.getPlayerGuild(operatorId);
    if (!guild) {
      return { success: false, error: '您没有公会' };
    }

    const operator = guild.members.get(operatorId);
    if (!operator) {
      return { success: false, error: '您不是公会成员' };
    }

    // 不能踢自己
    if (operatorId === targetId) {
      return { success: false, error: '不能踢自己' };
    }

    // 检查权限
    const perms = GUILD_CONFIG.positionPermissions[operator.position as keyof typeof GUILD_CONFIG.positionPermissions];
    if (!perms.includes('kick')) {
      return { success: false, error: '您没有踢人权限' };
    }

    const target = guild.members.get(targetId);
    if (!target) {
      return { success: false, error: '成员不存在' };
    }

    // 检查职位关系
    if (target.position <= operator.position && operator.position > GUILD_CONFIG.positions.LEADER) {
      return { success: false, error: '不能踢出比自己职位高或相同的成员' };
    }

    guild.members.delete(targetId);
    return { success: true };
  }

  /**
   * 捐献金币
   */
  contributeGold(playerId: string, amount: number): { success: boolean; contribute?: number; error?: string } {
    const guild = this.getPlayerGuild(playerId);
    if (!guild) {
      return { success: false, error: '您没有公会' };
    }

    const member = guild.members.get(playerId);
    if (!member) {
      return { success: false, error: '您不是公会成员' };
    }

    if (amount <= 0) {
      return { success: false, error: '捐献数量必须大于0' };
    }

    // 计算贡献 (1金 = 1贡献)
    const contribute = amount;
    member.contribute += contribute;
    member.totalContribute += contribute;
    member.weeklyContribute += contribute;
    guild.exp += contribute;
    guild.totalContribute += contribute;

    // 检查升级
    this.checkGuildLevelUp(guild);

    return { success: true, contribute };
  }

  /**
   * 检查公会升级
   */
  private checkGuildLevelUp(guild: Guild): boolean {
    const currentLevel = guild.level;
    if (currentLevel >= GUILD_CONFIG.maxLevel) {
      return false;
    }

    const nextExp = GUILD_CONFIG.levelExp[(currentLevel + 1) as keyof typeof GUILD_CONFIG.levelExp];
    if (guild.exp >= nextExp) {
      guild.level++;
      return true;
    }
    return false;
  }

  /**
   * 升级公会技能
   */
  upgradeSkill(playerId: string, skillId: string): { success: boolean; newLevel?: number; error?: string } {
    const guild = this.getPlayerGuild(playerId);
    if (!guild) {
      return { success: false, error: '您没有公会' };
    }

    const skillConfig = GUILD_CONFIG.skills[skillId as keyof typeof GUILD_CONFIG.skills];
    if (!skillConfig) {
      return { success: false, error: '技能不存在' };
    }

    const currentLevel = guild.skillLevels.get(skillId) || 0;
    if (currentLevel >= skillConfig.maxLevel) {
      return { success: false, error: '技能已达满级' };
    }

    const cost = skillConfig.costGold[currentLevel];
    const member = guild.members.get(playerId);
    if (!member) {
      return { success: false, error: '您不是公会成员' };
    }

    if (member.contribute < cost) {
      return { success: false, error: `贡献不足，需要${cost}贡献` };
    }

    // 扣除贡献并升级
    member.contribute -= cost;
    guild.skillLevels.set(skillId, currentLevel + 1);

    return { success: true, newLevel: currentLevel + 1 };
  }

  /**
   * 获取公会技能加成
   */
  getGuildBuff(guild: Guild): object {
    const buff: any = {
      attack: 0,
      defense: 0,
      hp: 0,
      expBonus: 0,
      dropBonus: 0,
    };

    for (const [skillId, level] of guild.skillLevels) {
      if (level > 0) {
        const config = GUILD_CONFIG.skills[skillId as keyof typeof GUILD_CONFIG.skills];
        if (config) {
          const effect = config.effects[level - 1];
          if (skillId === 'guild_attack') buff.attack += effect;
          if (skillId === 'guild_defense') buff.defense += effect;
          if (skillId === 'guild_hp') buff.hp += effect;
          if (skillId === 'guild_exp') buff.expBonus += effect;
          if (skillId === 'guild_drop') buff.dropBonus += effect;
        }
      }
    }

    return buff;
  }

  /**
   * 发放红包
   */
  sendRedPacket(senderId: string, type: number, totalAmount: number, count: number, message: string): { success: boolean; packet?: RedPacket; error?: string } {
    const guild = this.getPlayerGuild(senderId);
    if (!guild) {
      return { success: false, error: '您没有公会' };
    }

    const sender = guild.members.get(senderId);
    if (!sender) {
      return { success: false, error: '您不是公会成员' };
    }

    // 检查权限
    const perms = GUILD_CONFIG.positionPermissions[sender.position as keyof typeof GUILD_CONFIG.positionPermissions];
    if (!perms.includes('redpacket')) {
      return { success: false, error: '您没有发红包权限' };
    }

    // 检查金额
    if (totalAmount < GUILD_CONFIG.redPacketConfig.minAmount) {
      return { success: false, error: `金额不能少于${GUILD_CONFIG.redPacketConfig.minAmount}` };
    }

    if (count <= 0 || count > 100) {
      return { success: false, error: '红包数量应为1-100' };
    }

    // 计算实际到账金额 (扣除税)
    const tax = Math.floor(totalAmount * GUILD_CONFIG.redPacketConfig.taxRate);
    const actualAmount = totalAmount - tax;

    // 创建红包
    const packet: RedPacket = {
      id: `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      guildId: guild.id,
      senderId,
      senderName: sender.name,
      type,
      totalAmount: actualAmount,
      count,
      remainAmount: actualAmount,
      remainCount: count,
      message,
      createTime: Date.now(),
      expireTime: Date.now() + GUILD_CONFIG.redPacketConfig.expireTime,
      receivers: new Map(),
    };

    this.redPackets.set(packet.id, packet);
    return { success: true, packet };
  }

  /**
   * 抢红包
   */
  grabRedPacket(playerId: string, packetId: string): { success: boolean; amount?: number; error?: string } {
    const playerGuild = this.getPlayerGuild(playerId);
    if (!playerGuild) {
      return { success: false, error: '您没有公会' };
    }

    const packet = this.redPackets.get(packetId);
    if (!packet) {
      return { success: false, error: '红包不存在' };
    }

    // 检查是否是同一公会
    if (packet.guildId !== playerGuild.id) {
      return { success: false, error: '不是同一公会' };
    }

    // 检查是否已领取
    if (packet.receivers.has(playerId)) {
      return { success: false, error: '您已领取过该红包' };
    }

    // 检查是否过期
    if (Date.now() > packet.expireTime) {
      return { success: false, error: '红包已过期' };
    }

    // 检查是否还有余额
    if (packet.remainCount <= 0) {
      return { success: false, error: '红包已抢完' };
    }

    // 计算抢到的金额
    let amount: number;
    if (packet.type === GUILD_CONFIG.redPacketConfig.types.LUCKY) {
      // 拼手气
      if (packet.remainCount === 1) {
        amount = packet.remainAmount;
      } else {
        const max = Math.min(packet.remainAmount - (packet.remainCount - 1), packet.remainAmount * 0.5);
        amount = Math.floor(Math.random() * max) + 1;
      }
    } else {
      // 普通/固定
      amount = Math.floor(packet.remainAmount / packet.remainCount);
    }

    // 更新红包
    packet.remainAmount -= amount;
    packet.remainCount--;
    packet.receivers.set(playerId, amount);

    // 更新领取记录
    const member = playerGuild.members.get(playerId);
    if (member) {
      member.receivedRedPackets++;
    }

    return { success: true, amount };
  }

  /**
   * 解散公会
   */
  dismissGuild(leaderId: string): { success: boolean; error?: string } {
    const guild = this.getPlayerGuild(leaderId);
    if (!guild) {
      return { success: false, error: '您没有公会' };
    }

    if (guild.leaderId !== leaderId) {
      return { success: false, error: '只有会长可以解散公会' };
    }

    // 检查公会是否还有其他成员
    if (guild.members.size > 1) {
      return { success: false, error: '公会还有其他成员，无法解散' };
    }

    // 删除公会
    this.guilds.delete(guild.id);
    this.applications.delete(guild.id);

    return { success: true };
  }

  /**
   * 获取公会列表
   */
  getGuildList(page: number = 1, pageSize: number = 20): Guild[] {
    const sorted = Array.from(this.guilds.values()).sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return b.totalContribute - a.totalContribute;
    });

    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }

  /**
   * 获取成员列表
   */
  getMemberList(guildId: string): GuildMember[] {
    const guild = this.guilds.get(guildId);
    if (!guild) return [];

    return Array.from(guild.members.values()).sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return b.totalContribute - a.totalContribute;
    });
  }

  /**
   * 获取申请列表
   */
  getApplicationList(guildId: string): GuildApplication[] {
    const apps = this.applications.get(guildId) || [];
    return apps.filter(a => a.status === 'pending');
  }

  /**
   * 获取红包列表
   */
  getRedPacketList(guildId: string): RedPacket[] {
    const packets: RedPacket[] = [];
    for (const packet of this.redPackets.values()) {
      if (packet.guildId === guildId && packet.remainCount > 0) {
        packets.push(packet);
      }
    }
    return packets.sort((a, b) => b.createTime - a.createTime);
  }
}

// 导出单例
export const guildSystem = new GuildSystem();
