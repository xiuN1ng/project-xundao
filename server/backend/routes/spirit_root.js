// 灵根系统 - 角色灵根属性与切换
const express = require('express');
const router = express.Router();
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode=WAL');
  db.pragma('busy_timeout=5000');
  initSpiritRootTables();
} catch (err) {
  console.log('[spirit_root] 数据库连接失败:', err.message);
  db = null;
}

// 灵根类型配置
const SPIRIT_ROOTS = {
  metal: {
    id: 'metal', name: '金', nameCN: '金灵根', color: '#FFD700',
    description: '金属性灵根，攻击型修士首选',
    bonus: { attack: 15, critRate: 5, critDamage: 10 },
    element: '金', icon: '⚔️', cultivationSpeed: 1.0
  },
  wood: {
    id: 'wood', name: '木', nameCN: '木灵根', color: '#228B22',
    description: '木属性灵根，治疗与辅助修士首选',
    bonus: { hp: 100, defense: 8, healEffect: 15 },
    element: '木', icon: '🌿', cultivationSpeed: 1.0
  },
  water: {
    id: 'water', name: '水', nameCN: '水灵根', color: '#4169E1',
    description: '水属性灵根，技能伤害与冷却缩减',
    bonus: { skillDamage: 12, cdReduction: 8, maxHp: 50 },
    element: '水', icon: '💧', cultivationSpeed: 1.0
  },
  fire: {
    id: 'fire', name: '火', nameCN: '火灵根', color: '#FF4500',
    description: '火属性灵根，爆发伤害型修士首选',
    bonus: { attack: 12, critRate: 8, burnDamage: 20 },
    element: '火', icon: '🔥', cultivationSpeed: 1.0
  },
  earth: {
    id: 'earth', name: '土', nameCN: '土灵根', color: '#D2691E',
    description: '土属性灵根，防御与持久战型修士首选',
    bonus: { defense: 12, hp: 80, resistance: 10 },
    element: '土', icon: '🪨', cultivationSpeed: 1.0
  },
  wind: {
    id: 'wind', name: '风', nameCN: '风灵根', color: '#00CED1',
    description: '风属性灵根，速度与闪避型修士首选',
    bonus: { speed: 15, dodge: 10, attack: 5 },
    element: '风', icon: '🌪️', cultivationSpeed: 1.0
  },
  thunder: {
    id: 'thunder', name: '雷', nameCN: '雷灵根', color: '#9400D3',
    description: '雷属性灵根，连击与控制型修士首选',
    bonus: { attack: 10, comboRate: 15, stunChance: 5 },
    element: '雷', icon: '⚡', cultivationSpeed: 1.0
  },
  ice: {
    id: 'ice', name: '冰', nameCN: '冰灵根', color: '#87CEEB',
    description: '冰属性灵根，控制与防御兼备',
    bonus: { defense: 8, freezeChance: 8, hp: 40 },
    element: '冰', icon: '❄️', cultivationSpeed: 1.0
  },
  dark: {
    id: 'dark', name: '暗', nameCN: '暗灵根', color: '#4B0082',
    description: '暗属性灵根，爆发与吸血型修士首选',
    bonus: { attack: 12, lifesteal: 8, critDamage: 15 },
    element: '暗', icon: '🌑', cultivationSpeed: 1.0
  },
  light: {
    id: 'light', name: '光', nameCN: '光灵根', color: '#FFFACD',
    description: '光属性灵根，治疗与护盾型修士首选',
    bonus: { healEffect: 20, shield: 15, defense: 5 },
    element: '光', icon: '☀️', cultivationSpeed: 1.0
  }
};

// 初始化灵根表
function initSpiritRootTables() {
  if (!db) return;
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS spirit_root_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        old_root TEXT,
        new_root TEXT NOT NULL,
        switch_time INTEGER NOT NULL,
        cost_type TEXT DEFAULT 'spirit_stone',
        cost_amount INTEGER DEFAULT 0,
        reason TEXT DEFAULT 'manual'
      );
    `);

    // 确保Users表有spirit_root列
    try {
      db.exec("ALTER TABLE Users ADD COLUMN spirit_root TEXT DEFAULT 'fire'");
    } catch (err) {
      // 列可能已存在
    }

    console.log('[spirit_root] 数据库表初始化完成');
  } catch (err) {
    console.log('[spirit_root] 表初始化失败:', err.message);
  }
}

function getUserId(req) {
  return req.userId || req.body.player_id || req.body.userId || req.query.player_id || req.query.userId || 1;
}

// GET /roots - 获取所有灵根类型
router.get('/roots', (req, res) => {
  res.json({
    success: true,
    data: {
      roots: Object.values(SPIRIT_ROOTS).map(r => ({
        id: r.id, name: r.name, nameCN: r.nameCN, color: r.color,
        description: r.description, bonus: r.bonus, element: r.element, icon: r.icon
      }))
    }
  });
});

// GET /my - 获取我的灵根
router.get('/my', (req, res) => {
  const userId = getUserId(req);
  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    const user = db.prepare('SELECT spirit_root FROM Users WHERE id = ?').get(userId);
    const currentRootId = user ? (user.spirit_root || 'fire') : 'fire';
    const currentRoot = SPIRIT_ROOTS[currentRootId] || SPIRIT_ROOTS.fire;

    // 获取切换记录
    const records = db.prepare('SELECT old_root, new_root, switch_time, cost_type, cost_amount FROM spirit_root_records WHERE player_id = ? ORDER BY switch_time DESC LIMIT 10').all(userId);

    res.json({
      success: true,
      data: {
        currentRoot: {
          id: currentRootId,
          name: currentRoot.name,
          nameCN: currentRoot.nameCN,
          color: currentRoot.color,
          description: currentRoot.description,
          bonus: currentRoot.bonus,
          element: currentRoot.element,
          icon: currentRoot.icon
        },
        switchHistory: records.map(r => ({
          oldRoot: r.old_root,
          newRoot: r.new_root,
          switchTime: r.switch_time,
          costType: r.cost_type,
          costAmount: r.cost_amount
        }))
      }
    });
  } catch (err) {
    console.log('[spirit_root] GET /my error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// GET /player/:playerId - 获取指定玩家的灵根
router.get('/player/:playerId', (req, res) => {
  const playerId = parseInt(req.params.playerId) || 1;
  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    const user = db.prepare('SELECT spirit_root FROM Users WHERE id = ?').get(playerId);
    const currentRootId = user ? (user.spirit_root || 'fire') : 'fire';
    const currentRoot = SPIRIT_ROOTS[currentRootId] || SPIRIT_ROOTS.fire;

    res.json({
      success: true,
      data: {
        playerId,
        rootId: currentRootId,
        rootName: currentRoot.nameCN,
        color: currentRoot.color,
        bonus: currentRoot.bonus
      }
    });
  } catch (err) {
    console.log('[spirit_root] GET /player error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// POST /switch - 切换灵根
router.post('/switch', (req, res) => {
  const userId = getUserId(req);
  const { root_id, use_diamond } = req.body;

  if (!root_id) return res.json({ success: false, message: '缺少root_id' });
  if (!SPIRIT_ROOTS[root_id]) return res.json({ success: false, message: '灵根类型不存在' });

  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    // 获取当前灵根
    const user = db.prepare('SELECT spirit_root, lingshi, diamonds FROM Users WHERE id = ?').get(userId);
    if (!user) return res.json({ success: false, message: '玩家不存在' });

    const currentRoot = user.spirit_root || 'fire';
    if (currentRoot === root_id) {
      return res.json({ success: false, message: '已经是该灵根，无需切换' });
    }

    // 切换消耗: 灵石2000 或 钻石50
    const useDiamond = !!use_diamond;
    const costType = useDiamond ? 'diamond' : 'spirit_stone';
    const costAmount = useDiamond ? 50 : 2000;

    if (useDiamond) {
      if ((user.diamonds || 0) < costAmount) {
        return res.json({ success: false, message: `钻石不足，需要${costAmount}钻石，当前${user.diamonds || 0}` });
      }
      db.prepare('UPDATE Users SET diamonds = diamonds - ? WHERE id = ?').run(costAmount, userId);
    } else {
      if ((user.lingshi || 0) < costAmount) {
        return res.json({ success: false, message: `灵石不足，需要${costAmount}灵石，当前${user.lingshi}` });
      }
      db.prepare('UPDATE Users SET lingshi = lingshi - ? WHERE id = ?').run(costAmount, userId);
    }

    // 更新灵根
    db.prepare('UPDATE Users SET spirit_root = ? WHERE id = ?').run(root_id, userId);

    // 记录切换历史
    db.prepare(`
      INSERT INTO spirit_root_records (player_id, old_root, new_root, switch_time, cost_type, cost_amount, reason)
      VALUES (?, ?, ?, ?, ?, ?, 'manual')
    `).run(userId, currentRoot, root_id, Date.now(), costType, costAmount);

    const newRoot = SPIRIT_ROOTS[root_id];
    res.json({
      success: true,
      data: {
        oldRoot: currentRoot,
        newRoot: {
          id: newRoot.id,
          nameCN: newRoot.nameCN,
          color: newRoot.color,
          bonus: newRoot.bonus
        },
        costType,
        costAmount,
        message: `灵根切换成功：${newRoot.nameCN}（消耗${costType === 'diamond' ? costAmount + '钻石' : costAmount + '灵石'}）`
      }
    });
  } catch (err) {
    console.log('[spirit_root] POST /switch error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// GET /bonus/:playerId - 获取灵根属性加成
router.get('/bonus/:playerId', (req, res) => {
  const playerId = parseInt(req.params.playerId) || 1;
  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    const user = db.prepare('SELECT spirit_root FROM Users WHERE id = ?').get(playerId);
    const rootId = user ? (user.spirit_root || 'fire') : 'fire';
    const root = SPIRIT_ROOTS[rootId] || SPIRIT_ROOTS.fire;

    res.json({
      success: true,
      data: {
        playerId,
        spiritRoot: {
          id: root.id,
          name: root.name,
          nameCN: root.nameCN,
          color: root.color,
          element: root.element,
          icon: root.icon,
          bonus: root.bonus
        }
      }
    });
  } catch (err) {
    console.log('[spirit_root] GET /bonus error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

// POST /init - 初始化玩家灵根 (首次创建角色时调用)
router.post('/init', (req, res) => {
  const userId = getUserId(req);
  const { root_id } = req.body;
  const chosenRoot = root_id && SPIRIT_ROOTS[root_id] ? root_id : 'fire';

  if (!db) return res.json({ success: false, message: '数据库未连接' });

  try {
    const user = db.prepare('SELECT spirit_root FROM Users WHERE id = ?').get(userId);
    if (user && user.spirit_root) {
      return res.json({ success: false, message: '灵根已初始化' });
    }

    db.prepare('UPDATE Users SET spirit_root = ? WHERE id = ?').run(chosenRoot, userId);

    const root = SPIRIT_ROOTS[chosenRoot];
    res.json({
      success: true,
      data: {
        spiritRoot: { id: root.id, nameCN: root.nameCN, color: root.color, bonus: root.bonus },
        message: `灵根「${root.nameCN}」初始化成功`
      }
    });
  } catch (err) {
    console.log('[spirit_root] POST /init error:', err.message);
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
