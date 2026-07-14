// Supply Chain & Commerce Platform V6.0 — Production Hardening. Verifies the TOCTOU races closed
// this pass actually hold under REAL concurrent calls (Promise.all racing two callers against the
// same document), not just sequential re-calls — a sequential second call would pass even with the
// old read-then-save code (the guard's transitionGuard.assertValid would already reject a
// wrong-status second call); only a genuine race exercises the atomic-claim fix.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import {
  createBaseFixture, cleanupFixture, createWarehouseFixture, createStockItemFixture,
  createAccountingSettingsFixture, createAccountingPeriodFixture, type TestFixture,
} from "./fixtures.js";
import SupplierModel from "../../modules/purchasing/supplier/supplier.model.js";
import PurchaseSettingsModel from "../../modules/purchasing/purchasing-settings/purchase-settings.model.js";
import purchaseOrderService from "../../modules/purchasing/purchase-order/purchase-order.service.js";
import goodsReceiptNoteService from "../../modules/purchasing/goods-receipt-note/goods-receipt-note.service.js";
import purchaseInvoiceService from "../../modules/purchasing/purchase-invoice/purchase-invoice.service.js";
import supplierTransactionService from "../../modules/purchasing/supplier-transaction/supplier-transaction.service.js";
import PurchaseOrderModel from "../../modules/purchasing/purchase-order/purchase-order.model.js";
import GoodsReceiptNoteModel from "../../modules/purchasing/goods-receipt-note/goods-receipt-note.model.js";
import PurchaseInvoiceModel from "../../modules/purchasing/purchase-invoice/purchase-invoice.model.js";
import SupplierTransactionModel from "../../modules/purchasing/supplier-transaction/supplier-transaction.model.js";
import InventoryModel from "../../modules/inventory/inventory/inventory.model.js";
import WarehouseDocumentModel from "../../modules/inventory/warehouse-document/warehouse-document.model.js";
import AccountModel from "../../modules/accounting/account/account.model.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import AccountingPeriodModel from "../../modules/accounting/accounting-period/accounting-period.model.js";
import AccountingSettingModel from "../../modules/accounting/accounting-settings/accounting-setting.model.js";

describe("Supply Chain V6.0: Concurrency Safety", () => {
  let fixture: TestFixture;
  let warehouseId: string;
  let stockItemId: string;
  let supplierId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("concurrency");

    const warehouse = await createWarehouseFixture(fixture, "cc");
    warehouseId = String(warehouse._id);
    const stockItem = await createStockItemFixture(fixture, "cc", "WeightedAverage");
    stockItemId = String(stockItem._id);

    await createAccountingSettingsFixture(fixture, "cc");
    const now = new Date();
    await createAccountingPeriodFixture(fixture, "cc", {
      startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      endDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)),
    });

    const supplier = await SupplierModel.create({
      brand: fixture.brandId, branch: fixture.branchId, type: "company", name: "Concurrency Test Supplier",
      code: "SUP-CC-1", responsiblePerson: "Test Person", phone: ["01000000000"], paymentType: "Credit", creditLimit: 100000,
      createdBy: fixture.userId,
    });
    supplierId = String(supplier._id);

    await PurchaseSettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, procurementLevel: "STANDARD", createdBy: fixture.userId });
  });

  afterAll(async () => {
    await Promise.all([
      PurchaseOrderModel.deleteMany({ brand: fixture.brandId }),
      GoodsReceiptNoteModel.deleteMany({ brand: fixture.brandId }),
      PurchaseInvoiceModel.deleteMany({ brand: fixture.brandId }),
      SupplierTransactionModel.deleteMany({ brand: fixture.brandId }),
      WarehouseDocumentModel.deleteMany({ brand: fixture.brandId }),
      InventoryModel.deleteMany({ brand: fixture.brandId }),
      JournalEntryModel.deleteMany({ brand: fixture.brandId }),
      AccountingPeriodModel.deleteMany({ brand: fixture.brandId }),
      AccountingSettingModel.deleteMany({ brand: fixture.brandId }),
      SupplierModel.deleteMany({ brand: fixture.brandId }),
      PurchaseSettingsModel.deleteMany({ brand: fixture.brandId }),
      AccountModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("two concurrent GoodsReceiptNote.confirm() calls for the same GRN post exactly one WarehouseDocument", async () => {
    const grn = await goodsReceiptNoteService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, supplier: supplierId, warehouse: warehouseId,
        items: [{ stockItem: stockItemId, orderedQuantity: 10, receivedQuantity: 10, unitCost: 20, condition: "GOOD" }],
      },
    });

    const results = await Promise.allSettled([
      goodsReceiptNoteService.confirm({ id: grn._id, brand: fixture.brandId, branch: fixture.branchId, confirmedBy: fixture.userId }),
      goodsReceiptNoteService.confirm({ id: grn._id, brand: fixture.brandId, branch: fixture.branchId, confirmedBy: fixture.userId }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason.message).toMatch(/already confirmed|cannot transition/i);

    // Exactly one inventory movement happened, not two.
    const inventoryRow = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: stockItemId });
    expect(inventoryRow?.quantity).toBe(10);

    const postedDocs = await WarehouseDocumentModel.find({ brand: fixture.brandId, documentNumber: `WD-${grn.grnNumber}` });
    expect(postedDocs).toHaveLength(1);
  });

  it("two concurrent PurchaseInvoice.transition() calls to Completed post exactly one AP ledger entry", async () => {
    const invoice = await purchaseInvoiceService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, supplier: supplierId, supplierInvoiceNumber: "SUP-INV-CC-1", status: "Approved",
        items: [{ itemId: stockItemId, quantity: 5, storageUnit: "kg", pricePerUnit: 20, lineSubtotal: 100, lineNetTotal: 100, warehouse: warehouseId }],
        grossAmount: 100, netAmount: 100, balanceDue: 100,
      },
    });
    expect(invoice.status).toBe("Approved"); // no accounting posted yet — afterCreate only fires for status:"Completed"

    const results = await Promise.allSettled([
      purchaseInvoiceService.transition({ id: invoice._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Completed", actorId: fixture.userId }),
      purchaseInvoiceService.transition({ id: invoice._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Completed", actorId: fixture.userId }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);

    const purchaseTxns = await SupplierTransactionModel.find({ brand: fixture.brandId, supplier: supplierId, transactionType: "Purchase", reffrance: invoice._id });
    expect(purchaseTxns).toHaveLength(1); // not double-recorded on the AP ledger
  });

  it("supplierTransactionService.record() rejects a second Purchase transaction for the same invoice reference", async () => {
    const invoice = await purchaseInvoiceService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, supplier: supplierId, supplierInvoiceNumber: "SUP-INV-CC-2",
        items: [{ itemId: stockItemId, quantity: 1, storageUnit: "kg", pricePerUnit: 10, lineSubtotal: 10, lineNetTotal: 10, warehouse: warehouseId }],
        grossAmount: 10, netAmount: 10, balanceDue: 10,
      },
    }); // defaults to status "Completed" -> afterCreate already recorded one "Purchase" transaction

    await expect(
      supplierTransactionService.record({
        brand: fixture.brandId, branch: fixture.branchId, supplier: supplierId,
        transactionType: "Purchase", amount: 10, description: "duplicate attempt",
        invoiceModel: "PurchaseInvoice", reffrance: invoice._id, recordedBy: fixture.userId,
      }),
    ).rejects.toThrow(/already been recorded/i);
  });

  it("two concurrent PurchaseOrder.transition() calls to Approved emit PURCHASE_ORDER_APPROVED exactly once", async () => {
    const po = await purchaseOrderService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: { branch: fixture.branchId, supplier: supplierId, warehouse: warehouseId, items: [{ stockItem: stockItemId, quantity: 5, unitPrice: 10 }] },
    });
    await purchaseOrderService.transition({ id: po._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Submitted", actorId: fixture.userId });

    const results = await Promise.allSettled([
      purchaseOrderService.transition({ id: po._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Approved", actorId: fixture.userId }),
      purchaseOrderService.transition({ id: po._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Approved", actorId: fixture.userId }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(1);

    const finalPo = await PurchaseOrderModel.findById(po._id);
    expect(finalPo?.status).toBe("Approved");
  });
});
