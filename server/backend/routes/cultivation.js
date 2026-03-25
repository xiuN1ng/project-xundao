const express = require('express');
const path = require('path');
const router = express.Router();

const Logger = {
  info: (...args) => console.log('[cultivation]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[cultivation:error]', new Date().toISOString(), ...args)
};

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  Logger.info('数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  db = {
    _data: {},
    prepare() { return this; },
    get() { return null; },
    all() { return []; },
    run() { return { changes: 0 }; }
  };
}

// 境界配置
const realmConfig = {
  1: { name: '练气', cost: 1000,  icon: '🧘', realm_level: 1 },
  2: { name: '筑基', cost: 10000, icon: '🔮', realm_level: 2 },
  3: { name: '金丹', cost: 100000, icon: '🌟', realm_level: 3 },
  4: { name: '元婴', cost: 1000000, icon: '👼', realm_level: 4 },
  5: { name: '化神', cost: 10000000, icon: '✨', realm_level: 5 },
  6: { name: '炼虚', cost: 50000000, icon: '💫', realm_level: 6 },
  7: { name: '大乘', cost: 200000000, icon: '🔥', realm_level: 7 },
  8: { name: '飞升', cost: 1000000000, icon: '🌈', realm_level: 8 },
};

// 辅助：获取或初始化玩家修炼数据
function getOrCreateCultivation(userId) {
  let cult = db.prepare('SELECT * FROM cultivation WHERE user_id = ?').get(userId);
  if (!cult) {
    db.prepare('INSERT INTO cultivation (user_id, value, realm, cultivation_power) VALUES (?, 0, 1, 0)').run(userId);
    cult = db.prepare('SELECT * FROM cultivation WHERE user_id = ?').get(userId);
  }
  return cult;
}

// 获取修炼状态
router.get('/', (req, res) => {
  const userId = parseInt(req.query.userId) || 1;
  try {
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(userId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });

    const cult = getOrCreateCultivation(userId);
    const config = realmConfig[cult.realm] || realmConfig[1];
    const progress = Math.min(Math.floor((parseInt(cult.value) / config.cost) * 100), 100);

    res.json({
      success: true,
      userId,
      cultivation: {
        value: parseInt(cult.value),
        realm: cult.realm,
        realmName: config.name,
        realmIcon: config.icon,
        realmLevel: config.realm_level,
        progress,
        cost: config.cost,
        cultivationPower: cult.cultivation_power || 0
      },
      player: {
        level: player.level,
        realm: player.realm,
        lingshi: player.lingshi
      }
    });
  } catch (err) {
    Logger.error('GET / cultivation error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// 获取修炼状态 (兼容 /status 路径)
router.get('/status', (req, res) => {
  const userId = parseInt(req.query.userId) || 1;
  try {
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(userId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });

    const cult = getOrCreateCultivation(userId);
    const config = realmConfig[cult.realm] || realmConfig[1];
    const progress = Math.min(Math.floor((parseInt(cult.value) / config.cost) * 100), 100);

    res.json({
      success: true,
      userId,
      cultivation: {
        value: parseInt(cult.value),
        realm: cult.realm,
        realmName: config.name,
        realmIcon: config.icon,
        realmLevel: config.realm_level,
        progress,
        cost: config.cost,
        cultivationPower: cult.cultivation_power || 0
      },
      player: {
        level: player.level,
        realm: player.realm,
        lingshi: player.lingshi
      }
    });
  } catch (err) {
    Logger.error('GET /status cultivation error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// 开始修炼
router.post('/start', (req, res) => {
  const userId = parseInt(req.body.userId) || 1;
  const cult = getOrCreateCultivation(userId);
  const config = realmConfig[cult.realm] || realmConfig[1];

  try {
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(userId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });

    // 每次修炼消耗 50 灵石
    const LINGSHI_COST = 50;
    if (parseInt(player.lingshi) < LINGSHI_COST) {
      return res.json({ success: false, message: '灵石不足' });
    }

    // 修炼获得灵气值（基础 + 效率加成）
    const baseGain = Math.floor(Math.random() * 100) + 50;
    const powerBonus = cult.cultivation_power ? Math.floor(baseGain * cult.cultivation_power / 100) : 0;
    const gain = baseGain + powerBonus;

    const newValue = Math.min(parseInt(cult.value) + gain, config.cost);
    const newProgress = Math.min(Math.floor((newValue / config.cost) * 100), 100);

    // 扣除灵石
    db.prepare('UPDATE player SET lingshi = lingshi - ? WHERE id = ?').run(LINGSHI_COST, userId);
    // 同步修炼值
    db.prepare('UPDATE cultivation SET value = ? WHERE user_id = ?').run(newValue, userId);
    // 增加玩家经验（1次修炼 = 10 exp）
    const expGain = 10;
    db.prepare('UPDATE player SET exp = exp + ? WHERE id = ?').run(expGain, userId);

    res.json({
      success: true,
      gain,
      lingshiCost: LINGSHI_COST,
      newValue,
      progress: newProgress,
      expGain,
      maxed: newValue >= config.cost
    });
  } catch (err) {
    Logger.error('POST /start error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// 突破境界
router.post('/breakthrough', (req, res) => {
  const userId = parseInt(req.body.userId) || 1;
  const cult = getOrCreateCultivation(userId);
  const config = realmConfig[cult.realm] || realmConfig[1];

  try {
    if (parseInt(cult.value) < config.cost) {
      return res.json({ success: false, message: '灵气不足，无法突破' });
    }

    const nextRealm = cult.realm + 1;
    if (!realmConfig[nextRealm]) {
      return res.json({ success: false, message: '已达最高境界' });
    }

    const nextConfig = realmConfig[nextRealm];

    // 重置修炼值，境界+1
    db.prepare('UPDATE cultivation SET value = 0, realm = ? WHERE user_id = ?').run(nextRealm, userId);
    // 同步更新 player 表的 realm 和 level
    db.prepare('UPDATE player SET realm = ?, level = level + 1 WHERE id = ?').run(nextRealm, userId);

    res.json({
      success: true,
      newRealm: nextRealm,
      realmName: nextConfig.name,
      realmIcon: nextConfig.icon,
      realmLevel: nextConfig.realm_level,
      message: `突破成功！进入${nextConfig.name}境界！`
    });
  } catch (err) {
    Logger.error('POST /breakthrough error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// 设置修炼效率
router.post('/setPower', (req, res) => {
  const userId = parseInt(req.body.userId) || 1;
  const { cultivationPower } = req.body;

  try {
    getOrCreateCultivation(userId);
    db.prepare('UPDATE cultivation SET cultivation_power = ? WHERE user_id = ?').run(cultivationPower || 0, userId);
    res.json({ success: true, cultivationPower });
  } catch (err) {
    Logger.error('POST /setPower error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
