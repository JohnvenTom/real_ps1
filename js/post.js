// ============================================================
// Post chain, single pass, owns presentation:
//   scene -> 320x240 RT (nearest) -> [CRT barrel + composite
//   chroma bleed] -> RGB555 quantize + 4x4 Bayer dither ->
//   scanline/slot mask/vignette/noise -> flash/fade -> screen
// ============================================================
import * as THREE from 'three';
import { RT_W, RT_H, Toggles } from './config.js';

const FRAG = /* glsl */`
precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 uOutRes;
uniform float uTime, uQuant, uDither, uCRT, uFlash, uFade;

varying vec2 vUv;

// 4x4 Bayer matrix, procedural. M2 = [[0,2],[3,1]]
float m2(float x, float y) { return 2.0*x + 3.0*y - 4.0*x*y; }
float bayer4(vec2 p) {
  p = floor(mod(p, 4.0));
  float fine   = m2(mod(p.x, 2.0), mod(p.y, 2.0));
  float coarse = m2(mod(floor(p.x / 2.0), 2.0), mod(floor(p.y / 2.0), 2.0));
  return (coarse * 4.0 + fine) / 16.0;   // 0..1
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// composite video approximation: chroma (IQ) blurred wider than luma (Y)
vec3 compositeBlur(vec2 uv) {
  vec2 px = vec2(1.0 / ${RT_W}.0, 1.0 / ${RT_H}.0);
  vec3 c0 = texture2D(tDiffuse, uv).rgb;
  vec3 c1 = texture2D(tDiffuse, uv + vec2(1.15 * px.x, 0.0)).rgb;
  vec3 c2 = texture2D(tDiffuse, uv - vec2(1.15 * px.x, 0.0)).rgb;
  vec3 c3 = texture2D(tDiffuse, uv + vec2(2.6 * px.x, 0.0)).rgb;
  vec3 c4 = texture2D(tDiffuse, uv - vec2(2.6 * px.x, 0.0)).rgb;
  vec3 avg = (c0 + c1 + c2 + c3 + c4) / 5.0;
  // luma from sharp sample, chroma from blurred average
  float y0 = dot(c0, vec3(0.299, 0.587, 0.114));
  float yA = dot(avg, vec3(0.299, 0.587, 0.114));
  return vec3(y0) + (avg - vec3(yA));
}

void main() {
  vec2 uv = vUv;
  vec2 cc = uv * 2.0 - 1.0;

  // --- CRT glass barrel distortion ---
  float r2 = dot(cc, cc);
  vec2 uvC = uv;
  float inGlass = 1.0;
  if (uCRT > 0.5) {
    vec2 warped = cc * (1.0 + 0.055 * r2 + 0.012 * r2 * r2);
    uvC = warped * 0.5 + 0.5;
    if (uvC.x < 0.0 || uvC.x > 1.0 || uvC.y < 0.0 || uvC.y > 1.0) inGlass = 0.0;
    // sample coords get a touch of horizontal wobble (composite jitter)
    uvC.x += sin(uvC.y * 78.0 + uTime * 2.1) * 0.0006;
  }

  vec3 col = uCRT > 0.5 ? compositeBlur(uvC) : texture2D(tDiffuse, uvC).rgb;
  col *= inGlass;

  // --- RGB555 quantization with ordered dither (PS1 framebuffer) ---
  vec2 rtPx = uvC * vec2(${RT_W}.0, ${RT_H}.0);
  if (uQuant > 0.5) {
    float d = mix(0.5, bayer4(rtPx), uDither);
    col = floor(col * 31.0 + d) / 31.0;
  }

  // --- display layer: scanlines, slot mask, vignette, noise ---
  if (uCRT > 0.5) {
    float linePitch = uOutRes.y / ${RT_H}.0;
    float sl = fract(gl_FragCoord.y / max(linePitch, 1.0));
    float scan = 0.72 + 0.28 * (0.5 + 0.5 * cos(sl * 6.28318));
    col *= scan;
    float slot = 0.92 + 0.08 * cos(gl_FragCoord.x * 0.9);
    col *= slot;
    col *= 1.0 - 0.22 * pow(r2 * 0.55, 1.4);            // vignette
    col += (hash(gl_FragCoord.xy + fract(uTime) * 61.7) - 0.5) * 0.045;
    col *= 1.06;                                          // glass gain
  }

  col = mix(col, vec3(1.0), uFlash);
  col *= (1.0 - uFade);
  gl_FragColor = vec4(col, 1.0);
}
`;

const VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export class Post {
  constructor(renderer) {
    this.renderer = renderer;
    this.rt = new THREE.WebGLRenderTarget(RT_W, RT_H, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
    });
    this.uniforms = {
      tDiffuse: { value: this.rt.texture },
      uOutRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uQuant: { value: 1 },
      uDither: { value: 1 },
      uCRT: { value: 1 },
      uFlash: { value: 0 },
      uFade: { value: 0 },
    };
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: this.uniforms, depthTest: false, depthWrite: false,
    });
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
    this.camera = new THREE.Camera();
  }

  syncToggles() {
    this.uniforms.uQuant.value = Toggles.quantize ? 1 : 0;
    this.uniforms.uDither.value = Toggles.dither ? 1 : 0;
    this.uniforms.uCRT.value = Toggles.crt ? 1 : 0;
  }

  resize(w, h) {
    this.uniforms.uOutRes.value.set(w, h);
  }

  begin() { this.renderer.setRenderTarget(this.rt); }
  end() {
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
  }
}
