# Menu, Recipe, Combo, Modifier & Kitchen Platform — Redesign

**Status: design only. No code written.** Read `MENU_PRODUCTION_PLATFORM_AUDIT.md` first — every
decision below is justified there, not re-argued here. Recipe/Production concepts already
redesigned in `PRODUCTION_MANUFACTURING_DOMAIN_REDESIGN.md` (prior session) are referenced, not
re-derived. Implementation has not started.

**Governing principle, stated once and applied throughout**: every gap in this domain traces back
to one of two roots — (1) no cost field anywhere in the Product/Recipe chain, or (2) no execution
logic reads the otherwise-reasonable data shapes that already exist (combo groups, ticket
splitting-by-section). The redesign therefore spends most of its weight on (1) a cost/cache
mechanism reused everywhere, and (2) service-layer logic — not on inventing new schema where a
reasonable one already exists.

---

## 1. Product Architecture

### 1.1 Formalize `productKind`, don't replace `productType`

Add `productKind` enum: `["item", "size", "addon", "modifier", "combo", "service"]`, additive
alongside the existing `productType` (`normal`/`addon`) rather than replacing it — `productType`
already has live meaning (addon-vs-normal drives extras eligibility today) and breaking it would
be an unjustified compatibility risk for a one-field clarification. `productKind` is the field new
logic (pricing rules, cost rollup eligibility, RBAC-relevant behavior) branches on going forward;
`isSizeGroup`/`isCombo`/`hasExtras` booleans remain as fast-read flags derived from `productKind`
at write time (kept in sync in `beforeCreate`/`beforeUpdate`, not removed — multiple existing
query paths likely already filter on them).

**Lifecycles, per kind** (using the existing `status` enum `active/inactive/out_of_stock` as the
substrate, no new state machine needed for most kinds):
- **item** (a directly-sellable dish/drink, sized or not): `active` ⇄ `inactive` (manual), →
  `out_of_stock` (system-set when `Recipe`'s cheapest-common-ingredient hits zero, once inventory-
  availability checking is wired — §6.3).
- **size**: same lifecycle as `item`, scoped by its `parentProduct`'s own status (a size cannot be
  `active` if its parent is `inactive` — a real, currently-unenforced invariant).
- **addon/modifier**: same lifecycle; additionally cannot be sold standalone if referenced only via
  `extras[]`/`ModifierOption` (i.e. `isSellable` can be `false` for a pure kitchen-instruction
  modifier with no independent price — see §4).
- **combo**: `active` requires every referenced `comboGroups[].items[].product` to itself be
  `active` — validated at read/order time, not enforced as a write-time constraint (a component
  going `inactive` shouldn't retroactively invalidate the combo definition, only block it from
  being ordered — same reasoning already applied elsewhere in this platform to "read-time
  sufficiency check, not write-time lock").
- **service** (genuinely new — cover charge, delivery fee, corkage): no `Recipe`, no inventory
  deduction, no kitchen routing (`preparationSection` becomes optional only for this kind — the
  one exception to the otherwise-required field).

### 1.2 Cost fields (the one change every other section depends on)

Add to `Product`: `costFields: { estimatedCost: Number, costCalculatedAt: Date, costBreakdown:
[{ source: enum["recipe","modifier","combo"], amount: Number }] }` — Tier 2 of the platform's
already-approved three-tier costing model (`DATABASE_ARCHITECTURE_REDESIGN.md`), applied to Menu
for the first time. **Never independently authoritative** — always recalculated from `Recipe`'s
ingredient costs (which read `Inventory.avgUnitCost`, the real Tier-1 SSOT, exactly as designed for
Production). Recalculated on: `Recipe` save, ingredient cost change (a scheduled/event-driven
refresh, §7), or on-demand via a `previewCost()` read (mirroring the equivalent method already
specified for `ProductionRecipeService` in the companion redesign).

### 1.3 The missing `Product`→`StockItem` direct-sale fallback

Add optional `directStockItem` → `StockItem` (nullable), used only when a `Product` has no
`Recipe` at all (a bottled drink, a packaged snack) — resolves the confirmed gap
(`AUDIT.md §3.6`) where such items have zero stock-deduction path. When both `Recipe` and
`directStockItem` are absent, the product cannot transition to `active` — this closes the gap by
making "how does this get deducted from inventory" a validated invariant, not a silent omission.

---

## 2. Product Sizes — Extend, Don't Replace

Per `AUDIT.md §2.1`, the existing "a size is a full Product" pattern already delivers SKU/barcode/
price/tax/kitchen-routing per size for free. The redesign adds exactly the fields genuinely
missing, directly on `Product` (inherited by every size since sizes are Products):

- `nutrition: { calories, proteinGrams, carbGrams, fatGrams, allergens: [String] }` — optional,
  new. Size-specific because each size is its own document.
- `preparationTimeMinutes` — optional override; falls back to
  `preparationSection.averagePreparationTime` when unset (a real, currently-nonexistent per-item
  prep time, closing the confirmed gap that prep time only exists at section granularity today).
- Cost (`§1.2`) and Recipe are already per-size by construction (`Recipe.product` is a 1:1 ref, and
  each size is a distinct `Product`) — **no change needed**, this was already correct.
- `productionYield`: **not** added to `Product`/size directly — a size is sold, not manufactured;
  yield belongs to the `ProductionRecipe` that produces any semi-finished `StockItem` a size's
  `Recipe` might consume, exactly as already designed in the companion Production redesign. Adding
  a parallel yield concept on Product would duplicate that, not extend it.

**"Custom Sizes"**: no new mechanism — a brand adds another `Product` to an existing
`isSizeGroup`'s `sizes[]` array with whatever `sizeLabel` it wants (`"Party Size"`, `"XXL"`); the
size system is already open-ended by construction, nothing about "custom" requires new schema.

---

## 3. Product Variants (Flavor, Bread, Cheese, Spice Level)

**Genuinely new** (per `AUDIT.md §1.3`, confirmed clean slate). The critical design decision: **a
Variant is not a Modifier and must not be forced into the existing `extras[]`/whole-Product
pattern**, because a variant option (e.g. "Spice Level: Hot") is typically:
- Mutually exclusive within its group (you pick exactly one spice level, not zero-to-many).
- Frequently zero-price (spice level rarely changes the bill).
- Frequently recipe-impacting without being independently sellable (choosing "Hot" swaps a chili-
  paste `StockItem` quantity in the underlying `Recipe`, but "Hot" itself has no SKU/barcode/tax
  rate of its own).

Forcing every spice level into a full sellable `Product` (as `extras[]` currently would require)
is the exact architectural mistake the prompt's own "sizes must not be simple price modifiers"
concern is warning against, just inverted — here the risk is over-modeling a lightweight attribute
as a heavyweight sellable entity, not under-modeling a heavyweight entity as a cheap modifier.

**New model: `ProductVariantGroup`** (e.g. "Spice Level"), attached to a `Product` (or shared
across a `MenuCategory` — e.g. every grilled item offers the same spice-level choices, avoiding
per-product duplication):
```
brand, branch, name(Map), appliesTo: enum["product","category"], product?, category?,
selectionType: enum["single","multiple"] (single = exactly one, e.g. Spice Level;
                                            multiple = zero-to-many, e.g. Bread Type if offering
                                            "add extra bread" is meaningful — rare but real),
isRequired: Boolean,
options: [{
  name(Map), priceDelta: Number (default 0), costDelta: Number (default 0, cached from recipeImpact),
  recipeImpact: [{ stockItem→StockItem, quantityDelta: Number, action: enum["add","remove","substitute"] }],
  isDefault: Boolean,
  displayOrder: Number,
}]
```
`recipeImpact` is the mechanism that makes a variant selection actually change what's consumed at
kitchen-execution time — at order confirmation, the selected option's `recipeImpact` entries are
applied as deltas against the base `Recipe`'s ingredient list before that line's consumption
posts, exactly one small, well-scoped piece of new execution logic (not a new posting mechanism —
still ends at the same `postDocument()` call the base Recipe consumption already uses, per the
companion redesign's core principle of reusing the existing Inventory Posting Engine).

---

## 4. Modifier Platform (Redesign, Formalize)

**New model: `ModifierGroup`**, replacing `extras[]` as the canonical mechanism going forward
(`extras[]` retained, read-only/deprecated, for backward compatibility with existing Product
documents until a migration converts them — not deleted, per this engagement's consistent
"additive, never destructive" schema-change discipline):

```
brand, branch, name(Map), product→Product (the item this group applies to; nullable + category→
  MenuCategory for a category-wide modifier set, mirroring ProductVariantGroup's appliesTo pattern),
isRequired: Boolean,
minSelection: Number, maxSelection: Number (generalizes comboGroups' already-proven shape),
allowMultipleOfSameOption: Boolean (e.g. "Extra Cheese x2"),
freeAllowance: Number (default 0 — how many selections are included in the base price before
  extraCharge kicks in; directly satisfies the prompt's "Free Allowance" requirement),
options: [{
  name(Map),
  linkedProduct: →Product (nullable — set when the option IS a sellable addon with its own price/
    cost/SKU, e.g. "Add Bacon"; null for pure kitchen-instruction options),
  extraCharge: Number (default 0, ignored if linkedProduct is set — linkedProduct's own price is
    used instead, avoiding two competing price sources for the same option),
  recipeImpact: [{ stockItem→StockItem, quantityDelta, action: enum["add","remove","substitute"] }]
    (same mechanism as Variant options, §3 — a "No Onions" option has extraCharge:0,
     linkedProduct:null, and one recipeImpact entry with action:"remove"),
  kitchenInstruction: String (e.g. "well done", printed on the ticket, no cost/inventory effect),
  nutritionDelta: { calories, proteinGrams, carbGrams, fatGrams } (nullable, for aggregation, §1.2-
    adjacent — mirrors Product.nutrition's shape),
  parentModifierGroup: →ModifierGroup (nullable — enables **nested modifier groups**, e.g. "Add
    Cheese" as an option, whose own selection reveals a nested "Cheese Type" group; resolved
    recursively at order time, bounded-depth like the Recipe cycle-detection check in the
    companion redesign, same reasoning: real menus nest 2-3 levels, not arbitrarily),
  isDefault: Boolean, displayOrder: Number,
}]
```

This single model directly satisfies every modifier requirement named in the prompt: Required/
Optional (`isRequired`), Multiple Selection (`maxSelection>1` + `allowMultipleOfSameOption`), Max/
Min Selection (`minSelection`/`maxSelection`), Nested Modifier Groups (`parentModifierGroup`),
Extra Charge (`extraCharge`/`linkedProduct.price`), Free Allowance (`freeAllowance`), Inventory
Consumption (`recipeImpact`), Kitchen Instructions (`kitchenInstruction`), Recipe Impact
(`recipeImpact`), Cost Impact (derived from `recipeImpact`'s ingredient costs or `linkedProduct`'s
cost), Nutrition Impact (`nutritionDelta`).

**Migration path from `extras[]`** (not performed in this design phase): a one-time script
converts each `Product.extras[]` entry into a `ModifierGroup` with a single option whose
`linkedProduct` is the extra's `product` — mechanical, no business-logic reinterpretation needed
since the semantics map 1:1.

---

## 5. Combo Engine

Keep `comboGroups[]`'s embedded shape (per `AUDIT.md §2.2` — it's already close to right); extend
it, and — the actually load-bearing change — **build the execution logic that currently doesn't
exist at all**:

### 5.1 Schema extension (additive to `comboGroups[].items[]`)
```
priceDelta: Number (default 0) — upgrade/upcharge for this item within its group (satisfies
  "upgrade pricing," e.g. +$1 to swap regular fries for onion rings),
isDefault: Boolean — pre-selected option when the group loads,
substitutable: Boolean (default true) — whether this item can be swapped for another in the same
  group at zero extra logic cost beyond selecting a different `items[]` entry (this is what "support
  substitutions" reduces to, once the group already models multiple candidate items — no new
  mechanism needed, just confirming the existing shape already covers it once combined with §5.2's
  execution logic).
```
Add at the combo `Product` level: `comboPricingMode: enum["fixed","sumOfParts"]` — `fixed` means
`Product.price` is the combo's own price regardless of which items are selected (the common case,
"combo meal $9.99"); `sumOfParts` means the price is computed from selected items' individual
prices plus any `priceDelta` upcharges (rarer, but real for "build your own" combos where there's
no single fixed price). This directly resolves the prompt's "Bundle Pricing" requirement without
inventing a separate pricing-rule engine.

### 5.2 Execution logic (the genuinely new, high-value work)

At order-confirmation time, a combo line item is **expanded** into its resolved constituent
selections before kitchen ticket creation and inventory consumption — this is the single piece of
service logic that closes the two most consequential combo gaps at once (kitchen routing and
inventory consumption, both confirmed absent in the audit):
1. For each `comboGroups[]`, resolve the customer's selection (or `isDefault` items if unselected,
   for a required group) into a flat list of `{product, quantity}`.
2. Each resolved item becomes its own `PreparationTicket` line, routed via *that item's own*
   `preparationSection` — not the combo container's (the combo `Product` itself may not even need
   a `preparationSection` once every real line comes from its resolved components; kept as an
   optional "packaging/assembly" station default for combos that need a final assembly step).
3. Each resolved item's own `Recipe` drives inventory consumption exactly as a standalone sale of
   that item would — **no new consumption mechanism, reuses the same posting path every other item
   already uses.**
4. Combo cost = Σ (resolved item's `costFields.estimatedCost` × quantity); combo profit =
   `Product.price` (or the `sumOfParts` calculation) − combo cost — straightforward once §1.2's
   cost caching exists on every constituent Product.
5. Nutrition aggregation = Σ (resolved item's `nutrition` fields × quantity) + any selected
   modifier `nutritionDelta`s — same pattern, no new mechanism.

**Combo discount tracking**: when `comboPricingMode: "fixed"`, the difference between Σ(resolved
items' standalone prices) and the combo's fixed price is the combo discount — computed and stored
on the `OrderItem`/ticket line at order time (a real number, not re-derivable later once individual
item prices may have changed), the same "snapshot at time of sale" principle
`DATABASE_MODELS_REVIEW.md` already praised `PreparationTicket` for applying to price/extras.

---

## 6. Kitchen Routing

### 6.1 Station-type taxonomy (schema addition, closes the confirmed gap)
Add `PreparationSectionConfig.stationType` enum: `["grill","fryer","bakery","dessert","drinks",
"coffee","salad","hotKitchen","coldKitchen","productionKitchen","packaging","other"]`, default
`"other"` — additive, does not replace the existing free-text `name`/`code` (a brand still names
its own sections; `stationType` is the structural classification reports/analytics/future routing
rules can rely on instead of parsing free text).

### 6.2 Multi-station routing via expansion, not a schema change to Product

Rather than changing `Product.preparationSection` from a single required ref to an array (a
bigger, riskier change touching every existing query that assumes one section per product), the
redesign achieves multi-station routing the same way Combo achieves it (§5.2): **a single sellable
item still routes to exactly one section** (its own `preparationSection` — this remains correct
and unchanged for the overwhelming majority of items), and multi-station coverage for a
*compound* purchase (a combo, or an item with modifier options carrying their own `linkedProduct`
routed elsewhere) emerges from expanding that purchase into its resolved components at ticket-
creation time, each keeping its own section. This is a deliberate, justified decision to avoid
changing a stable, widely-depended-on field's cardinality when the same outcome is achievable by
building the (already-missing) expansion logic instead.

### 6.3 Auto-ticket-creation from Order (the single most consequential kitchen fix)

New service logic in the Preparation domain (`PreparationTicketService`), triggered by Order
confirmation (a domain-event subscription — `DomainEvent.ORDER_CONFIRMED`, new, added in the same
change that ships this publisher, per the platform's established event-catalog convention):
1. Resolve every `OrderItem` into its final `{product, quantity, selectedModifiers, selectedVariant}`.
2. Expand any combo items per §5.2.
3. Group the fully-resolved line items by `preparationSection`.
4. Create one `PreparationTicket` per distinct section (the schema already supports this — the
   unique `{brand,branch,order,ticketNumber}` index already anticipates multiple tickets per
   order — only the creation logic was missing).
5. Compute `expectedReadyAt` from `preparationTimeMinutes` (§2) falling back to
   `PreparationSection.averagePreparationTime`.

### 6.4 Priority and sequencing (new, minimal)

Add `PreparationTicket.priority` enum `["normal","rush","hold"]` (default `"normal"`) and
`sequenceGroup` (Number, nullable — tickets sharing a `sequenceGroup` within one order are held
until the lowest-numbered group in that order reaches `READY`, giving "fire the dessert after the
entrée" sequencing without a full workflow-engine build-out — a deliberately minimal mechanism, not
a general-purpose scheduler). Parallel preparation is simply the *absence* of a shared
`sequenceGroup` — the default, requiring no new logic to support, only the sequential case is new.

---

## 7. Recipe Platform (Extends the Companion Redesign)

Everything in `PRODUCTION_MANUFACTURING_DOMAIN_REDESIGN.md` §4/§5 (Sell Recipe = Tier 1, Manufacturing
Recipe = Tier 2, nested BOMs, cycle detection, cost rollup via the existing Inventory Cost Engine)
applies unchanged. This document adds only what's genuinely Menu-specific and not already covered
there:

- **Alternative Ingredients**: add `Recipe.ingredients[].alternatives: [{ stockItem→StockItem,
  costDelta }]` — a substitute used when the primary ingredient is unavailable (read-time fallback
  at consumption-posting, not a separate recipe version); satisfies "Alternative Ingredients"
  without duplicating the whole Recipe document per substitution scenario.
- **Recipe Approval workflow**: add `status` enum `["Draft","PendingApproval","Approved","Archived"]`
  to `menu/Recipe` (currently version-less and status-less, unlike `ProductionRecipe` which already
  has real versioning) — a `TransitionGuard`-enforced state machine, reusing the exact mechanism
  already proven across every Supply Chain transactional document this engagement built. Only an
  `Approved` recipe feeds `costFields`/kitchen execution; `Draft`/`PendingApproval` recipes are
  visible to cost-preview tooling but don't affect what's actually sellable.
- **Recipe Versioning/History**: migrate `menu/Recipe` onto the same `version` +
  partial-unique-`isActive`-index pattern already built for `ProductionRecipe` (currently
  `menu/Recipe` has neither) — one mechanism, two consumers, not two competing versioning schemes.
- **Yield/Waste/Shrinkage/Portion Control**: `wastePercentage` already exists per ingredient on
  both Recipe tiers (confirmed, unused by any calculation today); Portion Cost = `estimatedCost /
  numberOfMeals` (already computable once `costFields` exists, §1.2) — no new fields needed beyond
  what §1.2/companion-redesign already specify.

---

## 8. Cost Control Platform

Every cost concept named in the prompt, mapped to where it's computed and from what — restating
`AUDIT.md §3.8`'s finding that this is one root mechanism with many report-level consumers, not
eleven separate subsystems:

| Concept | Computed from | New storage? |
|---|---|---|
| Theoretical Cost | `Recipe.ingredients[].amount × StockItem.avgUnitCost` | No — `costFields` cache only |
| Actual Cost | `ProductionRecord`'s actual materials-used cost (companion redesign §5.1), for items sourced from a `ProductionRecipe` | No |
| Recipe/Portion/Modifier/Combo Cost | §1.2, §7, §4, §5.2 respectively | No — all cache-and-derive |
| Production Cost | Companion redesign §5.1 | No |
| Labor/Overhead Cost | `ProductionRecord.operationCost[]` (companion redesign, typo-fixed) | No |
| Packaging Cost | `Recipe`/`ModifierGroup` ingredients where `StockItem.itemType === "packaging"` (existing field, reused) | No |
| Waste/Shrinkage/Yield Loss | `wastePercentage` (Recipe) / Yield Variance (companion redesign §5.3) | No |
| Price/Purchase Variance | Already designed, Purchasing domain (`SUPPLY_CHAIN_FINAL_AUDIT.md`) — Menu consumes, doesn't compute | No |
| Profit/Contribution/Gross Margin, Food Cost % | `Product.price − costFields.estimatedCost`, ratios thereof | No — pure report-time ratios |

**No new cost-calculation engine** — every row above reduces to reading `costFields` (or the
companion redesign's `ProductionRecord` cost breakdown) and doing arithmetic at report time. The
one piece of genuinely new infrastructure is the **cache-refresh trigger**: a scheduled job (daily,
brand-configurable) plus an event-driven refresh on `Recipe`/`ProductionRecipe` save, both calling
the same `previewCost()`-style calculation and writing the result into `costFields` — one small,
shared utility, not a per-concept implementation.

---

## 9. Menu Engineering

Purely a **read/report layer** — no new transactional writes beyond what §1.2/§8 already produce.
Given `Product.costFields.estimatedCost` (§1.2) and existing `OrderItem` sales-count history
(already real data, Sales domain, unmodified by this redesign):

```
contributionMargin = price - estimatedCost
popularity = salesCount over the analysis window ÷ average salesCount across the category
             (a relative measure, matching the standard menu-engineering definition, not an
             absolute threshold a brand would have to configure)
classification = matrix(contributionMargin relative to category average, popularity):
  high margin + high popularity  → Star
  low margin  + high popularity  → Plowhorse
  high margin + low popularity   → Puzzle
  low margin  + low popularity   → Dog
ABC classification = Pareto ranking by revenue contribution (standard 80/15/5 banding)
```
Computed on-demand for small menus, cached (same mechanism as §8's cost cache) for brands with
large catalogs/high query volume — a scalability decision named explicitly per `AUDIT.md §3.10`,
not deferred silently. **This is presented as a management/reporting tool, not a customer-facing
menu feature** — no `Product`-facing field is written by this calculation; it lives entirely in a
new read-side `MenuEngineeringService`, matching the platform's established pattern of read-side
services that query models directly rather than mutate them (e.g. `VendorLedgerService` from the
Supply Chain work).

---

## 10. Customer Ratings & Reviews

Extends the existing, schema-ready-but-logic-empty `ProductReview` (§ `AUDIT.md §1.5/§3.9`):

- **Enforce one-review-per-product-per-order**: add the currently-missing
  `{order, "items.product"}` uniqueness constraint the doc comment already claims but never
  implemented.
- **Dedicated moderation endpoints**: `approve({id, actorId})`/`reject({id, actorId, reason})`,
  `TransitionGuard`-enforced (`PENDING → APPROVED|REJECTED`, both terminal), closing the confirmed
  self-approval gap — generic `PUT /:id` update should explicitly exclude the `status` field going
  forward (validation-layer fix, not a new mechanism).
- **Photos**: add `photos: [String]` (URLs), optional.
- **Verified-purchase enforcement**: already structurally present (`order` is `required: true`) —
  the fix is the uniqueness constraint above, not new fields.
- **Aggregate rating on Product**: add `Product.ratingAggregate: { averageRating, reviewCount,
  bayesianScore }`, recalculated on every review `approve()`/`reject()` transition (event-driven,
  same cache-refresh pattern as §8's cost cache — one shared discipline, two domains). **Cache
  only** — `ProductReview` documents remain the SSOT; this field exists purely for fast menu-page
  reads, exactly the same justification already used for `StockItem.lastPurchaseCost`.
- **Bayesian rating**: `bayesianScore = (v/(v+m))×R + (m/(v+m))×C` where `v` = this product's
  review count, `R` = its average, `C` = the brand's overall average across all products, `m` = a
  brand-configurable minimum-review threshold (new `MenuSettings.ratingConfidenceThreshold`,
  policy-driven per this platform's consistent "settings, not hardcoded constants" convention) —
  standard formula (the same one popularized by IMDB's top-250 ranking), not a novel design,
  correctly used here as a known-good pattern rather than reinvented.
- **Trending/Top-Rated**: report-level queries over `ratingAggregate`, no new storage.
- **Fraud detection**: rate-limit reviews per customer per day (new
  `MenuSettings.maxReviewsPerCustomerPerDay`, policy-driven) plus the order-verification constraint
  already structurally present — a lightweight, honest Phase 1 scope; sophisticated fraud
  ML/heuristics are named as real future work, not fabricated as built.
- **Explicit boundary, enforced by code review discipline going forward, not by a new technical
  mechanism**: no Inventory or Accounting service may ever read `ProductReview`/`ratingAggregate` —
  ratings influence analytics and display only, exactly as the prompt requires.

---

## 11. POS / Ordering-Channel Integration

Named per the prompt's explicit list, scoped honestly (per `AUDIT.md §5`'s stated limits — not
analyzed to the same schema-read depth as the core Product/Recipe/Combo/Modifier/Kitchen work):

- **POS, QR Ordering, Online Ordering, Delivery**: all consume the same `Product`/`ModifierGroup`/
  `ProductVariantGroup`/Combo-expansion (§5.2) read surface — this redesign introduces no
  channel-specific product representation, meaning a single menu definition correctly serves every
  channel without duplication (already the case for `Product` today; the redesign preserves it by
  not introducing a parallel per-channel model).
- **CRM/Loyalty**: unaffected by this redesign beyond `ratingAggregate` (§10) being a plausible
  future input to a "trending item" loyalty campaign — no new coupling introduced.
- **Promotions**: extend `Promotion.appliesTo` with a `"CATEGORY"` value plus `applicableCategories:
  [→MenuCategory]` (closes the confirmed gap, `AUDIT.md §1.6`, of not being able to target a whole
  category) — small, additive, no redesign of the Promotion engine itself.
- **Coupons**: genuinely absent, genuinely out of this redesign's scope (a coupon-code-entry/
  validation engine is a distinct enough concern — customer-facing code redemption, fraud/abuse
  limits, single-use tracking — that designing it properly deserves its own focused pass, not a
  bolt-on paragraph here; named as real future work per the prompt's own "do not fabricate" rule).

---

## 12. Security

- **New RBAC resources** (additive to `RESOURCE_ENUM`): `"ProductVariantGroups"`,
  `"ModifierGroups"`, and reuse of the companion redesign's `"ProductionOrders"`/
  `"ProductionRecipes"` — no `"Combo"` resource needed since combos remain `Product` documents
  (`isCombo: true`), governed by the existing `"Products"` resource, consistent with treating combo
  as a `Product` variant rather than a parallel entity.
- **Every new route** follows the platform's single established chain
  (`authenticateToken → authorize → checkModuleEnabled → validate → controller`) — no exceptions,
  matching the pattern verified correct across every Supply Chain router this engagement built and
  the two broken-router lessons (`StockCategory`, `PaymentMethod`) that make deviation from this
  chain a confirmed, not theoretical, risk.
- **`ProductReview` approve/reject** are `TransitionGuard`-enforced and require a distinct
  authorization action (`"ProductReviews:moderate"`, not just `"update"`) — closing the confirmed
  self-approval gap at the RBAC layer, not just by removing the field from generic update.
- **State transitions** (Recipe approval, ticket status, review moderation) use the atomic-claim
  `findOneAndUpdate` pattern from the first line of implementation — inherited directly from the
  Supply Chain domain's hard-learned TOCTOU lesson (`SUPPLY_CHAIN_PRODUCTION_RELEASE.md` §1), not
  relearned here.
- **Brand/branch isolation**: every new model (`ProductVariantGroup`, `ModifierGroup`) uses the
  same `brandScoped`/`branchScoped` `BaseRepository` options as every existing model in this
  domain — no new isolation mechanism, straightforward application of the existing one.

---

## 13. Phasing

- **Phase 1 (highest operational leverage, buildable now)**: `costFields` on `Product` + the
  shared cost-cache-refresh utility (§8) — unlocks Menu Engineering, Food Cost %, and margin
  reporting all at once, the single highest-value change in this entire redesign. Alongside it:
  auto-ticket-creation from Order (§6.3) — the single most consequential kitchen fix, independent
  of the cost work, so parallelizable.
- **Phase 2**: `ModifierGroup`/`ProductVariantGroup` (§3/§4) + combo execution logic (§5.2) —
  depends on Phase 1's cost caching to price correctly.
  `ProductReview` moderation/aggregate-rating (§10) — independent, can run in parallel with Phase 2.
- **Phase 3**: Menu Engineering report service (§9, depends on Phase 1's cost data plus enough
  sales history to be meaningful); station-type taxonomy + priority/sequencing (§6.1/§6.4); Recipe
  approval workflow/versioning migration (§7).
- **Phase 4+ (named, correctly deferred)**: Coupon engine, category-level Promotion targeting
  beyond the minimal enum extension already specified, deep POS/QR/Delivery channel-specific work,
  photo-moderation/fraud ML for reviews.

Every phase gated on the same verification discipline this engagement has applied consistently:
full regression, typecheck, live boot, RBAC/route smoke tests before the next phase begins.
