# Menu & Production Platform — Final Gap Analysis

**Status: honest assessment, no code written.** Compares the *designed* architecture (across all
six Menu documents plus the companion Production redesign) against Foodics, Toast, Oracle
Simphony, Square, SAP Business One, Odoo Manufacturing, and Microsoft Dynamics 365. **Nothing in
this document has been implemented** — every "Designed" status below means "architecturally
specified, verified against real source, not yet built." Conflating "designed" with "built" would
violate this engagement's core discipline; the distinction is preserved throughout.

---

## 1. Status Legend

- **Built & Verified** — exists in code today, confirmed by direct source read, tested.
- **Designed** — fully specified in one of the six documents (or the companion redesign),
  reuses existing infrastructure correctly, not yet implemented.
- **Partially Designed** — the mechanism exists but a named sub-part is explicitly deferred.
- **Not Designed, Named Gap** — confirmed absent, explicitly out of this redesign's scope, with
  the reason stated.

---

## 2. Feature-by-Feature Comparison

| Capability | Status | vs. Foodics/Toast/Simphony/Square/SAP/Odoo/Dynamics |
|---|---|---|
| Sellable Product catalog, i18n, multi-brand/branch | Built & Verified | At parity — every named competitor has this as table stakes |
| Sizes as first-class entities (own SKU/price/cost/nutrition) | Designed (extends an already-correct existing mechanism) | At parity once built — the "size = full Product" pattern is architecturally sound |
| Product Variants (flavor/spice/bread/crust/temperature) | Designed | At parity with Foodics/Toast; Odoo's variant matrix is more mature (auto-generates all combinations) — this design deliberately does NOT auto-generate combinations, treating each variant group as an independent selection rather than a cartesian-product SKU explosion, a deliberate simplification justified for restaurants (where "Large Hot Latte with Oat Milk" doesn't need its own SKU the way a t-shirt's size×color does) |
| Modifier Platform (required/nested/paid/free/recipe-linked) | Designed | Matches or exceeds Foodics/Toast's modifier depth on paper (nested groups, recipe impact, percentage pricing) — genuinely competitive design, not yet proven at scale |
| Combo Engine (fixed/flexible/builder/upsell) | Designed | Matches Foodics/Toast's combo depth; Simphony/SAP's combo-to-manufacturing integration (this design's §5 Combo Production Integration) is a genuine differentiator on paper since it reuses a real Cost Engine rather than a flat combo price |
| Recipe versioning/approval/history | Designed | Exceeds Foodics/Toast (neither has a formal recipe-approval workflow as a core feature); matches SAP/Odoo Manufacturing's engineering-change-order concept in spirit, at far lower complexity |
| Recipe cost rollup (multi-level BOM) | Designed, companion redesign | Matches Odoo Manufacturing/SAP's BOM costing depth conceptually; **not yet proven at scale or with real multi-level data** — a real, honest caveat |
| Standard Cost / Target Cost / Variance | Designed | Matches SAP Business One's standard-costing depth; Foodics/Toast/Square generally don't expose standard-cost variance at this granularity — a genuine potential differentiator if built well |
| Menu Engineering (BCG matrix, ABC) | Designed | Matches the *concept* every named competitor's reporting suite offers; **none of the actual reporting UI/dashboard exists** — this is architecture for the calculation layer only |
| Cross-sell/Upsell recommendation | Designed (market-basket co-occurrence) | Below Square/Toast's ML-driven recommendation engines — explicitly, honestly scoped as statistical co-occurrence, not machine learning (§ AI-ready in `MENU_ENGINEERING_ARCHITECTURE.md`) |
| Kitchen Display System (KDS) | Designed (queue/screen data contract), **no UI** | Below every named competitor, all of which ship a real KDS UI — this redesign explicitly scopes UI out (backend-only engagement); the *data contract* a KDS would need is designed, the KDS itself is not |
| Kitchen SLA/Metrics/Dashboard | Designed | Matches Toast/Simphony's kitchen-analytics concept; not yet built or proven |
| Auto-ticket-creation from Order | Designed (closes a **confirmed currently-broken** gap) | This is table-stakes functionality every named competitor has — its current absence in this codebase is the single most consequential gap this whole Menu Platform effort has identified, now designed but not built |
| Product Availability (time/day/seasonal/channel) | Designed (genuinely new — confirmed zero existing capability) | Below Toast/Square's mature scheduling UIs; the underlying data model is comparable in shape |
| Ratings/Reviews with moderation, votes, replies | Designed, extends an existing schema | Matches Foodics/Square's review depth; below Google/Yelp-integrated review aggregation (out of scope — those are third-party integrations, not a menu-platform concern) |
| Franchise governance (master menu, royalty) | **Not Designed, Named Gap** | SAP Business One and Dynamics 365 both have real multi-entity/franchise consolidation features; this platform has no franchisor/franchisee relationship concept at all (`Brand` is flat) — a genuine, honestly-disclosed competitive gap |
| Real-time Notification delivery | **Not Designed, Named Gap** | Every named competitor has push/SMS alerting; this platform has only a settings/preferences schema with zero delivery mechanism — confirmed absent this session |
| Reporting/Analytics domain (dashboards, exports) | **Not Designed, Named Gap** | No dedicated reporting domain exists anywhere in the platform (confirmed); Menu Engineering's calculation layer is designed, but a real reporting/BI surface (the kind Toast/Square ship as a polished dashboard product) is not |
| Coupon/promo-code engine | **Not Designed, Named Gap** | Confirmed no `Coupon` model exists at all; `Promotion` exists but has no customer-facing code-redemption mechanism |
| Lot/batch/expiry tracking | Partially Designed (companion redesign — depends on a shared, not-yet-built `StockLayer`) | Below every named competitor for perishables-heavy operations (bakery, central kitchen) — honestly named as blocked on a cross-domain prerequisite, not silently absent |
| Multi-currency menu pricing | **Not Designed, Named Gap** | Not addressed anywhere in this redesign — every cost/price calculation assumes one base currency, matching the rest of the platform's current state |
| AI-driven demand forecasting / dynamic pricing | **Not Designed, Named Gap, Explicitly Disclaimed** | This redesign produces the clean data surface a future ML system would need (§ `MENU_ENGINEERING_ARCHITECTURE.md` §7) but does not build or claim to build any actual ML — stated as the honest boundary, not a roadmap promise |

---

## 3. Architectural Strengths Not to Undersell

Consistent with the final assessment pattern already established for Supply Chain
(`SUPPLY_CHAIN_PRODUCTION_RELEASE.md` §9): this platform's Menu redesign, once built, would have
one genuine structural advantage over parts of the named competitor set — **every cost, inventory,
and kitchen-consumption number traces back to one real, atomic, concurrency-safe Inventory Posting
Engine and Cost Engine**, the same ones proven correct across the entire Supply Chain domain this
engagement hardened. Foodics/Toast/Square, as POS-first platforms, generally bolt inventory costing
on as a secondary feature; SAP/Odoo have mature costing but as part of a much heavier, more complex
general-ERP surface. This platform's design threads a real middle path — restaurant-specific enough
to be usable without SAP-level configuration overhead, rigorous enough (atomic postings, real
double-entry accounting, TOCTOU-safe state machines) to not be a toy. This is a genuine, defensible
positioning — not marketing language, but a direct consequence of the architectural discipline
already verified across every Supply Chain milestone.

---

## 4. Honest Overall Assessment

**Nothing in the Menu Platform beyond the base `Product`/`Recipe`/`MenuCategory`/`ProductReview`/
`PreparationSection`/`PreparationTicket` schemas is built today.** Every capability marked
"Designed" in §2 is a real, verified-against-source architecture, not a fabrication — but it is
architecture, not software. The gap between this platform and the named enterprise competitors is
therefore currently **total** for every "Designed" row, and **structural** (not merely a build
backlog) for every "Not Designed, Named Gap" row. This document's purpose is to make that
distinction impossible to miss, per this phase's explicit instruction: *"Identify every remaining
gap honestly. Do not fabricate capabilities."*

The path from here to a genuinely competitive platform is `MENU_FINAL_IMPLEMENTATION_PLAN.md`'s
seven milestones — each independently verifiable, each building only on infrastructure already
proven correct (the Inventory Posting Engine, Cost Engine, Domain Events, TransitionGuard,
Repository Pattern), none requiring a new architectural mechanism this engagement hasn't already
validated at least once in the Supply Chain domain.
