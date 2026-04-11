import AccountModel from "../../../models/accounting/account.model.js";

/**
 * =====================================================
 * CHART OF ACCOUNTS (Restaurant Standard - ERP Ready)
 * =====================================================
 * - Hierarchical structure
 * - Matches Account Schema
 * - Includes systemRole for automation
 * - Includes reportGroup for financial reports
 */

const ACCOUNTS_TREE = [
  // ================= ASSETS =================
  {
    code: "1000",
    name: { en: "Assets", ar: "الأصول" },
    category: "Asset",
    normalBalance: "Debit",
    isGroup: true,
    isSystemRole: true,
    children: [
      {
        code: "1100",
        name: { en: "Current Assets", ar: "الأصول المتداولة" },
        category: "Asset",
        normalBalance: "Debit",
        reportGroup: "CURRENT_ASSET",
        isGroup: true,
        isSystemRole: true,
        children: [
          {
            code: "1110",
            name: { en: "Cash on Hand", ar: "الصندوق" },
            systemRole: "CASH",
            normalBalance: "Debit",
            isControlAccount: true,
            isSystemRole: true,
          },
          {
            code: "1120",
            name: { en: "Bank Accounts", ar: "الحسابات البنكية" },
            systemRole: "BANK",
            normalBalance: "Debit",
            isControlAccount: true,
            isSystemRole: true,
          },
          {
            code: "1130",
            name: { en: "Inventory", ar: "المخزون" },
            systemRole: "INVENTORY",
            normalBalance: "Debit",
            isControlAccount: true,
            isSystemRole: true,
          },
          {
            code: "1140",
            name: { en: "Accounts Receivable", ar: "العملاء" },
            systemRole: "CUSTOMER",
            normalBalance: "Debit",
            isControlAccount: true,
            isSystemRole: true,
          },
          {
            code: "1150",
            name: { en: "VAT Input", ar: "ضريبة مدخلة" },
            systemRole: "VAT_INPUT",
            normalBalance: "Debit",
            isSystemRole: true,
          },
        ],
      },

      {
        code: "1200",
        name: { en: "Fixed Assets", ar: "الأصول الثابتة" },
        category: "Asset",
        normalBalance: "Debit",
        reportGroup: "FIXED_ASSET",
        isGroup: true,
        isSystemRole: true,
      },
    ],
  },

  // ================= LIABILITIES =================
  {
    code: "2000",
    name: { en: "Liabilities", ar: "الخصوم" },
    category: "Liability",
    normalBalance: "Credit",
    isGroup: true,
    isSystemRole: true,
    children: [
      {
        code: "2100",
        name: { en: "Current Liabilities", ar: "الخصوم المتداولة" },
        category: "Liability",
        normalBalance: "Credit",
        reportGroup: "CURRENT_LIABILITY",
        isGroup: true,
        isSystemRole: true,
        children: [
          {
            code: "2110",
            name: { en: "Accounts Payable", ar: "الموردين" },
            systemRole: "SUPPLIER",
            normalBalance: "Credit",
            isControlAccount: true,
            isSystemRole: true,
          },
          {
            code: "2120",
            name: { en: "VAT Output", ar: "ضريبة مخرجة" },
            systemRole: "VAT_OUTPUT",
            normalBalance: "Credit",
            isSystemRole: true,
          },
          {
            code: "2130",
            name: { en: "Accrued Salaries", ar: "رواتب مستحقة" },
            systemRole: "ACCRUED_SALARY",
            normalBalance: "Credit",
            isSystemRole: true,
          },
        ],
      },
    ],
  },

  // ================= EQUITY =================
  {
    code: "3000",
    name: { en: "Equity", ar: "حقوق الملكية" },
    category: "Equity",
    normalBalance: "Credit",
    isGroup: true,
    isSystemRole: true,
    children: [
      {
        code: "3100",
        name: { en: "Owner Capital", ar: "رأس المال" },
        normalBalance: "Credit",
        isSystemRole: true,
      },
    ],
  },

  // ================= REVENUE =================
  {
    code: "4000",
    name: { en: "Revenue", ar: "الإيرادات" },
    category: "Revenue",
    normalBalance: "Credit",
    isGroup: true,
    isSystemRole: true,
    children: [
      {
        code: "4100",
        name: { en: "Sales Revenue", ar: "إيرادات المبيعات" },
        systemRole: "REVENUE_OPERATING",
        normalBalance: "Credit",
        isSystemRole: true,
      },
      {
        code: "4200",
        name: { en: "Other Revenue", ar: "إيرادات أخرى" },
        systemRole: "REVENUE_OTHER",
        normalBalance: "Credit",
        isSystemRole: true,
      },
    ],
  },

  // ================= EXPENSES =================
  {
    code: "5000",
    name: { en: "Expenses", ar: "المصروفات" },
    category: "Expense",
    normalBalance: "Debit",
    isGroup: true,
    isSystemRole: true,
    children: [
      {
        code: "5100",
        name: { en: "Cost of Goods Sold", ar: "تكلفة البضاعة" },
        systemRole: "COGS",
        normalBalance: "Debit",
        reportGroup: "OPERATING_EXPENSE",
        isSystemRole: true,
      },
      {
        code: "5200",
        name: { en: "Operating Expenses", ar: "مصروفات تشغيلية" },
        systemRole: "EXPENSE",
        normalBalance: "Debit",
        reportGroup: "OPERATING_EXPENSE",
        isSystemRole: true,
      },
      {
        code: "5300",
        name: { en: "Payroll Expense", ar: "الرواتب" },
        systemRole: "PAYROLL_EXPENSE",
        normalBalance: "Debit",
        reportGroup: "OPERATING_EXPENSE",
        isSystemRole: true,
      },
      {
        code: "5400",
        name: { en: "Discounts", ar: "الخصومات" },
        systemRole: "DISCOUNT",
        normalBalance: "Debit",
        isSystemRole: true,
      },
      {
        code: "5500",
        name: { en: "Rounding Adjustments", ar: "فروق التقريب" },
        systemRole: "ROUNDING",
        normalBalance: "Debit",
        isSystemRole: true,
      },
    ],
  },
];

/* =====================================================
   SERVICE
===================================================== */

class AccountSeedService {
  /**
   * Main seed function
   */
  async seed(brandId, userId = null, session) {
    const createdAccounts = [];

    for (const rootAccount of ACCOUNTS_TREE) {
      const acc = await this.createAccountRecursive(
        rootAccount,
        brandId,
        userId,
        null,
        session,
      );

      if (acc) createdAccounts.push(acc);
    }

    return createdAccounts;
  }

  /**
   * Recursive account creation
   * @param {Object} node
   * @param {ObjectId} brandId
   * @param {ObjectId|null} userId
   * @param {ObjectId|null} parentId
   * @param {mongoose.ClientSession} session
   */
  async createAccountRecursive(node, brandId, userId, parentId, session) {
    /**
     * Check if account already exists (by code + brand)
     */
    let account = await AccountModel.findOne({
      brand: brandId,
      code: node.code,
    }).session(session);

    /**
     * Create if not exists
     */
    if (!account) {
      const [created] = await AccountModel.create(
        [
          {
            brand: brandId,
            code: node.code,
            name: node.name,
            category: node.category,
            systemRole: node.systemRole || null,
            reportGroup: node.reportGroup || null,
            normalBalance: node.normalBalance,
            parent: parentId, // 🔥 هنا الربط المهم
            isGroup: node.isGroup || false,
            isSystem: true,
            isControlAccount: node.isControlAccount || false,
            allowManualEntry: node.isGroup ? false : true,
            allowPosting: node.isGroup ? false : true,
            createdBy: userId,
          },
        ],
        { session },
      );

      account = created;
    }

    /**
     * Handle children recursively
     */
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        await this.createAccountRecursive(
          child,
          brandId,
          userId,
          account._id, // 🔥 هنا بنبعت الـ parent
          session,
        );
      }
    }

    return account;
  }
}

export default new AccountSeedService();
