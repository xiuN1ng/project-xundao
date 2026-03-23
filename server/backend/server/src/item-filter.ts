/**
 * 物品筛选系统
 * 支持按品质、类型、等级等条件筛选背包物品
 */

interface Item {
  id: string;
  name: string;
  quality: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  type: string;
  subType?: string;
  level: number;
  price: number;
  quantity: number;
  bindStatus?: 'unbound' | 'bound' | 'accountBound';
  rarity?: number;
}

interface FilterOptions {
  quality?: ('common' | 'uncommon' | 'rare' | 'epic' | 'legendary')[];
  type?: string[];
  subType?: string[];
  minLevel?: number;
  maxLevel?: number;
  boundStatus?: ('unbound' | 'bound' | 'accountBound')[];
  searchText?: string;
  rarityMin?: number;
}

interface FilterResult {
  items: Item[];
  totalCount: number;
  filteredCount: number;
  filters: FilterOptions;
}

class ItemFilterSystem {
  private static qualityOrder: Record<string, number> = {
    common: 1,
    uncommon: 2,
    rare: 3,
    epic: 4,
    legendary: 5
  };
  
  /**
   * 筛选物品
   */
  static filter(items: Item[], options: FilterOptions): FilterResult {
    let filtered = [...items];
    
    // 按品质筛选
    if (options.quality && options.quality.length > 0) {
      filtered = filtered.filter(item => 
        options.quality!.includes(item.quality)
      );
    }
    
    // 按类型筛选
    if (options.type && options.type.length > 0) {
      filtered = filtered.filter(item => 
        options.type!.includes(item.type)
      );
    }
    
    // 按子类型筛选
    if (options.subType && options.subType.length > 0) {
      filtered = filtered.filter(item => 
        item.subType && options.subType!.includes(item.subType)
      );
    }
    
    // 按等级范围筛选
    if (options.minLevel !== undefined) {
      filtered = filtered.filter(item => item.level >= options.minLevel!);
    }
    if (options.maxLevel !== undefined) {
      filtered = filtered.filter(item => item.level <= options.maxLevel!);
    }
    
    // 按绑定状态筛选
    if (options.boundStatus && options.boundStatus.length > 0) {
      filtered = filtered.filter(item => 
        options.boundStatus!.includes(item.bindStatus || 'unbound')
      );
    }
    
    // 按稀有度筛选
    if (options.rarityMin !== undefined) {
      filtered = filtered.filter(item => 
        (item.rarity || 0) >= options.rarityMin!
      );
    }
    
    // 文本搜索
    if (options.searchText) {
      const searchLower = options.searchText.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        item.id.toLowerCase().includes(searchLower) ||
        item.type.toLowerCase().includes(searchLower)
      );
    }
    
    return {
      items: filtered,
      totalCount: items.length,
      filteredCount: filtered.length,
      filters: options
    };
  }
  
  /**
   * 获取可用筛选选项
   */
  static getAvailableFilters(items: Item[]): {
    qualities: string[];
    types: string[];
    subTypes: string[];
    levelRange: { min: number; max: number };
  } {
    const qualities = new Set<string>();
    const types = new Set<string>();
    const subTypes = new Set<string>();
    let minLevel = Infinity;
    let maxLevel = -Infinity;
    
    for (const item of items) {
      qualities.add(item.quality);
      types.add(item.type);
      if (item.subType) subTypes.add(item.subType);
      minLevel = Math.min(minLevel, item.level);
      maxLevel = Math.max(maxLevel, item.level);
    }
    
    return {
      qualities: Array.from(qualities).sort((a, b) => 
        this.qualityOrder[a] - this.qualityOrder[b]
      ),
      types: Array.from(types).sort(),
      subTypes: Array.from(subTypes).sort(),
      levelRange: { 
        min: minLevel === Infinity ? 0 : minLevel, 
        max: maxLevel === -Infinity ? 0 : maxLevel 
      }
    };
  }
  
  /**
   * 预设筛选方案
   */
  static getPresetFilters(preset: 'equipment' | 'consumables' | 'materials' | 'quest'): FilterOptions {
    switch (preset) {
      case 'equipment':
        return {
          type: ['weapon', 'armor', 'accessory', 'artifact']
        };
      case 'consumables':
        return {
          type: ['potion', 'scroll', 'food', 'elixir']
        };
      case 'materials':
        return {
          type: ['material', 'ore', 'herb', 'cloth', 'metal']
        };
      case 'quest':
        return {
          type: ['questitem']
        };
      default:
        return {};
    }
  }
  
  /**
   * 排序筛选结果
   */
  static sort(items: Item[], sortBy: 'quality' | 'level' | 'name' | 'type' | 'quantity', ascending = false): Item[] {
    const sorted = [...items];
    
    switch (sortBy) {
      case 'quality':
        sorted.sort((a, b) => 
          (this.qualityOrder[a.quality] - this.qualityOrder[b.quality])
        );
        break;
      case 'level':
        sorted.sort((a, b) => a.level - b.level);
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'type':
        sorted.sort((a, b) => a.type.localeCompare(b.type));
        break;
      case 'quantity':
        sorted.sort((a, b) => a.quantity - b.quantity);
        break;
    }
    
    return ascending ? sorted : sorted.reverse();
  }
  
  /**
   * 快速筛选 - 高级装备
   */
  static filterHighQuality(items: Item[], minQuality: 'uncommon' | 'rare' | 'epic' | 'legendary' = 'rare'): Item[] {
    const minOrder = this.qualityOrder[minQuality];
    return items.filter(item => this.qualityOrder[item.quality] >= minOrder);
  }
  
  /**
   * 快速筛选 - 可交易物品
   */
  static filterTradable(items: Item[]): Item[] {
    return items.filter(item => item.bindStatus === 'unbound');
  }
}

export default ItemFilterSystem;
export { Item, FilterOptions, FilterResult };
