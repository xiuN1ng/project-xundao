/**
 * 坐骑系统路由
 * 包含: 坐骑列表/市场/模板/技能/购买/喂养/激活
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// ==================== 坐骑数据定义 ====================

// 品质颜色映射
const RARITY_COLORS = {
  common: '#9E9E9E',
  uncommon: '#4CAF50',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FF9800',
  mythical: '#F44336'
};

// 品质名称
const RARITY_NAMES = {
  common: '普通',
  uncommon: '优秀',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
  mythical: '神话'
};

// 类型图标映射
const TYPE_ICONS = {
  beast: '🦄',
  dragon: '🐉',
  phoenix: '🦅',
  turtle: '🐢',
  wolf: '🐺',
  qilin: '🦄',
  spirit: '👻',
  celestial: '✨'
};

// 坐骑模板（可在市场购买）
const MOUNT_TEMPLATES = [
  { id: 1, type: 'beast', name: '独角兽', rarity: 'common', speed: 50, price: 1000, description: '温和的草食坐骑，适合新手' },
  { id: 2, type: 'dragon', name: '神龙', rarity: 'rare', speed: 100, price: 10000, description: '九天之上，唯我独尊' },
  { id: 3, type: 'phoenix', name: '凤凰', rarity: 'epic', speed: 120, price: 50000, description: '涅槃重生，翱翔九天' },
  { id: 4, type: 'turtle', name: '玄武', rarity: 'legendary', speed: 40, price: 100000, description: '防御无双，寿命极长' },
  { id: 5, type: 'wolf', name: '银狼', rarity: 'uncommon', speed: 80, price: 3000, description: '速度快，忠诚度高' },
  { id: 6, type: 'qilin', name: '麒麟', rarity: 'legendary', speed: 90, price: 150000, description: '祥瑞之兽，带来好运' },
  { id: 7, type: 'spirit', name: '幽魂驹', rarity: 'rare', speed: 110, price: 20000, description: '来去如风，倏忽即逝' },
  { id: 8, type: 'celestial', name: '天马', rarity: 'epic', speed: 130, price: 80000, description: '长翅膀的骏马，天界座驾' },
  { id: 9, type: 'dragon', name: '黑龙', rarity: 'mythical', speed: 150, price: 500000, description: '黑暗之力，极速飞行' },
  { id: 10, type: 'beast', name: '草泥马', rarity: 'common', speed: 30, price: 500, description: '呃...这是什么' }
];

// 坐骑技能
const MOUNT_SKILLS = {
  common: ['疾行 I'],
  uncommon: ['疾行 II', '冲刺 I'],
  rare: ['疾行 III', '冲刺 II', '怒吼 I'],
  epic: ['疾行 IV', '冲刺 III', '怒吼 II', '护盾 I'],
  legendary: ['疾行 V', '冲刺 IV', '怒吼 III', '护盾 II', '治愈 I'],
  mythical: ['疾行 V', '冲刺 V', '怒吼 V', '护盾 III', '治愈 II', '疾风 I']
};

// 玩家坐骑数据存储
const PLAYER_MOUNTS_FILE = path.join(__dirname, '../data/mounts.json');

function loadPlayerMounts() {
  try {
    if (fs.existsSync(PLAYER_MOUNTS_FILE)) {
      return JSON.parse(fs.readFileSync(PLAYER_MOUNTS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[mount] 加载坐骑数据失败:', e.message);
  }
  return {};
}

function savePlayerMounts(data) {
  try {
    const dir = path.dirname(PLAYER_MOUNTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PLAYER_MOUNTS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[mount] 保存坐骑数据失败:', e.message);
  }
}

// 初始化玩家坐骑（如果不存在）
function initPlayerMounts(userId) {
  const allMounts = loadPlayerMounts();
  if (!allMounts[userId]) {
    allMounts[userId] = {
      owned: [
        {
          id: 1,
          type: 'beast',
          name: '独角兽',
          rarity: 'common',
          speed: 50,
          level: 1,
          exp: 0,
          equipped: true,
          skills: ['疾行 I'],
          bonus_atk: 10,
          bonus_def: 5,
          bonus_hp: 20,
          acquiredAt: new Date().toISOString()
        }
      ],
      active: 1
    };
    savePlayerMounts(allMounts);
  }
  return allMounts[userId];
}

// ==================== 路由实现 ====================

// GET /api/mount - 获取玩家坐骑列表
router.get('/', (req, res) => {
  try {
    const userId = req.query.player_id || req.query.userId || '1';
    const playerData = initPlayerMounts(userId);
    res.json({
      success: true,
      data: playerData.owned,
      active: playerData.active
    });
  } catch (e) {
    console.error('[mount] 获取坐骑列表失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/mount/info - 获取坐骑信息
router.get('/info', (req, res) => {
  const userId = req.query.player_id || req.query.userId || '1';
  const playerData = initPlayerMounts(userId);
  res.json({ success: true, data: playerData.owned });
});

// GET /api/mount/templates - 获取可购买的坐骑模板
router.get('/templates', (req, res) => {
  try {
    const templates = MOUNT_TEMPLATES.map(t => ({
      id: t.id,
      type: t.type,
      name: t.name,
      rarity: t.rarity,
      rarityName: RARITY_NAMES[t.rarity],
      icon: TYPE_ICONS[t.type] || '🦄',
      speed: t.speed,
      price: t.price,
      description: t.description,
      skills: MOUNT_SKILLS[t.rarity]
    }));
    res.json({ success: true, data: templates });
  } catch (e) {
    console.error('[mount] 获取坐骑模板失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/mount/market - 获取坐骑市场
router.get('/market', (req, res) => {
  try {
    const userId = req.query.player_id || req.query.userId || '1';
    const playerData = initPlayerMounts(userId);
    const ownedIds = playerData.owned.map(m => m.id);
    
    // 市场物品按品质分组
    const marketItems = MOUNT_TEMPLATES.map(t => ({
      id: t.id,
      type: t.type,
      name: t.name,
      rarity: t.rarity,
      rarityName: RARITY_NAMES[t.rarity],
      icon: TYPE_ICONS[t.type] || '🦄',
      speed: t.speed,
      price: t.price,
      description: t.description,
      skills: MOUNT_SKILLS[t.rarity],
      owned: ownedIds.includes(t.id)
    }));
    
    res.json({
      success: true,
      data: {
        items: marketItems,
        refreshCost: 100, // 刷新费用
        refreshInterval: 3600 // 刷新间隔(秒)
      }
    });
  } catch (e) {
    console.error('[mount] 获取坐骑市场失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/mount/skills - 获取坐骑技能
router.get('/skills', (req, res) => {
  try {
    const mountId = parseInt(req.query.mount_id) || req.query.mount_id;
    const userId = req.query.player_id || req.query.userId || '1';
    const playerData = initPlayerMounts(userId);
    
    const mount = playerData.owned.find(m => m.id == mountId || m.type == mountId);
    if (!mount) {
      return res.status(404).json({ success: false, message: '坐骑不存在' });
    }
    
    res.json({
      success: true,
      data: {
        skills: mount.skills || MOUNT_SKILLS[mount.rarity] || ['疾行 I'],
        level: mount.level,
        exp: mount.exp
      }
    });
  } catch (e) {
    console.error('[mount] 获取坐骑技能失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/mount/activate - 激活/装备坐骑
router.post('/activate', (req, res) => {
  try {
    const { userId, player_id, mount_id, id } = req.body;
    const user = userId || player_id || '1';
    const targetId = parseInt(mount_id) || parseInt(id) || mount_id || id;
    
    const allMounts = loadPlayerMounts();
    const playerData = allMounts[user];
    
    if (!playerData) {
      return res.status(400).json({ success: false, message: '玩家坐骑数据不存在' });
    }
    
    const mount = playerData.owned.find(m => m.id == targetId);
    if (!mount) {
      return res.status(400).json({ success: false, message: '坐骑不存在' });
    }
    
    // 取消当前装备
    playerData.owned.forEach(m => m.equipped = false);
    // 装备目标坐骑
    mount.equipped = true;
    playerData.active = mount.id;
    
    savePlayerMounts(allMounts);
    
    res.json({
      success: true,
      data: { active: mount.id, name: mount.name }
    });
  } catch (e) {
    console.error('[mount] 激活坐骑失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/mount/buy - 购买坐骑
router.post('/buy', (req, res) => {
  try {
    const { userId, player_id, mount_id, id } = req.body;
    const user = userId || player_id || '1';
    const targetId = parseInt(mount_id) || parseInt(id) || mount_id || id;
    
    // 获取玩家灵石（简化：从player数据）
    // TODO: 实际应从玩家数据读取
    const spiritStones = 999999; // 模拟
    
    const template = MOUNT_TEMPLATES.find(t => t.id === targetId);
    if (!template) {
      return res.status(404).json({ success: false, message: '坐骑模板不存在' });
    }
    
    const allMounts = loadPlayerMounts();
    const playerData = initPlayerMounts(user);
    
    // 检查是否已拥有
    if (playerData.owned.some(m => m.id === targetId || m.templateId === targetId)) {
      return res.status(400).json({ success: false, message: '已拥有该坐骑' });
    }
    
    // 检查灵石是否足够
    if (spiritStones < template.price) {
      return res.status(400).json({ success: false, message: '灵石不足' });
    }
    
    // 添加坐骑
    const newMount = {
      id: Date.now(), // 生成新ID
      templateId: template.id,
      type: template.type,
      name: template.name,
      rarity: template.rarity,
      speed: template.speed,
      level: 1,
      exp: 0,
      equipped: false,
      skills: MOUNT_SKILLS[template.rarity] || ['疾行 I'],
      bonus_atk: Math.floor(template.speed * 0.5),
      bonus_def: Math.floor(template.speed * 0.3),
      bonus_hp: Math.floor(template.speed * 1.2),
      acquiredAt: new Date().toISOString()
    };
    
    playerData.owned.push(newMount);
    savePlayerMounts(allMounts);
    
    res.json({
      success: true,
      data: {
        mount: newMount,
        cost: template.price,
        remaining: spiritStones - template.price
      }
    });
  } catch (e) {
    console.error('[mount] 购买坐骑失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/mount/feed - 喂养坐骑
router.post('/feed', (req, res) => {
  try {
    const { userId, player_id, mount_id, id, feed_type } = req.body;
    const user = userId || player_id || '1';
    const targetId = parseInt(mount_id) || parseInt(id) || mount_id || id;
    const feedType = feed_type || 'normal';
    
    const FEED_COSTS = {
      normal: 50,    // 普通喂养
      premium: 200,  // 高级喂养
      divine: 1000   // 神级喂养
    };
    
    const FEED_EXP = {
      normal: 10,
      premium: 50,
      divine: 300
    };
    
    const cost = FEED_COSTS[feedType] || FEED_COSTS.normal;
    const expGain = FEED_EXP[feedType] || FEED_EXP.normal;
    
    const allMounts = loadPlayerMounts();
    const playerData = allMounts[user];
    
    if (!playerData) {
      return res.status(400).json({ success: false, message: '玩家坐骑数据不存在' });
    }
    
    const mount = playerData.owned.find(m => m.id === targetId);
    if (!mount) {
      return res.status(400).json({ success: false, message: '坐骑不存在' });
    }
    
    // 模拟灵石消耗
    // TODO: 实际应检查玩家灵石
    
    // 增加经验
    mount.exp += expGain;
    
    // 检查升级
    const EXP_PER_LEVEL = 100;
    let leveledUp = false;
    while (mount.exp >= EXP_PER_LEVEL * mount.level) {
      mount.exp -= EXP_PER_LEVEL * mount.level;
      mount.level++;
      // 升级增加属性
      mount.bonus_atk += 5;
      mount.bonus_def += 3;
      mount.bonus_hp += 10;
      // 解锁技能（如果有更高品质技能）
      const rarityIdx = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythical'].indexOf(mount.rarity);
      const currentSkills = MOUNT_SKILLS[mount.rarity] || [];
      if (mount.level % 5 === 0 && rarityIdx >= 2) {
        const newSkill = currentSkills[Math.floor(mount.level / 5) - 1];
        if (newSkill && !mount.skills.includes(newSkill)) {
          mount.skills.push(newSkill);
        }
      }
      leveledUp = true;
    }
    
    savePlayerMounts(allMounts);
    
    res.json({
      success: true,
      data: {
        mountId: mount.id,
        exp: mount.exp,
        level: mount.level,
        expGain,
        cost,
        leveledUp,
        skills: mount.skills
      }
    });
  } catch (e) {
    console.error('[mount] 喂养坐骑失败:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
