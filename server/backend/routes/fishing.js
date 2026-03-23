const express = require('express'); const router = express.Router();
let fishes=[{id:1,icon:'🐟',name:'锦鲤'}];
router.get('/',(req,res)=>res.json(fishes));
router.post('/cast',(req,res)=>res.json({success:true,bite:false}));
router.post('/catch',(req,res)=>{fishes.push({id:Date.now(),icon:'🐟',name:'鲤鱼'});res.json({success:true,fish:{icon:'🐟',name:'鲤鱼'}});});
module.exports=router;
