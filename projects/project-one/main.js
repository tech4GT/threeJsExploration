import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { buildPencil } from './stages/pencil.js';
import { buildGrapheneLayers, buildGrapheneSheet } from './stages/graphene.js';
import { buildAtom } from './stages/atom.js';
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
  0.2,   // initial strength (stage 0)
  0.4,   // radius
  0.85   // threshold
);
composer.addPass(bloomPass);

const fxaaPass = new ShaderPass(FXAAShader);
fxaaPass.uniforms.resolution.value.set(1 / window.innerWidth, 1 / window.innerHeight);
composer.addPass(fxaaPass);

// ─── Build all stages ─────────────────────────────────────────────────────────

// Shared uniforms for graphene sheet shader
const sheetUniforms = { uTime: { value: 0 } };

const pencil         = buildPencil(scene);
const grapheneLayers = buildGrapheneLayers(scene);
const grapheneSheet  = buildGrapheneSheet(scene, sheetUniforms);
const atom           = buildAtom(scene);

// ─── Stage visibility ────────────────────────────────────────────────────────
// All groups start invisible EXCEPT pencil

grapheneLayers.group.visible = false;
grapheneSheet.group.visible  = false;
atom.group.visible           = false;
pencil.group.visible         = true;

// ─── Camera system ───────────────────────────────────────────────────────────

const cameraSystem = new CameraSystem(camera);

// ─── Stage labels ────────────────────────────────────────────────────────────

const STAGE_LABELS = [
  'Pencil — Macro Scale',
  'Graphite Tip — Meso Scale',
  'Graphene Layers — Micro Scale',
  'Graphene Sheet — Nano Scale',
  'Carbon Atom — Atomic Scale',
];

// ─── Stage groups ────────────────────────────────────────────────────────────

const stageGroups = [
  pencil.group,
  pencil.group,           // stage 1 reuses pencil (camera just zooms in)
  grapheneLayers.group,
  grapheneSheet.group,
  atom.group,
];

// ─── Fade system ─────────────────────────────────────────────────────────────

let activeFades = [];  // { group, targetOpacity, duration, elapsed }

function startFade(group, targetOpacity, duration) {
  // set all materials transparent before fade
  group.traverse(obj => {
    if (obj.isMesh || obj.isLine || obj.isLineSegments || obj.isLineLoop) {
      if (obj.material) {
        obj.material.transparent = true;
      }
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
      return false; // remove completed fade
    }
    return true;
  });
}

// ─── Bloom strengths per stage ───────────────────────────────────────────────

const WAYPOINTS_BLOOM = [0.2, 0.5, 1.0, 1.4, 1.8];

// ─── onStageChange handler ───────────────────────────────────────────────────

cameraSystem.onStageChange((fromStage, toStage) => {
  // Show/hide groups — stages 0 and 1 both use pencil.group
  const prevGroup = stageGroups[fromStage];
  const nextGroup = stageGroups[toStage];

  if (prevGroup !== nextGroup) {
    // Fade out old group (unless it's the pencil staying visible for stage 1)
    if (fromStage !== 0 || toStage !== 1) {
      startFade(prevGroup, 0, 1.0);
    }
    // Show and fade in new group
    nextGroup.visible = true;
    // Set all mesh opacities to 0 first so fade-in works
    nextGroup.traverse(obj => {
      if ((obj.isMesh || obj.isLine || obj.isLineSegments || obj.isLineLoop) && obj.material) {
        obj.material.transparent = true;
        obj.material.opacity = 0;
      }
    });
    startFade(nextGroup, 1, 1.5);
  }

  // Update bloom
  bloomPass.strength = WAYPOINTS_BLOOM[toStage];

  // Update camera near/far
  const NEAR_FAR = [
    [0.1, 200], [0.05, 20], [0.001, 30], [0.001, 20], [0.01, 50]
  ];
  const [near, far] = NEAR_FAR[toStage];
  camera.near = near;
  camera.far  = far;
  camera.updateProjectionMatrix();

  // Update UI label
  const labelEl = document.getElementById('stage-label');
  if (labelEl) labelEl.textContent = STAGE_LABELS[toStage];

  // Shadows only needed for stage 0 and 1
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
