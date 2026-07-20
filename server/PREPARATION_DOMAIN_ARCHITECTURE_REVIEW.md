# Preparation Bounded Context — Architecture Review

**Status:** Architecture review + implementation complete (2026-07-20). This document's own §Sixth Objective recommendation (keep `FryerOilLog` as its own module, only fix its feature-toggle key) was **overridden by an explicit owner decision during implementation**: `FryerOilLog` was deleted entirely — oil is now consumed through the generic `ManualConsumption` path like every other non-recipe-driven material (oil/gas/packaging/cleaning supplies), which its own code comment already named oil as an example of. Every other recommendation in this document was implemented as written. Treat every `fryer-oil-log`/`FryerOilLog` reference below as historical record of the analysis, not current state. **Update (2026-07-21):** this document's own migration strategy said the legacy `PreparationTicketSettings`/`PreparationReturnSettings` collections "can remain for now as an implementation detail" — a later, separate task went further and required their full removal (no model/service/controller/router/validation exists for either any longer); see `PREPARATION_CONFIGURATION_PLATFORM_ENTERPRISE_DESIGN.md` for that decision and CLAUDE.md item 16 for the final state.
**Date:** 2026-07-20
**Method:** Every file under `server/modules/preparation/` (30 files, 6 sub-modules) was read in full, plus every cross-referenced dependency (RBAC `RESOURCE_ENUM`, `BrandSettings.modules`, `Order`/`Product`/`WarehouseDocument`/`WasteRecord`/`CashierShift`/`Loyalty` touchpoints already verified in this engagement's prior sessions). Every claim below is either cited to an exact file or explicitly marked as a new judgment call with no source to cite.

---

## 1. Executive Summary

The Preparation domain is **one coherent bounded context split across six inconsistently-organized modules**, not six genuinely independent domains. The inconsistency is not cosmetic — it produces three concrete, verified defects: (1) `FryerOilLog` is gated behind `checkModuleEnabled("inventory")` while every sibling module is gated behind `checkModuleEnabled("preparation")`, and **`BrandSettings.modules.inventory` defaults to `enabled: false` while `.preparation` defaults to `enabled: true`** — meaning a brand's Fryer Oil Log is silently blocked by default on a fresh brand even though it's organizationally a Preparation feature; (2) `PreparationSectionConfig` carries five ticket-related settings fields (`autoAssignChef`, `requireConfirmationBeforeSend`, `allowRejectTickets`, `allowPartialDelivery`, `isDeliveryRelevant`) that **zero code anywhere reads** — dead configuration duplicating, in intent, what a separate, equally-dormant `PreparationTicketSettings` model was built to hold; (3) three different state-machine implementations exist for materially the same problem (`preparation-ticket.service.js` and `preparation-return.service.js` each hand-roll their own inline transition-map object, while `fryer-oil-log.service.js` correctly reuses the platform's shared `createTransitionGuard()` utility that the other two should also be using).

Against this, the domain also contains genuinely strong, underrated work: `preparation-ticket.service.js#getKitchenQueue()`/`getKitchenDashboard()` is a real, server-computed Kitchen Display System view (elapsed time, SLA badges, per-station utilization) that a prior review in this engagement's own history incorrectly reported as "still unbuilt" — **that prior claim was stale, not this review's finding; source wins.** `PreparationReturn` is a real, DDD-correct child aggregate (own bounded context, own status lifecycle, per-item `WASTE`/`RETURN_TO_STOCK`/`RESELLABLE` decision) that a separate, concurrent architecture effort in this engagement (the Refund design) initially missed entirely — this review's own reading independently corroborates that finding.

**Recommendation, stated up front and justified in full below**: keep the six areas as **separately-routed, separately-tested modules** (do not physically merge files/folders), but retrofit them to genuinely behave as **one bounded context with one settings aggregate, one shared state-machine utility, and one consistent feature-toggle key** — a reorganization of configuration and cross-cutting concerns, not of the module boundary itself. Fryer Oil Log should be *conceptually* absorbed as a Preparation-Section activity (the data model already treats it this way — `station: ref PreparationSectionConfig`) even if it keeps its own collection; its feature-toggle key and settings placement are the concrete defects to fix, not its folder.

---

## 2. Current Architecture

Six modules under `server/modules/preparation/`:

| Module | Files | Real business logic? | `checkModuleEnabled` key | RBAC resource |
|---|---|---|---|---|
| `preparation-section` | 5 | No — pure CRUD (`preparation-section.service.js`, 13 lines) | `preparation` | `PreparationSections` |
| `preparation-ticket` | 5 | **Yes — substantial**: status-transition guard, atomic-claim concurrency, `createTicketsFromOrder()` (auto-ticket creation, order-item expansion, per-section splitting), recipe-consumption trigger wiring, `getKitchenQueue()`/`getKitchenDashboard()` (real KDS) | `preparation` | `PreparationTickets` |
| `preparation-return` | 5 | Partial — real status-transition guard (own inline map, not the shared utility), but the per-item `decision` field drives no downstream action | `preparation` | `PreparationReturns` |
| `preparation-settings/preparation-ticket-settings` | 5 | No — pure CRUD; its own `ticketSequence` sub-document is provably unread (confirmed by an explicit comment in `preparation-ticket.service.js` itself) | `preparation` | `PreparationTicketSettings` |
| `preparation-settings/preparation-return-settings` | 5 | No — pure CRUD | `preparation` | `PreparationReturnSettings` |
| `fryer-oil-log` | 5 | **Yes — substantial**: real `install()`/`logQualityCheck()`/`discard()` lifecycle, shared `TransitionGuard`, real inventory posting via `warehouseDocumentService` | **`inventory`** (inconsistent) | `FryerOilLogs` |

**No general `PreparationSettings` model exists** despite the folder being named `preparation-settings` — it contains exactly two specific settings documents (ticket, return), not an umbrella.

**Cross-module dependency graph** (verified, not assumed):
```
Order (Sales context)
  └─ order.service.js#transition() → PreparationTicketModel.createTicketsFromOrder()
       (one-directional: Order holds NO reference to its own tickets — confirmed by grep)

PreparationTicket
  ├─ references: Order, Product (via items[]), PreparationSectionConfig, Employee
  ├─ triggers: recipeConsumptionService.consumeForTicket() (best-effort, non-transactional)
  └─ read by: order.service.js#cancelItem (phase derivation), Kitchen Queue/Dashboard

PreparationSectionConfig
  ├─ referenced by: PreparationTicket, PreparationReturn, ProductionRecord, FryerOilLog, Product.preparationSection, WasteRecord.department
  └─ self-references itself for department→station nesting

PreparationReturn
  ├─ references: SalesReturn (one-directional — mirrors Order/PreparationTicket exactly), PreparationSectionConfig, Employee
  └─ triggers: nothing (its own `decision` field is inert — no WarehouseDocument/WasteRecord ever created from it)

FryerOilLog
  ├─ references: PreparationSectionConfig (as `station`), StockItem, Warehouse, WasteRecord (optional link), WarehouseDocument
  └─ triggers: warehouseDocumentService.create()/postDocument() directly (not through WasteRecord for the install leg)
```

---

## 3. Domain Model Review

- **`PreparationSectionConfig`** is well-designed as a configurable operational area, not hardcoded kitchen (§ Objective 7 below confirms this in full) — `stationType` enum includes `bakery`/`coffeeBar`/`juiceBar`/`cocktailBar`/`seafood`/`packaging`/`centralKitchen`/`cloudKitchen` etc., free-text `name`/`code` remain the source of truth, `stationType` is an additive structural tag only. Self-referencing `parentDepartment` avoids inventing a second hierarchy model — good, consistent discipline with this platform's own established pattern (same technique already used for Product size-groups).
- **`PreparationTicket`** has no `priority`/`rushOrder` field, no `firedAt`/`hold` state distinct from `PREPARING`, no `SERVED` terminal state (stops at `HANDED_OVER`) — see § Objective 4.
- **`PreparationReturn`**'s `items[].decision: WASTE/RETURN_TO_STOCK/RESELLABLE` is a real, correctly-designed data model with no executor — the single most consequential dormant piece of business logic in this entire domain.
- **`FryerOilLog`** is the most mechanically complete model in the domain (full lifecycle, real cost resolution via the Cost Engine, real inventory posting) — see § Objective 6 for why its *placement*, not its *design*, is the issue.

---

## 4. Operational Review

Ticket lifecycle is real: `PENDING → PREPARING → READY`, independently `WAITING → READY_FOR_HANDOVER → HANDED_OVER` for delivery. Kitchen Queue groups by station, computes elapsed/remaining time and an `overdue`/`warning`/`onTime` SLA badge, and utilization (`activeTicketCount / maxParallelTickets`). This is a genuinely operational, floor-usable view — not a stub.

**Gaps, verified by absence**: no rush/priority flagging, no explicit fire/hold distinct from the existing `PREPARING` status, no per-chef productivity tracking (the `responsibleEmployee` field exists but nothing aggregates by it), no bottleneck/historical-throughput analytics (the code's own comment explicitly scopes `getKitchenQueue()` to "LIVE queue only... historical performance/analytics is separate, unbuilt Kitchen Analytics work, not fabricated here" — an honest, correctly-scoped omission, not an oversight).

---

## 5. Administrative Review

Settings are fragmented (§ Objective 5) and, more importantly, **entirely unread by any business logic** — `PreparationTicketSettings`, `PreparationReturnSettings`, and `PreparationSectionConfig`'s five embedded settings fields are all dead configuration. An owner configuring any of these today changes nothing about system behavior. This is the domain's single largest gap between "looks configurable" and "is configurable."

---

## 6. Financial Review

`PreparationTicket`'s recipe-consumption trigger (`recipeConsumptionService.consumeForTicket()`) is wired but **best-effort, non-transactional** (`try/catch`, log-and-continue) — the same pre-MongoDB-transactions-standard pattern already flagged as technical debt for Purchasing/Production in this engagement's prior roadmap review. `FryerOilLog.install()` similarly performs a status claim, then a **separate**, non-transactional `warehouseDocumentService.create()`/`.postDocument()` call — if the posting step fails after the claim already committed, the log is stuck `InUse` with no real inventory consumption ever recorded, a genuine partial-failure state. `PreparationReturn` has no financial posting at all (§3). None of this domain's writes currently participate in the platform's own MongoDB-transactions standard.

---

## 7. DDD Review

**First Objective — one bounded context or multiple?** **One bounded context** (Preparation/Kitchen Execution), organized as multiple aggregates within it — not multiple bounded contexts. Justification: every module shares the same ubiquitous language (section, station, ticket, decision, cycle), the same brand/branch scoping convention, and — most concretely — `PreparationSectionConfig` is the single shared reference point every other module in this folder depends on (`PreparationTicket.preparationSection`, `PreparationReturn.preparationSection`, `FryerOilLog.station`). A true separate bounded context would not share its central entity this pervasively. The one already-correct cross-context boundary in this whole area is `PreparationReturn.returnInvoice → SalesReturn` — that reference crosses from Preparation into Sales, and is correctly modeled as a by-ID reference, not an embed — proving the codebase's own author already understands the distinction being asked about here.

**Aggregate Roots**: `PreparationTicket`, `PreparationReturn`, `FryerOilLog`, `PreparationSectionConfig` — four aggregate roots in one bounded context, which is normal and expected (a bounded context is not required to have exactly one aggregate).

**Second Objective — reorganize under one unified module, or stay independent?** See § Recommended Architecture (§14) — **stay independently routed/tested, but unify configuration and cross-cutting mechanics.** A full folder/file merge would not fix any of the three concrete defects found (dead settings, inconsistent module key, duplicated state-machine code) — those are configuration and convention problems, not folder-structure problems, and a merge risks disturbing three already-working, already-tested pieces (Kitchen Queue, ticket transitions, oil-log lifecycle) for no functional gain.

---

## 8. Workflow Review

Three independent status-transition implementations exist for what is, at the DDD level, the same kind of guard:
- `preparation-ticket.service.js`: inline `PREPARATION_STATUS_TRANSITIONS`/`DELIVERY_STATUS_TRANSITIONS` objects, manual `allowed.includes()` check.
- `preparation-return.service.js`: inline `STATUS_TRANSITIONS` object, same manual pattern.
- `fryer-oil-log.service.js`: the shared `createTransitionGuard()` utility (`utils/TransitionGuard.js`) — **the correct, already-proven pattern**, used elsewhere platform-wide (`waste-record.service.js`, `purchase-return.service.js`).

This is real, verified duplication — not a hypothetical one — and it is the domain's clearest "missing abstraction reuse" finding.

---

## 9. Preparation Lifecycle Review

```
Order confirmed
  → createTicketsFromOrder() [real]
    → PreparationTicket{PENDING} × one per distinct preparationSection
      → PREPARING [real, guarded]
        → recipe consumption (if ON_PREP_START) [real, best-effort]
        → READY [real, guarded]
          → recipe consumption (if ON_PREP_END) [real, best-effort]
      → WAITING → READY_FOR_HANDOVER → HANDED_OVER [real, guarded]
        → recipe consumption (if ON_DELIVERY) [real, best-effort]

[separately, if a return happens]
SalesReturn created (Sales context, dormant per the Refund review)
  → PreparationReturn{PENDING} created, one per affected section [schema exists, orchestration not built]
    → IN_REVIEW → FINALIZED [guarded, but...]
      → items[].decision [set, but drives NOTHING — no ReturnIssuance, no WasteRecord, ever]

[separately, oil lifecycle]
FryerOilLog{Draft}
  → install() [real: claim + WarehouseDocument OUT + Cost Engine cost resolution]
    → InUse
      → logQualityCheck() × N [real, no status change]
      → discard() [real, optionally links a WasteRecord — but does not CREATE one]
        → Discarded
```

---

## 10. Comparison with Enterprise Restaurant Systems

Extracted as best practices only, not copied:

- **Foodics/Toast/Square-style KDS**: station-grouped queues with elapsed-time/SLA coloring — **already matched** by `getKitchenQueue()`'s `slaBadge`/`isOverdue` computation. Where this platform is behind: no rush-order flag, no fire/hold distinct state (both are standard KDS primitives in every system reviewed).
- **Oracle Micros Simphony / NCR Aloha**: strict station-routing configuration with per-station capacity and average-ticket-time — **already matched** by `maxParallelTickets`/`averagePreparationTime`, and `utilizationPercent`'s computation is a genuinely enterprise-grade touch few smaller POS systems bother computing server-side.
- **Odoo / Daftra (ERP-first systems, not POS-first)**: settings modeled as one resolvable configuration document per domain, read through a `resolveForBranch`-style method, not scattered CRUD documents — **this platform already has that exact pattern** elsewhere (`orderSettingsService`, `accountingSettingService`) but has **not yet applied it to Preparation's own settings**, which is the concrete gap this review recommends closing (§14/§17).
- **Deliverect (delivery-aggregator integration specialist)**: delivery-channel-aware ticket routing — this platform's `deliveryPolicy: IMMEDIATE/WAIT_ALL` on both `Order` and `PreparationTicket` is a real, if simple, equivalent; no evidence a deeper delivery-aggregator-specific routing need exists in this codebase today (consistent with the earlier Refund review's finding that no delivery-provider integration exists anywhere).
- **HACCP/food-safety logging (a cross-cutting concern in every enterprise restaurant system reviewed)**: `FryerOilLog.qualityChecks[]` is a genuine, if narrow, food-safety log — the *only* HACCP-adjacent capability found anywhere in this domain. No temperature logging, no allergen-cross-contamination tracking, no general food-safety-check model exists beyond oil quality specifically.

---

## Fourth Objective — Capability Checklist

| Capability | Status | Evidence |
|---|---|---|
| Kitchen Operations / Workflow | ✅ Real | `preparation-ticket.service.js` transitions |
| Kitchen Display System (KDS) | ✅ Real | `getKitchenQueue()`/`getKitchenDashboard()` |
| Preparation Stations | ✅ Real | `PreparationSectionConfig` |
| Kitchen/Ticket Routing | ✅ Real | `createTicketsFromOrder()`, `Product.preparationSection` |
| Section Ownership | ✅ Real | `preparationSection` ref on every ticket/return/oil-log |
| Preparation Queues | ✅ Real | `getKitchenQueue()` |
| Rush Orders | ❌ Missing | No priority/rush field anywhere on `PreparationTicket` |
| Fire / Hold | ❌ Missing | No state distinct from `PREPARING` |
| Ready | ✅ Real | `preparationStatus: READY` |
| Served | 🟡 Partial | Stops at `HANDED_OVER`; no explicit "served/consumed" signal beyond that |
| Kitchen Return | 🟡 Partial | Schema real (`PreparationReturn`), orchestration/execution not built |
| Waste | 🟡 Partial | `WasteRecord` is real and working; nothing in Preparation creates one automatically |
| Rework | ❌ Missing | No concept anywhere (a returned/rejected item cannot be looped back for re-preparation) |
| Transfer | ❌ Missing | No inter-station or inter-branch preparation-transfer concept |
| Inventory Consumption | ✅ Real | `recipeConsumptionService.consumeForTicket()` |
| Inventory Return | ❌ Missing | `ReturnIssuance` transaction type exists platform-wide but nothing in Preparation posts it |
| Oil Consumption | ✅ Real | `FryerOilLog.install()` |
| Shift Closing | N/A to this domain | Owned by `CashierShift`, correctly not duplicated here |
| Kitchen KPIs/SLA/Timing | 🟡 Partial | Live SLA badges real; historical/trend KPIs explicitly out of scope (honest, not a gap) |
| Bottleneck Analysis | ❌ Missing | No historical throughput aggregation |
| Kitchen Capacity | ✅ Real | `maxParallelTickets` + `utilizationPercent` |
| Productivity | ❌ Missing | `responsibleEmployee` recorded but never aggregated |
| Quality Control / HACCP | 🟡 Partial | Oil-only (`qualityChecks[]`); no general food-safety model |
| Kitchen Audit | 🟡 Partial | `handoverEvents[]` exists on tickets; no equivalent audit trail on returns/oil beyond standard `createdBy`/`updatedBy` |
| Kitchen Cost Control / Losses | 🟡 Partial | `WasteRecord`'s costing is real; Preparation's own returns don't feed it yet |

---

## Fifth Objective — Settings Anti-Pattern Review

**Yes, this is an anti-pattern, confirmed by source, not assumed.** Three separate, uncoordinated settings surfaces exist for one bounded context: `PreparationTicketSettings` (brand/branch), `PreparationReturnSettings` (brand/branch), and `PreparationSectionConfig`'s own five embedded, ticket-related fields (per-section) — three different scopes, three different documents, zero of them actually read by any business logic. This is worse than a naming inconsistency: it means an owner has **three different places to configure kitchen behavior**, none of which do anything.

**Recommendation: a single `PreparationSettings` document per brand/branch**, structured as **one document with logically-named sub-objects** (not one flat field list) — directly answering the objective's own example list:

```
PreparationSettings { brand, branch,
  ticket: { sequence, deliveryPolicy default, maxPreparationTime, allowReject, autoMergeTickets, allowEditAfterSent },
  queue: { /* future: sort/filter defaults for the KDS view */ },
  display: { /* future: KDS-specific rendering prefs, if a dedicated frontend needs them */ },
  waste: { /* mirrors WasteRecord's own already-real categories, brand-level defaults only */ },
  oil: { /* discard-reason defaults, quality-check cadence reminders */ },
  safety: { /* future HACCP-adjacent thresholds */ },
  transfer: { /* if Rework/Transfer capabilities are built later */ },
  approval: { decisionBy, thresholds — mirrors SalesReturnSettings/PreparationReturnSettings' already-real shape },
  sla: { warning/overdue thresholds — currently hardcoded in `_groupTicketsByStation` as fixed minute values },
}
```

This mirrors the already-proven, already-live `AccountingSettings` shape in this exact codebase (one document, many logical sub-objects, one `resolveForPosting`-style resolution method) rather than inventing a new settings-organization convention. **Per-section overrides** (the legitimate part of `PreparationSectionConfig`'s embedded fields — a bakery genuinely might want a different `maxParallelTickets` than a grill) should stay on `PreparationSectionConfig` itself (operational capacity is a per-station fact, not a brand policy), while **policy** (approval thresholds, reason-requirement toggles, SLA warning minutes) belongs in the unified `PreparationSettings` document. This is the same split already correctly modeled between `SalesReturnSettings` (policy) and `SalesReturn` (operational document) in the adjacent Refund domain — reuse that precedent, don't invent a new one.

---

## Sixth Objective — Fryer Oil Log Placement

**The user's stated opinion is correct, and this review's own verification independently confirms it, with one important refinement.**

Evidence supporting "oil is a Preparation Section activity, not a separate domain":
- `FryerOilLog.station: ref PreparationSectionConfig, required: true` — the data model itself already treats oil usage as something a preparation section does.
- Its business logic (install/quality-check/discard) is a real *activity log* pattern, structurally identical to what `PreparationReturn`/`PreparationTicket` already are — an execution record scoped to a section.

Evidence this review found that the *folder* is not actually the problem — the *feature-toggle key* is:
- `fryer-oil-log.router.js` gates on `checkModuleEnabled("inventory")`, not `"preparation"` — this is the one concrete, fixable defect, not the module's physical location.
- `FryerOilLog`'s RBAC resource (`"FryerOilLogs"`) is registered separately from the other five Preparation resources in `RESOURCE_ENUM` (non-contiguous in the source list) — structural evidence it was designed/added as a standalone concept, even though it already lives in the `preparation/` folder.

**Recommendation**: do not physically move or merge the `fryer-oil-log` module (it already lives in the correct folder, `modules/preparation/`). Fix the feature-toggle key to `"preparation"` (matching every sibling module) and fold its policy-level settings (discard-reason defaults, quality-check cadence) into the unified `PreparationSettings` document from §Fifth Objective, while keeping `FryerOilLog` itself as its own collection/aggregate (an oil log is a real, independent-lifecycle document, not a sub-object of a ticket or section). This is "conceptually inside Preparation, mechanically its own aggregate" — the same relationship `PreparationReturn` already correctly has to `SalesReturn`.

---

## Seventh Objective — "Preparation" vs. "Kitchen" Hardcoding Review

**The architecture correctly avoids hardcoding "Kitchen" — verified, not assumed.** `PreparationSectionConfig.stationType`'s enum is deliberately broad (`bakery`, `coffeeBar`, `juiceBar`, `cocktailBar`, `seafood`, `packaging`, `centralKitchen`, `cloudKitchen`, plus a catch-all `other`), and its own code comment is explicit: *"station-type classification, additive, not a replacement for the free-text name/code above — a brand still names its own departments however it wants."* No literal string `"Kitchen"` was found hardcoded into any business-logic branch anywhere in this domain (grepped across every service file) — every reference to a preparation area goes through the `preparationSection`/`station` foreign key. `getKitchenQueue()`/`getKitchenDashboard()`'s *method names* say "Kitchen," but their actual grouping key is `preparationSection` — the naming is a labeling choice for the KDS-facing endpoint (a restaurant industry term everyone recognizes), not a hardcoded assumption about what kind of section exists. This is a correctly-designed abstraction; no change recommended here.

---

## Eighth Objective — Integration Verification

| Integration | Status | Evidence |
|---|---|---|
| Orders | ✅ Real | `createTicketsFromOrder()`, one-directional reference, matches `PreparationReturn`/`SalesReturn`'s own shape |
| POS | 🟡 Indirect | No direct POS-specific endpoint; Kitchen Queue/Dashboard are the POS-facing read surface |
| Inventory | ✅ Real | `recipeConsumptionService`, `warehouseDocumentService` (both non-transactional — §6/§Financial Review) |
| Production | ✅ Real | Shared `PreparationSectionConfig` reference (`ProductionRecord.preparationSection`) |
| Recipes | ✅ Real | `recipeConsumptionService.consumeForTicket()` |
| Warehouse | ✅ Real | `WarehouseDocument` postings from `FryerOilLog` |
| Accounting | 🟡 Partial | Oil/waste postings real via existing engines; `PreparationReturn` posts nothing |
| Cost Control | 🟡 Partial | Oil cost resolved via Cost Engine; no equivalent for ticket-level waste/return |
| CRM | ❌ None | No integration, and no evidence one is needed at this layer |
| Notifications | ❌ None | No notification dispatch found anywhere in this domain |
| Kitchen Display | ✅ Real | (§ above) |
| Printing | ❌ None | No print-ticket mechanism found — a real, common KDS-adjacent gap, not previously documented anywhere in this engagement |
| Delivery | 🟡 Partial | `deliveryPolicy` field only, no provider integration (matches the platform-wide absence already confirmed in the Refund review) |
| Returns | 🟡 Partial | `PreparationReturn` real as a schema, inert as a workflow |
| Refunds | 🟡 Partial | Cross-context reference exists (`PreparationReturn.returnInvoice`), orchestration not built (this is exactly the gap the Refund ADR's Phase 2 design already identified and scoped) |
| Waste | 🟡 Partial | `WasteRecord` itself is solid; nothing in Preparation calls it automatically |
| Staff | ✅ Real | `Employee` references throughout (`responsibleEmployee`, `waiter`, `installedBy`, etc.) |
| Permissions | ✅ Real | Full RBAC chain on every router |
| Approvals | ❌ Missing | `decisionBy` fields exist on both settings models but are never read/enforced anywhere (§5) |

---

## Ninth Objective — Duplication, Dead Code, Missing Abstractions

**Duplicated settings**: three surfaces for kitchen configuration (§5), zero of them wired.
**Duplicated workflows**: three separate state-machine implementations for one kind of guard (§8).
**Duplicated business rules**: none found beyond the above two — most business logic in this domain is not duplicated, it's simply not built yet (an important distinction: this domain has more *gaps* than *redundancy*, with the settings/state-machine fragmentation being the exception).
**Dead models**: none of the six modules is entirely dead — even the CRUD shells (`preparation-section`, both settings models) are legitimately-shaped, just unwired.
**Unused fields**: `PreparationSectionConfig.autoAssignChef`/`.requireConfirmationBeforeSend`/`.allowRejectTickets`/`.allowPartialDelivery`/`.isDeliveryRelevant` (5 confirmed dead, verified by grep — supersedes this engagement's earlier, vaguer "4 dead fields" note from `PREPARATION_INVENTORY_ORDER_FLOW_AUDIT.md`, since code now wins over that prior count); `PreparationTicketSettings.ticketSequence` (confirmed dead by the codebase's own comment).
**Missing abstractions**: a shared `resolveForBranch`-style settings-resolution method (exists elsewhere on this platform, absent here); a shared state-machine utility usage (exists, underused here).
**Future scaling issues**: `PreparationTicket.items[].quantity: immutable: true` combined with no `Rework`/`Transfer` concept means a mid-preparation correction (wrong quantity caught by the chef) has no first-class path today — not urgent, but worth naming before volume grows.

---

## Problems Found, Severity, Root Causes

| # | Problem | Severity | Root Cause |
|---|---|---|---|
| 1 | `FryerOilLog` gated on `"inventory"` (defaults **off**) while every sibling is gated on `"preparation"` (defaults **on**) | **High** — real, live, silently-blocks-a-feature-by-default bug | Module built/reviewed independently of its siblings, feature key copied from its inventory-adjacent postings rather than its actual folder/domain |
| 2 | Three settings surfaces, zero wired | **High** — configuration is entirely cosmetic today | Settings scaffolded ahead of the business logic that would read them, never revisited once tickets/returns were built |
| 3 | `PreparationReturn.decision` drives no inventory/accounting action | **High** — the domain's most-designed, least-executed piece | Same "schema-first, service built later, never came back" pattern as (2) |
| 4 | Three state-machine implementations | **Medium** — works today, real maintenance/consistency risk | No enforced convention requiring `createTransitionGuard()` reuse; discovered ad hoc per module |
| 5 | Non-transactional recipe-consumption/oil-install/waste postings | **Medium** — same class of risk this engagement already fixed for Payment | Predates the MongoDB-transactions platform standard (2026-07-20), not yet retrofitted here |
| 6 | 5 dead `PreparationSectionConfig` fields | **Low** — inert, not actively misleading if nobody edits them | Same schema-first pattern as (2)/(3) |
| 7 | No rush/priority, fire/hold, rework, transfer, printing, or general food-safety capability | **Low-Medium** — real product gaps, not architecture defects | Never built; correctly out of scope for an architecture *review* to invent |

---

## Recommended Architecture

Keep six modules, routed and tested independently (no folder merge). Add exactly one new cross-cutting piece and retrofit three existing ones:

1. **New**: `PreparationSettings` (§Fifth Objective's structure) — one document per brand/branch, one `resolveForBranch()` method, replacing `PreparationTicketSettings`/`PreparationReturnSettings` as the read path (their collections can remain for now as an implementation detail or be formally deprecated — an implementation-phase decision, not this review's to make).
2. **Fix**: `fryer-oil-log.router.js`'s `checkModuleEnabled` key, `"inventory"` → `"preparation"`.
3. **Retrofit**: `preparation-ticket.service.js`/`preparation-return.service.js` to use `createTransitionGuard()` instead of their own inline transition maps.
4. **Wire**: `PreparationReturn`'s finalization to actually post `ReturnIssuance`/`WasteRecord` per §Sixth Objective of the earlier Refund review — this review independently reconfirms that recommendation from direct reading of `preparation-return.service.js`, not by reference alone.
5. **Defer, correctly**: rush/priority, fire/hold, rework, transfer, printing, general food-safety logging, productivity/bottleneck analytics — real gaps, but net-new product scope requiring their own business-input-gated design pass, not bundled into this configuration/consistency cleanup.

---

## Proposed Folder Structure

No change from today's structure — it is already correct at the folder level:
```
modules/preparation/
  preparation-section/
  preparation-ticket/
  preparation-return/
  preparation-settings/        <- becomes ONE model+service+controller+router+validation set
                                   (PreparationSettings), not two
  fryer-oil-log/
```

---

## Proposed Model Structure

No new aggregates. `PreparationSectionConfig` sheds its 5 dead policy fields (moved into `PreparationSettings.ticket`, keeping only genuinely per-station operational facts: `averagePreparationTime`, `maxParallelTickets`, `stationType`, `parentDepartment`, `warehouse`, staffing/equipment, working hours). `PreparationTicketSettings`/`PreparationReturnSettings` collapse into `PreparationSettings`'s sub-objects. `PreparationReturn` and `FryerOilLog` schemas are unchanged — their defect is orchestration/wiring, not shape.

---

## Proposed Settings Structure

Per §Fifth Objective's sketch — one `PreparationSettings` document, sub-objects for `ticket`/`queue`/`display`/`waste`/`oil`/`safety`/`transfer`/`approval`/`sla`, mirroring `AccountingSettings`'s already-proven one-document-many-sub-objects shape.

---

## Proposed Lifecycle

Unchanged for Ticket/Oil (both already correct); `PreparationReturn`'s lifecycle gains one new terminal action: `FINALIZED` → (if any line's `decision !== RESELLABLE`) posts `ReturnIssuance`/`WasteRecord` per line, exactly mirroring `WasteRecordService.approve()`'s own real, working posting pattern.

---

## Proposed Integration Map

No new external integrations recommended by this review — every ❌/🟡 in §Eighth Objective's table is either correctly out of current scope (CRM, Notifications, Printing, Delivery-provider) or already scoped into the adjacent Refund ADR (Returns/Refunds/Waste wiring).

---

## Migration Strategy

Additive-only at every step: `PreparationSettings` is a new collection (old settings collections can be read once, migrated forward, then deprecated — no data loss risk since both old collections are confirmed unread today, meaning there is no live configuration to preserve, only whatever test/seed data exists). The `checkModuleEnabled` key fix is a one-line, zero-schema-impact change. The `TransitionGuard` retrofit is a drop-in replacement of already-equivalent logic (same states, same transitions), verifiable by a before/after behavioral test showing zero change in accepted/rejected transitions.

---

## Risks

- Collapsing three settings documents into one is more implementation work than it looks, given each currently-dead settings model would need a real consumer built at the same time to be worth anything — this review recommends the consolidation, but implementation should sequence it alongside (not before) wiring `PreparationReturn`'s execution, or the new unified settings document risks becoming a fourth dormant surface.
- The `checkModuleEnabled("inventory")` → `"preparation"` fix could change access for any brand that currently has `inventory` disabled but `preparation` enabled (or vice versa) — low risk given `FryerOilLog` is presumably rarely used by a brand without inventory tracking anyway, but worth a explicit confirmation before flipping in production.

---

## Final Recommendation

**Architecture review complete. No design work has begun.** The Preparation domain is one bounded context, correctly avoids hardcoding "Kitchen," and contains two genuinely strong pieces (Kitchen Queue/Dashboard, Fryer Oil Log lifecycle) alongside three concrete, fixable defects (inconsistent feature-toggle key, triple-dormant settings, triple state-machine duplication) and one significant unbuilt capability (`PreparationReturn` execution, already scoped by the adjacent Refund ADR). **Awaiting explicit approval before entering the Design phase**, per this review's own instruction.
