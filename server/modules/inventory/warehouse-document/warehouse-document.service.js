import WarehouseDocumentModel from "./warehouse-document.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import inventoryService from "../inventory/inventory.service.js";
import stockLedgerService from "../stock-ledger/stock-ledger.service.js";
import stockItemService from "../stock-item/stock-item.service.js";
import inventorySettingsService from "../inventory-settings/inventory-settings.service.js";
import inventoryCostEngine from "../cost-engine/inventory-cost-engine.service.js";
import domainEvents, { DomainEvent } from "../../../utils/domainEvents.js";

// V4.0 Inventory Stock Movement Engine.
//
// PLATFORM_FINAL_AUDIT.md PA-06: `WarehouseDocument` (the header) and `StockLedger` (the
// movement log) were both fully, correctly designed already — status lifecycle, FIFO layer
// tracking (`remainingQuantity`), a comprehensive `source` enum, a balance-cache table
// (`Inventory`) with the right unique index — but `warehouse-document.service.js` was a 13-line
// pure-CRUD stub: posting a document never actually moved any stock. This file is the write path
// that was missing: `postDocument()` turns a draft/approved WarehouseDocument into the StockLedger
// rows + Inventory balance updates it was always meant to produce, atomically, honoring each
// StockItem's own configured costing method and the brand's InventorySettings.allowNegativeStock
// policy (owner-configurable, not hardcoded).
//
// Deliberately NOT built this phase: automatic JournalEntry posting from a WarehouseDocument
// (the `journalEntry` ref field on this model has existed, unused, since before this phase) —
// the Journal Entry Posting Engine (V4.0 Phase 1) has exactly the primitive
// (`journalEntryService.postFromSource`) this would call; wiring it is the natural next step,
// scoped separately so this phase's surface area stays reviewable.
//
// V5.2 Enterprise Costing Platform: the WeightedAverage/FIFO/LIFO cost-determination logic that
// used to live inline in `postDocument()` was extracted, unchanged in behavior, into
// `../cost-engine/inventory-cost-engine.service.js` as a strategy map, and two new strategies
// (StandardCost, LastPurchaseCost) were added there. This file now only orchestrates: build the
// movement plan, ask the Cost Engine what a movement costs, write the ledger row + balance.

/**
 * Maps a WarehouseDocument's header (documentType/transactionType/warehouses) + its items into a
 * flat list of individual stock movements. Exported as a pure function (no I/O) so the mapping
 * rules can be unit-tested directly without a database.
 *
 * TRANSFER produces two movements per item (an OUT from the source warehouse and an IN to the
 * destination, at the same unit cost — cost follows the goods). ADJUSTMENT/InventoryCount use the
 * signed quantity on each item to decide direction (positive = found more than expected =
 * inbound; negative = found less = outbound) against `sourceWarehouse`.
 */
export function buildMovementPlan(document) {
  const { documentType, transactionType, sourceWarehouse, destinationWarehouse, items } = document;
  const plan = [];

  const OUT_SOURCE_BY_TRANSACTION = {
    ReturnPurchase: "ReturnPurchase",
    Issuance: "Issuance",
    Wastage: "Wastage",
    Damage: "Damaged",
  };

  for (const item of items) {
    if (documentType === "IN") {
      if (!destinationWarehouse) {
        throwError(`documentType "IN" requires destinationWarehouse.`, 400);
      }
      plan.push({
        stockItem: item.stockItem,
        warehouse: destinationWarehouse,
        direction: "IN",
        quantity: item.quantity,
        unitCost: item.unitCost,
        source: transactionType,
      });
    } else if (documentType === "OUT") {
      if (!sourceWarehouse) {
        throwError(`documentType "OUT" requires sourceWarehouse.`, 400);
      }
      plan.push({
        stockItem: item.stockItem,
        warehouse: sourceWarehouse,
        direction: "OUT",
        quantity: item.quantity,
        unitCost: item.unitCost,
        source: OUT_SOURCE_BY_TRANSACTION[transactionType] || transactionType,
      });
    } else if (documentType === "TRANSFER") {
      if (!sourceWarehouse || !destinationWarehouse) {
        throwError(`documentType "TRANSFER" requires both sourceWarehouse and destinationWarehouse.`, 400);
      }
      plan.push({
        stockItem: item.stockItem,
        warehouse: sourceWarehouse,
        direction: "OUT",
        quantity: item.quantity,
        unitCost: item.unitCost,
        source: "TransferOut",
      });
      plan.push({
        stockItem: item.stockItem,
        warehouse: destinationWarehouse,
        direction: "IN",
        quantity: item.quantity,
        unitCost: item.unitCost,
        source: "TransferIn",
      });
    } else if (documentType === "ADJUSTMENT") {
      if (!sourceWarehouse) {
        throwError(`documentType "ADJUSTMENT" requires sourceWarehouse.`, 400);
      }
      const source = transactionType === "InventoryCount" ? "InventoryCount" : "StockAdjustment";
      const quantity = item.quantity;

      plan.push(
        quantity >= 0
          ? { stockItem: item.stockItem, warehouse: sourceWarehouse, direction: "IN", quantity, unitCost: item.unitCost, source }
          : { stockItem: item.stockItem, warehouse: sourceWarehouse, direction: "OUT", quantity: -quantity, unitCost: item.unitCost, source },
      );
    } else {
      throwError(`Unknown documentType "${documentType}".`, 400);
    }
  }

  return plan;
}

class WarehouseDocumentService extends AdvancedService {
  constructor() {
    super(WarehouseDocumentModel, {
      brandScoped: true,
      // WarehouseDocument is a transactional document with its own status lifecycle
      // (draft/approved/posted/canceled) — soft-delete does not apply (PLATFORM_FINAL_AUDIT.md
      // PA-22's rationale).
      enableSoftDelete: false,
      defaultPopulate: ["brand", "branch", "sourceWarehouse", "destinationWarehouse", "journalEntry", "createdBy", "approvedBy"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  /**
   * Posts a draft/approved WarehouseDocument: for every movement in its plan, resolves the
   * affected StockItem's costing method, enforces the brand's negative-stock policy, computes the
   * movement's cost (given for inbound; consumed from FIFO/LIFO layers or read from the current
   * weighted average for outbound), and writes one StockLedger row + one Inventory balance update
   * per movement — all inside a single transaction. Either the whole document posts (every
   * movement recorded, every balance updated, status -> posted) or none of it does.
   *
   * ADR-001 Phase 2 (Refund) retrofit: accepts an optional externally-owned `session` — when a
   * caller (e.g. PreparationReturn's own finalize() transaction) already holds one, this method
   * must reuse it and never start/commit/abort/end its own, exactly the `ownsSession` guard
   * `journalEntryService.createBalancedEntry()` already established in ADR-001 Phase 1. Every
   * other existing caller (PurchaseReturn, InventoryCount, WasteRecord's other categories) keeps
   * calling this with no `session` argument and gets byte-identical behavior to before this change.
   */
  async postDocument({ id, brand, branch, postedBy, session: externalSession }) {
    // Threaded via .session() even before the transaction-lifecycle `session` variable below is
    // resolved — without this, a document created earlier in the SAME externally-owned transaction
    // (e.g. by PreparationReturn's finalize()) is invisible to this read (MongoDB transaction
    // isolation: an out-of-session read cannot see the transaction's own uncommitted writes),
    // producing a false "document not found" for a document that, from the caller's perspective,
    // already exists. Found and fixed while building ADR-001 Phase 2's PreparationReturn.finalize().
    const document = await this.model.findOne({ _id: id, brand }).session(externalSession || null);
    if (!document) {
      throwError("Warehouse document not found.", 404);
    }
    if (!["draft", "approved"].includes(document.status)) {
      throwError(
        `Only draft or approved documents can be posted (current status: ${document.status}).`,
        409,
      );
    }
    if (!document.items || document.items.length === 0) {
      throwError("Warehouse document has no items to post.", 400);
    }

    const settings = await inventorySettingsService.resolveForPosting(brand, branch);
    const movementPlan = buildMovementPlan(document);

    const ownsSession = !externalSession;
    const session = externalSession || (await this.startSession());
    try {
      if (ownsSession) session.startTransaction();

      const ledgerRows = [];
      // V5.2 Replenishment Engine trigger candidates — collected during the loop, emitted only
      // after the transaction commits (never notify about a movement that ends up rolled back).
      const reorderTriggers = [];

      for (const movement of movementPlan) {
        const stockItem = await stockItemService.findByIdSession(movement.stockItem, session);
        if (!stockItem) {
          throwError(`Stock item ${movement.stockItem} not found.`, 404);
        }

        let unitCost;
        let inbound = { quantity: 0, unitCost: 0, totalCost: 0 };
        let outbound = { quantity: 0, unitCost: 0, totalCost: 0 };
        let remainingQuantity = 0;
        let balance;
        let priceVariance = null;

        if (movement.direction === "IN") {
          unitCost = movement.unitCost; // always the actual receipt price, regardless of costMethod
          const totalCost = movement.quantity * unitCost;
          inbound = { quantity: movement.quantity, unitCost, totalCost };
          remainingQuantity = movement.quantity; // opens a new FIFO/LIFO layer

          const hookResult = await inventoryCostEngine.afterInbound({ stockItem, unitCost, session });
          priceVariance = hookResult.priceVariance;

          // For StandardCost items the *balance* is valued at standard, not the actual receipt
          // price — the delta is `priceVariance`, captured on the ledger row above, never on the
          // balance itself (see InventoryCostEngine.resolveInboundValuationCost).
          const valuationUnitCost = inventoryCostEngine.resolveInboundValuationCost({ stockItem, unitCost });
          const valuationTotalCost = movement.quantity * valuationUnitCost;

          balance = await inventoryService.applyInbound({
            brand,
            branch,
            warehouse: movement.warehouse,
            stockItem: movement.stockItem,
            quantity: movement.quantity,
            totalCost: valuationTotalCost,
            session,
          });
        } else {
          // Cost determination is independent of the negative-stock guard below, which
          // applyOutbound enforces atomically as part of its own write — not as a separate
          // read-then-check here.
          const currentBalance = await inventoryService.findBalance(movement.warehouse, movement.stockItem, session);
          const fallbackCost = currentBalance?.avgUnitCost ?? 0;

          unitCost = await inventoryCostEngine.resolveOutboundCost({
            warehouse: movement.warehouse,
            stockItem,
            quantity: movement.quantity,
            currentBalance,
            fallbackCost,
            session,
          });

          const totalCost = movement.quantity * unitCost;
          outbound = { quantity: movement.quantity, unitCost, totalCost };

          balance = await inventoryService.applyOutbound({
            warehouse: movement.warehouse,
            stockItem: movement.stockItem,
            quantity: movement.quantity,
            totalCost,
            allowNegative: settings.allowNegativeStock,
            session,
          });

          if (stockItem.minThreshold > 0 && balance.quantity <= stockItem.minThreshold) {
            reorderTriggers.push({ stockItem, warehouse: movement.warehouse, balance });
          }
        }

        const row = await stockLedgerService.insertMovement(
          {
            brand,
            branch,
            warehouse: movement.warehouse,
            stockItem: movement.stockItem,
            movementDate: document.postingDate || new Date(),
            documentId: document._id,
            unitType: "storage",
            costMethod: stockItem.costMethod,
            source: movement.source,
            description: new Map([["en", `${movement.source} - ${document.documentNumber}`]]),
            inbound,
            outbound,
            balanceSnapshot: {
              quantity: balance.quantity,
              unitCost: balance.avgUnitCost,
              totalCost: balance.totalCost,
            },
            remainingQuantity,
            priceVariance,
            senderType: "System",
            sender: postedBy,
            receiverType: "System",
            receiver: postedBy,
            createdBy: postedBy,
          },
          session,
        );

        ledgerRows.push(row);
      }

      const now = new Date();
      document.status = "posted";
      if (!document.approvedBy) {
        document.approvedBy = postedBy;
        document.approvedAt = now;
      }
      await document.save({ session });

      // When this session is externally owned, the caller controls commit — emitting a
      // "below reorder point" event now would be premature (the caller's transaction, holding
      // other writes of its own, could still abort after this method returns), so both the commit
      // and the event emission are deferred to the caller in that case. `reorderTriggers` is
      // returned either way so an external-session caller can emit them itself after its own
      // commit succeeds.
      if (ownsSession) {
        await session.commitTransaction();

        // Outside the transaction on purpose — this is a side effect of a movement that already,
        // irreversibly, happened; the Replenishment Engine subscriber catches its own errors
        // (domainEvents.js's documented convention for best-effort handlers), so a failure here
        // never undoes or blocks the posting that already committed.
        for (const trigger of reorderTriggers) {
          await domainEvents.emit(DomainEvent.INVENTORY_BELOW_REORDER_POINT, {
            brand,
            branch,
            stockItem: trigger.stockItem,
            warehouse: trigger.warehouse,
            balance: trigger.balance,
            postedBy,
          });
        }
      }

      return { document, ledgerRows, reorderTriggers };
    } catch (err) {
      if (ownsSession) await session.abortTransaction();
      throw err;
    } finally {
      if (ownsSession) session.endSession();
    }
  }

}

export default new WarehouseDocumentService();
