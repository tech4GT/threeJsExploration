import * as THREE from 'three';

// Hard-coded waypoints for each of the 6 stages (0–5).
const WAYPOINTS = [
  // Stage 0 — full pencil, slightly elevated
  { pos: new THREE.Vector3(0, 2, 18),     target: new THREE.Vector3(0, 0, 0) },
  // Stage 1 — graphite tip: fly close from the front, point camera down at the nib
  { pos: new THREE.Vector3(0, -2.8, 2.4), target: new THREE.Vector3(0, -5.2, 0) },
  // Stage 2 — graphene layers: SIDE VIEW from +X so the stacked sheets are unmistakable
  //   Camera is at height 0 (same as layer midplane) looking straight across.
  //   The three sheets appear as glowing horizontal bands separated by clear gaps.
  { pos: new THREE.Vector3(9, 0.3, 1),    target: new THREE.Vector3(0, 0, 0) },
  // Stage 3 — single graphene sheet: tilt to top-down close-up of one layer.
  //   Transition from side → top reads as the camera "locking on" to one sheet.
  { pos: new THREE.Vector3(0.3, 8, 0.6),  target: new THREE.Vector3(0, 0, 0) },
  // Stage 4 — carbon atom
  { pos: new THREE.Vector3(3, 2, 8),      target: new THREE.Vector3(0, 0, 0) },
  // Stage 5 — logo reveal (pull back, centre)
  { pos: new THREE.Vector3(0, 0.5, 11),   target: new THREE.Vector3(0, 0, 0) },
];

// Duration (seconds) for transitioning from stage i to stage i+1.
// Stage 1→2 is deliberately snappy (2s) so the scale-jump reads as a deliberate
// "drill-in" cut rather than a lazy cross-fade.
const DURATIONS = [4, 2, 3, 4, 3];

const NUM_STAGES = WAYPOINTS.length;

export class CameraSystem {
  constructor(camera) {
    this._camera = camera;

    this._currentStage    = 0;
    this._targetStage     = 0;
    this._isTransitioning = false;
    this._transitionTimer = 0;

    this._onStageChangeCb = null;

    this.lerpedPos    = WAYPOINTS[0].pos.clone();
    this.lerpedTarget = WAYPOINTS[0].target.clone();

    this._camera.position.copy(this.lerpedPos);
    this._camera.lookAt(this.lerpedTarget);
  }

  get currentStage()    { return this._currentStage; }
  get targetStage()     { return this._targetStage; }
  get isTransitioning() { return this._isTransitioning; }

  onStageChange(cb) {
    this._onStageChangeCb = cb;
  }

  goToStage(n) {
    const clamped = Math.max(0, Math.min(NUM_STAGES - 1, n));
    if (clamped === this._targetStage) return;

    const from = this._currentStage;
    if (this._onStageChangeCb) this._onStageChangeCb(from, clamped);

    this._currentStage    = clamped;
    this._targetStage     = clamped;
    this._isTransitioning = true;
    this._transitionTimer = 0;
  }

  update(delta) {
    const waypoint = WAYPOINTS[this._targetStage];
    // Higher lerp factor = snappier camera; feels more like an active zoom/cut
    // than a floaty drift. Clamped so it never overshoots.
    const factor   = Math.min(1, delta * 2.2);

    this.lerpedPos.lerp(waypoint.pos, factor);
    this.lerpedTarget.lerp(waypoint.target, factor);

    this._camera.position.copy(this.lerpedPos);
    this._camera.lookAt(this.lerpedTarget);

    if (this._isTransitioning) {
      const durationIndex = Math.min(this._targetStage, DURATIONS.length - 1);
      this._transitionTimer += delta;
      if (this._transitionTimer >= DURATIONS[durationIndex]) {
        this.lerpedPos.copy(waypoint.pos);
        this.lerpedTarget.copy(waypoint.target);
        this._camera.position.copy(this.lerpedPos);
        this._camera.lookAt(this.lerpedTarget);
        this._isTransitioning = false;
      }
    }
  }

  handleKeyDown = (e) => {
    if (e.code === 'Space' || e.code === 'ArrowRight') this.goToStage(this._currentStage + 1);
    if (e.code === 'ArrowLeft') this.goToStage(this._currentStage - 1);
  };
}
