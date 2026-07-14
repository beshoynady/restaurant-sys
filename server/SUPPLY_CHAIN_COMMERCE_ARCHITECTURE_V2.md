# Supply Chain & Commerce Platform — Architecture V2 (Deepened Review)

Status: **design only — no code written**, as of the original V2 pass. This document revises and deepens `SUPPLY_CHAIN_COMMERCE_DOMAIN_REDESIGN.md` in the specific dimensions requested: Procurement as a maturity-level policy engine, a formal Inventory Deduction Policy Engine, a full Payment Platform architecture (not just an adapter contract), a real Domain Event Dispatcher, and an honest scoping pass on the Inventory/Purchasing/Sales Platform expansions. Where the prior document's design already satisfies a requirement, it's reused and cross-referenced, not rewritten.

**V5.2 update:** the Domain Event Dispatcher and Procurement Policy Engine designed here are now
built and have real publishers/subscribers (`utils/domainEvents.js`, `utils/registerEventHandlers.js`,
`modules/inventory/replenishment/replenishment.service.js`) — see `SUPPLY_CHAIN_FINAL_AUDIT.md` for
the current, evidence-checked status of every capability this document describes. The Payment
Platform and full Commerce Platform sections below remain design-only; not implemented this pass.

**On scope honesty, stated up front:** this request asks for architecture comparable to SAP/Oracle/Dynamics/Odoo across procurement, inventory, payments, and a "full commerce platform" (POS/QR/online/loyalty/gift cards/subscriptions/marketplace) simultaneously. Some of this is genuinely tractable to design in depth right now (Procurement maturity levels, Payment Platform, Inventory Deduction Policy). Some of it is architecturally simple but represents a large amount of net-new transactional surface (Gift Cards, Subscriptions). Some of it is a reporting/analytics *capability layered on top of* the transactional model, not new write-side entities (ABC analysis, inventory valuation reports, purchase KPIs) — conflating those with the transactional redesign would be a real design mistake, not thoroughness, so they're explicitly separated below. Each section says which category it's in.

---

## 1. Procurement as a configurable maturity-level engine

The prior redesign's `SIMPLE`/`FULL_CYCLE` split becomes the foundation of a real 3-level model — not three different systems, **one entity chain with configurable entry points**:

```
Level 1 (Simple):     Supplier ──────────────────────────────→ PurchaseInvoice → GRN(auto) → Accounting
Level 2 (Standard):   Supplier → PurchaseOrder ──────────────→ GRN → PurchaseInvoice → Accounting
Level 3 (Enterprise): Supplier → PurchaseRequest → Approval → RFQ → Quotation(s) → Selection → PurchaseOrder → GRN → PurchaseInvoice → 3-Way Match → Accounting → Payment
```

**Design principle: Level 3 doesn't replace Level 2's entities, it prepends to them.** `PurchaseOrder`, `GoodsReceiptNote`, and `PurchaseInvoice` (already designed in the prior document) are exactly the same entities regardless of level — a Level-3 flow just requires a `PurchaseOrder` to have originated from an approved `PurchaseRequest`/`Quotation` rather than being created directly. This is what makes the level configurable per-brand (and realistically, a brand should be able to *raise* its level over time without a data migration — every Level-1 `PurchaseInvoice` is still valid data under Level 3's rules, it's simply missing the optional upstream references).

### New entities (Level 3 only — nullable/unused entirely at Levels 1–2)

| Entity | Purpose | Key fields | Lifecycle |
|---|---|---|---|
| **PurchaseRequest** | Internal "we need to buy X" — raised by any authorized staff, not yet a commitment to any supplier | `brand`, `branch`, `requestedBy`, `items[]{stockItem, quantity, neededBy}`, `justification`, `status` | `Draft → Submitted → Approved/Rejected` (approval chain reuses the `decisionBy` pattern already established for `SalesReturnSettings`) |
| **RFQ (Request for Quotation)** | One approved `PurchaseRequest` fanned out to N candidate suppliers | `brand`, `purchaseRequest` (ref), `suppliers[]` (refs), `items[]`, `responseDeadline`, `status` | `Draft → Sent → QuotationsReceived → Closed` |
| **SupplierQuotation** | One supplier's response to an RFQ | `rfq` (ref), `supplier` (ref), `items[]{stockItem, quotedPrice, leadTimeDays}`, `validUntil`, `status` | `Received → UnderReview → Selected/Rejected` |
| **Supplier Selection** | Not a separate document — the act of setting `PurchaseOrder.sourceQuotation` (ref) when creating the PO from a selected `SupplierQuotation`. Comparison ("quotation comparison") is a read-side query across `SupplierQuotation` for one RFQ, not a new write model. | — | — |

**Configuration:** `PurchasingSettings.procurementLevel` enum `1|2|3`, replacing the earlier binary `procurementMode`. At Level 1, `PurchaseOrder`/`GoodsReceiptNote` are still created (auto-generated, as already designed) — they're never skipped at the data layer, only skipped at the *UI/workflow* layer, which is exactly why raising a brand's level later requires no migration.

---

## 2. Inventory Deduction Policy Engine

Formalized as a genuine Strategy Pattern, not a single enum branch buried in `InventorySettings`:

```
InventorySettings.deductionStrategy: "ORDER_CONFIRMED" | "KITCHEN_STARTED" | "KITCHEN_READY" | "DELIVERED" | "PAID" | "CUSTOM"
```

Each named strategy maps to exactly one domain event (§4) that triggers the deduction call — `ORDER_CONFIRMED`→`Order.Confirmed`, `KITCHEN_STARTED`→`PreparationTicket.Started`, `KITCHEN_READY`→`PreparationTicket.Ready`, `DELIVERED`→`Order.Delivered`, `PAID`→`Invoice.Completed`. The deduction *logic itself* (Recipe lookup → Unit Conversion → `WarehouseDocument` Issuance posting, all designed in the prior document) is identical regardless of which event triggered it — the strategy only decides *when* to call it, never *how*. `CUSTOM` is reserved (not implemented) as an explicit extension point: a future brand-specific hook without inventing what it does today.

This directly maps to real restaurant types without hardcoding any of them: fast food/cloud kitchen naturally choose `KITCHEN_READY` or `ORDER_CONFIRMED` (speed matters, revision risk is low); fine dining might prefer `DELIVERED` (courses can be sent back before consumption); a prepaid meal-prep/catering business might use `PAID`. None of these restaurant-type names appear in code anywhere — they're just illustrative defaults a setup wizard could suggest.

---

## 3. Payment Platform — full architecture

This is the largest genuinely-new subsystem in this revision. Designed as distinct, composable pieces — exactly the separation SAP/Oracle/Stripe-style platforms use, and the reason none of them couple business logic to a specific processor.

### 3.1 Components

| Component | Responsibility |
|---|---|
| **Payment Gateway** (facade) | The single entry point business services call — `initiatePayment()`, `capturePayment()`, `refundPayment()`, `voidPayment()`. Never calls a provider SDK directly; always goes through the Resolver. |
| **Provider Registry** | `PaymentProvider` documents (existing, extended per the prior document) — which providers are configured for this brand, each with an `adapterKey`. |
| **Provider Resolver** | Given a request (currency, country, payment method, amount), picks which configured provider should handle it — e.g. Meeza only for EGP, a specific gateway preferred for card vs. wallet. Pure decision logic, no I/O — cleanly unit-testable, and the actual extension point for "add a new provider without changing business logic," since the Resolver is the only thing that needs to learn a new provider exists. |
| **Adapter** (one per provider) | Implements the shared contract (`initiate/authorize/capture/void/refund/getStatus`) against one specific provider's real API shape. This is where Paymob's (or any other provider's) SDK/HTTP calls actually live — and the *only* place they live. |
| **Webhook Engine** | Inbound endpoint(s) that receive provider callbacks. Verifies signature (per-provider secret, resolved via `PaymentProvider.credentialsRef` — never inline in code or in a document field), maps the provider's payload to a `PaymentTransaction` status update via the same adapter's `verify()` method (adapters translate provider-shape into the shared status vocabulary — business code never sees provider-specific fields), and is idempotent by construction (§3.3). |
| **Retry Engine** | For *outbound* calls to a provider (e.g. `capture` fails on transient network error) — bounded exponential backoff, not infinite/blind retry, and never retries an operation that isn't itself idempotent (§3.3) without first checking status. |
| **Provider Health Monitor** | Tracks recent success/failure rate and latency per provider (a simple rolling counter, not a new complex subsystem) — feeds the Resolver so a provider currently failing can be deprioritized in favor of a healthy alternate, if the brand has more than one configured. This is circuit-breaker *awareness*, not a full circuit-breaker library — scoped to what this platform actually needs. |

### 3.2 `PaymentIntent` vs. `PaymentTransaction` — why both exist

A single `PaymentTransaction` (as designed in the prior document) is enough for simple cash/single-capture flows, but not enough to model **authorize-then-capture-later** (a real requirement — e.g. authorizing a card at order time, capturing only once the order is fulfilled) or **partial capture** (capturing less than authorized, e.g. an item became unavailable). Enterprise payment platforms (Stripe chief among them) solve this with two related but distinct concepts:

- **`PaymentIntent`** — created first, represents "we intend to collect this amount," before any money actually moves. Carries `amount`, `currency`, `sourceType`/`sourceId` (same polymorphic pattern as before), `status`.
- **`PaymentTransaction`** — one or more actual money-movement events *against* a `PaymentIntent` (an authorization, a capture, a partial capture, a refund, a void are each their own `PaymentTransaction` row, all referencing the same `PaymentIntent`). This is what makes "partially captured" and "partially refunded" representable without overloading a single row's meaning.

`PaymentIntent` is the aggregate root or the transaction lifecycle; `PaymentTransaction` is its append-only event log — the exact same "snapshot + immutable ledger" pattern this codebase already uses correctly for `Inventory`+`StockLedger` and `Brand.balance`-style patterns elsewhere. Not a new idea introduced into this codebase, the same proven shape reapplied.

### 3.3 Idempotency (both directions)

- **Inbound (webhooks):** unique index on `{provider, providerEventId}` — a replayed webhook (all providers retry on missing 200 OK) is a safe no-op, detected before any state change, not merely "processed twice harmlessly."
- **Outbound (this platform calling a provider):** every `PaymentGateway` operation accepts/generates an `Idempotency-Key`, stored on the `PaymentTransaction` row being created, exactly mirroring the pattern already built for `OnboardingSession.complete()` in the System Setup V2 redesign this session — same mechanism, second application, not reinvented.

### 3.4 Full lifecycle state machine

```
PaymentIntent:  Created → RequiresAction (e.g. 3DS) → Authorized → PartiallyCaptured/Captured
                                                                  → Voided (before capture)
                Captured/PartiallyCaptured → PartiallyRefunded/Refunded
                Any pre-Captured state → Failed / Expired
                Captured → Disputed → ChargedBack   (see §3.5)
```

Each transition corresponds to exactly one `PaymentTransaction` row (type: `AUTHORIZATION`/`CAPTURE`/`VOID`/`REFUND`/`DISPUTE`/`CHARGEBACK`) — the `PaymentIntent.status` is a **derived/cached** field recomputed from its `PaymentTransaction` history, never the primary source of truth (same SSOT discipline as `Inventory.avgUnitCost` being derived from `StockLedger`, not independently maintained).

### 3.5 Dispute/chargeback readiness

Not a full dispute-management workflow (that requires evidence submission, provider-specific deadlines, and case management — a distinct, large feature in its own right, correctly out of scope here). What *is* in scope now: the `Disputed`/`ChargedBack` states exist on the lifecycle and a `PaymentTransaction` row can represent one (populated by a webhook when a provider reports a dispute), so the *data* is captured and queryable the moment it happens — the case-management UI/workflow around it is a clearly separable future addition that won't require another schema change when built.

### 3.6 Settlement

`PaymentChannel` (existing, per the prior audit) already carries `clearingAccount`/`settlementAccount`/`feeAccount`/`settlementDelayDays` — this redesign's addition is a `SettlementBatch` concept (groups captured `PaymentTransaction`s by provider+date, matches against the provider's actual payout, posts the settlement JournalEntry) — noted as a defined future extension point (its fields are anticipated by `PaymentChannel` already existing), not built in this pass, since it depends on having real transaction volume through at least one real adapter first (Roadmap M-Payment-3, §10).

### 3.7 First provider: Paymob

Per instruction, only one adapter gets built initially. The Resolver/Registry/Gateway/Webhook Engine are provider-agnostic by construction (§3.1), so this is genuinely "write one adapter file, register it" — not a special case in the architecture. Building Paymob's adapter is the concrete proof that the contract is sufficient before any of the other six named providers (Fawry, Stripe, MyFatoorah, HyperPay, Checkout.com, Adyen, PayPal) are attempted.

---

## 4. Domain Event Dispatcher (new shared infrastructure)

The prior document modeled domain events as direct synchronous service-to-service calls (e.g. `PurchaseInvoice.Completed` directly calling `journalEntryService`). That's sufficient when exactly one thing needs to react to an event. It stops being sufficient the moment **multiple, independent things** need to react to the same event — which this revision now has: `StockItem.BelowThreshold` should eventually notify someone *and* feed a Reorder Engine (§5.4) *and* potentially update analytics, without those three consumers needing to know about each other or be wired into the same call site.

**Design: a minimal, in-process event dispatcher** (`domainEvents.emit(eventName, payload)` / `domainEvents.on(eventName, handler)`) — not a message queue, not Kafka/RabbitMQ, not a distributed system. This is a deliberate, scoped choice: the platform is a single Node process today, and introducing real message-queue infrastructure is a much larger operational decision (deployment topology, at-least-once delivery guarantees, dead-letter handling) that isn't justified by anything in this domain — it's flagged as a natural future upgrade path *because* using named events now (rather than scattering direct calls) means swapping the in-process dispatcher for a real queue later touches one file, not every call site.

Every event named in §5 of the prior document (`PurchaseOrder.Approved`, `GoodsReceipt.Confirmed`, etc.) becomes a real `emit()` call; the currently-direct calls (Invoice→JournalEntry, etc.) are refactored to `on()` handlers registered at startup — a mechanical, low-risk change (same call graph, different wiring), not a behavior change.

---

## 5. Inventory Platform — separating new transactional entities from analytics

### 5.1 Genuinely new write-side concepts (designed now)

- **Lot/Batch tracking**: `StockLedger` already has `expirationDate`/`productionDate` fields (currently unpopulated per the audit). This revision adds a `lotNumber` (String, nullable) to `StockLedger` and to `Inventory` (as a sub-array when a warehouse holds multiple lots of the same item simultaneously — `Inventory.lots[]{lotNumber, quantity, expirationDate}`, with the existing `Inventory.quantity` becoming the sum across lots for items where `StockItem.trackLots` is false, preserving today's behavior exactly for every item that doesn't opt in). FIFO consumption naturally becomes FEFO (first-expired-first-out) for lot-tracked items — a one-line change to `findOpenLayers`'s sort order when a lot number is present, not a new algorithm.
- **Serial numbers**: for `StockItem.itemType` values where it's meaningful (not typical for restaurant ingredients, but relevant for `AssetPurchaseInvoices`-adjacent equipment purchasing) — modeled the same shape as lots (`serialNumber` instead of `lotNumber`, one unit per serial, `quantity` always 1). Scoped as schema-ready, not a distinct engine — reuses the lot mechanism's plumbing.
- **Stock Reservation / Committed vs. Available**: `Inventory.quantity` today means "physically on hand." This revision splits the read model into `quantity` (on hand, unchanged), `reserved` (committed to open Orders/PurchaseOrders-in-transit but not yet moved), and a derived `available = quantity - reserved`. A **Reservation** is a new lightweight entity (`brand, warehouse, stockItem, quantity, sourceType/sourceId, expiresAt`) created when an Order is confirmed (before deduction fires, per whatever `deductionStrategy` is configured) and released either by the deduction actually happening or by the source order being cancelled. This is what lets a POS correctly show "3 left" instead of overselling the last 3 units to two different tables simultaneously — a real, justified addition, not scope creep.
- **In-Transit stock**: modeled as a state on `StockTransferRequest` (already exists) rather than a new inventory bucket — stock that's been posted OUT of the source warehouse but whose IN-side `WarehouseDocument` hasn't posted yet is "in transit" by definition of the transfer's own status; no separate ledger concept needed.
- **Damaged/Waste**: already representable via `WarehouseDocument.transactionType` (`Wastage`/`Damage`, confirmed existing in the enum per the audit) — this revision just confirms these get real service logic (already scoped in the prior document's M5 milestone), not a new concept.

### 5.2 Reorder Engine (new, tractable, closes the loop back into Procurement)

The one "beyond CRUD" inventory capability worth building as real logic now, because it directly connects two things this redesign already built: when `Inventory.available` (§5.1) drops below `StockItem.reorderQuantity`/`minThreshold`, emit `StockItem.BelowThreshold` (§4) — a registered handler (configurable on/off per `InventorySettings.autoGenerateReorderRequests`) auto-drafts a `PurchaseRequest` (§1, only meaningful at Procurement Level 2+) for the shortfall quantity, from the preferred supplier per `SupplierPriceAgreement` if one exists. **Draft only, never auto-submitted** — an auto-generated `PurchaseRequest` still requires a human to review and submit it, consistent with "never invent business data" (the system proposes, a person decides).

### 5.3 Explicitly analytics/reporting, not new transactional entities (deferred, not designed here)

- **Inventory Valuation** — a report (as-of-date stock quantity × cost, per costing method) computed by *querying* `StockLedger`/`Inventory`, not a new write model.
- **ABC Analysis** — a classification computed by *querying* consumption velocity × value over a period; a scheduled job could cache the result onto `StockItem.abcClass`, but the analysis itself is read-side.
- **Inventory Analytics** (turnover, shrinkage %, etc.) — dashboards over existing data.

These three are correctly deferred to a Reporting/Analytics initiative, not because they're unimportant, but because designing them now would mean designing a reporting subsystem prematurely, before the underlying transactional data (real GRNs, real deductions, real counts) actually exists to report on — building the report before the data it reports on is a common, avoidable ERP-project mistake.

---

## 6. Purchasing Platform — what's genuinely new beyond §1/§5.2

- **Supplier Contracts**: extends `Supplier` (not a new aggregate) — `Supplier.contracts[]{startDate, endDate, paymentTermsDays, minimumOrderValue, terms}`. Distinct from `SupplierPriceAgreement` (per-item pricing) — a contract is the commercial relationship envelope, price agreements are line items within it.
- **Quality Inspection**: extends `GoodsReceiptNote` (not a new aggregate) — `GRN.items[].inspectionResult` enum `PENDING|PASSED|FAILED|PARTIAL`, `inspectedBy`, gates whether a failed line's quantity actually posts to `Inventory` or instead routes to a `PurchaseReturnInvoice` draft (rejected-at-receiving flow) — reuses the return engine already designed, doesn't invent a parallel one.
- **Vendor Credit Note**: this is `PurchaseReturnInvoice`, already fully designed in the prior document — same entity, more accurate name for the Level-3 vocabulary; no schema change required, purely a documentation/UI-label matter.
- **Supplier Performance**: a computed metric set (on-time-delivery % = `GRN.receivedDate` vs `PurchaseOrder.expectedDeliveryDate`; quality score = pass rate from Quality Inspection above) — read-side, same "analytics over existing transactional data" category as §5.3, not a new write model.
- **Lead-time analytics / Purchase KPIs**: same category, deferred with §5.3 for the same reason.
- **Vendor Portal readiness**: a genuinely large, separate initiative (external-facing authentication for suppliers, a scoped read/write API surface exposing only their own POs/GRNs/invoices, likely its own IAM consideration — a supplier is not a `UserAccount`/`Employee`, it would need its own identity concept entirely). Flagged as a named future initiative, not designed here — the groundwork this redesign lays (clean `Supplier`↔`PurchaseOrder`↔`GRN`↔`PurchaseInvoice` relationships) is what makes a future portal *feasible* without a rearchitecture, which is the right level of "readiness" to claim now.

---

## 7. Sales as a Commerce Platform — honest scoping

**Already covered by the prior redesign's integration work** (no new design needed): dine-in/takeaway/delivery channels (`Order.orderType`), split bills (`Order.isSplit`), tips/service charge (`ServiceChargeSettings`), coupons/promotions (`Promotion`, wired into pricing in the prior document's M8), loyalty (`CustomerLoyalty`/`LoyaltySettings`/`LoyaltyRewards` already exist per the earlier audit — not touched by this redesign, already its own working area per the RESOURCE_ENUM cross-check), returns/refunds (`SalesReturn`, redesigned in the prior document).

**Genuinely new transactional entities, not designed in full here — named and scoped for a dedicated future pass:**
- **Gift Card / Store Credit** — a `StoredValueAccount` concept (balance, currency, issued-to-customer, redeemable against future `Invoice`s) — real money-equivalent liability, needs its own accounting treatment (a GL liability account, not revenue, until redeemed) and its own careful design; not sketched further here to avoid the exact mistake §5.3 warns against (designing a shallow version of something that needs to be done properly).
- **Subscriptions** — recurring billing (meal-prep/catering use case named in the prompt) — requires a billing-cycle engine, dunning/retry-on-failed-payment (which now *can* reuse §3's Payment Platform once it exists), and proration logic. A distinct initiative that depends on §3 being built first.
- **QR/Online ordering as a customer-facing channel** — architecturally this is "another way to create an `Order`," not a new commerce concept; the actual work is a public-facing API surface and the CRM/customer-auth integration already flagged as out-of-scope earlier in this platform's history — not re-opened here.
- **Marketplace integration** — explicitly named as "future" in the prompt itself; no design attempted, correctly.

**Recommendation:** sequence Gift Cards/Store Credit and Subscriptions as their own architecture passes *after* the Supply Chain core (§1–§6) and Payment Platform (§3) ship, since both genuinely depend on Payment Platform existing first (a gift card redemption and a subscription charge are both, structurally, payment operations).

---

## 8. Updated cross-domain flow

```
Supplier → Purchasing (L1/L2/L3 per §1) → Receiving (GRN, +Quality Inspection §6)
    → Inventory (+Lots/Reservation §5.1, Reorder Engine §5.2 feeds back to Purchasing)
    → Kitchen (PreparationTicket — unchanged, existing)
    → Sales (Order/Invoice, deduction per configurable strategy §2)
    → Payment (full lifecycle §3)
    → Accounting (JournalEntry, all four posting call sites: Purchase/Return/Sale/SalesReturn)
    → CRM (Customer, Loyalty — existing, unchanged)
    → Analytics (§5.3/§6 read-side reporting, deferred)
```

Every arrow above is a named domain event (§4) by the time this revision's milestones complete, not a hidden/undocumented coupling.

---

## 9. Comparison against named reference platforms

| Capability | Reference platforms that do this | This design after V2 |
|---|---|---|
| Multi-level procurement maturity | SAP, Oracle NetSuite, Dynamics | Matched (§1) |
| Provider-agnostic payment adapter | Every modern platform (Stripe-influenced architecture) | Matched (§3) |
| Payment Intent/Transaction separation | Stripe, Adyen, Checkout.com | Matched (§3.2) |
| Configurable inventory deduction timing | Toast, Square, Foodics (implicitly, via POS settings) | Matched, made explicit and Owner-configurable (§2) |
| Lot/FEFO tracking | SAP, Oracle, Dynamics (full ERPs); less common in restaurant-specific POS (Toast/Square/Foodics mostly don't) | Matched for ERP-grade use cases (§5.1), correctly optional (`StockItem.trackLots`) so it doesn't burden simple restaurants |
| RFQ/vendor selection | SAP, Oracle NetSuite, Dynamics | Matched at Level 3 (§1), correctly not forced on smaller operations |
| Vendor portal | SAP Ariba-class, Oracle | Deliberately deferred (§6) — none of the restaurant-specific platforms (Foodics/Toast/Square) have this either; it's an enterprise-ERP-only capability, correctly sequenced last |
| Gift cards / subscriptions | Square, Toast (both have these) | Deliberately deferred to its own pass (§7) — not because it's unimportant, but because building it shallow now would be worse than building it properly later |
| Dispute/chargeback case management | Stripe, Adyen (full workflow) | Data-ready, not workflow-complete (§3.5) — correctly scoped to what's buildable now |

---

## 10. Revised roadmap additions

Extends (does not replace) the twelve milestones in the prior document's §7. New/changed:

- **M3 (Goods Receiving)** gains an optional Level-3 predecessor: **M3a — Purchase Request / RFQ / Quotation** (only relevant once a brand opts into Level 3; independently shippable after M3).
- **New M-Payment track**, replacing the prior document's M9/M10 with three smaller steps: **M-Payment-1** (Gateway/Registry/Resolver/Webhook Engine/Idempotency infrastructure, provider-agnostic, no adapters yet), **M-Payment-2** (Paymob adapter — the first and only concrete integration in this pass), **M-Payment-3** (Settlement batch — deferred until M-Payment-2 has real volume).
- **New M-Inventory-2**: Lot/Reservation tracking + Reorder Engine (after the prior document's M5, since it extends the same `Inventory`/`StockLedger` work).
- **Domain Event Dispatcher (§4)** is infrastructure, sequenced as **M1a**, immediately alongside the prior document's M1 (shared utilities) — every later milestone depends on it existing rather than being retrofitted after the fact.
- Gift Cards, Subscriptions, Vendor Portal, and all §5.3/§6 analytics items are **explicitly not on this roadmap** — named as future initiatives with their dependencies stated (§7, §6), not silently dropped.

---

## Still stopped at the Approval Gate

The three business decisions from the prior document's Phase 8 still stand (procurement priority sequencing, deduction-strategy default, first payment provider — now answered: **Paymob**, per this message). One more surfaces here: **should Level 3 procurement (RFQ/Quotations) be built at all in the near term, or does the business only need Levels 1–2 for the foreseeable future?** Given RFQ/Quotation workflows are a meaningfully large addition (§1) with no restaurant-specific reference platform (Foodics/Toast/Square) actually offering them — this is a genuine enterprise-vs-restaurant-market judgment call, not an architecture question, and is left open rather than assumed.
