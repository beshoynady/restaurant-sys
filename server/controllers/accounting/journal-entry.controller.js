import mongoose from "mongoose";
import Joi from "joi";

import JournalEntry from "../../models/accounting/journal-entry.model.js";
import AccountingPeriod from "../../models/accounting/accounting-period.model.js";
import Account from "../../models/accounting/account.model.js";

// --------------------------------------------------
// Joi Validation Schemas
// --------------------------------------------------

const journalLineSchema = Joi.object({
  account: Joi.string().required(),
  debit: Joi.number().min(0).default(0),
  credit: Joi.number().min(0).default(0),
  description: Joi.string().max(300).allow("", null),
}).custom((value, helpers) => {
  if ((value.debit || 0) === 0 && (value.credit || 0) === 0) {
    return helpers.message("Each journal line must have debit or credit value");
  }
  if ((value.debit || 0) > 0 && (value.credit || 0) > 0) {
    return helpers.message("Journal line cannot have both debit and credit");
  }
  return value;
});

const createJournalEntrySchema = Joi.object({
  brand: Joi.string().required(),
  branch: Joi.string().required(),
  period: Joi.string().required(),
  entryNumber: Joi.string().required(),
  date: Joi.date().required(),
  description: Joi.string().max(500).allow("", null),
  lines: Joi.array().items(journalLineSchema).min(2).required(),
});

// --------------------------------------------------
// Helper Functions
// --------------------------------------------------

/**
 * Validate accounting period status and date range
 */
const validatePeriod = async (periodId, entryDate) => {
  const period = await AccountingPeriod.findById(periodId);
  if (!period) throw new Error("Accounting period not found");

  if (period.status === "Closed") {
    throw new Error("Accounting period is closed");
  }

  if (entryDate < period.startDate || entryDate > period.endDate) {
    throw new Error("Entry date is outside accounting period range");
  }

  return period;
};

/**
 * Validate accounts and posting rules
 */
const validateAccounts = async (lines) => {
  for (const line of lines) {
    const account = await Account.findById(line.account);

    if (!account) {
      throw new Error("Account not found");
    }

    if (account.isDeleted || account.status !== "active") {
      throw new Error("Account is inactive or deleted");
    }

    if (account.isGroup || !account.allowPosting) {
      throw new Error("Posting is not allowed on grouping account");
    }
  }
};

/**
 * Ensure debit equals credit
 */
const validateBalance = (lines) => {
  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);

  if (totalDebit !== totalCredit) {
    throw new Error("Total debit must equal total credit");
  }
};

// --------------------------------------------------
// Controller Functions
// --------------------------------------------------

/**
 * Create new journal entry
 */
const createJournalEntry = async (req, res) => {
  try {
    const { error, value } = createJournalEntrySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const entryDate = new Date(value.date);

    // Validate accounting period
    await validatePeriod(value.period, entryDate);

    // Ensure unique entry number per brand/branch/period
    const exists = await JournalEntry.findOne({
      brand: value.brand,
      branch: value.branch,
      period: value.period,
      entryNumber: value.entryNumber,
    });

    if (exists) {
      return res.status(400).json({
        message: "Journal entry number already exists for this period",
      });
    }

    // Validate accounts
    await validateAccounts(value.lines);

    // Validate debit/credit balance
    validateBalance(value.lines);

    const entry = await JournalEntry.create({
      ...value,
      createdBy: req.user._id,
      status: "Pending",
    });

    res.status(201).json({
      message: "Journal entry created successfully",
      entry,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || "Dine-in server error" });
  }
};

/**
 * Post journal entry (lock it)
 */
const postJournalEntry = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid journal entry ID" });
    }

    const entry = await JournalEntry.findById(id);
    if (!entry) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    if (entry.status !== "Pending") {
      return res.status(400).json({
        message: "Only pending entries can be posted",
      });
    }

    // Validate period again at posting time
    await validatePeriod(entry.period, entry.date);

    entry.status = "Posted";
    await entry.save();

    res.status(200).json({
      message: "Journal entry posted successfully",
      entry,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || "Dine-in server error" });
  }
};

/**
 * Reject journal entry
 */
const rejectJournalEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await JournalEntry.findById(id);
    if (!entry) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    if (entry.status === "Posted") {
      return res.status(400).json({
        message: "Cannot reject a posted journal entry",
      });
    }

    entry.status = "Rejected";
    await entry.save();

    res.status(200).json({
      message: "Journal entry rejected",
      entry,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dine-in server error" });
  }
};

/**
 * Get journal entries with filters
 */
const getJournalEntries = async (req, res) => {
  try {
    const { brand, branch, period, status } = req.query;

    const filter = {};
    if (brand) filter.brand = brand;
    if (branch) filter.branch = branch;
    if (period) filter.period = period;
    if (status) filter.status = status;

    const entries = await JournalEntry.find(filter)
      .populate("period", "name")
      .populate("lines.account", "code name")
      .sort({ date: 1, entryNumber: 1 });

    res.status(200).json({ entries });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dine-in server error" });
  }
};

/**
 * Get single journal entry
 */
const getJournalEntryById = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await JournalEntry.findById(id)
      .populate("period", "name")
      .populate("lines.account", "code name");

    if (!entry) {
      return res.status(404).json({ message: "Journal entry not found" });
    }

    res.status(200).json({ entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dine-in server error" });
  }
};

// --------------------------------------------------
// export  Controllers
// --------------------------------------------------

export  {
  createJournalEntry,
  postJournalEntry,
  rejectJournalEntry,
  getJournalEntries,
  getJournalEntryById,
};
