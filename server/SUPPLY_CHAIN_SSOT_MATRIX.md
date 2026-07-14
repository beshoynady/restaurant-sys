# Supply Chain & Commerce Platform — Single Source of Truth Matrix

Status: **reference document, no code.** Required before implementation per the V5.0 mandate. Consolidates every business concept named across `SUPPLY_CHAIN_COMMERCE_PLATFORM_AUDIT.md`, `SUPPLY_CHAIN_COMMERCE_DOMAIN_REDESIGN.md`, and `SUPPLY_CHAIN_COMMERCE_ARCHITECTURE_V2.md` into one table: exactly one authoritative source per concept, everything else either a derived/cached read or explicitly not-yet-built.

**Rule applied throughout:** if a value can be computed from another document's history, it is *derived*, never independently maintained — the same discipline this codebase already applies correctly to `Inventory.avgUnitCost` (derived from `StockLedger`) and is now applied consistently to every new concept introduced by this redesign.

| Business concept | Authoritative source (SSOT) | Derived/cached elsewhere (never independently written) | Notes |
|---|---|---|---|
| Who is this brand's owner | `Brand.owner` | — | Established in `IDENTITY_MODEL.md`, unchanged |
| Supplier identity/terms | `Supplier` | — | |
| Supplier negotiated pricing | `SupplierPriceAgreement` | — | Referenced (not embedded) by Supplier |
| "We need to buy X" | `PurchaseRequest` (Level 3 only) | — | |
| Supplier quote | `SupplierQuotation` | — | |
| Commitment to buy | `PurchaseOrder` | — | Exists at all 3 procurement levels; auto-generated at Level 1 |
| Physical receipt of goods | `GoodsReceiptNote` | `PurchaseOrder.status` (rolls up from GRN completion) | The GRN is what actually moves stock — via `WarehouseDocument`, never directly |
| Supplier's bill | `PurchaseInvoice` | — | Decoupled from receiving (§5.1 of the redesign doc) |
| Vendor credit / return | `PurchaseReturnInvoice` | — | Same entity as "Vendor Credit Note" in Level-3 vocabulary |
| Amount owed to a supplier | `SupplierTransaction` (running balance) | `Supplier`-level "current balance" is a read query over this ledger, never a separately stored field | System-generated only from domain events, not client-writable except `OpeningBalance` |
| **Physical stock movement (the ledger)** | `StockLedger` | Everything downstream | **The single most important row in this table** — every inventory-affecting fact in the whole platform ultimately traces to a `StockLedger` row |
| Quantity on hand (a snapshot) | `Inventory.quantity` | Recomputed by `$inc` against `StockLedger` postings, never manually edited — enforced by this platform's own convention, not just a policy statement | |
| Weighted-average cost | `Inventory.avgUnitCost` | Derived from `totalCost/quantity` after every posting | Already correct in the existing codebase |
| FIFO/LIFO open layers | `StockLedger.remainingQuantity` | — | Consumed via `consumeLayers()`, never edited directly |
| Committed/reserved stock | `Reservation` (new, §5.1 of V2) | `Inventory.available` = `quantity - reserved` (derived at read time, never stored) | |
| Lot/batch identity | `StockLedger.lotNumber` (posting-time) | `Inventory.lots[]` (current-balance-per-lot cache, derived) | |
| Warehouse-to-warehouse movement in progress | `StockTransferRequest.status` | Not a separate "in-transit" ledger bucket — derived from the transfer's own state | |
| Physical count result | `InventoryCount` | On execution, produces one `WarehouseDocument` (ADJUSTMENT) — the count document records what was observed, the ledger records the correction | |
| Recipe / ingredient composition | `Recipe` | — | |
| Ingredient cost (at time of use) | `StockLedger`'s posted `unitCost` for that consumption event | "Recipe cost" (a report) = sum of a Recipe's ingredients at *current* `Inventory.avgUnitCost`, a point-in-time calculation, not a stored field | Distinguishes theoretical (recipe, current cost) from actual (ledger, historical cost) — required for variance reporting |
| Order (the sale itself) | `Order` | — | |
| Invoice (the bill, pricing, tax) | `Invoice` | — | |
| Sales return / refund | `SalesReturn` | — | |
| Promotion/discount definitions | `Promotion` | — | Consulted by, never duplicated into, `Invoice`'s pricing computation |
| Intent to collect payment | `PaymentIntent` | `PaymentIntent.status` is derived/cached from its own `PaymentTransaction` history — never independently set | Same snapshot+ledger pattern as `Inventory`/`StockLedger` |
| Actual money-movement event | `PaymentTransaction` | `Invoice.paymentMethod[]`/`PurchaseInvoice.payments[]` become denormalized summaries written FROM this, not independently authoritative | This is the fix for the audit's confirmed 4-way payment-recording fragmentation |
| Cash-drawer movement | `CashTransaction` | — | One `CashTransaction` per relevant `PaymentTransaction`, not a parallel fact |
| GL posting | `JournalEntry`/`JournalLine` | — | Already the correct SSOT per the earlier Accounting redesign this session; Purchasing/Returns now post through the same single engine, not a second one |
| Inventory valuation (as of a date) | *(report, not stored)* | Computed on demand from `StockLedger`/`Inventory` | Never cached as a standalone "valuation" document — would immediately become a second, driftable source of truth for the same fact |
| Reorder recommendation | *(derived signal, not stored as fact)* — the `StockItem.BelowThreshold` event firing is the trigger; the resulting `PurchaseRequest` draft (§5.2 of V2) is the one durable artifact | — | The "recommendation" itself isn't a document — only the request it produces is |
| Supplier performance score | *(report, not stored)* | Computed from `GoodsReceiptNote` timing + Quality Inspection results | Same reasoning as Inventory Valuation — a cached score would drift from the underlying receipts |
| Who can approve what | `decisionBy` (per-settings-model array of JobTitle refs) + RBAC `Role.permissions` | — | Two axes, same as the IAM redesign's Ownership/Authorization/Employment separation: *can this role act at all* (RBAC) vs. *is this specific approval delegated to this job title* (`decisionBy`) |
| Procurement workflow shape for this brand | `PurchasingSettings.procurementLevel` | — | Single source for "which of the 3 levels applies" — no code anywhere infers it from what documents happen to exist |
| When inventory deducts | `InventorySettings.deductionStrategy` | — | Single source for "which domain event triggers deduction" |
| When inventory reserves | `InventorySettings.reservationStrategy` (new — see note below) | — | Independent of `deductionStrategy`, per this message's explicit instruction that reservation and deduction are two separate configurable strategies |
| Payment provider selection for a given request | *(decision, not stored)* — computed live by the Provider Resolver from `PaymentProvider`/`PaymentSettings` | — | Deliberately not cached — provider health/availability changes faster than a cached decision would stay valid |

**One addition surfaced by building this matrix:** the previous documents modeled deduction and reservation as related but didn't fully separate their settings fields. Per this message's explicit instruction ("support at least two independent strategies"), `InventorySettings` gets **two** fields, not one: `reservationStrategy` (`CART|ORDER|KITCHEN_ACCEPTED|KITCHEN_STARTED|NONE`) and `deductionStrategy` (as already designed). A brand can reserve on order-confirm but only actually deduct once the kitchen marks an item ready, for instance — genuinely independent knobs, not one setting doing two jobs.

Nothing in this document has been implemented. It is the reference every subsequent implementation phase is checked against — if a phase is about to write a second place for one of the rows above, that is the signal to stop and re-derive instead.
