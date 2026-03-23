/**
 * 背包整理系统
 * 提供一键整理和自动出售功能
 */

interface Item {
  id: string;
  name: string;
  quality: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  type: string;
  quantity: number;
  price?: number;
  stackable: boolean;
  maxStack: number;
}

interface BackpackSlot {
  item: Item | null;
  locked: boolean;
}

interface PlayerBackpack {
  playerId: string;
  slots: BackpackSlot[];
  maxSlots: number;
}

class BackpackOrganizeSystem {
  /**
   * 一键整理背包
   */
  static organize(playerId: string): {
    reorganized: boolean;
    stacksMerged: number;
    slotsFreed: number;
    message: string;
  } {
    const player = this.getPlayerBackpack(playerId);
    
    let stacksMerged = 0;
    let slotsFreed = 0;
    
    // 1. 合并同类物品堆叠
    for (let i = 0; i < player.slots.length; i++) {
      if (!player.slots[i].item) continue;
      
      const item = player.slots[i].item!;
      if (!item.stackable || item.quantity >= item.maxStack) continue;
      
      // 查找相同物品的其他堆
      for (let j = i + 1; j < player.slots.length; j++) {
        if (!player.slots[j].item) continue;
        
        const targetItem = player.slots[j].item!;
        if (targetItem.id === item.id && targetItem.quantity < targetItem.maxStack) {
          const spaceNeeded = item.maxStack - item.quantity;
          const canMove = Math.min(spaceNeeded, targetItem.quantity);
          
          item.quantity += canMove;
          targetItem.quantity -= canMove;
          stacksMerged++;
          
          if (targetItem.quantity === 0) {
            player.slots[j].item = null;
            slotsFreed++;
          }
          
          if (item.quantity >= item.maxStack) break;
        }
      }
    }
    
    // 2. 按品质和类型排序物品
    const items: BackpackSlot[] = player.slots.filter(s => s.item !== null);
    items.sort((a, b) => {
      const qualityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
      const qDiff = qualityOrder[a.item!.quality] - qualityOrder[b.item!.quality];
      if (qDiff !== 0) return qDiff;
      return a.item!.type.localeCompare(b.item!.type);
    });
    
    // 3. 将排序后的物品放回前面 slots
    for (let i = 0; i < player.slots.length; i++) {
      if (i < items.length) {
        player.slots[i].item = items[i].item;
      } else {
        player.slots[i].item = null;
      }
    }
    
    this.savePlayerBackpack(player);
    
    return {
      reorganized: true,
      stacksMerged,
      slotsFreed,
      message: `整理完成！合并了${stacksMerged}个堆叠，腾出了${slotsFreed}个空位`
    };
  }
  
  /**
   * 自动出售物品
   */
  static autoSell(playerId: string, options: {
    minQuality?: ('common' | 'uncommon' | 'rare' | 'epic' | 'legendary')[];
    excludeTypes?: string[];
    sellAll: boolean;
  }): {
    itemsSold: number;
    totalGold: number;
    message: string;
  } {
    const player = this.getPlayerBackpack(playerId);
    
    let itemsSold = 0;
    let totalGold = 0;
    
    const minQualitySet = options.minQuality ? new Set(options.minQuality) : null;
    const excludeTypesSet = options.excludeTypes ? new Set(options.excludeTypes) : null;
    
    for (const slot of player.slots) {
      if (!slot.item) continue;
      
      // 检查是否应该出售
      let shouldSell = options.sellAll;
      
      if (!shouldSell && minQualitySet) {
        const qualityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        const itemQualityIdx = qualityOrder.indexOf(slot.item.quality);
        const minQualityIdx = Math.min(...options.minQuality!.map(q => qualityOrder.indexOf(q)));
        shouldSell = itemQualityIdx <= minQualityIdx;
      }
      
      if (!shouldSell && excludeTypesSet && excludeTypesSet.has(slot.item.type)) {
        continue;
      }
      
      // 出售物品
      const itemValue = slot.item.price || 1;
      const sellValue = itemValue * slot.item.quantity;
      
      totalGold += sellValue;
      itemsSold++;
      slot.item = null;
    }
    
    this.savePlayerBackpack(player);
    this.addPlayerGold(playerId, totalGold);
    
    return {
      itemsSold,
      totalGold,
      message: `自动出售完成！出售了${itemsSold}件物品，获得${totalGold}金币`
    };
  }
  
  /**
   * 快速整理 - 只合并堆叠不排序
   */
  static quickOrganize(playerId: string): {
    merged: number;
    message: string;
  } {
    const player = this.getPlayerBackpack(playerId);
    let merged = 0;
    
    for (let i = 0; i < player.slots.length; i++) {
      if (!player.slots[i].item) continue;
      
      const item = player.slots[i].item!;
      if (!item.stackable) continue;
      
      for (let j = i + 1; j < player.slots.length; j++) {
        if (!player.slots[j].item) continue;
        
        const targetItem = player.slots[j].item!;
        if (targetItem.id !== item.id) continue;
        
        const space = item.maxStack - item.quantity;
        if (space <= 0) break;
        
        const transfer = Math.min(space, targetItem.quantity);
        item.quantity += transfer;
        targetItem.quantity -= transfer;
        merged++;
        
        if (targetItem.quantity === 0) {
          player.slots[j].item = null;
        }
        
        if (item.quantity >= item.maxStack) break;
      }
    }
    
    this.savePlayerBackpack(player);
    
    return {
      merged,
      message: `快速整理完成！合并了${merged}个堆叠`
    };
  }
  
  // Helper methods
  private static getPlayerBackpack(playerId: string): PlayerBackpack {
    // TODO: 从数据库获取玩家背包数据
    return {
      playerId,
      slots: [],
      maxSlots: 50
    };
  }
  
  private static savePlayerBackpack(backpack: PlayerBackpack): void {
    // TODO: 保存到数据库
  }
  
  private static addPlayerGold(playerId: string, gold: number): void {
    // TODO: 增加玩家金币
  }
}

export default BackpackOrganizeSystem;
