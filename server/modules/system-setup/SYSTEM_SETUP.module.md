# System Setup (Tenant Provisioning Platform)

## Business purpose

Provisions a brand-new restaurant tenant (Brand, Main Branch, Owner identity, RBAC, authentication configuration, and operational settings) from nothing to immediately usable. This is the only place in the platform a `Brand` and its Owner can come into existence — every subsequent module (Employees, Orders, Accounting, ...) depends on the foundation this module creates.

Full architectural rationale lives in five companion documents, in the order they were written and should be read: `SYSTEM_SETUP_AUDIT.md` (what was wrong with the prior implementation), `INITIAL_PROVISIONING_ARCHITECTURE.md` (the state-machine redesign), `OWNER_IDENTITY_DESIGN.md` (Ownership/Authorization/Employment as independent axes), `DEFAULT_ROLE_ARCHITECTURE.md` (the role template catalog), `SETTINGS_PROVISIONING_ARCHITECTURE.md` (what gets auto-provisioned vs. left lazy), `ONBOARDING_API_DESIGN.md` (the HTTP contract). This document is the concise, code-facing reference; those five are the "why."

## Architecture

A saga-style state machine (`OnboardingSession` — one document per onboarding attempt), not a single database transaction spanning the whole flow. Each state transition is its own small, atomic Mongoose transaction; `OnboardingSession.state` is the durable record of progress, which is what makes onboarding resumable across a server restart (a Mongo transaction cannot survive that; a persisted field can).

```
NOT_STARTED → LICENSE_ACCEPTED → BRAND_DRAFTED → MAIN_BRANCH_CREATED → OWNER_IDENTITY_DECIDED
  → DEFAULT_ROLES_CREATED → OWNER_ACCOUNT_CREATED → BRAND_FINALIZED → OWNER_EMPLOYEE_PROVISIONED
  → AUTH_CONFIGURATION_CREATED → OPERATIONAL_DEFAULTS_PROVISIONED → VALIDATED → READY
```

`CANCELLED` is a separate terminal state reachable from any non-`READY` point.

There is exactly **one** implementation of this flow — `onboarding-engine.service.js`. Both the step-based wizard endpoints and the backward-compatible `POST /setup/initialize` call into it; neither duplicates any onboarding logic.

## Files

| File | Role |
|---|---|
| `onboarding-session.model.js` | The state-tracking document — SSOT for one onboarding attempt. |
| `onboarding-engine.service.js` | The entire state machine: transition runner, all twelve `_to*` work functions, the validation engine, session/token issuance. |
| `setup.controller.js` / `setup.router.js` | HTTP layer — eight operations (§ below) plus the backward-compatible wrapper. Contains no business logic. |
| `setup.validation.js` | Joi schemas — the backward-compatible payload shape, plus lightweight params validation for the step-based routes. |
| `../iam/role-template/*` | The role template catalog this module's `DEFAULT_ROLES_CREATED` step does *not* use directly (the Owner role is hand-built, full access) but that later Owner/Administrator actions use to create every other role. |

## Endpoints

All under `/api/v1/setup`. **No auth middleware anywhere in this router** — necessarily true, no `UserAccount` exists yet for any of these calls. Security is via the unguessable session token plus two tiers of rate limiting (a strict ceiling on the two entry points reachable without a token; a permissive one for autosave/status polling).

| Method | Path | Purpose |
|---|---|---|
| POST | `/initialize` | Backward-compatible single-shot provisioning. Same request/response shape as before this redesign. |
| POST | `/session` | Begin a new onboarding attempt; returns a bearer token. |
| POST | `/session/:token/steps/:stepKey/validate` | Validate one wizard step's data without saving it. |
| PATCH | `/session/:token/steps/:stepKey` | Save/autosave one step's data. |
| GET | `/session/:token` | Full status + accumulated draft input — powers resume. |
| GET | `/session/:token/summary` | Human-readable review-screen data. |
| POST | `/session/:token/complete` | Run every remaining state transition through to `READY`. Idempotent; honors an `Idempotency-Key` header. |
| DELETE | `/session/:token` | Cancel (before `READY` only). |
| POST | `/session/:token/restart` | Fresh token — only permitted if nothing has been committed yet. |

`/api/v1/role-templates` (separate, authenticated router): `GET /` (list, `RoleTemplates:read`), `POST /instantiate` (`Roles:create`).

## Non-CRUD business logic

- **Per-tenant, not platform-global.** The historical bug this redesign fixes: "is the platform already initialized" used to mean "does any `Brand` exist anywhere," which made onboarding a second tenant on the same deployment impossible. Now scoped to one `OnboardingSession` per attempt.
- **Owner Identity — three scenarios**, decided at `OWNER_IDENTITY_DECIDED`, executed at `OWNER_EMPLOYEE_PROVISIONED`: `OWNER_ONLY` (no HR footprint), `OWNER_AS_EMPLOYEE` (creates `Employee`+default `Department`/`JobTitle`, links `UserAccount.employee`, sets `Branch.manager`), `DECIDE_LATER` (identical outcome to `OWNER_ONLY`, differs only in recorded intent). See `OWNER_IDENTITY_DESIGN.md` §3.
- **Real session issuance.** The Owner's access/refresh tokens are issued through the actual `authService`/`sessionService` — not a parallel `jwt.utils.js` call. The prior implementation's token had no backing `Session` and could never actually be refreshed; this is fixed, not just cleaned up.
- **Validation engine** (`_toValidated`) runs concrete checks (branch is main, owner role is system role, `Brand.owner` matches, auth settings exist, password is hashed, employee linkage consistent when applicable) and stores the report on the session. `READY` is gated on `validationReport.passed`.
- **Idempotency.** `complete()` is safe to call twice or from two tabs — an already-`READY` session returns its cached result rather than re-executing; a state-match filter inside each transition prevents double-creation under concurrent calls.

## Related settings

Fourteen settings documents are auto-provisioned unconditionally at `AUTH_CONFIGURATION_CREATED`/`OPERATIONAL_DEFAULTS_PROVISIONED`: `AuthenticationSettings`, `EmployeeSettings`, `PayrollSettings`, `OrderSettings`, `InvoiceSettings`, `TaxConfig`, `BranchSettings`, `BrandSettings`, `PreparationSettings` (formerly `PreparationTicketSettings`, renamed/consolidated 2026-07-21), `InventorySettings`, `CashierShiftSettings`, `PrintSettings`, `DiscountSettings`, `ServiceCharge`. Eight remain lazy (`AccountingSettings`, `AttendanceSettings`, `LoyaltySettings`, `PurchasingSettings`, `SalesReturnSettings`, `NotificationSettings`) or not-yet-applicable (`PaymentSettings`, `PromotionSettings` — placeholder models with no schema); `PreparationReturnSettings` no longer exists as a model at all (folded into `PreparationSettings`). Full rationale per module in `SETTINGS_PROVISIONING_ARCHITECTURE.md` §4.

## Known gaps (see the architecture docs for full detail)

- Scenario C's post-onboarding "convert to Employee" workflow is designed (`OWNER_IDENTITY_DESIGN.md` §7) but not implemented — it's an authenticated, post-onboarding operation outside this module.
- `Employee.isOwner` should be deprecated in favor of deriving ownership from `Brand.owner` — not fixed (schema change on a live collection).
- Ownership transfer, franchise/multi-brand-per-owner identity — designed as known limitations, not implemented.
