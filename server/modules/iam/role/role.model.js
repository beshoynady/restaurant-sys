import mongoose from "mongoose";
const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

/**
 * Role Schema
 * Defines permissions per resource (model-based access control)
 * Used for employees & system users
 */


export const RESOURCE_ENUM = [
  // ================= CORE BUSINESS =================
  "Brands",
  "BrandSettings",
  "Branches",
  "BranchSettings",
  "DeliveryAreas",

  // ================= EMPLOYEES =================
  "Employees",
  "Departments",
  "JobTitles",
  "Shifts",
  "AttendanceRecords",
  "AttendanceSettings",
  "CashierShifts",
  "LeaveRequests",
  "Payrolls",
  "PayrollItems",
  "EmployeeFinancial",
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
  "SalesReturnSettings",
  "Promotions",
  "ProductReviews",

  // ================= KITCHEN =================
  "PreparationTickets",
  "PreparationSections",
  "PreparationReturns",
  "PreparationReturnSettings",
  "PreparationTicketSettings",

  // ================= INVENTORY =================
  "StockItems",
  "StockCategories",
  "Inventory",
  "InventorySettings",
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

  // ================= CRM =================
  "Messages",
  "OfflineCustomers",
  "OnlineCustomers",

  // ================= LOYALTY =================
  "CustomerLoyalty",
  "LoyaltySettings",

  // ================= SEATING =================
  "Tables",
  "Reservations",

  // ================= ACCOUNTING (extra) =================
  "AccountBalances",
  "Ledgers",

  // ================= AUDIT =================
  "AuditLogs",
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
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    isSystemRole: { type: Boolean, default: false },

    // Distinct from isSystemRole (which just marks a tenant's default
    // full-access "Owner" role, brand-scoped like every other role).
    // isPlatformAdmin marks a role that manages the platform itself across
    // ALL brands — required because Brand is brandScoped:false at the
    // repository level (it's the tenant root, so there's no higher brand
    // id to filter by), meaning the normal automatic
    // {brand: req.user.brandId} isolation every other Organization module
    // gets "for free" does not apply to it. Without this flag, any tenant's
    // Owner role (which is granted full "Brands" CRUD permission by
    // buildOwnerRole() so it can manage its OWN brand profile) had no
    // technical boundary stopping it from reading/updating/deleting every
    // OTHER brand on the platform too — confirmed exploitable in the
    // Organization Final Audit. Defaults false; never set by
    // system-setup/setup.service.js's tenant-bootstrap Owner role, so no
    // existing or newly-onboarded tenant is a platform admin by default —
    // only a role explicitly promoted to isPlatformAdmin:true is.
    // middlewares/authorizeBrandAccess.js is what actually enforces this.
    isPlatformAdmin: { type: Boolean, default: false },

    createdBy: { type: ObjectId, ref: "UserAccount", default: null },
    updatedBy: { type: ObjectId, ref: "UserAccount" },
  },
  { timestamps: true },
);

export default mongoose.model("Role", roleSchema);