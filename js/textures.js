// ============================================================
// Procedural PS1 texture factory.
// Everything is painted on small canvases (64..256) with a
// hand-picked limited palette, point-sampled, no mipmaps,
// shading baked in (PS1 had no realtime shadows).
// ============================================================
import * as THREE from 'three';

const cache = new Map();

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function finish(canvas, { repeat = [1, 1] } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// scatter darker/lighter single pixels = film grain / dithered paint feel
function grain(ctx, w, h, amount = 260, alpha = 0.08) {
  for (let i = 0; i < amount; i++) {
    const x = Math.random() * w | 0, y = Math.random() * h | 0;
    ctx.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha * 0.6})`;
    ctx.fillRect(x, y, 1, 1);
  }
}

// ---------- painters ----------

function paintHull(c, { base = '#8a6d4e', plate = '#9c7f5c', dark = '#4a3826', trim = '#c8a878' } = {}) {
  const ctx = c.getContext('2d'), w = c.width, h = c.height;
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  // plate grid with baked top-light
  const rows = 4, cols = 4;
  for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
    const x = col * w / cols, y = r * h / rows, pw = w / cols, ph = h / rows;
    ctx.fillStyle = (r + col) % 3 === 0 ? plate : base;
    ctx.fillRect(x + 1, y + 1, pw - 2, ph - 2);
    // baked bevel: light top edge, dark bottom edge
    ctx.fillStyle = 'rgba(255,235,200,0.28)'; ctx.fillRect(x + 1, y + 1, pw - 2, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect(x + 1, y + ph - 2, pw - 2, 1);
    // rivets
    ctx.fillStyle = dark;
    ctx.fillRect(x + 2, y + 3, 1, 1); ctx.fillRect(x + pw - 3, y + 3, 1, 1);
    // occasional vent / hatch
    if ((r * 7 + col * 3) % 5 === 0) {
      ctx.fillStyle = dark; ctx.fillRect(x + 4, y + 4, pw - 8, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x + 4, y + 6, pw - 8, 1);
    }
    if ((r + col) % 4 === 1) {
      ctx.fillStyle = trim; ctx.fillRect(x + 5, y + 5, 3, 3);
      ctx.fillStyle = dark; ctx.fillRect(x + 6, y + 6, 1, 1);
    }
  }
  // rust streaks
  ctx.fillStyle = 'rgba(120,60,30,0.4)';
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * w | 0, y = Math.random() * h * 0.7 | 0, len = 3 + Math.random() * 9;
    ctx.fillRect(x, y, 1, len);
  }
  grain(ctx, w, h);
}

function paintFighter(c) {
  const ctx = c.getContext('2d'), w = c.width, h = c.height;
  ctx.fillStyle = '#5f6b78'; ctx.fillRect(0, 0, w, h);
  // panel runs
  ctx.fillStyle = '#4a5560';
  for (let i = 0; i < 6; i++) ctx.fillRect(0, i * 10 + 2, w, 5);
  ctx.fillStyle = 'rgba(220,240,255,0.25)'; ctx.fillRect(0, 0, w, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, h - 3, w, 3);
  // canopy stripe
  ctx.fillStyle = '#2b3a4d'; ctx.fillRect(0, h * 0.42 | 0, w, 4);
  ctx.fillStyle = '#7fd4ff'; ctx.fillRect(2, h * 0.42 | 0, 6, 4);
  // kill marks
  ctx.fillStyle = '#ffd27f';
  for (let i = 0; i < 5; i++) ctx.fillRect(w - 10 - i * 3, 6, 2, 2);
  grain(ctx, w, h, 160);
}

function paintBands(c, palette, { wobble = 3, storms = 2 } = {}) {
  const ctx = c.getContext('2d'), w = c.width, h = c.height;
  ctx.fillStyle = palette[0]; ctx.fillRect(0, 0, w, h);
  const nBands = palette.length * 2 + 4;
  for (let i = 0; i < nBands; i++) {
    const y = (i / nBands) * h;
    const bh = h / nBands;
    const col = palette[i % palette.length];
    ctx.fillStyle = col;
    // horizontal band with sine-wobbled edges = gas turbulence
    ctx.beginPath();
    const ph = Math.random() * 6.28, amp = wobble;
    ctx.moveTo(0, y + Math.sin(ph) * amp);
    for (let x = 0; x <= w; x += 4) ctx.lineTo(x, y + Math.sin(ph + x / w * 6.28 * (1 + (i % 3))) * amp);
    for (let x = w; x >= 0; x -= 4) ctx.lineTo(x, y + bh + Math.sin(ph * 2 + x / w * 9) * amp);
    ctx.closePath(); ctx.fill();
  }
  // oval storms
  for (let s = 0; s < storms; s++) {
    const sx = Math.random() * w, sy = h * (0.25 + Math.random() * 0.5);
    const sw = 8 + Math.random() * 14, sh = sw * 0.45;
    ctx.fillStyle = palette[palette.length - 1];
    ctx.beginPath(); ctx.ellipse(sx, sy, sw, sh, 0, 0, 6.29); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(sx, sy, sw * 0.6, sh * 0.6, 0, 0, 6.29); ctx.stroke();
  }
  grain(ctx, w, h, 400, 0.06);
}

function paintClouds(c) {
  const ctx = c.getContext('2d'), w = c.width, h = c.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,250,240,0.85)';
  for (let i = 0; i < 9; i++) {
    const y = Math.random() * h, bh = 2 + Math.random() * 5;
    ctx.beginPath();
    const ph = Math.random() * 6.28;
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 4) ctx.lineTo(x, y + Math.sin(ph + x / w * 10) * 2);
    ctx.lineTo(w, y + bh); ctx.lineTo(0, y + bh); ctx.fill();
  }
}

function paintRingDisc(c) {
  const ctx = c.getContext('2d'), w = c.width, h = c.height, cx = w / 2, cy = h / 2;
  ctx.clearRect(0, 0, w, h);
  const cols = ['#a89577', '#c9b894', '#8d7c62', '#d8c9a8', '#6e5f4a', '#bfa87e'];
  const R = w / 2;
  const bands = [
    [0.42, 0.50, 0.55], [0.50, 0.85, 0.9], [0.55, 0.7, 1.0],
    [0.72, 0.9, 0.75], [0.90, 0.985, 0.95], // Cassini-ish gaps between
  ];
  for (const [r0, r1, alpha] of bands) {
    for (let rr = r0 * R; rr < r1 * R; rr += 1.2) {
      ctx.strokeStyle = cols[(rr * 3 | 0) % cols.length];
      ctx.globalAlpha = alpha * (0.55 + 0.4 * Math.sin(rr * 0.7));
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.29); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function paintRock(c, { base = '#6b5a48', light = '#8a7660', dark = '#3d3227' } = {}) {
  const ctx = c.getContext('2d'), w = c.width, h = c.height;
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  // chunky craters with baked light
  for (let i = 0; i < 22; i++) {
    const x = Math.random() * w | 0, y = Math.random() * h | 0;
    const r = 1 + Math.random() * 4;
    ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.45, 0, 6.29); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,240,210,0.15)'; ctx.fillRect(0, 0, w, 2);
  grain(ctx, w, h, 500, 0.1);
}

function paintIce(c) {
  const ctx = c.getContext('2d'), w = c.width, h = c.height;
  ctx.fillStyle = '#9fb4c4'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#c9dbe8';
  for (let i = 0; i < 14; i++) ctx.fillRect(Math.random() * w | 0, Math.random() * h | 0, 3 + Math.random() * 6, 2);
  ctx.fillStyle = '#6c8296';
  for (let i = 0; i < 10; i++) ctx.fillRect(Math.random() * w | 0, Math.random() * h | 0, 4, 1);
  grain(ctx, w, h, 300, 0.12);
}

function paintMetal(c, { base = '#5a6070', warn = true } = {}) {
  const ctx = c.getContext('2d'), w = c.width, h = c.height;
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(0, i * h / 4); ctx.lineTo(w, i * h / 4); ctx.stroke(); }
  for (let i = 0; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * w / 2, 0); ctx.lineTo(i * w / 2, h); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(0, 0, w, 1);
  if (warn) { // hazard stripes strip
    ctx.save(); ctx.beginPath(); ctx.rect(0, h - 8, w, 8); ctx.clip();
    for (let x = -h; x < w + h; x += 8) {
      ctx.fillStyle = '#c8a020'; ctx.fillRect(x, h - 8, 4, 8);
      ctx.fillStyle = '#20242c'; ctx.fillRect(x + 4, h - 8, 4, 8);
    }
    ctx.restore();
  }
  // rust
  ctx.fillStyle = 'rgba(130,70,35,0.35)';
  for (let i = 0; i < 18; i++) ctx.fillRect(Math.random() * w | 0, Math.random() * h | 0, 1 + Math.random() * 2, 2 + Math.random() * 6);
  grain(ctx, w, h, 320, 0.09);
}

function paintWall(c) {
  const ctx = c.getContext('2d'), w = c.width, h = c.height;
  ctx.fillStyle = '#39404e'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#2c3240';
  ctx.fillRect(0, 0, w, 8); ctx.fillRect(0, h - 8, w, 8);
  // vents
  ctx.fillStyle = '#1e222c';
  ctx.fillRect(8, 14, 20, 16);
  ctx.fillStyle = '#4a5262';
  for (let i = 0; i < 5; i++) ctx.fillRect(9, 16 + i * 3, 18, 1);
  // small window port + rivets
  ctx.fillStyle = '#141821'; ctx.fillRect(40, 12, 12, 12);
  ctx.fillStyle = '#0a1a2e'; ctx.fillRect(41, 13, 10, 10);
  ctx.fillStyle = '#5a6272';
  for (let i = 0; i < 8; i++) ctx.fillRect(4 + (i % 4) * 18, 2 + ((i / 4) | 0) * (h - 6), 1, 1);
  grain(ctx, w, h, 200, 0.07);
}

function paintFloor(c) {
  const ctx = c.getContext('2d'), w = c.width, h = c.height;
  ctx.fillStyle = '#23282f'; ctx.fillRect(0, 0, w, h);
  const n = 4;
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) {
    const x = col * w / n, y = r * h / n, pw = w / n, ph = h / n;
    ctx.fillStyle = (r + col) % 2 ? '#282e37' : '#232830';
    ctx.fillRect(x + 1, y + 1, pw - 2, ph - 2);
    ctx.fillStyle = 'rgba(120,150,190,0.10)'; ctx.fillRect(x + 1, y + 1, pw - 2, 1);
  }
  // faint glowing guide seam
  ctx.fillStyle = 'rgba(90,170,255,0.28)';
  ctx.fillRect(0, h / 2 - 1, w, 1);
  grain(ctx, w, h, 240, 0.06);
}

function paintGlow(c, inner, mid) {
  const ctx = c.getContext('2d'), w = c.width, h = c.height;
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, mid);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // quantize the gradient into rings = PS1 additive sprite look
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(d[i] / 32) * 32;
    d[i + 1] = Math.round(d[i + 1] / 32) * 32;
    d[i + 2] = Math.round(d[i + 2] / 32) * 32;
  }
  ctx.putImageData(img, 0, 0);
}

function paintStar(c) {
  const ctx = c.getContext('2d'), w = c.width, h = c.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.fillRect(w / 2 - 1, h / 2 - 1, 2, 2);
  ctx.fillStyle = 'rgba(200,220,255,0.6)';
  ctx.fillRect(w / 2 - 2, h / 2, 1, 1); ctx.fillRect(w / 2 + 1, h / 2, 1, 1);
  ctx.fillRect(w / 2, h / 2 - 2, 1, 1); ctx.fillRect(w / 2, h / 2 + 1, 1, 1);
}

function paintStreak(c) {
  const ctx = c.getContext('2d'), w = c.width, h = c.height;
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.95)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, h / 2 - 1, w, 2);
}

function paintExplosion(c) {
  const ctx = c.getContext('2d'), w = c.width, h = c.height, cx = w / 2, cy = h / 2;
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
  g.addColorStop(0, 'rgba(255,255,230,1)');
  g.addColorStop(0.25, 'rgba(255,220,120,0.95)');
  g.addColorStop(0.5, 'rgba(255,120,40,0.7)');
  g.addColorStop(0.75, 'rgba(180,40,20,0.3)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  // chunky fireball: a few offset blobs instead of one smooth circle
  ctx.beginPath(); ctx.arc(cx, cy, w * 0.42, 0, 6.29); ctx.fill();
  ctx.beginPath(); ctx.arc(cx - 8, cy + 6, w * 0.22, 0, 6.29); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 10, cy - 8, w * 0.26, 0, 6.29); ctx.fill();
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(d[i] / 36) * 36; d[i + 1] = Math.round(d[i + 1] / 36) * 36; d[i + 2] = Math.round(d[i + 2] / 36) * 36;
  }
  ctx.putImageData(img, 0, 0);
}

// ---------- public API ----------

const PAINTERS = {
  hull: c => paintHull(c),
  hull2: c => paintHull(c, { base: '#62707c', plate: '#75838f', dark: '#39434c', trim: '#b8c4cc' }),
  fighter: c => paintFighter(c),
  planetFire: c => paintBands(c, ['#7a2f18', '#c86a30', '#e8a050', '#8a3a1e', '#f0c070'], { wobble: 3, storms: 3 }),
  planetCream: c => paintBands(c, ['#b09060', '#d8c090', '#e8dcc0', '#987848', '#c8b488'], { wobble: 4, storms: 2 }),
  planetBlue: c => paintBands(c, ['#20355e', '#2e4f88', '#4a74b0', '#16264a', '#7aa0d0'], { wobble: 3, storms: 2 }),
  clouds: c => paintClouds(c),
  ringDisc: c => paintRingDisc(c),
  rock: c => paintRock(c),
  rockBlue: c => paintRock(c, { base: '#4a5668', light: '#68788e', dark: '#2a3242' }),
  ice: c => paintIce(c),
  metal: c => paintMetal(c),
  metalBlue: c => paintMetal(c, { base: '#485062' }),
  wall: c => paintWall(c),
  floor: c => paintFloor(c),
  glowSun: c => paintGlow(c, 'rgba(255,255,240,1)', 'rgba(255,220,140,0.55)'),
  glowOrange: c => paintGlow(c, 'rgba(255,190,90,0.95)', 'rgba(255,110,30,0.4)'),
  glowBlue: c => paintGlow(c, 'rgba(210,235,255,0.95)', 'rgba(90,140,255,0.38)'),
  glowCyan: c => paintGlow(c, 'rgba(220,255,255,0.95)', 'rgba(60,220,255,0.4)'),
  glowViolet: c => paintGlow(c, 'rgba(235,215,255,0.95)', 'rgba(150,90,255,0.4)'),
  glowRed: c => paintGlow(c, 'rgba(255,120,90,0.95)', 'rgba(255,40,20,0.4)'),
  glowWhite: c => paintGlow(c, 'rgba(255,255,255,1)', 'rgba(220,230,255,0.5)'),
  star: c => paintStar(c),
  streak: c => paintStreak(c),
  explosion: c => paintExplosion(c),
};

const SIZES = {
  hull: 128, hull2: 128, fighter: 64, planetFire: 128, planetCream: 128, planetBlue: 128,
  clouds: 128, ringDisc: 256, rock: 64, rockBlue: 64, ice: 64,
  metal: 64, metalBlue: 64, wall: 64, floor: 64,
  glowSun: 64, glowOrange: 64, glowBlue: 64, glowCyan: 64, glowViolet: 64, glowRed: 64, glowWhite: 64,
  star: 16, streak: 64, explosion: 64,
};

export function tex(name, opts = {}) {
  if (!cache.has(name)) {
    const c = makeCanvas(SIZES[name] || 64, SIZES[name] || 64);
    PAINTERS[name](c);
    cache.set(name, finish(c, opts));
  }
  const t = cache.get(name);
  if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
  return t;
}

// Dynamic console screen texture: scrolling fake telemetry.
export function makeScreen(fg = '#7dffb0', bg = '#04140a', accent = '#ffd27f') {
  const w = 64, h = 48;
  const c = makeCanvas(w, h), ctx = c.getContext('2d');
  const t = finish(c);
  let phase = 0;
  const rows = [];
  for (let i = 0; i < 10; i++) rows.push(0.3 + Math.random() * 0.4);
  function redraw() {
    phase += 1;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    // scan bar
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, (phase * 3) % h, w, 3);
    // header
    ctx.fillStyle = accent; ctx.fillRect(2, 2, 20, 5);
    ctx.fillStyle = fg;
    for (let i = 0; i < 9; i++) {
      const y = 10 + i * 4;
      const v = Math.abs(Math.sin(phase * 0.06 + i * 1.7)) * rows[i];
      ctx.fillRect(2, y, Math.max(2, v * 40), 2);
      if (i % 3 === 0) ctx.fillRect(46 + ((phase / 7 + i * 5) % 14 | 0), y, 2, 2);
    }
    // waveform
    ctx.fillStyle = fg;
    for (let x = 0; x < w - 4; x += 2) {
      const y = h - 6 + Math.sin(x * 0.3 + phase * 0.15) * 3 * Math.sin(phase * 0.03 + x * 0.05);
      ctx.fillRect(x + 2, y | 0, 2, 1);
    }
    t.needsUpdate = true;
  }
  redraw();
  return { texture: t, update(tSec) { if ((tSec * 6 | 0) !== ((tSec - 0.016) * 6 | 0)) redraw(); } };
}
