// Supply Chain & Commerce Platform V5.1 — Vendor Accounting Platform (read-side reporting over
// SupplierTransaction/PurchaseInvoice). Verifies vendor statement, open payables, aging buckets,
// balance reconciliation, and credit-limit status all compute correctly from the real ledger.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, createWarehouseFixture, createStockItemFixture, type TestFixture } from "./fixtures.js";
import SupplierModel from "../../modules/purchasing/supplier/supplier.model.js";
import PurchaseSettingsModel from "../../modules/purchasing/purchasing-settings/purchase-settings.model.js";
import purchaseInvoiceService from "../../modules/purchasing/purchase-invoice/purchase-invoice.service.js";
import vendorLedgerService from "../../modules/purchasing/vendor-ledger/vendor-ledger.service.js";
import PurchaseInvoiceModel from "../../modules/purchasing/purchase-invoice/purchase-invoice.model.js";
import SupplierTransactionModel from "../../modules/purchasing/supplier-transaction/supplier-transaction.model.js";
import AccountModel from "../../modules/accounting/account/account.model.js";
import CashRegisterModel from "../../modules/finance/cash-register/cash-register.model.js";
import PaymentMethodModel from "../../modules/payments/payment-method/payment-method.model.js";

describe("Supply Chain V5.1: Vendor Accounting Platform (Vendor Ledger)", () => {
  let fixture: TestFixture;
  let warehouseId: string;
  let stockItemId: string;
  let supplierId: string;
  let paymentMethodId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("vendor-ledger");

    const warehouse = await createWarehouseFixture(fixture, "vl");
    warehouseId = String(warehouse._id);
    const stockItem = await createStockItemFixture(fixture, "vl", "WeightedAverage");
    stockItemId = String(stockItem._id);

    const supplier = await SupplierModel.create({
      brand: fixture.brandId, branch: fixture.branchId, type: "company", name: "Vendor Ledger Supplier",
      code: "SUP-VL", responsiblePerson: "Test", phone: ["01000000003"], paymentType: "Credit", creditLimit: 1000,
      createdBy: fixture.userId,
    });
    supplierId = String(supplier._id);

    await PurchaseSettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });

    const cashAccount = await AccountModel.create({
      brand: fixture.brandId, code: "CASHREG-VL", name: new Map([["en", "Cash Register VL"]]), category: "Asset", normalBalance: "Debit",
    });
    const cashRegister = await CashRegisterModel.create({
      brand: fixture.brandId, branch: fixture.branchId, type: "SUSPENSE", code: "REG-VL",
      name: new Map([["en", "VL Register"]]), accountId: cashAccount._id, currency: "EGP", createdBy: fixture.userId,
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
      SupplierTransactionModel.deleteMany({ brand: fixture.brandId }),
      SupplierModel.deleteMany({ brand: fixture.brandId }),
      PurchaseSettingsModel.deleteMany({ brand: fixture.brandId }),
      CashRegisterModel.deleteMany({ brand: fixture.brandId }),
      PaymentMethodModel.deleteMany({ brand: fixture.brandId }),
      AccountModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("builds a vendor statement, open payables list, aging buckets, and a reconciled/credit-limit report", async () => {
    // Overdue invoice (due 40 days ago -> 31-60 bucket).
    const overdueDue = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    const invoice1 = await purchaseInvoiceService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, supplier: supplierId, supplierInvoiceNumber: "VL-001", paymentDueDate: overdueDue,
        items: [{ itemId: stockItemId, quantity: 10, storageUnit: "kg", pricePerUnit: 30, lineSubtotal: 300, lineNetTotal: 300, warehouse: warehouseId }],
        grossAmount: 300, netAmount: 300, balanceDue: 300,
      },
    });

    // Current (not-yet-due) invoice.
    const futureDue = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const invoice2 = await purchaseInvoiceService.create({
      brandId: fixture.brandId, branchId: fixture.branchId, createdBy: fixture.userId,
      data: {
        branch: fixture.branchId, supplier: supplierId, supplierInvoiceNumber: "VL-002", paymentDueDate: futureDue,
        items: [{ itemId: stockItemId, quantity: 5, storageUnit: "kg", pricePerUnit: 40, lineSubtotal: 200, lineNetTotal: 200, warehouse: warehouseId }],
        grossAmount: 200, netAmount: 200, balanceDue: 200,
      },
    });

    // Vendor statement: two Purchase transactions, chronological, closing balance = 500.
    const statement = await vendorLedgerService.getVendorStatement({ brand: fixture.brandId, supplier: supplierId });
    expect(statement.transactions).toHaveLength(2);
    expect(statement.openingBalance).toBe(0);
    expect(statement.closingBalance).toBe(500);

    // Open payables: both invoices, totaling 500.
    const openPayables = await vendorLedgerService.getOpenPayables({ brand: fixture.brandId, branch: fixture.branchId });
    expect(openPayables).toHaveLength(2);
    expect(openPayables.reduce((s: number, i: any) => s + i.balanceDue, 0)).toBe(500);

    // Aging: invoice1 (40 days overdue) -> days31to60; invoice2 (not due yet) -> current.
    const aging = await vendorLedgerService.getAgingAnalysis({ brand: fixture.brandId, branch: fixture.branchId });
    expect(aging.buckets.days31to60).toBe(300);
    expect(aging.buckets.current).toBe(200);
    expect(aging.totalOutstanding).toBe(500);

    // Reconciliation: ledger balance (500) must match sum of open invoice balances (500).
    const reconciliation = await vendorLedgerService.reconcileSupplierBalance({ brand: fixture.brandId, supplier: supplierId });
    expect(reconciliation.reconciled).toBe(true);
    expect(reconciliation.ledgerBalance).toBe(500);

    // Credit limit: 500 of 1000 used -> 50% utilization, not over limit.
    const creditStatus = await vendorLedgerService.getCreditLimitStatus({ brand: fixture.brandId, supplier: supplierId });
    expect(creditStatus.utilizationPct).toBe(50);
    expect(creditStatus.overLimit).toBe(false);
    expect(creditStatus.availableCredit).toBe(500);

    // Now pay off invoice1 fully — reconciliation must still hold, ledger balance drops to 200.
    await purchaseInvoiceService.recordPayment({
      id: invoice1._id, brand: fixture.brandId, branch: fixture.branchId, amount: 300,
      paymentMethod: paymentMethodId, actorId: fixture.userId,
    });

    const balanceAfterPayment = await vendorLedgerService.reconcileSupplierBalance({ brand: fixture.brandId, supplier: supplierId });
    expect(balanceAfterPayment.reconciled).toBe(true);
    expect(balanceAfterPayment.ledgerBalance).toBe(200);
  });
});
