import { defineConfig, devices } from '@playwright/test';

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
    baseURL: 'http://localhost:5173',
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
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
