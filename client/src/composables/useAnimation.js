import { ref } from 'vue'

// 全局升级动画状态
const upgradeState = ref({
  show: false,
  fromLevel: 0,
  toLevel: 0,
  attributes: [],
  rewards: []
})

// 显示升级动画
function showUpgradeAnimation(options) {
  const { 
    fromLevel = 0, 
    toLevel = 1, 
    attributes = [], 
    rewards = [],
    autoClose = 3000 
  } = options
  
  upgradeState.value = {
    show: true,
    fromLevel,
    toLevel,
    attributes,
    rewards,
    autoClose
  }
}

// 关闭升级动画
function closeUpgradeAnimation() {
  upgradeState.value.show = false
}

// 装备获得动画状态
const equipmentState = ref({
  show: false,
  equipment: null,
  rarity: 'common'
})

// 显示装备获得动画
function showEquipmentAnimation(equipment, rarity = 'common') {
  equipmentState.value = {
    show: true,
    equipment,
    rarity
  }
}

// 关闭装备获得动画
function closeEquipmentAnimation() {
  equipmentState.value.show = false
}

export function useAnimation() {
  return {
    upgradeState,
    showUpgradeAnimation,
    closeUpgradeAnimation,
    equipmentState,
    showEquipmentAnimation,
    closeEquipmentAnimation
  }
}

// 便捷的升级检测函数
export function checkLevelUp(oldLevel, newLevel) {
  if (newLevel > oldLevel) {
    const attributes = []
    
    // 计算属性变化（根据游戏配置）
    // 这里可以根据实际的游戏逻辑添加
    const baseHP = 100
    const hpPerLevel = 20
    const baseAttack = 10
    const attackPerLevel = 2
    
    attributes.push({
      name: '生命值',
      from: baseHP + (oldLevel - 1) * hpPerLevel,
      to: baseHP + (newLevel - 1) * hpPerLevel
    })
    
    attributes.push({
      name: '攻击力',
      from: baseAttack + (oldLevel - 1) * attackPerLevel,
      to: baseAttack + (newLevel - 1) * attackPerLevel
    })
    
    // 默认奖励
    const rewards = [
      { icon: '💎', text: '灵石', value: newLevel * 100 }
    ]
    
    return {
      shouldShow: true,
      fromLevel: oldLevel,
      toLevel: newLevel,
      attributes,
      rewards
    }
  }
  
  return { shouldShow: false }
}
