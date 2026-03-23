/**
 * 社交系统 v1.0
 * 好友/聊天/互动/动态
 */

// ==================== 虚拟好友数据 ====================
const VIRTUAL_PLAYERS = [
  { id: '剑仙李白', level: 150, realm: '大乘期', sect: '蜀山剑派', avatar: '⚔️', online: true },
  { id: '丹帝华尘', level: 120, realm: '化神期', sect: '灵丹宗', avatar: '⚗️', online: true },
  { id: '阵法真人', level: 100, realm: '合体期', sect: '阵道门', avatar: '🌀', online: false },
  { id: '灵兽仙子', level: 80, realm: '大乘期', sect: '万兽山', avatar: '🦊', online: true },
  { id: '炼器大师', level: 90, realm: '合体期', sect: '神兵阁', avatar: '🔨', online: false },
  { id: '筑基修士张三', level: 20, realm: '筑基期', sect: '散修', avatar: '🧑', online: true },
  { id: '结丹修士李四', level: 45, realm: '结丹期', sect: '青云宗', avatar: '👨', online: true },
  { id: '元婴老怪', level: 110, realm: '元婴期', sect: '魔道', avatar: '👴', online: false },
  { id: '飞升仙人', level: 200, realm: '仙人', sect: '天庭', avatar: '🧚', online: true },
  { id: '散修王五', level: 30, realm: '金丹期', sect: '散修', avatar: '🏃', online: true }
];

// ==================== 礼物数据 ====================
const GIFTS = {
  'flower': { name: '鲜花', icon: '🌸', price: 10, charm: 1 },
  'heart': { name: '爱心', icon: '❤️', price: 50, charm: 5 },
  'diamond': { name: '钻石', icon: '💎', price: 200, charm: 20 },
  'car': { name: '跑车', icon: '🚗', price: 1000, charm: 100 },
  'mansion': { name: '别墅', icon: '🏰', price: 5000, charm: 500 },
  'airship': { name: '飞舟', icon: '🛸', price: 10000, charm: 1000 }
};

// ==================== 社交数据 ====================
let socialData = {
  friends: {},           // friendId: { addedAt, lastInteract, giftCount, visitCount, likeCount, receivedLikes }
  messages: [],          // [{ from, to, content, timestamp, read }]
  dynamics: [],          // [{ friendId, type, content, timestamp }]
  likes: {},             // friendId: count (今日点赞数)
  lastLikeReset: 0
};

// ==================== 初始化虚拟好友关系 ====================
function initSocialSystem() {
  // 初始随机添加3个虚拟好友
  const randomFriends = VIRTUAL_PLAYERS.sort(() => 0.5 - Math.random()).slice(0, 3);
  randomFriends.forEach(p => {
    if (!socialData.friends[p.id]) {
      socialData.friends[p.id] = {
        addedAt: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
        lastInteract: Date.now(),
        giftCount: Math.floor(Math.random() * 5),
        visitCount: Math.floor(Math.random() * 3),
        likeCount: Math.floor(Math.random() * 10),
        receivedLikes: Math.floor(Math.random() * 20)
      };
    }
  });

  // 初始化一些动态
  initSocialDynamics();

  // 初始化一些消息
  initSocialMessages();
}

function initSocialDynamics() {
  if (socialData.dynamics.length > 0) return;

  const friendIds = Object.keys(socialData.friends);
  friendIds.forEach(friendId => {
    const friend = VIRTUAL_PLAYERS.find(p => p.id === friendId);
    if (friend) {
      // 随机动态
      const types = ['level_up', 'realm_break', 'achievement', 'gift'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      let content = '';
      switch(type) {
        case 'level_up':
          content = `修炼等级提升到了 ${friend.level + Math.floor(Math.random() * 5)} 级！`;
          break;
        case 'realm_break':
          content = `突破境界，达到了 ${friend.realm}！`;
          break;
        case 'achievement':
          content = `获得了新成就：${['修炼达人', '战斗高手', '财富自由', '社交达人'][Math.floor(Math.random() * 4)]}！`;
          break;
        case 'gift':
          content = `收到了一份神秘礼物！`;
          break;
      }
      
      socialData.dynamics.push({
        friendId: friendId,
        type: type,
        content: content,
        timestamp: Date.now() - Math.random() * 24 * 60 * 60 * 1000
      });
    }
  });
}

function initSocialMessages() {
  if (socialData.messages.length > 0) return;

  const friendIds = Object.keys(socialData.friends);
  friendIds.forEach(friendId => {
    const friend = VIRTUAL_PLAYERS.find(p => p.id === friendId);
    if (friend && Math.random() > 0.5) {
      const greetings = [
        '的道友，最近修炼可好？',
        ' sir，一起组队刷副本吗？',
        '，最近有什么奇遇吗？',
        '，有空来我宗门坐坐~',
        '，灵气够用吗？'
      ];
      
      socialData.messages.push({
        from: friendId,
        to: gameState.player.name,
        content: '你好' + greetings[Math.floor(Math.random() * greetings.length)],
        timestamp: Date.now() - Math.random() * 12 * 60 * 60 * 1000,
        read: false
      });
    }
  });
}

// ==================== 好友系统 ====================
function addFriend(friendId) {
  if (socialData.friends[friendId]) {
    return { success: false, message: '已经是好友了' };
  }

  const player = VIRTUAL_PLAYERS.find(p => p.id === friendId);
  if (!player) {
    return { success: false, message: '玩家不存在' };
  }

  // 最多50个好友
  if (Object.keys(socialData.friends).length >= 50) {
    return { success: false, message: '好友数已达上限(50)' };
  }

  socialData.friends[friendId] = {
    addedAt: Date.now(),
    lastInteract: Date.now(),
    giftCount: 0,
    visitCount: 0,
    likeCount: 0,
    receivedLikes: 0
  };

  // 添加动态
  addSocialDynamic(friendId, 'friend_add', '成为了你的好友');

  return { success: true, message: `✅ 成功添加 ${friendId} 为好友！` };
}

function removeFriend(friendId) {
  if (!socialData.friends[friendId]) {
    return { success: false, message: '不是您的好友' };
  }

  delete socialData.friends[friendId];
  return { success: true, message: `已删除好友 ${friendId}` };
}

function getFriendList() {
  return Object.entries(socialData.friends).map(([id, data]) => {
    const player = VIRTUAL_PLAYERS.find(p => p.id === id);
    return {
      id: id,
      ...data,
      level: player?.level || 1,
      realm: player?.realm || '凡人',
      avatar: player?.avatar || '🧑',
      online: player?.online || false
    };
  }).sort((a, b) => b.lastInteract - a.lastInteract);
}

function getRecommendFriends() {
  const currentFriendIds = Object.keys(socialData.friends);
  return VIRTUAL_PLAYERS.filter(p => !currentFriendIds.includes(p.id)).slice(0, 10);
}

// ==================== 聊天系统 ====================
function sendMessage(to, content) {
  if (!content.trim()) {
    return { success: false, message: '消息不能为空' };
  }

  if (!socialData.friends[to]) {
    return { success: false, message: '不是您的好友' };
  }

  const message = {
    from: gameState.player.name,
    to: to,
    content: content,
    timestamp: Date.now(),
    read: true
  };

  socialData.messages.push(message);

  // 更新最后互动时间
  socialData.friends[to].lastInteract = Date.now();

  // 模拟回复
  setTimeout(() => {
    simulateReply(to);
  }, 1000 + Math.random() * 2000);

  return { success: true, message: '消息已发送' };
}

function simulateReply(friendId) {
  const friend = VIRTUAL_PLAYERS.find(p => p.id === friendId);
  if (!friend) return;

  const replies = [
    '哈哈，的道友真有趣~',
    '收到！我这边正在修炼',
    '最近境界有些松动，可能要突破了',
    '要不要一起去打副本？',
    '灵石够用吗？我可以借你点',
    '听说最近有秘境开启',
    '来我宗门喝茶吧~',
    '正在闭关，下次聊',
    '哈哈，同道中人！',
    '今日修炼收获如何？'
  ];

  const message = {
    from: friendId,
    to: gameState.player.name,
    content: replies[Math.floor(Math.random() * replies.length)],
    timestamp: Date.now(),
    read: false
  };

  socialData.messages.push(message);

  // 更新UI如果有聊天窗口打开
  if (window.currentChatFriend === friendId) {
    renderChatMessages();
  }
}

function getMessages(friendId) {
  return socialData.messages.filter(m => 
    (m.from === gameState.player.name && m.to === friendId) ||
    (m.from === friendId && m.to === gameState.player.name)
  ).sort((a, b) => a.timestamp - b.timestamp);
}

function getUnreadCount(friendId) {
  return socialData.messages.filter(m => 
    m.from === friendId && m.to === gameState.player.name && !m.read
  ).length;
}

function markMessagesRead(friendId) {
  socialData.messages.forEach(m => {
    if (m.from === friendId && m.to === gameState.player.name) {
      m.read = true;
    }
  });
}

function getTotalUnreadCount() {
  return socialData.messages.filter(m => 
    m.to === gameState.player.name && !m.read
  ).length;
}

// ==================== 互动功能 ====================
function likeFriend(friendId) {
  if (!socialData.friends[friendId]) {
    return { success: false, message: '不是您的好友' };
  }

  // 重置每日点赞
  const today = new Date().setHours(0, 0, 0, 0);
  if (socialData.lastLikeReset < today) {
    socialData.likes = {};
    socialData.lastLikeReset = today;
  }

  // 检查今日点赞次数
  if (!socialData.likes[friendId]) {
    socialData.likes[friendId] = 0;
  }

  if (socialData.likes[friendId] >= 10) {
    return { success: false, message: '今日点赞次数已用完' };
  }

  socialData.likes[friendId]++;
  socialData.friends[friendId].likeCount++;
  socialData.friends[friendId].receivedLikes++;
  socialData.friends[friendId].lastInteract = Date.now();

  // 添加动态
  addSocialDynamic(friendId, 'like', '为你点赞');

  return { success: true, message: `❤️ 点赞了 ${friendId}` };
}

function sendGift(friendId, giftId) {
  if (!socialData.friends[friendId]) {
    return { success: false, message: '不是您的好友' };
  }

  const gift = GIFTS[giftId];
  if (!gift) {
    return { success: false, message: '礼物不存在' };
  }

  if (gameState.player.spiritStones < gift.price) {
    return { success: false, message: `灵石不足，需要 ${gift.price} 灵石` };
  }

  gameState.player.spiritStones -= gift.price;
  socialData.friends[friendId].giftCount++;
  socialData.friends[friendId].lastInteract = Date.now();

  // 添加动态
  addSocialDynamic(friendId, 'gift', `送来了 ${gift.icon}${gift.name}`);

  return { success: true, message: `🎁 送给 ${friendId} ${gift.icon}${gift.name}！魅力+${gift.charm}` };
}

function visitFriend(friendId) {
  if (!socialData.friends[friendId]) {
    return { success: false, message: '不是您的好友' };
  }

  const friend = VIRTUAL_PLAYERS.find(p => p.id === friendId);
  if (!friend) {
    return { success: false, message: '玩家不存在' };
  }

  socialData.friends[friendId].visitCount++;
  socialData.friends[friendId].lastInteract = Date.now();

  // 拜访奖励
  const expGain = friend.level * 10;
  const spiritGain = friend.level * 5;

  gameState.player.experience += expGain;
  gameState.player.spirit += spiritGain;

  return { 
    success: true, 
    message: `🏠 拜访了 ${friendId}，获得 ${expGain} 经验和 ${spiritGain} 灵气！`
  };
}

// ==================== 好友动态 ====================
function addSocialDynamic(friendId, type, content) {
  socialData.dynamics.unshift({
    friendId: friendId,
    type: type,
    content: content,
    timestamp: Date.now()
  });

  // 最多保留100条动态
  if (socialData.dynamics.length > 100) {
    socialData.dynamics = socialData.dynamics.slice(0, 100);
  }
}

function getSocialDynamics(limit = 20) {
  return socialData.dynamics.slice(0, limit).map(d => {
    const friend = VIRTUAL_PLAYERS.find(p => p.id === d.friendId);
    return {
      ...d,
      avatar: friend?.avatar || '🧑',
      friendLevel: friend?.level || 1
    };
  });
}

// ==================== 社交加成 ====================
function getSocialBonus() {
  const friends = Object.keys(socialData.friends);
  const onlineFriends = friends.filter(id => {
    const p = VIRTUAL_PLAYERS.find(vp => vp.id === id);
    return p?.online;
  });

  // 好友数量加成
  const friendCount = Math.min(friends.length, 20);
  const friendBonus = 1 + friendCount * 0.02;

  // 在线好友加成
  const onlineBonus = 1 + onlineFriends.length * 0.05;

  return {
    friendCount: friends.length,
    onlineCount: onlineFriends.length,
    expRate: friendBonus,
    spiritRate: friendBonus,
    dropRate: onlineBonus
  };
}

// ==================== 保存/加载 ====================
function saveSocialData() {
  return JSON.stringify(socialData);
}

function loadSocialData(data) {
  if (data) {
    try {
      socialData = JSON.parse(data);
    } catch (e) {
      console.error('加载社交数据失败', e);
    }
  }
}

// 导出到全局
window.VIRTUAL_PLAYERS = VIRTUAL_PLAYERS;
window.GIFTS = GIFTS;
window.socialData = socialData;
window.initSocialSystem = initSocialSystem;
window.addFriend = addFriend;
window.removeFriend = removeFriend;
window.getFriendList = getFriendList;
window.getRecommendFriends = getRecommendFriends;
window.sendMessage = sendMessage;
window.getMessages = getMessages;
window.getUnreadCount = getUnreadCount;
window.getTotalUnreadCount = getTotalUnreadCount;
window.markMessagesRead = markMessagesRead;
window.likeFriend = likeFriend;
window.sendGift = sendGift;
window.visitFriend = visitFriend;
window.getSocialDynamics = getSocialDynamics;
window.getSocialBonus = getSocialBonus;
window.saveSocialData = saveSocialData;
window.loadSocialData = loadSocialData;

console.log('👥 社交系统 v1.0 已加载');
