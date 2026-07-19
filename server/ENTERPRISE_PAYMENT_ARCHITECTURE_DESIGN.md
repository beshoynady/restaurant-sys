# Enterprise Payment Architecture Design — Restaurant ERP

**Correction (2026-07-18, see `ADR-001-SALES-PAYMENT-ARCHITECTURE.md` §0):** §14 below states a new `AccountingSettings.controlAccounts.accountsReceivable` entry would be required. This is incorrect — that account already exists on the schema (`accounting-setting.model.js:40-44`) and is `required: true`, simply unused by `invoice.service.ts`. The actual Phase 0 fix is a one-line account swap, not a new field. The ADR is the authoritative version of the roadmap going forward; this document's industry research, accounting principles, and gap analysis remain valid and are not superseded, only §14/§25 Phase 0's specifics are corrected.

**Status: architecture specification, analysis and design only.** No code modified, no schema changed, no migration created, nothing implemented as part of producing this document. Intended to become the official Payment Architecture reference for this platform, superseding nothing implemented — it extends `PAYMENT_LIFECYCLE_AUDIT.md`'s findings into a full target design.

**Method:** every codebase claim below is re-verified this session (not carried over blindly from prior audits), cited to file:line. Industry and accounting sections draw on well-established public patterns from the named systems and IFRS/IAS/GAAP double-entry principles — general professional knowledge, not this codebase, clearly separated from codebase-specific claims throughout.

---

## 1. Executive Summary

This platform can create an `Order`, create an `Invoice` from it, and post a real double-entry `JournalEntry` for that invoice. Beyond that single step, **the payment side of the business does not exist in code** — confirmed exhaustively in `PAYMENT_LIFECYCLE_AUDIT.md` and re-confirmed here. More severely, this audit found the *existing* invoice-posting logic is itself accounting-incorrect: `Invoice.create()`'s journal entry always debits a cash-side account for the full invoice total regardless of whether any payment was ever collected (`invoice.service.ts` — `buildSalesInvoiceLines()` derives its balancing "cash" line as whatever number makes the entry balance, not from actual tender data). Every invoice in this system is currently booked in the general ledger **as if paid in full at the moment of creation**, which is a real financial-misstatement risk, not just a missing feature — see §7 and §21.

This document designs the complete target architecture: a real `Payment`/`Tender` aggregate distinct from `Invoice`, a corrected accounting treatment that separates "a sale was invoiced" from "cash was received," a refund lifecycle mirroring the platform's own working Purchasing/AP precedent, and the domain events, security, and offline strategy an enterprise restaurant platform needs. It also documents, honestly, which adjacent features (Wallet, Gift Cards, Store Credit, Loyalty-as-tender, Promotion redemption, Split Bill, Tips, multi-currency conversion) are schema-scaffolded-but-inert today, so future work doesn't assume infrastructure that isn't real.

---

## 2. Current Architecture (re-verified this session)

| Component | State | Evidence |
|---|---|---|
| `Invoice.create()` | Real — posts `SALES_INVOICE` JournalEntry | `invoice.service.ts:320-321`, `buildSalesInvoiceLines()` lines 161-232 |
| **Invoice posting's balancing line** | ~~Accounting-incorrect~~ **FIXED 2026-07-19** — now debits Accounts Receivable, not Cash (ADR-001 Phase 0) | `invoice.service.ts:231-237`: `receivableDebit` posts to `controlAccounts.accountsReceivable` |
| `Order.paymentStatus` | Dead — 3 total hits in codebase, all declaration/lock-list, zero writes | `order.model.js:319-323`, `order.repository.js:26,30` |
| `Invoice.status` | Dead — never transitions from default `OPEN` | Zero `status:"PAID"` assignments found anywhere |
| `Invoice.paymentMethod[]` | Dead — array schema exists, never populated, not in `defaultPopulate` | `invoice.model.js:186-206` |
| `CashTransaction` | Modeled as money-movement SSOT; **zero production creators** | Only Jest fixtures create one directly |
| `CashierShift` | Real state machine, but `countShift()` reconciles against the empty `CashTransaction` collection | `cashier-shift.service.js` (`OPEN→COUNTED→CLOSED→POSTED`) |
| `PurchaseInvoice.recordPayment()` | **Real, working** — balance decrement + `payments[]` audit + `PURCHASE_PAYMENT` GL posting | `purchase-invoice.service.js:256-289` |
| `PurchaseReturn.recordRefund()` | **Real, working** — `SupplierTransaction` + `PURCHASE_REFUND` GL posting | `purchase-return.service.js` |
| `SalesReturn` | Schema has refund fields; service is 17-line bare CRUD, none populated | `sales-return.model.js`, `sales-return.service.js` |
| `payment-method` | Real, mounted, generic CRUD lookup, genuinely FK-referenced across Sales/Purchasing | `router/v1/index.router.js:77,300` |
| `payment-channel` / `payment-provider` | Built, **unmounted AND import-broken** (nonexistent nested controller folders) | Confirmed both, same bug class |
| `payment-settings` | Placeholder stub, zero schema | — |
| Wallet / Gift Card / Store Credit / Customer Balance | **Confirmed absent** — no model/field anywhere | Exhaustive grep, zero real hits |
| Tips / Gratuity | **Confirmed absent** on Invoice | Full model read |
| Service Charge | Real, but merged into the `serviceTax` field (not a separate line) | `invoice.service.ts:117-120,171,199-200` |
| Split payment (multi-tender per invoice) | Schema-ready (`paymentMethod[]` is an array) but dead — never enforced/summed | `invoice.model.js:186-206` |
| Split bill (`Order.isSplit`) | Dead — only occurrence is the declaration | `order.model.js:214` |
| Order channel (Drive-Thru/QR/Call-Center/Website/Catering) | **Confirmed absent** — `orderType` enum is only `DINE_IN/DELIVERY/TAKEAWAY/INTERNAL` | `order.model.js:180-184` |
| Void / Comp (distinct from cancel) | **Confirmed absent** — only mechanism is `cancelItem()` | Grep, zero dedicated concept |
| Multi-currency conversion | Scaffolded only — `exchangeRate` never set to non-default anywhere in the codebase | `journal-line.model.js:66-69`, 5 total hits, all pass-through defaults |
| Promotion / Coupon redemption | CRUD-only, never applied at checkout | `promotion.service.js` bare wrapper; zero references in `order.service.js`/`invoice.service.ts` |
| Loyalty points as tender | Earn/redeem ledger exists but disconnected from checkout pricing | `loyalty-transaction.service.js:92-133`, never called from invoice/order |
| Delivery COD | Two boolean flags on `DeliveryArea` only, no reconciliation | `delivery-area.model.js:31-32` |
| Domain events | 7 catalogued, 1 subscriber, **zero payment-related** | `domainEvents.js` |
| External payment gateway | **100% absent** — no SDK, no HTTP client, no credential fields | `package.json`, full grep |
| Discount policy (distinct from Promotion) | Real and consumed — `system/discount-settings` | Manager-approval threshold logic wired in `invoice.service.ts` |

---

## 3. Industry Research

General, publicly-documented patterns from enterprise/restaurant systems — not sourced from this codebase, offered as comparison points only.

| System class | Representative products | Common pattern this platform should learn from |
|---|---|---|
| Restaurant POS/back-office suites | Toast, Square for Restaurants, Lightspeed Restaurant, NCR Aloha, Revel, Clover | **Tender abstraction**: a "check"/"ticket" (≈ this platform's Order/Invoice) is settled by one or more **Tenders** (cash, card, gift card, house account, comp) — each Tender is its own record with its own settlement/reconciliation path, never conflated with the invoice document itself. **Cash drawer accountability** is per-cashier, per-shift, reconciled against the sum of actual Tenders recorded during the shift (not an estimate). **Void vs. Comp vs. Refund** are three distinct, separately-permissioned actions with separate reason-code taxonomies, all logged. **Split check** is a first-class operation, not a boolean flag — it produces N sub-checks, each independently tendered.
| Mid-market/enterprise ERP (financials-first) | Oracle NetSuite, SAP Business One, Microsoft Dynamics 365 Business Central, Odoo Enterprise | **Accounts Receivable subledger pattern**: a Sales Invoice posts Debit AR / Credit Revenue+Tax at the moment of invoicing — cash is NOT assumed. A separate **Cash Receipt / Customer Payment** document posts Debit Cash / Credit AR when money actually arrives, and can apply against one or many open invoices (or be left as an unapplied credit/advance). This two-document model is exactly what this platform is missing — its current single `SALES_INVOICE` entry conflates both steps into one, and does so incorrectly (§2). **Bank reconciliation** is a distinct periodic process matching bank-statement lines against posted Cash Receipts, not folded into invoice posting.
| Hospitality-specific (PMS-adjacent) | Oracle MICROS Simphony, hotel PMS integrations | **Room Charge / House Account** pattern: a "payment" can defer to another ledger entirely (a hotel folio, a corporate house account) rather than settling immediately — modeled as a distinct Tender TYPE with its own approval and later-settlement lifecycle, not a special case bolted onto cash/card logic.

**Extracted best practices, not blindly copied:**
1. Separate the "sale happened" event from the "cash arrived" event — always two ledger moments, never one.
2. Model Tender/Payment as its own aggregate with its own state machine, referenced by (not embedded destructively in) Invoice.
3. Split-check and split-payment are related but distinct: splitting the *check* changes what's owed per sub-bill; splitting the *payment* is multiple tenders against one bill. This platform's current `Order.isSplit` boolean and `Invoice.paymentMethod[]` array hint at both concepts existing in the original design intent but neither is implemented — validating that intent, not inventing it.
4. Reason codes (why was this voided/comped/discounted/refunded) are a recurring, deliberately simple pattern worth adopting cheaply — this platform already has the habit (`cancelReason` on Order items) and should extend it, not replace it.

---

## 4. ERP Best Practices (general accounting-system design, not project-specific)

- **Document numbering and immutability**: once posted, financial documents (invoices, payments, credit notes) are never edited in place — corrections are new, linked documents (reversals/credit notes), never destructive updates. This platform already enforces exactly this discipline on `JournalEntry` (posted-immutability hooks, reversal-only corrections) — the same discipline must extend to the new Payment/Refund aggregates, not be reinvented differently for them.
- **Approval workflows scale with risk, not uniformly**: small transactions auto-approve, larger ones or reversals require a second approver — this platform's existing `Orders:approve` permission + `managerApprovalBy` pattern (already used for cancellation and discount thresholds) is the correct, reusable mechanism — do not invent a parallel approval system for payments.
- **Idempotency at the API boundary**: any financial-mutation endpoint (record payment, process refund) must accept a client-supplied idempotency key so a network retry cannot double-charge or double-refund. This is currently absent everywhere in the codebase (no idempotency-key pattern exists anywhere) and must be introduced fresh for the payment domain specifically, since it's the domain where a duplicate side effect is real money, not just a duplicate row.
- **Subledger reconciliation**: AR (what customers owe) and the Cash/Bank control accounts must always be independently reconcilable back to source documents — this is exactly what the missing AR-subledger step (§3) restores.

---

## 5. Restaurant Operations Best Practices

- **Tender types are configuration, not code branches** — this platform's `PaymentMethod` model (brand-scoped, `paymentCategory` enum) is already the right shape for this; it just needs a real consumer.
- **Tip handling must be excluded from revenue and sales tax base** — tips are a pass-through liability to staff, not restaurant revenue. This platform has no tip field at all today; when added, it must post to a **Tips Payable** liability account, never to a revenue account.
- **Service charge vs. tax must stay distinguishable even though both currently share one field** (`serviceTax`) — for GL purposes and for jurisdictions where service charge is taxable-but-distinct-from-VAT, this conflation is a real modeling debt, flagged in §22.
- **Manager-approval reason codes for void/comp/discount** should share one small, brand-configurable reason-code list rather than three separate free-text fields — cheap to build correctly the first time, expensive to reconcile later if done as three disconnected mechanisms.
- **Day-close / shift-close must be additive to the existing `CashierShift` state machine, not a competing one** — the mechanism (`OPEN→COUNTED→CLOSED→POSTED`) is already sound; it only needs real input data (§9, §13).

---

## 6. Accounting Best Practices (IFRS/IAS/GAAP-aligned, general principles)

| Principle | Why it exists | Application here |
|---|---|---|
| Double-entry, always balanced | Structural integrity of the ledger | Already enforced platform-wide (`JournalLine` debit/credit XOR guard) — extend, don't bypass |
| Revenue recognized at point of sale for a restaurant (not at cash receipt) | IFRS 15 / ASC 606 — revenue is recognized when the performance obligation (serving the food) is satisfied, independent of when cash arrives | `Invoice.create()`'s revenue/tax lines are **correct** as revenue-recognition entries — the bug is specifically the synthetic cash-debit line pretending payment happened too (§2). The fix is to credit **Accounts Receivable**, not cash, at invoice time. |
| Accrual basis for the books, cash awareness for treasury | Two different questions ("what did we earn" vs. "what cash do we have") need two different documents | Motivates the two-document model in §3 |
| VAT/output-tax must be tracked separately from revenue | Tax is a liability owed to the government, not income | Already modeled (`salesTax` field, separate from `subtotal`) — preserve this |
| Credit Notes for returns/refunds, never a raw reversal of the original invoice | Auditability — the original sale record must stay intact; the correction is its own document | `SalesReturn` already exists as this document type on the schema; it just needs the posting logic `PurchaseReturn` already has (§11) |
| Partial payments reduce a tracked balance, not a single boolean | An invoice can be 30% paid — a `status` enum alone can't represent that without a `balanceDue`/`amountPaid` pair | New fields required (§10) |
| Overpayments become a customer credit balance, not an error | Real-world cash handling rounding/tipping error tolerance | Requires the (currently absent) customer-balance concept — flagged as new scope in §7, not silently assumed |
| Advance payments / deposits are a liability until earned | Money received before the obligation is satisfied is not yet revenue | Relevant for catering/corporate deposits (§4-adjacent) — new scope, not retrofitted onto existing fields |
| Cost centers / branch-level P&L | Multi-branch operators need branch-level profitability, not just brand-level | Already modeled platform-wide (`CostCenter`, `branch` scoping) — payment postings must carry `branch` consistently, matching the existing convention |
| Bank/cash reconciliation is periodic and independent of transaction posting | Prevents transaction-time errors from silently passing unnoticed | `CashierShift` is the cash-side version of this already; a bank-statement-import reconciliation is out of scope for this design (no bank-feed integration exists or is proposed here) |

---

## 7. Gap Analysis

| # | Gap | Current State | Recommended State | Business Impact | Accounting Impact | Operational Impact | Risk | Complexity | Priority |
|---|---|---|---|---|---|---|---|---|---|
| G1 | Invoice posting assumes full immediate cash receipt | `cashDebit` is a synthetic balancing figure | Debit **Accounts Receivable**, not cash, at invoice creation | Financial statements currently overstate cash / understate AR | **Direct misstatement risk today** | None if fixed cleanly (internal posting logic only) | **Critical** | Medium | **P0** |
| G2 | No payment-recording mechanism (Sales/AR) | Confirmed dead chain | `Invoice.recordPayment()`, mirroring the working AP precedent | Cannot know what's actually been collected | Enables correct Cash Debit / AR Credit posting | Cashiers currently have no system-of-record for tendering | High | Medium (precedent exists) | **P0** |
| G3 | `CashTransaction` never created | Confirmed zero production creators | Created automatically by G2's `recordPayment()` | Cash reconciliation is currently impossible | `CashierShift.countShift()` becomes accurate | Shift close currently reconciles against nothing | High | Low (consumer of G2) | **P0** |
| G4 | No sales refund posting | `SalesReturn` schema-only | `SalesReturn.recordRefund()`, mirroring AP's `recordRefund()` | Returns currently have zero financial consequence | Missing Credit Note discipline | Staff must handle refunds entirely outside the system today | High | Medium (precedent exists) | **P1** |
| G5 | `payment-channel`/`payment-provider` import-broken | Would crash app if mounted | Fix import paths (independent of feature work) | None currently (unmounted) | None | Blocks any future online-payment work | Medium (latent) | Trivial | **P1** (cheap, unblocks later phases) |
| G6 | No Tender/Payment aggregate distinct from Invoice | `paymentMethod[]` dead array field | New `Payment` collection (§8) | Enables split-tender, partial payment, refund-against-specific-tender | Enables accurate per-tender GL mapping (cash vs. card vs. clearing account) | Matches real POS tendering workflow | Medium | Medium-High | **P0** (foundation for G2) |
| G7 | No idempotency protection on financial mutations | Absent platform-wide | Idempotency-key requirement on Payment/Refund endpoints specifically | Prevents double-charge/double-refund from retries | Prevents duplicate GL entries | Prevents duplicate cash-drawer entries | High (financial) | Low-Medium | **P0** |
| G8 | No Wallet/Gift Card/Store Credit | Confirmed absent | New scope — not a retrofit | Cannot support prepaid/loyalty-as-tender programs | New liability-account pattern needed (deferred revenue) | New feature, real customer-facing demand in restaurant vertical | Low (nothing broken today) | High | **P3** |
| G9 | No Tips field/handling | Confirmed absent | New `tips[]` on Payment, posts to a Tips Payable liability | Cannot support the majority of table-service markets | New liability account required | Staff currently track tips entirely outside the system | Medium | Medium | **P2** |
| G10 | Service charge conflated with tax field | Shares `serviceTax` | Separate `serviceCharge` field, distinct GL treatment | Minor reporting clarity loss today | Some jurisdictions require the distinction for tax-base purposes | Low | Low-Medium | **P2** |
| G11 | Split bill (`isSplit`) dead | Boolean flag, unused | Real split-check operation producing linked sub-invoices | Cannot support group dining split-pay, a common restaurant request | Each sub-invoice needs its own correct GL posting | Medium | Medium-High | **P2** |
| G12 | No Order channel beyond 4 basic types | `DINE_IN/DELIVERY/TAKEAWAY/INTERNAL` only | Extend enum (Drive-Thru/QR/Call-Center/Website/Catering) as needed by actual business | Cannot report channel-level performance for unsupported channels | None directly | Low-Medium | Low | Low | **P3** |
| G13 | No Void/Comp distinct from Cancel | Only `cancelItem()` | Extend the existing phase-aware cancel path with a `reasonCategory` (VOID/COMP/CANCEL) rather than a parallel mechanism | Cleaner audit trail, matches industry taxonomy | Comp needs its own GL treatment (marketing expense vs. revenue reduction) — currently silently absent | Low | Low | **P3** |
| G14 | No real multi-currency | Scaffolding-only fields | Deliberately **not recommended now** — flagged as a separate, larger platform-wide initiative already named in `DATABASE_ARCHITECTURE_REDESIGN.md` (money-as-Value-Object) | Only relevant if multi-currency brands are an actual near-term target | Large blast radius across every monetary model | High if attempted piecemeal | Very High | **P4 — explicitly deferred** |
| G15 | Promotion/Loyalty disconnected from checkout pricing | CRUD-only | Wire redemption into invoice pricing, once Payment/Tender exists to model "points as a tender line" | Real customer-facing gap (coupons/points currently don't work at checkout despite full-looking schemas) | Needs its own revenue/discount GL treatment | Medium | Medium | **P2** |
| G16 | No payment-related domain events | Zero exist | Add `Payment.Recorded`, `Payment.Voided`, `Invoice.FullyPaid`, `Refund.Processed` (§15) | Enables future Notifications/Loyalty/Reporting subscribers without re-touching core payment code | None directly | Low (additive) | Low | **P1** (cheap, high future leverage) |
| G17 | Misleading code comment in `cashier-shift.service.js` | Asserts a false premise about existing GL posting | Correct the comment | None (documentation only) | Prevents future engineers from building on a false assumption | None | Low | Trivial | **P1** |

---

## 8. Payment Domain Model

**Bounded contexts** (aligned with this platform's existing domain folders, not new top-level domains):
- **Order-Taking** (`sales/order`) — unchanged, already correctly scoped to "what was ordered."
- **Billing** (`sales/invoice`) — "what is owed," corrected per G1.
- **Payment Collection** (new: `sales/payment` or `finance/payment` — placement decision below) — "what was actually tendered."
- **Treasury / Cash Management** (`finance/cashier-shift`, `finance/cash-transaction`, `finance/cash-register`, `finance/bank-account`) — unchanged shape, finally fed real data.
- **Accounting / GL** (`accounting/*`) — unchanged, extended with new `sourceType` values only.

**Aggregate roots and relationships:**

```
Order (existing, unchanged)
  1───1  Invoice (existing, corrected posting — see §10)
                │
                │ 1───N
                ▼
              Payment (NEW aggregate root)
                │  { invoice, brand, branch, cashierShift, tenders[], status,
                │    idempotencyKey, createdBy, createdAt }
                │
                │ tenders[] (embedded, not a separate collection — same
                │ "don't build a new model for a value list" discipline
                │ this codebase already applies elsewhere)
                │  { paymentMethod → PaymentMethod, amount, currency,
                │    reference, tenderType: CASH|CARD|WALLET|HOUSE_ACCOUNT }
                │
                ▼
          CashTransaction (existing model, finally populated)
                │  1───1 per cash/bank-affecting tender
                ▼
          CashierShift.countShift() (existing, finally fed real data)

SalesReturn (existing schema)
                │ 1───1 (optional)
                ▼
              Refund (NEW aggregate root, mirrors Payment's shape)
                │  { salesReturn, originalPayment, brand, branch, tenders[],
                │    status, approvedBy, idempotencyKey }
                ▼
          CashTransaction (REFUND/OUTFLOW) + reversing JournalEntry
```

**Placement decision — `sales/payment` vs `finance/payment`:** recommend **`sales/payment`**, following this codebase's existing precedent that `Invoice`/`Order` live under `sales/` even though they have deep financial consequences, and that `finance/` is reserved for the treasury/cash-management layer (`CashRegister`, `CashierShift`, `CashTransaction`, `BankAccount`) rather than the sales-transaction layer. `Payment` sits between the two conceptually but is triggered by and scoped to a sale, matching `sales/invoice`'s existing placement logic.

**Why an aggregate, not just new fields on Invoice:** a single Invoice can be paid across multiple tenders, potentially over multiple visits to the register (partial payments), and later partially refunded independently of the original payment record. Embedding this directly on Invoice would require unbounded array growth and lose the ability to void/reverse one specific payment event cleanly — exactly the reasoning this codebase already applied when it separated `JournalEntry`/`JournalLine` rather than embedding lines on the entry.

---

## 9. Payment Lifecycle (state machine)

```
                 ┌──────────┐
      record     │          │  additional tender(s), balance > 0
   ┌────────────▶│  PARTIAL │◀────────────┐
   │             │          │             │
   │             └────┬─────┘             │
┌──┴───┐              │ balance = 0       │
│ NONE │              ▼                   │
└──┬───┘         ┌──────────┐             │
   │  full amount│          │             │
   └────────────▶│   PAID   │─────────────┘
                 │          │  (void within same-session window,
                 └────┬─────┘   manager-approval required)
                      │
                      │ SalesReturn processed against this payment
                      ▼
              ┌────────────────┐        ┌──────────┐
              │ PARTIALLY_      │───────▶│ REFUNDED │
              │ REFUNDED        │  full  │          │
              └────────────────┘ remaining└──────────┘
```

Invariant, matching the platform's existing immutability discipline on `JournalEntry`: **a `Payment` document, once any tender is recorded, is never edited in place.** A void is a new, linked reversing record, not a mutation — same reasoning already applied to `JournalEntry.status = "Reversed"`.

---

## 10. Invoice Lifecycle (corrected)

Current enum: `OPEN → PAID → PARTIALLY_RETURNED → FULLY_RETURNED / CANCELLED` (only `OPEN` is ever actually reached today).

**Recommended addition**: `PARTIALLY_PAID` between `OPEN` and `PAID`, plus two new tracked fields: `balanceDue` (initialized to `total` at creation) and `amountPaid` (initialized to `0`). Every `Payment` recorded against this invoice atomically decrements `balanceDue`/increments `amountPaid`; `status` transitions to `PARTIALLY_PAID` on the first non-zero payment below full, and to `PAID` when `balanceDue` reaches zero — using the same atomic-claim `findOneAndUpdate` pattern already proven in `order.service.js#transition` and `cancelItem`, not a new concurrency mechanism.

```
OPEN ──(payment recorded, balance > 0)──▶ PARTIALLY_PAID ──(balance = 0)──▶ PAID
  │                                              │                            │
  │ (SalesReturn processed)                      │ (SalesReturn processed)    │ (SalesReturn processed)
  ▼                                              ▼                            ▼
CANCELLED (only from OPEN,                PARTIALLY_RETURNED ────────▶ FULLY_RETURNED
 no payment yet)
```

---

## 11. Refund Lifecycle

Mirrors `PurchaseReturn.recordRefund()`'s proven shape exactly:

```
SalesReturn created (PENDING)
      │
      │ manager approval (Orders:approve-equivalent permission, reused not reinvented)
      ▼
   APPROVED
      │
      │ SalesReturn.recordRefund() — NEW method
      ▼
   PROCESSED
      │  creates: Refund record, reversing CashTransaction (OUTFLOW),
      │           reversing JournalEntry (sourceType: SALES_REFUND, new value),
      │           updates originalInvoice.status per §10
      ▼
  (terminal)
```

`refundStatus`'s existing enum (`PENDING/REFUNDED/PARTIALLY_REFUNDED/CANCELLED`) already matches this shape — it was correctly designed, just never implemented. No enum change needed on `SalesReturn` itself.

---

## 12. Cash Lifecycle

```
Payment tender recorded (CASH or CARD or ...)
      │
      ▼
CashTransaction created
  { transactionType: "SALE", direction: "INFLOW", cashierShift, cashRegister,
    paymentMethod, invoiceId, status: "POSTED" }
      │
      ▼
CashierShift.countShift() sums POSTED CashTransactions for this shift
      │
      ▼
Cashier physically counts drawer → variance computed (existing mechanism)
      │
      ▼
CashierShift.postShift() → GL variance posting (existing, already correct)
```

This is the smallest possible change to the cash side: **the mechanism is already right — it only needs a real upstream producer**, which is exactly what §9's `Payment` aggregate provides. No change to `CashierShift`'s state machine or reconciliation math is recommended.

---

## 13. Cashier Lifecycle

Unchanged from current implementation (`OPEN → COUNTED → CLOSED → POSTED`, `CashierShiftSettings.maxDifferenceAllowed` tolerance, manager-approval-on-variance) — already well-designed. The only required change is correcting the misleading code comment (G17) once real per-sale `CashTransaction` rows exist, so the comment accurately describes what's actually being reconciled.

---

## 14. Accounting Integration

**New `JournalLine.sourceType` enum values required** (additive, matching this codebase's existing convention of one value per posting engine):

| New sourceType | Posted by | Debit | Credit |
|---|---|---|---|
| `SALES_PAYMENT_RECEIPT` | `Payment` creation | Cash/Card-Clearing account (per tender's `PaymentMethod`) | Accounts Receivable |
| `SALES_REFUND` | `SalesReturn.recordRefund()` | Accounts Receivable (or Revenue reversal, per return type) | Cash/Card-Clearing |

**Corrected `SALES_INVOICE` posting** (G1 fix): Debit **Accounts Receivable** (new control account, mirroring the existing `controlAccounts.inventory` pattern on `AccountingSettings`) / Credit Revenue + Credit Tax Payable — removing the synthetic `cashDebit` line entirely. This single change is what makes the rest of this document's postings internally consistent — every subsequent `Payment`/`Refund` posting then correctly draws down the same AR balance the invoice created.

**Account requirements** (new `AccountingSettings.controlAccounts` entries, additive): `accountsReceivable`, `cardClearing` (per processor, if multiple), `tipsPayable` (if G9 is implemented). No structural change to `JournalEntry`/`JournalLine` themselves — they already support everything this needs.

---

## 15. Domain Events

New additions to `domainEvents.js`'s catalog (additive, same `EventEmitter`-based mechanism, no new infrastructure):

| Event | Emitted by | Plausible future subscribers |
|---|---|---|
| `Payment.Recorded` | `Payment` creation | Notifications (receipt), Loyalty (points-earn trigger, closing G15's disconnect), Reporting |
| `Payment.Voided` | Payment void | Audit, Notifications |
| `Invoice.FullyPaid` | Invoice reaches `PAID` | Notifications, CRM |
| `Invoice.PartiallyPaid` | Invoice reaches `PARTIALLY_PAID` | Reporting (AR aging) |
| `Refund.Processed` | `SalesReturn.recordRefund()` | Notifications, Loyalty (points-reversal) |

Every event above should be added in the **same change that ships its first real subscriber** — this repeats the existing, explicit, in-code convention already documented in `domainEvents.js` ("additive-only... a new subscriber is added in the same change that ships it"), not a new policy.

---

## 16. External Providers

No provider integration exists today (§2). Recommended target shape, **not built as part of this design**:

- A `PaymentGatewayAdapter` interface (`initiate(amount, currency, reference)`, `verify(providerRef)`, `refund(providerRef, amount)`, `getStatus(providerRef)`) — exactly the shape already named as future scope in `SUPPLY_CHAIN_COMMERCE_DOMAIN_REDESIGN.md` and on `payment-provider.model.ts`'s own header comment. This design does not re-derive that shape differently; it confirms the existing documented plan is still correct and should be followed when that phase is reached.
- Webhook receipt endpoints must verify signatures and be idempotent against `Payment.idempotencyKey`/provider reference — a genuinely new security surface for this codebase (no webhook-receiving endpoint exists anywhere today).
- **Fix G5 (broken imports) before this phase, not during it** — a working provider integration built on top of a broken router is unnecessarily hard to debug.

---

## 17. Offline Strategy

No offline-sync infrastructure exists anywhere in this codebase today (confirmed absent platform-wide in prior audits — no queue, no scheduler, no conflict-resolution mechanism beyond the conceptual `docs/PROJECT_VISION_ar.md` §21.15-21.16 design). For payments specifically, recommend:

- **Cash tenders can be recorded offline-first** (a cash drawer doesn't need connectivity) with a client-generated `idempotencyKey`, synced when connectivity returns.
- **Card/online tenders cannot be offline** by nature (gateway round-trip required) — no design attempts to fake this.
- **Conflict resolution on sync**: reuse the three options already named in the platform's own vision document (§21.16: Server Wins / Latest Change Wins / Manager Review) rather than inventing a fourth pattern — for financial records specifically, **Manager Review is the only safe default**; auto-merge of money is not recommended under any circumstance.
- This entire capability requires the currently-absent sync-queue infrastructure to be built first — it is out of scope to design further here without that prerequisite decision being made explicitly (matching this document's own "don't invent, document the gap" discipline).

---

## 18. Security

- **PCI-DSS awareness**: never store a card PAN, CVV, or full track data in this database under any circumstance — only a gateway-issued token/reference. This is a hard constraint on §16's design, not a recommendation.
- **Idempotency keys** (G7) on every financial-mutation endpoint — required, not optional, given real money is at stake.
- **RBAC reuse**: a new `Payments` resource in `RESOURCE_ENUM` (`iam/role/role.model.js`), following the exact existing pattern (`create/read/update/delete/viewReports/approve/reject/reverse` — `approve` for the void/refund-approval flows, `reverse` for reversal actions) — no new permission-action taxonomy needed, the existing 7-action shape already covers this domain's needs.
- **Rate-limiting** on payment endpoints beyond the platform's existing generic 100/min limiter — a payment-specific stricter limit is warranted given the fraud-adjacent nature of repeated payment attempts, matching the pattern already used for `system-setup`'s `strictEntryLimiter`.

---

## 19. Audit Trail

Reuse the existing `AuditLog` + `auditLogger` middleware (HTTP-response-driven, confirmed in the Backend Knowledge Base) — **do not build a parallel payment-specific audit mechanism.** Two additions worth making at the same time, since payments are exactly the domain where audit integrity matters most:
- Apply the tamper-evident hash-chain redesign already proposed in `DATABASE_ARCHITECTURE_REDESIGN.md` (Problem 4) to `AuditLog` **before or alongside** this payment work, not after — payment records are the strongest argument for why that redesign matters, and building payments on top of a still-soft-deletable audit log undercuts the point.
- Every `Payment`/`Refund` mutation should carry `createdBy`/`approvedBy` (where applicable) in the same explicit-actor-reference convention already used platform-wide — no new pattern.

---

## 20. Reporting

Enabled directly by this design, not built as part of it:
- **AR Aging report** — becomes possible once `Invoice.balanceDue` (§10) is real.
- **Cash-over/short report per shift** — already exists as a mechanism (`CashierShift` variance), becomes accurate once fed real data (§12).
- **Revenue-vs-collected-cash reconciliation** — the direct output of separating AR from Cash correctly (§14).
- **Tender-mix report** (cash vs. card vs. wallet share of sales) — a natural query once `Payment.tenders[]` exists.
No new reporting infrastructure is proposed — this platform's existing reporting modules (`accounting/executive-dashboard`, `finance/finance-reports`) are the natural home for these once the underlying data exists.

---

## 21. Risk Analysis

| Risk | Likelihood today | Severity | Mitigated by |
|---|---|---|---|
| Financial statements currently misstate cash/AR for every existing invoice | **Certain — happening now** | Critical | G1 fix (§14) |
| Double-payment/double-refund from a network retry, once payment recording exists | Medium (common failure mode industry-wide) | High | G7 idempotency keys |
| Cashier-shift variance reports are currently meaningless | **Certain — happening now** | High (operational trust in the numbers) | G2+G3 |
| A future engineer builds on the misleading `cashier-shift.service.js` comment and assumes cash postings already happen correctly | Medium | Medium | G17 |
| Card data accidentally stored in this database during future gateway integration | Low if this design's constraint (§18) is followed | Critical if it happens | Explicit PCI constraint in §18, enforced at design-review time |
| Multi-currency attempted piecemeal on top of this design | Low if G14 stays deferred as recommended | High if attempted anyway | Explicit deferral, cross-referenced to the existing platform-wide initiative |

---

## 22. Technical Debt

- Two structurally-identical broken router imports (`payment-channel`, `payment-provider`) — cheap, should be fixed independent of any other phase (G5).
- `payment-provider.controller.js` extends `BaseController` against a hand-rolled, non-`AdvancedService`-shaped service — a latent runtime crash on first use of most inherited methods, separate from the import bug.
- Service charge and tax currently share one field (`serviceTax`) — a real modeling debt for jurisdictions that tax them differently (G10).
- `Order.isSplit` and `orderType`'s channel gap are both "designed but dead/incomplete" in the same pattern already catalogued repeatedly across this codebase's audits — nothing new architecturally, just two more confirmed instances.
- Promotion and Loyalty-redemption are both fully-schema'd, zero-consumer features — the same "designed but dead" pattern found platform-wide, now confirmed in the payment-adjacent domain specifically too.

---

## 23. Future AI Opportunities

Kept deliberately modest — realistic near-term applications only, not speculative:
- **Cash-variance anomaly detection**: once `CashierShift` reconciliation runs on real data (§12-13), a simple statistical model (per-cashier variance history) could flag shifts worth reviewing before they're auto-approved — a refinement of the existing `maxDifferenceAllowed` flat threshold, not a new system.
- **Refund-pattern flagging**: once `SalesReturn`/`Refund` are real (§11), repeated-refund patterns per cashier or per customer are a standard, well-understood fraud signal worth a simple rules-based (not ML-first) flag initially.
- **Tender-mix forecasting** for cash-drawer float planning — a straightforward time-series application once real tender data exists, genuinely low-risk/high-value.
No AI-driven pricing, discount, or approval-automation is recommended — those touch money-movement decisions directly and should stay rules-based and human-approved per §6/§18's principles, not delegated to a model.

---

## 24. Recommended Architecture (consolidated)

```
Order ──1:1── Invoice (posts AR/Revenue/Tax, corrected)
                  │
                  ├──1:N── Payment (NEW) ──creates──▶ CashTransaction ──feeds──▶ CashierShift
                  │            │
                  │            └──posts──▶ JournalEntry (SALES_PAYMENT_RECEIPT)
                  │
                  └──1:1(opt)── SalesReturn ──1:1── Refund (NEW) ──creates──▶ CashTransaction (reversal)
                                                          │
                                                          └──posts──▶ JournalEntry (SALES_REFUND)
```

Two new aggregate roots (`Payment`, `Refund`), one corrected posting method (`Invoice.create()`), two new service methods mirroring proven AP precedents (`Invoice.recordPayment()`, `SalesReturn.recordRefund()`), two new `JournalLine.sourceType` enum values, five new domain events, one new `RESOURCE_ENUM` entry, zero new top-level modules, zero changes to `BaseRepository`/`BaseController`/the security pipeline.

---

## 25. Recommended Roadmap

### Phase 0 — Correctness fix (no new feature)
- **Objective**: stop misstating financials on every new invoice (G1).
- **Dependencies**: none.
- **Risk**: low — changes the debit side of one journal-posting method; existing `JournalEntry` immutability/reversal discipline already handles any need to correct already-posted entries.
- **Migration**: none required for historical entries (per this platform's own established policy of never backfilling synthetic financial history) — the fix applies going forward only, with an explicit note in the audit trail of the change date.
- **Testing**: extend existing `invoice-sales-posting` integration test to assert the debit line targets AR, not cash.
- **Rollback**: revert the one method; no data migration to unwind.
- **Acceptance criteria**: every new invoice posts Debit AR / Credit Revenue+Tax; zero synthetic cash-debit lines going forward.

### Phase 1 — Payment aggregate + recordPayment
- **Objective**: G2, G3, G6, G7, G16, G17.
- **Dependencies**: Phase 0 (the AR account must exist to be credited).
- **Risk**: medium — new aggregate, new concurrency-sensitive balance decrement (reuse the platform's proven atomic-`findOneAndUpdate` pattern).
- **Migration**: none (additive collection; existing invoices simply start at `balanceDue = total`).
- **Testing**: mirror `purchase-invoice`'s existing payment-recording test suite structure exactly.
- **Rollback**: feature is additive; disabling the new endpoints reverts behavior to today's (still-incorrect-until-Phase-0, but no new risk introduced).
- **Acceptance criteria**: a payment recorded against an invoice correctly decrements `balanceDue`, creates one `CashTransaction`, posts one balanced `JournalEntry`, and is idempotent under retry.

### Phase 2 — Refund
- **Objective**: G4.
- **Dependencies**: Phase 1 (a refund needs a real payment to refund against).
- **Risk**: medium, same shape as Phase 1.
- **Testing**: mirror `purchase-return`'s existing `recordRefund` test suite structure.
- **Acceptance criteria**: matches Phase 1's shape, mirrored for the outflow direction.

### Phase 3 — Cheap fixes, any time, independent of the above
- G5 (broken imports), G17 (comment correction) — no dependencies, can land before, during, or after Phases 0-2.

### Phase 4+ — Deferred, each requiring its own separate approval gate
- G8 (Wallet/Gift Card/Store Credit), G9 (Tips), G10 (Service charge split), G11 (Split bill), G12 (Order channels), G13 (Void/Comp taxonomy), G15 (Promotion/Loyalty checkout integration), §16 (external gateway integration), §17 (offline sync). **G14 (multi-currency) explicitly deferred indefinitely**, tied to the platform-wide money-as-Value-Object initiative already on record elsewhere.

---

## 26. Final Conclusions

The payment domain's core problem is not "a missing feature" — it's that the one piece of it that does run today (`Invoice.create()`'s journal posting) runs on an incorrect assumption, silently, for every invoice created so far. Phase 0 alone is worth prioritizing above every other finding in this document regardless of what else gets approved, because it's the only item on this list that is actively producing wrong numbers right now rather than merely lacking a feature.

Every other recommendation in this design reuses a pattern this codebase already proved works somewhere else: `Payment`/`Refund` mirror the working Purchasing/AP precedent exactly; the state machines reuse the existing `TransitionGuard`/atomic-claim mechanism; the events reuse the existing `domainEvents.js` catalog convention; the permissions reuse the existing 7-action RBAC shape. Nothing in this design invents new architectural machinery — it closes a real, evidence-based gap using the platform's own established idioms, which is exactly what makes it safe to build incrementally, phase by phase, with an explicit approval gate at each step, per the standing rule this session has followed throughout.

**Status: specification only. No implementation has begun or been approved.**
