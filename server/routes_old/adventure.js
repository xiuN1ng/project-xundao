/**
 * 奇遇系统路由 - /api/adventure/*
 * 仙侠奇遇：遗迹探索/仙人指路/妖兽袭击/遗失宝物
 */

module.exports = function(app, db, authenticateToken, Logger) {

  // ========== 奇遇类型配置 ==========
  const ADVENTURE_TYPES = {
    relic_exploration: {
      id: 'relic_exploration',
      name: '遗迹探索',
      icon: '🏛️',
      description: '探索远古废墟或神秘洞窟，可能发现珍稀宝物',
      rarity: 2,
      possible_rewards: ['spirit_stones', 'equipment', 'pill', 'manual'],
      min_realm: 0,
      trigger_weight: 30
    },
    immortal_guidance: {
      id: 'immortal_guidance',
      name: '仙人指路',
      icon: '🧙',
      description: '偶遇高人指点迷津，可能获得功法顿悟或灵根提升',
      rarity: 3,
      possible_rewards: ['manual', 'spirit_root_boost', 'gongfa_exp'],
      min_realm: 2,
      trigger_weight: 20
    },
    beast_attack: {
      id: 'beast_attack',
      name: '妖兽袭击',
      icon: '👹',
      description: '路遇妖兽袭击，击败可获得妖丹与兽皮',
      rarity: 1,
      possible_rewards: ['beast_core', 'beast_hide', 'spirit_stones'],
      min_realm: 0,
      trigger_weight: 35,
      has_battle: true
    },
    lost_treasure: {
      id: 'lost_treasure',
      name: '遗失宝物',
      icon: '💎',
      description: '发现前人遗失的宝物，需做出选择决定命运',
      rarity: 4,
      possible_rewards: ['rare_equipment', 'rare_pill', 'spirit_stones'],
      min_realm: 1,
      trigger_weight: 15,
      has_choice: true
    }
  };

  // 奇遇奖励配置
  const ADVENTURE_REWARDS = {
    spirit_stones: { type: 'spirit_stones', weight: 40, min: 100, max: 5000 },
    equipment: { type: 'equipment', weight: 15, rarity_range: [1, 3] },
    pill: { type: 'pill', weight: 20, pill_types: ['spirit', 'strength', 'defense'] },
    manual: { type: 'manual', weight: 15, rarity_range: [2, 4] },
    spirit_root_boost: { type: 'spirit_root_boost', weight: 10, bonus_range: [0.1, 0.3] },
    gongfa_exp: { type: 'gongfa_exp', weight: 15, exp_range: [100, 1000] },
    beast_core: { type: 'beast_core', weight: 30, min: 1, max: 5 },
    beast_hide: { type: 'beast_hide', weight: 35, min: 1, max: 10 },
    rare_equipment: { type: 'rare_equipment', weight: 25, rarity_range: [4, 5] },
    rare_pill: { type: 'rare_pill', weight: 25, pill_types: ['breakthrough', 'rebirth'] }
  };

  // 遗失宝物选择配置
  const LOST_TREASURE_CHOICES = {
    greedy: {
      id: 'greedy',
      name: '贪心索取',
      description: '想要获得所有宝物',
      success_rate: 0.4,
      rewards_multiplier: 2.0,
      failure_penalty: { type: 'damage', value: 0.3 }
    },
    prudent: {
      id: 'prudent',
      name: '谨慎取一',
      description: '只取最需要的宝物',
      success_rate: 0.85,
      rewards_multiplier: 0.8,
      failure_penalty: null
    },
    selfless: {
      id: 'selfless',
      name: '无私奉献',
      description: '将宝物留待后人',
      success_rate: 0.95,
      rewards_multiplier: 0.5,
      bonus: { type: 'reputation', value: 50 }
    }
  };

  // ========== 数据库初始化 ==========
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS player_adventures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        adventure_type TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        choice_made TEXT,
        result TEXT,
        rewards_claimed INTEGER DEFAULT 0,
        rewards TEXT,
        UNIQUE(player_id, adventure_type, triggered_at)
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_adventure_player ON player_adventures(player_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_adventure_status ON player_adventures(player_id, status)`);
    Logger.info('✅ 奇遇系统数据库初始化完成');
  } catch (e) {
    Logger.warn('奇遇系统数据库初始化失败:', e.message);
  }

  // ========== 辅助函数 ==========

  // 计算玩家奇遇触发概率
  function calculateTriggerChance(player, realmSuppression) {
    let baseChance = 0.05; // 基础5%概率
    // 境界加成
    const realmBonus = player.realm_level * 0.005;
    // VIP加成
    const vipBonus = (player.vip_level || 0) * 0.01;
    // 灵根加成（简单模拟）
    let spiritRootBonus = 0;
    if (player.spirit_root) {
      const rootTypes = ['天灵根', '异灵根', '地灵根', '真灵根', '五行杂灵根'];
      const idx = rootTypes.indexOf(player.spirit_root);
      if (idx >= 0) spiritRootBonus = idx * 0.002;
    }
    return Math.min(0.3, baseChance + realmBonus + vipBonus + spiritRootBonus);
  }

  // 根据权重随机选择奇遇类型
  function selectAdventureType(player) {
    const available = Object.values(ADVENTURE_TYPES).filter(
      t => player.realm_level >= t.min_realm
    );
    if (available.length === 0) return null;

    const totalWeight = available.reduce((sum, t) => sum + t.trigger_weight, 0);
    let roll = Math.random() * totalWeight;
    for (const type of available) {
      roll -= type.trigger_weight;
      if (roll <= 0) return type;
    }
    return available[0];
  }

  // 生成奇遇描述
  function generateAdventureDescription(type, player) {
    const descriptions = {
      relic_exploration: [
        `你在山间漫步时，发现了一处被藤蔓遮掩的古遗迹入口...`,
        `前方隐约可见一座倒塌的废墟，似乎隐藏着什么秘密...`,
        `一阵奇异的灵气波动引起了你的注意，似乎来自附近的洞窟深处...`
      ],
      immortal_guidance: [
        `一位白发老者突然出现在你面前，目光深邃，似乎看透了你的修为...`,
        `梦中似有仙人低语，指引你前往某处...`,
        `一位神秘的前辈高人与你擦肩而过，留下一句意味深长的话...`
      ],
      beast_attack: [
        `一声怒吼从树林深处传来，一只妖兽正向你扑来！`,
        `草丛中突然窜出一只凶猛的妖兽，眼中闪烁着饥饿的光芒...`,
        `你踏入了妖兽的领地，它正虎视眈眈地盯着你...`
      ],
      lost_treasure: [
        `你在路边发现了一个布满灰尘的宝箱，似乎是前人所留...`,
        `一处隐秘的山洞中，闪烁着微弱的光芒，似乎藏有宝物...`,
        `你在废墟中发掘出一件散发着灵光的古朴物品...`
      ]
    };
    const list = descriptions[type.id] || [`你遇到了一次奇遇：${type.name}`];
    return list[Math.floor(Math.random() * list.length)];
  }

  // 生成奇遇奖励
  function generateRewards(type, player) {
    const rewards = [];
    const possibleTypes = type.possible_rewards;
    const numRewards = type.rarity >= 4 ? 2 : (Math.random() < 0.6 ? 1 : 2);

    for (let i = 0; i < numRewards; i++) {
      const rewardTypeKey = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
      const rewardConfig = ADVENTURE_REWARDS[rewardTypeKey];
      if (!rewardConfig) continue;

      let reward = { type: rewardTypeKey };

      switch (rewardTypeKey) {
        case 'spirit_stones':
          reward.amount = Math.floor(
            rewardConfig.min + Math.random() * (rewardConfig.max - rewardConfig.min)
          ) * (1 + player.realm_level * 0.2);
          break;
        case 'beast_core':
          reward.amount = Math.floor(
            rewardConfig.min + Math.random() * (rewardConfig.max - rewardConfig.min)
          );
          break;
        case 'beast_hide':
          reward.amount = Math.floor(
            rewardConfig.min + Math.random() * (rewardConfig.max - rewardConfig.min)
          );
          break;
        case 'equipment':
        case 'rare_equipment':
          reward.rarity = rewardConfig.rarity_range
            ? rewardConfig.rarity_range[0] + Math.floor(Math.random() * (rewardConfig.rarity_range[1] - rewardConfig.rarity_range[0] + 1))
            : 1;
          reward.name = generateEquipmentName(reward.rarity);
          break;
        case 'pill':
        case 'rare_pill':
          reward.pill_type = rewardConfig.pill_types
            ? rewardConfig.pill_types[Math.floor(Math.random() * rewardConfig.pill_types.length)]
            : 'spirit';
          reward.name = generatePillName(reward.pill_type);
          break;
        case 'manual':
          reward.rarity = rewardConfig.rarity_range
            ? rewardConfig.rarity_range[0] + Math.floor(Math.random() * (rewardConfig.rarity_range[1] - rewardConfig.rarity_range[0] + 1))
            : 2;
          reward.name = generateManualName(reward.rarity);
          break;
        case 'spirit_root_boost':
          reward.bonus = rewardConfig.bonus_range
            ? rewardConfig.bonus_range[0] + Math.random() * (rewardConfig.bonus_range[1] - rewardConfig.bonus_range[0])
            : 0.1;
          break;
        case 'gongfa_exp':
          reward.amount = Math.floor(
            rewardConfig.exp_range[0] + Math.random() * (rewardConfig.exp_range[1] - rewardConfig.exp_range[0])
          );
          break;
      }
      rewards.push(reward);
    }
    return rewards;
  }

  function generateEquipmentName(rarity) {
    const prefixes = ['', '精炼', '上品', '极品', '传世', '神话'];
    const names = ['长剑', '法袍', '护腕', '战靴', '护符', '戒指'];
    return `${prefixes[rarity - 1] || ''}${names[Math.floor(Math.random() * names.length)]}`;
  }

  function generatePillName(type) {
    const pills = {
      spirit: ['灵气丹', '聚灵丹', '凝灵丹'],
      strength: ['力量丹', '蛮力丹', '破力丹'],
      defense: ['护体丹', '金刚丹', '不灭丹'],
      breakthrough: ['破境丹', '渡劫丹'],
      rebirth: ['重生丹', '还魂丹']
    };
    const list = pills[type] || ['灵气丹'];
    return list[Math.floor(Math.random() * list.length)];
  }

  function generateManualName(rarity) {
    const prefixes = ['基础', '进阶', '高级', '稀有', '传说'];
    const names = ['功法', '心法', '秘籍', '要诀'];
    return `${prefixes[rarity - 1] || '基础'}${names[Math.floor(Math.random() * names.length)]}`;
  }

  // 应用奖励到玩家
  function applyRewardsToPlayer(playerId, rewards) {
    const result = { spirit_stones: 0, items: [], messages: [] };
    for (const reward of rewards) {
      switch (reward.type) {
        case 'spirit_stones':
          db.prepare('UPDATE player SET spirit_stones = spirit_stones + ? WHERE id = ?').run(reward.amount, playerId);
          result.spirit_stones += reward.amount;
          result.messages.push(`获得灵石 x${reward.amount}`);
          break;
        case 'beast_core':
        case 'beast_hide':
          // 简单记录，不实际创建物品表
          result.messages.push(`获得${reward.type === 'beast_core' ? '妖丹' : '兽皮'} x${reward.amount}`);
          break;
        case 'equipment':
        case 'rare_equipment':
          result.items.push({ type: 'equipment', name: reward.name, rarity: reward.rarity });
          result.messages.push(`获得装备：${reward.name}`);
          break;
        case 'pill':
        case 'rare_pill':
          result.items.push({ type: 'pill', name: reward.name });
          result.messages.push(`获得丹药：${reward.name}`);
          break;
        case 'manual':
          result.items.push({ type: 'manual', name: reward.name, rarity: reward.rarity });
          result.messages.push(`获得功法：${reward.name}`);
          break;
        case 'spirit_root_boost':
          result.messages.push(`灵根潜力提升 +${(reward.bonus * 100).toFixed(1)}%`);
          break;
        case 'gongfa_exp':
          result.messages.push(`功法经验 +${reward.amount}`);
          break;
      }
    }
    return result;
  }

  // ========== API 端点 ==========

  // GET /adventure/types - 获取奇遇类型列表
  app.get('/api/adventure/types', (req, res) => {
    try {
      const { player_id } = req.query;
      let playerRealmLevel = 0;

      if (player_id) {
        const player = db.prepare('SELECT realm_level FROM player WHERE id = ?').get(player_id);
        if (player) playerRealmLevel = player.realm_level;
      }

      const types = Object.values(ADVENTURE_TYPES).map(t => ({
        id: t.id,
        name: t.name,
        icon: t.icon,
        description: t.description,
        rarity: t.rarity,
        available: playerRealmLevel >= t.min_realm,
        min_realm: t.min_realm,
        has_battle: !!t.has_battle,
        has_choice: !!t.has_choice
      }));

      res.json({ success: true, data: { types } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /adventure/current - 获取玩家当前奇遇状态
  app.get('/api/adventure/current', (req, res) => {
    try {
      const { player_id } = req.query;
      if (!player_id) return res.status(400).json({ success: false, error: '缺少 player_id' });

      // 获取玩家
      let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
      let actualPlayerId = player_id;
      if (!player) {
        const result = db.prepare(
          'INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)'
        ).run(`player_${player_id}`, 10000, 1, 0);
        actualPlayerId = result.lastInsertRowid;
        player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
      }

      // 查找当前激活的奇遇
      const currentAdventure = db.prepare(`
        SELECT * FROM player_adventures
        WHERE player_id = ? AND status = 'active'
        ORDER BY triggered_at DESC LIMIT 1
      `).get(actualPlayerId);

      if (!currentAdventure) {
        return res.json({
          success: true,
          data: {
            has_adventure: false,
            message: '红尘偶遇，静待机缘',
            next_trigger_chance: calculateTriggerChance(player)
          }
        });
      }

      const adventureType = ADVENTURE_TYPES[currentAdventure.adventure_type];
      const result = currentAdventure.result ? JSON.parse(currentAdventure.result) : null;
      const rewards = currentAdventure.rewards ? JSON.parse(currentAdventure.rewards) : null;

      res.json({
        success: true,
        data: {
          has_adventure: true,
          adventure: {
            id: currentAdventure.id,
            type: currentAdventure.adventure_type,
            type_name: adventureType?.name || currentAdventure.adventure_type,
            type_icon: adventureType?.icon || '❓',
            description: currentAdventure.description || (currentAdventure.choice_made ? null : generateAdventureDescription(adventureType, player)),
            status: currentAdventure.status,
            triggered_at: currentAdventure.triggered_at,
            has_battle: !!adventureType?.has_battle,
            has_choice: !!adventureType?.has_choice,
            choices: adventureType?.has_choice ? Object.values(LOST_TREASURE_CHOICES).map(c => ({
              id: c.id,
              name: c.name,
              description: c.description,
              success_rate: c.success_rate
            })) : null,
            result,
            rewards,
            rewards_claimed: !!currentAdventure.rewards_claimed
          }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /adventure/trigger - 触发随机奇遇
  app.post('/api/adventure/trigger', (req, res) => {
    try {
      const { player_id, force } = req.body;
      if (!player_id) return res.status(400).json({ success: false, error: '缺少 player_id' });

      // 获取玩家
      let player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
      let actualPlayerId = player_id;
      if (!player) {
        const result = db.prepare(
          'INSERT INTO player (username, spirit_stones, level, realm_level) VALUES (?, ?, ?, ?)'
        ).run(`player_${player_id}`, 10000, 1, 0);
        actualPlayerId = result.lastInsertRowid;
        player = db.prepare('SELECT * FROM player WHERE id = ?').get(actualPlayerId);
      }

      // 检查是否已有激活的奇遇
      const existingAdventure = db.prepare(`
        SELECT * FROM player_adventures WHERE player_id = ? AND status = 'active'
      `).get(actualPlayerId);
      if (existingAdventure) {
        return res.status(400).json({
          success: false,
          error: '当前已有奇遇在进行中，请先处理完成'
        });
      }

      // 非强制触发时，按概率判定
      if (!force) {
        const chance = calculateTriggerChance(player);
        const roll = Math.random();
        if (roll > chance) {
          return res.json({
            success: true,
            triggered: false,
            message: '此次未遇到奇遇机缘，继续修炼吧...',
            chance,
            roll
          });
        }
      }

      // 选择奇遇类型
      const adventureType = selectAdventureType(player);
      if (!adventureType) {
        return res.status(400).json({ success: false, error: '当前境界无可用奇遇' });
      }

      // 生成描述和奖励预览
      const description = generateAdventureDescription(adventureType, player);
      const rewardsPreview = generateRewards(adventureType, player);

      // 创建奇遇记录
      const result = db.prepare(`
        INSERT INTO player_adventures (player_id, adventure_type, status, description, rewards)
        VALUES (?, ?, 'active', ?, ?)
      `).run(
        actualPlayerId,
        adventureType.id,
        description,
        JSON.stringify(rewardsPreview)
      );

      Logger.info(`[奇遇] 玩家${player.username}触发奇遇：${adventureType.name}`);

      res.json({
        success: true,
        triggered: true,
        adventure: {
          id: result.lastInsertRowid,
          type: adventureType.id,
          type_name: adventureType.name,
          type_icon: adventureType.icon,
          description,
          status: 'active',
          has_battle: !!adventureType.has_battle,
          has_choice: !!adventureType.has_choice,
          choices: adventureType.has_choice
            ? Object.values(LOST_TREASURE_CHOICES).map(c => ({
                id: c.id,
                name: c.name,
                description: c.description,
                success_rate: c.success_rate
              }))
            : null,
          rewards_preview: rewardsPreview.map(r => ({
            type: r.type,
            name: r.name || r.amount,
            description: r.type === 'spirit_stones' ? `灵石 x${r.amount}` : r.name || r.type
          }))
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /adventure/choice - 玩家做出选择
  app.post('/api/adventure/choice', (req, res) => {
    try {
      const { player_id, adventure_id, choice_id } = req.body;
      if (!player_id || !adventure_id || !choice_id) {
        return res.status(400).json({ success: false, error: '缺少必要参数' });
      }

      // 获取奇遇记录
      const adventure = db.prepare('SELECT * FROM player_adventures WHERE id = ? AND player_id = ?').get(adventure_id, player_id);
      if (!adventure) {
        return res.status(404).json({ success: false, error: '奇遇不存在' });
      }
      if (adventure.status !== 'active') {
        return res.status(400).json({ success: false, error: '奇遇已处理' });
      }
      if (adventure.adventure_type !== 'lost_treasure') {
        return res.status(400).json({ success: false, error: '该奇遇无需选择' });
      }

      const choice = LOST_TREASURE_CHOICES[choice_id];
      if (!choice) {
        return res.status(400).json({ success: false, error: '无效的选择' });
      }

      // 判定选择结果
      const roll = Math.random();
      const success = roll < choice.success_rate;
      const rewards = JSON.parse(adventure.rewards || '[]');
      let finalRewards = rewards;
      let failurePenalty = null;
      let bonusResult = null;

      if (success) {
        // 成功：根据 multiplier 计算实际奖励
        finalRewards = rewards.map(r => ({
          ...r,
          amount: r.amount ? Math.floor(r.amount * choice.rewards_multiplier) : r.amount,
          bonus: choice.bonus?.value || 0
        }));
      } else {
        // 失败：应用惩罚
        if (choice.failure_penalty) {
          if (choice.failure_penalty.type === 'damage') {
            const player = db.prepare('SELECT * FROM player WHERE id = ?').get(player_id);
            const maxHp = 1000 + player.level * 100;
            const damage = Math.floor(maxHp * choice.failure_penalty.value);
            failurePenalty = { type: 'damage', damage };
            db.prepare('UPDATE player SET spirit_stones = MAX(0, spirit_stones - ?) WHERE id = ?').run(
              Math.floor(player.spirit_stones * choice.failure_penalty.value),
              player_id
            );
          }
        }
        // 失败时奖励减半
        finalRewards = rewards.map(r => ({
          ...r,
          amount: r.amount ? Math.floor(r.amount * 0.3) : r.amount
        }));
      }

      // 额外奖励（无私奉献）
      if (choice.bonus && success) {
        bonusResult = { type: choice.bonus.type, value: choice.bonus.value };
        finalRewards.push({ type: 'reputation', amount: choice.bonus.value });
      }

      // 更新奇遇记录
      const resultData = {
        choice: choice_id,
        success,
        rewards: finalRewards,
        failure_penalty: failurePenalty,
        bonus: bonusResult,
        roll
      };

      db.prepare(`
        UPDATE player_adventures
        SET choice_made = ?, result = ?, status = 'completed', completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(choice_id, JSON.stringify(resultData), adventure_id);

      // 应用奖励
      const rewardResult = applyRewardsToPlayer(player_id, finalRewards);

      res.json({
        success: true,
        data: {
          choice: choice_id,
          choice_name: choice.name,
          success,
          roll,
          rewards: finalRewards,
          reward_details: rewardResult,
          failure_penalty: failurePenalty,
          bonus: bonusResult
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /adventure/rewards - 获取奇遇奖励预览
  app.get('/api/adventure/rewards', (req, res) => {
    try {
      const { player_id } = req.query;
      if (!player_id) return res.status(400).json({ success: false, error: '缺少 player_id' });

      // 获取玩家当前奇遇
      const adventure = db.prepare(`
        SELECT * FROM player_adventures WHERE player_id = ? AND status IN ('active', 'completed')
        ORDER BY triggered_at DESC LIMIT 1
      `).get(player_id);

      if (!adventure) {
        return res.json({ success: true, data: { has_adventure: false } });
      }

      const rewards = adventure.rewards ? JSON.parse(adventure.rewards) : [];
      const result = adventure.result ? JSON.parse(adventure.result) : null;
      const claimed = !!adventure.rewards_claimed;

      res.json({
        success: true,
        data: {
          has_adventure: true,
          adventure_id: adventure.id,
          type: adventure.adventure_type,
          status: adventure.status,
          rewards,
          result,
          claimed,
          claimable: adventure.status === 'completed' && !claimed
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /adventure/history - 获取奇遇历史记录
  app.get('/api/adventure/history', (req, res) => {
    try {
      const { player_id, page = 1, limit = 20 } = req.query;
      if (!player_id) return res.status(400).json({ success: false, error: '缺少 player_id' });

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const history = db.prepare(`
        SELECT * FROM player_adventures
        WHERE player_id = ?
        ORDER BY triggered_at DESC
        LIMIT ? OFFSET ?
      `).all(player_id, parseInt(limit), offset);

      const total = db.prepare(`
        SELECT COUNT(*) as count FROM player_adventures WHERE player_id = ?
      `).get(player_id);

      const items = history.map(h => {
        const adventureType = ADVENTURE_TYPES[h.adventure_type];
        const result = h.result ? JSON.parse(h.result) : null;
        const rewards = h.rewards ? JSON.parse(h.rewards) : [];
        return {
          id: h.id,
          type: h.adventure_type,
          type_name: adventureType?.name || h.adventure_type,
          type_icon: adventureType?.icon || '❓',
          status: h.status,
          triggered_at: h.triggered_at,
          completed_at: h.completed_at,
          rewards_claimed: !!h.rewards_claimed,
          rewards_summary: rewards.map(r =>
            r.type === 'spirit_stones' ? `灵石x${r.amount}` : r.name || r.type
          ),
          result: result ? {
            success: result.success,
            choice: result.choice,
            bonus: result.bonus
          } : null
        };
      });

      res.json({
        success: true,
        data: {
          history: items,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total.count,
            total_pages: Math.ceil(total.count / parseInt(limit))
          }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /adventure/claim - 领取奇遇奖励
  app.post('/api/adventure/claim', (req, res) => {
    try {
      const { player_id, adventure_id } = req.body;
      if (!player_id) return res.status(400).json({ success: false, error: '缺少 player_id' });

      // 获取奇遇记录
      let adventure;
      if (adventure_id) {
        adventure = db.prepare('SELECT * FROM player_adventures WHERE id = ? AND player_id = ?').get(adventure_id, player_id);
      } else {
        // 获取最新的已完成奇遇
        adventure = db.prepare(`
          SELECT * FROM player_adventures
          WHERE player_id = ? AND status = 'completed' AND rewards_claimed = 0
          ORDER BY completed_at DESC LIMIT 1
        `).get(player_id);
      }

      if (!adventure) {
        return res.status(404).json({ success: false, error: '没有可领取的奇遇奖励' });
      }
      if (adventure.rewards_claimed) {
        return res.status(400).json({ success: false, error: '奖励已领取' });
      }
      if (adventure.status !== 'completed') {
        return res.status(400).json({ success: false, error: '奇遇尚未完成' });
      }

      const result = adventure.result ? JSON.parse(adventure.result) : null;
      const rewards = result?.rewards || (adventure.rewards ? JSON.parse(adventure.rewards) : []);

      // 应用奖励
      const rewardResult = applyRewardsToPlayer(player_id, rewards);

      // 标记已领取
      db.prepare(`
        UPDATE player_adventures SET rewards_claimed = 1 WHERE id = ?
      `).run(adventure.id);

      // 获取更新后的玩家数据
      const player = db.prepare('SELECT spirit_stones FROM player WHERE id = ?').get(player_id);

      res.json({
        success: true,
        message: '奖励领取成功！',
        data: {
          adventure_id: adventure.id,
          rewards: rewardResult.messages,
          total_spirit_stones: rewardResult.spirit_stones,
          current_spirit_stones: player?.spirit_stones || 0
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  Logger.info('✅ 奇遇系统路由已加载');
};
