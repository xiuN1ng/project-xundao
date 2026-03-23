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
  'main': 'assets/bg-main-menu.png',       // 主界面背景
  'battle': 'assets/bg-dungeon-battle.png', // 战斗背景 (2026-03-21 art-cron: dungeon-battle场景)
  'tribulation': 'assets/bg-tribulation.png', // 渡劫背景
  'cave': 'assets/bg-cave-dwelling.png',    // 洞府背景
  'alchemy': 'assets/bg-alchemy-furnace.png', // 炼丹背景
  'sect': 'assets/bg-sect.png',            // 宗门背景
  'shop': 'assets/bg-shop-alchemy.jpg',    // 商店/炼丹铺背景
  'xundao': 'assets/bg-xundao-20260320.png',  // 寻道修仙AI生成背景 (2026-03-20)
  'xundao2': 'assets/minimax_20260320_150018.png',  // AI生成修仙背景 (2026-03-20 3PM)
  'lundao': 'assets/bg-lundao.png',                    // 论道场景背景 (2026-03-20 4PM art-cron)
  'sect-war': 'assets/bg-sect-war.png',                // 仙盟对战背景 (2026-03-20 4PM art-cron)
  'art011040': 'assets/bg-art-011040.png',            // 原画资源 (2026-03-21 art-cron)
  'art011059': 'assets/bg-art-011059.png',            // 原画资源 (2026-03-21 art-cron)
  'cultivation100018': 'assets/bg-cultivation-20260321-100018.png',  // AI修仙背景 2026-03-21 10AM art-cron
  'cultivation050042': 'assets/bg-cultivation-20260321-050042.png',  // AI修仙背景 2026-03-21 05AM art-cron
};

// ==================== 灵根图标 ====================
const SPIRIT_ROOT_ICONS = {
  'metal': 'assets/spirit_root_metal.png',   // 金
  'wood': 'assets/spirit_root_wood.png',      // 木
  'water': 'assets/spirit_root_water.png',    // 水
  'fire': 'assets/spirit_root_fire.png',      // 火
  'earth': 'assets/spirit_root_earth.png'     // 土
};

// ==================== 功法技能图标 ====================
const SKILL_ICONS = {
  'sword_qi': 'assets/skill_sword_qi.png',      // 剑气
  'spirit_heal': 'assets/skill_spirit_heal.png', // 灵愈
  'fire_blast': 'assets/skill_fire_blast.png',   // 烈火
  'water_flow': 'assets/skill_water_flow.png',    // 水流
  'wood_growth': 'assets/skill_wood_growth.png',  // 生长
  'void_shadow': 'assets/skill_void_shadow.png',  // 虚空
  'light_heal': 'assets/skill_light_heal.png',   // 圣光
  'earth_shield': 'assets/skill_earth_shield.png' // 土盾
};

// ==================== 灵兽立绘 ====================
const SPIRIT_BEAST_IMAGE = 'assets/spirit-beast-fox.png'; // 九尾狐灵兽立绘

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
    // 设置所有背景图
    for (const [key, url] of Object.entries(BACKGROUNDS)) {
      if (url) {
        ResourceLoader.setResource('backgrounds', key, url);
      }
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

// 导出所有配置到 window
window.RESOURCE_CONFIG = {
  REALM_AVATARS,
  MONSTER_AVATARS,
  BUILDING_IMAGES,
  BACKGROUNDS,
  PLAYER_AVATAR,
  ASSET_SERVER,
  initResources
};

// 导出资源映射供 UI 使用
window.BACKGROUNDS = BACKGROUNDS;
window.SPIRIT_ROOT_ICONS = SPIRIT_ROOT_ICONS;
window.SKILL_ICONS = SKILL_ICONS;
window.SPIRIT_BEAST_IMAGE = SPIRIT_BEAST_IMAGE;

// ==================== 新场景背景图（2026-03-21）====================
window.NEW_BACKGROUNDS = {
  'tutorial': 'assets/bg-tutorial-guide.png',
  'dungeon': 'assets/bg-dungeon-battle.png',
  'offline': 'assets/bg-offline-cultivation.png',
  'sectHall': 'assets/bg-sect-hall.png',
  'tribulationStorm': 'assets/bg-tribulation-storm.png',
  // 2026-03-21 art-cron 新增原画
  'xundao': 'assets/bg-xundao-20260320.png',           // 寻道修仙AI生成背景
  'art011040': 'assets/bg-art-011040.png',              // AI原画 2026-03-21 01:10
  'art011059': 'assets/bg-art-011059.png',              // AI原画 2026-03-21 01:10
  // 2026-03-21 10AM art-cron 新生成
  'cultivation100018': 'assets/bg-cultivation-20260321-100018.png',  // AI原画 2026-03-21 10:00 (93KB 1280x720)
  'cultivation050042': 'assets/bg-cultivation-20260321-050042.png'   // AI原画 2026-03-21 05:00 (388KB 1280x720)
};
