import FryerOilLogModel from "./fryer-oil-log.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import sequenceGenerator from "../../../utils/SequenceGeneratorService.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";
import inventorySettingsService from "../../inventory/inventory-settings/inventory-settings.service.js";
import warehouseDocumentService from "../../inventory/warehouse-document/warehouse-document.service.js";

const transitionGuard = createTransitionGuard({
  Draft: ["InUse", "Cancelled"],
  InUse: ["Discarded"],
  Discarded: [],
  Cancelled: [],
});

class FryerOilLogService extends AdvancedService {
  constructor() {
    super(FryerOilLogModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: false,
      defaultPopulate: [
        "brand", "branch", "warehouse", "station", "oilStockItem", "installedBy",
        "discardedBy", "wasteRecord", "warehouseDocument", "createdBy", "updatedBy",
      ],
      defaultSort: { createdAt: -1 },
    });
  }

  async beforeCreate(data) {
    const settings = await inventorySettingsService.resolveForPosting(data.brand, data.branch);
    if (!settings._id) {
      throwError("No InventorySettings configured for this brand/branch — cannot generate a fryer oil log number.", 422);
    }

    const logNumber = await sequenceGenerator.getNext({
      Model: inventorySettingsService.model,
      filter: { _id: settings._id },
      sequenceField: "fryerOilLogSequence",
    });

    return { ...data, logNumber, status: "Draft" };
  }

  /**
   * Oil Consumption — installing fresh oil into a fryer is a manual operational consumption,
   * reusing the exact same Inventory Posting Engine call ManualConsumption uses (WarehouseDocument
   * OUT, Cost Engine resolves the real unit cost — never client-supplied).
   */
  async install({ id, brand, branch, actorId, quantityInstalled }) {
    const log = await this.model.findOne({ _id: id, brand, branch });
    if (!log) throwError("Fryer oil log not found.", 404);
    transitionGuard.assertValid(log.status, "InUse");
    if (!quantityInstalled || quantityInstalled <= 0) {
      throwError("quantityInstalled must be greater than zero.", 400);
    }

    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: "Draft" },
      { $set: { status: "InUse", installedAt: new Date(), installedBy: actorId, quantityInstalled } },
    );
    if (!claimed) {
      throwError("This fryer oil log was already installed or cancelled by a concurrent request.", 409);
    }

    const warehouseDocument = await warehouseDocumentService.create({
      brandId: brand,
      branchId: branch,
      createdBy: actorId,
      data: {
        branch,
        documentType: "OUT",
        postingDate: new Date(),
        transactionType: "ManualConsumption",
        documentNumber: `WD-${log.logNumber}`,
        sourceWarehouse: log.warehouse,
        items: [{ stockItem: log.oilStockItem, quantity: quantityInstalled, unitCost: 0, totalCost: 0 }],
        status: "approved",
      },
    });

    const { ledgerRows } = await warehouseDocumentService.postDocument({
      id: warehouseDocument._id, brand, branch, postedBy: actorId,
    });

    log.status = "InUse";
    log.installedAt = new Date();
    log.installedBy = actorId;
    log.quantityInstalled = quantityInstalled;
    log.unitCost = ledgerRows[0]?.outbound?.unitCost || 0;
    log.totalCost = ledgerRows[0]?.outbound?.totalCost || 0;
    log.warehouseDocument = warehouseDocument._id;
    await log.save();
    return log;
  }

  /** Quality Check — appends a rating, does not change status (a fryer stays InUse until discarded). */
  async logQualityCheck({ id, brand, branch, actorId, qualityRating, notes = null, incrementCycle = true }) {
    const log = await this.model.findOne({ _id: id, brand, branch });
    if (!log) throwError("Fryer oil log not found.", 404);
    if (log.status !== "InUse") throwError("Quality checks can only be logged for an in-use oil log.", 409);

    log.qualityChecks.push({ checkedAt: new Date(), checkedBy: actorId, qualityRating, notes });
    if (incrementCycle) log.usageCycles += 1;
    await log.save();
    return log;
  }

  async discard({ id, brand, branch, actorId, discardReason, wasteRecordId = null }) {
    const log = await this.model.findOne({ _id: id, brand, branch });
    if (!log) throwError("Fryer oil log not found.", 404);
    transitionGuard.assertValid(log.status, "Discarded");

    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: "InUse" },
      { $set: { status: "Discarded", discardedAt: new Date(), discardedBy: actorId, discardReason, wasteRecord: wasteRecordId } },
      { new: true },
    );
    if (!claimed) {
      throwError("This fryer oil log was already discarded by a concurrent request.", 409);
    }
    return claimed;
  }

  async transition({ id, brand, branch, toStatus, actorId }) {
    if (toStatus === "InUse") throwError("Use the dedicated install() action (requires quantityInstalled) to bring an oil log into use.", 400);
    if (toStatus === "Discarded") throwError("Use the dedicated discard() action (requires discardReason) to retire an oil log.", 400);

    const log = await this.model.findOne({ _id: id, brand, branch });
    if (!log) throwError("Fryer oil log not found.", 404);
    transitionGuard.assertValid(log.status, toStatus);

    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: log.status },
      { $set: { status: toStatus } },
      { new: true },
    );
    if (!claimed) {
      throwError("This fryer oil log was already transitioned by a concurrent request.", 409);
    }
    return claimed;
  }
}

export default new FryerOilLogService();
export { transitionGuard as fryerOilLogTransitionGuard };
