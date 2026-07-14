# Menu Cost Control Architecture

**Status: design only, no code written.** Deep-dive companion to
`MENU_PRODUCTION_PLATFORM_REDESIGN.md` §8 (which already establishes the core principle: every
cost concept is one root mechanism — `Product.costFields`, fed by the existing Inventory Cost
Engine — with report-time arithmetic, not eleven separate subsystems). This document adds the
concepts not yet covered there (Standard Cost, Target Cost, alerts, automatic refresh mechanics)
and specifies the refresh/alert infrastructure in implementation-ready detail.

**Non-negotiable constraint carried from every prior document in this engagement**: no new costing
engine. Everything below reads `Inventory.avgUnitCost` (Tier 1, real, maintained by the existing
`InventoryCostEngine`) through `Recipe`'s ingredient list, exactly as already designed.

---

## 1. Cost Concepts — Complete Definitions

| Concept | Definition | Source | New vs. already-designed |
|---|---|---|---|
| **Theoretical Cost** | What the recipe *should* cost, computed from current `Inventory.avgUnitCost` × `Recipe.ingredients[].amount` | `Recipe`, live | Already designed (redesign doc §1.2, "estimatedCost") |
| **Actual Cost** | What a specific batch/period *actually* cost, from real consumption | `ProductionRecord`'s cost breakdown (companion redesign §5.1) for manufactured items; for à la minute (Tier 1) items, actual cost only exists once Tier-1 execution is wired into Order (redesign doc §7.4's named, deferred Phase 3 item) — **honestly, Actual Cost for Tier-1 sold items is not fully computable until that wiring exists**, disclosed here rather than implied as already complete | Partially new — the Tier-2 half is designed; the Tier-1 half is blocked on a named, deferred dependency |
| **Standard Cost** | A deliberately-set target cost basis, independent of current market price — genuinely new to Menu (StockItem already has this concept via `costMethod: "StandardCost"`, companion redesign; Menu needs its own analogue for *recipes*, since a recipe's standard cost isn't simply the sum of its ingredients' standard costs if the brand wants to set a *recipe-level* target independent of ingredient-level standards) | New field: `Recipe.standardCost` (manually set, revised deliberately — same philosophy as `StockItem.standardCost`: "a standard-cost revision is itself a deliberate accounting event, never inferred") | **New** |
| **Target Cost** | The cost a recipe *should not exceed* to hit a target food-cost % at the current menu price — a derived number (`targetCost = Product.price × targetFoodCostPercent`), not independently stored | New: `MenuSettings.targetFoodCostPercent` (brand-configurable, e.g. 28%) — a **policy**, not a hardcoded constant, per this platform's consistent settings-driven convention | **New**, but trivial — one settings field, one formula |
| **Food Cost %** | `theoreticalCost / price` | Report-time ratio | Already implied, made explicit here |
| **Contribution Margin** | `price − theoreticalCost` | Report-time | Already designed (redesign doc §9) |
| **Gross Profit** | Same as Contribution Margin at the single-item level; at the period level, `Σ(revenue) − Σ(COGS)` | Report-time, period aggregation is new (§3 below) | Mostly already designed |
| **Actual Consumption** | What `StockLedger` rows show was actually deducted for a given period/item (already-real data, Inventory domain, unmodified) | `StockLedger`, existing | Not new — a query over existing data |
| **Variance** (Yield/Waste/Production/Price) | Yield Variance and Production cost/variance: companion redesign §5.2/§5.3. Waste Variance: `actual waste recorded (new field on ProductionRecord/Recipe consumption) − Recipe.ingredients[].wastePercentage`'s theoretical allowance. Price Variance: Purchasing's already-designed-but-not-yet-GL-posted Purchase Price Variance (Supply Chain), consumed not recomputed by Menu | Mixed — mostly already designed elsewhere, Waste Variance's "actual" side is new | See §2 below |

---

## 2. Waste Variance (the one genuinely new variance concept)

`Recipe.ingredients[].wastePercentage` (exists, currently unused by any calculation — confirmed in
the audit) is the *theoretical* allowance. **Actual** waste requires a real recorded event — new,
small addition: when a `ProductionOrder` completes (companion redesign) or when a manual
Wastage/Damage `WarehouseDocument` is posted against an ingredient tied to a Recipe (Inventory
domain, already exists as a transaction type), the Waste Variance report (§3) computes:
```
theoreticalWasteQty = Recipe.ingredients[].amount × wastePercentage × unitsProduced
actualWasteQty      = Σ(Wastage-type StockLedger rows for that stockItem, that period)
                       [attribution to a specific Recipe is approximate at the ingredient level —
                        a StockItem's wastage isn't always traceable to one specific recipe if it's
                        shared across many; this is disclosed as an honest limitation, not solved
                        by fabricating a per-recipe wastage-attribution mechanism that doesn't
                        exist and isn't cheap to build correctly]
wasteVariance = actualWasteQty − theoreticalWasteQty
```

---

## 3. Cost Refresh Mechanism (Automatic Cost Recalculation — Specified in Full)

The redesign doc named a "shared cost-cache-refresh utility" without full detail; this section
specifies it, since three other documents (`MENU_PLATFORM_FINAL_ARCHITECTURE.md`'s Availability,
`MENU_ENGINEERING_ARCHITECTURE.md`) depend on it being real and precise, not hand-waved.

**Triggers** (a refresh recomputes `Product.costFields`/`Recipe.estimatedCost` for the affected
Recipe(s) — never a blanket recompute-everything sweep unless explicitly requested):
1. **Event-driven, immediate**: `Recipe` created/updated/approved (redesign doc §7) →
   recompute that Recipe's own cost immediately, synchronously, as part of the save (cheap — one
   Recipe's ingredient list, not a graph walk).
2. **Event-driven, cascading**: a `StockItem`'s `avgUnitCost` changes materially (subscribe to a
   **new** `DomainEvent.INVENTORY_COST_CHANGED`, emitted from `InventoryCostEngine`/
   `Inventory.applyInbound`/`applyOutbound` — a small, additive change to the Inventory domain,
   emitting only when the *percentage* change exceeds a configurable threshold, e.g. 2%, to avoid
   emitting on every single FIFO-layer-consumption's tiny cost fluctuation) → recompute every
   Recipe that references that `StockItem`, and — for nested BOMs — cascade one level (a
   `ProductionRecipe`'s cost change re-triggers the same event for the semi-finished `StockItem`
   it produces once its own posting completes, naturally propagating up the chain via the same
   event, no special "cascade N levels" logic needed beyond the chain of events already occurring
   as production runs sequence, per the companion redesign's §5.4 reasoning).
3. **Scheduled, batch**: a nightly job recomputes every Recipe's cost regardless of whether an
   event fired — a safety net catching any missed/coalesced events, and the mechanism that keeps
   `costCalculatedAt` timestamps honest for audit purposes even when nothing changed.

**Why event-driven-with-a-nightly-safety-net, not pure polling**: matches this platform's
established Domain Event philosophy (no module should poll another for changes it could instead be
told about) while acknowledging event delivery in an in-process dispatcher (companion redesign §6
already disclosed: "no built-in retry") isn't bulletproof — the nightly job is the honest
acknowledgment of that limitation, not a redundant belt-and-suspenders overbuild.

---

## 4. Cost Alerts & Margin Alerts

New, small, policy-driven capability — not a new alerting *platform* (confirmed absent, per
`MENU_PLATFORM_FINAL_ARCHITECTURE.md` §7's Notification finding — no delivery mechanism exists to
alert *through*). This section designs the **detection and event-emission** side only; actual
delivery (push/SMS/email/in-app) is explicitly out of scope, deferred to whenever a real
Notification-delivery service exists, matching this engagement's consistent practice of building
the producer side of an integration seam before the consumer exists, not fabricating the consumer.

- New settings: `MenuSettings.costAlertThresholdPercent` (e.g. alert if theoretical cost rises
  >10% since last approved Recipe version), `MenuSettings.marginAlertFloorPercent` (e.g. alert if
  contribution margin drops below 20%).
- New `DomainEvent`s: `RECIPE_COST_ALERT` (theoretical cost breach), `RECIPE_MARGIN_ALERT` (margin
  floor breach) — emitted by the cost-refresh mechanism (§3) whenever a recomputation crosses a
  configured threshold, added to the catalog in the same change that ships their first publisher,
  per the established convention.
- **No persisted "Alert" model** — these are transient Domain Events; if a durable alert
  inbox/history is wanted later, that's exactly the kind of thing a real Notification-delivery
  service (once built) would persist on its own side, not something Menu should own.

---

## 5. Cost Reporting Surface (Read-Side, Reusing the Established Pattern)

A new `MenuCostReportService` (read-side only, queries models directly — same pattern as
`VendorLedgerService` from Supply Chain, `MenuEngineeringService` per the companion document):
- `getRecipeCostBreakdown(recipeId)` — theoretical/standard/target cost, current food-cost %,
  ingredient-level cost contribution (which ingredient is the biggest cost driver — a real,
  actionable output for a cost controller).
- `getMarginReport({brand, branch, category?, dateRange})` — per-Product contribution
  margin/food-cost %, sortable/filterable — the direct input `MENU_ENGINEERING_ARCHITECTURE.md`'s
  matrix classification consumes.
- `getVarianceReport({brand, branch, dateRange})` — yield/waste/production/price variance,
  aggregated per §1/§2's definitions.
- `getCostAlertHistory({brand, branch, dateRange})` — a query over emitted `DomainEvent` payloads
  if the platform is later extended to persist event history for audit purposes (companion
  redesign already disclosed no Outbox/event-log exists — this report gracefully returns nothing
  until/unless that infrastructure exists, rather than assuming it).

---

## 6. Accounting Impact (Explicit, Per This Prompt's "Every Feature Must Have a Clear Accounting
Impact" Rule)

| Feature | Accounting impact |
|---|---|
| Standard Cost / Target Cost | Reporting inputs only — no GL posting. A recipe's Standard Cost, once used for costing manufactured output (companion redesign's `StockItem.costMethod: "StandardCost"` path), DOES affect what posts to Inventory/COGM — but that's the companion redesign's existing accounting design, not new here |
| Waste Variance | The *underlying* Wastage `WarehouseDocument`/`StockLedger` posting already has a real accounting effect (Inventory Adjustment, existing) — the *variance calculation* itself is report-only, doesn't post anything additional |
| Cost/Margin Alerts | Zero accounting impact — pure detection/notification-seam, explicitly stated to avoid any ambiguity |
| Cost Refresh | Zero direct accounting impact — it updates a cache (`costFields`) that *informs* pricing/reporting decisions a human then acts on; the cache itself never posts a journal entry |

This table exists specifically to prevent scope creep: cost *visibility* (this document's whole
subject) is deliberately kept separate from cost *posting* (the companion redesign's Production
accounting integration, and Purchasing's already-built posting engines) — conflating them would
risk Menu accidentally becoming a second, competing source of GL postings, violating SSOT.
