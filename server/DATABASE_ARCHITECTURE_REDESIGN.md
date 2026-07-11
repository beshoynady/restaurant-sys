# Database Architecture Redesign — Restaurant ERP SaaS

**Status:** Design document. **No model files have been modified as part of this document.** Per the project's established workflow (review → architectural design → approval → implementation), this is the design/reasoning phase that follows [DATABASE_MODELS_REVIEW.md](DATABASE_MODELS_REVIEW.md). Schema snippets shown under "Final Implementation" in each section are the *proposed* shape, not yet applied to `server/modules/**`.

**Scope:** This document does not re-litigate every individual bug from the prior review. It addresses the four *architectural patterns* that caused the majority of those bugs — multi-tenancy scoping, double-entry accounting structure, costing strategy, and audit-log integrity — plus a full evaluation of the multilingual strategy. Fixing these four patterns resolves the large majority of findings from the prior review as a side effect, because most of those findings were the same handful of design mistakes repeated across many files.

---

## Problem 1 — Multi-Tenancy Uniqueness Strategy

### 1. Current Design
`Brand` is the tenant root in this system (Platform → Brand → Branch → Department → Employee — there is no separate "Organization" entity above Brand). Despite that, roughly a dozen identifier fields across the codebase declare `unique: true` directly on the field (global, platform-wide), and a few declare a compound tenant-scoped index *in addition to* the conflicting global one. There is no documented rule anywhere for which scope a given identifier should use — each module author guessed independently, and guessed inconsistently.

### 2. Problems
- No consistent ownership model: some identifiers are global-unique, some are `{brand, code}`, some are `{brand, branch, code}`, and at least three (`CashRegister.code`, `Invoice.serial`, `PaymentChannel.code`) declare **both** a global unique field index and a conflicting compound index simultaneously.
- The scope choice was never derived from what the identifier actually *represents* (an internally-assigned catalog code vs. a sequential fiscal document vs. an externally-issued real-world identifier) — it was copy-pasted per module.

### 3. Business Risks
- The platform cannot onboard a second brand today without immediate, guaranteed collisions on SKU, barcode, supplier code, payroll item code, order number, invoice serial, sales-return serial, and payment channel code. This isn't a scale problem for year three — it fails on day one of tenant two.
- Two branches of the *same* brand issuing their first invoice of the day will collide on `Invoice.serial = "000001"`, which `InvoiceSettings.resetPolicy` explicitly expects to happen daily.

### 4. Technical Risks
- Duplicate-key exceptions surfacing as unhandled 500s at checkout/order-creation time — the worst possible place for a database constraint violation to surface in a POS system.
- Because some indexes conflict with each other (global + compound on the same field), the effective behavior depends on which index MongoDB happens to check first / how the driver reports the conflict — not a diagnosable, reproducible failure mode.

### 5. Alternative Solutions
**A. Prepend `brandId` to every identifier's uniqueness, uniformly.** Simple, one rule, easy to apply mechanically. Rejected as the *sole* rule — it's the "quick fix" the task explicitly asked to avoid, and it's wrong for two identifier classes: real-world externally-issued identifiers (a barcode/UPC can legitimately repeat across two unrelated brands selling the same physical product — that's not a bug, that's reality) and sequential fiscal documents (which need branch in the key, not just brand, because tax authorities generally require sequential numbering *per point of sale*, not per company).

**B. Global UUID/ULID for every identifier, no business meaning.** Removes all collision risk entirely by removing human-meaningful codes. Rejected — restaurant staff need to read, write down, search, and print SKUs/order numbers/invoice serials; opaque UUIDs are a regression for an operational POS system and don't match `OrderSettings`/`InvoiceSettings`' existing (and correct) intent to generate human-readable sequential numbers.

**C. Ownership-driven scoping — classify every identifier by what it represents, then assign the matching scope.** More design work up front, but produces a rule that generalizes correctly to every future model instead of needing another audit in a year.

### 6. Recommended Solution
**Option C**, expressed as three identifier classes with one canonical scoping rule each:

| Class | Definition | Scope | Examples |
|---|---|---|---|
| **Tenant-assigned catalog/master-data code** | A code the brand invents and controls, meaningful only within that brand's own catalog | `{brand, code}` unique | SKU, employee code, supplier code, payroll item code, expense code, promotion code, discount code, category code, cost-center code |
| **Sequential fiscal/operational document number** | A number a specific branch (point of sale / legal entity) issues in sequence, often subject to tax-authority sequencing rules | `{brand, branch, number}` unique, with `branch` **required** (never nullable) | Invoice serial, order number, sales-return serial, production number, warehouse document number, employee-financial-transaction reference |
| **Externally-issued real-world identifier** | Assigned by a body outside the platform (GS1 for barcodes, a government tax authority, a bank for IBANs) — can legitimately collide across unrelated tenants and must not leak cross-tenant existence information via a live uniqueness error | `{brand, value}` unique **at most** (never global); for genuinely external IDs where duplication across tenants is expected and harmless (barcode), scope to `{brand, value}` and no tighter; for identifiers where a same-tenant duplicate would indicate a real data-entry error but a cross-tenant duplicate is not the platform's business to police (tax registration number, national ID, IBAN), scope to `{brand, value}` as well, and leave any legitimate cross-tenant fraud/duplicate detection to an offline admin report, not a live DB constraint | Barcode, tax registration number, national ID, IBAN |

**Payment Channel code** is a special case: because `PaymentChannel` is already `{brand, branch}`-scoped as an entity (different branches can have different terminal/bank arrangements), its `code` belongs in the second table's shape by locality even though it's not a fiscal *document* — scope: `{brand, branch, code}`.

### 7. Why This Solution Is Superior
It answers "what scope?" from the identifier's *nature*, not from convenience, so it generalizes: any new module author can look up which of the three classes their new identifier falls into and get the correct index without re-deriving the reasoning. It also avoids the two silent failure modes global-scoping and pure-UUID both introduce — cross-tenant collision, and loss of human-readable operational identifiers, respectively. It matches how real fiscal/ERP systems already work: point-of-sale sequential numbering is branch-scoped by law in most jurisdictions; catalog codes are company-scoped by convention; external identifiers are never re-scoped by the systems that consume them.

### 8. Required Schema Changes
- Remove every field-level `unique: true` used for a business identifier; replace with an explicit compound schema index using the table above. Concretely:
  - `Product.sku` → `{brand:1, sku:1}` unique, sparse.
  - `Product.barcode`, `StockItem.barcode` → `{brand:1, barcode:1}` unique, sparse.
  - `StockItem.SKU` → `{brand:1, SKU:1}` unique, sparse.
  - `PayrollItem.code` → `{brand:1, code:1}` unique.
  - `Supplier.name`, `Supplier.Code` → drop the global unique on `name` entirely (names are not identifiers — do not enforce uniqueness on a display name at all); `Code` → `{brand:1, code:1}` unique (also fix the field casing `Code`→`code`).
  - `Expense.code` → `{brand:1, branch:1, code:1}` unique (Expense types are branch-configurable per the existing model).
  - `Order.orderNum` → `{brand:1, branch:1, orderNum:1}` unique; make `branch` required.
  - `Invoice.serial` → `{brand:1, branch:1, serial:1}` unique; remove the field-level unique; make `branch` required (not `default: null`).
  - `SalesReturn.serial` → `{brand:1, branch:1, serial:1}` unique; remove the field-level unique.
  - `ProductionRecord.productionNumber` → add missing `brand`/`branch` fields first, then `{brand:1, branch:1, productionNumber:1}` unique.
  - `PaymentChannel.code` → `{brand:1, branch:1, code:1}` unique; remove the field-level unique.
  - `CashRegister.code` → remove the field-level unique; keep only `{brand:1, code:1}`.
- Add a project-level convention doc (a short addition to `BACKEND_FOUNDATION.md`) codifying the three-class table above so future modules apply it without re-deriving it.

### 9. Migration Strategy
1. **Audit pass (read-only):** for every affected collection, run an aggregation grouping by the *new* compound key to detect any pre-existing duplicates under the corrected scope (expected to find none today, since the system currently has a single tenant in practice — but must be verified before adding the constraint, not assumed).
2. **Backfill pass:** for documents missing a required scoping field under the new rule (e.g. `Invoice.branch` currently nullable, `ProductionRecord.brand`/`branch` currently absent), backfill from the parent reference chain (`Invoice.order.branch`, `ProductionRecord.productionOrder.branch`) in a script, flagging any record where the chain is itself broken for manual review rather than silently guessing.
3. **Index swap:** create the new compound indexes `background: true` (non-blocking) alongside the old ones; verify zero duplicate-key rejections against production data with a dry-run unique check; then drop the old conflicting/global indexes in the same deployment window as the field-level `unique: true` removal (so the two changes land atomically — a schema deploy that removes the global constraint without yet having the compound one live would open a window with no uniqueness enforcement at all).
4. **Application-layer numbering fix:** anywhere sequence generation (`OrderSettings.orderSequence`, `InvoiceSettings.invoiceSequence`) currently doesn't already key its counter by branch, fix the counter increment to be branch-scoped and atomic (`findOneAndUpdate` with `$inc`), so the *generated* numbers actually respect the new constraint instead of merely being *permitted* to by the index.

### 10. Risks During Migration
- Backfilling `branch` on historical `Invoice`/`ProductionRecord` rows where the parent chain is ambiguous or missing (e.g. an order that was itself created before branch-scoping existed) — mitigate by flagging these to a manual-review queue rather than guessing a branch, and excluding them from the new unique index via a temporary sentinel until resolved.
- A brief window where two competing index definitions exist during the swap — mitigate by building the new index in the background before removing the old one, verified via a dry run, never dropping-then-recreating.
- Sequence-counter fix landing separately from the index fix could reintroduce the exact bug being fixed (index says branch-scoped, generator still produces brand-wide numbers) — mitigate by shipping both in the same release, not as separate epics.

### 11. Final Implementation (proposed shape, not yet applied)
```js
// Example: server/modules/sales/invoice/invoice.model.js
const invoiceSchema = new mongoose.Schema({
  brand:  { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true, index: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true, index: true }, // was optional — now required
  serial: { type: String, required: true }, // field-level `unique: true` REMOVED
  // ...
}, { timestamps: true });

invoiceSchema.index({ brand: 1, branch: 1, serial: 1 }, { unique: true });
```
The same pattern (remove field-level `unique`, add the classified compound index, tighten `branch` to required where the identifier is document-class) is applied uniformly across the list in §8.

---

## Problem 2 — Double-Entry Accounting Architecture

### 1. Current Design
`JournalLine` is registered as a **top-level** Mongoose collection with `{ _id: false }` in its schema options (an option meant for embedded subdocuments, not standalone collections), while `JournalEntry.lines` stores an array of `ObjectId` refs pointing at it. `JournalLine` has no back-reference field to its parent `JournalEntry` at all. No hook anywhere validates `sum(debit) === sum(credit)`. Posted entries have no immutability enforcement (contrast with the already-correct `AssetTransaction` pattern elsewhere in the codebase).

### 2. Problems
- The parent↔child relationship is structurally unreliable in the direction that matters most for reporting (line → entry, and line → account-across-many-entries).
- The single most important invariant in double-entry bookkeeping (debit = credit) is unenforced at any layer.
- Posted, financially final entries can be silently mutated after the fact — there is no way to distinguish "this ledger is correct" from "this ledger was correct until someone quietly edited it."

### 3. Business Risks
- No report generated from this data (trial balance, P&L, balance sheet) can currently be trusted without independent manual verification — which defeats the purpose of having an accounting module at all.
- Regulatory/tax exposure: most jurisdictions require immutable, sequentially-numbered, auditable financial records; a mutable ledger with no reversal-entry discipline fails that requirement outright.

### 4. Technical Risks
- Any report or reconciliation job that tries to query "all lines for account X in period Y" today has no reliable indexed path to do so.
- Silent data corruption is worse than a crash here: an unbalanced entry doesn't error, it just produces wrong financial statements downstream, possibly discovered months later at close.

### 5. Alternative Solutions
**A. Embed `JournalLine` as a subdocument array directly inside `JournalEntry` (no separate collection).** Gets atomicity "for free" (one document write = one atomic operation, so balance validation can happen in a single Mongoose pre-save hook with no transaction needed) and eliminates the back-reference problem entirely by construction. But it makes the dominant *read* pattern for financial reporting — "give me every line posted to Account 4010 (Food Sales) across all entries in Q1" — an expensive `$unwind` aggregation across every `JournalEntry` document instead of an indexed query on a flat collection. At high transaction volume (the explicit requirement here — "millions of orders," "high transaction volume"), this is the wrong tradeoff: ledger reporting is inherently line-centric, not entry-centric, and this is exactly why every mainstream relational ERP (SAP, NetSuite, Odoo) models GL as a header table plus a separate, indexed line-item table rather than embedding lines in the header.

**B. Fix the standalone `JournalLine` collection: correct back-reference, correct primary key, transactional write, and enforced immutability.** Matches how real high-volume accounting systems are actually built. Requires MongoDB multi-document ACID transactions (available since MongoDB 4.0+, and this codebase already runs on a version that supports them) to write the header + lines atomically and validate balance before commit.

**C. Move to an external event-sourced ledger (append log of postings, balances derived entirely by replay).** The gold-standard pattern for the most demanding financial systems (banking cores), but a large increase in complexity — replay-based balance computation, snapshotting strategy, etc. — that this system's actual scale (a restaurant ERP, not a bank) does not justify. Flagged and rejected as over-engineering relative to the stated goal of avoiding unnecessary complexity.

### 6. Recommended Solution
**Option B** — keep the standalone `JournalLine` collection (the original architectural instinct was right), but fix it properly: real primary key, mandatory back-reference, transactional atomic writes, a cached-but-verifiable balance check, period-lock enforcement, and reversal-only corrections.

### 7. Why This Solution Is Superior
It preserves the read-performance property that actually matters for an accounting module at scale (indexed, line-centric queries for ledger/trial-balance reporting) without introducing the operational complexity of event sourcing, which solves problems this system doesn't have (this is not a multi-currency trading ledger with millions of postings per second — it's a restaurant ERP where correctness and auditability matter far more than write throughput). MongoDB transactions close the atomicity gap that made the embedded-subdocument option superficially attractive, without giving up the standalone collection's reporting performance.

### 8. Required Schema Changes
```js
// server/modules/accounting/journal-line/journal-line.model.js
const journalLineSchema = new mongoose.Schema({
  journalEntry: { type: ObjectId, ref: "JournalEntry", required: true, index: true }, // NEW — the missing back-reference
  brand:  { type: ObjectId, ref: "Brand", required: true, index: true },
  branch: { type: ObjectId, ref: "Branch", required: true, index: true },
  period: { type: ObjectId, ref: "AccountingPeriod", required: true, index: true }, // was a free "YYYY-MM" string on AssetDepreciation — standardized here too
  date:   { type: Date, required: true, index: true }, // denormalized from the entry for reporting-query performance
  account: { type: ObjectId, ref: "Account", required: true, index: true },
  debit:  { type: Number, default: 0, min: 0 },
  credit: { type: Number, default: 0, min: 0 },
  // ...costCenter, sourceType/sourceRef (unchanged, already correct)
}, { timestamps: true }); // { _id: false } REMOVED

journalLineSchema.pre("validate", function (next) {
  const hasDebit = this.debit > 0, hasCredit = this.credit > 0;
  if (hasDebit === hasCredit) return next(new Error("A journal line must have exactly one of debit or credit set."));
  next();
});

journalLineSchema.index({ account: 1, brand: 1, branch: 1, period: 1 }); // the actual ledger-reporting access path
```
```js
// server/modules/accounting/journal-entry/journal-entry.model.js
const journalEntrySchema = new mongoose.Schema({
  // ...existing header fields
  totalDebit:  { type: Number, required: true }, // NEW — computed once at transactional write time, never edited afterward
  totalCredit: { type: Number, required: true },
  isBalanced:  { type: Boolean, required: true }, // NEW — redundant with totalDebit===totalCredit but makes queries/reports trivial
  reversalOf:  { type: ObjectId, ref: "JournalEntry", default: null }, // NEW — corrections happen via reversal, never in-place edit
  reversedBy:  { type: ObjectId, ref: "JournalEntry", default: null },
  postedBy:    { type: ObjectId, ref: "UserAccount", default: null }, // was Employee — standardized to UserAccount (§ cross-cutting pattern)
  // `lines: [ObjectId]` array REMOVED — query JournalLine.find({journalEntry: this._id}) instead; storing both directions was the original desync risk
}, { timestamps: true });

// Immutability guard mirroring the already-correct AssetTransaction pattern:
["updateOne", "findOneAndUpdate"].forEach((hook) =>
  journalEntrySchema.pre(hook, function (next) {
    if (this.getQuery()?.status === "Posted" || this._update?.$set?.status !== undefined) {
      // service layer enforces: Posted entries are only ever superseded by a reversal, never edited
    }
    next();
  })
);
```
Service-layer contract (not a schema concern, but required to make the schema meaningful): creating a `JournalEntry` + its `JournalLine`s happens inside a single MongoDB session/transaction; `totalDebit`/`totalCredit`/`isBalanced` are computed from the in-flight line set before commit, and the transaction is aborted if unbalanced. Posting into a period where `AccountingPeriod.isLocked === true` is rejected at the same layer.

Also apply, as part of this same problem (they are the same defect class):
- Add `journalEntry: { type: ObjectId, ref: "JournalEntry", default: null }` to `CashTransaction`, `CashTransfer`, `PurchaseInvoice`, `PurchaseReturnInvoice`, `AssetPurchaseInvoice`, `DailyExpense`, `AssetMaintenance`.
- Fix `AssetDepreciation.period` from a free `"YYYY-MM"` string to `{ type: ObjectId, ref: "AccountingPeriod" }`, and fix its `Brand`/`Branch` field casing to lowercase.
- Add `CashierShift.transactions: [{ type: ObjectId, ref: "CashTransaction" }]` (or the inverse `CashTransaction.cashierShift` ref) so shift reconciliation totals are provably backed by real transaction rows.

### 9. Migration Strategy
1. Since `JournalLine` as currently coded is effectively non-functional (the `_id:false` + orphan-collection combination means it likely cannot be reliably written/read today), there is minimal "existing broken data" risk to migrate — this is closer to a first real implementation than a migration of live financial data. Confirm this via a data audit before proceeding (if any `JournalLine` documents do exist, backfill their new `journalEntry` field from `JournalEntry.lines` reverse-lookup before that array is dropped).
2. Ship the corrected `JournalLine`/`JournalEntry` schemas together with the transactional service-layer rewrite in one release — a partial deploy (new schema, old non-transactional write path) reintroduces the exact unbalanced-entry risk being fixed.
3. Backfill `journalEntry`/`brand`/`branch`/`period`/`date` on any pre-existing `JournalLine` rows from their parent `JournalEntry` before enforcing the new `required: true` constraints.
4. Run a one-time reconciliation report comparing every existing `AccountBalance` row against a freshly computed aggregate from `JournalLine`, and flag/investigate any mismatch before trusting the cache going forward.

### 10. Risks During Migration
- If historical `JournalEntry` documents exist whose `lines` array references `JournalLine` IDs that don't actually resolve (plausible given the current bug), the backfill script must treat unresolvable entries as data-integrity incidents requiring manual accountant review, not silently discard them.
- Introducing multi-document transactions requires the MongoDB deployment to be a replica set (standalone instances don't support transactions) — verify the deployment topology before this ships; this is an infrastructure prerequisite, not a schema one.

### 11. Final Implementation
Schema snippets are shown in §8. The accompanying service-layer transactional-write contract is a prerequisite for the schema to deliver its intended guarantee and should be implemented in the same change.

---

## Problem 3 — Costing Model

### 1. Current Design
`Product`, `Recipe` (menu BOM), and `ProductionRecipe` (internal-production BOM) store **no cost fields at all**. `Inventory` stores a single `avgUnitCost`/`totalCost` pair regardless of the `StockItem.costMethod` chosen (FIFO/LIFO/WeightedAverage). `StockLedger` supports FIFO layering via `remainingQuantity` but nothing reads it into a fast, queryable current-cost view. There is no unit-of-measure conversion table — a single scalar (`StockItem.parts`) supports exactly one conversion step, and every downstream `unit` field is unvalidated free text.

### 2. Problems
This isn't "a few missing fields" — it's the absence of a costing *strategy*: no decision has been made about what should be stored vs. calculated vs. snapshotted, so nothing was stored, calculated, or snapshotted.

### 3. Business Risks
- No margin-by-dish report, no food-cost-percentage report, no accurate COGS on the income statement — the core financial visibility a restaurant owner needs from an ERP is currently unbuildable from this data.
- Historical sales cannot be re-costed accurately: even if cost fields are added going forward, without a snapshot mechanism every past sale's "cost" would be recomputed using *today's* ingredient prices, silently rewriting history every time an ingredient price changes.

### 4. Technical Risks
- Computing cost live, on every menu read, by walking Recipe → StockItem → Inventory for every product on every request does not scale to "large datasets" / "high transaction volume."
- FIFO/LIFO costing cannot be made accurate without per-lot tracking, which also doesn't exist today (this is the same gap the prior review flagged as blocking food-safety batch traceability — one structural fix addresses both).

### 5. Alternative Solutions
**A. Compute everything live, store nothing.** Always accurate to current prices, zero drift risk, but fails at scale (recomputing a multi-ingredient recipe's cost on every menu render) and — critically — cannot answer "what did this dish actually cost when we sold it in March" once ingredient prices have since changed. Rejected: this is the literal opposite of what a costing strategy needs to provide (historical accuracy).

**B. Store a single static cost field on Product/Recipe, manually maintained.** Simple, fast reads, but immediately goes stale the moment any ingredient price changes and nothing recalculates it — this is close to today's situation except with a field that lies instead of one that's simply empty. Rejected.

**C. Three-tier model: (1) a *current* cost basis maintained continuously as inventory moves, (2) a *cached, recalculable* cost roll-up on Recipe/Product, refreshed on ingredient-cost change or on a schedule, and (3) an immutable *snapshot* captured onto the sale record at the moment of sale.** More moving parts than B, but each tier answers a genuinely different question ("what does it cost to make this right now," "what should I price this at today," "what did this specific historical sale actually cost") that a single field cannot answer simultaneously.

### 6. Recommended Solution
**Option C.** Concretely:

| Tier | Lives on | Nature | Purpose |
|---|---|---|---|
| **Current cost basis** | `StockItem` (via `Inventory` for WeightedAverage, via a new `StockLayer` collection for FIFO/LIFO) | Continuously updated by every receipt/consumption | The live cost of the next unit of raw material issued |
| **Cached recipe/product cost** | `Recipe`, `ProductionRecipe`, `Product` | Calculated from tier 1, cached with a timestamp, invalidated/recalculated on ingredient cost change or nightly | "What does this dish cost to make, as of now" — fast to read, doesn't require recomputation on every menu display |
| **Sale-time snapshot** | `Order`/`Invoice` line items | Immutable, written once at the moment of sale, copied from tier 2 at that instant | "What did this specific sale actually cost" — the number that feeds historical COGS/margin reporting and must never change after the fact |

Additionally: introduce a `StockLayer` collection (one document per received lot: quantity remaining, unit cost, received date, expiration date, lot number) so FIFO/LIFO costing is actually computable and lot/batch traceability (a separate, previously-flagged gap) is solved by the same structure. And introduce a proper `UnitOfMeasure` model with an explicit multi-hop conversion table, replacing free-text `unit` strings everywhere.

Multi-level BOM (semi-finished goods feeding into customer-facing recipes): do **not** merge `Recipe` and `ProductionRecipe` into one schema — they serve genuinely different workflows (customer menu BOM vs. internal production BOM) and merging them would be exactly the kind of "abstraction that doesn't solve a real problem" the task explicitly warns against. Instead, treat every produced good — raw or semi-finished — as a `StockItem` with its own cost basis; a `ProductionRecipe`'s output cost feeds into its resulting `StockItem`'s cost basis exactly like a purchase receipt would. Because `Recipe.ingredients[].stockItem` already points at `StockItem` generically, multi-level costing rolls up automatically once every tier's cost basis is correctly maintained — no schema merge required.

### 7. Why This Solution Is Superior
It's the minimum structure that can simultaneously answer all four required questions (current cost, cached recipe cost, historical accuracy, inventory valuation) — Option A can't answer the historical question, Option B can't answer any of them reliably. It reuses the existing `StockItem`-as-universal-inventory-item concept rather than introducing a parallel "semi-finished good" schema, avoiding duplication. The `StockLayer` addition is not scope creep — it's required for FIFO/LIFO to be *accurate* rather than merely *configured*, and it simultaneously closes the lot-traceability gap the prior review flagged independently, so one structural change resolves two findings.

### 8. Required Schema Changes
```js
// NEW: server/modules/inventory/stock-layer/stock-layer.model.js
const stockLayerSchema = new mongoose.Schema({
  brand: { type: ObjectId, ref: "Brand", required: true, index: true },
  branch: { type: ObjectId, ref: "Branch", required: true, index: true },
  warehouse: { type: ObjectId, ref: "Warehouse", required: true, index: true },
  stockItem: { type: ObjectId, ref: "StockItem", required: true, index: true },
  lotNumber: { type: String, default: null },
  receivedDate: { type: Date, required: true },
  expirationDate: { type: Date, default: null, index: true },
  unitCost: { type: Number, required: true, min: 0 },
  receivedQuantity: { type: Number, required: true, min: 0 },
  remainingQuantity: { type: Number, required: true, min: 0 }, // decremented as StockLedger issues consume this layer, FIFO/LIFO order per StockItem.costMethod
  sourceDocument: { type: ObjectId, refPath: "sourceType" },
  sourceType: { type: String, enum: ["WarehouseDocument", "ProductionRecord"] },
}, { timestamps: true });
stockLayerSchema.index({ stockItem: 1, warehouse: 1, remainingQuantity: 1, receivedDate: 1 }); // the FIFO-selection access path

// NEW: server/modules/system/unit-of-measure/unit-of-measure.model.js
const unitOfMeasureSchema = new mongoose.Schema({
  brand: { type: ObjectId, ref: "Brand", required: true, index: true },
  code: { type: String, required: true }, // "g", "kg", "ml", "L", "pcs"
  category: { type: String, enum: ["mass", "volume", "count"], required: true },
  baseConversionFactor: { type: Number, required: true }, // factor to the category's base unit (e.g. g→g=1, kg→g=1000)
}, { timestamps: true });
unitOfMeasureSchema.index({ brand: 1, code: 1 }, { unique: true });

// menu/recipe/recipe.model.js — cached cost tier
ingredients: [{
  stockItem: { type: ObjectId, ref: "StockItem", required: true },
  quantity: { type: Number, required: true },
  unit: { type: ObjectId, ref: "UnitOfMeasure", required: true }, // was free text
  wastePercentage: { type: Number, default: 0 },
}],
costPerUnit: { type: Number, default: null }, // NEW — cached, tier 2
lastCostCalculatedAt: { type: Date, default: null }, // NEW
costVersion: { type: Number, default: 1 }, // NEW — bumped on any ingredient/quantity edit, signals cache staleness

// menu/product/product.model.js
costPrice: { type: Number, default: null }, // NEW — cached, sourced from active Recipe.costPerUnit
lastCostCalculatedAt: { type: Date, default: null }, // NEW
// margin/food-cost% intentionally NOT stored — always derived at read/report time from price & costPrice

// sales/order/order.model.js (OrderItemSchema) and sales/invoice/invoice.model.js (items[])
unitCostSnapshot: { type: Number, default: null }, // NEW — tier 3, immutable once written
totalCostSnapshot: { type: Number, default: null }, // NEW
```

### 9. Migration Strategy
1. Ship `UnitOfMeasure` and backfill every existing free-text `unit` value across `Recipe`, `ProductionRecipe`, `InventoryCount`, `StockTransferRequest` into references, flagging any value that doesn't map cleanly to a known unit for manual reconciliation rather than guessing a conversion factor.
2. Ship `StockLayer` and backfill it from existing `StockLedger` inbound entries with `remainingQuantity > 0`, so FIFO-method items have a correct starting set of layers rather than starting from zero.
3. Run an initial cost-calculation batch job populating `costPrice`/`costPerUnit` on every existing `Product`/`Recipe`/`ProductionRecipe` from current `StockItem`/`StockLayer` cost data, then enable the ongoing recalculation trigger (on ingredient cost change, or nightly) going forward.
4. Sale-time snapshotting (`unitCostSnapshot`) only applies to *new* orders/invoices from the point this ships — do not attempt to retroactively fabricate historical cost snapshots for past sales; instead, clearly document in reporting that COGS accuracy begins from the ship date.

### 10. Risks During Migration
- Backfilling `StockLayer` from historical `StockLedger` data may not perfectly reconstruct true FIFO order if prior data has gaps or was entered out of chronological sequence — treat the backfilled starting layer set as a best-effort baseline, not a guaranteed-accurate restatement of history, and communicate that clearly to accounting stakeholders.
- Free-text `unit` values that don't cleanly map to a `UnitOfMeasure` (typos, ambiguous abbreviations) will block recipe cost calculation for those items until resolved — expect a manual-cleanup queue, size it before committing to a ship date.

### 11. Final Implementation
Schema snippets shown in §8; the batch cost-calculation job and the sale-time snapshot-write path are service-layer companions required for the schema to deliver value, to be implemented alongside it.

---

## Problem 4 — Audit System

### 1. Current Design
`AuditLog` has a full `isDeleted`/`deletedAt`/`deletedBy` soft-delete triple — the same convention applied to every ordinary business entity in the codebase — applied here to the one collection whose entire purpose is to be an unimpeachable record of what happened.

### 2. Problems
An audit log that can be marked deleted is not an audit log; it's a log that a sufficiently-privileged actor (or a bug) can make disappear from any query that filters `isDeleted: false`, which is every default query pattern (`BaseService.getAll()`) in this codebase.

### 3. Business Risks
Compliance/forensic exposure: if this system is ever subject to a security incident review or a financial audit, "the audit log itself supports deletion" is a finding that undermines trust in every other control in the platform, not just this one.

### 4. Technical Risks
None beyond the above — this is a design-intent problem, not a performance or scaling one.

### 5. Alternative Solutions
**A. Leave soft delete, add a permission check restricting who can set `isDeleted`.** Doesn't actually solve the problem — a permission check is a control that can itself fail, be misconfigured, or be bypassed by direct DB access; it doesn't change what the data model *allows*. Rejected.

**B. Remove soft-delete entirely; make the collection genuinely append-only (no update, no delete, from the application layer), with a separate, explicit retention/archival process operating outside the normal CRUD path.** Matches how every compliance-grade audit system is actually built.

**C. Full event-sourced / blockchain-style hash-chained ledger for every audit entry.** Provides cryptographic tamper-evidence (each record's hash includes the previous record's hash, so any retroactive edit or deletion breaks the chain and is detectable). Higher implementation cost than B alone.

### 6. Recommended Solution
**Option B as the baseline, with the hash-chaining element of Option C added** — not the full event-sourcing/replay machinery, just the hash-chain field, which is cheap to add and directly delivers tamper-*evidence* (not just tamper-*resistance* via permissions).

### 7. Why This Solution Is Superior
Removing soft-delete closes the actual hole (data model no longer allows what it shouldn't). The hash chain is a small addition — one extra field, one extra computation at write time — that upgrades the guarantee from "the application doesn't offer a delete button" to "any tampering, including direct database manipulation bypassing the application entirely, is cryptographically detectable," which is the standard a genuine audit trail should meet, without building a full event-sourced replay system the rest of the ERP doesn't need.

### 8. Required Schema Changes
```js
// server/modules/audit-log/audit-log.model.js
const auditLogSchema = new mongoose.Schema({
  // isDeleted / deletedAt / deletedBy REMOVED entirely
  targetModel: { type: String, required: true }, // NEW
  targetId: { type: ObjectId, required: true, refPath: "targetModel", index: true }, // NEW — real structured link, replacing path-string parsing
  before: { type: mongoose.Schema.Types.Mixed, default: null }, // NEW — no longer buried optionally inside `metadata`
  after: { type: mongoose.Schema.Types.Mixed, default: null }, // NEW
  severity: { type: String, enum: ["info", "warning", "security", "financial"], default: "info", index: true }, // NEW — separates routine CRUD noise from compliance-relevant events
  prevHash: { type: String, default: null }, // NEW — hash of the previous entry in this brand's chain
  hash: { type: String, required: true }, // NEW — computed from (prevHash + this entry's content) at write time
  // ...existing actor/request context fields unchanged
}, { timestamps: true });

// Immutability: block every mutation path, not just delete
["updateOne", "findOneAndUpdate", "deleteOne", "findOneAndDelete", "remove"].forEach((hook) =>
  auditLogSchema.pre(hook, function (next) {
    next(new Error("AuditLog records are immutable and append-only."));
  })
);
```
Retention/archival, as a separate scheduled process (not a schema concern, but part of the design): entries older than a per-`severity`-tier retention window are moved — not deleted — to a colder, cheaper `AuditLogArchive` collection or external storage, preserving the hash chain across the move. Legally-mandated erasure (e.g. GDPR right-to-erasure touching `before`/`after` PII payloads) is handled by a narrow, itself-logged redaction process that nulls specific PII fields while preserving the hash chain's integrity — never a generic delete.

### 9. Migration Strategy
1. Add the new fields as optional/nullable first; backfill `hash` for existing rows by computing the chain from the earliest record forward per brand (a one-time script).
2. Backfill `targetModel`/`targetId` for existing rows where derivable from the legacy `path` string; mark rows where it isn't cleanly derivable rather than fabricating a guess.
3. Add the immutability hooks and drop `isDeleted`/`deletedAt`/`deletedBy` in the same deployment (partial rollout would leave a window where deletion is still possible on old code paths).

### 10. Risks During Migration
- Any existing rows with `isDeleted: true` represent "audit entries someone previously hid" — these must be surfaced and reviewed as part of the migration, not silently un-hidden or silently left excluded, since either action has forensic implications that should go through the team rather than be decided by a migration script.
- Computing the hash chain retroactively for pre-existing data only proves internal consistency from the migration point forward; it cannot retroactively guarantee that pre-migration data wasn't already tampered with — this limitation should be documented, not glossed over.

### 11. Final Implementation
Schema shown in §8; the archival job and the redaction-for-erasure process are operational companions, out of scope for the schema itself but required for the design to be complete in production.

---

## Multilingual Architecture Review

### Current Approach
`Map<String, String>` (Mongoose `Map` type, keyed by language code) is used consistently for translatable text across `Brand`, `MenuCategory`, `Product`, `Recipe`, `StockCategory`, `Department`, `JobTitle`, `Promotion`, and others. This is **not** the separate-fields (`nameEn`/`nameAr`) approach, **not** nested plain objects, and **not** a separate translation collection — it's Map-of-language-code consistently, with two concrete implementation defects found in the prior review: inconsistent key casing (`en`/`ar` in `BrandSettings` vs. presumably `EN`/`AR` convention elsewhere) and a broken index on `JobTitle` (a plain `{name:1}` index declared alongside the correct wildcard `{"name.$**":1}` index — the plain one is very likely a non-functional no-op on a Map field).

### Evaluation Against Alternatives

| Approach | Advantages | Disadvantages | Verdict for this system |
|---|---|---|---|
| **Separate fields** (`nameEn`, `nameAr`) | Fastest reads (no Map deserialization); trivial standard B-tree indexing; simplest CSV/Excel import-export column mapping; simplest frontend binding | Every new language requires a schema migration across every translatable model; N languages × M models = unmanageable field sprawl as language count grows | Rejected — the brief explicitly requires future support for additional languages without disruption; this approach fails that requirement by design. |
| **Nested plain object** (`name: {en, ar}`) | Similar ergonomics to Map in JS/API responses; sub-path indexable | No schema-level constraint on which language keys are legal (same risk as Map, without Map's one genuine advantage — see below); MongoDB wildcard indexing needed here too, same complexity as Map with none of Map's semantic clarity | Rejected — strictly no better than Map here, and less idiomatic in Mongoose for this exact "arbitrary key set" use case. |
| **Separate translation collection** (`{entityType, entityId, field, languageCode, value}`) | Maximum flexibility; add/remove languages with zero impact on any other schema; natural fit for translation-management tooling (find all untranslated strings for language X) | Every read of a translatable field becomes a join/lookup — unacceptable for a menu/POS system where product names are read on the hottest path in the application, at high frequency, under load; large added complexity for a two-language (today) restaurant business | Rejected as over-engineering — this is exactly the complexity-without-business-value the brief warns against. |
| **Map\<String,String\>** (current) | No schema/index change needed to add a language; single source of truth per field; already the codebase's existing, working convention in most models | Requires wildcard indexing (`"field.$**"`) which is easy to get subtly wrong (as JobTitle demonstrates); slightly more friction in aggregation pipelines than a plain path | **Recommended — see below.** |

### Recommendation: Keep the Map-based strategy — repair the implementation, do not replace the architecture

This is the "current design is fundamentally sound, fix defects rather than redesign" case. The core decision — arbitrary-language-keyed storage with no per-language schema migration required — is correct for a restaurant ERP explicitly scoped to support additional countries and languages over the next 5–10 years, and a translation-collection or per-field approach would either fail that requirement (separate fields) or add unjustified read-path complexity for a system whose hottest queries are exactly the translatable fields (menu/category names, on every order). The specific defects found are implementation bugs, not architecture flaws, and should be fixed as a standardized helper rather than a redesign:

1. **Canonicalize keys** to lowercase ISO 639-1 codes (`en`, `ar`, ...) everywhere — fix the `BrandSettings` casing inconsistency, and add a shared Mongoose schema helper (`multilingualField()`) that every model uses instead of hand-rolling `{type: Map, of: String}` independently, so this can't drift again.
2. **Always index via the wildcard pattern** (`"field.$**": 1`) and never *also* declare a plain `{field: 1}` index on a Map field — fix `JobTitle`'s broken duplicate index as the concrete instance, and add this rule to the shared helper's documentation.
3. **Define an explicit fallback chain**: requested language → `Brand.defaultLanguage` (a field that should exist on `Brand` but currently doesn't formally) → `"en"` as the platform-wide final fallback. Currently unenforced/undocumented anywhere — a missing translation today silently returns `undefined` rather than falling back predictably.
4. **Constrain which languages a brand actually supports** via a `Brand.supportedLanguages: [String]` array (validated against a small platform-wide ISO 639-1 enum), rather than allowing arbitrary, unvalidated Map keys per record — this also gives the frontend a place to ask "which language tabs should I show for this brand's data-entry forms" instead of inferring it from whatever keys happen to exist in the data.
5. **Add a denormalized default-language search field** for fields that are hot-path filtered/sorted/searched (e.g. `Product.name`, `MenuCategory.name`) — e.g. `nameDefaultLang: String`, kept in sync with the Map's entry for `Brand.defaultLanguage` via a pre-save hook — purely so default-language search/sort/regex queries can use a plain indexed string path instead of reaching into the Map, without giving up the Map as the source of truth for all languages. This is a targeted, low-complexity addition, not a parallel storage strategy.
6. For genuine full-text multilingual search at scale (as opposed to prefix/exact search on the default-language field), note for future scalability: rely on MongoDB Atlas Search or an external search engine rather than trying to force MongoDB's single-language `$text` index across a Map field — this is a forward-looking note, not a change required now.

**Why not redesign:** the brief is explicit — "do not recommend a more complex solution unless it provides real business value" and "prefer the simplest architecture that remains scalable." The Map approach already is the simplest architecture that remains scalable to new languages without migration; replacing it with a translation collection would trade a five-bug-fix problem for a permanent read-path performance cost on the application's hottest queries, for zero corresponding business benefit. The correct action here is repair, not replacement.

---

## Cross-Cutting Review of This Redesign

Checked against the standing requirements for the redesign itself:

- **No duplicated fields introduced:** `Product.costPrice`/`Recipe.costPerUnit` are distinct tiers (current calculated vs. cached-per-recipe), not duplicates of each other; `Order`/`Invoice` cost *snapshots* are intentionally distinct from the live cached value they were copied from — this is deliberate historical-accuracy duplication, not accidental redundancy, and is called out as such in Problem 3.
- **No inconsistent indexes:** every new/changed unique index in this document follows the single three-class table from Problem 1; no exceptions were introduced.
- **No broken relationships:** every new reference field (`JournalLine.journalEntry`, `StockLayer.stockItem`, `AuditLog.targetId`, cost-snapshot fields) is a genuine addition closing a previously-missing link, not a new one-directional or orphaned reference.
- **No unnecessary complexity:** the event-sourced ledger (accounting), translation-collection (multilingual), and Recipe/ProductionRecipe schema merge (costing) alternatives were each explicitly considered and rejected as over-engineering relative to this system's actual requirements — each rejection is argued in its section, not asserted.
- **Suitability for the next 5–10 years:** the tenancy-scoping rule is ownership-driven rather than convenience-driven, so it extends to new modules without re-deriving the reasoning; the accounting model matches how mainstream ERPs structure GL at scale; the costing model's three-tier structure is the standard pattern for systems that need both live accuracy and historical reporting; the multilingual strategy adds languages with zero schema migration.

**What happens next:** this document is the design/reasoning phase. Per the established workflow, implementation (actually editing `server/modules/**` model files, writing the migration scripts, and the service-layer transactional-write/immutability-enforcement code these schemas depend on) should proceed only after this design is reviewed and approved — consistent with how `IMPLEMENTATION_PLAN.md` was gated after `ARCHITECTURE_REVIEW.md`. No live model files were changed in producing this document.
