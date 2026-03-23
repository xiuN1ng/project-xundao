const express = require('express'); const router = express.Router();
let bag=[{id:1,icon:'⚔️',name:'铁剑',count:1,type:'weapon'},{id:2,icon:'🧪',name:'灵气丹',count:10,type:'potion'}];
router.get('/',(req,res)=>res.json(bag));
router.post('/use',(req,res)=>{res.json({success:true});});
module.exports=router;
