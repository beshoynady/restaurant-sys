# Attendance Record (HR) — Engineering Documentation

## 1. Overview

The daily attendance **event** entity — one document per `(employee, currentDate)` recording whether
that employee was present, absent, on leave, or on an official holiday that day, and (when present)
the raw clock-in/out times plus every derived metric (lateness, early leave, overtime, worked/absent
minutes). Module 7 of the fixed 14-module HR rollout, and the direct consumer of `hr/attendance-settings`
(module 6)'s policy engine — see §9.

## 2. Business Purpose

This is the record that answers "what actually happened on a given day for a given employee," and is
the raw material Payroll (module 15) will eventually sum into a pay period. A restaurant needs this to
know who showed up, who was late and by how much, who worked overtime and how much of it is
payable, and who was on approved leave — all computed consistently against one branch's declared
policy, not left to whatever a POS terminal or manual-entry form happens to send.

## 3. Database Design

One document per `(employee, currentDate)` (enforced by the existing `{brand,branch,employee,
currentDate}` unique index).

| Field | Type | Notes |
|---|---|---|
| `brand`,`branch`,`employee` | ObjectId refs | `branch` validated against `Employee.branches` (§5) |
| `shift` | ObjectId ref `Shift`, required | Resolved from `Employee.shift` if not supplied — HD-005 |
| `currentDate` | Date, required | The calendar day this record is for |
| `type` | enum | `PRESENT`,`PARTIAL`,`ABSENT`,`VACATION`,`SICK_LEAVE`,`HOLIDAY`,`WORK_ON_HOLIDAY`,`PERMISSION` |
| `source` | enum, default `manual` | Capture method — validated against the resolved policy's `attendanceSource` (§5) |
| `arrivalTime`/`departureTime` | Date | Required only for types where the employee was actually present |
| `isLate`,`lateMinutes`,`leftEarly`,`earlyMinutes`,`isOvertime`,`overtimeMinutes`,`totalWorkedMinutes`,`totalAbsentMinutes` | computed | **Server-computed only** — see §5/§9, never trust a client-sent value |
| `permissionLeave`,`permissionStart`,`permissionEnd`,`workedMinutesAfterPermission` | | Short-leave-within-a-shift tracking (unchanged this turn) |
| `leaveRequest` | ObjectId ref `LeaveRequest` | Validated: must belong to the same employee and be `approved` (§5) |
| `totalLateMinutes`,`totalOvertimeMinutes` | Number | Unchanged this turn — legacy duplicate-sounding names next to `lateMinutes`/`overtimeMinutes`; kept as-is (not this module's field to rename without understanding what, if anything, already reads them elsewhere — see §14) |
| Audit + soft delete | | Standard convention (already had `isDeleted` — fixed ad hoc earlier this session per HD-002) |

### Indexes
- `{brand,branch,employee,currentDate}` unique (pre-existing).
- `{shift,currentDate}` (pre-existing).
- `{brand,branch,currentDate}` (added) — powers `monthlySummary()`'s date-range aggregation.

## 4. Relationships

```
Employee ──┐
Shift ─────┼──→ AttendanceRecord ──→ LeaveRequest (optional, must be approved + same employee)
Branch ────┘         │
                      ├─ policy from → AttendanceSettings.resolveForBranch() (HD-008)
                      └─ consumed by → Payroll / PayrollItem (module 14-15, not built yet)
```

## 5. Business Rules

Enforced in `attendance-record.service.js` (all new this turn — previously this module had zero
business logic beyond the schema's own `required`/`enum` constraints):

1. **Shift resolution (HD-005 part 2):** `data.shift` if supplied, else `Employee.shift`; if neither
   exists, a clear 400 ("this employee has no default shift — specify one explicitly"), not a raw
   Mongoose validation error.
2. **Branch membership:** the employee must be assigned to the record's `branch` (`Employee.branches`
   must contain it).
3. **Shift/branch consistency:** the resolved shift must belong to the same branch as the record.
4. **Leave request consistency:** if `leaveRequest` is set, it must belong to the same employee and
   have `status: "approved"`.
5. **Attendance source policy:** `source` must be enabled in the resolved `AttendanceSettings.attendanceSource`
   for this brand/branch (HD-008).
6. **Every derived metric is server-computed, never client-trusted (HD-008):** `isLate`, `lateMinutes`,
   `leftEarly`, `earlyMinutes`, `isOvertime`, `overtimeMinutes`, `totalWorkedMinutes`,
   `totalAbsentMinutes` are excluded from the Joi validation schemas and unconditionally overwritten
   by `attendance-record.domain.js#evaluateAttendance` on both create and update. Verified
   empirically with a test that sends deliberately-wrong values and asserts the server's computation
   wins.
7. **One record per `(employee, currentDate)`** — pre-existing unique index, unchanged.

## 6. Workflow

1. A clock-in event (manual entry, POS, or a future mobile/biometric/QR client) creates a record with
   `type`, `arrivalTime`, and optionally `shift`/`source`.
2. The service resolves the shift (rule 1), validates branch/shift/leave-request consistency (rules
   2-4), resolves the branch's effective `AttendanceSettings` policy, validates the capture source
   (rule 5), and computes every derived metric from `arrivalTime`/`departureTime` against the shift's
   scheduled window and the policy's grace/tolerance/overtime rules (rule 6).
3. A later clock-out (`PUT /:id` with `departureTime`) re-fetches the existing document, merges in the
   change, and recomputes every derived metric fresh — not just tacking overtime onto whatever was
   stored at clock-in time.
4. `GET /summary/monthly?employee=&year=&month=` aggregates a month of records into the totals
   Payroll/Dashboard need (§9).

## 7. API Documentation

Base path: **`/api/v1/hr/attendance`**. Standard CRUD + soft-delete/restore/bulk, plus:

- **`GET /summary/monthly?employee=<id>&year=<yyyy>&month=<1-12>`** — aggregated totals for one
  employee's one month: `totalWorkedMinutes`, `totalAbsentMinutes`, `totalLateMinutes`,
  `totalOvertimeMinutes`, `daysPresent`, `daysAbsent`, `daysOnLeave`, `lateOccurrences`,
  `overtimeOccurrences`, `recordCount`.

**Known issue (Foundation, not this module — see `BACKEND_FOUNDATION_TECH_DEBT.md` FT-001):**
`DELETE /bulk-delete` is unreachable (shadowed by `/:id` DELETE). Not fixed here, consistent with
every other HR router in this rollout.

## 8. Frontend Guide

- **Clock-in screen:** `POST /` with `employee`, `type`, `arrivalTime` (and `branch`; `shift`/`source`
  optional). Do not compute lateness client-side — the response already contains the final
  `isLate`/`lateMinutes`.
- **Clock-out screen:** `PUT /:id` with `departureTime`. The response's `totalWorkedMinutes`/
  `isOvertime`/`overtimeMinutes`/`leftEarly` are the final, policy-evaluated values.
- **Monthly attendance summary / payroll-prep screen:** `GET /summary/monthly` — no client-side
  aggregation needed.
- **Absence/leave entry:** `POST /` with `type: "ABSENT"|"VACATION"|"SICK_LEAVE"|"HOLIDAY"` and no
  `arrivalTime` (the schema only requires it for present-type records); attach `leaveRequest` if one
  exists and is approved.

## 9. Integration

- **`hr/attendance-settings` (HD-008, fixed this turn):** every derived metric now comes from
  `attendanceSettingsService.resolveForBranch()` + `attendance-settings.domain.js`'s pure functions,
  via the orchestration in `attendance-record.domain.js#evaluateAttendance`.
- **`hr/leave-request`:** read-only consistency check (rule 4) — this module does not create, approve,
  or modify LeaveRequest documents; `leaveRequest.attendanceGenerated`/`.payrollProcessed` flags on
  that model are not touched here (still `false` by default; wiring them is LeaveRequest's own future
  turn, module 12).
- **`hr/payroll` / `hr/payroll-item` (modules 14-15, not built yet):** `monthlySummary()` is the
  intended entry point once Payroll needs to sum a period's attendance into pay.

## 10. Security

`authorize("AttendanceRecords", action)` + `checkModuleEnabled("hr")` on every route (pre-existing,
unchanged this turn — this router already had the standard chain, unlike JobTitle's HD-001).

## 11. Reporting

`GET /summary/monthly` is the one reporting endpoint built this turn — see §7. Per-record listing via
the standard `GET /` with `employee`/`currentDate` filters (already supported generically by
`BaseController.getAll`) covers day-level drill-down.

## 12. Future Extensions

- Wiring `LeaveRequest.attendanceGenerated`/`.payrollProcessed` — that module's own turn (12).
- An actual Payroll consumer of `monthlySummary()` — module 15.
- `latePolicy.autoMarkAbsentAfterMinutes` / `autoAttendanceClosing` (AttendanceSettings' reserved
  fields) driving a scheduled job that creates `ABSENT` records automatically — no such job exists.
- A Roster/ShiftAssignment module for day-by-day (not permanent-default) shift assignment — HD-005
  part 1, still out of this rollout's 14-module scope.
- Timezone-aware lateness computation — HD-009.

## 13. Architecture Decisions

- **`attendance-record.domain.js` kept separate from `attendance-settings.domain.js`.** The settings
  module's domain functions operate purely on minutes (no DB, no Date parsing); this module's domain
  file owns the Date-to-minutes conversion and orchestration, calling into the settings module's pure
  functions rather than duplicating the lateness/overtime math. Keeps each domain file testable in
  isolation at its own layer.
- **`update()` fully overridden, not just `beforeUpdate`.** Recomputing derived metrics on a partial
  update (e.g. "just add `departureTime`") requires the *existing* document merged with the incoming
  change — `beforeUpdate` only ever sees the incoming payload. Same pattern Department already used
  for its cycle-check override.
- **Computed fields excluded from the Joi schema, not merely overwritten server-side.** A client that
  sends `isLate` gets it silently stripped before validation even runs, rather than accepted and then
  contradicted by the response — avoids the confusing "I sent X, the response says Y" experience.
- **No changes made to `Employee`, `Shift`, `LeaveRequest`, or `AttendanceSettings` this turn.** Every
  cross-module need (shift/branch/leave-request lookups, policy resolution) was satisfiable through
  existing read paths on those models; nothing in this module's work required modifying a previously
  completed module.

## 14. Developer Notes

- **`totalLateMinutes`/`totalOvertimeMinutes` vs. `lateMinutes`/`overtimeMinutes`**: the schema has
  both a per-record computed value (`lateMinutes`, now server-computed) and fields named
  `totalLateMinutes`/`totalOvertimeMinutes` that look like the same thing renamed. They were left
  unmodified this turn — no code anywhere in the repo currently reads or writes them (confirmed by
  search), so their intended purpose (period-level running totals? a payroll snapshot field?) is
  unclear without a Payroll consumer to clarify it. Do not assume they're redundant and delete them
  without first checking whether Payroll's own turn (module 15) was going to use them.
- **Timezone**: see HD-009 — lateness/overtime math is timezone-naive by design (matches `Shift`'s own
  convention), not timezone-aware. Do not "fix" this in isolation without also revisiting `Shift`.
- If you're looking for **the policy this module evaluates against**, see
  `hr/attendance-settings/ATTENDANCE_SETTINGS.module.md`, not this file.
