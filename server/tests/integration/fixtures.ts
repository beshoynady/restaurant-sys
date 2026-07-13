// Shared test fixtures for the DB-007/DB-010/DB-014 integration tests. Creates the minimum valid
// document graph (Brand -> Branch -> UserAccount, Account, AccountingPeriod, OrderSettings,
// InvoiceSettings) each test needs, scoped to a caller-supplied unique suffix so parallel test
// files never collide, and provides a matching cleanup helper.
import mongoose from "mongoose";
import BrandModel from "../../modules/organization/brand/brand.model.js";
import BranchModel from "../../modules/organization/branch/branch.model.js";
import UserAccountModel from "../../modules/iam/user-account/user-account.model.js";
import AccountModel from "../../modules/accounting/account/account.model.js";
import AccountingPeriodModel from "../../modules/accounting/accounting-period/accounting-period.model.js";
import OrderSettingsModel from "../../modules/sales/order-settings/order-settings.model.js";
import InvoiceSettingsModel from "../../modules/sales/invoice-settings/invoice-settings.model.js";
import DiningAreaModel from "../../modules/seating/dining-area/dining-area.model.js";
import TableModel from "../../modules/seating/table/table.model.js";
import ReservationModel from "../../modules/seating/reservation/reservation.model.js";

export interface TestFixture {
  brandId: string;
  branchId: string;
  userId: string;
}

export async function createBaseFixture(suffix: string): Promise<TestFixture> {
  // Brand.owner is required (see brand.model.js), but the owner UserAccount
  // doesn't exist yet at this point and UserAccount itself requires
  // `brand` — the same circular reference system-setup/setup.service.js
  // resolves by saving Brand once without validation, then setting `owner`
  // once the UserAccount exists.
  const [brand] = await BrandModel.create(
    [
      {
        name: new Map([["en", `Test Brand ${suffix}`]]),
        slug: `test-brand-${suffix}`.toLowerCase(),
        legalName: `Test Brand Legal Name ${suffix}`,
      },
    ],
    { validateBeforeSave: false },
  );

  const branch = await BranchModel.create({
    brand: brand._id,
    name: new Map([["en", `Test Branch ${suffix}`]]),
    slug: `test-branch-${suffix}`.toLowerCase(),
  });

  const user = await UserAccountModel.create({
    brand: brand._id,
    branch: branch._id,
    username: `test_user_${suffix}`.toLowerCase(),
    password: "TestPassword123!",
  });

  brand.owner = user._id;
  await brand.save();

  return {
    brandId: String(brand._id),
    branchId: String(branch._id),
    userId: String(user._id),
  };
}

export async function createOrderSettingsFixture(
  fixture: TestFixture,
  overrides: Record<string, unknown> = {},
) {
  return OrderSettingsModel.create({
    brand: fixture.brandId,
    branch: fixture.branchId,
    createdBy: fixture.userId,
    orderSequence: { prefix: "TST-", currentNumber: 1, resetDaily: false },
    ...overrides,
  });
}

export async function createInvoiceSettingsFixture(
  fixture: TestFixture,
  overrides: Record<string, unknown> = {},
) {
  return InvoiceSettingsModel.create({
    brand: fixture.brandId,
    branch: fixture.branchId,
    createdBy: fixture.userId,
    invoiceSequence: {
      prefix: "TST",
      startNumber: 1,
      padding: 4,
      includeDate: "NONE",
      separator: "-",
      resetPolicy: "NONE",
      currentNumber: 1,
    },
    ...overrides,
  });
}

export async function createAccountFixture(fixture: TestFixture, code: string, category: string) {
  return AccountModel.create({
    brand: fixture.brandId,
    code,
    name: new Map([["en", `Test Account ${code}`]]),
    category,
    normalBalance: category === "Asset" || category === "Expense" ? "Debit" : "Credit",
  });
}

export async function createAccountingPeriodFixture(
  fixture: TestFixture,
  suffix: string,
  overrides: Record<string, unknown> = {},
) {
  return AccountingPeriodModel.create({
    brand: fixture.brandId,
    name: new Map([["en", `Test Period ${suffix}`]]),
    code: `TP-${suffix}`.toUpperCase(),
    startDate: new Date(Date.UTC(2026, 0, 1)),
    endDate: new Date(Date.UTC(2026, 0, 31)),
    createdBy: fixture.userId,
    ...overrides,
  });
}

export async function createDiningAreaFixture(fixture: TestFixture, suffix: string) {
  return DiningAreaModel.create({
    brand: fixture.brandId,
    branch: fixture.branchId,
    name: new Map([["en", `Test Dining Area ${suffix}`]]),
    code: `DA-${suffix}`.toUpperCase(),
    createdBy: fixture.userId,
  });
}

export async function createTableFixture(
  fixture: TestFixture,
  diningAreaId: string,
  suffix: string,
) {
  return TableModel.create({
    brand: fixture.brandId,
    branch: fixture.branchId,
    diningArea: diningAreaId,
    tableNumber: `T-${suffix}`,
    tableCode: `T-${suffix}`.toUpperCase(),
    maxCapacity: 4,
    createdBy: fixture.userId,
  });
}

export async function cleanupFixture(fixture: TestFixture): Promise<void> {
  const brandId = new mongoose.Types.ObjectId(fixture.brandId);
  await Promise.all([
    BrandModel.deleteMany({ _id: brandId }),
    BranchModel.deleteMany({ brand: brandId }),
    UserAccountModel.deleteMany({ brand: brandId }),
    AccountModel.deleteMany({ brand: brandId }),
    AccountingPeriodModel.deleteMany({ brand: brandId }),
    OrderSettingsModel.deleteMany({ brand: brandId }),
    InvoiceSettingsModel.deleteMany({ brand: brandId }),
    DiningAreaModel.deleteMany({ brand: brandId }),
    TableModel.deleteMany({ brand: brandId }),
    ReservationModel.deleteMany({ brand: brandId }),
  ]);
}
