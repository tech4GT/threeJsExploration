# Three.js Knowledge Base

> Maintained by Claude. Update this file whenever new patterns, gotchas, or techniques are discovered while working on projects in this repo.
> Source: [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills)

---

## CDN Setup (importmap pattern)

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"
  }
}
</script>
<script type="module" src="main.js"></script>
```

Then in JS:
```js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
```

---

## Fundamentals

### Minimal scene boilerplate

```js
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

camera.position.z = 5;

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

### Core classes
- **Scene** — container for all objects, lights, cameras. Set `scene.background`, `scene.fog`, `scene.environment`.
- **PerspectiveCamera(fov, aspect, near, far)** — call `camera.updateProjectionMatrix()` after changing fov/aspect/near/far.
- **OrthographicCamera(left, right, top, bottom, near, far)** — no perspective distortion; good for 2D/isometric.
- **WebGLRenderer** — key options: `antialias`, `alpha`, `powerPreference`. Set `renderer.outputColorSpace = THREE.SRGBColorSpace` and `renderer.toneMapping = THREE.ACESFilmicToneMapping` for realistic output.
- **Object3D** — base for Mesh, Group, Light, Camera. `.position`, `.rotation` (Euler), `.quaternion`, `.scale`, `.add()`, `.remove()`, `.traverse()`, `.getWorldPosition()`.
- **Mesh(geometry, material)** — set `castShadow` / `receiveShadow`. Supports array of materials (one per geometry group).
- **Group** — empty container; transform the group to move all children together.
- **Clock** — `getDelta()` = seconds since last call; `getElapsedTime()` = total seconds. Always use delta for framerate-independent motion.

### Coordinate system
Right-handed: +X right, +Y up, +Z toward viewer.

### Math utilities
```js
THREE.MathUtils.degToRad(deg)
THREE.MathUtils.lerp(a, b, t)
THREE.MathUtils.clamp(v, min, max)
```

**Vector3** key ops: `.set()`, `.copy()`, `.clone()`, `.add()`, `.sub()`, `.normalize()`, `.lerp()`, `.length()`, `.dot()`, `.cross()`, `.applyMatrix4()`, `.project(camera)`, `.unproject(camera)`.

**Color**: `new THREE.Color(0xff0000)` / `'red'` / `'#ff0000'`. `.setHSL(h,s,l)`, `.lerp()`.

### Cleanup / disposal
```js
mesh.geometry.dispose();
mesh.material.dispose();   // or forEach if array
texture.dispose();
scene.remove(mesh);
renderer.dispose();
```

---

## Geometry

### Built-in shapes (constructor signatures)
```js
new THREE.BoxGeometry(w, h, d, wSeg, hSeg, dSeg)
new THREE.SphereGeometry(radius, widthSeg, heightSeg)
new THREE.PlaneGeometry(w, h, wSeg, hSeg)
new THREE.CylinderGeometry(rTop, rBot, height, radSeg, hSeg)
new THREE.ConeGeometry(radius, height, radSeg)
new THREE.TorusGeometry(radius, tube, radSeg, tubeSeg)
new THREE.TorusKnotGeometry(radius, tube, tubSeg, radSeg, p, q)
new THREE.CircleGeometry(radius, segments)
new THREE.RingGeometry(innerR, outerR, thetaSeg)
new THREE.CapsuleGeometry(radius, length, capSeg, radSeg)
new THREE.IcosahedronGeometry(radius, detail)
```

### Custom BufferGeometry
```js
const geo = new THREE.BufferGeometry();
const verts = new Float32Array([/* x,y,z ... */]);
geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
geo.setIndex([0,1,2, ...]);          // optional indexed geometry
geo.computeVertexNormals();           // required for lighting
```

### InstancedMesh — render thousands of identical objects
```js
const mesh = new THREE.InstancedMesh(geometry, material, count);
const matrix = new THREE.Matrix4();
for (let i = 0; i < count; i++) {
  matrix.setPosition(x, y, z);
  mesh.setMatrixAt(i, matrix);
}
mesh.instanceMatrix.needsUpdate = true;
scene.add(mesh);
```

Per-instance color: `mesh.setColorAt(i, color); mesh.instanceColor.needsUpdate = true;`

### Merging static geometry
```js
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const merged = mergeGeometries([geo1, geo2, geo3]);
```

---

## Materials

| Material | Lighting | Notes |
|---|---|---|
| MeshBasicMaterial | None | Always visible, unlit |
| MeshLambertMaterial | Diffuse | Fast, no specular |
| MeshPhongMaterial | Diffuse + Specular | `shininess`, `specular` |
| MeshStandardMaterial | PBR | `roughness`, `metalness` — recommended default |
| MeshPhysicalMaterial | PBR+ | Adds clearcoat, transmission, sheen, iridescence |
| MeshToonMaterial | Toon | `gradientMap` for steps |
| MeshNormalMaterial | None | Debug normals |
| ShaderMaterial | Custom GLSL | Built-in uniforms provided |
| RawShaderMaterial | Custom GLSL | Full control, no built-ins |

### MeshStandardMaterial (PBR) key properties
```js
const mat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.5,   // 0 = mirror, 1 = diffuse
  metalness: 0.0,   // 0 = dielectric, 1 = metal
  map: colorTex,
  normalMap: normalTex,
  roughnessMap: roughTex,
  metalnessMap: metalTex,
  aoMap: aoTex,        // requires uv2 attribute
  emissive: 0x000000,
  emissiveIntensity: 1,
  envMap: envTex,
  envMapIntensity: 1,
});
// aoMap needs second UV: geometry.setAttribute('uv2', geometry.attributes.uv);
```

### MeshPhysicalMaterial extras
```js
// Glass
{ transmission: 1, thickness: 0.5, ior: 1.5, roughness: 0 }
// Car paint
{ clearcoat: 1, clearcoatRoughness: 0.1, metalness: 0.9 }
// Fabric
{ sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffffff) }
```

### Common material properties (all materials)
```js
material.transparent = true;
material.opacity = 0.5;
material.side = THREE.DoubleSide; // FrontSide | BackSide | DoubleSide
material.alphaTest = 0.5;         // discard pixels below threshold
material.depthWrite = true;
material.blending = THREE.AdditiveBlending;
material.wireframe = true;
material.needsUpdate = true;      // set after changing transparent/flatShading/texture
```

### Environment maps
```js
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
const pmrem = new THREE.PMREMGenerator(renderer);
new RGBELoader().load('env.hdr', (tex) => {
  const envMap = pmrem.fromEquirectangular(tex).texture;
  scene.environment = envMap;  // affects all PBR materials
  scene.background = envMap;
  tex.dispose(); pmrem.dispose();
});
```

---

## Lighting

| Light | Shadows | Cost |
|---|---|---|
| AmbientLight | No | Very low |
| HemisphereLight | No | Very low |
| DirectionalLight | Yes | Low |
| PointLight | Yes | Medium |
| SpotLight | Yes | Medium |
| RectAreaLight | No* | High |

### Quick setup
```js
// Ambient fill
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

// Directional (sun)
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(5, 10, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 50;
sun.shadow.bias = -0.0001;
scene.add(sun);

// Enable shadows on renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Enable on objects
mesh.castShadow = true;
floor.receiveShadow = true;
```

### Common setups
```js
// Outdoor
const hemi = new THREE.HemisphereLight(0x87ceeb, 0x8b4513, 0.6);
scene.add(hemi);

// RectAreaLight (requires init)
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
RectAreaLightUniformsLib.init();
const rect = new THREE.RectAreaLight(0xffffff, 5, 4, 2);
rect.lookAt(0, 0, 0);
scene.add(rect);
```

---

## Textures

### Loading
```js
const loader = new THREE.TextureLoader();
const tex = loader.load('texture.jpg');

// Color/albedo maps → must set sRGB
tex.colorSpace = THREE.SRGBColorSpace;

// Data maps (normal, roughness, metalness, AO) → leave as default (Linear)
```

### Wrapping & repeat
```js
tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
tex.repeat.set(4, 4);
tex.offset.set(0, 0);
tex.rotation = Math.PI / 4;
tex.center.set(0.5, 0.5); // rotation pivot
```

### Filtering
```js
tex.minFilter = THREE.LinearMipmapLinearFilter; // default, smooth
tex.magFilter = THREE.LinearFilter;
tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); // sharper at angles
```

### Special texture types
```js
// Canvas texture (dynamic)
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
// ... draw on ctx ...
const tex = new THREE.CanvasTexture(canvas);
tex.needsUpdate = true; // call after drawing

// Video texture
const video = document.createElement('video');
video.src = 'video.mp4'; video.loop = true; video.muted = true; video.play();
const tex = new THREE.VideoTexture(video); // auto-updates
```

### Render targets
```js
const rt = new THREE.WebGLRenderTarget(512, 512);
renderer.setRenderTarget(rt);
renderer.render(scene, camera);
renderer.setRenderTarget(null);
material.map = rt.texture; // use as texture
```

---

## Animation

### AnimationClip + Mixer + Action
```js
// Keyframe tracks
const posTrack = new THREE.VectorKeyframeTrack('.position', [0, 1, 2], [0,0,0, 0,2,0, 0,0,0]);
const rotTrack = new THREE.QuaternionKeyframeTrack('.quaternion', [0, 1], [...q1, ...q2]);
const clip = new THREE.AnimationClip('bounce', 2, [posTrack, rotTrack]);

const mixer = new THREE.AnimationMixer(mesh);
const action = mixer.clipAction(clip);
action.loop = THREE.LoopRepeat;
action.play();

// In animate loop:
mixer.update(delta);
```

### Playing GLTF animations
```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const loader = new GLTFLoader();
loader.load('model.glb', (gltf) => {
  scene.add(gltf.scene);
  const mixer = new THREE.AnimationMixer(gltf.scene);
  gltf.animations.forEach(clip => mixer.clipAction(clip).play());
  // store mixer, call mixer.update(delta) each frame
});
```

### AnimationAction controls
```js
action.play() / action.stop() / action.reset()
action.paused = true/false
action.timeScale = 1      // negative = reverse
action.weight = 1         // 0-1 for blending
action.loop = THREE.LoopOnce / LoopRepeat / LoopPingPong
action.clampWhenFinished = true
action.fadeIn(0.3) / action.fadeOut(0.3)
action.crossFadeTo(other, duration, warp)
```

### Procedural animation patterns
```js
// Sine oscillation
mesh.position.y = Math.sin(elapsed * 2) * 0.5;
// Orbit
mesh.position.x = Math.cos(elapsed) * radius;
mesh.position.z = Math.sin(elapsed) * radius;
// Bounce
mesh.position.y = Math.abs(Math.sin(elapsed * 3)) * 2;
```

---

## Loaders

### GLTFLoader (primary 3D format)
```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const draco = new DRACOLoader();
draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const loader = new GLTFLoader();
loader.setDRACOLoader(draco);
loader.load('model.glb', (gltf) => {
  const model = gltf.scene;
  // Enable shadows
  model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  // Center model
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  scene.add(model);
});
```

### LoadingManager
```js
const manager = new THREE.LoadingManager(
  () => console.log('All loaded'),
  (url, loaded, total) => console.log(`${(loaded/total*100).toFixed(0)}%`),
  (url) => console.error('Error:', url)
);
const loader = new THREE.TextureLoader(manager);
```

### Promise wrapper (useful pattern)
```js
const loadGLTF = url => new Promise((res, rej) => new GLTFLoader().load(url, res, undefined, rej));
const loadTexture = url => new Promise((res, rej) => new THREE.TextureLoader().load(url, res, undefined, rej));
```

---

## Shaders (ShaderMaterial)

### Template
```js
const mat = new THREE.ShaderMaterial({
  uniforms: {
    uTime:  { value: 0 },
    uColor: { value: new THREE.Color(0xff0000) },
    uMap:   { value: texture },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    uniform float uTime;

    void main() {
      vUv = uv;
      vec3 pos = position;
      pos.z += sin(pos.x * 5.0 + uTime) * 0.1;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    varying vec2 vUv;
    uniform vec3 uColor;
    uniform sampler2D uMap;

    void main() {
      vec4 tex = texture2D(uMap, vUv);
      gl_FragColor = vec4(uColor * tex.rgb, tex.a);
    }
  `,
});

// Update each frame:
mat.uniforms.uTime.value = elapsed;
```

### Built-in uniforms (ShaderMaterial auto-provides)
```glsl
// Vertex
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
```

### Common GLSL patterns
```glsl
// Fresnel
float fresnel = pow(1.0 - dot(normalize(-vViewPos), vNormal), 3.0);

// Noise
float random(vec2 st) { return fract(sin(dot(st, vec2(12.9898,78.233))) * 43758.5453); }

// Gradient
vec3 color = mix(colorA, colorB, vUv.y);
vec3 radial = mix(center, edge, distance(vUv, vec2(0.5)) * 2.0);

// Discard (for dissolve/alpha cutout)
if (noise < threshold) discard;

// Step vs if (GPU-friendly)
float sel = step(0.5, value); // 0.0 or 1.0
vec3 color = mix(colorB, colorA, sel);
```

### Extending built-in materials (onBeforeCompile)
```js
mat.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = { value: 0 };
  mat.userData.shader = shader;
  shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
     transformed.y += sin(position.x * 10.0 + uTime) * 0.1;`
  );
};
// Update: mat.userData.shader?.uniforms.uTime.value = elapsed;
```

---

## Post-Processing

```js
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass }     from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader }     from 'three/addons/shaders/FXAAShader.js';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,  // strength
  0.4,  // radius
  0.85  // threshold
);
composer.addPass(bloom);

// FXAA anti-aliasing (add last)
const fxaa = new ShaderPass(FXAAShader);
fxaa.uniforms.resolution.value.set(1/window.innerWidth, 1/window.innerHeight);
composer.addPass(fxaa);

// In animate: composer.render() instead of renderer.render()
// On resize: composer.setSize(w, h)
```

### Common passes
| Pass | Import path | Purpose |
|---|---|---|
| UnrealBloomPass | postprocessing/UnrealBloomPass.js | Glow/bloom |
| SSAOPass | postprocessing/SSAOPass.js | Ambient occlusion |
| BokehPass | postprocessing/BokehPass.js | Depth of field |
| FilmPass | postprocessing/FilmPass.js | Film grain + scanlines |
| GlitchPass | postprocessing/GlitchPass.js | Glitch effect |
| OutlinePass | postprocessing/OutlinePass.js | Object outline |
| ShaderPass+VignetteShader | shaders/VignetteShader.js | Vignette |
| ShaderPass+GammaCorrectionShader | shaders/GammaCorrectionShader.js | Gamma correction |

---

## Interaction

### Raycasting (click/hover detection)
```js
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (e) => {
  mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  if (hits.length > 0) {
    const obj = hits[0].object;
    const point = hits[0].point;  // world-space intersection
  }
});
```

### Camera controls
```js
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 2;
controls.maxDistance = 50;
controls.maxPolarAngle = Math.PI / 2; // prevent going underground
// controls.update() must be called in animate loop when damping is on

import { TransformControls } from 'three/addons/controls/TransformControls.js';
const tc = new TransformControls(camera, renderer.domElement);
tc.attach(mesh);
tc.setMode('translate'); // 'rotate' | 'scale'
tc.addEventListener('dragging-changed', e => { controls.enabled = !e.value; });
scene.add(tc);
```

### World ↔ Screen coordinates
```js
// World → Screen
const v = mesh.position.clone().project(camera);
const sx = (v.x + 1) / 2 * window.innerWidth;
const sy = (-v.y + 1) / 2 * window.innerHeight;

// Screen → World ray-plane intersection
const plane = new THREE.Plane(new THREE.Vector3(0,1,0), 0); // ground plane
const ray = new THREE.Raycaster();
ray.setFromCamera(mouse, camera);
const target = new THREE.Vector3();
ray.ray.intersectPlane(plane, target);
```

---

## Performance Tips

1. **Minimize draw calls** — merge static geometry, use InstancedMesh for repeated objects, atlas textures.
2. **Frustum culling** — enabled by default; keep bounding boxes accurate.
3. **Reuse materials** — same material instance = batched rendering.
4. **Avoid transparent when possible** — requires expensive sorting. Use `alphaTest` instead.
5. **Power-of-2 textures** — 256, 512, 1024, 2048 for mipmapping.
6. **Dispose on cleanup** — geometry, material, texture, render target all have `.dispose()`.
7. **Throttle raycasts** — don't raycast every mousemove frame; throttle to 20fps.
8. **LOD** — `THREE.LOD` for distance-based mesh switching.
9. **Limit lights** — each light adds shader complexity; bake lighting for static scenes.
10. **Smaller shadow maps** — 512–1024 is often enough; tight shadow camera frustum.

```js
// LOD
const lod = new THREE.LOD();
lod.addLevel(highDetailMesh, 0);
lod.addLevel(medDetailMesh, 50);
lod.addLevel(lowDetailMesh, 100);
scene.add(lod);

// Check memory usage
console.log(renderer.info); // { render: { calls, triangles }, memory: { geometries, textures } }
```

---

## Visual Iteration Loop (Playwright → Analyze → Improve)

This repo has a **headless capture pipeline** that enables a fully automated visual feedback loop for animation development. Claude can see rendered frames as images, analyze them, identify issues, fix the code, and re-capture — all without a human in the loop.

### How it works

```
Code change → Playwright capture → Read frames as images → Analyze visually → Fix → Repeat
```

1. **Serve the project** locally:
   ```bash
   python3 -m http.server 8765 --directory projects/<name>/
   ```

2. **Capture frames** using `capture.mjs` (Playwright + SwiftShader software WebGL):
   ```js
   const browser = await chromium.launch({
     args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
     headless: true,
   });
   // screenshot each frame, advance stages via page.keyboard.press('ArrowRight')
   ```

3. **Analyze key frames** by reading PNG files with the `Read` tool — Claude sees them as images and can assess:
   - Geometry correctness (shapes, positions, scale)
   - Lighting and material appearance
   - Camera framing and transitions
   - Animation timing (compare frame N vs frame N+50)
   - UI overlay legibility

4. **Encode video** via imageio (ffmpeg not required):
   ```python
   import imageio.v2 as imageio
   writer = imageio.get_writer('output.mp4', fps=24, codec='libx264', quality=7)
   for path in sorted(frame_paths):
       writer.append_data(imageio.imread(path))
   writer.close()
   ```

### Environment notes
- **CDN is blocked** in this environment — always use `vendor/three/` local bundle, not cdn.jsdelivr.net
- **ffmpeg is not available** system-wide — use `imageio[ffmpeg]` (`pip3 install imageio[ffmpeg]`)
- **Playwright is available** globally at `/opt/node22/lib/node_modules/playwright`
  - Import with: `const { chromium } = require('/opt/node22/lib/node_modules/playwright')`
  - Chromium binary is pre-installed in `~/.cache/ms-playwright/`
- **Xvfb is available** at `/usr/bin/Xvfb` if a display is ever needed
- **SwiftShader** provides software WebGL — no GPU needed, all Three.js features work

### Iteration strategy
- Pick **5–8 representative frames** spread across the animation to check each stage
- Frame index math: `stageStartFrame = sum(STAGE_DURATIONS[:i]) * FPS`
- For transitions, sample a frame at ~50% through the transition duration
- Check both geometry stages AND the fade/transition frames between them
- Use `page.evaluate(() => window.cameraSystem.goToStage(n))` to jump directly to a stage (requires `window.cameraSystem = cameraSystem` in main.js)

### Exposing globals for Playwright control
Add to `main.js` during development to enable programmatic stage control:
```js
window.cameraSystem = cameraSystem;   // allows page.evaluate(() => window.cameraSystem.goToStage(3))
window.scene = scene;                  // inspect scene graph from Playwright
window.renderer = renderer;            // check renderer.info.render.calls etc.

---

## CanvasTexture for crisp in-world text

When you need readable text on a 3D plane (e.g. labels, periodic-table cards), fonts
aren't available without FontLoader. Use `CanvasTexture` instead — it works in
Chromium/SwiftShader and renders pixel-crisp text at any resolution.

```js
function makeTextPlane(text, planeW, planeH, canvasW, fontSize, bold = false, color = '#ffffff') {
  const canvasH = Math.round(canvasW * (planeH / planeW));
  const canvas  = document.createElement('canvas');
  canvas.width  = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvasW, canvasH);         // transparent background
  ctx.fillStyle    = color;
  ctx.font         = `${bold ? 'bold ' : ''}${fontSize}px 'Courier New', monospace`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvasW / 2, canvasH / 2);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
  return new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), mat);
}
```

**Key points:**
- `ctx.clearRect` before drawing leaves the canvas alpha-transparent — set `transparent: true` on the material.
- `MeshBasicMaterial` ignores lighting, so text is always full-brightness (no need for emissive).
- The bloom pass **will** bloom bright `MeshBasicMaterial` pixels — white/cyan text gets a natural glow halo.
- Scale `canvasW` up (512–1024) for text that will be close to the camera; lower (256) for small labels.
- Use `side: THREE.DoubleSide` if the card can be seen from behind.

---

## UnrealBloomPass — controlling glow tightness

`UnrealBloomPass(resolution, strength, radius, threshold)`:
- **strength**: how bright the bloom glow is.
- **radius** (0–1): how far the glow spreads from source pixels. `0.1–0.15` = tight halo (sharp edges); `0.4+` = wide blurry glow.
- **threshold**: minimum luminance before a pixel contributes to bloom.

You can update all three per-frame or per-stage:
```js
bloomPass.strength  = 1.8;
bloomPass.radius    = 0.12;   // tight → atomic structures stay crisp
bloomPass.threshold = 0.82;
```

**Per-stage radius array pattern** (from pencil-to-atom project):
```js
const BLOOM_RADIUS = [0.28, 0.22, 0.14, 0.12, 0.10, 0.20];
// In onStageChange:  bloomPass.radius = BLOOM_RADIUS[toStage];
```

**Bloom flash** — temporarily spike strength for a dramatic transition flash:
```js
let bloomFlash = 0;
// trigger: bloomFlash = 0.5;
// in animate():
if (bloomFlash > 0) {
  bloomPass.strength = BASE_STRENGTH + bloomFlash * 6;
  bloomFlash = Math.max(0, bloomFlash - delta * 3);
}
```

---

## Splitting a mesh group for independent animation (e.g. pencil snap)

When you need two halves of an object to animate independently:
1. Build each half as its own `THREE.Group` (topGroup / bottomGroup).
2. Add both groups to a parent group — the parent acts as the "whole object" for visibility/fade.
3. Animate each sub-group's `position` and `rotation` independently inside an `update(elapsed)` closure.

```js
const topGroup    = new THREE.Group();
const bottomGroup = new THREE.Group();
pencilGroup.add(topGroup);
pencilGroup.add(bottomGroup);

function startBreak(onComplete) { _breaking = true; ... }

function update(elapsed) {
  if (!_breaking) return;
  const t = Math.min(1, (elapsed - _breakStart) / DURATION);
  // phase 1: shake
  // phase 2: fly apart
  topGroup.position.y = eased * 5.5;
  bottomGroup.position.y = -eased * 4.5;
  if (t >= 1) onComplete();
}
```

**Sharing geometry between two Mesh objects is fine** — a `BufferGeometry` can be referenced by multiple `Mesh` instances even in different groups. Only `Mesh` objects have a single parent.

---

## ConeGeometry orientation trick

`ConeGeometry(radius, height, segments)` — apex is at local `+Y`, base at local `−Y`.
To point the apex **downward** (e.g. pencil tip): `mesh.rotation.x = Math.PI`.

After the rotation:
- Base (wide end, radius) → world `+Y` offset from mesh centre
- Apex (tip) → world `−Y` offset from mesh centre

Position formula to connect base to an existing surface at world `yTarget`:
```
mesh.position.y = yTarget - height / 2
```

---

## Emissive vs LineBasicMaterial brightness

`LineBasicMaterial` does **not** have `emissive` — the `color` IS the full output colour regardless of lights. To make lines bright on a dark background:
- Use a bright hex like `#44aaff` or `new THREE.Color(0.3, 0.7, 1.0)` (linear values > sRGB).
- Add a dedicated `PointLight` inside the group so `MeshStandardMaterial` atoms are also lit.
```
