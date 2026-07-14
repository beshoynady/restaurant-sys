import PurchaseOrderModel from "./purchase-order.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import sequenceGenerator from "../../../utils/SequenceGeneratorService.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";
import purchaseSettingsService from "../purchasing-settings/purchase-settings.service.js";
import domainEvents, { DomainEvent } from "../../../utils/domainEvents.js";

// SUPPLY_CHAIN_COMMERCE_DOMAIN_REDESIGN.md §5.3 — once receiving has started
// (PartiallyReceived/FullyReceived), the PO can no longer be cancelled/rejected; it must be
// closed instead. Closed/Rejected/Cancelled are all terminal.
const transitionGuard = createTransitionGuard({
  Draft: ["Submitted", "Cancelled"],
  Submitted: ["Approved", "Rejected", "Cancelled"],
  Approved: ["PartiallyReceived", "FullyReceived", "Cancelled"],
  PartiallyReceived: ["FullyReceived", "Closed"],
  FullyReceived: ["Closed"],
  Closed: [],
  Rejected: [],
  Cancelled: [],
});

class PurchaseOrderService extends AdvancedService {
  constructor() {
    super(PurchaseOrderModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: false, // transactional document — status lifecycle instead, same convention as PurchaseInvoice
      defaultPopulate: ["brand", "branch", "supplier", "warehouse", "sourcePurchaseRequest", "approvedBy", "createdBy", "updatedBy"],
      defaultSort: { createdAt: -1 },
    });
  }

  async beforeCreate(data) {
    // Resolve which settings document actually applies (branch-specific wins, else brand-wide),
    // same "WHERE" resolution already proven elsewhere (AuthenticationSettings, InventorySettings)
    // — then generate against that exact document, not a guessed filter.
    const policy = await purchaseSettingsService.resolveProcurementPolicy(data.brand, data.branch);
    if (!policy.raw) {
      throwError("No PurchasingSettings configured for this brand/branch — cannot generate a purchase order number.", 422);
    }

    const poNumber = await sequenceGenerator.getNext({
      Model: purchaseSettingsService.model,
      filter: { _id: policy.raw._id },
      sequenceField: "purchaseOrderSequence",
    });

    // Server-computed, never trusted from the client — same philosophy already applied to Order
    // numbering and this platform's other posting engines.
    const items = (data.items || []).map((item) => ({ ...item, lineTotal: item.quantity * item.unitPrice }));
    const { subtotal, totalTax, totalAmount } = this._computeTotals(items);

    return { ...data, items, poNumber, subtotal, totalTax, totalAmount, status: "Draft" };
  }

  _computeTotals(items) {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    // Tax is not computed here (no TaxConfig resolution logic exists at line-item granularity in
    // this codebase's Purchasing domain yet — see PurchaseInvoice's own equally-manual taxAmount
    // field) — a line's `taxes` ref is informational until that engine is built; not fabricated.
    const totalTax = 0;
    const totalAmount = subtotal + totalTax;
    return { subtotal, totalTax, totalAmount };
  }

  async transition({ id, brand, branch, toStatus, actorId }) {
    const po = await this.model.findOne({ _id: id, brand, branch });
    if (!po) throwError("Purchase order not found.", 404);

    transitionGuard.assertValid(po.status, toStatus);

    po.status = toStatus;
    if (toStatus === "Approved") {
      po.approvedBy = actorId;
      po.approvedAt = new Date();
    }
    await po.save();

    if (toStatus === "Approved") {
      await domainEvents.emit(DomainEvent.PURCHASE_ORDER_APPROVED, { purchaseOrder: po });
    }

    return po;
  }

  /**
   * Called by goods-receipt.service.js on GRN confirmation — atomically rolls up received
   * quantities onto this PO's line items and derives the PO's own status
   * (PartiallyReceived/FullyReceived) from them. The PO never independently tracks "what was
   * received" as a separate fact; it's always a rollup FROM the GRNs posted against it
   * (SUPPLY_CHAIN_SSOT_MATRIX.md).
   */
  async applyReceivedQuantities({ id, brand, receivedLines, session }) {
    for (const line of receivedLines) {
      await this.model.updateOne(
        { _id: id, brand, "items.stockItem": line.stockItem },
        { $inc: { "items.$.receivedQuantity": line.quantity } },
        { session },
      );
    }

    const po = await this.model.findOne({ _id: id, brand }).session(session ?? null);
    if (!po) return null;

    const fullyReceived = po.items.every((item) => item.receivedQuantity >= item.quantity);
    const partiallyReceived = po.items.some((item) => item.receivedQuantity > 0);
    const nextStatus = fullyReceived ? "FullyReceived" : partiallyReceived ? "PartiallyReceived" : po.status;

    if (nextStatus !== po.status && transitionGuard.canTransition(po.status, nextStatus)) {
      po.status = nextStatus;
      await po.save({ session });
    }

    return po;
  }
}

export default new PurchaseOrderService();
export { transitionGuard as purchaseOrderTransitionGuard };
