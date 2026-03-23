/**
 * 排行榜系统 (Ranking System)
 * 战力排行、收藏排行、境界排行
 */

export interface RankEntry {
  playerId: string;
  playerName: string;
  level: number;
  realmLevel: number;
  combatPower: number;
  collectionScore: number;
  rank: number;
  lastUpdated: number;
}

export interface RankType {
  type: 'combat' | 'collection' | 'realm' | 'wealth';
  name: string;
  description: string;
  icon: string;
}

export interface PlayerRankData {
  playerId: string;
  ranks: {
    combat: number;
    collection: number;
    realm: number;
    wealth: number;
  };
  lastUpdated: number;
}

class RankingSystem {
  private ranks: Map<string, RankEntry[]> = new Map();
  private playerData: Map<string, PlayerRankData> = new Map();
  
  // 排行榜类型配置
  private readonly rankTypes: RankType[] = [
    { type: 'combat', name: '战力榜', description: '综合战斗力排名', icon: '⚔️' },
    { type: 'collection', name: '收藏榜', description: '收集物品数量排名', icon: '📦' },
    { type: 'realm', name: '境界榜', description: '修炼境界排名', icon: '🧧' },
    { type: 'wealth', name: '财富榜', description: '灵石财富排名', icon: '💰' }
  ];
  
  constructor() {
    // 初始化各排行榜
    for (const rankType of this.rankTypes) {
      this.ranks.set(rankType.type, []);
    }
  }
  
  /**
   * 获取排行榜类型列表
   */
  getRankTypes(): RankType[] {
    return this.rankTypes;
  }
  
  /**
   * 更新玩家战力数据
   */
  updateCombatRank(playerId: string, playerName: string, level: number, realmLevel: number, combatPower: number): void {
    this.updateRank('combat', playerId, playerName, {
      level,
      realmLevel,
      combatPower,
      collectionScore: 0
    });
  }
  
  /**
   * 更新玩家收藏数据
   */
  updateCollectionRank(playerId: string, playerName: string, level: number, collectionScore: number): void {
    this.updateRank('collection', playerId, playerName, {
      level,
      realmLevel: 0,
      combatPower: 0,
      collectionScore
    });
  }
  
  /**
   * 更新玩家境界数据
   */
  updateRealmRank(playerId: string, playerName: string, realmLevel: number, level: number): void {
    this.updateRank('realm', playerId, playerName, {
      level,
      realmLevel,
      combatPower: 0,
      collectionScore: 0
    });
  }
  
  /**
   * 更新玩家财富数据
   */
  updateWealthRank(playerId: string, playerName: string, wealth: number): void {
    this.updateRank('wealth', playerId, playerName, {
      level: 0,
      realmLevel: 0,
      combatPower: 0,
      collectionScore: wealth
    });
  }
  
  /**
   * 通用更新排行榜
   */
  private updateRank(rankType: string, playerId: string, playerName: string, data: {
    level: number;
    realmLevel: number;
    combatPower: number;
    collectionScore: number;
  }): void {
    const ranks = this.ranks.get(rankType) || [];
    const existingIndex = ranks.findIndex(r => r.playerId === playerId);
    
    const entry: RankEntry = {
      playerId,
      playerName,
      level: data.level,
      realmLevel: data.realmLevel,
      combatPower: data.combatPower,
      collectionScore: data.collectionScore,
      rank: 0,
      lastUpdated: Date.now()
    };
    
    if (existingIndex >= 0) {
      // 更新已有数据
      const existing = ranks[existingIndex];
      entry.level = Math.max(existing.level, data.level);
      entry.realmLevel = Math.max(existing.realmLevel, data.realmLevel);
      entry.combatPower = Math.max(existing.combatPower, data.combatPower);
      entry.collectionScore = Math.max(existing.collectionScore, data.collectionScore);
      ranks[existingIndex] = entry;
    } else {
      ranks.push(entry);
    }
    
    // 排序
    this.sortRank(ranks, rankType);
    
    // 更新排名
    ranks.forEach((r, i) => r.rank = i + 1);
    
    this.ranks.set(rankType, ranks);
    
    // 更新玩家排行榜数据
    this.updatePlayerRankData(playerId);
  }
  
  /**
   * 根据排行榜类型排序
   */
  private sortRank(ranks: RankEntry[], rankType: string): void {
    switch (rankType) {
      case 'combat':
        ranks.sort((a, b) => b.combatPower - a.combatPower);
        break;
      case 'collection':
        ranks.sort((a, b) => b.collectionScore - a.collectionScore);
        break;
      case 'realm':
        ranks.sort((a, b) => {
          if (b.realmLevel !== a.realmLevel) return b.realmLevel - a.realmLevel;
          return b.level - a.level;
        });
        break;
      case 'wealth':
        ranks.sort((a, b) => b.collectionScore - a.collectionScore);
        break;
    }
  }
  
  /**
   * 获取排行榜
   */
  getRankings(rankType: string, limit: number = 100): RankEntry[] {
    const ranks = this.ranks.get(rankType);
    if (!ranks) return [];
    return ranks.slice(0, limit);
  }
  
  /**
   * 获取战力排行榜
   */
  getCombatRankings(limit: number = 100): RankEntry[] {
    return this.getRankings('combat', limit);
  }
  
  /**
   * 获取收藏排行榜
   */
  getCollectionRankings(limit: number = 100): RankEntry[] {
    return this.getRankings('collection', limit);
  }
  
  /**
   * 获取玩家排名
   */
  getPlayerRank(playerId: string, rankType: string): RankEntry | null {
    const ranks = this.ranks.get(rankType);
    if (!ranks) return null;
    return ranks.find(r => r.playerId === playerId) || null;
  }
  
  /**
   * 获取玩家所有排行榜数据
   */
  getPlayerAllRanks(playerId: string): PlayerRankData {
    if (!this.playerData.has(playerId)) {
      this.updatePlayerRankData(playerId);
    }
    return this.playerData.get(playerId)!;
  }
  
  /**
   * 更新玩家排行榜数据
   */
  private updatePlayerRankData(playerId: string): void {
    const ranks: PlayerRankData['ranks'] = {
      combat: 0,
      collection: 0,
      realm: 0,
      wealth: 0
    };
    
    for (const rankType of ['combat', 'collection', 'realm', 'wealth']) {
      const playerRank = this.getPlayerRank(playerId, rankType);
      if (playerRank) {
        ranks[rankType as keyof typeof ranks] = playerRank.rank;
      }
    }
    
    this.playerData.set(playerId, {
      playerId,
      ranks,
      lastUpdated: Date.now()
    });
  }
  
  /**
   * 获取玩家战力排名
   */
  getPlayerCombatRank(playerId: string): number {
    const rank = this.getPlayerRank(playerId, 'combat');
    return rank ? rank.rank : 0;
  }
  
  /**
   * 获取玩家收藏排名
   */
  getPlayerCollectionRank(playerId: string): number {
    const rank = this.getPlayerRank(playerId, 'collection');
    return rank ? rank.rank : 0;
  }
  
  /**
   * 获取榜单详细信息
   */
  getRankDetail(rankType: string): {
    type: string;
    name: string;
    totalPlayers: number;
    topPlayer: RankEntry | null;
  } | null {
    const rankConfig = this.rankTypes.find(r => r.type === rankType);
    if (!rankConfig) return null;
    
    const ranks = this.ranks.get(rankType) || [];
    
    return {
      type: rankType,
      name: rankConfig.name,
      totalPlayers: ranks.length,
      topPlayer: ranks.length > 0 ? ranks[0] : null
    };
  }
  
  /**
   * 模拟战斗排名挑战
   */
  challengeRank(challengerId: string, challengerPower: number, targetId: string): {
    success: boolean;
    newRank: number;
    message: string;
  } {
    const targetRank = this.getPlayerRank(targetId, 'combat');
    if (!targetRank) {
      return { success: false, newRank: 0, message: '目标玩家不在榜上' };
    }
    
    // 简单概率计算
    const powerDiff = challengerPower - targetRank.combatPower;
    const winProbability = 0.5 + (powerDiff / (challengerPower + targetRank.combatPower + 1)) * 0.3;
    const challengerWon = Math.random() < Math.max(0.1, Math.min(0.9, winProbability));
    
    if (challengerWon) {
      // 挑战成功，交换排名
      const ranks = this.ranks.get('combat') || [];
      const challengerIndex = ranks.findIndex(r => r.playerId === challengerId);
      const targetIndex = ranks.findIndex(r => r.playerId === targetId);
      
      if (challengerIndex >= 0 && targetIndex >= 0 && challengerIndex > targetIndex) {
        // 交换位置
        const temp = ranks[challengerIndex];
        ranks[challengerIndex] = ranks[targetIndex];
        ranks[targetIndex] = temp;
        
        // 更新排名
        ranks.forEach((r, i) => r.rank = i + 1);
        
        this.ranks.set('combat', ranks);
      }
      
      const newRank = this.getPlayerCombatRank(challengerId);
      return { success: true, newRank, message: '挑战成功！排名提升' };
    }
    
    return { success: false, newRank: this.getPlayerCombatRank(challengerId), message: '挑战失败' };
  }
}

export const rankingSystem = new RankingSystem();
export default RankingSystem;
