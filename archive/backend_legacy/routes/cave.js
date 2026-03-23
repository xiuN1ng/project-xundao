const express = require('express'); const router = express.Router();
let cave={energy:80,maxEnergy:100};
let ores=[{id:1,icon:'🪨',name:'铁矿石',count:10},{id:2,icon:'💎',name:'钻石',count:3}];
router.get('/',(req,res)=>res.json({cave,ores}));
router.post('/mine',(req,res)=>{cave.energy=Math.max(0,cave.energy-10);res.json({success:true,ore:{icon:'🪨',name:'铁矿石'}});});
module.exports=router;
