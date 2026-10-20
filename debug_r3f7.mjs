import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleMessages = [];
page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));

await page.goto('http://localhost:5200/cloud-world-preview.html', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(5000);

const result = await page.evaluate(() => {
  // Check the __THREE__ global in detail
  const three = window.__THREE__;
  let threeDetail = {};
  if (three) {
    for (const key of Object.keys(three)) {
      const val = three[key];
      threeDetail[key] = {
        type: typeof val,
        constructor: val?.constructor?.name,
        keys: val && typeof val === 'object' ? Object.keys(val).slice(0, 20) : null
      };
    }
  }
  
  // Check the fiber tree for the Canvas component's state
  const canvas = document.querySelector('canvas');
  const fiberKey = Object.keys(canvas).find(k => k.startsWith('__reactFiber'));
  const fiber = fiberKey ? canvas[fiberKey] : null;
  
  // Look for the Canvas component's child fiber which should have the R3F store
  let canvasComponentFiber = null;
  let allFibers = [];
  
  function collectFibers(node, depth = 0) {
    if (!node || depth > 30) return;
    allFibers.push({
      type: node.type?.name || node.type?.displayName || node.type,
      depth,
      hasMemoizedState: !!node.memoizedState,
      memoizedStateKeys: node.memoizedState ? Object.keys(node.memoizedState) : null,
      hasStateNode: !!node.stateNode,
      stateNodeKeys: node.stateNode ? Object.keys(node.stateNode).slice(0, 10) : null
    });
    
    let child = node.child;
    while (child) {
      collectFibers(child, depth + 1);
      child = child.sibling;
    }
  }
  
  if (fiber) collectFibers(fiber);
  
  // Find the Canvas fiber (should be a function component)
  let r3fStore = null;
  for (const f of allFibers) {
    if (f.type && (f.type.name === 'Canvas' || f.type.displayName === 'Canvas' || String(f.type).includes('Canvas'))) {
      // The store should be in memoizedState
    }
  }
  
  // Check the actual props passed to Canvas
  const propsKey = Object.keys(canvas).find(k => k.startsWith('__reactProps'));
  const props = propsKey ? canvas[propsKey] : null;
  
  return {
    threeDetail,
    fiberCount: allFibers.length,
    fibers: allFibers.slice(0, 30),
    canvasProps: props ? {
      keys: Object.keys(props),
      children: props.children ? (Array.isArray(props.children) ? props.children.length : 'single') : null,
      camera: props.camera,
      style: props.style,
      onCreated: typeof props.onCreated
    } : null
  };
});

console.log('=== DETAILED R3F DIAGNOSTICS ===');
console.log(JSON.stringify(result, null, 2));
console.log('\n=== CONSOLE MESSAGES ===');
consoleMessages.forEach(m => console.log(`[${m.type}] ${m.text}`));

await browser.close();
