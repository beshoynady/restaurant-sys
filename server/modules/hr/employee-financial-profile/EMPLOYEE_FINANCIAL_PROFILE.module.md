# Employee Financial Profile (HR) — Engineering Documentation

## 1. Overview

The Single Source of Truth for one employee's compensation, payroll eligibility, disbursement
method, tax/insurance identifiers, cost-center assignment, and end-of-service policy — one document
per employee (`{employee}` unique). Module 9 of the fixed 14-module HR rollout.

**This module was completely non-functional before this turn**: every internal cross-import
referenced a wrong filename stem (`ERR_MODULE_NOT_FOUND` at startup), the router had no
`authorize()`/`checkModuleEnabled()` at all, and it was never mounted in
`router/v1/index.router.js`. It has been rebuilt from scratch, not patched — see §13.

## 2. Business Purpose

Payroll (module 15, not yet built) needs one authoritative place to answer "how much does this
employee earn, how, and is it safe to include them in this payroll run" — without re-deriving that
from scattered fields on `Employee`, guessing at brand defaults, or trusting whatever a client sends
at calculation time. This module is that place.

## 3. Financial Lifecycle

1. An `Employee` is hired and assigned a `department`/`jobTitle` (already required on Employee).
2. HR creates this employee's Financial Profile: `basicSalary`, `salaryStartDate`, disbursement
   method, bank details if applicable. Compensation type/currency/pay-day fall back to
   `EmployeeSettings.payroll` brand defaults if not explicitly set (§5, §9).
3. `basicSalary` is validated against `JobTitle.salaryBand` if that job title has one configured
   (§5) — the first real consumer of that field, reserved since module 3.
4. `costCenter` defaults from `JobTitle.costCenter` if not explicitly set (§5, §9) — accounting-ready
   without forcing every profile to redundantly re-select it.
5. Before any future payroll run, `computePayrollEligibility()` gates whether this employee's
   profile is complete enough to be paid (§5, §7).
6. `salaryEndDate` (already on the model) and `isActive:false` represent the profile's own end —
   e.g. a pending termination settlement — without deleting financial history.

## 4. Relationships

```
Employee ──(1:1)──→ EmployeeFinancialProfile
                          │
JobTitle.salaryBand ──────┼── validates basicSalary (§5)
JobTitle.costCenter ──────┼── defaults costCenter (§5)
EmployeeSettings.payroll ─┼── defaults salaryType/currency/payDay (§5)
CostCenter ────────────────┘  (accounting/, referenced directly — see §9)

NOT referenced: payments/PaymentMethod, system/TaxConfig — see §13 for why.
Future consumer (not built): Payroll (module 15) — see HD-013.
```

## 5. Business Rules

All new this turn (the original module had zero business logic — a bare, broken CRUD skeleton):

1. **One profile per employee** — `{employee}` unique index (pre-existing, unchanged).
2. **Compensation defaults**: `salaryType`/`currency`/`payDay` resolve from
   `EmployeeSettings.payroll.defaultSalaryType`/`.defaultCurrency`/`.payrollCycleDay` for any field
   the caller didn't explicitly supply. Fail-open: no `EmployeeSettings` doc yet → the schema's own
   defaults apply.
3. **Salary-band validation**: if the employee's `JobTitle.salaryBand.min`/`.max` is configured,
   `basicSalary` outside that range is rejected with a clear `400`. Only enforced when the job title
   actually has a band — most won't.
4. **Cost-center default**: `costCenter` defaults from `JobTitle.costCenter` when not explicitly
   supplied.
5. **Bank-transfer disbursement requires bank details**: `disbursement.method: "bank_transfer"`
   without `disbursement.bankDetails.bankAccount` or `.IBAN` is rejected at the schema level
   (`pre("validate")`).
6. **`employee` is immutable after creation** — excluded from the update schema; reassigning a
   financial profile to a different employee is not a legitimate update, it's creating a new profile
   for the new employee and (soft-)deleting the old one.
7. **Payroll eligibility** (`computePayrollEligibility`): not a stored field, a computed verdict —
   checks `isActive`, `basicSalary > 0`, `salaryStartDate` set and not in the future, `salaryEndDate`
   not already passed, and the bank-details rule again (defensively, in case a document was created
   before this rule existed or edited directly). Returns every missing requirement at once.

## 6. Payroll Flow (current vs. intended)

**Today**: nothing consumes this module yet — `hr/payroll`'s own model stores its own raw
`basicSalary` snapshot per pay period with no reference back here, and `payroll.service.js` is
confirmed pure CRUD (see `HR_TECHNICAL_DEBT.md` HD-013). This module does not change Payroll's
behavior — it makes the *data Payroll will need* correct and queryable for the first time.

**Intended** (module 15's own turn): Payroll creation reads `getFinancialSummary(employeeId)` instead
of accepting a raw `basicSalary` per period, and refuses to calculate a payroll run for any employee
whose `computePayrollEligibility()` isn't `eligible: true`.

## 7. API Documentation

Base path: **`/api/v1/hr/employee-financial-profiles`**. Standard CRUD + soft-delete/restore/bulk
(update excludes `employee`), plus:

- **`GET /employee/:employeeId`** — the profile for one employee (404 if none exists). The frontend
  almost always has an employee id in context, not the profile's own id.
- **`GET /employee/:employeeId/eligibility`** — `{eligible, missingRequirements[]}`.
- **`GET /employee/:employeeId/summary`** — `{profile, eligibility}` in one call.

**Known issue (Foundation, not this module — see `BACKEND_FOUNDATION_TECH_DEBT.md` FT-001):**
`DELETE /bulk-delete` is unreachable (shadowed by `/:id` DELETE). Not fixed here.

## 8. Frontend Integration Guide

- **Employee financial-profile tab**: `GET /employee/:employeeId` to load, `POST /` to create (first
  time) or `PUT /:id` to edit. No client-side salary-band or bank-details validation needed — both
  are enforced server-side with clear error messages.
- **Payroll-readiness checklist / dashboard**: `GET /employee/:employeeId/eligibility` — render
  `missingRequirements` directly, no client-side derivation.
- **Employee 360 view**: `GET /employee/:employeeId/summary` for a single combined call.

## 9. Integration

- **`hr/employee-settings`**: `EmployeeSettings.payroll` is read (not duplicated) for compensation
  defaults — see §5.
- **`hr/job-title`**: `JobTitle.salaryBand`/`.costCenter` are read (not duplicated) — the first real
  consumers of both fields since they were reserved in module 3.
- **`accounting/cost-center`**: `costCenter` is a direct `ref: "CostCenter"` — already an established
  pattern (`JobTitle.costCenter` did this first). No posting logic exists yet; `Account.systemRole`
  already has `PAYROLL_EXPENSE`/`ACCRUED_SALARY`/`EMPLOYEE_ADVANCE` roles waiting for that future
  work (Accounting integration is deferred project-wide, not this module's scope to build).
- **`hr/payroll`** (module 15, not yet built): see HD-013 — the intended future consumer.
- **`hr/employee-financial-transaction`** (module 10) / **`hr/employee-advance`** (module 11): both
  discovered broken while researching this module's design (HD-011/HD-012) but **not fixed here** —
  out of this module's own turn. Neither references `EmployeeFinancialProfile` today.
- **Deliberately NOT integrated**: `payments/payment-method` (POS/sales payment channels — a
  different concept from payroll disbursement) and `system/tax-settings` (VAT/sales-tax configuration
  — unrelated to employee income tax). See §13.

## 10. Security

`authorize("EmployeeFinancial", action)` + `checkModuleEnabled("hr")` added to every route this
turn (previously **completely absent** — any authenticated user could read/write any employee's
salary and bank account details, regardless of role). `RESOURCE_ENUM` already had this string from
before this rollout — no change needed there.

## 11. Reporting

None built this turn — `computePayrollEligibility`/`getFinancialSummary` are the "ready-to-use data"
primitives a future payroll-readiness dashboard would call, not a report themselves.

## 12. Future Extensions

- Wiring `hr/payroll` (module 15) to actually consume this module — HD-013.
- `overtimePay.percentageOfHourlyRate`, `governmentInfo.incomeTaxRatePercentage`/
  `.socialInsuranceRatePercentage`, `endOfServiceRules.*`, `leaveSalaryRules.*` — all reserved,
  awaiting the calculation engine that would consume them (Payroll/PayrollItem, modules 14-15).
- A real income-tax-bracket engine (currently a flat `incomeTaxRatePercentage` placeholder) if the
  business ever needs progressive tax brackets rather than a flat rate.
- Fixing HD-011 (`employee-financial-transaction`'s `.ts` import) and HD-012
  (`employee-advance`'s incompatible hand-written service) at their own module turns.

## 13. Technical Decisions

- **Full redesign, not a naming-bug patch.** The module was never functional in any deployed sense
  (broken imports since creation, never mounted) — there is no production data and no external
  contract to preserve, so a clean redesign carries zero migration risk. Kept only the
  `{employee}` unique index and the overall "one profile per employee" shape from the original.
- **Removed the flat top-level `bankName`/`bankAccount`/`IBAN`/... fields and `workingDays`, grouped
  the rest into `compensation`/`eligibility`/`overtimePay`/`disbursement`/`governmentInfo`.**
  `workingDays` was dropped entirely rather than regrouped — it would have been a *third* copy of
  "which days does this employee work" alongside `Employee.weeklyOffDay` (per-employee override) and
  `AttendanceSettings.workCalendar.weeklyOffDays` (brand/branch policy) — exactly the
  multiple-sources-of-truth problem this rollout has been actively removing (see HD-007). This
  module has no legitimate reason to hold a third copy.
- **Did NOT reuse `payments/payment-method` (`PaymentMethod`) for `disbursement.method`.** Read that
  model in full before deciding: it's POS/sales payment channels tied to a `CashRegister` or
  `PaymentChannel` via a dynamic `refPath` — a fundamentally different concept from "how does the
  company pay this employee's salary." Reusing it despite the name match would have been the wrong
  kind of reuse — matching a word, not a concept.
- **Did NOT reuse `system/tax-settings` (`TaxConfig`) for `governmentInfo`.** Also read in full: it's
  exclusively VAT/sales-tax configuration (percentage, discount handling, `vatReceivableAccount`) —
  unrelated to employee income tax or payroll withholding. Embedded simple flat-rate fields instead
  of either forcing a wrong reuse or building a whole new "employee tax config" module (which would
  have violated this rollout's fixed 14-module scope).
- **Removed `ref: "InsuranceSetting"` entirely** — that model doesn't exist anywhere in the codebase;
  it was a pure dangling reference in the original. Replaced with embedded
  `governmentInfo.socialInsuranceNumber`/`.socialInsuranceRatePercentage` rather than inventing a new
  top-level module for the same reason as `TaxConfig` above.
- **`update()` fully overridden, not just `beforeUpdate`**, for the same reason as
  `hr/attendance-record`'s equivalent override: re-validating the salary band on a partial update
  needs the existing document merged with the incoming change, which `beforeUpdate` alone can't see.
- **No changes made to `Employee`, `EmployeeSettings`, `JobTitle`, `Department`, `Shift`, or
  `AttendanceSettings`.** Every integration point this turn needed was satisfiable by reading their
  existing fields.

## 14. Developer Notes

- If you're looking for **POS/sales payment methods**, that's `payments/payment-method`, not this
  module's `disbursement.method` (a much smaller, payroll-specific enum).
- If you're looking for **VAT/sales tax**, that's `system/tax-settings`, not this module's
  `governmentInfo` (employee income-tax/insurance identifiers only).
- `JobTitle.salaryBand`/`.costCenter` have existed since module 3 with a comment noting "nothing
  reads this yet" — this module is that first reader. If you're modifying `JobTitle`, know that this
  module now depends on both fields' shape.
