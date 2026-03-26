const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

function getDb() {
  return new Database(DB_PATH);
}

// 初始化宗门任务表
function initSectMissionTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_missions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      mission_type TEXT NOT NULL,  -- 'daily' | 'weekly'
      mission_key TEXT NOT NULL,
      mission_name TEXT NOT NULL,
      target_count INTEGER NOT NULL DEFAULT 0,
      current_count INTEGER NOT NULL DEFAULT 0,
      reward_type TEXT NOT NULL,
      reward_id TEXT,
      reward_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'claimed'
      claimed_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      UNIQUE(player_id, mission_type, mission_key)
    );

    CREATE TABLE IF NOT EXISTS sect_mission_shop (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      cost INTEGER NOT NULL,
      reward_type TEXT NOT NULL,
      reward_id TEXT,
      reward_count INTEGER NOT NULL DEFAULT 1,
      stock INTEGER DEFAULT -1,
      player_limit INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS game_meta (
      k TEXT PRIMARY KEY,
      val TEXT
    );
  `);

  // 初始化商店商品（如果为空）
  const shopCount = db.prepare('SELECT COUNT(*) as c FROM sect_mission_shop').get();
  if (shopCount.c === 0) {
    const shopItems = [
      { item_key: 'ss_001', name: '修炼丹', description: '提升修炼速度', cost: 500, reward_type: 'pill', reward_id: 'cultivation_pill', reward_count: 1 },
      { item_key: 'ss_002', name: '灵力丹', description: '恢复灵力', cost: 300, reward_type: 'pill', reward_id: 'spirit_pill', reward_count: 1 },
      { item_key: 'ss_003', name: '气血散', description: '恢复气血', cost: 200, reward_type: 'pill', reward_id: 'hp_pill', reward_count: 1 },
      { item_key: 'ss_004', name: '破境石', description: '增加突破成功率', cost: 1000, reward_type: 'material', reward_id: 'breakthrough_stone', reward_count: 1 },
      { item_key: 'ss_005', name: '聚灵石', description: '增加灵石获取', cost: 800, reward_type: 'material', reward_id: 'spirit_stone_material', reward_count: 1 },
      { item_key: 'ss_006', name: '蓝色魂晶', description: '心魔幻境材料', cost: 600, reward_type: 'material', reward_id: 'blue_crystal', reward_count: 1 },
      { item_key: 'ss_007', name: '心魔精华', description: '心魔幻境高级材料', cost: 1500, reward_type: 'material', reward_id: 'heart_essence', reward_count: 1 },
      { item_key: 'ss_008', name: '基础灵宠粮', description: '灵兽养成道具', cost: 400, reward_type: 'material', reward_id: 'beast_food_basic', reward_count: 1 },
    ];
    const insert = db.prepare('INSERT OR IGNORE INTO sect_mission_shop (item_key, name, description, cost, reward_type, reward_id, reward_count) VALUES (?,?,?,?,?,?,?)');
    for (const item of shopItems) {
      insert.run(item.item_key, item.name, item.description, item.cost, item.reward_type, item.reward_id, item.reward_count);
    }
  }
}

// 确保数据库初始化
try {
  const db = getDb();
  initSectMissionTables(db);
  db.close();
} catch(e) {
  console.log('[sect-missions] init:', e.message);
}

// 宗门每日任务配置
const DAILY_MISSIONS = [
  { key: 'sect_dungeon_1', name: '挑战宗门副本×1', target: 1, reward_type: 'contribution', reward_count: 50, spirit_stones: 100 },
  { key: 'sect_dungeon_3', name: '挑战宗门副本×3', target: 3, reward_type: 'contribution', reward_count: 150, spirit_stones: 300 },
  { key: 'sect_battle_5', name: '参与宗门战×5', target: 5, reward_type: 'contribution', reward_count: 100, spirit_stones: 200 },
  { key: 'donate_1', name: '捐献资源×1', target: 1, reward_type: 'contribution', reward_count: 30, spirit_stones: 50 },
  { key: 'help_member_1', name: '帮助成员×1', target: 1, reward_type: 'contribution', reward_count: 20, spirit_stones: 30 },
  { key: 'cultivate_30min', name: '修炼满30分钟', target: 1, reward_type: 'contribution', reward_count: 80, spirit_stones: 150 },
];

// 宗门每周任务配置
const WEEKLY_MISSIONS = [
  { key: 'sect_dungeon_10', name: '挑战宗门副本×10', target: 10, reward_type: 'contribution', reward_count: 500, spirit_stones: 1000 },
  { key: 'sect_rank_top10', name: '宗门排名进入前10', target: 1, reward_type: 'contribution', reward_count: 300, spirit_stones: 600 },
  { key: 'donate_total_1000', name: '本周累计捐献1000', target: 1, reward_type: 'contribution', reward_count: 800, spirit_stones: 1500 },
  { key: 'member_help_10', name: '帮助成员×10', target: 10, reward_type: 'contribution', reward_count: 200, spirit_stones: 400 },
  { key: 'attend_sect_war', name: '参加宗门战×1', target: 1, reward_type: 'contribution', reward_count: 400, spirit_stones: 800 },
];

// 进度更新中间件
function getPlayerId(req) {
  const pid = parseInt(req.query.player_id || req.body?.player_id || req.headers['x-player-id'] || 1);
  return pid;
}

// GET /api/sect-missions/daily?player_id=X
router.get('/daily', (req, res) => {
  const playerId = getPlayerId(req);
  const db = getDb();

  try {
    // 重置每日任务（检查是否需要刷新）
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const lastReset = db.prepare("SELECT val FROM game_meta WHERE k='sect_daily_reset'").get();
    if (!lastReset || lastReset.val !== today) {
      // 重置所有每日任务为未完成
      db.prepare("UPDATE sect_missions SET current_count=0, status='active', claimed_at=null WHERE mission_type='daily'").run();
      db.prepare("INSERT OR REPLACE INTO game_meta (k,val) VALUES ('sect_daily_reset',?)").run(today);
    }

    // 获取或初始化每日任务
    const existing = db.prepare("SELECT * FROM sect_missions WHERE player_id=? AND mission_type='daily'").all(playerId);
    const existingKeys = new Set(existing.map(e => e.mission_key));

    const insertStmt = db.prepare('INSERT OR IGNORE INTO sect_missions (player_id, mission_type, mission_key, mission_name, target_count, reward_type, reward_count) VALUES (?,?,?,?,?,?,?)');
    for (const m of DAILY_MISSIONS) {
      if (!existingKeys.has(m.key)) {
        insertStmt.run(playerId, 'daily', m.key, m.name, m.target, m.reward_type, m.reward_count);
      }
    }

    const missions = db.prepare("SELECT * FROM sect_missions WHERE player_id=? AND mission_type='daily'").all(playerId);
    const result = missions.map(m => ({
      key: m.mission_key,
      name: m.mission_name,
      target: m.target_count,
      current: m.current_count,
      reward_type: m.reward_type,
      reward_count: m.reward_count,
      spirit_stones: DAILY_MISSIONS.find(d => d.key === m.mission_key)?.spirit_stones || 0,
      status: m.status
    }));

    res.json({ success: true, missions: result });
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

// GET /api/sect-missions/weekly?player_id=X
router.get('/weekly', (req, res) => {
  const playerId = getPlayerId(req);
  const db = getDb();

  try {
    // 重置每周任务（检查周初）
    const weekKey = getWeekKey();
    const lastWeek = db.prepare("SELECT val FROM game_meta WHERE k='sect_weekly_reset'").get();
    if (!lastWeek || lastWeek.val !== weekKey) {
      db.prepare("UPDATE sect_missions SET current_count=0, status='active', claimed_at=null WHERE mission_type='weekly'").run();
      db.prepare("INSERT OR REPLACE INTO game_meta (k,val) VALUES ('sect_weekly_reset',?)").run(weekKey);
    }

    const existing = db.prepare("SELECT * FROM sect_missions WHERE player_id=? AND mission_type='weekly'").all(playerId);
    const existingKeys = new Set(existing.map(e => e.mission_key));

    const insertStmt = db.prepare('INSERT OR IGNORE INTO sect_missions (player_id, mission_type, mission_key, mission_name, target_count, reward_type, reward_count) VALUES (?,?,?,?,?,?,?)');
    for (const m of WEEKLY_MISSIONS) {
      if (!existingKeys.has(m.key)) {
        insertStmt.run(playerId, 'weekly', m.key, m.name, m.target, m.reward_type, m.reward_count);
      }
    }

    const missions = db.prepare("SELECT * FROM sect_missions WHERE player_id=? AND mission_type='weekly'").all(playerId);
    const result = missions.map(m => ({
      key: m.mission_key,
      name: m.mission_name,
      target: m.target_count,
      current: m.current_count,
      reward_type: m.reward_type,
      reward_count: m.reward_count,
      spirit_stones: WEEKLY_MISSIONS.find(w => w.key === m.mission_key)?.spirit_stones || 0,
      status: m.status
    }));

    res.json({ success: true, missions: result });
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

// POST /api/sect-missions/daily/claim — 领取每日任务奖励
router.post('/daily/claim', (req, res) => {
  const playerId = getPlayerId(req);
  const { mission_key } = req.body;
  const db = getDb();

  try {
    const mission = db.prepare("SELECT * FROM sect_missions WHERE player_id=? AND mission_type='daily' AND mission_key=? AND status='active'").get(playerId, mission_key);
    if (!mission) {
      return res.json({ success: false, message: '任务不存在或已领取' });
    }
    if (mission.current_count < mission.target_count) {
      return res.json({ success: false, message: '任务未完成' });
    }

    // 发放奖励
    const player = db.prepare('SELECT * FROM player WHERE id=?').get(playerId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });

    // 贡献值奖励
    db.prepare('UPDATE player SET sect_contribution=sect_contribution+? WHERE id=?').run(mission.reward_count, playerId);
    // 灵石奖励（写入 Users.lingshi，权威数据源）
    const cfg = DAILY_MISSIONS.find(d => d.key === mission_key);
    if (cfg?.spirit_stones) {
      db.prepare('UPDATE Users SET lingshi=lingshi+? WHERE id=?').run(cfg.spirit_stones, playerId);
    }

    // 标记为已领取
    db.prepare("UPDATE sect_missions SET status='claimed', claimed_at=strftime('%s','now') WHERE player_id=? AND mission_key=? AND mission_type='daily'").run(playerId, mission_key);

    res.json({ success: true, message: '奖励已领取', rewards: { contribution: mission.reward_count, spirit_stones: cfg?.spirit_stones || 0 } });
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

// POST /api/sect-missions/shop/exchange — 宗门商店兑换
router.post('/shop/exchange', (req, res) => {
  const playerId = getPlayerId(req);
  const { item_key } = req.body;
  const db = getDb();

  try {
    const shopItem = db.prepare('SELECT * FROM sect_mission_shop WHERE item_key=?').get(item_key);
    if (!shopItem) {
      return res.json({ success: false, message: '商品不存在' });
    }

    // 检查玩家贡献值是否足够
    const player = db.prepare('SELECT sect_contribution FROM player WHERE id=?').get(playerId);
    if (!player || (player.sect_contribution || 0) < shopItem.cost) {
      return res.json({ success: false, message: `贡献值不足，需要${shopItem.cost}，当前${player?.sect_contribution || 0}` });
    }

    // 扣除贡献值
    db.prepare('UPDATE player SET sect_contribution=sect_contribution-? WHERE id=?').run(shopItem.cost, playerId);

    // 发放物品到背包
    if (shopItem.reward_type === 'pill' || shopItem.reward_type === 'material') {
      const existingItem = db.prepare('SELECT * FROM player_items WHERE player_id=? AND item_id=? AND equipped=0').get(playerId, shopItem.reward_id);
      if (existingItem) {
        db.prepare('UPDATE player_items SET quantity=quantity+? WHERE id=?').run(shopItem.reward_count, existingItem.id);
      } else {
        db.prepare('INSERT INTO player_items (player_id, item_id, quantity, equipped) VALUES (?,?,?,0)').run(playerId, shopItem.reward_id, shopItem.reward_count);
      }
    }

    res.json({ success: true, message: `兑换成功: ${shopItem.name}×${shopItem.reward_count}`, remaining_contribution: (player.sect_contribution || 0) - shopItem.cost });
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

// GET /api/sect-missions/shop — 查看商店商品
router.get('/shop', (req, res) => {
  const db = getDb();
  try {
    const items = db.prepare('SELECT item_key, name, description, cost, reward_type, reward_id, reward_count FROM sect_mission_shop').all();
    res.json({ success: true, items });
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

// POST /api/sect-missions/progress — 更新任务进度（供其他系统调用）
router.post('/progress', (req, res) => {
  const playerId = getPlayerId(req);
  const { mission_type, mission_key, delta } = req.body;
  const db = getDb();
  try {
    const result = db.prepare("UPDATE sect_missions SET current_count=current_count+? WHERE player_id=? AND mission_type=? AND mission_key=? AND status='active'").run(delta || 1, playerId, mission_type, mission_key);
    res.json({ success: result.changes > 0, message: result.changes > 0 ? '进度已更新' : '任务不存在' });
  } catch(e) {
    res.json({ success: false, message: e.message });
  } finally {
    db.close();
  }
});

function getWeekKey() {
  const now = new Date();
  const year = now.getFullYear();
  const week = getWeekNumber(now);
  return `${year}-W${week}`;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

module.exports = router;
