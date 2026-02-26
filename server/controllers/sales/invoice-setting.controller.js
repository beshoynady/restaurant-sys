const Joi = require("joi");
const mongoose = require("mongoose");
const InvoiceSettings = require("../models/settings/invoice-settings.model");

/**
 * ============================
 * Joi Validation Schemas
 * ============================
 */

const baseSchema = {
  brand: Joi.string().required(),
  branch: Joi.string().allow(null),

  logoUrl: Joi.string(),
  headerText: Joi.object(),
  footerText: Joi.object(),

  showInvoiceNumber: Joi.boolean(),
  showDate: Joi.boolean(),
  showCashier: Joi.boolean(),
  showTableNumber: Joi.boolean(),
  showItemsCalories: Joi.boolean(),
  showSubtotal: Joi.boolean(),
  showDiscount: Joi.boolean(),
  showTax: Joi.boolean(),
  showTotal: Joi.boolean(),
  showPaymentMethod: Joi.boolean(),
  showChange: Joi.boolean(),

  primaryLanguage: Joi.string(),
  secondaryLanguage: Joi.string().allow(null),

  fontSize: Joi.number().min(8).max(20),
  paperWidth: Joi.number().valid(58, 80, 100),
  isBoldHeader: Joi.boolean(),

  includeQRCode: Joi.boolean(),
  qrCodeUrl: Joi.string().allow(null),

  createdBy: Joi.string().required(),
  updatedBy: Joi.string(),
};

const createSchema = Joi.object(baseSchema);

const updateSchema = Joi.object({
  ...baseSchema,
  brand: Joi.string().optional(),
  createdBy: Joi.string().optional(),
});

/**
 * ============================
 * Create Invoice Settings
 * ============================
 */
const createInvoiceSettings = async (req, res) => {
  try {
    const {
      brand,
      branch,
      createdBy,
    } = req.body;

    const validation = createSchema.validate(req.body);
    if (validation.error) {
      return res.status(400).json({
        message: "Validation error",
        errors: validation.error.details,
      });
    }

    const exists = await InvoiceSettings.findOne({ brand, branch });
    if (exists) {
      return res.status(409).json({
        message: "Invoice settings already exist",
      });
    }

    const settings = await InvoiceSettings.create(req.body);

    res.status(201).json(settings);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create invoice settings",
      error: error.message,
    });
  }
};

/**
 * ============================
 * Get Invoice Settings
 * ============================
 * Priority:
 * 1- Branch settings
 * 2- Brand default settings
 */
const getInvoiceSettings = async (req, res) => {
  try {
    const { brandId, branchId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(brandId)) {
      return res.status(400).json({ message: "Invalid brand id" });
    }

    let settings = null;

    if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
      settings = await InvoiceSettings.findOne({
        brand: brandId,
        branch: branchId,
        isActive: true,
      });
    }

    if (!settings) {
      settings = await InvoiceSettings.findOne({
        brand: brandId,
        branch: null,
        isActive: true,
      });
    }

    if (!settings) {
      return res.status(404).json({
        message: "Invoice settings not found",
      });
    }

    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch invoice settings",
      error: error.message,
    });
  }
};

/**
 * ============================
 * Update Invoice Settings
 * ============================
 */
const updateInvoiceSettings = async (req, res) => {
  try {
    const { settingsId } = req.params;

    const validation = updateSchema.validate(req.body);
    if (validation.error) {
      return res.status(400).json({
        message: "Validation error",
        errors: validation.error.details,
      });
    }

    const updated = await InvoiceSettings.findByIdAndUpdate(
      settingsId,
      { $set: req.body },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Invoice settings not found",
      });
    }

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update invoice settings",
      error: error.message,
    });
  }
};

/**
 * ============================
 * Delete Invoice Settings
 * ============================
 */
const deleteInvoiceSettings = async (req, res) => {
  try {
    const { settingsId } = req.params;

    const deleted = await InvoiceSettings.findByIdAndDelete(settingsId);

    if (!deleted) {
      return res.status(404).json({
        message: "Invoice settings not found",
      });
    }

    res.status(200).json({
      message: "Invoice settings deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete invoice settings",
      error: error.message,
    });
  }
};

module.exports = {
  createInvoiceSettings,
  getInvoiceSettings,
  updateInvoiceSettings,
  deleteInvoiceSettings,
};
