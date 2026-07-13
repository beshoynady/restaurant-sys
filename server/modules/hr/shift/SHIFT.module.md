# Shift (HR) Module — Engineering Documentation

## 1. Overview

`Shift` is a **reusable time-window template** for staff scheduling within one branch (e.g.
"Morning," "Night") — not related to the cashier/POS shift concept in `hr/shift-settings`. It
defines *when* a shift runs (`startMinutes`/`endMinutes`, `shiftType`) and is referenced by
`Employee.shift` as a default assignment, and by `AttendanceRecord.shift` per clock-in.

## 2. Business Purpose

Restaurants need a way to define recurring work-time windows once per branch and assign staff to
them, instead of every employee's hours being freeform. This module solves the *definition* problem
(what does "morning shift" mean at this branch). It does **not** solve day-by-day scheduling/roster
assignment ("who works which shift on which date") — see §12 Future Extensions.

## 3. Database Design

| Field | Type | Why |
|---|---|---|
| `brand`, `branch` | ObjectId refs, required | Shift is inherently branch-specific — different branches run different hours |
| `name` | Multilingual Map | Display name |
| `code` | String, required, unique **per branch** | Internal identifier for reporting/integration |
| `shiftType` | enum | Coarse classification |
| `startMinutes`/`endMinutes` | Number 0-1439 | Minutes-from-midnight representation — avoids timezone-string parsing bugs. **`endMinutes < startMinutes` is valid and means the shift crosses midnight** (e.g. 22:00→06:00). `startMinutes === endMinutes` is rejected (ambiguous — could mean 0 minutes or 24 hours) |
| `status` | enum (draft/active/inactive/archived) | Lifecycle |
| `notes` | String | Free text |
| `createdBy`/`updatedBy`/`deletedBy` | ref `UserAccount` | Correct actor convention (not `Employee` — this module never had the actor-ref inconsistency found elsewhere in HR) |
| `isDeleted`/`deletedAt` | Boolean/Date | **`isDeleted` was previously absent entirely** despite `enableSoftDelete: true` on the service — see §13 |

### Indexes
- `{brand:1, branch:1, code:1}` unique, `partialFilterExpression: {deletedAt: null}` — unique per **branch**, soft-delete-aware.
- `{brand:1, branch:1, shiftType:1}`, `{branch:1, startMinutes:1, endMinutes:1}` — query-shape indexes.
- A brand-wide `{brand:1, code:1}` unique index previously also existed — **removed**, see §13.

## 4. Relationships

```
Brand ─┐
Branch ┼─→ Shift ←── Employee.shift (optional, default assignment)
       │              ↑
       └──────── AttendanceRecord.shift (required, per clock-in)
```

Verified against every other HR module (Payroll, PayrollItem, LeaveRequest, EmployeeFinancialProfile,
EmployeeFinancialTransaction, EmployeeAdvance, EmployeeSettings): **none reference Shift**. Only
Employee and AttendanceRecord do.

## 5. Business Rules

1. **`{brand, branch, code}` uniqueness**, soft-delete aware.
2. **A shift cannot have identical start/end minutes** (model-level validator).
3. **Overnight shifts are valid** — `endMinutes < startMinutes` means the shift crosses midnight; duration must be computed with wraparound (`shift.domain.js#computeShiftDurationMinutes`), never as a naive subtraction.
4. **Cannot delete a shift with employees still assigned** (`Employee.shift` reference) — enforced via `employeeService.count({filters:{shift}})`, same integrity pattern as Department/JobTitle.

## 6. Workflow

Create (draft/active) → optionally assigned as `Employee.shift` → referenced by
`AttendanceRecord.shift` on each clock-in → `archived` when retired (existing AttendanceRecord/Employee
references are unaffected; archiving only blocks *new* assignment convention-wise, not enforced at
schema level today).

## 7. API Documentation

Base path: `/api/v1/hr/shifts`. All routes: `authenticateToken → authorize("Shifts", action) →
checkModuleEnabled("hr") → validate(schema)`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/` | Create |
| GET | `/` | List (filters: `branch`, `code`, `status`, `shiftType`; free-text `search` over `code`+`name` in every supported language) |
| GET | `/count` | Total count (⚠ ignores filters — `BaseController.count()` bug, see `BACKEND_FOUNDATION_TECH_DEBT.md` FT-002) |
| GET | `/:id` | Single |
| PUT | `/:id` | Update |
| DELETE | `/:id` | Hard delete (blocked if employees assigned) |
| PATCH | `/soft-delete/:id` | Soft delete (same guard) |
| PATCH | `/restore/:id` | Restore |
| DELETE | `/bulk-delete` | ⚠ Currently unreachable — see FT-001 |
| PATCH | `/bulk-soft-delete` | Bulk soft delete |

## 8. Frontend Guide

1. `GET /` with `branch` filter to populate a branch's shift list/dropdown.
2. `GET /?status=active` for assignment dropdowns (exclude draft/archived).
3. Create/update forms should let the user pick start/end as HH:mm and convert to
   minutes-from-midnight client-side; if end < start, show "(overnight)" — this is valid, not an error.
4. No dedicated "duration" field is returned by the API (see §13) — compute `endMinutes - startMinutes`
   client-side, adding 1440 if negative, to match `shift.domain.js`'s logic exactly.

## 9. Integration

- **Payroll/PayrollItem**: no integration today. Night-shift pay differentials, if ever built, belong
  in `PayrollItem.rateBase` (a rate/compensation concept), not in Shift (a time-window concept) — see
  §13 for the reasoning.
- **AttendanceRecord**: `AttendanceRecord.shift` is `required`, while `Employee.shift` is optional —
  an employee with no default shift cannot get a well-formed attendance record if that field is
  copied naively. Flagged in `HR_TECHNICAL_DEBT.md` for resolution at AttendanceRecord's own turn.
- **Accounting**: none. Not applicable to a scheduling template.

## 10. Security

- Brand + branch scoped (`brandScoped: true`; `branch` is a required field checked by application
  logic, not `branchScoped: true` on the repository — Shift *is* branch-specific data, but list/read
  queries are filtered by brand only, with `branch` as an explicit, always-present field rather than
  an automatic repository-level filter, matching how this module was already built).
- Full `authorize()`/`checkModuleEnabled("hr")` on every route (already correct — unlike JobTitle,
  which needed this fixed in its own turn).
- Soft delete now functions correctly (see §13).

## 11. Reporting

No dedicated stats endpoint was added for this module (unlike JobTitle's `count-by-department`) —
no concrete admin/dashboard need was identified for "shifts per branch" beyond the existing list
endpoint with a `branch` filter, which already serves that purpose without duplicating logic.

## 12. Future Extensions

- **Roster/ShiftAssignment module**: a proper day-by-day schedule ("Employee X works Shift Y on date
  Z") does not exist anywhere in this codebase — `Employee.shift` is a single, permanent default.
  This is a real gap for professional restaurant HR but is a genuinely separate module, out of this
  rollout's fixed 14-module scope. Not built here — flagged as HR domain technical debt.
- **Shift differential pay**: see §9 — belongs to `PayrollItem` when that module is rebuilt, not here.

## 13. Architecture Decisions

- **Removed the brand-wide `{brand, code}` unique index.** It coexisted with the correct
  `{brand, branch, code}` index and made the module's own stated intent (`code` uniqueness *per
  branch*) impossible — two branches could never share a simple code like "MORNING." It was also not
  soft-delete-aware. Confirmed as a real, live blocker (not just a plausible bug) while writing this
  module's own integration test, which needs two branches in one brand to exist.
- **Added `isDeleted` (HD-002).** Confirmed via the same read-path failure already found and fixed in
  `AttendanceRecord`: `BaseRepository`'s default soft-delete filter (`{isDeleted: false}`) matches
  nothing when the field doesn't exist on any document, so every list/read query silently returned
  empty. Verified fixed via a live `getAll()`/`findById()` test.
- **Rejected `start === end`.** Previously unvalidated; ambiguous (0 minutes vs. 24 hours) and
  provides no useful shift definition either way.
- **Did not reject `endMinutes < startMinutes`.** This is the *correct* representation of a
  legitimate overnight shift, not an error — rejecting it would break every night-shift restaurant.
  Instead, `shift.domain.js` provides a pure, wraparound-aware duration calculation.
- **Did not build a Roster/ShiftAssignment module**, despite it being a real gap, because it is out
  of this module's own scope and the fixed HR execution order (confirmed with the project owner
  before proceeding).
- **`status`/`shiftType` removed from free-text search fields.** They're short enum values already
  exposed as exact-match query filters — fuzzy-regex-searching an enum is the wrong tool; kept only
  `code` and multilingual `name` in `searchableFields`.

## 14. Developer Notes

- Repository Pattern: `shift.repository.js` (new) owns all Mongoose access; `shift.service.js`
  extends it and owns the employee-reference delete guard; `shift.domain.js` (new) holds the one pure
  calculation this module needs (duration with overnight wraparound) — no `workflow.js` was needed
  (no multi-step approval/state-machine process exists for Shift itself).
- If you add a field that affects payroll calculation later, put the *rate* on `PayrollItem`, not on
  `Shift` — Shift answers "when," PayrollItem answers "how much." Don't conflate the two even if it
  seems convenient in the moment.
- Every list/read query relies on `isDeleted` existing on every document. If you ever bulk-import
  Shift documents outside the API (e.g. a migration script), make sure `isDeleted: false` is set
  explicitly — Mongoose's schema `default` only applies to documents created through Mongoose itself,
  not raw driver inserts.
