/**
 * 好友系统 v1.0
 * 添加好友/互送礼物/好友助力
 */

const FRIEND_DATA = {
  // 好友状态
  'none': { name: '无', color: '#888' },
  'pending': { name: '待确认', color: '#f59e0b' },
  'friends': { name: '好友', color: '#4ecdc4' },
  'blocked': { name: '已拉黑', color: '#ef4444' }
};

// 礼物配置
const GIFT_CONFIG = {
  'stone_10': { name: '10灵石', value: 10, icon: '🪙' },
  'stone_100': { name: '100灵石', value: 100, icon: '💰' },
  'stone_1000': { name: '1000灵石', value: 1000, icon: '💎' },
  'herb': { name: '灵草', value: 50, icon: '🌿' },
  'pill': { name: '丹药', value: 200, icon: '💊' }
};

// 好友状态
let friendState = {
  friends: [],      // 好友列表
  pending: [],     // 待确认
  blocked: [],     // 黑名单
  sentGifts: {},   // 已赠送礼物 {friendId: timestamp}
  receivedGifts: [] // 收到的礼物
};

// 初始化好友系统
function initFriendSystem() {
  const saved = localStorage.getItem('friendState');
  if (saved) {
    friendState = JSON.parse(saved);
  }
  console.log('👥 好友系统已初始化');
}

// 保存好友状态
function saveFriendState() {
  localStorage.setItem('friendState', JSON.stringify(friendState));
}

// 添加好友
function addFriend(playerName) {
  if (!playerName || playerName.trim() === '') {
    return { success: false, message: '请输入玩家名称' };
  }
  
  if (playerName === gameState.player.name) {
    return { success: false, message: '不能添加自己为好友' };
  }
  
  // 检查是否已经是好友
  if (friendState.friends.find(f => f.name === playerName)) {
    return { success: false, message: '已经是好友了' };
  }
  
  // 检查是否在待确认列表
  if (friendState.pending.find(f => f.name === playerName)) {
    return { success: false, message: '已发送过好友申请' };
  }
  
  // 模拟添加好友（单机版随机通过）
  const newFriend = {
    name: playerName,
    level: Math.floor(Math.random() * 100) + 1,
    realm: ['练气', '筑基', '金丹', '元婴', '化神'][Math.floor(Math.random() * 5)],
    addedAt: Date.now(),
    lastInteract: Date.now()
  };
  
  friendState.friends.push(newFriend);
  saveFriendState();
  
  return { success: true, message: `成功添加 ${playerName} 为好友！` };
}

// 接受好友
function acceptFriend(playerName) {
  const pending = friendState.pending.find(f => f.name === playerName);
  if (!pending) {
    return { success: false, message: '没有收到该好友申请' };
  }
  
  // 移到好友列表
  friendState.pending = friendState.pending.filter(f => f.name !== playerName);
  friendState.friends.push({
    ...pending,
    addedAt: Date.now(),
    lastInteract: Date.now()
  });
  saveFriendState();
  
  return { success: true, message: `已添加 ${playerName} 为好友！` };
}

// 拒绝好友
function rejectFriend(playerName) {
  friendState.pending = friendState.pending.filter(f => f.name !== playerName);
  saveFriendState();
  
  return { success: true, message: '已拒绝好友申请' };
}

// 删除好友
function removeFriend(playerName) {
  friendState.friends = friendState.friends.filter(f => f.name !== playerName);
  saveFriendState();
  
  return { success: true, message: `已删除好友 ${playerName}` };
}

// 拉黑好友
function blockFriend(playerName) {
  const friend = friendState.friends.find(f => f.name === playerName);
  if (!friend) {
    return { success: false, message: '好友不存在' };
  }
  
  friendState.friends = friendState.friends.filter(f => f.name !== playerName);
  friendState.blocked.push({
    ...friend,
    blockedAt: Date.now()
  });
  saveFriendState();
  
  return { success: true, message: `已将 ${playerName} 拉黑` };
}

// 送礼物
function sendGift(friendName, giftId) {
  const friend = friendState.friends.find(f => f.name === friendName);
  if (!friend) {
    return { success: false, message: '好友不存在' };
  }
  
  const gift = GIFT_CONFIG[giftId];
  if (!gift) {
    return { success: false, message: '礼物不存在' };
  }
  
  // 检查灵石是否足够
  if (gameState.player.spiritStones < gift.value) {
    return { success: false, message: '灵石不足' };
  }
  
  gameState.player.spiritStones -= gift.value;
  
  // 记录赠送
  friendState.sentGifts[friendName] = Date.now();
  
  // 模拟收到反馈
  friend.lastInteract = Date.now();
  saveFriendState();
  
  return { success: true, message: `送给 ${friend.name} ${gift.name}！` };
}

// 获取好友列表
function getFriends() {
  return friendState.friends;
}

// 获取待确认列表
function getPendingList() {
  return friendState.pending;
}

// 获取好友数量
function getFriendCount() {
  return friendState.friends.length;
}

// 导出
window.FRIEND_DATA = FRIEND_DATA;
window.GIFT_CONFIG = GIFT_CONFIG;
window.friendState = friendState;
window.initFriendSystem = initFriendSystem;
window.addFriend = addFriend;
window.acceptFriend = acceptFriend;
window.rejectFriend = rejectFriend;
window.removeFriend = removeFriend;
window.blockFriend = blockFriend;
window.sendGift = sendGift;
window.getFriends = getFriends;
window.getPendingList = getPendingList;
window.getFriendCount = getFriendCount;

console.log('👥 好友系统 v1.0 已加载');
