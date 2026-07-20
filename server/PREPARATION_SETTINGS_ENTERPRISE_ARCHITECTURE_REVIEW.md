# Preparation Settings — Enterprise Architecture Review

**Status:** Architecture review only when written. This review's finding that `PreparationSettings.notifications`/`.escalation` duplicate `NotificationSettings` (§6) was carried forward and acted on: those fields, plus several other unwired placeholders, were removed from `PreparationSettings` on 2026-07-21 (see `PREPARATION_CONFIGURATION_PLATFORM_ENTERPRISE_DESIGN.md` and CLAUDE.md item 16). This review's Device/Printer/Display/Routing findings (§6-§14) remain analysis only — no Device Platform has been built.
**Date:** 2026-07-20
**Method:** Every claim below is traced to source. This review builds on, and in places corrects/extends, `PREPARATION_DOMAIN_ARCHITECTURE_REVIEW.md` and its implementation (both from earlier the same day) — that implementation already unified `PreparationTicketSettings`/`PreparationReturnSettings` into a real `PreparationSettings` document; this review evaluates that result against a much wider enterprise scope (devices, printing, display, routing, notifications) that the earlier pass deliberately left as declared-but-unwired placeholders.

---

## 1. Executive Summary

The `PreparationTicketSettings`/`PreparationReturnSettings` fragmentation this review was asked to re-examine **has already been resolved** — `PreparationSettings` (`server/modules/preparation/preparation-settings/`) is a real, unified, brand/branch-scoped document with a working `resolveForBranch()` read path and a lazy, non-destructive legacy migration, implemented and tested (77 suites/340 tests passing) earlier today. **This review's real contribution is different**: it verifies, for the first time, the much larger enterprise-scope questions this task actually asks — device management, printer/display routing, multi-scenario kitchen configuration — and the honest answer is that **almost none of it exists**, with one major, previously-undiscovered exception: a real, comprehensive, but entirely unwired `NotificationSettings` model already covers Kitchen notification/escalation policy in more depth than `PreparationSettings` itself does — meaning `PreparationSettings.notifications`/`.escalation` (added in this morning's implementation) are likely **duplicating**, not filling, a gap.

Also newly verified this pass: `Device` (`modules/iam/device/`) is a real, working model — but it is an **authentication/session-identity** device registry (fingerprint, trust, block, risk score), not a preparation-hardware fleet, even though its `deviceType` enum already includes `"KITCHEN_DISPLAY"`. A `PrintSettings` model exists (brand/branch print policy: paper size, copies, language, auto-print) and is genuinely seeded for every new brand at onboarding — but it configures *policy*, not physical printers, and has zero real consumers (no code anywhere triggers an actual print). The frontend has a `KDSPage.jsx` — but it renders **hardcoded mock data with zero API calls**, disconnected from the real, working backend `getKitchenQueue()`/`getKitchenDashboard()` endpoints.

**Net assessment**: this platform has real, working *ticket workflow* (routing to sections, status transitions, live queue/SLA) and real, working *policy configuration* (the new `PreparationSettings`), but **zero device/printer/display registry or routing layer** — not fragmented, simply absent. Building one now, from nothing, is a materially different and larger undertaking than "finish unifying two settings documents," and this review scopes it honestly rather than retrofitting today's small policy document into something it was never designed to be.

---

## 2. Current Architecture

```
Preparation (Sales-adjacent bounded context, per PREPARATION_DOMAIN_ARCHITECTURE_REVIEW.md §7)
  ├── PreparationSection (PreparationSectionConfig) — operational identity: stationType, capacity, warehouse, staffing, working hours
  ├── PreparationTicket — real workflow: PENDING→PREPARING→READY, WAITING→READY_FOR_HANDOVER→HANDED_OVER, shared TransitionGuard, live Kitchen Queue/Dashboard (SLA badges, utilization)
  ├── PreparationReturn — real per-item WASTE/RETURN_TO_STOCK/RESELLABLE decision + status guard, settings-gated validation; inventory/accounting posting still ADR-001 Phase 2's job
  └── PreparationSettings — unified policy: ticket, return, queue, display(placeholder), routing(placeholder), sla, notifications(placeholder), escalation(placeholder), printing(placeholder), safety(placeholder), quality(placeholder), shift(placeholder), inventoryBehavior, waste

Adjacent, NOT part of Preparation, verified real but each independently dormant:
  ├── PrintSettings (modules/system/print-settings/) — brand/branch print POLICY (paperSize/copies/language/autoPrint), seeded at onboarding, zero real consumers
  ├── NotificationSettings (modules/system/notification-settings/) — brand/branch notification POLICY, includes a real `preparationSection.newOrder`/`.delayedOrder` block, zero real consumers
  └── Device (modules/iam/device/) — AUTHENTICATION device identity (fingerprint/trust/session), `deviceType` enum includes "KITCHEN_DISPLAY" but no preparation-routing relationship exists
```

---

## 3. Existing Capabilities (verified)

| Capability | Exists? | How it works |
|---|---|---|
| Ticket routing (order → section) | ✅ Real | `preparation-ticket.service.js#createTicketsFromOrder`, groups by `Product.preparationSection`, one ticket per distinct section |
| Ticket workflow / status transitions | ✅ Real | Shared `createTransitionGuard()` (as of this morning's implementation), atomic claim, best-effort recipe-consumption trigger |
| Kitchen Display queue view | ✅ Real (backend) | `getKitchenQueue()`/`getKitchenDashboard()` — station-grouped, elapsed/remaining time, SLA badge, utilization — computed server-side |
| Queue behavior configuration | 🟡 Partial | `PreparationSettings.queue.sortBy` exists as a field; **not read by `getKitchenQueue()`** — the query still hardcodes `.sort({receivedAt:1})` |
| Preparation Display configuration | ❌ Missing | `PreparationSettings.display.refreshIntervalSeconds` is a declared, unread placeholder; no per-screen/per-device display config exists |
| Kitchen Display *screen* configuration (which physical screen shows which section) | ❌ Missing | No model relates a `Device` to a `PreparationSectionConfig` |
| Printer configuration | 🟡 Partial | `PrintSettings` (paper size, copies, language, auto-print) — brand/branch-wide policy only, no per-printer identity |
| Device registration | 🟡 Partial | `Device` model is real but is an **authentication** device registry, not a preparation-hardware fleet — no `warehouse`/`preparationSection` relationship, no "this is a kitchen printer at Grill station" concept |
| Station assignment (of hardware) | ❌ Missing | No field anywhere links a `Device`/printer to a `PreparationSectionConfig` |
| Printer routing | ❌ Missing | No code resolves "which printer should this ticket print to" |
| Display routing | ❌ Missing | Same — no resolution logic exists |
| Multiple preparation scenarios (KDS-only / print-only / both) | ❌ Missing | No configuration field or logic distinguishes these |
| Device grouping | ❌ Missing | Not modeled |
| Device enable/disable | 🟡 Partial | `Device.blocked` exists, but it's a security/trust flag (auth context), not an operational "this kitchen screen is turned off" toggle |
| Auto routing | 🟡 Partial | Section-level routing (product→section) is real and automatic; device-level routing does not exist to auto-route to |
| Manual routing | ❌ Missing | No override mechanism exists (nothing to override) |
| Printing rules | 🟡 Partial | `PrintSettings.autoPrint`/`copies` exist as policy; no rule engine, no per-scenario logic, zero real trigger |
| Notification rules | 🟡 Partial, real schema | `NotificationSettings.preparationSection.newOrder`/`.delayedOrder` — genuinely well-designed (channels, roles, delay minutes) — but zero dispatch mechanism anywhere in this codebase |
| Escalation rules | 🟡 Partial | `NotificationSettings.preparationSection.delayedOrder.delayMinutes` + `roles.manager` is a real escalation *policy* field; `PreparationSettings.escalation.escalateAfterMinutes` (added this morning) is a **second, less-developed, likely-duplicate** field for the same concept |
| Shift behavior | ✅ Real (adjacent) | `CashierShift` lifecycle is real and working; `PreparationSettings.shift.requireOpenShiftForOperations` is a new, unread placeholder with no shift-domain relationship established |
| SLA configuration | ✅ Real | `PreparationSettings.sla.warningThresholdMinutes` — genuinely wired into `getKitchenQueue()`'s badge computation (this morning's implementation) |
| Rush Order rules | ❌ Missing | No priority/rush field anywhere on `PreparationTicket` |
| Fire / Hold rules | ❌ Missing | No state distinct from `PREPARING` |
| Return policies | ✅ Real | `PreparationSettings.return.*` — genuinely wired (allow-decision gates, require-reason, return window, immutability) |
| Waste policies | 🟡 Partial | `PreparationSettings.waste.defaultWasteCategory` is a declared, unread placeholder; the real, working `WasteRecord.wasteCategory` enum lives on the actual waste document, not resolved from this settings field anywhere |
| Oil policies | N/A | `FryerOilLog` was deleted (owner decision, this morning) — oil now flows through generic `ManualConsumption`, which has no dedicated policy surface (nor did it need one before) |
| HACCP policies | ❌ Missing | `PreparationSettings.safety.requireHaccpCheck` is a declared, unread placeholder; no HACCP data model of any kind exists |
| Capacity rules | ✅ Real | `PreparationSectionConfig.maxParallelTickets`, genuinely used in `_groupTicketsByStation`'s utilization calc |
| Productivity rules | ❌ Missing | `responsibleEmployee` is recorded on tickets but never aggregated |
| Preparation timing | ✅ Real | `PreparationSectionConfig.averagePreparationTime`, genuinely used to compute `expectedReadyAt` |
| Device management | ❌ Missing (for preparation hardware specifically) | See above — `Device` exists for auth, not for kitchen hardware |

---

## 4. Missing Capabilities (stated plainly, not invented)

Physical device registry for preparation hardware (printers, KDS screens, tablets, scanners) with section/branch assignment, grouping, enable/disable, and failover. Printer/display routing logic of any kind. Rush-order/priority flagging. Fire/Hold ticket state. Multi-printer or multi-display fan-out per section. Printer↔display failover. Any real notification/escalation *dispatch* mechanism (the policy schema for it exists in `NotificationSettings`, but nothing sends anything, anywhere, in this entire codebase). Any HACCP/food-safety data model. Productivity/bottleneck analytics. A queue `sortBy` that's actually honored.

---

## 5. Enterprise Best Practices (extracted, not copied)

- **Foodics/Toast/Square-class systems** treat "printer station" and "KDS station" as *routing destinations*, separate from the *preparation section* itself — one section can fan out to a printer AND a screen simultaneously (this review's Step 7 scenarios C/D/E). The architectural lesson: routing destinations are their own small entity referencing a section, not fields embedded on the section.
- **Oracle Micros Simphony / NCR Aloha** (enterprise, multi-property) model device fleets centrally with per-property/per-station assignment and explicit failover chains (print-if-display-offline and vice versa) — the lesson: failover is a *relationship between two routing destinations*, not a boolean flag on one.
- **Odoo / Daftra** (ERP-first, not POS-first) keep notification/escalation policy in one platform-wide settings surface, not duplicated per-domain — directly validates this review's finding that `NotificationSettings` (already real, platform-wide) should be Preparation's escalation/notification source of truth, not a second copy inside `PreparationSettings`.
- **Deliverect-class delivery-aggregator integrations** confirm routing configuration must be scenario-driven (dine-in vs. delivery vs. central-kitchen fan-out) — this platform already has the right *first* piece of this (`Order.channel`), just nothing downstream reacting to it for routing purposes yet.

---

## 6. Architecture Problems

1. `PreparationSettings.notifications`/`.escalation` (added this morning) are likely redundant with the already-real, more complete `NotificationSettings.preparationSection` block — two policy surfaces for one concept, the exact anti-pattern the original Preparation Settings review was commissioned to eliminate, now at risk of quietly re-appearing one level up.
2. `PreparationSettings.queue.sortBy` is declared but not read — the same "settings exist, nothing consumes them" pattern this engagement has repeatedly found and fixed elsewhere, now reintroduced in a field added during the very implementation meant to close that gap.
3. `Device`'s `"KITCHEN_DISPLAY"` enum value is a false signal of capability — it suggests kitchen-display device support exists, but the model has no relationship to `PreparationSectionConfig`, no operational (non-auth) enable/disable semantics, and is never referenced by any Preparation code.
4. `PrintSettings` is seeded for every brand at onboarding (real, live data) yet has zero consumers — this is provisioning ahead of implementation, not implementation, and risks being mistaken for a working feature because the document genuinely exists in every brand's database.
5. The frontend `KDSPage.jsx` is disconnected mock data, not wired to the real backend Kitchen Queue API — a frontend/backend integration gap outside this review's core scope but directly relevant to any device/display work, since a screen showing hardcoded fixtures cannot be the basis for routing/failover decisions.

---

## 7. Root Causes

Items 1/2/3 share one root cause: settings/schema fields keep being added ahead of the consuming logic that would give them meaning — the same pattern this whole engagement has diagnosed and fixed for `PreparationTicketSettings`/`PreparationReturnSettings`/`PreparationSectionConfig`'s dead fields, now recurring at a new layer because the enterprise device/routing/notification scope was never actually built, only anticipated in schema (`Device.deviceType`, `NotificationSettings.preparationSection`, `PrintSettings`). Item 4 is a provisioning-vs-implementation gap: onboarding was built to seed every settings surface a brand might eventually need, independent of whether the feature behind it exists yet. Item 5 is a frontend prototype that was never connected to the backend once the backend was later built for real.

---

## 8. Proposed PreparationSettings Architecture

**Do not add `notifications`/`escalation`/`display`/`printing`/`safety`/`shift` depth to `PreparationSettings` beyond what already exists.** Instead:
- `PreparationSettings` stays the source of truth for what it already correctly owns: ticket workflow policy, return policy, SLA, queue behavior, capacity-adjacent policy.
- Kitchen-specific notification/escalation policy should be **read from `NotificationSettings.preparationSection`**, not duplicated — `PreparationSettings.notifications`/`.escalation` should be marked deprecated-on-arrival and pointed at the real model once any dispatch mechanism is ever built.
- A genuinely new concern — **preparation routing/device configuration** — does not belong inside `PreparationSettings` at all (a flat settings document is the wrong shape for a fleet of independently-addressable hardware, per §5's Foodics/Simphony lesson). It needs its own small aggregate (§10).

---

## 9. Proposed Configuration Structure

`PreparationSettings` (unchanged from this morning, minus the two duplicate fields flagged above):
```
ticket / return / queue / sla / capacity-adjacent policy (all already real or genuinely scoped for this domain)
```
Everything device/printer/display/routing-related moves to a **new, separate** `PreparationRoutingConfig`-class model (§10) — not a sub-object of `PreparationSettings`, because routing targets are independently-addressable entities (multiple printers, multiple screens per section), which a flat settings document cannot express without becoming an array-of-arrays anti-pattern.

---

## 10. Proposed Device Architecture

A new, small aggregate — **`PreparationDevice`** (name illustrative, not a commitment) — distinct from `iam/device/Device` (which stays exactly what it is: authentication identity):
```
PreparationDevice {
  brand, branch,
  preparationSection: ref PreparationSectionConfig (nullable — a receipt printer at the register isn't section-bound),
  deviceType: enum [KDS_SCREEN, KITCHEN_PRINTER, LABEL_PRINTER, RECEIPT_PRINTER, TABLET, SCANNER, ...] (extensible, never hardcoded elsewhere),
  identity: connection info appropriate to the type (IP/port for a network printer, a paired-device token for a screen) — deliberately NOT designed in more detail here without real hardware/vendor input, per this review's own "do not invent" instruction,
  isActive: Boolean,
  failoverTarget: ref PreparationDevice (nullable — the Step 7 F/G scenarios' mechanism: if this device is offline, route here instead),
}
```
This is a genuinely new aggregate this review recommends, not something to retrofit onto `Device` (wrong bounded context — auth identity vs. operational hardware are different concerns even when Foodics-class systems sometimes conflate them) or onto `PreparationSectionConfig` (a section can have zero, one, or many devices — a one-to-many relationship, not embeddable fields).

---

## 11. Proposed Routing Architecture

Routing resolution (given a finalized `PreparationTicket` for section X): look up all *active* `PreparationDevice`s where `preparationSection = X`; for each, attempt delivery; on failure, follow `failoverTarget` once (not a chain, to avoid infinite loops — a design constraint worth stating now rather than discovering later). Multiple devices of different types (one KDS + one printer) both receive the ticket when both exist (Step 7 Scenario C) — routing is fan-out, not exclusive selection, unless a brand's configuration says otherwise (a `PreparationSettings.routing.allowMultiSectionSplit`-style toggle already exists for the *section-splitting* concern; an analogous toggle would be needed for *device fan-out*, not designed further here without a real use case to ground it).

---

## 12. Proposed Display Architecture

A `PreparationDevice{deviceType: KDS_SCREEN}` is what the (currently disconnected) `KDSPage.jsx` should eventually authenticate as / be configured for, reading only the section(s) it's assigned to via the routing resolution in §11 — not a separate "display settings" concept layered on top.

---

## 13. Proposed Printer Architecture

A `PreparationDevice{deviceType: KITCHEN_PRINTER|LABEL_PRINTER|RECEIPT_PRINTER}` combined with the *already-real* `PrintSettings` for paper/copies/language policy — `PrintSettings` stays brand/branch-wide print *policy*, `PreparationDevice` becomes the *fleet* that policy applies to. Two existing/planned pieces composing cleanly, not one replacing the other.

---

## 14. Proposed Preparation Scenarios

All of Step 7's scenarios (A–O) reduce to the same resolution described in §11, driven entirely by which `PreparationDevice` rows exist and how their `failoverTarget` is set — no scenario needs its own special-cased logic:
- **A/B** (KDS-only / print-only): only one `deviceType` registered for that section.
- **C/D/E** (both / multiple printers / multiple displays): multiple `PreparationDevice` rows for the same section, routing fans out to all active ones.
- **F/G** (failover): `failoverTarget` chain of exactly one hop.
- **H/I** (central/cloud kitchen): already representable today via `PreparationSectionConfig.stationType: centralKitchen|cloudKitchen` + `.warehouse` — no new modeling needed, `PreparationDevice` composes on top unchanged.
- **J/K** (multi-brand / shared stations): `PreparationDevice.brand`/`.branch` scoping already handles multi-brand; a genuinely "shared" station across brands is **not evidenced as a real requirement anywhere in this codebase** and is not designed further here, per this review's "do not invent" instruction.
- **L/M/N/O** (dark kitchen, expo, packaging, future areas): all already expressible via `PreparationSectionConfig.stationType`'s existing extensible enum (`cloudKitchen`, `packaging`, `other`) — no architecture change needed, confirming §Seventh-Objective's earlier finding (this platform already correctly avoids hardcoding "Kitchen") extends cleanly to device routing too.

---

## 15. Proposed Folder Structure

```
modules/preparation/
  preparation-section/
  preparation-ticket/
  preparation-return/
  preparation-settings/          <- unchanged, policy only
  preparation-device/            <- NEW, if this phase is approved — routing/fleet, not policy
```
Kept as a sibling module, not a sub-object of `preparation-settings`, for the same reason §10 gives: independently-addressable hardware rows, not flat configuration.

---

## 16. Migration Strategy

Purely additive if approved: `PreparationDevice` is a new, empty-by-default collection — no brand has any hardware registered today (confirmed: no such data or code exists), so there is nothing to migrate *into* it. The two duplicate fields flagged in §6 (`PreparationSettings.notifications`/`.escalation`) would need a small, low-risk deprecation (stop reading them nowhere-they're-read-anyway, point future consumers at `NotificationSettings` instead) — not a data migration, since neither field has any real reader today.

---

## 17. Risks

- Building a device/routing layer without real hardware/vendor integration input (network printer protocols, KDS pairing mechanisms) risks the same "schema-first, nothing real behind it" pattern this whole review keeps finding — §10's `PreparationDevice.identity` field is deliberately left vague for exactly this reason; designing it further needs real hardware requirements, not another documentation pass.
- `NotificationSettings` itself has zero dispatch mechanism — routing tickets to a `PreparationDevice` is a solvable, self-contained problem, but *notifying* a human about a delayed ticket (the `delayedOrder` policy already sitting in `NotificationSettings`) has no engine to execute it anywhere in this platform; that's a larger, separate, and currently entirely unbuilt capability, not something this review's device/routing recommendation accidentally solves as a side effect.
- Frontend/backend disconnection (`KDSPage.jsx`) means even a fully-built backend routing layer would need real frontend integration work before any device could actually display anything — a non-trivial, separate effort this review flags but does not scope.

---

## 18. Final Recommendation

**The originally-requested fragmentation (`PreparationTicketSettings`/`PreparationReturnSettings`) is already resolved** — no further settings-unification work is needed there. **Do not deepen `PreparationSettings` with notification/escalation logic** — redirect that to the already-real `NotificationSettings.preparationSection`. **A genuinely new, currently-nonexistent capability — device/printer/display registration and routing — is the real gap this review surfaces**, and it needs its own small aggregate (`PreparationDevice`, §10), not an expansion of the settings document. This is architecture and analysis only; **await explicit approval before any Design-phase work begins**, consistent with how every prior phase in this engagement has been gated.
