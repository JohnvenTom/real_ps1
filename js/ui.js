// ============================================================
// UI shell: PS1-style boot sequence, title screen, pause menu,
// scene toasts, HUD hints, Chinese debug panel.
// Style: dark translucent blue panels, one amber accent,
// chunky monospace, blinking cursor. DOM layer above canvas.
// ============================================================
import { Toggles } from './config.js';

const ACCENT = '#ffb54d';

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

export class UI {
  constructor(app) {
    this.app = app;               // { audio, manager, applyToggles, stats }
    this.state = 'boot';
    this.root = document.getElementById('ui');
    this.menuIndex = 0;
    this.subOpen = false;
    this.subIndex = 0;
    this._timers = [];
    this._build();
  }

  _build() {
    // ---------- boot ----------
    this.boot = el('div', 'layer boot');
    this.bootLogo = el('div', 'boot-logo',
      `<div class="boot-diamond"></div>
       <div class="boot-name">ASTRAL<span> ENTERTAINMENT SYSTEM</span></div>`);
    this.bootLines = el('div', 'boot-lines');
    this.boot.append(this.bootLogo, this.bootLines);
    this.root.append(this.boot);

    // ---------- title ----------
    this.title = el('div', 'layer title hidden');
    this.title.innerHTML = `
      <div class="title-block">
        <div class="title-jp">星の残響</div>
        <div class="title-main">STELLAR<br>ECHOES</div>
        <div class="title-sub">A PS1 SPACE ODYSSEY / 320&times;240 / RGB555</div>
      </div>
      <div class="press-start blink">PRESS START</div>
      <div class="title-copy">&copy; 1997 ASTRAL ENTERTAINMENT CO.&nbsp;&nbsp;LICENSED BY NO ONE</div>`;
    this.root.append(this.title);

    // ---------- pause menu ----------
    this.pause = el('div', 'layer pause hidden');
    this.pauseBox = el('div', 'pause-box');
    this.pause.append(this.pauseBox);
    this.root.append(this.pause);

    // ---------- debug ----------
    this.debug = el('div', 'layer debug hidden');
    this.root.append(this.debug);

    // ---------- HUD ----------
    this.hud = el('div', 'layer hud hidden');
    this.sceneTag = el('div', 'scene-tag', '');
    this.hints = el('div', 'hints',
      `F FLIGHT&nbsp;&nbsp;ESC MENU&nbsp;&nbsp;1-5 JUMP&nbsp;&nbsp;\` DEBUG`);
    this.hud.append(this.sceneTag, this.hints);
    this.root.append(this.hud);

    // ---------- toast ----------
    this.toastEl = el('div', 'layer toast hidden');
    this.root.append(this.toastEl);
  }

  // ===== boot =====
  showBoot(onDone) {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      this._timers.forEach(clearTimeout);
      this._timers = [];
      this.boot.classList.add('hidden');
      onDone();
    };
    this._skip = finish;
    const lines = [
      ['SYSTEM CHECK ......... OK', 1900],
      ['MEMORY CARD .......... OK', 2500],
      ['CD-ROM SPEED ......... 2x', 3100],
      ['LOADING STELLAR ECHOES', 3800],
    ];
    for (const [txt, at] of lines) {
      this._timers.push(setTimeout(() => {
        const row = el('div', 'boot-line');
        this.bootLines.append(row);
        let i = 0;
        const type = () => {
          if (done) return;
          row.textContent = txt.slice(0, ++i);
          if (i < txt.length) this._timers.push(setTimeout(type, 14));
        };
        type();
        this.app.audio.beep(1240, 0.02, 'square', 0.06);
      }, at));
    }
    this._timers.push(setTimeout(finish, 4700));
  }

  skipBoot() { this._skip?.(); }

  // ===== title =====
  showTitle(onStart) {
    this.state = 'title';
    this.title.classList.remove('hidden');
    this.hud.classList.add('hidden');
    this._onStart = () => {
      this.title.classList.add('hidden');
      this.state = 'playing';
      this.hud.classList.remove('hidden');
      onStart();
    };
  }

  titlePress() {
    if (this.state === 'title' && this._onStart) {
      this.app.audio.confirm();
      this._onStart();
      this._onStart = null;
    }
  }

  // ===== pause menu =====
  openPause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.subOpen = false;
    this.menuIndex = 0;
    this.pause.classList.remove('hidden');
    this._renderPause();
    this.app.audio.beep(980, 0.05);
  }
  closePause() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.pause.classList.add('hidden');
    this.app.audio.beep(620, 0.05);
  }

  _items() {
    const s = this.app.audio.on ? 'ON' : 'OFF';
    const c = Toggles.crt ? 'ON' : 'OFF';
    return [
      { label: 'RESUME', act: () => this.closePause() },
      { label: 'SCENE SELECT', sub: true },
      { label: `SOUND: ${s}`, act: () => { this.app.toggleSound(); this._renderPause(); } },
      { label: `CRT FILTER: ${c}`, act: () => { this.app.toggleCRT(); this._renderPause(); } },
      { label: 'BACK TO TITLE', act: () => this.closePauseThen(() => this.app.backToTitle()) },
    ];
  }

  closePauseThen(fn) {
    this.state = 'playing';
    this.pause.classList.add('hidden');
    fn();
  }

  _renderPause() {
    const box = this.pauseBox;
    box.innerHTML = '';
    box.append(el('div', 'pause-title', `PAUSED&nbsp;&nbsp;<span>一時停止</span>`));
    const items = this._items();
    items.forEach((it, i) => {
      const row = el('div', 'menu-row' + (i === this.menuIndex ? ' sel' : ''));
      row.innerHTML = `<span class="cursor">${i === this.menuIndex ? '\u25B6' : '&nbsp;'}</span>${it.label}`;
      if (it.sub && this.subOpen) {
        const sub = el('div', 'submenu');
        this.app.manager && window.__SCENE_LIST.forEach((def, j) => {
          const srow = el('div', 'menu-row sub' + (j === this.subIndex ? ' sel' : ''));
          srow.innerHTML = `<span class="cursor">${j === this.subIndex ? '\u25B6' : '&nbsp;'}</span>` +
            `${String(j + 1).padStart(2, '0')}&nbsp;${def.name}&nbsp;<span class="jp">${def.jp}</span>` +
            `<div class="desc">${def.desc}</div>`;
          srow.addEventListener('click', () => { this.subIndex = j; this._pickSub(); });
          srow.addEventListener('mouseenter', () => { this.subIndex = j; this._renderPause(); });
          sub.append(srow);
        });
        row.append(sub);
      }
      row.addEventListener('click', () => { this.menuIndex = i; this._activate(); });
      row.addEventListener('mouseenter', () => {
        if (this.menuIndex !== i) { this.menuIndex = i; this.app.audio.beep(880, 0.03, 'square', 0.05); this._renderPause(); }
      });
      box.append(row);
    });
    box.append(el('div', 'pause-foot', 'ARROWS / WASD&nbsp;MOVE&nbsp;&nbsp;&nbsp;ENTER&nbsp;SELECT&nbsp;&nbsp;&nbsp;ESC&nbsp;BACK'));
  }

  _pickSub() {
    const def = window.__SCENE_LIST[this.subIndex];
    this.closePauseThen(() => this.app.jumpTo(def.id));
  }

  _activate() {
    const it = this._items()[this.menuIndex];
    if (it.sub) { this.subOpen = !this.subOpen; this.subIndex = 0; this.app.audio.beep(740, 0.04); }
    else { this.app.audio.confirm(); it.act(); }
    this._renderPause();
  }

  pauseKey(e) {
    if (this.state !== 'paused') return false;
    const n = this._items().length;
    if (this.subOpen) {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { this.subIndex = (this.subIndex + 1) % 5; this.app.audio.beep(880, 0.03, 'square', 0.05); this._renderPause(); return true; }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { this.subIndex = (this.subIndex + 4) % 5; this.app.audio.beep(880, 0.03, 'square', 0.05); this._renderPause(); return true; }
      if (e.code === 'Enter' || e.code === 'Space') { this.app.audio.confirm(); this._pickSub(); return true; }
      if (e.code === 'Escape' || e.code === 'ArrowLeft') { this.subOpen = false; this._renderPause(); return true; }
      return true;
    }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { this.menuIndex = (this.menuIndex + 1) % n; this.app.audio.beep(880, 0.03, 'square', 0.05); this._renderPause(); return true; }
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { this.menuIndex = (this.menuIndex + n - 1) % n; this.app.audio.beep(880, 0.03, 'square', 0.05); this._renderPause(); return true; }
    if (e.code === 'Enter' || e.code === 'Space' || e.code === 'ArrowRight') { this._activate(); return true; }
    if (e.code === 'Escape') { this.closePause(); return true; }
    return true;   // consume everything else while paused
  }

  // ===== debug panel =====
  buildDebug() {
    const d = this.debug;
    d.innerHTML = '';
    d.append(el('div', 'dbg-title', `PS1 还原度调试&nbsp;<span>DEBUG</span>`));
    const rows = [
      ['仿射纹理映射', 'AFFINE WARP', 'affine'],
      ['顶点吸附抖动', 'VERTEX SNAP', 'jitter'],
      ['RGB555 色彩量化', '15BIT COLOR', 'quantize'],
      ['有序抖动', 'BAYER DITHER', 'dither'],
      ['CRT 复合信号', 'CRT COMPOSITE', 'crt'],
      ['距离雾', 'DISTANCE FOG', 'fog'],
      ['顶点光照', 'GOURAUD LIGHT', 'light'],
      ['帧率上限', 'FPS CAP', 'fps30'],
      ['音频', 'SOUND', 'sound'],
    ];
    for (const [cn, en, key] of rows) {
      const row = el('div', 'dbg-row');
      row.innerHTML = `<span class="dbg-cn">${cn}</span><span class="dbg-en">${en}</span><span class="dbg-val" data-k="${key}"></span>`;
      row.addEventListener('click', () => {
        Toggles[key] = !Toggles[key];
        if (key === 'sound') this.app.audio.setEnabled(Toggles.sound);
        this.app.applyToggles();
        this.refreshDebug();
        this.app.audio.beep(880, 0.03, 'square', 0.06);
      });
      d.append(row);
    }
    this.dbgStats = el('div', 'dbg-stats', '');
    d.append(this.dbgStats);
    d.append(el('div', 'dbg-note', '※ 无 Z 缓冲的多边形排序闪烁属硬件行为，此处仅近似复刻<br>※ 数字键 1-5 跳跃场景 / 反引号键开关本面板'));
    this.refreshDebug();
  }

  refreshDebug() {
    this.debug.querySelectorAll('.dbg-val').forEach(v => {
      const k = v.dataset.k;
      if (k === 'fps30') v.textContent = Toggles.fps30 ? '30 FPS' : '60 FPS';
      else if (k === 'sound') v.textContent = Toggles.sound ? '开 ON' : '关 OFF';
      else v.textContent = Toggles[k] ? '开 ON' : '关 OFF';
      v.style.color = (k === 'sound' ? Toggles.sound : Toggles[k]) ? ACCENT : '#5a6480';
    });
  }

  toggleDebug() {
    this.debug.classList.toggle('hidden');
    this.app.audio.beep(740, 0.04);
  }

  updateStats(fps) {
    if (!this.dbgStats || this.debug.classList.contains('hidden')) return;
    const info = this.app.stats();
    this.dbgStats.innerHTML = `FPS ${fps | 0}&nbsp;&nbsp;DRAW ${info.calls}&nbsp;&nbsp;TRI ${(info.triangles / 1000).toFixed(1)}k&nbsp;&nbsp;RT 320&times;240`;
  }

  // ===== HUD =====
  setSceneTag(def, idx) {
    this.sceneTag.innerHTML = `SCENE ${String(idx + 1).padStart(2, '0')}&nbsp;&nbsp;${def.name}&nbsp;<span class="jp">${def.jp}</span>`;
    this.sceneTag.classList.remove('hidden');
    this.sceneTag.style.opacity = '1';
    clearTimeout(this._tagT);
    this._tagT = setTimeout(() => { this.sceneTag.style.opacity = '0'; }, 4200);
  }

  toast(text, jp = '') {
    const t = this.toastEl;
    t.innerHTML = `${text}${jp ? `&nbsp;<span class="jp">${jp}</span>` : ''}`;
    t.classList.remove('hidden');
    t.style.opacity = '1';
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => { t.style.opacity = '0'; }, 2600);
  }

  toggleHints() {
    this.hints.style.display = this.hints.style.display === 'none' ? '' : 'none';
  }
}
