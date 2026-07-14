// IAM Platform Redesign — user-account.service.js create/update/delete calling-convention fix.
// Verifies: creating a UserAccount via the service actually persists (previously threw a Mongoose
// validation error because `super.create(data, user)` didn't match BaseRepository's object-based
// signature); the password is hashed, not stored in plaintext; update re-hashes on password
// change; a user cannot hard/soft delete themselves; hardDelete's self-delete guard actually
// receives an actor id (previously would have thrown TypeError reading `.toString()` of
// `undefined`, since BaseController's default hardDelete handler never passed one).
import bcrypt from "bcryptjs";
import { connectTestDb, disconnectTestDb } from "./setup.js";
import { createBaseFixture, cleanupFixture, type TestFixture } from "./fixtures.js";
import userAccountService from "../../modules/iam/user-account/user-account.service.js";
import UserAccountModel from "../../modules/iam/user-account/user-account.model.js";

describe("IAM: user-account create/update/delete", () => {
  let fixture: TestFixture;

  beforeAll(async () => {
    await connectTestDb();
    fixture = await createBaseFixture("iam-useracct");
  });

  afterAll(async () => {
    await UserAccountModel.deleteMany({ brand: fixture.brandId });
    await cleanupFixture(fixture);
    await disconnectTestDb();
  });

  it("creates a user account with a hashed password (previously threw a validation error)", async () => {
    const created = await userAccountService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      createdBy: fixture.userId,
      data: {
        username: "cashier_one",
        email: "cashier1@example.com",
        password: "PlainTextPass123!",
      },
    });

    expect(created).toBeTruthy();
    expect(created.brand.toString()).toBe(fixture.brandId);
    expect(created.username).toBe("cashier_one");

    const persisted = await UserAccountModel.findById(created._id).select("+password");
    expect(persisted).toBeTruthy();
    expect(persisted!.password).not.toBe("PlainTextPass123!");
    expect(await bcrypt.compare("PlainTextPass123!", persisted!.password)).toBe(true);
  });

  it("rejects a duplicate email within the same brand", async () => {
    await userAccountService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      createdBy: fixture.userId,
      data: { username: "dup_user_a", email: "dup@example.com", password: "Password123!" },
    });

    await expect(
      userAccountService.create({
        brandId: fixture.brandId,
        branchId: fixture.branchId,
        createdBy: fixture.userId,
        data: { username: "dup_user_b", email: "dup@example.com", password: "Password123!" },
      }),
    ).rejects.toThrow(/email already exists/i);
  });

  it("re-hashes the password on update", async () => {
    const user = await userAccountService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      createdBy: fixture.userId,
      data: { username: "update_target", password: "OldPassword123!" },
    });

    await userAccountService.update({
      id: String(user._id),
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      updatedBy: fixture.userId,
      data: { password: "NewPassword456!" },
    });

    const persisted = await UserAccountModel.findById(user._id).select("+password");
    expect(await bcrypt.compare("NewPassword456!", persisted!.password)).toBe(true);
    expect(await bcrypt.compare("OldPassword123!", persisted!.password)).toBe(false);
  });

  it("rejects hardDelete when the actor targets their own account", async () => {
    const user = await userAccountService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      createdBy: fixture.userId,
      data: { username: "self_delete_hard", password: "Password123!" },
    });

    await expect(
      userAccountService.hardDelete({
        id: String(user._id),
        brandId: fixture.brandId,
        branchId: fixture.branchId,
        actorId: String(user._id),
      }),
    ).rejects.toThrow(/cannot delete yourself/i);

    const stillExists = await UserAccountModel.findById(user._id);
    expect(stillExists).toBeTruthy();
  });

  it("rejects softDelete when the actor targets their own account, allows it otherwise", async () => {
    const user = await userAccountService.create({
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      createdBy: fixture.userId,
      data: { username: "self_delete_soft", password: "Password123!" },
    });

    await expect(
      userAccountService.softDelete({
        id: String(user._id),
        brandId: fixture.brandId,
        branchId: fixture.branchId,
        deletedBy: String(user._id),
      }),
    ).rejects.toThrow(/cannot delete yourself/i);

    const softDeleted = await userAccountService.softDelete({
      id: String(user._id),
      brandId: fixture.brandId,
      branchId: fixture.branchId,
      deletedBy: fixture.userId,
    });

    expect(softDeleted).toBeTruthy();
    const persisted = await UserAccountModel.findById(user._id);
    expect(persisted!.isDeleted).toBe(true);
  });
});
