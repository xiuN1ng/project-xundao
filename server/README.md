# 🧘 挂机修仙 - Idle Cultivation

一款基于 JavaScript/Node.js 的修仙挂机游戏

## 📊 开发进度

```
████████████████████████░░░░░░░░  45+ 功能
```

### 已完成
- ✅ 核心系统 (v1.0) - 境界/挂机/战斗/洞府
- ✅ 数值平衡 (v2.0) - 境界数据/功法/怪物
- ✅ 扩展系统 (v2.1) - 装备/灵根/丹药/历练
- ✅ 机缘系统 (v2.2) - 仙缘/秘宝/悟道/秘境
- ✅ 法宝系统 (v2.3) - 法宝/炼器/天材地宝/回收
- ✅ 灵兽系统 (v4.0) - 灵兽/宗门/世界BOSS/市场/师徒
- ✅ 境界副本 (v4.1) - 副本挑战/成就系统/社交系统
- ✅ 数据库 (v4.1.1) - MySQL支持/AI调试框架

### 计划中
- ✅ 灵兽系统 - 已实现
- ✅ 宗门系统 - 已实现
- ✅ 世界BOSS - 已实现
- ✅ 交易市场 - 已实现
- ⏳ 师徒系统 - 开发中
- ⏳ 境界副本 - 已实现
- ⏳ 活动系统 - 已实现

---

## 🚀 快速开始

```bash
# 安装依赖
cd idle-cultivation
npm install

# 启动游戏
npm start
```

游戏运行在 http://localhost:3001

---

## 📁 项目结构

```
idle-cultivation/
├── src/
│   ├── core/
│   │   ├── game.js          # 核心引擎
│   │   ├── database.js       # MySQL连接池
│   │   ├── storage.js        # 存储适配器
│   │   ├── introspection.js  # AI调试框架
│   │   └── ...
│   └── index.html            # 游戏界面
├── server.js                 # 服务器入口
├── .env                      # 环境配置
├── CHANGELOG.md              # 开发进度
└── package.json
```

---

## ⚙️ 配置

### MySQL（可选）

```bash
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=gameuser
export DB_PASSWORD=game123456
export DB_NAME=idle_cultivation
```

或不配置，默认使用 SQLite。

---

## 🎮 游戏特色

- 🧘 境界修炼 - 从凡人到仙人的修仙之路
- ⚔️ 战斗系统 - 副本挑战、秘境探索
- 🏠 洞府经营 - 灵田、炼丹、炼器
- 🔮 法宝系统 - 炼器合成、天材地宝
- 🌟 机缘系统 - 仙缘、悟道、传承
- 🏰 境界副本 - 9大境界挑战
- 🏆 成就系统 - 50+成就
- 👥 社交系统 - 好友/聊天/互动

---

## 📝 更新日志

详见 [CHANGELOG.md](CHANGELOG.md)

---

## 🤝 贡献

1. Fork 仓库
2. 创建分支 (`git checkout -b feature/xxx`)
3. 提交更改
4. 推送分支
5. 创建 Pull Request
