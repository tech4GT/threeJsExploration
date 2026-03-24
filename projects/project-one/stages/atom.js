// Stage 4: Single carbon atom (6 protons, 6 neutrons, 6 electrons in 2 shells)
// Shows atomic structure with a nucleus cluster and electron orbits

import * as THREE from 'three';

const nucleonOffsets = [
  [0, 0, 0], [0.4, 0.2, 0.1], [-0.35, 0.25, 0.15],
  [0.15, -0.38, 0.2], [-0.1, 0.1, -0.4], [0.3, -0.15, -0.3],
];

const ORBITS = [
  // Inner shell (1s²): 2 electrons, one orbit
  { electrons: 2, a: 2.2, b: 1.4, speed: 1.2, tiltX: Math.PI * 0.18, tiltZ: 0,             phaseSteps: 2 },
  // Outer shell (2s²2p²): 4 electrons, two orbits
  { electrons: 2, a: 3.8, b: 2.4, speed: 0.8, tiltX: Math.PI * 0.3,  tiltZ: Math.PI * 0.1, phaseSteps: 2 },
  { electrons: 2, a: 3.5, b: 2.8, speed: 0.9, tiltX: -Math.PI * 0.2, tiltZ: Math.PI * 0.4, phaseSteps: 2 },
];

export function buildAtom(scene) {
  const group = new THREE.Group();

  // --- Lighting ---
  const ambientLight = new THREE.AmbientLight(0x111122, 2);
  scene.add(ambientLight);

  const keyLight = new THREE.PointLight(0x4466ff, 3, 30);
  keyLight.position.set(0, 5, 5);
  scene.add(keyLight);

  // --- Nucleus ---
  const protonGeo = new THREE.SphereGeometry(0.25, 12, 8);
  const protonMat = new THREE.MeshStandardMaterial({
    color: '#ff3333',
    emissive: '#aa0000',
    emissiveIntensity: 0.5,
    roughness: 0.3,
    metalness: 0.2,
  });

  const neutronGeo = new THREE.SphereGeometry(0.25, 12, 8);
  const neutronMat = new THREE.MeshStandardMaterial({
    color: '#aaaaaa',
    emissive: '#333333',
    emissiveIntensity: 0.2,
    roughness: 0.5,
    metalness: 0.1,
  });

  for (let i = 0; i < 6; i++) {
    const offset = nucleonOffsets[i];

    // Proton
    const proton = new THREE.Mesh(protonGeo, protonMat);
    proton.position.set(offset[0], offset[1], offset[2]);
    group.add(proton);

    // Neutron — mirror by negating X, scaled by 0.9
    const neutron = new THREE.Mesh(neutronGeo, neutronMat);
    neutron.position.set(-offset[0] * 0.9, offset[1] * 0.9, -offset[2] * 0.9);
    group.add(neutron);
  }

  // --- Electrons ---
  const electronGeo = new THREE.SphereGeometry(0.12, 8, 6);
  const electronMat = new THREE.MeshBasicMaterial({
    color: 0x44ddff,
    transparent: true,
    opacity: 0.9,
  });

  const electrons = [];

  for (const orbit of ORBITS) {
    // Build quaternion from Euler tilt
    const euler = new THREE.Euler(orbit.tiltX, 0, orbit.tiltZ);
    const quat = new THREE.Quaternion().setFromEuler(euler);

    // Orbit path visualizer
    const curve = new THREE.EllipseCurve(0, 0, orbit.a, orbit.b, 0, Math.PI * 2);
    const points = curve.getPoints(64).map(p => new THREE.Vector3(p.x, 0, p.y));
    points.forEach(p => p.applyQuaternion(quat));
    const pathGeo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.LineLoop(
      pathGeo,
      new THREE.LineBasicMaterial({ color: 0x224466, transparent: true, opacity: 0.3 })
    );
    group.add(line);

    // Place electrons evenly spaced in phase
    for (let i = 0; i < orbit.phaseSteps; i++) {
      const phase = (2 * Math.PI / orbit.phaseSteps) * i;

      const mesh = new THREE.Mesh(electronGeo, electronMat);

      // Tiny point light attached to electron
      const eLight = new THREE.PointLight(0x44ddff, 0.8, 3);
      mesh.add(eLight);

      group.add(mesh);

      electrons.push({ mesh, orbit: { ...orbit, quat }, phase });
    }
  }

  // --- Update function ---
  function update(elapsed) {
    for (const e of electrons) {
      const angle = elapsed * e.orbit.speed + e.phase;
      const x = e.orbit.a * Math.cos(angle);
      const z = e.orbit.b * Math.sin(angle);
      const local = new THREE.Vector3(x, 0, z);
      local.applyQuaternion(e.orbit.quat);
      e.mesh.position.copy(local);
    }
  }

  scene.add(group);

  return { group, update };
}
