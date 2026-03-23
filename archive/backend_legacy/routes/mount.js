const express = require('express'); const router = express.Router();
let mounts=[{id:1,icon:'🦄',name:'独角兽',speed:50,owned:true,active:true},{id:2,icon:'🐉',name:'神龙',speed:100,owned:false}];
router.get('/',(req,res)=>res.json(mounts));
router.post('/activate',(req,res)=>{mounts.forEach(m=>m.active=m.id===req.body.id);res.json({success:true});});
module.exports=router;
