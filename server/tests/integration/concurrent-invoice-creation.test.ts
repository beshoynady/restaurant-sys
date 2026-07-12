// DATABASE_IMPLEMENTATION_PLAN.md DB-007 — concurrent invoice creation.
// Mirrors concurrent-order-creation.test.ts for invoiceService.beforeCreate / the invoice-serial
// generator, which has the added complexity of prefix+padding+separator formatting.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, createInvoiceSettingsFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import invoiceService from "../../modules/sales/invoice/invoice.service.js";

describe("DB-007: concurrent invoice creation", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("invoice-concurrency");
    await createInvoiceSettingsFixture(fixture);
  });

  afterAll(async () => {
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("assigns a unique, sequential serial to every concurrent invoice-creation request", async () => {
    const CONCURRENT_REQUESTS = 25;

    const results = await Promise.all(
      Array.from({ length: CONCURRENT_REQUESTS }, () =>
        invoiceService.beforeCreate({ brand: fixture.brandId, branch: fixture.branchId }),
      ),
    );

    const serials = results.map((r) => r.serial as string);
    const uniqueSerials = new Set(serials);

    expect(serials).toHaveLength(CONCURRENT_REQUESTS);
    expect(uniqueSerials.size).toBe(CONCURRENT_REQUESTS); // no collisions under concurrency

    const numericSuffixes = serials
      .map((s) => Number(s.replace("TST-", "")))
      .sort((a, b) => a - b);
    expect(numericSuffixes).toEqual(
      Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => i + 1),
    ); // exactly 1..N, no gaps, no duplicates
  });
});
