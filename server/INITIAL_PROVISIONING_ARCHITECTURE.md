# Initial Provisioning Architecture — Phase 2 Design (System Setup V2)

Status: **implemented.** See "Implementation Status" at the end of this document for what shipped, what changed from this design during implementation, and where to find the code/tests. This document is kept as the architectural record — the reasoning here is still authoritative for why the system is shaped this way.

Confirmed scope decision from Phase 1 review: **"already initialized" becomes per-tenant/brand-scoped**, not platform-global. Every design decision below follows from that.

---

## 1. Why a single atomic transaction cannot deliver what's being asked for

The current implementation wraps the entire flow (Brand → Branch → Role → UserAccount → Brand-update) in one Mongoose transaction. That's genuinely good for the guarantee it provides — all-or-nothing — but the redesign asks for two things that a single cross-step transaction structurally cannot provide at the same time:

- **Resumable across a process restart.** A Mongo transaction cannot survive the server process dying mid-transaction and being restarted — there is no "resume this transaction" operation. If the server crashes between creating the `Role` and creating the `UserAccount`, the transaction aborts and every bit of work is lost, forcing a full retry from scratch. That's not resumability, that's just atomicity with a large blast radius.
- **Recoverable without duplicating work.** Even with a perfect global "already initialized" guard, a full-flow retry after a partial failure has to redo everything, including the parts that already succeeded and were expensive (e.g., re-validating and re-slugging a Brand name that was already accepted).

**Resolution: a saga-style state machine.** Each state transition is *itself* wrapped in its own small, atomic Mongoose transaction (so "atomic" still applies — just at per-step granularity, not whole-flow granularity), and the overall sequence of steps is made resumable by durably persisting *which step is next* in a dedicated document that survives process restarts. This is the same pattern used by every reference platform named in the request (Stripe Connect onboarding, Auth0 tenant setup, Shopify partner onboarding) — none of them wrap a multi-minute, multi-screen onboarding flow in one database transaction, for exactly this reason.

---

## 2. New model: `OnboardingSession`

A new collection — not a change to `Brand`'s schema — because the whole point is to track a provisioning attempt as a first-class thing that exists *before* a `Brand` is trustworthy, and independently of whether it ever succeeds. This is the actual Single Source of Truth for "where is this tenant's onboarding right now," replacing the audit's finding that `Brand.findOne()` (which answers a completely different question) was being used as a stand-in for it.

Proposed fields (names indicative, not final — confirm before implementation):

| Field | Purpose |
|---|---|
| `token` | Opaque, cryptographically random (e.g. 32-byte, base64url) — the bearer credential that lets an unauthenticated caller resume *this specific* onboarding attempt. Unique, indexed. Never derived from user-supplied data (not email, not brand name) — see §6. |
| `state` | Current state (enum — see §3). The SSOT for progress. |
| `licenseAcceptedAt` | Timestamp; null until step 1 completes. |
| `ownerIdentityScenario` | `"OWNER_ONLY"` \| `"OWNER_AS_EMPLOYEE"` \| `"DECIDE_LATER"` — set at the `OWNER_IDENTITY_DECIDED` state (§5). |
| `brand` (ref Brand) | Set once `BRAND_DRAFTED` completes. |
| `branch` (ref Branch) | Set once `MAIN_BRANCH_CREATED` completes. |
| `ownerRole` (ref Role) | Set once `DEFAULT_ROLES_CREATED` completes. |
| `owner` (ref UserAccount) | Set once `OWNER_ACCOUNT_CREATED` completes. |
| `employee` (ref Employee, nullable) | Set only if `OWNER_AS_EMPLOYEE` was chosen and that step ran. |
| `validationReport` | Result of the Phase 10 validation engine (see §8) — stored, not just returned, so a resumed session can inspect why a prior attempt failed `VALIDATED`. |
| `completedAt` | Set on reaching `READY`. Terminal. |
| `failedAt` / `lastError` | Set if a step's transaction aborts; the session stays at its last successfully-completed state (not advanced), so retrying re-attempts the same failed step. |
| `expiresAt` | TTL for abandoned attempts — see §6. |
| `createdByIp` | For audit/rate-limiting correlation (§9), not for authorization (there's no authenticated actor yet). |

`state` is the single field that answers "what should happen if this token is presented again" — every other field is either an input already captured or a reference to something already created, so a resume operation never needs to re-ask for data that was already provided in an earlier step (this is the "no hidden defaults, no data loss on resume" guarantee from the request's design principles).

---

## 3. The state machine

Revised from the request's illustrative example — reordered where the actual data dependency graph requires it, and with the Owner Identity decision made an explicit first-class state rather than left implicit. Each arrow is one atomic transaction.

```
NOT_STARTED
    │  (client calls POST /setup/session → OnboardingSession created, token issued)
    ▼
LICENSE_ACCEPTED
    │  (owner + brand + branch input supplied together or across steps — see §7)
    ▼
BRAND_DRAFTED               — Brand.create({validateBeforeSave:false}); owner still null (documented
    │                          circular-dependency pattern, unchanged from current implementation —
    │                          it was correct, kept as-is)
    ▼
MAIN_BRANCH_CREATED         — Branch.create({isMainBranch:true}); guarded so a second call with the
    │                          same token can never create a second Main Branch (state-match filter,
    │                          see §4)
    ▼
OWNER_IDENTITY_DECIDED       — records ownerIdentityScenario; no documents created yet, purely a
    │                          decision checkpoint (moved earlier than the request's example placed
    │                          it, because the next two states need to know the answer)
    ▼
DEFAULT_ROLES_CREATED       — Owner Role created (+ any other seeded default roles, Phase 7 —
    │                          scope TBD, see §10); reordered BEFORE owner-account creation
    │                          (current implementation already does this — Role must exist so
    │                          UserAccount.role can be set in one step, not patched after)
    ▼
OWNER_ACCOUNT_CREATED       — UserAccount.create(...) with role already assigned; password hashed
    │
    ▼
BRAND_FINALIZED             — Brand.owner = user._id; Brand.setupStatus = "complete"; brand.save()
    │                          (closes the circular dependency — same mechanism as today)
    ▼
OWNER_EMPLOYEE_PROVISIONED  — conditional on ownerIdentityScenario:
    │                            OWNER_AS_EMPLOYEE → create Employee (+ default Department/JobTitle
    │                              if the brand has none) — see §5. Correction per
    │                              OWNER_IDENTITY_DESIGN.md §3: EmployeeSettings/PayrollSettings are
    │                              NOT created here — they're brand-wide HR policy needed the moment
    │                              a brand can have ANY employees, independent of whether the Owner
    │                              personally is one, so they belong to
    │                              OPERATIONAL_DEFAULTS_PROVISIONED instead, unconditionally.
    │                            OWNER_ONLY / DECIDE_LATER → explicitly marked skipped-by-design in
    │                              the session record (not silently absent — a validation-report
    │                              reader must be able to tell "correctly skipped" from "forgot to
    │                              run")
    ▼
AUTH_CONFIGURATION_CREATED  — AuthenticationSettings.create({brand}) with brand-appropriate defaults;
    │                          Owner's first Session issued through the REAL authService/
    │                          sessionService path (fixes audit Finding 1.1) — NOT a second
    │                          jwt.utils.js call. PASSWORD stays on UserAccount.password for this
    │                          version (the AuthCredential migration is separately flagged as
    │                          still-open in IDENTITY_MODEL.md §6 item 3 — not bundled into this
    │                          redesign)
    ▼
OPERATIONAL_DEFAULTS_PROVISIONED — the settings documents identified in the Phase 1 audit §3 as
    │                          blocking (order-settings, invoice-settings, tax-settings minimum;
    │                          EmployeeSettings/PayrollSettings already handled above if applicable)
    ▼
VALIDATED                   — Phase 10 validation engine runs (§8); failures keep state at
    │                          VALIDATED-pending with a stored report, do not advance to READY
    ▼
READY                       — terminal. completedAt set. Brand is live.
```

**Guarantee this gives for free:** "never create another Owner, never create another Main Branch" (a Phase 11 requirement) falls directly out of the state machine — `MAIN_BRANCH_CREATED` and `OWNER_ACCOUNT_CREATED` are each executed by exactly one state transition, and a transition only runs if the session's current `state` matches the expected precondition (§4). There is no separate "duplicate prevention" logic to write — it's structural.

---

## 4. Per-step atomicity and idempotent resume

Each transition:

1. Atomically claims the step: `OnboardingSession.findOneAndUpdate({_id, state: EXPECTED_PRIOR_STATE}, {$set: {state: "IN_PROGRESS_MARKER"}})` — the same optimistic-concurrency pattern already used elsewhere in this codebase for sequence generation (`{quantity: {$gte: quantity}}`-style conditional updates). If this returns null, either the step already ran (resume-safe no-op — return the current state/result) or another concurrent request is mid-transition (reject with a clear "in progress" response, not a silent double-run).
2. Opens a Mongoose transaction, performs the step's document creation(s), and updates `OnboardingSession.state` to the new completed state — all inside that one transaction.
3. On any failure: transaction aborts (no partial documents from *this* step persist), `OnboardingSession.failedAt`/`lastError` are set in a small separate write (outside the aborted transaction, so the failure itself is recorded even though the step's own work rolled back), `state` remains at the last successfully completed value.
4. Resume = client presents the same `token`; the server reads `state` and runs only the next transition. No re-input of already-captured data, no re-creation of already-created documents.

This is what makes the flow genuinely resumable across a server crash: the durable fact of "which state are we in" lives in MongoDB, not in server memory or a single long-lived transaction.

---

## 5. Owner Identity — three scenarios (state machine integration)

Full design reserved for the dedicated `OWNER_IDENTITY_DESIGN.md` deliverable; the state-machine-relevant summary:

- **Scenario A (`OWNER_ONLY`)** — `OWNER_EMPLOYEE_PROVISIONED` is a documented no-op. This is what the current implementation already does today, but currently by accident (no decision was ever made — it's just the only path that exists). Making it an explicit, chosen scenario is the fix.
- **Scenario B (`OWNER_AS_EMPLOYEE`)** — `OWNER_EMPLOYEE_PROVISIONED` creates `Employee` and a default `Department`/`JobTitle` pairing if the brand has none yet (e.g. "Management" / "Owner / General Manager") so `Employee.department`/`jobTitle` (both `required: true`) can be satisfied without asking the onboarding user to design an org chart before they've even seen the product. `EmployeeSettings`/`PayrollSettings` are deliberately **not** created here (correction — see `OWNER_IDENTITY_DESIGN.md` §3; they're unconditional brand-wide policy, provisioned in `OPERATIONAL_DEFAULTS_PROVISIONED` regardless of scenario). `UserAccount.employee` is set to the new Employee's id, and — per the branch-authority fix already shipped in `IDENTITY_MODEL.md` §6.1 — `UserAccount.branch` is left to resolve from `Employee.defaultBranch` going forward rather than being independently set here.
- **Scenario C (`DECIDE_LATER`)** — `OWNER_EMPLOYEE_PROVISIONED` is a no-op at onboarding time, but *unlike* Scenario A, the session records the intent to convert later. The actual conversion (`UserAccount` → gains an `Employee` link after the fact) is explicitly **not part of the onboarding state machine** — it's a separate, authenticated, post-onboarding workflow (the Owner is already logged in, using the product) that needs its own careful design for the exact concerns the request lists: it must not disturb existing `Role`/permissions (the `UserAccount.role` doesn't change), existing `Session`s (no forced logout), order/audit-log references (nothing referencing `UserAccount._id` needs to change, since the Employee link is additive), or JWT claims (the access token doesn't carry an `employee` claim today — confirmed via `jwt.utils.js` — so no token re-issuance is even required by this conversion). This makes the Scenario C conversion lower-risk than it might sound: it is structurally just "create an Employee document and set `UserAccount.employee` to point to it," reusing the exact same Scenario B provisioning logic, triggered from a different (authenticated, later) entry point instead of from onboarding. Full workflow design deferred to `OWNER_IDENTITY_DESIGN.md`.

---

## 6. Token design and expiry

- `token`: 32 random bytes, base64url-encoded, generated server-side on `NOT_STARTED → LICENSE_ACCEPTED`. Never derived from or containing any user-supplied value (not email, not brand name) — an attacker who knows a prospective owner's email must not be able to guess or derive their in-progress onboarding token.
- Returned to the client once, in the response body of the first call. The client (onboarding wizard frontend) is responsible for holding it across the multi-step flow (e.g., in a query param or local storage) — same UX pattern as Stripe's onboarding-link tokens.
- `expiresAt`: proposed 24 hours from creation, refreshed on each successful step (so an actively-progressing onboarding never expires mid-flow, but an abandoned one doesn't sit around indefinitely). An expired, incomplete session's `Brand`/`Branch`/etc. documents are **not automatically deleted** in this design — a `Brand` with `setupStatus != "complete"` is inert (can't authenticate against it, since `AUTH_CONFIGURATION_CREATED` never ran) and is left for an operator/cleanup job to review rather than silently auto-deleted, per "never corrupt data" — auto-deleting a Brand a real prospective customer is still mid-signup on, just because a clock expired, is its own kind of data loss. Cleanup-job design is out of scope for this document.

---

## 7. Breaking change: the public contract of `POST /setup/initialize` changes — needs explicit confirmation

This is the one item in this design that directly triggers the standing "wide blast radius — stop and present before implementing" rule, separate from everything else being new.

**Today:** one unauthenticated `POST /setup/initialize` call, full payload (`owner` + `brand` + `branch`) in one request, synchronous all-or-nothing response.

**Under this design:** onboarding becomes multiple calls against an `OnboardingSession`, addressed by `token`.

**Any existing frontend or integration that calls the current single-shot endpoint will break** unless one of the following is done — this needs a decision before implementation:

- **Option A (recommended): keep a single-shot convenience endpoint.** `POST /setup/initialize` continues to accept the full payload in one call, but internally it creates an `OnboardingSession` and drives every state transition through to `READY` in one server-side pass (still per-step-transactional internally, just not exposed as separate HTTP round-trips to this particular caller). This preserves the existing contract exactly (same request shape, same response shape) for any caller that already sends everything upfront, while the new multi-step endpoints (`POST /setup/session`, `POST /setup/session/:token/<step>`, `GET /setup/session/:token`) become available for a real multi-screen wizard frontend that wants to save progress between screens. Only requires the Owner Identity scenario to be decided upfront too (a new required field the current payload doesn't have) — the one unavoidable shape change, and a minor one.
- **Option B: version the endpoint.** `POST /setup/initialize` (v1 contract) is deprecated but kept functioning via Option A's internal implementation anyway; a new `/setup/v2/*` surface is documented as the forward path. Same engineering cost as Option A, more API-surface ceremony, no clear benefit unless there's a specific reason to formally deprecate rather than transparently extend.
- **Option C: accept the break.** Only viable if it's confirmed nothing currently depends on the existing single-shot contract (no frontend build, no test, no external integration) — Phase 1 audit did not check frontend usage of this endpoint (out of the `server/` scope of this audit), so this has not been verified either way.

This document does not choose between these — it's flagged here specifically so the choice is made deliberately before any router/controller code changes.

---

## 8. Validation Engine (Phase 10) — concrete checklist

Runs at the `VALIDATED` state, produces the stored `validationReport`. Each check maps to an actual query against the schemas audited in Phase 1, not a vague aspiration:

| Check | Query/rule |
|---|---|
| No orphan Branch | `Branch.brand` resolves to the session's `Brand` |
| No orphan Role | Owner Role's `brand` matches; exactly one `isSystemRole:true` role for this brand |
| No duplicate Owner | Exactly one `UserAccount` referenced by this session; `Brand.owner` matches it |
| No broken Branch | `isMainBranch:true` branch exists, exactly one, for this brand (existing partial-unique-index already guarantees this at the DB level — validation re-confirms it as a defense-in-depth check, not the only line of defense) |
| No broken authentication | `AuthenticationSettings` document exists for `{brand, branch:null}`; `UserAccount.password` is a valid bcrypt hash (format check, not a decrypt) |
| No inconsistent employee linkage | If `ownerIdentityScenario == OWNER_AS_EMPLOYEE`: `Employee` exists, `Employee.brand` matches, `UserAccount.employee` points to it, `Employee.department`/`jobTitle`/`defaultBranch` are all set and `defaultBranch` matches the session's Main Branch |
| No invalid configuration | Every settings document created in `OPERATIONAL_DEFAULTS_PROVISIONED` passes its own Mongoose validation (re-fetched and re-validated, not just trusted from creation time — catches any concurrent external mutation between steps) |
| No duplicated roles/permissions | No two roles for this brand share `isSystemRole:true`; the Owner role's `permissions` array has no duplicate `{resource,branch}` pairs |

Failure of any check keeps `state` at `VALIDATED` with `validationReport.passed = false` and a itemized list — the session is resumable (an operator or the onboarding flow itself can be extended with a repair path later), never silently marked `READY` with known-broken state.

---

## 9. Security posture (Phase 12) — what changes vs. what's confirmed already adequate

- **Already adequate, unchanged:** bcrypt password hashing (cost 10), no default/seeded passwords (always caller-supplied).
- **New:** per-endpoint rate limiting specific to `/setup/*`, stricter than the app-wide 100 req/min (proposed: a much lower ceiling per IP, e.g. 5 attempts per hour, given this is a low-frequency, high-sensitivity operation — exact number is a product decision, not fixed here). Token possession is the actual authorization mechanism for resuming a specific session (§6) — this needs to be paired with rate limiting on token *guessing* (repeated `POST /setup/session/:token/...` with invalid tokens from one IP should itself be throttled/logged).
- **New:** every state transition recorded as an auditable event. Recommend extending `SecurityEvent.eventType`'s enum (additive, per that model's own established convention — see `security-event.model.js`) with onboarding-specific values (e.g. `ONBOARDING_STARTED`, `ONBOARDING_STEP_COMPLETED`, `ONBOARDING_FAILED`, `ONBOARDING_COMPLETED`) rather than inventing a parallel audit mechanism — reuses the existing Security Event Platform instead of duplicating it, consistent with "never duplicate responsibility."
- **New:** replay protection on the token itself is inherent to it being single-use-per-state (§4's atomic claim-then-transition pattern) — presenting the same token twice for a step that already completed is a safe no-op, not a replay that re-executes anything.
- **Confirmed by audit, needs fixing regardless of the rest of this design:** Finding 1.4's race condition and Finding 1.7's dead code are small, independent, low-risk fixes that don't need to wait for the full state-machine implementation — they could be shipped standalone if useful.

---

## 10. Explicitly deferred / out of scope for this design pass

- Full default-role catalog beyond Owner (Administrator, Branch Manager, Cashier, Kitchen, Waiter, Delivery, Accountant, HR, Purchasing, Inventory, Customer Support — Phase 7 of the request) — needs its own scoping pass on which are auto-created vs. available-as-templates, not decided here.
- Full settings-provisioning list beyond the audit's "blocking" subset (§3 of the audit) — the other ~18 settings modules' lazy-default behavior needs verifying individually before finalizing what onboarding creates vs. leaves lazy.
- `AuthCredential`/`PASSWORD` migration (`IDENTITY_MODEL.md` §6 item 3) — intentionally not bundled into this redesign; onboarding will create the Owner's password the same way `UserAccount.password` already works today.
- Franchise / multi-brand-under-one-owner onboarding (an owner who already has one brand starting a second) — the state machine above provisions one Brand per `OnboardingSession`; a returning-owner flow is a distinct, later scenario not designed here.
- Frontend/wizard UI design — this document specifies the server-side contract only.

---

## 11. What this document originally deferred (§10/§11 as first written)

At design time this document deliberately did not create any model or code, and left §7 (endpoint compatibility) and the Phase 7/8 scoping questions open pending review. All of that has since been resolved — see Implementation Status below.

---

## 12. Implementation Status

**§7 resolved: Option A, confirmed.** `POST /setup/initialize` keeps its exact original request/response shape. It now internally calls the same onboarding engine every step-based endpoint calls (`modules/system-setup/onboarding-engine.service.js`) — begins a session, writes the whole payload into `draftInput` in one pass, and calls `complete()`. It contains no business logic of its own, per the explicit instruction this was implemented under. Full design of the step-based operation set is in `ONBOARDING_API_DESIGN.md`, written and implemented immediately after this document.

**What shipped:**
- `modules/system-setup/onboarding-session.model.js` — the `OnboardingSession` model exactly as designed in §2, plus the `draftInput` field added by `ONBOARDING_API_DESIGN.md` §2.
- `modules/system-setup/onboarding-engine.service.js` — the full state machine (§3), the atomic-per-step transition runner (§4), the validation engine (§8, `_toValidated`), and the Owner's real session issuance via the actual `authService`/`sessionService` path (fixing audit Finding 1.1 — confirmed by test that the issued refresh token is genuinely redeemable, which the prior implementation's was not).
- `modules/system-setup/setup.controller.js` / `setup.router.js` — the eight operations from `ONBOARDING_API_DESIGN.md` §3, plus the backward-compatible wrapper, plus the two-tier rate limiting from that document §5.
- `OWNER_EMPLOYEE_PROVISIONED`'s scope was corrected during the Owner Identity design pass (§3 above already reflects this) — `EmployeeSettings`/`PayrollSettings` moved to the unconditional settings step per `OWNER_IDENTITY_DESIGN.md` §3.
- §10's default-role-catalog and settings-provisioning scoping questions were resolved by `DEFAULT_ROLE_ARCHITECTURE.md` and `SETTINGS_PROVISIONING_ARCHITECTURE.md` respectively, both fully implemented (`modules/iam/role-template/*`, the fourteen settings documents created in `_toOperationalDefaultsProvisioned`).
- Still correctly deferred, unchanged from §10: `AuthCredential`/`PASSWORD` migration, franchise/multi-brand-under-one-owner identity (see `OWNER_IDENTITY_DESIGN.md` §10), frontend wizard UI.

**Verified:** `tests/integration/onboarding-engine.test.ts` (7 tests: full Scenario A completion with a redeemable session, idempotent replay, per-tenant independence — the direct proof of the §0 fix, cancel/restart, Scenario B provisioning, clean failure without state corruption, RoleTemplate instantiation). Full regression: 33 suites / 165 tests passing. `tsc --noEmit` unchanged at the pre-existing 58-error baseline. Live-booted and smoke-tested over real HTTP: the full step-based flow end-to-end, the backward-compatible endpoint, and — the concrete, load-bearing proof of this whole redesign — **`POST /setup/initialize` called twice for two different tenants, both succeeding**, where the previous implementation would have rejected the second call outright.
