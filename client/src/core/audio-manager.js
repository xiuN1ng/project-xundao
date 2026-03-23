/**
 * 寻道修仙 - TTS & 音效音频管理系统
 * Audio Manager for Idle Cultivation Game
 * 
 * Features:
 * - Web Audio API for synthesized sounds (fallback)
 * - HTML5 Audio for TTS voice files
 * - AudioPool for reusable audio elements
 * - Volume control
 * - Game event integration
 * 
 * Voice Lines (TTS): assets/audio/*.mp3
 * Synthesized Sounds: Web Audio API oscillator tones
 */

const AudioManager = {
  // ============ State ============
  context: null,
  masterVolume: 1.0,
  sfxVolume: 0.8,
  ttsVolume: 1.0,
  voiceVolume: 1.0,
  
  // Audio pool for TTS voice files
  audioPool: {},
  poolSize: 10,
  
  // Currently playing audio
  activeAudios: [],
  
  // Synthesized sound configurations
  synthConfigs: {
    // Button/UI click
    click: { freq: 600, duration: 0.05, type: 'sine', gain: 0.1 },
    // Success events (tribulation success, realm breakthrough)
    success: { freq: 523, duration: 0.1, type: 'sine', gain: 0.15, sequence: [523, 659, 784], delays: [0, 100, 200] },
    // Failure events
    failure: { freq: 200, duration: 0.2, type: 'sawtooth', gain: 0.1 },
    // Upgrade/enhancement
    upgrade: { freq: 440, duration: 0.1, type: 'sine', gain: 0.12, sequence: [440, 554, 659], delays: [0, 80, 160] },
    // Battle
    battle: { freq: 150, duration: 0.1, type: 'square', gain: 0.08 },
    // Cultivation
    cultivate: { freq: 300, duration: 0.15, type: 'sine', gain: 0.1 },
    // Achievement
    achievement: { freq: 784, duration: 0.15, type: 'sine', gain: 0.15, sequence: [523, 659, 784, 1047], delays: [0, 100, 200, 300] },
    // Warning/alert
    warning: { freq: 400, duration: 0.2, type: 'triangle', gain: 0.12, sequence: [400, 300], delays: [0, 150] },
    // Tribulation thunder
    tribulation: { freq: 80, duration: 0.5, type: 'sawtooth', gain: 0.2, sequence: [80, 60, 100, 40], delays: [0, 200, 400, 600] },
  },

  // ============ Initialization ============
  init() {
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      console.log('[AudioManager] Web Audio API initialized');
    } catch (e) {
      console.warn('[AudioManager] Web Audio API not available:', e);
    }
    
    // Initialize audio pool
    this._initAudioPool();
    
    // Resume context on user interaction (required by browsers)
    document.addEventListener('click', () => this._resumeContext(), { once: true });
    document.addEventListener('keydown', () => this._resumeContext(), { once: true });
    
    // Load volume settings from localStorage
    this._loadSettings();
  },

  _resumeContext() {
    if (this.context && this.context.state === 'suspended') {
      this.context.resume();
      console.log('[AudioManager] Audio context resumed');
    }
  },

  _initAudioPool() {
    // Pre-create audio elements for common sounds
    const commonSounds = [
      'achievement_unlock',
      'tribulation_success',
      'tribulation_fail',
      'realm_breakthrough',
      'battle_victory',
    ];
    
    commonSounds.forEach(name => {
      this.audioPool[name] = [];
      for (let i = 0; i < 2; i++) {
        const audio = new Audio();
        audio.preload = 'auto';
        this.audioPool[name].push(audio);
      }
    });
  },

  _loadSettings() {
    try {
      const saved = localStorage.getItem('audio_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.masterVolume = settings.masterVolume ?? 1.0;
        this.sfxVolume = settings.sfxVolume ?? 0.8;
        this.ttsVolume = settings.ttsVolume ?? 1.0;
        this.voiceVolume = settings.voiceVolume ?? 1.0;
      }
    } catch (e) {
      console.warn('[AudioManager] Could not load audio settings');
    }
  },

  _saveSettings() {
    try {
      localStorage.setItem('audio_settings', JSON.stringify({
        masterVolume: this.masterVolume,
        sfxVolume: this.sfxVolume,
        ttsVolume: this.ttsVolume,
        voiceVolume: this.voiceVolume,
      }));
    } catch (e) {}
  },

  // ============ Volume Controls ============
  setMasterVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    this._saveSettings();
  },

  setSfxVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    this._saveSettings();
  },

  setTtsVolume(vol) {
    this.ttsVolume = Math.max(0, Math.min(1, vol));
    this._saveSettings();
  },

  setVoiceVolume(vol) {
    this.voiceVolume = Math.max(0, Math.min(1, vol));
    this._saveSettings();
  },

  getEffectiveVolume(type = 'sfx') {
    const typeVol = type === 'tts' || type === 'voice' ? this.ttsVolume : this.sfxVolume;
    return this.masterVolume * typeVol;
  },

  // ============ Synthesized Sound Effects ============
  playTone(frequency, duration, type = 'sine', gainValue = 0.1) {
    if (!this.context) return;
    
    try {
      const oscillator = this.context.createOscillator();
      const gainNode = this.context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.context.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      const vol = gainValue * this.getEffectiveVolume('sfx');
      gainNode.gain.setValueAtTime(vol, this.context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + duration);
      
      oscillator.start(this.context.currentTime);
      oscillator.stop(this.context.currentTime + duration);
    } catch (e) {
      console.warn('[AudioManager] Tone playback failed:', e);
    }
  },

  playSynth(name) {
    const config = this.synthConfigs[name];
    if (!config) {
      console.warn(`[AudioManager] Unknown synth sound: ${name}`);
      return;
    }

    if (config.sequence) {
      // Play a sequence of tones
      config.sequence.forEach((freq, i) => {
        const delay = config.delays[i] || 0;
        setTimeout(() => {
          this.playTone(freq, config.duration, config.type, config.gain);
        }, delay);
      });
    } else {
      this.playTone(config.freq, config.duration, config.type, config.gain);
    }
  },

  // ============ TTS Voice Playback ============
  /**
   * Play a TTS voice file
   * @param {string} voiceName - Name of the voice file (without .mp3)
   * @param {object} options - Playback options
   */
  playVoice(voiceName, options = {}) {
    const {
      volume = 1.0,
      onEnd = null,
      onError = null,
      forcePlay = false,
    } = options;

    const audioPath = `assets/audio/${voiceName}.mp3`;
    
    // Get or create audio element from pool
    let audio = this._getAudioFromPool(voiceName);
    
    if (!audio) {
      // Not in pool, create new element
      audio = new Audio();
      audio.preload = 'auto';
    }

    // Set volume
    audio.volume = volume * this.getEffectiveVolume('voice');
    
    // Set up callbacks
    audio.onended = () => {
      this._returnAudioToPool(voiceName, audio);
      if (onEnd) onEnd();
    };
    
    audio.onerror = (e) => {
      console.warn(`[AudioManager] Voice playback failed: ${audioPath}`, e);
      if (onError) onError(e);
    };

    // Play
    audio.src = audioPath;
    audio.currentTime = 0;
    audio.play().catch(e => {
      console.warn(`[AudioManager] Could not play ${voiceName}:`, e);
      if (onError) onError(e);
    });

    return audio;
  },

  _getAudioFromPool(name) {
    const pool = this.audioPool[name];
    if (pool && pool.length > 0) {
      const audio = pool.shift();
      // Check if audio is actually available (not playing)
      if (audio.paused || audio.ended) {
        return audio;
      }
      // Still playing, put back and return null
      pool.push(audio);
      return null;
    }
    return null;
  },

  _returnAudioToPool(name, audio) {
    if (!this.audioPool[name]) {
      this.audioPool[name] = [];
    }
    if (this.audioPool[name].length < this.poolSize) {
      this.audioPool[name].push(audio);
    }
  },

  // ============ Game Event Triggers ============
  // These methods are called by game systems to trigger appropriate sounds
  
  // Tribulation (渡劫)
  onTribulationStart() {
    this.playSynth('tribulation');
  },
  
  onTribulationSuccess() {
    // Play TTS voice + success synth
    this.playSynth('success');
    this.playVoice('tribulation_success').catch(() => {});
  },
  
  onTribulationFail() {
    this.playSynth('failure');
    this.playVoice('tribulation_fail').catch(() => {});
  },

  // Realm Breakthrough (境界突破)
  onRealmBreakthrough() {
    this.playSynth('success');
    this.playVoice('realm_breakthrough').catch(() => {});
  },

  // Achievement (成就)
  onAchievementUnlock(achievementName) {
    this.playSynth('achievement');
    this.playVoice('achievement_unlock').catch(() => {});
  },

  // Battle (战斗)
  onBattleVictory() {
    this.playSynth('battle');
    this.playVoice('battle_victory').catch(() => {});
  },
  
  onBattleFail() {
    this.playSynth('failure');
    this.playVoice('battle_fail').catch(() => {});
  },

  // Equipment Enhancement (装备强化)
  onEnhanceSuccess() {
    this.playSynth('upgrade');
    this.playVoice('equip_enhance_success').catch(() => {});
  },
  
  onEnhanceFail() {
    this.playSynth('failure');
    this.playVoice('equip_enhance_fail').catch(() => {});
  },

  // Adventure (奇遇)
  onAdventureTrigger() {
    this.playSynth('warning');
    this.playVoice('adventure_trigger').catch(() => {});
  },
  
  onAdventureComplete() {
    this.playSynth('success');
    this.playVoice('adventure_complete').catch(() => {});
  },

  // World Boss
  onWorldBossAppear() {
    this.playSynth('tribulation');
    this.playVoice('worldboss_appear').catch(() => {});
  },
  
  onWorldBossDefeat() {
    this.playSynth('achievement');
    this.playVoice('worldboss_defeat').catch(() => {});
  },

  // Sect War (宗门战)
  onSectWarStart() {
    this.playSynth('battle');
    this.playVoice('sect_war_start').catch(() => {});
  },
  
  onSectWarWin() {
    this.playSynth('success');
    this.playVoice('sect_war_win').catch(() => {});
  },

  // Marriage (婚姻)
  onMarriagePropose() {
    this.playSynth('success');
    this.playVoice('marriage_propose').catch(() => {});
  },
  
  onMarriageSuccess() {
    this.playSynth('achievement');
    this.playVoice('marriage_success').catch(() => {});
  },

  // Title (称号)
  onTitleUnlock() {
    this.playSynth('achievement');
    this.playVoice('title_unlock').catch(() => {});
  },

  // Cultivation (修炼)
  onCultivateBreakthrough() {
    this.playSynth('cultivate');
    this.playVoice('cultivate_breakthrough').catch(() => {});
  },

  // Sect (宗门)
  onSectDonate() {
    this.playSynth('upgrade');
    this.playVoice('sect_donate').catch(() => {});
  },

  // UI Sounds (无TTS，仅合成音)
  onButtonClick() {
    this.playSynth('click');
  },
};

// Initialize on load
window.AudioManager = AudioManager;

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AudioManager.init());
} else {
  AudioManager.init();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioManager;
}
