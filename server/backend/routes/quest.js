const express = require('express'); const router = express.Router();
let quests=[{id:1,title:'击败BOSS',desc:'通关副本',progress:80},{id:2,title:'修炼',desc:'提升境界',progress:50}];
router.get('/',(req,res)=>res.json(quests));
router.post('/claim',(req,res)=>res.json({success:true}));
module.exports=router;
