/**
 * 无尽塔数据存储模块
 */

const DB = require('./database');

// 内存缓存
const towerCache = new Map();
const leaderboardCache = { data: [], lastUpdate: 0 };

class TowerStorage {
  constructor() {
    this.db = DB;
    this.CACHE_EXPIRE = 60000; // 1分钟缓存
  }

  // 获取玩家塔数据
  getPlayerTowerData(playerId) {
    if (towerCache.has(playerId)) {
      return towerCache.get(playerId);
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM tower_progress WHERE player_id = ?
      `);
      const row = stmt.get(playerId);

      if (row) {
        const data = {
          playerId: row.player_id,
          currentFloor: row.current_floor || 1,
          highestFloor: row.highest_floor || 0,
          totalWins: row.total_wins || 0,
          totalBattles: row.total_battles || 0,
          firstClearFloors: row.first_clear_floors ? JSON.parse(row.first_clear_floors) : [],
          claimedRewards: row.claimed_rewards ? JSON.parse(row.claimed_rewards) : [],
          todayChallenges: row.today_challenges || 0,
          lastChallengeDate: row.last_challenge_date || null,
          lastUpdate: row.last_update
        };
        towerCache.set(playerId, data);
        return data;
      }
    } catch (error) {
      console.error('获取塔数据错误:', error);
    }

    // 返回默认数据
    const defaultData = {
      playerId,
      currentFloor: 1,
      highestFloor: 0,
      totalWins: 0,
      totalBattles: 0,
      firstClearFloors: [],
      claimedRewards: [],
      todayChallenges: 0,
      lastChallengeDate: null
    };
    towerCache.set(playerId, defaultData);
    return defaultData;
  }

  // 保存玩家塔数据
  savePlayerTowerData(playerId, data) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO tower_progress 
        (player_id, current_floor, highest_floor, total_wins, total_battles, 
         first_clear_floors, claimed_rewards, today_challenges, last_challenge_date, last_update)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        playerId,
        data.currentFloor || 1,
        data.highestFloor || 0,
        data.totalWins || 0,
        data.totalBattles || 0,
        JSON.stringify(data.firstClearFloors || []),
        JSON.stringify(data.claimedRewards || []),
        data.todayChallenges || 0,
        data.lastChallengeDate || null,
        Date.now()
      );

      towerCache.set(playerId, data);
    } catch (error) {
      console.error('保存塔数据错误:', error);
    }
  }

  // 更新排行榜
  updateLeaderboard(playerId, data) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO tower_leaderboard 
        (player_id, player_name, highest_floor, timestamp)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(playerId, data.name, data.floor, data.timestamp);

      // 清除排行榜缓存
      leaderboardCache.lastUpdate = 0;
    } catch (error) {
      console.error('更新排行榜错误:', error);
    }
  }

  // 获取排行榜
  getLeaderboard(limit = 10) {
    const now = Date.now();

    // 检查缓存
    if (leaderboardCache.data.length > 0 && 
        (now - leaderboardCache.lastUpdate) < this.CACHE_EXPIRE) {
      return leaderboardCache.data.slice(0, limit);
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM tower_leaderboard 
        ORDER BY highest_floor DESC, timestamp ASC
        LIMIT ?
      `);

      const rows = stmt.all(limit);

      leaderboardCache.data = rows.map(row => ({
        rank: 0,
        playerId: row.player_id,
        name: row.player_name,
        floor: row.highest_floor,
        timestamp: row.timestamp
      }));

      // 添加排名
      leaderboardCache.data.forEach((item, index) => {
        item.rank = index + 1;
      });

      leaderboardCache.lastUpdate = now;

      return leaderboardCache.data;
    } catch (error) {
      console.error('获取排行榜错误:', error);
      return [];
    }
  }

  // 清除玩家缓存
  clearCache(playerId) {
    if (playerId) {
      towerCache.delete(playerId);
    } else {
      towerCache.clear();
    }
    leaderboardCache.lastUpdate = 0;
  }

  // 初始化数据库表
  initDatabase() {
    try {
      // 创建塔进度表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS tower_progress (
          player_id TEXT PRIMARY KEY,
          current_floor INTEGER DEFAULT 1,
          highest_floor INTEGER DEFAULT 0,
          total_wins INTEGER DEFAULT 0,
          total_battles INTEGER DEFAULT 0,
          first_clear_floors TEXT DEFAULT '[]',
          claimed_rewards TEXT DEFAULT '[]',
          today_challenges INTEGER DEFAULT 0,
          last_challenge_date TEXT,
          last_update INTEGER
        )
      `);

      // 创建排行榜表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS tower_leaderboard (
          player_id TEXT PRIMARY KEY,
          player_name TEXT,
          highest_floor INTEGER DEFAULT 0,
          timestamp INTEGER
        )
      `);

      console.log('无尽塔数据库表初始化完成');
    } catch (error) {
      console.error('初始化无尽塔数据库表错误:', error);
    }
  }
}

// 单例
const towerStorage = new TowerStorage();

module.exports = { towerStorage };
