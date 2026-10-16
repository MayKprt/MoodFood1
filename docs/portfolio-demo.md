# MoodFood portfolio demo

## What visitors can try

Customer (`/`, mobile first): choose a mood or craving, discover dishes, like or skip, undo, bookmark, compare finalists, review a dish, configure a cart, and place a clearly simulated order. Use a fictional Brooklyn address in a supported ZIP. No payment is collected and no meal is delivered.

Merchant (`/merchant`, tablet first): the preferred original dashboard with three Quick Actions (Update Availability, Add a Dish, View Orders) and orange Ask MoodAI floating button. Visitors can explore sample orders, menu editing, stock checks, availability, Open/Busy/Paused, saved preferences, sound testing, and guided setup. Changes are saved in that visitor's browser.

The Merchant interface is a public sandbox, not an administration console. It has no live merchant write API, business credentials, customer addresses or real order feed. The two interfaces illustrate complementary roles; customer demo orders are not synchronized to the sample Merchant order queue.

## Demo boundaries

On Vercel, public demo mode is enforced by the platform's VERCEL=1 marker. Local rehearsals can use MOODFOOD_PUBLIC_DEMO=true. In this mode:

- Supabase authentication and account synchronization are disabled, even if unrelated integration credentials exist in project environment settings.
- Customer language interpretation uses the existing labeled keyword fallback, with no external model calls. Ask MoodAI is a guided local helper, not a connected LLM.
- Customer demo orders use the writable OS temporary directory. Order history is ephemeral and instance-local: it can reset, and requests reaching another instance may show no previous orders. This is deliberately unsuitable for real orders.
- Guest order queries remain scoped to an opaque, HTTP-only guest cookie. Deployed cookies use Secure on Vercel.
- Merchant data remains browser-local and separate from customer server data.
- No private local environment files, backup archives, generated build files, or test artifacts are included in the release.

Future integrations: transactional persistent order storage, merchant authentication/authorization, live catalog ingestion, transactional inventory/Smart Accept workers, real AI orchestration, payment webhooks, delivery-provider callbacks, notification dispatch, and verified dietary/allergen claims. Existing schema/RLS and adapter work provide an architectural starting point; they are not claims of a production service.

## Safe release sequence

1. Compare the isolated candidate to GitHub main and preserve current local source and backups.
2. Review the file inventory, source diff, test results, build results and public-demo behavior.
3. Obtain explicit approval before creating a remote commit, pushing a branch, triggering a Git-connected deployment or publishing on Vercel.
4. Use the existing MayKprt/MoodFood1 repository and mood-food1 Vercel project; verify its team, repository link, production branch, root directory, Node version, deployment protection and actual production domain. Never substitute another project.
5. Publish only the reviewed source. GitHub pushes may trigger Vercel automatically, so treat the first push as a potential publication step.
6. Verify `/` and `/merchant` from the production domain using an unauthenticated browser/request with no Vercel share token or account cookie. Check customer at 390 × 844 and Merchant at 820 × 1180. Verify guest session and a fictional demo checkout; confirm no real integration is enabled.
7. Share the two verified production URLs only after those checks pass. Project naming alone does not establish a shareable domain.

`vercel.json` keeps deployment logs/source private (`public: false`); it does not configure whether visitors can access the website. Production deployment protection must be checked separately.

## Suggested presentation

“MoodFood is a food discovery and restaurant operations concept. The mobile customer experience turns moods and cravings into a small set of useful choices, while the tablet Merchant dashboard makes menu availability and order handling approachable. This interactive portfolio demo uses fictional restaurants and simulated orders; it demonstrates the product experience and architecture rather than a live food-delivery business.”
