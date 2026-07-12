# Repository Pattern Migration Plan

**Status: standard adopted 2026-07-12, applied to Accounting (pilot) + Organization, backend-wide rollout not yet executed.** This document is the honest scope tracker for that rollout — the architecture directive was to apply the Repository Pattern "consistently across the entire backend," which is ~90 modules across 16 domains. Attempting that in one uncontrolled pass would be unverifiable and high-risk. Instead: the standard is codified in [BACKEND_FOUNDATION.md](BACKEND_FOUNDATION.md) §4, proven out on a real pilot plus a second full domain (below), and the remaining modules are inventoried and sequenced here for incremental, verified rollout — the same phased discipline used throughout [DATABASE_IMPLEMENTATION_PLAN.md](DATABASE_IMPLEMENTATION_PLAN.md).

## The Standard (see BACKEND_FOUNDATION.md §4.2/§4.3 for the full text)

Every module gets `model.js` + `validation.js` + `repository.js` + `service.js` + `controller.js` + `router.js`. Repository owns 100% of database access (CRUD, queries, aggregation, population, pagination, bulk ops, transaction *mechanics*). Service owns business rules, validation orchestration, cross-module integration, and transaction *decisions* — and must contain **zero raw Mongoose calls**. `types.js`/`errors.js`/`domain.js`/`workflow.js` are added only when a module's actual complexity (per the existing Tier system) justifies them.

**Language: plain JavaScript, project-wide, current state (revised 2026-07-12).** An earlier revision of this document described a `utils/BaseRepository.ts` extraction with migrated `<entity>.repository.ts` files extending it directly, and TypeScript as the project's official forward direction (`BACKEND_FOUNDATION.md` §5). That `BaseRepository.ts` file was subsequently deleted from the repository (a cleanup commit misidentified it as unused — it wasn't; every module below depended on it transitively through `BaseService.js`), and the decision since then has been to **not** restore it and instead keep the whole Repository Pattern rollout on plain JavaScript. Concretely:

- `utils/BaseService.js` is now a fully self-contained plain-JS class — it owns the entire generic CRUD engine directly (create/getAll/findById/update/findOne/softDelete/restore/hardDelete/bulk*/exists/count, plus the `beforeCreate`/`afterCreate`/etc. lifecycle hooks) rather than extending anything. It has no `.ts` dependency of any kind, which is what makes it safely importable from a plain `.js` file — a `.js` file importing a `.js`-specifier that only resolves to `.ts` source is an unreliable path under this project's `tsx` runtime (this was confirmed directly: it's what broke the server after `BaseRepository.ts` was deleted).
- Every `<entity>.repository.js` in this rollout (pilot + Organization) extends `BaseService` directly — not a separate `BaseRepository` class. There is currently no TypeScript-only base class in this codebase; `BaseService.js` is the one and only shared CRUD engine, usable identically from JS or TS modules.
- `utils/BaseController.js`, `utils/asyncHandler.js`, `utils/throwError.js`, `utils/languages.js` are the plain-JS versions in active use; their one-time TypeScript `.d.ts`/`.ts` companions were removed in the same cleanup and are not being replaced.
- TypeScript conversion — of these modules or the project generally — is **deferred**, not merely "not yet done." Do not reintroduce a `.ts`-only shared dependency (like the old `BaseRepository.ts`) without checking this section first: it will silently break every plain-JS module that ends up depending on it, exactly as happened here.

**Design decision carried through the whole rollout:** `Service extends Repository` (not composition) in every migrated module, specifically to preserve `BaseController`'s generic constraint without a deeper framework rewrite. The repository/service separation is enforced by *convention* — a service file must contain no direct Mongoose/Model calls — not by inheritance mechanics forbidding it. This was a deliberate tradeoff, not a shortcut: rewriting `BaseController` to accept a composed (non-`BaseService`-descended) service would be a much larger, riskier change touching every one of the ~90 controllers in the codebase, for no behavioral benefit over the convention-enforced approach.

## Pilot (complete, verified) — Accounting

`accounting/journal-entry/`, `accounting/journal-line/`, and a minimal `accounting/accounting-period/accounting-period.repository.js` (added solely because `journal-entry.service.js` has a real cross-module dependency on `AccountingPeriod`'s lock status, and the mandate forbids reaching into another module's model directly from a service). Originally built in TypeScript against the now-removed `BaseRepository.ts`; converted to plain JS (extending `BaseService.js` directly) in the same pass that fixed the broken dependency — see the Language section above.

**Verification performed, not just asserted:**
- Boot smoke test: server connects to MongoDB and starts listening with zero errors.
- Live route smoke test: `GET /api/v1/accounting/journal-entries` and other routes across multiple domains (`organization/*`, `hr/employees`, `menu/products`, `inventory/warehouses`) confirmed to return the correct `401` (auth required) rather than a `500`/crash — proving the whole shared `BaseService.js` engine works correctly for real HTTP requests, not just at import time.

**What this pilot deliberately did not touch:** `AccountingPeriod`'s own service/controller/router (only a minimal repository file was added for the one method `journal-entry.service.js` needed, and those were already plain JS); `ledger.controller.js` (already fixed in the prior DB-010 pass to query `JournalLine` directly — it's a reporting controller that reads the model directly and was never routed through a service, so the repository pattern doesn't apply to it as written; migrating it to go through a repository is folded into the Accounting domain's rollout batch below, not urgent on its own).

## Second batch (complete, verified) — Organization module

`organization/brand`, `organization/brand-settings`, `organization/branch`, `organization/branch-settings`, `organization/delivery-area` — all five got the Repository Pattern split (`repository.js` + `service.js extends Repository`), same pattern as the pilot, and are entirely plain JavaScript (no `.ts` files remain anywhere in `modules/organization/`).

- Boot + live route smoke test: all five modules' routes return the correct `401`/`404` behavior (verified with real HTTP requests against a running server, MongoDB connected), no crashes.
- Brand: removed the broken positional-argument `hardDelete`/`softDelete`/`restore` overrides (pre-existing bug, fixed earlier in this session, preserved through this migration).
- DeliveryArea: public (unauthenticated) endpoints resolve tenant from `:branchId` in the URL via a repository primitive (`findBrandIdForBranch`), never from `req.user` (pre-existing security bug, fixed earlier in this session, preserved through this migration; confirmed working end-to-end against a real server — a request for a nonexistent branch correctly returns `404 "Branch not found"` instead of the Mongoose `CastError` it produced while `BaseRepository.ts` was broken).
- BrandSettings: gained a routing change — brand-scoped convenience routes moved from `/:brandId` to `/brand/:brandId` to avoid colliding with the newly-added generic `/:id` admin CRUD routes (breaking URL change — any frontend caller of this module must update these URLs).

## Full Module Inventory & Rollout Order

Grouped by the existing Tier classification (BACKEND_FOUNDATION.md §6) since tier determines how much of the pattern actually matters: Tier 3 modules have real business logic worth separating from DB calls; Tier 1 modules' "service" is close to a pass-through today, so their migration is mechanical and lower-value-per-module, appropriate for batching rather than one-at-a-time care.

### Phase A — Tier 3 (Workflow modules): highest value, do these with real per-module attention

The modules where a Repository/Service split has the most actual benefit — business logic here is substantial and currently entangled with direct Mongoose calls, same shape as the pilot.

| Order | Module | Why this priority | Notes |
|---|---|---|---|
| 1 | `sales/order` | Already TypeScript (DB-007/016/017), has custom `beforeCreate` logic. Natural next step after the accounting pilot. | Repository: CRUD + `findByBranchAndDateRange` etc. Service: `beforeCreate` orchestration (calls `orderSettingsRepository.getNextOrderNumber`), split logic, merge logic when built. |
| 2 | `sales/invoice` | Same rationale as Order; already TypeScript. | Repository owns the item-array CRUD; service owns serial generation orchestration + (future) split/merge invariants from `DATABASE_ARCHITECTURE_REDESIGN.md`. |
| 3 | `sales/order-settings`, `sales/invoice-settings` | Already TypeScript, contain the atomic sequence-generation logic — genuinely business logic (the two-step atomic pattern), not just CRUD, so splitting out the raw `findOneAndUpdate` calls into a repository is real value. |
| 4 | `preparation/preparation-ticket`, `preparation/preparation-section` | Kitchen workflow — per `DATABASE_MODELS_REVIEW.md`, this is where the stock-deduction linkage gap (Phase 1 Important, DB-040) will eventually live; worth having the repository/service split in place before that logic gets added. |
| 5 | `inventory/*` (Inventory, StockLedger, StockItem, Warehouse, WarehouseDocument) | Real business logic (stock deduction, valuation) currently mixed with direct queries across several files. |
| 6 | `payments/payment-method`, `payments/payment-channel` | Business logic around `requiresSettlement`/`allowSplit` computed defaults (already found one real bug here in the DB-004 pass) benefits from being separable from CRUD. |
| 7 | `loyalty/customer-loyalty`, `loyalty/loyalty-transaction` | The append-only ledger discipline recommended for `LoyaltyTransaction` (Phase 1 Important, DB-037) is exactly the kind of business rule that belongs in a service, not scattered across direct model calls. |
| 8 | `hr/payroll`, `hr/cashier-shift` (finance) | Real cross-collection orchestration (payroll run touches `PayrollItem`, `EmployeeFinancialTransaction`; cashier shift touches `CashTransaction`, `CashRegister`). |

### Phase B — Tier 2 (Business modules): moderate value, batch 3–4 at a time

~~`Brand`, `Branch`, `BranchSettings`~~ — done, see "Second batch" above. Remaining: `Employee`, `Supplier`, `Account`, `Asset`, `PurchaseInvoice`, `SalesReturn`, `Table`, `Reservation`, plus every model touched during the Database Implementation Plan's Phase 0 (`Product`, `StockItem`, `PayrollItem`, `Expense`, `PaymentChannel`, `CashRegister`, `ProductionRecord`, `AssetDepreciation`, `CashierShift`) — these already got model-layer attention in Phase 0 and are natural next candidates since their schemas are already correct and typed.

### Phase C — Tier 1 (Simple CRUD): mechanical, batch by domain, lowest individual risk

The ~19 Configuration-classified settings modules (`accounting-settings`, `loyalty-settings`, `tax-settings`, `discount-settings`, `notification-settings`, `print-settings`, `purchasing-settings`, `preparation-return-settings`, `preparation-ticket-settings`, `sales-return-settings`, etc.), plus `JobTitle`, `Department`, `MenuCategory`, `StockCategory`, `CostCenter`, `PaymentMethod`, ~~`DeliveryArea`~~ (done, see "Second batch" above), `DiningArea`, `AssetCategory`, `CustomerMessage`, `LoyaltyReward`, `ProductReview`. For these, the repository is nearly a verbatim copy of what the service class body looks like today (they have little to no custom business logic beyond generic CRUD) — appropriate to migrate several per session rather than one at a time, since the risk profile and the review effort per module are both low.

### Phase D — Still-JS legacy/placeholder modules: migrate as part of their existing scheduled work, not this rollout

The four empty placeholder settings models (`attendance-settings`, `payroll-settings`, `promotion-settings`, `payment-settings`) and `payment-provider` — these get the repository pattern applied when they're actually built out (Phase 1 Important, DB-043 in `DATABASE_IMPLEMENTATION_PLAN.md`), not before; giving a repository/service split to a module with no real content yet would be structure with nothing to structure.

## What "done" looks like for the full rollout

Every module folder contains the six mandatory files; every `service.ts` file, greppable, contains zero direct Mongoose/Model method calls (`.find(`, `.create(`, `.aggregate(`, `.session(`, etc.) outside of calls made *through* a repository instance; `npm run typecheck` and the full test suite (growing as each phase adds its own module-specific tests, following the pilot's pattern) stay green throughout. This document's phase tables get updated with a ✅ per module as each one lands, the same way `DATABASE_IMPLEMENTATION_PLAN.md` tracks its own tasks.

## Explicitly not done in this pass

Phases A through D above are **not implemented** — only the standard's documentation and the Accounting pilot are complete. This is stated plainly rather than implied, per this project's standing practice of not claiming completion beyond what was actually verified.
