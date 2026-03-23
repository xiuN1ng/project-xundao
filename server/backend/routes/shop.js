const express = require('express'); const router = express.Router();
let goods=[{id:1,icon:'⚔️',name:'铁剑',price:100,category:'weapon'},{id:2,icon:'🛡️',name:'木盾',price:80,category:'armor'},{id:3,icon:'🧪',name:'灵气丹',price:50,category:'potion'}];
router.get('/',(req,res)=>res.json(goods));
router.post('/buy',(req,res)=>res.json({success:true,item:goods.find(g=>g.id===req.body.itemId)}));
module.exports=router;
