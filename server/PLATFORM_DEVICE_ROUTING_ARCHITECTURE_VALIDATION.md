# Device Platform & Routing Platform — Final Architecture Validation

**Status:** Design validation only. No code, model, service, controller, route, or validation has been created or modified in producing this document. **Implementation is strictly forbidden until explicit approval.**
**Date:** 2026-07-20
**Method:** `PREPARATION_CONFIGURATION_PLATFORM_ENTERPRISE_DESIGN.md`, `PREPARATION_SETTINGS_ENTERPRISE_ARCHITECTURE_REVIEW.md`, `PREPARATION_DOMAIN_ARCHITECTURE_REVIEW.md`, `ENTERPRISE_REFUND_ARCHITECTURE_DESIGN.md`, `ADR-001-SALES-PAYMENT-ARCHITECTURE.md`, and `CLAUDE.md` were re-read in full for this pass. Source re-verified this pass: `utils/domainEvents.js` (full read — confirms the existing pub/sub is deliberate, in-process, and explicitly designed to be swappable, its own header comment naming this exact tradeoff), `modules/` top-level directory listing (confirms every existing top-level folder is a single business domain — `accounting`, `crm`, `hr`, `iam`, `inventory`, `preparation`, `production`, `purchasing`, `sales`, `system`, etc. — no existing "infrastructure" or "platform" namespace exists anywhere in this codebase today).

---

## 1. Executive Summary

**The prior design's own proposed names and placement do not survive this review.** `PreparationDevice` and `PreparationRoutingService`, as designed, are domain-specific names for what the prior document's own field list already proved is *not* domain-specific content — the `deviceType` enum it proposed already included `CASH_DRAWER`, `PAYMENT_TERMINAL`, `BIOMETRIC_DEVICE`, `ATTENDANCE_DEVICE`, none of which have anything to do with Preparation. That was not a minor naming slip; it was the design unconsciously outgrowing its own stated bounded context while still being written inside it. **Verdict: Option C — Enterprise Platform Infrastructure**, not Preparation, not even a broader "Operations Domain." Renamed: `OperationalDevice` (Device Platform) and `RoutingEngine` (Routing Platform), housed in a new top-level `modules/platform/` namespace — the first of its kind in this codebase, and justified precisely because nothing existing is the right home (§5).

**One correction to the mission's own framing, made explicitly rather than silently complied with**: Objective 4 asks whether Routing should eventually carry Accounting Events, CRM Events, Approval Events, and Background Jobs alongside Preparation Tickets and Printer Jobs. **It should not — not because these don't matter, but because they are architecturally a different Enterprise Integration Pattern.** Preparation-ticket-to-printer routing is a **Content-Based Router / Recipient List** problem (resolve one or more concrete destinations for one task). Accounting/CRM/Approval events are a **Publish-Subscribe** problem — and this codebase already has a real, working, deliberately-scoped implementation of exactly that pattern (`utils/domainEvents.js`'s `DomainEventDispatcher`, re-read in full this pass, its own header comment stating it is intentionally swappable for a real queue later). Merging both patterns into one `RoutingEngine` would violate the same Single Responsibility principle this whole review is being asked to enforce elsewhere. This review keeps them separate and says so plainly, rather than agreeing with the broader framing because it was asked for.

---

## 2. Enterprise Architecture Validation

Verified against Microsoft Architecture Center's own guidance on shared/platform services (a capability consumed by multiple bounded contexts, with no business ownership by any one of them, should be modeled as a distinct platform service layer, not embedded in the first consumer that needed it) and against this codebase's own **existing, working precedent for exactly this pattern**: `utils/` already hosts `BaseRepository`, `BaseController`, `TransitionGuard`, `SequenceGeneratorService`, and `domainEvents.js` — cross-cutting infrastructure with zero domain ownership, consumed by every business module. Device/Routing are the same *category* of concern, just with persisted state and their own API surface (device registration needs RBAC, an owner-facing UI, audit trail — `utils/` code has none of that). They therefore need to be real *modules* (model/service/controller/router/validation), but organized the same way `utils/` is organized relative to domains: **available to all, owned by none.**

---

## 3. DDD Validation

Applying Eric Evans' own vocabulary precisely: a **Core Domain** is where the business's competitive differentiation lives (for this platform: Order/Menu/Recipe/Accounting — the actual restaurant-ERP logic). A **Generic Subdomain** is necessary, non-differentiating infrastructure that could in principle be a third-party service without changing what makes this business unique — device fleet management and task-destination routing are textbook Generic Subdomains, not Core Domain. Housing a Generic Subdomain inside a Core Domain module (Preparation) inverts the dependency direction DDD requires: Preparation would *own* something every other domain needs, forcing Production/Warehouse/Delivery/HR to either depend on `modules/preparation/*` (a Core Domain reaching across into another Core Domain's folder for infrastructure — wrong) or duplicate it (exactly the anti-pattern this entire multi-session engagement has been closing everywhere else). **This is a genuine DDD violation in the prior design, confirmed, not a stylistic preference.**

---

## 4. Responsibility Matrix

| Capability | Owner | Justification |
|---|---|---|
| Physical device identity, health, assignment, failover | `platform/device` (`OperationalDevice`) | Generic Subdomain — no business-differentiating logic, needed by every operational domain |
| Task-to-destination resolution (which device/queue handles this task) | `platform/routing` (`RoutingEngine`) | Generic Subdomain, downstream consumer of Device Platform |
| Pub/sub domain-event notification (Accounting/CRM/Approval/Workflow events) | `utils/domainEvents.js` (existing, unchanged) | Already correctly generic, already working — not merged into Routing (§1) |
| Print *formatting* (paper, copies, language, template) | `PrintSettings` (existing, unchanged) | Business configuration, not infrastructure — stays with the domain that owns the policy |
| Notification/escalation *policy* (channels, roles, timing) | `NotificationSettings` (existing, unchanged) | Same reasoning |
| Ticket workflow, return policy, SLA | `PreparationSettings` (existing, unchanged) | Genuinely Preparation-specific, correctly scoped already |
| Authentication/session device identity | `iam/device` (existing, unchanged) | Different bounded context entirely — security, not operations |

---

## 5. Bounded Context Review

Confirmed by direct listing (§ Method): every existing top-level `modules/` folder is a single business domain. **No infrastructure namespace exists today.** This review recommends creating one — `modules/platform/` — as a deliberate, explicit, one-time new precedent, not a casual addition. Justification for why `modules/system/` (the closest existing candidate) is the *wrong* home: `system/` already has an established, consistent meaning in this codebase — brand/branch-scoped **business configuration documents** (tax, discount, notification policy, print formatting, service charge) — passive settings, no independent lifecycle, no runtime state, no device fleet to monitor. `OperationalDevice`/`RoutingEngine` have real runtime state (health, heartbeats) and active resolution logic — a categorically different kind of thing. Overloading `system/` with this would blur a boundary this codebase has otherwise kept clean everywhere else in this engagement.

---

## 6. Device Platform Review

**Survives, renamed.** `OperationalDevice` (module `platform/device`): brand/branch-scoped, `deviceType` (extensible enum spanning every category listed in Objective 3 — KDS/printers/scanners/scales/terminals/kiosks/biometric/attendance/RFID/tablets, with an `OTHER` escape hatch, never a closed list), optional `assignedTo: { domain: enum[PREPARATION, POS, WAREHOUSE, HR, ...], referenceId: ObjectId }` — **this is the one real structural change from the prior design**: the prior document's `preparationSection: ref PreparationSectionConfig` field directly coupled the device to Preparation's own model, which is precisely the dependency direction violation §3 identifies. A generic `assignedTo` polymorphic reference (domain tag + ID, resolved by whichever consuming domain cares, never dereferenced by Device Platform itself) removes that coupling entirely — Device Platform never imports or knows about `PreparationSectionConfig`, `Warehouse`, or any other domain model. `deviceGroup`, `priority`, `failoverTarget` (one-hop), `health` (heartbeat-derived), `maintenance` — unchanged from the prior design, none of that was domain-coupled to begin with.

---

## 7. Routing Platform Review

**Survives, renamed and scope-clarified.** `RoutingEngine` (module `platform/routing`): stateless resolution service. Input: a generic `{ taskType: string, sourceDomain: string, sourceReferenceId: ObjectId, targetSelector: { domain, referenceId } }` — **not** `PreparationTicket` typed. Preparation (or Production, or Warehouse, whenever built) calls `routingEngine.resolve({ taskType: "TICKET_OUTPUT", sourceDomain: "PREPARATION", targetSelector: { domain: "PREPARATION", referenceId: sectionId } })` and receives back a list of eligible `OperationalDevice`s with fan-out/failover already applied — `RoutingEngine` never imports `PreparationTicket` or any other domain model, satisfying Objective 8's requirement literally ("Routing Engine should know nothing about Kitchen, Production, POS, Warehouse") rather than aspirationally.

**Scope boundary held, not expanded** (§1): `RoutingEngine` resolves *hardware and queue-style task destinations*. It does not absorb Accounting/CRM/Approval/Workflow event dispatch — that traffic pattern (one event, many independent subscribers reacting, no single "resolved destination") is Publish-Subscribe, already served correctly by `DomainEventDispatcher`. Conflating them would make `RoutingEngine` responsible for two different Enterprise Integration Patterns at once, the opposite of the high-cohesion this whole review is meant to enforce.

---

## 8. Naming Review

| Rejected | Reason | Adopted |
|---|---|---|
| `PreparationDevice` | Domain-specific name for a Generic Subdomain concept; the field list itself already outgrew the name | `OperationalDevice` |
| `PreparationRoutingService` | Same issue; also stutters once correctly namespaced (`platform/routing`'s service doesn't need "Preparation" or even "Operational" repeated in the class name) | `RoutingEngine` |
| `PreparationDeviceGroup` | Same issue | `OperationalDeviceGroup` |
| "Device Management" (mission's own example) | Accurate but generic to the point of being indistinguishable from `iam/device`'s own domain (also "device management") in casual conversation | `Device Platform` (folder/module grouping name) with `OperationalDevice` as the concrete model — the word "Operational" is what disambiguates from `iam/device`'s authentication meaning everywhere it matters (code, docs, RBAC resource name) |
| "Printing Platform" / "Display Platform" (mission's own examples) | **Rejected as separate bounded contexts** — see §9 | N/A — absorbed as `deviceType` values within Device Platform |

---

## 9. Cross-Module Dependency Matrix

| Module | Depends on Device Platform? | Depends on Routing Platform? | Depends on `DomainEventDispatcher`? |
|---|---|---|---|
| Preparation | Indirectly (via Routing) | ✅ Direct consumer | Already does (recipe-consumption triggers) |
| Sales/POS (future) | Indirectly (via Routing) | Would consume (receipt printer, cash drawer, payment terminal) | Already does |
| HR/Attendance (future) | Indirectly (via Routing, or direct read for biometric device lookup) | Optional — attendance devices may not need "routing" (fan-out/failover) at all, just direct device reference | N/A today |
| Warehouse (future) | Indirectly | Would consume (barcode scanner, label printer for stock operations) | N/A today |
| `platform/device` | — (owns nothing else) | — | No — a pure data/health service, doesn't need pub/sub |
| `platform/routing` | ✅ Reads `OperationalDevice`/`OperationalDeviceGroup` | — (owns nothing else) | No — synchronous resolution, not an event |

**Dependency direction is strictly one-way**: domains → `platform/routing` → `platform/device`. Never the reverse. This is the concrete, verifiable answer to Objective 8.

---

## 10. Scalability Review

Brand/branch scoping on `OperationalDevice` is identical to every other multi-tenant entity already proven at this platform's existing scale (Payment, Invoice, JournalEntry, PreparationSettings — all brand/branch-scoped, all already tested and working). 10/100/1000 branches: no new scaling class introduced — device count per branch is small (tens, not millions), well within MongoDB's normal indexed-query performance envelope with a `{brand, branch, deviceType}` compound index. **Central/cloud/dark kitchen, multi-brand**: already handled, unchanged from the prior design (`assignedTo`'s domain-agnostic shape if anything makes this *more* robust than the prior `preparationSection`-typed field). **Franchise**: no franchise-specific concept exists anywhere in this codebase today (not evidenced, not designed here, consistent with this engagement's "do not invent" discipline). **Offline branches / edge devices / hybrid deployments**: **honestly, not addressed by this design** — `health.status` derived from heartbeat assumes network reachability to this platform's own backend; a genuinely offline-first branch (local queue, eventual sync) is a different, larger architecture question with zero existing infrastructure anywhere in this codebase to build on (confirmed: no offline-sync mechanism exists anywhere in this platform, a finding already independently made in `ENTERPRISE_REFUND_ARCHITECTURE_DESIGN.md`'s own gap analysis for an unrelated concern). **Cloud printing**: representable as `connectionType: CLOUD` on `OperationalDevice`, no architecture change needed. **Future AI automation**: no evidence of any requirement anywhere in this codebase; not designed here, correctly.

---

## 11. Future ERP Compatibility

Because `OperationalDevice.assignedTo` is domain-agnostic (§6) and `RoutingEngine`'s input contract is domain-agnostic (§7), every future module named in Objective 3/5 (Production, Packaging, Warehouse, Delivery, Call Center, Self-Ordering, HR/Attendance) can adopt Device/Routing without either platform module ever being modified — new domains are purely *consumers*, never require a code change inside `platform/device` or `platform/routing` themselves. This is the concrete test of "can this survive years of evolution": adding a new consumer domain is an integration, not a redesign.

---

## 12. Infrastructure Layer Design

```
server/
  utils/                    <- stateless cross-cutting code (BaseRepository, TransitionGuard, domainEvents.js, ...)
  modules/
    platform/                <- NEW top-level namespace, this review's core recommendation
      device/                 <- OperationalDevice, OperationalDeviceGroup
      routing/                 <- RoutingEngine (may be model-less — pure resolution logic over platform/device's data)
    preparation/              <- unchanged, becomes a pure CONSUMER of platform/routing
    sales/ ... accounting/ ... (unchanged)
```
`platform/` sits alongside every existing domain namespace — not nested under any of them, not nested under `system/` (§5), not nested under `utils/` (has real persisted state and its own API, `utils/` does not).

---

## 13. Recommended Folder Structure

```
modules/platform/
  device/
    operational-device.model.js
    operational-device.repository.js
    operational-device.service.js
    operational-device.controller.js
    operational-device.router.js
    operational-device.validation.js
    operational-device-group.model.js
    operational-device-group.service.js  (thin — grouping only)
  routing/
    routing-engine.service.js   (stateless — reads platform/device only)
    routing.controller.js        (thin — exposes resolve() for consumers/testing, if a real HTTP surface is ever needed beyond internal service calls)
```

---

## 14. Recommended Module Structure

`OperationalDevice`: brand/branch-scoped, RBAC resource `"OperationalDevices"` (new, additive — never widen an existing resource's meaning). `RoutingEngine`: no RBAC resource needed if it's a pure internal service with no direct client-facing endpoint (consumers call it in-process); if a direct "preview routing for section X" admin endpoint is ever wanted, it would need its own thin, read-only RBAC-gated route — not designed further here without a concrete UI requirement driving it.

---

## 15. Integration Diagram

```
[Preparation]  [Sales/POS, future]  [Warehouse, future]  [HR/Attendance, future]
      │                │                    │                     │
      └────────────────┴────────────────────┴─────────────────────┘
                                    │  (each calls, none is called back)
                                    ▼
                          platform/routing :: RoutingEngine.resolve(genericTaskDescriptor)
                                    │  (reads only)
                                    ▼
                          platform/device :: OperationalDevice / OperationalDeviceGroup
                                    │
                                    ▼
                          physical hardware (out of this platform's scope)

[Any domain] ──(fires a named event)──> utils/domainEvents.js :: DomainEventDispatcher ──> [any subscriber(s)]
   (completely separate flow from the above — never merged, per §1/§7)
```

---

## 16. Risks

- Introducing a brand-new top-level `modules/platform/` namespace is a real, first-of-its-kind organizational precedent for this codebase — low technical risk (purely additive), but it sets a convention future work must respect (the next genuinely cross-cutting, stateful concern should also go here, not spawn a third pattern).
- `OperationalDevice.assignedTo`'s polymorphic `{domain, referenceId}` shape is intentionally loose (no schema-level referential integrity to whatever domain model it points at) — the same tradeoff this codebase already accepts elsewhere for polymorphic refs (e.g. `CashTransaction`'s own polymorphic source references), not a new risk class.
- Real hardware/vendor integration work (connection protocols, pairing flows) remains undesigned, same caveat as the prior document — this review changes *placement and naming*, not that open question.
- If a future requirement genuinely needs event-style routing (e.g., "notify all subscribed systems a ticket was routed," not just "resolve the destination"), the temptation will be to bolt it onto `RoutingEngine` — §1/§7 explicitly warn against this; that need should route through `DomainEventDispatcher` instead, and this document should be cited when that decision comes up.

---

## 17. Migration Strategy

No migration required — nothing was ever implemented from the prior design (verified: `modules/preparation/preparation-device/` and `preparation-routing/` do not exist in source, confirming that document was correctly design-only, never actioned). This review simply supersedes the prior document's placement/naming before any code is written — the cheapest possible time to correct an architecture, which is the entire point of gating implementation behind this validation step.

---

## 18. Final Verdict

**The prior design does not survive unchanged.** Placement: Preparation (Option A) is wrong, confirmed by DDD's Generic-Subdomain-vs-Core-Domain distinction and by the prior design's own field list already having outgrown it. Naming: `PreparationDevice`/`PreparationRoutingService` are wrong, replaced with `OperationalDevice`/`RoutingEngine` under a new `modules/platform/` namespace. Scope: the mission's own suggestion to route Accounting/CRM/Approval/Workflow events through the same engine is **rejected** — that traffic already has a correct, working home (`DomainEventDispatcher`) and merging patterns would recreate the exact anti-pattern (one surface, two unrelated responsibilities) this whole review exists to prevent. Printing Platform and Display Platform as *separate* bounded contexts are **rejected** — both are `deviceType` categories within one Device Platform, not distinct contexts. Communication Platform (a real future notification-dispatch engine) is **correctly a separate, distinct future concern** — not designed here, not merged into Routing.

---

## 19. Go / No-Go Decision

**GO on the corrected architecture** (Option C, `OperationalDevice`/`RoutingEngine`, `modules/platform/` namespace, Routing scope limited to hardware/task-destination resolution). **NO-GO on the prior document's literal design** (`PreparationDevice`/`PreparationRoutingService` inside `modules/preparation/`) — superseded by this document.

---

## 20. Implementation Prerequisites

1. Owner sign-off on the new `modules/platform/` namespace as a permanent architectural precedent (a bigger decision than approving one more module, since it establishes where all future cross-cutting infrastructure lives).
2. Owner sign-off on scope discipline: Routing Engine stays hardware/task-destination-only; Accounting/CRM/Approval/Workflow events stay on `DomainEventDispatcher`, not merged in later under schedule pressure.
3. Real hardware/vendor input before `OperationalDevice.connectionType`/`identity` can be designed past the type-level placeholder this and the prior document both left deliberately open.
4. A concrete first consumer (Preparation, since its ticket workflow already exists and is the only domain with real operational output today) should be the pilot integration before any second domain adopts the platform — proves the abstraction against one real case before generalizing further, the same incremental discipline `DOMAIN_ENGINE_ARCHITECTURE_MIGRATION_PLAN.md` already used for its own pilot (`sales/order`) elsewhere in this codebase.

**This is architecture validation only. No code has been written. Await explicit approval before any implementation phase begins.**
