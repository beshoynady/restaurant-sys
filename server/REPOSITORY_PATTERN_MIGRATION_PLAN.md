# Repository Pattern Migration Plan

**Status: standard adopted 2026-07-12, pilot complete, backend-wide rollout not yet executed.** This document is the honest scope tracker for that rollout — the architecture directive was to apply the Repository Pattern "consistently across the entire backend," which is ~90 modules across 16 domains. Attempting that in one uncontrolled pass would be unverifiable and high-risk. Instead: the standard is codified in [BACKEND_FOUNDATION.md](BACKEND_FOUNDATION.md) §4, proven out completely on a real pilot (below), and the remaining ~88 modules are inventoried and sequenced here for incremental, verified rollout — the same phased discipline used throughout [DATABASE_IMPLEMENTATION_PLAN.md](DATABASE_IMPLEMENTATION_PLAN.md).

## The Standard (see BACKEND_FOUNDATION.md §4.2/§4.3 for the full text)

Every module gets `model.ts` + `validation.ts` + `repository.ts` + `service.ts` + `controller.ts` + `routes.ts`. Repository owns 100% of database access (CRUD, queries, aggregation, population, pagination, bulk ops, transaction *mechanics*). Service owns business rules, validation orchestration, cross-module integration, and transaction *decisions* — and must contain **zero raw Mongoose calls**. `types.ts`/`errors.ts`/`domain.ts`/`workflow.ts` are added only when a module's actual complexity (per the existing Tier system) justifies them.

**Framework-level change (2026-07-12, same day as the standard's adoption):** the generic Mongoose CRUD engine that used to live directly in `utils/BaseService.js` was extracted into a new `utils/BaseRepository.ts` — a real base class, not a naming convenience. `BaseService.js` is now a thin, behavior-preserving subclass (`class BaseService extends BaseRepository {}`) kept solely so the ~85 modules not yet migrated keep working unchanged via `new BaseService(Model, {...})`. `BaseController`'s generic constraint was widened from `BaseService<any>` to `BaseRepository<any>` (a pure widening, verified non-breaking). **Every migrated `<entity>.repository.ts` now extends `BaseRepository` directly, not `BaseService`** — this was a one-time follow-up correction to the pilot (its repository files initially extended `BaseService` as a pragmatic shortcut before `BaseRepository` existed as its own class; both accounting-period.repository.ts, journal-entry.repository.ts, and journal-line.repository.ts were updated to extend `BaseRepository` once it was introduced).

**Design decision carried through the whole rollout:** `Service extends Repository` (not composition) in every migrated module, specifically to preserve `BaseController`'s generic constraint without a deeper framework rewrite beyond the `BaseRepository` extraction above. The repository/service separation is enforced by *convention* — a service file must contain no direct Mongoose/Model calls — not by inheritance mechanics forbidding it. This was a deliberate tradeoff, not a shortcut: rewriting `BaseController` to accept a composed (non-`BaseRepository`-descended) service would be a much larger, riskier change touching every one of the ~90 controllers in the codebase, for no behavioral benefit over the convention-enforced approach.

## Pilot (complete, verified)

`accounting/journal-entry/`, `accounting/journal-line/`, and a minimal `accounting/accounting-period/accounting-period.repository.ts` (added solely because `journal-entry.service.ts` has a real cross-module dependency on `AccountingPeriod`'s lock status, and the mandate forbids reaching into another module's model directly from a service). Plus the framework-level `utils/BaseRepository.ts` extraction described above, which every future migrated module depends on.

**Verification performed, not just asserted, at both the pilot stage and again after the `BaseRepository` extraction:**
- `npm run typecheck`: clean (no new errors versus the pre-refactor baseline) — checked after the initial pilot and again after `BaseRepository` was extracted and the pilot's repository files were switched to extend it directly.
- `npm test`: all 5 existing integration tests (DATABASE_IMPLEMENTATION_PLAN.md DB-007/010/014) pass **unmodified** at both stages — this is the actual proof that business behavior didn't change, not just a claim. The tests exercise real MongoDB transactions, balance validation, and period-lock rejection through the repository/service split exactly as they did through the old monolithic service.
- Boot smoke test, both stages: server connects and starts listening with zero errors.
- **Live route smoke test (added for the `BaseRepository` extraction specifically, since that change touches the shared base class every one of the ~85 untouched modules depends on):** curled a sample of untouched routes across three different domains (`organization/brand`, `hr/department`, `menu/*`) and confirmed each still returns the correct `401` (auth required) rather than a `500` — proving `BaseService extends BaseRepository` works correctly for real HTTP requests through unmigrated modules, not just at import time.

**What this pilot deliberately did not touch:** `AccountingPeriod`'s own service/controller/router (only a minimal repository file was added for the one method `journal-entry.service.ts` needed); `ledger.controller.js` (already fixed in the prior DB-010 pass to query `JournalLine` directly — it's a reporting controller that reads the model directly and was never routed through a service, so the repository pattern doesn't apply to it as written; migrating it to go through a repository is folded into the Accounting domain's rollout batch below, not urgent on its own).

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

`Brand`, `Branch` (already TS from the Organization pass — needs the split applied to its existing service), `BranchSettings`, `Employee`, `Supplier`, `Account`, `Asset`, `PurchaseInvoice`, `SalesReturn`, `Table`, `Reservation`, plus every model touched during the Database Implementation Plan's Phase 0 (`Product`, `StockItem`, `PayrollItem`, `Expense`, `PaymentChannel`, `CashRegister`, `ProductionRecord`, `AssetDepreciation`, `CashierShift`) — these already got model-layer attention in Phase 0 and are natural next candidates since their schemas are already correct and typed.

### Phase C — Tier 1 (Simple CRUD): mechanical, batch by domain, lowest individual risk

The ~19 Configuration-classified settings modules (`accounting-settings`, `loyalty-settings`, `tax-settings`, `discount-settings`, `notification-settings`, `print-settings`, `purchasing-settings`, `preparation-return-settings`, `preparation-ticket-settings`, `sales-return-settings`, etc.), plus `JobTitle`, `Department`, `MenuCategory`, `StockCategory`, `CostCenter`, `PaymentMethod`, `DeliveryArea`, `DiningArea`, `AssetCategory`, `CustomerMessage`, `LoyaltyReward`, `ProductReview`. For these, the repository is nearly a verbatim copy of what the service class body looks like today (they have little to no custom business logic beyond generic CRUD) — appropriate to migrate several per session rather than one at a time, since the risk profile and the review effort per module are both low.

### Phase D — Still-JS legacy/placeholder modules: migrate as part of their existing scheduled work, not this rollout

The four empty placeholder settings models (`attendance-settings`, `payroll-settings`, `promotion-settings`, `payment-settings`) and `payment-provider` — these get the repository pattern applied when they're actually built out (Phase 1 Important, DB-043 in `DATABASE_IMPLEMENTATION_PLAN.md`), not before; giving a repository/service split to a module with no real content yet would be structure with nothing to structure.

## What "done" looks like for the full rollout

Every module folder contains the six mandatory files; every `service.ts` file, greppable, contains zero direct Mongoose/Model method calls (`.find(`, `.create(`, `.aggregate(`, `.session(`, etc.) outside of calls made *through* a repository instance; `npm run typecheck` and the full test suite (growing as each phase adds its own module-specific tests, following the pilot's pattern) stay green throughout. This document's phase tables get updated with a ✅ per module as each one lands, the same way `DATABASE_IMPLEMENTATION_PLAN.md` tracks its own tasks.

## Explicitly not done in this pass

Phases A through D above are **not implemented** — only the standard's documentation and the Accounting pilot are complete. This is stated plainly rather than implied, per this project's standing practice of not claiming completion beyond what was actually verified.
