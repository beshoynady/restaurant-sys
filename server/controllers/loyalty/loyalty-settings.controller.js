import Joi from "joi";
import mongoose from "mongoose";
import asyncHandler from "../../utils/asyncHandler.js";

import LoyaltySettings from "../../models/loyalty/loyalty-settings.model.js";

/**
 * =========================================================
 * Joi Validation Schemas
 * =========================================================
 */

/**
 * Validation schema for creating loyalty settings
 */
const createSchema = Joi.object({
  brand: Joi.string().required(),

  pointsPerCurrency: Joi.number().min(0).required(),
  currencyAmount: Joi.number().min(0).required(),
  currencyPerPoint: Joi.number().min(0).required(),

  minimumRedeemPoints: Joi.number().min(0),

  expirePointsAfterMonths: Joi.number().min(0),

  maxPointsPerOrder: Joi.number().min(0),

  maxRedeemPercentage: Joi.number().min(0).max(100),

  tiers: Joi.array().items(
    Joi.object({
      name: Joi.string().max(20).required(),
      minPoints: Joi.number().min(0).required(),
    })
  ),

  welcomeBonusPoints: Joi.number().min(0),

  birthdayBonusPoints: Joi.number().min(0),

  referralBonusPoints: Joi.number().min(0),

  isActive: Joi.boolean(),
});

/**
 * Validation schema for update
 */
const updateSchema = Joi.object({
  pointsPerCurrency: Joi.number().min(0),
  currencyAmount: Joi.number().min(0),
  currencyPerPoint: Joi.number().min(0),

  minimumRedeemPoints: Joi.number().min(0),

  expirePointsAfterMonths: Joi.number().min(0),

  maxPointsPerOrder: Joi.number().min(0),

  maxRedeemPercentage: Joi.number().min(0).max(100),

  tiers: Joi.array().items(
    Joi.object({
      name: Joi.string().max(20).required(),
      minPoints: Joi.number().min(0).required(),
    })
  ),

  welcomeBonusPoints: Joi.number().min(0),

  birthdayBonusPoints: Joi.number().min(0),

  referralBonusPoints: Joi.number().min(0),

  isActive: Joi.boolean(),
});

/**
 * =========================================================
 * Create Loyalty Settings
 * =========================================================
 */
const createLoyaltySettings = asyncHandler(async (req, res) => {
  const { error, value } = createSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const exists = await LoyaltySettings.findOne({
    brand: value.brand,
  });

  if (exists) {
    return res.status(400).json({
      success: false,
      message: "Loyalty settings already exist for this brand",
    });
  }

  const settings = await LoyaltySettings.create({
    ...value,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: settings,
  });
});

/**
 * =========================================================
 * Get All Loyalty Settings
 * =========================================================
 */
const getAllLoyaltySettings = asyncHandler(async (req, res) => {
  const settings = await LoyaltySettings.find()
    .populate("brand", "name")
    .populate("createdBy", "name");

  res.json({
    success: true,
    count: settings.length,
    data: settings,
  });
});

/**
 * =========================================================
 * Get Loyalty Settings by ID
 * =========================================================
 */
const getLoyaltySettings = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid settings ID",
    });
  }

  const settings = await LoyaltySettings.findById(id)
    .populate("brand", "name")
    .populate("createdBy", "name");

  if (!settings) {
    return res.status(404).json({
      success: false,
      message: "Loyalty settings not found",
    });
  }

  res.json({
    success: true,
    data: settings,
  });
});

/**
 * =========================================================
 * Get Loyalty Settings by Brand
 * =========================================================
 */
const getLoyaltySettingsByBrand = asyncHandler(async (req, res) => {
  const { brandId } = req.params;

  const settings = await LoyaltySettings.findOne({
    brand: brandId,
  });

  if (!settings) {
    return res.status(404).json({
      success: false,
      message: "No loyalty settings found for this brand",
    });
  }

  res.json({
    success: true,
    data: settings,
  });
});

/**
 * =========================================================
 * Update Loyalty Settings
 * =========================================================
 */
const updateLoyaltySettings = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { error, value } = updateSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  const settings = await LoyaltySettings.findById(id);

  if (!settings) {
    return res.status(404).json({
      success: false,
      message: "Loyalty settings not found",
    });
  }

  Object.assign(settings, value);

  settings.updatedBy = req.user._id;

  await settings.save();

  res.json({
    success: true,
    message: "Loyalty settings updated successfully",
    data: settings,
  });
});

/**
 * =========================================================
 * Toggle Loyalty Program (Enable / Disable)
 * =========================================================
 */
const toggleLoyaltyStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const settings = await LoyaltySettings.findById(id);

  if (!settings) {
    return res.status(404).json({
      success: false,
      message: "Settings not found",
    });
  }

  settings.isActive = !settings.isActive;

  settings.updatedBy = req.user._id;

  await settings.save();

  res.json({
    success: true,
    message: `Loyalty program ${
      settings.isActive ? "activated" : "disabled"
    } successfully`,
    data: settings,
  });
});

/**
 * =========================================================
 * Delete Loyalty Settings
 * =========================================================
 */
const deleteLoyaltySettings = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const settings = await LoyaltySettings.findById(id);

  if (!settings) {
    return res.status(404).json({
      success: false,
      message: "Settings not found",
    });
  }

  await settings.deleteOne();

  res.json({
    success: true,
    message: "Loyalty settings deleted successfully",
  });
});

/**
 * =========================================================
 * export default S
 * =========================================================
 */

export  {
  createLoyaltySettings,
  getAllLoyaltySettings,
  getLoyaltySettings,
  getLoyaltySettingsByBrand,
  updateLoyaltySettings,
  toggleLoyaltyStatus,
  deleteLoyaltySettings,
};