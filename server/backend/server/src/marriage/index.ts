/**
 * 结婚系统 - 主入口和API路由
 */

import express, { Request, Response } from 'express';
import Database from 'better-sqlite3';
import * as service from './marriage-service';
import { WeddingType } from './types';

let db: Database.Database;

/**
 * 初始化婚姻系统路由
 */
export function initMarriageRouter(database: Database.Database) {
  db = database;
  service.initMarriageService(database);
  
  const router = express.Router();
  
  // ========== 结婚申请 API ==========
  
  // GET /api/marriage/info - 获取婚姻信息
  router.get('/marriage/info', (req: Request, res: Response) => {
    try {
      const { player_id } = req.query;
      
      if (!player_id) {
        return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
      }
      
      const info = service.getMarriageInfo(Number(player_id));
      res.json({ success: true, data: info });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
  
  // GET /api/marriage/wedding/types - 获取婚礼类型
  router.get('/marriage/wedding/types', (req: Request, res: Response) => {
    try {
      const types = service.getWeddingTypes();
      res.json({ success: true, data: types });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
  
  // POST /api/marriage/apply - 发送结婚申请
  router.post('/marriage/apply', (req: Request, res: Response) => {
    try {
      const { player_id, target_id, wedding_type, message } = req.body;
      
      if (!player_id || !target_id || !wedding_type) {
        return res.status(400).json({ success: false, error: '缺少必要参数' });
      }
      
      const result = service.sendMarriageApplication(
        Number(player_id),
        Number(target_id),
        wedding_type as WeddingType,
        message
      );
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
  
  // GET /api/marriage/applications - 获取收到的结婚申请
  router.get('/marriage/applications', (req: Request, res: Response) => {
    try {
      const { player_id } = req.query;
      
      if (!player_id) {
        return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
      }
      
      const applications = service.getReceivedApplications(Number(player_id));
      res.json({ success: true, data: applications });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
  
  // POST /api/marriage/accept - 接受结婚申请
  router.post('/marriage/accept', (req: Request, res: Response) => {
    try {
      const { player_id, application_id } = req.body;
      
      if (!player_id || !application_id) {
        return res.status(400).json({ success: false, error: '缺少必要参数' });
      }
      
      const result = service.acceptMarriageApplication(Number(player_id), Number(application_id));
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
  
  // POST /api/marriage/reject - 拒绝结婚申请
  router.post('/marriage/reject', (req: Request, res: Response) => {
    try {
      const { player_id, application_id } = req.body;
      
      if (!player_id || !application_id) {
        return res.status(400).json({ success: false, error: '缺少必要参数' });
      }
      
      const result = service.rejectMarriageApplication(Number(player_id), Number(application_id));
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
  
  // ========== 婚礼举办 API ==========
  
  // POST /api/marriage/quick - 快速结婚（直接结婚）
  router.post('/marriage/quick', (req: Request, res: Response) => {
    try {
      const { player_id, target_id, wedding_type } = req.body;
      
      if (!player_id || !target_id) {
        return res.status(400).json({ success: false, error: '缺少必要参数' });
      }
      
      const result = service.quickMarriage(
        Number(player_id),
        Number(target_id),
        (wedding_type as WeddingType) || 'simple'
      );
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
  
  // ========== 夫妻技能 API ==========
  
  // GET /api/marriage/skills - 获取夫妻技能
  router.get('/marriage/skills', (req: Request, res: Response) => {
    try {
      const { player_id } = req.query;
      
      if (!player_id) {
        return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
      }
      
      const skills = service.getCoupleSkills(Number(player_id));
      res.json({ success: true, data: skills });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
  
  // GET /api/marriage/bonus - 获取婚姻属性加成
  router.get('/marriage/bonus', (req: Request, res: Response) => {
    try {
      const { player_id } = req.query;
      
      if (!player_id) {
        return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
      }
      
      const bonus = service.getMarriageBonus(Number(player_id));
      res.json({ success: true, data: bonus });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
  
  // ========== 离婚处理 API ==========
  
  // POST /api/marriage/divorce - 申请离婚
  router.post('/marriage/divorce', (req: Request, res: Response) => {
    try {
      const { player_id } = req.body;
      
      if (!player_id) {
        return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
      }
      
      const result = service.applyForDivorce(Number(player_id));
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
  
  // POST /api/marriage/confirm/divorce - 确认离婚
  router.post('/marriage/confirm/divorce', (req: Request, res: Response) => {
    try {
      const { player_id } = req.body;
      
      if (!player_id) {
        return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
      }
      
      const result = service.confirmDivorce(Number(player_id));
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
  
  console.log('[Marriage] 路由注册完成');
  return router;
}

// 导出默认路由
export default initMarriageRouter;
