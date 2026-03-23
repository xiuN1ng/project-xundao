/**
 * 性能优化模块
 * 
 * 提供游戏服务器性能优化组件：
 * - N+1 查询优化器 (DataLoader 批量加载模式)
 * - Redis 缓存雪崩防护 (Single-flight + 概率性提前过期)
 * - MySQL 连接池 + 重试机制
 * - WebSocket 重连优化 (Jitter 指数退避)
 * 
 * @module performance
 */

// ============================================================
// 1. N+1 查询优化器 - DataLoader 批量加载模式
// ============================================================

/**
 * DataLoader - 批量加载器，用于解决 N+1 查询问题
 * 
 * 应用场景：批量加载宗门成员、竞技场挑战列表、灵兽列表等
 * 
 * @class DataLoader
 */
class DataLoader {
  /**
   * @param {Function} batchLoadFn - 批量加载函数，接收 ID 数组，返回 Promise<结果数组>
   * @param {Object} options - 配置选项
   * @param {number} [options.maxBatchSize=100] - 最大批量大小
   * @param {number} [options.batchDelayMs=10] - 批量延迟时间(ms)，等待更多请求累积
   */
  constructor(batchLoadFn, options = {}) {
    this.batchLoadFn = batchLoadFn;
    this.maxBatchSize = options.maxBatchSize || 100;
    this.batchDelayMs = options.batchDelayMs || 10;
    
    this.cache = new Map();           // 结果缓存
    this.pendingRequests = new Map();  // 待处理的请求
    this.batchTimer = null;           // 批量处理定时器
  }

  /**
   * 加载单个 ID 对应的数据
   * @param {string|number} id - 要加载的资源 ID
   * @returns {Promise<any>} - 加载结果
   */
  async load(id) {
    const key = String(id);
    
    // 1. 检查缓存
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // 2. 检查是否已有待处理的请求
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // 3. 创建新的加载 Promise
    const promise = this._scheduleBatch(key);
    this.pendingRequests.set(key, promise);

    return promise;
  }

  /**
   * 调度批量请求
   * @private
   */
  _scheduleBatch(key) {
    // 如果没有定时器，设置延迟批量处理
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this._executeBatch();
      }, this.batchDelayMs);
    }

    // 返回 Promise，等批量执行完成
    return new Promise((resolve, reject) => {
      // 将 resolve/reject 存储在临时映射中
      this._pendingResolves = this._pendingResolves || new Map();
      this._pendingResolves.set(key, { resolve, reject });
    });
  }

  /**
   * 执行批量加载
   * @private
   */
  async _executeBatch() {
    this.batchTimer = null;
    
    const keys = Array.from(this.pendingRequests.keys());
    const resolves = this._pendingResolves;
    this._pendingResolves = new Map();
    this.pendingRequests.clear();

    if (keys.length === 0) return;

    // 分批处理（如果超过最大批量大小）
    for (let i = 0; i < keys.length; i += this.maxBatchSize) {
      const batchKeys = keys.slice(i, i + this.maxBatchSize);
      
      try {
        // 调用批量加载函数
        const results = await this.batchLoadFn(batchKeys);
        
        // 构建 ID -> 结果 的映射
        const resultMap = new Map();
        results.forEach((result, idx) => {
          if (result) {
            resultMap.set(String(result.id), result);
          }
        });

        // 逐个解析 Promise
        batchKeys.forEach(key => {
          const result = resultMap.has(key) ? resultMap.get(key) : null;
          this.cache.set(key, result);  // 缓存结果（包括 null）
          
          if (resolves.has(key)) {
            resolves.get(key).resolve(result);
          }
        });
      } catch (error) {
        // 批量加载失败，所有请求都 reject
        batchKeys.forEach(key => {
          if (resolves.has(key)) {
            resolves.get(key).reject(error);
          }
        });
      }
    }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   * @returns {number}
   */
  getCacheSize() {
    return this.cache.size;
  }
}

/**
 * 创建宗门成员批量加载器
 * @param {Function} dbQueryFn - 数据库查询函数
 * @returns {DataLoader}
 */
function createSectMemberLoader(dbQueryFn) {
  return new DataLoader(async (memberIds) => {
    // 批量查询成员详情
    return await dbQueryFn(memberIds);
  }, { maxBatchSize: 50, batchDelayMs: 10 });
}

/**
 * 创建灵兽批量加载器
 * @param {Function} dbQueryFn - 数据库查询函数
 * @returns {DataLoader}
 */
function createBeastLoader(dbQueryFn) {
  return new DataLoader(async (beastIds) => {
    return await dbQueryFn(beastIds);
  }, { maxBatchSize: 30, batchDelayMs: 10 });
}

/**
 * 创建竞技场对手批量加载器
 * @param {Function} dbQueryFn - 数据库查询函数
 * @returns {DataLoader}
 */
function createArenaOpponentLoader(dbQueryFn) {
  return new DataLoader(async (playerIds) => {
    return await dbQueryFn(playerIds);
  }, { maxBatchSize: 20, batchDelayMs: 20 });
}


// ============================================================
// 2. Redis 缓存雪崩防护 - Single-flight + 概率性提前过期
// ============================================================

/**
 * 缓存防雪崩保护器
 * 
 * 应用场景：玩家境界/灵石/装备数据缓存
 * 
 * @class CacheBreaker
 */
class CacheBreaker {
  /**
   * @param {Object} options - 配置选项
   * @param {number} [options.defaultTTL=3600] - 默认缓存时间(秒)
   * @param {number} [options.earlyExpiryProb=0.1] - 提前过期概率 (10%)
   * @param {number} [options.earlyExpiryWindow=300] - 提前过期窗口(秒)
   * @param {Object} [options.redisClient] - Redis 客户端 (可选)
   */
  constructor(options = {}) {
    this.defaultTTL = options.defaultTTL || 3600;
    this.earlyExpiryProb = options.earlyExpiryProb || 0.1;
    this.earlyExpiryWindow = options.earlyExpiryWindow || 300;
    this.redisClient = options.redisClient;
    
    // 内存缓存（用于单实例场景或 Redis 不可用时）
    this.memoryCache = new Map();
    
    // Single-flight 锁：key -> Promise
    this.inFlightRequests = new Map();
  }

  /**
   * 获取缓存值
   * @param {string} key - 缓存键
   * @returns {Promise<any|null>}
   */
  async get(key) {
    // 尝试从 Redis 获取
    if (this.redisClient) {
      try {
        const data = await this.redisClient.get(key);
        if (data) {
          return JSON.parse(data);
        }
      } catch (e) {
        console.warn('[CacheBreaker] Redis get failed:', e.message);
      }
    }

    // 尝试从内存缓存获取
    const memData = this.memoryCache.get(key);
    if (memData) {
      const { value, expiry } = memData;
      // 检查是否过期
      if (Date.now() < expiry) {
        return value;
      }
      this.memoryCache.delete(key);
    }

    return null;
  }

  /**
   * 设置缓存值
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} [ttl] - 缓存时间(秒)，默认使用 defaultTTL
   */
  async set(key, value, ttl) {
    const actualTTL = ttl || this.defaultTTL;
    const expiry = Date.now() + actualTTL * 1000;

    // 存储到 Redis
    if (this.redisClient) {
      try {
        await this.redisClient.setex(key, actualTTL, JSON.stringify(value));
      } catch (e) {
        console.warn('[CacheBreaker] Redis set failed:', e.message);
      }
    }

    // 存储到内存缓存
    this.memoryCache.set(key, { value, expiry });
  }

  /**
   * 获取缓存值，如果不存在则加载并缓存
   * 包含 Single-flight 机制，防止缓存击穿
   * 
   * @param {string} key - 缓存键
   * @param {Function} loader - 加载函数，返回 Promise
   * @param {number} [ttl] - 缓存时间(秒)
   * @returns {Promise<any>}
   */
  async getOrLoad(key, loader, ttl) {
    // 1. 尝试从缓存获取
    const cached = await this.get(key);
    if (cached !== null) {
      // 2. 概率性提前过期 - 防止雪崩
      this._maybeExpireEarly(key, ttl);
      return cached;
    }

    // 3. Single-flight：检查是否有正在进行的请求
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key);
    }

    // 4. 创建新的加载请求
    const loadPromise = (async () => {
      try {
        const value = await loader();
        await this.set(key, value, ttl);
        return value;
      } finally {
        // 释放锁
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, loadPromise);
    return loadPromise;
  }

  /**
   * 概率性提前过期 - 防止大量缓存同时失效
   * @private
   */
  async _maybeExpireEarly(key, ttl) {
    const actualTTL = ttl || this.defaultTTL;
    
    // 只有在缓存进入"最后阶段"时才可能提前过期
    if (actualTTL < this.earlyExpiryWindow) return;

    // 随机决定是否提前过期
    if (Math.random() < this.earlyExpiryProb) {
      // 提前过期：删除缓存，让下一个请求重新加载
      if (this.redisClient) {
        try {
          await this.redisClient.del(key);
        } catch (e) {}
      }
      this.memoryCache.delete(key);
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  async delete(key) {
    if (this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (e) {}
    }
    this.memoryCache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  async clear() {
    if (this.redisClient) {
      try {
        await this.redisClient.flushdb();
      } catch (e) {}
    }
    this.memoryCache.clear();
  }
}

/**
 * 创建玩家数据缓存器（带防雪崩）
 * @param {Object} [redisClient] - Redis 客户端
 * @returns {CacheBreaker}
 */
function createPlayerCache(redisClient) {
  return new CacheBreaker({
    defaultTTL: 1800,        // 30分钟
    earlyExpiryProb: 0.1,   // 10% 概率提前过期
    earlyExpiryWindow: 300,  // 最后5分钟可能提前过期
    redisClient
  });
}

/**
 * 创建装备数据缓存器
 * @param {Object} [redisClient] - Redis 客户端
 * @returns {CacheBreaker}
 */
function createEquipmentCache(redisClient) {
  return new CacheBreaker({
    defaultTTL: 3600,       // 1小时
    earlyExpiryProb: 0.15,  // 15% 概率提前过期
    earlyExpiryWindow: 600,  // 最后10分钟可能提前过期
    redisClient
  });
}


// ============================================================
// 3. MySQL 连接池 + 重试机制
// ============================================================

/**
 * MySQL 连接池包装器，带自动重试机制
 * 
 * 应用场景：数据库连接管理，自动重试
 * 
 * @class MysqlPool
 */
class MysqlPool {
  /**
   * @param {Object} config - MySQL 配置
   * @param {string} config.host - 数据库主机
   * @param {string} config.user - 用户名
   * @param {string} config.password - 密码
   * @param {string} config.database - 数据库名
   * @param {Object} [options] - 额外选项
   * @param {number} [options.maxRetries=3] - 最大重试次数
   * @param {number} [options.retryDelay=1000] - 重试延迟(ms)
   * @param {number} [options.connectionLimit=10] - 连接池大小
   */
  constructor(config, options = {}) {
    this.config = config;
    this.options = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      connectionLimit: options.connectionLimit || 10
    };
    
    this.pool = null;
    this._initialized = false;
  }

  /**
   * 初始化连接池
   */
  async initialize() {
    if (this._initialized) return;
    
    try {
      const mysql = require('mysql2/promise');
      this.pool = mysql.createPool({
        ...this.config,
        waitForConnections: true,
        connectionLimit: this.options.connectionLimit,
        queueLimit: 0,
        // 连接超时配置
        connectTimeout: 10000,
        // 空闲连接超时
        idleTimeout: 60000
      });
      
      // 测试连接
      const conn = await this.pool.getConnection();
      conn.release();
      this._initialized = true;
      console.log('[MysqlPool] 连接池初始化成功');
    } catch (error) {
      console.error('[MysqlPool] 连接池初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 执行 SQL（带重试机制）
   * @param {string} sql - SQL 语句
   * @param {Array} params - 参数
   * @returns {Promise<Array>}
   */
  async execute(sql, params = []) {
    if (!this.pool) {
      await this.initialize();
    }

    let lastError;
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        const [rows] = await this.pool.execute(sql, params);
        return [rows];
      } catch (error) {
        lastError = error;
        console.warn(`[MysqlPool] SQL 执行失败 (尝试 ${attempt}/${this.options.maxRetries}):`, error.message);
        
        if (attempt < this.options.maxRetries) {
          // 指数退避延迟
          const delay = this.options.retryDelay * Math.pow(2, attempt - 1);
          await this._sleep(delay);
        }
      }
    }

    throw new Error(`[MysqlPool] SQL 执行失败，已重试 ${this.options.maxRetries} 次: ${lastError.message}`);
  }

  /**
   * 执行查询（带重试机制）
   * @param {string} sql - SQL 语句
   * @param {Array} params - 参数
   * @returns {Promise<Array>}
   */
  async query(sql, params = []) {
    if (!this.pool) {
      await this.initialize();
    }

    let lastError;
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        const [rows] = await this.pool.query(sql, params);
        return [rows];
      } catch (error) {
        lastError = error;
        console.warn(`[MysqlPool] Query 执行失败 (尝试 ${attempt}/${this.options.maxRetries}):`, error.message);
        
        if (attempt < this.options.maxRetries) {
          const delay = this.options.retryDelay * Math.pow(2, attempt - 1);
          await this._sleep(delay);
        }
      }
    }

    throw new Error(`[MysqlPool] Query 执行失败，已重试 ${this.options.maxRetries} 次: ${lastError.message}`);
  }

  /**
   * 获取连接
   * @returns {Promise<Connection>}
   */
  async getConnection() {
    if (!this.pool) {
      await this.initialize();
    }
    return await this.pool.getConnection();
  }

  /**
   * 关闭连接池
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this._initialized = false;
    }
  }

  /**
   * 睡眠函数
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 创建 MySQL 连接池
 * @param {Object} config - 数据库配置
 * @param {Object} options - 选项
 * @returns {MysqlPool}
 */
function createMysqlPool(config, options) {
  return new MysqlPool(config, options);
}


// ============================================================
// 4. WebSocket 重连优化 - Jitter 指数退避
// ============================================================

/**
 * WebSocket 重连管理器
 * 
 * 应用场景：玩家断线重连
 * 
 * @class WSReconnectManager
 */
class WSReconnectManager {
  /**
   * @param {Object} options - 配置选项
   * @param {number} [options.baseDelay=1000] - 基础延迟(ms)
   * @param {number} [options.maxDelay=30000] - 最大延迟(ms)
   * @param {number} [options.maxRetries=10] - 最大重试次数
   * @param {number} [options.jitterFactor=0.3] - 抖动因子 (0-1)
   * @param {Function} [options.onReconnect] - 重连回调
   * @param {Function} [options.onMaxRetries] - 达到最大重试次数回调
   */
  constructor(options = {}) {
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.maxRetries = options.maxRetries || 10;
    this.jitterFactor = options.jitterFactor || 0.3;
    
    this.onReconnect = options.onReconnect || (() => {});
    this.onMaxRetries = options.onMaxRetries || (() => {});
    
    this.retryCount = 0;
    this.isReconnecting = false;
    this.reconnectTimer = null;
  }

  /**
   * 计算带抖动的指数退避延迟
   * @private
   * @returns {number} 延迟时间(ms)
   */
  _calculateDelay() {
    // 指数退避: baseDelay * 2^retryCount
    const exponentialDelay = this.baseDelay * Math.pow(2, this.retryCount);
    
    // 添加抖动: +/- jitterFactor * delay
    const jitter = exponentialDelay * this.jitterFactor * (Math.random() * 2 - 1);
    
    // 计算最终延迟，并限制在最大延迟内
    const delay = Math.min(
      Math.max(exponentialDelay + jitter, this.baseDelay),
      this.maxDelay
    );
    
    return Math.floor(delay);
  }

  /**
   * 执行重连
   * @param {Function} connectFn - 连接函数，返回 Promise
   * @returns {Promise<boolean>} 是否重连成功
   */
  async reconnect(connectFn) {
    if (this.isReconnecting) {
      return false;
    }

    this.isReconnecting = true;
    
    while (this.retryCount < this.maxRetries) {
      const delay = this._calculateDelay();
      console.log(`[WSReconnect] 第 ${this.retryCount + 1} 次重试，延迟 ${delay}ms`);
      
      await this._sleep(delay);
      
      try {
        await connectFn();
        console.log('[WSReconnect] 重连成功!');
        this.reset();
        this.onReconnect();
        return true;
      } catch (error) {
        this.retryCount++;
        console.warn(`[WSReconnect] 重连失败:`, error.message);
      }
    }

    // 达到最大重试次数
    console.error(`[WSReconnect] 达到最大重试次数 (${this.maxRetries})`);
    this.isReconnecting = false;
    this.onMaxRetries();
    return false;
  }

  /**
   * 立即重连（不等待）
   * @param {Function} connectFn - 连接函数
   */
  reconnectImmediate(connectFn) {
    this.retryCount = 0;
    this.reconnect(connectFn);
  }

  /**
   * 重置重连状态
   */
  reset() {
    this.retryCount = 0;
    this.isReconnecting = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 获取当前重试次数
   * @returns {number}
   */
  getRetryCount() {
    return this.retryCount;
  }

  /**
   * 是否正在重连
   * @returns {boolean}
   */
  getIsReconnecting() {
    return this.isReconnecting;
  }

  /**
   * 睡眠函数
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 创建 WebSocket 重连管理器
 * @param {Object} options - 配置选项
 * @returns {WSReconnectManager}
 */
function createWSReconnectManager(options) {
  return new WSReconnectManager(options);
}


// ============================================================
// 模块导出
// ============================================================

module.exports = {
  // 1. N+1 查询优化器
  DataLoader,
  createSectMemberLoader,
  createBeastLoader,
  createArenaOpponentLoader,
  
  // 2. Redis 缓存雪崩防护
  CacheBreaker,
  createPlayerCache,
  createEquipmentCache,
  
  // 3. MySQL 连接池 + 重试机制
  MysqlPool,
  createMysqlPool,
  
  // 4. WebSocket 重连优化
  WSReconnectManager,
  createWSReconnectManager
};


// ============================================================
// 使用示例
// ============================================================

/**
 * @example
 * // ===== 1. N+1 查询优化器使用示例 =====
 * 
 * const { DataLoader, createBeastLoader } = require('./performance');
 * 
 * // 假设有一个批量查询灵兽的函数
 * async function batchQueryBeasts(beastIds) {
 *   const [rows] = await db.execute(
 *     'SELECT * FROM beasts WHERE id IN (?)', 
 *     [beastIds]
 *   );
 *   return rows;
 * }
 * 
 * // 创建灵兽加载器
 * const beastLoader = createBeastLoader(batchQueryBeasts);
 * 
 * // 使用加载器（会自动批量查询）
 * const beast1 = await beastLoader.load(beastId1);
 * const beast2 = await beastLoader.load(beastId2);
 * // 上面的两次 load 会在 10ms 后合并为一次批量查询
 * 
 * @example
 * // ===== 2. Redis 缓存雪崩防护使用示例 =====
 * 
 * const { createPlayerCache } = require('./performance');
 * 
 * // 假设有 Redis 客户端
 * const redis = require('redis');
 * const client = redis.createClient();
 * 
 * // 创建玩家数据缓存器
 * const playerCache = createPlayerCache(client);
 * 
 * // 获取玩家数据（带缓存和防雪崩）
 * const playerData = await playerCache.getOrLoad(
 *   `player:${playerId}`,
 *   async () => {
 *     // 从数据库加载
 *     const [rows] = await db.execute(
 *       'SELECT * FROM player WHERE id = ?',
 *       [playerId]
 *     );
 *     return rows[0];
 *   },
 *   1800  // 缓存 30 分钟
 * );
 * 
 * @example
 * // ===== 3. MySQL 连接池 + 重试机制使用示例 =====
 * 
 * const { createMysqlPool } = require('./performance');
 * 
 * // 创建带重试的连接池
 * const pool = createMysqlPool({
 *   host: 'localhost',
 *   user: 'root',
 *   password: 'password',
 *   database: 'idle_cultivation'
 * }, {
 *   maxRetries: 3,
 *   retryDelay: 1000,
 *   connectionLimit: 10
 * });
 * 
 * // 初始化
 * await pool.initialize();
 * 
 * // 执行查询（自动重试）
 * const [players] = await pool.execute(
 *   'SELECT * FROM player WHERE sect_id = ?',
 *   [sectId]
 * );
 * 
 * @example
 * // ===== 4. WebSocket 重连优化使用示例 =====
 * 
 * const { createWSReconnectManager } = require('./performance');
 * 
 * // 创建重连管理器
 * const reconnectMgr = createWSReconnectManager({
 *   baseDelay: 1000,      // 初始延迟 1 秒
 *   maxDelay: 30000,      // 最大延迟 30 秒
 *   maxRetries: 10,       // 最多重试 10 次
 *   jitterFactor: 0.3,    // 30% 抖动
 *   onReconnect: () => console.log('重新连接成功!'),
 *   onMaxRetries: () => {
 *     console.log('无法连接，请检查网络');
 *     // 提示用户刷新页面
 *   }
 * });
 * 
 * // 监听断开连接
 * ws.on('close', () => {
 *   reconnectMgr.reconnect(() => {
 *     return new Promise((resolve, reject) => {
 *       ws = new WebSocket(url);
 *       ws.on('open', resolve);
 *       ws.on('error', reject);
 *     });
 *   });
 * });
 */
