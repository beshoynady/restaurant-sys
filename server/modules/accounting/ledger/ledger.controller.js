import mongoose from "mongoose";
import JournalLine from "../journal-line/journal-line.model.js";
import Account from "../account/account.model.js";
import asyncHandler from "../../../utils/asyncHandler.js";

/**
 * Get ledger for a specific account
 *
 * Compatibility fix (DATABASE_IMPLEMENTATION_PLAN.md audit, DB-010/DB-014 pass): this controller
 * previously queried `JournalEntry` on the now-removed embedded `lines` array (`"lines.account"`,
 * `entry.lines.find(...)`) — a leftover from before DB-008/DB-009 replaced that array with the
 * standalone, indexed `JournalLine` collection (see journal-line.model.ts). Rewritten to query
 * `JournalLine` directly, filtered to `journalEntry.status: "Posted"` via a populate+filter (a
 * plain query can't filter on a populated field's condition directly in Mongoose, so entries are
 * populated and non-Posted lines are filtered out after the query) — this is also a genuine
 * performance improvement: an indexed `{account, brand, branch, period}` query on JournalLine
 * directly, instead of scanning every JournalEntry and re-searching its lines array per document.
 */

const ledgerController = {
  getLedgerByAccount: asyncHandler(async (req, res) => {
    try {
      const { accountId } = req.params;
      const { brand, branch, startDate, endDate } = req.query;

      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return res.status(400).json({ message: "Invalid account ID" });
      }

      const account = await Account.findById(accountId);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      const query = { brand, branch, account: accountId };

      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      const lines = await JournalLine.find(query)
        .sort({ date: 1 })
        .select("debit credit description date journalEntry")
        .populate({ path: "journalEntry", select: "entryNumber status" });

      let runningBalance = 0;
      const ledger = [];

      for (const line of lines) {
        if (!line.journalEntry || line.journalEntry.status !== "Posted") continue;

        const debit = line.debit || 0;
        const credit = line.credit || 0;

        if (account.normalBalance === "Debit") {
          runningBalance += debit - credit;
        } else {
          runningBalance += credit - debit;
        }

        ledger.push({
          entryNumber: line.journalEntry.entryNumber,
          date: line.date,
          description: line.description,
          debit,
          credit,
          runningBalance,
        });
      }

      res.status(200).json({
        account: { id: account._id, code: account.code, name: account.name },
        ledger,
        balance: runningBalance,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Dine-in server error" });
    }
  }),

  /**
   * Get ledger for multiple accounts (for Trial Balance)
   */
  getLedgerMultiAccount: asyncHandler(async (req, res) => {
    try {
      const { brand, branch, startDate, endDate } = req.query;

      // Fetch all active accounts for the brand (and optionally branch)
      const accountFilter = { brand, status: "active", isDeleted: false };
      if (branch) accountFilter.branch = branch;

      const accounts = await Account.find(accountFilter).sort({ code: 1 });

      const ledgerReport = [];

      for (const account of accounts) {
        const query = { brand, branch, account: account._id };
        if (startDate || endDate) {
          query.date = {};
          if (startDate) query.date.$gte = new Date(startDate);
          if (endDate) query.date.$lte = new Date(endDate);
        }

        const lines = await JournalLine.find(query)
          .select("debit credit journalEntry")
          .populate({ path: "journalEntry", select: "status" });

        let debitTotal = 0;
        let creditTotal = 0;

        lines.forEach((line) => {
          if (!line.journalEntry || line.journalEntry.status !== "Posted") return;
          debitTotal += line.debit || 0;
          creditTotal += line.credit || 0;
        });

        let balance =
          account.normalBalance === "Debit"
            ? debitTotal - creditTotal
            : creditTotal - debitTotal;

        ledgerReport.push({
          account: { id: account._id, code: account.code, name: account.name },
          debitTotal,
          creditTotal,
          balance,
        });
      }

      res.status(200).json({ ledgerReport });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Dine-in server error" });
    }
  }),

  /**
   * Prepare Trial Balance
   * This function aggregates all accounts to check that total debits = total credits
   */
  getTrialBalance: asyncHandler(async (req, res) => {
    try {
      const { brand, branch, startDate, endDate } = req.query;

      // Reuse multi-account ledger
      const accountFilter = { brand, status: "active", isDeleted: false };
      if (branch) accountFilter.branch = branch;

      const accounts = await Account.find(accountFilter).sort({ code: 1 });

      let totalDebit = 0;
      let totalCredit = 0;

      const trialBalance = [];

      for (const account of accounts) {
        const query = { brand, branch, account: account._id };
        if (startDate || endDate) {
          query.date = {};
          if (startDate) query.date.$gte = new Date(startDate);
          if (endDate) query.date.$lte = new Date(endDate);
        }

        const lines = await JournalLine.find(query)
          .select("debit credit journalEntry")
          .populate({ path: "journalEntry", select: "status" });

        let debitSum = 0;
        let creditSum = 0;

        lines.forEach((line) => {
          if (!line.journalEntry || line.journalEntry.status !== "Posted") return;
          debitSum += line.debit || 0;
          creditSum += line.credit || 0;
        });

        totalDebit += debitSum;
        totalCredit += creditSum;

        trialBalance.push({
          account: { id: account._id, code: account.code, name: account.name },
          debit: debitSum,
          credit: creditSum,
        });
      }

      res.status(200).json({
        trialBalance,
        totalDebit,
        totalCredit,
        balanced: totalDebit === totalCredit,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Dine-in server error" });
    }
  }),
};

export default ledgerController;
