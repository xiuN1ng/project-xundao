/**
 * 挂机修仙 - MySQL 数据库连接池模块
 * 支持重试逻辑、连接池管理、查询优化
 */

// 加载环境变量
require('dotenv').config();

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 默认配置
const DEFAULT_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'idle_cultivation',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // 重试配置
  retry: {
    maxAttempts: 3,
    delay: 1000,
  }
};

class Database {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.pool = null;
    this.connected = false;
    this.retryCount = 0;
    this.maxRetries = this.config.retry?.maxAttempts || 3;
  }

  // 初始化连接池
  async init() {
    try {
      this.pool = mysql.createPool(this.config);
      
      // 测试连接
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      
      this.connected = true;
      this.retryCount = 0;
      console.log('✅ MySQL 连接池初始化成功');
      
      // 创建数据库（如果不存在）
      await this.createDatabaseIfNotExists();
      
      // 创建表结构
      await this.createTables();
      
      return true;
    } catch (error) {
      console.error('❌ MySQL 连接失败:', error.message);
      return await this.retryConnect();
    }
  }

  // 重试连接
  async retryConnect() {
    if (this.retryCount >= this.maxRetries) {
      console.error(`❌ 超过最大重试次数 (${this.maxRetries})`);
      return false;
    }

    this.retryCount++;
    const delay = this.config.retry?.delay || 1000;
    console.log(`🔄 尝试重新连接... (${this.retryCount}/${this.maxRetries})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return await this.init();
  }

  // 创建数据库（如果不存在）
  async createDatabaseIfNotExists() {
    const dbName = this.config.database;
    const tempConfig = { ...this.config, database: undefined };
    
    const tempPool = mysql.createPool(tempConfig);
    try {
      await tempPool.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`📁 数据库 ${dbName} 已准备就绪`);
    } finally {
      await tempPool.end();
    }
  }

  // 创建数据表
  async createTables() {
    const tables = [
      // 玩家基础信息表
      `CREATE TABLE IF NOT EXISTS players (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id VARCHAR(64) UNIQUE NOT NULL,
        name VARCHAR(64) NOT NULL DEFAULT '无名修士',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_player_id (player_id),
        INDEX idx_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // 玩家角色数据表
      `CREATE TABLE IF NOT EXISTS player_data (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id VARCHAR(64) NOT NULL,
        data_key VARCHAR(64) NOT NULL,
        data_value JSON,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_player_key (player_id, data_key),
        INDEX idx_player_id (player_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // 玩家背包表
      `CREATE TABLE IF NOT EXISTS player_inventory (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id VARCHAR(64) NOT NULL,
        item_type VARCHAR(32) NOT NULL,
        item_id VARCHAR(64) NOT NULL,
        quantity INT DEFAULT 1,
        metadata JSON,
        acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_player_id (player_id),
        INDEX idx_item (item_type, item_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // 成就进度表
      `CREATE TABLE IF NOT EXISTS achievements (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id VARCHAR(64) NOT NULL,
        achievement_id VARCHAR(64) NOT NULL,
        progress INT DEFAULT 0,
        completed TINYINT DEFAULT 0,
        completed_at DATETIME,
        rewarded TINYINT DEFAULT 0,
        INDEX idx_player_id (player_id),
        UNIQUE KEY uk_player_achievement (player_id, achievement_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // 社交/好友表
      `CREATE TABLE IF NOT EXISTS friendships (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id VARCHAR(64) NOT NULL,
        friend_id VARCHAR(64) NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_interact DATETIME DEFAULT CURRENT_TIMESTAMP,
        gift_count INT DEFAULT 0,
        visit_count INT DEFAULT 0,
        like_count INT DEFAULT 0,
        INDEX idx_player_id (player_id),
        UNIQUE KEY uk_friendship (player_id, friend_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // 社交消息表
      `CREATE TABLE IF NOT EXISTS messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id VARCHAR(64) NOT NULL,
        from_id VARCHAR(64) NOT NULL,
        to_id VARCHAR(64) NOT NULL,
        content TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_read TINYINT DEFAULT 0,
        INDEX idx_player_id (player_id),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // 宗门表
      `CREATE TABLE IF NOT EXISTS sects (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sect_id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(64) NOT NULL,
        type VARCHAR(32) NOT NULL,
        leader_id VARCHAR(64) NOT NULL,
        level INT DEFAULT 1,
        members JSON DEFAULT (JSON_ARRAY()),
        buildings JSON DEFAULT (JSON_OBJECT()),
        resources JSON DEFAULT (JSON_OBJECT()),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_leader (leader_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // 玩家宗门关系表
      `CREATE TABLE IF NOT EXISTS player_sects (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id VARCHAR(64) NOT NULL,
        sect_id VARCHAR(64) NOT NULL,
        role VARCHAR(32) DEFAULT 'disciple',
        contribution INT DEFAULT 0,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_player_id (player_id),
        INDEX idx_sect_id (sect_id),
        UNIQUE KEY uk_player_sect (player_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // 市场/交易表
      `CREATE TABLE IF NOT EXISTS market_listings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        listing_id VARCHAR(64) PRIMARY KEY,
        seller_id VARCHAR(64) NOT NULL,
        item_type VARCHAR(32) NOT NULL,
        item_id VARCHAR(64) NOT NULL,
        quantity INT DEFAULT 1,
        price_per_unit INT NOT NULL,
        status VARCHAR(16) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sold_at DATETIME,
        INDEX idx_seller (seller_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // 功法表（玩家已学习）
      `CREATE TABLE IF NOT EXISTS player_gongfa (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id VARCHAR(64) NOT NULL,
        gongfa_id VARCHAR(64) NOT NULL,
        level INT DEFAULT 1,
        exp INT DEFAULT 0,
        learned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_player_gongfa (player_id, gongfa_id),
        INDEX idx_player_id (player_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // 玩家装备表
      `CREATE TABLE IF NOT EXISTS player_equipment (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id VARCHAR(64) NOT NULL,
        slot VARCHAR(16) NOT NULL,
        item_id VARCHAR(64),
        equipped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_player_slot (player_id, slot),
        INDEX idx_player_id (player_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // 游戏设置表
      `CREATE TABLE IF NOT EXISTS player_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id VARCHAR(64) NOT NULL UNIQUE,
        settings JSON,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_player_id (player_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

      // 统计数据表
      `CREATE TABLE IF NOT EXISTS player_stats (
        id INT PRIMARY KEY AUTO_INCREMENT,
        player_id VARCHAR(64) NOT NULL UNIQUE,
        total_spirit BIGINT DEFAULT 0,
        total_spirit_stones BIGINT DEFAULT 0,
        offline_earnings BIGINT DEFAULT 0,
        realm_breaks INT DEFAULT 0,
        total_offline_time BIGINT DEFAULT 0,
        total_idle_gains BIGINT DEFAULT 0,
        techniques_learned INT DEFAULT 0,
        combat_wins INT DEFAULT 0,
        monsters_killed INT DEFAULT 0,
        dungeons_cleared INT DEFAULT 0,
        total_damage BIGINT DEFAULT 0,
        highest_damage BIGINT DEFAULT 0,
        adventures_completed INT DEFAULT 0,
        chances_triggered INT DEFAULT 0,
        artifacts_forged INT DEFAULT 0,
        artifacts_recycled INT DEFAULT 0,
        heaven_treasures_used INT DEFAULT 0,
        beasts_captured INT DEFAULT 0,
        sects_created INT DEFAULT 0,
        world_boss_kills INT DEFAULT 0,
        market_sales INT DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_player_id (player_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    ];

    for (const sql of tables) {
      try {
        await this.pool.execute(sql);
      } catch (error) {
        console.error('创建表失败:', error.message);
      }
    }

    console.log('📋 数据库表结构已就绪');
  }

  // 执行查询（带重试）
  async query(sql, params = []) {
    if (!this.pool) {
      throw new Error('数据库未初始化');
    }

    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('查询失败:', error.message);
      
      // 连接断开时重试
      if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
          error.code === 'ECONNRESET' ||
          error.code === 'ER_ACCESS_DENIED_ERROR') {
        await this.retryConnect();
        if (this.connected) {
          const [rows] = await this.pool.execute(sql, params);
          return rows;
        }
      }
      throw error;
    }
  }

  // 执行插入
  async insert(sql, params = []) {
    const result = await this.query(sql, params);
    return result.insertId;
  }

  // 执行更新
  async update(sql, params = []) {
    const result = await this.query(sql, params);
    return result.affectedRows;
  }

  // 批量插入
  async batchInsert(sql, paramsArray) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const params of paramsArray) {
        await connection.execute(sql, params);
      }
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // 获取玩家数据
  async getPlayerData(playerId, dataKey) {
    const rows = await this.query(
      'SELECT data_value FROM player_data WHERE player_id = ? AND data_key = ?',
      [playerId, dataKey]
    );
    return rows.length > 0 ? rows[0].data_value : null;
  }

  // 保存玩家数据
  async savePlayerData(playerId, dataKey, dataValue) {
    await this.query(
      `INSERT INTO player_data (player_id, data_key, data_value) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE data_value = ?, updated_at = NOW()`,
      [playerId, dataKey, JSON.stringify(dataValue), JSON.stringify(dataValue)]
    );
  }

  // 获取或创建玩家记录
  async getOrCreatePlayer(playerId, name = '无名修士') {
    let rows = await this.query('SELECT * FROM players WHERE player_id = ?', [playerId]);
    if (rows.length === 0) {
      await this.query(
        'INSERT INTO players (player_id, name) VALUES (?, ?)',
        [playerId, name]
      );
      rows = await this.query('SELECT * FROM players WHERE player_id = ?', [playerId]);
      
      // 初始化玩家数据
      await this.initializePlayerData(playerId);
    }
    return rows[0];
  }

  // 初始化玩家数据
  async initializePlayerData(playerId) {
    // 初始化统计数据
    await this.query(
      `INSERT INTO player_stats (player_id) VALUES (?) ON DUPLICATE KEY UPDATE player_id = player_id`,
      [playerId]
    );
    
    // 初始化设置
    await this.query(
      `INSERT INTO player_settings (player_id, settings) VALUES (?, ?) ON DUPLICATE KEY UPDATE settings = settings`,
      [playerId, JSON.stringify({ autoSave: true, offline收益: true })]
    );
  }

  // 关闭连接池
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.connected = false;
      console.log('🔌 MySQL 连接池已关闭');
    }
  }

  // 检查连接状态
  isConnected() {
    return this.connected;
  }
}

// 导出单例
module.exports = new Database();
