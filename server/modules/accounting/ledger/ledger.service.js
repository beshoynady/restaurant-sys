import mongoose from "mongoose";
import JournalLineModel from "../journal-line/journal-line.model.js";
import JournalEntryModel from "../journal-entry/journal-entry.model.js";
import AccountModel from "../account/account.model.js";
import throwError from "../../../utils/throwError.js";

/**
 * Read-only Financial Reports engine over JournalLine/JournalEntry/Account — no new business
 * logic, no writes. Reuses the exact posting data every business engine in this platform already
 * produces (Order/Invoice/PurchaseInvoice/CashierShift/DailyExpense/AssetDepreciation...); this
 * layer only aggregates and formats it for the frontend, per this platform's own "the frontend
 * should never calculate accounting logic" mandate.
 *
 * SECURITY (fixed in this pass): every method takes `brand`/`branch` as explicit parameters that
 * the CONTROLLER must derive from `req.user`, never from the query string. The previous version of
 * this module trusted `req.query.brand`/`branch` directly — any authenticated user could read
 * another brand's entire general ledger/trial balance by passing a different `brand` query param.
 * This class has no knowledge of `req` at all, by design, so that mistake can't be reintroduced
 * silently at this layer.
 */
class LedgerService {
  _dateMatch(startDate, endDate) {
    if (!startDate && !endDate) return {};
    const date = {};
    if (startDate) date.$gte = new Date(startDate);
    if (endDate) date.$lte = new Date(endDate);
    return { date };
  }

  /**
   * General Ledger (single account, chronological, running balance) — paginated. Only lines whose
   * parent JournalEntry is "Posted" count; a Pending/Rejected entry never appears in a ledger.
   */
  async getAccountLedger({ brand, branch, accountId, startDate, endDate, page = 1, limit = 50 }) {
    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      throwError("Invalid account ID.", 400);
    }
    const account = await AccountModel.findOne({ _id: accountId, brand }).lean();
    if (!account) throwError("Account not found.", 404);

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);

    // Mongoose's `aggregate()` does NOT auto-cast query values the way `find()` does — a plain
    // string `brand` would silently fail to match the ObjectId-typed field in a `$match` stage.
    // Every aggregation match below must use real ObjectId instances, not raw strings.
    const brandId = new mongoose.Types.ObjectId(brand);
    const branchId = branch ? new mongoose.Types.ObjectId(branch) : null;

    const match = {
      brand: brandId,
      account: new mongoose.Types.ObjectId(accountId),
      ...(branchId ? { branch: branchId } : {}),
      ...this._dateMatch(startDate, endDate),
    };

    const skip = (safePage - 1) * safeLimit;

    // Opening balance = the sum of every matching line BEFORE this page's window (chronologically,
    // within whatever date range `match` already applies) — not "everything before `startDate`".
    // The earlier version of this method only computed an opening balance when `startDate` was
    // explicitly supplied, so a plain paginated request with no date filter silently reset the
    // running balance to 0 on every page instead of carrying it forward — caught by this module's
    // own integration test, not by inspection.
    const [openingAgg, total, lines] = await Promise.all([
      skip > 0 ? this._sumFirstNPostedLines(match, skip) : Promise.resolve({ debit: 0, credit: 0 }),
      this._countPostedLines(match),
      this._findPostedLines(match, safePage, safeLimit),
    ]);

    const signedDelta = (debit, credit) =>
      account.normalBalance === "Debit" ? debit - credit : credit - debit;

    let runningBalance = signedDelta(openingAgg.debit, openingAgg.credit);
    const openingBalance = runningBalance;

    const ledger = lines.map((line) => {
      const debit = line.debit || 0;
      const credit = line.credit || 0;
      runningBalance += signedDelta(debit, credit);
      return {
        entryNumber: line.journalEntry?.entryNumber,
        sourceType: line.sourceType,
        date: line.date,
        description: line.description,
        debit,
        credit,
        runningBalance,
      };
    });

    return {
      account: { id: account._id, code: account.code, name: account.name, normalBalance: account.normalBalance },
      openingBalance,
      closingBalance: runningBalance,
      ledger,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Trial Balance — one aggregation across every account for the brand (was: one `find()` per
   * account in a loop, an N+1 pattern that would not scale past a trivial chart of accounts).
   */
  async getTrialBalance({ brand, branch, startDate, endDate }) {
    const accountFilter = { brand, status: "active", isDeleted: false };
    if (branch) accountFilter.branch = branch;
    const accounts = await AccountModel.find(accountFilter).sort({ code: 1 }).lean();
    if (accounts.length === 0) {
      return { trialBalance: [], totalDebit: 0, totalCredit: 0, balanced: true };
    }

    const sumsByAccount = await this.sumPostedLinesGroupedByAccount({
      brand,
      branch,
      accountIds: accounts.map((a) => a._id),
      startDate,
      endDate,
    });

    let totalDebit = 0;
    let totalCredit = 0;
    const trialBalance = accounts.map((account) => {
      const sums = sumsByAccount.get(String(account._id)) || { debit: 0, credit: 0 };
      totalDebit += sums.debit;
      totalCredit += sums.credit;
      return {
        account: { id: account._id, code: account.code, name: account.name, category: account.category },
        debit: sums.debit,
        credit: sums.credit,
      };
    });

    return { trialBalance, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.005 };
  }

  /**
   * Journal Report — chronological listing of Posted journal entries (with their lines inlined),
   * filterable by date range and `sourceType` (e.g. "show me every SALES_COGS entry this month").
   */
  async getJournalReport({ brand, branch, startDate, endDate, sourceType, page = 1, limit = 25 }) {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);

    const match = {
      brand,
      status: "Posted",
      ...(branch ? { branch } : {}),
      ...this._dateMatch(startDate, endDate),
    };

    const [total, entries] = await Promise.all([
      JournalEntryModel.countDocuments(match),
      JournalEntryModel.find(match)
        .sort({ date: -1, entryNumber: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
    ]);

    const entryIds = entries.map((e) => e._id);
    const lineFilter = { journalEntry: { $in: entryIds } };
    if (sourceType) lineFilter.sourceType = sourceType;
    const lines = await JournalLineModel.find(lineFilter)
      .select("journalEntry account description debit credit sourceType sourceRef")
      .populate({ path: "account", select: "code name" })
      .lean();

    const linesByEntry = new Map();
    for (const line of lines) {
      const key = String(line.journalEntry);
      if (!linesByEntry.has(key)) linesByEntry.set(key, []);
      linesByEntry.get(key).push(line);
    }

    // If filtering by sourceType, only surface entries that actually have a matching line.
    const report = entries
      .map((entry) => ({ ...entry, lines: linesByEntry.get(String(entry._id)) || [] }))
      .filter((entry) => !sourceType || entry.lines.length > 0);

    return {
      entries: report,
      pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) },
    };
  }

  /* -------------------------------------------------------------------------- */
  /*                         Shared aggregation helpers                         */
  /* -------------------------------------------------------------------------- */

  /**
   * Public (not underscore-prefixed, unlike the other aggregation helpers below): sums debit/credit
   * for every account in `accountIds`, grouped by account, over an optional date range — reused
   * directly by `accounting/financial-statements` for the Balance Sheet and Income Statement rather
   * than duplicating this exact aggregation a second time.
   */
  async sumPostedLinesGroupedByAccount({ brand, branch, accountIds, startDate, endDate }) {
    const pipeline = [
      {
        $match: {
          brand: new mongoose.Types.ObjectId(brand),
          account: { $in: accountIds },
          ...(branch ? { branch: new mongoose.Types.ObjectId(branch) } : {}),
          ...this._dateMatch(startDate, endDate),
        },
      },
      {
        $lookup: {
          from: "journalentries",
          localField: "journalEntry",
          foreignField: "_id",
          as: "entry",
        },
      },
      { $unwind: "$entry" },
      { $match: { "entry.status": "Posted" } },
      { $group: { _id: "$account", debit: { $sum: "$debit" }, credit: { $sum: "$credit" } } },
    ];

    const rows = await JournalLineModel.aggregate(pipeline);
    return new Map(rows.map((row) => [String(row._id), { debit: row.debit, credit: row.credit }]));
  }

  /**
   * Sums the first `n` Posted lines matching `match`, in the SAME chronological order
   * `_findPostedLines` paginates through — this is what makes a page's opening balance correct:
   * "the balance after every line that would have appeared on an earlier page."
   */
  async _sumFirstNPostedLines(match, n) {
    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "journalentries",
          localField: "journalEntry",
          foreignField: "_id",
          as: "entry",
        },
      },
      { $unwind: "$entry" },
      { $match: { "entry.status": "Posted" } },
      { $sort: { date: 1, _id: 1 } },
      { $limit: n },
      { $group: { _id: null, debit: { $sum: "$debit" }, credit: { $sum: "$credit" } } },
    ];
    const [row] = await JournalLineModel.aggregate(pipeline);
    return row ? { debit: row.debit, credit: row.credit } : { debit: 0, credit: 0 };
  }

  async _countPostedLines(match) {
    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "journalentries",
          localField: "journalEntry",
          foreignField: "_id",
          as: "entry",
        },
      },
      { $unwind: "$entry" },
      { $match: { "entry.status": "Posted" } },
      { $count: "total" },
    ];
    const [row] = await JournalLineModel.aggregate(pipeline);
    return row?.total || 0;
  }

  async _findPostedLines(match, page, limit) {
    // Posted-only filtering requires the join, so pagination happens post-lookup — acceptable at
    // this scale (a single account's ledger, not the whole ledger table) and still a single
    // round-trip aggregation rather than N queries.
    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "journalentries",
          localField: "journalEntry",
          foreignField: "_id",
          as: "journalEntry",
        },
      },
      { $unwind: "$journalEntry" },
      { $match: { "journalEntry.status": "Posted" } },
      { $sort: { date: 1, _id: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $project: {
          date: 1, description: 1, debit: 1, credit: 1, sourceType: 1,
          "journalEntry.entryNumber": 1,
        },
      },
    ];
    return JournalLineModel.aggregate(pipeline);
  }
}

export default new LedgerService();
