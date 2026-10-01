import { chromium } from 'playwright';
const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1280,height:720},deviceScaleFactor:2});
await p.goto('http://localhost:5173/',{waitUntil:'networkidle'}); await p.waitForTimeout(1100);
// opening: both headline words
await p.locator('.cinematic-type__word--left').screenshot({path:'qa-screenshots/w-personal.png'});
await p.locator('.cinematic-type__word--right').screenshot({path:'qa-screenshots/w-portfolio.png'});
await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight-innerHeight));
await p.waitForTimeout(1500);
for (const s of ['data','cloud']) {
  const pl=p.locator(`[data-plate="${s}"] .cinematic-plate__body`);
  await pl.screenshot({path:`qa-screenshots/w-${s}-words.png`});
}
await b.close();
console.log('captured 6 word crops');
