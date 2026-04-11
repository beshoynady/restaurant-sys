import RoleModel from "../../../models/employees/role.model.js";

/* =====================================================
   RESOURCE ENUM (Single Source of Truth)
   IMPORTANT: must match Role Schema exactly
===================================================== */

const RESOURCE_ENUM = [
  "Brands","Branches","BranchSettings","DeliveryAreas",
  "Employees","Departments","JobTitles","Shifts","AttendanceRecords",
  "CashierShifts","LeaveRequests","Payrolls","PayrollItems",
  "EmployeeFinancials","EmployeeTransactions","EmployeeAdvances","EmployeeSettings",
  "UserAccounts","Roles",
  "MenuCategories","MenuSettings","Products","Recipes","Orders","Invoices",
  "InvoiceSettings","OrderSettings","SalesReturns","Promotions","ProductReviews",
  "PreparationTickets","PreparationSections","PreparationReturns","PreparationTicketSettings",
  "StockItems","StockCategories","Inventory","InventoryCounts","StockLedgers",
  "StockTransferRequests","Warehouses","WarehouseDocuments","Consumptions",
  "CashRegisters","CashTransactions","CashTransfers","BankAccounts",
  "Accounts","JournalEntries","JournalLines","AccountingPeriods","AccountingSettings","CostCenters",
  "Assets","AssetCategories","AssetTransactions","AssetDepreciations",
  "AssetMaintenances","AssetPurchaseInvoices",
  "Suppliers","SupplierTransactions","PurchaseInvoices","PurchaseReturns","PurchaseSettings",
  "DiscountSettings","NotificationSettings","PrintSettings","ServiceCharges","ShiftSettings","TaxConfigs",
  "SalesReports","InventoryReports","FinancialReports","EmployeeReports","OperationalReports"
];

/* =====================================================
   PERMISSION BUILDERS
===================================================== */

/**
 * Build full access permissions (Owner / Admin)
 */
const buildFullPermissions = () =>
  RESOURCE_ENUM.map((resource) => ({
    branch: null,
    resource,
    create: true,
    read: true,
    update: true,
    delete: true,
    viewReports: true,
    approve: true,
    reject: true,
  }));

/**
 * Build limited access permissions
 */
const buildLimitedPermissions = (resources = []) =>
  resources.map((resource) => ({
    branch: null,
    resource,
    create: true,
    read: true,
    update: true,
    delete: false,
    viewReports: false,
    approve: false,
    reject: false,
  }));

/* =====================================================
   DEFAULT ROLES CONFIGURATION
===================================================== */

const DEFAULT_ROLES = [
  {
    name: { EN: "Owner", AR: "مالك" },
    description: { EN: "Full system access", AR: "صلاحيات كاملة للنظام" },
    allBranchesAccess: true,
    isSystemRole: true,
    fullAccess: true,
  },
  {
    name: { EN: "Admin", AR: "مدير النظام" },
    description: { EN: "System management", AR: "إدارة النظام" },
    allBranchesAccess: true,
    isSystemRole: true,
    fullAccess: true,
  },
  {
    name: { EN: "Branch Manager", AR: "مدير فرع" },
    description: { EN: "Manage branch operations", AR: "إدارة عمليات الفرع" },
    permissions: [
      "Orders","Invoices","Products","Employees",
      "CashRegisters","CashTransactions","Inventory",
      "PreparationTickets","SalesReports"
    ],
  },
  {
    name: { EN: "Accountant", AR: "محاسب" },
    description: { EN: "Financial operations", AR: "إدارة العمليات المالية" },
    permissions: [
      "Accounts","JournalEntries","JournalLines",
      "Invoices","CashTransactions","PurchaseInvoices",
      "Suppliers","FinancialReports"
    ],
  },
  {
    name: { EN: "Cashier", AR: "كاشير" },
    description: { EN: "Handle orders and payments", AR: "إدارة الطلبات والمدفوعات" },
    permissions: ["Orders","Invoices","Products","CashRegisters"],
  },
  {
    name: { EN: "Waiter", AR: "ويتر" },
    description: { EN: "Take customer orders", AR: "استقبال الطلبات" },
    permissions: ["Orders","Products"],
  },
  {
    name: { EN: "Chef", AR: "شيف" },
    description: { EN: "Kitchen operations", AR: "إدارة المطبخ" },
    permissions: ["PreparationTickets","Products","Recipes"],
  },
  {
    name: { EN: "Delivery", AR: "دليفري" },
    description: { EN: "Delivery operations", AR: "التوصيل" },
    permissions: ["Orders"],
  },
];

/* =====================================================
   SERVICE
===================================================== */

class RoleSeedService {
  /**
   * Seed default roles for a brand
   * @param {ObjectId} brandId
   * @param {mongoose.ClientSession} session
   */
  async seed(brandId, session) {
    const createdRoles = [];

    for (const role of DEFAULT_ROLES) {
      let permissions = [];

      // FULL ACCESS
      if (role.fullAccess) {
        permissions = buildFullPermissions();
      }

      // LIMITED ACCESS
      if (role.permissions) {
        permissions = buildLimitedPermissions(role.permissions);
      }

      /**
       * Prevent duplicate roles
       */
      const exists = await RoleModel.findOne({
        brand: brandId,
        "name.EN": role.name.EN,
      }).session(session);

      if (exists) continue;

      /**
       * Create role
       */
      const created = await RoleModel.create(
        [
          {
            brand: brandId,
            name: role.name,
            description: role.description,
            allBranchesAccess: role.allBranchesAccess || false,
            isSystemRole: role.isSystemRole || false,
            permissions,
          },
        ],
        { session }
      );

      createdRoles.push(created[0]);
    }

    return createdRoles;
  }
}

export default new RoleSeedService();