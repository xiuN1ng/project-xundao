/**
 * 统一API调用层
 * 用于与后端服务器通信
 */

// 开发环境配置
const API_BASE = 'http://localhost:3001'; // 后端服务器地址

/**
 * 通用API请求函数 - 增强版
 * @param {string} endpoint - API端点
 * @param {string} method - HTTP方法
 * @param {object} data - 请求数据
 * @param {object} options - 额外选项
 * @returns {Promise<object>} 响应数据
 */
async function apiRequest(endpoint, method = 'GET', data = null, options = {}) {
  const { timeout = 10000, retry = 2, showError = true } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  const attemptRequest = async (attempt) => {
    try {
      const fetchOptions = {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      };
      
      if (data && method !== 'GET') {
        fetchOptions.body = JSON.stringify(data);
      }
      
      const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);
      clearTimeout(timeoutId);
      
      const result = await response.json();
      
      // 显示错误提示
      if (!result.success && showError && result.message) {
        showToast(result.message, 'error');
      }
      
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // 重试逻辑
      if (attempt < retry && error.name !== 'AbortError') {
        console.log(`API请求 [${endpoint}] 失败，${attempt + 1}/${retry + 1} 次重试...`);
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        return attemptRequest(attempt + 1);
      }
      
      console.error(`API请求失败 [${endpoint}]:`, error);
      
      const errorMessage = error.name === 'AbortError' 
        ? '请求超时，请稍后重试' 
        : (error.message || '网络请求失败，请检查网络连接');
      
      if (showError) {
        showToast(errorMessage, 'error');
      }
      
      return { success: false, message: errorMessage };
    }
  };
  
  return attemptRequest(0);
}

// ============ 商店系统 API ============
const shopAPI = {
  // 获取商店物品列表
  async getItems() {
    return apiRequest('/api/shop/items', 'GET');
  },
  
  // 购买物品
  async buy(itemId, quantity = 1) {
    return apiRequest('/api/shop/buy', 'POST', { itemId, quantity });
  },
  
  // 购买丹药
  async buyPill(pillId, quantity = 1) {
    return apiRequest('/api/shop/buy-pill', 'POST', { pillId, quantity });
  },
  
  // 获取购买历史
  async getHistory() {
    return apiRequest('/api/shop/history', 'GET');
  }
};

// ============ 市场系统 API ============
const marketAPI = {
  // 获取市场列表
  async getListings(category = null) {
    const query = category ? `?category=${category}` : '';
    return apiRequest(`/api/market/listings${query}`, 'GET');
  },
  
  // 上架物品
  async listItem(itemId, price, category) {
    return apiRequest('/api/market/list', 'POST', { itemId, price, category });
  },
  
  // 购买物品
  async buy(listingId) {
    return apiRequest('/api/market/buy', 'POST', { listingId });
  },
  
  // 下架物品
  async delist(listingId) {
    return apiRequest('/api/market/del', 'POST', { listingId });
  },
  
  // 获取我的上架列表
  async getMyListings() {
    return apiRequest('/api/market/my-listings', 'GET');
  },
  
  // 搜索市场
  async search(keyword, category = null, maxPrice = null) {
    return apiRequest('/api/market/search', 'POST', { keyword, category, maxPrice });
  }
};

// ============ 宗门系统 API ============
const sectAPI = {
  // 获取宗门信息
  async getInfo() {
    return apiRequest('/api/sects/info', 'GET');
  },
  
  // 创建宗门
  async create(sectType) {
    return apiRequest('/api/sects/create', 'POST', { sectType });
  },
  
  // 升级宗门
  async upgrade() {
    return apiRequest('/api/sects/upgrade', 'POST');
  },
  
  // 升级建筑
  async upgradeBuilding(buildingId) {
    return apiRequest('/api/sects/upgrade-building', 'POST', { buildingId });
  },
  
  // 招收弟子
  async recruitDisciple(classType) {
    return apiRequest('/api/sects/recruit', 'POST', { classType });
  },
  
  // 训练弟子
  async trainDisciple(discipleIndex) {
    return apiRequest('/api/sects/train', 'POST', { discipleIndex });
  },
  
  // 学习宗门技能
  async learnTech(techId) {
    return apiRequest('/api/sects/learn-tech', 'POST', { techId });
  },
  
  // 捐献
  async donate(amount) {
    return apiRequest('/api/sects/donate', 'POST', { amount });
  },
  
  // 离开宗门
  async leave() {
    return apiRequest('/api/sects/leave', 'POST');
  },
  
  // 获取宗门成员列表
  async getMembers() {
    return apiRequest('/api/sects/members', 'GET');
  },
  
  // 获取宗门建筑列表
  async getBuildings() {
    return apiRequest('/api/sects/buildings', 'GET');
  }
};

// ============ 师徒系统 API ============
const masterAPI = {
  // 获取师徒信息
  async getInfo() {
    return apiRequest('/api/master/info', 'GET');
  },
  
  // 拜师
  async becomeApprentice(masterId) {
    return apiRequest('/api/master/become-apprentice', 'POST', { masterId });
  },
  
  // 收徒
  async acceptApprentice(apprenticeId) {
    return apiRequest('/api/master/accept-apprentice', 'POST', { apprenticeId });
  },
  
  // 逐出徒弟
  async expelApprentice(apprenticeId) {
    return apiRequest('/api/master/expel', 'POST', { apprenticeId });
  },
  
  // 离开师门
  async leave() {
    return apiRequest('/api/master/leave', 'POST');
  },
  
  // 传授功法
  async teachTechnique(apprenticeId) {
    return apiRequest('/api/master/teach', 'POST', { apprenticeId });
  },
  
  // 请教功法
  async learnFromMaster() {
    return apiRequest('/api/master/learn', 'POST');
  },
  
  // 传承
  async inherit(type) {
    return apiRequest('/api/master/inherit', 'POST', { type });
  },
  
  // 获取可拜师的师父列表
  async getAvailableMasters() {
    return apiRequest('/api/master/available-masters', 'GET');
  },
  
  // 获取我的徒弟列表
  async getApprentices() {
    return apiRequest('/api/master/apprentices', 'GET');
  }
};

// ============ 法宝系统 API ============
const artifactAPI = {
  // 获取法宝列表
  async getList() {
    return apiRequest('/api/artifacts/list', 'GET');
  },
  
  // 获取法宝详情
  async getDetail(artifactId) {
    return apiRequest(`/api/artifacts/${artifactId}`, 'GET');
  },
  
  // 装备法宝
  async equip(artifactId) {
    return apiRequest('/api/artifacts/equip', 'POST', { artifactId });
  },
  
  // 卸下法宝
  async unequip(artifactId) {
    return apiRequest('/api/artifacts/unequip', 'POST', { artifactId });
  },
  
  // 升级法宝
  async upgrade(artifactId) {
    return apiRequest('/api/artifacts/upgrade', 'POST', { artifactId });
  },
  
  // 炼化法宝
  async refine(artifactId) {
    return apiRequest('/api/artifacts/refine', 'POST', { artifactId });
  },
  
  // 获取天材地宝
  async getMaterials() {
    return apiRequest('/api/artifacts/materials', 'GET');
  },
  
  // 使用天材地宝
  async useTreasure(treasureId) {
    return apiRequest('/api/artifacts/use-treasure', 'POST', { treasureId });
  },
  
  // 回收法宝
  async recycle(artifactId) {
    return apiRequest('/api/artifacts/recycle', 'POST', { artifactId });
  },
  
  // 炼器
  async forge(recipeId) {
    return apiRequest('/api/artifacts/forge', 'POST', { recipeId });
  }
};

// ============ 灵兽系统 API ============
const beastAPI = {
  // 获取灵兽列表
  async getList() {
    return apiRequest('/api/beasts/list', 'GET');
  },
  
  // 捕捉灵兽
  async capture(beastId) {
    return apiRequest('/api/beasts/capture', 'POST', { beastId });
  },
  
  // 灵兽升级
  async levelUp(beastIndex) {
    return apiRequest('/api/beasts/levelup', 'POST', { beastIndex });
  },
  
  // 灵兽战斗
  async attack(beastIndex) {
    return apiRequest('/api/beasts/attack', 'POST', { beastIndex });
  },
  
  // 放生灵兽
  async release(beastIndex) {
    return apiRequest('/api/beasts/release', 'POST', { beastIndex });
  },
  
  // 喂养灵兽
  async feed(beastIndex, foodId) {
    return apiRequest('/api/beasts/feed', 'POST', { beastIndex, foodId });
  },
  
  // 获取灵兽属性
  async getStats(beastIndex) {
    return apiRequest(`/api/beasts/stats/${beastIndex}`, 'GET');
  }
};

// ============ 任务系统 API ============
const taskAPI = {
  // 获取任务列表
  async getList() {
    return apiRequest('/api/tasks/list', 'GET');
  },
  
  // 接受任务
  async accept(taskId) {
    return apiRequest('/api/tasks/accept', 'POST', { taskId });
  },
  
  // 完成任务
  async complete(taskId) {
    return apiRequest('/api/tasks/complete', 'POST', { taskId });
  },
  
  // 领取奖励
  async claimReward(taskId) {
    return apiRequest('/api/tasks/claim', 'POST', { taskId });
  },
  
  // 刷新日常任务
  async refreshDaily() {
    return apiRequest('/api/tasks/refresh-daily', 'POST');
  },
  
  // 获取任务进度
  async getProgress(taskId) {
    return apiRequest(`/api/tasks/progress/${taskId}`, 'GET');
  }
};

// ============ 成就系统 API ============
const achievementAPI = {
  // 获取成就列表
  async getList() {
    return apiRequest('/api/achievements/list', 'GET');
  },
  
  // 领取成就奖励
  async claim(achievementId) {
    return apiRequest('/api/achievements/claim', 'POST', { achievementId });
  },
  
  // 获取成就进度
  async getProgress(achievementId) {
    return apiRequest(`/api/achievements/progress/${achievementId}`, 'GET');
  },
  
  // 获取成就统计
  async getStats() {
    return apiRequest('/api/achievements/stats', 'GET');
  }
};

// ============ 福利系统 API ============
const welfareAPI = {
  // 获取签到配置
  async getConfig() {
    return apiRequest('/api/welfare/config', 'GET');
  },
  
  // 获取签到状态
  async getSignInStatus(playerId) {
    const query = playerId ? `?player_id=${playerId}` : '';
    return apiRequest(`/api/welfare/sign-in${query}`, 'GET');
  },
  
  // 领取签到奖励（签到）
  async claimSignIn(playerId) {
    return apiRequest('/api/welfare/claim-sign-in', 'POST', { player_id: playerId });
  },
  
  // 获取签到状态 (兼容旧版)
  async getSigninStatus() {
    return apiRequest('/api/welfare/signin-status', 'GET');
  },
  
  // 签到 (兼容旧版)
  async signin() {
    return apiRequest('/api/welfare/signin', 'POST');
  },
  
  // 获取次日登录奖励
  async getSecondDayReward() {
    return apiRequest('/api/welfare/second-day-reward', 'GET');
  },
  
  // 获取三日登录奖励
  async getThirdDayReward() {
    return apiRequest('/api/welfare/third-day-reward', 'GET');
  },
  
  // 领取次日登录奖励
  async claimSecondDayReward() {
    return apiRequest('/api/welfare/second-day-reward', 'POST');
  },
  
  // 领取三日登录奖励
  async claimThirdDayReward() {
    return apiRequest('/api/welfare/third-day-reward', 'POST');
  }
};

// ============ 首充系统 API ============
const firstRechargeAPI = {
  // 获取首充配置
  async getConfig() {
    return apiRequest('/api/first-recharge/config', 'GET');
  },
  
  // 领取首充奖励
  async claim() {
    return apiRequest('/api/first-recharge/claim', 'POST');
  },
  
  // 领取首充奖励 (兼容旧版)
  async claimV2() {
    return apiRequest('/api/first-recharge/claim-v2', 'POST');
  }
};

// ============ 新手任务系统 API ============
const newbieAPI = {
  // 获取新手任务列表
  async getTasks() {
    return apiRequest('/api/newbie/tasks', 'GET');
  },
  
  // 领取任务奖励
  async claim(taskId) {
    return apiRequest('/api/newbie/claim', 'POST', { taskId });
  }
};

// ============ 离线收益系统 API ============
const offlineAPI = {
  // 获取离线收益信息
  async getInfo(playerId) {
    return apiRequest(`/api/offline/info?player_id=${playerId}`, 'GET');
  },
  
  // 开始记录离线时间
  async start(playerId) {
    return apiRequest('/api/offline/start', 'POST', { player_id: playerId });
  },
  
  // 领取离线收益
  async claim(playerId) {
    return apiRequest('/api/offline/claim', 'POST', { player_id: playerId });
  }
};

// ============ 排行榜系统 API ============
const rankingAPI = {
  // 获取等级榜
  async getLevelRanking() {
    return apiRequest('/api/ranking/level', 'GET');
  },
  
  // 获取战力榜
  async getPowerRanking() {
    return apiRequest('/api/ranking/power', 'GET');
  },
  
  // 获取灵石榜
  async getWealthRanking() {
    return apiRequest('/api/ranking/wealth', 'GET');
  },
  
  // 获取PVP/竞技场榜
  async getCombatRanking() {
    return apiRequest('/api/ranking/combat', 'GET');
  },
  
  // 获取通用排行榜
  async getRanking(type) {
    return apiRequest(`/api/ranking/${type}`, 'GET');
  }
};

// ============ 好友系统 API ============
const friendAPI = {
  // 获取好友列表
  async getList(playerId) {
    return apiRequest(`/api/friends/list?player_id=${playerId}`, 'GET');
  },
  
  // 获取好友申请列表
  async getRequests(playerId) {
    return apiRequest(`/api/friends/requests?player_id=${playerId}`, 'GET');
  },
  
  // 添加好友
  async add(playerId, targetName) {
    return apiRequest('/api/friends/add', 'POST', { player_id: playerId, target_name: targetName });
  },
  
  // 接受好友申请
  async accept(playerId, requestId) {
    return apiRequest('/api/friends/accept', 'POST', { player_id: playerId, request_id: requestId });
  },
  
  // 拒绝好友申请
  async reject(playerId, requestId) {
    return apiRequest('/api/friends/reject', 'POST', { player_id: playerId, request_id: requestId });
  },
  
  // 删除好友
  async remove(playerId, friendId) {
    return apiRequest('/api/friends/remove', 'POST', { player_id: playerId, friend_id: friendId });
  },
  
  // 拉黑好友
  async block(playerId, friendId) {
    return apiRequest('/api/friends/block', 'POST', { player_id: playerId, friend_id: friendId });
  },
  
  // 移出黑名单
  async unblock(playerId, blockedId) {
    return apiRequest('/api/friends/unblock', 'POST', { player_id: playerId, blocked_id: blockedId });
  },
  
  // 搜索玩家
  async search(keyword, playerId) {
    return apiRequest(`/api/friends/search?keyword=${encodeURIComponent(keyword)}&player_id=${playerId}`, 'GET');
  },
  
  // 推荐好友
  async recommend(playerId) {
    return apiRequest(`/api/friends/recommend?player_id=${playerId}`, 'GET');
  }
};

// ============ 炼丹系统 API ============
const alchemyAPI = {
  // 获取炼丹信息
  async getInfo() {
    return apiRequest('/api/alchemy/info', 'GET');
  },
  // 炼制丹药
  async refine(recipeId) {
    return apiRequest('/api/alchemy/refine', 'POST', { recipe_id: recipeId });
  },
  // 学习丹方
  async learnRecipe(recipeId) {
    return apiRequest('/api/alchemy/learn', 'POST', { recipe_id: recipeId });
  },
  // 升级炼丹炉
  async upgradeFurnace() {
    return apiRequest('/api/alchemy/upgrade', 'POST');
  },
  // 获取丹方列表
  async getRecipes() {
    return apiRequest('/api/alchemy/recipes', 'GET');
  }
};

// ============ 装备系统 API ============
const equipmentAPI = {
  // 获取用户装备列表
  async getEquipmentList(userId) {
    return apiRequest(`/api/equipment/${userId}`, 'GET');
  },
  // 获取装备详情
  async getEquipmentDetail(equipId) {
    return apiRequest(`/api/equipment/detail/${equipId}`, 'GET');
  },
  // 强化装备
  async refineEquipment(userId, equipId) {
    return apiRequest('/api/equipment/refine', 'POST', { userId, equipId });
  },
  // 增幅装备
  async augmentEquipment(userId, equipId) {
    return apiRequest('/api/equipment/augment', 'POST', { userId, equipId });
  },
  // 打孔
  async addSocket(userId, equipId) {
    return apiRequest('/api/equipment/socket/add', 'POST', { userId, equipId });
  },
  // 镶嵌宝石
  async inlayGem(userId, equipId, socketIndex, gemType) {
    return apiRequest('/api/equipment/socket/inlay', 'POST', { userId, equipId, socketIndex, gemType });
  },
  // 取下宝石
  async removeGem(userId, equipId, socketIndex) {
    return apiRequest('/api/equipment/socket/remove', 'POST', { userId, equipId, socketIndex });
  },
  // 继承
  async inheritEquipment(userId, sourceId, targetId) {
    return apiRequest('/api/equipment/inherit', 'POST', { userId, sourceEquipId: sourceId, targetEquipId: targetId });
  },
  // 获取玩家资源
  async getPlayerResources(userId) {
    return apiRequest(`/api/equipment/player/${userId}`, 'GET');
  },
  // 获取增幅历史
  async getAugmentHistory(equipId) {
    return apiRequest(`/api/equipment/augment/history/${equipId}`, 'GET');
  },
  // 获取宝石类型列表
  async getGemTypes() {
    return apiRequest('/api/equipment/gems', 'GET');
  },
};

// 导出所有API模块到全局
window.shopAPI = shopAPI;
window.marketAPI = marketAPI;
window.sectAPI = sectAPI;
window.masterAPI = masterAPI;
window.artifactAPI = artifactAPI;
window.beastAPI = beastAPI;
window.taskAPI = taskAPI;
window.achievementAPI = achievementAPI;
window.welfareAPI = welfareAPI;
window.firstRechargeAPI = firstRechargeAPI;
window.newbieAPI = newbieAPI;
window.rankingAPI = rankingAPI;
window.offlineAPI = offlineAPI;
window.friendAPI = friendAPI;
window.alchemyAPI = alchemyAPI;
window.equipmentAPI = equipmentAPI;
window.apiRequest = apiRequest;

console.log('📡 API调用层已加载');
