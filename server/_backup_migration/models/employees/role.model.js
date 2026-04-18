import mongoose from "mongoose";
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

/**
 * Role Schema
 * Defines permissions per resource (model-based access control)
 * Used for employees & system users
 */


const RESOURCE_ENUM = [
  // ================= CORE BUSINESS =================
  "Brands",
  "Branches",
  "BranchSettings",
  "DeliveryAreas",

  // ================= EMPLOYEES =================
  "Employees",
  "Departments",
  "JobTitles",
  "Shifts",
  "AttendanceRecords",
  "CashierShifts",
  "LeaveRequests",
  "Payrolls",
  "PayrollItems",
  "EmployeeFinancials",
  "EmployeeTransactions",
  "EmployeeAdvances",
  "EmployeeSettings",

  // ================= USERS & ROLES =================
  "UserAccounts",
  "Roles",

  // ================= MENU & SALES =================
  "MenuCategories",
  "MenuSettings",
  "Products",
  "Recipes",
  "Orders",
  "Invoices",
  "InvoiceSettings",
  "OrderSettings",
  "SalesReturns",
  "Promotions",
  "ProductReviews",

  // ================= KITCHEN =================
  "PreparationTickets",
  "PreparationSections",
  "PreparationReturns",
  "PreparationTicketSettings",

  // ================= INVENTORY =================
  "StockItems",
  "StockCategories",
  "Inventory",
  "InventoryCounts",
  "StockLedgers",
  "StockTransferRequests",
  "Warehouses",
  "WarehouseDocuments",
  "Consumptions",

  // ================= CASH =================
  "CashRegisters",
  "CashTransactions",
  "CashTransfers",
  "BankAccounts",

  // ================= ACCOUNTING =================
  "Accounts",
  "JournalEntries",
  "JournalLines",
  "AccountingPeriods",
  "AccountingSettings",
  "CostCenters",

  // ================= ASSETS =================
  "Assets",
  "AssetCategories",
  "AssetTransactions",
  "AssetDepreciations",
  "AssetMaintenances",
  "AssetPurchaseInvoices",

  // ================= PURCHASE =================
  "Suppliers",
  "SupplierTransactions",
  "PurchaseInvoices",
  "PurchaseReturns",
  "PurchaseSettings",

  // ================= SYSTEM =================
  "DiscountSettings",
  "NotificationSettings",
  "PrintSettings",
  "ServiceCharges",
  "ShiftSettings",
  "TaxConfigs",

  // ================= REPORTS =================
  "SalesReports",
  "InventoryReports",
  "FinancialReports",
  "EmployeeReports",
  "OperationalReports",
];

const roleSchema = new Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },

    name: {
      type: Map,
      of: String,
      required: true,
    },

    description: {
      type: Map,
      of: String,
      required: true,
    },

    allBranchesAccess: { type: Boolean, default: false },

    branchAccess: [{ type: ObjectId, ref: "Branch" }],

    /**
     * Permissions per resource
     */
    permissions: [
      {
        branch: { type: ObjectId, ref: "Branch", default: null },

        resource: {
          type: String,
          enum: RESOURCE_ENUM,
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

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    isSystemRole: { type: Boolean, default: false },

    createdBy: { type: ObjectId, ref: "UserAccount", default: null },
    updatedBy: { type: ObjectId, ref: "UserAccount" },
  },
  { timestamps: true },
);

export default mongoose.model("Role", roleSchema);