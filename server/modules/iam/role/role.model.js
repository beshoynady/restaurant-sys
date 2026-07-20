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
  "PayrollSettings",
  "EmployeeFinancial",
  "EmployeeTransactions",
  "EmployeeAdvances",
  "EmployeeSettings",

  // ================= USERS & ROLES =================
  "UserAccounts",
  "Roles",
  // IAM Platform Redesign (V4.0): the pluggable-credential engine's own manageable resources —
  // additive, per this file's standing RESOURCE_ENUM convention.
  "AuthCredentials",
  "AuthenticationSettings",
  "Sessions",
  "Devices",
  // IAP V2.0 Milestone 5: read-only visibility into the authentication/security audit trail.
  "SecurityEvents",
  // DEFAULT_ROLE_ARCHITECTURE.md: the platform-owned role-template catalog (list/instantiate).
  "RoleTemplates",

  // ================= MENU & SALES =================
  "MenuCategories",
  "MenuSettings",
  "Products",
  "Recipes",
  "Orders",
  "Invoices",
  // ADR-001-SALES-PAYMENT-ARCHITECTURE.md Phase 1 — additive, per this file's standing
  // RESOURCE_ENUM convention (never remove/rename an existing entry).
  "Payments",
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
  // PREPARATION_CONFIGURATION_PLATFORM_ENTERPRISE_DESIGN.md: the ONLY settings resource for
  // Preparation — PreparationReturnSettings/PreparationTicketSettings removed (2026-07-20, not
  // just deprecated) alongside the modules/routers they gated; neither exists in source any
  // longer. Any pre-existing Role document with a stored permission entry for either name is
  // harmless (no route checks it), left for a future, separate data-cleanup pass.
  "PreparationSettings",

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
  "ManualConsumptions",
  "WasteRecords",
  // FryerOilLogs removed (2026-07-20) — the FryerOilLog module was deleted; oil is now consumed
  // through the same generic ManualConsumption path as every other non-recipe-driven material
  // (oil/gas/packaging/cleaning supplies), closing a real duplication rather than a feature loss.

  // ================= PRODUCTION =================
  "ProductionOrders",
  "ProductionRecipes",
  "ProductionRecords",

  // ================= CASH =================
  "CashRegisters",
  "CashTransactions",
  "CashTransfers",
  "BankAccounts",
  "PaymentMethods",

  // ================= EXPENSE =================
  // Enterprise Finance Platform: previously absent entirely — `expense/*`'s two routers were both
  // unmounted (zero references in router/v1/index.router.js) and missing authorize()/
  // checkModuleEnabled() altogether, so these resource strings were never needed until now.
  "Expenses",
  "DailyExpenses",
  "RecurringExpenseTemplates",

  // ================= ACCOUNTING =================
  "Accounts",
  "JournalEntries",
  "JournalLines",
  "AccountingPeriods",
  "AccountingSettings",
  "CostCenters",
  "Budgets",

  // ================= ASSETS =================
  "Assets",
  "AssetCategories",
  "AssetTransactions",
  "AssetDepreciations",
  "AssetDisposals",
  "AssetMaintenances",
  "AssetPurchaseInvoices",

  // ================= PURCHASE =================
  "Suppliers",
  "SupplierTransactions",
  // Supply Chain & Commerce Platform V5: the 3-way-match procurement chain — additive, per this
  // file's standing RESOURCE_ENUM convention.
  "PurchaseRequests",
  "PurchaseOrders",
  "GoodsReceiptNotes",
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
  // Added — cross-domain final audit finding: loyalty-reward.router.js/
  // loyalty-transaction.router.js called `authorize("loyalty_reward_create")`
  // (a single-arg call, which `authorize.js` always evaluates as
  // `perm[undefined]` — silently denying everyone) with no matching
  // RESOURCE_ENUM entry to correct it to. Additive-only, per this project's
  // standing RESOURCE_ENUM convention.
  "LoyaltyRewards",
  "LoyaltyTransactions",

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
        // Journal Entry Posting Engine: reversing a Posted entry is a distinct, more sensitive
        // action than a normal `update` (it corrects an immutable financial record) — kept as its
        // own permission rather than folded into `approve`, so a brand can grant approval rights
        // without also granting reversal rights.
        reverse: { type: Boolean, default: false },
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