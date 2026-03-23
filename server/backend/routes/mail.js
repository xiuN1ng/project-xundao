const express = require('express'); const router = express.Router();
let mails=[{id:1,sender:'系统',title:'欢迎',content:'欢迎',time:Date.now(),read:false,attachments:[{id:1,name:'灵石x100',claimed:false}]}];
router.get('/list',(req,res)=>res.json(mails));
router.post('/read',(req,res)=>{const m=mails.find(x=>x.id===req.body.mailId);if(m)m.read=true;res.json({success:true});});
router.post('/claim',(req,res)=>{const a=mails.flatMap(m=>m.attachments||[]).find(x=>x.id===req.body.attId);if(a)a.claimed=true;res.json({success:true});});
module.exports=router;
