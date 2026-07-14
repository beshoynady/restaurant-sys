import PurchaseRequestModel from "./purchase-request.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import sequenceGenerator from "../../../utils/SequenceGeneratorService.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";
import purchaseSettingsService from "../purchasing-settings/purchase-settings.service.js";

const transitionGuard = createTransitionGuard({
  Draft: ["Submitted", "Cancelled"],
  Submitted: ["Approved", "Rejected", "Cancelled"],
  Approved: ["Converted", "Cancelled"],
  Rejected: [],
  Cancelled: [],
  Converted: [],
});

class PurchaseRequestService extends AdvancedService {
  constructor() {
    super(PurchaseRequestModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: false, // transactional document, status lifecycle instead
      defaultPopulate: ["brand", "branch", "requestedBy", "purchaseOrder", "approvedBy", "rejectedBy", "createdBy", "updatedBy"],
      defaultSort: { createdAt: -1 },
    });
  }

  async beforeCreate(data) {
    const policy = await purchaseSettingsService.resolveProcurementPolicy(data.brand, data.branch);
    if (!policy.raw) {
      throwError("No PurchasingSettings configured for this brand/branch — cannot generate a purchase request number.", 422);
    }

    const prNumber = await sequenceGenerator.getNext({
      Model: purchaseSettingsService.model,
      filter: { _id: policy.raw._id },
      sequenceField: "purchaseRequestSequence",
    });

    return { ...data, prNumber, status: "Draft" };
  }

  async transition({ id, brand, branch, toStatus, actorId, rejectionReason = null }) {
    const pr = await this.model.findOne({ _id: id, brand, branch });
    if (!pr) throwError("Purchase request not found.", 404);

    transitionGuard.assertValid(pr.status, toStatus);

    pr.status = toStatus;
    if (toStatus === "Approved") {
      pr.approvedBy = actorId;
      pr.approvedAt = new Date();
    }
    if (toStatus === "Rejected") {
      pr.rejectedBy = actorId;
      pr.rejectedAt = new Date();
      pr.rejectionReason = rejectionReason;
    }
    await pr.save();
    return pr;
  }

  /** Called once a PurchaseOrder is actually raised from this (Approved) request. */
  async markConverted({ id, brand, purchaseOrderId }) {
    const pr = await this.model.findOne({ _id: id, brand });
    if (!pr) throwError("Purchase request not found.", 404);

    transitionGuard.assertValid(pr.status, "Converted");
    pr.status = "Converted";
    pr.purchaseOrder = purchaseOrderId;
    await pr.save();
    return pr;
  }
}

export default new PurchaseRequestService();
export { transitionGuard as purchaseRequestTransitionGuard };
