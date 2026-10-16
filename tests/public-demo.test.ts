import { afterEach, describe, expect, it, vi } from "vitest";
import path from "node:path";
import { tmpdir } from "node:os";
import { demoOrderDirectory, publicDemo } from "../src/lib/server/demo";

afterEach(() => vi.unstubAllEnvs());
describe("public portfolio deployment boundaries", () => {
  it("forces public demo isolation on Vercel even if an override is false", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("MOODFOOD_PUBLIC_DEMO", "false");
    vi.stubEnv("MOODFOOD_DATA_DIR", "/private-real-orders");
    expect(publicDemo()).toBe(true);
    expect(demoOrderDirectory()).toBe(
      path.join(tmpdir(), "moodfood-portfolio-demo"),
    );
  });
  it("allows an integration-free local rehearsal", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("MOODFOOD_PUBLIC_DEMO", "true");
    expect(publicDemo()).toBe(true);
  });
  it("preserves the local development order directory outside public demo", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("MOODFOOD_PUBLIC_DEMO", "false");
    vi.stubEnv("MOODFOOD_DATA_DIR", "/tmp/local-demo-orders");
    expect(publicDemo()).toBe(false);
    expect(demoOrderDirectory()).toBe("/tmp/local-demo-orders");
  });
});
