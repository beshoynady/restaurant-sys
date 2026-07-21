# Enterprise Refund Architecture Design

**Status:** Architecture design + adversarial review complete. A follow-up cross-domain dependency sweep (Coupons, Wallet, Customer Credit, generic Approval-engine, Delivery-provider refund integration — none exist) found no further gaps. **The resulting architecture decision was formally recorded in `ADR-001-SALES-PAYMENT-ARCHITECTURE.md`'s Phase 2 section (2026-07-20) and implemented 2026-07-21** — see that document's Phase 2 implementation record for the full delivery (files changed, two additional real defects found and fixed along the way, test results, verification). One correction surfaced during implementation's own re-verification pass: this document's Architecture Review section names `PreparationReturnSettings` as the kitchen-disposition settings source — that model was deleted the same day (2026-07-21, earlier in the session that implemented this phase), folded into `PreparationSettings.return.*` under the identical `decisionBy` convention; the decision itself (settings-driven, job-title-based, two separate policies) is unaffected, only the model's name/location changed before implementation began.
**Date:** 2026-07-20
**Scope:** ADR-001 Phase 2 — Refund Aggregate. Builds on ADR-001 Phase 0/1 (Invoice AR posting, Payment aggregate with MongoDB transactions — both production-ready and verified).
**Method:** Every claim below is either traced to source (file:line/behavior verified by direct reading) or explicitly marked as a new design decision with no existing precedent. Where documentation and code disagreed during this review, code won — every such disagreement is called out explicitly.

---

## 1. Executive Summary

This platform contains substantially more refund-adjacent infrastructure than any prior audit credited it with — but nearly all of it is dormant (schema fields reserved, never written) or built for the wrong side of the ledger (Purchasing/AP, not Sales/AR). The single most important finding of this review: **the exact working template for a two-phase refund already exists and runs in production today — `PurchaseReturn.service.js#approve()`/`#recordRefund()`** — but it predates the MongoDB-transactions platform standard and must not be copied mechanically.

Verified, load-bearing findings:

- `SalesReturn` (`modules/sales/sales-return/`) is a rich 195-line schema — line items, `refundStatus`, `refundMethod[]` multi-tender array, `journalEntry`/`reversalOfJournalEntry` refs, `cashierShift` — wired to a **16-line service with zero business logic**: no invoice interaction, no GL posting, no inventory movement, no `lockedUpdateFields` (a raw authorized `PUT` today can set `refundStatus: "REFUNDED"` with no money ever moving).
- `Invoice.status` already reserves `PARTIALLY_RETURNED` / `FULLY_RETURNED` / `CANCELLED` — never set by any code path today (verified: only comment references, zero writers).
- `JournalLine.sourceType` already reserves `SALES_RETURN`, mirroring the real, working `PURCHASE_RETURN` — never posted by any code path today.
- `Payment.status` already reserves `VOIDED` distinct from `RECORDED` — the schema itself already encodes that **Void and Refund are different concepts**, before this document says so.
- `WarehouseDocument.transactionType` already reserves `ReturnIssuance` (`documentType: "IN"`) — classified as an inbound source in `stock-ledger.service.js`'s own reporting logic, but zero real posters exist.
- `WasteRecord.wasteCategory` already includes `CustomerReturnWaste` as a fully real, working posting path (routes through `warehouseDocumentService.postDocument`, posts to `controlAccounts.inventoryAdjustment`) — directly reusable as-is.
- `recipe-consumption.service.js` has **no reversal method whatsoever** — inventory reversal at the recipe level is genuinely greenfield, not a gap in an existing path.
- `customer-loyalty.service.js` is real and non-trivial (`earnPoints`/`redeemPoints`/`adjustPoints`, already `session`-parameter-aware) — but it is an **island**: grepped `order.service.js`, `invoice.service.js`, `payment.service.js` for any call into it — zero. Separately, `OfflineCustomer.model.js` embeds its own independent `points`/`tier` fields, divergent from `CustomerLoyalty`'s own `points`/`tier` — **two unsynchronized loyalty stores exist side by side**, corroborating the platform audit's "triple-system divergence" finding with a precise, source-verified second data point.
- No Wallet or Gift Card balance/ledger model exists anywhere. `PaymentMethod.paymentCategory` includes `MobileWallet`/`GiftCard`/`Voucher`/`Credit` as **tender classification values only** — configuration for GL routing, not evidence of a real stored-value system to credit or debit.
- `sales/promotion/promotion.service.js` is a 13-line pure-CRUD shell — no discount-application logic exists to reverse.
- No payment-gateway integration exists anywhere (`payment-channel`/`payment-provider` routers are import-broken, unmounted — carried forward from `PAYMENT_LIFECYCLE_AUDIT.md`, not re-litigated here).
- No VAT-filing-lock field exists on `TaxConfig` — the only real period-lock mechanism anywhere in this codebase is `AccountingPeriod.isLocked` (already enforced by `journalEntryService.createBalancedEntry()`), which would incidentally also gate a late refund's journal posting.

**This document's core recommendation**: merge Refund into the existing `SalesReturn` aggregate (do not build a second, competing aggregate), implement its two-phase posting shape (goods/revenue reversal, then cash settlement) mirroring `PurchaseReturn`'s proven business logic but built on MongoDB transactions from day one, and reuse every dormant-but-reserved schema value found above rather than inventing parallel new ones. Exactly one new enum value is required (`SALES_REFUND` on `JournalLine.sourceType`, mirroring the already-real `PURCHASE_REFUND`).

---

## 2. Business Analysis

### 2.1 Definitions, with evidence

| Concept | Definition | When used | Evidence this codebase already distinguishes it |
|---|---|---|---|
| **Cancellation** | Removing an order/item *before* it becomes a fiscal fact (before invoice/payment) | Customer changes mind pre-kitchen, kitchen can't fulfill, wrong order entry caught immediately | Fully built: `order.service.js#cancelItem`, phase-aware (`NOT_SENT`/`SENT_PENDING`/`IN_PREPARATION`/`READY`), manager-approval-gated once real kitchen work started |
| **Void** | Reversing a *Payment record itself* — the sale was correct, the payment transaction was wrong | Cashier charged wrong tender, duplicate charge, system error, same shift | `Payment.status` enum already reserves `"VOIDED"` distinct from `"RECORDED"` — schema-level evidence this is a different process from Refund, not a design choice this document introduces |
| **Refund** | Reversing value against an already-legitimate, already-invoiced, already-paid `Invoice` | Customer return, quality complaint, wrong item delivered, service failure — discovered *after* the sale is a fiscal fact | `SalesReturn`'s existing (dormant) schema is shaped exactly for this: `originalInvoice`, `refundStatus`, `refundMethod[]` |
| **Return** | The *goods* side of a Refund — physical or logical restitution of what was sold | Always paired with a Refund when goods are involved; a Refund can exist without a Return (e.g., price adjustment, service recovery — money moves, nothing physical comes back) | `SalesReturn.items[]` + `returnType: FULL/PARTIAL` already model this; this document treats Return as Refund's goods-side component, not a separate aggregate (§9 gives the full DDD justification) |
| **Exchange** | Not a financial primitive — a Refund (of the returned item) composed with a new `Order` (for the replacement) | Customer wants a different size/item instead of a refund | No dedicated schema or code anywhere; correctly modeled as composition of two already-independent capabilities, not invented as a third mechanism |
| **Credit Note** | The accounting document that formally records "money owed back to the customer, not yet paid" | Standard IFRS/IAS term for what this codebase calls the Step-A posting (`SALES_RETURN`) | No literal `CreditNote` document exists; `SalesReturn` + its `SALES_RETURN` journal posting *is* the credit note, by function if not by that name — do not build a separate document for this |
| **Debit Note** | The reverse: a formal document increasing what the customer owes (e.g., an undercharge correction) | Not evidenced as a live business need anywhere in this codebase (no invoice-correction-upward flow exists) | Out of scope — no evidence this platform needs it; not designed here |
| **Compensation / Service Recovery / Goodwill Refund** | Money given back (or credit issued) with **no corresponding goods return** — a service-quality gesture | Late delivery, order mistake the customer decided to keep anyway, complaint resolution | Same mechanism as a money-only Refund (§2 "Refund" row) with `reasonCategory: ServiceRecovery`/`Other` and §4's inventory outcome = "Ignored" — not a separate process |
| **Write-off** | Formally abandoning collection of a receivable — an *accounting* event, not a customer-facing one | AR deemed uncollectible | No evidence of any write-off mechanism in this codebase; distinct from Refund (a write-off doesn't give the customer anything back, it just accepts a loss) — out of scope, not designed here |
| **Discount After Payment** | A retroactive price reduction on an already-paid invoice | Price-matching, loyalty gesture, billing correction | This is a **Refund with `reasonCategory: PriceAdjustment`**, §4 outcome "Ignored" (nothing physical changes) — not a separate mechanism |
| **Store Credit / Wallet Refund / Gift Card Refund** | Refund settled into a stored-value balance instead of cash/card | Customer prefers credit for future purchase, or original tender can't be reversed (e.g., cash long gone, no card-not-present refund capability) | **No real stored-value ledger exists to settle into** (§1) — `PaymentMethod.paymentCategory` values (`MobileWallet`/`GiftCard`/`Voucher`) are tender *classifications* only. This document explicitly does **not** design a real Wallet/Store-Credit ledger — doing so would be inventing a feature with zero supporting infrastructure, which the project's standing rules forbid. See §21 Gap Analysis. |
| **Partial / Full Refund** | Scope, not a separate process | Any of the above, scoped to some or all invoice lines | `SalesReturn.returnType: FULL/PARTIAL` already models this |

### 2.2 Why the Void/Refund split matters architecturally

A Void, if ever built, mutates a `Payment` document's own state and reverses exactly the `SALES_PAYMENT_RECEIPT` posting that Payment made — same aggregate, same day, typically same shift, no goods movement question to answer. A Refund reverses an `Invoice`'s fiscal fact, potentially days later, across a shift boundary, with a real goods-disposition question every time. Conflating them (as "refund" is casually used in restaurant-floor language) would force one aggregate to carry two different consistency boundaries and two different approval philosophies. **This document scopes Refund only** — Void is out of scope, referenced only to draw this boundary correctly, per the task's own framing ("the next approved phase is ADR-001 Phase 2, Refund Aggregate").

---

## 3. Technical Analysis

### 3.1 Repository Pattern conformance

Every real module inspected in this review (`Payment`, `Invoice`, `PurchaseReturn`, `JournalEntry`, `CashTransaction`) follows the same shape: `<entity>.model.js` (schema) → `<entity>.repository.js` or a `BaseRepository`-extending `<entity>.service.js` (data access + business rules) → `<entity>.controller.js` (thin, `asyncHandler`-wrapped) → `<entity>.router.js` (mandatory `authenticateToken → authorize → checkModuleEnabled → validate → controller` chain). `SalesReturn` currently has all five files but the service is a bare `new AdvancedService(...)` — the Repository Pattern's *shape* is present, its *substance* (a real Service subclass with business logic, matching how `Payment`/`Invoice`/`PurchaseReturn` all actually work) is absent.

### 3.2 MongoDB Transactions — current platform mechanics (verified, re-confirmed this session)

`BaseRepository#withTransaction(fn)` delegates to the MongoDB driver's own native `session.withTransaction()` — not a hand-rolled retry loop (a hand-rolled fixed-attempt version was tried for Payment and empirically failed under real contention; this is not a hypothetical caveat, it's a fact this project already learned the hard way). Any repository/service method invoked from inside someone else's transaction must accept an optional external `session` parameter, thread it through its own reads/writes, and never commit/abort/end it itself — established pattern across `journalEntryService`, `accountingSettingService`, `journalLineRepository`, `cashierShiftSettingsService`. `customer-loyalty.service.js` already follows this convention independently (`session` param present on `earnPoints`/`redeemPoints`/`adjustPoints`) — good evidence the convention is understood platform-wide, not just in the Payment module.

### 3.3 Domain Events

`utils/domainEvents.js`'s `DomainEventDispatcher` is real and live — confirmed via `WarehouseDocumentService.postDocument()` → `ReplenishmentEngine.handleBelowReorderPoint()` firing in this session's own regression-test output. Refund's events (§10) should emit through this existing dispatcher, not a new mechanism.

### 3.4 RBAC

8-action permission shape (`create/read/update/delete/viewReports/approve/reject/reverse`) already exists on every `RESOURCE_ENUM` entry, including `"SalesReturns"` (already present). `order.service.js#_hasCancelApprovalPermission`'s exact query shape (`role.permissions.some(p => p.resource === X && p.approve === true)`) is the proven, reusable pattern for Refund's own manager-approval gate (§7).

---

## 4. Accounting Analysis

Mirrors the verified, real `PurchaseReturn` precedent, reversed for Sales/AR, using the two already-reserved `sourceType` enum values plus one new one:

**Step A — Return/Adjustment Posting, `sourceType: "SALES_RETURN"`** (enum value exists, unused today):

| Scenario | Debit | Credit |
|---|---|---|
| Standard goods return, full tax reversal | `activities.salesReturn.revenueContra`, `activities.salesReturn.taxContra` (proportional to returned lines), `activities.salesReturn.discountContra` (if the line carried a discount, reverse proportionally — reversing *less* than the customer paid if a discount applied, matching IFRS's matching principle: reverse what was actually recognized, not the list price) | `Accounts Receivable` |
| Service charge / delivery fee on the returned line | `activities.salesReturn.serviceChargeContra`, `activities.salesReturn.deliveryFeeContra` | `Accounts Receivable` |
| Goods physically restored to inventory (§5 "Restored" outcome) | `Inventory` | `activities.salesReturn.costOfSalesContra` |
| Money-only refund, no goods movement (price adjustment, service recovery) | Same revenue/tax/AR lines as above | — (no inventory line at all) |

All five `activities.salesReturn.*` control accounts are already reserved on `AccountingSettings` (verified present in `accounting-setting.service.js`'s own `POPULATE` array) and currently populated by zero code — this is not a schema gap, it is an unwired-but-ready posting target.

**Step B — Refund Settlement, `sourceType: "SALES_REFUND"`** (**does not exist on the model today — the one genuinely new enum value this design requires**, mirroring the already-real `PURCHASE_REFUND`):

| Debit | Credit |
|---|---|
| `Accounts Receivable` (draws down what Step A just credited) | `Cash` / `Bank` / resolved cash-register account, one line per distinct resolved account for a split-tender refund — reusing Payment's own per-tender `_resolveCashAccount` grouping exactly (Phase 1's audit fixed exactly this collapsing bug for Payment; Refund must not reintroduce it) |

**Tax treatment**: reverse the exact amount/rate originally charged (read from the original `Invoice`'s posted lines, never recomputed at current `TaxConfig` rates) — an IFRS/IAS matching-principle requirement.

**Wallet / Gift Card / Store Credit / Customer Credit / Loyalty points**: no real ledger exists for any of these (§1, §2.1) — **no accounting entries are designed for them in this document.** If a future phase builds a real stored-value ledger, its own Refund-settlement posting (Debit AR, Credit "Customer Wallet Liability" or similar) would be a natural, symmetrical extension of Step B — but designing that account/liability structure now, against nothing that exists, would be inventing a feature.

**Cost Centers**: `AccountingSettings.costCenter.defaultCostCenter` already exists and is populated elsewhere (Journal Entry posting engine supports a `costCenter` field per line, verified in `journal-entry.service.js#createBalancedEntry`'s `lineDocs` mapping) — Refund's postings should carry the same cost-center resolution Invoice/Payment already use, not a new resolution path.

**Financial Statements impact**: Balance Sheet (AR decreases, Cash decreases, Inventory increases if restored), Income Statement (Revenue decreases, COGS decreases if inventory restored, net margin impact depends on whether goods came back sellable or became waste), Cash Flow Statement (operating cash outflow at Step B). All three statement engines (`financial-statements.service.js`, verified real with genuine `getBalanceSheet()`/`getIncomeStatement()`/`getCashFlowStatement()` logic) will reflect this automatically once real `JournalEntry`/`JournalLine` postings exist — no changes to the statement engines themselves are anticipated.

---

## 5. Inventory Analysis

| Scenario | Can return to inventory? | Can become Waste? | Can be reassigned? | Can be sold again? | Reverse automatically? |
|---|---|---|---|---|---|
| Returned unopened drink / bottled water (sealed, unopened, unprepared) | **Yes** | No | N/A | Yes | `ReturnIssuance` |
| Prepared food, untouched (kitchen error, wrong item, never given to customer) | No (food-safety — prepared items are not "unsold" once made) | **Yes** | No | No | `WasteRecord{CustomerReturnWaste}` |
| Opened / partially consumed food or drink | No | **Yes** | No | No | `WasteRecord{CustomerReturnWaste}` |
| Expired / damaged item discovered at return time | No | **Yes** | No | No | `WasteRecord{Expired}` or `{Damaged}` (both already real categories) |
| Reusable non-food item (e.g., a returned unopened retail-style add-on, if this brand sells any) | **Yes** | No | Possibly | Yes | `ReturnIssuance` |
| Disposable packaging returned with the item | No — packaging is not separately tracked as returnable stock in this codebase (no evidence of a packaging-as-stock-item pattern) | Not modeled — out of scope | No | No | None — not a tracked scenario |
| Item not yet started in kitchen | N/A — no inventory was ever deducted (mirrors `cancelItem`'s `NOT_SENT`/`SENT_PENDING` phases, which already correctly skip inventory) | No | N/A | N/A (it's a cancellation, not a refund — §2.2) | None needed |
| Item in preparation when refund initiated | Depends on what physically happened by the time the refund is processed — if ingredients were already consumed, treat as prepared-and-wasted; if caught early enough to halt, treat as not-yet-consumed | Likely, if any ingredients were committed | No | No | Judgment call at refund time (§ below) |
| Item completed / delivered / consumed by customer, later refunded (complaint) | No — already consumed | Not applicable (nothing physical exists to waste — it was eaten) | No | No | **None** — money-only refund, §4's "money-only" row |
| Returned raw ingredient (rare — e.g., a bulk retail sale of an ingredient, if this brand does that) | **Yes**, if unopened/unspoiled | Possibly, if opened | No | Yes if returned unopened | `ReturnIssuance` |
| Returned finished product (a `Product`, not raw `StockItem`) | Depends on whether it was ever "made" (see prepared-food rows above) | Depends | No | Depends | Case-by-case per the rows above — there is no single rule for "finished product," it depends entirely on whether it was prepared |

**Should Recipe Consumption reverse?** This is the one scenario without existing infrastructure to lean on. `recipe-consumption.service.js` has `consumeForOrder`/`consumeForTicket`/`_consumeResolvedItems` — **zero `reverse*` method exists.** Two honest, evidence-based options (not a recommendation invented from nothing — grounded in what this codebase already does elsewhere):

1. **True recipe-level reversal**: credit back the exact raw-material quantities the original sale consumed. Requires confirming whether `Invoice`/`Order`/`PreparationTicket` retains the recipe snapshot used at sale time (**not verified in this review — must be checked before implementation planning**, since recipes can change over time and reversing "today's recipe" against "yesterday's sale" would misstate inventory).
2. **Coarse-grained, reuse existing mechanisms**: value the returned/wasted finished item at its resolved recipe cost and post it through the already-real `WasteRecord{CustomerReturnWaste}` (if unsellable) or `WarehouseDocument{ReturnIssuance}` (if resellable-as-is, e.g., an unopened bottled item that never went through recipe consumption in the first place) — **no new reversal engine required.**

This document recommends **Option 2** for this phase, on the same grounds `PurchaseReturn`/`WasteRecord` already establish platform-wide: prefer improving/reusing existing patterns over introducing new abstractions. Option 1 remains available as a documented future enhancement if recipe-cost precision at the return level becomes a real business requirement.

**Should Warehouse Documents reverse?** Yes, for the "Restored" outcome — via the already-reserved `ReturnIssuance` transaction type, `documentType: "IN"`, posted through the existing `warehouseDocumentService.postDocument()` engine (the same engine `PurchaseReturn.approve()` already uses for its own `OUT`-direction `ReturnPurchase` posting — same engine, opposite direction).

**Restored-vs-Wasted classification itself has no automatic decision data** — no `Product`/`Recipe`/`StockItem` field anywhere distinguishes "reusable once returned" from "must be wasted once prepared." This mirrors `cancelItem`'s own already-documented gap for cancellation disposition. This document does not invent that classification data model — it recommends a manager/cashier judgment call at refund-processing time for this phase (§16 Alternatives discusses this explicitly).

---

## 6. Restaurant Operations Analysis

Real restaurant floor operations distinguish refund urgency by **when in the meal lifecycle** the problem is discovered — this is exactly what `PreparationTicket.preparationStatus` already encodes for cancellation, and Refund should read the same signal (post-fact, from history, not live state):

- **At the register, before food leaves the kitchen pass**: functionally a cancellation, not a refund — should not reach this Refund aggregate at all if caught in time (existing `cancelItem` path).
- **At the table, food delivered but wrong/bad**: the core Refund scenario — goods outcome per §5, money outcome per §4.
- **After the customer has left, phone/complaint-based**: same mechanism, later in time, likely requiring Manager/Owner approval by default (no live staff witness to the issue) — see §7.
- **End of shift / next-day discovery** (e.g., a chargeback-style dispute): crosses `CashierShift` boundaries — see §8's shift/period-close analysis.

---

## 7. ERP Analysis

### 7.1 Relationship between Refund and the rest of the platform

```
Order ──confirms──> Invoice ──posts AR (Phase 0)──> Payment ──settles AR (Phase 1)──> [SALE COMPLETE]
                       │                                                                     │
                       │                                                                     ▼
                       │                                                          Refund (this phase)
                       │                                                                     │
                       ├──references originalInvoice, order───────────────────────────────────┤
                       │                                                                     │
        Preparation ───┴── PreparationTicket.preparationStatus consulted (read-only, historical) for §5's goods-outcome classification
                                                                                              │
        Inventory ─────────────────────────────── ReturnIssuance / WasteRecord posted ───────┤
                                                                                              │
        Accounting ────────────────────────────── SALES_RETURN, then SALES_REFUND posted ────┤
                                                                                              │
        CRM/Loyalty ───────── NOT integrated (island, §1) — no automatic points reversal ─────┤
                                                                                              │
        Delivery ────────────── Order.channel === "DELIVERY" is read-only context for reason/approval, no delivery-specific refund mechanism exists ─┤
                                                                                              │
        Promotion ─────────────── 13-line CRUD shell, nothing to reverse (§1) ────────────────┘
```

### 7.2 Precise non-integrations (do not assume these connect)

- **CRM/Loyalty**: `earnPoints`/`redeemPoints` are never called from the sales flow — a refund cannot "reverse points earned on this sale" because no points were ever earned by any real sale in the first place. Any loyalty-reversal logic designed now would have nothing real to reverse.
- **Promotion**: no discount-application logic exists to reverse — `Invoice.discount` is a plain number field, and Step A's `discountContra` reversal (§4) handles it generically without needing Promotion module involvement.
- **Delivery**: `Order.channel` includes `"DELIVERY"` and a `deliveryPolicy` field exists, but no delivery-provider integration or delivery-specific refund rule exists anywhere — a delivery-channel refund uses the exact same mechanism as any other channel, with `channel` available only as descriptive context for reason-tracking/reporting, not a different code path.

---

## 8. DDD Design

### 8.1 Bounded Context

Refund sits in the **Sales** bounded context (same as Invoice/Payment/Order), consistent with where `sales-return` already physically lives in the codebase. It is a downstream consumer of the **Accounting** context (posts through `journalEntryService`, does not own accounting logic) and the **Inventory** context (posts through `warehouseDocumentService`/`wasteRecordService` or equivalent, does not own inventory logic) — exactly the same relationship Payment already has with both.

### 8.2 Aggregate Root

**`SalesReturn`** (existing collection, to be given a real service — rename to `SalesRefund` is a naming decision for the implementation phase, not an architectural one; this document uses "SalesReturn/Refund" to mean the one aggregate either name would refer to).

### 8.3 Entities (within the aggregate boundary)

- Line items (`items[]`) — already modeled, each needs a §5 inventory-outcome tag and a §2 reason-category tag added.
- Refund settlement transactions (`refundMethod[]` today; conceptually the Step B ledger of tenders paid back) — mirrors `Payment.tenders[]`/`PurchaseReturn.refundTransactions[]` exactly.

### 8.4 Value Objects

- Reason category (§2.1's enum-of-reasons) — immutable once set, describes *why*, not a mutable status.
- Inventory outcome classification (§5) — immutable once determined at processing time.
- Money amounts — same `{amount, currency}` shape already used throughout Payment/Invoice, no new Value Object type needed.

### 8.5 Repositories

`SalesReturnRepository` (new, matching the `<entity>.repository.js` convention `PaymentRepository`/`JournalEntryRepository` already establish) — pure data access, `brandScoped`/`branchScoped`, `lockedUpdateFields` covering every field a generic `PUT` must never rewrite (§14 Security).

### 8.6 Consistency Boundary

Everything in §10's "inside the transaction" list is one consistency boundary — mirrors Payment's exact boundary philosophy (all-or-nothing for one logical business fact).

### 8.7 Transaction Boundary

See §13 in full — summarized here: Step A (approval/reversal) is one transaction; Step B (settlement), when it happens later than Step A, is a second, separate transaction — exactly mirroring `PurchaseReturn.approve()` and `.recordRefund()` being two separate calls today, except each individually wrapped in `withTransaction` rather than the current best-effort pattern.

---

## 9. Aggregate Design — Merge Decision

**Recommendation: one aggregate, not two.** `SalesReturn` already IS the correct aggregate root — rich schema, its own identity (`serial`, unique per branch), owns its own line items, already references its context (`originalInvoice`, `order`). Building a second, parallel `Refund` aggregate would create two documents describing the same business fact (a customer got money and/or goods back) — the exact anti-pattern this platform has repeatedly corrected elsewhere (e.g., ADR-001 itself recommending *removing* `Order.paymentStatus` rather than maintaining it alongside `Invoice.status`, precisely to avoid two sources of truth for one fact).

**DDD justification**: a return's line items, its refund amount, and its GL/inventory consequences are all facts about *one* transaction that must commit or fail together — a single-aggregate consistency boundary, not two aggregates needing eventual consistency between them. The internal Step A/Step B split (§4, §13) stays *within* the one aggregate root, mirroring exactly how `PurchaseReturn` cleanly separates `approve()` from `recordRefund()` within one aggregate root, not across two.

**Alternative considered and rejected**: a separate `Refund` aggregate referencing `SalesReturn` by ID. Rejected because it would require the same two-phase-commit-style coordination between aggregates that MongoDB transactions inside *one* aggregate boundary already solve cleanly — introducing cross-aggregate saga complexity to solve a problem a single transaction already solves is unjustified complexity (§16 covers this as a documented alternative).

---

## 10. Domain Events

Emitted through the existing, real `DomainEventDispatcher` (§3.3):

`RefundRequested`, `RefundApprovalRequired`, `RefundApproved`, `RefundRejected`, `InventoryReturned` (fires on a successful `ReturnIssuance` post), `InventoryWasted` (fires on a successful `WasteRecord{CustomerReturnWaste}` create), `AccountingPosted` (fires once per JournalEntry — both Step A's `SALES_RETURN` and Step B's `SALES_REFUND` fire this independently, distinguishable by `sourceType`), `RefundSettled` (Step B's completion — money actually moved), `RefundCompleted` (terminal: both goods-side and money-side, where applicable, are done), `NotificationDispatched` (fired after commit only — §13).

---

## 11. State Machines

### 11.1 SalesReturn / Refund status

```
PendingApproval ──(auto-approve conditions met, §7 of the prior design pass)──> Approved
PendingApproval ──(manager/owner approves)──> Approved
PendingApproval ──(rejected)──> Rejected  [terminal]
PendingApproval ──(requester cancels before decision)──> Cancelled  [terminal]

Approved ──(Step A posts: goods/revenue reversal committed)──> PartiallyRefunded (if Step B not yet settled)
Approved ──(Step A + Step B post together, same visit)──> FullyRefunded  [terminal, if scope = full]
                                                        └─> PartiallyRefunded  [if scope = partial]

PartiallyRefunded ──(remaining Step B settlement completes)──> FullyRefunded  [terminal]
```

Mirrors `PurchaseReturn.status`'s real, working transition set (`Draft → Review → Partially Refunded → Fully Refunded / Rejected / Cancelled`) almost exactly — the one structural difference is Sales Refund's approval gate is phase-aware (§7 of the design conversation preceding this document) where Purchase Return's is not, because Sales Refund inherits the kitchen-phase-sensitivity that Purchasing has no equivalent of.

### 11.2 Inventory reversal sub-state (per line item, not the aggregate's own status)

```
Unclassified ──(manager/cashier judgment at processing time, §5)──> Restored | Wasted | Ignored
Restored ──> ReturnIssuance posted  [terminal for this line]
Wasted ──> WasteRecord{CustomerReturnWaste} posted  [terminal for this line]
Ignored ──> (no inventory action)  [terminal for this line]
```

### 11.3 Accounting reversal sub-state (per posting, not the aggregate's own status)

```
NotPosted ──(Step A conditions met: AR/revenue/tax reversal computed)──> SALES_RETURN posted
SALES_RETURN posted ──(Step B conditions met: tender resolved, cash movement due)──> SALES_REFUND posted  [terminal]
```

Both sub-states are read from the aggregate's own `journalEntry`/a new second GL-reference field (§8.3) — not independently tracked status enums, avoiding a third source of truth for what is really just "has this specific JournalEntry been created yet."

---

## 12. Sequence Diagrams

### 12.1 Cash Refund (full, same-visit)

```
Cashier -> RefundService: requestRefund(invoice, items, reason=WrongItem, method=Cash)
RefundService -> ApprovalGate: phase + threshold check
ApprovalGate -> RefundService: auto-approved (below threshold, item NOT_SENT)
RefundService -> [TRANSACTION START]
RefundService -> InvoiceRepository: verify balance / lock read (session)
RefundService -> SalesReturnRepository: create/update return doc (session)
RefundService -> WarehouseDocumentService | WasteRecordService: post inventory outcome (session)
RefundService -> JournalEntryService: postFromSource(SALES_RETURN, session)
RefundService -> JournalEntryService: postFromSource(SALES_REFUND, session)
RefundService -> CashTransactionService: create(REFUND, OUTFLOW, session)
RefundService -> [TRANSACTION COMMIT]
RefundService -> DomainEventDispatcher: RefundCompleted  (after commit)
RefundService -> NotificationService: notify customer/cashier  (after commit)
```

### 12.2 Card Refund

Identical to 12.1 through commit; Step B's `CashTransaction`/JournalEntry still post immediately (the accounting fact "we owe/paid this back" is real the moment it's approved), but the *physical* card-terminal refund action happens outside this system (§ Payment Analysis below) — no gateway call is ever inside the transaction, and today no gateway call exists to make at all.

### 12.3 Split Refund (Cash + Card)

Same as 12.1, but Step B iterates `refundMethod[]` exactly as Payment iterates `tenders[]` — one `CashTransaction` per tender, one debit line per distinct resolved account in the single `SALES_REFUND` JournalEntry (not one JournalEntry per tender) — mirrors Payment's finding-#2 fix precisely.

### 12.4 Partial Refund

Same sequence as 12.1, scoped to a subset of `items[]`; `returnType: PARTIAL`; Invoice's projected balance (§4/§8.3) reflects only the returned lines' value, not the whole invoice.

### 12.5 Inventory Return (goods restored)

```
RefundService -> WarehouseDocumentService: create({documentType:"IN", transactionType:"ReturnIssuance", items, session})
WarehouseDocumentService -> WarehouseDocumentService: postDocument(session)
WarehouseDocumentService -> StockLedger: inbound movement recorded
WarehouseDocumentService -> DomainEventDispatcher: (existing mechanism — e.g. stock-level-change events, same as any other posted document)
```

### 12.6 Kitchen / Warehouse Return (goods wasted)

```
RefundService -> WasteRecordService: create({wasteCategory:"CustomerReturnWaste", items, session})
WasteRecordService -> WarehouseDocumentService: postDocument({transactionType:"Wastage"}, session)
WarehouseDocumentService -> AccountingSettings: resolve controlAccounts.inventoryAdjustment
WarehouseDocumentService -> JournalEntryService: post inventory-adjustment entry (session)
```

### 12.7 Accounting Posting (both steps, detailed)

```
RefundService -> AccountingSettingService: resolveForPosting(brand, branch, session)
RefundService -> RefundService: build Step A lines (revenue/tax/discount/serviceCharge/deliveryFee contra, credit AR)
RefundService -> JournalEntryService: postFromSource(SALES_RETURN, lines, session)
JournalEntryService -> AccountingPeriodRepository: findOpenPeriodForDate(session) — reject if locked/closed
JournalEntryService -> JournalEntryRepository: insertEntry(session)
JournalEntryService -> JournalLineRepository: createMany(session)
[if Step B due now]
RefundService -> RefundService: build Step B lines (debit AR, credit cash per resolved account)
RefundService -> JournalEntryService: postFromSource(SALES_REFUND, lines, session)
```

---

## 13. MongoDB Transactions Design

### 13.1 Transaction Scope

**Inside one `withTransaction(session => ...)` call** (same idiom as `payment.service.js#recordPayment`, reusing `BaseRepository#withTransaction`, not a new mechanism):
- In-transaction idempotency/duplicate-request re-check (session-scoped read).
- `SalesReturn` document create/update.
- `Invoice`'s refund-projection fields update (exact field shape TBD at implementation — conceptually the refund-side mirror of `balanceDue`/`amountPaid`).
- Inventory action: `ReturnIssuance` **or** `WasteRecord`, never both, per §5's classification.
- `SALES_RETURN` JournalEntry (Step A).
- `SALES_REFUND` JournalEntry + `CashTransaction{REFUND}` (Step B) — **same transaction as Step A only when both happen in one call** (a same-visit refund); when Step B happens later (approved today, cash-settled tomorrow), it is its **own**, separate `withTransaction` call — exactly mirroring `PurchaseReturn.approve()`/`recordRefund()` being two separate invocations today.

### 13.2 What must execute after commit, never inside

Any payment-gateway call (moot today — none exists, §1 — but the principle must be designed in now so a future Phase 4 gateway integration doesn't have to retrofit it), notifications (SMS/email/push/WhatsApp), Socket.IO emissions, any domain-event side effect that isn't itself a write inside this same logical unit. Identical, non-negotiable prohibition list to Payment's own (verified clean in this session's production-readiness audit) — no exceptions carved out for Refund.

### 13.3 Retry Strategy

Delegate entirely to the MongoDB driver's native `session.withTransaction()` retry (time-budgeted `TransientTransactionError`/`UnknownTransactionCommitResult` handling) — **do not** reintroduce a hand-rolled fixed-attempt retry loop. This is not a stylistic preference; it is a directly-learned lesson from this exact platform (Payment's own fixed-3-attempt retry empirically failed under real multi-step-transaction contention and was replaced with the driver-native version, verified in this session).

### 13.4 Rollback Strategy

Any thrown error inside the transaction (insufficient AR/invoice-balance-to-refund, inventory posting failure, missing `AccountingSettings`, a validation failure on any line) aborts and rolls back everything written in that attempt — no partial `SalesReturn`-with-some-postings-missing can ever be committed. Mirrors Payment's exact, tested guarantee.

### 13.5 Concurrency

Two simultaneous refund requests against the same invoice/line must be guarded the same way Payment guards double-payment: an atomic, session-scoped balance/eligibility check as the *first* write inside the transaction (mirroring `InvoiceModel.findOneAndUpdate` with a `balanceDue: {$gte: ...}`-style guard clause), not a soft application-layer pre-check alone.

### 13.6 Idempotency

Same pattern as Payment: an idempotency key, sparse-unique-indexed per `{brand, invoice, idempotencyKey}` (or equivalent), checked once cheaply before opening a transaction and **again inside** the transaction (session-scoped) so a retried attempt after a write-conflict finds the winning attempt's already-committed record and returns it, rather than blindly re-attempting a doomed reversal.

### 13.7 Failure Recovery

Because every write is inside one transaction, there is no "partially failed, needs manual reconciliation" state to recover from *within* Step A or *within* Step B individually — the only cross-step gap is the deliberate one (Step A approved today, Step B settled later), which is a legitimate business state (`PartiallyRefunded`, §11.1), not a failure.

### 13.8 Deadlock Considerations

No evidence of lock-ordering risk beyond what Payment already navigates safely (a single document, `Invoice`, is the natural serialization point; no scenario in this design requires locking two documents in an order that could conflict with another operation's own locking order) — no new deadlock class introduced.

### 13.9 Nested Transaction Handling

**Zero nested transactions** — reuse the exact `ownsSession = !externalSession` guard pattern `journalEntryService.createBalancedEntry()` already implements: when Refund calls into `journalEntryService`/`warehouseDocumentService`/`wasteRecordService` with its own session, those callees must reuse it and never call `startTransaction()` themselves. **This is a real, concrete verification requirement for whichever of those collaborators doesn't yet support an external session** — `wasteRecordService`'s current session-support status was not verified line-by-line in this pass and must be confirmed before implementation (§21 Gap Analysis).

### 13.10 Session Propagation

Every collaborator call threads `session` explicitly as a parameter — never ambient/implicit — matching the platform's now-consistent convention across `journalEntryService`, `accountingSettingService`, `cashierShiftSettingsService`, `journalLineRepository`, and `customer-loyalty.service.js` (independently confirmed to follow the same convention, even though Loyalty itself is out of scope for Refund's integration, §7.2).

---

## 14. Validation Strategy

- Refund amount must not exceed the original invoice's paid/refundable balance (mirrors Payment's over-balance guard, symmetrically).
- Line-level refund quantity must not exceed the original invoice line's quantity minus any already-refunded quantity on that line (prevents double-refunding the same unit across multiple partial-refund requests).
- Reason category is mandatory (mirrors `OrderSettings.cancelReasonRequired`'s existing pattern).
- `refundMethod[]` total must equal the requested refund amount (mirrors Payment's `tenders[]` total-must-equal-amount validation).
- A refund cannot be created against an invoice with no `originalInvoice` match, or against an already-`FullyRefunded` return document (idempotent-safe, not a hard error, per §13.6).

---

## 15. Security & RBAC

Standard mandatory chain: `authenticateToken → authorize("SalesReturns", action) → checkModuleEnabled("sales") → validate → controller` — reuse the already-existing `"SalesReturns"` resource rather than adding a redundant new one, consistent with §9's merge decision. **A currently-live, severe gap that must be fixed as part of this work regardless of any other scope decision**: `sales-return.repository`/service has no `lockedUpdateFields` today — a raw, authorized `PUT` can set `refundStatus: "REFUNDED"`, rewrite `total`, or repoint `journalEntry` with zero business-rule enforcement. This is not new-phase scope creep; it is a pre-existing, live defect in the very aggregate this phase must build on, and leaving it unfixed while adding real money-moving logic on top would be actively dangerous.

---

## 16. Concurrency Strategy

Covered in depth in §13.5/§13.6. Summarized: the transaction's first write acts as the serialization point (mirrors Payment's `Invoice.findOneAndUpdate` guard), and the in-transaction idempotency re-check (§13.6) is what makes retried attempts after a write-conflict resolve correctly rather than erroring on a legitimate concurrent retry.

---

## 17. Failure Recovery

See §13.4/§13.7. The one recovery scenario genuinely outside this design's transaction boundary: Step A approved but Step B (cash settlement) never happens because the process is abandoned mid-workflow (e.g., a manager approves but the cashier never completes the payout). This is a **business-process gap, not a transactional-integrity gap** — the `PartiallyRefunded`/`Approved`-with-no-Step-B state is valid, visible, and queryable (a report — §13 of the prior turn's design, "Cash Refund Report" etc. — would surface stuck approvals), not silently lost data.

---

## 18. Idempotency

Fully covered in §13.6 — restated here for completeness against the requested outline: idempotency key, sparse compound unique index, dual pre-check (cheap, outside transaction) + re-check (session-scoped, inside transaction), identical shape to Payment's proven, production-verified mechanism.

---

## 19. Performance Analysis

No new performance-risk class beyond what Payment's transaction already demonstrates safe at this codebase's scale (verified: 75-suite/327-test full regression, including Payment's own multi-step transaction, completes without contention issues in normal test conditions). The one performance-relevant design choice: Step A and Step B as **separate transactions when not same-visit** avoids holding one long-lived transaction open across an indeterminate real-world delay (e.g., "approved now, refund processed tomorrow") — a single mega-transaction spanning that gap would be a genuine performance/lock-duration risk this design deliberately avoids.

---

## 20. Risk Analysis

- **Architectural**: none identified beyond what §9's merge decision already resolves (a split-aggregate design would have been the higher-risk alternative — see §16 Alternatives below for the full comparison).
- **Accounting**: incorrect tax-reversal computation (recomputing at current rates instead of using the original posted amount) would misstate both the refund and any future tax filing — §4 explicitly designs against this.
- **Operational**: approval-threshold currency values require real business input this document does not have and does not invent.
- **Fraud**: without a refund-pattern-detection report shipping alongside the core transactional flow, this phase reopens a fraud surface (refund-and-pocket-cash) that today is closed only because refunds don't work at all — a report-level control, not a transactional gate; see the prior design turn's §15 Fraud Prevention for the full treatment (not repeated verbatim here to avoid redundancy within this same document set).
- **Concurrency**: covered §13.5/§13.6 — residual risk is low, same proven pattern as Payment.
- **Inventory**: the Restored-vs-Wasted classification has no automatic decision data (§5) — a manual judgment call is a real, accepted risk for this phase, not eliminated by this design.
- **Financial**: a refund approved but never cash-settled (§17) leaves AR overstated relative to what the business actually intends to pay back — needs a report/alert, not a transactional fix.
- **Data integrity**: `sales-return`'s missing `lockedUpdateFields` (§15) is a live integrity risk independent of and predating this phase's new logic.
- **Performance**: addressed §19 — low residual risk.
- **Tax**: no VAT-filing-lock mechanism exists anywhere (§1) — a refund processed after a VAT period has been filed with the tax authority has no system-level guard today beyond the general `AccountingPeriod.isLocked` check, which is not VAT-filing-specific. This is a real, unresolved gap this document does not close (§21).

---

## 21. Gap Analysis (verified gaps only — no invented solutions)

- **No recipe-consumption reversal method** exists (`recipe-consumption.service.js`) — §5 recommends working around this via existing `WasteRecord`/`ReturnIssuance` mechanisms rather than building it, but the gap itself is real and should be named explicitly for whoever plans the implementation phase.
- **No `lockedUpdateFields` on `SalesReturn`** — a live, pre-existing security/integrity gap (§15).
- **No `SALES_REFUND` value on `JournalLine.sourceType`** — the one required schema addition (§4).
- **No confirmation that `wasteRecordService`/`warehouseDocumentService` fully support an externally-owned session parameter for every write path Refund would need** — verified for the main posting call in this review, but not exhaustively for every method; must be confirmed line-by-line before implementation (§13.9).
- **No stored-value Wallet/Gift Card/Store Credit ledger** — real, platform-wide gap, not specific to Refund, not designed around here (§2.1).
- **Loyalty is a real but unintegrated, internally-divergent system** (two separate `points`/`tier` stores: `CustomerLoyalty` collection vs. `OfflineCustomer`-embedded fields) — a pre-existing platform gap, not something this phase should attempt to reconcile as a side effect.
- **No VAT-filing-lock field on `TaxConfig`** — only the general `AccountingPeriod.isLocked` mechanism exists; "refund after VAT submission" has no dedicated guard (§20).
- **No payment-gateway integration exists** — carried forward from `PAYMENT_LIFECYCLE_AUDIT.md`, unchanged, not this phase's job to close.
- **No recipe-snapshot-at-sale-time confirmation** — needed to validate whether Option 1 of §5's recipe-reversal question would even be technically sound if chosen later; not resolved in this pass.
- **No fraud-pattern-detection report exists today** for any domain — needed alongside Refund's launch per §20, does not exist to build on.
- **Missing validations**: no existing invoice-line "already refunded quantity" tracking field to check against (§14's second bullet) — would need to be added as part of implementation, not found pre-existing anywhere.
- **Missing events**: none of §10's event names exist as literal emitted events anywhere today (verified: the `DomainEventDispatcher` mechanism is real and used elsewhere, but no Refund-specific event has ever been defined) — this is expected for a not-yet-built feature, listed for completeness, not as a surprise finding.

---

## 22. Alternatives

### 22.1 Aggregate structure

| Option | Pros | Cons | ERP impact | Accounting impact | Operational impact | Performance | Complexity | Maintainability |
|---|---|---|---|---|---|---|---|---|
| **A — Merge into `SalesReturn`** (recommended) | Single consistency boundary; reuses a rich, already-correct schema; matches this platform's own repeated SSOT corrections elsewhere | `SalesReturn`'s current naming may read oddly if it absorbs pure money-only (non-goods) refunds | Cleanest — one place to query "all refund activity" | One aggregate posts both Step A and Step B, simplest reconciliation | One workflow for staff to learn | Best — no cross-aggregate coordination | Lowest | Highest |
| **B — Separate `Refund` aggregate referencing `SalesReturn` by ID** | Clean naming per concept | Two documents for one business fact; needs saga-style coordination MongoDB transactions inside one aggregate already solve for free | Query "all refund activity" requires a join/lookup | Risk of the two documents' state drifting (exactly the SSOT problem ADR-001 fixed for `Order.paymentStatus`/`Invoice.status`) | Two workflows conceptually, more staff confusion | Worse — potential cross-document consistency gaps | Higher | Lower |
| **C — Money-only `Refund` aggregate, `SalesReturn` stays goods-only, both independent** | Cleanly separates "did money move" from "did goods move" | Most real-world refunds involve both, forcing two documents for one customer interaction most of the time | Fragments reporting across two collections | Most complex reconciliation of the three options | Confusing for staff — "which document do I create?" | Worst | Highest | Lowest |

**Recommendation: Option A.**

### 22.2 Inventory disposition decision (§5)

| Option | Pros | Cons |
|---|---|---|
| **A — Manual judgment call at processing time** (recommended for this phase) | No new data model needed; matches `cancelItem`'s own existing, accepted approach to the identical problem | Relies on staff judgment; no system-enforced consistency across similar returns |
| **B — New Product/Recipe metadata field distinguishing reusable-vs-perishable** | System-enforced consistency | Real new schema/data-entry burden across the entire menu catalog; no evidence this data exists or has been requested |
| **C — Always waste, never restore** (simplest possible rule) | Zero decision logic needed | Wastes real, resellable inventory (e.g., an unopened bottled drink) — a real business-cost regression, not defensible |

**Recommendation: Option A**, with Option B flagged as a natural future enhancement once/if the business signals it's worth the catalog data-entry investment.

### 22.3 Step A / Step B timing

| Option | Pros | Cons |
|---|---|---|
| **A — Always same transaction, immediate settlement** | Simplest mental model | Forces cash to move the instant a return is approved, even when the business wants an approval-then-payout-later workflow (e.g., owner sign-off before cash leaves the drawer) |
| **B — Two independently-transactional steps, settlement can trail approval** (recommended) | Matches `PurchaseReturn`'s already-proven, working real-world shape exactly; supports both same-visit and delayed settlement without two different code paths | Slightly more orchestration (two possible entry points instead of one) |
| **C — Settlement always deferred, never same-transaction** | Forces a consistent two-step ritual | Unnecessarily bureaucratic for the common same-visit case (customer returns an unopened drink, wants cash back right now) |

**Recommendation: Option B.**

---

## 23. Final Recommendation

Approve the merge of Refund into the existing `SalesReturn` aggregate (§9, §22.1 Option A), implement the two-phase posting shape (§4/§13) mirroring `PurchaseReturn`'s proven business logic but built on MongoDB transactions from day one — not retrofitted later, unlike `PurchaseReturn` itself remains today. Reuse every dormant-but-reserved schema value identified in this review (`SALES_RETURN`, `ReturnIssuance`, `Payment.status.VOIDED`'s conceptual boundary, `Invoice.status.PARTIALLY_RETURNED`/`FULLY_RETURNED`) rather than inventing parallel new ones. Add exactly one new enum value (`SALES_REFUND`) to complete the already-half-built vocabulary. Fix `SalesReturn`'s missing `lockedUpdateFields` as part of this same body of work, not deferred — it is a live security gap in the aggregate this phase depends on.

---

## 24. Implementation Roadmap (sequencing only — no implementation performed here)

1. Formal ADR (ADR-001 §9 Phase-2 amendment, or a new ADR-002) ratifying: the merge decision (§9/§22.1), the manual-judgment inventory-disposition approach for this phase (§5/§22.2), and the two-transaction Step A/Step B timing (§13.1/§22.3).
2. Fix `sales-return`'s missing `lockedUpdateFields` — standalone, low-risk, doable independently of and before the rest of this phase.
3. Add `SALES_REFUND` to `JournalLine.sourceType`.
4. Verify (not assumed) that `wasteRecordService`/`warehouseDocumentService`'s full write paths accept an external session (§13.9/§21) — a short, targeted source-reading task before any Refund code is written.
5. Confirm whether `Invoice`/`Order`/`PreparationTicket` retains a recipe snapshot at sale time (§5/§21) — informs whether Option 1 or Option 2 of the recipe-reversal question is even viable later, though Option 2 is this phase's actual recommendation regardless.
6. Build the real `SalesReturn`/Refund service: request → phase/threshold-aware approval gate (reusing `_hasCancelApprovalPermission`'s exact shape) → Step A (transactional) → Step B (transactional, same call or later).
7. Reporting layer (Cash/Card Refund, Refund Reasons, Refund by Employee/Branch/Product, Refund Cost, Refund KPI) — additive, low-risk, can land after the core flow.
8. Fraud pattern-detection report — should land alongside or immediately after the core flow, not deferred indefinitely, given the fraud-surface risk this phase reopens (§20).

---

## Go / No-Go Decision

**Conditional GO — architecture is sound and sufficiently evidenced to proceed to ADR creation, subject to three items being resolved first (not blocking this document, but blocking the *next* step, ADR creation):**

1. **Business input required, not an engineering decision**: concrete approval-threshold currency amounts (Manager vs. Owner escalation) and the refund-request time-window policy (§7 of the prior design turn) — this document deliberately does not invent these numbers.
2. **A short, targeted verification pass** (§21/§24 item 4) confirming `wasteRecordService`/`warehouseDocumentService`'s session support is complete for every write path Refund needs — a half-day source-reading task, not a design gap, but must close before implementation planning can be considered complete.
3. **Explicit owner sign-off on the merge decision** (§9/§22.1) — this document recommends it strongly and with full DDD justification, but per this project's own consistently-applied rule, no architectural decision of this weight proceeds without the owner's explicit approval before an ADR is drafted.

**Nothing in this review found the architecture itself incomplete or unsound** — every gap identified in §21 is a *pre-existing platform gap* (Loyalty divergence, missing gateway integration, no VAT-filing lock) correctly scoped *out* of this phase, not a hole in this phase's own design.

---

# Architecture Review

**Purpose of this section**: a rigorous, adversarial re-verification of the design above, performed to close the three blockers before ADR creation. The instruction was explicit — challenge every assumption, try to disprove the design, never guess. This review **found real errors in the original document**, corrected below, not merely confirmed it. The most significant: an entire dormant aggregate (`PreparationReturn`) and two dormant settings models (`SalesReturnSettings`, `PreparationReturnSettings`) were missed in the original pass, and one collaborator service (`warehouseDocumentService.postDocument()`) is not merely "unverified" for transaction composability — it is **actively incompatible** with participating in an external transaction today, a materially worse finding than the original document's hedge.

## Findings

### Blocker 1 — Business Approval Thresholds: RESOLVED, original design was incomplete

**The approval mechanism this document needs already exists as a dormant, fully-designed settings schema — it does not need to be invented.** Missed entirely in the original pass; found this review by searching for `requireApproval`/`approvalThreshold`/`approvalMatrix` patterns platform-wide (a search the original document should have performed but did not).

`modules/sales/rerturn-sales-settings/sales-return-settings.model.js` (verified real, brand+branch-scoped, unique index enforced) already contains:
- `requireManagerApproval: Boolean` (default `true`)
- `approvalThresholdAmount: Number` (default `0`)
- `decisionBy: [ObjectId] ref "JobTitle"` — **a job-title-based approver list, not an RBAC-permission-based check.** This is a materially different authorization model than the original document's §7 recommendation, which assumed reuse of `order.service.js#_hasCancelApprovalPermission`'s RBAC-permission-flag pattern (`role.permissions.some(p => p.resource === X && p.approve === true)`). That pattern is real and proven, but it is **not what this domain's own settings schema was designed around.** The correct design authorizes an approver by checking whether their `Employee.jobTitle` is present in `decisionBy[]`, not by checking an `approve` permission flag.
- `maxReturnMinutes: Number` (default `1440`) — the refund-request time-window policy the original document said required business input it didn't have. **It already has a configurable field with a sane default; no new business input is required to proceed, only confirmation the default is acceptable per brand.**
- `refundMethod: enum["ORIGINAL_PAYMENT","CASH","WALLET","NO_REFUND"]` — settlement-method policy, more specific than the original document's generic multi-tender assumption.
- `refundTaxes` / `refundServiceCharge` / `refundDeliveryFee`: **Boolean toggles controlling whether Step A's tax/service-charge/delivery-fee contra postings fire at all.** The original document's §4 assumed these always reverse proportionally — **this is wrong**; it is a per-brand configurable policy, not a fixed accounting rule.
- `generateAccountingEntry: Boolean` — **a toggle for whether GL posting happens at all.** The original document assumed Step A/B GL posting was always mandatory. It is not, per this settings model — a brand can configure `NO_REFUND`-adjacent or accounting-optional behavior. This has real implications for §13's transaction design: the transaction must conditionally include the JournalEntry writes based on this setting, not unconditionally include them.
- `immutableAfterFinalize: Boolean` — directly informs `lockedUpdateFields` design (§15), previously unaddressed.

**A second, separate settings model exists for the kitchen/preparation side**: `modules/preparation/preparation-settings/preparation-return-settings.model.js` — scoped per `preparationSection` (not just per branch), with its own `decisionBy`, `maxReturnMinutesFromPreparation`, `requireSupervisorReview`, and, critically, `allowWaste`/`allowReturnToStock`/`allowResellable` toggles. This directly corrects §5/§21's claim that "no data model exists to decide Restored-vs-Wasted" (see Blocker 3 below — this claim was wrong).

**Both settings services are themselves pure CRUD shells** (`salesReturnSettingsService`, `preparationReturnSettingsService`) — no `resolveForBranch`-style resolution method exists yet (unlike `orderSettingsService`/`accountingSettingService`, which do), and grepping confirmed **zero code anywhere reads these settings' actual field values.** They are as dormant as `SalesReturn` itself. This does not weaken the recommendation — it strengthens it: the intended design was clearly already thought through by whoever built these schemas; this phase's job is to wire dormant, correct schemas to real logic, not to design new policy fields from scratch.

**Recommendation (revised from the original document)**: Refund's approval mechanism is **`SalesReturnSettings`-driven: fixed-amount threshold (`approvalThresholdAmount`) + job-title-based approver list (`decisionBy`)**, not RBAC-permission-based, not a percentage, not a multi-tier Manager→Owner escalation (no evidence of a two-tier concept anywhere in the schema — `requireManagerApproval` is a single boolean gate). The phase-awareness this document's earlier turn correctly identified (kitchen-phase-sensitive approval) is real, but it is **`PreparationReturnSettings`'s job** (its own `decisionBy`/`requireSupervisorReview`/`maxReturnMinutesFromPreparation`), not `SalesReturnSettings`'s — these are **two separate approval policies for two separate concerns** (financial refund approval vs. kitchen disposition approval), not one unified threshold as the original document assumed.

### Blocker 2 — MongoDB Transaction Compatibility: RESOLVED, finding is WORSE than the original document's hedge

The original document said (§13.9/§21) this was "not verified line-by-line... must be confirmed before implementation." This review performed that verification. Result:

| Service/Method | Session-aware? | Evidence |
|---|---|---|
| `journalEntryService.createBalancedEntry()` / `postFromSource()` | **Yes — fully** | Verified in Phase 1's own work; `ownsSession = !externalSession` guard, optional `session` param |
| `accountingSettingService.resolveForPosting()` / `getNextEntryNumber()` | **Yes — fully** | Optional `session` param, verified this session |
| `journalLineRepository.existsForSource()` / `createMany()` | **Yes — fully** | Optional `session` param |
| `cashierShiftSettingsService.getNextTransactionNumber()` | **Yes — fully** | Optional `session` param |
| `cashTransactionService.create()` (generic `BaseRepository.create()`) | **Yes — fully** | Generic `create()` already threads `session` into `model.create()` |
| `PaymentRepository`/`InvoiceModel` writes | **Yes — fully** | Verified, production-certified this session |
| `customer-loyalty.service.js` (`earnPoints`/`redeemPoints`/`adjustPoints`) | **Yes — fully** (though out of scope, §7.2) | Optional `session` param on all three, verified this review |
| `warehouseDocumentService.create()` | **Yes** | Uses the inherited generic `BaseRepository.create()`, which already supports `session` — no override changes this |
| **`warehouseDocumentService.postDocument()`** | **NO — actively incompatible, not merely unsupported** | **Opens and owns its own internal `mongoose.startSession()`/`startTransaction()`/`commitTransaction()`/`abortTransaction()`, with NO external-session parameter of any kind** (verified by direct read, `warehouse-document.service.js:143-303`). Calling this from inside Refund's outer transaction would not error — it would silently create a **second, fully independent transaction**, breaking atomicity without any warning. This is a materially worse finding than "needs verification" — it is a confirmed, must-fix defect relative to this design's requirements. |
| **`wasteRecordService.approve()`** | **NO — entirely non-transactional** | Verified by direct read (`waste-record.service.js:90-158`): calls `warehouseDocumentService.create()` and `.postDocument()` with no session, and its own `_postAccounting()` calls `journalEntryService.postFromSource()` with no session, wrapped in a best-effort `try/catch` that swallows failures — the exact pre-Phase-1 pattern Payment moved away from. |
| Lower-level collaborators inside `postDocument()` (`stockItemService.findByIdSession`, `inventoryCostEngine.afterInbound`, `inventoryService.findBalance`) | **Yes — already session-aware** | Confirmed via direct read of `postDocument()`'s own body — these already accept and use `session` correctly; **only `postDocument()`'s own outer lifecycle is the problem**, not its internals. |

**Required Refactoring (concrete, scoped — not open-ended)**:
1. `warehouseDocumentService.postDocument()` must be given the exact `ownsSession = !externalSession` retrofit `journalEntryService.createBalancedEntry()` already received in Phase 1 — accept an optional `session` param; when present, reuse it and skip `startTransaction()`/`commitTransaction()`/`abortTransaction()`/`endSession()`; when absent, behave exactly as today (backward-compatible for every other existing caller — `PurchaseReturn.approve()`, `InventoryCount.execute()`, etc.).
2. `wasteRecordService.approve()` must be rewritten to accept and thread an optional `session` through its `warehouseDocumentService.create()`/`.postDocument()`/`_postAccounting()` calls — same shape as Payment's own `recordPayment()` refactor.
3. Neither of these is a large or risky change — both follow an exact, proven, already-executed pattern from this same platform's own Phase 1 work. This is the **correct, evidence-based sizing** of Blocker 2, replacing the original document's vaguer "confirm before implementation" hedge with a concrete, scoped work item.

**This refactoring is a prerequisite for Refund's inventory-restoration (`ReturnIssuance`) and inventory-waste (`WasteRecord{CustomerReturnWaste}`) paths to be safely composable inside Refund's own transaction — without it, Refund's inventory side cannot honestly be built on the MongoDB-transactions standard at all, and would either have to (a) block on this refactor first, or (b) fall back to the old best-effort pattern for the inventory leg only, which would be an inconsistent, worse architecture than Payment's own precedent.** Recommendation: **(a) — this refactoring is now a formal dependency of Refund's implementation phase, not optional polish.**

### Blocker 3 — Aggregate Decision: REVISED, original recommendation was incomplete, not wrong

The original document's Option A (merge everything into `SalesReturn`) was **correct for the financial/GL concern but incomplete for the inventory/kitchen concern** — because it did not know `PreparationReturn` existed.

**New evidence**: `modules/preparation/preparation-return/preparation-return.model.js` is a real, 150-line schema with:
- `returnInvoice: ObjectId ref "SalesReturn", required: true` — a **mandatory, one-directional reference from PreparationReturn to SalesReturn.**
- `ticketNumber` — its own sequential numbering, per branch/day, exactly mirroring `PreparationTicket`'s own convention.
- `items[].decision: enum["WASTE","RETURN_TO_STOCK","RESELLABLE"], required` — **this is exactly the "no data model exists for Restored-vs-Wasted classification" gap the original document claimed (§5/§21). That claim was wrong.** The data model exists, per line item, and is even more granular than the original document assumed (three outcomes, not two).
- Its own status lifecycle (`PENDING→IN_REVIEW→FINALIZED/CANCELLED`), independently guarded (`preparation-return.service.js:7-46`, a real `STATUS_TRANSITIONS` map, not a stub).
- Its own approver ownership via `PreparationReturnSettings.decisionBy` (per preparation section, not per branch).

**Critical structural fact, verified**: `Order` (Sales bounded context) does **not** hold any reference to its own `PreparationTicket` documents — `PreparationTicket.order` references `Order`, one-directionally, and `order.service.js` creates tickets via `createTicketsFromOrder()` without storing an array of ticket IDs back on the Order document (confirmed by grep — zero matches for `preparationTicket`/`PreparationTicket` anywhere in `order.model.js`). **`SalesReturn`/`PreparationReturn` already mirrors this exact same one-directional, cross-bounded-context reference shape** — this is not a coincidence and not a decision this review is inventing; it is the same architect's already-established pattern, applied consistently to a second domain.

**Re-comparing the options, with this new evidence:**

| Option | What it actually means now | Verdict |
|---|---|---|
| **A — Separate `Refund` aggregate** (this review's Option A, distinct from the original document's Option A) | A wholly new aggregate, ignoring both `SalesReturn` and `PreparationReturn` | **Rejected** — would create a third, competing representation of a return, on top of two that already exist |
| **B — Merge into `SalesReturn`** (the original document's recommendation, unqualified) | Absorb *everything*, including kitchen-disposition tracking, into one document | **Rejected as stated** — would either duplicate `PreparationReturn`'s already-real, already-correctly-bounded kitchen-execution concern inside a Sales-context document (a bounded-context violation, the same class of error ADR-001 corrected for `Order.paymentStatus`), or require deleting/ignoring a real, partially-built aggregate for no benefit |
| **C — `SalesReturn` orchestrates child aggregates, does not absorb them** (this review's refined recommendation) | `SalesReturn` remains the single Aggregate Root for the **financial/customer-facing/Refund concern** (§4's Step A/Step B, §9's original DDD justification for *that* concern stands, unchanged). `PreparationReturn` remains its own, separate Aggregate Root in the **Preparation bounded context** for the **kitchen-execution/inventory-disposition concern**, referenced by ID exactly as `PreparationTicket` already references `Order`. `SalesReturn`'s service orchestrates creating/reading `PreparationReturn` child tickets (one per affected preparation section) exactly as `order.service.js#createTicketsFromOrder` already orchestrates `PreparationTicket` creation — a **proven, live pattern**, not a new one. | **Recommended** |

**This directly resolves §5's honest gap differently than originally concluded**: the Restored/Wasted/Ignored classification is **not** a manual-judgment-with-no-data-model problem (§22.2 Option A of the original document) — it is **`PreparationReturn.items[].decision`, entered by whoever the relevant `PreparationReturnSettings.decisionBy` authorizes, exactly the same shape as any other kitchen-execution decision on this platform.** §22.2's Option A/B/C comparison in the original document is superseded by this finding — the correct answer was already partially built as Option B ("new Product/Recipe metadata"), just scoped correctly at the *ticket* level, not the *catalog* level, which is actually a better design than either original option (no menu-wide data-entry burden, per-return-event judgment captured with full audit trail via `PreparationReturn`'s own `responsibleEmployee`/`reason` fields).

**Revised Aggregate Design (supersedes original §8/§9/§11)**: two aggregate roots, one cross-context reference, exactly mirroring Order/PreparationTicket:
```
SalesReturn (Sales context, Aggregate Root)
  — owns: financial line items, refundMethod[], SALES_RETURN/SALES_REFUND JournalEntry refs
  — orchestrates (does not own): creation of PreparationReturn ticket(s), one per affected preparationSection

PreparationReturn (Preparation context, Aggregate Root, referenced by SalesReturn's service, not embedded)
  — owns: per-item WASTE/RETURN_TO_STOCK/RESELLABLE decision, its own status lifecycle, its own approver chain
  — triggers (via its own finalization, not SalesReturn's transaction): ReturnIssuance or WasteRecord posting
```

**Transaction-boundary implication (revises §13.1)**: because `PreparationReturn` is a genuinely separate aggregate with its own approval workflow and its own finalization timing (kitchen staff may finalize a disposition decision at a different moment than the cashier/manager approves the financial refund — mirroring exactly how `PreparationTicket`s complete at a different moment than `Order` confirmation), **the inventory-posting step is not always inside the same transaction as SalesReturn's Step A/Step B.** It is inside **`PreparationReturn`'s own transaction**, opened by its own finalization action, which itself calls the now-session-safe `warehouseDocumentService.postDocument()`/`wasteRecordService.approve()` (Blocker 2's fix) — a separate, later-committing transaction than `SalesReturn`'s financial posting, linked only by the `returnInvoice` reference, exactly as `PreparationTicket`'s recipe-consumption transaction is already separate from `Order`'s own confirmation transaction today. This is a genuine, material revision to §13's original "all four operations, one transaction" framing — it was **too aggressive**; the real, evidenced pattern this platform already uses is **per-aggregate transactions, coordinated by reference, not one mega-transaction spanning two bounded contexts.**

## Design Stress Test

| Scenario | Can the (revised) architecture handle it? | Why |
|---|---|---|
| Concurrent refunds (same invoice) | **Yes** | Same session-scoped atomic-claim + in-transaction idempotency re-check pattern as Payment (§13.5/§13.6), unchanged by this review |
| Duplicate requests | **Yes** | Idempotency key, same proven mechanism |
| Partial refunds | **Yes** | `returnType: PARTIAL`, per-line quantity tracking (§14) |
| Split payments / mixed tenders | **Yes** | `refundMethod[]`, same per-account grouping as Payment's fixed split-tender bug (§4) |
| Inventory returned | **Yes** | Now correctly routed through `PreparationReturn.decision === RETURN_TO_STOCK/RESELLABLE` → `ReturnIssuance`, once Blocker 2's refactor lands |
| Inventory wasted | **Yes** | `PreparationReturn.decision === WASTE` → `WasteRecord{CustomerReturnWaste}`, once Blocker 2's refactor lands |
| Kitchen already finished (item delivered) | **Yes** | Money-only Step A/B path, `PreparationReturn` not created at all for this line (mirrors `cancelItem`'s `READY`-phase handling — the kitchen side has nothing left to do, only the financial side acts) |
| Customer never received item | **Yes** | Same as "kitchen already finished" if payment was already made — goods-outcome depends on what physically happened to the prepared item (§5's table), not on delivery status specifically, which this codebase doesn't track as a separate signal beyond `PreparationTicket.preparationStatus`/`Order.channel` |
| Order cancelled after payment | **Partially — a real, newly-identified gap** | If `cancelItem` already ran (pre-payment cancellation) there's nothing to refund. If a *paid* order needs post-payment cancellation, that **is** a Refund by this document's own §2 definition — but `cancelItem` and `SalesReturn`/Refund are two separate entry points today with no shared guard preventing a paid order from *also* being cancelled via the original `cancelItem` path, bypassing Refund's accounting entirely. **This is a real integration gap this review is surfacing, not previously documented** — `cancelItem`'s `ORDER_ITEM_CANCELLABLE_STATUSES` guard must be checked against whether the parent Invoice has any `amountPaid > 0`, and if so, routed to Refund instead of allowed through `cancelItem` unchanged. Flagged in §21 (Gap Analysis addendum below). |
| Payment already reconciled (in a `CLOSED`/`POSTED` `CashierShift`) | **Yes, with a required new guard** | `CashierShift.status` transitions `OPEN→COUNTED→CLOSED→POSTED` (verified, `cashier-shift.service.js:19-21`). A refund's `CashTransaction{REFUND}` must be attributable to the **current** open shift, not the original sale's now-closed shift — same pattern any `CashTransaction` creation already follows (it's always created against whatever shift is open *now*, never retroactively inserted into a closed one). No new mechanism needed, but this must be explicit in implementation: Refund's `CashTransaction` uses the *current* `cashierShift`, `SalesReturn.cashierShift` (already a field) records which shift the *refund itself* happened in, distinct from the original sale's shift on `Invoice`/`Payment` — already structurally correct, just needed calling out. |
| Accounting period closed | **Yes — correctly blocked** | `AccountingPeriod.isLocked` is already checked inside `journalEntryService.createBalancedEntry()` for every posting, including any future `SALES_RETURN`/`SALES_REFUND` postings — a refund attempted against a closed period fails cleanly (423), consistent with every other posting engine on this platform. No special-case needed. |
| Cashier shift closed | **Yes** | Covered above — Refund always posts against the current open shift, never the original |
| Branch closed | **Not specifically evidenced, low risk** | No dedicated "reject writes for an inactive branch" middleware was found in this review; this is a platform-wide gap (if it exists at all) orthogonal to Refund, not something this phase should build a special guard for |
| Refund after financial statements generated | **Yes** | Financial statements are read-only aggregations computed on demand (verified, `financial-statements.service.js`) — a later refund simply changes what the *next* statement run reflects; no stale-cache or invalidation concern exists because nothing is cached |
| Refund after tax reporting | **Not blocked today — a real, confirmed gap, not a design flaw in this phase** | No VAT-filing-lock field exists anywhere (§1/§20 of the original document, re-confirmed this review) — a refund after tax submission posts normally and correctly *to this system*, but has no system-level awareness that a tax authority filing has already happened. This is a pre-existing platform gap this phase does not create and is not positioned to close. |

## Dependency Review

Verified this phase's design does not break any of the following, by construction (additive-only changes, no modification to existing behavior of any of these modules):

- **Invoice**: only reads (`originalInvoice`) plus a new projection field for refund-in-progress amounts (additive, same pattern `balanceDue`/`amountPaid` already used, non-breaking).
- **Payment**: no changes; Refund references but never mutates a `Payment` document.
- **Accounting**: additive only — one new `sourceType` enum value (`SALES_REFUND`), reuses existing posting engine unchanged.
- **Inventory**: additive — reuses existing `ReturnIssuance`/`Wastage` transaction types unchanged; the required `postDocument()` session refactor (Blocker 2) is backward-compatible by construction (`ownsSession` guard preserves 100% of existing callers' behavior, proven by the identical pattern already shipped for `journalEntryService`).
- **Preparation/Kitchen**: reuses `PreparationReturn`'s existing (if dormant) schema and status guard unchanged; no modification to `PreparationTicket`/`preparation-ticket.service.js` required.
- **Warehouse**: same as Inventory above.
- **Cashier Shift**: no changes; Refund's `CashTransaction` follows the exact existing shift-attribution convention.
- **CRM/Loyalty**: correctly not integrated (§7.2, re-confirmed this review — no call sites added).
- **Promotion**: correctly not integrated (§7.2) — nothing to break, it's an inert CRUD shell.
- **Financial Statements**: no changes to the statement engines; they will simply reflect new posted data once Refund exists, exactly as they already do for every other posting engine on this platform.

## Corrections to the Original Document

1. §4's assumption that tax/service-charge/delivery-fee always reverse proportionally is **replaced** by: reversal is conditional on `SalesReturnSettings.refundTaxes`/`refundServiceCharge`/`refundDeliveryFee` toggles.
2. §4/§13's assumption that GL posting is always mandatory is **replaced** by: conditional on `SalesReturnSettings.generateAccountingEntry`.
3. §5/§21's claim that no data model exists for Restored/Wasted/Ignored classification is **withdrawn** — `PreparationReturn.items[].decision` is that data model, already built.
4. §7 (prior turn)'s RBAC-permission-based approval recommendation is **replaced** by `SalesReturnSettings.decisionBy` (job-title-based) for the financial approval, and `PreparationReturnSettings.decisionBy` for the kitchen-disposition approval — two separate policies, not one.
5. §8/§9/§11's single-aggregate design is **revised** to a two-aggregate, cross-bounded-context-reference design (`SalesReturn` orchestrates `PreparationReturn`), mirroring the live `Order`/`PreparationTicket` precedent.
6. §13.1's "all four operations in one transaction" framing is **revised**: `SalesReturn`'s own Step A/Step B remain one transaction (when settled together) or two (when not, unchanged from the original document) — but the inventory-disposition posting is `PreparationReturn`'s **own**, separately-timed transaction, not necessarily the same one.
7. §13.9's "not verified, must confirm" hedge on `warehouseDocumentService`/`wasteRecordService` session support is **upgraded to a confirmed defect** with a concrete, scoped fix (Required Refactoring, above) — this is now a hard implementation dependency, not an open question.
8. A new, previously undocumented gap is added: **paid-order cancellation via `cancelItem` can bypass Refund's accounting entirely** (Design Stress Test, "Order cancelled after payment" row) — `cancelItem` needs a guard checking `Invoice.amountPaid > 0` before this phase can be considered complete, or the two entry points will produce inconsistent financial outcomes for what is the same underlying business event.

## Remaining Risks

- The two-aggregate design (revised Blocker 3) is architecturally sound and evidence-based, but is **more complex to implement** than the original single-aggregate recommendation — real added coordination logic (SalesReturn's service must create/track PreparationReturn tickets), even though the *pattern* itself is proven (Order/PreparationTicket), not novel.
- `cancelItem`'s paid-order guard (Correction 8) is new scope this review discovered — it was not in the original document's roadmap and must be added to the implementation plan, not deferred, or Refund's own correctness guarantee (every paid reversal goes through proper accounting) has a real bypass.
- `SalesReturnSettings`/`PreparationReturnSettings` themselves need real `resolveForBranch`-style resolution methods built (mirroring `orderSettingsService`) — currently pure CRUD, cannot actually be read by Refund's service as-is.
- The `decisionBy: [JobTitle]` authorization check has **no existing precedent anywhere else in this codebase to copy** (unlike the RBAC-permission check, which had `_hasCancelApprovalPermission` as a direct template) — this is genuinely new authorization logic that must be designed carefully (does *any* employee with a matching job title qualify, or does it also need to be scoped to the specific branch/shift the employee is actually working?) before implementation, not assumed trivial.

## Required Refactoring (consolidated)

1. `warehouseDocumentService.postDocument()` — add optional external-`session` support, `ownsSession` guard pattern (Blocker 2).
2. `wasteRecordService.approve()` — thread an optional `session` through its full call chain (Blocker 2).
3. `salesReturnSettingsService`/`preparationReturnSettingsService` — add real settings-resolution methods (Remaining Risks).
4. `order.service.js#cancelItem` — add a paid-order guard routing to Refund instead of silent cancellation (Corrections item 8).
5. `sales-return.repository`/service — add `lockedUpdateFields` (carried forward from the original document, unchanged, still required).
6. Add `SALES_REFUND` to `JournalLine.sourceType` (carried forward, unchanged).

None of these are implementation — they are confirmed, scoped work items for the eventual implementation plan, listed here because this review's job was to determine exactly what implementation-readiness requires, not to leave it vague.

## Final Go / No-Go Decision

**GO — with the three original blockers now genuinely resolved (not just business-input-pending) and one net-new scope item added.**

Blocker 1 (approval thresholds): **resolved** — a real, dormant settings schema already answers this; no invented business numbers required, only a `resolveForBranch`-style method to read it.
Blocker 2 (transaction compatibility): **resolved** — the exact, scoped refactoring required is now known precisely, following an already-proven pattern from this same codebase.
Blocker 3 (aggregate decision): **resolved** — revised from a single-aggregate merge to a two-aggregate, cross-context-reference design, directly evidenced by a live, already-existing precedent (`Order`/`PreparationTicket`) applied consistently to a second domain (`SalesReturn`/`PreparationReturn`).

**This architecture is ready for ADR creation**, on the condition that the ADR explicitly incorporates: the two-aggregate design (not the original single-aggregate recommendation), the `SalesReturnSettings`/`PreparationReturnSettings`-driven approval model (not RBAC-permission-based), the confirmed `warehouseDocumentService`/`wasteRecordService` refactoring as an in-scope prerequisite (not a side note), and the new `cancelItem` paid-order guard as in-scope work, not a future cleanup item.
