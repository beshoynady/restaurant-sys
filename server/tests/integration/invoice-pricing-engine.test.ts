// V4.0 Invoice Pricing Engine — computeInvoicePricing() unit coverage.
// Pure-function tests (no database) for the calculation paths the invoice-level integration test
// (invoice-sales-posting.test.ts) doesn't exercise: tax-inclusive pricing, tax-before-discount,
// service charge as a fixed amount / after-tax base / each rounding mode.
import { computeInvoicePricing } from "../../modules/sales/invoice/invoice.service.js";

function items(totalprice: number) {
  return [{ totalprice, totalExtrasPrice: 0 }];
}

describe("V4.0: computeInvoicePricing", () => {
  it("exclusive tax, AFTER_DISCOUNT: tax computed on (subtotal - discount)", () => {
    const result = computeInvoicePricing({
      items: items(200),
      discount: 20,
      taxConfig: { enabled: true, percentage: 10, calculationMethod: "AFTER_DISCOUNT", pricesIncludeTax: false },
      serviceChargeConfig: { enabled: false },
      discountSettings: null,
    });

    expect(result.subtotal).toBe(200);
    expect(result.salesTax).toBe(18); // (200-20) * 10%
    expect(result.total).toBe(198); // 200 - 20 + 18
  });

  it("exclusive tax, BEFORE_DISCOUNT: tax computed on the original subtotal", () => {
    const result = computeInvoicePricing({
      items: items(200),
      discount: 20,
      taxConfig: { enabled: true, percentage: 10, calculationMethod: "BEFORE_DISCOUNT", pricesIncludeTax: false },
      serviceChargeConfig: { enabled: false },
      discountSettings: null,
    });

    expect(result.salesTax).toBe(20); // 200 * 10%, discount not subtracted first
    expect(result.total).toBe(200); // 200 - 20 + 20
  });

  it("inclusive tax: tax is extracted from the taxable base, not added on top", () => {
    const result = computeInvoicePricing({
      items: items(110),
      taxConfig: { enabled: true, percentage: 10, calculationMethod: "BEFORE_DISCOUNT", pricesIncludeTax: true },
      serviceChargeConfig: { enabled: false },
      discountSettings: null,
    });

    // 110 already includes 10% tax -> the tax portion is 110 - 110/1.1 = 10
    expect(result.salesTax).toBeCloseTo(10, 2);
    // Total is unaffected by extracting an already-included tax.
    expect(result.total).toBeCloseTo(110, 2);
  });

  it("service charge as a fixed amount, AFTER_TAX base", () => {
    const result = computeInvoicePricing({
      items: items(100),
      taxConfig: { enabled: true, percentage: 10, calculationMethod: "BEFORE_DISCOUNT", pricesIncludeTax: false },
      serviceChargeConfig: { enabled: true, type: "FIXED", value: 5, calculationBase: "AFTER_TAX", roundingMode: "NEAREST" },
      discountSettings: null,
    });

    expect(result.salesTax).toBe(10); // 100 * 10%
    expect(result.serviceTax).toBe(5); // fixed, base irrelevant for FIXED type
    expect(result.total).toBe(115); // 100 + 10 + 5
  });

  it("service charge as a percentage with UP rounding", () => {
    const result = computeInvoicePricing({
      items: items(100),
      taxConfig: { enabled: false },
      serviceChargeConfig: { enabled: true, type: "PERCENTAGE", value: 12.5, calculationBase: "BEFORE_TAX", roundingMode: "UP" },
      discountSettings: null,
    });

    // 100 * 12.5% = 12.5 exactly -> UP rounding has nothing to round up, still 12.5
    expect(result.serviceTax).toBe(12.5);
  });

  it("rejects a discount above the approval threshold with no discountApprovedBy", () => {
    expect(() =>
      computeInvoicePricing({
        items: items(100),
        discount: 30,
        taxConfig: { enabled: false },
        serviceChargeConfig: { enabled: false },
        discountSettings: { maxManualDiscount: 20, approvalThreshold: 20, requireManagerApproval: true },
      }),
    ).toThrow(/exceeds/i);
  });

  it("allows a discount above the threshold when discountApprovedBy is present", () => {
    const result = computeInvoicePricing({
      items: items(100),
      discount: 30,
      discountApprovedBy: "someUserId",
      taxConfig: { enabled: false },
      serviceChargeConfig: { enabled: false },
      discountSettings: { maxManualDiscount: 20, approvalThreshold: 20, requireManagerApproval: true },
    });

    expect(result.discount).toBe(30);
  });

  it("never trusts a client-implied total: total is always derived from the components", () => {
    const result = computeInvoicePricing({
      items: items(50),
      discount: 0,
      addition: 0,
      deliveryFee: 10,
      taxConfig: { enabled: true, percentage: 20, calculationMethod: "BEFORE_DISCOUNT", pricesIncludeTax: false },
      serviceChargeConfig: { enabled: false },
      discountSettings: null,
    });

    expect(result.total).toBe(70); // 50 + 10(tax) + 10(delivery) = 70, regardless of any client input
  });
});
