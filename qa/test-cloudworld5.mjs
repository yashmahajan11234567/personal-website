/** Test Cloud World - check routing and gameStore state */
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleLogs = [];
page.on('console', msg => {
  const log = { type: msg.type(), text: msg.text() };
  consoleLogs.push(log);
  console.log(`  [${log.type}] ${log.text}`);
});
page.on('pageerror', err => {
  const log = { type: 'error', text: err.message };
  consoleLogs.push(log);
  console.log(`  [error] ${log.text}`);
});

// Navigate to hero page
await page.goto('http://localhost:5195/');
await page.waitForTimeout(2000);

// Check initial state
const initialState = await page.evaluate(() => {
  return {
    hash: window.location.hash,
    hasGameStore: typeof window.__gameStore !== 'undefined',
  };
});
console.log('Initial state:', initialState);

// Scroll to selection hold (bottom of cinematic)
await page.evaluate(() => {
  const track = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo(0, track);
});
await page.waitForTimeout(2000);

// Check what boards are visible
const boards = await page.locator('[data-testid^="world-board-"]').all();
console.log(`Found ${boards.length} boards`);
for (const board of boards) {
  const testId = await board.getAttribute('data-testid');
  const isVisible = await board.isVisible();
  console.log(`  ${testId}: visible=${isVisible}`);
}

// Click Cloud board
const cloudBoard = await page.locator('[data-testid="world-board-cloud"]').first();
await cloudBoard.click();
console.log('Clicked Cloud board');

// Wait for handoff
await page.waitForTimeout(5000);

// Check state after click
const afterState = await page.evaluate(() => {
  return {
    hash: window.location.hash,
    canvasCount: document.querySelectorAll('canvas').length,
    canvases: Array.from(document.querySelectorAll('canvas')).map(c => ({
      className: c.parentElement?.className,
      width: c.width,
      height: c.height,
    })),
  };
});
console.log('After click state:', JSON.stringify(afterState, null, 2));

// Check for Cloud World specific elements
const cloudWorldCheck = await page.evaluate(() => {
  return {
    cloudWorldContainer: !!document.querySelector('.cloud-world-container'),
    cloudWorldOverlay: !!document.querySelector('.cloud-world-overlay'),
    worldCanvas: !!document.querySelector('.world-canvas'),
    dataWorldCanvas: !!document.querySelector('[data-testid="world-canvas"]'),
  };
});
console.log('Cloud World check:', JSON.stringify(cloudWorldCheck, null, 2));

// Wait a bit more
await page.waitForTimeout(5000);

const finalState = await page.evaluate(() => {
  return {
    hash: window.location.hash,
    canvasCount: document.querySelectorAll('canvas').length,
    canvases: Array.from(document.querySelectorAll('canvas')).map(c => ({
      className: c.parentElement?.className,
      width: c.width,
      height: c.height,
    })),
  };
});
console.log('Final state:', JSON.stringify(finalState, null, 2));

// Capture screenshot
await page.screenshot({ path: 'qa-screenshots/cloudworld-verify5.png', fullPage: true });
console.log('\nScreenshot captured');

await browser.close();
