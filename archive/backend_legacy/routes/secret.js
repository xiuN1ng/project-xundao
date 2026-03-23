const express = require('express'); const router = express.Router();
let secret={unlocked:false,rewards:['💰1000','📜功法']};
router.get('/',(req,res)=>res.json(secret));
router.post('/unlock',(req,res)=>{secret.unlocked=true;res.json({success:true});});
router.post('/enter',(req,res)=>res.json({success:true,rewards:secret.rewards}));
module.exports=router;
