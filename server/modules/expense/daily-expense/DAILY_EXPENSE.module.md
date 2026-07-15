# Expense / Daily Expense (Finance) — Engineering Documentation

## 1. Overview

Two collaborating modules covering the Expense domain: `expense/expense` (master data — the
*definition* of an expense type: "Branch Rent", "Electricity Bill") and `expense/daily-expense`
(the actual payment events against those types). A third, new, lean module —
`expense/expense-settings` — exists purely to hold the atomic numbering counter `daily-expense`
needs, mirroring every sibling numbered-document domain in this platform.

**Before this pass, this entire domain had zero live API surface.** Both `expense.router.js` and
`daily-expense.router.js` imported their controllers from a `./expenses/` subfolder that never
existed (`Cannot find module`), and neither was ever mounted in `router/v1/index.router.js` at all
— confirmed by grep, zero references. `daily-expense.service.js` was also bare CRUD with no GL
posting, despite the model's own DB-011 comment stating plainly: "this real money-out event had no
GL traceability at all." Both are fixed in this pass.

## 2. Business Purpose

A restaurant incurs routine cash/bank-settled operating costs — rent, utilities, packaging,
marketing — outside the Purchasing cycle (which is for inventory/stock). `Expense` defines the
*type* of cost (with its cost-behavior/cost-nature classification for management-accounting
reporting) and which GL account it maps to; `DailyExpense` is the actual payment event: who paid,
how much, through which register or bank account, and posts the corresponding GL entry.

## 3. Database Design

### `Expense` (master data)

| Field | Type | Why |
|---|---|---|
| `brand`, `branch` | ObjectId refs | Standard tenant scoping |
| `name`/`description` | Map (multilingual) | Display |
| `code` | String | Business identifier, unique per `{brand,branch}` |
| `expenseType` | enum | UI grouping (Operating/Fixed/Marketing/Admin/Investment) |
| `costBehavior` | enum `fixed/variable` | Management-accounting classification |
| `costNature` | enum `direct/indirect` | Management-accounting classification |
| `accountId` | ref `Account`, required | The GL account this expense type debits |
| `costCenter` | ref `CostCenter` | Optional cost-center default |
| `createdBy`/`updatedBy` | ref `UserAccount` | **Fixed in this pass** — was `ref: "Employee"`, an internal inconsistency; every caller actually passes a UserAccount id |

### `DailyExpense` (transactional)

| Field | Type | Why |
|---|---|---|
| `number` | Number | Sequential per `{brand,branch}` — see §5 |
| `expense` | ref `Expense`, required | Which type |
| `paid[]` | array | See below — the actual settlement |
| `paid[].cashRegister` | ref `CashRegister`, **optional** | **Fixed in this pass** — was unconditionally required, which made it impossible to record a bank-settled expense |
| `paid[].bankAccount` | ref `BankAccount`, optional | **Added in this pass** — the alternative settlement path, mirroring `CashTransaction`'s own dual design |
| `taxAmount` | Number, default 0 | **Added in this pass** — `AccountingSettings.activities.expense.tax` already reserved an account for this; nothing on the document itself could ever supply an amount to post against it |
| `status` | enum `Draft/Posted/Cancelled` | See §6 |
| `journalEntry` | ref `JournalEntry` | Set once posted |

### `ExpenseSettings` (new)

| Field | Type | Why |
|---|---|---|
| `brand`, `branch` | ObjectId refs | One document per brand+branch |
| `dailyExpenseSequence.currentNumber` | Number | Atomic counter — see §5 |

### Indexes

- `Expense`: `{brand:1, branch:1, code:1}` unique.
- `DailyExpense`: `{brand:1, branch:1, number:1}` unique.
- `ExpenseSettings`: `{brand:1, branch:1}` unique.

## 4. Relationships

```
ExpenseSettings ──(dailyExpenseSequence)──→ DailyExpense.number
Expense ──(accountId)──→ DailyExpense's GL debit line
DailyExpense.paid[] ──(cashRegister XOR bankAccount)──→ GL credit line(s) + balance decrement
AccountingSettings ──(activities.expense.{defaultExpense,tax})──→ fallback/tax posting accounts
```

## 5. Business Rules

- **`number` is server-generated, atomically, per brand+branch** — `beforeCreate` calls
  `expenseSettingsService.getNextExpenseNumber()`, the same `$inc`-with-pre-increment-read
  technique used by `OrderSettings`/`CashierShiftSettings`.
- **Each `paid[]` line must resolve to exactly one settlement account.** The schema allows either
  being unset or both being set (Mongoose has no clean cross-field XOR); enforced in
  `beforeCreate` instead — a payment line with neither or both rejected before any record is
  created.
- **`Posted` is the real posting event.** Whether reached immediately at creation (`status:
  "Posted"`, the model's own default — preserves the pre-existing "implicitly final the instant
  it's created" behavior for brands with no approval workflow) or via the explicit `postExpense()`
  transition from `Draft`, the same `_postExpenseAccounting` logic runs either way.
- **The GL posting debits the expense type's own account** (falling back to
  `AccountingSettings.activities.expense.defaultExpense` only if somehow unresolvable — `accountId`
  is required on `Expense`, so this is a defensive fallback, not the normal path), **plus tax if
  configured**, and **credits each distinct settlement account exactly once** — a multi-line
  expense split across a register and a bank account posts one balanced entry with two credit
  lines, not two separate entries.
- **Settlement-account balances are decremented only after the journal entry successfully posts** —
  an unconfigured `AccountingSettings` (best-effort skip) must never silently drain a register's
  cached balance with nothing to show for it in the GL.
- **`status`/`journalEntry`/`number` are locked against the generic `PUT`** (`lockedUpdateFields`).
- **`Cancelled` is only reachable from `Draft`** — a `Posted` expense has already moved real cash;
  reversing one is a future capability (a reversing journal entry), not a status flip.

## 6. Workflow

```
(create, status defaults "Posted") ──immediately posts──→ Posted
                  │
                  └─(status: "Draft")──→ Draft ──postExpense()──→ Posted
                                            │
                                            └──(transition, not yet built as an endpoint)──→ Cancelled
```

## 7. API Documentation

Base paths: `/api/v1/expense/expenses` (master data), `/api/v1/expense/daily-expenses`
(transactional) — **both newly mounted in this pass**.

`expense/expenses`: standard CRUD, `authorize("Expenses", action)` + `checkModuleEnabled("financial")`.

`expense/daily-expenses`: standard CRUD (`create`/`getAll`/`getOne`/`update`/`hardDelete`/
`bulk-delete` — no soft-delete routes, matching `enableSoftDelete: false`) plus:

| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/:id/post` | *(none)* | Draft → Posted, posts the GL entry |

Both require `authorize("DailyExpenses", action)` + `checkModuleEnabled("financial")`.

## 8. Frontend Guide

An expense-entry screen: pick an `Expense` type (dropdown from `GET /expense/expenses`), enter
description/amount/tax, add one or more `paid[]` lines each choosing either a cash register or a
bank account (never both) and an amount — the UI should enforce this exclusivity client-side too,
though the backend is authoritative. Submitting with no explicit `status` posts immediately; a
brand wanting an approval step should submit `status: "Draft"` and call `POST /:id/post` after
review. Never compute the GL debit/credit split client-side — it's entirely server-derived.

## 9. Integration

- **`accounting`**: `journalEntryService.postFromSource` with `sourceType: "EXPENSE_VOUCHER"`
  (already existed in the enum, unused until now).
- **`finance/cash-register`, `finance/bank-account`**: the two possible settlement accounts; both
  now have `lockedUpdateFields: ["balance"]` (from the CashierShift pass) — this engine is one of
  the legitimate writers, using a direct `Model.updateOne()` (bypassing the generic `update()`
  path, same technique `CashierShift._postVarianceAccounting` uses on itself).
- **`iam`**: new `"Expenses"`/`"DailyExpenses"` `RESOURCE_ENUM` entries (previously absent
  entirely) + `checkModuleEnabled("financial")`.

## 10. Security

`authorize()` + `checkModuleEnabled("financial")` on every route — previously **entirely absent**
on both routers, in addition to being unmounted. Both gaps are fixed together in this pass.

## 11. Reporting

Not built in this pass. `DailyExpense` now carries everything an expense-analysis report would
need (`number`, `expense`, `taxAmount`, `paid[]`, `journalEntry`, `status`) without further backend
work.

## 12. Future Extensions

- **Budget control** (named in the platform's Expense Management standards review) — not built.
  Would need a `Budget` model and a check in `beforeCreate`/`postExpense` against period spend.
- **Recurring expenses** — not built. A natural extension: a `RecurringExpenseTemplate` that
  periodically creates `DailyExpense` drafts via a scheduled job.
- **Multi-level approval** — currently `Draft → Posted` is a single-step transition; a brand
  wanting a real multi-approver chain would need this extended, following the same pattern
  `PurchaseInvoice`'s policy-driven approval gate already established.
- **Attachments** (named in the standards review) — no field for a receipt/invoice image exists yet.
- **Cancellation reversal** — `Cancelled` is currently only reachable pre-posting; reversing an
  already-`Posted` expense needs a reversing-entry capability, not built here.

## 13. Architecture Decisions

- **Created `ExpenseSettings` as a new, lean module** rather than bolting a sequence counter onto
  `Expense` (wrong shape — `Expense` is per-type master data, many documents per brand, not a
  per-brand+branch singleton) or using an unsafe `countDocuments()`-based counter (the exact
  anti-pattern already flagged elsewhere in this codebase, e.g. `PreparationTicket.ticketNumber`).
  Every sibling numbered-document domain (Order, Invoice, Purchasing, CashierShift) already has its
  own settings singleton; Expense was the one gap.
- **`Expense.createdBy`/`updatedBy` changed from `ref: "Employee"` to `ref: "UserAccount"`** — an
  internal inconsistency caught via model-first review before any logic was built on it. Every
  caller (`BaseRepository.create()`) always passes a UserAccount id.
- **`paid[].cashRegister` changed from required to optional, `bankAccount` added** — mirrors
  `CashTransaction`'s own established dual-settlement design rather than inventing a new shape.
- **The XOR constraint (cashRegister vs. bankAccount) is enforced in the service, not the schema.**
  Mongoose has no clean cross-field conditional-required expression for "exactly one of two
  optional refs" — validating in `beforeCreate` is the same choice this codebase already makes
  elsewhere for cross-field business rules.
- **Fixed the broken `./expenses/` import path and mounted both routers** — this was pre-existing
  breakage unrelated to any of the above; fixed as baseline hygiene before building the posting
  engine on top of a domain that had no live API at all.

## 14. Developer Notes

- Test file: `tests/integration/daily-expense-posting-engine.test.ts` — covers the XOR validation,
  atomic numbering, Draft-vs-Posted timing, multi-line split-settlement posting (register + bank in
  one entry), and the `lockedUpdateFields` lockdown.
- If you're wondering why `Expense.accountId` doesn't need a fallback in practice:
  it's `required: true` at the schema level, so `_postExpenseAccounting`'s fallback to
  `activities.expense.defaultExpense` is defensive-only, not a path any valid document should ever
  actually take.
