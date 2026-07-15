# Financial Reports — Ledger, Trial Balance, Journal Report, Financial Statements

## 1. Overview

Two collaborating modules, documented together since they share one engine
(`accounting/ledger`'s `ledgerService`) and one purpose: read-only reporting over the postings
every business engine in this platform already produces (`Order`/`Invoice`/`PurchaseInvoice`/
`CashierShift`/`DailyExpense`/`AssetDepreciation`/...). **No new business logic. No writes.**

- `accounting/ledger` — General Ledger (per-account, paginated, running balance), Trial Balance,
  Journal Report.
- `accounting/financial-statements` — Balance Sheet, Income Statement, Cash Flow Statement.

**Before this pass, `accounting/ledger` had a live cross-tenant security vulnerability**: every
method trusted `brand`/`branch` directly from the query string. Any authenticated user could read
another brand's entire general ledger or trial balance by passing a different `?brand=` value.
Fixed as the first, non-negotiable step of this pass — see §5.

## 2. Business Purpose

An accountant/controller needs to see the books: what happened in one account over time (General
Ledger), whether the whole chart of accounts balances (Trial Balance), a chronological audit trail
of every posting (Journal Report), and the three standard financial statements (Balance Sheet,
Income Statement, Cash Flow) — all without the frontend ever computing an accounting figure itself.

## 3. Database Design

No new collections. Reads `JournalLine` (the posting-level source of truth), `JournalEntry`
(header/status), and `Account` (chart of accounts, `category`/`normalBalance`/`reportGroup`) —
`CashFlowStatement` additionally reads `CashTransaction` directly (see §5).

## 4. Relationships

```
Account ──(category: Asset/Liability/Equity/Revenue/Expense)──→ Balance Sheet / Income Statement grouping
Account ──(normalBalance: Debit/Credit)──→ sign convention for every balance computed in this module
JournalLine ──(account, brand, branch, period, date)──→ every report's raw data
JournalEntry ──(status: "Posted")──→ the only status any report counts — Pending/Rejected never appear
CashTransaction ──(transactionType, direction)──→ Cash Flow Statement's Direct Method categorization
```

## 5. Business Rules

- **`Account.branch` is an OPTIONAL branch-specific override, not a partition of the whole chart of
  accounts.** A real bug, found while building `accounting/executive-dashboard`'s Branch Financial
  Summary (which is the first caller to request a per-branch Balance Sheet/Income Statement):
  `getBalanceSheet`/`getIncomeStatement` originally filtered `Account.find({branch})` to ONLY that
  branch's accounts when a branch was requested — returning **zero accounts, and therefore a
  silently-empty report,** for any brand using a normal, brand-wide chart of accounts (i.e. almost
  every brand, since branch-specific override accounts are the exception, not the rule). Fixed via
  `_accountFilter()`: always include brand-wide (`branch: null`) accounts, plus any accounts
  specific to the requested branch if one was given. Branch-scoping of the actual financial
  ACTIVITY (which postings count) is a separate, already-correct concern handled via
  `JournalLine.branch`, not `Account.branch` — the two fields answer different questions and must
  never be conflated.
- **`brand` is always derived from `req.user.brandId` at the controller layer, never from the query
  string.** `ledgerService`/`financialStatementsService` have no knowledge of `req` at all, by
  design — they take `brand`/`branch` as explicit parameters, so the controller is the one place
  this rule can be enforced or violated, and it's enforced.
- **Only `JournalEntry.status: "Posted"` lines ever appear in a report.** A Pending or Rejected
  entry is invisible to every report in this module, matching GAAP practice (unposted activity
  isn't part of the books yet).
- **Mongoose's `aggregate()` does not auto-cast query values** (unlike `find()`) — every aggregation
  match explicitly converts `brand`/`branch`/`account` to real `ObjectId` instances. A prior version
  of this fix (caught by this module's own integration test, not by inspection) passed a raw string
  `brand` into one aggregation path, which would have silently matched zero documents.
- **General Ledger pagination computes a correct opening balance for every page** — "the sum of
  every matching line before this page's window," not "everything before an explicit `startDate`."
  An earlier version only handled the `startDate`-provided case, silently resetting the running
  balance to 0 on page 2+ of a plain (no date filter) request — caught by this module's own test.
- **Trial Balance and the two statements use ONE shared aggregation** (`ledgerService.sumPostedLinesGroupedByAccount`,
  a single query per report instead of one per account) — the N+1 pattern the pre-existing
  implementation had (confirmed in this platform's own earlier architecture review) is fixed here.
- **Balance Sheet computes a "Current Period Earnings (unclosed)" line, folded into Equity.** This
  platform has no period-closing mechanism (no journal entry ever moves Revenue/Expense into
  Retained Earnings) — without this computed line, any balance sheet taken mid-period would never
  balance, since unclosed net income/loss would sit in Assets/Liabilities with nothing offsetting
  it in Equity. This is standard interim-reporting practice, not a workaround unique to this
  codebase.
- **Cash Flow Statement excludes `TRANSFER` entirely.** A transfer between two of the business's own
  cash/bank accounts nets to zero for the business as a whole and must never appear as an inflow or
  outflow.
- **Cash Flow Statement has an honestly-disclosed gap**: no `CashTransaction.transactionType`
  currently maps to Investing activities (asset purchases settle through Purchasing/
  `SupplierTransaction`, never a `CashTransaction` row) — surfaced as a distinct `unclassifiedActivities`
  section with an explicit `note`, not silently folded into Operating.
- **Income Statement and Cash Flow Statement require both `startDate` and `endDate`** — they are
  period totals, not point-in-time snapshots, unlike the Balance Sheet (`asOfDate` only).

## 6. Workflow

All read-only; there is no workflow/state machine in this module. Each report is computed fresh on
every request from live `JournalLine`/`CashTransaction` data — nothing is cached or pre-aggregated.

## 7. API Documentation

Base paths: `/api/v1/accounting/ledgers`, `/api/v1/accounting/financial-statements`.

| Method | Route | Query params | Report |
|---|---|---|---|
| GET | `/accounting/ledgers/account/:accountId` | `branch?, startDate?, endDate?, page?, limit?` | General Ledger |
| GET | `/accounting/ledgers/trial-balance` | `branch?, startDate?, endDate?` | Trial Balance |
| GET | `/accounting/ledgers/journal-report` | `branch?, startDate?, endDate?, sourceType?, page?, limit?` | Journal Report |
| GET | `/accounting/financial-statements/balance-sheet` | `branch?, asOfDate?` | Balance Sheet |
| GET | `/accounting/financial-statements/income-statement` | `branch?, startDate, endDate` | Income Statement |
| GET | `/accounting/financial-statements/cash-flow-statement` | `branch?, startDate, endDate` | Cash Flow Statement |

All require `authorize("Ledgers"|"FinancialReports", "read")` + `checkModuleEnabled("accounting")`.

## 8. Frontend Guide

Every report returns fully-computed, ready-to-render numbers — the frontend should never re-derive
a balance, a sign, or a total from raw lines. Pagination (`page`/`limit`, default 50 for the ledger,
25 for the journal report, capped at 200/100 respectively) follows this platform's standard
`{data, pagination: {page, limit, total, totalPages}}` shape. Date filters accept any
`Date`-parseable string (ISO 8601 recommended). `branch` is optional everywhere — omit it for a
brand-wide report, or supply one of the user's own branches to narrow it (never another brand's
branch — the brand match is enforced server-side regardless of what `branch` is passed).

## 9. Integration

- **Every posting engine built or hardened this session** (`recipe-consumption`, `purchase-invoice`,
  `purchase-return`, `cashier-shift`, `daily-expense`, `asset-depreciation`) feeds these reports
  automatically — no report-specific integration code was needed for any of them, proving the
  "reuse the existing engines" mandate: this module reads `JournalLine`/`CashTransaction`, which
  every engine already writes to correctly.
- **`accounting/accounting-period`**: not currently filtered on directly (reports use `date` ranges,
  not `period` references) — a future refinement could accept a `periodId` instead of raw dates.

## 10. Security

`authorize()` + `checkModuleEnabled("accounting")` on every route — already correctly wired before
this pass. The cross-tenant read described in §1/§5 was the real, severe issue; fixed by removing
`req.query.brand`/`branch` as a trust source entirely, not by adding a check on top of it (removing
the vulnerable input path is safer than validating it).

## 11. Reporting

This module *is* the reporting layer for these six reports — nothing further needed for them
specifically. See the sibling Management Reports / Executive Dashboard modules (in progress, same
session) for Cash Register/Cashier Shift/Bank/Expense/Asset/Branch-level reports.

## 12. Future Extensions

- **Export-ready structure** (CSV/PDF generation) is not built — every report returns clean JSON
  that a frontend or a future export service can transform; no report computes anything in a
  format-specific way that would block this.
- **A formal period-closing journal entry** (Revenue/Expense → Retained Earnings) would let the
  Balance Sheet's "Current Period Earnings" line become a real, posted `Equity` balance instead of
  a computed one — the computed version will keep working correctly even after that's built (it
  would simply always compute to 0 for any fully-closed period, since the real balance would move
  into an actual Equity account).
- **Investing-activities cash-flow classification** — needs `CashTransaction` (or a new document)
  to actually tag asset-purchase cash movements; not built, honestly disclosed instead.
- **A `periodId`-based filter** instead of raw date ranges, once reports commonly need to align to
  formal accounting periods rather than arbitrary date windows.

## 13. Architecture Decisions

- **`ledgerService.sumPostedLinesGroupedByAccount` was promoted from a private (`_`-prefixed)
  helper to a public method** specifically so `financial-statements.service.js` could reuse it
  instead of duplicating the same aggregation — direct execution of this platform's "reuse the
  existing repositories/services, don't duplicate business logic" mandate for this session's
  reporting phase.
- **Rewrote `ledger.controller.js`/`ledger.router.js` and introduced a new `ledger.service.js`**
  rather than patching the old controller in place — the old file mixed HTTP concerns, business
  computation, and N+1 queries in one place with no separation; the new split (thin controller,
  real service, aggregation-based) matches every other module built this session.
- **Removed `getLedgerMultiAccount`** (a near-duplicate of Trial Balance with less information) in
  favor of the new Journal Report endpoint, which covers a genuinely different reporting need
  (chronological entries, not per-account summaries) that didn't exist before.
- **Cash Flow Statement reads `CashTransaction` directly, not `JournalLine`.** A GL-based cash flow
  statement (the "indirect method," starting from net income and adjusting for non-cash items and
  working-capital changes) is the alternative — deliberately not chosen here because
  `CashTransaction` already exists specifically as "the single source of truth for ALL money
  transactions" with a `direction`/`transactionType` classification tailor-made for the Direct
  Method, and the indirect method requires balance-sheet-change tracking this platform doesn't
  build. Explicitly a design choice, not an oversight.

## 14. Developer Notes

- Test files: `tests/integration/financial-reports-ledger.test.ts` (tenant isolation with
  identically-coded accounts across two brands, pagination correctness, Trial Balance, Journal
  Report filtering) and `tests/integration/financial-statements.test.ts` (Balance Sheet/Income
  Statement internal consistency, the no-date-range rejection, Cash Flow categorization).
- If you're adding a new report to either module: reuse `ledgerService.sumPostedLinesGroupedByAccount`
  for anything that's "sum JournalLine by account over a date range" — do not write a fourth copy
  of that aggregation.
