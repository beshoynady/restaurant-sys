# Manufacturing, Recipe & Production Platform — Domain Redesign (Analysis Phase)

**Status: analysis and design only. No models, controllers, services, or migrations have been
written or modified as part of this document.** Per the explicit mandate for this phase, this is
Steps 1–9 of the requested process — understand, audit, study references, and redesign. Step 10
(the implementation plan) is a separate document, `PRODUCTION_MANUFACTURING_IMPLEMENTATION_PLAN.md`.
Step 11 (actual implementation) has not been started and should not begin until this redesign is
reviewed.

---

## Step 1 — What Already Exists (Verified From Source, Not From Prior Docs)

This is the single most consequential finding of this phase: **this is not a greenfield domain.**
A Production/Recipe skeleton already exists — unmounted, disconnected, and with zero business
logic, but real, and the correct starting point is to *rewire and extend it*, not replace it with
a new design. Building something new alongside it would recreate exactly the "two parallel,
disconnected Recipe concepts" problem this domain already has.

### 1.1 The two BOM concepts that already exist

**`menu/recipe/recipe.model.js` — Product → StockItem BOM** (mounted at `/menu/recipes`, reachable
via API, but drives no business logic):
```
brand, branch, product (→Product, required, unique per brand/branch),
numberOfMeals (yield), preparationTime,
ingredients: [{ stockItem→StockItem, amount, unit (free text), wastePercentage }],
serviceDetails: [{ serviceType[dineIn/takeaway/delivery], stockItem, amount, unit, wastePercentage }],
preparationSteps, isActive, soft-delete triple
```
No cost fields. No version field.

**`production/production-recipe/production-recipe.model.js` — StockItem → StockItem BOM**
(model+service+controller+router exist, but **the router is mounted nowhere** — confirmed by
grepping the entire `server/router/**` tree, zero hits):
```
brand, branch, stockItem (→StockItem, the OUTPUT), version (auto-incremented pre-save),
batchSize, unit, preparationTime,
ingredients: [{ itemId→StockItem, quantity, unit, wastePercentage }],
preparationSteps (i18n Map), isActive
```
One active recipe per `stockItem` enforced by a partial unique index. No cost fields.

**These are not duplicates — they are two different tiers of the same real business process,
built independently and never connected:**

| | `menu/Recipe` (Tier 1) | `production/ProductionRecipe` (Tier 2) |
|---|---|---|
| Triggered by | A sale (Order → Preparation Ticket) | A `ProductionOrder` (planned batch run) |
| Output | A sold `Product` — consumed immediately, not stored as inventory | A `StockItem` — a real inventory-tracked semi-finished or finished good |
| Quantity | Per order (à la minute) | Batch (`batchSize`) |
| Real-world example | "Margherita Pizza" recipe: 200g dough, 80g house sauce, 100g mozzarella | "House Tomato Sauce" ProductionRecipe: 5kg tomato, 200g basil, ... → 4L sauce (a `StockItem`) |

The connection that's missing: a `menu/Recipe`'s ingredient can itself be the *output* of a
`ProductionRecipe` (house sauce, dough, marinade — the classic central-kitchen semi-finished
pattern this prompt explicitly asks for) — and a `ProductionRecipe`'s ingredient can, in turn, be
the output of *another* `ProductionRecipe` (dough → pizza base → topped pizza is a real multi-level
BOM). Neither model currently has any cost field, so even where the chain conceptually exists,
nothing rolls a cost up through it.

### 1.2 `production/production-order` and `production/production-record`

**`ProductionOrder`** (model+service+controller+router all exist, router unmounted):
```
brand, branch, orderNumber (no unique index despite the field), productionType (store/directUse/display),
warehouse, preparationSection, stockItem (single item — NOT a recipe reference),
unit, quantityRequested, plannedStartDate/EndDate, priority, orderStatus (Pending/approved/rejected/canceled — inconsistent casing), notes
```
**Confirmed severe gap: no reference to `ProductionRecipe` at all.** An order can be approved with
zero BOM validation — the recipe only enters the picture later, at execution, inside
`ProductionRecord`. The service (`production-order.service.js`) is a 26-line hand-rolled class
(`create(data)`/`findAll(filter)`/`findById(id)`/`update(id,data)`/`delete(id)`) — the identical
non-Repository-Pattern defect already found and fixed twice this engagement
(`StockCategoryService`, pre-fix `InventoryService`). No `beforeCreate`, no state-machine
enforcement, no material consumption, no stock increment — confirmed by direct read, not assumed.

**`ProductionRecord`** (model+service+controller+router exist, router unmounted):
```
brand, branch (added later via a DB-003 backfill migration — confirmed present in the current
schema by direct read, correcting an older audit note that called this the platform's only
model with zero tenant scoping; that gap has since been closed),
productionNumber, productionOrder→ProductionOrder, warehouse, stockItem, quantity, unit,
productionStatus (Pending/In Progress/Completed/Canceled/Rejected), preparationSection,
productionRecipe→ProductionRecipe,
materialsUsed: [{ material→StockItem, quantity, unit, cost }],
opertionCost: [{ operationType[Labor/Machine/Overhead/gas/electricity/Other], cost, allocationMethod[Fixed/Variable/Activity-Based] }],
  ^ typo retained in the live schema field name
productionCost (Number — no computation hook; silently undefined unless application code sets it),
productionStartTime/EndTime
```
This schema's *shape* is actually good — it already separates direct material cost from
labor/overhead exactly the way real manufacturing costing requires (`materialsUsed` vs.
`opertionCost`), and it already links `productionOrder`+`productionRecipe`. What's missing is
entirely on the *service* side: no aggregation hook sums `materialsUsed`+`opertionCost` into
`productionCost`, no code posts a `WarehouseDocument`, no code touches `Inventory`/`StockLedger`,
no code posts a `JournalEntry`. `production-record.service.js` at least extends `AdvancedService`
(unlike `ProductionOrder`'s hand-rolled class) but has the same `softDelete`/`searchFields` typo
already fixed on several other modules this engagement.

**Net assessment, matching `ARCHITECTURE_REVIEW.md:591`'s own prior finding, independently
reconfirmed here by direct code read**: *"the recipe/order/record triad exists as three
independent CRUD collections with no material-consumption or stock-increment logic."* Nothing in
this domain is reachable via HTTP today (confirmed — zero mounts in `index.router.js`), so none of
this is a live production risk yet, but none of it is usable either.

### 1.3 Supporting infrastructure already in place, ready to extend

- **`StockItem.inventoryBehavior`** already has a `"productionOnly"` enum value ("used in
  production/recipe only") and a separate `isRecipeItem: Boolean` flag — both currently unread by
  any service (confirmed by grep), but they are exactly the right existing fields to formalize
  "this StockItem is a semi-finished good produced by a `ProductionRecipe`, not purchased," rather
  than inventing a new field.
- **`Warehouse.type`** already has `"kitchen"`/`"bar"` enum values (alongside `main`/`warehouse`/
  `outlet`/`other`) — no explicit `"production"` value exists yet, a real, cheap gap to close.
- **`StockLedger.source`** already anticipates production with `"ProductionOut"` (×2, a confirmed
  duplicate enum value with two different, conflicting comments) and `"ProductionIn"` (×1) — a
  genuine schema defect, not a design absence; the *intent* to support production movements was
  already there.
- **`InventorySettings.enableProduction`** (default `true`) and `.productionAutoApprove` (default
  `false`) already exist and are already read by nothing — exactly the shape of settings a
  Production domain's `beforeCreate`/approval-transition logic should consume.
- **`InventorySettings.inventoryAccounting.consumptionBehavior`** (per-`itemType` debit routing:
  ingredient/packaging/supply/service → COGS/INVENTORY_ADJUSTMENT/OPERATING_EXPENSE) is a plausible
  existing hook for classifying raw-material consumption inside a Production Order — confirmed
  present, not yet consumed by any service.
- **`RESOURCE_ENUM`** already has `"Recipes"` (filed under Menu & Sales) — confirms a Recipe
  concept was at least planned as an RBAC-gated resource, though no `"ProductionOrders"`,
  `"ProductionRecipes"`, `"BOM"`, or `"Manufacturing"` entries exist.
- **The Inventory Cost Engine, Journal Posting Engine, TransitionGuard, SequenceGeneratorService,
  and Domain Event Dispatcher are all real, working, and generic enough to be reused without
  modification** — this is the load-bearing conclusion of Step 1's infrastructure audit (§1.4).

### 1.4 Confirmed integration points (from direct code read, this session)

| Engine | Reusable as-is for Production? | Evidence |
|---|---|---|
| `InventoryCostEngine.resolveOutboundCost/afterInbound/resolveInboundValuationCost` | **Yes, unmodified.** Interface is generic (`{stockItem, warehouse, quantity, session, ...}`), not warehouse-document-specific. | `inventory-cost-engine.service.js` full read |
| `warehouseDocumentService.postDocument()` | **Yes, unmodified** — but needs new `transactionType` enum values (`documentType` "IN"/"OUT" already generic enough). | `warehouse-document.model.js` |
| `journalEntryService.postFromSource()` | **Yes, unmodified** — needs a new `JournalLine.sourceType` value (`"PRODUCTION_ORDER"`). | `journal-line.model.js` enum, full read |
| `TransitionGuard`/`createTransitionGuard()` | **Yes, unmodified.** | signature confirmed unchanged |
| `SequenceGeneratorService.getNext()` | **Yes, unmodified.** | signature confirmed unchanged |
| `DomainEventDispatcher`/`DomainEvent` catalog | **Yes, unmodified mechanism** — needs new named events added *in the same change that ships their first publisher*, per the catalog's own documented convention. | `domainEvents.js` full read, catalog confirmed at exactly 3 entries |
| `AccountingSettings.controlAccounts`/`.activities` | **No — genuinely absent.** No `workInProgress`/`costOfGoodsManufactured`/`productionVariance` control accounts, no `activities.production` block. This is real, new schema surface, not reuse. | full schema read |
| `InventorySettings` | **Extend, don't replace.** `enableProduction`/`productionAutoApprove` already exist; needs a `productionOrderSequence` sub-doc matching `countSequence`/`transferSequence`'s existing shape. | full schema read |

**Conclusion of Step 1**: the correct architecture is to **rewire the three existing Production
modules, connect them to the existing `menu/Recipe`, and extend (never duplicate) the existing
Inventory Posting Engine, Cost Engine, Journal Posting Engine, Domain Events, TransitionGuard, and
SequenceGenerator.** No new posting engine, no new cost engine, no new event dispatcher, no new
state-machine mechanism is needed. What's needed is: real business logic in the Production
services, a cost-rollup mechanism connecting the two BOM tiers, new accounting settings surface,
and mounting the routers with correct RBAC.

---

## Step 2 — Three-Perspective Enterprise Audit

### 2.1 Operational perspective

Real restaurant manufacturing scenarios this domain must support, mapped against what exists:

| Scenario | Maps to | Status |
|---|---|---|
| Central kitchen batches sauce/dough/marinade ahead of time | `ProductionRecipe` (StockItem output) via `ProductionOrder` | Schema exists, zero execution logic |
| Branch kitchen preps a dish à la minute when ordered | `menu/Recipe` (Product output) via Order→Ticket | Schema exists, zero deduction logic (confirmed: `PreparationTicket` has zero Recipe/StockItem awareness) |
| A dish's recipe consumes a semi-finished item made by the central kitchen | `menu/Recipe.ingredients[].stockItem` referencing a `ProductionRecipe`-produced `StockItem` | **Data model already supports this today** (both point at the same `StockItem` collection) — the missing piece is purely cost-rollup and execution wiring, not schema |
| Multi-level BOM (dough → pizza base → topped pizza) | `ProductionRecipe.ingredients[].itemId` referencing another `StockItem` that itself has an active `ProductionRecipe` | **Data model already supports this today** — recursive by construction, since `ProductionRecipe` keys off `StockItem` and any `StockItem` can have its own `ProductionRecipe`. Needs cycle detection (§4.4), not new schema. |
| Waste/spoilage during production | `Recipe.ingredients[].wastePercentage` / `ProductionRecipe.ingredients[].wastePercentage` already exist on both models | Fields exist, never read by any cost calculation |
| Yield variance (batch planned to produce 4L, actually produced 3.8L) | Not modeled anywhere today | **Real gap** — `ProductionRecord.quantity` is a single actual-output field with no comparison against the recipe's planned `batchSize`/yield |
| Quality inspection / rejection of a batch | Not modeled anywhere today | **Real gap** |
| Portion cost / plate cost for a Product | `menu/Recipe` + `Product`, no cost field on either | **Real gap**, but the data needed to compute it (StockItem.avgUnitCost via the existing Cost Engine) already exists |

### 2.2 Administrative perspective

- **Production Planning**: `ProductionOrder.plannedStartDate/EndDate`/`priority` already model
  basic planning intent. No scheduling/capacity concept exists (real gap, correctly scoped as
  future — see roadmap).
- **Approval workflow**: `InventorySettings.productionAutoApprove` already anticipates a
  maker-checker step; `ProductionOrder.orderStatus` has a `Pending`→`approved` transition but zero
  enforcement code (matches the platform-wide pattern already flagged in
  `ARCHITECTURE_REVIEW.md:705`: *"the enum is always well-designed; the transition logic enforcing
  it never exists"* — Production is not a special case, it's the same recurring defect).
  `preparationSection` already exists as an approval/ownership boundary (who runs this kitchen
  station) and is already referenced by both `ProductionOrder` and `menu/Recipe.serviceDetails`.
- **Preparation Sections as production locations**: currently a `PreparationSection` has no
  explicit link to a `Warehouse` (`DATABASE_MODELS_REVIEW.md:498`, re-confirmed) — a real gap for
  "which warehouse does this kitchen station consume from/produce into."

### 2.3 Financial perspective

- **No cost field exists anywhere in the Product→Recipe→StockItem or StockItem→ProductionRecipe→StockItem
  chains** — the single most consequential financial gap, independently confirmed by both prior
  audit documents and this session's direct read. Every COGS/margin/food-cost calculation today
  would have to be computed ad hoc by walking the graph live, with no caching and no way to
  reconstruct historical cost once ingredient prices change.
- **`AccountingSettings` has no WIP, no Cost of Goods Manufactured, no production variance control
  accounts, and no `activities.production` mapping** — confirmed absent by direct schema read.
  This is real, new accounting surface, exactly analogous to how `activities.purchase`/
  `activities.sales` already exist for their respective domains.
- **The three-tier costing model this platform already approved (but hasn't built) in
  `DATABASE_ARCHITECTURE_REDESIGN.md`** — (1) current cost basis, (2) cached recipe/product cost,
  (3) immutable sale-time snapshot — is the correct target architecture for Production too, not a
  separate design: tier 1 is `Inventory.avgUnitCost` (already real, already correct, and — this is
  the key realization of this redesign — **already sufficient to price a `ProductionRecipe`'s
  output**, since posting a production run through the existing Inventory Posting Engine's IN
  movement recomputes `avgUnitCost` for the produced item exactly as a purchase receipt does, no
  new mechanism required). Tier 2 (cached cost on `Recipe`/`Product`) and tier 3 (sale-time
  snapshot on `Order`/`Invoice` line items) remain to be built — this redesign proposes concretely
  how, in §5.

---

## Step 3 — Industry References (Honest Limitations Disclosed)

Attempted to study the three named references directly:
- **Foodics Help Center** (`help.foodics.com`) — returned HTTP 403 (blocks automated fetching).
  No content retrieved.
- **Odoo Manufacturing** (`odoo.com/app/manufacturing`) — marketing page, not technical
  documentation. Retrieved conceptual vocabulary only: Bill of Materials (with byproduct support),
  Manufacturing Orders, Work Orders/Work Centers with routing, Master Production Schedule, quality
  control points, batch/lot/serial traceability. No schema-level detail available from this page.
- **Daftra Operations** (`daftra.com/العمليات`) — marketing page, not technical documentation.
  Retrieved conceptual vocabulary only: manufacturing orders, BOM with raw materials, work
  stations/production phases, real-time consumption monitoring, cost distribution across stages.

**Honest conclusion**: none of the three references yielded schema-level or workflow-level detail
beyond what general ERP/manufacturing domain knowledge already provides (the BOM → Manufacturing
Order → Work Orders → consumption/output → cost rollup pattern is industry-standard across
SAP/Oracle/Dynamics/Odoo, not something unique to any one vendor). This redesign draws on that
standard pattern, adapted to what a restaurant actually needs (§6) and to what this codebase
already has (§1), rather than on unavailable vendor-specific documentation. This is disclosed here
rather than fabricating detail that wasn't actually retrieved — consistent with this engagement's
standing rule to never claim evidence that doesn't exist.

**What the standard pattern contributes that this codebase's existing skeleton is missing**: Work
Orders/routing (multi-step production with distinct labor/machine stages) and Master Production
Schedule (capacity-aware scheduling) are both real Odoo/SAP concepts with no equivalent here.
Both are named explicitly as *deferred* in §9's phasing — a single-stage `ProductionOrder` (no
sub-steps) is the right Phase 1 scope for a restaurant central kitchen, which rarely needs
multi-work-center routing the way a discrete-manufacturing factory does; Work Orders are named as
a concrete Phase 3+ extension point, not silently dropped.

---

## Step 4 — Redesigned Business Concepts

Restating the prompt's requested concept list, mapped to what already exists vs. what's genuinely
new, so nothing is silently invented and nothing already-real is silently ignored:

| Concept | Design decision |
|---|---|
| Raw Materials | `StockItem` with `inventoryBehavior: "stored"` (or existing default) and no active `ProductionRecipe` — no new model. |
| Semi-Finished Products | `StockItem` with `inventoryBehavior: "productionOnly"` (already exists, currently unused) **and** an active `ProductionRecipe` referencing it as output. Formalizing this existing field's meaning, not adding a new one. |
| Finished Products | A `StockItem` that has both an active `ProductionRecipe` (it's manufactured) **and** is referenced as an ingredient by a `menu/Recipe` (it's sold), OR is itself directly linked from a `Product` for direct-sale finished goods with no further recipe transformation. |
| Production Recipes | `production/ProductionRecipe` — existing model, extended with cost fields (§5) and a `parentRecipe`/nesting validation (§4.4), not replaced. |
| Recipe Versions/Revisions | `ProductionRecipe.version` already exists (auto-increment, one active per StockItem via partial unique index) — this **is** the versioning mechanism; a revision is a new `ProductionRecipe` document with the same `stockItem`, higher `version`, `isActive: true` (and the previous version's `isActive` flipped to `false` in the same transaction) — no new versioning model needed. |
| Yield | New field: `ProductionRecipe.expectedYield` (already implicitly `batchSize`, but needs to be distinguished from *actual* yield recorded on `ProductionRecord` — see Yield Variance below). |
| Production Orders | `production/production-order` — existing model, extended with a required `productionRecipe` reference (confirmed missing today — a severe planning-stage gap named by the prior audit and reconfirmed here) and a real state machine (§8). |
| Production Batches | A `ProductionOrder` execution *is* a batch — no separate "Batch" model needed unless lot/expiry tracking (§4.5) requires per-batch identity distinct from the order itself, in which case the batch identity lives on the `ProductionRecord` (already the execution-log entity) rather than a fourth new model. |
| Kitchen Production / Central Kitchen / Branch Production | Distinguished by `ProductionOrder.warehouse.type` (`"production"`, new enum value, §1.3) vs. `"kitchen"` (existing) — a central kitchen and a branch kitchen are both `Warehouse` documents, differentiated by `type` and `branch` scoping (a central kitchen commissary is typically `branch: null` or a dedicated commissary branch; a branch kitchen is `branch`-scoped) — no new model, this is exactly what multi-warehouse + multi-branch scoping already provides. |
| Preparation Recipes | = `menu/Recipe` (Tier 1, §1.1) — already the correct name for this concept in the existing codebase; not renamed. |
| Assembly Recipes | Same concept as `menu/Recipe`/`ProductionRecipe` — "assembly" (combining pre-made components with no transformation, e.g. a combo box) is a `ProductionRecipe`/`Recipe` whose ingredients have `wastePercentage: 0` and trivial preparation steps; not a structurally distinct concept requiring a new model. |
| Disassembly | **Genuinely new** — breaking one `StockItem` down into multiple output `StockItem`s (e.g. a whole chicken → breast/thigh/wing/carcass) is the *inverse* of a `ProductionRecipe` (many-inputs→one-output becomes one-input→many-outputs). Scoped as a Phase 3+ extension (§9) — real restaurant use case (butchery, produce breakdown) but lower priority than the core batch-production flow, and modelable later as a `ProductionRecipe` variant (`recipeType: "disassembly"`) rather than a parallel model, once the core engine exists. |
| Production Consumption | The `OUT` movements a `ProductionOrder`'s execution posts for each `ProductionRecipe.ingredients[]` line — reuses `warehouseDocumentService.postDocument()`, new `transactionType: "ProductionConsume"` (§7). |
| Production Outputs | The `IN` movement a `ProductionOrder`'s execution posts for the produced `StockItem` — same mechanism, new `transactionType: "ProductionYield"` (§7; also fixes the pre-existing duplicate `"ProductionOut"` `StockLedger.source` enum bug by giving consumption and yield their own distinct, correctly-named values, exactly as the prior audit recommended). |
| Production Waste | `ProductionRecipe.ingredients[].wastePercentage` (planned waste, already exists) vs. actual waste recorded on `ProductionRecord` (new field, §4.3) — a `WarehouseDocument` ADJUSTMENT (OUT) for waste beyond the planned percentage, reusing the existing Inventory Adjustment engine, not a new posting path. |
| Production Loss / Scrap / Rework | Scrap = waste with zero recovery value (reuses the Adjustment/Wastage path above). Rework = a new `ProductionOrder` consuming the rejected batch's output `StockItem` as an ingredient of a corrective recipe — modelable with existing concepts, no new model required for Phase 1; a dedicated `reworkOf` reference field is a cheap, real addition if traceability is required (§9 Phase 2). |
| Quality Inspection | **Genuinely new** — no model exists. Scoped as a `QualityCheck` sub-state on the `ProductionOrder` state machine (§8) with a pass/fail/conditional outcome and optional inspector/notes, not a separate full CRUD module for Phase 1 — a full Quality Management module (defect codes, sampling plans, statistical process control, the Odoo-reference-level depth) is real future work, correctly deferred. |
| Batch Tracking / Lot Tracking / Expiration | **Genuinely new at the ledger level.** This platform's own already-approved (but unbuilt) `DATABASE_ARCHITECTURE_REDESIGN.md` three-tier costing design already specifies a `StockLayer` collection with `lotNumber`/`receivedDate`/`expirationDate` for exactly this purpose — Production should be the second real consumer of that already-designed-but-unbuilt model (Purchasing/GRN would be the first), not invent a competing lot-tracking mechanism. Scoped as a shared cross-domain dependency, not Production-specific work (§9). |
| Production Reservations / Material Allocation | Depends on the platform-wide `Inventory.reserved`/`Reservation` concept, which **does not exist anywhere in the codebase today** (confirmed absent — this is the same gap named in every prior Supply Chain audit this engagement produced, e.g. `SUPPLY_CHAIN_PRODUCTION_RELEASE.md`'s "no Reservation/Available-Quantity model" finding). Production materials-reservation is a *consumer* of that platform capability, not a reason to build a Production-specific parallel reservation mechanism. Correctly scoped as blocked on that shared prerequisite (§9). |
| Production Completion / Cancellation / Returns | State machine transitions (§8) plus, for Returns specifically, a `ProductionReturnRecord`-style reversal reusing the same reversal pattern already proven for `PurchaseReturnInvoice` (post an offsetting `WarehouseDocument`, reverse the `JournalEntry`) — not a new reversal mechanism. |

### 4.4 Multi-Level BOM Nesting and Cycle Detection

Because `ProductionRecipe.ingredients[].itemId` and `ProductionRecipe.stockItem` (the output) both
reference the same `StockItem` collection, the BOM graph is recursive by construction — a
`ProductionRecipe`'s ingredient can be the output of another `ProductionRecipe`, to arbitrary
depth (dough → pizza base → topped pizza, as in §6). This is a real strength (no new schema
needed for multi-level BOMs, §2.1) but introduces one real risk that must be validated at
`ProductionRecipe` save-time, not left implicit: **a cycle** (item A's recipe consumes item B,
whose recipe consumes item A, directly or transitively) — which would make cost rollup (§5.4)
infinite-loop and would represent a physically impossible recipe. Required validation, enforced
in `beforeCreate`/`beforeUpdate`: walk the ingredient graph from the recipe's own output
`stockItem` (a bounded depth-first traversal, since real recipe nesting is shallow — bakery/pizza
examples in §6 are 2-3 levels deep, not dozens) and reject the save if the output item is
reachable from its own ingredient list. This is the one place this redesign requires genuinely new
validation logic (no existing engine does graph-cycle detection) — small, self-contained, and
squarely a `ProductionRecipeService.beforeCreate` concern, not a reason to introduce a new shared
utility.

---

## Step 5 — Production Cost Engine (Extend, Don't Replace)

**Core architectural decision, justified**: the existing `InventoryCostEngine` (WeightedAverage/
FIFO/LIFO/StandardCost/LastPurchaseCost, all real and working per Step 1) already computes and
maintains `Inventory.avgUnitCost` for *every* `StockItem`, purchased or produced, the moment any
`IN` movement posts through `warehouseDocumentService.postDocument()`. **A produced item's cost
basis is therefore not a new calculation — it is the existing engine's inbound valuation, fed a
`unitCost` computed by a new, small, Production-specific calculator** (analogous to how
`GoodsReceiptNote.confirm()` computes the `IN` movement's `unitCost` from the PO line price before
calling `postDocument()` — Production needs the equivalent "what unit cost do I feed the posting
engine" calculation, not a parallel cost-determination engine).

### 5.1 The Production Cost Rollup calculation (new, small, focused)

For one `ProductionOrder` execution:

```
rawMaterialCost = Σ (ingredient.quantity_consumed × ingredient.stockItem.avgUnitCost)
                   for every line in materialsUsed
                   [reads the SAME Inventory.avgUnitCost the Cost Engine already maintains —
                    no new cost source, this is tier-1 of the existing three-tier design]

packagingCost   = same formula, for ingredients where itemType === "packaging"
                   [already an existing StockItem.itemType value — reused, not invented]

directLaborCost = Σ operationCost[].cost where operationType === "Labor"
indirectOverhead= Σ operationCost[].cost where operationType in ("Machine","Overhead","gas","electricity","Other")
                   [reuses the ALREADY-EXISTING ProductionRecord.opertionCost[] schema exactly as
                    designed — this schema shape was already correct, just never computed]

totalBatchCost  = rawMaterialCost + packagingCost + directLaborCost + indirectOverhead
unitCost        = totalBatchCost / actualOutputQuantity
                   [NOT plannedYield — dividing by actual output is what correctly prices a batch
                    that under- or over-yielded relative to the recipe's expected batchSize; this
                    is also exactly where Yield Variance becomes visible, see §5.3]
```

This `unitCost` is what feeds `warehouseDocumentService.postDocument()`'s `IN` movement for the
produced `StockItem` — from that point forward, the existing Inventory Posting Engine and Cost
Engine handle everything downstream (weighted-average blending with any existing on-hand stock of
that item, FIFO layer creation if that's the item's configured method, etc.) exactly as they
already do for a purchase receipt. **No new valuation logic is needed past this handoff point.**

### 5.2 Standard Cost vs. Actual Cost, and Variance

The existing `StockItem.costMethod` already supports `"StandardCost"` (built this engagement,
§Step 1). For a produced item on `StandardCost`:
- The `IN` movement still values the *balance* at `StockItem.standardCost` (existing behavior,
  unmodified) — but the *actual* `unitCost` computed in §5.1 is what should be compared against
  standard to produce a **Production Cost Variance**, the manufacturing equivalent of the Purchase
  Price Variance already computed (but not GL-posted — a named, carried-forward gap) for
  StandardCost purchases. This is the same pattern, second domain: capture the variance on the
  immutable ledger row (`StockLedger.priceVariance`, already exists as a field — reused, not a new
  column), leave GL posting of it as a named Phase 2+ item consistent with how PPV posting is
  already scoped as future work for Purchasing.

### 5.3 Yield Variance (genuinely new, Production-specific)

Not present in the Purchasing domain because it doesn't apply there — a purchase receives exactly
what's on the PO line (subject to over/under-receipt, already handled by Three-Way Matching); a
production run can yield *more or less* than planned even with correctly-measured inputs (batch
loss, evaporation, trim waste). Proposed calculation, computed and stored on `ProductionRecord`
(new fields, not a new model):
```
expectedYield = ProductionRecipe.batchSize (scaled by the order's requested multiple, if the order
                 requests e.g. 3× the recipe's base batch)
actualYield   = ProductionRecord.quantity (already exists — this is what gets recorded at
                 completion)
yieldVariance = actualYield - expectedYield
yieldVariancePercent = yieldVariance / expectedYield
```
This is a report-facing number (like every other "variance" in this platform's established SSOT
discipline — computed, not independently stored as a second fact) except that, unlike most
variances, *this one directly determines `unitCost`* (§5.1's denominator), so it must be computed
and persisted at completion time as part of `ProductionRecord`, not purely derived on read — this
is the one place in this design where "cache the derived value" is the correct choice rather than
"always recompute," because the unit cost it feeds into the posting engine becomes part of an
immutable `StockLedger` row the moment it posts.

### 5.4 Cost Rollup Through Multi-Level BOMs

Because a `ProductionRecipe`'s ingredient can itself be a `StockItem` produced by *another*
`ProductionRecipe` (§4.4 nesting), and because that ingredient's `avgUnitCost` is *already*
correctly maintained by the Cost Engine the moment its own production run posts — **multi-level
cost rollup requires no additional mechanism beyond correctly sequencing production runs** (the
dough must be produced, and its `avgUnitCost` updated, before the pizza-base `ProductionRecipe`
that consumes it is costed). This sequencing is naturally enforced by real kitchen operations
(you can't consume dough that hasn't been made yet) and by the existing `applyOutbound()`
negative-stock guard (you *cannot* post a `ProductionConsume` movement for a semi-finished item
with zero on-hand balance unless `allowNegativeStock` is explicitly enabled) — the existing
Inventory Integrity guarantee already prevents the one failure mode multi-level BOM costing would
otherwise be vulnerable to (costing against phantom stock).

### 5.5 Recipe/Product Cost Caching (Tier 2 of the platform's three-tier design)

`menu/Recipe` and `Product` should each gain a cached `estimatedCost`/`costCalculatedAt` pair
(mirroring `StockItem.lastPurchaseCost`'s established "cache, refreshed on the relevant event,
never the SSOT" pattern): recalculated whenever the Recipe's ingredient list changes, OR — because
ingredient costs themselves drift as `Inventory.avgUnitCost` moves — on a scheduled refresh
(nightly, matching the pattern this platform's earlier design docs already specified for exactly
this: *"cached with a timestamp, invalidated/recalculated on ingredient cost change or on a
schedule"*, `DATABASE_ARCHITECTURE_REDESIGN.md`). This is Tier 2. Tier 3 (an immutable cost
snapshot copied onto the `Order`/`Invoice` line at the moment of sale) is Sales-domain work,
out of this redesign's scope but named so the seam is visible — the moment Sales wants
true historical food-cost reporting, it reads `Recipe.estimatedCost` at sale time and copies it,
the same pattern already used nowhere yet but designed for.

---

## Step 6 — Restaurant-Specific Scenario Walkthroughs

Concrete proof the redesigned concept set (§4) actually covers the prompt's named scenarios,
without inventing anything beyond what §4 already established:

- **Bakery/Pastry (multi-day, multi-stage)**: `ProductionRecipe` for "Croissant Dough" (flour,
  butter, yeast → dough `StockItem`, `inventoryBehavior: "productionOnly"`), consumed the next day
  by `ProductionRecipe` for "Baked Croissant" (dough + egg wash → finished `StockItem`), which is
  then either sold directly (`Product` → direct `stockItem` link, §4's "Finished Products" case) or
  further consumed by a `menu/Recipe` for a breakfast combo. Three-tier nesting, no new concepts.
- **Sauces / Central Kitchen distribution**: `ProductionRecipe` produces a batch of "House Sauce"
  at a `Warehouse.type: "production"` commissary location; the resulting `StockItem` balance is
  then moved to branch kitchens via the *already fully working* `StockTransferRequest` engine
  (built and hardened earlier this engagement) — Production doesn't need to reinvent inter-branch
  distribution, it's already solved.
- **Burger patties, marinades**: standard single-level `ProductionRecipe` (ground beef + seasoning
  → patty `StockItem`), consumed by a `menu/Recipe` at order time — the core, simplest case the
  whole design is built around.
- **Rice, soup (large-batch, consumed across many dishes)**: `ProductionRecipe` with a large
  `batchSize`, output `StockItem` consumed by multiple unrelated `menu/Recipe`s — no special
  handling needed, this is exactly what a shared semi-finished `StockItem` already models.
- **Meal Prep Boxes / Healthy Food (assembly of pre-made components)**: `menu/Recipe` (or a
  `ProductionRecipe` if the box itself is batch-assembled ahead of time, e.g. for delivery)
  referencing several already-produced `StockItem`s as ingredients with `wastePercentage: 0` — the
  "Assembly Recipe" case from §4, no structurally new concept.
- **Ingredient substitutions / alternative recipes**: modeled as a *second* active `ProductionRecipe`
  or `menu/Recipe` version for the same output, selected at order/production time rather than a
  single recipe with conditional branches — matches the existing versioning mechanism (§4) rather
  than requiring a new "recipe variant" concept. A `substitutesFor`/`alternativeOf` self-reference
  field on the recipe is a cheap, real Phase 2 addition if explicit substitution tracking (for
  costing/reporting, not just operational flexibility) is required.
- **Seasonal recipes**: an `isActive`/date-windowed `ProductionRecipe`/`Recipe` version, same
  mechanism as substitutions above — no new concept.

---

## Step 7 — Accounting & Cross-Domain Integration

### 7.1 New `AccountingSettings` surface (genuinely new schema, additive)

```
controlAccounts.workInProgress          — new
controlAccounts.costOfGoodsManufactured — new (distinct from existing costOfGoodsSold, which
                                            remains Sales' concern — COGM is inventory's transfer
                                            of a completed production run's cost INTO finished-goods
                                            inventory; COGS is that finished good later being sold)
controlAccounts.productionVariance      — new (yield + cost variance, mirrors the not-yet-posted
                                            Purchase Price Variance gap named in Supply Chain's own
                                            final audit — Production inherits the same honest
                                            "computed, not yet posted" status for its variance, not
                                            a lesser standard than Purchasing already has)
activities.production: {
  rawMaterialConsumption   — debited out of Inventory (raw), credited into WIP (or directly into
                              the produced item's inventory value for a single-step Production
                              Order with no separate WIP stage — see phasing note below)
  laborCost                — credited from an Accrued Labor / Payroll clearing account (integration
                              seam with HR/Payroll, not built this pass — named, not fabricated)
  overheadCost             — credited from an Overhead Absorption/Applied Overhead account
  productionCompletion     — WIP cleared, Finished/Semi-Finished Inventory debited
}
```
**Phasing honesty**: a full WIP stage (separate GL account tracking value while a multi-day/
multi-step production run is in progress) is real manufacturing accounting, but this domain's
Phase 1 scope (§9) is single-step production orders completed same-day — for that scope, WIP and
Finished-Goods can be the same posting event (materials consumed → finished inventory debited,
no intermediate WIP balance ever exists). The `workInProgress` control account is specified now so
the schema doesn't need to change when multi-step Work Orders (§3's deferred scope) are built —
this is "design for the next 10 years" applied narrowly to the one place a schema change would
otherwise be needed later, not speculative building.

### 7.2 `JournalLine.sourceType` — add `"PRODUCTION_ORDER"` (additive, matches existing convention).

### 7.3 `WarehouseDocument.transactionType` — add `"ProductionConsume"`, `"ProductionYield"`
(additive; also finally resolves the `StockLedger.source` duplicate `"ProductionOut"` bug by
giving each its own correctly-named, non-duplicated value).

### 7.4 Cross-domain integration inventory (per the prompt's Step 7 list)

| Domain | Integration | Design decision |
|---|---|---|
| Inventory | Consumption/output via `postDocument()` | Reuse, no changes to Inventory itself beyond the two new enum values above |
| Purchasing | Raw materials sourced via existing GRN flow | No change — Production is a *consumer* of Purchasing's output (`StockItem` balances), no direct coupling needed |
| Accounting | New control accounts/activities (§7.1) | Additive schema extension |
| Sales/POS/Kitchen | `menu/Recipe` execution at order time | **Named as a real, separate integration gap** — `PreparationTicket` has zero Recipe/StockItem awareness today (confirmed, §1); wiring Tier-1 consumption into the Order→Ticket flow is Sales-domain-adjacent work, sequenced in §9 as a distinct milestone from Tier-2 (batch) production, because it touches a different domain's write path and carries different risk (à la minute deduction failing mid-service is a worse operational failure than a batch production run failing) |
| CRM/Analytics/Dashboard/Reports | Read-only consumers of `ProductionRecord`/cost data once it exists | No new write coupling; correctly out of scope for this redesign beyond ensuring the underlying data (cost, variance, yield) is queryable |
| Employees/HR | Labor cost (§7.1) | Named integration seam, not built (would require a Payroll-side labor-cost-allocation concept that doesn't exist yet either) |

**Nothing in this design creates a new domain-to-domain direct-write coupling** — every
cross-domain effect goes through an existing, already-proven primitive (`postDocument`,
`postFromSource`, `domainEvents.emit`), matching `ARCHITECTURE_REVIEW.md`'s own stated principle
that "no domain should reach into another domain's collection directly."

---

## Step 8 — State Machine Design

The prompt's requested state machine (Draft → Planned → Released → Materials Reserved → In
Production → Quality Check → Completed → Posted → Closed → Cancelled) is the *correct enterprise
target* — but proposing it as Phase 1's mandatory scope would be over-building relative to what
this platform can actually support today, for one concrete, named reason: **"Materials Reserved"
requires a platform-wide Reservation concept that does not exist anywhere in this codebase**
(§4, confirmed absent). Building a Production-specific reservation mechanism to fill that gap would
violate this engagement's own repeated, hard-learned lesson (from the Supply Chain passes) that a
domain-specific workaround for a missing platform-wide capability becomes exactly the kind of
duplicated, parallel implementation this whole redesign process exists to prevent.

**Proposed Phase 1 state machine** (implementable now, using the existing `TransitionGuard`
mechanism, no new infrastructure):

```
Draft → Submitted → Approved → InProduction → QualityCheck → Completed → Posted → Closed
                  ↘ Rejected              ↘ Cancelled
```

- `Draft`: order created, `productionRecipe` required at creation (closing the confirmed planning-
  stage gap — no more "approved with zero BOM validation").
- `Submitted`: ready for approval (skippable straight to `Approved` when
  `InventorySettings.productionAutoApprove` is true — reusing the existing, currently-unread
  setting exactly as its own doc comment already specifies).
- `Approved`: materials availability checked (a read-only sufficiency check against current
  `Inventory.quantity`, NOT a reservation/hold — this is the honest, buildable subset of "Materials
  Reserved" available without the platform-wide Reservation concept; documented as a deliberate,
  named simplification, not silently substituted).
- `InProduction`: execution started, `ProductionRecord.productionStartTime` set.
- `QualityCheck`: optional pass/fail/conditional gate (§4's scoped-down Quality Inspection) —
  skippable via a settings flag for brands that don't need it, matching this platform's consistent
  "policy-driven, not hardcoded" convention.
- `Completed`: actual yield recorded, cost rollup computed (§5), `WarehouseDocument`
  consumption+yield posted atomically via the existing engine.
- `Posted`: `JournalEntry` posted (best-effort, non-blocking, matching every other posting engine's
  established philosophy — an unconfigured `AccountingSettings.activities.production` must not
  block a real kitchen from completing a batch).
- `Closed`: terminal, matches the platform's consistent "terminal states are final" convention.
- `Rejected`/`Cancelled`: reachable only before materials have actually been consumed (same
  "nothing physical has moved" boundary already used by `StockTransferRequest`'s
  `Approved→Canceled` design) — once `InProduction`, cancellation must become a `ProductionReturn`
  (§4) reversal instead, not a silent status flip, for the same auditability reason every other
  posted-and-physically-real document in this platform enforces.

**Every transition claimed atomically** (`findOneAndUpdate` with a status filter, not
read-then-save) from the first line of implementation — this is not a lesson to relearn; it's a
direct, named consequence of the TOCTOU race class this engagement found and fixed across the
entire Supply Chain domain (`SUPPLY_CHAIN_PRODUCTION_RELEASE.md` §1). Production inherits that
fix as a starting requirement, not a hardening pass to do later.

---

## Step 9 — Enterprise Validation Checklist & Phasing

| Concern | Design position |
|---|---|
| SSOT | `Inventory.avgUnitCost` remains the single cost-basis SSOT (§5); Recipe/Product cost fields are explicitly caches (§5.5), never a second source of truth |
| Transactions | Consumption+yield posted atomically via the existing `postDocument()` single-transaction guarantee; state claims atomic from day one (§8) |
| Concurrency/Race Conditions | Atomic-claim pattern mandatory from first implementation (§8) — not deferred to a later hardening pass |
| Auditability | Every state transition actor-attributed; `ProductionRecord` is itself the audit trail of what was actually consumed/produced/cost, mirroring `StockLedger`'s immutability |
| Event Readiness | `PRODUCTION_ORDER_APPROVED`, `PRODUCTION_ORDER_COMPLETED` added to the existing `DomainEvent` catalog in the same change that ships their first publisher, per the catalog's own stated convention — not pre-stubbed |
| Multi-Brand/Multi-Branch | Inherited automatically via `BaseRepository`'s `brandScoped`/`branchScoped` options, exactly as every other domain this engagement touched |
| Multi-Warehouse | Already fully supported — a central kitchen and branch kitchens are just `Warehouse` documents (§4) |
| Multi-Language | `ProductionRecipe.preparationSteps` already uses the platform's established `Map<lang,string>` i18n pattern — no change needed, `menu/Recipe.preparationSteps` should be migrated to match for consistency (currently plain strings — a real, cheap inconsistency to fix) |
| Multi-Currency | No currency-specific logic in this design — costs are always in the brand's base currency, matching every other costing engine in this platform today; genuinely future-ready only in the sense that nothing here blocks it, not because multi-currency production costing was designed |

### Phasing (informs, does not replace, the separate Implementation Plan document)

- **Phase 1 (core, buildable now)**: rewire `ProductionOrder`/`ProductionRecipe`/`ProductionRecord`
  onto the Repository Pattern; require `productionRecipe` on `ProductionOrder`; implement the §8
  state machine; implement §5.1's cost rollup and post through the existing Inventory Posting
  Engine; add the §7 accounting/enum extensions; mount routers with full RBAC; add cycle detection
  for nested `ProductionRecipe`s (§4.4).
- **Phase 2**: Recipe/Product cost caching (§5.5); Yield Variance persistence (§5.3); Quality Check
  gate; `ProductionReturn` reversal; Warehouse `"production"` type enum + `PreparationSection`↔
  `Warehouse` linkage.
- **Phase 3+ (named, correctly deferred, not fabricated as built)**: Tier-1 (à la minute) Recipe
  execution wired into Order/Ticket flow (separate domain risk profile, §7.4); Disassembly;
  multi-step Work Orders/routing; Lot/Batch/Expiry tracking (shared prerequisite with Purchasing,
  via the already-designed-but-unbuilt `StockLayer`); platform-wide Reservation/Materials-Reserved
  state; full Quality Management module; Purchase-Price/Production-Cost-Variance GL posting; Labor
  cost integration with Payroll.

This phasing is the direct output of Step 9's validation — nothing in Phase 1 depends on a
platform capability that doesn't exist; everything deferred to Phase 3+ is deferred specifically
*because* it depends on a platform-wide capability (Reservations, StockLayer) that doesn't exist
yet and shouldn't be built as a Production-specific workaround.
