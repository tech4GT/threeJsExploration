import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Hex grid generator — two-atom basis (A and B sublattice)
// Returns array of [x, z] pairs for atom positions in the XZ plane.
// ---------------------------------------------------------------------------
function hexGrid(R, bondLength) {
  const atoms = [];
  const spacing = bondLength * Math.sqrt(3);
  for (let row = -R; row <= R; row++) {
    for (let col = -R; col <= R; col++) {
      const xA = col * spacing + (row % 2 === 0 ? 0 : spacing * 0.5);
      const zA = row * bondLength * 1.5;
      atoms.push([xA, zA]);                                                       // sublattice A
      atoms.push([xA + bondLength * Math.sqrt(3) * 0.5, zA + bondLength * 0.5]); // sublattice B
    }
  }
  return atoms;
}

// ---------------------------------------------------------------------------
// Bond generation helpers
// ---------------------------------------------------------------------------
function buildBondPositions(atoms, yLevel, bondLength) {
  const threshold = bondLength * 1.1;
  const threshSq  = threshold * threshold;
  const positions = [];

  for (let i = 0; i < atoms.length; i++) {
    const [x0, z0] = atoms[i];
    for (let j = i + 1; j < atoms.length; j++) {
      const [x1, z1] = atoms[j];
      const dx = x1 - x0;
      const dz = z1 - z0;
      if (dx * dx + dz * dz <= threshSq) {
        positions.push(x0, yLevel, z0, x1, yLevel, z1);
      }
    }
  }

  return new Float32Array(positions);
}

// ---------------------------------------------------------------------------
// Stage 2 — buildGrapheneLayers(scene)
// Five stacked graphene layers (micro scale).
// ---------------------------------------------------------------------------
export function buildGrapheneLayers(scene) {
  const R            = 5;       // wider grid so sheets fill the side-view frame
  const bondLength   = 0.42;
  const numLayers    = 3;       // fewer layers → each one clearly distinct
  const layerSpacing = 0.55;    // more gap so stacking is legible from the side

  const shiftX = bondLength * 0.5;
  const shiftZ = bondLength * Math.sqrt(3) / 6;

  // Bright cyan-blue atoms — high emissiveIntensity so they glow against black
  const atomMaterial = new THREE.MeshStandardMaterial({
    color:             new THREE.Color('#003366'),
    emissive:          new THREE.Color('#0088ee'),
    emissiveIntensity: 2.5,
    roughness:         0.3,
    metalness:         0.1,
  });

  // Bright bond lines
  const bondMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color('#44aaff'),
  });

  const group = new THREE.Group();

  const baseAtoms = hexGrid(R, bondLength);
  const atomCount = baseAtoms.length;
  const yStart    = -((numLayers - 1) * layerSpacing) / 2;
  const matrix    = new THREE.Matrix4();
  const atomGeo   = new THREE.SphereGeometry(0.08, 6, 4);

  for (let l = 0; l < numLayers; l++) {
    const y     = yStart + l * layerSpacing;
    const isOdd = l % 2 !== 0;

    const atoms = baseAtoms.map(([x, z]) => [
      isOdd ? x + shiftX : x,
      isOdd ? z + shiftZ : z,
    ]);

    // Atoms
    const instancedMesh = new THREE.InstancedMesh(atomGeo, atomMaterial, atomCount);
    for (let i = 0; i < atomCount; i++) {
      const [x, z] = atoms[i];
      matrix.setPosition(x, y, z);
      instancedMesh.setMatrixAt(i, matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
    group.add(instancedMesh);

    // Bonds
    const posArray = buildBondPositions(atoms, y, bondLength);
    const bondGeo  = new THREE.BufferGeometry();
    bondGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    group.add(new THREE.LineSegments(bondGeo, bondMaterial));
  }

  // Dedicated point light so the lattice is lit from within
  const glow = new THREE.PointLight(0x2299ff, 2.5, 18);
  glow.position.set(0, 3, 0);
  group.add(glow);

  scene.add(group);
  return { group };
}

// ---------------------------------------------------------------------------
// Stage 3 — buildGrapheneSheet(scene, sharedUniforms)
// One large graphene sheet (nano scale) with a pulsing bond shader.
// ---------------------------------------------------------------------------
export function buildGrapheneSheet(scene, sharedUniforms) {
  const R          = 7;
  const bondLength = 0.42;

  const atoms     = hexGrid(R, bondLength);
  const atomCount = atoms.length;

  // Bright, saturated cyan atoms
  const atomMaterial = new THREE.MeshStandardMaterial({
    color:             new THREE.Color('#55bbff'),
    emissive:          new THREE.Color('#0077ff'),
    emissiveIntensity: 2.5,
    metalness:         0.2,
    roughness:         0.25,
  });

  // Pulsing bond shader — brighter base values
  const bondMaterial = new THREE.ShaderMaterial({
    uniforms:    sharedUniforms,
    transparent: true,
    vertexShader: /* glsl */`
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      void main() {
        float pulse = 0.55 + 0.45 * sin(uTime * 2.0);
        gl_FragColor = vec4(0.35, 0.80, 1.0, pulse);
      }
    `,
  });

  const group = new THREE.Group();
  const y     = 0;

  const atomGeo       = new THREE.SphereGeometry(0.08, 6, 4);
  const instancedMesh = new THREE.InstancedMesh(atomGeo, atomMaterial, atomCount);
  const matrix        = new THREE.Matrix4();
  for (let i = 0; i < atomCount; i++) {
    const [x, z] = atoms[i];
    matrix.setPosition(x, y, z);
    instancedMesh.setMatrixAt(i, matrix);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
  group.add(instancedMesh);

  const posArray = buildBondPositions(atoms, y, bondLength);
  const bondGeo  = new THREE.BufferGeometry();
  bondGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  group.add(new THREE.LineSegments(bondGeo, bondMaterial));

  // Dedicated light so atoms receive illumination from above
  const glow = new THREE.PointLight(0x44aaff, 3.0, 20);
  glow.position.set(0, 6, 0);
  group.add(glow);

  scene.add(group);
  return { group, bondMaterial };
}
