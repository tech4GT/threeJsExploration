import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
import { mkdirSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const FRAMES_DIR = '/tmp/pencil-atom-frames';
const OUTPUT     = '/home/user/threeJsExploration/pencil-to-atom.mp4';

// Clean + create frames dir
try { rmSync(FRAMES_DIR, { recursive: true }); } catch {}
mkdirSync(FRAMES_DIR, { recursive: true });

const browser = await chromium.launch({
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--use-gl=swiftshader',          // software WebGL
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--disable-web-security',
  ],
  headless: true,
});

const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 720 });

// Expose a hook so we can trigger stage changes from outside
await page.addInitScript(() => {
  window.__stageQueue = [];
  window.__advanceStage = () => { window.__stageQueue.push(1); };
});

await page.goto('http://localhost:8765/');

// Wait for Three.js canvas to appear
await page.waitForSelector('canvas', { timeout: 10000 });

// Give the animation loop time to start
await page.waitForTimeout(2000);

// Capture frames at ~24fps
// Schedule: capture 4s per stage × 5 stages = 20s total
const FPS        = 24;
const FRAME_MS   = 1000 / FPS;
// Stage durations in ms
const STAGE_DURATIONS = [4000, 4000, 4000, 4000, 5000]; // ms per stage

let frame    = 0;
let stageIdx = 0;
let stageElapsed = 0;
const stageAdvanceDelay = 200; // ms after advance before we start counting next stage

console.log('Starting capture...');

for (const stageDuration of STAGE_DURATIONS) {
  console.log(`Recording stage ${stageIdx}...`);
  const stageFrames = Math.ceil(stageDuration / FRAME_MS);

  for (let i = 0; i < stageFrames; i++) {
    const framePath = path.join(FRAMES_DIR, `frame_${String(frame).padStart(5, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });
    frame++;
    await page.waitForTimeout(FRAME_MS);
  }

  // Advance to next stage (unless last)
  if (stageIdx < STAGE_DURATIONS.length - 1) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(stageAdvanceDelay);
    stageIdx++;
  }
}

console.log(`Captured ${frame} frames. Encoding video...`);
await browser.close();

// Kill the HTTP server
try { execSync('pkill -f "http.server 8765"'); } catch {}

// Encode with ffmpeg
execSync(
  `ffmpeg -y -framerate ${FPS} -i "${FRAMES_DIR}/frame_%05d.png" ` +
  `-vcodec libx264 -crf 20 -pix_fmt yuv420p "${OUTPUT}"`,
  { stdio: 'inherit' }
);

// Cleanup frames
rmSync(FRAMES_DIR, { recursive: true });

console.log(`\nDone! Video saved to: ${OUTPUT}`);
