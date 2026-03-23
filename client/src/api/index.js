import axios from 'axios'
const API_BASE = 'http://localhost:3001/api'
const api = axios.create({ baseURL: API_BASE, timeout: 10000 })

export const playerApi = { get: () => api.get('/player'), update: (data) => api.put('/player', data), getResources: () => api.get('/player/resources'), addResources: (data) => api.post('/player/resources', data) }
export const cultivationApi = { get: () => api.get('/cultivation'), start: () => api.post('/cultivation/start'), breakthrough: () => api.post('/cultivation/breakthrough') }
export const sectApi = { get: () => api.get('/sect'), create: (name) => api.post('/sect/create', { name }), upgradeBuilding: (buildingId) => api.post('/sect/building/upgrade', { buildingId }) }
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
export const mountApi = { get: () => api.get('/mount'), activate: (id) => api.post('/mount/activate', { id }) }
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

export default api
