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

---
---

# Final Architecture Validation

The sections above were the redesign. What follows is the validation pass requested before implementation begins: a complete ownership matrix, a complete uniqueness matrix, the cost flow traced end to end, a derived-data policy for every important calculated value, an accounting-metadata completeness check, and a final self-critique that re-challenges every recommendation in this document for unnecessary complexity. **No models are implemented in this section either** — it is still design validation.

---

## 1. Data Ownership Matrix

Ownership scope determines who administers an entity, what its lifecycle operations mean, and — critically — it is the same lens Problem 1 used to derive uniqueness scope, so this matrix and the Uniqueness Matrix in §2 must agree with each other by construction (they are cross-checked in §6).

### 1.1 Owner scopes, defined

| Scope | Definition | Administered by |
|---|---|---|
| **Platform** | System-wide reference data, identical across every tenant; not owned by any brand | Platform operators only |
| **Brand** | The tenant boundary; the brand's own catalog, configuration, and master data, potentially shared across its branches | Brand-level admin roles |
| **Branch** | Operational/transactional data generated by day-to-day activity at one physical (or virtual) location | Branch-level staff roles, brand admin oversight |
| **Employee** | Data whose subject is one staff member; administratively controlled by Brand HR, with the individual having limited self-view rights | Brand HR admin roles; employee has read access to their own record |
| **Customer** | Data whose subject is one external customer; administratively controlled by Brand CRM, with the individual holding data-subject rights (GDPR access/erasure) over their own PII | Brand CRM/support roles; customer has rights over their own data |

### 1.2 Lifecycle rules by scope (the general rule — exceptions noted per entity group below)

| Scope | Create | Archive (soft-delete) | Hard delete | Restore | Transfer |
|---|---|---|---|---|---|
| **Platform** | Platform admin only | N/A — deprecate, don't delete | Never | N/A | N/A |
| **Brand** (catalog/config) | Brand admin | Yes, standard soft-delete | Only if never referenced by any transaction; otherwise archive permanently | Yes, by brand admin | Not a normal lifecycle op — brand-to-brand transfer is an out-of-band migration, not a UI action |
| **Branch** (operational/transactional) | Normal operational flow | Only for pre-financial-posting documents (e.g. a draft Order, a Reservation); once financially posted, never soft-deleted — only reversed (§ Problem 2) | Never for anything that has posted to GL or affected inventory | Yes, for pre-posting documents only | Applies to branch-owned *master data* only (e.g. reassigning a closing branch's residual stock) — an explicit business process, never a cascading delete |
| **Employee** | On hiring | On termination — HR/financial history is retained for statutory retention periods, never hard-deleted | Never, while any financial/attendance/payroll record references the employee | Yes (rehire) | Branch reassignment is an explicit, audited transfer event, not a silent field edit |
| **Customer** | On registration/first visit | On account closure | Only via a scoped GDPR-erasure/anonymization process that strips PII while preserving the transaction shell needed for accounting integrity — never a generic delete | Yes, before erasure | Merge (walk-in → online account linking) is an explicit, audited merge event — see §6.5 |

### 1.3 Entity-by-entity ownership

| Domain | Entity | Owner Scope | Notes / exceptions to the general rule |
|---|---|---|---|
| Platform reference | `UnitOfMeasure` (system-defined subset), currency/country/language reference data, `RESOURCE_ENUM` permission catalog, subscription plan catalog | **Platform** | Tenants get read-only access; brands may *add* their own custom units (§1.1 costing) — those brand-added rows are Brand-owned, the base set is Platform-owned |
| Organization | `Brand` | **Platform-created, Brand-administered** | The one entity whose *creation* is a platform action (tenant onboarding) even though it is subsequently self-administered |
| Organization | `BrandSettings`, `Branch`, `BranchSettings`, `DeliveryArea` | **Brand** (Branch itself is Brand-owned; everything *inside* a branch is Branch-scoped, a distinct concept from Branch being *owned by* Branch) | `Branch.slug` is the one Brand-owned identifier that is functionally routing-scoped — see §2 |
| IAM | `Role`, `UserAccount` | **Brand** | `UserAccount.employee` link makes a UserAccount also Employee-adjacent, but its administrative home is Brand (login/security is a brand-wide concern) |
| HR | `Department`, `JobTitle`, `Shift`, `EmployeeSettings`, `PayrollItem`, `PayrollSettings` (once implemented), `AttendanceSettings` (once implemented) | **Brand** | Catalog/policy entities, brand-wide by default, optionally branch-restricted via an optional `branch` field |
| HR | `Employee` | **Brand**, with **Branch as an assignment attribute** (`branches[]`/`defaultBranch`), not an owner | An employee working across three branches of the same brand is one record, not three |
| HR | `EmployeeFinancialProfile`, `AttendanceRecord`, `LeaveRequest`, `Payroll`, `EmployeeAdvance`, `EmployeeFinancialTransaction` | **Employee** (subject), **Branch-scoped** (where the activity occurred), **Brand-governed** (payroll/HR policy is a brand-wide process) | Three-part ownership is intentional, not accidental complexity — it resolves the exact ambiguities (should Payroll require branch? should an advance follow the employee across branches?) the original review flagged as undocumented |
| Menu | `MenuCategory`, `Product`, `Recipe`, `ProductionRecipe` | **Brand** | A product's *availability* can be branch-restricted via settings, but the catalog entity itself is Brand-owned — one product definition serves every branch that carries it |
| Menu | `ProductReview` | **Customer** (subject), **Brand-scoped** | |
| Inventory | `StockCategory`, `StockItem` | **Brand** | The catalog definition of a raw material is brand-wide; its *quantity on hand* is branch-scoped (see next row) |
| Inventory | `Warehouse`, `Inventory` (balance), `StockLedger`, `StockLayer` (new) | **Branch** | A warehouse is physically located at one branch; its stock levels and movement history belong to that branch |
| Production | `ProductionOrder`, `ProductionRecord` | **Branch** | Production happens at a specific branch's kitchen/commissary |
| Preparation | `PreparationSection`, `PreparationTicket`, `PreparationReturn` | **Branch** | |
| Sales | `Order`, `Invoice`, `SalesReturn` | **Branch** (with **Customer** as the subject/counterparty where applicable) | The document belongs to the branch that transacted it; the customer is a party to it, not its owner |
| Sales | `OrderSettings`, `InvoiceSettings`, `Promotion`, `PromotionSettings`, `SalesReturnSettings` | **Brand** (optionally branch-overridable) | |
| Seating | `Table`, `DiningArea`, `Reservation` | **Branch** | |
| Payments | `PaymentChannel`, `PaymentMethod`, `PaymentProvider` (once implemented), `PaymentSettings` (once implemented) | **Brand**, with **Branch** as an optional scoping dimension where the physical terminal/arrangement differs per location | |
| Accounting | `Account`, `CostCenter`, `AccountingSettings`, `AccountingPeriod` | **Brand** | Chart of accounts is a brand-wide policy artifact, not per-branch |
| Accounting | `JournalEntry`, `JournalLine`, `AccountBalance` | **Branch** (required, per Problem 2), **Brand-governed** | A posting always happens at a specific branch; brand-level consolidated reporting aggregates across branches, it doesn't relocate ownership |
| Finance | `BankAccount` | **Brand** | A company bank account is not physically "at" one branch even if operationally associated with one |
| Finance | `CashRegister`, `CashierShift`, `CashTransaction`, `CashTransfer` | **Branch** | Physical cash custody is inherently branch-local |
| Purchasing | `Supplier` | **Brand** | Centralized vendor relationships, even if a specific branch places the order |
| Purchasing | `SupplierTransaction`, `PurchaseInvoice`, `PurchaseReturn`, `PurchasingSettings` | **Branch** (with **Brand**-owned `Supplier` as counterparty) | |
| Assets | `AssetCategory` | **Brand** (see §6.2 — this fixes a gap: the current model has no `brand` field at all) | |
| Assets | `Asset`, `AssetDepreciation`, `AssetMaintenance`, `AssetPurchaseInvoice`, `AssetTransaction` | **Branch** | Physical assets are located at, and depreciated at, a specific branch |
| Expense | `Expense` (type catalog) | **Brand** (optionally branch-restricted) | |
| Expense | `DailyExpense` | **Branch** | |
| CRM | `OnlineCustomer`, `OfflineCustomer`, `CustomerMessage` | **Customer** (subject), **Brand-scoped** (not Branch — a customer's relationship is with the brand; they may order from any of its branches) | |
| Loyalty | `CustomerLoyalty`, `LoyaltyTransaction` | **Customer** (subject), **Brand-scoped** | |
| Loyalty | `LoyaltyReward`, `LoyaltySettings` | **Brand** | |
| System settings | `TaxConfig`, `DiscountSettings`, `ServiceCharge`, `NotificationSettings`, `PrintSettings` | **Brand** (`{brand, branch}` unique — brand-wide default with optional branch override, per the existing correct pattern) | |
| Audit | `AuditLog` | **Brand** (write scope), **Platform**-grade integrity guarantee (append-only, no owner may delete it — see Problem 4) | The one entity where "owner" does not imply "can delete" — this is deliberate |

---

## 2. Uniqueness Strategy Matrix

Two distinct kinds of uniqueness appear in this system and must not be conflated: **identifier uniqueness** (a business code that must not collide within its scope) and **singleton/cardinality uniqueness** (there must be exactly one config document per scope). They get separate tables.

### 2.1 Identifier uniqueness — complete matrix

A fourth class is added here beyond the three from Problem 1, because one real exception exists: an identifier whose entire *function* is platform-wide routing.

| Identifier | Scope | Rationale | Index |
|---|---|---|---|
| `Brand.slug` | **Platform (global)** | The one legitimate global-uniqueness case: its function is a platform-wide routing/subdomain key, not a tenant-internal code — global scope is what makes it work, not a mistake | `{slug: 1}` unique |
| `Branch.slug` | Brand | Routes *within* a brand's namespace (`brandslug.app/branchslug`) — brand, not global, since the outer segment already disambiguates brands | `{brand: 1, slug: 1}` unique |
| `Branch.code`, `Department.code`, `Shift.code`, `PayrollItem.code`, `Account.code`, `CostCenter.code`, `Expense.code`, `StockCategory.categoryCode` | Brand (catalog code) | Tenant-assigned catalog identifiers | `{brand: 1, code: 1}` unique |
| `Employee.employeeCode`, `Employee.nationalID`, `UserAccount.username` | Brand | Two employees at *different* brands legitimately sharing a national ID or a username is normal (unrelated people/unrelated tenants); within one brand it must be unique | `{brand: 1, field: 1}` unique |
| `UserAccount.email`, `UserAccount.phone`, `OnlineCustomer.email`, `OfflineCustomer.phone` | Brand | Same reasoning; sparse since optional | `{brand: 1, field: 1}` unique, sparse |
| `Product.sku`, `StockItem.SKU` | Brand | Tenant-assigned catalog code | `{brand: 1, sku: 1}` unique, sparse |
| `Product.barcode`, `StockItem.barcode` | Brand | Externally-issued (GS1), but two unrelated brands legitimately selling the same physical product (e.g. a bottled drink) will have the *same* real barcode — enforcing global uniqueness would actively reject correct data | `{brand: 1, barcode: 1}` unique, sparse |
| `Supplier.Code`, `AssetCategory.code` (once brand-scoped, §1.3) | Brand | Tenant-assigned catalog code | `{brand: 1, code: 1}` unique |
| `BankAccount.accountNumber` | Brand | Bank-issued, but scoping globally risks cross-tenant information leakage on a duplicate-key error for no operational benefit — the platform does not need to detect that two unrelated brands opened accounts with coincidentally identical numbers at different banks | `{brand: 1, accountNumber: 1}` unique |
| Tax registration number (Branch-level field) | Brand | Same reasoning as bank account — government-issued, but not enforced globally for the same leakage-avoidance reason; cross-tenant duplicate detection, if ever needed, is an offline admin report, not a live constraint | `{brand: 1, taxNumber: 1}` unique, sparse |
| `Order.orderNum`, `Invoice.serial`, `SalesReturn.serial`, `ProductionOrder.orderNumber`, `ProductionRecord.productionNumber`, `WarehouseDocument.documentNumber`, `PurchaseInvoice.invoiceNumber`, `PurchaseReturn.invoiceNumber` (once added), `AssetPurchaseInvoice.invoiceNumber` (once added), `CashTransaction.number` (once added), `CashTransfer.number`, `SupplierTransaction.number` (once added), `DailyExpense.Number` | Brand + Branch | Sequential fiscal/operational documents, generally required by tax authorities to sequence per point of sale | `{brand: 1, branch: 1, number: 1}` unique, with `branch` **required** |
| `PaymentChannel.code` | Brand + Branch | Channel configuration can legitimately differ per branch (different terminal providers) | `{brand: 1, branch: 1, code: 1}` unique |
| `Warehouse.code`, `Table.tableNumber`, `Table.tableCode`, `DiningArea.code` | Brand + Branch | Physically located at one branch | `{brand: 1, branch: 1, field: 1}` unique |
| Custom `UnitOfMeasure.code` (brand-added units) | Brand | Brand-specific units (e.g. "tray," "portion") layered on top of the Platform-owned base set | `{brand: 1, code: 1}` unique; Platform-owned rows have `brand: null` and are excluded from this index via a partial filter |
| `CustomerLoyalty` wallet identity | Brand + polymorphic `{customerType, customer}` reference — **not** phone string (§6.5) | Fixes the phone-string-keying defect; the wallet's uniqueness is "one wallet per actual customer identity," not "one wallet per phone number" | `{brand: 1, customerType: 1, customer: 1}` unique |

### 2.2 Singleton/cardinality uniqueness — one config document per scope

These are not "codes" — they are cardinality constraints ensuring exactly one settings document exists per scope. Listing them separately avoids the mistake (seen in the original review) of treating this as the same kind of problem as identifier collisions.

| Entity | Scope | Index |
|---|---|---|
| `BrandSettings`, `EmployeeSettings`, `AccountingSettings` (per brand, no branch override), `LoyaltySettings` | Brand | `{brand: 1}` unique |
| `BranchSettings`, `InventorySettings`, `OrderSettings`, `InvoiceSettings`, `SalesReturnSettings`, `PromotionSettings` (once implemented), `PaymentSettings` (once implemented), `PayrollSettings` (once implemented), `AttendanceSettings` (once implemented), `TaxConfig`, `DiscountSettings`, `ServiceCharge`, `NotificationSettings`, `PrintSettings`, `PurchasingSettings`, `PreparationTicketSettings`, `PreparationReturnSettings` | Brand + Branch (branch nullable = brand-wide default) | `{brand: 1, branch: 1}` unique |
| `EmployeeFinancialProfile` | Employee | `{employee: 1}` unique |

### 2.3 The general rule, restated once, precisely

Never declare `unique: true` on a bare field. Every business identifier's uniqueness is a compound index whose leading key(s) are exactly its owner scope from §1 — this is the cross-check that makes §1 and §2 a single coherent design instead of two independently-maintained lists. Global uniqueness is correct in exactly one situation: the identifier's function is inherently platform-wide (routing), not merely "it happens to look like a universal code." `Brand.slug` is that situation; nothing else in this system is.

---

## 3. Cost Flow Architecture

Tracing a single unit of stock from purchase to its effect on the ledger, stage by stage, with each value's nature made explicit. This is the operational walkthrough of the three-tier model from Problem 3, plus its handoff into Problem 2's accounting layer.

| Stage | What happens | Value | Nature |
|---|---|---|---|
| **1. Purchasing** | `PurchaseInvoice` records the negotiated unit cost from `Supplier` | Unit cost per StockItem | **Stored** — this is the origin of all cost data in the system; nothing upstream calculates it |
| **2. Goods receipt** | A `WarehouseDocument` (IN) posts the received quantity; a new `StockLayer` is created | `StockLayer.unitCost` = the purchase invoice's per-unit cost, copied at receipt | **Stored** (a point-in-time copy — effectively a snapshot of the purchase price at the moment of receipt) |
| **3. Current cost basis** | For WeightedAverage items, `Inventory.avgUnitCost` is recomputed on every receipt/issue; for FIFO/LIFO items, the "cost of the next unit out" is read from the oldest/newest `StockLayer` with `remainingQuantity > 0` | Current unit cost | **Calculated** (WeightedAverage: incrementally recalculated and cached on `Inventory`; FIFO/LIFO: calculated on demand from `StockLayer`, with `Inventory.avgUnitCost` retained only as an approximate cached display figure, never the authoritative issue cost for those items) |
| **4. Consumption** | An order fulfillment or production run draws stock; a `StockLedger` outbound entry is written recording exactly which cost was deducted | Cost of goods issued | **Calculated** at the moment of consumption (stage 3's method), then **Stored** onto the immutable `StockLedger` entry — once written, a ledger line is historical fact, never recalculated |
| **5. Production rollup** | `ProductionRecord` sums its `materialsUsed` (from stage 4's stored ledger costs) plus `operationCost`; the resulting semi-finished `StockItem` gets a new `StockLayer` at that computed unit cost | Produced-good cost | **Calculated** once at production completion, **Stored** immutably on `ProductionRecord`, and **feeds back into stage 2/3** for that semi-finished item — this is the multi-level BOM rollup mechanism, requiring no schema merge between `Recipe` and `ProductionRecipe` |
| **6. Recipe costing** | `Recipe.costPerUnit` is derived from its ingredient StockItems' current cost basis (stage 3) × quantities (converted via `UnitOfMeasure`) | Recipe cost | **Cached** — recalculated on ingredient-cost change or on a schedule, never on every read (this is the field that would be needlessly expensive to compute live on every menu render) |
| **7. Product pricing** | `Product.costPrice` is sourced from its active `Recipe.costPerUnit` (stage 6) | Menu item cost | **Cached**, distinct from `Product.price` which is **Stored** (a manager-set selling price, not derived from anything) |
| **8. Sale** | At order confirmation/invoicing, the line item copies `Product.costPrice` (stage 7) at that instant into `unitCostSnapshot` | Cost at time of sale | **Snapshot** — immutable forever after; this is the value historical COGS/margin reporting reads, so it must never be affected by later ingredient price changes |
| **9. GL posting** | The `Invoice` posts to the ledger: a COGS `JournalLine` is created from the sum of `unitCostSnapshot × quantity` (stage 8), crediting Inventory and debiting COGS expense | Posted GL amount | **Calculated** at posting time from already-immutable snapshot data, then **Stored** as the `JournalLine.debit`/`credit` — itself immutable once posted (Problem 2) |
| **10. Period reporting** | `AccountBalance` aggregates `JournalLine` amounts (stage 9) over a period | Account balance | **Cached** — a read-optimization, always re-derivable from `JournalLine` (the true source of truth), never itself authoritative |

The pattern worth naming explicitly: **each stage's snapshot becomes the next stage's input, and once a stage writes its value, that value is never revisited** — cost information flows strictly forward from "negotiated purchase price" to "posted GL entry," with each intermediate stage either caching a recalculable figure (stages 3, 6, 7, 10 — cheap to invalidate and redo) or freezing an immutable historical fact (stages 2, 4, 5, 8, 9 — never recalculated, by design, because recalculating them would silently rewrite history).

---

## 4. Derived Data Strategy

A representative field from every domain touched by this redesign, each assigned one of four strategies with the reasoning:

| Field | Strategy | Why |
|---|---|---|
| `Recipe.costPerUnit`, `Product.costPrice` | **Cached** | Expensive to compute (multi-ingredient walk through UOM conversion + current cost basis); read far more often than the underlying costs change — caching with an invalidation trigger is the correct tradeoff (§ Cost Flow, stages 6–7) |
| `Product.marginPercentage` / food-cost % | **Calculated on demand** | Trivially derived from `price` and `costPrice` (both already available) at read/report time — storing it would be pure redundancy with no performance justification, since the calculation itself is a single division, not a query |
| `Invoice.total` and its line totals, once the invoice is **Posted** | **Stored** | Computed once at write time from line items, then frozen — because the invoice becomes an immutable financial document (Problem 2's discipline applies to Invoice too, not just JournalEntry); while still a **Draft**, these fields are recalculated live from items on every edit |
| `Inventory.avgUnitCost` | **Cached**, incrementally recalculated on every stock movement | Recomputing a weighted average from the full `StockLedger` history on every read does not scale to high transaction volume; incremental recalculation on each movement keeps the cache cheap to maintain and always current |
| `AccountBalance.*` | **Cached**, rebuilt from `JournalLine` | Same reasoning as Inventory — a materialized rollup for trial-balance/report performance, always re-derivable, never the source of truth (§ Problem 2 revisits this exact field) |
| `JournalEntry.totalDebit` / `totalCredit` / `isBalanced` | **Stored**, computed once inside the posting transaction | Not recalculated afterward because the entry is immutable once posted; storing them (rather than summing `JournalLine`s on every read) also makes "is this entry balanced" a trivial indexed query instead of an aggregation |
| `CustomerLoyalty.points` / `totalEarned` / `totalRedeemed` | **Cached, but write-protected** — updated exclusively by the `LoyaltyTransaction`-append service path, never by a direct field write | This is the fix for the wallet-drift defect from the original review: the wallet is a cache of the ledger, and the schema/service contract must make it *impossible* to update the cache without also appending the ledger entry that justifies the update |
| `Employee.dailyWorkingHours` / `annualLeaveDays` / `weeklyOffDay` etc. | **Calculated on demand** from `EmployeeSettings`, unless an explicit override exists | Replaces the current silent full-copy-with-no-override-flag pattern; if a specific employee's policy genuinely differs from brand default, that difference is **Stored** as an explicit override record (with a reason/audit trail), not as an unflagged duplicate of the default that can silently drift when the default changes |
| `Payroll.grossEarnings` / `netSalary` / deduction totals, once **Approved** | **Stored** | Payroll is itself a fiscal document under the same discipline as Invoice — computed once, frozen after approval, corrected only via a new adjustment transaction, never edited in place |
| `Table.currentOrder` | **Cached** denormalized pointer, kept in sync by the service layer on order open/close | Purely a read-performance convenience for the POS table-map view; always recomputable by querying `Order` if it ever desyncs, so it is a cache, not a new source of truth |
| Unit conversion display (e.g., "5000 g" shown as "5 kg") | **Calculated on demand** at render time | A pure display transform with no business meaning to persist — storing it would be redundant with `UnitOfMeasure.baseConversionFactor` and would need to stay in sync with unit settings for no benefit |
| `AuditLog.hash` | **Stored**, computed once at write time | Integral to the tamper-evidence guarantee — a hash that could be recalculated later would defeat its entire purpose (§ Problem 4) |
| `StockLayer.remainingQuantity` | **Stored**, decremented transactionally as `StockLedger` outbound entries consume it | This is the one "running total" in the system that must be stored rather than calculated on demand, because FIFO/LIFO issue selection needs to query "which layers currently have remaining stock" efficiently and repeatedly — recomputing it from the full ledger on every stock issue would defeat the purpose of having layers at all |

---

## 5. Accounting Metadata — Completeness Review

Revisiting `JournalEntry`/`JournalLine` (as redesigned in Problem 2) against the specific metadata checklist: currency, exchange rate, fiscal period, branch, cost center, posting status, approval status.

| Metadata | Present in Problem 2's design? | Correct level | Additional recommendation |
|---|---|---|---|
| **Currency + exchange rate** | Yes, at line level (`currency`, `exchangeRate`, `convertedDebit`, `convertedCredit`) — unchanged from the original model, which had this right | **Line**, not header | Different lines within one entry can legitimately be in different currencies (e.g. a foreign-currency purchase posting against a local-currency cash account) — forcing a single currency per entry would break that. Add one header-level field: `JournalEntry.baseCurrency`, a **snapshot** of the brand's base currency at posting time — protects historical reports if a brand's base currency is ever reconfigured later |
| **Fiscal period** | Yes — fixed from a free `"YYYY-MM"` string to `period: ObjectId ref AccountingPeriod` on both `JournalEntry` and `JournalLine` (denormalized onto the line for reporting-query performance) | **Both**, line denormalized from header | No further change needed |
| **Branch** | Yes, required on both, per the document-class rule in §2.1 | **Both** | No further change needed |
| **Cost center** | Yes, optional, at line level only | **Line only** | Correct as designed — different lines in one entry (e.g. a payroll allocation split across departments) can legitimately hit different cost centers; duplicating a cost center on the header would be meaningless when lines disagree, so it must not be added there |
| **Posting status** | Yes — `status` enum (Pending/Posted/Rejected) | Header | **Add `"Reversed"` as a distinct status**, separate from `"Rejected"` — Rejected means "never posted," Reversed means "was posted, then a correcting reversal entry was created" (`reversalOf`/`reversedBy`, per Problem 2). Conflating the two loses information a reconciliation report needs |
| **Approval status** | Not currently separated from posting — `postedBy`/`postedAt` conflates "who authorized this" with "who/what caused it to post" | Header | **Add `approvedBy`/`approvedAt`, distinct from `postedBy`/`postedAt`** — supports an optional maker-checker control (one user prepares, a different authorized user approves before posting) common in enterprise accounting audit requirements. Deliberately **nullable/optional**: brands that don't need a separate approval step simply leave these fields unset and posting behaves as it does today; the fields exist so the capability is available without forcing workflow on every tenant |
| **Entry origin** | Not previously modeled | Header | **Add `origin: enum["System", "Manual", "Adjusting", "Closing"]`** — lets reporting and audit review distinguish system-auto-generated postings (e.g. from Invoice/PurchaseInvoice) from manually-entered journal entries, which generally warrant more audit scrutiny |

No further accounting metadata gaps were found beyond the checklist provided — the review confirms the checklist was complete for this system's needs rather than surfacing additional categories.

---

## 6. Final Consistency Review

Every recommendation in this document, re-challenged once more for necessity, with each verdict stated plainly.

**6.1 — `StockLayer` for every stock item, unconditionally?** Challenged and trimmed. Creating a lot/layer document for every single receipt of every `StockItem` — including simple `WeightedAverage`-method items with no expiry or batch tracking need — would bloat the collection with tracking data nobody reads. **Refinement:** `StockLayer` rows are created only for StockItems where `costMethod IN ["FIFO", "LIFO"]` **or** `hasExpiry`/`batchTrackingEnabled` is true. A plain WeightedAverage, non-perishable item (e.g. napkins) never generates a `StockLayer` row — its cost basis lives entirely on `Inventory.avgUnitCost`, exactly as today. This keeps the addition scoped to the items that actually need it.

**6.2 — Is a hash-chained `AuditLog` blockchain-style over-engineering?** Re-defended, but scoped down explicitly. The addition is one extra string field (`hash`) and one cheap computation at write time — not a Merkle tree, not distributed consensus, not a new service. The value (tamper-*evidence*, not merely tamper-*restriction-by-permission*) is proportionate to that cost. Kept as designed, with the scope-down stated explicitly here so it is not later gold-plated into something heavier.

**6.3 — Is maker-checker approval on `JournalEntry` over-engineering for a restaurant ERP?** Genuinely borderline, called out rather than silently included. It is two nullable fields with zero enforced workflow — a brand that never sets them experiences no behavior change. Kept, on the grounds that the marginal cost is near zero and the alternative (adding it later, once a franchise-scale customer actually asks for it) means a breaking migration instead of an unused nullable field. If this project's actual near-term customer base is confirmed to be single-owner independent restaurants rather than franchise/enterprise operations, this specific field pair is the one item in this whole document that could reasonably be deferred rather than built now — flagged for an explicit product-priority decision, not assumed.

**6.4 — Does `AssetCategory` actually need a `brand` field, or was the original design intentionally platform-shared?** Re-examined, not just re-asserted. `AssetCategory` wires directly into brand-specific GL accounts (`assetAccount`, `depreciationExpenseAccount`, etc., all referencing the brand-scoped `Account` model) — a platform-shared category could never correctly point at any one brand's chart of accounts, so the linkage itself proves this must be brand-owned; it is not defensible as intentional shared reference data. Kept as a required fix, not optional.

**6.5 — Does fixing `CustomerLoyalty`'s identity key really require a new polymorphic reference, or would simply validating phone-number format be enough?** Format validation alone does not solve the actual failure modes identified in the original review (a customer's phone number changing orphans their history; a walk-in and their later online signup remain permanently unlinked). A polymorphic `{customerType, customer}` reference is the minimum structure that solves both, and it directly reuses the pattern `CustomerMessage` already established elsewhere in the codebase — this is consistency with an existing convention, not a new one being invented. Kept. The broader `OnlineCustomer`/`OfflineCustomer` merge-on-signup workflow remains flagged as a product decision requiring its own explicit design (a "walk-in becomes an online customer" merge event, with an audit trail) — **not** designed in this document, since it is a business-process decision (what happens to their historical orders/points on merge) rather than a schema question, and inventing that process unprompted here would be scope creep beyond what was asked.

**6.6 — Cross-check: does §1 (Ownership) actually agree with §2 (Uniqueness) everywhere?** Verified line by line while writing both tables above — every Branch-scoped entity's identifiers use `{brand, branch, ...}` indexes, every Brand-scoped entity's identifiers use `{brand, ...}` indexes, and the single Platform-scoped exception (`Brand.slug`) is the only global index in the entire system. No entity was found where the two tables disagreed.

**6.7 — No duplicated fields introduced by this validation pass.** `JournalEntry.approvedBy`/`postedBy` are distinct actions, not a duplicate pair (§5). `Employee`'s policy fields move from silent duplication to calculated-on-demand-with-explicit-override (§4), which *removes* duplication rather than adding any. `StockLayer.unitCost` and `StockLedger`'s per-entry cost are not duplicates of each other — one is current remaining-lot state, the other is an immutable movement log, the same log/current-state split already established between `StockLedger` and `Inventory` in the original design.

**6.8 — No unnecessary complexity remains unflagged.** Every addition in this validation pass (`StockLayer` scoping in §6.1, the audit hash-chain scope-down in §6.2, the maker-checker fields in §6.3) was explicitly weighed against a simpler alternative and either trimmed or its tradeoff stated openly rather than asserted as obviously correct. Where a decision is genuinely a product-priority call rather than a technical one (§6.3, §6.5's merge workflow), it is named as such rather than decided unilaterally in a database design document.

**6.9 — Suitability for 5–10 years, restated with this validation folded in.** The ownership matrix (§1) gives every future entity a mechanical answer to "what scope am I" by asking "who administers this and at what level does its lifecycle make sense" — the same question, asked consistently, extends to modules that don't exist yet. The uniqueness matrix (§2) is derived from, and cross-checked against, that same ownership answer, so the two cannot drift apart the way the original ad hoc per-module choices did. Nothing in this validation pass introduces a dependency on a specific transaction volume, country, or business size that would need revisiting as the platform scales — the scoping rules are structural, not tuned to today's data.

**This concludes the architecture validation. No model files were modified in this document — implementation begins only after this is reviewed and approved.**

---
---

# Business Workflow Validation

This section simulates 30 end-to-end restaurant workflows against the architecture as it would exist **after** the redesign above is implemented — the goal is to catch what the four-problem redesign didn't touch, not to re-relitigate what it already fixed. Each workflow is checked against the 9-point list (models, relationships, fields, references, indexes, accounting entries, inventory movements, audit records, reporting data). Where a workflow is fully supported, that's stated briefly. Where simulating the workflow surfaces a gap — something neither the original review nor the four-problem redesign actually closed — it's called out explicitly and carried into the Final Verdict. **No models were modified to produce this section.**

## Workflow-by-Workflow Validation

| # | Workflow | Models / relationships exercised | Validation result |
|---|---|---|---|
| 1 | **Customer Registration** | `OnlineCustomer`/`OfflineCustomer` → `CustomerLoyalty` (polymorphic ref, per redesign) → `Brand` | Structurally sound after the redesign's identity fix. **Gap (not previously raised):** neither customer model has a consent/marketing-opt-in field, yet `NotificationSettings` can send promotional messages — this was noted in the original review's CRM section as a GDPR concern but was never carried into a required schema change anywhere. Still open. |
| 2 | **Walk-in Order** | `Order` (anonymous customer allowed — correct, no forced `OfflineCustomer` link) → `PreparationTicket` | Order creation itself is fine. **Gap (already known, restated for completeness):** `PreparationTicket` still has no reference to `StockItem`/`Recipe`/consumption — the redesign's Problem 3 fixed *costing*, not the *operational trigger* that deducts stock when a kitchen ticket completes. This remains open. |
| 3 | **Dine In** | `Table` → `Order` → `PreparationTicket`(s) → `Invoice` → `JournalEntry` | Sound. `Table.currentOrder` (added in the redesign as a cache) makes the table-map read path correct. |
| 4 | **Table Transfer** | `Order.table` reassignment, `AuditLog` | Sound **once the redesign's structured `before`/`after` AuditLog fields are actually wired into the service layer for `Order` updates** — no dedicated `TableTransfer` model is needed; building one would be over-engineering for what is a single-field update with an audit trail. This is a "confirm the service layer does this," not a schema gap. |
| 5 | **Split Bill** | `Order` → `Invoice` (currently modeled as strictly one-to-one) | **Real gap, newly surfaced by this simulation.** `Invoice.order` being a singular required reference doesn't, by itself, prevent multiple `Invoice` documents from referencing the same `Order` — but nothing on `Invoice.items[]` records *which specific `Order.items[]` entries* a given split invoice covers. Without that, splitting a table's bill into three guest checks has no schema-level way to guarantee every item is billed exactly once (no double-billing, no missed items). **Required addition, not previously listed:** `Invoice.items[].orderItemId: ObjectId` referencing the specific `Order.items[]._id` it bills. |
| 6 | **Merge Orders** | Multiple `Order` documents (e.g. two rounds at one table, or two merged tables) → one `Invoice` | **Real gap, newly surfaced.** There is no shared session/visit concept (`Order.session`/`visitId` was *recommended* in the original review but never promoted into the redesign's required schema changes) and `Invoice.order` is singular. Merging requires either a shared visit identifier grouping several `Order` documents, or loosening `Invoice` to accept `orders: [ObjectId]`. This is the mirror image of the Split Bill gap (§5) — **both point at the same underlying fix: the Order↔Invoice relationship needs to be modeled as many-to-many (via `Invoice.items[].orderItemId` back-references, not by changing `Invoice.order` into an array), not the current implicit one-to-one.** |
| 7 | **Kitchen Workflow** | `Order.items[].status`, `PreparationTicket`, `PreparationSection` | Item-level status modeling itself is sound (this was already the best-modeled part of the operational chain per the original review). Same open gap as #2 — no stock-deduction trigger reference on `PreparationTicket`. |
| 8 | **Delivery Order** | `Order`(DELIVERY) → `DeliveryArea` → `Invoice.deliveryFee`/`deliveryMan` | **Gap already identified, not yet scheduled.** Delivery assignment fields live on `Invoice` (the financial document) instead of `Order` (the operational one) — this was flagged in the original review but wasn't inside any of the redesign's four problems, so it's still unaddressed. |
| 9 | **Takeaway Order** | `Order`(TAKEAWAY), no table | Sound — no gap found. |
| 10 | **Online Order** | `OnlineCustomer` → `Order.customer`/`Order.user` | **Real gap, must be corrected before implementation.** `Order.customer` and `Order.user` reference model names `"Customer"`/`"User"`, which do not exist anywhere in the codebase (the real models are `"OnlineCustomer"`/`"OfflineCustomer"`). This dangling reference was identified in the original review but was **not** included in the redesign's Required Schema Changes for any of the four problems — it must be added now: `Order.customer` should be a polymorphic `{customerType, customer}` reference matching the fix already designed for `CustomerLoyalty`. |
| 11 | **Reservation** | `Reservation` → `Table` → `Order.linkedOrder` | The "double-booking prevention" index is non-unique and doesn't actually prevent overlap (flagged in the original review). Not part of the four-problem redesign — still open. |
| 12 | **Meal Prep Subscription** | *(none)* | **No supporting model exists at all.** There is no `Subscription`, `MealPlan`, or `RecurringOrder` entity anywhere in the schema — no recurring billing cadence, no scheduled-order generation, no pause/resume/skip-a-week capability. Since "Healthy Food / Meal Prep businesses" is an explicitly named target market for this ERP, this is a genuine missing domain, not a bug in an existing one. |
| 13 | **Purchase Order** | *(none — only `PurchaseInvoice` exists)* | **No `PurchaseOrder` model exists.** The system jumps directly from "decide to buy" to `PurchaseInvoice` (the bill), with no intermediate commitment/request-to-supplier stage. Standard ERP practice is a three-way match (Purchase Order → Goods Receipt → Purchase Invoice); this system currently has only the last leg. |
| 14 | **Goods Receipt** | `WarehouseDocument`(IN) ← `PurchaseInvoice` | Functions, but — as a direct consequence of #13 — cannot be reconciled against what was originally *ordered*, only against what was *billed*. A supplier under- or over-delivering relative to a PO cannot currently be detected by the data model, because there's no PO to compare against. |
| 15 | **Inventory Consumption** | `Order`/`Production` → `StockLedger` → `StockLayer` | Structurally sound once Problem 3 lands, **contingent on the #2/#7 `PreparationTicket` stock-trigger gap being closed** — otherwise the chain from "kitchen ticket completed" to "ledger entry written" has no schema-level trace, only an implied one via settings flags. |
| 16 | **Production** | `ProductionOrder`(now requires `ProductionRecipe`, per redesign) → `ProductionRecord` → new `StockLayer` for the output item | Sound — this is one of the workflows the redesign directly and completely fixes (Recipe requirement, brand/branch scoping, cost rollup into the resulting `StockLayer`). |
| 17 | **Recipe Cost Calculation** | `Recipe`/`ProductionRecipe` → `StockItem`/`StockLayer` → cached cost fields | Fully covered by Problem 3 and the Cost Flow trace above. No gap found. |
| 18 | **Waste Recording** | `PreparationReturn`(decision=WASTE), `Consumption.variance`(reason=waste), `InventoryCount.variance` | Functions in three independent places with three different shapes. **Reporting gap, not a correctness bug:** a "total waste cost this month" report must union three differently-shaped collections; there is no unified waste/shrinkage view. Not severe enough to warrant a new model (that would be over-engineering three legitimately different waste-origin workflows into one), but worth a documented reporting-layer view rather than leaving it undiscovered by whoever builds that report first. |
| 19 | **Stock Count** | `InventoryCount` | **Known bug, not yet scheduled.** `variance` field still has `min: 0`, which rejects legitimate negative variance (shrinkage — the common real-world case). Flagged in the original review, not part of the four-problem redesign. Still open. |
| 20 | **Stock Adjustment** | `WarehouseDocument`(ADJUSTMENT) → `StockLedger` → `StockLayer` | **Refinement needed, newly surfaced.** For lot-tracked `StockItem`s (per §6.1's `StockLayer` scoping), an adjustment must identify *which* `StockLayer`(s) it corrects, not just move `Inventory.avgUnitCost`. Add `WarehouseDocument.items[].stockLayer: ObjectId` (nullable — only meaningful for lot-tracked items) so adjustments to layered stock are traceable to the specific lot being corrected. |
| 21 | **Refund** | `SalesReturn` → `Invoice` | **Gap, newly surfaced.** Problem 2's Required Schema Changes added a `journalEntry` reference to `CashTransaction`, `CashTransfer`, and the *purchasing*-side documents (`PurchaseInvoice`, `PurchaseReturnInvoice`, `AssetPurchaseInvoice`, `DailyExpense`, `AssetMaintenance`) — but **did not include `Invoice` or `SalesReturn`**, the two most central sales-side financial documents. This is an oversight in the redesign itself, not a pre-existing issue newly discovered: both need a `journalEntry` reference (and `SalesReturn` should additionally support a `reversalOf`-style link to the original sale's posting, mirroring the `JournalEntry` reversal pattern) before the accounting integration described in Problem 2 is actually complete end to end. |
| 22 | **Cancel Order** | `Order.status = CANCELLED` | **Known gap, not yet scheduled.** `cancelReason`/`cancelledBy`/`cancelledAt` and `isDeleted` were recommended in the original review's per-model Order section but were never promoted into any of the four redesign problems' required schema changes (they're Order-specific field additions, not a cross-cutting pattern any of the four problems covered). Still open. |
| 23 | **Employee Attendance** | `AttendanceRecord` | **Known bug, not yet scheduled.** `arrivalTime: required: true` still blocks absence-type records (`ABSENT`/`VACATION`/etc.). Not part of the four-problem redesign. Still open. |
| 24 | **Payroll** | `Employee` → `EmployeeFinancialTransaction` → `Payroll` → `PayrollItem` | **Two real gaps, one of them severe.** (a) `EmployeeFinancialTransaction.brand` — the single most severe individual finding in the *entire original review* (a financial ledger table with zero tenant scoping) — was **not included** in Problem 1's Required Schema Changes list, despite Problem 1 being exactly the section that should have caught it. This must be added now: `brand: ObjectId, required: true` plus the compound index `{brand, branch, payrollMonth}`. (b) `Payroll.currency` is still missing (flagged in the original review, not part of any of the four problems) — a payroll run is real money leaving the business and needs a currency field for the same reason `JournalEntry` needed `baseCurrency` (§5 above). (c) `attendance-settings.model.js` and `payroll-settings.model.js` remain empty placeholder files — a real payroll run needs `PayrollSettings` to know its pay-cycle day and rounding rules, and currently cannot, structurally. |
| 25 | **Loyalty Redemption** | `CustomerLoyalty` → `LoyaltyTransaction` → `LoyaltyReward` | **Gap, newly surfaced by generalizing Problem 2's own pattern.** The redesign gave `JournalEntry`/`JournalLine` explicit append-only immutability hooks (mirroring the codebase's pre-existing correct `AssetTransaction` pattern), but did not extend that same treatment to `LoyaltyTransaction`, even though the original review flagged `LoyaltyTransaction.updatedBy` as violating exactly the same append-only principle. **This should be generalized into one documented convention** — "every ledger-shaped collection in the system (`JournalLine`, `LoyaltyTransaction`, `StockLedger`, `AssetTransaction`, `AuditLog`) gets the same immutability hook" — rather than fixed one collection at a time as each is separately noticed. `StockLedger` in particular has never had this hook applied anywhere in either document, despite being explicitly documented as append-only in its own code comments. |
| 26 | **Coupon Redemption** | `Promotion` → `Order`/`Invoice` | **Two known gaps, not yet scheduled.** `Promotion.usageCount` (for enforcing `usageLimit`) and `Order`/`Invoice`'s missing `appliedPromotions` linkage were both flagged in the original review but are Sales-domain field additions that fell outside all four redesign problems. `promotion-settings.model.js` also remains an empty placeholder. Still open. |
| 27 | **Daily Closing** | `CashierShift.transactions` (added in Problem 2's redesign) → `CashRegister` | Sound — this is one of the workflows the redesign directly fixes (the shift-to-transaction linkage that makes reconciliation actually auditable). |
| 28 | **End of Day Accounting** | `AccountingPeriod` → `JournalEntry` | Sound at the monthly/fiscal-period level per Problem 2. **Open question, not a defect:** several jurisdictions require a daily sequential Z-report/business-day-close distinct from monthly period close; no such entity exists today. Flagged as a product-scope question (does this platform's target market require daily fiscal Z-reports?) rather than asserted as a required fix, since the answer is jurisdiction-dependent. |
| 29 | **Financial Reports** | `JournalLine` → `AccountBalance` | Sound, contingent on Problem 2 actually landing as designed (this is the workflow the entire accounting redesign exists to enable). |
| 30 | **Historical Reporting** | `Order`/`Invoice.unitCostSnapshot` | Sound going forward from the ship date, per Problem 3's own acknowledged limitation (no retroactive fabrication of historical cost snapshots for pre-existing sales) — not a new gap, restating an already-disclosed one. |

## Consolidated Gaps Surfaced by This Simulation

Separating what this simulation actually *found* (new, or newly connected across documents) from what it merely *confirmed was already known and still open*:

**Newly surfaced or newly connected (not previously stated as a required change anywhere):**
1. `Invoice.items[].orderItemId` reference is required for Split Bill / Merge Orders to be correct, not just possible (#5, #6).
2. `Order.customer`/`Order.user` dangling reference names must be fixed as part of implementation — this is a correctness bug, not a future enhancement (#10).
3. `Invoice` and `SalesReturn` were left out of Problem 2's `journalEntry`-reference list — an oversight in the redesign itself (#21).
4. `EmployeeFinancialTransaction.brand` — the original review's single most severe finding — was never actually carried into Problem 1's Required Schema Changes (#24a). This is the most important item in this entire validation to not lose.
5. The append-only immutability pattern was applied to `JournalEntry` but not generalized to the other ledger-shaped collections that need it (`LoyaltyTransaction`, `StockLedger`) (#25).
6. `WarehouseDocument.items[].stockLayer` is needed for adjustments to lot-tracked stock to be traceable (#20).
7. No `PurchaseOrder` model exists — the purchasing chain has no pre-invoice commitment stage (#13, #14).
8. No `Subscription`/`MealPlan`/recurring-order model exists at all, despite meal-prep being a named target market (#12).
9. No franchise-ownership/royalty-accounting entity exists, despite franchise chains being a named target market (see Final Verdict Q3).

**Confirmed still open (already known from the original review, not part of the four-problem redesign, restated here so they aren't lost):**
`InventoryCount.variance.min:0` (#19), `AttendanceRecord.arrivalTime` required (#23), `Order.cancelReason`/`isDeleted` (#22), `PreparationTicket` stock-deduction linkage (#2, #7, #15), `Order.deliveryFee`/`deliveryMan` misplaced on Invoice (#8), `Reservation` double-booking non-enforcement (#11), `Promotion.usageCount`/`appliedPromotions` (#26), the four empty placeholder settings/provider models (`attendance-settings`, `payroll-settings`, `promotion-settings`, `payment-provider`, `payment-settings`) (#24c, #26), customer consent/GDPR fields (#1), `Brand` subscription/billing fields.

---

## Final Verdict

**1. Can this ERP run a real restaurant?**
Not yet, as currently implemented (nothing has been implemented from either redesign document). **Once the four-problem redesign is implemented** *and* the items in "Newly surfaced" above are folded into that implementation (they are small, targeted additions, not new problems of the same size as Problems 1–4) — **yes**, for core dine-in, takeaway, delivery, kitchen, inventory, and accounting operations at a single restaurant.

**2. Can it run multiple branches?**
Yes, architecturally — this is the case the redesign was most thoroughly built for. Contingent on Problem 1 actually landing (branch-scoped uniqueness is already the dominant intended pattern; it needs to be actually applied).

**3. Can it run franchises?**
No, not fully. Multi-branch ≠ franchise. Franchise operations specifically need a franchisor/franchisee ownership distinction (which branches are corporate-owned vs. franchisee-owned), royalty/fee calculation and accounting, and typically separate P&L visibility per franchisee — none of which exists in any form across either document. This is a real, named gap, not a nuance.

**4. Can it support SaaS?**
Yes for the tenancy/security mechanics — `Brand` as tenant root, RBAC, and feature-toggle infrastructure already exist and the uniqueness redesign makes multi-tenant data isolation correct. **Partially open:** `Brand` still has no subscription/plan/billing fields (noted as Medium priority in the ownership matrix, never promoted to a required fix) — the platform can host multiple tenants safely, but can't yet bill them as a SaaS product from this data model alone.

**5. Are there any remaining architectural gaps?**
Yes — see the Consolidated Gaps list above. None of them invalidate the redesign's four core decisions (tenancy scoping, accounting structure, costing tiers, audit immutability); they are workflow-level additions the redesign's deliberately-scoped four problems didn't claim to cover, plus two items (#3, #4 above) that were genuine oversights within the redesign's own stated scope and should be corrected before implementation.

**6. Is any model still missing?**
Yes, three: **`PurchaseOrder`** (pre-invoice purchasing commitment), **`Subscription`/`MealPlan`** (recurring meal-prep orders), and a **franchise-ownership/royalty** entity. All three are absent from the schema entirely, not partially modeled.

**7. Is any relationship still incorrect?**
Yes, two must be fixed as part of implementation, not deferred: `Order.customer`/`Order.user` referencing non-existent model names, and `Invoice`'s relationship to `Order` needing item-level traceability (`orderItemId`) to correctly support split and merge billing.

**8. Would you approve this database architecture for production?**
**Not yet, as it stands across the two documents alone.** The four-problem redesign is sound and should proceed — nothing in this validation contradicts it. But it should not go to implementation without folding in the "newly surfaced" list above, because two of those items (`EmployeeFinancialTransaction.brand`, and the `Invoice`/`SalesReturn` `journalEntry` omission) are corrections to the redesign's *own* stated scope, not new scope — implementing Problems 1 and 2 exactly as written today would still ship with the single most severe finding from the original review unresolved. Approval is conditional on: (a) the "newly surfaced" list being added to the implementation plan alongside Problems 1–4, and (b) an explicit product decision — not a database decision — on whether `PurchaseOrder`, `Subscription`/`MealPlan`, and franchise/royalty support are in scope for this implementation phase or a deliberately deferred future phase. If deferred, that should be a stated decision, not a silent gap.

**This concludes the business workflow validation. No model files were modified in this document.**

---
---

# Gap Classification & Implementation Roadmap

Every item from the Consolidated Gaps list above, classified into exactly one of three categories, with the reasoning made explicit rather than asserted. The classification principle used throughout: **Critical** = no acceptable workaround exists — the defect either corrupts data, breaks a workflow restaurant staff will hit in normal (not edge-case) operation, or creates a multi-tenancy/security hole. **Important** = a real robustness gap with a workable interim mitigation (manual process, existing fallback field, or the flaw only affects a narrow edge case). **Planned Feature** = a legitimate capability the current schema doesn't attempt, and not attempting it yet is a scope decision, not a defect.

## Category 1 — Critical (Must Fix Before Production)

**1. `Invoice.items[].orderItemId` missing (Split Bill / Merge Orders correctness)**
- *Why Critical:* Without a line-level pointer back to the specific `Order.items[]` a split invoice covers, nothing prevents the same item being billed twice across two guest checks, or an item being missed entirely — this is incorrect financial data, not a missing convenience.
- *Business impact:* Wrong totals on customer-facing checks, revenue miscounted, disputes at the table, and any COGS/margin report built on invoice line items inherits the error.
- *If postponed:* Every split-bill invoice created before the fix has no way to be retroactively reconciled — the ambiguity is baked into the historical data the moment it's written.
- *Debt or roadmap:* Technical debt. Split billing is a routine dine-in operation, not a deferrable edge case.

**2. `Order.customer`/`Order.user` reference non-existent model names**
- *Why Critical:* A broken `refPath`/`ref` doesn't error — it silently fails to populate. Online ordering, loyalty accrual, and CRM history all depend on resolving an order back to its customer; today that resolution simply doesn't work.
- *Business impact:* Online orders can't be tied to the customer who placed them for loyalty, order-history, or CRM purposes — three customer-facing features are silently broken at once.
- *If postponed:* Every online order placed in the meantime accumulates with the same broken linkage; fixing the reference later doesn't retroactively repair historical orders that were never resolvable in the first place.
- *Debt or roadmap:* Technical debt — this is a pre-existing bug being carried forward, not new scope.

**3. `Invoice`/`SalesReturn` missing `journalEntry` reference**
- *Why Critical:* This is a direct, unfinished piece of Problem 2 (the accounting redesign), which was already classified Critical in the prior document. Without it, the two most common financial documents in the system (a sale and a refund) cannot be traced to their GL posting from the document side.
- *Business impact:* Nobody can answer "did this invoice actually post to the ledger, and which entry" without a manual cross-search — exactly the auditability failure Problem 2 exists to close.
- *If postponed:* Ships an accounting redesign that is provably incomplete against its own stated goal on day one.
- *Debt or roadmap:* Technical debt — this is a correction to Problem 2's own scope, not new scope.

**4. `EmployeeFinancialTransaction.brand` missing**
- *Why Critical:* A financial ledger table with zero tenant scoping is a cross-tenant data isolation defect — the single most severe individual finding across the entire review process.
- *Business impact:* Under multi-brand operation, this table cannot be safely brand-filtered by any query that relies on the field existing, which is the platform's baseline security guarantee for every other collection.
- *If postponed:* Any second-brand onboarding inherits an unscoped financial table on day one; every transaction written before the fix needs a backfill with no reliable source for a field that was never captured.
- *Debt or roadmap:* Technical debt — and the highest-severity one in this document.

**5. `InventoryCount.variance.min: 0`**
- *Why Critical:* Shrinkage (negative variance) is the *common* real-world outcome of a physical stock count, not an edge case — the constraint as written rejects or corrupts the normal case, not a rare one.
- *Business impact:* Staff performing a routine stock count cannot record a shortage correctly; the resulting adjustment direction may end up inverted if a workaround (storing `Math.abs()`) is used instead.
- *If postponed:* Every stock count performed until fixed either fails or silently produces a wrong-direction adjustment, corrupting inventory value from that point forward.
- *Debt or roadmap:* Technical debt — a one-field validation bug with no legitimate reason to exist.

**6. `AttendanceRecord.arrivalTime` required for all record types**
- *Why Critical:* Recording an absence, vacation, or sick day is routine HR activity, not an edge case, and the schema currently cannot accept it.
- *Business impact:* HR staff cannot log a normal absence-type attendance record without supplying a meaningless placeholder timestamp, corrupting the very data attendance/payroll integration depends on.
- *If postponed:* Either absence records go unrecorded (breaking payroll deduction/leave accounting) or are recorded with fabricated arrival times (breaking attendance reporting integrity).
- *Debt or roadmap:* Technical debt — a one-field validation bug.

**7. Verify no live code imports the five empty placeholder model files**
- *Why Critical (conditionally):* `attendance-settings.model.js`, `payroll-settings.model.js`, `promotion-settings.model.js`, `payment-provider.model.js`, `payment-settings.model.js` currently export nothing. If any controller or service already imports one expecting a working Mongoose model, that code path crashes on first invocation — a boot-time or first-request crash risk, which is unambiguously Critical if true.
- *Business impact:* A crash in a live request path is a production outage, not a degraded feature.
- *If postponed:* Unknown risk carried silently into production — this needs to be *checked* (a grep, not a redesign) before shipping, regardless of whether the settings themselves are built out yet.
- *Debt or roadmap:* This single verification step is Critical; the actual work of building out what these settings *contain* is Important (see below) — the two are deliberately split because "does this crash" and "is this feature-complete" are different questions with different urgency.

## Category 2 — Important (Should Fix Before Production if Time Permits)

**8. `LoyaltyTransaction`/`StockLedger` missing append-only immutability enforcement**
- *Why Important, not Critical:* Both collections document themselves as ledgers, but nothing currently exploits the gap — this is a missing enforcement layer, not active corruption. Service-layer discipline is a workable interim substitute for a database-level guard.
- *Business impact:* Without the hook, a future bug or an unreviewed code change could mutate historical points/stock-movement records with no schema-level defense — the risk grows with team size and code churn, but isn't realized today.
- *If postponed:* Carries forward as latent risk; should be added as one generalized convention (applied to both collections at once, plus `AssetTransaction` and the already-designed `JournalEntry`/`AuditLog`) rather than patched per-collection later.
- *Debt or roadmap:* Technical debt, but low-urgency — the interim mitigation (service-layer discipline + code review) is genuinely acceptable for a v1 launch.

**9. `WarehouseDocument.items[].stockLayer` for lot-tracked adjustments**
- *Why Important:* Only affects `StockItem`s using FIFO/LIFO or batch tracking (per §6.1's scoping) — the majority of simple WeightedAverage items are unaffected.
- *Business impact:* Adjustments to lot-tracked stock lose traceability to the specific lot corrected, weakening food-safety batch investigations, but the adjustment itself still posts correctly at the aggregate level.
- *If postponed:* A workable interim process (manual note in the adjustment's memo field identifying the lot) covers the gap until the field exists.
- *Debt or roadmap:* Technical debt, narrow scope.

**10. `Order.cancelReason`/`cancelledBy`/`cancelledAt`/`isDeleted`**
- *Why Important:* Cancellation itself already works (`status = CANCELLED`); this is a missing audit/reporting dimension, not a broken workflow.
- *Business impact:* Cannot report "why are orders being cancelled" (staff error vs. customer request vs. kitchen issue) without the reason field — a real operational-visibility gap, not a data-integrity one.
- *If postponed:* The generic `AuditLog` (once its structured `before`/`after` fields are wired in, per Problem 4) partially substitutes, but without a dedicated `reason` taxonomy, cancellation-cause reporting stays manual.
- *Debt or roadmap:* Technical debt, low urgency.

**11. `PreparationTicket` has no stock-deduction linkage**
- *Why Important:* Stock deduction itself is not blocked — `InventorySettings.autoDeductOnOrder` already provides a deduction trigger at the order level; what's missing is *ticket-level* traceability of that deduction, not the deduction itself.
- *Business impact:* If a ticket is rejected/cancelled after stock was already deducted at the order level, there's no schema-level path from "this specific ticket" back to "these specific ledger rows" to reverse — a reconciliation gap under a specific failure scenario, not a routine-operation break.
- *If postponed:* Kitchen-level stock reversal on ticket rejection must be handled by broader order-level logic instead of ticket-level precision — workable, less precise.
- *Debt or roadmap:* Technical debt.

**12. `Order.deliveryFee`/`deliveryMan` misplaced on Invoice instead of Order**
- *Why Important:* The fields exist and function — this is a data-modeling/domain-boundary correction, not a missing capability. Delivery orders capture and use this data successfully today, just via the "wrong" (financial rather than operational) document.
- *Business impact:* None observable to restaurant staff today; the cost is future maintainability (operational delivery-assignment logic having to reach into the financial document).
- *If postponed:* No functional regression — purely a code-cleanliness debt that compounds slowly as more delivery-specific logic accretes onto Invoice.
- *Debt or roadmap:* Technical debt, but genuinely low-urgency — safe to batch with a later Sales-domain cleanup pass rather than block production on it.

**13. `Reservation` double-booking prevention is non-enforced (misleading comment, non-unique index)**
- *Why Important, not Critical:* No data corruption results — worst case is an operational scheduling conflict (two parties for one table), which is a service-quality issue, not an accounting or multi-tenancy defect.
- *Business impact:* A double-booked table is a real, visible customer-facing failure, but restaurants have always had a manual fallback (staff visually checking the reservation book) — this system doesn't remove that fallback, it just doesn't yet automate it away.
- *If postponed:* Existing (misleading) code comment claiming prevention exists should at minimum be corrected to avoid false confidence, even if the enforcement itself waits.
- *Debt or roadmap:* Technical debt for the enforcement; the comment correction is a near-zero-cost fix that should not wait regardless of category.

**14. `Promotion.usageCount`/`Order`/`Invoice` missing `appliedPromotions` linkage**
- *Why Important, not Critical:* Orders and invoices still process correctly without it — what's missing is *enforcement* of usage limits and *traceability* of which promotion applied, not core transaction processing.
- *Business impact:* Real revenue-leakage risk (an intended "first 100 customers" promo could be redeemed unlimited times) — this is the one Important item with a genuine financial-exposure dimension, and should be prioritized accordingly within this category.
- *If postponed:* Operationally mitigate by manually monitoring promo redemption volume until the counter exists — acceptable for a small early launch, increasingly risky as promotional volume grows.
- *Debt or roadmap:* Technical debt with a real (if bounded) dollar cost the longer it's deferred.

**15. Four empty placeholder settings models — building out their actual content**
- *Why Important:* Distinct from item #7 above (which is the crash-risk check). Both `EmployeeSettings.attendance`/`.payroll` already provide a working fallback subset for attendance/payroll policy, so these workflows function today without the dedicated models — the gap is that the *intended*, cleaner design isn't realized yet, not that the workflow is blocked.
- *Business impact:* Policy configuration is currently less flexible and more scattered than intended (e.g. no per-brand promotion-approval policy), but nothing is unusable.
- *If postponed:* Continue relying on the existing fallback fields; building the dedicated models later is additive, not a breaking migration.
- *Debt or roadmap:* A mix — mostly a roadmap decision (these are genuinely incremental features), with a small technical-debt component (the fallback fields living in the "wrong" model long-term).

**16. Customer consent / GDPR fields missing**
- *Why Important (potentially Critical, pending a product/legal decision):* No functional workflow is blocked by their absence — this is a compliance-exposure gap, which this document's Critical definition (architectural defects causing incorrect data or broken workflows) doesn't strictly cover, but which carries real legal risk if the target launch market is GDPR-applicable.
- *Business impact:* Regulatory/legal exposure (fines, complaint risk) if operating in or serving customers in a jurisdiction with mandatory consent-tracking requirements — this is a business/legal risk, not a technical one.
- *If postponed:* Acceptable if the initial launch market has no such requirement; **should be escalated to Critical the moment EU/UK or any GDPR-applicable market is in scope** — flagged explicitly so this isn't silently forgotten.
- *Debt or roadmap:* Primarily a roadmap/legal decision, contingent on target market — not purely a technical call.

**17. Waste-recording reporting fragmentation (three differently-shaped sources)**
- *Why Important:* All three sources (`PreparationReturn`, `Consumption.variance`, `InventoryCount.variance`) function correctly on their own — the gap is purely at the reporting layer (a unified "total waste" view doesn't exist), not in any individual workflow.
- *Business impact:* A manager wanting one "total waste cost this period" number today must build a query that unions three collections — inconvenient, not broken.
- *If postponed:* No data is lost or wrong; the report is simply harder to build until a unified view exists.
- *Debt or roadmap:* Roadmap decision, closer to a reporting-layer feature than an architectural defect.

## Category 3 — Planned Feature (Out of Current Scope)

**18. `PurchaseOrder` model (pre-invoice purchasing commitment / three-way match)**
- *Why Planned Feature:* Many small-to-mid restaurant operations function today without formal purchase orders (call the supplier, receive goods, receive the bill) — the current `PurchaseInvoice`-only flow is a legitimate, if less rigorous, way to run purchasing, not a broken one.
- *Business impact of deferring:* No PO/GR/Invoice three-way match means over/under-delivery relative to what was ordered can't be automatically detected — a real capability gap for larger or more rigorous purchasing operations, but not a defect for smaller ones.
- *If postponed:* Purely additive when built — a new model plus a new stage in an existing flow, not a migration of existing data.
- *Debt or roadmap:* Pure roadmap decision — scope this in when the target customer base (or a specific larger account) actually needs formal procurement controls.

**19. `Subscription`/`MealPlan` (recurring meal-prep orders)**
- *Why Planned Feature:* Explicitly named by the user as an example of intentionally-deferred scope. An entire absent domain, not a defect in an existing one.
- *Business impact of deferring:* The platform cannot serve meal-prep-subscription business models until built — a market-segment limitation, not a quality defect for the segments it does serve today.
- *If postponed:* No technical debt accrues from waiting — there's nothing partially built to become stale.
- *Debt or roadmap:* Pure roadmap decision.

**20. Franchise-ownership / royalty-accounting entity**
- *Why Planned Feature:* Explicitly named by the user as an example. Multi-branch operation (already well-supported) is a prerequisite for franchise support but not the same thing.
- *Business impact of deferring:* The platform can serve corporate multi-branch chains today but not franchise-royalty business models — again a market-segment limitation.
- *If postponed:* No technical debt — this is new domain modeling whenever it's prioritized, not a retrofit of something broken.
- *Debt or roadmap:* Pure roadmap decision.

**21. `Brand` subscription/billing fields (the platform's own SaaS billing of its tenants)**
- *Why Planned Feature:* Unrelated to restaurant operations — this is about how the platform itself charges brands, not how brands run restaurants. The platform can operate (and even onboard tenants manually) without it.
- *Business impact of deferring:* Blocks self-service SaaS billing/plan management specifically, not any restaurant-facing capability.
- *If postponed:* No technical debt — additive whenever self-service billing becomes a business priority.
- *Debt or roadmap:* Pure roadmap decision.

**22. Daily sequential Z-report / business-day-close entity**
- *Why Planned Feature:* Jurisdiction-dependent — several markets require it, others don't; building it before knowing the target jurisdiction's fiscal requirements risks building the wrong shape.
- *Business impact of deferring:* Blocks compliance in jurisdictions that mandate daily sequential fiscal reporting — a market-entry gate for those specific jurisdictions, not a general defect.
- *If postponed:* No technical debt if genuinely not needed yet; becomes urgent (re-classify to Critical) the moment a specific target jurisdiction requiring it is confirmed.
- *Debt or roadmap:* Roadmap decision, explicitly gated on a jurisdiction/market decision rather than a technical one.

---

## Prioritized Implementation Roadmap

**Phase 0 — Critical (blocks production release; sequenced by dependency, not just severity)**

1. **Verify the five empty placeholder models are not imported anywhere live** (Item #7) — a five-minute grep, done first because it's the cheapest possible check and determines whether there's an active crash risk hiding in the rest of the plan.
2. **`EmployeeFinancialTransaction.brand`** (Item #4) — fixed as part of the Problem 1 tenancy migration already planned; sequence it first among the schema fixes because every other Critical item is additive to a single collection, while this one is a foundational tenant-isolation defect that other work shouldn't be built on top of.
3. **`InventoryCount.variance.min:0`** and **`AttendanceRecord.arrivalTime`** (Items #5, #6) — independent, single-field validation fixes with no cross-dependencies; ship together as a fast, low-risk batch.
4. **`Order.customer`/`Order.user` reference fix** (Item #2) — do this before Item #5 below, since the `Invoice.items[].orderItemId` and `journalEntry` additions both touch the same Sales-domain models and should land together rather than as three separate migrations of the same collections.
5. **`Invoice.items[].orderItemId`** and **`Invoice`/`SalesReturn` `journalEntry` reference** (Items #1, #3) — grouped together because both are Sales-domain additions to the same two models (`Invoice`, `SalesReturn`), completing what Problem 2's accounting redesign already started.
6. **Full `npm run typecheck` / integration smoke test** of the combined Critical batch before declaring Phase 0 complete — the same validation discipline already established for prior changes in this codebase (boot + Mongo connect + route smoke test).

**Phase 1 — Important (fast-follow, ship within the first post-launch iteration; ordered by business-impact weight, not just list order)**

1. `Promotion.usageCount`/`appliedPromotions` (real, if bounded, revenue-leakage exposure — highest business weight in this category)
2. Ledger immutability hooks generalized to `LoyaltyTransaction` and `StockLedger` (closes a latent integrity risk before it can be exploited by future code churn)
3. `Order.cancelReason`/`isDeleted`, `Reservation` double-booking (correct the misleading comment immediately regardless of when enforcement ships), `PreparationTicket` stock-deduction linkage
4. `WarehouseDocument.items[].stockLayer`, `Order.deliveryFee`/`deliveryMan` relocation, waste-recording unified reporting view
5. Build out the four placeholder settings models' actual content (distinct from Phase 0's crash-risk check)
6. Customer consent/GDPR fields — **escalate to Phase 0 immediately if a GDPR-applicable launch market is confirmed; otherwise track here**

**Phase 2 — Planned Features (product-roadmap backlog, not sequenced against Phase 0/1 — each gated on an explicit go/no-go product decision)**

- `PurchaseOrder` model — gate: does the initial target customer base need formal procurement controls?
- `Subscription`/`MealPlan` — gate: is meal-prep a launch-market segment or a later expansion?
- Franchise-ownership/royalty accounting — gate: is franchise operation a launch-market segment or a later expansion?
- `Brand` subscription/billing fields — gate: is self-service SaaS billing needed at launch, or is tenant onboarding manual initially?
- Daily Z-report/business-day-close — gate: does the initial target jurisdiction require it?

**No Phase 2 item blocks Phase 0 or Phase 1 — they are independent tracks that can be scoped into any future release without revisiting the production-readiness work above.**
