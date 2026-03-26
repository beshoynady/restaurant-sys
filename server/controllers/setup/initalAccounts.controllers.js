// seeds/chartOfAccounts.js

import accountModel from "../models/account.model.js";

export const createChartOfAccounts = async ({
  brandId,
}) => {
  const accounts = [
    // =========================
    // ASSETS
    // =========================
    {
      code: "10000",
      name: { EN: "Assets", AR: "الأصول" },
      category: "Asset",
      normalBalance: "Debit",
      isGroup: true,
    },
    {
      code: "11000",
      name: { EN: "Current Assets", AR: "الأصول المتداولة" },
      category: "Asset",
      parentCode: "10000",
      normalBalance: "Debit",
      isGroup: true,
    },
    {
      code: "11100",
      name: { EN: "Cash", AR: "النقدية" },
      category: "Asset",
      parentCode: "11000",
      systemRole: "CASH",
      normalBalance: "Debit",
    },
    {
      code: "11200",
      name: { EN: "Bank", AR: "البنك" },
      category: "Asset",
      parentCode: "11000",
      systemRole: "BANK",
      normalBalance: "Debit",
    },
    {
      code: "11300",
      name: { EN: "Accounts Receivable", AR: "العملاء" },
      category: "Asset",
      parentCode: "11000",
      systemRole: "CUSTOMER",
      normalBalance: "Debit",
      isControlAccount: true,
    },
    {
      code: "11400",
      name: { EN: "Inventory", AR: "المخزون" },
      category: "Asset",
      parentCode: "11000",
      systemRole: "INVENTORY",
      normalBalance: "Debit",
      isControlAccount: true,
    },

    // =========================
    // LIABILITIES
    // =========================
    {
      code: "20000",
      name: { EN: "Liabilities", AR: "الالتزامات" },
      category: "Liability",
      normalBalance: "Credit",
      isGroup: true,
    },
    {
      code: "21000",
      name: { EN: "Current Liabilities", AR: "الالتزامات المتداولة" },
      category: "Liability",
      parentCode: "20000",
      normalBalance: "Credit",
      isGroup: true,
    },
    {
      code: "21100",
      name: { EN: "Accounts Payable", AR: "الموردين" },
      category: "Liability",
      parentCode: "21000",
      systemRole: "SUPPLIER",
      normalBalance: "Credit",
      isControlAccount: true,
    },
    {
      code: "21200",
      name: { EN: "VAT Payable", AR: "ضريبة القيمة المضافة" },
      category: "Liability",
      parentCode: "21000",
      systemRole: "VAT_OUTPUT",
      normalBalance: "Credit",
    },

    // =========================
    // EQUITY
    // =========================
    {
      code: "30000",
      name: { EN: "Equity", AR: "حقوق الملكية" },
      category: "Equity",
      normalBalance: "Credit",
      isGroup: true,
    },
    {
      code: "31000",
      name: { EN: "Capital", AR: "رأس المال" },
      category: "Equity",
      parentCode: "30000",
      normalBalance: "Credit",
    },

    // =========================
    // REVENUE
    // =========================
    {
      code: "40000",
      name: { EN: "Revenue", AR: "الإيرادات" },
      category: "Revenue",
      normalBalance: "Credit",
      isGroup: true,
    },
    {
      code: "41000",
      name: { EN: "Sales Revenue", AR: "إيرادات المبيعات" },
      category: "Revenue",
      parentCode: "40000",
      systemRole: "REVENUE_OPERATING",
      normalBalance: "Credit",
    },

    // =========================
    // EXPENSES
    // =========================
    {
      code: "50000",
      name: { EN: "Expenses", AR: "المصروفات" },
      category: "Expense",
      normalBalance: "Debit",
      isGroup: true,
    },
    {
      code: "51000",
      name: { EN: "Cost of Goods Sold", AR: "تكلفة المبيعات" },
      category: "Expense",
      parentCode: "50000",
      systemRole: "COGS",
      normalBalance: "Debit",
    },
    {
      code: "52000",
      name: { EN: "Salaries", AR: "الرواتب" },
      category: "Expense",
      parentCode: "50000",
      systemRole: "PAYROLL_EXPENSE",
      normalBalance: "Debit",
    },
  ];

  // =========================
  // تحويل parentCode → ObjectId
  // =========================
  const created = [];

  for (const acc of accounts) {
    let parentId = null;

    if (acc.parentCode) {
      const parent = created.find((a) => a.code === acc.parentCode);
      parentId = parent?._id;
    }

    const newAcc = await accountModel.create({
      ...acc,
      parent: parentId,
      brand: brandId,
      createdBy: userId,
      isSystem: true,
    });

    created.push(newAcc);
  }

  return created;
};