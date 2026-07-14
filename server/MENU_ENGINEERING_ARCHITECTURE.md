# Menu Engineering Architecture

**Status: design only, no code written.** Deep-dive companion to
`MENU_PRODUCTION_PLATFORM_REDESIGN.md` §9 (which already establishes the core principle: Menu
Engineering is a pure read/report layer over existing sales history + `Product.costFields`,
`MENU_COST_CONTROL_ARCHITECTURE.md`). This document specifies the full matrix, ABC analysis,
dead-item/best-seller detection, cross-sell/upsell, and an honest scoping of "AI-ready analytics."

**Confirmed, load-bearing fact from research this session**: no dedicated Reporting/Analytics
domain exists anywhere in this platform. Every analytics capability in this document is a new
read-side service following the exact pattern already proven correct for Supply Chain's
`VendorLedgerService` — queries models directly, writes nothing except an optional performance
cache, never becomes a second source of truth for anything it reads.

---

## 1. The Boston Consulting Group Matrix (Stars / Plowhorses / Puzzles / Dogs)

Already named in the redesign doc §9; specified here in full:

```
For each Product, over an analysis window (brand-configurable, default trailing 90 days):
  contributionMargin = Product.price - Product.costFields.estimatedCost   [MENU_COST_CONTROL §1]
  marginIndex = contributionMargin / categoryAverageContributionMargin
                [relative to the Product's own MenuCategory, not the whole menu — a dessert and an
                 entrée have structurally different margins; comparing a dessert against the
                 whole-menu average would misclassify it]
  salesCount = Σ OrderItem quantity for this Product, this window
  popularityIndex = salesCount / categoryAverageSalesCount
                     [same category-relative reasoning]

  classification:
    marginIndex >= 1 AND popularityIndex >= 1  → Star       (high margin, high popularity)
    marginIndex <  1 AND popularityIndex >= 1  → Plowhorse   (low margin, high popularity)
    marginIndex >= 1 AND popularityIndex <  1  → Puzzle      (high margin, low popularity)
    marginIndex <  1 AND popularityIndex <  1  → Dog         (low margin, low popularity)
```
The `>= 1` threshold (i.e. "at or above category average") is the standard Kasavana & Smith menu-
engineering methodology this concept is drawn from industry-wide — not a novel invention, correctly
applied as a known-good formula rather than reinvented, matching the same discipline already
applied to the Bayesian rating formula in the prior redesign document.

**Minimum sample size**: a Product with fewer than `MenuSettings.minSalesForClassification`
(new, default 10) sales in the window is reported as `"Insufficient Data"` rather than forced into
one of the four quadrants — a small, real, honest guard against a brand-new menu item being
mislabeled a "Dog" on day two.

---

## 2. ABC Analysis

Standard Pareto classification by revenue contribution, applied per-category (same category-
relative reasoning as §1, to avoid a high-volume QSR category dwarfing a low-volume premium
category in a whole-menu ranking):
```
Rank Products within a category by revenue (price × salesCount) descending.
A = top items contributing to the first 80% of cumulative category revenue.
B = next items up to 95% cumulative.
C = remainder.
```
A pure read-time ranking — no new storage, recomputed per report request or cached (§6).

---

## 3. Sales Mix, Menu Performance, Dead Items, Best Sellers

- **Sales Mix** = each Product's `salesCount / categoryTotalSalesCount` — the popularity axis of
  §1, exposed as its own report for brands that want the raw percentage rather than an
  index-relative-to-average.
- **Menu Performance** = a per-category or whole-menu rollup of §1's classification counts (e.g.
  "12 Stars, 8 Plowhorses, 5 Puzzles, 3 Dogs this quarter") — the executive-summary view.
- **Dead Items** = Products with `salesCount == 0` over a *longer* window than the standard
  classification window (brand-configurable, default 180 days) — distinct from "Dog" (a Dog still
  sells, just underperforms both axes; a Dead Item doesn't sell at all). A genuinely useful signal
  for menu pruning that the four-quadrant matrix alone doesn't surface cleanly.
- **Best Sellers** = top-N by `salesCount` within a category or brand-wide, over a
  brand-configurable window — the simplest, most directly actionable report in this whole document.

---

## 4. Cross-Sell / Upsell

**Two genuinely different mechanisms, correctly kept distinct**:

- **Upsell** = a *structural* relationship already fully designed: the redesign doc's Combo
  "Upsell Combo" mechanism (`MENU_PLATFORM_FINAL_ARCHITECTURE.md` §5) — "make it a combo for
  +$3" — is deterministic and configured by the brand, not inferred from data. Restated here only
  to confirm Menu Engineering doesn't need to *invent* upsell logic; it already exists structurally
  and this document's job is only to *report on its effectiveness* (upsell-attach-rate: what
  fraction of base-item orders also took the upsell option, a straightforward `OrderItem` query
  once §7 of `MENU_PLATFORM_FINAL_ARCHITECTURE.md`'s `selectedModifiers[]` snapshot exists).
- **Cross-Sell** = a *data-derived* relationship — "customers who bought X also frequently bought
  Y in the same order" — genuinely new, computed via market-basket analysis (co-occurrence
  counting across `Order`s within the analysis window, a standard, well-understood technique — not
  a novel algorithm, correctly scoped as **read-time correlation counting**, not machine learning):
```
For each pair (X, Y) of Products, count Orders containing both.
crossSellScore(X, Y) = co-occurrenceCount(X,Y) / salesCount(X)
  [conditional probability: "given someone bought X, how often did they also buy Y" — asymmetric,
   correctly so, since "fries with burger" and "burger with fries" have different practical meaning]
Recommend the top-N Y by crossSellScore for a given X, above a minimum co-occurrence threshold
(new: MenuSettings.minCoOccurrenceForCrossSell, default 5) to avoid recommending based on two
coincidental orders.
```

---

## 5. Menu Optimization & Dynamic Recommendation

- **Menu Optimization** = a report, not an automated action: surfaces Puzzles (high margin, low
  popularity — candidates for repositioning/promotion, since the margin is already good) and
  Plowhorses (low margin, high popularity — candidates for a price increase or cost-reduction
  recipe revision, since the volume is already there) with their §4 cross-sell partners as
  suggested promotional pairings. **Produces recommendations for a human to act on — this platform
  does not auto-change prices or auto-remove menu items**, a deliberate, stated boundary matching
  the same "ratings influence analytics only, never inventory/accounting" discipline already
  established for the Ratings platform, applied here to prevent an analytics feature from silently
  becoming a pricing-automation feature without an explicit, separate design/approval process.
- **Dynamic Recommendation** (e.g. "customers who ordered this also liked...", shown at
  order/POS/online-ordering time): the *same* cross-sell computation (§4), exposed as a real-time
  read (`getRecommendations(productId, {limit})`) rather than only a batch report — one
  calculation, two consumption modes (analyst report vs. live recommendation widget), not two
  separate mechanisms.

---

## 6. Caching & Scalability

Per `AUDIT.md §3.10`'s named constraint: Menu Engineering must not compute live on every request
for large catalogs. Design: a `MenuEngineeringSnapshot` cache (brand+branch+category scoped,
timestamped), refreshed on the same schedule as `MENU_COST_CONTROL_ARCHITECTURE.md` §3's nightly
job (since the matrix depends on `costFields`, which that job already refreshes — one nightly
pass, not two independently-scheduled ones) plus an on-demand "recalculate now" endpoint for a cost
controller who just changed pricing and wants fresh numbers immediately. The snapshot is
**explicitly a cache** — `Order`/`Product` data remain the SSOT; the snapshot can always be
regenerated identically from them, and is never itself written to by anything except the
regeneration job.

---

## 7. AI-Ready Analytics — Honest Scoping

The prompt names "AI-ready Analytics" as a requirement. **No machine-learning model is designed or
implied by this document** — "AI-ready" is honestly scoped as: the data this architecture produces
(clean, per-Product margin/popularity/cross-sell scores, consistently computed, historically
queryable via the snapshot cache) is the *feature set* a future recommendation/forecasting model
would need as input. This document does not design that model, does not claim one exists, and does
not fabricate a capability beyond "the inputs a real ML system would need are now computable and
exposed via `MenuCostReportService`/a new `MenuEngineeringService`." This is the same honest
boundary already drawn around Notification-delivery and Reporting-domain in the companion
architecture document — naming a real future direction without pretending it's built.

---

## 8. Accounting & Operational Impact

| Feature | Accounting impact | Operational impact |
|---|---|---|
| BCG Matrix / ABC Analysis | None — pure reporting | Informs pricing/promotion/menu-design decisions a human makes |
| Dead Items | None | Candidate list for menu pruning — reduces recipe/inventory-SKU sprawl if acted on |
| Cross-Sell/Upsell reporting | None | Informs staff training ("suggest fries with every burger") and combo/promotion design |
| Dynamic Recommendation | None | Directly consumed by POS/online-ordering UI (out of this backend's scope to render, in scope to compute and expose) |
| Snapshot cache | None — a read optimization only | Ensures menu-engineering reports stay fast as catalog/order-history grows |

No feature in this document posts to the GL, moves inventory, or changes pricing/availability
automatically — every output is advisory, consistent with the deliberate human-in-the-loop
boundary stated in §5.
