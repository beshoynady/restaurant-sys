# Employee Advance (HR) — Engineering Documentation

## 1. Business Purpose

An Advance Management Engine — the full lifecycle of a salary advance/loan an employee requests
against future pay: request, review, approval, disbursement, scheduled repayment through payroll
deductions, early/partial repayment, pausing deductions, cancellation before disbursement, and final
settlement at termination. Module 11 of the fixed 14-module HR rollout.

**Previously completely non-functional**: the service was five hand-written methods with signatures
incompatible with `BaseController` (every route beyond create/read threw), no tenant scoping, no
`isDeleted` field, no RBAC, and never mounted (HD-012). Rebuilt from scratch this turn.

## 2. Workflow

1. HR or the employee creates a **draft** advance (`totalAmount`, `repaymentDuration`, `reason`).
2. `submit()` → **submitted** — the request is formally in the queue.
3. `review()` → **under_review** — a reviewer has started looking at it.
4. `approve()` → **approved** — gated by the one-active-advance-per-employee rule (§5).
5. `disburse()` → **disbursed** — money leaves the company; `installmentAmount` and
   `remainingBalance` are computed here, not at creation time.
6. `recordRepayment()` → **repayment_started** (first installment) → **partially_repaid** (subsequent
   installments, balance still > 0) → **fully_repaid** (balance reaches 0) — each call creates a real
   `EmployeeFinancialTransaction`.
7. `close()` → **closed** — only from `fully_repaid`.

Alternative terminal paths: `reject()` (from `submitted`/`under_review`) → **rejected**; `cancel()`
(from any pre-disbursement status) → **cancelled**; `settleOnTermination()` (from any repaying
status) → **closed** directly, bypassing the normal installment schedule.

## 3. State Machine

```
draft ──submit──▶ submitted ──review──▶ under_review ──approve──▶ approved ──disburse──▶ disbursed
  │                   │                      │                        │
  └──cancel───────────┴──cancel──────────────┴──reject──▶ rejected     └──cancel──▶ cancelled
                                              │
                                          cancel──▶ cancelled

disbursed ──recordRepayment (1st)──▶ repayment_started ──recordRepayment──▶ partially_repaid
                                                                                    │
                                                                     recordRepayment (balance → 0)
                                                                                    ▼
                                                                              fully_repaid ──close──▶ closed

disbursed / repayment_started / partially_repaid ──settleOnTermination──▶ closed  (bypasses fully_repaid)
```

Enforced centrally by `employee-advance.service.js`'s `TRANSITIONS` map + `assertTransition()` — no
route can move `status` to any value outside its currently-allowed set; every transition is a
dedicated service method, never a raw field update (validation.js excludes `status` and every
workflow field from create/update entirely).

## 4. Business Rules

1. **One active advance per employee** (`assertNoOtherActiveAdvance`, enforced at `approve()`): an
   employee with an advance already `disbursed`/`repayment_started`/`partially_repaid` cannot have a
   second one approved — prevents stacking simultaneous advances.
2. **Salary cap**: `totalAmount` cannot exceed 3× `EmployeeFinancialProfile.compensation.basicSalary`
   (fail-open if no financial profile exists yet) — see §12 for making the multiplier configurable
   later.
3. **Currency resolution**: defaults from `EmployeeFinancialProfile.compensation.currency` when not
   supplied.
4. **Installment amount is server-computed** (`totalAmount / repaymentDuration`, rounded) at
   `disburse()` time — never client-set.
5. **Repayment guards**: rejects a repayment that isn't in an active status, that exceeds the
   remaining balance, that's ≤ 0, or that's attempted while `deductionsPaused`.
6. **Cancellation only before disbursement** — `cancel()`'s `from` set is exactly the pre-disbursement
   statuses; a disbursed advance can only be cancelled via `settleOnTermination` (waived) which is a
   deliberately distinct, more consequential action.
7. **Deduction pause/resume** only valid on an active (post-disbursement, pre-fully-repaid) advance.

## 5. Payroll Integration

`getPayrollDeductionPreview(employeeId, brandId)` is the single source of truth Payroll (module 15,
not built yet) should read — for every active advance, it returns `remainingBalance`,
`installmentAmount`, `deductionsPaused`, the `nextInstallment` (from the computed schedule), and
whether it's `isOverdue`. **No calculation belongs in Payroll or the frontend** — this endpoint does
all of it. See `HR_TECHNICAL_DEBT.md` HD-015 for the (not-yet-built) Payroll consumer side.

`recordRepayment()` accepts an optional `payrollId` — when Payroll calls it, the resulting
`EmployeeFinancialTransaction.relatedPayroll` gets set, closing the loop (HD-014).

## 6. Accounting Impact

No journal-entry posting exists yet (consistent with every other module in this rollout). Design
intent, documented for the eventual Accounting integration:
- **Disbursement** (`disburse()`) is a cash outlay to the employee — `Account.systemRole:
  "EMPLOYEE_ADVANCE"` (already exists) is the natural receivable account a future journal entry would
  debit, crediting Cash/Bank.
- **Repayment** (`recordRepayment()`) reduces that same receivable — the `EmployeeFinancialTransaction`
  it creates (`category:"deduction"`) is the natural trigger for a future journal entry crediting
  `EMPLOYEE_ADVANCE` and debiting `PAYROLL_EXPENSE` or `ACCRUED_SALARY`.
- **Waived settlement** would be a bad-debt write-off expense — not modeled as any transaction today
  (see §12); `deductedFromFinalPay` settlement reuses the normal repayment transaction path.

Disbursement is deliberately **not** modeled as an `EmployeeFinancialTransaction` (unlike repayment)
— that model represents payroll-period earning/deduction lines (`payrollMonth`, `category`
`earning`/`deduction` feeding payroll totals); a one-time cash disbursement to an employee isn't a
payroll line item and would misuse that model's `category` enum (it's neither an earning nor a
payroll deduction). Disbursement is tracked directly on this model instead
(`disbursedBy`/`disbursedAt`/`disbursementMethod`).

## 7. Restaurant Workflow

Advances are a common restaurant HR need — hourly/daily workers requesting emergency funds
mid-period, seasonal staff needing an advance before their first full payroll cycle, or a kitchen/
waiter/cashier requesting funds against tips not yet paid out. The salary cap (§4.2) and one-active-
advance rule (§4.1) reflect standard practice for hourly/shift-based restaurant staff, where multiple
concurrent advances against variable pay create real repayment risk.

## 8. Relations

```
Employee ──→ EmployeeAdvance ──(payments[].transaction)──→ EmployeeFinancialTransaction
                    │                                              │
EmployeeFinancialProfile ──(currency, salary-cap source)──┘   relatedAdvance ──┘ (HD-014)
                    │
                    └──(payments[].payroll, reserved)──→ Payroll (module 15, HD-015)
```

## 9. API Reference

Base path: **`/api/v1/hr/employee-advances`**. Standard CRUD + soft-delete/restore/bulk (update
excludes `employee`/`brand`/every workflow field), plus:

**Workflow:**
- `PATCH /:id/submit`, `/:id/review`, `/:id/approve` (needs `approve` permission), `/:id/reject`
  (needs `reject` permission, body: `{rejectionReason?}`), `/:id/disburse` (body:
  `{disbursementMethod?}`), `/:id/cancel` (body: `{cancellationReason?}`).
- `POST /:id/repayments` (body: `{amount, payrollId?, payrollMonth?}`) — records one installment.
- `PATCH /:id/pause-deductions`, `/:id/resume-deductions`.
- `PATCH /:id/close`.
- `PATCH /:id/settle` (body: `{method: "waived"|"deductedFromFinalPay", payrollId?}`).

**Read primitives:**
- `GET /:id/schedule` — full installment schedule.
- `GET /employee/:employeeId/payroll-preview` — see §5.
- `GET /employee/:employeeId/summary` — total advances, active count, total outstanding, total
  disbursed for one employee.

**Reports:**
- `GET /reports/overdue` — every active advance with a passed-due, unpaid installment.
- `GET /reports/branch-summary?branch=<id>` — counts/amounts grouped by status.
- `GET /reports/department-summary` — counts/amounts grouped by department (joined through Employee).

**Known issue (Foundation, not this module — see `BACKEND_FOUNDATION_TECH_DEBT.md` FT-001):**
`DELETE /bulk-delete` is unreachable (shadowed by `/:id` DELETE).

## 10. Frontend Usage

- **Request form**: `POST /` with `totalAmount`/`repaymentDuration`/`reason` — no client-side
  installment or currency computation needed.
- **Approval queue**: `GET /?status=under_review`, `PATCH /:id/approve` or `/:id/reject` per row.
- **Disbursement screen**: `PATCH /:id/disburse`.
- **Repayment entry / payroll run**: `GET /employee/:employeeId/payroll-preview` to know exactly what
  to deduct, `POST /:id/repayments` to record it.
- **Employee advance history**: `GET /?employee=<id>`, `GET /:id/schedule` for the full plan.
- **HR dashboard**: `GET /reports/overdue`, `/reports/branch-summary`, `/reports/department-summary`.

## 11. Reports

`reports/overdue`, `reports/branch-summary`, `reports/department-summary` (§9) — "كشف السلف"
(advance statement) is `GET /?employee=` combined with `/:id/schedule`; "السلف النشطة" (active
advances) is `GET /?status=disbursed,repayment_started,partially_repaid` (via repeated status
filters) or `employeeSummary.activeCount`; "السلف المتأخرة" (overdue) is `reports/overdue`; "السلف
المسددة" (repaid) is `GET /?status=fully_repaid,closed`; "حسب الفترة" (by period) is the standard
`createdAt`/`disbursedAt` range already supported by generic list filtering.

## 12. Future Extensions

- Payroll (module 15) actually calling `getPayrollDeductionPreview`/`recordRepayment` — HD-015.
- Journal-entry posting for disbursement/repayment/write-off — §6.
- Making the 3× salary-cap multiplier a brand-configurable `EmployeeSettings` field instead of the
  current hardcoded constant.
- Automatic overdue detection/notification (a scheduled job reading `reports/overdue`) — none exists.
- A formal multi-level approval chain (currently a single `approve()` step) — `JobTitle.approvalLevel`
  (reserved since module 3) is the natural hook for this, not built here.

## 13. Reviewed, no change needed

Per this turn's own review pass, the following were read and deliberately **not** modified:
- **`Employee`**: no new field needed — `Employee.branches` already gates the branch-membership check
  (`beforeCreate`).
- **`EmployeeSettings`**: no advance-specific policy field needed this turn; the salary-cap multiplier
  is hardcoded (§12) rather than added as a new settings surface, to keep this turn bounded.
- **`AttendanceSettings`/`AttendanceRecord`**: no relationship — advances aren't attendance-driven.
- **`EmployeeFinancialProfile`**: already exposes everything needed (`compensation.basicSalary`,
  `.currency`) — no new fields required.
- **`EmployeeFinancialTransaction`**: `relatedAdvance`/`relatedPayroll` (added at its own turn, module
  10, HD-014) were exactly the fields this module needed — no further schema change required, only
  becoming its first real writer.
- **`Payroll`**: not touched — it hasn't had its own formal turn; the integration point
  (`getPayrollDeductionPreview`) is ready and waiting (HD-015), not forced into a module that isn't
  built yet.

## 14. Developer Notes

- `disbursementTransaction` (a single-transaction reference) from the original design was **removed**
  — disbursement isn't an `EmployeeFinancialTransaction` at all in this redesign (§6). Only
  `payments[]` (repayments) reference that model now.
- `payments[].installmentNumber` is new — the original design had no way to know which installment
  in sequence a payment represented without recomputing it from array position.
- If you're building a UI that shows "what will be deducted this payroll," call
  `getPayrollDeductionPreview`, don't recompute the schedule client-side — `nextInstallment`/
  `isOverdue` are already resolved server-side against real payment history, not just the theoretical
  schedule.
