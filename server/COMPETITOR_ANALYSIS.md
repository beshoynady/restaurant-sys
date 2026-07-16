# Competitor Analysis — Foodics / Daftra / Odoo

**Status: research only, no code changes.** Phase 1 of the Enterprise ERP Foundation Baseline's
Production Platform redesign. Studies official documentation only, extracts business concepts and
design patterns — never a feature-copy exercise. Every claim below is sourced with a URL and marked
by how it was obtained (direct fetch vs. search-engine snippet vs. explicitly inaccessible), per this
project's own "never trust a document's claim without checking it" discipline
(`ERP_DEVELOPMENT_STANDARD.md`).

**A prior attempt at this exact research already exists in this repo**
(`PRODUCTION_MANUFACTURING_DOMAIN_REDESIGN.md`, an earlier session) and reported 403 blocks and
marketing-only pages. This pass re-attempted all three sources fresh. Result: **Odoo's official docs
were fully accessible — every fetch returned real page content, nothing blocked. Foodics' help center
blocks direct fetching (403 on every attempt, confirming the prior finding) but yielded real,
citable content through search-engine snippets. Daftra's marketing page is exactly what the prior
attempt found — thin landing copy — but its separate, unlinked documentation site
(`docs.daftra.com`) is real and substantive.** Treat Odoo as the deepest, most reliable source in
this analysis; treat Foodics as reliable-but-partial (snippet-level, not full-article); treat Daftra
as reliable-but-narrow (two genuinely useful areas found, not a full platform picture).

---

## 1. Foodics

*Source: `help.foodics.com`, recovered via WebSearch (WebFetch blocked, 403 on every direct attempt).
Content below is search-engine-synthesized snippets of real articles, not full article text — treat
as directionally reliable, not exhaustive.*

### 1.1 Recipe / ingredient linking
Products, modifier options, and produced items each link to inventory items with a defined
consumption quantity. Modifier **options** carry a **Costing Method**: `ingredient-based` (cost
auto-computed from linked ingredients) or `fixed cost` (manually assigned) — a per-option choice, not
a platform-wide setting.
[Source](https://help.foodics.com/hc/en-us/articles/4406753900434-Linking-Ingredients-to-Inventory-Items)

### 1.2 Two product classes
**Regular Products** (prepared/composed, e.g. a burger) vs. **Stock Products** (sold as purchased,
e.g. bottled water) — a binary split separating "has a recipe" from "is its own stock unit."
[Source](https://help.foodics.com/hc/en-us/articles/5778986366748-Types-of-Products-Regular-and-Stock)

### 1.3 Production (their central-kitchen / batch concept)
A "Production" transaction combines multiple ingredient items into one produced item, generating
**three linked ledger effects in one submission**: Production (+produced qty), Consumption From
Production (−ingredient qty), Waste From Production (−ingredient qty, if applicable). Requires
sufficient ingredient stock at the branch before submission — insufficient stock blocks the
transaction, forcing a purchase/transfer first.
[Source](https://help.foodics.com/hc/en-us/articles/7056590306076-How-Does-Production-Work)

**Yield Percentage**: a first-class configuration = (Net Qty / Gross Qty) × 100, defined per
production relationship to model expected shrinkage/trim waste (their example: trimming raw beef).
[Source](https://help.foodics.com/hc/en-us/articles/6736380238748-Defining-waste-percentage-from-production-Yield)

### 1.4 Kitchen Flow (sequential station routing — genuinely different from our current model)
A "Kitchen Flow" defines **an ordered sequence of preparation stages an order moves through**,
assigned centrally then applied per branch/product/station. Each physical KDS device is bound to one
named station (their example: KDS1→barbeque, KDS2→pastry, KDS3→sweets) — tickets route to the
specific screen for their stage, and station *order within the flow* is explicitly configured
(implying sequential staged handoff, not purely parallel independent stations).
[Source](https://help.foodics.com/hc/en-us/articles/6776808069020-Guidance-Steps-for-Kitchen-Flow)

A separate, related concept — **"Courses"** — groups/sequences menu items for staff firing (e.g.
appetizer → main → dessert), configured independently of Kitchen Flow.
[Source](https://help.foodics.com/hc/en-us/articles/21601700489756-How-to-create-Courses-with-Foodics-Black-Console)

### 1.5 Combos and Modifiers
A Combo belongs to one category but can attach to **multiple menu groups simultaneously**, each
potentially offering a different option set. An **"Include Modifiers"** toggle controls whether
modifier pricing rolls into the displayed combo/product price or shows itemized.
Modifier→Modifier-Option is a two-level hierarchy; **linking a modifier to a specific product allows
per-product overrides** of min/max selectable options and free-option count — the same modifier
group can behave differently depending on which product hosts it.
[Source](https://help.foodics.com/hc/en-us/articles/4404645953938-Creating-Combos),
[Source](https://help.foodics.com/hc/en-us/articles/4404348413202-Linking-Modifiers-to-Products)

### 1.6 Inventory Count / variance
Explicit formulas: `Variance Quantity = Entered − Original`, `Variance Percent`, `Variance Cost`.
Counts can use a reusable **"Count Sheet"** template scoped to a storage location. A count stays
provisional until explicitly **closed**, at which point system quantity is overwritten to match the
physical entry — closing is the real state transition, not the initial submission.
[Source](https://help.foodics.com/hc/en-us/articles/7056765770012-How-Does-Inventory-Count-Work)

### 1.7 Stock level thresholds
Per item, per branch: **Minimum Level** (low-stock alert), **Maximum Level** (over-stock alert),
**Par Level** (auto-suggested target quantity when creating a purchase/transfer — distinct from
min/max, a replenish-to target rather than a bound).
[Source](https://help.foodics.com/hc/en-us/articles/6727592402588-Settings-Minimum-Level-Maximum-Level-and-Par-Level-for-Inventory-Items)

---

## 2. Daftra

*Source: `docs.daftra.com` (the real documentation site — distinct from the `www.daftra.com` marketing
page named in the research brief, which was confirmed to be pure landing-page copy with no schema/
workflow detail). Content translated/paraphrased from Arabic and English source pages.*

### 2.1 Two-tier recipe model — independently validates our own existing split
Daftra keeps the **exact same two-tier separation** this platform already has, arrived at
independently:
- **Compound Bundle** (POS-facing, lightweight): a finished product references N raw-material
  products with quantities; selling it auto-deducts components. No yield/waste %, no preparation
  steps, no station routing — the analogue of our `Recipe` (Tier 1).
  [Source](https://docs.daftra.com/en/tutorial/how-to-create-a-sandwich/)
- **Manufacturing module** (heavier, workstation/routing-aware): **Bill of Materials** (final product
  + raw materials with auto-populated cost + scrap items + operations + direct expenses) →
  **Production Routing** (an ordered sequence of named operations, e.g. testing → mixing → molding →
  drying → glazing → forming → sorting → packaging, purely for cost-report breakdown by stage) →
  **Manufacturing Order** (the transactional document — generated from a BoM with proportional
  scaling, or standalone; on completion posts a journal entry, adds finished quantity to a warehouse,
  increases scrap stock) — the analogue of our `ProductionRecipe`/`ProductionOrder`.
  [BOM source](https://docs.daftra.com/en/user_manual/bill-of-materials-bom/),
  [Routing source](https://docs.daftra.com/en/user_manual/production-routings-guide/),
  [MO source](https://docs.daftra.com/en/user_manual/manufacturing-orders-guide/)
- **Production Plan**: the demand-driven bridge — links a sales-order/invoice line to a product's BoM
  and auto-generates the resulting Manufacturing Order(s), with a draft state before commit. **We do
  not have an equivalent** — named as a real gap in `PRODUCTION_PLATFORM_DOMAIN_ANALYSIS.md` §3
  ("no replenishment link from Tier-1 selling out back to Workflow B"), now independently confirmed
  as a real, named concept a competitor actually built.
  [Source](https://docs.daftra.com/en/user_manual/production-plans-guide/)

### 2.2 Scrap items lower the finished-good's cost
Byproducts (resellable or pure loss) are modeled as a real inventory-increasing transaction on order
completion; their assigned cost is **subtracted** from the final product's allocated cost, lowering
its per-unit cost. Matches Odoo's By-Products concept (§3.5) — two independent systems converge on
the same pattern.
[Source](https://docs.daftra.com/en/user_manual/manufacturing-order-scrap-items/)

### 2.3 Unit Templates
A separate "Unit Template" concept (base unit + derived units with a conversion factor, e.g. gram
base / kilogram at factor 1000) applied per product, decoupling a recipe's measurement unit from the
warehouse's stocking unit. **We already solve this** — `StockItem.storageUnit`/`ingredientUnit`/
`parts` is the same conversion-ratio concept, just named differently. No gap here, worth noting as a
validated existing design.

### 2.4 Inventory Consumption reconciliation (a genuinely useful discrepancy-tracking pattern)
A dedicated report reconciles **invoiced quantity vs. actually-approved-and-consumed quantity** via
an optional per-invoice inventory requisition (approve/reject), surfacing a "Difference" column —
i.e., a real safety net for the case where a sale and its stock deduction aren't guaranteed atomic.
Worth considering as a reconciliation report once Preparation Inventory (§ redesign docs) exists,
low priority.
[Source](https://docs.daftra.com/en/tutorial/inventory-consumption-for-purchase-invoices-and-returns/)

### 2.5 Notable non-finding
Daftra's "Work Order" feature is an **unrelated generic project-budget-tracking concept** (title,
budget, linked invoices/expenses) — explicitly not connected to BoM/Manufacturing Orders in their own
docs. Flagged so the name isn't confused with a kitchen prep ticket when read elsewhere.

### 2.6 Honest gaps
No KDS, no preparation-station routing tied to POS orders, no recipe yield/waste-percentage field, no
restaurant-specific documentation beyond the one sandwich tutorial. Daftra's "restaurant management"
marketing claims are not backed by restaurant-specific product documentation as far as this research
could access.

---

## 3. Odoo (official documentation — deepest and most reliable source in this analysis)

*Source: `odoo.com/documentation` (v19.0, current stable). Every fetch in this section returned real
page content — no blocks encountered.*

### 3.1 Bill of Materials — three BoM types, one mechanism
A BoM is one finished product + component lines + optional Operations (linked to Work Centers) +
By-Products. **`Manufacture`** (real assembly), **`Kit`** (a bundle with no manufacturing step — see
§3.4), **`Subcontracting`** (outsourced to a vendor) are all the *same* BoM model with a type field,
not three separate schemas. An "Apply on Variants" scoping field lets a component/operation apply to
specific product variants only. Consumption policy is configurable per BoM: `strict` / `warn` /
`flexible`.
[Source](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/basic_setup/bill_configuration.html)

### 3.2 Multilevel BoMs (sub-assemblies)
A manufactured product becomes a component of another product's BoM — "semi-finished products,"
reused across multiple finished products. Recommended build order is bottom-up. **We already have
this** — `production-recipe.service.js#_assertNoCycle()` is our own proven, tested equivalent
(BFS cycle detection over the BOM graph). No gap.
[Source](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/advanced_configuration/sub_assemblies.html)

### 3.3 By-Products and Scrap
**By-Products**: a dedicated BoM tab, each line = product + quantity-per-cycle + optional operation
association (which step generates it) — genuinely secondary output tracked as real inventory, not a
note field. **Scrap**: pure loss, moved to a **virtual location** (`Virtual Locations/Scrap`) — a
bookkeeping mechanism to log/track loss without corrupting real stock counts.
[By-Products](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/workflows/byproducts.html),
[Scrap](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/workflows/scrap_manufacturing.html)

Our current `ProductionRecipe`/`ProductionOrder` has no By-Products or Scrap concept at all — a real,
scoped gap (see `FEATURE_GAP_ANALYSIS.md`).

### 3.4 Kits vs. Combos — two different mechanisms for what looks like one problem
This is the single most valuable structural finding in this whole research pass. Odoo deliberately
keeps **two separate bundling mechanisms**:
- **Kit** (BoM type): a *fixed* bundle. Not stocked as itself — explodes into component lines on the
  delivery order; stock is deducted at the component level, never the kit level; "the system cannot
  fulfill kit sales if any required component lacks availability." Used in both regular Sales and
  Manufacturing contexts.
  [Source](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/advanced_configuration/kit_shipping.html)
- **Product Combo** (POS-native, Sales/POS app, not Manufacturing): a *choice-based* bundle — the
  customer picks one option from each of several "combo choice" groups; **price is fixed regardless
  of which options are picked** (does not sum component prices).
  [Source](https://www.odoo.com/documentation/19.0/applications/sales/point_of_sale/combos.html)

**Our platform conflates these into one mechanism** (`Product.comboGroups[]`), and it happens to work
for the choice-based case (min/max selection per group) but has no fixed-bundle "Kit" concept at all —
worth evaluating explicitly in the redesign whether a degenerate case (all groups min=max=1) is
sufficient or whether a genuinely separate, simpler Kit concept is worth adding once §7's
server-side pricing work lands.

### 3.5 Work Centers / Work Orders
`Manufacturing Order → Work Orders → Work Center` — Work Orders are declared on a BoM's Operations
tab and auto-generated per MO. Work Centers carry rich configuration: Capacity (parallel units), Time
Efficiency multiplier, OEE Target, per-product "Specific Capacities," Working Hours, Setup/Cleanup
time, Cost per hour, Allowed Employees (certification restriction), Alternative Work Centers
(failover), IoT triggers, equipment/maintenance tracking (MTBF/MTTR). No formal state-machine enum
was found in the fetched docs (scheduling is Gantt/"Shop Floor" driven, not spelled out as a status
list). **Our `PreparationSection.maxParallelTickets`/`averagePreparationTime` is a much lighter-weight
analogue** — real and used (`getKitchenDashboard()`), but has no Alternative-Station failover,
per-employee certification restriction, or cost-per-hour concept.
[Source](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/advanced_configuration/using_work_centers.html)

### 3.6 MO Cost vs. Real Cost, and WIP accounting
**MO Cost** (estimated, from BoM configuration) vs. **Real Cost** (actual incurred) — component cost
uses average purchase price (auto-recalculated, overridable); work-center cost splits into an
estimate (configured hourly rate) vs. real (the specific employee's actual HR rate) — this variance
is how a business sees labor overrun or extra consumption after the fact. **WIP accounting**: a
**WIP Account** + **WIP Overhead Account**, posted **manually** (an explicit "Post WIP Accounting
Entry" action on the MO, not automatic), with an **auto-scheduled reversal** the next day by default —
solves interim financial visibility for long-running production. **Anglo-Saxon vs. Continental**
posting-timing modes determine whether inventory cost hits the P&amp;L at purchase time (Continental,
periodic) or at sale time (Anglo-Saxon, perpetual, Debit COGS/Credit Stock on delivery).
[MO Costs](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/basic_setup/mo_costs.html),
[WIP](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/manufacturing/basic_setup/work_in_progress.html),
[Valuation](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/inventory_valuation/cheat_sheet.html)

Our `ProductionOrder.complete()` posts directly on completion, with no WIP staging account — correct
and sufficient for short-cycle production (most restaurant batch production completes same-day), a
real gap only for genuinely multi-day production (a bakery's dough-today-bake-tomorrow case) — see
`ERP_IMPROVEMENT_RECOMMENDATIONS.md` for the prioritization call.

### 3.7 Routes, Reordering Rules, Removal Strategies
**Routes** (ordered push/pull rules) automate movement between warehouse zones; a product's route
(`Buy` vs `Manufacture`) determines what a **Reordering Rule** generates when stock crosses its min
threshold — an RFQ or a Manufacturing Order, from the *same* rule engine, "eliminating manual
decision-making." **Removal strategies** — **FIFO**, **LIFO** ("banned in many countries"), and
**FEFO** (First-Expired-First-Out, driven by expiration date, explicitly for perishables: food,
medicine, cosmetics) — set at Product Category or Location level. **Putaway strategy** is a separate,
subsequent concept governing *where* incoming stock is placed, defined at the Location level.
[Routes](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/shipping_receiving/daily_operations/use_routes.html),
[Reordering](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/warehouses_storage/replenishment/reordering_rules.html),
[Removal](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/shipping_receiving/removal_strategies.html)

**Our platform has a real, working reordering mechanism** already (`DomainEvent.
INVENTORY_BELOW_REORDER_POINT`, with a live subscriber in the Supply Chain domain, per
`ERP_DEVELOPMENT_STANDARD.md` §8) — not confirmed whether it can also trigger a `ProductionOrder`
(vs. only a purchase). **FEFO/lot-based removal does not exist anywhere in this platform** — a real,
high-value gap for a restaurant handling perishables (see Feature Gap Analysis).

### 3.8 Inventory Adjustments (cycle counts)
On Hand (system) vs. Counted (physical) side by side, auto-computed Difference; each product line
carries a "Scheduled" recount date, **configurable per Product Category** — i.e., a business can count
high-shrinkage/high-value items more frequently than stable ones. Counts stay provisional until
"Apply"/"Apply All."
[Source](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/warehouses_storage/inventory_management/count_products.html)

### 3.9 Quality — Quality Control Points and Quality Alerts
A **Quality Control Point (QCP)** is a *configuration* object scoped to an operation type
(Manufacturing/Delivery/Receipt/etc.) and a product/category, which **auto-generates a Quality Check
instance** whenever a matching document is created — "systematic inspection without manual
intervention per cycle." Eight check types documented: Instructions, Pass-Fail, Measure
(Norm ± Tolerance), Picture, Register Consumed Materials, Register Production, Label, Worksheet.
**Quality Alerts** escalate a failed check into a tracked issue. QCPs can scope down to a specific
BoM operation, not just the whole MO.
[Source](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/quality/quality_management/quality_control_points.html)

**Our `FryerOilLog.qualityChecks[]` is a real, proven, narrower version of exactly this pattern** —
ad-hoc appended checks, no auto-generation-on-trigger, no configurable check types, no escalation.
The redesign should generalize this proven pattern rather than build a full Quality-app clone — see
`PRODUCTION_PLATFORM_DOMAIN_REDESIGN.md`.

### 3.10 Planning app — a notable non-integration
Odoo's standalone **Planning** app (Shifts/Resources/Roles, Gantt, Auto Plan) documents integration
with **Sales** and **Project**, but **no documented integration with Manufacturing/Work Centers** was
found — Work Center capacity scheduling appears to be a separate, parallel mechanism inside the MRP
app itself ("Planning by Workcenter," "Shop Floor"). Worth noting as a real design tension in a
mature competitor's own platform, not something to necessarily replicate: two scheduling systems that
don't talk to each other is a known cost of Odoo's app-per-domain architecture, and a case *for* this
platform's single-schema, cross-domain-aware approach where it can be maintained without the
complexity blowing up.
[Source](https://www.odoo.com/documentation/19.0/applications/services/planning.html)

---

## 4. Cross-Cutting Patterns Observed Across All Three

| Pattern | Foodics | Daftra | Odoo | Independently converged? |
|---|---|---|---|---|
| Two-tier recipe (simple deduction vs. full production) | Regular vs. Stock Products | Compound Bundle vs. Manufacturing module | Kit BoM vs. Manufacture BoM | **Yes — all three, plus our own platform, independently arrived at the same split** |
| Yield/waste percentage on production | Explicit Yield % field | Scrap items lower finished cost | By-Products (tracked inventory) + Scrap (virtual location loss) | Yes, three different mechanisms for the same underlying need |
| Configurable removal/consumption strategy | Not found | Not found | FIFO/LIFO/FEFO per category/location | Only Odoo documents this explicitly, but it's a real, general ERP pattern |
| Reordering triggers the correct downstream document automatically | Min/Max/Par notification only (no auto-document generation found) | Production Plan (sales line → BoM → auto MO) | Reordering Rule → route-determined RFQ or MO | Two of three go further than a notification — real replenishment automation |
| Sequential vs. parallel station routing | **Kitchen Flow is explicitly sequential/staged** | Not found | Not explicitly documented (Work Center scheduling is Gantt-based, not a fixed sequence concept) | Foodics is the standout here — a genuinely different model from ours |
| Quality checkpoints as a generic, configurable mechanism | Not found | Not found | Quality Control Points (auto-generated, 8 check types) | Only Odoo, but validates generalizing our own `FryerOilLog.qualityChecks[]` pattern |
| Manual-post WIP staging for long-cycle production | Not found | Not found (MO posts directly per docs) | WIP Account + auto-reversal | Only Odoo — a real but lower-priority idea for this platform (§3.6) |

See `FEATURE_GAP_ANALYSIS.md` for how every pattern above maps against this platform's current,
code-verified state, and `ERP_IMPROVEMENT_RECOMMENDATIONS.md` for which gaps are worth closing and
why.
