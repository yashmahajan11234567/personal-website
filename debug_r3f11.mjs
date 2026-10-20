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
  
  // Traverse UP the return chain to find the Canvas component fiber
  let current = fiber;
  let returnChain = [];
  let depth = 0;
  const visited = new Set();
  
  while (current && depth < 20 && !visited.has(current)) {
    visited.add(current);
    
    // Serialize without circular refs
    const info = {
      depth,
      typeName: current.type?.name || current.type?.displayName || (typeof current.type === 'function' ? 'FunctionComponent' : (current.type && current.type.constructor?.name) || 'unknown'),
      hasMemoizedState: !!current.memoizedState,
      memoizedStateKeys: current.memoizedState ? Object.keys(current.memoizedState) : null,
      hasGetState: current.memoizedState && typeof current.memoizedState.getState === 'function',
      stateNodeType: current.stateNode?.constructor?.name,
      hasStateNodeGetState: current.stateNode && typeof current.stateNode.getState === 'function',
      child: !!current.child,
      sibling: !!current.sibling
    };
    
    // Check for R3F store
    if (current.memoizedState && typeof current.memoizedState.getState === 'function') {
      info.hasR3FStore = true;
    }
    if (current.stateNode && typeof current.stateNode.getState === 'function') {
      info.hasR3FStore = true;
    }
    
    returnChain.push(info);
    current = current.return;
    depth++;
  }
  
  return {
    returnChain
  };
});

console.log('=== RETURN CHAIN DIAGNOSTICS ===');
console.log(JSON.stringify(result, null, 2));
console.log('\n=== CONSOLE MESSAGES ===');
consoleMessages.forEach(m => console.log(`[${m.type}] ${m.text}`));

await browser.close();
