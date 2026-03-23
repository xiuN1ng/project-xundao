const express = require('express'); const router = express.Router();
let history=['💎','⚔️','📦'];
router.get('/',(req,res)=>res.json({items:['💎','⚔️','🛡️','📦','🎁','💰'],history}));
router.post('/draw',(req,res)=>{const item=history[Math.floor(Math.random()*history.length)];res.json({success:true,item});});
module.exports=router;
