/**
 * 灵石副本系统 API
 * 灵石产出副本的HTTP接口
 */

import express, { Request, Response } from 'express'
import { lingShiDungeonSystem, LINGSHI_DUNGEONS, LINGSHI_DUNGEON_CONFIG } from './ling-shi-dungeon'

const router = express.Router()

// ==================== 灵石副本列表 ====================

// GET /api/lingshi-dungeon/list - 获取灵石副本列表
router.get('/list', (req: Request, res: Response) => {
  try {
    const { player_id, player_level } = req.query
    
    const dungeons = LINGSHI_DUNGEONS.map(d => ({
      dungeonId: d.dungeonId,
      name: d.name,
      nameCN: d.nameCN,
      levelRequired: d.levelRequired,
      recommendedPower: d.recommendedPower,
      energyCost: d.energyCost,
      entryCount: d.entryCount,
      resetType: d.resetType,
      baseLingShi: d.baseLingShi,
      lingShiRange: d.lingShiRange,
      stageCount: d.stages.length,
      // 如果有玩家ID，返回玩家状态
      ...(player_id ? { playerStatus: lingShiDungeonSystem.getDungeonStatus(player_id as string, d.dungeonId) } : {})
    }))
    
    res.json({
      success: true,
      data: {
        dungeons,
        config: {
          maxSweepCount: LINGSHI_DUNGEON_CONFIG.sweep.maxSweepCount,
          minSweepLevel: LINGSHI_DUNGEON_CONFIG.sweep.minLevelRequired,
          fastSweepCost: LINGSHI_DUNGEON_CONFIG.sweep.fastSweepCost,
          maxLuck: LINGSHI_DUNGEON_CONFIG.luck.maxLuck
        }
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

// ==================== 灵石副本次数状态 ====================

// GET /api/lingshi-dungeon/status - 获取玩家副本次数状态
router.get('/status', (req: Request, res: Response) => {
  try {
    const { player_id, dungeon_id } = req.query
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' })
    }
    
    if (dungeon_id) {
      const status = lingShiDungeonSystem.getDungeonStatus(player_id as string, dungeon_id as string)
      if (!status) {
        return res.status(404).json({ success: false, error: '副本不存在' })
      }
      res.json({ success: true, data: status })
    } else {
      // 获取所有副本状态
      const allStatus = LINGSHI_DUNGEONS.map(d => ({
        dungeonId: d.dungeonId,
        nameCN: d.nameCN,
        ...lingShiDungeonSystem.getDungeonStatus(player_id as string, d.dungeonId)!
      }))
      res.json({ success: true, data: allStatus })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

// ==================== 进入灵石副本 ====================

// POST /api/lingshi-dungeon/enter - 进入灵石副本
router.post('/enter', (req: Request, res: Response) => {
  try {
    const { player_id, dungeon_id, player_level, player_power } = req.body
    
    if (!player_id || !dungeon_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' })
    }
    
    const result = lingShiDungeonSystem.enterDungeon(player_id, dungeon_id)
    
    res.json({
      success: result.success,
      message: result.message,
      data: result.success ? {
        dungeon: result.dungeon ? {
          dungeonId: result.dungeon.dungeonId,
          name: result.dungeon.name,
          nameCN: result.dungeon.nameCN,
          energyCost: result.dungeon.energyCost,
          baseLingShi: result.dungeon.baseLingShi,
          lingShiRange: result.dungeon.lingShiRange
        } : undefined,
        stage: result.stage ? {
          stageId: result.stage.stageId,
          name: result.stage.name,
          order: result.stage.order,
          enemyCount: result.stage.enemies.length,
          hasBoss: !!result.stage.boss,
          rewardMultiplier: result.stage.rewardMultiplier,
          lingShiBonus: result.stage.lingShiBonus
        } : undefined
      } : undefined
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

// ==================== 挑战关卡 ====================

// POST /api/lingshi-dungeon/battle - 挑战关卡
router.post('/battle', (req: Request, res: Response) => {
  try {
    const { player_id, dungeon_id, stage_id, player_level, player_attack } = req.body
    
    if (!player_id || !dungeon_id || !stage_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' })
    }
    
    const level = parseInt(player_level as string) || 1
    const attack = parseInt(player_attack as string) || 100
    
    const result = lingShiDungeonSystem.battleAndGetDrop(player_id, dungeon_id, stage_id, level, attack)
    
    res.json({
      success: result.success,
      message: result.message,
      data: result.dropResult ? {
        lingShiAmount: result.dropResult.lingShiAmount,
        bonusLingShi: result.dropResult.bonusLingShi,
        totalLingShi: result.dropResult.totalLingShi,
        luckyBonus: result.dropResult.luckyBonus,
        dropItems: result.dropResult.dropItems,
        playerLuck: lingShiDungeonSystem.getPlayerLuck(player_id)
      } : undefined
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

// ==================== 扫荡功能 ====================

// POST /api/lingshi-dungeon/sweep - 扫荡副本
router.post('/sweep', (req: Request, res: Response) => {
  try {
    const { player_id, dungeon_id, sweep_count, player_level } = req.body
    
    if (!player_id || !dungeon_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' })
    }
    
    const count = parseInt(sweep_count as string) || 1
    const level = parseInt(player_level as string) || 1
    
    const result = lingShiDungeonSystem.sweepDungeon(player_id, dungeon_id, count, level)
    
    res.json({
      success: result.success,
      message: result.message,
      data: result.success ? {
        totalLingShi: result.totalLingShi,
        totalItems: result.totalItems,
        sweepCount: count
      } : undefined
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

// POST /api/lingshi-dungeon/fast-sweep - 快速扫荡(元宝)
router.post('/fast-sweep', (req: Request, res: Response) => {
  try {
    const { player_id, dungeon_id, sweep_count, player_level, player_gold } = req.body
    
    if (!player_id || !dungeon_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' })
    }
    
    const count = parseInt(sweep_count as string) || 1
    const level = parseInt(player_level as string) || 1
    const gold = parseInt(player_gold as string) || 0
    
    const result = lingShiDungeonSystem.fastSweepDungeon(player_id, dungeon_id, count, level, gold)
    
    res.json({
      success: result.success,
      message: result.message,
      data: result.success ? {
        totalLingShi: result.totalLingShi,
        totalItems: result.totalItems,
        goldCost: result.goldCost,
        sweepCount: count
      } : undefined
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

// ==================== 幸运值系统 ====================

// GET /api/lingshi-dungeon/luck - 获取玩家幸运值
router.get('/luck', (req: Request, res: Response) => {
  try {
    const { player_id } = req.query
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' })
    }
    
    const luck = lingShiDungeonSystem.getPlayerLuck(player_id as string)
    
    res.json({
      success: true,
      data: {
        playerId: player_id,
        luck,
        maxLuck: LINGSHI_DUNGEON_CONFIG.luck.maxLuck,
        guaranteedDropThreshold: LINGSHI_DUNGEON_CONFIG.luck.guaranteedDrop.threshold,
        guaranteedDropRate: LINGSHI_DUNGEON_CONFIG.luck.guaranteedDrop.bonusRate
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

// POST /api/lingshi-dungeon/luck - 设置玩家幸运值
router.post('/luck', (req: Request, res: Response) => {
  try {
    const { player_id, luck } = req.body
    
    if (!player_id || luck === undefined) {
      return res.status(400).json({ success: false, error: '缺少必要参数' })
    }
    
    lingShiDungeonSystem.setPlayerLuck(player_id, parseInt(luck as string))
    
    res.json({
      success: true,
      message: '幸运值设置成功',
      data: {
        playerId: player_id,
        luck: lingShiDungeonSystem.getPlayerLuck(player_id)
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

// ==================== 副本配置 ====================

// GET /api/lingshi-dungeon/config - 获取系统配置
router.get('/config', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: LINGSHI_DUNGEON_CONFIG
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

// ==================== 掉落表 ====================

// GET /api/lingshi-dungeon/drop-table - 获取掉落表
router.get('/drop-table', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: LINGSHI_DUNGEONS.map(d => ({
        dungeonId: d.dungeonId,
        nameCN: d.nameCN,
        stages: d.stages.map(s => ({
          stageId: s.stageId,
          name: s.name,
          enemies: s.enemies.map(e => ({
            enemyId: e.enemyId,
            name: e.name,
            level: e.level,
            lingShiDrop: e.lingShiDrop,
            lingShiDropRange: e.lingShiDropRange
          })),
          boss: s.boss ? {
            enemyId: s.boss.enemyId,
            name: s.boss.name,
            level: s.boss.level,
            lingShiDrop: s.boss.lingShiDrop,
            lingShiDropRange: s.boss.lingShiDropRange
          } : null
        }))
      }))
    })
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message })
  }
})

export default router
