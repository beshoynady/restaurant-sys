import mongoose from "mongoose";
import JournalEntry from "./journal-entry.model.js";
import Account from "./account.model.js";
import asyncHandler from "../../utils/asyncHandler.js";

/**
 * Get ledger for a specific account
 *
 */

const reportsController = {
  getLedgerByAccount: asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(400).json({ message: "Invalid account ID" });
    }

    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }
    const journalEntries = await JournalEntry.find({
      "entries.account": accountId,
    }).sort({ date: 1 });
    const ledger = journalEntries.map((entry) => {
      const accountEntry = entry.entries.find(
        (e) => e.account.toString() === accountId,
      );
      return {
        date: entry.date,
        description: entry.description,
        type: accountEntry.type,
        amount: accountEntry.amount,
      };
    });
    res.json({ account: account.name, ledger });
  }),

  getTrialBalance: asyncHandler(async (req, res) => {
    const accounts = await Account.find();
    const trialBalance = [];
    for (const account of accounts) {
      const debitEntries = await JournalEntry.find({
        "entries.account": account._id,
        "entries.type": "debit",
      });
      const creditEntries = await JournalEntry.find({
        "entries.account": account._id,
        "entries.type": "credit",
      });
      const debitTotal = debitEntries.reduce((total, entry) => {
        const debitEntry = entry.entries.find(
          (e) =>
            e.account.toString() === account._id.toString() &&
            e.type === "debit",
        );
        return total + (debitEntry ? debitEntry.amount : 0);
      }, 0);
      const creditTotal = creditEntries.reduce((total, entry) => {
        const creditEntry = entry.entries.find(
          (e) =>
            e.account.toString() === account._id.toString() &&
            e.type === "credit",
        );
        return total + (creditEntry ? creditEntry.amount : 0);
      }, 0);
      trialBalance.push({
        account: account.name,
        debit: debitTotal,
        credit: creditTotal,
        balance: debitTotal - creditTotal,
      });
    }
    res.json(trialBalance);
  }),
};

export default reportsController;
