/**
 * Domain-group -> RESOURCE_ENUM classification (DEFAULT_ROLE_ARCHITECTURE.md §4).
 *
 * Single source of truth mapping every `RESOURCE_ENUM` entry into exactly one domain group.
 * Extends role.model.js's existing "RESOURCE_ENUM is additive-only" convention: a new resource
 * must also be classified here, in this one place, rather than requiring every role
 * template to be individually revisited.
 */
export const DOMAIN_GROUPS = {
  ORG_CORE: ["Brands", "BrandSettings", "Branches", "BranchSettings", "DeliveryAreas"],
  HR_STAFF: [
    "Employees", "Departments", "JobTitles", "Shifts", "AttendanceRecords",
    "AttendanceSettings", "CashierShifts", "LeaveRequests", "EmployeeSettings",
  ],
  HR_PAYROLL: ["Payrolls", "PayrollItems", "PayrollSettings", "EmployeeFinancial", "EmployeeTransactions", "EmployeeAdvances"],
  IAM: ["UserAccounts", "Roles", "RoleTemplates", "AuthCredentials", "AuthenticationSettings", "Sessions", "Devices", "SecurityEvents"],
  MENU_SALES: [
    "MenuCategories", "MenuSettings", "Products", "Recipes", "Orders", "Invoices",
    "InvoiceSettings", "OrderSettings", "SalesReturns", "SalesReturnSettings", "Promotions", "ProductReviews",
  ],
  KITCHEN: ["PreparationTickets", "PreparationSections", "PreparationReturns", "PreparationReturnSettings", "PreparationTicketSettings"],
  INVENTORY: [
    "StockItems", "StockCategories", "Inventory", "InventorySettings", "InventoryCounts",
    "StockLedgers", "StockTransferRequests", "Warehouses", "WarehouseDocuments", "Consumptions",
  ],
  CASH_FINANCE: ["CashRegisters", "CashTransactions", "CashTransfers", "BankAccounts"],
  ACCOUNTING: [
    "Accounts", "JournalEntries", "JournalLines", "AccountingPeriods", "AccountingSettings",
    "CostCenters", "AccountBalances", "Ledgers",
  ],
  ASSETS: ["Assets", "AssetCategories", "AssetTransactions", "AssetDepreciations", "AssetMaintenances", "AssetPurchaseInvoices"],
  PURCHASING: ["Suppliers", "SupplierTransactions", "PurchaseInvoices", "PurchaseReturns", "PurchaseSettings"],
  SYSTEM_CONFIG: ["DiscountSettings", "NotificationSettings", "PrintSettings", "ServiceCharges", "ShiftSettings", "TaxConfigs"],
  REPORTS: ["SalesReports", "InventoryReports", "FinancialReports", "EmployeeReports", "OperationalReports"],
  CRM: ["Messages", "OfflineCustomers", "OnlineCustomers"],
  LOYALTY: ["CustomerLoyalty", "LoyaltySettings", "LoyaltyRewards", "LoyaltyTransactions"],
  SEATING: ["Tables", "Reservations"],
  AUDIT: ["AuditLogs"],
};

/** Access-level -> permission-flags mapping (DEFAULT_ROLE_ARCHITECTURE.md §4). */
export const ACCESS_LEVEL_FLAGS = {
  NONE: null,
  READ: { read: true },
  OPERATE: { create: true, read: true, update: true },
  MANAGE: { create: true, read: true, update: true, delete: true, viewReports: true },
  FULL: { create: true, read: true, update: true, delete: true, viewReports: true, approve: true, reject: true, reverse: true },
};

/**
 * Expands a template's `domainGrants` (domain -> access level) into a real `Role.permissions`
 * array. This is the one place a domain-group classification becomes actual per-resource
 * permission entries — everything else in the role-template system only ever talks in terms of
 * domain groups.
 */
export function expandDomainGrantsToPermissions(domainGrants) {
  const permissions = [];
  for (const { domain, level } of domainGrants) {
    const flags = ACCESS_LEVEL_FLAGS[level];
    if (!flags) continue; // NONE
    const resources = DOMAIN_GROUPS[domain] || [];
    for (const resource of resources) {
      permissions.push({ resource, ...flags });
    }
  }
  return permissions;
}
