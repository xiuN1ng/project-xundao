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
export const fishingApi = { get: () => api.get('/fishing'), cast: () => api.post('/fishing/cast'), catch: () => api.post('/fishing/catch') }
export const secretApi = { get: () => api.get('/secret'), unlock: () => api.post('/secret/unlock'), enter: () => api.post('/secret/enter') }
export const titleApi = { get: () => api.get('/title'), activate: (id) => api.post('/title/activate', { id }) }
export const tribulationApi = { getTypes: () => api.get('/api/tribulation/types'), attempt: (data) => api.post('/api/tribulation/attempt', data), preview: (params) => api.get('/api/tribulation/preview', { params }) }
export const abyssApi = {
  getInfo: (userId) => api.get('/api/abyssDungeon/info', { params: { userId } }),
  getFloors: () => api.get('/api/abyssDungeon/floors'),
  getBestiary: () => api.get('/api/abyssDungeon/bestiary'),
  enter: (data) => api.post('/api/abyssDungeon/enter', data),
  battle: (data) => api.post('/api/abyssDungeon/battle', data),
  explore: (data) => api.post('/api/abyssDungeon/explore', data),
  getShop: () => api.get('/api/abyssDungeon/shop'),
  buyShopItem: (data) => api.post('/api/abyssDungeon/shop/buy', data),
  getRankings: () => api.get('/api/abyssDungeon/rankings'),
  getWeeklyReward: () => api.get('/api/abyssDungeon/weekly-reward'),
  claimWeeklyReward: (data) => api.post('/api/abyssDungeon/weekly-reward/claim', data),
}

export default api
