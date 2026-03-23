const express = require('express'); const router = express.Router();
let activities=[{id:1,name:'首充礼包',desc:'充值奖励',progress:100,claimed:false},{id:2,name:'等级冲刺',desc:'升级奖励',progress:65,claimed:false}];
router.get('/',(req,res)=>res.json(activities));
router.post('/signin',(req,res)=>res.json({success:true,day:3}));
router.post('/claim',(req,res)=>{const a=activities.find(x=>x.id===req.body.id);if(a)a.claimed=true;res.json({success:true});});
module.exports=router;
