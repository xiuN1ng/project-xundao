/**
 * 结婚系统 - 数据库模型
 */

import Database from 'better-sqlite3';
import { MarriageApplication, WeddingRecord, PlayerCoupleSkill, MarriageStatus, DivorceStatus, WeddingType } from './types';

let db: Database.Database;

/**
 * 初始化婚姻数据库表
 */
export function initMarriageDatabase(database: Database.Database) {
  db = database;
  
  // 结婚申请表
  db.exec(`
    CREATE TABLE IF NOT EXISTS marriage_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      applicant_id INTEGER NOT NULL,
      target_id INTEGER NOT NULL,
      wedding_type TEXT DEFAULT 'simple',
      status TEXT DEFAULT 'pending',
      gift_items TEXT,
      message TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      responded_at INTEGER,
      UNIQUE(applicant_id, target_id)
    )
  `);
  
  // 婚礼记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS wedding_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player1_id INTEGER NOT NULL,
      player2_id INTEGER NOT NULL,
      wedding_type TEXT NOT NULL,
      wedding_time INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      expire_time INTEGER,
      witness1 TEXT,
      witness2 TEXT,
      blessings TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
  
  // 玩家婚姻状态表
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_marriage (
      player_id INTEGER PRIMARY KEY,
      spouse_id INTEGER,
      status TEXT DEFAULT 'single',
      wedding_type TEXT,
      wedding_time INTEGER,
      wedding_expire_time INTEGER,
      divorce_status TEXT DEFAULT 'none',
      divorce_request_time INTEGER,
      couple_skills TEXT DEFAULT '[]',
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
  
  // 夫妻技能表
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_couple_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      skill_id TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      unlocked_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      UNIQUE(player_id, skill_id)
    )
  `);
  
  // 创建索引
  db.exec(`CREATE INDEX IF NOT EXISTS idx_marriage_applications_applicant ON marriage_applications(applicant_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_marriage_applications_target ON marriage_applications(target_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_wedding_records_player1 ON wedding_records(player1_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_wedding_records_player2 ON wedding_records(player2_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_player_couple_skills_player ON player_couple_skills(player_id)`);
  
  console.log('[Marriage] 数据库表初始化完成');
}

/**
 * 获取或创建玩家婚姻记录
 */
export function getOrCreatePlayerMarriage(playerId: number) {
  let record = db.prepare('SELECT * FROM player_marriage WHERE player_id = ?').get(playerId) as any;
  
  if (!record) {
    const now = Date.now();
    db.prepare(`
      INSERT INTO player_marriage (player_id, status, created_at, updated_at)
      VALUES (?, 'single', ?, ?)
    `).run(playerId, now, now);
    record = db.prepare('SELECT * FROM player_marriage WHERE player_id = ?').get(playerId);
  }
  
  return record;
}

/**
 * 更新玩家婚姻状态
 */
export function updatePlayerMarriage(playerId: number, data: {
  spouseId?: number | null;
  status?: MarriageStatus;
  weddingType?: WeddingType | null;
  weddingTime?: number | null;
  weddingExpireTime?: number | null;
  divorceStatus?: DivorceStatus;
  divorceRequestTime?: number | null;
  coupleSkills?: string[];
}) {
  const updates: string[] = [];
  const values: any[] = [];
  
  if (data.spouseId !== undefined) {
    updates.push('spouse_id = ?');
    values.push(data.spouseId);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }
  if (data.weddingType !== undefined) {
    updates.push('wedding_type = ?');
    values.push(data.weddingType);
  }
  if (data.weddingTime !== undefined) {
    updates.push('wedding_time = ?');
    values.push(data.weddingTime);
  }
  if (data.weddingExpireTime !== undefined) {
    updates.push('wedding_expire_time = ?');
    values.push(data.weddingExpireTime);
  }
  if (data.divorceStatus !== undefined) {
    updates.push('divorce_status = ?');
    values.push(data.divorceStatus);
  }
  if (data.divorceRequestTime !== undefined) {
    updates.push('divorce_request_time = ?');
    values.push(data.divorceRequestTime);
  }
  if (data.coupleSkills !== undefined) {
    updates.push('couple_skills = ?');
    values.push(JSON.stringify(data.coupleSkills));
  }
  
  if (updates.length > 0) {
    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(playerId);
    
    db.prepare(`UPDATE player_marriage SET ${updates.join(', ')} WHERE player_id = ?`).run(...values);
  }
}

/**
 * 创建结婚申请
 */
export function createMarriageApplication(applicantId: number, targetId: number, weddingType: WeddingType, message?: string): MarriageApplication {
  const now = Date.now();
  
  // 删除旧的相同申请
  db.prepare('DELETE FROM marriage_applications WHERE applicant_id = ? AND target_id = ?').run(applicantId, targetId);
  
  const result = db.prepare(`
    INSERT INTO marriage_applications (applicant_id, target_id, wedding_type, status, message, created_at)
    VALUES (?, ?, ?, 'pending', ?, ?)
  `).run(applicantId, targetId, weddingType, message || null, now);
  
  return {
    id: result.lastInsertRowid as number,
    applicantId,
    targetId,
    weddingType,
    status: 'pending',
    message,
    createdAt: now,
    respondedAt: null,
  };
}

/**
 * 获取玩家的结婚申请
 */
export function getMarriageApplications(playerId: number, type: 'received' | 'sent' = 'received') {
  const field = type === 'received' ? 'target_id' : 'applicant_id';
  return db.prepare(`
    SELECT * FROM marriage_applications 
    WHERE ${field} = ? AND status = 'pending' AND created_at > ?
    ORDER BY created_at DESC
  `).all(playerId, Date.now() - 7 * 24 * 60 * 60 * 1000);
}

/**
 * 接受结婚申请
 */
export function acceptMarriageApplication(applicationId: number): MarriageApplication | null {
  const app = db.prepare('SELECT * FROM marriage_applications WHERE id = ? AND status = ?').get(applicationId, 'pending') as any;
  
  if (!app) return null;
  
  db.prepare('UPDATE marriage_applications SET status = ?, responded_at = ? WHERE id = ?').run('accepted', Date.now(), applicationId);
  
  return app;
}

/**
 * 拒绝结婚申请
 */
export function rejectMarriageApplication(applicationId: number) {
  db.prepare('UPDATE marriage_applications SET status = ?, responded_at = ? WHERE id = ?').run('rejected', Date.now(), applicationId);
}

/**
 * 创建婚礼记录
 */
export function createWeddingRecord(player1Id: number, player2Id: number, weddingType: string, expireTime: number): WeddingRecord {
  const now = Date.now();
  
  const result = db.prepare(`
    INSERT INTO wedding_records (player1_id, player2_id, wedding_type, wedding_time, expire_time)
    VALUES (?, ?, ?, ?, ?)
  `).run(player1Id, player2Id, weddingType, now, expireTime);
  
  return {
    id: result.lastInsertRowid as number,
    player1Id,
    player2Id,
    weddingType: weddingType as WeddingType,
    weddingTime: now,
    expireTime,
  };
}

/**
 * 赋予玩家夫妻技能
 */
export function unlockCoupleSkills(playerId: number, skillIds: string[]) {
  const now = Date.now();
  
  for (const skillId of skillIds) {
    db.prepare(`
      INSERT OR IGNORE INTO player_couple_skills (player_id, skill_id, unlocked_at)
      VALUES (?, ?, ?)
    `).run(playerId, skillId, now);
  }
}

/**
 * 获取玩家夫妻技能
 */
export function getPlayerCoupleSkills(playerId: number): PlayerCoupleSkill[] {
  return db.prepare('SELECT * FROM player_couple_skills WHERE player_id = ?').all(playerId) as PlayerCoupleSkill[];
}

/**
 * 检查玩家是否已婚
 */
export function isPlayerMarried(playerId: number): boolean {
  const record = db.prepare('SELECT status FROM player_marriage WHERE player_id = ?').get(playerId) as any;
  return record && record.status === 'married';
}

/**
 * 获取玩家配偶ID
 */
export function getPlayerSpouse(playerId: number): number | null {
  const record = db.prepare('SELECT spouse_id FROM player_marriage WHERE player_id = ?').get(playerId) as any;
  return record ? record.spouse_id : null;
}

/**
 * 清除玩家婚姻数据（离婚）
 */
export function clearPlayerMarriage(playerId: number) {
  db.prepare(`
    UPDATE player_marriage 
    SET spouse_id = NULL, status = 'single', wedding_type = NULL, wedding_time = NULL,
        wedding_expire_time = NULL, divorce_status = 'none', divorce_request_time = NULL,
        couple_skills = '[]', updated_at = ?
    WHERE player_id = ?
  `).run(Date.now(), playerId);
  
  // 清除夫妻技能
  db.prepare('DELETE FROM player_couple_skills WHERE player_id = ?').run(playerId);
}

/**
 * 获取婚礼记录
 */
export function getWeddingRecord(player1Id: number, player2Id: number): WeddingRecord | null {
  return db.prepare(`
    SELECT * FROM wedding_records 
    WHERE (player1_id = ? AND player2_id = ?) OR (player1_id = ? AND player2_id = ?)
  `).get(player1Id, player2Id, player2Id, player1Id) as WeddingRecord | null;
}

/**
 * 检查并清理过期婚姻
 */
export function checkAndProcessExpiredMarriages() {
  const now = Date.now();
  
  // 查找已过期的婚礼
  const expiredRecords = db.prepare(`
    SELECT * FROM wedding_records WHERE expire_time > 0 AND expire_time < ?
  `).all(now) as WeddingRecord[];
  
  for (const record of expiredRecords) {
    // 清除双方婚姻数据
    clearPlayerMarriage(record.player1Id);
    clearPlayerMarriage(record.player2Id);
    
    // 更新婚礼记录状态
    db.prepare('DELETE FROM wedding_records WHERE id = ?').run(record.id);
  }
  
  return expiredRecords.length;
}
