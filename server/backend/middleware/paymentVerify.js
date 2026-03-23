/**
 * 支付回调校验
 */

const PaymentGateways = {
  // 模拟网关
  mock: {
    verify: (orderId, amount) => {
      return { valid: true, realAmount: amount };
    }
  },
  
  // 支付宝 (预留)
  alipay: {
    verify: (params, signature) => {
      // 实际需要验签
      return { valid: true };
    }
  },
  
  // 微信 (预留)
  wechat: {
    verify: (params, signature) => {
      // 实际需要验签
      return { valid: true };
    }
  }
};

function verifyPayment(gateway, orderId, params, signature) {
  const gw = PaymentGateways[gateway];
  if (!gw) {
    return { valid: false, reason: '不支持的支付网关' };
  }
  
  return gw.verify(orderId, params);
}

module.exports = { verifyPayment, PaymentGateways };
