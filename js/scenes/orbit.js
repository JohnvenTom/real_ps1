// ============================================================
// SCENE 01 - ORBIT「軌道」 Colony-Wars-style fleet battle.
// Banded planet + cloud deck, capital ship on a slow patrol
// ellipse, two fighter wings trading laser fire, explosions,
// distant station, tumbling debris.
// ============================================================
import * as THREE from 'three';
import { makePS1Material, makeSprite, boxParts } from '../ps1.js';
import { tex } from '../textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function makeStars() {
  const n = 700;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = V(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(700 + Math.random() * 100);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({
    map: tex('star'), color: 0xcfd8ff, size: 2.6, sizeAttenuation: false,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const p = new THREE.Points(g, m);
  p.renderOrder = -10;
  return p;
}

function makeFighter(team) {
  const hullMat = makePS1Material({ map: 'fighter', uvScale: [2, 1] });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 2.4), hullMat);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.2, 5), hullMat);
  nose.rotation.x = -Math.PI / 2; nose.position.z = -1.7;
  const wL = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.8), hullMat);
  wL.position.set(-1.0, 0, 0.3); wL.rotation.z = 0.28;
  const wR = wL.clone(); wR.position.x = 1.0; wR.rotation.z = -0.28;
  g.add(body, nose, wL, wR);
  g.scale.setScalar(2.6);
  const jet = makeSprite(team === 0 ? 'glowRed' : 'glowCyan', { scale: 2.2 });
  jet.position.set(0, 0, 1.45);
  g.add(jet);
  g.userData.jet = jet;
  return g;
}

export default {
  id: 'orbit',
  name: 'ORBIT',
  jp: '軌道',
  desc: 'FLEET ENGAGEMENT OVER CYGNUS IV',
  anchor: { pos: [0, 4, 36], look: [0, 0, -58], fov: 55, sway: 0.22 },
  bounds: { min: [-70, -30, -160], max: [70, 40, 60] },
  env: {
    lightDir: [0.5, 0.22, -0.8], lightColor: [1.1, 1.02, 0.92],
    fillDir: [-0.45, -0.3, 0.5], fillColor: [0.44, 0.48, 0.62],   // strong camera-side fill: hulls read from our side
    ambient: [0.3, 0.3, 0.36],
    fogColor: [0.02, 0.03, 0.06], fogNear: 130, fogFar: 950,
  },

  setup(root, ctx) {
    this.group = new THREE.Group();
    const G = this.group;

    // --- starfield + nebula wash ---
    G.add(makeStars());
    const neb1 = makeSprite('glowViolet', { scale: 520, opacity: 0.2 });
    neb1.position.set(-180, 80, -600);
    const neb2 = makeSprite('glowBlue', { scale: 420, opacity: 0.16 });
    neb2.position.set(220, -120, -580);
    G.add(neb1, neb2);

    // --- planet: banded sphere + cloud deck + limb glow ---
    const planet = new THREE.Group();
    const surf = new THREE.Mesh(
      new THREE.SphereGeometry(58, 36, 24),
      makePS1Material({ map: 'planetFire', uvScale: [4, 2] })
    );
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(58.9, 36, 24),
      makePS1Material({ map: 'clouds', uvScale: [4, 2], transparent: true, opacity: 0.85, depthWrite: false })
    );
    const limb = makeSprite('glowOrange', { scale: 150, opacity: 0.5 });
    limb.position.z = -6;   // behind planet from camera
    planet.add(limb, surf, clouds);
    planet.position.set(-14, -72, -150);
    planet.rotation.z = 0.28;
    G.add(planet);
    this.planet = planet; this.clouds = clouds;

    // --- sun + streaks ---
    const sun = makeSprite('glowSun', { scale: 26 });
    sun.position.set(260, 95, -420);
    const streakH = makeSprite('streak', { scale: [150, 7], opacity: 0.7 });
    streakH.position.copy(sun.position);
    const streakV = makeSprite('streak', { scale: [7, 90], opacity: 0.5 });
    streakV.position.copy(sun.position);
    G.add(sun, streakH, streakV);

    // --- capital ship: boxes + tower + engines + lit windows ---
    const capMat = makePS1Material({ map: 'hull', uvScale: [3, 1.2], tint: [1.08, 1.05, 1.0] });
    const cap = boxParts([
      //  w     h    d     x    y    z    ry
      [26, 4.4, 7, 0, 0, 0],            // keel
      [7, 2.2, 5.4, -2, 3.0, 0],        // superstructure
      [3.4, 4.6, 3.2, -6.5, 2.4, 0],    // tower
      [16, 1.2, 4.6, 0, -2.6, 0],       // ventral fin
      [2.2, 2.8, 2.2, 13.5, 0.6, 0],    // bow block
      [1.6, 1.4, 1.6, 4, 4.6, 0],       // sensor mast
      [1.2, 1.2, 1.2, -11, 1.2, 0],     // aft greeble
      [1.4, 0.8, 1.4, -11, 2.6, 0.5],
      [2.0, 0.9, 2.0, 8, -2.2, 0.4],
    ], capMat);
    // engine block + glows
    const engMat = makePS1Material({ map: 'hull2', uvScale: [1, 1] });
    const engBlock = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.4, 3.2), engMat);
    engBlock.position.set(-13.5, 0, 0);
    cap.add(engBlock);
    this.capGlows = [];
    for (let i = 0; i < 3; i++) {
      const e = makeSprite('glowBlue', { scale: 2.6 });
      e.position.set(-15.4, (i - 1) * 1.3, 0);
      cap.add(e); this.capGlows.push(e);
    }
    // lit window strips (thin additive boxes along the hull)
    const winMat = makePS1Material({ map: 'glowWhite', unlit: true, additive: true, opacity: 1.0, depthWrite: false });
    for (let i = 0; i < 8; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.16), winMat);
      w.position.set(-9 + i * 3, 2.35, 3.6);
      cap.add(w);
      const w2 = w.clone(); w2.position.z = -3.6; cap.add(w2);
    }
    cap.scale.setScalar(2.6);   // hero scale: crosses the frame like a Colony Wars closeup
    G.add(cap);
    this.cap = cap;

    // --- fighters, two teams on crossing loops (kept close to camera) ---
    this.fighters = [];
    const loopA = new THREE.CatmullRomCurve3([
      V(-32, 8, -48), V(2, 16, -66), V(30, 5, -44), V(8, -7, -26), V(-24, -3, -32),
    ], true, 'catmullrom', 0.6);
    const loopB = new THREE.CatmullRomCurve3([
      V(28, -5, -60), V(-3, 9, -34), V(-29, -1, -56), V(-4, -10, -70), V(22, 6, -48),
    ], true, 'catmullrom', 0.6);
    for (let i = 0; i < 4; i++) {
      const team = i < 2 ? 0 : 1;
      const f = makeFighter(team);
      // merge into userData: keep the jet reference from makeFighter
      Object.assign(f.userData, {
        team, curve: team === 0 ? loopA : loopB,
        phase: i * 0.23 + team * 0.11,
        speed: 0.011 + Math.random() * 0.004,
        nextFire: 2 + Math.random() * 3,
      });
      this.fighters.push(f); G.add(f);
    }

    // --- laser bolts pool (chunky additive boxes, solid bright core) ---
    this.bolts = [];
    const boltGeo = new THREE.BoxGeometry(16, 1.2, 1.2);
    for (let i = 0; i < 24; i++) {
      const red = makePS1Material({ map: 'solid', unlit: true, additive: true, tint: [1, 0.3, 0.22], depthWrite: false });
      const grn = makePS1Material({ map: 'solid', unlit: true, additive: true, tint: [0.35, 1, 0.55], depthWrite: false });
      const b = new THREE.Mesh(boltGeo, i % 2 ? red : grn);
      b.visible = false;
      b.userData = { vel: V(0, 0, 0), life: 0, red: !!(i % 2) };
      this.bolts.push(b); G.add(b);
    }

    // --- explosion pool: fireball sprite + ring + spark points ---
    this.booms = [];
    for (let i = 0; i < 3; i++) {
      const fire = makeSprite('explosion', { scale: 0.001, opacity: 1 });
      const ring = makeSprite('glowWhite', { scale: 0.001, opacity: 0.8 });
      const nSparks = 26;
      const sg = new THREE.BufferGeometry();
      sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nSparks * 3), 3));
      const sparks = new THREE.Points(sg, new THREE.PointsMaterial({
        map: tex('star'), color: 0xffb060, size: 3, sizeAttenuation: false,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      const boom = { fire, ring, sparks, t: -1, dir: [] };
      for (let s = 0; s < nSparks; s++) boom.dir.push(V(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(6 + Math.random() * 10));
      this.booms.push(boom);
      G.add(fire, ring, sparks);
    }
    this.nextBoom = 4;

    // --- distant station silhouette + beacons ---
    const stnMat = makePS1Material({ map: 'hull2', uvScale: [2, 2], tint: [0.55, 0.6, 0.7] });
    const stn = boxParts([
      [2, 14, 2, 0, 0, 0], [18, 2, 2, 0, 4, 0], [10, 1.6, 1.6, 0, -4, 0],
      [1, 6, 1, 0, 9, 0], [4, 0.6, 0.6, 0, 11.5, 0],
    ], stnMat);
    stn.position.set(120, 30, -260);
    const b1 = makeSprite('glowRed', { scale: 1.6 }); b1.position.set(0, 12.3, 0);
    const b2 = makeSprite('glowWhite', { scale: 1.2 }); b2.position.set(-9.2, 4, 0);
    stn.add(b1, b2);
    this.beacons = [b1, b2];
    G.add(stn);

    // --- tumbling debris ---
    this.debris = [];
    const rockMat = makePS1Material({ map: 'rock' });
    const rockGeo = new THREE.IcosahedronGeometry(1, 0);
    for (let i = 0; i < 26; i++) {
      const r = new THREE.Mesh(rockGeo, rockMat);
      r.scale.setScalar(0.25 + Math.random() * 1.1);
      r.position.set((Math.random() - 0.5) * 150, (Math.random() - 0.5) * 60, -30 - Math.random() * 130);
      r.userData.spin = V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.9);
      this.debris.push(r); G.add(r);
    }

    root.add(G);
  },

  update(ctx, t, dt) {
    const { camera, audio } = ctx;
    // planet + clouds counter-rotate
    this.planet.rotation.y = t * 0.008;
    this.clouds.rotation.y = t * 0.013 + 2;

    // capital ship on patrol ellipse, passing close by the camera
    const a = t * 0.021;
    this.cap.position.set(Math.cos(a) * 40 - 4, 12 + Math.sin(a * 2) * 5, -56 + Math.sin(a) * 16);
    this.cap.rotation.set(0, -a + Math.PI / 2, Math.sin(t * 0.1) * 0.06);
    for (let i = 0; i < this.capGlows.length; i++) {
      const s = 2.2 + Math.sin(t * 9 + i * 2.2) * 0.5;
      this.capGlows[i].scale.set(s, s, 1);
    }

    // fighters along loops + firing
    const tmp = V(0, 0, 0), nxt = V(0, 0, 0);
    for (const f of this.fighters) {
      const u = (t * f.userData.speed + f.userData.phase) % 1;
      f.userData.curve.getPoint(u, tmp);
      f.position.copy(tmp);
      f.userData.curve.getPoint((u + 0.01) % 1, nxt);
      f.lookAt(nxt);
      f.rotation.z += Math.sin(t * 2 + f.userData.phase * 20) * 0.25;
      f.userData.jet.scale.setScalar(0.7 + Math.random() * 0.5);
      f.userData.nextFire -= dt;
      if (f.userData.nextFire <= 0) {
        f.userData.nextFire = 0.9 + Math.random() * 1.6;
        const bolt = this.bolts.find(b => !b.visible);
        if (bolt) {
          bolt.visible = true;
          bolt.material = bolt.userData.red
            ? this.bolts[1].material : this.bolts[0].material;
          // team 0 fires red, team 1 green
          bolt.material = f.userData.team === 0 ? this.bolts[1].material : this.bolts[0].material;
          bolt.position.copy(f.position);
          bolt.userData.vel.subVectors(nxt, tmp).normalize().multiplyScalar(75);
          bolt.userData.life = 2.6;
          bolt.quaternion.setFromUnitVectors(V(1, 0, 0), bolt.userData.vel.clone().normalize());
          audio.laser();
        }
      }
    }
    // bolts travel
    for (const b of this.bolts) {
      if (!b.visible) continue;
      b.userData.life -= dt;
      if (b.userData.life <= 0) { b.visible = false; continue; }
      b.position.addScaledVector(b.userData.vel, dt);
    }

    // explosions
    this.nextBoom -= dt;
    if (this.nextBoom <= 0) {
      this.nextBoom = 5 + Math.random() * 6;
      const boom = this.booms.find(x => x.t < 0);
      if (boom) {
        boom.t = 0;
        boom.center = V((Math.random() - 0.5) * 70, (Math.random() - 0.5) * 22, -60 - Math.random() * 40);
        boom.fire.position.copy(boom.center);
        boom.ring.position.copy(boom.center);
        boom.sparks.position.copy(boom.center);
        audio.boom(0.8);
      }
    }
    for (const boom of this.booms) {
      if (boom.t < 0) { boom.fire.scale.setScalar(0.001); boom.ring.scale.setScalar(0.001); boom.sparks.visible = false; continue; }
      boom.t += dt;
      const k = boom.t;
      if (k > 1.6) { boom.t = -1; continue; }
      const fs = k < 0.45 ? 2 + k * 16 : 8 + (k - 0.45) * 4;
      boom.fire.scale.setScalar(fs * (k > 1 ? Math.max(0.001, 1.7 - k) : 1));
      boom.fire.material.uniforms.uOpacity.value = Math.max(0, 1.1 - k);
      boom.ring.scale.set(fs * 1.6, fs * 1.6, 1);
      boom.ring.material.uniforms.uOpacity.value = Math.max(0, 0.7 - k * 0.55);
      // sparks fly out
      boom.sparks.visible = k < 1.2;
      const arr = boom.sparks.geometry.attributes.position.array;
      for (let s = 0; s < boom.dir.length; s++) {
        const d = boom.dir[s], r = 1 + k * 13;
        arr[s * 3] = d.x * r; arr[s * 3 + 1] = d.y * r; arr[s * 3 + 2] = d.z * r;
      }
      boom.sparks.geometry.attributes.position.needsUpdate = true;
    }

    // beacons blink
    this.beacons[0].visible = (t % 1.4) < 0.7;
    this.beacons[1].visible = ((t + 0.5) % 1.1) < 0.55;

    // debris tumble
    for (const r of this.debris) {
      r.rotation.x += r.userData.spin.x * dt;
      r.rotation.y += r.userData.spin.y * dt;
      r.rotation.z += r.userData.spin.z * dt;
    }
  },
};
