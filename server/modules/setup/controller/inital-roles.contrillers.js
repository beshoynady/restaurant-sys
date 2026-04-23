// seeds/initialRoles.js

import roleModel from "../models/employees/role.model.js";

const ALL_RESOURCES = [
  "Accounts",
  "AccountBalances",
  "AccountingPeriods",
  "Branches",
  "Brands",
  "Employees",
  "UserAccounts",
  "Products",
  "Orders",
  "Invoices",
  "Tables",
  "Reservations",
  "StockItems",
  "Inventory",
  "Warehouses",
  "Suppliers",
  "PurchaseInvoices",
  "SalesReturns",
  "Expenses",
  "CashRegisters",
  "CashTransactions",
];

const POS_RESOURCES = ["Orders", "Invoices", "Tables", "Reservations"];

const KITCHEN_RESOURCES = [
  "Products",
  "PreparationTickets",
  "PreparationSections",
  "PreparationReturns",
  "PreparationReturnSettings",
];

const INVENTORY_RESOURCES = [
  "StockItems",
  "StockCategories",
  "Inventory",
  "InventoryCounts",
  "StockLedgers",
  "StockTransferRequests",
  "Consumptions",
  "WarehouseDocuments",
  "Warehouses",
];

const ACCOUNTING_RESOURCES = [
  "Accounts",
  "JournalEntries",
  "Expenses",
  "CashTransactions",
];

// ------------------------
// Create Initial Roles
// ------------------------
export const createInitialRoles = async ({ brandId, branchId, userId }) => {
  const roles = [
    // 👑 OWNER
    {
      name: { EN: "Owner", AR: "المالك" },
      description: { EN: "Full system access", AR: "صلاحيات كاملة" },
      brand: brandId,
      branchAccess: [branchId],
      role: ALL_RESOURCES.map((r) => ({
        branch: branchId,
        resource: r,
        create: true,
        read: true,
        update: true,
        delete: true,
        viewReports: true,
        approve: true,
        reject: true,
      })),
      createdBy: userId,
    },

    // 🧑‍💼 MANAGER
    {
      name: { EN: "Manager", AR: "مدير" },
      description: {
        EN: "Manage daily operations",
        AR: "إدارة التشغيل اليومي",
      },
      brand: brandId,
      branchAccess: [branchId],
      role: ALL_RESOURCES.map((r) => ({
        branch: branchId,
        resource: r,
        create: true,
        read: true,
        update: true,
        delete: false,
        viewReports: true,
        approve: true,
      })),
      createdBy: userId,
    },

    // 💰 CASHIER
    {
      name: { EN: "Cashier", AR: "كاشير" },
      description: { EN: "Handle POS operations", AR: "إدارة الكاشير" },
      brand: brandId,
      branchAccess: [branchId],
      role: POS_RESOURCES.map((r) => ({
        branch: branchId,
        resource: r,
        create: true,
        read: true,
        update: true,
      })),
      createdBy: userId,
    },

    // 🍽️ WAITER
    {
      name: { EN: "Waiter", AR: "نادل" },
      description: { EN: "Take orders", AR: "تسجيل الطلبات" },
      brand: brandId,
      branchAccess: [branchId],
      role: [
        {
          branch: branchId,
          resource: "Orders",
          create: true,
          read: true,
        },
        {
          branch: branchId,
          resource: "Tables",
          read: true,
        },
      ],
      createdBy: userId,
    },

    // 👨‍🍳 CHEF
    {
      name: { EN: "Chef", AR: "شيف" },
      description: { EN: "Kitchen operations", AR: "تشغيل المطبخ" },
      brand: brandId,
      branchAccess: [branchId],
      role: KITCHEN_RESOURCES.map((r) => ({
        branch: branchId,
        resource: r,
        read: true,
        update: true,
      })),
      createdBy: userId,
    },

    // 📦 INVENTORY MANAGER
    {
      name: { EN: "Inventory Manager", AR: "مسؤول مخزون" },
      description: { EN: "Manage inventory", AR: "إدارة المخزون" },
      brand: brandId,
      branchAccess: [branchId],
      role: INVENTORY_RESOURCES.map((r) => ({
        branch: branchId,
        resource: r,
        create: true,
        read: true,
        update: true,
        delete: true,
      })),
      createdBy: userId,
    },

    // 📊 ACCOUNTANT
    {
      name: { EN: "Accountant", AR: "محاسب" },
      description: { EN: "Handle financials", AR: "إدارة الحسابات" },
      brand: brandId,
      branchAccess: [branchId],
      role: ACCOUNTING_RESOURCES.map((r) => ({
        branch: branchId,
        resource: r,
        create: true,
        read: true,
        update: true,
        viewReports: true,
      })),
      createdBy: userId,
    },
  ];

  return await roleModel.insertMany(roles);
};
