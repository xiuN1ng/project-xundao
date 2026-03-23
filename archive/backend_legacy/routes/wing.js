const express = require('express'); const router = express.Router();
let wings=[{id:1,icon:'👼',name:'天使翅膀',attr:'攻击+10%',owned:true,active:true}];
router.get('/',(req,res)=>res.json(wings));
router.post('/activate',(req,res)=>{wings.forEach(w=>w.active=w.id===req.body.id);res.json({success:true});});
module.exports=router;
