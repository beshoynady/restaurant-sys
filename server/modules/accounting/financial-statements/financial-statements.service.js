import mongoose from "mongoose";
import AccountModel from "../account/account.model.js";
import CashTransactionModel from "../../finance/cash-transaction/cash-transaction.model.js";
import ledgerService from "../ledger/ledger.service.js";

function signedBalance(account, debit, credit) {
  return account.normalBalance === "Debit" ? debit - credit : credit - debit;
}

// Direct-method Cash Flow categorization of CashTransaction.transactionType — the SSOT for cash
// movements per that model's own header comment ("single source of truth for ALL money
// transactions"). TRANSFER is deliberately excluded entirely: a transfer between two of the
// business's own cash/bank accounts nets to zero for the business as a whole and must never appear
// as an inflow or outflow on a cash flow statement. Nothing in this platform currently tags a
// transaction as belonging to Investing activities (asset purchases settle through Purchasing/
// SupplierTransaction, not a CashTransaction row) — disclosed honestly below rather than guessed.
const OPERATING_TYPES = new Set(["SALE", "EXPENSE", "REFUND", "PURCHASE", "SETTLEMENT", "ADJUSTMENT"]);
const FINANCING_TYPES = new Set(["DEPOSIT", "WITHDRAWAL"]);

class FinancialStatementsService {
  /**
   * The Chart of Accounts is brand-wide by default (`Account.branch: null`) — `Account.branch`
   * models an OPTIONAL branch-specific override account (e.g. a branch keeping its own local cash
   * account), not a partition of the whole COA per branch. A real bug this method's own test caught:
   * an earlier version filtered `Account.find({branch})` to ONLY that branch's accounts when a
   * branch was requested, which returned zero accounts for any brand using a normal, brand-wide COA
   * (i.e. almost every brand, since branch-specific override accounts are the exception). Correct
   * behavior: always include brand-wide (`branch: null`) accounts, and ALSO include any accounts
   * specific to the requested branch, if one was requested — branch-scoping of the actual FINANCIAL
   * ACTIVITY happens separately, via `JournalLine.branch` (see `sumPostedLinesGroupedByAccount`),
   * which is a completely independent field from `Account.branch`.
   */
  _accountFilter(brand, branch) {
    return {
      brand, status: "active", isDeleted: false,
      $or: [{ branch: null }, ...(branch ? [{ branch }] : [])],
    };
  }

  /**
   * Balance Sheet — cumulative (no lower date bound; a balance sheet is a snapshot "as of" a
   * point in time, not a period total), grouped by Account.category into Asset/Liability/Equity.
   * `balanced` checks Assets = Liabilities + Equity, the fundamental accounting identity.
   *
   * This platform has no period-closing mechanism (no journal entry ever moves Revenue/Expense
   * balances into Retained Earnings) — a real, disclosed gap, not silently worked around. Without
   * accounting for that, an interim balance sheet taken mid-period would never balance, because
   * every dollar of unclosed net income/loss would be sitting in Assets/Liabilities with no
   * offsetting Equity entry. The standard interim-reporting practice this method implements: fold
   * cumulative (Revenue - Expense) through `asOfDate` into Equity as a computed
   * "Current Period Earnings" line, exactly what a formal closing entry would eventually book,
   * without requiring one to actually exist yet.
   */
  async getBalanceSheet({ brand, branch, asOfDate }) {
    const accounts = await AccountModel.find(this._accountFilter(brand, branch)).sort({ code: 1 }).lean();

    const sums = await ledgerService.sumPostedLinesGroupedByAccount({
      brand, branch, accountIds: accounts.map((a) => a._id), endDate: asOfDate,
    });

    const sections = { Asset: [], Liability: [], Equity: [] };
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let currentPeriodEarnings = 0;

    for (const account of accounts) {
      const s = sums.get(String(account._id)) || { debit: 0, credit: 0 };
      const balance = signedBalance(account, s.debit, s.credit);
      if (balance === 0) continue; // an untouched account adds no signal to the statement

      if (account.category === "Revenue") {
        currentPeriodEarnings += balance;
        continue;
      }
      if (account.category === "Expense") {
        currentPeriodEarnings -= balance;
        continue;
      }
      if (!sections[account.category]) continue;

      sections[account.category].push({
        account: { id: account._id, code: account.code, name: account.name, reportGroup: account.reportGroup },
        balance,
      });
      if (account.category === "Asset") totalAssets += balance;
      else if (account.category === "Liability") totalLiabilities += balance;
      else totalEquity += balance;
    }

    if (currentPeriodEarnings !== 0) {
      sections.Equity.push({
        account: { id: null, code: "COMPUTED", name: new Map([["en", "Current Period Earnings (unclosed)"]]) },
        balance: currentPeriodEarnings,
      });
      totalEquity += currentPeriodEarnings;
    }

    return {
      asOfDate: asOfDate || new Date(),
      assets: sections.Asset,
      liabilities: sections.Liability,
      equity: sections.Equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      // Standard accounting identity check — a real, catchable red flag if false (an unbalanced
      // journal should already be structurally impossible per JournalEntry's own isBalanced
      // enforcement, so this failing would point at a data/scoping bug in the report itself, not
      // routine business activity).
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.005,
    };
  }

  /**
   * Income Statement (Profit & Loss) — period-based (requires a date range, unlike the Balance
   * Sheet), grouped into Revenue/Expense. `netIncome` is the figure that would close to Retained
   * Earnings at period-end (that closing entry itself is not built in this pass — see the
   * module's own documentation for why).
   */
  async getIncomeStatement({ brand, branch, startDate, endDate }) {
    if (!startDate || !endDate) {
      throw Object.assign(new Error("An Income Statement requires both startDate and endDate — it is a period total, not a snapshot."), { statusCode: 400 });
    }

    const accountFilter = { ...this._accountFilter(brand, branch), category: { $in: ["Revenue", "Expense"] } };
    const accounts = await AccountModel.find(accountFilter).sort({ code: 1 }).lean();

    const sums = await ledgerService.sumPostedLinesGroupedByAccount({
      brand, branch, accountIds: accounts.map((a) => a._id), startDate, endDate,
    });

    const revenue = [];
    const expenses = [];
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const account of accounts) {
      const s = sums.get(String(account._id)) || { debit: 0, credit: 0 };
      const balance = signedBalance(account, s.debit, s.credit);
      if (balance === 0) continue;
      const row = { account: { id: account._id, code: account.code, name: account.name, reportGroup: account.reportGroup }, amount: balance };
      if (account.category === "Revenue") {
        revenue.push(row);
        totalRevenue += balance;
      } else {
        expenses.push(row);
        totalExpenses += balance;
      }
    }

    return {
      period: { startDate, endDate },
      revenue, expenses, totalRevenue, totalExpenses,
      netIncome: totalRevenue - totalExpenses,
    };
  }

  /**
   * Cash Flow Statement (Direct Method) — see this file's header comment for the
   * transactionType-to-activity mapping and its one honestly-disclosed gap (Investing activities).
   */
  async getCashFlowStatement({ brand, branch, startDate, endDate }) {
    if (!startDate || !endDate) {
      throw Object.assign(new Error("A Cash Flow Statement requires both startDate and endDate — it is a period total, not a snapshot."), { statusCode: 400 });
    }

    const match = {
      brand: new mongoose.Types.ObjectId(brand),
      status: "POSTED",
      transactionType: { $ne: "TRANSFER" },
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      ...(branch ? { branch: new mongoose.Types.ObjectId(branch) } : {}),
    };

    const rows = await CashTransactionModel.aggregate([
      { $match: match },
      { $group: { _id: { transactionType: "$transactionType", direction: "$direction" }, total: { $sum: "$amount" } } },
    ]);

    const activities = { operating: { inflow: 0, outflow: 0, byType: {} }, financing: { inflow: 0, outflow: 0, byType: {} }, unclassified: { inflow: 0, outflow: 0, byType: {} } };

    for (const row of rows) {
      const { transactionType, direction } = row._id;
      const bucket = OPERATING_TYPES.has(transactionType) ? "operating"
        : FINANCING_TYPES.has(transactionType) ? "financing"
        : "unclassified";
      const key = direction === "INFLOW" ? "inflow" : "outflow";
      activities[bucket][key] += row.total;
      activities[bucket].byType[transactionType] = (activities[bucket].byType[transactionType] || 0) + row.total;
    }

    const netOperating = activities.operating.inflow - activities.operating.outflow;
    const netFinancing = activities.financing.inflow - activities.financing.outflow;
    const netUnclassified = activities.unclassified.inflow - activities.unclassified.outflow;

    return {
      period: { startDate, endDate },
      operatingActivities: { ...activities.operating, net: netOperating },
      financingActivities: { ...activities.financing, net: netFinancing },
      // Not a standard GAAP/IFRS "Investing Activities" section — this platform does not currently
      // tag any CashTransaction as an asset purchase/investing movement (Asset acquisitions settle
      // through Purchasing, not a CashTransaction row). Surfaced honestly as "unclassified" rather
      // than silently folded into Operating, so a reader can see this gap rather than trust a
      // number that quietly conflates two different activity types.
      unclassifiedActivities: { ...activities.unclassified, net: netUnclassified, note: "No CashTransaction.transactionType currently maps to Investing activities — asset purchases are not tracked as cash transactions in this platform yet." },
      netCashFlow: netOperating + netFinancing + netUnclassified,
    };
  }
}

export default new FinancialStatementsService();
