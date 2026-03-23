/**
 * 结拜系统 - 义结金兰
 * 玩家可以与其他玩家结拜，获得兄弟/姐妹技能和属性加成
 */

import express, { Request, Response } from 'express';

const router = express.Router();

// 结拜配置
const SWORN_CONFIG = {
  // 结拜人数要求
  minMembers: 2,
  maxMembers: 5,
  // 结拜费用
  cost: 5000,
  // 结拜称谓
  titles: {
    2: { name: '生死之交', bonus: 1.05 },
    3: { name: '桃园三结义', bonus: 1.08 },
    4: { name: '四大金刚', bonus: 1.10 },
    5: { name: '五虎上将', bonus: 1.15 },
  },
  // 脱离结拜费用
  leaveCost: 10000,
  // 结拜技能
  swornSkills: [
    { skillId: 'sworn_001', name: '肝胆相照', description: '兄弟/姐妹伤害+5%' },
    { skillId: 'sworn_002', name: '同甘共苦', description: '经验获取+10%' },
    { skillId: 'sworn_003', name: '义薄云天', description: '掉落率+5%' },
    { skillId: 'sworn_004', name: '血脉相连', description: '生命上限+10%' },
  ],
};

// 结拜关系存储
interface SwornGroup {
  groupId: string;
  leaderId: string;
  members: string[];
  name: string;
  createTime: number;
  swornSkills: string[];
}

const swornGroups = new Map<string, SwornGroup>();
const playerSwornData = new Map<string, {
  groupId: string | null;
  isLeader: boolean;
  joinTime: number | null;
}>();

// 模拟玩家名称数据库
const playerNames = new Map<string, string>();
playerNames.set('player_001', '修仙者A');
playerNames.set('player_002', '修仙者B');
playerNames.set('player_003', '修仙者C');
playerNames.set('player_004', '修仙者D');
playerNames.set('player_005', '修仙者E');

// 初始化玩家结拜数据
function initPlayerSworn(playerId: string) {
  if (!playerSwornData.has(playerId)) {
    playerSwornData.set(playerId, {
      groupId: null,
      isLeader: false,
      joinTime: null,
    });
  }
  return playerSwornData.get(playerId)!;
}

// 生成结拜组ID
function generateGroupId(): string {
  return `sworn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// GET /api/sworn/info - 获取结拜信息
router.get('/sworn/info', (req: Request, res: Response) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    const playerData = initPlayerSworn(player_id as string);
    
    if (!playerData.groupId) {
      return res.json({
        success: true,
        data: {
          hasGroup: false,
          memberOfSworn: false,
          availableSkills: SWORN_CONFIG.swornSkills,
        }
      });
    }
    
    const group = swornGroups.get(playerData.groupId);
    if (!group) {
      return res.json({
        success: true,
        data: {
          hasGroup: false,
          memberOfSworn: false,
        }
      });
    }
    
    const members = group.members.map(memberId => ({
      playerId: memberId,
      playerName: playerNames.get(memberId) || '未知',
      isLeader: memberId === group.leaderId,
      joinTime: memberId === group.createTime ? group.createTime : playerData.joinTime,
    }));
    
    const titleConfig = SWORN_CONFIG.titles[group.members.length as keyof typeof SWORN_CONFIG.titles];
    
    res.json({
      success: true,
      data: {
        hasGroup: true,
        groupId: group.groupId,
        groupName: group.name,
        leaderId: group.leaderId,
        leaderName: playerNames.get(group.leaderId) || '未知',
        memberCount: group.members.length,
        title: titleConfig?.name || '结拜成员',
        bonus: titleConfig?.bonus || 1.0,
        members: members,
        swornSkills: group.swornSkills,
        availableSkills: SWORN_CONFIG.swornSkills,
        createTime: group.createTime,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/sworn/groups - 获取结拜列表
router.get('/sworn/groups', (req: Request, res: Response) => {
  try {
    const groups = Array.from(swornGroups.values()).map(group => {
      const titleConfig = SWORN_CONFIG.titles[group.members.length as keyof typeof SWORN_CONFIG.titles];
      return {
        groupId: group.groupId,
        groupName: group.name,
        leaderId: group.leaderId,
        leaderName: playerNames.get(group.leaderId) || '未知',
        memberCount: group.members.length,
        title: titleConfig?.name || '结拜成员',
        bonus: titleConfig?.bonus || 1.0,
        members: group.members.map(id => playerNames.get(id) || '未知'),
        createTime: group.createTime,
      };
    });
    
    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/sworn/create - 创建结拜
router.post('/sworn/create', (req: Request, res: Response) => {
  try {
    const { player_id, member_ids, group_name } = req.body;
    
    if (!player_id || !member_ids || !Array.isArray(member_ids)) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const allMembers = [player_id, ...member_ids];
    const memberCount = allMembers.length;
    
    // 验证人数
    if (memberCount < SWORN_CONFIG.minMembers) {
      return res.status(400).json({ 
        success: false, 
        error: `结拜至少需要 ${SWORN_CONFIG.minMembers} 人，当前 ${memberCount} 人` 
      });
    }
    
    if (memberCount > SWORN_CONFIG.maxMembers) {
      return res.status(400).json({ 
        success: false, 
        error: `结拜最多 ${SWORN_CONFIG.maxMembers} 人，当前 ${memberCount} 人` 
      });
    }
    
    // 检查是否已有结拜关系
    for (const memberId of allMembers) {
      const memberData = initPlayerSworn(memberId);
      if (memberData.groupId) {
        return res.status(400).json({ 
          success: false, 
          error: `玩家 ${playerNames.get(memberId) || memberId} 已有结拜关系` 
        });
      }
    }
    
    const groupId = generateGroupId();
    const titleConfig = SWORN_CONFIG.titles[memberCount as keyof typeof SWORN_CONFIG.titles];
    
    // 创建结拜组
    const group: SwornGroup = {
      groupId,
      leaderId: player_id,
      members: allMembers,
      name: group_name || titleConfig?.name || '结拜兄弟',
      createTime: Date.now(),
      swornSkills: SWORN_CONFIG.swornSkills.map(s => s.skillId),
    };
    
    swornGroups.set(groupId, group);
    
    // 更新玩家结拜数据
    for (const memberId of allMembers) {
      const memberData = initPlayerSworn(memberId);
      memberData.groupId = groupId;
      memberData.isLeader = memberId === player_id;
      memberData.joinTime = memberId === player_id ? Date.now() : Date.now();
    }
    
    res.json({
      success: true,
      message: `与 ${member_ids.length} 位好汉结拜成功！`,
      data: {
        groupId,
        groupName: group.name,
        leaderId: player_id,
        leaderName: playerNames.get(player_id) || '未知',
        memberCount,
        title: titleConfig?.name || '结拜成员',
        bonus: titleConfig?.bonus || 1.0,
        members: allMembers.map(id => ({
          playerId: id,
          playerName: playerNames.get(id) || '未知',
          isLeader: id === player_id,
        })),
        swornSkills: group.swornSkills,
        cost: SWORN_CONFIG.cost,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/sworn/invite - 邀请结拜
router.post('/sworn/invite', (req: Request, res: Response) => {
  try {
    const { player_id, target_id } = req.body;
    
    if (!player_id || !target_id) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }
    
    const playerData = initPlayerSworn(player_id);
    
    if (!playerData.groupId) {
      return res.status(400).json({ success: false, error: '您还没有结拜组' });
    }
    
    const group = swornGroups.get(playerData.groupId);
    if (!group) {
      return res.status(400).json({ success: false, error: '结拜组不存在' });
    }
    
    if (!playerData.isLeader) {
      return res.status(400).json({ success: false, error: '只有组长才能邀请新成员' });
    }
    
    if (group.members.length >= SWORN_CONFIG.maxMembers) {
      return res.status(400).json({ success: false, error: '结拜组人数已满' });
    }
    
    const targetData = initPlayerSworn(target_id);
    if (targetData.groupId) {
      return res.status(400).json({ success: false, error: '对方已有结拜关系' });
    }
    
    // 简化流程，直接加入
    group.members.push(target_id);
    targetData.groupId = group.groupId;
    targetData.isLeader = false;
    targetData.joinTime = Date.now();
    
    const titleConfig = SWORN_CONFIG.titles[group.members.length as keyof typeof SWORN_CONFIG.titles];
    
    res.json({
      success: true,
      message: `${playerNames.get(target_id) || 'TA'} 加入结拜组`,
      data: {
        groupId: group.groupId,
        memberCount: group.members.length,
        newTitle: titleConfig?.name || '结拜成员',
        newBonus: titleConfig?.bonus || 1.0,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/sworn/leave - 脱离结拜
router.post('/sworn/leave', (req: Request, res: Response) => {
  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    const playerData = initPlayerSworn(player_id);
    
    if (!playerData.groupId) {
      return res.status(400).json({ success: false, error: '您还没有结拜关系' });
    }
    
    const group = swornGroups.get(playerData.groupId);
    if (!group) {
      return res.status(400).json({ success: false, error: '结拜组不存在' });
    }
    
    // 组长不能直接离开，需要转让或解散
    if (playerData.isLeader && group.members.length > 1) {
      return res.status(400).json({ 
        success: false, 
        error: '组长需要先转让组长职位或解散结拜组' 
      });
    }
    
    const groupId = playerData.groupId;
    const memberName = playerNames.get(player_id) || '玩家';
    
    // 移除成员
    group.members = group.members.filter(id => id !== player_id);
    playerData.groupId = null;
    playerData.isLeader = false;
    playerData.joinTime = null;
    
    // 如果没有成员了，删除结拜组
    if (group.members.length === 0) {
      swornGroups.delete(groupId);
    } else {
      // 如果原组长离开，转移给下一个成员
      if (playerData.isLeader) {
        group.leaderId = group.members[0];
        const newLeaderData = initPlayerSworn(group.leaderId);
        newLeaderData.isLeader = true;
      }
    }
    
    res.json({
      success: true,
      message: `${memberName} 脱离结拜`,
      data: {
        leaveCost: SWORN_CONFIG.leaveCost,
        remainingMembers: group.members.length,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// POST /api/sworn/dismiss - 解散结拜
router.post('/sworn/dismiss', (req: Request, res: Response) => {
  try {
    const { player_id } = req.body;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    const playerData = initPlayerSworn(player_id);
    
    if (!playerData.groupId) {
      return res.status(400).json({ success: false, error: '您还没有结拜关系' });
    }
    
    if (!playerData.isLeader) {
      return res.status(400).json({ success: false, error: '只有组长才能解散结拜组' });
    }
    
    const group = swornGroups.get(playerData.groupId);
    if (!group) {
      return res.status(400).json({ success: false, error: '结拜组不存在' });
    }
    
    // 清除所有成员的结拜数据
    for (const memberId of group.members) {
      const memberData = initPlayerSworn(memberId);
      memberData.groupId = null;
      memberData.isLeader = false;
      memberData.joinTime = null;
    }
    
    // 删除结拜组
    const groupId = playerData.groupId;
    swornGroups.delete(groupId);
    
    res.json({
      success: true,
      message: '结拜组已解散',
      data: {
        formerMembers: group.members.length,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// GET /api/sworn/skills - 获取结拜技能
router.get('/sworn/skills', (req: Request, res: Response) => {
  try {
    const { player_id } = req.query;
    
    if (!player_id) {
      return res.status(400).json({ success: false, error: '缺少 player_id 参数' });
    }
    
    const playerData = initPlayerSworn(player_id as string);
    
    if (!playerData.groupId) {
      return res.json({
        success: true,
        data: {
          hasGroup: false,
          skills: [],
          allSkills: SWORN_CONFIG.swornSkills,
        }
      });
    }
    
    const group = swornGroups.get(playerData.groupId);
    if (!group) {
      return res.json({
        success: true,
        data: {
          hasGroup: false,
          skills: [],
        }
      });
    }
    
    const skills = group.swornSkills.map(skillId => {
      return SWORN_CONFIG.swornSkills.find(s => s.skillId === skillId) || null;
    }).filter(Boolean);
    
    res.json({
      success: true,
      data: {
        hasGroup: true,
        groupId: group.groupId,
        skills: skills,
        allSkills: SWORN_CONFIG.swornSkills,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
