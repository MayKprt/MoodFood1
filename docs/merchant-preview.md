# MoodFood Merchant preview

The existing `/merchant` route is a tablet-first local demo. The customer app, customer APIs, schema, authentication and delivery interfaces are unchanged.

## Simplified interface

- Home: original greeting and Open/Busy/Paused control, Needs Attention, three Quick Actions (Update Availability, Add a Dish, View Orders), and three daily counts. Insights remains secondary. The duplicate AI tile and sidebar entry are removed; the orange Ask MoodAI FAB opens the same assistant.
- Orders: Needs Attention / In Progress / Completed, readable stock issues, one primary action, and collapsed Delivery Details. Cancelling a new order asks for confirmation.
- Menu: dish photos, one-tap availability, and an editor. Quantity, device-local daily availability times, extras, and food notes are under More options.
- Ask MoodAI: the persistent labeled floating button is the sole assistant entry point. It opens the same panel with guided local answers for common tasks. Availability changes show a preview and require confirmation. This is a deterministic demo helper, not a connected model.
- Settings: restaurant details and alert preferences; sound, volume and mute controls expand separately. Test Sound uses the browser audio API.
- Setup: four short steps, CSV import (name,price), manual dish creation, and saved progress. Resume through Settings.

## Data and limits

The original `moodfood-merchant-preview` browser storage key is retained. Old dishes, prices, order snapshots and restaurant details are migrated with defaults for the new optional fields. Failed reads do not overwrite saved data. Customer storage is separate.

Demo order acceptance checks current dish availability, schedules and optional quantity before changing any stock. It aggregates duplicate order lines and avoids reserving stock twice. Renaming a dish preserves previous names for existing order snapshots. Busy Mode adds the saved extra preparation time to new demo acceptances (ten minutes by default). These checks are local and cannot provide production transaction guarantees.

The repository did not contain a live merchant backend, merchant authorization, Smart Accept worker, delivery provider connection, real notification dispatch or merchant AI service. This UI does not claim to implement those production services. No customer endpoints are used to give the demo merchant write access. Follow `merchant-integration.md` before connecting real merchants and orders.

Menu photos are generated demo assets. Imported dishes default to the preview's photo choices; ingredients and allergen notes require human verification. No automatic dietary claims are published.

## Validation

TypeScript checks and 28 tests pass, including the original customer domain/order tests and new tests covering legacy storage migration, stock shortages, repeated lines, single stock reservation, renamed dishes, busy-mode preparation estimates, overnight schedules and CSV import.

Browser checks covered the 820 × 1180 portrait layout and the 1024 × 768 landscape layout; status switching, menu price editing, availability, order readiness, delivery disclosure, assistant confirmation, settings save, mute behavior, and setup resuming after reload. The preferred Home preserves its original cards and Quick Actions, with only duplicate AI entry points removed. It is verified at 820 × 1180. The customer homepage still renders at `/`.
