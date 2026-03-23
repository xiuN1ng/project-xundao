// 灵气转换系统 - 灵气与其他资源的转换

export interface SpiritConvertRecipe {
  recipeId: string
  name: string
  nameCN: string
  type: 'to_exp' | 'to_item' | 'to_currency' | 'to_attribute'
  inputSpirit: number // 输入灵气
  output: {
    type: 'exp' | 'item' | 'currency' | 'attribute'
    itemId?: string
    amount: number
    isPercent?: boolean // 是否为百分比
  }
  levelRequired: number
  cooldown: number // 冷却时间(秒)
}

export interface PlayerConvertRecord {
  playerId: string
  recipeId: string
  count: number // 今日使用次数
  lastTime: number
  dailyLimit: number
}

export interface PlayerSpiritData {
  playerId: string
  currentSpirit: number
  maxSpirit: number
  spiritRegenRate: number // 每分钟恢复
  lastRegenTime: number
  convertRecords: Map<string, PlayerConvertRecord>
}

// 灵气转换配方
export const SPIRIT_CONVERT_RECIPES: SpiritConvertRecipe[] = [
  // ========== 灵气转换为经验 ==========
  {
    recipeId: 'spirit_to_exp',
    name: 'Spirit to EXP',
    nameCN: '灵气化神',
    type: 'to_exp',
    inputSpirit: 100,
    output: { type: 'exp', amount: 1000 },
    levelRequired: 1,
    cooldown: 0
  },
  {
    recipeId: 'spirit_to_exp_2',
    name: 'Spirit to EXP II',
    nameCN: '灵气化神·中级',
    type: 'to_exp',
    inputSpirit: 500,
    output: { type: 'exp', amount: 6000 },
    levelRequired: 20,
    cooldown: 0
  },
  {
    recipeId: 'spirit_to_exp_3',
    name: 'Spirit to EXP III',
    nameCN: '灵气化神·高级',
    type: 'to_exp',
    inputSpirit: 1000,
    output: { type: 'exp', amount: 15000 },
    levelRequired: 40,
    cooldown: 0
  },
  // ========== 灵气转换为道具 ==========
  {
    recipeId: 'spirit_to_stone',
    name: 'Spirit to Spirit Stone',
    nameCN: '灵气凝石',
    type: 'to_item',
    inputSpirit: 200,
    output: { type: 'item', itemId: 'spirit_stone', amount: 1 },
    levelRequired: 10,
    cooldown: 0
  },
  {
    recipeId: 'spirit_to_crystal',
    name: 'Spirit to Crystal',
    nameCN: '灵气化晶',
    type: 'to_item',
    inputSpirit: 500,
    output: { type: 'item', itemId: 'spirit_crystal', amount: 1 },
    levelRequired: 30,
    cooldown: 0
  },
  {
    recipeId: 'spirit_to_jade',
    name: 'Spirit to Jade',
    nameCN: '灵气化玉',
    type: 'to_item',
    inputSpirit: 1000,
    output: { type: 'item', itemId: 'spirit_jade', amount: 1 },
    levelRequired: 50,
    cooldown: 0
  },
  // ========== 灵气转换为灵石 ==========
  {
    recipeId: 'spirit_to_gold',
    name: 'Spirit to Stone',
    nameCN: '灵气换灵',
    type: 'to_currency',
    inputSpirit: 50,
    output: { type: 'currency', amount: 100 },
    levelRequired: 1,
    cooldown: 0
  },
  {
    recipeId: 'spirit_to_gold_2',
    name: 'Spirit to Stone II',
    nameCN: '灵气换灵·中级',
    type: 'to_currency',
    inputSpirit: 200,
    output: { type: 'currency', amount: 500 },
    levelRequired: 25,
    cooldown: 0
  },
  {
    recipeId: 'spirit_to_gold_3',
    name: 'Spirit to Stone III',
    nameCN: '灵气换灵·高级',
    type: 'to_currency',
    inputSpirit: 500,
    output: { type: 'currency', amount: 1500 },
    levelRequired: 45,
    cooldown: 0
  },
  // ========== 灵气转换为属性 ==========
  {
    recipeId: 'spirit_to_atk',
    name: 'Spirit to Attack',
    nameCN: '灵气强化·攻击',
    type: 'to_attribute',
    inputSpirit: 300,
    output: { type: 'attribute', amount: 10, isPercent: false },
    levelRequired: 15,
    cooldown: 3600 // 1小时冷却
  },
  {
    recipeId: 'spirit_to_def',
    name: 'Spirit to Defense',
    nameCN: '灵气强化·防御',
    type: 'to_attribute',
    inputSpirit: 300,
    output: { type: 'attribute', amount: 10, isPercent: false },
    levelRequired: 15,
    cooldown: 3600
  },
  {
    recipeId: 'spirit_to_hp',
    name: 'Spirit to HP',
    nameCN: '灵气强化·生命',
    type: 'to_attribute',
    inputSpirit: 200,
    output: { type: 'attribute', amount: 100, isPercent: false },
    levelRequired: 10,
    cooldown: 3600
  }
]

export const SPIRIT_CONFIG = {
  // 初始灵气值
  initialSpirit: 1000,
  
  // 初始最大灵气
  initialMaxSpirit: 1000,
  
  // 每级最大灵气增长
  maxSpiritPerLevel: 50,
  
  // 基础灵气恢复 (每分钟)
  baseRegenPerMinute: 10,
  
  // 灵气恢复加成 (境界百分比)
  regenBonusPerRealm: 0.1,
  
  // 灵气转换为经验的效率
  expConversionRate: 10, // 1灵气 = 10经验
  
  // 每日转换上限
  dailyConvertLimit: 100,
  
  // 自动恢复开关
  autoRegen: true,
  
  // 灵气溢出处理
  overflow: {
    // 是否允许溢出
    allowOverflow: true,
    // 溢出上限百分比
    maxOverflowPercent: 0.5, // 最大可以超过上限50%
  }
}

export class SpiritConvertSystem {
  private playerData: Map<string, PlayerSpiritData> = new Map()
  
  // 获取玩家灵气数据
  getPlayerData(playerId: string): PlayerSpiritData {
    if (this.playerData.has(playerId)) {
      return this.playerData.get(playerId)!
    }
    
    const newData: PlayerSpiritData = {
      playerId,
      currentSpirit: SPIRIT_CONFIG.initialSpirit,
      maxSpirit: SPIRIT_CONFIG.initialMaxSpirit,
      spiritRegenRate: SPIRIT_CONFIG.baseRegenPerMinute,
      lastRegenTime: Date.now(),
      convertRecords: new Map()
    }
    
    this.playerData.set(playerId, newData)
    return newData
  }
  
  // 初始化玩家灵气 (首次创建角色时)
  initPlayerSpirit(playerId: string, level: number = 1): void {
    const data: PlayerSpiritData = {
      playerId,
      currentSpirit: SPIRIT_CONFIG.initialSpirit,
      maxSpirit: SPIRIT_CONFIG.initialMaxSpirit + (level * SPIRIT_CONFIG.maxSpiritPerLevel),
      spiritRegenRate: SPIRIT_CONFIG.baseRegenPerMinute,
      lastRegenTime: Date.now(),
      convertRecords: new Map()
    }
    
    this.playerData.set(playerId, data)
  }
  
  // 更新最大灵气
  updateMaxSpirit(playerId: string, level: number, realmBonus: number = 0): void {
    const data = this.getPlayerData(playerId)
    const baseMax = SPIRIT_CONFIG.initialMaxSpirit + (level * SPIRIT_CONFIG.maxSpiritPerLevel)
    data.maxSpirit = Math.floor(baseMax * (1 + realmBonus))
  }
  
  // 恢复灵气
  regenerateSpirit(playerId: string): number {
    const data = this.getPlayerData(playerId)
    
    // 如果自动恢复关闭，直接返回
    if (!SPIRIT_CONFIG.autoRegen) {
      return data.currentSpirit
    }
    
    const now = Date.now()
    const minutesPassed = (now - data.lastRegenTime) / 60000
    
    if (minutesPassed < 1) {
      return data.currentSpirit
    }
    
    const regenAmount = Math.floor(minutesPassed * data.spiritRegenRate)
    const maxOverflow = Math.floor(data.maxSpirit * SPIRIT_CONFIG.overflow.maxOverflowPercent)
    const absoluteMax = data.maxSpirit + maxOverflow
    
    data.currentSpirit = Math.min(data.currentSpirit + regenAmount, absoluteMax)
    data.lastRegenTime = now
    
    return data.currentSpirit
  }
  
  // 消耗灵气
  consumeSpirit(playerId: string, amount: number): boolean {
    const data = this.getPlayerData(playerId)
    this.regenerateSpirit(playerId)
    
    if (data.currentSpirit < amount) {
      return false
    }
    
    data.currentSpirit -= amount
    return true
  }
  
  // 添加灵气
  addSpirit(playerId: string, amount: number): number {
    const data = this.getPlayerData(playerId)
    const maxOverflow = Math.floor(data.maxSpirit * SPIRIT_CONFIG.overflow.maxOverflowPercent)
    const absoluteMax = data.maxSpirit + maxOverflow
    
    const oldSpirit = data.currentSpirit
    data.currentSpirit = Math.min(data.currentSpirit + amount, absoluteMax)
    
    return data.currentSpirit - oldSpirit
  }
  
  // 获取配方
  getRecipe(recipeId: string): SpiritConvertRecipe | null {
    return SPIRIT_CONVERT_RECIPES.find(r => r.recipeId === recipeId) || null
  }
  
  // 获取可用配方
  getAvailableRecipes(playerLevel: number): SpiritConvertRecipe[] {
    return SPIRIT_CONVERT_RECIPES.filter(r => playerLevel >= r.levelRequired)
  }
  
  // 检查是否可以转换
  canConvert(playerId: string, recipeId: string, playerLevel: number): { can: boolean; reason?: string; recipe?: SpiritConvertRecipe } {
    const data = this.getPlayerData(playerId)
    const recipe = this.getRecipe(recipeId)
    
    if (!recipe) {
      return { can: false, reason: '配方不存在' }
    }
    
    // 检查等级
    if (playerLevel < recipe.levelRequired) {
      return { can: false, reason: `需要等级${recipe.levelRequired}` }
    }
    
    // 检查灵气
    if (data.currentSpirit < recipe.inputSpirit) {
      return { can: false, reason: `灵气不足，需要${recipe.inputSpirit}点，当前${data.currentSpirit}点` }
    }
    
    // 检查冷却
    if (recipe.cooldown > 0) {
      const record = data.convertRecords.get(recipeId)
      if (record) {
        const cooldownEnd = record.lastTime + recipe.cooldown * 1000
        if (Date.now() < cooldownEnd) {
          const remaining = Math.ceil((cooldownEnd - Date.now()) / 1000)
          return { can: false, reason: `冷却中，${remaining}秒后可使用` }
        }
      }
    }
    
    // 检查每日次数
    const record = data.convertRecords.get(recipeId)
    const today = new Date().toDateString()
    const lastDate = record ? new Date(record.lastTime).toDateString() : ''
    
    if (record && today === lastDate && record.count >= SPIRIT_CONFIG.dailyConvertLimit) {
      return { can: false, reason: '今日转换次数已用完' }
    }
    
    return { can: true, recipe }
  }
  
  // 执行转换
  convert(playerId: string, recipeId: string, playerLevel: number): {
    success: boolean
    output: { type: string; itemId?: string; amount: number } | null
    remainingSpirit: number
    message: string
  } {
    const check = this.canConvert(playerId, recipeId, playerLevel)
    if (!check.can) {
      return { success: false, output: null, remainingSpirit: 0, message: check.reason || '无法转换' }
    }
    
    const data = this.getPlayerData(playerId)
    const recipe = check.recipe!
    
    // 消耗灵气
    data.currentSpirit -= recipe.inputSpirit
    
    // 更新转换记录
    const record = data.convertRecords.get(recipeId)
    const today = new Date().toDateString()
    const lastDate = record ? new Date(record.lastTime).toDateString() : ''
    
    if (record && today === lastDate) {
      record.count++
      record.lastTime = Date.now()
    } else {
      data.convertRecords.set(recipeId, {
        playerId,
        recipeId,
        count: 1,
        lastTime: Date.now(),
        dailyLimit: SPIRIT_CONFIG.dailyConvertLimit
      })
    }
    
    return {
      success: true,
      output: {
        type: recipe.output.type,
        itemId: recipe.output.itemId,
        amount: recipe.output.amount
      },
      remainingSpirit: data.currentSpirit,
      message: `转换成功，消耗${recipe.inputSpirit}点灵气，获得${recipe.output.amount}${this.getOutputUnit(recipe.output)}`
    }
  }
  
  // 获取输出单位
  getOutputUnit(output: SpiritConvertRecipe['output']): string {
    switch (output.type) {
      case 'exp': return '经验'
      case 'item': return '个'
      case 'currency': return '灵石'
      case 'attribute': return output.isPercent ? '%' : '点'
      default: return ''
    }
  }
  
  // 批量转换
  batchConvert(playerId: string, recipeId: string, times: number, playerLevel: number): {
    success: boolean
    totalOutput: number
    totalSpirit: number
    message: string
  } {
    const recipe = this.getRecipe(recipeId)
    if (!recipe) {
      return { success: false, totalOutput: 0, totalSpirit: 0, message: '配方不存在' }
    }
    
    const data = this.getPlayerData(playerId)
    const maxTimes = Math.floor(data.currentSpirit / recipe.inputSpirit)
    const actualTimes = Math.min(times, maxTimes, 10) // 每次最多10次
    
    if (actualTimes < 1) {
      return { success: false, totalOutput: 0, totalSpirit: 0, message: '灵气不足' }
    }
    
    const totalSpirit = recipe.inputSpirit * actualTimes
    data.currentSpirit -= totalSpirit
    
    // 更新记录
    const record = data.convertRecords.get(recipeId)
    const today = new Date().toDateString()
    const lastDate = record ? new Date(record.lastTime).toDateString() : ''
    
    if (record && today === lastDate) {
      record.count += actualTimes
      record.lastTime = Date.now()
    } else {
      data.convertRecords.set(recipeId, {
        playerId,
        recipeId,
        count: actualTimes,
        lastTime: Date.now(),
        dailyLimit: SPIRIT_CONFIG.dailyConvertLimit
      })
    }
    
    return {
      success: true,
      totalOutput: recipe.output.amount * actualTimes,
      totalSpirit,
      message: `批量转换${actualTimes}次，消耗${totalSpirit}点灵气，获得${recipe.output.amount * actualTimes}个${recipe.nameCN}`
    }
  }
  
  // 获取灵气状态
  getSpiritStatus(playerId: string): {
    currentSpirit: number
    maxSpirit: number
    regenRate: number
    canOverflow: boolean
    overflowAmount: number
  } {
    const data = this.getPlayerData(playerId)
    const maxOverflow = Math.floor(data.maxSpirit * SPIRIT_CONFIG.overflow.maxOverflowPercent)
    
    return {
      currentSpirit: data.currentSpirit,
      maxSpirit: data.maxSpirit,
      regenRate: data.spiritRegenRate,
      canOverflow: SPIRIT_CONFIG.overflow.allowOverflow,
      overflowAmount: maxOverflow
    }
  }
  
  // 获取今日转换次数
  getTodayConvertCount(playerId: string, recipeId: string): number {
    const data = this.getPlayerData(playerId)
    const record = data.convertRecords.get(recipeId)
    
    if (!record) return 0
    
    const today = new Date().toDateString()
    const lastDate = new Date(record.lastTime).toDateString()
    
    return today === lastDate ? record.count : 0
  }
  
  // 设置灵气恢复率
  setRegenRate(playerId: string, rate: number): void {
    const data = this.getPlayerData(playerId)
    data.spiritRegenRate = Math.max(0, rate)
  }
  
  // 提升境界时增加灵气恢复
  applyRealmRegenBonus(playerId: string, realmLevel: number): void {
    const data = this.getPlayerData(playerId)
    const bonus = 1 + (realmLevel * SPIRIT_CONFIG.regenBonusPerRealm)
    data.spiritRegenRate = Math.floor(SPIRIT_CONFIG.baseRegenPerMinute * bonus)
  }
}

export const spiritConvertSystem = new SpiritConvertSystem()
