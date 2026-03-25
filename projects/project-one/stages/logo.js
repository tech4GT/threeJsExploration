// Stage 5 — Carbon periodic table entry
// Displays the element card exactly as it appears in the periodic table:
//   • Glowing square frame
//   • Atomic number  6       (top centre)
//   • Element symbol  C      (large centre)
//   • Element name  Carbon   (below symbol)
//   • Atomic mass  12.011    (bottom)
// Text is rendered via CanvasTexture so it's pixel-crisp.

import * as THREE from 'three';

const REVEAL_DURATION = 1.6;
const W = 4.8;   // card width
const H = 6.0;   // card height
const T = 0.10;  // frame bar thickness

export function buildLogo(scene) {
  const group = new THREE.Group();

  // ── Frame material — glowing cyan ─────────────────────────────────────────
  const frameMat = new THREE.MeshStandardMaterial({
    color:             '#00ddff',
    emissive:          '#0088ff',
    emissiveIntensity: 3.0,
    roughness:         0.12,
    metalness:         0.10,
  });

  // ── Dark background panel (makes text pop against scene bg) ───────────────
  const bgGeo  = new THREE.PlaneGeometry(W - T, H - T);
  const bgMat  = new THREE.MeshBasicMaterial({ color: '#000d1a', transparent: true, opacity: 0.82 });
  const bgMesh = new THREE.Mesh(bgGeo, bgMat);
  bgMesh.position.z = -0.02;
  group.add(bgMesh);

  // ── Frame bars ────────────────────────────────────────────────────────────
  const hBarGeo = new THREE.BoxGeometry(W + T * 2, T, T);
  const vBarGeo = new THREE.BoxGeometry(T, H, T);
  [H / 2, -H / 2].forEach(y => {
    const b = new THREE.Mesh(hBarGeo, frameMat);
    b.position.y = y;
    group.add(b);
  });
  [-W / 2, W / 2].forEach(x => {
    const b = new THREE.Mesh(vBarGeo, frameMat);
    b.position.x = x;
    group.add(b);
  });

  // ── Thin divider line below the atomic number ─────────────────────────────
  const divGeo  = new THREE.BoxGeometry(W - 0.5, T * 0.55, T * 0.55);
  const divMesh = new THREE.Mesh(divGeo, frameMat);
  divMesh.position.set(0, 1.82, 0.02);
  group.add(divMesh);

  // ── Canvas text helper ────────────────────────────────────────────────────
  // Creates a PlaneGeometry with a CanvasTexture showing text in the given color.
  // planeW / planeH are Three.js world units; canvasW is the pixel width.
  function makeTextPlane(text, planeW, planeH, canvasW, fontSize, bold = false, color = '#00eeff') {
    const canvasH = Math.round(canvasW * (planeH / planeW));
    const canvas  = document.createElement('canvas');
    canvas.width  = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.fillStyle    = color;
    ctx.font         = `${bold ? 'bold ' : ''}${fontSize}px 'Courier New', Consolas, monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvasW / 2, canvasH / 2);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    return new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), mat);
  }

  // ── Atomic number  "6" — top centre ──────────────────────────────────────
  const numMesh = makeTextPlane('6', 1.4, 0.75, 256, 148, true, '#ffffff');
  numMesh.position.set(0, 2.28, 0.05);
  group.add(numMesh);

  // ── Element symbol  "C" — large bold centre ───────────────────────────────
  const symbolMesh = makeTextPlane('C', 3.2, 2.4, 512, 380, true, '#00eeff');
  symbolMesh.position.set(0, 0.45, 0.05);
  group.add(symbolMesh);

  // ── Element name  "Carbon" ────────────────────────────────────────────────
  const nameMesh = makeTextPlane('Carbon', 3.6, 0.70, 512, 98, false, '#88ddff');
  nameMesh.position.set(0, -1.55, 0.05);
  group.add(nameMesh);

  // ── Atomic mass  "12.011" — bottom ───────────────────────────────────────
  const massMesh = makeTextPlane('12.011', 3.0, 0.58, 512, 82, false, '#88ddff');
  massMesh.position.set(0, -2.25, 0.05);
  group.add(massMesh);

  // ── Electron configuration  "2, 4" — small, top-right corner ────────────
  const ecMesh = makeTextPlane('2, 4', 1.1, 0.45, 256, 68, false, '#4499bb');
  ecMesh.position.set(1.55, 2.55, 0.05);
  group.add(ecMesh);

  // ── Point light so the frame emits visible light into the scene ───────────
  const coreLight = new THREE.PointLight(0x44eeff, 5, 18);
  group.add(coreLight);

  // ── Initial: hidden, scale 0 ─────────────────────────────────────────────
  group.visible = false;
  group.scale.setScalar(0);
  scene.add(group);

  // ── Animation state ───────────────────────────────────────────────────────
  let _revealing   = false;
  let _revealStart = null;

  function startReveal() {
    group.visible = true;
    _revealing    = true;
    _revealStart  = null;
  }

  function update(elapsed) {
    if (_revealing) {
      if (_revealStart === null) _revealStart = elapsed;
      const t     = Math.min(1, (elapsed - _revealStart) / REVEAL_DURATION);
      // Ease-out exponential — snaps to full size quickly then settles
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      group.scale.setScalar(eased);
      if (t >= 1) _revealing = false;
    }

    // Gentle floating oscillation — card feels alive, not static
    group.rotation.y  = Math.sin(elapsed * 0.28) * 0.14;
    group.position.y  = Math.sin(elapsed * 0.42) * 0.10;
  }

  return { group, update, startReveal };
}
