/**
 * 世界BOSS系统存储层
 */

// 直接使用SQLite数据库（与server.js共享连接）
let db;
try {
  const server = require('../server');
  db = server.db || server;
} catch {
  const Database = require('better-sqlite3');
  const path = require('path');
  const dbPath = path.join(__dirname, '..', 'data', 'game.db');
  db = new Database(dbPath);
}

// MySQL pool兼容层 - 将SQLite调用转换为Promise形式
const pool = {
  execute(sql, params) {
    return new Promise((resolve, reject) => {
      try {
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          if (sql.includes('WHERE') && sql.includes(' LIMIT')) {
            const stmt = db.prepare(sql);
            const result = params ? stmt.get(...params) : stmt.get();
            resolve([[result].filter(Boolean)]);
          } else {
            const stmt = db.prepare(sql);
            const result = params ? stmt.all(...params) : stmt.all();
            resolve([result]);
          }
        } else {
          const stmt = db.prepare(sql);
          const result = params ? stmt.run(...params) : stmt.run();
          resolve([{ affectedRows: result.changes }]);
        }
      } catch (e) {
        reject(e);
      }
    });
  }
};

// BOSS配置数据
const WORLD_BOSS_DATA = {
  'demon_lord': {
    name: '魔尊', quality: 'legendary',
    base_hp: 100000, base_atk: 5000, base_def: 2000,
    respawn_time: 86400, // 24小时
    rewards: { exp: 50000, stones: 10000, items: ['world_dust', 'divine_ore'] },
    description: '上古魔尊复苏',
    icon: '👹'
  },
  'dragon_king': {
    name: '东海龙王', quality: 'legendary',
    base_hp: 80000, base_atk: 4000, base_def: 1500,
    respawn_time: 43200, // 12小时
    rewards: { exp: 40000, stones: 8000, items: ['dragon_scale', 'divine_ore'] },
    description: '统御四海的真龙',
    icon: '🐉'
  },
  'ancient_god': {
    name: '古神', quality: 'mythical',
    base_hp: 500000, base_atk: 20000, base_def: 10000,
    respawn_time: 172800, // 48小时
    rewards: { exp: 200000, stones: 50000, items: ['world_frag', 'chaos_heart'] },
    description: '混沌初开时的古老神灵',
    icon: '🌌'
  },
  'void_beast': {
    name: '虚空巨兽', quality: 'epic',
    base_hp: 30000, base_atk: 2000, base_def: 800,
    respawn_time: 21600, // 6小时
    rewards: { exp: 20000, stones: 5000, items: ['void_essence'] },
    description: '来自虚空的恐怖存在',
    icon: '🦑'
  },
  'immortal_sage': {
    name: '散仙', quality: 'rare',
    base_hp: 15000, base_atk: 1000, base_def: 500,
    respawn_time: 10800, // 3小时
    rewards: { exp: 10000, stones: 3000, items: ['immortal_iron'] },
    description: '渡劫失败的仙人',
    icon: '🧙'
  }
};

const BOSS_QUALITY = {
  rare: { name: '稀有', color: '#1E90FF', scale: 1, icon: '⭐' },
  epic: { name: '史诗', color: '#9932CC', scale: 1.5, icon: '💜' },
  legendary: { name: '传说', color: '#FFD700', scale: 2, icon: '👑' },
  mythical: { name: '神话', color: '#FF4500', scale: 5, icon: '🔥' }
};

const BOSS_SKILLS = {
  'smash': { name: '重力碾压', damage: 2.0, description: '造成200%伤害' },
  'roar': { name: '震天怒吼', damage: 1.5, effect: 'stun', description: '眩晕所有玩家' },
  'dark_cloud': { name: '黑云压城', damage: 0.5, effect: 'dot', description: '持续伤害' },
  'teleport': { name: '瞬间移动', effect: 'dodge', description: '闪避下一次攻击' },
  'enrage': { name: '狂怒', damage: 3.0, description: '血量低于30%时触发' }
};

// BOSS存储操作
const bossStorage = {
  // 获取BOSS列表
  getBossList() {
    return Object.entries(WORLD_BOSS_DATA).map(([id, data]) => ({
      id,
      name: data.name,
      quality: data.quality,
      quality_info: BOSS_QUALITY[data.quality],
      base_hp: data.base_hp,
      base_atk: data.base_atk,
      base_def: data.base_def,
      respawn_time: data.respawn_time,
      respawn_hours: Math.floor(data.respawn_time / 3600),
      rewards: data.rewards,
      description: data.description,
      icon: data.icon
    }));
  },

  // 获取随机BOSS
  getRandomBoss() {
    const bosses = Object.keys(WORLD_BOSS_DATA);
    if (!bosses || bosses.length === 0) return null;
    return bosses[Math.floor(Math.random() * bosses.length)];
  },

  // 获取当前BOSS状态
  async getBossStatus() {
    const [rows] = await pool.execute(
      'SELECT * FROM world_boss ORDER BY id DESC LIMIT 1'
    );
    
    if (rows.length === 0) {
      return null;
    }
    
    const boss = rows[0];
    const bossData = WORLD_BOSS_DATA[boss.boss_id];
    
    // 检查是否超时死亡
    if (boss.is_active === 1) {
      const elapsed = (Date.now() - new Date(boss.spawn_time).getTime()) / 1000;
      if (bossData && elapsed > bossData.respawn_time * 2) {
        // 超时，设为死亡
        await pool.execute(
          'UPDATE world_boss SET is_active = ? WHERE id = ?',
          [0, boss.id]
        );
        return null;
      }
    }
    
    return {
      id: boss.id,
      boss_id: boss.boss_id,
      boss_name: bossData?.name,
      boss_icon: bossData?.icon,
      quality: bossData?.quality,
      quality_info: BOSS_QUALITY[bossData?.quality],
      hp: boss.current_hp,
      max_hp: boss.max_hp,
      status: boss.is_active === 1 ? 'alive' : 'dead',
      spawn_time: boss.spawn_time,
      participant_count: boss.participant_count || 0
    };
  },

  // 获取BOSS排名
  async getRanking(limit = 10) {
    const status = await this.getBossStatus();
    if (!status) return [];
    
    const [rows] = await pool.execute(
      'SELECT player_id, damage FROM boss_damage_records WHERE boss_id = ? ORDER BY damage DESC LIMIT ?',
      [status.boss_id, limit]
    );
    
    return rows.map((row, index) => ({
      rank: index + 1,
      player_id: row.player_id,
      damage: row.damage
    }));
  },

  // 召唤BOSS
  async summonBoss(bossId) {
    const bossData = WORLD_BOSS_DATA[bossId];
    if (!bossData) {
      throw new Error('BOSS不存在');
    }
    
    const scale = BOSS_QUALITY[bossData.quality]?.scale || 1;
    const hp = Math.floor(bossData.base_hp * scale);
    
    // 清除旧数据
    await pool.execute('DELETE FROM boss_damage_records');
    
    // 创建新BOSS
    await pool.execute(
      'INSERT INTO world_boss (boss_id, hp, max_hp, status, spawn_time) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
      [bossId, hp, hp, 'alive']
    );
    
    return {
      boss_id: bossId,
      boss_name: bossData.name,
      hp,
      max_hp: hp,
      status: 'alive'
    };
  },

  // 记录伤害
  async recordDamage(playerId, damage) {
    const status = await this.getBossStatus();
    if (!status) return;
    
    // 检查是否已有记录
    const [rows] = await pool.execute(
      'SELECT * FROM boss_damage_records WHERE boss_id = ? AND player_id = ?',
      [status.boss_id, playerId]
    );
    
    if (rows.length === 0) {
      await pool.execute(
        'INSERT INTO boss_damage_records (boss_id, player_id, damage) VALUES (?, ?, ?)',
        [status.boss_id, playerId, damage]
      );
    } else {
      await pool.execute(
        'UPDATE boss_damage_records SET damage = damage + ? WHERE boss_id = ? AND player_id = ?',
        [damage, status.boss_id, playerId]
      );
    }
    
    // 更新参与人数 - 使用子查询获取独立玩家数
    const [countResult] = await pool.execute(
      'SELECT COUNT(DISTINCT player_id) as count FROM boss_damage_records WHERE boss_id = ?',
      [status.boss_id]
    );
    await pool.execute(
      'UPDATE world_boss SET participant_count = ? WHERE id = ?',
      [countResult[0]?.count || 0, status.id]
    );
  },

  // 扣除BOSS血量
  async damageBoss(damage) {
    const status = await this.getBossStatus();
    if (!status) return 0;
    
    await pool.execute(
      'UPDATE world_boss SET current_hp = current_hp - ? WHERE id = ?',
      [damage, status.id]
    );
    
    const [rows] = await pool.execute(
      'SELECT hp FROM world_boss WHERE id = ?',
      [status.id]
    );
    
    return rows[0]?.hp || 0;
  },

  // 击杀BOSS
  async killBoss(killerId) {
    const status = await this.getBossStatus();
    if (!status) {
      throw new Error('没有活跃的BOSS');
    }
    
    // 从 WORLD_BOSS_DATA 获取正确的BOSS奖励配置
    const bossData = WORLD_BOSS_DATA[status.boss_id];
    if (!bossData) {
      throw new Error('BOSS数据不存在');
    }
    
    // 更新BOSS状态
    await pool.execute(
      'UPDATE world_boss SET is_active = ?, killed_by = ?, killed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [0, killerId, status.id]
    );
    
    // 获取排名
    const ranking = await this.getRanking(100);
    
    // 使用正确的BOSS奖励配置
    const rewards = bossData.rewards;
    
    return {
      boss_id: status.boss_id,
      boss_name: status.boss_name,
      killer: killerId,
      total_damage: ranking.reduce((sum, r) => sum + r.damage, 0),
      rewards
    };
  },

  // 获取BOSS刷新时间
  async getRespawnTime(bossId) {
    const bossData = WORLD_BOSS_DATA[bossId];
    if (!bossData) return null;
    
    const status = await this.getBossStatus();
    if (!status || status.boss_id !== bossId) {
      return 0; // 可以召唤
    }
    
    const elapsed = (Date.now() - new Date(status.spawn_time).getTime()) / 1000;
    const remaining = bossData.respawn_time - elapsed;
    
    return remaining > 0 ? remaining : 0;
  }
};

// 导出
module.exports = {
  bossStorage,
  WORLD_BOSS_DATA,
  BOSS_QUALITY,
  BOSS_SKILLS
};
