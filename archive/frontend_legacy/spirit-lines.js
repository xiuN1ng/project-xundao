/**
 * 引灵入体粒子效果
 * 从屏幕边缘向中心汇聚的贝塞尔曲线灵气粒子
 */

class SpiritLines {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.isRunning = false;
        this.animationId = null;
        this.lastSpawnTime = 0;
        this.spawnInterval = 200; // 每秒5个 = 200ms一个
        this.centerX = 0;
        this.centerY = 0;
        
        // 颜色配置
        this.colors = [
            { r: 168, g: 216, b: 185 }, // #A8D8B9 淡青色
            { r: 255, g: 215, b: 0 }     // 金色
        ];
    }

    init() {
        // 创建canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'spiritLinesCanvas';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9998;
        `;
        
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.isRunning = true;
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
    }

    // 生成随机贝塞尔曲线控制点
    generateBezierPoints(startX, startY) {
        const cp1x = startX + (Math.random() - 0.5) * this.canvas.width * 0.8;
        const cp1y = startY + (Math.random() - 0.5) * this.canvas.height * 0.8;
        const cp2x = this.centerX + (Math.random() - 0.5) * 200;
        const cp2y = this.centerY + (Math.random() - 0.5) * 200;
        
        return { cp1x, cp1y, cp2x, cp2y };
    }

    // 从屏幕边缘生成起点
    getEdgePosition() {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        switch(side) {
            case 0: // 上边
                x = Math.random() * this.canvas.width;
                y = -20;
                break;
            case 1: // 右边
                x = this.canvas.width + 20;
                y = Math.random() * this.canvas.height;
                break;
            case 2: // 下边
                x = Math.random() * this.canvas.width;
                y = this.canvas.height + 20;
                break;
            case 3: // 左边
                x = -20;
                y = Math.random() * this.canvas.height;
                break;
        }
        
        return { x, y };
    }

    createParticle() {
        const startPos = this.getEdgePosition();
        const controlPoints = this.generateBezierPoints(startPos.x, startPos.y);
        
        // 随机选择颜色
        const colorIndex = Math.random() > 0.4 ? 1 : 0;
        const baseColor = this.colors[colorIndex];
        
        return {
            startX: startPos.x,
            startY: startPos.y,
            cp1x: controlPoints.cp1x,
            cp1y: controlPoints.cp1y,
            cp2x: controlPoints.cp2x,
            cp2y: controlPoints.cp2y,
            endX: this.centerX,
            endY: this.centerY,
            progress: 0,
            speed: 0.008 + Math.random() * 0.006, // 随机速度
            color: baseColor,
            width: 3 + Math.random() * 2, // 头部宽度
            glow: 8 + Math.random() * 6,   // 发光强度
            life: 1,
            decay: 0.015 + Math.random() * 0.01
        };
    }

    // 三次贝塞尔曲线计算
    cubicBezier(t, p0, p1, p2, p3) {
        const oneMinusT = 1 - t;
        return oneMinusT * oneMinusT * oneMinusT * p0 +
               3 * oneMinusT * oneMinusT * t * p1 +
               3 * oneMinusT * t * t * p2 +
               t * t * t * p3;
    }

    drawParticle(p) {
        // 计算当前位置
        const x = this.cubicBezier(p.progress, p.startX, p.cp1x, p.cp2x, p.endX);
        const y = this.cubicBezier(p.progress, p.startY, p.cp1y, p.cp2y, p.endY);
        
        // 计算尾部位置（留出一点尾迹）
        const tailProgress = Math.max(0, p.progress - 0.15);
        const tailX = this.cubicBezier(tailProgress, p.startX, p.cp1x, p.cp2x, p.endX);
        const tailY = this.cubicBezier(tailProgress, p.startY, p.cp1y, p.cp2y, p.endY);
        
        // 计算渐变透明度（尾部透明，头部高亮）
        const alpha = p.life;
        
        this.ctx.save();
        
        // 绘制发光效果
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, p.glow);
        gradient.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha * 0.8})`);
        gradient.addColorStop(0.4, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha * 0.3})`);
        gradient.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, p.glow, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // 绘制粒子头部（亮点）
        this.ctx.beginPath();
        this.ctx.arc(x, y, p.width * 0.5, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        this.ctx.fill();
        
        // 绘制尾迹线条
        this.ctx.beginPath();
        this.ctx.moveTo(tailX, tailY);
        this.ctx.lineTo(x, y);
        
        const lineGradient = this.ctx.createLinearGradient(tailX, tailY, x, y);
        lineGradient.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);
        lineGradient.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha * 0.6})`);
        
        this.ctx.strokeStyle = lineGradient;
        this.ctx.lineWidth = p.width * p.life;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    update() {
        const now = Date.now();
        
        // 生成新粒子（每秒5个）
        if (now - this.lastSpawnTime > this.spawnInterval) {
            this.particles.push(this.createParticle());
            this.lastSpawnTime = now;
        }
        
        // 更新现有粒子
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.progress += p.speed;
            p.life -= p.decay;
            
            // 到达中心或生命结束
            if (p.progress >= 1 || p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        // 清空画布（带轻微透明度制造拖尾效果）
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制所有粒子
        for (const p of this.particles) {
            this.drawParticle(p);
        }
    }

    animate() {
        if (!this.isRunning) return;
        
        this.update();
        this.draw();
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.canvas) {
            this.canvas.remove();
        }
    }

    // 触发一次集中的灵气涌入效果（用于修炼时）
    burst(count = 15) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                this.particles.push(this.createParticle());
            }, i * 30);
        }
    }
}

// 全局实例
window.spiritLines = new SpiritLines();

// 自动初始化（页面加载完成后）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // 延迟一点初始化，确保DOM完全就绪
        setTimeout(() => window.spiritLines.init(), 500);
    });
} else {
    setTimeout(() => window.spiritLines.init(), 500);
}
