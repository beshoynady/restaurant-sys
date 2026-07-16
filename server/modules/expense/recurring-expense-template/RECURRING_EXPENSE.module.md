# Recurring Expense Template (Expense) — Engineering Documentation

## 1. Overview

`expense/recurring-expense-template` schedules an expense that repeats (rent, utilities,
subscriptions, loan installments) and generates real `DailyExpense` occurrences from that schedule.
It deliberately does not duplicate `DailyExpense`'s posting engine — every generated occurrence is a
real `DailyExpense` document, created through `dailyExpenseService.create()`, so the entire existing
GL-posting/balance-decrement machinery (`daily-expense.service.js#_postExpenseAccounting`) applies to
recurring-generated expenses exactly as it already does to manually-entered ones.

## 2. Business Purpose

A restaurant has expenses that recur on a predictable schedule — branch rent due the 1st of every
month, a quarterly insurance premium, a loan installment every 15 days. Recording each occurrence by
hand is repetitive and error-prone (wrong amount, wrong account, forgotten entirely). A template
captures the recurring shape once (amount, account, settlement method, frequency) and a scheduling
engine produces each period's `DailyExpense` automatically — either posting it immediately or, for
expenses whose amount should be double-checked each period (a metered utility bill, say), routing it
through an approval step first.

## 3. Database Design

`RecurringExpenseTemplate`: `brand`, `branch`, `name`, `expense` (the `Expense` type/category),
`expenseDescription`, `costCenter`, `taxAmount`, `frequency`
(`Daily`/`Weekly`/`Monthly`/`Quarterly`/`Yearly`/`Custom`), `customIntervalDays` (required only when
`frequency: "Custom"`), `startDate`, `endDate` (null = open-ended), `nextRunDate` (scheduling engine
state), `lastGeneratedDate`, `paymentTemplate` (array of `{paymentMethod, amount, cashRegister XOR
bankAccount, paidBy}` — the pre-configured settlement split reused by every generation),
`requireApproval`, `status` (`Active`/`Paused`/`Cancelled`).

`DailyExpense` (extended, additively): `status` enum widened from `Draft`/`Posted`/`Cancelled` to add
`PendingApproval`/`Approved`/`Rejected`; new `recurringExpenseTemplate` back-reference (null for
manually-entered expenses); new `submittedBy`/`submittedAt`/`approvedBy`/`approvedAt`/`rejectedBy`/
`rejectedAt`/`rejectionReason` audit fields.

## 4. Relationships

```
Expense (type/category) ──(default GL account)──→ RecurringExpenseTemplate ──(generates)──→ DailyExpense
CostCenter / PaymentMethod / CashRegister / BankAccount / Employee ──(pre-configured settlement)──→ RecurringExpenseTemplate.paymentTemplate
RecurringExpenseTemplate ──(recurringExpenseTemplate back-ref, audit trail)──→ every DailyExpense it produced
DailyExpense ──(unchanged)──→ JournalEntry / CashRegister.balance / BankAccount.balance
```

## 5. Business Rules

- **A template's `nextRunDate` is initialized to its own `startDate`** on creation — the first
  occurrence is due exactly on `startDate`, not "one period after" it.
- **`Custom` frequency requires `customIntervalDays`; every other frequency forbids it** — validated
  together (Mongoose can't express "required if X" cleanly across two independent fields), the same
  class of cross-field rule this domain already handles for `DailyExpense.paid`'s cashRegister/
  bankAccount XOR.
- **Every `paymentTemplate` line requires exactly one of `cashRegister`/`bankAccount`** — identical
  rule and identical reasoning to `DailyExpense.paid`, re-validated on both create and update.
- **`nextRunDate`/`lastGeneratedDate`/`status` are locked against the generic `PUT`** — the scheduling
  engine (`generateDueOccurrences`/`generateNow`) and the explicit `pause()`/`resume()`/
  `cancelTemplate()` methods are the only legitimate writers, the same "generic PUT bypasses business
  rules" defect class fixed repeatedly elsewhere in this domain.
- **`Cancelled` is terminal** (`transitionGuard`) — scheduling a fresh recurrence after cancellation
  means creating a new template, not reviving the old one; matches `AssetDisposal`/`JournalEntry`'s
  own "no reviving a terminal financial document" convention.
- **`generateDueOccurrences()` generates at most one occurrence per template per call** — a
  long-overdue template (the engine hasn't run in months) catches up gradually across repeated calls,
  not all at once in a single run; see §13 for why.
- **A template past its `endDate`'s window is silently skipped, not treated as an error** —
  `generateDueOccurrences()` returns a per-template result list (`generated`/`failed`) rather than
  throwing on the first problem, so one misconfigured template never blocks every other due template
  in the same run.
- **`requireApproval` decides the generated occurrence's starting status**: `false` → `Posted`
  immediately (Automatic Posting — the GL entry posts and the settlement balance decrements exactly
  as a manually-entered Posted `DailyExpense` would); `true` → `Draft`, routed through
  `DailyExpense`'s new `PendingApproval → Approved → Posted` path before anything posts.
- **The `DailyExpense` approval-workflow extension is fully additive** — the original `Draft →
  Posted`/`Draft → Cancelled` transitions every existing (non-recurring) caller uses are completely
  unchanged; `PendingApproval`/`Approved`/`Rejected` are a second, optional path only recurring
  occurrences (or any future caller that wants stronger review) opt into. `postExpense()` itself was
  not modified — its existing `transitionGuard.assertValid(status, "Posted")` call now simply accepts
  two possible origins (`Draft` or `Approved`) instead of one, because the guard's own edge list grew,
  not because the method's logic changed.

## 6. Workflow

```
createTemplate(paymentTemplate, frequency, startDate) ──→ Active, nextRunDate = startDate

generateDueOccurrences(asOfDate)  [one call per template per due period]
  ├─ requireApproval:false ──→ DailyExpense{status:"Posted"} (GL posted, balance decremented immediately)
  └─ requireApproval:true  ──→ DailyExpense{status:"Draft"}
                                  ──submitForApproval()──→ PendingApproval
                                  ──approveExpense()──→ Approved
                                  ──postExpense()──→ Posted (GL posted, balance decremented)
                                  [or ──rejectExpense()──→ Rejected, terminal, from PendingApproval]

pause() / resume(): Active <-> Paused (a Paused template is skipped by generateDueOccurrences())
cancelTemplate(): -> Cancelled (terminal)
generateNow(): bypasses the schedule entirely — an ad-hoc occurrence, does not touch nextRunDate
```

## 7. API Documentation

Base path: `/api/v1/expense/recurring-templates`.

| Method | Route | Notes |
|---|---|---|
| POST | `/` | Create (Active, `nextRunDate = startDate`) |
| GET | `/`, `/:id` | List / single record |
| PUT | `/:id` | Edit while not Cancelled (schedule/status fields locked — see §5) |
| DELETE | `/:id`, soft-delete/restore/bulk variants | Standard CRUD, matches `CostCenter`'s convention |
| POST | `/:id/pause`, `/:id/resume`, `/:id/cancel` | Status transitions |
| POST | `/generate-due` | `{branch?, asOfDate?}` — runs the scheduling engine for every due template |
| POST | `/:id/generate-now` | Manual escape hatch — see §5/§13 |

`DailyExpense`'s router additionally gained (base path `/api/v1/expense/daily-expenses`):

| Method | Route | Notes |
|---|---|---|
| POST | `/:id/submit` | Draft → PendingApproval |
| POST | `/:id/approve` | PendingApproval → Approved (`authorize("DailyExpenses", "approve")`) |
| POST | `/:id/reject` | PendingApproval → Rejected, `{reason?}` |

## 8. Frontend Guide

A "Recurring Expenses" setup screen creates/edits templates (frequency, payment split, whether it
requires approval) much like any other config entity. Since this codebase has no background-job
infrastructure (confirmed platform-wide — see §13), `POST /generate-due` must be called from
somewhere: either an admin "Run Due Expenses Now" button, or (once job infrastructure exists) a
scheduled call — the engine itself doesn't care which. A generated `Draft` (from a `requireApproval`
template) shows up in the same expense-approval queue a manager already uses for `DailyExpense`
review, calling `/:id/submit` → `/:id/approve` → `/:id/post` (or `/:id/reject`) in sequence. Every
`DailyExpense` list/detail view can now show which template (if any) produced it via
`recurringExpenseTemplate`.

## 9. Integration

- **`expense/daily-expense`**: the actual posting engine — this module never posts to the GL or
  touches a settlement balance itself; every occurrence is a real `DailyExpense.create()` call, so
  `expense-reports`/`finance-reports`/`executive-dashboard` already include recurring-generated
  expenses with zero changes to any of them (they all query `DailyExpense` directly, which doesn't
  care how a document was created).
- **`expense/expense`**: the expense type/category each template is filed under (its default GL
  account is what `_postExpenseAccounting` resolves for the generated occurrence, unchanged).
- **`finance/cash-register`, `finance/bank-account`**: the settlement accounts each
  `paymentTemplate` line resolves to — unchanged, reused as-is.

## 10. Security

`authorize("RecurringExpenseTemplates", action)` + `checkModuleEnabled("financial")` — matching the
existing `Expenses`/`DailyExpenses` resources' module key exactly (confirmed by reading their routers
before building this one, not assumed). `"RecurringExpenseTemplates"` added to `RESOURCE_ENUM`
(additive). `generate-due`/`generate-now` use a distinct `"generate"` action so the right to trigger
generation can be granted separately from ordinary create/update rights. `DailyExpense`'s new
`/approve`/`/reject` routes use `authorize("DailyExpenses", "approve")`, matching `CashierShifts`' and
`Budgets`' existing maker-checker convention.

## 11. Reporting

No dedicated recurring-expense report was built — every existing `expense-reports` view already
includes recurring-generated `DailyExpense` documents automatically (see §9); the one thing not yet
exposed is a "recurring expenses due/overdue" view (see §12).

## 12. Future Extensions

- **No "upcoming/overdue recurring expenses" dashboard widget** — `RecurringExpenseTemplateModel`
  already has the `{brand, status, nextRunDate}` index this would query; not built in this pass.
- **No notification on generation, approval, or rejection** — this platform has no background-job/
  notification infrastructure at all (confirmed absent in the earlier platform-wide review, and again
  here), consistent with the identical gap already noted on `AssetDepreciation`'s and `Budget`'s own
  future-extension sections. `generateDueOccurrences()`'s per-template result list
  (`{template, status, dailyExpense | error}`) is the deliberate seam a future notifier would hook
  into — it already reports exactly which templates generated, skipped, or failed on each run without
  needing any redesign.
- **No catch-up-multiple-periods-in-one-call option** — see §13 for why one-occurrence-per-call was
  chosen; a `maxOccurrences` parameter would be a small, additive follow-up if a real backlog scenario
  needs it.

## 13. Architecture Decisions

- **Claim-before-create ordering, not a cross-service transaction**: `_generateOne()` atomically
  advances `nextRunDate` (an optimistic-precondition `findOneAndUpdate`, preventing two concurrent
  runs from generating the same due occurrence) *before* creating the `DailyExpense`. This mirrors
  `asset-disposal.service.js#_dispose()`'s exact precedent (claim `Asset.status` first, then create
  the `AssetDisposal` audit record) rather than wrapping both steps in a single MongoDB session —
  which is not straightforwardly possible here since `dailyExpenseService.create()`'s `afterCreate`
  hook triggers `_postExpenseAccounting()`, which itself opens its *own* independent transaction via
  `journalEntryService.postFromSource()` → `createBalancedEntry()`; nesting two independently-managed
  transactional writers is not a change to make casually. **Accepted trade-off**: if `DailyExpense`
  creation fails after the schedule claim succeeds, that due date's occurrence is skipped (logged, not
  silently lost — `generateDueOccurrences()`'s result list marks it `"failed"` with the error message)
  and `nextRunDate` has already moved on. `generateNow()` exists specifically as the manual recovery
  path for this case — it doesn't require the template to be "due" and doesn't touch `nextRunDate`,
  so a skipped period can always be generated by hand afterward.
- **One occurrence per template per `generateDueOccurrences()` call**, not "catch up everything
  overdue in one call" — a template that hasn't run in six months produces one occurrence per call,
  six calls to fully catch up. Chosen so a single call's blast radius is always bounded and
  predictable (one GL entry per template, not an unpredictable burst), consistent with this
  platform's general preference for small, atomic, individually-auditable postings over batched ones.
- **`DailyExpense.status` was extended additively rather than building a parallel
  `RecurringExpenseOccurrence` model with its own approval workflow** — reusing the existing,
  already-tested posting engine (balance decrement + GL posting + `lockedUpdateFields` lockdown) for
  recurring-generated expenses was judged lower-risk than duplicating that logic in a second model
  that would need to stay in sync with it forever. Verified additive-safe before making the change:
  `expense-reports.service.js` filters on `status === "Posted"` explicitly (never assumes an
  exhaustive 3-value enum), so the new intermediate states cannot silently break an existing report.
- **`paymentTemplate` mirrors `DailyExpense.paid`'s shape exactly** (`paymentMethod`, `amount`,
  `cashRegister`/`bankAccount` XOR, `paidBy`) rather than inventing a different shape — generation is
  then a straight one-to-one map from template lines to `DailyExpense.paid` lines, no translation
  layer needed.
- **`advanceDate()` is a pure, exported function**, matching
  `asset-depreciation.service.js#calculateDepreciationAmount`'s established convention for
  calculation logic worth testing in isolation from the database.

## 14. Developer Notes

- Test file: `tests/integration/recurring-expense-engine.test.ts` — covers `advanceDate()`'s five
  fixed frequencies plus `Custom`, a month-end-anchor overflow case (documented JS `Date` behavior,
  not a bug), the `Custom`/`customIntervalDays` and payment-line-XOR validation, `nextRunDate`
  initialization, `generateDueOccurrences()`'s auto-post path (with a balanced GL entry and register
  balance decrement) and its `Draft`-then-approval-chain path for `requireApproval:true`, the
  endDate-skip guard, `generateNow()`'s schedule-bypass behavior, the full `pause`/`resume`/
  `cancelTemplate` transition set (including that a Paused template is excluded from generation and
  Cancelled is terminal), and the `lockedUpdateFields` lockdown. Tests that call
  `generateDueOccurrences()` explicitly cancel their own template afterward (or use a far-future
  `startDate`) to prevent a leftover Active template from a prior test being picked up by a later
  test's own `asOfDate` — worth remembering if adding more tests to this file, since
  `generateDueOccurrences()` is brand/branch-scoped, not scoped to a single template.
- `tests/integration/daily-expense-posting-engine.test.ts` and `tests/integration/expense-reports.test.ts`
  (both pre-existing, unmodified) continue to pass unchanged against the additive `DailyExpense`
  schema/service changes.
