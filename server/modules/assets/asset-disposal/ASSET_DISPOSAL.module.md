# Asset Disposal (Assets) — Engineering Documentation

## 1. Overview

`assets/asset-disposal` implements the terminal event of the fixed-asset lifecycle: retiring an
`Asset` by scrapping it (no proceeds) or selling it (with proceeds), writing off its remaining book
value, posting the resulting gain/loss to the GL, and keeping an immutable audit record of exactly
what happened. `AssetCategory.disposalGainAccount`/`disposalLossAccount` existed unused since the
Asset Depreciation pass (see that module's §12 "Future Extensions") — this pass is what activates
them.

## 2. Business Purpose

A restaurant eventually retires fixed assets — an oven breaks and is scrapped, a delivery vehicle is
sold, a POS device is replaced. Each of these events must: remove the asset's cost and accumulated
depreciation from the books, record whatever cash/bank proceeds were received, recognize the
resulting gain or loss versus the asset's remaining book value, and leave a permanent, non-editable
record of the transaction — the same audit-trail discipline `AssetDepreciation` already applies to
periodic depreciation.

## 3. Database Design

`AssetDisposal` (new collection): `asset` (unique index — an asset can be disposed of exactly once),
`disposalType` (`Scrap`/`Sale`), `disposalDate`, three immutable snapshot fields captured at disposal
time (`purchaseCostAtDisposal`, `accumulatedDepreciationAtDisposal`, `bookValueAtDisposal`),
`saleProceeds` (0 for `Scrap`), `cashRegister`/`bankAccount` (settlement account for a `Sale`, exactly
one of the two), `gainLoss` (signed — positive is a gain, negative is a loss), `reason`,
`journalEntry` (back-reference, set after posting), `createdBy`.

No `status` field and no Draft/Posted staging, unlike `AssetDepreciation` — a disposal is a single
deliberate transaction ("approving IS posting," the same convention already used by `WasteRecord`,
`CashierShift`, `DailyExpense`, `AssetDepreciation`). The snapshot fields are never recomputed after
creation — they are what the books said at the moment of disposal, by design, even if `Asset`'s own
cached fields are later found to have been wrong for an unrelated reason.

`Asset.status` gains two real consumers of its already-existing `Disposed`/`Sold` enum values (they
existed in the schema since before this pass but nothing wrote them).

## 4. Relationships

```
Asset ──(purchaseCost, accumulatedDepreciation, bookValue @ disposal time)──→ AssetDisposal snapshot
AssetCategory ──(assetAccount, accumulatedDepreciationAccount, disposalGainAccount, disposalLossAccount)──→ AssetDisposal's GL posting
CashRegister.accountId / BankAccount.accountId ──(settlement)──→ AssetDisposal's GL posting (Sale only)
AssetDisposal ──(posts)──→ JournalEntry, then claims Asset.status → Disposed/Sold
```

## 5. Business Rules

- **Only `Active` or `Suspended` assets can be disposed of** (`DISPOSABLE_STATUSES`) — `Draft` (never
  capitalized), and already-`Disposed`/`Sold` assets are rejected with a clear error.
- **An asset can be disposed of exactly once** — enforced both logically (`DISPOSABLE_STATUSES`
  excludes the terminal states) and physically (unique index on `AssetDisposal.asset`), plus the
  atomic-claim status transition (`findOneAndUpdate({status: currentStatus})`) rejects a second
  concurrent disposal attempt with a 409, the same TOCTOU-safe pattern used everywhere else in this
  platform (`Order`, `CashierShift`, etc.).
- **A `Sale` must have `saleProceeds > 0`** — a $0 disposal is a `Scrap`, not a `Sale`; the service
  rejects the ambiguous case explicitly rather than silently treating it as one or the other.
- **A `Sale` must specify exactly one of `cashRegister`/`bankAccount`**, never both, never neither
  (XOR, checked with a clear message) — a sale settles into exactly one account.
- **`gainLoss = saleProceeds - bookValueAtDisposal`** — for a `Scrap` (`saleProceeds: 0`), this is
  always a loss equal to the full remaining book value (or zero, if the asset was already fully
  depreciated).
- **`Asset.status`/`accumulatedDepreciation`/`bookValue` are locked against the generic `PUT`**
  (`asset.service.js`'s `lockedUpdateFields`) — `status` specifically added in this pass so a client
  can no longer set `status: "Disposed"` directly and bypass this entire engine (the same "generic
  PUT bypasses business rules" defect class already fixed on `Order`/`Invoice`/`CashierShift`/
  `DailyExpense` earlier in this domain's audit). Legitimate non-terminal moves (`Draft`→`Active`,
  `Active`↔`Suspended`) go through the new `assetService.transition()` method instead, which itself
  refuses to ever set `Disposed`/`Sold` — those two states are reachable only via `scrapAsset()`/
  `sellAsset()`.
- **Every field on a completed `AssetDisposal` is locked against the generic `PUT`** — the entire
  document is `lockedUpdateFields` except system/audit fields; a disposal, once recorded, is
  immutable, matching a posted `JournalEntry`'s own immutability.
- **GL posting is best-effort/non-blocking** — an unconfigured `AccountingSettings` or missing
  `AssetCategory` GL account skips only the journal entry (logged via `console.error`); the disposal
  record itself, the `Asset.status` transition, and the settlement account's balance credit (all
  real-world facts) always happen unconditionally, matching the decoupling fix already applied to
  `AssetDepreciation`'s and `DailyExpense`'s posting paths.
- **A `Sale`'s proceeds unconditionally credit `CashRegister.balance`/`BankAccount.balance`** — cash
  or bank funds were actually received regardless of whether the GL entry posts; a `Scrap` changes no
  balance (`saleProceeds: 0`).

## 6. Workflow

```
scrapAsset(asset, reason) ──→ AssetDisposal{disposalType:"Scrap", saleProceeds:0} ──→ Asset.status = "Disposed"
sellAsset(asset, saleProceeds, cashRegister|bankAccount) ──→ AssetDisposal{disposalType:"Sale"} ──→ Asset.status = "Sold"
```

Both paths post the same shaped GL entry, lines built conditionally:

| Condition | Line |
|---|---|
| always, if `accumulatedDepreciationAtDisposal > 0` | Debit `AssetCategory.accumulatedDepreciationAccount` |
| `Sale` only, if `saleProceeds > 0` | Debit settlement account (`CashRegister.accountId` or `BankAccount.accountId`) |
| `gainLoss > 0` | Credit `AssetCategory.disposalGainAccount` |
| `gainLoss < 0` | Debit `AssetCategory.disposalLossAccount` (`Math.abs(gainLoss)`) |
| always | Credit `AssetCategory.assetAccount` for `purchaseCostAtDisposal` |

The entry always balances: `accumulatedDepreciation + proceeds + loss = assetCost + gain` reduces
algebraically to `proceeds - bookValue = gain - loss`, which holds by definition of `gainLoss`. This
was verified algebraically for the gain case, the loss case, the exact-break-even case (no gain/loss
line at all), and the zero-accumulated-depreciation case before implementation, and is exercised by
`asset-disposal-engine.test.ts` in all four shapes.

## 7. API Documentation

Base path: `/api/v1/assets/disposal`.

| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/scrap` | `{ asset, disposalDate?, reason? }` | Full write-off, no proceeds |
| POST | `/sell` | `{ asset, disposalDate?, saleProceeds, cashRegister? \| bankAccount?, reason? }` | Exactly one settlement account required |
| GET | `/` | — | List, standard pagination/filtering |
| GET | `/:id` | — | Single record |

No generic `POST /`, `PUT`, or `DELETE` — a disposal is never a bare data-entry action and, once
created, is immutable (see §5).

## 8. Frontend Guide

An asset detail screen for an `Active`/`Suspended` asset offers "Scrap" and "Sell" actions (not a
generic edit form). "Scrap" needs only an optional reason. "Sell" requires `saleProceeds` and a
choice of exactly one settlement account (cash register or bank account) — the form should enforce
this XOR client-side to avoid a round-trip rejection, though the server enforces it regardless. After
either action, the asset's status badge should reflect `Disposed`/`Sold` and the disposal record
(with its computed gain/loss) becomes read-only history.

## 9. Integration

- **`accounting`**: reuses the existing `sourceType: "ASSET_DOCUMENT"` (no enum change needed — it
  already covers both depreciation and disposal documents against the same asset).
- **`asset-category`**: `disposalGainAccount`/`disposalLossAccount` are optional on the category — a
  category missing either one (and a disposal that needs it) skips GL posting entirely rather than
  posting a partially-wrong entry.
- **`finance/cash-register`, `finance/bank-account`**: read-only lookups for the settlement account's
  linked `accountId`; this module does not update `CashRegister.balance`/`BankAccount.balance` itself
  — cash/bank balance movement from asset sale proceeds is out of scope for this pass (see §12).

## 10. Security

`authorize("AssetDisposals", action)` + `checkModuleEnabled("assets")` — `"AssetDisposals"` added to
`RESOURCE_ENUM` in `modules/iam/role/role.model.js` in this pass (additive only, matching the
established convention for every prior new resource in this domain).

## 11. Reporting

Not yet integrated into `assets/asset-reports` (Asset Register / Depreciation Schedule / Asset Book
Value) — a disposal should logically remove an asset from "currently depreciating" views and could
feed a new Disposal Register / Gain-Loss report. Flagged here, not built in this pass (see §12).

## 12. Future Extensions

- **No Disposal Register / Gain-Loss report** — see §11.
- **No partial disposal** (e.g., disposing of one unit out of a batch-tracked asset) — `Asset` models
  one physical asset per document in this codebase, so this is out of scope until/unless that changes.

## 13. Architecture Decisions

- **No Draft/Posted staging**, unlike `AssetDepreciation` — a disposal is inherently a single
  point-in-time business event (an asset is either disposed of or it isn't) rather than a
  generate-then-review workflow; matches `WasteRecord`/`CashierShift`/`DailyExpense`'s "approving IS
  posting" convention rather than `AssetDepreciation`'s two-step one.
- **Snapshot fields are captured, not referenced** — `purchaseCostAtDisposal` etc. are copied at
  disposal time rather than left to be read live off `Asset` later, so the audit record remains
  accurate even if `Asset`'s own cached fields are ever corrected retroactively for an unrelated
  reason.
- **`_dispose()` is a shared private method** for both `scrapAsset()`/`sellAsset()`, with the public
  methods only validating/shaping their type-specific inputs (proceeds required + positive, XOR
  settlement account) before delegating — avoids duplicating the atomic-claim/snapshot/posting logic
  twice for what is fundamentally one operation with two entry shapes.
- **GL-posting math was verified algebraically before implementation**, not just tested after the
  fact — adopted this session after repeatedly finding posting-balance bugs during test-writing on
  earlier modules (`CashierShift`, `AssetDepreciation`) would have been more costly to find that way
  here, given disposal has four distinct line-combination shapes (gain/loss/break-even ×
  scrap-vs-sale).

## 14. Developer Notes

- Test file: `tests/integration/asset-disposal-engine.test.ts` — covers scrap (loss for full
  remaining book value, no balance change), sell-above-book-value (gain, cash register balance
  credited), sell-below-book-value (loss, via the bank-account settlement path, bank balance
  credited), sell-exactly-at-book-value (neither gain nor loss line), the `saleProceeds`/XOR
  validation rejections, the non-disposable-status and double-disposal rejections, the
  `lockedUpdateFields` lockdown on `AssetDisposal`, `assetService.transition()`'s allowed/forbidden
  moves, and the generic-`PUT`-cannot-set-`status` lockdown on `Asset`.
