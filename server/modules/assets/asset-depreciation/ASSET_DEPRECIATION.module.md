# Asset / Asset Depreciation (Assets) — Engineering Documentation

## 1. Overview

`assets/asset` holds fixed-asset master data (purchase cost, useful life, depreciation method);
`assets/asset-depreciation` is the append-only ledger of depreciation events against it, per the
model's own header comment: "This model DOES NOT calculate depreciation. It only stores the RESULT
of depreciation calculation." **Before this pass, nothing calculated that result either** — the
schema was, in this codebase's own review, "the best-designed schema in the cluster," with zero
engine behind it. This pass builds that engine.

## 2. Business Purpose

A restaurant capitalizes fixed assets (ovens, POS devices, vehicles, furniture) and needs their
book value to decline over their useful life per standard accounting practice, with a GL entry each
period (Debit Depreciation Expense / Credit Accumulated Depreciation) and no way to double-post the
same asset/period or drift the cached book-value fields out of sync with the ledger that's supposed
to be their source of truth.

## 3. Database Design (unchanged by this pass, per model-first review — the schema was already correct)

`Asset`: `purchaseCost`, `salvageValue`, `usefulLife` (months), `depreciationMethod`
(`StraightLine`/`DecliningBalance`/`Manual`), `depreciationPeriod` (`Monthly`/`Yearly`),
`depreciationMode` (`Automatic`/`Manual`), `accumulatedDepreciation`/`bookValue` (derived caches).

`AssetCategory`: per-category GL accounts — `assetAccount`, `depreciationExpenseAccount`,
`accumulatedDepreciationAccount`, `disposalGainAccount`/`disposalLossAccount` — "the KEY link
between Assets and the General Ledger" per its own header comment.

`AssetDepreciation`: `asset`, `source` (`Automatic`/`Manual`), `periodLabel`/`period`, `amount`,
`journalEntryId`, `status` (`Draft`/`Posted`). Unique on `{asset, periodLabel}`.

## 4. Relationships

```
AssetCategory ──(depreciationExpenseAccount, accumulatedDepreciationAccount)──→ AssetDepreciation's GL posting
Asset ──(category, purchaseCost, salvageValue, usefulLife, depreciationMethod)──→ calculateDepreciationAmount()
AssetDepreciation ──(posts)──→ JournalEntry, then updates Asset.accumulatedDepreciation/bookValue
```

## 5. Business Rules

- **`Asset.accumulatedDepreciation`/`bookValue` are always system-initialized at creation**
  (`asset.service.js#beforeCreate` forces `accumulatedDepreciation: 0`,
  `bookValue: purchaseCost` — regardless of client input) **and locked against the generic `PUT`**
  thereafter. The depreciation-posting engine is their one legitimate writer post-creation.
- **`generateForPeriod()` computes from the asset's CURRENT book value, never re-derives from
  scratch** — correct for `DecliningBalance`, which is inherently sequential (each period's amount
  depends on the previous period's resulting book value).
- **`StraightLine`**: `(purchaseCost - salvageValue) / usefulLifeInPeriods` — constant every period.
- **`DecliningBalance`**: double-declining-balance — `currentBookValue × (2 / usefulLifeInPeriods)`,
  capped so book value never drops below `salvageValue` (a hard floor, not the
  switch-to-straight-line-for-the-remainder refinement some schedules use — documented as the
  simpler, still-correct baseline this engine implements).
- **A `Manual`-mode asset cannot use `generateForPeriod()`** — rejected with a clear error directing
  the caller to record entries directly; `postDepreciation()` still applies to those rows equally.
- **Duplicate-period generation is rejected with a clear message before hitting the unique-index
  constraint** — `generateForPeriod` checks `exists()` first, though the index remains the hard
  backstop against a genuine race.
- **Only an `Active` asset in a depreciable category can generate a new period.**
- **`amount`/`status`/`journalEntryId`/`period`/`periodLabel` are locked against the generic `PUT`**
  on `AssetDepreciation` — only `generateForPeriod()`/`postDepreciation()` may change them.
- **A `Posted` entry cannot be posted again** — `postDepreciation()`'s atomic claim only matches
  `status: "Draft"`.

## 6. Workflow

```
(Automatic) generateForPeriod(asset, periodLabel) ──→ Draft ──postDepreciation()──→ Posted
(Manual)    create({source:"Manual", amount, periodLabel}) ──→ Draft ──postDepreciation()──→ Posted
```

Posting: Debit `AssetCategory.depreciationExpenseAccount` / Credit
`AssetCategory.accumulatedDepreciationAccount` for `amount`, then
`Asset.accumulatedDepreciation += amount`, `Asset.bookValue = max(purchaseCost - accumulatedDepreciation, salvageValue)`.

## 7. API Documentation

Base path: `/api/v1/assets/depreciation` (already correctly mounted with RBAC — unlike Expense,
this domain's plumbing was already sound).

| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/generate` | `{ asset: ObjectId, periodLabel: "YYYY-MM" }` | Creates a Draft entry for an Automatic-mode asset |
| POST | `/:id/post` | *(none)* | Draft → Posted |

Plus standard CRUD (`create` covers the Manual-entry path directly).

## 8. Frontend Guide

A depreciation-run screen: list `Active`, `Automatic`-mode assets due for the current period (a
future "which assets are due" lookup endpoint would help here — not built in this pass, see §12),
call `POST /generate` per asset, review the computed `amount`, then `POST /:id/post` to commit —
either individually or as a batch loop client-side (no bulk-generate endpoint exists yet). A Manual
asset's entry is created directly via `POST /` with an explicit `amount`, then posted the same way.

## 9. Integration

- **`accounting`**: `sourceType: "ASSET_DOCUMENT"` (already existed in the enum, unused until now).
- **`asset-category`**: the account-mapping source — no posting happens if a category is missing
  either GL account (best-effort skip, matching every other posting engine in this platform).

## 10. Security

`authorize("AssetDepreciations", action)` + `checkModuleEnabled("assets")` — already correctly
wired before this pass (confirmed via model-first review of the router, no changes needed here,
unlike Expense).

## 11. Reporting

**Update (Financial Reporting phase, same session):** built — see `assets/asset-reports`
(Asset Register, Depreciation Schedule with a real+projected combined view, Asset Book Value).

**Correction found while building that report module, fixed here:** `postDepreciation()` originally
updated `Asset.accumulatedDepreciation`/`bookValue` INSIDE the same best-effort try/catch as the GL
journal posting — so an unconfigured `AccountingSettings` silently left the asset's own cached book
value stale even though the depreciation entry was correctly marked `Posted`. That violated this
model's own documented invariant ("derived from AssetDepreciation entries," not from whether a GL
posting succeeded). Fixed: the Asset update is now unconditional, applied before the GL-posting
attempt; only the journal entry itself remains best-effort/optional. Caught by
`asset-reports.test.ts`'s Depreciation Schedule test (no `AccountingSettings` configured in that
fixture), not by inspection — worth noting since the original code, its test, and its documentation
all looked internally consistent until a second module exercised the same code path differently.

## 12. Future Extensions

- **No scheduler/cron calls `generateForPeriod()` automatically.** This codebase has no background-
  job infrastructure at all (confirmed absent in the earlier platform-wide review) — building one is
  out of scope here. `generateForPeriod()` is designed to be trivially callable from a future
  scheduled job once that infrastructure exists; nothing about its design assumes manual triggering.
- **`DisposeAsset`** (named explicitly in this platform's own Phase-4 business-verb examples) is
  **not built in this pass** — `AssetCategory.disposalGainAccount`/`disposalLossAccount` already
  exist specifically for it, but implementing disposal (write off remaining book value, post
  gain/loss vs. sale proceeds, transition `Asset.status` to `Disposed`/`Sold`) is a distinct,
  similarly-sized unit of work, deliberately scoped out to keep this pass reviewable. Flagged here,
  not silently dropped.
- **A "which assets are due this period" lookup endpoint** would materially help the frontend
  workflow described in §8 — not built.
- **Switch-to-straight-line-for-remainder** refinement to the `DecliningBalance` formula (instead of
  the current hard salvage-value floor) — a legitimate refinement, not built.

## 13. Architecture Decisions

- **`calculateDepreciationAmount` is a pure, exported function** — no I/O, unit-testable directly —
  matching the established `buildSalesInvoiceLines`/`buildPurchaseInvoiceLines` convention in this
  codebase for pricing/calculation logic that deserves isolated testing separate from the
  database-touching service methods around it.
- **`asset.service.js` converted from a flat `new AdvancedService(...)` instantiation to a class**
  specifically to add `beforeCreate` — `lockedUpdateFields` only guards `update()`, not `create()`;
  without this, a client could still set an arbitrary starting `accumulatedDepreciation`/`bookValue`
  at creation time despite those fields being "locked."
- **`_postAccounting` returns the posted `JournalEntry` (or `null`)**, mirrored explicitly onto the
  in-memory object `postDepreciation()` returns — the identical "stale returned object" bug already
  found and fixed once on `CashierShift._postVarianceAccounting` recurred here during this module's
  own test-writing and was fixed the same way; worth watching for a third time if this pattern
  (service method posts via a private helper that also persists a back-reference) is copied again.

## 14. Developer Notes

- Test file: `tests/integration/asset-depreciation-engine.test.ts` — covers the forced
  book-value initialization, both depreciation formulas in isolation (no DB), the three
  `generateForPeriod` rejection cases (duplicate period, non-Active, Manual-mode), the full
  posted-GL-entry-plus-balance-update path, and the `lockedUpdateFields` lockdown on both models.
- If extending to `DisposeAsset`: the accounting is Credit `assetAccount` for the full
  `purchaseCost` (removing the asset from the books), Debit `accumulatedDepreciationAccount` for
  `Asset.accumulatedDepreciation` (removing the contra-asset), and a Gain/Loss line for the
  difference between disposal proceeds and remaining `bookValue` — the two accounts for that already
  exist on `AssetCategory` and are simply unused today.
