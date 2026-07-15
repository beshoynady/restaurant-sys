# Cashier Shift (Finance) — Engineering Documentation

## 1. Overview

Represents one cashier's tenure on one physical/logical `CashRegister`, from open to fully
reconciled and posted. This is the module `finance/cashier-shift-settings` was always meant to
configure — before this pass, the settings module existed with real, documented policy fields
(`maxDifferenceAllowed`, etc.) and `finance/cashier-shift` was pure CRUD reading none of them. This
module closes that gap: it's now the actual close-out reconciliation engine.

## 2. Business Purpose

A cashier opens a till with a starting cash float, sells through the shift (cash sales, cash
returns, cash injections/withdrawals — all individually posted to the GL at the moment they occur,
by their own originating modules, e.g. Invoice), then at end of shift physically counts the drawer.
The business needs: an *expected* figure computed from what the system recorded (never trusted from
the cashier), a *variance* against what was actually counted, a policy-driven decision on whether
that variance needs manager sign-off before the shift can close, and — if there's a real
discrepancy — a GL entry for the shortage/overage itself (not a re-post of the whole shift's cash,
which would double-count revenue already posted per-transaction).

## 3. Database Design

### `CashierShift`

| Field | Type | Why |
|---|---|---|
| `brand`, `branch` | ObjectId refs | Standard tenant scoping |
| `num` | Number | Sequential per brand+branch — see §5 for the generator |
| `cashier` | ref `Employee` | Who worked this shift |
| `register` | ref `CashRegister` | Which till |
| `attendanceRecord` | ref `AttendanceRecord` | Ties the shift to the HR attendance record for the same clock-in |
| `openingCash` | Number | Starting float |
| `expected.{cashSales,cashReturns,cashIn,cashOut,netCash}` | Number | System-computed at `countShift()` — never client-supplied |
| `actualCash` | Number | Physically counted amount, supplied by the cashier at `countShift()` |
| `variance.{amount,reason,approved,approvedBy}` | mixed | Computed at `countShift()`; `approved`/`approvedBy` may be revised by `closeShift()` |
| `cashAccount` | ref `Account` | This register's own GL cash account — used as the default side of the variance posting |
| `journalEntry` | ref `JournalEntry` | Set only if `postShift()` actually posted a nonzero-variance entry |
| `status` | enum `OPEN/COUNTED/CLOSED/POSTED/CANCELLED` | See §6 |
| `openedBy`/`closedBy` | ref `UserAccount` | Who opened/closed — **not** `Employee` (see §13, a bug fixed in this pass) |

### `CashierShiftSettings` (existing module, extended)

Added `shiftSequence.currentNumber` (Number) — the atomic counter `getNextShiftNumber()` increments.
No prefix/date-reset fields: `CashierShift.num` is a plain `Number`, not a formatted `String` like
`Order.orderNum`, so there's nothing to format.

### `AccountingSettings` (existing module, extended)

Added `controlAccounts.cashOverShort` (optional `ObjectId ref Account`) — the account a shift's
variance posts against. Not required, matching the existing precedent set by `accruedLabor`/
`manufacturingOverhead`: a brand without it configured still gets its shift closed and posted, only
the variance journal entry is skipped (best-effort, non-blocking, same as every other posting call
site in this codebase).

### Indexes

- `{brand:1, branch:1, num:1}` unique — **added in this pass**. Previously this fiscal document had
  no uniqueness constraint on its own numbering field at all, unlike every other sequentially
  numbered document in this platform (`Order.orderNum`, `Invoice.serial`, `CashTransaction.number`).

## 4. Relationships

```
CashierShiftSettings ──(maxDifferenceAllowed, shiftSequence)──→ CashierShift
CashRegister ──(register, cashAccount via CashRegister.accountId)──→ CashierShift
CashTransaction ──(cashierShift)──→ summed into CashierShift.expected.* at countShift()
AccountingSettings ──(controlAccounts.cashOverShort, controlAccounts.cash)──→ variance JournalEntry
```

## 5. Business Rules

- **`num` is server-generated, atomically, per brand+branch** — `beforeCreate` calls
  `cashierShiftSettingsService.getNextShiftNumber()`, the exact same `$inc`-with-pre-increment-read
  technique `order-settings.service.js#getNextOrderNumber` already uses. No read-modify-write race
  window; concurrent shift-opens always get distinct numbers.
- **`expected.*` is always system-computed, never trusted from a caller.** `countShift()` sums every
  `CashTransaction` with `status: "POSTED"` and a non-null `cashRegister` tied to this shift (a
  card/bank-only transaction never counts toward a physical cash-drawer reconciliation, even though
  `CashTransaction` is "the single source of truth for ALL money transactions, cash & non-cash" per
  its own model comment).
- **A variance within `CashierShiftSettings.maxDifferenceAllowed` auto-approves.** Outside it,
  `closeShift()` requires `managerApprovalBy` to independently hold the `CashierShifts:approve`
  permission — the same real, non-fabricated `Role.permissions[].approve` check
  `order.service.js#_hasCancelApprovalPermission` established as this platform's pattern.
- **The variance posting is only ever the discrepancy, never the shift's full cash total.**
  Individual sales/refunds already post their own GL entries at transaction time (Invoice's own
  posting) — re-posting the full cash figure at shift-close would double-count revenue.
- **A zero variance posts nothing** but the shift still reaches `POSTED` — terminal either way.
- **`status`/`expected`/`actualCash`/`variance`/`journalEntry`/`num` are locked against the generic
  `PUT`** (`lockedUpdateFields` on the repository) — these may only change through `countShift()`/
  `closeShift()`/`postShift()`. The exact "generic `PUT` bypasses every business rule" defect class
  already found and fixed on `Order`/`Invoice` earlier in this platform's hardening history.
- **`CANCELLED` is only reachable from `OPEN`** — a shift with real transactions against it must be
  reconciled through `COUNTED`/`CLOSED`, never just deleted out from under its own history.

## 6. Workflow

```
OPEN ──countShift()──→ COUNTED ──closeShift()──→ CLOSED ──postShift()──→ POSTED
  │
  └──(no transactions yet)──→ CANCELLED
```

1. **Open** (`create`) — cashier/register/opening float recorded, `num` assigned, status `OPEN`.
2. **Count** (`countShift`) — cashier reports `actualCash`. System computes `expected.*` from real
   `CashTransaction` rows, the variance, and whether it auto-approves.
3. **Close** (`closeShift`) — accepts the reconciliation. Gated on manager approval only if the
   variance exceeded tolerance.
4. **Post** (`postShift`) — posts the variance (if nonzero) to the GL, terminal.

## 7. API Documentation

Base path: `/api/v1/finance/cashier-shifts` (mounted where `finance/cashier-shift` is registered).

Standard CRUD (`create`/`getAll`/`getOne`/`update`/`hardDelete`/`bulk-delete`) plus three new
transition endpoints, all requiring `authorize("CashierShifts", "update")` +
`checkModuleEnabled("financial")`:

| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/:id/count` | `{ actualCash: Number }` | OPEN → COUNTED |
| POST | `/:id/close` | `{ managerApprovalBy?: ObjectId }` | COUNTED → CLOSED; `managerApprovalBy` required only if variance exceeds tolerance |
| POST | `/:id/post` | *(none)* | CLOSED → POSTED, posts variance GL entry if nonzero |

Errors: `404` not found, `409` invalid/concurrent transition, `403` missing/insufficient manager
approval, `400` missing/negative `actualCash`.

## 8. Frontend Guide

A close-out screen should: fetch the shift, show `expected.*` computed server-side (never compute it
client-side), collect `actualCash` from the cashier and `POST /:id/count`, display the resulting
`variance` — if `variance.approved` is `false`, prompt for a manager to authenticate and supply
`managerApprovalBy` on the `POST /:id/close` call; if `true`, close with no extra field. Finally
`POST /:id/post` to finalize. Poll/refetch after each step rather than optimistically updating
`status` client-side — every transition is atomic-claimed server-side and can 409 on a concurrent
request.

## 9. Integration

- **`finance/cash-transaction`**: the sole data source for `expected.*` — see §5.
- **`finance/cashier-shift-settings`**: `maxDifferenceAllowed` (variance tolerance) and
  `shiftSequence` (numbering) — both now actually read, closing the exact gap that settings
  module's own doc named as "confirmed real, read by zero code."
- **Accounting**: `journalEntryService.postFromSource` with `sourceType: "CASHIER_SHIFT_VARIANCE"`.
  Requires `AccountingSettings.controlAccounts.cashOverShort` configured; degrades gracefully
  (skips posting, shift still reaches `POSTED`) if not.
- **`iam`**: `UserAccountModel`/`Role.permissions[]` for the manager-approval check.

## 10. Security

`authorize("CashierShifts", action)` + `checkModuleEnabled("financial")` on every route. The
manager-approval gate on `closeShift()` is a second, business-rule-level check beyond RBAC — holding
`CashierShifts:update` lets a cashier close their *own* in-tolerance shift, but only a user whose
Role also has `approve: true` on that same resource can close an out-of-tolerance one.

## 11. Reporting

Not built in this pass. `CashierShift` now carries everything a shift-history/cash-variance report
would need (`num`, `expected.*`, `actualCash`, `variance.*`, `journalEntry`) — a future Reports
module can query this collection directly without any further backend work.

## 12. Future Extensions

- **`allowNegativeCash`** (a real `CashierShiftSettings` field) is still unread — it describes
  whether a till may go negative *during* a shift (a mid-shift withdrawal guard), a different
  concern from the close-time variance tolerance this pass wired up. Would need validation at
  `CashTransaction` creation time, out of this module's own scope.
- **`autoOpen`/`autoClose`** are also still unread — scheduling/automation, not this module's
  concern.
- A "shift summary" read endpoint (expected vs. actual breakdown formatted for a receipt/printout)
  would be a natural next addition once a Printing platform exists.

## 13. Architecture Decisions

- **`variance.approvedBy` was `ref: "Employee"`; changed to `ref: "UserAccount"`.** Found via direct
  model read before writing any service logic (per this project's model-first policy): every other
  "who approved/closed this" field on the same model (`closedBy`, `openedBy`) already correctly refs
  `UserAccount`, and the permission check that populates this field
  (`_hasVarianceApprovalPermission`) necessarily checks against `UserAccountModel`/`Role`, not
  `Employee` — `Employee` is a distinct HR/staffing collection with no permissions of its own. This
  was an internal schema inconsistency, not a deliberate design; fixed before any code could depend
  on the wrong ref.
- **No new Domain Event emitted.** Checked `utils/domainEvents.js`'s `DomainEvent` enum before
  building this — no existing consumer needs to react to a shift closing/posting, so no event was
  added ahead of an actual need, consistent with this codebase's established discipline against
  building structure ahead of substance.
- **`_postVarianceAccounting` returns the posted entry (or `null`)** rather than mutating `this`
  implicitly — `postShift()` explicitly mirrors `entry._id` onto the in-memory object it returns.
  Caught by the module's own integration test: an earlier version silently returned a stale
  pre-posting snapshot (the DB write was correct; only the returned object was wrong) — worth noting
  here because it's an easy mistake to reintroduce if this method is refactored.
- **Only `CashTransaction` rows with a non-null `cashRegister` count toward `expected.*`.** That
  model's own comment describes it as "the single source of truth for ALL money transactions, cash
  & non-cash" — a card/bank-only row must never inflate a physical cash-drawer reconciliation.

## 14. Developer Notes

- If you're extending the variance-posting to support **overage → other-income vs. shortage → loss**
  as two *different* GL accounts (rather than one shared `cashOverShort`), that's a straightforward
  extension of `_postVarianceAccounting` — add a second optional control account and branch on
  `variance.reason`, following the same "optional, degrades gracefully" pattern already used here.
- `countShift()` can be called again before `closeShift()`? No — `transitionGuard` only allows
  `OPEN → COUNTED`, so a second `countShift()` call on an already-`COUNTED` shift correctly 409s via
  `assertValid`. If a recount is genuinely needed, that's a new capability (not built here), not a
  bug in the current guard.
- Test file: `tests/integration/cashier-shift-reconciliation-engine.test.ts` — covers numbering,
  auto-approval within tolerance, the manager-approval gate (both rejection paths and success), the
  GL posting (nonzero and zero-variance cases), and the `lockedUpdateFields` lockdown.
