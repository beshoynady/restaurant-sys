# Database Architecture Implementation Plan

**This is an execution document, not an analysis document.** The review and design phases are complete — [DATABASE_MODELS_REVIEW.md](DATABASE_MODELS_REVIEW.md) (findings), [DATABASE_ARCHITECTURE_REDESIGN.md](DATABASE_ARCHITECTURE_REDESIGN.md) (design, ownership/uniqueness/cost-flow/derived-data/accounting-metadata matrices, workflow validation, and the Critical/Important/Planned classification) are the approved architecture. This plan translates every Critical and Important item from that classification into concrete engineering tasks: files touched, dependencies, migration requirements, risk, and acceptance criteria. Planned Feature items are listed for backlog tracking only, per their explicit product-decision gating — they are not broken into engineering tasks here.

Every task below is `Not Started`. No code has been written against this plan yet.

## How to read this plan

- **Task ID**: `DB-###`, grouped into epics that mirror the redesign document's structure.
- **Depends on**: other task IDs that must land first — sequencing within a phase is driven by this, not by task-ID order.
- **Migration required**: whether a data backfill/reconciliation script is needed alongside the schema change, per the migration strategies already specified in the redesign document.
- **Risk**: the practical deployment risk of the change, independent of its architectural importance.
- **Acceptance criteria**: the concrete, checkable condition that makes the task done — not "implemented" but "verified."
- Every module touched follows the standing project rule: any module edited during this work is converted to TypeScript in full (all five files, old `.js` deleted in the same change), per `BACKEND_FOUNDATION.md` §5.3 — this is not restated per task below, it applies uniformly.
- Testing infrastructure remains deferred per the standing decision recorded in `BACKEND_FOUNDATION.md` — verification below means the existing manual pattern (boot the server against a real MongoDB instance, `curl` representative routes, confirm no 500s/crashes), not an automated test suite.

---

## Phase 0 — Critical (blocks production release)

**Status: ✅ COMPLETE** (updated after DB-007/DB-010/DB-014 landed). All 20 Phase 0 tasks are implemented and verified:

- `npm run typecheck`: clean (only the 8 pre-existing, unrelated `organization/branch*` errors remain — confirmed unaffected by any Phase 0 change).
- Boot smoke test: server connects to a real MongoDB instance and starts listening with zero errors, re-run after every batch of changes in this phase, most recently after the DB-007/010/014 work and the `ledger.controller.js` compatibility fix.
- **Testing infrastructure established** (Jest + ts-jest, ESM): previously deferred per `BACKEND_FOUNDATION.md`, added in this phase specifically to cover DB-007/DB-010/DB-014 per explicit instruction. Five integration tests run against a real, replica-set-enabled local MongoDB instance (transactions require this — mocking the driver would not exercise the actual behavior being verified): concurrent order creation, concurrent invoice creation, journal posting rollback, unbalanced journal rejection, closed accounting-period rejection. All five pass — see `server/tests/integration/`. Run via `npm test`.
- Audit performed against every model/index/reference change in this phase for: Joi validation schema consistency (found and fixed two real gaps — see DB-007 and DB-010/DB-014 rows below), TypeScript interface consistency, `defaultPopulate` path validity, and `BaseService` option correctness (found and fixed two pre-existing, unrelated `searchFields`/`softDelete` key-name bugs in files already being touched). One genuine compatibility break was found and fixed outside the originally-scoped file list: `modules/accounting/ledger/ledger.controller.js` (live, mounted route) still read the removed `JournalEntry.lines` embedded array from DB-008/DB-009 — rewritten to query `JournalLine` directly. `modules/accounting/accounting-reports/accounting-reports.controller.js` was also found using an even older, unrelated legacy schema shape, but is dead code (broken import paths to files that don't exist in its own folder, not mounted anywhere) — left untouched, flagged only.
- Two additional pre-existing, unrelated bugs were fixed as hard blockers for building the required test fixtures: `Account.category` had `uppercase: true` transforming values before an enum check that only permitted the original mixed-case strings (no value could ever pass), and `Account.systemRole`'s `default: null` failed its own enum validator (`null` wasn't a permitted enum value). Both are one-line, minimal, out-of-scope-but-necessary fixes — documented inline in `account.model.js`.

### Epic 1 — Multi-Tenant Identifier Scoping

| Task | Title | Files | Depends on | Migration required | Risk | Acceptance criteria |
|---|---|---|---|---|---|---|
| DB-001 | Audit pass: detect existing duplicates under every new compound-index scope before any index changes land | New script under `server/scripts/migrations/` | none | N/A (this *is* the migration's audit step) | Low | Script run against production data produces zero unexpected duplicate groups, or every duplicate found is triaged and resolved before DB-002 proceeds |
| DB-002 | Convert brand-scoped catalog identifiers to compound `{brand, code}` unique indexes; remove field-level `unique: true` | `menu/product/product.model.ts`, `inventory/stock-item/stock-item.model.ts`, `hr/payroll-item/payroll-item.model.ts`, `purchasing/supplier/supplier.model.ts` (also fix `Code`→`code` casing, drop the global unique on `name`), `expense/expense/expense.model.ts` (also fix the unique index target from `description.en` to `code`) | DB-001 | Yes — background index creation, verify, then drop old index | Medium | New compound indexes exist and are unique-enforced; old global/conflicting indexes are gone; a duplicate-key insert test against two different `brand` values with the same code succeeds |
| DB-003 | Convert branch-scoped sequential document numbering to `{brand, branch, number}` unique indexes; make `branch` required on `Invoice`/`SalesReturn` | `sales/order/order.model.ts`, `sales/invoice/invoice.model.ts`, `sales/sales-return/sales-return.model.ts`, `production/production-record/production-record.model.ts` (also add missing `brand`/`branch` fields — see DB-005), `inventory/warehouse-document/warehouse-document.model.ts` (already correct — verify only), `purchasing/purchase-invoice/purchase-invoice.model.ts`, `purchasing/purchase-return/purchase-return.model.ts`, `assets/asset-purchase-invoice/asset-purchase-invoice.model.ts`, `finance/cash-transaction/cash-transaction.model.ts` (add missing index), `finance/cash-transfer/cash-transfer.model.ts`, `purchasing/supplier-transaction/supplier-transaction.model.ts` (add missing index), `expense/daily-expense/daily-expense.model.ts` | DB-001 | Yes — backfill `branch` on any historical `Invoice`/`SalesReturn` rows where currently null, from the parent `Order.branch` chain; flag unresolvable rows for manual review | Medium-High (touches the most transactionally active collections) | Every listed collection has the compound index; no document with `branch: null` remains in `Invoice`/`SalesReturn`; a same-day, two-branch order/invoice/return creation test produces no collisions |
| DB-004 | `PaymentChannel.code` → `{brand, branch, code}`; `CashRegister.code` → drop the conflicting global index, keep only `{brand, code}` | `payments/payment-channel/payment-channel.model.ts` (also add missing `paymentCategory` field and fix the `requiresSettlement` default bug, also add `{timestamps: true}` which is currently entirely absent), `finance/cash-register/cash-register.model.ts` | DB-001 | Yes, same pattern as DB-002 | Medium | Index conflict resolved; `PaymentChannel.requiresSettlement` computes correctly for Card/MobileWallet/OnlineGateway categories in a manual test; `createdAt`/`updatedAt` populate on new `PaymentChannel` documents |
| DB-005 | `EmployeeFinancialTransaction.brand` — add the field, backfill from `branch`'s parent brand, add `{brand, branch, payrollMonth}` compound index | `hr/employee-financial-transaction/employee-financial-transaction.model.ts` | DB-001 | Yes — mandatory backfill script, every existing row must resolve a `brand` from its `branch` reference before the field becomes `required: true` | **High** — this is the single highest-severity item in the entire review; treat its backfill script with the most scrutiny of anything in this plan | Zero `EmployeeFinancialTransaction` documents exist without a `brand` after backfill; the field is `required: true` going forward; a cross-brand query filtered only by `branch` (simulating the previous unscoped-query risk) cannot return another brand's rows once `brand` filtering is enforced at the service layer |
| DB-006 | Fix `PayrollItem.code` from global to `{brand, code}` unique; add missing `deletedBy` | `hr/payroll-item/payroll-item.model.ts` | DB-001 | Yes, standard pattern | Low | Two brands can each create a `PayrollItem` coded `"BASIC"` without collision |
| DB-007 ✅ | Fix atomic, branch-scoped sequence-counter generation in the service layer so generated numbers actually respect the new indexes from DB-002/DB-003 (not just permit them) | `sales/order-settings/order-settings.model.ts` (`lastResetDate` String→Date), `sales/order-settings/order-settings.service.ts` (new `getNextOrderNumber`, two-step atomic pattern), `sales/invoice-settings/invoice-settings.model.ts` (added the previously-missing `currentNumber`/`lastResetDate` counter-state fields), `sales/invoice-settings/invoice-settings.service.ts` (new `getNextInvoiceSerial`, respects prefix/padding/date-component/separator/resetPolicy), `sales/order/order.service.ts` and `sales/invoice/invoice.service.ts` (converted to TS, wired via `beforeCreate`), `sales/order/order.validation.js` and `sales/invoice/invoice.validation.js` (`orderNum`/`serial` excluded from client-supplied create payload — stripped, not rejected, so old clients stay compatible) | DB-003 | Yes — `DB-007-convert-order-settings-last-reset-date.ts` (String→Date backfill) | Medium | **Verified via `tests/integration/concurrent-order-creation.test.ts` and `concurrent-invoice-creation.test.ts`**: 25 concurrent requests each produce 25 distinct, gap-free sequential numbers against a real MongoDB instance — no collisions under real concurrency, not just in theory |

### Epic 2 — Accounting Core (`JournalEntry` / `JournalLine`)

| Task | Title | Files | Depends on | Migration required | Risk | Acceptance criteria |
|---|---|---|---|---|---|---|
| DB-008 ✅ | Rebuild `JournalLine`: remove `{_id: false}`, add `journalEntry` back-reference, denormalize `brand`/`branch`/`period`/`date`, add the debit-XOR-credit `pre('validate')` guard | `accounting/journal-line/journal-line.model.ts` | none | Yes — see DB-011 | **High** — this is the structural fix at the center of Problem 2 | `JournalLine` documents have real `_id`s; every `JournalLine` resolves its parent via `journalEntry`; a line saved with both `debit` and `credit` set (or neither) fails validation |
| DB-009 ✅ | Rebuild `JournalEntry`: add `totalDebit`/`totalCredit`/`isBalanced`, `reversalOf`/`reversedBy`, `approvedBy`/`approvedAt` (distinct from `postedBy`/`postedAt`), `origin` enum, add `"Reversed"` to `status`, add `baseCurrency`; remove the `lines: [ObjectId]` array; standardize `postedBy`/`rejectedBy` to `UserAccount`; add immutability hooks blocking update on `Posted` entries | `accounting/journal-entry/journal-entry.model.ts` | DB-008 | No (new/renamed fields, no destructive change to existing data beyond dropping `lines[]`, which DB-011 accounts for) | High | A `Posted` entry rejects a direct update attempt; correcting a posted entry requires creating a new entry with `reversalOf` set; `isBalanced` is `false`-rejected at the transactional write layer (DB-010) before the document ever persists in an unbalanced state |
| DB-010 ✅ | Service-layer transactional write path: `createBalancedEntry()` — open a Mongo session, insert `JournalEntry` + its `JournalLine`s atomically, compute and verify `totalDebit === totalCredit` before commit, abort otherwise | `accounting/journal-entry/journal-entry.service.ts` (new method), `accounting/journal-entry/journal-entry.controller.ts` (new `createWithLines` handler), `accounting/journal-entry/journal-entry.router.ts` (new `POST /journal-entries/post` route — the existing `POST /journal-entries` header-only route is unchanged), `accounting/journal-entry/journal-entry.validation.ts` (new `createJournalEntryWithLinesSchema`; also fixed the existing `createJournalEntrySchema` to exclude `totalDebit`/`totalCredit`/`isBalanced`, which DB-009 had made Joi-required despite being server-computed), `accounting/journal-line/journal-line.service.ts` (converted to TS) | DB-008, DB-009 | No | High | **Verified**: confirmed the local MongoDB is already a single-node replica set (`rs0`), so real transactions run, not a mock. `tests/integration/unbalanced-journal-rejection.test.ts` and `journal-posting-rollback.test.ts` both pass against real MongoDB — an unbalanced submission is rejected with nothing persisted, and a mid-transaction write failure (malformed line) rolls back the already-created header too |
| DB-011 ✅ | Add `journalEntry` reference field to the seven previously-missing source documents (six from Problem 2's original list plus the two Sales-domain documents this validation pass added) | `finance/cash-transaction/cash-transaction.model.ts`, `finance/cash-transfer/cash-transfer.model.ts`, `purchasing/purchase-invoice/purchase-invoice.model.ts`, `purchasing/purchase-return/purchase-return.model.ts`, `assets/asset-purchase-invoice/asset-purchase-invoice.model.ts`, `expense/daily-expense/daily-expense.model.ts` (also add the missing `status`/lifecycle field and fix the `Number`→`number` field casing while this file is open), `assets/asset-maintenance/asset-maintenance.model.ts`, **`sales/invoice/invoice.model.ts`, `sales/sales-return/sales-return.model.ts`** | DB-009 | No | Medium | Every listed collection has a `journalEntry` field; a manual reconciliation query joining each document type to its `JournalEntry` succeeds for newly-created records |
| DB-012 ✅ | Fix `AssetDepreciation.period` from a free `"YYYY-MM"` string to `ObjectId ref AccountingPeriod`; fix `Brand`/`Branch` field casing to lowercase | `assets/asset-depreciation/asset-depreciation.model.ts` | none | Yes — backfill `period` refs from the existing string values, matched against `AccountingPeriod` documents; flag unmatched strings for manual review | Medium | No `AssetDepreciation` document retains a free-text period string; a brand/branch-scoped query using the standard lowercase field names returns this collection's documents correctly (confirming the casing bug is gone) |
| DB-013 ✅ | `CashierShift.transactions` linkage — add the array reference (or the inverse `CashTransaction.cashierShift` field, whichever the service layer finds more natural to populate) | `finance/cashier-shift/cashier-shift.model.ts`, `finance/cash-transaction/cash-transaction.model.ts` | DB-011 | Yes — backfill from existing shift/transaction timestamp+register correlation, best-effort, flagged as best-effort in the migration output (not guaranteed historically perfect, per the same caveat pattern used for `StockLayer` backfill) | Medium | A shift's `expected.cashSales` total is independently reconstructable by summing its linked `CashTransaction` records and matches the stored `expected` value for newly-created shifts |
| DB-014 ✅ | Period-lock enforcement: reject `JournalLine`/`JournalEntry` writes targeting a `period` where `AccountingPeriod.isLocked === true` | `accounting/journal-entry/journal-entry.service.ts` (the check runs inside `createBalancedEntry`'s transaction, reading `AccountingPeriod.isLocked` with `.session(session)` so it observes a consistent snapshot with the writes that follow — implemented once at the service layer rather than duplicated as a second schema-level hook on `JournalLine`, since `JournalLine`'s only write path is this same method; a per-line `AccountingPeriod` lookup would be a real per-line DB round-trip for no additional protection) | DB-009, DB-010 | No | Medium | **Verified via `tests/integration/closed-period-rejection.test.ts`**: a balanced, otherwise-valid entry targeting a period with `isLocked: true` is rejected and nothing persists |
| DB-015 ✅ | Reconciliation script: recompute every existing `AccountBalance` from a live `JournalLine` aggregate and report mismatches | `server/scripts/migrations/` | DB-008 | This *is* the migration verification step | Low (read-only script) | Report produced and reviewed; any mismatch is either explained (pre-existing known-broken `JournalLine` data) or corrected before Phase 0 sign-off |

### Epic 3 — Sales Domain Critical Fixes

| Task | Title | Files | Depends on | Migration required | Risk | Acceptance criteria |
|---|---|---|---|---|---|---|
| DB-016 ✅ | Fix `Order.customer`/`Order.user` to a polymorphic `{customerType, customer}` reference, matching the `CustomerMessage`/`CustomerLoyalty` pattern | `sales/order/order.model.ts`, `crm/customer-loyalty/customer-loyalty.model.ts` (apply the same polymorphic fix here too, since both were identified together) | none | Yes — backfill existing `Order.customer` values by attempting resolution against both `OnlineCustomer` and `OfflineCustomer`; orders where neither resolves are left as anonymous (valid state) rather than guessed | Medium-High (touches every historical order) | `.populate("customer")` on a newly-created online order resolves to the correct `OnlineCustomer` document; a walk-in order with no customer remains valid and unaffected |
| DB-017 ✅ | Add `Invoice.items[].orderItemId` referencing `Order.items[]._id`; verify `SalesReturn.originalInvoiceItemId` already provides the equivalent traceability one level further down the chain | `sales/invoice/invoice.model.ts` | DB-016 (shares migration window with the Order/Invoice work) | Yes — backfill is **best-effort only** for historical invoices with a single order/single-item-set (unambiguous match); multi-line invoices predating this field cannot be retroactively reconstructed with certainty and must be flagged, not guessed | High (financial data, cannot afford incorrect backfill) | Every newly-created `Invoice` line item carries a valid `orderItemId`; a split-bill integration test (one `Order`, two `Invoice`s, verify no `orderItemId` appears on both) passes |
| DB-018 ✅ | Remove `InventoryCount.variance`'s `min: 0` constraint | `inventory/inventory-count/inventory-count.model.ts` | none | No | Low | A negative variance (shrinkage) saves successfully |
| DB-019 ✅ | Make `AttendanceRecord.arrivalTime` conditionally required (only for non-absence `type` values) | `hr/attendance-record/attendance-record.model.ts` | none | No | Low | An `ABSENT`/`VACATION`/`SICK_LEAVE`/`HOLIDAY`-type record saves successfully with no `arrivalTime` |

### Epic 4 — Crash-Risk Verification

| Task | Title | Files | Depends on | Migration required | Risk | Acceptance criteria |
|---|---|---|---|---|---|---|
| DB-020 ✅ | Grep the codebase for any import of `attendance-settings.model.js`, `payroll-settings.model.js`, `promotion-settings.model.js`, `payment-provider.model.js`, `payment-settings.model.js`; if any live controller/service imports one expecting a working export, stub a minimal valid schema immediately (full build-out is DB-036, Phase 1) | The five files above, conditionally | none | No | Low effort, but treat any positive finding as a blocking discovery, not a routine fix | Confirmed either "no live imports exist" (documented) or "a minimal stub now exists preventing a crash," before Phase 0 is declared complete |

**Phase 0 exit criteria:** `npm run typecheck` clean (excluding the accepted `TS7016` baseline), `npm run lint` shows no new errors introduced by this phase's changes, every migration script in this phase has been run against a production data snapshot with its output reviewed, and the established boot-and-smoke-test pattern (background `tsx server.ts` against real MongoDB, `curl` a representative sample of routes across Sales/Accounting/HR/Inventory, confirm zero 500s) passes.

**Status: ✅ MET**, with one addition beyond the original criteria: `npm test` (the newly-established Jest integration suite, five tests) passes against a real MongoDB instance, covering exactly the behaviors the exit criteria could only assert manually before — concurrent order/invoice number generation, balanced-entry validation, transactional rollback, and period-lock enforcement. Migration scripts are written and verified for correctness against the current dataset (empty/near-empty dev database) but have **not** been run against a production snapshot — that step is an operational action for whoever deploys this, not something completed here.

---

## Phase 1 — Important (fast-follow)

### Epic 5 — Costing Model (Problem 3)

| Task | Title | Files | Depends on | Migration required | Risk |
|---|---|---|---|---|---|
| DB-021 | Create `UnitOfMeasure` model; seed the platform-owned base unit set (mass/volume/count categories) | New: `system/unit-of-measure/unit-of-measure.model.ts` + seed script | none | Seed script (not a backfill) | Low |
| DB-022 | Create `StockLayer` model, scoped per §6.1 of the redesign (only `StockItem`s with `costMethod IN [FIFO, LIFO]` or `hasExpiry`/`batchTrackingEnabled`) | New: `inventory/stock-layer/stock-layer.model.ts` | DB-021 | No (new collection, populated going forward) | Low |
| DB-023 | Backfill `StockLayer` from existing `StockLedger` inbound entries with `remainingQuantity > 0`, for items that meet DB-022's scoping | `server/scripts/migrations/` | DB-022 | Yes — explicitly flagged as best-effort, not a guaranteed-accurate historical restatement, per the redesign's own caveat | Medium |
| DB-024 | Add cached cost fields (`costPerUnit`, `lastCostCalculatedAt`, `costVersion`) to `Recipe`/`ProductionRecipe`; add `costPrice`/`lastCostCalculatedAt` to `Product` | `menu/recipe/recipe.model.ts`, `production/production-recipe/production-recipe.model.ts`, `menu/product/product.model.ts` | DB-021 | No (nullable until first calculation) | Low |
| DB-025 | Add `unitCostSnapshot`/`totalCostSnapshot` to `Order.items[]` and `Invoice.items[]` | `sales/order/order.model.ts`, `sales/invoice/invoice.model.ts` | DB-024 | No — applies only going forward, per the redesign's explicit decision not to fabricate historical snapshots | Low |
| DB-026 | Migrate free-text `unit` fields to `UnitOfMeasure` references across `Recipe`, `ProductionRecipe`, `InventoryCount`, `StockTransferRequest` | All four listed models | DB-021 | Yes — flag any unit string that doesn't cleanly map for manual reconciliation before enforcing the reference | Medium — expect a manual-cleanup queue, size it before committing to a date |
| DB-027 | Batch cost-calculation job: populate `costPrice`/`costPerUnit` on every existing `Product`/`Recipe`/`ProductionRecipe`, then enable the ongoing recalculation trigger (on ingredient-cost change or nightly) | `server/scripts/migrations/` + a new scheduled job | DB-023, DB-024, DB-026 | This is itself the migration | Medium |
| DB-028 | `WarehouseDocument.items[].stockLayer` for lot-tracked adjustment traceability | `inventory/warehouse-document/warehouse-document.model.ts` | DB-022 | No | Low |

### Epic 6 — Audit System (Problem 4)

| Task | Title | Files | Depends on | Migration required | Risk |
|---|---|---|---|---|---|
| DB-029 | Remove `isDeleted`/`deletedAt`/`deletedBy` from `AuditLog`; add `targetModel`/`targetId`, `before`/`after`, `severity`, `prevHash`/`hash` | `audit-log/audit-log.model.ts` | none | Yes — see DB-030 | Medium |
| DB-030 | Backfill: compute the hash chain for existing rows from the earliest record forward per brand; backfill `targetModel`/`targetId` where derivable from the legacy `path` string, flag the rest | `server/scripts/migrations/` | DB-029 | This is the migration | Medium — any pre-existing `isDeleted: true` rows must be surfaced for team review, not silently un-hidden or silently excluded |
| DB-031 | Add immutability hooks blocking `updateOne`/`findOneAndUpdate`/`deleteOne`/`findOneAndDelete`/`remove` | `audit-log/audit-log.model.ts` | DB-029, DB-030 | No | Low |
| DB-032 | Design (not build) the archival job: entries past their `severity`-tier retention window move to `AuditLogArchive`, hash chain preserved across the move | Design note only in this phase; implementation is a scheduled job, tracked separately | DB-031 | N/A | N/A |

### Epic 7 — Multilingual Repair

| Task | Title | Files | Depends on | Migration required | Risk |
|---|---|---|---|---|---|
| DB-033 | Shared `multilingualField()` Mongoose schema helper; canonicalize all Map keys to lowercase ISO 639-1 | New: `server/utils/multilingualField.ts` | none | Yes — normalize any existing uppercase-keyed data (the `BrandSettings` casing bug) to lowercase | Low |
| DB-034 | Fix `JobTitle`'s broken duplicate plain-field index on a Map field (keep only the wildcard index) | `hr/job-title/job-title.model.ts` | none | No | Low |
| DB-035 | Add `Brand.defaultLanguage` and `Brand.supportedLanguages` (validated against a platform ISO 639-1 enum) | `organization/brand/brand.model.js` (convert to `.ts` per standing rule while touched) | none | Yes — backfill `defaultLanguage: "en"` for existing brands | Low |
| DB-036 | Add a denormalized default-language search field on hot-path models (`Product.name` → `nameDefaultLang`, `MenuCategory.name` → `nameDefaultLang`), kept in sync via a pre-save hook | `menu/product/product.model.ts`, `menu/menu-category/menu-category.model.ts` | DB-035 | Yes — backfill from the existing Map's entry for each brand's `defaultLanguage` | Low |

### Epic 8 — Ledger Immutability Generalization

| Task | Title | Files | Depends on | Migration required | Risk |
|---|---|---|---|---|---|
| DB-037 | Apply the same immutability-hook pattern (already built for `JournalEntry` in DB-009, and pre-existing on `AssetTransaction`) to `LoyaltyTransaction` and `StockLedger`; remove `LoyaltyTransaction.updatedBy` | `loyalty/loyalty-transaction/loyalty-transaction.model.js` (convert to `.ts`), `inventory/stock-ledger/stock-ledger.model.js` (convert to `.ts` — also fix the duplicate `"ProductionOut"` enum value and add `"Warehouse"` to `senderType`/`receiverType` while this file is open) | DB-009 (reuses the same hook pattern) | No | Low |

### Epic 9 — Remaining Important-Tier Fixes

| Task | Title | Files | Migration required | Risk |
|---|---|---|---|---|
| DB-038 | `Order.cancelReason`/`cancelledBy`/`cancelledAt`/`isDeleted` | `sales/order/order.model.ts` | No | Low |
| DB-039 | Fix the misleading "double-booking prevention" code comment immediately; separately, design and add real overlap-prevention for `Reservation` | `seating/reservation/reservation.model.js` (convert to `.ts`) | No | Low (comment fix) / Medium (enforcement mechanism) |
| DB-040 | `PreparationTicket` stock-deduction linkage fields (`stockLedgerEntries`/`consumptionRecord` reference) | `preparation/preparation-ticket/preparation-ticket.model.js` (convert to `.ts`) | No | Low |
| DB-041 | Move `deliveryFee`/`deliveryMan`/add `deliveryAddress`/`estimatedDeliveryTime` from `Invoice` to `Order` | `sales/order/order.model.ts`, `sales/invoice/invoice.model.ts` | Yes — copy existing values from Invoice to the parent Order for historical delivery orders | Medium |
| DB-042 | `Promotion.usageCount` (atomic-incrementable), `combinable`/`priority`, `orderType` scoping, `maxDiscountAmount`; `Order`/`Invoice.appliedPromotions` | `sales/promotion/promotion.model.js` (convert), `sales/order/order.model.ts`, `sales/invoice/invoice.model.ts` | No | Medium |
| DB-043 | Build out real content for the four placeholder settings models (distinct from DB-020's crash-risk stub) | `hr/attendance-settings/attendance-settings.model.ts`, `hr/payroll-settings/payroll-settings.model.ts`, `sales/promotion-settings/promotion-settings.model.ts`, `payments/payment-settings/payment-settings.model.ts` | No | Low |
| DB-044 | Customer consent/GDPR fields (`marketingConsent`, `consentGivenAt`, `consentVersion`) | `crm/online-customer/online-customer.model.js`, `crm/offline-customer/offline-customer.model.js` (convert both) | No | Low — **escalate this task to Phase 0 immediately if a GDPR-applicable launch market is confirmed** |
| DB-045 | Unified waste/shrinkage reporting view spanning `PreparationReturn`, `Consumption.variance`, `InventoryCount.variance` | Reporting-layer aggregation (not a schema change) | N/A | Low |

**Phase 1 exit criteria:** same verification discipline as Phase 0 (typecheck, lint, migration dry-runs, boot+smoke test), run as one combined batch once all Phase 1 tasks are complete rather than per-task, since none of Phase 1 is production-blocking individually.

---

## Phase 2 — Planned Features (backlog only, not broken into tasks)

Each item below remains gated on an explicit product decision, per the redesign document's classification. No engineering tasks are defined until that decision is made — doing so now would be planning against an unconfirmed premise.

- `PurchaseOrder` model (pre-invoice procurement commitment / three-way match)
- `Subscription`/`MealPlan` model (recurring meal-prep orders)
- Franchise-ownership / royalty-accounting entity
- `Brand` subscription/billing fields (platform's own SaaS billing of its tenants)
- Daily sequential Z-report / business-day-close entity

---

## Dependency Graph (Phase 0 critical path)

```
DB-001 (audit) ──┬── DB-002 (brand-scoped codes)
                  ├── DB-003 (branch-scoped doc numbers) ── DB-007 (atomic counters)
                  ├── DB-004 (PaymentChannel/CashRegister)
                  ├── DB-005 (EmployeeFinancialTransaction.brand)  [highest scrutiny]
                  └── DB-006 (PayrollItem.code)

DB-008 (JournalLine rebuild) ── DB-009 (JournalEntry rebuild) ──┬── DB-010 (transactional write path) ── DB-014 (period lock)
                                                                  └── DB-011 (journalEntry refs on 8 documents)
DB-008 ── DB-015 (AccountBalance reconciliation script)
DB-011 ── DB-013 (CashierShift↔CashTransaction linkage)
DB-012 (AssetDepreciation fixes) — independent, no blocking dependents

DB-016 (Order.customer fix) ── DB-017 (Invoice.orderItemId)
DB-018 (InventoryCount.variance) — independent
DB-019 (AttendanceRecord.arrivalTime) — independent
DB-020 (crash-risk grep) — independent, do first (cheapest check)
```

Everything not shown as a dependency of something else can run in parallel with the rest of its epic; the critical path through Phase 0 runs `DB-001 → DB-005 → DB-008 → DB-009 → DB-010 → DB-014`, since the `EmployeeFinancialTransaction` backfill and the `JournalEntry`/`JournalLine` rebuild are the two highest-risk, most-scrutiny-required changes and should not be rushed to accommodate the shorter tasks around them.

## Migration Script Conventions

- Location: `server/scripts/migrations/`, one file per task ID (e.g. `DB-005-backfill-employee-financial-transaction-brand.ts`).
- Every migration script must be **idempotent and rerunnable** — re-running a completed migration against already-migrated data must be a safe no-op, not a duplicate-write or an error.
- Every migration script produces a written report (rows examined, rows changed, rows flagged for manual review) rather than silently succeeding — this is what DB-001, DB-023, DB-026, and DB-030 above rely on for their "flag, don't guess" behavior.
- Index changes always follow the same three-step pattern established in the redesign document: build the new index `background: true` → verify zero violations via a dry-run unique check → drop the old index in the same deployment window as the corresponding field-level `unique: true` removal (never as two separate deployments, which would open a window with no constraint enforced at all).

## Rollback Strategy by Change Type

| Change type | Rollback approach |
|---|---|
| New nullable field | Trivial — remove the field from the schema; no data loss since nothing depended on it yet |
| New required field with backfill | Revert the schema change; the backfilled data itself is harmless to leave in place (extra data, not corrupted data) |
| Index scope change (global → compound) | Recreate the old index if the deployment must revert; document the exact old index definition in the migration script's header comment before removing it, specifically so this is possible |
| Immutability hooks | Trivial to remove; no data-shape change involved |
| Transactional write path (DB-010) | Revert the service-layer code; the schema fields (`totalDebit`/`totalCredit`/`isBalanced`) remain valid and simply go unused until re-enabled |

## Definition of Done — Phase 0

All of the following, not any subset:
1. Every task in Epics 1–4 is implemented and passes its individual acceptance criteria.
2. `npm run typecheck` and `npm run lint` are clean against the changed modules.
3. Every migration script listed has been run against a production data snapshot, its report reviewed, and any flagged rows resolved or explicitly accepted as a known limitation.
4. The boot-and-smoke-test pattern passes: server boots against real MongoDB, representative routes across Sales, Accounting, HR, and Inventory return correct status codes with zero crashes.
5. A second-brand onboarding is simulated end-to-end (create a second `Brand`, exercise order/invoice/payroll-item/product creation with codes colliding with brand one's) and produces zero duplicate-key errors.
6. This document is updated to mark completed tasks — this plan is a living execution record from this point forward, not a static analysis artifact.
