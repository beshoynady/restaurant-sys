// ADR-001-SALES-PAYMENT-ARCHITECTURE.md Phase 2 — SalesReturn (Refund) aggregate.
// Verifies: an auto-approved (below-threshold) refund posts Step A (SALES_RETURN) + Step B
// (SALES_REFUND) in one transaction, marks the invoice line refunded, creates a CashTransaction,
// and posts two balanced journal entries; an above-threshold refund requires decisionBy
// (job-title-based) authorization, blocks an unauthorized approver, and orchestrates a
// PreparationReturn ticket for a kitchen-routed item; reject() releases the invoice-line claim;
// refunding the same line twice is rejected; idempotencyKey replay returns the original document;
// deferred settlement (approve now, settle later) transitions PARTIALLY_REFUNDED -> FULLY_REFUNDED.
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import {
  createBaseFixture, createAccountingPeriodFixture, createAccountingSettingsFixture,
  createInvoiceSettingsFixture, cleanupFixture, type TestFixture,
} from "./fixtures.js";
import invoiceService from "../../modules/sales/invoice/invoice.service.js";
import InvoiceModel from "../../modules/sales/invoice/invoice.model.js";
import salesReturnService from "../../modules/sales/sales-return/sales-return.service.js";
import SalesReturnModel from "../../modules/sales/sales-return/sales-return.model.js";
import SalesReturnSettingsModel from "../../modules/sales/rerturn-sales-settings/sales-return-settings.model.js";
import JournalEntryModel from "../../modules/accounting/journal-entry/journal-entry.model.js";
import JournalLineModel from "../../modules/accounting/journal-line/journal-line.model.js";
import CashTransactionModel from "../../modules/finance/cash-transaction/cash-transaction.model.js";
import PaymentMethodModel from "../../modules/payments/payment-method/payment-method.model.js";
import UserAccountModel from "../../modules/iam/user-account/user-account.model.js";
import EmployeeModel from "../../modules/hr/employee/employee.model.js";
import JobTitleModel from "../../modules/hr/job-title/job-title.model.js";
import DepartmentModel from "../../modules/hr/department/department.model.js";
import ProductModel from "../../modules/menu/product/product.model.js";
import MenuCategoryModel from "../../modules/menu/menu-category/menu-category.model.js";
import PreparationSectionModel from "../../modules/preparation/preparation-section/preparation-section.model.js";
import PreparationReturnModel from "../../modules/preparation/preparation-return/preparation-return.model.js";
import WarehouseModel from "../../modules/inventory/warehouse/warehouse.model.js";
import CashierShiftSettingsModel from "../../modules/finance/cashier-shift-settings/cashier-shift-settings.model.js";
import BranchModel from "../../modules/organization/branch/branch.model.js";

const runTag = Math.random().toString(36).slice(2, 8);

function invoiceLineItem(desiredSubtotal = 100, product: mongoose.Types.ObjectId | null = null) {
  return {
    orderItemId: new mongoose.Types.ObjectId(),
    product: product || new mongoose.Types.ObjectId(),
    quantity: 1,
    price: desiredSubtotal,
    priceAfterDiscount: desiredSubtotal,
    totalprice: desiredSubtotal - 1,
    totalExtrasPrice: 1,
  };
}

describe("ADR-001 Phase 2: SalesReturn (Refund) lifecycle", () => {
  let fixture: TestFixture;
  let cashMethod: { _id: mongoose.Types.ObjectId };
  let sectionProductId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture(`sret-${runTag}`);
    await createAccountingPeriodFixture(fixture, "sret", {
      startDate: new Date(Date.UTC(2020, 0, 1)),
      endDate: new Date(Date.UTC(2035, 11, 31)),
    });
    await createAccountingSettingsFixture(fixture, "sret");
    await createInvoiceSettingsFixture(fixture, {
      invoiceSequence: { prefix: "SRIN", startNumber: 1, padding: 4, includeDate: "NONE", separator: "-", resetPolicy: "NONE", currentNumber: 1 },
    });
    await CashierShiftSettingsModel.create({ brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId });
    cashMethod = await PaymentMethodModel.create({
      brand: fixture.brandId, branch: null, name: { en: "Cash" }, paymentCategory: "Cash",
      type: "CashRegister", reference: new mongoose.Types.ObjectId(), createdBy: fixture.userId,
    });

    // Auto-approve settings (low threshold not required — requireManagerApproval:false covers the
    // happy-path suite; a second, approval-required settings doc is created per-test below where
    // needed since SalesReturnSettings is unique per {brand,branch}).
    await SalesReturnSettingsModel.create({
      brand: fixture.brandId, branch: fixture.branchId, decisionBy: [],
      requireManagerApproval: false, createdBy: fixture.userId,
    });

    // A kitchen-routed product (Recipe-less is fine for these financial-only tests — orchestration
    // just needs a real preparationSection to prove a PreparationReturn ticket gets created).
    const warehouse = await WarehouseModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Main"]]),
      code: `WHSR${runTag}`, type: "main", description: new Map([["en", "test"]]), address: new Map([["en", "test"]]),
      createdBy: fixture.userId,
    });
    const section = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Grill"]]),
      code: `SEC${runTag}`, description: new Map([["en", "test"]]), stationType: "grill",
      warehouse: warehouse._id, createdBy: fixture.userId,
    });
    const category = await MenuCategoryModel.create({
      brand: fixture.brandId, name: new Map([["en", "Mains"]]), description: new Map([["en", "test"]]),
      displayOrder: 1, createdBy: fixture.userId,
    });
    const product = await ProductModel.create({
      brand: fixture.brandId, name: new Map([["en", "Burger"]]), description: new Map([["en", "test"]]),
      category: category._id, preparationSection: section._id, price: 100, createdBy: fixture.userId,
    });
    sectionProductId = product._id;
  });

  afterAll(async () => {
    await Promise.all([
      SalesReturnModel.deleteMany({ brand: fixture.brandId }),
      SalesReturnSettingsModel.deleteMany({ brand: fixture.brandId }),
      InvoiceModel.deleteMany({ brand: fixture.brandId }),
      CashTransactionModel.deleteMany({ brand: fixture.brandId }),
      PreparationReturnModel.deleteMany({ brand: fixture.brandId }),
      PreparationSectionModel.deleteMany({ brand: fixture.brandId }),
      ProductModel.deleteMany({ brand: fixture.brandId }),
      MenuCategoryModel.deleteMany({ brand: fixture.brandId }),
      WarehouseModel.deleteMany({ brand: fixture.brandId }),
      PaymentMethodModel.deleteMany({ brand: fixture.brandId }),
      CashierShiftSettingsModel.deleteMany({ brand: fixture.brandId }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  async function createTestInvoice(subtotal = 100, product: mongoose.Types.ObjectId | null = null) {
    return invoiceService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      createdBy: fixture.userId,
      data: {
        brand: fixture.brandId,
        branch: fixture.branchId,
        cashierShift: new mongoose.Types.ObjectId(),
        order: new mongoose.Types.ObjectId(),
        items: [invoiceLineItem(subtotal, product)],
      },
    });
  }

  it("auto-approved refund (below threshold): posts SALES_RETURN + SALES_REFUND, marks the invoice line refunded, creates a CashTransaction, orchestrates a PreparationReturn for a kitchen-routed item", async () => {
    const invoice = await createTestInvoice(100, sectionProductId);
    const itemId = invoice.items[0]._id;

    const salesReturn = await salesReturnService.requestRefund({
      brand: fixture.brandId, branch: fixture.branchId,
      originalInvoice: invoice._id, order: invoice.order,
      itemIds: [itemId], reason: "Wrong item",
      refundMethod: [{ method: cashMethod._id, amount: (invoice.items[0].totalprice + invoice.items[0].totalExtrasPrice) }],
      actorId: fixture.userId,
    });

    expect(salesReturn.refundStatus).toBe("FULLY_REFUNDED");
    expect(salesReturn.journalEntry).toBeTruthy();
    expect(salesReturn.reversalOfJournalEntry).toBeTruthy();

    const updatedInvoice = await InvoiceModel.findById(invoice._id).lean();
    expect(updatedInvoice!.items[0].refundedQuantity).toBe(1);

    const stepA = await JournalEntryModel.findById(salesReturn.journalEntry).lean();
    expect(stepA!.isBalanced).toBe(true);
    expect(stepA!.totalDebit).toBe(stepA!.totalCredit);
    const stepALines = await JournalLineModel.find({ journalEntry: salesReturn.journalEntry }).lean();
    expect(stepALines.some((l) => l.sourceType === "SALES_RETURN")).toBe(true);

    const stepB = await JournalEntryModel.findById(salesReturn.reversalOfJournalEntry).lean();
    expect(stepB!.isBalanced).toBe(true);
    const stepBLines = await JournalLineModel.find({ journalEntry: salesReturn.reversalOfJournalEntry }).lean();
    expect(stepBLines.some((l) => l.sourceType === "SALES_REFUND")).toBe(true);

    const cashTx = await CashTransactionModel.findOne({ description: new RegExp(salesReturn.serial) }).lean();
    expect(cashTx).toBeTruthy();
    expect(cashTx!.transactionType).toBe("REFUND");
    expect(cashTx!.direction).toBe("OUTFLOW");

    // Orchestration: the refunded item routes to a real preparationSection -> a PreparationReturn
    // ticket must exist, seeded with the safe WASTE default decision.
    const prepReturn = await PreparationReturnModel.findOne({ returnInvoice: salesReturn._id }).lean();
    expect(prepReturn).toBeTruthy();
    expect(prepReturn!.items[0].decision).toBe("WASTE");
  });

  it("rejects refunding the same invoice line twice", async () => {
    const invoice = await createTestInvoice(50, sectionProductId);
    const itemId = invoice.items[0]._id;

    await salesReturnService.requestRefund({
      brand: fixture.brandId, branch: fixture.branchId,
      originalInvoice: invoice._id, order: invoice.order,
      itemIds: [itemId], reason: "Wrong item",
      refundMethod: [{ method: cashMethod._id, amount: invoice.items[0].totalprice + invoice.items[0].totalExtrasPrice }],
      actorId: fixture.userId,
    });

    await expect(
      salesReturnService.requestRefund({
        brand: fixture.brandId, branch: fixture.branchId,
        originalInvoice: invoice._id, order: invoice.order,
        itemIds: [itemId], reason: "Trying again",
        actorId: fixture.userId,
      }),
    ).rejects.toThrow(/already been refunded/i);
  });

  it("idempotency: a retried request with the same idempotencyKey returns the original document, not a duplicate", async () => {
    const invoice = await createTestInvoice(60, sectionProductId);
    const itemId = invoice.items[0]._id;
    const idempotencyKey = `sret-retry-${runTag}`;

    const first = await salesReturnService.requestRefund({
      brand: fixture.brandId, branch: fixture.branchId,
      originalInvoice: invoice._id, order: invoice.order,
      itemIds: [itemId], reason: "Wrong item", idempotencyKey,
      actorId: fixture.userId,
    });

    const replay = await salesReturnService.requestRefund({
      brand: fixture.brandId, branch: fixture.branchId,
      originalInvoice: invoice._id, order: invoice.order,
      itemIds: [itemId], reason: "Wrong item", idempotencyKey,
      actorId: fixture.userId,
    });

    expect(String(replay._id)).toBe(String(first._id));
    const count = await SalesReturnModel.countDocuments({ originalInvoice: invoice._id, idempotencyKey });
    expect(count).toBe(1);
  });

  describe("approval-required path (decisionBy authorization)", () => {
    let approverUserId: string;
    let unauthorizedUserId: string;
    let secondBranchId: mongoose.Types.ObjectId;

    beforeAll(async () => {
      // A second, real Branch — SalesReturnSettings is unique per {brand,branch} and the outer
      // beforeAll already claimed fixture.branchId for the auto-approve happy-path suite.
      const secondBranch = await BranchModel.create({
        brand: fixture.brandId, name: new Map([["en", `SR Branch 2 ${runTag}`]]),
        slug: `sr-branch-2-${runTag}`.toLowerCase(),
      });
      secondBranchId = secondBranch._id;
      await createInvoiceSettingsFixture(fixture, {
        branch: secondBranchId,
        invoiceSequence: { prefix: "SRIN2", startNumber: 1, padding: 4, includeDate: "NONE", separator: "-", resetPolicy: "NONE", currentNumber: 1 },
      });
      await CashierShiftSettingsModel.create({ brand: fixture.brandId, branch: secondBranchId, createdBy: fixture.userId });

      const dept = await DepartmentModel.create({
        brand: fixture.brandId, name: new Map([["EN", "Ops SR"]]), slug: `ops-sr-${runTag}`, code: `OPSSR${runTag}`,
      });
      const managerTitle = await JobTitleModel.create({
        brand: fixture.brandId, department: dept._id, name: new Map([["EN", "Manager SR"]]),
        description: new Map([["EN", "desc"]]), responsibilities: new Map([["EN", "resp"]]), requirements: new Map([["EN", "req"]]),
      });
      const cashierTitle = await JobTitleModel.create({
        brand: fixture.brandId, department: dept._id, name: new Map([["EN", "Cashier SR"]]),
        description: new Map([["EN", "desc"]]), responsibilities: new Map([["EN", "resp"]]), requirements: new Map([["EN", "req"]]),
      });

      const managerEmployee = await EmployeeModel.create({
        brand: fixture.brandId, branches: [fixture.branchId], defaultBranch: fixture.branchId,
        firstName: new Map([["EN", "Mgr"]]), lastName: new Map([["EN", "SR"]]), gender: "male",
        dateOfBirth: new Date("1985-01-01"), nationalID: `NID-SR-M-${Date.now()}`,
        phone: `010${Date.now()}`.slice(0, 15), employeeCode: `EMPSRM${Date.now()}`.slice(0, 20),
        department: dept._id, jobTitle: managerTitle._id,
      });
      const cashierEmployee = await EmployeeModel.create({
        brand: fixture.brandId, branches: [fixture.branchId], defaultBranch: fixture.branchId,
        firstName: new Map([["EN", "Csh"]]), lastName: new Map([["EN", "SR"]]), gender: "male",
        dateOfBirth: new Date("1990-01-01"), nationalID: `NID-SR-C-${Date.now()}`,
        phone: `011${Date.now()}`.slice(0, 15), employeeCode: `EMPSRC${Date.now()}`.slice(0, 20),
        department: dept._id, jobTitle: cashierTitle._id,
      });

      const approverAccount = await UserAccountModel.create({
        brand: fixture.brandId, branch: secondBranchId, username: `sr_appr_${runTag}`.toLowerCase().slice(0, 30),
        password: "TestPassword123!", employee: managerEmployee._id,
      });
      approverUserId = String(approverAccount._id);

      const unauthorizedAccount = await UserAccountModel.create({
        brand: fixture.brandId, branch: secondBranchId, username: `sr_unauth_${runTag}`.toLowerCase().slice(0, 30),
        password: "TestPassword123!", employee: cashierEmployee._id,
      });
      unauthorizedUserId = String(unauthorizedAccount._id);

      await SalesReturnSettingsModel.create({
        brand: fixture.brandId, branch: secondBranchId, decisionBy: [managerTitle._id],
        requireManagerApproval: true, approvalThresholdAmount: 0, createdBy: fixture.userId,
      });
    });

    afterAll(async () => {
      await UserAccountModel.deleteMany({ username: { $in: [`sr_appr_${runTag}`, `sr_unauth_${runTag}`] } });
      await CashierShiftSettingsModel.deleteMany({ brand: fixture.brandId, branch: secondBranchId });
      await DepartmentModel.deleteMany({ brand: fixture.brandId });
      await JobTitleModel.deleteMany({ brand: fixture.brandId });
      await EmployeeModel.deleteMany({ brand: fixture.brandId });
    });

    it("leaves the return PENDING_APPROVAL, blocks an unauthorized approver, and lets an authorized decisionBy job-title approver post it", async () => {
      // secondBranchId's SalesReturnSettings (requireManagerApproval:true) resolves here instead
      // of the outer beforeAll's branch-specific auto-approve settings.
      const otherBranchInvoice = await invoiceService.create({
        brandId: fixture.brandId, branchId: secondBranchId, createdBy: fixture.userId,
        data: {
          brand: fixture.brandId, branch: secondBranchId, cashierShift: new mongoose.Types.ObjectId(),
          order: new mongoose.Types.ObjectId(), items: [invoiceLineItem(200)],
        },
      });

      const salesReturn = await salesReturnService.requestRefund({
        brand: fixture.brandId, branch: otherBranchInvoice.branch,
        originalInvoice: otherBranchInvoice._id, order: otherBranchInvoice.order,
        itemIds: [otherBranchInvoice.items[0]._id], reason: "Quality issue",
        actorId: fixture.userId,
      });
      expect(salesReturn.refundStatus).toBe("PENDING_APPROVAL");

      await expect(
        salesReturnService.approve({
          id: salesReturn._id, brand: fixture.brandId, branch: otherBranchInvoice.branch,
          actorId: unauthorizedUserId,
        }),
      ).rejects.toThrow(/not authorized/i);

      const approved = await salesReturnService.approve({
        id: salesReturn._id, brand: fixture.brandId, branch: otherBranchInvoice.branch,
        refundMethod: [{ method: cashMethod._id, amount: salesReturn.total }],
        actorId: approverUserId,
      });
      expect(approved.refundStatus).toBe("FULLY_REFUNDED");

      await InvoiceModel.deleteOne({ _id: otherBranchInvoice._id });
    });

    it("reject() releases the invoice-line claim so it can be refunded again, and settleRefund() supports deferred settlement", async () => {
      const invoice = await invoiceService.create({
        brandId: fixture.brandId, branchId: secondBranchId, createdBy: fixture.userId,
        data: {
          brand: fixture.brandId, branch: secondBranchId, cashierShift: new mongoose.Types.ObjectId(),
          order: new mongoose.Types.ObjectId(), items: [invoiceLineItem(30)],
        },
      });
      const itemId = invoice.items[0]._id;

      const first = await salesReturnService.requestRefund({
        brand: fixture.brandId, branch: secondBranchId,
        originalInvoice: invoice._id, order: invoice.order,
        itemIds: [itemId], reason: "Changed mind", actorId: fixture.userId,
      });
      expect(first.refundStatus).toBe("PENDING_APPROVAL");

      const afterRequest = await InvoiceModel.findById(invoice._id).lean();
      expect(afterRequest!.items[0].refundedQuantity).toBe(1);

      const rejected = await salesReturnService.reject({
        id: first._id, brand: fixture.brandId, branch: secondBranchId,
        reason: "Not eligible", actorId: approverUserId,
      });
      expect(rejected.refundStatus).toBe("REJECTED");

      const afterReject = await InvoiceModel.findById(invoice._id).lean();
      expect(afterReject!.items[0].refundedQuantity).toBe(0); // claim released

      // The same line can now be refunded again — proves the release was real, not just a status flip.
      const second = await salesReturnService.requestRefund({
        brand: fixture.brandId, branch: secondBranchId,
        originalInvoice: invoice._id, order: invoice.order,
        itemIds: [itemId], reason: "Retry", actorId: fixture.userId,
      });
      expect(second.refundStatus).toBe("PENDING_APPROVAL");

      // Deferred settlement: approve WITHOUT a refundMethod (Step A only) -> PARTIALLY_REFUNDED,
      // then settleRefund() later (Step B) -> FULLY_REFUNDED, mirroring PurchaseReturn's own
      // approve()/recordRefund() being two separate calls.
      const approvedOnly = await salesReturnService.approve({
        id: second._id, brand: fixture.brandId, branch: secondBranchId, actorId: approverUserId,
      });
      expect(approvedOnly.refundStatus).toBe("PARTIALLY_REFUNDED");
      expect(approvedOnly.journalEntry).toBeTruthy();
      expect(approvedOnly.reversalOfJournalEntry).toBeFalsy();

      const settled = await salesReturnService.settleRefund({
        id: second._id, brand: fixture.brandId, branch: secondBranchId,
        refundMethod: [{ method: cashMethod._id, amount: second.total }],
        actorId: approverUserId,
      });
      expect(settled.refundStatus).toBe("FULLY_REFUNDED");
      expect(settled.reversalOfJournalEntry).toBeTruthy();

      await InvoiceModel.deleteOne({ _id: invoice._id });
    });
  });
});
