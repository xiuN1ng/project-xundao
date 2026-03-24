import axios from 'axios'
const API_BASE = 'http://localhost:3001/api'
const api = axios.create({ baseURL: API_BASE, timeout: 10000 })

export const playerApi = { get: () => api.get('/player'), update: (data) => api.put('/player', data), getResources: () => api.get('/player/resources'), addResources: (data) => api.post('/player/resources', data) }
export const cultivationApi = { get: () => api.get('/cultivation'), start: () => api.post('/cultivation/start'), breakthrough: () => api.post('/cultivation/breakthrough') }
export const sectApi = {
  get: () => api.get('/sect'),
  getInfo: (playerId) => api.get('/sect/info', { params: { player_id: playerId } }),
  getBonus: (playerId) => api.get('/sect/bonus', { params: { player_id: playerId } }),
  create: (name) => api.post('/sect/create', { name }),
  upgradeBuilding: (buildingId) => api.post('/sect/building/upgrade', { buildingId }),
  // 成员管理
  getMembers: (playerId) => api.get('/sect/members', { params: { player_id: playerId } }),
  kickMember: (playerId, targetId) => api.post('/sect/member/kick', { player_id: playerId, target_id: targetId }),
  promoteMember: (playerId, targetId, newRole) => api.post('/sect/member/promote', { player_id: playerId, target_id: targetId, new_role: newRole }),
  transferLeader: (playerId, targetId) => api.post('/sect/member/transfer', { player_id: playerId, target_id: targetId }),
  // 宗门技能
  getSkills: (playerId) => api.get('/sect/skills', { params: { player_id: playerId } }),
  learnSkill: (playerId, skillKey) => api.post('/sect/skill/learn', { player_id: playerId, skill_key: skillKey }),
  // 宗门副本
  getDungeon: (playerId) => api.get('/sect/dungeon', { params: { player_id: playerId } }),
  challengeDungeon: (playerId, floor, difficulty) => api.post('/sect/dungeon/challenge', { player_id: playerId, floor, difficulty }),
  // 红包
  getRedPackets: (playerId) => api.get('/sect/redpackets', { params: { player_id: playerId } }),
  sendRedPacket: (playerId, amount, type, message) => api.post('/sect/redpacket/send', { player_id: playerId, amount, type, message }),
  claimRedPacket: (playerId, packetId) => api.post('/sect/redpacket/claim', { player_id: playerId, packet_id: packetId }),
  // 管理
  getAdmin: (playerId) => api.get('/sect/admin', { params: { player_id: playerId } }),
  // 捐赠
  donate: (playerId, amount) => api.post('/sect/donate', { player_id: playerId, amount })
}
export const battleApi = { get: () => api.get('/battle'), challenge: (opponentId) => api.post('/battle/challenge', { opponentId }) }
export const shopApi = { getList: (category) => api.get('/shop', { params: { category } }), buy: (itemId) => api.post('/shop/buy', { itemId }) }
export const beastApi = { getList: () => api.get('/beast/my/list'), capture: (beastId) => api.post('/beast/capture', { beastId }), upgrade: (beastId) => api.post('/beast/upgrade', { beastId }) }
export const questApi = { get: () => api.get('/quest'), claim: (id) => api.post('/quest/claim', { id }) }
export const mailApi = { getList: () => api.get('/mail/list'), read: (mailId) => api.post('/mail/read', { mailId }), claim: (attId) => api.post('/mail/claim', { attId }) }
export const achievementApi = { get: () => api.get('/achievement'), claim: (id) => api.post('/achievement/claim', { id }) }
export const activityApi = { get: () => api.get('/activity'), signin: () => api.post('/activity/signin'), claim: (id) => api.post('/activity/claim', { id }) }
export const lotteryApi = { get: () => api.get('/lottery'), draw: () => api.post('/lottery/draw') }
export const rankApi = { get: () => api.get('/rank') }
export const dungeonApi = { get: () => api.get('/dungeon'), enter: (id) => api.post('/dungeon/enter', { id }) }
export const worldbossApi = { get: () => api.get('/worldboss'), attack: (damage) => api.post('/worldboss/attack', { damage }) }
export const towerApi = { get: () => api.get('/tower'), enter: (floor) => api.post('/tower/enter', { floor }) }
export const bagApi = { get: () => api.get('/bag'), use: (id) => api.post('/bag/use', { id }) }
export const equipmentApi = { 
  get: (userId) => api.get(`/equipment/${userId}`), 
  getEquipped: (userId) => api.get(`/equipment/${userId}/equipped`),
  equip: (userId, equipmentId) => api.post('/equipment/equip', { userId, equipmentId }),
  unequip: (userId, equipmentId) => api.post('/equipment/unequip', { userId, equipmentId }),
  getSets: (userId) => api.get(`/equipment/sets/${userId}`),
  getSetConfig: () => api.get('/equipment/sets/config/all'),
  // 强化 (refine) +1~+15
  refine: (userId, equipId) => api.post('/equipment/refine', { userId, equipId }),
  // 增幅 (augment) 红字属性
  augment: (userId, equipId, bonusType) => api.post('/equipment/augment', { userId, equipId, bonusType }),
  // 打孔 (socket)
  socketAdd: (userId, equipId) => api.post('/equipment/socket/add', { userId, equipId }),
  socketInlay: (userId, equipId, gemId, socketIndex) => api.post('/equipment/socket/inlay', { userId, equipId, gemId, socketIndex }),
  socketRemove: (userId, equipId, socketIndex) => api.post('/equipment/socket/remove', { userId, equipId, socketIndex }),
  // 继承 (sourceEquipId/targetEquipId 是后端期望的字段名)
  inherit: (userId, sourceEquipId, targetEquipId) => api.post('/equipment/inherit', { userId, sourceEquipId, targetEquipId }),
  // 玩家资源（灵石/强化石/增幅券）
  getPlayer: (userId) => api.get(`/equipment/player/${userId}`),
  // 增幅历史
  getAugmentHistory: (equipId) => api.get(`/equipment/augment/history/${equipId}`),
  // 宝石列表
  getGems: () => api.get('/equipment/gems'),
}
export const mountApi = {
  get: (playerId) => api.get('/mount', { params: { player_id: playerId } }),
  getMarket: (playerId) => api.get('/mount/market', { params: { player_id: playerId } }),
  getTemplates: () => api.get('/mount/templates'),
  getSkills: (mountId) => api.get('/mount/skills', { params: { mount_id: mountId } }),
  buy: (playerId, mountId) => api.post('/mount/buy', { player_id: playerId, mount_id: mountId }),
  activate: (playerId, mountId) => api.post('/mount/activate', { player_id: playerId, mount_id: mountId }),
  feed: (playerId, mountId, feedType) => api.post('/mount/feed', { player_id: playerId, mount_id: mountId, feed_type: feedType })
}
export const wingApi = { get: () => api.get('/wing'), activate: (id) => api.post('/wing/activate', { id }) }
export const gemApi = { get: () => api.get('/gem'), embed: (data) => api.post('/gem/embed', data) }
export const fashionApi = { get: () => api.get('/fashion'), equip: (id) => api.post('/fashion/equip', { id }) }
export const vipApi = { get: () => api.get('/vip'), buy: () => api.post('/vip/buy') }
export const friendApi = { get: () => api.get('/friend'), add: (name) => api.post('/friend/add', { name }), accept: (id) => api.post('/friend/accept', { id }) }
export const auctionApi = { get: () => api.get('/auction'), bid: (id) => api.post('/auction/bid', { id }) }
export const caveApi = { get: () => api.get('/cave'), mine: () => api.post('/cave/mine') }
export const guildApi = {
  // 获取仙盟列表
  getList: (params) => api.get('/guild/list', { params }),
  // 获取仙盟详情
  getGuild: (guildId) => api.get(`/guild/${guildId}`),
  // 获取玩家所属仙盟
  getPlayerGuild: (playerId) => api.get(`/guild/player/${playerId}`),
  // 创建仙盟
  create: (userId, name, leaderName) => api.post('/guild/create', { userId, name, leaderName }),
  // 加入仙盟
  join: (userId, userName, guildId) => api.post('/guild/join', { userId, userName, guildId }),
  // 退出仙盟
  leave: (userId, guildId) => api.post('/guild/leave', { userId, guildId }),
  // 修改公告
  updateNotice: (userId, guildId, notice) => api.post('/guild/notice', { userId, guildId, notice }),
  // 升级仙盟技能
  upgradeSkill: (userId, guildId, skillId) => api.post('/guild/skill/upgrade', { userId, guildId, skillId }),
  // 获取仙盟技能
  getSkills: (guildId) => api.get(`/guild/skill/${guildId}`),
  // --- 以下功能后端暂未实现，保留 stub 接口 ---
  donate: (playerId, amount) => api.post('/guild/donate', { playerId, amount }),
  promoteMember: (playerId, targetId, newRole) => api.post('/guild/member/promote', { playerId, targetId, newRole }),
  kickMember: (playerId, targetId) => api.post('/guild/member/kick', { playerId, targetId }),
  transferLeader: (playerId, targetId) => api.post('/guild/leader/transfer', { playerId, targetId }),
}
export const fishingApi = { get: () => api.get('/fishing'), cast: () => api.post('/fishing/cast'), catch: () => api.post('/fishing/catch') }
export const secretApi = { get: () => api.get('/secret'), unlock: () => api.post('/secret/unlock'), enter: () => api.post('/secret/enter') }
export const titleApi = { get: () => api.get('/title'), activate: (id) => api.post('/title/activate', { id }) }
export const tribulationApi = { getTypes: () => api.get('/api/tribulation/types'), attempt: (data) => api.post('/api/tribulation/attempt', data), preview: (params) => api.get('/api/tribulation/preview', { params }) }
export const abyssApi = {
  getConfig: () => api.get('/api/abyssDungeon/config'),
  getList: () => api.get('/api/abyssDungeon/list'),
  getInfo: (dungeonId) => api.get(`/api/abyssDungeon/info/${dungeonId}`),
  enter: (data) => api.post('/api/abyssDungeon/enter', data),
  battle: (data) => api.post('/api/abyssDungeon/battle', data),
  nextLayer: (data) => api.post('/api/abyssDungeon/nextLayer', data),
  claim: (data) => api.post('/api/abyssDungeon/claim', data),
  defeat: (data) => api.post('/api/abyssDungeon/defeat', data),
  getStarRift: () => api.get('/api/abyssDungeon/starRift'),
  starRiftEnter: (data) => api.post('/api/abyssDungeon/starRift/enter', data),
  getStats: () => api.get('/api/abyssDungeon/stats'),
  getRankings: () => api.get('/api/abyssDungeon/rankings'),
  getBoss: (bossId) => api.get(`/api/abyssDungeon/boss/${bossId}`)
}

export const paymentApi = {
  // 获取可购买套餐列表
  getPackages: () => api.get('/payment/packages'),
  // 购买套餐
  purchase: (packageId) => api.post('/payment/purchase', { package_id: packageId }),
  // 领取每日奖励
  claimDaily: () => api.post('/payment/claimDaily'),
  // 获取已购套餐状态
  getMyPackages: () => api.get('/payment/myPackages'),
}

export default api
