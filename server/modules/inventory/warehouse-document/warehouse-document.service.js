import WarehouseDocumentModel from "./warehouse-document.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import inventoryService from "../inventory/inventory.service.js";
import stockLedgerService from "../stock-ledger/stock-ledger.service.js";
import stockItemService from "../stock-item/stock-item.service.js";
import inventorySettingsService from "../inventory-settings/inventory-settings.service.js";

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
   */
  async postDocument({ id, brand, branch, postedBy }) {
    const document = await this.model.findOne({ _id: id, brand });
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

    const session = await this.startSession();
    try {
      session.startTransaction();

      const ledgerRows = [];

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

        if (movement.direction === "IN") {
          unitCost = movement.unitCost;
          const totalCost = movement.quantity * unitCost;
          inbound = { quantity: movement.quantity, unitCost, totalCost };
          remainingQuantity = movement.quantity; // opens a new FIFO/LIFO layer

          balance = await inventoryService.applyInbound({
            brand,
            branch,
            warehouse: movement.warehouse,
            stockItem: movement.stockItem,
            quantity: movement.quantity,
            totalCost,
            session,
          });
        } else {
          // Cost determination (WeightedAverage reads the current average; FIFO/LIFO consumes
          // layers) is independent of the negative-stock guard below, which applyOutbound enforces
          // atomically as part of its own write — not as a separate read-then-check here.
          const currentBalance = await inventoryService.findBalance(movement.warehouse, movement.stockItem, session);
          const fallbackCost = currentBalance?.avgUnitCost ?? 0;

          if (stockItem.costMethod === "WeightedAverage") {
            unitCost = fallbackCost;
          } else {
            unitCost = await this.consumeLayers({
              warehouse: movement.warehouse,
              stockItem: movement.stockItem,
              quantity: movement.quantity,
              costMethod: stockItem.costMethod,
              fallbackCost,
              session,
            });
          }

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

      await session.commitTransaction();

      return { document, ledgerRows };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * FIFO/LIFO cost consumption: walks the open layers (oldest-first for FIFO, newest-first for
   * LIFO — see stockLedgerService.findOpenLayers) decrementing each until the requested quantity
   * is satisfied, and returns the resulting blended unit cost. If the layers run out before the
   * requested quantity is satisfied (only reachable when InventorySettings.allowNegativeStock
   * permitted the movement despite insufficient recorded stock), the shortfall is costed at
   * `fallbackCost` (the current weighted-average cost) — there is no real layer to attribute it
   * to.
   */
  async consumeLayers({ warehouse, stockItem, quantity, costMethod, fallbackCost, session }) {
    const layers = await stockLedgerService.findOpenLayers(warehouse, stockItem, costMethod, session);

    let remaining = quantity;
    let totalCost = 0;

    for (const layer of layers) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, layer.remainingQuantity);
      totalCost += take * layer.inbound.unitCost;
      await stockLedgerService.consumeLayer(layer._id, take, session);
      remaining -= take;
    }

    if (remaining > 0) {
      totalCost += remaining * fallbackCost;
    }

    return quantity > 0 ? totalCost / quantity : fallbackCost;
  }
}

export default new WarehouseDocumentService();
