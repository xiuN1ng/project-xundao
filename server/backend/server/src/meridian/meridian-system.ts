// 经脉系统 - 修炼体系核心组件

export interface Meridian {
  meridianId: string
  name: string
  nameCN: string
  type: 'primary' | 'secondary' | 'extra'
  order: number
  maxLevel: number
  unlockLevel: number
  nodes: MeridianNode[]
  bonuses: MeridianBonus[]
}

export interface MeridianNode {
  nodeId: string
  name: string
  nameCN: string
  order: number
  levelRequired: number
  spiritCost: number // 激活所需灵气
  attributes: {
    hp?: number
    attack?: number
    defense?: number
    crit?: number
    critDamage?: number
    dodge?: number
    hit?: number
  }
  nextNodeId?: string // 前置节点
}

export interface MeridianBonus {
  type: 'set' | 'breakthrough' | 'full_activation'
  condition: number // 激活数量要求
  description: string
  bonus: {
    hp?: number
    attack?: number
    defense?: number
    crit?: number
    critDamage?: number
    allAttributes?: number
  }
}

export interface PlayerMeridianData {
  playerId: string
  activatedNodes: string[] // 已激活的节点ID
  meridianLevels: Map<string, number> // 各经脉等级
  totalPoints: number // 总经脉点数
  usedPoints: number // 已使用点数
  lastUpdateTime: number
}

// 经脉配置
export const MERIDIANS: Meridian[] = [
  // 主经脉 - 任脉
  {
    meridianId: 'ren',
    name: 'Ren Meridian',
    nameCN: '任脉',
    type: 'primary',
    order: 1,
    maxLevel: 100,
    unlockLevel: 1,
    nodes: [
      { nodeId: 'ren_1', name: '承浆', nameCN: '承浆穴', order: 1, levelRequired: 1, spiritCost: 100, attributes: { hp: 50 } },
      { nodeId: 'ren_2', name: '廉泉', nameCN: '廉泉穴', order: 2, levelRequired: 5, spiritCost: 200, attributes: { hp: 100, attack: 10 }, nextNodeId: 'ren_1' },
      { nodeId: 'ren_3', name: '天突', nameCN: '天突穴', order: 3, levelRequired: 10, spiritCost: 400, attributes: { hp: 150, attack: 20 }, nextNodeId: 'ren_2' },
      { nodeId: 'ren_4', name: '璇玑', nameCN: '璇玑穴', order: 4, levelRequired: 15, spiritCost: 600, attributes: { hp: 200, defense: 15 }, nextNodeId: 'ren_3' },
      { nodeId: 'ren_5', name: '华盖', nameCN: '华盖穴', order: 5, levelRequired: 20, spiritCost: 800, attributes: { hp: 250, attack: 30, defense: 20 }, nextNodeId: 'ren_4' },
      { nodeId: 'ren_6', name: '紫宫', nameCN: '紫宫穴', order: 6, levelRequired: 25, spiritCost: 1000, attributes: { hp: 300, attack: 40, crit: 1 }, nextNodeId: 'ren_5' },
      { nodeId: 'ren_7', name: '玉堂', nameCN: '玉堂穴', order: 7, levelRequired: 30, spiritCost: 1200, attributes: { hp: 350, attack: 50, defense: 30 }, nextNodeId: 'ren_6' },
      { nodeId: 'ren_8', name: '中庭', nameCN: '中庭穴', order: 8, levelRequired: 35, spiritCost: 1500, attributes: { hp: 400, attack: 60, crit: 2 }, nextNodeId: 'ren_7' },
      { nodeId: 'ren_9', name: '膻中', nameCN: '膻中穴', order: 9, levelRequired: 40, spiritCost: 1800, attributes: { hp: 500, attack: 70, defense: 40, crit: 2 }, nextNodeId: 'ren_8' },
      { nodeId: 'ren_10', name: '中脘', nameCN: '中脘穴', order: 10, levelRequired: 45, spiritCost: 2000, attributes: { hp: 600, attack: 80, defense: 50, critDamage: 5 }, nextNodeId: 'ren_9' }
    ],
    bonuses: [
      { type: 'set', condition: 5, description: '任脉小成: 生命+500', bonus: { hp: 500 } },
      { type: 'set', condition: 10, description: '任脉大成: 生命+1000, 攻击+100', bonus: { hp: 1000, attack: 100 } }
    ]
  },
  // 主经脉 - 督脉
  {
    meridianId: 'du',
    name: 'Du Meridian',
    nameCN: '督脉',
    type: 'primary',
    order: 2,
    maxLevel: 100,
    unlockLevel: 1,
    nodes: [
      { nodeId: 'du_1', name: '长强', nameCN: '长强穴', order: 1, levelRequired: 1, spiritCost: 100, attributes: { defense: 10 } },
      { nodeId: 'du_2', name: '腰俞', nameCN: '腰俞穴', order: 2, levelRequired: 5, spiritCost: 200, attributes: { defense: 20, hp: 50 }, nextNodeId: 'du_1' },
      { nodeId: 'du_3', name: '腰阳关', nameCN: '腰阳关穴', order: 3, levelRequired: 10, spiritCost: 400, attributes: { defense: 30, hp: 100 }, nextNodeId: 'du_2' },
      { nodeId: 'du_4', name: '命门', nameCN: '命门穴', order: 4, levelRequired: 15, spiritCost: 600, attributes: { defense: 40, attack: 15 }, nextNodeId: 'du_3' },
      { nodeId: 'du_5', name: '悬枢', nameCN: '悬枢穴', order: 5, levelRequired: 20, spiritCost: 800, attributes: { defense: 50, attack: 20, hp: 150 }, nextNodeId: 'du_4' },
      { nodeId: 'du_6', name: '脊中', nameCN: '脊中穴', order: 6, levelRequired: 25, spiritCost: 1000, attributes: { defense: 60, attack: 30, hp: 200 }, nextNodeId: 'du_5' },
      { nodeId: 'du_7', name: '中枢', nameCN: '中枢穴', order: 7, levelRequired: 30, spiritCost: 1200, attributes: { defense: 70, attack: 40, dodge: 1 }, nextNodeId: 'du_6' },
      { nodeId: 'du_8', name: '筋缩', nameCN: '筋缩穴', order: 8, levelRequired: 35, spiritCost: 1500, attributes: { defense: 80, attack: 50, hp: 250 }, nextNodeId: 'du_7' },
      { nodeId: 'du_9', name: '至阳', nameCN: '至阳穴', order: 9, levelRequired: 40, spiritCost: 1800, attributes: { defense: 100, attack: 60, dodge: 2 }, nextNodeId: 'du_8' },
      { nodeId: 'du_10', name: '灵台', nameCN: '灵台穴', order: 10, levelRequired: 45, spiritCost: 2000, attributes: { defense: 120, attack: 70, hit: 3 }, nextNodeId: 'du_9' }
    ],
    bonuses: [
      { type: 'set', condition: 5, description: '督脉小成: 防御+200', bonus: { defense: 200 } },
      { type: 'set', condition: 10, description: '督脉大成: 防御+400, 生命+500', bonus: { defense: 400, hp: 500 } }
    ]
  },
  // 副经脉 - 带脉
  {
    meridianId: 'dai',
    name: 'Dai Meridian',
    nameCN: '带脉',
    type: 'secondary',
    order: 3,
    maxLevel: 50,
    unlockLevel: 15,
    nodes: [
      { nodeId: 'dai_1', name: '带脉穴', nameCN: '带脉穴', order: 1, levelRequired: 15, spiritCost: 500, attributes: { dodge: 2 } },
      { nodeId: 'dai_2', name: '五枢', nameCN: '五枢穴', order: 2, levelRequired: 20, spiritCost: 700, attributes: { dodge: 3, hp: 200 }, nextNodeId: 'dai_1' },
      { nodeId: 'dai_3', name: '维道', nameCN: '维道穴', order: 3, levelRequired: 25, spiritCost: 900, attributes: { dodge: 4, defense: 30 }, nextNodeId: 'dai_2' },
      { nodeId: 'dai_4', name: '居髎', nameCN: '居髎穴', order: 4, levelRequired: 30, spiritCost: 1200, attributes: { dodge: 5, attack: 30 }, nextNodeId: 'dai_3' },
      { nodeId: 'dai_5', name: '章门', nameCN: '章门穴', order: 5, levelRequired: 35, spiritCost: 1500, attributes: { dodge: 6, crit: 3 }, nextNodeId: 'dai_4' }
    ],
    bonuses: [
      { type: 'set', condition: 3, description: '带脉初通: 闪避+10', bonus: { dodge: 10 } },
      { type: 'set', condition: 5, description: '带脉畅通: 闪避+20, 暴击+5', bonus: { dodge: 20, crit: 5 } }
    ]
  },
  // 副经脉 - 冲脉
  {
    meridianId: 'chong',
    name: 'Chong Meridian',
    nameCN: '冲脉',
    type: 'secondary',
    order: 4,
    maxLevel: 50,
    unlockLevel: 20,
    nodes: [
      { nodeId: 'chong_1', name: '气穴', nameCN: '气穴穴', order: 1, levelRequired: 20, spiritCost: 600, attributes: { crit: 2 } },
      { nodeId: 'chong_2', name: '四满', nameCN: '四满穴', order: 2, levelRequired: 25, spiritCost: 800, attributes: { crit: 3, attack: 30 }, nextNodeId: 'chong_1' },
      { nodeId: 'chong_3', name: '中注', nameCN: '中注穴', order: 3, levelRequired: 30, spiritCost: 1000, attributes: { crit: 4, attack: 40 }, nextNodeId: 'chong_2' },
      { nodeId: 'chong_4', name: '肓俞', nameCN: '肓俞穴', order: 4, levelRequired: 35, spiritCost: 1300, attributes: { crit: 5, critDamage: 5 }, nextNodeId: 'chong_3' },
      { nodeId: 'chong_5', name: '商曲', nameCN: '商曲穴', order: 5, levelRequired: 40, spiritCost: 1600, attributes: { crit: 6, critDamage: 10 }, nextNodeId: 'chong_4' }
    ],
    bonuses: [
      { type: 'set', condition: 3, description: '冲脉初通: 暴击+10', bonus: { crit: 10 } },
      { type: 'set', condition: 5, description: '冲脉畅通: 暴击+15, 暴伤+20', bonus: { crit: 15, critDamage: 20 } }
    ]
  },
  // 奇经八脉 - 阴跷脉
  {
    meridianId: 'yinqiao',
    name: 'Yin Qiao Meridian',
    nameCN: '阴跷脉',
    type: 'extra',
    order: 5,
    maxLevel: 30,
    unlockLevel: 30,
    nodes: [
      { nodeId: 'yinqiao_1', name: '照海', nameCN: '照海穴', order: 1, levelRequired: 30, spiritCost: 1500, attributes: { hit: 3 } },
      { nodeId: 'yinqiao_2', name: '交信', nameCN: '交信穴', order: 2, levelRequired: 35, spiritCost: 2000, attributes: { hit: 5, attack: 50 }, nextNodeId: 'yinqiao_1' },
      { nodeId: 'yinqiao_3', name: '睛明', nameCN: '睛明穴', order: 3, levelRequired: 40, spiritCost: 2500, attributes: { hit: 8, allAttributes: 2 }, nextNodeId: 'yinqiao_2' }
    ],
    bonuses: [
      { type: 'set', condition: 3, description: '阴跷圆满: 命中+20', bonus: { hit: 20 } }
    ]
  },
  // 奇经八脉 - 阳跷脉
  {
    meridianId: 'yangqiao',
    name: 'Yang Qiao Meridian',
    nameCN: '阳跷脉',
    type: 'extra',
    order: 6,
    maxLevel: 30,
    unlockLevel: 30,
    nodes: [
      { nodeId: 'yangqiao_1', name: '申脉', nameCN: '申脉穴', order: 1, levelRequired: 30, spiritCost: 1500, attributes: { dodge: 3 } },
      { nodeId: 'yangqiao_2', name: '跗阳', nameCN: '跗阳穴', order: 2, levelRequired: 35, spiritCost: 2000, attributes: { dodge: 5, defense: 50 }, nextNodeId: 'yangqiao_1' },
      { nodeId: 'yangqiao_3', name: '风池', nameCN: '风池穴', order: 3, levelRequired: 40, spiritCost: 2500, attributes: { dodge: 8, allAttributes: 2 }, nextNodeId: 'yangqiao_2' }
    ],
    bonuses: [
      { type: 'set', condition: 3, description: '阳跷圆满: 闪避+20', bonus: { dodge: 20 } }
    ]
  }
]

export const MERIDIAN_CONFIG = {
  // 初始经脉点数 (每级获得)
  pointsPerLevel: 1,
  
  // 灵气恢复速度 (每分钟)
  spiritRegenPerMinute: 10,
  
  // 最大灵气上限
  maxSpirit: 10000,
  
  // 冲穴保护 (防止失败)
  breakthrough: {
    protectionEnabled: true,
    protectionCost: 50, // 保护道具消耗
  },
  
  // 经脉重置
  reset: {
    enabled: true,
    costType: 'item', // 'item' or 'currency'
    costItemId: 'meridian_reset_scroll',
    costAmount: 1,
    refundPercent: 0.8, // 返还80%灵气
  },
  
  // 穴位共鸣
  resonance: {
    enabled: true,
    maxResonanceBonus: 0.2, // 最多20%加成
  }
}

export class MeridianSystem {
  private playerData: Map<string, PlayerMeridianData> = new Map()
  
  // 获取玩家经脉数据
  getPlayerData(playerId: string): PlayerMeridianData {
    if (this.playerData.has(playerId)) {
      return this.playerData.get(playerId)!
    }
    
    const newData: PlayerMeridianData = {
      playerId,
      activatedNodes: [],
      meridianLevels: new Map(),
      totalPoints: 0,
      usedPoints: 0,
      lastUpdateTime: Date.now()
    }
    
    this.playerData.set(playerId, newData)
    return newData
  }
  
  // 更新经脉点数 (根据玩家等级)
  updateMeridianPoints(playerId: string, playerLevel: number): void {
    const data = this.getPlayerData(playerId)
    
    // 每级获得1点经脉点数
    const newTotalPoints = playerLevel
    
    // 只增加不减少
    if (newTotalPoints > data.totalPoints) {
      const diff = newTotalPoints - data.totalPoints
      data.totalPoints = newTotalPoints
      data.usedPoints = Math.min(data.usedPoints, data.totalPoints)
    }
  }
  
  // 获取经脉信息
  getMeridian(meridianId: string): Meridian | null {
    return MERIDIANS.find(m => m.meridianId === meridianId) || null
  }
  
  // 获取穴位信息
  getNode(nodeId: string): MeridianNode | null {
    for (const meridian of MERIDIANS) {
      const node = meridian.nodes.find(n => n.nodeId === nodeId)
      if (node) return node
    }
    return null
  }
  
  // 获取玩家可用经脉列表
  getAvailableMeridians(playerLevel: number): Meridian[] {
    return MERIDIANS.filter(m => playerLevel >= m.unlockLevel)
  }
  
  // 检查是否可以激活穴位
  canActivateNode(playerId: string, nodeId: string, currentSpirit: number): { can: boolean; reason?: string; node?: MeridianNode; meridian?: Meridian } {
    const data = this.getPlayerData(playerId)
    const node = this.getNode(nodeId)
    
    if (!node) {
      return { can: false, reason: '穴位不存在' }
    }
    
    // 检查是否已激活
    if (data.activatedNodes.includes(nodeId)) {
      return { can: false, reason: '穴位已激活' }
    }
    
    // 检查经脉等级
    const meridian = MERIDIANS.find(m => m.nodes.some(n => n.nodeId === nodeId))
    if (!meridian) {
      return { can: false, reason: '经脉不存在' }
    }
    
    const meridianLevel = data.meridianLevels.get(meridian.meridianId) || 0
    if (meridianLevel < node.levelRequired) {
      return { can: false, reason: `需要经脉等级${node.levelRequired}` }
    }
    
    // 检查经脉点数
    const availablePoints = data.totalPoints - data.usedPoints
    if (availablePoints < 1) {
      return { can: false, reason: '经脉点数不足' }
    }
    
    // 检查灵气
    if (currentSpirit < node.spiritCost) {
      return { can: false, reason: `灵气不足，需要${node.spiritCost}点` }
    }
    
    // 检查前置穴位
    if (node.nextNodeId && !data.activatedNodes.includes(node.nextNodeId)) {
      return { can: false, reason: '需要先激活前置穴位' }
    }
    
    return { can: true, node, meridian }
  }
  
  // 激活穴位
  activateNode(playerId: string, nodeId: string, currentSpirit: number): {
    success: boolean
    newSpirit: number
    attributes: Record<string, number>
    bonuses: string[]
    message: string
  } {
    const check = this.canActivateNode(playerId, nodeId, currentSpirit)
    if (!check.can) {
      return { success: false, newSpirit: currentSpirit, attributes: {}, bonuses: [], message: check.reason || '无法激活' }
    }
    
    const data = this.getPlayerData(playerId)
    const node = check.node!
    
    // 消耗灵气
    const newSpirit = currentSpirit - node.spiritCost
    
    // 激活穴位
    data.activatedNodes.push(nodeId)
    data.usedPoints++
    
    // 计算属性
    const attributes = this.calculateAttributes(playerId)
    
    // 检查激活bonus
    const bonuses = this.checkBonuses(data)
    
    return {
      success: true,
      newSpirit,
      attributes,
      bonuses,
      message: `成功激活${node.nameCN}, 消耗${node.spiritCost}点灵气`
    }
  }
  
  // 升级经脉
  upgradeMeridian(playerId: string, meridianId: string): {
    success: boolean
    newLevel: number
    message: string
  } {
    const data = this.getPlayerData(playerId)
    const meridian = this.getMeridian(meridianId)
    
    if (!meridian) {
      return { success: false, newLevel: 0, message: '经脉不存在' }
    }
    
    const currentLevel = data.meridianLevels.get(meridianId) || 0
    
    if (currentLevel >= meridian.maxLevel) {
      return { success: false, newLevel: currentLevel, message: '经脉已达最大等级' }
    }
    
    // 升级消耗 (简化计算)
    const cost = (currentLevel + 1) * 100
    
    // 检查经脉点数
    const availablePoints = data.totalPoints - data.usedPoints
    if (availablePoints < cost) {
      return { success: false, newLevel: currentLevel, message: '经脉点数不足' }
    }
    
    data.meridianLevels.set(meridianId, currentLevel + 1)
    data.usedPoints += cost
    
    return {
      success: true,
      newLevel: currentLevel + 1,
      message: `${meridian.nameCN}升级到${currentLevel + 1}级`
    }
  }
  
  // 计算玩家总属性
  calculateAttributes(playerId: string): Record<string, number> {
    const data = this.getPlayerData(playerId)
    const attributes: Record<string, number> = {
      hp: 0,
      attack: 0,
      defense: 0,
      crit: 0,
      critDamage: 0,
      dodge: 0,
      hit: 0
    }
    
    // 遍历所有已激活的穴位
    for (const nodeId of data.activatedNodes) {
      const node = this.getNode(nodeId)
      if (node) {
        for (const [key, value] of Object.entries(node.attributes)) {
          if (value) {
            attributes[key] = (attributes[key] || 0) + value
          }
        }
      }
    }
    
    // 计算套装加成
    for (const meridian of MERIDIANS) {
      const activatedCount = data.activatedNodes.filter(id => 
        meridian.nodes.some(n => n.nodeId === id)
      ).length
      
      for (const bonus of meridian.bonuses) {
        if (bonus.type === 'set' && activatedCount >= bonus.condition) {
          for (const [key, value] of Object.entries(bonus.bonus)) {
            if (value) {
              attributes[key] = (attributes[key] || 0) + value
            }
          }
        }
      }
    }
    
    return attributes
  }
  
  // 检查激活的套装加成
  checkBonuses(data: PlayerMeridianData): string[] {
    const bonuses: string[] = []
    
    for (const meridian of MERIDIANS) {
      const activatedCount = data.activatedNodes.filter(id => 
        meridian.nodes.some(n => n.nodeId === id)
      ).length
      
      for (const bonus of meridian.bonuses) {
        if (bonus.type === 'set' && activatedCount >= bonus.condition) {
          bonuses.push(bonus.description)
        }
      }
    }
    
    return bonuses
  }
  
  // 重置经脉
  resetMeridian(playerId: string, resetItemCount: number): {
    success: boolean
    refundSpirit: number
    message: string
  } {
    const data = this.getPlayerData(playerId)
    
    if (resetItemCount < 1) {
      return { success: false, refundSpirit: 0, message: '需要重置卷轴' }
    }
    
    // 计算返还灵气
    let refundSpirit = 0
    for (const nodeId of data.activatedNodes) {
      const node = this.getNode(nodeId)
      if (node) {
        refundSpirit += Math.floor(node.spiritCost * MERIDIAN_CONFIG.reset.refundPercent)
      }
    }
    
    // 清空数据
    data.activatedNodes = []
    data.meridianLevels = new Map()
    data.usedPoints = 0
    
    return {
      success: true,
      refundSpirit,
      message: `经脉已重置，返还${refundSpirit}点灵气`
    }
  }
  
  // 获取经脉进度
  getProgress(playerId: string): {
    totalNodes: number
    activatedNodes: number
    meridians: { id: string; name: string; level: number; progress: number }[]
    bonuses: string[]
  } {
    const data = this.getPlayerData(playerId)
    
    let totalNodes = 0
    for (const meridian of MERIDIANS) {
      totalNodes += meridian.nodes.length
    }
    
    const meridianProgress = MERIDIANS.map(m => ({
      id: m.meridianId,
      name: m.nameCN,
      level: data.meridianLevels.get(m.meridianId) || 0,
      progress: data.activatedNodes.filter(id => 
        m.nodes.some(n => n.nodeId === id)
      ).length / m.nodes.length * 100
    }))
    
    return {
      totalNodes,
      activatedNodes: data.activatedNodes.length,
      meridians: meridianProgress,
      bonuses: this.checkBonuses(data)
    }
  }
}

export const meridianSystem = new MeridianSystem()
