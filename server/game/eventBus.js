/**
 * 中央事件总线 - 游戏后端事件驱动基础设施
 * 
 * 使用 EventEmitter 实现模块间松耦合通信
 * 
 * 事件列表:
 *   cultivation:start       - 修炼开始 (params: {userId, gain})
 *   cultivation:breakthrough - 境界突破 (params: {userId, newRealm})
 *   chapter:complete        - 章节通关 (params: {userId, chapterId})
 *   chapter:battle          - 章节战斗胜利 (params: {userId, chapterId})
 *   arena:challenge         - 竞技场挑战完成 (params: {userId, win, combatPower})
 *   forge:make              - 锻造完成 (params: {userId, recipeId, quality})
 *   dungeon:complete       - 副本通关 (params: {userId, dungeonId})
 *   shop:buy                - 商店购买 (params: {userId, itemId, cost})
 *   friend:add              - 添加好友 (params: {userId, friendId})
 *   beast:obtain            - 获得灵兽 (params: {userId, beastId})
 *   login                   - 每日登录 (params: {userId})
 */

const { EventEmitter } = require('events');

const eventBus = new EventEmitter();

// 设置最大监听器数量（防止内存泄漏警告）
eventBus.setMaxListeners(100);

// 便捷方法：发送事件并自动处理异常
function emit(event, data) {
  try {
    eventBus.emit(event, data);
  } catch (e) {
    console.error(`[eventBus] emit '${event}' error:`, e.message);
  }
}

// 便捷方法：注册监听器（自动异常处理）
function on(event, listener) {
  const wrapped = (...args) => {
    try {
      listener(...args);
    } catch (e) {
      console.error(`[eventBus] listener for '${event}' error:`, e.message);
    }
  };
  eventBus.on(event, wrapped);
  return wrapped;
}

// 便捷方法：单次监听
function once(event, listener) {
  const wrapped = (...args) => {
    try {
      listener(...args);
    } catch (e) {
      console.error(`[eventBus] once listener for '${event}' error:`, e.message);
    }
  };
  eventBus.once(event, wrapped);
}

module.exports = { eventBus, emit, on, once };
