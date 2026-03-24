const express = require('express');
const router = express.Router();

// 成就触发服务
let achievementTrigger;
try {
  achievementTrigger = require('../../game/achievement_trigger_service');
} catch (e) {
  console.log('[chapter] 成就触发服务未找到:', e.message);
  achievementTrigger = null;
}

// 100个章节数据
const chapters = [
  // 新手篇 (1-10)
  { id: 1, name: '新手试炼', reqLevel: 1, enemies: 5, hp: 100, attack: 10, reward: 100, exp: 50, desc: '踏入修仙的第一步' },
  { id: 2, name: '山林修炼', reqLevel: 2, enemies: 6, hp: 150, attack: 15, reward: 150, exp: 80, desc: '在山林中磨练技艺' },
  { id: 3, name: '古墓探险', reqLevel: 3, enemies: 7, hp: 200, attack: 20, reward: 200, exp: 100, desc: '探索神秘古墓' },
  { id: 4, name: '瀑布修行', reqLevel: 4, enemies: 8, hp: 300, attack: 25, reward: 280, exp: 130, desc: '瀑布下的苦修' },
  { id: 5, name: '洞穴试炼', reqLevel: 5, enemies: 10, hp: 400, attack: 30, reward: 350, exp: 160, desc: '黑暗洞穴的挑战' },
  { id: 6, name: '草原历练', reqLevel: 6, enemies: 10, hp: 500, attack: 40, reward: 450, exp: 200, desc: '广阔草原上的历练' },
  { id: 7, name: '沙漠行', reqLevel: 7, enemies: 12, hp: 600, attack: 50, reward: 550, exp: 250, desc: '炽热沙漠的考验' },
  { id: 8, name: '沼泽探险', reqLevel: 8, enemies: 12, hp: 800, attack: 60, reward: 680, exp: 300, desc: '危险沼泽地的探索' },
  { id: 9, name: '雪山攀登', reqLevel: 9, enemies: 15, hp: 1000, attack: 70, reward: 820, exp: 360, desc: '冰封雪山的挑战' },
  { id: 10, name: '深渊入口', reqLevel: 10, enemies: 15, hp: 1200, attack: 80, reward: 1000, exp: 420, desc: '通往深渊的入口' },
  
  // 筑基篇 (11-20)
  { id: 11, name: '筑基丹成', reqLevel: 11, enemies: 18, hp: 1500, attack: 100, reward: 1200, exp: 500, desc: '筑基期的第一战' },
  { id: 12, name: '筑基之乱', reqLevel: 12, enemies: 20, hp: 1800, attack: 120, reward: 1500, exp: 600, desc: '筑基修士的争斗' },
  { id: 13, name: '宗门试炼', reqLevel: 13, enemies: 20, hp: 2000, attack: 140, reward: 1800, exp: 700, desc: '宗门内的考验' },
  { id: 14, name: '灵兽山谷', reqLevel: 14, enemies: 25, hp: 2500, attack: 160, reward: 2200, exp: 850, desc: '与灵兽的战斗' },
  { id: 15, name: '秘境开启', reqLevel: 15, enemies: 25, hp: 3000, attack: 180, reward: 2600, exp: 1000, desc: '神秘秘境的开启' },
  { id: 16, name: '夺宝之争', reqLevel: 16, enemies: 30, hp: 3500, attack: 200, reward: 3100, exp: 1200, desc: '秘境中的争夺' },
  { id: 17, name: '传承之地', reqLevel: 17, enemies: 30, hp: 4000, attack: 220, reward: 3700, exp: 1400, desc: '接受先辈传承' },
  { id: 18, name: '心魔考验', reqLevel: 18, enemies: 35, hp: 5000, attack: 250, reward: 4400, exp: 1650, desc: '心魔的试炼' },
  { id: 19, name: '筑基圆满', reqLevel: 19, enemies: 35, hp: 6000, attack: 280, reward: 5200, exp: 1900, desc: '筑基期的圆满' },
  { id: 20, name: '金丹之路', reqLevel: 20, enemies: 40, hp: 8000, attack: 320, reward: 6200, exp: 2200, desc: '冲击金丹境界' },
  
  // 金丹篇 (21-35)
  { id: 21, name: '金丹天劫', reqLevel: 21, enemies: 40, hp: 10000, attack: 380, reward: 7500, exp: 2600, desc: '金丹天劫的考验' },
  { id: 22, name: '金丹之威', reqLevel: 22, enemies: 45, hp: 12000, attack: 450, reward: 9000, exp: 3000, desc: '金丹修士的威能' },
  { id: 23, name: '仙山访道', reqLevel: 23, enemies: 45, hp: 15000, attack: 520, reward: 11000, exp: 3500, desc: '拜访仙山求道' },
  { id: 24, name: '洞天福地', reqLevel: 24, enemies: 50, hp: 18000, attack: 600, reward: 13500, exp: 4100, desc: '传说中的洞天福地' },
  { id: 25, name: '灵山论道', reqLevel: 25, enemies: 50, hp: 22000, attack: 680, reward: 16500, exp: 4800, desc: '与各派论道交流' },
  { id: 26, name: '大道争锋', reqLevel: 26, enemies: 55, hp: 28000, attack: 780, reward: 20000, exp: 5600, desc: '大道上的激烈竞争' },
  { id: 27, name: '天骄辈出', reqLevel: 27, enemies: 55, hp: 35000, attack: 880, reward: 24500, exp: 6500, desc: '与天骄辈的较量' },
  { id: 28, name: '神兵问世', reqLevel: 28, enemies: 60, hp: 45000, attack: 1000, reward: 30000, exp: 7600, desc: '神兵利器的争夺' },
  { id: 29, name: '仙缘巧合', reqLevel: 29, enemies: 60, hp: 55000, attack: 1150, reward: 37000, exp: 8800, desc: '仙缘的奇妙相遇' },
  { id: 30, name: '元婴之变', reqLevel: 30, enemies: 65, hp: 70000, attack: 1300, reward: 45000, exp: 10200, desc: '冲击元婴境界' },
  { id: 31, name: '元婴初成', reqLevel: 31, enemies: 65, hp: 85000, attack: 1500, reward: 55000, exp: 11800, desc: '元婴初成的力量' },
  { id: 32, name: '神游太虚', reqLevel: 32, enemies: 70, hp: 100000, attack: 1700, reward: 67000, exp: 13500, desc: '神魂出游太虚' },
  { id: 33, name: '天外有天', reqLevel: 33, enemies: 70, hp: 120000, attack: 1950, reward: 82000, exp: 15500, desc: '天外天的广阔' },
  { id: 34, name: '域外战场', reqLevel: 34, enemies: 75, hp: 150000, attack: 2200, reward: 100000, exp: 18000, desc: '域外战场的惨烈' },
  { id: 35, name: '化神之始', reqLevel: 35, enemies: 75, hp: 180000, attack: 2500, reward: 122000, exp: 20800, desc: '化神之路的开端' },
  
  // 化神篇 (36-50)
  { id: 36, name: '天地之变', reqLevel: 36, enemies: 80, hp: 220000, attack: 2800, reward: 150000, exp: 24000, desc: '天地间的巨变' },
  { id: 37, name: '神劫降临', reqLevel: 37, enemies: 80, hp: 280000, attack: 3200, reward: 185000, exp: 27600, desc: '神劫的恐怖威能' },
  { id: 38, name: '逆天改命', reqLevel: 38, enemies: 85, hp: 350000, attack: 3600, reward: 227000, exp: 31800, desc: '逆天改命的壮举' },
  { id: 39, name: '仙界之门', reqLevel: 39, enemies: 85, hp: 450000, attack: 4100, reward: 280000, exp: 36600, desc: '通往仙界的大门' },
  { id: 40, name: '初入仙界', reqLevel: 40, enemies: 90, hp: 550000, attack: 4700, reward: 345000, exp: 42200, desc: '踏入仙界的起点' },
  { id: 41, name: '仙界历练', reqLevel: 41, enemies: 90, hp: 700000, attack: 5400, reward: 425000, exp: 48600, desc: '在仙界中的历练' },
  { id: 42, name: '仙山争夺', reqLevel: 42, enemies: 95, hp: 880000, attack: 6200, reward: 525000, exp: 56000, desc: '仙山资源的争夺' },
  { id: 43, name: '神兽出没', reqLevel: 43, enemies: 95, hp: 1100000, attack: 7100, reward: 650000, exp: 64400, desc: '神兽的栖息地' },
  { id: 44, name: '仙脉传承', reqLevel: 44, enemies: 100, hp: 1400000, attack: 8200, reward: 805000, exp: 74200, desc: '古老仙脉的传承' },
  { id: 45, name: '大道争仙', reqLevel: 45, enemies: 100, hp: 1800000, attack: 9500, reward: 1000000, exp: 85400, desc: '大道上的仙人争夺' },
  { id: 46, name: '天庭征召', reqLevel: 46, enemies: 105, hp: 2300000, attack: 11000, reward: 1250000, exp: 98200, desc: '天庭的征召令' },
  { id: 47, name: '天兵天将', reqLevel: 47, enemies: 105, hp: 3000000, attack: 12800, reward: 1570000, exp: 113000, desc: '与天兵天将的战斗' },
  { id: 48, name: '仙宫秘宝', reqLevel: 48, enemies: 110, hp: 4000000, attack: 14800, reward: 1980000, exp: 130000, desc: '仙宫中的秘宝' },
  { id: 49, name: '蟠桃盛会', reqLevel: 49, enemies: 110, hp: 5000000, attack: 17200, reward: 2500000, exp: 150000, desc: '参加蟠桃盛会' },
  { id: 50, name: '渡劫飞升', reqLevel: 50, enemies: 120, hp: 6500000, attack: 20000, reward: 3200000, exp: 175000, desc: '渡劫飞升的终极考验' },
  
  // 仙王篇 (51-70)
  { id: 51, name: '仙王之境', reqLevel: 51, enemies: 120, hp: 8000000, attack: 23000, reward: 4000000, exp: 200000, desc: '踏入仙王境界' },
  { id: 52, name: '大道三千', reqLevel: 52, enemies: 130, hp: 10000000, attack: 27000, reward: 5000000, exp: 230000, desc: '感悟三千大道' },
  { id: 53, name: '法则之海', reqLevel: 53, enemies: 130, hp: 13000000, attack: 32000, reward: 6300000, exp: 265000, desc: '遨游法则之海' },
  { id: 54, name: '混沌之初', reqLevel: 54, enemies: 140, hp: 17000000, attack: 38000, reward: 8000000, exp: 306000, desc: '探索混沌的起源' },
  { id: 55, name: '开天辟地', reqLevel: 55, enemies: 140, hp: 22000000, attack: 45000, reward: 10200000, exp: 353000, desc: '见证开天辟地' },
  { id: 56, name: '诸天万界', reqLevel: 56, enemies: 150, hp: 30000000, attack: 53000, reward: 13000000, exp: 408000, desc: '穿梭诸天万界' },
  { id: 57, name: '道祖讲道', reqLevel: 57, enemies: 150, hp: 40000000, attack: 63000, reward: 16800000, exp: 470000, desc: '聆听道祖讲道' },
  { id: 58, name: '诸神黄昏', reqLevel: 58, enemies: 160, hp: 55000000, attack: 75000, reward: 21800000, exp: 544000, desc: '见证诸神黄昏' },
  { id: 59, name: '永恒战场', reqLevel: 59, enemies: 160, hp: 75000000, attack: 90000, reward: 28500000, exp: 630000, desc: '踏入永恒战场' },
  { id: 60, name: '万古长空', reqLevel: 60, enemies: 170, hp: 100000000, attack: 108000, reward: 37500000, exp: 730000, desc: '万古长空的寂寞' },
  { id: 61, name: '时光长河', reqLevel: 61, enemies: 170, hp: 140000000, attack: 130000, reward: 50000000, exp: 850000, desc: '逆流时光长河' },
  { id: 62, name: '命运之轮', reqLevel: 62, enemies: 180, hp: 190000000, attack: 158000, reward: 68000000, exp: 990000, desc: '拨动命运之轮' },
  { id: 63, name: '因果法则', reqLevel: 63, enemies: 180, hp: 260000000, attack: 192000, reward: 93000000, exp: 1150000, desc: '掌控因果法则' },
  { id: 64, name: '轮回之门', reqLevel: 64, enemies: 190, hp: 360000000, attack: 235000, reward: 128000000, exp: 1350000, desc: '轮回之门的考验' },
  { id: 65, name: '彼岸花开', reqLevel: 65, enemies: 190, hp: 500000000, attack: 288000, reward: 178000000, exp: 1580000, desc: '彼岸花开的声音' },
  { id: 66, name: '天道轮回', reqLevel: 66, enemies: 200, hp: 700000000, attack: 355000, reward: 250000000, exp: 1850000, desc: '天道的轮回运转' },
  { id: 67, name: '鸿蒙初始', reqLevel: 67, enemies: 200, hp: 1000000000, attack: 440000, reward: 358000000, exp: 2180000, desc: '鸿蒙世界的初始' },
  { id: 68, name: '大道至简', reqLevel: 68, enemies: 210, hp: 1500000000, attack: 550000, reward: 520000000, exp: 2580000, desc: '大道至简的真谛' },
  { id: 69, name: '返璞归真', reqLevel: 69, enemies: 210, hp: 2200000000, attack: 690000, reward: 780000000, exp: 3080000, desc: '返璞归真的境界' },
  { id: 70, name: '无极无量', reqLevel: 70, enemies: 220, hp: 3500000000, attack: 880000, reward: 1200000000, exp: 3720000, desc: '无极无量的尽头' },
  
  // 终极篇 (71-100)
  { id: 71, name: '道心永恒', reqLevel: 71, enemies: 220, hp: 5000000000, attack: 1100000, reward: 1800000000, exp: 4500000, desc: '道心的永恒不灭' },
  { id: 72, name: '万道归一', reqLevel: 72, enemies: 230, hp: 8000000000, attack: 1400000, reward: 2800000000, exp: 5500000, desc: '万道归一的奥义' },
  { id: 73, name: '唯我独尊', reqLevel: 73, enemies: 230, hp: 12000000000, attack: 1800000, reward: 4200000000, exp: 6800000, desc: '唯我独尊的气势' },
  { id: 74, name: '诸天唯我', reqLevel: 74, enemies: 240, hp: 18000000000, attack: 2300000, reward: 6500000000, exp: 8500000, desc: '诸天万界唯我独尊' },
  { id: 75, name: '超脱一切', reqLevel: 75, enemies: 240, hp: 28000000000, attack: 3000000, reward: 10000000000, exp: 10800000, desc: '超脱一切的束缚' },
  { id: 76, name: '逍遥自在', reqLevel: 76, enemies: 250, hp: 45000000000, attack: 4000000, reward: 16000000000, exp: 14000000, desc: '逍遥自在的心境' },
  { id: 77, name: '无拘无束', reqLevel: 77, enemies: 250, hp: 70000000000, attack: 5500000, reward: 25000000000, exp: 18500000, desc: '无拘无束的自在' },
  { id: 78, name: '跳出三界', reqLevel: 78, enemies: 260, hp: 120000000000, attack: 7500000, reward: 40000000000, exp: 25000000, desc: '跳出三界外' },
  { id: 79, name: '不在五行', reqLevel: 79, enemies: 260, hp: 200000000000, attack: 10500000, reward: 65000000000, exp: 35000000, desc: '不在五行中' },
  { id: 80, name: '超脱轮回', reqLevel: 80, enemies: 270, hp: 350000000000, attack: 15000000, reward: 108000000000, exp: 50000000, desc: '超脱轮回之外' },
  { id: 81, name: '永恒不灭', reqLevel: 81, enemies: 270, hp: 600000000000, attack: 22000000, reward: 180000000000, exp: 72000000, desc: '永恒不灭的存在' },
  { id: 82, name: '与道同存', reqLevel: 82, enemies: 280, hp: 1000000000000, attack: 32000000, reward: 300000000000, exp: 105000000, desc: '与道同存的境界' },
  { id: 83, name: '道法自然', reqLevel: 83, enemies: 280, hp: 1800000000000, attack: 48000000, reward: 500000000000, exp: 155000000, desc: '道法自然的本源' },
  { id: 84, name: '万古第一', reqLevel: 84, enemies: 290, hp: 3200000000000, attack: 72000000, reward: 850000000000, exp: 230000000, desc: '万古第一的荣耀' },
  { id: 85, name: '举世无敌', reqLevel: 85, enemies: 290, hp: 5800000000000, attack: 110000000, reward: 1450000000000, exp: 350000000, desc: '举世无敌的姿态' },
  { id: 86, name: '唯道永恒', reqLevel: 86, enemies: 300, hp: 10000000000000, attack: 170000000, reward: 2500000000000, exp: 550000000, desc: '唯道永恒不灭' },
  { id: 87, name: '超道而行', reqLevel: 87, enemies: 300, hp: 18000000000000, attack: 260000000, reward: 4300000000000, exp: 880000000, desc: '超道而行的壮举' },
  { id: 88, name: '道之尽头', reqLevel: 88, enemies: 310, hp: 35000000000000, attack: 400000000, reward: 7500000000000, exp: 1450000000, desc: '道之尽头的探索' },
  { id: 89, name: '归道于零', reqLevel: 89, enemies: 310, hp: 68000000000000, attack: 620000000, reward: 13500000000000, exp: 2400000000, desc: '归道于零的境界' },
  { id: 90, name: '无限可能', reqLevel: 90, enemies: 320, hp: 150000000000000, attack: 1000000000, reward: 25000000000000, exp: 4200000000, desc: '无限可能的未来' },
  { id: 91, name: '无尽之路', reqLevel: 91, enemies: 320, hp: 350000000000000, attack: 1700000000, reward: 50000000000000, exp: 7500000000, desc: '无尽之路的延续' },
  { id: 92, name: '巅峰对决', reqLevel: 92, enemies: 330, hp: 800000000000000, attack: 2800000000, reward: 100000000000000, exp: 13500000000, desc: '巅峰之上的对决' },
  { id: 93, name: '最强之路', reqLevel: 93, enemies: 330, hp: 2000000000000000, attack: 4800000000, reward: 220000000000000, exp: 25000000000, desc: '迈向最强之路' },
  { id: 94, name: '唯我唯一', reqLevel: 94, enemies: 340, hp: 5000000000000000, attack: 8200000000, reward: 480000000000000, exp: 48000000000, desc: '唯我唯一的境界' },
  { id: 95, name: '极致巅峰', reqLevel: 95, enemies: 340, hp: 15000000000000000, attack: 14500000000, reward: 1100000000000000, exp: 95000000000, desc: '极致巅峰的对决' },
  { id: 96, name: '突破极限', reqLevel: 96, enemies: 350, hp: 50000000000000000, attack: 26000000000, reward: 2800000000000000, exp: 195000000000, desc: '突破极限的挑战' },
  { id: 97, name: '超越自我', reqLevel: 97, enemies: 350, hp: 180000000000000000, attack: 48000000000, reward: 7500000000000000, exp: 420000000000, desc: '超越自我的极限' },
  { id: 98, name: '无限升华', reqLevel: 98, enemies: 360, hp: 700000000000000000, attack: 92000000000, reward: 22000000000000000, exp: 950000000000, desc: '无限升华的可能' },
  { id: 99, name: '登峰造极', reqLevel: 99, enemies: 360, hp: 3000000000000000000, attack: 180000000000, reward: 68000000000000000, exp: 2300000000000, desc: '登峰造极的极致' },
  { id: 100, name: '证道成仙', reqLevel: 100, enemies: 400, hp: 10000000000000000000, attack: 360000000000, reward: 200000000000000000, exp: 6000000000000, desc: '最终证道成仙' }
];

let userProgress = { 1: { currentChapter: 1, totalKills: 0, stars: {} } };

// 获取章节列表
router.get('/', (req, res) => {
  const userId = parseInt(req.query.userId) || 1;
  const progress = userProgress[userId] || { currentChapter: 1, totalKills: 0, stars: {} };
  
  const chaptersWithStars = chapters.map(ch => ({
    ...ch,
    stars: progress.stars?.[ch.id] || 0,
    unlocked: ch.id <= progress.currentChapter
  }));
  
  res.json({ chapters: chaptersWithStars, progress: { currentChapter: progress.currentChapter, totalKills: progress.totalKills } });
});

// 获取特定章节
router.get('/:id', (req, res) => {
  const chapterId = parseInt(req.params.id);
  const chapter = chapters.find(c => c.id === chapterId);
  if (!chapter) return res.json({ success: false });
  
  res.json(chapter);
});

// 进入章节战斗
router.post('/enter', (req, res) => {
  const { userId, chapterId } = req.body;
  const chapter = chapters.find(c => c.id === chapterId);
  if (!chapter) return res.json({ success: false, message: '章节不存在' });
  
  const progress = userProgress[userId] || { currentChapter: 1, totalKills: 0, stars: {} };
  if (chapterId > progress.currentChapter) return res.json({ success: false, message: '章节未解锁' });
  
  res.json({ success: true, battle: { chapterId, enemies: chapter.enemies, hp: chapter.hp, attack: chapter.attack } });
});

// 章节战斗完成
router.post('/complete', (req, res) => {
  const { userId, chapterId, kills, time } = req.body;
  
  userProgress[userId] = userProgress[userId] || { currentChapter: 1, totalKills: 0, stars: {} };
  const progress = userProgress[userId];
  
  const chapter = chapters.find(c => c.id === chapterId);
  
  // 计算星级
  let stars = 1;
  if (kills >= chapter.enemies) stars = 3;
  else if (kills >= chapter.enemies * 0.7) stars = 2;
  
  progress.stars = progress.stars || {};
  progress.stars[chapterId] = Math.max(progress.stars[chapterId] || 0, stars);
  
  // 开启下一章
  if (chapterId === progress.currentChapter && chapterId < 100) {
    progress.currentChapter = chapterId + 1;
  }
  
  progress.totalKills += kills;
  
  // 计算评价
  const evaluation = stars === 3 ? '完美通关' : stars === 2 ? '顺利通关' : '艰难通关';
  
  // ========== 成就触发：通关章节 ==========
  let achievementResults = [];
  if (achievementTrigger) {
    try {
      achievementResults = achievementTrigger.onChapterClear(userId, chapterId);
      // 获取待推送通知
      const notifications = achievementTrigger.popNotifications(userId);
      if (notifications.length > 0) {
        // 通知将通过 /api/achievement/notifications 端点获取
        console.log(`[成就通知] 用户${userId}达成成就:`, notifications.map(n => n.achievementName).join(', '));
      }
    } catch (e) {
      console.error('[chapter] 成就触发失败:', e.message);
    }
  }
  
  res.json({ 
    success: true, 
    reward: chapter.reward, 
    exp: chapter.exp,
    stars,
    evaluation,
    nextChapter: chapterId < 100 ? chapterId + 1 : null,
    achievements: achievementResults.length > 0 ? achievementResults.map(a => ({
      id: a.id,
      name: a.name,
      desc: a.desc,
      reward: a.reward
    })) : undefined
  });
});

// 获取章节剧情
router.get('/story/:id', (req, res) => {
  const chapterId = parseInt(req.params.id);
  const chapter = chapters.find(c => c.id === chapterId);
  if (!chapter) return res.json({ success: false });
  
  res.json({ id: chapter.id, name: chapter.name, desc: chapter.desc, reward: chapter.reward });
});

module.exports = router;
