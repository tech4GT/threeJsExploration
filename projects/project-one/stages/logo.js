// Stage 5 — Carbon logo reveal
// The "C" letter (carbon symbol) with atomic orbital rings emerges after
// the atom collapses. Built from TubeGeometry arcs and thin tori.

import * as THREE from 'three';

const DEG = Math.PI / 180;
const REVEAL_DURATION = 1.8;

export function buildLogo(scene) {
  const group = new THREE.Group();

  // ── Materials ─────────────────────────────────────────────────────────────
  const glowMat = new THREE.MeshStandardMaterial({
    color:             '#00eeff',
    emissive:          '#0099ff',
    emissiveIntensity: 3.5,
    roughness:         0.2,
    metalness:         0.1,
  });

  const ringMat = new THREE.MeshStandardMaterial({
    color:             '#003355',
    emissive:          '#0066cc',
    emissiveIntensity: 1.8,
    roughness:         0.3,
    metalness:         0.2,
    transparent:       true,
    opacity:           0.75,
  });

  const nodeMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

  // ── "C" arc ───────────────────────────────────────────────────────────────
  // 280° arc (40° → 320° counterclockwise), opening to the right.
  const R          = 2.2;
  const arcStart   = 40  * DEG;
  const arcEnd     = 320 * DEG;
  const arcSteps   = 72;
  const arcPts     = [];
  for (let i = 0; i <= arcSteps; i++) {
    const a = arcStart + (arcEnd - arcStart) * (i / arcSteps);
    arcPts.push(new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0));
  }
  const cCurve = new THREE.CatmullRomCurve3(arcPts);
  const cGeo   = new THREE.TubeGeometry(cCurve, 80, 0.14, 8, false);
  group.add(new THREE.Mesh(cGeo, glowMat));

  // ── Serif arms at the C openings ─────────────────────────────────────────
  // Both end-points share x ≈ R·cos(40°) ≈ 1.685; serifs extend in +X
  const serifLen = 0.55;
  [[arcStart], [arcEnd]].forEach(([a]) => {
    const p0 = new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0);
    const p1 = new THREE.Vector3(p0.x + serifLen, p0.y, 0);
    const serifGeo = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([p0, p1]), 4, 0.14, 8, false
    );
    group.add(new THREE.Mesh(serifGeo, glowMat));
  });

  // ── Six carbon-electron node spheres along the arc ───────────────────────
  const nodeGeo = new THREE.SphereGeometry(0.09, 8, 6);
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const a = arcStart + (arcEnd - arcStart) * t;
    const node = new THREE.Mesh(nodeGeo, nodeMat);
    node.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
    group.add(node);
  }

  // ── Orbital torus rings ───────────────────────────────────────────────────
  const torusGeo = new THREE.TorusGeometry(3.0, 0.045, 8, 128);
  const tilts = [
    [Math.PI * 0.5,  0,            0           ],
    [Math.PI * 0.32, 0,            Math.PI * 0.1],
    [-Math.PI * 0.32, 0,           Math.PI * 0.4],
  ];
  const rings = tilts.map(([rx, ry, rz]) => {
    const ring = new THREE.Mesh(torusGeo, ringMat);
    ring.rotation.set(rx, ry, rz);
    group.add(ring);
    return ring;
  });

  // ── Core glow point light ─────────────────────────────────────────────────
  const coreLight = new THREE.PointLight(0x44eeff, 5, 18);
  group.add(coreLight);

  // ── Flash sphere (brief bright flash at collapse moment) ──────────────────
  const flashGeo  = new THREE.SphereGeometry(0.5, 12, 8);
  const flashMat  = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 });
  const flashMesh = new THREE.Mesh(flashGeo, flashMat);
  group.add(flashMesh);

  // ── Initial state: hidden, scaled to 0 ───────────────────────────────────
  group.visible = false;
  group.scale.setScalar(0);

  scene.add(group);

  // ── Animation state ───────────────────────────────────────────────────────
  let _revealing  = false;
  let _revealStart = null;

  function startReveal() {
    group.visible = true;
    _revealing    = true;
    _revealStart  = null;  // set lazily on first update
  }

  function update(elapsed) {
    if (_revealing) {
      if (_revealStart === null) _revealStart = elapsed;
      const t = Math.min(1, (elapsed - _revealStart) / REVEAL_DURATION);

      // Flash fades in then out quickly
      const flashT = Math.min(1, t * 5);
      flashMesh.material.opacity = Math.max(0, 1 - flashT * 2) * 0.9;

      // Scale: ease-out exponential
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      group.scale.setScalar(eased);

      if (t >= 1) _revealing = false;
    }

    // Gentle logo spin + ring drift
    group.rotation.y = elapsed * 0.18;
    rings[0].rotation.z = elapsed * 0.4;
    rings[1].rotation.y = elapsed * 0.3;
    rings[2].rotation.x += 0.005;
  }

  return { group, update, startReveal };
}
