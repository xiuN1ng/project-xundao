const express = require('express');
const router = express.Router();
const path = require('path');
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db = null;
function getDb() {
  if (!db) {
    const Database = require('better-sqlite3');
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
  }
  return db;
}

// 境界配置（练气期 ~ 大乘期，共25个境界）
const REALM_CONFIG = [
  { level: 1,  name: '练气一层',   power: 0,     spiritReward: 200,  expReward: 500 },
  { level: 2,  name: '练气二层',   power: 500,   spiritReward: 300,  expReward: 700 },
  { level: 3,  name: '练气三层',   power: 1200,  spiritReward: 400,  expReward: 900 },
  { level: 4,  name: '练气四层',   power: 2200,  spiritReward: 500,  expReward: 1200 },
  { level: 5,  name: '练气五层',   power: 3500,  spiritReward: 600,  expReward: 1500 },
  { level: 6,  name: '练气六层',   power: 5000,  spiritReward: 750,  expReward: 1800 },
  { level: 7,  name: '练气七层',   power: 7000,  spiritReward: 900,  expReward: 2200 },
  { level: 8,  name: '练气八层',   power: 9500,  spiritReward: 1100, expReward: 2600 },
  { level: 9,  name: '练气九层',   power: 12500, spiritReward: 1300, expReward: 3000 },
  { level: 10, name: '筑基初期',   power: 16000, spiritReward: 1600, expReward: 3500 },
  { level: 11, name: '筑基中期',   power: 21000, spiritReward: 2000, expReward: 4200 },
  { level: 12, name: '筑基后期',   power: 27000, spiritReward: 2400, expReward: 5000 },
  { level: 13, name: '筑基巅峰',   power: 34000, spiritReward: 2900, expReward: 5900 },
  { level: 14, name: '金丹初期',   power: 42000, spiritReward: 3500, expReward: 7000 },
  { level: 15, name: '金丹中期',   power: 52000, spiritReward: 4200, expReward: 8300 },
  { level: 16, name: '金丹后期',   power: 64000, spiritReward: 5000, expReward: 9800 },
  { level: 17, name: '金丹巅峰',   power: 78000, spiritReward: 6000, expReward: 11600 },
  { level: 18, name: '元婴初期',   power: 95000, spiritReward: 7200, expReward: 13800 },
  { level: 19, name: '元婴中期',   power: 115000, spiritReward: 8600, expReward: 16200 },
  { level: 20, name: '元婴后期',   power: 138000, spiritReward: 10200, expReward: 19000 },
  { level: 21, name: '元婴巅峰',   power: 165000, spiritReward: 12000, expReward: 22400 },
  { level: 22, name: '化神初期',   power: 196000, spiritReward: 14200, expReward: 26400 },
  { level: 23, name: '化神中期',   power: 232000, spiritReward: 16800, expReward: 31000 },
  { level: 24, name: '化神后期',   power: 272000, spiritReward: 19800, expReward: 36400 },
  { level: 25, name: '大乘期',     power: 999999999, spiritReward: 0, expReward: 0 },
];

// 难度配置
const DIFFICULTY_CONFIG = {
  1: { name: '普通',   stars: 1, waveCount: 3, damageMult: 0.8, rewardMult: 1.0, powerReqRatio: 0.5, successBase: 80 },
  2: { name: '困难',   stars: 2, waveCount: 4, damageMult: 1.2, rewardMult: 1.8, powerReqRatio: 0.8, successBase: 55 },
  3: { name: '地狱',   stars: 3, waveCount: 5, damageMult: 1.8, rewardMult: 3.0, powerReqRatio: 1.0, successBase: 30 },
};

// BOSS名字库
const BOSS_NAMES = ['心魔', '天魔', '妖皇', '魔尊', '邪神', '古仙残魂', '混沌兽', '虚空魔君'];
const MONSTER_PREFIXES = ['凶猛', '狂暴', '阴险', '狡诈', '剧毒', '噬魂'];

// 初始化数据库表
function initTables() {
  const database = getDb();
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS breakthrough_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        realm_level INTEGER NOT NULL,
        difficulty INTEGER DEFAULT 1,
        current_wave INTEGER DEFAULT 0,
        max_waves INTEGER DEFAULT 3,
        status TEXT DEFAULT 'pending',
        started_at TEXT,
        completed_at TEXT,
        reward_lingshi INTEGER DEFAULT 0,
        reward_exp INTEGER DEFAULT 0,
        UNIQUE(player_id, realm_level)
      )
    `);

    // battle_state 用于存储每场战斗中当前的怪物HP/状态
    database.exec(`
      CREATE TABLE IF NOT EXISTS breakthrough_battle_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        realm_level INTEGER NOT NULL,
        wave INTEGER NOT NULL,
        monster_hp INTEGER NOT NULL,
        monster_max_hp INTEGER NOT NULL,
        monster_atk INTEGER NOT NULL,
        monster_def INTEGER NOT NULL,
        monster_name TEXT,
        is_boss INTEGER DEFAULT 0,
        UNIQUE(player_id, realm_level, wave)
      )
    `);
  } catch (e) {
    console.error('[breakthrough] initTables error:', e.message);
  }
}
initTables();

function extractUserId(req) {
  return parseInt(req.body?.player_id || req.query?.player_id || req.userId || 1) || 1;
}

// 获取玩家战斗属性（含装备/灵兽/经脉加成）
function getPlayerBattleStats(userId) {
  const database = getDb();
  try {
    const user = database.prepare('SELECT attack, defense, hp, level FROM Users WHERE id = ?').get(userId);
    if (!user) return { attack: 100, defense: 50, hp: 1000, level: 1 };

    let equipAtk = 0, equipDef = 0, equipHp = 0;
    try {
      const equips = database.prepare(
        'SELECT e.attack, e.defense, e.hp FROM player_equipment pe ' +
        'JOIN equipment e ON pe.equipment_id = e.id ' +
        'WHERE pe.player_id = ? AND pe.is_equipped = 1'
      ).all(userId);
      for (const eq of equips) {
        equipAtk += eq.attack || 0;
        equipDef += eq.defense || 0;
        equipHp += eq.hp || 0;
      }
    } catch (e) {}

    // 灵兽加成
    let beastAtk = 0, beastHp = 0;
    try {
      const beast = database.prepare('SELECT attack, hp FROM player_beasts WHERE player_id = ? AND in_battle = 1 LIMIT 1').get(userId);
      if (beast) { beastAtk = beast.attack || 0; beastHp = beast.hp || 0; }
    } catch (e) {}

    // 经脉/修炼加成
    let cultAtkBonus = 0, cultDefBonus = 0, critRate = 5;
    try {
      const cultAttr = database.prepare('SELECT attack_level, defense_level, crit_level FROM cultivation_attributes WHERE user_id = ?').get(userId);
      if (cultAttr) {
        const CULTIVATION_ATTRS = { attack: [5, 10, 15, 20, 25, 35, 45, 60, 80, 100], defense: [3, 6, 9, 12, 15, 21, 27, 36, 48, 60], crit: [0.5, 1, 1.5, 2, 2.5, 3.5, 4.5, 6, 8, 10] };
        const calcBonus = (lvl, arr) => arr[Math.min(lvl || 0, arr.length - 1)];
        cultAtkBonus = calcBonus(cultAttr.attack_level || 0, CULTIVATION_ATTRS.attack);
        cultDefBonus = calcBonus(cultAttr.defense_level || 0, CULTIVATION_ATTRS.defense);
        critRate = Math.min(50, calcBonus(cultAttr.crit_level || 0, CULTIVATION_ATTRS.crit));
      }
    } catch (e) {}

    return {
      attack: (user.attack || 100) + equipAtk + beastAtk + cultAtkBonus,
      defense: (user.defense || 50) + equipDef + cultDefBonus,
      hp: (user.hp || 1000) + equipHp + beastHp,
      level: user.level || 1,
      critRate,
    };
  } catch (e) {
    return { attack: 100, defense: 50, hp: 1000, level: 1, critRate: 5 };
  }
}

// 生成一波怪物
function generateMonster(wave, maxWaves, difficulty, realmLevel) {
  const isBoss = wave === maxWaves;
  const realmCfg = REALM_CONFIG[Math.min(realmLevel - 1, REALM_CONFIG.length - 1)] || REALM_CONFIG[0];
  const diffCfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG[1];
  const waveScale = 1 + (wave - 1) * (isBoss ? 0.6 : 0.35);
  const diffScale = 1 + (difficulty - 1) * 0.5;

  const baseHp = (realmCfg.power / 20) + realmLevel * 500;
  const baseAtk = (realmCfg.power / 50) + realmLevel * 80;
  const baseDef = (realmCfg.power / 80) + realmLevel * 40;

  const hp = Math.floor(baseHp * waveScale * diffScale * 0.5);
  const atk = Math.floor(baseAtk * waveScale * diffScale * 0.4);
  const def = Math.floor(baseDef * waveScale * diffScale * 0.3);

  let name;
  if (isBoss) {
    name = `${BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]}（${realmCfg.name}终极天劫）`;
  } else {
    name = `${MONSTER_PREFIXES[Math.floor(Math.random() * MONSTER_PREFIXES.length)]}${['妖兽', '魔兽', '鬼修', '邪修', '凶魂'][Math.floor(Math.random() * 5)]}`;
  }

  return { hp, maxHp: hp, atk, def, name, isBoss: isBoss ? 1 : 0 };
}

// 计算突破成功率（基于战力比）
function calcSuccessRate(playerPower, requiredPower, difficulty) {
  const diffCfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG[1];
  const ratio = playerPower / (requiredPower * diffCfg.powerReqRatio);
  const baseRate = diffCfg.successBase;
  return Math.min(95, Math.max(5, Math.floor(baseRate + (ratio - 1) * 20)));
}

// GET /api/breakthrough/preview - 突破预览
router.get('/preview', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();
  try {
    const player = database.prepare('SELECT realm, attack, defense, hp, level FROM Users WHERE id = ?').get(userId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });

    const currentRealm = player.realm || 1;
    const nextRealm = Math.min(currentRealm + 1, REALM_CONFIG.length);
    const currentCfg = REALM_CONFIG[Math.min(currentRealm - 1, REALM_CONFIG.length - 1)] || REALM_CONFIG[0];
    const nextCfg = REALM_CONFIG[Math.min(nextRealm - 1, REALM_CONFIG.length - 1)] || REALM_CONFIG[0];
    const playerPower = Math.floor((player.attack || 100) * 10 + (player.defense || 50) * 5 + (player.hp || 1000) / 10 + (player.level || 1) * 50 + (player.realm || 1) * 500);

    // 检查是否已有进行中的突破
    const record = database.prepare(
      'SELECT * FROM breakthrough_records WHERE player_id = ? AND realm_level = ? AND status IN (?, ?)'
    ).get(userId, currentRealm, 'in_progress', 'pending');

    const successRates = {};
    for (let d = 1; d <= 3; d++) {
      successRates[d] = calcSuccessRate(playerPower, currentCfg.power, d);
    }

    res.json({
      success: true,
      currentRealm,
      currentRealmName: currentCfg.name,
      nextRealm,
      nextRealmName: nextCfg.name,
      playerPower,
      requiredPower: currentCfg.power,
      powerSatisfied: playerPower >= currentCfg.power,
      successRates,
      difficulties: {
        1: { name: DIFFICULTY_CONFIG[1].name, stars: DIFFICULTY_CONFIG[1].stars, waveCount: DIFFICULTY_CONFIG[1].waveCount },
        2: { name: DIFFICULTY_CONFIG[2].name, stars: DIFFICULTY_CONFIG[2].stars, waveCount: DIFFICULTY_CONFIG[2].waveCount },
        3: { name: DIFFICULTY_CONFIG[3].name, stars: DIFFICULTY_CONFIG[3].stars, waveCount: DIFFICULTY_CONFIG[3].waveCount },
      },
      inProgress: !!record,
      record: record ? { id: record.id, status: record.status, currentWave: record.current_wave, maxWaves: record.max_waves } : null,
    });
  } catch (e) {
    console.error('[breakthrough] GET /preview error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/breakthrough/battle - 触发突破战斗
router.post('/battle', (req, res) => {
  const userId = extractUserId(req);
  const { difficulty = 1 } = req.body || {};
  const database = getDb();

  try {
    const player = database.prepare('SELECT realm, attack, defense, hp, level FROM Users WHERE id = ?').get(userId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });

    const currentRealm = player.realm || 1;
    const nextRealm = Math.min(currentRealm + 1, REALM_CONFIG.length);
    const currentCfg = REALM_CONFIG[Math.min(currentRealm - 1, REALM_CONFIG.length - 1)] || REALM_CONFIG[0];
    const nextCfg = REALM_CONFIG[Math.min(nextRealm - 1, REALM_CONFIG.length - 1)] || REALM_CONFIG[0];
    const diffCfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG[1];

    // 检查是否可挑战
    const existing = database.prepare(
      'SELECT * FROM breakthrough_records WHERE player_id = ? AND realm_level = ? AND status = ?'
    ).get(userId, currentRealm, 'in_progress');

    if (existing) {
      return res.json({ success: false, message: '当前境界已有进行中的突破战斗' });
    }

    const maxWaves = diffCfg.waveCount;

    // 插入突破记录
    const now = new Date().toISOString();
    database.prepare(`
      INSERT OR REPLACE INTO breakthrough_records
        (player_id, realm_level, difficulty, current_wave, max_waves, status, started_at, reward_lingshi, reward_exp)
      VALUES (?, ?, ?, 1, ?, 'in_progress', ?, ?, ?)
    `).run(userId, currentRealm, difficulty, maxWaves, now, realmCfg.spiritReward, realmCfg.expReward);

    // 生成所有波次怪物并存储battle_state
    const record = database.prepare('SELECT id FROM breakthrough_records WHERE player_id = ? AND realm_level = ?').get(userId, currentRealm);
    const monsters = [];
    for (let w = 1; w <= maxWaves; w++) {
      const monster = generateMonster(w, maxWaves, difficulty, currentRealm);
      database.prepare(`
        INSERT OR REPLACE INTO breakthrough_battle_state
          (player_id, realm_level, wave, monster_hp, monster_max_hp, monster_atk, monster_def, monster_name, is_boss)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, currentRealm, w, monster.hp, monster.maxHp, monster.atk, monster.def, monster.name, monster.isBoss);
      monsters.push({ wave: w, ...monster });
    }

    res.json({
      success: true,
      message: `突破战斗开始！共${maxWaves}波怪物，第${maxWaves}波为BOSS`,
      realmLevel: currentRealm,
      difficulty,
      maxWaves,
      currentWave: 1,
      monsters,
      reward: { lingshi: realmCfg.spiritReward, exp: realmCfg.expReward },
    });
  } catch (e) {
    console.error('[breakthrough] POST /battle error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// GET /api/breakthrough/stages - 获取突破战斗阶段（怪物波次）
router.get('/stages', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();
  try {
    const player = database.prepare('SELECT realm FROM Users WHERE id = ?').get(userId);
    const currentRealm = player?.realm || 1;

    const record = database.prepare(
      'SELECT * FROM breakthrough_records WHERE player_id = ? AND realm_level = ? AND status = ?'
    ).get(userId, currentRealm, 'in_progress');

    if (!record) {
      return res.json({ success: false, message: '当前没有进行中的突破战斗，请先发起挑战' });
    }

    const states = database.prepare(
      'SELECT * FROM breakthrough_battle_state WHERE player_id = ? AND realm_level = ? ORDER BY wave ASC'
    ).all(userId, currentRealm);

    const stages = states.map(s => ({
      wave: s.wave,
      name: s.monster_name,
      hp: s.monster_hp,
      maxHp: s.monster_max_hp,
      atk: s.monster_atk,
      def: s.monster_def,
      isBoss: !!s.is_boss,
      defeated: s.wave < record.current_wave,
      current: s.wave === record.current_wave,
    }));

    res.json({
      success: true,
      currentWave: record.current_wave,
      maxWaves: record.max_waves,
      difficulty: record.difficulty,
      stages,
    });
  } catch (e) {
    console.error('[breakthrough] GET /stages error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/breakthrough/attack - 玩家攻击（每回合）
router.post('/attack', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();

  try {
    const player = database.prepare('SELECT realm, hp FROM player WHERE id = ?').get(userId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });
    const currentRealm = player.realm || 1;

    const record = database.prepare(
      'SELECT * FROM breakthrough_records WHERE player_id = ? AND realm_level = ? AND status = ?'
    ).get(userId, currentRealm, 'in_progress');

    if (!record) return res.json({ success: false, message: '当前没有进行中的突破战斗' });

    const currentWave = record.current_wave;
    const state = database.prepare(
      'SELECT * FROM breakthrough_battle_state WHERE player_id = ? AND realm_level = ? AND wave = ?'
    ).get(userId, currentRealm, currentWave);

    if (!state) return res.json({ success: false, message: '当前波次数据异常' });

    const playerStats = getPlayerBattleStats(userId);
    const diffCfg = DIFFICULTY_CONFIG[record.difficulty] || DIFFICULTY_CONFIG[1];

    // ATB回合模拟：玩家和怪物各行动一次
    // 玩家伤害：基础伤害 + 暴击 + 连击
    const baseDamage = Math.max(1, playerStats.attack - state.monster_def * 0.5);
    const isCrit = Math.random() * 100 < playerStats.critRate;
    const critBonus = isCrit ? 1.5 : 1.0;
    // 连击次数（2-5连击，概率递减）
    const comboCount = Math.random() < 0.7 ? 1 : Math.floor(Math.random() * 4) + 2;
    const totalDamage = Math.floor(baseDamage * critBonus * comboCount * diffCfg.damageMult);

    const newMonsterHp = Math.max(0, state.monster_hp - totalDamage);

    // 怪物反击伤害
    const monsterDamage = Math.max(1, Math.floor((state.monster_atk - playerStats.defense * 0.3) * 0.8 * diffCfg.damageMult));
    const newPlayerHp = Math.max(1, playerStats.hp - monsterDamage);

    // 更新怪物HP
    database.prepare('UPDATE breakthrough_battle_state SET monster_hp = ? WHERE id = ?').run(newMonsterHp, state.id);

    const attackLog = {
      playerAttack: totalDamage,
      comboCount,
      isCrit,
      monsterDamage,
      playerHpLeft: newPlayerHp,
      monsterHpLeft: newMonsterHp,
      monsterName: state.monster_name,
      wave: currentWave,
      maxWaves: record.max_waves,
    };

    // 判断本波是否结束
    if (newMonsterHp <= 0) {
      if (currentWave >= record.max_waves) {
        // 全部波次通过 → 突破成功
        database.prepare('UPDATE breakthrough_records SET status = ?, completed_at = ?, current_wave = ? WHERE id = ?')
          .run('completed', new Date().toISOString(), record.max_waves, record.id);

        // 提升玩家境界
        const newRealm = Math.min(currentRealm + 1, REALM_CONFIG.length);
        database.prepare('UPDATE Users SET realm = ? WHERE id = ?').run(newRealm, userId);

        // 发放奖励
        database.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(record.reward_lingshi, userId);
        // 经验奖励可挂接exp系统
        try {
          database.prepare('UPDATE Users SET experience = experience + ? WHERE id = ?').run(record.reward_exp, userId);
        } catch (e) {}

        // 清理battle_state
        database.prepare('DELETE FROM breakthrough_battle_state WHERE player_id = ? AND realm_level = ?').run(userId, currentRealm);

        res.json({
          success: true,
          breakthrough: true,
          message: `🎉 突破成功！境界提升至 ${REALM_CONFIG[Math.min(newRealm - 1, REALM_CONFIG.length - 1)].name}！`,
          newRealm,
          newRealmName: REALM_CONFIG[Math.min(newRealm - 1, REALM_CONFIG.length - 1)].name,
          rewards: { lingshi: record.reward_lingshi, exp: record.reward_exp },
          attackLog,
        });
      } else {
        // 进入下一波
        const nextWave = currentWave + 1;
        database.prepare('UPDATE breakthrough_records SET current_wave = ? WHERE id = ?').run(nextWave, record.id);
        const nextState = database.prepare(
          'SELECT * FROM breakthrough_battle_state WHERE player_id = ? AND realm_level = ? AND wave = ?'
        ).get(userId, currentRealm, nextWave);

        res.json({
          success: true,
          waveCleared: true,
          message: `第${currentWave}波「${state.monster_name}」已被击败！第${nextWave}波来袭！`,
          nextWave,
          nextMonster: nextState ? {
            wave: nextState.wave,
            name: nextState.monster_name,
            hp: nextState.monster_hp,
            maxHp: nextState.monster_max_hp,
            atk: nextState.monster_atk,
            def: nextState.monster_def,
            isBoss: !!nextState.is_boss,
          } : null,
          attackLog,
        });
      }
    } else {
      // 战斗继续
      res.json({
        success: true,
        waveCleared: false,
        message: `对「${state.monster_name}」造成${totalDamage}点伤害（${isCrit ? '暴击！' : ''}${comboCount > 1 ? comboCount + '连击！' : ''}），剩余${newMonsterHp}HP`,
        monsterHpLeft: newMonsterHp,
        monsterMaxHp: state.monster_max_hp,
        playerHpLeft: newPlayerHp,
        attackLog,
      });
    }
  } catch (e) {
    console.error('[breakthrough] POST /attack error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// GET /api/breakthrough/status - 获取突破进度状态
router.get('/status', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();
  try {
    const player = database.prepare('SELECT realm FROM Users WHERE id = ?').get(userId);
    const currentRealm = player?.realm || 1;

    const record = database.prepare(
      'SELECT * FROM breakthrough_records WHERE player_id = ? AND realm_level = ? ORDER BY id DESC LIMIT 1'
    ).get(userId, currentRealm);

    if (!record) {
      return res.json({
        success: true,
        hasRecord: false,
        currentRealm,
        currentRealmName: REALM_CONFIG[Math.min(currentRealm - 1, REALM_CONFIG.length - 1)].name,
        message: '尚无突破记录，可前往突破预览发起挑战',
      });
    }

    const currentState = record.status === 'in_progress'
      ? database.prepare('SELECT * FROM breakthrough_battle_state WHERE player_id = ? AND realm_level = ? AND wave = ?')
          .get(userId, currentRealm, record.current_wave)
      : null;

    res.json({
      success: true,
      hasRecord: true,
      realmLevel: record.realm_level,
      realmName: REALM_CONFIG[Math.min(record.realm_level - 1, REALM_CONFIG.length - 1)].name,
      difficulty: record.difficulty,
      difficultyName: DIFFICULTY_CONFIG[record.difficulty]?.name,
      currentWave: record.current_wave,
      maxWaves: record.max_waves,
      status: record.status,
      rewards: { lingshi: record.reward_lingshi, exp: record.reward_exp },
      startedAt: record.started_at,
      completedAt: record.completed_at,
      currentMonster: currentState ? {
        name: currentState.monster_name,
        hp: currentState.monster_hp,
        maxHp: currentState.monster_max_hp,
        atk: currentState.monster_atk,
        def: currentState.monster_def,
        isBoss: !!currentState.is_boss,
      } : null,
    });
  } catch (e) {
    console.error('[breakthrough] GET /status error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// POST /api/breakthrough/skip - 使用道具跳过战斗（消耗"渡劫丹"）
router.post('/skip', (req, res) => {
  const userId = extractUserId(req);
  const database = getDb();
  try {
    const player = database.prepare('SELECT realm FROM Users WHERE id = ?').get(userId);
    if (!player) return res.json({ success: false, message: '玩家不存在' });
    const currentRealm = player.realm || 1;

    const record = database.prepare(
      'SELECT * FROM breakthrough_records WHERE player_id = ? AND realm_level = ? AND status = ?'
    ).get(userId, currentRealm, 'in_progress');

    if (!record) return res.json({ success: false, message: '没有进行中的突破战斗可跳过' });

    // 检查渡劫丹（item_id='渡劫丹' or 'tribulation_pill'）
    const pillItem = database.prepare(
      "SELECT * FROM bag WHERE player_id = ? AND (item_id = ? OR name = ?) AND count > 0 LIMIT 1"
    ).get(userId, 'tribulation_pill', '渡劫丹');

    if (!pillItem) {
      return res.json({ success: false, message: '背包中没有"渡劫丹"，无法跳过突破战斗' });
    }

    // 消耗渡劫丹
    database.prepare('UPDATE bag SET count = count - 1 WHERE id = ?').run(pillItem.id);

    // 标记突破为skipped状态
    database.prepare('UPDATE breakthrough_records SET status = ?, completed_at = ? WHERE id = ?')
      .run('skipped', new Date().toISOString(), record.id);

    // 清理battle_state
    database.prepare('DELETE FROM breakthrough_battle_state WHERE player_id = ? AND realm_level = ?').run(userId, currentRealm);

    // 给予突破成功（跳过道具直接成功）
    const newRealm = Math.min(currentRealm + 1, REALM_CONFIG.length);
    database.prepare('UPDATE Users SET realm = ? WHERE id = ?').run(newRealm, userId);
    database.prepare('UPDATE Users SET lingshi = lingshi + ? WHERE id = ?').run(record.reward_lingshi, userId);
    try {
      database.prepare('UPDATE Users SET experience = experience + ? WHERE id = ?').run(record.reward_exp, userId);
    } catch (e) {}

    res.json({
      success: true,
      message: `使用渡劫丹跳过突破！境界提升至 ${REALM_CONFIG[Math.min(newRealm - 1, REALM_CONFIG.length - 1)].name}`,
      skipped: true,
      newRealm,
      newRealmName: REALM_CONFIG[Math.min(newRealm - 1, REALM_CONFIG.length - 1)].name,
      rewards: { lingshi: record.reward_lingshi, exp: record.reward_exp, pillUsed: '渡劫丹 x1' },
    });
  } catch (e) {
    console.error('[breakthrough] POST /skip error:', e.message);
    res.json({ success: false, message: e.message });
  }
});

module.exports = router;
