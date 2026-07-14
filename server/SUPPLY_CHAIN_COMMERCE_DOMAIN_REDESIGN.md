# Supply Chain & Commerce Platform — Domain Redesign (Phases 3, 5–7)

Status: **design only — no code written.** Builds directly on `SUPPLY_CHAIN_COMMERCE_PLATFORM_AUDIT.md` (Phases 1, 2, and 4-equivalent gap analysis — not repeated here). This document covers Phase 3 (cross-domain dependencies), Phase 5 (domain redesign), Phase 6 (Owner Control Layer), and a refined Phase 7 roadmap. **Stops at Phase 8 (Approval Gate)** — three explicit business decisions are flagged as needing your input rather than assumed (§7).

Per the standing rule "do not redesign anything already solved unless a real architectural flaw is discovered": `WarehouseDocument`/`StockLedger`/`Inventory` (the inventory posting engine) and `Invoice`'s pricing/GL-posting engine are **kept as-is and reused**, not rebuilt — the audit found them to be the two genuinely solid pieces in this domain. Everything below is designed to plug into them, not replace them.

---

## Phase 3 — Cross-domain dependency map

```
                    ┌─────────────┐
                    │   Supplier   │
                    └──────┬──────┘
                           │
                ┌──────────▼───────────┐
                │    PurchaseOrder      │  (NEW)
                └──────────┬───────────┘
                           │
                ┌──────────▼───────────┐        ┌──────────────┐
                │  GoodsReceiptNote     │───────▶│  Inventory   │◀── shared pivot ──┐
                │       (NEW)           │        │  Posting     │                    │
                └──────────┬───────────┘        │  Engine       │                    │
                           │                     │ (EXISTING,    │                    │
                ┌──────────▼───────────┐        │  reused)      │        ┌───────────▼─────────┐
                │   PurchaseInvoice     │        └───────┬──────┘        │  Order → Invoice     │
                │     (redesigned)      │                │               │  (EXISTING, Invoice's │
                └──────────┬───────────┘                │               │  posting engine reused)│
                           │                             │               └───────────┬─────────┘
                ┌──────────▼───────────┐                 │                           │
                │  SupplierTransaction  │                 │               ┌───────────▼─────────┐
                │   (AP subledger)      │                 │               │     SalesReturn       │
                └──────────┬───────────┘                 │               │    (redesigned)       │
                           │                             │               └───────────┬─────────┘
                ┌──────────▼───────────┐                 │                           │
                │  PaymentTransaction   │◀────────────────┴───────────────────────────┘
                │       (NEW)           │
                └──────────┬───────────┘
                           │
              ┌────────────┼─────────────┐
              ▼            ▼             ▼
       CashTransaction  JournalEntry  PaymentGatewayAdapter
        (finance)       (accounting)   (NEW, external providers)
```

**Confirmed integration points and their current state** (from the audit — not re-derived here):

| This domain touches | Direction | Current state |
|---|---|---|
| **IAM** | Every write action needs `authorize()` + actor identity for audit fields | Mostly correct; 4 routers found missing RBAC gating (audit gap #14) |
| **Accounting** (`JournalEntry`) | Purchase/Sales/Returns should all post | Only Sales posts today; reuse the exact same `postFromSource` pattern for the other three |
| **HR** (`Employee`) | `cashierShift`, `orderBy`, `recordedBy`, `approvedBy` reference Employee throughout | Already correctly wired everywhere audited |
| **CRM** (`Customer`) | `Order.customer` polymorphic ref | Already correct |
| **Kitchen** (`PreparationTicket`, `PreparationSection`) | `Product.preparationSection`, `OrderItem` kitchen-status lifecycle | Already correct; not touched by this redesign |
| **Settings Platform** | Every policy in this domain should resolve through a brand/branch-scoped settings document, same pattern as `AuthenticationSettings`/`InventorySettings` | Schemas exist; most are unread (the core finding of the audit) — this redesign activates them |
| **Notifications** | Low-stock alerts, approval-pending alerts, payment-webhook failures | Not built anywhere in this domain — new hook points identified below, not implemented here |
| **Audit/SecurityEvent** | High-sensitivity actions (approvals, payment reconciliation, credit-limit overrides) should be logged | Reuse the existing `SecurityEvent`/`AuditLog` infrastructure (already built for IAM) — extend its event-type enum the same additive way already established, don't build a parallel logger |
| **Reports/Analytics** | AP aging, stock valuation, food-cost variance | Blocked today because the underlying data (real GRNs, real consumption, real payments) doesn't exist yet — this redesign is the prerequisite, reporting itself is out of scope here |

---

## Phase 5 — Enterprise domain redesign

### 5.1 The core architectural decision: separate Commitment, Receipt, and Bill

The audit's single most important finding was that **Purchasing has no Goods Receiving step** — `PurchaseInvoice` today conflates three business events that enterprise procurement always keeps separate:

1. **Commitment** — "we intend to buy this" (a Purchase Order).
2. **Receipt** — "these goods physically arrived, in this condition/quantity" (a Goods Receipt Note).
3. **Bill** — "the supplier is asking to be paid this amount" (the Invoice) — which may arrive before, with, or after the goods, and may not exactly match either the order or the receipt (price changes, partial shipments, damaged-goods deductions).

This is exactly the **3-way match** (PO vs. GRN vs. Invoice) every enterprise ERP named in this mandate implements, and it's not a stylistic preference — it's the standard control that prevents paying for goods never ordered or never received. Introducing it here is a genuine, justified redesign, not gold-plating.

**But it must be Owner-configurable, not mandatory**, per the constitution's core principle (never invent business policy). A small single-branch café doesn't need formal purchase orders; a multi-branch chain's central purchasing function does. **Design decision: `PurchasingSettings` gets a new `procurementMode` policy** (§6) — `"SIMPLE"` (PurchaseInvoice alone still works exactly as it does today, receiving is implied at invoice completion) or `"FULL_CYCLE"` (PO → GRN → Invoice, 3-way matched). Both modes reuse the same underlying entities; `SIMPLE` mode just auto-generates a GRN behind the scenes instead of requiring a separate confirmation step. This means **no existing `PurchaseInvoice` data or behavior breaks** — `SIMPLE` is the default, matching current behavior exactly, and `FULL_CYCLE` is opt-in.

### 5.2 Aggregates

| Aggregate | Status | Root fields (new/changed only — existing fields from the audit are kept) | Relationships |
|---|---|---|---|
| **Supplier** | Existing, extended | + `priceAgreements` (not embedded — see `SupplierPriceAgreement` below, referenced by `supplier` id, same pattern as `AttendanceRecord`→`Employee` in this codebase: a potentially-large child collection is never embedded) | 1—N `SupplierPriceAgreement` |
| **SupplierPriceAgreement** | **NEW** | `brand`, `supplier` (ref, required), `stockItem` (ref, required), `unitPrice`, `currency`, `effectiveFrom`/`effectiveTo`, `minOrderQuantity` | N—1 Supplier, N—1 StockItem. Consulted (not enforced) when building a PO/Invoice line — closes audit gap #11 |
| **PurchaseOrder** | **NEW** | `brand`, `branch`, `poNumber` (sequence), `supplier`, `warehouse`, `items[]{stockItem, quantity, unitPrice, taxes}`, `status` (§5.3), `approvedBy`/`approvedAt`, `expectedDeliveryDate` | 1—N `GoodsReceiptNote`, 1—N `PurchaseInvoice` (a PO can be received/billed in parts) |
| **GoodsReceiptNote (GRN)** | **NEW** | `brand`, `branch`, `grnNumber` (sequence), `purchaseOrder` (ref, nullable — null in `SIMPLE` mode), `supplier`, `warehouse`, `items[]{stockItem, orderedQuantity, receivedQuantity, unitCost, condition enum GOOD/DAMAGED/EXPIRED, expirationDate}`, `status` (§5.3), `receivedBy` (Employee), `warehouseDocument` (ref, set once posted) | N—1 PurchaseOrder (nullable), 1—1 `WarehouseDocument` once confirmed, 1—N `PurchaseInvoice` line references |
| **PurchaseInvoice** | Existing, redesigned | Redesign: **remove the implicit inventory-receiving responsibility** (the per-line `warehouse` field becomes informational/legacy in `FULL_CYCLE` mode); add `procurementMode` (copied at creation for audit clarity), `goodsReceiptNotes[]` (refs, populated when billing against existing GRNs), `threeWayMatchStatus` enum `MATCHED/VARIANCE/UNMATCHED` (computed, not enforced-blocking by default — see §6) | N—1 Supplier, N—N GoodsReceiptNote (via reference), 1—1 JournalEntry (once posted), 1—N SupplierTransaction |
| **PurchaseReturnInvoice** | Existing, extended | + real service logic (§5.4) — no new fields needed, `journalEntry`/`accountingPosted` finally get populated | N—1 PurchaseInvoice, triggers 1 outbound `WarehouseDocument` |
| **SupplierTransaction** | Existing, extended | No schema change — becomes **system-generated only** (domain-event-driven, §5.5), not client-writable except `OpeningBalance` | N—1 Supplier, polymorphic ref to PurchaseInvoice/PurchaseReturnInvoice/PaymentTransaction |
| **Warehouse / Inventory / StockLedger / WarehouseDocument** | **Kept as-is** | One addition: `WarehouseDocument.sourceDocument` polymorphic ref (`refPath` to GoodsReceiptNote/PurchaseReturnInvoice/SalesReturn/InventoryCount/StockTransferRequest/Order) — closes the audit's confirmed "no link back to what caused this movement" gap, additive/nullable, zero impact on existing rows | The reuse target for every engine above and below |
| **InventoryCount / StockTransferRequest / Consumption** | Existing, extended | No schema change — get real service logic implementing their already-modeled workflows (§5.4) | Each, on execution, produces a `WarehouseDocument` via the shared engine |
| **Order / Invoice** | **Kept as-is** structurally | `InventorySettings` gets `inventoryDeductionTrigger` (§6) — the only new field, on Settings not on Order/Invoice themselves | Order/Invoice → Recipe → `WarehouseDocument` (Issuance), new call site, no schema change to Order/Invoice |
| **SalesReturn** | Existing, extended | + real service logic (§5.4), no schema change (fields already exist and are finally populated) | Triggers 1 inbound `WarehouseDocument` + JournalEntry reversal |
| **PaymentTransaction** | **NEW** | `brand`, `branch`, `direction` (`INBOUND`=customer payment / `OUTBOUND`=supplier payment), `sourceType` (`Invoice`/`PurchaseInvoice`/`SupplierTransaction`) + `sourceId` (polymorphic), `provider` (ref PaymentProvider, nullable=cash), `amount`, `currency`, `status` (§5.3), `providerTransactionRef` (nullable, unique-when-set — webhook idempotency key), `cashRegister` (ref, when cash), `initiatedBy`, `confirmedAt` | The real SSOT the audit's gap #4 called for — `Invoice.paymentMethod[]`/`PurchaseInvoice.payments[]` become denormalized summaries written FROM this, not independently authoritative |
| **PaymentProvider** | Existing (stub), extended | + `adapterKey` (which adapter implementation backs this provider — the Adapter Pattern registry key), `credentialsRef` (pointer to a secrets store, never inline credentials in this document) | Referenced by `PaymentTransaction.provider` |
| **PaymentSettings** | Existing (empty placeholder), designed | See §6 — real schema for the first time | Brand/branch-scoped, resolves like every other settings module |

### 5.3 State machines (formalized — currently flat, unguarded enums)

**PurchaseOrder**: `Draft → Submitted → Approved → PartiallyReceived → FullyReceived → Closed`, with `Cancelled`/`Rejected` reachable from `Draft`/`Submitted`/`Approved` only (not once receiving has started — a PO with goods already received cannot be silently cancelled, it must be closed with a documented reason instead).

**GoodsReceiptNote**: `Draft → Confirmed(→ posts WarehouseDocument) → Completed`, with `Cancelled` reachable only from `Draft` (once `Confirmed`, the stock movement already happened — reversal requires a `PurchaseReturnInvoice`/adjustment, not cancelling the GRN itself, matching the audit's existing correct convention that transactional documents don't get destructively undone).

**PurchaseInvoice**: `Draft → Review → Approved → Completed(→ posts JournalEntry + SupplierTransaction)`, with `Rejected`/`Cancelled` reachable only before `Completed`. Once `Completed`, only a `PurchaseReturnInvoice` can reverse it — matches the existing, correct pattern already used for `JournalEntry` posted-entry immutability elsewhere in this codebase.

**PurchaseReturnInvoice**: `Draft → Review → Approved(→ posts reversal) → PartiallyRefunded/FullyRefunded`, `Rejected`/`Cancelled` before `Approved` only.

**PaymentTransaction**: `Pending → Processing(gateway callback in flight) → Confirmed / Failed`, `Confirmed` is terminal (a failed/wrong payment is corrected via a new reversing transaction, never by mutating a confirmed one — same immutability principle).

**InventoryCount**: `Draft → InProgress → Submitted → Approved(→ posts ADJUSTMENT WarehouseDocument) → Executed`, `Canceled` before `Approved` only.

**StockTransferRequest**: `Draft → Submitted → Approved(→ posts OUT+IN WarehouseDocument pair) → Executed`, `Rejected`/`Canceled` before `Approved` only.

Each of the above is enforced by one small, shared **transition-guard utility** (`assertValidTransition(currentStatus, nextStatus, allowedMap)`) called from each aggregate's service — not seven separately hand-rolled if/else chains. This directly answers the constitution's "never duplicate business logic" rule for what would otherwise be the same kind of check written seven times.

### 5.4 Business engines — reuse map (nothing rebuilt, only reused and extended)

| Engine | Status | Newly wired into |
|---|---|---|
| **Inventory Posting Engine** (`WarehouseDocument.postDocument`) | Kept as-is | GRN confirmation, PurchaseReturn approval, SalesReturn approval, InventoryCount execution, StockTransferRequest execution, Order/Invoice recipe-based deduction |
| **Journal Posting Engine** (`journalEntryService.postFromSource`) | Kept as-is | PurchaseInvoice completion, PurchaseReturn approval, SalesReturn approval (three new call sites, same non-blocking/best-effort pattern already proven by Invoice) |
| **Pricing Engine** (`computeInvoicePricing`) | Kept as-is, extended | Add a `Promotion`-lookup step alongside the existing manual-discount step |
| **Sequence Generation** | Currently duplicated per-module (Order/Invoice each have their own atomic-increment logic) | Extract into one shared `SequenceGeneratorService` used by Order/Invoice/PurchaseOrder/GRN/PurchaseInvoice/PurchaseReturn — a genuine duplication-removal, not new capability |
| **Payment Gateway Adapter** | **New** | One internal contract (`initiate`/`verify`/`refund`/`getStatus`), implemented per-provider; business services (`PaymentTransaction` creation/confirmation) call only the contract |
| **Unit Conversion** | **New** (currently dead fields) | `StockItem.parts`-based storage↔ingredient conversion, called by GRN line entry, Recipe-based deduction, and InventoryCount variance calculation — the one piece of shared math three different workflows all need |

### 5.5 Domain events

Implemented as **direct synchronous service calls for now** (matching this codebase's existing architecture — `invoice.service.ts` already calls `journalEntryService` directly, there is no message bus anywhere in this project and introducing one is a separate, much larger infrastructure decision not in scope here). Named and structured so a future event bus could intercept the same call sites without a rewrite:

`PurchaseOrder.Approved` · `GoodsReceipt.Confirmed` → posts WarehouseDocument · `PurchaseInvoice.Completed` → posts JournalEntry + SupplierTransaction · `PurchaseReturn.Approved` → posts reversal WarehouseDocument + JournalEntry + SupplierTransaction · `PaymentTransaction.Confirmed` → updates SupplierTransaction/CashTransaction + source document's balance · `Order.Confirmed` / `KitchenTicket.Ready` (per `inventoryDeductionTrigger` setting) → posts Issuance WarehouseDocument · `Invoice.Completed` → posts JournalEntry (existing) · `SalesReturn.Approved` → posts inbound WarehouseDocument + JournalEntry reversal · `InventoryCount.Approved` → posts ADJUSTMENT WarehouseDocument · `StockTransferRequest.Approved` → posts OUT+IN WarehouseDocument pair · `StockItem.BelowThreshold` → notification hook (consumer not built in this pass — the event firing point is what's being designed now).

### 5.6 Cross-cutting design notes

- **Money as a bare `Number` is kept, not redesigned into a `{amount,currency}` Value Object.** This would be a genuine improvement (multi-currency correctness), but it's a schema change touching dozens of existing models across the whole platform — far larger blast radius than this domain redesign, and not justified by anything found in this specific audit. Flagged as a legitimate future platform-wide initiative, explicitly out of scope here.
- **`WarehouseDocument.sourceDocument`** (§5.2) is the one schema change to the "kept as-is" inventory core — purely additive, nullable, and is what makes every new integration point in this redesign traceable (an auditor or the Owner can always answer "what caused this stock movement" by following one field, instead of the current "nothing links back" state).
- **Historical data is never backfilled with synthetic GRNs or POs.** Existing `PurchaseInvoice` documents predate this redesign and correctly have no `goodsReceiptNotes[]`/`purchaseOrder` reference — they stay exactly as they are, readable, just without the new traceability going forward. Fabricating retroactive receiving records for them would violate "never invent fake production data."

---

## Phase 6 — Owner Control Layer

| Configurable behavior | Lives in | Type | Default (proposed, needs confirmation §7) |
|---|---|---|---|
| Simple vs. full 3-way-match procurement | `PurchasingSettings.procurementMode` | Policy | `SIMPLE` (matches current behavior exactly) |
| PO approval requirement | `PurchasingSettings.requirePOApproval` | Approval rule | `false` |
| 3-way-match variance tolerance (% before flagging) | `PurchasingSettings.matchToleranceRate` | Business rule | `0` (any variance flagged, informational only — not blocking, see next row) |
| Whether a match variance blocks invoice completion | `PurchasingSettings.blockOnMatchVariance` | Policy | `false` (flag, don't block, until the Owner opts in) |
| Supplier credit-limit enforcement | `PurchasingSettings.enforceSupplierCreditLimit` | Limit | `false` |
| Existing ~18 `PurchasingSettings`/`SalesReturnSettings` fields | Same models, now enforced | Policy/Limit/Approval rule | Unchanged — their existing schema defaults become real for the first time |
| Inventory deduction trigger point | `InventorySettings.inventoryDeductionTrigger` | Workflow configuration | `ON_ORDER_CONFIRM` (closest to current `autoDeductOnOrder` intent) |
| Low-stock alert threshold | `StockItem.minThreshold` / `InventorySettings.lowStockThreshold` (existing fields, now consumed) | Operational rule | Unchanged |
| Enabled payment providers per brand | `PaymentSettings.enabledProviders[]` | Feature flag | Empty (cash-only) until the Owner enables one |
| Default provider per payment type | `PaymentSettings.defaultProvider` | Configuration | None |
| Purchasing/Inventory module on/off | `BrandSettings.modules.purchasing` (new flag, mirrors the existing `inventory` toggle) | Feature flag | Follows the same all/most-on default pattern already established for other modules |
| Who can approve (PO, GRN variance, return refund) | `decisionBy` (array of JobTitle refs — reuses `SalesReturnSettings`' existing, correct pattern) | Security rule | Empty (falls back to role-based `authorize()` check only) |

Every row above is either an existing settings field being activated (the majority) or a small, additive new field on an existing settings model — **no new settings collection is required except `PaymentSettings`**, which currently has no schema at all.

---

## Phase 7 — Refined development roadmap

Supersedes the milestone list in `SUPPLY_CHAIN_COMMERCE_PLATFORM_AUDIT.md` with the entities/decisions from this document folded in. Same dependency-ordering logic as before; each milestone kept small enough to verify independently, per the constitution's explicit requirement.

1. **M0 — Quick wins**: RBAC gaps, `ProductReview` mounting, `RESOURCE_ENUM` cleanup. *(unchanged from the audit doc)*
2. **M1 — Shared utilities**: extract `SequenceGeneratorService`, build the transition-guard utility (§5.3), build the Unit Conversion engine (§5.4). Pure infrastructure, no business behavior change yet — everything after this reuses these three.
3. **M2 — Purchasing core (`SIMPLE` mode only)**: activate `PurchasingSettings` enforcement on the existing `PurchaseInvoice`/`PurchaseReturnInvoice`, using M1's sequence/transition utilities. No new entities yet — this alone fixes audit gap #7.
4. **M3 — Goods Receiving (`PurchaseOrder` + `GoodsReceiptNote`, `FULL_CYCLE` mode)**: the new aggregates from §5.2, wired to the Inventory Posting Engine. `SIMPLE` mode continues working unchanged throughout (M2's behavior is the fallback, not replaced).
5. **M4 — Purchasing↔Accounting**: JournalEntry posting for PurchaseInvoice/PurchaseReturn, reusing the proven Sales pattern.
6. **M5 — Inventory workflow completion**: real service logic for `InventoryCount`/`StockTransferRequest`/`Consumption`, all posting through the same Inventory Posting Engine.
7. **M6 — Sales↔Inventory**: Recipe-based deduction on Order/Invoice per the new `inventoryDeductionTrigger` setting; activates the Unit Conversion engine on the sell side.
8. **M7 — Sales↔Accounting completion**: `SalesReturn` reversal engine; COGS posting once M6 provides real per-sale cost data.
9. **M8 — Promotion↔Pricing**.
10. **M9 — `PaymentTransaction` + Adapter contract (Phase A/B from the prior audit doc)**: the SSOT and the internal adapter interface, cash as the first "provider." No external gateway yet.
11. **M10 — First real gateway adapter**: exactly one provider (recommend starting with whichever the business actually needs first — a genuine business decision, see §8) as the proof of the adapter contract, before building the rest of the named roster.
12. **M11 — Supplier price agreements**.

Each milestone, when approved individually, will get the full Objective/Scope/Files/Dependencies/Migration/Backward-Compatibility/Testing/Rollback/Documentation treatment the constitution requires — not written out for all twelve here to keep this document reviewable rather than exhausting.

---

## Phase 8 — Approval Gate: three business decisions needed before implementation

Per "do not invent business policies" — these are not architectural choices, they're business ones, and this redesign deliberately stops rather than guessing:

1. **Does the platform's target customer base need `FULL_CYCLE` procurement (formal POs, 3-way match) at all in the near term, or should M3 (Goods Receiving) be deprioritized in favor of getting `SIMPLE`-mode Purchasing/Inventory/Sales actually integrated first (M2, M5, M6)?** This changes the roadmap's priority order, not its architecture — the `SIMPLE`/`FULL_CYCLE` split (§5.1) supports either sequencing.
2. **What should `inventoryDeductionTrigger`'s real-world default be** — deduct stock the moment an order is confirmed, or wait until the kitchen marks the item ready? This is a genuine restaurant-operations judgment call (affects how "in stock" numbers read during active service) that depends on how this platform's actual customers operate, not something to assume.
3. **Which payment provider should M10 target first?** The roadmap deliberately does not pick one from the named roster (Paymob/Fawry/Meeza/Stripe/etc.) — that's a market/business decision (which country, which existing merchant relationships), not an architecture decision.

No implementation begins until at least decision 1 is made (it determines whether M3 is early or late in the sequence); decisions 2 and 3 can be made when their respective milestones come up for approval.
