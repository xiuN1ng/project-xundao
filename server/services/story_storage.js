/**
 * 剧情系统存储层
 * 支持多章节、多分支、多结局的剧情体验
 */

// 获取数据库实例
let db;
function getDb() {
  if (!db) {
    const Database = require('better-sqlite3');
    const path = require('path');
    const dbPath = path.join(__dirname, '..', 'data', 'game.db');
    db = new Database(dbPath);
  }
  return db;
}

// 初始化剧情相关表
function initStoryTables() {
  const db = getDb();
  
  // 玩家剧情进度表
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_story (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      chapter_id INTEGER NOT NULL,
      node_id INTEGER NOT NULL,
      choices TEXT DEFAULT '[]',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      UNIQUE(player_id, chapter_id)
    )
  `);
  
  // 玩家已解锁章节记录
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_story_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      chapter_id INTEGER NOT NULL,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      UNIQUE(player_id, chapter_id)
    )
  `);
  
  // 剧情节点阅读记录
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_story_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      node_id INTEGER NOT NULL,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(player_id, node_id)
    )
  `);
}

// ==================== 剧情配置 ====================

// 章节配置
const STORY_CHAPTERS = [
  {
    id: 1,
    title: '初入仙途',
    description: '你是一名普通的凡人，意外踏入修仙之路...',
    required_level: 1,
    required_realm: 1,
    nodes: [
      {
        id: 1,
        type: 'dialogue',
        speaker: '神秘老者',
        content: '少年，我观你根骨清奇，乃是修仙之才...',
        next: 2,
        bg: 'mountain'
      },
      {
        id: 2,
        type: 'choice',
        speaker: '神秘老者',
        content: '今日相遇，便是有缘。你可愿随我修仙？',
        choices: [
          { text: '弟子愿意！', next: 3, reward: { spirit_stones: 100 } },
          { text: '请前辈指点', next: 4, reward: { spirit_stones: 50 } },
          { text: '容弟子考虑一下', next: 5 }
        ]
      },
      {
        id: 3,
        type: 'dialogue',
        speaker: '神秘老者',
        content: '好！从今日起，你便是我的关门弟子。这是为师赠你的入门礼物...',
        next: 6,
        reward: { spirit_stones: 100, gongfa: '基础练气诀' }
      },
      {
        id: 4,
        type: 'dialogue',
        speaker: '神秘老者',
        content: '修真之路，重在修心。你既有疑虑，为师也不强求...',
        next: 6,
        reward: { spirit_stones: 50 }
      },
      {
        id: 5,
        type: 'dialogue',
        speaker: '神秘老者',
        content: '也好，你且回去好生考虑。若改变主意，可来此地寻我。',
        next: null,
        is_ending: true
      },
      {
        id: 6,
        type: 'event',
        title: '功法入门',
        content: '你获得了《基础练气诀》，开始踏上修仙之路...',
        next: 7,
        effect: { gongfa: '基础练气诀', realm_unlock: 1 }
      },
      {
        id: 7,
        type: 'battle',
        title: '初试身手',
        content: '一只下山觅食的妖兽出现在你面前！',
        enemy: { name: '山猪妖', hp: 100, attack: 10, reward: { spirit_stones: 30, exp: 50 } },
        next: 8
      },
      {
        id: 8,
        type: 'dialogue',
        speaker: '神秘老者',
        content: '不错，你已初步掌握修炼之法。记住，修仙之路漫长，需持之以恒...',
        next: null,
        is_ending: true,
        reward: { spirit_stones: 200 }
      }
    ]
  },
  {
    id: 2,
    title: '宗门大选',
    description: '各大宗门开启收徒大典，你将何去何从...',
    required_level: 10,
    required_realm: 2,
    nodes: [
      {
        id: 1,
        type: 'dialogue',
        speaker: '主持人',
        content: '修仙界五年一度的宗门大选正式开始！',
        next: 2
      },
      {
        id: 2,
        type: 'choice',
        speaker: '主持人',
        content: '各宗门掌门已到场，请问你想加入哪个宗门？',
        choices: [
          { text: '天剑宗 - 剑修之道', next: 3, sect: 'tianjian' },
          { text: '丹鼎宗 - 炼丹之术', next: 4, sect: 'dingdan' },
          { text: '万法阁 - 阵法之学', next: 5, sect: 'wanfa' },
          { text: '逍遥派 - 逍遥自在', next: 6, sect: 'xiaoyao' }
        ]
      },
      {
        id: 3,
        type: 'dialogue',
        speaker: '天剑宗掌门',
        content: '好！我天剑宗欢迎剑道天才！',
        next: 10,
        reward: { gongfa: '天剑入门', sect: '天剑宗' }
      },
      {
        id: 4,
        type: 'dialogue',
        speaker: '丹鼎宗掌门',
        content: '炼丹之道，妙手回春。欢迎加入丹鼎宗！',
        next: 10,
        reward: { gongfa: '丹鼎入门', sect: '丹鼎宗' }
      },
      {
        id: 5,
        type: 'dialogue',
        speaker: '万法阁阁主',
        content: '阵法之道，变化无穷。欢迎加入万法阁！',
        next: 10,
        reward: { gongfa: '阵法入门', sect: '万法阁' }
      },
      {
        id: 6,
        type: 'dialogue',
        speaker: '逍遥派掌门',
        content: '逍遥天地，无拘无束。欢迎加入逍遥派！',
        next: 10,
        reward: { gongfa: '逍遥心法', sect: '逍遥派' }
      },
      {
        id: 10,
        type: 'event',
        title: '加入宗门',
        content: '你成功加入了宗门，开始了新的修炼生涯...',
        next: null,
        is_ending: true,
        effect: { unlock_sect: true }
      }
    ]
  },
  {
    id: 3,
    title: '天劫试炼',
    description: '修为已达瓶颈，渡劫飞升还是陨落...',
    required_level: 50,
    required_realm: 5,
    nodes: [
      {
        id: 1,
        type: 'dialogue',
        speaker: '天劫',
        content: '轰！天空突然乌云密布，雷劫将至！',
        next: 2
      },
      {
        id: 2,
        type: 'choice',
        speaker: '',
        content: '天劫降临，你将如何应对？',
        choices: [
          { text: '全力抵抗', next: 3, type: 'brave' },
          { text: '以身化道', next: 4, type: 'wisdom' },
          { text: '寻求护法', next: 5, type: 'social' }
        ]
      },
      {
        id: 3,
        type: 'battle',
        title: '雷劫之战',
        content: '九道天雷落下，你能否承受？',
        enemy: { name: '天雷', hp: 1000, attack: 100, waves: 9 },
        next: 6,
        win_next: 6,
        lose_next: null
      },
      {
        id: 4,
        type: 'dialogue',
        speaker: '天道',
        content: '以身化道，领悟天道玄机...',
        next: 6,
        is_ending: true,
        reward: { realm: 6 }
      },
      {
        id: 5,
        type: 'dialogue',
        speaker: '护法',
        content: '宗门长辈出手，帮你分担部分雷劫...',
        next: 6,
        reward: { spirit_stones: 500 }
      },
      {
        id: 6,
        type: 'ending',
        title: '渡劫成功',
        content: '恭喜你成功渡劫，修为更上一层楼！',
        is_ending: true,
        reward: { realm: 6, title: '渡劫仙人' }
      }
    ]
  }
];

// ==================== 存储层 ====================

const storyStorage = {
  // 获取所有章节配置
  getChapters() {
    return STORY_CHAPTERS.map(ch => ({
      id: ch.id,
      title: ch.title,
      description: ch.description,
      required_level: ch.required_level,
      required_realm: ch.required_realm,
      node_count: ch.nodes.length
    }));
  },
  
  // 获取章节详情
  getChapter(chapterId) {
    return STORY_CHAPTERS.find(ch => ch.id === chapterId);
  },
  
  // 获取玩家可解锁的章节
  getUnlockedChapters(playerId) {
    const db = getDb();
    const player = db.prepare('SELECT level, realm FROM player WHERE id = ?').get(playerId);
    
    if (!player) return [];
    
    const unlocked = [];
    for (const chapter of STORY_CHAPTERS) {
      if (player.level >= chapter.required_level && player.realm >= chapter.required_realm) {
        const progress = db.prepare(
          'SELECT * FROM player_story_progress WHERE player_id = ? AND chapter_id = ?'
        ).get(playerId, chapter.id);
        
        unlocked.push({
          ...chapter,
          is_unlocked: true,
          is_completed: !!progress?.completed_at
        });
      }
    }
    return unlocked;
  },
  
  // 获取玩家剧情进度
  getPlayerStoryProgress(playerId, chapterId) {
    const db = getDb();
    let progress = db.prepare(
      'SELECT * FROM player_story WHERE player_id = ? AND chapter_id = ?'
    ).get(playerId, chapterId);
    
    if (!progress) {
      // 初始化第一章第一条
      db.prepare(
        'INSERT INTO player_story (player_id, chapter_id, node_id, choices) VALUES (?, ?, ?, ?)'
      ).run(playerId, chapterId, 1, '[]');
      progress = db.prepare(
        'SELECT * FROM player_story WHERE player_id = ? AND chapter_id = ?'
      ).get(playerId, chapterId);
    }
    
    try {
      progress.choices = JSON.parse(progress.choices || '[]');
    } catch (e) {
      progress.choices = [];
    }
    
    return progress;
  },
  
  // 获取当前节点
  getCurrentNode(playerId, chapterId) {
    const chapter = this.getChapter(chapterId);
    if (!chapter) return null;
    
    const progress = this.getPlayerStoryProgress(playerId, chapterId);
    const node = chapter.nodes.find(n => n.id === progress.node_id);
    
    if (!node) return null;
    
    // 处理已阅读节点标记
    this.markNodeRead(playerId, node.id);
    
    return {
      ...node,
      chapter_id: chapterId,
      is_completed: progress.choices.length > 0 && 
        progress.choices[progress.choices.length - 1]?.node_id === node.id
    };
  },
  
  // 标记节点已读
  markNodeRead(playerId, nodeId) {
    const db = getDb();
    try {
      db.prepare(
        'INSERT OR IGNORE INTO player_story_nodes (player_id, node_id) VALUES (?, ?)'
      ).run(playerId, nodeId);
    } catch (e) {
      // 忽略重复
    }
  },
  
  // 推进剧情
  advanceStory(playerId, chapterId, choiceIndex = null) {
    const db = getDb();
    const chapter = this.getChapter(chapterId);
    if (!chapter) return { success: false, error: '章节不存在' };
    
    const progress = this.getPlayerStoryProgress(playerId, chapterId);
    const currentNode = chapter.nodes.find(n => n.id === progress.node_id);
    
    if (!currentNode) return { success: false, error: '节点不存在' };
    
    let nextNodeId = null;
    let reward = null;
    let isEnding = false;
    
    // 处理选择
    if (currentNode.type === 'choice' && choiceIndex !== null) {
      const choice = currentNode.choices[choiceIndex];
      if (!choice) return { success: false, error: '选择无效' };
      
      nextNodeId = choice.next;
      reward = choice.reward;
      
      // 记录选择
      const choices = [...progress.choices, {
        node_id: currentNode.id,
        choice_index: choiceIndex,
        choice_text: choice.text,
        timestamp: Date.now()
      }];
      
      db.prepare(
        'UPDATE player_story SET choices = ?, updated_at = ? WHERE player_id = ? AND chapter_id = ?'
      ).run(JSON.stringify(choices), new Date().toISOString(), playerId, chapterId);
    } else {
      nextNodeId = currentNode.next;
    }
    
    // 检查是否结局
    if (!nextNodeId || currentNode.is_ending) {
      isEnding = true;
      
      // 标记章节完成
      db.prepare(`
        INSERT OR REPLACE INTO player_story_progress 
        (player_id, chapter_id, completed_at) VALUES (?, ?, ?)
      `).run(playerId, chapterId, new Date().toISOString());
      
      // 更新剧情进度为完成
      db.prepare(
        'UPDATE player_story SET completed_at = ?, updated_at = ? WHERE player_id = ? AND chapter_id = ?'
      ).run(new Date().toISOString(), new Date().toISOString(), playerId, chapterId);
      
      // 发放奖励
      if (currentNode.reward) {
        reward = { ...reward, ...currentNode.reward };
      }
    } else {
      // 更新进度
      db.prepare(
        'UPDATE player_story SET node_id = ?, updated_at = ? WHERE player_id = ? AND chapter_id = ?'
      ).run(nextNodeId, new Date().toISOString(), playerId, chapterId);
    }
    
    // 发放奖励
    if (reward) {
      this.grantReward(playerId, reward);
    }
    
    // 获取下一节点
    const nextNode = nextNodeId ? chapter.nodes.find(n => n.id === nextNodeId) : null;
    
    return {
      success: true,
      data: {
        next_node: nextNode,
        reward: reward,
        is_ending: isEnding,
        chapter_completed: isEnding
      }
    };
  },
  
  // 发放奖励
  grantReward(playerId, reward) {
    const db = getDb();
    const updates = [];
    const params = [];
    
    if (reward.spirit_stones) {
      updates.push('spirit_stones = spirit_stones + ?');
      params.push(reward.spirit_stones);
    }
    
    if (reward.exp) {
      updates.push('exp = exp + ?');
      params.push(reward.exp);
    }
    
    if (reward.realm) {
      updates.push('realm = ?');
      params.push(reward.realm);
    }
    
    if (updates.length > 0) {
      params.push(playerId);
      db.prepare(`UPDATE player SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    
    console.log(`[剧情奖励] 玩家${playerId}:`, reward);
  },
  
  // 重置章节
  resetChapter(playerId, chapterId) {
    const db = getDb();
    
    db.prepare('DELETE FROM player_story WHERE player_id = ? AND chapter_id = ?').run(playerId, chapterId);
    db.prepare('DELETE FROM player_story_progress WHERE player_id = ? AND chapter_id = ?').run(playerId, chapterId);
    
    // 重新初始化
    db.prepare(
      'INSERT INTO player_story (player_id, chapter_id, node_id, choices) VALUES (?, ?, ?, ?)'
    ).run(playerId, chapterId, 1, '[]');
    
    return { success: true };
  },
  
  // 获取章节奖励
  getChapterReward(playerId, chapterId) {
    const chapter = this.getChapter(chapterId);
    if (!chapter) return null;
    
    const db = getDb();
    const progress = db.prepare(
      'SELECT * FROM player_story_progress WHERE player_id = ? AND chapter_id = ?'
    ).get(playerId, chapterId);
    
    if (!progress?.completed_at) return null;
    
    // 返回章节通关奖励
    return { title: `${chapter.title}通关`, spirit_stones: chapterId * 500 };
  }
};

// 初始化表
initStoryTables();

module.exports = { storyStorage, STORY_CHAPTERS };
