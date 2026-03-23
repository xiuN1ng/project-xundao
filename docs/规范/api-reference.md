# 挂机修仙 - API 参考文档

## 丹药系统 (/api/alchemy)

### 丹方

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/alchemy/recipes | 获取所有丹方 |
| GET | /api/alchemy/recipes/:id | 获取指定丹方详情 |

### 材料

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/alchemy/materials | 获取所有材料 |
| GET | /api/alchemy/materials/my | 获取玩家材料 |
| POST | /api/alchemy/materials | 添加材料(测试用) |

### 炼丹

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/alchemy/craft | 炼丹 |
| GET | /api/alchemy/pills | 获取玩家丹药 |

### 炼丹炉

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/alchemy/furnace | 获取玩家炼丹炉 |
| POST | /api/alchemy/furnace/upgrade | 升级炼丹炉 |
| GET | /api/alchemy/furnace/upgrade-info | 获取升级信息 |

---

## 性能优化模块

### 全局访问
```javascript
const { DataLoader, CacheBreaker, MysqlPool, WSReconnectManager } = global.gamePerformance;
```

### DataLoader (N+1 查询优化)
```javascript
const loader = new DataLoader(async (ids) => {
  // 批量查询
  return db.query('SELECT * FROM users WHERE id IN (?)', [ids]);
});

// 使用
const user = await loader.load(userId);
```

### CacheBreaker (缓存雪崩防护)
```javascript
const cache = new CacheBreaker(redis, 'player:', 3600);
const data = await cache.get(`player:${playerId}`, () => fetchFromDB());
```

---

## 更新日志
- 2026-03-10: 添加丹药系统 API 文档
- 2026-03-10: 添加性能优化模块文档
