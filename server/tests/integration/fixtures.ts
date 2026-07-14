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
import AccountingSettingModel from "../../modules/accounting/accounting-settings/accounting-setting.model.js";
import AuthenticationSettingsModel from "../../modules/iam/authentication-settings/authentication-settings.model.js";
import AuthCredentialModel from "../../modules/iam/auth-credential/auth-credential.model.js";
import SessionModel from "../../modules/iam/session/session.model.js";
import DeviceModel from "../../modules/iam/device/device.model.js";
import WarehouseModel from "../../modules/inventory/warehouse/warehouse.model.js";
import StockCategoryModel from "../../modules/inventory/stock-category/stock-category.model.js";
import StockItemModel from "../../modules/inventory/stock-item/stock-item.model.js";
import InventoryModel from "../../modules/inventory/inventory/inventory.model.js";
import StockLedgerModel from "../../modules/inventory/stock-ledger/stock-ledger.model.js";
import WarehouseDocumentModel from "../../modules/inventory/warehouse-document/warehouse-document.model.js";

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

/**
 * Journal Entry Posting Engine test fixture: a fully-configured AccountingSettings document
 * (every required control account + activity account) plus the underlying Account documents
 * themselves, so a posting test can call journalEntryService.postFromSource /
 * accountingSettingService.resolveForPosting without hand-assembling ~19 Account fixtures per
 * test file.
 */
export async function createAccountingSettingsFixture(
  fixture: TestFixture,
  suffix: string,
  overrides: Record<string, unknown> = {},
) {
  const account = (code: string, category: string) => createAccountFixture(fixture, `${code}-${suffix}`, category);

  const [
    cash, bank, ar, ap, inventory, inventoryAdjustment, cogs, opex, salesTaxPayable, purchaseTaxRecoverable, equity,
    salesRevenue, salesTax, purchaseInventory, salesReturnRevenueContra, salesReturnCostContra,
    purchaseReturnInventoryContra, expenseDefault,
  ] = await Promise.all([
    account("CASH", "Asset"), account("BANK", "Asset"), account("AR", "Asset"), account("AP", "Liability"),
    account("INV", "Asset"), account("INVADJ", "Expense"), account("COGS", "Expense"), account("OPEX", "Expense"),
    account("STP", "Liability"), account("PTR", "Asset"), account("EQ", "Equity"),
    account("REV", "Revenue"), account("STX", "Liability"), account("PINV", "Asset"),
    account("SRC", "Revenue"), account("SCC", "Expense"), account("PRIC", "Asset"), account("EXP", "Expense"),
  ]);

  return AccountingSettingModel.create({
    brand: fixture.brandId,
    branch: null,
    createdBy: fixture.userId,
    controlAccounts: {
      cash: cash._id, bank: bank._id, accountsReceivable: ar._id, accountsPayable: ap._id,
      inventory: inventory._id, inventoryAdjustment: inventoryAdjustment._id, costOfGoodsSold: cogs._id,
      operatingExpense: opex._id, salesTaxPayable: salesTaxPayable._id, purchaseTaxRecoverable: purchaseTaxRecoverable._id,
      equityCapital: equity._id,
    },
    activities: {
      sales: { revenue: salesRevenue._id, tax: salesTax._id, costOfSales: cogs._id },
      salesReturn: { revenueContra: salesReturnRevenueContra._id, costOfSalesContra: salesReturnCostContra._id },
      purchase: { inventory: purchaseInventory._id },
      purchaseReturn: { inventoryContra: purchaseReturnInventoryContra._id },
      expense: { defaultExpense: expenseDefault._id },
    },
    ...overrides,
  });
}

export async function createWarehouseFixture(fixture: TestFixture, suffix: string) {
  return WarehouseModel.create({
    brand: fixture.brandId,
    branch: fixture.branchId,
    name: new Map([["en", `Test Warehouse ${suffix}`]]),
    code: `WH${suffix}`.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10),
    description: new Map([["en", "test"]]),
    address: new Map([["en", "test"]]),
    createdBy: fixture.userId,
  });
}

export async function createStockItemFixture(
  fixture: TestFixture,
  suffix: string,
  costMethod: "FIFO" | "LIFO" | "WeightedAverage" = "WeightedAverage",
) {
  const category = await StockCategoryModel.create({
    brand: fixture.brandId,
    categoryName: new Map([["en", `Test Category ${suffix}`]]),
    categoryCode: `CAT${suffix}`.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10),
    description: new Map([["en", "test"]]),
    createdBy: fixture.userId,
  });

  return StockItemModel.create({
    brand: fixture.brandId,
    branch: fixture.branchId,
    itemName: new Map([["en", `Test Item ${suffix}`]]),
    SKU: `SKU-${suffix}`.toUpperCase(),
    categoryId: category._id,
    storageUnit: "kg",
    ingredientUnit: "gram",
    parts: 1000,
    costMethod,
    notes: new Map([["en", "test"]]),
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
    AccountingSettingModel.deleteMany({ brand: brandId }),
    WarehouseModel.deleteMany({ brand: brandId }),
    StockCategoryModel.deleteMany({ brand: brandId }),
    StockItemModel.deleteMany({ brand: brandId }),
    InventoryModel.deleteMany({ brand: brandId }),
    StockLedgerModel.deleteMany({ brand: brandId }),
    WarehouseDocumentModel.deleteMany({ brand: brandId }),
    AuthenticationSettingsModel.deleteMany({ brand: brandId }),
    AuthCredentialModel.deleteMany({ brand: brandId }),
    SessionModel.deleteMany({ brand: brandId }),
    DeviceModel.deleteMany({ brand: brandId }),
  ]);
}
