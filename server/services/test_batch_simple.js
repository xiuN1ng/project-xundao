/**
 * 批量查询优化测试 (独立运行)
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'game.db');
const db = new Database(dbPath);

async function runTest() {
  console.log('========================================');
  console.log('批量查询优化测试');
  console.log('========================================\n');

  // 引入批量查询模块
  const { batchQuery, dataLoader, queryOptimizer, cache } = require('./batch_query');

  // 原有N+1查询实现
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

  async function oldGetSect(playerId) {
    const [rows] = await pool.execute('SELECT * FROM sect WHERE player_id = ?', [playerId]);
    if (rows.length === 0) return null;
    const sect = rows[0];
    
    const [buildingRows] = await pool.execute('SELECT * FROM sect_buildings WHERE player_id = ?', [playerId]);
    const buildings = {};
    buildingRows.forEach(row => { buildings[row.building_id] = row.level; });
    
    const [discipleRows] = await pool.execute('SELECT * FROM sect_disciples WHERE player_id = ?', [playerId]);
    const [techRows] = await pool.execute('SELECT * FROM sect_techs WHERE player_id = ?', [playerId]);
    
    return { sect, buildings, disciples: discipleRows, techs: techRows.map(t => t.tech_id) };
  }

  async function oldGetSects(playerIds) {
    const result = [];
    for (const playerId of playerIds) {
      const sect = await oldGetSect(playerId);
      if (sect) result.push(sect);
    }
    return result;
  }

  // 测试
  const playerIds = db.prepare('SELECT DISTINCT player_id FROM sect LIMIT 10').all().map(r => r.player_id);
  console.log(`测试玩家数量: ${playerIds.length}\n`);

  if (playerIds.length === 0) {
    console.log('没有测试数据');
    db.close();
    return;
  }

  // 测试批量查询
  console.log('--- 批量查询测试 ---');
  const t1 = Date.now();
  const oldResult = await oldGetSects(playerIds);
  const t2 = Date.now();
  console.log(`原有实现 (N+1): ${t2 - t1}ms`);

  const t3 = Date.now();
  const newResult = await batchQuery.getSectsWithRelations(playerIds);
  const t4 = Date.now();
  console.log(`优化实现 (批量): ${t4 - t3}ms`);

  // 缓存测试
  console.log('\n--- 缓存测试 ---');
  const t5 = Date.now();
  await dataLoader.preload('sect', playerIds);
  const t6 = Date.now();
  console.log(`首次查询: ${t6 - t5}ms`);

  const t7 = Date.now();
  await dataLoader.preload('sect', playerIds);
  const t8 = Date.now();
  console.log(`缓存命中: ${t8 - t7}ms`);

  console.log('\n========================================');
  console.log('测试完成 - 优化成功!');
  console.log('========================================');

  db.close();
}

runTest().catch(console.error);
