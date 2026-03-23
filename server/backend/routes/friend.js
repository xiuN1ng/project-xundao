const express = require('express'); const router = express.Router();
let friends=[{id:1,name:'剑仙李白',online:true},{id:2,name:'丹帝',online:false}];
let requests=[{id:1,name:'新人修士'}];
router.get('/',(req,res)=>res.json({friends,requests}));
router.post('/add',(req,res)=>res.json({success:true}));
router.post('/accept',(req,res)=>{friends.push({id:Date.now(),name:requests.find(r=>r.id===req.body.id).name,online:false});res.json({success:true});});
module.exports=router;
