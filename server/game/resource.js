/**
 * 挂机修仙 - 资源系统
 * 模块1: 资源抽象层
 * 
 * 提供统一的资源加载接口，方便后续替换真实资源
 */

// 资源配置
const RESOURCES = {
  // 背景
  backgrounds: {
    main: null,  // 主界面背景
    battle: null, // 战斗背景
    cave: null   // 洞府背景
  },
  
  // 立绘/头像
  avatars: {
    player: null,  // 玩家头像
    realm: {},     // 境界头像
    monsters: {},  // 怪物立绘
    disciples: {}, // 弟子立绘
    buildings: {}  // 建筑图片
  },
  
  // UI元素
  ui: {
    button: null,
    panel: null,
    progress: null,
    icons: {}
  },
  
  // 特效
  effects: {
    attack: null,
    skill: null,
    levelup: null
  }
};

// 资源映射配置
const RESOURCE_MAP = {
  // 境界对应头像（渐变色描述，用于AI生成）
  realm_avatars: {
    '凡人': '中国古风凡人男子，简约素衣，温和微笑',
    '练气期': '中国古风修士，蓝色道袍，周身灵气环绕',
    '筑基期': '中国古风修士，紫色道袍，筑基期气势',
    '金丹期': '中国古风金丹修士，金色光芒，法力深厚',
    '元婴期': '中国古风元婴老怪，银白色头发，强大气场',
    '化神期': '中国古风化神期强者，仙风道骨，气度不凡',
    '炼虚期': '中国古风炼虚期大能，虚幻缥缈，神秘莫测',
    '合体期': '中国古风合体期至尊，威严庄重，震慑天地',
    '大乘期': '中国古风大乘期半仙，金光环绕，即将飞升',
    '渡劫期': '中国古风渡劫期仙人，雷劫环绕，准备渡劫',
    '仙人': '中国古风仙人，神光环绕，超凡脱俗'
  },
  
  // 怪物头像
  monster_avatars: {
    'slime': '可爱Q版绿色史莱姆，卡通风格',
    'wolf': '灰色野狼，卡通风格',
    'snake': '紫色毒蛇，卡通风格',
    'bear': '棕色大熊，卡通风格',
    'tiger': '橙色老虎，卡通风格',
    'ghost': '白色幽灵，卡通风格',
    'skeleton': '白色骷髅，卡通风格',
    'zombie': '绿色僵尸，卡通风格',
    'demon': '红色妖魔，凶恶风格',
    'dragon': '青色蛟龙，威严风格'
  },
  
  // 建筑图片
  building_images: {
    '聚灵阵': '中国古风水墨风格阵法，发光灵气阵',
    '灵田': '古风灵田，绿色药草，田园风格',
    '炼丹房': '古风炼丹房，丹炉冒着热气',
    '炼器室': '古风炼器室，火炉锤炼',
    '藏书阁': '古风藏书阁，满是书架',
    '灵兽园': '古风灵兽园，仙禽异兽'
  }
};

// 资源管理器
class ResourceManager {
  constructor() {
    this.loaded = {};
    this.loading = {};
  }
  
  // 加载图片
  loadImage(key, url) {
    return new Promise((resolve, reject) => {
      if (this.loaded[key]) {
        resolve(this.loaded[key]);
        return;
      }
      
      if (this.loading[key]) {
        this.loading[key].then(resolve);
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        this.loaded[key] = img;
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${url}`));
      };
      img.src = url;
    });
  }
  
  // 获取图片（带缓存）
  getImage(key) {
    return this.loaded[key] || null;
  }
  
  // 预加载资源列表
  async preloadImageList(list) {
    const promises = [];
    for (const { key, url } of list) {
      promises.push(this.loadImage(key, url).catch(() => null));
    }
    return Promise.all(promises);
  }
  
  // 生成资源URL（模拟，实际从服务器获取）
  getResourceUrl(type, name) {
    // 这里应该调用资源服务器，实际项目中替换为真实URL
    return `assets/${type}/${name}.png`;
  }
  
  // 清理缓存
  clearCache() {
    this.loaded = {};
    this.loading = {};
  }
}

// 资源管理器实例
const resourceManager = new ResourceManager();

// 导出
window.RESOURCES = RESOURCES;
window.RESOURCE_MAP = RESOURCE_MAP;
window.ResourceManager = ResourceManager;
window.resourceManager = resourceManager;
// 浏览器端使用
if (typeof window !== 'undefined') { window.resource = {}; }
