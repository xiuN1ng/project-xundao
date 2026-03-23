const express = require('express'); const router = express.Router();
let gems=[{id:1,icon:'💠',name:'蓝宝石',attr:'攻击+5'},{id:2,icon:'🔴',name:'红宝石',attr:'生命+50'}];
router.get('/',(req,res)=>res.json(gems));
router.post('/embed',(req,res)=>res.json({success:true}));
module.exports=router;
