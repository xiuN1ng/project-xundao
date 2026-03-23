const express = require('express'); const router = express.Router();
let tower={currentFloor:5,maxFloor:100,records:[]};
router.get('/',(req,res)=>res.json(tower));
router.post('/enter',(req,res)=>res.json({success:true,floor:5}));
module.exports=router;
