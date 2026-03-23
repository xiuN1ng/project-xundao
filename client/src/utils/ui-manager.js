/**
 * UI管理器 - 提供面板显示/隐藏的统一接口
 * 用于在其他组件或业务逻辑中通过函数调用打开面板
 */

// 存储面板的显示状态（由UI管理器维护）
const panelStates = {
  adventurePanel: false,
  equipmentEnhancePanel: false
}

// 面板显示事件总线（供外部监听）
const panelListeners = {}

/**
 * 显示仙侠奇遇面板
 */
function showAdventurePanel() {
  panelStates.adventurePanel = true
  emit('panel:adventure', { action: 'show' })
}

/**
 * 隐藏仙侠奇遇面板
 */
function hideAdventurePanel() {
  panelStates.adventurePanel = false
  emit('panel:adventure', { action: 'hide' })
}

/**
 * 显示装备强化面板
 */
function showEquipmentEnhancePanel() {
  panelStates.equipmentEnhancePanel = true
  emit('panel:equipment-enhance', { action: 'show' })
}

/**
 * 隐藏装备强化面板
 */
function hideEquipmentEnhancePanel() {
  panelStates.equipmentEnhancePanel = false
  emit('panel:equipment-enhance', { action: 'hide' })
}

/**
 * 获取面板状态
 * @param {string} panelName - 面板名称
 */
function getPanelState(panelName) {
  return panelStates[panelName] || false
}

/**
 * 监听面板事件
 * @param {string} event - 事件名
 * @param {Function} callback - 回调函数
 */
function on(event, callback) {
  if (!panelListeners[event]) panelListeners[event] = []
  panelListeners[event].push(callback)
}

/**
 * 触发面板事件
 * @param {string} event - 事件名
 * @param {object} data - 事件数据
 */
function emit(event, data) {
  if (panelListeners[event]) {
    panelListeners[event].forEach(cb => cb(data))
  }
}

export {
  showAdventurePanel,
  hideAdventurePanel,
  showEquipmentEnhancePanel,
  hideEquipmentEnhancePanel,
  getPanelState,
  on,
  panelStates
}
