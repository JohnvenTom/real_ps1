// ============================================================
// SCENE 05 - OBSERVATION「眺望」 Inside the station lounge,
// watching a blue giant through the panoramic window: drifting
// moons, passing freighters, scrolling consoles, a floating
// coffee cup, blinking LEDs, ceiling fan, dust in the light.
// ============================================================
import * as THREE from 'three';
import { makePS1Material, makeSprite, boxParts } from '../ps1.js';
import { tex, makeScreen } from '../textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// room: 26 wide (x), 9.6 high, 14 deep (z); window on the -z wall
export default {
  id: 'window',
  name: 'OBSERVATION',
  jp: '眺望',
  desc: 'LOUNGE DECK 3, OUTER RING',
  anchor: { pos: [0, 2.6, 5.6], look: [0.5, 3.2, -7], fov: 62, sway: 0.09 },
  bounds: { min: [-10.5, 1.0, -5.6], max: [10.5, 8.2, 6.2] },
  env: {
    lightDir: [0.15, 0.28, -0.94], lightColor: [1.0, 1.1, 1.3],  // planetshine from the window
    fillDir: [0.1, -0.85, 0.35], fillColor: [0.66, 0.58, 0.42],  // warm interior strips
    ambient: [0.72, 0.72, 0.78],
    fogColor: [0.02, 0.03, 0.07], fogNear: 90, fogFar: 380,
  },

  setup(root, ctx) {
    this.group = new THREE.Group();
    const G = this.group;

    const floorMat = makePS1Material({ map: 'floor', uvScale: [10, 6] });
    const wallMat = makePS1Material({ map: 'wall', uvScale: [10, 3] });
    const trimMat = makePS1Material({ map: 'metal', uvScale: [3, 1], tint: [0.7, 0.75, 0.85] });

    // floor / ceiling / side walls / back wall
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 14), floorMat);
    floor.rotation.x = -Math.PI / 2;
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(26, 14), wallMat);
    ceil.rotation.x = Math.PI / 2; ceil.position.y = 9.6;
    const wL = new THREE.Mesh(new THREE.PlaneGeometry(14, 9.6), wallMat);
    wL.rotation.y = Math.PI / 2; wL.position.set(-13, 4.8, 0);
    const wR = wL.clone(); wR.rotation.y = -Math.PI / 2; wR.position.x = 13;
    const wB = new THREE.Mesh(new THREE.PlaneGeometry(26, 9.6), wallMat);
    wB.rotation.y = Math.PI; wB.position.set(0, 4.8, 7);
    G.add(floor, ceil, wL, wR, wB);

    // front wall in segments framing the window (x -7..7, y 1.2..6.6 open)
    const segs = [
      [26, 1.2, 0, 0.6, -7],          // lintel bottom strip y 0..1.2
      [26, 3.0, 0, 8.1, -7],          // header y 6.6..9.6
      [6, 5.4, -10, 3.9, -7],         // left jamb
      [6, 5.4, 10, 3.9, -7],          // right jamb
    ];
    for (const [w, h, x, y, z] of segs) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.6), wallMat);
      m.position.set(x, y, z);
      G.add(m);
    }
    // window frame
    const frame = boxParts([
      [15.2, 0.5, 0.8, 0, 1.05, -7], [15.2, 0.5, 0.8, 0, 6.75, -7],
      [0.5, 5.7, 0.8, -7.35, 3.9, -7], [0.5, 5.7, 0.8, 7.35, 3.9, -7],
      [0.3, 5.4, 0.5, 0, 3.9, -7],    // center mullion
    ], trimMat);
    G.add(frame);

    // glass: faint blue tint + slowly sliding reflection streak
    const glassTint = new THREE.Mesh(new THREE.PlaneGeometry(14.6, 5.6),
      makePS1Material({ map: 'glowWhite', unlit: true, transparent: true, opacity: 0.05, tint: [0.4, 0.6, 1], depthWrite: false, side: THREE.DoubleSide }));
    glassTint.position.set(0, 3.9, -6.95);
    const glassShine = new THREE.Mesh(new THREE.PlaneGeometry(14.6, 5.6),
      makePS1Material({ map: 'glowWhite', unlit: true, additive: true, opacity: 0.1, tint: [0.55, 0.7, 1], depthWrite: false, side: THREE.DoubleSide }));
    glassShine.position.set(0, 3.9, -6.9);
    this.glassShine = glassShine;
    G.add(glassTint, glassShine);

    // ---- outside the window ----
    const out = new THREE.Group();
    out.position.set(0, 0, -7);
    const planet = new THREE.Mesh(new THREE.SphereGeometry(42, 30, 20),
      makePS1Material({ map: 'planetBlue', uvScale: [4, 2] }));
    planet.position.set(9, 14, -105);
    out.add(planet);
    this.planet = planet;
    const limb = makeSprite('glowBlue', { scale: 105, opacity: 0.5 });
    limb.position.set(9, 14, -112);
    out.add(limb);
    // moons
    this.moons = [];
    for (const [r, sp, sz, y0] of [[16, 0.05, 2.4, 4], [30, 0.022, 1.5, -8]]) {
      const mo = new THREE.Mesh(new THREE.SphereGeometry(sz, 10, 7), makePS1Material({ map: 'rockBlue' }));
      mo.position.set(9, 14, -105);
      out.add(mo);
      this.moons.push({ mesh: mo, r, sp, y0, ph: Math.random() * 6.28 });
    }
    // stars
    const n = 420;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = V(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(400);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.add(new THREE.Points(sg, new THREE.PointsMaterial({
      map: tex('star'), color: 0xdde6ff, size: 2, sizeAttenuation: false,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    })));
    // passing freighter: crosses the view every ~18 s
    const freightMat = makePS1Material({ map: 'hull2', uvScale: [2, 1] });
    const freight = boxParts([
      [7, 1.4, 1.6, 0, 0, 0], [2.4, 1.0, 1.4, 3.6, 1.0, 0], [1.2, 2.0, 1.2, -3.2, 0.6, 0],
    ], freightMat);
    const fjet = makeSprite('glowOrange', { scale: 2.4 }); fjet.position.set(-4.6, 0, 0);
    freight.add(fjet);
    freight.position.set(60, 6, -55);
    out.add(freight);
    this.freight = freight;
    // blinking satellite drifting slowly
    const sat = makeSprite('glowRed', { scale: 0.8 });
    sat.position.set(-30, 12, -80);
    out.add(sat);
    this.sat = sat;
    G.add(out);

    // ---- interior props ----
    // console row under the window
    const conMat = makePS1Material({ map: 'metal', uvScale: [1, 1] });
    this.screens = [];
    const cfgs = [['#7dffb0', '#04140a', '#ffd27f'], ['#8ad4ff', '#040e18', '#ffffff'], ['#ffc78a', '#180b04', '#7dffb0']];
    for (let i = 0; i < 3; i++) {
      const cx = -5 + i * 5;
      const desk = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.9, 1.2), conMat);
      desk.position.set(cx, 0.95, -6.0);
      G.add(desk);
      const scr = makeScreen(...cfgs[i]);
      const scrMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.15),
        makePS1Material({ map: scr.texture, unlit: true, side: THREE.DoubleSide }));
      scrMesh.position.set(cx, 2.15, -5.7);
      scrMesh.rotation.x = -0.18;
      G.add(scrMesh);
      this.screens.push(scr);
      // status LEDs on console lip
      for (let k = 0; k < 3; k++) {
        const led = makeSprite(k === 0 ? 'glowRed' : 'glowCyan', { scale: 0.22 });
        led.position.set(cx - 1.2 + k * 0.4, 1.75, -5.35);
        led.userData.ph = i * 1.3 + k * 0.7;
        G.add(led);
      }
    }
    this.leds = [];
    G.traverse(o => { if (o.userData.ph !== undefined) this.leds.push(o); });

    // ceiling light strips (one flickers) + fan
    const stripMatCfg = { map: 'glowWhite', unlit: true, additive: true, opacity: 0.85, depthWrite: false };
    this.strips = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(9, 0.18, 0.9), makePS1Material(stripMatCfg));
      s.position.set(-8 + i * 8, 9.4, i === 1 ? 2.5 : -1.5);
      G.add(s);
      this.strips.push(s);
    }
    const fanMat = makePS1Material({ map: 'metal', uvScale: [1, 1], tint: [0.6, 0.65, 0.75] });
    const fan = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 0.7), fanMat);
      blade.rotation.y = i * Math.PI / 2;
      blade.position.set(Math.cos(i * Math.PI / 2) * 1.8, 0, Math.sin(i * Math.PI / 2) * 1.8);
      blade.rotation.z = 0.12;
      fan.add(blade);
    }
    fan.position.set(4, 9.2, 2.5);
    G.add(fan);
    this.fan = fan;

    // floating coffee cup (a slow tumble, a long way from home)
    const cupMat = makePS1Material({ map: 'metal', uvScale: [1, 1], tint: [1.1, 1.05, 0.95] });
    const cup = new THREE.Group();
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.5, 1.1, 8), cupMat);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.09, 5, 8), cupMat);
    handle.position.set(0.74, 0.06, 0);
    cup.add(cyl, handle);
    cup.position.set(2.6, 3.0, -2.6);
    cup.scale.setScalar(1.15);
    G.add(cup);
    this.cup = cup;

    // stools
    for (const sx of [-7.5, 7.5]) {
      const stool = boxParts([
        [1.1, 0.16, 1.1, 0, 1.05, 0], [0.16, 1.0, 0.16, 0, 0.5, 0],
        [0.9, 0.1, 0.9, 0, 0.05, 0],
      ], cupMat);
      stool.position.set(sx, 0, -5.2);
      G.add(stool);
    }

    // dust motes near the light strips
    const dN = 70;
    const dpos = new Float32Array(dN * 3);
    for (let i = 0; i < dN; i++) dpos.set([(Math.random() - 0.5) * 20, 2 + Math.random() * 7, (Math.random() - 0.5) * 10], i * 3);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
    this.motes = new THREE.Points(dg, new THREE.PointsMaterial({
      map: tex('star'), color: 0xbfcbe8, size: 1.6, sizeAttenuation: false,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5,
    }));
    G.add(this.motes);

    this._freightT = 6;
    root.add(G);
  },

  update(ctx, t, dt) {
    // planet + cloud-slow rotation
    this.planet.rotation.y = t * 0.007;
    for (const mo of this.moons) {
      const a = mo.ph + t * mo.sp;
      mo.mesh.position.set(9 + Math.cos(a) * mo.r, 14 + Math.sin(a * 1.7) * 2 + mo.y0 * 0.1, -105 + Math.sin(a) * mo.r);
    }

    // freighter crossing every 18 s
    this._freightT -= dt;
    if (this._freightT <= -7) this._freightT = 18;
    const k = this._freightT;
    this.freight.visible = k < 0 && k > -6.5;
    if (this.freight.visible) {
      const p = -k / 6.5;
      this.freight.position.set(34 - p * 68, 7 + Math.sin(p * 3) * 0.6, -55 - p * 8);
      this.freight.rotation.z = 0.06;
    }

    // satellite blink + drift
    this.sat.visible = (t % 2.2) < 0.35;
    this.sat.position.x = -30 + Math.sin(t * 0.05) * 8;

    // screens scroll
    for (const s of this.screens) s.update(t);

    // LEDs
    for (const led of this.leds) led.visible = ((t + led.userData.ph) % 1.6) < 0.9;

    // ceiling strips: the middle one flickers
    for (let i = 0; i < this.strips.length; i++) {
      const base = 0.8;
      const flick = i === 1 ? (Math.sin(t * 31) > -0.82 ? 1 : 0.15) : 1;
      this.strips[i].material.uniforms.uOpacity.value = base * flick;
    }

    this.fan.rotation.y = t * 0.8;

    // cup tumble + gentle bob, drifting slowly across the lounge
    this.cup.rotation.x = t * 0.22;
    this.cup.rotation.z = t * 0.13;
    this.cup.position.y = 3.0 + Math.sin(t * 0.4) * 0.3;
    this.cup.position.x = 2.6 + Math.sin(t * 0.07) * 1.2;

    // glass reflection slide
    this.glassShine.material.uniforms.uOpacity.value = 0.07 + 0.05 * Math.sin(t * 0.35);

    // dust motes swirl
    this.motes.rotation.y = Math.sin(t * 0.03) * 0.06;
  },
};
