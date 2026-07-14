# Menu, Recipe, Combo, Modifier & Kitchen Platform — Enterprise Audit

**Status: analysis only. No code written.** Companion to
`MENU_PRODUCTION_PLATFORM_REDESIGN.md` (the redesign itself) and
`PRODUCTION_MANUFACTURING_DOMAIN_REDESIGN.md`/`_IMPLEMENTATION_PLAN.md` (the Manufacturing/Recipe
redesign from the prior session, which this audit builds on rather than repeats for the Recipe/
Production overlap). Every finding below is from direct source read this session (full model
files read in full, not summarized from memory or from prior docs) or from two pre-existing audit
documents (`ARCHITECTURE_REVIEW.md`, `DATABASE_MODELS_REVIEW.md`) whose Menu-domain findings were
cross-checked against current source rather than trusted blindly.

---

## 1. What Already Exists (Verified From Source)

### 1.1 Product — the sellable-item SSOT

`modules/menu/product/product.model.js` (180 lines, read in full). One `Product` collection
serves five overlapping roles today: base menu item, size variant, addon, combo container, and
(implicitly) service item. Full field inventory:

- **Identity**: `brand`, `branch`, `name`/`description` (i18n Map), `image`, `sku`, `barcode`
  (both brand-scoped unique-sparse).
- **Category/Kitchen**: `category`→`MenuCategory`, `preparationSection`→`PreparationSection`
  (**required, single reference — a product routes to exactly one kitchen station**).
- **Type**: `productType` enum `["normal","addon"]` only — no `"size"`, `"combo"`, `"service"`
  value, despite those being real, distinct operational concepts already present via other fields.
- **Size system**: `parentProduct` (back-ref), `isSizeGroup` (Boolean), `sizeLabel` (i18n Map),
  `sizeOrder`, `sizes[]` (array of `Product` refs). **A size is a full, separate `Product`
  document** — not a sub-schema, not a modifier. This is a real, if under-leveraged, strength (see
  §2.1).
- **Extras**: `hasExtras`, `extras[]` = `{product→Product, quantity, minQuantity, maxQuantity}` —
  an "extra" is just another whole `Product` document.
- **Combo**: `isCombo`, `comboGroups[]` = `{required, name(Map), minSelection, maxSelection,
  items[{product→Product, quantity}]}` — embedded directly in the combo `Product`, no separate
  `Combo` model.
- **Pricing**: `price`, `discount`, `priceAfterDiscount`, `discountFrom/To`, `isTaxable`,
  `taxRate`→`TaxConfig`.
- **Status**: `status` enum `["active","inactive","out_of_stock"]`, `isSellable`, `displayOrder`.
- **Absent, confirmed by full-schema read**: no cost field of any kind, no nutrition/calorie
  fields, no preparation-time field, no aggregate rating field, no direct `StockItem` link.

### 1.2 Recipe (Tier 1 — Product→StockItem) and ProductionRecipe (Tier 2 — StockItem→StockItem)

Fully covered in `PRODUCTION_MANUFACTURING_DOMAIN_REDESIGN.md` §1.1 (prior session) — not
re-derived here. Restated only as the load-bearing fact this audit depends on: **neither Recipe
model has a cost field**, and the two are structurally disconnected despite representing two tiers
of the same real process.

### 1.3 No Modifier, Combo, or Variant model exists

Confirmed by repo-wide, case-insensitive search across `modules/**`: zero hits for a standalone
`Modifier` model. The only "combo" hit is `Product`'s own embedded `isCombo`/`comboGroups`. Zero
hits for "variant" in `modules/menu/**` or `modules/inventory/**` beyond incidental unrelated word
matches elsewhere in the codebase. **This is a genuinely clean slate for Modifier/Variant as
distinct concepts** — no existing implementation to reconcile with, unlike Recipe/Production which
required rewiring existing (if dead) code.

### 1.4 Kitchen routing — `PreparationSection` and `PreparationTicket`

`modules/preparation/preparation-section/preparation-section.model.js` (model name is literally
`PreparationSectionConfig`, folder named `preparation-section` — a naming inconsistency worth
fixing, not just noting): `name`(Map), `code`, `averagePreparationTime` (section-level minutes,
default 10), `maxParallelTickets`, `allowPartialDelivery`, `isDeliveryRelevant`, `autoAssignChef`,
`requireConfirmationBeforeSend`, `allowRejectTickets`. **No station-type taxonomy** (no
grill/fryer/bakery/drinks enum) — a section's "type" is purely whatever free-text name/code a
brand chooses.

`modules/preparation/preparation-ticket/preparation-ticket.model.js` (204 lines, read in full):
`ticketNumber`, `order`→`Order`, `preparationSection`→`PreparationSection` (**one ticket = one
section — ticket-splitting-by-section already exists as a schema shape**), `preparationStatus`
enum `PENDING|PREPARING|READY|CANCELLED|REJECTED`, `deliveryStatus` enum
`WAITING|READY_FOR_HANDOVER|HANDED_OVER`, `deliveryPolicy` enum `IMMEDIATE|WAIT_ALL` (the closest
existing concept to "sequential vs. parallel," but it governs *handover timing*, not *preparation
sequencing*), `items[]` (`orderItemId`, `product`, `quantity`, `notes`, `extras[]` — **no combo-
group breakdown, no size-resolution metadata, zero Recipe/StockItem awareness**), `handoverEvents[]`
(audit trail). **No priority field exists anywhere.**

Per `ARCHITECTURE_REVIEW.md:595` (re-confirmed by this session's direct read, not just trusted):
*"Status: data model only — no auto-ticket-creation from Order, no status-transition enforcement,
no waiter notification."* The ticket-splitting-by-section *schema* exists; the *service logic* that
would actually create one ticket per distinct section from a multi-item order does not.

### 1.5 `ProductReview` — schema-ready, zero business logic

`modules/menu/product-review/product-review.model.js` (125 lines, read in full): `order`→`Order`
(required), `reviewSource` enum, `referenceId` (dynamic ref), `items[]` (`{product, rating 1-5}`
per product), `serviceQuality` (1-5), `comment`, `relatedSalesReturn`, `status` enum
`PENDING|APPROVED|REJECTED`, `reviewedBy`/`reviewedAt`. Indexes: `{items.product}`,
`{brand,branch,status}`, `{serviceQuality:-1}`.

**Confirmed gaps**: no photo field; the doc comment claims "one review per product per order" but
**no unique index or service-layer check actually enforces it** (verified: no such index exists,
service is pure generic CRUD); no aggregate rating field on `Product`; no Bayesian/weighted rating
logic; no fraud-detection concept; **no dedicated approve/reject endpoint** — the service
(`product-review.service.js`) is `new AdvancedService(...)` with zero custom methods, and the
controller has zero overrides — moving `status` to `APPROVED` happens only via the generic
`PUT /:id`, meaning any actor with generic update permission on `ProductReviews` can self-approve
their own review, a real (if narrow) integrity gap.

### 1.6 Promotion — Product-adjacent, no Coupon model

`modules/sales/promotion/promotion.model.js` (150 lines, read in full): `appliesTo` enum
`ORDER|PRODUCT|BUY_X_GET_Y`, `type` enum `PERCENTAGE|FIXED`, `xProducts[]`/`yProducts[]`
(Buy-X-Get-Y), `applicableProducts[]`, `minOrderAmount`, `autoApply`, `activeFrom/To`,
`usageLimit`, `usagePerCustomer`. References `Product` directly in three places; **no reference to
`MenuCategory`** (a brand can't promote "20% off all Desserts" without listing every dessert
Product individually — a real, if narrow, modeling gap). **No `Coupon` model exists anywhere** in
the codebase (confirmed by search) — `Promotion.autoApply`/`usageLimit` suggest coupon-like
behavior was intended but a distinct code-entry mechanism was never built.

### 1.7 RESOURCE_ENUM coverage

`modules/iam/role/role.model.js`: only `"Products"` and `"ProductReviews"` exist among the
concepts this audit covers. **No `Combo`, `Modifier`, `Variant`, or `Rating` RBAC resource
entries** — any new first-class model in this space needs additive `RESOURCE_ENUM` entries plus
router RBAC wiring, following the exact pattern already proven correct across every Supply Chain
module built this engagement.

---

## 2. Honest Strengths (Not Just Gaps)

It would be dishonest to audit this domain as pure deficiency — three design decisions already in
the codebase are genuinely good and should be preserved, not replaced:

### 2.1 "A size is a full Product" is a stronger design than it looks

Because each size is a complete `Product` document, it *already* has its own SKU, barcode, price,
tax rate, category, kitchen-section routing, and sellability flag — for free, by construction, not
because anyone deliberately engineered "size as an operational entity." This means the prompt's
concern ("sizes must not be simple price modifiers... treat each size as an operational entity")
is **already structurally satisfied** for everything except cost, nutrition, and prep-time, which
are gaps in *Product as a whole* (no size has them because no Product has them), not gaps specific
to sizes. The correct fix (§3, redesign doc) is adding those fields to `Product` generally, not
replacing the size mechanism.

### 2.2 Combo groups are a reasonable structural starting point

`comboGroups[]`'s shape (named group, required flag, min/max selection, candidate items with
quantity) already covers Fixed Combo and a meaningful subset of Flexible Combo out of the box. What
it's missing (§3) is upgrade pricing per item, substitution semantics, and — critically — any
execution logic that expands a purchased combo into its constituent items for kitchen routing and
inventory consumption. The *data shape* is not the problem; the *absence of logic that reads it* is.

### 2.3 Multi-tenancy and i18n conventions are consistently applied

Every model audited here correctly uses `brand`/`branch` scoping and the platform's established
`Map<lang,string>` i18n pattern for display fields — no repeat of the global-uniqueness or
hardcoded-English defects found and fixed elsewhere in this engagement. The Menu domain's data
model is not the weak point; its business logic is (matching the pre-existing
`ARCHITECTURE_REVIEW.md` scorecard: Menu's Data Model ★★★★★, Business Logic ★★☆☆☆).

---

## 3. Gap Analysis (Honest, By Category — Nothing Fabricated)

### 3.1 Architecture gaps
- Five distinct concepts (base item, size, addon, combo, service) share one `productType` enum
  with only two values (`normal`/`addon`) — the type system doesn't actually distinguish what's
  structurally different about them.
- No Modifier/Variant model exists — every "modifier" today is forced to be a full sellable
  `Product`, which is architecturally wrong for non-priced attribute selections (spice level, "no
  onions") that shouldn't carry SKU/barcode/tax-rate baggage.
- Combo/extras logic lives entirely inside `Product`, with no service-layer execution — a combo
  can be *created* via CRUD but nothing *executes* it (no kitchen expansion, no inventory
  consumption, no cost calculation).

### 3.2 Business gaps
- No cost field anywhere in Product/Recipe/ProductionRecipe (restated from the prior session's
  Production audit — this is a Menu-domain-wide gap, not Production-specific).
- No Menu Engineering capability exists at all — no contribution-margin/popularity classification,
  no BCG-style matrix, no ABC ranking. Every input it needs (sales counts, once cost exists) is
  technically derivable from existing data, but zero code computes any of it.
- Promotion cannot target a whole `MenuCategory`, only enumerated Products.

### 3.3 Restaurant-specific gaps
- No nutrition/calorie/allergen data anywhere — a real gap for any brand subject to menu-labeling
  regulation or health-conscious marketing.
- No portion-control concept beyond `Recipe.ingredients[].amount` (theoretical, never compared
  against actual usage).

### 3.4 Kitchen gaps
- No station-type taxonomy on `PreparationSection` — the prompt's named stations (Grill, Fryer,
  Bakery, Dessert, Drinks, Coffee, Salad, Hot/Cold Kitchen, Production Kitchen, Packaging) have no
  modeled equivalent; a brand can name a section anything, with no structural guarantee it maps to
  a real kitchen role.
- No priority/sequencing concept for tickets beyond `deliveryPolicy`'s IMMEDIATE/WAIT_ALL handover
  timing — no support for "fire the dessert ticket only after the entrée is READY."
- **Auto-ticket-creation from Order does not exist** (confirmed, re-derived from source, matching
  the prior audit's finding) — this is the single most consequential kitchen gap, since it means
  the entire Order→Ticket handoff that every other gap in this section assumes exists is itself
  unbuilt.
- Combo items are never expanded into per-station ticket lines — a burger+fries+drink combo would,
  if tickets were even auto-created, produce one ticket line for the whole combo, not three lines
  routed to Grill/Fryer/Drinks respectively.

### 3.5 Production gaps
Fully covered by `PRODUCTION_MANUFACTURING_DOMAIN_REDESIGN.md` — not repeated here. This audit's
addition: Menu's `Recipe` (Tier 1) has no cost field either, so even once Production's cost engine
extension (already designed) prices a `ProductionRecipe`'s output `StockItem` correctly, nothing in
Menu propagates that price up to a `Product`'s sale price/margin calculation without the Tier-2
caching mechanism that redesign already specified but Menu hasn't implemented.

### 3.6 Inventory gaps
- `Product` has no direct `StockItem` fallback — a directly-sold item with no `Recipe` (e.g. a
  bottled drink) has no stock-deduction path at all (confirmed absent, matching
  `DATABASE_MODELS_REVIEW.md:320`'s prior finding, re-verified against current source).
- Combos and modifiers consume zero inventory today — no code deducts stock for anything a combo
  group or extra represents beyond what its own (separately-sold) Product might otherwise trigger.

### 3.7 Accounting gaps
- No COGS-relevant data flows from Menu to Accounting at all today — this is entirely downstream
  of the cost-field gap (§3.2) and the Production accounting integration already designed in the
  companion redesign document; Menu itself introduces no *new* accounting integration surface
  beyond supplying the per-Product cost input once it exists.

### 3.8 Cost gaps
- Every cost concept the prompt names (Theoretical, Actual, Recipe, Portion, Modifier, Combo,
  Production, Labor, Overhead, Packaging, Waste, Shrinkage, Yield Loss, Price/Purchase Variance,
  margins, Food Cost %) has **zero supporting data** today, because the one prerequisite fact
  (a cost field on Product/Recipe) doesn't exist. This is not eleven separate gaps — it is one
  root gap (no cost field, no rollup mechanism) with eleven downstream symptoms.

### 3.9 Security gaps
- `ProductReview`'s missing dedicated approve/reject endpoint means generic update permission is
  sufficient to self-approve a review — a narrow but real authorization-boundary gap.
- No RBAC resources exist yet for concepts this redesign will introduce (Combo, Modifier, Variant)
  — not a gap in *existing* code, but a requirement the implementation must satisfy from the first
  commit, per this engagement's now-consistent practice of never shipping an unmounted-and-later-
  found-broken router (the `StockCategory`/`PaymentMethod` lessons from the Supply Chain passes).

### 3.10 Scalability gaps
- Menu Engineering and rating-aggregation calculations, once built, must be cached/scheduled
  (matching the Tier-2 caching pattern already established for Product/Recipe cost) rather than
  computed live on every menu-page request — named here as a design constraint for the redesign
  document, not a currently-existing performance problem (since none of this exists yet to be slow).

---

## 4. Correction to a Prior Document

`ARCHITECTURE_REVIEW.md`'s domain-quality scorecard (§ line 508) rates Menu
`Architecture★★★★★ / Business Logic★★☆☆☆ / Data Model★★★★★ / API★★★★☆ / Integration★★☆☆☆ /
Overall★★★☆☆`. This session's direct re-verification confirms the Business Logic and Integration
scores remain accurate (nothing has changed there since that document was written), and the Data
Model score is *mostly* accurate but slightly generous given the confirmed absence of any cost
field — a data model claiming to support a restaurant's financial operations without a single cost
field anywhere in its core sellable-item chain is a real, structural omission, not a minor one.
This audit does not re-score the domain (that's this document's own job to inform, via the
redesign), but flags the discrepancy rather than silently repeating the old number as if it still
fully applies.

---

## 5. What This Audit Deliberately Does Not Cover

Per the redesign document's own scoping decisions (see `MENU_PRODUCTION_PLATFORM_REDESIGN.md` §9
for the full phasing rationale): POS/QR/Online-ordering execution surfaces, CRM/Loyalty deep
integration beyond confirming their existing touchpoints, Delivery-platform integration, and full
Coupon-engine design are named as real, valid future scope but not analyzed to the same schema-
level depth as the Product/Recipe/Combo/Modifier/Kitchen/Rating core this prompt centers on —
doing so honestly would require the same full-file-read rigor applied here, which a single pass
covering this many domains cannot responsibly claim to have done for all of them simultaneously
without risking exactly the "fabricate missing features" failure mode this phase was explicitly
told to avoid.
