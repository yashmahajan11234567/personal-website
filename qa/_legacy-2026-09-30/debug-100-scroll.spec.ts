import { test, expect } from '@playwright/test';

test.describe('Debug 100% Scroll Transition', () => {
  test('logs DOM state at 100% scroll', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Scroll to trigger 100% (past the hero)
    await page.evaluate(() => {
      const hero = document.querySelector('.hero');
      if (hero) {
        console.log('Hero height:', hero.offsetHeight);
        window.scrollTo(0, hero.offsetHeight * 2);
      }
    });
    await page.waitForTimeout(2000);
    
    // Check what's in the DOM
    const domState = await page.evaluate(() => {
      return {
        hero: !!document.querySelector('.hero'),
        pathSelection: !!document.querySelector('.path-selection'),
        dataWorld: !!document.querySelector('.data-world'),
        cloudWorld: !!document.querySelector('.cloud-world'),
        heroCount: document.querySelectorAll('.hero').length,
        pathSelectionCount: document.querySelectorAll('.path-selection').length,
        bodyHTML: document.body.innerHTML.substring(0, 2000)
      };
    });
    
    console.log('DOM state after scroll:', domState);
    
    // Take a screenshot
    await page.screenshot({ path: 'qa-screenshots/debug-100-scroll.png' });
    
    // Log any React errors
    const errors = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .map(el => el.getAttribute('data-reactroot') || el.getAttribute('data-reactid'))
        .filter(Boolean);
    });
    console.log('React root elements:', errors);
  });
});