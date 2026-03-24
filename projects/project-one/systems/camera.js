import * as THREE from 'three';

// Hard-coded waypoints for each of the 5 stages (0–4).
const WAYPOINTS = [
  // Stage 0 — full pencil view
  { pos: new THREE.Vector3(0, 2, 18),     target: new THREE.Vector3(0, 0, 0),    near: 0.1,   far: 200, bloomStrength: 0.2 },
  // Stage 1 — graphite tip zoom
  { pos: new THREE.Vector3(0, -3.2, 1.8), target: new THREE.Vector3(0, -4.2, 0), near: 0.05,  far: 20,  bloomStrength: 0.5 },
  // Stage 2 — graphene layers
  { pos: new THREE.Vector3(0, 5, 0.1),    target: new THREE.Vector3(0, 0, 0),    near: 0.001, far: 30,  bloomStrength: 1.0 },
  // Stage 3 — single graphene sheet
  { pos: new THREE.Vector3(0, 4, 0.1),    target: new THREE.Vector3(0, 0, 0),    near: 0.001, far: 20,  bloomStrength: 1.4 },
  // Stage 4 — carbon atom
  { pos: new THREE.Vector3(3, 2, 8),      target: new THREE.Vector3(0, 0, 0),    near: 0.01,  far: 50,  bloomStrength: 1.8 },
];

// Duration (seconds) for transitioning from stage i to stage i+1.
const DURATIONS = [4, 5, 3, 4];

export class CameraSystem {
  constructor(camera) {
    this._camera = camera;

    this._currentStage = 0;
    this._targetStage  = 0;
    this._isTransitioning = false;
    this._transitionTimer = 0;

    this._onStageChangeCb = null;

    // Lerped position and look-at target, seeded from stage 0.
    this.lerpedPos    = WAYPOINTS[0].pos.clone();
    this.lerpedTarget = WAYPOINTS[0].target.clone();

    // Sync the camera immediately.
    this._camera.position.copy(this.lerpedPos);
    this._camera.lookAt(this.lerpedTarget);
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  get currentStage() {
    return this._currentStage;
  }

  get targetStage() {
    return this._targetStage;
  }

  get isTransitioning() {
    return this._isTransitioning;
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Register a callback that fires when a transition STARTS.
   * Signature: cb(fromStage, toStage)
   */
  onStageChange(cb) {
    this._onStageChangeCb = cb;
  }

  /**
   * Trigger a transition to stage n (clamped to [0, 4]).
   * Fires the onStageChange callback immediately.
   * _currentStage is updated right away so visibility logic in main.js can
   * react without waiting for the lerp to finish.
   */
  goToStage(n) {
    const clamped = Math.max(0, Math.min(4, n));

    if (clamped === this._targetStage) return;

    const from = this._currentStage;

    if (this._onStageChangeCb) {
      this._onStageChangeCb(from, clamped);
    }

    this._currentStage    = clamped;
    this._targetStage     = clamped;
    this._isTransitioning = true;
    this._transitionTimer = 0;
  }

  /**
   * Call every frame with the clock delta (seconds).
   * Lerps the camera toward the current target waypoint and snaps once the
   * transition duration has elapsed.
   */
  update(delta) {
    const waypoint = WAYPOINTS[this._targetStage];
    const factor   = Math.min(1, delta * 1.5);

    this.lerpedPos.lerp(waypoint.pos, factor);
    this.lerpedTarget.lerp(waypoint.target, factor);

    this._camera.position.copy(this.lerpedPos);
    this._camera.lookAt(this.lerpedTarget);

    if (this._isTransitioning) {
      // Determine transition duration: travelling between consecutive stages.
      // If the target isn't adjacent to where we came from we use the closest
      // available entry, otherwise fall back to a sensible default.
      const durationIndex = Math.min(this._targetStage, DURATIONS.length - 1);
      const duration = DURATIONS[durationIndex];

      this._transitionTimer += delta;

      if (this._transitionTimer >= duration) {
        // Snap exactly to the waypoint and mark transition complete.
        this.lerpedPos.copy(waypoint.pos);
        this.lerpedTarget.copy(waypoint.target);
        this._camera.position.copy(this.lerpedPos);
        this._camera.lookAt(this.lerpedTarget);
        this._isTransitioning = false;
      }
    }
  }

  /**
   * Arrow function so it can be passed directly to addEventListener without
   * losing `this` context.
   *
   * Space / ArrowRight → advance one stage
   * ArrowLeft          → go back one stage
   */
  handleKeyDown = (e) => {
    if (e.code === 'Space' || e.code === 'ArrowRight') this.goToStage(this._currentStage + 1);
    if (e.code === 'ArrowLeft') this.goToStage(this._currentStage - 1);
  };
}
