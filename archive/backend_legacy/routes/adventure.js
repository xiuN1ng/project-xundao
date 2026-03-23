const express = require('express');
const router = express.Router();

// In-memory adventure store
let adventures = {
  1: {
    records: [],
    lastTrigger: 0,
    totalAdventures: 0
  }
};

// Adventure type definitions with weighted random selection
const ADVENTURE_TYPES = [
  {
    type: 'treasure',
    name: '遗失宝物',
    icon: '📦',
    desc: '发现前人遗落的宝物',
    weight: 30,
    rewards: [
      { type: 'spiritStones', min: 100, max: 500 },
      { type: 'exp', min: 500, max: 2000 },
      { type: 'item', items: ['灵石袋', '灵气丹', '初级强化石'] }
    ]
  },
  {
    type: 'monster',
    name: '妖兽袭击',
    icon: '👹',
    desc: '遭遇野生妖兽',
    weight: 25,
    rewards: [
      { type: 'spiritStones', min: 50, max: 300 },
      { type: 'exp', min: 200, max: 1000 }
    ]
  },
  {
    type: 'elder',
    name: '仙人指路',
    icon: '🧙',
    desc: '遇到仙人指点',
    weight: 15,
    rewards: [
      { type: 'buff', stat: 'cultivation_speed', value: 1.5, duration: 3600000 },
      { type: 'exp', min: 1000, max: 3000 }
    ]
  },
  {
    type: 'ruins',
    name: '探索遗迹',
    icon: '🏛️',
    desc: '发现神秘遗迹',
    weight: 15,
    rewards: [
      { type: 'spiritStones', min: 200, max: 800 },
      { type: 'exp', min: 500, max: 1500 },
      { type: 'item', items: ['古卷残片', '灵草', '灵石'] }
    ]
  },
  {
    type: 'storm',
    name: '天道轮回',
    icon: '💫',
    desc: '天道随机事件',
    weight: 15,
    rewards: [
      { type: 'spiritStones', min: -200, max: 500 },
      { type: 'exp', min: -100, max: 2000 }
    ]
  }
];

const ADVENTURE_COOLDOWN = 60000; // 60 seconds

// Helper: weighted random selection
function weightedRandom(types) {
  const totalWeight = types.reduce((sum, t) => sum + t.weight, 0);
  let random = Math.random() * totalWeight;
  for (const t of types) {
    random -= t.weight;
    if (random <= 0) return t;
  }
  return types[types.length - 1];
}

// Helper: random integer in range
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper: generate rewards for an adventure type
function generateRewards(type) {
  const rewards = [];
  for (const reward of type.rewards) {
    if (reward.type === 'spiritStones') {
      rewards.push({
        type: 'spiritStones',
        value: randInt(reward.min, reward.max)
      });
    } else if (reward.type === 'exp') {
      rewards.push({
        type: 'exp',
        value: randInt(reward.min, reward.max)
      });
    } else if (reward.type === 'buff') {
      rewards.push({
        type: 'buff',
        stat: reward.stat,
        value: reward.value,
        duration: reward.duration
      });
    } else if (reward.type === 'item') {
      const item = reward.items[randInt(0, reward.items.length - 1)];
      rewards.push({
        type: 'item',
        name: item
      });
    }
  }
  return rewards;
}

// GET /api/adventure - Get user's adventure history (last 20)
router.get('/', (req, res) => {
  const userId = parseInt(req.query.userId) || 1;
  if (!adventures[userId]) {
    adventures[userId] = { records: [], lastTrigger: 0, totalAdventures: 0 };
  }
  const userAdventures = adventures[userId];
  const recentRecords = userAdventures.records.slice(-20).reverse();
  res.json({
    success: true,
    records: recentRecords,
    total: userAdventures.totalAdventures,
    lastTrigger: userAdventures.lastTrigger
  });
});

// POST /api/adventure/trigger - Trigger a random adventure
router.post('/trigger', (req, res) => {
  const userId = parseInt(req.body.userId) || 1;
  if (!adventures[userId]) {
    adventures[userId] = { records: [], lastTrigger: 0, totalAdventures: 0 };
  }
  const userAdventures = adventures[userId];
  const now = Date.now();

  // Check cooldown
  if (now - userAdventures.lastTrigger < ADVENTURE_COOLDOWN) {
    const remaining = Math.ceil((ADVENTURE_COOLDOWN - (now - userAdventures.lastTrigger)) / 1000);
    return res.json({
      success: false,
      message: `需要等待${remaining}秒`,
      cooldown: remaining
    });
  }

  // Weighted random adventure type
  const adventureType = weightedRandom(ADVENTURE_TYPES);

  // Generate rewards
  const rewards = generateRewards(adventureType);

  // Build adventure record
  const record = {
    id: Date.now(),
    type: adventureType.type,
    name: adventureType.name,
    icon: adventureType.icon,
    desc: adventureType.desc,
    rewards: rewards,
    time: now
  };

  // Save record
  userAdventures.records.push(record);
  userAdventures.lastTrigger = now;
  userAdventures.totalAdventures++;

  // Keep only last 100 records
  if (userAdventures.records.length > 100) {
    userAdventures.records = userAdventures.records.slice(-100);
  }

  res.json({
    success: true,
    adventure: record,
    cooldown: ADVENTURE_COOLDOWN
  });
});

// GET /api/adventure/stats - Get user's adventure stats
router.get('/stats', (req, res) => {
  const userId = parseInt(req.query.userId) || 1;
  if (!adventures[userId]) {
    adventures[userId] = { records: [], lastTrigger: 0, totalAdventures: 0 };
  }
  const userAdventures = adventures[userId];
  res.json({
    success: true,
    totalAdventures: userAdventures.totalAdventures,
    lastTrigger: userAdventures.lastTrigger,
    cooldownRemaining: Math.max(0, ADVENTURE_COOLDOWN - (Date.now() - userAdventures.lastTrigger))
  });
});

module.exports = router;
