import StockTransferRequestModel from "./stock-transfer-request.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import sequenceGenerator from "../../../utils/SequenceGeneratorService.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";
import inventorySettingsService from "../inventory-settings/inventory-settings.service.js";
import InventoryModel from "../inventory/inventory.model.js";
import warehouseDocumentService from "../warehouse-document/warehouse-document.service.js";

// Nothing physical has moved before Executed — Approved can still be Canceled. Once Executed,
// stock has actually left one warehouse and entered another; no undo, same convention as every
// other posted transactional document in this platform.
const transitionGuard = createTransitionGuard({
  Draft: ["Submitted", "Canceled"],
  Submitted: ["Approved", "Rejected", "Canceled"],
  Approved: ["Executed", "Canceled"],
  Executed: [],
  Rejected: [],
  Canceled: [],
});

class StockTransferRequestService extends AdvancedService {
  constructor() {
    super(StockTransferRequestModel, {
      brandScoped: true,
      // Was `softDelete: true` — same unrecognized/ignored BaseRepository option already found
      // and corrected on InventoryCount; this is a transactional document with its own status
      // lifecycle, not soft-deletable data.
      enableSoftDelete: false,
      defaultPopulate: ["brand", "branch", "fromWarehouse", "toWarehouse", "requestedBy", "approvedBy", "rejectedBy", "executedBy", "outDocument", "inDocument"],
      defaultSort: { createdAt: -1 },
    });
  }

  async beforeCreate(data) {
    const settings = await inventorySettingsService.resolveForPosting(data.brand, data.branch);
    if (!settings._id) {
      throwError("No InventorySettings configured for this brand/branch — cannot generate a transfer request number.", 422);
    }

    const requestNumber = await sequenceGenerator.getNext({
      Model: inventorySettingsService.model,
      filter: { _id: settings._id },
      sequenceField: "transferSequence",
    });

    return { ...data, requestNumber, status: "Draft" };
  }

  // V6.0 Production Hardening: every method below claims its transition atomically
  // (`findOneAndUpdate` filtered on the status read a moment earlier) instead of the previous
  // read-then-save pattern, closing the TOCTOU race two concurrent calls against the same request
  // would otherwise hit — same fix, same reasoning, as GoodsReceiptNote.confirm() and
  // PurchaseReturnInvoice.approve().
  async _claim(id, brand, branch, fromStatus, update) {
    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: fromStatus },
      { $set: update },
      { new: true },
    );
    if (!claimed) {
      throwError("This stock transfer request was already transitioned by a concurrent request.", 409);
    }
    return claimed;
  }

  async submit({ id, brand, branch }) {
    const request = await this.model.findOne({ _id: id, brand, branch });
    if (!request) throwError("Stock transfer request not found.", 404);
    transitionGuard.assertValid(request.status, "Submitted");
    return this._claim(id, brand, branch, request.status, { status: "Submitted", submittedAt: new Date() });
  }

  async approve({ id, brand, branch, actorId, approvedQuantities = null }) {
    const request = await this.model.findOne({ _id: id, brand, branch });
    if (!request) throwError("Stock transfer request not found.", 404);
    transitionGuard.assertValid(request.status, "Approved");

    const items = request.items.map((item) => {
      const override = approvedQuantities?.[String(item.stockItem)];
      return { ...item.toObject(), approvedQuantity: override ?? item.approvedQuantity ?? item.requestedQuantity };
    });

    return this._claim(id, brand, branch, request.status, {
      items, status: "Approved", approvedBy: actorId, approvedAt: new Date(),
    });
  }

  async reject({ id, brand, branch, actorId, rejectionReason }) {
    const request = await this.model.findOne({ _id: id, brand, branch });
    if (!request) throwError("Stock transfer request not found.", 404);
    transitionGuard.assertValid(request.status, "Rejected");
    return this._claim(id, brand, branch, request.status, {
      status: "Rejected", rejectedBy: actorId, rejectedAt: new Date(), rejectionReason: rejectionReason || null,
    });
  }

  async transition({ id, brand, branch, toStatus, actorId, rejectionReason = null }) {
    if (toStatus === "Submitted") return this.submit({ id, brand, branch });
    if (toStatus === "Approved") return this.approve({ id, brand, branch, actorId });
    if (toStatus === "Rejected") return this.reject({ id, brand, branch, actorId, rejectionReason });
    if (toStatus === "Executed") return this.execute({ id, brand, branch, actorId });

    const request = await this.model.findOne({ _id: id, brand, branch });
    if (!request) throwError("Stock transfer request not found.", 404);
    transitionGuard.assertValid(request.status, toStatus);
    return this._claim(id, brand, branch, request.status, { status: toStatus });
  }

  /**
   * The one place a transfer actually moves stock — reuses the Inventory Posting Engine's
   * existing TRANSFER support (`buildMovementPlan` already produces both an OUT-from-source and
   * an IN-to-destination movement from a single WarehouseDocument, "cost follows the goods").
   * `outDocument`/`inDocument` both point at this same document — the schema anticipated two
   * separate documents, but the engine's TRANSFER type already atomically records both sides of
   * one physical movement as one document; splitting it into two would just be two half-committed
   * halves of a single event.
   */
  async execute({ id, brand, branch, actorId }) {
    const request = await this.model.findOne({ _id: id, brand, branch });
    if (!request) throwError("Stock transfer request not found.", 404);
    transitionGuard.assertValid(request.status, "Executed");

    // Atomic claim BEFORE any side effect — a losing concurrent execute() call must never reach
    // the WarehouseDocument creation below (that would be a double stock transfer, moving the
    // same quantity out of `fromWarehouse` twice).
    await this._claim(id, brand, branch, request.status, { status: "Executed", executedBy: actorId, executedAt: new Date() });

    const balances = await InventoryModel.find({ brand, warehouse: request.fromWarehouse, stockItem: { $in: request.items.map((i) => i.stockItem) } })
      .select("stockItem avgUnitCost")
      .lean();
    const costByItem = Object.fromEntries(balances.map((b) => [String(b.stockItem), b.avgUnitCost || 0]));

    const warehouseDocument = await warehouseDocumentService.create({
      brandId: brand,
      branchId: branch,
      createdBy: actorId,
      data: {
        branch,
        documentType: "TRANSFER",
        postingDate: new Date(),
        transactionType: "Transfer",
        documentNumber: `WD-${request.requestNumber}`,
        sourceWarehouse: request.fromWarehouse,
        destinationWarehouse: request.toWarehouse,
        items: request.items.map((item) => {
          const quantity = item.approvedQuantity ?? item.requestedQuantity;
          const unitCost = costByItem[String(item.stockItem)] || 0;
          return { stockItem: item.stockItem, quantity, unitCost, totalCost: quantity * unitCost };
        }),
        status: "approved",
      },
    });
    await warehouseDocumentService.postDocument({ id: warehouseDocument._id, brand, branch, postedBy: actorId });

    // status/executedBy/executedAt were already atomically claimed above; this persists
    // outDocument/inDocument on the winning caller's own write, not a second competing one.
    request.outDocument = warehouseDocument._id;
    request.inDocument = warehouseDocument._id;
    request.status = "Executed";
    request.executedBy = actorId;
    request.executedAt = new Date();
    await request.save();

    return request;
  }
}

export default new StockTransferRequestService();
export { transitionGuard as stockTransferRequestTransitionGuard };
