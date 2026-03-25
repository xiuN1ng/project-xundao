const express = require('express');
const router = express.Router();
const tribulationStorage = require('../../game/tribulation_storage');
const tribulationSystem = require('../../game/tribulation_system');

// 外部配置引用（从 server.js 运行时注入）
let TRIBULATION_TYPES = {};
let DIFFICULTY_CONFIG = {};
let PROTECTION_ITEMS = {};
let REALMS = [];
let dbRef = null;

function configure(refs) {
  if (refs.TRIBULATION_TYPES) TRIBULATION_TYPES = refs.TRIBULATION_TYPES;
  if (refs.DIFFICULTY_CONFIG) DIFFICULTY_CONFIG = refs.DIFFICULTY_CONFIG;
  if (refs.PROTECTION_ITEMS) PROTECTION_ITEMS = refs.PROTECTION_ITEMS;
  if (refs.REALMS) REALMS = refs.REALMS;
  if (refs.db) dbRef = refs.db;
  
  // 配置存储模块
  tribulationStorage.configure({
    TRIBULATION_TYPES,
    DIFFICULTY_CONFIG,
    PROTECTION_ITEMS
  });
}

// ==================== 核心 API ====================

// GET /api/tribulation/types - 获取可用的渡劫类型列表
router.get('/types', (req, res) => {
  try {
    const { realm_level, player_id } = req.query;
    let playerRealmLevel = parseInt(realm_level) || 0;
    
    // 如果提供了 player_id，从数据库获取玩家境界
    if (player_id && dbRef) {
      const player = dbRef.prepare('SELECT realm_level FROM player WHERE id = ?').get(player_id);
      if (player) playerRealmLevel = player.realm_level;
    }
    
    // 根据玩家境界过滤可用的天劫类型
    const availableTypes = Object.values(TRIBULATION_TYPES).filter(t => {
      const minRealm = t.min_realm !== undefined ? t.min_realm : 0;
      return minRealm <= playerRealmLevel;
    });
    
    res.json({
      success: true,
      data: {
        types: availableTypes,
        realms: REALMS,
        difficulties: Object.entries(DIFFICULTY_CONFIG).map(([key, val]) => ({ id: key, ...val })),
        protection_items: Object.values(PROTECTION_ITEMS)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tribulation/rate - 查询成功率（不开始渡劫）
router.get('/rate', (req, res) => {
  try {
    const { player_id, tribulation_type, difficulty } = req.query;
    const realmLevel = parseInt(req.query.realm_level) || 0;
    if (!player_id || !dbRef) {
      const rateInfo = tribulationStorage.calculateSuccessRateDetailed(realmLevel, tribulation_type || 'golden_trib', difficulty || 'normal');
      return res.json({ success: true, realm_level: realmLevel, success_rate: rateInfo });
    }
    const player = dbRef.prepare('SELECT realm_level FROM player WHERE id=?').get(player_id);
    const actualRealm = player?.realm_level || 0;
    const rateInfo = tribulationStorage.calculateSuccessRateDetailed(actualRealm, tribulation_type || 'golden_trib', difficulty || 'normal');
    res.json({ success: true, player_id: parseInt(player_id), realm_level: actualRealm, success_rate: rateInfo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tribulation/begin - 开始渡劫（创建动画会话）
router.post('/begin', (req, res) => {
  try {
    const { player_id, tribulation_type, difficulty } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    if (!tribulation_type) {
      return res.status(400).json({ success: false, error: '缺少渡劫类型 tribulation_type' });
    }
    
    // 验证天劫类型
    const tribType = TRIBULATION_TYPES[tribulation_type];
    if (!tribType) {
      return res.status(400).json({ success: false, error: '无效的天劫类型' });
    }
    
    // 获取玩家数据
    let player = null;
    let actualPlayerId = player_id;
    
    if (dbRef) {
      player = dbRef.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
      if (!player) {
        // 自动创建玩家
        const result = dbRef.prepare(
          'INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)'
        ).run(`player_${player_id}`, 10000, 1, 0);
        actualPlayerId = result.lastInsertRowid;
        player = dbRef.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
      }
    }
    
    const currentRealm = REALMS[player?.realm_level || 0] || REALMS[0];
    
    // 检查是否已达到最高境界
    if (!currentRealm.next) {
      return res.status(400).json({ success: false, error: '已达到最高境界，无需渡劫' });
    }
    
    // 检查境界要求
    if (player?.realm_level < tribType.min_realm) {
      const minRealmName = REALMS[tribType.min_realm]?.name || '未知';
      return res.status(400).json({ 
        success: false, 
        error: `需要境界达到 ${minRealmName} 才能渡此天劫` 
      });
    }
    
    // 清理玩家之前的进行中会话
    const existing = tribulationStorage.getPlayerActiveSession(actualPlayerId);
    if (existing) {
      tribulationStorage.completeSession(existing.sessionId, false, null);
    }
    
    // 创建新的渡劫会话
    const session = tribulationStorage.createSession(actualPlayerId, tribulation_type, difficulty || 'normal');
    
    // 计算详细成功率
    const rateInfo = tribulationStorage.calculateSuccessRateDetailed(
      player?.realm_level || 0,
      tribulation_type,
      difficulty || 'normal'
    );
    
    // 记录到数据库
    if (dbRef) {
      dbRef.prepare(`
        INSERT INTO tribulation_records 
        (player_id, current_realm, target_realm, tribulation_type, difficulty, status, base_success_rate, bonus_success_rate, final_success_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        actualPlayerId,
        currentRealm.name,
        currentRealm.next,
        tribulation_type,
        difficulty || 'normal',
        'pending',
        rateInfo.baseRate / 100,
        rateInfo.bonusRate / 100,
        rateInfo.finalRate / 100
      );
    }
    
    res.json({
      success: true,
      data: {
        session_id: session.sessionId,
        tribulation_type: tribType.name,
        tribulation_id: tribulation_type,
        difficulty: difficulty || 'normal',
        current_realm: currentRealm.name,
        target_realm: currentRealm.next,
        anim_config: session.phases,
        total_phases: session.totalPhases,
        success_rate: rateInfo,
        expires_at: session.expiresAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tribulation/session/:sessionId - 获取渡劫会话状态和当前阶段
router.get('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = tribulationStorage.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ success: false, error: '渡劫会话不存在或已过期' });
    }
    
    // 获取当前阶段的详细信息
    const currentPhaseData = session.phases[session.currentPhase] || null;
    
    res.json({
      success: true,
      data: {
        session_id: session.sessionId,
        player_id: session.playerId,
        status: session.status,
        current_phase: session.currentPhase,
        total_phases: session.totalPhases,
        current_phase_data: currentPhaseData,
        tribulation_type: session.tribulationType,
        difficulty: session.difficulty,
        result: session.result,
        rewards: session.rewards
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tribulation/advance - 推进到下一动画阶段
router.post('/advance', (req, res) => {
  try {
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.status(400).json({ success: false, error: '缺少 session_id' });
    }
    
    const session = tribulationStorage.getSession(session_id);
    if (!session) {
      return res.status(404).json({ success: false, error: '渡劫会话不存在' });
    }
    
    if (session.status === SESSION_STATUS.COMPLETED || session.status === SESSION_STATUS.EXPIRED) {
      return res.status(400).json({ success: false, error: '渡劫会话已结束', status: session.status });
    }
    
    const prevPhase = session.currentPhase;
    const advanced = tribulationStorage.advancePhase(session_id);
    
    if (!advanced) {
      return res.status(400).json({ success: false, error: '无法推进阶段' });
    }
    
    const currentPhaseData = advanced.phases[advanced.currentPhase] || null;
    const isLastPhase = advanced.currentPhase === advanced.totalPhases - 1;
    
    res.json({
      success: true,
      data: {
        session_id: advanced.sessionId,
        previous_phase: prevPhase,
        current_phase: advanced.currentPhase,
        total_phases: advanced.totalPhases,
        current_phase_data: currentPhaseData,
        is_last_phase: isLastPhase,
        status: advanced.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tribulation/complete - 完成渡劫（结算奖励）
router.post('/complete', (req, res) => {
  try {
    const { session_id, success, use_items } = req.body;
    
    if (!session_id) {
      return res.status(400).json({ success: false, error: '缺少 session_id' });
    }
    
    const session = tribulationStorage.getSession(session_id);
    if (!session) {
      return res.status(404).json({ success: false, error: '渡劫会话不存在' });
    }
    
    if (session.status === SESSION_STATUS.COMPLETED) {
      return res.json({
        success: true,
        data: {
          session_id: session.sessionId,
          result: session.result,
          rewards: session.rewards,
          message: session.result === 'success' ? '渡劫已成功完成' : '渡劫已失败'
        }
      });
    }
    
    // 获取玩家数据
    let player = null;
    if (dbRef) {
      player = dbRef.prepare('SELECT * FROM player WHERE id = ?').get(session.playerId);
    }
    
    const currentRealm = REALMS[player?.realm_level || 0] || REALMS[0];
    const targetRealmName = currentRealm.next;
    const diffConfig = DIFFICULTY_CONFIG[session.difficulty] || DIFFICULTY_CONFIG.normal;
    
    // 如果没有传入 success，自行判定
    let finalSuccess = success;
    if (finalSuccess === undefined) {
      // 使用存储的成功率进行判定
      const roll = Math.random();
      const rateInfo = tribulationStorage.calculateSuccessRateDetailed(
        player?.realm_level || 0,
        session.tribulationType,
        session.difficulty
      );
      finalSuccess = roll < (rateInfo.finalRate / 100);
    }
    
    let rewards = null;
    let penalty = null;
    
    if (finalSuccess) {
      // 计算奖励
      rewards = tribulationStorage.calculateAscensionRewards(
        currentRealm.name,
        targetRealmName,
        session.difficulty
      );
      
      // 更新玩家数据
      if (dbRef && player) {
        const spiritStonesGain = rewards.spiritStones || 0;
        const realmLevelUp = player.realm_level + 1;
        
        // 境界提升
        dbRef.prepare('UPDATE player SET realm_level = ?, spirit_stones = spirit_stones + ? WHERE id = ?')
          .run(realmLevelUp, spiritStonesGain, session.playerId);
        
        // 检查飞升成就
        const isAscension = targetRealmName === '飞升';
        if (isAscension && rewards.broadcast) {
          // 全服广播
          try {
            const broadcastApi = require('./broadcast');
            broadcastApi.broadcast({
              type: 'ascension',
              player_id: session.playerId,
              username: player.username,
              realm: targetRealmName,
              rewards
            });
          } catch (e) {
            // 广播未挂载
          }
        }
      }
    } else {
      // 失败惩罚
      const penaltyRate = diffConfig.penalty === 'heavy' ? 0.5 : diffConfig.penalty === 'medium' ? 0.3 : 0.15;
      penalty = {
        spirit_stones_loss: Math.floor((player?.spirit_stones || 0) * penaltyRate),
        realm_level_loss: 0,
        message: diffConfig.penalty === 'heavy' ? '殒落' : diffConfig.penalty === 'medium' ? '重伤' : '轻伤'
      };
      
      if (dbRef && player) {
        dbRef.prepare('UPDATE player SET spirit_stones = MAX(0, spirit_stones - ?) WHERE id = ?')
          .run(penalty.spirit_stones_loss, session.playerId);
      }
    }
    
    // 完成会话
    const completed = tribulationStorage.completeSession(session_id, finalSuccess, rewards);
    
    // 更新数据库记录
    if (dbRef) {
      const record = dbRef.prepare(
        'SELECT * FROM tribulation_records WHERE player_id = ? ORDER BY created_at DESC LIMIT 1'
      ).get(session.playerId);
      
      if (record) {
        dbRef.prepare(`
          UPDATE tribulation_records 
          SET status = ?, result = ?, rewards = ?, completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          finalSuccess ? 'success' : 'failed',
          finalSuccess ? 'success' : 'failed',
          JSON.stringify(rewards),
          record.id
        );
      }
    }
    
    res.json({
      success: true,
      data: {
        session_id: completed.sessionId,
        result: finalSuccess ? 'success' : 'failed',
        current_realm: currentRealm.name,
        target_realm: targetRealmName,
        tribulation_type: session.tribulationType,
        difficulty: session.difficulty,
        rewards: finalSuccess ? {
          spirit: rewards.spirit,
          spirit_stones: rewards.spiritStones,
          items: rewards.items || [],
          title: rewards.title_reward,
          aura: rewards.aura,
          is_ascension: rewards.broadcast || false
        } : null,
        penalty: penalty,
        message: finalSuccess 
          ? `🎊 渡劫成功！恭喜突破至${targetRealmName}！` 
          : `💀 渡劫失败！${penalty?.message || '损失部分灵气'}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tribulation/anim-config/:type - 获取动画配置
router.get('/anim-config/:type', (req, res) => {
  try {
    const { type } = req.params;
    const config = tribulationStorage.getAnimConfig(type);
    
    if (!config) {
      return res.status(404).json({ success: false, error: '未找到该天劫类型的动画配置' });
    }
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tribulation/anim-configs - 获取所有动画配置
router.get('/anim-configs', (req, res) => {
  res.json({
    success: true,
    data: tribulationStorage.getAllAnimConfigs()
  });
});

// GET /api/tribulation/rewards/:fromTo - 获取境界突破奖励预览
router.get('/rewards/:fromTo', (req, res) => {
  try {
    const { fromTo } = req.params;
    const rewards = tribulationStorage.calculateAscensionRewards(
      fromTo.split('→')[0],
      fromTo.split('→')[1],
      'normal'
    );
    
    res.json({
      success: true,
      data: {
        from_to: fromTo,
        rewards
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tribulation/status - 获取渡劫状态（兼容旧接口）
router.get('/status', (req, res) => {
  try {
    const { player_id, session_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    let player = null;
    let actualPlayerId = player_id;
    
    if (dbRef) {
      player = dbRef.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
      if (!player) {
        const result = dbRef.prepare(
          'INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)'
        ).run(`player_${player_id}`, 10000, 1, 0);
        actualPlayerId = result.lastInsertRowid;
        player = dbRef.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
      }
    }
    
    const currentRealm = REALMS[player?.realm_level || 0] || REALMS[0];
    const canAdvance = currentRealm.next !== null;
    
    // 获取玩家进行中的会话
    const activeSession = tribulationStorage.getPlayerActiveSession(actualPlayerId);
    
    // 获取最近的渡劫记录
    let records = [];
    if (dbRef) {
      records = dbRef.prepare(
        'SELECT * FROM tribulation_records WHERE player_id = ? ORDER BY created_at DESC LIMIT 10'
      ).all(actualPlayerId);
    }
    
    res.json({
      success: true,
      data: {
        player: {
          id: player?.id || actualPlayerId,
          realm_level: player?.realm_level || 0,
          current_realm: currentRealm.name,
          next_realm: currentRealm.next,
          can_advance: canAdvance,
          spirit_stones: player?.spirit_stones || 0
        },
        active_session: activeSession ? {
          session_id: activeSession.sessionId,
          tribulation_type: activeSession.tribulationType,
          current_phase: activeSession.currentPhase,
          total_phases: activeSession.totalPhases,
          status: activeSession.status
        } : null,
        records: records.map(r => ({
          id: r.id,
          current_realm: r.current_realm,
          target_realm: r.target_realm,
          tribulation_type: TRIBULATION_TYPES[r.tribulation_type]?.name || r.tribulation_type,
          difficulty: r.difficulty,
          status: r.status,
          result: r.result,
          final_success_rate: r.final_success_rate ? Math.round(r.final_success_rate * 100) : 0,
          rewards: r.rewards ? JSON.parse(r.rewards) : null,
          created_at: r.created_at,
          completed_at: r.completed_at
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/tribulation/attempt - 兼容旧接口（直接判定+奖励）
router.post('/attempt', (req, res) => {
  try {
    const { player_id, tribulation_type, difficulty, use_items } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    let player = null;
    let actualPlayerId = player_id;
    
    if (dbRef) {
      player = dbRef.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
      if (!player) {
        const result = dbRef.prepare(
          'INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)'
        ).run(`player_${player_id}`, 10000, 1, 0);
        actualPlayerId = result.lastInsertRowid;
        player = dbRef.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
      }
    }
    
    const currentRealm = REALMS[player?.realm_level || 0] || REALMS[0];
    if (!currentRealm.next) {
      return res.status(400).json({ success: false, error: '已达到最高境界' });
    }
    
    // 验证天劫类型
    const tribType = TRIBULATION_TYPES[tribulation_type];
    if (!tribType) {
      return res.status(400).json({ success: false, error: '无效的天劫类型' });
    }
    
    // 计算成功率
    const rateInfo = tribulationStorage.calculateSuccessRateDetailed(
      player?.realm_level || 0,
      tribulation_type,
      difficulty || 'normal'
    );
    
    // 判定结果
    const roll = Math.random();
    const success = roll < (rateInfo.finalRate / 100);
    const diffConfig = DIFFICULTY_CONFIG[difficulty || 'normal'] || DIFFICULTY_CONFIG.normal;
    
    // 计算奖励
    let rewards = null;
    let penalty = null;
    
    if (success) {
      rewards = tribulationStorage.calculateAscensionRewards(
        currentRealm.name,
        currentRealm.next,
        difficulty || 'normal'
      );
      
      if (dbRef && player) {
        const spiritStonesGain = rewards.spiritStones || 0;
        const realmLevelUp = player.realm_level + 1;
        
        dbRef.prepare('UPDATE player SET realm_level = ?, spirit_stones = spirit_stones + ? WHERE id = ?')
          .run(realmLevelUp, spiritStonesGain, actualPlayerId);
        
        // 飞升全服广播
        const isAscension = currentRealm.next === '飞升';
        if (isAscension && rewards.broadcast) {
          try {
            const broadcastApi = require('./broadcast');
            broadcastApi.broadcast({
              type: 'ascension',
              player_id: actualPlayerId,
              username: player.username,
              realm: currentRealm.next,
              rewards
            });
          } catch (e) {}
        }
      }
    } else {
      const penaltyRate = diffConfig.penalty === 'heavy' ? 0.5 : diffConfig.penalty === 'medium' ? 0.3 : 0.15;
      penalty = {
        spirit_stones_loss: Math.floor((player?.spirit_stones || 0) * penaltyRate)
      };
      
      if (dbRef && player) {
        dbRef.prepare('UPDATE player SET spirit_stones = MAX(0, spirit_stones - ?) WHERE id = ?')
          .run(penalty.spirit_stones_loss, actualPlayerId);
      }
    }
    
    // 记录
    if (dbRef) {
      dbRef.prepare(`
        INSERT INTO tribulation_records 
        (player_id, current_realm, target_realm, tribulation_type, difficulty, status, base_success_rate, bonus_success_rate, final_success_rate, result, rewards)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        actualPlayerId,
        currentRealm.name,
        currentRealm.next,
        tribulation_type,
        difficulty || 'normal',
        success ? 'success' : 'failed',
        rateInfo.baseRate / 100,
        rateInfo.bonusRate / 100,
        rateInfo.finalRate / 100,
        success ? 'success' : 'failed',
        JSON.stringify(rewards)
      );
    }
    
    res.json({
      success: true,
      data: {
        success,
        current_realm: currentRealm.name,
        target_realm: currentRealm.next,
        tribulation_type: tribType.name,
        difficulty: diffConfig.name,
        success_rate: rateInfo,
        roll: Math.round(roll * 10000) / 100,
        rewards: success ? {
          spirit: rewards.spirit,
          spirit_stones: rewards.spiritStones,
          items: rewards.items || [],
          title: rewards.title_reward,
          aura: rewards.aura,
          is_ascension: rewards.broadcast || false
        } : null,
        penalty: success ? null : penalty,
        message: success 
          ? `🎊 渡劫成功！恭喜突破至${currentRealm.next}！` 
          : `💀 渡劫失败！${penalty ? `损失${penalty.spirit_stones_loss}灵石` : '未知的惩罚'}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/tribulation/realms - 获取境界数据
router.get('/realms', (req, res) => {
  res.json({
    success: true,
    data: REALMS
  });
});

// POST /api/tribulation/protect - 购买/使用保护道具
router.post('/protect', (req, res) => {
  try {
    const { player_id, item_id, action } = req.body;
    
    if (!player_id || !item_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    if (!action || !['buy', 'use'].includes(action)) {
      return res.status(400).json({ success: false, error: '无效的操作类型 (buy/use)' });
    }
    
    const item = PROTECTION_ITEMS[item_id];
    if (!item) {
      return res.status(400).json({ success: false, error: '无效的道具' });
    }
    
    let player = null;
    let actualPlayerId = player_id;
    
    if (dbRef) {
      player = dbRef.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
      if (!player) {
        const result = dbRef.prepare(
          'INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)'
        ).run(`player_${player_id}`, 10000, 1, 0);
        actualPlayerId = result.lastInsertRowid;
        player = dbRef.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
      }
    }
    
    if (action === 'buy') {
      if (player && player.spirit_stones < item.price) {
        return res.status(400).json({ success: false, error: '灵石不足' });
      }
      
      if (dbRef) {
        dbRef.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?')
          .run(item.price, actualPlayerId);
        
        const existing = dbRef.prepare(
          'SELECT * FROM player_protection_items WHERE player_id = ? AND item_id = ?'
        ).get(actualPlayerId, item_id);
        
        if (existing) {
          dbRef.prepare(
            'UPDATE player_protection_items SET quantity = quantity + 1, updated_at = CURRENT_TIMESTAMP WHERE player_id = ? AND item_id = ?'
          ).run(actualPlayerId, item_id);
        } else {
          dbRef.prepare(
            'INSERT INTO player_protection_items (player_id, item_id, item_name, quantity) VALUES (?, ?, ?, ?)'
          ).run(actualPlayerId, item_id, item.name, 1);
        }
      }
      
      res.json({
        success: true,
        message: `成功购买 ${item.name}`,
        data: {
          item_id,
          item_name: item.name,
          price: item.price,
          remaining_spirit_stones: (player?.spirit_stones || 0) - item.price
        }
      });
    } else if (action === 'use') {
      if (dbRef) {
        const playerItem = dbRef.prepare(
          'SELECT * FROM player_protection_items WHERE player_id = ? AND item_id = ?'
        ).get(actualPlayerId, item_id);
        
        if (!playerItem || playerItem.quantity <= 0) {
          return res.status(400).json({ success: false, error: '没有此道具' });
        }
      }
      
      const effects = {};
      if (item.success_bonus) effects.success_bonus = item.success_bonus;
      if (item.dodge_one_hit) effects.dodge_one_hit = true;
      if (item.revive_once) effects.revive_once = true;
      if (item.restore_spirit) effects.restore_spirit = item.restore_spirit;
      if (item.invincibility) effects.invincibility = item.invincibility;
      
      res.json({
        success: true,
        message: `使用 ${item.name} 成功`,
        data: {
          item_id,
          item_name: item.name,
          effects
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
module.exports.configure = configure;
