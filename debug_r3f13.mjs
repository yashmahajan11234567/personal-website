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
  
  // Find the CanvasImpl fiber and then its child (the actual Canvas component)
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
  
  // Get the child fiber of CanvasImpl (should be the Canvas component)
  let canvasComponentFiber = canvasImplFiber.child;
  if (!canvasComponentFiber) return { error: 'CanvasImpl has no child' };
  
  // Traverse down to find all children of the Canvas component
  let allChildren = [];
  function collectChildren(node, childDepth = 0) {
    if (!node || childDepth > 30) return;
    const typeName = node.type?.name || node.type?.displayName || (typeof node.type === 'function' ? 'FunctionComponent' : 'unknown');
    allChildren.push({
      depth: childDepth,
      typeName,
      hasMemoizedState: !!node.memoizedState,
      memoizedStateKeys: node.memoizedState ? Object.keys(node.memoizedState) : null,
      child: !!node.child,
      sibling: !!node.sibling
    });
    let child = node.child;
    let idx = 0;
    while (child) {
      collectChildren(child, childDepth + 1);
      child = child.sibling;
      idx++;
    }
  }
  
  collectChildren(canvasComponentFiber);
  
  // Also check the props passed to Canvas component
  const props = canvasComponentFiber.memoizedProps || canvasComponentFiber.pendingProps;
  
  return {
    canvasComponentProps: props ? {
      keys: Object.keys(props),
      children: props.children ? (Array.isArray(props.children) ? props.children.length : 'single') : null,
      camera: props.camera,
      style: props.style,
      onCreated: typeof props.onCreated,
      fallback: typeof props.fallback
    } : null,
    canvasChildrenCount: allChildren.length,
    canvasChildren: allChildren.slice(0, 50)
  };
});

console.log('=== CANVAS COMPONENT CHILDREN DIAGNOSTICS ===');
console.log(JSON.stringify(result, null, 2));
console.log('\n=== CONSOLE MESSAGES ===');
consoleMessages.forEach(m => console.log(`[${m.type}] ${m.text}`));

await browser.close();
