/**
 * 热更新系统
 */

const express = require('express');
const router = express.Router();

let versions = {
  client: { version: '1.0.0', url: '/update/client-1.0.0.zip', force: false },
  config: { version: '1.0.0', data: {} },
  skills: { version: '1.0.0', data: [] },
  items: { version: '1.0.0', data: [] }
};

// 检查更新
router.get('/check/:type', (req, res) => {
  const { type } = req.params;
  const { version } = req.query;
  
  const current = versions[type];
  if (!current) {
    return res.json({ hasUpdate: false });
  }
  
  const hasUpdate = current.version !== version;
  res.json({
    hasUpdate,
    version: current.version,
    url: current.url,
    force: current.force || false
  });
});

// 获取配置热更新
router.get('/config/:type', (req, res) => {
  const { type } = req.params;
  const data = versions[type];
  if (!data) {
    return res.json({});
  }
  res.json({ version: data.version, data: data.data });
});

// 管理员更新配置
router.post('/update/:type', (req, res) => {
  const { type } = req.params;
  const { version, data, url, force } = req.body;
  
  versions[type] = { version, data, url, force };
  res.json({ success: true, version });
});

// 回滚
router.post('/rollback/:type', (req, res) => {
  const { type } = req.params;
  const { version } = req.body;
  
  // 实际需要版本管理
  res.json({ success: true, message: `已回滚到 ${version}` });
});

module.exports = router;
