# ADR-001: Correct Sales Accounting & Payment Architecture

**Status:** Proposed — **Phase 0 approved and implemented 2026-07-19.** Phases 1-4 remain awaiting approval, not implemented.
**Date:** 2026-07-18 (Phase 0 landed 2026-07-19)
**Supersedes (partially, see §0):** a factual correction to `ENTERPRISE_PAYMENT_ARCHITECTURE_DESIGN.md`'s Phase 0 recommendation.
**Deciders:** owner approved Phase 0 only (2026-07-19). Phases 1-4 still require explicit sign-off before any further implementation begins.

**Phase 0 implementation record:** `invoice.service.ts:220-237` now debits `controlAccounts.accountsReceivable` (was `controlAccounts.cash`); misleading comments corrected in `cashier-shift.service.js:147-154` and `accounting-setting.model.js:112-119`. `tests/integration/invoice-sales-posting.test.ts` extended with an explicit assertion that the balancing line targets AR, not Cash. Full verification: `node --check` clean, `tsc --noEmit` introduces zero new errors on `invoice.service.ts` (170 pre-existing `no-unsafe-*` lint errors on this file are unchanged before/after, confirmed via `git stash` comparison — not introduced by this change), 8 integration suites / 32 tests pass with zero regressions. No schema change, no migration, matching §8's prediction exactly.

---

## 0. Correction to Prior Documentation

Per this task's explicit instruction to re-verify rather than trust prior conclusions, and to correct any prior inaccuracy found: **`ENTERPRISE_PAYMENT_ARCHITECTURE_DESIGN.md` §14 stated a new `AccountingSettings.controlAccounts.accountsReceivable` entry would be "required (additive)."** This is **incorrect**. Direct read of `accounting-setting.model.js:40-50` confirms `controlAccounts.accountsReceivable` **already exists on the schema and is `required: true`** — every brand with `AccountingSettings` configured already has this account provisioned; it is simply never referenced by `invoice.service.ts`. The correct fix is smaller and safer than previously stated: **no new field, no new account, no migration** — see §1 and §9 Phase 0.

---

## 1. Verify the Current Implementation (re-traced from primary source)

Full execution path, every claim cited to the exact line read in this session:

```
Order.transition() [order.service.js]
   (no automatic link to Invoice creation found — grepped sales/ for any
    invoiceService.create() call site triggered from order.service.js: ZERO
    hits. Invoice creation is a separate, client-initiated API call, not an
    automatic consequence of order confirmation. This is a materially
    different fact from what a reader might assume from Order/Invoice's
    tight schema coupling — documented here because it affects §7's data-
    model recommendation.)
        │
        ▼
POST /invoice  →  InvoiceService.create()  [invoice.service.ts:312-342]
   │
   ├─ super.create(opts)  → Invoice document persisted, status defaults "OPEN"
   │
   └─ try { ... } — best-effort, non-blocking (deliberate, documented at
      invoice.service.ts:303-310: a brand without AccountingSettings still
      gets a working invoice)
        │
        ├─ accountingSettingService.resolveForPosting(brand, branch)
        │
        ├─ buildSalesInvoiceLines(invoice, settings)  [invoice.service.ts:161-232]
        │     │
        │     ├─ Revenue credit = subtotal + addition (± tax-inclusive/discount
        │     │  adjustments) → credits settings.activities.sales.revenue
        │     ├─ Tax credit → settings.activities.sales.tax
        │     ├─ Discount/ServiceCharge/DeliveryFee lines → optional accounts
        │     │  or folded into revenue if unconfigured
        │     │
        │     └─ LINE 223: cashDebit = totalCredit - totalDebitSoFar
        │        LINE 229: lines.push(journalLine(
        │                    settings.controlAccounts.cash,   ◄── CONFIRMED
        │                    "... - cash collected", cashDebit, 0, currency))
        │
        ├─ journalEntryService.postFromSource({sourceType:"SALES_INVOICE", ...})
        │     → real, balanced JournalEntry posted [journal-entry.service.js]
        │
        └─ invoice.journalEntry = entry._id; invoice.save()

[CHAIN ENDS HERE — invoice.status stays "OPEN" forever, confirmed zero
 transitions anywhere in the codebase]
```

**Direct answers to the required questions:**

| Question | Answer | Evidence |
|---|---|---|
| Where is the journal entry created? | `InvoiceService.create()`, `invoice.service.ts:312-342`, calling `journalEntryService.postFromSource` | Read in full this session |
| How are debit/credit calculated? | `buildSalesInvoiceLines()` computes revenue/tax/discount/service-charge/delivery-fee as normal credit/debit lines, then the **balancing line is synthetic**: `cashDebit = totalCredit - totalDebitSoFar` | `invoice.service.ts:218-223` |
| Is Cash actually debited? | **Yes, confirmed at `invoice.service.ts:229`** — `settings.controlAccounts.cash` is debited for the synthetic `cashDebit` amount, regardless of whether any payment was ever collected | Direct read, exact line |
| Does Accounts Receivable exist? | **Yes** — `controlAccounts.accountsReceivable`, schema-required, exists and is provisioned for every configured brand, but is **never referenced anywhere in `sales/invoice/` or `sales/order/`** (grepped) | `accounting-setting.model.js:40-44` |
| Does this comply with IFRS 15 / accrual accounting? | **No** — see §2 | — |

**Corroborating evidence this is a known-divergent pattern, not an isolated mistake:** the *Purchasing* side of this exact codebase does the equivalent posting **correctly** — `purchase-invoice.service.js:83` credits `settings.controlAccounts.accountsPayable` (not cash) at invoice-creation time, and only debits AP / credits cash later, inside `recordPayment()` → `_postPaymentAccounting()` (`purchase-invoice.service.js:336-355`), when a payment is actually recorded. **This is the same `controlAccounts` structure, the same `AccountingSettings` document, the same brand — the Payable side does this right; the Receivable side does not.** This is the strongest possible evidence available in this codebase that the Sales-side pattern is a defect, not an intentional design choice: the correct pattern already exists, one domain over, using the exact same schema.

One further corroborating (and concerning) finding: `accounting-setting.model.js:112-118`'s own comment on the `cashOverShort` field asserts *"Individual sales/refunds already post their own GL entries at transaction time (via Invoice's own posting)"* — this is the **same false premise** independently found in `cashier-shift.service.js`'s comment during the prior audit (flagged there as finding G17). It now appears in **two separate files**, meaning this incorrect assumption has propagated across the codebase's own documentation, not just its behavior.

---

## 2. Accounting Validation

**IFRS 15 (Revenue from Contracts with Customers):** revenue is recognized when the performance obligation is satisfied (the meal is served / the invoice is issued for goods transferred), **independent of when cash is collected**. The `buildSalesInvoiceLines()` revenue/tax credit lines are themselves **correct** under IFRS 15 — the defect is isolated entirely to the balancing debit line.

**Double-entry / accrual principle:** an economic event that hasn't happened yet (cash receipt) must never be journalized as if it had. Booking Debit Cash at invoice time, for an invoice that has not been paid, **overstates the Cash account and understates Accounts Receivable** on the balance sheet from the moment of posting. This is not a rounding or cosmetic issue — it misstates two balance-sheet line items on every single invoice, for the entire operating history of any brand using this code path with unpaid or partially-paid invoices.

**IAS 1 (Presentation of Financial Statements):** requires financial statements to present a "true and fair view." A Cash balance inflated by unpaid invoices, with a correspondingly non-existent Accounts Receivable balance, fails this requirement directly — an auditor reviewing this system's output would flag it.

**Accounts Receivable principle:** AR exists specifically to represent "revenue earned, cash not yet collected" — the exact economic reality of every invoice that hasn't been immediately settled at the register. Skipping AR and going straight to Cash **assumes 100% immediate collection on every sale**, which is not a valid assumption even for a cash-heavy restaurant business (staff meals on account, corporate/house accounts, delayed card settlement, disputed charges, split payments completed after the check is printed).

**Restaurant-specific nuance, correctly not over-applied:** many restaurant POS systems *do* legitimately treat "check closed" and "payment collected" as the same instant for a walk-in cash/card table — but that is a **business rule about the timing gap being usually zero**, not a justification for skipping the AR leg structurally. The correct architecture still posts Debit AR / Credit Revenue at invoice time and Debit Cash / Credit AR at payment time, even when those two events happen one second apart — the two-document model costs nothing when the gap is zero, and is the only model that remains correct when the gap isn't (house accounts, corporate billing, delayed settlement, disputes). This directly answers Phase 8's validation question: the recommended architecture is correct for *both* the instant-settlement case and the deferred case, using one mechanism, not a special-cased shortcut for the common case.

**Conclusion: the current implementation is not IFRS-compliant.** It is a structural defect, actively producing incorrect financial statements for every invoice posted since this code was written, not a missing feature.

---

## 3. Architectural Problems (classified by severity)

| # | Issue | Severity |
|---|---|---|
| P1 | `buildSalesInvoiceLines()` debits Cash instead of Accounts Receivable | **Critical** |
| P2 | `Order.paymentStatus` dead field, redundant with Invoice's fiscal state by design intent (its own comment: "linked later to Invoice — No financial data stored here") | High |
| P3 | `Invoice.status` never transitions past `OPEN` — no payment-recording mechanism exists | High |
| P4 | `CashTransaction` ("single source of truth for ALL money transactions") has zero production creators | High |
| P5 | `CashierShift.countShift()` reconciles against the empty `CashTransaction` collection — mechanism real, input data absent | High |
| P6 | No sales refund/settlement lifecycle — `SalesReturn`'s `journalEntry`/`refundStatus` fields are schema-only | High |
| P7 | No reconciliation point exists anywhere between "revenue recognized" and "cash collected" for sales (the AP side has exactly this reconciliation via `PurchaseInvoice.balanceDue`) | High |
| P8 | Misleading code comments asserting sales already post correctly, in **two files** (`cashier-shift.service.js`, `accounting-setting.model.js:112-118`) | Medium (documentation-accuracy, but actively misleads future engineers) |
| P9 | `Invoice.paymentMethod[]` dead array field, schema implies split-tender support that doesn't exist | Medium |
| P10 | No idempotency-key mechanism exists anywhere in the codebase for financial mutations | Medium (becomes High once payment-recording exists) |
| P11 | `Order`↔`Invoice` cardinality is not enforced or documented (Invoice creation is a fully separate, client-triggered call, not an automatic consequence of Order confirmation) | Low (a fact to design around, not a defect per se) |

---

## 4. Alternative Designs

### Option A — Current approach with fixes (patch `buildSalesInvoiceLines()` only)

Change line 229 to credit `accountsReceivable` where it currently debits `cash`... but wait — the entry needs a **debit**, and AR should be debited (an asset increasing), so the fix is: `journalLine(settings.controlAccounts.accountsReceivable, ..., cashDebit, 0, currency)` — same shape, different account. No new aggregate, no new endpoints, no payment recording at all.

- **Advantages:** trivial, one-line change, zero migration, fixes the accounting-correctness defect immediately.
- **Disadvantages:** does **not** address P2-P10 — there would still be no way to ever record a payment, so AR would accumulate forever with no mechanism to draw it down. Correct in isolation, incomplete as a solution.
- **Accounting correctness:** correct for the invoice-posting moment; **incomplete** as a system (no settlement leg exists at all).
- **ERP scalability:** poor in isolation — no AR aging is possible without a payment history.
- **Restaurant suitability:** insufficient — a restaurant needs to actually record that the table paid.
- **Implementation complexity:** trivial.
- **Migration complexity:** none.
- **Long-term maintenance:** poor if left as the *only* change — an unaddressed feature gap that will need re-visiting immediately.

### Option B — Dedicated Payment Aggregate (this ADR's proposal, detailed §5-§9)

A new `Payment` aggregate root, referencing `Invoice`, with its own tender lines, posting Debit Cash/Card-Clearing / Credit AR at recording time. Mirrors `PurchaseInvoice.recordPayment()`'s proven shape exactly.

- **Advantages:** matches the codebase's own working precedent exactly (lowest risk of a *novel* design mistake); supports multiple tenders per invoice cleanly (§8's `paymentMethod[]` intent, finally realized); supports partial payments naturally; keeps `Invoice` focused on "what is owed," `Payment` on "what was collected" — correct separation of concerns; auditable (each payment event is its own immutable record, matching this platform's existing `JournalEntry` immutability discipline).
- **Disadvantages:** more implementation surface than Option A alone (new collection, new service, new endpoints); requires the concurrency-safe balance-decrement pattern to be built correctly (though a proven template exists to copy).
- **Accounting correctness:** fully correct — two-document model (§2).
- **ERP scalability:** high — this is the standard enterprise pattern (§3 of the design doc), supports house accounts, corporate billing, and multi-tender naturally.
- **Restaurant suitability:** high — matches real POS tendering workflows (§3 industry research).
- **Implementation complexity:** medium — but substantially de-risked by the existing AP precedent.
- **Migration complexity:** low — purely additive collection; existing invoices simply start with no payments recorded (accurate, since none were ever recorded).
- **Long-term maintenance:** high — clean separation, matches existing conventions, easiest to reason about and extend (refunds, gateways, split-tender all build on the same aggregate).

### Option C — Full Accounts Receivable Aggregate (a dedicated `CustomerLedger`/`ARSubledger` entity, independent of `Payment`)

A separate ledger entity tracking every AR movement (invoice charges, payments, credit memos, write-offs) as its own append-only stream per customer, with `Payment` as one of several event types feeding it — closer to how a full general-ledger-subledger pair works in a system like NetSuite/SAP B1's Customer sub-ledger.

- **Advantages:** the most complete, most "correct" enterprise design — enables true AR aging, customer statements, write-off tracking, and multi-invoice payment application (one payment settling several invoices at once) cleanly.
- **Disadvantages:** significant new domain concept (`CustomerLedger`) with no existing precedent anywhere in this codebase to mirror — the *architectural pattern itself* would be novel here, which this ADR's guiding principle (reuse proven patterns, don't invent new machinery) argues against doing prematurely. Requires a real "Customer" entity concept for house-account/corporate billing that mostly doesn't exist yet (this platform's customer concept is `OnlineCustomer`/`OfflineCustomer` in `crm/`, not wired to any billing/credit concept today).
- **Accounting correctness:** highest possible ceiling, but only if built correctly — more surface area for a subtle error, given it has no in-codebase template.
- **ERP scalability:** highest, but only relevant if house accounts / multi-invoice settlement are actually near-term business requirements — not confirmed as such anywhere in Chapter 21 or the existing docs.
- **Restaurant suitability:** valuable specifically for the House Account / Corporate Account patterns named in Chapter 21 §4 research, but most restaurant transactions (walk-in, single-invoice, single-payment) don't need this complexity.
- **Implementation complexity:** high.
- **Migration complexity:** medium — would likely absorb `Payment` (Option B) as an event type within it, meaning Option B is not wasted work if Option C is pursued later; it becomes a foundation, not a competing investment.
- **Long-term maintenance:** high ceiling, high floor — powerful but heavier to maintain than Option B for a platform that doesn't yet have confirmed demand for multi-invoice settlement.

---

## 5. Recommended Architecture: **Option B**, with Option A's fix as its mandatory first sub-step (Phase 0)

**Decision: Option B (dedicated `Payment` aggregate), built on top of Option A's one-line correction as Phase 0.**

**Justification:**
- **Enterprise ERP fit:** matches the two-document (Invoice/Payment) pattern used by every reference system studied in §3 of `ENTERPRISE_PAYMENT_ARCHITECTURE_DESIGN.md` (NetSuite, SAP B1, Business Central, Odoo).
- **Restaurant ERP fit:** the `Payment.tenders[]` shape directly supports split-tender and multi-method checkout, the most common restaurant-specific requirement beyond single-tender.
- **IFRS:** fully compliant — Debit AR/Credit Revenue at invoice time (Phase 0), Debit Cash/Credit AR at payment time (Phase 1). This is the textbook two-entry pattern validated in §2.
- **Clean Architecture / DDD:** `Payment` is a genuine aggregate root with its own invariants (tenders must sum to no more than the invoice's remaining balance; once recorded, immutable except via a reversing Refund) — not an anemic data bag bolted onto Invoice.
- **Repository Pattern / Service Layer:** `payment.repository.js` + `payment.service.js`, following this codebase's own established, mandatory convention — no deviation needed.
- **Event Driven Architecture:** `Payment.Recorded`/`Invoice.FullyPaid` slot directly into the existing `domainEvents.js` catalog convention.
- **Single Source of Truth:** `Payment` documents are the immutable event log (the actual source of truth for "what was collected"); `Invoice.balanceDue` is a materialized, transactionally-maintained projection of that log, not a second independent truth — see §7's full reasoning.
- **Future SaaS / Multi-Brand / Multi-Branch:** `Payment` is brand/branch-scoped exactly like every other document in this platform — no new tenancy pattern needed.
- **Offline POS:** cash tenders can be recorded offline-first with a client-generated idempotency key (§17 of the design doc) — this shape supports that without redesign.
- **Multi-Currency:** `Payment.tenders[].currency` mirrors `JournalLine.currency`'s existing (if currently unused) shape — no new currency-modeling concept required, and this ADR does **not** attempt to fix multi-currency, consistent with it being explicitly out of scope platform-wide.
- **Future external payment gateways:** a gateway integration becomes "a new way to populate a `Payment` tender," not a redesign of the payment concept itself — the aggregate boundary is exactly right for this future extension.

**Option A alone is rejected as the final answer** (though mandatory as Phase 0) because it fixes the accounting entry without providing any way to ever apply a real payment against it — AR would grow forever with no offsetting mechanism, which is not a usable end state.

**Option C is rejected for now, not permanently** — it solves a problem (multi-invoice settlement, formal customer sub-ledger) not yet confirmed as a real business requirement, and introduces a genuinely novel pattern this codebase has no precedent for. Option B's `Payment` aggregate is structured so it could become an event-type feed into a future `CustomerLedger` without being thrown away — it is not a dead end if Option C's fuller scope is confirmed necessary later.

---

## 6. Existing Purchasing Pattern — Can It Become the Template?

**Yes, with two explicit, evidence-based caveats.**

**What transfers directly:**
- The two-step posting split (credit AP/AR at invoice time; debit AP/AR + credit cash at payment time) — this is the core fix and transfers exactly.
- The stored, atomically-decremented `balanceDue` field pattern (`purchase-invoice.service.js`'s `$inc: {balanceDue: -amount}`) — see §7, this is the correct SSOT answer for the sales side too, evidenced by this exact precedent already existing and working.
- The `payments[]` audit-trail-on-parent-document convention paired with a *separate* posting call per payment (`sourceRef: justPaid._id`, not the invoice's own `_id`) — ensures idempotent, per-payment GL entries exactly the way `recipe-consumption.service.js#consumeForTicket` already independently arrived at the same `sourceRef`-per-event pattern for a different domain (per-ticket, not per-order, COGS posting) earlier this session. This convergence across two unrelated domains is a strong signal it's this codebase's real house style, not a one-off.
- The `_resolveCashAccount()` register-vs-control-account fallback logic — directly reusable for sales tenders too (a cashier's specific `CashRegister` should be preferred over the generic control account, same reasoning applies identically).

**What does NOT transfer directly (differences that matter):**
- **Cardinality of counterparty.** Purchasing has one `Supplier` per `PurchaseInvoice` with a real `creditLimit`/`SupplierTransaction` balance concept already built. Sales has no equivalent "Customer" billing concept wired to `Invoice` at all — most sales invoices have no `Customer` reference that carries any credit/balance meaning (walk-in dine-in has no customer record in most cases). This means the sales-side `Payment` aggregate should key its AR tracking to the **Invoice**, not to a **Customer** balance — a materially different design point from Purchasing, where the balance genuinely belongs to the Supplier across multiple invoices. **Do not build a Supplier-style running customer balance for sales in Phase 1** — there is no confirmed business requirement for it (that would be Option C's concern, explicitly deferred).
- **Approval/credit-limit gating.** Purchasing's `enforceSupplierCreditLimit` has no sales-side equivalent need in the same shape — a restaurant doesn't typically extend "credit" to walk-in customers the way it does to suppliers. If House Accounts / Corporate Accounts (Chapter 21 §4 concepts) become a real near-term requirement, THAT is where a credit-limit-style gate would belong, on a future Customer/House-Account entity — not retrofitted onto every sales invoice now.
- **Refund direction and counterpart.** `PurchaseReturn.recordRefund()` creates a `SupplierTransaction` (an existing, real, standalone ledger for the supplier relationship). Sales has no equivalent standalone customer ledger to write into — `SalesReturn.recordRefund()` (§9 Phase 2) should therefore post its `CashTransaction` reversal and `JournalEntry` directly, without inventing a parallel "CustomerTransaction" ledger that has no proven need yet (matching this ADR's "don't invent" discipline).

**Conclusion:** the Purchasing pattern is safe and correct to use as the **posting-mechanics template** (the two-step GL split, the atomic balance field, the per-payment `sourceRef`), but must **not** be copied wholesale for the counterparty-balance concept — that part of Purchasing solves a problem (supplier running balances) that Sales does not yet have evidence of needing.

---

## 7. Data Model Review (Single Source of Truth applied strictly)

| Proposed field | Can it be derived? | Decision | Justification |
|---|---|---|---|
| `Payment.tenders[]` (amount, method, currency, reference per tender) | No — this IS the source event data, nothing to derive it from | **Store** | This is the primary fact being recorded, not a projection of anything else |
| `Invoice.amountPaid` | Yes, technically — `SUM(Payment.tenders[].amount) WHERE invoice = X` | **Store anyway, as a write-time-maintained projection, not an independent input** | Matches the exact existing precedent (`PurchaseInvoice.balanceDue`, atomically `$inc`'d) already proven in this codebase. Justification required and met: **(a) performance** — AR-aging/open-invoice list queries need to filter/sort without a join across every invoice; **(b) proven precedent** — the identical pattern already exists and works on the AP side; **(c) auditability is preserved, not weakened** — `Payment` documents remain the immutable event log; `Invoice.amountPaid` is a materialized read-model kept in sync by the same atomic operation that creates the `Payment`, in one transaction, never independently editable (enforced via `lockedUpdateFields`, already this codebase's standard mechanism for exactly this). This is SSOT in the correct sense: one place *writes* the truth (`Payment.recordPayment`'s transaction), `Invoice.amountPaid` is a cache of it, not a second truth. |
| `Invoice.balanceDue` | Yes — `total - amountPaid`, a pure function of two other stored values | **Store**, computed at the same write, for the same reasons as `amountPaid` (query performance is the dominant one — AR aging reports filter on this constantly) |
| `Invoice.status` (`OPEN`/`PARTIALLY_PAID`/`PAID`/...) | **Yes, entirely** — a pure function of `balanceDue` vs `total` (and `SalesReturn` state for the returned variants) | **Store, but derive it, never accept it as independent client input** | It already cannot be client-set (`lockedUpdateFields` includes `status`) — this ADR changes nothing about that, it only specifies that the *service layer* computes it transactionally alongside `balanceDue`, exactly once, in the same write. Stored (not purely virtual) because every other transactional document in this codebase indexes and queries on its own `status` field the same way (`Order.status`, `PreparationTicket.preparationStatus`, `PurchaseInvoice.status`) — deviating from that convention for Invoice alone would be inconsistent, not more correct. |
| `Order.paymentStatus` | **Yes — and there is no proven need to store it at all, derived or otherwise** | **Do not implement. Recommend formal removal**, correcting this ADR's own predecessor document's implicit assumption that it should be "wired in lockstep" with Invoice | Re-verified this session: Invoice creation is a separate, client-triggered call with no confirmed 1:1 automatic relationship to Order (§1, P11). The field's own schema comment already says *"linked later to Invoice — No financial data stored here."* Duplicating payment state on both Order and Invoice is exactly the kind of two-source-of-truth risk this entire ADR exists to eliminate on the Invoice/Cash side — it would be self-defeating to introduce a new instance of the same problem on Order while fixing it on Invoice. If a UI genuinely needs "is this order's invoice paid" at a glance, that's a `populate()`/join at read time, not a stored duplicate field. |
| `Payment.paymentCount` / any tender-count field | Yes, trivially (`tenders.length` or a count query) | **Do not store** | No performance, business, or audit justification found anywhere in this codebase's existing conventions for storing a count that's cheap to compute from an already-loaded array or a rare, non-hot-path query |
| `Payment.status` (`RECORDED`/`VOIDED`) | No — this is genuine state (a payment can be voided after the fact), not derivable from anything else | **Store** | Necessary state, not a projection |

---

## 8. Migration Strategy

- **Phase 0 (posting-account fix):** no migration required. Existing posted `JournalEntry`/`JournalLine` documents are **not** retroactively corrected — this platform's own established policy (already applied to the DB-implementation work referenced throughout this codebase) is to never rewrite historical financial history; correction is prospective only, with the change date itself serving as the audit boundary. **Explicitly flag to the brand's accountant** that entries posted before the fix date overstate Cash/understate AR and should be corrected via a manual adjusting journal entry if the brand's books are actively in use — this ADR does not attempt to auto-generate that adjustment, since the correct adjustment amount depends on real-world collections data this system doesn't have.
- **Phase 1 (`Payment` aggregate):** purely additive — new collection, no changes to existing `Invoice`/`Order` documents' *existing* fields. New fields (`amountPaid`, `balanceDue`, corrected `status` enum with `PARTIALLY_PAID` added) default such that every existing invoice reads as `amountPaid: 0, balanceDue: total, status: "OPEN"` — which is **accurate**, since no payment has ever actually been recorded for any existing invoice in this system. No backfill guesswork required or attempted.
- **Backward compatibility:** `Invoice.status`'s enum gains one new value (`PARTIALLY_PAID`) — purely additive to a Mongoose enum, no migration needed for existing documents (none of them will ever have had this value, and none need to).
- **Existing reports:** any report currently reading `Invoice.status` will start seeing real state changes for the first time (a behavior *correction*, not a breaking change, since the field was never meaningfully populated before). Reports currently reading `Order.paymentStatus` — grep confirms **none exist** — so removing/deprecating that field has zero blast radius on reporting.
- **Rollback strategy:** each phase is independently revertible — Phase 0 is a one-line code revert with no data to unwind; Phase 1's `Payment` collection can be dropped without touching `Invoice`/`Order` if the phase is rolled back before Phase 2 begins.
- **Risk mitigation:** land Phase 0 alone first, verified via the existing `invoice-sales-posting` integration test (extended to assert the AR account, not cash, is debited), before Phase 1 begins — this isolates the highest-severity, lowest-risk fix from the larger aggregate work.

---

## 9. Implementation Roadmap

### Phase 0 — Accounting correction — **DONE (2026-07-19)**
- **Scope:** one-line change in `buildSalesInvoiceLines()` (`invoice.service.ts:229`): debit `settings.controlAccounts.accountsReceivable` instead of `settings.controlAccounts.cash`. Correct the two misleading comments (P8) in the same change.
- **Dependencies:** none — `accountsReceivable` already exists and is already required on every brand's `AccountingSettings`.
- **Risk:** low.
- **Acceptance criteria:** ✅ every newly-created invoice's journal entry debits AR, not Cash; ✅ existing integration test suite for `invoice-sales-posting` passes with an added assertion on the debited account (both the positive assertion — equals AR — and negative — does not equal Cash).
- **Rollback:** revert the one line; no data to unwind.
- **Testing strategy:** extended the existing test, no new test infrastructure needed. All 4 tests in that suite pass; 8 suites / 32 tests pass across the broader invoice/cashier-shift/financial-statements/reports regression sweep.

### Phase 1 — Payment Aggregate
- **Scope:** new `sales/payment` module (model/repository/service/controller/router, full RBAC chain per this codebase's mandatory pattern); `Invoice.recordPayment()`-equivalent flow creating a `Payment` document, atomically decrementing `Invoice.balanceDue`/incrementing `amountPaid`, transitioning `status`; creates a real `CashTransaction`; posts `SALES_PAYMENT_RECEIPT` (Debit Cash-or-Card-Clearing / Credit AR).
- **Dependencies:** Phase 0 (AR must be the correct account already being credited by invoice creation for this debit to make the balance meaningful).
- **Risk:** medium — new concurrency-sensitive balance decrement; mitigated by reusing the platform's proven atomic-`findOneAndUpdate`/`$inc` pattern, not a novel mechanism.
- **Acceptance criteria:** a payment recorded against an invoice correctly decrements `balanceDue`, creates exactly one `CashTransaction`, posts one balanced `JournalEntry`, is idempotent under retry (P10 addressed here, not deferred further), and `CashierShift.countShift()` for the first time reconciles against real data.
- **Rollback:** additive collection; disable the new endpoints to revert to Phase-0-only behavior.
- **Testing strategy:** mirror `purchase-invoice`'s existing payment-recording integration test suite structure exactly (same assertions, sales-side accounts).

### Phase 2 — Refund Aggregate
- **Scope:** `SalesReturn.recordRefund()`, mirroring `PurchaseReturn.recordRefund()`'s shape (§6) but **without** a parallel customer-ledger entity (§6's explicit caveat) — posts `CashTransaction` (OUTFLOW) + `SALES_REFUND` JournalEntry directly, updates `Invoice.status` toward `PARTIALLY_RETURNED`/`FULLY_RETURNED` per the existing enum.
- **Dependencies:** Phase 1 (a refund needs a real payment to refund against).
- **Risk:** medium, same shape as Phase 1.
- **Acceptance criteria:** matches Phase 1's shape, mirrored for the outflow direction; `refundStatus` enum finally populated.
- **Rollback:** additive; disable endpoints.
- **Testing strategy:** mirror `purchase-return`'s existing `recordRefund` test suite structure.

### Phase 3 — Cash Transaction / Cashier Shift Integration Verification
- **Scope:** not new code — a dedicated verification pass confirming `CashierShift.countShift()`'s expected-cash math now correctly reflects Phase 1/2's real `CashTransaction` volume, and correcting `cashier-shift.service.js`'s misleading comment (P8) with accurate wording reflecting the new reality.
- **Dependencies:** Phase 1 and 2 live in at least one real shift's data.
- **Risk:** low.
- **Acceptance criteria:** a shift's computed `expected.cashSales` matches the sum of that shift's real cash `Payment` tenders, verified against a real integration test scenario spanning order → invoice → payment → shift close.
- **Rollback:** N/A (verification only).

### Phase 4 — External Payment Providers
- **Scope:** fix the two broken router imports (`payment-channel`, `payment-provider` — independent, can land any time before this phase, no dependency on Phases 0-3); build the `PaymentGatewayAdapter` interface already named as future scope in `SUPPLY_CHAIN_COMMERCE_DOMAIN_REDESIGN.md`; wire a first real provider as a new `Payment.tenders[].method` source.
- **Dependencies:** Phase 1 (a gateway payment is still a `Payment`, just populated via webhook instead of a cashier).
- **Risk:** high (new external dependency, new security surface — webhook signature verification, PCI-DSS constraints per the design doc §18).
- **Acceptance criteria:** a gateway-originated payment produces an identical `Payment`/`CashTransaction`/`JournalEntry` shape to a manually-recorded one, with additional idempotency guarantees against webhook retries.
- **Rollback:** disable the specific provider integration; core `Payment` aggregate (Phase 1) is unaffected.
- **Testing strategy:** requires a sandbox/test-mode integration with the chosen provider — genuinely new testing infrastructure this codebase doesn't have a precedent for; flagged as a real, non-trivial addition to scope when this phase is approved, not glossed over here.

Each phase requires its own explicit approval gate before implementation begins, per the standing rule this engagement has followed throughout (`PREPARATION_INVENTORY_ORDER_FLOW_AUDIT.md`, `PAYMENT_LIFECYCLE_AUDIT.md`).

---

## 10. Final Decision

**Recommended Architecture:** Option B (dedicated `Payment`/`Refund` aggregates), with Option A's one-line posting-account correction as a mandatory, separately-shippable Phase 0.

**Rejected Alternatives:**
- **Option A alone** — correct but incomplete; leaves AR with no settlement mechanism.
- **Option C (full Customer sub-ledger)** — not rejected permanently, deferred pending confirmed business need for multi-invoice settlement / house accounts; Option B is structured to feed into it later without being wasted work.

**Reasons:** Option B is the only choice that is simultaneously IFRS-correct, matches this codebase's own proven working precedent (lowest implementation risk), and avoids inventing architectural machinery this platform doesn't already have a template for.

**Risks (carried forward from §8 of the risk analysis in `ENTERPRISE_PAYMENT_ARCHITECTURE_DESIGN.md`, re-affirmed here):** double-charge/double-refund without idempotency (mitigated in Phase 1, not deferred); historical financial statements remain uncorrected unless a brand's accountant manually adjusts (Phase 0 is prospective-only by design, per §8).

**Future Extensions:** Option C (Customer sub-ledger / house accounts) if confirmed needed; external gateway roster beyond the first provider (Phase 4+); Wallet/Gift Card/Store Credit (all confirmed absent, all explicitly out of scope for this ADR).

**Technical Debt Removed by this ADR (once implemented):** P1 (critical misstatement), P2 (duplicate payment-state field), P3-P7 (the entire missing settlement chain), P8 (misleading comments), P9 (dead `paymentMethod[]` array, superseded by real `Payment.tenders[]`), P10 (idempotency gap, closed for the payment domain specifically).

**Technical Debt Remaining (explicitly, not silently):** G8/G9/G10/G11/G12/G13/G15 from `ENTERPRISE_PAYMENT_ARCHITECTURE_DESIGN.md` §7 (Wallet/Gift Card, Tips, Service-charge/tax field split, Split Bill, Order channels, Void/Comp taxonomy, Promotion/Loyalty checkout integration) — all remain out of scope for this ADR, unchanged from the prior design document's own prioritization.

**Open Questions (require a business/product decision, not an engineering one, before Phase 2+ or Option C):**
1. Does this platform need House Account / Corporate Account billing in the near term? (Determines whether Option C should be revisited sooner rather than later.)
2. Is the Order↔Invoice relationship intended to be strictly 1:1, always automatically created? (P11 — currently neither enforced nor automatic; affects whether `Order.paymentStatus`'s removal, recommended in §7, has any UI-convenience cost worth weighing.)
3. Which specific payment provider should Phase 4 target first? (Explicitly deferred as a market/business decision in the prior design document, unchanged here.)

**Status: this ADR is a decision record awaiting approval. No code, schema, or migration has been created or modified in producing it.**
