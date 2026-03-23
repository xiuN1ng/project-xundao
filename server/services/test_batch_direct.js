/**
 * 批量查询优化测试 - 直接数据库测试
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'game.db');
const db = new Database(dbPath);

console.log('========================================');
console.log('批量查询优化测试');
console.log('========================================\n');

// 原有N+1查询实现
function oldGetSect(playerId) {
  const sect = db.prepare('SELECT * FROM sect WHERE player_id = ?').get(playerId);
  if (!sect) return null;
  
  const buildings = {};
  db.prepare('SELECT * FROM sect_buildings WHERE player_id = ?').all(playerId).forEach(row => {
    buildings[row.building_id] = row.level;
  });
  
  const disciples = db.prepare('SELECT * FROM sect_disciples WHERE player_id = ?').all(playerId);
  const techs = db.prepare('SELECT * FROM sect_techs WHERE player_id = ?').all(playerId).map(t => t.tech_id);
  
  return { sect, buildings, disciples, techs };
}

function oldGetSects(playerIds) {
  const result = [];
  for (const playerId of playerIds) {
    const sect = oldGetSect(playerId);
    if (sect) result.push(sect);
  }
  return result;
}

// 优化批量查询实现
function newGetSectsWithRelations(playerIds) {
  if (!playerIds || playerIds.length === 0) return new Map();
  
  const uniqueIds = [...new Set(playerIds)];
  const placeholders = uniqueIds.map(() => '?').join(',');
  
  // 1. 批量获取宗门基本信息
  const sectRows = db.prepare(`SELECT * FROM sect WHERE player_id IN (${placeholders})`).all(...uniqueIds);
  
  // 2. 批量获取建筑数据
  const buildingRows = db.prepare(`SELECT * FROM sect_buildings WHERE player_id IN (${placeholders})`).all(...uniqueIds);
  
  // 3. 批量获取弟子数据
  const discipleRows = db.prepare(`SELECT * FROM sect_disciples WHERE player_id IN (${placeholders})`).all(...uniqueIds);
  
  // 4. 批量获取技能数据
  const techRows = db.prepare(`SELECT * FROM sect_techs WHERE player_id IN (${placeholders})`).all(...uniqueIds);
  
  // 构建玩家ID到数据的映射
  const result = new Map();
  
  // 初始化结果Map
  sectRows.forEach(sect => {
    result.set(sect.player_id, {
      id: sect.id,
      player_id: sect.player_id,
      sect_type: sect.sect_type,
      sect_name: sect.name,
      sect_level: sect.level || 1,
      sect_exp: sect.exp || 0,
      contribution: sect.contribution || 0,
      buildings: {},
      disciples: [],
      techs: [],
      created_at: sect.created_at
    });
  });
  
  // 填充建筑数据
  buildingRows.forEach(b => {
    const sect = result.get(b.player_id);
    if (sect) {
      sect.buildings[b.building_id] = b.level;
    }
  });
  
  // 填充弟子数据
  discipleRows.forEach(d => {
    const sect = result.get(d.player_id);
    if (sect) {
      sect.disciples.push({
        disciple_id: d.disciple_id || `disciple_${d.id}`,
        name: d.disciple_name || d.name,
        class: d.disciple_class,
        level: d.disciple_level || d.level || 1,
        cultivation: d.cultivation || 0,
        talent: d.talent || 1,
        loyalty: d.loyalty ?? 50,
        created_at: d.created_at
      });
    }
  });
  
  // 填充技能数据
  techRows.forEach(t => {
    const sect = result.get(t.player_id);
    if (sect) {
      sect.techs.push(t.tech_id);
    }
  });
  
  return result;
}

// 简单缓存
const cache = { data: new Map() };
function getCached(key) {
  return cache.data.get(key);
}
function setCache(key, value) {
  cache.data.set(key, value);
}

// 测试
const playerIds = db.prepare('SELECT DISTINCT player_id FROM sect LIMIT 10').all().map(r => r.player_id);
console.log(`测试玩家数量: ${playerIds.length}\n`);

if (playerIds.length === 0) {
  console.log('没有测试数据');
  db.close();
  process.exit(0);
}

// 测试批量查询
console.log('--- 批量查询测试 ---');
const t1 = Date.now();
const oldResult = oldGetSects(playerIds);
const t2 = Date.now();
console.log(`原有实现 (N+1查询 ${playerIds.length} 次): ${t2 - t1}ms`);

const t3 = Date.now();
const newResult = newGetSectsWithRelations(playerIds);
const t4 = Date.now();
console.log(`优化实现 (批量查询 4 次): ${t4 - t3}ms`);

// 缓存测试
console.log('\n--- 缓存测试 ---');
setCache('test', oldResult);
const t5 = Date.now();
const cached = getCached('test');
const t6 = Date.now();
console.log(`缓存命中: ${t6 - t5}ms (vs 新查询 ${t2 - t1}ms)`);

// 查询数量对比
console.log('\n--- 查询次数对比 ---');
console.log(`原有实现: ${playerIds.length * 4} 次查询 (每个玩家4次)`);
console.log(`优化实现: 4 次查询 (批量)`);
console.log(`查询减少: ${playerIds.length * 4 - 4} 次\n`);

console.log('========================================');
console.log('优化效果: 查询次数大幅减少!');
console.log('========================================');

db.close();
