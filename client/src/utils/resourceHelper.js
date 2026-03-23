/**
 * 资源辅助函数
 */
import Resources from '@/assets/resources'

/**
 * 根据路径获取资源
 * @param {string} path - 资源路径，如 'ui.iconHp'
 * @returns {*} 资源对象
 */
export function getResource(path) {
  const parts = path.split('.')
  let result = Resources
  for (const part of parts) {
    result = result?.[part]
  }
  return result
}

/**
 * 根据品质获取灵兽光效
 * @param {string} quality - 品质: common/uncommon/rare/epic/legendary/mythical
 * @returns {*} 光效资源
 */
export function getGlowByQuality(quality) {
  const glowMap = {
    common: 'common',
    uncommon: 'uncommon',
    rare: 'rare',
    epic: 'epic',
    legendary: 'legendary',
    mythical: 'mythical'
  }
  return Resources.glow[glowMap[quality] || 'common']
}

/**
 * 根据品质获取装备图标
 * @param {string} type - 装备类型: sword/blade/staff/helmet/armor/boots/ring/necklace
 * @param {string} quality - 品质
 * @returns {*} 装备资源
 */
export function getEquipmentIcon(type, quality) {
  const qualityMap = {
    common: 'common',
    uncommon: 'uncommon',
    rare: 'rare',
    epic: 'epic',
    legendary: 'legendary',
    mythical: 'mythical'
  }
  return Resources.equipment[type]?.[qualityMap[quality] || 'common']
}

/**
 * 根据境界获取主角立绘
 * @param {string} gender - 性别: male/female
 * @param {number} realm - 境界等级 (1-8)
 * @returns {*} 主角资源
 */
export function getPlayerImage(gender, realm) {
  const realmMap = {
    1: 'mortal',   // 凡人
    2: 'qi',        // 练气
    3: 'zhuJi',     // 筑基
    4: 'jinDan',    // 金丹
    5: 'yuanYing',  // 元婴
    6: 'huaShen',   // 化神
    7: 'duJie',     // 渡劫
    8: 'xianWang'   // 仙王
  }
  return Resources.player[gender]?.[realmMap[realm] || 'mortal']
}

/**
 * 根据境界获取特效
 * @param {number} realm - 境界等级 (1-7)
 * @returns {*} 特效资源
 */
export function getRealmEffect(realm) {
  const effectMap = {
    2: 'qiWhite',
    3: 'zhuJiGold',
    4: 'jinDanRainbow',
    5: 'yuanYingShadow',
    6: 'huaShenFaxiang',
    7: 'duJieTianlei'
  }
  return Resources.effect[effectMap[realm]]
}

/**
 * 获取物品图标
 * @param {string} type - 类型: pill/material/chest
 * @param {string} name - 物品名
 * @returns {*} 物品资源
 */
export function getItemIcon(type, name) {
  return Resources[type]?.[name]
}

export default {
  getResource,
  getGlowByQuality,
  getEquipmentIcon,
  getPlayerImage,
  getRealmEffect,
  getItemIcon
}
