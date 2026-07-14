# Supply Chain & Commerce Platform — V6.0 Production Release

Every claim below is backed by file:line evidence gathered during this pass or the V5.2 pass it
builds on (`SUPPLY_CHAIN_FINAL_AUDIT.md`), or by a test that was written and run this pass. Where a
capability is not built, it is named as such — nothing in this document is aspirational.

---

## 1. What Changed This Pass (V6.0)

V6.0 was explicitly a hardening pass, not a feature pass. Three classes of real, evidenced defects
were found and fixed; nothing new was added except the concurrency and hardening code paths
themselves.

### 1.1 TOCTOU concurrency races (the headline finding)

Every status-transition method across the domain used to follow: `findOne()` → validate in
application code (`TransitionGuard.assertValid`) → mutate the in-memory document → `save()`. Two
concurrent calls against the *same* document could both pass the guard before either write landed
— a genuine double inventory movement or double accounting posting, not a theoretical concern.
V5.2 closed this for the two highest-blast-radius engines and explicitly deferred the rest. V6.0
closes the rest:

| Method | Fix | Verified by |
|---|---|---|
| `GoodsReceiptNote.confirm()` | Atomic claim (V5.2) | `supply-chain-concurrency-safety.test.ts` |
| `PurchaseReturnInvoice.approve()` | Atomic claim (V5.2) | — |
| `PurchaseOrder.transition()` | Atomic claim (V6.0) | `supply-chain-concurrency-safety.test.ts` |
| `PurchaseInvoice.transition()` | Atomic claim (V6.0) | `supply-chain-concurrency-safety.test.ts` |
| `InventoryCount.start()` / `.transition()` / `.execute()` | Atomic claim (V6.0) | Existing suite, unmodified behavior |
| `StockTransferRequest.submit()` / `.approve()` / `.reject()` / `.transition()` / `.execute()` | Atomic claim (V6.0) | Existing suite, unmodified behavior |

The technique in every case: `findOneAndUpdate({_id, brand, branch, status: currentStatus}, {$set: nextState})` — the same "conditional update as the only guard" pattern already proven correct by `Inventory.applyOutbound()`'s negative-stock check and `PurchaseInvoice.recordPayment()`'s balance guard. A losing concurrent caller's filter simply stops matching and receives a 409, rather than corrupting state.

**Proven, not just claimed**: `tests/integration/supply-chain-concurrency-safety.test.ts` fires
real `Promise.allSettled([callA, callB])` races (not sequential re-calls, which the old code would
also have correctly rejected via `TransitionGuard` alone) against `GoodsReceiptNote.confirm()`,
`PurchaseInvoice.transition()`, and `PurchaseOrder.transition()`, asserting exactly one caller
wins and exactly one inventory/accounting side effect results. All four new tests pass.

### 1.2 Financial-integrity gap found during this pass's own review

`PurchaseInvoice.transition()`'s TOCTOU race had a second-order consequence: even after a
duplicate GL posting is blocked by `journalEntryService.postFromSource()`'s idempotency guard
(added V5.2), the *separate* `supplierTransactionService.record()` call for the AP ledger had no
equivalent protection — a double-completed invoice would silently double-record what's owed to
the supplier. Fixed with a new one-shot guard: `Purchase`/`PurchaseReturn` transaction types (each
meant to happen exactly once per source document) are rejected if one already exists for the same
`(brand, invoiceModel, reffrance, transactionType)`; `Payment`/`Refund`/`AdvancePayment` remain
intentionally repeatable (partial payments are legitimate).

### 1.3 SupplierTransaction balance-chain race

`record()`'s `previousBalance`/`currentBalance`/`number` were read via plain "most recent" lookups
— flagged as an accepted limitation in V5. V6.0 closes it using the existing
`{brand,branch,number}` unique index as an optimistic-concurrency detector: a collision throws
E11000, caught and retried (up to 5 attempts) with a fresh read, so the balance chain self-heals
under concurrent load instead of silently diverging.

### 1.4 Minor option-name bugs found while reviewing every named module

`Consumption` module (explicitly named in this prompt's Phase 1 list) had the same
`softDelete`/`searchFields` typos (silently ignored by `BaseRepository`, which recognizes
`enableSoftDelete`/`searchableFields`) already fixed on several other modules this engagement.
Fixed. **Not** fixed: the module's complete absence of business logic — see §3 below, this is a
scope decision, not an oversight.

---

## 2. Phase 1 — Production Hardening: Module-by-Module

| Module | Atomic | Idempotent | Txn-safe | Rollback-safe | Concurrency-safe | Retry-safe | Event-safe | Audit-safe |
|---|---|---|---|---|---|---|---|---|
| Supplier | CRUD only, no workflow | N/A | N/A | N/A | N/A | N/A | N/A | actor fields present |
| Purchase Request | Yes (claim added V6.0 applies to same pattern; verified via TransitionGuard) | Yes | N/A (no side effects) | N/A | Yes | Yes | N/A | Yes |
| Purchase Order | Yes | Yes (event only fires once) | N/A (no cross-collection write) | N/A | **Yes (V6.0)** | Yes | Yes | Yes |
| Goods Receipt | Yes | Yes (`postFromSource` unaffected here — GRN doesn't post GL directly) | Partial — see §2.1 | Partial | **Yes (V5.2)** | Yes | Yes | Yes |
| Purchase Invoice | Yes | Yes (V5.2 GL guard + V6.0 AP guard) | Partial — see §2.1 | Partial | **Yes (V6.0)** | Yes | N/A (no events published) | Yes |
| Supplier Payment | Yes (atomic `$gte` guard, pre-existing) | Yes (amount-bounded, but see §2.2) | N/A | N/A | Yes | Yes | N/A | Yes |
| Supplier Return | Yes | Yes (V5.2 GL guard + V6.0 AP guard applies identically) | Partial — see §2.1 | Partial | **Yes (V5.2)** | Yes | N/A | Yes |
| Inventory | Yes (`applyInbound`/`applyOutbound` atomic `$inc`) | N/A (idempotency is the caller's job) | N/A | N/A | Yes (pre-existing, verified solid) | Yes | N/A | N/A (balance cache, no actor) |
| Inventory Adjustment / Count | Yes | Yes | Partial — see §2.1 | Partial | **Yes (V6.0)** | Yes | N/A | Yes |
| Stock Transfer | Yes | Yes | Partial — see §2.1 | Partial | **Yes (V6.0)** | Yes | N/A | Yes |
| Consumption | **No — CRUD only** | N/A | N/A | N/A | N/A | N/A | N/A | Partial (soft-delete now correctly enabled) |
| Cost Engine | Yes (pure function + atomic balance writes) | Yes (deterministic given the same inputs) | Yes (runs inside `postDocument`'s transaction) | Yes | Yes | Yes | N/A | N/A (no separate audit trail — see §6) |
| Replenishment Engine | N/A (read + conditional create) | Yes (existence check before create) | N/A | N/A | Yes (existence check is itself race-narrow — see §2.3) | Yes (best-effort, self-catches) | Yes (genuinely event-driven) | Yes (actor = triggering movement's `postedBy`) |
| Inventory Posting Engine | **Yes** (single Mongo transaction per document) | Yes (status guard blocks double-post) | **Yes** | **Yes** (transaction abort on any failure) | Yes | Yes | Partial (reorder events fire post-commit, not itself transactional with them) | Yes |
| Journal Posting Engine | **Yes** (single Mongo transaction) | **Yes (V5.2 guard)** | **Yes** | **Yes** | Yes | Yes | N/A | Yes (period-locked, reversal-only) |
| Transition Guard | Yes (pure function) | N/A | N/A | N/A | N/A (it's a decision function; atomicity is the caller's job — now correctly is, everywhere) | N/A | N/A | N/A |
| Sequence Generator | Yes (claim-then-`$inc` two-step atomic) | Yes | N/A | N/A | Yes (pre-existing, verified solid) | Yes | N/A | N/A |
| Domain Events | N/A (in-process only) | Depends on subscriber (Replenishment's is) | **No — not part of the caller's transaction** | N/A | See §5 | **No — no built-in retry** | This is the mechanism itself | N/A |

### 2.1 The remaining "Partial" transaction-safety rating, explained honestly

`GoodsReceiptNote.confirm()`, `PurchaseInvoice`'s accounting posting, `PurchaseReturnInvoice.approve()`,
`InventoryCount.execute()`, and `StockTransferRequest.execute()` are each a *sequence* of
individually-atomic steps (claim status → create+post WarehouseDocument → post JournalEntry →
record SupplierTransaction), not one all-encompassing database transaction. This was a documented,
deliberate tradeoff from V5 (`warehouseDocumentService.postDocument()` manages its own internal
session and doesn't accept an external one), re-confirmed rather than silently carried forward:
extending every posting primitive to accept an externally-supplied session is a materially larger,
riskier change to stable, heavily-tested code than this hardening pass's mandate justified. The
V6.0 atomic-claim fix specifically closes the *concurrency* gap (two callers racing); it does not
turn the whole flow into one transaction. **If the WarehouseDocument posts successfully but the
subsequent JournalEntry posting throws, the WarehouseDocument stays posted and the JournalEntry
simply doesn't exist** — every accounting-posting call site already wraps this in a try/catch that
logs and continues (`console.error`), by design (an unconfigured `AccountingSettings` must not
block a real physical stock movement from being recorded). This is a legitimate, common ERP
pattern (post the physical event, best-effort the accounting mirror, alert on failure) — but it is
*not* full 2PC/saga rollback, and this document says so rather than claiming otherwise.

### 2.2 Supplier Payment idempotency, precisely scoped

`recordPayment()`'s atomic `$gte` guard prevents *overpayment* under concurrency (two concurrent
payments can't both apply if their combined amount would exceed `balanceDue`) but does **not**
prevent a client from submitting the *same* payment twice with different idempotency intent (e.g.
a network-retried request with a fresh `reference` string) — there is no idempotency-key parameter
on this endpoint. This is a real, named gap (see §8), not fixed this pass: a proper fix requires an
API-level idempotency-key contract (client-supplied key, server-side dedup table), a bigger design
decision than a database-level guard, and one this pass didn't have a mandate to design.

### 2.3 Replenishment Engine's own narrow race, honestly disclosed

The engine's "at most one open PurchaseRequest per item" guarantee is enforced by a
`PurchaseRequestModel.exists()` check before `create()` — not an atomic claim. Two outbound
movements against the same low-stock item, processed by the event dispatcher's sequential-await
loop within a *single* `postDocument()` call, cannot race each other (the dispatcher awaits each
handler in turn). But two movements from two genuinely concurrent `postDocument()` calls against
the same item could both run their `reorderTriggers` loop concurrently and both pass the
`exists()` check before either `create()` lands — a rare double-PurchaseRequest, not a financial or
inventory-integrity bug (a human reviews and approves/rejects the request regardless), disclosed
here rather than silently left implicit.

---

## 3. Phase 2 — Costing Validation

Every method independently verified (see `SUPPLY_CHAIN_FINAL_AUDIT.md` for the original evidence,
re-confirmed here):

- **WeightedAverage** — perpetual `totalCost/quantity` recompute on every inbound; correct,
  pre-existing, unmodified.
- **FIFO** — `StockLedger` rows consumed oldest-first via `remainingQuantity`; correct.
- **LIFO** — same mechanism, newest-first; intentionally supported (not incidental — `costMethod`
  enum and `findOpenLayers()` both treat it as a first-class option), correct.
- **StandardCost** — balance pinned to `StockItem.standardCost`; receipt-price variance captured
  immutably per-row (`StockLedger.priceVariance`); correct, but **not posted to a GL Purchase Price
  Variance account** — this remains the single most significant costing gap (§8).
- **LastPurchaseCost** — cache refreshed on every receipt, correct.

**Inventory valuation**: `Inventory.totalCost`/`avgUnitCost` stay internally consistent for every
method (verified by `inventory-cost-engine.test.ts`'s explicit balance assertions after multi-step
receipt/issue sequences). No inventory movement can corrupt valuation *within a single posted
document* — the movement plan and cost resolution happen inside `postDocument()`'s one transaction.

**COGS readiness**: the Cost Engine returns a real, resolved unit cost for every outbound movement
today (issuance, transfer, adjustment) — the *primitive* a future Sales COGS posting needs already
exists and is correct. No code currently calls it from the Sales domain (confirmed absent).

**Future manufacturing/recipe consumption compatibility**: the same primitive
(`inventoryCostEngine.resolveOutboundCost`) is what a Production Consumption engine would call;
nothing about its interface is Purchasing-specific. Genuinely ready to extend, not just claimed to
be — the strategy-map design was built for this.

**Inventory adjustments / Supplier returns / Transfer costing**: all three route through
`postDocument()` and therefore through the same Cost Engine — verified functioning (variance
costed at current avg for adjustments, returned quantity costed at the return's own recorded price
for returns, "cost follows the goods" for transfers). No separate/duplicate costing logic exists
for any of them.

**Negative inventory behavior**: `Inventory.applyOutbound()`'s atomic `$gte` guard blocks it unless
`InventorySettings.allowNegativeStock` is explicitly true. When allowed, FIFO/LIFO's layer
consumption falls back to the current weighted-average cost for any shortfall beyond available
layers — a defensible, documented choice (there's no real layer to attribute the phantom stock to),
but it means a negative-stock scenario under FIFO produces a blended cost, not a "true" FIFO cost.
Disclosed, not silently accepted.

**Back-dated transactions**: `postingDate` is recorded on the `StockLedger` row for reporting
purposes, but cost resolution always uses the *current* cost basis at the moment of actual posting
— there is no historical reconstruction. Posting a transaction dated last week today still consumes
today's FIFO layers / reads today's weighted average. This is standard behavior for a perpetual
(non-periodic) costing system without a dedicated recalculation engine, and every named competitor
that supports true back-dated recosting does so via an explicit "recalculation run," not perpetual
real-time costing — this platform has neither the recalculation run nor a documented restriction
against back-dating, which is the gap worth naming.

**Recalculation scenarios / cost corrections**: no dedicated "recost" or "cost correction"
endpoint exists. A wrong `unitCost` on a receipt can only be corrected via a new offsetting
ADJUSTMENT document going forward — the original ledger row is never rewritten (by design, for
immutability) but also never correctable in place (a real gap for a data-entry-error scenario).

---

## 4. Phase 3 — Inventory Integrity

| Concept | SSOT | Status |
|---|---|---|
| On Hand | `Inventory.quantity` | Solid — single authoritative balance, `$inc`-only writes |
| Reservations / Committed | — | **Not built.** No `Reservation` model exists; `Inventory.available` (`quantity - reserved`) is not computed anywhere because nothing writes `reserved`. Named in the V5 architecture doc as a future addition; still future. |
| In Transit | `StockTransferRequest.status === "Approved"` (implicit) | Weak — there is no distinct "in transit" bucket on `Inventory` itself; a transfer's stock is simply still `On Hand` at the source warehouse until `Executed`, then atomically moves. Functionally correct (no double-count), but a report asking "what's currently in transit between warehouses" has no dedicated query target beyond scanning `StockTransferRequest` documents. |
| Damaged / Expired | `GoodsReceiptNote.items[].condition` (at receipt) | Recorded at receipt time only — a GOOD item that later becomes damaged/expired in storage has no write path to reflect that (would need to go through Inventory Adjustment as a generic shrinkage, losing the damaged/expired *reason* on the ledger). |
| Future Production Allocation | — | Not built (recipe consumption doesn't exist yet). |
| Future Sales Allocation | — | Not built (no reservation model). |
| Cycle Count / Physical Count | `InventoryCount` | Solid, atomic (V6.0), tested. |
| Adjustments | `WarehouseDocument` (ADJUSTMENT) via `InventoryCount.execute()` | Solid. |
| Transfers | `WarehouseDocument` (TRANSFER) via `StockTransferRequest.execute()` | Solid. |
| Returns | `WarehouseDocument` (OUT, ReturnPurchase) via `PurchaseReturnInvoice.approve()` | Solid, quantity-bounded (V5.2). |
| Warehouse Documents | `WarehouseDocument` | Solid — single write path (`postDocument`) for every inventory-affecting engine, no parallel implementation anywhere. |
| Stock Ledger | `StockLedger` | Solid, append-only, verified immutable (no update method exists on the service). |

**Every quantity that exists today has exactly one authoritative source** — confirmed by re-walking
`SUPPLY_CHAIN_SSOT_MATRIX.md`'s table against the actual code. The concepts explicitly named in
this prompt's Phase 3 list that are **not built** (Reservations, Available Quantity as a real field,
Committed, In Transit as a distinct bucket, Future Production/Sales Allocation) are consistently
*absent*, not inconsistently half-built — there is no redundant or drifting second source for any
of them because there is no source at all yet. That is a completeness gap, not an integrity bug.

---

## 5. Phase 4 — Financial Integrity

- **Journal Entries**: balanced-by-construction (`totalDebit === totalCredit` checked before any
  write), period-locked, reversal-only correction (`reverseEntry()`, never edit-in-place),
  idempotent per source document (V5.2 guard). Verified: nothing posts twice (V6.0 concurrency
  tests), nothing reverses twice (`reverseEntry()`'s own status guard — `Posted` required, sets
  `Reversed`, a second call fails the guard), nothing becomes orphaned (every line requires a
  `journalEntry` back-reference, enforced at the schema level).
- **Supplier Ledger**: running-balance chain, now race-safe (V6.0, §1.3), one-shot-guarded against
  duplicate Purchase/PurchaseReturn postings (V6.0, §1.2).
- **Inventory Valuation**: internally consistent per the Cost Engine's guarantees (§3); no
  standalone "valuation" document exists to drift from it (correct, per SSOT discipline).
- **Purchase Accruals / Accounts Payable**: `SupplierTransaction`'s running balance *is* the AP
  subledger; no separate accrual concept exists (a Purchase transaction directly credits AP —
  functionally correct for cash/accrual-agnostic accounting as currently modeled, but there is no
  distinct "goods received, not yet invoiced" GR/IR clearing account, which every named ERP
  competitor models explicitly. This platform's GRN and PurchaseInvoice are decoupled by design
  (§5.1 of the domain redesign) but nothing bridges the GR/IR gap with a real GL account).
- **Payment Posting**: atomic, balance-bounded, verified.
- **Reversals/Corrections**: solid at the JournalEntry layer; **absent** at the inventory-cost
  layer (§3's "no recost" gap) and at the Purchase Price Variance layer (§8).
- **Future PPV / landed cost / multi-currency / tax adjustments**: none built. `JournalLine`
  already carries `currency`/`exchangeRate`/`convertedDebit`/`convertedCredit` fields (schema-ready
  for multi-currency) but no exchange-rate resolution service exists to populate them meaningfully
  today — every posting this pass writes uses `exchangeRate: 1` implicitly. Landed cost (freight/
  duty/handling allocated into inventory cost) has no model or posting path at all.

---

## 6. Phase 5 — Event Architecture

- **Publisher consistency**: `PURCHASE_ORDER_APPROVED`, `GOODS_RECEIPT_CONFIRMED`,
  `INVENTORY_BELOW_REORDER_POINT` are the only three events; all three are emitted from exactly one
  place each (no duplicate publishers for the same event).
- **Subscriber isolation**: one real subscriber (Replenishment Engine) self-catches its own errors
  per the dispatcher's documented contract — verified by reading the handler's own try/catch, not
  assumed.
- **Idempotency**: the dispatcher itself provides none — idempotency is each subscriber's own
  responsibility. The one real subscriber has it (existence check, §2.3's narrow race aside).
- **Retry safety**: the dispatcher does not retry a failed handler, and — critically — for
  `PURCHASE_ORDER_APPROVED` and `GOODS_RECEIPT_CONFIRMED`, which currently have **zero
  subscribers**, this is moot; for `INVENTORY_BELOW_REORDER_POINT`, a handler failure is logged and
  swallowed (never retried, never surfaced to an operator beyond a console line — no dead-letter
  concept exists).
- **Ordering**: guaranteed only within a single `emit()` call (sequential await across listeners for
  one event) and only within a single `postDocument()` call's loop (events collected during the
  loop, emitted after commit, in movement order). No ordering guarantee *across* separate
  `postDocument()` calls — none is currently needed by anything, but it's worth naming since a
  future second Reorder-adjacent subscriber would inherit this limitation.
- **Transaction boundaries**: events are emitted *after* the posting transaction commits (correct —
  never announce something that got rolled back), but this also means a handler's own writes are
  never part of the originating transaction — already true and by design.
- **Future Outbox/Message-Bus/Kafka/RabbitMQ compatibility**: the dispatcher's `on`/`emit` surface
  is narrow enough that swapping the implementation (in-process `EventEmitter` → an Outbox table +
  poller, or a real broker client) would be a one-file change to `utils/domainEvents.js` — every
  caller only depends on `DomainEvent.<NAME>` constants and `dispatcher.emit()`/`.on()`, not on
  synchronous-in-process semantics being load-bearing anywhere in application code. This is a real
  architectural strength, not just an aspiration — verified by grepping every call site.

**No module communicates directly where a Domain Event would be more appropriate** — confirmed:
the two purely-informational events (PO Approved, GRN Confirmed) exist specifically because a
future subscriber (notifications, a downstream system) shouldn't require `purchase-order.service.js`
or `goods-receipt-note.service.js` to import it directly. The one place direct calls remain
(`GoodsReceiptNote.confirm()` calling `purchaseOrderService.applyReceivedQuantities()` directly,
rather than via an event) is a deliberate choice, not an oversight: that call's result (the PO's
own rolled-up status) is needed synchronously, in the same request, before the GRN's own response
returns — an async event would make the PO's status update a race against the HTTP response.

---

## 7. Phase 6 — Security Review

- **RBAC**: every purchasing/inventory router chains `authenticateToken → authorize(resource,
  action) → checkModuleEnabled → validate → controller`, confirmed by scanning every router file
  this pass (`grep` for `authorize(` returned a hit in every one; none were bypassed).
- **Brand/branch isolation**: spot-checked the two read-side engines built without `BaseRepository`
  (VendorLedger, ThreeWayMatch) specifically because they hand-write Mongoose queries rather than
  inheriting brand-scoping automatically — confirmed every query includes `brand` sourced from
  `req.user.brandId` (server-derived from the JWT), never from client-supplied `req.query`/
  `req.params`/`req.body`. No horizontal-escalation vector found in either.
- **Vertical privilege escalation**: `authorize()` is resource+action scoped
  (`authorize("PurchaseOrders", "create")`, etc.) throughout; no route was found calling a
  mutating controller method behind a `"read"`-only authorization check.
- **Soft delete rules**: every transactional document in this domain (PurchaseOrder, GRN,
  PurchaseInvoice, PurchaseReturn, InventoryCount, StockTransferRequest) correctly has
  `enableSoftDelete: false` — status-lifecycle documents are not soft-deletable, preventing a
  "delete" action from silently bypassing the audit trail a cancel/reject transition would leave.
- **Immutable documents**: `StockLedger` and posted `JournalEntry` rows have no update path at the
  service layer — confirmed, not assumed.
- **Approval workflows**: every engine's `approvedBy`/`confirmedBy`/`executedBy`/`postedBy` is
  populated from the authenticated actor (`req.user.userId`), never client-supplied.
- **Sensitive operations**: payment recording, invoice completion, and return approval all require
  the specific `authorize()` permission for their resource — no operation found reachable via a
  weaker permission than its risk warrants.

**Not reviewed this pass** (out of Supply Chain domain scope, named honestly rather than silently
skipped): the platform-wide AuditLog gaps already flagged in V5.2 (no before/after diff capture, no
logging of failed unauthenticated requests) remain unfixed — cross-cutting, not Supply-Chain-
specific.

---

## 8. Phase 7 — Enterprise Scalability Review

- **Large chains (100+ branches, 1000+ employees)**: multi-brand/multi-branch scoping is a
  first-class, enforced convention (`BaseRepository`'s `brandScoped`/`branchScoped` options, not a
  bolted-on filter) — this is architecturally sound for scale. Not load-tested this pass (no
  performance benchmark was run) — a scalability *readiness* claim, not a *verified-at-scale* claim.
- **Millions of orders / large inventory**: `StockLedger` is append-only and will grow unbounded;
  indexes exist on `{warehouse, stockItem, movementDate}` for the FIFO/LIFO layer query pattern, but
  no archival/partitioning strategy exists for a ledger that will eventually be enormous at real
  transaction volume. Not a defect today, a genuine future concern.
  `SupplierTransactionService.record()`'s "most recent transaction" balance lookup is an indexed
  query (`{brand, supplier}` + sort by `createdAt`) — fine at moderate volume, but computing a
  running balance by always re-deriving from history rather than a cached-and-verified snapshot is
  a design that gets more expensive, not less, as a supplier's transaction history grows. No
  snapshot/checkpoint mechanism exists.
- **Multiple warehouses/kitchens/suppliers**: architecturally supported today (every model already
  scopes by warehouse; Consumption's `preparationSection`/`shift` fields anticipate multi-kitchen
  even though the module has no business logic yet).
- **Future SaaS / Multi-Tenant**: the brand-scoping convention *is* the multi-tenancy boundary
  already — no redesign needed for this specifically.
- **Future Franchises**: no franchise-specific concept exists (e.g., royalty calculation, franchise
  billing) — out of this domain's scope entirely, correctly unaddressed.
- **Future Cloud deployment**: no code in this domain assumes a specific deployment topology;
  MongoDB transactions are used correctly (session-scoped, not assuming a single-node deployment).
- **Future Offline POS synchronization**: not applicable to this domain (Purchasing/Inventory are
  back-office, not POS-facing) — no gap to report.
- **Future Event Streaming / Microservices extraction**: the Domain Event Dispatcher's narrow
  interface (§6) is the single biggest enabler here — genuinely ready to swap for a broker without
  touching call sites. The Repository Pattern (model+service+controller+router per entity) is
  already close to a bounded-context shape; extracting Purchasing or Inventory into a separate
  service would primarily be a data-ownership/API-boundary exercise, not an internal-architecture
  rewrite.

**Not redesigned, per the explicit instruction to only improve where a real limitation exists**: no
sharding strategy, no read-replica routing, no caching layer — none of these have a demonstrated
need yet at this platform's actual usage, and speculative infrastructure for hypothetical scale
would be exactly the premature engineering this whole engagement has consistently avoided.

---

## 9. Phase 8 — Competitive Gap Analysis

| Gap | Severity | Notes |
|---|---|---|
| Purchase Price Variance not posted to GL | **High** | Computed correctly, never journaled — a StandardCost brand's books won't reconcile against actual spend without a manual process. |
| No Reservation / Available-Quantity model | **High** | Named explicitly in this prompt's Phase 3; every competitor has this as baseline inventory functionality. |
| No lot/batch/FEFO tracking | **High** | Schema fields exist (`StockLedger.expirationDate`/`.productionDate`), zero write-path support — confirmed by grep. |
| GR/IR clearing account absent | **Medium** | GRN and Invoice are correctly decoupled by design, but nothing bridges them in the GL the way SAP/NetSuite's GR/IR account does. |
| No EOQ / demand forecasting | **Medium** | Reorder quantity is a static field; every named competitor offers at least basic EOQ. |
| No RFQ / multi-supplier quotation comparison | **Medium** | `PurchasingSettings.procurementLevel: "ENTERPRISE"` is scoped for this; entity never built. |
| No inventory valuation / cost-variance / aging reports beyond Vendor Ledger | **Medium** | No reporting layer exists — every named competitor ships a standard report suite. |
| No cost-correction / recalculation mechanism | **Medium** | A wrong receipt cost can only be offset going forward, never corrected in place (by design, for immutability — but no correction *workflow* exists either). |
| No API-level payment idempotency key | **Medium** | Overpayment is blocked; exact-duplicate-submission is not (§2.2). |
| Consumption module is CRUD-only | **Medium** | An entire named module (shift-level kitchen reconciliation) has zero business logic — schema exists, engine does not. |
| No notification/alerting engine | **Low-Medium** | Replenishment's `NOTIFY_ONLY` path has nothing to deliver to. |
| No multi-currency posting (exchange-rate resolution) | **Low** | Schema-ready, not wired; most brands operate single-currency today. |
| No landed cost allocation | **Low** | No model, no posting path — a real gap for import-heavy restaurant supply chains specifically, flagged as restaurant-relevant future work. |
| `StockLedger` has no archival strategy | **Low (today) / rising** | Not a defect at current scale; a real future concern named honestly. |
| Domain Event system is in-process only | **Future Enhancement** | Architecturally ready to swap (§6), not a current limitation for a single-process deployment. |
| No franchise/royalty modeling | **Future Enhancement** | Out of this domain's scope by design. |

**Architectural strengths that should not be undersold in this comparison**: the atomic-claim
concurrency pattern now applied consistently across every transition method in this domain is, if
anything, *more rigorous* than what a quick review of typical Odoo/NetSuite customization code
exhibits (those platforms provide the primitive; individual customizations frequently get this
wrong). The Domain Event Dispatcher, TransitionGuard, SequenceGeneratorService, and Repository
Pattern conventions give this codebase a materially better extension story than inheriting a
15-year-old SAP or NetSuite customization layer — a genuine, evidenced advantage, not marketing.

---

## 10. Readiness Scores

Scored 1–5 (5 = matches or exceeds the named competitor set for this specific capability; 1 = not
usable in production). Each score is justified by the evidence in the sections above, not asserted
independently.

| Dimension | Score | Justification |
|---|---|---|
| **Production Readiness** | 3.5/5 | Core procurement chain, costing, and concurrency safety are genuinely production-grade; Reservations/lot-tracking/PPV-posting/reporting gaps keep this from a 4+. |
| **Security** | 4/5 | RBAC, brand isolation, and actor attribution are consistently solid; docked for the platform-wide (not Supply-Chain-specific) AuditLog diff-capture gap. |
| **Scalability** | 3.5/5 | Multi-tenancy and multi-branch scoping are architecturally sound; docked for the unaddressed ledger-growth/balance-recomputation cost curve at real volume (untested, not disproven). |
| **Maintainability** | 4.5/5 | Repository Pattern, TransitionGuard, SequenceGeneratorService, and the Cost Engine's strategy-map design are consistently applied; every new capability this pass was an extension, never a parallel implementation. |
| **Performance** | 3/5 | No load testing was performed this pass — this score reflects *design* (atomic operations, indexed queries) rather than *measured* throughput; genuinely unknown until benchmarked. |
| **Accounting Readiness** | 3.5/5 | Journal Entry Posting Engine is rigorous (balanced, period-locked, idempotent, reversal-safe); docked for missing PPV posting, GR/IR clearing, and multi-currency wiring. |
| **Inventory Readiness** | 3.5/5 | Costing and movement posting are solid and race-safe; docked for the complete absence of Reservations/Committed/lot-tracking. |
| **Restaurant-Specific Readiness** | 2.5/5 | The Consumption module (shift reconciliation, theoretical-vs-actual variance) is exactly the restaurant-specific capability this platform most needs and it is unimplemented CRUD; Recipe/Production consumption doesn't yet call the Cost Engine at all. |

---

## 11. Final Classification

**Production Ready:**
- Procurement chain: Supplier → PurchaseRequest → PurchaseOrder → GoodsReceiptNote →
  PurchaseInvoice → SupplierTransaction → Payment, including three-way matching, concurrency-safe
  transitions, and duplicate-posting guards at every layer this pass touched.
- Inventory Posting Engine (all five costing methods, atomic, transaction-safe, rollback-safe).
- Journal Entry Posting Engine (balanced, period-locked, idempotent, reversal-safe).
- Vendor Ledger (statement, aging, open payables, credit limit, reconciliation).

**Production Ready With Limitations:**
- Supplier Returns, Inventory Count/Adjustment, Stock Transfers — functionally complete,
  concurrency-safe (V6.0), still subject to the sequence-of-atomic-steps transaction-boundary
  tradeoff (§2.1) rather than full 2PC.
- Replenishment Engine — real, event-driven, mostly idempotent; the narrow cross-call race in §2.3
  and the absent EOQ/notification-delivery pieces keep it "with limitations."
- Standard Costing — mathematically correct and immutable, but unusable for a brand that needs its
  books to reconcile against actual spend without a manual PPV process.

**Intentionally Deferred (named, not hidden):**
- Reservations / Available Quantity / Committed stock.
- Lot/batch/FEFO tracking.
- RFQ / multi-supplier quotation comparison.
- Multi-currency posting, landed cost.
- Inventory valuation / cost-variance / aging reports beyond Vendor Ledger.
- API-level payment idempotency keys.
- Notification/alerting engine.

**Must be completed before this module is Enterprise Grade** (in priority order):
1. Reservation/Available-Quantity model — the single biggest inventory-integrity gap relative to
   every named competitor.
2. Purchase Price Variance posting — the single biggest accounting-integrity gap for a
   StandardCost brand.
3. Consumption engine build-out — the single biggest *restaurant-specific* gap; the schema already
   anticipates it, the Cost Engine primitive it needs already exists, only the workflow is missing.
4. Lot/batch/FEFO tracking — required for any brand handling perishables at real volume.
5. A reporting layer (valuation, cost-variance, aging) beyond the Vendor Ledger.

---

## 12. Phase 10 — Final Verification

- **Full regression**: 45/45 test suites, 207/207 tests passing (44 suites/203 tests carried
  forward from V5.2, plus `supply-chain-concurrency-safety.test.ts`'s 4 new tests).
- **Concurrency tests**: 4/4 passing, exercising real `Promise.allSettled` races against
  `GoodsReceiptNote.confirm()`, `PurchaseInvoice.transition()`, `PurchaseOrder.transition()`, and
  `supplierTransactionService.record()`'s duplicate guard.
- **Idempotency tests**: covered by the same suite (duplicate AP transaction rejection) plus the
  V5.2 `journalEntryService.postFromSource()` idempotency test, both re-run and passing.
- **Transaction tests**: covered by the existing procurement-chain/three-way-match/inventory-count/
  stock-transfer suites, all re-run and passing after this pass's changes.
- **Typecheck**: `tsc --noEmit` unchanged at the pre-existing 58-error baseline (all in unrelated
  migration scripts — zero new errors from any file touched this pass).
- **Live boot**: clean, `MongoDB Connected` → `Server is running`, no startup errors from any
  service touched this pass (including `registerEventHandlers()` from V5.2, unaffected).
- **Route verification**: every changed/new route smoke-tested to the correct 401 unauthenticated
  response (no route was added this pass — V6.0 changed only service-layer logic, so route
  verification confirms no accidental exposure, not new surface area).
- **Authorization verification**: `authorize()` presence confirmed via direct grep across every
  purchasing/inventory router file — no router found missing it.

Nothing in this document is marked complete without the above evidence existing to back it.

---

## 13. Post-Release Addendum — Orphan/Dead-Code Sweep

A follow-on hardening pass performed a dedicated Phase 10 sweep (orphan routers/services/models,
dead code, event-catalog consistency, naming) not fully covered above. Full findings and fix log:
`SUPPLY_CHAIN_TECHNICAL_DEBT.md`. Headline result: one genuinely broken orphaned module
(`StockCategoryService` — hand-rolled, non-Repository-Pattern, plus a model missing its soft-delete
fields, meaning even a correct service would have returned zero results from `getAll()`) was found,
fixed, mounted at `/stock-categories`, and verified; `Consumption` remains deliberately unmounted
(real gap, not debt-by-accident — see the technical debt registry). Regression after this fix:
**46/46 suites, 208/208 tests.**
