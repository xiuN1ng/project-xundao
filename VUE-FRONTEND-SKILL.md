# Vue 前端技能规范 v1.0

> 防止"149个面板各自为战、没有复用"的悲剧重演。
> 本规范是**强制约束**，不是建议。

---

## 一、组件库（必须使用）

所有新写面板时，**先从以下组件库中找**，而不是自己写。

### 基础组件 `components/base/`

| 组件 | 何时用 | 关键 Props |
|------|--------|-----------|
| `BasePanel.vue` | 任何面板弹窗 | `title, icon, closable, variant, tabItems` |
| `BaseButton.vue` | 任何按钮 | `variant: primary/danger/gold/ghost`, `size: sm/md/lg`, `loading` |

### 通用组件 `components/common/`

| 组件 | 何时用 | 关键 Props/用法 |
|------|--------|----------------|
| `Toast.vue` | 提示消息 | `toast.success('完成')`, `toast.error('失败')`, `toast.reward('获得物品')` |
| `RewardPopup.vue` | 奖励展示弹窗 | `rewardPopup.show({ items: [...], rank: 'epic' })` |
| `DamageNumber.vue` | 战斗伤害飘字 | `damage.crit(1234)`, `damage.heal(500)`, `damage.miss()` |
| `ProgressBar.vue` | 任何进度条 | `current, total, color: primary/success/gold`, `animated, showLabel` |
| `HPBar.vue` | HP/MP/EXP条 | `current, max, color: hp/mp/exp/boss`, `label` |

### API 层 `core/api.js`

| 函数 | 何时用 |
|------|--------|
| `api.get('/api/xxx')` | 获取数据 |
| `api.post('/api/xxx', data)` | 提交数据 |
| **禁止**：在 Vue 组件里直接 `fetch('/api/...')` |

---

## 二、面板编写规范（强制）

### 新面板不得超过 250 行

超过 250 行 → 说明需要拆分 → 抽取子组件。

### 正确用法示例

```vue
<!-- ✅ 正确：用 BasePanel + BaseButton + HPBar -->
<template>
  <BasePanel title="宗门" icon="🏛️" :tab-items="tabs" @close="$emit('close')">
    <!-- 用 Toast 提示 -->
    <BaseButton variant="primary" :loading="joining" @click="joinSect">
      {{ joining ? '加入中...' : '加入宗门' }}
    </BaseButton>

    <!-- 用 HPBar -->
    <HPBar :current="sectHp" :max="sectMaxHp" label="宗门血量" color="hp" />
  </BasePanel>
</template>

<script setup>
import { ref } from 'vue'
import { api } from '../../core/api.js'
import { useToast } from '../common/toastComposable.js'
import BasePanel from '../base/BasePanel.vue'
import BaseButton from '../base/BaseButton.vue'
import HPBar from '../common/HPBar.vue'

const toast = useToast()
const joining = ref(false)

async function joinSect() {
  joining.value = true
  try {
    const res = await api.post('/api/sect/join', { sect_id: 1 })
    if (res.success) {
      toast.success('加入宗门成功！')
    } else {
      toast.error(res.error || '加入失败')
    }
  } finally {
    joining.value = false
  }
}
</script>
```

### 错误用法（禁止）

```vue
<!-- ❌ 错误：自己写面板结构 -->
<template>
  <div class="my-panel" style="background:rgba(15,15,40,0.95); border-radius:16px; ...">
    <div class="panel-header" style="display:flex; justify-content:space-between; ...">
      <span style="color:#f093fb; font-size:18px;">宗门</span>
      <button @click="$emit('close')" style="border-radius:50%; ...">×</button>
    </div>
    <button @click="join" style="background:linear-gradient(...); padding:10px 22px; ...">
      加入宗门
    </button>
  </div>
</template>

<!-- ❌ 错误：直接 fetch -->
<script setup>
async function join() {
  const res = await fetch('/api/sect/join', { ... }) // 禁止！
  // ...
}
</script>
```

---

## 三、共享组件使用示例

### Toast 提示（所有操作结果）

```js
import { useToast } from '../common/toastComposable.js'
const toast = useToast()

toast.success('操作成功！')
toast.error('灵石不足')
toast.reward('获得 100 灵石')
toast.info('请先选择目标')
toast.warning('今日次数已用完')
```

### 奖励弹窗

```js
import RewardPopup from '../common/RewardPopup.vue'

rewardPopup.show({
  items: [
    { icon: '💎', name: '灵气', count: 500 },
    { icon: '💰', name: '灵石', count: 200 },
  ],
  rank: 'epic',     // normal / rare / epic / legendary
  title: '通关奖励',
  isCrit: true,
  autoClose: 4000,
})
```

### 伤害飘字

```vue
<!-- 放在战斗 Arena 的相对定位容器内 -->
<DamageNumber ref="dmg" />

<script>
dmg.value.crit(1234, { x: 100, y: 50 })  // 暴击
dmg.value.heal(500)                         // 治疗
dmg.value.miss()                            // 未命中
dmg.value.buff('+20%')                     // buff
</script>
```

### HP 条

```vue
<HPBar :current="playerHp" :max="playerMaxHp" label="HP" color="hp" height="10" />
<HPBar :current="mp" :max="maxMp" label="MP" color="mp" />
<HPBar :current="exp" :max="expToNext" label="经验" color="exp" />
```

---

## 四、禁止事项（铁律）

| 禁止 | 正确做法 |
|------|---------|
| 自己写 `<div class="panel-header" style="...">` | 用 `<BasePanel>` |
| 按钮写 `style="background:linear-gradient...` | 用 `<BaseButton variant="primary">` |
| HP条写 `<div style="width:50%; background:...">` | 用 `<HPBar>` |
| 提示写 `alert('错误')` 或自己写 toast | 用 `useToast()` |
| 组件里直接 `fetch('/api/...')` | 用 `api.post()` |
| 复制其他面板的 CSS | 抽取为共享组件 |
| 新面板超过 250 行 | 拆分 + 抽取子组件 |
| 用 `Math.random()` 模拟战斗结果 | 调用后端 API |
| 在 Vue 里操作 `document.getElementById` | 用 Vue 的响应式状态 |

---

## 五、core/ 逻辑复用规则

| 已有 core 文件 | 不要重写 | 面板中调用方式 |
|--------------|---------|--------------|
| `core/battle.js` | 战斗算法 | `battle.tick(state)` |
| `core/api.js` | API 封装 | `api.get/post()` |
| `core/game.js` | 游戏主逻辑 | `game.getState()` |
| `core/*-ui.js` | 各系统UI逻辑 | 直接 import 使用 |

**原则：core/ 是唯一真相源。面板只负责展示，不负责写业务逻辑。**

---

## 六、文件组织

```
components/
  base/           ← 基础设施，所有面板都要用
    BasePanel.vue
    BaseButton.vue

  common/          ← 通用UI组件
    Toast.vue / toastComposable.js
    RewardPopup.vue
    DamageNumber.vue
    ProgressBar.vue
    HPBar.vue

  game/           ← 游戏特定通用组件（可选新建）
    BattleArena.vue   ← 通用战斗可视化
    FloorGrid.vue     ← 网格层选择器
    RankingList.vue    ← 排行榜列表

  [feature]/      ← 具体功能面板（每个功能一个子目录）
    TowerPanel.vue    ← 用 BasePanel + HPBar + DamageNumber + API
```

---

## 七、违反规范的责任

- **Agent 写的面板超过 250 行** → 拆分后才接受
- **没有复用已有组件** → Review 时打回重写
- **在组件里直接 fetch** → Review 时打回
- **复制粘贴其他面板的代码** → Review 时打回

---

## 八、参考示例

### 完整面板示例（150行，推荐学习）

```vue
<template>
  <BasePanel
    title="无尽塔"
    icon="🗼"
    :tab-items="tabs"
    :default-tab="activeTab"
    variant="primary"
    @tab-change="activeTab = $event"
    @close="$emit('close')"
  >
    <!-- 挑战模式 -->
    <div v-if="activeTab === 'challenge'">
      <HPBar :current="enemyHp" :max="enemyMaxHp" :label="enemyName" color="boss" />

      <!-- 战斗 Arena -->
      <div class="battle-arena" style="position:relative">
        <DamageNumber ref="dmg" />
        <!-- 敌人 -->
        <div class="enemy">
          <span>{{ enemyIcon }}</span>
          <button @click="attack" variant="primary">攻击</button>
        </div>
      </div>
    </div>

    <!-- 扫荡模式 -->
    <div v-if="activeTab === 'sweep'">
      <ProgressBar :current="sweepProgress" :total="sweepTotal" color="success" show-label />
    </div>
  </BasePanel>
</template>

<script setup>
import { ref } from 'vue'
import { api } from '../../core/api.js'
import { useToast } from '../common/toastComposable.js'
import BasePanel from '../base/BasePanel.vue'
import HPBar from '../common/HPBar.vue'
import ProgressBar from '../common/ProgressBar.vue'
import DamageNumber from '../common/DamageNumber.vue'

const toast = useToast()
const activeTab = ref('challenge')
const tabs = [
  { id: 'challenge', name: '挑战', icon: '⚔️' },
  { id: 'sweep', name: '扫荡', icon: '🧹' },
]
const enemyHp = ref(1000)
const enemyMaxHp = ref(1000)
const enemyName = ref('守关者')
const enemyIcon = ref('👹')

async function attack() {
  const res = await api.post('/api/tower/attack', { floor: currentFloor.value })
  if (res.success) {
    enemyHp.value = res.data.enemyHp
    dmg.value.crit(res.data.damage)
    if (res.data.enemyHp <= 0) toast.reward('通关！')
  }
}
</script>
```

---

## 版本

- 2026-03-24 v1.0 初版（BasePanel, BaseButton, Toast, DamageNumber, RewardPopup, HPBar, ProgressBar）
