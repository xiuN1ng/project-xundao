/**
 * 挂机修仙 - 资源映射配置
 * 
 * 在这里配置你的资源URL
 * 准备资源后修改对应URL即可
 */

// ==================== 境界立绘 ====================
const REALM_AVATARS = {
  // 格式: '境界名': '图片URL'
  // 示例: '凡人': 'assets/avatars/realm/fanren.png'
  '凡人': null,      // 暂时使用emoji
  '练气期': null,
  '筑基期': null,
  '金丹期': null,
  '元婴期': null,
  '化神期': null,
  '炼虚期': null,
  '合体期': null,
  '大乘期': null,
  '渡劫期': null,
  '仙人': null
};

// ==================== 怪物头像 ====================
const MONSTER_AVATARS = {
  'slime': null,      // 史莱姆
  'wolf': null,       // 野狼
  'snake': null,      // 毒蛇
  'bear': null,       // 棕熊
  'tiger': null,      // 猛虎
  'ghost': null,      // 游魂
  'skeleton': null,   // 骷髅
  'zombie': null,     // 僵尸
  'demon': null,      // 妖魔
  'dragon': null     // 蛟龙
};

// ==================== 建筑图片 ====================
const BUILDING_IMAGES = {
  '聚灵阵': null,
  '灵田': null,
  '炼丹房': null,
  '炼器室': null,
  '藏书阁': null,
  '灵兽园': null
};

// ==================== 背景图 ====================
const BACKGROUNDS = {
  'main': null,       // 主界面背景
  'battle': null,     // 战斗背景
  'cave': null        // 洞府背景
};

// ==================== 玩家头像 ====================
const PLAYER_AVATAR = null;  // 替换为: 'assets/avatars/player.png'

// ==================== 资源服务器配置 ====================
const ASSET_SERVER = {
  // 资源服务器基础URL
  baseUrl: '',
  
  // 资源映射函数
  getUrl(type, name) {
    if (!this.baseUrl) return null;
    return `${this.baseUrl}/${type}/${name}.png`;
  }
};

// ==================== 初始化资源 ====================
function initResources() {
  // 初始化资源加载器配置
  if (typeof ResourceLoader !== 'undefined') {
    // 设置背景
    if (BACKGROUNDS.main) {
      ResourceLoader.setResource('backgrounds', 'main', BACKGROUNDS.main);
    }
    
    // 设置玩家头像
    if (PLAYER_AVATAR) {
      ResourceLoader.setResource('avatars', 'player', PLAYER_AVATAR);
    }
    
    // 设置境界头像
    for (const [realm, url] of Object.entries(REALM_AVATARS)) {
      if (url) {
        ResourceLoader.setResource('avatars', `realm_${realm}`, url);
      }
    }
    
    // 设置怪物头像
    for (const [monster, url] of Object.entries(MONSTER_AVATARS)) {
      if (url) {
        ResourceLoader.setResource('avatars', `monster_${monster}`, url);
      }
    }
  }
}

// 导出配置
window.RESOURCE_CONFIG = {
  REALM_AVATARS,
  MONSTER_AVATARS,
  BUILDING_IMAGES,
  BACKGROUNDS,
  PLAYER_AVATAR,
  ASSET_SERVER,
  initResources
};
// 浏览器端使用
if (typeof window !== 'undefined') { window.resource_config = {}; }
