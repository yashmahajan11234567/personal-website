const { chromium } = require('playwright');

async function capture() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => consoleMessages.push(`PAGE ERROR: ${err.message}`));
    
    try {
        await page.goto('http://localhost:5200/cloud-world-preview.html', { waitUntil: 'networkidle', timeout: 60000 });
    } catch (e) {
        try {
            await page.goto('http://127.0.0.1:5200/cloud-world-preview.html', { waitUntil: 'networkidle', timeout: 60000 });
        } catch (e2) {
            console.log('Failed to connect to dev server');
            await browser.close();
            return;
        }
    }
    
    await page.waitForTimeout(5000);
    
    const canvas = await page.$('canvas');
    if (canvas) {
        const bbox = await canvas.boundingBox();
        console.log('Canvas bounding box:', JSON.stringify(bbox));
    } else {
        console.log('No canvas found!');
        const bodyText = await page.innerText('body');
        console.log('Body text:', bodyText.substring(0, 500));
    }
    
    await page.screenshot({ path: 'C:/Users/hitoy/skills_valley_screenshot.png', fullPage: true });
    console.log('Screenshot saved to C:/Users/hitoy/skills_valley_screenshot.png');
    
    const errors = consoleMessages.filter(m => m.startsWith('error:') || m.startsWith('PAGE ERROR:'));
    console.log('Console errors:', JSON.stringify(errors));
    console.log('All console messages:', JSON.stringify(consoleMessages.slice(0, 20)));
    
    await browser.close();
}

capture().catch(console.error);