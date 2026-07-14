# Onboarding API Design — Frontend-First Contract (System Setup V2)

Status: **implemented.** All eight operations exist in `modules/system-setup/setup.router.js`/`setup.controller.js`, backed by `onboarding-engine.service.js`. Independent re-validation of `INITIAL_PROVISIONING_ARCHITECTURE.md`'s original endpoint sketch, done specifically because that document under-designed this part — it proposed "one endpoint per state" without stress-testing it against real wizard UX, which is exactly the "design APIs around database tables" anti-pattern this pass was asked to avoid.

Verified against the actual current implementation (`setup.service.js`, `setup.controller.js`, `setup.router.js`, `setup.validation.js`), not just the prior audit — confirms every finding in `SYSTEM_SETUP_AUDIT.md` still holds, including one not previously stated as bluntly: **the current implementation's issued refresh token is unusable.** `signRefreshToken(user)` is called with no `sessionId` argument, so the token carries no `sid` claim; `authService.refresh()` looks up an active `Session` by hash to resolve a refresh, and no `Session` document was ever created. The Owner's very first refresh token can never actually be redeemed — not just an architectural smell, a concrete functional bug in the code being replaced.

---

## 1. The core insight: wizard screens and backend states are two different sequences

`INITIAL_PROVISIONING_ARCHITECTURE.md`'s state machine (Brand → Branch → Roles → Owner Account → ...) is ordered by **data dependency** — Role must exist before a UserAccount can reference one, Brand must exist before Branch can reference it. That ordering is correct and does not change.

But a wizard screen order should be ordered by **UX** — and the UX-correct first question for "someone signing up for a SaaS product" is usually "who are you" (name/email/password), not "what's your business's legal name." Every reference product named in the request front-loads identity before business details.

**These two orderings don't have to match, and forcing them to match is the actual mistake to avoid.** The resolution: the wizard collects input across screens in whatever order is best for the human, and the backend accumulates that input on the `OnboardingSession` (§2) without committing dependency-ordered documents until enough input exists to do so correctly. A screen submitting doesn't necessarily equal a state transition — most screens just save draft data; specific "complete" actions trigger the actual state-machine execution.

---

## 2. `OnboardingSession` — one addition to the Phase 2 design

`INITIAL_PROVISIONING_ARCHITECTURE.md` §2 already specifies `OnboardingSession` as the state-tracking SSOT. One field is added here: **`draftInput`** (`Schema.Types.Mixed`, namespaced by wizard step key, e.g. `{ ownerIdentity: {...}, brandInfo: {...}, branchInfo: {...}, ownerCredentials: {...} }`) — accumulates validated-but-not-yet-committed input across however many screens the frontend presents, in whatever order it presents them. This is what makes autosave/back/next/resume possible without the backend caring what order the frontend asked questions in.

---

## 3. The operation set (not "one endpoint per state")

Eight operations, matching the request's own vocabulary almost exactly — this is deliberate, that vocabulary is already the right shape:

| Operation | HTTP | Purpose |
|---|---|---|
| **Begin** | `POST /setup/session` | Creates an `OnboardingSession`, returns `{token, state: "LICENSE_ACCEPTED", nextSteps: [...]}`. No business documents created yet. |
| **Validate Step** | `POST /setup/session/:token/steps/:stepKey/validate` | Runs a step's Joi schema against submitted data **without saving it** — powers real-time per-field validation in a wizard without committing anything, including on a step the user might still back out of. |
| **Save Draft (autosave)** | `PATCH /setup/session/:token/steps/:stepKey` | Validates and writes into `draftInput.<stepKey>`, refreshes `expiresAt` (`INITIAL_PROVISIONING_ARCHITECTURE.md` §6). Idempotent — resubmitting the same step overwrites its own draft, never duplicates anything. This is the endpoint an autosave timer calls every few seconds. |
| **Status / Resume** | `GET /setup/session/:token` | Returns `{state, draftInput, completedSteps, nextSteps, validationReport}` — everything a reloaded browser tab needs to reconstruct exactly where the user left off, including pre-filling every field they already typed. This single endpoint is what makes "browser refresh," "multiple tabs," and "resume later" all work for free — the frontend has no separate resume-detection logic to write, it just always calls this on mount. |
| **Complete** | `POST /setup/session/:token/complete` | The actual state-machine execution: consumes `draftInput`, runs every state transition from the current `state` through to `VALIDATED`/`READY` (§4 for idempotency/concurrency handling), in dependency order, regardless of what order the screens collected the underlying data in. Returns the final result (tokens, brand, branch, user) on success, or the current state + `validationReport`/`lastError` if a step failed. |
| **Cancel** | `DELETE /setup/session/:token` | Explicit abandonment (distinct from passive expiry) — only permitted before `READY`. Does **not** delete already-committed documents (`INITIAL_PROVISIONING_ARCHITECTURE.md` §6's "never auto-delete a Brand a real customer might still want" reasoning applies identically here) — marks the session `state: "CANCELLED"` so a stale token can't be reused, leaves an operator-reviewable trail. |
| **Restart** | `POST /setup/session/:token/restart` | Only permitted from a `CANCELLED` or expired session with **no committed documents yet** (i.e., failed/abandoned before `BRAND_DRAFTED`) — issues a fresh token. If documents were already committed, restart is refused with a clear message directing the user to resume instead (via the original token, if not expired) — this is the concrete mechanism preventing "restart" from ever becoming "create a second Brand for the same attempt," which is exactly the kind of duplicate the whole redesign exists to prevent. |
| **Summary / Completion Checklist** | `GET /setup/session/:token/summary` | Human-readable "here's what we're about to create" (or, post-completion, "here's what was created") — the Review screen's data source. Distinct from Status: Status is machine-state for resuming, Summary is presentation-oriented for a human to confirm before hitting Finish. |

**What was deliberately dropped from the earlier sketch:** a separate endpoint per state (`.../brand`, `.../branch`, `.../owner`, ...). Under this design there is no reason for one to exist — `steps/:stepKey` is generic and driven by whatever `stepKey`s the wizard defines (which can change, be reordered, or be A/B tested on the frontend without any backend change), and `complete` is the one place that actually executes the dependency-ordered state machine. This is the concrete fix for "never design APIs around database tables" — the eight operations above describe user actions (begin, save progress, check status, finish, cancel, restart, review), not `Brand`/`Branch`/`Role` CRUD.

---

## 4. Idempotency, concurrency, and the "duplicate submission / multiple tabs" requirement

- **`Complete` is safe to call twice.** If `state` is already `READY`, it returns the same success result again (looked up from the session's stored references, not re-executed) rather than erroring or re-running anything — satisfies "duplicate submission" and "retries" directly.
- **`Complete` is safe to call from two tabs at once.** Uses the same atomic claim-then-transition pattern already specified in `INITIAL_PROVISIONING_ARCHITECTURE.md` §4 (`findOneAndUpdate` with a `state`-match filter) at the *start* of `complete`'s execution, not just per internal state transition — a second concurrent `complete` call for the same token while the first is mid-flight gets a clear "already in progress" response instead of racing it. Satisfies "multiple tabs" directly.
- **An `Idempotency-Key` header is additionally honored on `Complete`** (client-generated UUID, stored on the session once claimed) — belt-and-suspenders against a network-retry double-send arriving as what looks like two separate requests: the second one recognizes the key and returns the first's result without re-executing. This is standard practice for the one operation in this whole surface that actually creates durable business records (Stripe's API popularized this pattern for exactly this class of endpoint).

---

## 5. Security additions specific to this API shape

- **Token is a bearer credential** (`INITIAL_PROVISIONING_ARCHITECTURE.md` §6) — every operation above except `Begin` requires it, checked before touching the session at all.
- **CSRF**: `Begin`/`Complete`/`Cancel`/`Restart` are state-changing and unauthenticated (no `UserAccount` exists yet to anchor a CSRF token to) — mitigated the same way the rest of this API is already secured against an unauthenticated attacker: the onboarding `token` itself is the unguessable secret a CSRF attempt would need and can't have (a cross-site form can't know a value it was never given), which is the standard mitigation for token-bearing unauthenticated flows (matches how e.g. email-verification-link flows are secured). No additional CSRF-token machinery is layered on top — it would be redundant with the bearer token already required.
- **Rate limiting**: `Begin` gets the strict per-IP ceiling already proposed in `INITIAL_PROVISIONING_ARCHITECTURE.md` §9 (this is the one operation reachable without already possessing a token). `steps/:stepKey` (autosave) and `Status` need a *separate*, much more permissive limiter — an autosave timer firing every few seconds must not trip the same low ceiling meant to stop someone brute-forcing new onboarding attempts. Two different rate-limit policies on two different route groups within `/setup/*`, not one blanket number.
- **Audit**: every `Complete` attempt (success or failure) and every `Cancel`/`Restart` is a `SecurityEvent`, per `INITIAL_PROVISIONING_ARCHITECTURE.md` §9's already-proposed enum extension. Draft autosaves (`steps/:stepKey`) are **not** individually audited — that would be excessive noise (an autosave can fire dozens of times per real signup) for an action with no security consequence (nothing durable is created by it).

---

## 6. Backward compatibility — `POST /setup/initialize`, confirmed as Option A

Per the confirmed decision: `POST /setup/initialize` keeps its exact current request/response shape and becomes a thin wrapper that internally calls `Begin` → writes the entire payload into `draftInput` in one shot → calls `Complete` → returns the same response shape the current implementation returns today. **It contains no business logic of its own** — every rule (guard checks, transitions, validation) lives in the one engine service that both this wrapper and the step-based endpoints call. This is the literal implementation of "the wrapper must not contain any business logic of its own; it should simply invoke the same onboarding engine used by the wizard so there is only one implementation."

One unavoidable shape addition, already flagged in `INITIAL_PROVISIONING_ARCHITECTURE.md` §7: the current payload has no way to express the Owner Identity scenario (`OWNER_IDENTITY_DESIGN.md` §3). The wrapper defaults to `"OWNER_ONLY"` (Scenario A) when the field is omitted — this is the same behavior the current, unmodified implementation already has today (Owner is always provisioned as a bare `UserAccount`, accidentally, per that document's own §1) — so a caller who never sends the new field observes **zero behavior change**, only newly-available behavior when they opt in by sending it.

---

## 7. What this document does not do

- Does not design the frontend wizard itself (screen count, exact `stepKey` names, visual design) — that's the future React wizard's own concern; this document only guarantees the backend doesn't force any particular screen breakdown on it.
