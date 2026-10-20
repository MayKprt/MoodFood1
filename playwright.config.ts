import { defineConfig } from "@playwright/test";
import chromium from "@sparticuz/chromium";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    launchOptions: process.platform === "darwin" ? {
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
        : { channel: "chrome" }),
    } : {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/tmp/chromium",
      args: chromium.args.filter(
        (arg) =>
          ![
            "--single-process",
            "--disable-web-security",
            "--allow-running-insecure-content",
            "--disable-site-isolation-trials",
          ].includes(arg) && !arg.startsWith("--disable-features="),
      ),
      headless: true,
      env: { ...process.env, XDG_CACHE_HOME: "/tmp/moodfood-browser-cache" },
    },
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  globalSetup: "./tests/e2e/setup.ts",
  webServer: {
    command: `"${process.execPath}" node_modules/next/dist/bin/next dev --hostname 0.0.0.0 --port 3000`,
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
  expect: { timeout: 10000 },
});
