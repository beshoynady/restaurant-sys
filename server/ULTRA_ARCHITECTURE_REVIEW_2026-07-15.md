# Restaurant ERP — Full Pre-Production Architecture Review

**Date:** 2026-07-15
**Method:** Direct source-code read of every model/service/controller/router/validation/engine file across all ~50 backend modules (menu, kitchen, production, inventory, sales, seating, payments, accounting, finance, purchasing, expense, assets, CRM, loyalty, reporting, IAM, settings, organization). No existing design doc, audit doc, or code comment was trusted as ground truth — every claim below is anchored to a `file:line` citation, and several claims in this codebase's own prior "audit" docs were found to be stale or false against current code (flagged explicitly where found).
**Reviewer stance:** enterprise pre-launch audit — the standard applied is "would this survive a real restaurant chain's first month of live cash, live kitchen, live books."

---

## 0. Executive summary

**Overall readiness: 4.3 / 10 — not production ready.** The codebase has two very different faces:

- **What's genuinely excellent**: the double-entry accounting core, the purchasing cycle (PR→PO→GRN→PI→3-way-match), the production/manufacturing BOM engine, the inventory costing engine (5 real costing methods), the modifier-selection engine, the order state machine, the invoice pricing/tax engine, RBAC (`RESOURCE_ENUM`/`authorize()` — zero broken call sites across 105 checks), the session/device security model, and the delivery-area geofencing engine. These are not toy implementations — they show real domain understanding, correct concurrency handling (atomic claims, idempotency guards, transactional rollback), and honest scoping comments where something was deliberately deferred.
- **What's broken or missing**: a same-day-shippable build blocker (server does not currently boot), a systemic security hole (generic `PUT` bypasses every business-rule engine on the two most financially consequential documents in the system), zero payment-capture capability, zero working reporting/analytics, three unsynchronized loyalty-points systems, zero GL posting for cash/expense/fixed-assets, and COGS never reaching the ledger despite the ingredient-costing engine that would feed it already working correctly.

**The recurring pattern across all five domain reviews**: this team can clearly build hard, correct, concurrency-safe business logic (the accounting core and purchasing cycle prove it). The gaps are not competence gaps — they are **integration gaps** (engine A computes the right number, nothing calls engine B to post it) and **unenforced update paths** (create-time logic is excellent, update-time logic doesn't exist). Almost every severe finding below is "the hard part is already built; the wiring isn't" — which is the good news for the roadmap.

### Domain scores

| Cluster | Score /10 | One-line verdict |
|---|---|---|
| Sales / Orders / Seating / Payments | **3.0** | Server doesn't boot; strong order/invoice core undermined by a `PUT`-bypass hole; payments/promotions/table-ops don't exist |
| CRM / Loyalty / Reporting / IAM / Settings | **3.5** | IAM is enterprise-grade; Reporting is dead code; Loyalty has 3 unsynced point systems; customer login is unreachable |
| Accounting / Finance / Purchasing / Assets | **4.5** | Best-engineered core in the whole codebase, but Cash/Expense/Assets are schema-only facades with zero GL posting |
| Menu / Product / Recipe | **5.5** | Solid CRUD + real modifier engine, but combos are unenforced and there is no usable food-cost number anywhere |
| Kitchen / Production / Inventory | **6.5** | The strongest cluster; COGS-to-GL is the one missing link, KDS has no real-time push |

---

## 1. STOP-SHIP: fix before anything else ships

### 1.1 The server does not currently boot

The latest commit (`ecc729f6`, "restructure order module to follow Domain Engine Architecture with subfolder organization") rewrote import paths in `order.controller.js`, `preparation-ticket.service.js`, and `recipe-consumption.service.js` to point at `services/order.service.js` and `engines/order-item-expansion.js` — but the `git mv` that would create those subfolders never happened. The files are still flat at `server/modules/sales/order/*.js`.

**Independently re-verified in this review, not just cited from the sub-report** — live `node` ESM resolution against the current tree fails on all three import sites:
```
Cannot find module '...\server\modules\sales\order\services\order.service.js'
Cannot find module '...\server\modules\sales\order\engines\order-item-expansion.js'
```
`order.router.js` is mounted at application boot (`router/v1/index.router.js`), so this is not a lazy/edge-case failure — the app cannot start. This takes down Order, Kitchen Ticket routing, and Recipe Consumption simultaneously, since all three import the same broken path.

`server/DOMAIN_ENGINE_ARCHITECTURE_MIGRATION_PLAN.md` (committed in the same commit) claims this move was "verified end-to-end: 61/61 suites, 249/249 tests, zero regressions." That claim does not hold against the current tree — the one new integration test that would exercise this path (`recipe-consumption-engine.test.ts`) imports the same broken module.

**Fix is mechanical (minutes, not days)**: either physically move the three files into `repositories/`/`services/`/`engines/` to match the doc, or revert the import-path edits to match where the files actually are. **Do not roll the Domain Engine Architecture pattern out to any other module until `sales/order` is fixed and re-verified with an actual live boot** — per the migration plan's own "verify completely before moving to the next" rule.

### 1.2 Generic `PUT` bypasses every business-rule engine on Order and Invoice

`OrderService`/`InvoiceService` override `beforeCreate` (where all the good validation/pricing logic lives) but **never override `beforeUpdate`**. `BaseRepository.update()` does an unrestricted `$set` of whatever survives Joi's generic `updateSchema` (which only excludes a small hardcoded field list). Net effect:

- Any caller with `Orders:update` can `PUT /orders/:id` and directly set `status` to any value — bypassing the `transitionGuard` state machine entirely, making the dedicated `/transition` endpoint optional rather than authoritative — plus `paymentStatus`, `orderNum`, and any item's `unitPrice`/`finalPrice` with **zero re-run of modifier validation**.
- Invoice is worse: it has **no dedicated transition endpoint at all**, so `PUT /invoice/:id` can rewrite `subtotal`/`discount`/`salesTax`/`total`/`status` (straight to `PAID`/`CANCELLED`) and even repoint `journalEntry` at an unrelated GL entry — completely defeating the well-built pricing/tax engine for any document after its first save.

This is a direct fraud/pricing-integrity vector: a POS client (or a compromised one) can silently discount or comp an item after kitchen routing has already happened, or falsify a paid invoice's totals, with none of the guardrails the rest of the module was clearly built to enforce. **This is systemic, not order/invoice-specific** — any future module built the same way (extend the repository, override only `beforeCreate`) inherits the identical hole. Fix at the framework level: either a `BaseRepository` option to lock specific fields as create-only/immutable-after-create, or a written+enforced convention that every transactional-document service must explicitly whitelist what `PUT` may touch.

### 1.3 No payment-capture layer exists anywhere

`Order.paymentStatus` and `Invoice.paymentMethod[]` are decorative — never validated, never summed against `total`, never reconciled. There is no `Payment`/`Transaction` record anywhere in the codebase representing "this amount was captured against this order via this method." Two of the five payment routers (`payment-channel`, `payment-provider`) have broken relative imports and are unmounted; only `payment-method` and `delivery-area` are actually live. **A restaurant cannot record a payment through this API today** — this is a POS system that cannot yet take payment, which is not a soft-launch gap, it's the core function of a POS.

### 1.4 Sales COGS never reaches the general ledger

This is subtler than 1.1–1.3 because the hard part is already done: `recipe-consumption.service.js` correctly deducts and *costs* every ingredient a sale consumes (verified: the Cost Engine resolves a real `totalCost` per stock item on every posted ledger row). But nothing calls `journalEntryService` from that path, while `invoice.service.ts` **does** post Revenue on every sale. **Books today would show ~100% gross margin on every single sale.** The stale comment in `invoice.service.ts` ("no recipe costing exists yet") is factually wrong as of this review — the fix is wiring an existing, proven pattern (`waste-record.service.js` already does exactly this: read costed ledger rows back, post a journal entry from them) into `recipe-consumption.service.js`. Not a redesign — a missing function call.

---

## 2. Recurring defect classes (found independently in 3+ unrelated modules — these are process problems, not isolated bugs)

### A. `BaseRepository` constructor-option typo: `softDelete`/`searchFields` vs. the real `enableSoftDelete`/`searchableFields`
Found live in **at least 7 modules** across three different domain clusters (`menu-category`, `product`, `recipe`, `product-review`, `table`, `dining-area`, `payment-channel`, `account`, `account-balance`, `accounting-period`, `cost-center`, `bank-account`). Two failure modes:
- Silent no-op on search (`?search=` accepted, silently ignored) — bad but low-severity.
- **Silent default-to-`isDeleted:false`-filter on models with no `isDeleted` field at all** — confirmed to make `Table` and `DiningArea` **return empty results on every single GET request**, a live functional bug, not a typo with no consequence.
Several sibling modules (`production-recipe`, `preparation-section`, `reservation`) already have the corrected option names with inline comments citing this exact defect class — the fix exists, it just wasn't propagated. **Recommend**: make `BaseRepository`'s constructor throw on an unrecognized option key, so this class of bug becomes impossible to reintroduce, then sweep the codebase once.

### B. "Designed but dead" settings — a schema promises a workflow, zero code reads it
`OrderSettings` (hold/fire timing, auto-merge tickets, allow-edit-after-kitchen), `SalesReturnSettings` (refund composition, approval thresholds), `PrintSettings` (auto-print, copies — despite being the flagship example in the project's own vision doc), `NotificationSettings` (a ~230-line, 7-section schema with zero dispatch engine behind it), `promotion-settings` (unmounted, 4 placeholder files) — all fully declared, Joi-validated, and API-exposed, with **zero service code ever reading them**. This is now a repeated, self-acknowledged pattern in the codebase's own comments ("the same designed-but-dead pattern this engagement has repeatedly found and closed elsewhere"). **Recommend**: a lint/test rule asserting every settings field has at least one reader before merge.

### C. Documentation asserts features that don't exist in code
Confirmed in three independent places: `MENU_COST_CONTROL_ARCHITECTURE.md` describes `Product.costFields`/`Recipe.estimatedCost` as implemented — neither field exists in either schema. `DOMAIN_ENGINE_ARCHITECTURE_MIGRATION_PLAN.md` claims a verified, zero-regression file move that never physically happened (§1.1). `CLAUDE.md`'s own "Order→Invoice→Accounting→Inventory not connected" note (2026-07-11) is now stale — three of four links are connected; only COGS-posting remains open, and the note should be corrected to that narrower, more accurate scope. **Recommend**: treat every "verified"/"implemented" claim in `server/*.md` as a claim to spot-check, not a status record, until this pattern stops recurring; consider a doc that only records verified-via-test status.

### D. Generic CRUD money-events that never post to the GL
Supplier payment/refund settlement (`purchase-invoice.service.js#recordPayment`, `purchase-return.service.js#recordRefund`), all of Cash/Finance (`cashier-shift`, `cash-register`, `cash-transaction`, `cash-transfer`, `bank-account`), all of Expense (`daily-expense`), all of Fixed Assets (`asset-depreciation` and friends) — every one of these has a rich schema explicitly designed for GL linkage (several with a literal `journalEntry` ref field and a comment saying "link to the actual posting") and **zero service code that ever populates it**. This is the dominant theme of the entire Accounting/Finance review: the hardest 20% (double-entry core, purchasing cycle) is done extremely well; the "easy" 80% (routine cash/expense/depreciation postings) was scaffolded and never finished.

### E. Duplicate/parallel implementations of the same concept that silently diverge
Three unsynchronized "loyalty points" systems (`CustomerLoyalty` wallet, `LoyaltyTransaction` ledger, and a third hardcoded implementation embedded in `OnlineCustomer.loyalty.*` with its own admin routes and its own tier ladder) — no code keeps them in sync, and the one reachable admin path bypasses the append-only ledger entirely. This is the single worst data-integrity finding in the CRM/Loyalty review.

---

## 3. Domain-by-domain findings

### 3.1 Menu / Product / Recipe / Preparation-Section — **5.5/10**

**Strong**: multilingual (Map-based) fields throughout; channel/time-windowed category visibility; a genuinely well-tested modifier-group validator (`modifier-selection-validator.js`) enforcing required/min/max correctly, wired into order creation; `ProductionRecipe`'s BOM cycle-detection (real BFS graph traversal with depth guard) and atomic version-supersession — the strongest single piece of engineering in this cluster; a well-thought-out kitchen-station config model.

**Severe gaps**:
- **`comboGroups` selection rules are schema-only and never enforced** — a combo can be ordered with 0 or 10 components with no rejection, despite the exact same min/max validation pattern already existing and working for modifier groups. This is the single most severe *functional* gap in the menu cluster — the fix is a direct port of an existing, proven validator.
- **No usable food-cost/margin number exists anywhere for a menu item.** Neither `Product` nor `Recipe` has a cost field at all, contradicting the project's own `MENU_COST_CONTROL_ARCHITECTURE.md`. `recipe-consumption.service.js` even hardcodes `unitCost:0` at the point of deduction (though see §3.2 — this gets overwritten by the real Cost Engine before the ledger row is written, so the inventory side is fine; the *menu-recipe* side never gets a cost cache at all).
- No channel-specific pricing (dine-in vs. delivery vs. takeaway) anywhere on `Product` — a hard requirement for any brand selling through delivery aggregators.
- Zero allergen/dietary data platform-wide — increasingly a compliance requirement, not a nice-to-have.
- A live silent-search bug (§2.A) on 4 of 6 modules in this cluster.

### 3.2 Kitchen / Production / Inventory — **6.5/10** (the strongest cluster)

**Strong**: real atomic-claim (`findOneAndUpdate` filtered on expected current status) transition guards used consistently across every transactional entity in this cluster — genuinely race-safe, not just application-level guarded; a real, server-computed KDS queue with SLA badges and per-station utilization; five genuinely implemented costing strategies (WeightedAverage/FIFO/LIFO/Standard/LastPurchaseCost); an append-only `StockLedger` as the single, correctly-enforced write path for every stock movement in the system (no second, parallel deduction mechanism found anywhere); recipe-driven, modifier/extra-aware automatic stock deduction on order confirmation that correctly resolves real costs before posting; a production/manufacturing engine with yield-variance-aware costing and correct GL posting for value-added labor/overhead.

**Severe gaps**:
- **Sales COGS never posts to the GL** (§1.4) — the most consequential finding in this cluster, and arguably in the whole review, given how close the fix is to the working code.
- **No real-time push to the kitchen display.** Zero event emission from the ticket service; the existing Socket.IO kitchen/bar/grill namespaces are disconnected legacy scaffolding that just echoes arbitrary client payloads — misleading dead code that should be wired up or removed, not left as-is.
- No multi-station routing for a single item (a burger needing both grill and fryer work cannot be split into two station tickets).
- Lot/batch/FEFO tracking is schema-ready (`StockLedger.expirationDate`) but never written by any code path.
- `inventory/consumption` (shift-based theoretical-vs-actual variance) is a fully-designed schema with confirmed zero business logic — effectively unbuilt despite looking complete.
- Purchase Price Variance is computed and stored per receipt but never posted to the GL.

### 3.3 Sales / Orders / Seating / Payments — **3.0/10**

**Strong**: the order state machine (correct transition table, atomic optimistic-concurrency claims, best-effort non-blocking kitchen/inventory side-effects); the modifier engine (shared with menu cluster); item-level cancel with kitchen recall and manager-approval enforcement checked against the *real* RBAC schema; the invoice pricing engine (tax-inclusive/exclusive, before/after-discount tax timing, 3 service-charge rounding modes, discount-approval-threshold enforcement) — materially more sophisticated than the rest of the cluster; atomic, race-free order-number/invoice-serial generation; the delivery-area geofencing module (polygon `2dsphere` matching, tenant-safe public checkout API) — the single best-engineered module found in this entire review, and completely disconnected from Order/Invoice.

**Severe gaps** (beyond §1.1–1.3, which live in this cluster):
- No table transfer, no table merge, no split-bill enforcement (`isSplit` is a dead flag; `Invoice.items[].orderItemId` exists specifically to prevent double-billing across split invoices but is optional and never checked).
- `sales/promotion` is a pure CRUD shell — percentage/fixed/BOGO fields exist, zero code computes a discount from any of them; confirmed zero references to the Promotion model from either Order or Invoice.
- `sales-return` is a facade: no accounting reversal ever posted despite a `journalEntry` field that exists specifically for it, no inventory reversal, the source invoice's status never updates to `PARTIALLY_RETURNED`, and its own document numbering is weaker (client-supplied, not sequential) than Invoice's, for no apparent reason.
- Table status is a static field with zero automation from order/reservation events — a host's floor view is only as accurate as manual staff edits.
- `organization/delivery-area`'s excellent engine has no relationship to `Order` at all — no `deliveryArea` field, no server-validated fee/ETA on a delivery order.

### 3.4 Accounting / Finance / Purchasing / Assets — **4.5/10**

**Strong (and this is genuinely strong)**: the double-entry core (`JournalEntry`/`JournalLine`) is production-credible — schema-level immutability enforcement (a Mongoose middleware hook physically blocks any mutation of a Posted entry except the one legitimate reversal transition, so it can't be bypassed by a future direct-Mongoose caller), a transactional posting engine with idempotency guards against duplicate postings, correct textbook reversal-only correction, and real, optional maker-checker approval. The purchasing cycle (`PurchaseRequest→PurchaseOrder→GoodsReceiptNote→PurchaseInvoice→ThreeWayMatch→VendorLedger`) is the best-engineered end-to-end business process found in the entire codebase — a genuinely working three-way match engine (not a stub), correct inventory-posting reuse, credit-limit enforcement, and a self-reconciling vendor-ledger check.

**Severe gaps**: everything downstream of that core (§2.D) — Cash/Finance, Expense, and Fixed Assets are rich schemas with **zero service-layer logic**: no cash-drawer reconciliation math, no depreciation-schedule calculation (despite a correctly-designed method/period/mode taxonomy), no expense-to-GL posting. `AccountBalance` is documented as a derived, system-only snapshot but is fully writable via generic CRUD with no recomputation engine anywhere — it can silently diverge from the real ledger with nothing to catch it (the live reports correctly bypass it and sum `JournalLine` directly, which is the only reason this hasn't caused visible incorrect numbers yet). `AccountingPeriod` close/lock has no validation — a period can be closed with unposted entries or reopened and posted-into retroactively, with no audit trail beyond a timestamp. Supplier payments/refunds settle the AP sub-ledger but never touch the GL.

### 3.5 CRM / Loyalty / Reporting / IAM / Settings — **3.5/10**

**Strong**: IAM is the standout of the whole review — `RESOURCE_ENUM`/`authorize()` cross-checked with zero broken live call sites across 105 distinct resource strings (a genuinely clean result at this codebase size, evidently the product of prior deliberate hardening passes), a mature session model (hashed refresh tokens only, rotation-chain tracking for stolen-token detection), and a sound domain-grant role-template abstraction for fast brand onboarding. The multi-tenancy backbone (Brand→Branch→Department) is solid, including a previously-serious cross-tenant exploit (`isPlatformAdmin`) that was found and correctly closed.

**Severe gaps**:
- **Reporting/Analytics is effectively dead code.** The one module that exists (`accounting-reports`) has broken relative imports to files that don't exist in that folder, no router/service/model, is never mounted, and even hypothetically has zero brand scoping. Food Cost, Menu Engineering, Waste Analysis, Sales Analysis — none of it exists anywhere in the codebase, despite `RESOURCE_ENUM` already reserving five report permissions and role-templates already granting them (permission scaffolding for a feature that doesn't exist).
- **Three unsynchronized loyalty-points systems** (§2.E), and the one working, ledger-backed system is never actually triggered by an order completing — customers cannot earn points by ordering today, despite the full earn/redeem/tier machinery existing and being reachable via admin API.
- **Online customer login is unreachable** — a fully-built JWT auth service exists, its router import is simply commented out and never mounted.
- The tamper-evident, hash-chained `AuditLog` design is fully specified on paper (in this codebase's own approved redesign doc) and not implemented at all — still soft-deletable, no hash chain, no before/after diffs, and the event-type field is hardcoded to `"request"` regardless of what actually happened.
- `checkModuleEnabled` gating (the mandated pattern per this project's own `CLAUDE.md`) is applied to only 1 of 5 `system/*-settings` routers reviewed.

---

## 4. Competitive comparison (Foodics / Toast / Oracle Simphony / Odoo / SAP B1 / Dynamics 365 / Daftra)

Stated with appropriate uncertainty — general industry knowledge, not a line-by-line vendor feature audit.

| Capability | This platform | Comparators | Severity |
|---|---|---|---|
| Payment capture / split-tender | ❌ Does not exist | ✅ Table stakes everywhere | **Blocking** |
| Sales COGS → GL posting | ❌ Revenue posts, cost doesn't | ✅ Standard | **Blocking** |
| Working promotions/discount engine | ❌ CRUD shell only | ✅ Table stakes | **Blocking** |
| Table transfer / merge / split-bill | ❌ None of the three exist | ✅ Table stakes for full-service | **Blocking** |
| Reporting: Food Cost, Menu Engineering, Sales Analysis | ❌ Dead code, zero real reports | ✅ Flagship feature (esp. Foodics) | **Blocking** |
| Real-time KDS push | ❌ Polling only, disconnected socket scaffolding | ✅ Standard | High |
| Combo/bundle selection-rule enforcement | ⚠️ Schema only | ✅ Enforced | High |
| Cash-drawer / shift reconciliation with GL posting | ❌ Schema only | ✅ Standard (esp. Daftra, same SMB market) | High |
| Fixed-asset depreciation schedule + posting | ❌ Schema only, manual entry required | ✅ Automatic | Medium |
| Bank reconciliation, landed cost, budget-vs-actual, multi-currency revaluation | ❌ Not implemented | ✅ Standard in all four ERP comparators | Medium |
| Loyalty program, working end-to-end | ❌ Disconnected from checkout | ✅ Standard | Medium |
| Modifier groups (min/max/required) | ✅ Enforced correctly | ✅ | On par |
| Multi-method inventory costing (FIFO/LIFO/WA/Standard) | ✅ | ✅ | On par |
| BOM / batch manufacturing with yield variance | ✅ | ✅ | On par |
| Double-entry ledger, immutable posted entries, maker-checker | ✅ Correct | ✅ | On par |
| Three-way match (PO/GRN/Invoice) | ✅ Real logic | ✅ | On par |
| RBAC / role templates | ✅ Genuinely strong | ✅ | On par or better |
| Delivery-area geofencing | ✅ Well built | ✅ | On par, but disconnected from Order |
| Allergen/dietary tagging | ❌ Absent platform-wide | ✅ Increasingly mandatory | Medium (compliance risk) |
| Channel-specific pricing | ❌ Absent | ✅ Standard | Medium |

---

## 5. Implementation roadmap

Ordered by business value × architectural blast-radius × how much of the hard work is already done. Phases are sequential dependencies, not arbitrary buckets — each phase assumes the previous one shipped.

### Phase 0 — Unblock (days, not weeks)
Nothing else matters until this lands.
1. **Fix the broken import paths** blocking server boot (§1.1) — either complete the `git mv` into `repositories/`/`services/`/`engines/`, or revert the import edits. Re-verify with an actual live boot + smoke test before touching anything else.
2. **Lock down `PUT /orders/:id` and `PUT /invoice/:id`** (§1.2) — add `beforeUpdate` overrides that reject/ignore `status`, `paymentStatus`, totals, and `journalEntry` outside their dedicated transition endpoints. This is the single highest-leverage security fix in the review.
3. **Fix the `BaseRepository` option-name typo class** (§2.A) — make the constructor throw on unrecognized keys, then sweep the ~10 affected modules. Table/DiningArea are currently returning empty results on every read; this is a live user-facing bug, not a latent one.
4. **Delete dead/misleading code**: `accounting-reports.controller.js` (broken, unmounted, nothing to salvage), the disconnected Socket.IO kitchen/bar/grill namespaces (either wire them to the real ticket domain events or remove them so they stop looking like working KDS push).

### Phase 1 — Close the money loop (highest business value, hard part already built)
5. **Post Sales COGS to the GL** (§1.4) — apply the exact pattern `waste-record.service.js` already uses to `recipe-consumption.service.js`. This single change fixes gross-margin accuracy on every sale.
6. **Post supplier payments/refunds to the GL** — same missing-call pattern as #5, on `purchase-invoice.service.js#recordPayment` / `purchase-return.service.js#recordRefund`.
7. **Build a minimal `Payment`/`Transaction` capture record** tied to Invoice, with reconciliation against `total` and correct routing to the actual method's control account (today every sale is booked to cash regardless of method). This is the precondition for a working POS, full stop.
8. **Wire `AccountBalance` recomputation** (or delete the model and confirm nothing depends on it existing as a writable collection — reports already bypass it correctly).

### Phase 2 — Make the transactional core trustworthy for a real service
9. Enforce `comboGroups` min/max selection (direct port of the existing modifier-group validator).
10. Build the cost-cache pattern already proven on `ProductionRecipe` onto `Product`/menu-tier `Recipe` — this is the one number restaurant operators actually need for pricing decisions.
11. Table transfer, table merge, and split-bill enforcement (order-item-to-invoice double-billing prevention already has a schema field waiting for it).
12. Real-time KDS push — wire `preparation-ticket.service.js`'s transitions to `domainEvents`, replace or remove the disconnected socket scaffolding.
13. Wire delivery-area's geofencing/fee engine into `Order`/`Invoice` — it's fully built and simply never called from the order flow.

### Phase 3 — Build the categories that don't exist yet
14. **A real Reports/Analytics module** (fresh build, not a patch on the dead `accounting-reports` stub) — Food Cost, Menu Engineering, Sales Analysis, Waste Analysis at minimum. Every domain in this review — Loyalty ROI, HR performance, Inventory shrinkage — ultimately depends on this layer existing, so treat it as foundational, not a late-stage nice-to-have.
15. **A real promotions/discount engine** — percentage/fixed/BOGO computation, stacking rules, channel/time targeting, actually called from checkout.
16. **Cash-drawer/shift reconciliation engine** — variance computation, GL posting, enforced open→count→close→post lifecycle. Given this is a daily, every-branch, cash-handling operational path, treat as high priority despite being "Phase 3."
17. **Fixed-asset depreciation calculation engine** (straight-line/declining-balance) with automatic monthly posting — the schema is already correctly designed for this.
18. **Loyalty consolidation**: delete `OnlineCustomer.loyalty.*` and its admin routes, keep `CustomerLoyalty`+`LoyaltyTransaction` as the one canonical system, wire `earnPoints()` to order/invoice completion.
19. **Unmount → mount fix for online-customer login** (uncomment and mount the existing, fully-built auth router — this is close to a one-line fix relative to its severity).

### Phase 4 — Compliance and completeness
20. Allergen/dietary tagging platform-wide.
21. Channel-specific pricing on `Product`.
22. Implement the already-approved tamper-evident `AuditLog` redesign (hash chain, immutability hook, before/after diffs) — this is designed, not just planned; it needs execution.
23. `AccountingPeriod` close-time validation (all entries posted, trial balance balances, generate a closing entry).
24. `checkModuleEnabled` gating retrofit onto the remaining `system/*-settings` routers.
25. Lot/batch/FEFO tracking on `StockLedger` (fields already exist, unread by any code path).
26. Multi-currency revaluation, landed cost allocation, bank reconciliation, cost-center allocation-by-driver, budget-vs-actual — full ERP-parity backlog, lowest urgency of everything listed here since none of the reviewed clusters currently depend on them.

---

## 6. Closing assessment

This is not a codebase built by people who don't know what they're doing — the accounting core, the purchasing cycle, the production/inventory engine, and the RBAC/session model are genuinely enterprise-grade work, in places ahead of what the review expected to find. But **none of that matters if the server doesn't boot, a POS can't take a payment, and the books show 100% margin on every sale** — and that is the literal state of the `main` branch as of this review.

The encouraging finding, repeated across every one of the five sub-reviews: almost every severe gap is an **integration gap**, not a **design gap**. The hard 20% (concurrency-safe posting, atomic sequence generation, real costing algorithms, cycle-safe BOM graphs) is done. The roadmap above is explicitly ordered so that Phase 0–1 is mostly wiring existing, proven engines together rather than building anything new — that's a few weeks of focused work, not a rearchitecture, and it's the difference between "impressive prototype" and "can process a real restaurant's first live shift."
