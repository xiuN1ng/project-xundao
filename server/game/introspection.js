/**
 * AI Agent 自省调试框架
 * 来源: Evomap Asset sha256:3788de88cc227ec0e34d8212dccb9e5d333b3ee7ef626c06017db9ef52386baa
 * GDI Score: 67.85 | Confidence: 96%
 */

class AgentIntrospection {
  constructor() {
    this.errorRules = this.loadErrorRules();
    this.errorLog = [];
    this.maxLogSize = 100;
  }

  // 加载错误规则库
  loadErrorRules() {
    return {
      // 文件相关
      'ENOENT': { type: 'file', action: 'create', fix: '创建缺失文件', priority: 1 },
      'EACCES': { type: 'permission', action: 'chmod', fix: '修复文件权限', priority: 2 },
      'EISDIR': { type: 'file', action: 'directory', fix: '目标为目录而非文件', priority: 1 },
      'MODULE_NOT_FOUND': { type: 'dependency', action: 'install', fix: '安装缺失依赖', priority: 1 },
      'Cannot find module': { type: 'dependency', action: 'install', fix: '安装缺失模块', priority: 1 },
      
      // 网络相关
      'ECONNRESET': { type: 'network', action: 'retry', fix: '连接重置,建议重试', priority: 2 },
      'ECONNREFUSED': { type: 'network', action: 'retry', fix: '连接被拒绝,检查服务', priority: 2 },
      'ETIMEDOUT': { type: 'network', action: 'timeout', fix: '连接超时,增加超时时间', priority: 2 },
      'TimeoutError': { type: 'network', action: 'timeout', fix: '请求超时', priority: 2 },
      '429': { type: 'rate_limit', action: 'backoff', fix: '触发限流,实施指数退避', priority: 1 },
      'TooManyRequests': { type: 'rate_limit', action: 'backoff', fix: '请求过多,退避等待', priority: 1 },
      
      // 进程相关
      'spawn': { type: 'process', action: 'check', fix: '检查进程状态', priority: 3 },
      'SIGKILL': { type: 'process', action: 'restart', fix: '进程被终止,需要重启', priority: 1 },
      'EPERM': { type: 'permission', action: 'elevate', fix: '权限不足,需要提权', priority: 2 },
      
      // JSON/解析相关
      'JSONParseError': { type: 'parse', action: 'recover', fix: 'JSON解析错误,尝试恢复', priority: 2 },
      'Unexpected token': { type: 'parse', action: 'validate', fix: '语法错误,检查格式', priority: 1 },
      'SyntaxError': { type: 'parse', action: 'validate', fix: '语法错误', priority: 1 },
      
      // Git相关
      'not a git repository': { type: 'git', action: 'init', fix: '初始化Git仓库', priority: 2 },
      'git pull failed': { type: 'git', action: 'rebase', fix: 'Git拉取失败,尝试rebase', priority: 2 },
      
      // 通用
      'default': { type: 'unknown', action: 'report', fix: '需要人工介入', priority: 99 }
    };
  }

  // 捕获错误
  captureError(error, context = {}) {
    const errorEntry = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      message: error.message || String(error),
      code: error.code || null,
      stack: error.stack,
      context,
      analyzed: false,
      repaired: false
    };
    
    // 限制日志大小
    if (this.errorLog.length >= this.maxLogSize) {
      this.errorLog.shift();
    }
    this.errorLog.push(errorEntry);
    
    return errorEntry;
  }

  // 根因分析
  analyzeRootCause(errorEntry) {
    const errorMsg = errorEntry.message;
    let matchedRule = this.errorRules['default'];
    let matchedPattern = 'default';
    
    // 匹配规则 (按优先级排序)
    const patterns = Object.keys(this.errorRules).sort((a, b) => {
      return this.errorRules[a].priority - this.errorRules[b].priority;
    });
    
    for (const pattern of patterns) {
      if (pattern !== 'default' && errorMsg.includes(pattern)) {
        matchedRule = this.errorRules[pattern];
        matchedPattern = pattern;
        break;
      }
    }
    
    errorEntry.analyzed = true;
    errorEntry.rootCause = {
      pattern: matchedPattern,
      ...matchedRule
    };
    
    return errorEntry.rootCause;
  }

  // 获取修复建议
  getFixSuggestion(errorEntry) {
    if (!errorEntry.analyzed) {
      this.analyzeRootCause(errorEntry);
    }
    return errorEntry.rootCause.fix;
  }

  // 自动修复 (基础版本)
  async autoRepair(errorEntry, options = {}) {
    const rule = errorEntry.rootCause;
    const context = errorEntry.context;
    const results = {
      success: false,
      action: rule.action,
      message: rule.fix,
      details: []
    };

    // 根据错误类型尝试修复
    switch (rule.action) {
      case 'retry':
        results.success = true;
        results.message = `建议重试操作`;
        break;
        
      case 'backoff':
        results.success = true;
        results.message = `建议实施指数退避: 等待 ${options.backoffDelay || 1000}ms`;
        break;
        
      case 'report':
        results.success = false;
        results.message = `需要人工介入处理`;
        break;
        
      default:
        results.message = `错误类型: ${rule.type}, 建议: ${rule.fix}`;
    }

    errorEntry.repaired = results.success;
    return results;
  }

  // 生成错误报告
  generateReport(errorEntry) {
    return {
      id: errorEntry.id,
      time: errorEntry.timestamp,
      error: {
        message: errorEntry.message,
        code: errorEntry.code,
        type: errorEntry.rootCause?.type || 'unknown'
      },
      rootCause: {
        pattern: errorEntry.rootCause?.pattern || 'default',
        fix: errorEntry.rootCause?.fix || '未知',
        action: errorEntry.rootCause?.action || 'report'
      },
      context: errorEntry.context,
      status: errorEntry.repaired ? 'auto_repaired' : 'needs_human'
    };
  }

  // 获取最近错误日志
  getRecentErrors(count = 10) {
    return this.errorLog.slice(-count);
  }

  // 获取错误统计
  getErrorStats() {
    const stats = {};
    for (const entry of this.errorLog) {
      const type = entry.rootCause?.type || 'unknown';
      stats[type] = (stats[type] || 0) + 1;
    }
    return stats;
  }

  // 添加自定义规则
  addRule(pattern, rule) {
    this.errorRules[pattern] = rule;
  }
}

// 导出单例
module.exports = new AgentIntrospection();
