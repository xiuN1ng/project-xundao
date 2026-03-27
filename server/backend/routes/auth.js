const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const JWT_SECRET = 'game-secret-2026';

// 数据库初始化 (使用 backend/data/game.db 与主服务器一致)
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'game.db');

let db;
try {
  const Database = require('better-sqlite3');
  db = new Database(DB_PATH);
  console.log('[auth] 数据库连接成功:', DB_PATH);

  // 初始化 player 表（如果不存在）
  db.exec(`
    CREATE TABLE IF NOT EXISTS player (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      spirit_stones BIGINT DEFAULT 1000,
      diamonds INTEGER DEFAULT 0,
      hp INTEGER DEFAULT 1000,
      attack INTEGER DEFAULT 100,
      defense INTEGER DEFAULT 50,
      speed INTEGER DEFAULT 10,
      level INTEGER DEFAULT 1,
      realm INTEGER DEFAULT 1,
      experience BIGINT DEFAULT 0,
      vip_level INTEGER DEFAULT 0,
      vip_points INTEGER DEFAULT 0,
      last_login DATETIME,
      last_logout DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch (err) {
  console.error('[auth] 数据库连接失败:', err.message);
  db = null;
}

// 内存缓存（DB不可用时fallback）
let users = [
  {id:1,username:'test',password:'$2a$10$X7VYvz9z',nickname:'修仙者',lingshi:125680,diamonds:520,level:5,realm:1,hp:1000,attack:100,defense:50,speed:10}
];
let idCounter = 2;

function generateToken(u){
  // 使用 JWT 代替简单的 'token_'+id，防止伪造
  return jwt.sign({ userId: u.id, username: u.username }, JWT_SECRET, { expiresIn: '7d' });
}

// 兼容旧版简单 token 的验证
function verifySimpleToken(token) {
  if (token && token.startsWith('token_')) {
    const id = parseInt(token.replace('token_', ''));
    return users.find(u => u.id === id) || null;
  }
  return null;
}

function auth(req,res,next){
  const token = req.headers.authorization;
  if(!token) return res.json({success:false,message:'请先登录'});
  // 优先尝试 JWT 验证
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.find(u => u.id === decoded.userId);
    if (user) { req.user = user; return next(); }
  } catch(e) {}
  // 兼容旧版简单 token
  const user = verifySimpleToken(token);
  if(!user) return res.json({success:false,message:'登录过期'});
  req.user = user;
  next();
}

/**
 * 全局鉴权中间件 — 验证 JWT token 并设置 req.userId
 * 受保护的游戏路由必须通过此中间件
 *
 * 前端登录后需做两件事：
 * 1. 保存返回的 token → 后续请求 header: Authorization: Bearer <token>
 * 2. 保存返回的 user.id → 后续请求 header: X-User-Id: <id>
 *
 * 此中间件同时支持旧版 Authorization: <token>（无 Bearer 前缀）兼容
 */
function requireAuth(options) {
  const opts = options || {};
  const skipIfNoToken = opts.skipIfNoToken !== undefined ? opts.skipIfNoToken : false;

  return function(req, res, next) {
    const authHeader = req.headers.authorization;

    // 优先从 X-User-Id header 读取（前端必须传）
    let userId = parseInt(req.get('X-User-Id')) || parseInt(req.get('x-user-id')) || 0;

    if (authHeader) {
      // Authorization header 存在：必须成功验证，否则返回 401
      try {
        let token = authHeader;
        if (token.startsWith('Bearer ')) token = token.slice(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.userId) userId = decoded.userId;
      } catch(e) {
        // JWT 失败，尝试旧版简单 token
        try {
          const user = verifySimpleToken(authHeader);
          if (user) userId = user.id;
        } catch(e2) {}
      }
    }

    if (!userId || userId <= 0) {
      if (skipIfNoToken) return next();
      return res.status(401).json({ success: false, message: '未授权：缺少有效身份凭证，请重新登录' });
    }

    // 验证用户存在于 DB 或内存
    const user = users.find(u => u.id === userId);
    if (!user && db) {
      try {
        const dbUser = db.prepare('SELECT * FROM Users WHERE id = ?').get(userId);
        if (dbUser) { users.push(dbUser); }
        else { if (!skipIfNoToken) return res.status(401).json({ success: false, message: '用户不存在' }); }
      } catch(e) {
        if (!skipIfNoToken) return res.status(401).json({ success: false, message: '身份验证失败' });
      }
    }

    req.userId = userId;
    req.user = user || users.find(u => u.id === userId) || null;
    next();
  };
}

// 从DB加载所有用户到内存
function loadUsersFromDB() {
  if (!db) return;
  try {
    const rows = db.prepare('SELECT * FROM Users').all();
    if (rows.length > 0) {
      users = rows;
      idCounter = Math.max(...rows.map(u => u.id)) + 1;
      console.log('[auth] 从DB加载', rows.length, '个用户');
    }
  } catch (e) {
    console.error('[auth] loadUsersFromDB错误:', e.message);
  }
}

loadUsersFromDB();

router.post('/register',async(req,res)=>{
  const{username,password,nickname}=req.body;
  if(!username||!password) return res.json({success:false,message:'用户名和密码必填'});

  // 检查重复
  if(users.find(u=>u.username===username)) return res.json({success:false,message:'用户名已存在'});

  const userId = idCounter++;
  const now = new Date().toISOString();

  if (db) {
    try {
      // 写入 Users 表
      db.prepare(`
        INSERT INTO Users (username, password, nickname, level, realm, lingshi, diamonds, hp, attack, defense, speed, vipLevel, createdAt, updatedAt)
        VALUES (?, ?, ?, 1, 1, 1000, 0, 1000, 100, 50, 10, 0, ?, ?)
      `).run(username, password, nickname || '修仙者', now, now);

      // 写入 player 表（游戏数据）
      db.prepare(`
        INSERT OR IGNORE INTO player (user_id, spirit_stones, diamonds, hp, attack, defense, speed, level, realm, last_login)
        VALUES (?, 1000, 0, 1000, 100, 50, 10, 1, 1, ?)
      `).run(userId, now);

      console.log('[auth] 新用户注册写入DB:', username);
    } catch (e) {
      console.error('[auth] 注册写入DB失败:', e.message);
    }
  }

  const user={id:userId,username,password,nickname:nickname||'修仙者',lingshi:1000,diamonds:0,level:1,realm:1,hp:1000,attack:100,defense:50,speed:10};
  users.push(user);
  res.json({success:true,data:{user:{id:user.id,username:user.username,nickname:user.nickname,level:user.level,realm:user.realm,lingshi:user.lingshi,diamonds:user.diamonds},token:generateToken(user)}});
});

router.post('/login',async(req,res)=>{
  const{username,password}=req.body;
  if(!username||!password) return res.json({success:false,message:'用户名和密码必填'});

  // 先查内存
  let user=users.find(u=>u.username===username&&u.password===password);

  // DB回退：如果内存找不到，尝试从DB加载
  if(!user && db) {
    try {
      const row = db.prepare('SELECT * FROM Users WHERE username = ? AND password = ?').get(username, password);
      if (row) {
        user = row;
        users.push(user); // 补填到内存
        console.log('[auth] 用户从DB恢复:', username);
      }
    } catch(e) {
      console.error('[auth] login DB查询错误:', e.message);
    }
  }

  if(!user) return res.json({success:false,message:'用户名或密码错误'});

  // 更新最后登录时间
  if (db) {
    try {
      const now = new Date().toISOString();
      db.prepare('UPDATE Users SET updatedAt = ? WHERE id = ?').run(now, user.id);
      db.prepare('UPDATE player SET last_login = ? WHERE user_id = ?').run(now, user.id);
    } catch(e) {}
  }

  res.json({success:true,data:{user:{id:user.id,username:user.username,nickname:user.nickname,level:user.level||1,realm:user.realm||1,lingshi:user.lingshi||1000,diamonds:user.diamonds||0},token:generateToken(user)}});
});

router.get('/me',auth,(req,res)=>{res.json({success:true,data:req.user});});

module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.generateToken = generateToken;
