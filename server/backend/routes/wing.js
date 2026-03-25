const express = require('express'); const router = express.Router();
let wings=[{id:1,icon:'👼',name:'天使翅膀',attr:'攻击+10%',owned:true,active:true},{id:2,icon:'🔥',name:'烈焰翅膀',attr:'攻击+20%',owned:false}];
router.get('/',(req,res)=>res.json(wings));
router.get('/info',(req,res)=>res.json({success:true, data:wings}));
router.post('/activate',(req,res)=>{wings.forEach(w=>w.active=w.id===req.body.id);res.json({success:true});});
module.exports=router;
