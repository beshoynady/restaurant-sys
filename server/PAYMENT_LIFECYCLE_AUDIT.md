# Payment Lifecycle — Architectural Audit (Recommendation #7)

**Scope:** Order, Order Items, Invoice, Payment Methods/Channels/Providers/Settings, Refunds, Cashier Shift, Cash Transactions, Accounting/GL, external payment providers, payment-related events, API surface, dead code.

**Trigger:** discovered while implementing `PREPARATION_INVENTORY_ORDER_FLOW_AUDIT.md` recommendation 2 — `Order.paymentStatus` and `Invoice.status` both appeared unwritten, blocking any payment-based cancellation rule.

**Method:** three parallel code-verified research passes (money-flow trace, payments-domain/refunds/events, accounting-consistency/providers/dead-code), every finding cited to file:line. Analysis only — **no code modified, no schema changed, no feature implemented** as part of producing this document.

---

## 1. Executive Summary

The sales-side payment lifecycle is **not implemented beyond GL posting at invoice creation**. An `Invoice` is created, a real double-entry `JournalEntry` is posted for it (`SALES_INVOICE`), and that is where the money-flow chain ends — nothing in the codebase ever records that a payment was actually collected, nothing transitions `Order.paymentStatus` or `Invoice.status` away from their defaults, and the `CashTransaction` collection explicitly documented as "the single source of truth for ALL money transactions" has **zero production code that ever creates one**. `CashierShift` reconciliation is real and well-built as a mechanism, but the "expected cash" figure it reconciles against is architecturally starved — it reads from the same empty `CashTransaction` collection.

The Purchasing (AP) side of this platform already solved the equivalent problem: `PurchaseInvoice.recordPayment()` is a complete, working precedent (balance decrement, `payments[]` audit trail, real GL posting) that has no Sales (AR) counterpart. This asymmetry is the single most actionable finding in this audit — a Recommendation #7 implementation should port that pattern, not invent a new one.

No external payment gateway integration exists anywhere (no SDK, no HTTP client code, no credentials/webhook fields) — every "provider"/"gateway"/"channel" concept in the codebase is a local classification record, not a live integration. Two of the four `payments/` domain entities (`payment-channel`, `payment-provider`) are not just unmounted but **import-broken** — mounting either today would crash the app at boot.

---

## 2. Current Architecture

```
PaymentMethod  (payments/payment-method)   — REAL, mounted, generic CRUD lookup table
  ↑ referenced by: Invoice.paymentMethod[], SalesReturn.refundMethod[],
                   PurchaseInvoice, PurchaseReturn.refundTransactions[], SupplierTransaction

PaymentChannel (payments/payment-channel)  — built, UNMOUNTED, import-BROKEN (missing nested folder)
PaymentProvider(payments/payment-provider) — built, UNMOUNTED, import-BROKEN (same bug class),
                                              controller/service shape mismatch
PaymentSettings(payments/payment-settings) — placeholder stub, zero schema, zero logic

CashTransaction (finance/cash-transaction) — modeled as money-movement SSOT, generic CRUD only,
                                              ZERO production create() call sites anywhere
CashierShift    (finance/cashier-shift)    — real state machine (OPEN→COUNTED→CLOSED→POSTED),
                                              countShift() expected-cash math depends entirely on
                                              CashTransaction rows that are never populated
CashRegister / BankAccount                 — pure GL-account config, no Invoice/Order/Payment refs

Invoice (sales/invoice)   — status defaults OPEN, NEVER transitions (not to PAID, not to
                            PARTIALLY_RETURNED/FULLY_RETURNED/CANCELLED). paymentMethod[] field
                            exists, is never populated or read. Real: posts SALES_INVOICE JournalEntry.
Order (sales/order)       — paymentStatus defaults UNPAID, NEVER written anywhere (also locked out
                            of the generic PUT via lockedUpdateFields).
SalesReturn (sales)       — refund-shaped fields (journalEntry, reversalOfJournalEntry, refundStatus,
                            refundMethod) exist on schema; service is pure CRUD, none of them are
                            ever populated by any code.

PurchaseInvoice.recordPayment()  — REAL, WORKING precedent: balance decrement + payments[] audit
                                    trail + PURCHASE_PAYMENT JournalEntry. No sales-side equivalent.
PurchaseReturn.recordRefund()    — REAL, WORKING precedent: SupplierTransaction + PURCHASE_REFUND
                                    JournalEntry. No sales-side equivalent (SalesReturn has none).
```

---

## 3. Actual Payment Lifecycle (as coded today)

```
Order created (paymentStatus: UNPAID, never changes)
   │
   ▼
Invoice created (status: OPEN, never changes)
   │  invoice.service.ts#create() → journalEntryService.postFromSource({sourceType:"SALES_INVOICE"})
   │  — REAL, this GL entry is genuinely posted.
   │  invoice.paymentMethod[] is accepted from the client body but never validated against
   │  invoice.total, never used for anything, never populated server-side.
   ▼
[CHAIN BREAKS HERE — no code records that a payment was collected]
   │
   ▼
CashierShift.countShift() queries CashTransaction for this shift → empty in production
   → expected.cashSales etc. compute from zero real sales data
   ▼
CashierShift.postShift() posts only the shift's cash-count VARIANCE to GL
   (sourceType: "CASHIER_SHIFT_VARIANCE") — REAL, this part works correctly as a mechanism,
   it's just reconciling against a number that was never fed real sales data.
```

**Intended lifecycle** (standard ERP shape, matching what the schema enums imply and what Chapter 21 assumes exists):

```
Order (UNPAID) → Invoice (OPEN) → payment recorded (CashTransaction + Invoice.paymentMethod[]
  populated + balance tracked) → Invoice.status → PAID, Order.paymentStatus → PAID →
  CashierShift reconciliation reflects real sales → (if returned) SalesReturn → refund recorded
  (CashTransaction reversal + JournalEntry) → Invoice.status → PARTIALLY_RETURNED/FULLY_RETURNED
```

Every arrow after "Invoice (OPEN)" in the intended chain is currently unimplemented on the sales side.

---

## 4. Dead Code Findings

| Item | Evidence |
|---|---|
| `Order.paymentStatus` | 3 total hits in the whole tree: the field declaration, and its own entry in `lockedUpdateFields`. Zero reads, zero writes. |
| `Invoice.status` PAID transition | Zero call sites set `status: "PAID"` anywhere. Field is in `lockedUpdateFields`, so not even the generic PUT can set it. |
| `Invoice.status` PARTIALLY_RETURNED / FULLY_RETURNED transitions | Zero call sites anywhere, including inside `sales-return.service.js` itself. |
| `Invoice.paymentMethod[]` | **New finding.** Schema field exists (`invoice.model.js:186-206`), never populated by any service, never included in `defaultPopulate`, never read anywhere in `sales/invoice/`. |
| `SalesReturn.journalEntry` / `.reversalOfJournalEntry` / `.refundStatus` | All schema-only. `sales-return.service.js` is a 17-line bare CRUD wrapper — no method populates any of these three fields. |
| `CashTransaction` (as a mechanism) | Model + real schema (polymorphic `orderId`/`invoiceId`/`supplierTransactionId`/`dailyExpenseId` refs) exist; service is generic CRUD; **zero production `.create()` call sites** — the only 4 matches anywhere are Jest fixtures constructing test data directly, not through any service. |
| `JournalLine.sourceType` values `PAYROLL_RUN`, `SALES_RETURN`, `CASH_MOVEMENT` | Declared in the enum, zero `postFromSource` callers anywhere for any of the three. |
| `payment-channel` router/controller | Import path (`./payments/payment-channel.controller.js`) points at a nonexistent nested folder — broken, not just unmounted. |
| `payment-provider` router/controller | Same bug class (`./paymentProvider/payment-provider.controller.js` — nonexistent folder), plus its controller (`BaseController`) doesn't match its service's hand-rolled method surface. |
| `payment-settings` (entire entity) | Model/service/controller/router are all literal one-line placeholder stubs — no schema exists at all. |

---

## 5. Missing Infrastructure

1. **No sales-side payment-recording method.** No equivalent of `PurchaseInvoice.recordPayment()` exists for `Invoice`. This is the single largest gap — everything downstream (Order.paymentStatus, Invoice.status, CashTransaction population, cashier-shift reconciliation accuracy) depends on this existing first.
2. **No sales-side refund-posting method.** No equivalent of `PurchaseReturn.recordRefund()`/`_postRefundAccounting()` exists for `SalesReturn`.
3. **No external payment gateway integration** — confirmed 100% absent (no SDK dependency in `package.json`, no HTTP client code anywhere in `payments/`, no credentials/webhook schema fields). The "OnlineGateway" payment category and "GATEWAY" channel type are local classification labels only.
4. **No payment-related domain events** — none of the 7 catalogued events relate to payments; zero emit call sites reference payment/refund concepts.
5. **`payment-channel`/`payment-provider` routers need their import paths fixed** before they can even be mounted safely — this is a prerequisite bugfix, not new infrastructure, but blocks anything downstream that would want to use them.
6. **`payment-settings`** has no schema at all — any brand-level payment policy (default provider, enabled methods, auto-settlement rules) has nowhere to live yet.

---

## 6. Integration Gaps

| Downstream system | Currently affected by payment? |
|---|---|
| Order Lifecycle | No — `paymentStatus` never reflects reality |
| Kitchen / Preparation | No (and shouldn't be, per existing architecture — kitchen flow is triggered by order confirmation, not payment) |
| Inventory | No direct coupling either way; unaffected |
| Accounting | **Partial** — invoice creation posts a real GL entry, but that entry doesn't correspond to "cash received," it corresponds to "a sale was invoiced." No entry exists for the actual cash/card/wallet receipt itself. |
| Cashier Shift | **Partial/broken** — the reconciliation mechanism is real, but starved of real data (see §3) |
| Customer Balance | No customer-balance/wallet/credit concept exists anywhere in the codebase to check against |
| Loyalty | Out of scope for this audit (separate, already-known-weak domain per the Backend Knowledge Base) |
| Reports | Any report reading `Invoice.status`/`Order.paymentStatus` today would be reading a constant, not real data |

---

## 7. Technical Debt

- The `CashierShift.postShift()` code comment (line ~148-152) asserts individual sales "already posted their own GL entries at transaction time (Invoice's own posting)" — **this is inaccurate**: the Invoice posting is a revenue/tax entry, not a cash-receipt entry, and no per-sale cash entry exists at all. This comment should be corrected regardless of what else is implemented, since it currently misdescribes the system to the next engineer who reads it.
- Two structurally-identical import-path bugs (`payment-channel`, `payment-provider`) — same root cause as a previously-fixed bug class elsewhere in this codebase, left unfixed here.
- `payment-provider.controller.js` extending `BaseController` against a hand-rolled (non-`AdvancedService`) service is a latent crash — any call to an inherited `BaseController` method (`getAll`, `softDelete`, etc.) that the service doesn't implement will throw at runtime, not at import time, making it harder to catch than the import-path bugs.

---

## 8. Risks

| Risk | Severity | Notes |
|---|---|---|
| Financial reports (cashier reconciliation, revenue-vs-cash reports) are silently inaccurate today | **High** | `CashierShift` variance reporting reconciles against zero real sales data — a shift could show a large "variance" that's actually just 100% of the day's real cash, or show no variance despite real cash discrepancies, depending on how it's currently being operated manually. |
| Cannot build any payment-based business rule (refund gating, cancellation-after-payment, customer credit) until this is fixed | **High** | Directly blocks `PREPARATION_INVENTORY_ORDER_FLOW_AUDIT.md`'s deferred §21.4 payment gate, and any future Recommendation #7 work itself. |
| Mounting `payment-channel`/`payment-provider` without fixing the import bug first would crash the app at boot | **Medium** | Contained risk — only triggers if someone mounts them without testing, but worth flagging loudly given how easy it'd be to do in a future PR. |
| `SalesReturn` currently accepts/records return line items with zero accounting or inventory consequence | **Medium** | A "return" today changes nothing about revenue, cash, or GL — silently incomplete, not obviously broken, which is a worse failure mode than a loud error. |

---

## 9. Recommendations (prioritized by impact)

1. **Build `Invoice.recordPayment()`, mirroring `PurchaseInvoice.recordPayment()` exactly** — balance tracking (`Invoice` would need a `balanceDue`/`amountPaid` field pair, currently absent), `payments[]`-style audit push (reusing the existing but currently-dead `paymentMethod[]` shape, or replacing it with the proven AP pattern), and a real `SALES_INVOICE`-adjacent GL posting for the cash/card receipt itself (a new `sourceType`, since `SALES_INVOICE` already means something else). Once real, this single method is what makes `Invoice.status → PAID` and `Order.paymentStatus → PAID` finally meaningful.
2. **Build `SalesReturn.recordRefund()` + `_postRefundAccounting()`, mirroring `PurchaseReturn`'s working pair.**
3. **Fix the two `payments/` router import-path bugs** (`payment-channel`, `payment-provider`) — cheap, safe, unblocks everything downstream that would want to use them, and removes a live crash-on-mount risk.
4. **Correct the inaccurate code comment in `cashier-shift.service.js`** about per-sale GL posting — a documentation-accuracy fix, essentially free, prevents future confusion.
5. **Decide `PaymentSettings`' real scope** (currently a placeholder) once #1 exists — it'll need to hold at least "which payment methods are enabled," "default method," and any auto-settlement policy.
6. **External gateway integration** (Paymob/Fawry/etc.) — correctly out of scope until #1-#2 exist; there's nothing to plug a gateway into yet.

None of the above has been implemented as part of this audit.

---

## 10. Recommended Implementation Roadmap for a Future Recommendation #7

1. **Phase 1 — Sales payment recording** (highest leverage, smallest surface): `Invoice.recordPayment()`, new `balanceDue`/`amountPaid` fields (or repurpose the dead `paymentMethod[]`), wires `Invoice.status → PAID` when balance reaches zero, wires `Order.paymentStatus` in lockstep, creates a real `CashTransaction` row so `CashierShift.countShift()` finally has real data to reconcile against.
2. **Phase 2 — Sales refunds**: `SalesReturn.recordRefund()` + `_postRefundAccounting()`, populates `journalEntry`/`reversalOfJournalEntry`/`refundStatus`, reverses the `CashTransaction` created in Phase 1.
3. **Phase 3 — Fix and mount `payment-channel`/`payment-provider`**, once there's an actual consumer for them (Phase 1's `recordPayment()` would be the natural place to resolve a channel/provider for online payments).
4. **Phase 4 — `PaymentSettings`** real schema, once Phase 1-3 exist to be configured.
5. **Phase 5 — External gateway adapter** (a single provider first, per the already-existing architectural note in `SUPPLY_CHAIN_COMMERCE_DOMAIN_REDESIGN.md` about not building the full roster upfront).

Each phase should get its own approval gate before implementation, per the pattern already established for recommendations 1-3 in `PREPARATION_INVENTORY_ORDER_FLOW_AUDIT.md`. **Status: analysis only — nothing above has been implemented or approved for implementation.**
