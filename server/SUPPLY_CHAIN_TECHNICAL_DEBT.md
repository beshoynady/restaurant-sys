# Supply Chain & Commerce Platform — Technical Debt Registry

A single tracked list of known, evidenced debt items in the Supply Chain/Inventory/Purchasing
domain. Complements `SUPPLY_CHAIN_FINAL_AUDIT.md` (V5.2) and `SUPPLY_CHAIN_PRODUCTION_RELEASE.md`
(V6.0), which cover architectural gaps and readiness scoring in depth — this document is narrower
and more mechanical: dead code, orphaned modules, naming, and small correctness debts found during
a dedicated Phase 10 ("no orphan endpoints/models/events, no dead code") sweep, plus a fix log for
what was resolved on sight versus deliberately left open.

Each item: **Status** (Fixed this pass / Open), **Severity**, **Evidence**, **Recommendation**.

---

## Fixed this pass (round 2 — "Payment Integration foundations")

### DEBT-006 — `PaymentMethod`'s router was unimportable and unmounted; Supplier Payment/Refund had no dependency it could actually satisfy in production
**Status: Fixed.** **Severity: was Critical (production blocker), now resolved.**

`PurchaseInvoice.paymentMethod` and `PurchaseReturnInvoice.refundMethod` are both
`required: true` references to `PaymentMethod`, and `SupplierTransaction.paymentMethod` reads the
same model — the entire Supplier Payment/Refund workflow that V5's procurement chain proved
end-to-end depends on a `PaymentMethod` document existing. `payment-method.router.js` imported its
controller from `./payments/payment-method.controller.js` — a path with no such subfolder — which
would throw "Cannot find module" the instant anything tried to load the router; this is almost
certainly *why* it was never mounted (whoever scaffolded it hit the crash and left it out). The
router also had **zero RBAC** (`authorize()`/`checkModuleEnabled()` entirely absent, unlike every
other router in the platform — any authenticated user of any role/permission could have managed
payment methods once mounted). The service itself had the familiar `softDelete`/`searchFields`
typo (should be `enableSoftDelete`/`searchableFields`) but did correctly extend `AdvancedService`
(unlike `StockCategoryService`, DEBT-001) — no data-layer rebuild needed, just the option names.

Every test in this engagement that exercised Supplier Payment/Refund (`procurement-chain-engine.test.ts`,
etc.) created its `PaymentMethod` fixture by calling the Mongoose model directly, bypassing the API
entirely — which is exactly why this was never caught by the existing (passing) test suite. A real
deployed brand had no code path to create one at all.

**Fixed**: corrected the controller import path, added the full `authenticateToken → authorize →
checkModuleEnabled("financial") → validate → controller` chain (matching `CashRegister`'s router
as the template — `PaymentMethods` added to `RESOURCE_ENUM`), fixed the service's option-name typo,
mounted at `/finance/payment-methods`. Verified end-to-end by
`tests/integration/payment-method-engine.test.ts` (create, list, soft-delete, restore) — passing.
Not fixed, deliberately out of scope: `payment-channel`, `payment-provider`, `payment-settings`
(the other three modules under `modules/payments/`) have the identical broken-import-path pattern
but are **not referenced anywhere in the Supply Chain domain** (confirmed by grep) — they're part
of the separately-scoped, not-yet-built "full Payment Platform" (Adapter Pattern,
PaymentIntent/Transaction) already named as future work in `SUPPLY_CHAIN_COMMERCE_ARCHITECTURE_V2.md`.
Fixing them is real, valuable work — just not Supply Chain work, and fixing a domain this
engagement doesn't own without being asked would be scope creep, not hardening.

---

## Fixed this pass (round 1)

### DEBT-001 — `StockCategoryService` was not on the Repository Pattern; router was unmounted as a result
**Status: Fixed.** **Severity: was High (broken-if-exposed), now resolved.**

`stock-category.service.js` was a hand-rolled class (`create(data)`, `findAll(filter)`,
`findById(id)`, `update(id, data)`, `delete(id)`) that didn't extend `AdvancedService`/
`BaseRepository` and didn't match `BaseController`'s calling convention
(`service.getAll({brandId, branchId, ...})` etc.) — the identical defect class already found and
fixed on `inventory.service.js` earlier in this engagement ("every method threw a TypeError").
Compounding it, `stock-category.model.js` had no `isDeleted`/`deletedAt`/`deletedBy` fields despite
being a soft-deletable resource conceptually — `getAll()`'s default `{isDeleted: false}` filter
would have matched **zero documents** (`false` never matches an undeclared/undefined field) even
after the service was fixed, the same silent-drop failure mode already documented multiple times
this engagement (`PurchaseSettings.sequence.lastResetDate`, `InventoryCount.journalEntry`).

Because the router was never mounted, none of this ever reached production as a live crash — but
it also meant **there was no API path to create or list a `StockCategory` at all**, despite
`StockItem.categoryId` being a required field referencing it. Any brand onboarding real inventory
data had no way to populate that dropdown.

**Fixed**: added the three soft-delete fields to the model; rebuilt the service to extend
`AdvancedService` (matching `stock-item.service.js`'s pattern exactly); mounted the router at
`/stock-categories` with the standard `authenticateToken → authorize → checkModuleEnabled →
validate → controller` chain (RBAC resource `"StockCategories"` already existed in
`RESOURCE_ENUM`, unused until now). Verified end-to-end by
`tests/integration/stock-category-engine.test.ts` (create, list, soft-delete, restore) — passing.

### DEBT-002 — `Consumption` module confirmed still fully orphaned/unimplemented
**Status: Open, deliberately.** **Severity: Medium** (already scored into
`SUPPLY_CHAIN_PRODUCTION_RELEASE.md` §11 as the top restaurant-specific gap).

Re-confirmed by this pass's sweep: `consumption.router.js` is not mounted, `consumption.service.js`
is plain CRUD with zero business logic (no `beforeCreate`, no open/close/post workflow, no
`TransitionGuard` on its own `Open/Closed/Posted` status enum, no Inventory/Accounting posting
despite the schema clearly anticipating one). Unlike `StockCategory`, this is not a quick, safe
fix — building a real shift-consumption-reconciliation engine (open-stock snapshot, theoretical
consumption from recipes, actual-closing-stock capture, variance posting) is genuine new-feature
work requiring product decisions (how does theoretical consumption pull from Recipe? what account
does variance post to?) that this hardening pass's mandate didn't extend to inventing. Left
unmounted rather than exposed half-built — mounting a CRUD-only endpoint over a document whose own
status enum implies a workflow that doesn't exist would be worse than leaving it absent.
**Recommendation**: scope as its own milestone; the Cost Engine primitive it needs
(`inventoryCostEngine.resolveOutboundCost`) already exists and is ready to be called from it.

---

## Open — acceptable, no action recommended

### DEBT-003 — Two `export`ed helpers with zero external importers
**Severity: Trivial.**

`purchase-invoice.service.js`'s `buildPurchaseInvoiceLines`/`purchaseInvoiceTransitionGuard` and
`purchase-return.service.js`'s `buildPurchaseReturnLines`/`purchaseReturnTransitionGuard` are
exported but currently imported nowhere outside their own file. Not dead code (each is called
internally); the `export` keyword itself is unused surface area. **Recommendation: no action** —
this matches the deliberate pattern already established elsewhere in this domain (e.g.
`buildMovementPlan` in `warehouse-document.service.js` is exported specifically "so the mapping
rules can be unit-tested directly without a database," per its own comment) and removing the
export would foreclose that same testability option for these two pure functions for zero benefit.

### DEBT-004 — `TransitionGuard.isTerminal()` has zero production callers
**Severity: Trivial.** Only exercised by `sequence-and-transition-utilities.test.ts`. A small,
correct, documented method on a shared, actively-used engine — not worth removing on the chance a
future workflow needs to ask "is this document in a terminal state" without hand-rolling the check.

### DEBT-005 — `DomainEvent.PURCHASE_ORDER_APPROVED` / `GOODS_RECEIPT_CONFIRMED` have zero subscribers
**Severity: Trivial, by design.** Both are emitted from exactly one place each; neither has a
listener registered in `registerEventHandlers.js`. This is the documented, intentional shape of
the event catalog — events are added "in the same change that ships its first real publisher," not
pre-wired with a subscriber. Confirmed still true, not a regression.

---

## Open — real gaps, already scored (cross-referenced, not duplicated)

The following were re-confirmed by this pass but are already fully evidenced and severity-ranked
in `SUPPLY_CHAIN_PRODUCTION_RELEASE.md` §9 — listed here only as an index so this document is a
complete debt registry on its own:

| Item | Severity | Where it's fully documented |
|---|---|---|
| No Reservation/Available-Quantity/Committed model | High | PRODUCTION_RELEASE.md §4, §9 |
| Purchase Price Variance not posted to GL | High | PRODUCTION_RELEASE.md §3, §9 |
| No lot/batch/FEFO tracking | High | FINAL_AUDIT.md §1, PRODUCTION_RELEASE.md §9 |
| No GR/IR clearing account | Medium | PRODUCTION_RELEASE.md §5, §9 |
| No EOQ / demand forecasting | Medium | FINAL_AUDIT.md §2, PRODUCTION_RELEASE.md §9 |
| No RFQ / multi-supplier quotation | Medium | PRODUCTION_RELEASE.md §9 |
| No inventory valuation/cost-variance/aging reports | Medium | PRODUCTION_RELEASE.md §9 |
| No cost-correction/recalculation mechanism | Medium | PRODUCTION_RELEASE.md §3, §9 |
| No API-level payment idempotency key | Medium | PRODUCTION_RELEASE.md §2.2, §9 |
| No notification/alerting engine | Low-Medium | FINAL_AUDIT.md §2, PRODUCTION_RELEASE.md §9 |
| No multi-currency posting | Low | PRODUCTION_RELEASE.md §5, §9 |
| No landed cost allocation | Low | PRODUCTION_RELEASE.md §9 |
| `StockLedger` archival strategy | Low (rising) | PRODUCTION_RELEASE.md §8 |
| Sequence-of-atomic-steps, not full 2PC, on GRN/Return/Count/Transfer posting | Medium | PRODUCTION_RELEASE.md §2.1 |
| Platform-wide AuditLog has no before/after diff capture | Medium (cross-cutting, not Supply-Chain-specific) | FINAL_AUDIT.md §4 |
| Unauthenticated failing requests are not audit-logged | Medium (cross-cutting) | FINAL_AUDIT.md §4 |

---

## Swept and confirmed clean (no debt found)

- **Orphan routers**: every router in `modules/purchasing/**` is mounted; in `modules/inventory/**`
  only `consumption.router.js` (DEBT-002, deliberate) remains unmounted after this pass's
  `stock-category.router.js` fix.
- **Orphan services**: no service exists with zero reachability path (either cross-module import or
  a mounted router) after DEBT-001's fix.
- **Orphan models**: every model has at least one real cross-module reference or `ref:` usage.
- **Dead code from the V5.2 Cost Engine extraction**: confirmed the old inline `consumeLayers` copy
  in `warehouse-document.service.js` was fully removed, not left behind — the extraction was clean.
- **Legacy/duplicate trees** (`modules/setup/*`, `modules/system/audit-log/*` per CLAUDE.md): both
  no longer exist on disk — already removed since that note was written; no overlap with this
  domain to report.
- **Naming consistency**: beyond the already-known, consistently-used (not independently
  misspelled) `reffrance` field on `SupplierTransaction`, a targeted scan found zero other typo'd
  field/variable names across the domain.

---

## Verification

`stock-category-engine.test.ts` (1 test, round 1) and `payment-method-engine.test.ts` (1 test,
round 2) both pass. Full regression after both rounds' fixes: **47/47 suites, 209/209 tests**.
`tsc --noEmit` unchanged at the 58-error pre-existing baseline. Live boot clean. All newly-mounted
routes (`/stock-categories`, `/finance/payment-methods`) smoke-tested to the correct 401
unauthenticated response.
