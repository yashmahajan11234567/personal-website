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
  
  // Find the Canvas component fiber (depth 6 in previous diagnostic)
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
  
  // Get all props
  const memoizedProps = canvasFiber.memoizedProps || {};
  const pendingProps = canvasFiber.pendingProps || {};
  
  // Also check the child fiber (should be the scene contents)
  let childFibers = [];
  let child = canvasFiber.child;
  while (child) {
    const typeName = child.type?.name || child.type?.displayName || (typeof child.type === 'function' ? 'FunctionComponent' : 'unknown');
    childFibers.push({
      typeName,
      memoizedProps: child.memoizedProps ? Object.keys(child.memoizedProps) : null,
      pendingProps: child.pendingProps ? Object.keys(child.pendingProps) : null
    });
    child = child.sibling;
  }
  
  return {
    canvasFiberProps: {
      memoized: Object.keys(memoizedProps),
      pending: Object.keys(pendingProps),
      memoizedValues: {
        camera: memoizedProps.camera,
        onCreated: typeof memoizedProps.onCreated,
        style: memoizedProps.style,
        children: memoizedProps.children ? (Array.isArray(memoizedProps.children) ? memoizedProps.children.length : 'single') : null
      },
      pendingValues: {
        camera: pendingProps.camera,
        onCreated: typeof pendingProps.onCreated,
        style: pendingProps.style,
        children: pendingProps.children ? (Array.isArray(pendingProps.children) ? pendingProps.children.length : 'single') : null
      }
    },
    childFibers
  };
});

console.log('=== CANVAS FIBER PROPS DIAGNOSTICS ===');
console.log(JSON.stringify(result, null, 2));
console.log('\n=== CONSOLE MESSAGES ===');
consoleMessages.forEach(m => console.log(`[${m.type}] ${m.text}`));

await browser.close();
