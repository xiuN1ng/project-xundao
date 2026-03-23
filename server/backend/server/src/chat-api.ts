/**
 * 聊天系统 API
 * 发送消息、获取消息历史、频道列表
 */

import express, { Request, Response } from 'express';
import ChatSystem, { ChatMessage, ChatChannel, PrivateChatSession } from './chat-system';

const router = express.Router();

// 初始化聊天系统
ChatSystem.initChannels();

// ==================== 频道列表 API ====================

// GET /api/chat/channels - 获取频道列表
router.get('/channels', (req: Request, res: Response) => {
  try {
    const { player_id } = req.query;
    
    // 获取所有频道
    const channels = ChatSystem.getChannels();
    
    // 如果有player_id，检查各频道的权限
    const playerChannels = channels.map(channel => {
      // 这里可以添加玩家等级检查等逻辑
      return {
        channel: channel.channel,
        name: channel.name,
        icon: channel.icon,
        minLevel: channel.minLevel,
        description: channel.description,
        cooldown: channel.cooldown,
        maxLength: channel.maxLength,
        // 检查玩家是否可以访问该频道
        accessible: player_id ? true : false
      };
    });
    
    res.json({
      success: true,
      data: {
        channels: playerChannels,
        total: channels.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 发送消息 API ====================

// POST /api/chat/send - 发送消息
router.post('/send', (req: Request, res: Response) => {
  try {
    const { 
      player_id, 
      player_name, 
      channel, 
      content,
      sender_title,
      sender_level,
      sender_avatar,
      message_type,
      target_id,
      target_name,
      metadata
    } = req.body;
    
    // 参数验证
    if (!player_id || !player_name || !channel || !content) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数: player_id, player_name, channel, content' 
      });
    }
    
    // 验证频道类型
    const validChannels = ['world', 'sect', 'team', 'guild', 'private'];
    if (!validChannels.includes(channel)) {
      return res.status(400).json({ 
        success: false, 
        error: '无效的频道类型' 
      });
    }
    
    // 私聊需要目标玩家ID
    if (channel === 'private' && !target_id) {
      return res.status(400).json({ 
        success: false, 
        error: '私聊需要指定目标玩家ID (target_id)' 
      });
    }
    
    // 发送消息
    const result = ChatSystem.sendMessage(
      player_id,
      player_name,
      channel,
      content,
      {
        senderTitle: sender_title,
        senderLevel: sender_level || 1,
        senderAvatar: sender_avatar,
        type: message_type || 'text',
        metadata: metadata,
        targetId: target_id,
        targetName: target_name
      }
    );
    
    if (result.success) {
      res.json({
        success: true,
        message: '发送成功',
        data: {
          message: result.message
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        cooldown: result.cooldown
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 获取消息历史 API ====================

// GET /api/chat/history - 获取频道消息历史
router.get('/history', (req: Request, res: Response) => {
  try {
    const { 
      player_id,
      channel, 
      target_id,
      limit,
      before_id 
    } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少 player_id 参数' 
      });
    }
    
    if (!channel && !target_id) {
      return res.status(400).json({ 
        success: false, 
        error: '需要指定 channel 或 target_id（私聊）' 
      });
    }
    
    const messageLimit = Math.min(parseInt(limit as string) || 50, 100);
    
    let messages: ChatMessage[] = [];
    
    // 私聊
    if (target_id) {
      messages = ChatSystem.getPrivateMessages(player_id as string, target_id as string);
      // 标记为已读
      ChatSystem.markPrivateAsRead(player_id as string, target_id as string);
    } else if (channel) {
      // 频道消息
      messages = ChatSystem.getHistoryMessages(
        channel as string, 
        before_id as string, 
        messageLimit
      );
    }
    
    res.json({
      success: true,
      data: {
        messages: messages,
        total: messages.length,
        channel: channel || 'private',
        targetId: target_id || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/chat/messages - 获取频道实时消息
router.get('/messages', (req: Request, res: Response) => {
  try {
    const { channel, limit } = req.query;
    
    if (!channel) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少 channel 参数' 
      });
    }
    
    const validChannels = ['world', 'sect', 'team', 'guild', 'private'];
    if (!validChannels.includes(channel as string)) {
      return res.status(400).json({ 
        success: false, 
        error: '无效的频道类型' 
      });
    }
    
    const messageLimit = Math.min(parseInt(limit as string) || 50, 100);
    const messages = ChatSystem.getChannelMessages(channel as string, messageLimit);
    
    res.json({
      success: true,
      data: {
        messages: messages,
        channel: channel,
        total: messages.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 私聊会话 API ====================

// GET /api/chat/private/sessions - 获取私聊会话列表
router.get('/private/sessions', (req: Request, res: Response) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少 player_id 参数' 
      });
    }
    
    const sessions = ChatSystem.getPrivateChatSessions(player_id as string);
    
    res.json({
      success: true,
      data: {
        sessions: sessions,
        total: sessions.length,
        unreadCount: ChatSystem.getUnreadPrivateCount(player_id as string)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 玩家设置 API ====================

// GET /api/chat/settings - 获取聊天设置
router.get('/settings', (req: Request, res: Response) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少 player_id 参数' 
      });
    }
    
    const config = ChatSystem.getPlayerConfig(player_id as string);
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/chat/settings - 更新聊天设置
router.post('/settings', (req: Request, res: Response) => {
  try {
    const { player_id, settings } = req.body;
    
    if (!player_id || !settings) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数: player_id, settings' 
      });
    }
    
    ChatSystem.updateChatSettings(player_id, settings);
    
    res.json({
      success: true,
      message: '设置更新成功',
      data: ChatSystem.getPlayerConfig(player_id)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 屏蔽管理 API ====================

// POST /api/chat/block - 屏蔽玩家
router.post('/block', (req: Request, res: Response) => {
  try {
    const { player_id, target_id } = req.body;
    
    if (!player_id || !target_id) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数: player_id, target_id' 
      });
    }
    
    const result = ChatSystem.blockPlayer(player_id, target_id);
    
    res.json({
      success: result,
      message: result ? '屏蔽成功' : '屏蔽失败'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/chat/unblock - 取消屏蔽
router.post('/unblock', (req: Request, res: Response) => {
  try {
    const { player_id, target_id } = req.body;
    
    if (!player_id || !target_id) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数: player_id, target_id' 
      });
    }
    
    const result = ChatSystem.unblockPlayer(player_id, target_id);
    
    res.json({
      success: result,
      message: result ? '取消屏蔽成功' : '取消屏蔽失败'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/chat/blocked - 获取屏蔽列表
router.get('/blocked', (req: Request, res: Response) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少 player_id 参数' 
      });
    }
    
    const blockedList = ChatSystem.getBlockedPlayers(player_id as string);
    
    res.json({
      success: true,
      data: {
        blockedPlayers: blockedList,
        total: blockedList.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 表情 API ====================

// GET /api/chat/emojis - 获取可用表情
router.get('/emojis', (req: Request, res: Response) => {
  try {
    const emojis = ChatSystem.getEmojis();
    
    res.json({
      success: true,
      data: {
        emojis: emojis,
        total: emojis.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 系统消息 API ====================

// POST /api/chat/system - 发送系统消息
router.post('/system', (req: Request, res: Response) => {
  try {
    const { channel, content } = req.body;
    
    if (!channel || !content) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数: channel, content' 
      });
    }
    
    const message = ChatSystem.sendSystemMessage(channel, content);
    
    res.json({
      success: true,
      message: '系统消息发送成功',
      data: message
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
