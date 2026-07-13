# Employee Settings (HR) — Engineering Documentation

## 1. Overview

Brand-wide (singleton per brand — `{brand}` unique) HR policy configuration: leave-day defaults,
contract/work-mode vocab, payroll defaults, which optional Employee fields a brand requires,
document rules, probation policy, employee code auto-generation, status-change rules, and account
policy. Module 8 of the fixed 14-module HR rollout.

**This module was previously fully inert** — confirmed by a repo-wide search before touching any
code: zero other modules imported `employee-settings.service.js`, so every field on this model was
read by nothing at all. This turn's job was making it actually mean something (see §5, §9).

## 2. Business Purpose

A brand needs one place to declare HR-wide policy defaults that shouldn't be re-entered per employee:
how many leave days a new hire gets by default, whether an email address is mandatory for this
brand's employees, how employee codes are formatted, and so on. This is policy configuration, not
per-employee data — it belongs here, not duplicated onto every Employee document or hardcoded in
`employee.service.js`.

## 3. Database Design

One document per brand (`{brand}` unique index, already existed).

| Group | Fields | Status this turn |
|---|---|---|
| `leavePolicy` | `annualLeaveDays`,`sickLeaveDays`,`emergencyLeaveDays`,`allowCarryForward`,`maxCarryForwardDays`,`allowNegativeLeaveBalance` | **Wired** (§5, §9) — HD-003 |
| `contractTypes`,`workModes` | enum vocab lists | Reserved — no cross-validation against `Employee.contractType`/`.workMode` yet (§12) |
| `payroll` | `defaultSalaryType`,`defaultCurrency`,`autoGeneratePayroll`,`payrollCycleDay` | Reserved — Payroll's own turn (module 15) |
| `requiredFields` | `nationalID`,`email`,`address`,`profileImage`,`emergencyContact` (all Boolean) | **Wired** (§5, §9) |
| `allowedDocuments`,`maxDocumentSizeMB` | | Reserved — no upload-validation consumer yet |
| `probation` | `enabled`,`durationInDays`,`autoConfirmAfterProbation` | Reserved — no scheduled job consumes this |
| `employeeCode` | `prefix`,`autoGenerate`,`sequenceStart`,`padLength`,`generateBasedOn`,`employeeCodeFormat`,`employeeCodeSeparator` (reserved),`keepDeletedEmployeeCodes` (reserved),`employeeCodeResetOnBrandChange` (reserved) | **Wired** (§5, §9) |
| `employeeCodeSequenceCounters` | `Map<String,Number>`, top-level, server-managed | **New this turn** — see §13 |
| `statusRules` | `allowManualStatusChange`,`allowRehireAfterTermination` | Reserved — Employee's `status` transitions aren't gated by these yet |
| `accountPolicy` | `autoCreateUserAccount`,`requireTwoFactorAuth`,`logInBy`,`passwordMinLength` | Reserved — IAM integration, out of this rollout |

### Removed this turn (HD-007)
`attendance` (`enableAttendance`/`allowLateCheckIn`/`lateToleranceMinutes`/`overtimeEnabled`/
`maxOvertimeHoursPerDay`/`requireGeoLocation`) and `defaultWork`
(`dailyWorkingHours`/`weeklyOffDays`/`maxWorkingHoursPerWeek`) — both fully duplicated
`hr/attendance-settings`' scope and had zero consumers (confirmed by search before deleting).
`AttendanceSettings` is the sole source of truth for this policy now. See §13.

### Indexes
- `{brand}` unique (pre-existing, unchanged).

## 4. Relationships

```
Brand ──→ EmployeeSettings (policy, one per brand)
              │
              ├─ consumed by → Employee.beforeCreate (leavePolicy, requiredFields, employeeCode)
              ├─ reads → Department.code / JobTitle.code (employeeCode generateBasedOn scoping)
              └─ NOT related to → AttendanceSettings (see §13 — deliberately, after HD-007)
```

## 5. Business Rules

All new this turn (previously zero business logic existed beyond the schema's own `pre("save")`
carry-forward-days consistency hook):

1. **Leave policy resolution (HD-003):** `resolveLeavePolicyDefaults` fills
   `annualLeaveDays`/`emergencyLeaveDays`/`sickLeaveDays` from `leavePolicy` for any field the caller
   didn't supply, only when `Employee.usesCustomLeavePolicy` is falsy.
2. **Required-fields enforcement:** `assertRequiredFieldsPresent` rejects employee creation with a
   clear `400` if a field `requiredFields` marks `true` is missing from the payload.
3. **Employee code auto-generation:** `generateEmployeeCode` produces the next code per
   `employeeCode.generateBasedOn` (`brand`/`department`/`jobTitle`/`random`) when
   `employeeCode.autoGenerate` is `true` and the caller didn't supply one.
4. **Carry-forward consistency** (pre-existing, unchanged): `maxCarryForwardDays` is forced to `0`
   whenever `allowCarryForward` is `false`.

## 6. Workflow

1. Brand admin configures (or accepts schema defaults for) one `EmployeeSettings` document.
2. Every `POST /hr/employees` now routes through `employee-settings.service.js#applyToNewEmployee`
   (called from `employee.service.js#beforeCreate`) before Employee's own jobTitle/department check:
   required-fields check → leave-policy fill-in → employee-code auto-assignment.
3. `GET /hr/employee-settings/resolve` returns the brand's effective policy (or schema defaults if no
   document exists yet) — the same "resolve" pattern `hr/attendance-settings` established.

## 7. API Documentation

Base path: **`/api/v1/hr/employee-settings`**. Standard CRUD + soft-delete/restore/bulk, plus:

- **`GET /resolve`** — `{source: "brand"|"schemaDefault", settings: {...}}`.

**Known issue (Foundation, not this module — see `BACKEND_FOUNDATION_TECH_DEBT.md` FT-001):**
`DELETE /bulk-delete` is unreachable (shadowed by `/:id` DELETE). Not fixed here.

## 8. Frontend Guide

- **HR policy settings screen:** `GET /resolve` to pre-fill, `POST /` (first time) or `PUT /:id`
  (subsequent edits) to save — same pattern as `hr/attendance-settings`.
- **Employee creation form:** can omit `employeeCode` entirely when the brand has auto-generation
  enabled (check via `GET /resolve` → `settings.employeeCode.autoGenerate`); should surface
  `settings.requiredFields` to conditionally mark form fields as required client-side (the
  server-side check is authoritative regardless — this is only for a better form UX, not a substitute
  for backend validation).

## 9. Integration

- **`hr/employee`**: `employee.service.js#beforeCreate` calls `applyToNewEmployee` (this was the
  entire point of this module's turn — see §5/§6). `employee.validation.js#createEmployeeSchema` was
  updated to make `employeeCode` optional at the HTTP layer (the Mongoose schema itself is unchanged
  — still `required`, guaranteed satisfied by the time the document actually saves).
- **`hr/department` / `hr/job-title`**: read-only lookups of `Department.code`/`JobTitle.code` when
  `employeeCode.generateBasedOn` is `"department"`/`"jobTitle"`.
- **`hr/attendance-settings`**: explicitly NOT integrated with (HD-007) — see §13.

## 10. Security

`authorize("EmployeeSettings", action)` + `checkModuleEnabled("hr")` on every route (pre-existing,
unchanged — `RESOURCE_ENUM` already had this entry from before this rollout began).

## 11. Reporting

None applicable — a single policy document per brand, not a reportable transactional entity.

## 12. Future Extensions

- **Re-sync on policy change**: if brand `leavePolicy` changes after employees already exist, their
  non-overridden snapshot values don't update automatically. A deliberate, likely-audited "reapply
  policy to all non-custom employees" bulk operation would be needed — not built here (see HD-003).
- **`contractTypes`/`workModes` cross-validation**: nothing currently rejects an `Employee.contractType`/
  `.workMode` value outside this settings document's configured lists.
- **`probation`**: no scheduled job auto-confirms an employee after `durationInDays`.
- **`accountPolicy`**: no IAM integration reads `autoCreateUserAccount`/`requireTwoFactorAuth`/
  `logInBy`/`passwordMinLength` yet — ties into `Employee.hasAccount`'s own still-open TODO
  (`EMPLOYEE.module.md`).
- **`allowedDocuments`/`maxDocumentSizeMB`**: no upload endpoint validates against these yet.
- **`employeeCode.keepDeletedEmployeeCodes`/`.employeeCodeResetOnBrandChange`**: reserved, no
  consumer.

## 13. Architecture Decisions

- **Removed `attendance`/`defaultWork` rather than keeping them as "seed values" (HD-007's option
  (b))**: chosen because both were completely unconsumed with no partial wiring to preserve, and
  keeping dead fields that *look* authoritative next to `AttendanceSettings` (which now genuinely is)
  is a worse outcome than a clean removal — a future reader would reasonably assume a populated field
  on a "settings" document does something. Verified via a schema-introspection test that both paths
  are gone.
- **`employeeCodeSequenceCounters` kept as a separate top-level field, not nested inside
  `employeeCode`**: `joiFactory`'s `exclude` option only matches top-level keys (confirmed by reading
  `utils/joiFactory.js` before deciding), so a nested server-managed field couldn't be reliably
  excluded from client input without a much larger `joiFactory` change — out of scope for this
  module's own turn. A top-level field sidesteps the limitation cleanly.
- **Counter stores a generation *count*, not the literal next sequence number**: lets
  `incrementEmployeeCodeSequence` use a single atomic `$inc` regardless of whether the scope key has
  been used before, avoiding a read-then-write race under concurrent employee creation. The actual
  sequence number is derived (`sequenceStart + count - 1`) at read time.
- **`employeeCode.employeeCodeSeparator` left unconsumed**: the newer `employeeCodeFormat` template
  already embeds its own literal separators; building logic to reconcile two potentially-conflicting
  separator sources was judged not worth it for a field that predates the template-based approach.
  Documented as reserved rather than silently ignored.
- **No changes made to `AttendanceSettings`, `AttendanceRecord`, `Shift`, or `Payroll`.** Every
  integration point this turn needed was satisfiable by reading `Department`/`JobTitle` and by this
  module's own new methods called from `Employee`'s existing `beforeCreate` hook.

## 14. Developer Notes

- If you're looking for **attendance/overtime/work-hour policy**, it's
  `hr/attendance-settings/ATTENDANCE_SETTINGS.module.md`, not this file — see HD-007's removal above.
- `generateEmployeeCode`'s `{DEPARTMENT}`/`{JOBTITLE}` format tokens resolve to that entity's own
  `code` field (added to `JobTitle` in module 3, pre-existing on `Department`) — an entity with no
  `code` set resolves to an empty string in the generated code, not an error.
- `assertRequiredFieldsPresent`'s `address` check handles both a real `Map` instance (direct
  `service.create()` calls, e.g. from tests) and a plain object (HTTP request bodies after casting)
  — `Object.keys()` on a `Map` instance always returns `[]`, which silently broke this check on its
  first version; caught empirically while writing this module's own tests.
