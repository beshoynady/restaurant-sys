// Supply Chain & Commerce Platform V5.1 — Three-Way Matching Engine. Verifies FULL_MATCH,
// PARTIAL_MATCH (partial receipt/invoicing), price variance detection, over-billing/over-receipt
// detection, and the blockOnMatchVariance policy actually preventing invoice creation.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, createWarehouseFixture, createStockItemFixture, type TestFixture } from "./fixtures.js";
import SupplierModel from "../../modules/purchasing/supplier/supplier.model.js";
import PurchaseSettingsModel from "../../modules/purchasing/purchasing-settings/purchase-settings.model.js";
import purchaseOrderService from "../../modules/purchasing/purchase-order/purchase-order.service.js";
import goodsReceiptNoteService from "../../modules/purchasing/goods-receipt-note/goods-receipt-note.service.js";
import purchaseInvoiceService from "../../modules/purchasing/purchase-invoice/purchase-invoice.service.js";
import threeWayMatchService from "../../modules/purchasing/three-way-match/three-way-match.service.js";
import PurchaseOrderModel from "../../modules/purchasing/purchase-order/purchase-order.model.js";
import GoodsReceiptNoteModel from "../../modules/purchasing/goods-receipt-note/goods-receipt-note.model.js";
import PurchaseInvoiceModel from "../../modules/purchasing/purchase-invoice/purchase-invoice.model.js";
import WarehouseDocumentModel from "../../modules/inventory/warehouse-document/warehouse-document.model.js";
import InventoryModel from "../../modules/inventory/inventory/inventory.model.js";
import SupplierTransactionModel from "../../modules/purchasing/supplier-transaction/supplier-transaction.model.js";

describe("Supply Chain V5.1: Three-Way Matching Engine", () => {
  let fixture: TestFixture;
  let warehouseId: string;
  let stockItemId: string;
  let supplierId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("twm-engine");

    const warehouse = await createWarehouseFixture(fixture, "twm");
    warehouseId = String(warehouse._id);
    const stockItem = await createStockItemFixture(fixture, "twm", "WeightedAverage");
    stockItemId = String(stockItem._id);

    const supplier = await SupplierModel.create({
      brand: fixture.brandId, branch: fixture.branchId, type: "company", name: "TWM Supplier",
      code: "SUP-TWM", responsiblePerson: "Test", phone: ["01000000002"], paymentType: "Credit",
      createdBy: fixture.userId,
    });
    supplierId = String(supplier._id);

    await PurchaseSettingsModel.create({
      brand: fixture.brandId, branch: fixture.branchId, procurementLevel: "STANDARD",
      matchToleranceRate: 2, createdBy: fixture.userId,
    });
  });

  afterAll(async () => {
    await Promise.all([
      PurchaseOrderModel.deleteMany({ brand: fixture.brandId }),
      GoodsReceiptNoteModel.deleteMany({ brand: fixture.brandId }),
      PurchaseInvoiceModel.deleteMany({ brand: fixture.brandId }),
      WarehouseDocumentModel.deleteMany({ brand: fixture.brandId }),
      InventoryModel.deleteMany({ brand: fixture.brandId }),
      SupplierTransactionModel.deleteMany({ brand: fixture.brandId }),
      SupplierModel.deleteMany({ brand: fixture.brandId }),
      PurchaseSettingsModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  async function createReceivedPo(quantity: number, unitPrice: number) {
    const po = await purchaseOrderService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: { branch: fixture.branchId, supplier: supplierId, warehouse: warehouseId, items: [{ stockItem: stockItemId, quantity, unitPrice }] },
    });
    await purchaseOrderService.transition({ id: po._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Submitted", actorId: fixture.userId });
    await purchaseOrderService.transition({ id: po._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Approved", actorId: fixture.userId });
    return po;
  }

  async function createConfirmedGrn(poId: any, receivedQuantity: number, unitCost: number) {
    const grn = await goodsReceiptNoteService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: { branch: fixture.branchId, purchaseOrder: poId, supplier: supplierId, warehouse: warehouseId, items: [{ stockItem: stockItemId, receivedQuantity, unitCost, condition: "GOOD" }] },
    });
    return goodsReceiptNoteService.confirm({ id: grn._id, brand: fixture.brandId, branch: fixture.branchId, confirmedBy: fixture.userId });
  }

  it("reports FULL_MATCH when ordered, received, and invoiced quantities/prices all agree", async () => {
    const po = await createReceivedPo(20, 15);
    const grn = await createConfirmedGrn(po._id, 20, 15);

    const invoice = await purchaseInvoiceService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, supplier: supplierId, purchaseOrder: po._id, goodsReceiptNotes: [grn._id],
        supplierInvoiceNumber: "TWM-001",
        items: [{ itemId: stockItemId, quantity: 20, storageUnit: "kg", pricePerUnit: 15, lineSubtotal: 300, lineNetTotal: 300, warehouse: warehouseId }],
        grossAmount: 300, netAmount: 300, balanceDue: 300,
      },
    });

    expect(invoice.threeWayMatchStatus).toBe("FULL_MATCH");
  });

  it("reports PARTIAL_MATCH when only part of the ordered quantity has been received/invoiced", async () => {
    const po = await createReceivedPo(30, 10);
    const grn = await createConfirmedGrn(po._id, 10, 10); // only 10 of 30 received

    const invoice = await purchaseInvoiceService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, supplier: supplierId, purchaseOrder: po._id, goodsReceiptNotes: [grn._id],
        supplierInvoiceNumber: "TWM-002",
        items: [{ itemId: stockItemId, quantity: 10, storageUnit: "kg", pricePerUnit: 10, lineSubtotal: 100, lineNetTotal: 100, warehouse: warehouseId }],
        grossAmount: 100, netAmount: 100, balanceDue: 100,
      },
    });

    expect(invoice.threeWayMatchStatus).toBe("PARTIAL_MATCH");
  });

  it("flags a PRICE_VARIANCE exception beyond tolerance, via the standalone match() preview", async () => {
    const po = await createReceivedPo(5, 100);
    const grn = await createConfirmedGrn(po._id, 5, 100);

    const invoice = await purchaseInvoiceService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, supplier: supplierId, purchaseOrder: po._id, goodsReceiptNotes: [grn._id],
        supplierInvoiceNumber: "TWM-003",
        // Invoiced at 110 vs ordered 100 -> 10% variance, tolerance is 2%.
        items: [{ itemId: stockItemId, quantity: 5, storageUnit: "kg", pricePerUnit: 110, lineSubtotal: 550, lineNetTotal: 550, warehouse: warehouseId }],
        grossAmount: 550, netAmount: 550, balanceDue: 550,
      },
    });
    expect(invoice.threeWayMatchStatus).toBe("VARIANCE");

    const report = await threeWayMatchService.match({ purchaseInvoiceId: invoice._id, brand: fixture.brandId, toleranceRate: 2 });
    expect(report.status).toBe("VARIANCE");
    const line = report.lines.find((l: any) => l.stockItem === stockItemId);
    expect(line.exceptions.some((e: any) => e.type === "PRICE_VARIANCE")).toBe(true);
  });

  it("detects OVER_BILLING when invoiced quantity exceeds ordered quantity", async () => {
    const po = await createReceivedPo(5, 10);
    const grn = await createConfirmedGrn(po._id, 5, 10);

    const invoice = await purchaseInvoiceService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, supplier: supplierId, purchaseOrder: po._id, goodsReceiptNotes: [grn._id],
        supplierInvoiceNumber: "TWM-004",
        items: [{ itemId: stockItemId, quantity: 8, storageUnit: "kg", pricePerUnit: 10, lineSubtotal: 80, lineNetTotal: 80, warehouse: warehouseId }],
        grossAmount: 80, netAmount: 80, balanceDue: 80,
      },
    });

    const report = await threeWayMatchService.match({ purchaseInvoiceId: invoice._id, brand: fixture.brandId, toleranceRate: 2 });
    const line = report.lines.find((l: any) => l.stockItem === stockItemId);
    expect(line.exceptions.some((e: any) => e.type === "OVER_BILLING")).toBe(true);
    expect(line.exceptions.some((e: any) => e.type === "OVER_BILLING_VS_RECEIPT")).toBe(true);
  });

  it("blocks invoice creation on variance when blockOnMatchVariance is enabled", async () => {
    await PurchaseSettingsModel.updateOne({ brand: fixture.brandId, branch: fixture.branchId }, { $set: { blockOnMatchVariance: true } });

    const po = await createReceivedPo(5, 10);
    const grn = await createConfirmedGrn(po._id, 5, 10);

    await expect(
      purchaseInvoiceService.create({
        brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
        data: {
          branch: fixture.branchId, supplier: supplierId, purchaseOrder: po._id, goodsReceiptNotes: [grn._id],
          supplierInvoiceNumber: "TWM-005",
          items: [{ itemId: stockItemId, quantity: 5, storageUnit: "kg", pricePerUnit: 25, lineSubtotal: 125, lineNetTotal: 125, warehouse: warehouseId }],
          grossAmount: 125, netAmount: 125, balanceDue: 125,
        },
      }),
    ).rejects.toThrow(/three-way match found variances/i);

    await PurchaseSettingsModel.updateOne({ brand: fixture.brandId, branch: fixture.branchId }, { $set: { blockOnMatchVariance: false } });
  });

  it("reports NOT_APPLICABLE when no purchase order is referenced (BASIC procurement)", async () => {
    const invoice = await purchaseInvoiceService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, supplier: supplierId, supplierInvoiceNumber: "TWM-006",
        items: [{ itemId: stockItemId, quantity: 1, storageUnit: "kg", pricePerUnit: 5, lineSubtotal: 5, lineNetTotal: 5, warehouse: warehouseId }],
        grossAmount: 5, netAmount: 5, balanceDue: 5,
      },
    });

    expect(invoice.threeWayMatchStatus).toBe("NOT_APPLICABLE");
  });
});
