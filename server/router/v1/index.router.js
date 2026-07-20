import express from "express";
const router = express.Router();


import setupRouter from "../../modules/system-setup/setup.router.js";

// ========================
// ORGANIZATION
// ========================
import brandRouter from "../../modules/organization/brand/brand.router.js";
import branchRouter from "../../modules/organization/branch/branch.router.js";
import brandSettingsRouter from "../../modules/organization/brand-settings/brand-settings.router.js";
import branchSettingsRouter from "../../modules/organization/branch-settings/branch-settings.router.js";
import deliveryAreaRouter from "../../modules/organization/delivery-area/delivery-area.router.js";




// ========================
// ACCOUNTING
// ========================
import accountRouter from "../../modules/accounting/account/account.router.js";
import accountBalanceRouter from "../../modules/accounting/account-balance/account-balance.router.js";
import accountingPeriodRouter from "../../modules/accounting/accounting-period/accounting-period.router.js";
import accountingSettingRouter from "../../modules/accounting/accounting-settings/accounting-setting.router.js";
import costCenterRouter from "../../modules/accounting/cost-center/cost-center.router.js";
import budgetRouter from "../../modules/accounting/budget/budget.router.js";
import journalEntryRouter from "../../modules/accounting/journal-entry/journal-entry.router.js";
import journalLineRouter from "../../modules/accounting/journal-line/journal-line.router.js";
import ledgerRouter from "../../modules/accounting/ledger/ledger.router.js";
import financialStatementsRouter from "../../modules/accounting/financial-statements/financial-statements.router.js";

// ========================
// ASSETS
// ========================
import assetRouter from "../../modules/assets/asset/asset.router.js";
import assetCategoryRouter from "../../modules/assets/asset-category/asset-category.router.js";
import assetDepreciationRouter from "../../modules/assets/asset-depreciation/asset-depreciation.router.js";
import assetDisposalRouter from "../../modules/assets/asset-disposal/asset-disposal.router.js";
import assetMaintenanceRouter from "../../modules/assets/asset-maintenance/asset-maintenance.router.js";
import assetPurchaseInvoiceRouter from "../../modules/assets/asset-purchase-invoice/asset-purchase-invoice.router.js";
import assetTransactionsRouter from "../../modules/assets/asset-transactions/asset-transactions.router.js";

// ========================
// CRM
// ========================
import messageRouter from "../../modules/crm/message/message.router.js";
import offlineCustomerRouter from "../../modules/crm/offline-customer/offline-customer.router.js";
import onlineCustomerRouter from "../../modules/crm/online-customer/online-customer.router.js";
// import customerAuthRouter from "../../modules/crm/customer-auth/auth.router.js";

// ========================
// FINANCE
// ========================
import bankAccountRouter from "../../modules/finance/bank-account/bank-account.router.js";
import cashRegisterRouter from "../../modules/finance/cash-register/cash-register.router.js";
import cashTransactionRouter from "../../modules/finance/cash-transaction/cash-transaction.router.js";
import cashTransferRouter from "../../modules/finance/cash-transfer/cash-transfer.router.js";
import cashierShiftRouter from "../../modules/finance/cashier-shift/cashier-shift.router.js";
// ========================
// EXPENSE
// ========================
// Enterprise Finance Platform: both routers were previously unmountable (broken
// `./expenses/<x>.controller.js` import paths — no such subfolder ever existed) AND never
// mounted here at all — the entire Expense domain had zero live API surface. Fixed and mounted now.
import expenseRouter from "../../modules/expense/expense/expense.router.js";
import dailyExpenseRouter from "../../modules/expense/daily-expense/daily-expense.router.js";
import recurringExpenseTemplateRouter from "../../modules/expense/recurring-expense-template/recurring-expense-template.router.js";
import financeReportsRouter from "../../modules/finance/finance-reports/finance-reports.router.js";
import expenseReportsRouter from "../../modules/expense/expense-reports/expense-reports.router.js";
import assetReportsRouter from "../../modules/assets/asset-reports/asset-reports.router.js";
import executiveDashboardRouter from "../../modules/accounting/executive-dashboard/executive-dashboard.router.js";
// V6.0 Production Hardening: was unmountable (broken controller import path) and un-mounted —
// see payment-method.router.js's header comment. Supply Chain's Supplier Payment/Refund workflow
// requires this to exist (PurchaseInvoice.paymentMethod / PurchaseReturnInvoice.refundMethod are
// both `required: true` references to it).
import paymentMethodRouter from "../../modules/payments/payment-method/payment-method.router.js";

// ========================
// HR
// ========================
import employeeRouter from "../../modules/hr/employee/employee.router.js";
import departmentRouter from "../../modules/hr/department/department.router.js";
import jobTitleRouter from "../../modules/hr/job-title/job-title.router.js";
import attendanceRouter from "../../modules/hr/attendance-record/attendance-record.router.js";
import payrollRouter from "../../modules/hr/payroll/payroll.router.js";
import shiftRouter from "../../modules/hr/shift/shift.router.js";
import employeeSettingsRouter from "../../modules/hr/employee-settings/employee-settings.router.js";
import attendanceSettingsRouter from "../../modules/hr/attendance-settings/attendance-settings.router.js";
import employeeFinancialProfileRouter from "../../modules/hr/employee-financial-profile/employee-financial-profile.router.js";
import employeeFinancialTransactionRouter from "../../modules/hr/employee-financial-transaction/employee-financial-transaction.router.js";
import employeeAdvanceRouter from "../../modules/hr/employee-advance/employee-advance.router.js";
import leaveRequestRouter from "../../modules/hr/leave-request/leave-request.router.js";
import payrollSettingsRouter from "../../modules/hr/payroll-settings/payroll-settings.router.js";
import payrollItemRouter from "../../modules/hr/payroll-item/payroll-item.router.js";
// Relocated from hr/shift-settings (HR domain rollout, module 5) — every
// field in this settings model describes POS/cashier-till behavior, not
// staff work-shift scheduling; it now lives next to finance/cashier-shift,
// the module it's meant to configure. Mount path below is kept as
// /hr/shift-settings on purpose (external API stability) — see
// CASHIER_SHIFT_SETTINGS.module.md §13.
import shiftSettingsRouter from "../../modules/finance/cashier-shift-settings/cashier-shift-settings.router.js";


// ========================
// IAM
// ========================
import authRouter from "../../modules/iam/user-auth/user-auth.router.js";
import userAccountRouter from "../../modules/iam/user-account/user-account.router.js";
import roleRouter from "../../modules/iam/role/role.router.js";
// IAM Platform Redesign (V4.0): Owner Controlled Authentication — pluggable credentials + policy.
import authCredentialRouter from "../../modules/iam/auth-credential/auth-credential.router.js";
import authenticationSettingsRouter from "../../modules/iam/authentication-settings/authentication-settings.router.js";
import deviceRouter from "../../modules/iam/device/device.router.js";
import securityEventRouter from "../../modules/iam/security-event/security-event.router.js";
import roleTemplateRouter from "../../modules/iam/role-template/role-template.router.js";

// ========================
// INVENTORY
// ========================
import inventoryRouter from "../../modules/inventory/inventory/inventory.router.js";
import stockItemRouter from "../../modules/inventory/stock-item/stock-item.router.js";
// V6.0 Production Hardening: was an orphaned, unmounted router sitting on a broken (non-Repository-
// Pattern) service — see stock-category.service.js's header comment. Fixed and mounted: StockItem
// requires a categoryId, but until now there was no API path to create/list a StockCategory at all.
import stockCategoryRouter from "../../modules/inventory/stock-category/stock-category.router.js";
import warehouseRouter from "../../modules/inventory/warehouse/warehouse.router.js";
import inventorySettingsRouter from "../../modules/inventory/inventory-settings/inventory-settings.router.js";
// V4.0 Inventory Stock Movement Engine: RBAC fixed, mounted here now that posting is real.
import warehouseDocumentRouter from "../../modules/inventory/warehouse-document/warehouse-document.router.js";
import stockLedgerRouter from "../../modules/inventory/stock-ledger/stock-ledger.router.js";
// Supply Chain & Commerce Platform V5.1: Cycle Count / Adjustment and Branch/Warehouse Transfer engines.
import inventoryCountRouter from "../../modules/inventory/inventory-count/inventory-count.router.js";
import stockTransferRequestRouter from "../../modules/inventory/stock-transfer-request/stock-transfer-request.router.js";
// Preparation & Kitchen Operations Platform: operational consumption of non-recipe-driven
// materials (oil, gas, packaging, cleaning supplies) — see manual-consumption.model.js.
import manualConsumptionRouter from "../../modules/inventory/manual-consumption/manual-consumption.router.js";
// Preparation & Kitchen Operations Platform Phase 1: Waste Management.
import wasteRecordRouter from "../../modules/inventory/waste-record/waste-record.router.js";

// ========================
// PRODUCTION
// ========================
// Enterprise Production Platform: these three routers were previously empty stubs (no routes
// defined at all — confirmed by direct read, not assumed) and were never mounted anywhere. Now
// rebuilt with real business logic and mounted.
import productionOrderRouter from "../../modules/production/production-order/production-order.router.js";
import productionRecipeRouter from "../../modules/production/production-recipe/production-recipe.router.js";
import productionRecordRouter from "../../modules/production/production-record/production-record.router.js";

// ========================
// MENU
// ========================
import productRouter from "../../modules/menu/product/product.router.js";
import menuCategoryRouter from "../../modules/menu/menu-category/menu-category.router.js";
import recipeRouter from "../../modules/menu/recipe/recipe.router.js";
import productReviewRouter from "../../modules/menu/product-review/product-review.router.js";

// ========================
// PREPARATION
// ========================
// PREPARATION_DOMAIN_ARCHITECTURE_REVIEW.md: unified settings source — mounted alongside, not
// instead of, the two legacy settings routers below (kept for backward compatibility).
import preparationSettingsRouter from "../../modules/preparation/preparation-settings/preparation-settings.router.js";
import preparationReturnSettingsRouter from "../../modules/preparation/preparation-settings/preparation-return-settings.router.js";
import preparationTicketSettingsRouter from "../../modules/preparation/preparation-settings/preparation-ticket-settings.router.js";
// PLATFORM_FINAL_AUDIT.md PA-07: broken controller import paths fixed and
// missing RBAC added in a prior pass; mounted here now that KDS is reachable.
import preparationTicketRouter from "../../modules/preparation/preparation-ticket/preparation-ticket.router.js";
import preparationSectionRouter from "../../modules/preparation/preparation-section/preparation-section.router.js";
import preparationReturnRouter from "../../modules/preparation/preparation-return/preparation-return.router.js";
// FryerOilLog module deleted (2026-07-20) — oil is now consumed through the generic
// ManualConsumption path like every other non-recipe-driven material.

// ========================
// PURCHASING
// ========================
import purchaseSettingsRouter from "../../modules/purchasing/purchasing-settings/purchase-settings.router.js";
// PLATFORM_FINAL_AUDIT.md PA-05: these 4 routers were fully coded but never
// mounted — there was no HTTP path to record a purchase at all. Mounted
// here after adding the missing authorize()/checkModuleEnabled() chain
// (they previously had authenticateToken only).
import purchaseInvoiceRouter from "../../modules/purchasing/purchase-invoice/purchase-invoice.router.js";
import purchaseReturnRouter from "../../modules/purchasing/purchase-return/purchase-return.router.js";
import supplierRouter from "../../modules/purchasing/supplier/supplier.router.js";
import supplierTransactionRouter from "../../modules/purchasing/supplier-transaction/supplier-transaction.router.js";
// Supply Chain & Commerce Platform V5: the 3-way-match procurement chain.
import purchaseOrderRouter from "../../modules/purchasing/purchase-order/purchase-order.router.js";
import goodsReceiptNoteRouter from "../../modules/purchasing/goods-receipt-note/goods-receipt-note.router.js";
import purchaseRequestRouter from "../../modules/purchasing/purchase-request/purchase-request.router.js";
import vendorLedgerRouter from "../../modules/purchasing/vendor-ledger/vendor-ledger.router.js";

// ========================
// SALES
// ========================
import orderRouter from "../../modules/sales/order/order.router.js";
import invoiceRouter from "../../modules/sales/invoice/invoice.router.js";
// ADR-001-SALES-PAYMENT-ARCHITECTURE.md Phase 1.
import paymentRouter from "../../modules/sales/payment/payment.router.js";
import orderSettingsRouter from "../../modules/sales/order-settings/order-settings.router.js";
import invoiceSettingsRouter from "../../modules/sales/invoice-settings/invoice-settings.router.js";
// PLATFORM_FINAL_AUDIT.md PA-13: coded but never mounted; missing RBAC fixed
// in these two routers before mounting here.
import salesReturnRouter from "../../modules/sales/sales-return/sales-return.router.js";
import promotionRouter from "../../modules/sales/promotion/promotion.router.js";
import salesReturnSettingsRouter from "../../modules/sales/rerturn-sales-settings/sales-return-settings.router.js";

// ========================
// SEATING
// ========================
import tableRouter from "../../modules/seating/table/table.router.js";
import reservationRouter from "../../modules/seating/reservation/reservation.router.js";

// ========================
// LOYALTY
// ========================
import loyaltyRouter from "../../modules/loyalty/customer-loyalty/customer-loyalty.router.js";
import loyaltySettingsRouter from "../../modules/loyalty/loyalty-settings/loyalty-settings.router.js";
// PLATFORM_FINAL_AUDIT.md PA-11: previously dead code — wrong controller
// import paths, a named import of a default-only export, single-arg
// authorize() calls, a broken service-layer import, and undefined
// validation schemas/controller method (all fixed in a prior pass of this
// audit). Mounted here now that both routers import and run cleanly.
import loyaltyRewardRouter from "../../modules/loyalty/loyalty-reward/loyalty-reward.router.js";
import loyaltyTransactionRouter from "../../modules/loyalty/loyalty-transaction/loyalty-transaction.router.js";
import auditLogRouter from "../../modules/audit-log/audit-log.router.js";

// ========================
// SYSTEM
// ========================
import discountSettingsRouter from "../../modules/system/discount-settings/discount-settings.router.js";
import notificationSettingsRouter from "../../modules/system/notification-settings/notification-settings.router.js";
import printSettingsRouter from "../../modules/system/print-settings/print-settings.router.js";
import serviceChargeSettingsRouter from "../../modules/system/service-charge-settings/service-charge.router.js";
import taxSettingsRouter from "../../modules/system/tax-settings/tax-config.router.js";


// ========================
// HEALTH CHECK
// ========================
router.get("/health", (_req, res) => {
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

// Organization
router.use("/organization/brand", brandRouter);
router.use("/organization/branches", branchRouter);
router.use("/organization/brand-settings", brandSettingsRouter);
router.use("/organization/branch-settings", branchSettingsRouter);
router.use("/organization/delivery-areas", deliveryAreaRouter);

// Accounting
router.use("/accounting/accounts", accountRouter);
router.use("/accounting/balances", accountBalanceRouter);
router.use("/accounting/periods", accountingPeriodRouter);
router.use("/accounting/settings", accountingSettingRouter);
router.use("/accounting/cost-centers", costCenterRouter);
router.use("/accounting/budgets", budgetRouter);
router.use("/accounting/journal-entries", journalEntryRouter);
router.use("/accounting/journal-lines", journalLineRouter);
router.use("/accounting/ledgers", ledgerRouter);
router.use("/accounting/financial-statements", financialStatementsRouter);

// Assets
router.use("/assets", assetRouter);
router.use("/assets/categories", assetCategoryRouter);
router.use("/assets/depreciation", assetDepreciationRouter);
router.use("/assets/disposal", assetDisposalRouter);
router.use("/assets/maintenance", assetMaintenanceRouter);
router.use("/assets/purchase-invoices", assetPurchaseInvoiceRouter);
router.use("/assets/transactions", assetTransactionsRouter);


// CRM
router.use("/crm/messages", messageRouter);
router.use("/crm/offline-customers", offlineCustomerRouter);
router.use("/crm/online-customers", onlineCustomerRouter);
// router.use("/crm/auth", customerAuthRouter);
// Finance
router.use("/finance/banks", bankAccountRouter);
router.use("/finance/cash-registers", cashRegisterRouter);
router.use("/finance/cash-transactions", cashTransactionRouter);
router.use("/finance/cash-transfers", cashTransferRouter);
router.use("/finance/cashier-shifts", cashierShiftRouter);
router.use("/expense/expenses", expenseRouter);
router.use("/expense/daily-expenses", dailyExpenseRouter);
router.use("/expense/recurring-templates", recurringExpenseTemplateRouter);
router.use("/finance/reports", financeReportsRouter);
router.use("/expense/reports", expenseReportsRouter);
router.use("/assets/reports", assetReportsRouter);
router.use("/accounting/executive-dashboard", executiveDashboardRouter);
router.use("/finance/payment-methods", paymentMethodRouter);

// HR
router.use("/hr/employees", employeeRouter);
router.use("/hr/departments", departmentRouter);
router.use("/hr/job-titles", jobTitleRouter);
router.use("/hr/attendance", attendanceRouter);
router.use("/hr/payroll", payrollRouter);
router.use("/hr/shifts", shiftRouter);
router.use("/hr/employee-settings", employeeSettingsRouter);
router.use("/hr/attendance-settings", attendanceSettingsRouter);
router.use("/hr/employee-financial-profiles", employeeFinancialProfileRouter);
router.use("/hr/employee-financial-transactions", employeeFinancialTransactionRouter);
router.use("/hr/employee-advances", employeeAdvanceRouter);
router.use("/hr/leave-requests", leaveRequestRouter);
router.use("/hr/payroll-settings", payrollSettingsRouter);
router.use("/hr/payroll-items", payrollItemRouter);
router.use("/hr/shift-settings", shiftSettingsRouter);

// IAM
router.use("/auth", authRouter);
router.use("/users", userAccountRouter);
router.use("/roles", roleRouter);
router.use("/auth-credentials", authCredentialRouter);
router.use("/authentication-settings", authenticationSettingsRouter);
router.use("/devices", deviceRouter);
router.use("/security-events", securityEventRouter);
router.use("/role-templates", roleTemplateRouter);

// Inventory
router.use("/inventory", inventoryRouter);
router.use("/stock-items", stockItemRouter);
router.use("/stock-categories", stockCategoryRouter);
router.use("/warehouses", warehouseRouter);
router.use("/inventory-settings", inventorySettingsRouter);
router.use("/warehouse-documents", warehouseDocumentRouter);
router.use("/stock-ledger", stockLedgerRouter);
router.use("/inventory-counts", inventoryCountRouter);
router.use("/stock-transfer-requests", stockTransferRequestRouter);
router.use("/manual-consumptions", manualConsumptionRouter);
router.use("/waste-records", wasteRecordRouter);

// Production
router.use("/production/orders", productionOrderRouter);
router.use("/production/recipes", productionRecipeRouter);
router.use("/production/records", productionRecordRouter);

// Menu
router.use("/menu/products", productRouter);
router.use("/menu/categories", menuCategoryRouter);
router.use("/menu/recipes", recipeRouter);
router.use("/menu/product-reviews", productReviewRouter);

// Preparation
router.use("/preparation/settings", preparationSettingsRouter);
router.use("/preparation/return-settings", preparationReturnSettingsRouter);
router.use("/preparation/ticket-settings", preparationTicketSettingsRouter);
router.use("/preparation/tickets", preparationTicketRouter);
router.use("/preparation/sections", preparationSectionRouter);
router.use("/preparation/returns", preparationReturnRouter);

// Purchasing
router.use("/purchasing/settings", purchaseSettingsRouter);
router.use("/purchasing/purchase-invoices", purchaseInvoiceRouter);
router.use("/purchasing/purchase-orders", purchaseOrderRouter);
router.use("/purchasing/goods-receipt-notes", goodsReceiptNoteRouter);
router.use("/purchasing/purchase-requests", purchaseRequestRouter);
router.use("/purchasing/vendor-ledger", vendorLedgerRouter);
router.use("/purchasing/purchase-returns", purchaseReturnRouter);
router.use("/purchasing/suppliers", supplierRouter);
router.use("/purchasing/supplier-transactions", supplierTransactionRouter);

// Sales
router.use("/sales/orders", orderRouter);
router.use("/sales/invoices", invoiceRouter);
router.use("/sales/payments", paymentRouter);
router.use("/sales/order-settings", orderSettingsRouter);
router.use("/sales/invoice-settings", invoiceSettingsRouter);
router.use("/sales/return-settings", salesReturnSettingsRouter);
router.use("/sales/returns", salesReturnRouter);
router.use("/sales/promotions", promotionRouter);

// Seating
router.use("/seating/tables", tableRouter);
router.use("/seating/reservations", reservationRouter);

/* ========================
   AUDIT LOG
======================== */
router.use("/audit-logs", auditLogRouter);

// Loyalty
router.use("/loyalty", loyaltyRouter);
router.use("/loyalty-settings", loyaltySettingsRouter);
router.use("/loyalty-rewards", loyaltyRewardRouter);
router.use("/loyalty-transactions", loyaltyTransactionRouter);

// System
router.use("/system/discount-settings", discountSettingsRouter);
router.use("/system/notification-settings", notificationSettingsRouter);
router.use("/system/print-settings", printSettingsRouter);
router.use("/system/service-charge-settings", serviceChargeSettingsRouter);
router.use("/system/tax-settings", taxSettingsRouter);

export default router;
