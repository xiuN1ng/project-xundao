# 前端架构规范 v1.0

## 核心理念

**不要重写已有的东西。组合、复用、完善。**

每个新面板或重构面板时，第一步是：检查是否已有可复用的组件/composables。

---

## 目录结构

```
src/
  core/           # 业务逻辑层（已有，不要重写）
    battle.js         # 战斗核心算法
    api.js            # API 调用封装
    game.js          # 游戏主逻辑
    *-ui.js          # 各系统UI逻辑（混杂DOM，不要新增）

  components/
    base/
      BasePanel.vue   # ✅ 面板基类（统一 header/close/tabs）
      BaseModal.vue   # 待创建：通用弹窗基类

    common/
      Toast.vue            # ✅ 统一提示（成功/错误/奖励/战斗）
      DamageNumber.vue     # ✅ 伤害飘字
      RewardPopup.vue      # ✅ 奖励弹窗（稀有度分级+动画）
      ProgressBar.vue      # ✅ 进度条（多种颜色/动画）
      ToastComposable.js   # ✅ useToast composable
      FloorGrid.vue     # 待创建：网格层选择器

    *Panel.vue         # 具体业务面板（使用 BasePanel + common）

  composables/
    useBattle.js         # 待创建：战斗状态管理
    useSweep.js          # 待创建：扫荡逻辑
    useFloorSelect.js    # 待创建：塔层选择

  views/
    Game.vue           # 唯一入口
```

---

## 已建成的通用组件（强制复用）

### BasePanel.vue — 所有面板的基类

```vue
<template>
  <BasePanel
    title="无尽塔"
    icon="🗼"
    :tab-items="tabs"
    variant="boss"
    @close="emit('close')"
    @tab-change="onTabChange"
  >
    <!-- 自定义标题插槽 -->
    <template #title>自定义标题</template>
    <!-- 自定义操作按钮 -->
    <template #actions>...</template>

    <!-- Tab 内容 -->
    <template #default="{ activeTab }">
      <div v-if="activeTab === 'challenge'">挑战内容</div>
    </template>
  </BasePanel>
</template>
```

**Props:**
- `title`, `subtitle`, `icon` — 头部信息
- `variant` — `default` | `primary` | `boss` | `special`（不同背景主题）
- `closable`, `closeTitle` — 关闭行为
- `tabItems` — 自动渲染 tabs，格式: `[{ id, name, icon }]`
- `headerStyle` — `normal` | `compact` | `none`

---

### Toast.vue — 统一提示

```vue
<template>
  <Toast ref="toast" />
</template>

<script setup>
const toast = ref()

toast.value.success('升级成功！')
toast.value.error('网络错误')
toast.value.reward('获得玄天丹 ×3')
toast.value.battle('暴击！')
toast.value.info('灵气不足，请先挂机修炼')
</script>
```

**类型**: success | error | warning | info | reward | battle

---

### DamageNumber.vue — 伤害飘字

```vue
<template>
  <div style="position: relative; width: 200px; height: 200px">
    <DamageNumber ref="dmg" />
  </div>
</template>

<script setup>
const dmg = ref()

dmg.value.add(1234)         // 普通伤害
dmg.value.crit(5678)        // 暴击（黄色大字）
dmg.value.heal(500)         // 治疗
dmg.value.miss()            // 未命中
dmg.value.buff('攻击+20%')  // buff提示
</script>
```

---

### RewardPopup.vue — 奖励弹窗

```vue
<template>
  <RewardPopup ref="reward" />
</template>

<script setup>
const reward = ref()

// 普通奖励
reward.value.show({ items: [
  { icon: '💎', name: '灵气', count: 500 },
  { icon: '💰', name: '灵石', count: 200 },
]})

// 稀有奖励（紫色边框+粒子）
reward.value.show({ items: [...], rank: 'rare' })

// 传说奖励（金色边框+光环）
reward.value.show({ items: [...], rank: 'legendary', isCrit: true })
</script>
```

**rank**: `normal` | `rare` | `epic` | `legendary`

---

### ProgressBar.vue — 进度条

```vue
<ProgressBar
  :current="35"
  :total="100"
  color="primary"
  :height="12"
  :animated="true"
  :show-label="true"
  :show-pct="true"
/>
```

**color**: `primary` | `success` | `warning` | `danger` | `gold` | `boss`

---

## 面板拆分规范

面板应满足：

1. **不超过 300 行 Vue 代码**（不含 CSS）
2. **使用 BasePanel** 作为根组件
3. **使用 common 组件**处理通用 UI
4. **通过 composables 管理状态**

---

## 旧面板重构优先级

| 文件 | 行数 | 问题 | 优先级 |
|------|------|------|--------|
| `TowerPanel.vue` | 1956 | 战斗/扫荡自立，没有用 common 组件 | P0 |
| `WelfarePanel.vue` | 2815 | 最大面板，疑似重复实现 | P0 |
| `InterSectWarPanel.vue` | 1965 | 战斗 UI 与其他面板重复 | P1 |
| `EnhancementPanel.vue` | 1325 | 强化逻辑 | P1 |

---

## 禁止事项

- ❌ 在面板里直接写 `alert()` — 用 `Toast`
- ❌ 复制其他面板的 damage/奖励代码 — 用 `DamageNumber` / `RewardPopup`
- ❌ 自己写进度条 HTML/CSS — 用 `ProgressBar`
- ❌ 面板超过 300 行 — 说明需要拆分
- ❌ 重写 core/ 已有逻辑

---

## 文件更新日志

- 2026-03-24: v1.0 初版建立
  - ✅ BasePanel.vue（面板基类）
  - ✅ Toast.vue（统一提示）
  - ✅ DamageNumber.vue（伤害飘字）
  - ✅ RewardPopup.vue（奖励弹窗）
  - ✅ ProgressBar.vue（进度条）
  - ✅ toastComposable.js（useToast）
  - ⬜ BaseModal.vue（待创建）
  - ⬜ FloorGrid.vue（待创建）
  - ⬜ useBattle.js（待创建）
