<template>
  <div class="drop-notification" v-if="visible">
    <div class="notification-header">
      <span class="title">获得物品</span>
      <button class="close-btn" @click="close">×</button>
    </div>
    <div class="notification-content">
      <div class="items-list">
        <div 
          v-for="(item, index) in items" 
          :key="index" 
          class="item-row"
          :class="item.quality"
        >
          <img :src="item.icon || '/images/items/default.png'" :alt="item.name" class="item-icon" />
          <div class="item-info">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-count" v-if="item.count > 1">x{{ item.count }}</span>
          </div>
          <span class="item-quality-badge" :class="item.quality">{{ getQualityName(item.quality) }}</span>
        </div>
      </div>
    </div>
    <div class="notification-footer" v-if="showAutoClose">
      <span class="auto-close-hint">{{ autoCloseSeconds }}秒后自动关闭</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DropNotificationPanel',
  data() {
    return {
      visible: false,
      items: [],
      showAutoClose: true,
      autoCloseSeconds: 5,
      timer: null
    };
  },
  methods: {
    show(itemList) {
      this.items = Array.isArray(itemList) ? itemList : [itemList];
      this.visible = true;
      this.startAutoClose();
    },
    close() {
      this.visible = false;
      this.clearTimer();
    },
    startAutoClose() {
      this.clearTimer();
      this.autoCloseSeconds = 5;
      this.timer = setInterval(() => {
        this.autoCloseSeconds--;
        if (this.autoCloseSeconds <= 0) {
          this.close();
        }
      }, 1000);
    },
    clearTimer() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },
    getQualityName(quality) {
      const qualityMap = {
        common: '普通',
        uncommon: '优秀',
        rare: '稀有',
        epic: '史诗',
        legendary: '传说',
        mythical: '神话'
      };
      return qualityMap[quality] || '普通';
    }
  },
  beforeUnmount() {
    this.clearTimer();
  }
};
</script>

<style scoped>
.drop-notification {
  position: fixed;
  top: 20%;
  right: 20px;
  width: 320px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 2px solid #ffd700;
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  z-index: 9999;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.3);
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.1) 0%, transparent 100%);
}

.title {
  color: #ffd700;
  font-size: 16px;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

.notification-content {
  padding: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.item-row.common { border-left: 3px solid #999; }
.item-row.uncommon { border-left: 3px solid #1eff00; }
.item-row.rare { border-left: 3px solid #0070dd; }
.item-row.epic { border-left: 3px solid #a335ee; }
.item-row.legendary { border-left: 3px solid #ff8000; }
.item-row.mythical { border-left: 3px solid #ff0000; }

.item-icon {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.item-name {
  color: #fff;
  font-size: 14px;
}

.item-count {
  color: #ffd700;
  font-size: 12px;
}

.item-quality-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
}

.item-quality-badge.common { background: #999; color: #fff; }
.item-quality-badge.uncommon { background: #1eff00; color: #000; }
.item-quality-badge.rare { background: #0070dd; color: #fff; }
.item-quality-badge.epic { background: #a335ee; color: #fff; }
.item-quality-badge.legendary { background: #ff8000; color: #fff; }
.item-quality-badge.mythical { background: #ff0000; color: #fff; }

.notification-footer {
  padding: 8px 16px;
  text-align: center;
  border-top: 1px solid rgba(255, 215, 0, 0.3);
}

.auto-close-hint {
  color: #666;
  font-size: 12px;
}
</style>
