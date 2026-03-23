/**
 * 聊天系统
 * 内存存储的聊天系统，支持世界频道、宗门频道、私信
 */

class ChatSystem {
  constructor() {
    // 频道消息存储
    this.worldMessages = [];
    this.sectMessages = {};
    this.teamMessages = {};
    this.guildMessages = {};
    this.privateMessages = [];
    this.systemMessages = [];
    
    // 私聊会话
    this.privateConversations = {};
    
    // 玩家冷却
    this.cooldowns = {};
    
    // 配置
    this.MAX_MESSAGES = 500;
    this.WORLD_COOLDOWN = 2000;
    this.SECT_COOLDOWN = 1000;
    this.PRIVATE_COOLDOWN = 1000;
  }
  
  // 生成消息ID
  generateId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // 检查冷却
  checkCooldown(playerId, channel) {
    const key = `${playerId}_${channel}`;
    const now = Date.now();
    const lastTime = this.cooldowns[key] || 0;
    
    let cooldown = 0;
    switch (channel) {
      case 'world': cooldown = this.WORLD_COOLDOWN; break;
      case 'sect': cooldown = this.SECT_COOLDOWN; break;
      case 'private': cooldown = this.PRIVATE_COOLDOWN; break;
      default: cooldown = 1000;
    }
    
    const remaining = cooldown - (now - lastTime);
    if (remaining > 0) {
      return { allowed: false, remaining };
    }
    
    this.cooldowns[key] = now;
    return { allowed: true, remaining: 0 };
  }
  
  // 发送世界消息
  sendWorldMessage(playerId, playerName, content) {
    const cooldownCheck = this.checkCooldown(playerId, 'world');
    if (!cooldownCheck.allowed) {
      return { success: false, message: `发送过快，请${Math.ceil(cooldownCheck.remaining / 1000)}秒后重试` };
    }
    
    if (content.length > 200) {
      return { success: false, message: '消息过长，最多200字符' };
    }
    
    const message = {
      id: this.generateId(),
      senderId: playerId,
      senderName: playerName,
      content: this.filterContent(content),
      timestamp: Date.now(),
      type: 'world'
    };
    
    this.worldMessages.push(message);
    if (this.worldMessages.length > this.MAX_MESSAGES) {
      this.worldMessages.shift();
    }
    
    return { success: true, message };
  }
  
  // 获取世界消息
  getWorldMessages(limit = 50, before = null) {
    let messages = this.worldMessages;
    
    if (before) {
      messages = messages.filter(m => m.timestamp < before);
    }
    
    return messages.slice(-limit);
  }
  
  // 发送私聊消息
  sendPrivateMessage(fromId, fromName, toId, toName, content) {
    const cooldownCheck = this.checkCooldown(fromId, 'private');
    if (!cooldownCheck.allowed) {
      return { success: false, message: `发送过快，请${Math.ceil(cooldownCheck.remaining / 1000)}秒后重试` };
    }
    
    if (content.length > 500) {
      return { success: false, message: '消息过长，最多500字符' };
    }
    
    const message = {
      id: this.generateId(),
      fromId: fromId,
      fromName: fromName,
      toId: toId,
      toName: toName,
      content: this.filterContent(content),
      timestamp: Date.now(),
      type: 'private',
      read: false
    };
    
    this.privateMessages.push(message);
    
    // 更新会话
    this.updateConversation(fromId, toId, toName, content);
    this.updateConversation(toId, fromId, fromName, content);
    
    if (this.privateMessages.length > this.MAX_MESSAGES) {
      this.privateMessages.shift();
    }
    
    return { success: true, message };
  }
  
  // 更新私聊会话
  updateConversation(playerId, targetId, targetName, lastMessage) {
    if (!this.privateConversations[playerId]) {
      this.privateConversations[playerId] = [];
    }
    
    const existing = this.privateConversations[playerId].find(c => c.targetId === targetId);
    if (existing) {
      existing.lastMessage = lastMessage;
      existing.lastMessageTime = Date.now();
      existing.unreadCount = existing.unreadCount || 0;
    } else {
      this.privateConversations[playerId].push({
        targetId: targetId,
        targetName: targetName,
        lastMessage: lastMessage,
        lastMessageTime: Date.now(),
        unreadCount: 0
      });
    }
  }
  
  // 获取私聊消息
  getPrivateMessages(playerId, otherId, limit = 30) {
    const messages = this.privateMessages.filter(m => 
      (m.fromId === playerId && m.toId === otherId) ||
      (m.fromId === otherId && m.toId === playerId)
    );
    
    // 标记为已读
    messages.forEach(m => {
      if (m.toId === playerId && !m.read) {
        m.read = true;
      }
    });
    
    // 更新未读数
    if (this.privateConversations[playerId]) {
      const conv = this.privateConversations[playerId].find(c => c.targetId === otherId);
      if (conv) conv.unreadCount = 0;
    }
    
    return messages.slice(-limit).sort((a, b) => a.timestamp - b.timestamp);
  }
  
  // 获取私聊会话列表
  getPrivateConversations(playerId) {
    return this.privateConversations[playerId] || [];
  }
  
  // 获取未读私聊数
  getUnreadCount(playerId) {
    const conversations = this.privateConversations[playerId] || [];
    return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }
  
  // 发送系统消息
  sendSystemMessage(content, type = 'world') {
    const message = {
      id: this.generateId(),
      senderId: 'SYSTEM',
      senderName: '系统',
      content: content,
      timestamp: Date.now(),
      type: 'system',
      channel: type
    };
    
    if (type === 'world') {
      this.worldMessages.push(message);
    } else if (type === 'sect') {
      // 可以扩展
    }
    
    return message;
  }
  
  // 统一发送消息
  sendMessage(channel, playerId, playerName, content, options = {}) {
    switch (channel) {
      case 'world':
        return this.sendWorldMessage(playerId, playerName, content);
      
      case 'sect':
        return this.sendSectMessage(playerId, playerName, content, options.sectId);
      
      case 'private':
        return this.sendPrivateMessage(
          playerId, 
          playerName, 
          options.toId, 
          options.toName, 
          content
        );
      
      default:
        return { success: false, message: '无效的频道' };
    }
  }
  
  // 发送宗门消息
  sendSectMessage(playerId, playerName, sectId, content) {
    const cooldownCheck = this.checkCooldown(playerId, 'sect');
    if (!cooldownCheck.allowed) {
      return { success: false, message: `发送过快，请${Math.ceil(cooldownCheck.remaining / 1000)}秒后重试` };
    }
    
    if (content.length > 300) {
      return { success: false, message: '消息过长，最多300字符' };
    }
    
    const key = `sect_${sectId}`;
    if (!this.sectMessages[key]) {
      this.sectMessages[key] = [];
    }
    
    const message = {
      id: this.generateId(),
      senderId: playerId,
      senderName: playerName,
      sectId: sectId,
      content: this.filterContent(content),
      timestamp: Date.now(),
      type: 'sect'
    };
    
    this.sectMessages[key].push(message);
    if (this.sectMessages[key].length > this.MAX_MESSAGES) {
      this.sectMessages[key].shift();
    }
    
    return { success: true, message };
  }
  
  // 获取历史消息
  getHistory(channel, playerId, options = {}, limit = 50, before = null) {
    switch (channel) {
      case 'world':
        let worldMsgs = this.worldMessages;
        if (before) {
          worldMsgs = worldMsgs.filter(m => m.timestamp < before);
        }
        return { success: true, messages: worldMsgs.slice(-limit) };
      
      case 'sect':
        const sectId = options.sectId;
        const sectKey = `sect_${sectId}`;
        let sectMsgs = this.sectMessages[sectKey] || [];
        if (before) {
          sectMsgs = sectMsgs.filter(m => m.timestamp < before);
        }
        return { success: true, messages: sectMsgs.slice(-limit) };
      
      case 'private':
        const targetId = options.targetId;
        const privateMsgs = this.getPrivateMessages(playerId, targetId, limit);
        return { success: true, messages: privateMsgs };
      
      default:
        return { success: false, message: '无效的频道' };
    }
  }
  
  // 过滤内容
  filterContent(content) {
    // 敏感词过滤
    const sensitiveWords = ['敏感词1', '敏感词2', 'fuck', 'shit'];
    let filtered = content;
    
    for (const word of sensitiveWords) {
      filtered = filtered.replace(new RegExp(word, 'gi'), '**');
    }
    
    // 链接处理
    filtered = filtered.replace(/(https?:\/\/[^\s]+)/g, '[链接]');
    
    return filtered;
  }
}

module.exports = new ChatSystem();
