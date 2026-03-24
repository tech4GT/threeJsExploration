/**
 * Deterministic frame capture for Three.js animations.
 *
 * Key insight: page.screenshot() has variable latency (10–50ms), so a real-time
 * capture produces jitter because Three.js Clock advances with wall-clock time.
 *
 * Fix: override performance.now() and requestAnimationFrame BEFORE page load so
 * time only advances by exactly 1/FPS seconds per captured frame. The animation
 * runs in lockstep with the capture loop — perfectly smooth output.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
import { mkdirSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const FRAMES_DIR = '/tmp/pencil-atom-frames';
const OUTPUT     = '/home/user/threeJsExploration/pencil-to-atom.mp4';
const FPS        = 60;
const FRAME_DT   = 1000 / FPS;  // ms advanced per captured frame

// How many frames to record per stage
const STAGE_FRAMES = [
  5  * FPS,   // Stage 0 — pencil
  5  * FPS,   // Stage 1 — graphite tip zoom
  5  * FPS,   // Stage 2 — graphene layers
  5  * FPS,   // Stage 3 — graphene sheet
  6  * FPS,   // Stage 4 — carbon atom
];

try { rmSync(FRAMES_DIR, { recursive: true }); } catch {}
mkdirSync(FRAMES_DIR, { recursive: true });

const browser = await chromium.launch({
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--use-gl=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
  ],
  headless: true,
});

const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 720 });

// ── Inject deterministic clock BEFORE page/Three.js loads ────────────────────
await page.addInitScript(() => {
  let _fakeMs = 0;

  // Override performance.now — Three.js Clock reads this directly
  const _perfBase = performance.now.bind(performance)();
  performance.now = () => _fakeMs + _perfBase;

  // Override Date.now for completeness
  const _dateBase = Date.now();
  Date.now = () => Math.floor(_fakeMs) + _dateBase;

  // Replace RAF with a manual queue
  let _rafQueue = [];
  window.requestAnimationFrame = (cb) => { _rafQueue.push(cb); return _rafQueue.length; };
  window.cancelAnimationFrame  = () => {};

  // __tick(dt): advance fake time by dt ms, fire all queued RAF callbacks once
  window.__tick = (dtMs) => {
    _fakeMs += dtMs;
    const cbs = _rafQueue.splice(0);
    cbs.forEach(cb => cb(performance.now()));
    return cbs.length;
  };
});

page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
page.on('console',   m => { if (m.type() === 'error') console.error('CONSOLE ERR:', m.text().slice(0, 200)); });

await page.goto('http://localhost:8765/');
await page.waitForSelector('canvas', { timeout: 15000 });

// Let synchronous init code finish (importmap resolution, scene build)
await page.waitForTimeout(1000);

// Prime the RAF queue: tick a few frames so Three.js Clock starts cleanly
for (let i = 0; i < 10; i++) {
  await page.evaluate((dt) => window.__tick(dt), FRAME_DT);
}

// ── Capture loop ─────────────────────────────────────────────────────────────
console.log('Starting deterministic capture...');
let frameNum = 0;

for (let stageIdx = 0; stageIdx < STAGE_FRAMES.length; stageIdx++) {
  console.log(`  Stage ${stageIdx}: ${STAGE_FRAMES[stageIdx]} frames`);

  for (let i = 0; i < STAGE_FRAMES[stageIdx]; i++) {
    // 1. Advance animation by exactly one frame
    await page.evaluate((dt) => window.__tick(dt), FRAME_DT);

    // 2. Capture the rendered canvas
    const framePath = path.join(FRAMES_DIR, `frame_${String(frameNum).padStart(5, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });
    frameNum++;
  }

  // Advance to next stage (keyboard event is processed on next tick)
  if (stageIdx < STAGE_FRAMES.length - 1) {
    await page.keyboard.press('ArrowRight');
  }
}

console.log(`\nCaptured ${frameNum} frames. Encoding...`);
await browser.close();

// Kill HTTP server if still running
try { execSync('pkill -f "http.server 8765"'); } catch {}

// ── Encode with imageio (ffmpeg not required) ─────────────────────────────────
execSync(
  `python3 -c "
import imageio.v2 as imageio, glob
paths = sorted(glob.glob('${FRAMES_DIR}/frame_*.png'))
print(f'Encoding {len(paths)} frames at ${FPS}fps...')
w = imageio.get_writer('${OUTPUT}', fps=${FPS}, codec='libx264', quality=8)
for p in paths: w.append_data(imageio.imread(p))
w.close()
print('Done.')
"`,
  { stdio: 'inherit' }
);

rmSync(FRAMES_DIR, { recursive: true });
console.log(`\nVideo: ${OUTPUT}`);
