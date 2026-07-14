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

  async submit({ id, brand, branch }) {
    const request = await this.model.findOne({ _id: id, brand, branch });
    if (!request) throwError("Stock transfer request not found.", 404);
    transitionGuard.assertValid(request.status, "Submitted");
    request.status = "Submitted";
    request.submittedAt = new Date();
    await request.save();
    return request;
  }

  async approve({ id, brand, branch, actorId, approvedQuantities = null }) {
    const request = await this.model.findOne({ _id: id, brand, branch });
    if (!request) throwError("Stock transfer request not found.", 404);
    transitionGuard.assertValid(request.status, "Approved");

    for (const item of request.items) {
      const override = approvedQuantities?.[String(item.stockItem)];
      item.approvedQuantity = override ?? item.approvedQuantity ?? item.requestedQuantity;
    }

    request.status = "Approved";
    request.approvedBy = actorId;
    request.approvedAt = new Date();
    await request.save();
    return request;
  }

  async reject({ id, brand, branch, actorId, rejectionReason }) {
    const request = await this.model.findOne({ _id: id, brand, branch });
    if (!request) throwError("Stock transfer request not found.", 404);
    transitionGuard.assertValid(request.status, "Rejected");
    request.status = "Rejected";
    request.rejectedBy = actorId;
    request.rejectedAt = new Date();
    request.rejectionReason = rejectionReason || null;
    await request.save();
    return request;
  }

  async transition({ id, brand, branch, toStatus, actorId, rejectionReason = null }) {
    if (toStatus === "Submitted") return this.submit({ id, brand, branch });
    if (toStatus === "Approved") return this.approve({ id, brand, branch, actorId });
    if (toStatus === "Rejected") return this.reject({ id, brand, branch, actorId, rejectionReason });
    if (toStatus === "Executed") return this.execute({ id, brand, branch, actorId });

    const request = await this.model.findOne({ _id: id, brand, branch });
    if (!request) throwError("Stock transfer request not found.", 404);
    transitionGuard.assertValid(request.status, toStatus);
    request.status = toStatus;
    await request.save();
    return request;
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
