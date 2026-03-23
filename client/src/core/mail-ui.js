// ==================== 邮件系统 ====================
const API_BASE = 'http://localhost:3001';

// 邮件数据缓存
let mailCache = {
  list: [],
  loading: false
};

// 显示邮件面板
async function showMailPanel() {
  document.getElementById('mailModal').classList.add('active');
  await loadMailList();
}

// 加载邮件列表
async function loadMailList() {
  const container = document.getElementById('mailContent');
  container.innerHTML = '<div style="text-align:center;padding:30px;color:#888">邮件加载中...</div>';
  
  try {
    const response = await fetch(`${API_BASE}/api/mail/list`);
    const result = await response.json();
    
    if (result.success) {
      mailCache.list = result.data || [];
      renderMailList();
    } else {
      // 如果 API 不可用，使用模拟数据
      mailCache.list = getMockMailList();
      renderMailList();
    }
  } catch (error) {
    console.error('加载邮件列表失败:', error);
    // 使用模拟数据
    mailCache.list = getMockMailList();
    renderMailList();
  }
}

// 获取模拟邮件列表
function getMockMailList() {
  return [
    {
      id: 'mail_1',
      sender: '系统',
      title: '欢迎来到寻道修仙',
      content: '恭喜你踏入修仙之路！在这里，你将体验到修仙的乐趣。祝你早日飞升！',
      time: Date.now() - 3600000,
      read: false,
      attachments: [
        { id: 'item_1', name: '灵石', amount: 1000, icon: '💰' }
      ],
      claimed: false
    },
    {
      id: 'mail_2',
      sender: '仙道联盟',
      title: '新手礼包',
      content: '感谢你的加入，这是仙道联盟送给你的一份小礼物，希望对你有帮助。',
      time: Date.now() - 7200000,
      read: false,
      attachments: [
        { id: 'item_2', name: '筑基丹', amount: 5, icon: '💊' },
        { id: 'item_3', name: '灵气果', amount: 10, icon: '🍎' }
      ],
      claimed: false
    },
    {
      id: 'mail_3',
      sender: '神秘仙人',
      title: '功法赠送',
      content: '少年，我观你骨骼清奇，这本功法赠予你，好生修炼。',
      time: Date.now() - 86400000,
      read: true,
      attachments: [
        { id: 'item_4', name: '基础练气决', amount: 1, icon: '📜' }
      ],
      claimed: true
    }
  ];
}

// 渲染邮件列表
function renderMailList() {
  const container = document.getElementById('mailContent');
  const mails = mailCache.list;
  
  if (mails.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:#888">
        <div style="font-size:48px;margin-bottom:15px">📭</div>
        <div>暂无邮件</div>
      </div>
    `;
    return;
  }
  
  let html = `<div style="max-height:400px;overflow-y:auto">`;
  
  for (const mail of mails) {
    const timeStr = formatMailTime(mail.time);
    const unreadStyle = mail.read ? '' : 'background:rgba(102,126,234,0.2);border-left:3px solid #667eea';
    const hasAttachment = mail.attachments && mail.attachments.length > 0;
    const attachmentIcon = hasAttachment ? '📎' : '';
    const claimedBadge = mail.claimed ? '<span style="color:#4ecdc4;font-size:11px;margin-left:5px">已领取</span>' : '';
    
    html += `
      <div style="padding:12px;margin:8px 0;background:rgba(0,0,0,0.3);border-radius:8px;cursor:pointer;${unreadStyle}" 
           onclick="showMailDetail('${mail.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="flex:1">
            <div style="font-weight:bold;color:${mail.read ? '#aaa' : '#fff'}">${mail.sender}</div>
            <div style="color:${mail.read ? '#666' : '#ccc'};margin:4px 0">${mail.title} ${attachmentIcon}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;color:#666">${timeStr}</div>
            ${claimedBadge}
          </div>
        </div>
      </div>
    `;
  }
  
  html += '</div>';
  container.innerHTML = html;
}

// 显示邮件详情
function showMailDetail(mailId) {
  const mail = mailCache.list.find(m => m.id === mailId);
  if (!mail) return;
  
  // 标记为已读
  if (!mail.read) {
    mail.read = true;
  }
  
  const container = document.getElementById('mailContent');
  const timeStr = formatMailTime(mail.time);
  const hasAttachment = mail.attachments && mail.attachments.length > 0;
  
  let attachmentHtml = '';
  if (hasAttachment) {
    attachmentHtml = `
      <div style="margin-top:15px;padding:12px;background:rgba(255,215,0,0.1);border-radius:8px">
        <div style="color:#ffd700;font-weight:bold;margin-bottom:10px">📎 附件</div>
        ${mail.attachments.map(att => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:rgba(0,0,0,0.3);border-radius:6px;margin-bottom:6px">
            <div>
              <span style="font-size:18px;margin-right:8px">${att.icon}</span>
              <span>${att.name}</span>
              <span style="color:#4ecdc4;margin-left:8px">x${att.amount}</span>
            </div>
            ${mail.claimed ? '<span style="color:#666">已领取</span>' : `<button class="btn btn-sm btn-success" onclick="claimMailAttachment('${mail.id}', '${att.id}')">领取</button>`}
          </div>
        `).join('')}
        ${!mail.claimed && hasAttachment ? `<button class="btn btn-primary" style="width:100%;margin-top:10px" onclick="claimAllMailAttachments('${mail.id}')">一键领取所有附件</button>` : ''}
      </div>
    `;
  }
  
  container.innerHTML = `
    <div style="padding:15px">
      <button class="btn btn-sm" onclick="renderMailList()" style="margin-bottom:15px">← 返回邮件列表</button>
      
      <div style="padding:15px;background:rgba(0,0,0,0.3);border-radius:8px">
        <div style="font-size:18px;font-weight:bold;color:#ffd700;margin-bottom:10px">${mail.title}</div>
        <div style="color:#888;font-size:12px;margin-bottom:15px">
          发件人: ${mail.sender} | 时间: ${timeStr}
        </div>
        <div style="color:#ccc;line-height:1.6">${mail.content}</div>
      </div>
      
      ${attachmentHtml}
      
      <button class="btn btn-danger" style="margin-top:15px;width:100%" onclick="deleteMail('${mail.id}')">🗑️ 删除邮件</button>
    </div>
  `;
}

// 领取邮件附件
async function claimMailAttachment(mailId, attachmentId) {
  const mail = mailCache.list.find(m => m.id === mailId);
  if (!mail || mail.claimed) {
    addLog('附件已领取或邮件不存在', 'warning');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/mail/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mailId, attachmentId })
    });
    
    const result = await response.json();
    
    if (result.success) {
      mail.claimed = true;
      // 添加物品到背包
      const attachment = mail.attachments.find(a => a.id === attachmentId);
      if (attachment) {
        addItemToInventory(attachment.name, attachment.amount);
        addLog(`成功领取: ${attachment.name} x${attachment.amount}`, 'success');
      }
      showMailDetail(mailId);
    } else {
      addLog(result.message || '领取失败', 'error');
    }
  } catch (error) {
    console.error('领取附件失败:', error);
    // 模拟领取
    mail.claimed = true;
    const attachment = mail.attachments.find(a => a.id === attachmentId);
    if (attachment) {
      addItemToInventory(attachment.name, attachment.amount);
      addLog(`成功领取: ${attachment.name} x${attachment.amount}`, 'success');
    }
    showMailDetail(mailId);
  }
}

// 一键领取所有附件
async function claimAllMailAttachments(mailId) {
  const mail = mailCache.list.find(m => m.id === mailId);
  if (!mail || mail.claimed || !mail.attachments) {
    addLog('没有可领取的附件', 'warning');
    return;
  }
  
  for (const attachment of mail.attachments) {
    await claimMailAttachment(mailId, attachment.id);
  }
}

// 删除邮件
async function deleteMail(mailId) {
  if (!confirm('确定要删除这封邮件吗？')) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/mail/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mailId })
    });
    
    const result = await response.json();
    
    if (result.success) {
      mailCache.list = mailCache.list.filter(m => m.id !== mailId);
      addLog('邮件已删除', 'success');
      renderMailList();
    } else {
      addLog(result.message || '删除失败', 'error');
    }
  } catch (error) {
    console.error('删除邮件失败:', error);
    // 模拟删除
    mailCache.list = mailCache.list.filter(m => m.id !== mailId);
    addLog('邮件已删除', 'success');
    renderMailList();
  }
}

// 添加物品到背包
function addItemToInventory(itemName, amount) {
  const state = gameState;
  if (!state.player.artifacts_inventory) {
    state.player.artifacts_inventory = {};
  }
  state.player.artifacts_inventory[itemName] = (state.player.artifacts_inventory[itemName] || 0) + amount;
  saveGameData();
}

// 格式化邮件时间
function formatMailTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

