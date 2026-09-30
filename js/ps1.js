// ============================================================
// PS1Material: the whole PlayStation 1 vertex/pixel feature set.
//  - integer vertex snapping (polygon jitter)
//  - affine texture mapping (texture warping)
//  - Gouraud per-vertex lighting (2-light rig: key + fill + ambient)
//  - per-vertex linear distance fog
//  - point-sampled tiny textures, alpha-test cutouts
// Global light/fog uniforms are SHARED by every material, like a
// PS1 engine's global light rig; scenes just reconfigure them.
// ============================================================
import * as THREE from 'three';
import { Toggles, RT_W, RT_H } from './config.js';
import { tex } from './textures.js';

export const PS1Global = {
  uLightDir:   { value: new THREE.Vector3(0.5, 0.7, 0.4).normalize() },
  uLightColor: { value: new THREE.Color(1.0, 0.95, 0.85) },
  uFillDir:    { value: new THREE.Vector3(-0.6, -0.2, -0.4).normalize() },
  uFillColor:  { value: new THREE.Color(0.18, 0.2, 0.3) },
  uAmbient:    { value: new THREE.Color(0.22, 0.22, 0.28) },
  uFogColor:   { value: new THREE.Color(0.02, 0.03, 0.08) },
  uFogNear:    { value: 60 },
  uFogFar:     { value: 400 },
  uJitter:     { value: 1 },
  uAffine:     { value: 1 },
  uFogOn:      { value: 1 },
  uLightOn:    { value: 1 },
  uSnapRes:    { value: new THREE.Vector2(RT_W, RT_H) },
};

const VERT = /* glsl */`
// (position / normal / uv attributes and the standard matrices are
//  injected automatically by ShaderMaterial - do not redeclare)

uniform vec3 uLightDir, uLightColor, uFillDir, uFillColor, uAmbient, uFogColor;
uniform float uFogNear, uFogFar, uJitter, uFogOn, uLightOn;
uniform vec2 uSnapRes;

varying vec3 vColor;
varying float vFog;
varying vec2 vUvP;
varying vec2 vUvA;
varying float vW;

void main() {
  mat4 model = modelMatrix;
  #ifdef USE_INSTANCING
    model = modelMatrix * instanceMatrix;   // InstancedMesh support
  #endif
  vec4 world = model * vec4(position, 1.0);
  vec4 view  = viewMatrix * world;
  vec4 clip  = projectionMatrix * view;

  // --- vertex snapping: quantize NDC to the 320x240 pixel grid ---
  if (uJitter > 0.5) {
    vec3 ndc = clip.xyz / clip.w;
    vec2 px = floor(ndc.xy * uSnapRes * 0.5 + 0.5);
    ndc.xy = px / (uSnapRes * 0.5);
    clip.xyz = ndc * clip.w;
  }

  // --- Gouraud lighting, evaluated per vertex ---
  vec3 n = normalize(mat3(model) * normal);
  float ndl = max(dot(n, uLightDir), 0.0);
  float ndf = max(dot(n, uFillDir), 0.0);
  vec3 lit = uAmbient + uLightColor * ndl + uFillColor * ndf;
  lit = mix(vec3(1.0), lit, uLightOn);

  // --- per-vertex linear fog ---
  float dist = length(view.xyz);
  float f = clamp((dist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0) * uFogOn;

  vColor = lit;
  vFog = f;
  vUvP = uv;
  vUvA = uv * clip.w;   // for affine mapping: divide by interpolated w in FS
  vW = clip.w;
  gl_Position = clip;
}
`;

const FRAG = /* glsl */`
precision highp float;

uniform sampler2D map;
uniform vec2 uUVScale;
uniform vec3 uTint;
uniform vec3 uFogColor;
uniform float uOpacity, uAlphaTest, uAffine, uUnlit;

varying vec3 vColor;
varying float vFog;
varying vec2 vUvP;
varying vec2 vUvA;
varying float vW;

void main() {
  // affine vs perspective-correct UVs, switchable live
  vec2 uvA = vUvA / vW;
  vec2 uv = mix(vUvP, uvA, uAffine) * uUVScale;
  vec4 t = texture2D(map, uv);
  if (t.a < uAlphaTest) discard;
  vec3 c = t.rgb * uTint;
  c *= mix(vec3(1.0), vColor, 1.0 - uUnlit);  // uUnlit=1 -> fullbright
  c = mix(c, uFogColor, vFog);
  gl_FragColor = vec4(c, t.a * uOpacity);
}
`;

export function makePS1Material(opts = {}) {
  const m = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      // shared rig (same uniform objects across all materials)
      uLightDir: PS1Global.uLightDir, uLightColor: PS1Global.uLightColor,
      uFillDir: PS1Global.uFillDir, uFillColor: PS1Global.uFillColor,
      uAmbient: PS1Global.uAmbient, uFogColor: PS1Global.uFogColor,
      uFogNear: PS1Global.uFogNear, uFogFar: PS1Global.uFogFar,
      uJitter: PS1Global.uJitter, uAffine: PS1Global.uAffine,
      uFogOn: PS1Global.uFogOn, uLightOn: PS1Global.uLightOn,
      uSnapRes: PS1Global.uSnapRes,
      // per material
      map: { value: opts.map instanceof THREE.Texture ? opts.map : tex(opts.map || 'metal') },
      uUVScale: { value: new THREE.Vector2(...(opts.uvScale || [1, 1])) },
      uTint: { value: new THREE.Color(...(opts.tint || [1, 1, 1])) },
      uOpacity: { value: opts.opacity ?? 1 },
      uAlphaTest: { value: opts.alphaTest ?? 0 },
      uUnlit: { value: opts.unlit ? 1 : 0 },
    },
    transparent: !!opts.transparent || !!opts.additive,
    blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: opts.depthWrite ?? !opts.additive,
    side: opts.side ?? THREE.FrontSide,
  });
  return m;
}

// billboard sprite helper (PS1 games used camera-facing quads for glows)
export function makeSprite(mapName, { scale = 1, additive = true, unlit = true, opacity = 1, alphaTest = 0, depthTest = true } = {}) {
  const mat = makePS1Material({
    map: mapName, additive, unlit, opacity, alphaTest,
    transparent: true, side: THREE.DoubleSide,
  });
  mat.depthTest = depthTest;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  if (Array.isArray(scale)) mesh.scale.set(scale[0], scale[1], 1);
  else mesh.scale.setScalar(scale);
  mesh.userData.billboard = true;
  mesh.renderOrder = additive ? 10 : 0;
  return mesh;
}

export function updateBillboards(root, camera) {
  root.traverse(o => {
    if (o.userData.billboard) o.quaternion.copy(camera.quaternion);
  });
}

// layered starfield: dense white + sparse blue giants + sparse warm stars
export function makeStarField(n, radius, { dim = 1 } = {}) {
  const group = new THREE.Group();
  const layers = [
    { count: Math.round(n * 0.72), color: 0xd8e2ff, size: 2.0, opacity: 0.9 * dim },
    { count: Math.round(n * 0.16), color: 0x9fc4ff, size: 3.4, opacity: 0.95 * dim },
    { count: Math.round(n * 0.12), color: 0xffd9a8, size: 3.0, opacity: 0.9 * dim },
  ];
  for (const L of layers) {
    const pos = new Float32Array(L.count * 3);
    for (let i = 0; i < L.count; i++) {
      const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
        .normalize().multiplyScalar(radius * (0.9 + Math.random() * 0.2));
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({
      map: tex('star'), color: L.color, size: L.size, sizeAttenuation: false,
      transparent: true, opacity: L.opacity, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    p.renderOrder = -10;
    group.add(p);
  }
  return group;
}

// helper: build a box group from parts spec, all sharing one material
export function boxParts(parts, material) {
  const g = new THREE.Group();
  for (const [w, h, d, x, y, z, ry = 0, rx = 0, rz = 0] of parts) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    g.add(m);
  }
  return g;
}
