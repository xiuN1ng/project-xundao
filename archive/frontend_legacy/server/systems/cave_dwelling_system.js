/**
 * 洞府系统 (Cave Dwelling System)
 * 功能：玩家的修炼洞府，支持升级、装饰、产出灵气
 */

const express = require('express');
const router = express.Router();

// ============ 洞府配置 ============

// 洞府类型
const CAVE_TYPES = {
  ordinary: {
    id: 'ordinary', name: '普通洞府', icon: '🕳️',
    max_level: 10, base_cost: 1000, cost_multiplier: 1.5,
    spirit_output: 10, description: '最基础的修炼洞府，灵气产出较低'
  },
  spirit_cave: {
    id: 'spirit_cave', name: '灵山洞府', icon: '⛰️',
    max_level: 15, base_cost: 5000, cost_multiplier: 1.6,
    spirit_output: 50, description: '蕴含灵气的山洞，灵气产出较高'
  },
  immortal_cave: {
    id: 'immortal_cave', name: '仙家洞府', icon: '🏯',
    max_level: 20, base_cost: 50000, cost_multiplier: 1.8,
    spirit_output: 200, description: '仙人遗留的洞府，灵气产出极高'
  }
};

// 洞府等级属性
const CAVE_LEVEL_STATS = {
  // 每级属性倍率基数
  base_multiplier: {
    spirit_output: 1.0,    // 灵气产出倍率
    defense: 1.0,           // 防御加成
    recovery: 1.0           // 回复速度加成
  },
  // 等级 → 属性映射 (level: { spirit_mult, defense_bonus, recovery_bonus })
  levels: (() => {
    const map = {};
    for (let lv = 1; lv <= 20; lv++) {
      map[lv] = {
        spirit_mult: parseFloat((1 + (lv - 1) * 0.25).toFixed(2)),    // 每级+25%产出
        defense_bonus: lv * 5,                                          // 每级+5防御
        recovery_bonus: parseFloat((1 + (lv - 1) * 0.1).toFixed(2))     // 每级+10%回复
      };
    }
    return map;
  })()
};

// 洞府装饰物
const DECORATIONS = {
  'spirit_pool': {
    id: 'spirit_pool', name: '灵池', icon: '💧',
    cost: 5000, effect: { spirit_output_bonus: 0.20 },
    description: '聚集灵气的池塘，灵气产出+20%'
  },
  'spirit_tree': {
    id: 'spirit_tree', name: '灵树', icon: '🌳',
    cost: 10000, effect: { recovery_bonus: 0.30 },
    description: '灵树坐镇，回复速度+30%'
  },
  'spirit_formation': {
    id: 'spirit_formation', name: '聚灵阵', icon: '🔮',
    cost: 20000, effect: { spirit_output_bonus: 0.35 },
    description: '阵法聚集灵气，灵气产出+35%'
  },
  'ancient_altar': {
    id: 'ancient_altar', name: '古祭坛', icon: '⛩️',
    cost: 50000, effect: { defense_bonus: 0.50 },
    description: '古祭坛护持，防御+50%'
  },
  'dragon_statue': {
    id: 'dragon_statue', name: '龙柱', icon: '🐉',
    cost: 100000, effect: { all_bonus: 0.25 },
    description: '龙柱镇压，各项属性+25%'
  },
  'phoenix_brazier': {
    id: 'phoenix_brazier', name: '凤炉', icon: '🦅',
    cost: 200000, effect: { spirit_output_bonus: 0.60, recovery_bonus: 0.40 },
    description: '凤炉炼化，灵气产出+60%，回复+40%'
  }
};

// 获取洞府类型信息
function getCaveType(typeId) {
  return CAVE_TYPES[typeId] || CAVE_TYPES.ordinary;
}

// 获取洞府等级属性
function getCaveLevelStats(level) {
  return CAVE_LEVEL_STATS.levels[level] || CAVE_LEVEL_STATS.levels[1];
}

// 计算洞府总产出
function calculateCaveOutput(caveData) {
  const type = getCaveType(caveData.type);
  const levelStats = getCaveLevelStats(caveData.level || 1);
  
  // 基础产出
  let spiritOutput = type.spirit_output * levelStats.spirit_mult;
  
  // 装饰物加成
  const decorationBonus = { spirit_output: 1, defense: 1, recovery: 1 };
  if (caveData.decorations && Array.isArray(caveData.decorations)) {
    for (const decorId of caveData.decorations) {
      const decor = DECORATIONS[decorId];
      if (decor) {
        if (decor.effect.spirit_output_bonus) decorationBonus.spirit_output += decor.effect.spirit_output_bonus;
        if (decor.effect.defense_bonus) decorationBonus.defense += decor.effect.defense_bonus;
        if (decor.effect.recovery_bonus) decorationBonus.recovery += decor.effect.recovery_bonus;
        if (decor.effect.all_bonus) {
          decorationBonus.spirit_output += decor.effect.all_bonus;
          decorationBonus.defense += decor.effect.all_bonus;
          decorationBonus.recovery += decor.effect.all_bonus;
        }
      }
    }
  }
  
  spiritOutput = Math.floor(spiritOutput * decorationBonus.spirit_output);
  const defenseBonus = Math.floor(type.base_cost * 0.01 * levelStats.defense_bonus * decorationBonus.defense);
  const recoveryBonus = parseFloat((levelStats.recovery_bonus * decorationBonus.recovery).toFixed(2));
  
  return { spiritOutput, defenseBonus, recoveryBonus, decorationBonus };
}

// 获取洞府升级消耗
function getUpgradeCost(caveType, currentLevel) {
  const type = getCaveType(caveType);
  if (currentLevel >= type.max_level) return null;
  
  const cost = Math.floor(type.base_cost * Math.pow(type.cost_multiplier, currentLevel));
  return { spirit_stones: cost, next_level: currentLevel + 1 };
}

// ============ 洞府 API ============

// GET /api/cave/types - 获取洞府类型列表
router.get('/types', (req, res) => {
  try {
    const types = Object.values(CAVE_TYPES).map(t => ({
      ...t,
      cost: undefined  // 不暴露原始cost结构给前端
    }));
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/cave/decorations - 获取装饰物列表
router.get('/decorations', (req, res) => {
  try {
    const { player_id } = req.query;
    let ownedDecorations = [];
    
    if (player_id) {
      let playerData = {};
      const gameDataRow = req.db.prepare('SELECT player_data FROM player_game_data WHERE player_id = ?').get(player_id);
      if (gameDataRow && gameDataRow.player_data) {
        try { playerData = JSON.parse(gameDataRow.player_data); } catch (e) {}
      }
      ownedDecorations = playerData.cave_decorations || [];
    }
    
    const decorations = Object.entries(DECORATIONS).map(([id, d]) => ({
      id,
      ...d,
      owned: player_id ? ownedDecorations.includes(id) : false
    }));
    
    res.json({ success: true, data: decorations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/cave/info - 获取玩家洞府信息
router.get('/info', (req, res) => {
  try {
    const { player_id } = req.query;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    let playerData = {};
    const gameDataRow = req.db.prepare('SELECT player_data FROM player_game_data WHERE player_id = ?').get(player_id);
    if (gameDataRow && gameDataRow.player_data) {
      try { playerData = JSON.parse(gameDataRow.player_data); } catch (e) {}
    }
    
    // 获取或初始化洞府数据
    let cave = playerData.cave || null;
    if (!cave) {
      cave = {
        type: 'ordinary',
        level: 1,
        decorations: [],
        last_collected: Date.now(),
        total_collected: 0
      };
    }
    
    const caveType = getCaveType(cave.type);
    const output = calculateCaveOutput(cave);
    const upgradeCost = getUpgradeCost(cave.type, cave.level);
    
    // 计算离线收益（每分钟产出）
    const now = Date.now();
    const minutesPassed = Math.floor((now - cave.last_collected) / 60000);
    const offlineSpirit = minutesPassed > 0 ? Math.floor(output.spiritOutput * minutesPassed) : 0;
    
    res.json({
      success: true,
      data: {
        cave,
        cave_type: { ...caveType, spirit_output: output.spiritOutput },
        level_stats: getCaveLevelStats(cave.level),
        output,
        upgrade_cost: upgradeCost,
        can_upgrade: upgradeCost !== null,
        decorations: cave.decorations.map(id => ({ id, ...DECORATIONS[id] })),
        offline_spirit: offlineSpirit,
        minutes_accumulated: minutesPassed,
        last_collected: cave.last_collected
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/cave/create - 创建/初始化洞府
router.post('/create', (req, res) => {
  try {
    const { player_id, cave_type = 'ordinary' } = req.body;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    const type = getCaveType(cave_type);
    
    let playerData = {};
    const gameDataRow = req.db.prepare('SELECT player_data FROM player_game_data WHERE player_id = ?').get(player_id);
    if (gameDataRow && gameDataRow.player_data) {
      try { playerData = JSON.parse(gameDataRow.player_data); } catch (e) {}
    }
    
    // 检查是否已有洞府
    if (playerData.cave) {
      return res.status(400).json({ success: false, error: '已有洞府' });
    }
    
    // 创建洞府
    const cave = {
      type: cave_type,
      level: 1,
      decorations: [],
      last_collected: Date.now(),
      total_collected: 0,
      created_at: Date.now()
    };
    
    playerData.cave = cave;
    playerData.cave_decorations = [];
    
    req.db.prepare(`
      INSERT INTO player_game_data (player_id, player_data, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(player_id) DO UPDATE SET player_data = excluded.player_data, updated_at = CURRENT_TIMESTAMP
    `).run(player_id, JSON.stringify(playerData));
    
    res.json({
      success: true,
      data: {
        cave,
        cave_type: type,
        message: `🎉 洞府「${type.name}」创建成功！`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/cave/upgrade - 升级洞府
router.post('/upgrade', (req, res) => {
  try {
    const { player_id } = req.body;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    let playerData = {};
    const gameDataRow = req.db.prepare('SELECT player_data FROM player_game_data WHERE player_id = ?').get(player_id);
    if (gameDataRow && gameDataRow.player_data) {
      try { playerData = JSON.parse(gameDataRow.player_data); } catch (e) {}
    }
    
    const cave = playerData.cave;
    if (!cave) {
      return res.status(400).json({ success: false, error: '尚未拥有洞府' });
    }
    
    const upgradeCost = getUpgradeCost(cave.type, cave.level);
    if (!upgradeCost) {
      return res.status(400).json({ success: false, error: '洞府已达到最高等级' });
    }
    
    // 检查灵石是否足够
    const player = req.db.prepare('SELECT spirit_stones FROM player WHERE id = ?').get(player_id);
    if (!player || player.spirit_stones < upgradeCost.spirit_stones) {
      return res.status(400).json({
        success: false,
        error: '灵石不足',
        required: upgradeCost.spirit_stones,
        available: player?.spirit_stones || 0
      });
    }
    
    // 消耗灵石
    req.db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?')
      .run(upgradeCost.spirit_stones, player_id);
    
    // 升级洞府
    const oldLevel = cave.level;
    cave.level++;
    
    req.db.prepare(`
      INSERT INTO player_game_data (player_id, player_data, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(player_id) DO UPDATE SET player_data = excluded.player_data, updated_at = CURRENT_TIMESTAMP
    `).run(player_id, JSON.stringify(playerData));
    
    const newOutput = calculateCaveOutput(cave);
    const newUpgradeCost = getUpgradeCost(cave.type, cave.level);
    
    res.json({
      success: true,
      data: {
        old_level: oldLevel,
        new_level: cave.level,
        cost_paid: upgradeCost.spirit_stones,
        output: newOutput,
        next_upgrade_cost: newUpgradeCost,
        message: `🏠 洞府升级至 Lv.${cave.level}！灵气产出+${newOutput.spiritOutput}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/cave/collect - 采集洞府灵气
router.post('/collect', (req, res) => {
  try {
    const { player_id } = req.body;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    let playerData = {};
    const gameDataRow = req.db.prepare('SELECT player_data FROM player_game_data WHERE player_id = ?').get(player_id);
    if (gameDataRow && gameDataRow.player_data) {
      try { playerData = JSON.parse(gameDataRow.player_data); } catch (e) {}
    }
    
    const cave = playerData.cave;
    if (!cave) {
      return res.status(400).json({ success: false, error: '尚未拥有洞府' });
    }
    
    const now = Date.now();
    const minutesPassed = Math.floor((now - cave.last_collected) / 60000);
    
    if (minutesPassed < 1) {
      return res.status(400).json({ success: false, error: '采集间隔至少1分钟' });
    }
    
    const output = calculateCaveOutput(cave);
    const spiritEarned = Math.floor(output.spiritOutput * minutesPassed);
    
    // 更新玩家灵石
    req.db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?')
      .run(spiritEarned, player_id);
    
    // 更新洞府采集时间
    cave.last_collected = now;
    cave.total_collected = (cave.total_collected || 0) + spiritEarned;
    
    req.db.prepare(`
      INSERT INTO player_game_data (player_id, player_data, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(player_id) DO UPDATE SET player_data = excluded.player_data, updated_at = CURRENT_TIMESTAMP
    `).run(player_id, JSON.stringify(playerData));
    
    res.json({
      success: true,
      data: {
        spirit_earned: spiritEarned,
        minutes_accumulated: minutesPassed,
        next_collection_possible_in: '1分钟',
        total_collected: cave.total_collected,
        output_per_minute: output.spiritOutput
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/cave/decorate - 购买并安装装饰物
router.post('/decorate', (req, res) => {
  try {
    const { player_id, decoration_id } = req.body;
    if (!player_id || !decoration_id) {
      return res.status(400).json({ success: false, error: '缺少参数' });
    }
    
    const decor = DECORATIONS[decoration_id];
    if (!decor) {
      return res.status(404).json({ success: false, error: '装饰物不存在' });
    }
    
    let playerData = {};
    const gameDataRow = req.db.prepare('SELECT player_data FROM player_game_data WHERE player_id = ?').get(player_id);
    if (gameDataRow && gameDataRow.player_data) {
      try { playerData = JSON.parse(gameDataRow.player_data); } catch (e) {}
    }
    
    const cave = playerData.cave;
    if (!cave) {
      return res.status(400).json({ success: false, error: '尚未拥有洞府' });
    }
    
    if (cave.decorations && cave.decorations.includes(decoration_id)) {
      return res.status(400).json({ success: false, error: '该装饰物已安装' });
    }
    
    // 检查灵石是否足够
    const player = req.db.prepare('SELECT spirit_stones FROM player WHERE id = ?').get(player_id);
    if (!player || player.spirit_stones < decor.cost) {
      return res.status(400).json({
        success: false,
        error: '灵石不足',
        required: decor.cost,
        available: player?.spirit_stones || 0
      });
    }
    
    // 消耗灵石
    req.db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?')
      .run(decor.cost, player_id);
    
    // 安装装饰物
    cave.decorations = cave.decorations || [];
    cave.decorations.push(decoration_id);
    playerData.cave_decorations = playerData.cave_decorations || [];
    playerData.cave_decorations.push(decoration_id);
    
    req.db.prepare(`
      INSERT INTO player_game_data (player_id, player_data, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(player_id) DO UPDATE SET player_data = excluded.player_data, updated_at = CURRENT_TIMESTAMP
    `).run(player_id, JSON.stringify(playerData));
    
    const newOutput = calculateCaveOutput(cave);
    
    res.json({
      success: true,
      data: {
        decoration: { id: decoration_id, ...decor },
        cost_paid: decor.cost,
        output: newOutput,
        total_decorations: cave.decorations.length,
        message: `🎨 「${decor.name}」安装成功！${decor.description}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/cave/output - 获取洞府产出预览（不改状态）
router.get('/output', (req, res) => {
  try {
    const { player_id } = req.query;
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id' });
    }
    
    let playerData = {};
    const gameDataRow = req.db.prepare('SELECT player_data FROM player_game_data WHERE player_id = ?').get(player_id);
    if (gameDataRow && gameDataRow.player_data) {
      try { playerData = JSON.parse(gameDataRow.player_data); } catch (e) {}
    }
    
    const cave = playerData.cave;
    if (!cave) {
      return res.status(400).json({ success: false, error: '尚未拥有洞府' });
    }
    
    const now = Date.now();
    const minutesPassed = Math.floor((now - cave.last_collected) / 60000);
    const output = calculateCaveOutput(cave);
    const pendingSpirit = minutesPassed > 0 ? Math.floor(output.spiritOutput * minutesPassed) : 0;
    
    res.json({
      success: true,
      data: {
        output_per_minute: output.spiritOutput,
        pending_spirit: pendingSpirit,
        minutes_accumulated: minutesPassed,
        can_collect: minutesPassed >= 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
