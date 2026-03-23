/**
 * 瞬移系统 - 快速移动
 * 玩家使用瞬移技能快速到达指定位置
 */

const瞬移系统 = {
  // 瞬移技能配置
  config: {
    cooldown: 30000, // 30秒冷却
    maxDistance: 1000, // 最大瞬移距离(格子)
    mpCost: 50, // 魔法消耗
  },

  // 使用瞬移
  async teleport(player, targetX, targetY) {
    const { x, y } = player.position;
    const distance = Math.sqrt(Math.pow(targetX - x, 2) + Math.pow(targetY - y, 2));
    
    if (distance > this.config.maxDistance) {
      return { success: false, message: '距离太远，无法瞬移' };
    }
    
    if (player.mp < this.config.mpCost) {
      return { success: false, message: '魔法值不足' };
    }
    
    if (Date.now() < player.teleportCooldown) {
      return { success: false, message: '冷却中...' };
    }
    
    player.mp -= this.config.mpCost;
    player.position.x = targetX;
    player.position.y = targetY;
    player.teleportCooldown = Date.now() + this.config.cooldown;
    
    return { 
      success: true, 
      message: '瞬移成功', 
      newPosition: { x: targetX, y: targetY },
      cooldown: this.config.cooldown
    };
  },

  // 获取瞬移冷却状态
  getCooldownStatus(player) {
    const remaining = Math.max(0, player.teleportCooldown - Date.now());
    return {
      onCooldown: remaining > 0,
      remainingMs: remaining,
      readyAt: remaining > 0 ? null : Date.now()
    };
  }
};

module.exports = 瞬移系统;
