/**
 * 委托任务系统 - 任务委托
 * 玩家发布和接受委托任务
 */

const委托任务系统 = {
  // 委托任务配置
  config: {
    maxActiveQuests: 5,      // 最大活跃委托数
    publishCost: 100,        // 发布委托消耗金币
    acceptReward: 50,        // 接受委托基础奖励
    completeReward: 200,     // 完成任务奖励
    expireTime: 86400000,   // 委托有效期24小时
  },

  // 委托类型
  委托类型: {
    采集: { target: '采集资源', difficulty: 1 },
    战斗: { target: '击败怪物', difficulty: 2 },
    护送: { target: '护送目标', difficulty: 2 },
    调查: { target: '探索地点', difficulty: 1 },
    建造: { target: '建造建筑', difficulty: 3 },
  },

  // 发布委托
  async publishQuest(player, questType, description, requirements, reward) {
    // 检查金币
    if (player.gold < this.config.publishCost) {
      return { success: false, message: `发布委托需要${this.config.publishCost}金币` };
    }

    // 检查委托类型
    if (!this.委托类型[questType]) {
      return { success: false, message: '无效的委托类型' };
    }

    // 检查活跃委托数
    const activeQuests = player.publishedQuests?.filter(q => q.status === 'pending').length || 0;
    if (activeQuests >= this.config.maxActiveQuests) {
      return { success: false, message: `最多同时发布${this.config.maxActiveQuests}个委托` };
    }

    // 扣除金币
    player.gold -= this.config.publishCost;

    // 创建委托
    const quest = {
      id: `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      publisherId: player.id,
      publisherName: player.name,
      type: questType,
      description,
      requirements: {
        ...this.委托类型[questType],
        ...requirements
      },
      reward: reward || this.config.completeReward,
      status: 'pending',
      createdAt: Date.now(),
      expireAt: Date.now() + this.config.expireTime,
      acceptedBy: null,
      progress: 0,
      completedAt: null,
    };

    // 保存委托
    player.publishedQuests = player.publishedQuests || [];
    player.publishedQuests.push(quest);

    // 全局委托列表
    global.pendingQuests = global.pendingQuests || [];
    global.pendingQuests.push(quest);

    return {
      success: true,
      message: '委托发布成功',
      quest: this.formatQuest(quest)
    };
  },

  // 接受委托
  async acceptQuest(player, questId) {
    const quest = global.pendingQuests?.find(q => q.id === questId);
    if (!quest) {
      return { success: false, message: '委托不存在或已被接受' };
    }

    if (quest.status !== 'pending') {
      return { success: false, message: '委托状态异常' };
    }

    if (quest.publisherId === player.id) {
      return { success: false, message: '不能接受自己的委托' };
    }

    // 检查等级要求
    if (player.level < (quest.requirements.minLevel || 1)) {
      return { success: false, message: `等级不足，需要${quest.requirements.minLevel}级` };
    }

    // 接受委托
    quest.status = 'accepted';
    quest.acceptedBy = player.id;
    quest.acceptedAt = Date.now();

    // 记录到玩家任务
    player.acceptedQuests = player.acceptedQuests || [];
    player.acceptedQuests.push({ ...quest });

    return {
      success: true,
      message: `接受了委托：${quest.description}`,
      quest: this.formatQuest(quest)
    };
  },

  // 更新委托进度
  async updateProgress(player, questId, progress) {
    const quest = player.acceptedQuests?.find(q => q.id === questId);
    if (!quest) {
      return { success: false, message: '未接受该委托' };
    }

    if (quest.status !== 'accepted') {
      return { success: false, message: '委托状态异常' };
    }

    quest.progress = Math.min(100, progress);

    return {
      success: true,
      message: `委托进度：${quest.progress}%`,
      progress: quest.progress
    };
  },

  // 完成任务
  async completeQuest(player, questId) {
    const questIndex = player.acceptedQuests?.findIndex(q => q.id === questId);
    if (questIndex === -1 || questIndex === undefined) {
      return { success: false, message: '未接受该委托' };
    }

    const quest = player.acceptedQuests[questIndex];
    if (quest.status !== 'accepted') {
      return { success: false, message: '委托状态异常' };
    }

    if (quest.progress < 100) {
      return { success: false, message: '委托进度不足' };
    }

    // 完成任务
    quest.status = 'completed';
    quest.completedAt = Date.now();

    // 发放奖励
    player.gold += quest.reward;
    player.exp += quest.reward * 0.5;

    // 从全局列表移除
    if (global.pendingQuests) {
      global.pendingQuests = global.pendingQuests.filter(q => q.id !== questId);
    }

    return {
      success: true,
      message: `委托完成！获得${quest.reward}金币`,
      reward: {
        gold: quest.reward,
        exp: Math.floor(quest.reward * 0.5)
      }
    };
  },

  // 取消委托（发布者）
  async cancelQuest(player, questId) {
    const quest = player.publishedQuests?.find(q => q.id === questId);
    if (!quest) {
      return { success: false, message: '委托不存在' };
    }

    if (quest.status !== 'pending') {
      return { success: false, message: '只能取消待接受的委托' };
    }

    quest.status = 'cancelled';
    quest.cancelledAt = Date.now();

    // 从全局列表移除
    if (global.pendingQuests) {
      global.pendingQuests = global.pendingQuests.filter(q => q.id !== questId);
    }

    return { success: true, message: '委托已取消' };
  },

  // 格式化委托信息
  formatQuest(quest) {
    return {
      id: quest.id,
      type: quest.type,
      description: quest.description,
      requirements: quest.requirements,
      reward: quest.reward,
      status: quest.status,
      progress: quest.progress || 0,
      createdAt: quest.createdAt,
      expireAt: quest.expireAt,
    };
  },

  // 获取可接受委托列表
  getAvailableQuests(player) {
    if (!global.pendingQuests) return [];
    
    return global.pendingQuests
      .filter(q => q.status === 'pending' && q.publisherId !== player.id)
      .filter(q => !q.expireAt || q.expireAt > Date.now())
      .map(q => this.formatQuest(q));
  },

  // 获取玩家发布的委托
  getPublishedQuests(player) {
    return (player.publishedQuests || []).map(q => this.formatQuest(q));
  },

  // 获取玩家接受的委托
  getAcceptedQuests(player) {
    return (player.acceptedQuests || []).map(q => this.formatQuest(q));
  }
};

module.exports = 委托任务系统;
