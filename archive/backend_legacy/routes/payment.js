const express = require('express');
const router = express.Router();

let orders = [];
let orderId = 1;

// 充值套餐
const packages = [
  {id:1,name:'月卡',price:30,diamonds:300},
  {id:2,name:'钻石30',price:6,diamonds:30},
  {id:3,name:'钻石98',price:18,diamonds:98},
  {id:4,name:'钻石198',price:38,diamonds:198},
  {id:5,name:'钻石328',price:68,diamonds:328},
  {id:6,name:'钻石648',price:128,diamonds:648}
];

router.get('/packages',(req,res)=>res.json(packages));

// 创建订单
router.post('/create',(req,res)=>{
  const{userId,packageId}=req.body;
  const pkg=packages.find(p=>p.id===packageId);
  if(!pkg) return res.json({success:false,message:'套餐不存在'});
  
  const order={id:orderId++,userId,packageId,amount:pkg.price,diamonds:pkg.diamonds,status:'pending',createdAt:Date.now()};
  orders.push(order);
  res.json({success:true,data:{orderId:order.id,amount:pkg.price}});
});

// 模拟支付回调
router.post('/callback',(req,res)=>{
  const{orderId}=req.body;
  const order=orders.find(o=>o.id===orderId);
  if(!order) return res.json({success:false,message:'订单不存在'});
  
  order.status='paid';
  order.paidAt=Date.now();
  res.json({success:true,message:'充值成功',diamonds:order.diamonds});
});

// 订单列表
router.get('/orders/:userId',(req,res)=>{
  const userOrders=orders.filter(o=>o.userId==req.params.userId);
  res.json(userOrders);
});

module.exports=router;
