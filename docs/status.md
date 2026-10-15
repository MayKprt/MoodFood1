# Implementation status

## Implemented

- Responsive customer web app with immediate guest exploration and a lightweight welcome/sign-in surface.
- Mood and craving selections, optional conversational input, and explainable deterministic recommendations.
- Seven-card discovery with gestures, accessible action buttons, arrow keys, progress, multi-step undo, independent bookmarks, and explicit refresh.
- Eligibility-first ranking, unseen-food priority, variety, explicit allergy/diet filtering, and budget preference.
- Finalists with revealed kitchens, a top-pick explanation, optional non-destructive Food Face-Off, and refinements.
- Detailed sample recipes, declared allergens, verified sample diet labels, options, instructions, fees, and quantity selection.
- One-merchant cart with explicit replace-cart confirmation, item merging, quantity edits, fee/tax breakdown, and manual address input.
- Server-validated, idempotent demo checkout, private order access, persistent order snapshots, and independent simulated kitchen/delivery states.
- Saved dishes and editable preferences, allergies, disliked ingredients, cuisines, spending preference, and privacy-conscious notification defaults.
- Optional Supabase email/password account flow and transactional profile/bookmark/Home-address sync through RLS, with local backup.
- Optional server-side AI preference parsing with validated output and keyword fallback.
- Normalized PostgreSQL migrations, regenerated sample seed, RLS, event deduplication constraints, and future merchant stock reservation.
- Automated domain, server, PostgreSQL/RLS, desktop/mobile journey, keyboard, overflow, and Discover accessibility tests.
- Original generated food imagery, bundled fonts, reduced motion, focus management, dialog semantics, helpful empty/error/loading states, and integration documentation.

## Simulated

All merchants, recipes, availability, delivery ZIP coverage, prices, fees, taxes, payment authorization, orders, kitchen events, and courier events. Original generated food imagery is illustrative, not an authoritative ingredient list. Sample recipe verification is fictional and provides no real allergy guarantee.

## Deferred or needing live configuration

- Merchant UI, menu ingestion, real availability schedules, actual merchant verification, real inventory consumption/release, and merchant notifications.
- Stripe processing, delivery-provider dispatch, live maps, real couriers, refunds, live customer support, push/email notifications.
- Hosted Supabase and AI provider validation, since credentials are optional and were not supplied. Supabase migrations/RLS are validated locally with PostgreSQL.
- Automatic token refresh, password recovery, OAuth, multi-address management, and guest-to-account data merge.
- Production transactional order adapter, distributed rate limits, transactional outbox, production deployment/hardening, observability, retention/deletion policy, and multi-instance concurrency.
- Full semantic natural-language understanding without an AI provider. Keyword fallback intentionally handles only supported terms; allergy preferences should always be entered explicitly in Profile.

The application is a functional customer MVP in demo mode, not a live marketplace. Production integrations should be implemented and validated before real orders are enabled.
