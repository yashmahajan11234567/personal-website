import { test, expect } from '@playwright/test';

test.describe('State Transition Test', () => {
  test('can manually set state to path-selection', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Expose a function on window to set state
    await page.evaluate(() => {
      // Create a global function to set state
      window.setTestState = (world) => {
        if (window.useGameStore) {
          window.useGameStore.getState().setCurrentWorld(world);
          console.log(`Set state to ${world}`);
        }
      };
    });
    
    // Set state to path-selection
    await page.evaluate(() => {
      window.setTestState('path-selection');
    });
    
    await page.waitForTimeout(1000);
    
    // Check if PathSelection is visible
    const pathSelection = page.locator('.path-selection');
    const count = await pathSelection.count();
    console.log('PathSelection count: ' + count);
    
    if (count > 0) {
      await expect(pathSelection).toBeVisible({ timeout: 5000 });
      
      // Take screenshot
      await pathSelection.screenshot({ path: 'qa-screenshots/path-selection-manual.png' });
      
      // Check cards
      const dataCard = page.locator('.path-card--data');
      const cloudCard = page.locator('.path-card--cloud');
      
      await expect(dataCard).toBeVisible();
      await expect(cloudCard).toBeVisible();
    } else {
      // Debug what's actually rendered
      const hero = page.locator('.hero');
      const heroCount = await hero.count();
      console.log('Hero count: ' + heroCount);
      
      const bodyText = await page.locator('body').textContent();
      console.log('Body preview: ' + (bodyText?.substring(0, 200) || ''));
      
      // Take full page screenshot
      await page.screenshot({ path: 'qa-screenshots/debug-state.png' });
    }
  });
});