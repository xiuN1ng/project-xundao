/**
 * sect-contribution.js - 宗门建设系统
 * P1-4: 宗门捐献与技能
 *
 * 功能：
 * - 捐献灵石增加建设度
 * - 建设度解锁宗门技能(攻击+/防御+/修炼效率+)
 * - 宗门技能影响所有成员战斗属性
 *
 * API:
 *   GET  /api/sect-contrib/info     - 获取宗门建设信息和技能状态
 *   POST /api/sect-contrib/donate   - 捐献灵石增加建设度
 *   GET  /api/sect-contrib/bonuses - 获取宗门技能对玩家的战斗加成
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const Database = require('better-sqlite3');

const Logger = {
  info: (...args) => console.log('[sect-contrib]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[sect-contrib:error]', new Date().toISOString(), ...args)
};

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  Logger.info('数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  db = {
    prepare: () => ({ run: () => {}, get: () => null, all: () => [] }),
    exec: () => {}
  };
}

// ============================================================
// 宗门技能配置：解锁阈值(建设度) → 技能等级上限
// ============================================================
const SECT_SKILL_TIERS = [
  { tier: 1, name: '攻击增强·初',    constructionReq: 10000,  maxLevel: 3,  effectPerLevel: { attack: 3 },    icon: '⚔️' },
  { tier: 2, name: '攻击增强·中',    constructionReq: 50000,  maxLevel: 5,  effectPerLevel: { attack: 5 },    icon: '⚔️' },
  { tier: 3, name: '攻击增强·极',    constructionReq: 200000, maxLevel: 8,  effectPerLevel: { attack: 8 },    icon: '⚔️' },
  { tier: 1, name: '防御增强·初',    constructionReq: 10000,  maxLevel: 3,  effectPerLevel: { defense: 3 },  icon: '🛡️' },
  { tier: 2, name: '防御增强·中',    constructionReq: 50000,  maxLevel: 5,  effectPerLevel: { defense: 5 },  icon: '🛡️' },
  { tier: 3, name: '防御增强·极',    constructionReq: 200000, maxLevel: 8,  effectPerLevel: { defense: 8 },  icon: '🛡️' },
  { tier: 1, name: '修炼加速·初',    constructionReq: 10000,  maxLevel: 3,  effectPerLevel: { cultivation: 5 }, icon: '🌀' },
  { tier: 2, name: '修炼加速·中',    constructionReq: 50000,  maxLevel: 5,  effectPerLevel: { cultivation: 8 }, icon: '🌀' },
  { tier: 3, name: '修炼加速·极',    constructionReq: 200000, maxLevel: 8,  effectPerLevel: { cultivation: 12 }, icon: '🌀' },
];

// 每个 tier 组内共享解锁状态 (attack/defense/cultivation 各3个tier)
// tier 1 unlocked at construction >= 10000
// tier 2 unlocked at construction >= 50000
// tier 3 unlocked at construction >= 200000

// 简化：按技能类型分组
const SKILL_CATEGORIES = {
  attack: {
    name: '攻击增强',
    icon: '⚔️',
    tiers: [
      { tier: 1, name: '攻击增强·初', constructionReq: 10000,  maxLevel: 3, effectPerLevel: 3  },
      { tier: 2, name: '攻击增强·中', constructionReq: 50000,  maxLevel: 5, effectPerLevel: 5  },
      { tier: 3, name: '攻击增强·极', constructionReq: 200000, maxLevel: 8, effectPerLevel: 8  },
    ],
  },
  defense: {
    name: '防御增强',
    icon: '🛡️',
    tiers: [
      { tier: 1, name: '防御增强·初', constructionReq: 10000,  maxLevel: 3, effectPerLevel: 3  },
      { tier: 2, name: '防御增强·中', constructionReq: 50000,  maxLevel: 5, effectPerLevel: 5  },
      { tier: 3, name: '防御增强·极', constructionReq: 200000, maxLevel: 8, effectPerLevel: 8  },
    ],
  },
  cultivation: {
    name: '修炼加速',
    icon: '🌀',
    tiers: [
      { tier: 1, name: '修炼加速·初', constructionReq: 10000,  maxLevel: 3, effectPerLevel: 5  },
      { tier: 2, name: '修炼加速·中', constructionReq: 50000,  maxLevel: 5, effectPerLevel: 8  },
      { tier: 3, name: '修炼加速·极', constructionReq: 200000, maxLevel: 8, effectPerLevel: 12 },
    ],
  },
};

// 每次捐献灵石转换为建设度的比例
const CONSTRUCTION_PER_LINGSHI = 1; // 1灵石 = 1建设度

// ============================================================
// 初始化：添加 construction 列和 sect_skills 表
// ============================================================
function init() {
  try {
    // 添加建设度字段（如果不存在）
    try { db.exec("ALTER TABLE sects ADD COLUMN construction INTEGER DEFAULT 0"); } catch(e) {}
    // 宗门技能表
    db.exec(`
      CREATE TABLE IF NOT EXISTS sect_skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sect_id INTEGER NOT NULL UNIQUE,
        attack_level INTEGER DEFAULT 0,
        defense_level INTEGER DEFAULT 0,
        cultivation_level INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    Logger.info('宗门建设系统表初始化完成');
  } catch (e) {
    Logger.error('init error:', e.message);
  }
}
init();

// ============================================================
// 辅助函数
// ============================================================
function getPlayerId(req) {
  return Number(req.userId || req.query.userId || req.body?.userId || 1);
}

function ensureSectSkills(sectId) {
  try {
    let skills = db.prepare('SELECT * FROM sect_skills WHERE sect_id = ?').get(sectId);
    if (!skills) {
      db.prepare('INSERT INTO sect_skills (sect_id, attack_level, defense_level, cultivation_level) VALUES (?, 0, 0, 0)').run(sectId);
      skills = db.prepare('SELECT * FROM sect_skills WHERE sect_id = ?').get(sectId);
    }
    return skills;
  } catch (e) {
    Logger.error('ensureSectSkills error:', e.message);
    return { attack_level: 0, defense_level: 0, cultivation_level: 0 };
  }
}

function getUnlockedTierCount(construction) {
  let count = 0;
  if (construction >= 10000)  count++;
  if (construction >= 50000) count++;
  if (construction >= 200000) count++;
  return count;
}

function getMaxLevelForSkill(skillKey, construction) {
  const tierCount = getUnlockedTierCount(construction);
  const cat = SKILL_CATEGORIES[skillKey];
  if (!cat) return 0;
  let maxLevel = 0;
  for (let i = 0; i < tierCount && i < cat.tiers.length; i++) {
    maxLevel = cat.tiers[i].maxLevel;
  }
  return maxLevel;
}

function calcSkillBonuses(sectId, construction) {
  try {
    const skills = ensureSectSkills(sectId);
    const bonuses = { attack: 0, defense: 0, cultivation: 0 };
    const details = {};

    for (const [skillKey, cat] of Object.entries(SKILL_CATEGORIES)) {
      const currentLevel = skills[`${skillKey}_level`] || 0;
      const maxLevel = getMaxLevelForSkill(skillKey, construction);
      const effectiveLevel = Math.min(currentLevel, maxLevel);

      let totalBonus = 0;
      // 计算每tier的加成
      const tierCount = getUnlockedTierCount(construction);
      for (let i = 0; i < tierCount && i < cat.tiers.length; i++) {
        const tier = cat.tiers[i];
        const levelInTier = Math.min(
          Math.max(0, effectiveLevel - (i === 0 ? 0 : cat.tiers.slice(0, i).reduce((s, t) => s + t.maxLevel, 0))),
          tier.maxLevel
        );
        totalBonus += levelInTier * tier.effectPerLevel;
      }

      bonuses[skillKey] = totalBonus;
      details[skillKey] = {
        name: cat.name,
        icon: cat.icon,
        currentLevel: effectiveLevel,
        maxLevel,
        totalBonus,
        unlockedTiers: tierCount,
        tiers: cat.tiers.map(t => ({
          tier: t.tier,
          name: t.name,
          constructionReq: t.constructionReq,
          maxLevel: t.maxLevel,
          unlocked: construction >= t.constructionReq,
        })),
      };
    }

    return { bonuses, details };
  } catch (e) {
    Logger.error('calcSkillBonuses error:', e.message);
    return {
      bonuses: { attack: 0, defense: 0, cultivation: 0 },
      details: {},
    };
  }
}

// ============================================================
// GET /api/sect-contrib/info - 获取宗门建设信息和技能状态
// ============================================================
router.get('/info', (req, res) => {
  const playerId = getPlayerId(req);

  try {
    // 获取玩家宗门
    const member = db.prepare('SELECT sectId FROM SectMembers WHERE userId = ?').get(playerId);
    if (!member || !member.sectId) {
      return res.json({ success: false, message: '未加入宗门' });
    }

    const sectId = member.sectId;
    const sect = db.prepare('SELECT * FROM sects WHERE id = ?').get(sectId);
    if (!sect) {
      return res.json({ success: false, message: '宗门不存在' });
    }

    const construction = sect.construction || 0;
    const playerLingshi = (() => {
      try { return db.prepare('SELECT spirit_stones FROM player WHERE id = ?').get(playerId)?.spirit_stones || 0; } catch { return 0; }
    })();

    const { bonuses, details } = calcSkillBonuses(sectId, construction);

    res.json({
      success: true,
      playerId,
      sectId,
      sectName: sect.name,
      construction,
      memberContribution: member.contribution || 0,
      playerLingshi,
      skillBonuses: bonuses,
      skillDetails: details,
      constructionMilestones: [
        { threshold: 10000,  bonus: '+3% attack/def/cult per level, max 3 levels',  unlocked: construction >= 10000  },
        { threshold: 50000,  bonus: '+5% attack/def/cult per level, max 5 levels',  unlocked: construction >= 50000  },
        { threshold: 200000, bonus: '+8-12% attack/def/cult per level, max 8 levels', unlocked: construction >= 200000 },
      ],
    });
  } catch (err) {
    Logger.error('GET /info error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// ============================================================
// POST /api/sect-contrib/donate - 捐献灵石增加建设度
// ============================================================
router.post('/donate', (req, res) => {
  const playerId = getPlayerId(req);
  const amount = Math.max(0, parseInt(req.body.amount || req.body.lingshi || 0));
  const resource = req.body.resource || 'lingshi'; // 'lingshi' only for now

  if (amount <= 0) {
    return res.json({ success: false, message: '请输入有效的捐献数量(>0)' });
  }

  try {
    // 检查玩家宗门
    const member = db.prepare('SELECT sectId, contribution FROM SectMembers WHERE userId = ?').get(playerId);
    if (!member || !member.sectId) {
      return res.json({ success: false, message: '未加入宗门，无法捐献' });
    }

    const sectId = member.sectId;

    // 检查灵石是否足够
    const player = db.prepare('SELECT spirit_stones FROM player WHERE id = ?').get(playerId);
    if (!player || (player.spirit_stones || 0) < amount) {
      return res.json({
        success: false,
        message: `灵石不足，需要 ${amount}，当前 ${player?.spirit_stones || 0}`
      });
    }

    // 扣减玩家灵石
    const updated = db.prepare('UPDATE player SET spirit_stones = spirit_stones - ? WHERE id = ?').run(amount, playerId);
    if (updated.changes === 0) {
      return res.json({ success: false, message: '灵石扣除失败' });
    }

    // 增加建设度和成员贡献
    const prevConstruction = (db.prepare('SELECT construction FROM sects WHERE id = ?').get(sectId)?.construction) || 0;
    const newConstruction = prevConstruction + amount * CONSTRUCTION_PER_LINGSHI;

    db.prepare('UPDATE sects SET construction = ? WHERE id = ?').run(newConstruction, sectId);
    db.prepare('UPDATE SectMembers SET contribution = contribution + ? WHERE userId = ? AND sectId = ?').run(amount, playerId, sectId);
    // 宗门灵石增加
    db.prepare('UPDATE sects SET spirit_stones = spirit_stones + ? WHERE id = ?').run(amount, sectId);

    // 检查是否有新tier解锁
    const prevTier = getUnlockedTierCount(prevConstruction);
    const newTier = getUnlockedTierCount(newConstruction);
    const newlyUnlocked = newTier > prevTier;

    const { bonuses, details } = calcSkillBonuses(sectId, newConstruction);
    const remainingLingshi = (player.spirit_stones || 0) - amount;

    Logger.info(`[宗门捐献] playerId=${playerId} sectId=${sectId} amount=${amount} construction=${prevConstruction}→${newConstruction}`);

    res.json({
      success: true,
      message: newlyUnlocked
        ? `捐献成功！建设度 +${amount * CONSTRUCTION_PER_LINGSHI}，恭喜解锁新的宗门技能Tier！`
        : `捐献成功！建设度 +${amount * CONSTRUCTION_PER_LINGSHI}`,
      donate: {
        amount,
        constructionGained: amount * CONSTRUCTION_PER_LINGSHI,
        totalConstruction: newConstruction,
      },
      skillBonuses: bonuses,
      skillDetails: details,
      tierInfo: {
        previousTier: prevTier,
        currentTier: newTier,
        newlyUnlocked,
      },
      remainingLingshi,
    });
  } catch (err) {
    Logger.error('POST /donate error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// ============================================================
// GET /api/sect-contrib/bonuses - 获取宗门技能对玩家的战斗加成
// ============================================================
router.get('/bonuses', (req, res) => {
  const playerId = getPlayerId(req);

  try {
    const member = db.prepare('SELECT sectId FROM SectMembers WHERE userId = ?').get(playerId);
    if (!member || !member.sectId) {
      return res.json({
        success: true,
        playerId,
        sectMember: false,
        bonuses: { attack: 0, defense: 0, cultivation: 0 },
      });
    }

    const sect = db.prepare('SELECT construction FROM sects WHERE id = ?').get(member.sectId);
    const construction = sect?.construction || 0;
    const { bonuses, details } = calcSkillBonuses(member.sectId, construction);

    res.json({
      success: true,
      playerId,
      sectMember: true,
      sectId: member.sectId,
      bonuses,
      details,
    });
  } catch (err) {
    Logger.error('GET /bonuses error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
