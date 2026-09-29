// ============================================================
// STELLAR ECHOES bootstrap: renderer, post chain, rig, audio,
// scenes, UI, input, main loop (30fps authentic cap), capture
// mode for deterministic screenshots (?scene=orbit&t=3.2).
// ============================================================
import * as THREE from 'three';
import { Toggles, FPS_AUTHENTIC, FPS_MODERN, CAPTURE, SCENE_ORDER, RT_W, RT_H } from './config.js';
import { PS1Global } from './ps1.js';
import { Post } from './post.js';
import { Rig } from './rig.js';
import { AudioEngine } from './audio.js';
import { SceneManager, SCENE_LIST } from './scene-manager.js';
import { UI } from './ui.js';

window.__SCENE_LIST = SCENE_LIST;

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 4 / 3, 0.1, 2000);
const post = new Post(renderer);
const rig = new Rig(camera, canvas);
const audio = new AudioEngine();
const manager = new SceneManager(scene, { camera, rig, audio, post });

const app = {
  audio, manager,
  applyToggles() {
    PS1Global.uJitter.value = Toggles.jitter ? 1 : 0;
    PS1Global.uAffine.value = Toggles.affine ? 1 : 0;
    PS1Global.uFogOn.value = Toggles.fog ? 1 : 0;
    PS1Global.uLightOn.value = Toggles.light ? 1 : 0;
    post.syncToggles();
  },
  toggleSound() { audio.setEnabled(!Toggles.sound); app.applyToggles(); },
  toggleCRT() { Toggles.crt = !Toggles.crt; applyToggles(); ui.refreshDebug(); },
  jumpTo(id) { manager.switchTo(id); },
  backToTitle() {
    manager.switchTo('orbit', { warpJump: false });
    ui.state = 'title';
    ui.hud.classList.add('hidden');
    ui.showTitle(startGame);
    audio.setScene('title');
  },
  stats: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }),
};
const ui = new UI(app);
ui.buildDebug();

let sceneIdx = 0;
manager.onSceneChanged = def => {
  sceneIdx = SCENE_ORDER.indexOf(def.id);
  ui.setSceneTag(def, sceneIdx);
  ui.toast(`WARP COMPLETE / ${def.name}`, def.jp);
};

// ---------- sizing (4:3 stage) ----------
function resize() {
  const stage = document.getElementById('stage');
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = 4 / 3;
  camera.updateProjectionMatrix();
  const pr = renderer.getPixelRatio();
  post.resize(w * pr, h * pr);
}
window.addEventListener('resize', resize);

// ---------- state ----------
let started = false;

function enterPlay() {
  started = true;
  audio.setEnabled(true);
  audio.start();
  manager.switchTo('orbit', { warpJump: false });
  rig.wantFlyOnClick = true;
  if (!ui._playedOnce) {
    ui._playedOnce = true;
    ui.toast('WARP DRIVE ONLINE', '跳躍準備完了');
  }
}

function startGame() {
  if (started && ui.state === 'playing') return;
  enterPlay();
}

// boot -> title -> game
manager.activate('orbit', { silent: true });   // attract mode behind boot/title
audio.sceneId = 'title';

if (CAPTURE.scene && CAPTURE.t !== null) {
  // deterministic single frame for screenshot tooling
  document.getElementById('ui').style.display = 'none';   // capture raw scene, no boot screen
  for (const fx of CAPTURE.fx) {
    const map = { nocrt: 'crt', noaffine: 'affine', nojit: 'jitter', nodither: 'dither', noquant: 'quantize', nofog: 'fog', nolight: 'light' };
    if (map[fx]) Toggles[map[fx]] = false;
  }
  manager.activate(CAPTURE.scene, { silent: true });
  app.applyToggles();
  resize();
  const ctx3d = { camera, rig, audio, post };
  manager.update(CAPTURE.t, 1 / 30);
  rig.update(1 / 30, CAPTURE.t);
  post.uniforms.uTime.value = CAPTURE.t;
  post.begin();
  renderer.render(scene, camera);
  post.end();
  // pixel probe: region average in RT coords (y top-down), for debugging
  window.__scene = scene; window.__camera = camera;
  window.__render = () => { post.begin(); renderer.render(scene, camera); post.end(); };
  window.__regionAvg = (x0, y0, x1, y1) => {
    const w = x1 - x0, h = y1 - y0;
    const buf = new Uint8Array(w * h * 4);
    renderer.readRenderTargetPixels(post.rt, x0, RT_H - y1, w, h, buf);
    let r = 0, g = 0, b = 0, n = w * h;
    for (let i = 0; i < buf.length; i += 4) { r += buf[i]; g += buf[i + 1]; b += buf[i + 2]; }
    return [r / n, g / n, b / n].map(v => Math.round(v));
  };
  // dump scene objects with projected RT coords, for debugging
  window.__dump = () => {
    const rows = [];
    const v = new THREE.Vector3();
    scene.traverse(o => {
      if (!o.visible || (!o.isMesh && !o.isPoints && !o.isInstancedMesh)) return;
      o.getWorldPosition(v);
      const dist = Math.round(v.distanceTo(camera.position));
      const p = v.clone().project(camera);
      rows.push({
        type: o.type, name: o.name || '',
        pos: [+v.x.toFixed(1), +v.y.toFixed(1), +v.z.toFixed(1)],
        rt: [Math.round((p.x + 1) / 2 * RT_W), Math.round((1 - p.y) / 2 * RT_H)],
        inFront: p.z < 1, dist,
      });
    });
    return rows;
  };
  window.__ready = true;
} else {
  resize();
  app.applyToggles();
  ui.showBoot(() => {
    ui.showTitle(startGame);
    audio.setScene('title');
  });
}

// ---------- input ----------
window.addEventListener('keydown', e => {
  // boot skip
  if (ui.state === 'boot') { ui.skipBoot(); return; }
  // title
  if (ui.state === 'title') {
    if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyF') ui.titlePress();
    return;
  }
  // paused: menu consumes keys
  if (ui.state === 'paused') { ui.pauseKey(e); return; }
  if (ui.state !== 'playing') return;

  if (e.code === 'Backquote') { ui.toggleDebug(); return; }
  if (e.code === 'KeyH') { ui.toggleHints(); return; }
  if (e.code === 'KeyF') {
    if (rig.mode === 'fly') rig.exitFly();
    else { rig.enterFly(); ui.toast('FREE FLIGHT', '自由飛行'); }
    return;
  }
  if (e.code === 'Escape') {
    if (rig.mode === 'fly') rig.exitFly();
    else ui.openPause();
    return;
  }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 5 && manager.active) {
    const id = SCENE_ORDER[n - 1];
    if (id !== manager.active.id && !manager.transitioning) {
      ui.toast('WARP JUMP', '跳躍');
      manager.switchTo(id);
    }
  }
});

canvas.addEventListener('click', () => {
  if (ui.state === 'boot') ui.skipBoot();
  else if (ui.state === 'title') ui.titlePress();
});
ui.title.addEventListener('click', () => { if (ui.state === 'title') ui.titlePress(); });

// ---------- main loop (authentic 30fps cap) ----------
if (!(CAPTURE.scene && CAPTURE.t !== null)) {
  let t = 0, last = performance.now(), acc = 0;
  const fpsCounter = { frames: 0, lastT: performance.now(), fps: 30 };
  function tick(dt) {
    t += dt;
    rig.update(dt, t);
    manager.update(t, dt);
    post.uniforms.uTime.value = t;
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dtReal = Math.min(0.06, (now - last) / 1000);
    last = now;
    const cap = 1 / (Toggles.fps30 ? FPS_AUTHENTIC : FPS_MODERN);
    if (ui.state === 'paused') {
      acc = 0;    // frozen world, CRT static still breathes
      post.uniforms.uTime.value += dtReal;
    } else {
      acc += dtReal;
      let guard = 0;
      while (acc >= cap && guard++ < 4) { tick(cap); acc -= cap; }
    }
    post.begin();
    renderer.render(scene, camera);
    post.end();
    // fps meter
    fpsCounter.frames++;
    if (now - fpsCounter.lastT > 500) {
      fpsCounter.fps = fpsCounter.frames * 1000 / (now - fpsCounter.lastT);
      fpsCounter.frames = 0;
      fpsCounter.lastT = now;
      ui.updateStats(fpsCounter.fps);
    }
  }
  requestAnimationFrame(frame);
}
