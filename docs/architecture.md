# Architecture

## Customer application

Next.js App Router and strict TypeScript provide the shell and server APIs. Locally bundled DM Sans and DM Serif Display, custom responsive CSS, Lucide icons, and Radix Dialog provide a cohesive design system with focus trapping, keyboard dismissal, reduced-motion support, visible focus, and touch-friendly navigation. Custom CSS keeps the small application independent of a utility framework.

`components/moodfood-app.tsx` connects the shared session state to Discover, the swipe deck, shortlist, Face-Off, details, Saved, cart, Orders, and Profile. `lib/use-moodfood.ts` owns customer state and isolates browser persistence by principal. Guest entry is immediately available on Discover; sign-in is optional. Gesture handling uses horizontal displacement thresholds and `touch-action: pan-y`; explicit buttons and keyboard actions provide equivalents.

## Domain and recommendations

- `domain.ts`: typed food, cart, order, profile, deck state, undo, and pure Face-Off transitions.
- `data.ts`: fictional merchant catalog, verified sample recipe information, modifiers, delivery ZIPs, and seed data.
- `recommendations.ts`: eligibility first, then deterministic explainable scoring and deck diversity. Allergy restrictions, verified diet labels, availability, delivery area, and price limits filter candidates before ranking. Moods are a user-selected session signal; they are never stored as universal merchant facts. Prior session decisions inform later decks. Skips are session feedback, not permanent dislikes.
- `cart.ts`: single-kitchen enforcement, bounded quantities, allowed options, monetary totals, and authoritative checkout validation. Budget preferences affect discovery; checkout validates safety and availability without treating budget as a medical constraint.
- `server/ai.ts`: optional server-only natural-language adapter with schema validation, timeout, and honest keyword fallback. No external interpretation call is made unless configured. Never use generated ingredient/allergen/pricing facts.

Decks contain up to seven eligible dishes. With at least seven unseen eligible dishes, refresh avoids immediate duplicates; a constrained catalog produces a smaller deck and an explanation. Undo uses decision history, removes the reverted like/skip, and leaves bookmarks unchanged. Face-Off works on a copy of liked IDs. The original shortlist is preserved.

## HTTP APIs and identity

- `GET /api/session`: initializes a random 256-bit guest session cookie or verifies the Supabase bearer session server-side.
- `POST /api/auth`: configured Supabase email/password sign-in, sign-up, or sign-out. Auth tokens are HTTP-only and SameSite=Lax. Expired sessions ask for sign-in again.
- `GET/PUT /api/customer`: authenticated profile/address/bookmark synchronization. The client-supplied expected principal must match the verified session. The write uses one `SECURITY INVOKER` PostgreSQL RPC so RLS remains active.
- `POST /api/recommendations`: structured text interpretation. Without AI credentials, local keyword extraction is used.
- `GET/POST /api/orders`: lists only the verified principal's orders or creates an idempotent simulated order after validating quantities, menu, modifiers, restaurant, ZIP, price acceptance, and allergen acknowledgment.

Mutation endpoints reject mismatched Origin hosts. Request bodies use Zod. Customers cannot choose an order owner. Opaque guest cookies are never used as raw credentials outside the same app. Supabase auth and private-data requests use the existing anon key with the authenticated user's bearer token, never a service role in the browser. Same-origin deployment is assumed.

## Ordering, payments, and delivery

`server/orders.ts` is a **single Node-process demo repository** using a serialized mutation queue and atomic file rename. Owner-scoped idempotency keys include a canonical server request fingerprint; repeated requests return the same order, and reuse with changed details is rejected. Orders snapshot names, options, unit prices, ingredients, allergens, address, and totals at creation.

`payments.ts` defines the provider boundary and a demo provider that takes no card data and never charges. A future Stripe provider must authorize verified totals and map trusted webhooks to payment state.

`delivery.ts` keeps kitchen preparation independent from courier state. The demo provider derives accelerated statuses from order creation time, so it works after a restart. Attention, cancellation, failed delivery, and pending-support states are modeled. No real courier or real-time location data is presented.

The filesystem repository is not suitable for multiple workers, serverless instances, or real transactions. Production must use database transactions, idempotency constraints, inventory reservation, and a payment/outbox workflow. Supabase authentication does not change the demo nature or persistence adapter of orders.

## PostgreSQL and authorization

`001_moodfood.sql` normalizes profiles, addresses, merchants, schedules, dishes, attributes, ingredients, allergens, verified diets, images, options, availability, inventory, discovery sessions/cards/actions, bookmarks, carts/items, orders/items/events, delivery requests/events, feedback, and reservations.

All application tables have RLS enabled. Public catalog reads expose customer-facing data; unverified AI attributes and merchant/internal stock tables have no customer read access. Private data uses `auth.uid()` ownership. Child policies follow parent ownership. Order and financial writes have no customer mutation grants. Only trusted server workers can reserve inventory. `002_customer_state.sql` adds transactional account preference synchronization.

Supabase migrations are tested under PostgreSQL using PGlite and Supabase-compatible test roles, including negative authorization checks. Hosted Supabase configuration, real auth emails, remote policies, and provider APIs still require integration validation with real configuration.

## Privacy and known boundaries

Demo guests keep preferences and saved dishes locally, and their order session is tied to an HTTP-only browser cookie. Clearing site storage/cookies can sever guest order access. Accounts can synchronize profile data to Supabase after applying the migrations. No telemetry, location prompts, payment collection, or external photo loading is enabled. Stored addresses should be fictional for the demo. The support action explains that no live support team is connected.
