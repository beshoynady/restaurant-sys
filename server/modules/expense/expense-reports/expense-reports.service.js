import mongoose from "mongoose";
import DailyExpenseModel from "../daily-expense/daily-expense.model.js";
import ExpenseModel from "../expense/expense.model.js";

function dateMatch(startDate, endDate) {
  if (!startDate && !endDate) return {};
  const date = {};
  if (startDate) date.$gte = new Date(startDate);
  if (endDate) date.$lte = new Date(endDate);
  return { date };
}

class ExpenseReportsService {
  /**
   * Expense Analysis — every `Posted` DailyExpense in the window, grouped by its `Expense` type,
   * with a management-accounting breakdown by `costBehavior` (fixed/variable) and `costNature`
   * (direct/indirect) — the two classification fields `Expense` master data already carries
   * specifically for this kind of analysis, previously never read by any report.
   */
  async getExpenseAnalysis({ brand, branch, costCenter, startDate, endDate }) {
    const match = {
      brand: new mongoose.Types.ObjectId(brand),
      status: "Posted",
      ...(branch ? { branch: new mongoose.Types.ObjectId(branch) } : {}),
      ...(costCenter ? { costCenter: new mongoose.Types.ObjectId(costCenter) } : {}),
      ...dateMatch(startDate, endDate),
    };

    // `paid[]` is unwound to sum `paid.amount` per expense type; `count` uses `$addToSet` on the
    // document's own `_id` (not a raw `$sum: 1`) so an expense split across multiple payment lines
    // is still counted as one document, not once per line.
    const rows = await DailyExpenseModel.aggregate([
      { $match: match },
      { $unwind: "$paid" },
      { $group: { _id: "$expense", totalPaid: { $sum: "$paid.amount" }, count: { $addToSet: "$_id" } } },
    ]);

    // `taxAmount` is a document-level field, not a per-payment-line one — summing it after
    // `$unwind: "$paid"` above would multiply it by however many payment lines each expense has.
    // Computed as its own aggregation, over the un-unwound documents, instead.
    const taxByExpenseType = await DailyExpenseModel.aggregate([
      { $match: match },
      { $group: { _id: "$expense", totalTax: { $sum: "$taxAmount" } } },
    ]);
    const taxMap = new Map(taxByExpenseType.map((r) => [String(r._id), r.totalTax]));

    const expenseTypeIds = rows.map((r) => r._id);
    const expenseTypes = await ExpenseModel.find({ _id: { $in: expenseTypeIds } })
      .select("name code expenseType costBehavior costNature")
      .lean();
    const typeById = new Map(expenseTypes.map((t) => [String(t._id), t]));

    const byExpenseType = [];
    const byCostBehavior = { fixed: 0, variable: 0 };
    const byCostNature = { direct: 0, indirect: 0 };
    let totalAmount = 0;
    let totalTax = 0;

    for (const row of rows) {
      const type = typeById.get(String(row._id));
      const amount = row.totalPaid;
      const tax = taxMap.get(String(row._id)) || 0;
      totalAmount += amount;
      totalTax += tax;
      if (type) {
        byCostBehavior[type.costBehavior] = (byCostBehavior[type.costBehavior] || 0) + amount;
        byCostNature[type.costNature] = (byCostNature[type.costNature] || 0) + amount;
      }
      byExpenseType.push({
        expenseType: type ? { id: type._id, code: type.code, name: type.name, expenseType: type.expenseType, costBehavior: type.costBehavior, costNature: type.costNature } : { id: row._id },
        amount, tax, documentCount: row.count.length,
      });
    }

    return {
      period: { startDate: startDate || null, endDate: endDate || null },
      byExpenseType: byExpenseType.sort((a, b) => b.amount - a.amount),
      byCostBehavior,
      byCostNature,
      totalAmount,
      totalTax,
      grandTotal: totalAmount + totalTax,
    };
  }

  /** Detail: paginated DailyExpense documents for the same filter set, for drill-down. */
  async getExpenseDetail({ brand, branch, costCenter, startDate, endDate, page = 1, limit = 50 }) {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const match = { brand, status: "Posted", ...(branch ? { branch } : {}), ...(costCenter ? { costCenter } : {}), ...dateMatch(startDate, endDate) };

    const [total, expenses] = await Promise.all([
      DailyExpenseModel.countDocuments(match),
      DailyExpenseModel.find(match)
        .sort({ date: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .populate("expense", "name code expenseType")
        .populate("costCenter", "name")
        .lean(),
    ]);

    return { expenses, pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
  }
}

export default new ExpenseReportsService();
