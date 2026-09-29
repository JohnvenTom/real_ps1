// ============================================================
// Scene manager: lazy-built scene registry + the warp-jump
// transition. Every scene switch plays the wormhole: fade out
// -> warp tunnel -> white flash -> arrive, toast.
// ============================================================
import * as THREE from 'three';
import { PS1Global, updateBillboards } from './ps1.js';
import orbit from './scenes/orbit.js';
import rings from './scenes/rings.js';
import belt from './scenes/belt.js';
import warp from './scenes/warp.js';
import window5 from './scenes/window.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const SCENES = { orbit, rings, belt, warp, window: window5 };
export const SCENE_LIST = [orbit, rings, belt, warp, window5];

export class SceneManager {
  constructor(rootGroup, ctx) {
    this.root = rootGroup;
    this.ctx = ctx;              // { camera, rig, audio, post }
    this.active = null;
    this.transitioning = false;
    this._queue = null;
    this._tr = null;             // transition state
    this.onSceneChanged = null;  // cb(def)
  }

  ensure(def) {
    if (!def._built) { def.setup(this.root, this.ctx); def._built = true; }
    else if (def.group.parent !== this.root) this.root.add(def.group);
  }

  setEnv(def) {
    const e = def.env, g = PS1Global;
    g.uLightDir.value.set(...e.lightDir).normalize();
    g.uLightColor.value.setRGB(...e.lightColor);
    g.uFillDir.value.set(...e.fillDir).normalize();
    g.uFillColor.value.setRGB(...e.fillColor);
    g.uAmbient.value.setRGB(...e.ambient);
    g.uFogColor.value.setRGB(...e.fogColor);
    g.uFogNear.value = e.fogNear;
    g.uFogFar.value = e.fogFar;
  }

  activate(id, { silent = false } = {}) {
    const def = SCENES[id];
    if (!def) return null;
    if (this.active) this.root.remove(this.active.group);
    this.ensure(def);
    this.setEnv(def);
    this.active = def;
    const a = def.anchor;
    this.ctx.rig.setAnchor(V(...a.pos), V(...a.look), a.fov, a.sway);
    this.ctx.rig.bounds = def.bounds ? new THREE.Box3(V(...def.bounds.min), V(...def.bounds.max)) : null;
    if (!silent) this.ctx.audio.setScene(id);
    return def;
  }

  // warp-jump switch; direct switch for the very first activation
  switchTo(id, { warpJump = true } = {}) {
    if (this.transitioning) { this._queue = id; return; }
    if (this.active && SCENES[id] === this.active) return;
    this.ctx.audio.warp();
    if (!warpJump || !this.active) {
      this.activate(id);
      this.onSceneChanged?.(this.active);
      return;
    }
    this.transitioning = true;
    this._tr = { phase: 0, t: 0, target: id };
  }

  update(t, dt) {
    const { post, audio } = this.ctx;

    if (this.transitioning) {
      const tr = this._tr;
      tr.t += dt;
      if (tr.phase === 0) {                       // fade current out
        post.uniforms.uFade.value = Math.min(1, tr.t / 0.35);
        if (tr.t >= 0.38) {
          this.activate('warp', { silent: true });
          audio.setScene('warp');
          tr.phase = 1; tr.t = 0;
        }
      } else if (tr.phase === 1) {                // ride the tunnel
        post.uniforms.uFade.value = Math.max(0, 1 - tr.t / 0.4);
        this.active?.update(this.ctx, t, dt);
        if (tr.t >= 2.1) { tr.phase = 2; tr.t = 0; }
      } else if (tr.phase === 2) {                // white flash
        post.uniforms.uFlash.value = Math.min(1, tr.t / 0.28);
        this.active?.update(this.ctx, t, dt);
        if (tr.t >= 0.3) {
          this.activate(tr.target);
          tr.phase = 3; tr.t = 0;
          this.onSceneChanged?.(this.active);
        }
      } else {                                    // flash decay
        post.uniforms.uFlash.value = Math.max(0, 1 - tr.t / 0.65);
        this.active?.update(this.ctx, t, dt);
        if (tr.t >= 0.7) {
          post.uniforms.uFlash.value = 0;
          this.transitioning = false;
          this._tr = null;
          if (this._queue) { const q = this._queue; this._queue = null; this.switchTo(q); }
        }
      }
      updateBillboards(this.root, this.ctx.camera);
      return;
    }

    this.active?.update(this.ctx, t, dt);
    updateBillboards(this.root, this.ctx.camera);
  }
}
