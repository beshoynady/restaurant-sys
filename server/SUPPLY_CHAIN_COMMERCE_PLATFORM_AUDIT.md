# Supply Chain & Commerce Platform — Phase 1–3 Audit (Constitution V5.0)

Status: **Phase 1 (understanding), Phase 2 (enterprise audit), and Phase 3 (gap analysis) complete. Phase 6 roadmap included below. Stopping here per Phase 7 — no code has been written, no redesign has been performed.** Scope: Supplier Management, Purchasing, Goods Receiving, Inventory & Warehouse Management, Sales Platform, Payment Platform, treated as one integrated Procure-to-Pay / Order-to-Cash chain, per instruction.

---

## Executive summary — the one finding that explains almost everything else

Across all six sub-domains, one pattern repeats with striking consistency: **rich, carefully-designed Mongoose schemas paired with a service layer that is pure CRUD.** `supplier.service.js`, `purchase-invoice.service.js`, `purchase-return.service.js`, `sales-return.service.js`, `inventory-count.service.js`, `stock-transfer-request.service.js`, `consumption.service.js`, `promotion.service.js` are all bare `new AdvancedService(Model, options)` instantiations with **zero custom methods**. Their matching `.controller.js` files are bare `BaseController` subclasses with no overrides. Every settings module in this domain (`PurchasingSettings`, `SalesReturnSettings`, most of `InventorySettings`) is fully modeled and completely unread by any service.

There is exactly **one** genuine, working, transactional business engine in this entire audit: `WarehouseDocument.postDocument()` + `StockLedger` + `Inventory` (§ Inventory Core). It has atomic negative-stock prevention, real FIFO/LIFO/WeightedAverage layer costing, and a proper Mongo-transaction-wrapped posting pipeline. It proves the codebase knows how to build this correctly — the quality just wasn't propagated to anything around it. `invoice.service.ts`'s pricing/journal-posting engine is the second genuine engine (Sales, forward direction only).

**The critical consequence, stated plainly: the one well-built piece of this whole domain — the inventory posting engine — is almost unreachable from the two business processes that should drive it.** Buying something (PurchaseInvoice) does not move stock. Selling something (Order/Invoice) does not move stock. The only way `WarehouseDocument` gets used today is a direct, manual API call — a `POST /purchasing/purchase-invoices` and a `POST /sales/orders` both complete successfully while leaving the actual inventory ledger completely untouched. A restaurant running this platform as-is today would have a menu, a POS, an accounting ledger for sales, and a warehouse module — four systems that don't talk to each other about the one thing (stock) that should tie them together.

The same disconnection pattern repeats for money: four separate places can record "a payment happened" (`Invoice.paymentMethod[]`, `PurchaseInvoice.payments[]`, `SupplierTransaction`, `CashTransaction`) and none of them populate each other. And for accounting: Sales posts to the GL (honestly, with COGS explicitly and deliberately omitted, per its own code comment, because no inventory costing reaches it); Purchasing and Sales Returns do not post at all, despite both modeling the exact fields (`journalEntry`, `accountingPosted`) that imply they should.

None of this is exploratory or theoretical — every claim below is backed by a specific file, field, or grep result from the actual codebase, gathered by three parallel research passes (Supplier/Purchasing, Inventory/Warehouse, Sales/Payment) plus direct verification against `RESOURCE_ENUM`.

---

## Phase 1 — Module inventory (what exists)

| Domain | Modules | Real service logic? |
|---|---|---|
| **Supplier Management** | `Supplier` | CRUD only |
| **Purchasing** | `SupplierTransaction`, `PurchaseInvoice`, `PurchaseReturnInvoice`, `PurchasingSettings` | CRUD only, all four |
| **Goods Receiving** | *(does not exist as a distinct step or model)* | N/A |
| **Inventory core** | `StockItem`, `StockCategory`, `Inventory`, `StockLedger`, `Warehouse`, `WarehouseDocument`, `InventorySettings` | **Real** — `WarehouseDocument.postDocument()` is a genuine transactional engine |
| **Inventory workflow** | `InventoryCount`, `StockTransferRequest`, `Consumption` | CRUD only, despite rich schemas implying real workflows |
| **Sales** | `Order`, `Invoice`, `SalesReturn`, `Promotion`, `ProductReview`, `Product`, `Recipe`, `MenuCategory`, `OrderSettings`, `InvoiceSettings`, `SalesReturnSettings` | `Invoice` has a **real** pricing + GL-posting engine; `Order`/`SalesReturn`/`Promotion` are CRUD only |
| **Payment** | `PaymentMethod`, `PaymentChannel`, `PaymentProvider`, `PaymentSettings` | Config schemas only, no transaction engine, no HTTP surface at all (unmounted) |
| **Finance (adjacent)** | `CashRegister`, `CashTransaction`, `CashTransfer`, `BankAccount` | Real schemas, real intent (`CashTransaction` explicitly designed as "single source of truth for all money transactions") but **zero call sites from Sales or Purchasing** |

---

## Phase 2 — Enterprise audit (business + technical)

### 2.1 Business logic & workflows
Every status enum in this domain (`PurchaseInvoice.status`, `PurchaseReturnInvoice.status`, `Order.status`, `Invoice.status`, `SalesReturn.refundStatus`, `WarehouseDocument.status`, `InventoryCount.status`, `StockTransferRequest.status`) is a flat string enum with **no transition-guard code anywhere**. A client can move any of these from any value to any other via a generic `PUT`, constrained only by RBAC (can this role update this resource type), never by business rule (can THIS status legally become THAT status). For a financial/operational system, this is a data-integrity gap, not a style issue — a `PAID` invoice can be silently set back to `OPEN`, a `Cancelled` purchase invoice can become `Completed` with nothing checking whether that even makes sense.

### 2.2 Data integrity & SSOT
- **Payment recording is not a single source of truth** — it's four. `Invoice.paymentMethod[]`, `PurchaseInvoice.payments[]`, `SupplierTransaction`, and `CashTransaction` each independently claim to record "money moved," with reference fields (`CashTransaction.invoiceId`/`supplierTransactionId`) that exist specifically to link them — but nothing populates those links. Reconciling "how much was actually collected today" today requires manually cross-referencing up to four collections.
- **Accounting posting is one-directional and partial.** Sales posts (minus COGS, honestly omitted). Nothing else in this whole domain posts, despite `journalEntry`/`accountingPosted` fields existing on `PurchaseInvoice`, `PurchaseReturnInvoice`, and `SalesReturn`.
- **Settings are decorative.** Every policy field surveyed in `PurchasingSettings` (~18 fields: negative-stock prevention, approval gating, tax calculation method, refund-type defaults, auto-numbering sequences) and `SalesReturnSettings` (`allowReturn`, `maxReturnMinutes`, `requireManagerApproval`, `approvalThresholdAmount`, `generateAccountingEntry`, etc.) is confirmed unread by any service outside its own model file. Contrast with `InventorySettings.allowNegativeStock` and `DiscountSettings` (Invoice's discount approval), which **are** correctly wired — proving the pattern for "read a settings doc and enforce it" already exists and works in this codebase; it just wasn't applied consistently.

### 2.3 Security
RBAC/module-toggle enforcement is inconsistent within the very domain groups that otherwise look uniform. `StockItems`, `Warehouses`, `Inventory`, `InventorySettings`, `StockLedgers`, `WarehouseDocuments` all correctly chain `authenticateToken → authorize → checkModuleEnabled`. `StockCategory`, `InventoryCount`, `StockTransferRequest`, `Consumption` have **`authenticateToken` only** — any authenticated user of any role can currently CRUD these four resource types regardless of their assigned permissions. `purchase-invoice.router.js` carries its own code comment documenting that it was previously unmounted with no authorization at all (since fixed, but recent enough to note as a pattern risk in this domain specifically).

### 2.4 Multi-branch / multi-brand
Generally solid — `Warehouse` is correctly branch-scoped (not brand-scoped) with multiple warehouses per branch explicitly supported; `Inventory`/`StockLedger` are correctly keyed per warehouse; `PurchasingSettings`/`InventorySettings` correctly support brand-wide-with-branch-override resolution (the same pattern used throughout IAM in this project). No multi-tenancy leakage found in this domain.

### 2.5 Restaurant operations gaps (industry-specific)
- **No recipe-based ingredient consumption on sale** — the single most restaurant-specific capability missing. `Recipe` exists, models ingredients with waste percentage and channel-specific variants (dine-in/takeaway/delivery portion differences), and is entirely unused by `Order`/`Invoice`.
- **No unit conversion** — `StockItem.parts`/`storageUnit`/`ingredientUnit` (e.g. "1 carton = 1000 grams") is dead schema; `StockLedger.unitType` is hardcoded `"storage"` everywhere. A restaurant buys in cartons/cases and consumes in grams/ml — this conversion is foundational to accurate recipe costing and is completely unimplemented.
- **No low-stock alerting** despite `InventorySettings.lowStockThreshold` and `StockItem.minThreshold`/`maxThreshold`/`reorderQuantity` all existing on-model — a standard, expected feature for any restaurant back-office.
- **No shift-based consumption/variance workflow** — `Consumption`'s schema (opening stock, received-during-shift, theoretical vs. actual closing, variance with waste/loss/overage reasons) is exactly the right shape for kitchen/bar shift reconciliation, but is a pure CRUD stub with no auto-population, no recipe-driven theoretical calculation, and no posting to `StockLedger`.

### 2.6 Scalability & performance
Not a concern at the current implementation's actual behavior (most of this domain does very little work per request, being CRUD-only). The one real engine (`postDocument`) is already transaction-safe and uses atomic conditional updates (`$gte` guard) rather than read-then-write races — this pattern should be the template for every engine built in the roadmap below, not reinvented per module.

---

## Phase 3 — Gap analysis

Severity scale: **Critical** (breaks the core business promise of an ERP — data doesn't reflect reality), **High** (a named, expected capability is completely missing or non-functional), **Medium** (a real but narrower capability gap), **Low** (housekeeping/consistency).

| # | Gap | Severity | Reason | Business Impact | Technical Impact | Recommended Solution |
|---|---|---|---|---|---|---|
| 1 | No Purchasing→Inventory link (no Goods Receiving step) | **Critical** | `PurchaseInvoice` has a per-line `warehouse` field implying receipt, but no code creates a `WarehouseDocument`/`StockLedger` entry from it | Stock on hand never reflects what was purchased; physical counts can never reconcile against purchase history | The one working engine (`postDocument`) is unreachable from the primary business event meant to feed it | Design and build a Goods-Receiving integration point — see Roadmap M2 |
| 2 | No Sales→Inventory link (no recipe-based deduction) | **Critical** | `Recipe` models ingredient consumption; `Order`/`Invoice` never call it | Cannot track real ingredient usage, waste, or true food cost — a core restaurant-ERP capability | Recipe is a complete, unused data model | Build recipe-driven deduction into Order/Invoice completion — see Roadmap M5 |
| 3 | No GL posting for Purchasing or Sales Returns | **Critical** | `journalEntry`/`accountingPosted` fields exist on `PurchaseInvoice`, `PurchaseReturnInvoice`, `SalesReturn` but are never set | Purchases and returns are financially invisible to the ledger; P&L and AP are incomplete | The posting-engine pattern already exists and works (Sales) — not reused | Reuse `journalEntryService.postFromSource` pattern for Purchasing/Returns — see Roadmap M3, M6 |
| 4 | Fragmented, unreconciled payment recording | **Critical** | Four places (`Invoice.paymentMethod[]`, `PurchaseInvoice.payments[]`, `SupplierTransaction`, `CashTransaction`) each claim to record payment; link fields exist but are never populated | Cash-drawer reconciliation, AR/AP aging, and true payment status are all manual and unreliable | No single source of truth for "was this paid" | Consolidate around `CashTransaction` as the actual SSOT, auto-created from Invoice/PurchaseInvoice/SupplierTransaction events — see Roadmap M8 |
| 5 | Payment Platform effectively unbuilt | **Critical** | 4 modules exist as scaffolding; zero mounted routers; zero gateway/processor code; zero RESOURCE_ENUM entries | Cannot accept card/wallet/online payment at all today — cash-only in practice | `payment-provider.router.js` also has a broken import path (would throw if ever mounted) | Mount + wire the 3 real config modules first; the gateway layer itself must be built as a **Provider-Based Adapter Architecture** from the start (not retrofitted later) — see Roadmap M8 |
| 6 | `InventoryCount`/`StockTransferRequest`/`Consumption` are stub modules | **High** | Rich schemas implying approval → execution → auto-adjustment workflows; zero service logic beyond CRUD | Physical stock-takes can't correct system stock; inter-branch transfers can't move stock; kitchen/bar shift variance tracking doesn't function | The engine they'd call (`postDocument`) already exists and works | Build the missing service layer for all three, reusing `WarehouseDocument`/`StockLedger` as the execution target — see Roadmap M4 |
| 7 | Entire Purchasing domain is CRUD-only | **High** | No auto-numbering, no tax enforcement, no approval workflow, no status guards, despite `PurchasingSettings` modeling ~18 policies | Every purchasing rule an Owner configures does nothing; invoice numbers are client-supplied (collision/gaming risk) | Settings-resolution pattern already proven elsewhere (`InventorySettings`, `DiscountSettings`) — not applied here | Build the Purchasing business engine first, since M2/M3 depend on it — see Roadmap M1 |
| 8 | Promotion engine disconnected from pricing | **High** | Complete discount/Buy-X-Get-Y schema; `computeInvoicePricing()` never queries it | Cannot run discount campaigns despite a fully-built data model | Zero consumers of an otherwise-complete module | Wire Promotion into the pricing engine — see Roadmap M7 |
| 9 | `SalesReturn` is pure CRUD | **High** | Models `journalEntry`/`reversalOfJournalEntry`; `SalesReturnSettings`' approval/refund policy never read | Returns/refunds have no accounting reversal, no inventory reversal, no approval enforcement despite a rich policy model | Same reuse-the-existing-pattern opportunity as #3 | Build the SalesReturn reversal engine — see Roadmap M6 |
| 10 | No status state-machine enforcement (Order/Invoice/PurchaseInvoice/etc.) | **High** | Flat enums, no transition guards, any value → any value via generic `PUT` | Data-integrity risk on financial documents (e.g. a paid invoice could be reopened with no business-rule check) | Affects nearly every status field surveyed in this domain | Introduce a shared transition-guard utility (small, reusable) applied per model — folded into M1/M5/M6 rather than a standalone milestone |
| 11 | Supplier has no item/category pricing | **Medium** | `itemsSupplied` is a bare reference array, no price attached | Can't track negotiated pricing or compare supplier quotes; every invoice line price is ad hoc | — | Add a price-list/cost-agreement sub-structure to Supplier — see Roadmap M9 |
| 12 | No unit conversion (storage↔ingredient) | **Medium** | `StockItem.parts` dead; `StockLedger.unitType` hardcoded | Recipe costing across purchase-unit vs. consumption-unit is inaccurate/impossible | Directly undermines Recipe's purpose once M5 wires it in | Activate the conversion math as part of M5 |
| 13 | No low-stock alerting | **Medium** | `lowStockThreshold`/`minThreshold`/`maxThreshold`/`reorderQuantity` all exist, unread | No proactive reorder signal — standard expected restaurant back-office feature | — | Add as part of M4 (ties naturally to Inventory workflow completion) |
| 14 | Inconsistent RBAC/module-gating | **Medium** | `StockCategory`, `InventoryCount`, `StockTransferRequest`, `Consumption` routers missing `authorize()`/`checkModuleEnabled()` | Any authenticated user can currently CRUD these regardless of role | Security gap, low effort to close | Quick, low-risk fix — see Roadmap M0 |
| 15 | RESOURCE_ENUM/module mismatches | **Low** | `MenuSettings`/`InventoryReports` have no module; `ProductReviews` module exists but is unmounted; Payment Platform has zero RESOURCE_ENUM representation | Minor — mostly housekeeping, except `ProductReview` which is a complete, working feature sitting unreachable for free | — | Mount `ProductReview`; clean up dangling enum entries; add Payment RESOURCE_ENUM entries alongside M8 — see Roadmap M0 |
| 16 | Minor code-quality items | **Low** | `reffrance` typo, duplicate `"ProductionOut"` enum value, `Consumption.softDelete` option mismatch, `Warehouse.allowReceiving`/`allowIssuing`/`status` not enforced by `postDocument()`, broken `payment-provider` router import | Cosmetic / small correctness items | — | Batch into whichever milestone touches each file |

---

## Phase 6 — Implementation roadmap

Ordered by actual dependency, not by the domain list order in the prompt — Purchasing must become a real engine before it can be linked to Inventory; Inventory's core already works and doesn't block anything; Sales' existing engine is the template to replicate for Purchasing/Returns.

### M0 — Quick wins (low risk, can land first, independent of everything else)
**Scope:** Add missing `authorize()`/`checkModuleEnabled()` to `StockCategory`/`InventoryCount`/`StockTransferRequest`/`Consumption` routers; mount `ProductReview` router; remove/reconcile the `MenuSettings`/`InventoryReports` dangling `RESOURCE_ENUM` entries; fix `payment-provider.router.js`'s broken import path (still not mounted, just no longer broken if it is later).
**Files:** ~6 router files, `role.model.js`.
**Dependencies:** None.
**Migration:** None.
**Backward compatibility:** Full — purely additive security tightening + enabling a dormant feature.
**Risk:** Low.
**Testing:** RBAC-denial tests for the newly-gated routers; smoke test `ProductReview` endpoints.
**Rollback:** Trivial (revert router files).

### M1 — Purchasing Business Engine
**Scope:** Give `PurchaseInvoice`/`PurchaseReturnInvoice`/`SupplierTransaction` real service logic: auto-numbering from `PurchasingSettings.sequence` (mirroring `OrderSettings`/`InvoiceSettings`'s proven atomic-increment pattern), tax calculation enforcement per `taxCalculationMethod`, approval-workflow gating (`requireApprovalBeforePosting`), and a status transition guard.
**Dependencies:** None (self-contained within Purchasing).
**Migration:** Existing `PurchaseInvoice`/`PurchaseReturnInvoice` documents with client-supplied invoice numbers need a compatibility read-path (don't break existing data); new documents get server-generated numbers.
**Backward compatibility:** API request/response shape unchanged; only server-side enforcement added.
**Risk:** Medium — touches financial documents; needs careful transaction-safety review matching the `postDocument()` standard.
**Testing:** Unit tests per policy field; integration tests for sequence generation under concurrency (same pattern as existing Order/Invoice numbering tests).
**Rollback:** Feature-flaggable via `checkModuleEnabled` if needed.

### M2 — Goods Receiving / Purchasing↔Inventory Integration
**Scope:** The highest-value milestone in this whole roadmap. Requires a design decision (Phase 4, not made here): either (a) treat `PurchaseInvoice` completion itself as the receiving event and have it create a `WarehouseDocument` (`documentType:"IN"`, `transactionType:"Purchase"`) automatically, or (b) introduce a distinct Goods Receipt Note step between "invoice recorded" and "stock received" (more accurate to real restaurant operations, where the bill and the physical delivery often don't arrive together). Recommend (b) for enterprise correctness, but this needs explicit sign-off given it's a new concept, not just a link.
**Dependencies:** M1 (Purchasing must be a real engine first).
**Migration:** None for existing data (no historical PurchaseInvoices will retroactively post to inventory).
**Backward compatibility:** New, additive endpoint(s); existing PurchaseInvoice CRUD unaffected.
**Risk:** High — this is the core integration; must reuse `postDocument()`'s transaction/atomicity pattern exactly, not reimplement it.
**Testing:** Full integration test: create PurchaseInvoice → receive → verify StockLedger/Inventory reflect it, with concurrency tests matching `applyOutbound`'s existing test coverage style.
**Rollback:** New code path, disable via feature flag if issues found.

### M3 — Purchasing↔Accounting Integration
**Scope:** Wire `PurchaseInvoice`/`PurchaseReturnInvoice` to `journalEntryService.postFromSource`, reusing the exact pattern `invoice.service.ts` already proves out (best-effort, non-blocking posting; graceful skip if `AccountingSettings` unconfigured).
**Dependencies:** M1.
**Risk:** Medium — financial posting, needs the same balance-by-construction discipline as the Sales posting engine.
**Testing:** Mirror `invoice-sales-posting.test.ts`'s existing test shape for the purchase side.

### M4 — Inventory Workflow Completion
**Scope:** Build real service logic for `InventoryCount` (submit→approve→execute, auto-generating an `ADJUSTMENT` `WarehouseDocument`), `StockTransferRequest` (submit→approve→execute, auto-generating the OUT+IN `WarehouseDocument` pair `buildMovementPlan` already supports), and `Consumption` (auto-populate opening stock from `Inventory`, compute theoretical consumption from `Recipe` once M5 lands, post variance to `StockLedger`). Add low-stock alerting using existing threshold fields.
**Dependencies:** None on Purchasing; can run in parallel with M1–M3. `Consumption`'s recipe-based theoretical calculation depends on M5.
**Risk:** Medium — reuses the proven `postDocument()` engine as the execution target, so the hard part (atomic stock movement) is already solved; the new work is workflow/approval orchestration.
**Testing:** State-transition tests, variance-calculation correctness tests, concurrency tests for the generated `WarehouseDocument`.

### M5 — Sales↔Inventory Integration
**Scope:** Wire `Order`/`Invoice` completion to Recipe-based stock deduction via the same `WarehouseDocument`/`StockLedger` engine (`transactionType:"Issuance"`). Activate unit-conversion math (`StockItem.parts`) so purchase-unit and consumption-unit reconcile correctly.
**Dependencies:** None on Purchasing directly, but conceptually should land after M2 (so "what's in stock" is actually accurate before you start deducting from it).
**Risk:** High — touches the live order/sales flow; must not add latency or failure risk to order-taking (mirror Invoice's existing "best-effort, non-blocking" posting philosophy for the inventory side too, or make a deliberate choice to make it blocking — this is a Phase 4 design decision).
**Testing:** Order→Invoice→stock-deduction integration tests; negative-stock behavior under `allowNegativeStock` policy.

### M6 — Sales↔Accounting Completion
**Scope:** Build the `SalesReturn` reversal engine (accounting reversal + inventory reversal), wire `SalesReturnSettings`' approval/refund policies, and — once M5 provides real per-sale ingredient cost — add COGS posting to the existing Sales journal-entry builder (closing the gap that engine's own comment already flags as deliberately deferred).
**Dependencies:** M3 (pattern), M5 (COGS data).
**Risk:** Medium.
**Testing:** Return-reversal integration tests mirroring `journal-posting-rollback.test.ts`'s existing style.

### M7 — Promotion↔Pricing Integration
**Scope:** Extend `computeInvoicePricing()` to consult active `Promotion` documents (percentage/fixed/Buy-X-Get-Y) as an additional discount source alongside the existing manual-discount path.
**Dependencies:** None technically, but sequenced after the higher-severity items.
**Risk:** Medium — pricing-engine changes need the same rigor as the original engine's own test suite (`invoice-pricing-engine.test.ts`).

### M8 — Payment Platform Buildout (Provider-Based Adapter Architecture)
**Scope:** Phase A (low risk): mount `PaymentMethod`/`PaymentChannel`/`PaymentProvider` routers, add RESOURCE_ENUM entries, fix the broken import. Phase B: make `CashTransaction` the real SSOT — auto-create one from Invoice payment completion and from PurchaseInvoice/SupplierTransaction payment events, so cash-drawer reconciliation stops being manual. Phase C (explicitly separate, larger, later): the gateway integration layer itself, designed up front as an **Adapter Pattern** so business logic (Invoice/Order/PurchaseInvoice payment flows) never depends on a specific provider's API shape:

- A single internal contract (a `PaymentGatewayAdapter` interface, conceptually) every provider integration implements: `initiate(amount, currency, reference)`, `verify(transactionRef)` (webhook/callback handling), `refund(transactionRef, amount)`, `getStatus(transactionRef)`. Business services call only this contract, never a provider SDK directly.
- `PaymentProvider` (currently an intentional bare-identity stub, per its own header comment) becomes the registry of which adapter implementation backs each configured provider — adding a new provider should mean writing one new adapter file and registering it, with zero changes to Invoice/Order/PurchaseInvoice code.
- Target adapter roster, to be built incrementally (not all at once) — Egypt/MENA priority given the platform's existing `EGP`/`Africa/Cairo` defaults: **Paymob, Fawry, Meeza, Vodafone Cash, Orange Cash, WE Pay, ValU**. GCC: **HyperPay, MyFatoorah, Tap Payments, Geidea, Moyasar**. Global: **Stripe, PayPal, Checkout.com, Adyen, Square**. Each is a separate, individually-scoped implementation task (credentials, webhook signature verification, sandbox testing) — not a single milestone; this roadmap only commits to the adapter *contract* existing before the first adapter is built, so the first provider doesn't accidentally become the de facto contract.
- Cash remains a first-class "provider" in this model (already effectively is, via `CashRegister`/`CashTransaction`) rather than a special-cased bypass of the adapter layer — keeps `Invoice.paymentMethod[]` → `CashTransaction` → GL posting as one consistent flow regardless of payment source.

**Dependencies:** None blocking A; B benefits from M1/M3 already having established the posting-integration pattern twice; C depends on A/B being stable (the adapter layer needs a real `CashTransaction`-as-SSOT to write into).
**Risk:** A=Low, B=Medium, C=High per adapter (external dependency, credentials, webhook security — each provider integration is its own security review when scoped, not a blanket approval for all of them at once).

### M9 — Supplier Pricing
**Scope:** Add a price-list/cost-agreement structure to Supplier (per-item negotiated price, effective dates), consulted (not enforced) when creating PurchaseInvoice lines.
**Dependencies:** M1.
**Risk:** Low.

---

## What this document does not do

- Does not modify any model, service, controller, router, or settings file.
- Does not make the Goods-Receiving design decision flagged in M2 (GRN-as-separate-step vs. invoice-completion-triggers-receipt) — that's a Phase 4 decision requiring explicit approval, called out deliberately rather than assumed.
- Does not decide whether Sales-side inventory deduction (M5) should be blocking or best-effort — same reasoning.
- Does not begin Phase 4 (Domain Redesign) or any implementation. Per the constitution, stopping here for approval.
