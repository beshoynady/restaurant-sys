# Enterprise Menu Platform — Final Architecture

**Status: design only, no code written.** This document extends — does not repeat —
`MENU_PRODUCTION_PLATFORM_AUDIT.md`, `MENU_PRODUCTION_PLATFORM_REDESIGN.md`, and
`PRODUCTION_MANUFACTURING_DOMAIN_REDESIGN.md`. Every base schema (`Product`, `Recipe`,
`ModifierGroup`, `ProductVariantGroup`, Combo, `PreparationSection`/`Ticket`, `ProductReview`)
already has a full design in those documents; this document adds depth (variant sub-types, deeper
modifier/combo mechanics, Recipe operations, Product Availability — genuinely new) and the
cross-domain validation the prior pass scoped out. `MENU_COST_CONTROL_ARCHITECTURE.md`,
`MENU_ENGINEERING_ARCHITECTURE.md`, and `KITCHEN_EXECUTION_ARCHITECTURE.md` are companion
deep-dives on those three specific areas; this document is the master reference.

---

## 1. Deep Business Review — Operating Models This Platform Must Serve

Restated as a design constraint check, not a marketing survey — for each model, what the already-
designed architecture (prior two documents) already handles vs. what's genuinely stressed by it:

| Operating model | What already fits | What stresses the design |
|---|---|---|
| **QSR** (quick service) | Combo engine (§ redesign doc §5), fast modifier flow, single-station-per-item routing | Kitchen queue/SLA speed (§ `KITCHEN_EXECUTION_ARCHITECTURE.md`) — QSR's whole value proposition is speed, so kitchen metrics/delay-detection matter more here than anywhere else |
| **Casual Dining** | Sequential ticket-firing (§ redesign doc §6.4 `sequenceGroup`), table-linked orders (already exists, Seating domain) | Multi-course pacing is exactly what `sequenceGroup` was designed for — no new capability needed, just correct configuration |
| **Fine Dining** | Recipe versioning/approval (§7 below), portion control | Higher stakes on Recipe Approval workflow (a wrong recipe going live matters more when the average check is 10x a QSR's) — approval gating (already designed) is the right lever, not new schema |
| **Bakery** | `ProductionRecipe`/central-kitchen batch production (companion redesign) | Multi-day production lead time and shelf-life/expiration — ties to the companion redesign's named-and-deferred `StockLayer`/lot-tracking dependency, not new Menu-domain work |
| **Central Kitchen / Cloud Kitchen** | Companion redesign's entire Tier-2 (`ProductionRecipe`) + `StockTransferRequest` distribution (Supply Chain, already built) | Cloud kitchen specifically stresses multi-brand-from-one-kitchen — already supported structurally (a `Warehouse` isn't brand-exclusive at the schema level, and `Product`/`Recipe` are brand-scoped independently of where they're produced) |
| **Healthy Food / Meal Prep** | Nutrition fields (§2 redesign doc, `Product.nutrition`), portion control | Batch-produced meal boxes are Combo's `comboPricingMode` + assembly-recipe case (already covered, redesign doc §6) |
| **Coffee Shop** | Variant Engine (§2 below — temperature, size) | High modifier-combination cardinality (milk type × syrup × size × temperature) — stresses `ModifierGroup`'s nesting depth in practice, not its design; a bounded-depth nesting (already specified) handles this correctly |
| **Pizza** | Nested Recipe (companion redesign §4.4, dough→base→topped), crust-type Variant (§2 below) | Half-and-half/multi-topping customization is a `ModifierGroup` with `allowMultipleOfSameOption` (already designed) — no new mechanism |
| **Burger** | Standard single-level Recipe + Modifier (extra cheese, no onion — already the canonical example in the redesign doc) | Nothing new stressed — this is the baseline case the whole design was built around |
| **Desserts** | Variant Engine (portion/temperature), nutrition aggregation | Nothing new — already covered |
| **Multi-Brand / Multi-Branch** | Every model in both prior documents is `brandScoped`/`branchScoped` via the standard `BaseRepository` convention | No stress — this was designed in from the start, not retrofitted |
| **Franchise** | Genuinely stresses the design — see §9 below | Recipe/pricing consistency-vs-autonomy across franchisees is not addressed by anything designed so far |

**Franchise, specifically** (the one genuinely under-addressed operating model): a franchise
relationship typically requires a franchisor-defined "master recipe/menu" that franchisees can
either use verbatim or customize within bounds (e.g., pricing may vary by territory, but the
recipe/food-cost baseline may not). **This platform has no concept of a "master brand" vs.
"franchisee brand" relationship at all** — `Brand` is a flat, independent tenant today. Correctly
named as a real gap in `PRODUCTION_MENU_GAP_ANALYSIS.md` rather than designed here speculatively —
franchise governance (royalty calculation, master-menu propagation/locking, franchisee deviation
approval) is a distinct enough concern from Menu itself that it deserves its own architecture pass,
not a bolted-on paragraph.

---

## 2. Product Variant Engine (Full Depth)

The redesign doc's `ProductVariantGroup` (§3) already establishes the core mechanism
(`selectionType`, `recipeImpact`, `priceDelta`/`costDelta`). This section maps every variant
sub-type the prompt names onto that one mechanism — **not eleven separate variant systems**:

| Variant type | `selectionType` | Primary effect via `recipeImpact`/fields | Notes |
|---|---|---|---|
| Size | N/A — handled by the existing size-as-Product mechanism (redesign doc §2), not `ProductVariantGroup` | Own SKU/barcode/price/cost/nutrition/prep-time (redesign doc §2) | Deliberately NOT modeled as a `ProductVariantGroup` — sizes need independent sellability (their own SKU/barcode/tax), which only a full `Product` provides; a `ProductVariantGroup` option does not |
| Flavor | single or multiple | `recipeImpact` substitute (e.g. vanilla syrup → hazelnut syrup) | |
| Cooking Level (rare/medium/well-done) | single, required for applicable categories | Typically `kitchenInstruction` only (§ redesign doc §4's `ModifierGroup` field, reused here — cooking level is really a **Modifier**, not a Variant, since it usually carries zero cost/recipe-ingredient change, only a kitchen instruction) — **reclassified**: cooking level belongs in `ModifierGroup`, not `ProductVariantGroup`, correcting an assumption in the prompt's own grouping | |
| Bread Type | single | `recipeImpact` substitute | |
| Crust Type (pizza) | single | `recipeImpact` substitute + possible `priceDelta` (stuffed crust upcharge) | |
| Portion (half/full) | single | `costDelta`/`priceDelta` computed as a fraction of the base Recipe's cost (see §5 below — this overlaps with Modifier's "Half Portion/Double Portion," reconciled there) | |
| Packaging | single or multiple | `recipeImpact` — a packaging `StockItem` swap (box vs. bag), `itemType: "packaging"` already exists on `StockItem` | |
| Temperature (hot/iced/frozen) | single | Sometimes `recipeImpact` (iced = adds ice `StockItem`), sometimes pure `kitchenInstruction` | |
| Spice Level | single | `recipeImpact` (chili-paste quantity delta) — the canonical example already used in the redesign doc | |
| Calories/Nutrition Variant | N/A — a *consequence*, not a selectable variant | `nutritionDelta` already on both Variant and Modifier options (redesign doc) | Listed in the prompt as if a distinct variant type; correctly modeled as an *effect field* every other variant/modifier option already carries, not a twelfth mechanism |
| Price/Recipe/Cost/Barcode/SKU/Kitchen/Inventory/Availability/Visibility Variant | N/A — these are *dimensions of effect*, not variant *types* | `priceDelta`, `recipeImpact`/`costDelta`, `linkedProduct` (for SKU/barcode, since only a full `Product` legitimately owns those identifiers — reusing the Size mechanism's own reasoning), kitchen (`recipeImpact` can target a different `preparationSection` only via the linked-Product path, §6.2 of redesign doc), Availability (§4 below), Visibility (`isSellable`/`status`, reused) | The prompt's list conflates "kinds of customer-facing choice" (flavor, spice level) with "kinds of effect a choice can have" (price impact, recipe impact) — this architecture deliberately keeps those as two orthogonal concerns: **one selection mechanism** (`ProductVariantGroup`/`ModifierGroup`), whose options can carry **any combination of effects** (price, cost, recipe, nutrition, kitchen instruction), rather than building a separate "Price Variant" model, a separate "Recipe Variant" model, etc. This is the single most important architectural decision in this section — collapsing eleven named "variant types" into effect-fields on one mechanism is what keeps this extensible instead of combinatorially exploding into eleven parallel schemas. |

**Barcode Variant / SKU Variant, specifically**: only meaningful when the variant option is itself
independently stocked/sold/scanned (e.g. a bottled-flavor variant that's also sold standalone) — in
that case, the option's `linkedProduct` (already in the `ModifierGroup` design, extended here to
`ProductVariantGroup` options too) IS the SKU/barcode owner, reusing the exact same reasoning
already applied to Size. A variant option with no `linkedProduct` has no SKU/barcode, correctly,
because it isn't an independently identifiable stocked/sold thing.

---

## 3. Modifier Platform (Additional Depth)

Extending the redesign doc's `ModifierGroup` (§4) with the specific mechanics named in this
prompt not yet covered:

- **Price Override vs. Percentage Price**: add `pricingMode: enum["flat","percentage"]` to each
  `ModifierGroup.options[]` entry alongside the existing `extraCharge` — `flat` uses `extraCharge`
  as-is; `percentage` computes the charge as `extraCharge% × the base Product's price` (e.g. "Large
  portion: +25%"). Both resolve to a single computed charge at order time — no new pricing engine,
  one new field plus one branch in the existing charge-calculation step.
- **Quantity Modifier / Half Portion / Double Portion / Extra Cheese**: all four are the *same*
  mechanism — `allowMultipleOfSameOption` (already designed) generalized with a per-option
  `quantityPricingCurve: enum["linear","flat"]` (does "Extra Cheese x2" cost exactly 2× one
  extra-cheese charge — `linear` — or a flat "double cheese" price regardless of count —
  `flat`). Half/Double Portion is this same mechanism applied to the *base item's* quantity
  fraction rather than an addon — modeled as a `ModifierGroup` attached to the item itself (not a
  separate "portion" concept) with options `{name: "Half", extraCharge: -50%
  (pricingMode:"percentage"), recipeImpact: [scale every base-Recipe ingredient by 0.5]}` — this
  is the one place `recipeImpact` needs a **scaling** capability (`action: "scale", factor:
  Number`) beyond the existing add/remove/substitute actions (redesign doc §4) — a small, additive
  extension to that enum, not a new mechanism.
- **Modifier Scheduling / Availability / Visibility**: reuses §4 below (Product Availability) —
  `ModifierGroup`/options gain the same `availabilityWindow` sub-schema Product gains, not a
  parallel scheduling mechanism.
- **Modifier Cost/Calories/Nutrition**: already covered by `recipeImpact` cost derivation and
  `nutritionDelta` (redesign doc §4) — restated here only to confirm no gap remains against this
  prompt's explicit list.

---

## 4. Product Availability (Genuinely New — Confirmed Absent)

Confirmed by direct source read: **`Product` has zero availability scheduling today.** Only
`MenuCategory` has `availableChannels` (`["dineIn","takeaway","delivery"]`) and a daily
`availableFrom`/`availableTo` `HH:MM` window — no day-of-week, no seasonal/date-range, no
per-Product override, and (a genuine, confirmed, small defect worth fixing in the same change)
**`MenuCategory.availableChannels`'s enum values (`dineIn`/`takeaway`/`delivery`, camelCase) do not
match `Order.orderType`'s enum (`DINE_IN`/`DELIVERY`/`TAKEAWAY`/`INTERNAL`, upper-snake-case)** — a
real, silent mapping mismatch that would need a translation layer wherever these two fields are
compared, confirmed by direct read of both models, not assumed.

**New sub-schema, added to `Product`** (and, per §3, to `ModifierGroup`/`ProductVariantGroup`
options where scheduling at that granularity matters):
```
availability: {
  isAlwaysAvailable: Boolean (default true — the common case, zero overhead for brands that don't need scheduling),
  daysOfWeek: [String] (enum Sun-Sat, empty = all days),
  timeWindows: [{ from: "HH:MM", to: "HH:MM" }] (multiple windows per day, e.g. lunch AND dinner service),
  seasonalWindow: { from: Date, to: Date } (nullable — e.g. a pumpkin-spice item only Sep-Nov),
  channels: [String] (enum matching Order.orderType exactly — DINE_IN/DELIVERY/TAKEAWAY/INTERNAL —
    fixing the confirmed mismatch by having Product's new field use the SAME enum Order already
    defines, rather than MenuCategory's independently-invented one; MenuCategory's existing field is
    left as-is for backward compatibility but flagged as the source of the original inconsistency),
  branchOverrides: [{ branch: →Branch, isAvailable: Boolean }] (branch-level enable/disable,
    distinct from branch-scoping the document itself — a chain might sell an item everywhere but
    disable it at one branch temporarily),
  inventoryGate: Boolean (default false — when true, availability additionally depends on §4.1),
  productionGate: Boolean (default false — when true, additionally depends on §4.2),
}
```
**Resolution order at read time** (a Product is "available right now" iff ALL apply):
`isAlwaysAvailable` OR (current day/time/season matches) AND (requested channel is in `channels`)
AND (no `branchOverrides` entry disables the requesting branch) AND (if `inventoryGate`, §4.1
passes) AND (if `productionGate`, §4.2 passes).

### 4.1 Inventory-gated availability
A read-time check (not a write-time lock): does the Product's `Recipe`'s cheapest-available
ingredient have sufficient `Inventory.quantity` for at least one unit? This directly reuses the
existing Inventory read surface (`Inventory.quantity`, already real) — **no new inventory
mechanism**, just a Menu-side read at menu-display/order-attempt time. Automatic Disable/Enable
(prompt's explicit ask) = a scheduled or event-driven re-check (subscribing to the companion
redesign's `INVENTORY_BELOW_REORDER_POINT` event as a trigger to re-evaluate, not poll) that flips
`Product.status` to `out_of_stock`/`active` accordingly — reusing the existing `DomainEvent`
mechanism and the existing `status` enum, zero new infrastructure.

### 4.2 Production-gated availability
Same pattern, for `Product`s sourced from a `ProductionRecipe`-backed semi-finished `StockItem` —
gates on that item's `Inventory.quantity` rather than raw-ingredient sufficiency, and additionally
can gate on whether a `ProductionOrder` is currently `InProduction` for it (a "back in stock at
3pm" signal) — a read over the companion redesign's already-designed `ProductionOrder` state,
not new data.

---

## 5. Combo Platform (Additional Depth)

Extending redesign doc §5 with the specific combo shapes named in this prompt:

- **Meal Builder / Build Your Own**: `comboPricingMode: "sumOfParts"` (already designed) with every
  group's `minSelection: 1, maxSelection: 1` per component slot (protein, side, drink) — no new
  mechanism, a configuration of the existing shape.
- **Choose One / Choose Many**: `minSelection`/`maxSelection` (already designed) — `1/1` vs.
  `1/N`/`0/N` respectively.
- **Upsell Combo**: a `comboGroups[].items[].priceDelta` (already designed, §5.1 of redesign doc)
  applied to a premium substitution — "make it a combo for +$3" is the same mechanism as "upgrade
  to onion rings for +$1," just applied at the whole-combo-attach level rather than within one
  group; modeled as the base item itself gaining an optional `ModifierGroup` whose single option
  IS the combo attachment (`linkedProduct` → the combo `Product`) — reuses Modifier, not a new
  "upsell" concept.
- **Family Meal / Kids Meal**: no new mechanism — a Combo `Product` with larger `comboGroups[].
  items[].quantity` (family) or age-appropriate `category`/`MenuCategory` classification (kids) —
  purely a data configuration, not a structural difference from any other combo.
- **Bundle Promotions**: this is `Promotion` (Sales domain, already exists) referencing a Combo
  `Product` the same way it references any other Product (redesign doc §11's confirmed direct-FK
  pattern) — no new coupling.
- **Combo Production Integration**: when a combo's resolved component is itself a
  `ProductionRecipe`-backed semi-finished item, its consumption at combo-expansion time (redesign
  doc §5.2 step 3) reuses the exact same posting path the companion redesign already specifies for
  standalone sale of that item — confirmed, no new integration code path, purely a consequence of
  "each resolved item consumes via its own Recipe" already being the design.
- **Combo Accounting Integration**: combo revenue posts as ordinary Sales revenue (Sales domain,
  unchanged); combo COGS = Σ resolved items' costs (redesign doc §5.2 step 4) — flows into
  whatever Sales-side COGS posting already exists for a multi-line order, since each resolved
  combo component is, from Accounting's perspective, indistinguishable from an ordinarily-sold
  line item once expanded. **No new accounting posting logic** — the combo-discount tracking
  (redesign doc §5.2) is the only new *number*, and it's a reporting/margin input, not a GL entry
  of its own (a combo discount is not a distinct accounting event the way a `SalesReturn` is;
  it's simply why the combo's line-item revenue is lower than the sum of its parts' list prices).

---

## 6. Recipe Platform (Additional Depth)

Extending redesign doc §7 (which already covers Alternative Ingredients, Approval, Versioning,
Yield/Waste/Portion) with the remaining prompt-named capabilities:

- **Recipe Scaling**: a read-time computation (`scaleRecipe(recipe, targetYield)` → every
  ingredient's `amount` multiplied by `targetYield / recipe.numberOfMeals`) — used by both
  `previewCost()` (already designed) and a genuinely new **Recipe Simulation** capability (below).
  Not persisted as a new Recipe document — scaling is a query-time transform, matching this
  platform's consistent "derive, don't duplicate" SSOT discipline.
- **Recipe Simulation**: "what would this recipe cost/yield/consume if I changed ingredient X's
  quantity or substituted Y" — a pure read-side calculation over the existing cost-rollup logic
  (redesign doc §1.2/companion redesign §5.1) with hypothetical inputs, never writing anything.
  Genuinely useful for a chef/cost-controller iterating on a recipe before approving it (§ Recipe
  Approval, already designed) — the natural companion to that workflow, not a separate module.
- **Recipe Validation**: enforced at `beforeCreate`/`beforeUpdate` — every ingredient's `unit`
  matches its `StockItem`'s declared unit (closing the confirmed, platform-wide "free-text unit"
  gap named in the companion redesign's own audit, at least for the one write path Recipe
  controls), cycle detection (companion redesign §4.4, already designed, reused verbatim for
  `menu/Recipe`'s own nested-ingredient case now that Recipe ingredients can reference
  `ProductionRecipe`-backed semi-finished `StockItem`s), and non-negative/non-zero quantity checks.
- **Recipe Dependency**: the read-side graph query "which Products/Recipes would be affected if
  this StockItem's cost or availability changes" — a reverse-lookup over the same ingredient graph
  cycle-detection already walks forward; no new storage, an additional query shape over existing
  references.
- **Recipe Audit Trail**: per `AUDIT.md §5`'s confirmed finding (no business-entity revision-
  history mechanism exists anywhere in the platform, only request-level `audit-log`), Recipe's
  audit trail is **the version chain itself** (already designed: `version` + previous-version
  `isActive:false`) — each version IS the historical record, not a separate audit-log entry. This
  is a deliberate reuse of existing structure over building a parallel history mechanism,
  consistent with this engagement's repeated preference for extending what exists.
- **Semi-Finished/Finished Product, Production Recipe, Nested Recipe, Station Assignment**: fully
  covered by the companion redesign (`PRODUCTION_MANUFACTURING_DOMAIN_REDESIGN.md` §1, §4, §4.4) —
  restated here only to confirm no gap remains against this prompt's list. Station Assignment
  specifically = `Recipe`'s owning `Product.preparationSection` (already exists) for Tier-1, and
  `ProductionOrder.preparationSection` (companion redesign) for Tier-2 — not a new field.

---

## 6a. Product Ratings — Remaining Depth (Extends Redesign Doc §10)

The redesign doc already covers photos, verified-purchase enforcement, moderation
(`TransitionGuard`-based approve/reject), aggregate/Bayesian rating, and fraud-detection framing.
This prompt names several mechanics not yet specified:

- **Restaurant Reply**: new `ProductReview.reply: { text, repliedBy→UserAccount, repliedAt }` —
  one reply per review (a restaurant's official response), not a threaded conversation; a single
  embedded sub-document is sufficient and matches the platform's consistent preference for the
  simplest structure that satisfies the actual requirement.
- **Like / Dislike / Helpful Votes**: **Like/Dislike and "Helpful" are the same underlying
  mechanism** (a customer's binary reaction to a review) and should not be built as three separate
  vote types — new `ProductReview.votes: { helpfulCount, notHelpfulCount }` (aggregate counters,
  cached) backed by a new lightweight `ReviewVote` record (`review→ProductReview, customer→
  OnlineCustomer|Employee, voteType: enum["helpful","not_helpful"]`, unique per
  `{review,customer}` to prevent duplicate voting) — the counters are a cache (same discipline as
  every other aggregate field in this engagement), `ReviewVote` documents are the SSOT. "Like/
  Dislike" is simply this same mechanism's product-facing label; not a fourth concept.
- **Spam Detection**: extends the redesign doc's rate-limiting (`maxReviewsPerCustomerPerDay`)
  with a `ProductReview.spamScore` (Number, nullable) — computed from simple, transparent
  heuristics (duplicate/near-duplicate comment text across reviews, review velocity from one
  account, comment length near zero with an extreme rating) rather than a fabricated ML model,
  matching this document's `§ AI-ready` honesty standard from the companion Menu Engineering
  document — a score above a brand-configurable threshold auto-routes the review into moderation
  rather than auto-publishing it, but never auto-deletes (a human always makes the final call,
  same human-in-the-loop boundary applied throughout this redesign).
- **Hidden Reviews**: not a new status — **reuses the existing `isActive`/soft-delete pattern**
  already on `ProductReview` (confirmed present in the audit) rather than adding a fourth `status`
  value alongside `PENDING`/`APPROVED`/`REJECTED`. "Hidden" = `APPROVED` but `isActive: false` — a
  review that was legitimately published and later hidden (e.g. following a complaint) without
  being formally "rejected" as fraudulent, a real, distinct operational case from moderation
  rejection.
- **Review Analytics**: a read-side report (same established pattern) — rating trend over time,
  distribution histogram (already partially named in redesign doc §10 as `ratingAggregate`),
  reply-rate (what fraction of reviews get an owner response), vote engagement — composed entirely
  from fields already specified above, no new mechanism beyond the report query itself.

---

## 7. Cross-Domain Validation

Verified against every domain this prompt names, with an honest status for each (per
`AUDIT.md §5`'s stated discipline against fabricating integration depth this pass didn't actually
verify):

| Domain | Integration status |
|---|---|
| Inventory | **Real, verified** — Recipe→StockItem, the entire Cost Engine reuse chain (redesign doc §1.2/§8) |
| Production/Manufacturing | **Real, verified** — companion redesign is the full design |
| Purchasing | **Indirect, correct** — Menu never talks to Purchasing directly; it reads `Inventory.avgUnitCost`, which Purchasing's GRN flow maintains. No direct coupling needed, matching `ARCHITECTURE_REVIEW.md`'s own stated principle (no domain should reach into another's collection directly) |
| Accounting | **Indirect, correct** — Menu supplies cost inputs (§ this doc + companion redesign); actual GL posting remains Sales'/Production's job, not Menu's — Menu has never posted a JournalEntry directly and this redesign doesn't introduce that |
| CRM | **Confirmed real touchpoint**, narrow — `LoyaltyReward.product` → `Product` (verified this session, direct FK) — no deeper CRM coupling exists or is proposed |
| POS | **Read-surface only** (redesign doc §11) — no new channel-specific model |
| Orders | **Real, the primary consumer** — `OrderItem.product` → `Product` (already existed); this redesign's `ProductVariantGroup`/`ModifierGroup` selections need new `OrderItem` fields to record what was chosen (a genuinely new, small `OrderItem` schema addition: `selectedVariants[]`, `selectedModifiers[]`, each snapshotting the resolved `priceDelta`/`recipeImpact` at order time — snapshotting, not re-deriving later, matching the platform's established "price/extras snapshotting avoids retroactive drift" pattern already praised in `DATABASE_MODELS_REVIEW.md` for `PreparationTicket`) |
| Kitchen | **Real, deepened** — see `KITCHEN_EXECUTION_ARCHITECTURE.md` |
| Delivery | **Confirmed no dedicated domain exists** beyond `Order.orderType: "DELIVERY"` and `MenuCategory.availableChannels` — this redesign's §4 Availability is the extent of Delivery-specific Menu logic; a full delivery-platform integration (courier assignment, delivery-zone-based menu restriction) is out of scope, not fabricated |
| IAM | **Real, verified** — RBAC additions specified (redesign doc §12), no new isolation mechanism |
| Notification | **Confirmed: settings/preferences only exist (`notification-settings.model.js`), zero delivery mechanism.** Menu's Automatic Disable/Enable (§4.1) and Cost/Margin Alerts (`MENU_COST_CONTROL_ARCHITECTURE.md`) are designed to **emit Domain Events** that a future Notification-delivery service would consume — this redesign does not build that delivery service (confirmed absent, correctly not fabricated), only ensures Menu's own events are real and named so that service has something to subscribe to when it's eventually built |
| Audit | **Confirmed: only request-level `audit-log` exists, no business-entity diff capture.** Recipe's version chain (§6 above) is this redesign's answer for the one entity where history matters most; not a platform-wide audit-trail redesign (that's a cross-cutting concern already named as out-of-scope in the Supply Chain audits) |
| Reporting/Analytics | **Confirmed: no dedicated domain exists anywhere in the platform**, ad-hoc per-domain services are the established pattern (matching Supply Chain's `VendorLedgerService`). Menu Engineering (`MENU_ENGINEERING_ARCHITECTURE.md`) follows this exact same established pattern — a new read-side service, not a new "Reporting domain" |
| Loyalty | **Confirmed real touchpoint**, `LoyaltyReward.product` — this redesign introduces no new Loyalty coupling |
| Subscriptions | **Confirmed: reserved placeholder only on `Brand` (`subscription: {plan,status,trialEndsAt}`), explicitly commented as unbuilt.** Not relevant to Menu at all in its current (non-functional) state — correctly out of scope, not fabricated as an integration point |

---

## 8. What This Document Deliberately Does Not Design

Per the same discipline applied throughout this engagement: Franchise governance (§1), a real
Notification-delivery service, a Reporting domain, and Subscription/billing are all named as real,
confirmed-absent capabilities this redesign depends on or would benefit from, but does not design —
designing them properly is each a distinct architecture effort, and bolting a shallow design for
any of them onto this document would violate the explicit "do not fabricate capabilities" rule
governing this phase.
