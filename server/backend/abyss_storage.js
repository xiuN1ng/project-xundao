/**
 * 封魔渊数据存储模块
 * 使用 Sequelize + SQLite 持久化存储
 */

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../data/abyss.db'),
  logging: false
});

// =====================
// 数据模型
// =====================

// 玩家封魔渊进度
const AbyssPlayer = sequelize.define('AbyssPlayer', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, unique: true, allowNull: false },
  currentFloor: { type: DataTypes.INTEGER, defaultValue: 1 },
  maxFloor: { type: DataTypes.INTEGER, defaultValue: 1 },
  todayEnterCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  todaySweepCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalKillCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalCrystals: { type: DataTypes.BIGINT, defaultValue: 0 },
  crystals: { type: DataTypes.BIGINT, defaultValue: 0 },
  // 魔器存储为 JSON 字符串: ["shadow_claw", "demon_sword"]
  artifacts: { type: DataTypes.TEXT, defaultValue: '[]' },
  // 材料存储为 JSON: {"demon_horn": 5, "soul_flame": 3}
  materials: { type: DataTypes.TEXT, defaultValue: '{}' },
  // 每周数据
  weeklyKillCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  weeklyCrystals: { type: DataTypes.BIGINT, defaultValue: 0 },
  weeklyResetAt: { type: DataTypes.BIGINT, defaultValue: 0 },
  weeklyRewardClaimed: { type: DataTypes.BOOLEAN, defaultValue: false },
  // 每日重置时间戳
  dailyResetAt: { type: DataTypes.BIGINT, defaultValue: 0 },
  // 已扫荡层记录: [1,2,3] 表示 1-3 层今日已扫荡
  sweptFloorsToday: { type: DataTypes.TEXT, defaultValue: '[]' },
  // 每层首次通关时间戳
  firstClearTimes: { type: DataTypes.TEXT, defaultValue: '{}' },
  lastUpdate: { type: DataTypes.BIGINT, defaultValue: 0 }
});

// 每层扫荡记录（精确记录每次扫荡时间）
const AbyssSweepLog = sequelize.define('AbyssSweepLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  floor: { type: DataTypes.INTEGER, allowNull: false },
  crystals: { type: DataTypes.BIGINT, defaultValue: 0 },
  exp: { type: DataTypes.INTEGER, defaultValue: 0 },
  sweptAt: { type: DataTypes.BIGINT, defaultValue: 0 }
});

// 初始化数据库
async function initDatabase() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: false });
    console.log('✓ Abyss 数据库初始化成功');
  } catch (error) {
    console.error('✗ Abyss 数据库初始化失败:', error.message);
  }
}

// =====================
// 存储类
// =====================

class AbyssStorage {
  constructor() {
    this.WeekMs = 7 * 24 * 60 * 60 * 1000;
    this.DayMs = 24 * 60 * 60 * 1000;
  }

  // 获取或创建玩家数据
  async getOrCreatePlayer(userId) {
    await initDatabase();
    let player = await AbyssPlayer.findOne({ where: { userId } });
    if (!player) {
      player = await AbyssPlayer.create({
        userId,
        currentFloor: 1,
        maxFloor: 1,
        todayEnterCount: 0,
        todaySweepCount: 0,
        totalKillCount: 0,
        totalCrystals: 0,
        crystals: 0,
        artifacts: '[]',
        materials: '{}',
        weeklyKillCount: 0,
        weeklyCrystals: 0,
        weeklyResetAt: Date.now(),
        weeklyRewardClaimed: false,
        dailyResetAt: Date.now(),
        sweptFloorsToday: '[]',
        firstClearTimes: '{}',
        lastUpdate: Date.now()
      });
    }

    // 检查每周重置
    const now = Date.now();
    if (now - player.weeklyResetAt > this.WeekMs) {
      await player.update({
        weeklyKillCount: 0,
        weeklyCrystals: 0,
        weeklyResetAt: now,
        weeklyRewardClaimed: false
      });
    }

    // 检查每日重置
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

  // 保存玩家数据
  async savePlayer(userId, data) {
    await initDatabase();
    const updateData = {
      currentFloor: data.currentFloor,
      maxFloor: data.maxFloor,
      todayEnterCount: data.todayEnterCount,
      todaySweepCount: data.todaySweepCount || 0,
      totalKillCount: data.totalKillCount,
      totalCrystals: data.totalCrystals,
      crystals: data.crystals,
      artifacts: JSON.stringify(data.artifacts || []),
      materials: JSON.stringify(data.materials || {}),
      weeklyKillCount: data.weeklyKillCount,
      weeklyCrystals: data.weeklyCrystals,
      weeklyRewardClaimed: data.weeklyRewardClaimed || false,
      sweptFloorsToday: JSON.stringify(data.sweptFloorsToday || []),
      firstClearTimes: JSON.stringify(data.firstClearTimes || {}),
      lastUpdate: Date.now()
    };
    await AbyssPlayer.update(updateData, { where: { userId } });
  }

  // 增加魔晶
  async addCrystals(userId, amount) {
    await initDatabase();
    const player = await AbyssPlayer.findOne({ where: { userId } });
    if (player) {
      const newTotal = BigInt(player.crystals) + BigInt(amount);
      const newTotalAll = BigInt(player.totalCrystals) + BigInt(amount);
      const newWeekly = BigInt(player.weeklyCrystals) + BigInt(amount);
      await player.update({
        crystals: newTotal.toString(),
        totalCrystals: newTotalAll.toString(),
        weeklyCrystals: newWeekly.toString(),
        lastUpdate: Date.now()
      });
      return { crystals: newTotal, totalCrystals: newTotalAll, weeklyCrystals: newWeekly };
    }
    return null;
  }

  // 消耗魔晶
  async spendCrystals(userId, amount) {
    await initDatabase();
    const player = await AbyssPlayer.findOne({ where: { userId } });
    if (player && BigInt(player.crystals) >= BigInt(amount)) {
      const newCrystals = BigInt(player.crystals) - BigInt(amount);
      await player.update({
        crystals: newCrystals.toString(),
        lastUpdate: Date.now()
      });
      return { crystals: newCrystals };
    }
    return null;
  }

  // 解锁新层
  async unlockFloor(userId, floor) {
    await initDatabase();
    const player = await AbyssPlayer.findOne({ where: { userId } });
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

  // 记录扫荡
  async recordSweep(userId, floor, crystals, exp) {
    await initDatabase();
    await AbyssSweepLog.create({
      userId,
      floor,
      crystals,
      exp,
      sweptAt: Date.now()
    });
    const player = await AbyssPlayer.findOne({ where: { userId } });
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

  // 获取玩家扫荡记录
  async getSweepLogs(userId, limit = 20) {
    await initDatabase();
    const logs = await AbyssSweepLog.findAll({
      where: { userId },
      order: [['id', 'DESC']],
      limit
    });
    return logs.map(l => ({
      floor: l.floor,
      crystals: Number(l.crystals),
      exp: l.exp,
      sweptAt: l.sweptAt
    }));
  }

  // 辅助方法：解析玩家数据
  _parsePlayer(player) {
    return {
      userId: player.userId,
      currentFloor: player.currentFloor,
      maxFloor: player.maxFloor,
      todayEnterCount: player.todayEnterCount,
      todaySweepCount: player.todaySweepCount || 0,
      totalKillCount: player.totalKillCount,
      totalCrystals: Number(player.totalCrystals),
      crystals: Number(player.crystals),
      artifacts: JSON.parse(player.artifacts || '[]'),
      materials: JSON.parse(player.materials || '{}'),
      weeklyKillCount: player.weeklyKillCount,
      weeklyCrystals: Number(player.weeklyCrystals),
      weeklyRewardClaimed: !!player.weeklyRewardClaimed,
      sweptFloorsToday: JSON.parse(player.sweptFloorsToday || '[]'),
      firstClearTimes: JSON.parse(player.firstClearTimes || '{}'),
      lastUpdate: player.lastUpdate
    };
  }
}

module.exports = { AbyssStorage, initDatabase };
