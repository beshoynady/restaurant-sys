import express from "express";
const router = express.Router();


/****************************************************
 * SETUP ROUTES
 * --------------------------------------------------
 * Initial setup and configuration for new brands
 ****************************************************/
import initialSetupRoutes from "./setup/initialSetup.router.js";

/****************************************************
 * CORE ROUTES
 * --------------------------------------------------
 * Core system modules:
 * - Brand (Restaurant)
 * - Branches
 * - Delivery Areas
 ****************************************************/
import routeBrand from "./core/brand.router.js";
import routeBranch from "./core/branch.router.js";
import routeDeliveryArea from "./core/delivery-area.router.js";

/****************************************************
 * AUTH ROUTES
 * --------------------------------------------------
 * User authentication and basic permission control
 ****************************************************/
// import routeUserAcount from "./employees/user-account.router.js";
import routeUserAuth from "./employees/user-auth.router.js";

/****************************************************
 * EMPLOYEES & HR ROUTES
 * --------------------------------------------------
 * Employee management:
 * - Employee data
 * - Attendance & shifts
 * - Payroll
 * - Employee financial transactions
 ****************************************************/
import routeEmployee from "./employees/employee.router.js";
import routeDepartment from "./employees/department.router.js";
import routeJobTitle from "./employees/job-title.router.js";
import routePermission from "./employees/role.router.js";
import routeAttendance from "./employees/attendance-record.router.js";
import routeShift from "./employees/shift.router.js";
import routePayroll from "./employees/payroll.router.js";
import routeEmployeeTransactions from "./employees/employee-financial-transaction.router.js";

/****************************************************
 * CUSTOMERS ROUTES
 * --------------------------------------------------
 * Customer management:
 * - Messages
 * - Online / Offline customers
 ****************************************************/
import routeMessage from "./customers/message.router.js";
import routeOfflineCustomer from "./customers/offline-customer.router.js";
import routeOnlineCustomer from "./customers/online-customer.router.js";

/******************************************************
 * LOYALTY ROUTES
 * ----------------------------------------------------
 * Loyalty program management:
 */
import customerLoyaltyRoutes from "./loyalty/customer-loyalty.router.js";
import loyaltySettingsRoutes from "./loyalty/loyalty-settings.router.js";
import loyaltyReward from "./loyalty/loyalty-reward.router.js";
import loyaltyTransactionRoutes from "./loyalty/loyalty-transaction.router.js";

/****************************************************
 * MENU ROUTES
 * --------------------------------------------------
 * Menu management:
 * - Categories
 * - Products
 * - Recipes
 ****************************************************/
import routeMenuCategory from "./menu/menu-category.router.js";
import routeProduct from "./menu/product.router.js";
import routeRecipe from "./menu/recipe.router.js";
import menuSettingsRoutes from "./menu/menu-settings.router.js";

/****************************************************
 * KITCHEN ROUTES
 * --------------------------------------------------
 * Kitchen management:
 * - Preparation sections
 * - Preparation tickets
 ****************************************************/
import routePreparationSection from "./kitchen/preparation-section.router.js";
import routePreparationTicket from "./kitchen/preparation-ticket.router.js";

/****************************************************
 * SEATING & RESERVATION ROUTES
 * --------------------------------------------------
 * Table and reservation management
 ****************************************************/
import routeTable from "./seating/table.router.js";
import routeReservation from "./seating/reservation.router.js";

/****************************************************
 * INVENTORY ROUTES
 * --------------------------------------------------
 * Inventory management:
 * - Categories
 * - Items
 * - Movements
 * - Consumption
 * - Stores
 ****************************************************/
import routeStockCategory from "./inventory/stock-category.router.js";
import routeStockItems from "./inventory/stock-item.router.js";
import routeStockMovement from "./inventory/stock-ledger.router.js";
import routeConsumption from "./inventory/consumption.router.js";
import routeStore from "./inventory/inventory.router.js";
import inventorySettingsRoutes from "./inventory/inventory-settings.router.js";

/****************************************************
 * PURCHASING ROUTES
 * --------------------------------------------------
 * Supplier management and purchase invoices
 ****************************************************/
import routeSupplier from "./purchasing/supplier.router.js";
import routeSupplierTransaction from "./purchasing/supplier-transaction.router.js";
import routePurchase from "./purchasing/purchase-invoice.router.js";
import routePurchaseReturn from "./purchasing/purchase-return.router.js";

/****************************************************
 * CASH ROUTES
 * --------------------------------------------------
 * Cash management:
 * - Cash registers
 * - Cash transactions
 * - Expenses
 ****************************************************/
import routeCashRegister from "./cash/cash-register.router.js";
import routecashTransaction from "./cash/cash-transaction.router.js";

import routeExpense from "./expenses/expense.router.js";
import routeDailyExpense from "./expenses/daily-expense.router.js";

/****************************************************
 * ACCOUNTING ROUTES
 * --------------------------------------------------
 * Accounting modules:
 * - Accounts
 * - Journal entries
 * - Ledger
 * - Accounting periods
 * - Reports
 ****************************************************/
import accountRoutes from "./accounting/account.router.js";
import journalEntryRoutes from "./accounting/journal-entry.router.js";
import ledgerRoutes from "./accounting/ledger.router.js";
import accountingPeriodRoutes from "./accounting/accounting-period.router.js";
import reportsRoutes from "./accounting/reports.router.js";

/****************************************************
 * SYSTEM SETTINGS ROUTES
 * --------------------------------------------------
 * General system settings
 ****************************************************/
import branchSettingsRoutes from "./core/branch-settings.router.js";
import discountSettingRoutes from "./system/discount-settings.router.js";
import invoiceSettingsRoutes from "./sales/invoice-settings.router.js";
import notificationSettingsRoutes from "./system/notification-settings.router.js";
import orderSettingsRoutes from "./system/order-settings.router.js";
import printSettingsRoutes from "./system/print-settings.router.js";
import serviceChargeRoutes from "./system/service-charge.router.js";
import shiftSettingsRoutes from "./system/shift-settings.router.js";
import taxConfigRoutes from "./system/tax-config.router.js";
import paymentMethodRoutes from "./payments/payment-method.router.js";



// -------------------
// API ROUTES
// -------------------
// Initial setup route (must be before all other routes to prevent access if not set up)
router.use("/api/setup", initialSetupRoutes); // Initial setup routes (must be before all other routes to prevent access if not set up)
// Core
router.use("/api/restaurant", routeBrand);
router.use("/api/branch", routeBranch);
router.use("/api/delivery-area", routeDeliveryArea);

// Auth
router.use("/api/auth", routeUserAuth);
router.use("/api/permission", routePermission);

// Employees & HR
router.use("/api/employee", routeEmployee);
// router.use("/api/user-account", routeUserAcount);
router.use("/api/job-title", routeJobTitle);
router.use("/api/department", routeDepartment);
router.use("/api/attendance", routeAttendance);
router.use("/api/shift", routeShift);
router.use("/api/payroll", routePayroll);
router.use("/api/employee-transactions", routeEmployeeTransactions);

// Customers
router.use("/api/customers/offline", routeOfflineCustomer);
router.use("/api/customers/online", routeOnlineCustomer);
router.use("/api/message", routeMessage);

// Loyalty
router.use("/api/loyalty", customerLoyaltyRoutes);
router.use("/api/loyalty/transactions", loyaltyTransactionRoutes);
router.use("/api/loyalty/rewards", loyaltyReward);
router.use("/api/loyalty/settings", loyaltySettingsRoutes);
// Menu
router.use("/api/menu/categories", routeMenuCategory);
router.use("/api/menu/products", routeProduct);
router.use("/api/menu/recipes", routeRecipe);
router.use("/api/menu/settings", menuSettingsRoutes);

// Kitchen & Production
router.use("/api/kitchen/preparation-sections", routePreparationSection);
router.use("/api/kitchen/preparation-tickets", routePreparationTicket);

// Seating & Orders
router.use("/api/table", routeTable);
router.use("/api/reservation", routeReservation);

// Inventory
router.use("/api/inventory/stores", routeStore);
router.use("/api/inventory/categories", routeStockCategory);
router.use("/api/inventory/items", routeStockItems);
router.use("/api/inventory/transactions", routeStockMovement);
router.use("/api/inventory/consumption", routeConsumption);
router.use("/api/inventory/settings", inventorySettingsRoutes);

// Purchasing
router.use("/api/suppliers", routeSupplier);
router.use("/api/suppliers/transactions", routeSupplierTransaction);
router.use("/api/purchases/invoices", routePurchase);
router.use("/api/purchases/returns", routePurchaseReturn);

// Cash
router.use("/api/cash/registers", routeCashRegister);
router.use("/api/cash/transactions", routecashTransaction);

// Expenses
router.use("/api/expenses", routeExpense);
router.use("/api/expenses/daily", routeDailyExpense);

// Accounting
router.use("/api/accounting/accounts", accountRoutes);
router.use("/api/accounting/journal-entries", journalEntryRoutes);
router.use("/api/accounting/ledger", ledgerRoutes);
router.use("/api/accounting/periods", accountingPeriodRoutes);

// Reports
router.use("/api/reports", reportsRoutes);

// System settings
router.use("/api/settings/branch", branchSettingsRoutes);
router.use("/api/settings/notification", notificationSettingsRoutes);
router.use("/api/settings/order", orderSettingsRoutes);
router.use("/api/settings/payment-methods", paymentMethodRoutes);
router.use("/api/settings/discount", discountSettingRoutes);
router.use("/api/settings/invoice", invoiceSettingsRoutes);
router.use("/api/settings/print", printSettingsRoutes);
router.use("/api/settings/service-charge", serviceChargeRoutes);
router.use("/api/settings/shift", shiftSettingsRoutes);
router.use("/api/settings/tax", taxConfigRoutes);


export default router;