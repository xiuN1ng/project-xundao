/**
 * 聊天系统
 * 频道聊天、私聊功能、表情包、黑名单
 */

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderTitle?: string;
  senderLevel: number;
  senderAvatar?: string;
  channel: 'world' | 'sect' | 'team' | 'guild' | 'private' | 'system';
  content: string;
  timestamp: number;
  type: 'text' | 'item' | 'system' | 'link' | 'emoji' | 'image';
  metadata?: {
    itemId?: string;
    itemCount?: number;
    link?: string;
    imageUrl?: string;
    emojiId?: string;
  };
  targetId?: string;
  targetName?: string;
}

export interface ChatChannel {
  channel: string;
  name: string;
  minLevel: number;
  cooldown: number;
  maxLength: number;
  description: string;
  icon: string;
}

export interface PlayerChatConfig {
  playerId: string;
  blockedPlayers: string[];
  mutedUntil: number;
  chatEnabled: boolean;
  showWorld: boolean;
  showSect: boolean;
  showTeam: boolean;
  showGuild: boolean;
  showPrivate: boolean;
}

export interface PrivateChatSession {
  playerId: string;
  targetId: string;
  targetName: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
}

export interface ChatEmoji {
  id: string;
  name: string;
  url: string;
  type: 'face' | 'emotion' | 'effect';
}

class ChatSystem {
  private static messages: Map<string, ChatMessage[]> = new Map();
  private static channels: Map<string, ChatChannel> = new Map();
  private static playerConfigs: Map<string, PlayerChatConfig> = new Map();
  private static privateChatSessions: Map<string, PrivateChatSession[]> = new Map();
  private static cooldowns: Map<string, number> = new Map();
  private static emojis: Map<string, ChatEmoji> = new Map();
  private static readonly MAX_MESSAGES = 500;
  private static readonly PRIVATE_COOLDOWN = 1000; // 私聊1秒冷却
  
  /**
   * 初始化频道配置
   */
  static initChannels(): void {
    // 世界频道
    this.registerChannel({
      channel: 'world',
      name: '世界频道',
      minLevel: 1,
      cooldown: 2000,
      maxLength: 200,
      description: '全服玩家聊天',
      icon: '🌍'
    });
    
    // 仙盟频道
    this.registerChannel({
      channel: 'sect',
      name: '仙盟频道',
      minLevel: 1,
      cooldown: 1000,
      maxLength: 300,
      description: '仙盟成员聊天',
      icon: '🏯'
    });
    
    // 队伍频道
    this.registerChannel({
      channel: 'team',
      name: '队伍频道',
      minLevel: 1,
      cooldown: 500,
      maxLength: 300,
      description: '队伍成员聊天',
      icon: '⚔️'
    });
    
    // 公会频道
    this.registerChannel({
      channel: 'guild',
      name: '公会频道',
      minLevel: 1,
      cooldown: 1000,
      maxLength: 300,
      description: '公会成员聊天',
      icon: '🏠'
    });
    
    // 私聊
    this.registerChannel({
      channel: 'private',
      name: '私聊',
      minLevel: 1,
      cooldown: 1000,
      maxLength: 500,
      description: '与其他玩家私聊',
      icon: '💬'
    });
    
    // 初始化表情
    this.initEmojis();
  }
  
  /**
   * 初始化表情
   */
  private static initEmojis(): void {
    const defaultEmojis: ChatEmoji[] = [
      { id: 'emoji_1', name: '微笑', url: '/emojis/smile.png', type: 'face' },
      { id: 'emoji_2', name: '大笑', url: '/emojis/laugh.png', type: 'face' },
      { id: 'emoji_3', name: '哭泣', url: '/emojis/cry.png', type: 'face' },
      { id: 'emoji_4', name: '惊讶', url: '/emojis/surprise.png', type: 'face' },
      { id: 'emoji_5', name: '爱心', url: '/emojis/heart.png', type: 'emotion' },
      { id: 'emoji_6', name: '点赞', url: '/emojis/thumb.png', type: 'emotion' },
      { id: 'emoji_7', name: '金光', url: '/emojis/gold.png', type: 'effect' },
      { id: 'emoji_8', name: '闪电', url: '/emojis/lightning.png', type: 'effect' }
    ];
    
    for (const emoji of defaultEmojis) {
      this.emojis.set(emoji.id, emoji);
    }
  }
  
  /**
   * 注册频道
   */
  static registerChannel(channel: ChatChannel): void {
    this.channels.set(channel.channel, channel);
  }
  
  /**
   * 获取所有频道
   */
  static getChannels(): ChatChannel[] {
    return Array.from(this.channels.values());
  }
  
  /**
   * 获取可用表情
   */
  static getEmojis(): ChatEmoji[] {
    return Array.from(this.emojis.values());
  }
  
  /**
   * 发送消息
   */
  static sendMessage(senderId: string, senderName: string, channel: string, content: string, options?: {
    senderTitle?: string;
    senderLevel?: number;
    senderAvatar?: string;
    type?: 'text' | 'item' | 'system' | 'link' | 'emoji' | 'image';
    metadata?: { itemId?: string; itemCount?: number; link?: string; imageUrl?: string; emojiId?: string };
    targetId?: string;
    targetName?: string;
  }): {
    success: boolean;
    message?: ChatMessage;
    error?: string;
    cooldown?: number;
  } {
    // 检查频道是否存在
    const channelConfig = this.channels.get(channel);
    if (!channelConfig) {
      return { success: false, error: '频道不存在' };
    }
    
    // 检查玩家是否被禁言
    const config = this.getPlayerConfig(senderId);
    if (config.mutedUntil > Date.now()) {
      const remaining = Math.ceil((config.mutedUntil - Date.now()) / 1000);
      return { success: false, error: `已被禁言，剩余${remaining}秒` };
    }
    
    // 检查冷却
    const cooldownKey = `${senderId}_${channel}`;
    const lastMessageTime = this.cooldowns.get(cooldownKey) || 0;
    const now = Date.now();
    const remainingCooldown = channelConfig.cooldown - (now - lastMessageTime);
    
    if (remainingCooldown > 0) {
      return { 
        success: false, 
        error: '发送过快，请稍后再试',
        cooldown: remainingCooldown 
      };
    }
    
    // 检查消息长度
    if (content.length > channelConfig.maxLength) {
      return { success: false, error: `消息过长，最多${channelConfig.maxLength}字符` };
    }
    
    // 检查是否被屏蔽 (私聊)
    if (channel === 'private' && options?.targetId) {
      if (this.isPlayerBlocked(options.targetId, senderId)) {
        return { success: false, error: '对方已将您屏蔽' };
      }
    }
    
    // 创建消息
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      senderId,
      senderName,
      senderTitle: options?.senderTitle,
      senderLevel: options?.senderLevel || 1,
      senderAvatar: options?.senderAvatar,
      channel: channel as ChatMessage['channel'],
      content: this.filterContent(content),
      timestamp: now,
      type: options?.type || 'text',
      metadata: options?.metadata,
      targetId: options?.targetId,
      targetName: options?.targetName
    };
    
    // 存储消息
    if (!this.messages.has(channel)) {
      this.messages.set(channel, []);
    }
    
    const channelMessages = this.messages.get(channel)!;
    channelMessages.push(message);
    
    // 限制消息数量
    while (channelMessages.length > this.MAX_MESSAGES) {
      channelMessages.shift();
    }
    
    // 更新私聊会话
    if (channel === 'private' && options?.targetId) {
      this.updatePrivateChatSession(senderId, options.targetId, options.targetName || '未知', content);
    }
    
    // 设置冷却
    this.cooldowns.set(cooldownKey, now);
    
    return { success: true, message };
  }
  
  /**
   * 获取频道消息
   */
  static getChannelMessages(channel: string, limit: number = 50): ChatMessage[] {
    const messages = this.messages.get(channel);
    if (!messages) return [];
    
    return messages.slice(-limit);
  }
  
  /**
   * 获取私聊消息 (双向)
   */
  static getPrivateMessages(playerId: string, targetId: string): ChatMessage[] {
    const allMessages: ChatMessage[] = [];
    
    // 从私聊频道获取
    const privateMessages = this.messages.get('private') || [];
    const filtered = privateMessages.filter(m => 
      (m.senderId === playerId && m.targetId === targetId) ||
      (m.senderId === targetId && m.targetId === playerId)
    );
    allMessages.push(...filtered);
    
    return allMessages.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  /**
   * 获取私聊会话列表
   */
  static getPrivateChatSessions(playerId: string): PrivateChatSession[] {
    const sessions = this.privateChatSessions.get(playerId) || [];
    return sessions.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
  }
  
  /**
   * 更新私聊会话
   */
  private static updatePrivateChatSession(playerId: string, targetId: string, targetName: string, lastMessage: string): void {
    const sessions = this.privateChatSessions.get(playerId) || [];
    const existing = sessions.find(s => s.targetId === targetId);
    
    if (existing) {
      existing.lastMessage = lastMessage;
      existing.lastMessageTime = Date.now();
    } else {
      sessions.push({
        playerId,
        targetId,
        targetName,
        lastMessage,
        lastMessageTime: Date.now(),
        unreadCount: 0
      });
    }
    
    this.privateChatSessions.set(playerId, sessions);
  }
  
  /**
   * 发送私聊消息
   */
  static sendPrivateMessage(senderId: string, senderName: string, targetId: string, content: string): {
    success: boolean;
    message?: ChatMessage;
    error?: string;
  } {
    // 检查是否屏蔽
    if (this.isPlayerBlocked(targetId, senderId)) {
      return { success: false, error: '对方已将您屏蔽' };
    }
    
    return this.sendMessage(senderId, senderName, 'private', content, { 
      targetId,
      targetName: '' // 会在发送时更新
    });
  }
  
  /**
   * 发送频道消息
   */
  static sendChannelMessage(senderId: string, senderName: string, channel: string, content: string, options?: {
    senderTitle?: string;
    senderLevel?: number;
    type?: 'text' | 'emoji' | 'image';
    metadata?: { emojiId?: string; imageUrl?: string };
  }): {
    success: boolean;
    message?: ChatMessage;
    error?: string;
    cooldown?: number;
  } {
    // 验证频道
    const validChannels = ['world', 'sect', 'team', 'guild'];
    if (!validChannels.includes(channel)) {
      return { success: false, error: '无效的频道' };
    }
    
    return this.sendMessage(senderId, senderName, channel, content, options);
  }
  
  /**
   * 过滤内容
   */
  private static filterContent(content: string): string {
    // 敏感词替换
    const sensitiveWords = ['敏感词1', '敏感词2'];
    let filtered = content;
    
    for (const word of sensitiveWords) {
      filtered = filtered.replace(new RegExp(word, 'g'), '**');
    }
    
    // 链接处理
    filtered = filtered.replace(/(https?:\/\/[^\s]+)/g, '[链接]');
    
    return filtered;
  }
  
  /**
   * 屏蔽玩家
   */
  static blockPlayer(playerId: string, targetId: string): boolean {
    const config = this.getPlayerConfig(playerId);
    if (!config.blockedPlayers.includes(targetId)) {
      config.blockedPlayers.push(targetId);
    }
    return true;
  }
  
  /**
   * 取消屏蔽
   */
  static unblockPlayer(playerId: string, targetId: string): boolean {
    const config = this.getPlayerConfig(playerId);
    const index = config.blockedPlayers.indexOf(targetId);
    if (index >= 0) {
      config.blockedPlayers.splice(index, 1);
    }
    return true;
  }
  
  /**
   * 获取屏蔽列表
   */
  static getBlockedPlayers(playerId: string): string[] {
    const config = this.getPlayerConfig(playerId);
    return config.blockedPlayers;
  }
  
  /**
   * 检查是否屏蔽
   */
  private static isPlayerBlocked(playerId: string, targetId: string): boolean {
    const config = this.getPlayerConfig(playerId);
    return config.blockedPlayers.includes(targetId);
  }
  
  /**
   * 禁言玩家
   */
  static mutePlayer(playerId: string, durationMs: number): void {
    const config = this.getPlayerConfig(playerId);
    config.mutedUntil = Date.now() + durationMs;
  }
  
  /**
   * 解除禁言
   */
  static unmutePlayer(playerId: string): void {
    const config = this.getPlayerConfig(playerId);
    config.mutedUntil = 0;
  }
  
  /**
   * 获取玩家配置
   */
  static getPlayerConfig(playerId: string): PlayerChatConfig {
    if (!this.playerConfigs.has(playerId)) {
      this.playerConfigs.set(playerId, {
        playerId,
        blockedPlayers: [],
        mutedUntil: 0,
        chatEnabled: true,
        showWorld: true,
        showSect: true,
        showTeam: true,
        showGuild: true,
        showPrivate: true
      });
    }
    return this.playerConfigs.get(playerId)!;
  }
  
  /**
   * 更新玩家聊天设置
   */
  static updateChatSettings(playerId: string, settings: Partial<PlayerChatConfig>): void {
    const config = this.getPlayerConfig(playerId);
    Object.assign(config, settings);
  }
  
  /**
   * 发送系统消息
   */
  static sendSystemMessage(channel: string, content: string): ChatMessage {
    const message: ChatMessage = {
      id: `msg_sys_${Date.now()}`,
      senderId: 'SYSTEM',
      senderName: '系统',
      senderLevel: 0,
      channel: channel as ChatMessage['channel'],
      content,
      timestamp: Date.now(),
      type: 'system'
    };
    
    if (!this.messages.has(channel)) {
      this.messages.set(channel, []);
    }
    
    this.messages.get(channel)!.push(message);
    return message;
  }
  
  /**
   * 获取历史消息
   */
  static getHistoryMessages(channel: string, beforeId?: string, limit: number = 20): ChatMessage[] {
    const messages = this.messages.get(channel);
    if (!messages) return [];
    
    let startIndex = messages.length;
    
    if (beforeId) {
      const idx = messages.findIndex(m => m.id === beforeId);
      if (idx >= 0) startIndex = idx;
    }
    
    const start = Math.max(0, startIndex - limit);
    return messages.slice(start, startIndex).reverse();
  }
  
  /**
   * 获取未读私聊数
   */
  static getUnreadPrivateCount(playerId: string): number {
    const sessions = this.privateChatSessions.get(playerId) || [];
    return sessions.reduce((sum, s) => sum + s.unreadCount, 0);
  }
  
  /**
   * 标记私聊为已读
   */
  static markPrivateAsRead(playerId: string, targetId: string): void {
    const sessions = this.privateChatSessions.get(playerId) || [];
    const session = sessions.find(s => s.targetId === targetId);
    if (session) {
      session.unreadCount = 0;
    }
  }
}

export default ChatSystem;
export { ChatMessage, ChatChannel, PlayerChatConfig, PrivateChatSession, ChatEmoji };
