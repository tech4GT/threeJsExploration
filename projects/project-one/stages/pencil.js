import * as THREE from 'three';

export function buildPencil(scene) {
  const pencilGroup = new THREE.Group();

  // Wood body — hexagonal cylinder
  const woodGeo = new THREE.CylinderGeometry(0.5, 0.5, 8, 6);
  const woodMat = new THREE.MeshStandardMaterial({ color: '#e8c84a', roughness: 0.7, metalness: 0 });
  const woodMesh = new THREE.Mesh(woodGeo, woodMat);
  pencilGroup.add(woodMesh);

  // Ferrule ring — silver metallic band near top
  const ferruleGeo = new THREE.CylinderGeometry(0.54, 0.54, 0.35, 16);
  const ferruleMat = new THREE.MeshStandardMaterial({ color: '#aab0b8', roughness: 0.2, metalness: 0.9 });
  const ferruleMesh = new THREE.Mesh(ferruleGeo, ferruleMat);
  ferruleMesh.position.y = 4.1;
  pencilGroup.add(ferruleMesh);

  // Eraser cap — pink cylinder at top
  const eraserGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
  const eraserMat = new THREE.MeshStandardMaterial({ color: '#f0a0a0', roughness: 0.8 });
  const eraserMesh = new THREE.Mesh(eraserGeo, eraserMat);
  eraserMesh.position.y = 4.5;
  pencilGroup.add(eraserMesh);

  // Eraser top disk — flat circle facing up
  const eraserDiskGeo = new THREE.CircleGeometry(0.5, 16);
  const eraserDiskMesh = new THREE.Mesh(eraserDiskGeo, eraserMat);
  eraserDiskMesh.position.y = 4.7;
  eraserDiskMesh.rotation.x = -Math.PI / 2;
  pencilGroup.add(eraserDiskMesh);

  // Graphite tip — dark cone pointing down
  const tipGeo = new THREE.ConeGeometry(0.5, 1.5, 6);
  const tipMat = new THREE.MeshStandardMaterial({ color: '#1a1a2e', roughness: 0.9, flatShading: true });
  const tipMesh = new THREE.Mesh(tipGeo, tipMat);
  tipMesh.position.y = -4.75;
  tipMesh.rotation.x = Math.PI;
  pencilGroup.add(tipMesh);

  // Enable shadows on all mesh children
  pencilGroup.children.forEach(child => {
    child.castShadow = true;
    child.receiveShadow = true;
  });

  // Directional light — warm sun
  const sunLight = new THREE.DirectionalLight(0xfff4e0, 2.5);
  sunLight.position.set(8, 14, 6);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  scene.add(sunLight);

  // Ambient fill
  const ambientLight = new THREE.AmbientLight(0x334466, 1.5);
  scene.add(ambientLight);

  scene.add(pencilGroup);

  return { group: pencilGroup };
}
