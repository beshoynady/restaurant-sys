// Supply Chain & Commerce Platform V6.0 — Production Hardening. StockCategoryService was a
// hand-rolled class that never extended BaseRepository (create(data)/findAll(filter)/findById(id)
// signatures, incompatible with BaseController's calling convention) and its model had no
// isDeleted/deletedAt/deletedBy fields despite enableSoftDelete being turned on — a getAll() call
// would have silently matched zero documents. Both are fixed; this test proves the rebuilt service
// actually works end-to-end (create, list via getAll's default isDeleted:false filter, soft
// delete, restore) now that the router is mounted.
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import stockCategoryService from "../../modules/inventory/stock-category/stock-category.service.js";
import StockCategoryModel from "../../modules/inventory/stock-category/stock-category.model.js";

describe("Supply Chain V6.0: Stock Category Service (rebuilt on Repository Pattern)", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("stock-cat");
  });

  afterAll(async () => {
    await StockCategoryModel.deleteMany({ brand: fixture.brandId });
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("creates, lists (default isDeleted:false filter actually matches), soft-deletes, and restores a category", async () => {
    const category = await stockCategoryService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      createdBy: fixture.userId,
      data: {
        categoryName: new Map([["en", "Dairy"]]),
        categoryCode: "DAIRY1",
        description: new Map([["en", "Dairy products"]]),
      },
    });
    expect(category.categoryCode).toBe("DAIRY1");
    expect(category.isDeleted).toBe(false); // field now actually exists, not silently dropped

    const listed = await stockCategoryService.getAll({ brandId: fixture.brandId, limit: 100 });
    expect(listed.data.some((c: any) => String(c._id) === String(category._id))).toBe(true);

    await stockCategoryService.softDelete({ id: category._id, brandId: fixture.brandId, deletedBy: fixture.userId });
    const afterSoftDelete = await stockCategoryService.getAll({ brandId: fixture.brandId, limit: 100 });
    expect(afterSoftDelete.data.some((c: any) => String(c._id) === String(category._id))).toBe(false);

    await stockCategoryService.restore({ id: category._id, brandId: fixture.brandId });
    const restored = await StockCategoryModel.findById(category._id);
    expect(restored?.isDeleted).toBe(false);
  });
});
