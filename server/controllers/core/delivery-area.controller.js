import DeliveryArea from "../models/core/deliveryArea.model.js";
import Joi from "joi";
import mongoose from "mongoose";
import ensureUniqueMultilangName from "../utils/unique-multilang.utils.js";

const { ObjectId } = mongoose.Types;

/* ==================================================
   Joi Validation Schemas
================================================== */

const createDeliveryAreaSchema = Joi.object({
  brand: Joi.string().required(),
  branch: Joi.string().required(),
  createdBy: Joi.string().required(),
  name: Joi.object()
    .pattern(Joi.string(), Joi.string().min(2).max(100))
    .required(),
  code: Joi.string().trim().uppercase().optional(),
  deliveryFee: Joi.number().min(0).required(),
  minimumOrderAmount: Joi.number().min(0).default(0),
  freeDeliveryThreshold: Joi.number().min(0).optional().allow(null),
  estimatedDeliveryTime: Joi.number().min(0).default(0),
  maxDeliveryDistance: Joi.number().min(0).optional().allow(null),
  isActive: Joi.boolean().default(true),
  acceptsCashOnDelivery: Joi.boolean().default(true),
  acceptsOnlinePayment: Joi.boolean().default(true),
  priority: Joi.number().min(0).default(0),
  notes: Joi.string().trim().max(200).optional(),
});

const updateDeliveryAreaSchema = Joi.object({
  name: Joi.object().pattern(Joi.string(), Joi.string().min(2).max(100)),
  code: Joi.string().trim().uppercase(),
  deliveryFee: Joi.number().min(0),
  minimumOrderAmount: Joi.number().min(0),
  freeDeliveryThreshold: Joi.number().min(0).allow(null),
  estimatedDeliveryTime: Joi.number().min(0),
  maxDeliveryDistance: Joi.number().min(0).allow(null),
  isActive: Joi.boolean(),
  acceptsCashOnDelivery: Joi.boolean(),
  acceptsOnlinePayment: Joi.boolean(),
  priority: Joi.number().min(0),
  notes: Joi.string().trim().max(200),
  updatedBy: Joi.string().required(),
}).min(1);

const softDeleteSchema = Joi.object({
  note: Joi.string().trim().max(200).optional(),
  deletedBy: Joi.string().required(),
});

/* ==================================================
   Helper Functions
================================================== */

const isValidObjectId = (id) => ObjectId.isValid(id);

/* ==================================================
   CRUD Controllers
================================================== */

// Create Delivery Area
const createDeliveryArea = async (req, res) => {
  try {
    const brand = req.brand;
    const branch = req.branch;
    const createdBy = req.employee._id;

    const { error, value } = createDeliveryAreaSchema.validate(
      {
        ...req.body,
        brand: brand._id,
        branch: branch._id,
        createdBy,
      },
      { abortEarly: false }
    );

    if (error)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((e) => e.message),
      });

    // ---------- Uniqueness check ----------
    const duplicateCheck = await ensureUniqueMultilangName({
      Model: DeliveryArea,
      nameObj: value.name,
      scope: { branch: value.branch },
      allowedLangs: brand.dashboardLanguages,
      onlyActive: true,
    });

    if (duplicateCheck)
      return res.status(409).json({
        success: false,
        message: duplicateCheck.error,
      });

    const deliveryArea = await DeliveryArea.create(value);

    return res.status(201).json({
      success: true,
      message: "Delivery area created successfully",
      data: deliveryArea,
    });
  } catch (err) {
    console.error("Create DeliveryArea Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update Delivery Area
const updateDeliveryArea = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = req.brand;
    const updatedBy = req.employee._id;

    if (!isValidObjectId(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });

    const { error, value } = updateDeliveryAreaSchema.validate(
      { ...req.body, brand: brand._id, updatedBy },
      { abortEarly: false }
    );

    if (error)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((e) => e.message),
      });

    const area = await DeliveryArea.findById(id);
    if (!area)
      return res.status(404).json({ success: false, message: "Delivery area not found" });

    // ---------- Uniqueness check ----------
    if (value.name) {
      const duplicateCheck = await ensureUniqueMultilangName({
        Model: DeliveryArea,
        nameObj: value.name,
        scope: { branch: area.branch },
        allowedLangs: brand.dashboardLanguages,
        excludeId: id,
        onlyActive: true,
      });

      if (duplicateCheck)
        return res.status(409).json({
          success: false,
          message: duplicateCheck.error,
        });
    }

    const updatedArea = await DeliveryArea.findByIdAndUpdate(id, { $set: value }, { new: true });

    return res.status(200).json({
      success: true,
      message: "Delivery area updated successfully",
      data: updatedArea,
    });
  } catch (err) {
    console.error("Update DeliveryArea Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all delivery areas for a branch
const getDeliveryAreasByBranch = async (req, res) => {
  try {
    const branchId = req.branch._id;
    const areas = await DeliveryArea.find({ branch: branchId }).sort({ priority: 1 });
    return res.status(200).json({ success: true, count: areas.length, data: areas });
  } catch (err) {
    console.error("Get Delivery Areas Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get active delivery areas for a branch
const getActiveDeliveryAreasByBranch = async (req, res) => {
  try {
    const branchId = req.branch._id;
    const areas = await DeliveryArea.find({ branch: branchId, isActive: true }).sort({ priority: 1 });
    return res.status(200).json({ success: true, count: areas.length, data: areas });
  } catch (err) {
    console.error("Get Active Delivery Areas Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get delivery area by code
const getDeliveryAreaByCode = async (req, res) => {
  try {
    const branchId = req.branch._id;
    const { code } = req.params;
    const area = await DeliveryArea.findOne({ branch: branchId, code: code.toUpperCase() });

    if (!area)
      return res.status(404).json({ success: false, message: "Delivery area not found" });

    return res.status(200).json({ success: true, data: area });
  } catch (err) {
    console.error("Get Delivery Area By Code Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Soft delete delivery area
const softDeleteDeliveryArea = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBy = req.employee._id;
    const { note } = req.body;

    if (!isValidObjectId(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });

    const { error, value } = softDeleteSchema.validate({ note, deletedBy }, { abortEarly: false });
    if (error)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.details.map((e) => e.message),
      });

    const area = await DeliveryArea.findById(id);
    if (!area)
      return res.status(404).json({ success: false, message: "Delivery area not found" });

    area.isActive = false;
    area.deletedAt = new Date();
    area.updatedBy = value.deletedBy;
    area.notes = value.note;

    await area.save();

    return res.status(200).json({ success: true, message: "Delivery area soft-deleted successfully" });
  } catch (err) {
    console.error("Soft Delete DeliveryArea Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Restore soft-deleted delivery area
const restoreDeliveryArea = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBy = req.employee._id;

    const area = await DeliveryArea.findById(id);
    if (!area)
      return res.status(404).json({ success: false, message: "Delivery area not found" });

    area.isActive = true;
    area.deletedAt = null;
    area.updatedBy = updatedBy;

    await area.save();

    return res.status(200).json({ success: true, message: "Delivery area restored successfully", data: area });
  } catch (err) {
    console.error("Restore DeliveryArea Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Hard delete delivery area
const hardDeleteDeliveryArea = async (req, res) => {
  try {
    const { id } = req.params;
    const area = await DeliveryArea.findByIdAndDelete(id);

    if (!area)
      return res.status(404).json({ success: false, message: "Delivery area not found" });

    return res.status(200).json({ success: true, message: "Delivery area permanently deleted" });
  } catch (err) {
    console.error("Hard Delete DeliveryArea Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ==================================================
   Export Controllers
================================================== */
export {
  createDeliveryArea,
  updateDeliveryArea,
  getDeliveryAreasByBranch,
  getActiveDeliveryAreasByBranch,
  getDeliveryAreaByCode,
  softDeleteDeliveryArea,
  restoreDeliveryArea,
  hardDeleteDeliveryArea,
};
