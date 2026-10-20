import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleMessages = [];
page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));

await page.goto('http://localhost:5200/cloud-world-preview.html', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(5000);

const result = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  const fiberKey = Object.keys(canvas).find(k => k.startsWith('__reactFiber'));
  const fiber = fiberKey ? canvas[fiberKey] : null;
  
  // Traverse UP the return chain to find the CanvasImpl component fiber
  let current = fiber;
  let canvasImplFiber = null;
  let depth = 0;
  
  while (current && depth < 20) {
    const typeName = current.type?.name || current.type?.displayName || (typeof current.type === 'function' ? 'FunctionComponent' : 'unknown');
    if (typeName === 'CanvasImpl') {
      canvasImplFiber = current;
      break;
    }
    current = current.return;
    depth++;
  }
  
  if (!canvasImplFiber) return { error: 'CanvasImpl not found' };
  
  // Check the memoizedState of CanvasImpl
  const memoizedState = canvasImplFiber.memoizedState;
  
  // The R3F store is typically in memoizedState.memoizedState or similar
  // Let's inspect the hook chain
  let hook = memoizedState;
  let hooks = [];
  
  while (hook) {
    hooks.push({
      memoizedState: hook.memoizedState ? {
        constructor: hook.memoizedState.constructor?.name,
        keys: hook.memoizedState && typeof hook.memoizedState === 'object' ? Object.keys(hook.memoizedState) : null,
        hasGetState: hook.memoizedState && typeof hook.memoizedState.getState === 'function',
        getStateResult: (() => {
          try {
            return hook.memoizedState && typeof hook.memoizedState.getState === 'function' ? hook.memoizedState.getState() : null;
          } catch (e) {
            return { error: e.message };
          }
        })()
      } : null,
      baseState: hook.baseState ? {
        constructor: hook.baseState.constructor?.name,
        keys: hook.baseState && typeof hook.baseState === 'object' ? Object.keys(hook.baseState) : null
      } : null
    });
    hook = hook.next;
  }
  
  return {
    foundCanvasImpl: true,
    depth,
    hooks
  };
});

console.log('=== CANVAS IMPL HOOKS DIAGNOSTICS ===');
console.log(JSON.stringify(result, null, 2));
console.log('\n=== CONSOLE MESSAGES ===');
consoleMessages.forEach(m => console.log(`[${m.type}] ${m.text}`));

await browser.close();
