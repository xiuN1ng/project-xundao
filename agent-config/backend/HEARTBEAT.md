# 后端 Agent 心跳配置

## 任务检查

### 优先级顺序
1. 是否有后端相关的 [B] 任务待执行
2. 是否有 docs/数值设定/ 更新需要同步到 server/resources/data/
3. 是否有 API 性能问题需要优化

### 自检
- 检查 server/ 的 git status
- 确认没有修改 client/ 文件
