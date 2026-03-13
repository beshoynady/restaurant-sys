import mongoose from "mongoose";
import JournalEntry from "../../models/accounting/journal-entry.model.js";
import Account from "../../models/accounting/account.model.js";

/**
 * Get ledger for a specific account
 */
const getLedgerByAccount = async (req, res) => {
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

    // Build query
    const query = {
      brand,
      branch,
      status: "Posted",
      "lines.account": accountId,
    };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const entries = await JournalEntry.find(query)
      .sort({ date: 1, entryNumber: 1 })
      .select("entryNumber date description lines");

    let runningBalance = 0;
    const ledger = [];

    for (const entry of entries) {
      const line = entry.lines.find((l) => l.account.toString() === accountId);
      if (!line) continue;

      const debit = line.debit || 0;
      const credit = line.credit || 0;

      if (account.normalBalance === "Debit") {
        runningBalance += debit - credit;
      } else {
        runningBalance += credit - debit;
      }

      ledger.push({
        entryNumber: entry.entryNumber,
        date: entry.date,
        description: entry.description || line.description,
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
};

/**
 * Get ledger for multiple accounts (for Trial Balance)
 */
const getLedgerMultiAccount = async (req, res) => {
  try {
    const { brand, branch, startDate, endDate } = req.query;

    // Fetch all active accounts for the brand (and optionally branch)
    const accountFilter = { brand, status: "active", isDeleted: false };
    if (branch) accountFilter.branch = branch;

    const accounts = await Account.find(accountFilter).sort({ code: 1 });

    const ledgerReport = [];

    for (const account of accounts) {
      const query = {
        brand,
        branch,
        status: "Posted",
        "lines.account": account._id,
      };
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      const entries = await JournalEntry.find(query)
        .sort({ date: 1, entryNumber: 1 })
        .select("lines debit credit");

      let debitTotal = 0;
      let creditTotal = 0;

      entries.forEach((entry) => {
        const line = entry.lines.find(
          (l) => l.account.toString() === account._id.toString()
        );
        if (!line) return;
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
};

/**
 * Prepare Trial Balance
 * This function aggregates all accounts to check that total debits = total credits
 */
const getTrialBalance = async (req, res) => {
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
      const query = {
        brand,
        branch,
        status: "Posted",
        "lines.account": account._id,
      };
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      const entries = await JournalEntry.find(query)
        .sort({ date: 1, entryNumber: 1 })
        .select("lines");

      let debitSum = 0;
      let creditSum = 0;

      entries.forEach((entry) => {
        const line = entry.lines.find(
          (l) => l.account.toString() === account._id.toString()
        );
        if (!line) return;
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
};

export  {
  getLedgerByAccount,
  getLedgerMultiAccount,
  getTrialBalance,
};
