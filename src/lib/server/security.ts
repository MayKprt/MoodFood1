// Next.js may normalize request.url to localhost behind a proxy. The incoming
// Host header is the browser-facing authority for this same-origin check.
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const parsed = new URL(origin);
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.host !== host) {
    throw new Error("This request must come from MoodFood.");
  }
}
