/**
 * 世界BOSS系统 API
 */

const express = require('express');
const router = express.Router();

// 中间件：自动加载依赖
router.use((req, res, next) => {
  loadDependencies();
  next();
});

let bossStorage, playerStorage, WORLD_BOSS_DATA;

function loadDependencies() {
  if (!bossStorage) {
    try {
      const storage = require('./boss_storage');
      bossStorage = storage.bossStorage;
      WORLD_BOSS_DATA = storage.WORLD_BOSS_DATA;
    } catch (e) {
      console.error('加载boss_storage失败:', e.message);
    }
  }
  
  if (!playerStorage) {
    try {
      const storage = require('./storage');
      playerStorage = storage.playerStorage;
    } catch (e) {
      console.error('加载storage失败:', e.message);
    }
  }
  
  return bossStorage && playerStorage;
}

// 获取BOSS列表
router.get('/list', (req, res) => {
  try {
    const list = bossStorage.getBossList();
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取当前BOSS状态
router.get('/status', async (req, res) => {
  try {
    const status = await bossStorage.getBossStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取BOSS排名
router.get('/ranking', async (req, res) => {
  try {
    const ranking = await bossStorage.getRanking();
    res.json({ success: true, data: ranking });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 召唤BOSS
router.post('/summon', async (req, res) => {
  try {
    const { player_id, boss_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const bossData = boss_id ? WORLD_BOSS_DATA[boss_id] : null;
    
    // 检查BOSS是否存在
    if (boss_id && !bossData) {
      return res.status(400).json({ success: false, error: 'BOSS不存在' });
    }
    
    // 检查BOSS是否在冷却中
    const status = await bossStorage.getBossStatus();
    if (status && status.status === 'alive') {
      return res.status(400).json({ success: false, error: '当前已有活跃BOSS' });
    }
    
    // 如果指定了BOSS，检查冷却
    if (bossData && status && status.boss_id === boss_id) {
      const remaining = bossData.respawn_time - (Date.now() - status.spawn_time) / 1000;
      if (remaining > 0) {
        const hours = Math.floor(remaining / 3600);
        const mins = Math.floor((remaining % 3600) / 60);
        return res.status(400).json({ success: false, error: `BOSS还在休息，${hours}小时${mins}分钟后刷新` });
      }
    }
    
    // 随机选择BOSS（如果没有指定）
    const selectedBossId = boss_id || bossStorage.getRandomBoss();
    const result = await bossStorage.summonBoss(selectedBossId);
    
    res.json({
      success: true,
      message: `⚠️ 世界BOSS ${WORLD_BOSS_DATA[selectedBossId].name} 已降临！`,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 攻击BOSS
router.post('/attack', async (req, res) => {
  try {
    const { player_id, player_atk } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少玩家ID' });
    }
    
    const status = await bossStorage.getBossStatus();
    if (!status || status.status !== 'alive') {
      return res.status(400).json({ success: false, error: '当前没有活跃的BOSS' });
    }
    
    // 从 status 和配置中获取 boss 数据
    const bossConfig = WORLD_BOSS_DATA[status.boss_id] || {};
    const boss = {
      name: status.boss_name,
      base_def: bossConfig.base_def || 1000, // 从配置获取防御值
      ...status
    };
    const playerAtk = player_atk || 100; // 默认攻击力
    
    // 计算伤害 (防御减免后至少造成1点伤害)
    let damage = Math.max(1, Math.floor(playerAtk * (1 - boss.base_def / (boss.base_def + playerAtk))));
    
    // 暴击
    const crit = Math.random() < 0.1;
    if (crit) damage *= 2;
    
    // 记录伤害
    await bossStorage.recordDamage(player_id, damage);
    
    // 扣除BOSS血量
    const newHp = await bossStorage.damageBoss(damage);
    
    // 检查是否击杀
    if (newHp <= 0) {
      const result = await bossStorage.killBoss(player_id);
      return res.json({
        success: true,
        killed: true,
        message: `🏆 击杀 ${status.boss_name || 'BOSS'}！`,
        data: { damage: Math.floor(damage), crit, rewards: result.rewards }
      });
    }
    
    res.json({
      success: true,
      killed: false,
      message: `对BOSS造成 ${Math.floor(damage)} 伤害${crit ? ' (暴击!)' : ''}`,
      data: { 
        damage: Math.floor(damage), 
        crit, 
        hp: newHp,
        max_hp: status.max_hp,
        percent: (newHp / status.max_hp * 100).toFixed(1)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取BOSS奖励信息
router.get('/rewards/:bossId', (req, res) => {
  try {
    const { bossId } = req.params;
    const boss = WORLD_BOSS_DATA[bossId];
    
    if (!boss) {
      return res.status(400).json({ success: false, error: 'BOSS不存在' });
    }
    
    res.json({ success: true, data: boss.rewards });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
