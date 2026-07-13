# Payroll Item (HR) — Engineering Documentation

## 1. Purpose

The Payroll Component Engine — the atomic building block of a future payroll calculation. Every
salary component (basic salary, allowances, bonuses, overtime, deductions, tax, insurance) is one
`PayrollItem`, reusable across employees and pay periods. Module 14, the **final** module of the
fixed 14-module HR rollout.

**Previously**: the model was reasonably well-designed (a safe tokenized formula schema, sensible
classification fields), but the service was the same hand-written CRUD class every other broken
module in this rollout started as — meaning `formula.tokens` was stored and **never evaluated by any
code in this project**. Rebuilt this turn with a real Formula Engine — see `HR_TECHNICAL_DEBT.md`
HD-021.

## 2. Architecture

```
PayrollItem (this module) — defines HOW to calculate one component
    │
    ├─ calculationType: FIXED | RATE | FORMULA | MANUAL
    ├─ formula.tokens / executionCondition.tokens → payroll-item.domain.js (Formula Engine)
    ├─ dependsOn: [PayrollItem] → circular-dependency-checked graph
    └─ accounting.{debitAccount,creditAccount,costCenter} → architecture only, no posting engine

hr/payroll (pre-existing, CRUD-only, HD-013) — would be the ORCHESTRATOR:
    for each employee, for each period:
      for each active PayrollItem (in `order`):
        context = assemble variables (§5)
        result = payrollItemService.evaluateItem(item, context)
        if result.applies: accumulate into Payroll.earnings/deductions/taxItems/insuranceDeductions
```

`Payroll` itself should become "only an orchestrator" (per this turn's own mandate) — but building
that orchestration is explicitly **out of this rollout's scope** (Payroll was never one of the fixed
14 modules). This module makes that future orchestration possible without duplicated calculation
logic; it does not perform the orchestration itself.

## 3. Restaurant Examples

| Item | category | calculationType | Notes |
|---|---|---|---|
| Basic Salary | EARNING | MANUAL | Sourced directly from `EmployeeFinancialProfile.compensation.basicSalary` |
| Housing / Transport / Meal / Phone / Uniform Allowance | EARNING | FIXED or RATE | Flat amount or % of basic salary |
| Night Shift / Split Shift Allowance | EARNING | FORMULA | `executionCondition` checks `AttendanceSettings`-sourced night/split-shift flags (not built — reserved variable) |
| Service Charge / Tips | EARNING | FORMULA | `SERVICE_CHARGE_TOTAL`/`TIPS_TOTAL` variables, sourced from `EmployeeFinancialTransaction` aggregates |
| Overtime | EARNING | FORMULA | `(HOURLY_RATE * overtime multiplier) * OVERTIME_MINUTES/60` |
| Kitchen/Delivery/Sales Bonus, Commission | EARNING | MANUAL or FORMULA | Manual entry per period, or formula against `SALES_TOTAL` (reserved — no POS integration exists) |
| Perfect Attendance Bonus | EARNING | FIXED | `executionCondition`: `ABSENT_DAYS == 0` |
| Late / Absence Deduction | DEDUCTION | FORMULA | `LATE_MINUTES` / `ABSENT_DAYS` based |
| Leave Deduction | DEDUCTION | — | **Not a PayrollItem** — `hr/leave-request` (module 12) already creates the `salary_deduction` transaction directly on approval (HD-018); a PayrollItem would duplicate that calculation, not orchestrate it |
| Advance / Loan Repayment | DEDUCTION | — | **Not a PayrollItem** — `hr/employee-advance` (module 11) already creates the transaction (HD-015) |
| Income Tax | TAX | RATE | `rateBase: BASIC_SALARY`, `rate` from `PayrollSettings.taxDefaults.defaultIncomeTaxRatePercentage` |
| Social Insurance (employee share) | INSURANCE | RATE | Employee-side deduction |
| Employer Insurance / Employer Tax | INSURANCE / TAX | RATE, `isEmployerCost: true` | Company cost, does not reduce employee net pay |
| Leave Encashment | — | — | **Not a PayrollItem** — `hr/leave-request` already creates the `leave_encashment` transaction directly |
| End of Service / Final Settlement | — | — | Not built anywhere in this project — see §12 |

**Key design decision**: leave deductions, advance repayments, and encashment are deliberately **not**
modeled as `PayrollItem`s, even though the user protocol listed them as restaurant payroll
components — those calculations already happen, correctly, at the module that owns the underlying
business event (`LeaveRequest`, `EmployeeAdvance`). A `PayrollItem` re-deriving the same number would
be a second, competing source of truth. `PayrollItem`'s real job is components that have no other
natural owner (allowances, bonuses, tax/insurance).

## 4. Business Rules

All new this turn (`payroll-item.service.js` had zero business logic before):

1. **Category/payrollEffect coherence**: `EARNING` must be `credit`; `DEDUCTION`/`TAX`/`INSURANCE`
   must be `debit`.
2. **Employer-cost coherence**: `isEmployerCost: true` is only valid for `category: "TAX"` or
   `"INSURANCE"`.
3. **Calculation configuration coherence**: `FIXED` requires `fixedAmount`; `RATE` requires both
   `rate` and `rateBase`; `FORMULA` requires at least one token and a structurally valid sequence.
4. **Unique code per brand** (pre-existing `{brand,code}` index, now also friendly-pre-checked).
5. **Valid accounting mapping**: every configured `debitAccount`/`creditAccount` must exist, belong
   to this brand, allow posting, and be active; `costCenter` must exist, belong to this brand, and
   be active.
6. **No circular dependencies**: `dependsOn` is checked via DFS cycle detection across the brand's
   full item graph — both at creation and on every update that changes `dependsOn`.
7. **`update()` re-validates the merged document**, not just the partial payload (same pattern as
   every stateful module in this rollout).

## 5. Calculation Rules / Formula Engine

`payroll-item.domain.js` — the previously-missing evaluator:

- **`validateTokenSequence(tokens, {knownItemCodes})`**: structural, context-free validation —
  balanced parentheses, no two operands or two operators adjacent, every `VAR` is either a known
  `VARIABLE_REGISTRY` name or a valid `ITEM:<code>` dependency reference. Runs at create/update time
  — "reject impossible formulas" before anything tries to evaluate one.
- **`evaluateFormula(tokens, context)`**: infix → RPN via shunting-yard, then a stack-based evaluator.
  Supports `+ - * /` (arithmetic) and `> < >= <= == !=` (comparison, returning `1`/`0`). `PERCENT`
  tokens divide by 100. `VAR` tokens resolve from the `context` object; an `ITEM:<code>` VAR resolves
  from `context.dependencyResults[code]`.
- **`VARIABLE_REGISTRY`**: every supported variable name, documented with its real source module —
  `BASIC_SALARY`/`DAILY_RATE`/`HOURLY_RATE` (module 9), `WORKED_DAYS`/`ABSENT_DAYS`/
  `OVERTIME_MINUTES`/`LATE_MINUTES`/`EARLY_MINUTES` (module 7), `UNPAID_LEAVE_DAYS`/`PAID_LEAVE_DAYS`
  (module 12), `ADVANCE_INSTALLMENT_DUE`/`ADVANCE_REMAINING_BALANCE` (module 11), `TAX_RATE`/
  `INSURANCE_RATE`/`EMPLOYER_CONTRIBUTION_RATE` (module 13), `TIPS_TOTAL`/`SERVICE_CHARGE_TOTAL`
  (module 10), `SALES_TOTAL` (reserved — no POS integration exists anywhere in this project).
- **`detectCircularDependency(startId, itemsById)`**: DFS with a visiting/visited set — the standard
  three-color cycle-detection algorithm, returns the actual cycle path for a clear error message.
- **`service.evaluateItem(item, context)`**: the public entry point — checks `executionCondition`
  first (skips entirely if falsy), then computes `FIXED`/`RATE`/`FORMULA` amounts. `MANUAL` items
  return nothing computable (the amount comes from the caller). **Frontend never evaluates a
  formula** — `POST /:id/evaluate` lets an admin preview a formula against sample data via the
  backend, and this same method is what a future Payroll orchestrator would call.

## 6. Dependencies

`dependsOn: [PayrollItem]` — a formula/condition may reference another item's computed result via an
`ITEM:<code>` token. Validated for existence (same brand) and circularity at write time. **Not yet
consumed**: nothing currently calls `evaluateItem` in dependency order for a real payroll run — that
orchestration belongs to `hr/payroll`'s own future turn (out of this rollout's scope).

## 7. Accounting Impact (architecture only)

`accounting.{debitAccount, creditAccount, costCenter, postingStrategy}` — redesigned this turn from a
single unused `account` field into a real double-entry-ready shape (an earning needs a debit-expense/
credit-payable pair, not one account). No journal-entry generation exists anywhere in this project
(deferred project-wide) — validated for correctness now so a future posting engine doesn't have to.

## 8. Financial Impact

`isEmployerCost` distinguishes employee-facing amounts (reduce/increase net pay) from employer-borne
costs (company expense, invisible on the employee's own payslip net figure) — a real gap `PayrollItem`
never modeled before this turn; `PayrollSettings.taxDefaults.employerContributionRatePercentage`
(module 13) is exactly the rate an `isEmployerCost` item would use.

## 9. Payroll Lifecycle (item perspective)

A `PayrollItem` itself has no lifecycle state — it's a reusable definition, not a transactional
record (unlike `EmployeeAdvance`/`LeaveRequest`). Its only states are `isActive`/`isDeleted`
(standard soft-delete). The *lifecycle* belongs to whatever future `Payroll` run applies it.

## 10. Extension Points

- `dependsOn` + `ITEM:<code>` tokens → multi-step calculated items (e.g. "Tax = 10% of Gross
  Earnings" where Gross Earnings is itself a computed item).
- `isMandatory` → a future auto-assignment mechanism (currently reserved; no assignment table exists
  — every item currently applies to every employee it's `isActive` for, with no per-employee
  opt-in/out).
- `isProrated` → a future calculation engine applying worked-day pro-ration (reserved; not applied
  anywhere yet).
- `accounting.*` → a future journal-posting engine (§7).

## 11. API Reference

Base path: **`/api/v1/hr/payroll-items`**. Standard CRUD + soft-delete/restore/bulk, plus:

- **`GET /variables`** — the full `VARIABLE_REGISTRY`, for a formula-builder UI.
- **`POST /:id/evaluate`** (body: `{context: {...}}`) — evaluates one item against sample data
  without saving anything; returns `{applies, amount}`.

**Known issue (Foundation, not this module — see `BACKEND_FOUNDATION_TECH_DEBT.md` FT-001):**
`DELETE /bulk-delete` is unreachable (shadowed by `/:id` DELETE).

## 12. Validation

`payroll-item.validation.js` — `formula.tokens`/`executionCondition.tokens` (DocumentArrays) needed a
manual Joi override (same class as `AttendanceSettings`' `holidays`/`breaks`); every other field is
handled by `joiFactory`'s generic reassembly.

## 13. Repository / Service

`payroll-item.repository.js` — `findByCode`, `findAccountForScope`, `findCostCenterForScope`,
`findDependenciesForScope`, `findDependencyGraph` (the full brand-scoped `dependsOn` graph the
service's cycle detector walks). `payroll-item.service.js` — every business rule in §4, plus
`evaluateItem` (§5).

## 14. Known Limitations

- No per-employee item assignment table — an active item conceptually applies brand/branch-wide;
  `isMandatory`/optional distinction is a reserved flag with no enforcement point yet.
- `SALES_TOTAL` variable has no real data source — no POS/sales integration exists anywhere in this
  project.
- `isProrated` is not applied by any calculation code (none exists yet to apply it).
- Multi-currency formula evaluation is not addressed — `evaluateFormula` operates on plain numbers,
  assuming the caller has already normalized everything to one currency.

## 15. Technical Debt

See `HR_TECHNICAL_DEBT.md` HD-021 (this module's own rebuild) and HD-013 (Payroll's unbuilt
calculation engine, which is this module's actual future consumer).

## 16. Future Payroll Module

`hr/payroll`'s own future turn (out of this rollout's scope) should: read `PayrollSettings` for
cycle/rounding/tax-default policy, assemble a `context` object per §5's `VARIABLE_REGISTRY` from
`AttendanceRecord`/`EmployeeFinancialProfile`/`LeaveRequest`/`EmployeeAdvance`/
`EmployeeFinancialTransaction`, walk active `PayrollItem`s in `dependsOn`-resolved order calling
`evaluateItem` for each, and accumulate results into a `Payroll` document — becoming the thin
"orchestrator" this turn's protocol described, not a second calculation engine.

## 17. Developer Guide

- If you're adding a new payroll component type, check §3 first — if it's a leave/advance/encashment
  effect, it probably belongs in `LeaveRequest`/`EmployeeAdvance` instead of here.
- If you're adding a new formula variable, add it to `VARIABLE_REGISTRY` in
  `payroll-item.domain.js` — that's the single source both `validateTokenSequence` and any future
  formula-builder UI read from.
- Never hand-evaluate a formula string — always go through `evaluateFormula`/`service.evaluateItem`,
  which are the only places token semantics are defined.
- `enum` fields with `default: null` **must** include `null` in the enum array itself, or Mongoose
  rejects the very default it just applied — confirmed the hard way (HD-021) on `rateBase`/
  `attendanceRule`/`financialtransactionType`, which had this bug since before this rollout began but
  it was never triggered because the module was unused.
