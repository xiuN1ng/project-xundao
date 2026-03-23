/**
 * 护送活动系统 (Escort Activity System)
 * 护送NPC/货物到达目的地，途中可能遭遇劫匪
 */

export type EscortType = 'goods' | 'person' | 'royal' | 'merchant';
export type EscortState = 'waiting' | ' escorting' | 'completed' | 'failed' | 'robbed';
export type RobberDifficulty = 'easy' | 'normal' | 'hard' | 'boss';

export interface EscortRoute {
  id: string;
  name: string;
  startPoint: string;
  endPoint: string;
  distance: number; // 距离（单位：里）
  duration: number; // 预计时间（毫秒）
  difficulty: RobberDifficulty;
  recommendedLevel: number;
}

export interface EscortReward {
  baseGold: number;
  baseExp: number;
  bonusGold: number; // 完美护送奖励
  bonusExp: number;
  items?: Array<{
    id: string;
    name: string;
    amount: number;
    probability?: number;
  }>;
}

export interface EscortMission {
  id: string;
  type: EscortType;
  name: string;
  description: string;
  npc: string; // 护送NPC名称
  route: EscortRoute;
  reward: EscortReward;
  levelRequired: number;
  duration: number; // 任务时限（毫秒）
}

export interface RobberEncounter {
  id: string;
  name: string;
  description: string;
  difficulty: RobberDifficulty;
  strength: number; // 战斗力
  rewards: Array<{
    id: string;
    name: string;
    amount: number;
  }>;
  spawnProbability: number; // 遭遇概率 0-1
}

export interface PlayerEscortData {
  playerId: string;
  missionId: string | null;
  state: EscortState;
  startTime: number;
  progress: number; // 0-100 护送进度
  currentPosition: number; // 当前进度位置
  encounterRobber: boolean;
  encounterCount: number;
  successCount: number;
  failCount: number;
  completedCount: number;
  abandonedCount: number;
  lastUpdate: number;
}

class EscortActivitySystem {
  private missions: Map<string, EscortMission> = new Map();
  private robbers: Map<string, RobberEncounter> = new Map();
  private playerData: Map<string, PlayerEscortData> = new Map();

  // 护送路线配置
  private routes: EscortRoute[] = [
    {
      id: 'route_1',
      name: '京城护送',
      startPoint: '长安城',
      endPoint: '洛阳',
      distance: 500,
      duration: 10 * 60 * 1000, // 10分钟
      difficulty: 'easy',
      recommendedLevel: 1
    },
    {
      id: 'route_2',
      name: '丝绸之路',
      startPoint: '长安城',
      endPoint: '敦煌',
      distance: 1500,
      duration: 30 * 60 * 1000,
      difficulty: 'normal',
      recommendedLevel: 10
    },
    {
      id: 'route_3',
      name: '江南水运',
      startPoint: '扬州',
      endPoint: '杭州',
      distance: 300,
      duration: 15 * 60 * 1000,
      difficulty: 'easy',
      recommendedLevel: 5
    },
    {
      id: 'route_4',
      name: '边疆运送',
      startPoint: '边关',
      endPoint: '前线',
      distance: 800,
      duration: 20 * 60 * 1000,
      difficulty: 'hard',
      recommendedLevel: 30
    },
    {
      id: 'route_5',
      name: '皇室密使',
      startPoint: '皇宫',
      endPoint: '江南行宫',
      distance: 2000,
      duration: 45 * 60 * 1000,
      difficulty: 'boss',
      recommendedLevel: 50
    }
  ];

  // 护送任务配置
  private missionTemplates: EscortMission[] = [
    {
      id: 'escort_goods_1',
      type: 'goods',
      name: '运送绸缎',
      description: '护送商队运送一批珍贵绸缎至洛阳',
      npc: '商队首领',
      route: this.routes[0],
      reward: {
        baseGold: 100,
        baseExp: 50,
        bonusGold: 50,
        bonusExp: 25,
        items: [
          { id: 'silk', name: '绸缎', amount: 1, probability: 0.3 }
        ]
      },
      levelRequired: 1,
      duration: 15 * 60 * 1000
    },
    {
      id: 'escort_goods_2',
      type: 'goods',
      name: '丝绸之路商队',
      description: '护送商队穿越丝绸之路抵达敦煌',
      npc: '波斯商人',
      route: this.routes[1],
      reward: {
        baseGold: 500,
        baseExp: 200,
        bonusGold: 200,
        bonusExp: 100,
        items: [
          { id: 'exotic_goods', name: '异域珍宝', amount: 1, probability: 0.5 },
          { id: 'gold_ingot', name: '金锭', amount: 2, probability: 0.3 }
        ]
      },
      levelRequired: 10,
      duration: 40 * 60 * 1000
    },
    {
      id: 'escort_merchant_1',
      type: 'merchant',
      name: '商人护送',
      description: '保护富商前往杭州进行贸易',
      npc: '王大富',
      route: this.routes[2],
      reward: {
        baseGold: 200,
        baseExp: 100,
        bonusGold: 80,
        bonusExp: 50,
        items: [
          { id: 'trade_permit', name: '经商执照', amount: 1, probability: 0.4 }
        ]
      },
      levelRequired: 5,
      duration: 25 * 60 * 1000
    },
    {
      id: 'escort_person_1',
      type: 'person',
      name: '官员押送',
      description: '护送朝廷官员前往边关上任',
      npc: '李大人',
      route: this.routes[3],
      reward: {
        baseGold: 800,
        baseExp: 400,
        bonusGold: 300,
        bonusExp: 200,
        items: [
          { id: 'official_seal', name: '官印', amount: 1, probability: 0.2 },
          { id: 'merit_scroll', name: '功勋册', amount: 1, probability: 0.5 }
        ]
      },
      levelRequired: 30,
      duration: 30 * 60 * 1000
    },
    {
      id: 'escort_royal_1',
      type: 'royal',
      name: '密使护送',
      description: '暗中护送皇室密使前往江南行宫',
      npc: '神秘公公',
      route: this.routes[4],
      reward: {
        baseGold: 2000,
        baseExp: 1000,
        bonusGold: 1000,
        bonusExp: 500,
        items: [
          { id: 'imperial_edict', name: '密旨', amount: 1, probability: 1 },
          { id: 'royal_jade', name: '御玉', amount: 1, probability: 0.3 },
          { id: 'legendary_box', name: '传奇宝盒', amount: 1, probability: 0.1 }
        ]
      },
      levelRequired: 50,
      duration: 60 * 60 * 1000
    }
  ];

  // 劫匪配置
  private robberTemplates: RobberEncounter[] = [
    {
      id: 'robber_easy_1',
      name: '山贼喽啰',
      description: '拦路打劫的山贼小喽啰',
      difficulty: 'easy',
      strength: 100,
      rewards: [
        { id: 'copper_coin', name: '铜钱', amount: 10 }
      ],
      spawnProbability: 0.3
    },
    {
      id: 'robber_easy_2',
      name: '流窜盗贼',
      description: '四处流窜的小毛贼',
      difficulty: 'easy',
      strength: 150,
      rewards: [
        { id: 'silver_coin', name: '银两', amount: 5 }
      ],
      spawnProbability: 0.25
    },
    {
      id: 'robber_normal_1',
      name: '山寨大王',
      description: '占山为王的寨主',
      difficulty: 'normal',
      strength: 500,
      rewards: [
        { id: 'gold_coin', name: '金币', amount: 10 },
        { id: 'bronze_sword', name: '青铜剑', amount: 1 }
      ],
      spawnProbability: 0.2
    },
    {
      id: 'robber_normal_2',
      name: '沙漠悍匪',
      description: '丝绸之路上的悍匪',
      difficulty: 'normal',
      strength: 600,
      rewards: [
        { id: 'gold_coin', name: '金币', amount: 15 },
        { id: 'camel', name: '骆驼', amount: 1 }
      ],
      spawnProbability: 0.15
    },
    {
      id: 'robber_hard_1',
      name: '血手人屠',
      description: '臭名昭著的恶匪',
      difficulty: 'hard',
      strength: 1500,
      rewards: [
        { id: 'blood_dagger', name: '血刃', amount: 1 },
        { id: 'dark_gem', name: '暗影宝石', amount: 1 }
      ],
      spawnProbability: 0.1
    },
    {
      id: 'robber_hard_2',
      name: '杀手组织',
      description: '拿钱办事的杀手集团',
      difficulty: 'hard',
      strength: 1800,
      rewards: [
        { id: 'poison_dart', name: '淬毒飞镖', amount: 5 },
        { id: 'assassin_mask', name: '刺客面具', amount: 1 }
      ],
      spawnProbability: 0.1
    },
    {
      id: 'robber_boss_1',
      name: '武林盟主叛徒',
      description: '背叛武林的超级高手',
      difficulty: 'boss',
      strength: 5000,
      rewards: [
        { id: 'hero_sword', name: '英雄剑', amount: 1 },
        { id: 'martial_arts_manual', name: '武林秘籍', amount: 1 }
      ],
      spawnProbability: 0.05
    }
  ];

  constructor() {
    this.initMissions();
    this.initRobbers();
  }

  /**
   * 初始化护送任务
   */
  private initMissions(): void {
    for (const mission of this.missionTemplates) {
      this.missions.set(mission.id, mission);
    }
  }

  /**
   * 初始化劫匪
   */
  private initRobbers(): void {
    for (const robber of this.robberTemplates) {
      this.robbers.set(robber.id, robber);
    }
  }

  /**
   * 获取所有护送任务
   */
  getAllMissions(): EscortMission[] {
    return Array.from(this.missions.values());
  }

  /**
   * 获取可接取的任务（根据玩家等级）
   */
  getAvailableMissions(playerLevel: number): EscortMission[] {
    const available: EscortMission[] = [];
    for (const mission of this.missions.values()) {
      if (mission.levelRequired <= playerLevel) {
        available.push(mission);
      }
    }
    return available;
  }

  /**
   * 获取任务详情
   */
  getMission(missionId: string): EscortMission | undefined {
    return this.missions.get(missionId);
  }

  /**
   * 接取护送任务
   */
  acceptMission(playerId: string, missionId: string): {
    success: boolean;
    message: string;
    mission?: EscortMission;
    data?: PlayerEscortData;
  } {
    const mission = this.missions.get(missionId);
    if (!mission) {
      return { success: false, message: '护送任务不存在' };
    }

    // 检查是否已有进行中的任务
    const playerData = this.getPlayerData(playerId);
    if (playerData.missionId !== null && playerData.state === 'escorting') {
      return { success: false, message: '已有进行中的护送任务' };
    }

    // 初始化玩家数据
    playerData.missionId = missionId;
    playerData.state = 'escorting';
    playerData.startTime = Date.now();
    playerData.progress = 0;
    playerData.currentPosition = 0;
    playerData.encounterRobber = false;
    playerData.encounterCount = 0;
    playerData.successCount = 0;
    playerData.failCount = 0;
    playerData.lastUpdate = Date.now();

    this.playerData.set(playerId, playerData);

    return {
      success: true,
      message: `护送任务已接取：${mission.name}，护送 ${mission.npc} 从 ${mission.route.startPoint} 到 ${mission.route.endPoint}`,
      mission,
      data: playerData
    };
  }

  /**
   * 放弃护送任务
   */
  abandonMission(playerId: string): {
    success: boolean;
    message: string;
  } {
    const playerData = this.getPlayerData(playerId);

    if (playerData.state !== 'escorting') {
      return { success: false, message: '没有进行中的护送任务' };
    }

    playerData.state = 'failed';
    playerData.missionId = null;
    playerData.abandonedCount++;
    playerData.lastUpdate = Date.now();

    return {
      success: true,
      message: '护送任务已放弃'
    };
  }

  /**
   * 更新护送进度
   */
  updateProgress(playerId: string, progress: number): {
    success: boolean;
    message: string;
    completed?: boolean;
    data?: PlayerEscortData;
  } {
    const playerData = this.getPlayerData(playerId);

    if (playerData.state !== 'escorting') {
      return { success: false, message: '没有进行中的护送任务' };
    }

    const mission = this.missions.get(playerData.missionId!);
    if (!mission) {
      return { success: false, message: '任务数据异常' };
    }

    // 检查超时
    if (Date.now() - playerData.startTime > mission.duration) {
      playerData.state = 'failed';
      playerData.missionId = null;
      return { success: false, message: '任务超时失败', data: playerData };
    }

    // 更新进度
    playerData.progress = Math.min(100, Math.max(0, progress));
    playerData.currentPosition = (playerData.progress / 100) * mission.route.distance;
    playerData.lastUpdate = Date.now();

    // 检查是否完成
    if (playerData.progress >= 100) {
      playerData.state = 'completed';
      playerData.completedCount++;
      playerData.missionId = null;

      return {
        success: true,
        message: '护送任务完成！',
        completed: true,
        data: playerData
      };
    }

    return {
      success: true,
      message: `当前进度：${playerData.progress.toFixed(1)}%`,
      data: playerData
    };
  }

  /**
   * 遭遇劫匪
   */
  encounterRobber(playerId: string): {
    success: boolean;
    message: string;
    robber?: RobberEncounter;
    data?: PlayerEscortData;
  } {
    const playerData = this.getPlayerData(playerId);

    if (playerData.state !== 'escorting') {
      return { success: false, message: '没有进行中的护送任务' };
    }

    const mission = this.missions.get(playerData.missionId!);
    if (!mission) {
      return { success: false, message: '任务数据异常' };
    }

    // 检查是否已经遭遇过劫匪
    if (playerData.encounterRobber) {
      return { success: false, message: '本次护送已遭遇过劫匪' };
    }

    // 根据路线难度决定遭遇概率
    const baseProbability = this.getRouteRobberProbability(mission.route.difficulty);
    
    // 随机判定是否遭遇劫匪
    if (Math.random() > baseProbability) {
      return { success: false, message: '一路平安，没有遇到劫匪' };
    }

    // 根据难度选择劫匪
    const suitableRobbers = this.robberTemplates.filter(
      r => r.difficulty === mission.route.difficulty ||
           (mission.route.difficulty === 'easy' && r.difficulty === 'easy') ||
           (mission.route.difficulty === 'normal' && ['easy', 'normal'].includes(r.difficulty))
    );

    if (suitableRobbers.length === 0) {
      return { success: false, message: '没有合适的劫匪' };
    }

    const robber = suitableRobbers[Math.floor(Math.random() * suitableRobbers.length)];

    // 记录遭遇
    playerData.encounterRobber = true;
    playerData.encounterCount++;
    playerData.lastUpdate = Date.now();

    return {
      success: true,
      message: `遭遇劫匪：${robber.name}！${robber.description}`,
      robber,
      data: playerData
    };
  }

  /**
   * 击退劫匪
   */
  defeatRobber(playerId: string, playerStrength: number): {
    success: boolean;
    message: string;
    rewards?: Array<{ id: string; name: string; amount: number }>;
    data?: PlayerEscortData;
  } {
    const playerData = this.getPlayerData(playerId);

    if (playerData.state !== 'escorting') {
      return { success: false, message: '没有进行中的护送任务' };
    }

    if (!playerData.encounterRobber) {
      return { success: false, message: '当前没有遭遇劫匪' };
    }

    // 模拟战斗结果（实际应该由战斗系统判定）
    const mission = this.missions.get(playerData.missionId!);
    const difficultyMultiplier = mission ? this.getDifficultyMultiplier(mission.route.difficulty) : 1;
    
    // 简单判定：玩家实力 > 劫匪实力 * 难度系数则胜利
    const win = playerStrength > 100 * difficultyMultiplier;

    if (win) {
      playerData.successCount++;
      playerData.encounterRobber = false; // 重置遭遇状态，可以再次遭遇
      playerData.lastUpdate = Date.now();

      // 获取击败奖励
      const suitableRobbers = this.robberTemplates.filter(
        r => mission && (r.difficulty === mission.route.difficulty || 
               (mission.route.difficulty === 'easy' && r.difficulty === 'easy'))
      );
      const robber = suitableRobbers[Math.floor(Math.random() * suitableRobbers.length)];

      return {
        success: true,
        message: `成功击退劫匪 ${robber.name}！获得战利品`,
        rewards: robber.rewards,
        data: playerData
      };
    } else {
      playerData.failCount++;
      playerData.state = 'robbed';
      playerData.missionId = null;

      return {
        success: false,
        message: '击退劫匪失败，护送任务失败',
        data: playerData
      };
    }
  }

  /**
   * 完成任务并发放奖励
   */
  completeMission(playerId: string, isPerfect: boolean = false): {
    success: boolean;
    message: string;
    rewards?: {
      gold: number;
      exp: number;
      items: Array<{ id: string; name: string; amount: number }>;
    };
    data?: PlayerEscortData;
  } {
    const playerData = this.getPlayerData(playerId);

    if (playerData.state !== 'completed') {
      return { success: false, message: '任务未完成，无法领取奖励' };
    }

    // 获取任务奖励
    // 这里需要根据实际任务ID获取，简化处理
    const mission = this.missionTemplates.find(m => m.id === playerData.missionId);
    if (!mission) {
      return { success: false, message: '任务数据异常' };
    }

    // 计算奖励
    const gold = isPerfect 
      ? mission.reward.baseGold + mission.reward.bonusGold 
      : mission.reward.baseGold;
    const exp = isPerfect 
      ? mission.reward.baseExp + mission.reward.bonusExp 
      : mission.reward.baseExp;

    // 随机获取物品奖励
    const items: Array<{ id: string; name: string; amount: number }> = [];
    if (mission.reward.items) {
      for (const item of mission.reward.items) {
        const roll = Math.random();
        if (roll < (item.probability || 1)) {
          items.push({
            id: item.id,
            name: item.name,
            amount: item.amount
          });
        }
      }
    }

    // 重置玩家数据
    playerData.state = 'waiting';
    playerData.progress = 0;
    playerData.currentPosition = 0;
    playerData.encounterRobber = false;
    playerData.lastUpdate = Date.now();

    return {
      success: true,
      message: isPerfect 
        ? `护送完成！完美护送获得额外奖励：${mission.reward.bonusGold}金币、${mission.reward.bonusExp}经验`
        : `护送完成！获得奖励`,
      rewards: { gold, exp, items },
      data: playerData
    };
  }

  /**
   * 获取玩家护送数据
   */
  getPlayerData(playerId: string): PlayerEscortData {
    if (!this.playerData.has(playerId)) {
      this.playerData.set(playerId, {
        playerId,
        missionId: null,
        state: 'waiting',
        startTime: 0,
        progress: 0,
        currentPosition: 0,
        encounterRobber: false,
        encounterCount: 0,
        successCount: 0,
        failCount: 0,
        completedCount: 0,
        abandonedCount: 0,
        lastUpdate: Date.now()
      });
    }
    return this.playerData.get(playerId)!;
  }

  /**
   * 获取玩家当前任务状态
   */
  getPlayerMissionState(playerId: string): {
    hasMission: boolean;
    mission?: EscortMission;
    data?: PlayerEscortData;
  } {
    const playerData = this.getPlayerData(playerId);

    if (!playerData.missionId || playerData.state !== 'escorting') {
      return { hasMission: false };
    }

    const mission = this.missions.get(playerData.missionId);
    return {
      hasMission: true,
      mission,
      data: playerData
    };
  }

  /**
   * 获取路线遭遇劫匪概率
   */
  private getRouteRobberProbability(difficulty: RobberDifficulty): number {
    const probabilities: Record<RobberDifficulty, number> = {
      easy: 0.3,
      normal: 0.5,
      hard: 0.7,
      boss: 0.9
    };
    return probabilities[difficulty];
  }

  /**
   * 获取难度倍数
   */
  private getDifficultyMultiplier(difficulty: RobberDifficulty): number {
    const multipliers: Record<RobberDifficulty, number> = {
      easy: 1,
      normal: 2,
      hard: 4,
      boss: 8
    };
    return multipliers[difficulty];
  }

  /**
   * 获取护送统计
   */
  getPlayerStatistics(playerId: string): {
    completed: number;
    abandoned: number;
    totalEncounters: number;
    successDefeats: number;
    failDefeats: number;
  } {
    const data = this.getPlayerData(playerId);
    return {
      completed: data.completedCount,
      abandoned: data.abandonedCount,
      totalEncounters: data.encounterCount,
      successDefeats: data.successCount,
      failDefeats: data.failCount
    };
  }
}

export const escortActivitySystem = new EscortActivitySystem();
export default EscortActivitySystem;
