# Job Title (HR) Module Documentation

## Overview
A specific job position within a department (e.g. "Head Chef," "Cashier"), optionally scoped to
one branch. Brand-scoped, soft-delete enabled.

## Role in the HR subsystem — architectural analysis summary
Before implementing this module, every other HR module was checked for an actual dependency on
JobTitle. Result: **only `Employee` references it** (`Employee.jobTitle`) — Payroll, PayrollItem,
AttendanceRecord, Shift, LeaveRequest, EmployeeFinancialProfile, and EmployeeFinancialTransaction
have zero relationship with JobTitle today. This shaped which fields below were added as *reserved*
(no consuming logic yet) versus deliberately left out as premature:

**Added (reserved for future integration, not yet read by any code):**
- `code` — integration/reporting identifier, matching Department/Shift's existing pattern.
- `level` — job level/grade.
- `salaryBand: {min, max}` — not validated against `EmployeeFinancialProfile.basicSalary` yet.
- `overtimeEligible`, `maxOvertimeHoursPerMonth` — extends `PayrollItem`'s existing
  `attendanceRule`/formula design rather than inventing new overtime architecture.
- `approvalLevel` — for a future shared Approval Framework (`LeaveRequest`/`EmployeeAdvance`/
  `EmployeeFinancialTransaction` all have an `approvedBy` actor field today with no rule
  restricting *who* may approve).
- `costCenter` (ref `Account`'s sibling `CostCenter`) — for future expense-allocation/accounting
  integration; no posting logic exists yet anywhere in this project (deferred by design).

**Deliberately NOT added, with reasoning:**
- Default shift / default attendance / default leave policy — `Employee.shift` and
  `Employee.usesCustomLeavePolicy` (+ `EmployeeSettings.leavePolicy` for brand-wide defaults)
  already cover this at the right layers; a third JobTitle-level default layer with zero consumers
  would be speculative.
- Bonus/commission eligibility — commission in particular is a Sales-domain concept, out of HR's
  scope.
- Required-permissions → IAM Role mapping — real future integration (parallel to Employee's
  `hasAccount` TODO), not implemented now.
- Managerial/reporting hierarchy — `Employee.reportsTo` (added in the Employee module) is the
  correct place; employees sharing one job title may report to different people.
- Career ladder / promotion path, structured skills/certifications, default working hours, vacancy
  tracking — no consumer exists anywhere in the current 14-module HR rollout; would be inventing
  structure with zero users.
- Default benefits/allowances/deductions — the architecturally correct future shape is
  `defaultPayrollItems: [{item: ref PayrollItem, amount}]` on JobTitle, but `PayrollItem` itself is
  currently broken/unmounted (see `HR_TECHNICAL_DEBT.md`) — premature to couple to it now.

## Business rules
- **Cannot delete a job title with employees still assigned** — same integrity pattern as
  Department, via `employeeService.count({filters: {jobTitle}})`.
- **`{brand, code}` uniqueness** only when `code` is actually set (partial-filter index, same
  corrected pattern as Department's `{brand,code}` fix).

## Endpoints

Base path: `/api/v1/hr/job-titles`.

**Critical finding, fixed as part of this module's rollout:** this router was never imported or
mounted in `router/v1/index.router.js` at all — completely unreachable via the API. Since
`Employee.jobTitle` is required, this meant there was no way to create a JobTitle at all through the
API, which transitively blocked Employee creation for any brand relying on the generic admin API
(not just `system-setup`'s bootstrap flow, which bypasses validation entirely). Now mounted.

Standard CRUD + soft-delete/restore + bulk-soft-delete/bulk-hard-delete (BaseController
conventions). **Previously this router had NO `authorize()`/`checkModuleEnabled()` at all** — any
authenticated user, regardless of role, could manage job titles. Fixed: every route now follows the
same `authorize("JobTitles", action)` + `checkModuleEnabled("hr")` chain as every other HR router.

**Query filters**: `department`, `branch`, `status` (in addition to the generic
page/limit/search/includeDeleted/sort/select).

**Stats**: `GET /count-by-department` — active job title counts grouped by department, for admin
dashboards.

**Known issue (Foundation, not JobTitle-specific — see `BACKEND_FOUNDATION_TECH_DEBT.md` FT-001):**
`DELETE /bulk-delete` is currently unreachable (shadowed by `/:id` DELETE). Not fixed here.

## Implementation Notes
- Repository Pattern (`job-title.repository.js` extends `BaseRepository`; `job-title.service.js`
  extends the repository) — previously no repository file existed, and the service passed the
  wrong option key names (`softDelete`/`searchFields`), silently disabling search.
- Search covers `code` plus every `SUPPORTED_LANGUAGES` key of `name`.
