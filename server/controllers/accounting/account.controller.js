// account.controller.js
const Account = require("../../models/accounting/account.model.js");
const Joi = require("joi");
const mongoose = require("mongoose");

// --------------------------
// Validation Schemas
// --------------------------
const createAccountSchema = Joi.object({
  brand: Joi.string().required(),
  branch: Joi.string().allow(null), // optional, null means general account
  code: Joi.string().max(30).required(),
  name: Joi.object()
    .pattern(Joi.string(), Joi.string().min(2).max(100))
    .required(),
  type: Joi.string()
    .valid("Asset", "Liability", "Equity", "Revenue", "Expense")
    .required(),
  normalBalance: Joi.string().valid("Debit", "Credit").required(),
  parent: Joi.string().allow(null),
  isGroup: Joi.boolean(),
  isSystem: Joi.boolean(),
  allowPosting: Joi.boolean(),
  status: Joi.string().valid("active", "inactive"),
  description: Joi.string().max(300).allow("", null),
});

const updateAccountSchema = Joi.object({
  branch: Joi.string().allow(null),
  code: Joi.string().max(30),
  name: Joi.object().pattern(Joi.string(), Joi.string().min(2).max(100)),
  type: Joi.string().valid(
    "Asset",
    "Liability",
    "Equity",
    "Revenue",
    "Expense"
  ),
  normalBalance: Joi.string().valid("Debit", "Credit"),
  parent: Joi.string().allow(null),
  isGroup: Joi.boolean(),
  isSystem: Joi.boolean(),
  allowPosting: Joi.boolean(),
  status: Joi.string().valid("active", "inactive"),
  description: Joi.string().max(300).allow("", null),
});

// --------------------------
// Controller Functions
// --------------------------

/**
 * Create a new account
 */
const createAccount = async (req, res) => {
  try {
    const { error, value } = createAccountSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    // Check if code already exists for the brand
    const existing = await Account.findOne({
      brand: value.brand,
      code: value.code,
    });
    if (existing)
      return res
        .status(400)
        .json({ message: "Account code already exists for this brand." });

    const account = await Account.create({
      ...value,
      createdBy: req.user._id,
    });

    res.status(201).json({ message: "Account created successfully", account });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dine-in server error" });
  }
};

/**
 * Get all accounts with optional filters
 */
const getAccounts = async (req, res) => {
  try {
    const { brand, branch, type, status, isGroup } = req.query;
    const filter = {};

    if (brand) filter.brand = brand;
    if (branch) filter.branch = branch; // filter by branch
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (isGroup !== undefined) filter.isGroup = isGroup === "true";

    const accounts = await Account.find(filter)
      .populate("parent", "name code")
      .sort({ code: 1 });

    res.status(200).json({ accounts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dine-in server error" });
  }
};

/**
 * Get a single account by ID
 */
const getAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid account ID." });

    const account = await Account.findById(id).populate("parent", "name code");
    if (!account)
      return res.status(404).json({ message: "Account not found." });

    res.status(200).json({ account });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dine-in server error" });
  }
};

/**
 * Get account by code (brand + code)
 */
const getAccountByCode = async (req, res) => {
  try {
    const { brand, code } = req.params;
    const account = await Account.findOne({ brand, code });
    if (!account)
      return res.status(404).json({ message: "Account not found." });

    if (account.isDeleted)
      return res.status(400).json({ message: "Account is deleted." });

    res.status(200).json({ account });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dine-in server error" });
  }
};

/**
 * Get accounts by parent ID
 */
const getAccountsByParent = async (req, res) => {
  try {
    const { brand, parentId } = req.params;
    const accounts = await Account.find({ brand, parent: parentId });

    res.status(200).json({ accounts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dine-in server error" });
  }
};

/**
 * Update an account by ID
 */
const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid account ID." });

    const { error, value } = updateAccountSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const account = await Account.findById(id);
    if (!account)
      return res.status(404).json({ message: "Account not found." });

    // Prevent updating grouping accounts with children
    const childAccounts = await Account.find({
      brand: account.brand,
      parent: account._id,
    });
    if (childAccounts.length > 0) {
      return res
        .status(400)
        .json({
          message: "Cannot update a grouping account with child accounts.",
        });
    }

    Object.assign(account, value, { updatedBy: req.user._id });
    await account.save();

    res.status(200).json({ message: "Account updated successfully", account });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dine-in server error" });
  }
};

/**
 * Delete (soft delete) an account by ID
 */
const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid account ID." });

    const account = await Account.findById(id);
    if (!account)
      return res.status(404).json({ message: "Account not found." });

    // System accounts cannot be deleted
    if (account.isSystem)
      return res
        .status(400)
        .json({ message: "Cannot delete a system account." });

    account.isDeleted = true;
    account.deletedAt = new Date();
    account.deletedBy = req.user._id;
    await account.save();

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dine-in server error" });
  }
};

/**
 * Activate / Deactivate account
 */
const setAccountStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid account ID." });

    if (!["active", "inactive"].includes(status))
      return res.status(400).json({ message: "Invalid status value." });

    const account = await Account.findById(id);
    if (!account)
      return res.status(404).json({ message: "Account not found." });

    if (account.isDeleted)
      return res
        .status(400)
        .json({ message: "Cannot change status of a deleted account." });

    // System accounts cannot change status
    if (account.isSystem)
      return res
        .status(400)
        .json({ message: "Cannot change status of a system account." });

    account.status = status;
    account.updatedBy = req.user._id;
    await account.save();

    res
      .status(200)
      .json({ message: `Account ${status} successfully`, account });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dine-in server error" });
  }
};

// --------------------------
// Export all controller functions
// --------------------------
module.exports = {
  createAccount,
  getAccounts,
  getAccountById,
  getAccountByCode,
  getAccountsByParent,
  updateAccount,
  deleteAccount,
  setAccountStatus,
};
