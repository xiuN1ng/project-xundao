/**
 * 经脉穴位系统 - 数据存储层
 * 处理玩家经脉数据的存取
 */

let db;
try {
  // 尝试从 server.js 获取数据库连接
  const server = require('../../server');
  // 检查是否有 db 属性且有 prepare 方法
  if (server.db && typeof server.db.prepare === 'function') {
    db = server.db;
  } else if (typeof server.prepare === 'function') {
    // server 本身可能有 prepare 方法
    db = server;
  } else {
    throw new Error('server.db not available');
  }
} catch {
  // 回退到直接创建 SQLite 连接
  const Database = require('better-sqlite3');
  const path = require('path');
  const dbPath = path.join(__dirname, '..', '..', 'data', 'game.db');
  db = new Database(dbPath);
}

// 经脉数据操作
const meridianStorage = {
  /**
   * 初始化玩家经脉数据
   */
  initPlayerMeridian(playerId) {
    try {
      const existing = db.prepare('SELECT * FROM player_meridian WHERE player_id = ?').get(playerId);
      if (existing) return existing;
    } catch (e) {
      // 表可能不存在，忽略错误
    }
    
    const meridiansData = JSON.stringify({});
    
    try {
      db.prepare(
        `INSERT OR REPLACE INTO player_meridian (player_id, meridians_data, total_spirit_bonus, 
         total_atk_bonus, total_def_bonus, total_hp_bonus, total_crit_bonus, total_dodge_bonus) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(playerId, meridiansData, 0, 0, 0, 0, 0, 0);
    } catch (e) {
      console.log('初始化经脉数据失败:', e.message);
    }
    
    return this.getPlayerMeridian(playerId);
  },
  
  /**
   * 获取玩家经脉数据
   */
  getPlayerMeridian(playerId) {
    try {
      const row = db.prepare('SELECT * FROM player_meridian WHERE player_id = ?').get(playerId);
      
      if (!row) {
        return this.initPlayerMeridian(playerId);
      }
      
      if (row.meridians_data) {
        try {
          row.meridiansData = typeof row.meridians_data === 'string' 
            ? JSON.parse(row.meridians_data) 
            : row.meridians_data;
        } catch (e) {
          row.meridiansData = {};
        }
      }
      
      return row;
    } catch (e) {
      // 表可能不存在，返回空数据
      return {
        player_id: playerId,
        meridiansData: {},
        total_spirit_bonus: 0,
        total_atk_bonus: 0,
        total_def_bonus: 0,
        total_hp_bonus: 0,
        total_crit_bonus: 0,
        total_dodge_bonus: 0
      };
    }
  },
  
  /**
   * 保存玩家经脉数据
   */
  savePlayerMeridian(playerId, data) {
    try {
      const jsonData = JSON.stringify(data.meridiansData || {});
      
      db.prepare(
        `UPDATE player_meridian 
         SET meridians_data = ?, 
             total_spirit_bonus = ?, 
             total_atk_bonus = ?, 
             total_def_bonus = ?, 
             total_hp_bonus = ?,
             total_crit_bonus = ?,
             total_dodge_bonus = ?,
             updated_at = CURRENT_TIMESTAMP 
         WHERE player_id = ?`
      ).run(
        jsonData,
        data.totalSpiritBonus || 0,
        data.totalAtkBonus || 0,
        data.totalDefBonus || 0,
        data.totalHpBonus || 0,
        data.totalCritBonus || 0,
        data.totalDodgeBonus || 0,
        playerId
      );
    } catch (e) {
      console.log('保存经脉数据失败:', e.message);
    }
  },
  
  /**
   * 激活穴位
   */
  activateAcupoint(playerId, meridianId, acupointId, acupointData) {
    const meridianData = this.getPlayerMeridian(playerId);
    const meridians = meridianData.meridiansData || {};
    
    // 初始化经脉
    if (!meridians[meridianId]) {
      meridians[meridianId] = {
        id: meridianId,
        acupoints: []
      };
    }
    
    // 添加穴位
    const acupoint = {
      id: acupointId,
      activatedAt: Date.now(),
      ...acupointData
    };
    
    meridians[meridianId].acupoints.push(acupoint);
    
    // 更新数据
    this.savePlayerMeridian(playerId, {
      meridiansData: meridians
    });
    
    return meridians;
  },
  
  /**
   * 获取指定经脉的穴位
   */
  getMeridianAcupoints(playerId, meridianId) {
    const meridianData = this.getPlayerMeridian(playerId);
    const meridians = meridianData.meridiansData || {};
    
    return meridians[meridianId]?.acupoints || [];
  },
  
  /**
   * 检查穴位是否已激活
   */
  isAcupointActivated(playerId, acupointId) {
    const meridianData = this.getPlayerMeridian(playerId);
    const meridians = meridianData.meridiansData || {};
    
    for (const meridian of Object.values(meridians)) {
      if (meridian.acupoints && meridian.acupoints.some(a => a.id === acupointId)) {
        return true;
      }
    }
    
    return false;
  },
  
  /**
   * 获取所有已激活穴位
   */
  getAllActivatedAcupoints(playerId) {
    const meridianData = this.getPlayerMeridian(playerId);
    const meridians = meridianData.meridiansData || {};
    
    const allAcupoints = [];
    for (const meridian of Object.values(meridians)) {
      if (meridian.acupoints) {
        allAcupoints.push(...meridian.acupoints);
      }
    }
    
    return allAcupoints;
  },
  
  /**
   * 获取穴位总数
   */
  getTotalAcupointsCount(playerId) {
    const acupoints = this.getAllActivatedAcupoints(playerId);
    return acupoints.length;
  },
  
  /**
   * 获取经脉加成汇总
   */
  getMeridianBonuses(playerId) {
    const meridianData = this.getPlayerMeridian(playerId);
    
    return {
      totalSpiritBonus: meridianData.total_spirit_bonus || 0,
      totalAtkBonus: meridianData.total_atk_bonus || 0,
      totalDefBonus: meridianData.total_def_bonus || 0,
      totalHpBonus: meridianData.total_hp_bonus || 0,
      totalCritBonus: meridianData.total_crit_bonus || 0,
      totalDodgeBonus: meridianData.total_dodge_bonus || 0
    };
  },
  
  /**
   * 计算并更新经脉加成
   */
  calculateAndUpdateBonuses(playerId, acupoints, effects) {
    const bonuses = {
      totalSpiritBonus: effects.spirit || 0,
      totalAtkBonus: (effects.atk || 0) + (effects.atk_percent ? Math.floor(effects.atk_percent * 100) : 0),
      totalDefBonus: (effects.def || 0) + (effects.def_percent ? Math.floor(effects.def_percent * 100) : 0),
      totalHpBonus: (effects.hp || 0) + (effects.hp_percent ? Math.floor(effects.hp_percent * 200) : 0),
      totalCritBonus: effects.crit || 0,
      totalDodgeBonus: effects.dodge || 0,
      meridiansData: {}
    };
    
    // 重建 meridiansData
    const meridianData = this.getPlayerMeridian(playerId);
    const meridians = meridianData.meridiansData || {};
    
    for (const [meridianId, meridian] of Object.entries(meridians)) {
      bonuses.meridiansData[meridianId] = {
        ...meridian
      };
    }
    
    this.savePlayerMeridian(playerId, bonuses);
    
    return bonuses;
  },
  
  /**
   * 获取经脉冲穴记录
   */
  getMeridianLog(playerId, limit = 10) {
    try {
      const rows = db.prepare(
        `SELECT * FROM meridian_log WHERE player_id = ? ORDER BY created_at DESC LIMIT ?`
      ).all(playerId, limit);
      
      return rows;
    } catch (e) {
      return [];
    }
  },
  
  /**
   * 添加经脉操作日志
   */
  addMeridianLog(playerId, action, meridianId, acupointId, result) {
    try {
      db.prepare(
        `INSERT INTO meridian_log (player_id, action, meridian_id, acupoint_id, result, created_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now'))`
      ).run(playerId, action, meridianId, acupointId, JSON.stringify(result));
    } catch (e) {
      console.log('添加经脉日志失败:', e.message);
    }
  }
};

module.exports = meridianStorage;
