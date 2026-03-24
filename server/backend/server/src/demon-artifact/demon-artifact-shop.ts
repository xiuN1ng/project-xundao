// 魔器商店系统 v1.0
// 魔器商店 - 使用魔魂购买魔器碎片和成品

import { demonArtifactSystem } from './demon-artifact-system'

// ============== 魔器商店配置 ==============

export const DEMON_SHOP_CONFIG = {
  // 商店类型
  shopTypes: {
    DEMON_SHOP: 1,     // 魔器商店
    FRAGMENT_SHOP: 2,  // 碎片商店
    FORGE_SHOP: 3,     // 铸造商店
  },

  // 刷新配置
  refresh: {
    autoRefresh: true,
    intervalMs: 6 * 60 * 60 * 1000,  // 6小时
    freeRefreshPerDay: 2,
    costPerRefresh: 100,  // 魔魂
  },

  // 限购配置
  purchaseLimits: {
    daily: 'daily',
    weekly: 'weekly',
    permanent: 'permanent',
  },
}

// ============== 魔器商店商品 ==============

export interface DemonShopGoods {
  id: string
  name: string
  nameCN: string
  type: 'artifact' | 'fragment' | 'material'
  price: number
  priceType: 'demonSoul' | 'gold'
  limit: { type: string; count: number }
  stock: number   // -1 表示无限
  quality?: string
  templateId?: string
  itemId?: string
  description: string
}

// 魔器商店商品列表
export const DEMON_SHOP_GOODS: DemonShopGoods[] = [
  // ===== 魔器商店 - 成品魔器（每周限购） =====
  { id: 'shop_da_weapon_blue', name: 'Demon Weapon (Blue)', nameCN: '蓝色魔兵', type: 'artifact', price: 1000, priceType: 'demonSoul', limit: { type: 'weekly', count: 1 }, stock: -1, quality: 'blue', templateId: 'demon_weapon_blue_1', description: '蓝色品质魔兵礼包' },
  { id: 'shop_da_armor_blue', name: 'Demon Armor (Blue)', nameCN: '蓝色魔甲', type: 'artifact', price: 1000, priceType: 'demonSoul', limit: { type: 'weekly', count: 1 }, stock: -1, quality: 'blue', templateId: 'demon_armor_blue_1', description: '蓝色品质魔甲礼包' },
  { id: 'shop_da_helmet_blue', name: 'Demon Helmet (Blue)', nameCN: '蓝色魔盔', type: 'artifact', price: 800, priceType: 'demonSoul', limit: { type: 'weekly', count: 1 }, stock: -1, quality: 'blue', templateId: 'demon_helmet_blue_1', description: '蓝色品质魔盔礼包' },
  { id: 'shop_da_boots_blue', name: 'Demon Boots (Blue)', nameCN: '蓝色魔靴', type: 'artifact', price: 800, priceType: 'demonSoul', limit: { type: 'weekly', count: 1 }, stock: -1, quality: 'blue', templateId: 'demon_boots_blue_1', description: '蓝色品质魔靴礼包' },

  { id: 'shop_da_weapon_purple', name: 'Demon Weapon (Purple)', nameCN: '紫色魔兵', type: 'artifact', price: 3000, priceType: 'demonSoul', limit: { type: 'weekly', count: 1 }, stock: -1, quality: 'purple', templateId: 'demon_weapon_purple_1', description: '紫色品质魔兵礼包' },
  { id: 'shop_da_armor_purple', name: 'Demon Armor (Purple)', nameCN: '紫色魔甲', type: 'artifact', price: 3000, priceType: 'demonSoul', limit: { type: 'weekly', count: 1 }, stock: -1, quality: 'purple', templateId: 'demon_armor_purple_1', description: '紫色品质魔甲礼包' },
  { id: 'shop_da_helmet_purple', name: 'Demon Helmet (Purple)', nameCN: '紫色魔盔', type: 'artifact', price: 2500, priceType: 'demonSoul', limit: { type: 'weekly', count: 1 }, stock: -1, quality: 'purple', templateId: 'demon_helmet_purple_1', description: '紫色品质魔盔礼包' },
  { id: 'shop_da_boots_purple', name: 'Demon Boots (Purple)', nameCN: '紫色魔靴', type: 'artifact', price: 2500, priceType: 'demonSoul', limit: { type: 'weekly', count: 1 }, stock: -1, quality: 'purple', templateId: 'demon_boots_purple_1', description: '紫色品质魔靴礼包' },

  { id: 'shop_da_weapon_orange', name: 'Demon Weapon (Orange)', nameCN: '橙色魔兵', type: 'artifact', price: 8000, priceType: 'demonSoul', limit: { type: 'permanent', count: 1 }, stock: -1, quality: 'orange', templateId: 'demon_weapon_orange_1', description: '橙色品质魔兵礼包（永久限购）' },
  { id: 'shop_da_armor_orange', name: 'Demon Armor (Orange)', nameCN: '橙色魔甲', type: 'artifact', price: 8000, priceType: 'demonSoul', limit: { type: 'permanent', count: 1 }, stock: -1, quality: 'orange', templateId: 'demon_armor_orange_1', description: '橙色品质魔甲礼包（永久限购）' },

  // ===== 碎片商店（日常大量购买） =====
  { id: 'shop_frag_1_10', name: 'Fragments 1 x10', nameCN: '1阶碎片x10', type: 'fragment', price: 50, priceType: 'demonSoul', limit: { type: 'daily', count: 20 }, stock: -1, itemId: 'demon_frag_1', description: '1阶魔器碎片x10' },
  { id: 'shop_frag_2_10', name: 'Fragments 2 x10', nameCN: '2阶碎片x10', type: 'fragment', price: 150, priceType: 'demonSoul', limit: { type: 'daily', count: 10 }, stock: -1, itemId: 'demon_frag_2', description: '2阶魔器碎片x10' },
  { id: 'shop_frag_3_10', name: 'Fragments 3 x10', nameCN: '3阶碎片x10', type: 'fragment', price: 450, priceType: 'demonSoul', limit: { type: 'daily', count: 5 }, stock: -1, itemId: 'demon_frag_3', description: '3阶魔器碎片x10' },
  { id: 'shop_frag_4_10', name: 'Fragments 4 x10', nameCN: '4阶碎片x10', type: 'fragment', price: 1350, priceType: 'demonSoul', limit: { type: 'weekly', count: 3 }, stock: -1, itemId: 'demon_frag_4', description: '4阶魔器碎片x10' },
  { id: 'shop_frag_5_10', name: 'Fragments 5 x10', nameCN: '5阶碎片x10', type: 'fragment', price: 4000, priceType: 'demonSoul', limit: { type: 'weekly', count: 2 }, stock: -1, itemId: 'demon_frag_5', description: '5阶魔器碎片x10' },
  { id: 'shop_frag_6_10', name: 'Fragments 6 x10', nameCN: '6阶碎片x10', type: 'fragment', price: 12000, priceType: 'demonSoul', limit: { type: 'permanent', count: 1 }, stock: -1, itemId: 'demon_frag_6', description: '6阶魔器碎片x10（永久限购）' },

  // ===== 铸造材料 =====
  { id: 'shop_forge_1', name: 'Forge Stone', nameCN: '铸造石', type: 'material', price: 200, priceType: 'demonSoul', limit: { type: 'daily', count: 10 }, stock: -1, description: '用于魔器铸造的材料' },
  { id: 'shop_corruption_1', name: 'Corruption Crystal', nameCN: '魔化水晶', type: 'material', price: 500, priceType: 'demonSoul', limit: { type: 'daily', count: 5 }, stock: -1, description: '用于魔器魔化的材料' },
  { id: 'shop_random_blue', name: 'Random Blue Demon Artifact', nameCN: '随机蓝色魔器', type: 'artifact', price: 1500, priceType: 'demonSoul', limit: { type: 'weekly', count: 3 }, stock: -1, quality: 'blue', description: '随机获得一件蓝色魔器' },
  { id: 'shop_random_purple', name: 'Random Purple Demon Artifact', nameCN: '随机紫色魔器', type: 'artifact', price: 4000, priceType: 'demonSoul', limit: { type: 'weekly', count: 2 }, stock: -1, quality: 'purple', description: '随机获得一件紫色魔器' },
]

// ============== 魔器商店类 ==============

interface PlayerShopState {
  playerId: string
  shopType: number
  goods: Map<string, { stock: number; purchasedCount: number }>
  lastRefreshTime: number
  freeRefreshUsed: number
  refreshCount: number
}

export class DemonArtifactShopSystem {
  private shopStates: Map<string, PlayerShopState> = new Map()
  private goodsTemplates: Map<number, DemonShopGoods[]> = new Map()

  constructor() {
    this.goodsTemplates.set(DEMON_SHOP_CONFIG.shopTypes.DEMON_SHOP,
      DEMON_SHOP_GOODS.filter(g => g.type === 'artifact'))
    this.goodsTemplates.set(DEMON_SHOP_CONFIG.shopTypes.FRAGMENT_SHOP,
      DEMON_SHOP_GOODS.filter(g => g.type === 'fragment'))
    this.goodsTemplates.set(DEMON_SHOP_CONFIG.shopTypes.FORGE_SHOP,
      DEMON_SHOP_GOODS.filter(g => g.type === 'material'))
  }

  // 打开商店
  openShop(playerId: string, shopType: number): PlayerShopState {
    const key = `${playerId}_${shopType}`
    let state = this.shopStates.get(key)

    if (!state) {
      state = {
        playerId, shopType,
        goods: new Map(),
        lastRefreshTime: Date.now(),
        freeRefreshUsed: 0,
        refreshCount: 0
      }
    }

    // 检查是否需要自动刷新
    if (Date.now() - state.lastRefreshTime >= DEMON_SHOP_CONFIG.refresh.intervalMs) {
      this.refreshShop(state)
    }

    this.shopStates.set(key, state)
    return state
  }

  // 刷新商店
  refreshShop(state: PlayerShopState): void {
    const templates = this.goodsTemplates.get(state.shopType) || []
    state.goods.clear()

    // 随机选择商品
    const shuffled = [...templates].sort(() => Math.random() - 0.5)
    const count = Math.min(state.shopType === DEMON_SHOP_CONFIG.shopTypes.DEMON_SHOP ? 6 : 8, shuffled.length)
    const selected = shuffled.slice(0, count)

    for (const goods of selected) {
      state.goods.set(goods.id, { stock: goods.stock, purchasedCount: 0 })
    }

    state.lastRefreshTime = Date.now()
    state.refreshCount++
  }

  // 手动刷新
  manualRefresh(playerId: string, shopType: number): { success: boolean; message: string; cost?: number } {
    const key = `${playerId}_${shopType}`
    const state = this.shopStates.get(key)
    if (!state) return { success: false, message: '请先打开商店' }

    let cost = 0
    if (state.freeRefreshUsed < DEMON_SHOP_CONFIG.refresh.freeRefreshPerDay) {
      state.freeRefreshUsed++
    } else {
      cost = DEMON_SHOP_CONFIG.refresh.costPerRefresh
      const res = demonArtifactSystem.getPlayerResources(playerId)
      if (res.demonSoul < cost) return { success: false, message: '魔魂不足' }
      res.demonSoul -= cost
    }

    this.refreshShop(state)
    return { success: true, message: `刷新成功${cost > 0 ? `，消耗${cost}魔魂` : '（免费）'}`, cost }
  }

  // 购买商品
  purchaseGoods(
    playerId: string,
    shopType: number,
    goodsId: string,
    quantity: number = 1
  ): { success: boolean; message: string; artifact?: ReturnType<typeof demonArtifactSystem.createArtifact>; items?: Map<string, number>; cost?: { gold?: number; demonSoul?: number } } {
    const key = `${playerId}_${shopType}`
    const state = this.shopStates.get(key)
    if (!state) return { success: false, message: '请先打开商店' }

    const template = DEMON_SHOP_GOODS.find(g => g.id === goodsId)
    if (!template) return { success: false, message: '商品不存在' }

    const stockInfo = state.goods.get(goodsId)
    if (!stockInfo) return { success: false, message: '该商品当前未上架' }

    // 检查库存
    if (stockInfo.stock !== -1 && stockInfo.stock < quantity) {
      return { success: false, message: '库存不足' }
    }

    // 检查购买限制
    const limitType = template.limit.type
    const limitCount = template.limit.count
    const today = new Date().toDateString()
    const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))

    // 简化：检查总购买次数
    if (stockInfo.purchasedCount + quantity > limitCount) {
      return { success: false, message: `已达到${limitType === 'daily' ? '每日' : limitType === 'weekly' ? '每周' : '永久'}购买上限` }
    }

    const totalPrice = template.price * quantity
    const res = demonArtifactSystem.getPlayerResources(playerId)

    if (template.priceType === 'demonSoul') {
      if (res.demonSoul < totalPrice) return { success: false, message: '魔魂不足' }
      res.demonSoul -= totalPrice
    } else {
      if (res.gold < totalPrice) return { success: false, message: '金币不足' }
      res.gold -= totalPrice
    }

    // 更新库存和购买记录
    if (stockInfo.stock !== -1) stockInfo.stock -= quantity
    stockInfo.purchasedCount += quantity

    // 发放物品
    if (template.type === 'artifact' && template.templateId) {
      const artifact = demonArtifactSystem.createArtifact(playerId, template.templateId)
      return { success: true, message: `购买成功！获得${template.nameCN}`, artifact, cost: { demonSoul: template.priceType === 'demonSoul' ? totalPrice : undefined, gold: template.priceType === 'gold' ? totalPrice : undefined } }
    } else if (template.type === 'artifact' && template.quality) {
      // 随机品质魔器
      const qualityIdx = ['green', 'blue', 'purple', 'orange', 'red', 'black'].indexOf(template.quality)
      const types = ['demon_weapon', 'demon_armor', 'demon_helmet', 'demon_boots']
      const type = types[Math.floor(Math.random() * types.length)]
      const templateId = `${type}_${template.quality}_1`
      const artifact = demonArtifactSystem.createArtifact(playerId, templateId)
      return { success: true, message: `购买成功！获得${artifact?.nameCN || '随机魔器'}`, artifact, cost: { demonSoul: template.priceType === 'demonSoul' ? totalPrice : undefined } }
    } else if (template.type === 'fragment' && template.itemId) {
      const items = new Map([[template.itemId, 10 * quantity]])
      const current = (res.fragments.get(template.itemId) || 0)
      res.fragments.set(template.itemId, current + 10 * quantity)
      return { success: true, message: `购买成功！获得${template.itemId}x${10 * quantity}`, items, cost: { demonSoul: totalPrice } }
    }

    return { success: true, message: '购买成功', cost: { demonSoul: template.priceType === 'demonSoul' ? totalPrice : undefined } }
  }

  // 获取当前商店商品
  getShopGoods(playerId: string, shopType: number): Array<{ goods: DemonShopGoods; stock: number; purchasedCount: number }> {
    const key = `${playerId}_${shopType}`
    const state = this.shopStates.get(key)
    if (!state) return []

    return DEMON_SHOP_GOODS
      .filter(g => {
        if (shopType === DEMON_SHOP_CONFIG.shopTypes.DEMON_SHOP) return g.type === 'artifact'
        if (shopType === DEMON_SHOP_CONFIG.shopTypes.FRAGMENT_SHOP) return g.type === 'fragment'
        if (shopType === DEMON_SHOP_CONFIG.shopTypes.FORGE_SHOP) return g.type === 'material'
        return true
      })
      .map(goods => {
        const info = state!.goods.get(goods.id)
        return {
          goods,
          stock: info?.stock ?? -1,
          purchasedCount: info?.purchasedCount ?? 0
        }
      })
  }

  // 合成魔器（用碎片合成）
  synthesizeArtifact(playerId: string, quality: string): { success: boolean; message: string; artifact?: ReturnType<typeof demonArtifactSystem.createArtifact> } {
    const qualityIdx = ['green', 'blue', 'purple', 'orange', 'red', 'black'].indexOf(quality)
    if (qualityIdx < 0) return { success: false, message: '无效品质' }

    // 合成所需碎片数量（按品质递增）
    const fragId = `demon_frag_${qualityIdx + 1}`
    const fragNeeded = Math.floor(30 * Math.pow(2.5, qualityIdx))
    const goldCost = Math.floor(5000 * Math.pow(3, qualityIdx))

    const res = demonArtifactSystem.getPlayerResources(playerId)
    if ((res.fragments.get(fragId) || 0) < fragNeeded) return { success: false, message: `${fragId}不足，需要${fragNeeded}个` }
    if (res.gold < goldCost) return { success: false, message: '金币不足' }

    res.fragments.set(fragId, (res.fragments.get(fragId) || 0) - fragNeeded)
    res.gold -= goldCost

    // 随机类型
    const types = ['demon_weapon', 'demon_armor', 'demon_helmet', 'demon_boots']
    const type = types[Math.floor(Math.random() * types.length)]
    const templateId = `${type}_${quality}_1`
    const artifact = demonArtifactSystem.createArtifact(playerId, templateId)

    if (!artifact) return { success: false, message: '合成失败' }
    return { success: true, message: `合成成功！获得${artifact.nameCN}`, artifact }
  }
}

export const demonArtifactShopSystem = new DemonArtifactShopSystem()
export default DemonArtifactShopSystem
