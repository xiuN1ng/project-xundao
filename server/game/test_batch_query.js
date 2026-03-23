/**
 * 批量查询优化测试
 * 测试批量查询与原有查询的性能对比
 */

const Database = require('better-sqlite3');
const path = require('path');

// 使用与项目相同的数据库
const dbPath = path.join(__dirname, '..', 'data', 'game.db');
const db = new Database(dbPath);

// 引入批量查询模块
const { batchQuery, dataLoader, queryOptimizer, cache } = require('./batch_query');

// MySQL pool兼容层（用于对比）
const pool = {
  execute(sql, params) {
    return new Promise((resolve, reject) => {
      try {
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          if (sql.includes('WHERE') && sql.includes(' LIMIT')) {
            const stmt = db.prepare(sql);
            const result = params ? stmt.get(...params) : stmt.get();
            resolve([[result].filter(Boolean)]);
          } else {
            const stmt = db.prepare(sql);
            const result = params ? stmt.all(...params) : stmt.all();
            resolve([result]);
          }
        } else {
          const stmt = db.prepare(sql);
          const result = params ? stmt.run(...params) : stmt.run();
          resolve([{ affectedRows: result.changes }]);
        }
      } catch (e) {
        reject(e);
      }
    });
  }
};

// 模拟原有的N+1查询实现
const oldQueries = {
  // 原有获取宗门信息的方式 - N+1查询
  async getSectOriginal(playerId) {
    const [rows] = await pool.execute(
      'SELECT * FROM sect WHERE player_id = ?',
      [playerId]
    );

    if (rows.length === 0) return null;

    const sect = rows[0];
    
    // N+1查询: 每个关联数据都单独查询
    const [buildingRows] = await pool.execute(
      'SELECT * FROM sect_buildings WHERE player_id = ?',
      [playerId]
    );
    const buildings = {};
    buildingRows.forEach(row => {
      buildings[row.building_id] = row.level;
    });
    
    const [discipleRows] = await pool.execute(
      'SELECT * FROM sect_disciples WHERE player_id = ?',
      [playerId]
    );
    const disciples = discipleRows.map((row, index) => ({
      disciple_id: row.disciple_id || `disciple_${index}`,
      name: row.disciple_name || row.name || '未知弟子',
      class: row.disciple_class,
      level: row.disciple_level || row.level || 1,
      cultivation: row.cultivation || 0,
      talent: row.talent || 1,
      loyalty: row.loyalty ?? 50,
      created_at: row.created_at
    }));
    
    const [techRows] = await pool.execute(
      'SELECT * FROM sect_techs WHERE player_id = ?',
      [playerId]
    );
    const techs = techRows.map(row => row.tech_id);

    return {
      id: sect.id,
      player_id: sect.player_id,
      sect_type: sect.sect_type,
      sect_name: sect.name || sect.sect_name,
      sect_level: sect.level || sect.sect_level || 1,
      sect_exp: sect.exp || sect.sect_exp || 0,
      contribution: sect.contribution || 0,
      buildings,
      disciples,
      techs,
      created_at: sect.created_at
    };
  },
  
  // 原有批量获取多个宗门的方式 - 逐个查询
  async getSectsOriginal(playerIds) {
    const result = [];
    for (const playerId of playerIds) {
      const sect = await this.getSectOriginal(playerId);
      if (sect) result.push(sect);
    }
    return result;
  }
};

// 性能测试函数
function measureTime(fn, name) {
  const start = Date.now();
  const result = fn();
  const end = Date.now();
  console.log(`[${name}] 耗时: ${end - start}ms`);
  return { result, time: end - start };
}

async function runTests() {
  console.log('========================================');
  console.log('批量查询优化测试');
  console.log('========================================\n');
  
  // 获取测试玩家ID
  const playerIds = db.prepare(
    'SELECT DISTINCT player_id FROM sect LIMIT 10'
  ).all().map(row => row.player_id);
  
  console.log(`测试玩家数量: ${playerIds.length}\n`);
  
  if (playerIds.length === 0) {
    console.log('没有测试数据，请先创建一些宗门数据');
    return;
  }
  
  // 测试1: 单个玩家查询对比
  console.log('--- 测试1: 单个玩家查询 ---');
  const playerId = playerIds[0];
  
  const oldSingleTime = measureTime(
    () => oldQueries.getSectOriginal(playerId),
    '原有实现 (N+1查询)'
  );
  
  const newSingleTime = measureTime(
    () => queryOptimizer.getSectOptimized(playerId),
    '优化实现 (批量查询)'
  );
  
  console.log(`性能提升: ${((oldSingleTime.time - newSingleTime.time) / oldSingleTime.time * 100).toFixed(1)}%\n`);
  
  // 测试2: 批量查询对比
  console.log('--- 测试2: 批量获取多个玩家宗门 ---');
  
  const oldBatchTime = measureTime(
    () => oldQueries.getSectsOriginal(playerIds),
    '原有实现 (逐个查询)'
  );
  
  const newBatchTime = measureTime(
    () => batchQuery.getSectsWithRelations(playerIds),
    '优化实现 (批量查询)'
  );
  
  console.log(`性能提升: ${((oldBatchTime.time - newBatchTime.time) / oldBatchTime.time * 100).toFixed(1)}%\n`);
  
  // 测试3: 缓存测试
  console.log('--- 测试3: 缓存命中测试 ---');
  
  // 第一次查询
  measureTime(
    () => dataLoader.preload('sect', playerIds),
    '首次查询 (无缓存)'
  );
  
  // 第二次查询（应该命中缓存）
  measureTime(
    () => dataLoader.preload('sect', playerIds),
    '二次查询 (有缓存)'
  );
  
  // 测试4: 其他批量查询
  console.log('\n--- 测试4: 其他批量查询 ---');
  
  measureTime(
    () => batchQuery.getPlayersByIds(playerIds),
    '批量获取玩家'
  );
  
  measureTime(
    () => batchQuery.getPlayersGameData(playerIds),
    '批量获取玩家游戏数据'
  );
  
  measureTime(
    () => batchQuery.getRealmDungeonProgress(playerIds),
    '批量获取境界副本次录'
  );
  
  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================');
}

// 运行测试
runTests().catch(console.error);
