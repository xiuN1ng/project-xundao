<template>
  <div class="auction-panel">
    <div class="panel-header">
      <h3>🎯 拍卖场</h3>
      <button class="close-btn" @click="closePanel">×</button>
    </div>
    
    <div class="auction-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.key"
        :class="['tab', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ tab.icon }} {{ tab.name }}
      </button>
    </div>
    
    <div class="auction-list">
      <div v-if="auctions.length === 0" class="empty">
        暂无拍卖品
      </div>
      <div 
        v-for="auction in auctions" 
        :key="auction.id" 
        class="auction-item"
      >
        <div class="item-info">
          <span class="item-name">{{ auction.item?.name || '物品' }}</span>
          <span class="item-type">{{ auction.type }}</span>
        </div>
        <div class="price-info">
          <span class="current-price">💰 {{ auction.highestBid }}</span>
          <span class="bidder">{{ auction.highestBidder }} 出价</span>
        </div>
        <button class="bid-btn" @click="showBidDialog(auction)">
          出价
        </button>
      </div>
    </div>
    
    <div v-if="showBid" class="bid-dialog">
      <div class="dialog-content">
        <h4>出价</h4>
        <input 
          type="number" 
          v-model.number="bidAmount" 
          :min="currentAuction?.highestBid + 1"
          placeholder="输入出价金额"
        />
        <div class="dialog-btns">
          <button @click="confirmBid">确认</button>
          <button @click="showBid = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const emit = defineEmits(['close']);

const tabs = [
  { key: 'all', name: '全部', icon: '📦' },
  { key: 'equipment', name: '装备', icon: '⚔️' },
  { key: 'material', name: '材料', icon: '💎' },
  { key: 'treasure', name: '珍宝', icon: '🏆' }
];

const activeTab = ref('all');
const auctions = ref([]);
const showBid = ref(false);
const bidAmount = ref(0);
const currentAuction = ref(null);

function closePanel() {
  emit('close');
}

function showBidDialog(auction) {
  currentAuction.value = auction;
  bidAmount.value = auction.highestBid + 1;
  showBid.value = true;
}

function confirmBid() {
  // TODO: 调用API
  showBid.value = false;
}

function loadAuctions() {
  // TODO: 加载拍卖列表
  auctions.value = [];
}

onMounted(() => {
  loadAuctions();
});
</script>

<style scoped>
.auction-panel {
  width: 500px;
  background: #1a1a2e;
  border-radius: 12px;
  padding: 20px;
  color: #fff;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.close-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
}

.auction-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.tab {
  padding: 8px 16px;
  background: #16213e;
  border: none;
  border-radius: 6px;
  color: #aaa;
  cursor: pointer;
}

.tab.active {
  background: #e94560;
  color: #fff;
}

.auction-list {
  max-height: 400px;
  overflow-y: auto;
}

.empty {
  text-align: center;
  color: #666;
  padding: 40px;
}

.auction-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: #16213e;
  border-radius: 8px;
  margin-bottom: 10px;
}

.item-info {
  display: flex;
  flex-direction: column;
}

.item-name {
  font-weight: bold;
}

.item-type {
  font-size: 12px;
  color: #888;
}

.price-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.current-price {
  color: #f39c12;
  font-weight: bold;
}

.bidder {
  font-size: 12px;
  color: #888;
}

.bid-btn {
  padding: 6px 16px;
  background: #e94560;
  border: none;
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
}

.bid-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-content {
  background: #1a1a2e;
  padding: 24px;
  border-radius: 12px;
  width: 300px;
}

.dialog-content input {
  width: 100%;
  padding: 10px;
  margin: 16px 0;
  background: #16213e;
  border: 1px solid #333;
  border-radius: 6px;
  color: #fff;
}

.dialog-btns {
  display: flex;
  gap: 10px;
}

.dialog-btns button {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.dialog-btns button:first-child {
  background: #e94560;
  color: #fff;
}

.dialog-btns button:last-child {
  background: #333;
  color: #fff;
}
</style>
