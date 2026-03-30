/**
 * 婚姻系统路由
 */

const express = require('express');
const router = express.Router();
const marriageSystem = require('../../game/marriage_system');
const marriageDB = require('../../game/marriage_storage');
const { MARRIAGE_CONFIG, MARRIAGE_GIFTS } = require('../../game/marriage_config');

// 获取玩家数据的辅助函数（从 req 中获取 playerId 和 playerData）
function getPlayer(req) {
  // 优先从 body/query 获取
  const playerId = parseInt((req.body && req.body.player_id) || req.query.player_id || 1);
  // 尝试从 backend/routes/player 模块获取
  let playerData = null;
  try {
    const playerModule = require('./player');
    if (playerModule._player && playerModule._player.id === playerId) {
      playerData = playerModule._player;
    }
  } catch (e) {
    // player module not available
  }
  return { playerId, playerData };
}

// ============ 查询接口 ============

// 获取婚姻信息
router.get('/info', async (req, res) => {
  try {
    const { playerId } = getPlayer(req);
    const info = await marriageSystem.getMarriageInfo(playerId);
    res.json(info);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 获取收到的求婚请求
router.get('/proposals', async (req, res) => {
  try {
    const { playerId } = getPlayer(req);
    const proposals = await marriageSystem.getIncomingProposals(playerId);
    res.json({ success: true, proposals });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 获取发出的求婚请求
router.get('/proposals/sent', async (req, res) => {
  try {
    const { playerId } = getPlayer(req);
    const proposals = await marriageSystem.getOutgoingProposals(playerId);
    res.json({ success: true, proposals });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 获取礼物列表
router.get('/gifts', (req, res) => {
  res.json({ success: true, gifts: MARRIAGE_GIFTS });
});

// 获取戒指升级列表
router.get('/rings', (req, res) => {
  res.json({ success: true, rings: MARRIAGE_CONFIG.RING_LEVELS });
});

// 获取双修配置
router.get('/config', (req, res) => {
  res.json({
    success: true,
    requirements: MARRIAGE_CONFIG.REQUIREMENTS,
    intimacyLevels: MARRIAGE_CONFIG.INTIMACY_LEVELS,
    sharedCultivation: MARRIAGE_CONFIG.SHARED_CULTIVATION,
    divorce: MARRIAGE_CONFIG.DIVORCE,
  });
});

// ============ 操作接口 ============

// 求婚
router.post('/propose', async (req, res) => {
  try {
    const { playerId, playerData } = getPlayer(req);
    const proposeeId = parseInt(req.body.proposee_id);
    const message = req.body.message || '';
    
    if (!proposeeId) {
      return res.json({ success: false, message: '请指定求婚对象ID' });
    }
    if (proposeeId === playerId) {
      return res.json({ success: false, message: '不能和自己求婚' });
    }

    const result = await marriageSystem.proposeMarital(playerId, proposeeId, playerData);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 回应求婚
router.post('/respond', async (req, res) => {
  try {
    const { playerId } = getPlayer(req);
    const proposalId = parseInt(req.body.proposal_id);
    const accept = req.body.accept === true || req.body.accept === 'true';

    if (!proposalId) {
      return res.json({ success: false, message: '请指定求婚请求ID' });
    }

    const result = await marriageSystem.respondPropose(proposalId, accept, playerId);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 赠送礼物
router.post('/gift', async (req, res) => {
  try {
    const { playerId, playerData } = getPlayer(req);
    const giftKey = req.body.gift_key;

    if (!giftKey) {
      return res.json({ success: false, message: '请选择礼物' });
    }

    const result = await marriageSystem.sendGift(playerId, giftKey, playerData);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 双修
router.post('/cultivate', async (req, res) => {
  try {
    const { playerId, playerData } = getPlayer(req);
    const result = await marriageSystem.doSharedCultivation(playerId, playerData);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 离婚
router.post('/divorce', async (req, res) => {
  try {
    const { playerId, playerData } = getPlayer(req);
    const result = await marriageSystem.divorce(playerId, playerData);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 升级戒指
router.post('/ring/upgrade', async (req, res) => {
  try {
    const { playerId, playerData } = getPlayer(req);
    const ringQuality = req.body.ring_quality;

    if (!ringQuality) {
      return res.json({ success: false, message: '请选择戒指类型' });
    }

    const result = await marriageSystem.upgradeRing(playerId, ringQuality, playerData);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 每日互动
router.post('/interact', async (req, res) => {
  try {
    const { playerId } = getPlayer(req);
    const result = await marriageSystem.dailyInteraction(playerId);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 取消求婚
router.post('/proposal/cancel', async (req, res) => {
  try {
    const { playerId } = getPlayer(req);
    const proposalId = parseInt(req.body.proposal_id);
    if (!proposalId) {
      return res.json({ success: false, message: '请指定求婚ID' });
    }
    // 标记为取消（由求婚人发起）
    const proposal = await marriageDB.getProposalById(proposalId);
    if (!proposal) {
      return res.json({ success: false, message: '求婚请求不存在' });
    }
    if (proposal.proposer_id !== playerId) {
      return res.json({ success: false, message: '只能取消自己的求婚' });
    }
    await marriageDB.respondProposal(proposalId, false);
    res.json({ success: true, message: '已取消求婚' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 允许外部注入 db 实例
function setDb(database) {
  if (marriageDB && typeof marriageDB.setDb === 'function') {
    marriageDB.setDb(database);
  }
}

module.exports = { router, setDb };
