const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const helmet = require("helmet"); // Security middleware
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const { notFound } = require("./middlewares/notFound.js");
const { errorHandler } = require("./middlewares/errorHandler.js");

// Import database connection
const connectdb = require("./database/connectdb.js");

/****************************************************
 * CORE ROUTES
 * --------------------------------------------------
 * Core system modules:
 * - Brand (Restaurant)
 * - Branches
 * - Delivery Areas
 ****************************************************/
const routeBrand = require("./router/core/brand.router.js");
const routeBranch = require("./router/core/branch.router.js");
const routeDeliveryArea = require("./router/core/delivery-area.router.js");

/****************************************************
 * AUTH ROUTES
 * --------------------------------------------------
 * User authentication and basic permission control
 ****************************************************/
const routeAuth = require("./router/auth/auth.router.js");

/****************************************************
 * EMPLOYEES & HR ROUTES
 * --------------------------------------------------
 * Employee management:
 * - Employee data
 * - Attendance & shifts
 * - Payroll
 * - Employee financial transactions
 ****************************************************/
const routeEmployee = require("./router/employees/employee.router.js");
const routeDepartment = require("./router/employees/department.router.js");
const routeJobTitle = require("./router/employees/job-title.router.js");
const routePermission = require("./router/employees/permission.router.js");

const routeAttendance = require("./router/employees/attendance-record.router.js");
const routeShift = require("./router/employees/shift.router.js");
const routePayroll = require("./router/employees/payroll.router.js");
const routeEmployeeTransactions = require("./router/employees/employee-financial-transaction.router.js");

/****************************************************
 * CUSTOMERS ROUTES
 * --------------------------------------------------
 * Customer management:
 * - Messages
 * - Online / Offline customers
 ****************************************************/
const routeMessage = require("./router/customers/message.router.js");
const routeOfflineCustomer = require("./router/customers/offline-customer.router.js");
const routeOnlineCustomer = require("./router/customers/online-customer.router.js");

/******************************************************
 * LOYALTY ROUTES
 * ----------------------------------------------------
 * Loyalty program management:
 */
const customerLoyaltyRoutes = require("./router/loyalty/customer-loyalty.router.js");
const loyaltySettingsRoutes = require("./router/loyalty/loyalty-settings.router.js");
const loyaltyReward = require("./router/loyalty/loyalty-reward.router.js");
const loyaltyTransactionRoutes = require("./router/loyalty/loyalty-transaction.router.js");

/****************************************************
 * MENU ROUTES
 * --------------------------------------------------
 * Menu management:
 * - Categories
 * - Products
 * - Recipes
 ****************************************************/
const routeMenuCategory = require("./router/menu/menu-category.router.js");
const routeProduct = require("./router/menu/product.router.js");
const routeRecipe = require("./router/menu/recipe.router.js");
const menuSettingsRoutes = require("./router/menu/menu-settings.router.js");

/****************************************************
 * KITCHEN ROUTES
 * --------------------------------------------------
 * Kitchen management:
 * - Preparation sections
 * - Preparation tickets
 ****************************************************/
const routePreparationSection = require("./router/kitchen/preparation-section.router.js");
const routePreparationTicket = require("./router/kitchen/preparation-ticket.router.js");

/****************************************************
 * SEATING & RESERVATION ROUTES
 * --------------------------------------------------
 * Table and reservation management
 ****************************************************/
const routeTable = require("./router/seating/table.router.js");
const routeReservation = require("./router/seating/reservation.router.js");

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
const routeCategoryStock = require("./router/inventory/category-stock.router.js");
const routeStockItems = require("./router/inventory/stock-item.router.js");
const routeStockMovement = require("./router/inventory/stock-movement.router.js");
const routeConsumption = require("./router/inventory/consumption.router.js");
const routeStore = require("./router/inventory/store.router.js");
const inventorySettingsRoutes = require("./router/inventory/inventory-settings.router.js");

/****************************************************
 * PURCHASING ROUTES
 * --------------------------------------------------
 * Supplier management and purchase invoices
 ****************************************************/
const routeSupplier = require("./router/purchasing/supplier.router.js");
const routeSupplierTransaction = require("./router/purchasing/supplier-transaction.router.js");
const routePurchase = require("./router/purchasing/purchase.router.js");
const routePurchaseReturn = require("./router/purchasing/purchase-return-invoice.router.js");

/****************************************************
 * CASH ROUTES
 * --------------------------------------------------
 * Cash management:
 * - Cash registers
 * - Cash movements
 * - Expenses
 ****************************************************/
const routeCashRegister = require("./router/cash/cash-register.router.js");
const routeCashMovement = require("./router/cash/cash-movement.router.js");
const routeExpense = require("./router/cash/expense.router.js");
const routeDailyExpense = require("./router/cash/daily-expense.router.js");

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
const accountRoutes = require("./router/accounting/account.router.js");
const journalEntryRoutes = require("./router/accounting/journal-entry.router.js");
const ledgerRoutes = require("./router/accounting/ledger.router.js");
const accountingPeriodRoutes = require("./router/accounting/accounting-period.router.js");
const reportsRoutes = require("./router/accounting/reports.router.js");

/****************************************************
 * SYSTEM SETTINGS ROUTES
 * --------------------------------------------------
 * General system settings
 ****************************************************/
const branchSettingsRoutes = require("./router/system/branch-settings.router.js");
const discountSettingRoutes = require("./router/system/discount-setting.router.js");
const generalSettingsRoutes = require("./router/system/general-settings.router.js");
const invoiceSettingsRoutes = require("./router/system/invoice-settings.router.js");
const notificationSettingsRoutes = require("./router/system/notification-settings.router.js");
const orderSettingsRoutes = require("./router/system/order-settings.router.js");
const printSettingsRoutes = require("./router/system/print-settings.router.js");
const serviceChargeRoutes = require("./router/system/service-charge.router.js");
const shiftSettingsRoutes = require("./router/system/shift-settings.router.js");
const taxConfigRoutes = require("./router/system/tax-config.router.js");
const paymentMethodRoutes = require("./router/system/payment-method.router.js");

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
