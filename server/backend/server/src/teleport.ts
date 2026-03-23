/**
 * 传送系统 - 快速传送
 * 提供玩家快速传送功能
 */

import { Router, Request, Response } from 'express';

const router = Router();

// 传送记录
interface TeleportRecord {
  playerId: string;
  targetMap: string;
  cooldownEnd: number;
  teleportCount: number;
}

// 玩家传送数据存储
const teleportStore: Map<string, TeleportRecord> = new Map();

// 传送点配置
const TELEPORT_POINTS = {
  '新手村': [
    { id: 'village_main', name: '村长家', x: 100, y: 100 },
    { id: 'village_shop', name: '杂货铺', x: 200, y: 150 },
    { id: 'village_training', name: '训练场', x: 150, y: 200 },
  ],
  '青云山': [
    { id: 'qingyun_entrance', name: '山脚', x: 300, y: 100 },
    { id: 'qingyun_summit', name: '山顶', x: 400, y: 200 },
  ],
  '落日森林': [
    { id: 'forest_entrance', name: '森林入口', x: 500, y: 100 },
    { id: 'forest_deep', name: '森林深处', x: 600, y: 250 },
  ],
  '寒冰深渊': [
    { id: 'ice_entrance', name: '冰原入口', x: 700, y: 100 },
    { id: 'ice_deep', name: '冰深渊底', x: 800, y: 300 },
  ],
  '烈焰山谷': [
    { id: 'fire_entrance', name: '山谷入口', x: 900, y: 100 },
    { id: 'fire_core', name: '火焰核心', x: 1000, y: 250 },
  ],
  '雷霆峡谷': [
    { id: 'thunder_entrance', name: '峡谷入口', x: 1100, y: 100 },
    { id: 'thunder_core', name: '雷霆核心', x: 1200, y: 300 },
  ],
  '仙灵岛': [
    { id: 'island_dock', name: '码头', x: 1300, y: 100 },
    { id: 'island_palace', name: '仙灵宫', x: 1400, y: 200 },
  ],
  '神魔战场': [
    { id: 'battlefield_entrance', name: '战场入口', x: 1500, y: 100 },
    { id: 'battlefield_core', name: '战场核心', x: 1600, y: 350 },
  ],
  '天宫': [
    { id: 'heaven_gate', name: '南天门', x: 1700, y: 100 },
    { id: 'heaven_palace', name: '凌霄殿', x: 1800, y: 250 },
  ],
  '混沌虚空': [
    { id: 'chaos_entrance', name: '虚空入口', x: 1900, y: 100 },
    { id: 'chaos_core', name: '混沌核心', x: 2000, y: 400 },
  ],
};

// 免费传送次数限制
const FREE_TELEPORT_DAILY = 10;
// VIP传送次数加成
const VIP_TELEPORT_BONUS = 20;
// 传送冷却时间（毫秒）
const TELEPORT_COOLDOWN = 30000;

// 初始化玩家传送数据
function initTeleportData(playerId: string): TeleportRecord {
  const record: TeleportRecord = {
    playerId,
    targetMap: '新手村',
    cooldownEnd: 0,
    teleportCount: 0,
  };
  teleportStore.set(playerId, record);
  return record;
}

// 获取传送点列表
router.get('/teleport/points/:mapName', (req: Request, res: Response) => {
  const { mapName } = req.params;
  
  const points = TELEPORT_POINTS[mapName as keyof typeof TELEPORT_POINTS];
  if (!points) {
    return res.json({ success: false, message: '地图不存在传送点' });
  }
  
  res.json({
    success: true,
    data: points
  });
});

// 获取所有可用传送点
router.get('/teleport/points', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: TELEPORT_POINTS
  });
});

// 执行传送
router.post('/teleport', (req: Request, res: Response) => {
  const { playerId, targetMap, targetPoint } = req.body;
  
  if (!playerId || !targetMap) {
    return res.json({ success: false, message: '参数不完整' });
  }
  
  let record = teleportStore.get(playerId);
  if (!record) {
    record = initTeleportData(playerId);
  }
  
  // 检查冷却
  const now = Date.now();
  if (record.cooldownEnd > now) {
    const remaining = Math.ceil((record.cooldownEnd - now) / 1000);
    return res.json({ 
      success: false, 
      message: `传送冷却中，请等待 ${remaining} 秒`,
      cooldownEnd: record.cooldownEnd
    });
  }
  
  // 检查目标地图是否存在
  const mapPoints = TELEPORT_POINTS[targetMap as keyof typeof TELEPORT_POINTS];
  if (!mapPoints) {
    return res.json({ success: false, message: '目标地图不存在' });
  }
  
  // 获取目标坐标
  let targetX = 0, targetY = 0;
  if (targetPoint) {
    const point = mapPoints.find(p => p.id === targetPoint);
    if (point) {
      targetX = point.x;
      targetY = point.y;
    }
  } else {
    // 默认传送到第一个传送点
    targetX = mapPoints[0].x;
    targetY = mapPoints[0].y;
  }
  
  // 更新传送记录
  record.targetMap = targetMap;
  record.cooldownEnd = now + TELEPORT_COOLDOWN;
  record.teleportCount++;
  teleportStore.set(playerId, record);
  
  res.json({
    success: true,
    message: `成功传送到 ${targetMap}`,
    data: {
      map: targetMap,
      x: targetX,
      y: targetY,
      cooldownEnd: record.cooldownEnd,
      teleportCount: record.teleportCount
    }
  });
});

// 获取传送冷却状态
router.get('/teleport/cooldown/:playerId', (req: Request, res: Response) => {
  const { playerId } = req.params;
  
  let record = teleportStore.get(playerId);
  if (!record) {
    record = initTeleportData(playerId);
  }
  
  const now = Date.now();
  const onCooldown = record.cooldownEnd > now;
  
  res.json({
    success: true,
    data: {
      onCooldown,
      cooldownEnd: record.cooldownEnd,
      remainingSeconds: onCooldown ? Math.ceil((record.cooldownEnd - now) / 1000) : 0,
      teleportCount: record.teleportCount
    }
  });
});

// 跨服传送（高级功能）
router.post('/teleport/cross-server', (req: Request, res: Response) => {
  const { playerId, serverId, targetMap } = req.body;
  
  if (!playerId || !serverId || !targetMap) {
    return res.json({ success: false, message: '参数不完整' });
  }
  
  // 跨服传送需要更长的冷却时间
  let record = teleportStore.get(playerId);
  if (!record) {
    record = initTeleportData(playerId);
  }
  
  const now = Date.now();
  const crossServerCooldown = 300000; // 5分钟冷却
  
  if (record.cooldownEnd > now) {
    const remaining = Math.ceil((record.cooldownEnd - now) / 1000);
    return res.json({ 
      success: false, 
      message: `跨服传送冷却中，请等待 ${remaining} 秒`
    });
  }
  
  record.cooldownEnd = now + crossServerCooldown;
  record.teleportCount += 5; // 跨服传送计5次
  teleportStore.set(playerId, record);
  
  res.json({
    success: true,
    message: `成功传送到 ${serverId} 服务器的 ${targetMap}`,
    data: {
      serverId,
      map: targetMap,
      cooldownEnd: record.cooldownEnd
    }
  });
});

export default router;
