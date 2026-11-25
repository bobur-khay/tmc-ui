import { devices, type PlaywrightTestConfig } from '@playwright/test';

const isCI = !!process.env.CI;

/** Settings shared by the static (client mode) and server mode end-to-end suites. */
export function createE2eConfig(
  mode: 'static' | 'server',
  baseURL: string,
  webServer: { command: string; env: Record<string, string> },
): PlaywrightTestConfig {
  return {
    testDir: `./${mode}`,
    outputDir: `../../test-results/${mode}`,
    fullyParallel: true,
    forbidOnly: isCI,
    retries: isCI ? 2 : 0,
    reporter: isCI
      ? [
          ['list'],
          ['html', { open: 'never', outputFolder: `../../playwright-report/${mode}` }],
          ['junit', { outputFile: `../../reports/e2e-${mode}-junit.xml` }],
        ]
      : [['list'], ['html', { open: 'never', outputFolder: `../../playwright-report/${mode}` }]],
    use: {
      baseURL,
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
    },
    projects: [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
      { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    ],
    webServer: {
      ...webServer,
      cwd: '../..',
      url: baseURL,
      timeout: 300_000,
      reuseExistingServer: !isCI,
      stdout: 'pipe',
    },
  };
}
