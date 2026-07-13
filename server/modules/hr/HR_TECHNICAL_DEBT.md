# HR Domain — Technical Debt

Issues that span or affect more than one HR module, discovered while working a specific module in
the HR rollout order, but owned by (and to be fixed at) a different module's own turn — not the
module that first surfaced them. See `BACKEND_FOUNDATION_TECH_DEBT.md` for issues affecting shared
backend infrastructure outside HR entirely.

Execution order: Employee (done) → Department (done) → JobTitle (done) → Shift (done) →
ShiftSettings (done — relocated out of HR, see HD-006) → AttendanceSettings (done, see HD-007/HD-008)
→ AttendanceRecord (done, see HD-002/HD-005/HD-008/HD-009) → EmployeeSettings (done, see
HD-003/HD-007/HD-016/HD-020) → EmployeeFinancialProfile (done, see HD-010, updated this turn — HD-020)
→ EmployeeFinancialTransaction (done, see HD-011/HD-014/HD-017) → EmployeeAdvance (done, see
HD-012/HD-014) → LeaveRequest (done, see HD-016/HD-017/HD-018/HD-019) → PayrollSettings (done, see
HD-020) → PayrollItem (done, see HD-021 — **all 14 fixed modules complete**) → Payroll (pre-existing,
mounted, CRUD-only — out of this rollout's 14-module scope; its own future turn must resolve HD-013,
consume `PayrollSettings`'s policy, `PayrollItem`'s formula engine, `EmployeeAdvance`'s
`getPayrollDeductionPreview()`, and `LeaveRequest`'s payroll-affecting transactions — see
HD-015/HD-018/HD-021).

**HR domain rollout status: all 14 fixed modules complete as of this turn.** See
`HR_DOMAIN_FINAL_AUDIT.md` for the end-of-rollout production-readiness assessment.

**Also see `BACKEND_FOUNDATION_TECH_DEBT.md` FT-004 (CRITICAL, found during this module's turn, ✅
FIXED project-wide the same session):** `validate(paramsSchema())` validated `req.body` instead of
`req.params` on every `GET /:id`, `DELETE /:id`, soft-delete, and restore route across the entire
backend, not just HR. Flagged to the project owner given severity, approved for an immediate
out-of-order fix, and resolved across all 89 affected router files (349 call sites) with full
regression + end-to-end HTTP verification — not deferred to a later Foundation pass.

---

## HD-021 — `hr/payroll-item`'s Formula Token Engine was stored but never evaluated anywhere — ✅ FIXED (PayrollItem module)

**Found and fixed at this module's own scheduled turn (module 14, final of the fixed 14).** The
model itself (`formula.tokens`/`executionCondition.tokens`, a safe VAR/OP/NUMBER/PERCENT/LPAREN/
RPAREN token schema) was reasonably designed already, but `payroll-item.service.js` was the same
hand-written CRUD class as every other broken module this rollout fixed (HD-012/HD-019 defect
class) — meaning the tokens were stored and **never evaluated by any code in this project**. A
formula field with no evaluator is a UI input with no backend, not a feature.

**Also found**: `rateBase`/`attendanceRule`/`financialtransactionType` all had `enum` + `default:
null` without `null` explicitly listed in the enum array — the exact same latent Mongoose validation
bug already found and fixed in `EmployeeAdvance` (module 11). Never triggered before this turn
because the whole module was unused.

**Action taken:** full rebuild — Repository Pattern, RBAC, and (the real work) a genuine Formula
Engine (`payroll-item.domain.js`): `validateTokenSequence` (structural fail-fast validation —
balanced parens, no adjacent operators, known variables only), `evaluateFormula` (a real
shunting-yard-based infix evaluator supporting arithmetic and comparison operators), and
`detectCircularDependency` (DFS cycle detection across a new `dependsOn` graph). Also added real
double-entry-ready accounting fields (`accounting.debitAccount`/`.creditAccount`/`.costCenter`,
redesigned from a single unused `account` field), `isEmployerCost`/`isMandatory`/`recurrence`/
`isProrated` classification fields, and fail-fast validation for category/payrollEffect coherence,
employer-cost/category coherence, duplicate codes, invalid accounting references, and circular
dependencies.

**Status:** Fixed and integration-tested — 10 tests in `payroll-item-business-rules.test.ts`
covering the formula engine (arithmetic, comparison, percent, circular dependency detection) and
every new validation rule.

---

## HD-020 — `EmployeeSettings.payroll` removed — absorbed into `hr/payroll-settings` (HD-013's prerequisite, finally addressed)

**Found while reviewing:** `hr/payroll-settings` at its own scheduled turn (module 13).
`EmployeeSettings.payroll` (`defaultSalaryType`/`defaultCurrency`/`autoGeneratePayroll`/
`payrollCycleDay`) was explicitly marked "Reserved — Payroll's own turn" since `hr/employee-settings`'
own turn (module 8) — that turn has now arrived. Its only real consumer was
`employee-financial-profile.service.js#resolveCompensationDefaults` (module 9).

**Action taken:** removed the `payroll` sub-object from `EmployeeSettings` entirely; its four fields
now live in `hr/payroll-settings`'s `defaults` (`salaryType`/`currency`) and `cycle` (`payDay`) groups
— `PayrollSettings` is a purpose-built, dedicated policy engine, a better home than a sub-object on
the general-purpose `EmployeeSettings` document. `employee-financial-profile.repository.js`/
`.service.js` were updated in the same pass (`findEmployeeSettingsForBrand` →
`findPayrollSettingsForBrand`, `resolveCompensationDefaults` reads `payrollSettings.defaults`/
`.cycle.payDay` instead of `employeeSettings.payroll.*`) — same Single-Source-of-Truth pattern as
HD-007 (attendance/defaultWork removal) and HD-016 (leavePolicy consolidation).

**Verified**: `employee-financial-profile-business-rules.test.ts`'s compensation-defaults test
updated to seed a `PayrollSettingsModel` document instead of `EmployeeSettingsModel.payroll`; full
regression suite (18 suites / 87 tests) confirmed passing after the migration, not just the two
directly-touched modules.

**Status:** Fixed. `EmployeeSettings.payroll` no longer exists on the schema at all — not deprecated,
removed (zero other consumers confirmed by search before deleting, same standard as HD-007/HD-010).

---

## HD-019 — `hr/leave-request`'s service was a hand-written class incompatible with `BaseController` — ✅ FIXED (LeaveRequest module)

**Found and fixed at this module's own scheduled turn (module 12).** Same defect class as HD-012
(`EmployeeAdvance`): `leave-request.service.js` was five hand-written methods
(`create(data)`/`findAll(filter)`/`findById(id)`/`update(id,data)`/`delete(id)`) incompatible with
`BaseController`'s call signatures — every route beyond create/read would have thrown; no tenant
scoping; no `isDeleted` field despite the router exposing soft-delete actions; no
`authorize()`/`checkModuleEnabled()` at all; never mounted in `router/v1/index.router.js`.

**Action taken:** full rebuild as a Leave Management Engine — Repository Pattern (`.repository.js`),
RBAC on every route, `isDeleted`/`deletedAt`/`deletedBy` added, mounted at `/hr/leave-requests`. See
`LEAVE_REQUEST.module.md` for the complete redesign (state machine, balance engine, attendance/
payroll integration).

**Status:** Fixed and integration-tested (9 tests in `leave-request-business-rules.test.ts`).

---

## HD-018 — `Payroll` should also consume `LeaveRequest`'s payroll-affecting transactions; carry-forward across multiple years is unresolved

**Found while reviewing:** `hr/leave-request` at its own scheduled turn (module 12). Unpaid-leave
deductions and encashments both create real `EmployeeFinancialTransaction` rows
(`type:"salary_deduction"`/`"leave_encashment"`) exactly like `EmployeeAdvance` does (HD-015) — a
future `hr/payroll` (module 15) should sum these into a pay period the same way, not duplicate the
unpaid-days-to-amount calculation itself.

Separately, `leave-request.service.js#getLeaveBalance` deliberately does NOT compute carry-forward
from the prior policy year — `leave-request.domain.js#computeCarryForward` exists and is unit-testable
but is never called from the balance engine, because doing so correctly would require either (a)
recursing backward through every prior policy year on every balance read (unbounded, slow, and still
wrong the first time a brand's policy changes retroactively), or (b) a persisted year-end snapshot
ledger, which is new stored state this rollout's balance engine was deliberately designed to avoid
(see `LEAVE_REQUEST.module.md` §5's "computed live" design decision). A brand with
`allowCarryForward: true` on any leave type currently gets `carriedForward` implicitly ignored — the
balance is understated relative to real policy the moment a carry-forward-eligible year rolls over.

**Not fixed here:** both require either `hr/payroll`'s own turn (module 15) or a deliberate new
persisted-snapshot design for carry-forward — neither is this module's own turn to force.

**Owning module:** `hr/payroll` (transaction consumption) and a future dedicated design pass for
multi-year carry-forward (not assigned to any of the remaining 2 modules in this rollout — flagged
for whoever picks up leave-policy work next).

**Status:** Recorded, not fixed.

---

## HD-017 — `AttendanceRecord`/`EmployeeFinancialTransaction` needed new enum values for leave integration

**Found while reviewing:** `hr/leave-request` at its own scheduled turn (module 12), while designing
how an approved leave should affect attendance and payroll.

**Action taken:**
- `AttendanceRecord.type` gained `"UNPAID_LEAVE"` (`attendance-record.model.js`) — previously unpaid
  leave had no distinct attendance type and would have been misrepresented as `"VACATION"` (implying
  paid) in any attendance-driven report.
- `EmployeeFinancialTransaction.type` gained `"leave_encashment"` (mapped to `category:"earning"` in
  `TYPE_CATEGORY_MAP`) — the transaction type an encashment request creates on approval.

Both are additive-only enum extensions (same convention as `RESOURCE_ENUM`'s "never rename/remove"
rule) — no existing document or consumer is affected.

**Status:** Fixed as part of this module's own turn; not deferred, since both were prerequisites for
`hr/leave-request`'s own approval workflow to function at all, not independent cross-module work.

---

## HD-016 — `EmployeeSettings.leavePolicy` redesigned to a Map — HD-003 finally, fully settled

**Found while reviewing:** `hr/leave-request` at its own scheduled turn (module 12). HD-003's earlier
fix (module 8) resolved Employee's own 3-field leave snapshot from `EmployeeSettings.leavePolicy`,
but that policy shape (`annualLeaveDays`/`sickLeaveDays`/`emergencyLeaveDays` as three hardcoded
fields) could only ever describe 3 of the 16 leave types this module's protocol required supporting
(annual/sick/emergency/casual/maternity/paternity/unpaid/official_mission/compensatory/special/study/
bereavement/religious/permission/holiday_work/other). Adding a 4th type would have needed a schema
migration every time — the opposite of "extensible," and a second, narrower source of truth sitting
next to whatever `hr/leave-request` would have needed to define for the other 13 types.

**Action taken:** redesigned `leavePolicy` to `{policies: Map<leaveType, entry>, defaultPolicy: entry,
blackoutPeriods: [...], minimumDepartmentCoverageRatio}`, where `entry` is
`{annualDays, isPaidByDefault, requiresApproval, allowCarryForward, maxCarryForwardDays,
allowNegativeBalance, accrualMethod, expiryMonths}`. The Map's default value preserves the exact prior
defaults (21/7/3 days for annual/sick/emergency) so no brand's effective policy changed as a side
effect. `employee-settings.service.js#resolveLeaveTypePolicy(settings, leaveType)` is now the single
resolution method both `hr/employee`'s snapshot-fill (via the pre-existing
`resolveLeavePolicyDefaults`, updated to call it) and `hr/leave-request`'s entire balance/payroll
engine call — genuinely one source of truth now, not two narrower ones.

**Status:** Fixed and integration-tested (`employee-settings-business-rules.test.ts`'s
`resolveLeavePolicyDefaults` test updated to the new shape; `leave-request-business-rules.test.ts`
exercises `resolveLeaveTypePolicy` end-to-end through balance and payroll-treatment resolution).

---

## HD-015 — `Payroll` should consume `EmployeeAdvance#getPayrollDeductionPreview()`

**Found while reviewing:** `hr/employee-advance` at its own scheduled turn (module 11). The service
now exposes `getPayrollDeductionPreview(employeeId, brandId)` — every active advance's next unpaid
installment, remaining balance, and overdue status, ready to feed a payroll calculation with zero
frontend/Payroll-side math. `hr/payroll`'s own model/service (module 15, not built yet) has no
awareness of advances at all today.

**Not fixed here:** `hr/payroll` has not had its own formal turn yet — deliberately not modified, per
the established Category B process (same as HD-013, which this pairs with — both are Payroll's own
future-turn integration points from the financial-data modules that came before it).

**Owning module:** `hr/payroll` — module 15. At that turn, payroll calculation should call
`employeeAdvanceService.getPayrollDeductionPreview()` for each employee and include any due,
non-paused installment as a deduction line — automatically recording the repayment via
`employeeAdvanceService.recordRepayment()` (passing the resulting Payroll's id as `payrollId`) rather
than duplicating advance-deduction logic inside Payroll itself.

**Status:** Recorded, not fixed.

---

## HD-014 — `EmployeeFinancialTransaction` had no `relatedAdvance`/`relatedPayroll` back-reference — ✅ FIXED (EmployeeAdvance module)

**Found while reviewing:** `hr/employee-financial-transaction` at its own scheduled turn (module 10).
`EmployeeAdvance.disbursementTransaction`/`.payments[].transaction` already reference *this* model
(one-directional), and `type: "advance_repayment"` already existed on this model's own `type` enum,
but there was no way to trace a transaction back to the advance it belongs to without a reverse
lookup — flagged in HD-011's own research pass before this module's redesign began.

**Action taken (module 10):** added `relatedAdvance` (ref `EmployeeAdvance`) and `relatedPayroll` (ref
`Payroll`) as reserved fields on this model.

**Action taken (module 11, this turn):** `employee-advance.service.js#recordRepayment` is now the
first real writer of `relatedAdvance` — every repayment installment creates a real
`EmployeeFinancialTransaction` (`type:"advance_repayment"`, `category:"deduction"`) with
`relatedAdvance` set to the advance it belongs to. `relatedPayroll` is populated when a `payrollId` is
passed through (reserved until Payroll, module 15, actually calls this — see HD-015).

**Status:** Fixed and integration-tested — confirmed via a direct read-back of the created
`EmployeeFinancialTransaction.relatedAdvance` field in `employee-advance-business-rules.test.ts`.

---

## HD-013 — `Payroll.basicSalary` is a raw snapshot, not sourced from `EmployeeFinancialProfile`

**Found while reviewing:** `hr/employee-financial-profile` at its own scheduled turn (module 9), now
the SSOT for an employee's compensation (`compensation.basicSalary`, `.salaryType`, `.currency`,
overtime rate, eligibility flags). `hr/payroll`'s own model (`payroll.model.js`) stores its own raw
`basicSalary`/`dailyRate`/`hourlyRate` numbers per pay period with no reference back to this module at
all, and `payroll.service.js` is confirmed pure CRUD (`AdvancedService` instantiation, zero
calculation logic) — so this gap has no live consumer yet, but will need resolving before Payroll can
actually calculate anything.

**Not fixed here:** `hr/payroll` has not had its own formal turn yet (module 15) — deliberately not
modified as part of this module's work, per the established Category B process.

**Owning module:** `hr/payroll` — module 15. At that turn, `Payroll` creation should read
`EmployeeFinancialProfileService#getFinancialSummary`/`computePayrollEligibility` rather than
requiring a raw `basicSalary` to be re-entered per pay period, and should refuse to calculate a
payroll run for an employee whose financial profile isn't eligible (see this module's own
`computePayrollEligibility`).

**Status:** Recorded, not fixed.

---

## HD-012 — `hr/employee-advance`'s service was a hand-written class incompatible with `BaseController` — ✅ FIXED (EmployeeAdvance module)

**Found while reviewing:** `hr/employee-financial-profile` at its own scheduled turn (module 9) — read
while mapping the employee financial data model before designing this module's schema.
`employee-advance.service.js` was NOT built on `utils/BaseRepository.js` — it was five hand-written
methods (`create(data)`, `findAll(filter)`, `findById(id)`, `update(id,data)`, `delete(id)`) with
signatures that didn't match what `BaseController` calls. Every list/soft-delete/restore/bulk* route
threw `this.service.<method> is not a function`; no brand/branch scoping at all — no tenant
isolation; no `isDeleted` field despite the router exposing soft-delete actions (same defect class as
HD-002); **also not mounted** in `router/v1/index.router.js`; the model referenced `disbursementTransaction`
as if disbursement itself were a payroll-ledger transaction, which — on reflection during this
module's own design pass — it isn't (see `EMPLOYEE_ADVANCE.module.md` §6 for why).

**Fixed while reviewing:** `hr/employee-advance` at its own scheduled turn (module 11) — full rebuild
as an Advance Management Engine, not a CRUD wrapper: Repository Pattern (`.repository.js`, previously
missing), `authorize()`/`checkModuleEnabled("hr")` on every route (previously **completely absent**),
`isDeleted`/`deletedAt`/`deletedBy` added, and mounted at `/hr/employee-advances`. A full guarded
state machine (`draft → submitted → under_review → approved → disbursed → repayment_started →
partially_repaid → fully_repaid → closed`, with `rejected`/`cancelled` terminal branches) replaces the
old flat `status` field any generic `PUT` could set to anything. Real business rules: one-active-
advance-per-employee (enforced at `approve()`), a salary-cap validation against
`EmployeeFinancialProfile.compensation.basicSalary`, currency resolved from the same profile,
guarded repayment recording (rejects overpayment, rejects repaying a paused/non-active advance),
end-of-service settlement (`waived` or `deductedFromFinalPay`), and a payroll-ready deduction preview
(`getPayrollDeductionPreview`) with zero calculation required in Payroll or the frontend.

**Status:** Fixed and integration-tested — 10 tests in `employee-advance-business-rules.test.ts`
covering the full lifecycle, invalid-transition rejection, the salary cap, overpayment rejection, the
one-active-advance rule, and settlement.

---

## HD-011 — `hr/employee-financial-transaction` imported a `.model.ts` that had no compiled sibling; router unmounted — ✅ FIXED (EmployeeFinancialTransaction module)

**Found while reviewing:** `hr/employee-financial-profile` at its own scheduled turn (module 9), same
research pass as HD-012. `employee-financial-transaction.service.js` and `.validation.js` both
`import ... from "./employee-financial-transaction.model.js"`, but the actual file on disk was
`employee-financial-transaction.model.ts` — no `.js` sibling existed, so this import failed at
runtime (same defect class as employee-financial-profile's fixed cross-file naming bug, HD-010).

**Fixed while reviewing:** `hr/employee-financial-transaction` at its own scheduled turn (module 10)
— converted `.ts` to `.js` (type-stripping only, per `BACKEND_FOUNDATION.md` §5 — existing modules
stay JS until their own rebuild turn), added `authorize()`/`checkModuleEnabled("hr")` to every route
(previously **completely absent** — the same severity gap as HD-010), added the missing
`isDeleted`/`deletedAt`/`deletedBy` soft-delete triple (same defect class as HD-002 — the service
already constructs `BaseRepository` with soft-delete enabled), added a `.repository.js` (mandatory
pattern, previously missing), and mounted at `/hr/employee-financial-transactions`. Also added real
business logic: `type`/`category` consistency validation, server-derived `payrollEffect` (never
client-trusted), and a dedicated `approve()`/`cancel()` workflow (previously `isApproved`/
`isCancelled` were raw fields any generic `PUT` could flip with no guard). See
`EMPLOYEE_FINANCIAL_TRANSACTION.module.md` for full detail.

**`relatedPayroll`/`relatedAdvance` back-reference gap** — see new entry HD-014 (fixed as reserved
fields this same turn).

**Status:** Fixed and integration-tested (`employee-financial-transaction-business-rules.test.ts`).

---

## HD-010 — `hr/employee-financial-profile` was completely broken and never mounted — ✅ FIXED (EmployeeFinancialProfile module)

**Found while reviewing:** `hr/employee-financial-profile` at its own scheduled turn (module 9). Every
file cross-imported a nonexistent sibling stem (`./employee-financial.model.js` instead of the actual
`./employee-financial-profile.model.js`, and likewise for `.service.js`/`.controller.js`/
`.validation.js`) — the whole module would throw `ERR_MODULE_NOT_FOUND` at import time. The router
also had **no `authorize()`/`checkModuleEnabled()` at all** (worse than HD-001's JobTitle gap — any
authenticated user could read/write every employee's salary and bank details) and was **never
mounted** in `router/v1/index.router.js`.

The original model also referenced two nonexistent-or-wrong models: `ref: "InsuranceSetting"` (no
such model exists anywhere in the codebase — a pure dangling reference) and `ref: "PaymentMethod"`/
`ref: "TaxConfig"` (both models DO exist, but represent unrelated concepts — sales/POS payment
channels and VAT/sales-tax configuration respectively, not payroll disbursement or income tax;
confirmed by reading both models in full before deciding not to reuse them).

**Action taken:** full redesign (not a naming fix) — see `EMPLOYEE_FINANCIAL_PROFILE.module.md` for
the complete field-by-field rationale. Rebuilt with the Repository Pattern (new
`employee-financial-profile.repository.js`), real business logic (salary-band validation against
`JobTitle.salaryBand` — the first consumer of that reserved field since module 3; cost-center
default from `JobTitle.costCenter`; compensation defaults resolved from
`EmployeeSettings.payroll`; a `computePayrollEligibility()` readiness check), `authorize()`+
`checkModuleEnabled("hr")` added to every route, and mounted at `/hr/employee-financial-profiles`.

**Status:** Fixed and integration-tested (`employee-financial-profile-business-rules.test.ts`).

---

## HD-009 — AttendanceRecord's lateness/overtime math ignores BranchSettings.timezone

**Found while reviewing:** `hr/attendance-record` at its own scheduled turn (module 7).
`attendance-record.domain.js#minutesFromMidnight` reads `arrivalTime`/`departureTime`'s stored UTC
hour/minute directly — the same convention `Shift.startMinutes`/`endMinutes` already use (both are
timezone-naive by design). This is consistent within HR, but neither actually converts through
`BranchSettings.timezone` (the project's authoritative timezone source, per
`branch-settings.service.js#getLocalDayAndTime`), so a brand whose server/client clocks and configured
branch timezone disagree could see lateness computed against the wrong wall-clock time.

**Not fixed here:** doing this properly requires either (a) requiring every client to send
already-timezone-adjusted UTC instants that correctly represent the branch's local wall-clock time at
capture time, or (b) this module converting through `BranchSettings.timezone` explicitly. Both are
larger decisions than this module's own turn should make unilaterally, and `Shift` (module 4, already
complete) has the identical gap — fixing only AttendanceRecord would still leave Shift's own
start/end times timezone-naive, which is the actual root of the mismatch.

**Owning module:** cross-cutting between `hr/shift` and `hr/attendance-record`; revisit once a real
multi-timezone brand is being onboarded, or as part of a dedicated Foundation-level pass — not a
single HR module's own turn to unilaterally redesign.

**Status:** Recorded, not fixed. Documented in `ATTENDANCE_RECORD.module.md` §14 as a known limitation.

---

## HD-008 — AttendanceSettings' policy engine is not wired into AttendanceRecord — ✅ FIXED (AttendanceRecord module)

**Found while reviewing:** `hr/attendance-settings` at its own scheduled turn (module 6), built as a
full policy engine per the project owner's explicit instruction for this module (not a thin CRUD
wrapper). `hr/attendance-record` computed `isLate`/`lateMinutes`/`leftEarly`/`earlyMinutes`/
`isOvertime`/`overtimeMinutes` from whatever the client sent — it did not consult any policy at all.

**Fixed while reviewing:** `hr/attendance-record` — `attendance-record.domain.js#evaluateAttendance`
now calls `attendance-settings.domain.js`'s pure functions against the branch's resolved policy
(`attendance-settings.service.js#resolveForBranch`), and `attendance-record.service.js`'s
`beforeCreate`/`update` always overwrite any client-sent value for these fields — confirmed
empirically with a test that deliberately sends `isLate:false, lateMinutes:999` and asserts the
server-computed values win instead.

**Status:** Fixed. Unit/integration-tested in `attendance-record-business-rules.test.ts`.

---

## HD-007 — `EmployeeSettings.attendance`/`.defaultWork` now duplicate AttendanceSettings' scope

**Found while reviewing:** `hr/attendance-settings` at its own scheduled turn (module 6).
`employee-settings.model.js` already has an `attendance: {enableAttendance, allowLateCheckIn,
lateToleranceMinutes, overtimeEnabled, maxOvertimeHoursPerDay, requireGeoLocation}` sub-object and a
`defaultWork: {dailyWorkingHours, weeklyOffDays, maxWorkingHoursPerWeek}` sub-object — both cover
ground `hr/attendance-settings` is now the dedicated, more granular, branch-overridable source of
truth for (late tolerance, overtime policy, weekly off days, geofencing/GPS attendance, working-hour
limits).

**Not fixed here:** `hr/employee-settings` has not had its own formal turn yet (module 8) — its model
was not modified as part of this module's work, per the established Category B process (a Domain
issue is recorded, not fixed mid-flight, unless it's actively blocking the current module — it is
not).

**Owning module:** `hr/employee-settings` — module 8.

**Fixed while reviewing:** `hr/employee-settings` — chose option (a): removed `attendance` and
`defaultWork` entirely. Confirmed safe (not merely "probably safe") by grepping the whole repo for
any consumer of either sub-object before deleting — zero matches outside the model file itself, so
this is a pure Single-Source-of-Truth cleanup, not a behavior change. `AttendanceSettings` is now the
sole source of truth for attendance/work-hour policy.

**Status:** Fixed. Verified with a schema-introspection test asserting both paths no longer exist.

---

## HD-006 — `hr/shift-settings` was never an HR module — relocated to `finance/cashier-shift-settings`

**Found while reviewing:** `hr/shift-settings` at its own scheduled turn (module 5). Every field
(`autoOpen`, `autoClose`, `allowNegativeCash`, `maxDifferenceAllowed`) describes POS/cashier-till
behavior; the module's own router already gated on `checkModuleEnabled("financial")`, not `"hr"`,
even before this move. Already flagged pre-session in `ARCHITECTURE_REVIEW.md` §3 and
`IMPLEMENTATION_PLAN.md` R9.

**Action taken:** relocated (model/validation/repository/service/controller/router) to
`finance/cashier-shift-settings/`, confirmed explicitly with the project owner first (a cross-domain
file move is a different class of change from every other fix in this rollout). Kept the external
API path (`/api/v1/hr/shift-settings`) and the `authorize()` resource string (`"ShiftSettings"`)
unchanged for backward compatibility. Registered Mongoose model renamed to `CashierShiftSettings`
with `collection: "shiftsettings"` pinned explicitly — no data migration needed.

**New finding surfaced by this move, NOT fixed (Finance-domain scope, not HR):**
`finance/cashier-shift.service.js` is pure generic CRUD with **zero business logic** — no close-shift
action, no variance computation, nothing reads these settings at all. Wiring
`CashierShiftSettings` into an actual enforcement point requires building that workflow first — a
substantial new piece of Finance-domain logic, explicitly out of scope for the HR rollout. See
`finance/cashier-shift-settings/CASHIER_SHIFT_SETTINGS.module.md` §9/§12 for detail.

**Status:** Relocation done. Actual consumption by `cashier-shift` remains unbuilt — Finance domain's
own future work.

---

## HD-001 — JobTitle router has no `authorize()`/`checkModuleEnabled()` at all — ✅ FIXED (JobTitle module)

**Found while reviewing:** `hr/employee`. **Fixed while reviewing:** `hr/job-title` — every route now
follows the standard `authorize("JobTitles", action)` + `checkModuleEnabled("hr")` chain.

**Bonus finding surfaced during the fix:** the JobTitle router was also never imported/mounted in
`router/v1/index.router.js` at all — completely unreachable via the API. Since `Employee.jobTitle`
is required, this meant there was no way to create a JobTitle through the generic admin API, which
transitively blocked Employee creation. Fixed in the same pass (added the missing import + mount at
`/hr/job-titles`).

---

## HD-002 — Shift/AttendanceRecord models had no `isDeleted` field despite soft-delete being enabled — ✅ FIXED

**Found while reviewing:** `hr/employee`. AttendanceRecord's own instance of this defect was fixed ad
hoc that same session, before the formal module-by-module rollout began (its own formal turn, module
7, re-confirmed the fix was still correct and added no regression). **Fixed while reviewing:**
`hr/shift` — `isDeleted` added, confirmed identical to `AttendanceRecord`'s defect (`buildBaseQuery()`'s
`{isDeleted:false}` filter matched nothing since the field didn't exist, so `getAll`/`findById`
silently returned empty/404). Verified fixed with a live `getAll()`/`findById()` test.

**Bonus finding surfaced during the fix:** `shift.model.js` also had two *contradictory* unique
indexes on `code` — a brand-wide `{brand,code}` unique index coexisting with the correct
`{brand,branch,code}` one, making the module's own stated intent (`code` unique **per branch**)
impossible (two branches could never share a code like "MORNING"). Removed the brand-wide one.

**Bonus finding #2 — escalated FT-003 from "flagged" to "confirmed and partially fixed":** writing
Shift's own integration test (which needs two branches in one brand) hit the exact latent bug FT-003
predicted in `organization/branch`'s `{brand,code}` sparse index. This was no longer hypothetical —
it was actively blocking HR module work, so it was fixed in the same pass (see
`BACKEND_FOUNDATION_TECH_DEBT.md` FT-003 for detail). `organization/delivery-area`'s equivalent
indexes are still unverified/unfixed — the Organization domain was not reopened beyond this one
line.

---

## HD-003 — `Employee.usesCustomLeavePolicy` has no resolution logic — ✅ FIXED (EmployeeSettings module)

**Found while reviewing:** `hr/employee`. The flag and the snapshot fields
(`annualLeaveDays`/`emergencyLeaveDays`/`sickLeaveDays`) exist on Employee, but nothing read
`EmployeeSettings.leavePolicy` at employee-creation time to populate sensible brand-policy defaults.

**Fixed while reviewing:** `hr/employee-settings` — `employee-settings.service.js#resolveLeavePolicyDefaults`
is called from `employee.service.js#beforeCreate` (via `applyToNewEmployee`), filling in any of the
three snapshot fields the caller didn't explicitly supply, only when `usesCustomLeavePolicy` is
falsy. Fail-open: a brand with no `EmployeeSettings` document yet is unaffected — Employee keeps its
own schema defaults exactly as before.

**Still NOT built:** re-syncing an already-created, non-overridden employee's snapshot values if
brand policy changes *after* that employee was created — these fields remain a point-in-time
snapshot, not a live link. Doing that properly needs a deliberate "reapply brand policy to all
non-custom employees" operation (likely bulk, likely audit-logged), which is new scope beyond wiring
creation-time defaults — recorded as a documented limitation in `EMPLOYEE_SETTINGS.module.md` §12,
not built here.

**Status:** Creation-time resolution fixed and integration-tested
(`employee-settings-business-rules.test.ts`). Re-sync-on-policy-change remains a documented future
extension. **See also HD-016** — this fix only covered Employee's own 3-field snapshot; the full
16-leave-type policy engine `hr/leave-request` (module 12) needed required a further redesign of
`EmployeeSettings.leavePolicy` itself.

---

## HD-004 — Department `{brand, code}` sparse unique index is not actually sparse for a compound index — ✅ FIXED (Department module)

**Found while reviewing:** `hr/employee`. **Fixed while reviewing:** `hr/department` — replaced with
a `partialFilterExpression`-based index; synced against the real dev database (not just the schema
file) with explicit approval, since Mongoose doesn't auto-migrate existing indexes. Verified fixed
with a live test creating two codeless departments in the same brand.

This same pattern (naive `sparse: true` on a compound index) turned out to be more widespread — see
`BACKEND_FOUNDATION_TECH_DEBT.md` FT-003 for the other confirmed instance (`organization/branch`,
fixed) and the still-unverified one (`organization/delivery-area`).

---

## HD-005 — No Roster/ShiftAssignment module; `Employee.shift` vs `AttendanceRecord.shift` optionality mismatch — part 2 ✅ FIXED (AttendanceRecord module)

**Found while reviewing:** `hr/shift`. Two related gaps:

1. **No day-by-day schedule model exists.** `Employee.shift` is a single, permanent default
   assignment — there is no way to represent "works morning Mon-Wed, evening Thu-Fri" or a one-off
   shift swap. A real Roster/ShiftAssignment module is a legitimate gap for professional restaurant
   HR, but is a genuinely new module, out of this rollout's fixed 14-module scope (confirmed with
   the project owner before proceeding rather than built speculatively). **Still open** — no owner in
   the current 14-module list; flagged for whoever scopes future HR work.
2. **`Employee.shift` is optional (`default: null`) but `AttendanceRecord.shift` is `required`.** An
   employee with no default shift assigned cannot get a well-formed AttendanceRecord if the field is
   copied naively from Employee at clock-in time. **Fixed while reviewing:** `hr/attendance-record`
   (module 7) — `attendance-record.service.js#resolveShiftId` falls back to `Employee.shift` only
   when the caller doesn't supply one explicitly, and fails with a clear, actionable 400 ("this
   employee has no default shift — specify one explicitly") instead of a raw Mongoose "shift is
   required" error when neither is available. This does not build a Roster module (gap (1) above
   remains open) — it only makes the existing single-default-shift model fail predictably instead of
   silently.

**Status:** Part 1 still open (new-module candidate, out of scope). Part 2 fixed and
integration-tested (`attendance-record-business-rules.test.ts`).
