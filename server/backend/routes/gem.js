const express = require('express'); const router = express.Router();
let gems=[
  {id:1,icon:'💠',name:'蓝宝石',attr:'攻击+5',quality:'normal'},
  {id:2,icon:'🔴',name:'红宝石',attr:'生命+50',quality:'normal'},
  {id:3,icon:'💚',name:'绿宝石',attr:'防御+10',quality:'rare'},
  {id:4,icon:'💛',name:'黄宝石',attr:'速度+5',quality:'rare'},
  {id:5,icon:'💜',name:'紫宝石',attr:'全属性+5%',quality:'epic'}
];
router.get('/',(req,res)=>res.json(gems));
router.get('/info',(req,res)=>res.json({success:true, data:gems}));
router.post('/embed',(req,res)=>res.json({success:true}));
module.exports=router;
