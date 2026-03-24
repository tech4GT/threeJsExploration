/**
 * tools/capture.mjs — Deterministic 60fps headless capture for Three.js projects.
 *
 * Works with any project in this repo. Launches a fresh Chromium session per
 * stage to keep memory bounded, then encodes all frames to MP4 via imageio.
 *
 * Usage:
 *   # Serve your project first:
 *   python3 -m http.server 8765 --directory projects/<name>/
 *
 *   # Then capture:
 *   node tools/capture.mjs [options]
 *
 * Options (all optional):
 *   --url      <url>          Page URL to capture         [http://localhost:8765/]
 *   --out      <path>         Output MP4 path             [./capture.mp4]
 *   --fps      <number>       Frames per second           [60]
 *   --stages   <n,n,n,...>    Seconds per stage           [5,5,5,5,6]
 *   --width    <px>           Viewport width              [1280]
 *   --height   <px>           Viewport height             [720]
 *
 * Examples:
 *   node tools/capture.mjs
 *   node tools/capture.mjs --out projects/project-two/preview.mp4 --stages 4,4,6
 *   node tools/capture.mjs --fps 30 --width 1920 --height 1080
 *
 * Environment requirements (already satisfied in this repo's environment):
 *   - Playwright: /opt/node22/lib/node_modules/playwright (Chromium with SwiftShader)
 *   - Python3 imageio[ffmpeg]: pip3 install imageio[ffmpeg]
 *   - No GPU needed: uses --use-gl=swiftshader for software WebGL
 *
 * How deterministic capture works:
 *   performance.now() and requestAnimationFrame are overridden via addInitScript
 *   BEFORE the page loads, so Three.js Clock advances by exactly 1/FPS seconds
 *   per captured frame regardless of screenshot latency. This eliminates the
 *   jitter caused by real-time polling (page.waitForTimeout approach).
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
import { mkdirSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const get  = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def; };

const URL_BASE    = get('--url',    'http://localhost:8765/');
const OUTPUT      = get('--out',    path.join(process.cwd(), 'capture.mp4'));
const FPS         = parseInt(get('--fps',    '60'), 10);
const WIDTH       = parseInt(get('--width',  '1280'), 10);
const HEIGHT      = parseInt(get('--height', '720'), 10);
const STAGE_SECS  = (get('--stages', '5,5,5,5,6')).split(',').map(Number);
const FRAME_DT    = 1000 / FPS;
const STAGE_FRAMES = STAGE_SECS.map(s => Math.round(s * FPS));
const TOTAL_FRAMES = STAGE_FRAMES.reduce((a, b) => a + b, 0);
const FRAMES_DIR  = '/tmp/threejs-capture-frames';

console.log(`Capture config:`);
console.log(`  URL:    ${URL_BASE}`);
console.log(`  Output: ${OUTPUT}`);
console.log(`  FPS:    ${FPS}  |  Resolution: ${WIDTH}×${HEIGHT}`);
console.log(`  Stages: ${STAGE_SECS.map((s, i) => `${i}(${s}s)`).join(' ')}`);
console.log(`  Total:  ${TOTAL_FRAMES} frames (${(TOTAL_FRAMES / FPS).toFixed(1)}s)\n`);

try { rmSync(FRAMES_DIR, { recursive: true }); } catch {}
mkdirSync(FRAMES_DIR, { recursive: true });

// ── Deterministic clock — injected before page load ──────────────────────────
function initScript(startFakeMs) {
  return `(() => {
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
  })();`;
}

async function launchPage(startFakeMs) {
  const browser = await chromium.launch({
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist',
    ],
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: WIDTH, height: HEIGHT });
  await page.addInitScript(initScript(startFakeMs));
  page.on('pageerror', e => console.error('  [page error]', e.message.slice(0, 120)));
  await page.goto(URL_BASE);
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForTimeout(800);
  return { browser, page };
}

// ── Per-stage capture (fresh browser each time) ───────────────────────────────
let globalFrame  = 0;
let accumulatedMs = 0;

for (let stageIdx = 0; stageIdx < STAGE_FRAMES.length; stageIdx++) {
  const stageFrames = STAGE_FRAMES[stageIdx];
  console.log(`Stage ${stageIdx}/${STAGE_FRAMES.length - 1}: ${stageFrames} frames (${STAGE_SECS[stageIdx]}s)`);

  const { browser, page } = await launchPage(accumulatedMs);

  // Warm-up ticks so Three.js Clock initialises cleanly
  for (let w = 0; w < 10; w++) {
    await page.evaluate(dt => window.__tick(dt), FRAME_DT);
  }

  // Fast-forward through all previous stages (no screenshots, just time + keypresses)
  let fakeMs = accumulatedMs + 10 * FRAME_DT;
  for (let s = 0; s < stageIdx; s++) {
    process.stdout.write(`  fast-forwarding past stage ${s}...\r`);
    const stageDurationMs = STAGE_FRAMES[s] * FRAME_DT;
    // Advance in FRAME_DT chunks
    const end = fakeMs + stageDurationMs;
    while (fakeMs < end) {
      await page.evaluate(dt => window.__tick(dt), FRAME_DT);
      fakeMs += FRAME_DT;
    }
    await page.keyboard.press('ArrowRight');
    // Settle ticks after key press
    for (let k = 0; k < 5; k++) {
      await page.evaluate(dt => window.__tick(dt), FRAME_DT);
      fakeMs += FRAME_DT;
    }
  }
  if (stageIdx > 0) process.stdout.write('\n');

  // Record this stage
  for (let i = 0; i < stageFrames; i++) {
    await page.evaluate(dt => window.__tick(dt), FRAME_DT);
    fakeMs += FRAME_DT;

    const framePath = path.join(FRAMES_DIR, `frame_${String(globalFrame).padStart(5, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });
    globalFrame++;

    if (i % 60 === 0) process.stdout.write(`  ${i}/${stageFrames} frames\r`);
  }
  console.log(`  ${stageFrames}/${stageFrames} frames — done.`);

  accumulatedMs += stageFrames * FRAME_DT;
  await browser.close();
}

console.log(`\nAll ${globalFrame} frames captured. Encoding...`);

// ── Encode via imageio (no system ffmpeg needed) ──────────────────────────────
execSync(
  `python3 -c "
import imageio.v2 as imageio, glob, os
paths = sorted(glob.glob('${FRAMES_DIR}/frame_*.png'))
print(f'  Encoding {len(paths)} frames at ${FPS}fps...')
w = imageio.get_writer('${OUTPUT}', fps=${FPS}, codec='libx264', quality=8)
for i, p in enumerate(paths):
    w.append_data(imageio.imread(p))
    if i % 300 == 0: print(f'  {i}/{len(paths)}')
w.close()
size = os.path.getsize('${OUTPUT}')
print(f'  Done: {size // 1024}KB')
"`,
  { stdio: 'inherit' }
);

rmSync(FRAMES_DIR, { recursive: true });
console.log(`\nVideo saved: ${OUTPUT}`);
