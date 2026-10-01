import { test, expect } from '@playwright/test';

test.describe('PathSelection Component Isolation Test', () => {
  test('renders correctly when mounted directly', async ({ page }) => {
    // Test by navigating to a route that should show PathSelection
    // We'll simulate being in path-selection state by manipulating the app
    
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Let's check what's actually rendered
    const hero = page.locator('.hero');
    const pathSelection = page.locator('.path-selection');
    
    console.log('Hero exists:', await hero.count() > 0);
    console.log('PathSelection exists:', await pathSelection.count() > 0);
    
    // Take a screenshot of the whole page for debugging
    await page.screenshot({ path: 'qa-screenshots/full-page.png' });
    
    // If we're on hero, let's see if we can force path-selection
    if (await hero.count() > 0) {
      // Try to trigger the transition by scrolling
      await page.evaluate(() => {
        const hero = document.querySelector('.hero');
        if (hero) {
          // Scroll to trigger the onLeave
          window.scrollTo(0, hero.offsetHeight * 2);
        }
      });
      await page.waitForTimeout(2000);
    }
    
    // Check again
    const heroAfter = page.locator('.hero');
    const pathSelectionAfter = page.locator('.path-selection');
    
    console.log('After scroll - Hero exists:', await heroAfter.count() > 0);
    console.log('After scroll - PathSelection exists:', await pathSelectionAfter.count() > 0);
    
    // If path selection is visible, take screenshot
    if (await pathSelectionAfter.count() > 0) {
      await pathSelectionAfter.screenshot({ path: 'qa-screenshots/path-selection-after-scroll.png' });
      
      // Check cards
      const dataCard = page.locator('.path-card--data');
      const cloudCard = page.locator('.path-card--cloud');
      
      console.log('Data card visible:', await dataCard.isVisible());
      console.log('Cloud card visible:', await cloudCard.isVisible());
      
      await expect(dataCard).toBeVisible();
      await expect(cloudCard).toBeVisible();
    } else {
      // Let's see what IS visible
      const bodyText = await page.locator('body').textContent();
      console.log('Body text preview:', bodyText?.substring(0, 200));
      
      // Check for any error messages
      const errorElements = page.locator('[style*="color: red"], .error, [role="alert"]');
      if (await errorElements.count() > 0) {
        const errorText = await errorElements.first().textContent();
        console.log('Error found:', errorText);
      }
    }
  });
});