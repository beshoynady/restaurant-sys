# Asset Reports (Assets) — Engineering Documentation

## 1. Overview

Read-only Management Reports over `Asset`/`AssetCategory`/`AssetDepreciation` — Asset Register,
Depreciation Schedule (actual + projected), and Asset Book Value.

**Building this module surfaced and fixed a real bug in `assets/asset-depreciation`** (shipped
earlier the same session): `Asset.accumulatedDepreciation`/`bookValue` were only updated inside the
same best-effort try/catch as the GL journal posting, so an unconfigured `AccountingSettings`
silently left the asset's own cached book value stale even though the depreciation entry itself was
correctly marked `Posted`. See `ASSET_DEPRECIATION.module.md` §11 for the full correction — noted
here because this report module's own test is what caught it.

## 2. Business Purpose

A controller/owner needs: a listing of every fixed asset with its current cost/depreciation/book
value (Asset Register); for one asset, exactly what's been depreciated and what's projected to be
depreciated going forward (Depreciation Schedule); and a category-level rollup of total book value
across the fixed-asset base (Asset Book Value) — the finer-grained counterpart to the Balance
Sheet's single "Assets" line.

## 3. Database Design

No new collections. Reads `Asset`, `AssetCategory`, `AssetDepreciation`.

## 4. Relationships

```
Asset ──(category)──→ AssetCategory (grouping for Book Value)
Asset ──(purchaseCost, salvageValue, usefulLife, depreciationMethod/Period)──→ calculateDepreciationAmount() (projection)
AssetDepreciation ──(periodLabel, amount, status)──→ Depreciation Schedule's "actual" rows
```

## 5. Business Rules

- **Depreciation Schedule's projected rows use the EXACT SAME `calculateDepreciationAmount()`**
  the posting engine (`asset-depreciation.service.js`) itself uses — imported directly, not
  re-derived — so a projection can never silently drift from what would actually be posted if that
  period were generated for real.
- **Projection starts from the asset's current `bookValue`** (after every already-posted entry),
  continuing period-by-period until the computed amount reaches 0 (salvage value hit) or a hard
  cap (`usefulLife`-derived) is reached — the cap exists solely to guarantee termination for a
  misconfigured asset, not as a business rule.
- **Projected rows are computed fresh on every request, never persisted**, and explicitly flagged
  `actual: false` — this report must never be mistaken for a second source of truth alongside the
  real `AssetDepreciation` collection.
- **Asset Register/Book Value use `asset.bookValue ?? asset.purchaseCost`** as the fallback for an
  asset that hasn't been through `beforeCreate`'s forced initialization (defensive only — every
  asset created through `asset.service.js` always has a real `bookValue` from the moment it exists).

## 6. Workflow

Read-only; no state machine.

## 7. API Documentation

Base path: `/api/v1/assets/reports`.

| Method | Route | Query params | Report |
|---|---|---|---|
| GET | `/register` | `branch?, category?, status?, page?, limit?` | Asset Register |
| GET | `/:assetId/depreciation-schedule` | `branch?` | Depreciation Schedule (actual + projected) |
| GET | `/book-value` | `branch?, status?` (default `Active`) | Asset Book Value, by category |

All require `authorize("FinancialReports", "read")` + `checkModuleEnabled("assets")`.

## 8. Frontend Guide

`/register` is a standard paginated table with running totals for a footer row. The Depreciation
Schedule response is one array (`schedule`) mixing actual and projected rows — filter client-side on
`actual` if the UI wants to visually distinguish them (e.g., projected rows in a lighter color), but
never recompute the amounts. `/book-value` returns pre-grouped category buckets ready for a pie/bar
chart, plus platform-wide totals for a summary card.

## 9. Integration

- **`assets/asset-depreciation`**: `calculateDepreciationAmount` reused directly for projections —
  a real instance of "reuse the existing engine, don't duplicate business logic."

## 10. Security

`authorize("FinancialReports", "read")` + `checkModuleEnabled("assets")`.

## 11. Reporting

This module is itself the Asset Management Reports (Register, Depreciation Schedule, Book Value).

## 12. Future Extensions

- **Disposal history** — once `DisposeAsset` is built (still deferred, see
  `ASSET_DEPRECIATION.module.md` §12), a disposal-aware Asset Register filter/column would be a
  natural addition.
- **Export-ready formatting** — same note as every other report module this session: the JSON shape
  is already clean; CSV/PDF generation is a separate, unbuilt concern.

## 13. Architecture Decisions

- **The projection cap (`usefulLife`-derived, not unbounded) exists purely for safety** — a
  misconfigured asset (e.g., `usefulLife: 0` slipping past validation somehow) must never produce an
  infinite loop in a report endpoint. This is defensive engineering, not a business rule about how
  long an asset can be projected.
- **Fixing the `asset-depreciation` balance-update bug happened here, not as a separate follow-up
  pass** — the mandate's own "run tests after each module" discipline caught it immediately, and
  fixing it in place (rather than filing it as deferred work) kept the two modules consistent with
  each other rather than shipping a report that would have quietly documented incorrect behavior as
  if it were correct.

## 14. Developer Notes

- Test file: `tests/integration/asset-reports.test.ts` — covers the Asset Register's running
  totals, the Depreciation Schedule's actual+projected combination (including the exact period-count
  and stop-at-salvage-value math), and the Asset Book Value category rollup. This is also the test
  that caught the `asset-depreciation` balance-update bug — its fixture deliberately does NOT
  configure `AccountingSettings` (unlike `asset-depreciation-engine.test.ts`, which does), which is
  what exposed the gap.
