/**
 * Kira-Hexo 博客头像绽放绚丽 Canvas 烟花/彩虹粒子特效
 */
(function () {
  let canvas, ctx;
  let particles = [];
  let animationId = null;

  function initCanvas() {
    canvas = document.createElement('canvas');
    canvas.id = 'avatar-fireworks-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  // 绚丽霓虹/彩虹色彩池
  const colors = [
    '#31aeff', '#ff4e6a', '#ffb900', '#33d57a',
    '#00dfff', '#ff4500', '#9090ff', '#e76a8d',
    '#ff71ce', '#01cdfe', '#05ffa1', '#b967ff'
  ];

  function Particle(x, y) {
    this.x = x;
    this.y = y;
    this.color = colors[Math.floor(Math.random() * colors.length)];
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 3;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - (Math.random() * 3); // 稍微向上冲
    this.friction = 0.96;
    this.gravity = 0.18;
    this.alpha = 1.0;
    this.decay = Math.random() * 0.018 + 0.012;
    this.size = Math.random() * 5 + 3;
    this.shape = Math.random() > 0.4 ? 'circle' : (Math.random() > 0.5 ? 'heart' : 'star');
  }

  Particle.prototype.update = function () {
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
    this.size = Math.max(0, this.size - 0.03);
  };

  Particle.prototype.draw = function (ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'heart') {
      ctx.beginPath();
      const s = this.size * 1.2;
      ctx.moveTo(this.x, this.y);
      ctx.bezierCurveTo(this.x - s / 2, this.y - s / 2, this.x - s, this.y + s / 3, this.x, this.y + s);
      ctx.bezierCurveTo(this.x + s, this.y + s / 3, this.x + s / 2, this.y - s / 2, this.x, this.y);
      ctx.fill();
    } else { // star
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(
          this.x + Math.cos((18 + i * 72) * Math.PI / 180) * this.size,
          this.y - Math.sin((18 + i * 72) * Math.PI / 180) * this.size
        );
        ctx.lineTo(
          this.x + Math.cos((54 + i * 72) * Math.PI / 180) * (this.size / 2),
          this.y - Math.sin((54 + i * 72) * Math.PI / 180) * (this.size / 2)
        );
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  };

  function explode(x, y) {
    const particleCount = 70;
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle(x, y));
    }
    if (!animationId) {
      animate();
    }
  }

  function animate() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw(ctx);
      if (p.alpha <= 0 || p.size <= 0) {
        particles.splice(i, 1);
      }
    }

    if (particles.length > 0) {
      animationId = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      animationId = null;
    }
  }

  function bindAvatarClick() {
    if (!canvas) initCanvas();

    document.addEventListener('click', function (e) {
      const avatarElem = e.target.closest('.kira-avatar');
      if (avatarElem) {
        e.preventDefault();
        e.stopPropagation();
        const rect = avatarElem.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // 触发多重爆破效果
        explode(centerX, centerY);
        setTimeout(() => explode(centerX, centerY), 100);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAvatarClick);
  } else {
    bindAvatarClick();
  }
})();
