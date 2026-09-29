// ============================================================
// STELLAR ECHOES - global config
// PS1 authenticity constants (NTSC): 320x240 framebuffer,
// RGB555 color, 4x4 ordered dither, 30fps cap.
// ============================================================

export const RT_W = 320;
export const RT_H = 240;
export const FPS_AUTHENTIC = 30;
export const FPS_MODERN = 60;

// Live toggles (bound by debug panel). Shared by ps1.js / post.js / audio.js.
export const Toggles = {
  affine: true,     // 仿射纹理映射 (affine texture warping)
  jitter: true,     // 顶点吸附抖动 (vertex snapping)
  quantize: true,   // RGB555 色彩量化 (15-bit color)
  dither: true,     // 4x4 Bayer 有序抖动
  crt: true,        // CRT 复合信号 (scanlines + composite bleed + barrel)
  fog: true,        // 距离雾
  light: true,      // 顶点光照 (off = unlit fullbright)
  fps30: true,      // 帧率上限 30/60
  sound: false,     // audio starts muted, enabled on user gesture
};

// URL hooks for deterministic capture:
//   ?scene=orbit&t=3.2  -> skip boot/title, render one frame at t, set window.__ready
const params = new URLSearchParams(location.search);
export const CAPTURE = {
  scene: params.get('scene'),
  t: params.get('t') !== null ? parseFloat(params.get('t')) : null,
  fx: (params.get('fx') || '').split(',').filter(Boolean),   // e.g. fx=nocrt,noaffine
};

export const SCENE_ORDER = ['orbit', 'rings', 'belt', 'warp', 'window'];
