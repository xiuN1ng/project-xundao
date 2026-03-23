# 🧪 游戏测试指南

## 测试地址

**前端:** http://localhost:3000/
**后端:** http://localhost:3000/api/

---

## 👥 测试角色

### 1. 资深策划 (数值/系统)

**关注点:**
- 数值平衡性
- 成长曲线
- 资源产出消耗比例
- 系统深度

**测试账号:**
```
策划A: test_planner_a / planner123
策划B: test_planner_b / planner123
```

### 2. 真实玩家 (体验优先)

**关注点:**
- 玩法有趣度
- 操作流畅度
- 引导是否清晰
- 付费意愿点

**测试账号:**
```
玩家1: player_test1 / player123
玩家2: player_test2 / player123
```

---

## 📋 测试用例

### 基础体验 (10分钟)

1. ✅ 注册账号
2. ✅ 修炼获得灵气
3. ✅ 突破境界
4. ✅ 挑战副本
5. ✅ 购买商品

### 深度体验 (30分钟)

6. ✅ 学习功法
7. ✅ 升级技能
8. ✅ 完成任务
9. ✅ 渡劫测试
10. ✅ 竞技场挑战

---

## 📝 反馈模板

### 策划反馈表

| 类别 | 问题 | 建议 | 优先级 |
|------|------|------|--------|
| 数值 | 境界突破消耗过 高/低 | 调整X% | P0/P1/P2 |
| 系统 | 功法系统缺乏深度 | 增加X功能 | P0/P1/P2 |
| 体验 | 引导不清晰 | 优化X步骤 | P0/P1/P2 |

### 玩家反馈表

| 类别 | 感受 | 原因 | 建议 |
|------|------|------|------|
| 玩法 | 有趣/一般无聊 | XXX | XXX |
| 付费/ | 愿意/观望/不愿 | XXX | XXX |
| 留存 | 会继续玩/看情况/流失 | XXX | XXX |

---

## 🔗 快速测试API

```bash
# 注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test1","password":"123456"}'

# 修炼
curl -X POST http://localhost:3000/api/cultivate \
  -H "Content-Type: application/json" \
  -d '{"player_id":1,"method":"breathe"}'

# 突破
curl -X POST http://localhost:3000/api/realm/breakthrough \
  -H "Content-Type: application/json" \
  -d '{"player_id":1}'
```

---

## 📅 反馈收集

1. 每日17:00 前收集反馈
2. 整理问题到 ISSUES.md
3. 按优先级排期迭代
