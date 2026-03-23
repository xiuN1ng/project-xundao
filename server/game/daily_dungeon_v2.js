/**
 * 每日副本系统 v2.0
 * 扩展版 - 经验副本、灵石副本、装备副本
 * 难度：简单/普通/困难/炼狱
 * 每日每个难度各1次
 */

class DailyDungeonV2 {
  constructor() {
    // 副本类型配置
    this.DUNGEON_TYPES = {
      exp: {
        id: 'exp',
        name: '经验副本',
        description: '大量修炼经验产出',
        icon: '⭐',
        primaryReward: 'exp',
        realmReq: 0
      },
      spirit_stones: {
        id: 'spirit_stones',
        name: '灵石副本',
        description: '大量灵石产出',
        icon: '💎',
        primaryReward: 'spirit_stones',
        realmReq: 1
      },
      equipment: {
        id: 'equipment',
        name: '装备副本',
        description: '稀有装备获取',
        icon: '⚔️',
        primaryReward: 'equipment',
        realmReq: 2
      }
    };

    // 难度配置
    this.DIFFICULTIES = {
      easy: { id: 'easy', name: '简单', hpMultiplier: 0.5, atkMultiplier: 0.5, rewardMultiplier: 0.5 },
      normal: { id: 'normal', name: '普通', hpMultiplier: 1.0, atkMultiplier: 1.0, rewardMultiplier: 1.0 },
      hard: { id: 'hard', name: '困难', hpMultiplier: 2.0, atkMultiplier: 2.0, rewardMultiplier: 2.0 },
      hell: { id: 'hell', name: '炼狱', hpMultiplier: 4.0, atkMultiplier: 3.0, rewardMultiplier: 4.0 }
    };

    // 基础敌人数据
    this.BASE_ENEMIES = {
      exp: [
        { name: '灵气蛇', hp: 200, atk: 15, def: 2, exp: 50 },
        { name: '灵草园守护', hp: 350, atk: 25, def: 5, exp: 80 },
        { name: '山魈', hp: 500, atk: 40, def: 8, exp: 120 },
        { name: '灵泉守卫', hp: 800, atk: 60, def: 12, exp: 200 },
        { name: '试炼长老', hp: 1200, atk: 80, def: 15, exp: 300 }
      ],
      spirit_stones: [
        { name: '灵石精灵', hp: 150, atk: 10, def: 1, stones: 100 },
        { name: '矿脉守卫', hp: 300, atk: 20, def: 3, stones: 250 },
        { name: '地底魔物', hp: 450, atk: 35, def: 6, stones: 500 },
        { name: '灵石巨兽', hp: 700, atk: 50, def: 10, stones: 1000 },
        { name: '灵石龙王', hp: 1000, atk: 70, def: 12, stones: 2000 }
      ],
      equipment: [
        { name: '骷髅战士', hp: 250, atk: 20, def: 5, equipment: 'common' },
        { name: '黑曜石魔像', hp: 400, atk: 30, def: 10, equipment: 'uncommon' },
        { name: '暗影刺客', hp: 600, atk: 45, def: 8, equipment: 'uncommon' },
        { name: '深渊恶魔', hp: 900, atk: 65, def: 15, equipment: 'rare' },
        { name: '装备守护者', hp: 1500, atk: 90, def: 20, equipment: 'epic' }
      ]
    };

    // 装备掉落配置
    this.EQUIPMENT_DROPS = {
      common: ['铁剑', '皮甲', '木戒指'],
      uncommon: ['精钢剑', '锁子甲', '银戒指'],
      rare: ['灵器·赤焰', '天蚕宝衣', '玉佩'],
      epic: ['仙器·九霄', '凤凰羽衣', '乾坤玉']
    };

    // 玩家状态
    this.playerState = {
      currentDungeon: null,
      currentDifficulty: null,
      currentEnemyIndex: 0,
      battleInProgress: false,
      playerHp: 0,
      playerMaxHp: 0,
      playerAtk: 0,
      playerDef: 0,
      enemyHp: 0,
      enemyMaxHp: 0,
      enemyAtk: 0,
      enemyDef: 0,
      battleLog: [],
      rewards: null,
      todayChallenges: {} // { 'exp_easy': 1, 'exp_normal': 0, ... }
    };
  }

  /**
   * 获取今天的日期字符串 (YYYY-MM-DD)
   */
  _getTodayDateString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  /**
   * 生成副本次数记录的key
   */
  _getChallengeKey(dungeonId, difficulty) {
    return `${dungeonId}_${difficulty}`;
  }

  /**
   * 获取副本店列表
   * @returns {Array} 副本列表
   */
  getDungeons() {
    const dungeons = [];
    
    for (const [typeId, typeConfig] of Object.entries(this.DUNGEON_TYPES)) {
      for (const [diffId, diffConfig] of Object.entries(this.DIFFICULTIES)) {
        const dungeonId = `${typeId}_${diffId}`;
        
        // 计算奖励预览
        const baseReward = this._calculateBaseReward(typeId, diffId);
        
        dungeons.push({
          id: dungeonId,
          type: typeId,
          typeName: typeConfig.name,
          typeIcon: typeConfig.icon,
          difficulty: diffId,
          difficultyName: diffConfig.name,
          name: `${typeConfig.name}-${diffConfig.name}`,
          description: typeConfig.description,
          icon: typeConfig.icon,
          realmReq: typeConfig.realmReq,
          rewardPreview: baseReward,
          // 今日剩余次数 (由外部传入玩家数据后计算)
          remainingTimes: null
        });
      }
    }
    
    return dungeons;
  }

  /**
   * 计算基础奖励
   */
  _calculateBaseReward(typeId, difficulty) {
    const diff = this.DIFFICULTIES[difficulty];
    const base = diff.rewardMultiplier;
    
    switch (typeId) {
      case 'exp':
        return {
          exp: Math.floor(100 * base)
        };
      case 'spirit_stones':
        return {
          spiritStones: Math.floor(200 * base)
        };
      case 'equipment':
        return {
          equipment: this.EQUIPMENT_DROPS[this._getEquipmentRarity(difficulty)][0]
        };
      default:
        return {};
    }
  }

  /**
   * 获取装备稀有度
   */
  _getEquipmentRarity(difficulty) {
    const rarityMap = {
      easy: 'common',
      normal: 'uncommon',
      hard: 'rare',
      hell: 'epic'
    };
    return rarityMap[difficulty] || 'common';
  }

  /**
   * 进入副本
   * @param {string} dungeonId - 副本ID
   * @param {string} difficulty - 难度
   * @param {Object} playerStats - 玩家属性 { hp, maxHp, atk, def }
   * @returns {Object} 进入结果
   */
  enter(dungeonId, difficulty, playerStats = { hp: 100, maxHp: 100, atk: 10, def: 0 }) {
    // 解析副本ID
    const [typeId] = dungeonId.split('_');
    
    // 验证副本类型
    if (!this.DUNGEON_TYPES[typeId]) {
      return {
        success: false,
        error: '无效的副本类型'
      };
    }
    
    // 验证难度
    if (!this.DIFFICULTIES[difficulty]) {
      return {
        success: false,
        error: '无效的难度等级'
      };
    }
    
    // 检查今日是否已挑战
    const challengeKey = this._getChallengeKey(dungeonId, difficulty);
    if (this.playerState.todayChallenges[challengeKey] >= 1) {
      return {
        success: false,
        error: `今日${this.DIFFICULTIES[difficulty].name}难度已挑战1次`
      };
    }
    
    // 初始化战斗
    this.playerState.currentDungeon = dungeonId;
    this.playerState.currentDifficulty = difficulty;
    this.playerState.currentEnemyIndex = 0;
    this.playerState.battleInProgress = true;
    
    // 设置玩家属性
    this.playerState.playerHp = playerStats.hp || playerStats.maxHp;
    this.playerState.playerMaxHp = playerStats.maxHp || 100;
    this.playerState.playerAtk = playerStats.atk || 10;
    this.playerState.playerDef = playerStats.def || 0;
    
    // 生成第一个敌人
    this._generateEnemy();
    
    return {
      success: true,
      data: {
        dungeonId: this.playerState.currentDungeon,
        difficulty: this.playerState.currentDifficulty,
        dungeonName: `${this.DUNGEON_TYPES[typeId].name}-${this.DIFFICULTIES[difficulty].name}`,
        currentEnemyIndex: this.playerState.currentEnemyIndex,
        totalEnemies: this.BASE_ENEMIES[typeId].length,
        player: {
          hp: this.playerState.playerHp,
          maxHp: this.playerState.playerMaxHp,
          atk: this.playerState.playerAtk,
          def: this.playerState.playerDef
        },
        enemy: {
          name: this.playerState.enemy?.name || '',
          hp: this.playerState.enemyHp,
          maxHp: this.playerState.enemyMaxHp,
          atk: this.playerState.enemyAtk,
          def: this.playerState.enemyDef
        },
        battleLog: ['战斗开始！']
      }
    };
  }

  /**
   * 生成敌人
   */
  _generateEnemy() {
    const typeId = this.playerState.currentDungeon.split('_')[0];
    const difficulty = this.playerState.currentDifficulty;
    const diff = this.DIFFICULTIES[difficulty];
    
    const enemies = this.BASE_ENEMIES[typeId];
    const enemyBase = enemies[this.playerState.currentEnemyIndex] || enemies[0];
    
    this.playerState.enemyMaxHp = Math.floor(enemyBase.hp * diff.hpMultiplier);
    this.playerState.enemyHp = this.playerState.enemyMaxHp;
    this.playerState.enemyAtk = Math.floor(enemyBase.atk * diff.atkMultiplier);
    this.playerState.enemyDef = Math.floor(enemyBase.def || 0);
    
    this.playerState.enemy = { ...enemyBase };
    this.playerState.battleLog = [];
  }

  /**
   * 战斗一次
   * @returns {Object} 战斗结果
   */
  battle() {
    if (!this.playerState.battleInProgress) {
      return {
        success: false,
        error: '没有进行中的战斗'
      };
    }
    
    const log = [];
    
    // 玩家攻击
    const playerDamage = Math.max(1, this.playerState.playerAtk - this.playerState.enemyDef);
    this.playerState.enemyHp -= playerDamage;
    log.push(`你对${this.playerState.enemy.name}造成了${playerDamage}点伤害`);
    
    // 检查敌人是否死亡
    if (this.playerState.enemyHp <= 0) {
      // 敌人死亡
      this.playerState.enemyHp = 0;
      log.push(`你击败了${this.playerState.enemy.name}！`);
      
      // 检查是否还有更多敌人
      const typeId = this.playerState.currentDungeon.split('_')[0];
      if (this.playerState.currentEnemyIndex < this.BASE_ENEMIES[typeId].length - 1) {
        // 进入下一关
        this.playerState.currentEnemyIndex++;
        this._generateEnemy();
        log.push(`下一波敌人：${this.playerState.enemy.name} (HP: ${this.playerState.enemyHp})`);
        
        return {
          success: true,
          data: {
            battleType: 'next_wave',
            playerHp: this.playerState.playerHp,
            enemyHp: this.playerState.enemyHp,
            enemyMaxHp: this.playerState.enemyMaxHp,
            currentEnemyIndex: this.playerState.currentEnemyIndex,
            totalEnemies: this.BASE_ENEMIES[typeId].length,
            enemyName: this.playerState.enemy.name,
            log
          }
        };
      } else {
        // 副本完成 - 准备结算
        return {
          success: true,
          data: {
            battleType: 'dungeon_complete',
            playerHp: this.playerState.playerHp,
            log,
            readyForRewards: true
          }
        };
      }
    }
    
    // 敌人攻击
    const enemyDamage = Math.max(1, this.playerState.enemyAtk - this.playerState.playerDef);
    this.playerState.playerHp -= enemyDamage;
    log.push(`${this.playerState.enemy.name}对你造成了${enemyDamage}点伤害`);
    
    // 检查玩家是否死亡
    if (this.playerState.playerHp <= 0) {
      this.playerState.playerHp = 0;
      this.playerState.battleInProgress = false;
      log.push('你已阵亡，挑战失败！');
      
      return {
        success: true,
        data: {
          battleType: 'player_defeated',
          playerHp: this.playerState.playerHp,
          enemyHp: this.playerState.enemyHp,
          log,
          defeated: true
        }
      };
    }
    
    return {
      success: true,
      data: {
        battleType: 'continue',
        playerHp: this.playerState.playerHp,
        enemyHp: this.playerState.enemyHp,
        enemyMaxHp: this.playerState.enemyMaxHp,
        log
      }
    };
  }

  /**
   * 结算奖励
   * @param {Object} playerStats - 玩家当前属性 (用于更新)
   * @returns {Object} 奖励结果
   */
  getRewards(playerStats = {}) {
    if (!this.playerState.currentDungeon) {
      return {
        success: false,
        error: '没有进行中的副本'
      };
    }
    
    const typeId = this.playerState.currentDungeon.split('_')[0];
    const difficulty = this.playerState.currentDifficulty;
    const diff = this.DIFFICULTIES[difficulty];
    const typeConfig = this.DUNGEON_TYPES[typeId];
    
    // 计算奖励
    const rewards = {
      exp: 0,
      spiritStones: 0,
      equipment: null
    };
    
    // 根据副本类型计算奖励
    switch (typeId) {
      case 'exp':
        // 经验副本: 基础经验 * 难度倍率 * 敌人数量
        rewards.exp = Math.floor(100 * diff.rewardMultiplier * 5);
        break;
        
      case 'spirit_stones':
        // 灵石副本: 基础灵石 * 难度倍率 * 敌人数量
        rewards.spiritStones = Math.floor(200 * diff.rewardMultiplier * 5);
        break;
        
      case 'equipment':
        // 装备副本: 掉落装备
        const rarity = this._getEquipmentRarity(difficulty);
        const equipList = this.EQUIPMENT_DROPS[rarity];
        rewards.equipment = equipList[Math.floor(Math.random() * equipList.length)];
        // 少量灵石作为额外奖励
        rewards.spiritStones = Math.floor(50 * diff.rewardMultiplier);
        break;
    }
    
    // 记录挑战次数
    const challengeKey = this._getChallengeKey(this.playerState.currentDungeon, difficulty);
    this.playerState.todayChallenges[challengeKey] = 1;
    
    // 保存奖励用于查看
    this.playerState.rewards = rewards;
    
    // 重置状态
    this.playerState.battleInProgress = false;
    this.playerState.currentDungeon = null;
    this.playerState.currentDifficulty = null;
    this.playerState.currentEnemyIndex = 0;
    
    return {
      success: true,
      data: {
        dungeonType: typeId,
        difficulty: difficulty,
        difficultyName: diff.name,
        rewards,
        totalEnemies: 5,
        challengeRecorded: true
      }
    };
  }

  /**
   * 获取今日挑战状态
   * @param {string} dungeonId - 副本ID
   * @param {string} difficulty - 难度
   * @returns {Object} 挑战状态
   */
  getChallengeStatus(dungeonId, difficulty) {
    const challengeKey = this._getChallengeKey(dungeonId, difficulty);
    const used = this.playerState.todayChallenges[challengeKey] || 0;
    
    return {
      dungeonId,
      difficulty,
      used: used,
      remaining: Math.max(0, 1 - used)
    };
  }

  /**
   * 获取所有副今日挑战状态
   * @returns {Object} 所有副本的挑战状态
   */
  getAllChallengeStatus() {
    const status = {};
    const dungeons = this.getDungeons();
    
    for (const dungeon of dungeons) {
      status[dungeon.id] = this.getChallengeStatus(dungeon.id, dungeon.difficulty);
    }
    
    return status;
  }

  /**
   * 重置今日挑战 (每天0点调用)
   */
  resetDailyChallenges() {
    this.playerState.todayChallenges = {};
    return { success: true, message: '每日挑战已重置' };
  }

  /**
   * 获取当前战斗状态
   */
  getBattleStatus() {
    if (!this.playerState.battleInProgress && !this.playerState.currentDungeon) {
      return {
        inBattle: false,
        message: '未在进行副本'
      };
    }
    
    const typeId = this.playerState.currentDungeon?.split('_')[0];
    
    return {
      inBattle: this.playerState.battleInProgress,
      dungeonId: this.playerState.currentDungeon,
      difficulty: this.playerState.currentDifficulty,
      currentEnemyIndex: this.playerState.currentEnemyIndex,
      totalEnemies: typeId ? this.BASE_ENEMIES[typeId].length : 0,
      player: {
        hp: this.playerState.playerHp,
        maxHp: this.playerState.playerMaxHp
      },
      enemy: {
        name: this.playerState.enemy?.name || '',
        hp: this.playerState.enemyHp,
        maxHp: this.playerState.enemyMaxHp
      }
    };
  }
}

// 导出
module.exports = DailyDungeonV2;
