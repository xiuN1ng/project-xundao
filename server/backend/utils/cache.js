/**
 * Redis 缓存层 - 游戏高频数据缓存
 * 
 * 功能：
 * - Redis + 内存 LRU 双层缓存
 * - 缓存失效回源到 SQLite
 * - 天梯排行榜 / 世界Boss状态 / 战令任务配置 三种缓存
 * 
 * @module backend/utils/cache
 */

const path = require('path');

// ============================================================
// 0. 配置
// ============================================================

const CACHE_CONFIG = {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    retryDelayMs: 2000,
    maxRetries: 3,
  },
  // 缓存 TTL
  ttl: {
    ladder_top_100: 5 * 60,        // 天梯排行榜: 5分钟
    world_boss_status: 30,          // 世界Boss状态: 30秒
    season_pass_tasks: 60 * 60,    // 战令任务配置: 1小时
  }
};

// ============================================================
// 1. 内存 LRU 回退（Redis 不可用时）
// ============================================================

class InMemoryCache {
  constructor() {
    this.store = new Map();
    this.expiry = new Map();
  }

  _isExpired(key) {
    const exp = this.expiry.get(key);
    return exp !== undefined && Date.now() > exp;
  }

  get(key) {
    if (this._isExpired(key)) {
      this.store.delete(key);
      this.expiry.delete(key);
      return null;
    }
    return this.store.get(key) ?? null;
  }

  set(key, value, ttlSeconds) {
    this.store.set(key, value);
    this.expiry.set(key, Date.now() + ttlSeconds * 1000);
  }

  del(key) {
    this.store.delete(key);
    this.expiry.delete(key);
  }

  async getOrSet(key, ttlSeconds, loader) {
    const cached = this.get(key);
    if (cached !== null) return cached;
    const value = await loader();
    this.set(key, value, ttlSeconds);
    return value;
  }

  invalidate(key) {
    this.del(key);
  }
}

// ============================================================
// 2. Redis 客户端（ioredis + 自动重连 + 回退）
// ============================================================

let RedisClient = null;
let redis = null;
let useInMemory = true;  // 默认回退到内存缓存

function createRedisClient() {
  try {
    RedisClient = require('ioredis');
  } catch (e) {
    console.warn('[RedisCache] ioredis 未安装，将使用内存缓存:', e.message);
    return null;
  }

  const opts = {
    host: CACHE_CONFIG.redis.host,
    port: CACHE_CONFIG.redis.port,
    password: CACHE_CONFIG.redis.password || undefined,
    retryStrategy: (times) => {
      if (times > CACHE_CONFIG.redis.maxRetries) {
        console.warn('[RedisCache] Redis 连接重试超过上限，切换到内存缓存');
        return null; // 停止重连
      }
      return Math.min(times * CACHE_CONFIG.redis.retryDelayMs, 10000);
    },
    lazyConnect: true,
    enableOfflineQueue: false,
  };

  const client = new RedisClient(opts);

  client.on('connect', () => {
    console.log('[RedisCache] Redis 连接成功');
    useInMemory = false;
  });

  client.on('error', (err) => {
    if (useInMemory === false) {
      console.warn('[RedisCache] Redis 错误，切换到内存缓存:', err.message);
    }
    useInMemory = true;
  });

  client.on('close', () => {
    console.warn('[RedisCache] Redis 连接关闭，切换到内存缓存');
    useInMemory = true;
  });

  return client;
}

// ============================================================
// 3. 统一缓存接口
// ============================================================

class GameCache {
  constructor() {
    this.memory = new InMemoryCache();
    this._redis = null;
    this._connectPromise = null;
  }

  _getRedis() {
    if (!this._redis) {
      this._redis = createRedisClient();
    }
    return this._redis;
  }

  async connect() {
    if (this._connectPromise) return this._connectPromise;
    this._connectPromise = (async () => {
      const r = this._getRedis();
      if (r) {
        try {
          await r.connect();
          useInMemory = false;
        } catch (e) {
          console.warn('[RedisCache] Redis 连接失败，使用内存缓存:', e.message);
          useInMemory = true;
        }
      }
    })();
    return this._connectPromise;
  }

  /**
   * 获取缓存（Redis优先，回退内存）
   */
  async get(key) {
    if (!useInMemory) {
      try {
        const r = this._getRedis();
        const val = await r.get(key);
        if (val !== null) return JSON.parse(val);
      } catch (e) {
        console.warn('[RedisCache] Redis get 失败:', e.message);
      }
    }
    return this.memory.get(key);
  }

  /**
   * 设置缓存（Redis + 内存双写）
   */
  async set(key, value, ttlSeconds) {
    const serialized = JSON.stringify(value);

    // 内存缓存
    this.memory.set(key, value, ttlSeconds);

    // Redis
    if (!useInMemory) {
      try {
        const r = this._getRedis();
        await r.setex(key, ttlSeconds, serialized);
      } catch (e) {
        console.warn('[RedisCache] Redis set 失败:', e.message);
      }
    }
  }

  /**
   * 删除缓存
   */
  async invalidate(key) {
    this.memory.del(key);
    if (!useInMemory) {
      try {
        const r = this._getRedis();
        await r.del(key);
      } catch (e) {
        console.warn('[RedisCache] Redis del 失败:', e.message);
      }
    }
  }

  /**
   * Get-or-set 模式：缓存未命中时调用 loader 回源
   */
  async getOrSet(key, ttlSeconds, loader) {
    // 尝试从缓存获取
    const cached = await this.get(key);
    if (cached !== null) return cached;

    // 回源
    const value = await loader();

    // 写入缓存
    await this.set(key, value, ttlSeconds);

    return value;
  }

  /**
   * 关闭连接
   */
  async close() {
    if (this._redis) {
      try {
        await this._redis.quit();
      } catch (e) { /* ignore */ }
      this._redis = null;
    }
  }
}

// ============================================================
// 4. 全局缓存实例
// ============================================================

const gameCache = new GameCache();

// ============================================================
// 5. 专用缓存访问器（业务层直接调用）
// ============================================================

const CACHE_KEYS = {
  LADDER_TOP_100:    'ladder_top_100',
  WORLD_BOSS_STATUS: 'world_boss_status',
  SEASON_PASS_TASKS: 'season_pass_tasks',
};

/**
 * 获取天梯排行榜（带缓存，TTL: 5min）
 * @param {Function} loader - () => Promise<Array> 从 SQLite 回源的函数
 */
async function getLadderTop100(loader) {
  return gameCache.getOrSet(
    CACHE_KEYS.LADDER_TOP_100,
    CACHE_CONFIG.ttl.ladder_top_100,
    loader
  );
}

/**
 * 获取世界Boss状态（带缓存，TTL: 30s）
 * @param {Function} loader - () => Promise<Object> 从 SQLite/内存回源的函数
 */
async function getWorldBossStatus(loader) {
  return gameCache.getOrSet(
    CACHE_KEYS.WORLD_BOSS_STATUS,
    CACHE_CONFIG.ttl.world_boss_status,
    loader
  );
}

/**
 * 获取战令任务配置（带缓存，TTL: 1hour）
 * @param {Function} loader - () => Promise<Object> 从 SQLite 回源的函数
 */
async function getSeasonPassTasks(loader) {
  return gameCache.getOrSet(
    CACHE_KEYS.SEASON_PASS_TASKS,
    CACHE_CONFIG.ttl.season_pass_tasks,
    loader
  );
}

/**
 * 失效天梯排行榜缓存
 */
async function invalidateLadderTop100() {
  await gameCache.invalidate(CACHE_KEYS.LADDER_TOP_100);
}

/**
 * 失效世界Boss状态缓存
 */
async function invalidateWorldBossStatus() {
  await gameCache.invalidate(CACHE_KEYS.WORLD_BOSS_STATUS);
}

/**
 * 失效战令任务配置缓存
 */
async function invalidateSeasonPassTasks() {
  await gameCache.invalidate(CACHE_KEYS.SEASON_PASS_TASKS);
}

// ============================================================
// 6. 模块导出
// ============================================================

module.exports = {
  // 启动连接（可选，getOrSet 会自动处理）
  connect: () => gameCache.connect(),

  // 核心缓存实例
  gameCache,

  // 缓存键名
  CACHE_KEYS,

  // 三个专用访问器
  getLadderTop100,
  getWorldBossStatus,
  getSeasonPassTasks,

  // 失效函数
  invalidateLadderTop100,
  invalidateWorldBossStatus,
  invalidateSeasonPassTasks,

  // 配置
  CACHE_CONFIG,

  // 关闭
  close: () => gameCache.close(),
};
