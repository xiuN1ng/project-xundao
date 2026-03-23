# AI-Generated Game Assets

This directory contains AI-generated game assets from art-cron.

## Available Assets

| File | Description | Dimensions | Integration Status |
|------|-------------|------------|-------------------|
| `game-bg-main.jpg` | 游戏主界面背景 (Main menu background, Chinese xianxia theme) | 1280x720 | ✅ Applied as body background |
| `character-portrait.jpg` | 角色立绘 (Character portrait, immortal cultivator) | 1280x720 | ✅ Applied in AppearancePanel |
| `ui-icons.jpg` | UI图标设计 (Pixel art UI icon set, xianxia theme) | 1280x720 | 📝 Available for future use |
| `game-effects.jpg` | 特效展示 (Magical effects sprite sheet) | 1280x720 | ✅ Applied in BattleEffectPanel |

## Usage

- Background images are referenced in CSS relative to this directory
- Character portrait is loaded as img element with opacity overlay in AppearancePanel
- Effects image is used as background texture in BattleEffectPanel animation stage
- UI icons sprite sheet can be sliced and used as game item/skill icons

## Regenerating Assets

Edit `/root/.openclaw/workspace/art-cron.sh` to modify prompts, then run:
```bash
bash /root/.openclaw/workspace/art-cron.sh
```
