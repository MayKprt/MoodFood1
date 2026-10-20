import chromium from "@sparticuz/chromium";
export default async function setup() {
  if (process.platform === "linux" && !process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    await chromium.executablePath();
  }
}
