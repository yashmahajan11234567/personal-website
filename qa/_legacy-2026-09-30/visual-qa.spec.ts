import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REFERENCE_FRAMES_DIR = path.join(__dirname, '..', '..');
const OUTPUT_DIR = path.join(__dirname, '..', 'qa-screenshots');
const TEST_POINTS = [0, 10, 25, 50, 75, 90, 100];

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function scrollToProgress(page: any, progress: number) {
  // The hero is pinned with ScrollTrigger, so we need to scroll the page
  const hero = page.locator('.hero');
  await hero.waitFor({ state: 'visible' });
  
  // Get the scroll height needed for the hero transition
  // The hero is 100vh and pinned, so we need to scroll past it
  await page.evaluate((p) => {
    const heroEl = document.querySelector('.hero');
    if (heroEl) {
      const scrollAmount = heroEl.offsetHeight * p;
      window.scrollTo(0, scrollAmount);
    }
  }, progress);
  
  // Wait for GSAP to update
  await page.waitForTimeout(500);
  
  // Also trigger GSAP ScrollTrigger update
  await page.evaluate(() => {
    if (window.ScrollTrigger) {
      ScrollTrigger.refresh();
    }
  });
  
  await page.waitForTimeout(300);
}

async function captureCanvasScreenshot(page: any, side: string, progress: number) {
  const canvas = page.locator(`.frame-canvas--${side}`);
  await canvas.waitFor({ state: 'visible' });
  
  const screenshot = await canvas.screenshot({
    path: path.join(OUTPUT_DIR, `${side}-${progress}percent.png`)
  });
  return screenshot;
}

async function captureFullHeroScreenshot(page: any, side: string, progress: number) {
  const hero = page.locator('.hero');
  await hero.waitFor({ state: 'visible' });
  
  const screenshot = await hero.screenshot({
    path: path.join(OUTPUT_DIR, `hero-${side}-${progress}percent.png`)
  });
  return screenshot;
}

test.describe('Phase 1 Visual QA - Data Path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for frames to load
  });

  for (const progress of [0, 10, 25, 50, 75, 90]) {
    test(`Data path at ${progress}% scroll`, async ({ page }) => {
      await scrollToProgress(page, progress / 100);
      
      // Capture left canvas (Data path)
      await captureCanvasScreenshot(page, 'left', progress);
      
      // Also capture full hero for context
      await captureFullHeroScreenshot(page, 'left', progress);
      
      // Log frame index for debugging
      const frameIndex = await page.evaluate((p) => {
        const canvas = document.querySelector('.frame-canvas--left');
        if (canvas) {
          // We can't directly get the frame index from canvas, but we can log progress
          return { progress: p };
        }
        return { progress: p };
      }, progress / 100);
      
      console.log(`Data path ${progress}%:`, frameIndex);
    });
  }
  
  // 100% test - at 100%, hero transitions to path-selection, so canvas is gone
  test('Data path at 100% scroll transitions to path-selection', async ({ page }) => {
    await page.evaluate(() => {
      const hero = document.querySelector('.hero');
      if (hero) {
        window.scrollTo(0, hero.offsetHeight * 2);
      }
    });
    await page.waitForTimeout(1500);
    
    // Path selection should be visible
    const pathSelection = page.locator('.path-selection');
    await expect(pathSelection).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Phase 1 Visual QA - Cloud Path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  for (const progress of [0, 10, 25, 50, 75, 90]) {
    test(`Cloud path at ${progress}% scroll`, async ({ page }) => {
      await scrollToProgress(page, progress / 100);
      
      // Capture right canvas (Cloud path)
      await captureCanvasScreenshot(page, 'right', progress);
      
      // Also capture full hero for context
      await captureFullHeroScreenshot(page, 'right', progress);
      
      const frameIndex = await page.evaluate((p) => {
        return { progress: p };
      }, progress / 100);
      
      console.log(`Cloud path ${progress}%:`, frameIndex);
    });
  }
  
  // 100% test - at 100%, hero transitions to path-selection, so canvas is gone
  test('Cloud path at 100% scroll transitions to path-selection', async ({ page }) => {
    await page.evaluate(() => {
      const hero = document.querySelector('.hero');
      if (hero) {
        window.scrollTo(0, hero.offsetHeight * 2);
      }
    });
    await page.waitForTimeout(1500);
    
    // Path selection should be visible
    const pathSelection = page.locator('.path-selection');
    await expect(pathSelection).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Phase 1 Visual QA - Path Selection', () => {
  test('Path selection appears after hero transition', async ({ page }) => {
    // Go directly to path-selection by setting the state
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Use page.evaluate to set the Zustand store directly
    await page.evaluate(() => {
      // This assumes we can access the store - let's trigger via hash instead
      window.location.hash = '#/data-world';
      // Wait a bit then go back to selection
      setTimeout(() => {
        window.location.hash = '';
      }, 100);
    });
    await page.waitForTimeout(2000);
    
    // Now manually trigger the transition by setting hash to selection
    await page.evaluate(() => {
      // Directly update the store if possible, or use hash
      window.location.hash = '';
    });
    await page.waitForTimeout(2000);
    
    // Check if path selection is visible
    const pathSelection = page.locator('.path-selection');
    await expect(pathSelection).toBeVisible({ timeout: 5000 });
    
    // Capture path selection
    await pathSelection.screenshot({
      path: path.join(OUTPUT_DIR, 'path-selection-direct.png')
    });
    
    // Check both cards
    const dataCard = page.locator('.path-card--data');
    const cloudCard = page.locator('.path-card--cloud');
    await expect(dataCard).toBeVisible();
    await expect(cloudCard).toBeVisible();
  });
});

test.describe('Phase 1 Visual QA - Reduced Motion', () => {
  test('Reduced motion shows final state immediately', async ({ page }) => {
    // Emulate reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Should immediately show path selection or final hero state
    // With reduced motion, hero onComplete fires immediately, so path-selection should be visible
    const pathSelection = page.locator('.path-selection');
    await expect(pathSelection).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Phase 1 Visual QA - Responsive', () => {
  for (const viewport of [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 }
  ]) {
    test(`Hero renders correctly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://127.0.0.1:5173');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const hero = page.locator('.hero');
      await expect(hero).toBeVisible();
      
      await hero.screenshot({
        path: path.join(OUTPUT_DIR, `hero-${viewport.name}.png`)
      });
    });
  }
});