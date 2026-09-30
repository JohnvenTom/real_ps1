// ============================================================
// SCENE 01 - ORBIT「軌道」 Colony-Wars-style fleet battle.
// Banded planet + cloud deck, a detailed capital ship (greebles,
// turrets, nav strobes, hangar bay, sensor dish, engine trails)
// on a slow patrol ellipse, two fighter wings trading laser fire,
// missiles, layered explosions with smoke + shockwaves, escort
// frigate, cargo containers, planet satellites, structured nebula.
// ============================================================
import * as THREE from 'three';
import { makePS1Material, makeSprite, boxParts, makeStarField } from '../ps1.js';
import { tex } from '../textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function makeFighter(team) {
  const hullMat = makePS1Material({ map: 'fighter', uvScale: [2, 1] });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 2.4), hullMat);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.2, 5), hullMat);
  nose.rotation.x = -Math.PI / 2; nose.position.z = -1.7;
  const wL = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 0.8), hullMat);
  wL.position.set(-1.0, 0, 0.3); wL.rotation.z = 0.28;
  const wR = wL.clone(); wR.position.x = 1.0; wR.rotation.z = -0.28;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.7), hullMat);
  fin.position.set(0, 0.35, 0.8);
  g.add(body, nose, wL, wR, fin);
  g.scale.setScalar(2.6);
  const jet = makeSprite(team === 0 ? 'glowRed' : 'glowCyan', { scale: 2.2 });
  jet.position.set(0, 0, 1.45);
  g.add(jet);
  g.userData.jet = jet;
  // wingtip nav lamps: red port / green starboard
  const lp = makeSprite('glowRed', { scale: 0.8 }); lp.position.set(-1.05, 0, 0.3);
  const ls = makeSprite('glowCyan', { scale: 0.8 }); ls.position.set(1.05, 0, 0.3);
  g.add(lp, ls);
  g.userData.nav = [lp, ls];
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
    fillDir: [-0.45, -0.3, 0.5], fillColor: [0.44, 0.48, 0.62],
    ambient: [0.3, 0.3, 0.36],
    fogColor: [0.02, 0.03, 0.06], fogNear: 130, fogFar: 950,
  },

  setup(root, ctx) {
    this.group = new THREE.Group();
    const G = this.group;
    const rnd = (a, b) => a + Math.random() * (b - a);

    // --- layered starfield + structured nebula ---
    G.add(makeStarField(760, 720));
    const nebA = makeSprite('nebulaViolet', { scale: 560, opacity: 0.85 });
    nebA.position.set(-200, 90, -640);
    const nebB = makeSprite('nebulaCyan', { scale: 440, opacity: 0.7 });
    nebB.position.set(240, -110, -600);
    const nebWash = makeSprite('glowViolet', { scale: 520, opacity: 0.14 });
    nebWash.position.set(-180, 80, -600);
    G.add(nebA, nebB, nebWash);

    // --- planet: banded sphere + cloud deck + limb glow + satellites ---
    const planet = new THREE.Group();
    const surf = new THREE.Mesh(
      new THREE.SphereGeometry(58, 36, 24),
      makePS1Material({ map: 'planetFire', uvScale: [4, 2] })
    );
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(58.9, 36, 24),
      makePS1Material({ map: 'clouds', uvScale: [4, 2], transparent: true, opacity: 0.85, depthWrite: false })
    );
    // thin atmosphere shell
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(60.6, 24, 16),
      makePS1Material({ map: 'glowOrange', unlit: true, additive: true, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.BackSide })
    );
    const limb = makeSprite('glowOrange', { scale: 150, opacity: 0.5 });
    limb.position.z = -6;
    planet.add(limb, surf, clouds, atmo);
    // tiny blinking satellites on low orbits
    this.sats = [];
    for (let i = 0; i < 3; i++) {
      const s = makeSprite(i === 1 ? 'glowCyan' : 'glowWhite', { scale: 1.4 });
      planet.add(s);
      this.sats.push({ s, r: 63 + i * 3, sp: 0.1 - i * 0.025, ph: i * 2.1, inc: 0.2 + i * 0.15 });
    }
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

    // ================= capital ship =================
    const capMat = makePS1Material({ map: 'hull', uvScale: [3, 1.2], tint: [1.08, 1.05, 1.0] });
    const plateMat = makePS1Material({ map: 'plating2', uvScale: [2, 1] });
    const grebMat = makePS1Material({ map: 'greeble', uvScale: [1, 1] });
    const cap = boxParts([
      //   w     h    d     x    y    z    ry
      [26, 4.4, 7, 0, 0, 0],            // keel
      [7, 2.2, 5.4, -2, 3.0, 0],        // superstructure
      [3.4, 4.6, 3.2, -6.5, 2.4, 0],    // tower
      [16, 1.2, 4.6, 0, -2.6, 0],       // ventral fin
      [2.2, 2.8, 2.2, 13.5, 0.6, 0],    // bow block
      [1.6, 1.4, 1.6, 4, 4.6, 0],       // sensor mast base
      [2.2, 1.2, 2.2, -11, 1.2, 0],     // aft greeble block
    ], capMat);
    // superstructure gets the plated decal texture
    cap.children[1].material = plateMat;
    cap.children[2].material = plateMat;
    // greeble field: small blocks scattered on dorsal + ventral hull
    for (let i = 0; i < 16; i++) {
      const gw = rnd(0.7, 2.2), gh = rnd(0.4, 1.3), gd = rnd(0.7, 2.4);
      const m = new THREE.Mesh(new THREE.BoxGeometry(gw, gh, gd), grebMat);
      m.position.set(rnd(-11, 12), (i % 3 === 0 ? -1 : 1) * (2.3 + gh / 2), rnd(-2.4, 2.4));
      cap.add(m);
    }
    // rotating sensor dish on the mast (big enough to read at range)
    const dishPivot = new THREE.Group();
    dishPivot.position.set(4, 6.2, 0);
    const dishMast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.4, 5), grebMat);
    dishMast.position.y = 0.7;
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 0.25, 0.6, 8, 1, true), grebMat);
    dish.rotation.z = Math.PI / 2.6; dish.position.y = 1.6;
    dishPivot.add(dishMast, dish);
    cap.add(dishPivot);
    this.dishPivot = dishPivot;
    // twin turrets that slowly track (chunky barrels)
    this.turrets = [];
    const turBase = new THREE.BoxGeometry(2.6, 0.8, 2.6);
    const turGun = new THREE.BoxGeometry(0.35, 0.35, 3.6);
    for (let i = 0; i < 3; i++) {
      const base = new THREE.Mesh(turBase, grebMat);
      base.position.set(-6 + i * 7, 2.7, 0);
      const yaw = new THREE.Group();
      const guns = new THREE.Mesh(turGun, grebMat);
      guns.position.set(-0.35, 0.4, -1.5);
      const guns2 = guns.clone(); guns2.position.x = 0.35;
      yaw.add(guns, guns2);
      yaw.position.y = 0.5;
      base.add(yaw);
      cap.add(base);
      this.turrets.push({ yaw, ph: i * 2.3, sp: rnd(0.3, 0.55) });
    }
    // hangar bay: dark inset + warm interior glow that flickers
    const bay = new THREE.Mesh(new THREE.BoxGeometry(5.5, 2.6, 0.8), makePS1Material({ map: 'greeble', tint: [0.35, 0.32, 0.3] }));
    bay.position.set(6.5, -0.5, 3.15);
    cap.add(bay);
    this.bayGlow = makeSprite('glowOrange', { scale: 5.2, opacity: 0.8 });
    this.bayGlow.position.set(6.5, -0.5, 3.9);
    cap.add(this.bayGlow);
    // engine block + glows + long heat trails
    const engMat = makePS1Material({ map: 'hull2', uvScale: [1, 1] });
    const engBlock = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.4, 3.2), engMat);
    engBlock.position.set(-13.5, 0, 0);
    cap.add(engBlock);
    this.capGlows = [];
    this.capTrails = [];
    const trailMat = makePS1Material({ map: 'streak', unlit: true, additive: true, tint: [0.5, 0.7, 1], opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const e = makeSprite('glowBlue', { scale: 2.6 });
      e.position.set(-15.4, (i - 1) * 1.3, 0);
      cap.add(e); this.capGlows.push(e);
      const tr = new THREE.Mesh(new THREE.PlaneGeometry(17, 2.4), trailMat);
      tr.rotation.y = Math.PI / 2;   // plane normal faces camera-ish, streaks along -x
      tr.position.set(-23.0, (i - 1) * 1.3, 0);
      cap.add(tr); this.capTrails.push(tr);
    }
    // lit window strips
    const winMat = makePS1Material({ map: 'glowWhite', unlit: true, additive: true, opacity: 1.0, depthWrite: false });
    for (let i = 0; i < 8; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.16), winMat);
      w.position.set(-9 + i * 3, 2.35, 3.6);
      cap.add(w);
      const w2 = w.clone(); w2.position.z = -3.6; cap.add(w2);
    }
    // nav strobes: white double-flash on mast, red/green running lamps
    this.strobe = makeSprite('glowWhite', { scale: 2.4 });
    this.strobe.position.set(4, 7.6, 0);
    const lampR = makeSprite('glowRed', { scale: 1.8 }); lampR.position.set(0, 0, 4.0);
    const lampG = makeSprite('glowCyan', { scale: 1.8 }); lampG.position.set(0, 0, -4.0);
    cap.add(this.strobe, lampR, lampG);
    this.lampR = lampR; this.lampG = lampG;

    cap.scale.setScalar(2.6);
    G.add(cap);
    this.cap = cap;

    // ================= escort frigate (background) =================
    const frgMat = makePS1Material({ map: 'hull2', uvScale: [2, 1], tint: [0.8, 0.82, 0.9] });
    const frg = boxParts([
      [12, 2.2, 3.6, 0, 0, 0], [3.2, 1.6, 3.0, -1, 1.6, 0],
      [1.4, 2.4, 1.4, -4.4, 1.4, 0], [1.6, 1.6, 1.6, -5.8, 0, 0],
    ], frgMat);
    const frgJet = makeSprite('glowBlue', { scale: 2.2 }); frgJet.position.set(-6.8, 0, 0);
    frg.add(frgJet);
    const frgStrobe = makeSprite('glowWhite', { scale: 1.0 }); frgStrobe.position.set(0, 3.2, 0);
    frg.add(frgStrobe);
    this.frgStrobe = frgStrobe;
    G.add(frg);
    this.frg = frg;

    // ================= fighters: 3 v 3 =================
    this.fighters = [];
    const loopA = new THREE.CatmullRomCurve3([
      V(-32, 8, -48), V(2, 16, -66), V(30, 5, -44), V(8, -7, -26), V(-24, -3, -32),
    ], true, 'catmullrom', 0.6);
    const loopB = new THREE.CatmullRomCurve3([
      V(28, -5, -60), V(-3, 9, -34), V(-29, -1, -56), V(-4, -10, -70), V(22, 6, -48),
    ], true, 'catmullrom', 0.6);
    for (let i = 0; i < 6; i++) {
      const team = i < 3 ? 0 : 1;
      const f = makeFighter(team);
      Object.assign(f.userData, {
        team, curve: team === 0 ? loopA : loopB,
        phase: (i % 3) * 0.19 + team * 0.47,
        speed: 0.011 + Math.random() * 0.004,
        nextFire: 2 + Math.random() * 3,
      });
      this.fighters.push(f); G.add(f);
    }

    // ================= laser bolts =================
    this.bolts = [];
    const boltGeo = new THREE.BoxGeometry(16, 1.2, 1.2);
    for (let i = 0; i < 26; i++) {
      const red = makePS1Material({ map: 'solid', unlit: true, additive: true, tint: [1, 0.3, 0.22], depthWrite: false });
      const grn = makePS1Material({ map: 'solid', unlit: true, additive: true, tint: [0.35, 1, 0.55], depthWrite: false });
      const b = new THREE.Mesh(boltGeo, i % 2 ? red : grn);
      b.visible = false;
      b.userData = { vel: V(0, 0, 0), life: 0, red: !!(i % 2) };
      this.bolts.push(b); G.add(b);
    }
    // bolt impact flashes
    this.flashes = [];
    for (let i = 0; i < 6; i++) {
      const fl = makeSprite('glowWhite', { scale: 0.001, opacity: 0.9 });
      fl.visible = false;
      this.flashes.push({ s: fl, t: -1 });
      G.add(fl);
    }

    // ================= missiles =================
    this.missiles = [];
    for (let i = 0; i < 2; i++) {
      const m = new THREE.Group();
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2.6, 6), makePS1Material({ map: 'fighter', uvScale: [1, 1] }));
      body.rotation.x = -Math.PI / 2;
      const jet = makeSprite('glowOrange', { scale: 2.4 }); jet.position.z = 1.6;
      const trail = new THREE.Mesh(new THREE.PlaneGeometry(14, 0.9),
        makePS1Material({ map: 'streak', unlit: true, additive: true, tint: [1, 0.7, 0.4], opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
      trail.position.z = 8;
      m.add(body, jet, trail);
      m.visible = false;
      m.userData = { vel: V(0, 0, 0), life: 0 };
      this.missiles.push(m); G.add(m);
    }
    this.nextMissile = 3.5;

    // ================= explosions: fireball + ring + sparks + smoke + shockwave =================
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
      // smoke puffs (normal blending, dark)
      const smokes = [];
      for (let s = 0; s < 4; s++) {
        const sm = makeSprite('smoke', { scale: 0.001, additive: false, unlit: true, opacity: 0.85 });
        smokes.push(sm); G.add(sm);
      }
      // flat shockwave ring in a random 3D orientation
      const shock = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.0, 20),
        makePS1Material({ map: 'glowWhite', unlit: true, additive: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
      shock.visible = false;
      const boom = { fire, ring, sparks, smokes, shock, t: -1, dir: [], big: 1 };
      for (let s = 0; s < nSparks; s++) boom.dir.push(V(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(6 + Math.random() * 10));
      this.booms.push(boom);
      G.add(fire, ring, sparks, shock);
    }
    this.nextBoom = 2.2;

    // ================= distant station + beacons =================
    const stnMat = makePS1Material({ map: 'hull2', uvScale: [2, 2], tint: [0.55, 0.6, 0.7] });
    const stn = boxParts([
      [2, 14, 2, 0, 0, 0], [18, 2, 2, 0, 4, 0], [10, 1.6, 1.6, 0, -4, 0],
      [1, 6, 1, 0, 9, 0], [4, 0.6, 0.6, 0, 11.5, 0],
      [3, 3, 3, 0, -8, 0], [0.8, 5, 0.8, 6, 6.5, 0],
    ], stnMat);
    stn.position.set(120, 30, -260);
    const b1 = makeSprite('glowRed', { scale: 1.6 }); b1.position.set(0, 12.3, 0);
    const b2 = makeSprite('glowWhite', { scale: 1.2 }); b2.position.set(-9.2, 4, 0);
    const b3 = makeSprite('glowCyan', { scale: 1.0 }); b3.position.set(6.2, 9.4, 0);
    stn.add(b1, b2, b3);
    this.beacons = [b1, b2, b3];
    G.add(stn);

    // ================= debris + cargo containers =================
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
    const cargoMats = [makePS1Material({ map: 'cargo' }), makePS1Material({ map: 'cargoBlue' })];
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 4.2), cargoMats[i % 2]);
      c.position.set((Math.random() - 0.5) * 120, (Math.random() - 0.5) * 40, -40 - Math.random() * 90);
      c.userData.spin = V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.25);
      this.debris.push(c); G.add(c);
    }

    root.add(G);
  },

  triggerBoom(center, big = 1) {
    const boom = this.booms.find(x => x.t < 0);
    if (!boom) return;
    boom.t = 0; boom.big = big;
    boom.center = center.clone();
    boom.fire.position.copy(center);
    boom.ring.position.copy(center);
    boom.sparks.position.copy(center);
    boom.shock.visible = true;
    boom.shock.position.copy(center);
    boom.shock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    boom.shock.scale.setScalar(0.5);
    for (let s = 0; s < boom.smokes.length; s++) {
      const sm = boom.smokes[s];
      sm.visible = true;
      sm.position.copy(center).add(V((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5));
      sm.userData = { drift: V((Math.random() - 0.5) * 2, 0.5 + Math.random(), (Math.random() - 0.5) * 2) };
    }
    this._ctx?.audio.boom(0.8 * big);
  },

  update(ctx, t, dt) {
    this._ctx = ctx;
    const { audio } = ctx;
    // planet + clouds counter-rotate, satellites orbit
    this.planet.rotation.y = t * 0.008;
    this.clouds.rotation.y = t * 0.013 + 2;
    for (const sat of this.sats) {
      const a = sat.ph + t * sat.sp;
      sat.s.position.set(Math.cos(a) * sat.r, Math.sin(a * 1.3) * sat.r * sat.inc, Math.sin(a) * sat.r);
      sat.s.visible = ((t * 1.7 + sat.ph) % 1) < 0.55;
    }

    // capital ship patrol + onboard motion
    const a = t * 0.021;
    this.cap.position.set(Math.cos(a) * 40 - 4, 12 + Math.sin(a * 2) * 5, -56 + Math.sin(a) * 16);
    this.cap.rotation.set(0, -a + Math.PI / 2, Math.sin(t * 0.1) * 0.06);
    this.dishPivot.rotation.y = t * 1.2;
    for (const tr of this.turrets) tr.yaw.rotation.y = Math.sin(t * tr.sp + tr.ph) * 1.2;
    for (let i = 0; i < this.capGlows.length; i++) {
      const s = 2.2 + Math.sin(t * 9 + i * 2.2) * 0.5;
      this.capGlows[i].scale.set(s, s, 1);
    }
    this.bayGlow.material.uniforms.uOpacity.value = 0.55 + 0.35 * Math.abs(Math.sin(t * 3.1));
    // strobe: double flash then long gap; running lamps alternate
    const sc = t % 2.4;
    this.strobe.visible = sc < 0.08 || (sc > 0.22 && sc < 0.3);
    this.lampR.visible = (t % 1.6) < 0.8;
    this.lampG.visible = ((t + 0.8) % 1.6) < 0.8;

    // escort frigate on a wider, slower ellipse behind the battle
    const fa = t * 0.013 + 2.2;
    this.frg.position.set(Math.cos(fa) * 90 + 20, -14 + Math.sin(fa * 2) * 6, -120 + Math.sin(fa) * 30);
    this.frg.rotation.set(0, -fa + Math.PI / 2, Math.sin(t * 0.07) * 0.05);
    this.frgStrobe.visible = (t % 1.9) < 0.12;

    // fighters along loops + firing + wingtip nav blink
    const tmp = V(0, 0, 0), nxt = V(0, 0, 0);
    for (const f of this.fighters) {
      const u = (t * f.userData.speed + f.userData.phase) % 1;
      f.userData.curve.getPoint(u, tmp);
      f.position.copy(tmp);
      f.userData.curve.getPoint((u + 0.01) % 1, nxt);
      f.lookAt(nxt);
      f.rotation.z += Math.sin(t * 2 + f.userData.phase * 20) * 0.25;
      f.userData.jet.scale.setScalar(1.8 + Math.random() * 1.1);
      f.userData.nav[0].visible = (t % 1.2) < 0.6;
      f.userData.nav[1].visible = ((t + 0.6) % 1.2) < 0.6;
      f.userData.nextFire -= dt;
      if (f.userData.nextFire <= 0) {
        f.userData.nextFire = 0.9 + Math.random() * 1.6;
        const bolt = this.bolts.find(b => !b.visible);
        if (bolt) {
          bolt.visible = true;
          bolt.material = f.userData.team === 0 ? this.bolts[1].material : this.bolts[0].material;
          bolt.position.copy(f.position);
          bolt.userData.vel.subVectors(nxt, tmp).normalize().multiplyScalar(75);
          bolt.userData.life = 2.6;
          bolt.quaternion.setFromUnitVectors(V(1, 0, 0), bolt.userData.vel.clone().normalize());
          audio.laser();
        }
      }
    }
    // bolts travel; expiry = small impact flash
    for (const b of this.bolts) {
      if (!b.visible) continue;
      b.userData.life -= dt;
      if (b.userData.life <= 0) {
        b.visible = false;
        const fl = this.flashes.find(x => x.t < 0);
        if (fl) { fl.t = 0; fl.s.visible = true; fl.s.position.copy(b.position); }
        continue;
      }
      b.position.addScaledVector(b.userData.vel, dt);
    }
    for (const fl of this.flashes) {
      if (fl.t < 0) continue;
      fl.t += dt;
      if (fl.t > 0.3) { fl.t = -1; fl.s.visible = false; fl.s.scale.setScalar(0.001); continue; }
      const s = 1 + fl.t * 14;
      fl.s.scale.set(s, s, 1);
      fl.s.material.uniforms.uOpacity.value = 0.9 - fl.t * 3;
    }

    // missiles: launched periodically, fly, then detonate big
    this.nextMissile -= dt;
    if (this.nextMissile <= 0) {
      this.nextMissile = 9 + Math.random() * 6;
      const m = this.missiles.find(x => !x.visible);
      const f = this.fighters[Math.random() * this.fighters.length | 0];
      if (m && f) {
        m.visible = true;
        m.position.copy(f.position);
        m.userData.life = 2.8 + Math.random();
        m.userData.vel.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 8, -18 - Math.random() * 14);
        m.quaternion.setFromUnitVectors(V(0, 0, -1), m.userData.vel.clone().normalize());
      }
    }
    for (const m of this.missiles) {
      if (!m.visible) continue;
      m.userData.life -= dt;
      m.position.addScaledVector(m.userData.vel, dt);
      m.rotation.z += dt * 2;
      if (m.userData.life <= 0) {
        m.visible = false;
        this.triggerBoom(m.position, 1.8);
      }
    }

    // random dogfight explosions
    this.nextBoom -= dt;
    if (this.nextBoom <= 0) {
      this.nextBoom = 5 + Math.random() * 6;
      this.triggerBoom(V((Math.random() - 0.5) * 70, (Math.random() - 0.5) * 22, -60 - Math.random() * 40), 1);
    }
    for (const boom of this.booms) {
      if (boom.t < 0) {
        boom.fire.scale.setScalar(0.001); boom.ring.scale.setScalar(0.001);
        boom.sparks.visible = false; boom.shock.visible = false;
        continue;
      }
      boom.t += dt;
      const k = boom.t, B = boom.big;
      if (k > 2.2) { boom.t = -1; for (const sm of boom.smokes) sm.visible = false; continue; }
      const fs = k < 0.45 ? 2 + k * 16 * B : (8 + (k - 0.45) * 4) * B;
      boom.fire.scale.setScalar(fs * (k > 1 ? Math.max(0.001, (2.2 - k) / 1.2) : 1));
      boom.fire.material.uniforms.uOpacity.value = Math.max(0, 1.1 - k * 0.6);
      boom.ring.scale.set(fs * 1.6, fs * 1.6, 1);
      boom.ring.material.uniforms.uOpacity.value = Math.max(0, 0.7 - k * 0.55);
      boom.sparks.visible = k < 1.2;
      const arr = boom.sparks.geometry.attributes.position.array;
      for (let s = 0; s < boom.dir.length; s++) {
        const d = boom.dir[s], r = 1 + k * 13 * B;
        arr[s * 3] = d.x * r; arr[s * 3 + 1] = d.y * r; arr[s * 3 + 2] = d.z * r;
      }
      boom.sparks.geometry.attributes.position.needsUpdate = true;
      // shockwave expands fast then fades
      if (k < 0.55) {
        boom.shock.scale.setScalar(1 + k * 55 * B);
        boom.shock.material.uniforms.uOpacity.value = 0.65 * (1 - k / 0.55);
      } else boom.shock.visible = false;
      // smoke drifts up, expands, fades late
      for (const sm of boom.smokes) {
        if (!sm.visible) continue;
        const sk = Math.max(0, k - 0.35);
        sm.scale.setScalar((2 + sk * 7 * B) * (k > 1.8 ? Math.max(0.001, (2.2 - k) / 0.4) : 1));
        sm.material.uniforms.uOpacity.value = Math.min(0.85, sk * 1.2) * Math.max(0, 1 - Math.max(0, k - 1.2) / 1.0);
        sm.position.addScaledVector(sm.userData.drift, dt);
      }
    }

    // beacons blink
    this.beacons[0].visible = (t % 1.4) < 0.7;
    this.beacons[1].visible = ((t + 0.5) % 1.1) < 0.55;
    this.beacons[2].visible = ((t + 0.2) % 1.8) < 0.4;

    // debris tumble
    for (const r of this.debris) {
      r.rotation.x += r.userData.spin.x * dt;
      r.rotation.y += r.userData.spin.y * dt;
      r.rotation.z += r.userData.spin.z * dt;
    }
  },
};
