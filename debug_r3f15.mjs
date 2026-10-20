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
  
  // Find the Canvas fiber (depth 6)
  let current = fiber;
  let canvasFiber = null;
  let depth = 0;
  
  while (current && depth < 20) {
    const typeName = current.type?.name || current.type?.displayName || (typeof current.type === 'function' ? 'FunctionComponent' : 'unknown');
    if (typeName === 'Canvas' && depth === 6) {
      canvasFiber = current;
      break;
    }
    current = current.return;
    depth++;
  }
  
  if (!canvasFiber) return { error: 'Canvas fiber not found at depth 6' };
  
  // Get the child fiber (should be a Fragment "h")
  let fragmentFiber = canvasFiber.child;
  if (!fragmentFiber) return { error: 'Canvas has no child fiber' };
  
  // Collect all children of the fragment
  let allChildren = [];
  function collectChildren(node, childDepth = 0) {
    if (!node || childDepth > 50) return;
    const typeName = node.type?.name || node.type?.displayName || (typeof node.type === 'function' ? 'FunctionComponent' : (node.type && node.type.constructor?.name) || 'unknown');
    allChildren.push({
      depth: childDepth,
      typeName,
      hasMemoizedState: !!node.memoizedState,
      memoizedPropsKeys: node.memoizedProps ? Object.keys(node.memoizedProps) : null,
      pendingPropsKeys: node.pendingProps ? Object.keys(node.pendingProps) : null,
      child: !!node.child,
      sibling: !!node.sibling
    });
    let child = node.child;
    while (child) {
      collectChildren(child, childDepth + 1);
      child = child.sibling;
    }
  }
  
  if (fragmentFiber) {
    collectChildren(fragmentFiber);
  }
  
  return {
    fragmentTypeName: fragmentFiber.type?.name || fragmentFiber.type?.displayName || 'unknown',
    fragmentChildrenCount: allChildren.length,
    fragmentChildren: allChildren.slice(0, 100)
  };
});

console.log('=== FRAGMENT CHILDREN DIAGNOSTICS ===');
console.log(JSON.stringify(result, null, 2));
console.log('\n=== CONSOLE MESSAGES ===');
consoleMessages.forEach(m => console.log(`[${m.type}] ${m.text}`));

await browser.close();
