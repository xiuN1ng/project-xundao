/**
 * 挂机修仙 - 成长引导系统
 * 
 * 功能：
 * 1. 显示距离下一境界所需灵气和时间估算
 * 2. 根据玩家状态给出升级建议
 * 3. 阶段性目标提示
 */

// ==================== 境界名称 ====================
const REALM_NAMES = {
  0: '凡人', 1: '练气期', 2: '筑基期', 3: '金丹期',
  4: '元婴期', 5: '化神期', 6: '炼虚期', 7: '合体期',
  8: '大乘期', 9: '渡劫期', 10: '仙人'
};

// ==================== 升级建议配置 ====================
const UPGRADE_TIPS = {
  low_spirit_rate: {
    condition: (player) => player.spiritRate < 50,
    tip: '建议升级聚灵阵或学习灵气类功法提升灵气获取效率',
    priority: 1
  },
  low_combat: {
    condition: (player) => player.combatPower < player.realmLevel * 100,
    tip: '建议强化装备或提升境界以增强战斗力',
    priority: 2
  },
  no_beast: {
    condition: (player) => !player.beasts || player.beasts.length === 0,
    tip: '建议捕捉灵兽协助战斗，可大幅提升战力',
    priority: 3
  },
  no_equipment: {
    condition: (player) => !player.equipment || !player.equipment.weapon,
    tip: '建议打造武器提升攻击力的基础',
    priority: 1
  },
  no_technique: {
    condition: (player) => !player.techniques || player.techniques.length < 3,
    tip: '建议学习更多功法获得属性加成',
    priority: 2
  },
  stuck_in_realm: {
    condition: (player) => player.cultivation > player.cultivation_req * 0.8,
    tip: '灵气已接近上限，建议突破境界',
    priority: 1
  }
};

/**
 * 成长引导系统
 */
class ProgressGuideSystem {
  constructor(realmData = null) {
    this.realmData = realmData;
    this.tips = UPGRADE_TIPS;
  }
  
  /**
   * 获取境界进度信息
   */
  getRealmProgress(player) {
    const currentRealm = player.realm || '凡人-前期-1阶';
    
    // 尝试从优化版或原版获取数据
    let realmInfo;
    try {
      const REALM_DATA = require('./realm_data_optimized.js');
      realmInfo = REALM_DATA.REALM_DATA_V3_OPTIMIZED[currentRealm];
    } catch (e) {
      // 使用默认数据
      realmInfo = { cultivation_req: 1000, spirit_base: 50 };
    }
    
    const cultivationReq = realmInfo?.cultivation_req || 1000;
    const currentSpirit = player.spirit || 0;
    const spiritRate = player.spiritRate || 5;
    
    // 计算下一境界
    const order = realmInfo?.order || 1;
    const nextOrder = order + 1;
    
    let nextRealm = null;
    try {
      const REALM_DATA = require('./realm_data_optimized.js');
      const keys = Object.keys(REALM_DATA.REALM_DATA_V3_OPTIMIZED);
      for (const key of keys) {
        const realm = REALM_DATA.REALM_DATA_V3_OPTIMIZED[key];
        if (realm.order === nextOrder) {
          nextRealm = realm;
          break;
        }
      }
    } catch (e) {}
    
    // 进度百分比
    const progress = Math.min((currentSpirit / cultivationReq) * 100, 100);
    
    // 时间估算（小时）
    const spiritNeeded = Math.max(cultivationReq - currentSpirit, 0);
    const timeHours = spiritRate > 0 ? spiritNeeded / spiritRate / 3600 : Infinity;
    
    // 距离下一境界的灵气
    const nextRealmSpirit = nextRealm?.cultivation_req || 0;
    const totalToNext = nextRealmSpirit - currentSpirit;
    
    return {
      current: {
        name: currentRealm,
        order: order,
        spirit: currentSpirit,
        spiritRate: spiritRate,
        cultivationReq: cultivationReq,
        progress: Math.round(progress)
      },
      next: nextRealm ? {
        name: nextRealm.name,
        order: nextRealm.order,
        cultivationReq: nextRealm.cultivationReq
      } : null,
      estimate: {
        spiritNeeded: spiritNeeded,
        timeHours: timeHours > 0 ? timeHours.toFixed(1) + '小时' : '已达上限',
        totalToNext: totalToNext
      }
    };
  }
  
  /**
   * 获取升级建议
   */
  getUpgradeTips(player) {
    const tips = [];
    
    for (const [key, config] of Object.entries(this.tips)) {
      if (config.condition(player)) {
        tips.push({
          id: key,
          tip: config.tip,
          priority: config.priority
        });
      }
    }
    
    // 按优先级排序
    tips.sort((a, b) => a.priority - b.priority);
    
    return tips;
  }
  
  /**
   * 获取阶段性目标
   */
  getMilestones(player) {
    const milestones = [];
    const order = player.realmOrder || 1;
    
    // 每10阶一个大目标
    if (order >= 10 && order < 20) {
      milestones.push({ goal: '达到筑基期', current: order, target: 19 });
    }
    if (order >= 20 && order < 30) {
      milestones.push({ goal: '达到金丹期', current: order, target: 28 });
    }
    if (order >= 30 && order < 40) {
      milestones.push({ goal: '达到元婴期', current: order, target: 37 });
    }
    if (order >= 50 && order < 60) {
      milestones.push({ goal: '达到炼虚期', current: order, target: 55 });
    }
    if (order >= 70 && order < 80) {
      milestones.push({ goal: '达到合体期', current: order, target: 64 });
    }
    if (order >= 90) {
      milestones.push({ goal: '成为仙人', current: order, target: 99 });
    }
    
    return milestones;
  }
  
  /**
   * 生成完整的成长报告
   */
  getFullReport(player) {
    return {
      progress: this.getRealmProgress(player),
      tips: this.getUpgradeTips(player),
      milestones: this.getMilestones(player)
    };
  }
}

/**
 * 生成UI展示数据
 */
function generateProgressUI(player) {
  const guide = new ProgressGuideSystem();
  const report = guide.getFullReport(player);
  
  // 格式化输出
  const lines = [];
  
  // 标题
  lines.push('═'.repeat(30));
  lines.push(`📈 ${report.progress.current.name} - 进度`);
  lines.push('═'.repeat(30));
  
  // 进度条
  const barLength = 20;
  const filled = Math.floor(report.progress.current.progress / 100 * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
  lines.push(`[${bar}] ${report.progress.current.progress}%`);
  
  // 灵气信息
  lines.push(`灵气: ${report.progress.current.spirit.toLocaleString()} / ${report.progress.current.cultivationReq.toLocaleString()}`);
  lines.push(`速率: ${report.progress.current.spiritRate}/秒`);
  lines.push(`预计: ${report.progress.estimate.timeHours}`);
  
  // 下一境界
  if (report.progress.next) {
    lines.push('');
    lines.push(`➡️ 下一境界: ${report.progress.next.name} (${report.progress.next.order}阶)`);
    lines.push(`   还需: ${report.progress.estimate.totalToNext.toLocaleString()} 灵气`);
  }
  
  // 建议
  if (report.tips.length > 0) {
    lines.push('');
    lines.push('💡 建议:');
    for (const tip of report.tips.slice(0, 3)) {
      lines.push(`   • ${tip.tip}`);
    }
  }
  
  // 里程碑
  if (report.milestones.length > 0) {
    lines.push('');
    lines.push('🎯 阶段目标:');
    for (const m of report.milestones) {
      const percent = Math.round((m.current / m.target) * 100);
      lines.push(`   ${m.goal}: ${percent}%`);
    }
  }
  
  lines.push('═'.repeat(30));
  
  return lines.join('\n');
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ProgressGuideSystem,
    generateProgressUI,
    REALM_NAMES,
    UPGRADE_TIPS
  };
}
