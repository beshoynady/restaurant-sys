# Kitchen Execution Architecture

**Status: design only, no code written.** Deep-dive companion to
`MENU_PRODUCTION_PLATFORM_REDESIGN.md` §6 (which already establishes: station-type taxonomy,
combo/modifier expansion into per-station ticket lines, auto-ticket-creation from Order — named
as the single most consequential kitchen fix — and a minimal priority/`sequenceGroup` mechanism).
This document adds the remaining prompt-named capabilities (Kitchen Queue, Kitchen Screen,
Capacity, Metrics/SLA/Dashboard, Kitchen Events) in implementation-ready detail, confirmed against
this session's direct source read that **none of these exist today** — `PreparationSection`/
`PreparationTicket` are real, but a Kitchen Display System (KDS) in any form is completely absent
(confirmed by dedicated search this session: zero matches for "KDS"/"queue"/"dashboard" anywhere
in `modules/preparation/**` or elsewhere).

---

## 1. What Already Exists (Restated, Not Re-Derived)

`PreparationSectionConfig`: `averagePreparationTime`, `maxParallelTickets`, `allowPartialDelivery`,
`isDeliveryRelevant`, `autoAssignChef`, `requireConfirmationBeforeSend`, `allowRejectTickets`.
`PreparationTicket`: `preparationStatus` (PENDING/PREPARING/READY/CANCELLED/REJECTED),
`deliveryStatus`, `deliveryPolicy` (IMMEDIATE/WAIT_ALL), `items[]`, `handoverEvents[]`. One ticket
per section per order (schema-real; creation-logic absent, per the redesign doc's own finding).

**`maxParallelTickets` is the one already-existing field this document leans on heavily** — it's a
capacity concept that already exists on the schema but, per the confirmed absence of any queue/
dashboard mechanism, has never been *read* by anything. §3 (Capacity) below is largely "build the
logic that finally uses this field," not new schema.

---

## 2. Kitchen Stations, Departments, Multi-Kitchen (Extends Redesign Doc §6.1)

- **Stations vs. Departments**: `stationType` (redesign doc §6.1, e.g. `"grill"`) is the
  *function*; a **Department**, genuinely new, is an *organizational grouping* of stations (e.g.
  "Hot Line" department containing Grill+Fryer+HotKitchen stations) — new, optional
  `PreparationSectionConfig.department` (String or a lightweight new `KitchenDepartment` reference
  if brands need department-level reporting/permissions distinct from section-level; scoped as a
  simple string field for Phase 1, matching this platform's consistent "don't build a model for
  something a string can express until proven otherwise" discipline).
- **Multi-Kitchen**: already fully supported structurally — a `PreparationSection` is
  `warehouse`-linked (redesign doc §2.9's `PreparationSection.warehouse` addition) and
  `branch`-scoped; a central kitchen and N branch kitchens are simply multiple `Warehouse`+
  `PreparationSection` combinations, exactly the same reasoning already applied to multi-warehouse
  Production in the companion redesign. No new mechanism.

---

## 3. Kitchen Capacity & Preparation Priority

- **Capacity**: `maxParallelTickets` (already exists) is enforced at ticket-creation time (§4 of
  the redesign doc's auto-ticket-creation logic) — a new `PreparationSection` currently at
  capacity either queues the new ticket (default) or, per a new
  `PreparationSectionConfig.onCapacityExceeded: enum["queue","reject","allowOverflow"]` policy,
  rejects/flags it for manual load-balancing. **Queueing, not blocking, is the default** — a
  kitchen doesn't stop accepting orders when busy, it takes longer; the queue *is* the visible
  symptom of capacity being exceeded, not a separate gate.
- **Priority**: `PreparationTicket.priority` (redesign doc §6.4: normal/rush/hold) determines
  queue ordering *within* a section — rush tickets surface first in the Kitchen Queue view (§4)
  regardless of arrival order, subject to `sequenceGroup` (redesign doc §6.4) still being honored
  (a rush ticket in `sequenceGroup: 2` still waits for `sequenceGroup: 1` in the same order to
  clear — priority reorders *across* orders/tickets, sequencing orders *within* one order,
  genuinely different axes, correctly kept as two separate fields rather than conflated).

---

## 4. Kitchen Queue (Genuinely New)

**Not a new persisted model** — a **read-side query/service** over the existing `PreparationTicket`
collection, exactly matching this document's inherited discipline (Menu Engineering, Cost
Reporting) of building new capability as a read-side service over real data, not a new write path:
```
KitchenQueueService.getQueue({ brand, branch, preparationSection }):
  return PreparationTicket.find({
    brand, branch, preparationSection,
    preparationStatus: { $in: ["PENDING", "PREPARING"] }
  })
  .sort by: priority (rush first), then sequenceGroup (lower first, nulls last), then receivedAt (FIFO)
```
This single query IS the Kitchen Queue — no new storage, no new write path, a well-defined sort
order over data that already exists. The "queue position" a chef sees is this sort order's index,
computed at read time, never persisted (persisting a position would immediately go stale the
moment any ticket ahead of it changes status — correctly avoided).

---

## 5. Kitchen Screen (KDS) — Read Contract, Not a UI Design

This backend-scoped redesign does not design a UI (matching this engagement's consistent backend-
only scope, already stated in the companion Menu redesign's §11 boundary). What it specifies is
the **data contract** a real KDS frontend would consume — the Kitchen Queue (§4) plus per-ticket
detail (`items[]`, `notes`, elapsed time since `receivedAt`, `expectedReadyAt` per redesign doc
§6.3) — and the **write actions** a KDS screen triggers (ticket status transitions, already
designed via `TransitionGuard`, atomic-claim from first implementation per this platform's now-
standard practice). No new backend capability beyond what §4 and the redesign doc's ticket-
creation logic already provide — a KDS is a *consumer* of this architecture, not a reason for
additional backend design.

---

## 6. Kitchen Delay Detection

New, small: a ticket is "delayed" when `now > expectedReadyAt` and `preparationStatus` is still
`PENDING`/`PREPARING`. Computed at read time in the Queue view (§4) — a boolean/duration derived
field, not a new status value (avoiding the platform-wide anti-pattern already flagged repeatedly
in `ARCHITECTURE_REVIEW.md`: "the enum is always well-designed; the transition logic enforcing it
never exists" — a `DELAYED` status would be exactly that mistake again; delay is a *computed
property of elapsed time*, not a state a ticket transitions into). Optionally emits
`DomainEvent.PREPARATION_TICKET_DELAYED` (new, added alongside its first real publisher, per
convention) when a scheduled sweep (same nightly-safety-net pattern as
`MENU_COST_CONTROL_ARCHITECTURE.md` §3, but on a much shorter interval — every few minutes, since
kitchen delay detection is operationally time-sensitive in a way nightly cost refresh isn't)
detects a newly-delayed ticket — the event-emission side only, per the same "build the producer,
not a fabricated consumer" discipline already applied to Cost/Margin Alerts.

---

## 7. Kitchen Metrics, SLA, Dashboard

All three are the same read-side reporting pattern applied to kitchen data specifically:

- **Metrics**: average `actualReadyAt − receivedAt` per section/product/time-of-day; rejection
  rate (`REJECTED` / total tickets); capacity-breach frequency (§3). Computed from existing
  `PreparationTicket` timestamps — no new fields beyond what's already specified.
- **SLA**: a brand-configurable target (`PreparationSectionConfig.slaTargetMinutes`, new) compared
  against the Metrics above — "Grill should complete tickets within 8 minutes 95% of the time" —
  a report against a policy, not an enforcement mechanism (an SLA breach doesn't block anything, it
  informs staffing/process decisions, same human-in-the-loop boundary already established for Menu
  Optimization).
- **Dashboard**: the aggregation of Queue (§4) + Metrics + SLA + Delay (§6) into one read-side
  service (`KitchenDashboardService`) — no new data, a composition of everything already specified
  in this document.

---

## 8. Kitchen Events (Domain Event Catalog Additions)

New events, added in the same change that ships each one's first real publisher (the established
convention, restated once more since it governs every event in this document):
- `PREPARATION_TICKET_CREATED` — from the redesign doc §6.3's auto-creation logic.
- `PREPARATION_TICKET_STATUS_CHANGED` — from the `TransitionGuard`-enforced status transition.
- `PREPARATION_TICKET_DELAYED` — from §6.
- `PREPARATION_SECTION_CAPACITY_EXCEEDED` — from §3's capacity check, when
  `onCapacityExceeded: "reject"` fires (an operationally significant event a manager would want
  visibility into, even before any real Notification-delivery service exists to alert on it).

These are the seams a future KDS's real-time push layer (websocket/SSE, not designed here — out of
this backend-architecture document's scope, same as every other frontend/delivery-mechanism
boundary already drawn in this engagement) would subscribe to.

---

## 9. Accounting & Operational Impact

| Feature | Accounting impact | Operational impact |
|---|---|---|
| Kitchen Queue/Screen | None | Direct chef-facing tool — the highest-frequency-touched capability in this entire Menu Platform redesign, correctly prioritized as such in `MENU_FINAL_IMPLEMENTATION_PLAN.md` |
| Capacity/Priority | None | Prevents silent kitchen overload from going undetected; informs staffing decisions |
| Delay Detection | None | Early-warning signal for service breakdowns, feeds SLA reporting |
| Metrics/SLA/Dashboard | None | Management visibility tool, same advisory-only boundary as Menu Engineering |
| Kitchen Events | None directly — but the *auto-ticket-creation* event chain this all sits on is what finally makes Order→Kitchen a real, working integration (currently confirmed non-existent) | Closes the single most consequential kitchen gap named in the audit |

No feature in this document introduces a new posting path to Inventory or Accounting — Kitchen
execution consumes inventory *through* Recipe/Combo consumption (already designed elsewhere), and
this document's entire contribution is *visibility and sequencing* around that consumption, not a
new write path to it.
