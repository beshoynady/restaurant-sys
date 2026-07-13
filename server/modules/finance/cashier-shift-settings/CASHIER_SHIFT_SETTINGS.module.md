# Cashier Shift Settings (Finance) — Engineering Documentation

## 1. Overview

Per-brand (optionally per-branch) configuration for POS/cashier-register shift behavior: whether a
till auto-opens/auto-closes, whether a negative cash balance is tolerated, and the maximum cash
variance allowed at close-out before requiring approval. Configures `finance/cashier-shift`.

**This module was relocated from `hr/shift-settings` as part of the HR domain rollout (module 5).**
It was never an HR module — see §13.

## 2. Business Purpose

A restaurant's finance/ops policy needs a place to declare: "cashiers may close their till up to 50
currency units short/over without manager approval," or "registers should auto-open at branch
opening time." This is exactly the same class of policy `finance/cashier-shift` needs at close-out
time to decide whether to require a variance-approval step.

## 3. Database Design

| Field | Type | Why |
|---|---|---|
| `brand`, `branch` | ObjectId refs (`branch: null` = brand-wide) | Standard tenant scoping; one document per brand+branch |
| `autoOpen` | Boolean | Whether a register auto-opens (vs. requiring an explicit open action) |
| `autoClose` | Boolean | Whether a register auto-closes at end of day/shift |
| `allowNegativeCash` | Boolean | Whether a till may go negative during the shift |
| `maxDifferenceAllowed` | Number | Cash variance tolerance at close before requiring approval |
| `createdBy`/`updatedBy`/`deletedBy` | ref `UserAccount` | Standard audit convention |
| `isDeleted`/`deletedAt`/`deletedBy` | Soft delete triple | Already complete — no defect found here (unlike Shift/AttendanceRecord's missing `isDeleted`) |

### Indexes
- `{brand:1, branch:1}` unique — one settings document per brand+branch.

## 4. Relationships

```
Brand ─┐
Branch ┼─→ CashierShiftSettings   (config)
       │
       └─→ CashierShift            (the entity this is MEANT to configure —
                                     see §9, currently does not read it)
```

**Not related to `hr/shift`** (staff work-shift scheduling) in any way — confirmed by reading every
field; none describe a time window or staff-scheduling concept.

## 5. Business Rules

None enforced in this module itself — it is pure configuration. The rules it's meant to *drive*
(block/allow closing a till based on `maxDifferenceAllowed`/`allowNegativeCash`) belong to
`finance/cashier-shift`'s own close-shift workflow — see §9, §12.

## 6. Workflow

Brand/branch admin sets policy once → `finance/cashier-shift`'s (future) close-out logic reads it
when a cashier closes their register. No workflow exists within this module itself beyond standard
CRUD.

## 7. API Documentation

Base path: **`/api/v1/hr/shift-settings`** — kept unchanged despite the file relocation, to avoid
breaking any existing frontend integration (confirmed with the project owner as an explicit
requirement of the move, not an oversight).

Standard CRUD + soft-delete/restore + bulk-soft-delete/bulk-hard-delete. `authorize()` uses the
resource string `"ShiftSettings"` — also kept unchanged on purpose: `RESOURCE_ENUM` entries are
additive-only (`BACKEND_FOUNDATION.md` §4.4) and renaming this string would silently strip the
permission from every Role document that already has it (every tenant's default Owner role
included, seeded by `system-setup/setup.service.js#buildOwnerRole()`).

**Known issue (Foundation, not this module-specific — see `BACKEND_FOUNDATION_TECH_DEBT.md` FT-001):**
`DELETE /bulk-delete` is currently unreachable (shadowed by `/:id` DELETE). Not fixed here.

## 8. Frontend Guide

Single settings-form screen per brand (or per branch, if branch-specific overrides are needed):
toggle `autoOpen`/`autoClose`/`allowNegativeCash`, numeric input for `maxDifferenceAllowed`. No list
view is typically needed (one document per brand/branch) — `GET /` with `branch` filter, or create
one on first save via upsert-like client logic (no dedicated upsert endpoint exists — check-then-
create/update, same pattern as other brand-wide settings modules in this project).

## 9. Integration

- **`finance/cashier-shift`**: this is the intended consumer, and **does not read these settings at
  all today** — confirmed by grepping `finance/cashier-shift` for any reference to this module (zero
  matches). Deeper investigation while relocating this module found `cashier-shift.service.js` is
  pure generic CRUD with **no business logic whatsoever** — no close-shift action, no variance
  computation, no `expected.netCash` calculation from transactions, nothing reads `maxDifferenceAllowed`
  or `allowNegativeCash` to block/allow a close. Wiring this settings module into an actual
  cashier-shift close-workflow requires *building that workflow first* — a substantial piece of new
  Finance-domain business logic, not a two-line integration. This is explicitly **out of scope** for
  the HR domain rollout (confirmed with the project owner) and is recorded as Finance-domain
  technical debt, not built here.
- **Accounting**: none directly (would flow through `CashierShift.journalEntry` once that workflow exists).

## 10. Security

`authorize("ShiftSettings", action)` + `checkModuleEnabled("financial")` on every route — this
module already self-identified as a financial concept via its feature-toggle key even while living
under `hr/`, which was itself one of the signals that it was misplaced.

## 11. Reporting

None applicable — a single policy document, not a reportable entity.

## 12. Future Extensions

Building `finance/cashier-shift`'s actual close-shift workflow (compute `expected.netCash` from
`CashTransaction` rows tied to the shift, compare against `actualCash`, compute `variance`, block
closing if `|variance| > maxDifferenceAllowed` unless `allowNegativeCash`/an approval override is
used, then post a `JournalEntry` on `POSTED`) is the natural next step that would make this settings
module actually load-bearing. Not built as part of this HR rollout.

## 13. Architecture Decisions

- **Relocated from `hr/shift-settings` to `finance/cashier-shift-settings`.** Every field describes
  POS/cashier-till behavior; the module it configures (`finance/cashier-shift`) lives in `finance/`;
  its own router already gated on `checkModuleEnabled("financial")`, not `"hr"`, even before this
  move — the code already knew what domain it belonged to, the folder location just hadn't caught
  up. This was flagged in `ARCHITECTURE_REVIEW.md` (§3) and `IMPLEMENTATION_PLAN.md` (R9) before this
  session; executed now as part of the HR rollout reaching this module's turn, with explicit
  confirmation from the project owner given the structural (cross-domain) nature of the change.
- **Kept the external API path (`/api/v1/hr/shift-settings`) and the `authorize()` resource string
  (`"ShiftSettings"`) unchanged.** Only the file location and the Mongoose model's registered name
  changed. This was a deliberate backward-compatibility choice, not an oversight — an unannounced
  URL or permission-string change would break any existing frontend integration or silently strip
  permissions from existing roles.
- **Renamed the registered Mongoose model from `"ShiftSettings"` to `"CashierShiftSettings"`** for
  clarity (matches `DATABASE_MODELS_REVIEW.md`'s own recommendation), while explicitly pinning
  `{collection: "shiftsettings"}` in the schema options so the physical MongoDB collection — and any
  existing documents in it — did not need a data migration.
- **Did not build the cashier-shift close-workflow** that would actually consume these settings —
  see §9/§12. That's new Finance-domain business logic, not something this settings module's own
  relocation should silently expand into building.
- Added `cashier-shift-settings.repository.js` (previously no repository file existed at all,
  violating the mandatory Repository Pattern) and fixed the same malformed
  `updateSchema(model, ["updatedBy"])` array-instead-of-object pattern already fixed throughout this
  HR rollout (harmless in practice — `updatedBy` was already excluded by `joiFactory`'s own default
  list — but corrected for clarity).

## 14. Developer Notes

- If you're looking for **staff work-shift scheduling** settings, they don't exist as a separate
  settings module — see `hr/shift`'s own model for the template fields, and `hr/employee-settings`
  for brand-wide HR policy defaults (working hours, leave policy, etc.). This module has never been
  about that, despite its former name and location.
- The `collection: "shiftsettings"` pin in the model is intentional, not a typo — do not "fix" it to
  match the new model name unless you're also prepared to do a real MongoDB collection rename/data
  migration.
