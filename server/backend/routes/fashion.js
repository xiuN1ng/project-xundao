const express = require('express'); const router = express.Router();
let fashions=[{id:1,icon:'👘',name:'和风',equipped:true},{id:2,icon:'👔',name:'西装',equipped:false}];
router.get('/',(req,res)=>res.json(fashions));
router.post('/equip',(req,res)=>{fashions.forEach(f=>f.equipped=f.id===req.body.id);res.json({success:true});});
module.exports=router;
