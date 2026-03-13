import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import helmet from "helmet"; // Security middleware
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import { notFound } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";

// Import database connection
import connectdb from "./database/connectdb.js";

/****************************************************
 * CORE ROUTES
 * --------------------------------------------------
 * Core system modules:
 * - Brand (Restaurant)
 * - Branches
 * - Delivery Areas
 ****************************************************/
import routeBrand from "./router/core/brand.router.js";
import routeBranch from "./router/core/branch.router.js";
import routeDeliveryArea from "./router/core/delivery-area.router.js";

/****************************************************
 * AUTH ROUTES
 * --------------------------------------------------
 * User authentication and basic permission control
 ****************************************************/
import routeAuth from "./router/auth/auth.router.js";

/****************************************************
 * EMPLOYEES & HR ROUTES
 * --------------------------------------------------
 * Employee management:
 * - Employee data
 * - Attendance & shifts
 * - Payroll
 * - Employee financial transactions
 ****************************************************/
import routeEmployee from "./router/employees/employee.router.js";
import routeDepartment from "./router/employees/department.router.js";
import routeJobTitle from "./router/employees/job-title.router.js";
import routePermission from "./router/employees/permission.router.js";

import routeAttendance from "./router/employees/attendance-record.router.js";
import routeShift from "./router/employees/shift.router.js";
import routePayroll from "./router/employees/payroll.router.js";
import routeEmployeeTransactions from "./router/employees/employee-financial-transaction.router.js";

/****************************************************
 * CUSTOMERS ROUTES
 * --------------------------------------------------
 * Customer management:
 * - Messages
 * - Online / Offline customers
 ****************************************************/
import routeMessage from "./router/customers/message.router.js";
import routeOfflineCustomer from "./router/customers/offline-customer.router.js";
import routeOnlineCustomer from "./router/customers/online-customer.router.js";

/******************************************************
 * LOYALTY ROUTES
 * ----------------------------------------------------
 * Loyalty program management:
 */
import customerLoyaltyRoutes from "./router/loyalty/customer-loyalty.router.js";
import loyaltySettingsRoutes from "./router/loyalty/loyalty-settings.router.js";
import loyaltyReward from "./router/loyalty/loyalty-reward.router.js";
import loyaltyTransactionRoutes from "./router/loyalty/loyalty-transaction.router.js";

/****************************************************
 * MENU ROUTES
 * --------------------------------------------------
 * Menu management:
 * - Categories
 * - Products
 * - Recipes
 ****************************************************/
import routeMenuCategory from "./router/menu/menu-category.router.js";
import routeProduct from "./router/menu/product.router.js";
import routeRecipe from "./router/menu/recipe.router.js";
import menuSettingsRoutes from "./router/menu/menu-settings.router.js";

/****************************************************
 * KITCHEN ROUTES
 * --------------------------------------------------
 * Kitchen management:
 * - Preparation sections
 * - Preparation tickets
 ****************************************************/
import routePreparationSection from "./router/kitchen/preparation-section.router.js";
import routePreparationTicket from "./router/kitchen/preparation-ticket.router.js";

/****************************************************
 * SEATING & RESERVATION ROUTES
 * --------------------------------------------------
 * Table and reservation management
 ****************************************************/
import routeTable from "./router/seating/table.router.js";
import routeReservation from "./router/seating/reservation.router.js";

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
import routeCategoryStock from "./router/inventory/category-stock.router.js";
import routeStockItems from "./router/inventory/stock-item.router.js";
import routeStockMovement from "./router/inventory/stock-movement.router.js";
import routeConsumption from "./router/inventory/consumption.router.js";
import routeStore from "./router/inventory/store.router.js";
import inventorySettingsRoutes from "./router/inventory/inventory-settings.router.js";

/****************************************************
 * PURCHASING ROUTES
 * --------------------------------------------------
 * Supplier management and purchase invoices
 ****************************************************/
import routeSupplier from "./router/purchasing/supplier.router.js";
import routeSupplierTransaction from "./router/purchasing/supplier-transaction.router.js";
import routePurchase from "./router/purchasing/purchase.router.js";
import routePurchaseReturn from "./router/purchasing/purchase-return-invoice.router.js";

/****************************************************
 * CASH ROUTES
 * --------------------------------------------------
 * Cash management:
 * - Cash registers
 * - Cash movements
 * - Expenses
 ****************************************************/
import routeCashRegister from "./router/cash/cash-register.router.js";
import routeCashMovement from "./router/cash/cash-movement.router.js";
import routeExpense from "./router/cash/expense.router.js";
import routeDailyExpense from "./router/cash/daily-expense.router.js";

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
import accountRoutes from "./router/accounting/account.router.js";
import journalEntryRoutes from "./router/accounting/journal-entry.router.js";
import ledgerRoutes from "./router/accounting/ledger.router.js";
import accountingPeriodRoutes from "./router/accounting/accounting-period.router.js";
import reportsRoutes from "./router/accounting/reports.router.js";

/****************************************************
 * SYSTEM SETTINGS ROUTES
 * --------------------------------------------------
 * General system settings
 ****************************************************/
import branchSettingsRoutes from "./router/system/branch-settings.router.js";
import discountSettingRoutes from "./router/system/discount-setting.router.js";
import generalSettingsRoutes from "./router/system/general-settings.router.js";
import invoiceSettingsRoutes from "./router/system/invoice-settings.router.js";
import notificationSettingsRoutes from "./router/system/notification-settings.router.js";
import orderSettingsRoutes from "./router/system/order-settings.router.js";
import printSettingsRoutes from "./router/system/print-settings.router.js";
import serviceChargeRoutes from "./router/system/service-charge.router.js";
import shiftSettingsRoutes from "./router/system/shift-settings.router.js";
import taxConfigRoutes from "./router/system/tax-config.router.js";
import paymentMethodRoutes from "./router/system/payment-method.router.js";

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectdb();

const app = express();
const frontEnd = process.env.FRONT_END_URL;

// -------------------
// SECURITY MIDDLEWARE
// -------------------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

// -------------------
// MIDDLEWARE SETUP
// -------------------
app.use(express.json({ limit: "100kb" })); // Limit request body size
app.use(cookieParser()); // Parse cookies

// -------------------
// CORS CONFIG
// -------------------
const allowedOrigins = ["https://restaurant.menufy.tech", frontEnd];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// -------------------
// STATIC FILES
// -------------------
app.use("/", express.static("public"));
app.use("/images", express.static("images"));

// -------------------
// TEST ENDPOINT
// -------------------
app.get("/", (req, res) => res.send("Welcome to the server!"));

// -------------------
// RATE LIMITING
// -------------------
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 100, // max 100 requests per minute
  standardHeaders: "draft-7",
  legacyHeaders: false,
  trustProxy: false,
});
app.use("/api", limiter);

// -------------------
// API ROUTES
// -------------------
// Core
app.use("/api/restaurant", routeBrand);
app.use("/api/branch", routeBranch);
app.use("/api/delivery-area", routeDeliveryArea);

// Auth
app.use("/api/auth", routeAuth);
app.use("/api/permission", routePermission);

// Employees & HR
app.use("/api/employee", routeEmployee);
app.use("/api/job-title", routeJobTitle);
app.use("/api/department", routeDepartment);
app.use("/api/attendance", routeAttendance);
app.use("/api/shift", routeShift);
app.use("/api/payroll", routePayroll);
app.use("/api/employee-transactions", routeEmployeeTransactions);

// Customers
app.use("/api/customers/offline", routeOfflineCustomer);
app.use("/api/customers/online", routeOnlineCustomer);
app.use("/api/message", routeMessage);

// Loyalty
app.use("/api/loyalty", customerLoyaltyRoutes);
app.use("/api/loyalty/transactions", loyaltyTransactionRoutes);
app.use("/api/loyalty/rewards", loyaltyReward);
app.use("/api/loyalty/settings", loyaltySettingsRoutes);
// Menu
app.use("/api/menu/categories", routeMenuCategory);
app.use("/api/menu/products", routeProduct);
app.use("/api/menu/recipes", routeRecipe);
app.use("/api/menu/settings", menuSettingsRoutes);

// Kitchen & Production
app.use("/api/kitchen/preparation-sections", routePreparationSection);
app.use("/api/kitchen/preparation-tickets", routePreparationTicket);

// Seating & Orders
app.use("/api/table", routeTable);
app.use("/api/reservation", routeReservation);

// Inventory
app.use("/api/inventory/stores", routeStore);
app.use("/api/inventory/categories", routeCategoryStock);
app.use("/api/inventory/items", routeStockItems);
app.use("/api/inventory/movements", routeStockMovement);
app.use("/api/inventory/consumption", routeConsumption);
app.use("/api/inventory/settings", inventorySettingsRoutes);

// Purchasing
app.use("/api/suppliers", routeSupplier);
app.use("/api/suppliers/transactions", routeSupplierTransaction);
app.use("/api/purchases/invoices", routePurchase);
app.use("/api/purchases/returns", routePurchaseReturn);

// Cash & Expenses
app.use("/api/cash/registers", routeCashRegister);
app.use("/api/cash/movements", routeCashMovement);
app.use("/api/expenses", routeExpense);
app.use("/api/expenses/daily", routeDailyExpense);

// Accounting
app.use("/api/accounting/accounts", accountRoutes);
app.use("/api/accounting/journal-entries", journalEntryRoutes);
app.use("/api/accounting/ledger", ledgerRoutes);
app.use("/api/accounting/periods", accountingPeriodRoutes);

// Reports
app.use("/api/reports", reportsRoutes);

// System settings
app.use("/api/settings/general", generalSettingsRoutes);
app.use("/api/settings/branch", branchSettingsRoutes);
app.use("/api/settings/notification", notificationSettingsRoutes);
app.use("/api/settings/order", orderSettingsRoutes);
app.use("/api/settings/payment-methods", paymentMethodRoutes);

app.use(notFound);
app.use(errorHandler);

// -------------------
// HTTP SERVER
// -------------------
const server = http.createServer(app);

// -------------------
// SOCKET.IO SETUP
// -------------------
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
});

// Namespaces
const cashierNamespace = io.of("/cashier");
const kitchenNamespace = io.of("/kitchen");
const barNamespace = io.of("/bar");
const grillNamespace = io.of("/grill");
const waiterNamespace = io.of("/waiter");

// Cashier connections
cashierNamespace.on("connection", (socket) => {
  socket.on("neworder", (notification) =>
    cashierNamespace.emit("neworder", notification),
  );
  socket.on("disconnect", () => {});
});

// Kitchen connections
kitchenNamespace.on("connection", (socket) => {
  socket.on("orderkitchen", (notification) =>
    kitchenNamespace.emit("orderkitchen", notification),
  );
  socket.on("disconnect", () => {});
});

// Bar connections
barNamespace.on("connection", (socket) => {
  socket.on("orderBar", (notification) =>
    barNamespace.emit("orderBar", notification),
  );
  socket.on("disconnect", () => {});
});

// Grill connections
grillNamespace.on("connection", (socket) => {
  socket.on("orderGrill", (notification) =>
    grillNamespace.emit("orderGrill", notification),
  );
  socket.on("disconnect", () => {});
});

// Waiter connections
waiterNamespace.on("connection", (socket) => {
  socket.on("orderReady", (notification) =>
    waiterNamespace.emit("orderReady", notification),
  );
  socket.on("helprequest", (notification) =>
    waiterNamespace.emit("helprequest", notification),
  );
  socket.on("orderwaiter", (notification) =>
    waiterNamespace.emit("orderwaiter", notification),
  );
  socket.on("disconnect", () => {});
});

// -------------------
// START SERVER
// -------------------
const port = process.env.PORT || 8000;
server.listen(port, () => {
  console.log(
    `🚀 Server is running on port ${port} in ${process.env.NODE_ENV} mode`,
  );
});
