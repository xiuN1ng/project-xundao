/**
 * 天道轮回·命格系统 API
 * Destiny System - 命格抽取/装备/升级
 */

const express = require('express');
const router = express.Router();
const { DestinyStorage, DESTINY_SHARDS, DESTINY_CATEGORIES, DESTINY_SKILLS, RARITY, EQUIP_SLOTS, SUIT_EFFECTS, SHOP_ITEMS, UPGRADE_EXP, doGacha } = require('../services/destiny_storage');

let storage = null;

function getStorage(db) {
  if (!storage) {
    storage = new DestinyStorage(db);
  }
  return storage;
}

// 初始化存储（从server.js传入db）
let _db = null;
router.init = function(db) {
  _db = db;
  storage = new DestinyStorage(db);
};

// ============ 核心API ============

// GET /api/destiny/status - 获取命格系统状态
router.get('/status', (req, res) => {
  try {
    const player_id = parseInt(req.query.player_id);
    if (!player_id) return res.status(400).json({ success: false, error: '缺少玩家ID' });

    const s = getStorage(_db || req.db);
    const destiny = s.getPlayerDestiny(player_id);
    const equipped = s.getEquippedDestiny(player_id);
    const meta = s.getMeta(player_id);
    const bonus = s.calculateTotalBonus(player_id);

    // 统计各稀有度数量
    const rarityCount = {};
    for (const d of destiny) {
      rarityCount[d.rarity] = (rarityCount[d.rarity] || 0) + 1;
    }

    // 装备详情
    const equippedDetail = equipped.map(d => {
      const shard = DESTINY_SHARDS.find(s => s.id === d.shard_id);
      const rarityConfig = RARITY[d.rarity];
      const levelMult = 1 + (d.level - 1) * 0.1;
      const attrs = {};
      if (shard) {
        for (const [attr, val] of Object.entries(shard.base_attrs)) {
          attrs[attr] = Math.floor(val * rarityConfig.upgrade_multiplier * levelMult);
        }
      }
      const skills = (shard && shard.skills) ? shard.skills.map(sid => DESTINY_SKILLS[sid] || { name: sid, desc: '' }) : [];
      const nextLevelExp = UPGRADE_EXP[d.level + 1] || UPGRADE_EXP[15];
      return { ...d, shard, rarity_config: rarityConfig, attrs, skills, next_level_exp: nextLevelExp };
    });

    // 套装效果状态
    const categoryCount = {};
    for (const d of equipped) {
      categoryCount[d.category] = (categoryCount[d.category] || 0) + 1;
    }
    const activeSuitEffects = [];
    for (const [cat, count] of Object.entries(categoryCount)) {
      if (SUIT_EFFECTS[cat]) {
        if (count >= 2) activeSuitEffects.push({ category: cat, tier: 2, ...SUIT_EFFECTS[cat][2] });
        if (count >= 4) activeSuitEffects.push({ category: cat, tier: 4, ...SUIT_EFFECTS[cat][4] });
      }
    }

    // 仓库列表 (背包中的命格)
    const warehouse = destiny.filter(d => d.equipped_slot < 0).map(d => {
      const shard = DESTINY_SHARDS.find(s => s.id === d.shard_id);
      return { ...d, shard, rarity_config: RARITY[d.rarity] };
    });

    res.json({
      success: true,
      data: {
        meta,
        total_count: destiny.length,
        equipped_count: equipped.length,
        rarity_count: rarityCount,
        equipped: equippedDetail,
        warehouse,
        bonus,
        active_suit_effects: activeSuitEffects,
        shop_items: SHOP_ITEMS,
        gacha_rates: GACHA_RATES,
        equip_slots: EQUIP_SLOTS
      }
    });
  } catch (error) {
    console.error('destiny/status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/destiny/list - 获取所有命格碎片配置
router.get('/list', (req, res) => {
  try {
    const player_id = parseInt(req.query.player_id);
    const s = getStorage(_db || req.db);
    const owned = player_id ? s.getPlayerDestiny(player_id) : [];
    const ownedIds = owned.map(d => d.shard_id);

    const shards = DESTINY_SHARDS.map(shard => ({
      ...shard,
      rarity_config: RARITY[shard.rarity],
      category_config: DESTINY_CATEGORIES[shard.category],
      owned_count: ownedIds.filter(id => id === shard.id).length
    }));

    res.json({ success: true, data: shards, categories: DESTINY_CATEGORIES });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/destiny/draw - 抽奖抽取命格
router.post('/draw', (req, res) => {
  try {
    const player_id = parseInt(req.body.player_id);
    const count = Math.min(parseInt(req.body.count) || 1, 10); // 最多10连抽
    
    if (!player_id) return res.status(400).json({ success: false, error: '缺少玩家ID' });

    const s = getStorage(_db || req.db);
    const meta = s.getMeta(player_id);

    // 免费抽取判断 (每天一次免费单抽)
    const today = new Date().toISOString().split('T')[0];
    const isFreeDraw = meta.today_date !== today && count === 1 && meta.today_draw_count === 0;
    
    // 检查保底 (每100抽必出SSR)
    const guaranteedSSR = (meta.total_draws % 100 === 99) && count > 1;
    const guaranteedSR = (meta.total_draws % 10 === 9) && count === 1;

    const results = doGacha(count, guaranteedSR || guaranteedSSR);

    // 写入数据库
    const addedDestiny = [];
    for (const r of results) {
      const d = s.addDestiny(player_id, r.id, r.uid);
      if (d) {
        const shard = DESTINY_SHARDS.find(s => s.id === r.id);
        addedDestiny.push({ ...d, shard, rarity_config: RARITY[d.rarity] });
      }
    }

    // 更新抽取次数
    s.incrementDraws(player_id, count);
    if (isFreeDraw) {
      s.updateMeta(player_id, { today_draw_count: 1 });
    }

    res.json({
      success: true,
      data: {
        results: addedDestiny,
        is_free: isFreeDraw,
        guaranteed_sr: guaranteedSR || guaranteedSSR,
        total_draws: meta.total_draws + count,
        count
      }
    });
  } catch (error) {
    console.error('destiny/draw error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/destiny/equip - 装备命格到槽位
router.post('/equip', (req, res) => {
  try {
    const { player_id, uid, slot } = req.body;
    if (!player_id || !uid || slot === undefined) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const s = getStorage(_db || req.db);
    const destiny = s.getDestinyByUid(player_id, uid);
    if (!destiny) return res.status(404).json({ success: false, error: '命格不存在' });

    const equipped = s.equipDestiny(player_id, uid, slot);
    const bonus = s.calculateTotalBonus(player_id);

    res.json({ success: true, data: { destiny: equipped, bonus } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/destiny/unequip - 卸下命格
router.post('/unequip', (req, res) => {
  try {
    const { player_id, uid } = req.body;
    if (!player_id || !uid) return res.status(400).json({ success: false, error: '缺少必要参数' });

    const s = getStorage(_db || req.db);
    const equipped = s.unequipDestiny(player_id, uid);
    const bonus = s.calculateTotalBonus(player_id);

    res.json({ success: true, data: { destiny: equipped, bonus } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/destiny/feed - 吞噬命格升级
router.post('/feed', (req, res) => {
  try {
    const { player_id, target_uid, feed_uids } = req.body;
    if (!player_id || !target_uid || !Array.isArray(feed_uids)) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const s = getStorage(_db || req.db);
    const result = s.feedDestiny(player_id, target_uid, feed_uids);
    
    if (!result) return res.status(404).json({ success: false, error: '命格不存在' });

    const bonus = s.calculateTotalBonus(player_id);
    const upgradedDestiny = s.getDestinyByUid(player_id, target_uid);
    const shard = DESTINY_SHARDS.find(s => s.id === upgradedDestiny.shard_id);

    res.json({
      success: true,
      data: {
        destiny: { ...upgradedDestiny, shard, rarity_config: RARITY[upgradedDestiny.rarity] },
        result,
        bonus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/destiny/lock - 锁定/解锁命格
router.post('/lock', (req, res) => {
  try {
    const { player_id, uid } = req.body;
    if (!player_id || !uid) return res.status(400).json({ success: false, error: '缺少必要参数' });

    const s = getStorage(_db || req.db);
    const destiny = s.toggleLock(player_id, uid);

    res.json({ success: true, data: destiny });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/destiny/sell - 出售命格
router.post('/sell', (req, res) => {
  try {
    const { player_id, uids } = req.body;
    if (!player_id || !Array.isArray(uids)) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const s = getStorage(_db || req.db);
    let totalSilver = 0;
    const sold = [];

    for (const uid of uids) {
      const d = s.getDestinyByUid(player_id, uid);
      if (!d || d.is_locked) continue;
      if (d.equipped_slot >= 0) continue;

      // 计算出售价格: 稀有度基础价 * 等级加成
      const prices = { N: 5, R: 15, SR: 50, SSR: 200, UR: 800 };
      const price = prices[d.rarity] * (1 + d.level * 0.1);
      totalSilver += Math.floor(price);

      s.db.run('DELETE FROM player_destiny WHERE player_id = ? AND uid = ?', [player_id, uid]);
      sold.push(uid);
    }

    res.json({ success: true, data: { sold_count: sold.length, total_silver: Math.floor(totalSilver) } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/destiny/shop - 获取商店
router.get('/shop', (req, res) => {
  try {
    res.json({ success: true, data: SHOP_ITEMS });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/destiny/shop/buy - 购买商店物品
router.post('/shop/buy', (req, res) => {
  try {
    const { player_id, item_id } = req.body;
    if (!player_id || !item_id) return res.status(400).json({ success: false, error: '缺少必要参数' });

    const item = SHOP_ITEMS.find(i => i.id === item_id);
    if (!item) return res.status(404).json({ success: false, error: '物品不存在' });

    const s = getStorage(_db || req.db);
    const meta = s.getMeta(player_id);

    if (meta.currency < item.price) {
      return res.json({ success: false, error: '命运币不足' });
    }

    s.updateMeta(player_id, { currency: meta.currency - item.price });

    // 给道具
    // 实际道具系统集成这里应该调用道具API, 这里简化为返回购买结果
    res.json({
      success: true,
      data: {
        item,
        remaining_currency: meta.currency - item.price
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/destiny/skills - 获取所有命格技能
router.get('/skills', (req, res) => {
  try {
    res.json({ success: true, data: DESTINY_SKILLS });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
