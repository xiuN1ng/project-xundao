/**
 * 挂机修仙 - 境界系统 v3.0
 * 99阶境界体系
 */

const REALM_DATA_V3 = {
  // ==================== 凡人界 (0-8) ====================
  '凡人-前期-1阶': { name: '凡人', phase: '前期', order: 1, cultivation_req: 0, spirit_base: 50, spirit_rate: 5, hp_base: 100, atk_base: 10, def_base: 2, realm_bonus: 1.0 },
  '凡人-前期-2阶': { name: '凡人', phase: '前期', order: 2, cultivation_req: 30, spirit_base: 60, spirit_rate: 6, hp_base: 110, atk_base: 11, def_base: 2, realm_bonus: 1.0 },
  '凡人-前期-3阶': { name: '凡人', phase: '前期', order: 3, cultivation_req: 60, spirit_base: 70, spirit_rate: 7, hp_base: 120, atk_base: 12, def_base: 3, realm_bonus: 1.0 },
  '凡人-中期-1阶': { name: '凡人', phase: '中期', order: 4, cultivation_req: 100, spirit_base: 80, spirit_rate: 8, hp_base: 130, atk_base: 13, def_base: 3, realm_bonus: 1.05 },
  '凡人-中期-2阶': { name: '凡人', phase: '中期', order: 5, cultivation_req: 150, spirit_base: 90, spirit_rate: 9, hp_base: 140, atk_base: 14, def_base: 4, realm_bonus: 1.05 },
  '凡人-中期-3阶': { name: '凡人', phase: '中期', order: 6, cultivation_req: 200, spirit_base: 100, spirit_rate: 10, hp_base: 150, atk_base: 15, def_base: 4, realm_bonus: 1.05 },
  '凡人-后期-1阶': { name: '凡人', phase: '后期', order: 7, cultivation_req: 300, spirit_base: 120, spirit_rate: 12, hp_base: 170, atk_base: 17, def_base: 5, realm_bonus: 1.1 },
  '凡人-后期-2阶': { name: '凡人', phase: '后期', order: 8, cultivation_req: 400, spirit_base: 140, spirit_rate: 14, hp_base: 190, atk_base: 19, def_base: 6, realm_bonus: 1.1 },
  '凡人-后期-3阶': { name: '凡人', phase: '后期', order: 9, cultivation_req: 500, spirit_base: 160, spirit_rate: 16, hp_base: 210, atk_base: 21, def_base: 7, realm_bonus: 1.1 },

  // ==================== 练气期 (9-17) ====================
  '练气期-前期-1阶': { name: '练气期', phase: '前期', order: 10, cultivation_req: 700, spirit_base: 200, spirit_rate: 20, hp_base: 250, atk_base: 25, def_base: 8, realm_bonus: 1.15 },
  '练气期-前期-2阶': { name: '练气期', phase: '前期', order: 11, cultivation_req: 900, spirit_base: 230, spirit_rate: 23, hp_base: 280, atk_base: 28, def_base: 9, realm_bonus: 1.15 },
  '练气期-前期-3阶': { name: '练气期', phase: '前期', order: 12, cultivation_req: 1200, spirit_base: 260, spirit_rate: 26, hp_base: 310, atk_base: 31, def_base: 10, realm_bonus: 1.15 },
  '练气期-中期-1阶': { name: '练气期', phase: '中期', order: 13, cultivation_req: 1600, spirit_base: 300, spirit_rate: 30, hp_base: 350, atk_base: 35, def_base: 12, realm_bonus: 1.2 },
  '练气期-中期-2阶': { name: '练气期', phase: '中期', order: 14, cultivation_req: 2100, spirit_base: 350, spirit_rate: 35, hp_base: 400, atk_base: 40, def_base: 14, realm_bonus: 1.2 },
  '练气期-中期-3阶': { name: '练气期', phase: '中期', order: 15, cultivation_req: 2800, spirit_base: 400, spirit_rate: 40, hp_base: 450, atk_base: 45, def_base: 16, realm_bonus: 1.2 },
  '练气期-后期-1阶': { name: '练气期', phase: '后期', order: 16, cultivation_req: 3600, spirit_base: 460, spirit_rate: 46, hp_base: 520, atk_base: 52, def_base: 18, realm_bonus: 1.25 },
  '练气期-后期-2阶': { name: '练气期', phase: '后期', order: 17, cultivation_req: 4600, spirit_base: 530, spirit_rate: 53, hp_base: 600, atk_base: 60, def_base: 21, realm_bonus: 1.25 },
  '练气期-后期-3阶': { name: '练气期', phase: '后期', order: 18, cultivation_req: 5800, spirit_base: 600, spirit_rate: 60, hp_base: 680, atk_base: 68, def_base: 24, realm_bonus: 1.25 },

  // ==================== 筑基期 (19-27) ====================
  '筑基期-前期-1阶': { name: '筑基期', phase: '前期', order: 19, cultivation_req: 7500, spirit_base: 700, spirit_rate: 70, hp_base: 800, atk_base: 80, def_base: 28, realm_bonus: 1.3 },
  '筑基期-前期-2阶': { name: '筑基期', phase: '前期', order: 20, cultivation_req: 9500, spirit_base: 800, spirit_rate: 80, hp_base: 900, atk_base: 90, def_base: 32, realm_bonus: 1.3 },
  '筑基期-前期-3阶': { name: '筑基期', phase: '前期', order: 21, cultivation_req: 12000, spirit_base: 900, spirit_rate: 90, hp_base: 1000, atk_base: 100, def_base: 36, realm_bonus: 1.3 },
  '筑基期-中期-1阶': { name: '筑基期', phase: '中期', order: 22, cultivation_req: 15000, spirit_base: 1050, spirit_rate: 105, hp_base: 1200, atk_base: 120, def_base: 42, realm_bonus: 1.4 },
  '筑基期-中期-2阶': { name: '筑基期', phase: '中期', order: 23, cultivation_req: 19000, spirit_base: 1200, spirit_rate: 120, hp_base: 1400, atk_base: 140, def_base: 48, realm_bonus: 1.4 },
  '筑基期-中期-3阶': { name: '筑基期', phase: '中期', order: 24, cultivation_req: 24000, spirit_base: 1350, spirit_rate: 135, hp_base: 1600, atk_base: 160, def_base: 54, realm_bonus: 1.4 },
  '筑基期-后期-1阶': { name: '筑基期', phase: '后期', order: 25, cultivation_req: 30000, spirit_base: 1550, spirit_rate: 155, hp_base: 1850, atk_base: 185, def_base: 62, realm_bonus: 1.5 },
  '筑基期-后期-2阶': { name: '筑基期', phase: '后期', order: 26, cultivation_req: 38000, spirit_base: 1750, spirit_rate: 175, hp_base: 2100, atk_base: 210, def_base: 70, realm_bonus: 1.5 },
  '筑基期-后期-3阶': { name: '筑基期', phase: '后期', order: 27, cultivation_req: 48000, spirit_base: 2000, spirit_rate: 200, hp_base: 2400, atk_base: 240, def_base: 80, realm_bonus: 1.5 },

  // ==================== 金丹期 (28-36) ====================
  '金丹期-前期-1阶': { name: '金丹期', phase: '前期', order: 28, cultivation_req: 60000, spirit_base: 2300, spirit_rate: 230, hp_base: 2800, atk_base: 280, def_base: 90, realm_bonus: 1.6 },
  '金丹期-前期-2阶': { name: '金丹期', phase: '前期', order: 29, cultivation_req: 75000, spirit_base: 2600, spirit_rate: 260, hp_base: 3200, atk_base: 320, def_base: 102, realm_bonus: 1.6 },
  '金丹期-前期-3阶': { name: '金丹期', phase: '前期', order: 30, cultivation_req: 92000, spirit_base: 2900, spirit_rate: 290, hp_base: 3600, atk_base: 360, def_base: 114, realm_bonus: 1.6 },
  '金丹期-中期-1阶': { name: '金丹期', phase: '中期', order: 31, cultivation_req: 115000, spirit_base: 3300, spirit_rate: 330, hp_base: 4200, atk_base: 420, def_base: 130, realm_bonus: 1.8 },
  '金丹期-中期-2阶': { name: '金丹期', phase: '中期', order: 32, cultivation_req: 142000, spirit_base: 3700, spirit_rate: 370, hp_base: 4800, atk_base: 480, def_base: 146, realm_bonus: 1.8 },
  '金丹期-中期-3阶': { name: '金丹期', phase: '中期', order: 33, cultivation_req: 175000, spirit_base: 4100, spirit_rate: 410, hp_base: 5500, atk_base: 550, def_base: 165, realm_bonus: 1.8 },
  '金丹期-后期-1阶': { name: '金丹期', phase: '后期', order: 34, cultivation_req: 215000, spirit_base: 4600, spirit_rate: 460, hp_base: 6400, atk_base: 640, def_base: 188, realm_bonus: 2.0 },
  '金丹期-后期-2阶': { name: '金丹期', phase: '后期', order: 35, cultivation_req: 265000, spirit_base: 5100, spirit_rate: 510, hp_base: 7400, atk_base: 740, def_base: 212, realm_bonus: 2.0 },
  '金丹期-后期-3阶': { name: '金丹期', phase: '后期', order: 36, cultivation_req: 325000, spirit_base: 5600, spirit_rate: 560, hp_base: 8500, atk_base: 850, def_base: 240, realm_bonus: 2.0 },

  // ==================== 元婴期 (37-45) ====================
  '元婴期-前期-1阶': { name: '元婴期', phase: '前期', order: 37, cultivation_req: 400000, spirit_base: 6200, spirit_rate: 620, hp_base: 10000, atk_base: 1000, def_base: 280, realm_bonus: 2.2 },
  '元婴期-前期-2阶': { name: '元婴期', phase: '前期', order: 38, cultivation_req: 490000, spirit_base: 6800, spirit_rate: 680, hp_base: 11500, atk_base: 1150, def_base: 320, realm_bonus: 2.2 },
  '元婴期-前期-3阶': { name: '元婴期', phase: '前期', order: 39, cultivation_req: 600000, spirit_base: 7400, spirit_rate: 740, hp_base: 13200, atk_base: 1320, def_base: 360, realm_bonus: 2.2 },
  '元婴期-中期-1阶': { name: '元婴期', phase: '中期', order: 40, cultivation_req: 730000, spirit_base: 8200, spirit_rate: 820, hp_base: 15200, atk_base: 1520, def_base: 410, realm_bonus: 2.5 },
  '元婴期-中期-2阶': { name: '元婴期', phase: '中期', order: 41, cultivation_req: 890000, spirit_base: 9000, spirit_rate: 900, hp_base: 17500, atk_base: 1750, def_base: 460, realm_bonus: 2.5 },
  '元婴期-中期-3阶': { name: '元婴期', phase: '中期', order: 42, cultivation_req: 1080000, spirit_base: 9800, spirit_rate: 980, hp_base: 20000, atk_base: 2000, def_base: 520, realm_bonus: 2.5 },
  '元婴期-后期-1阶': { name: '元婴期', phase: '后期', order: 43, cultivation_req: 1300000, spirit_base: 10800, spirit_rate: 1080, hp_base: 23000, atk_base: 2300, def_base: 590, realm_bonus: 2.8 },
  '元婴期-后期-2阶': { name: '元婴期', phase: '后期', order: 44, cultivation_req: 1580000, spirit_base: 11800, spirit_rate: 1180, hp_base: 26500, atk_base: 2650, def_base: 670, realm_bonus: 2.8 },
  '元婴期-后期-3阶': { name: '元婴期', phase: '后期', order: 45, cultivation_req: 1920000, spirit_base: 13000, spirit_rate: 1300, hp_base: 30500, atk_base: 3050, def_base: 760, realm_bonus: 2.8 },

  // ==================== 化神期 (46-54) ====================
  '化神期-前期-1阶': { name: '化神期', phase: '前期', order: 46, cultivation_req: 2350000, spirit_base: 14500, spirit_rate: 1450, hp_base: 35000, atk_base: 3500, def_base: 860, realm_bonus: 3.0 },
  '化神期-前期-2阶': { name: '化神期', phase: '前期', order: 47, cultivation_req: 2850000, spirit_base: 16000, spirit_rate: 1600, hp_base: 40000, atk_base: 4000, def_base: 970, realm_bonus: 3.0 },
  '化神期-前期-3阶': { name: '化神期', phase: '前期', order: 48, cultivation_req: 3450000, spirit_base: 17500, spirit_rate: 1750, hp_base: 46000, atk_base: 4600, def_base: 1090, realm_bonus: 3.0 },
  '化神期-中期-1阶': { name: '化神期', phase: '中期', order: 49, cultivation_req: 4200000, spirit_base: 19500, spirit_rate: 1950, hp_base: 53000, atk_base: 5300, def_base: 1240, realm_bonus: 3.5 },
  '化神期-中期-2阶': { name: '化神期', phase: '中期', order: 50, cultivation_req: 5100000, spirit_base: 21500, spirit_rate: 2150, hp_base: 61000, atk_base: 6100, def_base: 1400, realm_bonus: 3.5 },
  '化神期-中期-3阶': { name: '化神期', phase: '中期', order: 51, cultivation_req: 6200000, spirit_base: 24000, spirit_rate: 2400, hp_base: 70000, atk_base: 7000, def_base: 1580, realm_bonus: 3.5 },
  '化神期-后期-1阶': { name: '化神期', phase: '后期', order: 52, cultivation_req: 7500000, spirit_base: 27000, spirit_rate: 2700, hp_base: 81000, atk_base: 8100, def_base: 1780, realm_bonus: 4.0 },
  '化神期-后期-2阶': { name: '化神期', phase: '后期', order: 53, cultivation_req: 9100000, spirit_base: 30000, spirit_rate: 3000, hp_base: 94000, atk_base: 9400, def_base: 2000, realm_bonus: 4.0 },
  '化神期-后期-3阶': { name: '化神期', phase: '后期', order: 54, cultivation_req: 11000000, spirit_base: 34000, spirit_rate: 3400, hp_base: 110000, atk_base: 11000, def_base: 2300, realm_bonus: 4.0 },

  // ==================== 炼虚期 (55-63) ====================
  '炼虚期-前期-1阶': { name: '炼虚期', phase: '前期', order: 55, cultivation_req: 13500000, spirit_base: 38000, spirit_rate: 3800, hp_base: 130000, atk_base: 13000, def_base: 2600, realm_bonus: 4.5 },
  '炼虚期-前期-2阶': { name: '炼虚期', phase: '前期', order: 56, cultivation_req: 16500000, spirit_base: 42000, spirit_rate: 4200, hp_base: 152000, atk_base: 15200, def_base: 2950, realm_bonus: 4.5 },
  '炼虚期-前期-3阶': { name: '炼虚期', phase: '前期', order: 57, cultivation_req: 20000000, spirit_base: 47000, spirit_rate: 4700, hp_base: 178000, atk_base: 17800, def_base: 3350, realm_bonus: 4.5 },
  '炼虚期-中期-1阶': { name: '炼虚期', phase: '中期', order: 58, cultivation_req: 24500000, spirit_base: 53000, spirit_rate: 5300, hp_base: 210000, atk_base: 21000, def_base: 3800, realm_bonus: 5.0 },
  '炼虚期-中期-2阶': { name: '炼虚期', phase: '中期', order: 59, cultivation_req: 30000000, spirit_base: 59000, spirit_rate: 5900, hp_base: 245000, atk_base: 24500, def_base: 4300, realm_bonus: 5.0 },
  '炼虚期-中期-3阶': { name: '炼虚期', phase: '中期', order: 60, cultivation_req: 37000000, spirit_base: 66000, spirit_rate: 6600, hp_base: 288000, atk_base: 28800, def_base: 4850, realm_bonus: 5.0 },
  '炼虚期-后期-1阶': { name: '炼虚期', phase: '后期', order: 61, cultivation_req: 45000000, spirit_base: 74000, spirit_rate: 7400, hp_base: 340000, atk_base: 34000, def_base: 5500, realm_bonus: 5.5 },
  '炼虚期-后期-2阶': { name: '炼虚期', phase: '后期', order: 62, cultivation_req: 55000000, spirit_base: 83000, spirit_rate: 8300, hp_base: 400000, atk_base: 40000, def_base: 6200, realm_bonus: 5.5 },
  '炼虚期-后期-3阶': { name: '炼虚期', phase: '后期', order: 63, cultivation_req: 68000000, spirit_base: 93000, spirit_rate: 9300, hp_base: 470000, atk_base: 47000, def_base: 7000, realm_bonus: 5.5 },

  // ==================== 合体期 (64-72) ====================
  '合体期-前期-1阶': { name: '合体期', phase: '前期', order: 64, cultivation_req: 82000000, spirit_base: 105000, spirit_rate: 10500, hp_base: 550000, atk_base: 55000, def_base: 8000, realm_bonus: 6.0 },
  '合体期-前期-2阶': { name: '合体期', phase: '前期', order: 65, cultivation_req: 100000000, spirit_base: 118000, spirit_rate: 11800, hp_base: 650000, atk_base: 65000, def_base: 9200, realm_bonus: 6.0 },
  '合体期-前期-3阶': { name: '合体期', phase: '前期', order: 66, cultivation_req: 122000000, spirit_base: 132000, spirit_rate: 13200, hp_base: 760000, atk_base: 76000, def_base: 10500, realm_bonus: 6.0 },
  '合体期-中期-1阶': { name: '合体期', phase: '中期', order: 67, cultivation_req: 150000000, spirit_base: 148000, spirit_rate: 14800, hp_base: 890000, atk_base: 89000, def_base: 12000, realm_bonus: 7.0 },
  '合体期-中期-2阶': { name: '合体期', phase: '中期', order: 68, cultivation_req: 185000000, spirit_base: 165000, spirit_rate: 16500, hp_base: 1050000, atk_base: 105000, def_base: 13800, realm_bonus: 7.0 },
  '合体期-中期-3阶': { name: '合体期', phase: '中期', order: 69, cultivation_req: 228000000, spirit_base: 185000, spirit_rate: 18500, hp_base: 1240000, atk_base: 124000, def_base: 15800, realm_bonus: 7.0 },
  '合体期-后期-1阶': { name: '合体期', phase: '后期', order: 70, cultivation_req: 280000000, spirit_base: 208000, spirit_rate: 20800, hp_base: 1460000, atk_base: 146000, def_base: 18000, realm_bonus: 8.0 },
  '合体期-后期-2阶': { name: '合体期', phase: '后期', order: 71, cultivation_req: 345000000, spirit_base: 232000, spirit_rate: 23200, hp_base: 1720000, atk_base: 172000, def_base: 20500, realm_bonus: 8.0 },
  '合体期-后期-3阶': { name: '合体期', phase: '后期', order: 72, cultivation_req: 425000000, spirit_base: 260000, spirit_rate: 26000, hp_base: 2030000, atk_base: 203000, def_base: 23500, realm_bonus: 8.0 },

  // ==================== 大乘期 (73-81) ====================
  '大乘期-前期-1阶': { name: '大乘期', phase: '前期', order: 73, cultivation_req: 520000000, spirit_base: 290000, spirit_rate: 29000, hp_base: 2400000, atk_base: 240000, def_base: 27000, realm_bonus: 9.0 },
  '大乘期-前期-2阶': { name: '大乘期', phase: '前期', order: 74, cultivation_req: 640000000, spirit_base: 325000, spirit_rate: 32500, hp_base: 2850000, atk_base: 285000, def_base: 31000, realm_bonus: 9.0 },
  '大乘期-前期-3阶': { name: '大乘期', phase: '前期', order: 75, cultivation_req: 790000000, spirit_base: 365000, spirit_rate: 36500, hp_base: 3400000, atk_base: 340000, def_base: 36000, realm_bonus: 9.0 },
  '大乘期-中期-1阶': { name: '大乘期', phase: '中期', order: 76, cultivation_req: 970000000, spirit_base: 410000, spirit_rate: 41000, hp_base: 4050000, atk_base: 405000, def_base: 42000, realm_bonus: 10.0 },
  '大乘期-中期-2阶': { name: '大乘期', phase: '中期', order: 77, cultivation_req: 1200000000, spirit_base: 460000, spirit_rate: 46000, hp_base: 4850000, atk_base: 485000, def_base: 49000, realm_bonus: 10.0 },
  '大乘期-中期-3阶': { name: '大乘期', phase: '中期', order: 78, cultivation_req: 1480000000, spirit_base: 515000, spirit_rate: 51500, hp_base: 5800000, atk_base: 580000, def_base: 57000, realm_bonus: 10.0 },
  '大乘期-后期-1阶': { name: '大乘期', phase: '后期', order: 79, cultivation_req: 1820000000, spirit_base: 580000, spirit_rate: 58000, hp_base: 7000000, atk_base: 700000, def_base: 66000, realm_bonus: 12.0 },
  '大乘期-后期-2阶': { name: '大乘期', phase: '后期', order: 80, cultivation_req: 2250000000, spirit_base: 650000, spirit_rate: 65000, hp_base: 8500000, atk_base: 850000, def_base: 76000, realm_bonus: 12.0 },
  '大乘期-后期-3阶': { name: '大乘期', phase: '后期', order: 81, cultivation_req: 2800000000, spirit_base: 730000, spirit_rate: 73000, hp_base: 10300000, atk_base: 1030000, def_base: 88000, realm_bonus: 12.0 },

  // ==================== 渡劫期 (82-90) ====================
  '渡劫期-前期-1阶': { name: '渡劫期', phase: '前期', order: 82, cultivation_req: 3500000000, spirit_base: 820000, spirit_rate: 82000, hp_base: 12500000, atk_base: 1250000, def_base: 100000, realm_bonus: 15.0 },
  '渡劫期-前期-2阶': { name: '渡劫期', phase: '前期', order: 83, cultivation_req: 4300000000, spirit_base: 920000, spirit_rate: 92000, hp_base: 15200000, atk_base: 1520000, def_base: 115000, realm_bonus: 15.0 },
  '渡劫期-前期-3阶': { name: '渡劫期', phase: '前期', order: 84, cultivation_req: 5300000000, spirit_base: 1030000, spirit_rate: 103000, hp_base: 18500000, atk_base: 1850000, def_base: 132000, realm_bonus: 15.0 },
  '渡劫期-中期-1阶': { name: '渡劫期', phase: '中期', order: 85, cultivation_req: 6500000000, spirit_base: 1160000, spirit_rate: 116000, hp_base: 22500000, atk_base: 2250000, def_base: 152000, realm_bonus: 18.0 },
  '渡劫期-中期-2阶': { name: '渡劫期', phase: '中期', order: 86, cultivation_req: 8000000000, spirit_base: 1300000, spirit_rate: 130000, hp_base: 27500000, atk_base: 2750000, def_base: 175000, realm_bonus: 18.0 },
  '渡劫期-中期-3阶': { name: '渡劫期', phase: '中期', order: 87, cultivation_req: 9800000000, spirit_base: 1460000, spirit_rate: 146000, hp_base: 33500000, atk_base: 3350000, def_base: 200000, realm_bonus: 18.0 },
  '渡劫期-后期-1阶': { name: '渡劫期', phase: '后期', order: 88, cultivation_req: 12000000000, spirit_base: 1650000, spirit_rate: 165000, hp_base: 41000000, atk_base: 4100000, def_base: 230000, realm_bonus: 20.0 },
  '渡劫期-后期-2阶': { name: '渡劫期', phase: '后期', order: 89, cultivation_req: 15000000000, spirit_base: 1850000, spirit_rate: 185000, hp_base: 50000000, atk_base: 5000000, def_base: 265000, realm_bonus: 20.0 },
  '渡劫期-后期-3阶': { name: '渡劫期', phase: '后期', order: 90, cultivation_req: 20000000000, spirit_base: 2100000, spirit_rate: 210000, hp_base: 62000000, atk_base: 6200000, def_base: 310000, realm_bonus: 20.0 },

  // ==================== 仙人 (91-99) ====================
  '仙人-前期-1阶': { name: '仙人', phase: '前期', order: 91, cultivation_req: 0, spirit_base: 3000000, spirit_rate: 300000, hp_base: 100000000, atk_base: 10000000, def_base: 500000, realm_bonus: 25.0 },
  '仙人-中期-1阶': { name: '仙人', phase: '中期', order: 95, cultivation_req: 0, spirit_base: 5000000, spirit_rate: 500000, hp_base: 200000000, atk_base: 20000000, def_base: 800000, realm_bonus: 30.0 },
  '仙人-后期-1阶': { name: '仙人', phase: '后期', order: 99, cultivation_req: 0, spirit_base: 10000000, spirit_rate: 1000000, hp_base: 500000000, atk_base: 50000000, def_base: 2000000, realm_bonus: 50.0 }
};

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { REALM_DATA_V3 };
}
