// Stage 4: Single carbon atom (6 protons, 6 neutrons, 6 electrons in 2 shells)

import * as THREE from 'three';

const nucleonOffsets = [
  [0, 0, 0], [0.4, 0.2, 0.1], [-0.35, 0.25, 0.15],
  [0.15, -0.38, 0.2], [-0.1, 0.1, -0.4], [0.3, -0.15, -0.3],
];

const ORBITS = [
  { electrons: 2, a: 2.2, b: 1.4, speed: 1.2, tiltX: Math.PI * 0.18, tiltZ: 0,             phaseSteps: 2 },
  { electrons: 2, a: 3.8, b: 2.4, speed: 0.8, tiltX: Math.PI * 0.3,  tiltZ: Math.PI * 0.1, phaseSteps: 2 },
  { electrons: 2, a: 3.5, b: 2.8, speed: 0.9, tiltX: -Math.PI * 0.2, tiltZ: Math.PI * 0.4, phaseSteps: 2 },
];

const COLLAPSE_DURATION = 2.2;

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
    color: '#ff3333', emissive: '#aa0000', emissiveIntensity: 0.5,
    roughness: 0.3, metalness: 0.2,
  });

  const neutronGeo = new THREE.SphereGeometry(0.25, 12, 8);
  const neutronMat = new THREE.MeshStandardMaterial({
    color: '#aaaaaa', emissive: '#333333', emissiveIntensity: 0.2,
    roughness: 0.5, metalness: 0.1,
  });

  for (let i = 0; i < 6; i++) {
    const offset = nucleonOffsets[i];
    const proton = new THREE.Mesh(protonGeo, protonMat);
    proton.position.set(offset[0], offset[1], offset[2]);
    group.add(proton);
    const neutron = new THREE.Mesh(neutronGeo, neutronMat);
    neutron.position.set(-offset[0] * 0.9, offset[1] * 0.9, -offset[2] * 0.9);
    group.add(neutron);
  }

  // --- Electrons ---
  const electronGeo = new THREE.SphereGeometry(0.12, 8, 6);
  const electronMat = new THREE.MeshBasicMaterial({
    color: 0x44ddff, transparent: true, opacity: 0.9,
  });

  const electrons = [];

  for (const orbit of ORBITS) {
    const euler = new THREE.Euler(orbit.tiltX, 0, orbit.tiltZ);
    const quat  = new THREE.Quaternion().setFromEuler(euler);

    const curve  = new THREE.EllipseCurve(0, 0, orbit.a, orbit.b, 0, Math.PI * 2);
    const points = curve.getPoints(64).map(p => new THREE.Vector3(p.x, 0, p.y));
    points.forEach(p => p.applyQuaternion(quat));
    const pathGeo = new THREE.BufferGeometry().setFromPoints(points);
    group.add(new THREE.LineLoop(
      pathGeo,
      new THREE.LineBasicMaterial({ color: 0x224466, transparent: true, opacity: 0.3 })
    ));

    for (let i = 0; i < orbit.phaseSteps; i++) {
      const phase = (2 * Math.PI / orbit.phaseSteps) * i;
      const mesh  = new THREE.Mesh(electronGeo, electronMat);
      const eLight = new THREE.PointLight(0x44ddff, 0.8, 3);
      mesh.add(eLight);
      group.add(mesh);
      electrons.push({ mesh, orbit: { ...orbit, quat }, phase });
    }
  }

  // --- Collapse state ---
  let _collapsing         = false;
  let _collapseStartTime  = null;
  let _onCollapseComplete = null;

  function startCollapse(onComplete) {
    _collapseStartTime  = null;  // set lazily in first update tick
    _collapsing         = true;
    _onCollapseComplete = onComplete;
  }

  // --- Update ---
  function update(elapsed) {
    // Electron orbital motion (modulated by collapse scale)
    const scale = group.scale.x;
    for (const e of electrons) {
      // Slightly increase orbital speed as we collapse (inspiral effect)
      const speedMult = _collapsing ? 1 + (1 - scale) * 3 : 1;
      const angle = elapsed * e.orbit.speed * speedMult + e.phase;
      const x = e.orbit.a * Math.cos(angle);
      const z = e.orbit.b * Math.sin(angle);
      const local = new THREE.Vector3(x, 0, z);
      local.applyQuaternion(e.orbit.quat);
      e.mesh.position.copy(local);
    }

    // Collapse animation
    if (_collapsing) {
      if (_collapseStartTime === null) _collapseStartTime = elapsed;
      const t      = Math.min(1, (elapsed - _collapseStartTime) / COLLAPSE_DURATION);
      const eased  = t * t * (3 - 2 * t);   // smooth-step
      group.scale.setScalar(1 - eased);

      if (t >= 1) {
        group.visible  = false;
        _collapsing    = false;
        if (_onCollapseComplete) {
          _onCollapseComplete();
          _onCollapseComplete = null;
        }
      }
    }
  }

  scene.add(group);
  return { group, update, startCollapse };
}
