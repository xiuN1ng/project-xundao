# 分支管理规范 (BRANCH_STRATEGY.md)

## 当前问题

1. index.html 是 15075 行的 monolith，没有真正拆分
2. components/ 和 core/ 目录存在但没被使用
3. 多个 worktree 指向混乱的分支
4. backend 是 gitlink（指向另一个仓库），已转换为实际文件

## 目标架构

### Git 分支结构
```
main           # 稳定版本，可直接部署
├── backend/   # Express routes 架构
├── frontend/
│   ├── index.html      # ~200行，只加载模块
│   ├── main.js
│   ├── core/           # 业务逻辑（必须被引用）
│   │   ├── game.js
│   │   ├── battle.js
│   │   └── ...
│   ├── components/     # UI 组件（必须被引用）
│   │   ├── BattlePanel.js
│   │   └── ...
│   ├── server/         # API 调用
│   └── assets/         # 静态资源
└── docs/
```

### Worktree 映射
```
/workspace/game (main 分支 - 主开发目录)
├── backend/            # 主后端代码
├── frontend/           # 主前端代码
└── docs/               # 文档

/worktrees/game-backend (backend 分支)
  → 同步 backend/ 目录

/worktrees/game-frontend (frontend 分支)
  → 同步 frontend/ 目录
```

## 重构步骤

### Phase 1: 清理 (立即)
- [x] 修复 backend gitlink → 实际文件
- [ ] 验证 origin/main 结构正确

### Phase 2: 真正的 MVC 重构 (计划中)
- [ ] 将 index.html 中的组件代码拆分到 components/
- [ ] 将 index.html 中的业务逻辑拆分到 core/
- [ ] 修改 index.html 使用 ES6 import 加载模块
- [ ] 验证所有模块被正确引用

### Phase 3: 规范化分支管理
- [ ] 所有 agent 在正确的 worktree 中工作
- [ ] 禁止在 index.html 中写新代码
- [ ] 新功能必须创建新组件文件

## 违规检测

每次心跳检查：
```bash
# 检查 index.html 是否过大
wc -l frontend/index.html  # 应该 < 500 行

# 检查 components/ 是否被使用
grep -r "components/" frontend/index.html

# 检查 core/ 是否被使用
grep -r "core/" frontend/index.html
```

## 架构原则

1. **index.html 只做加载和路由**，不包含业务逻辑
2. **components/ 放 UI 渲染逻辑**
3. **core/ 放业务逻辑和状态管理**
4. **禁止大块内联代码**，所有功能必须是独立模块
