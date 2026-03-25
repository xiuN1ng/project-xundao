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
app.use('/api/beast', require('./routes/beast'));
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

app.listen(PORT, () => console.log(`🚀 游戏服务运行在 http://localhost:${PORT}`));
