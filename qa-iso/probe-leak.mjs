import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e).slice(0, 120)));
// 1) land on hero, wait for loading to finish, scroll down
await p.goto('http://localhost:5174/#/', { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => !document.querySelector('.loading-screen'), { timeout: 20000 }).catch(() => {});
await new Promise(r => setTimeout(r, 3000));
const hero = await p.evaluate(() => ({ scrollH: document.scrollingElement.scrollHeight, y: window.scrollY, bodyKids: [...document.body.children].map(c => c.tagName + '.' + String(c.className).slice(0, 30)) }));
console.log('HERO', JSON.stringify(hero));
await p.mouse.move(720, 450);
for (let i = 0; i < 8; i++) { await p.mouse.wheel(0, 400); await new Promise(r => setTimeout(r, 200)); }
await new Promise(r => setTimeout(r, 1000));
console.log('HERO-SCROLLED', await p.evaluate(() => JSON.stringify({ y: window.scrollY, scrollH: document.scrollingElement.scrollHeight })));
// 2) navigate to cloud-world-iso via hash (as the user would)
await p.evaluate(() => { window.location.hash = '#/cloud-world-iso'; });
await p.waitForFunction(() => window.__iso, { timeout: 25000 }).catch(() => {});
await new Promise(r => setTimeout(r, 4000));
const w1 = await p.evaluate(() => ({ scrollH: document.scrollingElement.scrollHeight, innerH: window.innerHeight, y: window.scrollY, bodyKids: [...document.body.children].map(c => c.tagName + '.' + String(c.className).slice(0, 30)), mainKids: [...document.getElementById('main').children].map(c => c.tagName + '.' + String(c.className).slice(0, 30)) }));
console.log('WORLD', JSON.stringify(w1, null, 1));
// 3) wheel down inside the world
await p.mouse.move(720, 450);
for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 400); await new Promise(r => setTimeout(r, 250)); }
await new Promise(r => setTimeout(r, 1200));
console.log('WORLD-AFTER-WHEEL', await p.evaluate(() => JSON.stringify({ y: window.scrollY, scrollH: document.scrollingElement.scrollHeight })));
await p.screenshot({ path: 'qa-iso/leak-after.png' });
console.log('pageerrors:', errs.length, errs.slice(0, 3));
await b.close();
