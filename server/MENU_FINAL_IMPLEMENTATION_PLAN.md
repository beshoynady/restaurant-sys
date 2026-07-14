# Menu Platform — Final Implementation Plan

**Status: planning document. No code written.** Ties together
`MENU_PRODUCTION_PLATFORM_REDESIGN.md`, `MENU_PLATFORM_FINAL_ARCHITECTURE.md`,
`MENU_COST_CONTROL_ARCHITECTURE.md`, `MENU_ENGINEERING_ARCHITECTURE.md`,
`KITCHEN_EXECUTION_ARCHITECTURE.md`, and the companion
`PRODUCTION_MANUFACTURING_DOMAIN_REDESIGN.md`/`_IMPLEMENTATION_PLAN.md` into one buildable sequence.
Per this phase's explicit instruction, **implementation has not started** — this document exists so
that when it does, it proceeds in the right order with the right verification gates, matching the
discipline already proven across every Supply Chain milestone this engagement built (full
regression + typecheck + live boot + RBAC/route smoke tests before any phase is considered done).

---

## 1. Dependency Graph (What Must Exist Before What)

```
Product.costFields + cost-refresh utility (MENU_COST_CONTROL §3)
  │
  ├──► Menu Engineering matrix/ABC/dead-items (MENU_ENGINEERING §1-3)      [needs cost + sales history]
  ├──► Cost/Margin Alerts (MENU_COST_CONTROL §4)                          [needs cost + thresholds]
  └──► Recipe cost preview / simulation (MENU_PLATFORM_FINAL §6)          [needs cost mechanism]

Auto-ticket-creation from Order (MENU_PRODUCTION_PLATFORM_REDESIGN §6.3)
  │
  ├──► Kitchen Queue / Screen contract (KITCHEN_EXECUTION §4-5)           [needs real tickets to exist]
  ├──► Capacity / Priority / Delay (KITCHEN_EXECUTION §3, §6)             [needs real tickets]
  └──► Kitchen Metrics/SLA/Dashboard (KITCHEN_EXECUTION §7)               [needs ticket timestamps at volume]

ModifierGroup / ProductVariantGroup (MENU_PRODUCTION_PLATFORM_REDESIGN §3-4)
  │
  ├──► Deepened variant/modifier mechanics (MENU_PLATFORM_FINAL §2-3)     [extends the base models]
  ├──► Combo execution logic (MENU_PRODUCTION_PLATFORM_REDESIGN §5.2)     [needs cost for combo pricing]
  └──► OrderItem.selectedVariants/selectedModifiers (MENU_PLATFORM_FINAL §7) [needed before Kitchen expansion can route them]

Product Availability (MENU_PLATFORM_FINAL §4)
  │
  └──► independent — no dependency on cost or kitchen work, can build in parallel with anything above

ProductReview deepening (MENU_PLATFORM_FINAL §6a)
  │
  └──► independent — no dependency on any of the above
```

**Reading this graph**: the two highest-leverage, most independent starting points are (1) the
cost mechanism and (2) auto-ticket-creation — exactly the two items the prior redesign document
already flagged as "Phase 1, parallelizable." Everything else in this plan either depends on one
of those two, or is fully independent (Availability, Ratings) and can be scheduled opportunistically
around whichever team capacity is available.

---

## 2. Phased Milestones

### Milestone 1 — Cost Foundation
- `Product.costFields`, `Recipe.standardCost`, `MenuSettings.targetFoodCostPercent`.
- Cost-refresh utility (event-driven + nightly safety net), `DomainEvent.INVENTORY_COST_CHANGED`
  (new, small addition to the Inventory domain — coordinate with Supply Chain's existing event
  catalog conventions, additive only).
- `MenuCostReportService` (recipe breakdown, margin report — not yet variance/alerts).
- **Verification**: cost rollup arithmetic tests (multi-ingredient, multi-level BOM via the
  companion redesign's already-specified integration test pattern); regression on every existing
  Recipe/Product test; typecheck; live boot.

### Milestone 2 — Kitchen Foundation
- Auto-ticket-creation from Order (`DomainEvent.ORDER_CONFIRMED` subscriber).
- Station-type taxonomy, `PreparationSection.warehouse` link.
- Kitchen Queue read service (`KitchenQueueService`).
- **Verification**: integration test proving a multi-item, multi-section Order produces the
  correct number of tickets, correctly routed, with correct `expectedReadyAt`; concurrency test
  (two orders confirmed simultaneously don't corrupt ticket numbering — reuse the exact
  `Promise.allSettled` pattern already proven in Supply Chain's concurrency tests); regression;
  typecheck; live boot.

### Milestone 3 — Variant & Modifier Engine
- `ProductVariantGroup`, `ModifierGroup` models + services (Repository Pattern from day one, not a
  CRUD-then-fix-later path — the `StockCategory`/`PaymentMethod` lesson applied proactively this
  time rather than discovered later).
- `recipeImpact` resolution logic (add/remove/substitute/scale actions).
- `OrderItem.selectedVariants[]`/`selectedModifiers[]` snapshot fields.
- Cycle detection extended to cover Variant/Modifier `recipeImpact` chains, not just Recipe
  nesting (a modifier substituting an ingredient that itself has a `ProductionRecipe` must not be
  able to create a cycle either — same mechanism, same test discipline, applied to a new input).
- **Verification**: order a product with a variant that changes its recipe cost/consumption,
  confirm the posted `WarehouseDocument` reflects the substituted ingredient, not the base one;
  RBAC/route smoke tests for the two new resources.

### Milestone 4 — Combo Execution
- Combo expansion logic (§5.2 of the redesign doc) — depends on Milestone 3 (modifier/variant
  resolution must exist before a combo's resolved components can carry their own selections).
- Combo pricing modes, upgrade pricing, combo-discount snapshot.
- **Verification**: integration test — order a 3-component combo, confirm 3 correctly-routed
  ticket lines, confirm inventory consumption matches the sum of the 3 components' own Recipes,
  confirm combo cost/discount numbers match hand-computed expected values.

### Milestone 5 — Menu Engineering & Kitchen Depth
- BCG matrix, ABC analysis, dead-items, cross-sell computation, `MenuEngineeringSnapshot` cache.
- Kitchen Capacity/Priority/Delay/Metrics/SLA/Dashboard.
- Cost/Margin Alerts, Kitchen Events (delay, capacity-exceeded).
- **Verification**: report-correctness tests against known, hand-constructed order histories;
  cache-invalidation test (snapshot regenerates correctly after the nightly job / on-demand
  trigger); regression; typecheck; live boot.

### Milestone 6 — Availability & Ratings Depth
- `Product.availability` sub-schema, inventory-gated/production-gated auto-disable/enable
  (subscribing to `INVENTORY_BELOW_REORDER_POINT`, already real from Supply Chain).
- `ReviewVote`, reply, spam-score, hidden-review (`isActive`) reuse.
- **Verification**: scheduled-availability test (item correctly available/unavailable across a
  simulated day/week boundary); auto-disable test (inventory event correctly flips
  `Product.status`); RBAC smoke tests for review-moderation and vote endpoints.

### Milestone 7 — Documentation & Final Certification
- Update `PRODUCTION_MENU_GAP_ANALYSIS.md`'s status column from "designed" to "built, verified" per
  item, only for what's actually shipped by this point.
- Full-platform regression (every Supply Chain + Production + Menu test together), typecheck, live
  boot, complete route/RBAC audit — matching the exact certification discipline already applied to
  `SUPPLY_CHAIN_PRODUCTION_RELEASE.md`.

Each milestone gated on the previous one's verification passing — no milestone starts against a
known-broken prior one, per this engagement's standing rule, restated once more because it is the
single most consistently enforced discipline across every phase of this multi-month engagement.

---

## 3. Testing Strategy (Consolidated, Cross-Referencing Each Document's Own Test Notes)

- **Unit-level**: cost-rollup arithmetic (Milestone 1), cycle detection (Milestone 3), Bayesian
  rating formula (Milestone 6), BCG-matrix classification thresholds (Milestone 5).
- **Integration**: every milestone's own scenario test (listed above) against real MongoDB, no
  mocking — matching this engagement's exclusive Jest-integration-test convention (documented user
  preference, carried forward here without re-litigating it).
- **Concurrency**: ticket-number generation under concurrent order confirmation (Milestone 2),
  review-vote double-submission (Milestone 6) — the same `Promise.allSettled` race-proving pattern
  used throughout Supply Chain's hardening passes, applied proactively here rather than discovered
  as a defect later.
- **RBAC/route**: every new router smoke-tested to 401-unauthenticated on first mount, per the
  `StockCategory`/`PaymentMethod` lesson — no router ships without this check in the same change
  that mounts it.

---

## 4. What Is Explicitly Not In This Plan

Franchise governance, real Notification-delivery, a Reporting domain, Subscription/billing, deep
POS/QR/Delivery-channel-specific work, and a Coupon engine — all named as real, confirmed-relevant,
but out-of-scope-for-this-redesign in the companion architecture documents. Including them here
would misrepresent this plan's actual buildable scope, which this engagement's discipline
consistently treats as worse than naming a gap honestly.
