# Executive Dashboard (Accounting) — Engineering Documentation

## 1. Overview

Branch Financial Summary, Treasury Dashboard, Executive Financial Dashboard, and Financial KPIs —
the final report group of this session's Financial Reporting phase. **Pure composition**: every
figure in this module is produced by calling an already-built, already-tested report service
(`financial-statements`, `finance-reports`, `expense-reports`, `asset-reports`) and combining the
results. No aggregation pipeline in this module duplicates logic that exists elsewhere.

**Building this module's Branch Financial Summary surfaced and fixed a real bug in
`accounting/financial-statements`** — it was the first caller to request a per-branch statement.
See `FINANCIAL_REPORTS.module.md` §5 for the full correction (`Account.branch` was being treated
as a chart-of-accounts partition instead of an optional override).

## 2. Business Purpose

An owner/executive needs one-call answers to: "how is each branch doing?" (Branch Financial
Summary), "how much liquid cash do we have right now?" (Treasury Dashboard), "give me the whole
picture" (Executive Dashboard — P&L + Balance Sheet + Treasury + top expenses + fixed assets in one
response), and "what are our headline numbers?" (Financial KPIs) — without stitching together five
separate API calls and computing anything client-side.

## 3. Database Design

No new collections, no direct aggregation in this module beyond a `Branch`/`CashRegister`/
`BankAccount` list-and-sum for Treasury (the one report with no existing single-purpose service to
call — everything else composes from `financial-statements`/`finance-reports`/`expense-reports`/
`asset-reports`).

## 4. Relationships

```
Branch ──(one Income Statement per branch)──→ Branch Financial Summary
CashRegister + BankAccount ──(balance)──→ Treasury Dashboard's liquid position
financialStatementsService + financeReportsService(via Treasury) + expenseReportsService + assetReportsService
    ──(composed)──→ Executive Dashboard
financialStatementsService + Treasury ──(composed)──→ Financial KPIs
```

## 5. Business Rules

- **Every figure is sourced from an existing report method — nothing is recomputed in this file.**
  `getExecutiveDashboard`'s `profitAndLoss.netIncome`, for example, is literally
  `financialStatementsService.getIncomeStatement(...)`'s own `netIncome`, not a parallel
  computation — proven by this module's own test asserting the two values are `===` equal across
  two independent calls.
- **Financial KPIs deliberately omits metrics this platform cannot honestly compute today** — e.g.
  a proper Current Ratio needs consistent `Account.reportGroup` classification
  (`CURRENT_ASSET`/`CURRENT_LIABILITY` vs. long-term), which isn't guaranteed populated across a
  brand's chart of accounts. Returning a plausible-looking but potentially-wrong ratio would be
  worse than not returning one at all.
- **Branch Financial Summary and Executive/KPI Dashboards require an explicit date range** — same
  reasoning as `Income Statement`/`Cash Flow Statement`: these are period totals, not snapshots.
  Treasury Dashboard is the one exception (a live balance snapshot, no date range needed).

## 6. Workflow

Read-only; no state machine.

## 7. API Documentation

Base path: `/api/v1/accounting/executive-dashboard`.

| Method | Route | Query params | Report |
|---|---|---|---|
| GET | `/branch-financial-summary` | `startDate, endDate` | One Income Statement per branch + brand totals |
| GET | `/treasury` | `branch?` | Cash/bank balances and liquid position |
| GET | `/executive-summary` | `branch?, startDate, endDate` | P&L + Balance Sheet + Treasury + top expenses + fixed assets |
| GET | `/kpis` | `branch?, startDate, endDate` | Net margin, average daily revenue, liquid position |

All require `authorize("FinancialReports", "read")` + `checkModuleEnabled("accounting")`.

## 8. Frontend Guide

`/executive-summary` is designed to back a single dashboard screen — every card (P&L, Balance
Sheet, Treasury, Top Expenses, Fixed Assets) maps to one field in the response, no client-side
merging of separate calls needed. `/branch-financial-summary`'s `branches[]` is pre-sorted by
`netIncome` descending — a "branch leaderboard" table can render it directly. `/kpis` returns a
small, stable set of named fields suitable for a KPI strip/scorecard component.

## 9. Integration

- **`accounting/financial-statements`**: Income Statement, Balance Sheet (via
  `financialStatementsService`).
- **`finance/cash-register`, `finance/bank-account`**: Treasury's own direct reads.
- **`expense/expense-reports`**: top expense categories in the Executive Dashboard.
- **`assets/asset-reports`**: fixed-asset totals in the Executive Dashboard.
- **`organization/branch`**: the branch list for Branch Financial Summary.

## 10. Security

`authorize("FinancialReports", "read")` + `checkModuleEnabled("accounting")` on every route.

## 11. Reporting

This module is itself the Executive/Treasury Dashboards and Financial KPIs — the final report group
in this session's Financial Reporting phase (Priority 3 of the phase's own stated order: Financial
Reports → Management Reports → Executive Dashboards).

## 12. Future Extensions

- **Trend charts** (revenue/expense over multiple periods, not just one window) — every underlying
  service already supports arbitrary date ranges; a trend endpoint would just call them repeatedly
  across a series of windows. Not built here to keep this module's own scope bounded.
- **Configurable KPI targets** (e.g. "alert if net margin drops below X%") — would need a new
  settings model; out of scope for a read-only reporting pass.
- **Current Ratio / Quick Ratio** once `Account.reportGroup` is consistently populated across every
  brand's chart of accounts — see §5 for why it's deliberately omitted today.

## 13. Architecture Decisions

- **This module was built last, deliberately** — every other report service needed to exist first
  for this one to be pure composition rather than yet another set of duplicated aggregations. This
  ordering is also what caught the `Account.branch` bug: composition exercises code paths (a
  per-branch statement) that no single-report test had exercised in isolation.
- **Treasury Dashboard has its own direct `CashRegister`/`BankAccount` read** rather than composing
  from `finance/finance-reports`, because `finance-reports`' Cash Register/Bank Account reports are
  per-account transaction breakdowns (a different, heavier query) — Treasury only needs the current
  balances, a lighter, more appropriate primitive for a dashboard that may be polled frequently.

## 14. Developer Notes

- Test file: `tests/integration/executive-dashboard.test.ts` — two branches, real journal postings
  per branch, and assertions that (a) the branch breakdown and brand totals are arithmetically
  correct and (b) the Executive Dashboard's composed P&L exactly matches a directly-computed Income
  Statement, proving the composition doesn't silently diverge from its own source of truth.
