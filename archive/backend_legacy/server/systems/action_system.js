/**
 * 动作系统 - 玩家互动动作
 * 支持拥抱、亲吻等多种互动动作
 */

const动作系统 = {
  // 动作配置
  动作配置: {
    拥抱: { 
      cooldown: 60000, 
      mpCost: 10, 
      favorGain: 5,
      animation: 'embrace',
      description: '温暖的拥抱'
    },
    亲吻: { 
      cooldown: 120000, 
      mpCost: 20, 
      favorGain: 10,
      animation: 'kiss',
      description: '甜蜜的亲吻'
    },
    握手: { 
      cooldown: 30000, 
      mpCost: 5, 
      favorGain: 2,
      animation: 'handshake',
      description: '友好的握手'
    },
    拍拍: { 
      cooldown: 30000, 
      mpCost: 5, 
      favorGain: 3,
      animation: 'pat',
      description: '拍拍肩膀'
    },
    撒娇: { 
      cooldown: 90000, 
      mpCost: 15, 
      favorGain: 8,
      animation: 'coquetry',
      description: '可爱的撒娇'
    },
    壁咚: { 
      cooldown: 180000, 
      mpCost: 30, 
      favorGain: 15,
      animation: 'wall_press',
      description: '壁咚表白'
    },
  },

  // 执行动作
  async performAction(player, targetPlayer, actionType) {
    const config = this.动作配置[actionType];
    if (!config) {
      return { success: false, message: '未知的动作类型' };
    }

    // 检查冷却
    const lastAction = player.actionCooldowns?.[actionType];
    if (lastAction && Date.now() - lastAction < config.cooldown) {
      const remaining = Math.ceil((config.cooldown - (Date.now() - lastAction)) / 1000);
      return { success: false, message: `动作冷却中，${remaining}秒后可使用` };
    }

    // 检查MP
    if (player.mp < config.mpCost) {
      return { success: false, message: `魔法值不足，需要${config.mpCost}点MP` };
    }

    // 检查目标玩家
    if (!targetPlayer) {
      return { success: false, message: '目标玩家不存在' };
    }

    // 执行动作
    player.mp -= config.mpCost;
    player.actionCooldowns = player.actionCooldowns || {};
    player.actionCooldowns[actionType] = Date.now();

    // 增加亲密度
    if (player.relationships?.[targetPlayer.id]) {
      player.relationships[targetPlayer.id].favor += config.favorGain;
    } else {
      player.relationships = player.relationships || {};
      player.relationships[targetPlayer.id] = {
        favor: config.favorGain,
        type: 'friend'
      };
    }

    return {
      success: true,
      message: `对${targetPlayer.name}使用了${actionType}`,
      action: {
        type: actionType,
        animation: config.animation,
        favorGain: config.favorGain,
        description: config.description
      },
      targetResponse: this.getResponse(actionType, targetPlayer),
      newFavor: player.relationships?.[targetPlayer.id]?.favor || config.favorGain
    };
  },

  // 获取目标响应
  getResponse(actionType, targetPlayer) {
    const responses = {
      拥抱: ['轻轻抱住你', '回抱你', '感受着你的温度'],
      亲吻: ['脸红红的', '轻轻回应', '害羞地亲了你'],
      握手: ['友好地握手', '用力握了握', '点头微笑'],
      拍拍: ['对你笑了笑', '表示感谢', '拍了拍你'],
      撒娇: ['被你逗笑了', '轻轻推开你', '撒娇地回应'],
      壁咚: ['心跳加速', '脸红了', '被你吸引'],
    };
    
    const actionResponses = responses[actionType] || ['回应了你'];
    return actionResponses[Math.floor(Math.random() * actionResponses.length)];
  },

  // 获取动作冷却状态
  getCooldownStatus(player, actionType) {
    const config = this.动作配置[actionType];
    if (!config) return null;

    const lastAction = player.actionCooldowns?.[actionType];
    const remaining = lastAction ? Math.max(0, config.cooldown - (Date.now() - lastAction)) : 0;

    return {
      actionType,
      onCooldown: remaining > 0,
      remainingMs: remaining,
      readyAt: remaining > 0 ? null : Date.now()
    };
  },

  // 获取可用动作列表
  getAvailableActions(player) {
    const available = [];
    for (const [actionType, config] of Object.entries(this.动作配置)) {
      const status = this.getCooldownStatus(player, actionType);
      available.push({
        type: actionType,
        description: config.description,
        cooldown: config.cooldown,
        mpCost: config.mpCost,
        favorGain: config.favorGain,
        available: !status.onCooldown && player.mp >= config.mpCost
      });
    }
    return available;
  }
};

module.exports = 动作系统;
