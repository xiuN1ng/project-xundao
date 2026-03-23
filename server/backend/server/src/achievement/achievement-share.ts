// 成就分享系统 - Achievement Share System
// 包含：成就分享数据结构、分享到世界频道、分享奖励、分享记录

import { v4 as uuidv4 } from 'uuid'

// ============================================
// 1. 成就分享数据结构
// ============================================

/** 成就分享类型 */
export type AchievementShareType = 
  | 'first_share'      // 首次分享
  | 'daily_share'      // 每日分享
  | 'reward_share'     // 奖励分享

/** 分享平台 */
export type SharePlatform = 
  | 'feishu'           // 飞书
  | 'wechat'           // 微信
  | 'moments'          // 朋友圈
  | 'qq'               // QQ
  | 'custom'           // 自定义

/** 成就分享消息 */
export interface AchievementShareMessage {
  shareId: string                    // 分享唯一ID
  playerId: string                   // 玩家ID
  playerName: string                 // 玩家名称
  achievementId: string              // 成就ID
  achievementName: string             // 成就名称
  achievementNameCN: string          // 成就中文名
  achievementDescription: string     // 成就描述
  achievementCategory: string        // 成就分类
  shareType: AchievementShareType     // 分享类型
  platform: SharePlatform            // 分享平台
  timestamp: number                  // 分享时间戳
  isFirstShare: boolean              // 是否首次分享
  isDailyShare: boolean              // 是否当日分享
  rewards: AchievementShareRewards   // 获得的奖励
  message?: string                   // 玩家自定义消息
}

/** 成就分享奖励 */
export interface AchievementShareRewards {
  gold: number              // 金币奖励
  exp: number               // 经验奖励
  point?: number            // 成就点数
  items?: Array<{
    itemId: string
    itemNameCN: string
    count: number
  }>
}

/** 成就分享记录 */
export interface AchievementShareRecord {
  recordId: string                  // 记录ID
  shareId: string                    // 分享ID
  playerId: string                   // 玩家ID
  achievementId: string              // 成就ID
  shareTime: number                  // 分享时间
  shareType: AchievementShareType     // 分享类型
  platform: SharePlatform            // 分享平台
  rewards: AchievementShareRewards   // 奖励详情
  channelMessageId?: string         // 频道消息ID
  status: 'success' | 'failed'      // 状态
  error?: string                     // 错误信息
}

/** 玩家分享状态 */
export interface PlayerShareState {
  playerId: string
  firstShareAchievements: Set<string>     // 首次分享的成就ID集合
  dailyShareCount: number                 // 今日分享次数
  lastShareDate: string                   // 上次分享日期 (YYYY-MM-DD)
  totalShareCount: number                 // 总分享次数
  totalGoldEarned: number                 // 累计获得金币
  totalExpEarned: number                  // 累计获得经验
  totalPointsEarned: number               // 累计获得成就点
}

/** 成就分享配置 */
export interface AchievementShareConfig {
  // 是否启用成就分享
  enabled: boolean
  // 是否自动分享到世界频道
  autoShareToWorld: boolean
  // 首次分享奖励
  firstShareRewards: AchievementShareRewards
  // 每日分享奖励
  dailyShareRewards: AchievementShareRewards
  // 每日分享上限
  dailyShareLimit: number
  // 是否启用分享到其他平台
  enableCrossPlatform: boolean
  // 世界频道配置
  worldChannelConfig: {
    enabled: boolean
    channelId: string
    channelName: string
  }
}

// ============================================
// 2. 默认配置
// ============================================

/** 默认成就分享配置 */
export const DEFAULT_SHARE_CONFIG: AchievementShareConfig = {
  enabled: true,
  autoShareToWorld: true,
  firstShareRewards: {
    gold: 100,
    exp: 50,
    point: 10,
    items: []
  },
  dailyShareRewards: {
    gold: 50,
    exp: 25,
    point: 5,
    items: []
  },
  dailyShareLimit: 10,
  enableCrossPlatform: true,
  worldChannelConfig: {
    enabled: true,
    channelId: 'world',
    channelName: '世界频道'
  }
}

// ============================================
// 3. 成就分享管理器
// ============================================

/** 成就分享系统类 */
export class AchievementShareSystem {
  private config: AchievementShareConfig
  private playerShareStates: Map<string, PlayerShareState> = new Map()
  private shareRecords: Map<string, AchievementShareRecord[]> = new Map()

  constructor(config: Partial<AchievementShareConfig> = {}) {
    this.config = { ...DEFAULT_SHARE_CONFIG, ...config }
  }

  /**
   * 获取玩家分享状态
   */
  getPlayerShareState(playerId: string): PlayerShareState {
    let state = this.playerShareStates.get(playerId)
    if (!state) {
      state = {
        playerId,
        firstShareAchievements: new Set(),
        dailyShareCount: 0,
        lastShareDate: '',
        totalShareCount: 0,
        totalGoldEarned: 0,
        totalExpEarned: 0,
        totalPointsEarned: 0
      }
      this.playerShareStates.set(playerId, state)
    }
    return state
  }

  /**
   * 检查并重置每日分享计数
   */
  private checkAndResetDailyCount(playerId: string): void {
    const state = this.getPlayerShareState(playerId)
    const today = new Date().toISOString().split('T')[0]
    
    if (state.lastShareDate !== today) {
      state.dailyShareCount = 0
      state.lastShareDate = today
    }
  }

  /**
   * 检查是否可以分享
   */
  canShare(playerId: string, achievementId: string): {
    canShare: boolean
    reason?: string
    shareType?: AchievementShareType
  } {
    if (!this.config.enabled) {
      return { canShare: false, reason: '成就分享功能未启用' }
    }

    const state = this.getPlayerShareState(playerId)
    this.checkAndResetDailyCount(playerId)

    // 检查是否达到每日分享上限
    if (state.dailyShareCount >= this.config.dailyShareLimit) {
      return { canShare: false, reason: '今日分享次数已达上限' }
    }

    // 判断分享类型
    let shareType: AchievementShareType = 'daily_share'
    let isFirstShare = false
    let isDailyShare = false

    if (!state.firstShareAchievements.has(achievementId)) {
      shareType = 'first_share'
      isFirstShare = true
    } else {
      isDailyShare = true
      shareType = 'daily_share'
    }

    return { canShare: true, shareType, reason: undefined }
  }

  /**
   * 计算分享奖励
   */
  calculateRewards(shareType: AchievementShareType): AchievementShareRewards {
    if (shareType === 'first_share') {
      return { ...this.config.firstShareRewards }
    }
    return { ...this.config.dailyShareRewards }
  }

  /**
   * 执行成就分享
   */
  async share(
    playerId: string,
    playerName: string,
    achievementId: string,
    achievementName: string,
    achievementNameCN: string,
    achievementDescription: string,
    achievementCategory: string,
    platform: SharePlatform = 'custom',
    message?: string
  ): Promise<{
    success: boolean
    shareMessage?: AchievementShareMessage
    rewards?: AchievementShareRewards
    record?: AchievementShareRecord
    error?: string
  }> {
    // 检查是否可以分享
    const checkResult = this.canShare(playerId, achievementId)
    if (!checkResult.canShare || !checkResult.shareType) {
      return { success: false, error: checkResult.reason }
    }

    const shareType = checkResult.shareType
    const isFirstShare = shareType === 'first_share'
    const isDailyShare = shareType === 'daily_share'

    // 计算奖励
    const rewards = this.calculateRewards(shareType)

    // 生成分享ID
    const shareId = uuidv4()

    // 创建分享消息
    const shareMessage: AchievementShareMessage = {
      shareId,
      playerId,
      playerName,
      achievementId,
      achievementName,
      achievementNameCN,
      achievementDescription,
      achievementCategory,
      shareType,
      platform,
      timestamp: Date.now(),
      isFirstShare,
      isDailyShare,
      rewards,
      message
    }

    // 更新玩家分享状态
    const state = this.getPlayerShareState(playerId)
    this.checkAndResetDailyCount(playerId)

    if (isFirstShare) {
      state.firstShareAchievements.add(achievementId)
    }
    state.dailyShareCount++
    state.totalShareCount++
    state.totalGoldEarned += rewards.gold
    state.totalExpEarned += rewards.exp
    if (rewards.point) {
      state.totalPointsEarned += rewards.point
    }

    // 创建分享记录
    const record: AchievementShareRecord = {
      recordId: uuidv4(),
      shareId,
      playerId,
      achievementId,
      shareTime: shareMessage.timestamp,
      shareType,
      platform,
      rewards,
      status: 'success'
    }

    // 保存记录
    const records = this.shareRecords.get(playerId) || []
    records.push(record)
    this.shareRecords.set(playerId, records)

    // 如果启用自动分享到世界频道
    if (this.config.autoShareToWorld && this.config.worldChannelConfig.enabled) {
      try {
        await this.shareToWorldChannel(shareMessage)
        record.channelMessageId = 'world_channel_msg_' + shareId
      } catch (error) {
        console.error('分享到世界频道失败:', error)
        // 不影响主流程，只是记录失败
      }
    }

    return {
      success: true,
      shareMessage,
      rewards,
      record
    }
  }

  /**
   * 分享到世界频道
   */
  async shareToWorldChannel(shareMessage: AchievementShareMessage): Promise<{
    success: boolean
    messageId?: string
    error?: string
  }> {
    if (!this.config.worldChannelConfig.enabled) {
      return { success: false, error: '世界频道分享未启用' }
    }

    // 构建世界频道消息
    const worldMessage = this.buildWorldChannelMessage(shareMessage)

    try {
      // 这里调用聊天系统发送世界消息
      // 实际实现需要注入 ChatSystem
      const messageId = await this.sendWorldMessage(worldMessage)
      
      return {
        success: true,
        messageId
      }
    } catch (error) {
      console.error('发送世界频道消息失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '发送失败'
      }
    }
  }

  /**
   * 构建世界频道消息内容
   */
  private buildWorldChannelMessage(shareMessage: AchievementShareMessage): string {
    const { playerName, achievementNameCN, achievementCategory, isFirstShare } = shareMessage
    
    const categoryEmoji = this.getCategoryEmoji(achievementCategory)
    const shareTypeText = isFirstShare ? '✨ 首次分享' : '📢 成就分享'
    
    return `${shareTypeText}

🏆 恭喜 ${playerName} 达成成就！

${categoryEmoji} ${achievementNameCN}

${shareMessage.achievementDescription}

奖励: 💰${shareMessage.rewards.gold}金币 | ✨${shareMessage.rewards.exp}经验 | 🏅${shareMessage.rewards.point || 0}成就点`
  }

  /**
   * 获取分类emoji
   */
  private getCategoryEmoji(category: string): string {
    const emojiMap: Record<string, string> = {
      combat: '⚔️',
      collection: '📦',
      social: '👥',
      explore: '🗺️',
      wealth: '💎',
      special: '⭐',
      season: '🎖️'
    }
    return emojiMap[category] || '🏆'
  }

  /**
   * 发送世界消息（需要集成聊天系统）
   */
  private async sendWorldMessage(content: string): Promise<string> {
    // 这里应该调用实际的聊天系统
    // 为了解耦，这里抛出错误让外部注入实现
    throw new Error('需要注入 ChatSystem 实现 sendWorldMessage 方法')
  }

  /**
   * 获取玩家分享记录
   */
  getShareRecords(playerId: string, limit: number = 10): AchievementShareRecord[] {
    const records = this.shareRecords.get(playerId) || []
    return records.slice(-limit).reverse()
  }

  /**
   * 获取玩家今日分享次数
   */
  getTodayShareCount(playerId: string): number {
    const state = this.getPlayerShareState(playerId)
    this.checkAndResetDailyCount(playerId)
    return state.dailyShareCount
  }

  /**
   * 获取玩家总分享次数
   */
  getTotalShareCount(playerId: string): number {
    return this.getPlayerShareState(playerId).totalShareCount
  }

  /**
   * 获取玩家累计奖励
   */
  getTotalRewards(playerId: string): { gold: number; exp: number; points: number } {
    const state = this.getPlayerShareState(playerId)
    return {
      gold: state.totalGoldEarned,
      exp: state.totalExpEarned,
      points: state.totalPointsEarned
    }
  }

  /**
   * 检查成就是否已首次分享
   */
  isAchievementFirstShared(playerId: string, achievementId: string): boolean {
    const state = this.getPlayerShareState(playerId)
    return state.firstShareAchievements.has(achievementId)
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AchievementShareConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取当前配置
   */
  getConfig(): AchievementShareConfig {
    return { ...this.config }
  }
}

// ============================================
// 4. 便捷函数
// ============================================

/**
 * 创建默认成就分享系统实例
 */
export function createAchievementShareSystem(config?: Partial<AchievementShareConfig>): AchievementShareSystem {
  return new AchievementShareSystem(config)
}

/**
 * 创建成就分享消息（用于预览）
 */
export function createShareMessagePreview(
  achievementNameCN: string,
  achievementDescription: string,
  category: string,
  rewards: AchievementShareRewards
): string {
  const emojiMap: Record<string, string> = {
    combat: '⚔️',
    collection: '📦',
    social: '👥',
    explore: '🗺️',
    wealth: '💎',
    special: '⭐',
    season: '🎖️'
  }
  const emoji = emojiMap[category] || '🏆'

  return `✨ 成就分享

${emoji} ${achievementNameCN}

${achievementDescription}

奖励: 💰${rewards.gold}金币 | ✨${rewards.exp}经验 | 🏅${rewards.point || 0}成就点`
}
