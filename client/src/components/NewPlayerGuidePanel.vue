<template>
  <!-- 遮罩层 + 高亮引导 -->
  <div class="npg-overlay" v-if="active" @click.self="handleOverlayClick">
    
    <!-- 全屏暗色遮罩（中间镂空目标区域） -->
    <div class="npg-mask" :style="maskStyle"></div>
    
    <!-- 高亮框 -->
    <div 
      class="npg-highlight-box" 
      :style="highlightBoxStyle"
      :class="{ 'npg-pulse': currentStep && currentStep.pulse }"
    ></div>
    
    <!-- 指向箭头 -->
    <div 
      v-if="currentStep && currentStep.arrow" 
      class="npg-arrow"
      :class="`npg-arrow-${currentStep.arrow}`"
      :style="arrowStyle"
    >
      <div class="npg-arrow-head"></div>
      <div class="npg-arrow-body"></div>
    </div>
    
    <!-- NPC气泡指引 -->
    <div 
      v-if="currentStep && currentStep.bubble" 
      class="npg-bubble"
      :class="[`npg-bubble-${currentStep.bubblePosition || 'bottom'}`, `npg-npc-${currentStep.npc || 'master'}`]"
      :style="bubbleStyle"
    >
      <div class="npg-bubble-npc-avatar">{{ getNpcAvatar(currentStep.npc) }}</div>
      <div class="npg-bubble-content">
        <div class="npg-bubble-name">{{ getNpcName(currentStep.npc) }}</div>
        <div class="npg-bubble-text">{{ currentStep.bubble }}</div>
        <div class="npg-bubble-actions" v-if="currentStep.actions">
          <button 
            v-for="action in currentStep.actions" 
            :key="action.label"
            class="npg-action-btn"
            :class="{ 'npg-primary': action.primary }"
            @click="doAction(action)"
          >
            {{ action.label }}
          </button>
        </div>
        <div class="npg-bubble-nav">
          <button class="npg-nav-btn" @click="prevStep" :disabled="stepIndex <= 0">← 上一步</button>
          <div class="npg-step-dots">
            <span 
              v-for="(s, i) in guideSteps" 
              :key="i"
              class="npg-dot"
              :class="{ active: i === stepIndex, completed: i < stepIndex }"
            ></span>
          </div>
          <button class="npg-nav-btn" @click="nextStep">
            {{ stepIndex < guideSteps.length - 1 ? '下一步 →' : '完成 ✓' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- 跳过按钮 -->
    <button class="npg-skip-btn" @click="skipGuide">跳过引导</button>
    
    <!-- 进度指示 -->
    <div class="npg-progress">
      <span>{{ stepIndex + 1 }} / {{ guideSteps.length }}</span>
      <div class="npg-progress-bar">
        <div class="npg-progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script>
const { ref, computed, watch, onMounted, onUnmounted, nextTick } = Vue;

export default {
  name: 'NewPlayerGuidePanel',
  emits: ['close', 'step-change', 'complete', 'skip'],
  props: {
    playerLevel: { type: Number, default: 1 },
    playerRealm: { type: String, default: '凡人之躯' },
  },
  setup(props, { emit }) {
    const active = ref(true);
    const stepIndex = ref(0);
    const highlightedElement = ref(null);

    // ── 引导步骤配置 ──
    const guideSteps = ref([
      {
        id: 1,
        title: '欢迎来到修仙世界',
        npc: 'master',
        bubblePosition: 'bottom',
        bubble: '欢迎来到修仙世界！我是你的引路人。让我为你介绍游戏的基本操作。',
        targetSelector: '.game-top-bar',
        highlightArea: { top: 0, left: 0, width: 100, height: 60 },
        arrow: null,
        pulse: true,
        autoClick: null,
        actions: [{ label: '好的', primary: true, handler: 'next' }],
      },
      {
        id: 2,
        title: '查看角色状态',
        npc: 'master',
        bubblePosition: 'left',
        bubble: '这里是角色状态栏，显示你的境界、生命、攻击力和灵石。记得时刻关注！',
        targetSelector: '.player-stats, .stats-bar, .top-bar',
        highlightArea: { top: 5, left: 20, width: 200, height: 50 },
        arrow: 'right',
        pulse: false,
        actions: [],
      },
      {
        id: 3,
        title: '开始修炼',
        npc: 'fairy',
        bubblePosition: 'right',
        bubble: '点击「修炼」按钮即可开始自动修炼，获取灵气提升境界！',
        targetSelector: '[data-action="cultivate"], .cultivate-btn, .action-cultivate',
        highlightArea: null,
        arrow: 'left',
        pulse: true,
        actions: [{ label: '去修炼', primary: true, handler: 'auto' }],
      },
      {
        id: 4,
        title: '挑战怪物',
        npc: 'fairy',
        bubblePosition: 'bottom',
        bubble: '击败怪物可以获得灵石和装备奖励。灵石是重要的交易货币！',
        targetSelector: '[data-action="battle"], .battle-btn, #enemyList, .enemy-list',
        highlightArea: null,
        arrow: 'top',
        pulse: false,
        actions: [],
      },
      {
        id: 5,
        title: '打开背包',
        npc: 'master',
        bubblePosition: 'right',
        bubble: '点击「背包」按钮可以查看和管理你的装备、丹药和道具。',
        targetSelector: '[data-action="bag"], .bag-btn, #bagBtn',
        highlightArea: null,
        arrow: 'left',
        pulse: true,
        actions: [{ label: '打开背包', primary: true, handler: 'openBag' }],
      },
      {
        id: 6,
        title: '境界突破',
        npc: 'elder',
        bubblePosition: 'left',
        bubble: '当灵气满了，记得点击「突破」提升境界！境界越高，能修炼的功法越强。',
        targetSelector: '[data-action="realm"], .realm-btn, .breakthrough-btn',
        highlightArea: null,
        arrow: 'right',
        pulse: true,
        actions: [],
      },
      {
        id: 7,
        title: '七日任务',
        npc: 'elder',
        bubblePosition: 'bottom',
        bubble: '完成七日任务可以获得大量奖励，帮助你快速成长！点击查看任务面板。',
        targetSelector: '[data-action="daily"], .daily-btn, #dailyBtn, .quest-btn',
        highlightArea: null,
        arrow: 'top',
        pulse: false,
        actions: [{ label: '查看任务', primary: true, handler: 'openQuest' }],
      },
      {
        id: 8,
        title: '加入宗门',
        npc: 'sectary',
        bubblePosition: 'right',
        bubble: '加入宗门可以参与宗门活动，获取宗门专属福利和技能！',
        targetSelector: '[data-action="sect"], .sect-btn, #sectBtn, .guild-btn',
        highlightArea: null,
        arrow: 'left',
        pulse: false,
        actions: [],
      },
      {
        id: 9,
        title: '引导完成',
        npc: 'master',
        bubblePosition: 'bottom',
        bubble: '恭喜你已完成新手引导！修仙之路漫长，愿你早日得道飞升！🌟',
        targetSelector: null,
        highlightArea: null,
        arrow: null,
        pulse: false,
        actions: [{ label: '开始修仙', primary: true, handler: 'complete' }],
      },
    ]);

    const currentStep = computed(() => guideSteps.value[stepIndex.value]);
    const totalSteps = computed(() => guideSteps.value.length);
    const progressPercent = computed(() => ((stepIndex.value + 1) / totalSteps.value) * 100);

    // ── 动态定位 ──
    function getElementRect(selector) {
      if (!selector) return null;
      const els = document.querySelectorAll(selector);
      if (els.length === 0) return null;
      // 取第一个匹配元素
      const el = els[0];
      const rect = el.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      };
    }

    const highlightBoxStyle = computed(() => {
      const step = currentStep.value;
      if (!step || !step.targetSelector) return { display: 'none' };

      // 先尝试获取元素实际位置
      const rect = getElementRect(step.targetSelector);
      if (rect) {
        const padding = 8;
        return {
          top: (rect.top - padding) + 'px',
          left: (rect.left - padding) + 'px',
          width: (rect.width + padding * 2) + 'px',
          height: (rect.height + padding * 2) + 'px',
          display: 'block',
        };
      }

      // 使用预设区域（元素未找到时）
      if (step.highlightArea) {
        return {
          top: step.highlightArea.top + 'px',
          left: step.highlightArea.left + 'px',
          width: step.highlightArea.width + 'px',
          height: step.highlightArea.height + 'px',
          display: 'block',
        };
      }

      return { display: 'none' };
    });

    // 遮罩层：使用大型box-shadow圈出高亮区域（兼容性更好的"挖洞"方案）
    const maskStyle = computed(() => {
      const step = currentStep.value;
      if (!step || !step.targetSelector) return {};

      const rect = getElementRect(step.targetSelector);
      if (rect && rect.width > 0) {
        const pad = 10;
        const t = rect.top - pad;
        const l = rect.left - pad;
        const w = rect.width + pad * 2;
        const h = rect.height + pad * 2;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        
        return {
          boxShadow: `inset 0 0 0 ${vw}px rgba(0,0,0,0.72)`,
          clipPath: `inset(${t}px ${vw - l - w}px ${vh - t - h}px ${l}px round 8px)`,
        };
      }

      if (step.highlightArea) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const { top, left, width, height } = step.highlightArea;
        return {
          boxShadow: `inset 0 0 0 ${vw}px rgba(0,0,0,0.72)`,
          clipPath: `inset(${top}px ${vw - left - width}px ${vh - top - height}px ${left}px round 8px)`,
        };
      }

      return { boxShadow: 'inset 0 0 0 9999px rgba(0,0,0,0.72)' };
    });

    // 箭头定位
    const arrowStyle = computed(() => {
      const step = currentStep.value;
      if (!step || !step.targetSelector || !step.arrow) return { display: 'none' };

      const rect = getElementRect(step.targetSelector);
      if (!rect) return { display: 'none' };

      const midX = rect.left + rect.width / 2;
      const midY = rect.top + rect.height / 2;
      const gap = 40;

      const positions = {
        top:    { left: midX + 'px', top: (rect.top - gap) + 'px', transform: 'rotate(-90deg)' },
        bottom: { left: midX + 'px', top: (rect.bottom + gap) + 'px', transform: 'rotate(90deg)' },
        left:   { left: (rect.left - gap) + 'px', top: midY + 'px', transform: 'rotate(0deg)' },
        right:  { left: (rect.right + gap) + 'px', top: midY + 'px', transform: 'rotate(180deg)' },
      };

      return { ...positions[step.arrow], display: 'block' };
    });

    // 气泡定位
    const bubbleStyle = computed(() => {
      const step = currentStep.value;
      if (!step || !step.targetSelector) return {};

      const rect = getElementRect(step.targetSelector);
      if (!rect) return {};

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const gap = 16;
      const bw = 320;
      const bh = 200;

      const positions = {
        bottom: { 
          left: Math.min(Math.max(rect.left + rect.width / 2 - bw / 2, gap), vw - bw - gap) + 'px',
          top: (rect.bottom + gap + 60) + 'px', // 60 = arrow height
        },
        top: { 
          left: Math.min(Math.max(rect.left + rect.width / 2 - bw / 2, gap), vw - bw - gap) + 'px',
          bottom: (vh - rect.top + gap + 60) + 'px',
        },
        left: {
          right: (vw - rect.left + gap) + 'px',
          top: Math.min(Math.max(midY - bh / 2, gap), vh - bh - gap) + 'px',
        },
        right: {
          left: (rect.right + gap) + 'px',
          top: Math.min(Math.max(midY - bh / 2, gap), vh - bh - gap) + 'px',
        },
      };

      const midY = rect.top + rect.height / 2;
      if (step.bubblePosition === 'left' || step.bubblePosition === 'right') {
        const top = Math.min(Math.max(midY - bh / 2, gap), vh - bh - gap);
        positions.left.top = top + 'px';
        positions.right.top = top + 'px';
      }

      return { ...(positions[step.bubblePosition] || positions.bottom), display: 'block' };
    });

    // ── NPC 数据 ──
    const npcList = {
      master:  { name: '引道仙人', avatar: '🧙‍♂️', color: '#b8860b' },
      fairy:   { name: '灵狐仙子', avatar: '🦊', color: '#ff69b4' },
      elder:   { name: '宗门长老', avatar: '👴', color: '#8b4513' },
      sectary: { name: '宗门使者', avatar: '⚔️', color: '#4169e1' },
    };

    function getNpcAvatar(npc) { return npcList[npc]?.avatar || '🧙‍♂️'; }
    function getNpcName(npc)   { return npcList[npc]?.name || '引道仙人'; }

    // ── 导航逻辑 ──
    function nextStep() {
      if (stepIndex.value < guideSteps.value.length - 1) {
        stepIndex.value++;
        emit('step-change', stepIndex.value);
        tryHighlightElement();
        tryAutoAction();
      } else {
        completeGuide();
      }
    }

    function prevStep() {
      if (stepIndex.value > 0) {
        stepIndex.value--;
        emit('step-change', stepIndex.value);
        tryHighlightElement();
      }
    }

    function skipGuide() {
      active.value = false;
      emit('skip');
      emit('close');
    }

    function completeGuide() {
      active.value = false;
      emit('complete');
      emit('close');
    }

    function handleOverlayClick() {
      // 点击遮罩不做任何操作，引导必须按步骤进行
    }

    function doAction(action) {
      if (!action || !action.handler) return;
      const handlers = {
        next: nextStep,
        auto: () => {
          if (currentStep.value && currentStep.value.autoClick) {
            const el = document.querySelector(currentStep.value.targetSelector);
            if (el) el.click();
          }
          nextStep();
        },
        openBag: () => {
          const el = document.querySelector('[data-action="bag"], .bag-btn, #bagBtn');
          if (el) el.click();
          nextStep();
        },
        openQuest: () => {
          const el = document.querySelector('[data-action="daily"], .daily-btn, #dailyBtn');
          if (el) el.click();
          nextStep();
        },
        complete: completeGuide,
      };
      if (handlers[action.handler]) handlers[action.handler]();
    }

    function tryHighlightElement() {
      const step = currentStep.value;
      if (!step || !step.targetSelector) return;
      nextTick(() => {
        const el = document.querySelector(step.targetSelector);
        if (el && step.pulse) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }

    function tryAutoAction() {
      const step = currentStep.value;
      if (!step || !step.autoClick) return;
      nextTick(() => {
        const el = document.querySelector(step.targetSelector);
        if (el) el.click();
      });
    }

    // 监听窗口大小变化，重新计算位置
    function onResize() {
      // Force re-compute by touching stepIndex (Vue reactivity will update computed styles)
    }

    onMounted(() => {
      window.addEventListener('resize', onResize);
      tryHighlightElement();
    });

    onUnmounted(() => {
      window.removeEventListener('resize', onResize);
    });

    return {
      active,
      stepIndex,
      guideSteps,
      currentStep,
      totalSteps,
      progressPercent,
      highlightBoxStyle,
      maskStyle,
      arrowStyle,
      bubbleStyle,
      getNpcAvatar,
      getNpcName,
      nextStep,
      prevStep,
      skipGuide,
      handleOverlayClick,
      doAction,
    };
  },
};
</script>

<style scoped>
/* ── 全局遮罩层 ── */
.npg-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 99998;
  pointer-events: auto;
}

/* ── 暗色遮罩（用大box-shadow实现"挖洞"） ── */
.npg-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: transparent;
  transition: clip-path 0.4s ease;
}

/* ── 高亮框 ── */
.npg-highlight-box {
  position: absolute;
  border: 2px solid rgba(255, 215, 0, 0.85);
  border-radius: 8px;
  box-shadow: 
    0 0 0 4px rgba(255, 215, 0, 0.15),
    0 0 20px rgba(255, 215, 0, 0.4),
    inset 0 0 12px rgba(255, 215, 0, 0.1);
  pointer-events: none;
  transition: all 0.4s ease;
  z-index: 99999;
}

.npg-highlight-box.npg-pulse {
  animation: npgPulse 1.5s ease-in-out infinite;
}

@keyframes npgPulse {
  0%, 100% { 
    box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.15), 0 0 20px rgba(255, 215, 0, 0.4); 
  }
  50% { 
    box-shadow: 0 0 0 8px rgba(255, 215, 0, 0.25), 0 0 40px rgba(255, 215, 0, 0.6); 
  }
}

/* ── 指向箭头 ── */
.npg-arrow {
  position: absolute;
  z-index: 99999;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 0;
}

.npg-arrow-head {
  width: 0;
  height: 0;
  border-style: solid;
}

.npg-arrow-body {
  background: linear-gradient(90deg, rgba(255,215,0,0.9), rgba(255,215,0,0.4));
  height: 3px;
  animation: npgArrowMove 1s ease-in-out infinite;
}

.npg-arrow-top .npg-arrow-head {
  border-width: 10px 8px 0 8px;
  border-color: rgba(255,215,0,0.9) transparent transparent transparent;
}
.npg-arrow-top .npg-arrow-body { width: 24px; }

.npg-arrow-bottom .npg-arrow-head {
  border-width: 0 8px 10px 8px;
  border-color: transparent transparent rgba(255,215,0,0.9) transparent;
}
.npg-arrow-bottom .npg-arrow-body { width: 24px; }

.npg-arrow-left .npg-arrow-head {
  border-width: 8px 10px 8px 0;
  border-color: transparent rgba(255,215,0,0.9) transparent transparent;
}
.npg-arrow-left { flex-direction: row; }
.npg-arrow-left .npg-arrow-body { width: 24px; }

.npg-arrow-right .npg-arrow-head {
  border-width: 8px 0 8px 10px;
  border-color: transparent transparent transparent rgba(255,215,0,0.9);
}
.npg-arrow-right { flex-direction: row-reverse; }
.npg-arrow-right .npg-arrow-body { width: 24px; }

@keyframes npgArrowMove {
  0%, 100% { opacity: 0.6; transform: scaleX(0.8); }
  50% { opacity: 1; transform: scaleX(1.2); }
}

/* ── NPC气泡 ── */
.npg-bubble {
  position: absolute;
  z-index: 999999;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 320px;
  background: linear-gradient(135deg, rgba(18,12,35,0.97), rgba(25,18,50,0.95));
  border: 1px solid rgba(184,134,11,0.5);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 
    0 8px 32px rgba(0,0,0,0.7),
    0 0 20px rgba(184,134,11,0.15),
    inset 0 1px 0 rgba(255,255,255,0.05);
  animation: npgBubbleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: auto;
}

@keyframes npgBubbleIn {
  from { opacity: 0; transform: scale(0.85) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.npg-bubble::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  background: rgba(18,12,35,0.97);
  border-left: 1px solid rgba(184,134,11,0.5);
  border-top: 1px solid rgba(184,134,11,0.5);
  transform: rotate(45deg);
}

.npg-bubble-bottom::before { bottom: -7px; left: 32px; }
.npg-bubble-top::before    { top: -7px; left: 32px; transform: rotate(-135deg); }
.npg-bubble-left::before  { left: auto; right: -7px; top: 24px; transform: rotate(-45deg); }
.npg-bubble-right::before { top: 24px; left: -7px; transform: rotate(135deg); }

.npg-bubble-npc-avatar {
  font-size: 32px;
  line-height: 1;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  background: rgba(0,0,0,0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(184,134,11,0.4);
}

.npg-bubble-content {
  flex: 1;
  min-width: 0;
}

.npg-bubble-name {
  font-size: 12px;
  font-weight: bold;
  color: #daa520;
  margin-bottom: 6px;
  letter-spacing: 1px;
}

.npg-bubble-text {
  font-size: 13px;
  color: #e8e8f0;
  line-height: 1.6;
  margin-bottom: 10px;
}

.npg-bubble-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.npg-action-btn {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid rgba(184,134,11,0.4);
  border-radius: 6px;
  background: rgba(184,134,11,0.1);
  color: #e8e8f0;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.npg-action-btn:hover {
  background: rgba(184,134,11,0.25);
  border-color: rgba(184,134,11,0.7);
}

.npg-action-btn.npg-primary {
  background: linear-gradient(135deg, rgba(184,134,11,0.6), rgba(218,165,32,0.4));
  border-color: rgba(218,165,32,0.8);
  color: #ffd700;
  font-weight: bold;
}

.npg-bubble-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.npg-nav-btn {
  padding: 4px 10px;
  border: 1px solid rgba(184,134,11,0.3);
  border-radius: 4px;
  background: transparent;
  color: #a0a0b8;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.npg-nav-btn:hover:not(:disabled) {
  color: #e8e8f0;
  border-color: rgba(184,134,11,0.6);
}

.npg-nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.npg-step-dots {
  display: flex;
  gap: 5px;
  align-items: center;
}

.npg-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(184,134,11,0.3);
  transition: all 0.3s;
}

.npg-dot.active {
  background: #ffd700;
  box-shadow: 0 0 6px rgba(255,215,0,0.7);
  width: 14px;
  border-radius: 3px;
}

.npg-dot.completed {
  background: rgba(0,255,136,0.6);
}

/* ── 跳过按钮 ── */
.npg-skip-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 16px;
  background: rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 20px;
  color: rgba(255,255,255,0.5);
  font-size: 12px;
  cursor: pointer;
  z-index: 999999;
  transition: all 0.2s;
  letter-spacing: 1px;
}

.npg-skip-btn:hover {
  background: rgba(0,0,0,0.7);
  border-color: rgba(255,255,255,0.3);
  color: rgba(255,255,255,0.8);
}

/* ── 进度指示 ── */
.npg-progress {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  z-index: 999999;
  color: rgba(255,255,255,0.5);
  font-size: 12px;
  letter-spacing: 1px;
}

.npg-progress-bar {
  width: 200px;
  height: 3px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
}

.npg-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #b8860b, #ffd700);
  border-radius: 2px;
  transition: width 0.4s ease;
}

/* ── 移动端适配 ── */
@media (max-width: 600px) {
  .npg-bubble {
    width: calc(100vw - 32px);
    left: 16px !important;
    right: 16px !important;
  }
  .npg-arrow { display: none; }
  .npg-skip-btn { top: 10px; right: 10px; }
}
</style>
