const express = require('express'); const router = express.Router();
let boss={hp:1000000,damage:0,rank:[]};
router.get('/',(req,res)=>res.json(boss));
router.post('/attack',(req,res)=>{boss.damage+=req.body.damage||1000;res.json({success:true,hp:boss.hp});});
module.exports=router;
