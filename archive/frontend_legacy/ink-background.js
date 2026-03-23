/**
 * 宣纸底纹 Shader - 水墨风格渲染
 * 使用 Canvas 2D + Perlin Noise 实现
 * 颜色: 米白色 #F5F5DC 配合淡墨色纹理
 */

(function() {
  'use strict';

  // Perlin Noise 实现
  class PerlinNoise {
    constructor(seed = Math.random() * 10000) {
      this.permutation = this.generatePermutation(seed);
    }

    generatePermutation(seed) {
      const p = [];
      for (let i = 0; i < 256; i++) p[i] = i;
      
      // 使用 seed 打乱数组
      let n = seed;
      for (let i = 255; i > 0; i--) {
        n = (n * 16807) % 2147483647;
        const j = n % (i + 1);
        [p[i], p[j]] = [p[j], p[i]];
      }
      
      // 扩展到 512 个元素
      return p.concat(p);
    }

    fade(t) {
      return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(a, b, t) {
      return a + t * (b - a);
    }

    grad(hash, x, y) {
      const h = hash & 3;
      const u = h < 2 ? x : y;
      const v = h < 2 ? y : x;
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    noise(x, y) {
      const X = Math.floor(x) & 255;
      const Y = Math.floor(y) & 255;
      
      x -= Math.floor(x);
      y -= Math.floor(y);
      
      const u = this.fade(x);
      const v = this.fade(y);
      
      const p = this.permutation;
      const A = p[X] + Y;
      const B = p[X + 1] + Y;
      
      return this.lerp(
        this.lerp(this.grad(p[A], x, y), this.grad(p[B], x - 1, y), u),
        this.lerp(this.grad(p[A + 1], x, y - 1), this.grad(p[B + 1], x - 1, y - 1), u),
        v
      );
    }

    // 分形噪声 (FBM)
    fbm(x, y, octaves = 4, persistence = 0.5, lacunarity = 2) {
      let total = 0;
      let frequency = 1;
      let amplitude = 1;
      let maxValue = 0;
      
      for (let i = 0; i < octaves; i++) {
        total += this.noise(x * frequency, y * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
      }
      
      return total / maxValue;
    }
  }

  // 宣纸底纹生成器
  class InkPaperBackground {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.perlin = new PerlinNoise(42);
      this.options = {
        baseColor: { r: 245, g: 245, b: 220 }, // #F5F5DC 米白色
        inkColor: { r: 60, g: 55, b: 50 },      // 淡墨色
        noiseScale: 0.008,
        intensity: 0.15,
        fiberDensity: 0.3,
        grainAmount: 0.08
      };
    }

    // 初始化 Canvas
    init() {
      // 创建 canvas 元素
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'ink-paper-bg';
      this.canvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
        pointer-events: none;
      `;
      
      // 插入到 body 的第一个子元素
      document.body.insertBefore(this.canvas, document.body.firstChild);
      
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      
      // 监听窗口大小变化
      window.addEventListener('resize', () => this.resize());
      
      // 绘制底纹
      this.render();
    }

    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.render();
    }

    // 渲染宣纸底纹
    render() {
      const { width, height } = this.canvas;
      const imageData = this.ctx.createImageData(width, height);
      const data = imageData.data;
      
      const { baseColor, inkColor, noiseScale, intensity, fiberDensity, grainAmount } = this.options;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          
          // 多层噪声叠加
          const noise1 = this.perlin.fbm(x * noiseScale, y * noiseScale, 4, 0.5, 2);
          const noise2 = this.perlin.fbm(x * noiseScale * 2 + 100, y * noiseScale * 2 + 100, 3, 0.6, 2);
          const noise3 = this.perlin.fbm(x * noiseScale * 0.5, y * noiseScale * 0.5, 2, 0.4, 2);
          
          // 纤维纹理 (细长噪声)
          const fiberNoise = Math.abs(this.perlin.noise(x * noiseScale * 3, y * noiseScale * 0.5));
          
          // 颗粒感
          const grain = (Math.random() - 0.5) * grainAmount;
          
          // 组合噪声
          const combinedNoise = (
            noise1 * 0.5 +
            noise2 * 0.25 +
            noise3 * 0.15 +
            fiberNoise * fiberDensity * 0.1 +
            grain
          );
          
          // 计算颜色
          const inkEffect = combinedNoise * intensity;
          
          // 边缘渐变 (模拟宣纸陈旧感)
          const edgeFade = Math.min(
            x / 100,
            (width - x) / 100,
            y / 100,
            (height - y) / 100
          );
          const edgeEffect = Math.max(0, edgeFade - 0.5) * 0.1;
          
          const totalEffect = Math.max(0, inkEffect - edgeEffect);
          
          // 混合颜色
          data[idx] = Math.floor(baseColor.r - (baseColor.r - inkColor.r) * totalEffect);
          data[idx + 1] = Math.floor(baseColor.g - (baseColor.g - inkColor.g) * totalEffect);
          data[idx + 2] = Math.floor(baseColor.b - (baseColor.b - inkColor.b) * totalEffect);
          data[idx + 3] = 255; // 不透明
        }
      }
      
      this.ctx.putImageData(imageData, 0, 0);
      
      // 添加一些随机的墨点效果
      this.addInkSpecks();
    }

    // 添加墨点效果
    addInkSpecks() {
      const { width, height } = this.canvas;
      const { inkColor } = this.options;
      
      // 随机墨点数量
      const speckCount = Math.floor((width * height) / 50000);
      
      for (let i = 0; i < speckCount; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 3 + 1;
        const opacity = Math.random() * 0.1 + 0.02;
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(${inkColor.r}, ${inkColor.g}, ${inkColor.b}, ${opacity})`;
        this.ctx.fill();
      }
    }

    // 动态更新 (可选)
    update() {
      // 可以在这里添加动态效果
    }
  }

  // 初始化
  function initInkPaperBackground() {
    // 等待 DOM 加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        const bg = new InkPaperBackground();
        bg.init();
        window.InkPaperBackground = bg;
      });
    } else {
      const bg = new InkPaperBackground();
      bg.init();
      window.InkPaperBackground = bg;
    }
  }

  // 启动
  initInkPaperBackground();

})();
