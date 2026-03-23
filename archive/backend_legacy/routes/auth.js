const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

let users = [
  {id:1,username:'test',password:'$2a$10$X7VYvz9z',nickname:'修仙者',lingshi:125680,diamonds:520,level:5,realm:1,hp:1000,attack:100,defense:50,speed:10}
];
let idCounter = 2;

const JWT_SECRET = 'game-secret-2026';
function generateToken(u){return 'token_'+u.id}
function auth(req,res,next){
  const token = req.headers.authorization;
  if(!token) return res.json({success:false,message:'请先登录'});
  const user = users.find(u=>'token_'+u.id === token);
  if(!user) return res.json({success:false,message:'登录过期'});
  req.user = user;
  next();
}

router.post('/register',async(req,res)=>{
  const{username,password,nickname}=req.body;
  if(users.find(u=>u.username===username)) return res.json({success:false,message:'用户名已存在'});
  const user={id:idCounter++,username,password:password,nickname:nickname||'修仙者',lingshi:1000,diamonds:0,level:1,realm:1,hp:1000,attack:100,defense:50,speed:10};
  users.push(user);
  res.json({success:true,data:{user:{id:user.id,username:user.username,nickname:user.nickname},token:generateToken(user)}});
});

router.post('/login',async(req,res)=>{
  const{username,password}=req.body;
  const user=users.find(u=>u.username===username&&u.password===password);
  if(!user) return res.json({success:false,message:'用户名或密码错误'});
  res.json({success:true,data:{user:{id:user.id,username:user.username,nickname:user.nickname,level:user.level,realm:user.realm,lingshi:user.lingshi,diamonds:user.diamonds},token:generateToken(user)}});
});

router.get('/me',auth,(req,res)=>{res.json({success:true,data:req.user});});

module.exports=router;
