const CONFIG = {
  particleCount:   1200,
  scatterDuration: 1800,
  textDuration:    4000,
  circleDuration:  2000,
  mouseRadius:     100,
  repulsionForce:  6,
};

const canvas = document.getElementById('animation-canvas');
const ctx    = canvas.getContext('2d');

let width, height;
let particles  = [];
let textPoints = [];
let discPoints = [];

let currentPhase   = 'TEXT';
let phaseStartTime = Date.now();

const mouse = { x: -1000, y: -1000, radius: CONFIG.mouseRadius };

// ─── Canvas sizing ────────────────────────────────────────────────────────────
function initCanvasSize() {
  const dpr = window.devicePixelRatio || 1;
  width  = window.innerWidth;
  height = window.innerHeight;
  canvas.width  = width  * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
}

// ─── Text pixel sampling ─────────────────────────────────────────────────────
function generateTextPoints() {
  const off  = document.createElement('canvas');
  const oCtx = off.getContext('2d');
  const vw = 1000, vh = 300;
  off.width = vw; off.height = vh;

  oCtx.fillStyle = '#fff';
  oCtx.font = '700 80px "Space Mono", monospace';
  oCtx.textAlign = 'center';
  oCtx.textBaseline = 'middle';
  oCtx.fillText('[penggurin]', vw / 2, vh / 2);

  const img  = oCtx.getImageData(0, 0, vw, vh);
  const pts  = [];
  const step = 5;
  for (let y = 0; y < vh; y += step)
    for (let x = 0; x < vw; x += step)
      if (img.data[(y * vw + x) * 4 + 3] > 128)
        pts.push({ x: x - vw / 2, y: y - vh / 2 });
  return pts;
}

// ─── Filled disc grid ────────────────────────────────────────────────────────
function generateDiscPoints(radius) {
  const pts  = [];
  const step = 4;
  for (let dy = -radius; dy <= radius; dy += step)
    for (let dx = -radius; dx <= radius; dx += step)
      if (dx * dx + dy * dy <= radius * radius)
        pts.push({ x: dx, y: dy });
  return pts;
}

// ─── Particle ─────────────────────────────────────────────────────────────────
class Particle {
  constructor(index) {
    this.index = index;
    this.size  = 1.6;
    this.resetToRandom();
  }

  resetToRandom() {
    this.x  = Math.random() * width;
    this.y  = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.targetX = this.x;
    this.targetY = this.y;
  }

  update(cx, cy) {
    if (currentPhase === 'SCATTER') {
      this.targetX += (Math.random() - 0.5) * 0.5;
      this.targetY += (Math.random() - 0.5) * 0.5;
      if (this.targetX < 0)      this.targetX = width;
      if (this.targetX > width)  this.targetX = 0;
      if (this.targetY < 0)      this.targetY = height;
      if (this.targetY > height) this.targetY = 0;

    } else if (currentPhase === 'TEXT') {
      const scale = width < 640 ? (width / 1000) * 0.85 : Math.min(1.0, width / 1200);
      if (textPoints.length > 0) {
        const pt = textPoints[this.index % textPoints.length];
        this.targetX = cx + pt.x * scale;
        this.targetY = cy + pt.y * scale;
      }

    } else if (currentPhase === 'DISC' || currentPhase === 'REVEAL') {
      if (discPoints.length > 0) {
        const pt = discPoints[this.index % discPoints.length];
        this.targetX = cx + pt.x;
        this.targetY = cy + pt.y;
      }
    }

    // Mouse repulsion
    const mdx   = this.x - mouse.x;
    const mdy   = this.y - mouse.y;
    const mDist = Math.hypot(mdx, mdy);
    const under = mDist < mouse.radius;

    const spring   = under ? 0.025 : 0.022;
    const friction = under ? 0.88  : 0.84;

    this.vx += (this.targetX - this.x) * spring;
    this.vy += (this.targetY - this.y) * spring;

    if (under && mDist > 0) {
      const force = (mouse.radius - mDist) / mouse.radius;
      this.vx += (mdx / mDist) * force * CONFIG.repulsionForce;
      this.vy += (mdy / mDist) * force * CONFIG.repulsionForce;
    }

    // Clamp velocity so no particle goes haywire
    this.vx = Math.max(-10, Math.min(10, this.vx));
    this.vy = Math.max(-10, Math.min(10, this.vy));

    this.vx *= friction;
    this.vy *= friction;
    this.x  += this.vx;
    this.y  += this.vy;
  }

  draw(alpha) {
    const isDark = document.documentElement.dataset.theme === 'dark';
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = isDark ? '#f0f0f0' : '#111';
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function initParticles(count) {
  particles = [];
  for (let i = 0; i < count; i++)
    particles.push(new Particle(i));
}

// ─── Reveal ───────────────────────────────────────────────────────────────────
function triggerReveal() {
  const profile     = document.getElementById('profile-container');
  const profileText = document.getElementById('profile-text');
  const portfolio   = document.getElementById('portfolio-content');
  const canvasEl    = document.getElementById('animation-canvas');

  if (profile) profile.style.opacity = '1';

  canvasEl.style.transition = 'opacity 1200ms ease-out';
  canvasEl.style.opacity    = '0';

  setTimeout(() => {
    if (profileText) {
      profileText.style.opacity = '1';
      // Start typing after fade-in completes
      setTimeout(() => {
        if (window.startTyping) window.startTyping();
      }, 800);
    }
    if (portfolio) {
      portfolio.style.opacity       = '1';
      portfolio.style.pointerEvents = 'auto';
    }
  }, 1200);
}

// ─── Animation loop ───────────────────────────────────────────────────────────
function animate() {
  ctx.clearRect(0, 0, width, height);

  if (currentPhase === 'TEXT') {
    const isDark = document.documentElement.dataset.theme === 'dark';
    ctx.fillStyle = isDark ? 'rgba(15,15,15,1)' : 'rgba(245,245,245,1)';
    ctx.fillRect(0, 0, width, height);
  }

  const cx = width  / 2;
  const cy = height / 2;

  // Fixed radius matching CSS: 176px on mobile, 224px on md+
  const circleRadius = window.innerWidth >= 768 ? 112 : 88;

  const elapsed = Date.now() - phaseStartTime;

  if (currentPhase === 'TEXT' && elapsed > CONFIG.textDuration) {
    // Build disc to match the profile pic size exactly
    discPoints = generateDiscPoints(circleRadius);
    // Grow particle pool to fill the disc completely
    while (particles.length < discPoints.length)
      particles.push(new Particle(particles.length));
    particles.forEach((p, i) => { p.index = i; });
    currentPhase   = 'DISC';
    phaseStartTime = Date.now();

  } else if (currentPhase === 'DISC' && elapsed > CONFIG.circleDuration) {
    currentPhase   = 'REVEAL';
    phaseStartTime = Date.now();
    triggerReveal();
  }

  let alpha = 1;
  if (currentPhase === 'REVEAL')
    alpha = Math.max(0, 1 - (Date.now() - phaseStartTime) / 1200);

  for (const p of particles) {
    p.update(cx, cy);
    p.draw(alpha);
  }

  requestAnimationFrame(animate);
}

// ─── Events ───────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const ow = width, oh = height;
  initCanvasSize();
  particles.forEach(p => {
    p.x = (p.x / ow) * width;
    p.y = (p.y / oh) * height;
    if (currentPhase === 'SCATTER') { p.targetX = p.x; p.targetY = p.y; }
  });
});

window.addEventListener('mousemove',  e  => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mouseleave', ()  => { mouse.x = -1000; mouse.y = -1000; });
window.addEventListener('touchmove',  e  => {
  if (e.touches.length > 0) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }
});
window.addEventListener('touchend', () => { mouse.x = -1000; mouse.y = -1000; });

// ─── Boot ─────────────────────────────────────────────────────────────────────
initCanvasSize();
const bootRadius = window.innerWidth >= 768 ? 112 : 88;
discPoints = generateDiscPoints(bootRadius);

// Wait for Space Mono to load before sampling text pixels
// so we get clean glyph outlines, not a fallback rectangle
document.fonts.ready.then(() => {
  textPoints = generateTextPoints();
  initParticles(Math.max(CONFIG.particleCount, textPoints.length, discPoints.length));
  animate();
});
