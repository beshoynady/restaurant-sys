# Expense Reports (Expense) — Engineering Documentation

## 1. Overview

Read-only Expense Analysis over `DailyExpense` (the posting engine built earlier this session) and
`Expense` master data's management-accounting classification fields
(`costBehavior`/`costNature`) — previously read by zero report, despite existing specifically for
this purpose.

## 2. Business Purpose

A controller needs to see spend broken down by expense type, and by the two classic management-
accounting dimensions: fixed vs. variable cost, direct vs. indirect cost — without manually
cross-tabulating raw `DailyExpense` documents.

## 3. Database Design

No new collections. Reads `DailyExpense` (`status: "Posted"`, `paid[]`, `taxAmount`) and `Expense`
(`costBehavior`, `costNature`, `expenseType`).

## 4. Relationships

```
Expense ──(costBehavior, costNature)──→ Expense Analysis's classification breakdown
DailyExpense ──(expense, paid[], taxAmount, status:"Posted")──→ the raw data every total is built from
```

## 5. Business Rules

- **Only `status: "Posted"` documents count** — a `Draft` expense (not yet approved/posted, per
  `daily-expense.service.js`'s own workflow) never appears in this report.
- **`paid[]` is summed correctly across multiple payment lines on one document, without
  double-counting the document itself** — `documentCount` uses `$addToSet` on the document's own
  `_id`, not a raw per-line count.
- **`taxAmount` is summed once per document, not once per payment line.** `taxAmount` is a
  document-level field; naively summing it after `$unwind: "$paid"` would multiply it by however
  many payment lines an expense happens to have — computed via a separate aggregation over the
  un-unwound documents instead. Caught and fixed during this module's own construction (documented
  in the service's own comments, not left as a silent trap for the next person to rediscover).

## 6. Workflow

Read-only; no state machine.

## 7. API Documentation

Base path: `/api/v1/expense/reports`.

| Method | Route | Query params | Report |
|---|---|---|---|
| GET | `/analysis` | `branch?, costCenter?, startDate?, endDate?` | Expense Analysis (by type, cost behavior, cost nature) |
| GET | `/detail` | `branch?, costCenter?, startDate?, endDate?, page?, limit?` | Paginated document-level drill-down |

Both require `authorize("FinancialReports", "read")` + `checkModuleEnabled("financial")`.

## 8. Frontend Guide

`/analysis` returns everything needed for an "Expense Breakdown" chart/table in one call —
`byExpenseType` (sorted highest-spend-first), `byCostBehavior`, `byCostNature`, and the grand total
including tax. `/detail` is the drill-down for "show me the actual documents behind this number."

## 9. Integration

- **`expense/daily-expense`, `expense/expense`**: the sole data sources.

## 10. Security

`authorize("FinancialReports", "read")` + `checkModuleEnabled("financial")`.

## 11. Reporting

This module is itself the Expense Analysis Management Report.

## 12. Future Extensions

- **Budget vs. Actual** for expenses — needs a `Budget` model (not built anywhere in this platform
  yet) to compare against; this report only shows actuals.
- **Trend over time** (month-over-month) — currently one flat total per the requested window; a
  time-series breakdown would need a `$group` by month added to the same aggregation.

## 13. Architecture Decisions

- No new architecture decisions beyond the `$unwind`/tax-summation fix documented in §5 — this
  module otherwise follows the exact pattern established by `finance/finance-reports` (thin
  controller, aggregation-based service, brand always from `req.user`).

## 14. Developer Notes

- Test file: `tests/integration/expense-reports.test.ts` — covers the multi-payment-line
  non-double-counting, the tax-summation fix, cost-behavior/cost-nature classification, and Draft
  exclusion. Note its explicit side-effect import of `cost-center.model.js` — needed only because
  this specific test file, run in isolation, has nothing else that would register that model before
  `.populate("costCenter")` runs (the real app always has it registered via its own mounted router
  at boot).
