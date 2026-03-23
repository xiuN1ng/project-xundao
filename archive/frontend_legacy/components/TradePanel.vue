<template>
  <div class="trade-panel">
    <div class="trade-header">
      <div class="trade-title">🏪 交易</div>
      <div class="trade-tabs">
        <button 
          v-for="tab in tradeTabs" 
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTradeTab === tab.id }"
          @click="activeTradeTab = tab.id"
        >
          {{ tab.icon }} {{ tab.name }}
        </button>
      </div>
    </div>
    
    <!-- 市场 -->
    <div class="trade-content" v-if="activeTradeTab === 'market'">
      <!-- 搜索和筛选 -->
      <div class="trade-filters">
        <input 
          type="text" 
          v-model="searchKeyword" 
          placeholder="🔍 搜索物品..."
          class="search-input"
        >
        <select v-model="qualityFilter" class="filter-select">
          <option value="">全部品质</option>
          <option value="common">普通</option>
          <option value="uncommon">优秀</option>
          <option value="rare">稀有</option>
          <option value="epic">史诗</option>
          <option value="legendary">传说</option>
        </select>
      </div>
      
      <!-- 物品列表 -->
      <div class="market-list">
        <div 
          v-for="item in filteredMarketItems" 
          :key="item.id"
          class="market-item"
          :class="{ selected: selectedItem?.id === item.id }"
          @click="selectItem(item)"
        >
          <div class="item-icon">{{ item.icon }}</div>
          <div class="item-info">
            <div class="item-name">{{ item.name }}</div>
            <div class="item-meta">
              <span class="item-quality" :class="item.quality">{{ getQualityLabel(item.quality) }}</span>
              <span class="item-seller">卖家: {{ item.seller }}</span>
            </div>
          </div>
          <div class="item-price">
            <span class="price-icon">💰</span>
            <span class="price-value">{{ item.price.toLocaleString() }}</span>
          </div>
        </div>
      </div>
      
      <!-- 购买弹窗 -->
      <div class="modal-overlay" v-if="selectedItem" @click="selectedItem = null">
        <div class="buy-dialog" @click.stop>
          <div class="dialog-header">
            <span>购买物品</span>
            <button class="close-btn" @click="selectedItem = null">×</button>
          </div>
          <div class="dialog-body">
            <div class="item-preview">
              <div class="preview-icon">{{ selectedItem.icon }}</div>
              <div class="preview-name">{{ selectedItem.name }}</div>
              <div class="preview-quality" :class="selectedItem.quality">{{ getQualityLabel(selectedItem.quality) }}</div>
            </div>
            <div class="price-info">
              <span>价格:</span>
              <span class="price">💰 {{ selectedItem.price.toLocaleString() }}</span>
            </div>
            <div class="quantity-input">
              <span>数量:</span>
              <div class="quantity-control">
                <button @click="buyQuantity = Math.max(1, buyQuantity - 1)">-</button>
                <input type="number" v-model.number="buyQuantity" min="1" :max="selectedItem.stock">
                <button @click="buyQuantity = Math.min(selectedItem.stock, buyQuantity + 1)">+</button>
              </div>
            </div>
            <div class="total-price">
              <span>总价:</span>
              <span class="total">💰 {{ (selectedItem.price * buyQuantity).toLocaleString() }}</span>
            </div>
            <button class="buy-btn" @click="confirmBuy">
              确认购买
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 拍卖行 -->
    <div class="trade-content" v-if="activeTradeTab === 'auction'">
      <div class="auction-list">
        <div 
          v-for="auction in auctions" 
          :key="auction.id"
          class="auction-item"
        >
          <div class="auction-icon">{{ auction.icon }}</div>
          <div class="auction-info">
            <div class="auction-name">{{ auction.name }}</div>
            <div class="auction-desc">{{ auction.description }}</div>
            <div class="auction-time" v-if="auction.endTime">
              <span class="time-label">剩余时间:</span>
              <span class="time-value">{{ formatAuctionTime(auction.endTime - Date.now()) }}</span>
            </div>
          </div>
          <div class="auction-bid">
            <div class="current-bid">
              <span class="bid-label">当前出价:</span>
              <span class="bid-value">💰 {{ auction.currentBid.toLocaleString() }}</span>
            </div>
            <div class="bid-count">{{ auction.bidCount }}次出价</div>
            <button class="bid-btn" @click="openBidDialog(auction)">
              出价
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 我的上架 -->
    <div class="trade-content" v-if="activeTradeTab === 'my'">
      <div class="my-listings">
        <div class="listings-header">
          <span>我的上架物品</span>
          <button class="add-btn" @click="showSellDialog = true">+ 上架物品</button>
        </div>
        <div class="listing-list">
          <div 
            v-for="listing in myListings" 
            :key="listing.id"
            class="listing-item"
          >
            <div class="listing-icon">{{ listing.icon }}</div>
            <div class="listing-info">
              <div class="listing-name">{{ listing.name }}</div>
              <div class="listing-status">
                <span v-if="listing.sold" class="status-sold">已售出</span>
                <span v-else class="status-selling">销售中</span>
              </div>
            </div>
            <div class="listing-price">
              <span>💰 {{ listing.price.toLocaleString() }}</span>
              <button class="cancel-btn" v-if="!listing.sold" @click="cancelListing(listing)">
                下架
              </button>
            </div>
          </div>
          <div class="empty-state" v-if="myListings.length === 0">
            <span>📭</span>
            <p>暂无上架物品</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TradePanel',
  data() {
    return {
      activeTradeTab: 'market',
      searchKeyword: '',
      qualityFilter: '',
      selectedItem: null,
      buyQuantity: 1,
      showSellDialog: false,
      tradeTabs: [
        { id: 'market', name: '市场', icon: '🏪' },
        { id: 'auction', name: '拍卖行', icon: '🔨' },
        { id: 'my', name: '我的', icon: '📦' }
      ],
      marketItems: [
        { id: 1, name: '玄铁剑', icon: '⚔️', quality: 'rare', seller: '剑仙李逍遥', price: 50000, stock: 1 },
        { id: 2, name: '九转还魂丹', icon: '💊', quality: 'epic', seller: '丹帝叶凡', price: 80000, stock: 3 },
        { id: 3, name: '千年灵芝', icon: '🌿', quality: 'rare', seller: '药材商人', price: 15000, stock: 10 },
        { id: 4, name: '金丝软甲', icon: '🛡️', quality: 'epic', seller: '炼器大师', price: 120000, stock: 1 },
        { id: 5, name: '灵石袋(大)', icon: '💰', quality: 'common', seller: '商会会长', price: 5000, stock: 100 },
        { id: 6, name: '天阶功法', icon: '📜', quality: 'legendary', seller: '隐世高人', price: 500000, stock: 1 },
        { id: 7, name: '筑基丹', icon: '💊', quality: 'uncommon', seller: '炼丹宗师', price: 8000, stock: 20 },
        { id: 8, name: '飞剑', icon: '🗡️', quality: 'rare', seller: '剑宗弟子', price: 35000, stock: 2 }
      ],
      auctions: [
        { id: 1, name: '神器·轩辕剑', icon: '⚔️', description: '上古神器，威力无穷', currentBid: 1500000, bidCount: 23, endTime: Date.now() + 3600000 * 5 },
        { id: 2, name: '仙品·九色莲', icon: '🪷', description: '服用可白日飞升', currentBid: 800000, bidCount: 15, endTime: Date.now() + 3600000 * 12 },
        { id: 3, name: '绝版·宠物蛋', icon: '🥚', description: '孵化后可获得神兽', currentBid: 300000, bidCount: 8, endTime: Date.now() + 86400000 }
      ],
      myListings: [
        { id: 1, name: '炼器材料', icon: '🔩', price: 5000, sold: false },
        { id: 2, name: '普通丹药', icon: '💊', price: 2000, sold: true }
      ]
    };
  },
  computed: {
    filteredMarketItems() {
      let items = this.marketItems;
      if (this.searchKeyword) {
        items = items.filter(item => item.name.includes(this.searchKeyword));
      }
      if (this.qualityFilter) {
        items = items.filter(item => item.quality === this.qualityFilter);
      }
      return items;
    }
  },
  methods: {
    getQualityLabel(quality) {
      const labels = {
        common: '普通',
        uncommon: '优秀',
        rare: '稀有',
        epic: '史诗',
        legendary: '传说'
      };
      return labels[quality] || quality;
    },
    selectItem(item) {
      this.selectedItem = item;
      this.buyQuantity = 1;
    },
    confirmBuy() {
      if (this.selectedItem) {
        const total = this.selectedItem.price * this.buyQuantity;
        console.log(`Buying ${this.buyQuantity} ${this.selectedItem.name} for ${total}`);
        this.selectedItem = null;
      }
    },
    formatAuctionTime(ms) {
      if (ms <= 0) return '已结束';
      const hours = Math.floor(ms / 3600000);
      const minutes = Math.floor((ms % 3600000) / 60000);
      if (hours > 24) {
        return `${Math.floor(hours / 24)}天${hours % 24}小时`;
      }
      return `${hours}小时${minutes}分钟`;
    },
    openBidDialog(auction) {
      console.log('Open bid for:', auction.name);
    },
    cancelListing(listing) {
      console.log('Cancel listing:', listing.name);
    }
  }
};
</script>

<style scoped>
.trade-panel {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  padding: 20px;
  color: #fff;
  max-height: 80vh;
  overflow-y: auto;
}

.trade-header {
  margin-bottom: 20px;
}

.trade-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
}

.trade-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn.active {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border-color: transparent;
}

.trade-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.search-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 8px 12px;
  border-radius: 8px;
}

.search-input::placeholder {
  color: #aaa;
}

.filter-select {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 8px 12px;
  border-radius: 8px;
}

.market-list, .auction-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.market-item, .auction-item, .listing-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.market-item:hover, .auction-item:hover, .listing-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.market-item.selected {
  border: 1px solid #11998e;
  background: rgba(17, 153, 142, 0.2);
}

.item-icon, .auction-icon, .listing-icon {
  font-size: 32px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.item-info, .auction-info, .listing-info {
  flex: 1;
}

.item-name, .auction-name, .listing-name {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 4px;
}

.item-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: #aaa;
}

.item-quality {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
}

.item-quality.common { background: #999; }
.item-quality.uncommon { background: #4caf50; }
.item-quality.rare { background: #2196f3; }
.item-quality.epic { background: #9c27b0; }
.item-quality.legendary { background: #ff9800; }

.item-price, .listing-price {
  text-align: right;
}

.price-icon {
  font-size: 12px;
}

.price-value {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.buy-dialog {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 360px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: bold;
}

.close-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
}

.item-preview {
  text-align: center;
  margin-bottom: 20px;
}

.preview-icon {
  font-size: 64px;
  margin-bottom: 8px;
}

.preview-name {
  font-size: 18px;
  font-weight: bold;
}

.preview-quality {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  margin-top: 4px;
}

.price-info, .quantity-input, .total-price {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.price, .total {
  color: #ffd700;
  font-weight: bold;
  font-size: 18px;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quantity-control button {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  border-radius: 8px;
  cursor: pointer;
}

.quantity-control input {
  width: 60px;
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  padding: 8px;
  border-radius: 8px;
}

.buy-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border: none;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 16px;
}

/* Auction */
.auction-info {
  flex: 1;
}

.auction-desc {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 4px;
}

.auction-time {
  font-size: 11px;
}

.time-label {
  color: #aaa;
}

.time-value {
  color: #ff9800;
}

.auction-bid {
  text-align: right;
}

.current-bid {
  margin-bottom: 4px;
}

.bid-label {
  font-size: 12px;
  color: #aaa;
}

.bid-value {
  font-size: 16px;
  font-weight: bold;
  color: #ffd700;
}

.bid-count {
  font-size: 11px;
  color: #aaa;
  margin-bottom: 8px;
}

.bid-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border: none;
  color: #fff;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 12px;
}

/* My Listings */
.listings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.add-btn {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  border: none;
  color: #fff;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 12px;
}

.listing-status {
  font-size: 11px;
}

.status-selling {
  color: #4caf50;
}

.status-sold {
  color: #aaa;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  margin-left: 8px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #aaa;
}

.empty-state span {
  font-size: 48px;
}
</style>
