<template>
  <div class="enhancement-panel">
    <div class="enhancement-header">
      <div class="header-title">
        <span class="title-icon">⚒️</span>
        <span>装备强化</span>
      </div>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>
    
    <!-- 强化分类 -->
    <div class="enhancement-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-name">{{ tab.name }}</span>
      </button>
    </div>
    
    <!-- ========== 强化 Tab ========== -->
    <div class="tab-content" v-if="activeTab === 'refine'">
      <!-- 装备选择 -->
      <div class="equipment-select">
        <div class="select-title">选择装备</div>
        <div class="equipment-list" v-if="!loadingEquipments">
          <div 
            v-for="equip in playerEquipments" 
            :key="equip.id"
            class="equipment-card"
            :class="{ selected: selectedEquipment?.id === equip.id }"
            @click="selectEquipment(equip)"
          >
            <div class="equip-icon" :class="'rarity-' + equip.rarity">
              {{ equip.icon }}
            </div>
            <div class="equip-info">
              <div class="equip-name">{{ equip.name }}</div>
              <div class="equip-level">强化等级: +{{ equip.refineLevel }}</div>
            </div>
            <div class="equip-sockets-mini" v-if="equip.socketCount > 0">
              <span class="socket-dots">{{ '●'.repeat(equip.socketCount) }}</span>
            </div>
            <div class="equip-select-btn" v-if="selectedEquipment?.id === equip.id">✓</div>
          </div>
        </div>
        <div class="loading-placeholder" v-else>
          <span class="loader">🔄</span> 加载装备中...
        </div>
      </div>
      
      <!-- 精炼界面 -->
      <div class="refine-container" v-if="selectedEquipment">
        <div class="refine-preview">
          <div class="preview-equip">
            <div class="preview-icon" :class="'rarity-' + selectedEquipment.rarity">
              {{ selectedEquipment.icon }}
            </div>
            <div class="preview-name">{{ selectedEquipment.name }}</div>
            <div class="preview-rarity">稀有度: {{ rarityNames[selectedEquipment.rarity] }}</div>
            <div class="preview-level">
              <span class="level-label">强化等级</span>
              <span class="level-value">+{{ selectedEquipment.refineLevel }}</span>
            </div>
          </div>
          
          <!-- 基础属性 -->
          <div class="attrs-section">
            <div class="attrs-title">装备属性</div>
            <div class="attr-row" v-if="selectedEquipment.baseAttack > 0">
              <span class="attr-icon">⚔️</span>
              <span class="attr-label">攻击</span>
              <span class="attr-base">{{ selectedEquipment.baseAttack }}</span>
              <span class="attr-refine" v-if="getRefineBonus('atk', selectedEquipment.refineLevel) > 0">
                (+{{ getRefineBonus('atk', selectedEquipment.refineLevel) }})
              </span>
            </div>
            <div class="attr-row" v-if="selectedEquipment.baseDef > 0">
              <span class="attr-icon">🛡️</span>
              <span class="attr-label">防御</span>
              <span class="attr-base">{{ selectedEquipment.baseDef }}</span>
              <span class="attr-refine" v-if="getRefineBonus('def', selectedEquipment.refineLevel) > 0">
                (+{{ getRefineBonus('def', selectedEquipment.refineLevel) }})
              </span>
            </div>
            <div class="attr-row" v-if="selectedEquipment.baseHp > 0">
              <span class="attr-icon">❤️</span>
              <span class="attr-label">生命</span>
              <span class="attr-base">{{ selectedEquipment.baseHp }}</span>
              <span class="attr-refine" v-if="getRefineBonus('hp', selectedEquipment.refineLevel) > 0">
                (+{{ getRefineBonus('hp', selectedEquipment.refineLevel) }})
              </span>
            </div>
          </div>
          
          <!-- 强化效果 -->
          <div class="refine-effects" v-if="selectedEquipment.refineLevel > 0">
            <div class="effect-title">强化加成</div>
            <div class="effect-item" v-if="getRefineBonus('atk', selectedEquipment.refineLevel) > 0">
              <span>攻击力</span>
              <span class="effect-bonus">+{{ getRefineBonus('atk', selectedEquipment.refineLevel) }}</span>
            </div>
            <div class="effect-item" v-if="getRefineBonus('def', selectedEquipment.refineLevel) > 0">
              <span>防御力</span>
              <span class="effect-bonus">+{{ getRefineBonus('def', selectedEquipment.refineLevel) }}</span>
            </div>
            <div class="effect-item" v-if="getRefineBonus('hp', selectedEquipment.refineLevel) > 0">
              <span>生命力</span>
              <span class="effect-bonus">+{{ getRefineBonus('hp', selectedEquipment.refineLevel) }}</span>
            </div>
          </div>
          
          <!-- 升级预览 -->
          <div class="upgrade-preview" v-if="selectedEquipment.refineLevel < maxRefineLevel">
            <div class="preview-label">强化至 +{{ selectedEquipment.refineLevel + 1 }}</div>
            <div class="preview-arrow">⬇️</div>
            <div class="preview-result">
              <span class="result-level">+{{ selectedEquipment.refineLevel + 1 }}</span>
              <span class="result-bonus" v-if="selectedEquipment.baseAttack > 0">
                攻击+{{ getRefineBonus('atk', selectedEquipment.refineLevel + 1) }}
              </span>
              <span class="result-bonus" v-if="selectedEquipment.baseDef > 0">
                防御+{{ getRefineBonus('def', selectedEquipment.refineLevel + 1) }}
              </span>
              <span class="result-bonus" v-if="selectedEquipment.baseHp > 0">
                生命+{{ getRefineBonus('hp', selectedEquipment.refineLevel + 1) }}
              </span>
            </div>
          </div>
          
          <div class="max-level-notice" v-if="selectedEquipment.refineLevel >= maxRefineLevel">
            ✨ 已达强化上限 (+{{ maxRefineLevel }})
          </div>
        </div>
        
        <!-- 强化操作 -->
        <div class="refine-operation">
          <div class="operation-cost">
            <div class="cost-item">
              <span class="cost-icon">💰</span>
              <span class="cost-label">消耗灵石:</span>
              <span class="cost-value" :class="{ insufficient: playerData.spiritStones < refineCost }">
                {{ refineCost.toLocaleString() }}
              </span>
              <span class="cost-remaining">(剩余: {{ playerData.spiritStones.toLocaleString() }})</span>
            </div>
            <div class="cost-item">
              <span class="cost-icon">📦</span>
              <span class="cost-label">消耗强化石:</span>
              <span class="cost-value" :class="{ insufficient: playerData.refineStones < refineMaterialCount }">
                {{ refineMaterialCount }}
              </span>
              <span class="cost-remaining">(剩余: {{ playerData.refineStones }})</span>
            </div>
          </div>
          
          <!-- 成功率 -->
          <div class="success-rate">
            <div class="rate-label">
              成功率 
              <span class="guaranteed-tag" v-if="failCount >= 10">🔥 保底下次必成</span>
            </div>
            <div class="rate-bar">
              <div class="rate-fill" :style="{ width: successRate + '%' }" 
                   :class="{ low: successRate < 50, medium: successRate >= 50 && successRate < 80, high: successRate >= 80 }">
              </div>
            </div>
            <div class="rate-value">{{ successRate }}%</div>
            <div class="fail-hint" v-if="failCount > 0 && failCount < 10">
              已连续失败 {{ failCount }}/10 次
            </div>
          </div>
          
          <!-- 强化按钮 -->
          <button 
            class="refine-btn"
            :class="{ 'can-refine': canRefine, 'refining': isRefining }"
            :disabled="!canRefine || isRefining"
            @click="startRefine"
          >
            <span v-if="isRefining" class="refine-text">
              <span class="refine-loader">🔄</span> 强化中...
            </span>
            <span v-else class="refine-text">
              ⚒️ 开始强化
            </span>
          </button>
          
          <!-- 一键强化 -->
          <button 
            class="quick-refine-btn"
            v-if="selectedEquipment.refineLevel < maxRefineLevel"
            :disabled="!canQuickRefine || isRefining"
            @click="quickRefine"
          >
            ⚡ 一键强化至+{{ maxRefineLevel }}
          </button>
        </div>
      </div>
      
      <!-- 未选装备提示 -->
      <div class="no-selection" v-if="!selectedEquipment && !loadingEquipments">
        <div class="no-selection-icon">📦</div>
        <div class="no-selection-text">请从上方选择一件装备</div>
      </div>
    </div>
    
    <!-- ========== 增幅 Tab ========== -->
    <div class="tab-content" v-if="activeTab === 'augment'">
      <div class="equipment-select">
        <div class="select-title">选择装备</div>
        <div class="equipment-list" v-if="!loadingEquipments">
          <div 
            v-for="equip in playerEquipments" 
            :key="equip.id"
            class="equipment-card"
            :class="{ selected: augmentEquipment?.id === equip.id }"
            @click="selectAugmentEquip(equip)"
          >
            <div class="equip-icon" :class="'rarity-' + equip.rarity">
              {{ equip.icon }}
            </div>
            <div class="equip-info">
              <div class="equip-name">{{ equip.name }}</div>
              <div class="equip-level">强化: +{{ equip.refineLevel }}</div>
            </div>
            <div class="equip-select-btn" v-if="augmentEquipment?.id === equip.id">✓</div>
          </div>
        </div>
      </div>
      
      <div class="augment-container" v-if="augmentEquipment">
        <div class="augment-preview">
          <div class="preview-equip">
            <div class="preview-icon" :class="'rarity-' + augmentEquipment.rarity">
              {{ augmentEquipment.icon }}
            </div>
            <div class="preview-name">{{ augmentEquipment.name }}</div>
            <div class="preview-level">
              <span class="level-label">强化等级</span>
              <span class="level-value">+{{ augmentEquipment.refineLevel }}</span>
            </div>
          </div>
          
          <!-- 红字属性 -->
          <div class="augment-stats">
            <div class="augment-title">🔴 红字属性（增幅）</div>
            <div class="augment-stat-row">
              <span class="stat-icon">⚔️</span>
              <span class="stat-label">攻击加成</span>
              <span class="stat-value red">+{{ augmentEquipment.augmentStats?.atkBonus || 0 }}</span>
            </div>
            <div class="augment-stat-row">
              <span class="stat-icon">🛡️</span>
              <span class="stat-label">防御加成</span>
              <span class="stat-value red">+{{ augmentEquipment.augmentStats?.defBonus || 0 }}</span>
            </div>
            <div class="augment-stat-row">
              <span class="stat-icon">❤️</span>
              <span class="stat-label">生命加成</span>
              <span class="stat-value red">+{{ augmentEquipment.augmentStats?.hpBonus || 0 }}</span>
            </div>
          </div>
          
          <!-- 增幅历史 -->
          <div class="augment-history" v-if="augmentHistory.length > 0">
            <div class="history-title">增幅记录</div>
            <div class="history-list">
              <div class="history-item" v-for="(h, idx) in augmentHistory" :key="idx">
                <span class="history-stat">{{ h.statName }}</span>
                <span class="history-bonus">+{{ h.bonus }}</span>
                <span class="history-time">{{ formatTime(h.timestamp) }}</span>
              </div>
            </div>
          </div>
          <div class="no-history" v-else>
            暂无增幅记录
          </div>
        </div>
        
        <!-- 增幅操作 -->
        <div class="augment-operation">
          <div class="operation-cost">
            <div class="cost-item">
              <span class="cost-icon">💰</span>
              <span class="cost-label">灵石:</span>
              <span class="cost-value" :class="{ insufficient: playerData.spiritStones < 5000 }">
                5,000
              </span>
              <span class="cost-remaining">(剩余: {{ playerData.spiritStones.toLocaleString() }})</span>
            </div>
            <div class="cost-item">
              <span class="cost-icon">🎫</span>
              <span class="cost-label">增幅券:</span>
              <span class="cost-value" :class="{ insufficient: playerData.augmentTickets < 1 }">
                1
              </span>
              <span class="cost-remaining">(剩余: {{ playerData.augmentTickets }})</span>
            </div>
          </div>
          
          <!-- 增幅效果预览 -->
          <div class="augment-preview-effect">
            <div class="effect-hint">每次增幅随机 +1~10 点红字属性</div>
            <div class="possible-stats">
              <div class="possible-stat">
                <span>⚔️ 攻击</span>
                <span class="stat-range">+1~10</span>
              </div>
              <div class="possible-stat">
                <span>🛡️ 防御</span>
                <span class="stat-range">+1~10</span>
              </div>
              <div class="possible-stat">
                <span>❤️ 生命</span>
                <span class="stat-range">+1~10</span>
              </div>
            </div>
          </div>
          
          <button 
            class="augment-btn"
            :class="{ 'can-augment': canAugment, 'augmenting': isAugmenting }"
            :disabled="!canAugment || isAugmenting"
            @click="startAugment"
          >
            <span v-if="isAugmenting" class="augment-text">
              <span class="refine-loader">🔥</span> 增幅中...
            </span>
            <span v-else class="augment-text">
              🔥 开始增幅
            </span>
          </button>
        </div>
      </div>
      
      <div class="no-selection" v-if="!augmentEquipment && !loadingEquipments">
        <div class="no-selection-icon">🔥</div>
        <div class="no-selection-text">请选择要增幅的装备</div>
      </div>
    </div>
    
    <!-- ========== 打孔 Tab ========== -->
    <div class="tab-content" v-if="activeTab === 'socket'">
      <div class="equipment-select">
        <div class="select-title">选择装备</div>
        <div class="equipment-list" v-if="!loadingEquipments">
          <div 
            v-for="equip in playerEquipments" 
            :key="equip.id"
            class="equipment-card"
            :class="{ selected: socketEquipment?.id === equip.id }"
            @click="selectSocketEquip(equip)"
          >
            <div class="equip-icon" :class="'rarity-' + equip.rarity">
              {{ equip.icon }}
            </div>
            <div class="equip-info">
              <div class="equip-name">{{ equip.name }}</div>
              <div class="equip-level">
                <span>强化: +{{ equip.refineLevel }}</span>
                <span class="socket-count-badge">{{ equip.socketCount || 0 }}/4孔</span>
              </div>
            </div>
            <div class="equip-select-btn" v-if="socketEquipment?.id === equip.id">✓</div>
          </div>
        </div>
      </div>
      
      <div class="socket-container" v-if="socketEquipment">
        <div class="socket-preview">
          <div class="preview-equip">
            <div class="preview-icon" :class="'rarity-' + socketEquipment.rarity">
              {{ socketEquipment.icon }}
            </div>
            <div class="preview-name">{{ socketEquipment.name }}</div>
          </div>
          
          <!-- 孔位展示 -->
          <div class="sockets-display">
            <div class="sockets-title">孔位 ({{ socketEquipment.socketCount || 0 }}/4)</div>
            <div class="socket-grid">
              <div 
                v-for="(socket, idx) in 4" 
                :key="idx"
                class="socket-slot"
                :class="{ 
                  filled: socketEquipment.sockets && socketEquipment.sockets[idx] !== null,
                  empty: socketEquipment.sockets && socketEquipment.sockets[idx] === null,
                  selectable: selectedSocketIndex === idx
                }"
                @click="selectSocket(idx)"
              >
                <template v-if="socketEquipment.sockets && socketEquipment.sockets[idx] !== null">
                  <span class="socket-gem-icon">{{ getGemIcon(socketEquipment.sockets[idx]) }}</span>
                  <span class="socket-gem-name">{{ getGemName(socketEquipment.sockets[idx]) }}</span>
                </template>
                <template v-else>
                  <span class="socket-empty-icon">◇</span>
                  <span class="socket-empty-text">空</span>
                </template>
              </div>
            </div>
          </div>
          
          <!-- 镶嵌选择 -->
          <div class="inlay-section" v-if="gemTypes.length > 0">
            <div class="inlay-title">镶嵌宝石</div>
            <div class="gem-grid">
              <div 
                v-for="gem in gemTypes" 
                :key="gem.type"
                class="gem-card"
                :class="{ selected: selectedGemType === gem.type }"
                @click="selectedGemType = gem.type"
              >
                <span class="gem-icon">{{ gem.icon }}</span>
                <span class="gem-name">{{ gem.name }}</span>
                <span class="gem-value">+{{ gem.value }} {{ gemStatNames[gem.stat] }}</span>
              </div>
            </div>
            <button 
              class="inlay-btn"
              :disabled="selectedSocketIndex === null || !selectedGemType"
              @click="inlayGem"
            >
              💎 镶嵌选中宝石
            </button>
            <button 
              class="remove-gem-btn"
              v-if="selectedSocketIndex !== null && socketEquipment.sockets && socketEquipment.sockets[selectedSocketIndex] !== null"
              @click="removeGem"
            >
              💎 取下宝石
            </button>
          </div>
        </div>
        
        <!-- 打孔操作 -->
        <div class="socket-operation">
          <div class="socket-cost-info">
            <div class="cost-title">打孔费用</div>
            <div class="socket-cost-list">
              <div class="socket-cost-item" 
                   v-for="idx in 4" 
                   :key="idx"
                   :class="{ 
                     used: socketEquipment.socketCount >= idx,
                     next: socketEquipment.socketCount === idx - 1,
                     locked: socketEquipment.socketCount < idx - 1
                   }">
                <span class="socket-num">第{{ idx }}孔</span>
                <span class="socket-price">{{ getSocketCost(idx - 1).toLocaleString() }} 灵石</span>
                <span class="socket-status" v-if="socketEquipment.socketCount >= idx">已开</span>
                <span class="socket-status next" v-else-if="socketEquipment.socketCount === idx - 1">可开</span>
                <span class="socket-status locked" v-else>锁定</span>
              </div>
            </div>
          </div>
          
          <button 
            class="add-socket-btn"
            :disabled="(socketEquipment.socketCount || 0) >= 4"
            @click="addSocket"
          >
            🔨 开凿新孔位 ({{ (socketEquipment.socketCount || 0) < 4 ? getSocketCost(socketEquipment.socketCount || 0).toLocaleString() + ' 灵石' : '已满' }})
          </button>
          
          <!-- 属性预览 -->
          <div class="attr-preview-section" v-if="selectedGemType">
            <div class="preview-title">镶嵌后属性预览</div>
            <div class="preview-gem-attr">
              <span class="gem-icon">{{ getGemIcon(selectedGemType) }}</span>
              <span>{{ getGemName(selectedGemType) }}</span>
              <span class="gem-stat">+{{ getGemValue(selectedGemType) }} {{ gemStatNames[getGemStat(selectedGemType)] }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="no-selection" v-if="!socketEquipment && !loadingEquipments">
        <div class="no-selection-icon">💎</div>
        <div class="no-selection-text">请选择要打孔的装备</div>
      </div>
    </div>
    
    <!-- ========== 继承 Tab ========== -->
    <div class="tab-content" v-if="activeTab === 'transfer'">
      <div class="transfer-container">
        <div class="transfer-info">
          <div class="transfer-title">装备继承</div>
          <div class="transfer-desc">
            将源装备的强化等级、增幅属性、孔位宝石转移到目标装备。<br>
            继承后源装备的相应属性归零。
          </div>
        </div>
        
        <div class="transfer-slots">
          <div class="transfer-slot">
            <div class="slot-label">源装备</div>
            <div 
              class="slot-equip"
              :class="{ filled: sourceEquip, selectable: true }"
              @click="openEquipSelector('source')"
            >
              <template v-if="sourceEquip">
                <div class="equip-icon small" :class="'rarity-' + sourceEquip.rarity">
                  {{ sourceEquip.icon }}
                </div>
                <div class="equip-name-sm">{{ sourceEquip.name }}</div>
                <div class="equip-level">+{{ sourceEquip.refineLevel }}</div>
                <div class="equip-augment" v-if="sourceEquip.augmentStats">
                  <span v-if="sourceEquip.augmentStats.atkBonus > 0">攻+{{ sourceEquip.augmentStats.atkBonus }}</span>
                  <span v-if="sourceEquip.augmentStats.defBonus > 0">防+{{ sourceEquip.augmentStats.defBonus }}</span>
                </div>
              </template>
              <template v-else>
                <span class="slot-placeholder">+</span>
                <span class="slot-hint">选择源装备</span>
              </template>
            </div>
          </div>
          
          <div class="transfer-arrow">➡️</div>
          
          <div class="transfer-slot">
            <div class="slot-label">目标装备</div>
            <div 
              class="slot-equip"
              :class="{ filled: targetEquip, selectable: true }"
              @click="openEquipSelector('target')"
            >
              <template v-if="targetEquip">
                <div class="equip-icon small" :class="'rarity-' + targetEquip.rarity">
                  {{ targetEquip.icon }}
                </div>
                <div class="equip-name-sm">{{ targetEquip.name }}</div>
                <div class="equip-level">+{{ targetEquip.refineLevel }}</div>
              </template>
              <template v-else>
                <span class="slot-placeholder">+</span>
                <span class="slot-hint">选择目标装备</span>
              </template>
            </div>
          </div>
        </div>
        
        <!-- 继承预览 -->
        <div class="inherit-preview" v-if="sourceEquip && targetEquip">
          <div class="inherit-title">继承内容</div>
          <div class="inherit-items">
            <div class="inherit-item" v-if="sourceEquip.refineLevel > 0">
              <span>强化等级</span>
              <span class="inherit-arrow">+{{ sourceEquip.refineLevel }} ➜ {{ targetEquip.refineLevel + sourceEquip.refineLevel }}</span>
            </div>
            <div class="inherit-item" v-if="sourceEquip.augmentStats?.atkBonus > 0">
              <span>攻击红字</span>
              <span class="inherit-arrow">+{{ sourceEquip.augmentStats.atkBonus }}</span>
            </div>
            <div class="inherit-item" v-if="sourceEquip.augmentStats?.defBonus > 0">
              <span>防御红字</span>
              <span class="inherit-arrow">+{{ sourceEquip.augmentStats.defBonus }}</span>
            </div>
            <div class="inherit-item" v-if="sourceEquip.augmentStats?.hpBonus > 0">
              <span>生命红字</span>
              <span class="inherit-arrow">+{{ sourceEquip.augmentStats.hpBonus }}</span>
            </div>
            <div class="inherit-item" v-if="sourceEquip.socketCount > 0">
              <span>镶嵌宝石</span>
              <span class="inherit-arrow">{{ sourceEquip.socketCount }}个孔位</span>
            </div>
          </div>
        </div>
        
        <div class="transfer-cost">
          <span>继承消耗:</span>
          <span class="cost-value" :class="{ insufficient: playerData.spiritStones < 10000 }">
            10,000 灵石
          </span>
          <span class="cost-remaining">(剩余: {{ playerData.spiritStones.toLocaleString() }})</span>
        </div>
        
        <button 
          class="transfer-btn"
          :disabled="!canInherit || isInheriting"
          @click="startInherit"
        >
          {{ isInheriting ? '继承中...' : '🔄 开始继承' }}
        </button>
      </div>
    </div>
    
    <!-- 装备选择器弹窗 -->
    <div class="equip-picker-modal" v-if="showEquipPicker" @click.self="showEquipPicker = false">
      <div class="picker-dialog">
        <div class="picker-header">
          <span>{{ pickerMode === 'source' ? '选择源装备' : '选择目标装备' }}</span>
          <button class="picker-close" @click="showEquipPicker = false">✕</button>
        </div>
        <div class="picker-list">
          <div 
            v-for="equip in playerEquipments" 
            :key="equip.id"
            class="picker-item"
            :class="{ disabled: pickerMode === 'target' && equip.id === sourceEquip?.id }"
            @click="pickEquip(equip)"
          >
            <div class="equip-icon small" :class="'rarity-' + equip.rarity">
              {{ equip.icon }}
            </div>
            <div class="picker-info">
              <div class="picker-name">{{ equip.name }}</div>
              <div class="picker-detail">
                强化+{{ equip.refineLevel }} | 
                <span v-if="equip.augmentStats?.atkBonus > 0">攻+{{ equip.augmentStats.atkBonus }}</span>
                <span v-if="equip.augmentStats?.defBonus > 0">防+{{ equip.augmentStats.defBonus }}</span>
                <span v-if="equip.socketCount > 0">{{ equip.socketCount }}孔</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 结果提示 -->
    <transition name="toast">
      <div class="result-toast" v-if="toast.show" :class="toast.type">
        {{ toast.message }}
      </div>
    </transition>
    
    <!-- 玩家资源 -->
    <div class="player-resources">
      <div class="resource-item">
        <span class="resource-icon">💰</span>
        <span class="resource-value">{{ playerData.spiritStones.toLocaleString() }}</span>
      </div>
      <div class="resource-item">
        <span class="resource-icon">📦</span>
        <span class="resource-value">{{ playerData.refineStones }}</span>
      </div>
      <div class="resource-item">
        <span class="resource-icon">🎫</span>
        <span class="resource-value">{{ playerData.augmentTickets }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EnhancementPanel',
  props: {
    userId: {
      type: Number,
      default: 1,
    },
  },
  data() {
    return {
      activeTab: 'refine',
      tabs: [
        { id: 'refine', name: '强化', icon: '⚒️' },
        { id: 'augment', name: '增幅', icon: '🔥' },
        { id: 'socket', name: '打孔', icon: '💎' },
        { id: 'transfer', name: '继承', icon: '🔄' },
      ],
      
      // 装备数据
      playerEquipments: [],
      loadingEquipments: false,
      selectedEquipment: null,
      augmentEquipment: null,
      socketEquipment: null,
      
      // 玩家资源
      playerData: {
        spiritStones: 0,
        refineStones: 0,
        augmentTickets: 0,
      },
      
      // 强化状态
      isRefining: false,
      failCount: 0,
      
      // 增幅状态
      isAugmenting: false,
      augmentHistory: [],
      
      // 打孔状态
      gemTypes: [],
      selectedSocketIndex: null,
      selectedGemType: null,
      
      // 继承状态
      sourceEquip: null,
      targetEquip: null,
      isInheriting: false,
      showEquipPicker: false,
      pickerMode: 'source',
      
      // 常量
      maxRefineLevel: 15,
      rarityNames: { 1: '凡品', 2: '良品', 3: '极品', 4: '仙品', 5: '神品' },
      gemStatNames: { atk: '攻击', def: '防御', crit: '暴击', hp: '生命' },
      
      // Toast
      toast: { show: false, message: '', type: 'success' },
    };
  },
  computed: {
    refineCost() {
      if (!this.selectedEquipment) return 0;
      return Math.floor(500 * Math.pow(1.5, this.selectedEquipment.refineLevel));
    },
    refineMaterialCount() {
      if (!this.selectedEquipment) return 0;
      return 1 + Math.floor(this.selectedEquipment.refineLevel / 3);
    },
    successRate() {
      if (!this.selectedEquipment) return 0;
      const level = this.selectedEquipment.refineLevel;
      if (level < 3) return 100;
      if (level < 7) return 80;
      if (level < 10) return 60;
      if (level < 13) return 40;
      return 20;
    },
    canRefine() {
      if (!this.selectedEquipment) return false;
      if (this.selectedEquipment.refineLevel >= this.maxRefineLevel) return false;
      if (this.playerData.spiritStones < this.refineCost) return false;
      if (this.playerData.refineStones < this.refineMaterialCount) return false;
      return true;
    },
    canQuickRefine() {
      if (!this.selectedEquipment) return false;
      if (this.selectedEquipment.refineLevel >= this.maxRefineLevel) return false;
      let totalCost = 0;
      let totalMaterial = 0;
      for (let i = this.selectedEquipment.refineLevel; i < this.maxRefineLevel; i++) {
        totalCost += Math.floor(500 * Math.pow(1.5, i));
        totalMaterial += 1 + Math.floor(i / 3);
      }
      return this.playerData.spiritStones >= totalCost && this.playerData.refineStones >= totalMaterial;
    },
    canAugment() {
      if (!this.augmentEquipment) return false;
      if (this.playerData.spiritStones < 5000) return false;
      if (this.playerData.augmentTickets < 1) return false;
      return true;
    },
    canInherit() {
      if (!this.sourceEquip || !this.targetEquip) return false;
      if (this.sourceEquip.refineLevel === 0 && 
          (!this.sourceEquip.augmentStats || (this.sourceEquip.augmentStats.atkBonus === 0 && this.sourceEquip.augmentStats.defBonus === 0 && this.sourceEquip.augmentStats.hpBonus === 0)) &&
          (!this.sourceEquip.socketCount || this.sourceEquip.socketCount === 0)) return false;
      if (this.playerData.spiritStones < 10000) return false;
      return true;
    },
  },
  async mounted() {
    await this.loadPlayerResources();
    await this.loadEquipments();
    await this.loadGemTypes();
  },
  methods: {
    // ===== 通用 =====
    showToast(message, type = 'success') {
      this.toast = { show: true, message, type };
      setTimeout(() => { this.toast.show = false; }, 2500);
    },
    formatTime(ts) {
      const d = new Date(ts);
      return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
    },
    getRefineBonus(type, level) {
      if (!this.selectedEquipment) return 0;
      const baseMap = { atk: 'baseAttack', def: 'baseDef', hp: 'baseHp' };
      const base = this.selectedEquipment[baseMap[type]] || 0;
      return Math.floor(base * 0.05 * level);
    },
    getSocketCost(index) {
      return Math.floor(1000 * Math.pow(2, index));
    },
    getGemIcon(gemType) {
      const map = { attack_gem: '💥', defense_gem: '🛡️', crit_gem: '⚡', hp_gem: '❤️' };
      return map[gemType] || '💎';
    },
    getGemName(gemType) {
      const map = { attack_gem: '攻击宝石', defense_gem: '防御宝石', crit_gem: '暴击宝石', hp_gem: '生命宝石' };
      return map[gemType] || gemType;
    },
    getGemStat(gemType) {
      const map = { attack_gem: 'atk', defense_gem: 'def', crit_gem: 'crit', hp_gem: 'hp' };
      return map[gemType] || 'atk';
    },
    getGemValue(gemType) {
      const map = { attack_gem: 15, defense_gem: 15, crit_gem: 5, hp_gem: 100 };
      return map[gemType] || 0;
    },

    // ===== 加载数据 =====
    async loadPlayerResources() {
      const res = await window.equipmentAPI.getPlayerResources(this.userId);
      if (res.success && res.player) {
        this.playerData = res.player;
      }
    },
    async loadEquipments() {
      this.loadingEquipments = true;
      const res = await window.equipmentAPI.getEquipmentList(this.userId);
      if (res.success && res.equipments) {
        this.playerEquipments = res.equipments;
      }
      this.loadingEquipments = false;
    },
    async loadGemTypes() {
      const res = await window.equipmentAPI.getGemTypes();
      if (res.success && res.gems) {
        this.gemTypes = res.gems;
      }
    },

    // ===== 强化 =====
    selectEquipment(equip) {
      this.selectedEquipment = { ...equip, sockets: equip.sockets || [null, null, null, null] };
    },
    async startRefine() {
      if (!this.canRefine) return;
      this.isRefining = true;
      const res = await window.equipmentAPI.refineEquipment(this.userId, this.selectedEquipment.id);
      this.isRefining = false;
      if (res.success) {
        this.selectedEquipment.refineLevel = res.level;
        this.playerData.spiritStones = res.remainingStones;
        this.playerData.refineStones = res.remainingRefineStones;
        this.failCount = 0;
        this.showToast(`强化成功！当前等级 +${res.level}`, 'success');
      } else {
        this.failCount = res.failCount || 0;
        this.showToast(res.message || '强化失败', 'error');
      }
    },
    async quickRefine() {
      if (!this.canQuickRefine) return;
      this.isRefining = true;
      let currentLevel = this.selectedEquipment.refineLevel;
      while (currentLevel < this.maxRefineLevel) {
        const res = await window.equipmentAPI.refineEquipment(this.userId, this.selectedEquipment.id);
        if (res.success) {
          currentLevel = res.level;
          this.selectedEquipment.refineLevel = res.level;
          this.playerData.spiritStones = res.remainingStones;
          this.playerData.refineStones = res.remainingRefineStones;
        } else {
          break;
        }
      }
      this.isRefining = false;
      this.failCount = 0;
      this.showToast(`一键强化完成！当前等级 +${this.selectedEquipment.refineLevel}`, 'success');
    },

    // ===== 增幅 =====
    async selectAugmentEquip(equip) {
      this.augmentEquipment = { ...equip };
      const detailRes = await window.equipmentAPI.getEquipmentDetail(equip.id);
      if (detailRes.success && detailRes.equipment) {
        this.augmentEquipment = { ...equip, sockets: detailRes.equipment.sockets };
      }
      const histRes = await window.equipmentAPI.getAugmentHistory(equip.id);
      if (histRes.success) {
        this.augmentHistory = histRes.history || [];
      }
    },
    async startAugment() {
      if (!this.canAugment) return;
      this.isAugmenting = true;
      const res = await window.equipmentAPI.augmentEquipment(this.userId, this.augmentEquipment.id);
      this.isAugmenting = false;
      if (res.success) {
        this.augmentEquipment.augmentStats = res.newAugment.total;
        this.playerData.spiritStones = res.remainingStones;
        this.playerData.augmentTickets = res.remainingTickets;
        this.showToast(res.message, 'success');
        if (res.history) this.augmentHistory = res.history;
      } else {
        this.showToast(res.message || '增幅失败', 'error');
      }
    },

    // ===== 打孔 =====
    async selectSocketEquip(equip) {
      this.selectedSocketIndex = null;
      this.selectedGemType = null;
      this.socketEquipment = { ...equip };
      const detailRes = await window.equipmentAPI.getEquipmentDetail(equip.id);
      if (detailRes.success && detailRes.equipment) {
        this.socketEquipment.sockets = detailRes.equipment.sockets;
        this.socketEquipment.baseAttack = detailRes.equipment.baseAttack;
        this.socketEquipment.baseDef = detailRes.equipment.baseDef;
        this.socketEquipment.baseHp = detailRes.equipment.baseHp;
      }
    },
    selectSocket(idx) {
      this.selectedSocketIndex = this.selectedSocketIndex === idx ? null : idx;
    },
    async addSocket() {
      if (!this.socketEquipment || (this.socketEquipment.socketCount || 0) >= 4) return;
      const res = await window.equipmentAPI.addSocket(this.userId, this.socketEquipment.id);
      if (res.success) {
        const detailRes = await window.equipmentAPI.getEquipmentDetail(this.socketEquipment.id);
        if (detailRes.success) {
          this.socketEquipment.sockets = detailRes.equipment.sockets;
          const eq = this.playerEquipments.find(e => e.id === this.socketEquipment.id);
          if (eq) eq.socketCount = detailRes.equipment.sockets.filter(s => s !== null).length;
        }
        this.playerData.spiritStones = res.remainingStones;
        this.showToast(res.message, 'success');
        await this.loadEquipments();
        await this.selectSocketEquip(this.playerEquipments.find(e => e.id === this.socketEquipment.id) || this.socketEquipment);
      } else {
        this.showToast(res.message || '打孔失败', 'error');
      }
    },
    async inlayGem() {
      if (this.selectedSocketIndex === null || !this.selectedGemType) return;
      const res = await window.equipmentAPI.inlayGem(
        this.userId, this.socketEquipment.id, this.selectedSocketIndex, this.selectedGemType
      );
      if (res.success) {
        this.socketEquipment.sockets = res.socketDetails.map(s => s.gemType);
        this.selectedSocketIndex = null;
        this.selectedGemType = null;
        this.showToast(res.message, 'success');
        await this.loadEquipments();
      } else {
        this.showToast(res.message || '镶嵌失败', 'error');
      }
    },
    async removeGem() {
      if (this.selectedSocketIndex === null) return;
      const res = await window.equipmentAPI.removeGem(this.userId, this.socketEquipment.id, this.selectedSocketIndex);
      if (res.success) {
        this.socketEquipment.sockets[this.selectedSocketIndex] = null;
        this.selectedSocketIndex = null;
        this.showToast(res.message, 'success');
        await this.loadEquipments();
      } else {
        this.showToast(res.message || '取下失败', 'error');
      }
    },

    // ===== 继承 =====
    openEquipSelector(mode) {
      this.pickerMode = mode;
      this.showEquipPicker = true;
    },
    async pickEquip(equip) {
      if (this.pickerMode === 'source') {
        this.sourceEquip = { ...equip };
      } else {
        if (equip.id === this.sourceEquip?.id) return;
        this.targetEquip = { ...equip };
      }
      this.showEquipPicker = false;
    },
    async startInherit() {
      if (!this.canInherit) return;
      this.isInheriting = true;
      const res = await window.equipmentAPI.inheritEquipment(this.userId, this.sourceEquip.id, this.targetEquip.id);
      this.isInheriting = false;
      if (res.success) {
        this.showToast('继承成功！', 'success');
        this.sourceEquip = res.sourceEquip;
        this.targetEquip = res.targetEquip;
        this.playerData.spiritStones = res.remainingStones;
        await this.loadEquipments();
      } else {
        this.showToast(res.message || '继承失败', 'error');
      }
    },
  },
};
</script>

<style scoped>
/* ========== 基础布局 ========== */
.enhancement-panel {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  color: #fff;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
}
.enhancement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.header-title { display: flex; align-items: center; gap: 10px; font-size: 24px; font-weight: bold; }
.title-icon { font-size: 28px; }
.close-btn {
  background: rgba(255,255,255,0.1); border: none; color: #fff;
  width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 18px; transition: all 0.3s;
}
.close-btn:hover { background: rgba(255,100,100,0.3); transform: rotate(90deg); }

/* ========== 标签页 ========== */
.enhancement-tabs { display: flex; gap: 10px; margin-bottom: 20px; }
.tab-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  color: #aaa; padding: 12px 20px; border-radius: 10px; cursor: pointer; transition: all 0.3s;
}
.tab-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
.tab-btn.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-color: transparent; color: #fff; }
.tab-icon { font-size: 18px; }

/* ========== Tab 内容 ========== */
.tab-content { min-height: 400px; }

/* ========== 装备选择 ========== */
.equipment-select { margin-bottom: 20px; }
.select-title { font-size: 14px; color: #aaa; margin-bottom: 12px; }
.equipment-list {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px; max-height: 220px; overflow-y: auto;
}
.equipment-card {
  display: flex; align-items: center; gap: 8px; padding: 10px;
  background: rgba(255,255,255,0.05); border: 2px solid transparent;
  border-radius: 10px; cursor: pointer; transition: all 0.3s;
}
.equipment-card:hover { background: rgba(255,255,255,0.1); }
.equipment-card.selected { border-color: #667eea; background: rgba(102,126,234,0.2); }
.equip-icon {
  width: 40px; height: 40px; border-radius: 8px; background: rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: center; font-size: 20px; border: 2px solid #aaa;
}
.equip-icon.rarity-1 { border-color: #aaa; } .equip-icon.rarity-2 { border-color: #4ecdc4; }
.equip-icon.rarity-3 { border-color: #9b59b6; } .equip-icon.rarity-4 { border-color: #f39c12; }
.equip-icon.rarity-5 { border-color: #ff6b6b; } .equip-icon.small { width: 36px; height: 36px; font-size: 16px; }
.equip-info { flex: 1; min-width: 0; }
.equip-name { font-size: 12px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.equip-level { font-size: 11px; color: #ffd700; display: flex; align-items: center; gap: 4px; }
.equip-sockets-mini { font-size: 10px; color: #4ecdc4; }
.socket-count-badge { background: rgba(78,205,196,0.2); padding: 1px 4px; border-radius: 4px; font-size: 10px; }
.equip-select-btn { color: #4ecdc4; font-size: 18px; }
.loading-placeholder { text-align: center; padding: 40px; color: #aaa; }

/* ========== 精炼界面 ========== */
.refine-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.refine-preview, .augment-preview, .socket-preview {
  background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px;
}
.preview-equip { text-align: center; margin-bottom: 15px; }
.preview-icon {
  width: 80px; height: 80px; margin: 0 auto 10px; border-radius: 12px;
  background: rgba(255,255,255,0.1); display: flex; align-items: center;
  justify-content: center; font-size: 40px; border: 3px solid #aaa;
}
.preview-icon.rarity-1 { border-color: #aaa; } .preview-icon.rarity-2 { border-color: #4ecdc4; }
.preview-icon.rarity-3 { border-color: #9b59b6; } .preview-icon.rarity-4 { border-color: #f39c12; }
.preview-icon.rarity-5 { border-color: #ff6b6b; }
.preview-name { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
.preview-rarity { font-size: 12px; color: #aaa; margin-bottom: 8px; }
.preview-level { display: flex; flex-direction: column; gap: 4px; }
.level-label { font-size: 12px; color: #aaa; }
.level-value { font-size: 28px; font-weight: bold; color: #ffd700; }

/* ========== 属性展示 ========== */
.attrs-section { margin-bottom: 15px; }
.attrs-title, .effect-title, .augment-title, .history-title, .inherit-title, .preview-title, .sockets-title, .inlay-title, .cost-title {
  font-size: 13px; color: #aaa; margin-bottom: 10px;
}
.attr-row, .augment-stat-row {
  display: flex; align-items: center; gap: 8px; padding: 6px 10px;
  background: rgba(255,255,255,0.05); border-radius: 6px; margin-bottom: 6px; font-size: 13px;
}
.attr-icon, .stat-icon { font-size: 14px; }
.attr-label, .stat-label { flex: 1; color: #ccc; }
.attr-base { color: #fff; }
.attr-refine { color: #4ecdc4; }
.effect-item {
  display: flex; justify-content: space-between; padding: 8px 12px;
  background: rgba(255,255,255,0.05); border-radius: 6px; margin-bottom: 6px; font-size: 13px;
}
.effect-bonus { color: #4ecdc4; font-weight: bold; }

/* ========== 升级预览 ========== */
.upgrade-preview {
  text-align: center; padding: 12px; background: rgba(102,126,234,0.1);
  border-radius: 8px; border: 1px dashed rgba(102,126,234,0.3); margin-bottom: 10px;
}
.preview-label { font-size: 12px; color: #aaa; }
.preview-arrow { font-size: 18px; margin: 6px 0; }
.preview-result { display: flex; flex-direction: column; gap: 4px; }
.result-level { font-size: 20px; font-weight: bold; color: #ffd700; }
.result-bonus { font-size: 12px; color: #4ecdc4; }
.max-level-notice { text-align: center; padding: 12px; background: rgba(255,215,0,0.1); border-radius: 8px; color: #ffd700; font-size: 13px; }

/* ========== 强化操作 ========== */
.refine-operation, .augment-operation, .socket-operation {
  display: flex; flex-direction: column; gap: 12px;
}
.operation-cost { background: rgba(0,0,0,0.3); border-radius: 10px; padding: 15px; }
.cost-item { display: flex; align-items: center; gap: 6px; padding: 5px 0; font-size: 13px; flex-wrap: wrap; }
.cost-icon { font-size: 16px; }
.cost-label { color: #aaa; }
.cost-value { color: #ffd700; font-weight: bold; }
.cost-value.insufficient { color: #ff4757; }
.cost-remaining { color: #888; font-size: 11px; }

.success-rate { background: rgba(0,0,0,0.3); border-radius: 10px; padding: 15px; }
.rate-label { font-size: 13px; color: #aaa; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
.guaranteed-tag { background: rgba(255,100,0,0.3); padding: 2px 8px; border-radius: 10px; color: #ff6b00; font-size: 11px; }
.rate-bar { height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden; margin-bottom: 8px; }
.rate-fill { height: 100%; border-radius: 5px; transition: width 0.3s; }
.rate-fill.high { background: linear-gradient(90deg, #4ecdc4, #44a08d); }
.rate-fill.medium { background: linear-gradient(90deg, #f39c12, #f1c40f); }
.rate-fill.low { background: linear-gradient(90deg, #e74c3c, #c0392b); }
.rate-value { text-align: center; font-size: 18px; font-weight: bold; color: #4ecdc4; }
.fail-hint { text-align: center; font-size: 11px; color: #e74c3c; margin-top: 4px; }

.refine-btn, .augment-btn, .add-socket-btn, .transfer-btn {
  width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none; border-radius: 10px; color: #fff; font-size: 15px; font-weight: bold;
  cursor: pointer; transition: all 0.3s;
}
.refine-btn:hover:not(:disabled), .augment-btn:hover:not(:disabled),
.add-socket-btn:hover:not(:disabled), .transfer-btn:hover:not(:disabled) {
  transform: translateY(-2px); box-shadow: 0 4px 20px rgba(102,126,234,0.4);
}
.refine-btn:disabled, .augment-btn:disabled, .add-socket-btn:disabled, .transfer-btn:disabled {
  opacity: 0.5; cursor: not-allowed;
}
.refine-btn.can-refine, .augment-btn.can-augment { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.refine-btn.refining, .augment-btn.augmenting { background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%); }
.refine-text, .augment-text { display: flex; align-items: center; justify-content: center; gap: 8px; }
.refine-loader { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.quick-refine-btn {
  width: 100%; padding: 11px; background: rgba(255,215,0,0.1);
  border: 1px solid rgba(255,215,0,0.3); border-radius: 8px;
  color: #ffd700; font-size: 13px; cursor: pointer; transition: all 0.3s;
}
.quick-refine-btn:hover:not(:disabled) { background: rgba(255,215,0,0.2); }
.quick-refine-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ========== 增幅界面 ========== */
.augment-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.augment-stats { margin-bottom: 15px; }
.stat-value.red { color: #ff4757; font-weight: bold; font-size: 16px; }
.augment-history { margin-top: 10px; }
.history-list { max-height: 120px; overflow-y: auto; }
.history-item {
  display: flex; align-items: center; gap: 8px; padding: 5px 8px;
  background: rgba(255,255,255,0.03); border-radius: 6px; margin-bottom: 4px; font-size: 12px;
}
.history-stat { color: #aaa; flex: 1; }
.history-bonus { color: #ff4757; font-weight: bold; }
.history-time { color: #666; }
.no-history { text-align: center; color: #666; font-size: 12px; padding: 10px; }

.augment-preview-effect {
  background: rgba(0,0,0,0.3); border-radius: 10px; padding: 15px; text-align: center;
}
.effect-hint { font-size: 12px; color: #aaa; margin-bottom: 10px; }
.possible-stats { display: flex; justify-content: center; gap: 15px; }
.possible-stat { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 12px; color: #ccc; }
.stat-range { color: #ff4757; font-weight: bold; font-size: 13px; }

/* ========== 打孔界面 ========== */
.socket-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.sockets-display { margin-bottom: 15px; }
.socket-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.socket-slot {
  border: 2px dashed rgba(255,255,255,0.2); border-radius: 10px; padding: 12px;
  display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; transition: all 0.3s;
  min-height: 80px; justify-content: center;
}
.socket-slot:hover { border-color: #667eea; }
.socket-slot.filled { border-style: solid; border-color: #4ecdc4; background: rgba(78,205,196,0.1); }
.socket-slot.selectable { border-color: #f39c12; box-shadow: 0 0 10px rgba(243,156,18,0.3); }
.socket-empty-icon { font-size: 24px; color: #555; }
.socket-empty-text { font-size: 11px; color: #555; }
.socket-gem-icon { font-size: 24px; }
.socket-gem-name { font-size: 11px; color: #4ecdc4; }

.inlay-section { margin-top: 10px; }
.gem-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 10px; }
.gem-card {
  background: rgba(255,255,255,0.05); border: 2px solid transparent; border-radius: 8px;
  padding: 10px; cursor: pointer; transition: all 0.3s; display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.gem-card:hover { background: rgba(255,255,255,0.1); }
.gem-card.selected { border-color: #f39c12; background: rgba(243,156,18,0.2); }
.gem-icon { font-size: 20px; }
.gem-name { font-size: 11px; color: #ccc; }
.gem-value { font-size: 10px; color: #4ecdc4; }
.inlay-btn, .remove-gem-btn {
  width: 100%; padding: 11px; background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
  border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: bold; cursor: pointer; margin-bottom: 8px;
}
.inlay-btn:disabled, .remove-gem-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.remove-gem-btn { background: rgba(255,71,87,0.2); border: 1px solid rgba(255,71,87,0.3); }

.socket-cost-info { background: rgba(0,0,0,0.3); border-radius: 10px; padding: 15px; margin-bottom: 10px; }
.socket-cost-list { display: flex; flex-direction: column; gap: 6px; }
.socket-cost-item {
  display: flex; align-items: center; gap: 8px; padding: 6px 10px;
  background: rgba(255,255,255,0.03); border-radius: 6px; font-size: 12px;
}
.socket-cost-item.next { background: rgba(243,156,18,0.1); border: 1px solid rgba(243,156,18,0.3); }
.socket-cost-item.used { opacity: 0.6; }
.socket-num { color: #aaa; width: 50px; }
.socket-price { flex: 1; color: #ffd700; }
.socket-status { font-size: 11px; padding: 1px 6px; border-radius: 10px; }
.socket-status.next { background: rgba(243,156,18,0.3); color: #f39c12; }
.socket-status.locked { background: rgba(255,255,255,0.1); color: #666; }

.attr-preview-section {
  background: rgba(78,205,196,0.1); border-radius: 10px; padding: 12px; border: 1px solid rgba(78,205,196,0.2);
}
.preview-gem-attr { display: flex; align-items: center; gap: 8px; justify-content: center; font-size: 13px; }
.gem-stat { color: #4ecdc4; font-weight: bold; }

/* ========== 继承界面 ========== */
.transfer-container { max-width: 500px; margin: 0 auto; }
.transfer-info { text-align: center; margin-bottom: 20px; }
.transfer-title { font-size: 22px; font-weight: bold; margin-bottom: 8px; }
.transfer-desc { font-size: 13px; color: #aaa; line-height: 1.6; }
.transfer-slots { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 15px; }
.transfer-slot { text-align: center; }
.slot-label { font-size: 12px; color: #aaa; margin-bottom: 8px; }
.slot-equip {
  width: 100px; height: 100px; border: 2px dashed rgba(255,255,255,0.2); border-radius: 10px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.3s; gap: 4px;
}
.slot-equip.selectable:hover { border-color: #667eea; }
.slot-equip.filled { border-style: solid; background: rgba(255,255,255,0.05); }
.slot-placeholder { font-size: 28px; color: #555; }
.slot-hint { font-size: 10px; color: #555; }
.equip-name-sm { font-size: 11px; color: #ccc; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.equip-augment { font-size: 10px; color: #ff4757; }
.transfer-arrow { font-size: 24px; }
.inherit-preview {
  background: rgba(0,0,0,0.3); border-radius: 10px; padding: 15px; margin-bottom: 15px;
}
.inherit-items { display: flex; flex-direction: column; gap: 6px; }
.inherit-item { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 8px; background: rgba(255,255,255,0.03); border-radius: 6px; }
.inherit-arrow { color: #4ecdc4; }

/* ========== 装备选择弹窗 ========== */
.equip-picker-modal {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.picker-dialog {
  background: #1a1a2e; border-radius: 16px; padding: 20px; width: 500px; max-height: 70vh;
  display: flex; flex-direction: column;
}
.picker-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-size: 16px; font-weight: bold; }
.picker-close { background: none; border: none; color: #aaa; cursor: pointer; font-size: 18px; }
.picker-close:hover { color: #fff; }
.picker-list { overflow-y: auto; max-height: 400px; }
.picker-item {
  display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 8px;
  cursor: pointer; transition: background 0.2s; margin-bottom: 4px;
}
.picker-item:hover { background: rgba(255,255,255,0.05); }
.picker-item.disabled { opacity: 0.3; cursor: not-allowed; }
.picker-info { flex: 1; }
.picker-name { font-size: 13px; font-weight: bold; }
.picker-detail { font-size: 11px; color: #aaa; }

/* ========== 结果提示 ========== */
.result-toast {
  position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
  padding: 12px 24px; border-radius: 30px; font-size: 14px; font-weight: bold;
  z-index: 9999; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}
.result-toast.success { background: linear-gradient(135deg, #4ecdc4, #44a08d); color: #fff; }
.result-toast.error { background: linear-gradient(135deg, #e74c3c, #c0392b); color: #fff; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(20px); }
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-20px); }

/* ========== 玩家资源 ========== */
.player-resources {
  display: flex; justify-content: center; gap: 30px; margin-top: 20px;
  padding: 15px; background: rgba(0,0,0,0.2); border-radius: 10px;
}
.resource-item { display: flex; align-items: center; gap: 8px; }
.resource-icon { font-size: 18px; }
.resource-value { font-size: 16px; font-weight: bold; color: #ffd700; }

/* ========== 无选中 ========== */
.no-selection { text-align: center; padding: 60px 20px; }
.no-selection-icon { font-size: 48px; opacity: 0.3; margin-bottom: 10px; }
.no-selection-text { font-size: 14px; color: #aaa; }

/* ========== 响应式 ========== */
@media (max-width: 700px) {
  .refine-container, .augment-container, .socket-container { grid-template-columns: 1fr; }
  .equipment-list { grid-template-columns: 1fr 1fr; }
  .enhancement-tabs { flex-wrap: wrap; }
  .tab-btn { min-width: calc(50% - 5px); }
  .transfer-slots { flex-direction: column; }
  .transfer-arrow { transform: rotate(90deg); }
}
</style>