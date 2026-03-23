<template>
  <div class="alchemy-panel">
    <div class="panel-header">
      <h2>🔥 炼丹系统</h2>
      <button class="close-btn" @click="close">×</button>
    </div>

    <div class="panel-content">
      <!-- 炼丹炉展示区 -->
      <div class="furnace-showcase">
        <div class="furnace-stage">
          <div class="furnace-glow" :class="furnaceStateClass"></div>
          <div class="furnace-model" :class="{ burning: isBurning }">
            <div class="furnace-body">
              <div class="furnace-rim"></div>
              <div class="furnace-core">
                <div class="furnace-flame" v-if="isBurning">
                  <div class="flame-layer layer-1"></div>
                  <div class="flame-layer layer-2"></div>
                  <div class="flame-layer layer-3"></div>
                </div>
                <div class="furnace-idle" v-else>🔥</div>
              </div>
            </div>
            <div class="furnace-particles">
              <div v-for="n in 8" :key="n" class="furnace-particle"></div>
            </div>
          </div>
        </div>

        <div class="furnace-info" v-if="furnace">
          <h3>{{ furnace.name }}</h3>
          <div class="furnace-level">等级 {{ furnace.level }} / {{ maxFurnaceLevel }}</div>
          <div class="furnace-quality" :class="furnace.quality">{{ furnace.qualityText }}</div>
        </div>
      </div>

      <!-- 功能标签页 -->
      <div class="alchemy-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.name }}</span>
        </button>
      </div>

      <!-- 炼制丹药 -->
      <div v-if="activeTab === 'refine'" class="tab-content">
        <!-- 已选丹方预览 -->
        <div class="recipe-preview" v-if="selectedRecipe">
          <div class="recipe-header">
            <span class="recipe-icon">{{ selectedRecipe.icon }}</span>
            <div class="recipe-info">
              <span class="recipe-name">{{ selectedRecipe.name }}</span>
              <span class="recipe-grade">{{ selectedRecipe.grade }}</span>
            </div>
            <button class="clear-btn" @click="selectedRecipe = null">✕</button>
          </div>
          <div class="recipe-materials">
            <span class="materials-label">所需材料:</span>
            <div class="material-cost-list">
              <div
                v-for="mat in selectedRecipe.materials"
                :key="mat.id"
                class="cost-item"
                :class="{ enough: getMaterialCount(mat.id) >= mat.count }"
              >
                <span class="cost-icon">{{ mat.icon }}</span>
                <span class="cost-name">{{ mat.name }}</span>
                <span class="cost-count">{{ getMaterialCount(mat.id) }}/{{ mat.count }}</span>
              </div>
            </div>
          </div>
          <div class="recipe-result">
            <span class="result-label">预计产出:</span>
            <span class="result-icon">{{ selectedRecipe.resultIcon }}</span>
            <span class="result-name">{{ selectedRecipe.resultName }}</span>
            <span class="result-count">x{{ selectedRecipe.resultCount }}</span>
          </div>
          <button
            class="refine-btn"
            :disabled="!canRefine"
            @click="refinePill"
          >
            ✨ 开始炼制
          </button>
        </div>

        <!-- 丹方列表 -->
        <div class="recipe-list">
          <h3>可炼制丹方</h3>
          <div class="recipe-grid">
            <div
              v-for="recipe in knownRecipes"
              :key="recipe.id"
              class="recipe-card"
              :class="{
                selected: selectedRecipe?.id === recipe.id,
                locked: !canCraftRecipe(recipe)
              }"
              @click="selectRecipe(recipe)"
            >
              <div class="recipe-card-icon">{{ recipe.icon }}</div>
              <div class="recipe-card-name">{{ recipe.name }}</div>
              <div class="recipe-card-grade">{{ recipe.grade }}</div>
              <div v-if="!canCraftRecipe(recipe)" class="recipe-locked-overlay">材料不足</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 丹方学习 -->
      <div v-if="activeTab === 'study'" class="tab-content">
        <div class="study-section">
          <h3>已掌握丹方</h3>
          <div class="study-grid">
            <div
              v-for="recipe in knownRecipes"
              :key="recipe.id"
              class="study-card known"
              @click="showRecipeDetail(recipe)"
            >
              <div class="study-icon">{{ recipe.icon }}</div>
              <div class="study-name">{{ recipe.name }}</div>
              <div class="study-grade">{{ recipe.grade }}</div>
            </div>
          </div>
        </div>

        <div class="study-section">
          <h3>可学习丹方</h3>
          <div class="study-grid">
            <div
              v-for="recipe in learnableRecipes"
              :key="recipe.id"
              class="study-card learnable"
              :class="{ affordable: canLearnRecipe(recipe) }"
              @click="learnRecipe(recipe)"
            >
              <div class="study-icon">{{ recipe.icon }}</div>
              <div class="study-name">{{ recipe.name }}</div>
              <div class="study-grade">{{ recipe.grade }}</div>
              <div class="study-cost">
                <span>{{ recipe.learnCost }} 灵石</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 炼丹炉升级 -->
      <div v-if="activeTab === 'upgrade'" class="tab-content">
        <div class="furnace-detail">
          <div class="furnace-detail-header">
            <div class="furnace-detail-icon">🔥</div>
            <div class="furnace-detail-info">
              <h3>{{ furnace.name }}</h3>
              <div class="furnace-detail-level">等级 {{ furnace.level }}</div>
            </div>
          </div>

          <div class="furnace-attrs">
            <div class="attr-item">
              <span class="attr-label">炼丹成功率</span>
              <span class="attr-value">+{{ furnace.successRate }}%</span>
            </div>
            <div class="attr-item">
              <span class="attr-label">炼制速度</span>
              <span class="attr-value">{{ furnace.speed }}秒</span>
            </div>
            <div class="attr-item">
              <span class="attr-label">品质加成</span>
              <span class="attr-value">+{{ furnace.qualityBonus }}%</span>
            </div>
          </div>

          <div class="furnace-upgrade-section">
            <div class="upgrade-preview" v-if="nextFurnace">
              <span class="upgrade-arrow">➡️</span>
              <div class="upgrade-next">
                <div class="upgrade-next-icon">🔥</div>
                <div class="upgrade-next-name">{{ nextFurnace.name }}</div>
                <div class="upgrade-next-level">Lv.{{ nextFurnace.level }}</div>
              </div>
            </div>

            <div class="upgrade-requirements" v-if="nextFurnace">
              <div class="req-item" v-for="req in nextFurnace.requirements" :key="req.id">
                <span class="req-icon">{{ req.icon }}</span>
                <span class="req-name">{{ req.name }}</span>
                <span class="req-count" :class="{ enough: getMaterialCount(req.id) >= req.count }">
                  {{ getMaterialCount(req.id) }}/{{ req.count }}
                </span>
              </div>
            </div>

            <button
              class="upgrade-btn"
              :disabled="!canUpgradeFurnace"
              @click="upgradeFurnace"
            >
              🔨 升级炼丹炉
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 炼制结果弹窗 -->
    <div v-if="showResult" class="result-overlay" @click="showResult = false">
      <div class="result-modal" @click.stop>
        <div class="result-title" :class="refineResult.success ? 'success' : 'fail'">
          {{ refineResult.success ? '炼制成功!' : '炼制失败' }}
        </div>
        <div class="result-content">
          <div class="result-icon">{{ refineResult.icon }}</div>
          <div class="result-name">{{ refineResult.name }}</div>
          <div class="result-count" v-if="refineResult.count">x{{ refineResult.count }}</div>
          <div class="result-quality" v-if="refineResult.quality">品质: {{ refineResult.quality }}</div>
        </div>
        <button class="confirm-btn" @click="showResult = false">确定</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AlchemyPanel',
  emits: ['close'],
  data() {
    return {
      activeTab: 'refine',
      selectedRecipe: null,
      showResult: false,
      refineResult: {},
      isBurning: false,
      tabs: [
        { id: 'refine', name: '炼制', icon: '⚗️' },
        { id: 'study', name: '丹方', icon: '📜' },
        { id: 'upgrade', name: '炉鼎', icon: '🔥' }
      ],
      furnace: {
        id: 1,
        name: '紫焰炼丹炉',
        level: 3,
        quality: 'rare',
        qualityText: '稀有品质',
        successRate: 15,
        speed: 8,
        qualityBonus: 10
      },
      maxFurnaceLevel: 10,
      materials: [
        { id: 1, name: '灵草', icon: '🌿', count: 20 },
        { id: 2, name: '火焰草', icon: '🔥', count: 8 },
        { id: 3, name: '寒冰莲', icon: '❄️', count: 5 },
        { id: 4, name: '妖兽内丹', icon: '💎', count: 3 },
        { id: 5, name: '天外神铁', icon: '⭐', count: 1 },
        { id: 6, name: '千年灵芝', icon: '🍄', count: 12 },
        { id: 7, name: '雷劫精华', icon: '⚡', count: 0 },
        { id: 8, name: '凤凰血', icon: '🩸', count: 0 },
      ],
      allRecipes: [
        { id: 1, name: '回灵丹', icon: '💊', grade: '普通', resultIcon: '💊', resultName: '回灵丹', resultCount: 1, materials: [{ id: 1, name: '灵草', icon: '🌿', count: 5 }], successRate: 80, learnCost: 100 },
        { id: 2, name: '筑基丹', icon: '💊', grade: '稀有', resultIcon: '💊', resultName: '筑基丹', resultCount: 1, materials: [{ id: 1, name: '灵草', icon: '🌿', count: 10 }, { id: 2, name: '火焰草', icon: '🔥', count: 3 }], successRate: 60, learnCost: 500 },
        { id: 3, name: '破境丹', icon: '💊', grade: '史诗', resultIcon: '💊', resultName: '破境丹', resultCount: 1, materials: [{ id: 2, name: '火焰草', icon: '🔥', count: 5 }, { id: 3, name: '寒冰莲', icon: '❄️', count: 3 }, { id: 4, name: '妖兽内丹', icon: '💎', count: 2 }], successRate: 40, learnCost: 2000 },
        { id: 4, name: '九转金丹', icon: '💊', grade: '传说', resultIcon: '💊', resultName: '九转金丹', resultCount: 1, materials: [{ id: 5, name: '天外神铁', icon: '⭐', count: 1 }, { id: 4, name: '妖兽内丹', icon: '💎', count: 5 }, { id: 6, name: '千年灵芝', icon: '🍄', count: 8 }], successRate: 20, learnCost: 5000 },
        { id: 5, name: '凝神丹', icon: '💊', grade: '普通', resultIcon: '💊', resultName: '凝神丹', resultCount: 2, materials: [{ id: 1, name: '灵草', icon: '🌿', count: 3 }], successRate: 85, learnCost: 50 },
        { id: 6, name: '天雷丹', icon: '💊', grade: '传说', resultIcon: '💊', resultName: '天雷丹', resultCount: 1, materials: [{ id: 7, name: '雷劫精华', icon: '⚡', count: 3 }, { id: 8, name: '凤凰血', icon: '🩸', count: 1 }], successRate: 15, learnCost: 8000 },
      ],
      knownRecipeIds: [1, 2, 5],
      furnaceUpgrades: {
        4: { name: '赤焰炼丹炉', level: 4, requirements: [{ id: 2, name: '火焰草', icon: '🔥', count: 10 }, { id: 4, name: '妖兽内丹', icon: '💎', count: 5 }] },
        5: { name: '金纹炼丹炉', level: 5, requirements: [{ id: 5, name: '天外神铁', icon: '⭐', count: 3 }, { id: 6, name: '千年灵芝', icon: '🍄', count: 15 }] }
      }
    }
  },
  computed: {
    knownRecipes() {
      return this.allRecipes.filter(r => this.knownRecipeIds.includes(r.id))
    },
    learnableRecipes() {
      return this.allRecipes.filter(r => !this.knownRecipeIds.includes(r.id))
    },
    nextFurnace() {
      const nextLevel = this.furnace.level + 1
      if (nextLevel > this.maxFurnaceLevel) return null
      return this.furnaceUpgrades[nextLevel] || {
        name: `Lv.${nextLevel} 炼丹炉`,
        level: nextLevel,
        requirements: [{ id: 4, name: '妖兽内丹', icon: '💎', count: nextLevel * 3 }, { id: 5, name: '天外神铁', icon: '⭐', count: nextLevel }]
      }
    },
    canRefine() {
      if (!this.selectedRecipe) return false
      return this.selectedRecipe.materials.every(mat => this.getMaterialCount(mat.id) >= mat.count)
    },
    canUpgradeFurnace() {
      if (!this.nextFurnace) return false
      return this.nextFurnace.requirements.every(req => this.getMaterialCount(req.id) >= req.count)
    },
    furnaceStateClass() {
      if (this.isBurning) return 'burning'
      if (!this.nextFurnace) return 'max'
      return 'idle'
    }
  },
  methods: {
    close() { this.$emit('close') },
    getMaterialCount(id) {
      const mat = this.materials.find(m => m.id === id)
      return mat ? mat.count : 0
    },
    selectRecipe(recipe) {
      if (this.knownRecipeIds.includes(recipe.id)) {
        this.selectedRecipe = this.selectedRecipe?.id === recipe.id ? null : recipe
      }
    },
    canCraftRecipe(recipe) {
      if (!this.knownRecipeIds.includes(recipe.id)) return false
      return recipe.materials.every(mat => this.getMaterialCount(mat.id) >= mat.count)
    },
    canLearnRecipe(recipe) { return true },
    async refinePill() {
      if (!this.canRefine || !this.selectedRecipe) return
      this.selectedRecipe.materials.forEach(mat => {
        const m = this.materials.find(x => x.id === mat.id)
        if (m) m.count -= mat.count
      })
      this.isBurning = true
      this.selectedRecipe = { ...this.selectedRecipe }
      setTimeout(async () => {
        this.isBurning = false
        const baseRate = this.selectedRecipe.successRate + this.furnace.successRate
        const roll = Math.random() * 100
        const success = roll < baseRate
        if (success) {
          const qualityList = ['普通', '优良', '精品', '极品']
          const qualityIdx = Math.floor(Math.random() * qualityList.length)
          this.refineResult = { success: true, icon: this.selectedRecipe.resultIcon, name: this.selectedRecipe.resultName, count: this.selectedRecipe.resultCount, quality: qualityList[qualityIdx] }
        } else {
          this.refineResult = { success: false, icon: '💨', name: '炼制失败，材料化为灰烬', count: 0, quality: '' }
        }
        this.showResult = true
      }, 2000)
    },
    showRecipeDetail(recipe) {
      alert(`${recipe.name}\n${recipe.grade}\n成功率: ${recipe.successRate + this.furnace.successRate}%`)
    },
    async learnRecipe(recipe) {
      if (!this.knownRecipeIds.includes(recipe.id)) {
        this.knownRecipeIds.push(recipe.id)
        if (typeof showToast === 'function') showToast(`${recipe.name} 学习成功!`, 'success')
      }
    },
    async upgradeFurnace() {
      if (!this.canUpgradeFurnace) return
      const reqs = this.nextFurnace.requirements
      reqs.forEach(req => {
        const m = this.materials.find(x => x.id === req.id)
        if (m) m.count -= req.count
      })
      this.furnace.level++
      if (typeof showToast === 'function') showToast(`炼丹炉升级至 Lv.${this.furnace.level}!`, 'success')
    }
  }
}
</script>

<style scoped>
.alchemy-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 680px;
  max-height: 85vh;
  background: linear-gradient(135deg, #1a0a2e 0%, #0f0f23 100%);
  border-radius: 16px;
  border: 2px solid #ff6b35;
  box-shadow: 0 0 40px rgba(255, 107, 53, 0.3);
  z-index: 1000;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(90deg, #ff6b35, #ff4500);
  color: #fff;
}

.panel-header h2 { margin: 0; font-size: 20px; font-weight: bold; }
.close-btn { background: none; border: none; color: rgba(255,255,255,0.8); font-size: 28px; cursor: pointer; line-height: 1; }
.close-btn:hover { color: #fff; }

.panel-content { padding: 20px; max-height: calc(85vh - 60px); overflow-y: auto; }

.furnace-showcase { text-align: center; margin-bottom: 20px; }
.furnace-stage { position: relative; width: 180px; height: 180px; margin: 0 auto 12px; }
.furnace-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 160px; height: 160px; border-radius: 50%; transition: all 0.5s; }
.furnace-glow.idle { background: radial-gradient(circle, rgba(255,107,53,0.2) 0%, transparent 70%); }
.furnace-glow.burning { background: radial-gradient(circle, rgba(255,69,0,0.5) 0%, transparent 70%); animation: furnaceGlowPulse 0.5s ease-in-out infinite; }
.furnace-glow.max { background: radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%); }
@keyframes furnaceGlowPulse { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.15); } }

.furnace-model { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 120px; height: 140px; display: flex; flex-direction: column; align-items: center; }
.furnace-body { width: 100px; height: 100px; position: relative; }
.furnace-rim { position: absolute; top: 0; left: -5px; right: -5px; height: 20px; background: linear-gradient(135deg, #8B4513, #5c2d0e); border-radius: 8px 8px 0 0; border: 2px solid #ffd700; box-shadow: 0 0 10px rgba(255,215,0,0.3); }
.furnace-core { position: absolute; top: 20px; left: 10px; right: 10px; bottom: 0; background: linear-gradient(135deg, #4a1a00, #2a0a00); border-radius: 0 0 8px 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 2px solid #8B4513; }
.furnace-idle { font-size: 36px; animation: furnaceIdle 2s ease-in-out infinite; }
@keyframes furnaceIdle { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } }

.furnace-flame { position: relative; width: 60px; height: 60px; }
.flame-layer { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; animation: flicker 0.5s ease-in-out infinite alternate; }
.layer-1 { width: 30px; height: 50px; background: linear-gradient(to top, #ff4500, #ff8c00, #ffd700); }
.layer-2 { width: 20px; height: 40px; background: linear-gradient(to top, #ff6b35, #ffa500); animation-delay: 0.1s; }
.layer-3 { width: 12px; height: 30px; background: linear-gradient(to top, #ffd700, #ffff00); animation-delay: 0.2s; }
@keyframes flicker { 0% { transform: translateX(-50%) scaleY(0.9) scaleX(1); } 100% { transform: translateX(-50%) scaleY(1.1) scaleX(0.9); } }

.furnace-particles { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 120px; height: 120px; }
.furnace-particle { position: absolute; width: 4px; height: 4px; background: #ff6b35; border-radius: 50%; animation: particleRise 2s ease-in-out infinite; opacity: 0; }
.furnace-particle:nth-child(1) { left: 30%; animation-delay: 0s; }
.furnace-particle:nth-child(2) { left: 40%; animation-delay: 0.2s; }
.furnace-particle:nth-child(3) { left: 50%; animation-delay: 0.4s; }
.furnace-particle:nth-child(4) { left: 60%; animation-delay: 0.6s; }
.furnace-particle:nth-child(5) { left: 70%; animation-delay: 0.8s; }
.furnace-particle:nth-child(6) { left: 35%; animation-delay: 1s; }
.furnace-particle:nth-child(7) { left: 55%; animation-delay: 1.2s; }
.furnace-particle:nth-child(8) { left: 65%; animation-delay: 1.4s; }
@keyframes particleRise { 0% { bottom: 20px; opacity: 0; transform: translateX(0); } 20% { opacity: 1; } 80% { opacity: 0.6; } 100% { bottom: 100px; opacity: 0; transform: translateX(10px); } }

.furnace-info h3 { color: #ff8c00; margin: 0 0 4px 0; font-size: 20px; }
.furnace-level { color: #aaa; font-size: 13px; margin-bottom: 4px; }
.furnace-quality { display: inline-block; padding: 2px 12px; border-radius: 10px; font-size: 12px; font-weight: bold; }
.furnace-quality.传说 { background: linear-gradient(90deg, #ffd700, #ff8c00); color: #1a1a2e; }
.furnace-quality.史诗 { background: linear-gradient(90deg, #9b59b6, #8e44ad); color: white; }
.furnace-quality.稀有 { background: linear-gradient(90deg, #3498db, #2980b9); color: white; }
.furnace-quality.普通 { background: linear-gradient(90deg, #7f8c8d, #95a5a6); color: white; }

.alchemy-tabs { display: flex; gap: 8px; margin-bottom: 16px; background: #1a0a2e; padding: 6px; border-radius: 10px; }
.tab-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border: none; border-radius: 8px; background: transparent; color: #aaa; cursor: pointer; font-size: 14px; transition: all 0.3s; }
.tab-btn.active { background: linear-gradient(135deg, #ff6b35, #ff4500); color: #fff; box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4); }
.tab-btn:hover:not(.active) { background: rgba(255, 107, 53, 0.15); color: #ff8c00; }
.tab-icon { font-size: 16px; }

.tab-content { min-height: 200px; }

.recipe-preview { background: #2a1a0e; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid rgba(255, 107, 53, 0.3); }
.recipe-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.recipe-icon { font-size: 36px; }
.recipe-info { flex: 1; }
.recipe-name { display: block; color: #ffd700; font-size: 18px; font-weight: bold; }
.recipe-grade { color: #aaa; font-size: 12px; }
.clear-btn { background: none; border: none; color: #666; font-size: 18px; cursor: pointer; }
.clear-btn:hover { color: #fff; }

.recipe-materials { margin-bottom: 12px; }
.materials-label { font-size: 12px; color: #888; display: block; margin-bottom: 8px; }
.material-cost-list { display: flex; flex-wrap: wrap; gap: 6px; }
.cost-item { display: flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: 6px; font-size: 12px; }
.cost-item .cost-icon { font-size: 14px; }
.cost-item .cost-name { color: #ccc; }
.cost-item .cost-count { color: #ef4444; font-weight: bold; }
.cost-item.enough .cost-count { color: #22c55e; }

.recipe-result { display: flex; align-items: center; gap: 8px; background: rgba(255, 215, 0, 0.1); padding: 8px 12px; border-radius: 8px; margin-bottom: 12px; }
.result-label { font-size: 12px; color: #888; }
.result-icon { font-size: 24px; }
.result-name { color: #ffd700; font-size: 14px; font-weight: bold; }
.result-count { color: #22c55e; font-size: 14px; font-weight: bold; }

.refine-btn { width: 100%; padding: 12px; background: linear-gradient(135deg, #ff6b35, #ff4500); border: none; border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; cursor: pointer; transition: all 0.3s; }
.refine-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.refine-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255, 107, 53, 0.5); }

.recipe-list h3 { color: #aaa; font-size: 14px; margin: 0 0 10px 0; }
.recipe-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.recipe-card { position: relative; padding: 12px 8px; background: #2a1a0e; border-radius: 10px; cursor: pointer; transition: all 0.3s; border: 2px solid transparent; text-align: center; }
.recipe-card:hover:not(.locked) { background: #3a2a1e; border-color: rgba(255, 107, 53, 0.4); }
.recipe-card.selected { border-color: #ff6b35; background: #3a2a1e; }
.recipe-card.locked { opacity: 0.5; cursor: not-allowed; }
.recipe-card-icon { font-size: 28px; margin-bottom: 4px; }
.recipe-card-name { color: #fff; font-size: 12px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.recipe-card-grade { color: #888; font-size: 10px; }
.recipe-locked-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #ef4444; }

.study-section { margin-bottom: 16px; }
.study-section h3 { color: #aaa; font-size: 14px; margin: 0 0 10px 0; }
.study-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.study-card { padding: 12px; background: #2a1a0e; border-radius: 10px; cursor: pointer; transition: all 0.3s; border: 2px solid transparent; text-align: center; }
.study-card:hover { border-color: #ff6b35; }
.study-card.learnable { border-color: rgba(255, 215, 0, 0.3); }
.study-card.affordable:hover { border-color: #ffd700; }
.study-icon { font-size: 32px; margin-bottom: 4px; }
.study-name { color: #fff; font-size: 13px; font-weight: bold; }
.study-grade { color: #888; font-size: 11px; }
.study-cost { color: #ffd700; font-size: 11px; margin-top: 4px; }

.furnace-detail { background: #2a1a0e; border-radius: 12px; padding: 16px; }
.furnace-detail-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.furnace-detail-icon { font-size: 48px; }
.furnace-detail-info h3 { color: #ff8c00; margin: 0 0 4px 0; font-size: 18px; }
.furnace-detail-level { color: #aaa; font-size: 13px; }

.furnace-attrs { display: flex; gap: 12px; margin-bottom: 16px; }
.attr-item { flex: 1; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; text-align: center; }
.attr-label { display: block; color: #888; font-size: 11px; margin-bottom: 4px; }
.attr-value { color: #22c55e; font-size: 14px; font-weight: bold; }

.furnace-upgrade-section { text-align: center; }
.upgrade-preview { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 12px; }
.upgrade-arrow { font-size: 24px; color: #ff6b35; }
.upgrade-next { background: rgba(255,107,53,0.2); padding: 12px 20px; border-radius: 10px; border: 1px solid #ff6b35; }
.upgrade-next-icon { font-size: 28px; }
.upgrade-next-name { color: #ffd700; font-size: 14px; font-weight: bold; }
.upgrade-next-level { color: #aaa; font-size: 12px; }

.upgrade-requirements { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.req-item { display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 6px; font-size: 12px; }
.req-icon { font-size: 16px; }
.req-name { flex: 1; color: #ccc; }
.req-count { color: #ef4444; font-weight: bold; }
.req-count.enough { color: #22c55e; }

.upgrade-btn { width: 100%; padding: 12px; background: linear-gradient(
.upgrade-btn { width: 100%; padding: 12px; background: linear-gradient(135deg, #ff6b35, #ff4500); border: none; border-radius: 8px; color: #fff; font-size: 16px; font-weight: bold; cursor: pointer; transition: all 0.3s; }
.upgrade-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.upgrade-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255, 107, 53, 0.5); }

/* 结果弹窗 */
.result-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 1001; }
.result-modal { background: linear-gradient(135deg, #1a0a2e 0%, #0f0f23 100%); border-radius: 16px; padding: 24px; text-align: center; border: 2px solid #ff6b35; min-width: 280px; }
.result-title { font-size: 22px; font-weight: bold; margin-bottom: 16px; }
.result-title.success { color: #22c55e; }
.result-title.fail { color: #ef4444; }
.result-content { margin-bottom: 20px; }
.result-content .result-icon { font-size: 48px; display: block; margin-bottom: 8px; }
.result-content .result-name { color: #fff; font-size: 18px; font-weight: bold; display: block; }
.result-content .result-count { color: #22c55e; font-size: 16px; font-weight: bold; display: block; margin-top: 4px; }
.result-content .result-quality { color: #ffd700; font-size: 14px; margin-top: 4px; }
.confirm-btn { padding: 10px 40px; background: linear-gradient(135deg, #ff6b35, #ff4500); color: #fff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px; }
.confirm-btn:hover { transform: scale(1.05); }

/* 响应式 */
@media (max-width: 700px) {
  .alchemy-panel { width: 95%; max-height: 90vh; }
  .recipe-grid { grid-template-columns: repeat(3, 1fr); }
  .study-grid { grid-template-columns: repeat(2, 1fr); }
  .furnace-attrs { flex-direction: column; }
}
