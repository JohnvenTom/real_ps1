// ============================================================
// SCENE 03 - DEAD BELT「鉱区」 Abandoned mining colony.
// Deformed rock field in thick rust-orange fog, a derelict rig
// bolted to the largest asteroid: rotating radar, sweeping
// floodlight cone, blinking beacon, drifting wreck, sparks.
// ============================================================
import * as THREE from 'three';
import { makePS1Material, makeSprite, boxParts } from '../ps1.js';
import { tex } from '../textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function rockGeo(radius) {
  const g = new THREE.IcosahedronGeometry(radius, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = V(p.getX(i), p.getY(i), p.getZ(i));
    // hash by POSITION (not index): shared/duplicated verts displace identically
    const s = Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719) * 43758.5453;
    const r = s - Math.floor(s);
    const k = 1 + (r - 0.5) * 0.34;
    v.multiplyScalar(k);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export default {
  id: 'belt',
  name: 'DEAD BELT',
  jp: '鉱区',
  desc: 'MINING COLONY KS-7, ABANDONED',
  anchor: { pos: [2, 3.5, 30], look: [-6, 1, -50], fov: 58, sway: 0.15 },
  bounds: { min: [-60, -30, -140], max: [60, 40, 45] },
  env: {
    lightDir: [0.8, -0.25, 0.45], lightColor: [1.15, 0.75, 0.4],   // low sunset star
    fillDir: [-0.4, 0.5, -0.5], fillColor: [0.16, 0.2, 0.32],
    ambient: [0.21, 0.18, 0.18],
    fogColor: [0.13, 0.07, 0.03], fogNear: 32, fogFar: 210,         // rust haze, a bit more reach
  },

  setup(root, ctx) {
    this.group = new THREE.Group();
    const G = this.group;
    this._V = V;

    // distant stars barely visible through haze
    const n = 260;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = V(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(600);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    G.add(new THREE.Points(sg, new THREE.PointsMaterial({
      map: tex('star'), color: 0x8a7a66, size: 2, sizeAttenuation: false,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5,
    })));

    // asteroid field; the big one at center-left carries the rig
    const rockMat = makePS1Material({ map: 'rock', uvScale: [2, 2] });
    this.rocks = [];
    const layout = [
      //  size   x     y    z
      [13, -14, -4, -58],
      [7, 26, 6, -84], [5, -44, -14, -96], [8, 8, 18, -130], [4.5, -30, 10, -48],
      [3.5, 16, -8, -40], [6, 48, -6, -110], [3, -8, -16, -34], [5, 38, 16, -66],
      [2.5, -22, 8, -28], [9, -70, 24, -160], [4, 60, 26, -150],
    ];
    for (const [s, x, y, z] of layout) {
      const r = new THREE.Mesh(rockGeo(s), rockMat);
      r.position.set(x, y, z);
      r.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      r.userData.spin = V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.16);
      this.rocks.push(r); G.add(r);
    }
    const big = this.rocks[0];
    big.userData.spin.set(0.008, 0.02, 0.004);   // rig stays readable: very slow tumble

    // --- the rig: platform + legs + tower + radar + beacon + floodlight ---
    const rigMat = makePS1Material({ map: 'metal', uvScale: [2, 1] });
    const rigMat2 = makePS1Material({ map: 'metalBlue', uvScale: [1, 1] });
    const rig = new THREE.Group();
    const deck = boxParts([
      [16, 0.8, 10, 0, 13.8, 0],          // main deck
      [5, 0.7, 6, 9, 13.9, 2],            // side platform
      [1.0, 5.5, 1.0, -5.5, 16.5, -2.5],  // leg posts sunk into rock
      [1.0, 5.5, 1.0, 5.5, 16.5, -2.5],
      [0.9, 5.2, 0.9, 0, 16.6, 3.4],
    ], rigMat);
    rig.add(deck);
    // habitat can + windows
    const hab = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 4.4, 8), rigMat2);
    hab.rotation.z = Math.PI / 2; hab.position.set(-3.5, 15.2, 1.6);
    rig.add(hab);
    const winMat = makePS1Material({ map: 'glowWhite', unlit: true, additive: true, opacity: 1.0, depthWrite: false });
    this.habWins = [];
    for (let i = 0; i < 4; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.12), winMat);
      w.position.set(-4.4 + i * 0.62, 15.5, 3.3);
      rig.add(w); this.habWins.push(w);
    }
    // tower + rotating radar
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.8, 7, 0.8), rigMat2);
    tower.position.set(4.5, 18, -2.5); rig.add(tower);
    const radar = new THREE.Group();
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 5), rigMat2);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.2, 0.6, 8, 1, true), rigMat2);
    dish.rotation.z = Math.PI / 2.5; dish.position.y = 1.2;
    radar.add(mast, dish);
    radar.position.set(4.5, 21.8, -2.5);
    rig.add(radar);
    this.radar = radar;
    // beacon on tower
    const beacon = makeSprite('glowRed', { scale: 3.2 });
    beacon.position.set(4.5, 22.6, -2.5);
    rig.add(beacon);
    this.beacon = beacon;
    // sweeping floodlight cone
    const coneTex = tex('glowWhite');
    const coneMat = makePS1Material({ map: 'glowWhite', unlit: true, additive: true, tint: [1, 0.85, 0.5], opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
    const flood = new THREE.Mesh(new THREE.ConeGeometry(3.4, 16, 8, 1, true), coneMat);
    flood.position.set(-9, 16.6, 3.4);
    flood.rotation.z = 0.6;
    const floodPivot = new THREE.Group();
    floodPivot.position.copy(flood.position);
    flood.position.set(0, -8, 0);
    floodPivot.add(flood);
    floodPivot.rotation.x = 0.5;
    rig.add(floodPivot);
    this.floodPivot = floodPivot;

    rig.position.copy(big.position);
    rig.rotation.copy(big.rotation);
    G.add(rig);
    this.rig = rig;

    // drifting wreck: broken drone
    const wreckMat = makePS1Material({ map: 'hull2', uvScale: [1, 1], tint: [0.7, 0.62, 0.55] });
    const wreck = boxParts([
      [2.2, 0.8, 0.8, 0, 0, 0],
      [0.6, 0.5, 0.6, 1.4, 0.5, 0, 0, 0, 0.7],
      [0.4, 1.6, 0.4, -0.8, 0.9, 0.3, 0, 0, -0.4],
    ], wreckMat);
    wreck.position.set(14, 6, -52);
    G.add(wreck);
    this.wreck = wreck;
    this._sparkT = 3;

    // spark burst points (reused)
    const sN = 16;
    const sgeo = new THREE.BufferGeometry();
    sgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(sN * 3), 3));
    this.sparks = new THREE.Points(sgeo, new THREE.PointsMaterial({
      map: tex('star'), color: 0xffd9a0, size: 3, sizeAttenuation: false,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.sparks.visible = false;
    this._sparkDirs = [];
    for (let i = 0; i < sN; i++) this._sparkDirs.push(V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(3 + Math.random() * 4));
    G.add(this.sparks);

    // drifting dust
    const dN = 240;
    const dpos = new Float32Array(dN * 3);
    for (let i = 0; i < dN; i++) dpos.set([(Math.random() - 0.5) * 140, (Math.random() - 0.5) * 80, -20 - Math.random() * 160], i * 3);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({
      map: tex('star'), color: 0x9a6a3a, size: 2, sizeAttenuation: false,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.4,
    }));
    G.add(this.dust);

    // far silhouette: second dead rig with pinprick lights
    const silMat = makePS1Material({ map: 'metalBlue', uvScale: [2, 2], tint: [0.4, 0.35, 0.32] });
    const sil = boxParts([[3, 12, 3, 0, 0, 0], [14, 1.4, 1.4, 0, 4, 0], [1, 5, 1, 0, 8, 0]], silMat);
    sil.position.set(-52, 18, -150);
    for (let i = 0; i < 5; i++) {
      const l = makeSprite('glowWhite', { scale: 0.7, opacity: 0.7 });
      l.position.set(-5 + i * 2.6, 4.8, 0.9);
      sil.add(l);
    }
    G.add(sil);

    root.add(G);
  },

  update(ctx, t, dt) {
    const { audio } = ctx;
    for (const r of this.rocks) {
      r.rotation.x += r.userData.spin.x * dt;
      r.rotation.y += r.userData.spin.y * dt;
      r.rotation.z += r.userData.spin.z * dt;
    }
    // rig follows its rock (slow tumble)
    const big = this.rocks[0];
    this.rig.rotation.copy(big.rotation);

    this.radar.rotation.y = t * 0.5;
    this.floodPivot.rotation.y = Math.sin(t * 0.22) * 1.1;
    this.beacon.visible = (t % 1.1) < 0.5;
    for (let i = 0; i < this.habWins.length; i++) {
      const flick = 0.4 + 0.6 * (Math.sin(t * 7 + i * 2.4) > -0.6 ? 1 : 0.25);
      this.habWins[i].material.uniforms.uOpacity.value = 1.0 * flick;
    }

    // wreck slow tumble + drift
    this.wreck.rotation.x += dt * 0.12;
    this.wreck.rotation.y += dt * 0.07;
    this.wreck.position.x = 14 + Math.sin(t * 0.05) * 6;

    // sparks off the wreck now and then
    this._sparkT -= dt;
    if (this._sparkT <= 0) {
      this._sparkT = 4 + Math.random() * 7;
      this._sparkAge = 0;
      this.sparks.visible = true;
      this.sparks.position.copy(this.wreck.position);
      audio.clank();
    }
    if (this.sparks.visible) {
      this._sparkAge += dt;
      const k = this._sparkAge;
      if (k > 0.7) this.sparks.visible = false;
      else {
        const arr = this.sparks.geometry.attributes.position.array;
        for (let i = 0; i < this._sparkDirs.length; i++) {
          const d = this._sparkDirs[i];
          arr[i * 3] = d.x * k * 5; arr[i * 3 + 1] = d.y * k * 5 + k * k * -0.8; arr[i * 3 + 2] = d.z * k * 5;
        }
        this.sparks.geometry.attributes.position.needsUpdate = true;
      }
    }

    // dust drifts sideways
    this.dust.rotation.y = Math.sin(t * 0.02) * 0.08;
  },
};
