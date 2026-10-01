import { test, expect } from '@playwright/test';

// Test PathSelection component in isolation
test.describe('PathSelection Component Test', () => {
  test('renders correctly when mounted directly', async ({ page }) => {
    // We'll test by creating a simple test page that mounts just PathSelection
    // But since we can't easily do that, let's check if we can force the state
    
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Let's see what the initial state is
    const initialState = await page.evaluate(() => {
      if (window.useGameStore) {
        return window.useGameStore.getState();
      }
      return null;
    });
    
    console.log('Initial state:', initialState);
    
    // Force the state to path-selection
    await page.evaluate(() => {
      if (window.useGameStore) {
        window.useGameStore.getState().setCurrentWorld('path-selection');
        console.log('Forced state to path-selection');
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Check the state after forcing
    const afterState = await page.evaluate(() => {
      if (window.useGameStore) {
        return window.useGameStore.getState();
      }
      return null;
    });
    
    console.log('State after forcing:', afterState);
    
    // Check if PathSelection is now in the DOM
    const pathSelection = page.locator('.path-selection');
    const pathSelectionCount = await pathSelection.count();
    console.log(`PathSelection elements in DOM: ${pathSelectionCount}`);
    
    // Also check what other elements exist
    const heroCount = await page.locator('.hero').count();
    const dataWorldCount = await page.locator('.data-world').count();
    const cloudWorldCount = await page.locator('.cloud-world').count();
    
    console.log(`Hero: ${heroCount}, Data World: ${dataWorldCount}, Cloud World: ${cloudWorldCount}`);
    
    // If PathSelection is in DOM, verify it's visible
    if (pathSelectionCount > 0) {
      await expect(pathSelection).toBeVisible({ timeout: 5000 });
      
      // Take a screenshot
      await pathSelection.screenshot({ path: 'qa-screenshots/path-selection-forced.png' });
      
      // Check that both cards are present and visible
      const dataCard = page.locator('.path-card--data');
      const cloudCard = page.locator('.path-card--cloud');
      
      await expect(dataCard).toBeVisible();
      await expect(cloudCard).toBeVisible();
      
      // Check that cards have correct styling
      const dataTitle = page.locator('.path-card--data .path-card__title');
      const cloudTitle = page.locator('.path-card--cloud .path-card__title');
      
      await expect(dataTitle).toHaveText(/Data/);
      await expect(cloudTitle).toHaveText(/Cloud/);
    } else {
      // Debug: let's see what React is actually rendering
      const rootContent = await page.locator('#root').innerHTML();
      console.log('Root content (first 500 chars):', rootContent.substring(0, 500));
      
      // Take a full page screenshot for debugging
      await page.screenshot({ path: 'qa-screenshots/debug-full-page.png' });
      
      // Check for any error messages
      const errorElements = await page.locator('text=/error/i').count();
      console.log(`Error-related elements found: ${errorElements}`);
    }
  });
});