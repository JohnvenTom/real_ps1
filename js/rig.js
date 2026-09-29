// ============================================================
// Camera rig: default is a fixed anchor with a slow "breathing"
// sway (as if a person is holding still,微微呼吸), F switches to
// pointer-locked free flight (WASD + QE + wheel speed), and on
// release it eases back to the anchor.
// ============================================================
import * as THREE from 'three';

export class Rig {
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;
    this.mode = 'idle';           // idle | fly | return
    this.wantFlyOnClick = false;  // main.js enables during PLAYING
    this.anchor = { pos: new THREE.Vector3(0, 0, 10), look: new THREE.Vector3(0, 0, 0), fov: 60 };
    this.swayAmp = 0.18;
    this.flySpeed = 10;
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.bounds = null;           // THREE.Box3 clamp for fly mode (interior scene)
    this.keys = new Set();
    this._returnT = 0;
    this._from = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
    this._t = 0;

    canvas.addEventListener('click', () => {
      if (this.wantFlyOnClick && this.mode === 'idle') this.enterFly();
    });
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== canvas && this.mode === 'fly') this.exitFly();
    });
    document.addEventListener('mousemove', e => {
      if (this.mode !== 'fly' || document.pointerLockElement !== canvas) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch -= e.movementY * 0.0022;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    });
    window.addEventListener('wheel', e => {
      if (this.mode !== 'fly') return;
      this.flySpeed *= e.deltaY < 0 ? 1.15 : 0.87;
      this.flySpeed = Math.max(1.5, Math.min(80, this.flySpeed));
    }, { passive: true });
    window.addEventListener('keydown', e => this.keys.add(e.code));
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  setAnchor(pos, look, fov = 60, swayAmp = 0.18) {
    this.anchor.pos.copy(pos); this.anchor.look.copy(look);
    this.anchor.fov = fov; this.swayAmp = swayAmp ?? 0.18;
    this.mode = 'idle';
    this.camera.fov = fov;
    this.camera.position.copy(pos);
    this.camera.lookAt(look);
    this.camera.updateProjectionMatrix();
  }

  enterFly() {
    if (this.mode === 'fly') return;
    this.mode = 'fly';
    const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
    this.yaw = e.y; this.pitch = e.x;
    this.vel.set(0, 0, 0);
    this.canvas.requestPointerLock?.();
  }

  exitFly() {
    if (this.mode !== 'fly') return;
    this.mode = 'return';
    this._returnT = 0;
    this._from.pos.copy(this.camera.position);
    this._from.quat.copy(this.camera.quaternion);
    if (document.pointerLockElement) document.exitPointerLock();
  }

  update(dt, t) {
    const cam = this.camera;
    if (this.mode === 'idle') {
      // breathing: two layered sines, slight roll = a person floating still
      const a = this.swayAmp;
      const px = Math.sin(t * 0.55) * a * 0.6 + Math.sin(t * 0.17 + 1.3) * a * 0.4;
      const py = Math.sin(t * 0.4 + 0.7) * a * 0.5 + Math.sin(t * 0.13) * a * 0.5;
      const pz = Math.cos(t * 0.31 + 2.1) * a * 0.4;
      cam.position.set(
        this.anchor.pos.x + px,
        this.anchor.pos.y + py,
        this.anchor.pos.z + pz
      );
      cam.lookAt(
        this.anchor.look.x + px * 0.3,
        this.anchor.look.y + py * 0.3,
        this.anchor.look.z
      );
      cam.rotation.z += Math.sin(t * 0.23) * 0.004;
    } else if (this.mode === 'fly') {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
      cam.quaternion.copy(q);
      const dir = new THREE.Vector3();
      if (this.keys.has('KeyW')) dir.z -= 1;
      if (this.keys.has('KeyS')) dir.z += 1;
      if (this.keys.has('KeyA')) dir.x -= 1;
      if (this.keys.has('KeyD')) dir.x += 1;
      if (this.keys.has('KeyQ') || this.keys.has('ControlLeft')) dir.y -= 1;
      if (this.keys.has('KeyE') || this.keys.has('Space')) dir.y += 1;
      if (dir.lengthSq() > 0) dir.normalize();
      dir.applyQuaternion(q);
      const boost = this.keys.has('ShiftLeft') ? 3.2 : 1;
      this.vel.lerp(dir.multiplyScalar(this.flySpeed * boost), 1 - Math.pow(0.001, dt));
      cam.position.addScaledVector(this.vel, dt);
      if (this.bounds) this.bounds.clampPoint(cam.position, cam.position);
    } else if (this.mode === 'return') {
      this._returnT += dt / 1.4;
      const k = this._returnT >= 1 ? 1 : 1 - Math.pow(1 - this._returnT, 3);
      cam.position.lerpVectors(this._from.pos, this.anchor.pos, k);
      // ease look direction by slerp toward anchor orientation
      const target = new THREE.Quaternion();
      const m = new THREE.Matrix4().lookAt(cam.position, this.anchor.look, new THREE.Vector3(0, 1, 0));
      target.setFromRotationMatrix(m);
      cam.quaternion.slerpQuaternions(this._from.quat, target, k);
      if (this._returnT >= 1) this.mode = 'idle';
    }
  }
}
