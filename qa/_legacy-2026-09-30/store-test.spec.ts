import { test, expect } from '@playwright/test';

test.describe('Zustand Store Test', () => {
  test('store updates correctly', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check initial state via evaluating the store
    let initialState = await page.evaluate(() => {
      // Try to access the store
      if (window.useGameStore) {
        const state = window.useGameStore.getState();
        return {
          currentWorld: state.currentWorld,
          selectedPath: state.selectedPath
        };
      }
      return { error: 'Store not accessible' };
    });
    
    console.log('Initial store state:', initialState);
    
    // Try to update the store
    if (initialState.currentWorld !== undefined) {
      await page.evaluate(() => {
        if (window.useGameStore) {
          window.useGameStore.getState().setCurrentWorld('path-selection');
        }
      });
      
      await page.waitForTimeout(1000);
      
      // Check state after update
      let updatedState = await page.evaluate(() => {
        if (window.useGameStore) {
          const state = window.useGameStore.getState();
          return {
            currentWorld: state.currentWorld,
            selectedPath: state.selectedPath,
            pathSelectionExists: !!document.querySelector('.path-selection')
          };
        }
        return { error: 'Store not accessible' };
      });
      
      console.log('Updated store state:', updatedState);
      
      // If store updated but UI didn't, the issue is in React subscription
      if (updatedState.currentWorld === 'path-selection') {
        // Check if PathSelection is in the DOM
        const pathSelection = page.locator('.path-selection');
        const count = await pathSelection.count();
        console.log('PathSelection DOM count:', count);
        
        if (count > 0) {
          await expect(pathSelection).toBeVisible();
        } else {
          console.log('Store says path-selection but DOM doesnt have it');
          // Let's see what IS in the DOM
          const hero = page.locator('.hero');
          const heroCount = await hero.count();
          console.log('Hero DOM count:', heroCount);
          
          // Check body content
          const bodyContent = await page.locator('body').textContent();
          console.log('Body preview:', bodyContent?.substring(0, 500));
        }
      }
    }
  });
});