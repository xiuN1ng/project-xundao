const express = require('express');
const path = require('path');
const router = express.Router();

const Logger = {
  info: (...args) => console.log('[payment]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[payment:error]', new Date().toISOString(), ...args),
};

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  db.pragma('journal_mode=WAL');
  Logger.info('支付数据库连接成功');
} catch (err) {
  Logger.error('数据库连接失败:', err.message);
  db = {
    _orders: [],
    prepare() { return this; },
    get() { return null; },
    all() { return []; },
    run() { return { changes: 0, lastInsertRowid: 1 }; }
  };
}

// 初始化 payment_orders 表
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      package_id INTEGER NOT NULL,
      package_name TEXT,
      amount REAL NOT NULL,
      diamonds INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      paid_at TEXT
    )
  `);
  Logger.info('payment_orders 表初始化完成');
} catch (err) {
  Logger.error('payment_orders 表初始化失败:', err.message);
}

// 充值套餐
const packages = [
  {id:1,name:'月卡',price:30,diamonds:300,description:'每日领取100灵石，连续30天',type:'monthly'},
  {id:2,name:'钻石30',price:6,diamonds:30,description:'立即获得30钻石',type:'direct'},
  {id:3,name:'钻石98',price:18,diamonds:98,description:'立即获得98钻石，额外赠10钻',type:'direct'},
  {id:4,name:'钻石198',price:38,diamonds:198,description:'立即获得198钻石，额外赠20钻',type:'direct'},
  {id:5,name:'钻石328',price:68,diamonds:328,description:'立即获得328钻石，额外赠30钻',type:'direct'},
  {id:6,name:'钻石648',price:128,diamonds:648,description:'立即获得648钻石，额外赠50钻',type:'direct'},
];

// GET /api/payment/products - 获取充值套餐列表
router.get('/products',(req,res)=>res.json({success:true,packages}));

// GET /api/payment/packages - 获取充值套餐列表（别名）
router.get('/packages',(req,res)=>res.json({success:true,packages}));

// GET /api/payment/my-packages - 获取玩家已购买的套餐
router.get('/my-packages',(req,res)=>{
  try {
    const userId = req.user?.id || req.query.userId || req.query.player_id || 1;
    const purchased = db.prepare(`
      SELECT package_id, package_name, diamonds, paid_at as purchasedAt
      FROM payment_orders
      WHERE user_id = ? AND status = 'paid'
      ORDER BY paid_at DESC
    `).all(userId);
    res.json({success:true,packages:purchased});
  } catch(err) {
    Logger.error('GET /my-packages 错误:', err.message);
    res.status(500).json({success:false,error:err.message});
  }
});

// 创建订单
router.post('/create',(req,res)=>{
  try {
    const userId = req.user?.id || req.body.userId || req.body.player_id || 1;
    const {packageId}=req.body;
    const pkg=packages.find(p=>p.id===packageId);
    if(!pkg) return res.json({success:false,message:'套餐不存在'});

    const result = db.prepare(`
      INSERT INTO payment_orders (user_id, package_id, package_name, amount, diamonds, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(userId, pkg.id, pkg.name, pkg.price, pkg.diamonds);

    Logger.info(`创建订单: userId=${userId}, packageId=${packageId}, orderId=${result.lastInsertRowid}`);
    res.json({success:true,data:{orderId:result.lastInsertRowid,amount:pkg.price,diamonds:pkg.diamonds}});
  } catch(err) {
    Logger.error('POST /create 错误:', err.message);
    res.status(500).json({success:false,error:err.message});
  }
});

// POST /api/payment/create-order - 创建订单（别名，支持 package_id 参数名）
router.post('/create-order',(req,res)=>{
  try {
    const userId = req.user?.id || req.body.userId || req.body.player_id || req.body.userId || 1;
    const {package_id} = req.body;
    const pkg = packages.find(p => p.id === package_id);
    if(!pkg) return res.json({success:false,message:'套餐不存在'});

    const result = db.prepare(`
      INSERT INTO payment_orders (user_id, package_id, package_name, amount, diamonds, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(userId, pkg.id, pkg.name, pkg.price, pkg.diamonds);

    Logger.info(`创建订单: userId=${userId}, package_id=${package_id}, orderId=${result.lastInsertRowid}`);
    res.json({success:true,data:{orderId:result.lastInsertRowid,amount:pkg.price,diamonds:pkg.diamonds}});
  } catch(err) {
    Logger.error('POST /create-order 错误:', err.message);
    res.status(500).json({success:false,error:err.message});
  }
});

// 模拟支付回调 - 必须真实发放钻石
router.post('/callback',(req,res)=>{
  try {
    const{orderId}=req.body;
    const order=db.prepare('SELECT * FROM payment_orders WHERE id = ?').get(orderId);

    if(!order) return res.json({success:false,message:'订单不存在'});
    if(order.status==='paid') return res.json({success:false,message:'订单已处理'});

    // 1. 标记订单已支付
    db.prepare("UPDATE payment_orders SET status='paid', paid_at=datetime('now') WHERE id=? AND status='pending'").run(orderId);

    // 2. 真实发放钻石给用户
    try {
      db.prepare('UPDATE Users SET diamonds = COALESCE(diamonds, 0) + ? WHERE id = ?').run(order.diamonds, order.user_id);
      Logger.info(`钻石发放成功: userId=${order.user_id}, diamonds=${order.diamonds}`);
    } catch(err) {
      Logger.error(`用户钻石发放失败: userId=${order.user_id}, diamonds=${order.diamonds}, err=${err.message}`);
    }

    res.json({success:true,message:'充值成功',diamonds:order.diamonds});
  } catch(err) {
    Logger.error('POST /callback 错误:', err.message);
    res.status(500).json({success:false,error:err.message});
  }
});

// 订单列表
router.get('/orders/:userId',(req,res)=>{
  try {
    const userId = req.params.userId;
    const userOrders=db.prepare(`
      SELECT id, package_id as packageId, package_name as packageName,
             amount, diamonds, status, created_at as createdAt, paid_at as paidAt
      FROM payment_orders WHERE user_id = ? ORDER BY created_at DESC
    `).all(userId);
    res.json({success:true,orders:userOrders});
  } catch(err) {
    Logger.error('GET /orders 错误:', err.message);
    res.status(500).json({success:false,error:err.message});
  }
});

module.exports = router;
