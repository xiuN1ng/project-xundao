/**
 * 表情系统 - 玩家表情互动
 * 各种有趣的表情包和情感表达
 */

const表情系统 = {
  // 表情分类配置
  表情分类: {
    开心: ['开心', '大笑', '偷笑', '傻笑', '微笑', '得意', '欢呼'],
    伤心: ['哭泣', '大哭', '流泪', '委屈', '难过', '伤心', '抽泣'],
    生气: ['愤怒', '抓狂', '发火', '生气', '哼哼', '不理你'],
    惊讶: ['惊讶', '震惊', '惊恐', '发呆', '愣住', '哇塞'],
    害羞: ['害羞', '脸红', '腼腆', '不好意思', '扭捏'],
    调皮: ['调皮', '眨眼', '吐舌', '做鬼脸', '奸笑', '坏笑'],
    爱心: ['爱心', '飞吻', '比心', '爱心发射', '么么哒'],
    无奈: ['无奈', '石化', '晕倒', '睡倒', '无语', '汗颜'],
  },

  // 表情配置
  表情配置: {
    开心: { duration: 3000, sound: 'happy', particle: 'star' },
    伤心: { duration: 5000, sound: 'sad', particle: 'tear' },
    生气: { duration: 4000, sound: 'angry', particle: 'fire' },
    惊讶: { duration: 2000, sound: 'surprised', particle: 'shock' },
    害羞: { duration: 4000, sound: 'shy', particle: 'heart' },
    调皮: { duration: 3000, sound: 'playful', particle: 'sparkle' },
    爱心: { duration: 3000, sound: 'love', particle: 'love' },
    无奈: { duration: 3000, sound: 'speechless', particle: 'sweat' },
  },

  // 使用表情
  async useEmotion(player, emotionType) {
    const emotionList = this.表情分类[emotionType];
    if (!emotionList) {
      return { success: false, message: '无效的表情分类' };
    }

    const emotion = emotionList[Math.floor(Math.random() * emotionList.length)];
    const config = this.表情配置[emotionType];

    // 检查冷却
    const lastEmotion = player.emotionCooldown?.[emotionType];
    if (lastEmotion && Date.now() - lastEmotion < 5000) {
      return { success: false, message: '表情切换太快了' };
    }

    // 记录表情
    player.emotionCooldown = player.emotionCooldown || {};
    player.emotionCooldown[emotionType] = Date.now();
    player.currentEmotion = {
      type: emotionType,
      expression: emotion,
      timestamp: Date.now(),
      duration: config.duration
    };

    return {
      success: true,
      message: `使用了${emotion}`,
      emotion: {
        type: emotionType,
        expression: emotion,
        animation: config.particle,
        sound: config.sound,
        duration: config.duration
      }
    };
  },

  // 批量使用多个表情（表情包）
  async useEmotionPack(player, emotionTypes) {
    if (!Array.isArray(emotionTypes) || emotionTypes.length === 0) {
      return { success: false, message: '请选择至少一个表情' };
    }

    if (emotionTypes.length > 9) {
      return { success: false, message: '最多同时使用9个表情' };
    }

    const results = [];
    for (const type of emotionTypes) {
      const result = await this.useEmotion(player, type);
      results.push(result);
    }

    return {
      success: true,
      message: `发送了${emotionTypes.length}个表情`,
      emotions: results.filter(r => r.success).map(r => r.emotion)
    };
  },

  // 获取可用表情列表
  getAvailableEmotions() {
    const available = [];
    for (const [category, emotions] of Object.entries(this.表情分类)) {
      const config = this.表情配置[category];
      available.push({
        category,
        expressions: emotions,
        duration: config.duration,
        particle: config.particle
      });
    }
    return available;
  },

  // 获取当前显示的表情
  getCurrentEmotion(player) {
    if (!player.currentEmotion) return null;
    
    const elapsed = Date.now() - player.currentEmotion.timestamp;
    if (elapsed > player.currentEmotion.duration) {
      player.currentEmotion = null;
      return null;
    }
    
    return {
      ...player.currentEmotion,
      remaining: player.currentEmotion.duration - elapsed
    };
  },

  // 清除当前表情
  clearEmotion(player) {
    player.currentEmotion = null;
    return { success: true, message: '表情已清除' };
  }
};

module.exports = 表情系统;
