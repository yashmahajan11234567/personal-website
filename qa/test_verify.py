#!/usr/bin/env python3
"""Visual verification: compare with and without post-processing"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'node_modules'))

try:
    from playwright.async_api import async_playwright
    from png import PNG
    import png
    import io
    print("Dependencies available")
except ImportError as e:
    print(f"Missing dependencies: {e}")
    sys.exit(1)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=['--enable-webgl2', '--use-gl=angle', '--ignore-gpu-blocklist']
        )
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})

        console_logs = []
        def handle_console(msg):
            log = {'type': msg.type, 'text': msg.text}
            console_logs.append(log)
            print(f"  [{log['type']}] {log['text']}")
        page.on('console', handle_console)
        page.on('pageerror', lambda err: print(f"  [error] {err}"))

        # Navigate to cloud-world
        print("\n=== Navigating to Cloud World ===")
        await page.goto('http://localhost:5173/#/cloud-world')
        await page.wait_for_timeout(3000)
        await page.wait_for_timeout(5000)

        print('\n=== Step 1: Capture WITH post-processing ===')
        await page.screenshot(path='qa-screenshots/pp-enabled.png', full_page=True)
        print('Screenshot saved: pp-enabled.png')

        await page.screenshot(path='qa-screenshots/current-with-effects.png', full_page=True)
        print('Captured current state with effects')

        # Now do pixel comparison with baseline
        from png import PNG
        import png

        def compare_images(baseline_path, current_path, label):
            print(f'\n=== {label} ===')
            
            # Load baseline
            with open(baseline_path, 'rb') as f:
                baseline_reader = png.Reader(file=f)
                baseline_w, baseline_h, baseline_pixels, _ = baseline_reader.read()
                baseline_data = list(baseline_pixels)
                # Flatten
                baseline_flat = []
                for row in baseline_data:
                    baseline_flat.extend(row)

            # Load current
            with open(current_path, 'rb') as f:
                current_reader = png.Reader(file=f)
                current_w, current_h, current_pixels, _ = current_reader.read()
                current_data = list(current_pixels)
                current_flat = []
                for row in current_data:
                    current_flat.extend(row)

            if baseline_w != current_w or baseline_h != current_h:
                print(f"  Size mismatch: baseline {baseline_w}x{baseline_h} vs current {current_w}x{current_h}")
                return

            pixel_diff = 0
            max_diff = 0
            total = baseline_w * baseline_h
            
            for y in range(baseline_h):
                for x in range(baseline_w):
                    idx = (y * baseline_w + x) * 4
                    r1 = baseline_flat[idx]
                    g1 = baseline_flat[idx + 1]
                    b1 = baseline_flat[idx + 2]
                    a1 = baseline_flat[idx + 3]
                    
                    idx2 = (y * current_w + x) * 4
                    r2 = current_flat[idx2]
                    g2 = current_flat[idx2 + 1]
                    b2 = current_flat[idx2 + 2]
                    a2 = current_flat[idx2 + 3]
                    
                    dr = abs(r1 - r2)
                    dg = abs(g1 - g2)
                    db = abs(b1 - b2)
                    da = abs(a1 - a2)
                    
                    max_channel = max(dr, dg, db, da)
                    if max_channel > 2:
                        pixel_diff += 1
                    max_diff = max(max_diff, max_channel)

            diff_pct = (pixel_diff / total) * 100
            print(f'\n=== {label} ===')
            print(f'  Different: {pixel_diff > 0}')
            print(f'  Pixel diffs: {pixel_diff} / {total} ({diff_pct:.4f}%)')
            print(f'  Max channel diff: {max_diff}/255')
            if pixel_diff > 0:
                print('  >>> EFFECTS ARE VISIBLE! <<<')
            else:
                print('  >>> NO VISUAL DIFFERENCE - Effects not rendering <<<')

        print('\n=== Step 1: Capture current state with effects ===')
        # We need to capture the current state first
        from playwright.async_api import async_playwright
        # We already have the page, just take screenshot
        await page.screenshot(path='qa-screenshots/current-with-effects.png', full_page=True)
        print('Captured current state with effects')

        print('\n=== Comparing current (with effects) vs baseline (no effects) ===')
        compare_images(
            'qa-screenshots-baseline/beat-00-open.png',
            'qa-screenshots/current-with-effects.png',
            'beat-00-open: baseline vs current (with effects)'
        )

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
