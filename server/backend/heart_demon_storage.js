/**
 * 心魔幻境数据存储模块
 * 使用 Sequelize + SQLite 持久化存储
 */

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../data/heart_demon.db'),
  logging: false
});

// =====================
// 数据模型
// =====================

// 玩家心魔幻境进度
const HeartDemonPlayer = sequelize.define('HeartDemonPlayer', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, unique: true, allowNull: false },
  currentFloor: { type: DataTypes.INTEGER, defaultValue: 1 },
  maxFloor: { type: DataTypes.INTEGER, defaultValue: 1 },
  todayEnterCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  todaySweepCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalKillCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalSoulCrystals: { type: DataTypes.BIGINT, defaultValue: 0 },
  soulCrystals: { type: DataTypes.BIGINT, defaultValue: 0 },
  // 魂晶是心魔幻境专用货币
  // 心魔精华存储为 JSON: {"heart_essence": 5, "demon_pearl": 3}
  materials: { type: DataTypes.TEXT, defaultValue: '{}' },
  // 每周数据（周重置）
  weeklyKillCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  weeklySoulCrystals: { type: DataTypes.BIGINT, defaultValue: 0 },
  weeklyResetAt: { type: DataTypes.BIGINT, defaultValue: 0 },
  weeklyRewardClaimed: { type: DataTypes.BOOLEAN, defaultValue: false },
  // 每日重置时间戳
  dailyResetAt: { type: DataTypes.BIGINT, defaultValue: 0 },
  // 已扫荡层记录: [1,2,3]
  sweptFloorsToday: { type: DataTypes.TEXT, defaultValue: '[]' },
  // 每层首次通关时间戳
  firstClearTimes: { type: DataTypes.TEXT, defaultValue: '{}' },
  // 心魔值（影响战斗难度）
  heartDemonEnergy: { type: DataTypes.INTEGER, defaultValue: 0 },
  lastUpdate: { type: DataTypes.BIGINT, defaultValue: 0 }
});

// 每层扫荡记录
const HeartDemonSweepLog = sequelize.define('HeartDemonSweepLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  floor: { type: DataTypes.INTEGER, allowNull: false },
  soulCrystals: { type: DataTypes.BIGINT, defaultValue: 0 },
  exp: { type: DataTypes.INTEGER, defaultValue: 0 },
  sweptAt: { type: DataTypes.BIGINT, defaultValue: 0 }
});

// 初始化数据库
async function initDatabase() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false });
    console.log('✓ HeartDemon 数据库初始化成功');
  } catch (error) {
    console.error('✗ HeartDemon 数据库初始化失败:', error.message);
  }
}

// =====================
// 存储类
// =====================

class HeartDemonStorage {
  constructor() {
    this.WeekMs = 7 * 24 * 60 * 60 * 1000;
    this.DayMs = 24 * 60 * 60 * 1000;
  }

  async getOrCreatePlayer(userId) {
    await initDatabase();
    let player = await HeartDemonPlayer.findOne({ where: { userId } });
    if (!player) {
      player = await HeartDemonPlayer.create({
        userId,
        currentFloor: 1,
        maxFloor: 1,
        todayEnterCount: 0,
        todaySweepCount: 0,
        totalKillCount: 0,
        totalSoulCrystals: 0,
        soulCrystals: 0,
        materials: '{}',
        weeklyKillCount: 0,
        weeklySoulCrystals: 0,
        weeklyResetAt: Date.now(),
        weeklyRewardClaimed: false,
        dailyResetAt: Date.now(),
        sweptFloorsToday: '[]',
        firstClearTimes: '{}',
        heartDemonEnergy: 0,
        lastUpdate: Date.now()
      });
    }

    const now = Date.now();
    // 每周重置
    if (now - player.weeklyResetAt > this.WeekMs) {
      await player.update({
        weeklyKillCount: 0,
        weeklySoulCrystals: 0,
        weeklyResetAt: now,
        weeklyRewardClaimed: false
      });
    }
    // 每日重置
    if (now - player.dailyResetAt > this.DayMs) {
      await player.update({
        todayEnterCount: 0,
        todaySweepCount: 0,
        sweptFloorsToday: '[]',
        dailyResetAt: now
      });
    }

    return this._parsePlayer(player);
  }

  async savePlayer(userId, data) {
    await initDatabase();
    await HeartDemonPlayer.update({
      currentFloor: data.currentFloor,
      maxFloor: data.maxFloor,
      todayEnterCount: data.todayEnterCount,
      todaySweepCount: data.todaySweepCount || 0,
      totalKillCount: data.totalKillCount,
      totalSoulCrystals: data.totalSoulCrystals,
      soulCrystals: data.soulCrystals,
      materials: JSON.stringify(data.materials || {}),
      weeklyKillCount: data.weeklyKillCount,
      weeklySoulCrystals: data.weeklySoulCrystals,
      weeklyRewardClaimed: data.weeklyRewardClaimed || false,
      sweptFloorsToday: JSON.stringify(data.sweptFloorsToday || []),
      firstClearTimes: JSON.stringify(data.firstClearTimes || {}),
      heartDemonEnergy: data.heartDemonEnergy || 0,
      lastUpdate: Date.now()
    }, { where: { userId } });
  }

  async addSoulCrystals(userId, amount) {
    await initDatabase();
    const player = await HeartDemonPlayer.findOne({ where: { userId } });
    if (player) {
      const newTotal = BigInt(player.soulCrystals) + BigInt(amount);
      const newTotalAll = BigInt(player.totalSoulCrystals) + BigInt(amount);
      const newWeekly = BigInt(player.weeklySoulCrystals) + BigInt(amount);
      await player.update({
        soulCrystals: newTotal.toString(),
        totalSoulCrystals: newTotalAll.toString(),
        weeklySoulCrystals: newWeekly.toString(),
        lastUpdate: Date.now()
      });
      return { soulCrystals: newTotal, totalSoulCrystals: newTotalAll, weeklySoulCrystals: newWeekly };
    }
    return null;
  }

  async spendSoulCrystals(userId, amount) {
    await initDatabase();
    const player = await HeartDemonPlayer.findOne({ where: { userId } });
    if (player && BigInt(player.soulCrystals) >= BigInt(amount)) {
      const newCrystals = BigInt(player.soulCrystals) - BigInt(amount);
      await player.update({
        soulCrystals: newCrystals.toString(),
        lastUpdate: Date.now()
      });
      return { soulCrystals: newCrystals };
    }
    return null;
  }

  async unlockFloor(userId, floor) {
    await initDatabase();
    const player = await HeartDemonPlayer.findOne({ where: { userId } });
    if (player && floor > player.maxFloor) {
      const firstClearTimes = JSON.parse(player.firstClearTimes || '{}');
      if (!firstClearTimes[floor]) {
        firstClearTimes[floor] = Date.now();
      }
      await player.update({
        maxFloor: floor,
        firstClearTimes: JSON.stringify(firstClearTimes),
        lastUpdate: Date.now()
      });
      return true;
    }
    return false;
  }

  async recordSweep(userId, floor, soulCrystals, exp) {
    await initDatabase();
    await HeartDemonSweepLog.create({
      userId,
      floor,
      soulCrystals,
      exp,
      sweptAt: Date.now()
    });
    const player = await HeartDemonPlayer.findOne({ where: { userId } });
    if (player) {
      const sweptFloors = JSON.parse(player.sweptFloorsToday || '[]');
      if (!sweptFloors.includes(floor)) {
        sweptFloors.push(floor);
      }
      await player.update({
        todaySweepCount: (player.todaySweepCount || 0) + 1,
        sweptFloorsToday: JSON.stringify(sweptFloors),
        lastUpdate: Date.now()
      });
    }
  }

  async addMaterial(userId, materialId, count) {
    await initDatabase();
    const player = await HeartDemonPlayer.findOne({ where: { userId } });
    if (player) {
      const materials = JSON.parse(player.materials || '{}');
      materials[materialId] = (materials[materialId] || 0) + count;
      await player.update({
        materials: JSON.stringify(materials),
        lastUpdate: Date.now()
      });
      return materials;
    }
    return null;
  }

  async getSweepLogs(userId, limit = 20) {
    await initDatabase();
    const logs = await HeartDemonSweepLog.findAll({
      where: { userId },
      order: [['id', 'DESC']],
      limit
    });
    return logs.map(l => ({
      floor: l.floor,
      soulCrystals: Number(l.soulCrystals),
      exp: l.exp,
      sweptAt: l.sweptAt
    }));
  }

  _parsePlayer(player) {
    return {
      userId: player.userId,
      currentFloor: player.currentFloor,
      maxFloor: player.maxFloor,
      todayEnterCount: player.todayEnterCount,
      todaySweepCount: player.todaySweepCount || 0,
      totalKillCount: player.totalKillCount,
      totalSoulCrystals: Number(player.totalSoulCrystals),
      soulCrystals: Number(player.soulCrystals),
      materials: JSON.parse(player.materials || '{}'),
      weeklyKillCount: player.weeklyKillCount,
      weeklySoulCrystals: Number(player.weeklySoulCrystals),
      weeklyRewardClaimed: !!player.weeklyRewardClaimed,
      sweptFloorsToday: JSON.parse(player.sweptFloorsToday || '[]'),
      firstClearTimes: JSON.parse(player.firstClearTimes || '{}'),
      heartDemonEnergy: player.heartDemonEnergy || 0,
      lastUpdate: player.lastUpdate
    };
  }
}

module.exports = { HeartDemonStorage, initDatabase };
