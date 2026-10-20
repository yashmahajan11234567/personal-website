import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outputDir = '/d/Yash/personal-website/qa-screenshots-audit';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Enable console logging
page.on('console', msg => {
  const text = msg.text();
  if (text.includes('error') || text.includes('Error') || text.includes('WARNING') || text.includes('WebGL') || text.includes('[FrameDriver]') || text.includes('[CONSOLE]')) {
    console.log(`[CONSOLE ${msg.type()}] ${text}`);
  }
});

page.on('pageerror', err => {
  console.log(`[PAGE ERROR] ${err.message}`);
});

console.log('Navigating to app with Cloud World hash...');
await page.goto('http://localhost:5173/#/cloud-world', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(5000);

// Wait for canvas to be ready
await page.waitForSelector('canvas', { timeout: 15000 });
await page.waitForFunction(() => {
  const canvas = document.querySelector('canvas');
  const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
  return gl && canvas.width > 0 && canvas.height > 0;
}, { timeout: 15000 });
await page.waitForTimeout(3000);

console.log('Cloud World canvas ready!');

// Function to capture screenshot with name
async function capture(name) {
  const filePath = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`Captured: ${filePath}`);
}

// 1. Default view
await capture('01-default');

// 2. Look up
await page.keyboard.down('ArrowUp');
await page.waitForTimeout(1000);
await capture('02-look-up');
await page.keyboard.up('ArrowUp');
await page.waitForTimeout(500);

// 3. Look down
await page.keyboard.down('ArrowDown');
await page.waitForTimeout(1000);
await capture('03-look-down');
await page.keyboard.up('ArrowDown');
await page.waitForTimeout(500);

// 4. Look left
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(1000);
await capture('04-look-left');
await page.keyboard.up('ArrowLeft');
await page.waitForTimeout(500);

// 5. Look right
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(1000);
await capture('05-look-right');
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(500);

// 6. Mid-valley - move character forward
await page.keyboard.down('w');
await page.waitForTimeout(2000);
await page.keyboard.up('w');
await page.waitForTimeout(500);
await capture('06-mid-valley');

// 7. Mountain passage - move further
await page.keyboard.down('w');
await page.waitForTimeout(4000);
await page.keyboard.up('w');
await page.waitForTimeout(500);
await capture('07-mountain-passage');

// 8. Projects sunset - move further
await page.keyboard.down('w');
await page.waitForTimeout(4000);
await page.keyboard.up('w');
await page.waitForTimeout(500);
await capture('08-projects-sunset');

// Get console logs and scene info
const sceneInfo = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return null;
  
  // Try to access R3F store - check multiple possible locations
  let store = null;
  
  // Method 1: __r3f
  if (canvas.__r3f?.getState) {
    store = canvas.__r3f;
  }
  // Method 2: _r3f
  else if (canvas._r3f?.getState) {
    store = canvas._r3f;
  }
  // Method 3: __reactFiber traversal
  else {
    const fiberKey = Object.keys(canvas).find(k => k.startsWith('__reactFiber'));
    if (fiberKey) {
      const fiber = canvas[fiberKey];
      let current = fiber;
      let canvasImplFiber = null;
      let depth = 0;
      while (current && depth < 20) {
        const typeName = current.type?.name || current.type?.displayName;
        if (typeName === 'CanvasImpl') {
          canvasImplFiber = current;
          break;
        }
        current = current.return;
        depth++;
      }
      
      if (canvasImplFiber?.memoizedState) {
        let hook = canvasImplFiber.memoizedState;
        while (hook) {
          if (hook.memoizedState && typeof hook.memoizedState.getState === 'function') {
            store = hook.memoizedState;
            break;
          }
          hook = hook.next;
        }
      }
    }
  }
  
  if (!store) return { error: 'No store found - checked __r3f, _r3f, and __reactFiber traversal' };
  
  const state = store.getState();
  const scene = state.scene;
  const camera = state.camera;
  const controls = state.controls;
  
  const objects = [];
  scene?.traverse?.(obj => {
    objects.push({
      type: obj.type,
      name: obj.name || obj.uuid.slice(0, 8),
      position: obj.position ? [Math.round(obj.position.x*100)/100, Math.round(obj.position.y*100)/100, Math.round(obj.position.z*100)/100] : null,
      visible: obj.visible,
      material: obj.material ? {
        color: obj.material.color?.getHexString?.(),
        side: obj.material.side,
        transparent: obj.material.transparent,
        opacity: obj.material.opacity,
        renderOrder: obj.material.renderOrder,
        depthWrite: obj.material.depthWrite,
        depthTest: obj.material.depthTest,
      } : null,
    });
  });
  
  return {
    camera: camera ? {
      position: camera.position ? [Math.round(camera.position.x*100)/100, Math.round(camera.position.y*100)/100, Math.round(camera.position.z*100)/100] : null,
      fov: camera.fov,
      near: camera.near,
      far: camera.far,
    } : null,
    controls: controls ? {
      target: controls.target ? [Math.round(controls.target.x*100)/100, Math.round(controls.target.y*100)/100, Math.round(controls.target.z*100)/100] : null,
    } : null,
    objectCount: objects.length,
    objects: objects,
  };
});

console.log('Scene Info:', JSON.stringify(sceneInfo, null, 2));

fs.writeFileSync(path.join(outputDir, 'scene-info.json'), JSON.stringify(sceneInfo, null, 2));

await browser.close();
console.log('Audit capture complete.');