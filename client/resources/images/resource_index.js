/**
 * 寻道修仙 - 美术资源索引
 * Art Asset Resource Index
 * 生成时间: 2026-03-23
 */

const ArtResources = {
  backgrounds: {
    /**
     * 主界面修炼背景
     * 描述: 山巅道场庭院，黄昏时分，浮岛瀑布，月出金山
     */
    'bg-main-cultivation': {
      path: 'assets/bg-main-cultivation.png',
      type: 'background',
      scene: 'main',
      description: '主界面修炼背景 - 山巅道场浮岛夜景',
      size: '1920x1080',
      colorPalette: ['#0a0a12', '#ffd700', '#8b5cf6']
    },

    /**
     * 副本入口背景
     * 描述: 古老副本大门，符文发光，石狮守护
     */
    'bg-dungeon-gate': {
      path: 'assets/bg-dungeon-gate.png',
      type: 'background',
      scene: 'dungeon',
      description: '副本入口背景 - 符文石门暗洞窟穴',
      size: '1920x1080',
      colorPalette: ['#0a0a12', '#ffd700', '#8b5cf6']
    },

    /**
     * 宗门大殿背景
     * 描述: 宗门主殿，弟子练功，金柱红灯
     */
    'bg-sect-grand-hall': {
      path: 'assets/bg-sect-grand-hall.png',
      type: 'background',
      scene: 'sect',
      description: '宗门大殿背景 - 金柱华灯弟子练功',
      size: '1920x1080',
      colorPalette: ['#0a0a12', '#ffd700', '#dc2626']
    },

    /**
     * 装备面板背景
     * 描述: 古代军械库，武器架，悬浮神剑
     */
    'bg-equipment-panel': {
      path: 'assets/bg-equipment-panel.png',
      type: 'background',
      scene: 'equipment',
      description: '装备面板背景 - 军械库神剑悬浮',
      size: '1920x1080',
      colorPalette: ['#0a0a12', '#ffd700', '#8b5cf6']
    },

    /**
     * 成就面板背景
     * 描述: 成就殿堂，卷轴金匾，魂灯漂浮
     */
    'bg-achievement-hall': {
      path: 'assets/bg-achievement-hall.png',
      type: 'background',
      scene: 'achievement',
      description: '成就面板背景 - 成就殿堂金匾卷轴',
      size: '1920x1080',
      colorPalette: ['#0a0a12', '#ffd700', '#fef3c7']
    },

    /**
     * 奇遇探险背景
     * 描述: 远古遗迹入口，石柱铭文，紫色传送门
     */
    'bg-adventure-mystery': {
      path: 'assets/bg-adventure-mystery.png',
      type: 'background',
      scene: 'adventure',
      description: '奇遇探险背景 - 远古遗迹紫光传送门',
      size: '1920x1080',
      colorPalette: ['#0a0a12', '#8b5cf6', '#ffd700']
    },

    /**
     * 强化锻造背景
     * 描述: 武器锻造工坊，熔炉火焰，铁匠锤炼
     */
    'bg-enhance-forge': {
      path: 'assets/bg-enhance-forge.png',
      type: 'background',
      scene: 'enhance',
      description: '强化锻造背景 - 锻造工坊炉火熔炉',
      size: '1920x1080',
      colorPalette: ['#0a0a12', '#ffd700', '#dc2626']
    },

    /**
     * 仙侣双修背景
     * 描述: 双修场景，男女修士对坐，虹桥灵气
     */
    'bg-couple-cultivation': {
      path: 'assets/bg-couple-cultivation.png',
      type: 'background',
      scene: 'couple',
      description: '仙侣双修背景 - 修士对坐灵气虹桥',
      size: '1920x1080',
      colorPalette: ['#0a0a12', '#8b5cf6', '#ffd700']
    }
  }
};

// 便捷导出
const BACKGROUND_PATHS = Object.fromEntries(
  Object.entries(ArtResources.backgrounds).map(([key, val]) => [key, val.path])
);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ArtResources, BACKGROUND_PATHS };
}
