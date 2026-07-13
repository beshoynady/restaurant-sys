# Employee Financial Transaction (HR) — Engineering Documentation

## 1. Overview

The append-style ledger of individual, one-time financial events for an employee — bonuses,
overtime payouts, tips, service-charge shares, penalties, deductions, advance repayments, and manual
adjustments. Module 10 of the fixed 14-module HR rollout.

**Previously broken and unreachable**: every consumer imported a `.model.js` that didn't exist (only
a `.model.ts` did — `ERR_MODULE_NOT_FOUND`), the router had no `authorize()`/`checkModuleEnabled()`
at all, the model had no `isDeleted` field despite soft-delete being enabled (silent empty-results
bug, same class as HD-002), and it was never mounted. Fixed this turn — see §13, `HR_TECHNICAL_DEBT.md`
HD-011.

## 2. Business Purpose

Distinct from `hr/employee-financial-profile` (module 9, the STANDING compensation configuration)
and `hr/employee-advance` (module 11, a loan with its own repayment schedule): this module is the
TRANSACTIONAL record of individual, dated financial events — the raw material a future payroll
calculation (module 15) will sum per pay period. Every restaurant-specific pay component the
business asked this rollout to support (tips, service charge, overtime, late/absence penalties,
bonuses) needs a place to be recorded as an auditable, individually-approvable event, not just a
number baked into a payroll total with no trail.

## 3. Workflow

1. A transaction is created (`category`, `type`, `amount`, `payrollMonth`, `reason`) —
   `payrollEffect` is always derived server-side from `category`, never trusted from the client.
2. It sits `isApproved: false` until a manager/HR actor calls `PATCH /:id/approve` — the only way
   `isApproved` can become `true`. Once approved, it can no longer be edited via generic update; the
   only remaining state changes are `cancel()` (before payroll processing) or (once module 15 exists)
   being marked `isPayrollProcessed`.
3. `PATCH /:id/cancel` reverses a not-yet-processed transaction. A `isPayrollProcessed: true`
   transaction can no longer be cancelled — standard accounting practice is to reverse a posted entry
   with an offsetting entry, not to edit or delete it retroactively.
4. `GET /summary/monthly?employee=&payrollMonth=` aggregates one employee's one month into
   `{totalEarnings, totalDeductions, netAmount, approvedCount, pendingApprovalCount,
   transactionCount}` — the Payroll-first "ready to feed a payslip" primitive.

## 4. Business Rules

1. **Type/category consistency**: every `type` except `"salary_adjustment"` has exactly one valid
   `category` (`TYPE_CATEGORY_MAP` in the model file) — a mismatch (e.g. `type:"tip"` with
   `category:"deduction"`) is rejected with a clear `400`. `salary_adjustment` is the one
   intentionally ambiguous type (can legitimately be either direction).
2. **`payrollEffect` is always server-derived** from the validated `category` (`earning`→`credit`,
   `deduction`→`debit`) — never accepted from client input, eliminating the 3-way contradiction risk
   the original design allowed (three independently-settable fields describing overlapping
   information).
3. **Amount must be strictly positive** (`min: 0.01`, was `min: 0`) — a zero-amount transaction
   records nothing meaningful.
4. **Approval is a one-way, guarded gate**: `approve()` rejects double-approval and rejects approving
   an already-cancelled transaction. Once approved, the transaction is immutable via generic
   `update()` — only `cancel()` can still act on it (until processed).
5. **Cancellation cannot reverse a payroll-processed transaction** — `cancel()` rejects with a message
   directing the caller to record an offsetting transaction instead.
6. **`employee`/`brand` are immutable after creation** — excluded from the update schema.

## 5. Financial Rules

- `amount` is always a positive magnitude; direction is carried entirely by `category`/`payrollEffect`,
  never by a signed number — avoids the classic "is this deduction stored as -50 or 50" ambiguity.
- `payrollMonth` is a `"YYYY-MM"` string (schema-level regex `^\d{4}-(0[1-9]|1[0-2])$`), matching
  `PayrollItem`'s own existing convention rather than inventing a new period representation.
- A transaction's financial effect is only "real" for payroll purposes once `isApproved: true` and
  `isCancelled: false` — `monthlySummary()` and `findUnprocessedApprovedForPeriod()` both filter on
  exactly this combination, so an unapproved draft transaction never silently affects a total.

## 6. Accounting Impact

No journal-entry posting exists yet (Accounting integration is deferred project-wide, consistent
with every other HR module in this rollout) — but the design is posting-ready: `category`
(earning/deduction) and `payrollEffect` (credit/debit) map cleanly onto `Account.systemRole`'s
already-existing `PAYROLL_EXPENSE` (an earning transaction increases payroll expense),
`EMPLOYEE_ADVANCE` (an `advance_repayment` transaction reduces the advance receivable), and
`ACCRUED_SALARY` roles. `employee-financial-profile.costCenter` (module 9) is the natural
cost-center dimension a future journal entry would carry. None of this is implemented — documented
here so the eventual Accounting integration doesn't have to reverse-engineer the mapping.

## 7. Restaurant Workflow

- **Tips / service charge**: recorded as individual `type:"tip"`/`"service_charge"` transactions
  (added this turn — see §13) as they're collected/allocated, not baked into a single payroll number
  with no per-event trail — matches how tip pooling/service-charge distribution is actually audited
  in restaurant operations.
- **Late/absence penalties**: `type:"penalty_late"`/`"penalty_absence"` — intended to eventually be
  created automatically from `AttendanceRecord`'s computed `lateMinutes`/absence data (module 7) once
  a penalty-calculation policy exists; not built here (see §12).
- **Overtime payout**: `type:"salary_overtime"` — intended to source its amount from
  `AttendanceRecord.overtimeMinutes` × `EmployeeFinancialProfile.overtimePay` (modules 7 and 9); not
  wired here (see §12).

## 8. Relations

```
Employee ──→ EmployeeFinancialTransaction ──(reserved)──→ EmployeeAdvance (relatedAdvance)
                    │                    └──(reserved)──→ Payroll (relatedPayroll)
                    ├─ payrollEffect derived from category
                    └─ approvedBy/cancelledBy → Employee (matches LeaveRequest's own convention)
```

## 9. API Reference

Base path: **`/api/v1/hr/employee-financial-transactions`**. Standard CRUD + soft-delete/restore/bulk
(update excludes `employee`/`brand`/every workflow field), plus:

- **`PATCH /:id/approve`** — the only route that may set `isApproved`.
- **`PATCH /:id/cancel`** (body: `{cancellationReason?}`) — the only route that may set `isCancelled`.
- **`GET /summary/monthly?employee=<id>&payrollMonth=YYYY-MM`** — aggregated totals.

**Known issue (Foundation, not this module — see `BACKEND_FOUNDATION_TECH_DEBT.md` FT-001):**
`DELETE /bulk-delete` is unreachable (shadowed by `/:id` DELETE).

**CRITICAL Foundation issue discovered while building this module's router — fixed the same turn,
project-wide (FT-004):** `GET /:id`, `DELETE /:id`, soft-delete, and restore routes across the
**entire backend** (not just this module) were rejecting every request with `400 "id is required"` —
`validate(paramsSchema())` was checking `req.body`, not `req.params`. Given the severity, this was
escalated to the project owner immediately rather than deferred, approved, and fixed project-wide
(349 call sites across 89 router files) in the same session as this module's own work. See
`BACKEND_FOUNDATION_TECH_DEBT.md` FT-004 for full detail and end-to-end verification.

## 10. Frontend Usage

- **Record a transaction** (bonus/tip/penalty/etc.) form: `POST /` — no client-side `payrollEffect`
  computation needed, it's derived server-side.
- **Approval queue**: `GET /?isApproved=false` list, `PATCH /:id/approve` per row.
- **Employee transaction history**: `GET /?employee=<id>` with `payrollMonth` filter.
- **Payslip preview / payroll-prep dashboard**: `GET /summary/monthly` — render the totals directly.

## 11. Dashboard Usage

- Pending-approval count/queue widget (`GET /?isApproved=false&isCancelled=false`).
- Monthly earnings-vs-deductions widget per employee or (via repeated calls) per branch, sourced from
  `monthlySummary()`.

## 12. Reports

None built this turn (no report-generation infrastructure exists elsewhere in this rollout to plug
into) — `monthlySummary()` is the aggregation primitive a future payroll or financial report would
be built on top of.

## 13. Technical Decisions / Future Extensions

- **`.ts` → `.js` conversion, type-stripping only.** No schema or behavior change from the original
  design beyond what's explicitly listed in §4 as new — the field list, enums, and index shape are
  otherwise unchanged.
- **Added `"tip"` and `"service_charge"` to the `type` enum.** Discovered by cross-referencing this
  module's design against `hr/employee-financial-profile` (module 9), which already tracks
  `eligibility.tipsEligible`/`.serviceChargeEligible` — but this ledger had no transaction type to
  actually record either. A genuine gap surfaced by this rollout's "read every related module before
  designing" discipline, not scope creep — restaurant tips/service-charge tracking was explicitly
  named in this turn's own protocol.
- **Added `relatedAdvance`/`relatedPayroll` as reserved fields** (HD-014) — closes the one-directional
  relationship gap HD-011's research flagged, without this module reaching into `EmployeeAdvance` or
  `Payroll` to populate them (their own modules' turns).
- **Dedicated `approve()`/`cancel()` service methods, not raw field updates.** The original design let
  any generic `PUT` flip `isApproved`/`isCancelled` directly with no actor tracking guarantee and no
  double-approval guard — replaced with the same "workflow methods, not raw field writes" pattern
  already used for `hr/employee-financial-profile`'s eligibility computation.
- **Not built**: automatic transaction creation from `AttendanceRecord` (overtime/late/absence) or
  from a tip-pooling/service-charge-distribution calculation — both are real future integrations
  (§7) that need their own design pass, not assumed into this module's scope.
- **No changes made to `EmployeeAdvance`, `Payroll`, `AttendanceRecord`, or
  `EmployeeFinancialProfile`.** Every field this module needed was addable within its own schema.

## 14. Developer Notes

- If you're looking for **standing compensation configuration** (basic salary, disbursement method),
  that's `hr/employee-financial-profile`, not this ledger.
- If you're looking for **salary advances/loans**, that's `hr/employee-advance` (module 11, still
  broken — see `HR_TECHNICAL_DEBT.md` HD-012) — `type:"advance_repayment"` transactions here are
  meant to represent one repayment installment of an advance, not the advance itself.
- `TYPE_CATEGORY_MAP` is exported from the model file specifically so the service's validation logic
  and any future consumer (e.g. a payroll calculation reading transaction types) share one definition
  — don't hardcode a second copy of this mapping anywhere else.
