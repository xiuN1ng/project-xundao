/**
 * 传送卷轴系统 - 道具传送
 * 使用传送卷轴可传送到指定位置或记录点
 */

const传送卷轴系统 = {
  // 卷轴类型配置
  卷轴类型: {
    随机传送: { minDistance: 50, maxDistance: 200, successRate: 0.9 },
    指定传送: { minDistance: 0, maxDistance: 500, successRate: 0.95 },
    安全传送: { minDistance: 0, maxDistance: 1000, successRate: 1.0 },
    工会传送: { minDistance: 0, maxDistance: 2000, successRate: 0.85 },
  },

  // 使用传送卷轴
  async useScroll(player, scrollId, targetLocation) {
    const scroll = player.inventory.find(item => item.id === scrollId && item.type === '传送卷轴');
    if (!scroll) {
      return { success: false, message: '背包中没有传送卷轴' };
    }

    const scrollType = this.卷轴类型[scroll.subType];
    if (!scrollType) {
      return { success: false, message: '无效的卷轴类型' };
    }

    // 计算距离
    const { x: px, y: py } = player.position;
    const { x: tx, y: ty } = targetLocation;
    const distance = Math.sqrt(Math.pow(tx - px, 2) + Math.pow(ty - py, 2));

    if (distance > scrollType.maxDistance) {
      return { success: false, message: `目标太远，最大传送距离${scrollType.maxDistance}格` };
    }

    // 随机传送特殊处理
    if (scroll.subType === '随机传送') {
      const angle = Math.random() * Math.PI * 2;
      const dist = scrollType.minDistance + Math.random() * (scrollType.maxDistance - scrollType.minDistance);
      targetLocation.x = Math.floor(px + Math.cos(angle) * dist);
      targetLocation.y = Math.floor(py + Math.sin(angle) * dist);
    }

    // 成功率判定
    if (Math.random() > scrollType.successRate) {
      // 传送失败，卷轴消耗
      player.inventory = player.inventory.filter(item => item.id !== scrollId);
      return { success: false, message: '传送失败！卷轴已消耗' };
    }

    // 传送成功
    player.inventory = player.inventory.filter(item => item.id !== scrollId);
    player.position.x = targetLocation.x;
    player.position.y = targetLocation.y;

    return {
      success: true,
      message: '传送成功',
      newPosition: targetLocation,
      scrollType: scroll.subType
    };
  },

  // 记录当前位置
  saveLocation(player, slot = 0) {
    if (slot < 0 || slot > 2) return { success: false, message: '无效的记录槽位' };
    
    player.teleportLocations = player.teleportLocations || [null, null, null];
    player.teleportLocations[slot] = { ...player.position };
    
    return {
      success: true,
      message: `已记录当前位置到槽位${slot + 1}`,
      location: player.teleportLocations[slot]
    };
  },

  // 传送到记录位置
  async teleportToSaved(player, slot = 0) {
    if (slot < 0 || slot > 2) return { success: false, message: '无效的记录槽位' };
    
    const savedLocation = player.teleportLocations?.[slot];
    if (!savedLocation) {
      return { success: false, message: `槽位${slot + 1}没有记录位置` };
    }

    // 检查是否有足够卷轴
    const scroll = player.inventory.find(item => item.type === '传送卷轴' && item.subType === '指定传送');
    if (!scroll) {
      return { success: false, message: '需要指定传送卷轴' };
    }

    return this.useScroll(player, scroll.id, savedLocation);
  }
};

module.exports = 传送卷轴系统;
