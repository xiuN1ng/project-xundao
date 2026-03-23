const express = require('express'); const router = express.Router();
let vip={level:1,points:500,benefits:['每日礼包','专属折扣']};
router.get('/',(req,res)=>res.json(vip));
router.post('/buy',(req,res)=>{vip.level++;res.json({success:true,level:vip.level});});
module.exports=router;
