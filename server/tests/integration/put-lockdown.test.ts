// Enterprise Order/Invoice Integrity — `PUT` lockdown. Confirmed by direct read (both models,
// both services) that neither `OrderService` nor `InvoiceService` ever overrode `beforeUpdate`,
// while both override `beforeCreate` with real business rules (order-number/serial generation,
// modifier validation, the full pricing/tax/GL-posting engine on Invoice). That meant the generic
// `PUT /orders/:id` / `PUT /invoice/:id` — wired straight to `BaseController.update` ->
// `BaseRepository.update`, whose only sanitization was a small hardcoded field list
// (`_id/__v/brand/createdAt/createdBy/deletedAt/deletedBy/isDeleted`) — could set `status` to any
// value with zero `transitionGuard` check, rewrite `items[]`/totals/tax with no re-validation, and
// on Invoice even repoint `journalEntry` at an unrelated GL entry, since Invoice has no dedicated
// transition endpoint at all to make bypassing even necessary.
//
// Fixed at the framework level: `BaseRepository` now accepts a `lockedUpdateFields` constructor
// option (a field named there is stripped from every `update()` payload, full stop — the only way
// to change it is through a dedicated service method). `OrderRepository` locks
// `status`/`paymentStatus`/`orderNum`/`items`; `InvoiceService` locks `serial`/`items`/`subtotal`/
// `discount`/`salesTax`/`serviceTax`/`total`/`taxInclusive`/`status`/`journalEntry`. This test
// proves the lock actually holds — a `PUT`-equivalent `update()` call carrying every one of these
// fields must leave the document completely unchanged on all of them, not just fail to error.
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, createInvoiceSettingsFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import orderService from "../../modules/sales/order/order.service.js";
import OrderModel from "../../modules/sales/order/order.model.js";
import invoiceService from "../../modules/sales/invoice/invoice.service.js";
import InvoiceModel from "../../modules/sales/invoice/invoice.model.js";

// invoice.model.js requires totalExtrasPrice >= 1 — same split used in invoice-sales-posting.test.ts.
function invoiceLineItem(desiredSubtotal = 100) {
  return {
    orderItemId: new mongoose.Types.ObjectId(),
    product: new mongoose.Types.ObjectId(),
    quantity: 1,
    price: desiredSubtotal,
    priceAfterDiscount: desiredSubtotal,
    totalprice: desiredSubtotal - 1,
    totalExtrasPrice: 1,
  };
}

const runTag = Math.random().toString(36).slice(2, 8);

describe("PUT lockdown: generic update() can no longer bypass Order/Invoice business rules", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture(`put-lock-${runTag}`);
  });

  afterAll(async () => {
    await OrderModel.deleteMany({ brand: fixture.brandId });
    await InvoiceModel.deleteMany({ brand: fixture.brandId });
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("Order: a generic update() cannot change status, paymentStatus, orderNum, or items", async () => {
    const productId = new mongoose.Types.ObjectId();
    const originalItemId = new mongoose.Types.ObjectId();
    const order = await OrderModel.create({
      brand: fixture.brandId,
      branch: fixture.branchId,
      orderNum: "PL-1",
      cashierShift: new mongoose.Types.ObjectId(),
      orderType: "DINE_IN",
      deliveryPolicy: "IMMEDIATE",
      status: "OPEN",
      paymentStatus: "UNPAID",
      items: [{ _id: originalItemId, product: productId, unitPrice: 10, finalPrice: 10 }],
    });

    const updated = await orderService.update({
      id: String(order._id),
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      data: {
        status: "CLOSED", // would bypass transitionGuard entirely if it went through
        paymentStatus: "PAID",
        orderNum: "STOLEN-NUMBER",
        items: [{ product: new mongoose.Types.ObjectId(), unitPrice: 0.01, finalPrice: 0.01 }],
      },
    });

    expect(updated.status).toBe("OPEN");
    expect(updated.paymentStatus).toBe("UNPAID");
    expect(updated.orderNum).toBe("PL-1");
    expect((updated.items as any).length).toBe(1);
    expect(String((updated.items as any)[0]._id)).toBe(String(originalItemId));
    expect((updated.items as any)[0].unitPrice).toBe(10);
  });

  it("Order: a field NOT on the lock list still updates normally through the same path", async () => {
    const order = await OrderModel.create({
      brand: fixture.brandId,
      branch: fixture.branchId,
      orderNum: "PL-2",
      cashierShift: new mongoose.Types.ObjectId(),
      orderType: "DINE_IN",
      deliveryPolicy: "IMMEDIATE",
      items: [{ product: new mongoose.Types.ObjectId(), unitPrice: 10, finalPrice: 10 }],
    });

    const updated = await orderService.update({
      id: String(order._id),
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      data: { isActive: false },
    });

    expect(updated.isActive).toBe(false);
  });

  it("Invoice: a generic update() cannot change status, totals, tax, or journalEntry", async () => {
    await createInvoiceSettingsFixture(fixture, {
      invoiceSequence: { prefix: "PLST", startNumber: 1, padding: 4, includeDate: "NONE", separator: "-", resetPolicy: "NONE", currentNumber: 1 },
    });

    const invoice = await invoiceService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      createdBy: fixture.userId,
      data: {
        brand: fixture.brandId,
        branch: fixture.branchId,
        cashierShift: new mongoose.Types.ObjectId(),
        order: new mongoose.Types.ObjectId(),
        items: [invoiceLineItem(100)],
      },
    });
    // No AccountingSettings configured in this fixture -> posting was skipped (best-effort), so
    // this asserts the pre-lockdown baseline honestly instead of assuming a journal entry exists.
    expect(invoice.journalEntry).toBeFalsy();

    const fakeJournalEntryId = new mongoose.Types.ObjectId();
    const updated = await invoiceService.update({
      id: String(invoice._id),
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      data: {
        status: "PAID",
        subtotal: 1,
        discount: 999,
        salesTax: 999,
        serviceTax: 999,
        total: 0.01,
        taxInclusive: true,
        journalEntry: fakeJournalEntryId,
        items: [invoiceLineItem(5)],
      },
    });

    expect(updated.status).toBe("OPEN");
    expect(updated.subtotal).toBe(100);
    expect(updated.discount).toBe(0);
    expect(updated.total).toBe(invoice.total);
    expect(updated.taxInclusive).toBe(false);
    expect(updated.journalEntry).toBeFalsy();
    expect((updated.items as any).length).toBe(1);
    expect((updated.items as any)[0].totalprice + (updated.items as any)[0].totalExtrasPrice).toBe(100);
  });

  it("Invoice: a field NOT on the lock list still updates normally through the same path", async () => {
    const invoice = await invoiceService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      createdBy: fixture.userId,
      data: {
        brand: fixture.brandId,
        branch: fixture.branchId,
        cashierShift: new mongoose.Types.ObjectId(),
        order: new mongoose.Types.ObjectId(),
        items: [invoiceLineItem(20)],
      },
    });

    const someEmployeeId = new mongoose.Types.ObjectId();
    const updated = await invoiceService.update({
      id: String(invoice._id),
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      data: { paidBy: someEmployeeId },
    });

    expect(String(updated.paidBy)).toBe(String(someEmployeeId));
  });
});
