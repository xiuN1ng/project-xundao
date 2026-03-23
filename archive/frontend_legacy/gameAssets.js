/**
 * 游戏素材配置
 * 灵兽、丹药、装备等图标配置
 */

module.exports = {
  // 灵兽配置
  beasts: {
    spirit_fox: { name: '灵狐', icon: '🦊', quality: 'common' },
    thunder_eagle: { name: '雷鹰', icon: '🦅', quality: 'uncommon' },
    flame_qilin: { name: '火麒麟', icon: '🦄', quality: 'rare' },
    ice_phoenix: { name: '冰凤凰', icon: '🦚', quality: 'epic' },
    divine_dragon: { name: '神龙', icon: '🐉', quality: 'legendary' }
  },
  
  // 丹药配置
  pills: {
    spirit_pill: { name: '灵气丹', icon: '💊', effect: 'cultivation' },
    strength_pill: { name: '力量丹', icon: '💊', effect: 'attack' },
    speed_pill: { name: '速度丹', icon: '💊', effect: 'speed' }
  },
  
  // 装备配置
  equipment: {
    sword: { name: '铁剑', icon: '⚔️', type: 'weapon', quality: 'common' },
    shield: { name: '木盾', icon: '🛡️', type: 'armor', quality: 'common' },
    helmet: { name: '皮帽', icon: '⛑️', type: 'helmet', quality: 'common' }
  },
  
  // 境界配置
  realms: [
    { id: 1, name: '凡人', icon: '👤' },
    { id: 2, name: '练气', icon: '🧘' },
    { id: 3, name: '筑基', icon: '🔮' },
    { id: 4, name: '金丹', icon: '🌟' },
    { id: 5, name: '元婴', icon: '👼' },
    { id: 6, name: '化神', icon: '✨' },
    { id: 7, name: '渡劫', icon: '⚡' },
    { id: 8, name: '仙人', icon: '👑' }
  ]
};
