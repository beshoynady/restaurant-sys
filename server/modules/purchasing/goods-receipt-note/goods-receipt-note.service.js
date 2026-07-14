import GoodsReceiptNoteModel from "./goods-receipt-note.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import sequenceGenerator from "../../../utils/SequenceGeneratorService.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";
import purchaseSettingsService from "../purchasing-settings/purchase-settings.service.js";
import purchaseOrderService from "../purchase-order/purchase-order.service.js";
import PurchaseOrderModel from "../purchase-order/purchase-order.model.js";
import warehouseDocumentService from "../../inventory/warehouse-document/warehouse-document.service.js";
import domainEvents, { DomainEvent } from "../../../utils/domainEvents.js";

// SUPPLY_CHAIN_COMMERCE_DOMAIN_REDESIGN.md §5.3 — once Confirmed, the stock movement already
// happened; reversing it is a PurchaseReturnInvoice's job, not un-confirming the GRN. Cancelled is
// only reachable from Draft.
const transitionGuard = createTransitionGuard({
  Draft: ["Confirmed", "Cancelled"],
  Confirmed: [],
  Cancelled: [],
});

// V5.2 Workflow Integrity: a GRN referencing a PurchaseOrder may only be confirmed while that PO
// is actually still open to receiving. Before this guard, `applyReceivedQuantities()`'s status
// rollup silently no-op'd against a Cancelled/Rejected/Closed PO (canTransition returned false,
// nothing threw) — the GRN would still confirm and post real inventory. This closes that gap at
// the source instead of papering over the rollup's silence.
const PO_RECEIVABLE_STATUSES = ["Approved", "PartiallyReceived"];

class GoodsReceiptNoteService extends AdvancedService {
  constructor() {
    super(GoodsReceiptNoteModel, {
      brandScoped: true,
      branchScoped: true,
      enableSoftDelete: false, // transactional document, status lifecycle instead
      defaultPopulate: ["brand", "branch", "purchaseOrder", "supplier", "warehouse", "warehouseDocument", "createdBy", "updatedBy"],
      defaultSort: { createdAt: -1 },
    });
  }

  async beforeCreate(data) {
    const policy = await purchaseSettingsService.resolveProcurementPolicy(data.brand, data.branch);
    if (!policy.raw) {
      throwError("No PurchasingSettings configured for this brand/branch — cannot generate a goods receipt number.", 422);
    }

    const grnNumber = await sequenceGenerator.getNext({
      Model: purchaseSettingsService.model,
      filter: { _id: policy.raw._id },
      sequenceField: "goodsReceiptSequence",
    });

    return { ...data, grnNumber, status: "Draft" };
  }

  /**
   * The one place a purchase actually becomes stock. Reuses the existing, proven Inventory
   * Posting Engine (`warehouseDocumentService`) rather than reimplementing FIFO/LIFO/
   * WeightedAverage costing or the atomic negative-stock guard a second time
   * (SUPPLY_CHAIN_COMMERCE_DOMAIN_REDESIGN.md §5.4 — "nothing rebuilt, only reused").
   *
   * Known limitation, stated rather than silently accepted: this is a sequence of individually-
   * atomic steps (create WarehouseDocument -> post it -> update this GRN -> roll up the PO), not
   * one all-encompassing transaction — `warehouseDocumentService.postDocument()` manages its own
   * internal transaction and doesn't accept an external session, and extending its signature to
   * support one is a larger change to stable, proven code than this milestone's scope justifies.
   * If a later step fails, the WarehouseDocument may already be posted while this GRN's own status
   * hasn't caught up yet — recoverable by a human reviewing the GRN's `warehouseDocument` field,
   * not automatically retried. Same class of tradeoff already made explicitly for other sagas in
   * this platform (see INITIAL_PROVISIONING_ARCHITECTURE.md §1), scoped down here since a GRN
   * confirmation is a routine, human-supervised action, not an unattended first-run flow.
   */
  async confirm({ id, brand, branch, confirmedBy }) {
    const grn = await this.model.findOne({ _id: id, brand, branch });
    if (!grn) throwError("Goods receipt note not found.", 404);

    transitionGuard.assertValid(grn.status, "Confirmed");
    if (!grn.items || grn.items.length === 0) {
      throwError("Goods receipt note has no items to confirm.", 400);
    }

    // Only GOOD-condition lines post to inventory — DAMAGED/EXPIRED are recorded for audit but
    // excluded from the stock movement (they never entered sellable/usable stock).
    const postableItems = grn.items.filter((item) => item.condition === "GOOD");
    if (postableItems.length === 0) {
      throwError("No GOOD-condition items to post — every line was DAMAGED or EXPIRED.", 400);
    }

    if (grn.purchaseOrder) {
      const po = await PurchaseOrderModel.findOne({ _id: grn.purchaseOrder, brand }).select("status poNumber");
      if (!po) throwError("The purchase order referenced by this goods receipt note no longer exists.", 404);
      if (!PO_RECEIVABLE_STATUSES.includes(po.status)) {
        throwError(
          `Cannot confirm receipt against purchase order ${po.poNumber}: its status is "${po.status}", not open to receiving.`,
          409,
        );
      }
    }

    // V5.2 Workflow Integrity / Auditability: atomic claim BEFORE any side effect. The previous
    // `findOne` -> mutate -> `.save()` pattern left a real TOCTOU race open — two concurrent
    // confirm() calls for the same GRN could both pass `transitionGuard.assertValid()` above
    // before either saved, each posting its own WarehouseDocument: a genuine double inventory
    // movement, exactly the "impossible business scenario" this platform's Workflow Integrity
    // mandate calls out by name. `findOneAndUpdate` with `status: "Draft"` in the filter can only
    // match once system-wide; a losing concurrent caller's filter simply stops matching, the same
    // technique already proven by `Inventory.applyOutbound()`'s negative-stock guard.
    const claimed = await this.model.findOneAndUpdate(
      { _id: id, brand, branch, status: "Draft" },
      { $set: { status: "Confirmed" } },
    );
    if (!claimed) {
      throwError("This goods receipt note was already confirmed or cancelled by a concurrent request.", 409);
    }

    const warehouseDocument = await warehouseDocumentService.create({
      brandId: brand,
      branchId: branch,
      createdBy: confirmedBy,
      data: {
        branch,
        documentType: "IN",
        postingDate: new Date(),
        transactionType: "Purchase",
        documentNumber: `WD-${grn.grnNumber}`,
        destinationWarehouse: grn.warehouse,
        items: postableItems.map((item) => ({
          stockItem: item.stockItem,
          quantity: item.receivedQuantity,
          unitCost: item.unitCost,
          totalCost: item.receivedQuantity * item.unitCost,
        })),
        status: "approved", // system-generated from an already-confirmed GRN — skips the manual draft/approve UI step
      },
    });

    await warehouseDocumentService.postDocument({ id: warehouseDocument._id, brand, branch, postedBy: confirmedBy });

    grn.status = "Confirmed";
    grn.warehouseDocument = warehouseDocument._id;
    await this.model.updateOne({ _id: id, brand, branch }, { $set: { warehouseDocument: warehouseDocument._id } });

    if (grn.purchaseOrder) {
      await purchaseOrderService.applyReceivedQuantities({
        id: grn.purchaseOrder,
        brand,
        receivedLines: postableItems.map((item) => ({ stockItem: item.stockItem, quantity: item.receivedQuantity })),
      });
    }

    await domainEvents.emit(DomainEvent.GOODS_RECEIPT_CONFIRMED, { goodsReceiptNote: grn });

    return grn;
  }

  async cancel({ id, brand, branch }) {
    const grn = await this.model.findOne({ _id: id, brand, branch });
    if (!grn) throwError("Goods receipt note not found.", 404);

    transitionGuard.assertValid(grn.status, "Cancelled");
    grn.status = "Cancelled";
    await grn.save();
    return grn;
  }
}

export default new GoodsReceiptNoteService();
export { transitionGuard as goodsReceiptNoteTransitionGuard };
