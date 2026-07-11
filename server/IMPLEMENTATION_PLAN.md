# Implementation Plan — Restaurant ERP Execution Roadmap

Status: **Planning document. Nothing in this file has been implemented.** This converts the approved [ARCHITECTURE_REVIEW.md](ARCHITECTURE_REVIEW.md) into an execution sequence. No code has been modified, renamed, or moved to produce this document.

Reference chain: `docs/PROJECT_VISION_ar.md` (product vision) → `server/BACKEND_FOUNDATION.md` (infrastructure, already implemented) → `server/ARCHITECTURE_REVIEW.md` (business/domain architecture, analysis only) → **this document** (execution order).

---

## 1. Foundation Tasks

Everything here must exist before any business-module workflow is built on top of it — each task lists exactly why, matching it to the architecture findings that require it.

| Task | Why required | Modules that depend on it | Impact | Risk |
|---|---|---|---|---|
| **F1. Resolve the 4 live ownership conflicts** (Loyalty tier thresholds, Tax inclusivity, Delivery policy, Employee leave-policy defaults — Architecture Review §4) | Building Sales/Loyalty/HR workflows on top of two disagreeing sources of truth guarantees the disagreement gets baked into every transaction created afterward | Loyalty, Sales, HR, CRM | High — touches live schemas and possibly existing data | **Medium** (requires a data-reconciliation decision per conflict, not just a code change) |
| **F2. Fix `loyalty-transaction` settings bypass** (Critical, violates Business Rule #14) | Only wallet-mutation bug with active runtime risk today; must not be replicated as a pattern when other domains get their own transaction/ledger modules | Loyalty | Low — isolated to one service file | **Low** |
| **F3. Add RBAC + `checkModuleEnabled` to Purchasing routers** | Same security-gate pattern already applied everywhere else; Purchasing was simply missed in the original foundation pass | Purchasing | Low — mechanical, same pattern already proven safe on 38+ other routers | **Low** |
| **F4. Journal Entry debit=credit validation + Accounting Period lock enforcement** (Business Rules #7, #8) | Every later Accounting/Financial-Closing task is meaningless without these two invariants holding | Accounting, and transitively every module that will eventually post to it | Medium | **Medium** (needs care around existing unposted-but-unbalanced test data, if any) |
| **F5. Design (not build) the shared Approval Framework** | Six domains (Purchasing, Sales-Return, Preparation-Return, Stock-Transfer, Journal-Entry, Discount) independently want role+threshold-based approval; deciding the shape once now avoids six divergent implementations during Phases 2–3 | Purchasing, Sales, Preparation, Inventory, Accounting, System | High (shapes many future modules) | **Medium** (a design decision with wide blast radius if gotten wrong — worth a dedicated review before F5 is marked done) |
| **F6. Retire the two duplicate/legacy trees** (`system/audit-log`, `modules/setup/`) | Removes the `OverwriteModelError` risk and the file-name confusion (`modules/setup/system-setup.service.js` vs `modules/system-setup/setup.service.js`) documented in the Architecture Review | None currently — confirmed zero external references to either dead tree | Low | **Low** (already confirmed nothing imports them; still worth a final grep immediately before deletion since this document doesn't re-verify a live snapshot) |
| **F7. Naming normalization** (`tax-settings`↔`tax-config`, `purchasing-settings`↔`purchase-settings`, `service-charge-settings`↔`service-charge`, `accounting-settings`↔`accounting-setting`, `rerturn-sales-settings` typo, `cashTransaction`/`InventorySetting`/`EmployeeSetting` casing) | Discoverability only — no functional bug. Safe to defer; grouped here because it's cheapest to do *before* other work touches these same files repeatedly | None — purely cosmetic | Low | **Low** (folder renames don't change API routes since routes are declared independently of folder names — but every import path referencing the old path must be updated in the same commit) |
| **F8. Decide Printing + Fiscal-Printer scope** (Architecture Review Open Questions / §10) | Several Phase 2 workflow steps (Invoice close → print receipt) implicitly assume Printing exists; deciding "build now / defer to Phase 5 hardware integration only" changes what Phase 2 needs to include | Sales, Preparation | Medium (a scope decision, not code) | **Low** |
| **F9. Add an `Inventory Reservation` primitive to the domain model** (new concept, Architecture Review §9) | Needed before Order↔Inventory integration (Phase 2) can be built correctly — without it, two simultaneous orders can both claim the last unit | Inventory, Sales | Medium | **Low** (purely additive — a new collection/field, doesn't change existing behavior) |
| **F10. Testing infrastructure (Jest)** | Already decided (Jest, backend-only — see project memory). Must exist before F1–F9 above are executed, so each fix can be verified without a manual smoke-test pass every time | Every module touched from this point forward | High (enables everything after it) | **Low** |

**Sequencing within Foundation:** F10 (testing infra) first, then F6/F3/F7 (cheap, isolated, no design decisions) in parallel, then F2 (isolated bug fix), then F1/F4 (need care, touch live data/business rules), then F5/F8/F9 (design decisions that shape Phase 2) last, since they benefit from F1–F4 being settled first.

---

## 2. Refactoring Plan

Every architectural issue from the Architecture Review's consolidated backlog, expanded to the requested format. Nothing here is executed by this document.

| # | Title | Description | Priority | Dependencies | Risk | Affected Modules (est.) | Affected Files (est.) | Breaking Change? | Rollback Difficulty |
|---|---|---|---|---|---|---|---|---|---|
| R1 | Loyalty tier/points single source of truth | Remove or reconcile `OnlineCustomer.loyalty.{points,tier}` against `CustomerLoyalty` | Critical | F10 | Medium | 2 (crm/online-customer, loyalty/customer-loyalty) | ~4 | Yes, if the duplicate field is removed and any client reads it | Easy (feature-flaggable, revert = restore field) |
| R2 | `loyalty-transaction` reads `loyalty-settings` | Route earn/redeem/adjust through the same settings-aware path `customer-loyalty` already uses | Critical | F10 | Low | 1 (loyalty/loyalty-transaction) | ~2 | No — behavior becomes *more* correct, response shape unchanged | Easy |
| R3 | Purchasing router RBAC/module-check | Add `authorize()`/`checkModuleEnabled()` to purchase-invoice/purchase-return routers | Critical | F10 | Low | 2 | 2 | No | Trivial |
| R4 | Journal Entry balance validation | Add a `beforeCreate`/`beforeUpdate` hook (or equivalent) rejecting unbalanced entries | Critical | F10 | Medium | 1 (accounting/journal-entry) | ~2 | Possibly, if any existing unbalanced data exists | Easy (hook only, no schema change) |
| R5 | Accounting Period lock enforcement | Journal-entry creation/update checks `AccountingPeriod.status`/`isLocked` before allowing writes | High | R4 | Medium | 2 | ~3 | Possibly, for any workflow currently posting into a "closed" period | Easy |
| R6 | Tax policy single source of truth | Route Invoice/PurchaseInvoice tax calculation through `TaxConfig` instead of independent per-document flags | High | F1, F10 | Medium-High | 3 (sales/invoice, purchasing/purchase-invoice, system/tax-settings) | ~6 | Yes — tax totals may change for existing draft documents | Medium (needs a data audit before/after) |
| R7 | Delivery policy single source of truth | Establish `BranchSettings` as the sole owner; `DeliveryArea` reads/inherits rather than duplicating | High | F1, F10 | Medium | 2 (organization/branch-settings, organization/delivery-area) | ~4 | Possibly for existing delivery-area configs | Medium |
| R8 | Employee leave-policy single source of truth | `Employee` defaults derive from `employee-settings.leavePolicy` instead of hardcoded per-document defaults | High | F1, F10 | Low-Medium | 2 (hr/employee, hr/employee-settings) | ~3 | No if done as a default-resolution change, not a data rewrite | Easy |
| R9 | `hr/shift-settings` domain relocation | Move (or re-home functionally) to `finance/` next to `cashier-shift`, which is what its fields actually describe | High | F10 | Low | 2 | ~5 (model/service/controller/router/validation) | No — internal move, route path can stay stable if desired | Easy |
| R10 | Legacy tree removal: `system/audit-log`, `modules/setup/` | Delete confirmed-dead code | High | F6 (final grep) | Low | 0 live modules | ~15 files removed | No | Trivial (git revert) |
| R11 | `tax-settings`/`tax-config` naming alignment | Rename either the folder or the files so they match | High | F10 | Low | 1 | ~5 | No (import paths updated in the same change) | Easy |
| R12 | Remaining naming/casing fixes (F7 batch) | `purchasing-settings`, `service-charge-settings`, `accounting-settings`, `rerturn-sales-settings` typo, `cashTransaction`/`InventorySetting`/`EmployeeSetting` casing | Medium | F10 | Low | 6 | ~20 | No | Easy |
| R13 | State-machine enforcement (13 entities, Architecture Review §3) | Add real transition validation to Order/Invoice/Reservation/CashierShift/JournalEntry/etc. instead of free-form status fields | Medium (individually) / High (collectively, since it's why Business Logic scores 1★ almost everywhere) | F5 (approval framework informs some transitions), F10 | Medium per entity | 13 entities across ~10 modules | ~26 (2 files/entity typical) | Yes — previously-valid arbitrary status writes will start being rejected | Medium (revert per-entity is easy; doing it for all 13 at once is not recommended, see Phase plan) |
| R14 | Inventory Reservation concept | New collection/field tracking held-not-yet-deducted stock | Medium | F9, F10 | Low | 2 (inventory, sales) | ~4 | No — purely additive | Easy |

---

## 3. Module Implementation Order

Ordered by business dependency, not alphabetically — matches the dependency graph in the Architecture Review §1–2. Each entry explains the "why" for its position.

1. **Organization** (Brand/Branch) — already live; the tenant root every other module refs. Nothing else can be sequenced before this exists.
2. **IAM** (Role/UserAccount/Auth) — already live; every subsequent workflow needs an actor identity and a permission check.
3. **Foundation Tasks (§1 above)** — not a business module, but must close before step 4 for the same reason F1–F10 are ordered before any business work: later modules would otherwise be built against known-broken shared primitives.
4. **HR — Employee** (not yet full payroll) — `createdBy`/`updatedBy`/custody/decision-maker refs appear across nearly every other domain (cash-register custody, decisionBy on returns, storekeepers); needs to exist structurally before those modules can be meaningfully tested end-to-end, even though full Payroll logic comes much later (step 13).
5. **Menu** (Product/Category/Recipe) — needed before Inventory linkage (Recipe→StockItem) and before Orders can reference a real product catalog.
6. **Inventory** (StockItem/Warehouse/Inventory/StockLedger/WarehouseDocument) — needed before Purchasing (receiving) and before Orders (deduction) can be functionally completed; building Orders before Inventory exists would mean building the revenue loop twice.
7. **Purchasing** (Supplier/PurchaseInvoice/PurchaseReturn) — depends on Inventory (receiving target) and Finance (payment); also the natural home for completing the Inventory Receiving workflow from the Architecture Review.
8. **Production** — depends on Inventory + Menu/Recipe; deliberately after Purchasing since production consumes raw stock that Purchasing is what actually brings into the system.
9. **Seating** (Table/Reservation/Dining-area) — needed before Sales/Orders can assign a table; independent of Inventory/Purchasing so it can technically be built in parallel with steps 6–8, but listed here since it's a hard prerequisite for dine-in Orders specifically.
10. **Sales / Orders** — the core revenue loop; depends on Menu (5), Inventory (6), Seating (9), and Finance's Cashier Shift (11, see note) for payment context. This is the highest-value module in the entire system per the Architecture Review's Phase 2 framing.
11. **Finance / Cashier** (CashRegister/CashierShift/CashTransaction) — technically needs to exist *before* Orders can close (an Order needs an open shift to attach to), so in practice this is built alongside step 10, not strictly after it; listed at 11 to reflect that Orders is the module the business cares about, Cashier is what makes it work.
12. **Kitchen / Preparation** — depends on Orders (10) existing first, since tickets are derived from confirmed orders.
13. **HR — Payroll/Attendance/Leave** (completing step 4) — depends on Finance/Cashier (11) for shift-correlated attendance and needs the Approval Framework (F5) for leave approval.
14. **Accounting** — deliberately late: it depends on Sales (10), Purchasing (7), Finance (11), and eventually Assets (16)/Payroll (13) all producing real transactions to post. Building Accounting earlier would mean building against synthetic/placeholder data.
15. **CRM** — mostly independent of the above (only needs Organization), but sequenced here because it *enriches* the revenue loop (customer identity on an order) rather than gating it; nothing blocks building CRM earlier if there's business reason to.
16. **Loyalty** — depends on CRM (15) + Sales (10) since points are earned from real customer orders.
17. **Assets** — depends on Accounting (14) for control-account posting; low urgency relative to the revenue loop.
18. **Expense** — depends on Finance (11) + Accounting (14).
19. **Payments** (channel/method/provider integrations) — depends on Finance (11) + Accounting (14) for settlement; also the natural home for the Phase 5 payment-gateway integration.
20. **Reports** *(module doesn't exist yet — noted in the Architecture Review's RESOURCE_ENUM as `SalesReports`/`InventoryReports`/etc.)* — necessarily last, since it aggregates data from every module above.

---

## 4. Settings Implementation Plan

Every settings module, tagged with the phase (from §7 below) its owning workflow lands in — not redesigned, only scheduled. Full field-by-field ownership already exists in Architecture Review §6 (Settings Ownership); this table adds the "when."

| Settings Module | Belongs to | Implement when | Services that should read it | Workflow it gates |
|---|---|---|---|---|
| `accounting-settings` | Accounting | Phase 3 (with Accounting module) | `journal-entry.service.js`, future posting services from Sales/Purchasing/Payroll/Assets | Journal posting, control-account resolution, period lock |
| `inventory-settings` | Inventory | Phase 2 (with Inventory deduction logic) | `inventory.service.js`, `order.service.js` (deduction trigger) | Negative-stock policy, deduction timing, production auto-approval |
| `order-settings` | Sales | Phase 2 (with Order↔Invoice computation) | `order.service.js` | Cancel/edit/split-payment policy |
| `invoice-settings` | Sales | Phase 2 for numbering/rounding fields; Phase 5 for the printing-display fields | `invoice.service.js`; printing connector (Phase 5) | Invoice totals rounding now; receipt layout later |
| `sales-return-settings` | Sales | Phase 3 (with Sales Return workflow) | `sales-return.service.js` | Return window, approval threshold |
| `discount-settings` | Sales | Phase 2 (with Order/Invoice totals) | `order.service.js`/`invoice.service.js` | Manual discount ceiling + approval gate |
| `service-charge-settings` | Sales | Phase 2 (with Invoice totals) | `invoice.service.js` | Service-charge calculation |
| `tax-settings` | System/Accounting | Phase 2 (with Invoice totals) — this is also where R6 (single source of truth) must land | `invoice.service.js`, `purchase-invoice.service.js` | Tax rate + inclusive/exclusive method |
| `purchasing-settings` | Purchasing | Phase 3 (with Procure-to-pay) | `purchase-invoice.service.js`, `purchase-return.service.js` | Approval gate, negative-stock prevention on receipt, refund-type defaults |
| `preparation-ticket-settings` | Preparation | Phase 2 (with Kitchen ticket generation) | `preparation-ticket.service.js` | Auto-send-to-waiter, timeout, merge policy |
| `preparation-return-settings` | Preparation | Phase 3 (with waste/return workflow) | `preparation-return.service.js` | Waste/return/resellable decision policy |
| `loyalty-settings` | Loyalty | Already partially live — extend in Phase 3 (expiry/bonus fields) when those features are built | `customer-loyalty.service.js` (already does), `loyalty-transaction.service.js` (after R2) | Point economics |
| `employee-settings` | HR | Phase 3 (with Payroll/probation/employee-code features); leave-policy fields specifically land with R8 in Foundation | `employee.service.js`, future payroll/probation jobs | HR policy defaults |
| `shift-settings` (post-R9 relocation) | Finance | Phase 2 (with Cashier Shift close validation) | `cashier-shift.service.js` | Auto-open/close, variance tolerance |
| `brand-settings` | Organization | `modules.*` already live; `maintenanceMode` needs Phase 1 gating middleware; `seo`/`socialMedia` are frontend-only, no backend phase needed | `checkModuleEnabled` (already), a future maintenance-mode middleware | Feature toggles (live), maintenance gating (planned) |
| `branch-settings` | Organization | Phase 2 (with Order/Reservation availability checks) — also where R7 (delivery-policy single ownership) lands | `order.service.js`, `reservation.service.js` | Operating hours, service availability, delivery/policy ownership |
| `notification-settings` | System | Phase 4 (with the Event/Workflow Engine) | The future Notifications interface (Architecture Review §6) | Event→role→channel routing |
| `print-settings` | System | Phase 5 (with printing hardware integration), pending the F8 scope decision | The future Printing interface | Receipt/printer hardware config |

---

## 5. Integration Plan

Per domain: incoming/outgoing dependencies (already established in Architecture Review §1–2 and §7 event catalog), condensed here with the integration-specific columns requested.

| Module | Incoming deps (reads from) | Outgoing deps (feeds) | Business events | Required integration (internal) | Future integration (external, Phase 5) |
|---|---|---|---|---|---|
| Organization | — | everything | `BrandCreated` | — | — |
| IAM | Organization | everything (auth) | `UserLoggedIn` | — | Biometric attendance (auth-adjacent, HR-owned) |
| HR | Organization, IAM | Finance, Payroll, Accounting | `EmployeeClockInOut`, `LeaveRequestApproved` | Approval Framework (F5) | Biometric attendance hardware |
| Menu | Organization, Inventory (recipe) | Sales | — | — | QR Menu |
| Inventory | Menu, Purchasing, Production | Sales (deduction), Accounting (COGS) | `StockBelowThreshold` | Inventory Reservation (F9) | Barcode scanner |
| Purchasing | Inventory, Finance, Organization | Inventory (receipt), Accounting | `PurchaseInvoicePosted` | Approval Framework, Goods Receipt concept | Supplier EDI (not currently scoped) |
| Production | Inventory, Menu | Inventory (produced stock) | `ProductionOrderCompleted` | — | — |
| Seating | Organization | Sales | `ReservationConfirmed` | — | — |
| Sales | Menu, Inventory, Seating, Finance | Preparation, Inventory, Accounting, Loyalty | `OrderConfirmed`, `InvoiceCreated`, `InvoicePaid`, `SalesReturnApproved` | Approval Framework (returns), Inventory Reservation | Payment gateways, delivery platforms, fiscal printer |
| Finance | HR (custody), Sales (invoice payment) | Accounting | `CashierShiftClosed` | — | POS/card terminals |
| Preparation | Sales, Menu | (should notify waiter) | `OrderItemReady` | — | Kitchen printer |
| Accounting | Sales, Purchasing, Finance, Assets, HR | (financial statements — no downstream module yet) | `PeriodClosed` | Journal balance validation (R4), Period lock (R5) | Accounting export connector |
| Assets | Organization, Accounting | Accounting (depreciation journal) | `AssetDepreciationRun` | — | — |
| CRM | Organization | Loyalty, Sales (customer context) | — | — | WhatsApp/SMS/Email |
| Loyalty | CRM, Sales | (notifications, once built) | `LoyaltyPointsEarned/Redeemed` | R1 (single source of truth), R2 (bypass fix) | — |
| Expense | Finance | Accounting | — | — | — |
| Payments | Finance, Accounting | — | — | — | Payment gateways |
| System (settings) | Organization | every domain above (config only) | — | — | — |

---

## 6. Database Migration Plan

Every schema change implied by §2/§3/§4 above, classified. No migration is executed by this document.

| Change | Classification | Notes |
|---|---|---|
| Add `isDeleted`/`deletedAt`/`deletedBy` to any remaining model missing them | Safe | Purely additive, defaults to `false`/`null` — matches the pattern already applied during the settings-unification pass |
| Add Inventory Reservation collection/fields (F9/R14) | Safe | New collection, no existing data affected |
| Add Goods Receipt concept (Phase 3, Three-Way Match) | Safe | New collection |
| Add approval fields (`approvedBy`/`approvedAt`/threshold checks) to Purchasing/Sales-Return/Journal-Entry per the Approval Framework (F5) | Safe if fields are additive with defaults; **Requires Migration** if existing documents need a backfilled default status | Depends on F5's final design |
| State-machine enforcement (R13) — no schema change, only validation logic | Safe (schema) / **Breaking Change (behavior)** | The schema doesn't change, but previously-accepted arbitrary status writes will start being rejected — classify the *behavior* change as breaking even though the *data* change is safe |
| Loyalty tier/points single source of truth (R1) | **Needs Data Conversion** | If `OnlineCustomer.loyalty.points` and `CustomerLoyalty.points` currently disagree for any real customer, a reconciliation pass (not just a schema change) is required before removing the duplicate field |
| Tax policy single source of truth (R6) | **Needs Data Conversion** | Existing Invoice/PurchaseInvoice documents with a locally-set tax flag disagreeing with `TaxConfig` need an explicit decision (keep historical value vs. recompute) — do not silently recompute financial history |
| Delivery policy single source of truth (R7) | **Requires Migration** | Existing `DeliveryArea` documents need their policy fields either migrated into `BranchSettings` or explicitly marked as the override layer, not silently dropped |
| Employee leave-policy defaults (R8) | Safe if done as default-resolution (service reads settings when field absent) | **Requires Migration** only if existing `Employee` documents' hardcoded values must be reconciled against brand policy retroactively |
| `hr/shift-settings` relocation (R9) | **Requires Migration** if the Mongoose collection name changes | Safe if only the file/folder location changes and the registered model name is kept identical |
| Naming/casing fixes (R11/R12) | Safe (file/folder only) / **Requires Migration** if a registered Mongoose model name itself changes (`cashTransaction`→`CashTransaction`, `InventorySetting`→`InventorySettings`, `EmployeeSetting`→`EmployeeSettings`) | Renaming the *collection* name mid-flight requires a Mongo-level rename or dual-read period — do not do this casually even though it's "just a casing fix" |
| Legacy tree removal (R10) | Safe | Confirmed-dead code; deleting a Mongoose model definition that's never instantiated has no data impact |

---

## 7. Refactoring Phases

Seven phases per the requested structure. Each includes objectives, participating modules, dependencies, expected result, and completion criteria.

### Phase 1 — Foundation
- **Objectives:** Close every Critical/High item that would otherwise be inherited by every later phase (§1 Foundation Tasks, F1–F10).
- **Modules:** Organization, IAM (verification only, no changes expected), Loyalty (R1/R2), Purchasing (R3), Accounting (R4/R5), cross-cutting naming (R9/R11/R12), legacy removal (R10).
- **Dependencies:** None — this is the starting phase.
- **Expected Result:** No known Critical/High architectural defect remains; Approval Framework and Printing scope are decided (not built); testing infrastructure exists.
- **Completion Criteria:** All Critical + High backlog items closed or explicitly deferred with a written reason; Jest running in CI (or local, per current setup) against at least the Foundation-layer fixes; zero references to the two legacy trees remain in the codebase.

### Phase 2 — Core Business Modules
- **Objectives:** Stand up Menu, Inventory, Seating, and the Sales/Finance revenue loop as real, connected workflows (not isolated CRUD).
- **Modules:** Menu, Inventory (incl. F9 Reservation), Seating, Sales/Order, Invoice, Finance/Cashier-Shift.
- **Dependencies:** Phase 1 complete (specifically R6 tax single-source, R7 delivery-policy, F9 reservation, F5 approval-framework design).
- **Expected Result:** A customer order can be created, priced correctly (tax/discount/service-charge applied from Settings), paid, and closed as an invoice, with stock correctly deducted and a table correctly occupied/released — end to end, matching the "Customer Order" workflow in the Architecture Review §2/§5.
- **Completion Criteria:** Order→Invoice totals computation implemented and tested; Inventory deduction on invoice close implemented and tested; Table/Reservation status driven by real Order/Reservation events instead of manual API writes; `order-settings`/`invoice-settings`/`discount-settings`/`service-charge-settings`/`tax-settings`/`inventory-settings`/`branch-settings` all have at least one real reader.

### Phase 3 — Business Logic
- **Objectives:** Complete the secondary workflows that depend on Phase 2's loop being real: Kitchen ticket lifecycle, Procure-to-pay, Production, Payroll, Loyalty completion, Sales/Purchase Returns.
- **Modules:** Preparation/Kitchen, Purchasing (full workflow), Production, HR/Payroll, Loyalty (expiry/bonus), Sales-Return, Purchase-Return.
- **Dependencies:** Phase 2 complete.
- **Expected Result:** Every workflow enumerated in Architecture Review §2 that isn't already covered by Phase 2 now runs end-to-end with real state transitions (R13) instead of free-form status fields.
- **Completion Criteria:** All 13 entity state machines from Architecture Review §3 have enforced transitions; `PayrollItem` formula interpreter exists and a payroll run produces a correct `netSalary`; `preparation-ticket-settings`/`preparation-return-settings`/`purchasing-settings`/`sales-return-settings`/`employee-settings` all have real readers.

### Phase 4 — Module Integration
- **Objectives:** Wire the Business Events catalog (Architecture Review §7) as real, working integrations between the now-functional modules from Phases 2–3 — this is where the formal Event/Workflow Engine gets built, superseding any synchronous stopgaps used in Phase 2/3.
- **Modules:** Cross-cutting — Accounting (as the primary event *consumer*), Notifications (new), all Phase 2/3 modules as event *producers*.
- **Dependencies:** Phases 2–3 complete (there must be real events to wire before an event engine is worth building).
- **Expected Result:** Invoice close → Accounting journal posting; Cashier Shift close → Accounting journal posting; Purchase Invoice post → Accounting journal posting; all driven by events, not manual API calls.
- **Completion Criteria:** Every "Missing" row in the Architecture Review §7 events table becomes "Implemented"; `accounting-settings` has a real reader for the first time; Financial Closing (period lock) is enforced against real postings.

### Phase 5 — Automation
- **Objectives:** Remove remaining manual steps: Stock Adjustment/Cycle Count execution, Stock Transfer approval-and-execution, Asset depreciation scheduler, Leave-accrual engine.
- **Modules:** Inventory (adjustment/count/transfer), Assets, HR (accrual).
- **Dependencies:** Phase 4 (needs the event engine for scheduled/triggered automation).
- **Expected Result:** Periodic/background processes run without manual intervention (depreciation schedule, stock count reconciliation).
- **Completion Criteria:** A scheduled depreciation run posts correctly without manual triggering; a completed Inventory Count auto-generates its adjustment `WarehouseDocument`.

### Phase 6 — Advanced ERP
- **Objectives:** Multi-currency revaluation, bank reconciliation, recurring/template journal entries, split-bill, table transfer, customer segmentation/campaigns, waitlist.
- **Modules:** Accounting, Sales, CRM, Seating.
- **Dependencies:** Phase 4–5 (these features assume the core financial/operational loop is both connected and automated).
- **Expected Result:** Feature parity with the "Advanced ERP" concepts named in Architecture Review §9 (ERP Gap Analysis).
- **Completion Criteria:** Each feature independently testable and shippable — this phase is not a single milestone but a backlog of independent enhancements, unlike Phases 1–5 which each gate the next.

### Phase 7 — External Integrations
- **Objectives:** Connect the now-stable internal system to the outside world: payment gateways, fiscal/kitchen printers, WhatsApp/SMS/Email, delivery platforms, barcode scanners, QR menu, biometric attendance, accounting export, mobile app API surface.
- **Modules:** Payments, Sales (printing), Notifications, CRM, Inventory (barcode), Menu (QR), HR (biometric), Accounting (export).
- **Dependencies:** Phases 1–6 — every integration in this phase either triggers off an internal event (needs Phase 4) or exports internal data (needs it to be trustworthy, i.e. Phases 1–3 done).
- **Expected Result:** The system can be operated with real hardware/external services instead of manual data entry.
- **Completion Criteria:** At least one working connector per integration category listed in Architecture Review §10, each independently toggleable (a brand not using a given integration shouldn't be blocked by its absence).

---

## 8. Risks

| Category | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| Technical | State-machine enforcement (R13) rejects previously-valid writes from an already-shipped frontend | Medium | High (breaks the UI mid-rollout) | Ship each entity's state machine behind a feature flag; coordinate with frontend before enabling per entity |
| Technical | `BaseService`/`BaseController` changes (F9, Approval Framework hooks) regress the ~40 modules already built on them | Low | High (foundation-wide blast radius) | Every change to these two files must re-run the full smoke test used in the original Foundation review (boot + hit every mounted route) before merging |
| Architecture | Approval Framework (F5) designed too narrowly, forcing a second redesign once Phase 3 domains need it | Medium | Medium | Design F5 against all six known consumers (§1) up front, not just the first one implemented |
| Architecture | Settings modules keep growing unread fields if Phase 2–3 implementation lags behind settings creation (the exact pattern that produced the current state) | High (this has already happened once) | Medium | Enforce, as a review gate, that no new Settings field is merged without the reading service landing in the same change — the "5-question test" agreed upon earlier should be a PR-review requirement going forward |
| Business | Tax/delivery-policy reconciliation (R6/R7) silently changes historical totals for existing brands | Low (no production brands yet, per the dev-database state observed) | High if it does occur | Explicit data-audit step before R6/R7 ship; never silently recompute already-closed financial documents |
| Data | Loyalty points reconciliation (R1) picks the wrong source of truth, giving customers fewer/more points than they actually had | Low (same reason as above — no production data yet) | High if it does occur | Manual review of any disagreeing pairs before deleting the duplicate field, not an automatic "pick one" script |
| Performance | Event/Workflow Engine (Phase 4) introduces synchronous chains that slow down the Order-close request path | Medium | Medium | Default to async event dispatch (fire-and-forget with retry) for non-critical consumers (Notifications, Loyalty); keep only Accounting/Inventory posting synchronous where correctness requires it |
| Security | Approval Framework (F5) becomes a second, parallel permission system that drifts from RBAC (`Role.permissions`) | Medium | Medium | Reuse the existing `Settings` resource pattern (`update`/`approve` action tiers) established in the earlier RBAC work rather than inventing a new access model |

---

## 9. Success Criteria

Per phase, matching the requested checklist format.

**Phase 1 — Foundation**
✔ All Critical/High backlog items closed or explicitly deferred with a written reason
✔ Zero references to `modules/setup/` or `modules/system/audit-log/` remain
✔ Jest test suite exists and runs against the Foundation-layer fixes
✔ Approval Framework design document exists (even if unimplemented)

**Phase 2 — Core Business Modules**
✔ Order → Invoice totals computed correctly (tax/discount/service-charge)
✔ Invoice close deducts Inventory correctly, respecting `allowNegativeStock`
✔ Table/Reservation status driven by real events, not manual writes
✔ RBAC applied to every new/touched route (already the established pattern)
✔ `order-settings`/`invoice-settings`/`discount-settings`/`service-charge-settings`/`tax-settings`/`inventory-settings`/`branch-settings` each have ≥1 real reader
✔ Tests passed for the full Order→Invoice→Inventory path
✔ Documentation updated: `.module.md` written for Order, Invoice, Inventory per the `BACKEND_FOUNDATION.md` template

**Phase 3 — Business Logic**
✔ All 13 state machines (Architecture Review §3) enforce real transitions
✔ Payroll run produces a correct `netSalary` from the formula engine
✔ Kitchen ticket lifecycle auto-generates and transitions from Order events
✔ Sales-Return/Purchase-Return workflows enforce approval thresholds

**Phase 4 — Module Integration**
✔ Every event in the Architecture Review §7 catalog is "Implemented," not "Missing"
✔ Accounting receives real postings from Sales, Purchasing, Finance
✔ Financial Closing (period lock) enforced against real data

**Phase 5 — Automation**
✔ Depreciation runs on schedule without manual triggering
✔ Inventory Count auto-generates its adjustment document
✔ Stock Transfer executes and posts `WarehouseDocument`s automatically on approval

**Phase 6 — Advanced ERP**
✔ Each feature (multi-currency, bank reconciliation, split-bill, etc.) independently shipped and tested — no single "done" gate for the whole phase

**Phase 7 — External Integrations**
✔ At least one working connector per category in Architecture Review §10
✔ Each integration independently toggleable per brand

---

## 10. Final Recommendation

**Recommended first task:** F10 (testing infrastructure) followed immediately by R2 (`loyalty-transaction` settings bypass fix). Reasoning: F10 is a prerequisite for safely doing anything else in this plan, and R2 is the single lowest-risk, highest-value fix available — it's isolated to one service file, has a clear correct behavior to test against (the already-working `customer-loyalty` path), and eliminates the only *currently active* runtime business-rule violation identified in the entire review.

**Recommended first module:** **Inventory**, not Sales — even though Sales is the higher-value end-to-end workflow, Inventory is the dependency Sales cannot correctly close without (deduction, negative-stock policy). Building Sales first would mean either building it against a fake/stubbed Inventory or building Inventory reactively mid-Sales-implementation, both worse than sequencing Inventory first as already reflected in §3's module order.

**Recommended first workflow:** **Order → Invoice → Inventory deduction** (the core of Phase 2). This is the one workflow that, once real, immediately makes the product usable for its primary purpose (taking and closing a restaurant order) — every other workflow in the roadmap is either a refinement of this one or feeds into it later (Accounting, Loyalty).

**Recommended development strategy:** Vertical slices, not horizontal layers — implement one complete workflow (Order→Invoice→Inventory) fully, including its settings readers and state-machine transitions, before starting the next workflow, rather than "add all state machines everywhere" or "add all settings-reading everywhere" as separate global passes. This matches how the Foundation-layer work in this project was already done successfully (fix the middleware chain completely, verify, then move on) and avoids the exact failure mode this whole review uncovered — many modules half-built in isolation with no connective tissue.

**Recommended testing strategy:** Jest (already decided), with the same verification discipline already established for infrastructure changes in this project: unit tests for pure logic (tax/discount calculation, state-machine transition validity, payroll formula evaluation), and an integration test per completed vertical slice that boots the real flow against a test database (mirroring the manual boot+curl verification already used successfully for the Foundation and Settings-unification passes, formalized into Jest instead of ad hoc scripts).

**Recommended review strategy:** Two gates per change, matching the process already used throughout this review: (1) an architecture-consistency check — does this change follow the module pattern in `BACKEND_FOUNDATION.md`, does any new Settings field have a reading service in the same change (per the Risks §8 mitigation); (2) a business-correctness check — does this change respect the Business Rules (Architecture Review §5) and the relevant entity's state machine (§3). Neither gate requires a separate formal document per change — this Implementation Plan and the Architecture Review are the standing reference both gates check against.

---

## Status

This document, `ARCHITECTURE_REVIEW.md`, and `BACKEND_FOUNDATION.md` together form the complete reference set for the Restaurant ERP: vision → business architecture → infrastructure → execution order. Per the request that closed the Architecture Review, no further architecture-level documents are anticipated; from this point, work against this plan should take the form of implementation commits, not new planning documents — this file should be updated in place as phases complete, not superseded by a new one.
