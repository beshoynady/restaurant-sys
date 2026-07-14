# Owner Identity Design (System Setup V2)

Status: **implemented for Scenarios A and B** (§3) — see `modules/system-setup/onboarding-engine.service.js`'s `_toOwnerIdentityDecided`/`_toOwnerEmployeeProvisioned`. Scenario C's post-onboarding conversion workflow (§7) is designed but **not yet implemented** — it's an authenticated, post-onboarding operation outside the onboarding engine itself, correctly out of this pass's scope; the mechanism it should reuse (Scenario B's Employee-creation logic) already exists and is tested. §2.1's `Employee.isOwner` deprecation and §9's ownership-transfer operation remain future work, unchanged from this document's original recommendation. Builds on `SYSTEM_SETUP_AUDIT.md`, `INITIAL_PROVISIONING_ARCHITECTURE.md`, and `IDENTITY_MODEL.md`.

---

## 1. First-principles question: what *is* "Owner"?

Before designing scenarios, the term itself needs to be decomposed — the current codebase conflates three genuinely different concepts under one word:

1. **Ownership** — a legal/business fact: who has ultimate authority over this tenant (`Brand`). Exactly one answer at any point in time. This is a **Brand-level** fact.
2. **Authorization** — what a given `UserAccount` is permitted to do in the system. Expressed via `Role`/`permissions`. Independent of ownership — a platform admin (`Role.isPlatformAdmin`) or a delegated general manager could hold Owner-equivalent permissions without being the legal owner.
3. **Employment** — whether a person does operational work tracked by HR (shifts, attendance, payroll). Independent of both of the above — an owner may or may not work in the restaurant; a non-owner general manager definitely does.

**The core design rule for this document: these three axes must stay independent.** Changing one must never silently change another. This single rule resolves most of the edge cases the request asks about (retirement, transfer, deletion, conversion) — they stop being special cases and become "which axis is changing, and does it correctly leave the other two alone."

The current implementation already gets axis 2 (Authorization) mostly right — `Role`/`permissions` are wired independently of `Employee`. It gets axis 1 and axis 3 tangled: `Employee.isOwner` (a boolean stored on the *employment* record) is being used to answer the *ownership* question, which is really `Brand.owner` (a *Brand*-level fact). That's a duplicated, driftable source of truth for the same question — flagged already in `IDENTITY_MODEL.md` §2.5, resolved concretely below.

---

## 2. Source of truth for each axis

| Question | Authoritative field | Notes |
|---|---|---|
| "Who owns this Brand?" | `Brand.owner` (ref `UserAccount`) | Single ref, already exists, already required. This is the **only** place ownership is decided. |
| "Is this specific UserAccount the owner?" | Derived: `String(brand.owner) === String(userAccount._id)` | **Not stored anywhere.** See §2.1 — this replaces `Employee.isOwner`. |
| "What can this UserAccount do?" | `UserAccount.role` → `Role.permissions` | Unaffected by ownership or employment. Already correct. |
| "Is this UserAccount also an Employee?" | `UserAccount.employee` (nullable ref) | Already exists, already correct as a mechanism — the redesign is about *when* it gets populated for the Owner specifically, not the field itself. |

### 2.1 `Employee.isOwner` should be deprecated, not extended

Storing "is owner" redundantly on `Employee` creates exactly the failure mode `IDENTITY_MODEL.md` warned about generically: nothing keeps it in sync with `Brand.owner`. Concretely, an ownership transfer (§9) that updates `Brand.owner` but forgets to flip `Employee.isOwner` on both the old and new owner's Employee records leaves the HR module lying about who the owner is, indefinitely, with no mechanism to detect it.

**Recommendation:** treat "is owner" as always-derived, never stored. Any UI or report that needs "is this employee the owner" computes it by comparing `Employee`'s linked `UserAccount._id` against `Brand.owner` at read time (a single indexed lookup, not an expensive join — `Brand.owner` is one field on one document per brand). `Employee.isOwner` becomes a candidate for removal alongside the other dead-field cleanup already flagged in `IDENTITY_MODEL.md` §6 item 1 — **not fixed in this document** (it's a schema change on a live collection, same category as that item, batched with it rather than treated as a special onboarding-only fix). Until that cleanup lands, `Employee.isOwner` must not be trusted or written to by anything built as part of System Setup V2 — the onboarding engine and the conversion workflow (§7) both compute ownership from `Brand.owner` only.

### 2.2 Latent integrity gap found while re-evaluating this axis

`Brand.owner` has no validator confirming the referenced `UserAccount.brand` actually equals this `Brand._id`. Nothing today prevents (accidentally, via a bug elsewhere — not through onboarding, which only ever sets it to a UserAccount it just created in the same brand) `Brand.owner` from pointing to a UserAccount belonging to a *different* tenant. Flagged for the Validation Engine (`INITIAL_PROVISIONING_ARCHITECTURE.md` §8) to add as a check, and for the ownership-transfer operation (§9) to enforce as a hard precondition — not a new finding requiring its own remediation phase, just noted so it isn't silently reintroduced.

---

## 3. The three onboarding-time scenarios

### Scenario A — Owner as System Owner only

- `UserAccount` created, `Brand.owner` set to it.
- `UserAccount.employee` stays `null`, permanently (until/unless a later, explicit conversion — §7).
- No `Employee`, no `Department`/`JobTitle` auto-creation, no HR footprint at all.
- `Branch.manager` (the Main Branch created at onboarding) is left `null` — an owner who isn't operationally staff has no default claim to being listed as the branch's operational manager. Assignable later via the ordinary Branch update path, unrelated to onboarding.
- Payroll: never included in any payroll run (there is no `Employee`, and payroll module — out of this document's scope — operates over `Employee` records). This is correct and intentional, not a gap: an investor-owner's compensation (equity, dividends, distributions) is outside what a restaurant-operations payroll module should model.
- HR: zero footprint — no attendance, no shift, no leave balance, matching the request's explicit description of this scenario.

### Scenario B — Owner as Employee

Everything from Scenario A, plus, in the same onboarding transaction step (`OWNER_EMPLOYEE_PROVISIONED`):

- **`Department`**: auto-create one default department (proposed name: "Management") *only if the brand doesn't already have one* — in practice, at onboarding time the brand never has one yet (it's brand-new), so this is unconditional in practice, but the check should still exist defensively rather than assuming it, since Scenario B logic is reused unmodified by the conversion workflow (§7), which *can* run against a brand that already has departments.
- **`JobTitle`**: auto-create one default title under that department (proposed name: "Owner / General Manager") — same conditional-existence caveat.
- **`Employee`**: created with the onboarding-supplied personal data. See §4 for why this means the onboarding form must actually collect this data when Scenario B is chosen, rather than the engine inventing placeholder values.
- **`UserAccount.employee`** set to the new `Employee._id`.
- **`Employee.defaultBranch`** set to the Main Branch (the only branch that exists at onboarding time); `Employee.branches` set to `[mainBranch._id]`. Per the branch-authority fix already shipped (`IDENTITY_MODEL.md` §6.1), `UserAccount.branch` is deliberately **not** independently set here — it resolves from `Employee.defaultBranch` automatically at login/authorization time, so there is nothing to keep in sync.
- **`Branch.manager`** (Main Branch) is set to the Owner's `UserAccount._id` — in this scenario, the owner *is* operational staff, so defaulting them as the branch's manager is a reasonable, overridable default (changeable later like any other branch field).
- **`EmployeeSettings` / `PayrollSettings` are explicitly NOT created by this step.** Correction to `INITIAL_PROVISIONING_ARCHITECTURE.md`'s original `OWNER_EMPLOYEE_PROVISIONED` description (see §4 there, updated) — these are brand-wide HR *policy* documents needed the moment a brand can have *any* employees, which is true regardless of whether the Owner personally is one. They belong to Settings Provisioning (`SETTINGS_PROVISIONING_ARCHITECTURE.md`), not to the Owner Identity step, and `Employee` creation has no hard dependency on them existing first (`EmployeeSettings`/`PayrollSettings` are read by other HR workflows, not by `Employee.create()` itself).

### Scenario C — Decide later

- Identical resulting data to Scenario A at the moment onboarding completes: `UserAccount.employee` stays `null`, no `Employee`/`Department`/`JobTitle` created.
- The **only** difference from Scenario A is recorded intent: `OnboardingSession.ownerIdentityScenario = "DECIDE_LATER"` (vs `"OWNER_ONLY"`) is retained on the completed session record purely as a UX signal (e.g., surfacing a "Complete your employee profile" prompt in the dashboard) — it has no further effect on any model or business rule. Being honest about this in the design: **there is no structural difference between Scenario A and Scenario C beyond that one stored intent flag.** Anything either scenario can do, the other can too — including converting to an employee later (§7 is not gated to only `DECIDE_LATER` accounts; see §7.1).

---

## 4. Consequence of Scenario B: onboarding must collect real HR data, not invent it

`Employee.firstName`/`lastName`/`gender`/`dateOfBirth`/`nationalID`/`phone` are all `required: true` with real validation (e.g. minimum-age check on `dateOfBirth`) — there is no "draft" or partially-valid `Employee` state in the current schema, and this document does not propose adding one (that would be a schema change weakening HR data integrity, a bigger and separately-justified decision, not something to slip in for the sake of a shorter onboarding form).

**Consequence:** if the onboarding user picks Scenario B, the onboarding flow's form **must** collect this real personal data before the `OWNER_EMPLOYEE_PROVISIONED` step can run — there is no shortcut. This is an accepted, deliberate cost of choosing Scenario B, not a defect to design around. Scenario A/C users never see this form at all (`OWNER_IDENTITY_DECIDED` gates whether the extra fields are even requested), so this doesn't burden the common fast-signup path.

---

## 5. Authentication — orthogonal to scenario

Per `INITIAL_PROVISIONING_ARCHITECTURE.md`'s `AUTH_CONFIGURATION_CREATED` state: identical for all three scenarios. `AuthenticationSettings`, the Owner's real `Session` (issued through `authService`, not a parallel token path — audit Finding 1.1), and eventual login-method choice (password now; PIN/barcode/QR/passkey/OAuth as those methods come online per the IAP roadmap) are all properties of the **UserAccount**, not the Employee. A Scenario A investor-owner is just as entitled to a fast PIN login for checking a dashboard from a tablet as a Scenario B owner-operator is — login-method preference is a UX/security choice, not an HR fact. No scenario-specific authentication logic is needed anywhere.

---

## 6. RBAC — orthogonal to scenario

The Owner `Role` (full permissions, `isSystemRole: true`) is granted identically regardless of A/B/C — `UserAccount.role` doesn't reference `Employee` at all, and nothing in this design changes that. This is the other half of the "three independent axes" rule from §1: employment status must never gate or expand authorization. A Scenario A owner has exactly the same platform permissions as a Scenario B owner; the only difference is whether HR-domain actions (clocking in, being assigned a shift) are even meaningful for that UserAccount, which they aren't in either A or C, and are in B.

---

## 7. Conversion workflow — Employee record added after onboarding

### 7.1 Not gated to Scenario C

The request frames conversion as "Scenario C chooses later"; re-evaluating from first principles, there's no reason to lock this capability to accounts that specifically chose `DECIDE_LATER` — a Scenario A owner who genuinely never planned to work in the restaurant, but later starts covering shifts personally, should have the identical path available. **Design decision: the conversion workflow is available to any owner whose `UserAccount.employee` is currently `null`**, regardless of which onboarding scenario they originally chose. `ownerIdentityScenario` remains purely historical/informational once onboarding completes (§3).

### 7.2 Mechanism

This is **not part of the onboarding state machine** — it's a separate, authenticated, post-onboarding operation (the owner is already logged in, using the product). Precondition: caller is authenticated as the `UserAccount` referenced by `Brand.owner`, and `UserAccount.employee` is currently `null`.

Reuses the exact Scenario B logic (§3) unmodified — same `Department`/`JobTitle`-if-absent creation, same `Employee` creation from caller-supplied personal data, same `UserAccount.employee` assignment, same `Branch.manager` default (only if not already assigned to someone else — this call site, unlike fresh onboarding, might be running against a Main Branch that already has a different manager, so this becomes a real conditional here, not a defensive no-op). One transaction, atomic.

### 7.3 What must NOT change (the actual hard requirements from the request)

Directly falls out of the "three independent axes" principle in §1 — none of these are special-cased exceptions, they're just axis 3 (Employment) changing while axes 1 and 2 (Ownership, Authorization) are untouched by definition:

- **Permissions**: `UserAccount.role` is not touched. The conversion operation has no reason to read or write it.
- **Sessions**: `Session` has no reference to `Employee` at all (confirmed — `session.model.js`'s fields are `brand`/`user`/`refreshTokenHash`/`device`/etc., no `employee`). No forced logout, no session invalidation needed.
- **JWT**: confirmed via `jwt.utils.js` — access/refresh token payloads carry `id`/`brand`/`role`/`branch` claims, no `employee` claim. No token re-issuance required; existing tokens remain valid and correct through the conversion.
- **Orders / audit logs / historical references**: everything that references "who did this" points at `UserAccount._id`, which never changes during conversion. `SecurityEvent.user`, `AuditLog` actor fields, order `createdBy`-style fields are all unaffected.
- **Relationships**: `Brand.owner` is untouched (still points at the same `UserAccount`) — conversion is purely additive (`UserAccount.employee` goes from `null` to a real ref), never a replacement of anything.

This is why the request's framing of this as needing careful, risky migration design turns out to be simpler than it sounds once the three-axes principle is applied: **the only mutation is one new document (`Employee`) and one field going from `null` to set.** No cascading updates anywhere.

### 7.4 Idempotency

If `UserAccount.employee` is already set, the conversion endpoint rejects with a clear "already linked to an employee record" error rather than creating a second `Employee` or silently no-op-succeeding (a silent no-op would hide a caller's mistaken assumption that a *new* profile was being created).

---

## 8. Employee deletion / termination rules — specifically for the Owner

Re-stating the axis-independence rule as a hard business rule for this specific, high-consequence case:

**Terminating or deleting the Employee record linked to the current `Brand.owner` must never deactivate their `UserAccount`, revoke their `Role`, or change `Brand.owner`.** Employment ending (the owner steps back from day-to-day floor work) is not the same event as ownership ending (the owner sells the business) or authorization ending (the owner is locked out) — conflating them would violate §1's core rule in the single highest-consequence case possible.

**Open risk flagged, not resolved here:** Phase 1's audit did not check whether any *existing* generic employee-termination logic (referenced obliquely by `EmployeeSettings`'s "status-change rules"/"account-creation policy" fields, per the Phase 1 settings inventory) already auto-deactivates a linked `UserAccount` when an `Employee.status` changes to terminated. **This must be verified before implementing the conversion/termination interaction for the Owner case** — if such generic cascading logic exists, it needs an explicit carve-out for `UserAccount`s that are `Brand.owner`, added at whatever service layer currently implements that cascade (not duplicated into the onboarding module). Not designed further here because the underlying generic behavior hasn't been confirmed to exist or not.

**Hard-delete guard:** hard-deleting an `Employee` whose linked `UserAccount` is the current `Brand.owner` should be disallowed outright (not just soft-delete-preferred, which is presumably already the general convention for employees with transactional history per this project's established master-data-vs-transactional-document soft-delete policy) — a business rule specific to the Owner case: **ownership must be transferred (§9) before the outgoing owner's Employee record can be removed at all**, soft or hard. This prevents an accidental or malicious deletion from leaving the brand's ownership pointer referencing a `UserAccount` whose employment history just vanished, which is a confusing, hard-to-audit state even though `Brand.owner` itself would technically still resolve (deleting `Employee` doesn't touch `UserAccount`).

---

## 9. Ownership transfer (sale of business / retirement)

### 9.1 `Brand.owner` cannot be null — retirement without a successor is not representable

`Brand.owner` is `required: true`. This is a correct constraint to keep, not relax: an ownerless-but-still-active `Brand` is an undefined authority state (who can authorize what?). **"Retirement" must be modeled as "transfer to a successor,"** even if that successor is a designated administrator/interim role, never as "removal without replacement." If a business genuinely closes, that's `Brand.status = "inactive"` (already an existing enum value) or a future deletion/archival workflow — a completely different operation from ownership transfer, out of scope here.

### 9.2 Transfer mechanism

Proposed as an authenticated, owner-only (or platform-admin-only, for a support-assisted transfer) operation, atomic:

1. **Precondition**: incoming owner must be a `UserAccount` where `userAccount.brand === thisBrand._id` (closes the integrity gap noted in §2.2 — an outsider from another tenant can never become this brand's owner through this path) — either an existing staff `UserAccount` being promoted, or a brand-new one created as part of the same transfer operation.
2. **The pointer change itself**: `Brand.owner = newUserAccountId` — one atomic update, wrapped in a transaction alongside step 3.
3. **Audit**: recorded as a `SecurityEvent` (proposed new `eventType`: `OWNERSHIP_TRANSFERRED`, additive to the enum per that model's established convention — same pattern as the onboarding-event types proposed in `INITIAL_PROVISIONING_ARCHITECTURE.md` §9) — this is a high-sensitivity action and must always be logged, no exceptions.
4. **The outgoing owner's `Role`/`UserAccount` status is a deliberately separate, explicit step** — not an automatic side-effect of the pointer change. An operator/new-owner may choose to downgrade the old owner's role or deactivate their account, but that's its own decision requiring its own confirmation, never bundled silently into "who owns this brand" changing. (Rationale: the outgoing owner might be staying on as an employee/manager — see §9.3 — in which case their account should absolutely *not* be deactivated as a side effect.)
5. **`Employee.isOwner`** (if that field still exists at the time this is implemented — see §2.1's deprecation note): if not yet removed, must be explicitly flipped for both old and new owner's `Employee` records as part of this same transaction, specifically *because* it's a duplicated, driftable field — one more reason to prioritize its removal ahead of implementing transfer, so this step doesn't need to exist at all.

### 9.3 The outgoing owner's `Employee` record survives the transfer unchanged

If the outgoing owner had a linked `Employee` (Scenario B or a later conversion), that record is **not** touched by the transfer itself — their employment history doesn't retroactively disappear because ownership changed hands. Whether they continue as staff after the sale is an independent HR decision (§8's termination path, if applicable), not an automatic consequence of the ownership transfer.

---

## 10. Franchise / multi-brand — honest limitation, not solved here

Re-evaluating from first principles surfaced a real, significant gap that this document does **not** attempt to close (it's a platform-identity-model change, far larger than onboarding):

**`UserAccount.brand` is a single required ref — one `UserAccount` belongs to exactly one tenant.** There is currently no way for one human to hold a single login that spans multiple `Brand` tenants. An owner who opens a second, independent restaurant (a second `Brand`) today needs a **completely separate `UserAccount`** — different login, different credentials, no shared identity — for each brand they own. The only existing cross-tenant concept in the whole codebase is `Role.isPlatformAdmin`, and that's for platform *staff* managing the SaaS itself, not for a restaurant owner managing several of their own brands.

This means "Future Multi Brand Ready" and "Future Franchise Ready" (stated design principles for this whole initiative) are **not** achieved by anything in this document or in `INITIAL_PROVISIONING_ARCHITECTURE.md` — those documents make onboarding correctly *repeatable* (any number of brands can each complete their own independent onboarding), which is necessary but not sufficient for true franchise identity (one owner, several brands, one login). Closing that gap would require introducing a higher-level identity concept above `UserAccount` (a `Person`/`PlatformIdentity` that can hold multiple brand-scoped memberships, each with its own role) — a genuinely major redesign of the identity model's root, not something to fold into System Setup V2. **Recorded here explicitly as a known, deliberate limitation and a real future roadmap item**, not silently left undiscovered.

What *is* already supported today, and should not be confused with the above: **one `Brand` with many `Branch`es** (a single-entity restaurant chain) — that's the existing, working multi-branch model (`Brand.maxBranches`, subscription-gated), unrelated to the multi-*brand*-per-owner gap described here.

---

## 11. Summary of decisions in this document

| Decision | Status |
|---|---|
| Ownership, Authorization, Employment are three independent axes; no operation may cross-affect an axis it doesn't own | Core principle, applied throughout |
| `Brand.owner` is the sole source of truth for ownership; "is this UserAccount the owner" is always derived, never stored | Decided |
| `Employee.isOwner` should be deprecated (removal batched with `IDENTITY_MODEL.md` §6 item 1, not fixed here) | Flagged, not implemented |
| `Brand.owner` needs a same-tenant integrity check (currently missing) | Flagged for the Validation Engine and for the transfer operation's precondition |
| Scenario A/B/C behavior, fully specified | Decided (§3) |
| `EmployeeSettings`/`PayrollSettings` provisioning moved out of Owner Identity into Settings Provisioning | Correction applied — carries over to `SETTINGS_PROVISIONING_ARCHITECTURE.md` |
| Scenario B requires real HR data at onboarding time; no placeholder/draft Employee | Decided — accepted cost, not a defect |
| Conversion workflow available to any owner with no Employee link, not just `DECIDE_LATER` accounts | Decided (§7.1) |
| Conversion is additive-only; no session/JWT/role/audit impact | Decided, verified against actual schemas (§7.3) |
| Whether generic employee-termination cascades to `UserAccount` deactivation | **Unverified — must be checked before implementing §8/§9** |
| Owner's Employee record cannot be hard-deleted without a prior ownership transfer | Decided (§8) |
| `Brand.owner` cannot be null; retirement = transfer, never removal | Decided (§9.1) |
| Ownership transfer mechanism, atomicity, and audit requirement | Decided (§9.2) |
| True multi-brand-per-owner identity is NOT solved by System Setup V2 | Explicitly documented limitation (§10) |

Nothing in this document modifies any model, service, controller, or router.
