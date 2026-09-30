// ============================================================
// SCENE 02 - RING DRIVE「環」 Saturn-ring crossing.
// Cream banded giant, tilted ring disc, a Keplerian field of
// instanced ice chunks parallaxing past, backlit sun, 2 moons.
// ============================================================
import * as THREE from 'three';
import { makePS1Material, makeSprite, boxParts, makeStarField } from '../ps1.js';
import { tex } from '../textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export default {
  id: 'rings',
  name: 'RING DRIVE',
  jp: '環',
  desc: 'SKIMMING THE ALPHA RINGS',
  anchor: { pos: [0, 17, 42], look: [-4, 11, -120], fov: 60, sway: 0.2 },
  bounds: { min: [-90, -30, -220], max: [90, 60, 70] },
  env: {
    lightDir: [0.85, 0.3, 0.4], lightColor: [1.12, 1.02, 0.88],
    fillDir: [-0.5, 0.45, -0.6], fillColor: [0.2, 0.24, 0.4],
    ambient: [0.27, 0.28, 0.35],
    fogColor: [0.03, 0.03, 0.09], fogNear: 200, fogFar: 1600,
  },

  setup(root, ctx) {
    this.group = new THREE.Group();
    const G = this.group;

    // layered stars + structured nebula + distant galaxy
    G.add(makeStarField(640, 900));
    const neb = makeSprite('nebulaViolet', { scale: 700, opacity: 0.8 });
    neb.position.set(-260, 160, -700);
    const neb2 = makeSprite('nebulaCyan', { scale: 540, opacity: 0.66 });
    neb2.position.set(300, -80, -750);
    const nebWash = makeSprite('glowViolet', { scale: 640, opacity: 0.18 });
    nebWash.position.set(-260, 160, -700);
    const galaxy = makeSprite('glowWhite', { scale: 40, opacity: 0.5 });
    galaxy.position.set(-420, 260, -850);
    G.add(neb, neb2, nebWash, galaxy);

    // saturn system group (planet + ring + chunks), tilted for an oblique view
    const sys = new THREE.Group();
    sys.position.set(-6, 6, -180);
    sys.rotation.set(0.3, 0, 0.16);

    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(78, 34, 22),
      makePS1Material({ map: 'planetCream', uvScale: [4, 2] })
    );
    sys.add(planet);
    this.planet = planet;
    const limb = makeSprite('glowBlue', { scale: 190, opacity: 0.35 });
    limb.position.z = -10;
    sys.add(limb);
    // thin atmosphere shell hugging the limb
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(80.4, 24, 16),
      makePS1Material({ map: 'glowBlue', unlit: true, additive: true, transparent: true, opacity: 0.15, depthWrite: false, side: THREE.BackSide })
    );
    sys.add(atmo);
    // great storm: bright oval decal crawling along the band (fixed to the sphere)
    this.storm = makeSprite('glowWhite', { scale: [54, 19], opacity: 0.85, tint: [1, 0.92, 0.72] });
    this.storm.position.set(0, 26, -76);
    this.storm.userData.billboard = false;
    this.storm.lookAt(0, 52, -152);   // tangent to the surface, facing outward
    sys.add(this.storm);

    // ring disc (painted concentric bands, cutout center)
    const ring = new THREE.Mesh(
      new THREE.PlaneGeometry(430, 430),
      makePS1Material({ map: 'ringDisc', transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, opacity: 0.96, tint: [1.15, 1.12, 1.05] })
    );
    ring.rotation.x = -Math.PI / 2;
    sys.add(ring);

    // Keplerian ice chunks: instanced low-poly icosahedra in the ring plane
    const N = 84;
    const chunkGeo = new THREE.IcosahedronGeometry(1, 0);
    const chunkMat = makePS1Material({ map: 'ice', uvScale: [1, 1] });
    const chunks = new THREE.InstancedMesh(chunkGeo, chunkMat, N);
    this.chunkData = [];
    for (let i = 0; i < N; i++) {
      // bias toward the inner ring so foreground parallax actually passes the camera
      const r = 92 + Math.pow(Math.random(), 1.6) * 118;
      const big = i === 0 ? 6.5 : 1.2 + Math.random() * 2.0;   // one big shepherd chunk
      this.chunkData.push({
        r, ang: Math.random() * Math.PI * 2,
        w: 0.05 * Math.pow(100 / r, 1.5),                       // inner = faster
        y: (Math.random() - 0.5) * 2.2,
        scale: big,
        tumble: Math.random() * 6.28,
        tumbleW: (Math.random() - 0.5) * 2,
      });
    }
    sys.add(chunks);
    this.chunks = chunks;
    this._m4 = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();

    // two moons on inclined slow orbits
    this.moons = [];
    for (const [r, sp, sz] of [[300, 0.014, 7], [430, 0.008, 4.5]]) {
      const mo = new THREE.Mesh(new THREE.SphereGeometry(sz, 12, 8), makePS1Material({ map: 'rockBlue' }));
      sys.add(mo);
      this.moons.push({ mesh: mo, r, sp, ph: Math.random() * 6.28, inc: 0.1 + Math.random() * 0.2 });
    }

    // fast inner rubble layer (second instanced field, small + quick)
    const RN = 36;
    const rubble = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 0),
      makePS1Material({ map: 'ice', uvScale: [1, 1] }), RN);
    this.rubbleData = [];
    for (let i = 0; i < RN; i++) {
      this.rubbleData.push({
        r: 92 + Math.random() * 26,
        ang: Math.random() * Math.PI * 2,
        w: 0.075 + Math.random() * 0.03,
        y: (Math.random() - 0.5) * 1.4,
        scale: 0.5 + Math.random() * 0.9,
        tumble: Math.random() * 6.28,
        tumbleW: (Math.random() - 0.5) * 3,
      });
    }
    sys.add(rubble);
    this.rubble = rubble;

    // research probe parked in the ring plane: hull + solar wings + blinker
    const probeMat = makePS1Material({ map: 'hull2', uvScale: [1, 1] });
    const probe = new THREE.Group();
    const pbody = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 2.2), probeMat);
    const pdish = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.2, 0.5, 8, 1, true), probeMat);
    pdish.rotation.z = Math.PI / 3; pdish.position.set(0, 1.6, 0);
    probe.add(pbody, pdish);
    const solarMat = makePS1Material({ map: 'solar', uvScale: [2, 1], side: THREE.DoubleSide });
    for (const sx of [-2.9, 2.9]) {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), solarMat);
      wing.rotation.x = -Math.PI / 2;
      wing.position.set(sx, 0.2, 0);
      probe.add(wing);
    }
    this.probeBlink = makeSprite('glowRed', { scale: 3.2 });
    this.probeBlink.position.set(0, 3.2, 0);
    probe.add(this.probeBlink);
    probe.scale.setScalar(2.0);
    sys.add(probe);
    this.probe = probe;
    this.probeAng = 2.1;

    // fine ring dust drifting past near the camera plane
    const dN = 260;
    const dpos = new Float32Array(dN * 3);
    for (let i = 0; i < dN; i++) {
      const ang = Math.random() * Math.PI * 2, rr = 96 + Math.random() * 130;
      dpos.set([Math.cos(ang) * rr, (Math.random() - 0.5) * 3.5, Math.sin(ang) * rr], i * 3);
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
    this.ringDust = new THREE.Points(dg, new THREE.PointsMaterial({
      map: tex('star'), color: 0xc9dbe8, size: 1.6, sizeAttenuation: false,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55,
    }));
    sys.add(this.ringDust);

    G.add(sys);
    this.sys = sys;

    // backlit sun with cross streaks, up and clear of the ring disc
    const sun = makeSprite('glowSun', { scale: 62 });
    sun.position.set(120, 185, -440);
    const s1 = makeSprite('streak', { scale: [300, 11], opacity: 0.75 }); s1.position.copy(sun.position);
    const s2 = makeSprite('streak', { scale: [11, 180], opacity: 0.5 }); s2.position.copy(sun.position);
    G.add(sun, s1, s2);

    root.add(G);
  },

  update(ctx, t, dt) {
    this.planet.rotation.y = t * 0.006;
    this.sys.rotation.y = t * 0.004;
    // storm crawls along its latitude band
    const sa = t * 0.011;
    this.storm.position.set(Math.sin(sa) * 76, 26, -Math.cos(sa) * 76);
    this.storm.lookAt(this.storm.position.clone().multiplyScalar(2));
    this.storm.rotation.z = sa * 0.4;

    // ice chunks orbit + tumble
    for (let i = 0; i < this.chunkData.length; i++) {
      const c = this.chunkData[i];
      const a = c.ang + t * c.w;
      this._e.set(c.tumble + t * c.tumbleW, c.tumble * 2 + t * c.tumbleW * 0.7, 0);
      this._q.setFromEuler(this._e);
      this._m4.compose(
        V(Math.cos(a) * c.r, c.y, Math.sin(a) * c.r),
        this._q,
        V(c.scale, c.scale * 0.8, c.scale)
      );
      this.chunks.setMatrixAt(i, this._m4);
    }
    this.chunks.instanceMatrix.needsUpdate = true;

    // fast inner rubble
    for (let i = 0; i < this.rubbleData.length; i++) {
      const c = this.rubbleData[i];
      const a = c.ang + t * c.w;
      this._e.set(c.tumble + t * c.tumbleW, c.tumble + t * c.tumbleW * 0.6, 0);
      this._q.setFromEuler(this._e);
      this._m4.compose(
        V(Math.cos(a) * c.r, c.y, Math.sin(a) * c.r),
        this._q,
        V(c.scale, c.scale, c.scale * 0.85)
      );
      this.rubble.setMatrixAt(i, this._m4);
    }
    this.rubble.instanceMatrix.needsUpdate = true;

    // probe orbits slowly, dish slewing, blinker pulsing
    const pa = this.probeAng + t * 0.028;
    this.probe.position.set(Math.cos(pa) * 140, 2.2, Math.sin(pa) * 140);
    this.probe.rotation.set(0, -pa, 0.08 * Math.sin(t * 0.3));
    this.probe.children[1].rotation.y = t * 0.7;
    this.probeBlink.visible = (t % 1.3) < 0.5;

    // moons
    for (const mo of this.moons) {
      const a = mo.ph + t * mo.sp;
      mo.mesh.position.set(Math.cos(a) * mo.r, Math.sin(a * 2) * mo.r * mo.inc, Math.sin(a) * mo.r);
    }

    // ring dust drifts with the orbital flow
    this.ringDust.rotation.y = t * 0.01;
  },
};
