import { chromium } from 'playwright';
const b=await chromium.launch();

for (const side of ['data','cloud']) {
  const p=await b.newPage({viewport:{width:1280,height:720}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:5173/',{waitUntil:'networkidle'}); await p.waitForTimeout(900);
  await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight-innerHeight));
  await p.waitForTimeout(1200);

  // hover: read the accent glow's resolved colour
  const glow=()=>p.evaluate(()=>{
    const els=Array.from(document.querySelectorAll('[class*="glow"]'));
    return els.map(e=>{const c=getComputedStyle(e);return {cls:e.className.slice(0,40),bg:c.backgroundColor,op:c.opacity};});
  });
  const before=await glow();
  await p.locator(`[data-testid="world-board-${side}"]`).hover();
  await p.waitForTimeout(800);
  const after=await glow();
  console.log(`\n=== ${side} ===`);
  console.log('  glow before:',JSON.stringify(before));
  console.log('  glow after :',JSON.stringify(after));
  // focus ring
  await p.locator(`[data-testid="world-board-${side}"]`).focus();
  await p.waitForTimeout(300);
  const fo=await p.evaluate(s=>{const e=document.querySelector(`[data-testid="world-board-${s}"]`);const c=getComputedStyle(e);return {outline:c.outlineWidth,shadow:c.boxShadow.slice(0,40)};},side);
  console.log('  focus:',JSON.stringify(fo));
  await p.locator(`[data-testid="world-board-${side}"]`).click();
  await p.waitForTimeout(1500);
  console.log('  url:',p.url());
  console.log('  world:',await p.locator('.placeholder-world h1').textContent().catch(()=>'(none)'));
  console.log('  errors:',errs.length?errs:'none');
  await p.close();
}
await b.close();
