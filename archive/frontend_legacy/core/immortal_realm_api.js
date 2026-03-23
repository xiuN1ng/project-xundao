/**
 * 仙界展示系统 - 前端API调用
 * 仙界地图、境界特效相关API
 */

// ==================== 仙界境界系统 API ====================
const immortalRealmAPI = {
  // 获取所有境界列表
  async getList() {
    return apiRequest('/api/immortal-realm/list', 'GET');
  },
  
  // 获取玩家境界信息
  async getInfo() {
    return apiRequest('/api/immortal-realm/info', 'GET');
  },
  
  // 添加境界经验
  async addExp(amount) {
    return apiRequest('/api/immortal-realm/add-exp', 'POST', { amount });
  },
  
  // 突破境界
  async advance() {
    return apiRequest('/api/immortal-realm/advance', 'POST');
  },
  
  // 检查是否可以突破
  async canAdvance() {
    return apiRequest('/api/immortal-realm/can-advance', 'GET');
  },
  
  // 获取境界排行榜
  async getRanking(limit = 100) {
    return apiRequest(`/api/immortal-realm/ranking?limit=${limit}`, 'GET');
  }
};

// ==================== 福地任务系统 API ====================
const blessedLandAPI = {
  // 获取可用的福地列表
  async getTypes() {
    return apiRequest('/api/blessed-land/types', 'GET');
  },
  
  // 获取福地任务状态
  async getStatus() {
    return apiRequest('/api/blessed-land/status', 'GET');
  },
  
  // 开始探索任务
  async start(landId) {
    return apiRequest('/api/blessed-land/start', 'POST', { landId });
  },
  
  // 触发随机事件
  async triggerEvent() {
    return apiRequest('/api/blessed-land/trigger-event', 'POST');
  },
  
  // 完成探索任务
  async complete() {
    return apiRequest('/api/blessed-land/complete', 'POST');
  },
  
  // 获取探索历史
  async getHistory(limit = 10) {
    return apiRequest(`/api/blessed-land/history?limit=${limit}`, 'GET');
  },
  
  // 放弃任务
  async abandon() {
    return apiRequest('/api/blessed-land/abandon', 'POST');
  }
};

// ==================== 仙界任务系统 API ====================
const immortalQuestAPI = {
  // 获取所有仙界任务
  async getList(type = null) {
    const query = type ? `?type=${type}` : '';
    return apiRequest(`/api/immortal-quest/list${query}`, 'GET');
  },
  
  // 获取可接任务
  async getAvailable() {
    return apiRequest('/api/immortal-quest/available', 'GET');
  },
  
  // 获取玩家任务列表
  async getMy() {
    return apiRequest('/api/immortal-quest/my', 'GET');
  },
  
  // 接受任务
  async accept(questId) {
    return apiRequest('/api/immortal-quest/accept', 'POST', { questId });
  },
  
  // 完成任务
  async complete(questId) {
    return apiRequest('/api/immortal-quest/complete', 'POST', { questId });
  },
  
  // 放弃任务
  async abandon(questId) {
    return apiRequest('/api/immortal-quest/abandon', 'POST', { questId });
  }
};

// ==================== BOSS血量共享系统 API ====================
const sharedBossAPI = {
  // 获取BOSS列表
  async getList() {
    return apiRequest('/api/shared-boss/list', 'GET');
  },
  
  // 获取BOSS状态
  async getStatus() {
    return apiRequest('/api/shared-boss/status', 'GET');
  },
  
  // 召唤BOSS
  async summon(bossId) {
    return apiRequest('/api/shared-boss/summon', 'POST', { bossId });
  },
  
  // 攻击BOSS
  async attack(damage) {
    return apiRequest('/api/shared-boss/attack', 'POST', { damage });
  },
  
  // 获取BOSS信息
  async getInfo() {
    return apiRequest('/api/shared-boss/info', 'GET');
  },
  
  // 获取伤害排名
  async getRanking(limit = 10) {
    return apiRequest(`/api/shared-boss/ranking?limit=${limit}`, 'GET');
  },
  
  // 获取玩家个人伤害
  async getMyDamage() {
    return apiRequest('/api/shared-boss/my-damage', 'GET');
  },
  
  // 召唤每日BOSS
  async spawnDaily() {
    return apiRequest('/api/shared-boss/spawn-daily', 'POST');
  }
};

console.log('仙界展示系统 API 已加载');
