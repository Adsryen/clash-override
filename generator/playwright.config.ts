import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'dot' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/clash-override/',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npm run build:e2e && npm run preview:e2e -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/clash-override/',
    reuseExistingServer: !process.env.CI,
  },
})
