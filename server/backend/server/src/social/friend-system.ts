// 好友系统 - 好友推荐、黑名单功能

export interface Friend {
  playerId: string
  friendId: string
  friendName: string
  level: number
  power: number
  relation: 'friend' | 'stranger' | 'blocked'
  addedAt: number
  lastInteractTime: number
}

export interface FriendRequest {
  requestId: string
  fromPlayerId: string
  fromPlayerName: string
  toPlayerId: string
  message?: string
  timestamp: number
  status: 'pending' | 'accepted' | 'rejected'
}

export interface BlacklistEntry {
  playerId: string
  blockedId: string
  blockedName: string
  blockedReason?: string
  blockedAt: number
}

export interface FriendRecommendation {
  playerId: string
  playerName: string
  level: number
  power: number
  reason: 'same_realm' | 'friend_of_friend' | 'same_guild' | 'recommended'
  similarity: number  // 相似度 0-100
}

export interface FriendConfig {
  // 好友上限
  maxFriends: number
  // 好友推荐数量
  recommendationCount: number
  // 黑名单上限
  maxBlacklist: number
  // 推荐刷新间隔 (毫秒)
  recommendationRefreshInterval: number
  // 等级相近推荐阈值
  levelDiffThreshold: number
  // 推荐相似度权重
  weights: {
    level: number
    power: number
    realm: number
    guild: number
  }
}

export const FRIEND_CONFIG: FriendConfig = {
  maxFriends: 100,
  recommendationCount: 10,
  maxBlacklist: 50,
  recommendationRefreshInterval: 24 * 60 * 60 * 1000, // 24小时
  levelDiffThreshold: 10,
  weights: {
    level: 0.3,
    power: 0.3,
    realm: 0.2,
    guild: 0.2
  }
}

// 好友buff配置
export const FRIEND_BUFFS = {
  // 好友数量buff
  friends_5: { friendsRequired: 5, buff: { attack: 5, defense: 5 }, name: '好友buff Lv.1' },
  friends_10: { friendsRequired: 10, buff: { attack: 10, defense: 10 }, name: '好友buff Lv.2' },
  friends_20: { friendsRequired: 20, buff: { attack: 15, defense: 15 }, name: '好友buff Lv.3' },
  friends_50: { friendsRequired: 50, buff: { attack: 20, defense: 20 }, name: '好友buff Lv.4' },
}

export class FriendSystem {
  private friends: Map<string, Map<string, Friend>> = new Map()  // playerId -> friendId -> Friend
  private friendRequests: Map<string, FriendRequest[]> = new Map()  // playerId -> requests
  private blacklist: Map<string, Map<string, BlacklistEntry>> = new Map()  // playerId -> blockedId -> BlacklistEntry
  private recommendations: Map<string, { recommendations: FriendRecommendation[], lastRefresh: number }> = new Map()
  private requestCounter: number = 0

  // 初始化玩家好友数据
  initPlayerFriendData(playerId: string): void {
    if (!this.friends.has(playerId)) {
      this.friends.set(playerId, new Map())
    }
    if (!this.friendRequests.has(playerId)) {
      this.friendRequests.set(playerId, [])
    }
    if (!this.blacklist.has(playerId)) {
      this.blacklist.set(playerId, new Map())
    }
  }

  // 发送好友请求
  sendFriendRequest(fromPlayerId: string, fromPlayerName: string, toPlayerId: string, message?: string): {
    success: boolean
    message: string
    requestId?: string
  } {
    this.initPlayerFriendData(fromPlayerId)
    this.initPlayerFriendData(toPlayerId)

    // 检查是否已在黑名单
    const blockedList = this.blacklist.get(toPlayerId)!
    if (blockedList.has(fromPlayerId)) {
      return { success: false, message: '对方已将您加入黑名单' }
    }

    // 检查是否已是好友
    const friendsList = this.friends.get(fromPlayerId)!
    if (friendsList.has(toPlayerId)) {
      return { success: false, message: '对方已经是您的好友' }
    }

    // 检查好友上限
    if (friendsList.size >= FRIEND_CONFIG.maxFriends) {
      return { success: false, message: `好友数量已达上限(${FRIEND_CONFIG.maxFriends})` }
    }

    // 创建好友请求
    const requestId = `friend_req_${++this.requestCounter}_${Date.now()}`
    const request: FriendRequest = {
      requestId,
      fromPlayerId,
      fromPlayerName,
      toPlayerId,
      message,
      timestamp: Date.now(),
      status: 'pending'
    }

    // 添加到接收者的请求列表
    const requests = this.friendRequests.get(toPlayerId)!
    requests.push(request)

    return { success: true, message: '好友请求已发送', requestId }
  }

  // 响应好友请求
  respondToFriendRequest(playerId: string, requestId: string, accept: boolean): {
    success: boolean
    message: string
  } {
    const requests = this.friendRequests.get(playerId)
    if (!requests) {
      return { success: false, message: '没有好友请求' }
    }

    const requestIndex = requests.findIndex(r => r.requestId === requestId)
    if (requestIndex === -1) {
      return { success: false, message: '请求不存在' }
    }

    const request = requests[requestIndex]

    if (accept) {
      // 添加好友关系
      this.addFriendRelationship(request.fromPlayerId, playerId, request.fromPlayerName)
      this.addFriendRelationship(playerId, request.fromPlayerId, '玩家')
      request.status = 'accepted'
    } else {
      request.status = 'rejected'
    }

    // 移除已处理的请求
    requests.splice(requestIndex, 1)

    return { success: true, message: accept ? '已同意好友请求' : '已拒绝好友请求' }
  }

  // 添加好友关系
  private addFriendRelationship(playerId: string, friendId: string, friendName: string): void {
    const friendsList = this.friends.get(playerId)!
    friendsList.set(friendId, {
      playerId,
      friendId,
      friendName,
      level: 1,  // 简化，实际应从玩家数据获取
      power: 0,
      relation: 'friend',
      addedAt: Date.now(),
      lastInteractTime: Date.now()
    })
  }

  // 获取好友列表
  getFriendList(playerId: string): Friend[] {
    this.initPlayerFriendData(playerId)
    const friendsList = this.friends.get(playerId)!
    return Array.from(friendsList.values()).sort((a, b) => b.lastInteractTime - a.lastInteractTime)
  }

  // 获取好友请求列表
  getFriendRequests(playerId: string): FriendRequest[] {
    this.initPlayerFriendData(playerId)
    return this.friendRequests.get(playerId)?.filter(r => r.status === 'pending') || []
  }

  // 删除好友
  removeFriend(playerId: string, friendId: string): {
    success: boolean
    message: string
  } {
    const friendsList = this.friends.get(playerId)
    if (!friendsList || !friendsList.has(friendId)) {
      return { success: false, message: '好友不存在' }
    }

    friendsList.delete(friendId)

    // 双向删除
    const otherFriendsList = this.friends.get(friendId)
    if (otherFriendsList) {
      otherFriendsList.delete(playerId)
    }

    return { success: true, message: '已删除好友' }
  }

  // 添加到黑名单
  addToBlacklist(playerId: string, blockedId: string, blockedName: string, reason?: string): {
    success: boolean
    message: string
  } {
    this.initPlayerFriendData(playerId)

    const blacklist = this.blacklist.get(playerId)!

    // 检查黑名单上限
    if (blacklist.size >= FRIEND_CONFIG.maxBlacklist) {
      return { success: false, message: `黑名单已达上限(${FRIEND_CONFIG.maxBlacklist})` }
    }

    // 如果是好友，先删除
    const friendsList = this.friends.get(playerId)!
    if (friendsList.has(blockedId)) {
      friendsList.delete(blockedId)
    }

    // 添加到黑名单
    blacklist.set(blockedId, {
      playerId,
      blockedId,
      blockedName,
      blockedReason: reason,
      blockedAt: Date.now()
    })

    return { success: true, message: '已添加到黑名单' }
  }

  // 从黑名单移除
  removeFromBlacklist(playerId: string, blockedId: string): {
    success: boolean
    message: string
  } {
    const blacklist = this.blacklist.get(playerId)
    if (!blacklist || !blacklist.has(blockedId)) {
      return { success: false, message: '黑名单中不存在该玩家' }
    }

    blacklist.delete(blockedId)
    return { success: true, message: '已从黑名单移除' }
  }

  // 获取黑名单
  getBlacklist(playerId: string): BlacklistEntry[] {
    this.initPlayerFriendData(playerId)
    const blacklist = this.blacklist.get(playerId)!
    return Array.from(blacklist.values()).sort((a, b) => b.blockedAt - a.blockedAt)
  }

  // 检查是否在黑名单
  isBlocked(playerId: string, otherId: string): boolean {
    const blacklist = this.blacklist.get(playerId)
    return blacklist ? blacklist.has(otherId) : false
  }

  // 获取好友推荐
  getRecommendations(playerId: string, allPlayers: { playerId: string, name: string, level: number, power: number, realm?: string, guildId?: string }[]): FriendRecommendation[] {
    this.initPlayerFriendData(playerId)

    // 检查缓存
    const cached = this.recommendations.get(playerId)
    if (cached && Date.now() - cached.lastRefresh < FRIEND_CONFIG.recommendationRefreshInterval) {
      return cached.recommendations
    }

    const friendsList = this.friends.get(playerId)!
    const blacklist = this.blacklist.get(playerId)!

    // 过滤掉已经是好友和在黑名单中的玩家
    const availablePlayers = allPlayers.filter(p => 
      p.playerId !== playerId && 
      !friendsList.has(p.playerId) && 
      !blacklist.has(p.playerId)
    )

    // 计算推荐分数
    const recommendations: FriendRecommendation[] = availablePlayers.map(p => {
      let similarity = 0

      // 等级相似度
      const levelDiff = Math.abs(p.level - 1) // 简化，应获取玩家实际等级
      if (levelDiff <= FRIEND_CONFIG.levelDiffThreshold) {
        similarity += FRIEND_CONFIG.weights.level * 100 * (1 - levelDiff / FRIEND_CONFIG.levelDiffThreshold)
      }

      // 战力相似度
      const powerRatio = Math.min(p.power, 1) / Math.max(p.power, 1)
      similarity += FRIEND_CONFIG.weights.power * powerRatio * 100

      // 推荐类型
      let reason: FriendRecommendation['reason'] = 'recommended'
      if (p.guildId) reason = 'same_guild'
      else if (p.realm) reason = 'same_realm'

      return {
        playerId: p.playerId,
        playerName: p.name,
        level: p.level,
        power: p.power,
        reason,
        similarity: Math.min(100, Math.floor(similarity))
      }
    })

    // 按相似度排序
    recommendations.sort((a, b) => b.similarity - a.similarity)

    // 缓存结果
    this.recommendations.set(playerId, {
      recommendations: recommendations.slice(0, FRIEND_CONFIG.recommendationCount),
      lastRefresh: Date.now()
    })

    return recommendations.slice(0, FRIEND_CONFIG.recommendationCount)
  }

  // 刷新推荐
  refreshRecommendations(playerId: string): void {
    this.recommendations.delete(playerId)
  }

  // 获取好友buff
  getFriendBuff(playerId: string): { attack: number, defense: number, name: string } | null {
    const friendsList = this.friends.get(playerId)
    if (!friendsList) return null

    const friendCount = friendsList.size

    if (friendCount >= 50) return { ...FRIEND_BUFFS.friends_50.buff, name: FRIEND_BUFFS.friends_50.name }
    if (friendCount >= 20) return { ...FRIEND_BUFFS.friends_20.buff, name: FRIEND_BUFFS.friends_20.name }
    if (friendCount >= 10) return { ...FRIEND_BUFFS.friends_10.buff, name: FRIEND_BUFFS.friends_10.name }
    if (friendCount >= 5) return { ...FRIEND_BUFFS.friends_5.buff, name: FRIEND_BUFFS.friends_5.name }

    return null
  }

  // 更新好友互动时间
  updateFriendInteractTime(playerId: string, friendId: string): void {
    const friendsList = this.friends.get(playerId)
    if (!friendsList) return

    const friend = friendsList.get(friendId)
    if (friend) {
      friend.lastInteractTime = Date.now()
    }
  }

  // 获取好友数量
  getFriendCount(playerId: string): number {
    const friendsList = this.friends.get(playerId)
    return friendsList ? friendsList.size : 0
  }
}

export const friendSystem = new FriendSystem()
