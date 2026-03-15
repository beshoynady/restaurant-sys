import mongoose from "mongoose";
import BranchSettingsModel from "../../models/core/branch-settings.model.js";
import Joi from "joi";

const { ObjectId } = mongoose.Types;

/* ==================================================
   Joi Schemas
================================================== */

// Time format HH:mm 24-hour
const timeSchema = Joi
  .string()
  .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
  .message("Time must be in HH:mm 24-hour format");

// Period schema for operating hours
const periodSchema = Joi.object({
  name: Joi.string().trim().max(50).required(),
  openTime: timeSchema.required(),
  closeTime: timeSchema.required(),
  services: Joi.object({
    dineIn: Joi.object({
      enabled: Joi.boolean().default(true),
      openTime: timeSchema.optional(),
      closeTime: timeSchema.optional(),
    }),
    takeaway: Joi.object({
      enabled: Joi.boolean().default(true),
      openTime: timeSchema.optional(),
      closeTime: timeSchema.optional(),
    }),
    delivery: Joi.object({
      enabled: Joi.boolean().default(true),
      openTime: timeSchema.optional(),
      closeTime: timeSchema.optional(),
      minOrderAmount: Joi.number().min(0).optional(),
      estimatedTimeMinutes: Joi.number().min(0).optional(),
    }),
  }),
  pauses: Joi
    .array()
    .items(
      Joi.object({
        reason: Joi.string().trim().max(100).required(),
        from: timeSchema.required(),
        to: timeSchema.required(),
      }),
    )
    .optional(),
});

const operatingHoursSchema = Joi.array().items(
  Joi.object({
    day: Joi
      .string()
      .valid(
        "Saturday",
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
      )
      .required(),
    status: Joi.string().valid("open", "closed", "holiday").default("open"),
    periods: Joi.array().items(periodSchema).required(),
  }),
);

const featureSchema = Joi.object({
  name: Joi
    .string()
    .valid(
      "WiFi",
      "Parking",
      "Outdoor Seating",
      "Wheelchair Accessible",
      "Live Music",
      "Pet Friendly",
      "Kids Friendly",
      "Air Conditioning",
      "Smoking Area",
      "Live Sports",
      "Gaming Zone",
      "Other",
    )
    .required(),
  enabled: Joi.boolean().default(true),
  description: Joi.string().trim().max(150).optional(),
  iconUrl: Joi.string().trim().max(200).optional(),
});

const contactSchema = Joi.object({
  phone: Joi.array().items(Joi.string().trim().max(20)).optional(),
  whatsapp: Joi.string().trim().max(20).optional(),
  email: Joi.string().trim().max(100).email().optional(),
});

const createBranchSettingsSchema = Joi.object({
  brand: Joi.string().required(),
  branch: Joi.string().required(),
  contact: contactSchema.optional(),
  operatingHours: operatingHoursSchema.required(),
  features: Joi.array().items(featureSchema).optional(),
  usesReservationSystem: Joi.boolean().default(false),
  hasPrivateDining: Joi.boolean().default(false),
  hasOutdoorSeating: Joi.boolean().default(false),
  offersCurbsidePickup: Joi.boolean().default(false),
  offersOnlinePayment: Joi.boolean().default(false),
  offersCashOnDelivery: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
  createdBy: Joi.string().required(),
});

const updateBranchSettingsSchema = Joi.object({
  contact: contactSchema.optional(),
  operatingHours: operatingHoursSchema.optional(),
  features: Joi.array().items(featureSchema).optional(),
  usesReservationSystem: Joi.boolean().optional(),
  hasPrivateDining: Joi.boolean().optional(),
  hasOutdoorSeating: Joi.boolean().optional(),
  offersCurbsidePickup: Joi.boolean().optional(),
  offersOnlinePayment: Joi.boolean().optional(),
  offersCashOnDelivery: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  updatedBy: Joi.string().required(),
});

/* ==================================================
   Helpers
================================================== */

// Validate ObjectId
const isValidObjectId = (id) => ObjectId.isValid(id);

/**
 * Ensure branch settings do not already exist for this branch
 */
const ensureSingleBranchSettings = async (branchId) => {
  const existing = await BranchSettingsModel.findOne({
    branch: branchId,
    isDeleted: false,
  });
  return !!existing;
};

/* ==================================================
   CRUD Controllers
================================================== */

/**
 * Create Branch Settings
 */
const createBranchSettings = async (req, res) => {
  try {
    const brand = req.brand?._id;
    const branch = req.branch?._id;

    if (!isValidObjectId(brand) || !isValidObjectId(branch))
      return res.status(400).json({
        success: false,
        message: "Invalid brand or branch ID",
      });

    // Prevent multiple settings per branch
    const exists = await ensureSingleBranchSettings(branch);
    if (exists)
      return res.status(409).json({
        success: false,
        message: "Settings already exist for this branch",
      });

    const { error, value } = createBranchSettingsSchema.validate({
      ...req.body,
      brand,
      branch,
    }, { abortEarly: false });

    if (error)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((e) => e.message),
      });

    const branchSettings = await BranchSettingsModel.create(value);

    return res.status(201).json({
      success: true,
      message: "Branch settings created successfully",
      data: branchSettings,
    });
  } catch (err) {
    console.error("Create Branch Settings Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Update Branch Settings
 */
const updateBranchSettings = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id))
      return res.status(400).json({ success: false, message: "Invalid settings ID" });

    const { error } = updateBranchSettingsSchema.validate(req.body, { abortEarly: false });
    if (error)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((e) => e.message),
      });

    const settings = await BranchSettingsModel.findOne({ _id: id, isDeleted: false });
    if (!settings)
      return res.status(404).json({ success: false, message: "Settings not found" });

    const updated = await BranchSettingsModel.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true },
    );

    return res.status(200).json({
      success: true,
      message: "Branch settings updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("Update Branch Settings Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get all Branch Settings
 */
const getBranchSettings = async (req, res) => {
  try {
    const brand = req.brand?._id;
    const branch = req.branch?._id;
    if (!isValidObjectId(brand)) return res.status(400).json({ success: false, message: "Invalid brand ID" });

    const filter = { brand, isDeleted: false };
    if (branch) filter.branch = branch;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";

    const data = await BranchSettingsModel.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error("Get Branch Settings Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get Branch Settings by ID
 */
const getBranchSettingsById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid settings ID" });

    const settings = await BranchSettingsModel.findById(id);
    if (!settings || settings.isDeleted)
      return res.status(404).json({ success: false, message: "Settings not found" });

    return res.status(200).json({ success: true, data: settings });
  } catch (err) {
    console.error("Get Branch Settings By ID Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Soft Delete Branch Settings
 */
const softDeleteBranchSettings = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid settings ID" });

    const settings = await BranchSettingsModel.findById(id);
    if (!settings || settings.isDeleted)
      return res.status(404).json({ success: false, message: "Settings not found or already deleted" });

    settings.isDeleted = true;
    settings.deletedAt = new Date();
    settings.deletedBy = req.user._id;
    await settings.save();

    return res.status(200).json({ success: true, message: "Branch settings deleted successfully" });
  } catch (err) {
    console.error("Soft Delete Branch Settings Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Restore Soft Deleted Branch Settings
 */
const restoreBranchSettings = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid settings ID" });

    const settings = await BranchSettingsModel.findById(id);
    if (!settings || !settings.isDeleted)
      return res.status(404).json({ success: false, message: "Settings not found or not deleted" });

    settings.isDeleted = false;
    settings.deletedAt = null;
    settings.deletedBy = null;
    settings.updatedBy = req.user._id;
    await settings.save();

    return res.status(200).json({ success: true, message: "Branch settings restored successfully", data: settings });
  } catch (err) {
    console.error("Restore Branch Settings Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Hard Delete Branch Settings
 */
const deleteBranchSettings = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid settings ID" });

    const settings = await BranchSettingsModel.findByIdAndDelete(id);
    if (!settings) return res.status(404).json({ success: false, message: "Settings not found" });

    return res.status(200).json({ success: true, message: "Branch settings permanently deleted" });
  } catch (err) {
    console.error("Delete Branch Settings Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export   {
  createBranchSettings,
  updateBranchSettings,
  getBranchSettings,
  getBranchSettingsById,
  softDeleteBranchSettings,
  restoreBranchSettings,
  deleteBranchSettings,
};
