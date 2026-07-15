// Enterprise Order Management Platform — OrderSettings wiring. Confirmed, by direct read, that
// `OrderSettings.cancelReasonRequired` and `.requireManagerApprovalForCancel` were real,
// well-designed fields with zero code anywhere reading them — the same "designed but dead" pattern
// this engagement has repeatedly found and closed elsewhere. Also confirmed a real, previously
// undiscovered systemic bug while wiring this in: `Role.permissions[]` is a fixed Mongoose
// sub-schema (create/read/update/delete/viewReports/approve/reject/reverse only) that silently
// strips any undeclared action field on save — so a manager-approval check MUST be built against
// one of those real fields (`approve`), never a fabricated action name.
import mongoose from "mongoose";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import orderService from "../../modules/sales/order/order.service.js";
import OrderModel from "../../modules/sales/order/order.model.js";
import OrderSettingsModel from "../../modules/sales/order-settings/order-settings.model.js";
import PreparationSectionModel from "../../modules/preparation/preparation-section/preparation-section.model.js";
import ProductModel from "../../modules/menu/product/product.model.js";
import MenuCategoryModel from "../../modules/menu/menu-category/menu-category.model.js";
import RoleModel from "../../modules/iam/role/role.model.js";
import UserAccountModel from "../../modules/iam/user-account/user-account.model.js";

describe("Enterprise Order Management Platform: OrderSettings-driven Item Cancel", () => {
  let fixture: TestFixture;
  let burgerProductId: string;
  let cashierShiftId: string;
  let managerUserId: string;
  let nonManagerUserId: string;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("cancel-settings");

    const grillSection = await PreparationSectionModel.create({
      brand: fixture.brandId, branch: fixture.branchId, name: new Map([["en", "Grill"]]),
      code: "GRILL-CS", description: new Map([["en", "test"]]), stationType: "grill", createdBy: fixture.userId,
    });
    const category = await MenuCategoryModel.create({
      brand: fixture.brandId, name: new Map([["en", "CS"]]), description: new Map([["en", "test"]]),
      displayOrder: 1, createdBy: fixture.userId,
    });
    const burgerProduct = await ProductModel.create({
      brand: fixture.brandId, name: new Map([["en", "Burger"]]), description: new Map([["en", "test"]]),
      category: category._id, preparationSection: grillSection._id, price: 10, createdBy: fixture.userId,
    });
    burgerProductId = String(burgerProduct._id);

    // Settings: reason NOT required, manager approval IS required.
    await OrderSettingsModel.create({
      brand: fixture.brandId, branch: fixture.branchId, createdBy: fixture.userId,
      cancelReasonRequired: false, requireManagerApprovalForCancel: true,
      orderSequence: { prefix: "CS-", currentNumber: 1, resetDaily: false },
    });

    const managerRole = await RoleModel.create({
      brand: fixture.brandId, name: new Map([["en", "Manager"]]), description: new Map([["en", "test"]]),
      permissions: [{ resource: "Orders", update: true, approve: true }],
      createdBy: fixture.userId,
    });
    const nonManagerRole = await RoleModel.create({
      brand: fixture.brandId, name: new Map([["en", "Cashier"]]), description: new Map([["en", "test"]]),
      permissions: [{ resource: "Orders", update: true, approve: false }],
      createdBy: fixture.userId,
    });

    const managerUser = await UserAccountModel.create({
      brand: fixture.brandId, branch: fixture.branchId, username: "manager-cs",
      password: "TestPassword123!", role: managerRole._id,
    });
    managerUserId = String(managerUser._id);
    const nonManagerUser = await UserAccountModel.create({
      brand: fixture.brandId, branch: fixture.branchId, username: "cashier-cs",
      password: "TestPassword123!", role: nonManagerRole._id,
    });
    nonManagerUserId = String(nonManagerUser._id);

    cashierShiftId = String(new mongoose.Types.ObjectId());
  });

  afterAll(async () => {
    await Promise.all([
      OrderModel.deleteMany({ brand: fixture.brandId }),
      PreparationSectionModel.deleteMany({ brand: fixture.brandId }),
      ProductModel.deleteMany({ brand: fixture.brandId }),
      MenuCategoryModel.deleteMany({ brand: fixture.brandId }),
      OrderSettingsModel.deleteMany({ brand: fixture.brandId }),
      RoleModel.deleteMany({ brand: fixture.brandId }),
      UserAccountModel.deleteMany({ brand: fixture.brandId, username: { $in: ["manager-cs", "cashier-cs"] } }),
    ]);
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  async function makeOrder(orderNum: string) {
    const order = await OrderModel.create({
      brand: fixture.brandId, branch: fixture.branchId, orderNum,
      cashierShift: cashierShiftId, orderType: "DINE_IN", deliveryPolicy: "IMMEDIATE",
      items: [{ product: burgerProductId, unitPrice: 10, finalPrice: 10 }],
    });
    return { order, itemId: String((order.items as any)[0]._id) };
  }

  it("rejects a cancel with no manager approval when the setting requires one", async () => {
    const { order, itemId } = await makeOrder("CS-1");
    await expect(
      orderService.cancelItem({
        orderId: String(order._id), itemId, brand: fixture.brandId, branch: fixture.branchId,
        actorId: nonManagerUserId,
      }),
    ).rejects.toThrow(/manager approval is required/i);
  });

  it("rejects a cancel whose approver does NOT hold the Orders.approve permission", async () => {
    const { order, itemId } = await makeOrder("CS-2");
    await expect(
      orderService.cancelItem({
        orderId: String(order._id), itemId, brand: fixture.brandId, branch: fixture.branchId,
        actorId: nonManagerUserId, managerApprovalBy: nonManagerUserId,
      }),
    ).rejects.toThrow(/does not hold permission/i);
  });

  it("succeeds with no reason (cancelReasonRequired: false) when a real manager approves", async () => {
    const { order, itemId } = await makeOrder("CS-3");
    const updated = await orderService.cancelItem({
      orderId: String(order._id), itemId, brand: fixture.brandId, branch: fixture.branchId,
      actorId: nonManagerUserId, managerApprovalBy: managerUserId,
    });
    const item = (updated.items as any).id(itemId);
    expect(item.status).toBe("CANCELLED");
    expect(item.cancelReason).toBeNull();
    expect(String(item.managerApprovalBy)).toBe(managerUserId);
  });
});
