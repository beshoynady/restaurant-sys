import PurchaseInvoiceModel from "../purchase-invoice/purchase-invoice.model.js";
import PurchaseOrderModel from "../purchase-order/purchase-order.model.js";
import GoodsReceiptNoteModel from "../goods-receipt-note/goods-receipt-note.model.js";
import throwError from "../../../utils/throwError.js";

/**
 * Three-Way Matching Engine — Supply Chain & Commerce Platform V5.1
 * (SUPPLY_CHAIN_COMMERCE_ARCHITECTURE_V2.md §1, SUPPLY_CHAIN_COMMERCE_DOMAIN_REDESIGN.md §5.2's
 * `threeWayMatchStatus` field).
 *
 * Compares PurchaseOrder (what was ordered) vs GoodsReceiptNote (what was physically received,
 * GOOD-condition lines only) vs PurchaseInvoice (what the supplier is billing) per stock item.
 * Read-only / computational — never writes a new "match result" document (that would be a second
 * place the same fact could drift, exactly what SUPPLY_CHAIN_SSOT_MATRIX.md's derivation rule
 * exists to prevent); the report is computed fresh every time from the three source documents and
 * only its terminal `status` is cached onto the invoice (`purchaseInvoice.threeWayMatchStatus`),
 * the same "derived, not independently authoritative" treatment already applied to
 * `Inventory.avgUnitCost` and `PurchaseOrder.items[].receivedQuantity`.
 *
 * Runs at Levels STANDARD/ENTERPRISE only — a BASIC-level invoice has no PurchaseOrder to compare
 * against at all (auto-generated, no explicit ordering step), so matching is a no-op there.
 *
 * Two entry points, one shared computation: `match()` reads an already-saved PurchaseInvoice (for
 * previewing/re-checking an existing document); `matchAgainstPayload()` runs the identical
 * computation against a not-yet-saved create() payload, so purchase-invoice.service.js can enforce
 * `blockOnMatchVariance` BEFORE the invoice is even created, not after.
 */
class ThreeWayMatchService {
  async match({ purchaseInvoiceId, brand, toleranceRate = 0 }) {
    const invoice = await PurchaseInvoiceModel.findOne({ _id: purchaseInvoiceId, brand }).lean();
    if (!invoice) throwError("Purchase invoice not found.", 404);

    return this.matchAgainstPayload({
      brand,
      purchaseOrderId: invoice.purchaseOrder,
      goodsReceiptNoteIds: invoice.goodsReceiptNotes,
      items: invoice.items,
      toleranceRate,
      purchaseInvoiceId: invoice._id,
    });
  }

  async matchAgainstPayload({ brand, purchaseOrderId, goodsReceiptNoteIds = [], items = [], toleranceRate = 0, purchaseInvoiceId = null }) {
    if (!purchaseOrderId) {
      return { purchaseInvoice: purchaseInvoiceId, purchaseOrder: null, status: "NOT_APPLICABLE", lines: [], matchedAt: new Date() };
    }

    const po = await PurchaseOrderModel.findOne({ _id: purchaseOrderId, brand }).lean();
    if (!po) throwError("Referenced purchase order not found.", 404);

    const grns = goodsReceiptNoteIds?.length
      ? await GoodsReceiptNoteModel.find({ _id: { $in: goodsReceiptNoteIds }, brand }).lean()
      : [];

    const orderedByItem = {};
    for (const line of po.items) {
      orderedByItem[String(line.stockItem)] = { quantity: line.quantity, unitPrice: line.unitPrice };
    }

    const receivedByItem = {};
    for (const grn of grns) {
      for (const line of grn.items) {
        if (line.condition !== "GOOD") continue; // damaged/expired lines never entered usable stock
        const key = String(line.stockItem);
        receivedByItem[key] = (receivedByItem[key] || 0) + line.receivedQuantity;
      }
    }

    const invoicedByItem = {};
    for (const line of items) {
      const key = String(line.itemId);
      const existing = invoicedByItem[key];
      invoicedByItem[key] = {
        quantity: (existing?.quantity || 0) + line.quantity,
        unitPrice: line.pricePerUnit, // last line's price wins if an item appears twice — same limitation as most invoice line aggregations
      };
    }

    const allItemKeys = new Set([...Object.keys(orderedByItem), ...Object.keys(receivedByItem), ...Object.keys(invoicedByItem)]);
    const lines = [];
    let anyVariance = false;
    let anyUnderInvoiced = false; // ordered/received more than has been invoiced so far — a legitimate PARTIAL state, not an exception

    for (const key of allItemKeys) {
      const ordered = orderedByItem[key] || null;
      const received = grns.length ? (receivedByItem[key] ?? 0) : null;
      const invoiced = invoicedByItem[key] || null;
      const exceptions = [];

      if (ordered && invoiced && invoiced.quantity > ordered.quantity) {
        exceptions.push({ type: "OVER_BILLING", detail: `Invoiced quantity ${invoiced.quantity} exceeds ordered quantity ${ordered.quantity}.` });
      }
      if (received !== null && invoiced && invoiced.quantity > received) {
        exceptions.push({ type: "OVER_BILLING_VS_RECEIPT", detail: `Invoiced quantity ${invoiced.quantity} exceeds received quantity ${received}.` });
      }
      if (ordered && received !== null && received > ordered.quantity) {
        exceptions.push({ type: "OVER_RECEIPT", detail: `Received quantity ${received} exceeds ordered quantity ${ordered.quantity}.` });
      }
      if (received !== null && invoiced && invoiced.quantity < received) {
        exceptions.push({ type: "UNDER_BILLING", detail: `Invoiced quantity ${invoiced.quantity} is less than received quantity ${received}.` });
      }
      if (ordered && invoiced && ordered.unitPrice > 0) {
        const variancePct = (Math.abs(invoiced.unitPrice - ordered.unitPrice) / ordered.unitPrice) * 100;
        if (variancePct > toleranceRate) {
          exceptions.push({
            type: "PRICE_VARIANCE",
            detail: `Invoiced unit price ${invoiced.unitPrice} differs from ordered unit price ${ordered.unitPrice} by ${variancePct.toFixed(2)}% (tolerance ${toleranceRate}%).`,
            variancePct: Number(variancePct.toFixed(4)),
          });
        }
      }
      if (ordered && received !== null && received < ordered.quantity) {
        anyUnderInvoiced = true; // partially received — a legitimate in-progress state
      } else if (ordered && !invoiced) {
        anyUnderInvoiced = true; // not yet invoiced at all — fine, just not complete
      }

      if (exceptions.length > 0) anyVariance = true;

      lines.push({ stockItem: key, ordered, received, invoiced, exceptions, status: exceptions.length === 0 ? "MATCHED" : "VARIANCE" });
    }

    let status;
    if (anyVariance) status = "VARIANCE";
    else if (anyUnderInvoiced) status = "PARTIAL_MATCH";
    else status = "FULL_MATCH";

    return { purchaseInvoice: purchaseInvoiceId, purchaseOrder: po._id, status, lines, matchedAt: new Date() };
  }
}

export default new ThreeWayMatchService();
