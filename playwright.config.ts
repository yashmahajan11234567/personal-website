import { defineConfig, devices } from '@playwright/test';

/*
 * Dedicated QA port, separate from the developer port (5173).
 *
 * QA used to run against `http://localhost:5173` with `reuseExistingServer:
 * true`. That combination is unsafe on a machine that also runs another copy
 * of this app: if anything else already owns 5173, Playwright silently tests
 * THAT server instead of this repository. It happened here — a stale Vite
 * server for the older `D:\Yash\portfolio_website` copy held 5173 on the IPv6
 * loopback only, so IPv4 probes reported the port free, and 31 Phase 1 tests
 * failed against an app that had no Phaser in it at all.
 *
 * Two changes make that class of mistake impossible rather than unlikely:
 *
 *   1. QA binds its own port (5174), so a developer's `npm run dev` on 5173
 *      never collides with a test run, and vice versa.
 *   2. `reuseExistingServer: false`. Playwright must start this repository's
 *      own dev server and fail loudly if it cannot, instead of adopting a
 *      stranger's server. With the port dedicated, the only thing that can
 *      occupy it is a previous run of this same suite.
 *
 * Nothing about production behaviour, the hero, gameplay, or the content
 * model changes: this file only decides which dev server the tests talk to.
 */
const TEST_PORT = 5174;
const TEST_ORIGIN = `http://localhost:${TEST_PORT}`;

export default defineConfig({
  testDir: './qa/phase1',
  outputDir: './test-results',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  /*
   * `trace: 'off'` rather than 'retain-on-failure'.
   *
   * With traces on, Playwright streams each test's recording into
   * test-results/.playwright-artifacts-N/ and only copies it into the test's own
   * folder if that test FAILS. A full-suite run on a loaded machine left
   * artifacts from already-finished tests sitting in a directory that was then
   * cleaned up underneath the still-running tests, so six tests failed on
   * teardown errors rather than on anything they asserted:
   *
   *   Error: browserContext.close: ENOENT ... traces/...-recording4.trace
   *   Error: apiRequestContext ... copyfile ... -pwnetcopy-1.network
   *   Error: End of central directory record signature not found (truncated zip)
   *
   * None of those tests failed their assertions -- the assertion failures in
   * that run were two real test bugs, fixed separately. Tracing costs a large
   * amount of disk and time per test for no benefit on a suite this size; the
   * failure screenshot is what gets looked at.
   */
  use: {
    // Vite binds to localhost only; 127.0.0.1 is not served.
    baseURL: TEST_ORIGIN,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${TEST_PORT} --strictPort`,
    url: TEST_ORIGIN,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
