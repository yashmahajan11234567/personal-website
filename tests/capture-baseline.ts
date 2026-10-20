import { test, expect } from '@playwright/test';

test('Capture Cloud World baseline screenshot', async ({ page }) => {
  // Navigate to the dev server
  await page.goto('http://localhost:5173');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Check if we need to navigate to Cloud World
  // The Cloud World might be accessed via a specific route or button
  // Let's try to find and click a Cloud World entry point
  const cloudWorldButton = page.locator('text=Cloud World, [href*="cloud-world"], button:has-text("Cloud World")').first();
  
  if (await cloudWorldButton.isVisible({ timeout: 2000 })) {
    await cloudWorldButton.click();
    await page.waitForTimeout(2000);
  }
  
  // Wait for canvas to appear
  await page.waitForSelector('canvas', { timeout: 10000 });
  
  // Wait for scene to settle
  await page.waitForTimeout(3000);
  
  // Capture screenshot at 1440x900
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);
  
  await page.screenshot({ 
    path: 'tests/screenshots/cloud-world-baseline.png',
    fullPage: true 
  });
  
  console.log('Baseline screenshot captured');
});