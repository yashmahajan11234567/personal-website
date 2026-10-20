
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/#/cloud-world', { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => Array.isArray(window.__cwMountainDomes), { timeout: 25000 });
await page.waitForTimeout(2500);
const face = await page.evaluate(() => window.__cwMountFace);
console.log('face:', JSON.stringify(face));
// Pin camera dead-center in front of the face, looking at it
const camZ = face.z - 26; // in front (face looks toward -z)
await page.evaluate(([f, cz]) => {
  window.__cwQaCam = { pos: [f.x, f.y + 2, cz], target: [f.x, f.y, f.z] };
}, [face, camZ]);
await page.waitForTimeout(900);
await page.screenshot({ path: 'qa-screenshots-redesign/09-face-closeup.png' });
console.log('shot: 09-face-closeup');
await browser.close();
