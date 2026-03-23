/**
 * 生成占位符图片
 * 在资源文件不存在时使用
 */

const colors = {
  // UI
  ui: '#4A5568',
  // 主角
  player: '#3182CE',
  // 特效
  effect: '#ED8936',
  // 灵兽
  beast: '#48BB78',
  // 装备
  equipment: '#9F7AEA',
  // 技能
  skill: '#E53E3E',
  // NPC
  npc: '#D69E2E',
  // 怪物
  monster: '#718096',
  // BOSS
  boss: '#DD6B20',
  // 背景
  bg: '#2D3748',
  // 物品
  pill: '#38B2AC',
  // 坐骑
  mount: '#4299E1',
  // 翅膀
  wing: '#B794F4',
  // 战斗
  battle: '#FC8181',
  // 动画
  anim: '#68D391'
}

function generateSVG(width, height, text, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="${color}" rx="4"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="12" font-family="monospace">${text}</text>
  </svg>`
}

console.log('占位符生成器就绪')
console.log('可用颜色:', Object.keys(colors).join(', '))

module.exports = { generateSVG, colors }
