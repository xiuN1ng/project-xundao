/**
 * 敏感词过滤 + 安全检查
 */

const sensitiveWords = [
  'admin', 'root', 'system', '管理员', '测试',
  'fuck', 'shit', 'damn', 'sb', '垃圾', '废物',
  '作弊', '外挂', '刷钱', 'bug'
];

const sensitivePatterns = [
  /[0-9]{10,}/, // 手机号
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // 邮箱
  /http(s)?:\/\// // 链接
];

function checkSensitive(text) {
  if (!text) return { valid: true };
  
  const lower = text.toLowerCase();
  for (const word of sensitiveWords) {
    if (lower.includes(word)) {
      return { valid: false, reason: `包含敏感词: ${word}` };
    }
  }
  
  for (const pattern of sensitivePatterns) {
    if (pattern.test(text)) {
      return { valid: false, reason: '包含敏感内容' };
    }
  }
  
  return { valid: true };
}

function filterMiddleware(req, res, next) {
  const fields = ['username', 'nickname', 'content', 'message', 'title'];
  
  for (const field of fields) {
    if (req.body[field]) {
      const result = checkSensitive(req.body[field]);
      if (!result.valid) {
        return res.json({ success: false, message: result.reason });
      }
    }
  }
  
  next();
}

module.exports = { checkSensitive, filterMiddleware };
