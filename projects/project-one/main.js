import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { buildPencil } from './stages/pencil.js';
import { buildGrapheneLayers, buildGrapheneSheet } from './stages/graphene.js';
import { buildAtom } from './stages/atom.js';
import { buildLogo } from './stages/logo.js';
import { CameraSystem } from './systems/camera.js';

// ─── Renderer ────────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ─── Scene ────────────────────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);

// ─── Camera ───────────────────────────────────────────────────────────────────

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);

// ─── Post-processing ──────────────────────────────────────────────────────────

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.2,    // initial strength (stage 0)
  0.30,   // initial radius — tighter than default so glow hugs surfaces
  0.82    // threshold
);
composer.addPass(bloomPass);

const fxaaPass = new ShaderPass(FXAAShader);
fxaaPass.uniforms.resolution.value.set(1 / window.innerWidth, 1 / window.innerHeight);
composer.addPass(fxaaPass);

// ─── Build all stages ─────────────────────────────────────────────────────────

const sheetUniforms = { uTime: { value: 0 } };

const pencil         = buildPencil(scene);
const grapheneLayers = buildGrapheneLayers(scene);
const grapheneSheet  = buildGrapheneSheet(scene, sheetUniforms);
const atom           = buildAtom(scene);
const logo           = buildLogo(scene);

// ─── Stage visibility ─────────────────────────────────────────────────────────

grapheneLayers.group.visible = false;
grapheneSheet.group.visible  = false;
atom.group.visible           = false;
logo.group.visible           = false;
pencil.group.visible         = true;

// ─── Camera system ────────────────────────────────────────────────────────────

const cameraSystem = new CameraSystem(camera);

// ─── Stage metadata ───────────────────────────────────────────────────────────

const STAGE_LABELS = [
  'Pencil — Macro Scale',
  'Graphite Tip — Meso Scale',
  'Graphene Layers — Micro Scale',
  'Graphene Sheet — Nano Scale',
  'Carbon Atom — Atomic Scale',
  'Carbon — The Element',
];

const stageGroups = [
  pencil.group,
  pencil.group,           // stage 1 reuses pencil (camera zooms in)
  grapheneLayers.group,
  grapheneSheet.group,
  atom.group,
  logo.group,
];

// Bloom strengths per stage
const WAYPOINTS_BLOOM = [0.2, 0.5, 1.2, 1.6, 1.8, 2.4];

// Bloom radius per stage: smaller = tighter/crisper glow (no blurry halo).
// Pencil gets moderate spread; atomic structures get tight glow so edges stay sharp.
const WAYPOINTS_BLOOM_RADIUS = [0.28, 0.22, 0.14, 0.12, 0.10, 0.20];

// Near/far per stage
const NEAR_FAR = [
  [0.1,   200],
  [0.05,   20],
  [0.001,  30],
  [0.001,  20],
  [0.01,   50],
  [0.1,   100],
];

// ─── Fade system ─────────────────────────────────────────────────────────────

let activeFades = [];

function startFade(group, targetOpacity, duration) {
  group.traverse(obj => {
    if (obj.isMesh || obj.isLine || obj.isLineSegments || obj.isLineLoop) {
      if (obj.material) obj.material.transparent = true;
    }
  });
  activeFades.push({ group, targetOpacity, duration, elapsed: 0 });
}

function updateFades(delta) {
  activeFades = activeFades.filter(fade => {
    fade.elapsed += delta;
    const t = Math.min(1, fade.elapsed / fade.duration);
    fade.group.traverse(obj => {
      if (obj.isMesh || obj.isLine || obj.isLineSegments || obj.isLineLoop) {
        if (obj.material && obj.material.opacity !== undefined) {
          obj.material.opacity = THREE.MathUtils.lerp(obj.material.opacity, fade.targetOpacity, t);
        }
      }
    });
    if (t >= 1) {
      if (fade.targetOpacity === 0) fade.group.visible = false;
      return false;
    }
    return true;
  });
}

// ─── onStageChange handler ────────────────────────────────────────────────────

cameraSystem.onStageChange((fromStage, toStage) => {

  // ── Special: atom collapse → logo reveal ───────────────────────────────
  if (fromStage === 4 && toStage === 5) {
    atom.startCollapse(() => logo.startReveal());
    // No default fade — collapse handles atom visibility; logo.startReveal handles logo
  } else {
    const prevGroup = stageGroups[fromStage];
    const nextGroup = stageGroups[toStage];

    if (prevGroup !== nextGroup) {
      if (fromStage !== 0 || toStage !== 1) {
        startFade(prevGroup, 0, 1.0);
      }
      nextGroup.visible = true;
      nextGroup.traverse(obj => {
        if ((obj.isMesh || obj.isLine || obj.isLineSegments || obj.isLineLoop) && obj.material) {
          obj.material.transparent = true;
          obj.material.opacity = 0;
        }
      });
      startFade(nextGroup, 1, 1.5);
    }
  }

  // ── Bloom ─────────────────────────────────────────────────────────────
  bloomPass.strength = WAYPOINTS_BLOOM[toStage];
  bloomPass.radius   = WAYPOINTS_BLOOM_RADIUS[toStage];

  // ── Near/far ──────────────────────────────────────────────────────────
  const [near, far] = NEAR_FAR[toStage];
  camera.near = near;
  camera.far  = far;
  camera.updateProjectionMatrix();

  // ── Label ─────────────────────────────────────────────────────────────
  const labelEl = document.getElementById('stage-label');
  if (labelEl) labelEl.textContent = STAGE_LABELS[toStage];

  const hintEl = document.getElementById('hint');
  if (hintEl) {
    hintEl.textContent = toStage === STAGE_LABELS.length - 1
      ? '← to go back'
      : '← → or Space to travel through scales';
  }

  // Shadows only needed for pencil stages
  renderer.shadowMap.enabled = toStage <= 1;
});

// ─── Keyboard input ───────────────────────────────────────────────────────────

window.addEventListener('keydown', cameraSystem.handleKeyDown);

// ─── Animate loop ─────────────────────────────────────────────────────────────

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta   = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  cameraSystem.update(delta);
  atom.update(elapsed);
  logo.update(elapsed);
  sheetUniforms.uTime.value = elapsed;
  updateFades(delta);

  composer.render();
}
animate();

// ─── Resize handler ───────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  fxaaPass.uniforms.resolution.value.set(1 / window.innerWidth, 1 / window.innerHeight);
});
