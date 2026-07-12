// DATABASE_IMPLEMENTATION_PLAN.md DB-007 — concurrent order creation.
// Verifies that N concurrent calls to the atomic order-number generator (exercised via
// orderService.beforeCreate, the exact integration point real order creation goes through)
// produce N distinct, collision-free order numbers — the guarantee DB-007 exists to provide.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, createOrderSettingsFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import orderService from "../../modules/sales/order/order.service.js";

describe("DB-007: concurrent order creation", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("order-concurrency");
    await createOrderSettingsFixture(fixture);
  });

  afterAll(async () => {
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("assigns a unique, sequential orderNum to every concurrent order-creation request", async () => {
    const CONCURRENT_REQUESTS = 25;

    const results = await Promise.all(
      Array.from({ length: CONCURRENT_REQUESTS }, () =>
        orderService.beforeCreate({ brand: fixture.brandId, branch: fixture.branchId }),
      ),
    );

    const orderNums = results.map((r) => r.orderNum as string);
    const uniqueOrderNums = new Set(orderNums);

    expect(orderNums).toHaveLength(CONCURRENT_REQUESTS);
    expect(uniqueOrderNums.size).toBe(CONCURRENT_REQUESTS); // no collisions under concurrency

    const numericSuffixes = orderNums
      .map((n) => Number(n.replace("TST-", "")))
      .sort((a, b) => a - b);
    expect(numericSuffixes).toEqual(
      Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => i + 1),
    ); // exactly 1..N, no gaps, no duplicates
  });
});
