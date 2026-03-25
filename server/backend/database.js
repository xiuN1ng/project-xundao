/**
 * 数据库管理 - 使用SQLite（开发阶段）
 * 生产环境可切换到MySQL
 */

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// 使用SQLite进行开发
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'data/game.db'),
  logging: false
});

// 数据模型定义

// 用户模型
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  nickname: { type: DataTypes.STRING, defaultValue: '修仙者' },
  level: { type: DataTypes.INTEGER, defaultValue: 1 },
  realm: { type: DataTypes.INTEGER, defaultValue: 1 },
  lingshi: { type: DataTypes.BIGINT, defaultValue: 1000 },
  diamonds: { type: DataTypes.INTEGER, defaultValue: 0 },
  hp: { type: DataTypes.INTEGER, defaultValue: 1000 },
  attack: { type: DataTypes.INTEGER, defaultValue: 100 },
  defense: { type: DataTypes.INTEGER, defaultValue: 50 },
  speed: { type: DataTypes.INTEGER, defaultValue: 10 },
  sectId: { type: DataTypes.INTEGER, defaultValue: null },
  vipLevel: { type: DataTypes.INTEGER, defaultValue: 0 },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// 玩家修炼数据
const Cultivation = sequelize.define('Cultivation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, unique: true },
  value: { type: DataTypes.BIGINT, defaultValue: 0 },
  realm: { type: DataTypes.INTEGER, defaultValue: 1 },
  cultivationPower: { type: DataTypes.INTEGER, defaultValue: 0 } // 修炼效率
});

// 宗门模型
const Sect = sequelize.define('Sect', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  leaderId: { type: DataTypes.INTEGER },
  level: { type: DataTypes.INTEGER, defaultValue: 1 },
  members: { type: DataTypes.INTEGER, defaultValue: 1 },
  contribution: { type: DataTypes.BIGINT, defaultValue: 0 },
  rank: { type: DataTypes.INTEGER, defaultValue: 999 }
});

// 灵兽模型
const Beast = sequelize.define('Beast', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER },
  name: { type: DataTypes.STRING },
  icon: { type: DataTypes.STRING },
  level: { type: DataTypes.INTEGER, defaultValue: 1 },
  quality: { type: DataTypes.STRING, defaultValue: 'common' }, // common/uncommon/rare/epic/legendary
  attack: { type: DataTypes.INTEGER, defaultValue: 0 },
  hp: { type: DataTypes.INTEGER, defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// 装备模型
const Equipment = sequelize.define('Equipment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER },
  name: { type: DataTypes.STRING },
  type: { type: DataTypes.STRING }, // weapon/armor/helmet/shoes
  quality: { type: DataTypes.STRING, defaultValue: 'normal' },
  level: { type: DataTypes.INTEGER, defaultValue: 0 },
  attack: { type: DataTypes.INTEGER, defaultValue: 0 },
  defense: { type: DataTypes.INTEGER, defaultValue: 0 },
  enhanceLevel: { type: DataTypes.INTEGER, defaultValue: 0 }
});

// 背包物品
const Item = sequelize.define('Item', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER },
  itemType: { type: DataTypes.STRING }, // weapon/armor/potion/material
  name: { type: DataTypes.STRING },
  icon: { type: DataTypes.STRING },
  count: { type: DataTypes.INTEGER, defaultValue: 1 }
});

// 功法
const Skill = sequelize.define('Skill', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER },
  name: { type: DataTypes.STRING },
  type: { type: DataTypes.STRING }, // passive/active
  effect: { type: DataTypes.TEXT }, // JSON效果描述
  level: { type: DataTypes.INTEGER, defaultValue: 1 }
});

// 充值订单
const Order = sequelize.define('Order', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  orderId: { type: DataTypes.STRING, unique: true },
  userId: { type: DataTypes.INTEGER },
  amount: { type: DataTypes.DECIMAL(10, 2) },
  diamonds: { type: DataTypes.INTEGER },
  status: { type: DataTypes.STRING, defaultValue: 'pending' }, // pending/paid/cancelled
  paidAt: { type: DataTypes.DATE }
});

// 初始化数据库
async function initDatabase() {
  try {
    await sequelize.sync({ alter: true });
    
    // 创建 game_meta 表（key-value 存储，用于系统全局配置/重置时间等）
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS game_meta (
        k TEXT PRIMARY KEY,
        val TEXT
      )
    `);
    console.log('✅ game_meta 表初始化完成');
    
    // 创建测试用户
    const testUser = await User.findOne({ where: { username: 'test' } });
    if (!testUser) {
      await User.create({
        username: 'test',
        password: 'test123',
        nickname: '修仙者',
        lingshi: 125680,
        diamonds: 520
      });
      console.log('✅ 测试用户已创建');
    }
    
    return true;
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    return false;
  }
}

module.exports = {
  sequelize,
  User,
  Cultivation,
  Sect,
  Beast,
  Equipment,
  Item,
  Skill,
  Order,
  initDatabase
};
