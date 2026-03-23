const express = require('express'); const router = express.Router();
let titles=[{id:1,icon:'🏅',name:'新手',active:true},{id:2,icon:'⭐',name:'强者',active:false}];
router.get('/',(req,res)=>res.json(titles));
router.post('/activate',(req,res)=>{titles.forEach(t=>t.active=t.id===req.body.id);res.json({success:true});});
module.exports=router;
