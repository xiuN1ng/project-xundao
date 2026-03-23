const express = require('express');
const router = express.Router();
let userEquipments = [
  { userId: 1, id: 1, name: '铁剑', type: 'weapon', attack: 10, enhanceLevel: 0 },
  { userId: 1, id: 2, name: '布衣', type: 'armor', defense: 5, enhanceLevel: 0 }
];
router.get('/:userId', (req, res) => {
  const userId = parseInt(req.params.userId) || 1;
  res.json(userEquipments.filter(e => e.userId === userId));
});
router.post('/enhance', (req, res) => {
  const { userId, equipmentId } = req.body;
  const equip = userEquipments.find(e => e.userId === userId && e.id === equipmentId);
  if (!equip) return res.json({ success: false });
  equip.enhanceLevel += 1;
  res.json({ success: true, level: equip.enhanceLevel });
});
module.exports = router;
