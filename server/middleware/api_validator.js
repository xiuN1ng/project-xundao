/**
 * API 输入校验中间件
 * 提供全面的输入验证和清理，防止注入攻击和无效数据
 */

const logger = {
  warn: (...args) => console.warn('[Validation:WARN]', ...args),
  error: (...args) => console.error('[Validation:ERROR]', ...args)
};

// ==================== 工具函数 ====================

/**
 * 清理字符串 - 去除危险字符
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[<>'"`;]/g, '') // 移除危险字符
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

/**
 * 验证是否为正整数
 */
function isPositiveInt(value) {
  const num = parseInt(value, 10);
  return Number.isInteger(num) && num > 0;
}

/**
 * 验证是否为非负整数
 */
function isNonNegativeInt(value) {
  const num = parseInt(value, 10);
  return Number.isInteger(num) && num >= 0;
}

/**
 * 验证数字范围
 */
function validateRange(value, min, max) {
  const num = parseInt(value, 10);
  if (!Number.isInteger(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
}

/**
 * 验证枚举值
 */
function isEnum(value, allowedValues) {
  return allowedValues.includes(value);
}

/**
 * 验证玩家ID
 */
function validatePlayerId(id) {
  const num = parseInt(id, 10);
  if (!Number.isInteger(num) || num < 1 || num > 999999999) {
    return false;
  }
  return true;
}

// ==================== 校验规则类 ====================

class ValidationRule {
  constructor(options = {}) {
    this.required = options.required || false;
    this.type = options.type || 'any';
    this.min = options.min;
    this.max = options.max;
    this.enum = options.enum;
    this.pattern = options.pattern;
    this.sanitize = options.sanitize !== false; // 默认清理
    this.custom = options.custom;
  }

  validate(value, fieldName) {
    const errors = [];

    // 处理 undefined/null
    if (value === undefined || value === null || value === '') {
      if (this.required) {
        errors.push(`${fieldName} 是必填项`);
      }
      return errors;
    }

    // 类型校验
    switch (this.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${fieldName} 必须是字符串`);
          return errors;
        }
        if (this.sanitize) {
          value = sanitizeString(value);
        }
        if (this.min !== undefined && value.length < this.min) {
          errors.push(`${fieldName} 长度不能少于 ${this.min} 个字符`);
        }
        if (this.max !== undefined && value.length > this.max) {
          errors.push(`${fieldName} 长度不能超过 ${this.max} 个字符`);
        }
        if (this.pattern && !this.pattern.test(value)) {
          errors.push(`${fieldName} 格式不正确`);
        }
        break;

      case 'int':
        const intVal = parseInt(value, 10);
        if (isNaN(intVal)) {
          errors.push(`${fieldName} 必须是整数`);
          return errors;
        }
        if (this.min !== undefined && intVal < this.min) {
          errors.push(`${fieldName} 不能小于 ${this.min}`);
        }
        if (this.max !== undefined && intVal > this.max) {
          errors.push(`${fieldName} 不能大于 ${this.max}`);
        }
        break;

      case 'float':
        const floatVal = parseFloat(value);
        if (isNaN(floatVal)) {
          errors.push(`${fieldName} 必须是数字`);
          return errors;
        }
        if (this.min !== undefined && floatVal < this.min) {
          errors.push(`${fieldName} 不能小于 ${this.min}`);
        }
        if (this.max !== undefined && floatVal > this.max) {
          errors.push(`${fieldName} 不能大于 ${this.max}`);
        }
        break;

      case 'boolean':
        if (value !== true && value !== false && value !== 'true' && value !== 'false' && value !== '0' && value !== '1') {
          errors.push(`${fieldName} 必须是布尔值`);
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${fieldName} 必须是数组`);
        }
        if (this.max !== undefined && value.length > this.max) {
          errors.push(`${fieldName} 数组长度不能超过 ${this.max}`);
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push(`${fieldName} 必须是对象`);
        }
        break;

      case 'enum':
        if (this.enum && !this.enum.includes(value)) {
          errors.push(`${fieldName} 必须是 [${this.enum.join(', ')}] 之一`);
        }
        break;

      case 'playerId':
        if (!validatePlayerId(value)) {
          errors.push(`${fieldName} 无效的玩家ID`);
        }
        break;

      case 'email':
        if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.push(`${fieldName} 必须是有效的邮箱地址`);
        }
        break;

      case 'username':
        if (typeof value !== 'string' || !/^[a-zA-Z0-9_]{3,20}$/.test(value)) {
          errors.push(`${fieldName} 必须是3-20位字母、数字或下划线`);
        }
        break;

      case 'password':
        if (typeof value !== 'string' || value.length < 6 || value.length > 50) {
          errors.push(`${fieldName} 密码长度必须在6-50位之间`);
        }
        break;
    }

    // 枚举校验
    if (this.enum && this.type !== 'enum' && !errors.length) {
      if (!this.enum.includes(value)) {
        errors.push(`${fieldName} 必须是 [${this.enum.join(', ')}] 之一`);
      }
    }

    // 自定义校验
    if (this.custom && typeof this.custom === 'function' && !errors.length) {
      const customResult = this.custom(value);
      if (customResult !== true && typeof customResult === 'string') {
        errors.push(customResult);
      } else if (customResult === false) {
        errors.push(`${fieldName} 校验失败`);
      }
    }

    return errors;
  }
}

// ==================== 校验中间件生成器 ====================

/**
 * 创建参数校验中间件
 * @param {Object} rules - 字段规则映射
 * @param {Object} options - 全局选项
 */
function validate(rules, options = {}) {
  const { source = 'body', abortEarly = false } = options;

  return (req, res, next) => {
    const data = source === 'body' ? req.body : source === 'query' ? req.query : source === 'params' ? req.params : req.body;
    const errors = [];
    const sanitized = {};

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];
      const fieldErrors = rule.validate(value, field);

      if (fieldErrors.length > 0) {
        errors.push(...fieldErrors);
        if (abortEarly) break;
      } else {
        // 清理后的值
        let cleanValue = value;
        if (typeof value === 'string' && rule.sanitize !== false) {
          cleanValue = sanitizeString(value);
        }
        sanitized[field] = cleanValue;
      }
    }

    if (errors.length > 0) {
      logger.warn(`[Validation] 校验失败: ${errors.join(', ')}`);
      return res.status(400).json({
        success: false,
        error: '参数校验失败',
        details: errors
      });
    }

    // 将清理后的数据附加到请求对象
    req.sanitizedBody = { ...req.body, ...sanitized };
    next();
  };
}

/**
 * 快速校验 playerId
 */
function validatePlayerIdMiddleware(paramName = 'playerId') {
  return (req, res, next) => {
    const id = req.body[paramName] || req.query[paramName] || req.params[paramName];

    if (!validatePlayerId(id)) {
      return res.status(400).json({
        success: false,
        error: '无效的玩家ID'
      });
    }
    next();
  };
}

/**
 * 验证数量范围
 */
function validateAmount(paramName = 'amount', options = {}) {
  const { min = 1, max = 999999999 } = options;
  
  return (req, res, next) => {
    const amount = parseInt(req.body[paramName] || req.query[paramName], 10);

    if (isNaN(amount) || amount < min || amount > max) {
      return res.status(400).json({
        success: false,
        error: `数量必须在 ${min} - ${max} 之间`
      });
    }
    next();
  };
}

/**
 * SQL注入防护中间件
 */
function sqlInjectionProtection(req, res, next) {
  const checkValue = (value, path) => {
    if (typeof value === 'string') {
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|INTO)\b)/i,
        /(--|;|\/\*|\*\/|@@|@)/,
        /('|"|`)/,
        /(0x[0-9a-f]+)/i
      ];
      for (const pattern of sqlPatterns) {
        if (pattern.test(value)) {
          logger.warn(`[Security] SQL注入尝试: ${path} = ${value}`);
          return false;
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const [k, v] of Object.entries(value)) {
        if (!checkValue(v, `${path}.${k}`)) return false;
      }
    }
    return true;
  };

  if (!checkValue(req.body, 'body') || !checkValue(req.query, 'query')) {
    return res.status(400).json({
      success: false,
      error: '检测到非法字符'
    });
  }

  next();
}

/**
 * 速率限制标记中间件
 */
function rateLimitMark(req, res, next) {
  req.rateLimitKey = `api:${req.ip}:${req.path}:${Date.now()}`;
  next();
}

// ==================== 常用校验规则预设 ====================

const PRESETS = {
  // 玩家ID
  playerId: { type: 'playerId', required: true },
  
  // 分页参数
  pagination: {
    page: { type: 'int', min: 1, max: 10000, required: false },
    pageSize: { type: 'int', min: 1, max: 100, required: false },
    limit: { type: 'int', min: 1, max: 100, required: false },
    offset: { type: 'int', min: 0, max: 10000, required: false }
  },

  // 数量
  amount: { type: 'int', min: 1, max: 999999999 },

  // 灵石数量
  spiritStones: { type: 'int', min: 0, max: 999999999999999 },

  // 等级
  level: { type: 'int', min: 1, max: 9999 },

  // 物品ID
  itemId: { type: 'string', min: 1, max: 100 },

  // 物品数量
  quantity: { type: 'int', min: 1, max: 9999 },

  // 境界名
  realm: { 
    type: 'enum', 
    enum: ['凡人', '练气期', '筑基期', '金丹期', '元婴期', '化神期', '炼虚期', '合体期', '大乘期', '渡劫期', '仙人'],
    required: false
  }
};

module.exports = {
  // 工具函数
  sanitizeString,
  isPositiveInt,
  isNonNegativeInt,
  validateRange,
  isEnum,
  validatePlayerId,

  // 类
  ValidationRule,

  // 中间件生成器
  validate,

  // 快捷中间件
  validatePlayerIdMiddleware,
  validateAmount,
  sqlInjectionProtection,
  rateLimitMark,

  // 预设规则
  PRESETS,

  // 常用校验组合
  commonSchemas: {
    // 通用物品操作
    itemOperation: {
      playerId: PRESETS.playerId,
      itemId: PRESETS.itemId,
      quantity: PRESETS.quantity
    },

    // 战斗操作
    battleOperation: {
      playerId: PRESETS.playerId,
      enemyId: { type: 'string', max: 100, required: false }
    },

    // 交易操作
    tradeOperation: {
      playerId: PRESETS.playerId,
      itemId: PRESETS.itemId,
      price: { type: 'int', min: 0, max: 999999999999 }
    },

    // 聊天消息
    chatMessage: {
      playerId: PRESETS.playerId,
      channel: { type: 'enum', enum: ['world', 'sect', 'private', 'team'] },
      content: { type: 'string', min: 1, max: 500, sanitize: true }
    },

    // 宗门操作
    sectOperation: {
      playerId: PRESETS.playerId,
      sectId: { type: 'int', min: 1, max: 999999999 }
    },

    // 升级/强化
    upgradeOperation: {
      playerId: PRESETS.playerId,
      targetId: PRESETS.itemId,
      level: PRESETS.level
    }
  }
};
