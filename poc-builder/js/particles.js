/**
 * particles.js — subtle floating particle background
 * Burgundy/gold palette, low opacity
 */
(function () {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const COLORS = ['#6B1F3A','#A83558','#C9962A','#D4AA4A','#8B2A4A'];
  let W, H, particles = [], raf;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function Particle() {
    this.reset();
  }
  Particle.prototype.reset = function () {
    this.x    = Math.random() * W;
    this.y    = Math.random() * H;
    this.r    = Math.random() * 2 + .5;
    this.vx   = (Math.random() - .5) * .25;
    this.vy   = (Math.random() - .5) * .25;
    this.color= COLORS[Math.floor(Math.random() * COLORS.length)];
    this.alpha= Math.random() * .3 + .05;
    this.life = Math.random() * 300 + 200;
    this.age  = 0;
  };
  Particle.prototype.update = function () {
    this.x   += this.vx;
    this.y   += this.vy;
    this.age++;
    if (this.age > this.life || this.x < 0 || this.x > W || this.y < 0 || this.y > H) {
      this.reset();
    }
  };
  Particle.prototype.draw = function () {
    const fade = Math.sin((this.age / this.life) * Math.PI);
    ctx.globalAlpha = this.alpha * fade;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
  };

  function init() {
    resize();
    particles = Array.from({ length: 60 }, () => new Particle());
    loop();
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('DOMContentLoaded', init);
})();
