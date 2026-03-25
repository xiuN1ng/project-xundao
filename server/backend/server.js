const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// 初始化婚姻系统数据库表
try {
  const marriageStorage = require('../game/marriage_storage');
  if (marriageStorage.initMarriageTables) {
    marriageStorage.initMarriageTables();
  }
} catch (e) {
  console.log('婚姻系统存储层初始化:', e.message);
}

// 初始化灵兽系统数据库表
try {
  const Database = require('better-sqlite3');
  const dbPath = path.join(__dirname, 'data', 'game.db');
  const beastDb = new Database(dbPath);
  
  const beastApi = require('../game/beast_api');
  if (beastApi.initBeastDatabase) {
    beastApi.initBeastDatabase(beastDb);
    console.log('✓ 灵兽系统数据库初始化成功');
  }
  if (beastApi.initResonanceTables) {
    beastApi.initResonanceTables();
    console.log('✓ 灵兽共鸣羁绊表初始化成功');
  }
} catch (e) {
  console.log('灵兽系统初始化:', e.message);
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

// 静态文件服务
app.use(express.static(path.join(__dirname, '../src')));
app.use(express.static(path.join(__dirname, '../public')));

// 首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../src/index.html'));
});

// 中间件
app.use('/api/auth', require('./routes/auth'));
app.use('/api/payment', require('./routes/payment'));

// 游戏
app.use('/api/player', require('./routes/player'));
app.use('/api/cultivation', require('./routes/cultivation'));
app.use('/api/tribulation', require('./routes/tribulation'));
app.use('/api/sect', require('./routes/sect'));
app.use('/api/battle', require('./routes/battle'));
app.use('/api/shop', require('./routes/shop'));
app.use('/api/beast', require('../game/beast_api'));
app.use('/api/beastEquipment', require('../game/beast_equipment'));
app.use('/api/skill', require('./routes/skill'));
app.use('/api/meridian', require('./routes/meridian'));
app.use('/api/equipment', require('./routes/equipment'));
app.use('/api/forge', require('./routes/forge'));
app.use('/api/chapter', require('./routes/chapter'));
app.use('/api/pill', require('./routes/pill'));

// 运营
app.use('/api/announcement', require('./routes/announcement'));
app.use('/api/giftcode', require('./routes/giftcode'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/ticket', require('./routes/ticket'));
app.use('/api/broadcast', require('./routes/broadcast'));

// 后台
app.use('/api/admin', require('./routes/admin'));
app.use('/api/hotupdate', require('./routes/hotupdate'));

// 新功能
app.use('/api/dailyQuest', require('./routes/dailyQuest'));
app.use('/api/achievement', require('./routes/achievement'));
app.use('/api/guild', require('./routes/guild'));
app.use('/api/arena', require('./routes/arena'));
app.use('/api/worldBoss', require('./routes/worldBoss'));
app.use('/api/rank', require('./routes/rank'));

// 其他
app.use('/api/quest', require('./routes/quest'));
app.use('/api/mail', require('./routes/mail'));
app.use('/api/activity', require('./routes/activity'));
app.use('/api/lottery', require('./routes/lottery'));
app.use('/api/dungeon', require('./routes/dungeon'));
app.use('/api/bag', require('./routes/bag'));
app.use('/api/mount', require('./routes/mount'));
app.use('/api/wing', require('./routes/wing'));
app.use('/api/gem', require('./routes/gem'));
app.use('/api/fashion', require('./routes/fashion'));
app.use('/api/vip', require('./routes/vip'));
app.use('/api/friend', require('./routes/friend'));
app.use('/api/auction', require('./routes/auction'));
app.use('/api/cave', require('./routes/cave'));
app.use('/api/fishing', require('./routes/fishing'));
app.use('/api/secret', require('./routes/secret'));
app.use('/api/title', require('./routes/title'));
app.use('/api/abyssDungeon', require('./routes/abyss'));
app.use('/api/marriage', require('./routes/marriage'));
app.use('/api/master', require('./routes/master'));
app.use('/api/tower', require('./routes/tower'));
app.use('/api/heartDemon', require('./routes/heart_demon'));
app.use('/api/lingdao', require('./routes/lingdao'));
app.use('/api/welfare', require('../game/welfare_api'));

app.get('/api/health', (req, res) => res.json({status:'ok',timestamp:Date.now()}));

// 注入玩家数据引用到成就系统 (成就奖励需要更新玩家资源)
const achievementRouter = require('./routes/achievement');
const playerModule = require('./routes/player');
try { if (achievementRouter.setPlayerRef) achievementRouter.setPlayerRef(playerModule._player); } catch(e) {}

// 注入玩家数据引用到渡劫系统
const tribulationRouter = require('./routes/tribulation');
try { if (tribulationRouter.setPlayerRef) tribulationRouter.setPlayerRef(playerModule._player); } catch(e) {}

// 配置渡劫系统（解决 #185）
const tribulationSystem = require('../game/tribulation_system');
const DIFFICULTY_CONFIG = {
  easy:      { name: '简单',     successBonus: 0.15, spiritCost: 1000 },
  normal:    { name: '普通',     successBonus: 0,    spiritCost: 5000 },
  hard:      { name: '困难',     successBonus: -0.1, spiritCost: 20000 },
  nightmare: { name: '噩梦',     successBonus: -0.2, spiritCost: 50000 }
};
const PROTECTION_ITEMS = {
  tiandiyu:    { id: 'tiandiyu',    name: '天地低昂符',   description: '失败时免除惩罚',      price: 1000 },
  lingbao:     { id: 'lingbao',     name: '灵宝护体符',   description: '成功率+15%',          price: 2000 },
  jiuzhuan:    { id: 'jiuzhuan',    name: '九转还魂丹',   description: '失败后保留50%灵气',    price: 3000 },
  tianlu:      { id: 'tianlu',      name: '天禄补天符',   description: '成功率+25%',          price: 5000 }
};
try {
  tribulationRouter.configure({
    TRIBULATION_TYPES: tribulationSystem.TRIBULATION_TYPES,
    DIFFICULTY_CONFIG,
    PROTECTION_ITEMS,
    REALMS: tribulationSystem.REALM_DATA,
    db: null  // db 由 tribulationStorage 自己管理
  });
} catch(e) {
  console.log('[tribulation configure]', e.message);
}

app.listen(PORT, () => console.log(`🚀 游戏服务运行在 http://localhost:${PORT}`));
