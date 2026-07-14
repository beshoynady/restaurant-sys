# Identity Model — Audit (IASP Phase 5, Objective 1)

Status: **audit only, nothing in this document has been implemented yet.** This is the required first step of the Enterprise Identity & Access Platform (IASP) redesign — every later phase (Authentication Policy Engine hardening, Session Platform, Device Platform, Security Event Platform, Risk Engine, Permission Roadmap) builds on the model boundaries fixed here, so it comes first and nothing is coded against it until the boundaries below are confirmed.

Scope: every model that currently participates in staff identity, authentication, or authorization. Customer identity (`modules/crm/online-customer`, `modules/crm/offline-customer`, `modules/crm/customer-auth`) is inventoried for the boundary map in §5 but **not audited in depth and not touched** — it remains explicitly out of scope per the standing instruction from the V4.0 protocol ("CRM Customer Auth is OUT OF SCOPE. Do not touch it.").

---

## 1. Current model inventory

| Model | File | Role today |
|---|---|---|
| `UserAccount` | `modules/iam/user-account/user-account.model.js` | Staff identity + password credential + authorization pointer (role) + lockout state, all in one document |
| `Employee` | `modules/hr/employee/employee.model.js` | HR/employment record — personal data, org placement, employment terms, now also carries `assignedDevice` (Milestone 4) |
| `Role` | `modules/iam/role/role.model.js` | Authorization — resource/action permission grants, branch scoping |
| `AuthCredential` | `modules/iam/auth-credential/auth-credential.model.js` | Pluggable non-password credentials (PIN/BARCODE/QR today; OAuth/Passkey/OTP/MagicLink reserved in the `type` enum, unimplemented) |
| `AuthenticationSettings` | `modules/iam/authentication-settings/authentication-settings.model.js` | Policy configuration — brand/branch/role-scoped login rules |
| `Session` | `modules/iam/session/session.model.js` | Active login state — one row per device/login |
| `Device` | `modules/iam/device/device.model.js` | Physical/logical terminal registry — trust, block, fingerprint |
| `SecurityEvent` | `modules/iam/security-event/security-event.model.js` | Append-style audit trail for auth-relevant actions |

Every one of these already exists and works (verified: 31 Jest suites / 151 tests passing as of the last milestone). This audit is about **boundaries and duplication between them**, not correctness of any single one in isolation.

---

## 2. Field-by-field critique

### 2.1 `UserAccount` — the core problem

`UserAccount` currently mixes **four distinct responsibilities** in one schema:

1. **Identity** — `username`, `email`, `phone`, `brand`, `branch`
2. **Authentication (password)** — `password`, `loginAttempts`, `lockUntil`, `passwordChangedAt`
3. **Authorization** — `role`
4. **Legacy/orphaned fields** — `refreshToken`, `twoFactorEnabled`, `twoFactorSecret`, `resetPasswordToken`, `resetPasswordExpires`

The legacy fields are the concrete finding, not a stylistic complaint:

| Field | Status | Evidence |
|---|---|---|
| `refreshToken` (single string) | **Dead.** Superseded by `Session` (one row per device) since the V4.0 IAM redesign — `session.model.js`'s own header comment says so explicitly. Nothing in `user-auth.service.js` reads or writes `user.refreshToken` (the local variable of the same name in that file is the JWT string being returned to the client, not the model field). | grep across `modules/` — zero read/write sites |
| `twoFactorEnabled` / `twoFactorSecret` | **Dead.** Pre-dates `AuthCredential` and `AuthenticationSettings.requireMFA`. No TOTP verifier exists anywhere; nothing sets `twoFactorSecret`; the only reference is `user-auth.service.js`'s `sanitize()` deleting it before returning the user object. | grep — only appears in `sanitize()` and the validation schema |
| `resetPasswordToken` / `resetPasswordExpires` | **Dead.** No password-reset flow exists in `user-auth.controller.js` or `.router.js`. Same as above — only referenced to be stripped in `sanitize()`. | grep — no route, no service method |
| `passwordChangedAt` | **Dead.** Never set on password change (`auth-credential.service.js` and `user-auth.service.js` have no write to it), never read to invalidate sessions issued before a password change. | grep — zero write sites anywhere in `modules/` |

**Why this matters, concretely:** a reader of `user-account.model.js` today cannot tell, from the schema alone, which fields are live security surface and which are inert. `twoFactorEnabled: true` on a real document would currently do *nothing* — no code path checks it — which is exactly the "faked" outcome the standing "never fake integrations" rule exists to prevent, except here it's an accidental fake (dead schema) rather than a deliberate one. This is a direct Objective-1 finding: **remove duplicated/dead concepts** — flagged for cleanup in §6, not fixed yet (schema field removal is a migration-adjacent change on a live collection, so it's listed as pending approval per the standing "stop before a breaking change" rule, even though dropping unused columns is about as low-risk as a migration gets).

### 2.2 `UserAccount.branch` vs `Employee.branches` / `Employee.defaultBranch` — a live SSOT violation

`UserAccount` has a single optional `branch` field ("Optional link to a specific branch (for branch managers)"). `Employee` independently has `branches: [ObjectId]` (every branch the employee can work at) plus `defaultBranch` (required). **Nothing keeps these in sync.**

This is not theoretical — it is the actual branch resolution used at login today:

```js
// user-auth.service.js
const effectiveBranch = branch ?? user.branch;
```

`effectiveBranch` feeds directly into Milestone 4's operational gates (`AttendanceRecord`/`CashierShift` lookups are scoped by this value) and into `AuthenticationSettings` branch resolution. If an Owner reassigns an employee's `defaultBranch` on the `Employee` record (the "correct," HR-owned source of that fact) without also updating the linked `UserAccount.branch`, the login-time operational gates silently keep evaluating against the *old* branch — a Cashier moved from Branch A to Branch B would still be gated against Branch A's shift/POS records, with no error, because nothing informed them they now disagree.

**Verdict:** this is the single highest-priority structural finding in this audit. `UserAccount` should not carry its own `branch` opinion when an `Employee` link exists — it should either (a) delegate to `Employee.defaultBranch` when `employee` is set, falling back to its own `branch` only for standalone accounts (Owner/Admin with no Employee record), or (b) be removed entirely from `UserAccount` for employee-linked accounts. Either is a behavior change to `_gateOperationalPolicy`'s branch resolution — **flagged for approval, not implemented in this pass.**

### 2.3 `AuthCredential.type` includes `"PASSWORD"` but nothing ever creates one

The `type` enum accepts `"PASSWORD"`, and the model's own header comment documents why: PASSWORD still lives on `UserAccount.password` and migrating it into `AuthCredential` is called out as "a separate, larger follow-up." This is honest, documented debt (not a silent trap), but it means **two schema locations can currently describe "this identity's password credential,"** even though only one (`UserAccount.password`) is ever actually populated. Low risk today (nothing writes an `AuthCredential` row with `type:"PASSWORD"`), but worth resolving in the same pass as the identity/authentication split below, since it's the same underlying question: does authentication data belong on the identity document or in the pluggable credential store.

### 2.4 Lockout is account-wide, not credential-specific

`UserAccount.loginAttempts` / `lockUntil` lock the **entire account** after N failed attempts, regardless of which method failed. A Cashier who mistypes their PIN five times locks out their PASSWORD login too (if they have one), and vice versa. `AuthCredential.status` has a `"revoked"`/`"expired"` state per credential, but no `"locked"` state and no per-credential attempt counter. This is a real product gap for the workforce experience Phase 5 asks for (§5 of the request: "Cashier: PIN... Fallback") — if PIN lockout also blocks the password fallback, there is no fallback. **Roadmap item for the Authentication Policy Engine phase, not fixed here.**

### 2.5 `Employee.isOwner` / `Role.isSystemRole` / `Role.isPlatformAdmin` — three "who's in charge" signals

- `Employee.isOwner` — a flag on the HR record.
- `Role.isSystemRole` — marks a tenant's default full-access role (also informally called "Owner" in most brands' seed data).
- `Role.isPlatformAdmin` — marks a role with cross-brand platform authority (unrelated to being "the restaurant owner").

These three fields answer three different questions ("is this person the restaurant's owner," "is this role the tenant's unrestricted role," "does this role manage the platform itself") but the naming overlap invites confusion, and nothing cross-validates them (e.g. nothing stops `isOwner:true` on an Employee whose linked UserAccount has a non-`isSystemRole` Role). Not a bug today — no code path assumes they agree — but flagged as a clarity/documentation debt for the Permission Roadmap phase (Objective 11: role inheritance, templates).

### 2.6 `Device.lastUser` vs `Employee.assignedDevice` — correctly two different concepts, but easy to confuse

`Device.lastUser` is automatic and mutates on every login (whoever most recently used the terminal). `Employee.assignedDevice` (added in Milestone 4) is a durable, Owner-configured binding ("this cashier is expected to use this terminal"). These are legitimately different — a shared POS terminal has one `lastUser` that changes constantly but might have zero or one `assignedDevice`-pointing employees. No fix needed; documented here so Phase 5's Device Management redesign (§7 of the request) doesn't accidentally collapse them into one field.

### 2.7 Auth now has a hard runtime dependency on HR and Finance schemas

Since Milestone 4, `user-auth.service.js` directly imports `Employee`, `AttendanceRecord`, `CashierShift`, and `Branch` models to evaluate the operational gates. This is the correct way to implement "require an active shift to log in" (querying the real HR/POS state, not faking it), but it means **the authentication module is no longer self-contained** — a schema change to `AttendanceRecord.departureTime` or `CashierShift.status`'s enum, made by someone working in the HR or Finance domain with no reason to think about login, can silently break every login for roles with `requireActiveShift`/`requireAssignedPOS` turned on. This is a documented, deliberate architectural coupling (not a mistake), but it needs to be visible: **any future change to `AttendanceRecord` or `CashierShift` must check `user-auth.service.js#_gateOperationalPolicy` for a break.** Recorded here so it isn't rediscovered by accident later.

---

## 3. Duplicated concepts — summary table

| Concept | Lives in | Verdict |
|---|---|---|
| Password credential | `UserAccount.password` (real) + `AuthCredential.type:"PASSWORD"` (enum-only, unused) | Consolidate — pending approval, §6 |
| Refresh/session token | `UserAccount.refreshToken` (dead) + `Session.refreshTokenHash` (real, live) | Remove dead field — pending approval, §6 |
| MFA | `UserAccount.twoFactorEnabled/twoFactorSecret` (dead) + `AuthenticationSettings.requireMFA` (schema-ready, no verifier) | Remove dead identity-level fields; MFA state belongs in `AuthCredential` once a verifier exists — pending approval, §6 |
| Password-reset | `UserAccount.resetPasswordToken/resetPasswordExpires` (dead, no flow) | Remove or build the flow — needs a product decision, not just a cleanup, so flagged rather than auto-removed |
| Branch assignment | `UserAccount.branch` + `Employee.branches`/`defaultBranch` | Live SSOT violation — highest priority, §2.2 |
| "Who's in charge" | `Employee.isOwner`, `Role.isSystemRole`, `Role.isPlatformAdmin` | No conflict today; naming/documentation debt only |
| Credential-level lockout | Doesn't exist (`UserAccount.loginAttempts` is account-wide) | Gap, not a duplication — roadmap item |

---

## 4. Proposed target separation (design only — not implemented)

The request asks for a hard separation between Identity / Authentication / Authorization / Employment / Customer / Sessions / Credentials / Devices. Mapped against what exists today:

```
Identity        -> UserAccount (trimmed to: brand, username, email, phone, employee-link, isActive, isDeleted)
Authentication  -> UserAccount.password (interim) migrating toward AuthCredential (PASSWORD becomes a real row type)
                   + Session (session state) + AuthCredential (all pluggable methods)
Authorization   -> Role (unchanged shape; roadmap in Objective 11 for inheritance/templates/scoping)
Employment      -> Employee (already correctly separate; branch-authority conflict with UserAccount is the one thing to fix, §2.2)
Customer        -> crm/online-customer + crm/offline-customer + crm/customer-auth (already correctly separate; out of scope, untouched)
Sessions        -> Session (already correctly separate)
Credentials     -> AuthCredential (already correctly separate; needs PASSWORD migrated in, not duplicated)
Devices         -> Device (already correctly separate)
```

**The honest finding:** five of the eight responsibilities (Sessions, Credentials, Devices, Authorization, Employment/Customer) are **already correctly separated** — this is a direct result of the incremental IAP V2.0 work already completed in Milestones 1-5. The real remaining work is narrower than "split everything": it is (a) trimming `UserAccount` down to pure identity + finishing the password-into-`AuthCredential` migration, and (b) fixing the branch-authority split with `Employee`. Both are schema/behavior changes on a live collection with existing data and are **not implemented in this pass** — see §6.

---

## 5. Identity boundary map (for reference — not modified)

```
                    ┌────────────────┐
                    │     Brand      │
                    └───────┬────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
      ┌───────▼────────┐          ┌───────▼────────┐
      │   Employee      │          │   Customer      │   <- crm/online-customer,
      │  (HR identity)   │          │ (guest identity) │      crm/offline-customer
      └───────┬────────┘          └───────┬────────┘   <- OUT OF SCOPE, untouched
              │ 0..1                        │
      ┌───────▼────────┐          ┌───────▼────────┐
      │  UserAccount    │          │ customer-auth   │   <- separate auth stack,
      │ (staff identity  │          │  (own service)   │      OUT OF SCOPE, untouched
      │  + auth today)   │          └────────────────┘
      └───────┬────────┘
              │
   ┌──────────┼───────────┬───────────────┐
   │          │           │               │
┌──▼───┐  ┌───▼────┐  ┌───▼─────┐   ┌────▼─────┐
│ Role  │  │Session │  │AuthCred │   │  Device   │
│(authz)│  │(state) │  │(methods)│   │(terminal) │
└───────┘  └────────┘  └─────────┘   └──────────┘
```

---

## 6. Findings requiring approval before implementation

Per the standing rule ("if a breaking change or production migration is required, stop and request approval before proceeding"), the following were documented for approval; item 2 has since been approved and implemented (see §6.1), the rest remain open:

1. Remove dead `UserAccount` fields (`refreshToken`, `twoFactorEnabled`, `twoFactorSecret`, `resetPasswordToken`, `resetPasswordExpires`, `passwordChangedAt`) — low-risk schema cleanup, but touches a live collection and requires confirming no external client reads these fields directly off a raw API response first. **Still open.**
2. ~~Resolve `UserAccount.branch` vs `Employee.defaultBranch` authority (§2.2)~~ — **Resolved, see §6.1.**
3. Migrate `PASSWORD` fully into `AuthCredential` (removing the interim `UserAccount.password` field) — significant migration (every existing password hash needs a corresponding `AuthCredential` row) and touches the hottest path in the system (every login). Proposed as a dedicated phase, not bundled with anything else. **Still open.**
4. Credential-level (not just account-level) lockout — new schema fields on `AuthCredential`, new enforcement logic in `user-auth.service.js` and `auth-credential.service.js`. **Still open.**

None of the remaining open items block the next Phase 5 objectives (Authentication Policy Engine hardening, Session Platform enterprise fields, Device Platform expansion, Security Event Platform, Risk Engine) — they're called out here so they aren't lost, and so any later phase that touches `UserAccount.branch` or `AuthCredential.type` knows this audit already flagged the exact same field.

### 6.1 Resolved: branch-authority SSOT violation (§2.2)

Fixed without a data migration — no existing `UserAccount` document was modified; the fix is entirely in resolution logic and forward-looking validation, so it carries none of the risk a backfill would:

- **`user-auth.service.js`** — new `_resolveIdentityBranch(user, requestedBranch)`, called once per login (both `login()` and `loginWithCredential()`) before policy resolution. Authority order: an explicit `requestedBranch` wins **only if** the employee is actually assigned to it (`Employee.branches`) — otherwise the login is rejected outright, closing the door on a client claiming an unverified branch. Absent an explicit request, `Employee.defaultBranch` (the HR-owned source of truth) wins for employee-linked accounts; `UserAccount.branch` is now only consulted as a last resort for standalone accounts (Owner/Admin) with no `Employee` link at all. The resolved `employee` document is reused by `_gateOperationalPolicy` (Milestone 4) rather than fetched twice.
- **`user-account.service.js`** — new `_resolveBranchAgainstEmployee()`, wired into both `create()` and `update()`: an employee-linked account's `branch` must be one of that employee's assigned `branches`, and defaults to `Employee.defaultBranch` when not explicitly supplied. This closes the divergence at the source — a new `UserAccount` (or a branch change on an existing one) can no longer be saved with a branch its linked employee isn't actually assigned to.
- Existing `UserAccount` documents whose stored `branch` already disagreed with their `Employee.defaultBranch` are **not backfilled** — they don't need to be, since login no longer trusts the stored value for employee-linked accounts; the stale field becomes inert for that account the next time the code path is exercised (i.e., the next login self-heals the behavior). The physically stale field itself is left alone for now as part of the still-open dead-field cleanup (§6 item 1).
- Verified: `tests/integration/iasp-identity-branch-resolution.test.ts` (7 tests — resolution priority, explicit-request validation, standalone fallback, create/update validation and defaulting). Full regression: 32 suites / 158 tests passing, `tsc --noEmit` unchanged at 58 baseline errors, live-boot + route smoke test clean.

---

## 7. What this audit did *not* do

- Did not modify any model, service, controller, router, or validation file.
- Did not touch `crm/customer-auth`, `crm/online-customer`, or `crm/offline-customer` (explicitly out of scope).
- Did not run a migration or write one.
- Did not change `RESOURCE_ENUM` or any permission.

This document is the input to the remaining Phase 5 objectives, delivered next as separate documents/milestones per the roadmap below.
