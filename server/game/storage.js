/**
 * 挂机修仙 - 数据存储适配器
 * 支持 MySQL 和 JSON 两种存储方式
 */

const database = require('./database');

// 默认配置
const DEFAULT_STORAGE = {
  type: 'json', // 'mysql' 或 'json'
  jsonPath: './data/saves'
};

class StorageAdapter {
  constructor(options = {}) {
    this.config = { ...DEFAULT_STORAGE, ...options };
    this.type = this.config.type;
    this.jsonPath = this.config.jsonPath;
    this.currentPlayerId = null;
  }

  // 初始化存储系统
  async init(storageType = null) {
    if (storageType) {
      this.type = storageType;
    }

    if (this.type === 'mysql') {
      try {
        await database.init();
        console.log('📦 存储模式: MySQL');
        return true;
      } catch (error) {
        console.error('MySQL 连接失败，切换到 JSON 模式:', error.message);
        this.type = 'json';
      }
    }

    if (this.type === 'json') {
      this.ensureJsonDirectory();
      console.log('📦 存储模式: JSON (本地文件)');
    }

    return true;
  }

  // 确保 JSON 目录存在
  ensureJsonDirectory() {
    const fs = require('fs');
    const path = require('path');
    const dir = path.resolve(this.jsonPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // 设置当前玩家
  setPlayerId(playerId) {
    this.currentPlayerId = playerId;
  }

  // ==================== 玩家基础数据 ====================

  // 保存玩家数据
  async savePlayerData(dataKey, dataValue) {
    if (!this.currentPlayerId) {
      throw new Error('未设置玩家ID');
    }

    if (this.type === 'mysql') {
      await database.savePlayerData(this.currentPlayerId, dataKey, dataValue);
    } else {
      await this.saveJson(`player_${this.currentPlayerId}`, {
        [dataKey]: dataValue
      });
    }
  }

  // 读取玩家数据
  async loadPlayerData(dataKey) {
    if (!this.currentPlayerId) {
      throw new Error('未设置玩家ID');
    }

    if (this.type === 'mysql') {
      const data = await database.getPlayerData(this.currentPlayerId, dataKey);
      return data ? JSON.parse(data) : null;
    } else {
      const allData = await this.loadJson(`player_${this.currentPlayerId}`);
      return allData ? allData[dataKey] : null;
    }
  }

  // 加载所有玩家数据
  async loadAllPlayerData() {
    if (!this.currentPlayerId) {
      throw new Error('未设置玩家ID');
    }

    if (this.type === 'mysql') {
      const rows = await database.query(
        'SELECT data_key, data_value FROM player_data WHERE player_id = ?',
        [this.currentPlayerId]
      );
      
      const result = {};
      for (const row of rows) {
        result[row.data_key] = JSON.parse(row.data_value);
      }
      return result;
    } else {
      return await this.loadJson(`player_${this.currentPlayerId}`);
    }
  }

  // ==================== 背包数据 ====================

  // 保存背包
  async saveInventory(inventoryData) {
    await this.savePlayerData('inventory', inventoryData);
  }

  // 加载背包
  async loadInventory() {
    return await this.loadPlayerData('inventory') || {};
  }

  // ==================== 成就数据 ====================

  // 保存成就
  async saveAchievements(achievementsData) {
    if (this.type === 'mysql') {
      for (const [achievementId, data] of Object.entries(achievementsData)) {
        await database.query(
          `INSERT INTO achievements (player_id, achievement_id, progress, completed, completed_at, rewarded)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE progress = ?, completed = ?, completed_at = ?, rewarded = ?`,
          [
            this.currentPlayerId, achievementId, data.progress || 0,
            data.completed ? 1 : 0, data.completed_at || null, data.rewarded ? 1 : 0,
            data.progress || 0, data.completed ? 1 : 0, data.completed_at || null, data.rewarded ? 1 : 0
          ]
        );
      }
    } else {
      await this.savePlayerData('achievements', achievementsData);
    }
  }

  // 加载成就
  async loadAchievements() {
    if (this.type === 'mysql') {
      const rows = await database.query(
        'SELECT * FROM achievements WHERE player_id = ?',
        [this.currentPlayerId]
      );
      
      const result = {};
      for (const row of rows) {
        result[row.achievement_id] = {
          progress: row.progress,
          completed: row.completed === 1,
          completed_at: row.completed_at,
          rewarded: row.rewarded === 1
        };
      }
      return result;
    } else {
      return await this.loadPlayerData('achievements') || {};
    }
  }

  // ==================== 社交数据 ====================

  // 保存社交数据
  async saveSocialData(socialData) {
    if (this.type === 'mysql') {
      // 保存好友
      for (const [friendId, data] of Object.entries(socialData.friends || {})) {
        await database.query(
          `INSERT INTO friendships (player_id, friend_id, added_at, last_interact, gift_count, visit_count, like_count)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE last_interact = ?, gift_count = ?, visit_count = ?, like_count = ?`,
          [
            this.currentPlayerId, friendId, new Date(data.addedAt), new Date(data.lastInteract),
            data.giftCount || 0, data.visitCount || 0, data.likeCount || 0,
            new Date(data.lastInteract), data.giftCount || 0, data.visitCount || 0, data.likeCount || 0
          ]
        );
      }
      
      // 保存消息
      for (const msg of socialData.messages || []) {
        await database.query(
          `INSERT INTO messages (player_id, from_id, to_id, content, timestamp, is_read)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [this.currentPlayerId, msg.from, msg.to, msg.content, new Date(msg.timestamp), msg.read ? 1 : 0]
        );
      }
    } else {
      await this.savePlayerData('social', socialData);
    }
  }

  // 加载社交数据
  async loadSocialData() {
    if (this.type === 'mysql') {
      const friends = await database.query(
        'SELECT * FROM friendships WHERE player_id = ?',
        [this.currentPlayerId]
      );
      
      const messages = await database.query(
        'SELECT * FROM messages WHERE player_id = ? ORDER BY timestamp DESC LIMIT 100',
        [this.currentPlayerId]
      );
      
      const friendsObj = {};
      for (const f of friends) {
        friendsObj[f.friend_id] = {
          addedAt: f.added_at,
          lastInteract: f.last_interact,
          giftCount: f.gift_count,
          visitCount: f.visit_count,
          likeCount: f.like_count
        };
      }
      
      return {
        friends: friendsObj,
        messages: messages.map(m => ({
          from: m.from_id,
          to: m.to_id,
          content: m.content,
          timestamp: m.timestamp,
          read: m.is_read === 1
        }))
      };
    } else {
      return await this.loadPlayerData('social') || {
        friends: {},
        messages: [],
        dynamics: [],
        likes: {},
        lastLikeReset: 0
      };
    }
  }

  // ==================== 宗门数据 ====================

  // 保存宗门数据
  async saveSectData(sectData) {
    if (this.type === 'mysql') {
      if (sectData.sect) {
        await database.query(
          `INSERT INTO sects (sect_id, name, type, leader_id, level, members, buildings, resources)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE level = ?, members = ?, buildings = ?, resources = ?`,
          [
            sectData.sect.sect_id, sectData.sect.name, sectData.sect.type,
            sectData.sect.leader_id, sectData.sect.level,
            JSON.stringify(sectData.sect.members || []),
            JSON.stringify(sectData.sect.buildings || {}),
            JSON.stringify(sectData.sect.resources || {}),
            sectData.sect.level,
            JSON.stringify(sectData.sect.members || []),
            JSON.stringify(sectData.sect.buildings || {}),
            JSON.stringify(sectData.sect.resources || {})
          ]
        );
      }
    } else {
      await this.savePlayerData('sect', sectData);
    }
  }

  // 加载宗门数据
  async loadSectData() {
    if (this.type === 'mysql') {
      const rows = await database.query(
        'SELECT * FROM sects WHERE leader_id = ? OR members LIKE ?',
        [this.currentPlayerId, `%${this.currentPlayerId}%`]
      );
      
      if (rows.length > 0) {
        const sect = rows[0];
        return {
          sect: {
            sect_id: sect.sect_id,
            name: sect.name,
            type: sect.type,
            leader_id: sect.leader_id,
            level: sect.level,
            members: JSON.parse(sect.members || '[]'),
            buildings: JSON.parse(sect.buildings || '{}'),
            resources: JSON.parse(sect.resources || '{}')
          }
        };
      }
      return { sect: null };
    } else {
      return await loadPlayerData('sect') || { sect: null };
    }
  }

  // ==================== 统计数据 ====================

  // 保存统计
  async saveStats(statsData) {
    if (this.type === 'mysql') {
      await database.query(
        `INSERT INTO player_stats (player_id, total_spirit, total_spirit_stones, offline_earnings, realm_breaks,
           total_offline_time, total_idle_gains, techniques_learned, combat_wins, monsters_killed,
           dungeons_cleared, total_damage, highest_damage, adventures_completed, chances_triggered,
           artifacts_forged, artifacts_recycled, heaven_treasures_used, beasts_captured, sects_created,
           world_boss_kills, market_sales)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           total_spirit = ?, total_spirit_stones = ?, offline_earnings = ?, realm_breaks = ?,
           total_offline_time = ?, total_idle_gains = ?, techniques_learned = ?, combat_wins = ?,
           monsters_killed = ?, dungeons_cleared = ?, total_damage = ?, highest_damage = ?,
           adventures_completed = ?, chances_triggered = ?, artifacts_forged = ?, artifacts_recycled = ?,
           heaven_treasures_used = ?, beasts_captured = ?, sects_created = ?, world_boss_kills = ?, market_sales = ?`,
        [
          this.currentPlayerId,
          statsData.totalSpirit || 0, statsData.totalSpiritStones || 0, statsData.offlineEarnings || 0,
          statsData.realmBreaks || 0, statsData.totalOfflineTime || 0, statsData.totalIdleGains || 0,
          statsData.techniquesLearned || 0, statsData.combatWins || 0, statsData.monstersKilled || 0,
          statsData.dungeonsCleared || 0, statsData.totalDamage || 0, statsData.highestDamage || 0,
          statsData.adventuresCompleted || 0, statsData.chancesTriggered || 0,
          statsData.artifactsForged || 0, statsData.artifactsRecycled || 0, statsData.heavenTreasuresUsed || 0,
          statsData.beastsCaptured || 0, statsData.sectsCreated || 0, statsData.worldBossKills || 0,
          statsData.marketSales || 0,
          // Update values
          statsData.totalSpirit || 0, statsData.totalSpiritStones || 0, statsData.offlineEarnings || 0,
          statsData.realmBreaks || 0, statsData.totalOfflineTime || 0, statsData.totalIdleGains || 0,
          statsData.techniquesLearned || 0, statsData.combatWins || 0, statsData.monstersKilled || 0,
          statsData.dungeonsCleared || 0, statsData.totalDamage || 0, statsData.highestDamage || 0,
          statsData.adventuresCompleted || 0, statsData.chancesTriggered || 0,
          statsData.artifactsForged || 0, statsData.artifactsRecycled || 0, statsData.heavenTreasuresUsed || 0,
          statsData.beastsCaptured || 0, statsData.sectsCreated || 0, statsData.worldBossKills || 0,
          statsData.marketSales || 0
        ]
      );
    } else {
      await this.savePlayerData('stats', statsData);
    }
  }

  // 加载统计
  async loadStats() {
    if (this.type === 'mysql') {
      const rows = await database.query(
        'SELECT * FROM player_stats WHERE player_id = ?',
        [this.currentPlayerId]
      );
      
      if (rows.length > 0) {
        const s = rows[0];
        return {
          totalSpirit: Number(s.total_spirit),
          totalSpiritStones: Number(s.total_spirit_stones),
          offlineEarnings: Number(s.offline_earnings),
          realmBreaks: s.realm_breaks,
          totalOfflineTime: Number(s.total_offline_time),
          totalIdleGains: Number(s.total_idle_gains),
          techniquesLearned: s.techniques_learned,
          combatWins: s.combat_wins,
          monstersKilled: s.monsters_killed,
          dungeonsCleared: s.dungeons_cleared,
          totalDamage: Number(s.total_damage),
          highestDamage: Number(s.highest_damage),
          adventuresCompleted: s.adventures_completed,
          chancesTriggered: s.chances_triggered,
          artifactsForged: s.artifacts_forged,
          artifactsRecycled: s.artifacts_recycled,
          heavenTreasuresUsed: s.heaven_treasures_used,
          beastsCaptured: s.beasts_captured,
          sectsCreated: s.sects_created,
          worldBossKills: s.world_boss_kills,
          marketSales: s.market_sales
        };
      }
      return null;
    } else {
      return await this.loadPlayerData('stats');
    }
  }

  // ==================== 设置 ====================

  // 保存设置
  async saveSettings(settings) {
    if (this.type === 'mysql') {
      await database.query(
        'INSERT INTO player_settings (player_id, settings) VALUES (?, ?) ON DUPLICATE KEY UPDATE settings = ?',
        [this.currentPlayerId, JSON.stringify(settings), JSON.stringify(settings)]
      );
    } else {
      await this.savePlayerData('settings', settings);
    }
  }

  // 加载设置
  async loadSettings() {
    if (this.type === 'mysql') {
      const rows = await database.query(
        'SELECT settings FROM player_settings WHERE player_id = ?',
        [this.currentPlayerId]
      );
      return rows.length > 0 ? JSON.parse(rows[0].settings) : { autoSave: true, offline收益: true };
    } else {
      return await this.loadPlayerData('settings') || { autoSave: true, offline收益: true };
    }
  }

  // ==================== 完整存档 ====================

  // 保存完整游戏数据
  async saveGame(gameState, achievementData, socialDataStr) {
    // 保存各个数据模块
    await this.savePlayerData('player', gameState.player);
    await this.savePlayerData('cave', gameState.cave);
    await this.saveStats(gameState.stats);
    await this.saveSettings(gameState.settings);
    await this.saveAchievements(achievementData);
    
    // 解析并保存社交数据
    if (socialDataStr) {
      try {
        const socialData = typeof socialDataStr === 'string' ? JSON.parse(socialDataStr) : socialDataStr;
        await this.saveSocialData(socialData);
      } catch (e) {
        console.error('保存社交数据失败:', e);
      }
    }
    
    // 保存背包括法器、灵兽等
    await this.savePlayerData('artifacts_inventory', gameState.player.artifacts_inventory || {});
    await this.savePlayerData('owned_artifacts', gameState.player.owned_artifacts || []);
    await this.savePlayerData('artifact_equipment', gameState.player.artifact_equipment || {});
    await this.savePlayerData('beasts', gameState.player.beasts || []);
    await this.savePlayerData('treasure_cooldowns', gameState.player.treasure_cooldowns || {});
    
    console.log(`✅ 游戏数据已保存 (${this.type})`);
  }

  // 加载完整游戏数据
  async loadGame() {
    const playerData = await this.loadPlayerData('player');
    const caveData = await this.loadPlayerData('cave');
    const statsData = await this.loadStats();
    const settingsData = await this.loadSettings();
    const achievementsData = await this.loadAchievements();
    const socialData = await this.loadSocialData();
    
    const artifactsInventory = await this.loadPlayerData('artifacts_inventory') || {};
    const ownedArtifacts = await this.loadPlayerData('owned_artifacts') || [];
    const artifactEquipment = await this.loadPlayerData('artifact_equipment') || {};
    const beasts = await this.loadPlayerData('beasts') || [];
    const treasureCooldowns = await this.loadPlayerData('treasure_cooldowns') || {};
    
    return {
      gameState: {
        player: playerData,
        cave: caveData,
        stats: statsData,
        settings: settingsData
      },
      achievementData: achievementsData,
      socialData: socialData
    };
  }

  // ==================== JSON 辅助方法 ====================

  // 保存 JSON 文件
  async saveJson(filename, data) {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.resolve(this.jsonPath, `${filename}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  // 读取 JSON 文件
  async loadJson(filename) {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.resolve(this.jsonPath, `${filename}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    }
    return null;
  }

  // ==================== 迁移工具 ====================

  // 从 JSON 迁移到 MySQL
  async migrateFromJson(playerId, jsonPath) {
    this.currentPlayerId = playerId;
    this.jsonPath = jsonPath;
    this.type = 'json';

    console.log(`🔄 开始迁移玩家 ${playerId} 的数据...`);

    try {
      // 加载所有 JSON 数据
      const allData = await this.loadAllPlayerData();
      
      if (!allData || Object.keys(allData).length === 0) {
        console.log('⚠️ 没有找到 JSON 数据');
        return false;
      }

      // 切换到 MySQL 模式
      this.type = 'mysql';
      await database.init();

      // 逐个保存数据
      for (const [key, value] of Object.entries(allData)) {
        await this.savePlayerData(key, value);
      }

      console.log(`✅ 迁移完成！`);
      return true;
    } catch (error) {
      console.error('迁移失败:', error);
      return false;
    }
  }
}

// 导出单例
module.exports = new StorageAdapter();
