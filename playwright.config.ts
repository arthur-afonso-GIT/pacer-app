import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  ...(process.env.CI ? { workers: 1 } : {}),
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'on-first-retry' },
  projects: [
    { name: 'iPhone', use: { ...devices['iPhone 13'] } },
    { name: 'Android', use: { ...devices['Pixel 7'] } },
    { name: 'Desktop', use: { ...devices['Desktop Chrome'] } },
  ],
})
