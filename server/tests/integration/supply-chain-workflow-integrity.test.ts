// Supply Chain & Commerce Platform V5.2 — Workflow Integrity Audit fixes. Verifies three
// referential-integrity gaps found during the V5.2 pre-design audit are actually closed:
//   1. A GoodsReceiptNote referencing a Cancelled PurchaseOrder can no longer be confirmed.
//   2. A PurchaseReturnInvoice can no longer return more than was invoiced for a given item.
//   3. journalEntryService.postFromSource() rejects a second call for the same source document.
import mongoose from "mongoose";
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
import purchaseReturnService from "../../modules/purchasing/purchase-return/purchase-return.service.js";
import journalEntryService from "../../modules/accounting/journal-entry/journal-entry.service.js";
import PurchaseOrderModel from "../../modules/purchasing/purchase-order/purchase-order.model.js";
import GoodsReceiptNoteModel from "../../modules/purchasing/goods-receipt-note/goods-receipt-note.model.js";
import PurchaseInvoiceModel from "../../modules/purchasing/purchase-invoice/purchase-invoice.model.js";
import PurchaseReturnInvoiceModel from "../../modules/purchasing/purchase-return/purchase-return.model.js";
import SupplierTransactionModel from "../../modules/purchasing/supplier-transaction/supplier-transaction.model.js";
import InventoryModel from "../../modules/inventory/inventory/inventory.model.js";
import WarehouseDocumentModel from "../../modules/inventory/warehouse-document/warehouse-document.model.js";
import AccountModel from "../../modules/accounting/account/account.model.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import AccountingPeriodModel from "../../modules/accounting/accounting-period/accounting-period.model.js";
import AccountingSettingModel from "../../modules/accounting/accounting-settings/accounting-setting.model.js";

describe("Supply Chain V5.2: Workflow Integrity", () => {
  let fixture: TestFixture;
  let warehouseId: string;
  let stockItemId: string;
  let supplierId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("wf-integrity");

    const warehouse = await createWarehouseFixture(fixture, "wfi");
    warehouseId = String(warehouse._id);
    const stockItem = await createStockItemFixture(fixture, "wfi", "WeightedAverage");
    stockItemId = String(stockItem._id);

    await createAccountingSettingsFixture(fixture, "wfi");
    const now = new Date();
    await createAccountingPeriodFixture(fixture, "wfi", {
      startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      endDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)),
    });

    const supplier = await SupplierModel.create({
      brand: fixture.brandId, branch: fixture.branchId, type: "company", name: "WFI Test Supplier",
      code: "SUP-WFI-1", responsiblePerson: "Test Person", phone: ["01000000000"], paymentType: "Credit", creditLimit: 100000,
      createdBy: fixture.userId,
    });
    supplierId = String(supplier._id);

    await PurchaseSettingsModel.create({
      brand: fixture.brandId, branch: fixture.branchId, procurementLevel: "STANDARD",
      createdBy: fixture.userId,
    });
  });

  afterAll(async () => {
    await Promise.all([
      PurchaseOrderModel.deleteMany({ brand: fixture.brandId }),
      GoodsReceiptNoteModel.deleteMany({ brand: fixture.brandId }),
      PurchaseInvoiceModel.deleteMany({ brand: fixture.brandId }),
      PurchaseReturnInvoiceModel.deleteMany({ brand: fixture.brandId }),
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

  it("rejects confirming a GoodsReceiptNote against a Cancelled purchase order", async () => {
    const po = await purchaseOrderService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: { branch: fixture.branchId, supplier: supplierId, warehouse: warehouseId, items: [{ stockItem: stockItemId, quantity: 10, unitPrice: 20 }] },
    });
    await purchaseOrderService.transition({ id: po._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Submitted", actorId: fixture.userId });
    await purchaseOrderService.transition({ id: po._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Cancelled", actorId: fixture.userId });

    const grn = await goodsReceiptNoteService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, purchaseOrder: po._id, supplier: supplierId, warehouse: warehouseId,
        items: [{ stockItem: stockItemId, orderedQuantity: 10, receivedQuantity: 10, unitCost: 20, condition: "GOOD" }],
      },
    });

    await expect(
      goodsReceiptNoteService.confirm({ id: grn._id, brand: fixture.brandId, branch: fixture.branchId, confirmedBy: fixture.userId }),
    ).rejects.toThrow(/not open to receiving/i);

    // No inventory movement happened — the guard fired before any WarehouseDocument was created.
    const inventoryRow = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: stockItemId });
    expect(inventoryRow?.quantity ?? 0).toBe(0);

    const unchangedGrn = await GoodsReceiptNoteModel.findById(grn._id);
    expect(unchangedGrn?.status).toBe("Draft");
  });

  it("rejects a supplier return that exceeds the quantity invoiced on the original invoice", async () => {
    const invoice = await purchaseInvoiceService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, supplier: supplierId, supplierInvoiceNumber: "SUP-INV-WFI-1",
        items: [{ itemId: stockItemId, quantity: 10, storageUnit: "kg", pricePerUnit: 20, lineSubtotal: 200, lineNetTotal: 200, warehouse: warehouseId }],
        grossAmount: 200, netAmount: 200, balanceDue: 200,
      },
    });

    // Over-return in a single request.
    await expect(
      purchaseReturnService.create({
        brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
        data: {
          branch: fixture.branchId, originalInvoice: invoice._id, supplier: supplierId, warehouseForAllItems: warehouseId,
          returnedItems: [{ itemId: stockItemId, quantity: 11, storageUnit: "kg", price: 20, lineSubtotal: 220, lineNetTotal: 220, warehouse: warehouseId }],
          totalAmount: 220, netAmount: 220,
        },
      }),
    ).rejects.toThrow(/only .* remaining returnable/i);

    // A legitimate partial return succeeds...
    const firstReturn = await purchaseReturnService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, originalInvoice: invoice._id, supplier: supplierId, warehouseForAllItems: warehouseId,
        returnedItems: [{ itemId: stockItemId, quantity: 6, storageUnit: "kg", price: 20, lineSubtotal: 120, lineNetTotal: 120, warehouse: warehouseId }],
        totalAmount: 120, netAmount: 120,
      },
    });
    expect(firstReturn.status).toBe("Draft");

    // ...but a second return for more than the 4 units still remaining is rejected.
    await expect(
      purchaseReturnService.create({
        brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
        data: {
          branch: fixture.branchId, originalInvoice: invoice._id, supplier: supplierId, warehouseForAllItems: warehouseId,
          returnedItems: [{ itemId: stockItemId, quantity: 5, storageUnit: "kg", price: 20, lineSubtotal: 100, lineNetTotal: 100, warehouse: warehouseId }],
          totalAmount: 100, netAmount: 100,
        },
      }),
    ).rejects.toThrow(/only 4 remaining returnable/i);
  });

  it("rejects a second postFromSource() call for the same (brand, sourceType, sourceRef)", async () => {
    const settings = await AccountingSettingModel.findOne({ brand: fixture.brandId });
    const apAccount = settings?.controlAccounts?.accountsPayable;
    const inventoryAccount = settings?.controlAccounts?.inventory;
    const sourceRef = new mongoose.Types.ObjectId();

    const lines = [
      { account: apAccount, description: "test", debit: 0, credit: 100, currency: "EGP" },
      { account: inventoryAccount, description: "test", debit: 100, credit: 0, currency: "EGP" },
    ];

    await journalEntryService.postFromSource({
      sourceType: "MANUAL_ENTRY", brand: fixture.brandId, branch: fixture.branchId,
      date: new Date(), description: "Idempotency guard test — first post", lines, createdBy: fixture.userId, sourceRef,
    });

    await expect(
      journalEntryService.postFromSource({
        sourceType: "MANUAL_ENTRY", brand: fixture.brandId, branch: fixture.branchId,
        date: new Date(), description: "Idempotency guard test — duplicate post", lines, createdBy: fixture.userId, sourceRef,
      }),
    ).rejects.toThrow(/already been posted/i);
  });
});
