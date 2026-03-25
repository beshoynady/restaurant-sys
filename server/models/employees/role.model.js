import mongoose from "mongoose";
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

/**
 * Role Schema
 * Represents a role with role for each model in the restaurant system.
 * Can be assigned to a user or an employee.
 */
const roleSchema = new Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },

    // Name of the role (multi-language support)
    name: [
      {
        lang: {
          type: String,
          enum: ["EN", "AR"],
        },
        value: {
          type: String,
          trim: true,
          minlength: 2,
          maxlength: 100,
        },
      },
    ],

    description: [
      {
        lang: {
          type: String,
          enum: ["EN", "AR"],
        },
        value: {
          type: String,
          trim: true,
          minlength: 2,
          maxlength: 100,
        },
      },
    ],

    branchAccess: [{ type: ObjectId, ref: "Branch" }],

    // Role per resource (model)
    role: [
      {
        branch: { type: ObjectId, ref: "Branch", required: true },
        resource: {
          type: String,
          enum: [
            // Accounting
            "Accounts",
            "AccountBalances",
            "AccountingPeriods",
            "AccountingSettings",
            "CostCenters",
            "JournalEntries",
            "JournalLines",

            // Assets
            "Assets",
            "AssetCategories",
            "AssetDepreciations",
            "AssetMaintenances",
            "AssetPurchaseInvoices",
            "AssetTransactions",

            // Cash
            "CashRegisters",
            "CashTransactions",
            "CashTransfers",
            "BankAccounts",

            // Core
            "Branches",
            "BranchSettings",
            "Brands",
            "DeliveryAreas",

            // Customers
            "OfflineCustomers",
            "OnlineCustomers",
            "CustomerMessages",

            // Employees
            "Employees",
            "JobTitles",
            "AttendanceRecords",
            "EmployeeFinancials",
            "EmployeeTransactions",
            "EmployeeAdvances",
            "Payrolls",
            "PayrollItems",
            "Role",
            "Shifts",
            "UserAccounts",
            "LeaveRequests",
            "EmployeeSettings",
            "CashierShifts",
            "Departments",

            // Expenses
            "DailyExpenses",
            "Expenses",

            // Inventory
            "StockItems",
            "StockCategories",
            "Inventory",
            "InventoryCounts",
            "StockLedgers",
            "StockTransferRequests",
            "Consumptions",
            "WarehouseDocuments",
            "Warehouses",

            // Kitchen
            "PreparationTickets",
            "PreparationTicketSettings",
            "PreparationSections",
            "PreparationReturns",
            "PreparationReturnSettings",

            // Loyalty
            "CustomerLoyalties",
            "LoyaltyRewards",
            "LoyaltySettings",
            "LoyaltyTransactions",

            // Menu
            "MenuCategories",
            "MenuSettings",
            "Products",
            "Recipes",

            // PaymentProvider
            "PaymentProviders",

            // Payments
            "PaymentChannels",
            "PaymentMethods",

            // Production
            "ProductionOrders",
            "ProductionRecipes",
            "ProductionRecords",

            // Purchasing
            "PurchaseInvoices",
            "PurchaseReturns",
            "PurchaseSettings",
            "Suppliers",
            "SupplierTransactions",

            // Sales
            "Invoices",
            "InvoiceSettings",
            "Orders",
            "OrderSettings",
            "ProductReviews",
            "Promotions",
            "SalesReturns",
            "SalesReturnSettings",

            // Seating
            "DiningAreas",
            "Tables",
            "Reservations",

            // System
            "DiscountSettings",
            "NotificationSettings",
            "PrintSettings",
            "ServiceCharges",
            "ShiftSettings",
            "TaxConfigs",
          ],
          required: true,
        },
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        viewReports: { type: Boolean, default: false },
        approve: { type: Boolean, default: false },
        reject: { type: Boolean, default: false },
      },
    ],

    status: { type: String, enum: ["active", "inactive"], default: "active" },

    createdBy: { type: ObjectId, ref: "UserAccount" },
    updatedBy: { type: ObjectId, ref: "UserAccount" },
  },
  { timestamps: true },
);

const Role = mongoose.model("Role", roleSchema);
export default Role;
