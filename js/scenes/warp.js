// ============================================================
// SCENE 04 - WARP GATE「跳躍」 Endless wormhole tunnel.
// Octagonal low-poly rings scrolling past with a color wave,
// instanced star streaks flying by, your ship ahead with
// flickering engines. Doubles as the inter-scene transition.
// ============================================================
import * as THREE from 'three';
import { makePS1Material, makeSprite, boxParts } from '../ps1.js';
import { tex } from '../textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PALETTE = [
  [0.4, 1.0, 1.0],   // cyan
  [0.55, 0.5, 1.0],  // blue-violet
  [0.85, 0.5, 1.0],  // violet
  [1.0, 0.9, 0.7],   // hot white
];

export default {
  id: 'warp',
  name: 'WARP GATE',
  jp: '跳躍',
  desc: 'TRANSIT AUTHORIZED',
  anchor: { pos: [0, 0, 14], look: [0, 0, -60], fov: 72, sway: 0.1 },
  bounds: { min: [-40, -40, -280], max: [40, 40, 30] },
  env: {
    lightDir: [0, 1, 0], lightColor: [1, 1, 1],
    fillDir: [0, -1, 0], fillColor: [0.2, 0.2, 0.3],
    ambient: [0.5, 0.5, 0.55],
    fogColor: [0.02, 0.01, 0.06], fogNear: 4000, fogFar: 8000,   // effectively no fog
  },

  setup(root, ctx) {
    this.group = new THREE.Group();
    const G = this.group;

    // tunnel rings: octagonal tori, one material each for the color wave
    this.rings = [];
    const N = 26, SPACING = 11;
    for (let i = 0; i < N; i++) {
      const mat = makePS1Material({
        map: 'glowWhite', unlit: true, additive: true, opacity: 0.8, depthWrite: false,
      });
      const r = new THREE.Mesh(new THREE.TorusGeometry(10, 0.5, 5, 8), mat);
      r.position.z = -i * SPACING;
      r.rotation.z = i * 0.24;
      this.rings.push({ mesh: r, mat, z0: -i * SPACING });
      G.add(r);
    }

    // star streaks: instanced thin boxes flying toward camera
    const SN = 130;
    const streakGeo = new THREE.BoxGeometry(0.14, 0.14, 1);
    const streakMat = makePS1Material({ map: 'glowWhite', unlit: true, additive: true, tint: [0.75, 0.85, 1], depthWrite: false });
    const streaks = new THREE.InstancedMesh(streakGeo, streakMat, SN);
    this.streakData = [];
    for (let i = 0; i < SN; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 4 + Math.random() * 22;
      this.streakData.push({
        x: Math.cos(ang) * rad, y: Math.sin(ang) * rad,
        z: -Math.random() * 300,
        len: 10 + Math.random() * 22,
        sp: 150 + Math.random() * 130,
      });
    }
    G.add(streaks);
    this.streaks = streaks;
    this._m4 = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._s = V(1, 1, 1);
    this._p = V(0, 0, 0);

    // core glow far down the tunnel + secondary halo (kept BEHIND the ship
    // so the additive wash doesn't swallow its silhouette)
    this.coreGlow = makeSprite('glowWhite', { scale: 30 });
    this.coreGlow.position.set(0, 0, -85);
    this.halo = makeSprite('glowViolet', { scale: 55, opacity: 0.4 });
    this.halo.position.set(0, 0, -50);
    G.add(this.coreGlow, this.halo);

    // our ship, seen from behind: hull + fins + twin engine glows
    const shipMat = makePS1Material({ map: 'fighter', uvScale: [2, 1] });
    const ship = boxParts([
      [1.1, 0.6, 3.4, 0, 0, 0],
      [0.6, 0.5, 1.0, 0, 0.5, 0.9],
      [2.6, 0.1, 0.9, 0.8, 0, 0.7, 0, 0, 0.35],
      [2.6, 0.1, 0.9, -0.8, 0, 0.7, 0, 0, -0.35],
    ], shipMat);
    ship.position.set(0, -1.4, -13);
    ship.scale.setScalar(1.5);
    this.engL = makeSprite('glowCyan', { scale: 3.2 }); this.engL.position.set(-0.6, 0, 2.0);
    this.engR = makeSprite('glowCyan', { scale: 3.2 }); this.engR.position.set(0.6, 0, 2.0);
    ship.add(this.engL, this.engR);
    G.add(ship);
    this.ship = ship;

    root.add(G);
  },

  update(ctx, t, dt) {
    const N = this.rings.length, SPACING = 11;
    for (let i = 0; i < N; i++) {
      const r = this.rings[i];
      // rings fly TOWARD the camera and wrap back to the far end
      let z = r.z0 + ((t * 46) % (N * SPACING));
      z = ((z % (N * SPACING)) + N * SPACING) % (N * SPACING) - (N - 1) * SPACING;
      r.mesh.position.z = z;
      // color wave traveling along the tunnel (positive modulo)
      const wave = (((z * 0.045 + t * 0.55) % PALETTE.length) + PALETTE.length) % PALETTE.length;
      const i0 = Math.floor(wave) % PALETTE.length, i1 = (i0 + 1) % PALETTE.length;
      const f = wave - Math.floor(wave);
      const c0 = PALETTE[i0], c1 = PALETTE[i1];
      r.mat.uniforms.uTint.value.setRGB(
        c0[0] + (c1[0] - c0[0]) * f,
        c0[1] + (c1[1] - c0[1]) * f,
        c0[2] + (c1[2] - c0[2]) * f
      );
      // brightness pulse
      const pulse = 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(z * 0.09 - t * 7));
      r.mat.uniforms.uOpacity.value = pulse;
      r.mesh.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.04);
    }

    // streaks
    for (let i = 0; i < this.streakData.length; i++) {
      const s = this.streakData[i];
      let z = s.z + t * s.sp;
      const span = 320;
      z = ((z % span) + span) % span - 300;
      this._p.set(s.x, s.y, z);
      this._s.set(1, 1, s.len);
      this._m4.compose(this._p, this._q, this._s);
      this.streaks.setMatrixAt(i, this._m4);
    }
    this.streaks.instanceMatrix.needsUpdate = true;

    // glow pulse
    const gs = 26 + Math.sin(t * 5) * 5 + Math.sin(t * 11) * 2;
    this.coreGlow.scale.set(gs, gs, 1);
    this.halo.scale.set(90 + Math.sin(t * 3) * 12, 90 + Math.sin(t * 3) * 12, 1);

    // ship bob + engine flicker
    this.ship.position.y = -1.4 + Math.sin(t * 1.4) * 0.35;
    this.ship.position.x = Math.sin(t * 0.9) * 0.5;
    this.ship.rotation.z = Math.sin(t * 0.9) * 0.08;
    this.ship.rotation.y = Math.sin(t * 0.6) * 0.05;
    const e = 1.8 + Math.random() * 1.2;
    this.engL.scale.set(e, e, 1);
    this.engR.scale.set(2.9 - e * 0.4 + Math.random() * 0.8, 2.9 - e * 0.4, 1);
  },
};
