// Supply Chain & Commerce Platform V5.1 — Supplier Returns. Verifies approve() actually reverses
// inventory (outbound WarehouseDocument posted) and accounting (JournalEntry posted, reduces AP
// via a PurchaseReturn SupplierTransaction), for both settlement paths: deduct_supplier_balance
// (settles instantly, Fully Refunded) and cash (Partially Refunded until recordRefund() closes it).
import { connectTestDb, disconnectTestDb } from "./setup.js";
import {
  createBaseFixture, cleanupFixture, createWarehouseFixture, createStockItemFixture,
  createAccountingSettingsFixture, createAccountingPeriodFixture, type TestFixture,
} from "./fixtures.js";
import SupplierModel from "../../modules/purchasing/supplier/supplier.model.js";
import PurchaseSettingsModel from "../../modules/purchasing/purchasing-settings/purchase-settings.model.js";
import purchaseInvoiceService from "../../modules/purchasing/purchase-invoice/purchase-invoice.service.js";
import purchaseReturnService from "../../modules/purchasing/purchase-return/purchase-return.service.js";
import PurchaseInvoiceModel from "../../modules/purchasing/purchase-invoice/purchase-invoice.model.js";
import PurchaseReturnInvoiceModel from "../../modules/purchasing/purchase-return/purchase-return.model.js";
import SupplierTransactionModel from "../../modules/purchasing/supplier-transaction/supplier-transaction.model.js";
import WarehouseDocumentModel from "../../modules/inventory/warehouse-document/warehouse-document.model.js";
import warehouseDocumentService from "../../modules/inventory/warehouse-document/warehouse-document.service.js";
import InventoryModel from "../../modules/inventory/inventory/inventory.model.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import AccountingPeriodModel from "../../modules/accounting/accounting-period/accounting-period.model.js";
import AccountingSettingModel from "../../modules/accounting/accounting-settings/accounting-setting.model.js";
import AccountModel from "../../modules/accounting/account/account.model.js";
import CashRegisterModel from "../../modules/finance/cash-register/cash-register.model.js";
import PaymentMethodModel from "../../modules/payments/payment-method/payment-method.model.js";

describe("Supply Chain V5.1: Supplier Returns (inventory + accounting reversal)", () => {
  let fixture: TestFixture;
  let warehouseId: string;
  let stockItemId: string;
  let supplierId: string;
  let paymentMethodId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("purchase-return");

    const warehouse = await createWarehouseFixture(fixture, "pret");
    warehouseId = String(warehouse._id);
    const stockItem = await createStockItemFixture(fixture, "pret", "WeightedAverage");
    stockItemId = String(stockItem._id);

    await createAccountingSettingsFixture(fixture, "pret");
    const now = new Date();
    await createAccountingPeriodFixture(fixture, "pret", {
      startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      endDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)),
    });

    const supplier = await SupplierModel.create({
      brand: fixture.brandId, branch: fixture.branchId, type: "company", name: "Return Supplier",
      code: "SUP-PRET", responsiblePerson: "Test", phone: ["01000000004"], paymentType: "Credit",
      createdBy: fixture.userId,
    });
    supplierId = String(supplier._id);

    await PurchaseSettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });

    const cashAccount = await AccountModel.create({
      brand: fixture.brandId, code: "CASHREG-PRET", name: new Map([["en", "Cash Register PRET"]]), category: "Asset", normalBalance: "Debit",
    });
    const cashRegister = await CashRegisterModel.create({
      brand: fixture.brandId, branch: fixture.branchId, type: "SUSPENSE", code: "REG-PRET",
      name: new Map([["en", "PRET Register"]]), accountId: cashAccount._id, currency: "EGP", createdBy: fixture.userId,
    });
    const paymentMethod = await PaymentMethodModel.create({
      brand: fixture.brandId, name: new Map([["en", "Cash"]]), paymentCategory: "Cash",
      type: "CashRegister", reference: cashRegister._id, createdBy: fixture.userId,
    });
    paymentMethodId = String(paymentMethod._id);
  });

  afterAll(async () => {
    await Promise.all([
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
      CashRegisterModel.deleteMany({ brand: fixture.brandId }),
      PaymentMethodModel.deleteMany({ brand: fixture.brandId }),
      AccountModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  async function createInvoiceWithStock(quantity: number, unitPrice: number, supplierInvoiceNumber: string) {
    // PurchaseInvoice alone never moves inventory (by design — see SUPPLY_CHAIN_SSOT_MATRIX.md,
    // that's GoodsReceiptNote's job); seed real stock directly via the Inventory Posting Engine
    // (an OpeningBalance IN document) so there's something for the return to actually reverse.
    const seedDoc = await warehouseDocumentService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, documentType: "IN", postingDate: new Date(), transactionType: "OpeningBalance",
        documentNumber: `SEED-${supplierInvoiceNumber}`, destinationWarehouse: warehouseId,
        items: [{ stockItem: stockItemId, quantity, unitCost: unitPrice, totalCost: quantity * unitPrice }],
        status: "approved",
      },
    });
    await warehouseDocumentService.postDocument({ id: seedDoc._id, brand: fixture.brandId, branch: fixture.branchId, postedBy: fixture.userId });

    return purchaseInvoiceService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, supplier: supplierId, supplierInvoiceNumber,
        items: [{ itemId: stockItemId, quantity, storageUnit: "kg", pricePerUnit: unitPrice, lineSubtotal: quantity * unitPrice, lineNetTotal: quantity * unitPrice, warehouse: warehouseId }],
        grossAmount: quantity * unitPrice, netAmount: quantity * unitPrice, balanceDue: quantity * unitPrice,
      },
    });
  }

  it("approve() with deduct_supplier_balance settles instantly: reverses inventory, posts GL, reduces AP, Fully Refunded", async () => {
    const invoice = await createInvoiceWithStock(20, 10, "PRET-INV-001"); // brings 20 units into stock

    const inventoryBefore = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: stockItemId });
    const qtyBefore = inventoryBefore?.quantity ?? 0;

    const ret = await purchaseReturnService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, supplier: supplierId, originalInvoice: invoice._id, refundType: "deduct_supplier_balance",
        returnedItems: [{ itemId: stockItemId, quantity: 5, storageUnit: "kg", price: 10, lineSubtotal: 50, lineNetTotal: 50, warehouse: warehouseId }],
        totalAmount: 50, netAmount: 50,
      },
    });
    expect(ret.invoiceNumber).toMatch(/^PRR-/);
    expect(ret.status).toBe("Draft");

    await purchaseReturnService.transition({ id: ret._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Review", actorId: fixture.userId });
    const approved = await purchaseReturnService.transition({ id: ret._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Fully Refunded", actorId: fixture.userId });

    expect(approved.status).toBe("Fully Refunded");
    expect(approved.balanceDue).toBe(0);
    expect(approved.accountingPosted).toBe(true);
    expect(approved.journalEntry).toBeTruthy();

    // Inventory actually reduced by the returned quantity.
    const inventoryAfter = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: stockItemId });
    expect(inventoryAfter?.quantity).toBe(qtyBefore - 5);

    const journalEntry = await JournalEntryModel.findById(approved.journalEntry);
    expect(journalEntry).toBeTruthy();

    // AP reduced via a PurchaseReturn SupplierTransaction (Debit direction).
    const returnTxn = await SupplierTransactionModel.findOne({ brand: fixture.brandId, supplier: supplierId, transactionType: "PurchaseReturn" });
    expect(returnTxn).toBeTruthy();
    expect(returnTxn?.direction).toBe("Debit");
    expect(returnTxn?.amount).toBe(50);

    // Invalid transition rejected — a Fully Refunded return has no further transitions.
    await expect(
      purchaseReturnService.transition({ id: ret._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Cancelled", actorId: fixture.userId }),
    ).rejects.toThrow(/cannot transition/i);
  });

  it("approve() with cash refundType lands on Partially Refunded until recordRefund() closes the balance", async () => {
    const invoice = await createInvoiceWithStock(10, 20, "PRET-INV-002");

    const ret = await purchaseReturnService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, supplier: supplierId, originalInvoice: invoice._id, refundType: "cash",
        returnedItems: [{ itemId: stockItemId, quantity: 3, storageUnit: "kg", price: 20, lineSubtotal: 60, lineNetTotal: 60, warehouse: warehouseId }],
        totalAmount: 60, netAmount: 60,
      },
    });

    await purchaseReturnService.transition({ id: ret._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Review", actorId: fixture.userId });
    const approved = await purchaseReturnService.transition({ id: ret._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Partially Refunded", actorId: fixture.userId });

    expect(approved.status).toBe("Partially Refunded");
    expect(approved.balanceDue).toBe(60); // reversal posted, but no cash refunded yet
    expect(approved.accountingPosted).toBe(true); // GL/AP reversal already happened at approval, independent of cash refund timing

    const refunded = await purchaseReturnService.recordRefund({
      id: ret._id, brand: fixture.brandId, branch: fixture.branchId, amount: 60, refundMethod: paymentMethodId, actorId: fixture.userId,
    });
    expect(refunded.balanceDue).toBe(0);
    expect(refunded.status).toBe("Fully Refunded");
  });
});
