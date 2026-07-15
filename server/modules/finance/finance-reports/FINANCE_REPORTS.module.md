# Finance Reports (Finance) — Engineering Documentation

## 1. Overview

Read-only Management Reports over data three business engines already produce this session:
`CashTransaction` (Cash Register / Bank Account reports) and `CashierShift` (Cashier Shift Report).
No new business logic — every figure in this module is either a direct read of an already-computed
field (`CashRegister.balance`, `CashierShift.variance`) or a straightforward aggregation of already-
posted transactions.

## 2. Business Purpose

A finance manager needs to answer, per register or bank account: "how much moved through this, and
what's the current balance?" — and per cashier shift: "which shifts had a shortage/overage, and how
much in total?" without manually cross-referencing raw transaction lists.

## 3. Database Design

No new collections. Reads `CashRegister`/`BankAccount` (for the cached `balance` and identity),
`CashTransaction` (for the movement breakdown), `CashierShift` (for the already-computed variance).

## 4. Relationships

```
CashRegister/BankAccount ──(balance)──→ Cash Register / Bank Account Report's "currentBalance"
CashTransaction ──(cashRegister XOR bankAccount, transactionType, direction, status:"POSTED")──→ movement breakdown
CashierShift ──(variance.amount, variance.reason)──→ Cashier Shift Report's summary totals
```

## 5. Business Rules

- **Only `status: "POSTED"` `CashTransaction` rows count** toward any report in this module — a
  `DRAFT` or `CANCELLED` transaction never appears, matching every other report in this platform's
  "only posted/committed activity is part of the books" convention.
- **The "current balance" shown is always the register/bank's own cached field**, never
  re-derived — that field is locked (`lockedUpdateFields: ["balance"]`) and maintained exclusively
  by the posting engines that touch it (`daily-expense.service.js`, future Sales/Purchasing payment
  paths), so this report and the engines that update the balance can never silently disagree.
- **Aggregation `$match` stages use real `ObjectId` instances, not raw strings** — the exact bug
  class already found and fixed twice in `ledger.service.js` this session, applied proactively here
  before it could recur a third time.
- **Cashier Shift Report's summary sums `variance.amount` by `variance.reason`**, never
  re-derives shortage/overage from `expected`/`actualCash` — that computation already happened once,
  correctly, in `cashier-shift.service.js#countShift`; this report only reads the result.

## 6. Workflow

Read-only; no state machine.

## 7. API Documentation

Base path: `/api/v1/finance/reports`.

| Method | Route | Query params | Report |
|---|---|---|---|
| GET | `/cash-registers` | `branch?, registerId?, startDate?, endDate?` | Cash Register Report (summary, all registers or one) |
| GET | `/cash-registers/:registerId/transactions` | `branch?, startDate?, endDate?, page?, limit?` | Cash Register detail drill-down |
| GET | `/bank-accounts` | `branch?, bankAccountId?, startDate?, endDate?` | Bank Account Report |
| GET | `/cashier-shifts` | `branch?, cashier?, register?, status?, startDate?, endDate?, page?, limit?` | Cashier Shift Report |

All require `authorize("FinancialReports", "read")` + `checkModuleEnabled("financial")`.

## 8. Frontend Guide

The summary endpoints (`/cash-registers`, `/bank-accounts`) return every register/account matching
the filter at once with its own totals — suitable for a treasury overview screen. The detail
endpoint (`/cash-registers/:registerId/transactions`) is the drill-down when a user clicks into one
register. `/cashier-shifts` returns both a paginated list and a `summary` block in the same
response — a shift-history screen can render both from one call.

## 9. Integration

- **`finance/cash-register`, `finance/bank-account`, `finance/cash-transaction`,
  `finance/cashier-shift`**: the sole data sources — no writes, no new fields added to any of them.

## 10. Security

`authorize("FinancialReports", "read")` + `checkModuleEnabled("financial")` on every route.

## 11. Reporting

This module is itself Management Reports for Finance — see `accounting/financial-statements` for
the accounting-standard statements, `expense/expense-reports` and `assets/asset-reports` (in
progress) for the remaining Management Reports.

## 12. Future Extensions

- **Bank reconciliation** (matching `CashTransaction` rows against an imported bank statement) is a
  distinct, larger capability, not built here — this report shows the system's own record only.
- **A combined "Treasury" view** across cash + bank in one response — currently two separate calls;
  a future Executive/Treasury Dashboard (planned later this session) will likely combine both.

## 13. Architecture Decisions

- **Cash Register Report and Bank Account Report are near-identical (same shape, different source
  field: `cashRegister` vs. `bankAccount`)** — kept as two methods rather than one parameterized
  method, matching this platform's existing style of accepting small, readable duplication over a
  premature generic abstraction for two call sites (the same judgment call already made for
  `buildSalesInvoiceLines`/`buildPurchaseInvoiceLines`).

## 14. Developer Notes

- Test file: `tests/integration/finance-reports.test.ts` — covers correct aggregation by type/
  direction, DRAFT-transaction exclusion, and the Cashier Shift Report's shortage/overage summary
  math against real `CashierShift` documents.
