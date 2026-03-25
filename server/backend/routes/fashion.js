const express = require('express'); const router = express.Router();
let fashions=[
  {id:1,icon:'👘',name:'和风雅韵',quality:'rare',equipped:true,attr:{atk:50,hp:200}},
  {id:2,icon:'👔',name:'剑修袍',quality:'epic',equipped:false,attr:{atk:100,hp:500}},
  {id:3,icon:'👗',name:'仙子裙',quality:'legendary',equipped:false,attr:{atk:200,hp:1000,speed:50}},
  {id:4,icon:'🦊',name:'灵狐装',quality:'epic',equipped:false,attr:{atk:150,hp:800}}
];
router.get('/',(req,res)=>res.json(fashions));
router.get('/info',(req,res)=>res.json({success:true, data:fashions}));
router.post('/equip',(req,res)=>{fashions.forEach(f=>f.equipped=f.id===req.body.id);res.json({success:true});});
module.exports=router;
