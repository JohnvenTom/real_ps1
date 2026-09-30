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
    // counter-rotating inner ring set, tighter + slower (bold enough to read)
    this.innerRings = [];
    for (let i = 0; i < 12; i++) {
      const mat = makePS1Material({
        map: 'glowWhite', unlit: true, additive: true, opacity: 0.85, depthWrite: false,
        tint: [0.7, 0.6, 1.0],
      });
      const r = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.5, 4, 6), mat);
      r.position.z = -i * 20 - 6;
      r.rotation.z = -i * 0.4;
      this.innerRings.push({ mesh: r, mat, z0: -i * 20 - 6 });
      G.add(r);
    }
    // hexagonal far gate (big, framed against a calmer core)
    this.gate = new THREE.Mesh(
      new THREE.TorusGeometry(30, 2.6, 6, 6),
      makePS1Material({ map: 'glowWhite', unlit: true, additive: true, tint: [0.85, 0.65, 1], opacity: 0.85, depthWrite: false })
    );
    this.gate.position.z = -250;
    G.add(this.gate);
    // energy arcs: beaded lightning (Points chain, thick at 240p where 1px lines die)
    this.arcs = [];
    for (let i = 0; i < 6; i++) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(10 * 3), 3));
      const beads = new THREE.Points(g, new THREE.PointsMaterial({
        map: tex('star'), color: new THREE.Color(0.7, 0.95, 1), size: 4.5, sizeAttenuation: false,
        transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      beads.userData = { next: Math.random() * 0.5 };
      this.arcs.push(beads); G.add(beads);
    }

    // star streaks: two instanced fields with different tints
    const SN = 110;
    const streakGeo = new THREE.BoxGeometry(0.14, 0.14, 1);
    const mkStreakMesh = tint => {
      const m = new THREE.InstancedMesh(streakGeo,
        makePS1Material({ map: 'glowWhite', unlit: true, additive: true, tint, depthWrite: false }), SN);
      return m;
    };
    this.streaks = mkStreakMesh([0.75, 0.85, 1]);
    this.streaksV = mkStreakMesh([0.8, 0.6, 1]);
    this.streakData = [];
    this.streakDataV = [];
    for (let i = 0; i < SN; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 4 + Math.random() * 22;
      this.streakData.push({
        x: Math.cos(ang) * rad, y: Math.sin(ang) * rad,
        z: -Math.random() * 300, len: 10 + Math.random() * 22, sp: 150 + Math.random() * 130,
      });
      const ang2 = Math.random() * Math.PI * 2, rad2 = 10 + Math.random() * 18;
      this.streakDataV.push({
        x: Math.cos(ang2) * rad2, y: Math.sin(ang2) * rad2,
        z: -Math.random() * 300, len: 7 + Math.random() * 14, sp: 90 + Math.random() * 70,
      });
    }
    G.add(this.streaks, this.streaksV);
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

    // our ship, seen from behind: hull + fins + twin engines + cockpit
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
    this.cockpit = makeSprite('glowCyan', { scale: 1.4, opacity: 0.8 });
    this.cockpit.position.set(0, 0.45, -1.0);
    this.navL = makeSprite('glowRed', { scale: 2.0 }); this.navL.position.set(-1.25, 0.05, 0.7);
    this.navR = makeSprite('glowCyan', { scale: 2.0 }); this.navR.position.set(1.25, 0.05, 0.7);
    ship.add(this.engL, this.engR, this.cockpit, this.navL, this.navR);
    G.add(ship);
    this.ship = ship;

    // exhaust puffs: fading sprites spawned behind the engines
    this.puffs = [];
    for (let i = 0; i < 10; i++) {
      const pf = makeSprite('glowCyan', { scale: 0.001, opacity: 0.7 });
      pf.visible = false;
      this.puffs.push({ s: pf, t: -1 });
      G.add(pf);
    }
    this._puffT = 0;

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

    // inner rings counter-rotate and breathe
    const IN = this.innerRings.length, ISP = 20;
    for (let i = 0; i < IN; i++) {
      const r = this.innerRings[i];
      let z = r.z0 + ((t * 34) % (IN * ISP));
      z = ((z % (IN * ISP)) + IN * ISP) % (IN * ISP) - (IN - 1) * ISP;
      r.mesh.position.z = z;
      r.mesh.rotation.z = -t * 0.9 - i * 0.4;
      r.mat.uniforms.uOpacity.value = 0.3 + 0.3 * (0.5 + 0.5 * Math.sin(z * 0.12 + t * 5));
    }

    // far gate slow spin + pulse
    this.gate.rotation.z = t * 0.15;
    this.gate.material.uniforms.uOpacity.value = 0.5 + 0.3 * Math.sin(t * 1.7);

    // energy arcs re-strike at random angles (10 beads each)
    for (const arc of this.arcs) {
      arc.userData.next -= dt;
      if (arc.userData.next <= 0) {
        arc.userData.next = 0.35 + Math.random() * 1.1;
        const a0 = Math.random() * Math.PI * 2, a1 = a0 + 0.6 + Math.random() * 1.2;
        const z0 = -15 - Math.random() * 60;
        const arr = arc.geometry.attributes.position.array;
        for (let k = 0; k < 10; k++) {
          const k0 = k / 9;
          const ang = a0 + (a1 - a0) * k0 + (Math.random() - 0.5) * 0.3;
          const rad = 6.5 + k0 * 5 + (Math.random() - 0.5) * 1.8;
          arr[k * 3] = Math.cos(ang) * rad;
          arr[k * 3 + 1] = Math.sin(ang) * rad;
          arr[k * 3 + 2] = z0 + (Math.random() - 0.5) * 3;
        }
        arc.geometry.attributes.position.needsUpdate = true;
        arc.material.opacity = 0.95;
      }
      arc.material.opacity = Math.max(0, arc.material.opacity - dt * 1.8);
    }

    // streaks (two tint layers)
    const span = 320;
    for (let i = 0; i < this.streakData.length; i++) {
      const s = this.streakData[i];
      let z = s.z + t * s.sp;
      z = ((z % span) + span) % span - 300;
      this._p.set(s.x, s.y, z);
      this._s.set(1, 1, s.len);
      this._m4.compose(this._p, this._q, this._s);
      this.streaks.setMatrixAt(i, this._m4);
    }
    this.streaks.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < this.streakDataV.length; i++) {
      const s = this.streakDataV[i];
      let z = s.z + t * s.sp;
      z = ((z % span) + span) % span - 300;
      this._p.set(s.x, s.y, z);
      this._s.set(1, 1, s.len);
      this._m4.compose(this._p, this._q, this._s);
      this.streaksV.setMatrixAt(i, this._m4);
    }
    this.streaksV.instanceMatrix.needsUpdate = true;

    // glow pulse (kept modest so the gate reads behind it)
    const gs = 17 + Math.sin(t * 5) * 3.5 + Math.sin(t * 11) * 1.5;
    this.coreGlow.scale.set(gs, gs, 1);
    this.coreGlow.material.uniforms.uOpacity.value = 0.8;
    this.halo.scale.set(70 + Math.sin(t * 3) * 10, 70 + Math.sin(t * 3) * 10, 1);

    // ship bob + roll + engine flicker + nav blink
    this.ship.position.y = -1.4 + Math.sin(t * 1.4) * 0.35;
    this.ship.position.x = Math.sin(t * 0.9) * 0.5;
    this.ship.rotation.z = Math.sin(t * 0.9) * 0.08 + Math.sin(t * 0.23) * 0.1;
    this.ship.rotation.y = Math.sin(t * 0.6) * 0.05;
    const e = 1.8 + Math.random() * 1.2;
    this.engL.scale.set(e, e, 1);
    this.engR.scale.set(2.9 - e * 0.4 + Math.random() * 0.8, 2.9 - e * 0.4, 1);
    this.navL.visible = (t % 1.1) < 0.55;
    this.navR.visible = ((t + 0.55) % 1.1) < 0.55;

    // exhaust puffs stream behind
    this._puffT -= dt;
    if (this._puffT <= 0) {
      this._puffT = 0.1;
      const pf = this.puffs.find(x => x.t < 0);
      if (pf) {
        pf.t = 0; pf.s.visible = true;
        pf.s.position.set(this.ship.position.x + (Math.random() - 0.5) * 0.4, this.ship.position.y - 0.05, this.ship.position.z + 4);
      }
    }
    for (const pf of this.puffs) {
      if (pf.t < 0) continue;
      pf.t += dt;
      if (pf.t > 0.7) { pf.t = -1; pf.s.visible = false; pf.s.scale.setScalar(0.001); continue; }
      const k = pf.t;
      pf.s.scale.setScalar(1.6 + k * 12);
      pf.s.material.uniforms.uOpacity.value = 0.6 * (1 - k / 0.7);
      pf.s.position.z += dt * 40;
    }
  },
};
