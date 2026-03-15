import mongoose from "mongoose";
import Joi from "joi";
import OrderSettingModel from "../../models/sales/order-settings.model.js";

/**
 * ==========================
 * Joi Validation Schemas
 * ==========================
 */
const ObjectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const orderSettingsSchema = Joi.object({
  brand: ObjectId.required(),
  branch: ObjectId.allow(null, "").optional(),

  autoCloseOrderAfterPayment: Joi.boolean().optional(),
  autoCloseOrderAfterTime: Joi.number().min(1).optional(),

  autoSendOrderToPreparationSection: Joi.boolean().optional(),
  autoSendOrderToPreparationAfterTime: Joi.number().min(1).optional(),

  allowEditOrderAfterSendToKitchen: Joi.boolean().optional(),

  requireManagerApprovalForCancel: Joi.boolean().optional(),
  cancelReasonRequired: Joi.boolean().optional(),

  allowSplitPayment: Joi.boolean().optional(),
  allowPartialPayment: Joi.boolean().optional(),

  maxTimeToSendToPreprationSection: Joi.number().min(1).optional(),
  maxTimeToServe: Joi.number().min(1).optional(),

  preventNegativeStockOrders: Joi.boolean().optional(),

  holdOrdersAllowed: Joi.boolean().optional(),
  maxHoldOrdersPerCashier: Joi.number().min(1).optional(),
  autoResumeHoldOrder: Joi.boolean().optional(),

  isActive: Joi.boolean().optional(),

  createdBy: ObjectId.required(),
  updatedBy: ObjectId.allow(null, "").optional(),
});

/**
 * ==========================
 * Create Order Settings
 * ==========================
 */
const createOrderSettings = async (req, res) => {
  try {
    const { error, value } = orderSettingsSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error)
      return res
        .status(400)
        .json({ message: "Validation error", errors: error.details });

    const { brand, branch } = value;

    // Check if already exists
    const exists = await OrderSettingModel.findOne({
      brand,
      branch: branch || null,
    });
    if (exists)
      return res
        .status(409)
        .json({
          message: "Order settings already exist for this brand/branch",
        });

    const created = await OrderSettingModel.create(value);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * ==========================
 * Update Order Settings
 * ==========================
 */
const updateOrderSettings = async (req, res) => {
  try {
    const { brand, branch } = req.params;

    if (!mongoose.Types.ObjectId.isValid(brand))
      return res.status(400).json({ message: "Invalid brand id" });

    if (branch && !mongoose.Types.ObjectId.isValid(branch))
      return res.status(400).json({ message: "Invalid branch id" });

    const { error, value } = orderSettingsSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error)
      return res
        .status(400)
        .json({ message: "Validation error", errors: error.details });

    const updated = await OrderSettingModel.findOneAndUpdate(
      { brand, branch: branch || null },
      { $set: value },
      { new: true }
    );

    if (!updated)
      return res
        .status(404)
        .json({ message: "Order settings not found for update" });

    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * ==========================
 * Get Order Settings
 * ==========================
 */
const getOrderSettings = async (req, res) => {
  try {
    const { brand, branch } = req.params;

    if (!mongoose.Types.ObjectId.isValid(brand))
      return res.status(400).json({ message: "Invalid brand id" });

    if (branch && !mongoose.Types.ObjectId.isValid(branch))
      return res.status(400).json({ message: "Invalid branch id" });

    const settings = await OrderSettingModel.findOne({
      brand,
      branch: branch || null,
    });

    if (!settings)
      return res.status(404).json({ message: "Order settings not found" });

    res.status(200).json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * ==========================
 * Delete Order Settings
 * ==========================
 */
const deleteOrderSettings = async (req, res) => {
  try {
    const { brand, branch } = req.params;

    if (!mongoose.Types.ObjectId.isValid(brand))
      return res.status(400).json({ message: "Invalid brand id" });

    if (branch && !mongoose.Types.ObjectId.isValid(branch))
      return res.status(400).json({ message: "Invalid branch id" });

    const deleted = await OrderSettingModel.findOneAndDelete({
      brand,
      branch: branch || null,
    });

    if (!deleted)
      return res.status(404).json({ message: "Order settings not found" });

    res.status(200).json({ message: "Order settings deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export   {
  createOrderSettings,
  updateOrderSettings,
  getOrderSettings,
  deleteOrderSettings,
};
