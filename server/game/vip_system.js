/**
 * 挂机修仙 - VIP系统v2
 * 增强版VIP系统，提供更丰富的VIP特权和福利
 */

class VipSystemV2 {
  constructor() {
    // VIP等级配置
    this.vipLevels = {
      1: {
        name: 'VIP1',
        nameCn: '筑基仙人',
        cost: 6,
        dailyBonus: 50,
        dropRate: 0.1,
        description: '初级VIP，享有基础特权',
        benefits: ['每日灵石+50', '掉落概率+10%']
      },
      2: {
        name: 'VIP2',
        nameCn: '金丹真人',
        cost: 30,
        dailyBonus: 150,
        dropRate: 0.2,
        description: '中级VIP，享有进阶特权',
        benefits: ['每日灵石+150', '掉落概率+20%', '专属称号']
      },
      3: {
        name: 'VIP3',
        nameCn: '元婴老怪',
        cost: 98,
        dailyBonus: 300,
        dropRate: 0.3,
        description: '高级VIP，享有高级特权',
        benefits: ['每日灵石+300', '掉落概率+30%', '专属称号', '经验加成+10%']
      },
      4: {
        name: 'VIP4',
        nameCn: '化神大能',
        cost: 298,
        dailyBonus: 500,
        dropRate: 0.4,
        description: '尊享VIP，享有尊享特权',
        benefits: ['每日灵石+500', '掉落概率+40%', '专属称号', '经验加成+20%', '副本掉落+1']
      },
      5: {
        name: 'VIP5',
        nameCn: '炼虚尊者',
        cost: 648,
        dailyBonus: 1000,
        dropRate: 0.5,
        description: '豪华VIP，享有豪华特权',
        benefits: ['每日灵石+1000', '掉落概率+50%', '专属称号', '经验加成+30%', '副本掉落+2', '可直接跳过战斗']
      },
      6: {
        name: 'VIP6',
        nameCn: '合体期大能',
        cost: 1298,
        dailyBonus: 2000,
        dropRate: 0.6,
        description: '至尊VIP，享有至尊特权',
        benefits: ['每日灵石+2000', '掉落概率+60%', '专属称号', '经验加成+40%', '副本掉落+3', '可直接跳过战斗', '每日抽奖次数+1']
      },
      7: {
        name: 'VIP7',
        nameCn: '大乘期仙尊',
        cost: 2598,
        dailyBonus: 5000,
        dropRate: 0.7,
        description: '仙尊VIP，享有仙尊特权',
        benefits: ['每日灵石+5000', '掉落概率+70%', '专属称号', '经验加成+50%', '副本掉落+5', '可直接跳过战斗', '每日抽奖次数+2', '专属仙宠']
      },
      8: {
        name: 'VIP8',
        nameCn: '渡劫期神君',
        cost: 5998,
        dailyBonus: 10000,
        dropRate: 0.8,
        description: '神君VIP，享有神君特权',
        benefits: ['每日灵石+10000', '掉落概率+80%', '专属称号', '经验加成+100%', '副本掉落+10', '可直接跳过战斗', '每日抽奖次数+3', '专属仙宠', '全服称号']
      }
    };

    // VIP等级升级所需积分映射
    this.pointsToLevel = this._buildPointsMap();
    
    // VIP礼包配置
    this.vipGifts = {
      1: { lingshi: 500, items: [] },
      2: { lingshi: 1500, items: [{ id: 'spirit_stone', count: 10 }] },
      3: { lingshi: 3000, items: [{ id: 'spirit_stone', count: 30 }, { id: 'realm_pill', count: 5 }] },
      4: { lingshi: 5000, items: [{ id: 'spirit_stone', count: 50 }, { id: 'realm_pill', count: 10 }, { id: 'artifact_fragment', count: 20 }] },
      5: { lingshi: 10000, items: [{ id: 'spirit_stone', count: 100 }, { id: 'realm_pill', count: 20 }, { id: 'artifact_fragment', count: 50 }] },
      6: { lingshi: 20000, items: [{ id: 'spirit_stone', count: 200 }, { id: 'realm_pill', count: 50 }, { id: 'artifact_fragment', count: 100 }, { id: 'secret_weapon', count: 1 }] },
      7: { lingshi: 50000, items: [{ id: 'spirit_stone', count: 500 }, { id: 'realm_pill', count: 100 }, { id: 'artifact_fragment', count: 200 }, { id: 'secret_weapon', count: 3 }, { id: 'mount', count: 1 }] },
      8: { lingshi: 100000, items: [{ id: 'spirit_stone', count: 1000 }, { id: 'realm_pill', count: 200 }, { id: 'artifact_fragment', count: 500 }, { id: 'secret_weapon', count: 5 }, { id: 'mount', count: 1 }, { id: 'wing', count: 1 }] }
    };
  }

  /**
   * 构建积分到等级的映射
   * @private
   */
  _buildPointsMap() {
    const map = {};
    for (const [level, data] of Object.entries(this.vipLevels)) {
      map[data.cost] = parseInt(level);
    }
    return map;
  }

  /**
   * 获取VIP信息
   * @param {Object} player - 玩家对象
   * @returns {Object} VIP信息
   */
  getVipInfo(player) {
    const vipLevel = player.vipLevel || 0;
    const currentVipData = this.vipLevels[vipLevel];
    const nextVipData = this.vipLevels[vipLevel + 1];

    const info = {
      level: vipLevel,
      name: currentVipData ? currentVipData.name : '普通玩家',
      nameCn: currentVipData ? currentVipData.nameCn : '凡人',
      dailyBonus: currentVipData ? currentVipData.dailyBonus : 0,
      dropRate: currentVipData ? currentVipData.dropRate : 0,
      description: currentVipData ? currentVipData.description : '努力成为VIP吧',
      benefits: currentVipData ? currentVipData.benefits : [],
      isVip: vipLevel > 0
    };

    // 计算下一级信息
    if (nextVipData) {
      info.nextLevel = vipLevel + 1;
      info.nextName = nextVipData.name;
      info.nextNameCn = nextVipData.nameCn;
      info.pointsToNext = nextVipData.cost - (player.vipPoints || 0);
      info.nextDailyBonus = nextVipData.dailyBonus;
    }

    return info;
  }

  /**
   * 获取所有VIP等级信息
   * @returns {Array} VIP等级列表
   */
  getAllVipLevels() {
    return Object.entries(this.vipLevels).map(([level, data]) => ({
      level: parseInt(level),
      ...data
    }));
  }

  /**
   * 充值
   * @param {Object} player - 玩家对象
   * @param {number} amount - 充值金额(元)
   * @returns {Object} 充值结果
   */
  recharge(player, amount) {
    // 1元 = 10灵石 + 1积分
    const points = amount * 1;
    player.vipPoints = (player.vipPoints || 0) + points;
    
    // 升级VIP
    let newLevel = 0;
    for (const [level, data] of Object.entries(this.vipLevels)) {
      if (player.vipPoints >= data.cost) {
        newLevel = parseInt(level);
      }
    }

    const oldLevel = player.vipLevel || 0;
    if (newLevel > oldLevel) {
      player.vipLevel = newLevel;
      
      // 发放升级礼包
      const gifts = [];
      for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
        const gift = this.vipGifts[lvl];
        if (gift) {
          player.lingshi = (player.lingshi || 0) + gift.lingshi;
          // 发放物品需要结合物品系统
          if (gift.items && gift.items.length > 0) {
            gifts.push({ level: lvl, ...gift });
          }
        }
      }
      
      return {
        level: player.vipLevel,
        points: player.vipPoints,
        upgraded: true,
        gifts
      };
    }
    
    return { level: player.vipLevel, points: player.vipPoints, upgraded: false };
  }

  /**
   * 领取每日VIP奖励
   * @param {Object} player - 玩家对象
   * @returns {Object} 领取结果
   */
  claimDailyBonus(player) {
    const vipLevel = player.vipLevel || 0;
    if (vipLevel === 0) {
      return { success: false, message: '您还不是VIP，无法领取每日奖励' };
    }

    const vipData = this.vipLevels[vipLevel];
    if (!vipData) {
      return { success: false, message: 'VIP等级数据异常' };
    }

    // 检查是否已领取
    const today = new Date().toDateString();
    const lastClaimDate = player.vipLastClaimDate;
    
    if (lastClaimDate === today) {
      return { success: false, message: '今日已领取VIP奖励，请明天再来' };
    }

    // 发放奖励
    player.lingshi = (player.lingshi || 0) + vipData.dailyBonus;
    player.vipLastClaimDate = today;
    
    return {
      success: true,
      message: `恭喜获得VIP${vipLevel}每日奖励：${vipData.dailyBonus}灵石`,
      amount: vipData.dailyBonus
    };
  }

  /**
   * 获取VIP掉落加成
   * @param {Object} player - 玩家对象
   * @returns {number} 掉落加成倍率
   */
  getDropRateBonus(player) {
    const vipLevel = player.vipLevel || 0;
    const vipData = this.vipLevels[vipLevel];
    return vipData ? vipData.dropRate : 0;
  }

  /**
   * 获取VIP经验加成
   * @param {Object} player - 玩家对象
   * @returns {number} 经验加成倍率
   */
  getExpBonus(player) {
    const vipLevel = player.vipLevel || 0;
    const expBonusMap = { 0: 0, 1: 0, 2: 0, 3: 0.1, 4: 0.2, 5: 0.3, 6: 0.4, 7: 0.5, 8: 1.0 };
    return expBonusMap[vipLevel] || 0;
  }

  /**
   * 获取VIP副本额外掉落
   * @param {Object} player - 玩家对象
   * @returns {number} 额外掉落数量
   */
  getExtraDrops(player) {
    const vipLevel = player.vipLevel || 0;
    const extraDropsMap = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 1, 5: 2, 6: 3, 7: 5, 8: 10 };
    return extraDropsMap[vipLevel] || 0;
  }

  /**
   * 检查是否可以跳过战斗
   * @param {Object} player - 玩家对象
   * @returns {boolean} 是否可以跳过
   */
  canSkipBattle(player) {
    return (player.vipLevel || 0) >= 5;
  }

  /**
   * 获取VIP每日抽奖次数加成
   * @param {Object} player - 玩家对象
   * @returns {number} 额外抽奖次数
   */
  getExtraGachaCount(player) {
    const vipLevel = player.vipLevel || 0;
    const gachaMap = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 1, 6: 1, 7: 2, 8: 3 };
    return gachaMap[vipLevel] || 0;
  }

  /**
   * 获取VIP称号
   * @param {Object} player - 玩家对象
   * @returns {string} VIP称号
   */
  getVipTitle(player) {
    const vipLevel = player.vipLevel || 0;
    if (vipLevel === 0) return '';
    const vipData = this.vipLevels[vipLevel];
    return vipData ? `${vipData.nameCn}` : '';
  }

  /**
   * 获取VIP礼包
   * @param {number} level - VIP等级
   * @returns {Object|null} 礼包内容
   */
  getVipGift(level) {
    return this.vipGifts[level] || null;
  }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VipSystemV2 };
}
