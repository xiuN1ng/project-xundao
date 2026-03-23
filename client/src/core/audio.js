const AudioManager = {
  context: null,
  sounds: {},
  
  init() {
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.log('音频不可用');
    }
  },
  
  // 生成简单的提示音
  playTone(frequency = 440, duration = 0.1, type = 'sine') {
    if (!this.context) return;
    
    try {
      const oscillator = this.context.createOscillator();
      const gainNode = this.context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.context.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0.1, this.context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);
      
      oscillator.start(this.context.currentTime);
      oscillator.stop(this.context.currentTime + duration);
    } catch (e) {}
  },
  
  // 按钮点击音效
  playClick() {
    this.playTone(600, 0.05);
  },
  
  // 成功音效
  playSuccess() {
    this.playTone(523, 0.1);
    setTimeout(() => this.playTone(659, 0.1), 100);
    setTimeout(() => this.playTone(784, 0.15), 200);
  },
  
  // 失败音效
  playError() {
    this.playTone(200, 0.2, 'sawtooth');
  },
  
  // 修炼音效
  playCultivate() {
    this.playTone(300, 0.15);
  },
  
  // 升级音效
  playUpgrade() {
    this.playTone(440, 0.1);
    setTimeout(() => this.playTone(554, 0.1), 80);
    setTimeout(() => this.playTone(659, 0.15), 160);
  },
  
  // 战斗音效
  playBattle() {
    this.playTone(150, 0.1, 'square');
  }
};

// 初始化音频
document.addEventListener('click', () => {
  if (!AudioManager.context) AudioManager.init();
}, { once: true });

