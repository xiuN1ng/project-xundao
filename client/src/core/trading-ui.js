// ==================== 交易市场 UI ====================
function showMarketPanel() {
  document.getElementById('marketModal').classList.add('active');
  renderMarketUI();
}
function renderMarketUI() {
  const container = document.getElementById('marketInfo');
  const listings = searchMarket();
  
  if (listings.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:30px;color:#888">市场上还没有商品</div>';
    return;
  }
  
  let html = '';
  for (const l of listings.slice(0, 20)) {
    const color = l.seller === gameState.player.name ? '#00FF7F' : '#FFD700';
    html += `<div style="display:flex;justify-content:space-between;padding:10px;margin:6px 0;background:rgba(0,0,0,0.3);border-radius:6px">
      <div>
        <span style="color:${color}">${l.item}</span>
        <span style="color:#888;font-size:12px"> x1</span>
      </div>
      <div>
        <span style="color:#ffd700">${l.price}</span>
        ${l.seller !== gameState.player.name ? 
          `<button class="btn btn-sm" onclick="buyItemUI(${l.id})">购买</button>` : 
          `<button class="btn btn-sm" style="background:#666" onclick="delistItemUI(${l.id})">下架</button>`}
      </div>
    </div>`;
  }
  container.innerHTML = html;
}
function buyItemUI(id) {
  const result = buyItem(id);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderMarketUI();
}
function delistItemUI(id) {
  const result = delistItem(id);
  addLog(result.message, result.success ? 'success' : 'error');
  if (result.success) renderMarketUI();
}

