import express from "express";
const router = express.Router();


import setupRouter from "../../modules/system-setup/setup.router.js";


// ========================
// ACCOUNTING
// ========================
import accountRouter from "../../modules/accounting/account/account.router.js";
import accountBalanceRouter from "../../modules/accounting/account-balance/account-balance.router.js";
import accountingPeriodRouter from "../../modules/accounting/accounting-period/accounting-period.router.js";
import accountingSettingRouter from "../../modules/accounting/accounting-settings/accounting-setting.router.js";
import costCenterRouter from "../../modules/accounting/cost-center/cost-center.router.js";
import journalEntryRouter from "../../modules/accounting/journal-entry/journal-entry.router.js";
import journalLineRouter from "../../modules/accounting/journal-line/journal-line.router.js";
import ledgerRouter from "../../modules/accounting/ledger/ledger.router.js";

// ========================
// ASSETS
// ========================
import assetRouter from "../../modules/assets/asset/asset.router.js";
import assetCategoryRouter from "../../modules/assets/asset-category/asset-category.router.js";
import assetDepreciationRouter from "../../modules/assets/asset-depreciation/asset-depreciation.router.js";
import assetMaintenanceRouter from "../../modules/assets/asset-maintenance/asset-maintenance.router.js";
import assetPurchaseInvoiceRouter from "../../modules/assets/asset-purchase-invoice/asset-purchase-invoice.router.js";
import assetTransactionsRouter from "../../modules/assets/asset-transactions/asset-transactions.router.js";

// ========================
// CRM
// ========================
import messageRouter from "../../modules/crm/message/message.router.js";
import offlineCustomerRouter from "../../modules/crm/offline-customer/offline-customer.router.js";
import onlineCustomerRouter from "../../modules/crm/online-customer/online-customer.router.js";
import customerAuthRouter from "../../modules/crm/customer-auth/auth.router.js";

// ========================
// FINANCE
// ========================
import bankAccountRouter from "../../modules/finance/bank-account/bank-account.router.js";
import cashRegisterRouter from "../../modules/finance/cash-register/cash-register.router.js";
import cashTransactionRouter from "../../modules/finance/cash-transaction/cash-transaction.router.js";
import cashTransferRouter from "../../modules/finance/cash-transfer/cash-transfer.router.js";
import cashierShiftRouter from "../../modules/finance/cashier-shift/cashier-shift.router.js";

// ========================
// HR
// ========================
import employeeRouter from "../../modules/hr/employee/employee.router.js";
import departmentRouter from "../../modules/hr/department/department.router.js";
import attendanceRouter from "../../modules/hr/attendance-record/attendance-record.router.js";
import payrollRouter from "../../modules/hr/payroll/payroll.router.js";
import shiftRouter from "../../modules/hr/shift/shift.router.js";


// ========================
// IAM
// ========================
import authRouter from "../../modules/iam/user-auth/user-auth.router.js";
import userAccountRouter from "../../modules/iam/user-account/user-account.router.js";
import roleRouter from "../../modules/iam/role/role.router.js";

// ========================
// INVENTORY
// ========================
import inventoryRouter from "../../modules/inventory/inventory/inventory.router.js";
import stockItemRouter from "../../modules/inventory/stock-item/stock-item.router.js";
import warehouseRouter from "../../modules/inventory/warehouse/warehouse.router.js";

// ========================
// MENU
// ========================
import productRouter from "../../modules/menu/product/product.router.js";
import menuCategoryRouter from "../../modules/menu/menu-category/menu-category.router.js";
import recipeRouter from "../../modules/menu/recipe/recipe.router.js";

// ========================
// SALES
// ========================
import orderRouter from "../../modules/sales/order/order.router.js";
import invoiceRouter from "../../modules/sales/invoice/invoice.router.js";

// ========================
// SEATING
// ========================
import tableRouter from "../../modules/seating/table/table.router.js";
import reservationRouter from "../../modules/seating/reservation/reservation.router.js";

// ========================
// LOYALTY
// ========================
import loyaltyRouter from "../../modules/loyalty/customer-loyalty/customer-loyalty.router.js";


// ========================
// HEALTH CHECK
// ========================
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running 🚀",
  });
});




// ========================
// REGISTER MODULE ROUTES
// ========================

// System Setup (must be first to prevent conflicts)
router.use("/setup", setupRouter);

// Accounting
router.use("/accounting/accounts", accountRouter);
router.use("/accounting/balances", accountBalanceRouter);
router.use("/accounting/periods", accountingPeriodRouter);
router.use("/accounting/settings", accountingSettingRouter);
router.use("/accounting/cost-centers", costCenterRouter);
router.use("/accounting/journal-entries", journalEntryRouter);
router.use("/accounting/journal-lines", journalLineRouter);
router.use("/accounting/ledgers", ledgerRouter);

// Assets
router.use("/assets", assetRouter);
router.use("/assets/categories", assetCategoryRouter);
router.use("/assets/depreciation", assetDepreciationRouter);
router.use("/assets/maintenance", assetMaintenanceRouter);
router.use("/assets/purchase-invoices", assetPurchaseInvoiceRouter);
router.use("/assets/transactions", assetTransactionsRouter);


// CRM
router.use("/crm/messages", messageRouter);
router.use("/crm/offline-customers", offlineCustomerRouter);
router.use("/crm/online-customers", onlineCustomerRouter);
router.use("/crm/auth", customerAuthRouter);
// Finance
router.use("/finance/banks", bankAccountRouter);
router.use("/finance/cash-registers", cashRegisterRouter);
router.use("/finance/cash-transactions", cashTransactionRouter);
router.use("/finance/cash-transfers", cashTransferRouter);
router.use("/finance/cashier-shifts", cashierShiftRouter);

// HR
router.use("/hr/employees", employeeRouter);
router.use("/hr/departments", departmentRouter);
router.use("/hr/attendance", attendanceRouter);
router.use("/hr/payroll", payrollRouter);
router.use("/hr/shifts", shiftRouter);

// IAM
router.use("/auth", authRouter);
router.use("/users", userAccountRouter);
router.use("/roles", roleRouter);

// Inventory
router.use("/inventory", inventoryRouter);
router.use("/stock-items", stockItemRouter);
router.use("/warehouses", warehouseRouter);

// Menu
router.use("/menu/products", productRouter);
router.use("/menu/categories", menuCategoryRouter);
router.use("/menu/recipes", recipeRouter);

// Sales
router.use("/sales/orders", orderRouter);
router.use("/sales/invoices", invoiceRouter);

// Seating
router.use("/seating/tables", tableRouter);
router.use("/seating/reservations", reservationRouter);

// Loyalty
router.use("/loyalty", loyaltyRouter);

export default router;