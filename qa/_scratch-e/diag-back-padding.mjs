/**
 * Which rule is actually winning the `padding` on `.info-panel__back`?
 *
 * The scoped rule `.placeholder-world[data-theme="dark"] button.info-panel__back`
 * is (0,3,1), which must outrank App.css's `.placeholder-world button` at (0,1,1).
 * The close controls DID take effect (measured 30x30 icon, #0c111a strip), so the
 * scoped selectors are matching. Something else is zeroing the padding.
 */
import { chromium } from 'playwright';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1917, height: 933 } });

await page.goto('http://localhost:5174/#/data-world');
await page.waitForSelector('[data-testid="world-canvas"][data-status="ready"]', { timeout: 30000 });
await page.keyboard.press('Enter');
await sleep(500);
await page.click('[data-testid="world-index-toggle"]');
await sleep(300);
await page.click('[data-testid="index-skill-python"]');
await page.waitForSelector('[data-testid="panel-back"]', { timeout: 15000 });
await sleep(500);

const out = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="panel-back"]');
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();

  // Every rule in every stylesheet that mentions this class or a bare `button`
  // inside .placeholder-world, with its resolved specificity comparison.
  const matches = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list) => {
      for (const rule of list) {
        if (rule.cssRules) { walk(rule.cssRules); continue; }
        if (!rule.selectorText) continue;
        if (!/panel__back|placeholder-world[^{]*button|placeholder-world button/.test(rule.selectorText)) continue;
        let doesMatch = false;
        try { doesMatch = el.matches(rule.selectorText); } catch {}
        matches.push({
          selector: rule.selectorText,
          matchesThisEl: doesMatch,
          padding: rule.style.padding || null,
          paddingTop: rule.style.paddingTop || null,
          paddingBlock: rule.style.paddingBlock || null,
          paddingInline: rule.style.paddingInline || null,
          display: rule.style.display || null,
          lineHeight: rule.style.lineHeight || null,
          height: rule.style.height || null,
          href: sheet.href ? sheet.href.split('/').pop() : 'inline',
        });
      }
    };
    walk(rules);
  }

  return {
    computed: {
      display: cs.display,
      padding: cs.padding,
      paddingTop: cs.paddingTop,
      height: cs.height,
      lineHeight: cs.lineHeight,
      fontSize: cs.fontSize,
      boxSizing: cs.boxSizing,
      alignSelf: cs.alignSelf,
      flex: cs.flex,
    },
    rect: { w: Math.round(r.width), h: Math.round(r.height) },
    parentTag: el.parentElement.tagName + '.' + el.parentElement.className,
    parentDisplay: getComputedStyle(el.parentElement).display,
    matches,
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
console.log('done');