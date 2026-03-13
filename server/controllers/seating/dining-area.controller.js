import DiningAreaModel from "../../models/seating/diningArea.model.js";
import TableModel from "../../models/seating/table.model.js";
const Joi = required("joi");
const mongoose = require("mongoose");

const ObjectId = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.message("Invalid ObjectId");
  }
  return value;
};

/* ============================
   Joi Schemas
============================ */
const createDiningAreaSchema = Joi.object({
  brand: Joi.string().custom(ObjectId).required(),
  branch: Joi.string().custom(ObjectId).required(),
  name: Joi.object()
    .pattern(Joi.string(), Joi.string().trim().min(2))
    .required()
    .messages({ "object.base": "Name must be a localized object" }),
  code: Joi.string().uppercase().trim().min(2).max(10).required(),
  type: Joi.string()
    .valid("dine_in", "takeaway", "bar", "delivery", "drive_thru", "other")
    .default("dine_in"),
  priority: Joi.number().min(0).max(100).default(1),
  allowReservations: Joi.boolean().default(true),
  allowQR: Joi.boolean().default(true),
  allowManualOrders: Joi.boolean().default(true),
  notes: Joi.string().allow("").max(250),
});

const updateDiningAreaSchema = Joi.object({
  name: Joi.object().pattern(Joi.string(), Joi.string().trim().min(2)),
  code: Joi.string().uppercase().trim().min(2).max(10),
  type: Joi.string().valid(
    "dine_in",
    "takeaway",
    "bar",
    "delivery",
    "drive_thru",
    "other",
  ),
  priority: Joi.number().min(0).max(100),
  allowReservations: Joi.boolean(),
  allowQR: Joi.boolean(),
  allowManualOrders: Joi.boolean(),
  isActive: Joi.boolean(),
  notes: Joi.string().allow("").max(250),
}).min(1);

/* ============================
   Helper Functions
============================ */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ============================
   Controller
============================ */

// Create a dining area
const createDiningArea = async (req, res) => {
  try {
    const brand = req.brand._id;
    const branch = req.branch?._id;
    const createdBy = req.user._id;

    const { error, value } = createDiningAreaSchema.validate(
      { ...req.body, brand, branch, createdBy },
      { abortEarly: false, stripUnknown: true },
    );
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    // Prevent duplicate code per branch
    const exists = await DiningAreaModel.findOne({
      branch,
      code: value.code.toUpperCase(),
    });
    if (exists) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Dining area code already exists in this branch",
        });
    }

    const area = await DiningAreaModel.create(value);
    return res.status(201).json({ success: true, data: area });
  } catch (err) {
    console.error("Create Dining Area Error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error while creating dining area",
        error: err.message,
      });
  }
};

// Update a dining area
const updateDiningArea = async (req, res) => {
  try {
    const updatedBy = req.user._id;
    const { error, value } = updateDiningAreaSchema.validate(
      { ...req.body, updatedBy },
      { abortEarly: false, stripUnknown: true },
    );
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.details.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    const area = await DiningAreaModel.findById(req.params.id);
    if (!area)
      return res
        .status(404)
        .json({ success: false, message: "Dining area not found" });

    // Prevent duplicate code per branch
    if (value.code && value.code !== area.code) {
      const codeExists = await DiningAreaModel.findOne({
        branch: area.branch,
        code: value.code.toUpperCase(),
        _id: { $ne: area._id },
      });
      if (codeExists)
        return res
          .status(400)
          .json({
            success: false,
            message: "Dining area code already exists in this branch",
          });
    }

    Object.assign(area, value);
    await area.save();

    return res.status(200).json({ success: true, data: area });
  } catch (err) {
    console.error("Update Dining Area Error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error while updating dining area",
        error: err.message,
      });
  }
};

// Get all dining areas (optionally by branch)
const getDiningAreas = async (req, res) => {
  try {
    const query = {};
    if (req.query.branchId) {
      if (!isValidObjectId(req.query.branchId))
        return res
          .status(400)
          .json({ success: false, message: "Invalid branch ID" });
      query.branch = req.query.branchId;
    }
    query.isActive = true;

    const areas = await DiningAreaModel.find(query)
      .populate("createdBy")
      .populate("updatedBy")
      .sort({ priority: 1, createdAt: 1 });

    return res
      .status(200)
      .json({ success: true, count: areas.length, data: areas });
  } catch (err) {
    console.error("Get Dining Areas Error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error while fetching dining areas",
        error: err.message,
      });
  }
};

// Get dining area by ID
const getDiningAreaById = async (req, res) => {
  try {
    const area = await DiningAreaModel.findById(req.params.id)
      .populate("createdBy")
      .populate("updatedBy");

    if (!area)
      return res
        .status(404)
        .json({ success: false, message: "Dining area not found" });
    return res.status(200).json({ success: true, data: area });
  } catch (err) {
    console.error("Get Dining Area By ID Error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error while fetching dining area",
        error: err.message,
      });
  }
};

const getDiningAreasByBranch = async (req, res) => {
  try {
    const branchId = req.params.branchId;
    if (!isValidObjectId(branchId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid branch ID" });
    const areas = await DiningAreaModel.find({
      branch: branchId,
      isActive: true,
    })
      .populate("createdBy")
      .populate("updatedBy")
      .sort({ priority: 1, createdAt: 1 });
    return res
      .status(200)
      .json({ success: true, count: areas.length, data: areas });
  } catch (err) {
    console.error("Get Dining Areas By Branch Error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error while fetching dining areas by branch",
        error: err.message,
      });
  }
};

// Toggle dining area active status
const toggleDiningAreaStatus = async (req, res) => {
  try {
    const area = await DiningAreaModel.findById(req.params.id);
    if (!area)
      return res
        .status(404)
        .json({ success: false, message: "Dining area not found" });

    area.isActive = !area.isActive;
    area.updatedBy = req.user._id;
    await area.save();

    return res
      .status(200)
      .json({
        success: true,
        status: area.isActive ? "activated" : "deactivated",
      });
  } catch (err) {
    console.error("Toggle Dining Area Status Error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error while toggling status",
        error: err.message,
      });
  }
};

// Delete dining area (only if no active tables)
const deleteDiningArea = async (req, res) => {
  try {
    const tablesCount = await TableModel.countDocuments({
      diningArea: req.params.id,
    });
    if (tablesCount > 0)
      return res
        .status(400)
        .json({
          success: false,
          message: "Cannot delete dining area with tables. Deactivate instead.",
        });

    await DiningAreaModel.findByIdAndDelete(req.params.id);
    return res
      .status(200)
      .json({ success: true, message: "Dining area deleted successfully" });
  } catch (err) {
    console.error("Delete Dining Area Error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error while deleting dining area",
        error: err.message,
      });
  }
};

// Extra useful helper: get areas with tables populated
const getDiningAreasWithTables = async (req, res) => {
  try {
    const areas = await DiningAreaModel.find({ isActive: true })
      .populate({
        path: "createdBy updatedBy",
        select: "fullname username role",
      })
      .lean();

    // Populate tables for each area
    for (const area of areas) {
      area.tables = await TableModel.find({ diningArea: area._id })
        .select(
          "tableNumber tableCode minCapacity maxCapacity status qrEnabled",
        )
        .lean();
    }

    return res
      .status(200)
      .json({ success: true, count: areas.length, data: areas });
  } catch (err) {
    console.error("Get Dining Areas With Tables Error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Server error while fetching dining areas with tables",
        error: err.message,
      });
  }
};

module.exports = {
  createDiningArea,
  updateDiningArea,
  getDiningAreas,
  getDiningAreaById,
  toggleDiningAreaStatus,
  deleteDiningArea,
  getDiningAreasWithTables,
};
