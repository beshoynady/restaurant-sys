import TableModel from "../../models/seating/table.model.js";
import diningAreaModel from "../../models/seating/dining-area.model.js";
import Joi from "joi";
import mongoose from "mongoose";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
const { ObjectId } = mongoose.Types;

/* =============================
   Joi Schemas
============================= */
const createTableSchema = Joi.object({
  brand: Joi.string().required(),
  branch: Joi.string().required(),
  diningArea: Joi.string().required(),
  tableNumber: Joi.string().trim().required(),
  tableCode: Joi.string().trim().uppercase().required(),
  minCapacity: Joi.number().min(1).default(1),
  maxCapacity: Joi.number().min(1).required(),
  status: Joi.string()
    .valid(
      "available",
      "occupied",
      "reserved",
      "cleaning",
      "maintenance",
      "out_of_service",
    )
    .default("available"),
  qrEnabled: Joi.boolean().default(false),
  notes: Joi.string().trim().max(250).optional(),
});

const updateTableSchema = Joi.object({
  tableNumber: Joi.string().trim(),
  tableCode: Joi.string().trim().uppercase(),
  minCapacity: Joi.number().min(1),
  maxCapacity: Joi.number().min(1),
  status: Joi.string().valid(
    "available",
    "occupied",
    "reserved",
    "cleaning",
    "maintenance",
    "out_of_service",
  ),
  qrEnabled: Joi.boolean(),
  notes: Joi.string().trim().max(250),
}).min(1);

/* =============================
   Helper Functions
============================= */
const isValidObjectId = (id) => ObjectId.isValid(id);

const checkDuplicateTableNumber = async (
  branch,
  tableNumber,
  excludeId = null,
) => {
  const query = { branch, tableNumber };
  if (excludeId) query._id = { $ne: excludeId };
  return await TableModel.exists(query);
};

/* =============================
   Controller Functions
============================= */

// Create Table
const createTable = async (req, res) => {
  try {
    const brand = req.brand._id;
    const branch = req.branch?._id;
    const createdBy = req.user._id;
    const { error, value } = createTableSchema.validate(
      { ...req.body, createdBy, brand, branch },
      { abortEarly: false },
    );
    if (error)
      return res
        .status(400)
        .json({ success: false, errors: error.details.map((e) => e.message) });

    // Validate diningArea exists in branch
    const diningArea = await diningAreaModel.findOne({
      _id: value.diningArea,
      branch: value.branch,
    });
    if (!diningArea)
      return res
        .status(400)
        .json({ success: false, message: "Invalid dining area or branch." });

    // Check duplicate tableNumber
    const duplicate = await checkDuplicateTableNumber(
      value.branch,
      value.tableNumber,
    );
    if (duplicate)
      return res.status(409).json({
        success: false,
        message: `Table number '${value.tableNumber}' already exists in this branch.`,
      });

    const table = await TableModel.create(value);
    return res.status(201).json({
      success: true,
      message: "Table created successfully.",
      data: table,
    });
  } catch (err) {
    console.error("Create Table Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while creating table.",
      error: err.message,
    });
  }
};

// Update Table
const updateTable = async (req, res) => {
  try {
    const tableId = req.params.tableId;
    const updatedBy = req.user._id;

    if (!isValidObjectId(tableId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid table ID." });

    const { error, value } = updateTableSchema.validate(
      { ...req.body, updatedBy },
      {
        abortEarly: false,
      },
    );
    if (error)
      return res
        .status(400)
        .json({ success: false, errors: error.details.map((e) => e.message) });

    const table = await TableModel.findById(tableId);
    if (!table)
      return res
        .status(404)
        .json({ success: false, message: "Table not found." });

    // Check duplicate tableNumber
    if (value.tableNumber && value.tableNumber !== table.tableNumber) {
      const duplicate = await checkDuplicateTableNumber(
        table.branch,
        value.tableNumber,
        tableId,
      );
      if (duplicate)
        return res.status(409).json({
          success: false,
          message: `Table number '${value.tableNumber}' already exists in this branch.`,
        });
    }

    value.updatedBy = updatedBy;
    const updatedTable = await TableModel.findByIdAndUpdate(
      tableId,
      { $set: value },
      { new: true },
    );
    return res.status(200).json({
      success: true,
      message: "Table updated successfully.",
      data: updatedTable,
    });
  } catch (err) {
    console.error("Update Table Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while updating table.",
      error: err.message,
    });
  }
};

// Get All Tables
const getAllTables = async (_req, res) => {
  try {
    const tables = await TableModel.find()
      .populate("createdBy", "fullname username role")
      .populate("updatedBy", "fullname username role")
      .sort({ tableNumber: 1 });

    return res
      .status(200)
      .json({ success: true, count: tables.length, data: tables });
  } catch (err) {
    console.error("Get All Tables Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching tables.",
      error: err.message,
    });
  }
};

// Get Table By ID
const getTableById = async (req, res) => {
  try {
    const tableId = req.params.tableId;
    if (!isValidObjectId(tableId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid table ID." });

    const table = await TableModel.findById(tableId)
      .populate("createdBy", "fullname username role")
      .populate("updatedBy", "fullname username role");

    if (!table)
      return res
        .status(404)
        .json({ success: false, message: "Table not found." });
    return res.status(200).json({ success: true, data: table });
  } catch (err) {
    console.error("Get Table Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching table.",
      error: err.message,
    });
  }
};

// Delete Table
const deleteTable = async (req, res) => {
  try {
    const tableId = req.params.tableId;
    if (!isValidObjectId(tableId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid table ID." });

    const deleted = await TableModel.findByIdAndDelete(tableId);
    if (!deleted)
      return res.status(404).json({
        success: false,
        message: "Table not found or already deleted.",
      });

    return res
      .status(200)
      .json({ success: true, message: "Table deleted successfully." });
  } catch (err) {
    console.error("Delete Table Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting table.",
      error: err.message,
    });
  }
};

// Generate QR code
const generateTableQR = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url)
      return res.status(400).json({
        success: false,
        message: "URL is required for QR code generation.",
      });

    const qr = await QRCode.toDataURL(url);
    return res.status(200).json({ success: true, QRCode: qr });
  } catch (err) {
    console.error("Generate QR Error:", err);
    return res.status(500).json({
      success: false,
      message: "Error generating QR code.",
      error: err.message,
    });
  }
};

// Change Table Status
const changeTableStatus = async (req, res) => {
  try {
    const tableId = req.params.tableId;
    const { status } = req.body;
    const validStatuses = [
      "available",
      "occupied",
      "reserved",
      "cleaning",
      "maintenance",
      "out_of_service",
    ];
    if (!isValidObjectId(tableId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid table ID." });
    if (!validStatuses.includes(status))
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value." });

    const updatedTable = await TableModel.findByIdAndUpdate(
      tableId,
      { $set: { status } },
      { new: true },
    );
    if (!updatedTable)
      return res
        .status(404)
        .json({ success: false, message: "Table not found." });

    return res.status(200).json({
      success: true,
      message: "Table status updated successfully.",
      data: updatedTable,
    });
  } catch (err) {
    console.error("Change Table Status Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while changing table status.",
      error: err.message,
    });
  }
};

// Search Tables
const searchTables = async (req, res) => {
  try {
    const { branchId, diningAreaId, status } = req.query;
    const query = {};

    if (branchId) {
      if (!isValidObjectId(branchId))
        return res
          .status(400)
          .json({ success: false, message: "Invalid branch ID." });
      query.branch = branchId;
    }

    if (diningAreaId) {
      if (!isValidObjectId(diningAreaId))
        return res
          .status(400)
          .json({ success: false, message: "Invalid dining area ID." });
      query.diningArea = diningAreaId;
    }

    if (status) {
      const validStatuses = [
        "available",
        "occupied",
        "reserved",
        "cleaning",
        "maintenance",
        "out_of_service",
      ];
      if (!validStatuses.includes(status))
        return res
          .status(400)
          .json({ success: false, message: "Invalid status value." });
      query.status = status;
    }

    const tables = await TableModel.find(query)
      .populate("createdBy", "fullname username role")
      .populate("updatedBy", "fullname username role")
      .sort({ tableNumber: 1 });

    return res
      .status(200)
      .json({ success: true, count: tables.length, data: tables });
  } catch (err) {
    console.error("Search Tables Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while searching tables.",
      error: err.message,
    });
  }
};

const getTablesByDiningArea = async (req, res) => {
  try {
    const diningAreaId = req.params.diningAreaId;
    if (!isValidObjectId(diningAreaId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid dining area ID." });
    const tables = await TableModel.find({ diningArea: diningAreaId })
      .populate("createdBy", "fullname username role")
      .populate("updatedBy", "fullname username role")
      .sort({ tableNumber: 1 });
    return res
      .status(200)
      .json({ success: true, count: tables.length, data: tables });
  } catch (err) {
    console.error("Get Tables By Dining Area Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching tables by dining area.",
      error: err.message,
    });
  }
};
const getTablesByBranch = async (req, res) => {
  try {
    const branchId = req.params.branchId;
    if (!isValidObjectId(branchId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid branch ID." });
    const tables = await TableModel.find({ branch: branchId })
      .populate("createdBy", "fullname username role")
      .populate("updatedBy", "fullname username role")
      .sort({ tableNumber: 1 });
    return res
      .status(200)
      .json({ success: true, count: tables.length, data: tables });
  } catch (err) {
    console.error("Get Tables By Branch Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching tables by branch.",
      error: err.message,
    });
  }
};

const createMultipleTables = async (req, res) => {
  try {
    const brand = req.brand._id;
    const branch = req.branch?._id;
    const createdBy = req.user._id;
    const { tables } = req.body;
    if (!Array.isArray(tables) || tables.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Tables array is required." });
    }
    const createdTables = [];
    for (const tableData of tables) {
      const { error, value } = createTableSchema.validate(
        { ...tableData, createdBy, brand, branch },
        { abortEarly: false },
      );
      if (error) {
        return res.status(400).json({
          success: false,
          errors: error.details.map((e) => e.message),
        });
      }
      const createdTable = await TableModel.create(value);
      createdTables.push(createdTable);
    }
    return res.status(201).json({
      success: true,
      count: createdTables.length,
      data: createdTables,
    });
  } catch (err) {
    console.error("Create Multiple Tables Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while creating multiple tables.",
      error: err.message,
    });
  }
};

const createTableCode = async (req, res) => {
  try {
    const { tableId } = req.params;
    if (!isValidObjectId(tableId))
      return res
        .status(400)
        .json({ success: false, message: "Invalid table ID." });

    const code = `TBL-${uuidv4().split("-")[0].toUpperCase()}`;
    const updatedTable = await TableModel.findByIdAndUpdate(
      tableId,
      { $set: { tableCode: code } },
      { new: true },
    );
    if (!updatedTable)
      return res
        .status(404)
        .json({ success: false, message: "Table not found." });

    return res.status(200).json({
      success: true,
      data: updatedTable,
    });
  } catch (err) {
    console.error("Create Table Code Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while generating table code.",
      error: err.message,
    });
  }
};

const getTableByCode = async (req, res) => {
  try {
    const { tableCode } = req.params;
    if (!tableCode)
      return res
        .status(400)
        .json({ success: false, message: "Table code is required." });
    const table = await TableModel.findOne({
      tableCode: tableCode.trim().toUpperCase(),
    })
      .populate("createdBy", "fullname username role")
      .populate("updatedBy", "fullname username role");
    if (!table)
      return res
        .status(404)
        .json({ success: false, message: "Table not found." });
    return res.status(200).json({ success: true, data: table });
  } catch (err) {
    console.error("Get Table By Code Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching table by code.",
      error: err.message,
    });
  }
};

export {
  createTable,
  updateTable,
  getAllTables,
  getTableById,
  deleteTable,
  generateTableQR,
  changeTableStatus,
  searchTables,
  getTablesByDiningArea,
  getTablesByBranch,
  createMultipleTables,
  createTableCode,
  getTableByCode,
};
