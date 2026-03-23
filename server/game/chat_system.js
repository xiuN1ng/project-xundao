/**
 * 挂机修仙 - 聊天/好友系统
 */

class ChatSystem {
  constructor() {
    this.channels = ['世界', '仙盟', '私聊'];
    this.messages = [];
    this.maxMessages = 100;
  }
  
  // 发送消息
  sendMessage(player, channel, content) {
    const msg = {
      sender: player.name,
      channel,
      content,
      time: Date.now()
    };
    this.messages.push(msg);
    if (this.messages.length > this.maxMessages) {
      this.messages.shift();
    }
    return msg;
  }
  
  // 获取消息
  getMessages(channel, since = 0) {
    return this.messages.filter(m => 
      m.channel === channel && m.time > since
    );
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChatSystem };
}
