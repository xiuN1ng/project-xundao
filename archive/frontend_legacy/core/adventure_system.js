/**
 * 仙侠奇遇系统 (Adventure/Encounter System)
 * 玩家在修炼过程中随机触发特殊事件
 */
(function() {
  const ADVENTURE_COOLDOWN = 60000; // 60 seconds
  const API_BASE = 'http://localhost:3001';

  let lastAdventureTrigger = 0;
  let activeBuffs = []; // { stat, value, expiresAt, name }

  // DOM update interval for cooldown display
  let cooldownInterval = null;

  /**
   * Update the adventure widget UI (buffs display and cooldown)
   */
  function updateAdventureUI() {
    // Update buffs display
    const buffsEl = document.getElementById('adventureBuffs');
    const cooldownEl = document.getElementById('adventureCooldown');

    if (buffsEl) {
      const validBuffs = getActiveBuffs();
      if (validBuffs.length > 0) {
        buffsEl.innerHTML = validBuffs.map(b =>
          `<div class="adventure-buff">✨ ${b.name || b.stat}: ×${b.value} (${Math.ceil((b.expiresAt - Date.now()) / 60000)}分钟)</div>`
        ).join('');
      } else {
        buffsEl.innerHTML = '';
      }
    }

    if (cooldownEl) {
      const remaining = checkAdventureCooldown();
      if (remaining > 0) {
        cooldownEl.textContent = `冷却: ${Math.ceil(remaining / 1000)}秒`;
      } else {
        cooldownEl.textContent = '可触发';
      }
    }
  }

  /**
   * Show toast notification
   */
  function showAdventureToast(msg, type) {
    if (typeof showToast === 'function') {
      showToast(msg, type);
    } else {
      console.log(`[Adventure] ${msg}`);
    }
  }

  /**
   * Add log entry to game log
   */
  function addAdventureLog(msg, type) {
    if (typeof addLog === 'function') {
      addLog(msg, type);
    } else {
      console.log(`[Adventure Log] ${msg}`);
    }
  }

  /**
   * Check if adventure is on cooldown
   */
  function checkAdventureCooldown() {
    const now = Date.now();
    const remaining = ADVENTURE_COOLDOWN - (now - lastAdventureTrigger);
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Get currently active (non-expired) buffs
   */
  function getActiveBuffs() {
    const now = Date.now();
    return activeBuffs.filter(b => b.expiresAt > now);
  }

  /**
   * Apply a buff to the player
   */
  function applyBuff(buff) {
    if (buff.type === 'buff') {
      const fullBuff = {
        ...buff,
        expiresAt: Date.now() + buff.duration,
        name: buff.name || buff.stat
      };
      activeBuffs.push(fullBuff);
      addAdventureLog(`✨ 获得奇遇buff: ${buff.stat}=${buff.value} (持续${buff.duration / 60000}分钟)`, 'success');
      showAdventureToast(`🧙 获得buff: ${buff.stat}=${buff.value}`, 'success');
      updateAdventureUI();
    }
  }

  /**
   * Apply adventure rewards to the frontend game state
   * Called after a successful adventure trigger
   */
  function applyRewards(rewards) {
    for (const reward of rewards) {
      if (reward.type === 'spiritStones' && window.gameState) {
        window.gameState.player.spiritStones = Math.max(0, (window.gameState.player.spiritStones || 0) + reward.value);
        addAdventureLog(`💎 ${reward.value > 0 ? '+' : ''}${reward.value} 灵石`, reward.value >= 0 ? 'success' : 'warning');
        if (typeof updateUI === 'function') updateUI();
      } else if (reward.type === 'exp' && window.gameState) {
        // Apply exp through game's existing experience system
        if (typeof window.gameState.player !== 'undefined') {
          //间接通过 addExperience
          if (typeof gainExperience === 'function') {
            gainExperience(reward.value);
          }
        }
        addAdventureLog(`📈 ${reward.value > 0 ? '+' : ''}${reward.value} 经验`, reward.value >= 0 ? 'success' : 'warning');
      } else if (reward.type === 'buff') {
        applyBuff(reward);
      } else if (reward.type === 'item') {
        addAdventureLog(`🎁 获得物品: ${reward.name}`, 'success');
        showAdventureToast(`🎁 获得物品: ${reward.name}`, 'success');
      }
    }
  }

  /**
   * Main function: trigger a random adventure
   */
  async function triggerAdventure() {
    const cooldown = checkAdventureCooldown();
    if (cooldown > 0) {
      showAdventureToast(`需要等待${Math.ceil(cooldown / 1000)}秒再触发奇遇`, 'warning');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/adventure/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 1 })
      });

      const result = await response.json();

      if (!result.success) {
        showAdventureToast(result.message || '奇遇触发失败', 'error');
        return;
      }

      const adventure = result.adventure;
      lastAdventureTrigger = Date.now();

      // Build reward description
      const rewardDescs = adventure.rewards.map(r => {
        if (r.type === 'spiritStones') return `${r.value > 0 ? '+' : ''}${r.value}灵石`;
        if (r.type === 'exp') return `${r.value > 0 ? '+' : ''}${r.value}经验`;
        if (r.type === 'buff') return `buff:${r.stat}=${r.value}`;
        if (r.type === 'item') return r.name;
        return '';
      }).filter(Boolean).join(', ');

      // Show toast
      showAdventureToast(`${adventure.icon} ${adventure.name}: ${adventure.desc}`, 'success');
      addAdventureLog(`🔮 触发奇遇【${adventure.name}】- ${rewardDescs}`, 'success');

      // Apply rewards to game state
      applyRewards(adventure.rewards);

      // Start cooldown display update
      startCooldownTimer();

    } catch (error) {
      console.error('Adventure trigger error:', error);
      showAdventureToast('奇遇系统暂不可用', 'error');
    }
  }

  /**
   * Start the cooldown countdown timer
   */
  function startCooldownTimer() {
    if (cooldownInterval) return;
    cooldownInterval = setInterval(() => {
      updateAdventureUI();
      const remaining = checkAdventureCooldown();
      if (remaining <= 0) {
        clearInterval(cooldownInterval);
        cooldownInterval = null;
      }
    }, 1000);
  }

  /**
   * Called periodically during cultivation to possibly auto-trigger an adventure
   * Hooked into cultivation tick
   */
  function maybeTriggerAdventure() {
    const now = Date.now();
    if (now - lastAdventureTrigger < ADVENTURE_COOLDOWN) return;
    // 5% chance per call
    if (Math.random() > 0.05) return;
    // Only trigger if game is running
    if (window.gameState && typeof gameState !== 'undefined') {
      triggerAdventure();
    }
  }

  /**
   * Initialize adventure system - load history and restore buffs from backend
   */
  async function initAdventureSystem() {
    try {
      const response = await fetch(`${API_BASE}/api/adventure/stats?userId=1`);
      if (response.ok) {
        const stats = await response.json();
        if (stats.success && stats.lastTrigger) {
          lastAdventureTrigger = stats.lastTrigger;
        }
      }
    } catch (e) {
      // Backend unavailable, use local state
    }

    // Start UI update interval
    setInterval(() => {
      updateAdventureUI();
    }, 5000);

    updateAdventureUI();

    // Hook into cultivation tick if game loop exists
    // The actual hooking is done by the cultivation loop calling maybeTriggerAdventure()
    // We also set up a backup interval
    setInterval(() => {
      if (typeof maybeTriggerAdventure === 'function') {
        maybeTriggerAdventure();
      }
    }, 30000); // every 30 seconds check for auto-trigger
  }

  // Auto-init on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdventureSystem);
  } else {
    initAdventureSystem();
  }

  // Export to window
  window.triggerAdventure = triggerAdventure;
  window.checkAdventureCooldown = checkAdventureCooldown;
  window.getActiveBuffs = getActiveBuffs;
  window.maybeTriggerAdventure = maybeTriggerAdventure;
  window.activeBuffs = activeBuffs;
  window.applyBuff = applyBuff;
  window.updateAdventureUI = updateAdventureUI;

})();
