import * as THREE from 'three';

export function buildPencil(scene) {
  const pencilGroup = new THREE.Group();

  // ── Materials ─────────────────────────────────────────────────────────────
  const bodyMat = new THREE.MeshStandardMaterial({
    color: '#f0c038', roughness: 0.55, metalness: 0.0, flatShading: true,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: '#f0ece0',    // white/cream exposed wood
    roughness: 0.82, metalness: 0.0, flatShading: true,
  });
  const graphiteMat = new THREE.MeshStandardMaterial({
    color: '#0a0a10', roughness: 0.30, metalness: 0.18,
  });
  const ferruleMat = new THREE.MeshStandardMaterial({
    color: '#c8d4dc', roughness: 0.10, metalness: 0.97,
  });
  const eraserMat = new THREE.MeshStandardMaterial({
    color: '#f07878', roughness: 0.90, metalness: 0.0,
  });

  // ── Hexagonal body ────────────────────────────────────────────────────────
  // Body extends from y = -4 (bottom) to y = +4 (top). Length = 8.
  const bodyGeo  = new THREE.CylinderGeometry(0.5, 0.5, 8.0, 6);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  pencilGroup.add(bodyMesh);  // centred at y=0

  // ── Sharpened wood cone (white) ───────────────────────────────────────────
  // ConeGeometry default: apex at local +y = +h/2, base at local -y = -h/2.
  // After rotation.x = PI: apex → world -y, base → world +y relative to centre.
  //   base world y = meshY + 0.75, apex world y = meshY - 0.75
  // We want base flush with body bottom (y = -4):
  //   meshY = -4 - 0.75 = -4.75   →   apex at -5.50
  const woodConeGeo  = new THREE.ConeGeometry(0.5, 1.5, 6);
  const woodConeMesh = new THREE.Mesh(woodConeGeo, woodMat);
  woodConeMesh.rotation.x = Math.PI;
  woodConeMesh.position.y = -4.75;
  pencilGroup.add(woodConeMesh);

  // ── Graphite rod visible through the taper ────────────────────────────────
  // Thin cylinder centred at the same y as the wood cone.
  // Extends y = -4.75 ± 0.65  →  -4.10 to -5.40
  const rodGeo  = new THREE.CylinderGeometry(0.072, 0.072, 1.3, 10);
  const rodMesh = new THREE.Mesh(rodGeo, graphiteMat);
  rodMesh.position.y = -4.75;
  pencilGroup.add(rodMesh);

  // ── Graphite tip (very sharp black cone) ──────────────────────────────────
  // h=0.28:  base at meshY + 0.14,  apex at meshY - 0.14
  // base connects to rod bottom (-5.40): meshY = -5.40 - 0.14 = -5.54
  // apex at -5.68
  const tipGeo  = new THREE.ConeGeometry(0.072, 0.28, 10);
  const tipMesh = new THREE.Mesh(tipGeo, graphiteMat);
  tipMesh.rotation.x = Math.PI;
  tipMesh.position.y = -5.54;
  pencilGroup.add(tipMesh);

  // ── Ferrule — silver metallic ring ────────────────────────────────────────
  const ferruleGeo  = new THREE.CylinderGeometry(0.548, 0.548, 0.42, 24);
  const ferruleMesh = new THREE.Mesh(ferruleGeo, ferruleMat);
  ferruleMesh.position.y = 4.21;
  pencilGroup.add(ferruleMesh);

  // Two slim accent grooves on the ferrule
  const grooveGeo = new THREE.CylinderGeometry(0.562, 0.562, 0.055, 24);
  [-0.22, 0.22].forEach(dy => {
    const groove = new THREE.Mesh(grooveGeo, ferruleMat);
    groove.position.y = 4.21 + dy;
    pencilGroup.add(groove);
  });

  // ── Eraser ────────────────────────────────────────────────────────────────
  const eraserGeo  = new THREE.CylinderGeometry(0.5, 0.5, 0.58, 24);
  const eraserMesh = new THREE.Mesh(eraserGeo, eraserMat);
  eraserMesh.position.y = 4.71;
  pencilGroup.add(eraserMesh);

  // Eraser top cap
  const capGeo  = new THREE.CircleGeometry(0.5, 24);
  const capMesh = new THREE.Mesh(capGeo, eraserMat);
  capMesh.rotation.x = -Math.PI / 2;
  capMesh.position.y  = 5.00;
  pencilGroup.add(capMesh);

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

  scene.add(pencilGroup);
  return { group: pencilGroup };
}
