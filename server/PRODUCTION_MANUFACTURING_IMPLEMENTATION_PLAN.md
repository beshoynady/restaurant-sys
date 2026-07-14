# Manufacturing, Recipe & Production Platform — Implementation Plan

**Status: planning document, Step 10 of the redesign process. No code has been written.**
Companion to `PRODUCTION_MANUFACTURING_DOMAIN_REDESIGN.md` (Steps 1–9, read first — every decision
below is justified there, not re-argued here). This document translates that redesign into
concrete milestones, entities, and a testing/migration strategy. **Implementation (Step 11) should
not begin until this plan is reviewed** — per the explicit instruction governing this phase.

---

## 1. Architecture Redesign Summary (one paragraph, for orientation)

Rewire the three existing, unmounted `production/*` modules onto the Repository Pattern; require
`ProductionOrder.productionRecipe`; connect `ProductionRecipe`'s output costing to the existing
Inventory Posting Engine and Cost Engine (no new posting/costing mechanism); extend
`AccountingSettings`/`WarehouseDocument`/`JournalLine`/`DomainEvent` additively for production;
implement a realistic (not maximalist) state machine using the existing `TransitionGuard`; mount
routers with full RBAC. Explicitly do not build: platform-wide Reservations, StockLayer/lot
tracking, multi-step Work Orders, or Tier-1 (à la minute) Recipe execution in this pass — each is
named, scoped, and deferred for a stated reason in the redesign document, not silently dropped.

---

## 2. Entities (schema-change plan, no code)

### 2.1 `ProductionRecipe` (extend existing model)
Add: `costFields { estimatedUnitCost, costCalculatedAt, costBasis[] }` (a snapshot of which
ingredient costs contributed, for traceability — not required for the calculation itself, which
always reads live `Inventory.avgUnitCost`, but valuable for "why did this cost change" auditing).
Add: `expectedYield` (distinguish planned yield from `batchSize` if a recipe's batch and expected
usable output differ — e.g. batch makes 5kg dough, expected usable yield after trim is 4.8kg).
Add: `recipeType` enum `["standard", "assembly"]` (default `"standard"`) — cheap, supports §6's
Assembly Recipe case without new schema; `"disassembly"` reserved, not implemented Phase 1.
Fix: `preparationSteps` migrate from plain-string array to `Map<lang,string>` for i18n consistency
with `menu/Recipe` (currently plain string — the inconsistency named in the redesign's §9).

### 2.2 `ProductionOrder` (extend existing model)
Add (required): `productionRecipe` → `ProductionRecipe`. Add: `requestedMultiple` (Number, default
1 — how many multiples of the recipe's base `batchSize` this order requests). Fix: `orderStatus`
enum casing consistency, replaced by the new state machine (§8 of the redesign doc):
`["Draft","Submitted","Approved","Rejected","InProduction","QualityCheck","Completed","Posted","Closed","Cancelled"]`.
Add: unique `{brand, branch, orderNumber}` index (currently absent — confirmed gap). Add:
soft-delete triple is explicitly NOT added — this is a transactional document with its own status
lifecycle, matching every other transactional document's established convention in this platform
(`enableSoftDelete: false`).

### 2.3 `ProductionRecord` (extend existing model)
Add: `expectedYield`, `actualYield` (may just be `quantity`, renamed for clarity, or a parallel
field if `quantity` is kept for backward compatibility — decide at implementation time based on
whether any existing code reads `quantity`, confirmed currently to be none since the module is
unmounted, so a clean rename is safe). Add: `yieldVariance`, `yieldVariancePercent` (computed at
completion, persisted per the redesign's §5.3 reasoning). Add: `rawMaterialCost`, `packagingCost`,
`directLaborCost`, `indirectOverheadCost`, `totalCost`, `unitCost` (the full §5.1 cost-rollup
breakdown, persisted for audit/reporting — not just the final `productionCost` the current schema
has as an uncomputed placeholder). Add: `warehouseDocument` → `WarehouseDocument` (the posted
consumption+yield document — currently no link exists, confirmed gap). Add: `journalEntry` →
`JournalEntry` (mirrors every other posting-engine-integrated model's established field). Fix:
`opertionCost` → `operationCost` (typo correction — safe since unmounted/unused today; if any
seed/fixture data exists referencing the typo'd name, a trivial rename, not a migration risk).

### 2.4 `AccountingSettings` (extend existing model)
Add to `controlAccounts`: `workInProgress`, `costOfGoodsManufactured`, `productionVariance`.
Add `activities.production: { rawMaterialConsumption, laborCost, overheadCost, wipClearing }`.

### 2.5 `InventorySettings` (extend existing model)
Add: `productionOrderSequence` sub-doc, identical shape to `countSequence`/`transferSequence`
(prefix default `"PRD-"`, startNumber, currentNumber, padding, resetPolicy, lastResetDate).

### 2.6 `WarehouseDocument` / `StockLedger` (extend existing enums, additive)
`WarehouseDocument.transactionType`: add `"ProductionConsume"`, `"ProductionYield"`.
`StockLedger.source`: **fix the duplicate `"ProductionOut"` value** — replace the two conflicting
entries with `"ProductionConsume"`/`"ProductionYield"` (matching the new transactionType values
exactly, one name used consistently instead of a duplicated/ambiguous one).

### 2.7 `JournalLine.sourceType` — add `"PRODUCTION_ORDER"`.

### 2.8 `Warehouse.type` — add `"production"` enum value.

### 2.9 `PreparationSection` — add `warehouse` → `Warehouse` (closes the confirmed gap: no explicit
link from a kitchen station to the warehouse/location it produces into/consumes from).

### 2.10 `RESOURCE_ENUM` — add `"ProductionOrders"`, `"ProductionRecipes"` (additive; `ProductionRecord`
is treated as an internal artifact of `ProductionOrder`'s execution, like `StockLedger` is to
`WarehouseDocument` — read-accessible via `ProductionOrder`'s own RBAC, not a separately
CRUD-exposed resource requiring its own permission set).

### 2.11 `DomainEvent` catalog — add `PRODUCTION_ORDER_APPROVED`, `PRODUCTION_ORDER_COMPLETED`, in
the same milestone that ships their first real publisher (per the catalog's own convention).

**No changes to**: `StockItem` (its existing `inventoryBehavior`/`isRecipeItem`/`itemType` fields
are sufficient, per the redesign's §1.3/§4 — this is a deliberate non-change, confirming the
existing schema was already right), `Inventory`, `InventoryCostEngine`, `WarehouseDocumentService`'s
core `postDocument()`/`buildMovementPlan()` logic (only its enum inputs grow), `JournalEntryService`,
`TransitionGuard`, `SequenceGeneratorService`, `DomainEventDispatcher`'s mechanism.

---

## 3. Services (business logic plan, no code)

### 3.1 `ProductionRecipeService` (rebuild on `AdvancedService`, matching `PurchaseOrder`'s pattern)
- `beforeCreate`: cycle-detection graph walk (redesign §4.4); version auto-increment (already
  exists as a `pre('save')` hook — migrate into `beforeCreate`/an explicit method for testability
  and consistency with how every other versioned entity in this platform handles it, e.g.
  `SequenceGeneratorService`, rather than a Mongoose middleware hook that's harder to unit test in
  isolation).
- `activate(id)` / new-version-supersedes-old (atomic: new version `isActive: true`, previous
  version `isActive: false`, single transaction).
- `previewCost({ id, quantity })` — read-only, computes §5.1's rollup at *current* ingredient
  costs without requiring an actual production run; this is the "what would this cost me today"
  planning tool a Cost Control Manager needs, and it's a pure read over `Inventory.avgUnitCost` +
  the recipe's ingredient list — cheap to build, high operational value, explicitly worth calling
  out as a concrete Phase 1 deliverable beyond the bare minimum.

### 3.2 `ProductionOrderService` (rebuild on `AdvancedService`)
- `beforeCreate`: resolve `productionRecipe` (required), validate `warehouse` is `type: "production"`
  or `"kitchen"` (policy-configurable which types are eligible, not hardcoded), generate
  `orderNumber` via `SequenceGeneratorService`.
- `transition({toStatus})`: atomic claim from the first line of code (redesign §9 — not a later
  hardening pass), reusing `createTransitionGuard()` with the §8 state map.
- `checkMaterialSufficiency()`: read-only check against current `Inventory.quantity` for every
  recipe ingredient, scaled by `requestedMultiple` — the honest, buildable substitute for
  "Materials Reserved" named in the redesign.
- `complete({actualYield, materialsUsed, operationCosts, actorId})`: the core engine method —
  computes §5.1's cost rollup, calls `warehouseDocumentService.postDocument()` for a single
  document with both `ProductionConsume` (OUT, one line per ingredient) and `ProductionYield` (IN,
  one line for the output) movements — reusing `TRANSFER`'s existing "one document, two directions"
  pattern already proven in this platform (documented precedent: `StockTransferRequest.execute()`).
  Then calls `journalEntryService.postFromSource()` (best-effort, non-blocking, matching every
  other posting engine). Then emits `DomainEvent.PRODUCTION_ORDER_COMPLETED`.

### 3.3 `ProductionRecordService` (rebuild on `AdvancedService`, fix `softDelete`/`searchFields` typo
— same class of bug already fixed on `StockCategoryService`/`PaymentMethodService` this
engagement, confirmed present here too) — becomes primarily a read/reporting service once
`ProductionOrderService.complete()` owns the write path; the record itself is created as part of
that atomic completion flow, not independently via its own `create()` endpoint (mirrors how
`StockLedger` rows are never independently created via API, only as a side effect of
`postDocument()`).

---

## 4. Repositories

No new repository abstraction — every service above extends the existing `AdvancedService`
(`BaseRepository`), per the platform's established convention. This is a deliberate non-decision:
the redesign explicitly rejects introducing new abstractions where the existing Repository Pattern
already fits.

---

## 5. Policies (Settings-Driven Behavior)

| Policy | Lives on | Behavior |
|---|---|---|
| `enableProduction` | `InventorySettings` (existing) | Master kill-switch — `ProductionOrder.create()` rejects if false, mirroring `checkModuleEnabled` middleware's role but at the settings-resolution layer since this is a brand/branch-level toggle, not a subscription-tier module gate |
| `productionAutoApprove` | `InventorySettings` (existing) | `Submitted` → `Approved` transition automatic vs. requiring an explicit approval action |
| Eligible warehouse types for production | New: `InventorySettings.eligibleProductionWarehouseTypes` (array, default `["production","kitchen"]`) | Avoids hardcoding which `Warehouse.type` values a `ProductionOrder` may target |
| Quality Check required | New: `InventorySettings.requireQualityCheck` (Boolean, default `false`) | Whether the `QualityCheck` state is mandatory in the transition path or skippable |
| Production Order sequence format | `InventorySettings.productionOrderSequence` (new, §2.5) | Prefix/padding/reset policy, matching every other numbered document in this platform |

---

## 6. Events

| Event | Publisher | Subscriber (Phase 1) |
|---|---|---|
| `PRODUCTION_ORDER_APPROVED` | `ProductionOrderService.transition()` | None yet — informational, mirrors `PURCHASE_ORDER_APPROVED`'s current zero-subscriber state, added for future notification/kitchen-display integration |
| `PRODUCTION_ORDER_COMPLETED` | `ProductionOrderService.complete()` | None yet — future seam for a Replenishment-Engine-style consumer (e.g., "semi-finished item back in stock" could feed a downstream trigger) |

Both added to the catalog in the same change that ships `ProductionOrderService`, per the existing
convention — not pre-stubbed ahead of their publisher.

---

## 7. State Machine (implementation detail, restating redesign §8 for this document's completeness)

```
Draft → Submitted → Approved → InProduction → QualityCheck → Completed → Posted → Closed
     ↘ (Draft→Cancelled)   ↘ Rejected              ↘ Cancelled (only before InProduction)
```
Implemented via `createTransitionGuard()`, atomic-claim `findOneAndUpdate` from first commit — see
redesign §8/§9 for full justification of why this subset (not the maximalist 10-state version) is
Phase 1's correct scope.

---

## 8. Database Changes & Migration Plan

**All changes are additive** (new fields, new enum values, new sub-documents) — no destructive
schema changes, no data migration required for existing collections, because the three Production
models have zero production data today (confirmed: unmounted, unreachable, this engagement's own
research confirmed no live usage path exists). The one exception:

- **`StockLedger.source` duplicate `"ProductionOut"` fix**: since no code has ever written a
  `"ProductionOut"` value (confirmed — no service references either duplicate entry), this is a
  pure enum-definition fix with zero existing documents to migrate. Safe to change without a
  backfill script.

**New indexes**:
- `ProductionOrder`: `{brand, branch, orderNumber}` unique (new).
- `ProductionRecipe`: existing partial-unique `{stockItem: 1, isActive: true}` retained unchanged.

No index needs dropping/recreating (unlike the `StockItem.barcode`/`PaymentMethod` fixes earlier
this engagement, which had live conflicting data) — because this domain has no live data yet.

---

## 9. Testing Strategy

Matching this engagement's established verification discipline (full regression + concurrency
tests + live boot + HTTP smoke tests after every milestone, not just at the end):

1. **Unit-level**: `ProductionRecipeService`'s cycle-detection graph walk (multiple nesting depths,
   including a direct self-reference and a 3-level transitive cycle) — this is the one piece of
   genuinely new algorithmic logic in the whole design and needs dedicated coverage.
2. **Integration**: full `ProductionOrder` lifecycle (Draft→...→Closed) against a real MongoDB
   instance, asserting: `Inventory` balances for both consumed raw materials and the produced item
   are correct after `complete()`; `StockLedger` rows exist with the correct new source values;
   `WarehouseDocument` has both OUT and IN movements from one document (mirroring the existing
   `StockTransferRequest` test's assertion pattern); `JournalEntry` posts and balances; cost rollup
   arithmetic matches hand-computed expected values for a multi-ingredient recipe.
3. **Multi-level BOM integration test**: dough → pizza base → topped pizza, three sequential
   `ProductionOrder` completions, asserting the final item's cost correctly reflects the rolled-up
   cost of both underlying production runs (proves redesign §5.4's "sequencing is sufficient, no
   new mechanism needed" claim empirically, not just architecturally).
4. **Concurrency tests**: two concurrent `complete()` calls for the same `ProductionOrder` — proves
   the atomic-claim pattern (mandatory from first commit per §9) actually holds, following the
   exact `Promise.allSettled` pattern already proven in `supply-chain-concurrency-safety.test.ts`.
5. **Negative-stock / insufficient-materials test**: attempting to complete a production order
   whose raw materials are unavailable, with `allowNegativeStock` both true and false, confirming
   the existing `applyOutbound()` guard correctly blocks/allows as configured — no new guard needed,
   just confirmation the existing one is reached correctly from this new call path.
6. **RBAC/route smoke tests**: every newly-mounted route returns 401 unauthenticated, matching the
   verification pattern used for every prior milestone this engagement.

---

## 10. Documentation Plan

Update (after implementation, not before, per this platform's established "document what was
actually built" discipline): `SUPPLY_CHAIN_SSOT_MATRIX.md`-equivalent for Production (new document
or an extension — recommend a new `PRODUCTION_SSOT_MATRIX.md` given this is a distinct domain, not
a Supply Chain sub-topic), `DomainEvent` catalog comment block, `RESOURCE_ENUM` is self-documenting
via its own additive convention, a new per-module doc for `ProductionOrder`/`ProductionRecipe`
following the established template (`EMPLOYEE.module.md`-style: business purpose, schema reference,
endpoints+permissions, non-CRUD business logic, related settings).

---

## 11. Frontend Impact & UI/UX Workflow (named, not designed — backend-scope engagement)

This engagement's scope has consistently been backend-only; naming the frontend surface this
domain will require, without designing it:
- Recipe/BOM builder UI (ingredient picker with live cost preview, using `previewCost()` from §3.1).
- Production Order planning board (by warehouse/preparation section, by planned date).
- Production execution screen (start → record actual materials used/yield → complete), likely the
  highest-frequency screen kitchen staff would touch, so worth flagging as the UI investment with
  the most operational leverage.
- Cost/variance reporting dashboard (yield variance, cost variance, once §9's Phase 2 persists
  those values).

---

## 12. Milestone Sequencing (ties together §2–§9 into buildable, independently-testable chunks)

1. **Milestone 1 — Foundation**: schema extensions (§2.1–§2.9), settings extensions (§5),
   `ProductionRecipeService` rebuild + cycle detection. Testable in isolation (no posting yet).
2. **Milestone 2 — Core Engine**: `ProductionOrderService` rebuild, state machine (§7), material
   sufficiency check, `complete()`'s cost rollup + posting integration. This is the milestone that
   proves the whole design — full integration test suite (§9.2) targets this milestone.
3. **Milestone 3 — Multi-Level Proof + Concurrency Hardening**: multi-level BOM integration test
   (§9.3), concurrency tests (§9.4), negative-stock tests (§9.5).
4. **Milestone 4 — Mounting & RBAC**: mount all three routers, `RESOURCE_ENUM` additions, RBAC
   chain verification, route smoke tests (§9.6).
5. **Milestone 5 — Documentation**: per §10, only after 1–4 are verified.

Each milestone gated on full regression + typecheck + live boot passing before the next begins,
per this engagement's standing verification discipline — no milestone starts with a known-broken
prior one.
