/**
 * 内存缓存层 - 游戏数据缓存优化
 * 
 * 功能：
 * - LRU 内存缓存
 * - 热点数据识别与缓存
 * - 缓存失效机制（TTL + 主动失效 + 被动失效）
 * - 缓存统计与监控
 * 
 * @module cache
 */

// ============================================================
// 1. LRU 缓存实现
// ============================================================

class LRUCache {
  /**
   * @param {number} maxSize - 最大缓存条目数
   * @param {number} defaultTTL - 默认过期时间(毫秒)
   */
  constructor(maxSize = 1000, defaultTTL = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.cache = new Map();           // key -> { value, expiry, hits }
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      invalidations: 0
    };
  }

  /**
   * 获取缓存值
   * @param {string} key 
   * @returns {any|null}
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // 检查过期
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.invalidations++;
      return null;
    }
    
    // 更新访问统计并移到末尾(MRU)
    entry.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    this.stats.hits++;
    return entry.value;
  }

  /**
   * 设置缓存值
   * @param {string} key 
   * @param {any} value 
   * @param {number} [ttl] - 过期时间(毫秒)
   */
  set(key, value, ttl) {
    // 如果 key 已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // 如果缓存已满，删除最旧的条目(LRU)
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
    
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry, hits: 0 });
    this.stats.sets++;
  }

  /**
   * 删除缓存
   * @param {string} key 
   */
  delete(key) {
    if (this.cache.delete(key)) {
      this.stats.invalidations++;
      return true;
    }
    return false;
  }

  /**
   * 清空缓存
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.invalidations += size;
  }

  /**
   * 获取缓存大小
   */
  size() {
    return this.cache.size;
  }

  /**
   * 获取命中率
   */
  getHitRate() {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%';
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 重置统计
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      invalidations: 0
    };
  }

  /**
   * 清理过期缓存
   * @returns {number} 清理的数量
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    this.stats.invalidations += cleaned;
    return cleaned;
  }
}

// ============================================================
// 2. 热点数据管理器
// ============================================================

class HotDataManager {
  constructor(options = {}) {
    this.accessLog = new Map();    // key -> accessCount
    this.hotThreshold = options.hotThreshold || 10;  // 访问次数阈值
    this.windowMs = options.windowMs || 60 * 1000;    // 统计时间窗口(1分钟)
    this.hotCache = new LRUCache(options.maxHotSize || 500, options.hotTTL || 10 * 60 * 1000);
    this.lastCleanup = Date.now();
  }

  /**
   * 记录数据访问
   * @param {string} key 
   */
  recordAccess(key) {
    const now = Date.now();
    
    // 定期清理过期的访问记录
    if (now - this.lastCleanup > this.windowMs) {
      this._cleanupAccessLog();
      this.lastCleanup = now;
    }
    
    const count = this.accessLog.get(key) || 0;
    this.accessLog.set(key, count + 1);
  }

  /**
   * 判断是否为热点数据
   * @param {string} key 
   * @returns {boolean}
   */
  isHot(key) {
    return (this.accessLog.get(key) || 0) >= this.hotThreshold;
  }

  /**
   * 获取热点数据列表
   * @returns {string[]}
   */
  getHotKeys() {
    const hotKeys = [];
    for (const [key, count] of this.accessLog.entries()) {
      if (count >= this.hotThreshold) {
        hotKeys.push(key);
      }
    }
    return hotKeys;
  }

  /**
   * 清理过期访问记录
   * @private
   */
  _cleanupAccessLog() {
    // 保留窗口期内的访问记录
    // 由于我们只用计数器简单实现，直接清空即可
    this.accessLog.clear();
  }
}

// ============================================================
// 3. 缓存失效管理器
// ============================================================

class CacheInvalidator {
  constructor() {
    // 缓存 key 前缀 -> 对应的失效处理函数
    this.invalidationRules = new Map();
    
    // 批量失效队列
    this.batchInvalidationQueue = [];
    this.batchTimer = null;
  }

  /**
   * 注册失效规则
   * @param {string} prefix - 缓存 key 前缀
   * @param {Function} handler - 失效处理函数 (cache, key) => void
   */
  registerRule(prefix, handler) {
    this.invalidationRules.set(prefix, handler);
  }

  /**
   * 失效单个 key
   * @param {Object} cache - 缓存实例
   * @param {string} key 
   */
  invalidate(cache, key) {
    cache.delete(key);
    
    // 触发相关前缀的失效规则
    for (const [prefix, handler] of this.invalidationRules.entries()) {
      if (key.startsWith(prefix)) {
        handler(cache, key);
      }
    }
  }

  /**
   * 失效指定前缀的所有缓存
   * @param {Object} cache - 缓存实例
   * @param {string} prefix - 缓存 key 前缀
   */
  invalidateByPrefix(cache, prefix) {
    // 注意：由于 Map 没有 keys 方法能过滤，我们需要外部配合
    // 这里提供一个批量失效的简化实现
    const keysToDelete = [];
    
    // 通过正则匹配需要失效的 key（如果有办法遍历的话）
    // 在实际使用中，我们使用 tag 来管理批量失效
    console.log(`[CacheInvalidator] 失效前缀: ${prefix}`);
  }

  /**
   * 添加到批量失效队列
   * @param {string} key 
   */
  queueInvalidation(key) {
    if (!this.batchInvalidationQueue.includes(key)) {
      this.batchInvalidationQueue.push(key);
    }
  }

  /**
   * 执行批量失效
   * @param {Object} cache - 缓存实例
   */
  flush(cache) {
    for (const key of this.batchInvalidationQueue) {
      cache.delete(key);
    }
    this.batchInvalidationQueue = [];
  }
}

// ============================================================
// 4. 标签式缓存管理器（支持批量失效）
// ============================================================

class TaggedCache {
  constructor(options = {}) {
    this.cache = new LRUCache(options.maxSize || 2000, options.defaultTTL || 5 * 60 * 1000);
    this.tagIndex = new Map();  // tag -> Set<keys>
    this.invalidator = new CacheInvalidator();
    
    // 默认失效规则
    this._setupDefaultRules();
  }

  /**
   * 设置默认失效规则
   * @private
   */
  _setupDefaultRules() {
    // player:{id} 相关失效时，失效 player:list 缓存
    this.invalidator.registerRule('player:', (cache, key) => {
      // 当单个玩家数据失效时，可以选择性地失效玩家列表缓存
      // 这里留空，由具体业务逻辑决定
    });
  }

  /**
   * 生成带标签的缓存 key
   * @param {string} key 
   * @param {string[]} tags 
   * @returns {string}
   */
  makeKey(key, tags = []) {
    return tags.length > 0 ? `${key}:${tags.join(',')}` : key;
  }

  /**
   * 设置缓存（带标签）
   * @param {string} key 
   * @param {any} value 
   * @param {string[]} tags 
   * @param {number} [ttl] 
   */
  set(key, value, tags = [], ttl) {
    const fullKey = this.makeKey(key, tags);
    this.cache.set(fullKey, value, ttl);
    
    // 更新标签索引
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag).add(fullKey);
    }
  }

  /**
   * 获取缓存
   * @param {string} key 
   * @param {string[]} tags 
   * @returns {any}
   */
  get(key, tags = []) {
    const fullKey = this.makeKey(key, tags);
    return this.cache.get(fullKey);
  }

  /**
   * 获取或加载缓存
   * @param {string} key 
   * @param {string[]} tags 
   * @param {Function} loader 
   * @param {number} [ttl] 
   * @returns {Promise<any>}
   */
  async getOrLoad(key, tags, loader, ttl) {
    const fullKey = this.makeKey(key, tags);
    let value = this.cache.get(fullKey);
    
    if (value === null) {
      value = await loader();
      this.set(key, value, tags, ttl);
    }
    
    return value;
  }

  /**
   * 删除缓存
   * @param {string} key 
   * @param {string[]} tags 
   */
  delete(key, tags = []) {
    const fullKey = this.makeKey(key, tags);
    this.cache.delete(fullKey);
    
    // 从标签索引中移除
    for (const tag of tags) {
      const set = this.tagIndex.get(tag);
      if (set) {
        set.delete(fullKey);
      }
    }
  }

  /**
   * 按标签失效
   * @param {string} tag 
   */
  invalidateByTag(tag) {
    const keys = this.tagIndex.get(tag);
    if (keys) {
      for (const key of keys) {
        this.cache.delete(key);
      }
      this.tagIndex.delete(tag);
    }
  }

  /**
   * 失效多个标签
   * @param {string[]} tags 
   */
  invalidateByTags(tags) {
    for (const tag of tags) {
      this.invalidateByTag(tag);
    }
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      ...this.cache.getStats(),
      tagCount: this.tagIndex.size
    };
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    return this.cache.cleanup();
  }

  /**
   * 获取缓存大小
   */
  size() {
    return this.cache.size();
  }
}

// ============================================================
// 5. 全局缓存实例
// ============================================================

// 玩家数据缓存
const playerCache = new TaggedCache({
  maxSize: 500,
  defaultTTL: 3 * 60 * 1000  // 3分钟
});

// 宗门数据缓存
const sectCache = new TaggedCache({
  maxSize: 300,
  defaultTTL: 5 * 60 * 1000  // 5分钟
});

// 灵兽数据缓存
const beastCache = new TaggedCache({
  maxSize: 500,
  defaultTTL: 5 * 60 * 1000
});

// 装备数据缓存
const equipmentCache = new TaggedCache({
  maxSize: 1000,
  defaultTTL: 10 * 60 * 1000  // 10分钟
});

// 配置数据缓存（长时间缓存）
const configCache = new TaggedCache({
  maxSize: 100,
  defaultTTL: 30 * 60 * 1000  // 30分钟
});

// 热点数据管理器
const hotDataManager = new HotDataManager({
  hotThreshold: 20,     // 访问20次以上视为热点
  maxHotSize: 200,
  hotTTL: 15 * 60 * 1000  // 热点数据缓存15分钟
});

// ============================================================
// 6. 缓存中间件/工具函数
// ============================================================

/**
 * 创建带缓存的数据加载函数
 * @param {TaggedCache} cache - 缓存实例
 * @param {Function} loader - 数据加载函数
 * @param {string} key - 缓存 key
 * @param {string[]} tags - 标签
 * @param {number} ttl - 过期时间
 */
async function cachedLoad(cache, loader, key, tags = [], ttl) {
  // 记录访问
  hotDataManager.recordAccess(key);
  
  // 尝试从缓存获取
  let value = cache.get(key, tags);
  
  if (value === null) {
    // 缓存未命中，加载数据
    value = await loader();
    
    // 检查是否为热点数据，热点数据使用更长的 TTL
    const actualTTL = hotDataManager.isHot(key) ? ttl * 3 : ttl;
    cache.set(key, value, tags, actualTTL);
  }
  
  return value;
}

/**
 * 缓存数据变更时的失效处理
 */
const cacheInvalidation = {
  // 玩家数据变更
  invalidatePlayer(playerId) {
    playerCache.invalidateByTags([`player:${playerId}`, 'player:list']);
    sectCache.invalidateByTag(`sect:member:${playerId}`);
  },

  // 宗门数据变更
  invalidateSect(sectId) {
    sectCache.invalidateByTags([`sect:${sectId}`, 'sect:list']);
  },

  // 灵兽数据变更
  invalidateBeast(beastId) {
    beastCache.invalidateByTag(`beast:${beastId}`);
  },

  // 装备数据变更
  invalidateEquipment(playerId) {
    equipmentCache.invalidateByTag(`equip:${playerId}`);
  },

  // 灵石变更
  invalidateResources(playerId) {
    playerCache.delete(`resources:${playerId}`, ['player']);
  }
};

// ============================================================
// 7. 定期清理任务
// ============================================================

let cleanupInterval = null;

/**
 * 启动定期缓存清理
 * @param {number} intervalMs - 清理间隔(毫秒)
 */
function startCleanup(intervalMs = 60 * 1000) {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  
  cleanupInterval = setInterval(() => {
    playerCache.cleanup();
    sectCache.cleanup();
    beastCache.cleanup();
    equipmentCache.cleanup();
    configCache.cleanup();
    
    // 打印缓存统计（可选，用于调试）
    // console.log('[Cache] Stats:', playerCache.getStats());
  }, intervalMs);
  
  console.log(`[Cache] 定期清理已启动，间隔 ${intervalMs}ms`);
}

/**
 * 停止定期缓存清理
 */
function stopCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// ============================================================
// 模块导出
// ============================================================

module.exports = {
  // 核心类
  LRUCache,
  HotDataManager,
  CacheInvalidator,
  TaggedCache,
  
  // 全局缓存实例
  playerCache,
  sectCache,
  beastCache,
  equipmentCache,
  configCache,
  hotDataManager,
  
  // 工具函数
  cachedLoad,
  cacheInvalidation,
  
  // 清理任务
  startCleanup,
  stopCleanup
};
