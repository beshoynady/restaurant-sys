/**
 * Delivery Area Controller
 * ------------------------
 * CRUD operations for delivery areas with:
 * - Joi validation
 * - Multilingual name uniqueness check
 * - Soft delete / restore / hard delete
 * - Async error handling via asyncHandler
 */

const asyncHandler = require("express-async-handler");
const DeliveryArea = require("../../models/core/delivery-area.model");
const Joi = require("joi");
const mongoose = require("mongoose");
const ensureUniqueMultilangName = require("../../utils/unique-multilang.utils.js");

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
  notes: Joi.string().trim().max(250).optional(),
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
  notes: Joi.string().trim().max(250),
  updatedBy: Joi.string().required(),
}).min(1);

const softDeleteSchema = Joi.object({
  note: Joi.string().trim().max(250).optional(),
  deletedBy: Joi.string().required(),
});

/* ==================================================
   Helper Functions
================================================== */

const isValidObjectId = (id) => ObjectId.isValid(id);

/* ==================================================
   CRUD Controllers using asyncHandler
================================================== */

// Create Delivery Area
const createDeliveryArea = asyncHandler(async (req, res) => {
  const brand = req.brand;
  const branch = req.branch;
  const createdBy = req.employee._id;

  const { error, value } = createDeliveryAreaSchema.validate(
    { ...req.body, brand: brand._id, branch: branch._id, createdBy },
    { abortEarly: false, stripUnknown: true }
  );

  if (error) {
    res.status(400);
    throw new Error(error.details.map((e) => e.message).join(", "));
  }

  // Check uniqueness of multilingual name
  const duplicateCheck = await ensureUniqueMultilangName({
    Model: DeliveryArea,
    nameObj: value.name,
    scope: { branch: branch._id },
    allowedLangs: brand.dashboardLanguages,
    onlyActive: true,
  });

  if (duplicateCheck) {
    res.status(409);
    throw new Error(duplicateCheck.error);
  }

  const deliveryArea = await DeliveryArea.create(value);

  res.status(201).json({
    success: true,
    message: "Delivery area created successfully",
    data: deliveryArea,
  });
});

// Update Delivery Area
const updateDeliveryArea = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const brand = req.brand;
  const updatedBy = req.employee._id;

  if (!isValidObjectId(id)) {
    res.status(400);
    throw new Error("Invalid DeliveryArea ID");
  }

  const { error, value } = updateDeliveryAreaSchema.validate(
    { ...req.body, brand: brand._id, updatedBy },
    { abortEarly: false, stripUnknown: true }
  );

  if (error) {
    res.status(400);
    throw new Error(error.details.map((e) => e.message).join(", "));
  }

  const area = await DeliveryArea.findById(id);
  if (!area) {
    res.status(404);
    throw new Error("Delivery area not found");
  }

  // Check uniqueness if name updated
  if (value.name) {
    const duplicateCheck = await ensureUniqueMultilangName({
      Model: DeliveryArea,
      nameObj: value.name,
      scope: { branch: area.branch },
      excludeId: id,
      allowedLangs: brand.dashboardLanguages,
      onlyActive: true,
    });

    if (duplicateCheck) {
      res.status(409);
      throw new Error(duplicateCheck.error);
    }
  }

  Object.assign(area, value);
  await area.save();

  res.status(200).json({
    success: true,
    message: "Delivery area updated successfully",
    data: area,
  });
});

// Get all delivery areas for a branch
const getDeliveryAreasByBranch = asyncHandler(async (req, res) => {
  const branchId = req.branch._id;
  const areas = await DeliveryArea.find({ branch: branchId }).sort({ priority: 1 });
  res.status(200).json({ success: true, count: areas.length, data: areas });
});

// Get active delivery areas for a branch
const getActiveDeliveryAreasByBranch = asyncHandler(async (req, res) => {
  const branchId = req.branch._id;
  const areas = await DeliveryArea.find({ branch: branchId, isActive: true }).sort({ priority: 1 });
  res.status(200).json({ success: true, count: areas.length, data: areas });
});

// Get delivery area by code
const getDeliveryAreaByCode = asyncHandler(async (req, res) => {
  const branchId = req.branch._id;
  const { code } = req.params;

  const area = await DeliveryArea.findOne({ branch: branchId, code: code.toUpperCase() });
  if (!area) {
    res.status(404);
    throw new Error("Delivery area not found");
  }

  res.status(200).json({ success: true, data: area });
});

// Soft delete delivery area
const softDeleteDeliveryArea = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deletedBy = req.employee._id;
  const { note } = req.body;

  if (!isValidObjectId(id)) {
    res.status(400);
    throw new Error("Invalid DeliveryArea ID");
  }

  const { error, value } = softDeleteSchema.validate({ note, deletedBy }, { abortEarly: false });
  if (error) {
    res.status(400);
    throw new Error(error.details.map((e) => e.message).join(", "));
  }

  const area = await DeliveryArea.findById(id);
  if (!area) {
    res.status(404);
    throw new Error("Delivery area not found");
  }

  area.isActive = false;
  area.deletedAt = new Date();
  area.updatedBy = value.deletedBy;
  area.notes = value.note;
  await area.save();

  res.status(200).json({ success: true, message: "Delivery area soft-deleted successfully" });
});

// Restore soft-deleted delivery area
const restoreDeliveryArea = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedBy = req.employee._id;

  const area = await DeliveryArea.findById(id);
  if (!area) {
    res.status(404);
    throw new Error("Delivery area not found");
  }

  area.isActive = true;
  area.deletedAt = null;
  area.updatedBy = updatedBy;
  await area.save();

  res.status(200).json({ success: true, message: "Delivery area restored successfully", data: area });
});

// Hard delete delivery area
const hardDeleteDeliveryArea = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const area = await DeliveryArea.findByIdAndDelete(id);

  if (!area) {
    res.status(404);
    throw new Error("Delivery area not found");
  }

  res.status(200).json({ success: true, message: "Delivery area permanently deleted" });
});

/* ==================================================
   Export Controllers
================================================== */
module.exports = {
  createDeliveryArea,
  updateDeliveryArea,
  getDeliveryAreasByBranch,
  getActiveDeliveryAreasByBranch,
  getDeliveryAreaByCode,
  softDeleteDeliveryArea,
  restoreDeliveryArea,
  hardDeleteDeliveryArea,
};