const express = require('express');
const router = express.Router();
const path = require('path');

// 数据库路径
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');
let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
} catch (e) {
  db = null;
}

// 经脉分支
const meridianBranches = [
  { id: 1, name: '任脉', description: '主修防御与生命', icon: '🛡️', color: '#4CAF50' },
  { id: 2, name: '督脉', description: '主修攻击与暴击', icon: '⚔️', color: '#F44336' },
  { id: 3, name: '带脉', description: '主修速度与闪避', icon: '⚡', color: '#FF9800' },
  { id: 4, name: '冲脉', description: '主修灵气与修炼', icon: '✨', color: '#2196F3' },
  { id: 5, name: '阴维脉', description: '主修控制与韧性', icon: '❄️', color: '#9C27B0' },
  { id: 6, name: '阳维脉', description: '主修爆发与穿透', icon: '🔥', color: '#E91E63' }
];

// 穴位数据 - 每个分支8个穴位
const meridianPoints = {
  // 任脉 - 防御生命
  1: [
    { id: 101, name: '会阴穴', position: '会阴', effect: { hp: 100, defense: 5 }, cost: 100, unlocked: false },
    { id: 102, name: '中极穴', position: '腹部', effect: { hp: 200, defense: 10 }, cost: 200, unlocked: false },
    { id: 103, name: '关元穴', position: '腹部', effect: { hp: 300, defense: 15, regen: 1 }, cost: 400, unlocked: false },
    { id: 104, name: '气海穴', position: '腹部', effect: { hp: 500, defense: 20, damageReduction: 0.05 }, cost: 800, unlocked: false },
    { id: 105, name: '神阙穴', position: '肚脐', effect: { hp: 800, defense: 30, regen: 2 }, cost: 1500, unlocked: false },
    { id: 106, name: '中脘穴', position: '胃部', effect: { hp: 1200, defense: 50, damageReduction: 0.1 }, cost: 3000, unlocked: false },
    { id: 107, name: '膻中穴', position: '胸部', effect: { hp: 2000, defense: 80, regen: 3 }, cost: 6000, unlocked: false },
    { id: 108, name: '天突穴', position: '颈部', effect: { hp: 3000, defense: 100, damageReduction: 0.15 }, cost: 10000, unlocked: false }
  ],
  // 督脉 - 攻击暴击
  2: [
    { id: 201, name: '长强穴', position: '尾椎', effect: { attack: 10, critRate: 0.01 }, cost: 100, unlocked: false },
    { id: 202, name: '腰俞穴', position: '腰部', effect: { attack: 20, critRate: 0.02 }, cost: 200, unlocked: false },
    { id: 203, name: '腰阳关', position: '腰部', effect: { attack: 35, critRate: 0.03, critDamage: 0.1 }, cost: 400, unlocked: false },
    { id: 204, name: '命门穴', position: '腰部', effect: { attack: 50, critRate: 0.05, critDamage: 0.15 }, cost: 800, unlocked: false },
    { id: 205, name: '筋缩穴', position: '背部', effect: { attack: 80, critRate: 0.08, critDamage: 0.2 }, cost: 1500, unlocked: false },
    { id: 206, name: '至阳穴', position: '背部', effect: { attack: 120, critRate: 0.1, critDamage: 0.3 }, cost: 3000, unlocked: false },
    { id: 207, name: '灵台穴', position: '背部', effect: { attack: 180, critRate: 0.15, critDamage: 0.4 }, cost: 6000, unlocked: false },
    { id: 208, name: '大椎穴', position: '颈部', effect: { attack: 250, critRate: 0.2, critDamage: 0.5 }, cost: 10000, unlocked: false }
  ],
  // 带脉 - 速度闪避
  3: [
    { id: 301, name: '带脉穴', position: '腰部', effect: { speed: 2, dodge: 0.02 }, cost: 100, unlocked: false },
    { id: 302, name: '五枢穴', position: '髋部', effect: { speed: 4, dodge: 0.03 }, cost: 200, unlocked: false },
    { id: 303, name: '维道穴', position: '髋部', effect: { speed: 6, dodge: 0.05, hitRate: 0.05 }, cost: 400, unlocked: false },
    { id: 304, name: '居髎穴', position: '髋部', effect: { speed: 10, dodge: 0.08, hitRate: 0.08 }, cost: 800, unlocked: false },
    { id: 305, name: '环跳穴', position: '臀部', effect: { speed: 15, dodge: 0.1, critDodge: 0.1 }, cost: 1500, unlocked: false },
    { id: 306, name: '风市穴', position: '大腿', effect: { speed: 20, dodge: 0.15, hitRate: 0.1 }, cost: 3000, unlocked: false },
    { id: 307, name: '中渎穴', position: '大腿', effect: { speed: 30, dodge: 0.2, critDodge: 0.15 }, cost: 6000, unlocked: false },
    { id: 308, name: '膝阳关穴', position: '膝盖', effect: { speed: 50, dodge: 0.3, allSpeed: 0.2 }, cost: 10000, unlocked: false }
  ],
  // 冲脉 - 灵气修炼
  4: [
    { id: 401, name: '幽门穴', position: '胸部', effect: { cultivation: 50 }, cost: 100, unlocked: false },
    { id: 402, name: '腹通谷', position: '腹部', effect: { cultivation: 100 }, cost: 200, unlocked: false },
    { id: 403, name: '气穴', position: '腹部', effect: { cultivation: 200, cultSpeed: 0.05 }, cost: 400, unlocked: false },
    { id: 404, name: '四满穴', position: '腹部', effect: { cultivation: 350, cultSpeed: 0.1 }, cost: 800, unlocked: false },
    { id: 405, name: '中注穴', position: '腹部', effect: { cultivation: 500, cultSpeed: 0.15, realmSpeed: 0.05 }, cost: 1500, unlocked: false },
    { id: 406, name: '肓俞穴', position: '腹部', effect: { cultivation: 800, cultSpeed: 0.2, realmSpeed: 0.1 }, cost: 3000, unlocked: false },
    { id: 407, name: '商曲穴', position: '腹部', effect: { cultivation: 1200, cultSpeed: 0.3, realmSpeed: 0.15 }, cost: 6000, unlocked: false },
    { id: 408, name: '石关穴', position: '腹部', effect: { cultivation: 2000, cultSpeed: 0.5, realmSpeed: 0.2 }, cost: 10000, unlocked: false }
  ],
  // 阴维脉 - 控制韧性
  5: [
    { id: 501, name: '筑宾穴', position: '小腿', effect: { tenacity: 0.05, resistance: 0.05 }, cost: 100, unlocked: false },
    { id: 502, name: '交信穴', position: '小腿', effect: { tenacity: 0.1, resistance: 0.1 }, cost: 200, unlocked: false },
    { id: 503, name: '复溜穴', position: '小腿', effect: { tenacity: 0.15, resistance: 0.15, slowResist: 0.2 }, cost: 400, unlocked: false },
    { id: 504, name: '照海穴', position: '脚踝', effect: { tenacity: 0.2, resistance: 0.2, stunResist: 0.3 }, cost: 800, unlocked: false },
    { id: 505, name: '水泉穴', position: '脚踝', effect: { tenacity: 0.3, resistance: 0.3, controlReduce: 0.2 }, cost: 1500, unlocked: false },
    { id: 506, name: '大钟穴', position: '脚跟', effect: { tenacity: 0.4, resistance: 0.4, allControlResist: 0.3 }, cost: 3000, unlocked: false },
    { id: 507, name: '太溪穴', position: '脚掌', effect: { tenacity: 0.5, resistance: 0.5, regen: 2 }, cost: 6000, unlocked: false },
    { id: 508, name: '然谷穴', position: '脚底', effect: { tenacity: 0.7, resistance: 0.7, counter: 0.3 }, cost: 10000, unlocked: false }
  ],
  // 阳维脉 - 爆发穿透
  6: [
    { id: 601, name: '金门穴', position: '脚背', effect: { penetration: 0.05, burst: 0.05 }, cost: 100, unlocked: false },
    { id: 602, name: '阳交穴', position: '小腿', effect: { penetration: 0.1, burst: 0.08 }, cost: 200, unlocked: false },
    { id: 603, name: '外丘穴', position: '小腿', effect: { penetration: 0.15, burst: 0.12, armorBreak: 0.1 }, cost: 400, unlocked: false },
    { id: 604, name: '阳陵泉', position: '膝盖', effect: { penetration: 0.2, burst: 0.15, armorBreak: 0.2 }, cost: 800, unlocked: false },
    { id: 605, name: '肩井穴', position: '肩膀', effect: { penetration: 0.3, burst: 0.2, armorBreak: 0.3 }, cost: 1500, unlocked: false },
    { id: 606, name: '天髎穴', position: '肩部', effect: { penetration: 0.4, burst: 0.3, armorBreak: 0.4 }, cost: 3000, unlocked: false },
    { id: 607, name: '风池穴', position: '颈部', effect: { penetration: 0.5, burst: 0.4, armorBreak: 0.5 }, cost: 6000, unlocked: false },
    { id: 608, name: '脑空穴', position: '头部', effect: { penetration: 0.7, burst: 0.6, trueDamage: 0.3 }, cost: 10000, unlocked: false }
  ]
};

// 经脉点系统：每分钟+1点（上限120点）
// userMeridians[userId] = { branchProgress: {}, meridianPoints: 0, lastAccumulationTime: timestamp }
let userMeridians = {};
let userBranchProgress = {}; // 兼容旧结构：userBranchProgress[userId][branchId] = count

// 初始化/获取玩家经脉数据（含自动解锁和点数累积）
function getOrInitMeridian(userId, realm) {
  if (!userMeridians[userId]) {
    userMeridians[userId] = {
      branchProgress: {},
      meridianPoints: 0,
      lastAccumulationTime: Date.now()
    };
    userBranchProgress[userId] = {};
  }
  
  const data = userMeridians[userId];
  const now = Date.now();
  
  // 累积经脉点：每分钟+1点（最多不超过120点）
  const elapsedMs = now - data.lastAccumulationTime;
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  if (elapsedMinutes > 0) {
    data.meridianPoints = Math.min(120, data.meridianPoints + elapsedMinutes);
    data.lastAccumulationTime = now;
  }
  
  // 自动解锁第一条经脉（任脉第1穴）：realm >= 2 且尚未解锁任何穴位
  const totalUnlocked = Object.values(data.branchProgress).reduce((s, v) => s + v, 0);
  if (realm >= 2 && totalUnlocked === 0) {
    data.branchProgress[1] = 1; // 任脉解锁第1穴
    userBranchProgress[userId] = userBranchProgress[userId] || {};
    userBranchProgress[userId][1] = 1;
  }
  
  return data;
}

// 获取经脉分支（支持 userId 查询参数，用于初始化经脉点）
router.get('/branches', (req, res) => {
  const userId = parseInt(req.query.userId) || 1;
  let realm = 1;
  if (db) {
    try {
      const user = db.prepare('SELECT realm FROM Users WHERE id = ?').get(userId);
      if (user) realm = user.realm || 1;
    } catch (e) {}
  }
  const meridianData = getOrInitMeridian(userId, realm);
  
  const branches = meridianBranches.map(b => {
    const points = meridianPoints[b.id];
    const userProgress = meridianData.branchProgress[b.id] || 0;
    const unlockedCount = points.filter((p, i) => i < userProgress).length;
    return {
      ...b,
      totalPoints: points.length,
      unlockedPoints: unlockedCount,
      progress: Math.floor((unlockedCount / points.length) * 100)
    };
  });
  res.json({ branches, meridianPoints: meridianData.meridianPoints });
});

// 获取特定分支的穴位
router.get('/branch/:branchId', (req, res) => {
  const branchId = parseInt(req.params.branchId);
  const userId = parseInt(req.query.userId) || 1;
  const points = meridianPoints[branchId];
  if (!points) return res.json({ success: false, message: '经脉分支不存在' });
  
  let realm = 1;
  if (db) {
    try {
      const user = db.prepare('SELECT realm FROM Users WHERE id = ?').get(userId);
      if (user) realm = user.realm || 1;
    } catch (e) {}
  }
  const meridianData = getOrInitMeridian(userId, realm);
  const userProgress = meridianData.branchProgress[branchId] || 0;
  
  res.json({
    branch: meridianBranches.find(b => b.id === branchId),
    points: points.map((p, i) => ({
      ...p,
      unlocked: i < userProgress
    })),
    currentProgress: userProgress,
    meridianPoints: meridianData.meridianPoints
  });
});

// 通脉
router.post('/unlock', (req, res) => {
  const { userId, branchId, pointIndex } = req.body;
  const points = meridianPoints[branchId];
  if (!points) return res.json({ success: false, message: '经脉分支不存在' });
  
  const point = points[pointIndex];
  if (!point) return res.json({ success: false, message: '穴位不存在' });
  
  // 获取玩家境界
  let realm = 1;
  if (db) {
    try {
      const user = db.prepare('SELECT realm FROM Users WHERE id = ?').get(userId);
      if (user) realm = user.realm || 1;
    } catch (e) {}
  }
  
  // 初始化经脉数据（含自动解锁 + 点数累积）
  const meridianData = getOrInitMeridian(userId, realm);
  const current = meridianData.branchProgress[branchId] || 0;
  
  if (pointIndex !== current) {
    return res.json({ success: false, message: '请按顺序解锁穴位' });
  }
  
  if (current >= points.length) {
    return res.json({ success: false, message: '该分支已全部打通' });
  }
  
  // 扣除经脉点（穴位 cost 代表所需点数，cost=100 表示需100点）
  const cost = point.cost || 100;
  if (meridianData.meridianPoints < cost) {
    return res.json({ success: false, message: `经脉点不足，需要${cost}点，当前${meridianData.meridianPoints}点` });
  }
  
  // 解锁穴位
  meridianData.meridianPoints -= cost;
  meridianData.branchProgress[branchId] = current + 1;
  userBranchProgress[userId] = userBranchProgress[userId] || {};
  userBranchProgress[userId][branchId] = current + 1;
  
  res.json({ 
    success: true, 
    message: '成功开通 ' + point.name,
    effect: point.effect,
    nextPoint: points[pointIndex + 1] || null,
    meridianPoints: meridianData.meridianPoints
  });
});

// 获取所有已开通经脉效果
router.get('/:userId', (req, res) => {
  const userId = parseInt(req.params.userId) || 1;
  
  // 获取玩家境界（用于自动解锁判断）
  let realm = 1;
  if (db) {
    try {
      const user = db.prepare('SELECT realm FROM Users WHERE id = ?').get(userId);
      if (user) realm = user.realm || 1;
    } catch (e) {}
  }
  
  // 初始化经脉数据（含自动解锁 + 点数累积）
  const meridianData = getOrInitMeridian(userId, realm);
  const progress = meridianData.branchProgress;
  
  let totalEffect = {
    hp: 0, attack: 0, defense: 0, speed: 0, dodge: 0, critRate: 0,
    cultivation: 0, cultSpeed: 0, regen: 0, penetration: 0, burst: 0,
    damageReduction: 0, resistance: 0, tenacity: 0
  };
  
  const unlockedDetails = [];
  
  for (const [branchId, count] of Object.entries(progress)) {
    const points = meridianPoints[branchId];
    if (!points) continue;
    
    for (let i = 0; i < count; i++) {
      const p = points[i];
      for (const [key, val] of Object.entries(p.effect)) {
        totalEffect[key] = (totalEffect[key] || 0) + val;
      }
      unlockedDetails.push({ branch: parseInt(branchId), point: p.name, effect: p.effect });
    }
  }
  
  // 计算加成百分比
  const bonuses = {};
  for (const [key, val] of Object.entries(totalEffect)) {
    if (val < 1) {
      bonuses[key] = (val * 100).toFixed(1) + '%';
    } else {
      bonuses[key] = Math.floor(val);
    }
  }
  
  res.json({
    branches: progress,
    meridianPoints: meridianData.meridianPoints,
    totalEffect: bonuses,
    details: unlockedDetails
  });
});

module.exports = router;
