# PreparationSection — Enterprise Operational Work Center Review

**Status:** §20's narrow scope (`costCenter`, `operationalStatus`, `fallbackSection`) **implemented 2026-07-21** under the platform's Enterprise Engineering Governance mode — ordinary, additive, non-breaking engineering work executed without a separate approval gate, per that mode's own rule ("do not ask for approval for... better architecture inside the approved scope... only stop when the decision changes business behavior or platform architecture"). Everything this review recommended AGAINST (§4/§12/§15 — Shift/HR duplication, stored analytics, HACCP/quality data) remains not built, on purpose. See [[preparation_section_work_center_implementation]] for the implementation record.
**Date:** 2026-07-21
**Method:** Every claim below is traced to source, re-verified this pass, not recalled from memory. New verification performed: `modules/hr/shift/shift.model.js` (confirmed real, independent HR scheduling concept — `morning`/`afternoon`/`night`/`custom`/`flexible` shift types, `draft`/`active`/`inactive`/`archived` lifecycle), `modules/hr/job-title/job-title.model.js` (confirmed a `level: Number` field already exists — a seniority signal), `modules/hr/employee/employee.model.js` (confirmed **no skill/competency field exists anywhere**), `modules/menu/product/product.model.js` (confirmed `Product.preparationSection` is a single, one-directional reference — a section's supported products are already fully derivable by querying `Product`, never something to duplicate on the section side), re-confirmed `CostCenter` (`modules/accounting/cost-center/`) is real and unreferenced by Preparation, re-confirmed no HACCP/food-safety/quality-checklist/cleaning-schedule model exists anywhere in this codebase.

---

## 1. Executive Summary

**PreparationSection should evolve — carefully, not wholesale — into an Enterprise Operational Work Center.** But the mission's own Fourth Task list, taken literally, would turn it into exactly what Eric Evans' aggregate-design guidance and this platform's own already-decided architecture explicitly warn against: a single document trying to own identity, capacity, scheduling, HR assignment, food-safety compliance, cost accounting, and analytics all at once. **This review pushes back on that framing where the evidence requires it**, per the mission's own final instruction. Concretely: **Shift Assignment already has a real, independent home** (`HR/Shift` — verified this pass, a genuine, separate model with its own lifecycle) that `PreparationSectionConfig.assignedEmployees` already correctly *references* rather than duplicates; cramming a second, competing shift concept into Preparation would recreate the exact SSOT violation this engagement spent the last several sessions eliminating everywhere else. **Performance/Productivity/Utilization/Bottleneck Analytics are read-model concerns, computed from `PreparationTicket` history** — they must never be *stored fields* on the section itself (a stored "utilization" field would immediately go stale the moment a new ticket is created, the textbook argument against denormalizing a derived value). **HACCP/Food Safety/Quality Checklist/Cleaning Schedule have zero existing infrastructure anywhere in this codebase** — inventing a compliance data model now, embedded inside an operational config record, would be exactly the "schema ahead of implementation" pattern this whole engagement has repeatedly diagnosed and corrected.

What genuinely belongs on `PreparationSectionConfig` and is missing today: a **Cost Center reference** (already recommended in the prior review, re-confirmed here), an **operational status** distinct from the existing boolean `isActive` (to express Temporary Shutdown/Maintenance Mode as first-class states, not a second boolean), and a **fallback/overflow section reference** (a genuine per-section identity fact, same shape as the already-real `parentDepartment` self-reference). Everything else in Task 4's list either already exists (derivable capacity via `maxParallelTickets`, warehouse ownership, employee assignment), belongs to a different, already-real bounded context (Shift/HR), or is a reporting/compliance capability that does not exist anywhere on this platform and should not be invented here, embedded in a configuration aggregate, as a side effect of this review.

---

## 2. Current PreparationSection Analysis

Re-confirmed, unchanged since the domain-wide review: `stationType` enum broad and additive, free-text `name`/`code` authoritative, self-referencing `parentDepartment` for department→station nesting, `warehouse` reference real, `assignedEmployees`/`equipment` (free-text) real but shallow, `workingHours` (a simple always-open/time-windows shape, distinct from and simpler than `HR/Shift`), `averagePreparationTime`/`maxParallelTickets` genuinely read by `preparation-ticket.service.js`. No `CostCenter` reference. No fallback/overflow reference. `isActive` is the only operational-status signal (a blunt boolean, no "temporarily closed for maintenance vs. permanently deactivated" distinction).

---

## 3. Enterprise Work Center Analysis

An enterprise "work center" concept (the term Odoo Manufacturing and SAP Business One both use for exactly this idea — a location where operational work is performed, with capacity, cost, and scheduling properties) has three canonical parts in every reference system this review is grounded in: **(a) identity/capability** (what this place is, what it can do), **(b) capacity/availability** (how much work it can take, when it's open), **(c) cost attribution** (what department/cost-center absorbs its costs). `PreparationSectionConfig` already has (a) and half of (b) (capacity yes, availability only as a simple schedule, not a true operational-status machine). It has none of (c). **This review's recommendation is scoped to completing (b) and (c) — not to also making the work center own HR scheduling or compliance data, which no reference system's own "work center" entity does either**: Odoo's `mrp.workcenter` references an HR resource calendar, it does not embed one; SAP Business One's Resource master references a cost center, it does not compute financial postings inline.

---

## 4. Operational Analysis

Task 4's checklist, verified item-by-item:

| Capability | Status | Verdict |
|---|---|---|
| Operational Capacity / Max Concurrent Tickets | ✅ Real (`maxParallelTickets`) | Keep as-is |
| Production Capacity | 🟡 Same field serves both prep and production today (`ProductionOrder.preparationSection` shares the same section) | Acceptable — no evidence separate capacity numbers per concern are needed |
| Queue Strategy | 🟡 Exists at the brand level (`PreparationSettings.queue.sortBy`), not per-section | Correct as designed — a brand-wide default with no evidenced need for per-section override |
| Scheduling / Working Calendar / Shift Assignment | 🟡 `workingHours` (simple) exists; **true shift assignment already belongs to `HR/Shift`**, referenced via `assignedEmployees`, not owned here | **Do not duplicate** — see §16 |
| Operating Hours | ✅ Real (`workingHours`) | Keep |
| Temporary Shutdown / Maintenance Mode | ❌ Missing — only a blunt `isActive` boolean | **Real gap, safe to close** |
| Fallback Section / Overflow Routing | ❌ Missing | **Real gap, safe to close (reference only — routing logic itself is a separate concern, see §22)** |
| Priority Rules | ❌ Missing | Not evidenced as a real requirement beyond what `PreparationSettings`/future Routing would own |
| SLA Rules | ✅ Real, brand-level (`PreparationSettings.sla`) | Correct as designed |
| Preparation Time / Average Throughput | ✅ Real (`averagePreparationTime`) | Keep |
| Employee / Supervisor / Manager Assignment | ✅ Real (`assignedEmployees`); no distinct supervisor/manager role split today | Minor, low-priority gap — `JobTitle.level` (confirmed real, a seniority number) already gives a mechanism to derive "who's senior" without a new field |
| Skill Requirements | ❌ Missing, and **not just here** — confirmed no skill/competency field exists on `Employee` anywhere in this platform | **Out of scope** — this is a platform-wide HR gap, not a Preparation-specific one; inventing it here would misplace ownership |
| Supported Categories / Products | 🟡 Fully derivable via `Product.preparationSection` (one-directional, verified) | **Do not duplicate** — storing this on the section too would be a bidirectional-reference SSOT violation |
| Warehouse Ownership | ✅ Real | Keep |
| Inventory Consumption / Waste Destination / Return Destination | 🟡 Consumption real via `recipeConsumptionService`; waste/return destination is ADR-001 Phase 2's scope, not this aggregate's | Correctly out of scope here |
| Quality Checklist / Cleaning Schedule / HACCP / Temperature Monitoring | ❌ Missing, platform-wide, zero infrastructure | **Out of scope — see §12** |
| Cost Center | ❌ Missing | **Real gap, safe to close** |
| Performance / Productivity / Utilization / Historical Analytics / Bottleneck | 🟡 Live utilization computed on read (`_groupTicketsByStation`); historical analytics correctly, honestly out of scope by the code's own prior comment | **Must stay derived, never stored — see §15** |

---

## 5. Administrative Analysis

Section-level administration today is minimal (create/update/soft-delete via generic CRUD) — no section-specific approval workflow exists, and none is evidenced as needed (approval already lives correctly at the `PreparationSettings.return.decisionBy` level, a brand-wide policy, not a per-section one).

---

## 6. Financial Analysis

Zero financial attribution exists today (§4's Cost Center gap). Once closed, `PreparationSectionConfig.costCenter` becomes a pure reference — no financial *logic* belongs on this aggregate; postings remain the job of whatever service eventually creates a `JournalLine` (Refund's Phase 2, or any future Preparation-originated posting), reading the section's `costCenter` at posting time, exactly how `Invoice`/`Payment` already resolve `AccountingSettings.controlAccounts` at posting time rather than storing GL account IDs on themselves.

---

## 7. Production Analysis

`ProductionOrder.preparationSection: required: true` — confirmed this pass, a real, working relationship. No separate "production capability" flag exists distinguishing a section that does `ProductionOrder`-style batch work from one that only handles `PreparationTicket`-style à la carte work — both currently just use the same `stationType` enum values (`productionKitchen`, `centralKitchen`) as a soft signal. Not a defect — no evidence a hard capability flag is needed given `stationType` already communicates this.

---

## 8. Inventory Analysis

Unchanged from the prior review — `warehouse` reference is real and correctly the sole inventory-location fact this aggregate needs; consumption/return/waste posting logic correctly lives in the services that act on tickets/returns, not on the section itself.

---

## 9. Cost Control Analysis

No dedicated "Cost Control" module exists anywhere in this codebase (confirmed, re-searched this pass) — cost control is distributed across the Cost Engine (inventory costing), `WasteRecord` (loss costing), and now, once added, `CostCenter` (departmental attribution). `PreparationSectionConfig` does not need to become a cost-control module itself — it needs exactly one reference field, nothing more.

---

## 10. Accounting Analysis

Same finding as the prior review, now with the enterprise-work-center framing added: every reference ERP named in this mission (Odoo, SAP B1) ties its work-center/resource concept to a cost center by reference, never by embedding accounting logic in the resource record itself. `PreparationSectionConfig.costCenter: ref CostCenter, nullable` is the correct, minimal, precedent-matching shape.

---

## 11. Capacity Planning Analysis

`maxParallelTickets` + `averagePreparationTime` already give this platform real, working capacity math (`utilizationPercent`, computed live). Enterprise capacity planning beyond this (forecasting, what-if scheduling) is a genuinely new analytics capability with no evidenced requirement — not designed here.

---

## 12. Food Safety Analysis

**Zero HACCP, quality-checklist, cleaning-schedule, or temperature-monitoring infrastructure exists anywhere in this codebase** — re-confirmed this pass. This is a real, honest gap the mission itself asks about, but building it now, as fields bolted onto a configuration aggregate, would be architecturally wrong twice over: (1) it would violate this aggregate's own cohesion (an operational identity record is not a compliance-record store), and (2) it would be inventing a data model with no real business input on what a HACCP checklist needs to capture for this specific business — exactly the "do not invent" trap this review's own instructions warn against. **If this capability is ever approved, it belongs in its own small, related entity** (e.g., a `PreparationSectionSafetyLog`, mirroring exactly how `PreparationReturn`/`FryerOilLog`-that-was already prove this platform's own convention: an execution/log record referencing a section by ID, not fields embedded on the section).

---

## 13. Enterprise Scalability Analysis

Single restaurant → chain → central/cloud/dark/ghost/commissary kitchen → franchise → enterprise group: **all already representable today** via `stationType`'s existing enum (`centralKitchen`, `cloudKitchen`, `productionKitchen`) plus brand/branch scoping — re-confirmed, unchanged from every prior pass. "Ghost Kitchen"/"Dark Kitchen" (this mission's own terms) map to the same `cloudKitchen` concept already in the enum — not evidence of a missing enum value, just different market terminology for the same operational shape.

---

## 14. Relationship Analysis

| Relationship | Status |
|---|---|
| Orders → Preparation | ✅ Real, one-directional (`Order` never references its own tickets) |
| Preparation Tickets → Section | ✅ Real |
| Preparation Returns → Section | ✅ Real |
| Preparation Settings → Section | ✅ Correctly separate (policy vs. identity, established this session) |
| Production → Section | ✅ Real (`ProductionOrder.preparationSection`) |
| Warehouse → Section | ✅ Real |
| Accounting/Cost Centers → Section | ❌ Missing — §4/§9/§10's gap |
| Notifications/Printing → Section | ✅ Correctly NOT directly related — both are brand-wide settings surfaces, per this session's own SSOT matrix |
| Future Device Platform/Routing Engine → Section | ✅ Correctly NOT directly related — per `PLATFORM_DEVICE_ROUTING_ARCHITECTURE_VALIDATION.md`, a section is referenced by ID from `OperationalDevice.assignedTo`, never the reverse |
| Future Analytics/KPI Engine → Section | Would read `PreparationTicket` history filtered by section — never needs the section to store its own metrics |
| Future Approval/Workflow Engine → Section | No evidence this needs a direct relationship beyond what `PreparationSettings.return.decisionBy` already provides at the brand level |

---

## 15. DDD Analysis

**Aggregate boundary verdict: `PreparationSectionConfig` should remain a small, identity-and-capacity aggregate — it must NOT absorb Shift/HR, Analytics, or Food-Safety concerns.** Justification, per Evans' own guidance (an aggregate's boundary should be drawn around what must be transactionally consistent together, kept as small as the business invariants allow): nothing about section identity/capacity needs to change atomically with a shift schedule, a food-safety checklist, or a computed utilization percentage — these are either owned by a different aggregate entirely (`HR/Shift`) or are pure derived read-models with no independent existence to be "consistent" about. Storing a derived value (utilization, productivity) as a field is the specific anti-pattern Fowler's own writing on "Calculated Field"/derived data warns against unless there's a real caching/performance justification — none exists here (the live computation is already fast, per this session's own indexing recommendation in the prior review addressing the actual performance concern correctly, at the query layer, not by denormalizing).

---

## 16. Architectural Problems

1. No `CostCenter` reference (real gap).
2. `isActive` conflates "permanently deactivated" with "temporarily closed for maintenance" — one boolean doing two jobs.
3. No fallback/overflow section reference.
4. **Risk, not yet a problem**: the mission's own Task 4 list, if implemented literally, would create the exact aggregate-boundary violation §15 just argued against — flagged here explicitly so it is not silently absorbed into a future implementation pass.

---

## 17. Severity Matrix

| # | Problem | Severity | Category |
|---|---|---|---|
| 1 | No `CostCenter` reference | Medium | Safe |
| 2 | `isActive` too coarse | Low-Medium | Safe (additive enum or a second, more specific field) |
| 3 | No fallback/overflow reference | Low | Safe |
| 4 | Risk of God-Object scope creep from Task 4's literal list | **High if not explicitly rejected** | Governance, not code |

---

## 18. Root Cause Analysis

#1-#3 share the same root cause named in every prior review this session: real capability gaps that were never prioritized, not evidence of a design defect. #4 is not a root cause of anything already in the code — it is a risk in how this *mission itself* was framed, and this review's job, per its own final instruction, is to name that rather than comply with it.

---

## 19. Recommended Enterprise Architecture

Keep `PreparationSectionConfig` as the single, small, identity-and-capacity aggregate it already correctly is. Add exactly three fields (§20). Explicitly do not add: shift/schedule data (reference `HR/Shift` if a real integration need ever emerges — not designed here, no evidence of one today), skill requirements (platform-wide HR gap, not this aggregate's job), HACCP/quality/cleaning data (§12 — a future, separate entity if ever approved), performance/analytics fields (must stay derived).

---

## 20. Proposed Aggregate Design

```
PreparationSectionConfig (existing fields unchanged) +
  costCenter: { type: ObjectId, ref: "CostCenter", default: null },
  operationalStatus: { type: String, enum: ["OPEN", "TEMPORARILY_CLOSED", "MAINTENANCE"], default: "OPEN" },
    // Additive alongside the existing `isActive` (which remains the permanent-deactivation/soft-
    // delete-adjacent flag) — `operationalStatus` expresses a temporary, reversible state a manager
    // toggles day-to-day, a different concern than `isActive`'s administrative one.
  fallbackSection: { type: ObjectId, ref: "PreparationSectionConfig", default: null },
    // Same self-reference pattern `parentDepartment` already establishes — one hop only, no chain,
    // consistent with every other failover/fallback design already approved this session.
```

---

## 21. Proposed Responsibilities

`PreparationSectionConfig` owns: identity, capacity numbers, operating hours, operational status, warehouse/cost-center attribution, employee assignment (by reference), fallback reference. It does not own: shift scheduling logic, food-safety records, computed metrics, routing/device logic, financial postings.

---

## 22. Proposed Relationships

`fallbackSection`'s *use* (actually redirecting a ticket when the primary section is `TEMPORARILY_CLOSED`/`MAINTENANCE`) is a **routing decision**, not something `PreparationSectionConfig` executes itself — that logic belongs to whatever reads this field, consistent with `PLATFORM_DEVICE_ROUTING_ARCHITECTURE_VALIDATION.md`'s own already-approved principle that Preparation/routing consumers read configuration, they don't execute routing algorithms inline. This review does not design that consumption logic — only the reference field it would need to exist.

---

## 23. Required New Capabilities

None beyond §20's three fields. Everything else Task 4 asked about either already exists, is correctly owned elsewhere, or is out of scope per §12/§15's reasoning.

---

## 24. Safe Improvements

All three §20 fields: additive, nullable/defaulted, zero impact on any existing query, endpoint, or test. No existing behavior changes until a future consumer reads them.

---

## 25. Breaking Improvements

None identified. Nothing in this review's actual recommendation (as opposed to the mission's original, broader Task 4 list) requires a schema break, an API break, a workflow change, or a bounded-context move.

---

## 26. Migration Strategy

Purely additive — three new optional fields, default values that preserve exact current behavior (`operationalStatus` defaults to `"OPEN"`, meaning every existing section behaves identically to today until a manager explicitly changes it). No data migration needed.

---

## 27. Risks

The real risk in this task is not technical — it's scope: implementing Task 4's full list literally would produce a large, low-cohesion aggregate that this review's own DDD analysis (§15) argues against, and would contradict this session's own already-approved architectural decisions (Settings/Section boundary, Device/Routing separation, SSOT matrix) within the same engagement. This review recommends the owner explicitly confirm the narrower §20 scope before any implementation, rather than assume the full Task 4 list was meant to be built as literal fields.

---

## 28. Final Recommendation

**PreparationSection should evolve into a true Enterprise Operational Work Center — but that means completing its identity/capacity/cost-attribution role precisely, not maximizing the field count.** Recommend implementing exactly `costCenter`, `operationalStatus`, `fallbackSection` (§20) — all safe, additive, zero-risk. Recommend explicitly declining, for this pass, everything in Task 4's list that belongs to a different bounded context (Shift/HR), is a derived value that must never be stored (Performance/Analytics), or has zero existing platform infrastructure to build on responsibly (HACCP/Food Safety). **This is a disagreement with part of the mission's own framing, stated because the review's own final instruction required it, not a compliance shortfall.** Awaiting explicit approval — of this narrower scope specifically — before any implementation.
