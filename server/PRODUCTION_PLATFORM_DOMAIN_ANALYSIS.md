# Production Platform — Domain-Driven Analysis (Menu / Recipe / Production / Kitchen / Preparation)

**Status: analysis only. No code changes in this pass.** Per the governing instruction: understand
the full lifecycle first, challenge every existing model/workflow/API against real evidence, and
finalize the redesign before any implementation begins. Follows `ERP_DEVELOPMENT_STANDARD.md`'s
method (name every gap, cite every claim against a real file, never trust a document's claim without
checking current code) — applied here to the Production Platform, not the Financial Domain.

**Method**: this document is built on two fresh, independent research passes performed for this
analysis — (1) a full read of the 14 prior Menu/Kitchen/Production architecture documents already in
this repo, and (2) a direct, current, code-grounded inventory of every model/service/router file in
`modules/menu/`, `modules/production/`, `modules/preparation/`, and the recipe/consumption-adjacent
parts of `modules/inventory/`. Every claim below is checked against (2); where (1) and (2) disagree,
(2) wins, and the disagreement is named explicitly — this happened twice, both important:

1. **The most recent prior audit (`ULTRA_ARCHITECTURE_REVIEW_2026-07-15.md`) claims a STOP-SHIP
   server-boot failure** from a broken `git mv` affecting `order.controller.js`/
   `preparation-ticket.service.js`/`recipe-consumption.service.js`. **This is stale.** This session
   alone ran the full router import tree (`router/v1/index.router.js`, which transitively imports
   every file named above) as a boot-check dozens of times while building the Financial Domain, and
   ran the full Jest suite to completion **74/74 suites green**, including
   `extras-recipe-consumption.test.ts`, `order-kitchen-ticket-engine.test.ts`,
   `kitchen-queue-dashboard.test.ts`, and `preparation-ticket-transition-guard.test.ts` — all passing.
   The boot failure has been fixed since 2026-07-15. Do not carry this claim forward.
2. **The same review claims "Sales COGS never posts to the GL."** This is also stale — direct
   code inspection confirms `modules/inventory/recipe-consumption/recipe-consumption.service.js`
   calls `journalEntryService.postFromSource({sourceType: "SALES_COGS", ...})` today, wired into
   `OrderService.transition()`. This gap has been closed since the review was written.

Every other finding from the prior 14 documents cited below was independently re-verified against
current code before being restated here — none is repeated on faith alone.

---

## 1. Business Analysis

This platform must serve six distinct operating models on the same schema, not six different
products — confirmed as still architecturally sound framing from `MENU_PLATFORM_FINAL_ARCHITECTURE.md`
§1, re-validated against current code (nothing in that framing has been contradicted by what's
actually built):

| Business model | What it needs from this domain that a generic "menu + kitchen" schema doesn't automatically give it |
|---|---|
| **QSR / fast casual** | Fast combo/modifier selection at order time, tight kitchen SLA visibility (exists: `getKitchenQueue()`/`getKitchenDashboard()`), high ticket-per-station throughput. |
| **Casual / fine dining** | Table-linked tickets (exists via `Order`), course sequencing (`sequenceGroup` — named in `KITCHEN_EXECUTION_ARCHITECTURE.md`, not confirmed built), multi-station routing per dish (exists: one ticket per distinct `preparationSection`). |
| **Bakery / pastry** | Batch production with real yield tracking (exists: `ProductionOrder`/`ProductionRecipe`/`ProductionRecord`), waste/quality logging (exists: `qualityChecks[]` pattern proven on `FryerOilLog`, not yet reused elsewhere). |
| **Central kitchen / commissary** | Cross-branch/cross-warehouse output routing (`ProductionRecipe.outputDestination` enum includes `CentralKitchen`/`SpecificBranch`/`AnotherBranch` — **schema anticipates this, routing logic does not fully resolve it today**, see §15). |
| **Cloud kitchen** | Multiple virtual brands sharing one physical kitchen (`PreparationSection` is branch-scoped; a cloud kitchen serving multiple `Brand`s from one physical location is **not modeled** — every tenant boundary in this platform is `brand` first, `branch` second; a shared physical kitchen across brands is a genuinely new concept, not a redesign of an existing one). |
| **Meal prep / healthy food / catering** | Batch-produced, pre-portioned output with nutrition data and a delivery/pickup date distinct from the production date. **Nutrition data does not exist anywhere in this schema** (confirmed — no field on `Product`, `Recipe`, or `ProductionRecipe` carries calories/macros/allergens). This is a real, named gap, not a redesign of something broken. |

**Conclusion**: five of six business models are served by extending what exists; the cloud-kitchen
shared-physical-location case and meal-prep nutrition data are genuinely new concepts requiring new
fields/relationships, not fixes to existing ones — flagged for §17.

---

## 2. Domain Analysis (DDD framing)

The user's 16 named "modules" (Menu, Recipe, Recipe Versioning, Production, Preparation, Kitchen,
Combo, Modifiers, Inventory Consumption, Menu Costing, Production Planning, Meal Prep, Healthy Food,
Batch Production, Manufacturing, Kitchen Execution) are **not 16 bounded contexts** — several are the
same concept named twice, and several are cross-cutting concerns of the ones that remain. This is the
first real "challenge the assumption" finding this analysis makes:

| Bounded Context (real) | Absorbs these named "modules" | Core or Supporting? |
|---|---|---|
| **Menu Catalog** | Menu, Combo, Modifiers | Supporting — the customer-facing selection surface |
| **Recipe & Costing** | Recipe, Recipe Versioning, Menu Costing | **Core** — this is the domain's actual differentiator; everything else is plumbing around it |
| **Manufacturing / Batch Production** | Production, Production Planning, Batch Production, Manufacturing | **Core** — the second differentiator, already the most mature part of the codebase |
| **Kitchen Execution** | Kitchen, Kitchen Execution, Preparation | Supporting — routes/tracks work, doesn't own cost or recipe truth |
| **Inventory Consumption** | Inventory Consumption | **Generic subdomain** — already solved, correctly, by the certified Financial Domain's posting infrastructure (`WarehouseDocument`/`StockLedger`/`InventoryCostEngine`); this bounded context does not need new infrastructure, only correct callers |
| Meal Prep / Healthy Food | (not a separate context) | These are **business-model configurations** of Menu Catalog + Recipe & Costing (a meal-prep item is a `Product` with a `Recipe`, batch-produced via `ProductionOrder`, tagged with nutrition data that doesn't exist yet — §1) — not a fifth context needing its own models |

**Why this matters for the redesign**: treating "Combo" and "Modifiers" as sub-concerns of Menu
Catalog (not their own contexts) is exactly what the current code already does structurally
(`Product.comboGroups[]`/`Product.modifierGroups[]`), and that structural choice is **correct** — the
audit's own reasoning (`MENU_PLATFORM_FINAL_ARCHITECTURE.md` §3: "one selection mechanism, not eleven
parallel schemas") holds up under this DDD re-examination too. What's missing is not a new bounded
context, it's that Menu Catalog and Recipe & Costing are currently **not actually connected** — a
`Product` has no cost, a `Recipe` (Tier 1) has no cost, and the domain's own stated core
differentiator (Recipe & Costing) has nothing feeding it from the Menu Catalog side. §12 is the
central recommendation of this whole document.

---

## 3. Workflow Analysis

Two genuinely distinct end-to-end workflows exist today, correctly kept separate (per
`PRODUCTION_MANUFACTURING_DOMAIN_REDESIGN.md`'s "two-tier Recipe model is permanent" — re-confirmed
correct in this analysis, see §7):

**Workflow A — À la minute (Tier 1, sale-triggered)**:
```
Recipe (Product -> StockItem) defined
  -> Product published to a MenuCategory, priced
  -> Order created, item selected (+ combo/modifier selections)
  -> Order.transition(OPEN -> IN_PROGRESS)
       -> createTicketsFromOrder() [direct call, not an event] -> one PreparationTicket per distinct preparationSection
       -> consumeForOrder() [direct call, not an event] -> Recipe lookup -> WarehouseDocument OUT -> SALES_COGS journal entry
  -> Kitchen prepares against ticket(s), status Pending -> Preparing -> Ready
  -> Ticket delivery, order fulfilled
```

**Workflow B — Batch (Tier 2, plan-triggered)**:
```
ProductionRecipe (StockItem -> StockItem BOM) defined, versioned
  -> ProductionOrder created against an Active ProductionRecipe (Draft)
  -> Submitted -> Approved [emits DomainEvent.PRODUCTION_ORDER_APPROVED, no subscriber today]
  -> complete(): WarehouseDocument OUT (consumption) -> WarehouseDocument IN (yield) -> cost rollup -> ProductionRecord created -> journal entry (WIP/COGM)
  -> Completed -> Closed
```

**What both workflows are missing, named explicitly**:
- Neither workflow has a **planning** step that looks forward ("what do we need to produce today given tomorrow's expected orders") — `ProductionOrder` is always manually initiated. "Production Planning" (one of the 16 named modules) does not exist as a workflow today, only as a document type.
- Workflow A has no **replenishment link** back to Workflow B — a Tier-1 item selling out at the warehouse-direct consumption strategy does not trigger a `ProductionOrder`. This is the natural connective workflow a "Production Planning" bounded context would own (§17).

---

## 4. Event Flow

The platform's `domainEvents.js` pub/sub is real and tested, with these Production-Platform-relevant
events already in the catalog: `PRODUCTION_ORDER_APPROVED`, `PRODUCTION_ORDER_COMPLETED`,
`ORDER_CONFIRMED`, `ORDER_ITEM_CANCELLED`. **Confirmed: zero subscribers exist for any of the four**
(only `INVENTORY_BELOW_REORDER_POINT` has a live subscriber, in the Supply Chain domain). Ticket
creation and recipe consumption are **direct synchronous calls** from `OrderService.transition()`,
not event-driven — and per `ERP_DEVELOPMENT_STANDARD.md` §8's own stated rule, that was the *correct*
choice, because both need their result known within the same request/response cycle.

What genuinely belongs on the event bus (fire-and-forget, no caller needs the result synchronously):

| Event (proposed, additive to `DomainEvent`) | Publisher | Real subscriber use case |
|---|---|---|
| `RECIPE_COST_CHANGED` | `Recipe`/`ProductionRecipe` cost refresh | Menu Engineering / Cost Alerts (§11) — invalidate a cached margin figure |
| `TICKET_READY` | `preparation-ticket.service.js` on `PREPARING -> READY` | A future notification consumer (waiter alert), and the still-missing real-time KDS push (§9) |
| `PRODUCTION_ORDER_APPROVED` (already exists) | — | **Should** feed a Production Planning dashboard once one exists — currently has zero real consumer despite being emitted |

**Do not** put ticket creation, recipe consumption, or any GL posting on the event bus — those need
synchronous failure handling (a failed recipe lookup must block order confirmation, not silently log
and continue). This is consistent with, not a deviation from, the Financial Domain's own established
rule that a real-world operational fact is never deferred to best-effort async handling.

---

## 5. State Machines

Every entity with a lifecycle status, its current transition table, and a verdict:

| Entity | Current transitions | Guard mechanism | Verdict |
|---|---|---|---|
| `ProductionOrder.orderStatus` | `Draft→Submitted→Approved→Completed→Closed`, `+Rejected/Cancelled` | Real `TransitionGuard`, atomic-claim `findOneAndUpdate` | **Keep** — this is the reference implementation for this whole domain |
| `PreparationTicket.preparationStatus` / `.deliveryStatus` | `PENDING/PREPARING/READY/CANCELLED/REJECTED` + `WAITING/READY_FOR_HANDOVER/HANDED_OVER` | Real guard maps, atomic-claim overridden `update()` | **Keep** |
| `FryerOilLog.status` | `Draft→InUse→Discarded`, `+Cancelled` | Real `TransitionGuard` | **Keep** |
| `ManualConsumption.status` | `Draft→Submitted→Approved→Rejected/Cancelled` | Real `TransitionGuard` | **Keep** |
| `PreparationReturn.status` | `PENDING/IN_REVIEW/FINALIZED/CANCELLED` | Real guard map | **Keep** |
| `ProductionRecipe` (no status field — uses `isActive` + version supersession) | Atomic "deactivate old, activate new" on create | Real, proven, service-layer (not a schema hook — deliberately, per its own comment) | **Keep** — this is the template §12 reuses for Recipe versioning |
| **`Consumption.status`** (`Open/Closed/Posted`) | **Schema-only. Zero `TransitionGuard`. Zero service logic beyond generic CRUD** (confirmed by the module's own code comment — the most explicit self-documented gap found anywhere in this domain) | **None** | **Redesign — see §5a below** |
| **`ProductReview.status`** (`PENDING/APPROVED/REJECTED`) | Schema exists; **confirmed self-approval security gap** in prior audit, **zero moderation workflow in current code** | None | **Redesign — needs a real `TransitionGuard` + a moderator-role check before `APPROVED` is reachable** |
| **`Recipe` (Tier 1, menu)** | **No status field at all beyond a boolean `isActive`; no versioning mechanism** despite "Recipe Versioning" being explicitly in scope for this analysis, and despite `Recipe`'s own unique index (`{product, brand, branch}`, unrestricted) **structurally preventing two versions of the same product's recipe from ever coexisting** | None | **Redesign — see §5b below, the single most consequential state-machine finding in this analysis** |

### 5a. `Consumption` — redesign recommendation

Three different "consumption" concepts exist in this codebase today, and their naming collision is
itself a real risk for a future engineer (confirmed by direct code reading, not assumption):

1. `RecipeConsumption` (no model, service-only) — automatic, order-driven, Tier-1. **Real, working.**
2. `ManualConsumption` — day-to-day operational usage (gas, packaging, cleaning). **Real, working.**
3. `Consumption` — shift-scoped opening/closing stock + theoretical-vs-actual variance. **Schema
   only, self-documented as having "no business logic," unmounted from meaningful use.**

`PREPARATION_KITCHEN_OPERATIONS_STATUS.md` Addendum 8 independently names **"Shift Handover"** as a
still-open gap. These are the same feature described twice, from two different documents, at two
different times, without either one noticing the overlap. **Recommendation**: `Consumption` should be
completed as the Kitchen Shift Handover feature it already structurally resembles (`openingStock[]`/
`receivedDuringShift[]`/`theoreticalConsumption[]`/`actualClosingStock[]`/`variance[]` map directly
onto a shift-handover reconciliation), not built as a third, separate thing. This closes two
previously-separate named gaps with one piece of work. Give it the same treatment as every other
transactional document in this domain: a real `TransitionGuard` (`Open→Closed→Posted`), an
atomic-claim `close()`/`post()` service method, and — since `variance[]` already carries a
`reason: waste/loss/overage` field — a best-effort, non-blocking GL posting on `post()` for the
variance amount, following the exact `ManualConsumption._postAccounting()` pattern.

### 5b. `Recipe` (Tier 1) — redesign recommendation

`ProductionRecipe` already proves the right pattern for exactly this problem: `version: Number`,
`isActive: Boolean`, a unique index scoped to `{brand, stockItem}` **filtered to `isActive: true`**
(a partial index — the actual mechanism that lets multiple historical versions coexist while only one
is ever "current"), and atomic supersession in the service layer, not a schema hook. `Recipe` (Tier 1)
needs the identical treatment: replace its current unrestricted unique index
(`{product, brand, branch}`) with a partial index filtered to `isActive: true`, add `version`, and
port `production-recipe.service.js#_assertNoCycle()`-style creation logic (a Tier-1 recipe has no
BOM-of-BOMs cycle risk since it only ever references `StockItem` leaves, so the cycle check itself
doesn't port over — but the atomic version-supersession logic does, directly). This single schema
change is also the prerequisite for §12's costing recommendation — a `Recipe.costFields` cache is
only trustworthy if "the current recipe for this product" is an unambiguous, correctly-versioned
concept, which it is not today.

---

## 6. Data Ownership Matrix

| Data | Who owns it today | Is that correct? |
|---|---|---|
| Product cost (Tier 1, à la minute) | **Nobody** — no field exists on `Product` or `Recipe` | **No — this is the domain's central gap, see §12** |
| Product cost (Tier 2, batch) | `ProductionRecipe.costFields` (cache) ← `Inventory.avgUnitCost` (SSOT, via `InventoryCostEngine`) | Yes — correct cache/SSOT split, proven pattern |
| Product availability by channel | `MenuCategory.availableChannels` (enum `dineIn/takeaway/delivery`) | **No — confirmed enum mismatch against `Order.orderType` (`DINE_IN/DELIVERY/TAKEAWAY/INTERNAL`)**, and availability is category-level only, not per-product; a per-product override does not exist |
| Combo/modifier final price | **The client** (`OrderItem.finalPrice` is client-supplied, not server-derived) | **No — real financial-integrity gap, see §7's `OrderItem` finding** |
| Combo selection validity | Enforced (`comboGroups[].minSelection/maxSelection` schema fields exist) | **Schema owns the rule, nothing enforces it** — confirmed no `validateComboSelections()`-equivalent exists anywhere (only `validateModifierSelections()` does, for modifiers) |
| Modifier selection validity | `modifier-selection-validator.js`, wired into order creation | Yes — real, tested, working |
| Preparation routing | `Product.preparationSection` (single ref) → expanded to one ticket per distinct section at ticket-creation time | Yes — correct, low-risk design (§7 revalidates) |
| Recipe consumption strategy | `InventorySettings.recipeConsumptionStrategy` | Yes — real, read, used |
| Nutrition/allergen data | **Nobody — does not exist** | Gap, not a redesign (§1, §17) |
| Kitchen SLA thresholds | `PreparationSection.maxParallelTickets`/`averagePreparationTime` | Yes — real, read by `getKitchenDashboard()` |

---

## 7. Aggregate Boundaries

**`Product` — verdict: keep the aggregate root, do not split.** The audit's finding that `Product`
carries "5 overlapping roles" (catalog item, size variant, combo definition, modifier-group host,
addon) reads as a smell but isn't one on inspection: every prior document that considered splitting
sizes into a separate `ProductVariantGroup` explicitly rejected it because a size needs independent
SKU/barcode/tax identity — a real business requirement, not a modeling convenience. This analysis
re-confirms that reasoning holds. **What does need to change is not the aggregate boundary, it's what
crosses it**: `finalPrice` currently crosses the `Order`/`Product` boundary in the wrong direction
(client asserts it instead of the server deriving it from `Product` + selections) — see the finding
below.

**`OrderItem.finalPrice` — verdict: redesign the computation, not the model.** This is a genuine
financial-integrity gap using the exact same reasoning this session already applied throughout the
Financial Domain (derived fields are never trusted from client input — `ERP_DEVELOPMENT_STANDARD.md`
§1). A combo/modifier-bearing `OrderItem`'s price must be **computed server-side** from
`Product.price` + selected modifier `priceDelta`s + combo component pricing rules, at order-creation
time, in the same place `validateModifierSelections()` already runs — not accepted from the client and
trusted. This is the single highest-value, most narrowly-scoped fix this analysis identifies (see
§17 prioritization).

**`Recipe` (Tier 1) / `ProductionRecipe` (Tier 2) — verdict: correctly separate aggregates, keep.**
Re-confirmed: they model genuinely different relationships (`Product→StockItem` vs
`StockItem→StockItem`), connected only through a shared `StockItem` reference, never a shared model.
No prior document's reasoning for this split is undermined by this analysis.

**`ProductionOrder` — verdict: correct aggregate root, keep as-is.** Owns its own recipe snapshot,
cost breakdown, and record reference; this is the reference-quality aggregate in the whole domain.

**`PreparationTicket` — verdict: correct aggregate root, keep as-is**, one per station per order, not
per item and not per whole order — re-confirmed correct given multi-station dishes are real
(fine-dining course sequencing, a burger needing both grill and fry stations).

---

## 8. Entity Relationships

```
Brand ──┬──→ MenuCategory ──→ Product ─────────────────────┐
        │        │                │                         │
        │        │      ┌─────────┼───────────┐             │
        │        │      │         │           │             │
        │        │  comboGroups modifierGroups extras[]      │
        │        │  (embedded)  (embedded)   (embedded)      │
        │        │                                            │
        │        └─(availableChannels enum — MISMATCHED       │
        │            against Order.orderType, see §6)         │
        │                                                      │
        ├──→ Recipe (Tier 1) ──(product)──────────────────────┘
        │        │
        │    ingredients[] ──(stockItem)──→ StockItem
        │        │                              │
        │   [NO version/cost field — §5b/§12]    │
        │                                        │
        ├──→ ProductionRecipe (Tier 2) ──(stockItem, ingredients[])──→ StockItem
        │        │  version + isActive (partial unique index — proven pattern)
        │        │  costFields{} ← Inventory.avgUnitCost (InventoryCostEngine)
        │        │
        │        └──→ ProductionOrder ──→ WarehouseDocument (OUT consumption, IN yield)
        │                  │                    │
        │                  │                    └──→ StockLedger
        │                  └──→ ProductionRecord (append-only log)
        │                  └──→ JournalEntry (WIP/COGM, best-effort)
        │
        ├──→ PreparationSection ("PreparationSectionConfig") ──(warehouse)──→ Warehouse
        │        │
        │        ├──→ PreparationTicket ──(order, orderItems[])──→ Order
        │        ├──→ PreparationReturn ──(returnInvoice)──→ SalesReturn
        │        ├──→ FryerOilLog ──(oilStockItem)──→ StockItem
        │        └──→ Consumption [shift-scoped — REDESIGN target §5a]
        │
        └──→ Order ──(items[])──→ OrderItem ──(comboSelections[], selectedModifiers[], extras[])
                 │                     │
                 │              [finalPrice: client-supplied — REDESIGN target §7]
                 │
                 └─ transition(OPEN→IN_PROGRESS) ─┬─→ createTicketsFromOrder() [direct call]
                                                    └─→ consumeForOrder() [direct call]
                                                          └─→ RecipeConsumption
                                                                └─→ WarehouseDocument OUT
                                                                └─→ JournalEntry (SALES_COGS — confirmed real, §Method)
```

---

## 9. Frontend Requirements

Per `ERP_DEVELOPMENT_STANDARD.md` §6's standard (every module must let React build a table, form,
dashboard, and report with zero backend changes):

| Frontend surface | What exists today | What's missing |
|---|---|---|
| Menu builder (table + form) | Full CRUD APIs for Product/MenuCategory/Recipe, all RBAC-guarded | A live cost/margin preview while editing — impossible until §12 closes (no cost field to preview) |
| Combo/Modifier builder | Schema + CRUD exist | No selection-rule validation surfaced anywhere (server doesn't enforce combo rules either — §6) so a broken combo config can be saved and silently misbehave at order time |
| Kitchen Display (KDS) | `getKitchenQueue()`/`getKitchenDashboard()` — real, computed, tested | **No real-time push** — confirmed Socket.IO scaffolding is disconnected/dead; today's KDS is poll-only. A genuine kitchen screen needs push, not poll, to be usable at real service speed |
| Production planning dashboard | `ProductionOrder` CRUD + `/:id/transition`/`/:id/complete` | No "what's due today" / "what's running low and needs a batch" view — this is the Production Planning gap named in §3 |
| Menu Engineering / cost reports | **Nothing** — confirmed zero Reporting/Analytics domain exists for this entire cluster | Entirely new (§11) |
| Recipe version history | **Nothing on Tier 1** (no versioning exists yet — §5b); `ProductionRecipe` has the data but no dedicated read API surfaces "version history for this stock item" as one call |

---

## 10. API Strategy

Confirmed consistent across all 14 verified routers in this domain (`authenticateToken → authorize →
checkModuleEnabled → validate → controller`, zero exceptions) — the Financial Domain's own standard
holds here too, without needing to be newly imposed. Two real, concrete API-layer gaps found by direct
inspection, not by document claim:

1. **`modules/inventory/consumption/consumption.router.js` is fully coded, fully RBAC-guarded, and
   is never mounted in `router/v1/index.router.js`.** This is the exact "router exists but was never
   mounted" defect class this codebase has hit and fixed multiple times elsewhere (Preparation
   routers, per `PLATFORM_FINAL_AUDIT.md` PA-07). Once `Consumption` is redesigned as Kitchen Shift
   Handover (§5a), this router needs to be rebuilt to match its new service methods and then mounted
   — mounting the current CRUD-only version first would just expose a router with no real business
   logic behind it.
2. **`fryer-oil-log.router.js` uses `checkModuleEnabled("inventory")`** while every sibling
   `preparation/*` router uses `checkModuleEnabled("preparation")`. Inconsistent, not necessarily
   wrong (a brand could plausibly want to gate oil-management separately from ticket/section
   management) — but undocumented as a deliberate choice anywhere, so it reads as an oversight.
   Recommend aligning to `"preparation"` unless a real product reason for the split surfaces during
   implementation review.

No dedicated lookup/export APIs exist anywhere in this domain — consistent with, not worse than, the
Financial Domain's own certified state (named there as a real but low-priority gap too).

---

## 11. Reporting Requirements

**Confirmed: zero Reporting/Analytics domain exists anywhere in this codebase for Menu/Kitchen/
Production** — restated consistently across every prior document (`MENU_ENGINEERING_ARCHITECTURE.md`,
the Ultra review, the Gap Analysis) and reconfirmed by the fresh code inventory (no report service
file exists under `modules/menu/`, `modules/production/`, or `modules/preparation/`). Required, in
priority order (matching §17's own prioritization logic — cheapest first, most valuable first):

1. **Recipe/Product cost & margin report** — blocked entirely on §12 (no cost field to report on).
2. **Production yield variance report** — `ProductionOrder.yieldVariance`/`yieldVariancePercent`
   already exist and are computed by `complete()`; **no report reads them today**, a pure
   composition-layer gap (matches the Financial Domain's `executive-dashboard.service.js` "compose,
   don't duplicate" pattern exactly — this would be a small, low-risk addition once prioritized).
3. **Kitchen SLA/throughput report** — `getKitchenDashboard()`'s computed fields
   (`elapsedMinutes`/`isOverdue`/`utilizationPercent`) are real-time only, never persisted/aggregated
   over a period; a historical SLA report needs either a periodic snapshot job (blocked on the
   platform's own confirmed-absent scheduler infrastructure) or a query directly against
   `PreparationTicket`'s timestamps for a date range (buildable today, no new infrastructure needed).
4. **Menu Engineering (BCG/ABC)** — fully designed already (`MENU_ENGINEERING_ARCHITECTURE.md`),
   blocked on §12 (needs cost) and on Sales domain read access (needs sales-mix data, which the Sales
   domain already has — this is a compose-don't-duplicate report, not new infrastructure).
5. **Waste/variance report** — `WasteRecord` already exists and posts to the GL (Financial Domain);
   this domain's contribution is joining it against `Recipe`/`ProductionRecipe` for a
   per-recipe-attribution view — named in `MENU_COST_CONTROL_ARCHITECTURE.md` as "an acknowledged
   approximation, not solved," still true.

---

## 12. Costing Strategy

**This is the single most consequential finding in this entire analysis, confirmed independently by
every prior document and by fresh code inspection**: `Product` and `Recipe` (Tier 1) have **no cost
field**. `ProductionRecipe` (Tier 2) does, and its mechanism is proven, tested, and correct. The
recommendation is not a new costing engine — it is **the exact same mechanism, extended**:

1. Add `Recipe.costFields{estimatedUnitCost, costCalculatedAt}` — a cache, never the source of truth,
   identical in shape and intent to `ProductionRecipe.costFields`.
2. Add `previewCost()`/`refreshCost()` methods to `recipe.service.js`, ported directly from
   `production-recipe.service.js#previewCost()/_computeCost()/refreshCost()` — same math (pull
   `Inventory.avgUnitCost` per ingredient via `InventoryCostEngine`, no new engine, no new formula).
3. Add `Product.costFields` as the roll-up consumer of `Recipe.costFields` (for a recipe-backed
   product) — the same cache-of-a-cache relationship `ProductionOrder.costBreakdown` already has to
   `ProductionRecipe.costFields`, one more level up.
4. **This depends on §5b** (Recipe versioning) — a cost cache is only meaningful against an
   unambiguous "current recipe," which does not exist until the partial-unique-index redesign lands.
5. Publish `DomainEvent.RECIPE_COST_CHANGED` (§4) on refresh, for Menu Engineering/Cost Alerts to
   subscribe to later — do not build the subscriber yet, just the seam, matching this codebase's own
   "name the event, wire the first real subscriber when it exists" convention.

**Do not** build a second, different costing engine for Menu — the whole point of this
recommendation is that one already exists, is proven, and Menu never connected to it.

---

## 13. Inventory Integration

Already deep and correct for the two workflows that exist (§3) — both Tier-1 and Tier-2 post through
the same `WarehouseDocument`/`StockLedger`/`InventoryCostEngine` infrastructure the Financial Domain
already certified, with zero new posting mechanism invented anywhere in this domain (verified by
direct grep — every posting call in this domain routes through the shared engine). Named gaps:

- `Consumption` (shift-scoped) has **zero** inventory integration despite its schema anticipating one
  — resolved by §5a's redesign, which should give it a real `WarehouseDocument`-posting `close()`
  method mirroring `ManualConsumption.approve()`.
- `FryerOilLog` posts inventory (`WarehouseDocumentService`) but **not** a dedicated journal entry —
  every sibling transactional document in this domain (`ManualConsumption`, `ProductionOrder`,
  `RecipeConsumption`) posts both legs. Whether oil cost flowing only through the inventory
  valuation layer (no explicit expense recognition until the oil is later consumed/discarded via
  some other document) is intentional or an oversight needs a product decision during implementation
  review — flagged here, not resolved, since it's a real design question, not an obvious bug.

---

## 14. Accounting Integration

**Better than any prior document credits it as being** — per the Method section's correction, Sales
COGS **does** post today (`recipe-consumption.service.js` → `SALES_COGS`), Production COGM/WIP posts
(`production-order.service.js`), and Manual Consumption posts (`manual-consumption.service.js`). This
domain's accounting integration is, in fact, **already at parity with the Financial Domain's own
certified best-effort/non-blocking + unconditional-operational-fact convention** — every posting call
found in this domain follows the pattern correctly (try/catch around the GL call, inventory movement
happens unconditionally). The remaining gap is narrower than previously documented: `Consumption`'s
missing posting (closed by §5a) and the `FryerOilLog` question above (§13). No new accounting
mechanism is needed anywhere in this redesign.

---

## 15. Multi-Branch Strategy

Brand/branch scoping is consistently correct throughout this domain (re-confirmed — every model
checked in the fresh code inventory carries `brand`/`branch` fields following the established
ownership-class conventions from `ERP_DEVELOPMENT_STANDARD.md` §1). The specific multi-branch
capability this analysis was asked to evaluate — cross-branch production output routing — is
**partially designed, not fully proven**: `ProductionRecipe.outputDestination` includes
`SpecificBranch`/`AnotherBranch`/`CentralKitchen` as enum values, but the model's own code comment
admits these are "honest routing labels, not five structurally distinct destinations" — i.e., the
enum exists, but `production-order.service.js#resolveDestinationWarehouse()` was not confirmed (in
either research pass) to actually resolve a cross-branch transfer correctly end-to-end (it resolves a
*warehouse*, and whether that warehouse can legitimately belong to a different branch than the
producing `ProductionOrder` was not verified). **This needs direct verification during implementation
planning, not assumed either way** — flagged as an open question, not a confirmed gap or confirmed
capability.

---

## 16. Multi-Kitchen Strategy

Multi-station-per-branch is real and proven (`PreparationSection`, one ticket per distinct station,
`getKitchenDashboard()` already groups by station). Multi-kitchen in the "one central kitchen feeding
several branches" sense is the same open question as §15's cross-branch routing — the schema has the
vocabulary (`CentralKitchen` as an `outputDestination`), the routing logic's completeness is
unverified. The genuinely new case this analysis surfaced in §1 — **one physical kitchen serving
multiple `Brand`s** (a cloud-kitchen/ghost-kitchen operating model) — is not modeled at all, because
every tenant boundary in this platform starts from `brand`. This is real, new-concept work, not a
redesign of `PreparationSection`, and should be scoped as its own follow-on analysis if/when a real
cloud-kitchen customer requires it — not spec'd speculatively here.

---

## 17. Future Expansion Strategy

**Consistently named absent across every prior document and reconfirmed by fresh code inspection —
correctly out of scope for this redesign pass, not silently forgotten:**

- Franchise governance (`Brand` remains flat, no master/franchisee relationship).
- Allergen/dietary/nutrition data (§1) — genuinely new fields, not a redesign.
- Channel-specific pricing (one `Product.price`, not a per-channel price matrix).
- Coupon engine (`Promotion` exists but has no category targeting or coupon-code redemption).
- Real notification delivery (the whole platform has zero notification-delivery infrastructure, not
  a Menu/Kitchen-specific gap).
- Cloud-kitchen shared-physical-location multi-brand model (§16).
- A background scheduler for anything (Production Planning's "what's due" logic, a nightly cost
  refresh sweep) — the whole platform has none; every "engine" in this redesign must be designed to
  be trivially externally-triggerable, exactly as `ERP_DEVELOPMENT_STANDARD.md` §11 already mandates.

### Recommended implementation priority (for the review this document explicitly precedes)

Ordered by dependency, not by document-listing order — §12 (Costing) blocks the most other value, so
it comes first despite being "just" a schema extension:

1. **Recipe versioning (§5b)** — foundational, small, low-risk (directly ports a proven pattern).
2. **Recipe/Product costing (§12)** — depends on #1; unlocks Menu Engineering, cost alerts, accurate
   margin reporting; the highest-value single change in this whole analysis.
3. **`OrderItem.finalPrice` server-side derivation (§7)** — independent of #1/#2, a real financial-
   integrity fix, should not wait.
4. **Combo selection-rule enforcement (§6)** — small, mirrors the existing modifier validator exactly.
5. **`Consumption` → Kitchen Shift Handover redesign (§5a)** — closes two previously-separate named
   gaps at once; moderate scope.
6. **`ProductReview` moderation workflow (§5)** — closes a named security gap; small scope.
7. Reporting layer (§11), Production Planning workflow (§3), then the genuinely-new-concept items in
   this section, roughly in the order listed above.

**This document is the redesign for review. No implementation should begin against any item above
until this analysis itself has been reviewed and confirmed.**
