/**
 * 挂机修仙 - 邮件系统
 * 包含系统邮件、奖励邮件、玩家邮件功能
 */

// ==================== 邮件配置 ====================
const MAIL_CONFIG = {
  // 邮件有效期：7天（毫秒）
  EXPIRY_DAYS: 7,
  EXPIRY_MS: 7 * 24 * 60 * 60 * 1000,
  // 邮件类型
  TYPE: {
    SYSTEM: 'system',   // 系统邮件
    REWARD: 'reward',   // 奖励邮件
    PERSONAL: 'personal' // 玩家邮件
  },
  // 附件类型
  ATTACHMENT_TYPE: {
    SPIRIT_STONE: 'spirit_stone',  // 灵石
    ITEM: 'item',                   // 物品
    EXP: 'exp'                     // 经验
  }
};

// ==================== 邮件数据模型 ====================

/**
 * 创建邮件对象
 * @param {Object} options 邮件选项
 * @param {string} options.type 邮件类型 (system/reward/personal)
 * @param {string} options.title 邮件标题
 * @param {string} options.content 邮件内容
 * @param {Array} options.attachments 附件列表 [{type, amount, itemId?}]
 * @returns {Object} 邮件对象
 */
function createMail(options) {
  const now = Date.now();
  return {
    id: generateMailId(),
    type: options.type || MAIL_CONFIG.TYPE.SYSTEM,
    title: options.title || '系统邮件',
    content: options.content || '',
    attachments: options.attachments || [],  // [{type: 'spirit_stone'|'item'|'exp', amount, itemId?}]
    read: false,
    claimed: false,  // 附件是否已领取
    timestamp: now,
    expired: now + MAIL_CONFIG.EXPIRY_MS
  };
}

/**
 * 生成唯一邮件ID
 */
function generateMailId() {
  return 'mail_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ==================== 邮件系统核心类 ====================

class MailSystem {
  constructor(gameState) {
    this.gameState = gameState;
    // 初始化邮件数据
    if (!this.gameState.mails) {
      this.gameState.mails = {
        list: [],
        unreadCount: 0
      };
    }
  }

  /**
   * 发送邮件
   * @param {Object} mailOptions 邮件选项
   * @returns {Object} 发送的邮件
   */
  sendMail(mailOptions) {
    const mail = createMail(mailOptions);
    this.gameState.mails.list.push(mail);
    this.gameState.mails.unreadCount++;
    console.log(`📧 发送邮件: ${mail.title}`);
    return mail;
  }

  /**
   * 获取所有邮件
   * @param {Object} options 过滤选项
   * @param {boolean} options.includeExpired 是否包含过期邮件
   * @param {string} options.type 按类型过滤
   * @returns {Array} 邮件列表
   */
  getMails(options = {}) {
    let mails = this.gameState.mails.list;
    
    // 清理过期邮件（默认不包含）
    if (!options.includeExpired) {
      const now = Date.now();
      mails = mails.filter(m => m.expired > now);
    }
    
    // 按类型过滤
    if (options.type) {
      mails = mails.filter(m => m.type === options.type);
    }
    
    // 按时间倒序排列
    return mails.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 获取未读邮件数量
   */
  getUnreadCount() {
    const now = Date.now();
    return this.gameState.mails.list.filter(m => !m.read && m.expired > now).length;
  }

  /**
   * 标记邮件为已读
   * @param {string} id 邮件ID
   * @returns {Object} 结果
   */
  markAsRead(id) {
    const mail = this.gameState.mails.list.find(m => m.id === id);
    if (!mail) {
      return { success: false, message: '邮件不存在' };
    }
    if (!mail.read) {
      mail.read = true;
      this.gameState.mails.unreadCount = Math.max(0, this.gameState.mails.unreadCount - 1);
    }
    return { success: true, message: '已标记为已读' };
  }

  /**
   * 删除邮件
   * @param {string} id 邮件ID
   * @returns {Object} 结果
   */
  deleteMail(id) {
    const index = this.gameState.mails.list.findIndex(m => m.id === id);
    if (index < 0) {
      return { success: false, message: '邮件不存在' };
    }
    const mail = this.gameState.mails.list[index];
    if (!mail.read) {
      this.gameState.mails.unreadCount = Math.max(0, this.gameState.mails.unreadCount - 1);
    }
    this.gameState.mails.list.splice(index, 1);
    return { success: true, message: '邮件已删除' };
  }

  /**
   * 领取邮件附件
   * @param {string} id 邮件ID
   * @returns {Object} 结果
   */
  claimAttachment(id) {
    const mail = this.gameState.mails.list.find(m => m.id === id);
    if (!mail) {
      return { success: false, message: '邮件不存在' };
    }
    if (mail.claimed) {
      return { success: false, message: '附件已领取' };
    }
    if (mail.attachments.length === 0) {
      return { success: false, message: '没有附件可领取' };
    }
    if (mail.expired < Date.now()) {
      return { success: false, message: '邮件已过期' };
    }

    // 标记为已读
    if (!mail.read) {
      mail.read = true;
      this.gameState.mails.unreadCount = Math.max(0, this.gameState.mails.unreadCount - 1);
    }

    // 发放附件
    const rewards = [];
    for (const att of mail.attachments) {
      switch (att.type) {
        case MAIL_CONFIG.ATTACHMENT_TYPE.SPIRIT_STONE:
          this.gameState.player.spiritStones += att.amount;
          rewards.push(`+${att.amount}灵石`);
          break;
        case MAIL_CONFIG.ATTACHMENT_TYPE.EXP:
          this.gameState.player.experience += att.amount;
          rewards.push(`+${att.amount}经验`);
          break;
        case MAIL_CONFIG.ATTACHMENT_TYPE.ITEM:
          // 物品奖励逻辑（可扩展）
          rewards.push(`+${att.amount}个物品`);
          break;
      }
    }

    mail.claimed = true;
    return { success: true, message: `领取成功: ${rewards.join(', ')}`, rewards };
  }

  /**
   * 一键领取所有可领取附件
   * @returns {Object} 结果
   */
  claimAll() {
    const now = Date.now();
    const availableMails = this.gameState.mails.list.filter(m => 
      !m.claimed && 
      m.attachments.length > 0 && 
      m.expired > now
    );

    if (availableMails.length === 0) {
      return { success: false, message: '没有可领取的附件' };
    }

    let totalStones = 0;
    let totalExp = 0;
    let claimedCount = 0;

    for (const mail of availableMails) {
      // 标记为已读
      if (!mail.read) {
        mail.read = true;
        this.gameState.mails.unreadCount = Math.max(0, this.gameState.mails.unreadCount - 1);
      }

      // 发放附件
      for (const att of mail.attachments) {
        switch (att.type) {
          case MAIL_CONFIG.ATTACHMENT_TYPE.SPIRIT_STONE:
            totalStones += att.amount;
            break;
          case MAIL_CONFIG.ATTACHMENT_TYPE.EXP:
            totalExp += att.amount;
            break;
        }
      }
      mail.claimed = true;
      claimedCount++;
    }

    // 统一发放
    this.gameState.player.spiritStones += totalStones;
    this.gameState.player.experience += totalExp;

    const rewards = [];
    if (totalStones > 0) rewards.push(`+${totalStones}灵石`);
    if (totalExp > 0) rewards.push(`+${totalExp}经验`);

    return { 
      success: true, 
      message: `共领取${claimedCount}封邮件: ${rewards.join(', ')}`,
      claimedCount,
      rewards: rewards.join(', ')
    };
  }

  /**
   * 清理过期邮件
   * @returns {Object} 清理结果
   */
  cleanExpired() {
    const now = Date.now();
    const expiredMails = this.gameState.mails.list.filter(m => m.expired <= now);
    const expiredCount = expiredMails.length;

    // 统计未读过期邮件
    let unreadExpired = 0;
    for (const mail of expiredMails) {
      if (!mail.read) unreadExpired++;
    }

    // 移除过期邮件
    this.gameState.mails.list = this.gameState.mails.list.filter(m => m.expired > now);
    
    // 更新未读计数
    this.gameState.mails.unreadCount = Math.max(0, this.gameState.mails.unreadCount - unreadExpired);

    return { 
      success: true, 
      message: `清理了${expiredCount}封过期邮件`,
      cleanedCount: expiredCount
    };
  }

  /**
   * 获取邮件详情
   * @param {string} id 邮件ID
   * @returns {Object|null} 邮件详情
   */
  getMailDetail(id) {
    const mail = this.gameState.mails.list.find(m => m.id === id);
    if (!mail) return null;
    
    // 自动标记为已读
    if (!mail.read) {
      this.markAsRead(id);
    }
    
    return mail;
  }

  /**
   * 获取邮件统计信息
   */
  getMailStats() {
    const now = Date.now();
    const mails = this.gameState.mails.list;
    return {
      total: mails.length,
      unread: mails.filter(m => !m.read && m.expired > now).length,
      hasAttachment: mails.filter(m => m.attachments.length > 0 && !m.claimed && m.expired > now).length,
      expired: mails.filter(m => m.expired <= now).length
    };
  }
}

// ==================== 自动发送邮件场景 ====================

/**
 * 发送签到奖励邮件
 * @param {Object} gameState 游戏状态
 * @param {number} day 签到天数
 * @param {Object} rewards 奖励内容
 */
function sendDailySignInMail(gameState, day, rewards) {
  const rewardDescriptions = [];
  if (rewards.spiritStones) rewardDescriptions.push(`${rewards.spiritStones}灵石`);
  if (rewards.exp) rewardDescriptions.push(`${rewards.exp}经验`);

  const mailSystem = new MailSystem(gameState);
  mailSystem.sendMail({
    type: MAIL_CONFIG.TYPE.REWARD,
    title: `📅 第${day}天签到奖励`,
    content: `恭喜您完成第${day}天签到！\n\n签到奖励：${rewardDescriptions.join('、')}\n\n感谢您的支持，祝您修仙愉快！`,
    attachments: [
      ...(rewards.spiritStones ? [{ type: MAIL_CONFIG.ATTACHMENT_TYPE.SPIRIT_STONE, amount: rewards.spiritStones }] : []),
      ...(rewards.exp ? [{ type: MAIL_CONFIG.ATTACHMENT_TYPE.EXP, amount: rewards.exp }] : [])
    ]
  });
}

/**
 * 发送成就奖励邮件
 * @param {Object} gameState 游戏状态
 * @param {string} achievementName 成就名称
 * @param {Object} rewards 奖励内容
 */
function sendAchievementMail(gameState, achievementName, rewards) {
  const rewardDescriptions = [];
  if (rewards.spiritStones) rewardDescriptions.push(`${rewards.spiritStones}灵石`);
  if (rewards.exp) rewardDescriptions.push(`${rewards.exp}经验`);

  const mailSystem = new MailSystem(gameState);
  mailSystem.sendMail({
    type: MAIL_CONFIG.TYPE.REWARD,
    title: `🏆 成就达成: ${achievementName}`,
    content: `恭喜您达成成就【${achievementName}】！\n\n成就奖励：${rewardDescriptions.join('、')}\n\n感谢您的努力修炼！`,
    attachments: [
      ...(rewards.spiritStones ? [{ type: MAIL_CONFIG.ATTACHMENT_TYPE.SPIRIT_STONE, amount: rewards.spiritStones }] : []),
      ...(rewards.exp ? [{ type: MAIL_CONFIG.ATTACHMENT_TYPE.EXP, amount: rewards.exp }] : [])
    ]
  });
}

/**
 * 发送离线收益邮件
 * @param {Object} gameState 游戏状态
 * @param {number} offlineSeconds 离线秒数
 * @param {number} spiritGained 获得的灵气
 * @param {number} expGained 获得的经验
 * @param {number} stonesGained 获得的灵石
 */
function sendOfflineEarningsMail(gameState, offlineSeconds, spiritGained, expGained, stonesGained) {
  const offlineHours = (offlineSeconds / 3600).toFixed(1);
  const rewards = [];
  const attachments = [];

  if (spiritGained > 0) rewards.push(`+${Math.floor(spiritGained)}灵气`);
  if (expGained > 0) rewards.push(`+${Math.floor(expGained)}经验`);
  if (stonesGained > 0) {
    rewards.push(`+${stonesGained}灵石`);
    attachments.push({ type: MAIL_CONFIG.ATTACHMENT_TYPE.SPIRIT_STONE, amount: stonesGained });
  }
  if (expGained > 0) attachments.push({ type: MAIL_CONFIG.ATTACHMENT_TYPE.EXP, amount: Math.floor(expGained) });

  const mailSystem = new MailSystem(gameState);
  mailSystem.sendMail({
    type: MAIL_CONFIG.TYPE.SYSTEM,
    title: '📥 离线收益',
    content: `您离线了${offlineHours}小时期间，系统自动为您修炼。\n\n收益明细：\n- 灵气：+${Math.floor(spiritGained)}\n- 经验：+${Math.floor(expGained)}\n- 灵石：+${stonesGained}\n\n继续努力修炼吧！`,
    attachments: attachments
  });
}

/**
 * 发送系统通知邮件
 * @param {Object} gameState 游戏状态
 * @param {string} title 标题
 * @param {string} content 内容
 */
function sendSystemMail(gameState, title, content) {
  const mailSystem = new MailSystem(gameState);
  mailSystem.sendMail({
    type: MAIL_CONFIG.TYPE.SYSTEM,
    title: title,
    content: content,
    attachments: []
  });
}

// ==================== 导出 ====================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MAIL_CONFIG,
    MailSystem,
    createMail,
    sendDailySignInMail,
    sendAchievementMail,
    sendOfflineEarningsMail,
    sendSystemMail
  };
}
