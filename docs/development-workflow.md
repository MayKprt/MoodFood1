# MoodFood: edit, preview, review, deploy

Use this existing repository, `MayKprt/MoodFood1`, and the existing Vercel project `mood-food1`. Keep its production domain `https://mood-food1.vercel.app`.

## Local review

- Work on `experiment/iphone-mockup` for this homepage change. Nothing here is published until explicitly approved and pushed.
- Run `npm run dev`. Review `/` at desktop and mobile sizes, `/customer` directly, `/iphone-test`, and `/merchant`.
- `/` displays a phone on desktop; narrow screens and phone-sized touch landscape screens use the original Customer component directly. `/customer` always displays the original Customer app. The frame embeds `/customer`, never `/`.
- The phone's button and two supporting lines retain the experimental centered alignment only inside the frame. Customer and Merchant source interfaces remain unchanged.
- Resizing across the mobile breakpoint remounts the interface. Saved local data remains, but transient navigation can reset. This is viewport-based presentation, not iOS emulation.
- Before saving: run `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`. Use fictional data for browser checkout tests. Customer journey tests target `/customer`; showcase tests cover the responsive `/` route, framing policy, and Merchant navigation. On macOS the browser suite uses installed Google Chrome (or the existing executable-path override); Linux retains the bundled Chromium setup. No browser is downloaded by the macOS setup.

## Preview before production

After approval to commit/push a feature branch, push that branch to the existing repository. Vercel's Git integration normally creates a separate Preview deployment. A branch push does not change production when `main` is the configured production branch.

Before the first release, verify in the existing Vercel dashboard:

1. Git repository is `MayKprt/MoodFood1` and production branch is `main`.
2. Root Directory is the repository root; Framework is Next.js; build/install commands are `npm run build` and `npm ci`.
3. Preview deployments are enabled for the feature branch. Review who can access previews through Deployment Protection.
4. The existing production domain is assigned to this project; automatic production domain assignment is enabled.
5. Require successful build/test checks and review before merging to `main`. These protections are recommendations, not settings changed by this local work.

The private Vercel settings were not verified or changed during this local preparation. Verify them before relying on automatic previews or production releases.

## Approved production release

Review the Preview URL, then explicitly approve merging to `main`. The existing Git integration should build that commit and assign the same production domain only after a successful deployment. Verify `/`, `/customer`, and `/merchant` on the live domain before sharing. Do not substitute a new project or domain.

## Rollback

Keep working commits in Git history. In Vercel Deployments, select a known working production deployment and use its rollback action if available for the account. Check domain assignment and future automatic deployment behavior afterward: rollback can pause automatic domain assignment until a later promotion. A reviewed Git revert on `main` is another way to restore code through the normal deployment flow. Neither action is performed without approval.

## Demo and embedding boundaries

Existing public-demo restrictions stay unchanged: Vercel disables real authentication/account sync and external AI calls; payment/delivery are simulated. Merchant state is browser-local and not synchronized with Customer orders. Customer orders use ephemeral instance-local storage on Vercel. Do not enter real customer or merchant data.

Application responses restrict framing to the same origin with CSP `frame-ancestors 'self'; frame-src 'self'` and `X-Frame-Options: SAMEORIGIN`. Other domains, including a different Preview deployment hostname, cannot embed the application. Review later integrations before adding any external frame sources.
