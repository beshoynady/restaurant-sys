import OfflineCustomer from "../../models/customers/offline-customer.model.js";
import Joi from "joi";
import mongoose from "mongoose";

// ----------------------------
// 🔹 Joi Schemas for Validation
// ----------------------------

// Address schema for customer's delivery addresses
const addressSchema = Joi.object({
  address: Joi.string().min(3).max(150).required(), // Street address
  deliveryArea: Joi.string().required(), // Delivery area name
  location: Joi.object({
    type: Joi.string().valid("Point").required(), // GeoJSON type
    coordinates: Joi.array().items(Joi.number()).length(2).required(), // [longitude, latitude]
  }).required(),
  isDefault: Joi.boolean(), // Flag if this is the default address
  notes: Joi.string().max(300).allow(""), // Optional notes
});

// Schema for creating a new customer
const createCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(), // Customer name
  gender: Joi.string()
    .valid("male", "female", "not_specified")
    .default("not_specified"), // Gender with default
  phone: Joi.string()
    .max(30)
    .required()
    .regex(/^\+?[0-9\s\-]+$/, "valid phone number"), // Phone validation
  status: Joi.string().valid("active", "blocked").default("active"), // Account status
  addresses: Joi.array().items(addressSchema).min(1).required(), // At least one address
  loyalty: Joi.object({
    points: Joi.number().default(0), // Loyalty points
    tier: Joi.string().valid("regular", "vip").default("regular"), // Loyalty tier
  }).default(),
  tags: Joi.array()
    .items(
      Joi.string().valid(
        "vip",
        "high_value",
        "loyal",
        "frequent_order",
        "promotion_eligible",
        "birthday",
        "new",
        "regular",
        "inactive",
        "problematic",
      ),
    )
    .default([]), // Customer tags
  notes: Joi.string().max(300).allow(""), // Optional notes
});

// Schema for updating a customer
const updateCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  gender: Joi.string().valid("male", "female", "not_specified"),
  phone: Joi.string()
    .max(30)
    .regex(/^\+?[0-9\s\-]+$/, "valid phone number"),
  status: Joi.string().valid("active", "blocked"),
  addresses: Joi.array().items(addressSchema),
  loyalty: Joi.object({
    points: Joi.number(),
    tier: Joi.string().valid("regular", "vip"),
  }),
  tags: Joi.array().items(
    Joi.string().valid(
      "vip",
      "high_value",
      "loyal",
      "frequent_order",
      "promotion_eligible",
      "birthday",
      "new",
      "regular",
      "inactive",
      "problematic",
    ),
  ),
  notes: Joi.string().max(300).allow(""),
  updatedBy: Joi.string(), // Employee ID for tracking updates
});

// Schema for soft deleting a customer
const softDeleteSchema = Joi.object({
  deletedBy: Joi.string().required(), // Employee performing deletion
  isDeleted: Joi.boolean().valid(true).default(true), // Soft delete flag
});

// ----------------------------
// 🔹 Controller Functions
// ----------------------------

// Create a new offline customer
const createOfflineCustomer = async (req, res) => {
  try {
    const brand = req.brand._id;
    const branch = req.branch._id;
    const employee = req.user._id;

    // Validate input data
    const { error, value } = createCustomerSchema.validate({
      ...req.body,
      brand: brand,
      branch: branch,
      createdBy: employee,
    }, { abortEarly: false });

    if (error)
      return res.status(400).json({ message: error.details[0].message });

    // Create and save customer
    const customer = new OfflineCustomer({ ...value });
    await customer.save();

    res.status(201).json({
      message: "Customer created successfully",
      customer,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update an existing offline customer
const updateOfflineCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    // Check if customer exists
    const customer = await OfflineCustomer.findOne({
      _id: id,
      brand: req.brand._id,
      isDeleted: false,
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const employee = req.user;

    // Validate update input
    const { error, value } = updateCustomerSchema.validate({
      ...req.body,
      updatedBy: employee._id,
    });

    if (error)
      return res.status(400).json({ message: error.details[0].message });

    // Update customer
    const updatedCustomer = await OfflineCustomer.findOneAndUpdate(
      { _id: id, brand: req.brand._id, isDeleted: false },
      { ...value },
      { new: true },
    );

    res.status(200).json({
      message: "Customer updated successfully",
      customer: updatedCustomer,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// delete a customer permanently (admin only)
const deleteOfflineCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }
    const deletedCustomer = await OfflineCustomer.findOneAndDelete({
      _id: id,
      brand: req.brand._id,
    });
    if (!deletedCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json({
      message: "Customer permanently deleted",
      customer: deletedCustomer,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// Soft delete a customer
const softDeleteOfflineCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    const employee = req.user;

    // Check if customer exists
    const existcustomer = await OfflineCustomer.findOne({
      _id: id,
      brand: req.brand._id,
      isDeleted: false,
    });

    if (!existcustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Validate soft delete input
    const { error, value } = softDeleteSchema.validate({
      ...req.body,
      deletedBy: employee._id,
      isDeleted: true,
    });

    if (error)
      return res.status(400).json({ message: error.details[0].message });

    // Perform soft delete
    const customer = await OfflineCustomer.findOneAndUpdate(
      { _id: id, 
        brand: req.brand._id, isDeleted: false },
      { ...value,
        deletedAt: new Date()
       }, // Set deletion timestamp
      { new: true },
    );

    res.json({ message: "Customer soft-deleted", customer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Restore a soft-deleted customer
const restoreOfflineCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    const employee = req.user;

    // Check if customer exists and is deleted
    const existcustomer = await OfflineCustomer.findOne({
      _id: id,
      brand: req.brand._id,
      isDeleted: true,
    });

    if (!existcustomer) {
      return res
        .status(404)
        .json({ message: "Customer not found or not deleted" });
    }

    // Validate restoration input
    const { error, value } = softDeleteSchema.validate({
      ...req.body,
      deletedBy: employee._id,
      isDeleted: false,
    });

    if (error)
      return res.status(400).json({ message: error.details[0].message });

    // Restore customer
    const customer = await OfflineCustomer.findOneAndUpdate(
      { _id: id, brand: req.brand._id, isDeleted: true },
      { ...value , deletedAt: null }, // Clear deletion timestamp
      { new: true },
    );

    res.json({ message: "Customer restored", customer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get a customer by phone (starts with search)
const getOfflineCustomerByPhone = async (req, res) => {
  try {
    const { phone } = req.params;

    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Validate phone format
    const phonePattern = /^\+?[0-9\s\-]+$/;
    if (!phonePattern.test(phone)) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    // Search customer whose phone starts with input
    const phoneRegex = new RegExp(`^${phone}`);
    const customer = await OfflineCustomer.findOne({
      brand: req.brand._id,
      phone: { $regex: phoneRegex },
      isDeleted: false,
    }).lean();

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({ message: "Customer found", customer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all customers with optional status filter and pagination
const getAllOfflineCustomers = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const skip = (page - 1) * limit;

    const filter = { brand: req.brand._id, isDeleted: false };
    if (req.query.status) filter.status = req.query.status;

    const customers = await OfflineCustomer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      message: "Customers retrieved",
      customers,
      page,
      limit,
      total: await OfflineCustomer.countDocuments(filter),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all soft-deleted customers with pagination
const getDeletedOfflineCustomers = async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const skip = (page - 1) * limit;

    const customers = await OfflineCustomer.find({
      brand: req.brand._id,
      isDeleted: true,
    })
      .sort({ deletedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      message: "Deleted customers retrieved",
      customers,
      page,
      limit,
      total: await OfflineCustomer.countDocuments({
        brand: req.brand._id,
        isDeleted: true,
      }),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get customer by ID
const getOfflineCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    const customer = await OfflineCustomer.findOne({
      _id: id,
      brand: req.brand._id,
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({ message: "Customer retrieved", customer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get customers by branch with pagination
const getOfflineCustomersByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: "Invalid branch ID" });
    }

    const customers = await OfflineCustomer.find({
      branch: branchId,
      brand: req.brand._id,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      message: "Customers retrieved",
      customers,
      page,
      limit,
      total: await OfflineCustomer.countDocuments({
        branch: branchId,
        brand: req.brand._id,
        isDeleted: false,
      }),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get deleted customers by branch with pagination
const getDeletedOfflineCustomersByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      return res.status(400).json({ message: "Invalid branch ID" });
    }

    const customers = await OfflineCustomer.find({
      branch: branchId,
      brand: req.brand._id,
      isDeleted: true,
    })
      .sort({ deletedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      message: "Deleted customers retrieved",
      customers,
      page,
      limit,
      total: await OfflineCustomer.countDocuments({
        branch: branchId,
        brand: req.brand._id,
        isDeleted: true,
      }),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ----------------------------
// 🔹 export  all controllers
// ----------------------------
export  {
  createOfflineCustomer,
  updateOfflineCustomer,
  deleteOfflineCustomer,
  softDeleteOfflineCustomer,
  restoreOfflineCustomer,
  getOfflineCustomerByPhone,
  getAllOfflineCustomers,
  getDeletedOfflineCustomers,
  getOfflineCustomerById,
  getOfflineCustomersByBranch,
  getDeletedOfflineCustomersByBranch,
};
