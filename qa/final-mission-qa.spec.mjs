/**
 * Final mission QA — smoke tests for all routes and new features.
 * Run with: npx playwright test qa/final-mission-qa.spec.mjs --reporter=list
 */

import { test, expect } from '@playwright/test';

const HASH_ROUTES = [
  { hash: '#/data-world', name: 'Data Nexus' },
  { hash: '#/cloud-world', name: 'Cloud World 3D' },
  { hash: '#/cloud-world-iso', name: 'Cloud World ISO' },
  { hash: '#/cloud-world-25d', name: 'Cloud World 2.5D' },
  { hash: '#/cloud-world-v2', name: 'Cloud World V2' },
  { hash: '#/cloud-world-voxel', name: 'Cloud World Voxel' },
  { hash: '#/cloud-world-2', name: 'Cloud World 2.0' },
];

test.describe.configure({ retries: 0 });

test.describe('Final Mission QA', () => {
  test('Hero loads and shows cinematic', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for hero to be visible
    await expect(page.locator('.cinematic-hero')).toBeVisible({ timeout: 10000 });

    // Check hero heading exists (visually hidden h1)
    await expect(page.locator('h1.cinematic-hero__heading')).toContainText('Yash Mahajan');
  });

  test('Experience section renders after hero', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Scroll to trigger Experience section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    await expect(page.locator('#experience')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.experience-title')).toHaveText('EXPERIENCE');
  });

  test('Courses carousel renders after Experience', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Courses carousel should be visible
    await expect(page.locator('.courses-carousel-section')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.courses-title')).toHaveText('COURSES & CERTIFICATIONS');

    // At least one course card
    const courseCount = await page.locator('.course-card').count();
    expect(courseCount).toBeGreaterThan(0);
  });

  test.describe('Hash world routes', () => {
    for (const route of HASH_ROUTES) {
      test(`${route.name} (${route.hash}) loads without console errors`, async ({ page }) => {
        const errors = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') errors.push(msg.text());
        });
        page.on('pageerror', (err) => errors.push(err.message));

        await page.goto(route.hash);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000); // allow Phaser to init

        // Check no critical console errors
        const criticalErrors = errors.filter(e =>
          !e.includes('favicon') &&
          !e.includes('DevTools') &&
          !e.includes('Download the React DevTools')
        );
        expect(criticalErrors).toHaveLength(0);

        // Route-specific checks
        if (route.hash === '#/data-world') {
          // Data Nexus should have Phaser canvas
          await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });
        }
      });
    }
  });

  test('Mobile viewport: hero and courses render', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Hero should render
    await expect(page.locator('.cinematic-hero')).toBeVisible({ timeout: 10000 });

    // Scroll to courses
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    await expect(page.locator('.courses-carousel-section')).toBeVisible({ timeout: 10000 });

    // Touch scroll should work on track
    const track = page.locator('.courses-track');
    await expect(track).toBeVisible();

    // At least one course card
    const courseCount = await page.locator('.course-card').count();
    expect(courseCount).toBeGreaterThan(0);
  });

  test('No console errors on hero page', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('DevTools') &&
      !e.includes('Download the React DevTools') &&
      !e.includes('React DevTools')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});