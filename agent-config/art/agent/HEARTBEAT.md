# HEARTBEAT.md - Art Agent

## 任务来源
1. 读取 `cron-tasks-todo.txt` 中的 [A] 标签美术任务
2. 根据策划提案主动生成需求图片

## 额度控制
- 检查 `art-count.json` 中的当日计数
- 每天上限 60 张（count < 60 才生成）
- count++ 并保存到 art-count.json

## Feishu 同步
如有新图片完成，同步到飞书 folder: XNGXfOPkjlkQ5id43COcNW2MnVf

## 禁止
- 不修改 server/ 任何文件
- 不修改 docs/ 任何文件（只读）
