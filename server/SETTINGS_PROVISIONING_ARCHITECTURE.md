# Settings Provisioning Architecture (System Setup V2)

Status: **implemented.** All fourteen unconditional settings documents (§5) are created in `onboarding-engine.service.js`'s `_toOperationalDefaultsProvisioned` (thirteen) and `_toAuthConfigurationCreated` (`AuthenticationSettings`, kept as its own state per that document's design). One real-world correction made during implementation: `BrandSettings.modules` schema defaults turned out to already be well-designed per-module (core modules on, advanced modules off) — the one necessary override is forcing `modules.hr.enabled = true` when Scenario B is chosen, otherwise a freshly-created `Employee` would be immediately invisible behind `checkModuleEnabled`. `TaxConfig`'s classification was also upgraded from "requires real input" to "auto-generated" after reading the actual model — it already ships a real default percentage (14%, Egypt VAT), so accepting the schema's own existing default is not the same as fabricating one (§2's distinction still holds; this was a re-evaluation of which category `TaxConfig` falls into, not a violation of the principle). Builds on `SYSTEM_SETUP_AUDIT.md` §3 and `OWNER_IDENTITY_DESIGN.md` §3.

---

## 1. First-principles correction to the classification scheme itself

The request asks for each settings module to be classified as one of: *Required during onboarding / Optional / Lazily initialized / Auto-generated / Owner configurable.* Re-evaluating this before applying it: **"Owner configurable" is not a mutually exclusive fifth bucket** — every settings document in this system, without exception, is owner-editable after creation (that's what a settings module *is*). Filing it alongside "Required"/"Lazy"/etc. as if a module could be *either* Required *or* Owner-configurable would be incoherent — they answer different questions ("when does this get created" vs. "who can change it afterward, always yes"). This document uses four categories for *when/how a document is created*, and treats owner-editability as a universal property, stated once here rather than repeated 22 times:

- **Required (onboarding-blocking)** — onboarding cannot reach `READY` without this document existing, *and* in some cases without specific real, non-fabricated input for at least one field (§2 explains which, and why).
- **Auto-generated (unconditional)** — the document is created by the onboarding engine with safe, universal defaults, no owner input required, but it exists as a real, visible, editable row from minute one.
- **Lazy** — no document is created at onboarding; the module's own service must resolve a safe in-memory default for any read that needs one, until the Owner explicitly visits that settings area (the existing `AuthenticationSettings` pattern — before this redesign — is the reference example, see §3).
- **Not applicable** — the module has no schema yet (two placeholder files found in the audit); nothing to provision.

---

## 2. Why "Auto-generated" and "Required" are different, and why that distinction matters

Two different failure modes are being guarded against, and conflating them was the actual mistake to avoid here:

- A **missing document** (nothing exists, module falls back to an in-memory default or errors) is safe to leave lazy *only if* the fallback is genuinely harmless (e.g., "notifications are all off until configured" costs nothing). It is **not** safe for anything where absence would mean "no restriction" on a financially or operationally sensitive action, or where the actual field values need to reflect real business facts that cannot be invented.
- A **fabricated field value** (the system inventing a number that looks plausible but isn't true) is a distinct, worse problem than a missing document, and is exactly what the standing "No Hidden Defaults" principle exists to prevent. A tax percentage, a branch's operating hours, or a service-charge amount are real business facts — auto-generating a plausible-looking value for any of these would be actively misleading, not merely unconfigured. The correct handling for these fields is not "auto-generate" or "lazy" — it's "collect real input from the Owner during onboarding, and don't let onboarding complete without it."

This is why the table in §4 has entries where the *document's existence* is Required but its *content* is safely Auto-generated (order/invoice numbering — a sequence starting at 1 with a cosmetic prefix is not a business fact that can be "wrong"), and other entries where both existence and specific field content are Required (tax rate, operating hours — these are real facts, not cosmetic defaults).

---

## 3. The Lazy pattern already exists in this codebase — reuse it, don't reinvent it

`authentication-settings.service.js`'s `DEFAULT_SETTINGS` constant (an in-memory fallback object returned by `resolveForBrandBranch()` when no document exists) is the working reference implementation of the Lazy category. Every module classified Lazy below needs to implement the equivalent of that pattern in its own service — **this needs verifying per module**, not assumed: Phase 1's audit confirmed `AuthenticationSettingsService` does this, but did not check whether the other ~20 settings services already lazy-default or would currently throw/return-empty when queried for a brand with no document. That verification is implementation work, not something re-derived from scratch in this document (it would mean re-reading every settings service's read-path in full, which is a larger and separately-scoped task than finishing this architecture pass) — flagged here explicitly so it isn't silently assumed to already work.

**Also confirmed already-graceful, and directly informing the classification below:** `invoice.service.js`'s posting-to-accounting step already catches the case of no `AccountingSettings` existing and logs a warning rather than failing the invoice (observed directly in this project's own integration test suite — `invoice-sales-posting.test.ts` exercises exactly this path). This is concrete evidence, not a guess, that the system's design intent already treats `AccountingSettings` as safely deferrable — the classification below (§4) follows that existing, working precedent rather than inventing a new policy for it.

---

## 4. Classification of all 22 settings modules

| Module | Classification | Why |
|---|---|---|
| `iam/authentication-settings` | **Required** (document + real content) | Already decided in `INITIAL_PROVISIONING_ARCHITECTURE.md`'s `AUTH_CONFIGURATION_CREATED` state. Blocks the Owner's first real, policy-governed login (audit Finding 1.2). |
| `hr/employee-settings` | **Auto-generated, unconditional** | Confirmed by Phase 1 audit: only `{brand}` is required, every other field defaults. Created regardless of Owner Identity scenario (correction applied in `OWNER_IDENTITY_DESIGN.md` §3 — a brand can hire non-owner employees under any scenario). |
| `hr/payroll-settings` | **Auto-generated, unconditional** | Same as above — only `{brand}` required. |
| `sales/order-settings` | **Required (document), Auto-generated (content)** | Document must exist before the first order can be numbered (blocking, per audit §3). Numbering prefix/padding are cosmetic, not business facts — safe to default (e.g. prefix derived from the brand's slug), owner-editable immediately after. |
| `sales/invoice-settings` | **Required (document), Auto-generated (content)** | Same reasoning as `order-settings`. |
| `system/tax-settings` | **Required (document + real content)** | Blocks correct invoicing (audit §3). Unlike numbering, the tax rate/name **is** a real business fact — auto-generating a plausible-looking percentage would be actively wrong, not merely unconfigured. Onboarding must collect at least one real tax row from the Owner (even "0% — no tax" is a real, deliberate answer, not a fabricated one). |
| `organization/branch-settings` | **Required (document + real content, for operating hours specifically)** | Fills the Phase 1 audit's confirmed schema gap (`Branch` has no timezone/workingDays/deliveryCapability/contactInfo fields at all — see `SYSTEM_SETUP_AUDIT.md` §2, resolution direction: delegate to this existing settings module rather than adding `Branch` fields, per "reuse existing modules whenever possible"). Operating hours are a real fact, not a cosmetic default — auto-defaulting to e.g. 24/7 would be actively misleading (an online-ordering integration reading "always open" for a restaurant that closes at 10pm is a real operational hazard, not a harmless placeholder). Delivery-zone configuration within this same module is **not** required at onboarding (a brand may not offer delivery at all) — only the operating-hours portion is onboarding-blocking. |
| `organization/brand-settings` | **Auto-generated, unconditional** | Module enable/disable toggles — safe to default to "everything enabled" (matches `checkModuleEnabled` middleware's existing fail-open behavior when no document exists at all, so creating the document with all-enabled defaults changes nothing about current behavior, just makes it explicit and owner-visible instead of implicit). |
| `preparation/preparation-settings` (ticket) | **Auto-generated, unconditional** | Ticket numbering sequence — same cosmetic-default reasoning as order/invoice numbering. |
| `inventory/inventory-settings` | **Auto-generated, unconditional** | Auto-deduct/negative-stock/low-stock-threshold flags — all have safe, conservative defaults (e.g. auto-deduct on, negative-stock disallowed) that don't require owner input to be meaningful and correct on day one. |
| `finance/cashier-shift-settings` | **Auto-generated, unconditional** | POS till behavior (auto open/close, variance tolerance) — conservative defaults are safe and immediately usable; not a fact that needs real-world input to be correct. |
| `system/print-settings` | **Auto-generated, unconditional** | Receipt printer/paper/language defaults — cheap to provision, avoids a confusing first-order "why didn't my receipt print" support question, safe universal defaults. |
| `system/discount-settings` | **Auto-generated, unconditional, conservative** | Whether *absence* of this document means "no discount allowed" or "unrestricted discount allowed" was not verified in Phase 1's audit (the module's actual fail-open/fail-closed behavior needs checking before implementation) — this is exactly the kind of ambiguity that argues for creating the document explicitly rather than leaving it lazy: an explicit, conservative default (e.g. no manual discount without a set limit) removes the ambiguity outright regardless of which way an unverified lazy fallback would have resolved it. |
| `system/service-charge-settings` | **Auto-generated, unconditional, conservative** | Same reasoning as discount-settings — create explicitly with `enabled:false` rather than rely on an unverified lazy default, since "is a service charge being silently applied or not" is a financially visible question worth being unambiguous about from day one. |
| `accounting/accounting-settings` | **Lazy** | Confirmed by direct evidence (§3) that the system already degrades gracefully without it — invoices still post, journal-entry posting is simply skipped with a logged warning until configured. Requires a real Chart of Accounts (multiple `Account` documents with specific control-account roles) to be satisfiable at all — that's a larger, separate onboarding-adjacent workflow (seeding a default chart of accounts), explicitly out of scope for this document, not something to fabricate a placeholder for. |
| `hr/attendance-settings` | **Lazy** | Only meaningful once at least one employee exists to track attendance for — under Owner Identity Scenario A/C (the likely common case at first onboarding), there may be zero employees for a while. Needs verifying that `attendance-settings.service.js` implements the lazy-default pattern (§3) before this classification is safe to rely on in production — flagged, not assumed. |
| `loyalty/loyalty-settings` | **Lazy** | Loyalty programs are opt-in; most brands won't run one from day one. Zero operational risk in leaving it lazy. |
| `preparation/preparation-settings` (return) | **Lazy** | Only matters once a kitchen return actually happens — no operational cost to deferring. |
| `purchasing/purchasing-settings` | **Lazy** | Only matters once the brand starts recording purchases — not needed for day-one sales operation. |
| `sales/rerturn-sales-settings` | **Lazy** | Only matters once a sales return happens. |
| `system/notification-settings` | **Lazy** | Pure UX preference (which categories notify); zero operational or financial risk if absent. |
| `payments/payment-settings` | **Not applicable** | Placeholder file, no schema defined yet — nothing to provision until that module itself is built. |
| `sales/promotion-settings` | **Not applicable** | Same as above. |

---

## 5. What this means for `INITIAL_PROVISIONING_ARCHITECTURE.md`'s `OPERATIONAL_DEFAULTS_PROVISIONED` state

Concrete, final scope for that state (superseding its earlier placeholder description):

**Created unconditionally, every onboarding:**
`AuthenticationSettings` (already assigned its own state, `AUTH_CONFIGURATION_CREATED`, kept separate since it's tied to issuing the Owner's session), `EmployeeSettings`, `PayrollSettings`, `OrderSettings`, `InvoiceSettings`, `TaxSettings` (at least one row, from real onboarding-form input), `BranchSettings` (operating-hours portion, from real onboarding-form input), `BrandSettings`, `PreparationTicketSettings`, `InventorySettings`, `CashierShiftSettings`, `PrintSettings`, `DiscountSettings`, `ServiceChargeSettings`.

That's thirteen documents (plus `AuthenticationSettings` = fourteen total settings documents per brand by the time onboarding reaches `READY`), all created in one atomic transaction step per the state-machine pattern already established, all with either safe cosmetic defaults or real onboarding-collected input as classified above.

**Created conditionally:** none beyond what's already unconditional in this revised list — the original design's conditional split (settings only if Scenario B) was the exact assumption `OWNER_IDENTITY_DESIGN.md` §3 corrected; nothing in the settings layer itself is scenario-gated anymore.

**Not created by onboarding at all (Lazy or Not Applicable):** `AccountingSettings`, `AttendanceSettings`, `LoyaltySettings`, `PreparationReturnSettings`, `PurchasingSettings`, `SalesReturnSettings`, `NotificationSettings`, `PaymentSettings` (N/A), `PromotionSettings` (N/A).

---

## 6. Onboarding form scope implication

This settles a concrete, previously-open question: **the onboarding form needs exactly three pieces of real, non-fabricatable business input beyond identity/brand/branch naming** — tax configuration (at least one rate, possibly "0% / not applicable"), operating hours for the Main Branch, and the Owner Identity scenario choice (`OWNER_IDENTITY_DESIGN.md` §3, plus the extra personal-data fields §4 of that document requires if Scenario B is chosen). Every other settings document in the fourteen-document unconditional set is populated from safe, universal, immediately-editable defaults with zero additional form burden on the person onboarding. This is the concrete deliverable of applying "only create what is actually required... nothing merely because it exists" rather than a slogan — a short, honest list of exactly which inputs are unavoidable, and confirmation that everything else genuinely isn't.

---

## 7. What this document does not do

- Does not create any of the fourteen settings documents.
- Does not modify any settings model, service, controller, router, or validation file.
- Does not verify the per-module lazy-default behavior flagged as unconfirmed in §3 and in the `hr/attendance-settings` and `system/discount-settings`/`system/service-charge-settings` rows of §4 — that verification is implementation-phase work.
- Does not design the Chart-of-Accounts seeding workflow that would eventually let `AccountingSettings` move from Lazy to Auto-generated — explicitly out of scope, noted as a real future workstream.

## 8. Summary of decisions

| Decision | Status |
|---|---|
| "Owner configurable" is a universal property, not a fifth classification bucket | Decided, applied throughout |
| Document-existence and field-content requirements are tracked separately (a document can be Required to exist while its content is safely Auto-generated) | Decided — resolves the "Required vs Auto-generated" ambiguity in the original four-category framing |
| Three settings modules require real, non-fabricated onboarding-time input: Tax, Branch operating hours, and (indirectly) Owner Identity's Scenario-B personal data | Decided (§6) |
| Fourteen settings documents are created unconditionally at onboarding | Decided (§5) |
| Nine settings modules (7 real + 2 placeholder) remain Lazy / Not Applicable | Decided (§4), with two rows flagged as needing lazy-default verification before implementation |
| `AccountingSettings` stays Lazy, justified by direct evidence of existing graceful degradation, not assumption | Decided (§3, §4) |

Nothing in this document modifies any model, service, controller, router, or validation file.
