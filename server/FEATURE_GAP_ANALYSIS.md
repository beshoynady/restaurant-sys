# Feature Gap Analysis — Production Platform vs. Foodics / Daftra / Odoo

**Status: analysis only, no code changes.** Phase 2 of the Enterprise ERP Foundation Baseline. Every
row below is checked against real, current code — not against a prior document's claim, and not
against `COMPETITOR_ANALYSIS.md`'s findings alone. Where this document states "we already have this,"
it cites the actual file. Where it states a gap, it names the specific missing piece, not a vague
category.

**Scoring legend**: ✅ Have it (real, working, verified) · 🟡 Partial (schema exists, logic thin/or a
narrower version exists) · ❌ Missing (confirmed absent).

---

## 1. Recipe / Costing

| Capability | Foodics | Daftra | Odoo | Us | Verdict |
|---|---|---|---|---|---|
| Two-tier recipe (simple deduction vs. full BOM) | ✅ | ✅ | ✅ | ✅ `Recipe` (Tier 1) / `ProductionRecipe` (Tier 2) | **Have it** — independently converged with all three competitors |
| Recipe cost visible on the sellable item | ✅ (cost report referenced) | ✅ (auto-populated from purchase price) | ✅ (MO Cost/Real Cost) | ❌ **No cost field on `Product` or `Recipe` (Tier 1)** | **The single most consequential gap in this whole analysis** — already named independently by every prior internal document (`PRODUCTION_PLATFORM_DOMAIN_ANALYSIS.md` §12) and now confirmed as table stakes across all three competitors |
| Multi-level BOM / sub-assemblies | Not confirmed | Not confirmed | ✅ | ✅ `production-recipe.service.js#_assertNoCycle()` | **Have it** |
| Yield / waste percentage | ✅ explicit Yield % | ✅ via Scrap cost deduction | ✅ By-Products + Scrap | ✅ `Recipe.ingredients[].wastePercentage` (Tier 1), `ProductionOrder.yieldVariance`/`yieldVariancePercent` (Tier 2) | **Have it** — actually ahead at Tier 1 (per-ingredient waste %, not just an aggregate) |
| By-Products (secondary tracked output, not just loss) | ❌ | ✅ (Scrap items, cost-deducting) | ✅ (dedicated BoM tab) | ❌ | **Real, scoped gap** — `ProductionOrder` has no secondary-output concept at all today |
| Recipe versioning | Not confirmed | Not confirmed | Implied (BoM revisions not detailed) | 🟡 `ProductionRecipe` yes (proven atomic version supersession); `Recipe` (Tier 1) **no** — and its own unique index structurally prevents it | **Confirmed structural blocker**, already named in `PRODUCTION_PLATFORM_DOMAIN_ANALYSIS.md` §5b |
| Unit conversion (recipe unit ≠ stock unit) | Not confirmed | ✅ Unit Templates | Implied | ✅ `StockItem.storageUnit`/`ingredientUnit`/`parts` | **Have it** — different name, same mechanism, validated by Daftra's independent convergence |

---

## 2. Menu / Combo / Modifier

| Capability | Foodics | Daftra | Odoo | Us | Verdict |
|---|---|---|---|---|---|
| Choice-based combo (pick one from each group) | ✅ | Not confirmed | ✅ (Product Combo) | ✅ `Product.comboGroups[]` | **Have it** |
| Combo selection-rule enforcement | ✅ (implied by config) | N/A | ✅ | ❌ **Schema-only — confirmed no `validateComboSelections()`-equivalent exists** (only `validateModifierSelections()` does) | **Real, well-scoped gap** — already named in `PRODUCTION_PLATFORM_DOMAIN_ANALYSIS.md` §6 |
| Fixed bundle ("Kit" — no choice, component-level stock deduction) | Not distinguished from Combo | Not confirmed | ✅ **explicitly separate mechanism from Combo** | 🟡 Expressible as a degenerate combo (all groups min=max=1), no dedicated concept | **Design question, not a hard gap** — evaluate during redesign whether a true Kit concept is worth splitting out |
| Modifier groups with per-product override (min/max/free count) | ✅ | Not confirmed | Implied | 🟡 `Product.modifierGroups[]` exists and is enforced (`modifier-selection-validator.js`), but is a **simplified reuse of `comboGroups[]`'s shape** — no `linkedProduct`, no nested groups, no `pricingMode` (already named as a deliberate scope reduction in `PREPARATION_KITCHEN_OPERATIONS_STATUS.md` Addendum 8) | **Partial, working, intentionally simplified** |
| Combo/modifier price rollup into final sale price | 🟡 ("Include Modifiers" toggle implies server-side rollup exists) | Not confirmed | ✅ (fixed combo price, not summed) | ❌ **`OrderItem.finalPrice` is client-supplied, not server-derived** | **Real financial-integrity gap**, already named in `PRODUCTION_PLATFORM_DOMAIN_ANALYSIS.md` §7 |
| Combo visible across multiple menu groups/channels with different option sets | ✅ | Not confirmed | Not confirmed | ❌ (`MenuCategory` is one-per-product, no multi-group visibility) | **Minor gap** — nice-to-have, not urgent |
| Product availability by channel, matching the order-type taxonomy actually used | N/A | N/A | N/A | ❌ **`MenuCategory.availableChannels` enum (`dineIn/takeaway/delivery`) does not match `Order.orderType` (`DINE_IN/DELIVERY/TAKEAWAY/INTERNAL`)** | **Confirmed real bug**, named in `MENU_PLATFORM_FINAL_ARCHITECTURE.md`, not yet fixed |

---

## 3. Production / Manufacturing

| Capability | Foodics | Daftra | Odoo | Us | Verdict |
|---|---|---|---|---|---|
| Batch production with a real state machine | ✅ (implied) | ✅ | ✅ | ✅ `ProductionOrder` (`Draft→Submitted→Approved→Completed→Closed`) | **Have it — reference-quality**, already the most mature part of this domain |
| Cost rollup (planned vs. actual) | Not confirmed | ✅ (auto-populated BoM cost) | ✅ **explicit MO Cost vs. Real Cost distinction, including per-employee labor-rate variance** | 🟡 `ProductionOrder.costBreakdown` computes real cost from ledger rows at completion; **no separate "planned/estimated" figure captured for later variance comparison** | **Partial, scoped gap** — worth adding an estimated-cost snapshot at `Approved` time to compare against the real cost at `Completed` |
| Demand-driven production trigger (a shortfall auto-suggests/creates a production order) | Not confirmed | ✅ Production Plan (sales line → BoM → auto MO, draftable) | ✅ Reordering Rule → route-determined MO | ❌ **Confirmed: `replenishment.service.js#_process()` only ever creates a `PurchaseRequest`, never a `ProductionOrder`, regardless of whether the low-stock item is purchased or manufactured** | **Real, concrete, well-scoped gap** — directly verified in this pass, not inferred |
| Work Center capacity/scheduling depth (certification restriction, failover, cost-per-hour) | Not confirmed | Not confirmed | ✅ (rich config) | 🟡 `PreparationSection.maxParallelTickets`/`averagePreparationTime` — real but lighter-weight | **Acceptable gap for now** — this platform's stations serve à la minute + batch both; Odoo's Work Center depth is manufacturing-only and likely over-engineered for most restaurant business models (see §17 of the domain analysis on scope discipline) |
| WIP staging account for long-running production | Not confirmed | Not confirmed | ✅ (manual post + auto-reversal) | ❌ (posts directly on completion) | **Low-priority gap** — only matters for genuinely multi-day production, most restaurant batch production completes same-day |
| Central-kitchen / cross-branch output routing | Not confirmed | Not confirmed | Implied (multi-warehouse routes) | 🟡 `ProductionRecipe.outputDestination` enum names it; routing logic's completeness is **unverified**, per own code comment "honest routing labels, not five structurally distinct destinations" | **Open question, needs direct verification during implementation** — already named in `PRODUCTION_PLATFORM_DOMAIN_ANALYSIS.md` §15 |

---

## 4. Preparation / Kitchen Execution

**Terminology correction carried forward from this instruction**: "Kitchen" is a station *type*, not
the domain. The domain is **Preparation**, matching this codebase's own existing folder name
(`modules/preparation/`) — a naming choice this analysis re-confirms as already correct, not a
change.

| Capability | Foodics | Daftra | Odoo | Us | Verdict |
|---|---|---|---|---|---|
| Multi-station ticket routing | ✅ | ❌ (no KDS found) | 🟡 (Work Center scheduling, not order-routing specific) | ✅ one `PreparationTicket` per distinct `preparationSection` | **Have it** |
| **Sequential staged routing** (order moves through station A, then B, in a defined order) | ✅ **"Kitchen Flow" — explicitly sequential, per-branch/product-assignable** | ❌ | Not documented as a fixed sequence concept | ❌ **Only parallel, independent per-station tickets today — no staged handoff concept** | **Real, valuable, well-scoped gap** — the standout finding of this whole competitor pass; see redesign recommendation for a configurable Preparation Routing Strategy |
| KDS with real-time SLA visibility | ✅ | ❌ | N/A (not documented) | ✅ `getKitchenQueue()`/`getKitchenDashboard()` | **Have it** — poll-based, not push, see next row |
| Real-time push to kitchen screens | Implied (device-bound KDS screens) | N/A | N/A | ❌ **Confirmed dead/disconnected Socket.IO scaffolding** | **Real, already-named gap**, unrelated to this competitor research but worth restating |
| Quality checkpoints, configurable, auto-generated per trigger | ❌ | ❌ | ✅ **Quality Control Points, 8 check types, auto-spawned** | 🟡 `FryerOilLog.qualityChecks[]` — real but ad-hoc, single-material, not generalized | **Real, well-scoped gap** — generalize the proven pattern, don't clone Odoo's Quality app |

---

## 5. Inventory / Warehouse

| Capability | Foodics | Daftra | Odoo | Us | Verdict |
|---|---|---|---|---|---|
| Costing strategy per stock item | Not confirmed granular | Not confirmed granular | 🟡 **per Product Category** (less granular than us) | ✅ **per `StockItem`** (`costMethod`: FIFO/LIFO/WeightedAverage/StandardCost/LastPurchaseCost) | **Have it — actually ahead of Odoo's own granularity** |
| Reordering / replenishment automation | 🟡 (Min/Max/Par notification only, no auto-document found) | Not confirmed | ✅ (auto RFQ or MO) | 🟡 Real event-driven engine (`INVENTORY_BELOW_REORDER_POINT` → `PurchaseRequest`), **but purchase-only, never production** (see §3 above) | **Partial — the production-routing half is the real gap** |
| Lot/serial/expiration tracking | Not confirmed | Not confirmed | ✅ | ❌ **Confirmed absent — no field on `StockItem` at all** | **Real, high-value gap for a restaurant handling perishables** — already named as a "platform-wide prerequisite" in prior docs, now scored against real competitor capability |
| FEFO (First-Expired-First-Out) removal strategy | Not confirmed | Not confirmed | ✅ (explicitly for food/medicine/cosmetics) | ❌ (blocked on lot/expiration tracking above) | **Real gap, directly dependent on the lot-tracking gap** |
| Physical inventory count with variance | 🟡 (Count Sheet, variance formulas) | Not confirmed | ✅ (per-category recount frequency) | 🟡 `JournalLine.sourceType` includes `INVENTORY_COUNT` — a real posting path exists in the core Inventory domain, **not deeply inventoried in this Production-Platform-scoped pass** | **Likely have it, outside this analysis's scope to fully verify** |
| Putaway strategy | Not confirmed | Not confirmed | ✅ | Not inventoried in this pass | **Out of scope, low priority for a restaurant vs. a full warehouse** |

---

## 6. Priority Ranking (feeds `ERP_IMPROVEMENT_RECOMMENDATIONS.md` and the Implementation Plan)

Ranked by (business value × how many competitors validate it) ÷ implementation cost — not by
document-listing order:

| Rank | Gap | Why it ranks here |
|---|---|---|
| 1 | Recipe/Product costing (no cost field) | Named by all three competitors, all four prior internal documents, blocks Menu Engineering/reporting entirely, and — critically — the fix is "port a mechanism that already works," not build one |
| 2 | Recipe versioning (Tier 1) | Structural blocker, small/low-risk, is the direct prerequisite for #1 |
| 3 | `OrderItem.finalPrice` server-side derivation | Real financial-integrity issue, independent of everything else, should not wait on the redesign |
| 4 | Combo selection-rule enforcement | Small, mirrors an existing proven validator exactly |
| 5 | Preparation Inventory redesign (see domain redesign doc) — consolidates `Consumption`, `ManualConsumption` mode, and the material-tracking half of `FryerOilLog` | Closes multiple previously-separate named gaps at once |
| 6 | Sequential Preparation Routing Strategy (Foodics' "Kitchen Flow" pattern) | Highest-value net-new capability found in this research pass; genuinely differentiates from what exists, real business need (course sequencing, multi-stage dishes) |
| 7 | Generalized Quality Checkpoint concept | Real value, moderate scope, should reuse `FryerOilLog`'s proven shape rather than a new subsystem |
| 8 | Route reorder-point events to Production, not just Purchase | Concrete, directly verified, moderate scope |
| 9 | By-Products / Scrap tracking on `ProductionOrder` | Real gap, lower urgency than the above |
| 10 | Lot/expiration tracking + FEFO | High value but large scope (a platform-wide prerequisite, not a Production-Platform-only change) — sequence deliberately, don't let it block everything above it |
| 11 | WIP staging account | Low priority — only matters for genuinely multi-day production |

See `PRODUCTION_PLATFORM_DOMAIN_REDESIGN.md` for how these translate into bounded contexts, and
`PRODUCTION_PLATFORM_IMPLEMENTATION_PLAN.md` for the phased build sequence.
