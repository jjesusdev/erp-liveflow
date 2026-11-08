import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev:fast",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "e2e",
      testMatch: "**/*.e2e.ts",
    },
  ],
});
