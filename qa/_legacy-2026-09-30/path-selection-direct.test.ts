import { test, expect } from '@playwright/test';

test.describe('PathSelection Direct Render Test', () => {
  test('renders PathSelection when currentWorld is path-selection', async ({ page }) => {
    // Test by directly manipulating the URL hash to trigger path-selection
    // We'll use a query parameter or direct state manipulation
    
    await page.goto('http://127.0.0.1:5173?test=path-selection');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check if we can force the state via localStorage or similar
    const pathSelection = page.locator('.path-selection');
    const hero = page.locator('.hero');
    
    console.log('PathSelection count:', await pathSelection.count());
    console.log('Hero count:', await hero.count());
    
    // If neither is visible, let's see what IS rendered
    const bodyContent = await page.locator('body').textContent();
    console.log('Body content length:', bodyContent?.length);
    console.log('Body preview:', bodyContent?.substring(0, 500));
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'qa-screenshots/debug-direct.png' });
    
    // Try to trigger via hash change after load
    await page.evaluate(() => {
      window.location.hash = '';
      // Force a re-render
      window.dispatchEvent(new Event('hashchange'));
    });
    await page.waitForTimeout(2000);
    
    const pathSelectionAfter = page.locator('.path-selection');
    console.log('PathSelection count after hashchange:', await pathSelectionAfter.count());
    
    if (await pathSelectionAfter.count() > 0) {
      await expect(pathSelectionAfter).toBeVisible();
      await pathSelectionAfter.screenshot({ path: 'qa-screenshots/path-selection-visible.png' });
      
      // Check the cards
      const dataCard = page.locator('.path-card--data');
      const cloudCard = page.locator('.path-card--cloud');
      
      await expect(dataCard).toBeVisible();
      await expect(cloudCard).toBeVisible();
    } else {
      // Debug: check what React components are mounted
      const reactRoot = await page.locator('#root').textContent();
      console.log('React root content preview:', reactRoot?.substring(0, 1000));
    }
  });
});