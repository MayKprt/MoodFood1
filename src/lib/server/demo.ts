import path from "node:path";
import { tmpdir } from "node:os";

// This portfolio deployment must never connect visitors to real accounts or data.
// Local integration development retains its existing behavior.
export function publicDemo() {
  return (
    process.env.VERCEL === "1" || process.env.MOODFOOD_PUBLIC_DEMO === "true"
  );
}
export function demoOrderDirectory() {
  if (publicDemo()) return path.join(tmpdir(), "moodfood-portfolio-demo");
  return process.env.MOODFOOD_DATA_DIR || path.join(process.cwd(), ".data");
}
