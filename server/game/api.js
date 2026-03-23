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
  },
  
  // ============ 灵兽战斗联动 API ============
  
  // 灵兽参战/取消参战
  async deploy(petId, action = 'deploy') {
    return apiRequest(`/api/pets/${petId}/deploy`, 'POST', { action });
  },
  
  // 获取参战的灵兽列表
  async getDeployedPets() {
    return apiRequest('/api/pets/deployed', 'GET');
  },
  
  // 获取灵兽战斗属性加成
  async getBattleStats() {
    return apiRequest('/api/pets/battle-stats', 'GET');
  },
  
  // 灵兽参战攻击（战斗中使用）
  async petAttack(monsterId, monsterHp) {
    return apiRequest(`/api/battle/pet-attack`, 'POST', { monster_id: monsterId, monster_hp: monsterHp });
  },
  
  // 恢复灵兽HP
  async healPet(petId, healType = 'quick') {
    return apiRequest(`/api/pets/${petId}/heal`, 'POST', { heal_type: healType });
  }
};

// ============ 灵兽装备系统 API ============
const beastEquipmentAPI = {
  // 获取灵兽装备列表
  async getList(params = {}) {
    return apiRequest('/api/beast/equipment/list', 'GET', null, params);
  },
  
  // 穿戴装备
  async equip(beastIndex, equipmentId) {
    return apiRequest('/api/beast/equipment/equip', 'POST', { 
      beast_index: beastIndex, 
      equipment_id: equipmentId 
    });
  },
  
  // 卸下装备
  async unequip(beastIndex, slot) {
    return apiRequest('/api/beast/equipment/unequip', 'POST', { 
      beast_index: beastIndex, 
      slot 
    });
  },
  
  // 获取灵兽装备信息
  async getInfo(beastIndex) {
    return apiRequest('/api/beast/equipment/info', 'GET', null, { beast_index: beastIndex });
  },
  
  // 强化装备
  async enhance(equipmentId) {
    return apiRequest('/api/beast/equipment/enhance', 'POST', { equipment_id: equipmentId });
  },
  
  // 合成装备
  async synthesize(targetEquipmentId) {
    return apiRequest('/api/beast/equipment/synthesize', 'POST', { target_equipment_id: targetEquipmentId });
  },
  
  // 获取合成配方列表
  async getSynthesisRecipes() {
    return apiRequest('/api/beast/equipment/synthesis/recipes', 'GET');
  },
  
  // 添加装备（GM/奖励用）
  async add(equipmentId, count = 1) {
    return apiRequest('/api/beast/equipment/add', 'POST', { 
      equipment_id: equipmentId, 
      count 
    });
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

// ============ 新手引导系统 API ============
const tutorialAPI = {
  // 获取playerId
  _getPlayerId() {
    const savedData = localStorage.getItem('xundao_player');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        return data.playerId;
      } catch (e) {}
    }
    return null;
  },
  
  // 获取新手引导状态
  async getStatus() {
    const playerId = this._getPlayerId();
    if (!playerId) return { success: false, error: '未创建角色' };
    return apiRequest(`/api/tutorial/status?player_id=${playerId}`, 'GET');
  },
  
  // 完成引导步骤
  async complete(stepId) {
    const playerId = this._getPlayerId();
    if (!playerId) return { success: false, error: '未创建角色' };
    return apiRequest('/api/tutorial/complete', 'POST', { player_id: playerId, step_id: stepId });
  },
  
  // 领取引导奖励
  async claimReward(stepId) {
    const playerId = this._getPlayerId();
    if (!playerId) return { success: false, error: '未创建角色' };
    return apiRequest('/api/tutorial/claim', 'POST', { player_id: playerId, step_id: stepId });
  }
};

// ============ 灵石消耗系统 API ============
const expenseAPI = {
  // 获取灵石消耗配置
  async getConfig() {
    return apiRequest('/api/expense/config', 'GET');
  },
  
  // 神秘商店刷新
  async refreshShop() {
    const savedData = localStorage.getItem('xundao_player');
    if (!savedData) return { success: false, error: '未创建角色' };
    const { playerId } = JSON.parse(savedData);
    return apiRequest('/api/expense/shop/refresh', 'POST', { player_id: playerId });
  },
  
  // 背包扩展
  async expandInventory() {
    const savedData = localStorage.getItem('xundao_player');
    if (!savedData) return { success: false, error: '未创建角色' };
    const { playerId } = JSON.parse(savedData);
    return apiRequest('/api/expense/inventory/expand', 'POST', { player_id: playerId });
  },
  
  // 灵兽加速成长
  async speedupBeast(beastId, hours) {
    const savedData = localStorage.getItem('xundao_player');
    if (!savedData) return { success: false, error: '未创建角色' };
    const { playerId } = JSON.parse(savedData);
    return apiRequest('/api/expense/beast/speedup', 'POST', { player_id: playerId, beast_id: beastId, hours });
  },
  
  // 跨地图传送
  async teleport(targetMap, difficulty = 'normal') {
    const savedData = localStorage.getItem('xundao_player');
    if (!savedData) return { success: false, error: '未创建角色' };
    const { playerId } = JSON.parse(savedData);
    return apiRequest('/api/expense/teleport', 'POST', { player_id: playerId, target_map: targetMap, difficulty });
  }
};

// ============ 战力系统 API ============
const combatPowerAPI = {
  // 获取玩家战力
  async getCombatPower() {
    const savedData = localStorage.getItem('xundao_player');
    if (!savedData) return { success: false, error: '未创建角色' };
    const { playerId } = JSON.parse(savedData);
    return apiRequest(`/api/player/combat-power?playerId=${playerId}`, 'GET');
  },
  
  // 获取战力详情
  async getCombatPowerDetail() {
    const savedData = localStorage.getItem('xundao_player');
    if (!savedData) return { success: false, error: '未创建角色' };
    const { playerId } = JSON.parse(savedData);
    return apiRequest(`/api/player/combat-power/detail?playerId=${playerId}`, 'GET');
  },
  
  // 获取战力排行榜
  async getRanking() {
    return apiRequest('/api/ranking/power', 'GET');
  },
  
  // 获取我的战力排名
  async getMyRanking() {
    const savedData = localStorage.getItem('xundao_player');
    if (!savedData) return { success: false, error: '未创建角色' };
    const { playerId } = JSON.parse(savedData);
    return apiRequest(`/api/ranking/power/me?player_id=${playerId}`, 'GET');
  }
};

// ============ 宝石系统 API ============
const gemAPI = {
  // 获取宝石类型列表
  async getTypes() {
    return apiRequest('/api/gem/types', 'GET');
  },
  
  // 获取宝石等级信息
  async getLevels() {
    return apiRequest('/api/gem/levels', 'GET');
  },
  
  // 获取玩家宝石列表
  async getList() {
    const savedData = localStorage.getItem('xundao_player');
    if (!savedData) return { success: false, error: '未创建角色' };
    const { playerId } = JSON.parse(savedData);
    return apiRequest(`/api/gem/list?player_id=${playerId}`, 'GET');
  },
  
  // 获取玩家宝石（按类型分组）
  async getGrouped() {
    const savedData = localStorage.getItem('xundao_player');
    if (!savedData) return { success: false, error: '未创建角色' };
    const { playerId } = JSON.parse(savedData);
    return apiRequest(`/api/gem/grouped?player_id=${playerId}`, 'GET');
  },
  
  // 镶嵌宝石
  async embed(equipmentId, slot, gemId) {
    const savedData = localStorage.getItem('xundao_player');
    if (!savedData) return { success: false, error: '未创建角色' };
    const { playerId } = JSON.parse(savedData);
    return apiRequest('/api/gem/embed', 'POST', { 
      player_id: playerId, 
      equipment_id: equipmentId, 
      slot, 
      gem_id: gemId 
    });
  },
  
  // 取下宝石
  async remove(equipmentId, slot) {
    const savedData = localStorage.getItem('xundao_player');
    if (!savedData) return { success: false, error: '未创建角色' };
    const { playerId } = JSON.parse(savedData);
    return apiRequest('/api/gem/remove', 'POST', { 
      player_id: playerId, 
      equipment_id: equipmentId, 
      slot 
    });
  },
  
  // 升级宝石
  async upgrade(gemType, currentLevel) {
    const savedData = localStorage.getItem('xundao_player');
    if (!savedData) return { success: false, error: '未创建角色' };
    const { playerId } = JSON.parse(savedData);
    return apiRequest('/api/gem/upgrade', 'POST', { 
      player_id: playerId, 
      gem_type: gemType, 
      current_level: currentLevel 
    });
  },
  
  // 获取装备镶嵌信息
  async getEquipmentGems(equipmentId) {
    const savedData = localStorage.getItem('xundao_player');
    if (!savedData) return { success: false, error: '未创建角色' };
    const { playerId } = JSON.parse(savedData);
    return apiRequest(`/api/gem/equipment/${equipmentId}?player_id=${playerId}`, 'GET');
  }
};

// 导出API模块
window.shopAPI = shopAPI;
window.marketAPI = marketAPI;
window.sectAPI = sectAPI;
window.masterAPI = masterAPI;
window.artifactAPI = artifactAPI;
window.beastAPI = beastAPI;
window.beastEquipmentAPI = beastEquipmentAPI;
window.taskAPI = taskAPI;
window.achievementAPI = achievementAPI;
window.tutorialAPI = tutorialAPI;
window.expenseAPI = expenseAPI;
window.combatPowerAPI = combatPowerAPI;
window.gemAPI = gemAPI;
window.apiRequest = apiRequest;

console.log('📡 API调用层已加载');
