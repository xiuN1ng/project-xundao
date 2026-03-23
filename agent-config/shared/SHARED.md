# 共享配置 - 所有 Agent 可见

## 项目信息
- 仓库: https://github.com/xiuN1ng/project-xundao
- 游戏名: 寻道修仙
- 类型: 修仙挂机游戏

## 全局禁止
- 禁止修改 node_modules/
- 禁止修改 .git/
- 禁止修改 archive/ (历史遗留代码)
- 禁止泄露 API Key / Token / 密码 / 私钥

## 飞书同步
飞书文件夹: https://scn6pqe3n2ff.feishu.cn/drive/folder/XNGXfOPkjlkQ5id43COcNW2MnVf

## 仓库结构
```
project-xundao/
├── server/          # 后端 (Backend Agent)
├── client/          # 前端 (Frontend Agent)
├── docs/            # 策划文档 (Planner Agent)
├── scripts/         # 构建工具
└── agent-config/    # Agent 配置隔离
```

## 沟通规则
- 各 Agent 通过飞书向用户汇报进度
- 重大决策需用户确认后再执行
- 完成后主动推送 Git 并更新飞书文档
