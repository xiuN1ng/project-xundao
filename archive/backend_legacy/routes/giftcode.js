const express = require('express');
const router = express.Router();

const giftCodes = {
  'NEWBIE100': { rewards: { lingshi: 1000, diamonds: 10 }, used: [] },
  'VIP888': { rewards: { diamonds: 888 }, used: [] },
  'CULTIVATION': { rewards: { lingshi: 5000 }, used: [] },
  'BEAST': { rewards: { lingshi: 2000, beast: '灵狐' }, used: [] }
};

router.post('/redeem', (req, res) => {
  const { code, userId } = req.body;
  const gift = giftCodes[code];
  
  if (!gift) return res.json({ success: false, message: '礼包码无效' });
  if (gift.used.includes(userId)) return res.json({ success: false, message: '已领取过' });
  
  gift.used.push(userId);
  res.json({ success: true, rewards: gift.rewards, message: '领取成功！' });
});

router.get('/check/:code', (req, res) => {
  const code = req.params.code;
  const gift = giftCodes[code];
  if (!gift) return res.json({ valid: false });
  res.json({ valid: true, rewards: gift.rewards });
});

module.exports = router;
