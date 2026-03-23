function generateBattleDrops() {
  const drops = [];
  const rand = Math.random();
  
  // 30% 概率获得物品
  if (rand < 0.3) {
    const dropTypes = [
      { type: 'material', name: '玄铁石', quality: 'common', weight: 30 },
      { type: 'material', name: '灵草', quality: 'common', weight: 30 },
      { type: 'material', name: '精金', quality: 'uncommon', weight: 20 },
      { type: 'material', name: '天蚕丝', quality: 'uncommon', weight: 15 },
      { type: 'equipment', name: '铁剑', quality: 'common', weight: 25 },
      { type: 'equipment', name: '皮甲', quality: 'common', weight: 25 },
      { type: 'equipment', name: '银剑', quality: 'uncommon', weight: 15 },
      { type: 'equipment', name: '锁子甲', quality: 'uncommon', weight: 15 },
      { type: 'spirit', name: '灵气结晶', quality: 'rare', weight: 10 },
      { type: 'item', name: '修为丹', quality: 'uncommon', weight: 20 },
      { type: 'item', name: '突破丹', quality: 'rare', weight: 10 }
    ];
    
    // 根据权重随机选择
    let totalWeight = dropTypes.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of dropTypes) {
      random -= item.weight;
      if (random <= 0) {
        drops.push({
          type: item.type,
          name: item.name,
          quality: item.quality,
          count: Math.random() < 0.3 ? 2 : 1
        });
        break;
      }
    }
  }
  
  return drops;
}
