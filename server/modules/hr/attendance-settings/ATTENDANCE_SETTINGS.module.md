# Attendance Settings (HR) — Engineering Documentation

## 1. Overview

Configuration-only Attendance Policy Engine: defines how attendance is captured, what counts as
late/early/absent, break rules, overtime and pay-differential rules, cross-midnight attribution, and
the (currently unbuilt) integration points for approval workflows, notifications, geofencing, and
Payroll locking. It stores **policy**, never attendance **data** — actual clock-in/out events live in
`hr/attendance-record`.

Module 6 of the fixed 14-module HR rollout. Built as a genuine policy engine per the project owner's
explicit direction for this module, not a thin CRUD wrapper — but strictly scoped to the existing
14-module list: no new top-level HR modules were created (see §13, §14).

## 2. Business Purpose

A restaurant brand needs one place to declare "how attendance works here": which capture methods are
trusted (manual entry vs. POS vs. a future biometric/mobile/QR client), how much lateness is tolerated
before it counts, how overtime is calculated and at what multiplier, which days/dates are holidays,
and how an overnight shift's hours are attributed to a calendar day for payroll. A multi-branch brand
may need one branch's policy to differ from the rest (e.g. a 24-hour cloud kitchen vs. a daytime-only
café) without duplicating the entire policy by hand for every branch.

## 3. Database Design

One document per **policy scope**: `(brand, branch: null)` is the brand-wide default; `(brand,
branch: <id>)` is an override for that one branch. Every document is a *complete* set of policy
fields (Mongoose schema defaults fill in anything not explicitly set at creation) — there is no
partial-field merging between a branch override and the brand default; resolution picks exactly one
whole document (see §6).

| Group | Fields | Notes |
|---|---|---|
| Scope | `brand`, `branch` (nullable), `isActive` | `{brand,branch}` unique — see §9 for the null-uniqueness reasoning |
| `workCalendar` | `weeklyOffDays[]`, `holidays[]` (`{date,name,isPaid}`) | Holidays embedded, not their own module — see §6 |
| `attendanceSource` | `manual`,`pos`,`mobile`,`biometric`,`gps`,`qrCode`,`faceRecognition` | At least one must be `true` — schema-enforced (see §5) |
| `checkInPolicy` | `windowBeforeMinutes`,`windowAfterMinutes`,`graceMinutes` | |
| `latePolicy` | `toleranceMinutes`,`autoMarkAbsentAfterMinutes`,`deductionRule` | last two reserved — see §12 |
| `earlyLeavePolicy` | `toleranceMinutes`,`deductionRule` | `deductionRule` reserved |
| `breakPolicy` | `breaks[]` (`{label,durationMinutes,isPaid}`),`maxBreaksPerDay` | |
| `overtimePolicy` | `enabled`,`minMinutesBeforeCounted`,`roundingMinutes`,`requireApproval`,`nightDifferential{}`,`weekendMultiplier`,`holidayMultiplier` | multipliers/`requireApproval` reserved |
| `workHourLimits` | `minDailyMinutes`,`maxDailyMinutes`,`maxWeeklyMinutes` | |
| `crossMidnightPolicy` | `attributeHoursTo` (`shiftStartDate`\|`shiftEndDate`) | |
| `autoAttendanceClosing` | `enabled`,`autoCloseAfterHours`,`action` | fully reserved |
| `approvalWorkflow` | `requireManagerApprovalForManualEntry`,`requireHRApprovalForManualEntry` | fully reserved |
| `payrollIntegration` | `lockDayOfMonth` | reserved, module 15's turn |
| `notifications` | `remindBeforeCheckOutMinutes`,`notifyManagerOnLateArrival` | fully reserved |
| `geofencing` | `enabled`,`allowedRadiusMeters` | reserved — Branch has no geo-coordinates yet |
| Audit | `createdBy`,`updatedBy` + soft-delete triple | standard convention |

### Indexes
- `{brand:1, branch:1}` unique. `branch` is always stored as explicit `null` (never omitted) for the
  brand-wide default, so MongoDB's normal compound-unique-index semantics (an explicit `null` is a
  real value for uniqueness purposes) correctly allow exactly one `null`-branch doc per brand and one
  doc per real branch — **not** the FT-003 sparse-index defect pattern documented elsewhere in this
  rollout (that bug was about a field sometimes being entirely *absent*, which is a different case).

## 4. Relationships

```
Brand ──┐
Branch ─┴──→ AttendanceSettings (policy, resolved per §6)
                  │
                  ├─ consumed by → AttendanceRecord (module 7, NOT wired yet — see §9, §12)
                  └─ consumed by → Payroll / PayrollItem (modules 14-15, NOT wired yet — see §9, §12)
```

Deliberately does **not** reference or duplicate:
- `BranchSettings.timezone` — the project's existing single source of truth for a branch's local
  time; duplicating it here would recreate the drift risk `branch-settings.model.js` already warns
  about in its own comments.
- `Shift` — Shift defines *when* a shift runs; this module defines the *policy* applied once
  attendance against that shift is recorded.

## 5. Business Rules

Enforced today, at the schema level (`pre("validate")` hook — see Developer Notes §14 for the
`validateSync()` gotcha this uncovered):
1. At least one `attendanceSource.*` flag must be `true`.
2. `workCalendar.holidays` cannot contain two entries with the same calendar date.
3. `{brand, branch}` uniqueness — one policy document per scope.

Not enforced here (deliberately reserved for the modules that will actually consume the field —
see §12): late/absence auto-marking, overtime approval, payroll locking, manager/HR approval on
manual attendance edits, geofencing radius checks.

## 6. Workflow

**Configuration**: brand admin creates one brand-wide default document. A branch that needs different
rules gets its own override document — no partial merge, a full second document.

**Resolution** (`attendance-settings.service.js#resolveForBranch(brandId, branchId)`):
1. If an **active** document exists for `(brand, branch)`, use it (`source: "branch"`).
2. Else if an **active** document exists for `(brand, null)`, use it (`source: "brand"`).
3. Else return a hard-coded fallback object matching the schema's own defaults (`source:
   "hardDefault"`) — fail-open, same philosophy as `checkModuleEnabled.js`, so a brand that hasn't
   configured attendance policy yet still gets safe, working defaults rather than a broken consumer.

This "one full document, pick exactly one" design was chosen over deep-merging partial branch
overrides onto a brand default — the same simpler design already used by
`organization/branch-settings` and `finance/cashier-shift-settings`. It trades away "override just
one field for one branch" in exchange for zero merge-order ambiguity; a branch override must be
created with every field the brand needs, which the frontend can pre-fill from `GET /resolve` before
the admin edits and saves it as a new override doc.

## 7. API Documentation

Base path: **`/api/v1/hr/attendance-settings`**. Standard CRUD + soft-delete/restore/bulk, plus:

- **`GET /resolve?branch=<id>`** (branch optional) — returns `{source, settings}` per the resolution
  order in §6. This is the "Policy Summary / Current Configuration" endpoint Phase 7 asked for; it
  exists specifically so no frontend or backend consumer has to reimplement the fallback chain.

**Known issue (Foundation, not this module — see `BACKEND_FOUNDATION_TECH_DEBT.md` FT-001):**
`DELETE /bulk-delete` is unreachable (shadowed by `/:id` DELETE). Not fixed here, consistent with
every other HR router in this rollout.

**Known gap (Foundation-wide, not fixed here):** query-string filters (including `/resolve`'s
`?branch=`) are not run through the `validate` middleware's Joi schema — that middleware validates
`req.body` by default, and this is true of every GET/list route in the codebase, not something unique
to this module. `/resolve`'s `branch` param is validated as an ObjectId manually in the controller
instead.

## 8. Frontend Guide

Single settings-form screen per brand, with an optional "override for this branch" mode. Suggested
flow: `GET /resolve?branch=<id>` to pre-fill the form with the currently-effective policy (whatever
its source), let the admin edit, then `POST /` with `branch` set (or omitted/`null` for the brand-wide
default) to save it as a new document — or `PUT /:id` if a document for that exact scope already
exists. No list view is typically needed (small, bounded number of documents per brand).

## 9. Integration

- **`hr/attendance-record` (module 7, not yet wired)**: `attendance-settings.domain.js` exports pure
  functions (`computeLateness`, `computeEarlyLeave`, `computeOvertime`,
  `isWithinNightDifferential`) built specifically so AttendanceRecord's own formal rollout turn can
  compute `isLate`/`lateMinutes`/`leftEarly`/`earlyMinutes`/`isOvertime`/`overtimeMinutes` from a
  resolved policy instead of trusting client-supplied values, which is what it does today. Not wired
  in during this module's turn — that integration belongs to AttendanceRecord's own turn. See
  `HR_TECHNICAL_DEBT.md` HD-008.
- **`hr/payroll` / `hr/payroll-item` (modules 14-15, not yet wired)**: `latePolicy.deductionRule`,
  `earlyLeavePolicy.deductionRule`, `overtimePolicy.nightDifferential.multiplier`,
  `overtimePolicy.weekendMultiplier`, `overtimePolicy.holidayMultiplier`, and
  `payrollIntegration.lockDayOfMonth` are reserved fields with no consumer yet — Payroll's own turn.
- **`organization/branch-settings`**: authoritative source for `timezone` — deliberately not
  duplicated here (see §4).

## 10. Security

`authorize("AttendanceSettings", action)` + `checkModuleEnabled("hr")` on every route. New
`RESOURCE_ENUM` entry added (`iam/role/role.model.js`) — additive only, per
`BACKEND_FOUNDATION.md` §4.4; no existing Role document is affected until an admin explicitly grants
this new permission.

## 11. Reporting

None built — a small, bounded set of policy documents, not a reportable transactional entity.

## 12. Future Extensions

Every "reserved" field in §3 needs an actual consumer before it does anything:
- Auto-mark-absent job reading `latePolicy.autoMarkAbsentAfterMinutes` / `autoAttendanceClosing`.
- Payroll deduction/differential calculation reading `latePolicy.deductionRule`,
  `earlyLeavePolicy.deductionRule`, and the overtime multipliers.
- A manual-attendance-edit approval flow reading `approvalWorkflow.*`.
- A notification dispatcher reading `notifications.*`.
- Geofencing enforcement — blocked until Branch gains geo-coordinate fields (not this module's scope
  to add).
- AttendanceRecord's own turn wiring `attendance-settings.domain.js` into its create/update flow.

## 13. Architecture Decisions

- **Embedded `holidays`/`breaks` as DocumentArrays inside this model, not separate modules.** A
  restaurant's holiday calendar and break definitions are small (well under a few hundred entries),
  don't need independent pagination/search/CRUD lifecycle, and don't benefit from being a top-level
  entity — this matches the project owner's explicit instruction to apply the elevated design
  standard to the existing 14-module list rather than invent new modules (confirmed twice earlier in
  this rollout for other candidate modules).
- **No `timezone` field** — see §4/§9; `BranchSettings.timezone` already owns this.
- **One-full-document-per-scope resolution, not field-level deep merge** — see §6. Chosen for
  predictability over flexibility.
- **`branch` stored as explicit `null`, never omitted** — makes the compound unique index behave
  correctly without a `partialFilterExpression`, sidestepping the FT-003 sparse-index defect class
  entirely rather than needing to fix it.
- **Did not modify `hr/attendance-record` or `hr/employee-settings` in this pass** — see
  `HR_TECHNICAL_DEBT.md` HD-007 (EmployeeSettings' `attendance`/`defaultWork` sub-objects now
  duplicate this module's scope) and HD-008 (AttendanceRecord integration), both deferred to their
  own module's formal turn per the established Category B process for this rollout.

## 14. Developer Notes

- **`pre("validate")` hooks that take a `next` callback are asynchronous to Mongoose** — confirmed
  empirically while writing this module's own tests: `doc.validateSync()` silently skipped the
  `attendanceSource`/duplicate-holiday-date checks and returned no error at all, because
  `validateSync()` only runs synchronous validators/middleware. Use `await doc.validate()` (and catch
  the rejection) to actually exercise those checks, not `validateSync()`.
- **`schema.path(...).options.enum`, not `.caster.options.enum`**, is where Mongoose stores an
  array-of-String field's `enum` (e.g. `workCalendar.weeklyOffDays`) — `caster.options` is empty for
  a plain `{type:[String], enum:[...]}` declaration. Confirmed empirically after the first version of
  `attendance-settings.validation.js` crashed the whole server at import time with `caster.options.enum
  is not iterable`.
- If you're looking for **staff work-shift scheduling**, that's `hr/shift`, not this module.
- If you're looking for **cashier/POS till open/close policy**, that's
  `finance/cashier-shift-settings` (relocated out of HR in module 5 — see that module's own doc).
