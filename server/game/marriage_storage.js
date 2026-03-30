/**
 * 婚姻系统存储层 - SQLite版本
 */

let db;
try {
  // 尝试从 server/server.js 导入 db 实例
  const server = require('../server');
  db = server.db || server;
  if (!db || typeof db.exec !== 'function') throw new Error('invalid db');
} catch {
  // 使用独立的数据库连接
  const Database = require('better-sqlite3');
  const path = require('path');
  const dbPath = path.join(__dirname, '..', 'data', 'game.db');
  db = new Database(dbPath);
}

// 允许外部注入 db 实例（解决循环依赖时 db 未初始化的问题）
function setDb(newDb) {
  if (newDb && typeof newDb.exec === 'function') {
    db = newDb;
  }
}

// MySQL pool兼容层
const pool = {
  execute(sql, params) {
    return new Promise((resolve, reject) => {
      try {
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          if (sql.includes('WHERE') && !sql.includes(' LIMIT')) {
            const stmt = db.prepare(sql);
            const result = params ? stmt.get(...params) : stmt.get();
            resolve([result ? [result] : []]);
          } else {
            const stmt = db.prepare(sql);
            const result = params ? stmt.all(...params) : stmt.all();
            resolve([result || []]);
          }
        } else {
          const stmt = db.prepare(sql);
          const result = params ? stmt.run(...params) : stmt.run();
          resolve([{ affectedRows: result.changes, lastInsertRowid: result.lastInsertRowid }]);
        }
      } catch (e) {
        reject(e);
      }
    });
  }
};

// 初始化婚姻数据表
async function initMarriageTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS marriage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player1_id INTEGER NOT NULL,
      player2_id INTEGER NOT NULL,
      intimacy INTEGER DEFAULT 0,
      ring_quality TEXT DEFAULT 'iron',
      married_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      divorce_at DATETIME,
      is_active INTEGER DEFAULT 1,
      UNIQUE(player1_id, player2_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS marriage_proposal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proposer_id INTEGER NOT NULL,
      proposee_id INTEGER NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS marriage_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      date_key TEXT NOT NULL,
      intimacy_gained INTEGER DEFAULT 0,
      shared_cultivation_count INTEGER DEFAULT 0,
      interacted INTEGER DEFAULT 0,
      UNIQUE(player_id, date_key)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS marriage_divorce_cd (
      player_id INTEGER PRIMARY KEY,
      can_propose_at DATETIME
    )
  `);

  console.log('✓ 婚姻系统数据库表初始化完成');
}

// ============ 婚姻操作 ============

// 创建婚姻记录
async function createMarriage(player1Id, player2Id, ringQuality = 'iron') {
  const sql = `
    INSERT INTO marriage (player1_id, player2_id, ring_quality, is_active)
    VALUES (?, ?, ?, 1)
  `;
  await pool.execute(sql, [Math.min(player1Id, player2Id), Math.max(player1Id, player2Id), ringQuality]);
}

// 获取玩家的婚姻记录
async function getMarriage(playerId) {
  const [rows] = await pool.execute(
    'SELECT * FROM marriage WHERE (player1_id = ? OR player2_id = ?) AND is_active = 1',
    [playerId, playerId]
  );
  return rows[0] || null;
}

// 更新亲密度
async function updateIntimacy(playerId, amount) {
  const marriage = await getMarriage(playerId);
  if (!marriage) return;
  const newIntimacy = Math.max(0, (marriage.intimacy || 0) + amount);
  await pool.execute(
    'UPDATE marriage SET intimacy = ? WHERE id = ?',
    [newIntimacy, marriage.id]
  );
  return newIntimacy;
}

// 更新戒指等级
async function updateRing(playerId, ringQuality) {
  const marriage = await getMarriage(playerId);
  if (!marriage) return;
  await pool.execute(
    'UPDATE marriage SET ring_quality = ? WHERE id = ?',
    [ringQuality, marriage.id]
  );
}

// 离婚
async function divorce(playerId) {
  const marriage = await getMarriage(playerId);
  if (!marriage) return false;
  await pool.execute(
    'UPDATE marriage SET is_active = 0, divorce_at = CURRENT_TIMESTAMP WHERE id = ?',
    [marriage.id]
  );
  // 设置离婚冷却
  const cooldown = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await pool.execute(
    'INSERT OR REPLACE INTO marriage_divorce_cd (player_id, can_propose_at) VALUES (?, ?)',
    [playerId, cooldown.toISOString()]
  );
  return true;
}

// 检查离婚冷却
async function checkDivorceCooldown(playerId) {
  const [rows] = await pool.execute(
    'SELECT can_propose_at FROM marriage_divorce_cd WHERE player_id = ?',
    [playerId]
  );
  if (!rows[0]) return true;
  return new Date() >= new Date(rows[0].can_propose_at);
}

// ============ 求婚操作 ============

// 创建求婚
async function createProposal(proposerId, proposeeId, message = '') {
  // 删除该求婚人的所有待处理求婚
  await pool.execute(
    "UPDATE marriage_proposal SET status = 'cancelled' WHERE proposer_id = ? AND status = 'pending'",
    [proposerId]
  );
  const sql = `
    INSERT INTO marriage_proposal (proposer_id, proposee_id, message, status)
    VALUES (?, ?, ?, 'pending')
  `;
  await pool.execute(sql, [proposerId, proposeeId, message]);
}

// 获取玩家的求婚请求（发给该玩家的）
async function getProposals(playerId) {
  const [rows] = await pool.execute(
    "SELECT * FROM marriage_proposal WHERE proposee_id = ? AND status = 'pending' ORDER BY created_at DESC",
    [playerId]
  );
  return rows;
}

// 获取玩家发出的求婚
async function getSentProposals(playerId) {
  const [rows] = await pool.execute(
    "SELECT * FROM marriage_proposal WHERE proposer_id = ? AND status = 'pending' ORDER BY created_at DESC",
    [playerId]
  );
  return rows;
}

// 响应求婚
async function respondProposal(proposalId, accept) {
  const status = accept ? 'accepted' : 'rejected';
  await pool.execute(
    "UPDATE marriage_proposal SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?",
    [status, proposalId]
  );
  return accept;
}

// 获取求婚详情
async function getProposalById(proposalId) {
  const [rows] = await pool.execute(
    'SELECT * FROM marriage_proposal WHERE id = ?',
    [proposalId]
  );
  return rows[0] || null;
}

// ============ 每日数据 ============

// 获取或创建每日数据
async function getOrCreateDaily(playerId) {
  const today = new Date().toISOString().slice(0, 10);
  const [rows] = await pool.execute(
    'SELECT * FROM marriage_daily WHERE player_id = ? AND date_key = ?',
    [playerId, today]
  );
  if (rows[0]) return rows[0];

  // 尝试获取昨日数据
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const [oldRows] = await pool.execute(
    'SELECT * FROM marriage_daily WHERE player_id = ? AND date_key = ?',
    [playerId, yesterday]
  );

  const newDaily = {
    player_id: playerId,
    date_key: today,
    intimacy_gained: 0,
    shared_cultivation_count: 0,
    interacted: 0
  };

  await pool.execute(
    'INSERT OR REPLACE INTO marriage_daily (player_id, date_key, intimacy_gained, shared_cultivation_count, interacted) VALUES (?, ?, ?, ?, ?)',
    [playerId, today, 0, 0, 0]
  );

  return newDaily;
}

// 更新每日数据
async function updateDailyIntimacy(playerId, amount) {
  const today = new Date().toISOString().slice(0, 10);
  await pool.execute(
    'UPDATE marriage_daily SET intimacy_gained = intimacy_gained + ? WHERE player_id = ? AND date_key = ?',
    [amount, playerId, today]
  );
}

// 增加双修次数
async function incrementSharedCultivation(playerId) {
  const today = new Date().toISOString().slice(0, 10);
  await pool.execute(
    'UPDATE marriage_daily SET shared_cultivation_count = shared_cultivation_count + 1 WHERE player_id = ? AND date_key = ?',
    [playerId, today]
  );
}

// 增加互动次数
async function incrementInteraction(playerId) {
  const today = new Date().toISOString().slice(0, 10);
  await pool.execute(
    'UPDATE marriage_daily SET interacted = interacted + 1 WHERE player_id = ? AND date_key = ?',
    [playerId, today]
  );
}

// ============ 查询辅助 ============

// 获取玩家信息（用于显示伴侣信息）
async function getPlayerInfo(playerId) {
  const [rows] = await pool.execute(
    'SELECT id, username, level, realm_level FROM player WHERE id = ?',
    [playerId]
  );
  return rows[0] || null;
}

// 检查是否已结婚
async function isMarried(playerId) {
  const marriage = await getMarriage(playerId);
  return marriage !== null;
}

// 获取伴侣ID
async function getSpouseId(playerId) {
  const marriage = await getMarriage(playerId);
  if (!marriage) return null;
  return marriage.player1_id === playerId ? marriage.player2_id : marriage.player1_id;
}

module.exports = {
  setDb,
  initMarriageTables,
  createMarriage,
  getMarriage,
  updateIntimacy,
  updateRing,
  divorce,
  checkDivorceCooldown,
  createProposal,
  getProposals,
  getSentProposals,
  respondProposal,
  getProposalById,
  getOrCreateDaily,
  updateDailyIntimacy,
  incrementSharedCultivation,
  incrementInteraction,
  getPlayerInfo,
  isMarried,
  getSpouseId,
};
