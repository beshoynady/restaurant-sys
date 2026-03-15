import Joi from "joi";
import mongoose from "mongoose";
import InventorySettings from "../../models/inventory/inventory-settings.model.js";

/**
 * ============================
 * Joi Validation Schemas
 * ============================
 */

const createSchema = Joi.object({
  brand: Joi.string().required(),
  branch: Joi.string().optional(),

  autoDeductOnOrder: Joi.boolean(),
  allowNegativeStock: Joi.boolean(),
  lowStockThreshold: Joi.number().min(0),
  enableProduction: Joi.boolean(),
  productionAutoApprove: Joi.boolean(),
});

const updateSchema = createSchema.fork(
  ["brand", "branch"],
  (schema) => schema.optional()
);

/**
 * ============================
 * Create Inventory Settings
 * ============================
 */
const createInventorySettings = async (req, res) => {
  try {
    const {
      brand,
      branch,
      autoDeductOnOrder,
      allowNegativeStock,
      lowStockThreshold,
      enableProduction,
      productionAutoApprove,
    } = req.body;

    const validation = createSchema.validate(req.body);
    if (validation.error) {
      return res.status(400).json({
        message: "Validation error",
        errors: validation.error.details,
      });
    }

    const exists = await InventorySettings.findOne({ branch });
    if (exists) {
      return res.status(409).json({
        message: "Inventory settings already exist for this branch",
      });
    }

    const settings = await InventorySettings.create({
      brand,
      branch,
      autoDeductOnOrder,
      allowNegativeStock,
      lowStockThreshold,
      enableProduction,
      productionAutoApprove,
    });

    res.status(201).json(settings);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create inventory settings",
      error: error.message,
    });
  }
};

/**
 * ============================
 * Get Inventory Settings
 * ============================
 */
const getInventorySettings = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: "Invalid branch id" });
    }

    const settings = await InventorySettings.findOne({ branch: branchId });

    if (!settings) {
      return res.status(404).json({
        message: "Inventory settings not found",
      });
    }

    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch inventory settings",
      error: error.message,
    });
  }
};

/**
 * ============================
 * Update Inventory Settings
 * ============================
 */
const updateInventorySettings = async (req, res) => {
  try {
    const { branchId } = req.params;

    const validation = updateSchema.validate(req.body);
    if (validation.error) {
      return res.status(400).json({
        message: "Validation error",
        errors: validation.error.details,
      });
    }

    const updated = await InventorySettings.findOneAndUpdate(
      { branch: branchId },
      { $set: req.body },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Inventory settings not found",
      });
    }

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update inventory settings",
      error: error.message,
    });
  }
};

/**
 * ============================
 * Delete Inventory Settings
 * ============================
 */
const deleteInventorySettings = async (req, res) => {
  try {
    const { branchId } = req.params;

    const deleted = await InventorySettings.findOneAndDelete({
      branch: branchId,
    });

    if (!deleted) {
      return res.status(404).json({
        message: "Inventory settings not found",
      });
    }

    res.status(200).json({
      message: "Inventory settings deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete inventory settings",
      error: error.message,
    });
  }
};

export  {
  createInventorySettings,
  getInventorySettings,
  updateInventorySettings,
  deleteInventorySettings,
};
