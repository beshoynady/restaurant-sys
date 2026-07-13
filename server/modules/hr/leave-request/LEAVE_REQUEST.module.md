# Leave Request (HR) — Engineering Documentation

## 1. Business Purpose

The Leave Management Engine — the full lifecycle of a restaurant employee's leave, from request
through multi-step approval, real Attendance/Payroll side effects, to closure or early recall.
Module 12 of the fixed 14-module HR rollout.

**Previously non-functional**: the service was a hand-written class with signatures incompatible
with `BaseController` (same defect class as `HD-012`), no tenant scoping, no `isDeleted` field, no
RBAC, and never mounted (`HR_TECHNICAL_DEBT.md` HD-019). Rebuilt from scratch this turn.

## 2. Leave Lifecycle

1. HR/employee creates a **draft** request (`leaveType`, `startDate`, `endDate`, `reason`).
   `totalDays` auto-computes from the date range (skipping the brand's configured weekly off-days)
   when not explicitly supplied — no client-side date math needed.
2. `submit()` → **submitted**.
3. `managerReview({decision})` → on approval, **hr_review**; on rejection, **rejected** (terminal).
4. `hrReview({decision})` → on approval, **approved** (real side effects fire here — §6/§7); on
   rejection, **rejected**.
5. `complete()` → **completed**, once `endDate` has passed (manual call — no scheduled job exists
   yet, see §12).
6. `close()` → **closed**, administrative closure after a completed leave's payroll impact has
   settled.

Alternative paths: `cancel()` (any pre-approved status, or an approved-but-not-yet-started leave) →
**cancelled**; `recall()` (an ongoing approved leave) shortens it in place without changing status.

An **encashment** (`requestKind:"encashment"`) follows the identical `draft → submit → manager →
hr` approval chain, but on HR approval goes straight to **completed** (no attendance-affecting
period to wait out) and produces a `leave_encashment` transaction instead of `AttendanceRecord`
entries.

## 3. State Machine

```
draft ──submit──▶ submitted ──managerReview(approved)──▶ hr_review ──hrReview(approved)──▶ approved
                       │                                      │                               │
                  managerReview(rejected)               hrReview(rejected)                 complete
                       │                                      │                               │
                       ▼                                      ▼                               ▼
                   rejected                               rejected                        completed ──close──▶ closed

draft / submitted / hr_review / approved ──cancel──▶ cancelled   (approved only if NOT yet started)
approved (in progress) ──recall──▶ approved (shortened endDate, recalledAt set)

requestKind:"encashment": draft ──submit──▶ submitted ──managerReview──▶ hr_review
                                                              ──hrReview(approved)──▶ completed directly
```

**On the `"manager_review"` enum value**: the schema's `status` enum includes `"manager_review"` for
future extensibility (§12 — "allow customizing approval steps") but the current implementation does
not use it as a persisted resting state; `managerReview()`'s approval branch moves `submitted`
directly to `hr_review` (that value represents "awaiting HR's decision," not a separate step after
the manager's). A future enhancement inserting an explicit "manager is actively reviewing"
acknowledgement step would use it without a schema change.

Every transition is centrally guarded (`TRANSITIONS` map + `assertTransition()`) — no route can set
`status` directly; `validation.js` excludes `status` and every workflow field from create/update.

## 4. Leave Types

16 types (`LEAVE_TYPES`, defined in `employee-settings.model.js` and re-exported here): `annual`,
`sick`, `emergency`, `casual`, `maternity`, `paternity`, `unpaid`, `official_mission`,
`compensatory`, `special`, `study`, `bereavement`, `religious`, `permission`, `holiday_work`,
`other`. Kept as a plain additive-only enum (same convention as `RESOURCE_ENUM`) rather than a
separate reference collection — see §13 for why a new "LeaveType" module was rejected.

## 5. Leave Policy Resolution (HD-003 — Single Source of Truth)

`EmployeeSettings.leavePolicy` (redesigned this turn — `HR_TECHNICAL_DEBT.md` HD-016) is the
**only** place leave policy is defined: a `Map<leaveType, entry>` plus a `defaultPolicy` fallback,
where `entry = {annualDays, isPaidByDefault, requiresApproval, allowCarryForward,
maxCarryForwardDays, allowNegativeBalance, accrualMethod, expiryMonths}`.
`employee-settings.service.js#resolveLeaveTypePolicy(settings, leaveType)` is the single resolution
method — this module never re-reads or duplicates those numbers itself.

## 6. Leave Balance Engine

**Computed live**, not a separately persisted, mutable ledger — `getLeaveBalance()` recomputes from
policy + actual request history every call:

```
remaining = computeAccruedEntitlement(policy, hireDate, asOf)   // pro-rated for accrualMethod + first-year hire
            − sum(approved, non-encashment totalDays this policy year)
            − sum(approved encashment totalDays this policy year)
```

Chosen over a stored balance field to avoid drift between a number and the requests that justify
it — the same design philosophy already used for `hr/employee-financial-transaction`'s ledger
(nothing is "the balance," the balance is *derived*). **Policy year = calendar year (Jan 1 - Dec
31)**, not hire-date anniversary — a simpler, well-justified choice for a first implementation (see
§12).

**Documented limitation**: carry-forward from the *prior* policy year is NOT computed
(`computeCarryForward` exists in `leave-request.domain.js` and is unit-tested, but
`getLeaveBalance()` never calls it) — see `HR_TECHNICAL_DEBT.md` HD-018 for why (would need either
unbounded backward recursion through every prior year, or a persisted year-end snapshot this
engine's "computed live" design deliberately avoids). A brand with `allowCarryForward:true`
currently under-counts balance the moment a year rolls over — a real, acknowledged gap, not silently
ignored.

**Encashment** reduces the same balance (`sumEncashedDays`) — an employee cannot encash days they've
already used, or use days they've already encashed.

## 7. Attendance Integration

On HR approval (non-encashment requests only), `generateAttendanceRecords()` creates one
`AttendanceRecord` per working day in the leave range (skipping weekly off-days, resolved from
`AttendanceSettings.workCalendar.weeklyOffDays` — module 6), `type` mapped via
`mapLeaveTypeToAttendanceType()`:

| LeaveRequest.leaveType | AttendanceRecord.type |
|---|---|
| `sick` | `SICK_LEAVE` |
| `unpaid` | `UNPAID_LEAVE` (new this turn — HD-017) |
| `permission` | `PERMISSION` |
| `holiday_work` | `WORK_ON_HOLIDAY` |
| everything else | `VACATION` (generic paid absence) |

Each record links back via `AttendanceRecord.leaveRequest` (pre-existing field, finally populated).
**If the employee has no default shift** (`AttendanceRecord.shift` resolution fails — HD-005), that
one day's record is skipped rather than failing the whole approval — a day with no scheduled shift
has nothing to excuse attendance-wise. `LeaveRequest.attendanceGenerated` is set once the loop
completes. `cancel()`/`recall()` reverse (soft-delete) the corresponding records.

## 8. Payroll Integration

`payrollTreatment` (`{payRatio, fundedBy, deductionSource}`) is resolved server-side at creation from
the leave type's policy — **never client-set**:
- Paid (`isPaidByDefault:true`) → `{payRatio:"full", fundedBy:"company", deductionSource:"leaveBalance"}`
  — no monetary transaction; the "cost" is the balance day itself.
- Unpaid (`isPaidByDefault:false`) → `{payRatio:"none", fundedBy:"employee", deductionSource:"salary"}`
  — on approval, `processUnpaidDeduction()` creates one `EmployeeFinancialTransaction`
  (`type:"salary_deduction"`) **per calendar month** the unpaid range spans, each pro-rated against
  that month's own day count (`basicSalary / daysInMonth × unpaidDaysInThatMonth`) — reading
  `EmployeeFinancialProfile.compensation.basicSalary` (module 9), never re-deriving it.

`"half_paid"`/`"insurance"`-funded treatments are modeled in the schema's enums
(`payRatio:"half"`, `fundedBy:"insurance"`) but have **no automatic resolution logic** — the policy
engine only distinguishes paid/unpaid; half-pay or insurance-funded leave (e.g. maternity in some
jurisdictions) needs a manual override, not built here (see §12).

**No calculation belongs in Payroll or the frontend** — `payrollProcessed`/`relatedTransaction` on
the request record exactly what happened, ready for `hr/payroll` (module 15, not built) to read —
see `HR_TECHNICAL_DEBT.md` HD-018.

## 9. Restaurant Workflow / Operations

- **Blackout periods**: `EmployeeSettings.leavePolicy.blackoutPeriods` — brand-wide date ranges
  rejected at request creation (`assertNoBlackoutConflict`). Branch-level blackout is NOT modeled
  (§12).
- **Minimum department coverage**: `EmployeeSettings.leavePolicy.minimumDepartmentCoverageRatio` —
  if set, HR approval is rejected when it would drop a department's non-leave headcount below that
  fraction (`assertMinimumCoverage`), counting other requests already in `manager_review`/`hr_review`/
  `approved` for overlapping dates. 0 (default) disables the check — fail-open for brands that
  haven't configured it.
- **Recall**: `recall()` — bringing an employee back from an ongoing approved leave early. Shortens
  `endDate`, recomputes `totalDays`, reverses attendance records for the now-unused tail of the
  range. The employee's own return-to-work clock-in is a separate, ordinary `AttendanceRecord`
  creation (module 7) — not something this module generates.
- **Department/branch-scoped approval**: not a separate mechanism — `authorize("LeaveRequests",
  "approve")`'s existing `branch` restriction (`middlewares/authorize.js`, pre-existing platform
  capability) already scopes who may call `managerReview`/`hrReview` to their own branch's role
  grant.

## 10. API Reference

Base path: **`/api/v1/hr/leave-requests`**. Standard CRUD + soft-delete/restore/bulk (update
excludes `employee`/`brand`/every workflow field), plus:

**Workflow**: `PATCH /:id/submit`, `/manager-review` (needs `approve` permission, body:
`{decision, comment?}`), `/hr-review` (same), `/cancel` (body: `{cancellationReason?}`),
`/complete`, `/close`, `/recall` (body: `{newEndDate, recallReason?}`).

**Frontend-ready reads**: `GET /pending` (everything awaiting review), `GET /calendar?department=&branch=&from=&to=`
(team/department calendar), `GET /upcoming?days=30`, `GET /employee/:employeeId/balance?leaveType=`,
`GET /employee/:employeeId/balances` (every type at once), `GET /employee/:employeeId/history`.

**Reports**: `GET /reports/branch-summary`, `/department-summary`, `/type-summary`,
`/payroll-impact` (every request that produced a real transaction).

**Known issue (Foundation, not this module — see `BACKEND_FOUNDATION_TECH_DEBT.md` FT-001):**
`DELETE /bulk-delete` is unreachable (shadowed by `/:id` DELETE).

## 11. Frontend Guide

- **Request form**: `POST /` with `leaveType`/`startDate`/`endDate`/`reason` — omit `totalDays` and
  let the server compute it; show `payrollTreatment`/`isPaid` from the response, don't derive it
  client-side.
- **Balance widget**: `GET /employee/:employeeId/balances` — render `remaining` directly.
- **Approval queue**: `GET /pending`, `PATCH /:id/manager-review` or `/hr-review` per row.
- **Team calendar**: `GET /calendar?department=&from=&to=`.
- **HR dashboard**: `reports/*` endpoints, `GET /upcoming`.

## 12. Reports / Future Extensions

Built: branch/department/type summaries, payroll-impact report (§10) — covers "كشف أرصدة
الإجازات" (`balances`), "حسب الفرع/القسم/النوع/الفترة" (the four summary reports plus generic date
filtering), "المؤثرة على الرواتب" (`payroll-impact`). "الإجازات المتأخرة" (overdue) has no direct
LeaveRequest equivalent — a leave request doesn't have a "due date" the way an advance installment
does; not built.

Not built, explicitly deferred:
- Multi-year carry-forward (HD-018).
- Automatic `complete()` via a scheduled job checking `endDate <= now` — currently a manual call.
- Half-pay / insurance-funded automatic payroll resolution (§8).
- Branch-level (vs. brand-wide) blackout periods.
- Hire-date-anniversary policy years (currently calendar-year only).
- A separate "LeaveType" reference module — rejected as out of this rollout's fixed 14-module scope;
  the Map-keyed policy already makes new types addable without a schema migration (§5).

## 13. Reviewed, no change needed

Per this turn's own review pass:
- **`Employee`**: `hireDate` already exists and is exactly what `computeAccruedEntitlement` needed —
  no new field.
- **`AttendanceSettings`**: `workCalendar.weeklyOffDays` (module 6) is read directly for both
  `totalDays` auto-computation and attendance-record generation — no duplication.
- **`EmployeeFinancialProfile`**: `compensation.basicSalary`/`.currency` (module 9) read directly for
  unpaid-deduction/encashment amount calculation — no duplication.
- **`EmployeeFinancialTransaction`**: only needed one new `type` value (`leave_encashment`, HD-017)
  — the create/approve/cancel workflow (module 10) was reused as-is.
- **`EmployeeAdvance`**: no relationship — advances and leave are independent financial concerns; no
  cross-reference needed.
- **`JobTitle`/`Department`/`Shift`**: read (department for coverage checks, shift indirectly via
  AttendanceRecord) but not modified.

## 14. Developer Notes

- If you're looking for **standing leave-day entitlement policy**, that's
  `EmployeeSettings.leavePolicy`, not this module — this module only *consumes* it.
- `LEAVE_TYPES` is defined in `employee-settings.model.js` and re-exported from
  `leave-request.model.js` — import from either, they're the same array reference; don't declare a
  third copy.
- `getLeaveBalance()`'s calendar-year policy-year assumption means a request spanning
  Dec 20 - Jan 5 is split across two policy years for balance purposes — the balance check at
  creation time only validates against the *start* date's policy year (a simplification, documented
  here rather than silently wrong).
- If you're modifying `AttendanceRecord.type` or `EmployeeFinancialTransaction.type`/
  `TYPE_CATEGORY_MAP`, know that this module depends on `UNPAID_LEAVE` and `leave_encashment`
  existing exactly as added in HD-017.
