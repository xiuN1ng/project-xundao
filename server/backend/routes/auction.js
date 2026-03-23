const express = require('express'); const router = express.Router();
let auctions=[{id:1,icon:'⚔️',name:'紫金剑',currentPrice:5000,bidCount:5,seller:'剑仙'}];
router.get('/',(req,res)=>res.json(auctions));
router.post('/bid',(req,res)=>{const a=auctions.find(x=>x.id===req.body.id);if(a){a.currentPrice+=100;a.bidCount++;res.json({success:true})}else{res.json({success:false})}});
module.exports=router;
