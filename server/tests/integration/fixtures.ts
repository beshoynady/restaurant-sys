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

export interface TestFixture {
  brandId: string;
  branchId: string;
  userId: string;
}

export async function createBaseFixture(suffix: string): Promise<TestFixture> {
  const brand = await BrandModel.create({
    name: new Map([["en", `Test Brand ${suffix}`]]),
    slug: `test-brand-${suffix}`.toLowerCase(),
    legalName: `Test Brand Legal Name ${suffix}`,
  });

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
  ]);
}
