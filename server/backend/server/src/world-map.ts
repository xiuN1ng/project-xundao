/**
 * 世界地图系统 - 全地图解锁
 * 提供地图解锁、探索进度等功能
 */

import { Router, Request, Response } from 'express';

const router = Router();

// 地图解锁数据
interface WorldMapData {
  playerId: string;
  unlockedMaps: string[];
  explorationProgress: Record<string, number>;
  lastUpdate: number;
}

// 玩家世界地图数据存储
const worldMapStore: Map<string, WorldMapData> = new Map();

// 地图配置
const MAP_CONFIG = {
  '新手村': { requiredLevel: 1, requiredQuest: null },
  '青云山': { requiredLevel: 5, requiredQuest: 'quest_1' },
  '落日森林': { requiredLevel: 10, requiredQuest: 'quest_5' },
  '寒冰深渊': { requiredLevel: 20, requiredQuest: 'quest_10' },
  '烈焰山谷': { requiredLevel: 30, requiredQuest: 'quest_15' },
  '雷霆峡谷': { requiredLevel: 40, requiredQuest: 'quest_20' },
  '仙灵岛': { requiredLevel: 50, requiredQuest: 'quest_25' },
  '神魔战场': { requiredLevel: 60, requiredQuest: 'quest_30' },
  '天宫': { requiredLevel: 70, requiredQuest: 'quest_35' },
  '混沌虚空': { requiredLevel: 80, requiredQuest: 'quest_40' },
};

// 初始化玩家世界地图数据
export function initWorldMap(playerId: string): WorldMapData {
  const data: WorldMapData = {
    playerId,
    unlockedMaps: ['新手村'],
    explorationProgress: { '新手村': 100 },
    lastUpdate: Date.now(),
  };
  worldMapStore.set(playerId, data);
  return data;
}

// 获取玩家世界地图数据
router.get('/world-map/:playerId', (req: Request, res: Response) => {
  const { playerId } = req.params;
  
  let mapData = worldMapStore.get(playerId);
  if (!mapData) {
    mapData = initWorldMap(playerId);
  }
  
  res.json({
    success: true,
    data: {
      ...mapData,
      availableMaps: Object.keys(MAP_CONFIG).filter(mapName => {
        const config = MAP_CONFIG[mapName as keyof typeof MAP_CONFIG];
        return mapData!.unlockedMaps.includes(mapName) || 
               (mapData!.unlockedMaps.includes('新手村') && config.requiredLevel <= 5);
      })
    }
  });
});

// 解锁地图
router.post('/world-map/unlock', (req: Request, res: Response) => {
  const { playerId, mapName } = req.body;
  
  if (!playerId || !mapName) {
    return res.json({ success: false, message: '参数不完整' });
  }
  
  let mapData = worldMapStore.get(playerId);
  if (!mapData) {
    mapData = initWorldMap(playerId);
  }
  
  const mapConfig = MAP_CONFIG[mapName as keyof typeof MAP_CONFIG];
  if (!mapConfig) {
    return res.json({ success: false, message: '地图不存在' });
  }
  
  if (mapData.unlockedMaps.includes(mapName)) {
    return res.json({ success: false, message: '地图已解锁' });
  }
  
  // 检查解锁条件
  // 简化逻辑：检查前置地图是否已解锁
  const mapOrder = Object.keys(MAP_CONFIG);
  const currentIndex = mapOrder.indexOf(mapName);
  if (currentIndex > 0) {
    const prevMap = mapOrder[currentIndex - 1];
    if (!mapData.unlockedMaps.includes(prevMap)) {
      return res.json({ success: false, message: `需要先解锁 ${prevMap}` });
    }
  }
  
  mapData.unlockedMaps.push(mapName);
  mapData.explorationProgress[mapName] = 0;
  mapData.lastUpdate = Date.now();
  worldMapStore.set(playerId, mapData);
  
  res.json({
    success: true,
    message: `成功解锁 ${mapName}`,
    data: mapData
  });
});

// 更新探索进度
router.post('/world-map/explore', (req: Request, res: Response) => {
  const { playerId, mapName, progress } = req.body;
  
  if (!playerId || !mapName) {
    return res.json({ success: false, message: '参数不完整' });
  }
  
  let mapData = worldMapStore.get(playerId);
  if (!mapData) {
    return res.json({ success: false, message: '玩家数据不存在' });
  }
  
  if (!mapData.unlockedMaps.includes(mapName)) {
    return res.json({ success: false, message: '请先解锁该地图' });
  }
  
  mapData.explorationProgress[mapName] = Math.min(100, Math.max(0, progress));
  mapData.lastUpdate = Date.now();
  worldMapStore.set(playerId, mapData);
  
  // 探索度达到100%奖励
  if (mapData.explorationProgress[mapName] === 100) {
    return res.json({
      success: true,
      message: '探索完成！获得奖励',
      data: mapData,
      reward: { spirit: 1000, gold: 500 }
    });
  }
  
  res.json({
    success: true,
    data: mapData
  });
});

// 获取地图列表
router.get('/world-map/list', (req: Request, res: Response) => {
  const maps = Object.entries(MAP_CONFIG).map(([name, config]) => ({
    name,
    requiredLevel: config.requiredLevel,
    requiredQuest: config.requiredQuest
  }));
  
  res.json({
    success: true,
    data: maps
  });
});

export default router;
