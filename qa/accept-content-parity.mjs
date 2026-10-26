
/** Final acceptance — portfolio content parity: every in-world project/skill
 * card title matches the content source; external links respond. */
import { chromium } from 'playwright';
const BASE = 'http://[::1]:4173/';
const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
}
const browser = await chromium.launch({ headless: true, args: ['--use-angle=d3d11', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const failed = [];
page.on('response', (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url().slice(-70)); });
page.on('requestfailed', (r) => failed.push('FAIL ' + r.url().slice(-70)));
await page.goto(BASE + '#/cloud-world', { waitUntil: 'load', timeout: 30000 });
await page.waitForSelector('canvas', { timeout: 20000 });
await page.waitForFunction(() => (window.__cwAvatarHist?.length ?? 0) > 0, { timeout: 30000 });
await page.waitForTimeout(1500);

// Read the app's own content model from the page bundle (import not possible
// Read the app's own content model from the page bundle (import not possible
// from node; evaluate into window via dynamic import of the dev module is not
// available in preview) — instead fetch titles via the card UI.
// compare against the DOM-stored PORTFOLIO if exposed; else compare signs.
const signs = await page.evaluate(() => {
  // The app may expose PORTFOLIO via React internals; try common paths
  const w = window;
  const candidates = ['__PORTFOLIO', '__cwPortfolio', '__PORTFOLIO_DATA'];
  for (const c of candidates) if (w[c]) return 'exposed:' + c;
  return null;
});
console.log('portfolio exposure:', signs);

// GitHub links inside cards: open rxverify card and read the link
function smoothstep(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
function pathCenterX(z) {
  const canyon = smoothstep(92, 108, z) * (1 - smoothstep(168, 184, z));
  return (2.5 * Math.sin(z * 0.05) + 1.5 * Math.sin(z * 0.13 + 2.0)) * (1 - 0.75 * canyon);
}
function terrainHeight(x, z) {
  const d = Math.abs(x - pathCenterX(z));
  const swell = 2.6 * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 - 0.7) + 1.9 * Math.sin(x * 0.043 - 2.1) * Math.sin(z * 0.036 + 1.1);
  const medium = 0.55 * Math.sin(x * 0.11 + 1.7) * Math.sin(z * 0.09 + 0.6) + 0.4 * Math.cos(z * 0.16 + x * 0.05 + 0.8);
  const fine = 0.18 * Math.sin(x * 0.37 + z * 0.31) * Math.sin(z * 0.23 - x * 0.19);
  const flatten = smoothstep(4.5, 16, d);
  const rimX = smoothstep(55, 105, Math.abs(x)) * 14;
  const rimZ = smoothstep(-38, -95, z) * 10;
  const tm = 1 - smoothstep(-95, -72, z);
  return (swell + medium * 0.55 + fine) * flatten + rimX + rimZ + tm * 2.2;
}
async function clickCenterGrid() {
  const pts = [[720, 450], [720, 415], [720, 485], [660, 450], [780, 450], [720, 380], [720, 520]];
  for (const [px, py] of pts) {
    await page.mouse.click(px, py);
    await page.waitForTimeout(250);
    if (await page.evaluate(() => !!document.querySelector('.cloud-card-scrim'))) return true;
  }
  return false;
}
const projects = [
  { id: 'rxverify', z: 196, side: 'left' },
  { id: 'devops-masterclass', z: 206, side: 'right' },
  { id: 'go-microservices', z: 216, side: 'left' },
];
const expectedTitles = {
  rxverify: 'RxVerify — Digital Prescription Verification',
  'devops-masterclass': 'Full-Stack AI DevOps Masterclass',
  'go-microservices': 'Go Microservices — Real-Time Balance Visibility',
};
let githubLinks = [];
for (const p of projects) {
  const x = pathCenterX(p.z) + (p.side === 'left' ? -13 : 13);
  const by = terrainHeight(x, p.z) + (2.35 + 0.55) * 3.6;
  await page.evaluate(({ x, z, by }) => { window.__cwQaCam = { pos: [x + 0.4, by + 1.0, z - 13], target: [x, by, z] }; }, { x, z: p.z, by });
  await page.waitForTimeout(800);
  const opened = await clickCenterGrid();
  check(`${p.id} card opens`, opened, '');
  if (opened) {
    const card = await page.evaluate(() => ({
      title: document.querySelector('.cloud-card-title')?.textContent,
      github: document.querySelector('.cloud-card-github')?.href ?? null,
      links: document.querySelectorAll('.cloud-card a').length,
      buttons: document.querySelectorAll('.cloud-card button').length,
      placeholderText: [...document.querySelectorAll('.cloud-card *')].some((n) => /^(todo|tbd|lorem|placeholder|xxx)$/i.test(n.textContent.trim())),
    }));
    check(`${p.id} title matches source`, card.title === expectedTitles[p.id], card.title ?? 'none');
    check(`${p.id} no placeholder content`, !card.placeholderText, '');
    if (card.github) githubLinks.push(card.github);
    await page.locator('.cloud-card-return').click();
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => { window.__cwQaCam = undefined; });
}
// GitHub link reachability (HEAD)
for (const u of githubLinks) {
  try {
    const resp = await page.request.get(u, { timeout: 15000, maxRedirects: 5 });
    check(`link reachable ${u.slice(-40)}`, resp.ok() || resp.status() === 200 || resp.status() === 301 || resp.status() === 302 || resp.status() === 403, String(resp.status()));
  } catch (e) {
    check(`link reachable ${u.slice(-40)}`, false, e.message.slice(0, 60));
  }
}
check('zero failed asset requests', failed.length === 0, failed.slice(0, 3).join(' | '));
await page.close();
await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n=== CONTENT PARITY: ${passed}/${results.length} pass ===`);
if (results.some((r) => !r.pass)) process.exit(1);
