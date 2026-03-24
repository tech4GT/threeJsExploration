/**
 * Project One — Fundamentals Playground
 *
 * What this explores:
 *  - Scene / PerspectiveCamera / WebGLRenderer boilerplate
 *  - MeshStandardMaterial (PBR) with roughness & metalness
 *  - AmbientLight + DirectionalLight with shadows
 *  - Multiple geometries (Box, Sphere, Torus, Icosahedron)
 *  - OrbitControls with damping
 *  - Clock-based animation (delta time, elapsed time)
 *  - Resize handling
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ─── Renderer ────────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ─── Scene ────────────────────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d14);
scene.fog = new THREE.FogExp2(0x0d0d14, 0.04);

// ─── Camera ───────────────────────────────────────────────────────────────────

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 6, 14);

// ─── Controls ─────────────────────────────────────────────────────────────────

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 40;
controls.maxPolarAngle = Math.PI / 2 + 0.1;

// ─── Lights ───────────────────────────────────────────────────────────────────

const ambient = new THREE.AmbientLight(0x334466, 1.5);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff4e0, 2.5);
sun.position.set(8, 14, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 60;
sun.shadow.camera.left = -15;
sun.shadow.camera.right = 15;
sun.shadow.camera.top = 15;
sun.shadow.camera.bottom = -15;
sun.shadow.bias = -0.0001;
scene.add(sun);

// Soft fill from opposite side
const fill = new THREE.DirectionalLight(0x4466aa, 0.8);
fill.position.set(-6, 4, -8);
scene.add(fill);

// ─── Floor ────────────────────────────────────────────────────────────────────

const floorGeo = new THREE.PlaneGeometry(40, 40, 1, 1);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x111122,
  roughness: 0.9,
  metalness: 0.1,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ─── Shared materials ─────────────────────────────────────────────────────────

const matA = new THREE.MeshStandardMaterial({ color: 0xff6030, roughness: 0.3, metalness: 0.6 });
const matB = new THREE.MeshStandardMaterial({ color: 0x30aaff, roughness: 0.2, metalness: 0.8 });
const matC = new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.5, metalness: 0.2 });
const matD = new THREE.MeshStandardMaterial({ color: 0x88ff44, roughness: 0.4, metalness: 0.5 });
const matE = new THREE.MeshStandardMaterial({ color: 0xcc44ff, roughness: 0.15, metalness: 0.9 });

// ─── Objects ──────────────────────────────────────────────────────────────────

// Central cube
const cube = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), matA);
cube.position.set(0, 1, 0);
cube.castShadow = true;
cube.receiveShadow = true;
scene.add(cube);

// Orbiting sphere
const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.9, 48, 32), matB);
sphere.castShadow = true;
scene.add(sphere);

// Torus
const torus = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.35, 24, 64), matC);
torus.position.set(-4, 1.2, -1);
torus.castShadow = true;
scene.add(torus);

// Icosahedron
const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), matD);
ico.position.set(4, 1.2, -1);
ico.castShadow = true;
scene.add(ico);

// Torus knot (background accent)
const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.9, 0.28, 120, 16, 2, 3), matE);
knot.position.set(0, 1.2, -5);
knot.castShadow = true;
scene.add(knot);

// Small floating satellites around the cube
const satelliteData = [];
const satelliteGeos = [
  new THREE.BoxGeometry(0.4, 0.4, 0.4),
  new THREE.SphereGeometry(0.25, 16, 12),
  new THREE.OctahedronGeometry(0.35),
];
const satelliteMats = [matA, matB, matC, matD, matE];

for (let i = 0; i < 8; i++) {
  const geo = satelliteGeos[i % satelliteGeos.length];
  const mat = satelliteMats[i % satelliteMats.length];
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  scene.add(mesh);
  satelliteData.push({
    mesh,
    radius: 3.2 + (i % 3) * 0.5,
    speed: 0.4 + i * 0.07,
    phase: (i / 8) * Math.PI * 2,
    yOffset: Math.sin(i * 1.3) * 0.8 + 1.5,
    selfRotAxis: new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize(),
    selfRotSpeed: (Math.random() - 0.5) * 3,
  });
}

// ─── Animation loop ───────────────────────────────────────────────────────────

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Central cube — slow tumble
  cube.rotation.x = elapsed * 0.3;
  cube.rotation.y = elapsed * 0.5;

  // Sphere — orbit around the cube
  const orbitRadius = 4;
  sphere.position.set(
    Math.cos(elapsed * 0.7) * orbitRadius,
    1.5 + Math.sin(elapsed * 1.1) * 0.6,
    Math.sin(elapsed * 0.7) * orbitRadius
  );
  sphere.rotation.y = elapsed * 0.8;

  // Torus — spin on two axes
  torus.rotation.x = elapsed * 0.6;
  torus.rotation.z = elapsed * 0.4;
  torus.position.y = 1.2 + Math.sin(elapsed * 0.9) * 0.4;

  // Icosahedron — bob and spin
  ico.rotation.x = elapsed * 0.5;
  ico.rotation.y = elapsed * 0.7;
  ico.position.y = 1.2 + Math.cos(elapsed * 1.1) * 0.4;

  // Torus knot — rotate on all axes
  knot.rotation.x = elapsed * 0.4;
  knot.rotation.y = elapsed * 0.6;
  knot.position.y = 1.2 + Math.sin(elapsed * 0.7 + 1) * 0.5;

  // Satellites
  for (const s of satelliteData) {
    const angle = elapsed * s.speed + s.phase;
    s.mesh.position.set(
      Math.cos(angle) * s.radius,
      s.yOffset + Math.sin(elapsed * 0.8 + s.phase) * 0.3,
      Math.sin(angle) * s.radius
    );
    s.mesh.rotateOnAxis(s.selfRotAxis, s.selfRotSpeed * delta);
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

// ─── Resize ───────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
