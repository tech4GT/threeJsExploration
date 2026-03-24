/**
 * Deterministic 60fps capture for Three.js animations.
 *
 * Each stage is captured in its own browser session to avoid memory
 * accumulation that crashes the browser mid-run (~frame 744).
 *
 * Time is controlled deterministically: performance.now() and RAF are
 * overridden before page load so clock advances exactly 1/FPS seconds
 * per captured frame — eliminating the jitter of real-time polling.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
import { mkdirSync, rmSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const FRAMES_DIR = '/tmp/pencil-atom-frames';
const OUTPUT     = '/home/user/threeJsExploration/pencil-to-atom.mp4';
const URL        = 'http://localhost:8765/';
const FPS        = 60;
const FRAME_DT   = 1000 / FPS;

// Frames per stage (seconds × FPS)
const STAGE_FRAMES = [
  5  * FPS,   // Stage 0 — pencil macro
  5  * FPS,   // Stage 1 — graphite tip zoom
  5  * FPS,   // Stage 2 — graphene layers
  5  * FPS,   // Stage 3 — graphene sheet
  6  * FPS,   // Stage 4 — carbon atom
];

const TOTAL_FRAMES = STAGE_FRAMES.reduce((a, b) => a + b, 0);

try { rmSync(FRAMES_DIR, { recursive: true }); } catch {}
mkdirSync(FRAMES_DIR, { recursive: true });

// ── Deterministic clock injection (runs before Three.js loads) ───────────────
const INIT_SCRIPT = (startFakeMs) => `
  (() => {
    let _fakeMs = ${startFakeMs};
    const _perfBase = performance.now.bind(performance)();
    performance.now = () => _fakeMs + _perfBase;
    const _dateBase = Date.now();
    Date.now = () => Math.floor(_fakeMs) + _dateBase;
    let _rafQueue = [];
    window.requestAnimationFrame = cb => { _rafQueue.push(cb); return _rafQueue.length; };
    window.cancelAnimationFrame  = () => {};
    window.__tick = dtMs => {
      _fakeMs += dtMs;
      const cbs = _rafQueue.splice(0);
      cbs.forEach(cb => cb(performance.now()));
    };
  })();
`;

async function launchPage(startFakeMs) {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox',
           '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.addInitScript(INIT_SCRIPT(startFakeMs));
  page.on('pageerror', e => console.error('  PAGE ERR:', e.message.slice(0, 120)));
  await page.goto(URL);
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForTimeout(800);  // let sync init finish
  return { browser, page };
}

async function tickTo(page, targetFakeMs, currentFakeMs) {
  // Advance fake time in chunks to reach targetFakeMs
  while (currentFakeMs < targetFakeMs) {
    const dt = Math.min(FRAME_DT, targetFakeMs - currentFakeMs);
    await page.evaluate(dt => window.__tick(dt), dt);
    currentFakeMs += dt;
  }
  return currentFakeMs;
}

// ── Capture each stage in a fresh browser session ────────────────────────────
let globalFrame = 0;
let accumulatedMs = 0;

for (let stageIdx = 0; stageIdx < STAGE_FRAMES.length; stageIdx++) {
  const stageFrames = STAGE_FRAMES[stageIdx];
  console.log(`\nStage ${stageIdx}: launching browser (fake time starts at ${accumulatedMs.toFixed(0)}ms)...`);

  const { browser, page } = await launchPage(accumulatedMs);

  // Prime: run 10 warm-up ticks so Three.js Clock initialises cleanly
  for (let w = 0; w < 10; w++) {
    await page.evaluate(dt => window.__tick(dt), FRAME_DT);
  }

  // Fast-forward through all previous stages (no screenshots — just advance time + press keys)
  let fakeMs = accumulatedMs + 10 * FRAME_DT;

  for (let s = 0; s < stageIdx; s++) {
    console.log(`  Fast-forwarding past stage ${s}...`);
    // Advance through this stage's full duration
    const stageDurationMs = STAGE_FRAMES[s] * FRAME_DT;
    fakeMs = await tickTo(page, fakeMs + stageDurationMs, fakeMs);
    await page.keyboard.press('ArrowRight');
    // Small settle after key press
    await page.evaluate(dt => window.__tick(dt), FRAME_DT * 5);
    fakeMs += FRAME_DT * 5;
  }

  // If not stage 0, press key to enter this stage and let one settle tick run
  if (stageIdx > 0) {
    // Already pressed key at end of fast-forward above; give a few ticks to apply
    await page.evaluate(dt => window.__tick(dt), FRAME_DT * 5);
    fakeMs += FRAME_DT * 5;
  }

  console.log(`  Recording ${stageFrames} frames...`);
  for (let i = 0; i < stageFrames; i++) {
    await page.evaluate(dt => window.__tick(dt), FRAME_DT);
    fakeMs += FRAME_DT;

    const framePath = path.join(FRAMES_DIR, `frame_${String(globalFrame).padStart(5, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });
    globalFrame++;

    if (i % 120 === 0) process.stdout.write(`  ${i}/${stageFrames}\r`);
  }
  console.log(`  Done. ${stageFrames} frames captured.`);

  accumulatedMs += stageFrames * FRAME_DT;
  await browser.close();
}

console.log(`\nAll ${globalFrame} frames captured. Encoding at ${FPS}fps...`);

// Kill HTTP server
try { execSync('pkill -f "http.server 8765"'); } catch {}

// Encode
import { writeFileSync } from 'fs';
const encScript = `/tmp/threejs-encode.py`;
writeFileSync(encScript, `
import imageio.v2 as imageio, glob, os, sys
frames_dir, output, fps = sys.argv[1], sys.argv[2], int(sys.argv[3])
paths = sorted(glob.glob(frames_dir + '/frame_*.png'))
print(f'Encoding {len(paths)} frames at {fps}fps...')
w = imageio.get_writer(output, fps=fps, codec='libx264', quality=8)
for i, p in enumerate(paths):
    w.append_data(imageio.imread(p))
    if i % 300 == 0: print(f'  {i}/{len(paths)}')
w.close()
print(f'Done: {os.path.getsize(output) // 1024}KB')
`);
execSync(`python3 ${encScript} "${FRAMES_DIR}" "${OUTPUT}" "${FPS}"`, { stdio: 'inherit' });

rmSync(FRAMES_DIR, { recursive: true });
console.log(`\nVideo saved: ${OUTPUT}`);
