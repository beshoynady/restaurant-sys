import mongoose from "mongoose";
import JournalEntry from "../../models/accounting/journal-entry.model.js";

// =====================================
// Profit & Loss Report
// =====================================

export s.getProfitAndLoss = async (req, res) => {
  try {
    const { brand, branch, from, to } = req.query;

    /* =========================
       1️⃣ Validation
    ========================= */
    if (!brand) {
      return res.status(400).json({
        message: "Brand is required",
      });
    }

    if (from && to && new Date(from) > new Date(to)) {
      return res.status(400).json({
        message: "From date cannot be greater than To date",
      });
    }

    /* =========================
       2️⃣ Build Match Object
    ========================= */
    const match = {
      brand: new mongoose.Types.ObjectId(brand),
      status: "Posted",
    };

    if (branch) {
      match.branch = new mongoose.Types.ObjectId(branch);
    }

    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to);
    }

    /* =========================
       3️⃣ Aggregation Pipeline
    ========================= */
    const data = await JournalEntry.aggregate([
      { $match: match },

      { $unwind: "$lines" },

      {
        $lookup: {
          from: "accounts",
          localField: "lines.account",
          foreignField: "_id",
          as: "account",
        },
      },
      { $unwind: "$account" },

      {
        $match: {
          "account.type": { $in: ["Revenue", "Expense"] },
        },
      },

      {
        $group: {
          _id: "$account.type",
          totalDebit: { $sum: "$lines.debit" },
          totalCredit: { $sum: "$lines.credit" },
        },
      },
    ]);

    /* =========================
       4️⃣ Safe Extract Totals
    ========================= */
    const revenueRow = data.find((d) => d._id === "Revenue") || {
      totalDebit: 0,
      totalCredit: 0,
    };

    const expenseRow = data.find((d) => d._id === "Expense") || {
      totalDebit: 0,
      totalCredit: 0,
    };

    /* =========================
       5️⃣ Correct Accounting Logic
    ========================= */
    // Revenue nature: Credit
    const revenue =
      revenueRow.totalCredit - revenueRow.totalDebit;

    // Expense nature: Debit
    const expenses =
      expenseRow.totalDebit - expenseRow.totalCredit;

    const netProfit = revenue - expenses;

    /* =========================
       6️⃣ Response
    ========================= */
    res.status(200).json({
      revenue,
      expenses,
      netProfit,
      details: {
        revenueDebit: revenueRow.totalDebit,
        revenueCredit: revenueRow.totalCredit,
        expenseDebit: expenseRow.totalDebit,
        expenseCredit: expenseRow.totalCredit,
      },
    });
  } catch (err) {
    console.error("Profit & Loss Error:", err);
    res.status(500).json({
      message: "Dine-in server error",
    });
  }
};




// =====================================
// Balance Sheet Report
// =====================================
export s.getBalanceSheet = async (req, res) => {
  try {
    const { brand, branch, asOfDate } = req.query;

    const match = {
      brand: new mongoose.Types.ObjectId(brand),
      status: "Posted",
    };

    if (branch) match.branch = new mongoose.Types.ObjectId(branch);
    if (asOfDate) match.date = { $lte: new Date(asOfDate) };

    const rows = await JournalEntry.aggregate([
      { $match: match },
      { $unwind: "$lines" },
      {
        $lookup: {
          from: "accounts",
          localField: "lines.account",
          foreignField: "_id",
          as: "account",
        },
      },
      { $unwind: "$account" },
      {
        $match: {
          "account.type": {
            $in: ["Asset", "Liability", "Equity"],
          },
        },
      },
      {
        $group: {
          _id: "$account.type",
          debit: { $sum: "$lines.debit" },
          credit: { $sum: "$lines.credit" },
        },
      },
    ]);

    const assets =
      rows.find((r) => r._id === "Asset")?.debit || 0;
    const liabilities =
      rows.find((r) => r._id === "Liability")?.credit || 0;
    const equity =
      rows.find((r) => r._id === "Equity")?.credit || 0;

    res.status(200).json({
      assets,
      liabilities,
      equity,
      balanced: assets === liabilities + equity,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dine-in server error" });
  }
};
