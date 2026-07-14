# System Setup / Initial Provisioning — Phase 1 Audit

Status: **audit complete; every finding below has since been addressed by the System Setup V2 implementation** (see `INITIAL_PROVISIONING_ARCHITECTURE.md`'s Implementation Status section, `ONBOARDING_API_DESIGN.md`, and `modules/system-setup/SYSTEM_SETUP.module.md`). Kept as the historical record of what was wrong and why — the reasoning here is still the justification for the current design.

Scope: `modules/system-setup/`, `Brand`, `Branch`, the settings-module landscape, and the bootstrap/startup flow. IAM models (`UserAccount`, `Role`, `Employee`, `AuthenticationSettings`, `AuthCredential`, `Session`) are referenced but not re-audited here — see `IDENTITY_MODEL.md` for that audit, still current.

---

## 0. The single most important finding

**`/setup/initialize` can currently only ever succeed once for the entire platform deployment, not once per tenant.**

The only "is the system already initialized" check in the codebase is:

```js
const existingBrand = await Brand.findOne().session(session).lean();
if (existingBrand) throwError("System already initialized", ...);
```

This checks whether *any* `Brand` document exists anywhere on the platform — not whether *this specific* onboarding attempt has already completed. In a genuinely multi-tenant SaaS (per `docs/PROJECT_VISION_ar.md`'s Platform → Brand → Branch → Department → Employee model, where each `Brand` is a separate restaurant/tenant), this means: the first restaurant that ever signs up succeeds, and **every subsequent restaurant that tries to onboard is rejected** with "System already initialized," because a `Brand` document (belonging to a different tenant entirely) already exists.

Everything else in this audit matters, but this is the finding that determines the shape of the redesign: "already initialized" cannot remain a single global flag. It must become a concept scoped to one onboarding attempt (one prospective tenant), which changes how the state machine (Phase 2), the recovery engine (Phase 11), and the "no duplicate Owner / no duplicate Main Branch" guarantees (the request's own Phase 11 requirement) all need to be designed. Flagged here first because it reframes every other finding below.

---

## 1. `modules/system-setup/` — current implementation

Files: `setup.controller.js`, `setup.router.js`, `setup.service.js`, `setup.validation.js`.

### Router
- One route: `POST /setup/initialize`, mounted **first** in `router/v1/index.router.js` (comment: "must be first to prevent conflicts").
- **No auth middleware** — necessarily true (no `UserAccount` exists yet at first boot), but it means the endpoint is open to any unauthenticated caller, indefinitely, with no additional protection beyond the app-wide 100 req/min rate limiter and the `Brand.findOne()` guard above.

### Service — `initialize(data)`
Wrapped in a single Mongoose transaction (`session.startTransaction()` → `commitTransaction()`/`abortTransaction()`). Order of operations:

1. Guard: `Brand.findOne()` — see §0.
2. Create `Brand` with `validateBeforeSave: false` (deliberate — `Brand.owner` is `required: true` but no `UserAccount` exists yet; documented circular-dependency workaround, same pattern used elsewhere in the codebase, e.g. test fixtures).
3. Create `Branch` (`isMainBranch: true`), fully validated.
4. Create `Role` ("Owner", `isSystemRole: true`, `allBranchesAccess: true`, full CRUD+viewReports+approve+reject on every `RESOURCE_ENUM` entry) via an inline `buildOwnerRole()` helper.
5. Hash `data.owner.password` (bcrypt, cost 10).
6. Create `UserAccount` with the hashed password and the new Role.
7. Complete `Brand`: set `owner = user._id`, `setupStatus = "complete"`, `save()` (this second save runs full Mongoose validation, now that `owner` is set).
8. Sign access/refresh JWTs and commit.

**Models touched**: `Brand → Branch → Role → UserAccount → Brand` (update). Atomic — good. But narrow: **no `AuthenticationSettings`, `AuthCredential`, `Session`, `Employee`, or any settings document is created.** The Owner is provisioned as a bare `UserAccount` with a password, nothing else.

### Finding 1.1 — Token issuance bypasses the entire Session/Authentication Platform

`setup.service.js` signs the Owner's access/refresh tokens directly via `signAccessToken`/`signRefreshToken` (`utils/jwt.utils.js`), **not** through `authService`/`sessionService`. This means the very first login a tenant ever has:
- Creates no `Session` document — the resulting refresh token can never be revoked, never appears in "log out everywhere," and is invisible to every session-management feature built in IAP V2.0.
- Bypasses `AuthenticationSettings.resolveEffectivePolicy()` entirely — the token TTLs come from `jwt.utils.js`'s hardcoded env-var defaults (`ACCESS_TOKEN_EXPIRES`/`REFRESH_TOKEN_EXPIRES`), not from any per-brand/per-role policy (there's no policy to resolve yet at this point anyway, since no `AuthenticationSettings` document exists — but the fix is to create one and go through the real issuance path, not to keep a second parallel one).
- Is a second, independent code path that mints JWTs for a `UserAccount` — the exact kind of duplicated responsibility the project's "preserve SSOT" rule exists to prevent. `user-auth.service.js#_issueTokens` is already the single real implementation; `setup.service.js` should call into it (or the equivalent) rather than reimplementing token signing.

### Finding 1.2 — Owner is provisioned with zero authentication infrastructure

No `AuthenticationSettings` document is created for the new brand — the Owner's very first login (if it went through the real `authService.login()`) would fall back to `DEFAULT_SETTINGS` (from `authentication-settings.service.js`), which is a reasonable fallback but means the brand starts with *no* explicit, ownable configuration — contradicting "Owner Controlled" (a design principle in the redesign request) from minute one. No `AuthCredential` row either (even though `AuthCredential.type` already supports `"PASSWORD"` in its enum — see `IDENTITY_MODEL.md` §2.3 — this would be the natural first real use of that migration path). This is directly the gap Phase 6 of the redesign request asks to close.

### Finding 1.3 — Owner is provisioned purely as `UserAccount`, with no path to become an `Employee`

Confirmed: no `Employee` document, no `EmployeeSettings`/`PayrollSettings` auto-provisioning, no department/job-title. This is Scenario A from the redesign request by default (accidentally, not by design) — there is currently no way to onboard Scenario B (Owner-as-Employee) or a Scenario C conversion path at all.

### Finding 1.4 — Race condition on the "already initialized" guard

The guard is a `findOne` read inside the transaction, not an atomically-enforced constraint. Two concurrent `POST /setup/initialize` calls with *different* brand names (so `Brand.slug`'s unique index doesn't save you) can both pass the guard before either commits, and both succeed — creating two Brands (two "first owners") from what should have been a rejected duplicate/racing request. Independent of the §0 finding (which is about the guard checking the wrong scope entirely) — this is about the guard not being atomic even for the scope it does check.

### Finding 1.5 — Joi validation schema appears unwired

`setup.validation.js` exports `setupSchema`, but neither `setup.router.js` nor `setup.controller.js` calls `validate(setupSchema)` (the standard middleware every other router in this codebase uses). If confirmed dead, request bodies reach `setupService.initialize()` with no schema validation at all — relying entirely on Mongoose's own field-level validation, which fires *inside* the transaction, after Brand/Branch/Role documents may have already been constructed in memory (though not necessarily committed, since Mongoose validation happens at `.create()`/`.save()` time within the transaction — so this is not a data-integrity risk, just a worse failure mode: a malformed request fails deep inside the transaction with a raw Mongoose error instead of a clean 400 up front).

### Finding 1.6 — Schema/validation mismatch on `legalName`

`setup.validation.js`'s Joi schema treats `brand.legalName` as optional; `Brand.model.js` requires it (`required: true`, no default). If Joi were wired in (Finding 1.5), a request omitting `legalName` would pass Joi, pass the first `Brand.create({validateBeforeSave:false})` (validation skipped), and only fail at the *second* `brand.save({session})` call after `owner` is set — deep into the transaction, aborting cleanly (no corruption, transaction rolls back) but with a confusing failure point for debugging.

### Finding 1.7 — Dead code: a second, unwired setup implementation exists

`server/use-cases/setup/initial-setup.usecase.js` — a parallel `InitialSetupUseCase` class (Brand → Branch → looks up an existing "Owner" role by name rather than creating one → UserAccount), constructor-injected with services. It imports `../../services/defaults/system-setup.service`, **which does not exist** (`server/services/defaults/` is absent) — this file would throw on import if anything ever tried to use it. Confirmed via repo-wide search: referenced by nothing. Orphaned, embeds a subtly different (and now-inconsistent) setup contract. Candidate for deletion — flagged for approval since it's a delete on a file that, being unreferenced and unimportable, carries essentially zero risk to remove, but deletions are still called out per the standing convention of asking before removing anything non-trivial.

---

## 2. `Brand` and `Branch` — field audit

### `Brand` (`modules/organization/brand/brand.model.js`)

| Field | Required | Default | Onboarding-relevant note |
|---|---|---|---|
| `name` (Map) | yes | — | |
| `slug` | yes | — | generated by `setup.service.js`, not caller-supplied |
| `legalName` | **yes, no default** | — | see Finding 1.6 |
| `owner` (ref UserAccount) | yes | — | circular; set post-hoc (documented, correct pattern) |
| `logo`, `businessType`, `cuisineType`, `maxBranches`, `subscription.*`, `currency`, `decimalPlaces`, `dashboardLanguages`, `defaultDashboardLanguage`, `companyRegister`, `taxIdNumber`, `timezone`, `countryCode` | no | all have defaults | genuinely optional at onboarding time — safe to omit from a minimal onboarding form |
| `setupStatus` | no | `"draft"` | enum `draft/basic/complete` — currently only ever *read* implicitly (never queried against); `setup.service.js` writes `"basic"` then `"complete"` but nothing else in the codebase checks this field. It's the closest existing thing to a state-machine field and is a natural anchor point for Phase 2's proposed state machine, but today it's write-only. |
| `status` | no | `"active"` | |

No `address` field on Brand at all — confirms address/location is correctly Branch-owned, not duplicated.

### `Branch` (`modules/organization/branch/branch.model.js`)

| Field | Required | Default | Onboarding-relevant note |
|---|---|---|---|
| `brand` | yes | — | |
| `name` (Map) | yes | — | |
| `slug` | yes | — | generated |
| `code` | no | — | unique per brand when present |
| `address.{country,city,area,street,building,floor,landmark}` | **all optional at the Mongoose level** | — | Joi requires `country/city/area/street` for EN+AR at request time (if wired — Finding 1.5), but the schema itself does not enforce this. Two different sources of truth for "is address required," currently only one of which (Joi) even runs, and its wiring is unconfirmed. |
| `location.{type,coordinates}` | no, no default | — | correct (documented: avoids fake `[0,0]` GeoJSON) |
| `postalCode`, `taxIdentificationNumber`, `commercialRegisterNumber`, `manager`, `openingDate` | no | — | |
| `isMainBranch` | no | `false` | enforced unique-per-brand via partial index — `setup.service.js` sets this explicitly; this is the correct existing mechanism for Phase 4's "exactly one Main Branch" requirement |
| `status` | no | `"active"` | |

**Fields the redesign's Phase 4 explicitly asks to validate that do not exist on `Branch` at all**: `timezone`, `currency`, `workingDays`/operating hours, `deliveryCapability`, `contactInfo` (phone/email). Currency and timezone exist only at the `Brand` level (no branch-level override); working hours live in `organization/branch-settings` (a separate document, not created at onboarding — see §3); delivery capability lives in `organization/delivery-area` (also not created at onboarding); there is no `contactInfo` field anywhere on `Branch`. **This is a real schema gap, not just a missing onboarding step** — even if the onboarding flow wanted to capture and validate these things today, there's nowhere on `Branch` to persist most of them. Any Phase 4 redesign needs to either add these fields to `Branch` (schema change — needs its own approval) or explicitly delegate each one to its existing settings-module home and create that settings document as part of onboarding (no schema change, just more documents created transactionally) — the latter is more consistent with "reuse existing modules whenever possible" and is the direction this audit recommends, but it's a design decision for Phase 2, not made here.

---

## 3. Settings-module landscape

Full inventory (22 settings-shaped modules found; two are placeholder files with no schema at all: `payments/payment-settings/` and `sales/promotion-settings/`). Every one of them is `brand`-scoped (some also `branch`-scoped), and **none are created by `setup.service.js`** — a freshly onboarded brand has zero settings documents of any kind until each module's own create/upsert path is invoked later, or until that module's own service lazily defaults (not verified per-module in this pass; `authentication-settings.service.js` is confirmed to lazily default via `DEFAULT_SETTINGS` — whether every other settings service does the same is unverified and should not be assumed).

The two models most relevant to Phase 5's Owner-as-Employee scenario — `hr/employee-settings/` and `hr/payroll-settings/` — both require **only** `brand` (each also `unique: true`, one document per brand); every other field defaults. This means both can be auto-provisioned with a single `{ brand: brandId }` create call and need no additional data gathered from the onboarding form — a meaningfully small lift for Phase 8/9.

Full list (directory → what it configures), for reference during Phase 2 design:

- `accounting/accounting-settings/` — control accounts, activities, fiscal period, cost centers
- `finance/cashier-shift-settings/` — POS till behavior (not staff shift scheduling)
- `hr/attendance-settings/` — attendance/lateness/overtime policy
- `hr/employee-settings/` — leave policy, contract defaults, required-field toggles
- `hr/payroll-settings/` — payroll cycle, automation, approval workflow
- `iam/authentication-settings/` — per-role login policy (audited separately, `IDENTITY_MODEL.md`)
- `inventory/inventory-settings/` — auto-deduct, negative-stock policy
- `loyalty/loyalty-settings/` — points/tiers/bonus rules
- `organization/branch-settings/` — delivery zones, operating hours, maintenance pauses
- `organization/brand-settings/` — module enable/disable toggles, SEO, maintenance mode
- `payments/payment-settings/` — **placeholder, no schema**
- `preparation/preparation-settings/` — return policy + ticket numbering/routing
- `purchasing/purchasing-settings/` — purchase/purchase-return tax policy
- `sales/invoice-settings/` — invoice numbering, receipt display toggles
- `sales/order-settings/` — order numbering, cancel/split/hold rules
- `sales/promotion-settings/` — **placeholder, no schema**
- `sales/rerturn-sales-settings/` — sales-return refund policy
- `system/discount-settings/` — manual discount limits/approval
- `system/notification-settings/` — per-category notification toggles
- `system/print-settings/` — printer/paper/language config
- `system/service-charge-settings/` — service charge type/value/GL account
- `system/tax-settings/` — per-branch tax rules, VAT accounts

**Recommendation for Phase 8 scoping (not a decision — input for that phase):** per the redesign's own "only create what is actually required... everything else should be lazily initialized" principle, the settings that block real operation on day one are `AuthenticationSettings` (Finding 1.2), `EmployeeSettings`/`PayrollSettings` (only if Scenario B/Owner-as-Employee is chosen), `order-settings`/`invoice-settings` (numbering sequences must exist before the first order/invoice can be created — confirmed both have a `currentNumber` counter field that needs a starting document), and `tax-settings` (at least one row, since invoicing logic elsewhere in the codebase resolves tax by branch). The rest are plausible lazy-default candidates, but each module's actual lazy-default behavior needs verifying individually before finalizing that list — not done in this pass.

---

## 4. Bootstrap/startup flow

- `server.js`: `await connectDB()` blocks listen until connected; no seed/migration step is invoked automatically anywhere in the boot sequence.
- `database/connect-db.js`: connection + capped-backoff retry only, no schema sync, no seeding.
- **No global "platform initialized" flag/singleton exists.** "Initialized" is currently defined purely as "at least one `Brand` document exists anywhere" (§0) — this needs to become per-tenant in the redesign.
- No seeder scripts exist for default roles or default settings. `scripts/migrations/` contains 17 numbered one-off data-migration scripts (`DB-001`–`DB-017`), not seeders, not invoked automatically. The Owner Role created in `setup.service.js#buildOwnerRole()` is the only "default role" creation path in the entire codebase today, and it only ever creates that one role.

---

## 5. Summary of findings requiring a Phase 2 design decision

These are not fixed in this pass — they are exactly the kind of wide-blast-radius items the standing rule requires stopping for:

1. **§0** — "already initialized" must become per-onboarding-attempt, not platform-global. This is the foundational decision the state machine (Phase 2) has to be built around.
2. **§1.1** — token issuance during onboarding must go through the real `authService`/`sessionService` path, not a parallel `jwt.utils.js` call, so the Owner's first session is a real, revocable, policy-governed `Session`.
3. **§1.2** — onboarding should create a real `AuthenticationSettings` (and eventually `AuthCredential`) row for the new brand, not leave it to fall back to in-memory defaults.
4. **§1.3** — needs the three-scenario Owner Identity design (Phase 5 of the request) — currently only Scenario A exists, and only by omission.
5. **§1.4** — the initialization guard needs to be atomic (unique index or equivalent), not a plain read-then-write.
6. **§1.5 / §1.6** — needs verifying whether Joi validation is actually wired in, and if so, reconciling the `legalName` mismatch either way.
7. **§1.7** — dead code candidate for removal (low risk, but flagged rather than silently deleted).
8. **§2 (Branch fields)** — timezone/currency/workingDays/deliveryCapability/contactInfo don't exist on `Branch` at all; Phase 2 needs to decide whether these become new `Branch` fields or are delegated to existing settings modules created transactionally at onboarding.
9. **§3** — which settings documents onboarding auto-provisions vs. leaves lazy is an explicit design decision, not something to infer.

Nothing in `modules/system-setup/`, `Brand`, `Branch`, or any settings module was modified to produce this audit.
