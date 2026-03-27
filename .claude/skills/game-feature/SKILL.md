---
name: game-feature
description: "寻道修仙游戏新功能开发工作流。从系统设计到前后端联调的标准流程。"
argument-hint: "[功能名称]"
user-invocable: true
allowed-tools: Read, Glob, Grep, Bash, Edit, Write, sessions_spawn
---

# 游戏功能开发工作流

适用于设计新系统：功法、经脉、副本、战斗、商店等。

## 流程概述

```
需求分析 → 系统设计 → 数值平衡 → 评审批准 → 后端实现 → 前端实现 → 联调测试
```

## Step 1: 需求分析

明确：
- **核心乐趣**：玩家在这里获得什么体验？
- **成长循环**：玩家如何进步？
- **资源循环**：投入什么，产出什么？
- **短期/长期目标**：玩家玩这个系统能获得什么？

## Step 2: 系统设计

输出完整的系统设计文档：

```markdown
# {系统名称}设计方案 v1.0

## 1. 设计目标
### 1.1 核心乐趣
- 描述玩家玩这个系统的核心体验

### 1.2 定位
- 在游戏生命周期中的位置（前期/中期/后期）
- 与其他系统的关联

## 2. 系统规则
### 2.1 入口
- 如何解锁/进入这个系统

### 2.2 核心循环
```
[操作] → [消耗] → [获得] → [成长] → [解锁]
```

### 2.3 成长机制
- 等级/进度如何提升
- 是否有瓶颈设计

## 3. 数值设计
### 3.1 基础数值表
| 等级 | 数值A | 数值B | 数值C |
|------|-------|-------|-------|
| 1 | 10 | 5 | 2 |
| 2 | 15 | 8 | 3 |
| ... | ... | ... | ... |

### 3.2 资源产出公式
```
产出 = 基础值 × 效率系数 × 时间
```

### 3.3 平衡验证
- [ ] 初期玩家能否顺利上手
- [ ] 中期玩家是否有成长感
- [ ] 后期玩家是否有挑战
- [ ] 付费点是否合理

## 4. 美术资源需求
### 4.1 需要的资源
- [ ] 背景图 X 张
- [ ] 图标 Y 个
- [ ] 角色立绘 Z 张

### 4.2 向 xundao-art 申请
在 AGENT_BULLETIN.md 发起资源申请：
```markdown
### [日期] 资源申请
系统：{系统名称}
需要：
- {描述} → {尺寸} {风格}
```

## 5. 技术实现
### 5.1 数据模型
```
{表名}
- id: 主键
- ...字段
```

### 5.2 API 接口
| 端点 | 方法 | 说明 |
|------|------|------|
| /api/xxx | GET | 获取状态 |
| /api/xxx | POST | 执行操作 |

### 5.3 前端组件
- XxxView.vue
- XxxPanel.vue
- XxxCard.vue

## 6. 进度计划
| 阶段 | 内容 | 负责 |
|------|------|------|
| 设计 | 完成数值和规则 | game-systems-designer |
| 后端 | API + 数据文件 | express-backend-specialist |
| 前端 | UI 实现 | vue-frontend-specialist |
| 联调 | 前后端对接 | QA |
```

## Step 3: 数值平衡

必须验证：
1. **新手友好度**：玩家第一次体验是否顺畅
2. **成长曲线**：数值是否足够平滑
3. **资源平衡**：投入产出比是否合理

```python
# 验证脚本示例
def verify_balance():
    # 炼气期玩家（1-10级）
    for level in range(1, 11):
        exp_needed = calculate_exp(level)
        offline_gain = calculate_offline_gain(level)
        time_needed = exp_needed / offline_gain
        assert 60 < time_needed < 300, f"Level {level} time {time_needed}s unreasonable"
```

## Step 4: 评审批准

展示完整设计后：
> "系统设计如上，包含数值曲线、资源需求、技术方案。请确认是否开始实现？"

等待用户批准后：
1. 创建分支
2. 分配任务给后端/前端 agent
3. 跟踪进度

## Step 5: 协调开发

使用 sessions_spawn 协调多个 agent：

```javascript
// 触发后端开发
sessions_spawn({
  task: "实现 {系统名} API，详情见设计文档...",
  runtime: "subagent",
  agentId: "express-backend-specialist"
})

// 触发前端开发
sessions_spawn({
  task: "实现 {系统名} UI，详情见设计文档...",
  runtime: "subagent", 
  agentId: "vue-frontend-specialist"
})
```

## Step 6: 联调测试

1. 后端 API 准备好后，通知前端
2. 前端调用真实 API（不使用 mock）
3. 验证数据流和界面展示
4. 测试边界情况

## Step 7: 更新状态

完成后：
1. 更新 PROJECT_REGISTRY.md 的系统状态
2. 更新 AGENT_BULLETIN.md 公告
3. 合并到 main 分支
