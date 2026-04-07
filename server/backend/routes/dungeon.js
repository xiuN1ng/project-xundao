const express = require('express');
const router = express.Router();
const path = require('path');

// 成就触发服务
let achievementTrigger;
try {
  achievementTrigger = require('../../game/achievement_trigger_service');
} catch (e) {
  console.log('[dungeon] 成就触发服务未找到');
  achievementTrigger = null;
}

// 数据库路径
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  // 初始化表
  db.exec(`
    CREATE TABLE IF NOT EXISTS dungeon_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      dungeon_id INTEGER NOT NULL,
      difficulty TEXT DEFAULT 'normal',
      enter_count INTEGER DEFAULT 0,
      cleared INTEGER DEFAULT 0,
      best_time INTEGER,
      best_difficulty TEXT,
      enter_date TEXT,
      enter_time TEXT,
      cooldown_end TEXT
    );
  `);
  // 尝试添加 difficulty 列（如果表已存在则忽略）
  try { db.exec("ALTER TABLE dungeon_records ADD COLUMN difficulty TEXT DEFAULT 'normal'"); } catch(e) {}
  try { db.exec("ALTER TABLE dungeon_records ADD COLUMN best_difficulty TEXT"); } catch(e) {}
} catch (err) {
  console.log('[dungeon] 数据库连接失败:', err.message);
  db = null;
}

// 副本难度配置
const DIFFICULTIES = {
  easy:      { name: '简单',     multiplier: 0.7,  costScale: 0.5,  rewardScale: 0.5,  color: '#4CAF50', icon: '🟢' },
  normal:    { name: '普通',     multiplier: 1.0,  costScale: 1.0,  rewardScale: 1.0,  color: '#2196F3', icon: '🔵' },
  hard:     { name: '困难',     multiplier: 1.5,  costScale: 1.5,  rewardScale: 1.8,  color: '#FF9800', icon: '🟠' },
  nightmare: { name: '噩梦',     multiplier: 2.2,  costScale: 2.0,  rewardScale: 3.0,  color: '#9C27B0', icon: '🟣' },
};

// 副本配置（含难度分层）
const dungeons = [
  { id: 1, icon: '🗿', name: '新手副本', reqLevel: 1, progress: 100, unlocked: true, cost: 0, dropChance: 0.5, drops: [
    {itemId: 101, name: '灵气丹', icon: '🧪', count: 1},
    {itemId: 201, name: '铁锭', icon: '🔩', count: [1,3]}
  ], difficulties: ['easy', 'normal'] },
  { id: 2, icon: '🌋', name: '火山洞穴', reqLevel: 10, progress: 60, unlocked: true, cost: 50, dropChance: 0.3, drops: [{itemId: 102, name: '火焰精华', icon: '🔥', count: 1}], difficulties: ['easy', 'normal', 'hard'] },
  { id: 3, icon: '❄️', name: '冰霜洞窟', reqLevel: 20, progress: 40, unlocked: true, cost: 100, dropChance: 0.35, drops: [{itemId: 103, name: '寒冰结晶', icon: '❄️', count: 1}], difficulties: ['easy', 'normal', 'hard'] },
  { id: 4, icon: '⚔️', name: '封魔渊', reqLevel: 30, progress: 20, unlocked: false, cost: 150, dropChance: 0.4, drops: [{itemId: 104, name: '封魔令', icon: '📿', count: 1}], difficulties: ['normal', 'hard', 'nightmare'] },
  { id: 5, icon: '🌙', name: '幽冥地府', reqLevel: 40, progress: 10, unlocked: false, cost: 200, dropChance: 0.45, drops: [{itemId: 105, name: '冥魂珠', icon: '💎', count: 1}], difficulties: ['normal', 'hard', 'nightmare'] }
];

// 获取副本列表
router.get('/', (req, res) => {
  // 返回带难度配置的副本列表
  const list = dungeons.map(d => ({
    ...d,
    difficultyConfig: d.difficulties.map(key => ({
      key,
      ...DIFFICULTIES[key]
    }))
  }));
  res.json(list);
});

// 获取副本列表 (GET /list - 等同于 /)
router.get('/list', (req, res) => {
  const list = dungeons.map(d => ({
    ...d,
    difficultyConfig: d.difficulties.map(key => ({ key, ...DIFFICULTIES[key] }))
  }));
  res.json(list);
});

// 获取副本详情
router.get('/info/:id', (req, res) => {
  const dungeonId = parseInt(req.params.id);
  const userId = parseInt(req.query.userId) || 1;
  const difficulty = req.query.difficulty || 'normal';
  
  const dungeon = dungeons.find(d => d.id === dungeonId);
  if (!dungeon) {
    return res.status(404).json({ success: false, error: '副本不存在' });
  }

  // 验证难度是否可用
  const diffKey = dungeon.difficulties.includes(difficulty) ? difficulty : dungeon.difficulties[0];
  const diff = DIFFICULTIES[diffKey];
  
  // 获取玩家进入次数记录
  let timesRemaining = 999;
  let cooldownEnd = null;
  let bestRecord = null;
  
  if (db) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const record = db.prepare(
        'SELECT * FROM dungeon_records WHERE user_id = ? AND dungeon_id = ? AND enter_date = ?'
      ).get(userId, dungeonId, today);
      
      const maxDaily = 3;
      timesRemaining = record ? Math.max(0, maxDaily - record.enter_count) : maxDaily;
      
      if (record && record.cooldown_end) {
        cooldownEnd = record.cooldown_end;
      }
      
      const best = db.prepare(
        'SELECT * FROM dungeon_records WHERE user_id = ? AND dungeon_id = ? ORDER BY best_time ASC LIMIT 1'
      ).get(userId, dungeonId);
      if (best) {
        bestRecord = { bestTime: best.best_time, clearedAt: best.cleared_at, difficulty: best.difficulty || 'normal' };
      }
    } catch (e) {
      console.log('[dungeon] info查询:', e.message);
    }
  }
  
  res.json({
    success: true,
    dungeon: {
      id: dungeon.id,
      icon: dungeon.icon,
      name: dungeon.name,
      reqLevel: dungeon.reqLevel,
      cost: Math.floor(dungeon.cost * diff.costScale),
      dropChance: Math.min(1, dungeon.dropChance * diff.rewardScale),
      drops: dungeon.drops,
      unlocked: dungeon.unlocked
    },
    difficulty: diffKey,
    difficultyInfo: { key: diffKey, ...diff },
    availableDifficulties: dungeon.difficulties.map(key => ({ key, ...DIFFICULTIES[key] })),
    timesRemaining,
    cooldownEnd,
    bestRecord
  });
});

// 进入副本
router.post('/enter', (req, res) => {
  const { dungeonId, difficulty } = req.body;
  const userId = req.userId || parseInt(req.body.userId) || 1;
  
  const dungeon = dungeons.find(d => d.id === dungeonId);
  if (!dungeon) {
    return res.status(404).json({ success: false, error: '副本不存在' });
  }
  
  if (!dungeon.unlocked) {
    return res.status(403).json({ success: false, error: '副本未解锁' });
  }
  
  // 验证难度
  const diffKey = (difficulty && dungeon.difficulties.includes(difficulty)) ? difficulty : dungeon.difficulties[0];
  const diff = DIFFICULTIES[diffKey];
  const actualCost = Math.floor(dungeon.cost * diff.costScale);
  
  // 检查灵石（从 Users.lingshi 读取，权威数据源）
  if (db && actualCost > 0) {
    try {
      const user = db.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
      if (!user || (user.lingshi || 0) < actualCost) {
        return res.status(400).json({ success: false, error: `灵石不足，需要 ${actualCost}，当前 ${user?.lingshi || 0}` });
      }
      // 扣除灵石（写入 Users.lingshi，权威数据源）
      db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(actualCost, userId);
    } catch (e) {
      console.log('[dungeon] 进入检查:', e.message);
    }
  }
  
  // 生成战斗ID（包含难度标识）
  const battleId = Date.now();
  
  res.json({
    success: true,
    battleId,
    difficulty: diffKey,
    dungeon: {
      id: dungeon.id,
      name: dungeon.name,
      cost: actualCost,
      dropChance: Math.min(1, dungeon.dropChance * diff.rewardScale),
      drops: dungeon.drops
    }
  });
});

// ============================================================
// 副本战斗服务端计算（安全修复）
// 不信任客户端 won 参数，由服务器根据玩家/怪物属性计算胜负
// ============================================================

// 获取玩家有效战斗属性（含装备/功法/灵兽加成）
function getPlayerBattleStats(userId) {
  try {
    const user = db.prepare('SELECT attack, defense, hp, level FROM Users WHERE id = ?').get(userId);
    if (!user) return { attack: 100, defense: 50, hp: 1000, level: 1 };
    // 读取装备加成
    let equipAtk = 0, equipDef = 0, equipHp = 0;
    try {
      const equips = db.prepare(
        'SELECT e.attack, e.defense, e.hp FROM player_equipment pe ' +
        'JOIN equipment e ON e.id = pe.equipment_id ' +
        'WHERE pe.player_id = ? AND pe.equipped = 1'
      ).all(userId);
      for (const eq of equips) {
        equipAtk += (eq.attack || 0);
        equipDef += (eq.defense || 0);
        equipHp += (eq.hp || 0);
      }
    } catch (e) { /* ignore */ }

    // 读取灵兽出战加成
    let beastAtk = 0, beastHp = 0;
    try {
      const beast = db.prepare(
        'SELECT attack, hp FROM player_beasts WHERE player_id = ? AND in_battle = 1 LIMIT 1'
      ).get(userId);
      if (beast) {
        beastAtk = beast.attack || 0;
        beastHp = beast.hp || 0;
      }
    } catch (e) { /* ignore */ }

    // 读取修炼属性加成（P0-1 攻击/防御修炼）
    let cultAtkBonus = 0, cultDefBonus = 0, cultResBonus = 0, cultSpeedBonus = 0, critRate = 0;
    try {
      const cultAttr = db.prepare('SELECT * FROM cultivation_attributes WHERE user_id = ?').get(String(userId));
      if (cultAttr) {
        const CULTIVATION_ATTRS = {
          attack:     [5, 10, 15, 20, 25, 35, 45, 60, 80, 100],
          defense:    [3, 6, 9, 12, 15, 21, 27, 36, 48, 60],
          resistance: [3, 6, 9, 12, 15, 21, 27, 36, 48, 60],
          speed:      [2, 4, 6, 8, 10, 14, 18, 24, 32, 40],
          crit:       [0.5, 1, 1.5, 2, 2.5, 3.5, 4.5, 6, 8, 10],
        };
        const calcBonus = (level, perLevel) => {
          let total = 0;
          for (let i = 0; i < Math.min(10, level); i++) total += perLevel[i];
          return total;
        };
        cultAtkBonus    = calcBonus(cultAttr.attack_level || 0,     CULTIVATION_ATTRS.attack);
        cultDefBonus    = calcBonus(cultAttr.defense_level || 0,   CULTIVATION_ATTRS.defense);
        cultResBonus    = calcBonus(cultAttr.resistance_level || 0, CULTIVATION_ATTRS.resistance);
        cultSpeedBonus  = calcBonus(cultAttr.speed_level || 0,      CULTIVATION_ATTRS.speed);
        critRate        = Math.min(50, calcBonus(cultAttr.crit_level || 0, CULTIVATION_ATTRS.crit));
      }
    } catch (e) { /* cultivation attributes not available */ }

    return {
      attack:   (user.attack || 100) + equipAtk + beastAtk + cultAtkBonus,
      defense:  (user.defense || 50) + equipDef + cultDefBonus + cultResBonus,
      hp:       (user.hp || 1000) + equipHp + beastHp,
      speed:    (user.speed || 10) + cultSpeedBonus,
      critRate,
      level:    user.level || 1
    };
  } catch (e) {
    return { attack: 100, defense: 50, hp: 1000, level: 1 };
  }
}

// 获取副本怪物属性（基于副本等级缩放）
function getDungeonMonsterStats(dungeon, playerLevel, difficulty = 'normal') {
  // base stats grow with dungeon id and reqLevel
  const baseLevel = dungeon.reqLevel || 1;
  const scale = 1 + (baseLevel - 1) * 0.3;
  // 难度缩放
  const diff = DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
  const multiplier = diff.multiplier;
  const monsterHp = Math.floor(200 * scale * multiplier);
  const monsterAtk = Math.floor(30 * scale * multiplier);
  const monsterDef = Math.floor(15 * scale * multiplier);
  return { hp: monsterHp, attack: monsterAtk, defense: monsterDef, difficulty };
}

// 服务器端战斗模拟：计算胜负
// 模拟3回合内能否击杀怪物
function simulateBattle(playerAtk, playerDef, playerHp, monsterAtk, monsterDef, monsterHp) {
  let pHp = playerHp;
  let mHp = monsterHp;
  const maxRounds = 3;

  for (let round = 1; round <= maxRounds; round++) {
    // 玩家攻击怪物
    const playerDmg = Math.max(1, playerAtk - monsterDef * 0.5);
    mHp -= playerDmg;
    if (mHp <= 0) return { won: true, rounds: round, playerDamageTaken: pHp - playerHp };

    // 怪物攻击玩家
    const monsterDmg = Math.max(1, monsterAtk - playerDef * 0.5);
    pHp -= monsterDmg;
    if (pHp <= 0) return { won: false, rounds: round, playerDamageTaken: playerHp - pHp };
  }

  // 3回合后未分胜负，以怪物HP比例决定
  const monsterHpRatio = mHp / monsterHp;
  const playerHpRatio = pHp / playerHp;
  return { won: monsterHpRatio < playerHpRatio, rounds: maxRounds, playerDamageTaken: playerHp - pHp };
}

// 副本战斗结算
router.post('/battle/:battleId', (req, res) => {
  const { battleId } = req.params;
  // won 由客户端传入，但服务器会重新计算，不依赖客户端
  const { dungeonId, won: clientWon, time, difficulty } = req.body;
  const userId = req.userId || parseInt(req.body.userId) || 1;
  
  const dungeon = dungeons.find(d => d.id === dungeonId);
  if (!dungeon) {
    return res.status(404).json({ success: false, error: '副本不存在' });
  }
  
  // 验证难度
  const diffKey = (difficulty && dungeon.difficulties.includes(difficulty)) ? difficulty : dungeon.difficulties[0];
  const diff = DIFFICULTIES[diffKey];
  
  // ============================================================
  // 服务器端战斗计算（安全修复：不信任 won 参数）
  // ============================================================
  const playerStats = getPlayerBattleStats(userId);
  const monsterStats = getDungeonMonsterStats(dungeon, playerStats.level, diffKey);
  const battleResult = simulateBattle(
    playerStats.attack,
    playerStats.defense,
    playerStats.hp,
    monsterStats.attack,
    monsterStats.defense,
    monsterStats.hp
  );
  
  // 服务器计算结果为最终结果，客户端 won 仅作参考（日志记录）
  const won = battleResult.won;
  if (clientWon !== won) {
    console.log(`[dungeon] battleId=${battleId} diff=${diffKey} 客户端声称won=${clientWon}，服务器计算为won=${won}（已修正）`);
  }
  
  // 计算掉落（仅胜利时，含难度奖励倍率）
  let drops = [];
  let message = '战斗失败';
  
  if (won) {
    message = `战斗胜利 [${diff.name}]`;
    
    // 随机掉落（支持多件掉落，含难度奖励倍率）
    const totalDropChance = Math.min(1, dungeon.dropChance * diff.rewardScale);
    const dropsToGrant = [];
    
    for (const drop of dungeon.drops) {
      // 每件物品独立判定掉率
      const chance = drop.chance !== undefined ? drop.chance : totalDropChance;
      if (Math.random() < chance) {
        // count如果是数组则随机取值，噩梦难度额外+1
        const count = Array.isArray(drop.count)
          ? Math.floor(Math.random() * (drop.count[1] - drop.count[0] + 1)) + drop.count[0] + (diffKey === 'nightmare' ? 1 : 0)
          : drop.count + (diffKey === 'nightmare' ? 1 : 0);
        dropsToGrant.push({ ...drop, count });
      }
    }
    
    drops = dropsToGrant;
    
    // 写入玩家背包（逐件写入）
    if (db && dropsToGrant.length > 0) {
      try {
        for (const drop of dropsToGrant) {
          // 尝试UPSERT：已有同item则叠加count，否则插入
          const existing = db.prepare(
            'SELECT id, count FROM player_items WHERE user_id = ? AND item_id = ? AND item_type = ?'
          ).get(userId, drop.itemId, 'material');
          if (existing) {
            db.prepare('UPDATE player_items SET count = count + ? WHERE id = ?').run(drop.count, existing.id);
          } else {
            db.prepare(`
              INSERT INTO player_items (user_id, item_id, item_name, item_type, count, icon, source, created_at)
              VALUES (?, ?, ?, 'material', ?, ?, 'dungeon', CURRENT_TIMESTAMP)
            `).run(userId, drop.itemId, drop.name, drop.count, drop.icon);
          }
        }
      } catch (e) {
        console.log('[dungeon] 掉落写入:', e.message);
      }
    }
    
    // 记录通关
    if (db) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const existing = db.prepare(
          'SELECT * FROM dungeon_records WHERE user_id = ? AND dungeon_id = ? AND enter_date = ?'
        ).get(userId, dungeonId, today);
        
        if (existing) {
          // 噩梦难度通关时额外记录
          const bestDiff = existing.best_difficulty || 'normal';
          const newBestDiff = (diffKey === 'nightmare' && ['nightmare', 'hard', 'normal', 'easy'].indexOf(diffKey) > ['nightmare', 'hard', 'normal', 'easy'].indexOf(bestDiff)) ? diffKey : bestDiff;
          db.prepare(
            'UPDATE dungeon_records SET enter_count = enter_count + 1, cleared = 1, difficulty = ?, best_time = CASE WHEN ? < best_time OR best_time IS NULL THEN ? ELSE best_time END, best_difficulty = CASE WHEN ? < best_time OR best_time IS NULL THEN ? ELSE best_difficulty END WHERE id = ?'
          ).run(diffKey, time || 0, time || 0, time || 0, diffKey, existing.id);
        } else {
          db.prepare(
            'INSERT INTO dungeon_records (user_id, dungeon_id, difficulty, enter_count, cleared, best_time, best_difficulty, enter_date, enter_time) VALUES (?, ?, ?, 1, 1, ?, ?, CURRENT_TIMESTAMP)'
          ).run(userId, dungeonId, diffKey, time || 0, diffKey, today);
        }
      } catch (e) {
        console.log('[dungeon] 记录更新:', e.message);
      }
    }
    
    // 成就触发：副本通关
    if (won && achievementTrigger) {
      try {
        achievementTrigger.triggerAchievement(userId, 'dungeon_clear', dungeonId);
      } catch (e) {
        console.error('[dungeon] 成就触发失败:', e.message);
      }
    }

    // ===================== 深渊裂隙触发 (P2-7) =====================
    // 副本通关后5%概率触发深渊裂隙
    if (won && Math.random() < 0.05) {
      try {
        const abyssKey = `abyss_portal_${userId}`;
        const abyssPortal = {
          dungeonId,
          triggeredAt: Date.now(),
          expiresAt: Date.now() + 3600000, // 1小时有效期
          difficulty: diffKey,
        };
        // 存储到内存（也可存DB），深渊裂隙有效期1小时
        if (!global.abyssPortals) global.abyssPortals = {};
        global.abyssPortals[userId] = abyssPortal;
        console.log(`[深渊裂隙] playerId=${userId} 触发深渊裂隙! 副本=${dungeonId} 有效期1小时`);
      } catch (e) {
        console.error('[深渊裂隙] 触发失败:', e.message);
      }
    }
  }
  
  res.json({
    success: true,
    battleId: parseInt(battleId),
    won,
    message,
    dungeonId,
    difficulty: diffKey,
    drops,
    // 服务器计算奖励（含难度倍率）
    reward: won ? {
      spiritStones: Math.floor(dungeon.cost * 0.5 * diff.rewardScale),
      exp: Math.floor((dungeon.reqLevel * 5 + playerStats.level * 10) * (dungeon.progress / 100) * diff.rewardScale)
    } : null,
    // 服务器计算属性对比（供前端展示）
    serverCalc: {
      playerAtk: playerStats.attack,
      playerDef: playerStats.defense,
      playerHp: playerStats.hp,
      monsterHp: monsterStats.hp,
      monsterAtk: monsterStats.attack,
      monsterDef: monsterStats.defense,
      difficulty: diffKey,
      multiplier: diff.multiplier,
      rounds: battleResult.rounds
    }
  });
});

// ============================================================
// POST /api/dungeon/abyss - 进入深渊裂隙 (P2-7)
// ============================================================
router.post('/abyss', (req, res) => {
  const userId = Number(req.userId || req.query.userId || req.body?.userId || 1);
  const { action } = req.body; // 'enter' | 'info'

  // action=info: 查询是否有活跃的深渊裂隙
  if (action === 'info') {
    const portal = global.abyssPortals?.[userId];
    if (!portal || Date.now() > portal.expiresAt) {
      return res.json({ success: true, hasPortal: false, message: '暂无深渊裂隙' });
    }
    return res.json({
      success: true,
      hasPortal: true,
      portal: {
        dungeonId: portal.dungeonId,
        difficulty: portal.difficulty,
        remainingMs: portal.expiresAt - Date.now(),
      },
    });
  }

  // action=enter: 进入深渊裂隙，强制战斗，掉落橙/红色装备
  // 检查是否有活跃裂隙
  const portal = global.abyssPortals?.[userId];
  if (!portal || Date.now() > portal.expiresAt) {
    return res.json({ success: false, message: '深渊裂隙已消失或不存在' });
  }

  try {
    // 清除裂隙（一次性）
    delete global.abyssPortals[userId];

    // 获取玩家属性
    const player = db.prepare('SELECT * FROM player WHERE id = ?').get(userId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });

    // 深渊裂隙Boss属性（比普通噩梦更强）
    const abyssBoss = {
      name: '深渊领主',
      icon: '💀',
      hp: Math.floor((player.level * 500 + 20000) * 2.5),
      attack: Math.floor(player.level * 50 + 2000),
      defense: Math.floor(player.level * 30 + 1000),
    };

    // 模拟战斗（深渊Boss极强，这里简化处理：80%胜率）
    const won = Math.random() < 0.8;
    const battleId = Math.floor(Date.now() / 1000);

    let drops = [];
    if (won) {
      // 掉落橙色/红色装备（随机词缀）
      const rarityRoll = Math.random();
      const rarity = rarityRoll < 0.4 ? 'orange' : rarityRoll < 0.75 ? 'red' : 'gold';
      const affixes = [];
      const affixPool = [
        { key: 'attack', name: '攻击+', range: [50, 200] },
        { key: 'defense', name: '防御+', range: [30, 120] },
        { key: 'hp', name: '生命+', range: [500, 3000] },
        { key: 'crit', name: '暴击+', range: [5, 20] },
        { key: 'speed', name: '速度+', range: [10, 50] },
      ];
      const numAffixes = rarity === 'gold' ? 4 : rarity === 'red' ? 3 : 2;
      const shuffled = affixPool.sort(() => Math.random() - 0.5);
      for (let i = 0; i < numAffixes; i++) {
        const a = shuffled[i];
        const val = Math.floor(Math.random() * (a.range[1] - a.range[0]) + a.range[0]);
        affixes.push({ key: a.key, name: a.name + val, value: val });
      }

      drops = [{
        type: 'equipment',
        rarity,
        name: `【${rarity === 'gold' ? '金' : rarity === 'red' ? '红' : '橙'}色】深渊装备`,
        icon: rarity === 'gold' ? '👑' : rarity === 'red' ? '🔴' : '🟠',
        affixes,
        note: '深渊裂隙专属装备，携带随机词缀',
      }];

      // 额外掉落
      drops.push({
        type: 'material',
        itemId: 'abyss_core',
        name: '深渊核心',
        icon: '💠',
        count: Math.floor(Math.random() * 3) + 1,
      });
    }

    console.log(`[深渊裂隙] playerId=${userId} ${won ? '击败深渊领主' : '败于深渊领主'}`);

    res.json({
      success: true,
      battleId,
      won,
      message: won ? '恭喜击败深渊领主！' : '不敌深渊领主，下次再来！',
      boss: abyssBoss,
      drops,
      abyssReward: won ? {
        spiritStones: Math.floor(Math.random() * 5000) + 2000,
        exp: Math.floor(Math.random() * 5000) + 2000,
      } : null,
    });
  } catch (err) {
    console.error('[dungeon/abyss] error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
