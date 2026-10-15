const { defineConfig } = require('@playwright/test');

const PWA_URL = process.env.PWA_URL || 'http://localhost:8081';

module.exports = defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.js/,
  timeout: 90000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: PWA_URL,
    // Teléfono: la PWA es una app móvil.
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node e2e/serve.js',
    url: PWA_URL,
    reuseExistingServer: true,
    env: { PORT: new URL(PWA_URL).port || '8081' },
  },
});
