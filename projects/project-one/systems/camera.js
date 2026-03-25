import * as THREE from 'three';

// Hard-coded waypoints for each of the 6 stages (0–5).
const WAYPOINTS = [
  // Stage 0 — full pencil view
  { pos: new THREE.Vector3(0, 2, 18),     target: new THREE.Vector3(0, 0, 0) },
  // Stage 1 — graphite tip zoom
  { pos: new THREE.Vector3(0, -3.2, 1.8), target: new THREE.Vector3(0, -4.2, 0) },
  // Stage 2 — graphene layers
  { pos: new THREE.Vector3(0, 5, 0.1),    target: new THREE.Vector3(0, 0, 0) },
  // Stage 3 — single graphene sheet
  { pos: new THREE.Vector3(0, 4, 0.1),    target: new THREE.Vector3(0, 0, 0) },
  // Stage 4 — carbon atom
  { pos: new THREE.Vector3(3, 2, 8),      target: new THREE.Vector3(0, 0, 0) },
  // Stage 5 — logo reveal (pull back, centre)
  { pos: new THREE.Vector3(0, 0.5, 11),   target: new THREE.Vector3(0, 0, 0) },
];

// Duration (seconds) for transitioning from stage i to stage i+1.
const DURATIONS = [4, 5, 3, 4, 3];

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
    const factor   = Math.min(1, delta * 1.5);

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
