import BranchModel from "../../organization/branch/branch.model.js";
import CashRegisterModel from "../../finance/cash-register/cash-register.model.js";
import BankAccountModel from "../../finance/bank-account/bank-account.model.js";
import financialStatementsService from "../financial-statements/financial-statements.service.js";
import financeReportsService from "../../finance/finance-reports/finance-reports.service.js";
import expenseReportsService from "../../expense/expense-reports/expense-reports.service.js";
import assetReportsService from "../../assets/asset-reports/asset-reports.service.js";
import throwError from "../../../utils/throwError.js";

/**
 * Executive/Treasury Dashboards and Branch Financial Summary — pure COMPOSITION over the report
 * services already built this session. No aggregation pipeline in this file duplicates logic that
 * already exists elsewhere; every number here is produced by calling into
 * `financial-statements`/`finance-reports`/`expense-reports`/`asset-reports` and combining their
 * results, per this platform's explicit "reuse the existing services, don't duplicate business
 * logic" mandate for this reporting phase.
 */
class ExecutiveDashboardService {
  /**
   * Branch Financial Summary — one Income Statement per branch (via
   * `financialStatementsService.getIncomeStatement`, called once per branch — the exact same
   * computation the single-branch report uses), so a multi-branch brand can compare branches
   * side by side for the same period.
   */
  async getBranchFinancialSummary({ brand, startDate, endDate }) {
    if (!startDate || !endDate) {
      throwError("A Branch Financial Summary requires both startDate and endDate — it is a period total, not a snapshot.", 400);
    }

    const branches = await BranchModel.find({ brand, isDeleted: false }).select("name status").lean();

    const summaries = await Promise.all(
      branches.map(async (branch) => {
        const income = await financialStatementsService.getIncomeStatement({
          brand, branch: String(branch._id), startDate, endDate,
        });
        return {
          branch: { id: branch._id, name: branch.name, status: branch.status },
          totalRevenue: income.totalRevenue,
          totalExpenses: income.totalExpenses,
          netIncome: income.netIncome,
        };
      }),
    );

    return {
      period: { startDate, endDate },
      branches: summaries.sort((a, b) => b.netIncome - a.netIncome),
      brandTotals: summaries.reduce(
        (acc, s) => ({
          totalRevenue: acc.totalRevenue + s.totalRevenue,
          totalExpenses: acc.totalExpenses + s.totalExpenses,
          netIncome: acc.netIncome + s.netIncome,
        }),
        { totalRevenue: 0, totalExpenses: 0, netIncome: 0 },
      ),
    };
  }

  /**
   * Treasury Dashboard — every CashRegister and BankAccount's current cached balance (never
   * re-derived — see `finance-reports.module.md` for why that field is the correct source),
   * grouped, with a grand total liquid-cash position.
   */
  async getTreasuryDashboard({ brand, branch }) {
    const registerFilter = { brand, isDeleted: false };
    const bankFilter = { brand, isDeleted: false };
    if (branch) {
      registerFilter.branch = branch;
      bankFilter.branch = branch;
    }

    const [registers, banks] = await Promise.all([
      CashRegisterModel.find(registerFilter).select("code name type balance currency").lean(),
      BankAccountModel.find(bankFilter).select("bankName accountNumber balance currency").lean(),
    ]);

    const totalCash = registers.reduce((sum, r) => sum + (r.balance || 0), 0);
    const totalBank = banks.reduce((sum, b) => sum + (b.balance || 0), 0);

    return {
      registers: registers.map((r) => ({ id: r._id, code: r.code, name: r.name, type: r.type, balance: r.balance, currency: r.currency })),
      bankAccounts: banks.map((b) => ({ id: b._id, bankName: b.bankName, accountNumber: b.accountNumber, balance: b.balance, currency: b.currency })),
      totalCash,
      totalBank,
      totalLiquidPosition: totalCash + totalBank,
    };
  }

  /**
   * Executive Financial Dashboard — one call assembling the figures an owner actually looks at:
   * period P&L (Income Statement), balance-sheet totals (Balance Sheet), liquid cash position
   * (Treasury), and the top expense categories (Expense Analysis) — every figure sourced from an
   * existing report method, nothing recomputed here.
   */
  async getExecutiveDashboard({ brand, branch, startDate, endDate }) {
    if (!startDate || !endDate) {
      throwError("An Executive Dashboard requires both startDate and endDate.", 400);
    }

    const [incomeStatement, balanceSheet, treasury, expenseAnalysis, assetBookValue] = await Promise.all([
      financialStatementsService.getIncomeStatement({ brand, branch, startDate, endDate }),
      financialStatementsService.getBalanceSheet({ brand, branch, asOfDate: endDate }),
      this.getTreasuryDashboard({ brand, branch }),
      expenseReportsService.getExpenseAnalysis({ brand, branch, startDate, endDate }),
      assetReportsService.getAssetBookValue({ brand, branch }),
    ]);

    return {
      period: { startDate, endDate },
      profitAndLoss: {
        totalRevenue: incomeStatement.totalRevenue,
        totalExpenses: incomeStatement.totalExpenses,
        netIncome: incomeStatement.netIncome,
        netMarginPercent: incomeStatement.totalRevenue > 0 ? (incomeStatement.netIncome / incomeStatement.totalRevenue) * 100 : null,
      },
      balanceSheet: {
        totalAssets: balanceSheet.totalAssets,
        totalLiabilities: balanceSheet.totalLiabilities,
        totalEquity: balanceSheet.totalEquity,
        balanced: balanceSheet.balanced,
      },
      treasury: { totalCash: treasury.totalCash, totalBank: treasury.totalBank, totalLiquidPosition: treasury.totalLiquidPosition },
      topExpenseCategories: expenseAnalysis.byExpenseType.slice(0, 5),
      fixedAssets: { totalBookValue: assetBookValue.totalBookValue, assetCount: assetBookValue.assetCount },
    };
  }

  /**
   * Financial KPIs — a small, honest set of ratios actually computable from this platform's data
   * today. Deliberately does NOT fabricate metrics this system has no data to support (e.g. a
   * proper Current Ratio needs current-vs-long-term liability/asset classification via
   * `Account.reportGroup`, which most seeded charts of accounts don't populate consistently yet —
   * left out rather than returning a misleading number).
   */
  async getFinancialKPIs({ brand, branch, startDate, endDate }) {
    if (!startDate || !endDate) {
      throwError("Financial KPIs require both startDate and endDate.", 400);
    }

    const [incomeStatement, treasury] = await Promise.all([
      financialStatementsService.getIncomeStatement({ brand, branch, startDate, endDate }),
      this.getTreasuryDashboard({ brand, branch }),
    ]);

    const netMarginPercent = incomeStatement.totalRevenue > 0
      ? (incomeStatement.netIncome / incomeStatement.totalRevenue) * 100
      : null;

    const days = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);

    return {
      period: { startDate, endDate, days },
      totalRevenue: incomeStatement.totalRevenue,
      totalExpenses: incomeStatement.totalExpenses,
      netIncome: incomeStatement.netIncome,
      netMarginPercent,
      averageDailyRevenue: incomeStatement.totalRevenue / days,
      totalLiquidPosition: treasury.totalLiquidPosition,
    };
  }
}

export default new ExecutiveDashboardService();
