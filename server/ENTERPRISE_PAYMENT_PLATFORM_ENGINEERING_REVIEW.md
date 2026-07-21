# Enterprise Payment Platform — Engineering Review

**Status:** Review complete. **Phase 0, Phase 1 (Provider Catalog & core hierarchy), and Phase 2 (Payment Method Resolution Engine) implemented 2026-07-21**, same day — see `CLAUDE.md` item 18/19 for the full implementation record (files, RBAC resources, test results, what was deliberately deferred). Both open Phase-0 items from §11 were resolved during implementation, not guessed: `Order.channel` was confirmed by direct read to not exist (`Order.orderType` is a fulfillment-mode enum, a different concept), so the new Sales-Channel vocabulary was built fresh, not reused; `PaymentChannel` was confirmed to have zero production consumers and retired outright rather than migrated. Remaining phases (gateway transaction lifecycle, webhooks, fees/settlement/reconciliation, admin tooling) remain design-only, awaiting their own approval per the mission's phase-by-phase gating.
**Date:** 2026-07-21
**Scope:** Transform the current, mostly-stub Payment Configuration surface (`modules/payments/*`) into a real, provider-agnostic Enterprise Payment Platform — Payment Method vs. Payment Provider vs. Payment Channel vs. Merchant Credentials vs. Webhooks vs. Settlement/Reconciliation — while preserving the already-production-certified `sales/payment` aggregate (ADR-001 Phases 0-2) untouched at its core.
**Method:** Every claim below is traced to source (verified this session via two parallel research passes covering `modules/payments/*`, `sales/payment`, `finance/cash-register`, `finance/cash-transaction`, router mounts, RBAC, settings-resolution conventions, MongoDB transaction patterns, domain events, encryption, and audit logging). Nothing here is invented or assumed from the mission brief's own terminology — where the mission's vocabulary doesn't match what exists, that mismatch is called out explicitly, not silently reconciled.

---

## 1. Current Architecture Assessment

`modules/payments/` has four submodules. Their actual state, verified file-by-file, is far more uneven than "a Payment Configuration module" implies:

| Submodule | Model | Service | Router | Mounted? | Real state |
|---|---|---|---|---|---|
| `payment-method/` | Complete | Complete (`AdvancedService`) | Complete | **Yes** — `/finance/payment-methods` | The only fully live piece. Business-facing (Cash/Card/MobileWallet/OnlineGateway/Credit/Voucher/GiftCard/Other), with a `refPath`-based dynamic reference (`type: "CashRegister"|"PaymentChannel"`) to its technical backing. |
| `payment-channel/` | Complete | Complete | Complete | **No** — never mounted anywhere | Despite the name, this is **not** a "sales channel" (POS/Website/Delivery) — it's a technical payment-rail concept (`type: POS/WALLET/GATEWAY/COLLECTION/OTHER`) with accounting linkage (`clearingAccount`/`settlementAccount`/`feeAccount`/`feesPercentage`/`feesFixed`). Fully built, silently disconnected from the running app. |
| `payment-provider/` | **Stub** (`.ts`, only `brand`/`name`/`code`/`isActive`/soft-delete) | Complete-shaped but hand-rolled (doesn't use `AdvancedService`) | **Broken** — imports `./paymentProvider/payment-provider.controller.js`, a path that doesn't exist | **No** | The model's own header comment (DB-020) already admits this is not the real design — "future scope." If this router were ever mounted as-is, the app would crash on require. |
| `payment-settings/` | 1-line placeholder | 1-line placeholder | 1-line placeholder | **No** | Genuinely nothing here. No validation file even exists. |

**The Payment aggregate that actually works is elsewhere**, at `modules/sales/payment/` — the ADR-001 Phase 1/2-certified `Payment` model: `tenders[]` (multi-tender, each with `paymentMethod`/`amount`/`currency`/`reference`/`cashRegister`), atomic `Invoice.balanceDue` draw-down, one `CashTransaction` per tender, a balanced `SALES_PAYMENT_RECEIPT` journal entry, MongoDB-transaction-wrapped, idempotent (correctly using a `partialFilterExpression` index — the exact fix applied to `payment.model.js` earlier in this same session). **This is the aggregate this review must not break or duplicate.** It is production-certified, has a real test suite, and is the Sales bounded context's single source of truth for "what was actually collected."

**What this means architecturally**: this platform already has a working *money-movement* aggregate (`sales/payment`). What it does **not** have is the *provider/gateway configuration* layer underneath it — the thing that would let `Payment.tenders[].paymentMethod` resolve, for an `OnlineGateway`-category method, to "which actual provider (Paymob? Stripe?), with which credentials, for this brand/branch/channel." That configuration layer is exactly what's missing, and exactly what `payment-provider`/`payment-settings` were clearly *intended* to become before stalling as stubs.

---

## 2. Existing Weaknesses

1. **`payment-provider` is unusable as shipped** — a broken router import means mounting it today would crash the server. This is a live landmine, not a neutral absence.
2. **Naming collision**: the existing `PaymentChannel` model and the mission brief's "Payment Channel" concept (POS/Self-Ordering/QR/Website/Mobile/Delivery/Call Center/Marketplace/Kiosk/Admin) are **two unrelated concepts sharing one name**. Building the new "sales channel" concept under the same name as the existing accounting-rail model would create exactly the kind of ambiguous-naming defect this engagement has repeatedly found and fixed elsewhere (e.g., `PreparationSection` vs `PreparationSectionConfig`, `Order.channel` already existing as a separate, real field — see §4 below).
3. **No merchant credential storage of any kind exists** — not "exists but unencrypted," **genuinely does not exist**. `payment-provider.model.ts` has no API-key/secret/merchant-ID field whatsoever.
4. **No encryption-at-rest capability anywhere in this codebase.** Verified by an exhaustive grep for `encrypt`/`crypto`/`cipher`: every hit is one-way hashing (HMAC-SHA256 for auth credentials, SHA-256 for session tokens) or random-value generation (`crypto.randomBytes`). **There is no reversible-encryption utility, no KMS/vault integration, nothing this feature could reuse.** This is the single largest genuinely-new infrastructure capability this review has to design, not adapt.
5. **No webhook infrastructure exists** — zero matches for "webhook" in any `.js`/`.ts` file under `modules/` or `utils/`. Every reference is in planning `.md` documents. There is no generic ingress endpoint, no signature-verification pattern, no event log.
6. **No settlement/reconciliation module exists** — the only "reconciliation" in this codebase is `CashierShift` close-out (physical cash count vs. expected), which is a completely different concern (till reconciliation, not bank/gateway statement reconciliation).
7. **RBAC has no resource for this domain yet** — `RESOURCE_ENUM` already reserves `PaymentMethods` and `Payments`, but nothing for Provider/Gateway/Webhook/Settlement management.
8. **`AccountingSettings.controlAccounts` has no fee/clearing control account** — fee/clearing/settlement accounts only exist per-`PaymentChannel` today (and that module is unmounted), not centrally.
9. **`DomainEventDispatcher` is confirmed in-memory/in-process only** (single Node process, sequential-await handler execution, no message broker). This directly constrains what "Dead Letter Queue preparation" and "provider webhook fan-out" can honestly mean in this codebase today — addressed explicitly in §5.

---

## 3. Missing Enterprise Features

Cross-referencing the mission brief against verified source, genuinely absent (not just "unmounted," structurally nonexistent):

- Merchant credential storage (any form).
- Provider capability declarations (`refund`/`partialRefund`/`void`/`capture`/`tokenization`/`installments`/`3DS`/etc.) — nothing in `PaymentProvider` today declares what a provider can do; business logic has nowhere to check this even in principle.
- Provider↔Method many-to-many mapping with priority/fallback.
- Branch/POS/CashRegister-scoped provider resolution (only `PaymentMethod`/`PaymentChannel` themselves are branch-scoped today — there's no *resolution* algorithm, just a document that happens to carry a `branch` field).
- Sales-channel-aware provider selection (Order already has a `channel` field per the Refund architecture doc's own finding — see §4 — but nothing routes payment method availability by it).
- Webhook ingress, signature validation, replay protection, event logging.
- Gateway transaction lifecycle (authorized → captured → settled/failed/voided/chargeback/disputed) — `Payment.status` only has `RECORDED`/`VOIDED`, which is the Sales-context "was this collected" fact, not the Payment-context "what state is the gateway transaction actually in" fact — genuinely different information.
- Settlement batches and reconciliation matching.
- Multi-currency provider settlement (`Payment.tenders[].currency` field exists but nothing resolves exchange rates or settlement currency).
- Dynamic credential-form metadata (nothing describes "Paymob needs API Key + Integration ID + HMAC Secret; Fawry needs Merchant Code + Security Key" in a data-driven way).
- Admin operational tooling: test-connection, credential validation, provider priority reordering, clone/import/export, webhook/provider log viewers.

---

## 4. Risks

**Risk 1 — Scope collision with `Order.channel`.** The Refund architecture design document (produced earlier this engagement) explicitly recorded: *"`Order.channel` includes `'DELIVERY'`... no delivery-specific refund mechanism exists."* This confirms `Order` already has a real, live `channel`-shaped concept. Before inventing a new "Sales Channel" entity for payment routing, this must be verified against `order.model.js` directly (not assumed) — if `Order.channel` is already the right shape (an enum, not a full entity), the payment-routing "channel" concept should likely be a **reference to the same enum vocabulary**, not a competing new model. Flagged as a Phase 0 verification task, not decided here.

**Risk 2 — Encrypting secrets wrong is worse than not encrypting them.** Building a home-grown AES implementation with a poorly-managed key is a classic path to a false sense of security (key checked into `.env` committed to git, key never rotated, key same across environments). This must be designed with real rigor (§5) and reviewed as its own gated sub-phase before any real credential is ever stored.

**Risk 3 — Scope creep into a full payment gateway SDK integration.** The mission brief lists ten+ real providers (Paymob, Fawry, Stripe, Adyen, ValU, Vodafone Cash...). **This review explicitly does not scope building real SDK integrations for any of them.** That is provider-specific, ongoing, high-maintenance work (each provider's API changes independently) — the platform being *capable* of onboarding a provider via configuration is this review's job; *actually integrating* Paymob's specific API is a separate, later, per-provider effort explicitly out of scope here, matching this engagement's standing discipline against inventing what hasn't been asked for concretely.

**Risk 4 — Breaking the certified `sales/payment` aggregate.** `Payment` is production-certified with a real regression suite. Any change to its shape (e.g., adding a `gatewayTransaction` reference) must be additive-only and independently regression-tested against the existing `sales-payment-recording.test.ts` suite before being considered safe.

**Risk 5 — Inventing infrastructure this platform doesn't have (message queues, real DLQ).** `DomainEventDispatcher` is confirmed synchronous and in-process. Any design that assumes a real broker (Kafka/RabbitMQ/SQS) exists would be building against infrastructure that isn't there. §5's webhook design is deliberately scoped to what MongoDB + the existing dispatcher can honestly deliver.

---

## 5. Proposed Architecture

### 5.1 Bounded Context Placement

This platform has an established, already-applied precedent for exactly this kind of question: `PLATFORM_DEVICE_ROUTING_ARCHITECTURE_VALIDATION.md` determined that Device/Routing infrastructure is a **Generic Subdomain** (Eric Evans' term — infrastructure every domain might use, owned by no single business domain), not part of the Preparation bounded context, and relocated it to a `modules/platform/` namespace rather than embedding it in Preparation.

The identical reasoning applies here: **Payment Provider/Gateway/Credential/Webhook infrastructure is a Generic Subdomain, not a Sales concept.** `modules/payments/` already exists as a **separate top-level module from `modules/sales/`** — this is not an accident to fix, it's the correct existing boundary, already drawn. **Recommendation: keep `modules/payments/` as the home for Provider/Channel/Credential/Webhook infrastructure — a Generic Subdomain the Sales context's `Payment` aggregate consumes by reference, never absorbs.**

### 5.2 The Core Aggregate Redesign

```
                    ┌─────────────────────────┐
                    │   PaymentProvider        │   (Generic Subdomain — Payments context)
                    │   catalog/definition doc │
                    │   - code, name           │
                    │   - capabilities[]       │
                    │   - credentialSchema[]   │  ← dynamic form metadata, no hardcoded fields
                    └────────────┬─────────────┘
                                 │ referenced by
                    ┌────────────▼─────────────┐
                    │ PaymentProviderCredential │   (Generic Subdomain)
                    │ brand/branch-scoped       │
                    │ - encrypted secret fields │
                    │ - environment sandbox/prod│
                    │ - allowedBranches/Registers/Channels │
                    └────────────┬─────────────┘
                                 │ resolved via
                    ┌────────────▼─────────────┐
                    │ PaymentProviderMapping    │   (Generic Subdomain)
                    │ PaymentMethod ⟷ Provider  │
                    │ - priority, fallback      │
                    │ - scope: Global/Brand/    │
                    │   Branch/POS/Register     │
                    └────────────┬─────────────┘
                                 │
   ┌─────────────────────────────▼────────────────────────────┐
   │              PaymentMethod (existing, UNCHANGED)           │   (business concept, existing)
   └─────────────────────────────┬────────────────────────────┘
                                 │ referenced by tenders[]
   ┌─────────────────────────────▼────────────────────────────┐
   │         Payment  (sales/payment — EXISTING, UNCHANGED core)│   (Sales context — "what was collected")
   │  tenders[].paymentMethod → PaymentMethod                   │
   │  tenders[].gatewayTransaction → PaymentGatewayTransaction  │  ← ONE new, optional, additive field
   └─────────────────────────────┬────────────────────────────┘
                                 │ optionally references
                    ┌────────────▼─────────────┐
                    │ PaymentGatewayTransaction │   (Generic Subdomain — "what the PROVIDER says happened")
                    │ authorized→captured→      │
                    │ settled/failed/voided/    │
                    │ chargeback/disputed       │
                    └────────────┬─────────────┘
                                 │ populated by
                    ┌────────────▼─────────────┐
                    │  PaymentWebhookEvent      │   (Generic Subdomain — inbound event log)
                    │  provider, signature,     │
                    │  status, retryCount        │
                    └───────────────────────────┘
```

**This mirrors the exact two-aggregate, cross-bounded-context-reference shape this engagement already used for Refund** (`SalesReturn` financial fact / `PreparationReturn` kitchen-execution fact, referenced by ID, never merged) — applied here as: `Payment` (Sales, "was it collected") / `PaymentGatewayTransaction` (Payments Generic Subdomain, "what state is it in at the processor"). This is a repeatable, now twice-validated pattern for this codebase, not a new invention.

### 5.3 Resolving "Which Provider for This Transaction" (Global → Brand → Branch → POS → Register)

Reuses, exactly, the **`PreparationSettings.resolveForBranch()` fallback chain** — confirmed the platform's own most mature settings-resolution convention (branch-specific → brand-wide (`branch: null`) → hardcoded defaults, never throws). Extended one level further for this domain's real requirement (POS/Register-level override):

```
resolveProvider(brand, branch, cashRegister, channel, paymentMethod):
  1. Try PaymentProviderMapping scoped to {brand, branch, cashRegister, channel}  ← most specific
  2. Fall back to {brand, branch, cashRegister: null, channel}
  3. Fall back to {brand, branch, cashRegister: null, channel: null}
  4. Fall back to {brand, branch: null, ...}   ← brand-wide default
  5. If still nothing: return null → caller (Payment.recordPayment) rejects with a clear
     422 ("No payment provider configured for this method/branch"), same fail-closed
     convention SalesReturnSettings uses for financial-approval config — NEVER fail-open
     for money-routing, unlike operational settings which fail open.
```

**Why fail-closed here, unlike most of this platform's settings resolution**: `SalesReturnSettings.resolveForBranch()` also deliberately does NOT fall back to hardcoded defaults for financial-approval fields, for the same reason — inventing a default payment provider/approval policy would be making a business/financial decision this configuration layer has no authority to make. Confirmed consistent with existing precedent, not a new judgment call.

### 5.4 Provider Capabilities (data-driven, not hardcoded provider names)

```js
capabilities: [
  "REFUND", "PARTIAL_REFUND", "VOID", "CAPTURE", "PARTIAL_CAPTURE", "AUTHORIZATION",
  "TOKENIZATION", "RECURRING", "INSTALLMENTS", "QR", "THREE_DS", "OFFLINE", "ONLINE",
  "SPLIT_TENDER", "TIPS", "SIGNATURE", "EMV", "NFC", "WEBHOOK", "POLLING",
]
```
Business logic checks `provider.capabilities.includes("REFUND")` before offering a gateway-refund path — **never** `if (provider.code === "PAYMOB")`. This is the same "don't hardcode what should be configuration" discipline already used throughout this platform (`InventorySettings.recipeConsumptionStrategy`, `SalesReturnSettings.refundTaxes`, etc.) — capability flags are just this same pattern applied to providers.

### 5.5 Dynamic Credential Forms

`PaymentProvider.credentialSchema: [{ key, label, type: "text"|"secret"|"select"|"url", required, options? }]` — the admin UI renders a form from this array; the *values* are stored on `PaymentProviderCredential` in a flexible `fields: Map<String, Mixed>` for non-secret fields, plus explicit, individually-encrypted fields for anything the schema marks `secret: true`. This avoids hardcoding "Paymob has an Integration ID" anywhere in code — a brand-new provider is addable by an admin inserting one `PaymentProvider` catalog document, zero deploys.

### 5.6 Encryption (the one genuinely new infrastructure capability)

Node's built-in `crypto` module supports AES-256-GCM (authenticated, reversible encryption) — no new dependency required, consistent with this codebase's existing "use what Node already provides" discipline (every other `crypto` usage found in Step 6 of the research is already built-in-only). Proposed shape:
- A single new utility, `utils/secretEncryption.js`: `encrypt(plaintext) → {ciphertext, iv, authTag}`, `decrypt({ciphertext, iv, authTag}) → plaintext`.
- The encryption key comes from an environment variable (`PAYMENT_CREDENTIALS_ENCRYPTION_KEY`), **never** stored in the database, matching how `ACCESS_TOKEN_SECRET` (JWT signing) is already handled in this exact codebase (`authenticate.js` reads it from `process.env`) — same operational pattern, not a new one.
- `PaymentProviderCredential`'s Mongoose schema uses a `toJSON`/`toObject` transform that **unconditionally strips every field marked secret**, regardless of the requester's RBAC permission — a stricter-than-RBAC rule: nobody, including an authorized admin via the API, ever receives a decrypted secret back through a normal read endpoint. A dedicated, separately-audited "reveal" action (if ever needed) would be a deliberate, logged, rate-limited exception — not built in this phase, named here so it isn't silently assumed.
- Credential secrets are decrypted only in-process, at the moment of an outbound provider API call — never logged, never included in any webhook/event payload.

### 5.7 Webhook Engine (honest about what this platform can actually deliver)

```
POST /payments/webhooks/:providerCode
  → no JWT auth (providers can't do OAuth login) — protected instead by
    per-provider signature verification, using that provider's
    PaymentProviderCredential.webhookSecret
  → logs a PaymentWebhookEvent FIRST (raw payload + signature-valid flag),
    unconditionally, before any processing — so a malformed/rejected
    webhook is still auditable, never silently dropped
  → resolves a handler via a registry: webhookHandlers[providerCode](event)
    (each provider plugs in its own parser; the generic engine never
    contains provider-specific field-mapping logic)
  → idempotency: PaymentWebhookEvent.providerEventId is uniquely indexed
    per provider — a replayed webhook (providers commonly retry) is
    detected and short-circuited, matching this platform's established
    idempotency-key convention (Payment/SalesReturn)
  → on handler failure: PaymentWebhookEvent.status = "FAILED",
    retryCount incremented — this IS the "Dead Letter Queue preparation"
    this platform can honestly build today: a queryable, retriable Mongo
    collection of failed events, NOT a real message-broker DLQ (no
    Kafka/RabbitMQ/SQS exists in this stack — stating this plainly
    rather than implying infrastructure that isn't there)
```

### 5.8 Domain Events (additive to the existing, real, in-process dispatcher)

New entries added to the existing `DomainEvent` frozen enum in `utils/domainEvents.js` (the same file, same mechanism — not a new event system):
`PAYMENT_GATEWAY_TRANSACTION_AUTHORIZED`, `_CAPTURED`, `_FAILED`, `_SETTLED`, `_REFUNDED`, `PROVIDER_WEBHOOK_RECEIVED`, `PROVIDER_CONNECTED`, `PROVIDER_DISCONNECTED`, `PAYMENT_METHOD_DISABLED`, `PAYMENT_GATEWAY_UPDATED`. Consumers subscribe exactly like `ReplenishmentEngine` already does for `INVENTORY_BELOW_REORDER_POINT` — no new pub/sub mechanism invented.

### 5.9 Fees, Settlement, Reconciliation

- **Fees**: `PaymentChannel` already has `feesPercentage`/`feesFixed`/`feeAccount`/`clearingAccount`/`settlementAccount` — real, built, unmounted fields. Recommendation: **consolidate fee configuration onto `PaymentProviderMapping`** (per provider-per-method-per-scope, which is where fees actually vary in the real world — a given provider often charges different rates for different card networks/methods) rather than duplicating fields across three models. `PaymentChannel`'s existing fee fields become redundant once mapping-level fees exist — flagged as a Phase-4 consolidation decision, not resolved unilaterally here.
- **Settlement**: a new `PaymentSettlementBatch` (one per provider settlement report/period) + `PaymentSettlementLine` (one per matched gateway transaction) — deliberately scoped to **Phase 4+ (deferred)**, since zero existing infrastructure or business input (settlement report format varies wildly per provider) exists to build against yet. Named and modeled here so the schema has a clear home when a real provider integration needs it, not built speculatively now.
- **Reconciliation**: an explicit **non-goal for this review's implementable scope** — automatic statement-matching is a real, hard problem (fuzzy amount/date/reference matching) with zero existing precedent in this codebase to build from. Scoped as an architecture placeholder (`PaymentReconciliationMatch` model, manual-matching UI only) for a future phase, consistent with this engagement's discipline against building unrequested, unevidenced complexity.

---

## 6. Business Justification

- **Revenue enablement, not cost center**: every payment method NOT supported today (Meeza, ValU, InstaPay, local wallets) is lost sales for merchants who need them — Egypt/MENA restaurant markets specifically require Meeza/Fawry/InstaPay support to be commercially viable, a fact this platform's own currency enum (`EGP` default, `Africa/Cairo` default timezone) already signals as its primary market.
- **Configurability = sales velocity for the platform operator**: onboarding a new restaurant chain today that needs "Provider X" currently means a code change and a deploy. A data-driven provider catalog means onboarding becomes a support/config task, not an engineering one — directly shortens sales cycles, matching how Foodics/Toast/Odoo all operate (none of them redeploy code per merchant's payment provider choice).
- **Protects the already-certified accounting correctness work**: ADR-001's Phase 0 fix (Debit AR not Cash) and Phase 1/2 (real Payment/Refund aggregates) are worthless if the *provider layer* underneath silently misconfigures which GL account a given tender posts to. This review's fee/clearing-account design directly extends, not replaces, that already-correct posting logic.

---

## 7. Database Changes (proposed, not yet implemented)

**New collections**: `PaymentProviderCredential`, `PaymentProviderMapping`, `PaymentGatewayTransaction`, `PaymentWebhookEvent`, (Phase 4+) `PaymentSettlementBatch`, `PaymentSettlementLine`, `PaymentReconciliationMatch`.

**Rebuilt (not additive) collection**: `PaymentProvider` — the current `.ts` stub is replaced with a real schema (`capabilities[]`, `credentialSchema[]`, `isActive`). Since this model has zero real production data (confirmed: never mounted, no live writer), this is a clean rebuild, not a migration.

**Additive-only change to an existing, certified collection**: `Payment.tenders[].gatewayTransaction: ObjectId ref PaymentGatewayTransaction, default: null` — nullable, optional, zero impact on any existing document or the existing test suite until a gateway-backed tender is actually recorded.

**Deferred/decision-needed**: whether `PaymentChannel`'s name changes (to resolve the §2 naming collision) or whether the mission's "Sales Channel" concept instead reuses `Order.channel`'s existing vocabulary — this is a Phase 0 verification+decision item, not resolved unilaterally in this review.

---

## 8. API Changes (proposed, not yet implemented)

All new, additive-only. No existing endpoint's contract changes.

- `POST/GET /payments/providers`, `GET/PUT /payments/providers/:id`, `POST /payments/providers/:id/test-connection`
- `POST/GET /payments/provider-credentials` (brand/branch-scoped; responses always mask secrets per §5.6), `POST /payments/provider-credentials/:id/validate`
- `POST/GET /payments/provider-mappings`, `PUT /payments/provider-mappings/:id/priority`
- `POST /payments/webhooks/:providerCode` (public, signature-protected, not behind the standard `authenticateToken` chain — a deliberate, documented exception to the platform's mandatory router chain, same category of exception the platform already has for genuinely external-caller endpoints)
- `GET /payments/webhook-events`, `GET /payments/gateway-transactions` (admin visibility/log viewers)

Existing `sales/payment` router (`POST/GET /sales/payments`) — **unchanged**.

---

## 9. Migration Strategy

- `PaymentProvider` rebuild: no data migration (zero real rows, confirmed).
- `PaymentChannel`: since it's never been mounted, has never accepted real writes — any rename/restructure is also migration-free. Verify this empirically (a `countDocuments()` check) as the literal first Phase 0 step, not assumed from "never mounted" alone.
- `Payment.tenders[].gatewayTransaction`: additive/nullable — every existing `Payment` document remains valid with the field simply absent, exactly the same backward-compatible pattern already used for `Invoice.amountPaid`/`balanceDue` in ADR-001 Phase 1.
- No existing collection requires a backfill script anywhere in this design.

---

## 10. Backward Compatibility

- `sales/payment`'s existing API contract, existing tests, existing accounting behavior: **fully preserved**, touched only by one additive/nullable field.
- `payment-method`'s existing, live, mounted API (`/finance/payment-methods`): **fully preserved**, no field changes proposed.
- `finance/cash-register`, `finance/cash-transaction`: **untouched** — `CashTransaction.paymentChannel` reference already exists and already accepts `null`, so wiring a real `PaymentChannel` (if it survives the naming-collision decision) requires no schema change there either.

---

## 11. Implementation Phases

Each phase requires its own explicit approval gate before implementation begins — the same standing rule this engagement has followed for every ADR-numbered phase (Payment, Refund) to date.

1. **Phase 0 — Foundational fixes & verifications** (low risk, mostly corrective): fix `payment-provider.router.js`'s broken import (or delete the dead route if the model rebuild supersedes it entirely — decision, not assumed); verify `Order.channel`'s exact shape against source before deciding the Sales-Channel-naming question (§2 Risk 1); confirm `PaymentChannel` truly has zero production rows; add the new `RESOURCE_ENUM` entries (additive, per the file's own stated convention).
2. **Phase 1 — Provider Catalog & Encrypted Credentials**: rebuild `PaymentProvider` (capabilities + credentialSchema), build `PaymentProviderCredential` + `utils/secretEncryption.js`, admin CRUD + test-connection endpoint. Gate: a real, reviewed security pass on the encryption design before any credential is ever stored, not treated as a routine additive change.
3. **Phase 2 — Provider↔Method Mapping & Resolution**: `PaymentProviderMapping`, the Global→Brand→Branch→POS→Register resolution algorithm (§5.3), wired into (not replacing) `Payment.recordPayment()`'s existing method-selection.
4. **Phase 3 — Gateway Transaction Lifecycle & Webhook Engine**: `PaymentGatewayTransaction`, the generic webhook endpoint (§5.7), the new domain events (§5.8), the one additive `Payment.tenders[].gatewayTransaction` field.
5. **Phase 4 — Fees, Settlement, Reconciliation (design-only for settlement/reconciliation; fees implementable)**: fee consolidation decision (§5.9), settlement/reconciliation schema laid down but not wired to any real provider yet (no business input exists to build the real matching logic against).
6. **Phase 5 — Admin Operational Tooling**: enable/disable, priority reorder, clone, import/export, log viewers — read-heavy, low-risk, built last since it has no dependents.

---

## 12. Testing Strategy

Every phase gets its own integration-test suite, mirroring this codebase's own established pattern (`sales-payment-recording.test.ts`, `sales-return-refund-lifecycle.test.ts`) — real MongoDB, real fixtures, no mocks, matching the "integration tests over unit tests, this codebase's established discipline" convention already documented in project memory. At minimum: provider resolution across every scope level (Global/Brand/Branch/POS/Register) including the fail-closed no-match case; credential encryption round-trip (encrypt→store→decrypt, and a separate assertion that raw API responses never contain a decrypted secret); webhook signature validation (valid/invalid/replayed); webhook idempotency; gateway transaction state transitions; a **full backward-compatibility regression** of the existing `sales-payment-recording.test.ts` suite after the one additive field lands, confirming zero behavior change for existing tenders.

---

## 13. Documentation Updates Required

`CLAUDE.md` gains a new numbered item recording this review + its eventual implementation phases (matching the convention every prior ADR/review has followed). Each phase's completion updates this document's own status line, exactly as `ADR-001-SALES-PAYMENT-ARCHITECTURE.md` and `ENTERPRISE_REFUND_ARCHITECTURE_DESIGN.md` already do. A future `PAYMENTS.module.md` (per-module doc convention, item 9/10 in `CLAUDE.md`'s documentation system) is owed once Phase 1+ ships real code.

---

## Go / No-Go

**Conditional GO for Phase 0 and Phase 1 planning** — the architecture is sound, grounded in verified source, and reuses this platform's own established patterns (settings-resolution fallback chain, `ownsSession` transaction composability, in-process domain events, partial-index idempotency) rather than inventing new mechanisms where existing ones already fit. **Two items must be resolved before Phase 0 implementation starts, not implementation-time judgment calls**: (1) the `Order.channel` vs. new "Sales Channel" naming/ownership question (§2 Risk 1) needs a direct read of `order.model.js`, not deferred further; (2) explicit confirmation that Phases 4+ (settlement/reconciliation, real provider SDK integrations) are correctly understood as **out of this review's implementable scope**, design-placeholder only, not silently expected to ship alongside Phases 0-3.

**Awaiting your explicit approval — and specifically which phase to start with — before any code is written.**
