# Preparation Configuration Platform — Enterprise Design

**Status:** Design only. No code, model, service, controller, route, or validation has been created or modified in producing this document. **Awaiting explicit approval before any implementation phase begins.**
**Date:** 2026-07-20
**Builds on:** `PREPARATION_DOMAIN_ARCHITECTURE_REVIEW.md` (implemented), `PREPARATION_SETTINGS_ENTERPRISE_ARCHITECTURE_REVIEW.md` (review, this document's direct predecessor), `ENTERPRISE_REFUND_ARCHITECTURE_DESIGN.md` (adjacent, cross-referenced where relevant), `CLAUDE.md`. All three were re-read in full for this pass, not recalled from memory. New source verification performed for this pass: `modules/iam/device/device.model.js`, `modules/system/print-settings/*`, `modules/system/notification-settings/*`, `modules/system/` folder structure (5 sibling settings modules, confirmed no umbrella "SystemSettings" document exists), `modules/organization/branch/branch.model.js` (confirmed no competing operational config), confirmed no `POS Settings` module exists as a distinct entity anywhere.

---

## 1. Executive Summary

The prior review's central finding stands and is the foundation of this design: **this platform has real, working ticket workflow and real, working policy configuration, but zero device/printer/display registry or routing layer** — this is not a fragmentation problem to unify, it is a capability that has never been built. This design's job, per the mission, is broader than the prior review: audit **every** configuration-bearing module for single-source-of-truth violations, not just Preparation's own. Verified this pass: `NotificationSettings` and `PrintSettings` are both real, comprehensive, brand/branch-scoped, and both currently completely unconsumed by any code — they are not competing with `PreparationSettings`, they are simply dormant, exactly like `PreparationSettings` itself was before this morning. The System Settings layer (`modules/system/`) is itself organized as five sibling settings modules (discount, notification, print, service-charge, tax) — the same "many small settings documents, one per concern" convention `PreparationSettings` now also follows — not a single umbrella document, confirming that pattern is this platform's actual, consistent convention, not an anomaly to fix.

**The Single Source of Truth question this design answers concretely**: `PreparationSettings` owns Preparation *behavior* policy only. `NotificationSettings` owns all notification/escalation policy platform-wide, including Preparation's. `PrintSettings` owns print *formatting* policy (paper, copies, language, template), not printer identity or routing. None of these should ever again gain a second competing field for the same concern — this design removes two fields from `PreparationSettings` that already violate this (`notifications`, `escalation`) and draws a hard boundary preventing recurrence.

**The genuinely new work**: a `PreparationDevice` aggregate (hardware fleet) and a stateless `PreparationRoutingService` (resolution logic) — Preparation itself must never reference a printer, a screen, or an IP address; it only asks "where does section X's output go right now" and gets an answer.

---

## 2. Current Problems

1. `PreparationSettings.notifications`/`.escalation` (added this morning) duplicate `NotificationSettings.preparationSection.newOrder`/`.delayedOrder`, which is more complete and is the platform-wide, correct home for this concern.
2. `PreparationSettings.display`/`.printing`/`.safety`/`.shift` are declared, unread placeholders with no clear long-term owner — this design must decide, not defer again, where each belongs.
3. Zero device/printer/display registry exists anywhere — `Device` (auth identity) is not it, `PrintSettings` (print formatting policy) is not it.
4. Zero routing resolution logic exists — nothing today can answer "which physical output does this ticket go to."
5. `Device.deviceType` already lists `"KITCHEN_DISPLAY"` — a schema-level false signal of capability that doesn't exist, the same "schema ahead of implementation" pattern found repeatedly across this engagement.
6. Frontend `KDSPage.jsx` is disconnected mock data — not a backend problem, but material context for any device/display design (§17).

---

## 3. Duplicate Responsibilities

| Concern | Currently configured in | Verdict |
|---|---|---|
| Kitchen new-order notification (channel, role) | `NotificationSettings.preparationSection.newOrder` **and** `PreparationSettings.notifications.notifyOnReject/notifyOnOverdue` | **Duplicate.** `NotificationSettings` wins (§9). |
| Delayed-order escalation | `NotificationSettings.preparationSection.delayedOrder.delayMinutes` **and** `PreparationSettings.escalation.escalateAfterMinutes` | **Duplicate.** `NotificationSettings` wins (§9). |
| Print formatting (paper/copies/language) | `PrintSettings` only | Not duplicated — sole owner, correct as-is. |
| Ticket workflow policy (reject/edit/deliveryPolicy) | `PreparationSettings.ticket` only | Not duplicated — sole owner, correct, genuinely wired this morning. |
| Return policy | `PreparationSettings.return` only | Not duplicated — sole owner, correct, genuinely wired this morning. |
| Device/hardware identity | Nowhere real (`Device` is auth-only) | Not a duplicate — an absence (§6). |
| Routing (which device gets a ticket) | Nowhere | Not a duplicate — an absence (§7). |

No other duplicate found across `InventorySettings`, `AccountingSettings`, `OrderSettings`, `DiscountSettings`, `ServiceChargeSettings`, `TaxConfig` — each verified this pass to own a distinct, non-overlapping concern.

---

## 4. Responsibility Matrix

| Module | Owns | Does NOT own |
|---|---|---|
| `PreparationSettings` | Ticket workflow policy, Return policy, Queue behavior, SLA thresholds, capacity-adjacent policy | Notifications, printing, devices, routing, authentication, HACCP data, shift lifecycle |
| `NotificationSettings` | All notification/escalation policy platform-wide (orders, kitchen, inventory, finance, reservations, customer, system) | Delivery mechanism (no dispatcher exists — §17), device targeting |
| `PrintSettings` | Print *formatting*: paper size, copies, language, auto-print, (proposed addition, §10) templates/margins/logo | Printer identity, printer routing, device state |
| `Device` (`iam/device`) | Authentication/session identity: fingerprint, trust, block, risk score | Operational hardware fleet, preparation routing (its `KITCHEN_DISPLAY` enum value should be removed or left genuinely unused — §11) |
| `PreparationDevice` (new, §7) | Physical preparation hardware: identity, section assignment, health, failover | Print formatting (defers to `PrintSettings`), authentication (defers to `Device`) |
| `PreparationRoutingService` (new, §8) | Resolution logic only — stateless | Storage of any kind — reads `PreparationDevice`, nothing else |
| `PreparationSectionConfig` | Per-station operational identity: capacity, timing, station type, warehouse, staffing | Brand-wide policy (already correctly stripped of this, this morning) |

---

## 5. Single Source Of Truth Matrix

| Configuration Concern | Single Source of Truth | Rationale |
|---|---|---|
| Should a ticket rejection be allowed | `PreparationSettings.ticket.allowRejectTicket` | Preparation-specific workflow rule |
| Should items be editable after sending | `PreparationSettings.ticket.allowEditAfterSent` | Preparation-specific workflow rule |
| SLA warning threshold | `PreparationSettings.sla.warningThresholdMinutes` | Preparation-specific, already wired |
| Return decision policy | `PreparationSettings.return.*` | Preparation-specific, already wired |
| Kitchen new-order alert (who/how) | `NotificationSettings.preparationSection.newOrder` | Notification delivery is a cross-domain concern (orders/inventory/finance all need the same channel/role primitives) — one engine, one config surface |
| Delayed-order escalation (minutes, who) | `NotificationSettings.preparationSection.delayedOrder` | Same reasoning — escalation is a notification concept, not a workflow concept |
| Receipt/ticket paper size, copies, language | `PrintSettings` | Formatting is brand/branch-wide and print-domain-specific, unrelated to *where* the print goes |
| Which physical printer/screen a section uses | `PreparationDevice` (new) | Hardware identity is a fleet-management concern, not a policy concern — a flat settings document cannot express "many devices per section" |
| Whether a device is currently reachable | `PreparationDevice.health` (new, §7) | Runtime state, not configuration — must not live in a settings document at all |
| Employee/session authentication device trust | `Device` (`iam/device`) | Security concern, deliberately unrelated to preparation hardware |

**Rule going forward, stated explicitly so it doesn't recur a third time**: before adding a field to any settings document, check whether a *platform-wide* settings module already owns that concern (Notification, Print, Tax, Discount, ServiceCharge) — if yes, that module owns it, the domain-specific settings document only ever *references* it (e.g., "this ticket type triggers the `newOrder` notification"), never re-declares its channels/roles/timing.

---

## 6. Device Platform Design

A new bounded concept, **not** a Preparation sub-object and **not** a retrofit of `iam/device/Device` (different bounded context — authentication identity vs. operational hardware; conflating them risks a security-relevant model picking up operational fields, or an operational model inheriting fingerprint/risk-score fields it has no use for).

```
PreparationDevice {
  brand, branch,
  name (owner-assigned label, e.g. "Grill Printer 1"),
  deviceType: enum [
    KDS_SCREEN, KITCHEN_TV, CUSTOMER_DISPLAY,
    KITCHEN_PRINTER, RECEIPT_PRINTER, LABEL_PRINTER, FISCAL_PRINTER,
    BARCODE_PRINTER, BARCODE_SCANNER, QR_READER,
    SCALE, CASH_DRAWER, PAYMENT_TERMINAL,
    HANDHELD_TERMINAL, TABLET, MOBILE, SELF_ORDER_KIOSK,
    BIOMETRIC_DEVICE, ATTENDANCE_DEVICE, RFID_READER,
    OTHER   // never a closed list — extensible without a redesign, per the mission's own requirement
  ],
  connectionType: enum [NETWORK, USB, SERIAL, BLUETOOTH, CLOUD] (how it's reached — deliberately generic; exact connection parameters are type-specific and not designed further here without real hardware/vendor input, per this engagement's standing "do not invent" rule — same caveat the prior review already gave for this exact field),
  preparationSection: ref PreparationSectionConfig, nullable (a receipt printer or a payment terminal isn't section-bound; a kitchen printer is),
  deviceGroup: ref PreparationDeviceGroup, nullable (§6.1 — shared/grouped devices),
  priority: Number (routing preference order when multiple devices of the same type serve one section),
  failoverTarget: ref PreparationDevice, nullable, one-hop only (mirrors the prior review's own constraint — no chains, to avoid infinite loops),
  isActive: Boolean (owner-controlled enable/disable — operational, distinct from Device.blocked's security meaning),
  health: {
    status: enum [ONLINE, OFFLINE, UNKNOWN],
    lastHeartbeatAt: Date,
  },
  maintenance: {
    underMaintenance: Boolean,
    note: String,
  },
  createdBy, updatedBy, timestamps
}
```

### 6.1 Device Groups

`PreparationDeviceGroup { brand, branch, name, deviceType }` — a thin grouping entity (e.g., "All Grill Printers") that `PreparationDevice.deviceGroup` references, enabling one routing rule to fan out to every device in a group without hardcoding N individual device IDs into a rule. This is the mechanism behind "shared devices" and "multiple printers for one section" without inventing a second routing concept — grouping is a device-fleet concern, routing (§7) stays separate.

### 6.2 Heartbeat / Health Monitoring

`PreparationDevice.health.lastHeartbeatAt` is updated by whatever client/agent runs on the physical hardware (a KDS screen's browser session, a print-server agent) calling a lightweight "I'm alive" endpoint — the endpoint itself is an implementation detail for the Design phase, not designed further here. `health.status` is derived (e.g., `OFFLINE` if no heartbeat within a configurable window) rather than manually toggled, so routing (§7) never trusts stale state.

### 6.3 Assignment, Replacement, Maintenance

Assignment = setting `preparationSection`/`deviceGroup`. Replacement = a new `PreparationDevice` document takes over the old one's `preparationSection`/`priority`/`failoverTarget` relationships (an explicit "replace" operation, not a field mutation on the retired device, preserving audit history — same discipline this platform already applies to Payment/Refund's own append-only philosophy). Maintenance = `maintenance.underMaintenance: true`, which routing treats identically to `health.status: OFFLINE` (§7) — maintenance is a manually-declared offline state, not a separate routing branch.

---

## 7. Routing Platform Design

**`PreparationRoutingService` — stateless, reads `PreparationDevice`/`PreparationDeviceGroup` only, writes nothing of its own.**

Resolution algorithm, given a finalized `PreparationTicket` for section X:
1. Find all `PreparationDevice` rows where `preparationSection = X`, `isActive = true`, grouped by `deviceType`.
2. For each `deviceType` present, sort by `priority`.
3. For each candidate device: if `health.status = ONLINE` and not under maintenance, route to it. If not, follow `failoverTarget` once; if that also fails health, the ticket is queued as "undelivered to hardware" (a real, honest terminal state — **not silently dropped**, since Preparation's own ticket record and Kitchen Queue view remain the source of truth regardless of hardware delivery success, per §Section 7's own instruction that "Preparation should never know hardware" — hardware delivery failure must never block or corrupt the ticket's own real workflow state).
4. Multiple `deviceType`s for one section (e.g., one KDS + one printer) each independently receive the ticket — fan-out, not exclusive selection, matching the prior review's own §11 conclusion, reconfirmed here.

**Preparation's own code changes required (conceptually, not designed as code here)**: `preparation-ticket.service.js` gains exactly one new call, after a ticket is created/transitioned to a state that should trigger hardware output — `preparationRoutingService.route(ticket)` — and nothing else. No `if (deviceType === "PRINTER")` branching ever appears in `preparation-ticket.service.js`; that logic lives entirely inside the routing service, satisfying the mission's explicit "Preparation should never know printers" requirement.

---

## 8. PreparationSettings Responsibility

**Keeps**: `ticket` (workflow policy), `return` (return policy), `queue` (behavioral defaults — once `sortBy` is actually wired, per the prior review's own open item), `sla` (thresholds), and genuinely Preparation-specific capacity/timing policy if any is added later.
**Removes** (this design's concrete recommendation, superseding this morning's placeholders): `notifications`, `escalation` (→ `NotificationSettings`, §9), `display` (→ resolved by `PreparationDevice`/routing existing at all, not a settings concern), `printing` (→ `PrintSettings`, §10), `safety`/`quality` (HACCP has no data model anywhere in this platform — correctly stays undesigned per the "do not invent" rule until real requirements exist, not homed prematurely), `shift` (→ if ever built, belongs to the `CashierShift`/shift domain, not Preparation, mirroring exactly why `PreparationSettings` itself was carved out of `PreparationSectionConfig` for being the wrong owner).
**inventoryBehavior/waste**: keeps `affectInventoryOnReturn` (a genuine Preparation-return policy toggle); `waste.defaultWasteCategory` should be removed — `WasteRecord.wasteCategory` is chosen per actual waste event, not defaulted from a settings document with no current reader, and inventing a default here would be exactly the "schema ahead of implementation" pattern this whole engagement keeps correcting.

---

## 9. NotificationSettings Responsibility

Confirmed the correct, sole owner of all notification/escalation policy platform-wide, including Preparation's. Preparation's role is limited to **emitting domain events** (already has the mechanism — `DomainEventDispatcher`, confirmed real and live in `ENTERPRISE_REFUND_ARCHITECTURE_DESIGN.md §3.3`) — e.g. `TicketDelayed`, `TicketRejected` — which a (currently nonexistent, out of this design's scope to build) notification dispatcher would consume, cross-referencing `NotificationSettings.preparationSection` to decide channel/role/timing. This design does not build that dispatcher — it does not exist anywhere in this codebase today for *any* domain, not just Preparation, and building one is a platform-wide capability outside this document's scope (consistent with `ENTERPRISE_REFUND_ARCHITECTURE_DESIGN.md §21`'s identical finding and identical scope decision).

---

## 10. PrintSettings Responsibility

Confirmed: should own **formatting only** — paper size, copies, language, auto-print, and (a natural, minor extension, not a redesign) templates/margins/logo if/when print-template customization becomes a real requirement. Routing (which printer) belongs entirely to `PreparationDevice`/`PreparationRoutingService`. This is a clean separation already partially true today — `PrintSettings` was never going to be the printer registry, it just had nothing to hand routing off to before this design.

---

## 11. Device Responsibility

`iam/device/Device` stays exactly what it is — authentication/session identity. Its `"KITCHEN_DISPLAY"` enum value should be **removed** in a future cleanup (not this design's implementation, since this design doesn't implement anything) — it is a false capability signal now that `PreparationDevice` is the correct, real home for that concept. No operational field should ever be added to `iam/device/Device` — the boundary between "who is this session's device, do we trust it" and "what hardware exists on the kitchen floor" must stay hard, per the mission's own Clean Architecture/high-cohesion/low-coupling instruction.

---

## 12. Proposed New Aggregates

`PreparationDevice` (§6), `PreparationDeviceGroup` (§6.1) — both new, both in a new `preparation-device` module, both genuinely required (nothing existing can be repurposed for this without violating bounded-context boundaries, per §11's reasoning).

---

## 13. Proposed Folder Structure

```
modules/preparation/
  preparation-section/
  preparation-ticket/
  preparation-return/
  preparation-settings/
  preparation-device/         <- NEW: PreparationDevice, PreparationDeviceGroup
  preparation-routing/        <- NEW: PreparationRoutingService (stateless — may not need its own model)
```
Kept as siblings, not nested under `preparation-settings` (§6's independently-addressable-hardware reasoning) and not merged into `preparation-ticket` (routing must remain callable/testable independent of ticket-workflow logic — low coupling, per the mission's own explicit SOLID requirement).

---

## 14. Proposed Integration Diagram

```
PreparationTicket ──(status reaches a routable state)──> PreparationRoutingService
                                                                │
                                          resolves via ─────────┴───────── reads
                                                                │
                                                    PreparationDevice / PreparationDeviceGroup
                                                                │
                                          (device fleet, health, failover — no policy here)
                                                                │
                                                    physical hardware (out of this platform's scope)

PreparationTicket ──(delayed/rejected event)──> DomainEventDispatcher ──> [future] NotificationDispatcher ──reads──> NotificationSettings.preparationSection

PreparationDevice{KITCHEN_PRINTER} ──(formatting)──> reads PrintSettings (paper/copies/language) at print time
```

---

## 15. Configuration Flow

An owner configuring Preparation today touches exactly one policy surface (`PreparationSettings`) for workflow/return/SLA, one platform-wide surface (`NotificationSettings`) for alerts, one platform-wide surface (`PrintSettings`) for print formatting, and (once built) one fleet-management surface (`PreparationDevice`) for hardware — four distinct, non-overlapping concerns, not four fragments of one concern. This is the direct, concrete answer to the mission's "nothing should exist twice" objective.

---

## 16. Device Registration Flow

Owner/admin creates a `PreparationDevice` (name, type, section assignment) → device (or its agent) begins sending heartbeats → `health.status` transitions `UNKNOWN → ONLINE` on first heartbeat → routing (§7) now considers it a valid candidate. No device is ever auto-discovered or auto-registered — every `PreparationDevice` is deliberately created by a human, matching this platform's consistent "no fabricated automation without a real trigger" discipline seen everywhere else in this engagement.

---

## 17. Printer Assignment Flow

Owner assigns a `PreparationDevice{deviceType: KITCHEN_PRINTER}` to a `preparationSection` (direct) or a `deviceGroup` (indirect, fans out to every device in that group). At print time, the routing service resolves the target device(s); the actual print job's formatting is resolved separately from `PrintSettings` — two independent reads composing at the point of use, never merged into one document (§10).

---

## 18. Kitchen Routing Flow

Ticket created/transitioned → `PreparationRoutingService.route(ticket)` called from `preparation-ticket.service.js` (the one, single call site the mission's "Preparation should never know hardware" requirement permits) → resolves active devices for the ticket's section → delivers to each (fan-out) → on a device health failure, follows `failoverTarget` once → outcome (delivered/undelivered-to-hardware) is recorded for observability but never blocks or mutates the ticket's own `preparationStatus`/`deliveryStatus` — hardware delivery and business workflow state are deliberately decoupled, exactly matching the frontend-disconnection finding in §1: the ticket's truth already lives correctly in the database regardless of whether any physical screen ever displayed it.

---

## 19. Enterprise Scenarios

All scenarios reduce to §7's one resolution algorithm, driven entirely by which `PreparationDevice` rows exist:

- **KDS-only / printer-only / both**: one, or two, `deviceType`s registered per section.
- **Multiple printers / multiple displays**: multiple `PreparationDevice` rows, same section, fan-out.
- **Printer↔display failover**: `failoverTarget` set across `deviceType`s (a printer's failover target can be a KDS screen, and vice versa — the model doesn't constrain `failoverTarget` to the same `deviceType`, deliberately, since Step 7's own scenarios F/G require exactly this).
- **Routes by category/product/priority/language/service type/channel/dining type/customer type/shift/time/workload**: **not designed here** — every one of these is a *routing rule*, not a device concern, and this codebase has zero evidence of a rule-engine requirement beyond simple section-based routing (which already works, unchanged, via `Product.preparationSection`). Building a generic multi-dimensional routing-rule engine now, with no real business requirement driving any specific dimension, would be exactly the "invent features" this mission explicitly forbids. If a real requirement for e.g. priority-based routing emerges, it composes cleanly onto `PreparationDevice.priority` (already designed, §6) without a redesign — the extensibility exists, it is simply not built out speculatively.
- **Central/cloud/dark kitchen, expo, packaging**: unchanged from the prior review's finding — already fully expressible via `PreparationSectionConfig.stationType`, composes with `PreparationDevice` unchanged.
- **Multi-brand kitchens / shared stations across brands**: `PreparationDevice.brand`/`.branch` scoping handles multi-brand; genuinely cross-brand shared hardware is **not evidenced as a real requirement anywhere in this codebase** and is not designed further, consistent with the prior review's identical scope decision on this exact question.

---

## 20. Migration Strategy

Fully additive. `PreparationDevice`/`PreparationDeviceGroup` are new, empty-by-default collections — no existing data to migrate (confirmed: no hardware is registered anywhere today). `PreparationSettings.notifications`/`.escalation`/`.display`/`.printing`/`.safety`/`.quality`/`.shift`/`.waste.defaultWasteCategory` removal (§8) is safe to drop with zero data-loss risk — confirmed zero real readers exist for any of them (same verification standard applied throughout this engagement). `Device.deviceType`'s `"KITCHEN_DISPLAY"` value removal is optional cleanup, not required for this design to function (an unused enum value causes no harm beyond the false-signal risk already named in §11).

---

## 21. Risks

- Designing `PreparationDevice.connectionType`/`identity` in more depth than this document does would require real hardware/vendor input this engagement doesn't have — deliberately left at the "type of connection" level, not protocol-level, per the mission's own repeated "do not invent" instruction.
- The routing service's fan-out-plus-one-hop-failover model is a reasonable, evidence-informed default (Foodics/Simphony-class precedent, §5 of the prior review) but has no real restaurant's operational requirements validating it yet — should be confirmed against actual hardware/operational input before implementation, not treated as final.
- Frontend (`KDSPage.jsx`) integration is a separate, non-trivial effort this design does not scope (§1) — a fully-built backend routing layer still cannot reach a physical screen until the frontend is connected to real APIs.
- No notification dispatcher exists to consume `NotificationSettings` even after this design's clean separation — the separation is correct architecture regardless, but does not by itself make notifications functional.

---

## 22. Final Recommendation

**Single Source of Truth is now fully mapped and enforceable** (§5): `PreparationSettings` for Preparation workflow/return/SLA policy only, `NotificationSettings` for all notification/escalation policy, `PrintSettings` for print formatting only, a new `PreparationDevice`/`PreparationRoutingService` pair for hardware and routing — no concern configured twice. **Remove, don't deepen**, `PreparationSettings.notifications`/`.escalation`/`.display`/`.printing`/`.safety`/`.quality`/`.shift`/`.waste.defaultWasteCategory` (§8/§20) — this is the concrete, actionable correction to this morning's own implementation. **Build the Device Platform and Routing Platform as new, small, cleanly-bounded aggregates** (§6-§8) — this is genuinely new capability, not a refactor, and should be sequenced as its own implementation phase with its own approval, exactly like every other phase in this engagement. **This is design only — await explicit approval before entering implementation**, per this document's own governing instruction.
