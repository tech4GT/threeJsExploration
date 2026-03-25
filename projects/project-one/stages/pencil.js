// Stage 0 & 1 — Pencil macro / graphite tip zoom
// The pencil is split into a topGroup and bottomGroup at the break seam (y = 0).
// startBreak(onComplete) shakes the pencil then snaps the two halves apart,
// dramatically revealing the graphite core before the graphene layers appear.

import * as THREE from 'three';

const BREAK_DURATION = 1.5;  // seconds for the full snap animation

export function buildPencil(scene) {
  const pencilGroup = new THREE.Group();

  // ── Materials ─────────────────────────────────────────────────────────────
  const bodyMat = new THREE.MeshStandardMaterial({
    color: '#f0c038', roughness: 0.55, metalness: 0.0, flatShading: true,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: '#f0ece0', roughness: 0.82, metalness: 0.0, flatShading: true,
  });
  // Grey graphite — mid-value so it reads against the dark background
  const graphiteMat = new THREE.MeshStandardMaterial({
    color: '#6a6a7e', roughness: 0.20, metalness: 0.65,
  });
  const ferruleMat = new THREE.MeshStandardMaterial({
    color: '#c8d4dc', roughness: 0.10, metalness: 0.97,
  });
  const eraserMat = new THREE.MeshStandardMaterial({
    color: '#f07878', roughness: 0.90, metalness: 0.0,
  });
  // Interior cross-section exposed at the break point
  const csMat = new THREE.MeshStandardMaterial({
    color: '#d4a030', roughness: 0.60, metalness: 0.0, flatShading: true,
  });
  const csGraphiteMat = new THREE.MeshStandardMaterial({
    color: '#44445a', roughness: 0.25, metalness: 0.55,
  });

  // ── Shared cross-section geometry (one hex face, reused for both halves) ──
  const csFaceGeo   = new THREE.CircleGeometry(0.5, 6);
  const csCoreGeo   = new THREE.CircleGeometry(0.072, 10);

  // ╔══════════════════════════════════════════════════════╗
  // ║  TOP GROUP  — eraser end (y = 0 … +5)               ║
  // ╚══════════════════════════════════════════════════════╝
  const topGroup = new THREE.Group();

  // Upper body half: y = 0 → +4
  const upperBodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 4.0, 6);
  const upperBodyMesh = new THREE.Mesh(upperBodyGeo, bodyMat);
  upperBodyMesh.position.y = 2.0;
  topGroup.add(upperBodyMesh);

  // Cross-section face at the snap point — faces downward (−Y)
  const csFaceTop = new THREE.Mesh(csFaceGeo, csMat);
  csFaceTop.rotation.x  = Math.PI / 2;
  csFaceTop.position.y  = 0.01;
  topGroup.add(csFaceTop);

  const csCoreTop = new THREE.Mesh(csCoreGeo, csGraphiteMat);
  csCoreTop.rotation.x  = Math.PI / 2;
  csCoreTop.position.y  = 0.015;
  topGroup.add(csCoreTop);

  // Ferrule
  const ferruleGeo  = new THREE.CylinderGeometry(0.548, 0.548, 0.42, 24);
  const ferruleMesh = new THREE.Mesh(ferruleGeo, ferruleMat);
  ferruleMesh.position.y = 4.21;
  topGroup.add(ferruleMesh);
  const grooveGeo = new THREE.CylinderGeometry(0.562, 0.562, 0.055, 24);
  [-0.22, 0.22].forEach(dy => {
    const g = new THREE.Mesh(grooveGeo, ferruleMat);
    g.position.y = 4.21 + dy;
    topGroup.add(g);
  });

  // Eraser
  const eraserGeo  = new THREE.CylinderGeometry(0.5, 0.5, 0.58, 24);
  const eraserMesh = new THREE.Mesh(eraserGeo, eraserMat);
  eraserMesh.position.y = 4.71;
  topGroup.add(eraserMesh);
  const capGeo  = new THREE.CircleGeometry(0.5, 24);
  const capMesh = new THREE.Mesh(capGeo, eraserMat);
  capMesh.rotation.x = -Math.PI / 2;
  capMesh.position.y  = 5.00;
  topGroup.add(capMesh);

  // ╔══════════════════════════════════════════════════════╗
  // ║  BOTTOM GROUP  — tip end (y = −4 … 0)               ║
  // ╚══════════════════════════════════════════════════════╝
  const bottomGroup = new THREE.Group();

  // Lower body half: y = −4 → 0
  const lowerBodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 4.0, 6);
  const lowerBodyMesh = new THREE.Mesh(lowerBodyGeo, bodyMat);
  lowerBodyMesh.position.y = -2.0;
  bottomGroup.add(lowerBodyMesh);

  // Cross-section face — faces upward (+Y)
  const csFaceBot = new THREE.Mesh(csFaceGeo, csMat);
  csFaceBot.rotation.x  = -Math.PI / 2;
  csFaceBot.position.y  = -0.01;
  bottomGroup.add(csFaceBot);

  const csCoreBot = new THREE.Mesh(csCoreGeo, csGraphiteMat);
  csCoreBot.rotation.x  = -Math.PI / 2;
  csCoreBot.position.y  = -0.015;
  bottomGroup.add(csCoreBot);

  // Sharpened wood cone:  base at y=−4, apex at y=−5.5
  const woodConeGeo  = new THREE.ConeGeometry(0.5, 1.5, 6);
  const woodConeMesh = new THREE.Mesh(woodConeGeo, woodMat);
  woodConeMesh.rotation.x = Math.PI;
  woodConeMesh.position.y = -4.75;
  bottomGroup.add(woodConeMesh);

  // Graphite rod
  const rodGeo  = new THREE.CylinderGeometry(0.072, 0.072, 1.3, 10);
  const rodMesh = new THREE.Mesh(rodGeo, graphiteMat);
  rodMesh.position.y = -4.75;
  bottomGroup.add(rodMesh);

  // Graphite tip cone
  const tipGeo  = new THREE.ConeGeometry(0.072, 0.28, 10);
  const tipMesh = new THREE.Mesh(tipGeo, graphiteMat);
  tipMesh.rotation.x = Math.PI;
  tipMesh.position.y = -5.54;
  bottomGroup.add(tipMesh);

  pencilGroup.add(topGroup);
  pencilGroup.add(bottomGroup);

  // ── Shadows ───────────────────────────────────────────────────────────────
  pencilGroup.traverse(c => {
    if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
  });

  // ── Lighting ─────────────────────────────────────────────────────────────
  const sun = new THREE.DirectionalLight(0xfff4e0, 3.2);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x6699cc, 0.9);
  fill.position.set(-5, 2, 5);
  scene.add(fill);

  const ambient = new THREE.AmbientLight(0x334466, 1.8);
  scene.add(ambient);

  // Rim light from below-front so the polished grey graphite tip
  // catches a specular highlight against the dark background.
  const rimLight = new THREE.DirectionalLight(0xaaccff, 2.5);
  rimLight.position.set(1, -10, 4);
  scene.add(rimLight);

  scene.add(pencilGroup);

  // ── Break animation state ─────────────────────────────────────────────────
  let _breaking        = false;
  let _breakStartTime  = null;
  let _onBreakComplete = null;

  function startBreak(onComplete) {
    _breakStartTime  = null;   // set lazily on first update tick
    _breaking        = true;
    _onBreakComplete = onComplete;
  }

  function resetBreak() {
    _breaking = false;
    topGroup.position.set(0, 0, 0);
    topGroup.rotation.set(0, 0, 0);
    bottomGroup.position.set(0, 0, 0);
    bottomGroup.rotation.set(0, 0, 0);
  }

  function update(elapsed) {
    if (!_breaking) return;
    if (_breakStartTime === null) _breakStartTime = elapsed;

    const t = Math.min(1, (elapsed - _breakStartTime) / BREAK_DURATION);

    // ── Phase 1 (0 – 0.20): rapid tremor ───────────────────────────────────
    if (t < 0.20) {
      const st = t / 0.20;
      const shake = Math.sin(st * Math.PI * 14) * 0.055 * (1 - st);
      topGroup.position.x    =  shake;
      bottomGroup.position.x = -shake;
    }

    // ── Phase 2 (0.20 – 1.0): snap apart ───────────────────────────────────
    if (t >= 0.20) {
      const ft    = (t - 0.20) / 0.80;
      const eased = ft * ft;               // ease-in: accelerates as halves fly apart

      // Top half: flies up, tilts back
      topGroup.position.y = eased * 5.5;
      topGroup.position.z = eased * 1.5;   // recedes slightly — "away from camera"
      topGroup.rotation.z = eased * 0.45;

      // Bottom half: falls and rotates — reveals the graphite core to the camera
      bottomGroup.position.y = -eased * 4.5;
      bottomGroup.position.z =  eased * 1.2;
      bottomGroup.rotation.z = -eased * 0.35;
    }

    if (t >= 1) {
      _breaking = false;
      if (_onBreakComplete) {
        _onBreakComplete();
        _onBreakComplete = null;
      }
    }
  }

  return { group: pencilGroup, topGroup, bottomGroup, update, startBreak, resetBreak };
}
