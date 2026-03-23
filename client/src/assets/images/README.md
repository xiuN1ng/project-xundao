# 资源目录结构

本目录对应美术资源清单的228个资源文件。

## 目录结构

```
images/
├── ui/                    # UI界面 (26个)
│   ├── top_bar_bg.png
│   ├── bar_lingshi_icon.png
│   ├── bar_diamond_icon.png
│   ├── bar_xiuwei_icon.png
│   ├── bar_exp_icon.png
│   ├── bottom_nav_bg.png
│   ├── nav_home_icon.png
│   ├── nav_cultivate_icon.png
│   ├── nav_sect_icon.png
│   ├── nav_battle_icon.png
│   ├── nav_profile_icon.png
│   ├── btn_normal_green.png
│   ├── btn_normal_gray.png
│   ├── btn_strengthen.png
│   ├── btn_vip.png
│   ├── btn_back.png
│   ├── btn_close.png
│   ├── btn_buy.png
│   ├── btn_confirm.png
│   ├── btn_cancel.png
│   ├── icon_hp.png
│   ├── icon_attack.png
│   ├── icon_defense.png
│   ├── icon_speed.png
│   ├── icon_crit.png
│   └── icon_dodge.png
│
├── player/                # 主角立绘 (16个)
│   ├── player_male_mortal.gif
│   ├── player_male_qi.gif
│   ├── player_male_zhu_ji.gif
│   ├── player_male_jin_dan.gif
│   ├── player_male_yuan_ying.gif
│   ├── player_male_hua_shen.gif
│   ├── player_male_du_jie.gif
│   ├── player_male_xian_wang.gif
│   ├── player_female_mortal.gif
│   ├── player_female_qi.gif
│   ├── player_female_zhu_ji.gif
│   ├── player_female_jin_dan.gif
│   ├── player_female_yuan_ying.gif
│   ├── player_female_hua_shen.gif
│   ├── player_female_du_jie.gif
│   └── player_female_xian_wang.gif
│
├── effect/                # 境界特效 (7个)
│   ├── effect_qi_white.gif
│   ├── effect_zhu_ji_gold.gif
│   ├── effect_jin_dan_rainbow.gif
│   ├── effect_yuan_ying_shadow.gif
│   ├── effect_hua_shen_faxiang.gif
│   ├── effect_du_jie_tianlei.gif
│   └── effect_fei_sheng_guang.gif
│
├── beast/                  # 灵兽 + 光效 (20个)
│   ├── beast_fox_normal.gif
│   ├── beast_fox_mutation.gif
│   ├── beast_fox_evolution.gif
│   ├── beast_qing_long_adult.gif
│   ├── beast_bai_hu_adult.gif
│   ├── beast_zhu_que_adult.gif
│   ├── beast_xuan_wu_adult.gif
│   ├── beast_qi_lin_adult.gif
│   ├── beast_kun_peng_adult.gif
│   ├── glow_common.gif
│   ├── glow_uncommon.gif
│   ├── glow_rare.gif
│   ├── glow_epic.gif
│   ├── glow_legendary.gif
│   └── glow_mythical.gif
│
├── equipment/             # 装备 (50+个)
│   ├── weapon_sword_*.png
│   ├── weapon_blade_*.png
│   ├── weapon_staff_*.png
│   ├── helmet_*.png
│   ├── armor_*.png
│   ├── boots_*.png
│   ├── ring_*.png
│   └── necklace_*.png
│
├── skill/                 # 技能特效 (28个)
│   ├── skill_*.gif
│   ├── buff_*.gif
│   └── debuff_*.gif
│
├── npc/                   # NPC (8个)
│   ├── npc_*.gif
│
├── monster/               # 怪物 + BOSS (18个)
│   ├── monster_*.gif
│   └── boss_*.gif
│
├── bg/                    # 场景背景 (8个)
│   ├── bg_*.png
│   └── battle_bg_*.png
│
├── pill/                  # 丹药物品 (18个)
│   ├── pill_*.png
│   ├── material_*.png
│   └── chest_*.png
│
├── mount/                 # 坐骑 (8个)
│   └── mount_*.gif
│
├── wing/                  # 翅膀 (7个)
│   └── wing_*.png
│
├── battle/                # 战斗UI (14个)
│   ├── hp_bar_*.png
│   ├── mp_bar.png
│   ├── btn_*.png
│   └── popup_*.gif
│
└── anim/                  # 通用动画 (10个)
    ├── anim_*.gif
    └── particle_*.gif
```

## 使用方式

```vue
<template>
  <!-- 方式1: 使用GameImage组件 -->
  <GameImage path="ui.iconHp" customStyle="{ width: '48px' }" />
  
  <!-- 方式2: 直接引入 -->
  <img :src="Resources.ui.iconHp" />
</template>

<script>
import Resources from '@/assets/resources'
import { getPlayerImage, getEquipmentIcon } from '@/utils/resourceHelper'

export default {
  computed: {
    playerImg() {
      return getPlayerImage('male', 3)  // 筑基期男性
    },
    swordImg() {
      return getEquipmentIcon('sword', 'epic')  // 史诗剑
    }
  }
}
</script>
```

## 资源命名规范

- PNG图片: `类型_名称_品质.png`
- GIF动画: `类型_名称.gif`
- 尺寸: 按美术需求文档中的规格
