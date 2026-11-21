import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("console", msg => console.log("CONSOLE:", msg.text()));
  page.on("pageerror", err => console.log("PAGE ERROR:", err.message));
  const response = await page.goto("http://127.0.0.1:4173/#/activity-tower", { waitUntil: "networkidle", timeout: 30000 });
  console.log("Response status:", response?.status());
  await page.waitForTimeout(5000);
  
  const html = await page.content();
  console.log("HTML length:", html.length);
  
  const canvasCount = await page.locator("canvas").count();
  console.log("Canvas count:", canvasCount);
  
  const errorCount = await page.locator("text=Could not load").count();
  console.log("Error text count:", errorCount);
  
  const towerCount = await page.locator(".tower-container").count();
  console.log("Tower container count:", towerCount);
  
  const loadingCount = await page.locator(".tower-loading").count();
  console.log("Loading fallback count:", loadingCount);
  
  const rootHtml = await page.locator("#root").innerHTML();
  console.log("Root HTML length:", rootHtml.length);
  console.log("Root HTML (first 3000):", rootHtml.slice(0, 3000));
  
  await page.screenshot({ path: '../tower-debug.png', fullPage: true });
  await browser.close();
})();