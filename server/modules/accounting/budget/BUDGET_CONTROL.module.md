# Budget / Budget Line (Accounting) — Engineering Documentation

## 1. Overview

`accounting/budget` (header, approval workflow, versioning) + `accounting/budget-line` (per-account
monthly figures) implement operating-budget planning and Budget-vs-Actual reporting — a new domain
with no prior partial implementation, built from scratch this pass following the same split, the same
Repository Pattern (BACKEND_FOUNDATION.md §4.3), and the same "approving is a real state transition,
not a field edit" conventions already established by `journal-entry`/`journal-line` and
`asset-depreciation` in this codebase.

## 2. Business Purpose

A restaurant plans expected revenue and expense per GL account for a fiscal year, submits that plan
for manager approval, and then continuously compares actual GL activity against it — both "how much
of this year's budget have we used so far" (consumption) and "are we over or under plan" (variance).
Plans are revised over a year (a "budget version") without losing the history of what was originally
approved.

## 3. Database Design

`Budget`: `brand`, `branch` (null = brand-wide), `costCenter` (null = not cost-center-scoped),
`fiscalYear`, `name`, `status` (`Draft`/`PendingApproval`/`Approved`/`Rejected`/`Closed`), `version`,
`previousVersion` (self-ref), `isCurrentVersion`, `totalAnnualAmount` (derived cache),
`submittedBy`/`submittedAt`, `approvedBy`/`approvedAt`, `rejectedBy`/`rejectedAt`/`rejectionReason`.
Unique on `{brand, branch, costCenter, fiscalYear, version}`.

`BudgetLine`: `budget`, `brand`, `branch`, `account`, `monthlyAmounts` (exactly 12 non-negative
numbers, January index 0 through December index 11), `annualAmount` (derived cache =
`sum(monthlyAmounts)`). Unique on `{budget, account}` — one line per account per budget.

## 4. Relationships

```
Account (Revenue/Expense only) ──(budgeted figures)──→ BudgetLine ──(belongs to)──→ Budget
CostCenter ──(optional scope)──→ Budget
Budget.previousVersion ──(self-referential chain)──→ prior Budget versions
BudgetLine.account ──(actual activity lookup)──→ JournalLine (read-only, for Budget vs Actual)
```

## 5. Business Rules

- **Budgets are scoped to Revenue/Expense accounts only** (`BUDGETABLE_CATEGORIES`) — this is an
  operating (P&L) budget, not a capex/balance-sheet plan; `createBudget()`/`updateBudgetLines()` both
  reject an Asset/Liability/Equity account with a clear error, checked against each line's account
  before any write.
- **A budget's header and its lines are created atomically** (`this.withTransaction`, mirroring
  `journalEntryService.createBalancedEntry`'s transactional pattern) — either the whole budget exists
  with every line, or none of it does.
- **`totalAnnualAmount`/`annualAmount` are always server-computed from `monthlyAmounts`**, never
  trusted from client input — recomputed on every create/update, matching every other derived-field
  convention in this domain (`Asset.bookValue`, `AssetDisposal.gainLoss`).
- **Lines can only be edited while the budget is `Draft`** (`updateBudgetLines()` checks parent status
  first) — a submitted/approved budget's figures are corrected via `createNewVersion()`, never edited
  in place, matching this platform's "posted financial documents are corrected via reversal, never in
  place" convention extended to the pre-approval workflow state.
- **Approval workflow**: `Draft → PendingApproval → Approved` or `→ Rejected`, each an atomic-claim
  transition (`transitionStatus` only matches the expected `fromStatus`) — the same TOCTOU-safe
  pattern used by every other terminal transition in this platform.
- **`isCurrentVersion` only ever moves on `approveBudget()`**, never on creation — a new version
  (`createNewVersion()`) starts life as a non-current `Draft`; approving it atomically demotes
  whichever budget previously held `isCurrentVersion:true` for the same `{brand, branch, costCenter,
  fiscalYear}` scope and promotes the new one, inside one transaction. "The current budget" therefore
  always means "the last **Approved** version," never a Draft-in-progress or a stale one superseded by
  a newer approval.
- **`createNewVersion()` is illegal from `Draft`** — a Draft is already editable in place via
  `updateBudgetLines()`; cloning it would just create a duplicate to discard.
- **Every workflow/derived field is locked against the generic `PUT`** (`status`, `version`,
  `previousVersion`, `isCurrentVersion`, `totalAnnualAmount`, and every approval-audit field) — the
  same "generic PUT bypasses business rules" defect class fixed repeatedly elsewhere in this domain
  (`Order`, `Invoice`, `CashierShift`, `DailyExpense`, `Asset`). Lines are similarly locked
  (`budget`/`brand`/`branch`/`account` on `BudgetLine`) since editing a line outside
  `updateBudgetLines()` would silently desync the parent's cached `totalAnnualAmount`.

## 6. Workflow

```
createBudget(lines) ──→ Draft ──updateBudgetLines()──→ Draft (editable, repeatedly)
Draft ──submitForApproval()──→ PendingApproval ──approveBudget()──→ Approved (isCurrentVersion:true)
                                                ──rejectBudget()──→ Rejected (terminal)
Approved/Rejected ──createNewVersion()──→ Draft (version+1) ──submit/approve──→ Approved (isCurrentVersion moves here)
```

## 7. API Documentation

Base path: `/api/v1/accounting/budgets`.

| Method | Route | Body / Query | Notes |
|---|---|---|---|
| POST | `/` | `{ branch?, costCenter?, fiscalYear, name, notes?, lines: [{account, monthlyAmounts[12]}] }` | Creates Draft |
| PUT | `/:id/lines` | `{ lines: [...] }` | Draft only |
| POST | `/:id/submit` | — | Draft → PendingApproval |
| POST | `/:id/approve` | — | PendingApproval → Approved |
| POST | `/:id/reject` | `{ reason? }` | PendingApproval → Rejected |
| POST | `/:id/new-version` | — | Clones into a new Draft |
| GET | `/:id/vs-actual` | `?upToMonth=1..12` (default 12) | Budget vs Actual / consumption report |
| GET | `/summary` | `?fiscalYear=&branch=&upToMonth=` | All current-version Approved budgets for the scope, aggregated (see §11) |
| GET | `/` | — | List, standard pagination/filtering |
| GET | `/:id` | — | Single record |

`/summary` is registered before `/:id` in the router specifically so Express never captures the
literal path segment `"summary"` as an `:id` parameter — the same ordering requirement every
`/:id`-shaped router in this codebase has to respect for any static sibling route.

No generic `POST /` line-array editing outside `PUT /:id/lines`, and no `DELETE` — a budget's history
is retained via versioning, not deletion.

## 8. Frontend Guide

A budget-planning screen lists accounts (filtered to Revenue/Expense) with a 12-month grid per
account; `POST /` on first save, `PUT /:id/lines` on every subsequent edit while Draft. A "Submit for
Approval" action calls `POST /:id/submit`; a manager's approval queue calls `POST /:id/approve` or
`POST /:id/reject`. A Budget vs Actual dashboard calls `GET /:id/vs-actual?upToMonth=<currentMonth>`
and renders `budgetedToDate`/`actual`/`variance`/`consumptionPercent` per account — `consumptionPercent`
is `null` when `budgetedToDate` is `0` (avoiding a divide-by-zero, not a bug). "Revise this year's
plan" calls `POST /:id/new-version` on the current Approved budget, then edits/submits/approves the
resulting Draft through the same flow.

## 9. Integration

- **`accounting/account`**: the budgetable dimension — every line references one Account, validated
  to be `Revenue`/`Expense` at write time.
- **`accounting/cost-center`**: optional scope on `Budget` — not yet read anywhere else in this
  domain (no engine posts a `costCenter`-aware GL entry that this budget's consumption report could
  filter by beyond what's already on `JournalLine.costCenter`); `getBudgetVsActual()` does not
  currently filter actuals by `costCenter` even when the budget has one set (see §12).
- **`accounting/journal-line`**: read-only source of "actual" figures for `getBudgetVsActual()` — no
  write path in either direction; a budget never posts to the GL itself.

## 10. Security

`authorize("Budgets", action)` + `checkModuleEnabled("accounting")`. `"Budgets"` added to
`RESOURCE_ENUM` in `modules/iam/role/role.model.js` (additive only). Approve/reject use a distinct
`"approve"` action (matching `CashierShifts`' existing maker-checker convention) so approval rights
can be granted separately from create/update rights.

## 11. Reporting

`getBudgetVsActual()` is the per-budget report; `getCurrentBudgetsSummary()` is the roll-up —
every current-version `Approved` budget for a `{brand, branch?, fiscalYear}` scope, each reduced via
`getBudgetVsActual()` to one `{budgetedToDate, actual, variance, consumptionPercent}` row, plus a
`grandTotals` row summing across all of them. Exposed at `GET /accounting/budgets/summary`, and
composed directly into `executive-dashboard.service.js#getExecutiveDashboard()`'s `budgetOverview`
field (fiscal year and month derived from the dashboard's own `endDate`) — the same "compose the
existing service, don't duplicate its aggregation logic" convention `executive-dashboard.service.js`
already follows for every other section of that dashboard (Income Statement, Treasury, Expense
Analysis, Asset Book Value). A brand with no `Approved` current-year budget yet gets an empty
overview (`budgetCount: 0`, `budgetedToDate/actual: 0`, `consumptionPercent: null`), not a failed
dashboard call.

## 12. Future Extensions

- **`costCenter` is not yet applied as an actual-activity filter** in `getBudgetVsActual()` — a
  cost-center-scoped budget's "actual" currently aggregates every `JournalLine` for the account across
  the whole brand/branch, not just lines tagged with that `costCenter`. Real, called out rather than
  silently left inconsistent with the field's own presence on the schema — closing it is a single
  added `$match` clause (`costCenter: budget.costCenter` when set) once cost-center-tagged posting is
  verified consistent across every engine that writes `JournalLine.costCenter` today.
- **No brand-wide "all current budgets" Budget-vs-Actual rollup** — `getBudgetVsActual()` is
  per-budget; a dashboard showing every cost center's consumption side-by-side would need a new
  aggregating method, not built here.
- **No notification on submit/approve/reject** — this platform has no background-job/notification
  infrastructure at all (confirmed absent in the earlier platform-wide review), consistent with the
  same gap already noted on `AssetDepreciation`'s scheduler.
- **Capex/balance-sheet budgeting** — explicitly out of scope (see §5's first bullet); a distinct unit
  of work if ever needed.

## 13. Architecture Decisions

- **Repository Pattern** (`budget.repository.js`/`budget-line.repository.js` extended by
  `budget.service.js`) was chosen over the simpler `AdvancedService`-only style (used by
  `account`/`cost-center`) specifically because this module needs multi-document transactional writes
  (`createBudget`, `updateBudgetLines`, `approveBudget`, `createNewVersion` all touch both collections
  atomically) — the same reasoning `journal-entry`/`journal-line` already established for exactly this
  tradeoff.
- **`monthlyAmounts` is a single 12-element array, not two schemas for "annual" vs. "monthly"
  budgets** — an annual-only budget is just a monthly budget with the total entered evenly (or
  entirely in one month); the same array serves both `annualAmount` (sum) and `budgetedToDate`
  (partial sum) without duplicating the storage model, matching the brief's "Annual Budgets, Monthly
  Budgets" as two views of one figure rather than two collections.
- **`isCurrentVersion` moves only on approval, not on version creation** — deliberately avoids the
  alternative design (flip immediately, treat a Draft-in-progress as "current") because that would
  make "the current budget" a moving, possibly-unapproved target mid-revision; a consumption report
  run while a revision is being drafted should still compare against the last thing a manager actually
  approved.
- **Actual-vs-budget sign resolution reads `Account.normalBalance`**, not `Account.category` directly
  — matches this domain's existing convention (`financial-statements.service.js`) for turning raw
  debit/credit sums into a "which way is up" figure per account type.

## 14. Developer Notes

- Test file: `tests/integration/budget-control-engine.test.ts` — covers the Revenue/Expense-only
  validation, atomic header+line creation with correct annual/total computation, Draft-only line
  editing (and its rejection once submitted), the full submit/approve/reject transition set (including
  illegal-transition rejection), version cloning plus the atomic `isCurrentVersion` handoff on
  approval, `getBudgetVsActual()`'s signed-actual computation and `upToMonth` windowing,
  `getCurrentBudgetsSummary()`'s Approved+isCurrentVersion-only filtering and grand-total aggregation,
  and the `lockedUpdateFields` lockdown on `Budget`. `tests/integration/executive-dashboard.test.ts`
  (pre-existing, unmodified) continues to pass unchanged with `budgetOverview` added to the response —
  confirming the dashboard composition is additive and doesn't alter any figure that test already
  asserts on.
- `createBalancedEntry()` callers must pass an explicit `sourceType` on every line — omitting it
  (relying on the schema's `default: null`) throws a Mongoose enum-validation error on write
  (`` `null` is not a valid enum value for path `sourceType` ``), discovered while writing this
  module's Budget-vs-Actual test fixtures. Every production caller already supplies `sourceType`
  (via `postFromSource`'s required parameter), so this has never affected a real code path — flagged
  here as a trap for any future direct `createBalancedEntry()` caller, not fixed in this pass since it
  is out of scope for Budget Control.
