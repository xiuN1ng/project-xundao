/**
 * JWT认证中间件
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'idle-cultivation-secret-key-2026';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: '请先登录' });
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: '登录已过期' });
  }
  
  req.user = decoded;
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware,
  JWT_SECRET
};
