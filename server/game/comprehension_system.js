// 天道领悟系统 - 将修为转化为战斗被动技能
// 领悟点来源：修炼完成/章节通关/每日登录
// 三系领悟树：攻击(红)/防御(蓝)/通用(黄)

const COMPREHENSION_TREES = {
  attack: {
    treeId: 'attack',
    name: 'Attack Comprehension',
    nameCN: '攻击领悟',
    color: '#e74c3c',
    icon: '⚔️',
    description: '战斗系被动技能，领悟后永久生效',
    nodes: [
      {
        nodeId: 'atk_basic',
        nameCN: '力量初悟',
        description: '攻击力+5',
        cost: 1,
        tier: 1,
        maxLevel: 5,
        effects: [{ attr: 'attack', value: 5, isPercent: false }],
        requires: []
      },
      {
        nodeId: 'atk_adv',
        nameCN: '劲力精通',
        description: '攻击力+3%，暴击率+1%',
        cost: 2,
        tier: 2,
        maxLevel: 3,
        effects: [
          { attr: 'attack', value: 3, isPercent: true },
          { attr: 'critRate', value: 1, isPercent: true }
        ],
        requires: ['atk_basic']
      },
      {
        nodeId: 'crit_master',
        nameCN: '暴击奥义',
        description: '暴击率+5%，暴击伤害+10%',
        cost: 3,
        tier: 3,
        maxLevel: 3,
        effects: [
          { attr: 'critRate', value: 5, isPercent: true },
          { attr: 'critDamage', value: 10, isPercent: true }
        ],
        requires: ['atk_adv']
      },
      {
        nodeId: 'atk_damage',
        nameCN: '伤害加深',
        description: '对BOSS伤害+15%',
        cost: 4,
        tier: 4,
        maxLevel: 2,
        effects: [{ attr: 'bossDamage', value: 15, isPercent: true }],
        requires: ['crit_master']
      },
      {
        nodeId: 'lethality',
        nameCN: '致命打击',
        description: '攻击时有5%概率秒杀小怪',
        cost: 5,
        tier: 5,
        maxLevel: 1,
        effects: [{ attr: 'instantKill', value: 5, isPercent: true }],
        requires: ['atk_damage']
      }
    ]
  },
  defense: {
    treeId: 'defense',
    name: 'Defense Comprehension',
    nameCN: '防御领悟',
    color: '#3498db',
    icon: '🛡️',
    description: '生存系被动技能，领悟后永久生效',
    nodes: [
      {
        nodeId: 'def_basic',
        nameCN: '防御初悟',
        description: '防御力+5',
        cost: 1,
        tier: 1,
        maxLevel: 5,
        effects: [{ attr: 'defense', value: 5, isPercent: false }],
        requires: []
      },
      {
        nodeId: 'hp_adv',
        nameCN: '气血精通',
        description: '生命上限+50',
        cost: 2,
        tier: 2,
        maxLevel: 5,
        effects: [{ attr: 'hp', value: 50, isPercent: false }],
        requires: ['def_basic']
      },
      {
        nodeId: 'resist_master',
        nameCN: '抗性奥义',
        description: '受到伤害-3%',
        cost: 3,
        tier: 3,
        maxLevel: 3,
        effects: [{ attr: 'damageReduction', value: 3, isPercent: true }],
        requires: ['hp_adv']
      },
      {
        nodeId: 'block_tech',
        nameCN: '格挡精通',
        description: '格挡率+3%，格挡效果+5%',
        cost: 4,
        tier: 4,
        maxLevel: 2,
        effects: [
          { attr: 'blockRate', value: 3, isPercent: true },
          { attr: 'blockEffect', value: 5, isPercent: true }
        ],
        requires: ['resist_master']
      },
      {
        nodeId: 'immortal_body',
        nameCN: '不灭金身',
        description: '受到致命伤害时有10%概率存活1HP',
        cost: 5,
        tier: 5,
        maxLevel: 1,
        effects: [{ attr: 'surviveLethal', value: 10, isPercent: true }],
        requires: ['block_tech']
      }
    ]
  },
  general: {
    treeId: 'general',
    name: 'General Comprehension',
    nameCN: '通用领悟',
    color: '#f39c12',
    icon: '📖',
    description: '通用系被动技能，领悟后永久生效',
    nodes: [
      {
        nodeId: 'speed_basic',
        nameCN: '身法初悟',
        description: '速度+3',
        cost: 1,
        tier: 1,
        maxLevel: 5,
        effects: [{ attr: 'speed', value: 3, isPercent: false }],
        requires: []
      },
      {
        nodeId: 'luck_adv',
        nameCN: '福运精通',
        description: '掉落率+5%，灵石获取+3%',
        cost: 2,
        tier: 2,
        maxLevel: 3,
        effects: [
          { attr: 'dropRate', value: 5, isPercent: true },
          { attr: 'spiritStoneBonus', value: 3, isPercent: true }
        ],
        requires: ['speed_basic']
      },
      {
        nodeId: 'exp_master',
        nameCN: '经验奥义',
        description: '获取经验+10%',
        cost: 3,
        tier: 3,
        maxLevel: 3,
        effects: [{ attr: 'expBonus', value: 10, isPercent: true }],
        requires: ['luck_adv']
      },
      {
        nodeId: 'cult_speed',
        nameCN: '修炼加速',
        description: '修炼速度+5%，突破成功率+2%',
        cost: 3,
        tier: 3,
        maxLevel: 3,
        effects: [
          { attr: 'cultSpeed', value: 5, isPercent: true },
          { attr: 'breakthroughBonus', value: 2, isPercent: true }
        ],
        requires: ['luck_adv']
      },
      {
        nodeId: 'all_stats',
        nameCN: '天人合一',
        description: '攻击+3%，防御+3%，生命+3%',
        cost: 5,
        tier: 4,
        maxLevel: 1,
        effects: [
          { attr: 'attack', value: 3, isPercent: true },
          { attr: 'defense', value: 3, isPercent: true },
          { attr: 'hp', value: 3, isPercent: true }
        ],
        requires: ['exp_master', 'cult_speed']
      }
    ]
  }
};

// 领悟点获取配置
const COMPREHENSION_POINT_SOURCES = {
  cultivation_complete: 1,  // 每完成1次修炼
  chapter_clear: 2,         // 每通关1个章节
  daily_login: 3,          // 每日登录
  realm_breakthrough: 5,   // 境界突破
  dungeon_complete: 1,     // 副本通关
  arena_win: 1             // 竞技场胜利
};

// 根据领悟树计算玩家总被动加成
function calculateComprehensionBonus(playerId, db) {
  if (!db) return {};

  const bonuses = {
    attack: 0, defense: 0, hp: 0, speed: 0,
    critRate: 0, critDamage: 0, damageReduction: 0,
    dropRate: 0, expBonus: 0, cultSpeed: 0,
    bossDamage: 0, blockRate: 0, surviveLethal: 0,
    spiritStoneBonus: 0, breakthroughBonus: 0, maxHp: 0
  };

  try {
    const rows = db.prepare(`
      SELECT pc.node_id, pc.level, ct.effects, ct.cost
      FROM player_comprehension pc
      JOIN (
        SELECT 'attack' as tree, node_id, effects, cost FROM comprehension_attack_nodes
        UNION ALL
        SELECT 'defense' as tree, node_id, effects, cost FROM comprehension_defense_nodes
        UNION ALL
        SELECT 'general' as tree, node_id, effects, cost FROM comprehension_general_nodes
      ) ct ON ct.node_id = pc.node_id
      WHERE pc.player_id = ?
    `).all(playerId);

    for (const row of rows) {
      if (!row.effects) continue;
      try {
        const effects = JSON.parse(row.effects);
        for (const eff of effects) {
          if (bonuses.hasOwnProperty(eff.attr)) {
            const level = row.level || 1;
            if (eff.isPercent) {
              bonuses[eff.attr] += eff.value * level;
            } else {
              bonuses[eff.attr] += eff.value * level;
            }
          }
        }
      } catch (e) {}
    }
  } catch (err) {
    // 表可能不存在，静默返回空加成
  }

  return bonuses;
}

// 获取玩家领悟树状态
function getPlayerComprehensionStatus(playerId, db) {
  const result = {
    playerId,
    totalPoints: 0,
    usedPoints: 0,
    availablePoints: 0,
    trees: {}
  };

  if (!db) return result;

  try {
    // 获取领悟点总数
    const playerData = db.prepare(
      'SELECT comprehension_points, used_points FROM player_comprehension WHERE player_id = ?'
    ).get(playerId);

    if (playerData) {
      result.totalPoints = playerData.comprehension_points || 0;
      result.usedPoints = playerData.used_points || 0;
      result.availablePoints = Math.max(0, result.totalPoints - result.usedPoints);
    }

    // 获取每个树的节点状态
    for (const [treeKey, tree] of Object.entries(COMPREHENSION_TREES)) {
      const treeStatus = {
        treeId: treeKey,
        nameCN: tree.nameCN,
        icon: tree.icon,
        color: tree.color,
        description: tree.description,
        nodes: []
      };

      for (const node of tree.nodes) {
        const nodeData = db.prepare(
          'SELECT level FROM player_comprehension_nodes WHERE player_id = ? AND node_id = ?'
        ).get(playerId, node.nodeId);

        const currentLevel = nodeData ? nodeData.level : 0;

        // 检查前置节点是否已满级
        const canUnlock = node.requires.length === 0 ||
          node.requires.every(reqId => {
            const reqData = db.prepare(
              'SELECT level FROM player_comprehension_nodes WHERE player_id = ? AND node_id = ?'
            ).get(playerId, reqId);
            return reqData && reqData.level >= 1;
          });

        treeStatus.nodes.push({
          nodeId: node.nodeId,
          nameCN: node.nameCN,
          description: node.description,
          cost: node.cost,
          tier: node.tier,
          maxLevel: node.maxLevel,
          currentLevel,
          unlocked: currentLevel > 0,
          canUnlock: canUnlock && currentLevel < node.maxLevel,
          effects: node.effects
        });
      }

      result.trees[treeKey] = treeStatus;
    }
  } catch (err) {
    // 数据库错误，返回默认值
  }

  return result;
}

// 添加领悟点
function addComprehensionPoints(playerId, source, db) {
  if (!db) return 0;
  const points = COMPREHENSION_POINT_SOURCES[source] || 1;

  try {
    db.prepare(`
      INSERT INTO player_comprehension (player_id, comprehension_points, used_points)
      VALUES (?, ?, 0)
      ON CONFLICT(player_id) DO UPDATE SET
        comprehension_points = comprehension_points + excluded.comprehension_points
    `).run(playerId, points);

    // 触发事件（供其他系统监听）
    if (global.eventBus) {
      global.eventBus.emit('comprehension:pointsAdded', { playerId, source, points });
    }

    return points;
  } catch (err) {
    return 0;
  }
}

module.exports = {
  COMPREHENSION_TREES,
  COMPREHENSION_POINT_SOURCES,
  calculateComprehensionBonus,
  getPlayerComprehensionStatus,
  addComprehensionPoints
};
