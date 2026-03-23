# 游戏UI组件库

本目录包含Vue3组件，用于扩展挂机修仙游戏的功能界面。

## 组件列表

| 组件名 | 文件 | 功能 |
|--------|------|------|
| 技能按钮 | SkillButton.vue | 战斗技能按钮，支持冷却动画 |
| PVP面板 | PVPPanel.vue | PVP对战系统 |
| 师徒面板 | MasterPanel.vue | 师徒/拜师系统 |
| 充值面板 | PaymentPanel.vue | 充值、礼包、月卡 |

## 快速开始

### 方法1: 在Vue项目中直接使用

```javascript
import SkillButton from './components/SkillButton.vue'
import PVPPanel from './components/PVPPanel.vue'
import MasterPanel from './components/MasterPanel.vue'
import PaymentPanel from './components/PaymentPanel.vue'

// 注册组件
components: {
  SkillButton,
  PVPPanel,
  MasterPanel,
  PaymentPanel
}
```

### 方法2: 在现有Electron/HTML项目中集成

在 `index.html` 中添加:

```html
<!-- 1. 引入Vue3 -->
<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>

<!-- 2. 引入组件样式 -->
<link rel="stylesheet" href="src/components/styles.css">

<!-- 3. 引入组件管理器 -->
<script src="src/components/ui-manager.js"></script>

<!-- 4. 引入组件 (需要构建工具或动态加载) -->
<script type="module">
  import { createApp, ref, reactive } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
  
  // 动态加载组件并注册
  // ... 具体实现见下文
</script>
```

### 方法3: 显示面板 (推荐)

在游戏的JavaScript代码中调用:

```javascript
// 显示PVP面板
showPVPanel({ name: '修士', level: 10, realm: '筑基期', hp: 1000, maxHp: 1000 });

// 显示师徒面板  
showMasterPanel({ name: '修士', level: 15, realm: '筑基期' });

// 显示充值面板
showPaymentPanel('player_123');
```

## 组件详细说明

### SkillButton.vue - 技能按钮

属性:
- `skill`: 技能对象 { id, name, icon, cooldown, hotkey, mpCost, description }
- `disabled`: 是否禁用
- `currentMp`: 当前灵气值

事件:
- `@cast`: 技能释放时触发
- `@cooldown-start`: 冷却开始时触发
- `@cooldown-end`: 冷却结束时触发

### PVPPanel.vue - PVP面板

属性:
- `player`: 玩家数据 { name, level, realm, hp, maxHp, attack, defense }

事件:
- `@battle-start`: 战斗开始时触发
- `@battle-end`: 战斗结束时触发
- `@match`: 匹配对手时触发

### MasterPanel.vue - 师徒面板

属性:
- `player`: 玩家数据 { name, level, realm, realmLevel }

事件:
- `@apply`: 申请拜师时触发
- `@accept`: 同意收徒时触发
- `@reject`: 拒绝申请时触发
- `@teach`: 传授徒弟时触发
- `@gift`: 赠送礼物时触发

### PaymentPanel.vue - 充值面板

属性:
- `playerId`: 玩家ID

事件:
- `@recharge`: 充值时触发
- `@purchase`: 购买时触发
- `@claim`: 领取奖励时触发

## 样式说明

组件使用与游戏一致的修仙主题:
- 主色调: 深紫/墨黑 (#0a0a12, #12121f)
- 强调色: 金色 (#ffd700, #daa520)
- 辅助色: 青色 (#00ffff, #40e0d0)
- 字体: 楷体 (KaiTi)

## 文件结构

```
src/components/
├── SkillButton.vue      # 技能按钮组件
├── PVPPanel.vue         # PVP面板组件
├── MasterPanel.vue      # 师徒面板组件
├── PaymentPanel.vue     # 充值面板组件
├── ui-manager.js        # 组件管理器
├── styles.css          # 组件样式
└── README.md            # 本文件
```

## 注意事项

1. 这些组件使用Vue3 Composition API编写
2. 需要Vue3环境才能运行
3. 样式与现有游戏(index.html)保持一致
4. 组件支持响应式布局，适配移动端
