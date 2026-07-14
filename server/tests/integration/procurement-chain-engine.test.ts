// Supply Chain & Commerce Platform V5 — end-to-end Procurement chain:
// Supplier -> PurchaseOrder -> GoodsReceiptNote (confirm, posts to Inventory) -> PurchaseInvoice
// (posts to Accounting + Supplier AP ledger) -> Supplier Payment (closes the AP loop).
// Verifies the STANDARD procurement level (PO required, GRN references it, PO status rolls up
// from received quantities) and the accounting/payment wiring this session added.
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
import PurchaseOrderModel from "../../modules/purchasing/purchase-order/purchase-order.model.js";
import GoodsReceiptNoteModel from "../../modules/purchasing/goods-receipt-note/goods-receipt-note.model.js";
import PurchaseInvoiceModel from "../../modules/purchasing/purchase-invoice/purchase-invoice.model.js";
import SupplierTransactionModel from "../../modules/purchasing/supplier-transaction/supplier-transaction.model.js";
import InventoryModel from "../../modules/inventory/inventory/inventory.model.js";
import WarehouseDocumentModel from "../../modules/inventory/warehouse-document/warehouse-document.model.js";
import AccountModel from "../../modules/accounting/account/account.model.js";
import CashRegisterModel from "../../modules/finance/cash-register/cash-register.model.js";
import PaymentMethodModel from "../../modules/payments/payment-method/payment-method.model.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import AccountingPeriodModel from "../../modules/accounting/accounting-period/accounting-period.model.js";
import AccountingSettingModel from "../../modules/accounting/accounting-settings/accounting-setting.model.js";

describe("Supply Chain V5: Procurement chain (Supplier -> PO -> GRN -> Invoice -> Payment)", () => {
  let fixture: TestFixture;
  let warehouseId: string;
  let stockItemId: string;
  let supplierId: string;
  let paymentMethodId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("scp-procurement");

    const warehouse = await createWarehouseFixture(fixture, "scp");
    warehouseId = String(warehouse._id);
    const stockItem = await createStockItemFixture(fixture, "scp", "WeightedAverage");
    stockItemId = String(stockItem._id);

    await createAccountingSettingsFixture(fixture, "scp");
    const now = new Date();
    await createAccountingPeriodFixture(fixture, "scp", {
      startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      endDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)),
    });

    const supplier = await SupplierModel.create({
      brand: fixture.brandId, branch: fixture.branchId, type: "company", name: "SCP Test Supplier",
      code: "SUP-SCP-1", responsiblePerson: "Test Person", phone: ["01000000000"], paymentType: "Credit", creditLimit: 100000,
      createdBy: fixture.userId,
    });
    supplierId = String(supplier._id);

    await PurchaseSettingsModel.create({
      brand: fixture.brandId, branch: fixture.branchId, procurementLevel: "STANDARD",
      createdBy: fixture.userId,
    });

    const cashAccount = await AccountModel.create({
      brand: fixture.brandId, code: "CASHREG-SCP", name: new Map([["en", "Cash Register SCP"]]), category: "Asset", normalBalance: "Debit",
    });
    const cashRegister = await CashRegisterModel.create({
      brand: fixture.brandId, branch: fixture.branchId, type: "SUSPENSE", code: "REG-SCP",
      name: new Map([["en", "SCP Register"]]), accountId: cashAccount._id,
      currency: "EGP", createdBy: fixture.userId,
    });
    const paymentMethod = await PaymentMethodModel.create({
      brand: fixture.brandId, name: new Map([["en", "Cash"]]), paymentCategory: "Cash",
      type: "CashRegister", reference: cashRegister._id, createdBy: fixture.userId,
    });
    paymentMethodId = String(paymentMethod._id);
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
      CashRegisterModel.deleteMany({ brand: fixture.brandId }),
      PaymentMethodModel.deleteMany({ brand: fixture.brandId }),
      AccountModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("runs the full chain: PO -> GRN confirm (posts inventory + rolls up PO) -> Invoice (posts GL + AP ledger) -> Payment", async () => {
    // 1. Purchase Order
    const po = await purchaseOrderService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, supplier: supplierId, warehouse: warehouseId,
        items: [{ stockItem: stockItemId, quantity: 10, unitPrice: 20 }],
      },
    });
    expect(po.poNumber).toMatch(/^PO-/);
    expect(po.status).toBe("Draft");
    expect(po.totalAmount).toBe(200);

    await purchaseOrderService.transition({ id: po._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Submitted", actorId: fixture.userId });
    const approvedPo = await purchaseOrderService.transition({ id: po._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Approved", actorId: fixture.userId });
    expect(approvedPo.status).toBe("Approved");

    // Invalid transition rejected (TransitionGuard in real use, not just in isolation).
    await expect(
      purchaseOrderService.transition({ id: po._id, brand: fixture.brandId, branch: fixture.branchId, toStatus: "Draft", actorId: fixture.userId }),
    ).rejects.toThrow(/cannot transition/i);

    // 2. Goods Receipt Note — receive the full ordered quantity.
    const grn = await goodsReceiptNoteService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, purchaseOrder: po._id, supplier: supplierId, warehouse: warehouseId,
        items: [{ stockItem: stockItemId, orderedQuantity: 10, receivedQuantity: 10, unitCost: 20, condition: "GOOD" }],
      },
    });
    expect(grn.grnNumber).toMatch(/^GRN-/);
    expect(grn.status).toBe("Draft");

    const confirmed = await goodsReceiptNoteService.confirm({ id: grn._id, brand: fixture.brandId, branch: fixture.branchId, confirmedBy: fixture.userId });
    expect(confirmed.status).toBe("Confirmed");
    expect(confirmed.warehouseDocument).toBeTruthy();

    // Stock actually moved (the core fix — previously purchasing never touched inventory at all).
    const inventoryRow = await InventoryModel.findOne({ brand: fixture.brandId, warehouse: warehouseId, stockItem: stockItemId });
    expect(inventoryRow?.quantity).toBe(10);

    const warehouseDoc = await WarehouseDocumentModel.findById(confirmed.warehouseDocument);
    expect(warehouseDoc?.status).toBe("posted");
    expect(warehouseDoc?.transactionType).toBe("Purchase");

    // PO rolled up to FullyReceived from the GRN confirmation.
    const rolledUpPo = await PurchaseOrderModel.findById(po._id);
    expect(rolledUpPo?.status).toBe("FullyReceived");
    expect(rolledUpPo?.items[0].receivedQuantity).toBe(10);

    // 3. Purchase Invoice — bills against the PO/GRN, posts GL + AP ledger on creation (status defaults to Completed).
    const invoice = await purchaseInvoiceService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, supplier: supplierId, purchaseOrder: po._id, goodsReceiptNotes: [grn._id],
        supplierInvoiceNumber: "SUP-INV-001",
        items: [{
          itemId: stockItemId, quantity: 10, storageUnit: "kg", pricePerUnit: 20,
          lineSubtotal: 200, lineNetTotal: 200, warehouse: warehouseId,
        }],
        grossAmount: 200, netAmount: 200, balanceDue: 200,
      },
    });
    expect(invoice.invoiceNumber).toMatch(/^PUR-/);
    expect(invoice.status).toBe("Completed");
    expect(invoice.accountingPosted).toBe(true);
    expect(invoice.journalEntry).toBeTruthy();
    expect(invoice.balanceDue).toBe(200);
    expect(invoice.isFullyPaid).toBe(false);

    const journalEntry = await JournalEntryModel.findById(invoice.journalEntry);
    expect(journalEntry).toBeTruthy();

    const purchaseTxn = await SupplierTransactionModel.findOne({ brand: fixture.brandId, supplier: supplierId, transactionType: "Purchase" });
    expect(purchaseTxn).toBeTruthy();
    expect(purchaseTxn?.direction).toBe("Credit");
    expect(purchaseTxn?.amount).toBe(200);
    expect(purchaseTxn?.currentBalance).toBe(200);

    // 4. Supplier Payment — closes the AP loop.
    const paid = await purchaseInvoiceService.recordPayment({
      id: invoice._id, brand: fixture.brandId, branch: fixture.branchId,
      amount: 200, paymentMethod: paymentMethodId, actorId: fixture.userId,
    });
    expect(paid.balanceDue).toBe(0);
    expect(paid.isFullyPaid).toBe(true);

    const paymentTxn = await SupplierTransactionModel.findOne({ brand: fixture.brandId, supplier: supplierId, transactionType: "Payment" });
    expect(paymentTxn).toBeTruthy();
    expect(paymentTxn?.direction).toBe("Debit");
    expect(paymentTxn?.currentBalance).toBe(0);

    // Overpayment rejected.
    await expect(
      purchaseInvoiceService.recordPayment({ id: invoice._id, brand: fixture.brandId, branch: fixture.branchId, amount: 1, paymentMethod: paymentMethodId, actorId: fixture.userId }),
    ).rejects.toThrow(/already fully paid/i);
  });

  it("enforces the supplier credit limit when the policy is enabled", async () => {
    await PurchaseSettingsModel.updateOne({ brand: fixture.brandId, branch: fixture.branchId }, { $set: { enforceSupplierCreditLimit: true } });

    const lowLimitSupplier = await SupplierModel.create({
      brand: fixture.brandId, branch: fixture.branchId, type: "company", name: "Low Limit Supplier",
      code: "SUP-SCP-2", responsiblePerson: "Test", phone: ["01000000001"], paymentType: "Credit", creditLimit: 50,
      createdBy: fixture.userId,
    });

    await expect(
      purchaseInvoiceService.create({
        brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
        data: {
          branch: fixture.branchId, supplier: lowLimitSupplier._id, supplierInvoiceNumber: "SUP-INV-002",
          items: [{ itemId: stockItemId, quantity: 5, storageUnit: "kg", pricePerUnit: 20, lineSubtotal: 100, lineNetTotal: 100, warehouse: warehouseId }],
          grossAmount: 100, netAmount: 100, balanceDue: 100,
        },
      }),
    ).rejects.toThrow(/credit limit/i);

    await SupplierModel.deleteOne({ _id: lowLimitSupplier._id });
    await PurchaseSettingsModel.updateOne({ brand: fixture.brandId, branch: fixture.branchId }, { $set: { enforceSupplierCreditLimit: false } });
  });
});
