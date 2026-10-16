# MoodFood

A mobile-first food discovery and demo ordering app. Start with a mood, a craving, or **Just feed me**. Explore seven dishes, shortlist your favorites, optionally play Food Face-Off, and place a clearly simulated order.

## Run locally

Requires Node.js **22.13+** (Node 24 recommended) and npm. No credentials or external services are required for demo mode.

```sh
npm ci
npm run dev
```

The application uses port 3000. For an optimized build:

```sh
npm run build
npm start
```

Use an existing checkout. Cloud tasks are already isolated; creating another worktree is unnecessary.

## Try the complete journey

1. Tap **Just feed me**, or select moods/cravings and **Find my seven**.
2. Heart or skip the dishes. Undo reverses previous decisions. Bookmarking is independent.
3. After the deck, see your finalists and an explained top pick. Food Face-Off is optional.
4. Open a dish, review ingredients, allergens, options, and fees, and add it to the cart.
5. Enter a **fictional Brooklyn address** in ZIP 11201, 11205, 11217, or 11231.
6. Review the final total and sample allergen notice. Place a **demo order**.
7. Visit Orders. Simulated preparation and delivery complete in roughly two minutes. No food is delivered and no payment is taken.

The sample menu has 16 dishes across four fictional kitchens. Dietary restrictions and budgets may leave fewer than seven eligible dishes; constraints are never relaxed to fill a deck. Once the unseen eligible pool is exhausted, dishes can repeat. Profile preferences and saved dishes persist in the browser. Demo orders persist in `.data/orders.json` and belong to the current opaque guest session or verified account.

## Validation

```sh
npm run typecheck
npm test
npm run test:e2e
```

`npm test` covers recommendation eligibility, deck progression, undo, cart validation, order idempotency, privacy, actual PostgreSQL RLS, and stock reservation. The database tests run PostgreSQL through PGlite without a separate database service.

Playwright runs the discovery-to-demo-order journey on desktop and mobile, checks bookmark persistence, private guest sessions, keyboard dialog behavior, horizontal overflow, and WCAG A/AA accessibility on Discover. The included `@sparticuz/chromium` package supplies Linux Chromium through npm, so a separate browser download is unnecessary. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a compatible local Chromium executable on other platforms. The tests can start the development server automatically; an existing server on port 3000 is reused unless `CI` is set.

## Optional integrations

Copy `.env.example` to `.env.local` and fill only the integrations you want. Do not commit credentials.

- **Supabase**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`. Apply `supabase/migrations/001_moodfood.sql`, then `002_customer_state.sql`, followed by `supabase/seed.sql` in your Supabase project's SQL editor or migration workflow. Configure email/password auth and confirmation settings in Supabase. Sign-in uses HTTP-only cookies. Signed-in preferences, bookmarks, and the Home address synchronize through RLS-protected database calls, with a local browser backup. Sessions expire with the access token; sign out and sign in again when prompted. Password recovery and automatic token refresh are deferred.
- **AI**: `AI_API_KEY` and optional `AI_MODEL`. Food text is interpreted server-side through an OpenAI adapter. Without credentials or on failure, explicit local keyword rules handle supported flavors, cuisines, budgets, and exclusions. This fallback is labeled in the UI and does not pretend to be AI. Structured extraction is never a source of merchant facts or a substitute for explicit allergy preferences.
- **HTTPS deployment**: set `DEPLOYMENT_HTTPS=true` to use Secure authentication cookies.
- **Order storage**: `MOODFOOD_DATA_DIR` can change the single-process demo store location. The directory must be writable and persistent if order retention is needed.

Supabase and AI integrations are optional and require live credentials to validate. Real merchant ingestion, delivery, and Stripe payment processing are deferred. Production deployment requires replacing the filesystem order store with a transactional database repository. See [architecture](docs/architecture.md), [merchant integration](docs/merchant-integration.md), and [implementation status](docs/status.md).

## Data and image provenance

`src/lib/data.ts` is the authoritative fictional development catalog. `npm run db:seed:generate` regenerates the idempotent PostgreSQL seed from that catalog. Monetary values use integer USD cents. Menu images are original AI-generated editorial food illustrations commissioned for this demo, stored locally in `public/food-editorial.png`; no external photo hotlinks are used. Images are illustrative and cannot establish ingredients or allergen safety. Fonts are bundled locally through Fontsource.
