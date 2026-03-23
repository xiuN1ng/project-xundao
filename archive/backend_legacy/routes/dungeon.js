const express = require('express'); const router = express.Router();
let dungeons=[{id:1,icon:'🗿',name:'新手副本',reqLevel:1,progress:100,unlocked:true},{id:2,icon:'🌋',name:'火山洞穴',reqLevel:10,progress:60,unlocked:true}];
router.get('/',(req,res)=>res.json(dungeons));
router.post('/enter',(req,res)=>res.json({success:true,battleId:Date.now()}));
module.exports=router;
