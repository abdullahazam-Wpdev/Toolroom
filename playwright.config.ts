import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  workers: 2, // Match the server’s intentional two-image concurrency cap.
  use: {
    baseURL: "http://localhost:3000",
    ...devices["Desktop Chrome"],
    launchOptions: { args: ["--no-sandbox"] },
  },
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
  reporter: "list",
});
