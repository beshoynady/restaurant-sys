import mongoose from "mongoose";
import CashRegisterModel from "../cash-register/cash-register.model.js";
import BankAccountModel from "../bank-account/bank-account.model.js";
import CashTransactionModel from "../cash-transaction/cash-transaction.model.js";
import CashierShiftModel from "../cashier-shift/cashier-shift.model.js";
import throwError from "../../../utils/throwError.js";

function dateMatch(startDate, endDate) {
  if (!startDate && !endDate) return {};
  const date = {};
  if (startDate) date.$gte = new Date(startDate);
  if (endDate) date.$lte = new Date(endDate);
  return { date };
}

class FinanceReportsService {
  /**
   * Cash Register Report — one register's current `balance` (the cached, engine-maintained figure
   * — see cash-register.service.js's `lockedUpdateFields`) plus a breakdown of every POSTED
   * CashTransaction that moved through it, by transactionType/direction, over an optional date
   * range. Detail rows are paginated separately via `getCashRegisterTransactions` below — this
   * summary intentionally stays a single aggregation, not a full transaction dump.
   */
  async getCashRegisterReport({ brand, branch, registerId, startDate, endDate }) {
    const registerFilter = { brand, isDeleted: false };
    if (branch) registerFilter.branch = branch;
    if (registerId) registerFilter._id = registerId;
    const registers = await CashRegisterModel.find(registerFilter).lean();
    if (registerId && registers.length === 0) throwError("Cash register not found.", 404);

    const registerIds = registers.map((r) => r._id);
    const rows = await CashTransactionModel.aggregate([
      {
        $match: {
          brand: new mongoose.Types.ObjectId(brand),
          cashRegister: { $in: registerIds },
          status: "POSTED",
          ...dateMatch(startDate, endDate),
        },
      },
      { $group: { _id: { register: "$cashRegister", transactionType: "$transactionType", direction: "$direction" }, total: { $sum: "$amount" } } },
    ]);

    const byRegister = new Map(registers.map((r) => [String(r._id), { register: r, inflow: 0, outflow: 0, byType: {} }]));
    for (const row of rows) {
      const key = String(row._id.register);
      const bucket = byRegister.get(key);
      if (!bucket) continue;
      const flowKey = row._id.direction === "INFLOW" ? "inflow" : "outflow";
      bucket[flowKey] += row.total;
      bucket.byType[row._id.transactionType] = (bucket.byType[row._id.transactionType] || 0) + row.total;
    }

    return {
      period: { startDate: startDate || null, endDate: endDate || null },
      registers: [...byRegister.values()].map(({ register, inflow, outflow, byType }) => ({
        register: { id: register._id, code: register.code, name: register.name, type: register.type, currentBalance: register.balance },
        inflow, outflow, net: inflow - outflow, byType,
      })),
    };
  }

  /** Detail: paginated CashTransaction rows for one register — the drill-down behind the summary above. */
  async getCashRegisterTransactions({ brand, branch, registerId, startDate, endDate, page = 1, limit = 50 }) {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const match = { brand, cashRegister: registerId, status: "POSTED", ...(branch ? { branch } : {}), ...dateMatch(startDate, endDate) };

    const [total, transactions] = await Promise.all([
      CashTransactionModel.countDocuments(match),
      CashTransactionModel.find(match)
        .sort({ date: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .populate("paymentMethod", "name")
        .lean(),
    ]);

    return { transactions, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
  }

  /** Bank Account Report — the direct mirror of the Cash Register Report, over `bankAccount` instead of `cashRegister`. */
  async getBankAccountReport({ brand, branch, bankAccountId, startDate, endDate }) {
    const bankFilter = { brand, isDeleted: false };
    if (branch) bankFilter.branch = branch;
    if (bankAccountId) bankFilter._id = bankAccountId;
    const banks = await BankAccountModel.find(bankFilter).lean();
    if (bankAccountId && banks.length === 0) throwError("Bank account not found.", 404);

    const bankIds = banks.map((b) => b._id);
    const rows = await CashTransactionModel.aggregate([
      {
        $match: {
          brand: new mongoose.Types.ObjectId(brand),
          bankAccount: { $in: bankIds },
          status: "POSTED",
          ...dateMatch(startDate, endDate),
        },
      },
      { $group: { _id: { bank: "$bankAccount", transactionType: "$transactionType", direction: "$direction" }, total: { $sum: "$amount" } } },
    ]);

    const byBank = new Map(banks.map((b) => [String(b._id), { bank: b, inflow: 0, outflow: 0, byType: {} }]));
    for (const row of rows) {
      const key = String(row._id.bank);
      const bucket = byBank.get(key);
      if (!bucket) continue;
      const flowKey = row._id.direction === "INFLOW" ? "inflow" : "outflow";
      bucket[flowKey] += row.total;
      bucket.byType[row._id.transactionType] = (bucket.byType[row._id.transactionType] || 0) + row.total;
    }

    return {
      period: { startDate: startDate || null, endDate: endDate || null },
      accounts: [...byBank.values()].map(({ bank, inflow, outflow, byType }) => ({
        bankAccount: { id: bank._id, bankName: bank.bankName, accountNumber: bank.accountNumber, currentBalance: bank.balance },
        inflow, outflow, net: inflow - outflow, byType,
      })),
    };
  }

  /**
   * Cashier Shift Report — every shift in the window with its own expected/actual/variance
   * already computed (by `cashier-shift.service.js#countShift` at the time it was counted — this
   * report never recomputes accounting, only lists what the engine already produced), plus a
   * summary of total shortage/overage across the filtered set.
   */
  async getCashierShiftReport({ brand, branch, cashier, register, status, startDate, endDate, page = 1, limit = 25 }) {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);

    // Built with real ObjectId instances (not raw strings) up front — `.find()`/`.countDocuments()`
    // auto-cast either way, but `.aggregate()` below does NOT, and this exact object is reused for
    // both. The bug this avoids (a raw-string `brand` silently matching zero documents in an
    // aggregation `$match`) was already caught once in ledger.service.js's own history; fixed here
    // proactively rather than waiting to rediscover it a third time.
    const match = { brand: new mongoose.Types.ObjectId(brand), ...(branch ? { branch: new mongoose.Types.ObjectId(branch) } : {}) };
    if (cashier) match.cashier = new mongoose.Types.ObjectId(cashier);
    if (register) match.register = new mongoose.Types.ObjectId(register);
    if (status) match.status = status;
    if (startDate || endDate) {
      match.openedAt = {};
      if (startDate) match.openedAt.$gte = new Date(startDate);
      if (endDate) match.openedAt.$lte = new Date(endDate);
    }

    const [total, shifts, summaryRows] = await Promise.all([
      CashierShiftModel.countDocuments(match),
      CashierShiftModel.find(match)
        .sort({ openedAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .populate("cashier", "firstName lastName")
        .populate("register", "code name")
        .lean(),
      CashierShiftModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalShortage: { $sum: { $cond: [{ $eq: ["$variance.reason", "SHORTAGE"] }, { $abs: "$variance.amount" }, 0] } },
            totalOverage: { $sum: { $cond: [{ $eq: ["$variance.reason", "OVERAGE"] }, "$variance.amount", 0] } },
            shiftCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = summaryRows[0] || { totalShortage: 0, totalOverage: 0, shiftCount: 0 };

    return {
      shifts,
      summary: { totalShortage: summary.totalShortage, totalOverage: summary.totalOverage, netVariance: summary.totalOverage - summary.totalShortage, shiftCount: summary.shiftCount },
      pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) },
    };
  }
}

export default new FinanceReportsService();
