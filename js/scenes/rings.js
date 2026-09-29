// ============================================================
// SCENE 02 - RING DRIVE「環」 Saturn-ring crossing.
// Cream banded giant, tilted ring disc, a Keplerian field of
// instanced ice chunks parallaxing past, backlit sun, 2 moons.
// ============================================================
import * as THREE from 'three';
import { makePS1Material, makeSprite } from '../ps1.js';
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

    // stars + cold nebula
    const n = 600;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = V(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(880);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    G.add(new THREE.Points(sg, new THREE.PointsMaterial({
      map: tex('star'), color: 0xd8e2ff, size: 2.4, sizeAttenuation: false,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    })));
    const neb = makeSprite('glowViolet', { scale: 640, opacity: 0.32 });
    neb.position.set(-260, 160, -700);
    const neb2 = makeSprite('glowBlue', { scale: 520, opacity: 0.22 });
    neb2.position.set(300, -80, -750);
    G.add(neb, neb2);

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

    // moons
    for (const mo of this.moons) {
      const a = mo.ph + t * mo.sp;
      mo.mesh.position.set(Math.cos(a) * mo.r, Math.sin(a * 2) * mo.r * mo.inc, Math.sin(a) * mo.r);
    }
  },
};
