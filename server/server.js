/**
 * 功法系统 API 服务器
 * 使用 Express + SQLite
 */

// 简单日志系统
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const Logger = {
  debug: (...args) => LOG_LEVEL === 'debug' && console.log('[DEBUG]', ...args),
  info: (...args) => (LOG_LEVEL === 'debug' || LOG_LEVEL === 'info') && console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args)
};

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// bcrypt密码加密
let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (e) {
  Logger.warn('bcrypt模块加载失败，使用crypto替代');
  bcrypt = {
    genSalt: () => 'salt',
    hash: (pwd, salt) => crypto.pbkdf2Sync(pwd, salt, 1000, 64, 'sha512').toString('hex'),
    compare: (pwd, hash) => {
      const salt = 'salt';
      return crypto.pbkdf2Sync(pwd, salt, 1000, 64, 'sha512').toString('hex') === hash;
    }
  };
}

// 境界压制系统
let realmSuppression;
try {
  realmSuppression = require('./game/realm_suppression');
} catch (e) {
  Logger.warn('境界压制模块加载失败:', e.message);
  realmSuppression = null;
}

// 战力评分系统
let combatPowerSystem;
try {
  combatPowerSystem = require('./game/combat_power');
} catch (e) {
  Logger.warn('战力评分模块加载失败:', e.message);
  combatPowerSystem = null;
}

const app = express();
const PORT = process.env.PORT || 3001;

// 确保数据目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 中间件
app.use(cors());
app.use(bodyParser.json());

// API 输入校验中间件
try {
  const { sqlInjectionProtection, rateLimitMark } = require('./middleware/api_validator');
  app.use(sqlInjectionProtection);  // SQL注入防护
  app.use(rateLimitMark);          // 速率限制标记
  console.log('[Middleware] API校验中间件加载成功');
} catch (e) {
  console.warn('[Middleware] API校验中间件加载失败:', e.message);
}

// 静态文件服务 - 提供前端页面
app.use(express.static(path.join(__dirname, 'src')));
app.use(express.static(path.join(__dirname, 'src/css')));

// 健康检查端点
app.get('/api/health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external
    },
    database: {
      connected: !useMemoryStorage,
      responseTime: 0
    },
    version: '1.1.0'
  });
});

// 首页路由 - 返回 index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// 备用首页
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// 数据库初始化 (可选 - 如果 better-sqlite3 不可用则使用内存存储)
let db = null;
let useMemoryStorage = false;

try {
  const Database = require('better-sqlite3');
  const dbPath = path.join(dataDir, 'game.db');
  db = new Database(dbPath);
  Logger.info('✓ 数据库连接成功');
} catch (err) {
  Logger.info('⚠ 数据库不可用，将使用内存存储:', err.message);
  useMemoryStorage = true;
  // 创建内存存储
  db = {
    _data: {
      gongfa: [],
      player_gongfa: [],
      player_gongfa_equipment: [],
      player: []
    },
    exec(sql) {
      // 模拟 exec，不实际执行任何操作
    },
    prepare(sql) {
      const self = this;
      return {
        get(...args) {
          const tableMatch = sql.match(/FROM\s+(\w+)/i);
          if (!tableMatch) return null;
          const table = tableMatch[1];
          const data = self._data[table] || [];
          
          if (sql.includes('COUNT')) {
            return { count: data.length };
          }
          if (sql.includes('WHERE id =')) {
            return data.find(row => row.id === args[0]) || null;
          }
          return data[0] || null;
        },
        all(...args) {
          const tableMatch = sql.match(/FROM\s+(\w+)/i);
          if (!tableMatch) return [];
          const table = tableMatch[1];
          return self._data[table] || [];
        },
        run(...args) {
          // 处理 INSERT
          if (sql.includes('INSERT')) {
            const tableMatch = sql.match(/INTO\s+(\w+)/i);
            if (tableMatch) {
              const table = tableMatch[1];
              const values = args[0];
              if (Array.isArray(values)) {
                const cols = sql.match(/\(([^)]+)\)/)[1].split(',').map(c => c.trim());
                const obj = {};
                cols.forEach((col, i) => { obj[col] = values[i]; });
                self._data[table] = self._data[table] || [];
                self._data[table].push(obj);
              }
            }
          }
          return { changes: 1 };
        }
      };
    }
  };
}

// 初始化数据库表
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS gongfa (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      rarity INTEGER DEFAULT 1,
      realm_req INTEGER DEFAULT 0,
      level_req INTEGER DEFAULT 1,
      icon TEXT,
      skill_id TEXT,
      set_bonus TEXT,
      base_stats TEXT,
      effects TEXT,
      max_level INTEGER DEFAULT 5,
      upgrade_cost TEXT
    )
  `);

  // 每日登录奖励表
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_daily_login (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL UNIQUE,
      total_login_days INTEGER DEFAULT 0,
      consecutive_login_days INTEGER DEFAULT 0,
      last_login_date TEXT,
      last_claim_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 渡劫记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS tribulation_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      current_realm TEXT NOT NULL,
      target_realm TEXT NOT NULL,
      tribulation_type TEXT NOT NULL,
      difficulty TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'pending',
      base_success_rate REAL DEFAULT 0.8,
      bonus_success_rate REAL DEFAULT 0,
      final_success_rate REAL DEFAULT 0.8,
      current_stage INTEGER DEFAULT 0,
      max_stage INTEGER DEFAULT 9,
      hp_before REAL DEFAULT 100,
      hp_after REAL DEFAULT 100,
      damage_taken REAL DEFAULT 0,
      result TEXT,
      rewards TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    )
  `);

  // 玩家保护道具表
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_protection_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, item_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS player_gongfa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      gongfa_id TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      learned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, gongfa_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS player_gongfa_equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      slot TEXT NOT NULL,
      gongfa_id TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, slot)
    )
  `);

  // 用户表（用于登录注册）
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS player (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT UNIQUE NOT NULL,
      spirit_stones INTEGER DEFAULT 500,  -- 新账号初始500灵石（原1000）
      qianghua_stones INTEGER DEFAULT 0,
      magic_crystals INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      realm_level INTEGER DEFAULT 0,
      online_status INTEGER DEFAULT 0,
      friendship INTEGER DEFAULT 0,
      vip_level INTEGER DEFAULT 0,
      vip_expire_at DATETIME,
      title TEXT DEFAULT '',
      -- 爵位系统字段
      rank_id INTEGER DEFAULT 0,
      rank_title TEXT DEFAULT '凡夫俗子',
      honor INTEGER DEFAULT 0,
      total_honor INTEGER DEFAULT 0,
      last_daily_reward DATETIME,
      -- 战力评分
      combat_power INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 玩家游戏数据表（包含装备、功法等）
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_game_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL UNIQUE,
      player_data TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES player(id) ON DELETE CASCADE
    )
  `);

  // 玩家新手引导表
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_tutorial (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      step_id TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      claimed INTEGER DEFAULT 0,
      completed_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, step_id)
    )
  `);

  // 玩家称号表
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_titles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      title_id TEXT NOT NULL,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, title_id)
    )
  `);

  // 仙侣关系表
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      partner_id INTEGER NOT NULL,
      intimacy INTEGER DEFAULT 0,
      intimacy_level TEXT DEFAULT '萍水',
      marriage_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      double_cultivate_count INTEGER DEFAULT 0,
      last_double_cultivate DATETIME,
      daily_double_cultivate_used INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, partner_id)
    )
  `);

  // 仙侣申请记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS partner_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      applicant_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME,
      UNIQUE(applicant_id, target_id)
    )
  `);

  // 仙侣双修记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS partner_double_cultivate_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      partner_id INTEGER NOT NULL,
      duration INTEGER DEFAULT 30,
      spirit_gained INTEGER DEFAULT 0,
      intimacy_gained INTEGER DEFAULT 50,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 玩家邮件表
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_mails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      sender TEXT NOT NULL,
      sender_type TEXT DEFAULT 'system',
      is_read INTEGER DEFAULT 0,
      is_claimed INTEGER DEFAULT 0,
      attachments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      claimed_at DATETIME,
      UNIQUE(player_id, id)
    )
  `);

  // 玩家成就表
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      achievement_id TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      claimed INTEGER DEFAULT 0,
      completed_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, achievement_id)
    )
  `);

  // 累计获得灵气记录表（用于spirit_1m成就）
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_spirit_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL UNIQUE,
      total_spirit_earned INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 玩家法宝表（用于artifact_10成就）
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      artifact_id TEXT NOT NULL,
      artifact_name TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, artifact_id)
    )
  `);

  // 商城商品表
  db.exec(`
    CREATE TABLE IF NOT EXISTS shop_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      price_type TEXT DEFAULT 'spirit_stones',
      icon TEXT,
      item_type TEXT,
      item_id TEXT,
      quantity INTEGER DEFAULT 1,
      rarity INTEGER DEFAULT 1,
      level_req INTEGER DEFAULT 1,
      realm_req INTEGER DEFAULT 0,
      vip_level_req INTEGER DEFAULT 0,
      stock INTEGER DEFAULT -1,
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      refresh_time TEXT DEFAULT 'daily'
    )
  `);

  // 玩家购买记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_shop_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      item_id TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      price_paid INTEGER NOT NULL,
      purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, item_id, purchased_at)
    )
  `);

  // 玩家每日商城刷新时间记录
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_shop_refresh (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL UNIQUE,
      last_daily_refresh TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 日常副本次数记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_dungeon_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      dungeon_type TEXT NOT NULL,
      enter_count INTEGER DEFAULT 0,
      last_reset_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, dungeon_type)
    )
  `);

  // 每日副本挑战记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_dungeon_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      dungeon_id TEXT NOT NULL,
      difficulty INTEGER DEFAULT 1,
      current_stage INTEGER DEFAULT 1,
      current_hp INTEGER DEFAULT 0,
      max_hp INTEGER DEFAULT 0,
      time_limit INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      completed_stage INTEGER DEFAULT 0,
      time_used INTEGER DEFAULT 0,
      reward_claimed INTEGER DEFAULT 0,
      start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      end_time DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 每日副本进度表（记录每日通关状态）
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_dungeon_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      dungeon_id TEXT NOT NULL,
      progress_date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      best_time INTEGER,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, dungeon_id, progress_date)
    )
  `);

  // 无尽塔进度表
  db.exec(`
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

  // 无尽塔排行榜表
  db.exec(`
    CREATE TABLE IF NOT EXISTS tower_leaderboard (
      player_id TEXT PRIMARY KEY,
      player_name TEXT,
      highest_floor INTEGER DEFAULT 0,
      timestamp INTEGER
    )
  `);

  // 世界BOSS表
  db.exec(`
    CREATE TABLE IF NOT EXISTS world_boss (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      boss_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      max_hp INTEGER DEFAULT 1000000,
      current_hp INTEGER DEFAULT 1000000,
      icon TEXT,
      description TEXT,
      spawn_time TEXT,
      is_active INTEGER DEFAULT 0,
      killed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 玩家对BOSS伤害记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS boss_damage_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      boss_id TEXT NOT NULL,
      damage INTEGER DEFAULT 0,
      hit_count INTEGER DEFAULT 0,
      last_attack_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, boss_id)
    )
  `);

  // 世界BOSS配置
  db.exec(`
    CREATE TABLE IF NOT EXISTS boss_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      spawn_time TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 玩家主线任务表
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_quests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      quest_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      claimed_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, quest_id)
    )
  `);

  // 任务模板表
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'main',
      difficulty INTEGER DEFAULT 1,
      level_req INTEGER DEFAULT 1,
      realm_req INTEGER DEFAULT 0,
      icon TEXT,
      target_type TEXT,
      target_id TEXT,
      target_count INTEGER DEFAULT 1,
      rewards TEXT,
      exp INTEGER DEFAULT 0,
      spirit_stones INTEGER DEFAULT 0,
      items TEXT,
      next_task TEXT,
      is_repeatable INTEGER DEFAULT 0,
      cooldown_minutes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 玩家任务进度表
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      task_id TEXT NOT NULL,
      status TEXT DEFAULT 'available',
      progress INTEGER DEFAULT 0,
      started_at DATETIME,
      completed_at DATETIME,
      claimed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, task_id)
    )
  `);

  // 宗门表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT '🏯',
      leader_id INTEGER NOT NULL,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      max_members INTEGER DEFAULT 20,
      spirit_stones INTEGER DEFAULT 0,
      realm_level_req INTEGER DEFAULT 0,
      level_req INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 宗门成员表
  db.exec(`
    CREATE TABLE IF NOT EXISTS sect_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sect_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      role TEXT DEFAULT 'member',
      contribution INTEGER DEFAULT 0,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(sect_id, player_id)
    )
  `);

  // 仙盟表
  db.exec(`
    CREATE TABLE IF NOT EXISTS guilds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      leader_id INTEGER NOT NULL,
      leader_name TEXT,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      notice TEXT DEFAULT '欢迎加入本仙盟！',
      fund INTEGER DEFAULT 0,
      max_members INTEGER DEFAULT 20,
      realm_level_req INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 仙盟成员表
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      player_name TEXT,
      role TEXT DEFAULT 'member',
      contribution INTEGER DEFAULT 0,
      daily_contribution INTEGER DEFAULT 0,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, player_id)
    )
  `);

  // 仙盟建筑表
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_buildings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id INTEGER NOT NULL,
      building_key TEXT NOT NULL,
      level INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, building_key)
    )
  `);

  // 仙盟技能表
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id INTEGER NOT NULL,
      skill_id INTEGER NOT NULL,
      level INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, skill_id)
    )
  `);

  // 仙盟日志表
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id INTEGER NOT NULL,
      player_id INTEGER,
      player_name TEXT,
      action TEXT NOT NULL,
      detail TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 仙盟每日贡献记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_contribution_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      contribution INTEGER DEFAULT 0,
      UNIQUE(guild_id, player_id, date)
    )
  `);

  // 仙盟申请表
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      player_name TEXT,
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, player_id)
    )
  `);

  // 玩家仙术表
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_immortal_arts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      art_id TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      proficiency INTEGER DEFAULT 0,
      equipped BOOLEAN DEFAULT 0,
      learned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, art_id)
    )
  `);

  // 仙术熟练度每日记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS art_proficiency_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      art_id TEXT NOT NULL,
      date TEXT NOT NULL,
      proficiency_gain INTEGER DEFAULT 0,
      use_count INTEGER DEFAULT 0,
      UNIQUE(player_id, art_id, date)
    )
  `);

  Logger.info('数据库初始化完成');

  // ============ 爵位系统数据库迁移 ============
  try {
    // 检查并添加爵位相关列（如果不存在）
    const tableInfo = db.prepare("PRAGMA table_info(player)").all();
    const columnNames = tableInfo.map(col => col.name);
    
    if (!columnNames.includes('rank_id')) {
      db.exec(`ALTER TABLE player ADD COLUMN rank_id INTEGER DEFAULT 0`);
      Logger.info('✅ 添加 rank_id 列');
    }
    if (!columnNames.includes('rank_title')) {
      db.exec(`ALTER TABLE player ADD COLUMN rank_title TEXT DEFAULT '凡夫俗子'`);
      Logger.info('✅ 添加 rank_title 列');
    }
    if (!columnNames.includes('honor')) {
      db.exec(`ALTER TABLE player ADD COLUMN honor INTEGER DEFAULT 0`);
      Logger.info('✅ 添加 honor 列');
    }
    if (!columnNames.includes('total_honor')) {
      db.exec(`ALTER TABLE player ADD COLUMN total_honor INTEGER DEFAULT 0`);
      Logger.info('✅ 添加 total_honor 列');
    }
    if (!columnNames.includes('last_daily_reward')) {
      db.exec(`ALTER TABLE player ADD COLUMN last_daily_reward DATETIME`);
      Logger.info('✅ 添加 last_daily_reward 列');
    }
    Logger.info('✅ 爵位系统数据库迁移完成');
  } catch (e) {
    Logger.info('爵位系统数据库迁移失败:', e.message);
  }

  // ============ 仙道大会（竞技场）系统数据库初始化 ============
  try {
    // 创建竞技场玩家数据表
    db.exec(`
      CREATE TABLE IF NOT EXISTS arena_player (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL UNIQUE,
        arena_points INTEGER DEFAULT 0,
        rank_id INTEGER DEFAULT 0,
        rank_name TEXT DEFAULT '凡人',
        win_count INTEGER DEFAULT 0,
        lose_count INTEGER DEFAULT 0,
        total_battles INTEGER DEFAULT 0,
        current_season TEXT,
        daily_challenges_used INTEGER DEFAULT 0,
        last_challenge_date TEXT,
        daily_reward_claimed INTEGER DEFAULT 0,
        last_season_rank INTEGER DEFAULT 0,
        highest_rank INTEGER DEFAULT 0,
        highest_rank_id INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建竞技场挑战记录表
    db.exec(`
      CREATE TABLE IF NOT EXISTS arena_battles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season TEXT NOT NULL,
        attacker_id INTEGER NOT NULL,
        defender_id INTEGER NOT NULL,
        attacker_points_before INTEGER DEFAULT 0,
        attacker_points_after INTEGER DEFAULT 0,
        defender_points_before INTEGER DEFAULT 0,
        defender_points_after INTEGER DEFAULT 0,
        attacker_rank_before INTEGER DEFAULT 0,
        attacker_rank_after INTEGER DEFAULT 0,
        defender_rank_before INTEGER DEFAULT 0,
        defender_rank_after INTEGER DEFAULT 0,
        result TEXT NOT NULL,
        winner_id INTEGER,
        battle_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建赛季表
    db.exec(`
      CREATE TABLE IF NOT EXISTS arena_seasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season_id TEXT NOT NULL UNIQUE,
        season_type TEXT DEFAULT 'weekly',
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建竞技场每日记录表（用于每日重置）
    db.exec(`
      CREATE TABLE IF NOT EXISTS arena_daily_reset (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL UNIQUE,
        reset_date TEXT NOT NULL,
        challenges_used INTEGER DEFAULT 0,
        reward_claimed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    Logger.info('✅ 仙道大会（竞技场）系统数据库初始化完成');
  } catch (e) {
    Logger.info('竞技场系统数据库初始化失败:', e.message);
  }

  // ============ 魔晶系统数据库初始化 ============
  try {
    // 魔晶每日免费领取记录
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_magic_crystal_daily (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL UNIQUE,
        last_claim_date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 魔晶商店购买记录
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_mc_purchase_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        goods_id TEXT NOT NULL,
        limit_type TEXT NOT NULL,
        purchase_count INTEGER DEFAULT 1,
        purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(player_id, goods_id, limit_type)
      )
    `);

    // 魔晶交易/产出记录
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_mc_transaction (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        reason TEXT NOT NULL,
        balance_after INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_mc_tx_player ON player_mc_transaction(player_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_mc_purchase_player ON player_mc_purchase_records(player_id)`);

    Logger.info('✅ 魔晶经济系统数据库初始化完成');
  } catch (e) {
    Logger.info('魔晶系统数据库初始化失败:', e.message);
  }

  // ============ 月卡/季卡数据库初始化 ============
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_monthly_pass (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL UNIQUE,
        pass_type TEXT NOT NULL,
        expire_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    Logger.info('✅ 月卡/季卡系统数据库初始化完成');
  } catch (e) {
    Logger.info('月卡/季卡系统数据库初始化失败:', e.message);
  }

  // ============ 经脉系统数据库初始化 ============
  try {
    // 玩家经脉数据表
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_meridian (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL UNIQUE,
        meridians_data TEXT DEFAULT '{}',
        total_spirit_bonus INTEGER DEFAULT 0,
        total_atk_bonus INTEGER DEFAULT 0,
        total_def_bonus INTEGER DEFAULT 0,
        total_hp_bonus INTEGER DEFAULT 0,
        total_crit_bonus REAL DEFAULT 0,
        total_dodge_bonus REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 经脉操作日志表
    db.exec(`
      CREATE TABLE IF NOT EXISTS meridian_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        meridian_id TEXT,
        acupoint_id TEXT,
        result TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    Logger.info('✅ 经脉系统数据库初始化完成');
  } catch (e) {
    Logger.info('经脉系统数据库初始化失败:', e.message);
  }

  // ============ 战力系统数据库迁移 ============
  try {
    const tableInfo = db.prepare("PRAGMA table_info(player)").all();
    const columnNames = tableInfo.map(col => col.name);
    
    if (!columnNames.includes('combat_power')) {
      db.exec(`ALTER TABLE player ADD COLUMN combat_power INTEGER DEFAULT 0`);
      Logger.info('✅ 添加 combat_power 列');
    }
    if (!columnNames.includes('qianghua_stones')) {
      db.exec(`ALTER TABLE player ADD COLUMN qianghua_stones INTEGER DEFAULT 0`);
      Logger.info('✅ 添加 qianghua_stones 列');
    }
    if (!columnNames.includes('magic_crystals')) {
      db.exec(`ALTER TABLE player ADD COLUMN magic_crystals INTEGER DEFAULT 0`);
      Logger.info('✅ 添加 magic_crystals 列');
    }
    if (!columnNames.includes('spirit_root')) {
      db.exec(`ALTER TABLE player ADD COLUMN spirit_root TEXT DEFAULT '五行杂灵根'`);
      Logger.info('✅ 添加 spirit_root 列');
    }
    Logger.info('✅ 战力系统数据库迁移完成');
  } catch (e) {
    Logger.info('战力系统数据库迁移失败:', e.message);
  }

  // ============ 数据库索引优化 ============
  try {
    // 添加有用的索引（player.id 已有主键索引，无需额外创建）
    db.exec(`CREATE INDEX IF NOT EXISTS idx_player_username ON player(username)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_player_user_id ON player(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_player_gongfa_player_id ON player_gongfa(player_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_player_gongfa_equipment_player_id ON player_gongfa_equipment(player_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_player_partners_player_id ON player_partners(player_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_player_mails_player_id ON player_mails(player_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_player_achievements_player_id ON player_achievements(player_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_boss_damage_records_player_id ON boss_damage_records(player_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_boss_damage_records_boss_id ON boss_damage_records(boss_id)`);
    // 活动相关索引
    db.exec(`CREATE INDEX IF NOT EXISTS idx_player_daily_login_player ON player_daily_login(player_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_tribulation_records_player ON tribulation_records(player_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_player_shop_purchases_player ON player_shop_purchases(player_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_player_quests_player ON player_quests(player_id)`);
    Logger.info('✅ 数据库索引优化完成');
  } catch (e) {
    Logger.info('数据库索引优化失败:', e.message);
  }

  // ============ 灵兽系统数据库初始化 ============
  try {
    const beastApi = require('./game/beast_api');
    beastApi.initBeastDatabase(db);
    Logger.info('✅ 灵兽系统数据库初始化完成');
  } catch (e) {
    Logger.info('灵兽系统数据库初始化失败:', e.message);
  }
}

// 种子数据
function seedGongfaData() {
  // 对于内存存储，总是插入种子数据
  if (useMemoryStorage) {
    insertGongfaData();
    return;
  }
  
  try {
    const count = db.prepare('SELECT COUNT(*) as count FROM gongfa').get();
    if (!count || count.count > 0) return;
  } catch (e) {
    Logger.info('⚠ 无法检查数据库，跳过种子数据');
    return;
  }
};

// 创建性能优化索引
function createIndexes() {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_player_gongfa_player ON player_gongfa(player_id)',
    'CREATE INDEX IF NOT EXISTS idx_player_beasts_player ON player_beasts(player_id)',
    'CREATE INDEX IF NOT EXISTS idx_player_mails_unread ON player_mails(player_id, is_read)',
    'CREATE INDEX IF NOT EXISTS idx_player_achievements_pending ON player_achievements(player_id, completed)',
    'CREATE INDEX IF NOT EXISTS idx_player_daily_login_player ON player_daily_login(player_id)',
    'CREATE INDEX IF NOT EXISTS idx_player_partners_player ON player_partners(player_id)',
    'CREATE INDEX IF NOT EXISTS idx_player_titles_player ON player_titles(player_id)',
    'CREATE INDEX IF NOT EXISTS idx_player_artifacts_player ON player_artifacts(player_id)'
  ];
  
  indexes.forEach(sql => {
    try {
      db.exec(sql);
    } catch (e) {
      // 索引可能已存在，忽略错误
    }
  });
  Logger.info('✅ 数据库索引优化完成');
}

// ============ 魔晶经济系统 v21 ============
// 魔晶 (Magic Crystal) - 顶级稀缺货币
// 用途：兑换稀有道具、魔器装备、限定外观、珍贵材料

const MAGIC_CRYSTAL_CONFIG = {
  // 货币标识
  CURRENCY_KEY: 'magic_crystals',

  // 每日免费领取基础量
  DAILY_FREE: {
    base: 5,        // 基础每日免费5魔晶
    realmBonus: 2,  // 每境界额外+2魔晶
  },

  // 魔晶产出公式配置
  GENERATION: {
    // 世界BOSS: 每100点伤害产出魔晶数 = bossTierMultiplier * (1 + realmLevel * 0.1)
    WORLD_BOSS: {
      baseDamagePerCrystal: 100,
      tierMultiplier: {
        rare: 1,
        epic: 1.5,
        legendary: 2,
        mythical: 5,
      },
    },
    // 封魔渊通关: base * realm_level * completion_bonus
    REALM_SUPPRESSION: {
      basePerLevel: 5,
      firstClearBonus: 3,     // 首次通关3倍
      dailyFirstBonus: 2,     // 每日首通2倍
    },
    // 竞技场: 赛季结束时按排名发放
    ARENA_SEASON: {
      rewards: {
        top1: 500,
        top10: 200,
        top50: 100,
        top100: 50,
        participant: 10,
      },
    },
  },

  // 商店刷新配置
  SHOP_REFRESH: {
    daily: 'daily',        // 每日商品重置
    weekly: 'weekly',      // 每周商品重置
    monthly: 'monthly',    // 每月商品重置
  },

  // VIP月卡额外加成
  VIP_DAILY_BONUS: {
    1: 10,   // 月卡: 每日额外10魔晶
    2: 25,   // 季卡: 每日额外25魔晶
    3: 50,   // 年卡: 每日额外50魔晶
  },
};

// ============ 魔晶商店商品配置 ============
const MAGIC_CRYSTAL_SHOP = {
  // 每日限购商品（每日重置）
  DAILY: [
    { id: 'mc_spirit_pack_100', name: '灵石袋x10000', icon: '💎', price: 10, item_type: 'currency', item_id: 'spirit_stones', quantity: 10000, rarity: 2, limit: { type: 'daily', count: 3 }, description: '装有10000灵石的储物袋' },
    { id: 'mc_exp_book_50', name: '经验心得x50', icon: '📖', price: 15, item_type: 'exp_book', item_id: 'exp_book', quantity: 50, rarity: 2, limit: { type: 'daily', count: 5 }, description: '修炼经验心得，+50点经验' },
    { id: 'mc_gongfa_random', name: '随机功法宝箱', icon: '🎁', price: 50, item_type: 'gongfa_box', item_id: 'green_gongfa_box', quantity: 1, rarity: 3, limit: { type: 'daily', count: 1 }, realm_level_req: 3, description: '随机获得一本绿色品质功法' },
    { id: 'mc_realm_stone', name: '境界突破石', icon: '🏆', price: 80, item_type: 'consumable', item_id: 'realm_boost', quantity: 1, rarity: 3, limit: { type: 'daily', count: 2 }, realm_level_req: 5, description: '可直接突破当前境界一层' },
    { id: 'mc_tribulation_pass', name: '渡劫令', icon: '⚡', price: 100, item_type: 'consumable', item_id: 'tribulation_pass', quantity: 1, rarity: 4, limit: { type: 'daily', count: 1 }, realm_level_req: 7, description: '下一次渡劫必定成功' },
  ],

  // 每周限购商品（每周一重置）
  WEEKLY: [
    { id: 'mc_purple_gongfa', name: '紫色功法宝箱', icon: '💠', price: 200, item_type: 'gongfa_box', item_id: 'purple_gongfa_box', quantity: 1, rarity: 4, limit: { type: 'weekly', count: 2 }, realm_level_req: 5, description: '必定获得一本紫色功法' },
    { id: 'mc_skill_reset', name: '技能重置石', icon: '🔄', price: 150, item_type: 'consumable', item_id: 'skill_reset', quantity: 1, rarity: 3, limit: { type: 'weekly', count: 3 }, realm_level_req: 3, description: '重置任意一个技能的等级' },
    { id: 'mc_fashion_token', name: '限定时装兑换券', icon: '👘', price: 300, item_type: 'token', item_id: 'fashion_token', quantity: 1, rarity: 4, limit: { type: 'weekly', count: 1 }, realm_level_req: 5, description: '可兑换一件限定时装' },
    { id: 'mc_epic_beast', name: '史诗宠物蛋', icon: '🥚', price: 400, item_type: 'beast_egg', item_id: 'epic_beast_egg', quantity: 1, rarity: 4, limit: { type: 'weekly', count: 1 }, realm_level_req: 8, description: '孵化获得史诗级宠物' },
  ],

  // 永久限购商品（每人终身限购）
  PERMANENT: [
    { id: 'mc_red_gongfa', name: '红色功法宝箱', icon: '🔴', price: 1000, item_type: 'gongfa_box', item_id: 'red_gongfa_box', quantity: 1, rarity: 5, limit: { type: 'permanent', count: 3 }, realm_level_req: 10, description: '必定获得一本红色功法' },
    { id: 'mc_legendary_title', name: '传说称号【魔晶至尊】', icon: '👑', price: 500, item_type: 'title', item_id: 'magic_crystal_king', quantity: 1, rarity: 5, limit: { type: 'permanent', count: 1 }, realm_level_req: 1, description: '佩戴获得全属性+5%加成，称号【魔晶至尊】' },
    { id: 'mc_mythical_equip', name: '神话级魔器【虚空白虎】', icon: '🐯', price: 2000, item_type: 'equipment', item_id: 'mythical_white_tiger', quantity: 1, rarity: 5, limit: { type: 'permanent', count: 1 }, realm_level_req: 12, description: '远古四大神兽之一，装备后全属性大幅提升' },
  ],

  // 特殊限时商品（每月重置）
  MONTHLY: [
    { id: 'mc_monthly_pack', name: '魔晶月卡', icon: '🌙', price: 0, item_type: 'monthly_pass', item_id: 'magic_crystal_monthly', quantity: 1, rarity: 3, limit: { type: 'monthly', count: 1 }, description: '每日领取10魔晶+5000灵石，持续30天' },
    { id: 'mc_season_pack', name: '魔晶季卡', icon: '🍃', price: 0, item_type: 'season_pass', item_id: 'magic_crystal_season', quantity: 1, rarity: 4, limit: { type: 'monthly', count: 1 }, description: '每日领取25魔晶+10000灵石，持续90天' },
  ],
};

// ============ 魔晶系统类（数据库持久化版）============
class MagicCrystalSystem {
  constructor() {
    // 内存缓存（用于减少DB查询）
    this._purchaseCache = new Map(); // playerId -> Map(goodsId -> { daily, weekly, permanent, monthly })
    this._dailyClaimCache = new Map(); // playerId -> lastClaimDate
  }

  /**
   * 获取玩家魔晶数量
   */
  getPlayerCrystals(playerId) {
    const player = db.prepare('SELECT magic_crystals FROM player WHERE id = ?').get(playerId);
    return player ? (player.magic_crystals || 0) : 0;
  }

  /**
   * 增减玩家魔晶（数据库持久化）
   */
  modifyCrystals(playerId, amount, reason = 'system') {
    const player = db.prepare('SELECT id, magic_crystals FROM player WHERE id = ?').get(playerId);
    if (!player) return false;

    const newAmount = Math.max(0, (player.magic_crystals || 0) + amount);
    db.prepare('UPDATE player SET magic_crystals = ? WHERE id = ?').run(newAmount, playerId);

    // 记录交易
    db.prepare(`
      INSERT INTO player_mc_transaction (player_id, amount, reason, balance_after)
      VALUES (?, ?, ?, ?)
    `).run(playerId, amount, reason, newAmount);

    Logger.info(`[魔晶] 玩家${playerId} ${amount > 0 ? '+' : ''}${amount}魔晶 (${reason})，余额: ${newAmount}`);
    return true;
  }

  /**
   * 每日免费领取魔晶
   */
  claimDailyFree(playerId, vipLevel = 0, realmLevel = 0) {
    const today = getDateString();

    // 从DB检查今日是否已领取
    const record = db.prepare('SELECT last_claim_date FROM player_magic_crystal_daily WHERE player_id = ?').get(playerId);
    if (record && record.last_claim_date === today) {
      return { success: false, error: '今日已领取，请明日再来', claimed: false };
    }

    const base = MAGIC_CRYSTAL_CONFIG.DAILY_FREE.base;
    const realmBonus = realmLevel * MAGIC_CRYSTAL_CONFIG.DAILY_FREE.realmBonus;
    const vipBonus = MAGIC_CRYSTAL_CONFIG.VIP_DAILY_BONUS[vipLevel] || 0;
    const total = base + realmBonus + vipBonus;

    this.modifyCrystals(playerId, total, 'daily_free');

    // 更新领取记录
    db.prepare(`
      INSERT INTO player_magic_crystal_daily (player_id, last_claim_date)
      VALUES (?, ?)
      ON CONFLICT(player_id) DO UPDATE SET last_claim_date = excluded.last_claim_date, updated_at = CURRENT_TIMESTAMP
    `).run(playerId, today);

    // 更新缓存
    this._dailyClaimCache.set(String(playerId), today);

    return {
      success: true,
      amount: total,
      breakdown: { base, realmBonus, vipBonus },
      remaining: this.getPlayerCrystals(playerId)
    };
  }

  /**
   * 计算封魔渊通关魔晶奖励
   */
  calcRealmSuppressionReward(realmLevel, isFirstClear, isDailyFirst) {
    const cfg = MAGIC_CRYSTAL_CONFIG.GENERATION.REALM_SUPPRESSION;
    let reward = cfg.basePerLevel * realmLevel;

    if (isFirstClear) {
      reward *= cfg.firstClearBonus;
    } else if (isDailyFirst) {
      reward *= cfg.dailyFirstBonus;
    }

    return Math.floor(reward);
  }

  /**
   * 计算世界BOSS伤害魔晶奖励
   */
  calcWorldBossReward(damage, bossQuality, playerRealmLevel) {
    const cfg = MAGIC_CRYSTAL_CONFIG.GENERATION.WORLD_BOSS;
    const tierMultiplier = cfg.tierMultiplier[bossQuality] || 1;
    const realmMultiplier = 1 + playerRealmLevel * 0.1;
    const crystals = Math.floor((damage / cfg.baseDamagePerCrystal) * tierMultiplier * realmMultiplier);
    return Math.max(1, crystals);
  }

  /**
   * 从数据库加载玩家购买记录
   */
  _loadPurchaseRecords(playerId) {
    const pid = String(playerId);
    if (this._purchaseCache.has(pid)) {
      return this._purchaseCache.get(pid);
    }

    const records = new Map();
    const rows = db.prepare('SELECT goods_id, limit_type, purchase_count FROM player_mc_purchase_records WHERE player_id = ?').all(playerId);
    for (const row of rows) {
      records.set(row.goods_id, {
        daily: 0, weekly: 0, permanent: 0, monthly: 0,
        [row.limit_type]: row.purchase_count
      });
    }
    this._purchaseCache.set(pid, records);
    return records;
  }

  /**
   * 获取玩家限购记录
   */
  getPurchaseRecord(playerId) {
    return this._loadPurchaseRecords(playerId);
  }

  /**
   * 检查限购
   */
  checkLimit(playerId, goodsId, limitType, limitCount) {
    const records = this.getPurchaseRecord(playerId);
    if (!records.has(goodsId)) {
      records.set(goodsId, { daily: 0, weekly: 0, permanent: 0, monthly: 0 });
    }
    const goodRecords = records.get(goodsId);
    return goodRecords[limitType] < limitCount;
  }

  /**
   * 记录购买（数据库持久化）
   */
  recordPurchase(playerId, goodsId, limitType) {
    const records = this.getPurchaseRecord(playerId);
    if (!records.has(goodsId)) {
      records.set(goodsId, { daily: 0, weekly: 0, permanent: 0, monthly: 0 });
    }
    records.get(goodsId)[limitType]++;

    // 持久化到数据库
    const existing = db.prepare('SELECT purchase_count FROM player_mc_purchase_records WHERE player_id = ? AND goods_id = ? AND limit_type = ?').get(playerId, goodsId, limitType);
    if (existing) {
      db.prepare('UPDATE player_mc_purchase_records SET purchase_count = purchase_count + 1 WHERE player_id = ? AND goods_id = ? AND limit_type = ?').run(playerId, goodsId, limitType);
    } else {
      db.prepare('INSERT INTO player_mc_purchase_records (player_id, goods_id, limit_type, purchase_count) VALUES (?, ?, ?, 1)').run(playerId, goodsId, limitType);
    }
  }

  /**
   * 每日重置限购（每日凌晨自动调用）
   */
  dailyReset(playerId) {
    // 重置DB中对应玩家的每日限购（直接清空所有每日计数）
    db.prepare('DELETE FROM player_mc_purchase_records WHERE player_id = ? AND limit_type = ?').run(playerId, 'daily');
    // 清除缓存
    const pid = String(playerId);
    if (this._purchaseCache.has(pid)) {
      const records = this._purchaseCache.get(pid);
      for (const [goodsId, rec] of records.entries()) {
        rec.daily = 0;
      }
    }
    this._dailyClaimCache.delete(pid);
    Logger.info(`[魔晶] 玩家${playerId} 每日重置完成`);
  }

  /**
   * 每周重置限购（每周一凌晨调用）
   */
  weeklyReset(playerId) {
    db.prepare('DELETE FROM player_mc_purchase_records WHERE player_id = ? AND limit_type IN (?, ?)').run(playerId, 'weekly', 'monthly');
    const pid = String(playerId);
    if (this._purchaseCache.has(pid)) {
      const records = this._purchaseCache.get(pid);
      for (const [goodsId, rec] of records.entries()) {
        rec.weekly = 0;
        rec.monthly = 0;
      }
    }
    Logger.info(`[魔晶] 玩家${playerId} 每周重置完成`);
  }

  /**
   * 获取玩家可购买的商品列表（按类别）
   */
  getShopGoods(playerId, realmLevel = 0, vipLevel = 0) {
    const records = this.getPurchaseRecord(playerId);
    const result = { daily: [], weekly: [], permanent: [], monthly: [] };

    for (const [category, goodsList] of Object.entries(MAGIC_CRYSTAL_SHOP)) {
      for (const goods of goodsList) {
        // 检查境界需求
        if (goods.realm_level_req && realmLevel < goods.realm_level_req) continue;

        // 获取已购买数量
        const goodRecords = records.get(goods.id);
        const purchased = goodRecords ? goodRecords[goods.limit.type] : 0;
        const remaining = Math.max(0, goods.limit.count - purchased);

        result[category].push({
          ...goods,
          purchased,
          remaining,
          canBuy: remaining > 0,
        });
      }
    }

    return result;
  }

  /**
   * 购买商品
   */
  purchase(playerId, goodsId, realmLevel = 0) {
    // 查找商品
    let goods = null;
    let category = null;
    for (const [cat, goodsList] of Object.entries(MAGIC_CRYSTAL_SHOP)) {
      const found = goodsList.find(g => g.id === goodsId);
      if (found) {
        goods = found;
        category = cat;
        break;
      }
    }

    if (!goods) {
      return { success: false, error: '商品不存在' };
    }

    // 检查境界需求
    if (goods.realm_level_req && realmLevel < goods.realm_level_req) {
      return { success: false, error: `需要境界达到${goods.realm_level_req}阶才能购买` };
    }

    // 检查限购
    if (!this.checkLimit(playerId, goodsId, goods.limit.type, goods.limit.count)) {
      const limitNames = { daily: '每日', weekly: '每周', permanent: '终身', monthly: '每月' };
      return { success: false, error: `${limitNames[goods.limit.type]}购买次数已用完` };
    }

    // 检查魔晶余额
    const balance = this.getPlayerCrystals(playerId);
    if (balance < goods.price) {
      return { success: false, error: '魔晶不足' };
    }

    // 扣除魔晶
    if (!this.modifyCrystals(playerId, -goods.price, `shop_purchase:${goods.id}`)) {
      return { success: false, error: '交易失败' };
    }

    // 记录购买（数据库持久化）
    this.recordPurchase(playerId, goodsId, goods.limit.type);

    // 发放物品
    this.grantGoods(playerId, goods);

    return {
      success: true,
      spent: goods.price,
      remaining: this.getPlayerCrystals(playerId),
      goods: { id: goods.id, name: goods.name, icon: goods.icon, quantity: goods.quantity },
    };
  }

  /**
   * 发放物品
   */
  grantGoods(playerId, goods) {
    switch (goods.item_type) {
      case 'currency':
        if (goods.item_id === 'spirit_stones') {
          db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(goods.quantity, playerId);
          Logger.info(`[魔晶商店] 玩家${playerId} 购买获得${goods.quantity}灵石`);
        }
        break;
      case 'exp_book':
        db.prepare('UPDATE player SET exp = COALESCE(exp, 0) + ? WHERE id = ?').run(goods.quantity, playerId);
        Logger.info(`[魔晶商店] 玩家${playerId} 购买获得${goods.quantity}经验`);
        break;
      case 'title':
        this.grantTitle(playerId, goods.item_id);
        break;
      case 'monthly_pass':
      case 'season_pass':
        this.grantPass(playerId, goods.item_id, goods.quantity);
        break;
      default:
        Logger.info(`[魔晶商店] 玩家${playerId} 购买获得 ${goods.name} x${goods.quantity}`);
    }
  }

  /**
   * 发放称号
   */
  grantTitle(playerId, titleId) {
    const titleMap = {
      'magic_crystal_king': '【魔晶至尊】',
    };
    const titleName = titleMap[titleId] || titleId;
    db.prepare('UPDATE player SET title = ? WHERE id = ?').run(titleName, playerId);
    Logger.info(`[魔晶商店] 玩家${playerId} 获得称号: ${titleName}`);
  }

  /**
   * 发放通行证（月卡/季卡）
   */
  grantPass(playerId, passId, quantity) {
    const expireAt = new Date();
    if (passId === 'magic_crystal_monthly') {
      expireAt.setDate(expireAt.getDate() + 30);
      try {
        db.prepare('INSERT OR REPLACE INTO player_monthly_pass (player_id, pass_type, expire_at) VALUES (?, ?, ?)').run(playerId, 'monthly', expireAt.toISOString());
      } catch (e) {
        Logger.info(`[魔晶商店] 月卡表写入失败（可能不存在）: ${e.message}`);
      }
    } else if (passId === 'magic_crystal_season') {
      expireAt.setDate(expireAt.getDate() + 90);
      try {
        db.prepare('INSERT OR REPLACE INTO player_monthly_pass (player_id, pass_type, expire_at) VALUES (?, ?, ?)').run(playerId, 'season', expireAt.toISOString());
      } catch (e) {
        Logger.info(`[魔晶商店] 季卡表写入失败（可能不存在）: ${e.message}`);
      }
    }
    Logger.info(`[魔晶商店] 玩家${playerId} 开通 ${passId}，有效期至 ${expireAt.toISOString()}`);
  }

  /**
   * 获取魔晶货币信息（余额+商店数据）
   */
  getInfo(playerId, realmLevel = 0, vipLevel = 0) {
    const balance = this.getPlayerCrystals(playerId);
    const goods = this.getShopGoods(playerId, realmLevel, vipLevel);

    // 从DB检查今日领取状态
    const record = db.prepare('SELECT last_claim_date FROM player_magic_crystal_daily WHERE player_id = ?').get(playerId);
    const todayClaimed = record && record.last_claim_date === getDateString();

    return {
      balance,
      todayClaimed,
      dailyFree: MAGIC_CRYSTAL_CONFIG.DAILY_FREE.base + realmLevel * MAGIC_CRYSTAL_CONFIG.DAILY_FREE.realmBonus + (MAGIC_CRYSTAL_CONFIG.VIP_DAILY_BONUS[vipLevel] || 0),
      shop: goods,
    };
  }
}

// 单例
const magicCrystalSystem = new MagicCrystalSystem();

// 获取日期字符串（每日重置用）
function getDateString(date = new Date()) {
  return date.toISOString().split('T')[0];
}

// 检查并重置每日副本次数
function checkAndResetDailyDungeons(playerId) {
  const today = getDateString();
  
  // 获取玩家所有日常副本次数记录
  const records = db.prepare('SELECT * FROM player_dungeon_daily WHERE player_id = ?').all(playerId);
  
  for (const config of Object.values(DAILY_DUNGEON_CONFIG)) {
    const existing = records.find(r => r.dungeon_type === config.id);
    
    if (existing) {
      // 检查是否需要重置
      if (existing.last_reset_date !== today) {
        db.prepare(`
          UPDATE player_dungeon_daily 
          SET enter_count = 0, last_reset_date = ?, updated_at = CURRENT_TIMESTAMP
          WHERE player_id = ? AND dungeon_type = ?
        `).run(today, playerId, config.id);
      }
    } else {
      // 创建新记录
      db.prepare(`
        INSERT INTO player_dungeon_daily (player_id, dungeon_type, enter_count, last_reset_date)
        VALUES (?, ?, 0, ?)
      `).run(playerId, config.id, today);
    }
  }
}

// 获取玩家日常副本次数
function getPlayerDailyDungeonCounts(playerId) {
  checkAndResetDailyDungeons(playerId);
  
  const records = db.prepare('SELECT * FROM player_dungeon_daily WHERE player_id = ?').all(playerId);
  const result = {};
  
  for (const [type, config] of Object.entries(DAILY_DUNGEON_CONFIG)) {
    const record = records.find(r => r.dungeon_type === config.id);
    result[type] = {
      id: config.id,
      name: config.name,
      icon: config.icon,
      description: config.description,
      daily_limit: config.daily_limit,
      enter_count: record ? record.enter_count : 0,
      remaining: config.daily_limit - (record ? record.enter_count : 0)
    };
  }
  
  return result;
}

// ============ 缓存机制 ============
const cache = {
  gongfaList: { data: null, timestamp: 0 },
  shopItems: { data: null, timestamp: 0 },
  sectTypes: { data: null, timestamp: 0 }
};

const CACHE_TTL = 60000; // 缓存1分钟

function getCachedData(key, fetchFn) {
  const now = Date.now();
  if (cache[key] && cache[key].data && (now - cache[key].timestamp) < CACHE_TTL) {
    return cache[key].data;
  }
  const data = fetchFn();
  cache[key] = { data, timestamp: now };
  return data;
}

function invalidateCache(key) {
  if (cache[key]) {
    cache[key].timestamp = 0;
  }
}

// 商城商品种子数据
function seedGongfaData() {
  const count = db.prepare('SELECT COUNT(*) as count FROM gongfa').get();
  if (count.count > 0) return;

  insertGongfaData();
}

function insertGongfaData() {
  const gongfaData = [
    { id: 'basic_breath', name: '引气术', type: 'cultivation', description: '最简单的呼吸吐纳之法', rarity: 1, realm_req: 0, level_req: 1, icon: '🌬️', skill_id: null, base_stats: { spirit_rate: 1.1 }, effects: { 1: { spirit_rate: 0.1 }, 2: { spirit_rate: 0.15 }, 3: { spirit_rate: 0.2 }, 4: { spirit_rate: 0.25 }, 5: { spirit_rate: 0.3 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 100 }, 2: { spirit_stones: 200 }, 3: { spirit_stones: 400 }, 4: { spirit_stones: 800 }, 5: { spirit_stones: 1600 } } },
    { id: 'spirit_absorption', name: '聚气诀', type: 'cultivation', description: '聚集周围灵气的法门', rarity: 2, realm_req: 2, level_req: 10, icon: '🌀', skill_id: null, base_stats: { spirit_rate: 1.2 }, effects: { 1: { spirit_rate: 0.2 }, 2: { spirit_rate: 0.25 }, 3: { spirit_rate: 0.3 }, 4: { spirit_rate: 0.35 }, 5: { spirit_rate: 0.4 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 500 }, 2: { spirit_stones: 1000 }, 3: { spirit_stones: 2000 }, 4: { spirit_stones: 4000 }, 5: { spirit_stones: 8000 } } },
    { id: 'celestial_breath', name: '先天混元功', type: 'cultivation', description: '沟通天地元气的无上功法', rarity: 4, realm_req: 5, level_req: 50, icon: '✨', skill_id: 'celestial_spirit', base_stats: { spirit_rate: 1.5 }, effects: { 1: { spirit_rate: 0.5 }, 2: { spirit_rate: 0.6 }, 3: { spirit_rate: 0.7 }, 4: { spirit_rate: 0.8 }, 5: { spirit_rate: 1.0 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 50000 }, 2: { spirit_stones: 100000 }, 3: { spirit_stones: 200000 }, 4: { spirit_stones: 400000 }, 5: { spirit_stones: 800000 } } },
    { id: 'sword_manifesto', name: '剑诀', type: 'attack', description: '基础剑修法门', rarity: 1, realm_req: 0, level_req: 1, icon: '⚔️', skill_id: null, base_stats: { atk: 1.1 }, effects: { 1: { atk: 0.1 }, 2: { atk: 0.15 }, 3: { atk: 0.2 }, 4: { atk: 0.25 }, 5: { atk: 0.3 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 100 }, 2: { spirit_stones: 200 }, 3: { spirit_stones: 400 }, 4: { spirit_stones: 800 }, 5: { spirit_stones: 1600 } } },
    { id: 'flame_sword', name: '赤焰剑诀', type: 'attack', description: '蕴含火焰之力的剑技', rarity: 3, realm_req: 3, level_req: 20, icon: '🔥', skill_id: 'flame_slash', base_stats: { atk: 1.2 }, effects: { 1: { atk: 0.3, fire_dmg: 0.1 }, 2: { atk: 0.35, fire_dmg: 0.15 }, 3: { atk: 0.4, fire_dmg: 0.2 }, 4: { atk: 0.45, fire_dmg: 0.25 }, 5: { atk: 0.5, fire_dmg: 0.3 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 2000 }, 2: { spirit_stones: 4000 }, 3: { spirit_stones: 8000 }, 4: { spirit_stones: 16000 }, 5: { spirit_stones: 32000 } } },
    { id: 'thunder_sword', name: '奔雷剑诀', type: 'attack', description: '引动天雷的剑技', rarity: 4, realm_req: 5, level_req: 50, icon: '⚡', skill_id: 'thunder_strike', base_stats: { atk: 1.3 }, effects: { 1: { atk: 0.5, thunder_dmg: 0.2, crit_rate: 0.05 }, 2: { atk: 0.55, thunder_dmg: 0.25, crit_rate: 0.08 }, 3: { atk: 0.6, thunder_dmg: 0.3, crit_rate: 0.1 }, 4: { atk: 0.65, thunder_dmg: 0.35, crit_rate: 0.12 }, 5: { atk: 0.7, thunder_dmg: 0.4, crit_rate: 0.15 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 50000 }, 2: { spirit_stones: 100000 }, 3: { spirit_stones: 200000 }, 4: { spirit_stones: 400000 }, 5: { spirit_stones: 800000 } } },
    { id: 'iron_body', name: '铁布衫', type: 'defense', description: '基础的护体功法', rarity: 1, realm_req: 0, level_req: 1, icon: '🛡️', skill_id: null, base_stats: { def: 1.1 }, effects: { 1: { def: 0.1 }, 2: { def: 0.15 }, 3: { def: 0.2 }, 4: { def: 0.25 }, 5: { def: 0.3 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 100 }, 2: { spirit_stones: 200 }, 3: { spirit_stones: 400 }, 4: { spirit_stones: 800 }, 5: { spirit_stones: 1600 } } },
    { id: 'jade_shield', name: '玉清护体', type: 'defense', description: '玉石俱焚的防御绝技', rarity: 3, realm_req: 3, level_req: 20, icon: '💎', skill_id: 'jade_barrier', base_stats: { def: 1.2 }, effects: { 1: { def: 0.3, damage_reduction: 0.1 }, 2: { def: 0.35, damage_reduction: 0.12 }, 3: { def: 0.4, damage_reduction: 0.15 }, 4: { def: 0.45, damage_reduction: 0.18 }, 5: { def: 0.5, damage_reduction: 0.2 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 2000 }, 2: { spirit_stones: 4000 }, 3: { spirit_stones: 8000 }, 4: { spirit_stones: 16000 }, 5: { spirit_stones: 32000 } } },
    { id: 'healing_arts', name: '长春功', type: 'auxiliary', description: '恢复生命力的法门', rarity: 2, realm_req: 1, level_req: 5, icon: '🌿', skill_id: 'regeneration', base_stats: { hp_regen: 1.1 }, effects: { 1: { hp_regen: 0.1 }, 2: { hp_regen: 0.15 }, 3: { hp_regen: 0.2 }, 4: { hp_regen: 0.25 }, 5: { hp_regen: 0.3 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 300 }, 2: { spirit_stones: 600 }, 3: { spirit_stones: 1200 }, 4: { spirit_stones: 2400 }, 5: { spirit_stones: 4800 } } },
    { id: 'spirit_root_awakening', name: '灵根觉醒', type: 'passive', description: '激发灵根潜力', rarity: 3, realm_req: 2, level_req: 15, icon: '🌟', skill_id: null, base_stats: { all_stats: 1.1 }, effects: { 1: { all_stats: 0.05 }, 2: { all_stats: 0.08 }, 3: { all_stats: 0.1 }, 4: { all_stats: 0.12 }, 5: { all_stats: 0.15 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 1500 }, 2: { spirit_stones: 3000 }, 3: { spirit_stones: 6000 }, 4: { spirit_stones: 12000 }, 5: { spirit_stones: 24000 } } },
    { id: 'immortal_way', name: '仙道篇', type: 'passive', description: '成仙之道，蕴含无上奥秘', rarity: 5, realm_req: 7, level_req: 80, icon: '🏔️', skill_id: 'immortal_transcendence', set_bonus: ['celestial_breath', 'thunder_sword'], base_stats: { all_stats: 1.5 }, effects: { 1: { all_stats: 0.3, exp_rate: 0.2 }, 2: { all_stats: 0.35, exp_rate: 0.25 }, 3: { all_stats: 0.4, exp_rate: 0.3 }, 4: { all_stats: 0.45, exp_rate: 0.35 }, 5: { all_stats: 0.5, exp_rate: 0.4 } }, max_level: 5, upgrade_cost: { 1: { spirit_stones: 500000 }, 2: { spirit_stones: 1000000 }, 3: { spirit_stones: 2000000 }, 4: { spirit_stones: 4000000 }, 5: { spirit_stones: 8000000 } } }
  ];

  // 直接插入到内存存储
  if (useMemoryStorage) {
    db._data.gongfa = gongfaData.map(g => ({
      ...g,
      set_bonus: g.set_bonus ? JSON.stringify(g.set_bonus) : null,
      base_stats: JSON.stringify(g.base_stats),
      effects: JSON.stringify(g.effects),
      upgrade_cost: JSON.stringify(g.upgrade_cost)
    }));
    Logger.info('功法数据种子完成 (内存存储)');
    return;
  }

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO gongfa 
    (id, name, type, description, rarity, realm_req, level_req, icon, skill_id, set_bonus, base_stats, effects, max_level, upgrade_cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const g of gongfaData) {
    stmt.run(
      g.id, g.name, g.type, g.description, g.rarity, g.realm_req, g.level_req,
      g.icon, g.skill_id, g.set_bonus ? JSON.stringify(g.set_bonus) : null,
      JSON.stringify(g.base_stats), JSON.stringify(g.effects), g.max_level, JSON.stringify(g.upgrade_cost)
    );
  }

  Logger.info('功法数据种子完成');
}

// 商城商品种子数据
function seedShopData() {
  const count = db.prepare('SELECT COUNT(*) as count FROM shop_items').get();
  if (count.count > 0) return;

  const shopItems = [
    // 每日刷新商品 (daily)
    { id: 'daily_spirit_pill_10', name: '灵气丹(10)', category: 'daily', description: '增加10分钟修炼时间', price: 100, icon: '💊', item_type: 'consumable', item_id: 'spirit_pill', quantity: 1, rarity: 1, level_req: 1, refresh_time: 'daily' },
    { id: 'daily_spirit_pill_60', name: '灵气丹(60)', category: 'daily', description: '增加60分钟修炼时间', price: 500, icon: '💊', item_type: 'consumable', item_id: 'spirit_pill', quantity: 6, rarity: 2, level_req: 5, refresh_time: 'daily' },
    { id: 'daily_exp_book', name: '经验心得', category: 'daily', description: '获得100点经验', price: 200, icon: '📖', item_type: 'consumable', item_id: 'exp_book', quantity: 1, rarity: 1, level_req: 1, refresh_time: 'daily' },
    { id: 'daily_luck_charm', name: '幸运符', category: 'daily', description: '提升渡劫成功率5%', price: 300, icon: '🍀', item_type: 'consumable', item_id: 'luck_charm', quantity: 1, rarity: 2, level_req: 10, refresh_time: 'daily' },
    { id: 'daily_protection_charm', name: '护身符', category: 'daily', description: '渡劫失败保护一次', price: 800, icon: '🧿', item_type: 'consumable', item_id: 'protection_charm', quantity: 1, rarity: 3, level_req: 20, refresh_time: 'daily' },
    { id: 'daily_gongfa_box', name: '功法宝箱', category: 'daily', description: '随机获得一本绿色功法', price: 500, icon: '🎁', item_type: 'gongfa_box', item_id: 'green_gongfa_box', quantity: 1, rarity: 2, level_req: 5, refresh_time: 'daily' },

    // 活动商品 (special)
    { id: 'special_rare_gongfa_box', name: '稀有功法宝箱', category: 'special', description: '随机获得一本紫色功法', price: 5000, icon: '💎', item_type: 'gongfa_box', item_id: 'purple_gongfa_box', quantity: 1, rarity: 3, level_req: 30, refresh_time: 'special' },
    { id: 'special_tribulation_pass', name: '渡劫令', category: 'special', description: '下一次渡劫必定成功', price: 10000, icon: '⚡', item_type: 'consumable', item_id: 'tribulation_pass', quantity: 1, rarity: 4, level_req: 50, refresh_time: 'special' },
    { id: 'special_realm_boost', name: '境界突破石', category: 'special', description: '可直接突破当前境界', price: 20000, icon: '🏆', item_type: 'consumable', item_id: 'realm_boost', quantity: 1, rarity: 4, level_req: 60, refresh_time: 'special' },
    { id: 'special_legendary_chest', name: '传奇宝箱', category: 'special', description: '稀有奖励，可能获得红色功法', price: 50000, icon: '👑', item_type: 'gongfa_box', item_id: 'red_gongfa_box', quantity: 1, rarity: 5, level_req: 70, refresh_time: 'special' },

    // VIP专属商品 (vip)
    { id: 'vip_daily_gift', name: 'VIP每日礼包', category: 'vip', description: 'VIP专属每日礼包，包含大量资源', price: 0, price_type: 'vip_points', icon: '🎀', item_type: 'gift', item_id: 'vip_daily_gift', quantity: 1, rarity: 3, level_req: 1, vip_level_req: 1, refresh_time: 'daily' },
    { id: 'vip_spirit_pack', name: 'VIP灵气包', category: 'vip', description: '获得10000灵石', price: 100, price_type: 'vip_points', icon: '💰', item_type: 'currency', item_id: 'spirit_stones', quantity: 10000, rarity: 3, level_req: 1, vip_level_req: 1, refresh_time: 'daily' },
    { id: 'vip_exp_boost', name: 'VIP经验加成', category: 'vip', description: '修炼经验加成50%持续24小时', price: 200, price_type: 'vip_points', icon: '📈', item_type: 'buff', item_id: 'exp_boost_50', quantity: 1, rarity: 4, level_req: 10, vip_level_req: 2, refresh_time: 'daily' },
    { id: 'vip_protection_pack', name: 'VIP护法礼包', category: 'vip', description: '包含5个护身符和5个幸运符', price: 500, price_type: 'vip_points', icon: '🛡️', item_type: 'bundle', item_id: 'vip_protection_pack', quantity: 1, rarity: 4, level_req: 30, vip_level_req: 3, refresh_time: 'daily' },
    { id: 'vip_ultimate_chest', name: 'VIP至臻宝箱', category: 'vip', description: '必定获得一本红色功法', price: 1000, price_type: 'vip_points', icon: '🏅', item_type: 'gongfa_box', item_id: 'red_gongfa_box_guaranteed', quantity: 1, rarity: 5, level_req: 50, vip_level_req: 5, refresh_time: 'daily' },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO shop_items 
    (id, name, category, description, price, price_type, icon, item_type, item_id, quantity, rarity, level_req, realm_req, vip_level_req, refresh_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of shopItems) {
    stmt.run(
      item.id, item.name, item.category, item.description, item.price, item.price_type,
      item.icon, item.item_type, item.item_id, item.quantity, item.rarity,
      item.level_req, item.realm_req || 0, item.vip_level_req || 0, item.refresh_time
    );
  }

  Logger.info('商城商品数据种子完成');
}

// 种子数据 - 炼丹系统
function seedAlchemyData() {
  const { seedAlchemyData: alchemySeed } = require('./backend/database');
  alchemySeed().then(() => {
    Logger.info('炼丹系统数据种子完成');
  }).catch(err => {
    Logger.info('炼丹种子数据跳过:', err.message);
  });
}

// 种子数据 - 炼器系统
function seedEquipmentData() {
  const { seedEquipmentData: forgeSeed } = require('./backend/database');
  forgeSeed().then(() => {
    Logger.info('炼器系统数据种子完成');
  }).catch(err => {
    Logger.info('炼器种子数据跳过:', err.message);
  });
}

// 种子数据 - 技能系统
function seedSkillsData() {
  const count = db.prepare('SELECT COUNT(*) as count FROM skills').get();
  if (count.count > 0) return;

  const skillsData = [
    // 攻击类技能
    { id: 'fireball', name: '火球术', category: 'attack', description: '发射一个火球攻击敌人', rarity: 1, realm_req: 0, level_req: 1, icon: '🔥', effect_type: 'damage', effect_value: 10, max_level: 10, upgrade_cost: JSON.stringify({ 1: { spirit_stones: 100 }, 2: { spirit_stones: 150 }, 3: { spirit_stones: 225 }, 4: { spirit_stones: 340 }, 5: { spirit_stones: 500 }, 6: { spirit_stones: 750 }, 7: { spirit_stones: 1125 }, 8: { spirit_stones: 1700 }, 9: { spirit_stones: 2550 }, 10: { spirit_stones: 3800 } }), passive: 0, cooldown: 5 },
    { id: 'ice_lance', name: '冰枪术', category: 'attack', description: '发射冰枪冻结敌人', rarity: 2, realm_req: 2, level_req: 10, icon: '❄️', effect_type: 'damage', effect_value: 25, max_level: 10, upgrade_cost: JSON.stringify({ 1: { spirit_stones: 500 }, 2: { spirit_stones: 750 }, 3: { spirit_stones: 1125 }, 4: { spirit_stones: 1700 }, 5: { spirit_stones: 2500 }, 6: { spirit_stones: 3750 }, 7: { spirit_stones: 5600 }, 8: { spirit_stones: 8400 }, 9: { spirit_stones: 12600 }, 10: { spirit_stones: 18900 } }), passive: 0, cooldown: 8 },
    { id: 'lightning_bolt', name: '雷击术', category: 'attack', description: '召唤天雷攻击敌人', rarity: 3, realm_req: 4, level_req: 30, icon: '⚡', effect_type: 'damage', effect_value: 50, max_level: 10, upgrade_cost: JSON.stringify({ 1: { spirit_stones: 3000 }, 2: { spirit_stones: 4500 }, 3: { spirit_stones: 6750 }, 4: { spirit_stones: 10100 }, 5: { spirit_stones: 15000 }, 6: { spirit_stones: 22500 }, 7: { spirit_stones: 33750 }, 8: { spirit_stones: 50600 }, 9: { spirit_stones: 75900 }, 10: { spirit_stones: 113900 } }), passive: 0, cooldown: 10 },
    { id: 'void_collapse', name: '虚空崩灭', category: 'attack', description: '引动虚空之力毁灭敌人', rarity: 5, realm_req: 8, level_req: 80, icon: '🕳️', effect_type: 'damage', effect_value: 200, max_level: 10, upgrade_cost: JSON.stringify({ 1: { spirit_stones: 100000 }, 2: { spirit_stones: 150000 }, 3: { spirit_stones: 225000 }, 4: { spirit_stones: 340000 }, 5: { spirit_stones: 500000 }, 6: { spirit_stones: 750000 }, 7: { spirit_stones: 1125000 }, 8: { spirit_stones: 1700000 }, 9: { spirit_stones: 2550000 }, 10: { spirit_stones: 3800000 } }), passive: 0, cooldown: 30 },

    // 防御类技能
    { id: 'stone_skin', name: '石肤术', category: 'defense', description: '皮肤如岩石般坚硬', rarity: 1, realm_req: 0, level_req: 1, icon: '🪨', effect_type: 'defense', effect_value: 5, max_level: 10, upgrade_cost: JSON.stringify({ 1: { spirit_stones: 100 }, 2: { spirit_stones: 150 }, 3: { spirit_stones: 225 }, 4: { spirit_stones: 340 }, 5: { spirit_stones: 500 }, 6: { spirit_stones: 750 }, 7: { spirit_stones: 1125 }, 8: { spirit_stones: 1700 }, 9: { spirit_stones: 2550 }, 10: { spirit_stones: 3800 } }), passive: 1, cooldown: 0 },
    { id: 'ice_armor', name: '冰甲术', category: 'defense', description: '召唤冰甲保护自身', rarity: 2, realm_req: 2, level_req: 10, icon: '🧊', effect_type: 'defense', effect_value: 15, max_level: 10, upgrade_cost: JSON.stringify({ 1: { spirit_stones: 500 }, 2: { spirit_stones: 750 }, 3: { spirit_stones: 1125 }, 4: { spirit_stones: 1700 }, 5: { spirit_stones: 2500 }, 6: { spirit_stones: 3750 }, 7: { spirit_stones: 5600 }, 8: { spirit_stones: 8400 }, 9: { spirit_stones: 12600 }, 10: { spirit_stones: 18900 } }), passive: 1, cooldown: 0 },
    { id: 'lightning_shield', name: '雷光盾', category: 'defense', description: '雷霆护体，反击敌人', rarity: 4, realm_req: 6, level_req: 60, icon: '🛡️', effect_type: 'defense', effect_value: 50, max_level: 10, upgrade_cost: JSON.stringify({ 1: { spirit_stones: 10000 }, 2: { spirit_stones: 15000 }, 3: { spirit_stones: 22500 }, 4: { spirit_stones: 34000 }, 5: { spirit_stones: 50000 }, 6: { spirit_stones: 75000 }, 7: { spirit_stones: 112500 }, 8: { spirit_stones: 170000 }, 9: { spirit_stones: 255000 }, 10: { spirit_stones: 380000 } }), passive: 1, cooldown: 0 },

    // 辅助类技能
    { id: 'heal', name: '治疗术', category: 'auxiliary', description: '恢复自身或队友的生命', rarity: 1, realm_req: 0, level_req: 1, icon: '💚', effect_type: 'heal', effect_value: 20, max_level: 10, upgrade_cost: JSON.stringify({ 1: { spirit_stones: 100 }, 2: { spirit_stones: 150 }, 3: { spirit_stones: 225 }, 4: { spirit_stones: 340 }, 5: { spirit_stones: 500 }, 6: { spirit_stones: 750 }, 7: { spirit_stones: 1125 }, 8: { spirit_stones: 1700 }, 9: { spirit_stones: 2550 }, 10: { spirit_stones: 3800 } }), passive: 0, cooldown: 15 },
    { id: 'speed_boost', name: '加速术', category: 'auxiliary', description: '提升移动和攻击速度', rarity: 2, realm_req: 1, level_req: 5, icon: '💨', effect_type: 'speed', effect_value: 0.2, max_level: 10, upgrade_cost: JSON.stringify({ 1: { spirit_stones: 300 }, 2: { spirit_stones: 450 }, 3: { spirit_stones: 675 }, 4: { spirit_stones: 1000 }, 5: { spirit_stones: 1500 }, 6: { spirit_stones: 2250 }, 7: { spirit_stones: 3400 }, 8: { spirit_stones: 5100 }, 9: { spirit_stones: 7600 }, 10: { spirit_stones: 11400 } }), passive: 0, cooldown: 30 },
    { id: 'shield_wall', name: '护盾墙', category: 'auxiliary', description: '创建一个吸收伤害的护盾', rarity: 3, realm_req: 4, level_req: 30, icon: '🔰', effect_type: 'shield', effect_value: 100, max_level: 10, upgrade_cost: JSON.stringify({ 1: { spirit_stones: 3000 }, 2: { spirit_stones: 4500 }, 3: { spirit_stones: 6750 }, 4: { spirit_stones: 10100 }, 5: { spirit_stones: 15000 }, 6: { spirit_stones: 22500 }, 7: { spirit_stones: 33750 }, 8: { spirit_stones: 50600 }, 9: { spirit_stones: 75900 }, 10: { spirit_stones: 113900 } }), passive: 0, cooldown: 60 },

    // 被动技能
    { id: 'power Surge', name: '力量爆发', category: 'passive', description: '永久提升攻击力', rarity: 1, realm_req: 0, level_req: 1, icon: '💪', effect_type: 'atk_boost', effect_value: 0.05, max_level: 10, upgrade_cost: JSON.stringify({ 1: { spirit_stones: 100 }, 2: { spirit_stones: 150 }, 3: { spirit_stones: 225 }, 4: { spirit_stones: 340 }, 5: { spirit_stones: 500 }, 6: { spirit_stones: 750 }, 7: { spirit_stones: 1125 }, 8: { spirit_stones: 1700 }, 9: { spirit_stones: 2550 }, 10: { spirit_stones: 3800 } }), passive: 1, cooldown: 0 },
    { id: 'vitality', name: '生机盎然', category: 'passive', description: '永久提升生命上限', rarity: 1, realm_req: 0, level_req: 1, icon: '❤️', effect_type: 'hp_boost', effect_value: 0.1, max_level: 10, upgrade_cost: JSON.stringify({ 1: { spirit_stones: 100 }, 2: { spirit_stones: 150 }, 3: { spirit_stones: 225 }, 4: { spirit_stones: 340 }, 5: { spirit_stones: 500 }, 6: { spirit_stones: 750 }, 7: { spirit_stones: 1125 }, 8: { spirit_stones: 1700 }, 9: { spirit_stones: 2550 }, 10: { spirit_stones: 3800 } }), passive: 1, cooldown: 0 },
    { id: 'spirit_link', name: '灵气链接', category: 'passive', description: '永久提升灵气获取效率', rarity: 2, realm_req: 2, level_req: 15, icon: '🔗', effect_type: 'spirit_boost', effect_value: 0.1, max_level: 10, upgrade_cost: JSON.stringify({ 1: { spirit_stones: 800 }, 2: { spirit_stones: 1200 }, 3: { spirit_stones: 1800 }, 4: { spirit_stones: 2700 }, 5: { spirit_stones: 4000 }, 6: { spirit_stones: 6000 }, 7: { spirit_stones: 9000 }, 8: { spirit_stones: 13500 }, 9: { spirit_stones: 20250 }, 10: { spirit_stones: 30400 } }), passive: 1, cooldown: 0 },
    { id: 'critical_eye', name: '致命之眼', category: 'passive', description: '永久提升暴击率', rarity: 3, realm_req: 4, level_req: 30, icon: '👁️', effect_type: 'crit_boost', effect_value: 0.02, max_level: 10, upgrade_cost: JSON.stringify({ 1: { spirit_stones: 3000 }, 2: { spirit_stones: 4500 }, 3: { spirit_stones: 6750 }, 4: { spirit_stones: 10100 }, 5: { spirit_stones: 15000 }, 6: { spirit_stones: 22500 }, 7: { spirit_stones: 33750 }, 8: { spirit_stones: 50600 }, 9: { spirit_stones: 75900 }, 10: { spirit_stones: 113900 } }), passive: 1, cooldown: 0 },
    { id: 'immortal_body', name: '不灭金身', category: 'passive', description: '大幅提升所有属性', rarity: 5, realm_req: 8, level_req: 80, icon: '🏆', effect_type: 'all_stats', effect_value: 0.2, max_level: 10, upgrade_cost: JSON.stringify({ 1: { spirit_stones: 100000 }, 2: { spirit_stones: 150000 }, 3: { spirit_stones: 225000 }, 4: { spirit_stones: 340000 }, 5: { spirit_stones: 500000 }, 6: { spirit_stones: 750000 }, 7: { spirit_stones: 1125000 }, 8: { spirit_stones: 1700000 }, 9: { spirit_stones: 2550000 }, 10: { spirit_stones: 3800000 } }), passive: 1, cooldown: 0 },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO skills 
    (id, name, category, description, rarity, realm_req, level_req, icon, effect_type, effect_value, max_level, upgrade_cost, passive, cooldown)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of skillsData) {
    stmt.run(
      s.id, s.name, s.category, s.description, s.rarity, s.realm_req, s.level_req,
      s.icon, s.effect_type, s.effect_value, s.max_level, s.upgrade_cost, s.passive, s.cooldown
    );
  }

  Logger.info('技能数据种子完成');
}

// 初始化数据库和数据
initDatabase();
const { runMigrations } = require('./services/database');
runMigrations().catch(err => Logger.info('迁移检查:', err.message));
seedGongfaData();
seedShopData();
createIndexes();

// ============ 世界BOSS系统配置 ============

// BOSS刷新时间配置（每天）
const BOSS_SPAWN_TIMES = ['12:00', '18:00', '21:00'];

// BOSS模板数据
const BOSS_TEMPLATES = [
  { boss_id: 'boss_1', name: '千年古蛟', icon: '🐉', description: '修炼千年的蛟龙，拥有强大的水系法术' },
  { boss_id: 'boss_2', name: '噬天虎王', icon: '🐅', description: '吞噬天地的虎王，力大无穷' },
  { boss_id: 'boss_3', name: '焚天炎帝', icon: '🔥', description: '掌控火焰的帝王，可焚尽万物' },
  { boss_id: 'boss_4', name: '裂天牛魔', icon: '🐂', description: '力可裂天的牛魔，防御力极强' },
  { boss_id: 'boss_5', name: '九尾天狐', icon: '🦊', description: '修炼万年的九尾狐，擅长魅惑之术' }
];

// 获取服务器平均等级
function getServerAverageLevel() {
  const result = db.prepare('SELECT AVG(level) as avg_level FROM player').get();
  return result && result.avg_level ? Math.floor(result.avg_level) : 1;
}

// 计算BOSS等级（基于服务器平均等级）
function calculateBossLevel() {
  const avgLevel = getServerAverageLevel();
  // BOSS等级 = 服务器平均等级 + 5~10级
  return Math.max(1, avgLevel + Math.floor(Math.random() * 6) + 5);
}

// BOSS血量计算
function calculateBossHP(bossLevel) {
  // 基础血量100万，每级增加50万
  return 1000000 + (bossLevel - 1) * 500000;
}

// 检查是否到了BOSS刷新时间
function shouldSpawnBoss() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  // 检查是否有需要刷新的BOSS
  for (const spawnTime of BOSS_SPAWN_TIMES) {
    const [hour] = spawnTime.split(':');
    const spawnEndTime = `${hour}:30`;
    if (currentTime >= spawnTime && currentTime < spawnEndTime) {
      // 检查今天这个时间点是否已经刷过BOSS
      const today = now.toISOString().split('T')[0];
      const existingBoss = db.prepare(`
        SELECT * FROM world_boss 
        WHERE spawn_time LIKE ? AND is_active = 1
      `).get(`${today}%`);
      
      if (!existingBoss) {
        return { shouldSpawn: true, spawnTime };
      }
    }
  }
  return { shouldSpawn: false };
}

// 刷新世界BOSS
function spawnWorldBoss() {
  const { shouldSpawn, spawnTime } = shouldSpawnBoss();
  if (!shouldSpawn) return null;
  
  // 随机选择一个BOSS模板
  const template = BOSS_TEMPLATES[Math.floor(Math.random() * BOSS_TEMPLATES.length)];
  const bossLevel = calculateBossLevel();
  const bossHP = calculateBossHP(bossLevel);
  
  const now = new Date();
  const spawnDatetime = now.toISOString().slice(0, 16).replace('T', ' ') + ':00';
  
  // 先将之前的BOSS标记为不活跃
  db.prepare('UPDATE world_boss SET is_active = 0 WHERE is_active = 1').run();
  
  // 创建新BOSS
  const result = db.prepare(`
    INSERT INTO world_boss (boss_id, name, level, max_hp, current_hp, icon, description, spawn_time, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    template.boss_id + '_' + Date.now(),
    template.name,
    bossLevel,
    bossHP,
    bossHP,
    template.icon,
    template.description,
    spawnDatetime
  );
  
  // 清除之前的伤害记录（如果有）
  db.prepare('DELETE FROM boss_damage_records').run();
  
  console.log(`[世界BOSS] ${template.name} (Lv.${bossLevel}) 已刷新！`);
  
  return {
    id: result.lastInsertRowid,
    boss_id: template.boss_id + '_' + Date.now(),
    name: template.name,
    level: bossLevel,
    max_hp: bossHP,
    current_hp: bossHP
  };
}

// 每分钟检查一次是否需要刷新BOSS
setInterval(() => {
  spawnWorldBoss();
}, 60000);

// 启动时尝试刷新BOSS（如果在刷新时间范围内）
setTimeout(() => {
  spawnWorldBoss();
}, 5000);

// ============ 魔晶系统每日重置任务 ============
// 每日凌晨重置限购次数和免费领取
const lastResetDate = { date: getDateString(), weekday: new Date().getDay() };

setInterval(() => {
  const now = new Date();
  const today = getDateString(now);
  const weekday = now.getDay();

  // 每日重置（0点）
  if (today !== lastResetDate.date) {
    Logger.info('[魔晶] 执行每日重置...');
    // 重置所有玩家的每日限购
    try {
      db.prepare('DELETE FROM player_mc_purchase_records WHERE limit_type = ?').run('daily');
      db.prepare('DELETE FROM player_magic_crystal_daily').run();
      Logger.info('[魔晶] 每日重置完成');
    } catch (e) {
      Logger.error('[魔晶] 每日重置失败:', e.message);
    }

    // 每周重置（周一，weekday=1）
    if (weekday === 1 && lastResetDate.weekday !== 1) {
      Logger.info('[魔晶] 执行每周重置...');
      try {
        db.prepare('DELETE FROM player_mc_purchase_records WHERE limit_type IN (?, ?)').run('weekly', 'monthly');
        Logger.info('[魔晶] 每周重置完成');
      } catch (e) {
        Logger.error('[魔晶] 每周重置失败:', e.message);
      }
    }

    lastResetDate.date = today;
    lastResetDate.weekday = weekday;
  }
}, 60000);

// ============ 认证中间件 ============

// 验证 JWT token 的中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: '未提供认证令牌' });
  }

  // 检查 token 是否在黑名单中
  const blacklisted = db.prepare('SELECT id FROM token_blacklist WHERE token = ?').get(token);
  if (blacklisted) {
    return res.status(401).json({ success: false, error: '令牌已失效' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: '无效的令牌' });
    }
    req.user = user;
    next();
  });
};

// ============ 认证 API ============

// 用户注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ success: false, error: '用户名和密码不能为空' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ success: false, error: '用户名长度需要在 3-20 个字符之间' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: '密码长度至少需要 6 个字符' });
    }

    // 检查用户名是否已存在
    const existingUser = db.prepare('SELECT id FROM accounts WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ success: false, error: '用户名已存在' });
    }

    // 密码加密
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 创建账户
    const result = db.prepare(
      'INSERT INTO accounts (username, password_hash, email) VALUES (?, ?, ?)'
    ).run(username, passwordHash, email || null);

    // 创建游戏角色
    const playerResult = db.prepare(
      'INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)'
    ).run(username, 10000, 1, 0);

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        userId: result.lastInsertRowid,
        playerId: playerResult.lastInsertRowid,
        username
      }
    });
  } catch (error) {
    Logger.error('注册错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ success: false, error: '用户名和密码不能为空' });
    }

    // 查找用户
    const user = db.prepare('SELECT * FROM accounts WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }

    // 查找玩家的游戏角色
    const player = db.prepare('SELECT id FROM player WHERE username = ?').get(username);

    // 生成 JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        userId: user.id,
        playerId: player ? player.id : null,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    Logger.error('登录错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 用户登出（将 token 加入黑名单）
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // 解析 token 获取过期时间
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        const expiresAt = new Date(decoded.exp * 1000).toISOString();
        db.prepare('INSERT INTO token_blacklist (token, expires_at) VALUES (?, ?)').run(token, expiresAt);
      }
    }

    // 更新玩家最后登出时间
    const player = db.prepare('SELECT id FROM player WHERE username = ?').get(req.user.username);
    if (player) {
      db.prepare('UPDATE player SET last_logout_at = ? WHERE id = ?').run(new Date().toISOString(), player.id);
    }

    res.json({ success: true, message: '登出成功' });
  } catch (error) {
    Logger.error('登出错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 获取当前用户信息
app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, email, created_at FROM accounts WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    const player = db.prepare('SELECT id, spirit_stones, level, realm_level FROM player WHERE username = ?').get(user.username);

    res.json({
      success: true,
      data: {
        user,
        player
      }
    });
  } catch (error) {
    Logger.error('获取用户信息错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 创建玩家角色（用于引导完成后）
app.post('/api/player/create', async (req, res) => {
  try {
    const { username, spiritRoot, realm, level } = req.body;
    
    if (!username) {
      return res.status(400).json({ success: false, error: '缺少用户名' });
    }
    
    // 检查是否已存在
    let player = db.prepare('SELECT id FROM player WHERE username = ?').get(username);
    
    if (player) {
      // 玩家已存在，返回现有ID
      return res.json({
        success: true,
        data: {
          playerId: player.id,
          existed: true
        }
      });
    }
    
    // 创建新玩家
    const result = db.prepare(
      'INSERT INTO player (username, spirit_stones, level, realm_level, spirit_root) VALUES (?, ?, ?, ?, ?)'
    ).run(username, 1000, level || 1, 0, spiritRoot || '五行杂灵根');
    
    const newPlayerId = result.lastInsertRowid;
    
    // 初始化玩家的新手引导进度
    // 完成第一步：欢迎来到修仙世界
    db.prepare(`
      INSERT INTO player_tutorial (player_id, step_id, completed, completed_at, updated_at)
      VALUES (?, 'step_1', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(newPlayerId);
    
    // 发放第一步奖励
    db.prepare('UPDATE player SET spirit_stones = spirit_stones + 100 WHERE id = ?').run(newPlayerId);
    
    res.json({
      success: true,
      data: {
        playerId: newPlayerId,
        existed: false,
        reward: { spirit_stones: 100 }
      }
    });
  } catch (error) {
    Logger.error('创建玩家错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// 修改密码
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: '旧密码和新密码不能为空' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: '新密码长度至少需要 6 个字符' });
    }

    // 查找用户
    const user = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    // 验证旧密码
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: '旧密码错误' });
    }

    // 加密新密码
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // 更新密码
    db.prepare('UPDATE accounts SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(passwordHash, req.user.id);

    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    Logger.error('修改密码错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// ============ 任务系统 API ============

// 获取任务列表
app.get('/api/tasks', (req, res) => {
  try {
    const { category, type, player_id } = req.query;
    
    let sql = 'SELECT * FROM tasks';
    const params = [];
    const conditions = [];
    
    if (category) { conditions.push('category = ?'); params.push(category); }
    if (type) { conditions.push('type = ?'); params.push(type); }
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY difficulty ASC, level_req ASC';
    
    const tasks = db.prepare(sql).all(...params);
    
    let playerTasks = {};
    if (player_id) {
      const pt = db.prepare('SELECT task_id, status, progress FROM player_tasks WHERE player_id = ?').all(player_id);
      pt.forEach(t => { playerTasks[t.task_id] = { status: t.status, progress: t.progress }; });
    }
    
    const result = tasks.map(t => ({
      id: t.id,
      name: t.name,
      type: t.type,
      description: t.description,
      category: t.category,
      difficulty: t.difficulty,
      level_req: t.level_req,
      realm_req: t.realm_req,
      icon: t.icon,
      target_type: t.target_type,
      target_id: t.target_id,
      target_count: t.target_count,
      rewards: JSON.parse(t.rewards || '{}'),
      exp: t.exp,
      spirit_stones: t.spirit_stones,
      is_repeatable: t.is_repeatable === 1,
      cooldown_minutes: t.cooldown_minutes,
      player_task: playerTasks[t.id] || null
    }));
    
    // 分类统计
    const stats = {
      total: result.length,
      main: result.filter(t => t.category === 'main').length,
      daily: result.filter(t => t.category === 'daily').length,
      side: result.filter(t => t.category === 'side').length
    };
    
    res.json({ success: true, data: result, stats });
  } catch (error) {
    Logger.error('获取任务列表错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家任务列表
app.get('/api/tasks/:player_id', (req, res) => {
  try {
    const { player_id } = req.params;
    const { status } = req.query;
    
    if (!player_id) return res.status(400).json({ success: false, error: '缺少玩家ID' });
    
    // 确保玩家存在
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }
    
    // 获取玩家所有任务进度
    let playerTasksSql = 'SELECT * FROM player_tasks WHERE player_id = ?';
    const playerTasksParams = [actualPlayerId];
    
    if (status) {
      playerTasksSql += ' AND status = ?';
      playerTasksParams.push(status);
    }
    playerTasksSql += ' ORDER BY updated_at DESC';
    
    const playerTasks = db.prepare(playerTasksSql).all(...playerTasksParams);
    
    // 获取所有任务模板
    const allTasks = db.prepare('SELECT * FROM tasks').all();
    const taskMap = {};
    allTasks.forEach(t => {
      taskMap[t.id] = t;
    });
    
    // 构建返回数据
    const result = playerTasks.map(pt => {
      const task = taskMap[pt.task_id];
      if (!task) return null;
      
      return {
        id: task.id,
        name: task.name,
        type: task.type,
        description: task.description,
        category: task.category,
        difficulty: task.difficulty,
        level_req: task.level_req,
        realm_req: task.realm_req,
        icon: task.icon,
        target_type: task.target_type,
        target_id: task.target_id,
        target_count: task.target_count,
        rewards: JSON.parse(task.rewards || '{}'),
        exp: task.exp,
        spirit_stones: task.spirit_stones,
        is_repeatable: task.is_repeatable === 1,
        status: pt.status,
        progress: pt.progress,
        started_at: pt.started_at,
        completed_at: pt.completed_at,
        claimed_at: pt.claimed_at
      };
    }).filter(t => t !== null);
    
    // 获取可接受的任务（未开始但满足条件的）
    const availableTasks = [];
    for (const task of allTasks) {
      // 检查是否已有记录
      const existing = playerTasks.find(pt => pt.task_id === task.id);
      if (!existing) {
        // 检查是否满足接取条件
        if (player.level >= task.level_req && player.realm_level >= task.realm_req) {
          availableTasks.push({
            id: task.id,
            name: task.name,
            type: task.type,
            description: task.description,
            category: task.category,
            difficulty: task.difficulty,
            level_req: task.level_req,
            realm_req: task.realm_req,
            icon: task.icon,
            target_type: task.target_type,
            target_count: task.target_count,
            rewards: JSON.parse(task.rewards || '{}'),
            exp: task.exp,
            spirit_stones: task.spirit_stones,
            is_repeatable: task.is_repeatable === 1,
            status: 'available'
          });
        }
      }
    }
    
    // 统计
    const taskStats = {
      total: playerTasks.length,
      available: playerTasks.filter(t => t.status === 'available').length,
      in_progress: playerTasks.filter(t => t.status === 'in_progress').length,
      completed: playerTasks.filter(t => t.status === 'completed').length,
      claimed: playerTasks.filter(t => t.status === 'claimed').length
    };
    
    res.json({
      success: true,
      data: {
        player_id: actualPlayerId,
        tasks: result,
        available_tasks: availableTasks,
        stats: taskStats
      }
    });
  } catch (error) {
    Logger.error('获取玩家任务错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 接受任务
app.post('/api/tasks/:task_id/accept', (req, res) => {
  try {
    const { task_id } = req.params;
    const { player_id } = req.body;
    
    if (!player_id) return res.status(400).json({ success: false, error: '缺少玩家ID' });
    
    // 获取任务模板
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task_id);
    if (!task) return res.status(404).json({ success: false, error: '任务不存在' });
    
    // 确保玩家存在
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }
    
    // 检查是否满足接取条件
    if (player.level < task.level_req) {
      return res.status(400).json({ success: false, error: `等级不足，需要${task.level_req}级，当前${player.level}级` });
    }
    if (player.realm_level < task.realm_req) {
      return res.status(400).json({ success: false, error: `境界不足，需要境界等级${task.realm_req}，当前${player.realm_level}` });
    }
    
    // 检查是否已有该任务
    const existing = db.prepare('SELECT * FROM player_tasks WHERE player_id = ? AND task_id = ?').get(actualPlayerId, task_id);
    if (existing) {
      // 如果已完成但可重复，则重置
      if (existing.status === 'completed' && task.is_repeatable === 1) {
        // 检查冷却
        if (task.cooldown_minutes > 0 && existing.completed_at) {
          const completedTime = new Date(existing.completed_at).getTime();
          const now = Date.now();
          const cooldownMs = task.cooldown_minutes * 60 * 1000;
          if (now - completedTime < cooldownMs) {
            const remainingMinutes = Math.ceil((cooldownMs - (now - completedTime)) / 60000);
            return res.status(400).json({ success: false, error: `任务冷却中，需要等待${remainingMinutes}分钟` });
          }
        }
        // 重置任务
        db.prepare(`
          UPDATE player_tasks 
          SET status = 'in_progress', progress = 0, started_at = CURRENT_TIMESTAMP, completed_at = NULL, claimed_at = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE player_id = ? AND task_id = ?
        `).run(actualPlayerId, task_id);
        
        return res.json({
          success: true,
          message: `已接受任务【${task.name}】`,
          data: {
            task_id: task.id,
            task_name: task.name,
            status: 'in_progress',
            progress: 0,
            target_count: task.target_count
          }
        });
      }
      return res.status(400).json({ success: false, error: '已有该任务' });
    }
    
    // 创建新任务记录
    db.prepare(`
      INSERT INTO player_tasks (player_id, task_id, status, progress, started_at)
      VALUES (?, ?, 'in_progress', 0, CURRENT_TIMESTAMP)
    `).run(actualPlayerId, task_id);
    
    res.json({
      success: true,
      message: `已接受任务【${task.name}】`,
      data: {
        task_id: task.id,
        task_name: task.name,
        description: task.description,
        icon: task.icon,
        target_type: task.target_type,
        target_id: task.target_id,
        target_count: task.target_count,
        rewards: JSON.parse(task.rewards || '{}'),
        status: 'in_progress',
        progress: 0
      }
    });
  } catch (error) {
    Logger.error('接受任务错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 完成任务
app.post('/api/tasks/:task_id/complete', (req, res) => {
  try {
    const { task_id } = req.params;
    const { player_id } = req.body;
    
    if (!player_id) return res.status(400).json({ success: false, error: '缺少玩家ID' });
    
    // 获取任务模板
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task_id);
    if (!task) return res.status(404).json({ success: false, error: '任务不存在' });
    
    // 获取玩家任务记录
    const playerTask = db.prepare('SELECT * FROM player_tasks WHERE player_id = ? AND task_id = ?').get(player_id, task_id);
    if (!playerTask) {
      return res.status(400).json({ success: false, error: '未接取该任务' });
    }
    
    if (playerTask.status === 'completed') {
      return res.status(400).json({ success: false, error: '任务已完成，请领取奖励' });
    }
    
    if (playerTask.status === 'claimed') {
      return res.status(400).json({ success: false, error: '任务奖励已领取' });
    }
    
    // 检查任务进度是否满足完成条件
    if (playerTask.progress < task.target_count) {
      return res.status(400).json({ success: false, error: `任务进度不足，需要完成${task.target_count}次，当前${playerTask.progress}次` });
    }
    
    // 更新任务状态为完成
    db.prepare(`
      UPDATE player_tasks 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE player_id = ? AND task_id = ?
    `).run(player_id, task_id);
    
    // 发放奖励
    const rewards = JSON.parse(task.rewards || '{}');
    const claimedRewards = [];
    
    if (rewards.spirit_stones) {
      db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(rewards.spirit_stones, player_id);
      claimedRewards.push({ type: 'spirit_stones', amount: rewards.spirit_stones });
    }
    
    if (rewards.exp) {
      // 这里可以添加经验系统，根据需要实现
      claimedRewards.push({ type: 'exp', amount: rewards.exp });
    }
    
    // 获取更新后的玩家数据
    const updatedPlayer = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    
    res.json({
      success: true,
      message: `任务【${task.name}】完成！`,
      data: {
        task_id: task.id,
        task_name: task.name,
        status: 'completed',
        rewards: claimedRewards,
        player_spirit_stones: updatedPlayer.spirit_stones
      }
    });
  } catch (error) {
    Logger.error('完成任务错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 领取任务奖励（可选，与完成任务合并）
app.post('/api/tasks/:task_id/claim', (req, res) => {
  try {
    const { task_id } = req.params;
    const { player_id } = req.body;
    
    if (!player_id) return res.status(400).json({ success: false, error: '缺少玩家ID' });
    
    // 获取任务模板
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(task_id);
    if (!task) return res.status(404).json({ success: false, error: '任务不存在' });
    
    // 获取玩家任务记录
    const playerTask = db.prepare('SELECT * FROM player_tasks WHERE player_id = ? AND task_id = ?').get(player_id, task_id);
    if (!playerTask) {
      return res.status(400).json({ success: false, error: '未接取该任务' });
    }
    
    if (playerTask.status !== 'completed') {
      return res.status(400).json({ success: false, error: '任务未完成，无法领取奖励' });
    }
    
    if (playerTask.status === 'claimed') {
      return res.status(400).json({ success: false, error: '奖励已领取' });
    }
    
    // 发放奖励
    const rewards = JSON.parse(task.rewards || '{}');
    const claimedRewards = [];
    
    if (rewards.spirit_stones) {
      db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(rewards.spirit_stones, player_id);
      claimedRewards.push({ type: 'spirit_stones', amount: rewards.spirit_stones });
    }
    
    if (rewards.exp) {
      claimedRewards.push({ type: 'exp', amount: rewards.exp });
    }
    
    // 更新任务状态为已领取
    db.prepare(`
      UPDATE player_tasks 
      SET status = 'claimed', claimed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE player_id = ? AND task_id = ?
    `).run(player_id, task_id);
    
    // 获取更新后的玩家数据
    const updatedPlayer = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    
    res.json({
      success: true,
      message: `已领取任务【${task.name}】奖励！`,
      data: {
        task_id: task.id,
        task_name: task.name,
        status: 'claimed',
        rewards: claimedRewards,
        player_spirit_stones: updatedPlayer.spirit_stones
      }
    });
  } catch (error) {
    Logger.error('领取任务奖励错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新任务进度（内部接口）
app.post('/api/tasks/update-progress', (req, res) => {
  try {
    const { player_id, target_type, target_id, amount = 1 } = req.body;
    
    if (!player_id || !target_type) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    // 查找匹配的任务
    let sql = `
      SELECT pt.*, t.target_type, t.target_id, t.target_count 
      FROM player_tasks pt
      JOIN tasks t ON pt.task_id = t.id
      WHERE pt.player_id = ? AND pt.status = 'in_progress' AND t.target_type = ?
    `;
    const params = [player_id, target_type];
    
    if (target_id) {
      sql += ' AND t.target_id = ?';
      params.push(target_id);
    }
    
    const tasks = db.prepare(sql).all(...params);
    
    let updatedCount = 0;
    for (const task of tasks) {
      const newProgress = Math.min(task.progress + amount, task.target_count);
      
      db.prepare(`
        UPDATE player_tasks 
        SET progress = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newProgress, task.id);
      
      // 如果进度满了，自动标记为完成
      if (newProgress >= task.target_count) {
        db.prepare(`
          UPDATE player_tasks 
          SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(task.id);
      }
      
      updatedCount++;
    }
    
    res.json({
      success: true,
      message: `更新了${updatedCount}个任务的进度`,
      data: {
        updated_count: updatedCount
      }
    });
  } catch (error) {
    Logger.error('更新任务进度错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 路由 ============

// 获取功法列表（带缓存优化）
app.get('/api/gongfa/list', (req, res) => {
  try {
    const { type, rarity, player_id } = req.query;
    
    // 构建缓存key（无player_id时使用）
    const cacheKey = `gongfa_${type || 'all'}_${rarity || 'all'}`;
    
    // 如果没有player_id，尝试使用缓存
    let baseData = null;
    if (!player_id) {
      const cached = cache.gongfaList[cacheKey];
      const now = Date.now();
      if (cached && (now - cached.timestamp) < CACHE_TTL) {
        return res.json({ success: true, data: cached.data, cached: true });
      }
      
      // 从数据库获取
      let sql = 'SELECT * FROM gongfa';
      const params = [];
      const conditions = [];
      
      if (type) { conditions.push('type = ?'); params.push(type); }
      if (rarity) { conditions.push('rarity = ?'); params.push(rarity); }
      if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' ORDER BY rarity DESC, realm_req ASC';
      
      baseData = db.prepare(sql).all(...params);
      
      // 缓存结果
      cache.gongfaList[cacheKey] = { data: baseData, timestamp: now };
    }
    
    // 如果有player_id，需要查询玩家的学习状态
    let learnedGongfa = {};
    if (player_id) {
      const learned = db.prepare('SELECT gongfa_id, level, exp FROM player_gongfa WHERE player_id = ?').all(player_id);
      learned.forEach(g => { learnedGongfa[g.gongfa_id] = { level: g.level, exp: g.exp }; });
    }
    
    const result = (baseData || []).map(g => ({
      id: g.id, name: g.name, type: g.type, description: g.description, rarity: g.rarity,
      realm_req: g.realm_req, level_req: g.level_req, icon: g.icon, skill_id: g.skill_id,
      set_bonus: g.set_bonus ? JSON.parse(g.set_bonus) : null,
      base_stats: JSON.parse(g.base_stats), effects: JSON.parse(g.effects),
      max_level: g.max_level, upgrade_cost: JSON.parse(g.upgrade_cost),
      learned: learnedGongfa[g.id] || null
    }));
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 学习功法
app.post('/api/gongfa/learn', (req, res) => {
  try {
    const { player_id, gongfa_id } = req.body;
    if (!player_id || !gongfa_id) return res.status(400).json({ success: false, error: '缺少必要参数' });
    
    const gongfa = db.prepare('SELECT * FROM gongfa WHERE id = ?').get(gongfa_id);
    if (!gongfa) return res.status(404).json({ success: false, error: '功法不存在' });
    
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }
    
    const existing = db.prepare('SELECT * FROM player_gongfa WHERE player_id = ? AND gongfa_id = ?').get(actualPlayerId, gongfa_id);
    if (existing) return res.status(400).json({ success: false, error: '已学习此功法' });
    
    if (player.realm_level < gongfa.realm_req) return res.status(400).json({ success: false, error: '境界不足' });
    if (player.level < gongfa.level_req) return res.status(400).json({ success: false, error: '等级不足' });
    
    let cost = 0;
    try {
      const upgradeCostData = JSON.parse(gongfa.upgrade_cost || '[]');
      cost = upgradeCostData[1]?.spirit_stones || 0;
    } catch (e) {
      return res.status(500).json({ success: false, error: '功法数据异常' });
    }
    if (cost <= 0) return res.status(400).json({ success: false, error: '功法学习费用未设置' });
    if (player.spirit_stones < cost) return res.status(400).json({ success: false, error: '灵石不足' });
    
    db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(cost, actualPlayerId);
    db.prepare('INSERT INTO player_gongfa (player_id, gongfa_id, level, exp) VALUES (?, ?, ?, ?)').run(actualPlayerId, gongfa_id, 1, 0);
    
    // 清除功法列表缓存
    cache.gongfaList = {};
    
    res.json({ success: true, message: `成功学习 ${gongfa.name}`, data: { gongfa_id, level: 1, exp: 0, cost } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 卸下功法
app.post('/api/gongfa/unequip', (req, res) => {
  try {
    const { player_id, slot } = req.body;
    if (!player_id || !slot) return res.status(400).json({ success: false, error: '缺少必要参数' });
    
    const validSlots = ['cultivation', 'attack', 'defense', 'auxiliary', 'passive'];
    if (!validSlots.includes(slot)) return res.status(400).json({ success: false, error: '无效的槽位' });
    
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
    }
    
    const equipped = db.prepare('SELECT * FROM player_gongfa_equipment WHERE player_id = ? AND slot = ?').get(actualPlayerId, slot);
    if (!equipped || !equipped.gongfa_id) return res.json({ success: true, message: '该槽位没有装备功法' });
    
    db.prepare('UPDATE player_gongfa_equipment SET gongfa_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE player_id = ? AND slot = ?').run(actualPlayerId, slot);
    
    const gongfa = db.prepare('SELECT name FROM gongfa WHERE id = ?').get(equipped.gongfa_id);
    res.json({ success: true, message: `已卸下 ${gongfa.name}`, data: { slot, gongfa_id: null } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 升级功法
app.post('/api/gongfa/upgrade', (req, res) => {
  try {
    const { player_id, gongfa_id, use_exp } = req.body;
    if (!player_id || !gongfa_id) return res.status(400).json({ success: false, error: '缺少必要参数' });
    
    const gongfa = db.prepare('SELECT * FROM gongfa WHERE id = ?').get(gongfa_id);
    if (!gongfa) return res.status(404).json({ success: false, error: '功法不存在' });
    
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    if (!player) return res.status(404).json({ success: false, error: '玩家不存在' });
    
    const playerGongfa = db.prepare('SELECT * FROM player_gongfa WHERE player_id = ? AND gongfa_id = ?').get(player.id, gongfa_id);
    if (!playerGongfa) return res.status(400).json({ success: false, error: '未学习此功法' });
    
    const currentLevel = playerGongfa.level;
    if (currentLevel >= gongfa.max_level) return res.status(400).json({ success: false, error: '已达最大等级' });
    
    let upgradeCost = null;
    try {
      const costData = JSON.parse(gongfa.upgrade_cost || '[]');
      upgradeCost = costData[currentLevel + 1];
    } catch (e) {
      return res.status(500).json({ success: false, error: '功法升级数据异常' });
    }
    if (!upgradeCost) return res.status(400).json({ success: false, error: '无法获取升级费用' });
    
    const expRequired = Math.floor(100 * Math.pow(1.3, currentLevel));
    
    if (use_exp && playerGongfa.exp >= expRequired) {
      db.prepare('UPDATE player_gongfa SET level = level + 1, exp = exp - ?, updated_at = CURRENT_TIMESTAMP WHERE player_id = ? AND gongfa_id = ?').run(expRequired, player.id, gongfa_id);
      res.json({ success: true, message: `${gongfa.name} 升级到 ${currentLevel + 1} 级`, data: { level: currentLevel + 1, exp: playerGongfa.exp - expRequired } });
    } else {
      if (player.spirit_stones < upgradeCost.spirit_stones) return res.status(400).json({ success: false, error: '灵石不足' });
      db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(upgradeCost.spirit_stones, player.id);
      db.prepare('UPDATE player_gongfa SET level = level + 1, updated_at = CURRENT_TIMESTAMP WHERE player_id = ? AND gongfa_id = ?').run(player.id, gongfa_id);
      res.json({ success: true, message: `${gongfa.name} 升级到 ${currentLevel + 1} 级`, data: { level: currentLevel + 1, cost: upgradeCost.spirit_stones } });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 装备功法
app.post('/api/gongfa/equip', (req, res) => {
  try {
    const { player_id, gongfa_id, slot } = req.body;
    if (!player_id || !gongfa_id || !slot) return res.status(400).json({ success: false, error: '缺少必要参数' });
    
    const validSlots = ['cultivation', 'attack', 'defense', 'auxiliary', 'passive'];
    if (!validSlots.includes(slot)) return res.status(400).json({ success: false, error: '无效的槽位' });
    
    const gongfa = db.prepare('SELECT * FROM gongfa WHERE id = ?').get(gongfa_id);
    if (!gongfa) return res.status(404).json({ success: false, error: '功法不存在' });
    
    if (gongfa.type !== slot && !(slot === 'passive' && gongfa.type === 'passive')) {
      return res.status(400).json({ success: false, error: '功法类型与槽位不匹配' });
    }
    
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
    }
    
    const learned = db.prepare('SELECT * FROM player_gongfa WHERE player_id = ? AND gongfa_id = ?').get(actualPlayerId, gongfa_id);
    if (!learned) return res.status(400).json({ success: false, error: '未学习此功法' });
    
    db.prepare(`INSERT INTO player_gongfa_equipment (player_id, slot, gongfa_id, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(player_id, slot) DO UPDATE SET gongfa_id = excluded.gongfa_id, updated_at = CURRENT_TIMESTAMP`).run(actualPlayerId, slot, gongfa_id);
    
    res.json({ success: true, message: `已装备 ${gongfa.name} 到 ${slot} 槽位`, data: { slot, gongfa_id } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家功法状态
app.get('/api/gongfa/status', (req, res) => {
  try {
    const { player_id } = req.query;
    if (!player_id) return res.status(400).json({ success: false, error: '缺少 player_id' });
    
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }
    
    const learned = db.prepare('SELECT pg.*, g.name, g.type, g.icon FROM player_gongfa pg JOIN gongfa g ON pg.gongfa_id = g.id WHERE pg.player_id = ?').all(actualPlayerId);
    const equipped = db.prepare('SELECT * FROM player_gongfa_equipment WHERE player_id = ?').all(actualPlayerId);
    
    const equippedMap = {};
    equipped.forEach(e => { equippedMap[e.slot] = e.gongfa_id; });
    
    let bonus = { spirit_rate: 1, atk: 1, def: 1, hp_regen: 1, all_stats: 1, exp_rate: 1, crit_rate: 0, fire_dmg: 0, thunder_dmg: 0, damage_reduction: 0 };
    
    const passiveId = equippedMap['passive'];
    if (passiveId) {
      const passiveGongfa = learned.find(l => l.gongfa_id === passiveId);
      if (passiveGongfa) {
        const effects = JSON.parse(db.prepare('SELECT effects FROM gongfa WHERE id = ?').get(passiveId).effects);
        const effect = effects[passiveGongfa.level];
        if (effect.all_stats) bonus.all_stats *= (1 + effect.all_stats);
      }
    }
    
    for (const slot of ['cultivation', 'attack', 'defense', 'auxiliary']) {
      const gongfaId = equippedMap[slot];
      if (gongfaId) {
        const learnedGongfa = learned.find(l => l.gongfa_id === gongfaId);
        if (learnedGongfa) {
          const gongfaData = db.prepare('SELECT effects FROM gongfa WHERE id = ?').get(gongfaId);
          const effects = JSON.parse(gongfaData.effects);
          const effect = effects[learnedGongfa.level];
          if (effect.spirit_rate) bonus.spirit_rate *= (1 + effect.spirit_rate);
          if (effect.atk) bonus.atk *= (1 + effect.atk);
          if (effect.def) bonus.def *= (1 + effect.def);
          if (effect.hp_regen) bonus.hp_regen *= (1 + effect.hp_regen);
          if (effect.crit_rate) bonus.crit_rate += effect.crit_rate;
          if (effect.fire_dmg) bonus.fire_dmg += effect.fire_dmg;
          if (effect.thunder_dmg) bonus.thunder_dmg += effect.thunder_dmg;
          if (effect.damage_reduction) bonus.damage_reduction += effect.damage_reduction;
          if (effect.exp_rate) bonus.exp_rate *= (1 + effect.exp_rate);
        }
      }
    }
    
    res.json({ success: true, data: { player: { id: player.id, spirit_stones: player.spirit_stones, level: player.level, realm_level: player.realm_level }, learned: learned.map(l => ({ gongfa_id: l.gongfa_id, name: l.name, type: l.type, icon: l.icon, level: l.level, exp: l.exp })), equipped: equippedMap, bonus } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取技能详情
app.get('/api/gongfa/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { player_id } = req.query;
    
    const gongfa = db.prepare('SELECT * FROM gongfa WHERE id = ?').get(id);
    if (!gongfa) return res.status(404).json({ success: false, error: '功法不存在' });
    
    let learned = null;
    if (player_id) learned = db.prepare('SELECT level, exp FROM player_gongfa WHERE player_id = ? AND gongfa_id = ?').get(player_id, id);
    
    res.json({ success: true, data: { id: gongfa.id, name: gongfa.name, type: gongfa.type, description: gongfa.description, rarity: gongfa.rarity, realm_req: gongfa.realm_req, level_req: gongfa.level_req, icon: gongfa.icon, skill_id: gongfa.skill_id, set_bonus: gongfa.set_bonus ? JSON.parse(gongfa.set_bonus) : null, base_stats: JSON.parse(gongfa.base_stats), effects: JSON.parse(gongfa.effects), max_level: gongfa.max_level, upgrade_cost: JSON.parse(gongfa.upgrade_cost), learned } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 技能系统 API (skills) ============

// 获取所有功法列表（攻击、防御、辅助类）
app.get('/api/skills', (req, res) => {
  try {
    const { category, rarity, player_id } = req.query;
    
    let sql = 'SELECT * FROM skills';
    const params = [];
    const conditions = [];
    
    if (category) { conditions.push('category = ?'); params.push(category); }
    if (rarity) { conditions.push('rarity = ?'); params.push(rarity); }
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY rarity DESC, realm_req ASC';
    
    const skillsList = db.prepare(sql).all(...params);
    
    let learnedSkills = {};
    if (player_id) {
      const learned = db.prepare('SELECT skill_id, level, exp FROM player_skills WHERE player_id = ?').all(player_id);
      learned.forEach(s => { learnedSkills[s.skill_id] = { level: s.level, exp: s.exp }; });
    }
    
    const result = skillsList.map(s => ({
      id: s.id, name: s.name, category: s.category, description: s.description,
      rarity: s.rarity, realm_req: s.realm_req, level_req: s.level_req,
      icon: s.icon, effect_type: s.effect_type, effect_value: s.effect_value,
      max_level: s.max_level, upgrade_cost: JSON.parse(s.upgrade_cost),
      passive: s.passive, cooldown: s.cooldown,
      learned: learnedSkills[s.id] || null
    }));
    
    // 分类统计
    const stats = {
      total: result.length,
      attack: result.filter(s => s.category === 'attack').length,
      defense: result.filter(s => s.category === 'defense').length,
      auxiliary: result.filter(s => s.category === 'auxiliary').length,
      passive: result.filter(s => s.category === 'passive').length
    };
    
    res.json({ success: true, data: result, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取技能列表（兼容旧版）
app.get('/api/skills/list', (req, res) => {
  try {
    const { category, rarity, player_id } = req.query;
    
    let sql = 'SELECT * FROM skills';
    const params = [];
    const conditions = [];
    
    if (category) { conditions.push('category = ?'); params.push(category); }
    if (rarity) { conditions.push('rarity = ?'); params.push(rarity); }
    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY rarity DESC, realm_req ASC';
    
    const skillsList = db.prepare(sql).all(...params);
    
    let learnedSkills = {};
    if (player_id) {
      const learned = db.prepare('SELECT skill_id, level, exp FROM player_skills WHERE player_id = ?').all(player_id);
      learned.forEach(s => { learnedSkills[s.skill_id] = { level: s.level, exp: s.exp }; });
    }
    
    const result = skillsList.map(s => ({
      id: s.id, name: s.name, category: s.category, description: s.description,
      rarity: s.rarity, realm_req: s.realm_req, level_req: s.level_req,
      icon: s.icon, effect_type: s.effect_type, effect_value: s.effect_value,
      max_level: s.max_level, upgrade_cost: JSON.parse(s.upgrade_cost),
      passive: s.passive, cooldown: s.cooldown,
      learned: learnedSkills[s.id] || null
    }));
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家技能列表
app.get('/api/skills/:player_id', (req, res) => {
  try {
    const { player_id } = req.params;
    
    if (!player_id) return res.status(400).json({ success: false, error: '缺少玩家ID' });
    
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    if (!player) return res.json({ success: true, data: { player_id, skills: [] } });
    
    const playerSkills = db.prepare(`
      SELECT ps.*, s.name, s.category, s.description, s.rarity, s.realm_req, s.level_req,
             s.icon, s.effect_type, s.effect_value, s.max_level, s.upgrade_cost, s.passive, s.cooldown
      FROM player_skills ps
      JOIN skills s ON ps.skill_id = s.id
      WHERE ps.player_id = ?
    `).all(player_id);
    
    const result = playerSkills.map(ps => ({
      id: ps.skill_id, name: ps.name, category: ps.category, description: ps.description,
      rarity: ps.rarity, realm_req: ps.realm_req, level_req: ps.level_req,
      icon: ps.icon, effect_type: ps.effect_type, effect_value: ps.effect_value,
      max_level: ps.max_level, upgrade_cost: JSON.parse(ps.upgrade_cost),
      passive: ps.passive, cooldown: ps.cooldown,
      level: ps.level, exp: ps.exp, learned_at: ps.learned_at
    }));
    
    res.json({ success: true, data: { player_id, skills: result } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 学习技能
app.post('/api/skills/learn', (req, res) => {
  try {
    const { player_id, skill_id } = req.body;
    
    if (!player_id || !skill_id) return res.status(400).json({ success: false, error: '缺少必要参数' });
    
    const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(skill_id);
    if (!skill) return res.status(404).json({ success: false, error: '技能不存在' });
    
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }
    
    const existing = db.prepare('SELECT * FROM player_skills WHERE player_id = ? AND skill_id = ?').get(actualPlayerId, skill_id);
    if (existing) return res.status(400).json({ success: false, error: '已学习此技能' });
    
    if (player.realm_level < skill.realm_req) return res.status(400).json({ success: false, error: '境界不足' });
    if (player.level < skill.level_req) return res.status(400).json({ success: false, error: '等级不足' });
    
    const cost = JSON.parse(skill.upgrade_cost)[1].spirit_stones;
    if (player.spirit_stones < cost) return res.status(400).json({ success: false, error: '灵石不足' });
    
    db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(cost, actualPlayerId);
    db.prepare('INSERT INTO player_skills (player_id, skill_id, level, exp) VALUES (?, ?, ?, ?)').run(actualPlayerId, skill_id, 1, 0);
    
    res.json({ success: true, message: `成功学习 ${skill.name}`, data: { skill_id, level: 1, exp: 0, cost } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 升级技能
app.post('/api/skills/:skill_id/upgrade', (req, res) => {
  try {
    const { skill_id } = req.params;
    const { player_id } = req.body;
    
    if (!player_id) return res.status(400).json({ success: false, error: '缺少玩家ID' });
    
    const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(skill_id);
    if (!skill) return res.status(404).json({ success: false, error: '技能不存在' });
    
    const playerSkill = db.prepare('SELECT * FROM player_skills WHERE player_id = ? AND skill_id = ?').get(player_id, skill_id);
    if (!playerSkill) return res.status(400).json({ success: false, error: '未学习此技能' });
    
    const currentLevel = playerSkill.level;
    if (currentLevel >= skill.max_level) return res.status(400).json({ success: false, error: '技能已达最高等级' });
    
    const upgradeCosts = JSON.parse(skill.upgrade_cost);
    const nextLevel = currentLevel + 1;
    const cost = upgradeCosts[nextLevel]?.spirit_stones || 0;
    
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    if (!player) return res.status(404).json({ success: false, error: '玩家不存在' });
    
    if (player.spirit_stones < cost) return res.status(400).json({ success: false, error: '灵石不足' });
    
    db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(cost, player_id);
    db.prepare('UPDATE player_skills SET level = ?, exp = 0, updated_at = CURRENT_TIMESTAMP WHERE player_id = ? AND skill_id = ?').run(nextLevel, player_id, skill_id);
    
    res.json({ success: true, message: `${skill.name} 升级到 ${nextLevel} 级`, data: { skill_id, level: nextLevel, exp: 0, cost } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 存储 API - 游戏数据持久化
try {
  const storageApi = require('./game/server.storage');
  app.use('/api/storage', storageApi);
} catch (e) {
  Logger.info('存储API不可用:', e.message);
}

// 宗门系统 API
try {
  const sectApi = require('./game/sect_api');
  app.use('/api/sect', sectApi);
  // 兼容前端复数形式路由
  app.use('/api/sects', sectApi);
  Logger.info('✅ 宗门系统 API 已加载');
} catch (e) {
  Logger.info('宗门API不可用:', e.message);
}

// 竞技场/仙道大会系统 API（routes/arena.js）
try {
  const arenaApi = require('./backend/routes/arena');
  app.use('/api/arena', arenaApi);
  Logger.info('✅ 竞技场系统 API 已加载 (routes/arena.js)');
  // 新战斗系统 API (基于战斗引擎)
  try {
    const battleApi = require('./game/battle_api');
    app.use('/api/battle', battleApi);
    Logger.info('✅ 新战斗系统 API 已加载 (game/battle_api.js)');
  } catch (e) {
    Logger.info('新战斗API不可用:', e.message);
  }
} catch (e) {
  Logger.info('竞技场API不可用:', e.message);
}

// ============ 副本系统 API ============
try {
  const dungeonApi = require('./game/dungeon_api');
  app.use('/api/dungeon', dungeonApi);
  Logger.info('✅ 副本系统 API 已加载 (game/dungeon_api.js)');
} catch (e) {
  Logger.warn('⚠ 副本API不可用:', e.message);
}

// 仙盟系统 API (SQLite持久化版本)
try {
  const guildRoute = require('./backend/routes/guild');
  if (db) guildRoute.setDb(db);
  app.use('/api/guild', guildRoute);
  Logger.info('✅ 仙盟系统 API 已加载 (SQLite)');
} catch (e) {
  Logger.info('仙盟API不可用:', e.message);
}

// 仙术系统 API
try {
  const immortalArtApi = require('./services/immortal_art_api');
  app.use('/api/immortalArt', immortalArtApi);
  app.use('/api/immortal_art', immortalArtApi);
  Logger.info('✅ 仙术系统 API 已加载');
} catch (e) {
  Logger.info('仙术API不可用:', e.message);
}

// 世界BOSS系统 API
try {
  const worldbossApi = require('./backend/routes/worldboss');
  app.use('/api/worldboss', worldbossApi);
  Logger.info('✅ 世界BOSS系统 API 已加载');

  // 仙侠奇遇系统 API
  try {
    const adventureRoute = require('./backend/routes/adventure');
    adventureRoute(app, db, authenticateToken, Logger);
    Logger.info('✅ 奇遇系统 API 已加载');
  } catch (e) {
    Logger.info('奇遇API不可用:', e.message);
  }
} catch (e) {
  Logger.info('世界BOSS API不可用:', e.message);
}

// 封魔渊/深渊副本 API（abyss.js 已实现完整逻辑）
try {
  const abyssApi = require('./backend/routes/abyss');
  app.use('/api/abyss', abyssApi);
  // 兼容 /api/abyssDungeon 别名
  app.use('/api/abyssDungeon', abyssApi);
  Logger.info('✅ 封魔渊系统 API 已加载');
} catch (e) {
  Logger.info('封魔渊 API 不可用:', e.message);
}

// 心魔幻境深渊副本 API
try {
  const heartDemonApi = require('./backend/routes/heart_demon');
  app.use('/api/heartDemon', heartDemonApi);
  // 兼容别名
  app.use('/api/heart_demon', heartDemonApi);
  Logger.info('✅ 心魔幻境系统 API 已加载');
} catch (e) {
  Logger.info('心魔幻境 API 不可用:', e.message);
}

// 排行榜 API
try {
  const rankApi = require('./backend/routes/rank');
  app.use('/api/rank', rankApi);
  Logger.info('✅ 排行榜系统 API 已加载');
} catch (e) {
  Logger.info('排行榜 API 不可用:', e.message);
}

// 宗门战系统 API
try {
  const sectWarApi = require('./game/sect_war');
  app.use('/api/sect-war', sectWarApi);
  Logger.info('✅ 宗门战系统 API 已加载');
} catch (e) {
  Logger.info('宗门战API不可用:', e.message);
}

// 灵石消耗系统 API
try {
  const expenseApi = require('./game/expense_api');
  app.use('/api/expense', expenseApi);
  Logger.info('✅ 灵石消耗系统 API 已加载');
} catch (e) {
  Logger.info('灵石消耗API不可用:', e.message);
}

// 炼器系统 API (包含装备分解功能)
try {
  const forgeApi = require('./game/forge_api');
  app.use('/api/forge', forgeApi);
  Logger.info('✅ 炼器系统 API 已加载');
} catch (e) {
  Logger.info('炼器API不可用:', e.message);
}

// 丹药系统 API
try {
  const alchemyApi = require('./game/alchemy_api');
  app.use('/api/alchemy', alchemyApi);
  Logger.info('✅ 丹药系统 API 已加载');
} catch (e) {
  Logger.info('丹药API不可用:', e.message);
}

// 灵石消耗统一API（包含日志查询）
try {
  const lingshiApi = require('./game/lingshi_api');
  app.use('/api/player', lingshiApi);
  Logger.info('✅ 灵石统一API (/player) 已加载');
} catch (e) {
  Logger.info('灵石统一API不可用:', e.message);
}

// 境界副本 API
try {
  const realmDungeonApi = require('./game/realm_dungeon_system');
  // 将境界副本功能注册为 API 路由
  app.get('/api/realm-dungeon/list', (req, res) => {
    // 获取可用的境界副本列表
    const available = [];
    try {
      const realmDungeonModule = require('./game/realm_dungeon_system');
      const REALM_DUNGEON_DATA = realmDungeonModule.REALM_DUNGEON_DATA || {};
      for (const [realm, data] of Object.entries(REALM_DUNGEON_DATA)) {
        available.push({ id: realm, ...data });
      }
    } catch (e) {
      Logger.error('获取境界副本列表失败:', e);
    }
    res.json({ success: true, data: available });
  });
  Logger.info('✅ 境界副本 API 已加载');
} catch (e) {
  Logger.info('境界副本API不可用:', e.message);
}

// ============ 新手引导系统 API ============
try {
  const tutorialApi = require('./game/tutorial_api');
  app.use('/api/tutorial', tutorialApi);
  Logger.info('✅ 新手引导系统 API 已加载');
} catch (e) {
  Logger.info('新手引导API不可用:', e.message);
}

// ============ 剧情系统 API ============
try {
  const storyApi = require('./game/story_api');
  app.use('/api/story', storyApi);
  console.log('✅ 剧情系统 API 已加载');
} catch (e) {
  console.log('剧情API不可用:', e.message);
}

// ============ 离线收益系统 API ============
try {
  const offlineIncomeApi = require('./game/offline_income_api');
  app.use('/api/offline-income', offlineIncomeApi);
  console.log('✅ 离线收益系统 API 已加载');
} catch (e) {
  console.log('离线收益API不可用:', e.message);
}

// ============ 器灵系统 API ============
try {
  const spiritArtifactApi = require('./game/spirit_artifact_api');
  app.use('/api/spirit-artifact', spiritArtifactApi);
  console.log('✅ 器灵系统 API 已加载');
} catch (e) {
  console.log('器灵API不可用:', e.message);
}

// ============ 器灵数据 API (spirit_system) ============
try {
  const spiritRoute = require('./backend/routes/spirit');
  app.use('/api/spirit', spiritRoute);
  console.log('✅ 器灵数据 API 已加载 (backend/routes/spirit.js)');
} catch (e) {
  console.log('器灵数据API不可用:', e.message);
}

// ============ 天梯系统 API ============
try {
  const ladderApi = require('./game/ladder_api');
  app.use('/api/ladder', ladderApi);
  console.log('✅ 天梯系统 API 已加载');
} catch (e) {
  console.log('天梯API不可用:', e.message);
}

// ============ 天梯赛季系统 API ============
try {
  const ladderSeasonRoute = require('./backend/routes/ladder_season');
  app.use('/api/ladder-season', ladderSeasonRoute);
  console.log('✅ 天梯赛季系统 API 已加载');
} catch (e) {
  console.log('天梯赛季API不可用:', e.message);
}

// ============ 灵石兑换系统 API ============
try {
  const spiritStoneExchange = require('./game/spirit_stone_exchange');
  app.use('/api/spirit-stone', spiritStoneExchange);
  console.log('✅ 灵石兑换系统 API 已加载');
} catch (e) {
  console.log('灵石兑换API不可用:', e.message);
}

// ============ 封神榜系统 API ============
try {
  const deityListApi = require('./game/deity_list_api');
  app.use('/api/deity-list', deityListApi);
  console.log('✅ 封神榜系统 API 已加载');
} catch (e) {
  console.log('封神榜API不可用:', e.message);
}

// ============ 宝石系统 API ============
try {
  const gemStorage = require('./game/gem_storage');
  gemStorage.initGemTables().catch(err => Logger.info('宝石表初始化:', err.message));
  gemStorage.seedInitialGems().catch(err => Logger.info('宝石种子数据:', err.message));
  
  const gemApi = require('./game/gem_api');
  app.use('/api/gem', gemApi);
  Logger.info('✅ 宝石系统 API 已加载');
} catch (e) {
  Logger.info('宝石API不可用:', e.message);
}

// ============ 经脉系统 API ============
try {
  const meridianSystem = require('./game/meridian_system');
  meridianSystem.registerMeridianRoutes(app);
  Logger.info('✅ 经脉系统 API 已加载');
} catch (e) {
  Logger.info('经脉系统API不可用:', e.message);
}

// ============ 每日副本系统 API ============
try {
  const dailyDungeonApi = require('./game/daily_dungeon');
  app.use('/api/daily-dungeon', dailyDungeonApi);
  Logger.info('✅ 每日副本系统 API 已加载');
} catch (e) {
  Logger.info('每日副本API不可用:', e.message);
}

// ============ 无尽塔系统 API ============
try {
  const towerApi = require('./backend/routes/tower');
  app.use('/api/tower', towerApi);
  app.use('/api/towerDungeon', towerApi);
  Logger.info('✅ 无尽塔系统 API 已加载');
} catch (e) {
  Logger.info('无尽塔API不可用:', e.message);
}

// ============ 灵兽装备系统 API ============
try {
  const beastEquipmentApi = require('./game/beast_equipment');
  app.use('/api/beast/equipment', beastEquipmentApi);
  Logger.info('✅ 灵兽装备系统 API 已加载');
} catch (e) {
  Logger.info('灵兽装备API不可用:', e.message);
}

// ============ 性能优化模块 ============
try {
  const performance = require('./game/performance');
  // 导出到全局，供各 API 模块使用
  global.gamePerformance = performance;
  Logger.info('✅ 性能优化模块已加载');
} catch (e) {
  Logger.info('性能优化模块不可用:', e.message);
}

// ============ 缓存管理 API ============
try {
  const cacheApi = require('./game/cache_api');
  app.use('/api/cache', cacheApi);
  
  // 启动缓存定期清理
  const cache = require('./game/cache');
  cache.startCleanup(60000);
  Logger.info('✅ 缓存管理 API 已加载');
} catch (e) {
  Logger.info('缓存管理API不可用:', e.message);
}

// ============ 福利系统 API（每日签到/月卡）============
try {
  const welfareApi = require('./services/welfare_api');
  app.use('/api/welfare', welfareApi);
  Logger.info('✅ 福利系统 API 已加载');
} catch (e) {
  Logger.info('福利API不可用:', e.message);
}

// ============ 会员/月卡系统 API ============
try {
  const membershipApi = require('./backend/routes/membership');
  app.use('/api/membership', membershipApi);
  Logger.info('✅ 会员月卡系统 API 已加载');
} catch (e) {
  Logger.info('会员API不可用:', e.message);
}

// ============ 首充双倍系统 API ============
try {
  const firstRechargeApi = require('./services/first_recharge');
  app.use('/api/first-recharge', firstRechargeApi);
  Logger.info('✅ 首充双倍系统 API 已加载');
} catch (e) {
  Logger.info('首充API不可用:', e.message);
}

// ============ 称号系统 API ============
try {
  const titleApi = require('./backend/routes/title');
  app.use('/api/title', titleApi);
  Logger.info('✅ 称号系统 API 已加载');
} catch (e) {
  Logger.info('称号API不可用:', e.message);
}

// ============ 灵石引导系统 API ============
try {
  const lingdaoApi = require('./backend/routes/lingdao');
  app.use('/api/lingdao', lingdaoApi);
  Logger.info('✅ 灵石引导系统 API 已加载');
} catch (e) {
  Logger.info('灵石引导API不可用:', e.message);
}

// ============ 每日任务 API ============
try {
  const dailyQuestApi = require('./backend/routes/dailyQuest');
  app.use('/api/dailyQuest', dailyQuestApi);
  Logger.info('✅ 每日任务 API 已加载');
} catch (e) {
  Logger.info('每日任务API不可用:', e.message);
}

// ============ 渡劫系统 API ============
try {
  const tribulationApi = require('./backend/routes/tribulation');
  tribulationApi.configure({
    TRIBULATION_TYPES,
    DIFFICULTY_CONFIG,
    PROTECTION_ITEMS,
    REALMS,
    db
  });
  app.use('/api/tribulation', tribulationApi);
  Logger.info('✅ 渡劫系统 API 已加载（动画阶段 + 飞升奖励）');
} catch (e) {
  Logger.info('渡劫系统API不可用:', e.message);
}

// ============ 灵兽出战系统 API ============
try {
  const beastApi = require('./backend/routes/beast');
  app.use('/api/beast', beastApi);
  Logger.info('✅ 灵兽出战系统 API 已加载');
} catch (e) {
  Logger.info('灵兽出战系统API不可用:', e.message);
}

// ============ 交易市场系统 API ============
try {
  const tradeApi = require('./backend/routes/trade');
  app.use('/api/trade', tradeApi);
  Logger.info('✅ 交易市场系统 API 已加载');
} catch (e) {
  Logger.info('交易市场API不可用:', e.message);
}

// ============ 位面之子 Buff 系统 API ============
try {
  const buffApi = require('./services/buff_api');
  app.use('/api/buff', buffApi);
  Logger.info('✅ 位面之子 Buff 系统 API 已加载');
} catch (e) {
  Logger.info('Buff系统API不可用:', e.message);
}

// ============ 仙侣系统 API ============

// 亲密度等级配置
const INTIMACY_LEVELS = [
  { level: '萍水', min: 0, max: 499, title: '初识', spirit_bonus: 0.05, exp_bonus: 0.05 },
  { level: '知己', min: 500, max: 1999, title: '知己', spirit_bonus: 0.10, exp_bonus: 0.10 },
  { level: '伴侣', min: 2000, max: 4999, title: '道侣', spirit_bonus: 0.15, exp_bonus: 0.15 },
  { level: '神仙眷侣', min: 5000, max: 9999, title: '神仙眷侣', spirit_bonus: 0.25, exp_bonus: 0.25 },
  { level: '天作之合', min: 10000, max: 999999, title: '天作之合', spirit_bonus: 0.40, exp_bonus: 0.40 }
];

// 获取亲密度等级信息
function getIntimacyLevel(intimacy) {
  for (const level of INTIMACY_LEVELS) {
    if (intimacy >= level.min && intimacy <= level.max) {
      return level;
    }
  }
  return INTIMACY_LEVELS[0];
}

// 申请结缘
app.post('/api/partner/apply', (req, res) => {
  try {
    const { player_id, target_id } = req.body;
    
    if (!player_id || !target_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 player_id 或 target_id' });
    }
    
    if (player_id === target_id) {
      return res.status(400).json({ success: false, error: '不能与自己结缘' });
    }
    
    // 获取或创建玩家
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }
    
    // 获取目标玩家
    let target = db.prepare('SELECT * FROM player WHERE id = ?').get(target_id);
    let actualTargetId = target_id;
    
    if (!target) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${target_id}`, 10000, 1, 0);
      actualTargetId = result.lastInsertRowid;
      target = db.prepare('SELECT * FROM player WHERE id = ?').get(actualTargetId);
    }
    
    // 检查结缘条件
    // 1. 等级要求：炼气期三层 (level >= 3)
    if (player.level < 3) {
      return res.status(400).json({ success: false, error: '等级不足，需要达到炼气期三层' });
    }
    if (target.level < 3) {
      return res.status(400).json({ success: false, error: '对方等级不足，需要达到炼气期三层' });
    }
    
    // 2. 友好度要求 1000
    if (player.friendship < 1000) {
      return res.status(400).json({ success: false, error: '友好度不足，需要达到1000' });
    }
    if (target.friendship < 1000) {
      return res.status(400).json({ success: false, error: '对方友好度不足，需要达到1000' });
    }
    
    // 3. 检查是否已有伴侣
    const existingPartner = db.prepare(`
      SELECT * FROM player_partners 
      WHERE (player_id = ? OR partner_id = ?) 
      AND status = 'active'
    `).get(actualPlayerId, actualPlayerId);
    
    if (existingPartner) {
      return res.status(400).json({ success: false, error: '您已有仙侣伴侣' });
    }
    
    const targetPartner = db.prepare(`
      SELECT * FROM player_partners 
      WHERE (player_id = ? OR partner_id = ?) 
      AND status = 'active'
    `).get(actualTargetId, actualTargetId);
    
    if (targetPartner) {
      return res.status(400).json({ success: false, error: '对方已有仙侣伴侣' });
    }
    
    // 4. 灵石费用
    const marriageCost = 1000;
    if (player.spirit_stones < marriageCost) {
      return res.status(400).json({ success: false, error: '灵石不足，需要1000灵石作为结婚费用' });
    }
    
    // 检查是否已有待处理的申请
    const existingApp = db.prepare(`
      SELECT * FROM partner_applications 
      WHERE applicant_id = ? AND target_id = ? AND status = 'pending'
    `).get(actualPlayerId, actualTargetId);
    
    if (existingApp) {
      return res.status(400).json({ success: false, error: '已有待处理的结缘申请' });
    }
    
    // 扣除灵石并创建申请
    db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(marriageCost, actualPlayerId);
    
    db.prepare(`
      INSERT OR REPLACE INTO partner_applications (applicant_id, target_id, status)
      VALUES (?, ?, 'pending')
    `).run(actualPlayerId, actualTargetId);
    
    res.json({
      success: true,
      message: '结缘申请已发送，等待对方确认',
      data: {
        applicant_id: actualPlayerId,
        target_id: actualTargetId,
        cost: marriageCost,
        remaining_spirit_stones: player.spirit_stones - marriageCost
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 接受结缘
app.post('/api/partner/accept', (req, res) => {
  try {
    const { player_id, applicant_id } = req.body;
    
    if (!player_id || !applicant_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 player_id 或 applicant_id' });
    }
    
    // 获取玩家
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }
    
    // 获取申请人
    let applicant = db.prepare('SELECT * FROM player WHERE id = ?').get(applicant_id);
    let actualApplicantId = applicant_id;
    
    if (!applicant) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${applicant_id}`, 10000, 1, 0);
      actualApplicantId = result.lastInsertRowid;
      applicant = db.prepare('SELECT * FROM player WHERE id = ?').get(actualApplicantId);
    }
    
    // 检查申请是否存在
    const application = db.prepare(`
      SELECT * FROM partner_applications 
      WHERE applicant_id = ? AND target_id = ? AND status = 'pending'
    `).get(actualApplicantId, actualPlayerId);
    
    if (!application) {
      return res.status(400).json({ success: false, error: '没有待处理的结缘申请' });
    }
    
    // 检查双方是否已有伴侣
    const existingPartner = db.prepare(`
      SELECT * FROM player_partners 
      WHERE (player_id = ? OR partner_id = ?) 
      AND status = 'active'
    `).get(actualPlayerId, actualPlayerId);
    
    if (existingPartner) {
      return res.status(400).json({ success: false, error: '您已有仙侣伴侣' });
    }
    
    const applicantPartner = db.prepare(`
      SELECT * FROM player_partners 
      WHERE (player_id = ? OR partner_id = ?) 
      AND status = 'active'
    `).get(actualApplicantId, actualApplicantId);
    
    if (applicantPartner) {
      return res.status(400).json({ success: false, error: '对方已有仙侣伴侣' });
    }
    
    // 创建仙侣关系
    const intimacyLevel = getIntimacyLevel(0);
    
    db.prepare(`
      INSERT INTO player_partners (player_id, partner_id, intimacy, intimacy_level, status)
      VALUES (?, ?, 0, ?, 'active')
    `).run(actualPlayerId, actualApplicantId, intimacyLevel.level);
    
    db.prepare(`
      INSERT INTO player_partners (player_id, partner_id, intimacy, intimacy_level, status)
      VALUES (?, ?, 0, ?, 'active')
    `).run(actualApplicantId, actualPlayerId, intimacyLevel.level);
    
    // 更新申请状态
    db.prepare(`
      UPDATE partner_applications 
      SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
      WHERE applicant_id = ? AND target_id = ?
    `).run(actualApplicantId, actualPlayerId);
    
    res.json({
      success: true,
      message: '恭喜！成功结为仙侣伴侣',
      data: {
        partner_id: actualApplicantId,
        partner_name: applicant.username,
        intimacy: 0,
        intimacy_level: intimacyLevel.level,
        title: intimacyLevel.title,
        spirit_bonus: intimacyLevel.spirit_bonus,
        exp_bonus: intimacyLevel.exp_bonus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 拒绝结缘
app.post('/api/partner/reject', (req, res) => {
  try {
    const { player_id, application_id } = req.body;
    if (!player_id || !application_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    const result = db.prepare(`DELETE FROM partner_applications WHERE id = ? AND target_id = ? AND status = 'pending'`).run(application_id, player_id);
    if (result.changes === 0) {
      return res.status(400).json({ success: false, error: '申请不存在或已被处理' });
    }
    res.json({ success: true, message: '已拒绝结缘申请' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取仙侣状态
app.get('/api/partner/status', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    // 获取玩家
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }
    
    // 查找仙侣关系
    const partnerRel = db.prepare(`
      SELECT * FROM player_partners 
      WHERE player_id = ? AND status = 'active'
    `).get(actualPlayerId);
    
    if (!partnerRel) {
      return res.json({
        success: true,
        data: {
          has_partner: false,
          player: {
            id: player.id,
            username: player.username,
            level: player.level,
            realm_level: player.realm_level,
            realm_name: REALMS[player.realm_level]?.name || '炼气期',
            online_status: player.online_status
          },
          pending_application: null
        }
      });
    }
    
    // 获取伴侣信息
    const partner = db.prepare('SELECT * FROM player WHERE id = ?').get(partnerRel.partner_id);
    
    if (!partner) {
      return res.status(500).json({ success: false, error: '伴侣数据异常' });
    }
    
    // 获取待处理的申请
    const pendingApp = db.prepare(`
      SELECT pa.*, p.username as applicant_name 
      FROM partner_applications pa
      JOIN player p ON pa.applicant_id = p.id
      WHERE pa.target_id = ? AND pa.status = 'pending'
    `).get(actualPlayerId);
    
    const intimacyLevel = getIntimacyLevel(partnerRel.intimacy);
    
    res.json({
      success: true,
      data: {
        has_partner: true,
        player: {
          id: player.id,
          username: player.username,
          level: player.level,
          realm_level: player.realm_level,
          realm_name: REALMS[player.realm_level]?.name || '炼气期',
          online_status: player.online_status
        },
        partner: {
          id: partner.id,
          username: partner.username,
          level: partner.level,
          realm_level: partner.realm_level,
          realm_name: REALMS[partner.realm_level]?.name || '炼气期',
          online_status: partner.online_status
        },
        intimacy: partnerRel.intimacy,
        intimacy_level: partnerRel.intimacy_level,
        title: intimacyLevel.title,
        spirit_bonus: intimacyLevel.spirit_bonus,
        exp_bonus: intimacyLevel.exp_bonus,
        marriage_date: partnerRel.marriage_date,
        double_cultivate_count: partnerRel.double_cultivate_count,
        daily_double_cultivate_used: partnerRel.daily_double_cultivate_used,
        last_double_cultivate: partnerRel.last_double_cultivate,
        pending_application: pendingApp ? {
          id: pendingApp.id,
          applicant_id: pendingApp.applicant_id,
          applicant_name: pendingApp.applicant_name,
          created_at: pendingApp.created_at
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 双修
app.post('/api/partner/doublecultivate', (req, res) => {
  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    // 获取玩家
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }
    
    // 查找仙侣关系
    const partnerRel = db.prepare(`
      SELECT * FROM player_partners 
      WHERE player_id = ? AND status = 'active'
    `).get(actualPlayerId);
    
    if (!partnerRel) {
      return res.status(400).json({ success: false, error: '您还没有仙侣伴侣' });
    }
    
    // 获取伴侣信息
    const partner = db.prepare('SELECT * FROM player WHERE id = ?').get(partnerRel.partner_id);
    
    if (!partner) {
      return res.status(500).json({ success: false, error: '伴侣数据异常' });
    }
    
    // 检查伴侣是否在线
    if (!partner.online_status) {
      return res.status(400).json({ success: false, error: '伴侣当前不在线，无法双修' });
    }
    
    // 检查境界差距（不能超过1个大境界）
    const realmDiff = Math.abs(player.realm_level - partner.realm_level);
    if (realmDiff > 1) {
      return res.status(400).json({ success: false, error: '境界差距过大，无法双修（境界差距不能超过1个大境界）' });
    }
    
    // 检查双修冷却（5分钟）
    if (partnerRel.last_double_cultivate) {
      const lastTime = new Date(partnerRel.last_double_cultivate).getTime();
      const now = Date.now();
      const cooldown = 5 * 60 * 1000; // 5分钟
      if (now - lastTime < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastTime)) / 1000);
        return res.status(400).json({ success: false, error: `双修冷却中，需要等待${remaining}秒` });
      }
    }
    
    // 检查每日双修次数（10次上限）
    // 重置每日次数
    const today = new Date().toDateString();
    const lastDate = partnerRel.last_double_cultivate ? new Date(partnerRel.last_double_cultivate).toDateString() : null;
    
    let dailyUsed = partnerRel.daily_double_cultivate_used || 0;
    if (lastDate !== today) {
      dailyUsed = 0;
    }
    
    if (dailyUsed >= 10) {
      return res.status(400).json({ success: false, error: '今日双修次数已用完（每日上限10次）' });
    }
    
    // 计算双修产出
    // 基础产出：挂机10分钟的灵气
    // 境界越高产出越多
    const baseSpiritPerMin = [100, 500, 2000, 8000, 30000, 50000, 80000, 120000, 200000];
    const playerRealmSpirit = baseSpiritPerMin[player.realm_level] || 100;
    const partnerRealmSpirit = baseSpiritPerMin[partner.realm_level] || 100;
    const avgSpirit = Math.floor((playerRealmSpirit + partnerRealmSpirit) / 2);
    const baseSpirit = avgSpirit * 10; // 10分钟
    
    // 境界加成：高的一方获得额外50%
    let realmBonus = 1;
    if (player.realm_level > partner.realm_level) {
      realmBonus = 1.5;
    } else if (partner.realm_level > player.realm_level) {
      realmBonus = 1.5;
    }
    
    // 亲密度加成：每1000点+10%
    const intimacyBonus = 1 + Math.floor(partnerRel.intimacy / 1000) * 0.1;
    
    // 最终产出
    const spiritGained = Math.floor(baseSpirit * realmBonus * intimacyBonus);
    const intimacyGained = 50;
    
    // 更新玩家灵气
    db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(spiritGained, actualPlayerId);
    db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(Math.floor(spiritGained * 0.5), partnerRel.partner_id);
    
    // 更新亲密度
    const newIntimacy = partnerRel.intimacy + intimacyGained;
    const newIntimacyLevel = getIntimacyLevel(newIntimacy);
    
    // 更新双修记录
    db.prepare(`
      UPDATE player_partners 
      SET intimacy = ?, 
          intimacy_level = ?,
          double_cultivate_count = double_cultivate_count + 1,
          daily_double_cultivate_used = ?,
          last_double_cultivate = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE player_id = ?
    `).run(newIntimacy, newIntimacyLevel.level, dailyUsed + 1, actualPlayerId);
    
    db.prepare(`
      UPDATE player_partners 
      SET intimacy = ?, 
          intimacy_level = ?,
          double_cultivate_count = double_cultivate_count + 1,
          daily_double_cultivate_used = ?,
          last_double_cultivate = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE player_id = ?
    `).run(newIntimacy, newIntimacyLevel.level, dailyUsed + 1, partnerRel.partner_id);
    
    // 记录双修历史
    db.prepare(`
      INSERT INTO partner_double_cultivate_records (player_id, partner_id, spirit_gained, intimacy_gained)
      VALUES (?, ?, ?, ?)
    `).run(actualPlayerId, partnerRel.partner_id, spiritGained, intimacyGained);
    
    res.json({
      success: true,
      message: '双修完成！',
      data: {
        spirit_gained: spiritGained,
        partner_spirit_gained: Math.floor(spiritGained * 0.5),
        intimacy_gained: intimacyGained,
        new_intimacy: newIntimacy,
        new_intimacy_level: newIntimacyLevel.level,
        title: newIntimacyLevel.title,
        spirit_bonus: newIntimacyLevel.spirit_bonus,
        exp_bonus: newIntimacyLevel.exp_bonus,
        realm_bonus: realmBonus,
        intimacy_bonus: intimacyBonus,
        daily_remaining: 10 - (dailyUsed + 1),
        duration: 30
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取亲密度信息
app.get('/api/partner/intimacy', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    // 获取玩家
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }
    
    // 查找仙侣关系
    const partnerRel = db.prepare(`
      SELECT * FROM player_partners 
      WHERE player_id = ? AND status = 'active'
    `).get(actualPlayerId);
    
    if (!partnerRel) {
      return res.json({
        success: true,
        data: {
          has_partner: false,
          intimacy: 0,
          intimacy_level: '萍水',
          title: '初识',
          spirit_bonus: 0.05,
          exp_bonus: 0.05,
          levels: INTIMACY_LEVELS,
          records: []
        }
      });
    }
    
    // 获取伴侣信息
    const partner = db.prepare('SELECT * FROM player WHERE id = ?').get(partnerRel.partner_id);
    
    // 获取双修记录
    const records = db.prepare(`
      SELECT * FROM partner_double_cultivate_records 
      WHERE player_id = ? OR partner_id = ?
      ORDER BY created_at DESC LIMIT 20
    `).all(actualPlayerId, actualPlayerId);
    
    const intimacyLevel = getIntimacyLevel(partnerRel.intimacy);
    
    // 计算升级所需亲密度
    let nextLevel = null;
    const currentLevelIndex = INTIMACY_LEVELS.findIndex(l => l.level === partnerRel.intimacy_level);
    if (currentLevelIndex < INTIMACY_LEVELS.length - 1) {
      nextLevel = INTIMACY_LEVELS[currentLevelIndex + 1];
    }
    
    res.json({
      success: true,
      data: {
        has_partner: true,
        player: partner ? {
          id: partner.id,
          username: partner.username,
          level: partner.level,
          realm_level: partner.realm_level,
          realm_name: REALMS[partner.realm_level]?.name || '炼气期'
        } : null,
        intimacy: partnerRel.intimacy,
        intimacy_level: partnerRel.intimacy_level,
        title: intimacyLevel.title,
        spirit_bonus: intimacyLevel.spirit_bonus,
        exp_bonus: intimacyLevel.exp_bonus,
        next_level: nextLevel ? {
          level: nextLevel.level,
          title: nextLevel.title,
          required: nextLevel.min,
          spirit_bonus: nextLevel.spirit_bonus,
          exp_bonus: nextLevel.exp_bonus
        } : null,
        double_cultivate_count: partnerRel.double_cultivate_count,
        total_intimacy_gained: partnerRel.intimacy,
        levels: INTIMACY_LEVELS,
        records: records.map(r => ({
          id: r.id,
          partner_id: r.player_id === actualPlayerId ? r.partner_id : r.player_id,
          spirit_gained: r.spirit_gained,
          intimacy_gained: r.intimacy_gained,
          created_at: r.created_at
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ VIP系统 API ============

// 获取VIP信息
app.get('/api/vip/info', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    // 获取或创建玩家
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }
    
    const vipLevel = player.vip_level || 0;
    const vipConfig = VIP_CONFIG[vipLevel] || null;
    
    // 检查VIP是否过期
    let isVipExpired = false;
    if (vipLevel > 0 && player.vip_expire_at) {
      const expireDate = new Date(player.vip_expire_at);
      isVipExpired = expireDate < new Date();
    }
    
    // 如果VIP已过期，清除VIP状态
    if (isVipExpired && vipLevel > 0) {
      db.prepare('UPDATE player SET vip_level = 0, vip_expire_at = NULL WHERE id = ?').run(actualPlayerId);
      player.vip_level = 0;
      player.vip_expire_at = null;
    }
    
    // 构建所有VIP等级信息
    const vipLevels = Object.values(VIP_CONFIG).map(v => ({
      level: v.level,
      name: v.name,
      daily_sign_bonus: v.daily_sign_bonus,
      idle_earn_bonus: v.idle_earn_bonus,
      enhance_bonus: v.enhance_bonus,
      price: v.price,
      duration_days: v.duration_days
    }));
    
    res.json({
      success: true,
      data: {
        player: {
          id: player.id,
          vip_level: player.vip_level || 0,
          vip_expire_at: player.vip_expire_at,
          is_vip_active: (player.vip_level || 0) > 0 && !isVipExpired
        },
        current_vip: player.vip_level > 0 && !isVipExpired ? {
          level: vipConfig.level,
          name: vipConfig.name,
          daily_sign_bonus: vipConfig.daily_sign_bonus,
          idle_earn_bonus: vipConfig.idle_earn_bonus,
          enhance_bonus: vipConfig.enhance_bonus,
          expire_at: player.vip_expire_at
        } : null,
        vip_levels: vipLevels
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 激活VIP
app.post('/api/vip/activate', (req, res) => {
  try {
    const { player_id, vip_level } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    if (!vip_level || !VIP_CONFIG[vip_level]) {
      return res.status(400).json({ success: false, error: '无效的VIP等级' });
    }
    
    const vipConfig = VIP_CONFIG[vip_level];
    
    // 获取或创建玩家
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }
    
    // 检查灵石是否足够
    if (player.spirit_stones < vipConfig.price) {
      return res.status(400).json({ 
        success: false, 
        error: '灵石不足',
        required: vipConfig.price,
        available: player.spirit_stones
      });
    }
    
    // 计算新的到期时间
    let newExpireAt;
    const now = new Date();
    
    if (player.vip_level > 0 && player.vip_expire_at) {
      const currentExpire = new Date(player.vip_expire_at);
      if (currentExpire > now) {
        // 续期：在当前到期时间基础上增加
        currentExpire.setDate(currentExpire.getDate() + vipConfig.duration_days);
        newExpireAt = currentExpire;
      } else {
        // 已过期：从现在开始计算
        newExpireAt = new Date(now.getTime() + vipConfig.duration_days * 24 * 60 * 60 * 1000);
      }
    } else {
      // 新激活
      newExpireAt = new Date(now.getTime() + vipConfig.duration_days * 24 * 60 * 60 * 1000);
    }
    
    // 扣除灵石
    db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(vipConfig.price, actualPlayerId);
    
    // 更新VIP信息
    db.prepare('UPDATE player SET vip_level = ?, vip_expire_at = ? WHERE id = ?').run(vip_level, newExpireAt.toISOString(), actualPlayerId);
    
    res.json({
      success: true,
      message: `成功激活 ${vipConfig.name}`,
      data: {
        vip_level: vip_level,
        vip_name: vipConfig.name,
        daily_sign_bonus: vipConfig.daily_sign_bonus,
        idle_earn_bonus: vipConfig.idle_earn_bonus,
        enhance_bonus: vipConfig.enhance_bonus,
        expire_at: newExpireAt.toISOString(),
        cost: vipConfig.price,
        remaining_spirit_stones: player.spirit_stones - vipConfig.price
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 每日奖励系统 API ============

// 每日奖励配置
const DAILY_BONUS_CONFIG = {
  1: { days: 1, name: '登录1天奖励', rewards: { spirit_stones: 100 }, description: '100灵石' },
  7: { days: 7, name: '登录7天奖励', rewards: { spirit_stones: 1000, purple_gongfa_box: 1 }, description: '1000灵石+紫色功法箱' },
  30: { days: 30, name: '登录30天奖励', rewards: { spirit_stones: 10000, red_equipment: 1 }, description: '10000灵石+红色装备' }
};

// 获取日期字符串（YYYY-MM-DD）- 已在前面定义，此处复用
// 检查是否是同一天
function isSameDay(date1, date2) {
  return getDateString(new Date(date1)) === getDateString(new Date(date2));
}

// 检查是否是昨天
function isYesterday(date) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getDateString(new Date(date)) === getDateString(yesterday);
}

// 获取或创建玩家每日登录记录
function getOrCreateDailyLogin(playerId) {
  let record = db.prepare('SELECT * FROM player_daily_login WHERE player_id = ?').get(playerId);
  
  if (!record) {
    const result = db.prepare('INSERT INTO player_daily_login (player_id, total_login_days, consecutive_login_days, last_login_date) VALUES (?, ?, ?, ?)').run(playerId, 1, 1, getDateString());
    record = db.prepare('SELECT * FROM player_daily_login WHERE player_id = ?').get(playerId);
  }
  
  return record;
}

// 更新玩家登录状态（玩家登录时调用）
function updatePlayerLogin(playerId) {
  const record = getOrCreateDailyLogin(playerId);
  const today = getDateString();
  const lastDate = record.last_login_date;
  
  // 获取或创建玩家记录
  let player = db.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
  if (!player) {
    const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${playerId}`, 10000, 1, 0);
    player = db.prepare('SELECT * FROM player WHERE id = ?').get(result.lastInsertRowid);
  }
  
  // 检查是否今天已经登录过
  if (isSameDay(lastDate, today)) {
    return { isNewDay: false, record };
  }
  
  let newConsecutiveDays = 1;
  let newTotalDays = record.total_login_days + 1;
  
  // 如果昨天登录过，连续登录天数增加
  if (isYesterday(lastDate)) {
    newConsecutiveDays = record.consecutive_login_days + 1;
  } else if (lastDate && !isYesterday(lastDate) && !isSameDay(lastDate, today)) {
    // 如果超过一天没登录，重置连续天数
    newConsecutiveDays = 1;
  }
  
  // 更新登录记录
  db.prepare(`
    UPDATE player_daily_login 
    SET total_login_days = ?, consecutive_login_days = ?, last_login_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE player_id = ?
  `).run(newTotalDays, newConsecutiveDays, today, playerId);
  
  return { isNewDay: true, record: { ...record, total_login_days: newTotalDays, consecutive_login_days: newConsecutiveDays, last_login_date: today } };
}

// 获取每日奖励状态
app.get('/api/bonus/daily', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    // 获取或创建玩家
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }
    
    // 更新登录状态
    const loginStatus = updatePlayerLogin(actualPlayerId);
    const record = loginStatus.record;
    
    // 检查今天是否已领取
    const today = getDateString();
    const canClaim = record.last_claim_date !== today;
    
    // 获取可领取的奖励列表
    const availableRewards = [];
    for (const [threshold, config] of Object.entries(DAILY_BONUS_CONFIG)) {
      const canClaimThis = record.total_login_days >= config.days && record.last_claim_date !== today;
      availableRewards.push({
        threshold: config.days,
        name: config.name,
        description: config.description,
        rewards: config.rewards,
        can_claim: canClaimThis,
        claimed: record.total_login_days >= config.days && record.last_claim_date === today
      });
    }
    
    res.json({
      success: true,
      data: {
        player_id: actualPlayerId,
        total_login_days: record.total_login_days,
        consecutive_login_days: record.consecutive_login_days,
        last_login_date: record.last_login_date,
        last_claim_date: record.last_claim_date,
        can_claim: canClaim,
        rewards: availableRewards
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 仓库系统 API ====================
// GET /api/bins/ - 获取玩家仓库物品
app.get('/api/bins/', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    // 读取玩家数据
    const playerFile = path.join(dataDir, `player_${player_id}.json`);
    let playerData = { artifacts: [], protection_items: [] };
    
    if (fs.existsSync(playerFile)) {
      try {
        playerData = JSON.parse(fs.readFileSync(playerFile, 'utf8'));
      } catch (e) {
        Logger.error('读取玩家数据失败:', e);
      }
    }
    
    const artifacts = (playerData.artifacts || []).map(a => ({
      item_id: a.id || a.artifact_id,
      item_name: a.name || a.artifact_name,
      quantity: a.quantity || 1,
      item_type: 'artifact'
    }));
    
    const protectionItems = (playerData.protection_items || []).map(p => ({
      item_id: p.id,
      item_name: p.name,
      quantity: p.quantity || 0,
      item_type: 'protection'
    })).filter(p => p.quantity > 0);
    
    const items = [...artifacts, ...protectionItems];
    
    res.json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 商店系统 API ====================
// 商品数据
const SHOP_ITEMS = [
  { id: 'spirit_stone_100', name: '100灵石', price: 10, category: 'currency', icon: '💎' },
  { id: 'spirit_stone_500', name: '500灵石', price: 45, category: 'currency', icon: '💎' },
  { id: 'spirit_stone_1000', name: '1000灵石', price: 80, category: 'currency', icon: '💎' },
  { id: 'exp_pill_small', name: '小还丹', price: 50, category: 'pill', effect: { exp: 100 }, icon: '💊' },
  { id: 'exp_pill_medium', name: '中还丹', price: 200, category: 'pill', effect: { exp: 500 }, icon: '💊' },
  { id: 'exp_pill_large', name: '大还丹', price: 800, category: 'pill', effect: { exp: 2000 }, icon: '💊' },
  { id: 'spirit_pill', name: '灵气丹', price: 100, category: 'pill', effect: { spirit: 50 }, icon: '✨' },
  { id: 'breakthrough_pill', name: '突破丹', price: 500, category: 'pill', effect: { breakthrough: 1 }, icon: '🚀' },
  { id: 'protection_charm', name: '护身符', price: 300, category: 'protection', effect: { protection: 1 }, icon: '🛡️' },
  { id: 'teleport_scroll', name: '传送卷轴', price: 150, category: 'item', icon: '📜' }
];

// GET /api/shop/list - 获取商品列表
app.get('/api/shop/list', (req, res) => {
  res.json({ success: true, data: SHOP_ITEMS });
});

// POST /api/shop/buy - 购买商品
app.post('/api/shop/buy', (req, res) => {
  const { player_id, item_id, quantity = 1 } = req.body;
  
  if (!player_id || !item_id) {
    return res.json({ success: false, message: '缺少必要参数' });
  }
  
  const item = SHOP_ITEMS.find(i => i.id === item_id);
  if (!item) {
    return res.json({ success: false, message: '商品不存在' });
  }
  
  // 读取玩家数据
  const playerFile = path.join(dataDir, `player_${player_id}.json`);
  let playerData = { spirit_stones: 1000, inventory: [] };
  
  if (fs.existsSync(playerFile)) {
    try {
      playerData = JSON.parse(fs.readFileSync(playerFile, 'utf8'));
    } catch (e) {}
  }
  
  const totalCost = item.price * quantity;
  if ((playerData.spirit_stones || 0) < totalCost) {
    return res.json({ success: false, message: '灵石不足' });
  }
  
  playerData.spirit_stones -= totalCost;
  playerData.inventory = playerData.inventory || [];
  playerData.inventory.push({ item_id, quantity, purchased_at: Date.now() });
  
  fs.writeFileSync(playerFile, JSON.stringify(playerData, null, 2));
  
  res.json({ success: true, message: `购买成功！消耗${totalCost}灵石`, data: { item, quantity, remaining: playerData.spirit_stones } });
});

// ==================== 排行榜系统 API ====================

// GET /api/ranking/:type - 获取排行榜（真实数据）
app.get('/api/ranking/:type', (req, res) => {
  try {
    const { type } = req.params;
    const { limit, player_id } = req.query;
    const n = Math.min(parseInt(limit) || 50, 100);
    const uid = parseInt(player_id) || 0;

    let ranking = [];

    if (type === 'combat') {
      // 战力排行榜：从 player 表实时计算
      ranking = db.prepare(`
        SELECT id, username as name, level, realm_level as realm,
               combat_power as value,
               spirit_stones as lingshi
        FROM player WHERE id > 0
        ORDER BY value DESC LIMIT ?
      `).all(n);
    } else if (type === 'level') {
      ranking = db.prepare(`
        SELECT id, username as name, level, realm_level as realm,
               level as value, spirit_stones as lingshi
        FROM player WHERE id > 0
        ORDER BY realm DESC, level DESC LIMIT ?
      `).all(n);
    } else if (type === 'wealth') {
      ranking = db.prepare(`
        SELECT id, username as name, level, realm_level as realm,
               spirit_stones as value, spirit_stones as lingshi
        FROM player WHERE id > 0
        ORDER BY spirit_stones DESC LIMIT ?
      `).all(n);
    } else if (type === 'chapter') {
      // 章节排行榜：从 dungeon_records 表读取（如无数据则用玩家数替代）
      try {
        ranking = db.prepare(`
          SELECT p.id, p.username as name, p.level, p.realm_level,
                 COALESCE(MAX(dr.chapter_id), 0) as value,
                 p.spirit_stones as lingshi
          FROM player p
          LEFT JOIN dungeon_records dr ON p.id = dr.player_id
          WHERE p.id > 0
          GROUP BY p.id
          ORDER BY value DESC LIMIT ?
        `).all(n);
      } catch(e) {
        ranking = [];
      }
    } else if (type === 'realm') {
      ranking = db.prepare(`
        SELECT id, username as name, level, realm_level as realm,
               realm_level as value, spirit_stones as lingshi
        FROM player WHERE id > 0
        ORDER BY realm_level DESC, level DESC LIMIT ?
      `).all(n);
    } else if (type === 'sect_contrib') {
      ranking = db.prepare(`
        SELECT p.id, p.username as name, p.level, p.realm_level,
               COALESCE(sm.contribution, 0) as value,
               p.spirit_stones as lingshi
        FROM player p
        LEFT JOIN sect_members sm ON p.id = sm.player_id
        WHERE p.id > 0
        ORDER BY value DESC LIMIT ?
      `).all(n);
    } else if (type === 'total_recharge') {
      ranking = db.prepare(`
        SELECT p.id, p.username as name, p.level, p.realm_level,
               COALESCE(SUM(po.amount), 0) as value,
               p.spirit_stones as lingshi
        FROM player p
        LEFT JOIN payment_orders po ON p.id = po.player_id AND po.status = 'paid'
        WHERE p.id > 0
        GROUP BY p.id
        ORDER BY value DESC LIMIT ?
      `).all(n);
    } else {
      return res.json({ success: false, error: '未知排行榜类型', types: ['combat', 'level', 'wealth', 'chapter', 'realm', 'sect_contrib', 'total_recharge'] });
    }

    const list = ranking.map((p, i) => ({
      rank: i + 1,
      player_id: p.id,
      name: p.name,
      value: p.value,
      level: p.level,
      realm_level: p.realm_level || p.realm || 0,
      lingshi: p.lingshi || 0
    }));

    // 附加当前玩家排名
    if (uid > 0) {
      let myRankInfo = null;
      if (type === 'combat') {
        const me = db.prepare(`SELECT combat_power as power FROM player WHERE id = ?`).get(uid);
        const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM player WHERE id > 0 AND combat_power > ?`).get(me ? me.power : 0);
        myRankInfo = { myRank: rank ? rank.r : 0, combatPower: me ? me.power : 0 };
      } else if (type === 'level') {
        const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM player WHERE id > 0 AND (realm_level > (SELECT realm_level FROM player WHERE id = ?) OR (realm_level = (SELECT realm_level FROM player WHERE id = ?) AND level > (SELECT level FROM player WHERE id = ?)))`).get(uid, uid, uid);
        myRankInfo = { myRank: rank ? rank.r : 0 };
      } else if (type === 'wealth') {
        const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM player WHERE id > 0 AND spirit_stones > (SELECT spirit_stones FROM player WHERE id = ?)`).get(uid);
        myRankInfo = { myRank: rank ? rank.r : 0 };
      } else if (type === 'realm') {
        const me = db.prepare(`SELECT realm_level FROM player WHERE id = ?`).get(uid);
        const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM player WHERE id > 0 AND realm_level > ?`).get(me ? me.realm_level : 0);
        myRankInfo = { myRank: rank ? rank.r : 0 };
      } else if (type === 'sect_contrib') {
        const me = db.prepare(`SELECT COALESCE(sm.contribution, 0) as v FROM player p LEFT JOIN sect_members sm ON p.id = sm.player_id WHERE p.id = ?`).get(uid);
        const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM player p LEFT JOIN sect_members sm ON p.id = sm.player_id WHERE p.id > 0 AND COALESCE(sm.contribution, 0) > ?`).get(me ? me.v : 0);
        myRankInfo = { myRank: rank ? rank.r : 0 };
      } else if (type === 'total_recharge') {
        const me = db.prepare(`SELECT COALESCE(SUM(amount), 0) as v FROM player p LEFT JOIN payment_orders po ON p.id = po.player_id AND po.status = 'paid' WHERE p.id = ? GROUP BY p.id`).get(uid);
        const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM player p LEFT JOIN payment_orders po ON p.id = po.player_id AND po.status = 'paid' WHERE p.id > 0 GROUP BY p.id HAVING COALESCE(SUM(amount), 0) > ?`).get(me ? me.v : 0);
        myRankInfo = { myRank: rank ? rank.r : 0 };
      }
      return res.json({ success: true, list, myRank: myRankInfo });
    }

    res.json({ success: true, list });
  } catch (error) {
    Logger.error('排行榜查询错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/ranking/:type/me - 获取我的排名
app.get('/api/ranking/:type/me', (req, res) => {
  try {
    const { type } = req.params;
    const { player_id } = req.query;

    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }

    const uid = parseInt(player_id);

    if (type === 'combat') {
      const me = db.prepare(`SELECT id, username as name, level, realm_level, combat_power FROM player WHERE id = ?`).get(uid);
      if (!me) return res.json({ success: false, error: '玩家不存在' });
      const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM player WHERE id > 0 AND combat_power > ?`).get(me.combat_power);
      res.json({ success: true, myRank: rank.r, player: me });
    } else if (type === 'level') {
      const me = db.prepare(`SELECT id, username as name, level, realm_level FROM player WHERE id = ?`).get(uid);
      if (!me) return res.json({ success: false, error: '玩家不存在' });
      const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM player WHERE id > 0 AND (realm_level > ? OR (realm_level = ? AND level > ?))`).get(me.realm_level, me.realm_level, me.level);
      res.json({ success: true, myRank: rank.r, player: me });
    } else if (type === 'wealth') {
      const me = db.prepare(`SELECT id, username as name, spirit_stones as lingshi FROM player WHERE id = ?`).get(uid);
      if (!me) return res.json({ success: false, error: '玩家不存在' });
      const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM player WHERE id > 0 AND spirit_stones > ?`).get(me.lingshi);
      res.json({ success: true, myRank: rank.r, player: me });
    } else if (type === 'realm') {
      const me = db.prepare(`SELECT id, username as name, level, realm_level FROM player WHERE id = ?`).get(uid);
      if (!me) return res.json({ success: false, error: '玩家不存在' });
      const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM player WHERE id > 0 AND realm_level > ?`).get(me.realm_level);
      res.json({ success: true, myRank: rank.r, player: me });
    } else if (type === 'sect_contrib') {
      const me = db.prepare(`SELECT p.id, p.username as name, COALESCE(sm.contribution, 0) as v FROM player p LEFT JOIN sect_members sm ON p.id = sm.player_id WHERE p.id = ?`).get(uid);
      if (!me) return res.json({ success: false, error: '玩家不存在' });
      const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM player p LEFT JOIN sect_members sm ON p.id = sm.player_id WHERE p.id > 0 AND COALESCE(sm.contribution, 0) > ?`).get(me.v);
      res.json({ success: true, myRank: rank.r, player: me });
    } else if (type === 'total_recharge') {
      const me = db.prepare(`SELECT p.id, p.username as name, COALESCE(SUM(po.amount), 0) as v FROM player p LEFT JOIN payment_orders po ON p.id = po.player_id AND po.status = 'paid' WHERE p.id = ? GROUP BY p.id`).get(uid);
      if (!me) return res.json({ success: false, error: '玩家不存在' });
      const rank = db.prepare(`SELECT COUNT(*) + 1 as r FROM player p LEFT JOIN payment_orders po ON p.id = po.player_id AND po.status = 'paid' WHERE p.id > 0 GROUP BY p.id HAVING COALESCE(SUM(amount), 0) > ?`).get(me.v);
      res.json({ success: true, myRank: rank.r, player: me });
    } else {
      res.json({ success: false, error: '未知排行榜类型' });
    }
  } catch (error) {
    Logger.error('获取我的排名错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 邮件系统 API ====================
// 模拟邮件数据
let mailData = [
  { id: 'mail_1', title: '欢迎来到寻道修仙', content: '恭喜您踏上修仙之路！祝您早日得道成仙。', from: '系统', has_attachment: true, attachment: { type: 'spirit_stone', amount: 100 }, timestamp: Date.now() - 86400000 },
  { id: 'mail_2', title: '新手礼包', content: '这是您的新手礼包，请查收！', from: '系统', has_attachment: true, attachment: { type: 'pill', item_id: 'exp_pill_small', amount: 5 }, timestamp: Date.now() - 43200000 },
  { id: 'mail_3', title: '每日签到奖励', content: '感谢您的每日签到，这是您的奖励。', from: '系统', has_attachment: true, attachment: { type: 'spirit_stone', amount: 50 }, timestamp: Date.now() - 3600000 }
];

// GET /api/mail/list - 获取邮件列表
app.get('/api/mail/list', (req, res) => {
  res.json({ success: true, data: mailData });
});

// POST /api/mail/claim - 领取邮件附件
app.post('/api/mail/claim', (req, res) => {
  const { player_id, mail_id } = req.body;
  
  const mail = mailData.find(m => m.id === mail_id);
  if (!mail) {
    return res.json({ success: false, message: '邮件不存在' });
  }
  
  if (!mail.has_attachment) {
    return res.json({ success: false, message: '该邮件没有附件' });
  }
  
  mail.has_attachment = false;
  res.json({ success: true, message: '附件已领取', data: mail.attachment });
});

// POST /api/mail/delete - 删除邮件
app.post('/api/mail/delete', (req, res) => {
  const { mail_id } = req.body;
  
  const index = mailData.findIndex(m => m.id === mail_id);
  if (index === -1) {
    return res.json({ success: false, message: '邮件不存在' });
  }
  
  mailData.splice(index, 1);
  res.json({ success: true, message: '邮件已删除' });
});

// ==================== 每日奖励 API ====================
// 每日奖励配置
const DAILY_BONUS = [
  { day: 1, reward: { spirit_stone: 50 }, icon: '📦' },
  { day: 2, reward: { spirit_stone: 100 }, icon: '📦' },
  { day: 3, reward: { spirit_stone: 150, exp_pill_small: 1 }, icon: '📦' },
  { day: 4, reward: { spirit_stone: 200 }, icon: '📦' },
  { day: 5, reward: { spirit_stone: 300, exp_pill_medium: 1 }, icon: '📦' },
  { day: 6, reward: { spirit_stone: 400 }, icon: '📦' },
  { day: 7, reward: { spirit_stone: 1000, breakthrough_pill: 1 }, icon: '🎁' }
];

// GET /api/bonus/daily - 获取每日奖励状态
app.get('/api/bonus/daily', (req, res) => {
  const { player_id } = req.query;
  
  // 读取玩家签到数据
  let lastClaimTime = null;
  let currentStreak = 0;
  
  if (player_id) {
    const playerFile = path.join(dataDir, `player_${player_id}.json`);
    if (fs.existsSync(playerFile)) {
      try {
        const playerData = JSON.parse(fs.readFileSync(playerFile, 'utf8'));
        lastClaimTime = playerData.last_daily_claim;
        currentStreak = playerData.daily_streak || 0;
      } catch (e) {}
    }
  }
  
  const now = Date.now();
  const canClaim = !lastClaimTime || (now - lastClaimTime) > 86400000; // 24小时
  const nextClaimTime = lastClaimTime ? lastClaimTime + 86400000 : now;
  
  res.json({
    success: true,
    data: {
      can_claim: canClaim,
      current_streak: currentStreak,
      next_claim_time: nextClaimTime,
      rewards: DAILY_BONUS
    }
  });
});

// POST /api/bonus/claim - 领取每日奖励
app.post('/api/bonus/claim', (req, res) => {
  const { player_id } = req.body;
  
  if (!player_id) {
    return res.json({ success: false, message: '缺少玩家ID' });
  }
  
  const playerFile = path.join(dataDir, `player_${player_id}.json`);
  let playerData = { spirit_stones: 0, inventory: [], daily_streak: 0 };
  
  if (fs.existsSync(playerFile)) {
    try {
      playerData = JSON.parse(fs.readFileSync(playerFile, 'utf8'));
    } catch (e) {}
  }
  
  const now = Date.now();
  const lastClaim = playerData.last_daily_claim || 0;
  
  if (lastClaim && (now - lastClaim) < 86400000) {
    return res.json({ success: false, message: '今日奖励已领取' });
  }
  
  // 更新签到天数
  const dayDiff = lastClaim ? Math.floor((now - lastClaim) / 86400000) : 0;
  playerData.daily_streak = dayDiff <= 1 ? (playerData.daily_streak || 0) + 1 : 1;
  playerData.last_daily_claim = now;
  
  const streak = playerData.daily_streak;
  const bonusIndex = Math.min(streak - 1, DAILY_BONUS.length - 1);
  const reward = DAILY_BONUS[bonusIndex]?.reward || DAILY_BONUS[0].reward;
  
  playerData.spirit_stones = (playerData.spirit_stones || 0) + (reward.spirit_stone || 0);
  playerData.inventory = playerData.inventory || [];
  
  if (reward.exp_pill_small) {
    playerData.inventory.push({ item_id: 'exp_pill_small', quantity: reward.exp_pill_small });
  }
  if (reward.exp_pill_medium) {
    playerData.inventory.push({ item_id: 'exp_pill_medium', quantity: reward.exp_pill_medium });
  }
  if (reward.breakthrough_pill) {
    playerData.inventory.push({ item_id: 'breakthrough_pill', quantity: reward.breakthrough_pill });
  }
  
  fs.writeFileSync(playerFile, JSON.stringify(playerData, null, 2));
  
  res.json({ success: true, message: `签到成功！连续签到${streak}天`, data: { reward, streak } });
});

// 启动服务器（仅在直接运行时启动，避免 require 时端口冲突）
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`功法系统 API 服务器运行在 http://localhost:${PORT}`);
    console.log(`📦 商店 API: http://localhost:${PORT}/api/shop/list`);
    console.log(`🏆 排行榜 API: http://localhost:${PORT}/api/ranking/:type`);
    console.log(`📧 邮件 API: http://localhost:${PORT}/api/mail/list`);
    console.log(`🎁 每日奖励 API: http://localhost:${PORT}/api/bonus/daily`);
  });
}

// ============ 邮件系统 API ============

// 发送系统邮件（内部函数）
function sendSystemMail(playerId, title, content, sender, attachments = null) {
  const stmt = db.prepare(`
    INSERT INTO player_mails (player_id, title, content, sender, sender_type, attachments)
    VALUES (?, ?, ?, ?, 'system', ?)
  `);
  const result = stmt.run(playerId, title, content, sender, attachments ? JSON.stringify(attachments) : null);
  return result.lastInsertRowid;
}

// 初始化系统邮件（玩家首次登录时发送新手礼包）
function initNewPlayerMails(playerId) {
  // 检查是否已发送过新手礼包
  const existingMail = db.prepare(`
    SELECT id FROM player_mails 
    WHERE player_id = ? AND sender_type = 'system' AND title = '新手礼包'
  `).get(playerId);

  if (!existingMail) {
    // 发送新手礼包邮件
    const attachments = { spirit_stones: 1000 };
    sendSystemMail(
      playerId,
      '🎁 新手礼包',
      '欢迎来到修仙世界！这是您的新手礼包，包含1000灵石，祝您修仙之路顺利！',
      '系统',
      attachments
    );
  }
}

// 获取邮件列表
app.get('/api/mail/list', (req, res) => {
  try {
    const { player_id, unread_only } = req.query;

    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }

    // 获取或创建玩家
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;

    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }

    // 首次登录发送新手礼包
    initNewPlayerMails(actualPlayerId);

    // 获取邮件列表
    let sql = 'SELECT * FROM player_mails WHERE player_id = ?';
    const params = [actualPlayerId];

    if (unread_only === 'true') {
      sql += ' AND is_read = 0';
    }
    sql += ' ORDER BY created_at DESC';

    const mails = db.prepare(sql).all(...params);

    // 统计未读数量
    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM player_mails WHERE player_id = ? AND is_read = 0').get(actualPlayerId);

    const mailList = mails.map(m => ({
      id: m.id,
      title: m.title,
      content: m.content,
      sender: m.sender,
      sender_type: m.sender_type,
      is_read: m.is_read === 1,
      is_claimed: m.is_claimed === 1,
      attachments: m.attachments ? JSON.parse(m.attachments) : null,
      created_at: m.created_at,
      claimed_at: m.claimed_at
    }));

    res.json({
      success: true,
      data: {
        mails: mailList,
        unread_count: unreadCount.count,
        total_count: mails.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 标记邮件已读
app.post('/api/mail/read', (req, res) => {
  try {
    const { player_id, mail_id } = req.body;

    if (!player_id || !mail_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 player_id 或 mail_id' });
    }

    // 获取或创建玩家
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;

    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
    }

    // 检查邮件是否存在
    const mail = db.prepare('SELECT * FROM player_mails WHERE id = ? AND player_id = ?').get(mail_id, actualPlayerId);

    if (!mail) {
      return res.status(404).json({ success: false, error: '邮件不存在' });
    }

    // 如果已经是已读状态，直接返回
    if (mail.is_read === 1) {
      return res.json({
        success: true,
        message: '邮件已标记为已读',
        data: { mail_id, is_read: true }
      });
    }

    // 更新为已读状态
    db.prepare('UPDATE player_mails SET is_read = 1 WHERE id = ? AND player_id = ?').run(mail_id, actualPlayerId);

    res.json({
      success: true,
      message: '邮件已标记为已读',
      data: { mail_id, is_read: true }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 领取邮件附件
app.post('/api/mail/claim', (req, res) => {
  try {
    const { player_id, mail_id } = req.body;

    if (!player_id || !mail_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 player_id 或 mail_id' });
    }

    // 获取或创建玩家
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;

    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }

    // 检查邮件是否存在
    const mail = db.prepare('SELECT * FROM player_mails WHERE id = ? AND player_id = ?').get(mail_id, actualPlayerId);

    if (!mail) {
      return res.status(404).json({ success: false, error: '邮件不存在' });
    }

    // 检查是否已领取
    if (mail.is_claimed === 1) {
      return res.status(400).json({ success: false, error: '邮件附件已领取' });
    }

    // 检查是否有附件
    if (!mail.attachments) {
      return res.status(400).json({ success: false, error: '该邮件没有附件' });
    }

    const attachments = JSON.parse(mail.attachments);
    const rewards = [];

    // 发放附件奖励
    if (attachments.spirit_stones) {
      db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(attachments.spirit_stones, actualPlayerId);
      rewards.push({ type: 'spirit_stones', amount: attachments.spirit_stones });
    }

    // 可以扩展其他附件类型...

    // 更新为已领取状态
    db.prepare('UPDATE player_mails SET is_claimed = 1, claimed_at = CURRENT_TIMESTAMP WHERE id = ? AND player_id = ?').run(mail_id, actualPlayerId);

    // 获取更新后的玩家数据
    const updatedPlayer = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);

    res.json({
      success: true,
      message: '附件领取成功！',
      data: {
        mail_id,
        rewards: rewards,
        player_spirit_stones: updatedPlayer.spirit_stones
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 新手引导系统 ============

// 新手引导步骤配置
const TUTORIAL_STEPS = {
  // 第一步：创建角色/开始游戏
  step_1: {
    id: 'step_1',
    title: '欢迎来到修仙世界',
    description: '欢迎来到修仙世界！点击继续开始您的修仙之旅。',
    order: 1,
    reward: { spirit_stones: 100 }
  },
  // 第二步：学习功法
  step_2: {
    id: 'step_2',
    title: '学习功法',
    description: '功法是提升实力的根本，快去学习一门功法吧！',
    order: 2,
    reward: { spirit_stones: 200 }
  },
  // 第三步：装备功法
  step_3: {
    id: 'step_3',
    title: '装备功法',
    description: '装备功法可以提升您的战斗力！',
    order: 3,
    reward: { spirit_stones: 200 }
  },
  // 第四步：挑战副本
  step_4: {
    id: 'step_4',
    title: '挑战副本',
    description: '挑战副本可以获得灵气和资源，快去试试吧！',
    order: 4,
    reward: { spirit_stones: 500 }
  },
  // 第五步：提升境界
  step_5: {
    id: 'step_5',
    title: '提升境界',
    description: '境界越高，修为越强，快去突破境界吧！',
    order: 5,
    reward: { spirit_stones: 1000 }
  },
  // 第六步：加入宗门
  step_6: {
    id: 'step_6',
    title: '加入宗门',
    description: '加入宗门可以与其他玩家互动，快去寻找一个心仪的宗门吧！',
    order: 6,
    reward: { spirit_stones: 500 }
  },
  // 第七步：领取日常奖励
  step_7: {
    id: 'step_7',
    title: '日常任务',
    description: '完成日常任务可以获得丰厚奖励！',
    order: 7,
    reward: { spirit_stones: 300 }
  },
  // 第八步：新手引导完成
  step_8: {
    id: 'step_8',
    title: '修仙之路',
    description: '恭喜您已完成新手引导，正式踏上修仙之路！',
    order: 8,
    reward: { spirit_stones: 2000, title: '初入仙途' }
  }
};

// 初始化或更新玩家引导进度
function updatePlayerTutorialProgress(playerId, stepId) {
  const step = TUTORIAL_STEPS[stepId];
  if (!step) return null;

  // 获取玩家当前已完成的步骤
  const completedTutorials = db.prepare('SELECT * FROM player_tutorial WHERE player_id = ? AND completed = 1').all(playerId);
  
  // 验证步骤顺序：必须先完成前一个步骤
  if (step.order > 1) {
    const prevStepId = `step_${step.order - 1}`;
    const prevCompleted = completedTutorials.find(t => t.step_id === prevStepId);
    if (!prevCompleted) {
      return { error: '请先完成上一个引导步骤' };
    }
  }

  // 检查是否已完成
  const existing = db.prepare('SELECT * FROM player_tutorial WHERE player_id = ? AND step_id = ?').get(playerId, stepId);
  
  if (!existing) {
    // 新插入
    db.prepare(`
      INSERT INTO player_tutorial (player_id, step_id, completed, completed_at, updated_at)
      VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(playerId, stepId);
  } else if (existing.completed === 0) {
    // 更新为已完成
    db.prepare(`
      UPDATE player_tutorial SET completed = 1, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE player_id = ? AND step_id = ?
    `).run(playerId, stepId);
  }

  // 返回更新后的数据
  return db.prepare('SELECT * FROM player_tutorial WHERE player_id = ? AND step_id = ?').get(playerId, stepId);
}

// 领取引导步骤奖励
function claimTutorialReward(playerId, stepId) {
  const step = TUTORIAL_STEPS[stepId];
  if (!step) return { success: false, message: '步骤不存在' };

  // 检查是否已完成但未领取奖励
  const tutorial = db.prepare('SELECT * FROM player_tutorial WHERE player_id = ? AND step_id = ?').get(playerId, stepId);
  if (!tutorial || tutorial.completed === 0) {
    return { success: false, message: '请先完成该引导步骤' };
  }

  // 检查奖励是否已领取
  if (tutorial.claimed === 1) {
    return { success: false, message: '奖励已领取' };
  }

  // 发放奖励
  if (step.reward) {
    if (step.reward.spirit_stones) {
      db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(step.reward.spirit_stones, playerId);
    }
    if (step.reward.title) {
      // 添加称号
      db.prepare(`
        INSERT OR IGNORE INTO player_titles (player_id, title_id, unlocked_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `).run(playerId, step.reward.title);
    }
  }

  // 标记奖励已领取
  db.prepare(`
    UPDATE player_tutorial SET claimed = 1, updated_at = CURRENT_TIMESTAMP
    WHERE player_id = ? AND step_id = ?
  `).run(playerId, stepId);

  return { success: true, reward: step.reward };
}

// API: GET /api/tutorial/status - 获取新手引导状态
app.get('/api/tutorial/status', (req, res) => {
  try {
    const { player_id } = req.query;
    if (!player_id) return res.status(400).json({ success: false, error: '缺少 player_id' });

    // 确保玩家存在
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }

    // 获取玩家引导进度
    const tutorials = db.prepare('SELECT * FROM player_tutorial WHERE player_id = ?').all(actualPlayerId);
    const tutorialMap = {};
    for (const t of tutorials) {
      tutorialMap[t.step_id] = t;
    }

    // 构建返回数据
    const list = Object.values(TUTORIAL_STEPS).map(step => {
      const playerTutorial = tutorialMap[step.id] || { completed: 0, claimed: 0 };
      return {
        id: step.id,
        title: step.title,
        description: step.description,
        order: step.order,
        completed: playerTutorial.completed === 1,
        claimed: playerTutorial.claimed === 1,
        reward: step.reward
      };
    }).sort((a, b) => a.order - b.order);

    // 计算当前应该进行的步骤
    const completedSteps = list.filter(l => l.completed).length;
    const currentStep = list.find(l => !l.completed) || list[list.length - 1];

    res.json({
      success: true,
      data: {
        steps: list,
        current_step: currentStep ? currentStep.id : null,
        completed_count: completedSteps,
        total_count: list.length,
        all_completed: completedSteps === list.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: POST /api/tutorial/complete - 完成引导步骤
app.post('/api/tutorial/complete', (req, res) => {
  try {
    const { player_id, step_id } = req.body;
    if (!player_id) return res.status(400).json({ success: false, error: '缺少 player_id' });
    if (!step_id) return res.status(400).json({ success: false, error: '缺少 step_id' });

    // 确保玩家存在
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }

    // 更新引导进度
    const result = updatePlayerTutorialProgress(actualPlayerId, step_id);
    
    // 检查是否有错误（如步骤顺序不正确）
    if (result && result.error) {
      return res.json({ success: false, error: result.error });
    }
    
    // 自动领取奖励
    const step = TUTORIAL_STEPS[step_id];
    let reward = null;
    if (step && step.reward && result && result.completed === 1) {
      const rewardResult = claimTutorialReward(actualPlayerId, step_id);
      if (rewardResult.success) {
        reward = rewardResult.reward;
      }
    }

    // 获取更新后的玩家数据
    const updatedPlayer = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);

    res.json({
      success: true,
      message: '引导步骤已完成',
      data: {
        step_id: step_id,
        completed: true,
        reward: reward,
        spirit_stones: updatedPlayer.spirit_stones
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: POST /api/tutorial/claim - 领取引导奖励
app.post('/api/tutorial/claim', (req, res) => {
  try {
    const { player_id, step_id } = req.body;
    if (!player_id) return res.status(400).json({ success: false, error: '缺少 player_id' });
    if (!step_id) return res.status(400).json({ success: false, error: '缺少 step_id' });

    // 确保玩家存在
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }

    // 领取奖励
    const result = claimTutorialReward(actualPlayerId, step_id);
    if (!result.success) {
      return res.json(result);
    }

    // 获取更新后的玩家数据
    const updatedPlayer = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);

    res.json({
      success: true,
      message: '奖励已领取',
      data: {
        step_id: step_id,
        reward: result.reward,
        spirit_stones: updatedPlayer.spirit_stones
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 成就系统 ============

// 成就配置
// ACHIEVEMENTS: 完整的31个成就定义（numeric ID 与 achievement_progress 表对齐）
const ACHIEVEMENTS = {
  // 境界修炼 (IDs 1-6)
  1:  { id: 1,  name: '初入修仙',    desc: '达到练气期',     target: 2,  reward: { diamonds: 10 },   icon: '🧘', category: 'cultivate' },
  2:  { id: 2,  name: '筑基成功',    desc: '达到筑基期',     target: 3,  reward: { diamonds: 50 },   icon: '🧘', category: 'cultivate' },
  3:  { id: 3,  name: '金丹大道',    desc: '达到金丹期',     target: 4,  reward: { diamonds: 100 },  icon: '🧘', category: 'cultivate' },
  4:  { id: 4,  name: '元婴期',      desc: '达到元婴期',     target: 5,  reward: { diamonds: 200 },  icon: '🧘', category: 'cultivate' },
  5:  { id: 5,  name: '化神期',      desc: '达到化神期',     target: 6,  reward: { diamonds: 500 },  icon: '🧘', category: 'cultivate' },
  6:  { id: 6,  name: '渡劫飞升',    desc: '达到渡劫期',     target: 7,  reward: { diamonds: 1000 }, icon: '🧘', category: 'cultivate' },
  // 战力战斗 (IDs 10-13)
  10: { id: 10, name: '初战告捷',    desc: '战力达到1000',   target: 1000,   reward: { lingshi: 100 },  icon: '⚔️', category: 'combat' },
  11: { id: 11, name: '小有名气',    desc: '战力达到5000',   target: 5000,   reward: { lingshi: 500 },  icon: '⚔️', category: 'combat' },
  12: { id: 12, name: '一方强者',    desc: '战力达到20000',  target: 20000,  reward: { lingshi: 2000 }, icon: '⚔️', category: 'combat' },
  13: { id: 13, name: '威震天下',    desc: '战力达到100000', target: 100000, reward: { lingshi: 10000 }, icon: '⚔️', category: 'combat' },
  // 装备强化 (IDs 20-22)
  20: { id: 20, name: '初具装备',    desc: '强化装备到+5',   target: 5,   reward: { diamonds: 20 },  icon: '🗡️', category: 'equipment' },
  21: { id: 21, name: '装备小成',    desc: '强化装备到+10',  target: 10,  reward: { diamonds: 50 },  icon: '🗡️', category: 'equipment' },
  22: { id: 22, name: '装备大成',    desc: '强化装备到+15',  target: 15,  reward: { diamonds: 100 }, icon: '🗡️', category: 'equipment' },
  // 灵兽 (IDs 30-32)
  30: { id: 30, name: '捕获灵兽',    desc: '拥有1只灵兽',   target: 1,   reward: { diamonds: 10 },  icon: '🦊', category: 'beast' },
  31: { id: 31, name: '灵兽伙伴',    desc: '拥有5只灵兽',   target: 5,   reward: { diamonds: 50 },  icon: '🦊', category: 'beast' },
  32: { id: 32, name: '神兽环绕',    desc: '拥有神兽',      target: 1,   reward: { diamonds: 100 }, icon: '🦊', category: 'beast' },
  // 章节通关 (IDs 40-44)
  40: { id: 40, name: '初窥门径',    desc: '通关第5章',     target: 5,   reward: { lingshi: 100 },  icon: '📖', category: 'chapter' },
  41: { id: 41, name: '小有所成',    desc: '通关第10章',    target: 10,  reward: { lingshi: 500 },  icon: '📖', category: 'chapter' },
  42: { id: 42, name: '登堂入室',    desc: '通关第30章',    target: 30,  reward: { lingshi: 2000 }, icon: '📖', category: 'chapter' },
  43: { id: 43, name: '登峰造极',    desc: '通关第50章',    target: 50,  reward: { lingshi: 5000 }, icon: '📖', category: 'chapter' },
  44: { id: 44, name: '证道成仙',    desc: '通关第100章',   target: 100, reward: { diamonds: 1000 }, icon: '📖', category: 'chapter' },
  // 社交 (IDs 50-52)
  50: { id: 50, name: '结交朋友',    desc: '拥有5个好友',   target: 5,   reward: { lingshi: 50 },  icon: '👥', category: 'social' },
  51: { id: 51, name: '人脉广泛',    desc: '拥有20个好友',  target: 20,  reward: { lingshi: 200 }, icon: '👥', category: 'social' },
  52: { id: 52, name: '加入仙盟',    desc: '加入仙盟',      target: 1,   reward: { diamonds: 20 }, icon: '🏛️', category: 'social' },
  // 充值 (IDs 60-62)
  60: { id: 60, name: '初次充值',    desc: '首次充值任意金额', target: 1,  reward: { diamonds: 10 }, icon: '💎', category: 'spend' },
  61: { id: 61, name: '累计充值',    desc: '累计充值100元',  target: 100, reward: { diamonds: 100 }, icon: '💎', category: 'spend' },
  62: { id: 62, name: '充值大户',    desc: '累计充值1000元', target: 1000, reward: { diamonds: 1000 }, icon: '💎', category: 'spend' },
  // 在线 (IDs 70-73)
  70: { id: 70, name: '每日登录',    desc: '累计登录1天',   target: 1,   reward: { lingshi: 10 },  icon: '📅', category: 'online' },
  71: { id: 71, name: '持续修炼',    desc: '累计登录7天',   target: 7,   reward: { diamonds: 50 },  icon: '📅', category: 'online' },
  72: { id: 72, name: '持之以恒',    desc: '累计登录30天',  target: 30,  reward: { diamonds: 200 }, icon: '📅', category: 'online' },
  73: { id: 73, name: '修仙达人',    desc: '累计登录100天', target: 100, reward: { diamonds: 1000 }, icon: '📅', category: 'online' },
};

// 获取玩家成就进度
function getPlayerAchievementProgress(playerId, achievement) {
  switch (achievement.type) {
    case 'login_days': {
      const login = db.prepare('SELECT total_login_days FROM player_daily_login WHERE player_id = ?').get(playerId);
      return login ? login.total_login_days : 0;
    }
    case 'realm_level': {
      const player = db.prepare('SELECT realm_level FROM player WHERE id = ?').get(playerId);
      return player ? player.realm_level : 0;
    }
    case 'total_spirit': {
      const spirit = db.prepare('SELECT total_spirit_earned FROM player_spirit_stats WHERE player_id = ?').get(playerId);
      return spirit ? spirit.total_spirit_earned : 0;
    }
    case 'artifact_count': {
      const result = db.prepare('SELECT COUNT(*) as count FROM player_artifacts WHERE player_id = ?').get(playerId);
      return result ? result.count : 0;
    }
    case 'gongfa_count': {
      const result = db.prepare('SELECT COUNT(*) as count FROM player_gongfa WHERE player_id = ?').get(playerId);
      return result ? result.count : 0;
    }
    default:
      return 0;
  }
}

// 初始化或更新玩家成就进度
function updatePlayerAchievementProgress(playerId, achievementId) {
  const achievement = ACHIEVEMENTS[achievementId];
  if (!achievement) return;

  const progress = getPlayerAchievementProgress(playerId, achievement);
  const completed = progress >= achievement.target ? 1 : 0;

  db.prepare(`
    INSERT INTO player_achievements (player_id, achievement_id, progress, completed, completed_at, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(player_id, achievement_id) DO UPDATE SET
      progress = excluded.progress,
      completed = CASE WHEN excluded.completed = 1 AND player_achievements.completed = 0 THEN 1 ELSE player_achievements.completed END,
      completed_at = CASE WHEN excluded.completed = 1 AND player_achievements.completed = 0 THEN CURRENT_TIMESTAMP ELSE player_achievements.completed_at END,
      updated_at = CURRENT_TIMESTAMP
  `).run(playerId, achievementId, progress, completed, completed ? new Date().toISOString() : null);
}

// 更新所有成就进度
function updateAllAchievements(playerId) {
  for (const achievementId of Object.keys(ACHIEVEMENTS)) {
    updatePlayerAchievementProgress(playerId, achievementId);
  }
}

// API: GET /api/achievement/list - 获取成就列表和状态
app.get('/api/achievement/list', (req, res) => {
  try {
    const { player_id } = req.query;
    if (!player_id) {
      return res.json({
        success: true,
        data: { achievements: [], total_count: 0, completed_count: 0, claimed_count: 0 },
        message: '请提供 player_id 参数'
      });
    }

    const userId = parseInt(player_id);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, error: '无效的 player_id' });
    }

    // 使用与 achievement_trigger_service 相同的数据库路径
    const achievementDbPath = path.join(__dirname, 'backend', 'data', 'game.db');
    let achievementDb;
    let achievementMap = {};
    try {
      const Database = require('better-sqlite3');
      achievementDb = new Database(achievementDbPath);
      const rows = achievementDb.prepare('SELECT achievement_id, progress, completed, claimed FROM achievement_progress WHERE user_id = ?').all(userId);
      for (const row of rows) {
        achievementMap[Number(row.achievement_id)] = {
          progress: row.progress,
          completed: !!row.completed,
          claimed: !!row.claimed
        };
      }
      achievementDb.close();
    } catch (e) {
      // achievement_progress 表可能不存在或 DB 连接失败，返回空映射
    }

    // 构建返回数据（合并 ACHIEVEMENTS 模板 + DB 进度）
    const list = Object.values(ACHIEVEMENTS).map(ach => {
      const playerAch = achievementMap[ach.id] || { progress: 0, completed: false, claimed: false };
      const progress = playerAch.progress;
      const target = ach.target;
      const percent = Math.min(100, Math.round((progress / target) * 100));

      return {
        id: ach.id,
        name: ach.name,
        description: ach.desc || ach.description || ach.name,
        target: target,
        progress: progress,
        percent: percent,
        completed: playerAch.completed,
        claimed: playerAch.claimed,
        reward: ach.reward
      };
    });

    res.json({
      success: true,
      data: {
        achievements: list,
        total_count: list.length,
        completed_count: list.filter(l => l.completed).length,
        claimed_count: list.filter(l => l.claimed).length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: POST /api/achievement/claim - 领取成就奖励
app.post('/api/achievement/claim', (req, res) => {
  try {
    const { player_id, achievement_id } = req.body;
    if (!player_id || !achievement_id) return res.status(400).json({ success: false, error: '缺少必要参数' });

    const achievement = ACHIEVEMENTS[achievement_id];
    if (!achievement) return res.status(404).json({ success: false, error: '成就不存在' });

    // 确保玩家存在
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    // 更新成就进度
    updatePlayerAchievementProgress(actualPlayerId, achievement_id);

    // 检查成就状态
    const playerAchievement = db.prepare('SELECT * FROM player_achievements WHERE player_id = ? AND achievement_id = ?').get(actualPlayerId, achievement_id);
    
    if (!playerAchievement || playerAchievement.completed !== 1) {
      return res.status(400).json({ success: false, error: '成就未完成，无法领取奖励' });
    }

    if (playerAchievement.claimed === 1) {
      return res.status(400).json({ success: false, error: '奖励已领取' });
    }

    // 发放奖励
    const rewards = [];
    if (achievement.reward.spirit_stones) {
      db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(achievement.reward.spirit_stones, actualPlayerId);
      rewards.push({ type: 'spirit_stones', amount: achievement.reward.spirit_stones });
    }

    // 标记为已领取
    db.prepare('UPDATE player_achievements SET claimed = 1, updated_at = CURRENT_TIMESTAMP WHERE player_id = ? AND achievement_id = ?').run(actualPlayerId, achievement_id);

    // 获取更新后的玩家数据
    const updatedPlayer = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);

    res.json({
      success: true,
      message: `成功领取成就【${achievement.name}】奖励！`,
      data: {
        achievement_id: achievement_id,
        achievement_name: achievement.name,
        title: achievement.reward.title,
        rewards: rewards,
        player_spirit_stones: updatedPlayer.spirit_stones
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 排行榜系统 ============

// 排行榜类型映射
const RANKING_TYPES = {
  realm: { field: 'realm_level', order: 'DESC', name: '境界排行榜' },
  spirit_stones: { field: 'spirit_stones', order: 'DESC', name: '灵石排行榜' },
  level: { field: 'level', order: 'DESC', name: '等级排行榜' },
  power: { field: 'combat_power', order: 'DESC', name: '战力排行榜', isRealTime: true }
};

// 验证排行榜类型
function isValidRankingType(type) {
  return Object.keys(RANKING_TYPES).includes(type);
}

// 计算玩家战力（用于排行榜）
function calculatePlayerCombatPower(player, gameData) {
  try {
    const playerRankId = player.rank_id || 0;
    const rankBonus = rankSystem ? rankSystem.getRankBonus(playerRankId) : { atk: 0, def: 0, hp: 0 };
    
    // 获取装备耐久度影响
    const equipmentWithDurability = initializeEquipmentDurability(gameData?.equipment || { weapon: null, armor: null, accessory: null });
    const durabilityBonus = getEquipmentEffectiveBonus(equipmentWithDurability);
    
    const playerData = {
      hp: (gameData?.hp || player.hp || 100) + (rankBonus.hp || 0),
      maxHp: (gameData?.max_hp || 200) + (rankBonus.hp || 0),
      atk: (gameData?.atk || 10) + (rankBonus.atk || 0) + durabilityBonus.atk,
      def: (gameData?.def || 0) + (rankBonus.def || 0) + durabilityBonus.def,
      spiritRate: (gameData?.spirit_rate || 1),
      maxSpirit: (gameData?.max_spirit || 10),
      realmLevel: player.realm_level || 0,
      rankId: playerRankId,
      equipment: equipmentWithDurability,
      beasts: gameData?.beasts || [],
      equippedGongfa: gameData?.equipped_gongfa || {}
    };
    
    if (combatPowerSystem) {
      const result = combatPowerSystem.calculateCombatPower(playerData, {
        EQUIPMENT_DATA: {},
        RANK_DATA: typeof RANK_DATA !== 'undefined' ? RANK_DATA : {},
        BEAST_DATA: {},
        TECHNIQUE_DATA: {}
      });
      return result.total;
    }
    
    // 简化计算
    return Math.floor(
      playerData.maxHp * 0.1 + 
      playerData.atk * 2 + 
      playerData.def * 1.5 + 
      playerData.realmLevel * 100 +
      playerData.rankId * 200
    );
  } catch (e) {
    Logger.error('计算战力失败:', e);
    return 0;
  }
}

// GET /api/ranking/:type - 获取排行榜前100名
app.get('/api/ranking/:type', (req, res) => {
  try {
    const { type } = req.params;

    if (!isValidRankingType(type)) {
      return res.status(400).json({ 
        success: false, 
        error: `无效的排行榜类型，可用类型: ${Object.keys(RANKING_TYPES).join(', ')}` 
      });
    }

    const config = RANKING_TYPES[type];
    let ranking;

    // 战力排行榜使用实时计算
    if (config.isRealTime) {
      // 获取所有玩家
      const players = db.prepare('SELECT * FROM player ORDER BY realm_level DESC, level DESC').all();
      
      // 计算每个玩家的战力
      const playersWithPower = players.map(player => {
        let gameData = {};
        try {
          gameData = db.prepare('SELECT * FROM player_game_data WHERE player_id = ?').get(player.id) || {};
        } catch (e) {}
        
        const combatPower = calculatePlayerCombatPower(player, gameData);
        return {
          ...player,
          value: combatPower
        };
      });
      
      // 按战力排序
      playersWithPower.sort((a, b) => b.value - a.value);
      
      // 取前100
      ranking = playersWithPower.slice(0, 100).map((player, index) => ({
        rank: index + 1,
        player_id: player.id,
        username: player.username,
        value: player.value,
        level: player.level,
        realm_level: player.realm_level,
        spirit_stones: player.spirit_stones
      }));
    } else {
      // 其他排行榜使用数据库字段
      ranking = db.prepare(`
        SELECT id, username, ${config.field} as value, level, realm_level, spirit_stones
        FROM player
        ORDER BY ${config.field} ${config.order}
        LIMIT 100
      `).all();

      ranking = ranking.map((player, index) => ({
        rank: index + 1,
        player_id: player.id,
        username: player.username,
        value: player.value,
        level: player.level,
        realm_level: player.realm_level,
        spirit_stones: player.spirit_stones
      }));
    }

    res.json({
      success: true,
      data: {
        type: type,
        name: config.name,
        ranking: ranking
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/ranking/:type/me - 获取我的排名
app.get('/api/ranking/:type/me', (req, res) => {
  try {
    const { type } = req.params;
    const { player_id } = req.query;

    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }

    if (!isValidRankingType(type)) {
      return res.status(400).json({ 
        success: false, 
        error: `无效的排行榜类型，可用类型: ${Object.keys(RANKING_TYPES).join(', ')}` 
      });
    }

    const config = RANKING_TYPES[type];

    // 检查玩家是否存在
    const player = db.prepare('SELECT id, username, level, realm_level, spirit_stones, rank_id FROM player WHERE id = ?').get(player_id);

    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    // 战力排行榜使用实时计算
    if (config.isRealTime) {
      // 获取所有玩家
      const players = db.prepare('SELECT * FROM player').all();
      
      // 计算每个玩家的战力
      const playersWithPower = players.map(p => {
        let gameData = {};
        try {
          gameData = db.prepare('SELECT * FROM player_game_data WHERE player_id = ?').get(p.id) || {};
        } catch (e) {}
        
        const combatPower = calculatePlayerCombatPower(p, gameData);
        return {
          ...p,
          value: combatPower
        };
      });
      
      // 按战力排序
      playersWithPower.sort((a, b) => b.value - a.value);
      
      // 找到当前玩家的排名
      const myIndex = playersWithPower.findIndex(p => p.id === parseInt(player_id));
      const myRank = myIndex + 1;
      const myValue = playersWithPower[myIndex]?.value || 0;
      
      // 获取前后各2名玩家
      const startIdx = Math.max(0, myIndex - 2);
      const endIdx = Math.min(playersWithPower.length, myIndex + 3);
      const neighbors = playersWithPower.slice(startIdx, endIdx);
      
      const neighborRanking = neighbors.map((p, index) => ({
        rank: startIdx + index + 1,
        player_id: p.id,
        username: p.username,
        value: p.value,
        level: p.level,
        realm_level: p.realm_level,
        spirit_stones: p.spirit_stones
      }));
      
      res.json({
        success: true,
        data: {
          type: type,
          name: config.name,
          my_rank: myRank,
          my_value: myValue,
          neighbors: neighborRanking
        }
      });
    } else {
      // 计算排名（查询比当前玩家值更高的玩家数量 + 1）
      const countHigher = db.prepare(`
        SELECT COUNT(*) as count FROM player WHERE ${config.field} > ?
      `).get(player[config.field]);

      const myRank = countHigher.count + 1;

      // 获取前后各2名玩家（共5名）
      const offset = Math.max(0, myRank - 3);
      const neighbors = db.prepare(`
        SELECT id, username, ${config.field} as value, level, realm_level, spirit_stones
        FROM player
        ORDER BY ${config.field} ${config.order}
        LIMIT 5 OFFSET ?
      `).all(offset);

      const neighborRanking = neighbors.map((p, index) => ({
        rank: offset + index + 1,
        player_id: p.id,
        username: p.username,
        value: p.value,
        level: p.level,
        realm_level: p.realm_level,
        spirit_stones: p.spirit_stones
      }));

      res.json({
        success: true,
        data: {
          type: type,
          name: config.name,
          my_rank: myRank,
          my_value: player[config.field],
          neighbors: neighborRanking
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 商城系统 API ============

// 商城商品配置 (灵石充值商品)
const SHOP_RMB_ITEMS = {
  spirit_package_100: {
    id: 'spirit_package_100',
    name: '灵石包',
    description: '包含100灵石',
    price: 10, // 价格(人民币元)
    price_type: 'rmb',
    icon: '💰',
    rewards: { spirit_stones: 100 },
    rarity: 1
  },
  spirit_pill_1000: {
    id: 'spirit_pill_1000',
    name: '灵气丹',
    description: '包含1000灵气',
    price: 1, // 价格(人民币元)
    price_type: 'rmb',
    icon: '✨',
    rewards: { spirit: 1000 },
    rarity: 1
  },
  vip_day_1: {
    id: 'vip_day_1',
    name: 'VIP体验卡(1天)',
    description: 'VIP体验1天，享20%灵石加成',
    price: 5, // 价格(人民币元)
    price_type: 'rmb',
    icon: '👑',
    rewards: { vip_days: 1 },
    rarity: 2
  }
};

// 获取玩家仓库/储物箱物品（支持按类型过滤）
app.get('/api/bins/', (req, res) => {
  try {
    const { player_id, type } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    let items = [];
    
    // 根据type参数过滤，只查询需要的表
    const includeArtifacts = !type || type === 'artifact';
    const includeProtection = !type || type === 'protection';
    
    // 获取玩家的法宝
    if (includeArtifacts) {
      const artifacts = db.prepare(`
        SELECT artifact_id as item_id, artifact_name as item_name, quantity, 'artifact' as item_type 
        FROM player_artifacts 
        WHERE player_id = ?
      `).all(player_id);
      items.push(...artifacts);
    }
    
    // 获取玩家的护身符/保护道具
    if (includeProtection) {
      const protectionItems = db.prepare(`
        SELECT item_id, item_name, quantity, 'protection' as item_type 
        FROM player_protection_items 
        WHERE player_id = ? AND quantity > 0
      `).all(player_id);
      items.push(...protectionItems);
    }
    
    res.json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/shop/list - 获取商品列表
app.get('/api/shop/list', (req, res) => {
  try {
    const { player_id } = req.query;
    
    const items = Object.values(SHOP_RMB_ITEMS).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      price_type: item.price_type,
      icon: item.icon,
      rewards: item.rewards,
      rarity: item.rarity
    }));
    
    res.json({
      success: true,
      data: {
        items: items,
        total: items.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/shop/items - 兼容旧版客户端
app.get('/api/shop/items', (req, res) => {
  try {
    const { player_id } = req.query;
    
    const items = Object.values(SHOP_RMB_ITEMS).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      price_type: item.price_type,
      icon: item.icon,
      rewards: item.rewards,
      rarity: item.rarity
    }));
    
    res.json({
      success: true,
      data: {
        items: items,
        total: items.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/shop/buy - 购买商品
app.post('/api/shop/buy', (req, res) => {
  try {
    const { player_id, item_id, quantity = 1 } = req.body;
    
    if (!player_id || !item_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 player_id 或 item_id' });
    }
    
    // 首先尝试从数据库 shop_items 表获取商品
    let shopItem = db.prepare('SELECT * FROM shop_items WHERE id = ? AND is_active = 1').get(item_id);
    
    // 如果数据库中没有，从内存 SHOP_ITEMS 获取（向后兼容）
    if (!shopItem) {
      shopItem = SHOP_ITEMS[item_id];
      if (!shopItem) {
        return res.status(404).json({ success: false, error: '商品不存在' });
      }
    }
    
    // 获取或创建玩家
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    let actualPlayerId = player_id;
    
    if (!player) {
      const result = db.prepare('INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)').run(`player_${player_id}`, 10000, 1, 0);
      actualPlayerId = result.lastInsertRowid;
      player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    }
    
    const itemPrice = shopItem.price || shopItem.price; // 数据库字段或内存对象
    const totalPrice = itemPrice * quantity;
    const priceType = shopItem.price_type || 'spirit_stones';
    
    // 检查玩家是否满足购买条件
    if (player.level < (shopItem.level_req || 1)) {
      return res.status(400).json({ success: false, error: `等级不足，需要达到 ${shopItem.level_req} 级` });
    }
    if (player.realm_level < (shopItem.realm_req || 0)) {
      return res.status(400).json({ success: false, error: `境界不足，需要达到 ${shopItem.realm_req} 境界` });
    }
    if ((player.vip_level || 0) < (shopItem.vip_level_req || 0)) {
      return res.status(400).json({ success: false, error: `VIP等级不足，需要VIP ${shopItem.vip_level_req} 级` });
    }
    
    // 根据价格类型检查和扣除费用
    if (priceType === 'spirit_stones') {
      if (player.spirit_stones < totalPrice) {
        return res.status(400).json({ success: false, error: '灵石不足', required: totalPrice, available: player.spirit_stones });
      }
      db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(totalPrice, actualPlayerId);
    } else if (priceType === 'vip_points') {
      // VIP积分购买（如果有）
      return res.status(400).json({ success: false, error: '暂不支持VIP积分购买' });
    }
    
    // 记录购买
    const rewards = [];
    const itemQuantity = shopItem.quantity || 1;
    const finalQuantity = itemQuantity * quantity;
    
    // 根据商品类型发放奖励
    const itemType = shopItem.item_type || shopItem.type;
    const itemId = shopItem.item_id;
    
    if (itemType === 'currency' && itemId === 'spirit_stones') {
      db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(finalQuantity, actualPlayerId);
      rewards.push({ type: 'spirit_stones', amount: finalQuantity });
    } else if (itemType === 'consumable' || itemType === 'gift' || itemType === 'bundle') {
      // 消耗品/礼包/礼包 - 发放到玩家背包或直接使用
      // 这里简化处理：如果是灵石类直接发放，其他发送到背包
      if (itemId === 'spirit_pill' || itemId === 'exp_book' || itemId === 'luck_charm' || itemId === 'protection_charm') {
        // 直接发放灵石作为补偿（简化处理）
        const compensation = totalPrice;
        db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(compensation, actualPlayerId);
        rewards.push({ type: 'compensation', amount: compensation, note: `已发放 ${shopItem.name} 的等价灵石` });
      } else {
        rewards.push({ type: itemType, item_id: itemId, item_name: shopItem.name, quantity: finalQuantity });
      }
    } else if (itemType === 'gongfa_box') {
      // 功法箱 - 后续可以添加开箱逻辑
      rewards.push({ type: 'gongfa_box', item_id: itemId, item_name: shopItem.name, quantity: finalQuantity });
    } else if (itemType === 'buff') {
      // Buff类 - 后续可以添加buff逻辑
      rewards.push({ type: 'buff', item_id: itemId, item_name: shopItem.name, duration: '24h' });
    } else {
      // 其他类型
      rewards.push({ type: itemType, item_id: itemId, item_name: shopItem.name, quantity: finalQuantity });
    }
    
    // 记录购买历史
    db.prepare(`
      INSERT INTO player_shop_purchases (player_id, item_id, quantity, price_paid)
      VALUES (?, ?, ?, ?)
    `).run(actualPlayerId, item_id, quantity, totalPrice);
    
    // 获取更新后的玩家数据
    const updatedPlayer = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
    
    res.json({
      success: true,
      message: `成功购买 ${shopItem.name} x${quantity}`,
      data: {
        item_id: item_id,
        item_name: shopItem.name,
        category: shopItem.category,
        quantity: quantity,
        price: totalPrice,
        price_type: priceType,
        rewards: rewards,
        player: {
          id: updatedPlayer.id,
          spirit_stones: updatedPlayer.spirit_stones,
          vip_level: updatedPlayer.vip_level,
          vip_expire_at: updatedPlayer.vip_expire_at
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 活动系统 ============

// 活动配置数据
const ACTIVITIES = {
  // 节日活动
  spring_festival: {
    id: 'spring_festival',
    name: '春节庆典',
    type: 'festival',
    description: '欢庆春节，大量好礼等你来拿！',
    icon: '🧧',
    start_time: '2026-01-25 00:00:00',
    end_time: '2026-02-15 23:59:59',
    rewards: [
      { type: 'spirit_stones', amount: 8888, description: '压岁钱' },
      { type: 'item', item_id: 'spring_gift', item_name: '春节礼包', quantity: 1 }
    ],
    bonus: {
      exp_rate: 1.5,
      spirit_rate: 1.5,
      drop_rate: 1.2
    },
    status: 'ended'
  },
  lantern_festival: {
    id: 'lantern_festival',
    name: '元宵灯会',
    type: 'festival',
    description: '元宵佳节，共赏花灯！',
    icon: '🏮',
    start_time: '2026-02-11 00:00:00',
    end_time: '2026-02-12 23:59:59',
    rewards: [
      { type: 'spirit_stones', amount: 1888, description: '赏灯奖励' },
      { type: 'item', item_id: 'lantern', item_name: '花灯', quantity: 1 }
    ],
    bonus: {
      exp_rate: 1.3,
      spirit_rate: 1.3
    },
    status: 'ended'
  },
  // 情人节活动
  valentine: {
    id: 'valentine',
    name: '情人节特惠',
    type: 'festival',
    description: '仙侣双修，浪漫特惠！',
    icon: '💕',
    start_time: '2026-02-14 00:00:00',
    end_time: '2026-02-16 23:59:59',
    rewards: [
      { type: 'item', item_id: 'love_token', item_name: '爱心令牌', quantity: 1 }
    ],
    bonus: {
      intimacy_rate: 2.0,
      double_cultivate_exp: 1.5
    },
    status: 'ended'
  },
  // 限时副本
  thunder_dungeon: {
    id: 'thunder_dungeon',
    name: '雷劫禁地',
    type: 'limited_dungeon',
    description: '挑战雷劫禁地，获取稀有功法！',
    icon: '⚡',
    start_time: '2026-02-01 00:00:00',
    end_time: '2026-02-28 23:59:59',
    difficulty: 'hard',
    recommended_level: 50,
    recommended_realm: 5,
    rewards: [
      { type: 'gongfa', gongfa_id: 'thunder_sword', description: '奔雷剑诀' },
      { type: 'item', item_id: 'thunder_essence', item_name: '雷劫精华', quantity: 10 }
    ],
    entry_cost: {
      spirit_stones: 500
    },
    status: 'ended'
  },
  // 春节后的新活动
  new_year_blessing: {
    id: 'new_year_blessing',
    name: '新年祝福',
    type: 'festival',
    description: '新的一年，仙道永昌！',
    icon: '🎊',
    start_time: '2026-02-17 00:00:00',
    end_time: '2026-03-03 23:59:59',
    rewards: [
      { type: 'spirit_stones', amount: 2026, description: '新年红包' },
      { type: 'item', item_id: 'blessing_scroll', item_name: '祝福卷轴', quantity: 1 }
    ],
    bonus: {
      exp_rate: 1.2,
      spirit_rate: 1.2
    },
    status: 'active'
  },
  // 当前进行的活动
  limited_dungeon_spring: {
    id: 'limited_dungeon_spring',
    name: '春日禁地',
    type: 'limited_dungeon',
    description: '春日限定副本，奖励丰厚！',
    icon: '🌸',
    start_time: '2026-03-01 00:00:00',
    end_time: '2026-03-31 23:59:59',
    difficulty: 'normal',
    recommended_level: 30,
    recommended_realm: 3,
    rewards: [
      { type: 'item', item_id: 'spring_essence', item_name: '春之精华', quantity: 5 },
      { type: 'item', item_id: 'rare_chest', item_name: '稀有宝箱', quantity: 1 }
    ],
    entry_cost: {
      spirit_stones: 200
    },
    status: 'active'
  }
};

// 获取活动状态
function getActivityStatus(activity) {
  const now = new Date();
  const startTime = new Date(activity.start_time);
  const endTime = new Date(activity.end_time);
  
  if (now < startTime) return 'upcoming';
  if (now > endTime) return 'ended';
  return 'active';
}

// 更新所有活动状态
function updateActivityStatuses() {
  for (const key in ACTIVITIES) {
    ACTIVITIES[key].status = getActivityStatus(ACTIVITIES[key]);
  }
}

// 启动时更新活动状态
updateActivityStatuses();

// 每分钟更新一次活动状态
setInterval(() => {
  updateActivityStatuses();
}, 60000);

// GET /api/activity/list - 获取活动列表
app.get('/api/activity/list', (req, res) => {
  try {
    const { type, status } = req.query;
    
    let activities = Object.values(ACTIVITIES);
    
    // 按类型筛选
    if (type) {
      activities = activities.filter(a => a.type === type);
    }
    
    // 按状态筛选
    if (status) {
      activities = activities.filter(a => a.status === status);
    }
    
    // 转换格式
    const result = activities.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      description: a.description,
      icon: a.icon,
      start_time: a.start_time,
      end_time: a.end_time,
      status: a.status,
      difficulty: a.difficulty,
      recommended_level: a.recommended_level,
      recommended_realm: a.recommended_realm,
      rewards_count: a.rewards ? a.rewards.length : 0
    }));
    
    // 按状态和开始时间排序
    result.sort((a, b) => {
      const statusOrder = { active: 0, upcoming: 1, ended: 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return new Date(b.start_time) - new Date(a.start_time);
    });
    
    res.json({
      success: true,
      data: result,
      total: result.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/activity/:id - 获取活动详情
app.get('/api/activity/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const activity = ACTIVITIES[id];
    
    if (!activity) {
      return res.status(404).json({ success: false, error: '活动不存在' });
    }
    
    // 构建详情响应
    const detail = {
      id: activity.id,
      name: activity.name,
      type: activity.type,
      description: activity.description,
      icon: activity.icon,
      start_time: activity.start_time,
      end_time: activity.end_time,
      status: activity.status,
      difficulty: activity.difficulty,
      recommended_level: activity.recommended_level,
      recommended_realm: activity.recommended_realm,
      rewards: activity.rewards,
      bonus: activity.bonus,
      entry_cost: activity.entry_cost
    };
    
    // 计算剩余时间
    const now = new Date();
    const endTime = new Date(activity.end_time);
    const startTime = new Date(activity.start_time);
    
    if (activity.status === 'active') {
      detail.remaining_time = Math.max(0, endTime - now);
    } else if (activity.status === 'upcoming') {
      detail.remaining_time = Math.max(0, startTime - now);
    }
    
    res.json({
      success: true,
      data: detail
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 用户认证 API ====================

// 密码哈希函数
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return salt + ':' + hash;
}

// 密码验证函数
function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// 注册 API
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: '用户名和密码不能为空' });
    }
    
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ success: false, error: '用户名长度需在3-20个字符之间' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: '密码长度至少6个字符' });
    }
    
    // 检查用户名是否已存在
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ success: false, error: '用户名已存在' });
    }
    
    // 哈希密码
    const passwordHash = hashPassword(password);
    
    // 创建用户
    const result = db.prepare('INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)').run(username, passwordHash, email || null);
    const userId = result.lastInsertRowid;
    
    // 创建玩家数据
    const playerResult = db.prepare('INSERT INTO player (user_id, username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?, ?)').run(userId, username, 10000, 1, 0);
    const playerId = playerResult.lastInsertRowid;
    
    // 初始化玩家每日登录记录
    const today = new Date().toISOString().split('T')[0];
    db.prepare('INSERT INTO player_daily_login (player_id, total_login_days, consecutive_login_days, last_login_date, last_claim_date) VALUES (?, ?, ?, ?, ?)').run(playerId, 1, 1, today, null);
    
    res.json({
      success: true,
      message: '注册成功',
      data: {
        userId,
        playerId,
        username
      }
    });
  } catch (error) {
    Logger.error('注册错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 登录 API
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: '用户名和密码不能为空' });
    }
    
    // 查找用户
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }
    
    // 验证密码
    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }
    
    // 更新最后登录时间
    db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    
    // 获取玩家数据
    const player = db.prepare('SELECT * FROM player WHERE user_id = ?').get(user.id);
    
    // 更新在线状态
    db.prepare('UPDATE player SET online_status = 1 WHERE id = ?').run(player.id);
    
    res.json({
      success: true,
      message: '登录成功',
      data: {
        userId: user.id,
        playerId: player.id,
        username: user.username,
        player: {
          id: player.id,
          username: player.username,
          spiritStones: player.spirit_stones,
          level: player.level,
          realmLevel: player.realm_level,
          vipLevel: player.vip_level,
          title: player.title
        }
      }
    });
  } catch (error) {
    Logger.error('登录错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 登出 API
app.post('/api/auth/logout', (req, res) => {
  try {
    const { playerId } = req.body;
    
    if (playerId) {
      db.prepare('UPDATE player SET online_status = 0 WHERE id = ?').run(playerId);
    }
    
    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    Logger.error('登出错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取当前玩家信息 API
app.get('/api/auth/me', (req, res) => {
  try {
    const { playerId } = req.query;
    
    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    res.json({
      success: true,
      data: {
        userId: player.user_id,
        playerId: player.id,
        username: player.username,
        player: {
          id: player.id,
          username: player.username,
          spiritStones: player.spirit_stones,
          level: player.level,
          realmLevel: player.realm_level,
          vipLevel: player.vip_level,
          title: player.title,
          onlineStatus: player.online_status
        }
      }
    });
  } catch (error) {
    Logger.error('获取用户信息错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 修改密码 API
app.post('/api/auth/change-password', (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;
    
    if (!username || !oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: '新密码长度至少6个字符' });
    }
    
    // 查找用户
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }
    
    // 验证旧密码
    if (!verifyPassword(oldPassword, user.password_hash)) {
      return res.status(401).json({ success: false, error: '原密码错误' });
    }
    
    // 更新密码
    const newPasswordHash = hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, user.id);
    
    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    Logger.error('修改密码错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家状态（需要玩家ID）
app.get('/api/player/status', (req, res) => {
  try {
    const { playerId } = req.query;
    
    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    // 获取玩家的游戏数据
    const gameDataRow = db.prepare('SELECT player_data FROM player_game_data WHERE player_id = ?').get(playerId);
    const gameData = gameDataRow && gameDataRow.player_data ? JSON.parse(gameDataRow.player_data) : {};
    
    // 获取爵位加成
    const playerRankId = player.rank_id || 0;
    const rankBonus = rankSystem.getRankBonus(playerRankId);
    
    // 获取经脉加成
    let meridianBonus = { totalAtkBonus: 0, totalDefBonus: 0, totalHpBonus: 0, totalCritBonus: 0, totalDodgeBonus: 0, totalSpiritBonus: 0 };
    try {
      const meridianRow = db.prepare('SELECT * FROM player_meridian WHERE player_id = ?').get(playerId);
      if (meridianRow) {
        meridianBonus = {
          totalAtkBonus: meridianRow.total_atk_bonus || 0,
          totalDefBonus: meridianRow.total_def_bonus || 0,
          totalHpBonus: meridianRow.total_hp_bonus || 0,
          totalCritBonus: meridianRow.total_crit_bonus || 0,
          totalDodgeBonus: meridianRow.total_dodge_bonus || 0,
          totalSpiritBonus: meridianRow.total_spirit_bonus || 0
        };
      }
    } catch (e) {
      // 经脉表可能不存在，忽略
    }
    
    // 获取装备耐久度影响
    const equipmentWithDurability = initializeEquipmentDurability(gameData.equipment || { weapon: null, armor: null, accessory: null });
    const durabilityBonus = getEquipmentEffectiveBonus(equipmentWithDurability);
    
    res.json({
      success: true,
      data: {
        id: player.id,
        username: player.username,
        spirit: gameData.spirit || 0,
        maxSpirit: gameData.max_spirit || 100,
        spiritStones: player.spirit_stones,
        qianghuaStones: player.qianghua_stones || 0,
        level: player.level,
        experience: gameData.experience || 0,
        requiredExp: gameData.required_exp || 100,
        realmLevel: player.realm_level,
        realmName: ['凡人', '练气期', '筑基期', '金丹期', '元婴期', '化神期', '炼虚期', '合体期', '大乘期', '渡劫期'][player.realm_level] || '凡人',
        hp: (gameData.hp || player.hp || 100) + (rankBonus.hp || 0) + (meridianBonus.totalHpBonus || 0),
        maxHp: (gameData.max_hp || 200) + (rankBonus.hp || 0) + (meridianBonus.totalHpBonus || 0),
        atk: (gameData.atk || 10) + (rankBonus.atk || 0) + durabilityBonus.atk + (meridianBonus.totalAtkBonus || 0),
        def: (gameData.def || 0) + (rankBonus.def || 0) + durabilityBonus.def + (meridianBonus.totalDefBonus || 0),
        spiritRate: (gameData.spirit_rate || 1) + (rankBonus.spiritRate || 0),
        // 装备耐久度信息
        equipment: {
          weapon: equipmentWithDurability.weapon,
          weapon_durability: equipmentWithDurability.weapon_durability || 0,
          weapon_max_durability: equipmentWithDurability.weapon_max_durability || 100,
          armor: equipmentWithDurability.armor,
          armor_durability: equipmentWithDurability.armor_durability || 0,
          armor_max_durability: equipmentWithDurability.armor_max_durability || 100,
          accessory: equipmentWithDurability.accessory,
          accessory_durability: equipmentWithDurability.accessory_durability || 0,
          accessory_max_durability: equipmentWithDurability.accessory_max_durability || 100
        },
        // 爵位相关属性
        rankId: playerRankId,
        rankName: rankSystem.getRankName(playerRankId),
        rankTitle: player.rank_title || '凡夫俗子',
        honor: player.honor || 0,
        totalHonor: player.total_honor || 0,
        rankBonus: rankBonus,
        // 经脉加成
        meridianBonus: meridianBonus,
        vipLevel: player.vip_level || 0,
        title: player.title || '',
        isOnline: true,
        lastActive: player.last_active
      }
    });
  } catch (error) {
    Logger.error('获取玩家状态错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 战力评分系统 API ============

// 获取玩家战力（简单数值）
app.get('/api/player/combat-power', (req, res) => {
  try {
    const { playerId } = req.query;
    
    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    // 获取爵位加成
    const playerRankId = player.rank_id || 0;
    const rankBonus = rankSystem ? rankSystem.getRankBonus(playerRankId) : { atk: 0, def: 0, hp: 0 };
    
    // 获取经脉加成
    let meridianBonus = { totalAtkBonus: 0, totalDefBonus: 0, totalHpBonus: 0 };
    try {
      const meridianRow = db.prepare('SELECT * FROM player_meridian WHERE player_id = ?').get(playerId);
      if (meridianRow) {
        meridianBonus = {
          totalAtkBonus: meridianRow.total_atk_bonus || 0,
          totalDefBonus: meridianRow.total_def_bonus || 0,
          totalHpBonus: meridianRow.total_hp_bonus || 0
        };
      }
    } catch (e) {
      // 经脉表可能不存在
    }
    
    // 获取基础属性（从player_game_data或使用默认值）
    const gameDataRow = db.prepare('SELECT player_data FROM player_game_data WHERE player_id = ?').get(playerId);
    const gameData = gameDataRow && gameDataRow.player_data ? JSON.parse(gameDataRow.player_data) : {};
    
    // 构造玩家数据用于战力计算
    const playerData = {
      hp: (gameData.hp || player.hp || 100) + (rankBonus.hp || 0) + (meridianBonus.totalHpBonus || 0),
      maxHp: (gameData.max_hp || 200) + (rankBonus.hp || 0) + (meridianBonus.totalHpBonus || 0),
      atk: (gameData.atk || 10) + (rankBonus.atk || 0) + (meridianBonus.totalAtkBonus || 0),
      def: (gameData.def || 0) + (rankBonus.def || 0) + (meridianBonus.totalDefBonus || 0),
      spiritRate: (gameData.spirit_rate || 1),
      maxSpirit: (gameData.max_spirit || 10),
      realmLevel: player.realm_level || 0,
      rankId: playerRankId,
      equipment: gameData.equipment || { weapon: null, armor: null, accessory: null },
      beasts: gameData.beasts || [],
      equippedGongfa: gameData.equipped_gongfa || {}
    };
    
    // 计算战力
    let combatPower = 0;
    if (combatPowerSystem) {
      const result = combatPowerSystem.calculateCombatPower(playerData, {
        EQUIPMENT_DATA: typeof window !== 'undefined' ? window.EQUIPMENT_DATA : {},
        RANK_DATA: typeof RANK_DATA !== 'undefined' ? RANK_DATA : {},
        BEAST_DATA: typeof window !== 'undefined' ? window.BEAST_DATA : {},
        TECHNIQUE_DATA: typeof window !== 'undefined' ? window.TECHNIQUE_DATA : {}
      });
      combatPower = result.total;
    } else {
      // 如果模块未加载，使用简化计算
      combatPower = Math.floor(
        playerData.maxHp * 0.1 + 
        playerData.atk * 2 + 
        playerData.def * 1.5 + 
        playerData.realmLevel * 100 +
        playerData.rankId * 200
      );
    }
    
    res.json({
      success: true,
      data: {
        playerId: player.id,
        username: player.username,
        combatPower,
        realmLevel: player.realm_level,
        realmName: ['凡人', '练气期', '筑基期', '金丹期', '元婴期', '化神期', '炼虚期', '合体期', '大乘期', '渡劫期', '仙人'][player.realm_level] || '凡人',
        level: player.level,
        rankName: rankSystem ? rankSystem.getRankName(playerRankId) : '凡人'
      }
    });
  } catch (error) {
    Logger.error('获取玩家战力错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家战力详细构成
app.get('/api/player/combat-power/detail', (req, res) => {
  try {
    const { playerId } = req.query;
    
    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    // 获取爵位加成
    const playerRankId = player.rank_id || 0;
    const rankBonus = rankSystem ? rankSystem.getRankBonus(playerRankId) : { atk: 0, def: 0, hp: 0 };
    
    // 获取经脉加成
    let meridianBonus = { totalAtkBonus: 0, totalDefBonus: 0, totalHpBonus: 0, totalCritBonus: 0, totalDodgeBonus: 0 };
    try {
      const meridianRow = db.prepare('SELECT * FROM player_meridian WHERE player_id = ?').get(playerId);
      if (meridianRow) {
        meridianBonus = {
          totalAtkBonus: meridianRow.total_atk_bonus || 0,
          totalDefBonus: meridianRow.total_def_bonus || 0,
          totalHpBonus: meridianRow.total_hp_bonus || 0,
          totalCritBonus: meridianRow.total_crit_bonus || 0,
          totalDodgeBonus: meridianRow.total_dodge_bonus || 0
        };
      }
    } catch (e) {
      // 经脉表可能不存在
    }
    
    // 获取基础属性
    const gameDataRow = db.prepare('SELECT player_data FROM player_game_data WHERE player_id = ?').get(playerId);
    const gameData = gameDataRow && gameDataRow.player_data ? JSON.parse(gameDataRow.player_data) : {};
    
    // 获取装备耐久度影响
    const equipmentWithDurability = initializeEquipmentDurability(gameData.equipment || { weapon: null, armor: null, accessory: null });
    const durabilityBonus = getEquipmentEffectiveBonus(equipmentWithDurability);
    
    // 构造玩家数据
    const playerData = {
      hp: (gameData.hp || player.hp || 100) + (rankBonus.hp || 0) + (meridianBonus.totalHpBonus || 0),
      maxHp: (gameData.max_hp || 200) + (rankBonus.hp || 0) + (meridianBonus.totalHpBonus || 0),
      atk: (gameData.atk || 10) + (rankBonus.atk || 0) + durabilityBonus.atk + (meridianBonus.totalAtkBonus || 0),
      def: (gameData.def || 0) + (rankBonus.def || 0) + durabilityBonus.def + (meridianBonus.totalDefBonus || 0),
      spiritRate: (gameData.spirit_rate || 1),
      maxSpirit: (gameData.max_spirit || 10),
      realmLevel: player.realm_level || 0,
      rankId: playerRankId,
      equipment: equipmentWithDurability,
      beasts: gameData.beasts || [],
      equippedGongfa: gameData.equipped_gongfa || {}
    };
    
    // 获取已装备的功法
    let equippedGongfa = { cultivation: null, combat: null, defense: null, auxiliary: null };
    try {
      const equipped = db.prepare('SELECT slot, gongfa_id FROM player_gongfa_equipment WHERE player_id = ?').all(playerId);
      for (const eq of equipped) {
        if (eq.slot && eq.gongfa_id) {
          equippedGongfa[eq.slot] = eq.gongfa_id;
        }
      }
      playerData.equippedGongfa = equippedGongfa;
    } catch (e) {
      // ignore
    }
    
    // 计算详细战力
    let combatPowerDetail = null;
    if (combatPowerSystem) {
      combatPowerDetail = combatPowerSystem.calculateCombatPower(playerData, {
        EQUIPMENT_DATA: typeof window !== 'undefined' ? window.EQUIPMENT_DATA : {},
        RANK_DATA: typeof RANK_DATA !== 'undefined' ? RANK_DATA : {},
        BEAST_DATA: typeof window !== 'undefined' ? window.BEAST_DATA : {},
        TECHNIQUE_DATA: typeof window !== 'undefined' ? window.TECHNIQUE_DATA : {}
      });
    } else {
      // 简化计算
      const baseStats = combatPowerSystem ? 
        combatPowerSystem.calculateBaseStatsPower(playerData) : 
        { total: Math.floor(playerData.maxHp * 0.1 + playerData.atk * 2 + playerData.def * 1.5 + playerData.spiritRate * 5) };
      
      combatPowerDetail = {
        total: baseStats.total + Math.floor(playerData.realmLevel * 100) + Math.floor(playerData.rankId * 200),
        breakdown: {
          baseStats: baseStats.total,
          realm: Math.floor(playerData.realmLevel * 100),
          rank: Math.floor(playerData.rankId * 200),
          equipment: 0,
          beast: 0,
          gongfa: 0
        },
        details: {
          baseStats,
          realm: { level: playerData.realmLevel, total: Math.floor(playerData.realmLevel * 100) },
          rank: { level: playerData.rankId, total: Math.floor(playerData.rankId * 200) },
          equipment: { total: 0, details: [] },
          beast: { total: 0, count: 0, details: [] },
          gongfa: { total: 0, details: [] }
        }
      };
    }
    
    res.json({
      success: true,
      data: {
        playerId: player.id,
        username: player.username,
        combatPower: combatPowerDetail.total,
        breakdown: combatPowerDetail.breakdown,
        details: combatPowerDetail.details,
        realmLevel: player.realm_level,
        realmName: ['凡人', '练气期', '筑基期', '金丹期', '元婴期', '化神期', '炼虚期', '合体期', '大乘期', '渡劫期', '仙人'][player.realm_level] || '凡人',
        level: player.level,
        rankId: playerRankId,
        rankName: rankSystem ? rankSystem.getRankName(playerRankId) : '凡人',
        // 新增经脉加成
        meridianBonus: {
          atk: meridianBonus.totalAtkBonus,
          def: meridianBonus.totalDefBonus,
          hp: meridianBonus.totalHpBonus,
          crit: meridianBonus.totalCritBonus,
          dodge: meridianBonus.totalDodgeBonus
        }
      }
    });
  } catch (error) {
    Logger.error('获取玩家战力详情错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家数据（需要玩家ID）
app.get('/api/player/data', (req, res) => {
  try {
    const { playerId } = req.query;
    
    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(playerId);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    res.json({
      success: true,
      data: {
        id: player.id,
        username: player.username,
        spiritStones: player.spirit_stones,
        level: player.level,
        realmLevel: player.realm_level,
        vipLevel: player.vip_level,
        title: player.title,
        createdAt: player.created_at
      }
    });
  } catch (error) {
    Logger.error('获取玩家数据错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家强化石数量
app.get('/api/player/qianghua-stone', (req, res) => {
  try {
    const { playerId } = req.query;
    
    if (!playerId) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const player = db.prepare('SELECT qianghua_stones FROM player WHERE id = ?').get(playerId);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    res.json({
      success: true,
      data: {
        player_id: playerId,
        qianghua_stones: player.qianghua_stones || 0
      }
    });
  } catch (error) {
    Logger.error('获取强化石数量错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家列表
app.get('/api/players', (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    const players = db.prepare(`
      SELECT id, username, level, realm_level, vip_level, title, created_at 
      FROM player 
      ORDER BY id DESC 
      LIMIT ? OFFSET ?
    `).all(parseInt(limit), parseInt(offset));
    
    const total = db.prepare('SELECT COUNT(*) as count FROM player').get().count;
    
    res.json({
      success: true,
      data: {
        players: players,
        total: total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    Logger.error('获取玩家列表错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 爵位系统 API ====================
const { rankSystem, RANK_DATA, HONOR_SOURCES } = require('./game/rank_system');

// 获取所有爵位信息
app.get('/api/rank/list', (req, res) => {
  try {
    const ranks = rankSystem.getAllRanks();
    res.json({
      success: true,
      data: ranks
    });
  } catch (error) {
    Logger.error('获取爵位列表错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取玩家爵位信息
app.get('/api/player/rank', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }

    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(parseInt(player_id));
    
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    const playerData = {
      rank: player.rank_id || 0,
      rankTitle: player.rank_title || '凡夫俗子',
      honor: player.honor || 0,
      totalHonor: player.total_honor || 0
    };

    const progress = rankSystem.getRankProgress(playerData);
    const rankBonus = rankSystem.getRankBonus(playerData.rank);
    const dailyReward = rankSystem.getDailyReward(playerData.rank);

    res.json({
      success: true,
      data: {
        rankId: playerData.rank,
        rankName: progress.currentRank.name,
        rankTitle: playerData.rankTitle,
        honor: playerData.honor,
        totalHonor: playerData.totalHonor,
        progress: progress,
        bonus: rankBonus,
        dailyReward: dailyReward
      }
    });
  } catch (error) {
    Logger.error('获取玩家爵位信息错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 申请晋升
app.post('/api/rank/promote', (req, res) => {
  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }

    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(parseInt(player_id));
    
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    const playerData = {
      rank: player.rank_id || 0,
      honor: player.honor || 0
    };

    const result = rankSystem.promote(playerData);

    if (!result.success) {
      return res.json(result);
    }

    // 更新玩家数据
    db.prepare(`
      UPDATE player 
      SET rank_id = ?, rank_title = ?, honor = ?, total_honor = total_honor + ?
      WHERE id = ?
    `).run(
      result.newRank.id,
      result.newRank.title,
      playerData.honor,
      playerData.honor, // 之前扣除的荣誉值累加到总荣誉
      parseInt(player_id)
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        newRank: result.newRank,
        remainingHonor: playerData.honor
      }
    });
  } catch (error) {
    Logger.error('晋升错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取爵位每日奖励配置
app.get('/api/rank/rewards', (req, res) => {
  try {
    const { player_id } = req.query;
    
    let playerRank = 0;
    let lastRewardTime = null;
    
    if (player_id) {
      const player = db.prepare('SELECT rank_id, last_daily_reward FROM player WHERE id = ?').get(parseInt(player_id));
      if (player) {
        playerRank = player.rank_id || 0;
        lastRewardTime = player.last_daily_reward;
      }
    }

    // 获取所有爵位的奖励配置
    const rewards = Object.values(RANK_DATA).map(rank => ({
      rankId: rank.id,
      rankName: rank.name,
      dailyReward: rank.dailyReward,
      bonus: rank.bonus
    }));

    // 检查是否可以领取今日奖励
    let canClaim = false;
    if (player_id && lastRewardTime) {
      const now = new Date();
      const lastReward = new Date(lastRewardTime);
      canClaim = now.toDateString() !== lastReward.toDateString();
    } else if (player_id && !lastRewardTime) {
      canClaim = true;
    }

    // 当前爵位的每日奖励
    const currentReward = RANK_DATA[playerRank]?.dailyReward || { spiritStones: 0 };

    res.json({
      success: true,
      data: {
        rewards: rewards,
        currentRank: playerRank,
        currentReward: currentReward,
        canClaimDailyReward: canClaim,
        lastRewardTime: lastRewardTime
      }
    });
  } catch (error) {
    Logger.error('获取爵位奖励配置错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 领取爵位每日奖励
app.post('/api/rank/claim-daily-reward', (req, res) => {
  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }

    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(parseInt(player_id));
    
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    const lastRewardTime = player.last_daily_reward;
    const now = new Date();

    // 检查今天是否已经领取
    if (lastRewardTime) {
      const lastReward = new Date(lastRewardTime);
      if (now.toDateString() === lastReward.toDateString()) {
        return res.json({ 
          success: false, 
          message: '今日奖励已领取，请明天再来' 
        });
      }
    }

    const playerRank = player.rank_id || 0;
    const reward = RANK_DATA[playerRank]?.dailyReward || { spiritStones: 0 };

    // 发放奖励
    const newSpiritStones = (player.spirit_stones || 0) + (reward.spiritStones || 0);

    db.prepare(`
      UPDATE player 
      SET spirit_stones = ?, last_daily_reward = ?
      WHERE id = ?
    `).run(newSpiritStones, now.toISOString(), parseInt(player_id));

    res.json({
      success: true,
      message: `领取成功！获得${reward.spiritStones}灵石`,
      data: {
        reward: reward,
        newBalance: newSpiritStones
      }
    });
  } catch (error) {
    Logger.error('领取每日奖励错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 添加荣誉值（内部接口，供其他系统调用）
app.post('/api/rank/add-honor', (req, res) => {
  try {
    const { player_id, source, scale = 1.0 } = req.body;
    
    if (!player_id || !source) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(parseInt(player_id));
    
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    const playerData = {
      rank: player.rank_id || 0,
      honor: player.honor || 0
    };

    const gainedHonor = rankSystem.addHonor(playerData, source, scale);

    // 更新玩家荣誉值
    db.prepare(`
      UPDATE player 
      SET honor = ?, total_honor = total_honor + ?
      WHERE id = ?
    `).run(playerData.honor, gainedHonor, parseInt(player_id));

    res.json({
      success: true,
      data: {
        gainedHonor: gainedHonor,
        totalHonor: playerData.honor
      }
    });
  } catch (error) {
    Logger.error('添加荣誉值错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 静态文件服务 - 提供前端页面
app.use(express.static(path.join(__dirname, 'src')));

// 简单的favicon处理（避免404）- 放在静态服务之后确保优先处理
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // 返回无内容
});

// 兼容路由：/bins/ -> /api/bins/
app.get('/bins/', (req, res) => {
  const { player_id } = req.query;
  if (!player_id) {
    return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
  }
  try {
    // 获取玩家的物品
    const artifacts = db.prepare(`
      SELECT artifact_id as item_id, artifact_name as item_name, quantity, 'artifact' as item_type 
      FROM player_artifacts WHERE player_id = ?
    `).all(player_id);
    
    const protectionItems = db.prepare(`
      SELECT item_id, item_name, quantity, 'protection' as item_type 
      FROM player_protection_items WHERE player_id = ? AND quantity > 0
    `).all(player_id);

    res.json({ success: true, data: [...artifacts, ...protectionItems], count: artifacts.length + protectionItems.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 首页 - 提供 index.html
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'src', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ success: false, error: '前端页面不存在' });
  }
});

// ============ API路由别名（兼容前端复数形式请求，必须放在404之前）===========
// 成就: /api/achievements/* 
app.get('/api/achievements/list', (req, res) => {
  const { player_id } = req.query;
  if (!player_id) return res.json({ success: true, data: [], message: '请提供 player_id 参数' });
  let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
  if (!player) return res.json({ success: true, data: [] });
  const achievements = db.prepare('SELECT * FROM player_achievements WHERE player_id = ?').all(player_id);
  const achievementMap = {};
  for (const a of achievements) { achievementMap[a.achievement_id] = a; }
  const list = Object.values(ACHIEVEMENTS).map(achievement => {
    const playerAchievement = achievementMap[achievement.id] || { progress: 0, completed: 0, claimed: 0 };
    const progress = playerAchievement.progress;
    const target = achievement.target;
    const percent = Math.min(100, Math.round((progress / target) * 100));
    return { id: achievement.id, name: achievement.name, description: achievement.description, icon: achievement.icon, progress, target, percent, completed: playerAchievement.completed, claimed: playerAchievement.claimed };
  });
  res.json({ success: true, data: list });
});

app.post('/api/achievements/claim', (req, res) => {
  const { player_id, achievement_id } = req.body;
  if (!player_id || !achievement_id) return res.status(400).json({ success: false, error: '缺少必要参数' });
  const playerAchievement = db.prepare('SELECT * FROM player_achievements WHERE player_id = ? AND achievement_id = ?').get(player_id, achievement_id);
  if (!playerAchievement || !playerAchievement.completed || playerAchievement.claimed) return res.json({ success: false, error: '成就未完成或已领取' });
  db.prepare('UPDATE player_achievements SET claimed = 1 WHERE player_id = ? AND achievement_id = ?').run(player_id, achievement_id);
  const achievement = ACHIEVEMENTS[achievement_id];
  if (achievement && achievement.rewards) {
    const rewards = typeof achievement.rewards === 'string' ? JSON.parse(achievement.rewards) : achievement.rewards;
    for (const reward of rewards) {
      if (reward.type === 'spirit_stones') db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(reward.amount, player_id);
    }
  }
  res.json({ success: true, message: '奖励领取成功' });
});

// 任务: /api/tasks/*
app.get('/api/tasks/list', (req, res) => {
  try {
    const { player_id } = req.query;
    if (!player_id) return res.json({ success: true, data: [] });

    // 获取所有任务模板
    const allTasks = db.prepare('SELECT * FROM tasks ORDER BY difficulty ASC, level_req ASC').all();

    // 获取玩家任务进度
    let playerTasksMap = {};
    const playerTasks = db.prepare('SELECT * FROM player_tasks WHERE player_id = ?').all(player_id);
    playerTasks.forEach(pt => { playerTasksMap[pt.task_id] = pt; });

    // 构建返回数据
    const list = allTasks.map(t => {
      const pt = playerTasksMap[t.id];
      return {
        id: t.id,
        name: t.name,
        type: t.type,
        description: t.description,
        category: t.category,
        difficulty: t.difficulty,
        level_req: t.level_req,
        realm_req: t.realm_req,
        icon: t.icon || '',
        target_type: t.target_type,
        target_id: t.target_id,
        target_count: t.target_count,
        rewards: JSON.parse(t.rewards || '{}'),
        exp: t.exp || 0,
        spirit_stones: t.spirit_stones || 0,
        is_repeatable: t.is_repeatable === 1,
        cooldown_minutes: t.cooldown_minutes || 0,
        status: pt ? pt.status : null,
        progress: pt ? pt.progress : 0,
        completed: pt ? (pt.status === 'completed' || pt.status === 'claimed') : false,
        claimed: pt ? (pt.status === 'claimed') : false,
        started_at: pt ? pt.started_at : null,
        completed_at: pt ? pt.completed_at : null,
        claimed_at: pt ? pt.claimed_at : null
      };
    });

    // 分类统计
    const stats = {
      total: list.length,
      main: list.filter(t => t.category === 'main').length,
      daily: list.filter(t => t.category === 'daily').length,
      side: list.filter(t => t.category === 'side').length
    };

    res.json({ success: true, data: list, stats });
  } catch (error) {
    Logger.error('获取任务列表错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 市场: /api/market/*
app.get('/api/market/list', (req, res) => {
  res.json({ success: true, data: [], message: '市场功能开发中' });
});

// 法宝: /api/artifacts/*
app.get('/api/artifacts/list', (req, res) => {
  res.json({ success: true, data: [], message: '法宝系统开发中' });
});

// 师尊: /api/master/*
app.get('/api/master/info', (req, res) => {
  res.json({ success: true, data: { level: 1, name: '新手师尊', blessing: { attack: 0, defense: 0, hp: 0 } }, message: '师尊系统开发中' });
});

// ==================== 玩家挑战 API (境界压制) ====================

// 获取境界压制配置
app.get('/api/realm-suppression/config', (req, res) => {
  try {
    if (!realmSuppression) {
      return res.json({ success: true, data: { allowRealmSuppression: false, message: '境界压制模块未加载' } });
    }
    const config = realmSuppression.getConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取所有境界信息
app.get('/api/realm-suppression/realms', (req, res) => {
  try {
    if (!realmSuppression) {
      return res.json({ success: true, data: [] });
    }
    const realms = realmSuppression.getAllRealms();
    res.json({ success: true, data: realms });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/realm-suppression/claim-reward - 领取封魔渊通关魔晶奖励
// body: { player_id, realm_order, is_first_clear }
app.post('/api/realm-suppression/claim-reward', (req, res) => {
  try {
    const { player_id, realm_order, is_first_clear } = req.body;
    if (!player_id || realm_order === undefined) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const player = db.prepare('SELECT id, realm_level FROM player WHERE id = ?').get(player_id);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    const reward = magicCrystalSystem.calcRealmSuppressionReward(realm_order, is_first_clear === true, is_first_clear === false);
    magicCrystalSystem.modifyCrystals(player_id, reward, `realm_suppression_clear:order_${realm_order}`);

    res.json({
      success: true,
      reward,
      reason: is_first_clear ? '首次通关' : '每日首通',
      remaining: magicCrystalSystem.getPlayerCrystals(player_id),
    });
  } catch (error) {
    Logger.error('封魔渊奖励领取错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 玩家挑战另一个玩家 (PVP)
app.post('/api/challenge/player', (req, res) => {
  try {
    const { challenger_id, target_id } = req.body;
    
    if (!challenger_id || !target_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数: challenger_id, target_id' });
    }
    
    if (challenger_id === target_id) {
      return res.status(400).json({ success: false, error: '不能挑战自己' });
    }
    
    // 获取挑战者数据
    let challenger = db.prepare('SELECT * FROM player WHERE id = ?').get(challenger_id);
    if (!challenger) {
      return res.status(404).json({ success: false, error: '挑战者不存在' });
    }
    
    // 获取目标玩家数据
    let target = db.prepare('SELECT * FROM player WHERE id = ?').get(target_id);
    if (!target) {
      return res.status(404).json({ success: false, error: '目标玩家不存在' });
    }
    
    // 解析境界信息
    const challengerRealm = realmSuppression ? realmSuppression.parsePlayerRealm(challenger) : { order: 0, level: 1 };
    const targetRealm = realmSuppression ? realmSuppression.parsePlayerRealm(target) : { order: 0, level: 1 };
    
    // 检查是否可以挑战
    if (realmSuppression) {
      const check = realmSuppression.canChallengePlayer(challenger, target);
      if (!check.canChallenge) {
        return res.json({
          success: false,
          error: check.reason,
          realmInfo: {
            challenger: challengerRealm,
            target: targetRealm
          }
        });
      }
    }
    
    // 计算境界压制
    let suppression = null;
    let challengerBonus = 1;
    let targetBonus = 1;
    
    if (realmSuppression) {
      const challengerSuppression = realmSuppression.calculateSuppressionBonus(challenger, target);
      const targetSuppression = realmSuppression.calculateSuppressionBonus(target, challenger);
      
      challengerBonus = challengerSuppression.multiplier;
      targetBonus = targetSuppression.multiplier;
      
      suppression = {
        challenger: challengerSuppression,
        target: targetSuppression
      };
    }
    
    // 简单的战斗计算
    // 基础属性 (从数据库获取或使用默认值)
    const challengerAtk = challenger.atk || challenger.realm_level * 10 + 10;
    const challengerDef = challenger.def || challenger.realm_level * 5 + 5;
    const challengerHp = challenger.max_hp || challenger.realm_level * 100 + 100;
    
    const targetAtk = target.atk || target.realm_level * 10 + 10;
    const targetDef = target.def || target.realm_level * 5 + 5;
    const targetHp = target.max_hp || target.realm_level * 100 + 100;
    
    // 应用境界压制加成
    const effectiveChallengerAtk = Math.floor(challengerAtk * challengerBonus);
    const effectiveChallengerDef = Math.floor(challengerDef * challengerBonus);
    const effectiveChallengerHp = Math.floor(challengerHp * challengerBonus);
    
    const effectiveTargetAtk = Math.floor(targetAtk * targetBonus);
    const effectiveTargetDef = Math.floor(targetDef * targetBonus);
    const effectiveTargetHp = Math.floor(targetHp * targetBonus);
    
    // 战斗模拟 - 简单的回合制
    let challengerCurrentHp = effectiveChallengerHp;
    let targetCurrentHp = effectiveTargetHp;
    const battleLog = [];
    
    let round = 0;
    while (challengerCurrentHp > 0 && targetCurrentHp > 0) {
      round++;
      
      // 挑战者攻击
      const challengerDmg = Math.max(1, effectiveChallengerAtk - effectiveTargetDef * 0.3);
      targetCurrentHp -= challengerDmg;
      battleLog.push({ round, attacker: 'challenger', damage: challengerDmg, targetHp: targetCurrentHp });
      
      if (targetCurrentHp <= 0) break;
      
      // 目标反击
      const targetDmg = Math.max(1, effectiveTargetAtk - effectiveChallengerDef * 0.3);
      challengerCurrentHp -= targetDmg;
      battleLog.push({ round, attacker: 'target', damage: targetDmg, targetHp: challengerCurrentHp });
      
      // 限制最大回合数
      if (round >= 50) break;
    }
    
    const challengerWins = targetCurrentHp <= 0;
    
    // 更新玩家战斗统计
    if (challengerWins) {
      db.prepare('UPDATE player SET combat_wins = COALESCE(combat_wins, 0) + 1 WHERE id = ?').run(challenger_id);
      // 奖励
      const reward = Math.floor(50 * Math.pow(1.5, targetRealm.order));
      db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(reward, challenger_id);
    } else {
      db.prepare('UPDATE player SET combat_losses = COALESCE(combat_losses, 0) + 1 WHERE id = ?').run(challenger_id);
    }
    
    // 战斗结束后消耗装备耐久度
    consumeDurability(challenger_id);
    
    res.json({
      success: true,
      data: {
        winner: challengerWins ? 'challenger' : 'target',
        winnerId: challengerWins ? challenger_id : target_id,
        rounds: round,
        suppression: suppression,
        realmInfo: {
          challenger: challengerRealm,
          target: targetRealm
        },
        battleResult: {
          challenger: {
            hp: challengerCurrentHp,
            maxHp: effectiveChallengerHp,
            atk: effectiveChallengerAtk,
            def: effectiveChallengerDef
          },
          target: {
            hp: targetCurrentHp,
            maxHp: effectiveTargetHp,
            atk: effectiveTargetAtk,
            def: effectiveTargetDef
          }
        },
        battleLog: battleLog.slice(-10), // 只返回最后10回合
        reward: challengerWins ? Math.floor(50 * Math.pow(1.5, targetRealm.order)) : 0
      }
    });
  } catch (error) {
    Logger.error('挑战玩家失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 查询玩家境界信息
app.get('/api/player/realm-info', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    const player = db.prepare('SELECT id, username, realm, realm_level, level FROM player WHERE id = ?').get(player_id);
    
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    const realmInfo = realmSuppression ? realmSuppression.parsePlayerRealm(player) : { 
      order: player.realm_level || 0, 
      level: player.level || 1,
      realmName: player.realm || '凡人'
    };
    
    res.json({
      success: true,
      data: {
        playerId: player.id,
        username: player.username,
        ...realmInfo
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 仙道大会（竞技场）系统 API ====================

// 引入竞技场系统
let arenaSystem;
try {
  arenaSystem = require('./game/arena_system');
} catch (e) {
  Logger.warn('竞技场系统加载失败:', e.message);
  arenaSystem = null;
}

// 获取日期字符串
function getDateString(date = new Date()) {
  return date.toISOString().split('T')[0];
}

// 初始化玩家竞技场数据
function getOrCreateArenaPlayer(playerId) {
  let arenaPlayer = db.prepare('SELECT * FROM arena_player WHERE player_id = ?').get(playerId);
  
  if (!arenaPlayer) {
    const currentSeason = arenaSystem.arenaSystem.getCurrentSeasonId();
    const result = db.prepare(`
      INSERT INTO arena_player (player_id, arena_points, rank_id, rank_name, current_season, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(playerId, 0, 0, '凡人', currentSeason);
    
    arenaPlayer = db.prepare('SELECT * FROM arena_player WHERE player_id = ?').get(playerId);
  }
  
  return arenaPlayer;
}

// 检查并重置每日挑战次数
function checkAndResetDailyChallenges(playerId) {
  const today = getDateString();
  const arenaPlayer = db.prepare('SELECT * FROM arena_player WHERE player_id = ?').get(playerId);
  
  if (!arenaPlayer || arenaPlayer.last_challenge_date !== today) {
    db.prepare(`
      UPDATE arena_player 
      SET daily_challenges_used = 0, last_challenge_date = ?, daily_reward_claimed = 0, updated_at = CURRENT_TIMESTAMP
      WHERE player_id = ?
    `).run(today, playerId);
    return { challengesUsed: 0, dailyRewardClaimed: false };
  }
  
  return { 
    challengesUsed: arenaPlayer.daily_challenges_used, 
    dailyRewardClaimed: !!arenaPlayer.daily_reward_claimed 
  };
}

// GET /api/arena/info - 获取竞技场信息
app.get('/api/arena/info', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    // 确保玩家存在
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    // 获取或创建竞技场数据
    const arenaPlayer = getOrCreateArenaPlayer(player_id);
    
    // 检查并重置每日数据
    const dailyInfo = checkAndResetDailyChallenges(player_id);
    
    // 获取段位信息
    const currentRank = arenaSystem.arenaSystem.getRank(arenaPlayer.rank_id);
    const seasonInfo = arenaSystem.arenaSystem.getSeasonRemainingTime();
    
    // 计算排名
    const totalPlayers = db.prepare('SELECT COUNT(*) as count FROM arena_player').get().count || 1;
    const higherRanked = db.prepare('SELECT COUNT(*) as count FROM arena_player WHERE arena_points > ?').get(arenaPlayer.arena_points).count || 0;
    const ranking = higherRanked + 1;
    
    // 获取VIP等级（如果有）
    const vipLevel = player.vip_level || 0;
    const dailyChallengeCount = arenaSystem.arenaSystem.getDailyChallengeCount(vipLevel);
    
    res.json({
      success: true,
      data: {
        player: {
          playerId: player.id,
          username: player.username,
          arenaPoints: arenaPlayer.arena_points,
          rankId: arenaPlayer.rank_id,
          rankName: arenaPlayer.rank_name,
          rankIcon: currentRank.icon,
          winCount: arenaPlayer.win_count,
          loseCount: arenaPlayer.lose_count,
          totalBattles: arenaPlayer.total_battles,
          highestRank: arenaPlayer.highest_rank,
          highestRankId: arenaPlayer.highest_rank_id,
          winRate: arenaPlayer.total_battles > 0 
            ? Math.round((arenaPlayer.win_count / arenaPlayer.total_battles) * 100) 
            : 0
        },
        daily: {
          challengesUsed: dailyInfo.challengesUsed,
          dailyChallengeCount: dailyChallengeCount,
          remainingChallenges: dailyChallengeCount - dailyInfo.challengesUsed,
          dailyRewardClaimed: dailyInfo.dailyRewardClaimed
        },
        season: {
          currentSeasonId: arenaPlayer.current_season,
          seasonRemainingTime: seasonInfo.remainingDays,
          seasonEndTime: seasonInfo.endTime
        },
        ranking: {
          current: ranking,
          total: totalPlayers,
          percentage: Math.round((1 - (ranking / totalPlayers)) * 100)
        }
      }
    });
  } catch (error) {
    Logger.error('获取竞技场信息错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/arena/opponents - 获取可挑战对手列表
app.get('/api/arena/opponents', (req, res) => {
  try {
    const { player_id, refresh } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    // 获取玩家竞技场数据
    const arenaPlayer = getOrCreateArenaPlayer(player_id);
    const currentPoints = arenaPlayer.arena_points;
    
    // 查找附近的对手（在一定积分范围内）
    const range = 2000; // 积分范围
    const opponents = db.prepare(`
      SELECT p.id, p.username, p.level, p.realm_level, p.combat_power,
             ap.arena_points, ap.rank_id, ap.rank_name, ap.win_count, ap.lose_count
      FROM player p
      JOIN arena_player ap ON p.id = ap.player_id
      WHERE ap.player_id != ? 
        AND ap.arena_points BETWEEN ? AND ?
      ORDER BY ap.arena_points DESC
      LIMIT ?
    `).all(player_id, Math.max(0, currentPoints - range), currentPoints + range, 5);
    
    // 如果对手不够，补充一些高排名玩家
    if (opponents.length < 5) {
      const topOpponents = db.prepare(`
        SELECT p.id, p.username, p.level, p.realm_level, p.combat_power,
               ap.arena_points, ap.rank_id, ap.rank_name, ap.win_count, ap.lose_count
        FROM player p
        JOIN arena_player ap ON p.id = ap.player_id
        WHERE ap.player_id != ?
        ORDER BY ap.arena_points DESC
        LIMIT ?
      `).all(player_id, 5 - opponents.length);
      
      // 合并并去重
      const existingIds = new Set(opponents.map(o => o.id));
      for (const top of topOpponents) {
        if (!existingIds.has(top.id)) {
          opponents.push(top);
        }
        if (opponents.length >= 5) break;
      }
    }
    
    // 获取玩家当前段位
    const currentRank = arenaSystem.arenaSystem.getRank(arenaPlayer.rank_id);
    
    // 构建对手信息
    const opponentList = opponents.map(op => {
      const opRank = arenaSystem.arenaSystem.getRank(op.rank_id);
      return {
        playerId: op.id,
        username: op.username,
        level: op.level,
        realmLevel: op.realm_level,
        combatPower: op.combat_power || 0,
        arenaPoints: op.arena_points,
        rankId: op.rank_id,
        rankName: op.rank_name,
        rankIcon: opRank.icon,
        winCount: op.win_count,
        loseCount: op.lose_count,
        winRate: (op.win_count + op.lose_count) > 0 
          ? Math.round((op.win_count / (op.win_count + op.lose_count)) * 100) 
          : 0,
        isRecommend: Math.abs(op.arena_points - currentPoints) < 500
      };
    });
    
    res.json({
      success: true,
      data: {
        playerPoints: currentPoints,
        playerRankId: arenaPlayer.rank_id,
        opponents: opponentList,
        refreshCost: arenaSystem.CHALLENGE_CONFIG.refreshCost
      }
    });
  } catch (error) {
    Logger.error('获取对手列表错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/arena/challenge - 发起挑战
app.post('/api/arena/challenge', (req, res) => {
  try {
    const { player_id, target_id, use_items } = req.body;
    
    if (!player_id || !target_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数 (player_id, target_id)' });
    }
    
    if (player_id === target_id) {
      return res.status(400).json({ success: false, error: '不能挑战自己' });
    }
    
    // 确保玩家存在
    let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    // 检查每日挑战次数
    const dailyInfo = checkAndResetDailyChallenges(player_id);
    const vipLevel = player.vip_level || 0;
    const dailyChallengeCount = arenaSystem.arenaSystem.getDailyChallengeCount(vipLevel);
    
    if (dailyInfo.challengesUsed >= dailyChallengeCount) {
      return res.status(400).json({ 
        success: false, 
        error: '今日挑战次数已用完',
        remaining: 0,
        maxChallenges: dailyChallengeCount
      });
    }
    
    // 获取对手信息
    const targetPlayer = db.prepare(`
      SELECT p.id, p.username, p.level, p.realm_level, p.combat_power,
             ap.arena_points, ap.rank_id, ap.rank_name, ap.win_count, ap.lose_count
      FROM player p
      JOIN arena_player ap ON p.id = ap.player_id
      WHERE p.id = ?
    `).get(target_id);
    
    if (!targetPlayer) {
      return res.status(404).json({ success: false, error: '对手不存在或未参加竞技场' });
    }
    
    // 获取双方竞技场数据
    const attackerArena = getOrCreateArenaPlayer(player_id);
    const defenderArena = getOrCreateArenaPlayer(target_id);
    
    // 模拟战斗
    const attackerPower = player.combat_power || 1000;
    const defenderPower = targetPlayer.combat_power || 1000;
    
    const attackerWin = arenaSystem.arenaSystem.simulateBattle(attackerPower, defenderPower);
    
    // 计算积分变化
    const attackerRank = arenaSystem.arenaSystem.getRank(attackerArena.rank_id);
    const defenderRank = arenaSystem.arenaSystem.getRank(defenderArena.rank_id);
    
    let attackerPointsGain = attackerWin ? attackerRank.winPoints : 0;
    let attackerPointsLoss = !attackerWin ? Math.max(attackerRank.losePoints, 5) : 0;
    let defenderPointsGain = !attackerWin ? defenderRank.winPoints : 0;
    let defenderPointsLoss = attackerWin ? Math.max(defenderRank.losePoints, 5) : 0;
    
    // 更新双方数据
    const today = getDateString();
    const newAttackerPoints = Math.max(0, attackerArena.arena_points + attackerPointsGain - attackerPointsLoss);
    const newDefenderPoints = Math.max(0, defenderArena.arena_points + defenderPointsGain - defenderPointsLoss);
    
    // 计算新段位
    const newAttackerRank = arenaSystem.arenaSystem.getRankByPoints(newAttackerPoints);
    const newDefenderRank = arenaSystem.arenaSystem.getRankByPoints(newDefenderPoints);
    
    // 更新攻击者数据
    db.prepare(`
      UPDATE arena_player 
      SET arena_points = ?, 
          rank_id = ?, 
          rank_name = ?,
          win_count = win_count + ?,
          lose_count = lose_count + ?,
          total_battles = total_battles + 1,
          daily_challenges_used = daily_challenges_used + 1,
          last_challenge_date = ?,
          highest_rank = CASE WHEN ? > highest_rank THEN ? ELSE highest_rank END,
          highest_rank_id = CASE WHEN ? > highest_rank_id THEN ? ELSE highest_rank_id END,
          updated_at = CURRENT_TIMESTAMP
      WHERE player_id = ?
    `).run(
      newAttackerPoints,
      newAttackerRank.id,
      newAttackerRank.name,
      attackerWin ? 1 : 0,
      attackerWin ? 0 : 1,
      today,
      newAttackerRank.id, newAttackerRank.id,
      newAttackerRank.id, newAttackerRank.id,
      player_id
    );
    
    // 更新防守者数据（无论输赢都要记录）
    db.prepare(`
      UPDATE arena_player 
      SET arena_points = ?, 
          rank_id = ?, 
          rank_name = ?,
          win_count = win_count + ?,
          lose_count = lose_count + ?,
          total_battles = total_battles + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE player_id = ?
    `).run(
      newDefenderPoints,
      newDefenderRank.id,
      newDefenderRank.name,
      !attackerWin ? 1 : 0,
      attackerWin ? 1 : 0,
      target_id
    );
    
    // 记录战斗
    const currentSeason = arenaSystem.arenaSystem.getCurrentSeasonId();
    db.prepare(`
      INSERT INTO arena_battles (season, attacker_id, defender_id, attacker_points_before, attacker_points_after, 
        defender_points_before, defender_points_after, attacker_rank_before, attacker_rank_after,
        defender_rank_before, defender_rank_after, result, winner_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      currentSeason,
      player_id,
      target_id,
      attackerArena.arena_points,
      newAttackerPoints,
      defenderArena.arena_points,
      newDefenderPoints,
      attackerArena.rank_id,
      newAttackerRank.id,
      defenderArena.rank_id,
      newDefenderRank.id,
      attackerWin ? 'attacker_win' : 'defender_win',
      attackerWin ? player_id : target_id
    );
    
    // 发放胜利奖励（如果获胜）
    let rewards = null;
    if (attackerWin) {
      const rewardSpiritStones = attackerRank.winPoints * 10; // 每分换算10灵石
      db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(rewardSpiritStones, player_id);
      rewards = { spiritStones: rewardSpiritStones };
    } else {
      // 失败惩罚：减少少量灵石
      const penaltySpiritStones = Math.max(10, attackerPointsLoss * 5);
      const playerAfter = db.prepare('SELECT spirit_stones FROM player WHERE id = ?').get(player_id);
      if (playerAfter && playerAfter.spirit_stones >= penaltySpiritStones) {
        db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(penaltySpiritStones, player_id);
      }
      rewards = { spiritStones: -penaltySpiritStones };
    }
    
    res.json({
      success: true,
      data: {
        result: attackerWin ? 'win' : 'lose',
        attacker: {
          playerId: player_id,
          username: player.username,
          pointsBefore: attackerArena.arena_points,
          pointsAfter: newAttackerPoints,
          pointsChange: newAttackerPoints - attackerArena.arena_points,
          rankBefore: attackerArena.rank_name,
          rankAfter: newAttackerRank.name,
          rankChanged: newAttackerRank.id !== attackerArena.rank_id
        },
        defender: {
          playerId: target_id,
          username: targetPlayer.username,
          pointsBefore: defenderArena.arena_points,
          pointsAfter: newDefenderPoints,
          pointsChange: newDefenderPoints - defenderArena.arena_points,
          rankBefore: defenderArena.rank_name,
          rankAfter: newDefenderRank.name
        },
        battle: {
          attackerPower,
          defenderPower,
          rewards
        },
        daily: {
          challengesUsed: dailyInfo.challengesUsed + 1,
          remainingChallenges: dailyChallengeCount - dailyInfo.challengesUsed - 1
        }
      }
    });
    
    // 竞技场战斗结束后消耗装备耐久度
    consumeDurability(player_id);
  } catch (error) {
    Logger.error('挑战错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/arena/ranking - 排行榜
app.get('/api/arena/ranking', (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const players = db.prepare(`
      SELECT p.id, p.username, p.level, p.realm_level, p.combat_power,
             ap.arena_points, ap.rank_id, ap.rank_name, ap.win_count, ap.lose_count, ap.total_battles
      FROM player p
      JOIN arena_player ap ON p.id = ap.player_id
      ORDER BY ap.arena_points DESC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit), parseInt(offset));
    
    // 获取总数
    const total = db.prepare('SELECT COUNT(*) as count FROM arena_player').get().count || 0;
    
    const ranking = players.map((p, index) => {
      const rank = arenaSystem.arenaSystem.getRank(p.rank_id);
      return {
        rank: parseInt(offset) + index + 1,
        playerId: p.id,
        username: p.username,
        level: p.level,
        realmLevel: p.realm_level,
        combatPower: p.combat_power || 0,
        arenaPoints: p.arena_points,
        rankId: p.rank_id,
        rankName: p.rank_name,
        rankIcon: rank.icon,
        winCount: p.win_count,
        loseCount: p.lose_count,
        totalBattles: p.total_battles,
        winRate: p.total_battles > 0 ? Math.round((p.win_count / p.total_battles) * 100) : 0
      };
    });
    
    res.json({
      success: true,
      data: {
        ranking,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + players.length < total
      }
    });
  } catch (error) {
    Logger.error('获取排行榜错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/arena/rewards - 段位奖励配置
app.get('/api/arena/rewards', (req, res) => {
  try {
    const { player_id } = req.query;
    
    const rewards = arenaSystem.arenaSystem.getRankRewards();
    
    // 如果有玩家ID，附加玩家的领取状态
    let playerRewards = rewards;
    if (player_id) {
      const arenaPlayer = getOrCreateArenaPlayer(player_id);
      const currentSeason = arenaSystem.arenaSystem.getCurrentSeasonId();
      
      playerRewards = rewards.map(r => {
        // 检查是否已领取该段位的晋升奖励
        const claimed = r.rankId < arenaPlayer.rank_id;
        return {
          ...r,
          isClaimed: claimed,
          isCurrent: r.rankId === arenaPlayer.rank_id,
          isNext: r.rankId === arenaPlayer.rank_id + 1
        };
      });
    }
    
    res.json({
      success: true,
      data: {
        rewards: playerRewards,
        currentSeason: arenaSystem.arenaSystem.getCurrentSeasonId(),
        seasonInfo: arenaSystem.arenaSystem.getSeasonRemainingTime()
      }
    });
  } catch (error) {
    Logger.error('获取奖励配置错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/arena/claim-reward - 领取段位奖励
app.post('/api/arena/claim-reward', (req, res) => {
  try {
    const { player_id, reward_type } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    if (!reward_type) {
      return res.status(400).json({ success: false, error: '缺少 reward_type (daily/promotion)' });
    }
    
    // 获取玩家竞技场数据
    const arenaPlayer = getOrCreateArenaPlayer(player_id);
    const today = getDateString();
    
    // 检查每日奖励
    if (reward_type === 'daily') {
      if (arenaPlayer.daily_reward_claimed) {
        return res.status(400).json({ success: false, error: '今日奖励已领取' });
      }
      
      const currentRank = arenaSystem.arenaSystem.getRank(arenaPlayer.rank_id);
      const dailyReward = currentRank.dailyReward;
      
      if (dailyReward.spiritStones > 0) {
        db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(dailyReward.spiritStones, player_id);
      }
      
      // 更新领取状态
      db.prepare(`
        UPDATE arena_player 
        SET daily_reward_claimed = 1, updated_at = CURRENT_TIMESTAMP
        WHERE player_id = ?
      `).run(player_id);
      
      res.json({
        success: true,
        message: `领取每日奖励成功！`,
        data: {
          rewardType: 'daily',
          rewards: dailyReward,
          remainingSpiritStones: (db.prepare('SELECT spirit_stones FROM player WHERE id = ?').get(player_id) || {}).spirit_stones
        }
      });
    } else if (reward_type === 'promotion') {
      // 晋升奖励需要在升级时自动领取，这里只返回信息
      return res.status(400).json({ success: false, error: '晋升奖励将在升级时自动发放' });
    } else {
      return res.status(400).json({ success: false, error: '无效的奖励类型' });
    }
  } catch (error) {
    Logger.error('领取奖励错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 魔晶经济系统 API ============

// GET /api/magic-crystal/info - 获取魔晶信息（余额+商店）
app.get('/api/magic-crystal/info', (req, res) => {
  try {
    const { player_id } = req.query;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }

    const player = db.prepare('SELECT id, magic_crystals, realm_level, vip_level FROM player WHERE id = ?').get(player_id);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    const info = magicCrystalSystem.getInfo(player_id, player.realm_level || 0, player.vip_level || 0);
    res.json({ success: true, data: info });
  } catch (error) {
    Logger.error('获取魔晶信息错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/magic-crystal/claim-daily - 领取每日免费魔晶
app.post('/api/magic-crystal/claim-daily', (req, res) => {
  try {
    const { player_id } = req.body;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }

    const player = db.prepare('SELECT id, realm_level, vip_level FROM player WHERE id = ?').get(player_id);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    const result = magicCrystalSystem.claimDailyFree(player_id, player.vip_level || 0, player.realm_level || 0);
    res.json(result);
  } catch (error) {
    Logger.error('领取每日魔晶错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/magic-crystal/purchase - 购买魔晶商店商品
app.post('/api/magic-crystal/purchase', (req, res) => {
  try {
    const { player_id, goods_id } = req.body;
    if (!player_id || !goods_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const player = db.prepare('SELECT id, realm_level FROM player WHERE id = ?').get(player_id);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }

    const result = magicCrystalSystem.purchase(player_id, goods_id, player.realm_level || 0);
    res.json(result);
  } catch (error) {
    Logger.error('魔晶商店购买错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/magic-crystal/reward - 发放魔晶奖励（内部接口，供其他系统调用）
// body: { player_id, amount, reason }
app.post('/api/magic-crystal/reward', (req, res) => {
  try {
    const { player_id, amount, reason } = req.body;
    if (!player_id || amount === undefined) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const success = magicCrystalSystem.modifyCrystals(player_id, amount, reason || 'system_reward');
    if (success) {
      res.json({ success: true, remaining: magicCrystalSystem.getPlayerCrystals(player_id) });
    } else {
      res.status(404).json({ success: false, error: '玩家不存在' });
    }
  } catch (error) {
    Logger.error('魔晶奖励发放错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/magic-crystal/calc-reward - 计算魔晶奖励（不发放，用于预览）
// query: { type: 'world_boss'|'realm_suppression', damage?, realm_level?, boss_quality?, is_first_clear? }
app.get('/api/magic-crystal/calc-reward', (req, res) => {
  try {
    const { type, damage, realm_level, boss_quality, is_first_clear } = req.query;
    const rl = parseInt(realm_level) || 1;

    let preview = 0;
    if (type === 'world_boss') {
      const d = parseInt(damage) || 0;
      const quality = boss_quality || 'rare';
      preview = magicCrystalSystem.calcWorldBossReward(d, quality, rl);
    } else if (type === 'realm_suppression') {
      const firstClear = is_first_clear === 'true';
      preview = magicCrystalSystem.calcRealmSuppressionReward(rl, firstClear, !firstClear);
    }

    res.json({ success: true, preview });
  } catch (error) {
    Logger.error('魔晶奖励预览错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ 装备耐久度系统 ============

// 装备耐久度配置
const EQUIPMENT_DURABILITY = {
  // 品质对应最大耐久度 (rarity -> max_durability)
  1: { max: 100, name: '普通', repair_cost_factor: 1 },
  2: { max: 200, name: '优秀', repair_cost_factor: 2 },
  3: { max: 500, name: '精良', repair_cost_factor: 5 },
  4: { max: 500, name: '史诗', repair_cost_factor: 5 },
  5: { max: 1000, name: '传说', repair_cost_factor: 10 },
  6: { max: 1000, name: '神器', repair_cost_factor: 10 }
};

// 战斗每次消耗的耐久度
const DURABILITY_LOSS_PER_BATTLE = 5;

// 初始化装备耐久度
function initializeEquipmentDurability(equipment) {
  if (!equipment) return equipment;
  
  const result = { ...equipment };
  for (const slot of ['weapon', 'armor', 'accessory']) {
    if (result[slot]) {
      const equipName = result[slot];
      const rarity = getEquipmentRarity(equipName);
      const durabilityConfig = EQUIPMENT_DURABILITY[rarity] || EQUIPMENT_DURABILITY[1];
      
      // 如果没有耐久度数据，初始化（检查是否为 undefined 或 null，而不是 falsy 值）
      if (result[`${slot}_durability`] === undefined || result[`${slot}_durability`] === null) {
        result[`${slot}_durability`] = durabilityConfig.max;
        result[`${slot}_max_durability`] = durabilityConfig.max;
      }
    }
  }
  return result;
}

// 获取装备品质
function getEquipmentRarity(equipName) {
  // 尝试从 extended_systems.js 获取
  try {
    const extendedSystems = require('./game/extended_systems');
    for (const slot of ['weapon', 'armor', 'accessory']) {
      if (extendedSystems.EQUIPMENT_DATA[slot] && extendedSystems.EQUIPMENT_DATA[slot][equipName]) {
        return extendedSystems.EQUIPMENT_DATA[slot][equipName].rarity || 1;
      }
    }
  } catch (e) {
    // 如果无法加载，使用默认品质
  }
  
  // 尝试从 artifact_system.js 获取
  try {
    const artifactSystem = require('./game/artifact_system');
    if (artifactSystem.ARTIFACT_DATA && artifactSystem.ARTIFACT_DATA[equipName]) {
      const quality = artifactSystem.ARTIFACT_DATA[equipName].quality;
      const qualityMap = { mortal: 1, spirit: 2, treasure: 3, immortal: 4, divine: 5 };
      return qualityMap[quality] || 1;
    }
  } catch (e) {
    // 如果无法加载，使用默认品质
  }
  
  // 根据装备名称猜测品质
  const name = equipName || '';
  if (name.includes('诛仙') || name.includes('天剑') || name.includes('天甲')) return 6;
  if (name.includes('仙剑') || name.includes('仙甲') || name.includes('仙玉')) return 5;
  if (name.includes('灵剑') || name.includes('灵甲') || name.includes('灵识')) return 3;
  if (name.includes('铁剑') || name.includes('铁甲') || name.includes('灵石')) return 2;
  return 1;
}

// 计算装备有效属性（考虑耐久度）
// 装备基础属性映射（备用，当 extended_systems 不可用时使用）
const EQUIPMENT_BASE_STATS = {
  weapon: {
    '木剑': { atk: 5, def: 0 },
    '铁剑': { atk: 15, def: 0 },
    '灵剑': { atk: 40, def: 5 },
    '仙剑': { atk: 100, def: 15 },
    '天剑': { atk: 300, def: 30 },
    '诛仙剑': { atk: 1000, def: 100 }
  },
  armor: {
    '布衣': { atk: 0, def: 3 },
    '皮甲': { atk: 0, def: 10 },
    '铁甲': { atk: 0, def: 25 },
    '灵甲': { atk: 5, def: 60 },
    '仙甲': { atk: 10, def: 200 },
    '天甲': { atk: 30, def: 500 }
  },
  accessory: {
    '普通戒指': { atk: 2, def: 2 },
    '灵石戒指': { atk: 5, def: 5 },
    '灵识戒指': { atk: 15, def: 10 },
    '仙玉戒指': { atk: 40, def: 25 },
    '天晶戒指': { atk: 100, def: 60 }
  }
};

function getEquipmentEffectiveBonus(equipment) {
  const bonus = { atk: 0, def: 0 };
  
  if (!equipment) return bonus;
  
  for (const slot of ['weapon', 'armor', 'accessory']) {
    if (equipment[slot]) {
      const equipName = equipment[slot];
      
      // 获取装备基础属性 - 优先使用备用映射
      let baseAtk = 0, baseDef = 0;
      
      // 尝试从备用映射获取
      if (EQUIPMENT_BASE_STATS[slot] && EQUIPMENT_BASE_STATS[slot][equipName]) {
        baseAtk = EQUIPMENT_BASE_STATS[slot][equipName].atk || 0;
        baseDef = EQUIPMENT_BASE_STATS[slot][equipName].def || 0;
      }
      
      // 检查耐久度
      const currentDurability = equipment[`${slot}_durability`];
      const maxDurability = equipment[`${slot}_max_durability`] || 100;
      
      // 耐久度为0时效果减半
      const durabilityFactor = (currentDurability === undefined || currentDurability === null) ? 1 : 
                               (currentDurability === 0 ? 0.5 : (currentDurability / maxDurability));
      
      bonus.atk += Math.floor(baseAtk * durabilityFactor);
      bonus.def += Math.floor(baseDef * durabilityFactor);
    }
  }
  
  return bonus;
}

// 计算修理费用
function calculateRepairCost(equipment, slot) {
  const equipName = equipment[slot];
  if (!equipName) return 0;
  
  const rarity = getEquipmentRarity(equipName);
  const config = EQUIPMENT_DURABILITY[rarity] || EQUIPMENT_DURABILITY[1];
  
  const maxDurability = equipment[`${slot}_max_durability`] || config.max;
  const currentDurability = equipment[`${slot}_durability`] || 0;
  const durabilityLoss = maxDurability - currentDurability;
  
  if (durabilityLoss <= 0) return 0;
  
  // 修理费用 = 品质系数 × 耐久度损失
  return config.repair_cost_factor * durabilityLoss;
}

// 装备耐久度消耗（战斗后调用）
function consumeDurability(playerId) {
  try {
    const gameDataRow = db.prepare('SELECT player_data FROM player_game_data WHERE player_id = ?').get(playerId);
    if (!gameDataRow || !gameDataRow.player_data) return;
    
    let gameData = JSON.parse(gameDataRow.player_data);
    if (!gameData.equipment) return;
    
    let hasDurabilityLoss = false;
    const equipment = gameData.equipment;
    
    for (const slot of ['weapon', 'armor', 'accessory']) {
      if (equipment[slot]) {
        const maxDurability = equipment[`${slot}_max_durability`] || 100;
        const currentDurability = equipment[`${slot}_durability`];
        
        // 只在耐久度大于0时消耗
        if (currentDurability !== undefined && currentDurability !== null && currentDurability > 0) {
          const newDurability = Math.max(0, currentDurability - DURABILITY_LOSS_PER_BATTLE);
          equipment[`${slot}_durability`] = newDurability;
          if (newDurability !== currentDurability) hasDurabilityLoss = true;
        }
      }
    }
    
    if (hasDurabilityLoss) {
      db.prepare('INSERT OR REPLACE INTO player_game_data (player_id, player_data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(playerId, JSON.stringify(gameData));
    }
  } catch (error) {
    Logger.error('装备耐久度消耗失败:', error);
  }
}

// API: 获取装备耐久度
app.get('/api/equipment/durability', (req, res) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    const player = db.prepare('SELECT id FROM player WHERE id = ?').get(player_id);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    const gameDataRow = db.prepare('SELECT player_data FROM player_game_data WHERE player_id = ?').get(player_id);
    let gameData = gameDataRow && gameDataRow.player_data ? JSON.parse(gameDataRow.player_data) : {};
    
    // 确保 equipment 有耐久度数据
    if (!gameData.equipment) {
      gameData.equipment = { weapon: null, armor: null, accessory: null };
    }
    gameData.equipment = initializeEquipmentDurability(gameData.equipment);
    
    // 保存初始化后的数据
    db.prepare('INSERT OR REPLACE INTO player_game_data (player_id, player_data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(player_id, JSON.stringify(gameData));
    
    const equipment = gameData.equipment;
    const durabilityInfo = {
      weapon: {
        name: equipment.weapon,
        durability: equipment.weapon_durability || 0,
        max_durability: equipment.weapon_max_durability || 100,
        is_broken: (equipment.weapon_durability || 0) === 0
      },
      armor: {
        name: equipment.armor,
        durability: equipment.armor_durability || 0,
        max_durability: equipment.armor_max_durability || 100,
        is_broken: (equipment.armor_durability || 0) === 0
      },
      accessory: {
        name: equipment.accessory,
        durability: equipment.accessory_durability || 0,
        max_durability: equipment.accessory_max_durability || 100,
        is_broken: (equipment.accessory_durability || 0) === 0
      }
    };
    
    res.json({
      success: true,
      data: durabilityInfo
    });
  } catch (error) {
    Logger.error('获取装备耐久度错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 修理装备
app.post('/api/equipment/repair', (req, res) => {
  try {
    const { player_id, slot } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    if (!slot || !['weapon', 'armor', 'accessory'].includes(slot)) {
      return res.status(400).json({ success: false, error: '无效的装备槽位 (weapon/armor/accessory)' });
    }
    
    const player = db.prepare('SELECT id, spirit_stones FROM player WHERE id = ?').get(player_id);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    const gameDataRow = db.prepare('SELECT player_data FROM player_game_data WHERE player_id = ?').get(player_id);
    let gameData = gameDataRow && gameDataRow.player_data ? JSON.parse(gameDataRow.player_data) : {};
    
    if (!gameData.equipment) {
      gameData.equipment = { weapon: null, armor: null, accessory: null };
    }
    gameData.equipment = initializeEquipmentDurability(gameData.equipment);
    
    // 检查是否有装备
    if (!gameData.equipment[slot]) {
      return res.status(400).json({ success: false, error: `槽位 ${slot} 没有装备` });
    }
    
    // 计算修理费用
    const repairCost = calculateRepairCost(gameData.equipment, slot);
    
    if (repairCost === 0) {
      return res.json({
        success: true,
        message: '装备耐久度已满，无需修理',
        data: {
          slot,
          durability: gameData.equipment[`${slot}_durability`],
          max_durability: gameData.equipment[`${slot}_max_durability`],
          cost: 0
        }
      });
    }
    
    // 检查灵石是否足够
    if (player.spirit_stones < repairCost) {
      return res.status(400).json({ 
        success: false, 
        error: `灵石不足，需要 ${repairCost} 灵石，当前拥有 ${player.spirit_stones} 灵石` 
      });
    }
    
    // 扣除灵石
    db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(repairCost, player_id);
    
    // 恢复耐久度
    const maxDurability = gameData.equipment[`${slot}_max_durability`];
    gameData.equipment[`${slot}_durability`] = maxDurability;
    
    // 保存数据
    db.prepare('INSERT OR REPLACE INTO player_game_data (player_id, player_data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(player_id, JSON.stringify(gameData));
    
    res.json({
      success: true,
      message: `修理成功！消耗 ${repairCost} 灵石`,
      data: {
        slot,
        name: gameData.equipment[slot],
        durability: maxDurability,
        max_durability: maxDurability,
        cost: repairCost,
        remaining_spirit_stones: player.spirit_stones - repairCost
      }
    });
  } catch (error) {
    Logger.error('修理装备错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: 修理全部装备
app.post('/api/equipment/repair-all', (req, res) => {
  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    const player = db.prepare('SELECT id, spirit_stones FROM player WHERE id = ?').get(player_id);
    if (!player) {
      return res.status(404).json({ success: false, error: '玩家不存在' });
    }
    
    const gameDataRow = db.prepare('SELECT player_data FROM player_game_data WHERE player_id = ?').get(player_id);
    let gameData = gameDataRow && gameDataRow.player_data ? JSON.parse(gameDataRow.player_data) : {};
    
    if (!gameData.equipment) {
      gameData.equipment = { weapon: null, armor: null, accessory: null };
    }
    gameData.equipment = initializeEquipmentDurability(gameData.equipment);
    
    // 计算所有装备的修理费用
    let totalCost = 0;
    const repairDetails = [];
    
    for (const slot of ['weapon', 'armor', 'accessory']) {
      if (gameData.equipment[slot]) {
        const cost = calculateRepairCost(gameData.equipment, slot);
        if (cost > 0) {
          totalCost += cost;
          repairDetails.push({ slot, name: gameData.equipment[slot], cost });
        }
      }
    }
    
    if (totalCost === 0) {
      return res.json({
        success: true,
        message: '所有装备耐久度已满，无需修理',
        data: {
          repairs: [],
          total_cost: 0
        }
      });
    }
    
    // 检查灵石是否足够
    if (player.spirit_stones < totalCost) {
      return res.status(400).json({ 
        success: false, 
        error: `灵石不足，需要 ${totalCost} 灵石，当前拥有 ${player.spirit_stones} 灵石` 
      });
    }
    
    // 扣除灵石
    db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(totalCost, player_id);
    
    // 恢复所有装备耐久度
    for (const slot of ['weapon', 'armor', 'accessory']) {
      if (gameData.equipment[slot]) {
        const maxDurability = gameData.equipment[`${slot}_max_durability`];
        gameData.equipment[`${slot}_durability`] = maxDurability;
      }
    }
    
    // 保存数据
    db.prepare('INSERT OR REPLACE INTO player_game_data (player_id, player_data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(player_id, JSON.stringify(gameData));
    
    res.json({
      success: true,
      message: `全部修理成功！共消耗 ${totalCost} 灵石`,
      data: {
        repairs: repairDetails,
        total_cost: totalCost,
        remaining_spirit_stones: player.spirit_stones - totalCost
      }
    });
  } catch (error) {
    Logger.error('修理全部装备错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== 论道系统路由 ====================
try {
  const lundaoRoute = require('./backend/routes/lundao');
  app.use('/api/lundao', lundaoRoute);
  Logger.info('✓ 论道系统路由已加载');
} catch (e) {
  Logger.warn('⚠ 论道路由加载失败:', e.message);
}

// ==================== 修炼系统路由 ====================
try {
  const cultivationRoute = require('./backend/routes/cultivation');
  app.use('/api/cultivation', cultivationRoute);
  Logger.info('✓ 修炼系统路由已加载');
} catch (e) {
  Logger.warn('⚠ 修炼路由加载失败:', e.message);
}

// ==================== 婚姻系统路由 ====================
try {
  const coupleModule = require('./backend/routes/couple');
  app.use('/api/couple', coupleModule.router);
  if (db && coupleModule.setDb) coupleModule.setDb(db);
  Logger.info('✓ 婚姻系统路由已加载');
} catch (e) {
  Logger.warn('⚠ 婚姻路由加载失败:', e.message);
}

// ==================== 婚姻系统路由注册 ====================
try {
  const marriageRoute = require('./backend/routes/marriage');
  app.use('/api/marriage', marriageRoute.router);
  if (db && marriageRoute.setDb) marriageRoute.setDb(db);
  Logger.info('✓ 婚姻系统路由已加载');
} catch (e) {
  Logger.warn('⚠ 婚姻路由加载失败:', e.message);
}

// ==================== 第二批路由注册 ====================
// friend/quest/commission/fashion/mount/wing/sect-missions
try {
  const friendRoute = require('./backend/routes/friend');
  app.use('/api/friend', friendRoute);
  Logger.info('✓ 好友系统路由已加载');
} catch (e) {
  Logger.warn('⚠ 好友路由加载失败:', e.message);
}

try {
  const questRoute = require('./backend/routes/quest');
  app.use('/api/quest', questRoute.router);
  Logger.info('✓ 任务系统路由已加载');
} catch (e) {
  Logger.warn('⚠ 任务路由加载失败:', e.message);
}

try {
  const commissionRoute = require('./backend/routes/commission');
  app.use('/api/commission', commissionRoute);
  Logger.info('✓ 委托系统路由已加载');
} catch (e) {
  Logger.warn('⚠ 委托路由加载失败:', e.message);
}

try {
  const fashionRoute = require('./backend/routes/fashion');
  app.use('/api/fashion', fashionRoute);
  Logger.info('✓ 时装系统路由已加载');
} catch (e) {
  Logger.warn('⚠ 时装路由加载失败:', e.message);
}

try {
  const mountRoute = require('./backend/routes/mount');
  app.use('/api/mount', mountRoute);
  Logger.info('✓ 坐骑系统路由已加载');
} catch (e) {
  Logger.warn('⚠ 坐骑路由加载失败:', e.message);
}

try {
  const wingRoute = require('./backend/routes/wing');
  app.use('/api/wing', wingRoute);
  Logger.info('✓ 翅膀系统路由已加载');
} catch (e) {
  Logger.warn('⚠ 翅膀路由加载失败:', e.message);
}

try {
  const fishingRoute = require('./backend/routes/fishing');
  app.use('/api/fishing', fishingRoute);
  Logger.info('✓ 钓鱼系统路由已加载');
} catch (e) {
  Logger.warn('⚠ 钓鱼路由加载失败:', e.message);
}

try {
  const sectMissionsRoute = require('./backend/routes/sect-missions');
  app.use('/api/sect-missions', sectMissionsRoute);
  Logger.info('✓ 宗门任务路由已加载');
} catch (e) {
  Logger.warn('⚠ 宗门任务路由加载失败:', e.message);
}

try {
  const auctionRoute = require('./backend/routes/auction');
  app.use('/api/auction', auctionRoute);
  Logger.info('✓ 拍卖行路由已加载');
} catch (e) {
  Logger.warn('⚠ 拍卖路由加载失败:', e.message);
}

try {
  const paradiseRoute = require('./backend/routes/paradise');
  app.use('/api/paradise', paradiseRoute);
  Logger.info('✓ 福地路由已加载');
} catch (e) {
  Logger.warn('⚠ 福地路由加载失败:', e.message);
}

try {
  const seasonPassRoute = require('./backend/routes/season_pass');
  app.use('/api/season-pass', seasonPassRoute);
  Logger.info('✓ 战令路由已加载');
} catch (e) {
  Logger.warn('⚠ 战令路由加载失败:', e.message);
}

// ==================== 境界副本路由 ====================
try {
  const realmDungeonRoute = require('./backend/routes/realm_dungeon');
  app.use('/api/realm-dungeon', realmDungeonRoute);
  app.use('/api/realm_dungeon', realmDungeonRoute);
  Logger.info('✓ 境界副本路由已加载');
} catch (e) {
  Logger.warn('⚠ 境界副本路由加载失败:', e.message);
}

// ============ 每日试炼路由 ============
try {
  const dailyTrialRoute = require('./backend/routes/daily-trial');
  app.use('/api/daily-trial', dailyTrialRoute);
  Logger.info('✅ 每日试炼路由已加载 (backend/routes/daily-trial.js)');
} catch (e) {
  Logger.warn('⚠ 每日试炼路由加载失败:', e.message);
}

// ============ 宗门活跃路由 ============
try {
  const sectActivityRoute = require('./backend/routes/sect-activity');
  app.use('/api/sect-activity', sectActivityRoute);
  Logger.info('✅ 宗门活跃路由已加载 (backend/routes/sect-activity.js)');
} catch (e) {
  Logger.warn('⚠ 宗门活跃路由加载失败:', e.message);
}

// ============ 洞府路由 ============
try {
  const caveRoute = require('./backend/routes/cave');
  app.use('/api/cave', caveRoute);
  Logger.info('✅ 洞府路由已加载 (backend/routes/cave.js)');
} catch (e) {
  Logger.warn('⚠ 洞府路由加载失败:', e.message);
}

// 404处理 - 统一错误响应（必须放在所有路由之后）
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'API端点不存在',
    path: req.path,
    method: req.method,
    hint: '请检查API路径是否正确'
  });
});

// ==================== 模块化路由加载 ====================
// 尝试加载模块化路由（可选）
try {
  const { loadRoutes } = require('./routes/index');
  // 保留现有路由，新增模块化路由可通过 loadRoutes(app, db, authenticateToken, Logger) 加载
  loadRoutes(app, db, authenticateToken, Logger);
  Logger.info('✓ 路由模块加载器已激活');
} catch (e) {
  Logger.debug('模块化路由未启用，使用单体server.js');
}

// ==================== 装备套装路由 ====================
try {
  const equipmentRoutes = require('./backend/routes/equipment');
  app.use('/api/equipment', equipmentRoutes);
  Logger.info('✓ 装备套装路由已加载');
} catch (e) {
  Logger.warn('⚠ 装备路由加载失败:', e.message);
}

// ==================== 引导系统路由 ====================
try {
  const guideApi = require('./backend/routes/guide');
  app.use('/api/guide', guideApi);
  Logger.info('✓ 引导系统路由已加载');
} catch (e) {
  Logger.warn('⚠ 引导路由加载失败:', e.message);
}

// 导出db实例供其他模块使用
module.exports = app;
module.exports.db = db;

// 启动服务器（仅在直接运行此文件时）
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🎮 游戏后端服务器运行在 http://localhost:${PORT}`);
    Logger.info('✅ API路由别名已加载');
  });
}
