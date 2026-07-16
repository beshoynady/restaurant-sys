// Service layer (BACKEND_FOUNDATION.md §4.3): business rules + orchestration only, zero direct
// Mongoose calls outside the two repositories and the read-only Budget-vs-Actual aggregation (which
// necessarily reads JournalLine directly — the same "a report reads its source ledger" pattern
// finance-reports.service.js/ledger.service.js already use elsewhere in this domain).
import mongoose from "mongoose";
import throwError from "../../../utils/throwError.js";
import BudgetRepository from "./budget.repository.js";
import BudgetLineRepository from "../budget-line/budget-line.repository.js";
import AccountModel from "../account/account.model.js";
import JournalLineModel from "../journal-line/journal-line.model.js";

const budgetLineRepository = new BudgetLineRepository();

// Budget Control, as scoped in this pass, covers the operating (P&L) budget — Revenue and Expense
// accounts only. Balance-sheet budgeting (capex plans, cash-flow budgets) is a distinct, larger unit
// of work and out of scope here (see the module doc's "Future Extensions").
const BUDGETABLE_CATEGORIES = ["Revenue", "Expense"];

function sumMonthly(monthlyAmounts) {
  return monthlyAmounts.reduce((sum, n) => sum + n, 0);
}

class BudgetService extends BudgetRepository {
  /**
   * Creates a Budget header plus its BudgetLines atomically — either the whole budget exists with
   * every line, or none of it does. `lines`: [{ account, monthlyAmounts: [12 numbers] }].
   */
  async createBudget({ brand, branch, costCenter, fiscalYear, name, notes, lines, actorId }) {
    if (!lines || lines.length === 0) {
      throwError("A budget must have at least one line.", 400);
    }

    const accountIds = lines.map((l) => l.account);
    const accounts = await AccountModel.find({ _id: { $in: accountIds }, brand }).select("category").lean();
    if (accounts.length !== new Set(accountIds.map(String)).size) {
      throwError("One or more budget line accounts were not found for this brand.", 404);
    }
    const accountsById = new Map(accounts.map((a) => [String(a._id), a]));
    for (const line of lines) {
      const account = accountsById.get(String(line.account));
      if (!BUDGETABLE_CATEGORIES.includes(account.category)) {
        throwError(
          `Account ${line.account} is a ${account.category} account — budgets may only include Revenue or Expense accounts.`,
          400,
        );
      }
    }

    return this.withTransaction(async (session) => {
      const lineDocs = lines.map((l) => ({
        brand, branch: branch ?? null, account: l.account,
        monthlyAmounts: l.monthlyAmounts, annualAmount: sumMonthly(l.monthlyAmounts),
      }));
      const totalAnnualAmount = lineDocs.reduce((sum, l) => sum + l.annualAmount, 0);

      const budget = await this.insertBudget(
        {
          brand, branch: branch ?? null, costCenter: costCenter ?? null, fiscalYear, name,
          notes: notes ?? null, totalAnnualAmount, createdBy: actorId,
        },
        session,
      );

      const createdLines = await budgetLineRepository.insertMany(
        lineDocs.map((l) => ({ ...l, budget: budget._id })),
        session,
      );

      return { budget, lines: createdLines };
    });
  }

  /**
   * Replaces a Draft budget's lines wholesale (delete + reinsert, atomically) and recomputes
   * `totalAnnualAmount`. Only legal while the budget is still Draft — once submitted, correcting
   * figures means rejecting/creating a new version (see createNewVersion()), not editing in place,
   * matching this platform's "posted financial documents are corrected via reversal, never in
   * place" convention extended to the pre-approval workflow state.
   */
  async updateBudgetLines({ id, brand, lines, actorId }) {
    if (!lines || lines.length === 0) {
      throwError("A budget must have at least one line.", 400);
    }
    const budget = await this.findByIdScoped(id, brand, null);
    if (!budget) throwError("Budget not found.", 404);
    if (budget.status !== "Draft") {
      throwError(`Only a Draft budget's lines can be edited (current status: ${budget.status}).`, 409);
    }

    const accountIds = lines.map((l) => l.account);
    const accounts = await AccountModel.find({ _id: { $in: accountIds }, brand }).select("category").lean();
    if (accounts.length !== new Set(accountIds.map(String)).size) {
      throwError("One or more budget line accounts were not found for this brand.", 404);
    }
    const accountsById = new Map(accounts.map((a) => [String(a._id), a]));
    for (const line of lines) {
      const account = accountsById.get(String(line.account));
      if (!BUDGETABLE_CATEGORIES.includes(account.category)) {
        throwError(
          `Account ${line.account} is a ${account.category} account — budgets may only include Revenue or Expense accounts.`,
          400,
        );
      }
    }

    return this.withTransaction(async (session) => {
      await budgetLineRepository.deleteByBudget(budget._id, session);

      const lineDocs = lines.map((l) => ({
        budget: budget._id, brand: budget.brand, branch: budget.branch, account: l.account,
        monthlyAmounts: l.monthlyAmounts, annualAmount: sumMonthly(l.monthlyAmounts),
      }));
      const totalAnnualAmount = lineDocs.reduce((sum, l) => sum + l.annualAmount, 0);

      const createdLines = await budgetLineRepository.insertMany(lineDocs, session);
      await this.model.updateOne(
        { _id: budget._id },
        { $set: { totalAnnualAmount, updatedBy: actorId } },
        { session },
      );

      return { budget: { ...budget.toObject(), totalAnnualAmount }, lines: createdLines };
    });
  }

  /** Draft -> PendingApproval. Only a Draft budget can be submitted. */
  async submitForApproval({ id, brand, actorId }) {
    const updated = await this.transitionStatus(id, brand, "Draft", {
      status: "PendingApproval", submittedBy: actorId, submittedAt: new Date(),
    });
    if (!updated) throwError("Budget not found, or is not in Draft status.", 409);
    return updated;
  }

  /**
   * PendingApproval -> Approved. Atomically demotes whatever budget currently holds
   * `isCurrentVersion` for the same {brand, branch, costCenter, fiscalYear} scope (an earlier
   * approved version, if any) and promotes this one — "the current budget" always means "the last
   * Approved version," per the model's own header comment.
   */
  async approveBudget({ id, brand, actorId }) {
    return this.withTransaction(async (session) => {
      const budget = await this.findByIdScoped(id, brand, session);
      if (!budget) throwError("Budget not found.", 404);
      if (budget.status !== "PendingApproval") {
        throwError(`Only a PendingApproval budget can be approved (current status: ${budget.status}).`, 409);
      }

      await this.clearCurrentVersion(
        { brand: budget.brand, branch: budget.branch, costCenter: budget.costCenter, fiscalYear: budget.fiscalYear },
        session,
      );

      const approved = await this.transitionStatus(
        id, brand, "PendingApproval",
        { status: "Approved", approvedBy: actorId, approvedAt: new Date(), isCurrentVersion: true },
        session,
      );
      if (!approved) throwError("Budget was changed by a concurrent request.", 409);
      return approved;
    });
  }

  /** PendingApproval -> Rejected. Terminal — a rejected budget is never posted; see createNewVersion(). */
  async rejectBudget({ id, brand, actorId, reason }) {
    const updated = await this.transitionStatus(id, brand, "PendingApproval", {
      status: "Rejected", rejectedBy: actorId, rejectedAt: new Date(), rejectionReason: reason ?? null,
    });
    if (!updated) throwError("Budget not found, or is not PendingApproval.", 409);
    return updated;
  }

  /**
   * Budget Versions: clones an existing budget's lines into a brand-new Draft with version+1,
   * `previousVersion` pointing back at the source. Legal from any status except Draft itself (a
   * Draft is already editable in place — cloning it would just create a duplicate to throw away).
   * The clone does NOT touch `isCurrentVersion` — that only moves once the new version is Approved.
   */
  async createNewVersion({ id, brand, actorId }) {
    const source = await this.findByIdScoped(id, brand, null);
    if (!source) throwError("Budget not found.", 404);
    if (source.status === "Draft") {
      throwError("This budget is already a Draft — edit it directly instead of creating a new version.", 409);
    }

    const sourceLines = await budgetLineRepository.findByBudget(source._id, null);

    return this.withTransaction(async (session) => {
      const newBudget = await this.insertBudget(
        {
          brand: source.brand, branch: source.branch, costCenter: source.costCenter,
          fiscalYear: source.fiscalYear, name: source.name, notes: source.notes,
          version: source.version + 1, previousVersion: source._id, isCurrentVersion: false,
          totalAnnualAmount: source.totalAnnualAmount, createdBy: actorId,
        },
        session,
      );

      const clonedLines = sourceLines.map((l) => ({
        budget: newBudget._id, brand: l.brand, branch: l.branch, account: l.account,
        monthlyAmounts: l.monthlyAmounts, annualAmount: l.annualAmount,
      }));
      await budgetLineRepository.insertMany(clonedLines, session);

      return newBudget;
    });
  }

  /**
   * Budget vs Actual / Consumption: for every line on this budget, compares the budgeted amount
   * (annual, or the sum of months 1..upToMonth if given — "consumption so far") against actual GL
   * activity on the same account for the same brand/branch/fiscal-year window. Actual is signed per
   * the account's normalBalance so a Revenue account's "actual" grows with credits and an Expense
   * account's grows with debits, matching how each account type is meant to be read.
   */
  async getBudgetVsActual({ id, brand, upToMonth = 12 }) {
    if (upToMonth < 1 || upToMonth > 12) {
      throwError("upToMonth must be between 1 and 12.", 400);
    }
    const budget = await this.findByIdScoped(id, brand, null);
    if (!budget) throwError("Budget not found.", 404);

    const lines = await budgetLineRepository.findByBudget(budget._id, null);
    if (lines.length === 0) return { budget, lines: [] };

    const accounts = await AccountModel.find({ _id: { $in: lines.map((l) => l.account) } })
      .select("code name category normalBalance").lean();
    const accountsById = new Map(accounts.map((a) => [String(a._id), a]));

    const brandId = new mongoose.Types.ObjectId(brand);
    const rangeStart = new Date(Date.UTC(budget.fiscalYear, 0, 1));
    const rangeEnd = new Date(Date.UTC(budget.fiscalYear, upToMonth, 1));
    const matchStage = { brand: brandId, account: { $in: lines.map((l) => l.account) }, date: { $gte: rangeStart, $lt: rangeEnd } };
    if (budget.branch) matchStage.branch = new mongoose.Types.ObjectId(budget.branch);

    const actualsByAccount = await JournalLineModel.aggregate([
      { $match: matchStage },
      { $group: { _id: "$account", debit: { $sum: "$debit" }, credit: { $sum: "$credit" } } },
    ]);
    const actualsById = new Map(actualsByAccount.map((a) => [String(a._id), a]));

    const result = lines.map((line) => {
      const account = accountsById.get(String(line.account));
      const actualRow = actualsById.get(String(line.account)) || { debit: 0, credit: 0 };
      const actual = account?.normalBalance === "Credit"
        ? actualRow.credit - actualRow.debit
        : actualRow.debit - actualRow.credit;

      const budgetedToDate = line.monthlyAmounts.slice(0, upToMonth).reduce((sum, n) => sum + n, 0);
      const variance = budgetedToDate - actual;
      const consumptionPercent = budgetedToDate > 0 ? Math.round((actual / budgetedToDate) * 10000) / 100 : null;

      return {
        account: account ? { _id: account._id, code: account.code, name: account.name, category: account.category } : line.account,
        annualBudget: line.annualAmount,
        budgetedToDate,
        actual,
        variance,
        consumptionPercent,
      };
    });

    return { budget, upToMonth, lines: result };
  }

  /**
   * Report/Dashboard Integration: every *current* (isCurrentVersion, Approved) budget for a
   * brand/branch/fiscalYear scope, each reduced to its total budgeted-to-date/actual/variance —
   * the same per-line computation `getBudgetVsActual()` does, aggregated up to one row per budget
   * so `executive-dashboard.service.js` can show a "budget overview" section without re-deriving
   * the Budget-vs-Actual math itself (same "compose the existing service, don't duplicate its
   * logic" convention the rest of the dashboard already follows).
   */
  async getCurrentBudgetsSummary({ brand, branch, fiscalYear, upToMonth = 12 }) {
    const filter = { brand, fiscalYear, isCurrentVersion: true, status: "Approved" };
    if (branch) filter.branch = branch;
    const budgets = await this.model.find(filter).select("_id name branch costCenter").lean();

    const summaries = await Promise.all(
      budgets.map(async (b) => {
        const { lines } = await this.getBudgetVsActual({ id: String(b._id), brand, upToMonth });
        const totals = lines.reduce(
          (acc, l) => ({
            budgetedToDate: acc.budgetedToDate + l.budgetedToDate,
            actual: acc.actual + l.actual,
          }),
          { budgetedToDate: 0, actual: 0 },
        );
        const variance = totals.budgetedToDate - totals.actual;
        const consumptionPercent = totals.budgetedToDate > 0
          ? Math.round((totals.actual / totals.budgetedToDate) * 10000) / 100
          : null;
        return { budget: { _id: b._id, name: b.name, branch: b.branch, costCenter: b.costCenter }, ...totals, variance, consumptionPercent };
      }),
    );

    const grandTotals = summaries.reduce(
      (acc, s) => ({ budgetedToDate: acc.budgetedToDate + s.budgetedToDate, actual: acc.actual + s.actual }),
      { budgetedToDate: 0, actual: 0 },
    );

    return {
      fiscalYear, upToMonth, budgets: summaries,
      grandTotals: {
        ...grandTotals,
        variance: grandTotals.budgetedToDate - grandTotals.actual,
        consumptionPercent: grandTotals.budgetedToDate > 0
          ? Math.round((grandTotals.actual / grandTotals.budgetedToDate) * 10000) / 100
          : null,
      },
    };
  }
}

export default new BudgetService();
